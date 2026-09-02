import { buildShield, shieldPool } from "./combat.js";
import {
  ATTACKS,
  DEFENSES,
  PRODUCERS,
  UPGRADES,
  type Attack,
  type Defense,
} from "./content.js";
import {
  attackCost,
  brokenRate,
  checkpoint,
  cleanRate,
  producerCost,
  producerMultiplier,
  repairCost,
  repeatCost,
} from "./economy.js";
import { Y, type Millis, type Yield } from "./numbers.js";
import { clampToMatch, isOver, scoreOf } from "./match.js";
import { rngFor } from "./rng.js";
import type { Command, MatchState, PlayerId, PlayerState } from "./state.js";

export interface BotProfile {
  /** 0..1 share of pile per swing */
  aggression: number;
  /** 0..1 share of pile per shield */
  defensiveness: number;
  clicksPerSecond: number;
  /** 0..1 chance per decision of not making the beginner mistake (cheapest buy, no repairs). */
  skill: number;
  decisionMs: number;
  /** Attacks only when leader's score > patience * own score; 0 = swings whenever it can afford to. */
  patience: number;
  /** swings per turn */
  swings: number;
  /** The real difficulty knob at the top of the ladder: a late-game pile must be spendable per turn. */
  buysPerTurn: number;
  /** 0..1 — how much worse than the shop's best value-per-unit it will settle for instead of saving. */
  thrift: number;
}

// Eight rungs, ordered; retune by eye with `simulateMatch`. Above `nasty` the ladder climbs on
// cadence, buysPerTurn and swings, not aggression — that's a per-turn share, so faster turns spend more.
export const BOT_PROFILES: Record<string, BotProfile> = {
  // prettier-ignore-start
  chill:     { aggression: 0.15, defensiveness: 0.2,  clicksPerSecond: 1,  skill: 0.5, decisionMs: 1400, patience: 0.8, swings: 1, buysPerTurn: 8,   thrift: 0.1 },
  scrappy:   { aggression: 0.3,  defensiveness: 0.4,  clicksPerSecond: 2,  skill: 0.8, decisionMs: 1000, patience: 0.6, swings: 1, buysPerTurn: 16,  thrift: 0.13 },
  nasty:     { aggression: 0.4,  defensiveness: 0.5,  clicksPerSecond: 3,  skill: 1,   decisionMs: 700,  patience: 0.6, swings: 1, buysPerTurn: 24,  thrift: 0.11 },
  mean:      { aggression: 0.35, defensiveness: 0.5,  clicksPerSecond: 3.5,  skill: 1,   decisionMs: 600,  patience: 0.3, swings: 1, buysPerTurn: 40,  thrift: 0.18 },
  vicious:   { aggression: 0.35, defensiveness: 0.5,  clicksPerSecond: 4,  skill: 1,   decisionMs: 500,  patience: 0,   swings: 1, buysPerTurn: 60,  thrift: 0.21 },
  ruthless:  { aggression: 0.3,  defensiveness: 0.5,  clicksPerSecond: 4.5,  skill: 1,   decisionMs: 450,  patience: 0,   swings: 2, buysPerTurn: 100, thrift: 0.24 },
  merciless: { aggression: 0.25, defensiveness: 0.55, clicksPerSecond: 5,  skill: 1,   decisionMs: 350,  patience: 0,   swings: 3, buysPerTurn: 200, thrift: 0.26 },
  tyrant:    { aggression: 0.2,  defensiveness: 0.6,  clicksPerSecond: 5, skill: 1,   decisionMs: 250,  patience: 0,   swings: 4, buysPerTurn: 400, thrift: 0.3 },
  // `nasty` with sabotage off — a control group; keep in step with `nasty`.
  greedy:    { aggression: 0,    defensiveness: 0,    clicksPerSecond: 3,  skill: 1,   decisionMs: 700,  patience: 0.6, swings: 1, buysPerTurn: 24,  thrift: 0.11 },
  // prettier-ignore-end
};

// priciest affordable
function affordable<T extends Attack | Defense>(
  items: readonly T[],
  costOf: (item: T) => Yield,
  budget: Yield,
): { item: T; cost: Yield } | undefined {
  let best: { item: T; cost: Yield } | undefined;
  for (const item of items) {
    const cost = costOf(item);
    if (Y.gte(budget, cost) && (!best || cost > best.cost)) best = { item, cost };
  }
  return best;
}

function rankProducers(me: PlayerState) {
  return PRODUCERS.map((prod) => {
    const cost = producerCost(prod.id, me.producers[prod.id] ?? 0);
    return { id: prod.id, cost, value: (prod.baseRate * producerMultiplier(me, prod.id)) / cost };
  }).sort((a, b) => b.value - a.value);
}

