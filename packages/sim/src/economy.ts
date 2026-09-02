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

export function workingCount(p: PlayerState, id: ProducerId): number {
  return Math.max(0, (p.producers[id] ?? 0) - (p.broken[id] ?? 0));
}

/** After upgrades and breakage, before slows. */
export function producerRate(p: PlayerState, id: ProducerId): Rate {
  return asRate(workingCount(p, id) * PRODUCER_BY_ID[id].baseRate * producerMultiplier(p, id));
}

/** Rate with no sabotage applied. */
export function cleanRate(p: PlayerState): Rate {
  let total = 0;
  for (const prod of PRODUCERS) {
    total += (p.producers[prod.id] ?? 0) * prod.baseRate * producerMultiplier(p, prod.id);
  }
  return asRate(total);
}

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

/** Floored so stacked sabotage can never zero a site out (docs/design.md: no knockouts). */
export function slowMultiplier(p: PlayerState, t: Millis): number {
  let m = 1;
  for (const e of p.effects) {
    if (e.kind === "slow" && isActive(e, t)) m *= e.multiplier;
  }
  return Math.max(MIN_RATE_MULTIPLIER, m);
}

export function rateAt(p: PlayerState, t: Millis): Rate {
  let total = 0;
  for (const prod of PRODUCERS) total += producerRate(p, prod.id);
  return asRate(total * slowMultiplier(p, t));
}

// Only effect expiries change the rate between checkpoints, so production integrates in closed form.
function rateBoundaries(p: PlayerState, from: Millis, to: Millis): Millis[] {
  const out = new Set<number>();
  for (const e of p.effects) {
    if (e.expiresAt > from && e.expiresAt < to) out.add(e.expiresAt);
  }
  return [...out].sort((a, b) => a - b).map(ms);
}

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

/** Roll forward to `t`; every mutation goes through this first. */
export function checkpoint(p: PlayerState, t: Millis): PlayerState {
  return {
    ...p,
    stock: stockAt(p, t),
    produced: producedAt(p, t),
    checkpointAt: t,
    effects: p.effects.filter((e) => isActive(e, t) && (e.kind !== "shield" || e.power > 0)),
  };
}

// --- Costs ---

export function producerCost(id: ProducerId, owned: number, qty = 1): Yield {
  const { baseCost, growth } = PRODUCER_BY_ID[id];
  const geometric = (Math.pow(growth, qty) - 1) / (growth - 1);
  return Y.of(Math.ceil(baseCost * Math.pow(growth, owned) * geometric));
}

export function repeatCost(baseCost: Yield, growth: number, timesUsed: number): Yield {
  return Y.of(Math.ceil(baseCost * Math.pow(growth, timesUsed)));
}

/** `targetRate` must be the target's clean rate, or stacked sabotage snowballs toward a knockout. */
export function attackCost(attack: Attack, timesUsed: number, targetRate: Rate): Yield {
  const base = Math.max(attack.baseCost, attack.costPerRate * targetRate);
  return Y.of(Math.ceil(base * Math.pow(attack.growth, timesUsed)));
}

/** Priced off re-buying the broken units at the current count, discounted. */
export function repairCost(p: PlayerState, id: ProducerId): Yield {
  const broken = Math.min(p.broken[id] ?? 0, p.producers[id] ?? 0);
  if (broken <= 0) return Y.zero;
  const gross = producerCost(id, workingCount(p, id), broken);
  return Y.of(Math.ceil(gross * REPAIR_COST_FRACTION));
}

export function totalRepairCost(p: PlayerState): Yield {
  let total = 0;
  for (const prod of PRODUCERS) total += repairCost(p, prod.id);
  return Y.of(total);
}

export function affordableCount(p: PlayerState, id: ProducerId, budget: Yield): number {
  const owned = p.producers[id] ?? 0;
  let qty = 0;
  while (qty < 1000 && Y.gte(budget, producerCost(id, owned, qty + 1))) qty++;
  return qty;
}
