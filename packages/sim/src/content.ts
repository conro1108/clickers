import { P, seconds, type Puppies } from "./numbers.js";

export type ProducerId =
  | "pen"
  | "hand"
  | "heatlamp"
  | "van"
  | "groomer"
  | "lab";

export interface Producer {
  id: ProducerId;
  name: string;
  blurb: string;
  /**
   * What a damaged one of these is, and what putting it right is called. Kept
   * per-producer because a van breaks and a kennel hand doesn't. Reads as
   * "2 worn out" and "Talk round Kennel Hand".
   */
  hurt: string;
  mend: string;
  /** Puppies per second, per unit owned, before multipliers. */
  baseRate: number;
  baseCost: Puppies;
  /** Cost of the Nth unit is baseCost * growth^N. */
  growth: number;
}

/**
 * Tuned for a match measured in minutes, not the weeks a solo idle game gets.
 * Each tier pays for itself in roughly 12-28 seconds (rising with tier, so the
 * cheap rungs stay worth buying), which is what lets a match climb through the
 * whole tree before the clock runs out. `packages/sim/src/balance.test.ts` is
 * the check on this — retune here, run that.
 */
export const PRODUCERS: readonly Producer[] = [
  {
    id: "pen",
    name: "Puppy Pen",
    blurb: "A square of yard with a fence round it. Nature does the rest.",
    hurt: "trampled",
    mend: "Re-peg",
    baseRate: 1.25,
    baseCost: P.of(15),
    growth: 1.12,
  },
  {
    id: "hand",
    name: "Kennel Hand",
    blurb: "Pays for themselves. Eventually.",
    hurt: "worn out",
    mend: "Talk round",
    baseRate: 9,
    baseCost: P.of(110),
    growth: 1.12,
  },
  {
    id: "heatlamp",
    name: "Heat Lamp",
    blurb: "Warmth, on purpose, at the right time.",
    hurt: "blown",
    mend: "Re-bulb",
    baseRate: 65,
    baseCost: P.of(800),
    growth: 1.12,
  },
  {
    id: "van",
    name: "Transport Van",
    blurb: "Diesel-powered puppy logistics.",
    hurt: "broken",
    mend: "Repair",
    baseRate: 480,
    baseCost: P.of(6_000),
    growth: 1.12,
  },
  {
    id: "groomer",
    name: "Grooming Rig",
    blurb: "Fluffs a hundred an hour. Do not stand in front of it.",
    hurt: "jammed",
    mend: "Unjam",
    baseRate: 3_500,
    baseCost: P.of(45_000),
    growth: 1.12,
  },
  {
    id: "lab",
    name: "Genetics Lab",
    blurb: "The chihuahuas are asking questions now.",
    hurt: "contaminated",
    mend: "Decontaminate",
    baseRate: 26_000,
    baseCost: P.of(340_000),
    growth: 1.12,
  },
];

export const PRODUCER_BY_ID: Record<ProducerId, Producer> = Object.fromEntries(
  PRODUCERS.map((p) => [p.id, p]),
) as Record<ProducerId, Producer>;

// ---------------------------------------------------------------------------
// Production upgrades — one-time buys, the classic ladder.
// ---------------------------------------------------------------------------

export type UpgradeId =
  | "silver_whistle"
  | "two_tone_whistle"
  | "gold_whistle"
  | "better_kibble"
  | "rest_rotation"
  | "designer_genes"
  | "straw_bedding"
  | "overtime_pay"
  | "ceramic_bulbs"
  | "turbo_diesel";

export type UpgradeEffect =
  | { kind: "click_mult"; factor: number }
  | { kind: "global_mult"; factor: number }
  | { kind: "producer_mult"; producer: ProducerId; factor: number };

export interface Upgrade {
  id: UpgradeId;
  name: string;
  blurb: string;
  cost: Puppies;
  effect: UpgradeEffect;
  /** Hidden until the player owns this many of the producer. */
  requires?: { producer: ProducerId; count: number };
}

