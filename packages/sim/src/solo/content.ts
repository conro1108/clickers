/**
 * Content for the solo homestead — a mill you keep, not a match you finish.
 *
 * Deliberately separate from the versus content set. That ladder is tuned so a
 * five-minute match can climb the whole thing; this one is tuned for a run that
 * goes for days and gets reset on purpose. Sharing one table would mean every
 * balance change to either mode silently retunes the other.
 */

import { P, type Puppies } from "../numbers.js";

/**
 * The two places a mill exists in.
 *
 * `outside` is the mill you started with — yard, sky, weather. `inside` is what
 * the Convergence opens: the nest the Ur-Chihuahua burrowed into, which you
 * turn out to have been standing on the whole time. After the fold you own both at once. The outside
 * mill keeps producing whether you're looking at it or not, and the inside is a
 * fresh ladder with its own shop, its own land, and its own picture.
 *
 * `MillState.world` is only ever "which one am I looking at". It has no effect
 * on production — see `currentRate`, which sums the lot.
 */
export type World = "outside" | "inside";

export type SoloProducerId =
  | "pen"
  | "hand"
  | "heatlamp"
  | "van"
  | "groomer"
  | "lab"
  | "kibble"
  | "tower"
  | "zeppelin"
  | "reactor"
  | "orbital"
  | "singularity"
  | "hem"
  | "linthand"
  | "fleece"
  | "well"
  | "seam"
  | "chorus"
  | "heart"
  | "second";

