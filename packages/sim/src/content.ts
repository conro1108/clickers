import { Y, seconds, type Yield } from "./numbers.js";
import { named, THEME, type Shape } from "./theme.js";

export type ProducerId =
  | "patch"
  | "hand"
  | "rig"
  | "hauler"
  | "machine"
  | "lab";

export interface Producer {
  id: ProducerId;
  name: string;
  blurb: string;
  /** Reads as "2 worn out" / "Talk round Hand". */
  hurt: string;
  mend: string;
  baseRate: number;
  baseCost: Yield;
  growth: number;
}

// Tuned for a match in minutes: each tier pays for itself in ~12-28s, rising with tier.
const PRODUCER_SHAPES: readonly Shape<Producer>[] = [
  {
    id: "patch",
    baseRate: 1.25,
    baseCost: Y.of(15),
    growth: 1.12,
  },
  {
    id: "hand",
    baseRate: 9,
    baseCost: Y.of(110),
    growth: 1.12,
  },
  {
    id: "rig",
    baseRate: 65,
    baseCost: Y.of(800),
    growth: 1.12,
  },
  {
    id: "hauler",
    baseRate: 480,
    baseCost: Y.of(6_000),
    growth: 1.12,
  },
  {
    id: "machine",
    baseRate: 3_500,
    baseCost: Y.of(45_000),
    growth: 1.12,
  },
  {
    id: "lab",
    baseRate: 26_000,
    baseCost: Y.of(340_000),
    growth: 1.12,
  },
];

export const PRODUCERS: readonly Producer[] = named(PRODUCER_SHAPES, THEME.producers, "producer");

export const PRODUCER_BY_ID: Record<ProducerId, Producer> = Object.fromEntries(
  PRODUCERS.map((p) => [p.id, p]),
) as Record<ProducerId, Producer>;

// --- Production upgrades ---

export type UpgradeId =
  | "tool_1"
  | "tool_2"
  | "tool_3"
  | "boost_1"
  | "boost_2"
  | "boost_3"
  | "mult_patch"
  | "mult_hand"
  | "mult_rig"
  | "mult_hauler";

export type UpgradeEffect =
  | { kind: "click_mult"; factor: number }
  | { kind: "global_mult"; factor: number }
  | { kind: "producer_mult"; producer: ProducerId; factor: number };

export interface Upgrade {
  id: UpgradeId;
  name: string;
  blurb: string;
  cost: Yield;
  effect: UpgradeEffect;
  requires?: { producer: ProducerId; count: number };
}

const UPGRADE_SHAPES: readonly Shape<Upgrade>[] = [
  {
    id: "tool_1",
    cost: Y.of(100),
    effect: { kind: "click_mult", factor: 3 },
  },
  {
    id: "tool_2",
    cost: Y.of(2_000),
    effect: { kind: "click_mult", factor: 5 },
    requires: { producer: "hand", count: 5 },
  },
  {
    id: "tool_3",
    cost: Y.of(120_000),
    effect: { kind: "click_mult", factor: 8 },
    requires: { producer: "hauler", count: 10 },
  },
  {
    id: "mult_patch",
    cost: Y.of(500),
    effect: { kind: "producer_mult", producer: "patch", factor: 2 },
    requires: { producer: "patch", count: 10 },
  },
  {
    id: "mult_hand",
    cost: Y.of(3_500),
    effect: { kind: "producer_mult", producer: "hand", factor: 2 },
    requires: { producer: "hand", count: 10 },
  },
  {
    id: "boost_1",
    cost: Y.of(12_000),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "hand", count: 15 },
  },
  {
    id: "mult_rig",
    cost: Y.of(30_000),
    effect: { kind: "producer_mult", producer: "rig", factor: 2 },
    requires: { producer: "rig", count: 10 },
  },
  {
    id: "boost_2",
    cost: Y.of(90_000),
    effect: { kind: "global_mult", factor: 1.5 },
    requires: { producer: "rig", count: 15 },
  },
  {
    id: "mult_hauler",
    cost: Y.of(200_000),
    effect: { kind: "producer_mult", producer: "hauler", factor: 2 },
    requires: { producer: "hauler", count: 10 },
  },
  {
    id: "boost_3",
    cost: Y.of(900_000),
    effect: { kind: "global_mult", factor: 2 },
    requires: { producer: "machine", count: 10 },
  },
];

