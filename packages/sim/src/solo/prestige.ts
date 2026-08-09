/**
 * Handing the site down.
 *
 * A run eventually stalls: every tier costs 1.15^n and the top of the ladder is
 * finite. Prestige is what makes the game endless — you retire the line, keep a
 * Heirloom for every order of magnitude you managed, and start the next
 * one permanently better.
 *
 * Heirlooms do double duty on purpose. Unspent, they multiply your output — a
 * better-bred line is a better line. Spent, they buy perks. So the meta-layer
 * has the same shape as the moment-to-moment game: one pool, competing uses.
 */

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
  | "ur_yield";

export interface Perk {
  id: PerkId;
  name: string;
  blurb: string;
  /** Heirlooms for the first level; each level after costs growth^level. */
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** Only makes sense inside the core, and priced at inside-the-core prices. */
  afterFold?: boolean;
}

/**
 * Everything here is priced against `heirloomsFor`, so the two move together.
 *
 * A dedicated run mints a few hundred heirlooms and the whole table below the fold
 * costs about 1,700 cumulative — ten-odd hand-downs to finish it, which is the
 * length the meta-game wants. The growth rate is what sets that: at 1.7 the
 * twentieth level of anything costs 40,000x the first, so the top half of every
 * row was decoration nobody was ever going to buy. Shorter rows at 1.4 are the
 * same total spend with every level of it reachable.
 */
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
    // Multiplies the click-from-rate upgrades, so this is the second half of
    // the same feedback loop. Kept to a bit over 2x at full stack.
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

  // --- Above the fold ------------------------------------------------------
  //
  // A converged run still mints several times what an unconverged one does, and
  // these are what that scale is for: about 9,000 heirlooms for the row, thirty-odd
  // converged hand-downs, and the only reason to keep giving the site up once
  // you've folded it. Held to a few times the table above rather than the
  // thousandfold they were first priced at — that pricing assumed the cube root,
  // and fell with it.
  {
    id: "core_tithe",
    baseCost: 40,
    growth: 1.4,
    maxLevel: 12,
    afterFold: true,
  },
  {
    id: "dormancy",
    baseCost: 60,
    growth: 1.4,
    maxLevel: 8,
    afterFold: true,
  },
  {
    id: "ur_yield",
    baseCost: 120,
    growth: 1.8,
    maxLevel: 4,
    afterFold: true,
  },
];

export const PERKS: readonly Perk[] = named(PERK_SHAPES, THEME.perks, "perk");

export const PERK_BY_ID: Record<PerkId, Perk> = Object.fromEntries(
  PERKS.map((p) => [p.id, p]),
) as Record<PerkId, Perk>;

export function perkCost(perk: Perk, level: number): number {
  return Math.ceil(perk.baseCost * Math.pow(perk.growth, level));
}

/** Output multiplier from every heirloom you chose not to spend. */
export const MULT_PER_UNSPENT_HEIRLOOM = 0.02;

/**
 * Heirlooms a run is worth. Fourth root, not cube root, and that exponent is the
 * whole tuning.
 *
 * The ladder didn't grow evenly when the fold was added: output above the fold
 * runs about a million times a pre-fold run's, so a cube root turned a converged
 * week into 55,000 heirlooms — a x1,100 output multiplier from the unspent pile
 * alone, handed to a site that starts again at four patches. The second
 * generation wasn't a run, it was a victory lap. A fourth root damps the same
 * span to a few hundred, and damps the run-to-run feedback with it: a generation
 * that raises 10x more than the last mints only 1.8x the heirlooms, so the meta
 * layer converges instead of running away.
 *
 * The divisor sets when the first hand-down becomes worth it. 4e14 puts the
 * first heirloom around day 3 of a multi-day run — close enough to the Convergence
 * that reaching for prestige early costs you one heirloom, which is what lets the
 * Heirloom tab be shown before the fold instead of held until after it.
 */
const HEIRLOOM_DIVISOR = 4e14;
const HEIRLOOM_EXPONENT = 1 / 4;

/**
 * `vigor` is a damper, if it's ever used at all. It is deliberately not wired
 * to the Convergence — a converged run already mints several times what an
 * unconverged one does, and paying it a bonus on top would make the perk table
 * it's meant to fund even shorter.
 */
export function heirloomsFor(lifetimeRunProduced: Yield, vigor = 1): number {
  if (lifetimeRunProduced <= 0) return 0;
  return Math.floor(Math.pow(lifetimeRunProduced / HEIRLOOM_DIVISOR, HEIRLOOM_EXPONENT) * vigor);
}

/** Yield you start a generation with, from Head Start. */
export function headStartStock(level: number): Yield {
  if (level <= 0) return Y.zero;
  // Roughly "the first few minutes, skipped" — grows fast enough to stay
  // relevant but never enough to buy a tier you haven't earned.
  return Y.of(Math.ceil(500 * Math.pow(4, level)));
}