export interface SoloProducer {
  id: SoloProducerId;
  name: string;
  blurb: string;
  /**
   * What a damaged one of these is, and what putting it right is called. A
   * van breaks; a kennel hand doesn't, and a chorus of other yous really
   * doesn't. Reads as "2 maimed" and "Patch up Kennel Hand".
   */
  hurt: string;
  mend: string;
  /** Puppies per second, per unit owned, before any multipliers. */
  baseRate: number;
  baseCost: Puppies;
  /** Cost of the Nth unit is baseCost * growth^N. */
  growth: number;
  /**
   * Which of the two mills it stands on. Everything `inside` is hidden and
   * unbuyable until the Convergence, which is enforced in `applyMillCommand`
   * rather than only in the shop — the sim is the authority on what a mill is
   * allowed to own.
   */
  world: World;
  /**
   * Rate scales with bedding health *as well as* being multiplied by it, so
   * re-bedding is a live decision at the top of the ladder instead of a
   * rounding error. Bedding only moves on weather events and purchases, so this
   * leaves the rate piecewise-constant — which is what the whole offline model
   * rests on.
   */
  beddingScaled?: boolean;
  /** Rate scales with `generation`. Every mill you handed down is still working. */
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
export const SOLO_PRODUCERS: readonly SoloProducer[] = [
  {
    id: "pen",
    name: "Puppy Pen",
    blurb: "A square of yard with a fence round it. Nature does the rest.",
    hurt: "trampled",
    mend: "Re-peg",
    baseRate: 1,
    baseCost: P.of(20),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "hand",
    name: "Kennel Hand",
    blurb: "Pays for themselves. Eventually.",
    hurt: "worn out",
    mend: "Talk round",
    baseRate: 8,
    baseCost: P.of(280),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "heatlamp",
    name: "Heat Lamp",
    blurb: "Warmth, on purpose, at the right time.",
    hurt: "blown",
    mend: "Re-bulb",
    baseRate: 60,
    baseCost: P.of(3_600),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "van",
    name: "Transport Van",
    blurb: "Diesel-powered puppy logistics.",
    hurt: "broken",
    mend: "Repair",
    baseRate: 450,
    baseCost: P.of(52_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "groomer",
    name: "Grooming Rig",
    blurb: "Fluffs a hundred an hour. Do not stand in front of it.",
    hurt: "jammed",
    mend: "Unjam",
    baseRate: 3_400,
    baseCost: P.of(800_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "lab",
    name: "Genetics Lab",
    blurb: "The chihuahuas are asking questions now.",
    hurt: "contaminated",
    mend: "Decontaminate",
    baseRate: 26_000,
    baseCost: P.of(12_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "kibble",
    name: "Kibble Plant",
    blurb: "Puppies in one end, more puppies out the other. Don't ask.",
    hurt: "clogged",
    mend: "Unclog",
    baseRate: 200_000,
    baseCost: P.of(200_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "tower",
    name: "Kennel Tower",
    blurb: "Forty floors of yard-free ambition.",
    hurt: "shorted",
    mend: "Rewire",
    baseRate: 1_500_000,
    baseCost: P.of(3_200_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "zeppelin",
    name: "Kennel Zeppelin",
    blurb: "Weather is a thing that happens below you now. Mostly.",
    hurt: "grounded",
    mend: "Get flying",
    baseRate: 12_000_000,
    baseCost: P.of(50_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "reactor",
    name: "Fusion Whelper",
    blurb: "Binds four small chihuahuas into one enormous one.",
    hurt: "scrammed",
    mend: "Restart",
    baseRate: 90_000_000,
    baseCost: P.of(800_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "orbital",
    name: "Orbital Kennel",
    blurb: "No frost in low earth orbit. Different problems up there.",
    hurt: "holed",
    mend: "Reseal",
    baseRate: 700_000_000,
    baseCost: P.of(13_000_000_000_000),
    growth: 1.19,
    world: "outside",
  },
  {
    id: "singularity",
    name: "Chihuahua Singularity",
    blurb: "Produces chihuahuas that have always already been born.",
    hurt: "collapsed",
    mend: "Re-open",
    baseRate: 5_500_000_000,
    baseCost: P.of(200_000_000_000_000),
    growth: 1.19,
    world: "outside",
  },

  // --- Inside the nest -----------------------------------------------------
  //
  // The second mill, and the reason the Convergence is worth reaching: a ladder
  // of its own, standing in bedding rather than dirt, bought with the puppies
  // the old mill is still turning out while you're down here.
  //
  // It used to be four rungs bolted onto the end of the outside ladder, which
  // made the whole endgame "four more rows in the same shop". Eight now, over
  // the same span from the Chihuahua Singularity to the Second Chihuahua — so
  // no rung moved at either end and the run is the length it always was, but the
  // inside is a climb you can spend time on rather than four purchases. Cost
  // steps by ~3.8x and output by ~2.8x per rung, which keeps payback rising the
  // whole way up exactly as the outside ladder's 14x/8x does.
  //
  // The first one is deliberately affordable more or less on arrival. Walking
  // into a new world and being able to buy the bottom of its shop is the point:
  // it's a place you start over in, not a wing of the old mill.
  //
  // **The ladder is a descent.** Each rung is further in than the one above it,
  // through four strata of two: the hem you came in at, the packed fleece under
  // it, the seams that hold the whole thing together, and the warm at the
  // middle. That buys three things at once — the shop reads as going somewhere,
  // `insideScene` gets a depth to draw instead of five stripes of the same
  // cream, and buying into a new stratum is a small reveal, which the endgame
  // had none of after the fold.
  {
    id: "hem",
    name: "Hem Hollow",
    blurb: "Work a hollow into the hem and it packs down around you. Gather what it pushes out.",
    hurt: "collapsed",
    mend: "Re-line",
    baseRate: 15_000_000_000,
    baseCost: P.of(750_000_000_000_000),
    growth: 1.19,
    world: "inside",
    // The one thing at the top of the ladder that feeds back into the land
    // half, which otherwise caps at four buildings and stops mattering.
    //
    // The calming and the production are the same act rather than two facts
    // about one row: you burrow into the hem, the nest packs down and pushes
    // the loose down out ahead of you, you gather it — and a nest with somebody
    // already settled in it is a nest that turns over less. That's the stirring
    // mitigated by the thing that feeds you.
    calmPerUnit: 0.004,
  },
  {
    id: "linthand",
    name: "Lint Hand",
    // The inside's Kennel Hand, and deliberately at the same height on the
    // ladder: outside, rung 2 is the first people you hire, and it's most of
    // what makes that mill feel worked rather than automated. The inside had no
    // people until the Chorus at rung 6 — three quarters of the way up a ladder
    // that takes days — so for almost the whole descent the place was machinery
    // running in an empty building. Cheap and early is the whole point.
    blurb: "Someone has to be down here with you. They bring their own torch.",
    hurt: "trapped",
    mend: "Pull out",
    baseRate: 42_000_000_000,
    baseCost: P.of(2_800_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "fleece",
    name: "Fleece Face",
    blurb: "Past the hem it goes solid. Cut a face into it and work back.",
    hurt: "caved in",
    mend: "Shore up",
    baseRate: 120_000_000_000,
    baseCost: P.of(10_600_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "well",
    name: "Down Well",
    blurb: "Sunk through the packed fleece. It fills from the yard you left up top.",
    hurt: "run dry",
    mend: "Re-bore",
    baseRate: 340_000_000_000,
    baseCost: P.of(40_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
    // A well is bedding-scaled with the reason drawn on it: it fills from
    // above, and above is the mill you left standing on its own ground. Let
    // that bedding go and the wells come up short, which is what puts the yard
    // back on the table at the top of the ladder.
    beddingScaled: true,
  },
  {
    id: "seam",
    name: "Seam Main",
    blurb: "Under the fleece it is all seams. Unpick one and it feeds you instead.",
    hurt: "split",
    mend: "Restitch",
    baseRate: 960_000_000_000,
    baseCost: P.of(150_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "chorus",
    name: "Chorus",
    blurb: "The other yous, still working. Down here you can hear them.",
    hurt: "silenced",
    mend: "Call back",
    baseRate: 2_700_000_000_000,
    baseCost: P.of(560_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
    generationScaled: true,
  },
  {
    id: "heart",
    name: "Warm Heart",
    blurb: "Every nest has a warm spot at the middle. Something has to be in it.",
    hurt: "gone cold",
    mend: "Warm through",
    baseRate: 7_700_000_000_000,
    baseCost: P.of(2_100_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
  {
    id: "second",
    name: "Second Chihuahua",
    blurb: "Curled in the warm spot. Nobody has asked what it is curled around.",
    hurt: "gone quiet",
    mend: "Tend",
    baseRate: 22_000_000_000_000,
    baseCost: P.of(8_000_000_000_000_000_000),
    growth: 1.19,
    world: "inside",
  },
];

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
   * Ties whistling to the mill you've built: a whistle is worth this many seconds of
   * production. Without it, clicking is dead weight within the first hour and
   * the game stops having a verb.
   *
   * The seconds are deliberately fractional. This effect is a feedback loop —
   * income scales with the rate it's spent on — so at a whole second per whistle a
   * player clicking twice a second is worth twice the entire mill, and the
   * whole ladder falls over in half an hour. Everything here is meant to sum to
   * a couple of seconds at most, even fully perked.
   */
  | { kind: "click_from_rate"; seconds: number };

export interface SoloUpgrade {
  id: string;
  name: string;
  blurb: string;
  cost: Puppies;
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
function fleetCost(id: SoloProducerId, count: number, share = 1): Puppies {
  const prod = SOLO_PRODUCERS.find((p) => p.id === id)!;
  const units = (Math.pow(prod.growth, count) - 1) / (prod.growth - 1);
  return P.of(Math.ceil(prod.baseCost * units * share));
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
  const naming: Record<SoloProducerId, [string, string, string]> = {
    pen: ["Straw Bedding", "Underfloor Heating", "Show Lineage"],
    hand: ["Overtime Pay", "Profit Sharing", "Equity Stake"],
    heatlamp: ["Ceramic Bulbs", "Thermostats", "Whole-Yard Radiant"],
    van: ["Turbo Diesel", "Air Suspension", "Six Wheels"],
    groomer: ["Wider Head", "Night Shift", "Twin Drums"],
    lab: ["Peer Review", "Tenure", "The Prize"],
    kibble: ["Twin Extruders", "Continuous Flow", "Own Rendering Line"],
    tower: ["Express Lifts", "Kennel Telemetry", "Sky Lobby"],
    zeppelin: ["Helium Refit", "Jet Stream Permit", "Above the Weather"],
    reactor: ["Magnetic Confinement", "Tritium Blanket", "Ignition"],
    orbital: ["Solar Sails", "Second Belt", "Lagrange Station"],
    singularity: ["Closed Timelike Litter", "Retroactive Yield", "Event Horizon Lease"],
    hem: ["Deeper Burrow", "It Packs Faster", "It Stops Minding"],
    linthand: ["Second Shift", "Danger Money", "They Live Down Here Now"],
    fleece: ["Longwall Cut", "Deep Adit", "The Face Goes Down"],
    well: ["Deeper Bore", "Yard Drainage", "It Never Runs Dry"],
    seam: ["Longer Stitch", "Unpick It All", "The Whole Seam"],
    chorus: ["Perfect Unison", "Every Generation", "All At Once"],
    heart: ["Bank the Warm", "Warm Through", "It Was Always Warm"],
    second: ["Breeding Stock", "It's Started", "It's Awake"],
  };
  const out: SoloUpgrade[] = [];
  for (const prod of SOLO_PRODUCERS) {
    const [first, second, third] = naming[prod.id];
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

const CLICK_UPGRADES: SoloUpgrade[] = [
  {
    id: "silver_whistle",
    name: "Silver Whistle",
    blurb: "Whistling, but with intent. Whistles x3.",
    cost: P.of(100),
    effect: { kind: "click_mult", factor: 3 },
  },
  {
    id: "two_tone_whistle",
    name: "Two-Tone Whistle",
    blurb: "Both fingers. Whistles x5.",
    cost: fleetCost("hand", 5),
    effect: { kind: "click_mult", factor: 5 },
    requires: { producer: "hand", count: 5 },
  },
  {
    id: "gold_whistle",
    name: "Ceremonial Gold Whistle",
    blurb: "Impractical. Effective. Whistles x8.",
    cost: fleetCost("van", 10),
    effect: { kind: "click_mult", factor: 8 },
    requires: { producer: "van", count: 10 },
  },
  {
    id: "treats",
    name: "Pocketful of Treats",
    blurb: "Each whistle is also worth 0.25 seconds of production.",
    cost: fleetCost("lab", 5, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.25 },
    requires: { producer: "lab", count: 5 },
  },
  {
    id: "squeaker",
    name: "The Squeaky Toy",
    blurb: "Each whistle is worth 0.5 more seconds of production.",
    cost: fleetCost("tower", 10, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.5 },
    requires: { producer: "tower", count: 10 },
  },
  {
    id: "big_lap",
    name: "The Big Lap",
    blurb: "Each whistle is worth 0.75 more seconds of production.",
    cost: fleetCost("orbital", 10, 1.5),
    effect: { kind: "click_from_rate", seconds: 0.75 },
    requires: { producer: "orbital", count: 10 },
  },
];

/**
 * Global multipliers deliberately kept modest, and deliberately **dear**.
 *
 * Two separate knobs, and they got out of step. The factor is small — 1.3 to 2,
 * where an early draft had a x2/x3/x5 chain that evaporated a week-long run in
 * an afternoon. But the *price* had drifted down to a few hundred seconds of
 * production, so the thing that permanently lifts every rung of the ladder at
 * once cost less than the rung you were standing on. These are now priced in the
 * thousands of seconds each: a global is something you stop and save for, on
 * roughly the scale the Ur-Chihuahua always was, and passing one over to keep
 * climbing has to be a real option.
 *
 * The shares below look arbitrary because they are: each is tuned so the upgrade
 * lands in that band at the moment its gate opens, and the fleet it's quoted
 * against sits at wildly different points on the curve from one rung to the next.
 * `solo.test.ts` holds the floor; `probe` in this package's history is how the
 * band was measured.
 */
const GLOBAL_UPGRADES: SoloUpgrade[] = [
  {
    id: "better_kibble",
    name: "Better Kibble",
    blurb: "Everything produces +30%.",
    cost: fleetCost("hand", 15, 340),
    effect: { kind: "global_mult", factor: 1.3 },
    requires: { producer: "hand", count: 15 },
  },
  {
    id: "rest_rotation",
    name: "Rest Rotation",
    blurb: "Everything produces +30%.",
    cost: fleetCost("heatlamp", 25, 190),
    effect: { kind: "global_mult", factor: 1.3 },
    requires: { producer: "heatlamp", count: 25 },
  },
  {
    id: "designer_genes",
    name: "Designer Genes",
    blurb: "Everything produces +50%. Don't read the label.",
    cost: fleetCost("groomer", 20, 42),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "groomer", count: 20 },
  },
  {
    id: "co_op",
    name: "Breeders' Co-op",
    blurb: "Everything produces +50%.",
    cost: fleetCost("kibble", 25, 14),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "kibble", count: 25 },
  },
  {
    id: "kennel_club",
    name: "Kennel Club Charter",
    blurb: "Everything produces +50%. Paperwork was involved.",
    cost: fleetCost("zeppelin", 25, 5),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "zeppelin", count: 25 },
  },
  {
    id: "monopoly",
    name: "Vertical Integration",
    blurb: "Everything produces x2.",
    cost: fleetCost("reactor", 25, 3),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "reactor", count: 25 },
  },
  {
    id: "habitat_charter",
    name: "Habitat Charter",
    blurb: "Everything produces x2.",
    cost: fleetCost("orbital", 25, 6),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "orbital", count: 25 },
  },
  /**
   * The Convergence, on a button the player chose to press.
   *
   * Gated at ten Chihuahua Singularities rather than twenty-five, which is what
   * pulls the endgame from five days of play to three and puts the fold inside
   * a single dedicated first run — the constraint the whole endgame design is
   * binding on. It still costs about a thousand seconds of production at the
   * moment it's bought, which is the same league as the other late globals and
   * well clear of the sixty-second floor `solo.test.ts` guards.
   */
  {
    id: "ur_chihuahua",
    name: "The Ur-Chihuahua",
    /**
     * The only upgrade in the game that doesn't say what it does.
     *
     * Every other blurb is a price tag's other half — you read the number, you
     * read the multiplier, you decide. This one isn't a decision, and quoting
     * "everything produces x2" next to it puts it back on the same shelf as
     * Fertilizer at the exact moment the game most needs it off that shelf.
     * It still doubles everything; the shop just doesn't lead with it.
     */
    blurb: "The first chihuahua. Everything since has been a copy.",
    cost: fleetCost("singularity", 10),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "singularity", count: 10 },
  },
  {
    id: "ceiling_rights",
    name: "Right of Way Down",
    blurb: "Nothing between you and the middle of it. Everything produces x2.",
    cost: fleetCost("hem", 25, 5),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "hem", count: 25 },
  },
  {
    id: "deep_rights",
    name: "Deed to the Deep",
    blurb: "Whatever's further down was always yours. Everything produces x2.",
    cost: fleetCost("well", 25, 9),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "well", count: 25 },
  },
  {
    id: "unbroken_line",
    name: "Unbroken Line",
    blurb: "Nobody has stopped breeding. Everything produces x2.",
    cost: fleetCost("chorus", 25, 2),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "chorus", count: 25 },
  },
  {
    id: "third_chihuahua",
    name: "The Third Chihuahua",
    blurb: "Everything produces x2. Try not to work out where it is.",
    cost: fleetCost("second", 25),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "second", count: 25 },
  },
];

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
  | "padded_seams"
  | "lullaby_rig"
  | "fresh_ticking"
  | "lint_reclaim";

export type LandRole =
  /** Cuts how many units a disaster knocks offline. */
  | "breakage"
  /** Cuts how much bedding health a disaster costs you. */
  | "bedding"
  /** Stretches the gap between disasters. */
  | "frequency"
  /** Pays out puppies when something goes wrong. */
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
  baseCost: Puppies;
  growth: number;
  /**
   * Which mill it defends. The `inside` set is only buildable once the world has
   * folded, and it's what the inside's Upkeep panel sells instead of the four
   * that are about a sky.
   */
  world: World;
}

export const LANDS: readonly Land[] = [
  {
    id: "windbreak",
    name: "Windbreak",
    blurb: "A wall of poplars. Storms take less of the kit.",
    role: "breakage",
    perLevel: 0.14,
    baseCost: P.of(600),
    growth: 1.9,
    world: "outside",
  },
  {
    id: "drainage",
    name: "Drainage Ditches",
    blurb: "Water leaves instead of sitting there rotting the bedding.",
    role: "bedding",
    perLevel: 0.14,
    baseCost: P.of(2_500),
    growth: 1.9,
    world: "outside",
  },
  {
    id: "pest_control",
    name: "Pest Control Contract",
    blurb: "Someone else's problem now. Trouble comes around less often.",
    role: "frequency",
    perLevel: 0.1,
    baseCost: P.of(9_000),
    growth: 2.1,
    world: "outside",
  },
  {
    id: "insurance",
    name: "Kennel Insurance",
    blurb: "Doesn't stop anything. Does cut you a cheque afterwards.",
    role: "payout",
    perLevel: 0.12,
    baseCost: P.of(40_000),
    growth: 1.9,
    world: "outside",
  },
  // Inside the nest there is no sky, so the four above stop being about
  // weather and the four below are what the second axis gets instead. Same
  // roles, one for one, priced at the scale of the mill that can see them: the
  // first level of any of them is a few minutes of production at the moment the
  // world folds.
  {
    id: "padded_seams",
    name: "Padded Seams",
    blurb: "Let the nest close where it wants to. It swallows less of the kit.",
    role: "breakage",
    perLevel: 0.13,
    baseCost: P.of(500_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
  {
    id: "fresh_ticking",
    name: "Fresh Ticking",
    blurb: "Re-line it before it goes. What's underneath keeps its warmth.",
    role: "bedding",
    perLevel: 0.13,
    baseCost: P.of(800_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
  {
    id: "lullaby_rig",
    name: "Lullaby Rig",
    blurb: "Convinces it that it is three in the morning. It stirs less often.",
    role: "frequency",
    perLevel: 0.09,
    baseCost: P.of(1_500_000_000_000_000),
    growth: 2.1,
    world: "inside",
  },
  {
    id: "lint_reclaim",
    name: "Lint Reclamation",
    blurb: "Whatever it sheds when it turns over, you catch and sell.",
    role: "payout",
    perLevel: 0.12,
    baseCost: P.of(3_000_000_000_000_000),
    growth: 1.9,
    world: "inside",
  },
];

/** The buildings that defend one mill or the other. */
export function landsIn(world: World): readonly Land[] {
  return LANDS.filter((l) => l.world === world);
}

export const LAND_BY_ID: Record<LandId, Land> = Object.fromEntries(
  LANDS.map((l) => [l.id, l]),
) as Record<LandId, Land>;

/** However much land you buy, weather still gets through this much. */
export const MAX_MITIGATION = 0.85;

// ---------------------------------------------------------------------------
// Bedding, damage, and the cost of putting things right.
// ---------------------------------------------------------------------------

/** Base puppies per whistle, before any multipliers. */
export const SOLO_BASE_CLICK = P.of(1);

/**
 * Bedding health multiplies your whole mill and only ever goes down on its own.
 * Nothing brings it back but spending — that's the "force of nature" bargain:
 * the land degrades, and staying productive means paying to hold it steady.
 */
export const MAX_BEDDING = 1;

/** Floor on bedding health, so a long time away is a setback and never a wipe. */
export const MIN_BEDDING = 0.25;

/**
 * Restoring bedding is priced against your production rate rather than a fixed
 * table, so it stays a real decision at every scale instead of becoming free
 * the moment you out-grow it.
 *
 * The number is a payback time: fresh bedding buys back its own price in this
 * many seconds. What it competes with is the next rung of the ladder, and that
 * pays back in one to five minutes for most of a run — so anything much above
 * five minutes here is a button no one should ever press, which is what twenty
 * minutes was. It also has to stay in the same league as `REPAIR_SECONDS`, or
 * the two halves of the same mechanic quote different prices for the same lost
 * puppy.
 */
export const BEDDING_RESTORE_SECONDS = 300;

/** Discount on the quoted repair price. See `repairCost` for what's quoted. */
export const SOLO_REPAIR_COST_FRACTION = 0.7;

/**
 * Repairs are billed as this many seconds of the production they give back.
 * The single knob for how much weather actually costs — raise it and damage
 * bites harder without touching how often anything breaks.
 *
 * `SOLO_REPAIR_COST_FRACTION` discounts this, so the real payback is about five
 * minutes: the same league as putting the bedding right, and near enough to the
 * ladder's own payback that fixing what broke is usually the better buy.
 */
export const REPAIR_SECONDS = 450;

/** No single disaster can break more than this share of a producer type. */
export const SOLO_MAX_BROKEN_SHARE = 0.5;
