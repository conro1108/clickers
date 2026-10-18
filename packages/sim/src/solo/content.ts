/**
 * Content for the solo homestead — a site you keep, not a match you finish.
 *
 * Deliberately separate from the versus content set. That ladder is tuned so a
 * five-minute match can climb the whole thing; this one is tuned for a run that
 * goes for days and gets reset on purpose. Sharing one table would mean every
 * balance change to either mode silently retunes the other.
 */

import { Y, type Yield } from "../numbers.js";
import { named, THEME, type Shape } from "../theme.js";

/**
 * The two places a site exists in.
 *
 * `outside` is the site you started with — yard, sky, weather. `inside` is what
 * the Convergence opens: the core the `ur_form` burrowed into, which you
 * turn out to have been standing on the whole time. After the fold you own both at once. The outside
 * site keeps producing whether you're looking at it or not, and the inside is a
 * fresh ladder with its own shop, its own land, and its own picture.
 *
 * `SiteState.world` is only ever "which one am I looking at". It has no effect
 * on production — see `currentRate`, which sums the lot.
 *
 * `beyond` is the third place, opened by the `breach` at the bottom of the
 * inside ladder the same way the `ur_form` opens the inside. Same rules: a
 * fresh ladder, its own land, its own picture, and everything behind you keeps
 * producing.
 */
export type World = "outside" | "inside" | "beyond";

export type SoloProducerId =
  | "patch"
  | "hand"
  | "rig"
  | "hauler"
  | "machine"
  | "lab"
  | "refinery"
  | "tower"
  | "airship"
  | "reactor"
  | "orbital"
  | "singularity"
  | "fold"
  | "deephand"
  | "face"
  | "well"
  | "main"
  | "chorus"
  | "heart"
  | "second"
  | "echo"
  | "kin"
  | "grove"
  | "tide"
  | "beacon"
  | "third";

export interface SoloProducer {
  id: SoloProducerId;
  name: string;
  blurb: string;
  /**
   * What a damaged one of these is, and what putting it right is called. A
   * hauler breaks; a hand doesn't, and a chorus of other yous really
   * doesn't. Reads as "2 maimed" and "Patch up Hand".
   */
  hurt: string;
  mend: string;
  /** Yield per second, per unit owned, before any multipliers. */
  baseRate: number;
  baseCost: Yield;
  /** Cost of the Nth unit is baseCost * growth^N. */
  growth: number;
  /**
   * Which of the two sites it stands on. Everything `inside` is hidden and
   * unbuyable until the Convergence, which is enforced in `applySiteCommand`
   * rather than only in the shop — the sim is the authority on what a site is
   * allowed to own.
   */
  world: World;
  /**
   * Rate scales with condition health *as well as* being multiplied by it, so
   * restoring condition is a live decision at the top of the ladder instead of a
   * rounding error. Condition only moves on weather events and purchases, so this
   * leaves the rate piecewise-constant — which is what the whole offline model
   * rests on.
   */
  conditionScaled?: boolean;
  /** Rate scales with `generation`. Every site you handed down is still working. */
  generationScaled?: boolean;
  /**
   * Stretches the gap between weather events, per unit owned, on the same
   * `1-(1-p)^n` shape the land buildings use and under the same clamp. Small:
   * a hundred of these must not zero the weather.
   */
  calmPerUnit?: number;
}

/**
 * Twelve rungs, each 8x the output and ~14-18x the price of the one below.
 *
 * The gap is the pace control for the whole run. Payback climbs from 20s at
 * the bottom rung to many hours at the top, so cheap rungs stay buyable filler
 * while expensive ones are things you save days for. Growth is 1.19 rather
 * than the previous 1.16 — the compounding difference across 50+ units is
 * substantial, and the upper-tier base costs are higher too, keeping a
 * determined player busy for several real-world days before the ladder is
 * cleared. `solo.test.ts` is the check on this curve — retune here, run that.
 */
