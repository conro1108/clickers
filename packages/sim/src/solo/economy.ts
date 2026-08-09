/**
 * Rates and prices for the homestead. Pure functions of a `SiteState` — nothing
 * here integrates time or mutates anything (see `site.ts` for that).
 */

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

/** Everything that scales the whole site at once: upgrades, heirlooms, perks, condition. */
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

/** Multiplier on one producer type, before condition. */
export function producerMultiplier(f: SiteState, id: SoloProducerId): number {
  const prod = SOLO_PRODUCER_BY_ID[id];
  let m = globalMultiplier(f);
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "producer_mult" && u.effect.producer === id) m *= u.effect.factor;
  }
  // The Chorus is every site you ever handed down, still working. Nothing else
  // in the game makes the meta-layer visible in the picture.
  if (prod.generationScaled) m *= f.generation;
  if (prod.world === "inside") m *= 1 + perkLevel(f, "ur_yield");
  return m;
}

/**
 * The extra factor of condition the `well` gets, and that nothing else does.
 *
 * Kept out of `producerMultiplier` on purpose: that function is what
 * `cleanRate` and `repairCost` are quoted against, and both of them mean "with
 * the condition at full health". This is the live-condition half.
 */
function conditionScale(f: SiteState, id: SoloProducerId): number {
  return SOLO_PRODUCER_BY_ID[id].conditionScaled ? f.condition : 1;
}

/** What one more of `id` would add to the site's rate, as it stands right now. */
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

/**
 * What the site makes right now. Constant until the next weather event or the
 * next thing you buy — there are no timers in solo, which is the whole reason
 * an arbitrarily long absence resolves exactly.
 */
export function currentRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += producerRate(f, prod.id);
  return asRate(total * f.condition);
}

/** What the site would make with nothing broken and the condition at full health. */
export function cleanRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += (f.producers[prod.id] ?? 0) * SOLO_PRODUCER_BY_ID[prod.id].baseRate *
      producerMultiplier(f, prod.id);
  }
  return asRate(total);
}

/** Production currently lost to broken kit, per second. */
export function brokenRate(f: SiteState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += brokenCount(f, prod.id) * prod.baseRate * producerMultiplier(f, prod.id) *
      conditionScale(f, prod.id);
  }
  return asRate(total * f.condition);
}

/**
 * Production currently lost to tired condition, per second — what putting the dirt
 * right would actually give back.
 *
 * Not `rate * (1 - condition)`. That's only the same thing for producers the condition
 * multiplies once; the `well`'s rate scales with condition *as well as* being
 * multiplied by it, so what it loses is `1 - condition²`, and the short version
 * understates it threefold at half health. This is the number the "Restore the
 * condition" row advertises, and the `well` exists to make that row a decision.
 */
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

// ---------------------------------------------------------------------------
// Weather mitigation
// ---------------------------------------------------------------------------

/**
 * How much of a given kind of weather your land shrugs off, in 0..MAX_MITIGATION.
 * Levels compound with diminishing returns, so the tenth windbreak matters less
 * than the first and no amount of building makes the weather stop.
 */
export function mitigation(f: SiteState, role: LandRole): number {
  let through = 1;
  for (const land of LANDS) {
    if (land.role !== role) continue;
    through *= Math.pow(1 - land.perLevel, landLevel(f, land.id));
  }
  // Deep Roots is a prestige perk, so it stacks on top of whatever you built
  // this generation rather than replacing it.
  if (role === "condition" || role === "breakage") {
    through *= Math.pow(1 - 0.08, perkLevel(f, "deep_condition"));
  }
  if (role === "frequency") {
    // Hem Beds, on the same diminishing shape as a building and under
    // the same clamp — two hundred of them must not zero the weather.
    for (const prod of SOLO_PRODUCERS) {
      if (!prod.calmPerUnit) continue;
      through *= Math.pow(1 - prod.calmPerUnit, f.producers[prod.id] ?? 0);
    }
    through *= Math.pow(1 - 0.1, perkLevel(f, "dormancy"));
  }
  return Math.min(MAX_MITIGATION, 1 - through);
}

// ---------------------------------------------------------------------------
// What a site is allowed to own
// ---------------------------------------------------------------------------
//
// The tiers, buildings and perks above the fold don't exist until the world has
// folded. That's enforced here rather than only in the shop, because the sim is
// the authority on what a site can be — a hand-edited save shouldn't be able to
// buy a `well` into a site with a sky.

export function isProducerAvailable(f: SiteState, id: SoloProducerId): boolean {
  return f.converged || SOLO_PRODUCER_BY_ID[id].world === "outside";
}

export function isLandAvailable(f: SiteState, id: LandId): boolean {
  return f.converged || LAND_BY_ID[id].world === "outside";
}

export function isPerkAvailable(f: SiteState, id: keyof typeof PERK_BY_ID): boolean {
  return f.converged || !PERK_BY_ID[id].afterFold;
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

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

/**
 * What it costs to bring every broken unit of `id` back online.
 *
 * Priced against the production it gives back, not against the cost curve —
 * both ends of that curve give nonsense answers. Priced from the *working*
 * count, a half-wrecked site buys its capacity back at the rates it paid tiers
 * ago, so getting hit becomes the cheapest production in the game. Priced from
 * the *owned* count, 1.15^200 means putting a fleet back together costs orders
 * of magnitude more than the fleet will ever produce.
 *
 * Charging for the output restored is scale-free and says something legible:
 * damage costs you ten minutes of whatever it took away, at any scale.
 */
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

/**
 * The whole bill for the site you're standing on: every repair here, plus the
 * condition, which belongs to both places at once.
 *
 * Scoped to the current world because that's what you can actually pay for from
 * where you are — what's broken on the other site waits until you're standing
 * there. Nothing in here is order-dependent: `repairCost` and `conditionRestoreCost`
 * are both quoted off the clean rate, so fixing one thing never reprices
 * another, and the sum is what the whole lot costs however you go about it.
 */
export function upkeepBill(f: SiteState): Yield {
  let total: number = conditionRestoreCost(f);
  for (const prod of producersIn(f.world)) total += repairCost(f, prod.id);
  return Y.of(total);
}

/**
 * What it costs to put the condition back to full.
 *
 * Priced as "the production those lost points are worth over a fixed window",
 * so it tracks the size of the site instead of falling behind it. Ignore the
 * land long enough and the bill grows with you — which is the point.
 */
export function conditionRestoreCost(f: SiteState): Yield {
  const missing = Math.max(0, 1 - f.condition);
  if (missing <= 1e-9) return Y.zero;
  return Y.of(Math.ceil(cleanRate(f) * missing * CONDITION_RESTORE_SECONDS));
}

/** How many of `id` you could buy with `budget`. */
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