export const UPGRADES: readonly Upgrade[] = named(UPGRADE_SHAPES, THEME.upgrades, "upgrade");

export const UPGRADE_BY_ID: Record<UpgradeId, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
) as Record<UpgradeId, Upgrade>;

// --- Sabotage --- `power` is weighed against the defender's shield pool

export type AttackId = "vermin" | "disease" | "swelter" | "rot" | "sweep";

export type BreakScope = "best" | "cheapest" | "all";

export type AttackEffect =
  /** Broken units stay broken until repaired; `share` of targeted units, floored at 1. */
  | { kind: "break"; share: number; scope: BreakScope }
  | { kind: "slow"; cut: number; durationMs: number };

export interface Attack {
  id: AttackId;
  name: string;
  blurb: string;
  power: number;
  baseCost: Yield;
  /** Per point of target rate — flat-priced sabotage makes hitting the leader strictly better than growing. */
  costPerRate: number;
  growth: number;
  effect: AttackEffect;
}

const ATTACK_SHAPES: readonly Shape<Attack>[] = [
  {
    id: "vermin",
    power: 40,
    baseCost: Y.of(200),
    costPerRate: 0.15,
    growth: 1.3,
    effect: { kind: "break", share: 0.28, scope: "cheapest" },
  },
  {
    id: "disease",
    power: 110,
    baseCost: Y.of(1_200),
    costPerRate: 1,
    growth: 1.3,
    effect: { kind: "break", share: 0.28, scope: "best" },
  },
  {
    id: "swelter",
    power: 260,
    baseCost: Y.of(6_000),
    costPerRate: 3,
    growth: 1.35,
    effect: { kind: "slow", cut: 0.55, durationMs: seconds(40) },
  },
  {
    id: "rot",
    power: 420,
    baseCost: Y.of(30_000),
    costPerRate: 1.75,
    growth: 1.35,
    effect: { kind: "break", share: 0.46, scope: "best" },
  },
  {
    id: "sweep",
    power: 750,
    baseCost: Y.of(150_000),
    costPerRate: 2.2,
    growth: 1.4,
    effect: { kind: "break", share: 0.35, scope: "all" },
  },
];

export const ATTACKS: readonly Attack[] = named(ATTACK_SHAPES, THEME.attacks, "attack");

export const ATTACK_BY_ID: Record<AttackId, Attack> = Object.fromEntries(
  ATTACKS.map((a) => [a.id, a]),
) as Record<AttackId, Attack>;

// --- Defense --- `power` is an absorb pool, not a flag

export type DefenseId = "ward" | "fence" | "shelter" | "insurance";

export interface Defense {
  id: DefenseId;
  name: string;
  blurb: string;
  power: number;
  durationMs: number;
  baseCost: Yield;
  growth: number;
}

const DEFENSE_SHAPES: readonly Shape<Defense>[] = [
  {
    id: "ward",
    power: 60,
    durationMs: seconds(90),
    baseCost: Y.of(300),
    growth: 1.35,
  },
  {
    id: "fence",
    power: 200,
    durationMs: seconds(120),
    baseCost: Y.of(3_000),
    growth: 1.35,
  },
  {
    id: "shelter",
    power: 550,
    durationMs: seconds(150),
    baseCost: Y.of(22_000),
    growth: 1.4,
  },
  {
    id: "insurance",
    power: 1_400,
    durationMs: seconds(180),
    baseCost: Y.of(150_000),
    growth: 1.4,
  },
];

export const DEFENSES: readonly Defense[] = named(DEFENSE_SHAPES, THEME.defenses, "defense");

export const DEFENSE_BY_ID: Record<DefenseId, Defense> = Object.fromEntries(
  DEFENSES.map((d) => [d.id, d]),
) as Record<DefenseId, Defense>;

// --- Constants ---

export const BASE_CLICK = Y.of(1);

// No knockouts (see docs/design.md): floor on stacked slows, cap on breakage per producer type.
export const MIN_RATE_MULTIPLIER = 0.15;

export const MAX_BROKEN_SHARE = 0.6;

// Share of the fresh-buy price at current count.
export const REPAIR_COST_FRACTION = 0.75;
