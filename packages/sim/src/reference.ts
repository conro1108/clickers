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

/**
 * A stand-in for an actual person, so the difficulty ladder can be checked
 * against something other than more bots. Bot-vs-bot runs tell you the economy
 * isn't degenerate; they can't tell you whether `nasty` is beatable, and that's
 * the question that matters when someone sits down to play.
 *
 * Modelled on how the game actually gets played: click hard while clicking is the
 * only income, then settle into buying whatever the shop flags as best value
 * and steadily adding capacity. Deliberately *not* an optimal player — it makes
 * the same call a reasonable person makes with the information the UI gives
 * them, which is what the ladder should be graded against.
 */
export interface HumanStyle {
  /** Clicks per second while clicking is still worth the effort. */
  openingClicksPerSecond: number;
  /** Seconds of that before attention moves to the shop. */
  openingSeconds: number;
  /** The idle tapping that continues after. */
  restingClicksPerSecond: number;
  /** Whether they engage with the sabotage tab at all. */
  attacks: boolean;
  /** Whether they keep a shield up. */
  defends: boolean;
  /** How often they touch the shop. */
  decisionMs: number;
  /**
   * 0..1 — how much worse than the best rate-per-unit in the shop they'll
   * settle for rather than sit on the pile and wait for the good tier. Same
   * knob as the bot's, and the same reason it exists: a shelf priced at
   * `growth^N` makes the tenth `patch` a worse buy than a first `machine`
   * by orders of magnitude, and a person reading prices next to rates works
   * that out. Modelling them as spending every unit the instant they have it
   * understated a real player by two orders of magnitude, which made the whole
   * difficulty ladder look harder than it was.
   */
  thrift: number;
}

export const HUMAN_STYLES: Record<string, HumanStyle> = {
  /** The one the ladder is graded against: economy-focused, barely sabotages. */
  builder: {
    openingClicksPerSecond: 4,
    openingSeconds: 45,
    restingClicksPerSecond: 1,
    attacks: false,
    defends: true,
    decisionMs: 1000,
    thrift: 0.5,
  },
  /** Same economy, but engages with the other two tabs. */
  scrapper: {
    openingClicksPerSecond: 4,
    openingSeconds: 45,
    restingClicksPerSecond: 1,
    attacks: true,
    defends: true,
    decisionMs: 1000,
    thrift: 0.5,
  },
  /** Never looks away from the click button. The wrist-speed end of the range. */
  masher: {
    openingClicksPerSecond: 10,
    openingSeconds: 300,
    restingClicksPerSecond: 10,
    attacks: true,
    defends: true,
    decisionMs: 1000,
    // Eyes on the click, not the price list — takes the decent buy in front
    // of them rather than waiting for the great one.
    thrift: 0.3,
  },
};

export function clicksPerSecondAt(style: HumanStyle, elapsedSeconds: number): number {
  return elapsedSeconds < style.openingSeconds
    ? style.openingClicksPerSecond
    : style.restingClicksPerSecond;
}

/** Priciest of `items` costing no more than `budget`. */
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

/** A visit to the shop: what a person would click, in the order they'd click it. */
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

  // Damage is loud in the UI, so it gets dealt with first.
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

  // "Buy whatever the shop says is best value, keep adding capacity." Same
  // ranking the Grow tab badges, so this is literally following the UI's advice.
  for (let i = 0; i < 100; i++) {
    const ranked = PRODUCERS.map((prod) => {
      const cost = producerCost(prod.id, me.producers[prod.id] ?? 0);
      return { id: prod.id, cost, value: (prod.baseRate * producerMultiplier(me, prod.id)) / cost };
    }).sort((a, b) => b.value - a.value);
    const got = ranked.find(
      (r) => Y.gte(me.stock, r.cost) && r.value >= ranked[0]!.value * style.thrift,
    );
    // Nothing here is worth it yet — hold the pile for the next tier up.
    if (!got) break;
    out.push({ type: "buy_producer", player: id, producer: got.id, qty: 1 });
    pay(got.cost);
    me = { ...me, producers: { ...me.producers, [got.id]: (me.producers[got.id] ?? 0) + 1 } };
  }

  return out;
}
