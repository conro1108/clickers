import { buildShield, shieldPool } from "./combat.js";
import { ATTACKS, DEFENSES, PRODUCERS, UPGRADES } from "./content.js";
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
import { clampToMatch, isOver } from "./match.js";
import type { Command, MatchState, PlayerId, PlayerState } from "./state.js";

// A reference human for grading the difficulty ladder: deliberately reasonable, not optimal.
export interface HumanStyle {
  openingClicksPerSecond: number;
  openingSeconds: number;
  restingClicksPerSecond: number;
  attacks: boolean;
  defends: boolean;
  decisionMs: number;
  /** 0..1 — how much worse than the shop's best value-per-unit they'll settle for instead of waiting. */
  thrift: number;
}

export const HUMAN_STYLES: Record<string, HumanStyle> = {
  // the one the ladder is graded against
  builder: {
    openingClicksPerSecond: 4,
    openingSeconds: 45,
    restingClicksPerSecond: 1,
    attacks: false,
    defends: true,
    decisionMs: 1000,
    thrift: 0.5,
  },
  scrapper: {
    openingClicksPerSecond: 4,
    openingSeconds: 45,
    restingClicksPerSecond: 1,
    attacks: true,
    defends: true,
    decisionMs: 1000,
    thrift: 0.5,
  },
  masher: {
    openingClicksPerSecond: 10,
    openingSeconds: 300,
    restingClicksPerSecond: 10,
    attacks: true,
    defends: true,
    decisionMs: 1000,
    thrift: 0.3,
  },
};

export function clicksPerSecondAt(style: HumanStyle, elapsedSeconds: number): number {
  return elapsedSeconds < style.openingSeconds
    ? style.openingClicksPerSecond
    : style.restingClicksPerSecond;
}

// priciest affordable
function pick<T>(
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

export function humanTurn(
  state: MatchState,
  id: PlayerId,
  style: HumanStyle,
  now: Millis,
): Command[] {
  if (isOver(state, now)) return [];
  const t = clampToMatch(state, now);
  const raw = state.players[id];
  if (!raw) return [];

  const out: Command[] = [];
  let me: PlayerState = checkpoint(raw, t);
  const pay = (cost: Yield) => {
    me = { ...me, stock: Y.sub(me.stock, cost) };
  };

  if (brokenRate(me) > 0) {
    for (const prod of PRODUCERS) {
      const broken = Math.min(me.broken[prod.id] ?? 0, me.producers[prod.id] ?? 0);
      if (broken <= 0) continue;
      const cost = repairCost(me, prod.id);
      if (cost <= 0 || !Y.gte(me.stock, cost)) continue;
      out.push({ type: "repair", player: id, producer: prod.id });
      pay(cost);
      me = { ...me, broken: { ...me.broken, [prod.id]: 0 } };
    }
  }

  if (style.defends && shieldPool(me, t) <= 0) {
    const got = pick(
      DEFENSES,
      (d) => repeatCost(d.baseCost, d.growth, me.defensesUsed[d.id] ?? 0),
      Y.mul(me.stock, 0.35),
    );
    if (got) {
      out.push({ type: "defend", player: id, defense: got.item.id });
      pay(got.cost);
      me = {
        ...me,
        defensesUsed: { ...me.defensesUsed, [got.item.id]: (me.defensesUsed[got.item.id] ?? 0) + 1 },
        effects: [...me.effects, buildShield(got.item, id, t, 0)],
      };
    }
  }

  if (style.attacks) {
    const foe = state.order.find((o) => o !== id);
    if (foe) {
      const targetRate = cleanRate(state.players[foe]!);
      const got = pick(
        ATTACKS,
        (a) => attackCost(a, me.attacksUsed[a.id] ?? 0, targetRate),
        Y.mul(me.stock, 0.3),
      );
      if (got) {
        out.push({ type: "attack", player: id, target: foe, attack: got.item.id });
        pay(got.cost);
        me = {
          ...me,
          attacksUsed: { ...me.attacksUsed, [got.item.id]: (me.attacksUsed[got.item.id] ?? 0) + 1 },
        };
      }
    }
  }

  for (const up of UPGRADES) {
    if (me.upgrades.includes(up.id)) continue;
    if (up.requires && (me.producers[up.requires.producer] ?? 0) < up.requires.count) continue;
    if (!Y.gte(me.stock, up.cost)) continue;
    out.push({ type: "buy_upgrade", player: id, upgrade: up.id });
    pay(up.cost);
    me = { ...me, upgrades: [...me.upgrades, up.id] };
  }

  // Same value ranking the Grow tab badges.
  for (let i = 0; i < 100; i++) {
    const ranked = PRODUCERS.map((prod) => {
      const cost = producerCost(prod.id, me.producers[prod.id] ?? 0);
      return { id: prod.id, cost, value: (prod.baseRate * producerMultiplier(me, prod.id)) / cost };
    }).sort((a, b) => b.value - a.value);
    const got = ranked.find(
      (r) => Y.gte(me.stock, r.cost) && r.value >= ranked[0]!.value * style.thrift,
    );
    if (!got) break;
    out.push({ type: "buy_producer", player: id, producer: got.id, qty: 1 });
    pay(got.cost);
    me = { ...me, producers: { ...me.producers, [got.id]: (me.producers[got.id] ?? 0) + 1 } };
  }

  return out;
}