/** A whole turn: repair, shield, swing, then spend the pile. */
export function botTurn(
  state: MatchState,
  botId: PlayerId,
  profile: BotProfile,
  now: Millis,
): Command[] {
  if (isOver(state, now)) return [];
  const t = clampToMatch(state, now);
  const raw = state.players[botId];
  if (!raw) return [];

  const out: Command[] = [];
  // shadow copy so costs advance across the turn
  let me = checkpoint(raw, t);
  const pay = (cost: Yield) => {
    me = { ...me, stock: Y.sub(me.stock, cost) };
  };

  const roll = rngFor(state.config.seed, Math.floor(t / profile.decisionMs) * 31 + botId.length);
  const plays = () => roll.next() < profile.skill;

  // --- Repairs --- (same value test as buying, or chip damage bleeds the bot dry)
  if (brokenRate(me) > 0 && plays()) {
    for (const prod of PRODUCERS) {
      const broken = Math.min(me.broken[prod.id] ?? 0, me.producers[prod.id] ?? 0);
      if (broken <= 0) continue;
      const cost = repairCost(me, prod.id);
      if (cost <= 0 || !Y.gte(me.stock, cost)) continue;
      const back = broken * prod.baseRate * producerMultiplier(me, prod.id);
      const best = rankProducers(me)[0];
      if (best && back / cost < best.value) continue;
      out.push({ type: "repair", player: botId, producer: prod.id });
      pay(cost);
      me = { ...me, broken: { ...me.broken, [prod.id]: 0 } };
    }
  }

  // --- Defense ---
  if (profile.defensiveness > 0 && shieldPool(me, t) <= 0) {
    const pick = affordable(
      DEFENSES,
      (d) => repeatCost(d.baseCost, d.growth, me.defensesUsed[d.id] ?? 0),
      Y.mul(me.stock, profile.defensiveness),
    );
    if (pick) {
      out.push({ type: "defend", player: botId, defense: pick.item.id });
      pay(pick.cost);
      me = {
        ...me,
        defensesUsed: { ...me.defensesUsed, [pick.item.id]: (me.defensesUsed[pick.item.id] ?? 0) + 1 },
        effects: [...me.effects, buildShield(pick.item, botId, t, 0)],
      };
    }
  }

  // --- Sabotage --- aimed at whoever's ahead; the budget share is the only pacing (docs/design.md)
  const leader = state.order
    .filter((id) => id !== botId)
    .map((id) => ({ id, score: scoreOf(state.players[id]!, t, state.config.scoring) }))
    .sort((a, b) => b.score - a.score)[0];

  if (
    profile.aggression > 0 &&
    leader &&
    leader.score > Y.mul(scoreOf(me, t, state.config.scoring), profile.patience)
  ) {
    const targetRate = cleanRate(state.players[leader.id]!);
    for (let i = 0; i < profile.swings; i++) {
      const pick = affordable(
        ATTACKS,
        (a) => attackCost(a, me.attacksUsed[a.id] ?? 0, targetRate),
        Y.mul(me.stock, profile.aggression),
      );
      if (!pick) break;
      out.push({ type: "attack", player: botId, target: leader.id, attack: pick.item.id });
      pay(pick.cost);
      me = { ...me, attacksUsed: { ...me.attacksUsed, [pick.item.id]: (me.attacksUsed[pick.item.id] ?? 0) + 1 } };
    }
  }

  // --- Growth ---
  for (const up of UPGRADES) {
    if (me.upgrades.includes(up.id)) continue;
    if (up.requires && (me.producers[up.requires.producer] ?? 0) < up.requires.count) continue;
    if (!Y.gte(me.stock, up.cost)) continue;
    out.push({ type: "buy_upgrade", player: botId, upgrade: up.id });
    pay(up.cost);
    me = { ...me, upgrades: [...me.upgrades, up.id] };
  }

  for (let i = 0; i < profile.buysPerTurn; i++) {
    const ranked = rankProducers(me);
    // unskilled play: cheapest thing on the shelf
    const pick = plays()
      ? ranked.find((r) => Y.gte(me.stock, r.cost) && r.value >= ranked[0]!.value * profile.thrift)
      : [...ranked].sort((a, b) => a.cost - b.cost).find((r) => Y.gte(me.stock, r.cost));
    if (!pick) break;
    out.push({ type: "buy_producer", player: botId, producer: pick.id, qty: 1 });
    pay(pick.cost);
    me = { ...me, producers: { ...me.producers, [pick.id]: (me.producers[pick.id] ?? 0) + 1 } };
  }

  return out;
}
