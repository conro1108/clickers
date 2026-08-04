/**
 * Rates and prices for the homestead. Pure functions of a `MillState` — nothing
 * here integrates time or mutates anything (see `mill.ts` for that).
 */

import { P, rate as asRate, type Puppies, type Rate } from "../numbers.js";
import {
  LAND_BY_ID,
  LANDS,
  MAX_MITIGATION,
  MIN_BEDDING,
  REPAIR_SECONDS,
  BEDDING_RESTORE_SECONDS,
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
import { MULT_PER_UNSPENT_PAPER, PERK_BY_ID } from "./prestige.js";
import type { MillState } from "./state.js";

function ownedUpgrades(f: MillState): SoloUpgrade[] {
  return f.upgrades.map((id) => SOLO_UPGRADE_BY_ID[id]).filter((u): u is SoloUpgrade => !!u);
}

export function perkLevel(f: MillState, id: keyof typeof PERK_BY_ID): number {
  return f.perks[id] ?? 0;
}

export function landLevel(f: MillState, id: LandId): number {
  return f.land[id] ?? 0;
}

/** Everything that scales the whole mill at once: upgrades, papers, perks, bedding. */
export function globalMultiplier(f: MillState): number {
  let m = 1;
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "global_mult") m *= u.effect.factor;
  }
  m *= 1 + MULT_PER_UNSPENT_PAPER * f.papers;
  m *= 1 + 0.15 * perkLevel(f, "good_stock");
  m *= 1 + 0.4 * perkLevel(f, "nest_tithe");
  return m;
}

/** Multiplier on one producer type, before bedding. */
export function producerMultiplier(f: MillState, id: SoloProducerId): number {
  const prod = SOLO_PRODUCER_BY_ID[id];
  let m = globalMultiplier(f);
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "producer_mult" && u.effect.producer === id) m *= u.effect.factor;
  }
  // The Chorus is every mill you ever handed down, still working. Nothing else
  // in the game makes the meta-layer visible in the picture.
  if (prod.generationScaled) m *= f.generation;
  if (prod.world === "inside") m *= 1 + perkLevel(f, "ur_yield");
  return m;
}

/**
 * The extra factor of bedding the Down Well gets, and that nothing else does.
 *
 * Kept out of `producerMultiplier` on purpose: that function is what
 * `cleanRate` and `repairCost` are quoted against, and both of them mean "with
 * the bedding at full health". This is the live-condition half.
 */
function beddingScale(f: MillState, id: SoloProducerId): number {
  return SOLO_PRODUCER_BY_ID[id].beddingScaled ? f.bedding : 1;
}

/** What one more of `id` would add to the mill's rate, as it stands right now. */
export function producerRateEach(f: MillState, id: SoloProducerId): number {
  return SOLO_PRODUCER_BY_ID[id].baseRate * producerMultiplier(f, id) * beddingScale(f, id) * f.bedding;
}

export function workingCount(f: MillState, id: SoloProducerId): number {
  return Math.max(0, (f.producers[id] ?? 0) - (f.broken[id] ?? 0));
}

export function brokenCount(f: MillState, id: SoloProducerId): number {
  return Math.min(f.broken[id] ?? 0, f.producers[id] ?? 0);
}

export function producerRate(f: MillState, id: SoloProducerId): Rate {
  return asRate(
    workingCount(f, id) *
      SOLO_PRODUCER_BY_ID[id].baseRate *
      producerMultiplier(f, id) *
      beddingScale(f, id),
  );
}

/**
 * What the mill makes right now. Constant until the next weather event or the
 * next thing you buy — there are no timers in solo, which is the whole reason
 * an arbitrarily long absence resolves exactly.
 */
export function currentRate(f: MillState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += producerRate(f, prod.id);
  return asRate(total * f.bedding);
}

/** What the mill would make with nothing broken and the bedding at full health. */
export function cleanRate(f: MillState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += (f.producers[prod.id] ?? 0) * SOLO_PRODUCER_BY_ID[prod.id].baseRate *
      producerMultiplier(f, prod.id);
  }
  return asRate(total);
}

/** Production currently lost to broken kit, per second. */
export function brokenRate(f: MillState): Rate {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) {
    total += brokenCount(f, prod.id) * prod.baseRate * producerMultiplier(f, prod.id) *
      beddingScale(f, prod.id);
  }
  return asRate(total * f.bedding);
}

/**
 * Production currently lost to tired bedding, per second — what putting the dirt
 * right would actually give back.
 *
 * Not `rate * (1 - bedding)`. That's only the same thing for producers the bedding
 * multiplies once; the Down Well's rate scales with bedding *as well as* being
 * multiplied by it, so what it loses is `1 - bedding²`, and the short version
 * understates it threefold at half health. This is the number the "Restore the
 * bedding" row advertises, and the Down Well exists to make that row a decision.
 */
export function beddingLossRate(f: MillState): Rate {
  let lost = 0;
  for (const prod of SOLO_PRODUCERS) {
    const clean = workingCount(f, prod.id) * prod.baseRate * producerMultiplier(f, prod.id);
    lost += clean - clean * beddingScale(f, prod.id) * f.bedding;
  }
  return asRate(lost);
}