export const UPGRADES: readonly Upgrade[] = [
  {
    id: "silver_whistle",
    name: "Silver Whistle",
    blurb: "Whistling, but with intent. Clicks x3.",
    cost: P.of(100),
    effect: { kind: "click_mult", factor: 3 },
  },
  {
    id: "two_tone_whistle",
    name: "Two-Tone Whistle",
    blurb: "Both fingers. Clicks x5.",
    cost: P.of(2_000),
    effect: { kind: "click_mult", factor: 5 },
    requires: { producer: "hand", count: 5 },
  },
  {
    id: "gold_whistle",
    name: "Ceremonial Gold Whistle",
    blurb: "Impractical. Effective. Clicks x8.",
    cost: P.of(120_000),
    effect: { kind: "click_mult", factor: 8 },
    requires: { producer: "van", count: 10 },
  },
  {
    id: "straw_bedding",
    name: "Straw Bedding",
    blurb: "Pens produce twice as much.",
    cost: P.of(500),
    effect: { kind: "producer_mult", producer: "pen", factor: 2 },
    requires: { producer: "pen", count: 10 },
  },
  {
    id: "overtime_pay",
    name: "Overtime Pay",
    blurb: "Kennel Hands produce twice as much.",
    cost: P.of(3_500),
    effect: { kind: "producer_mult", producer: "hand", factor: 2 },
    requires: { producer: "hand", count: 10 },
  },
  {
    id: "better_kibble",
    name: "Better Kibble",
    blurb: "All producers +50%.",
    cost: P.of(12_000),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "hand", count: 15 },
  },
  {
    id: "ceramic_bulbs",
    name: "Ceramic Bulbs",
    blurb: "Heat lamps produce twice as much.",
    cost: P.of(30_000),
    effect: { kind: "producer_mult", producer: "heatlamp", factor: 2 },
    requires: { producer: "heatlamp", count: 10 },
  },
  {
    id: "rest_rotation",
    name: "Rest Rotation",
    blurb: "All producers +50%.",
    cost: P.of(90_000),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "heatlamp", count: 15 },
  },
  {
    id: "turbo_diesel",
    name: "Turbo Diesel",
    blurb: "Vans produce twice as much.",
    cost: P.of(200_000),
    effect: { kind: "producer_mult", producer: "van", factor: 2 },
    requires: { producer: "van", count: 10 },
  },
  {
    id: "designer_genes",
    name: "Designer Genes",
    blurb: "All producers x2. Don't read the label.",
    cost: P.of(900_000),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "groomer", count: 10 },
  },
];

export const UPGRADE_BY_ID: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
) as Record<UpgradeId, Upgrade>;

// ---------------------------------------------------------------------------
// Sabotage. `power` is what gets weighed against a defender's shield pool —
// a defense with at least this much left absorbs the attack outright.
// ---------------------------------------------------------------------------

export type AttackId = "foxes" | "cough" | "heatwave" | "bedding_rot" | "inspection";

/**
 * Which producers a breakage attack goes for.
 * - `best`: their biggest earner, where it hurts most.
 * - `cheapest`: their entry-tier stuff — early harassment.
 * - `all`: a slice off every type they own.
 */
export type BreakScope = "best" | "cheapest" | "all";

export type AttackEffect =
  /**
   * Breaks producer units. Broken units stay broken and produce nothing until
   * the owner spends on repairs — the damage compounds instead of timing out,
   * which is the whole reason to attack before the last minute of a match.
   */
  | { kind: "break"; /** Fraction of the targeted units, floored at 1. */ share: number; scope: BreakScope }
  /** Cuts total output by `cut` (0..1) for a while. Weather passes; pests don't. */
  | { kind: "slow"; cut: number; durationMs: number };

export interface Attack {
  id: AttackId;
  name: string;
  blurb: string;
  power: number;
  /** Floor price, and what you pay while the target is still small. */
  baseCost: Puppies;
  /**
   * Puppies charged per point of the target's production rate. Sabotage that
   * costs a flat price does damage proportional to how big the target is, which
   * makes hitting a leader wildly better value than growing — the one outcome
   * that collapses the spend-on-yourself-vs-spend-on-them choice. Pricing the
   * swing against the mill you're swinging at is what keeps it a real trade.
   */
  costPerRate: number;
  /** Repeat use gets pricier on top of that. */
  growth: number;
  effect: AttackEffect;
}

