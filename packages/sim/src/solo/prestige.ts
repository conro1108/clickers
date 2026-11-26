// Prestige. Heirlooms do double duty: unspent they multiply output, spent they buy perks.

import { Y, type Yield } from "../numbers.js";
import { named, THEME, type Shape } from "../theme.js";

export type PerkId =
  | "knack"
  | "head_start"
  | "deep_condition"
  | "strong_click"
  | "salvage"
  | "night_shift"
  | "core_tithe"
  | "dormancy"
  | "ur_yield"
  | "old_line"
  | "wild_yield";

export interface Perk {
  id: PerkId;
  name: string;
  blurb: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** Hidden until some generation has reached this deep (an index into `WORLDS`). */
  reached?: number;
}

// Priced against `heirloomsFor`: a run mints a few hundred, the table below the fold costs ~1,700 total.
const PERK_SHAPES: readonly Shape<Perk>[] = [
  {
    id: "knack",
    baseCost: 3,
    growth: 1.4,
    maxLevel: 12,
  },
  {
    id: "head_start",
    baseCost: 2,
    growth: 1.4,
    maxLevel: 12,
  },
  {
    id: "deep_condition",
    baseCost: 4,
    growth: 1.4,
    maxLevel: 12,
  },
  {
    id: "strong_click",
    baseCost: 2,
    growth: 1.4,
    // multiplies the click-from-rate loop; a bit over 2x at full stack
    maxLevel: 8,
  },
  {
    id: "salvage",
    baseCost: 4,
    growth: 1.4,
    maxLevel: 8,
  },
  {
    id: "night_shift",
    baseCost: 4,
    growth: 1.4,
    maxLevel: 10,
  },

  // --- Above the fold --- ~9,000 heirlooms for the row, thirty-odd converged hand-downs
  {
    id: "core_tithe",
    baseCost: 40,
    growth: 1.4,
    maxLevel: 12,
    reached: 1,
  },
  {
    id: "dormancy",
    baseCost: 60,
    growth: 1.4,
    maxLevel: 8,
    reached: 1,
  },
  {
    id: "ur_yield",
    baseCost: 120,
    growth: 1.8,
    maxLevel: 4,
    reached: 1,
  },

  // --- The deep end --- multiplicative, so a level is always worth a slice of the seeds it costs. Each
  // costs `growth` times the last, which keeps the row in reach of a long line and out of reach of a short
  // one for the whole of the long way.
  {
    id: "old_line",
    baseCost: 1_000,
    growth: 6,
    maxLevel: 25,
    // the void, where a line first needs seeds rather than a long run
    reached: 5,
  },
  {
    id: "wild_yield",
    baseCost: 1e18,
    growth: 4,
    maxLevel: 25,
    reached: 10,
  },
];

/** What a level of each multiplies by. */
export const OLD_LINE_FACTOR = 1.25;
export const WILD_YIELD_FACTOR = 2;

export const PERKS: readonly Perk[] = named(PERK_SHAPES, THEME.perks, "perk");

export const PERK_BY_ID: Record<PerkId, Perk> = Object.fromEntries(
  PERKS.map((p) => [p.id, p]),
) as Record<PerkId, Perk>;

export function perkCost(perk: Perk, level: number): number {
  return Math.ceil(perk.baseCost * Math.pow(perk.growth, level));
}

export const MULT_PER_UNSPENT_HEIRLOOM = 0.02;

// Fourth root: post-fold output is ~1e6x pre-fold, and a cube root made gen 2 a victory lap.
// 4e14 puts the first heirloom around day 3 of a multi-day run.
const HEIRLOOM_DIVISOR = 4e14;
const HEIRLOOM_EXPONENT = 1 / 4;

/** `vigor` is deliberately not wired to the Convergence. */
export function heirloomsFor(lifetimeRunProduced: Yield, vigor = 1): number {
  if (lifetimeRunProduced <= 0) return 0;
  return Math.floor(Math.pow(lifetimeRunProduced / HEIRLOOM_DIVISOR, HEIRLOOM_EXPONENT) * vigor);
}

export function headStartStock(level: number): Yield {
  if (level <= 0) return Y.zero;
  return Y.of(Math.ceil(500 * Math.pow(4, level)));
}
