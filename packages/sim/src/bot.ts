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
  /** 0..1 — the share of its pile it's willing to throw at a single swing. */
  aggression: number;
  /** 0..1 — the share of its pile it's willing to sink into a shield. */
  defensiveness: number;
  /** Stand-in for a human mashing the button. */
  clicksPerSecond: number;
  /**
   * 0..1 — how well it plays the economy. This is the difficulty knob, and it
   * drives three things at once, all of which a beginner gets wrong:
   *
   * - whether it buys the best rate-per-unit on the board or just the
   *   cheapest thing on the shelf,
   * - how much of its pile it converts into production each time it acts (a
   *   beginner leaves stock sitting idle, earning nothing),
   * - whether it bothers repairing broken kit at all.
   */
  skill: number;
  /** How often it acts. */
  decisionMs: number;
  /**
   * How far ahead of it you have to be before it reaches across the board, as a
   * share of its own score. At 0.6 it only swings at someone who's within
   * striking distance of overtaking it — which, once it's comfortably ahead,
   * means it stops attacking altogether and just sites. That's the right
   * instinct for the low rungs and the whole reason the old top rung played
   * passively. At 0 it swings every turn it can afford to, winning or not.
   */
  patience: number;
  /** Swings it will stack into a single turn, budget permitting. */
  swings: number;
  /**
   * How many things it buys per turn.
   *
   * This is the real difficulty knob at the top of the ladder, and the reason
   * the old top rung lost to moderately active farming: at 24 it physically
   * could not spend a late-game pile as fast as it earned one, so it sat on
   * stock that weren't producing while a person who keeps clicking Buy does
   * not. A number here that never binds (a few hundred) means the only thing
   * limiting it is what it can afford.
   */
  buysPerTurn: number;
  /**
   * 0..1 — how much worse than the best buy on the board it will settle for
   * rather than save up, as a share of that best buy's rate-per-unit.
   *
   * This is the single biggest thing separating a good player from a bad one,
   * and the old bot was at 0. Every tier costs `growth^N` more each time you
   * buy one, so the 60th Unit Pen is ~13.5K stock for 2.5/s while a first
   * Grooming Rig is 45K for 3500/s — four hundred times the rate per unit.
   * Buying the best thing you can *afford right now* means shovelling the pile
   * into pens forever and never reaching the tier that wins the match, which is
   * exactly why the old ladder got flattened by anyone who saved.
   *
   * At 0 it buys anything affordable. At 0.9 it sits on its hands unless the
   * purchase is within 10% of the best rate-per-unit in the shop — which
   * usually means waiting for the next tier. Not 1: some idling is worse than a
   * slightly-off buy, since stock you're sitting on earn nothing either.
   */
  thrift: number;
}

/**
 * Eight rungs, ordered. The ladder is checked by the difficulty test in
 * balance.test.ts, and graded against a human-speed reference player in
 * human.test.ts — "the top rung should actually be able to beat you" is a claim
 * we test, not hope.
 *
 * `skill` tops out at 1 by the third rung, because it only describes *not
 * making beginner mistakes* and there's nothing above playing correctly. So the
 * five rungs above it climb on the four things a very good opponent actually
 * has more of: hands (`clicksPerSecond`), attention (`decisionMs`), throughput
 * (`buysPerTurn` — the one that decides who wins), and pressure (`patience`
 * and `swings`).
 *
 * Note that `aggression` does *not* climb with the ladder past `vicious`, and
 * falls at the top. It's a share of the pile spent per *turn*, so at a 250ms
 * cadence the same number is nearly three times the spend per second it is at
 * 700ms — and stock thrown at a shielded opponent are stock not compounding
 * at home. The hard rungs pressure you by swinging more often, not by betting
 * more of the site on each swing.
 */
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
  /**
   * `nasty` with the second axis switched off. The control group only means
   * anything if it's identical apart from the thing being measured, so this has
   * to be kept in step with `nasty` whenever that's retuned.
   */
  greedy:    { aggression: 0,    defensiveness: 0,    clicksPerSecond: 3,  skill: 1,   decisionMs: 700,  patience: 0.6, swings: 1, buysPerTurn: 24,  thrift: 0.11 },
  // prettier-ignore-end
};