export const ATTACKS: readonly Attack[] = [
  {
    id: "foxes",
    name: "Foxes",
    blurb: "Goes through their cheap stuff. Stays gone through.",
    power: 40,
    baseCost: P.of(200),
    costPerRate: 0.15,
    growth: 1.3,
    effect: { kind: "break", share: 0.28, scope: "cheapest" },
  },
  {
    id: "cough",
    name: "Kennel Cough",
    blurb: "Runs through a chunk of their best producer. Needs seeing to.",
    power: 110,
    baseCost: P.of(1_200),
    costPerRate: 1,
    growth: 1.3,
    effect: { kind: "break", share: 0.28, scope: "best" },
  },
  {
    id: "heatwave",
    name: "Heatwave",
    blurb: "-55% output for 40s. Passes on its own.",
    power: 260,
    baseCost: P.of(6_000),
    costPerRate: 3,
    growth: 1.35,
    effect: { kind: "slow", cut: 0.55, durationMs: seconds(40) },
  },
  {
    id: "bedding_rot",
    name: "Ruined Bedding",
    blurb: "Wrecks half their best producer.",
    power: 420,
    baseCost: P.of(30_000),
    costPerRate: 1.75,
    growth: 1.35,
    effect: { kind: "break", share: 0.46, scope: "best" },
  },
  {
    id: "inspection",
    name: "Surprise Inspection",
    blurb: "Takes a slice of everything they own. Paperwork for days.",
    power: 750,
    baseCost: P.of(150_000),
    costPerRate: 2.2,
    growth: 1.4,
    effect: { kind: "break", share: 0.35, scope: "all" },
  },
];

export const ATTACK_BY_ID: Record<AttackId, Attack> = Object.fromEntries(
  ATTACKS.map((a) => [a.id, a]),
) as Record<AttackId, Attack>;

// ---------------------------------------------------------------------------
// Defense. `power` is an absorb pool, not a flag: it soaks incoming attack
// power until it runs dry or the window closes.
// ---------------------------------------------------------------------------

export type DefenseId = "guard_dog" | "fence" | "quarantine" | "insurance";

export interface Defense {
  id: DefenseId;
  name: string;
  blurb: string;
  power: number;
  durationMs: number;
  baseCost: Puppies;
  growth: number;
}

export const DEFENSES: readonly Defense[] = [
  {
    id: "guard_dog",
    name: "Guard Dog",
    blurb: "Absorbs 60 power for 90s.",
    power: 60,
    durationMs: seconds(90),
    baseCost: P.of(300),
    growth: 1.35,
  },
  {
    id: "fence",
    name: "Electric Fence",
    blurb: "Absorbs 200 power for 2m.",
    power: 200,
    durationMs: seconds(120),
    baseCost: P.of(3_000),
    growth: 1.35,
  },
  {
    id: "quarantine",
    name: "Quarantine Barn",
    blurb: "Absorbs 550 power for 2m30s.",
    power: 550,
    durationMs: seconds(150),
    baseCost: P.of(22_000),
    growth: 1.4,
  },
  {
    id: "insurance",
    name: "Kennel Insurance",
    blurb: "Absorbs 1400 power for 3m.",
    power: 1_400,
    durationMs: seconds(180),
    baseCost: P.of(150_000),
    growth: 1.4,
  },
];

export const DEFENSE_BY_ID: Record<DefenseId, Defense> = Object.fromEntries(
  DEFENSES.map((d) => [d.id, d]),
) as Record<DefenseId, Defense>;

// ---------------------------------------------------------------------------

/** Base puppies per click, before click multipliers. */
export const BASE_CLICK = P.of(1);

/**
 * No knockouts (VISION.md): stacked sabotage can never take a mill below this
 * fraction of its clean rate.
 */
export const MIN_RATE_MULTIPLIER = 0.15;

/**
 * And breakage can never take more than this share of a producer type you own,
 * so no single hit can flatten a mill however far ahead the attacker is.
 */
export const MAX_BROKEN_SHARE = 0.6;

/**
 * Repairing costs this share of what those units would cost to buy fresh at
 * your current count. Cheaper than rebuilding, so damage is a tax on your
 * momentum rather than a wipe — but it's still puppies that didn't compound.
 */
export const REPAIR_COST_FRACTION = 0.75;
