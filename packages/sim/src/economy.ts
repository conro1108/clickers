import {
  BASE_CLICK,
  MIN_RATE_MULTIPLIER,
  REPAIR_COST_FRACTION,
  PRODUCERS,
  PRODUCER_BY_ID,
  UPGRADE_BY_ID,
  type Attack,
  type ProducerId,
  type Upgrade,
} from "./content.js";
import { Y, ms, rate as asRate, type Millis, type Yield, type Rate } from "./numbers.js";
import type { ActiveEffect, PlayerState } from "./state.js";

export function isActive(e: ActiveEffect, t: Millis): boolean {
  return e.startedAt <= t && t < e.expiresAt;
}

function ownedUpgrades(p: PlayerState): Upgrade[] {
  return p.upgrades.map((id) => UPGRADE_BY_ID[id]);
}

/** Multiplier on a single producer type from owned upgrades. */
export function producerMultiplier(p: PlayerState, id: ProducerId): number {
  let m = 1;
  for (const u of ownedUpgrades(p)) {
    if (u.effect.kind === "global_mult") m *= u.effect.factor;
    else if (u.effect.kind === "producer_mult" && u.effect.producer === id) m *= u.effect.factor;
  }
  return m;
}

export function clickYield(p: PlayerState): Yield {
  let m = 1;
  for (const u of ownedUpgrades(p)) {
    if (u.effect.kind === "click_mult") m *= u.effect.factor;
  }
  return Y.mul(BASE_CLICK, m);
}

/** Units of `id` that are actually turning out stock. */
export function workingCount(p: PlayerState, id: ProducerId): number {
  return Math.max(0, (p.producers[id] ?? 0) - (p.broken[id] ?? 0));
}

/** Per-producer contribution, after upgrades and breakage but before slows. */
export function producerRate(p: PlayerState, id: ProducerId): Rate {
  return asRate(workingCount(p, id) * PRODUCER_BY_ID[id].baseRate * producerMultiplier(p, id));
}

/** Rate with no sabotage applied at all — what repairing would get you back to. */
export function cleanRate(p: PlayerState): Rate {
  let total = 0;
  for (const prod of PRODUCERS) {
    total += (p.producers[prod.id] ?? 0) * prod.baseRate * producerMultiplier(p, prod.id);
  }
  return asRate(total);
}

/** Production lost to unrepaired damage, per second. */
export function brokenRate(p: PlayerState): Rate {
  let total = 0;
  for (const prod of PRODUCERS) {
    total +=
      Math.min(p.broken[prod.id] ?? 0, p.producers[prod.id] ?? 0) *
      prod.baseRate *
      producerMultiplier(p, prod.id);
  }
  return asRate(total);
}

/**
 * Combined slow multiplier at `t`, floored so stacked sabotage can never zero
 * a site out (VISION.md: no knockouts).
 */
export function slowMultiplier(p: PlayerState, t: Millis): number {
  let m = 1;
  for (const e of p.effects) {
    if (e.kind === "slow" && isActive(e, t)) m *= e.multiplier;
  }
  return Math.max(MIN_RATE_MULTIPLIER, m);
}

/** Actual production rate at `t`, everything applied. */
export function rateAt(p: PlayerState, t: Millis): Rate {
  let total = 0;
  for (const prod of PRODUCERS) total += producerRate(p, prod.id);
  return asRate(total * slowMultiplier(p, t));
}

/**
 * Instants between `from` and `to` where this player's rate changes. Only
 * effect expiries can do that — purchases always re-checkpoint — which is
 * exactly why production integrates in closed form.
 */
function rateBoundaries(p: PlayerState, from: Millis, to: Millis): Millis[] {
  const out = new Set<number>();
  for (const e of p.effects) {
    if (e.expiresAt > from && e.expiresAt < to) out.add(e.expiresAt);
  }
  return [...out].sort((a, b) => a - b).map(ms);
}

/** Yield produced by this player over [from, to]. */
function produced(p: PlayerState, from: Millis, to: Millis): Yield {
  if (to <= from) return Y.zero;
  let acc = Y.zero;
  let cursor = from;
  for (const boundary of [...rateBoundaries(p, from, to), to]) {
    acc = Y.add(acc, Y.overTime(rateAt(p, cursor), boundary - cursor));
    cursor = boundary;
  }
  return acc;
}

export function stockAt(p: PlayerState, t: Millis): Yield {
  return Y.add(p.stock, produced(p, p.checkpointAt, t));
}

export function producedAt(p: PlayerState, t: Millis): Yield {
  return Y.add(p.produced, produced(p, p.checkpointAt, t));
}

/**
 * Roll the player forward to `t` and drop anything that's expired. Every
 * mutation goes through this first, so state is always integrated up to the
 * instant of the change.
 */
export function checkpoint(p: PlayerState, t: Millis): PlayerState {
  return {
    ...p,
    stock: stockAt(p, t),
    produced: producedAt(p, t),
    checkpointAt: t,
    effects: p.effects.filter((e) => isActive(e, t) && (e.kind !== "shield" || e.power > 0)),
  };
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

/** Cost of the next `qty` units when `owned` are already owned. */
export function producerCost(id: ProducerId, owned: number, qty = 1): Yield {
  const { baseCost, growth } = PRODUCER_BY_ID[id];
  const geometric = (Math.pow(growth, qty) - 1) / (growth - 1);
  return Y.of(Math.ceil(baseCost * Math.pow(growth, owned) * geometric));
}

/** Repeatable actions (sabotage, defense) get pricier each time you use them. */
export function repeatCost(baseCost: Yield, growth: number, timesUsed: number): Yield {
  return Y.of(Math.ceil(baseCost * Math.pow(growth, timesUsed)));
}

/**
 * What it costs to swing at a site producing `targetRate`.
 *
 * Priced off the target's *clean* rate — what they'd be making with nothing
 * broken and no weather on them — rather than what they're producing right now.
 * If damage made the next hit cheaper, stacking sabotage would snowball toward
 * exactly the knockout VISION.md rules out.
 */
export function attackCost(attack: Attack, timesUsed: number, targetRate: Rate): Yield {
  const base = Math.max(attack.baseCost, attack.costPerRate * targetRate);
  return Y.of(Math.ceil(base * Math.pow(attack.growth, timesUsed)));
}

/**
 * What it costs to bring every broken unit of `id` back online. Priced off the
 * units you'd be re-buying at your current count, discounted — repairing beats
 * rebuilding, but it's still stock that didn't go into growth.
 */
export function repairCost(p: PlayerState, id: ProducerId): Yield {
  const broken = Math.min(p.broken[id] ?? 0, p.producers[id] ?? 0);
  if (broken <= 0) return Y.zero;
  const gross = producerCost(id, workingCount(p, id), broken);
  return Y.of(Math.ceil(gross * REPAIR_COST_FRACTION));
}

/** Total outstanding repair bill across every producer type. */
export function totalRepairCost(p: PlayerState): Yield {
  let total = 0;
  for (const prod of PRODUCERS) total += repairCost(p, prod.id);
  return Y.of(total);
}

/** How many of `id` the player can afford right now. */
export function affordableCount(p: PlayerState, id: ProducerId, budget: Yield): number {
  const owned = p.producers[id] ?? 0;
  let qty = 0;
  while (qty < 1000 && Y.gte(budget, producerCost(id, owned, qty + 1))) qty++;
  return qty;
}