/** Priciest item it can afford within `budget`. */
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

/** Rate per unit for the next unit of each producer, best first. */
function rankProducers(me: PlayerState) {
  return PRODUCERS.map((prod) => {
    const cost = producerCost(prod.id, me.producers[prod.id] ?? 0);
    return { id: prod.id, cost, value: (prod.baseRate * producerMultiplier(me, prod.id)) / cost };
  }).sort((a, b) => b.value - a.value);
}

/**
 * A whole turn's worth of decisions, in the order a competent player would make
 * them: patch the damage, cover yourself, take your swing, then put every
 * remaining unit to work.
 *
 * Returning a list rather than a single command is the point. A bot that buys
 * one thing per tick leaves a growing pile sitting idle in the late game, which
 * is exactly the mistake that made every difficulty crushable — stock that
 * aren't producing are stock you've already lost.
 */
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
  // A shadow copy so costs and affordability advance across the turn the same
  // way they will when these commands actually land.
  let me = checkpoint(raw, t);
  const pay = (cost: Yield) => {
    me = { ...me, stock: Y.sub(me.stock, cost) };
  };

  // Rolled per turn, not per twenty-second bucket: difficulty shouldn't hinge
  // on one coin flip, and a bot that commits to a mood for twenty seconds
  // spends half the match doing the wrong thing.
  const roll = rngFor(state.config.seed, Math.floor(t / profile.decisionMs) * 31 + botId.length);
  const plays = () => roll.next() < profile.skill;

  // --- Repairs. Broken kit is rate you already paid for, so buying it back is
  // normally the best unit on the board. Same value test as everything else,
  // though, or cheap chip damage becomes a way to bleed the bot dry.
  if (brokenRate(me) > 0 && plays()) {
    for (const prod of PRODUCERS) {
      const broken = Math.min(me.broken[prod.id] ?? 0, me.producers[prod.id] ?? 0);
      if (broken <= 0) continue;
      const cost = repairCost(me, prod.id);
      if (cost <= 0 || !Y.gte(me.stock, cost)) continue;
      // Worth it if the rate it buys back is cheaper than buying that rate new.
      const back = broken * prod.baseRate * producerMultiplier(me, prod.id);
      const best = rankProducers(me)[0];
      if (best && back / cost < best.value) continue;
      out.push({ type: "repair", player: botId, producer: prod.id });
      pay(cost);
      me = { ...me, broken: { ...me.broken, [prod.id]: 0 } };
    }
  }

  // --- Defense. Kept up as a standing policy rather than a mood, because
  // against anyone who attacks on a cadence, a bot that shields only when it
  // feels like it is naked most of the match.
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

  // --- Sabotage, aimed at whoever's ahead. The budget share is the only thing
  // pacing this: VISION.md says contention does the pacing, not cooldowns, and
  // for a bot the share cap is what makes contention actually bite.
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
    // The budget is re-read from what's left after each swing, so stacking them
    // costs geometrically less and a big `swings` can't empty the site.
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

  // --- Growth. Upgrades first (almost always the best buy on the board), then
  // producers until the pile is spent.
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
    // Playing badly, on purpose: grab the cheapest thing on the shelf. It's what
    // a first-timer does, and it quietly wrecks your curve — you pay ever more
    // per pen while the good tiers stay one save away.
    const pick = plays()
      ? ranked.find((r) => Y.gte(me.stock, r.cost) && r.value >= ranked[0]!.value * profile.thrift)
      : [...ranked].sort((a, b) => a.cost - b.cost).find((r) => Y.gte(me.stock, r.cost));
    // Nothing worth buying — hold the pile and let it grow into the next tier.
    if (!pick) break;
    out.push({ type: "buy_producer", player: botId, producer: pick.id, qty: 1 });
    pay(pick.cost);
    me = { ...me, producers: { ...me.producers, [pick.id]: (me.producers[pick.id] ?? 0) + 1 } };
  }

  return out;
}