const SOLO_PRODUCER_SHAPES: readonly Shape<SoloProducer>[] = [
  {
    id: "patch",
    baseRate: 1,
    baseCost: Y.of(20),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "hand",
    baseRate: 8,
    baseCost: Y.of(280),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "rig",
    baseRate: 60,
    baseCost: Y.of(3_600),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "hauler",
    baseRate: 450,
    baseCost: Y.of(52_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "machine",
    baseRate: 3_400,
    baseCost: Y.of(800_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "lab",
    baseRate: 26_000,
    baseCost: Y.of(12_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "refinery",
    baseRate: 200_000,
    baseCost: Y.of(200_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "tower",
    baseRate: 1_500_000,
    baseCost: Y.of(3_200_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "airship",
    baseRate: 12_000_000,
    baseCost: Y.of(50_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "reactor",
    baseRate: 90_000_000,
    baseCost: Y.of(800_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "orbital",
    baseRate: 700_000_000,
    baseCost: Y.of(13_000_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "singularity",
    baseRate: 5_500_000_000,
    baseCost: Y.of(200_000_000_000_000),
    growth: 1.19,
    world: "outside",
  },

  // --- Inside the core -----------------------------------------------------
  //
  // The second site, and the reason the Convergence is worth reaching: a ladder
  // of its own, standing in the core rather than out in the yard, bought with the stock
  // the old site is still turning out while you're down here.
  //
  // It used to be four rungs bolted onto the end of the outside ladder, which
  // made the whole endgame "four more rows in the same shop". Eight now, over
  // the same span from the `singularity` to the `second` — so
  // no rung moved at either end and the run is the length it always was, but the
  // inside is a climb you can spend time on rather than four purchases. Cost
  // steps by ~3.8x and output by ~2.8x per rung, which keeps payback rising the
  // whole way up exactly as the outside ladder's 14x/8x does.
  //
  // The first one is deliberately affordable more or less on arrival. Walking
  // into a new world and being able to buy the bottom of its shop is the point:
  // it's a place you start over in, not a wing of the old site.
  //
  // **The ladder is a descent.** Each rung is further in than the one above it,
  // through four strata of two: the hem you came in at, the packed fleece under
  // it, the seams that hold the whole thing together, and the warm at the
  // middle. That buys three things at once — the shop reads as going somewhere,
  // `insideScene` gets a depth to draw instead of five stripes of the same
  // cream, and buying into a new stratum is a small reveal, which the endgame
  // had none of after the fold.
  {
    id: "fold",
    baseRate: 15_000_000_000,
    baseCost: Y.of(750_000_000_000_000),
    growth: 1.19,
    world: "inside",
    // The one thing at the top of the ladder that feeds back into the land
    // half, which otherwise caps at four buildings and stops mattering.
    //
    // The calming and the production are the same act rather than two facts
    // about one row: you burrow into the hem, the core packs down and pushes
    // the loose down out ahead of you, you gather it — and a core with somebody
    // already settled in it is a core that turns over less. That's the stirring
    // mitigated by the thing that feeds you.
    calmPerUnit: 0.004,
  },
  {
    id: "deephand",
    // The inside's Hand, and deliberately at the same height on the
    // ladder: outside, rung 2 is the first people you hire, and it's most of
    // what makes that site feel worked rather than automated. The inside had no
    // people until the Chorus at rung 6 — three quarters of the way up a ladder
    // that takes days — so for almost the whole descent the place was machinery
    // running in an empty building. Cheap and early is the whole point.
    baseRate: 42_000_000_000,
    baseCost: Y.of(2_800_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "face",
    baseRate: 120_000_000_000,
    baseCost: Y.of(10_600_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "well",
    baseRate: 340_000_000_000,
    baseCost: Y.of(40_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
    // A well is condition-scaled with the reason drawn on it: it fills from
    // above, and above is the site you left standing on its own ground. Let
    // that condition go and the wells come up short, which is what puts the yard
    // back on the table at the top of the ladder.
    conditionScaled: true,
  },
  {
    id: "main",
    baseRate: 960_000_000_000,
    baseCost: Y.of(150_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "chorus",
    baseRate: 2_700_000_000_000,
    baseCost: Y.of(560_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
    generationScaled: true,
  },
  {
    id: "heart",
    baseRate: 7_700_000_000_000,
    baseCost: Y.of(2_100_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "second",
    baseRate: 22_000_000_000_000,
    baseCost: Y.of(8_000_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },

  // --- Beyond ------------------------------------------------------------
  //
  // The third site, through the `breach`. Six rungs carrying on the inside's
  // steps (~3.8x cost, ~2.8x output) from where the `second` left off, so the
  // first one is buyable about on arrival and payback keeps rising.
  {
    id: "echo",
    baseRate: 62_000_000_000_000,
    baseCost: Y.of(30_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
  },
  {
    // The beyond's Hand: people, early, so the new place isn't empty.
    id: "kin",
    baseRate: 170_000_000_000_000,
    baseCost: Y.of(115_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
  },
  {
    id: "grove",
    baseRate: 480_000_000_000_000,
    baseCost: Y.of(440_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
    calmPerUnit: 0.003,
  },
  {
    id: "tide",
    baseRate: 1_350_000_000_000_000,
    baseCost: Y.of(1_700_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
    conditionScaled: true,
  },
  {
    id: "beacon",
    baseRate: 3_800_000_000_000_000,
    baseCost: Y.of(6_500_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
    generationScaled: true,
  },
  {
    id: "third",
    baseRate: 10_700_000_000_000_000,
    baseCost: Y.of(25_000_000_000_000_000_000_000),
    growth: 1.19,
    world: "beyond",
  },
];

export const SOLO_PRODUCERS: readonly SoloProducer[] = named(SOLO_PRODUCER_SHAPES, THEME.soloProducers, "producer");

/** The rungs that stand in one world or the other, in ladder order. */
export function producersIn(world: World): readonly SoloProducer[] {
  return SOLO_PRODUCERS.filter((p) => p.world === world);
}

export const SOLO_PRODUCER_BY_ID: Record<SoloProducerId, SoloProducer> = Object.fromEntries(
  SOLO_PRODUCERS.map((p) => [p.id, p]),
) as Record<SoloProducerId, SoloProducer>;

// ---------------------------------------------------------------------------
// Upgrades — one-time buys, gated on how much of a producer you own.
// ---------------------------------------------------------------------------

export type SoloUpgradeEffect =
  | { kind: "click_mult"; factor: number }
  | { kind: "global_mult"; factor: number }
  | { kind: "producer_mult"; producer: SoloProducerId; factor: number }
  /**
   * Ties clicking to the site you've built: a click is worth this many seconds of
   * production. Without it, clicking is dead weight within the first hour and
   * the game stops having a verb.
   *
   * The seconds are deliberately fractional. This effect is a feedback loop —
   * income scales with the rate it's spent on — so at a whole second per click a
   * player clicking twice a second is worth twice the entire site, and the
   * whole ladder falls over in half an hour. Everything here is meant to sum to
   * a couple of seconds at most, even fully perked.
   */
  | { kind: "click_from_rate"; seconds: number };

export interface SoloUpgrade {
  id: string;
  name: string;
  blurb: string;
  cost: Yield;
  effect: SoloUpgradeEffect;
  /** Hidden until the player owns this many of the producer. */
  requires?: { producer: SoloProducerId; count: number };
}

/**
 * What the first `count` of a producer cost, from nothing.
 *
 * Upgrade prices are quoted against this rather than as absolute numbers, so
 * they mean "about what the fleet that unlocked this cost you" at every rung
 * and stay honest when the ladder gets retuned. As flat constants they drifted
 * every time: an upgrade priced for a 170M tier is a giveaway once that tier
 * costs 1.1B, and giveaways are how a day-long run turns into an hour.
 */
function fleetCost(id: SoloProducerId, count: number, share = 1): Yield {
  const prod = SOLO_PRODUCERS.find((p) => p.id === id)!;
  const units = (Math.pow(prod.growth, count) - 1) / (prod.growth - 1);
  return Y.of(Math.ceil(prod.baseCost * units * share));
}

/**
 * Three boosts per tier: one when you have a few, one when you're deep in, and
 * one for the players who go all the way in on a rung.
 *
 * The first is a doubling (x2) gated on owning ten units.
 * The second is a +50% boost (x1.5) gated on fifty units — not another
 * doubling. Stacking two doublings per tier meant every tier self-amplified
 * 4x the moment you were deep in it, which is a big part of why the ladder
 * used to evaporate.
 * The third is a doubling again, gated on **a hundred**. That gate is the whole
 * design: a hundred of anything is a full day of aiming at one rung rather than
 * spreading, so the reward is allowed to be loud — and it's the only upgrade in
 * the game that changes the silhouette of the thing rather than its paint.
 *
 * All three are priced against the fleet you must already own.
 */
function tierUpgrades(): SoloUpgrade[] {
  const out: SoloUpgrade[] = [];
  for (const prod of SOLO_PRODUCERS) {
    const naming = THEME.soloTierUpgrades[prod.id];
    if (!naming) throw new Error(`theme has no tier upgrade names for "${prod.id}"`);
    const [first, second, third] = naming;
    out.push({
      id: `${prod.id}_x2a`,
      name: first,
      blurb: `${prod.name}s produce twice as much.`,
      cost: fleetCost(prod.id, 10),
      effect: { kind: "producer_mult", producer: prod.id, factor: 2 },
      requires: { producer: prod.id, count: 10 },
    });
    out.push({
      id: `${prod.id}_x2b`,
      name: second,
      blurb: `${prod.name}s produce 50% more.`,
      cost: fleetCost(prod.id, 50, 0.4),
      effect: { kind: "producer_mult", producer: prod.id, factor: 1.5 },
      requires: { producer: prod.id, count: 50 },
    });
    out.push({
      id: `${prod.id}_x2c`,
      name: third,
      blurb: `${prod.name}s produce twice as much — and stop looking like the old ones.`,
      cost: fleetCost(prod.id, 100, 1.2),
      effect: { kind: "producer_mult", producer: prod.id, factor: 2 },
      requires: { producer: prod.id, count: 100 },
    });
  }
  return out;
}

const CLICK_UPGRADE_SHAPES: Shape<SoloUpgrade>[] = [
  {
    id: "tool_1",
    cost: Y.of(100),
    effect: { kind: "click_mult", factor: 3 },
  },
  {
    id: "tool_2",
    cost: fleetCost("hand", 5),
    effect: { kind: "click_mult", factor: 5 },
    requires: { producer: "hand", count: 5 },
  },
  {
    id: "tool_3",
    cost: fleetCost("hauler", 10),
    effect: { kind: "click_mult", factor: 8 },
    requires: { producer: "hauler", count: 10 },
  },
  {
    id: "tool_4",
    cost: fleetCost("lab", 5, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.25 },
    requires: { producer: "lab", count: 5 },
  },
  {
    id: "tool_5",
    cost: fleetCost("tower", 10, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.5 },
    requires: { producer: "tower", count: 10 },
  },
  {
    id: "tool_6",
    cost: fleetCost("orbital", 10, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.75 },
    requires: { producer: "orbital", count: 10 },
  },
];

const CLICK_UPGRADES: SoloUpgrade[] = [...named(CLICK_UPGRADE_SHAPES, THEME.soloClickUpgrades, "upgrade")];

/**
 * Global multipliers deliberately kept modest, and deliberately **dear**.
 *
 * Two separate knobs, and they got out of step. The factor is small — 1.3 to 2,
 * where an early draft had a x2/x3/x5 chain that evaporated a week-long run in
 * an afternoon. But the *price* had drifted down to a few hundred seconds of
 * production, so the thing that permanently lifts every rung of the ladder at
 * once cost less than the rung you were standing on. These are now priced in the
 * thousands of seconds each: a global is something you stop and save for, on
 * roughly the scale the `ur_form` always was, and passing one over to keep
 * climbing has to be a real option.
 *
 * The shares below look arbitrary because they are: each is tuned so the upgrade
 * lands in that band at the moment its gate opens, and the fleet it's quoted
 * against sits at wildly different points on the curve from one rung to the next.
 * `solo.test.ts` holds the floor; `probe` in this package's history is how the
 * band was measured.
 */
const GLOBAL_UPGRADE_SHAPES: Shape<SoloUpgrade>[] = [
  {
    id: "boost_1",
    cost: fleetCost("hand", 15, 340),
    effect: { kind: "global_mult", factor: 1.3 },
    requires: { producer: "hand", count: 15 },
  },
  {
    id: "boost_2",
    cost: fleetCost("rig", 25, 190),
    effect: { kind: "global_mult", factor: 1.3 },
    requires: { producer: "rig", count: 25 },
  },
  {
    id: "boost_3",
    cost: fleetCost("machine", 20, 42),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "machine", count: 20 },
  },
  {
    id: "co_op",
    cost: fleetCost("refinery", 25, 14),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "refinery", count: 25 },
  },
  {
    id: "charter",
    cost: fleetCost("airship", 25, 5),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "airship", count: 25 },
  },
  {
    id: "monopoly",
    cost: fleetCost("reactor", 25, 3),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "reactor", count: 25 },
  },
  {
    id: "habitat",
    cost: fleetCost("orbital", 25, 6),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "orbital", count: 25 },
  },
  /**
   * The Convergence, on a button the player chose to press.
   *
   * Gated at ten Core Singularities rather than twenty-five, which is what
   * pulls the endgame from five days of play to three and puts the fold inside
   * a single dedicated first run — the constraint the whole endgame design is
   * binding on. It still costs about a thousand seconds of production at the
   * moment it's bought, which is the same league as the other late globals and
   * well clear of the sixty-second floor `solo.test.ts` guards.
   */
  {
    id: "ur_form",
    /**
     * The only upgrade in the game that doesn't say what it does.
     *
     * Every other blurb is a price tag's other half — you read the number, you
     * read the multiplier, you decide. This one isn't a decision, and quoting
     * "everything produces x2" next to it puts it back on the same shelf as
     * Fertilizer at the exact moment the game most needs it off that shelf.
     * It still doubles everything; the shop just doesn't lead with it.
     */
    cost: fleetCost("singularity", 10),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "singularity", count: 10 },
  },
  {
    id: "ceiling_rights",
    cost: fleetCost("fold", 25, 5),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "fold", count: 25 },
  },
  {
    id: "deep_rights",
    cost: fleetCost("well", 25, 9),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "well", count: 25 },
  },
  {
    id: "unbroken_line",
    cost: fleetCost("chorus", 25, 2),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "chorus", count: 25 },
  },
  {
    id: "third_form",
    cost: fleetCost("second", 25),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "second", count: 25 },
  },
  /** The second fold, built like the first: ten of the last rung, about its fleet's price, opens `beyond`. */
  {
    id: "breach",
    cost: fleetCost("second", 10),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "second", count: 10 },
  },
  {
    id: "beyond_rights",
    cost: fleetCost("grove", 25, 5),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "grove", count: 25 },
  },
  {
    id: "last_form",
    cost: fleetCost("third", 25),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "third", count: 25 },
  },
];

const GLOBAL_UPGRADES: SoloUpgrade[] = [...named(GLOBAL_UPGRADE_SHAPES, THEME.soloGlobalUpgrades, "upgrade")];

export const SOLO_UPGRADES: readonly SoloUpgrade[] = [
  ...CLICK_UPGRADES,
  ...tierUpgrades(),
  ...GLOBAL_UPGRADES,
];

export const SOLO_UPGRADE_BY_ID: Record<string, SoloUpgrade> = Object.fromEntries(
  SOLO_UPGRADES.map((u) => [u.id, u]),
);

// ---------------------------------------------------------------------------
// Land — permanent infrastructure against the weather.
//
// The versus mode's defenses are timed absorb pools, which is the right shape
// for a five-minute fight you're watching. It's the wrong shape here: most
// weather lands while the tab is closed, so a shield with a 90-second window
// would protect nothing. These are levelled buildings that just keep working.
// ---------------------------------------------------------------------------

export type LandId =
  | "windbreak"
  | "drainage"
  | "pest_control"
  | "insurance"
  | "inner_beds"
  | "inner_calm"
  | "inner_lining"
  | "inner_reclaim"
  | "beyond_beds"
  | "beyond_lining"
  | "beyond_calm"
  | "beyond_reclaim";

export type LandRole =
  /** Cuts how many units a disaster knocks offline. */
  | "breakage"
  /** Cuts how much condition health a disaster costs you. */
  | "condition"
  /** Stretches the gap between disasters. */
  | "frequency"
  /** Pays out stock when something goes wrong. */
  | "payout";

export interface Land {
  id: LandId;
  name: string;
  blurb: string;
  role: LandRole;
  /**
   * Per-level effectiveness. Levels compound as 1-(1-perLevel)^level, so they
   * stack with diminishing returns and never reach 1 — the weather is a cost of
   * doing business, not something you can buy your way out of.
   */
  perLevel: number;
  baseCost: Yield;
  growth: number;
  /**
   * Which site it defends. The `inside` set is only buildable once the world has
   * folded, and it's what the inside's Upkeep panel sells instead of the four
   * that are about a sky.
   */
  world: World;
}

const LAND_SHAPES: readonly Shape<Land>[] = [
  {
    id: "windbreak",
    role: "breakage",
    perLevel: 0.14,
    baseCost: Y.of(600),
    growth: 1.9,
    world: "outside",
  },
  {
    id: "drainage",
    role: "condition",
    perLevel: 0.14,
    baseCost: Y.of(2_500),
    growth: 1.9,
    world: "outside",
  },
  {
    id: "pest_control",
    role: "frequency",
    perLevel: 0.1,
    baseCost: Y.of(9_000),
    growth: 2.1,
    world: "outside",
  },
  {
    id: "insurance",
    role: "payout",
    perLevel: 0.12,
    baseCost: Y.of(40_000),
    growth: 1.9,
    world: "outside",
  },
  // Inside the core there is no sky, so the four above stop being about
  // weather and the four below are what the second axis gets instead. Same
  // roles, one for one, priced at the scale of the site that can see them: the
  // first level of any of them is a few minutes of production at the moment the
  // world folds.
  {
    id: "inner_beds",
    role: "breakage",
    perLevel: 0.13,
    baseCost: Y.of(500_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
  {
    id: "inner_lining",
    role: "condition",
    perLevel: 0.13,
    baseCost: Y.of(800_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
  {
    id: "inner_calm",
    role: "frequency",
    perLevel: 0.09,
    baseCost: Y.of(1_500_000_000_000_000),
    growth: 2.1,
    world: "inside",
  },
  {
    id: "inner_reclaim",
    role: "payout",
    perLevel: 0.12,
    baseCost: Y.of(3_000_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
  // The same four again, priced at a few minutes of production on arrival beyond.
  {
    id: "beyond_beds",
    role: "breakage",
    perLevel: 0.12,
    baseCost: Y.of(20_000_000_000_000_000_000),
    growth: 1.9,
    world: "beyond",
  },
  {
    id: "beyond_lining",
    role: "condition",
    perLevel: 0.12,
    baseCost: Y.of(32_000_000_000_000_000_000),
    growth: 1.9,
    world: "beyond",
  },
  {
    id: "beyond_calm",
    role: "frequency",
    perLevel: 0.08,
    baseCost: Y.of(60_000_000_000_000_000_000),
    growth: 2.1,
    world: "beyond",
  },
  {
    id: "beyond_reclaim",
    role: "payout",
    perLevel: 0.12,
    baseCost: Y.of(120_000_000_000_000_000_000),
    growth: 1.9,
    world: "beyond",
  },
];

export const LANDS: readonly Land[] = named(LAND_SHAPES, THEME.lands, "land");

/** The buildings that defend one site or the other. */
export function landsIn(world: World): readonly Land[] {
  return LANDS.filter((l) => l.world === world);
}

export const LAND_BY_ID: Record<LandId, Land> = Object.fromEntries(
  LANDS.map((l) => [l.id, l]),
) as Record<LandId, Land>;

/** However much land you buy, weather still gets through this much. */
export const MAX_MITIGATION = 0.85;

// ---------------------------------------------------------------------------
// Condition, damage, and the cost of putting things right.
// ---------------------------------------------------------------------------

/** Base stock per click, before any multipliers. */
export const SOLO_BASE_CLICK = Y.of(1);

/**
 * Condition health multiplies your whole site and only ever goes down on its own.
 * Nothing brings it back but spending — that's the "force of nature" bargain:
 * the land degrades, and staying productive means paying to hold it steady.
 */
export const MAX_CONDITION = 1;

/** Floor on condition health, so a long time away is a setback and never a wipe. */
export const MIN_CONDITION = 0.25;

/**
 * Restoring condition is priced against your production rate rather than a fixed
 * table, so it stays a real decision at every scale instead of becoming free
 * the moment you out-grow it.
 *
 * The number is a payback time: fresh condition buys back its own price in this
 * many seconds. What it competes with is the next rung of the ladder, and that
 * pays back in one to five minutes for most of a run — so anything much above
 * five minutes here is a button no one should ever press, which is what twenty
 * minutes was. It also has to stay in the same league as `REPAIR_SECONDS`, or
 * the two halves of the same mechanic quote different prices for the same lost
 * unit.
 */
export const CONDITION_RESTORE_SECONDS = 300;

/** Discount on the quoted repair price. See `repairCost` for what's quoted. */
export const SOLO_REPAIR_COST_FRACTION = 0.7;

/**
 * Repairs are billed as this many seconds of the production they give back.
 * The single knob for how much weather actually costs — raise it and damage
 * bites harder without touching how often anything breaks.
 *
 * `SOLO_REPAIR_COST_FRACTION` discounts this, so the real payback is about five
 * minutes: the same league as putting the condition right, and near enough to the
 * ladder's own payback that fixing what broke is usually the better buy.
 */
export const REPAIR_SECONDS = 450;

/** No single disaster can break more than this share of a producer type. */
export const SOLO_MAX_BROKEN_SHARE = 0.5;
