// Rates and prices for the homestead: pure functions of SiteState. Time integration lives in site.ts.

import { Y, rate as asRate, type Yield, type Rate } from "../numbers.js";
import {
  LAND_BY_ID,
  LANDS,
  MAX_MITIGATION,
  MIN_CONDITION,
  REPAIR_SECONDS,
  CONDITION_RESTORE_SECONDS,
  SOLO_BASE_CLICK,
  SOLO_PRODUCERS,
  SOLO_PRODUCER_BY_ID,
  SOLO_REPAIR_COST_FRACTION,
  SOLO_UPGRADE_BY_ID,
  producersIn,
  type LandId,
  type LandRole,
  type SoloProducerId,
  type SoloUpgrade,
  type World,
} from "./content.js";
import { MULT_PER_UNSPENT_HEIRLOOM, PERK_BY_ID } from "./prestige.js";
import type { SiteState } from "./state.js";

function ownedUpgrades(f: SiteState): SoloUpgrade[] {
  return f.upgrades.map((id) => SOLO_UPGRADE_BY_ID[id]).filter((u): u is SoloUpgrade => !!u);
}

export function perkLevel(f: SiteState, id: keyof typeof PERK_BY_ID): number {
  return f.perks[id] ?? 0;
}

export function landLevel(f: SiteState, id: LandId): number {
  return f.land[id] ?? 0;
}

export function globalMultiplier(f: SiteState): number {
  let m = 1;
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "global_mult") m *= u.effect.factor;
  }
  m *= 1 + MULT_PER_UNSPENT_HEIRLOOM * f.heirlooms;
  m *= 1 + 0.15 * perkLevel(f, "knack");
  m *= 1 + 0.4 * perkLevel(f, "core_tithe");
  return m;
}

/** Before condition. */
export function producerMultiplier(f: SiteState, id: SoloProducerId): number {
  const prod = SOLO_PRODUCER_BY_ID[id];
  let m = globalMultiplier(f);
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "producer_mult" && u.effect.producer === id) m *= u.effect.factor;
  }
  if (prod.generationScaled) m *= f.generation;
  if (prod.world !== "outside") m *= 1 + perkLevel(f, "ur_yield");
  return m;
}

// Kept out of producerMultiplier: cleanRate and repairCost are quoted at full condition.
function conditionScale(f: SiteState, id: SoloProducerId): number {
  return SOLO_PRODUCER_BY_ID[id].conditionScaled ? f.condition : 1;
}

export function producerRateEach(f: SiteState, id: SoloProducerId): number {
  return SOLO_PRODUCER_BY_ID[id].baseRate * producerMultiplier(f, id) * conditionScale(f, id) * f.condition;
}

export function workingCount(f: SiteState, id: SoloProducerId): number {
  return Math.max(0, (f.producers[id] ?? 0) - (f.broken[id] ?? 0));
}

export function brokenCount(f: SiteState, id: SoloProducerId): number {
  return Math.min(f.broken[id] ?? 0, f.producers[id] ?? 0);
}

export function producerRate(f: SiteState, id: SoloProducerId): Rate {
  return asRate(
    workingCount(f, id) *
      SOLO_PRODUCER_BY_ID[id].baseRate *
      producerMultiplier(f, id) *
      conditionScale(f, id),
  );
}

/** Constant until the next weather event or purchase — no timers in solo. */
export function currentRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += producerRate(f, prod.id);
  return asRate(total * f.condition);
}

/** Nothing broken, condition at full. */
export function cleanRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += (f.producers[prod.id] ?? 0) * SOLO_PRODUCER_BY_ID[prod.id].baseRate *
      producerMultiplier(f, prod.id);
  }
  return asRate(total);
}

export function brokenRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += brokenCount(f, prod.id) * prod.baseRate * producerMultiplier(f, prod.id) *
      conditionScale(f, prod.id);
  }
  return asRate(total * f.condition);
}

/** Not `rate * (1 - condition)`: the `well` scales with condition twice, so it loses `1 - condition²`. */
export function conditionLossRate(f: SiteState): Rate {
  let lost = 0;
  for (const prod of SOLO_PRODUCERS) {
    const clean = workingCount(f, prod.id) * prod.baseRate * producerMultiplier(f, prod.id);
    lost += clean - clean * conditionScale(f, prod.id) * f.condition;
  }
  return asRate(lost);
}