export function clickYield(f: MillState): Puppies {
  let flat = SOLO_BASE_CLICK as number;
  let seconds = 0;
  for (const u of ownedUpgrades(f)) {
    if (u.effect.kind === "click_mult") flat *= u.effect.factor;
    else if (u.effect.kind === "click_from_rate") seconds += u.effect.seconds;
  }
  const back = 1 + 0.1 * perkLevel(f, "carrying_voice");
  return P.of((flat + seconds * currentRate(f)) * back);
}

// ---------------------------------------------------------------------------
// Weather mitigation
// ---------------------------------------------------------------------------

/**
 * How much of a given kind of weather your land shrugs off, in 0..MAX_MITIGATION.
 * Levels compound with diminishing returns, so the tenth windbreak matters less
 * than the first and no amount of building makes the weather stop.
 */
export function mitigation(f: MillState, role: LandRole): number {
  let through = 1;
  for (const land of LANDS) {
    if (land.role !== role) continue;
    through *= Math.pow(1 - land.perLevel, landLevel(f, land.id));
  }
  // Deep Roots is a prestige perk, so it stacks on top of whatever you built
  // this generation rather than replacing it.
  if (role === "bedding" || role === "breakage") {
    through *= Math.pow(1 - 0.08, perkLevel(f, "deep_bedding"));
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
// What a mill is allowed to own
// ---------------------------------------------------------------------------
//
// The tiers, buildings and perks above the fold don't exist until the world has
// folded. That's enforced here rather than only in the shop, because the sim is
// the authority on what a mill can be — a hand-edited save shouldn't be able to
// buy a Down Well into a mill with a sky.

export function isProducerAvailable(f: MillState, id: SoloProducerId): boolean {
  return f.converged || SOLO_PRODUCER_BY_ID[id].world === "outside";
}

export function isLandAvailable(f: MillState, id: LandId): boolean {
  return f.converged || LAND_BY_ID[id].world === "outside";
}

export function isPerkAvailable(f: MillState, id: keyof typeof PERK_BY_ID): boolean {
  return f.converged || !PERK_BY_ID[id].afterFold;
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export function producerCost(f: MillState, id: SoloProducerId, qty = 1): Puppies {
  const { baseCost, growth } = SOLO_PRODUCER_BY_ID[id];
  const owned = f.producers[id] ?? 0;
  const geometric = (Math.pow(growth, qty) - 1) / (growth - 1);
  return P.of(Math.ceil(baseCost * Math.pow(growth, owned) * geometric));
}

export function landCost(f: MillState, id: LandId): Puppies {
  const land = LAND_BY_ID[id];
  return P.of(Math.ceil(land.baseCost * Math.pow(land.growth, landLevel(f, id))));
}

/**
 * What it costs to bring every broken unit of `id` back online.
 *
 * Priced against the production it gives back, not against the cost curve —
 * both ends of that curve give nonsense answers. Priced from the *working*
 * count, a half-wrecked mill buys its capacity back at the rates it paid tiers
 * ago, so getting hit becomes the cheapest production in the game. Priced from
 * the *owned* count, 1.15^200 means putting a fleet back together costs orders
 * of magnitude more than the fleet will ever produce.
 *
 * Charging for the output restored is scale-free and says something legible:
 * damage costs you ten minutes of whatever it took away, at any scale.
 */
export function repairCost(f: MillState, id: SoloProducerId): Puppies {
  const broken = brokenCount(f, id);
  if (broken <= 0) return P.zero;
  const restored = broken * SOLO_PRODUCER_BY_ID[id].baseRate * producerMultiplier(f, id);
  const discount = SOLO_REPAIR_COST_FRACTION * Math.pow(0.9, perkLevel(f, "salvage"));
  return P.of(Math.ceil(restored * REPAIR_SECONDS * discount));
}

export function totalRepairCost(f: MillState): Puppies {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += repairCost(f, prod.id);
  return P.of(total);
}

/**
 * The whole bill for the mill you're standing on: every repair here, plus the
 * bedding, which belongs to both places at once.
 *
 * Scoped to the current world because that's what you can actually pay for from
 * where you are — what's broken on the other mill waits until you're standing
 * there. Nothing in here is order-dependent: `repairCost` and `beddingRestoreCost`
 * are both quoted off the clean rate, so fixing one thing never reprices
 * another, and the sum is what the whole lot costs however you go about it.
 */
export function upkeepBill(f: MillState): Puppies {
  let total: number = beddingRestoreCost(f);
  for (const prod of producersIn(f.world)) total += repairCost(f, prod.id);
  return P.of(total);
}

/**
 * What it costs to put the bedding back to full.
 *
 * Priced as "the production those lost points are worth over a fixed window",
 * so it tracks the size of the mill instead of falling behind it. Ignore the
 * land long enough and the bill grows with you — which is the point.
 */
export function beddingRestoreCost(f: MillState): Puppies {
  const missing = Math.max(0, 1 - f.bedding);
  if (missing <= 1e-9) return P.zero;
  return P.of(Math.ceil(cleanRate(f) * missing * BEDDING_RESTORE_SECONDS));
}

/** How many of `id` you could buy with `budget`. */
export function affordableCount(f: MillState, id: SoloProducerId, budget: Puppies): number {
  let qty = 0;
  while (qty < 5000 && P.gte(budget, producerCost(f, id, qty + 1))) qty++;
  return qty;
}

export function isUnlocked(f: MillState, u: SoloUpgrade): boolean {
  if (!u.requires) return true;
  return (f.producers[u.requires.producer] ?? 0) >= u.requires.count;
}

export { MIN_BEDDING };