export function clickYield(f: SiteState): Yield {
  let flat = SOLO_BASE_CLICK as number;
  let seconds = 0;
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "click_mult") flat *= u.effect.factor;
    else if (u.effect.kind === "click_from_rate") seconds += u.effect.seconds;
  }
  const back = 1 + 0.1 * perkLevel(f, "strong_click");
  return Y.of((flat + seconds * currentRate(f)) * back);
}

// --- Weather mitigation ---

/** 0..MAX_MITIGATION; levels compound with diminishing returns. */
export function mitigation(f: SiteState, role: LandRole): number {
  let through = 1;
  for (const land of LANDS) {
    if (land.role !== role) continue;
    through *= Math.pow(1 - land.perLevel, landLevel(f, land.id));
  }
  if (role === "condition" || role === "breakage") {
    through *= Math.pow(1 - 0.08, perkLevel(f, "deep_condition"));
  }
  if (role === "frequency") {
    // calming producers share the clamp — two hundred of them must not zero the weather
    for (const prod of SOLO_PRODUCERS) {
      if (!prod.calmPerUnit) continue;
      through *= Math.pow(1 - prod.calmPerUnit, f.producers[prod.id] ?? 0);
    }
    through *= Math.pow(1 - 0.1, perkLevel(f, "dormancy"));
  }
  return Math.min(MAX_MITIGATION, 1 - through);
}

// --- What a site is allowed to own --- enforced here, not just in the shop, against hand-edited saves

/** Whether a site can stand in a world: outside always, inside once folded, beyond once breached. */
export function isWorldOpen(f: SiteState, world: World): boolean {
  if (world === "beyond") return f.converged && f.breached;
  return world === "outside" || f.converged;
}

export function isProducerAvailable(f: SiteState, id: SoloProducerId): boolean {
  return isWorldOpen(f, SOLO_PRODUCER_BY_ID[id].world);
}

export function isLandAvailable(f: SiteState, id: LandId): boolean {
  return isWorldOpen(f, LAND_BY_ID[id].world);
}

export function isPerkAvailable(f: SiteState, id: keyof typeof PERK_BY_ID): boolean {
  return f.converged || !PERK_BY_ID[id].afterFold;
}

// --- Prices ---

export function producerCost(f: SiteState, id: SoloProducerId, qty = 1): Yield {
  const { baseCost, growth } = SOLO_PRODUCER_BY_ID[id];
  const owned = f.producers[id] ?? 0;
  const geometric = (Math.pow(growth, qty) - 1) / (growth - 1);
  return Y.of(Math.ceil(baseCost * Math.pow(growth, owned) * geometric));
}

export function landCost(f: SiteState, id: LandId): Yield {
  const land = LAND_BY_ID[id];
  return Y.of(Math.ceil(land.baseCost * Math.pow(land.growth, landLevel(f, id))));
}

/** Priced on output restored, not the cost curve: both ends of 1.15^n give nonsense answers. */
export function repairCost(f: SiteState, id: SoloProducerId): Yield {
  const broken = brokenCount(f, id);
  if (broken <= 0) return Y.zero;
  const restored = broken * SOLO_PRODUCER_BY_ID[id].baseRate * producerMultiplier(f, id);
  const discount = SOLO_REPAIR_COST_FRACTION * Math.pow(0.9, perkLevel(f, "salvage"));
  return Y.of(Math.ceil(restored * REPAIR_SECONDS * discount));
}

export function totalRepairCost(f: SiteState): Yield {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += repairCost(f, prod.id);
  return Y.of(total);
}

/** Repairs in the current world plus condition. Order-independent: both are quoted off the clean rate. */
export function upkeepBill(f: SiteState): Yield {
  let total: number = conditionRestoreCost(f);
  for (const prod of producersIn(f.world)) total += repairCost(f, prod.id);
  return Y.of(total);
}

/** Lost production over a fixed window, so the bill grows with the site. */
export function conditionRestoreCost(f: SiteState): Yield {
  const missing = Math.max(0, 1 - f.condition);
  if (missing <= 1e-9) return Y.zero;
  return Y.of(Math.ceil(cleanRate(f) * missing * CONDITION_RESTORE_SECONDS));
}

export function affordableCount(f: SiteState, id: SoloProducerId, budget: Yield): number {
  let qty = 0;
  while (qty < 5000 && Y.gte(budget, producerCost(f, id, qty + 1))) qty++;
  return qty;
}

export function isUnlocked(f: SiteState, u: SoloUpgrade): boolean {
  if (!u.requires) return true;
  return (f.producers[u.requires.producer] ?? 0) >= u.requires.count;
}

export { MIN_CONDITION };
