/** The homestead, drawn: a low-res buffer scaled up by CSS `image-rendering: pixelated`, own rAF loop.
 * RENDERING RULE: every blit is integer-aligned and unscaled — no ctx.scale/rotate; animation is translation only. */

import type { solo } from "@clickers/sim";

import {
  CLOUD,
  BALL,
  BOWL,
  BOWL_RED,
  BUNTING,
  FENCE,
  FLAG,
  KENNEL_HAND,
  HEART,
  growthStages,
  FLOWERS,
  LAMP,
  LAMP_ON,
  PACK_COATS,
  PACK_POSES,
  POSE,
  PUPPY_SPRITE,
  PRODUCER_MARKS,
  BASKET,
  shrunk,
  TREE,
  TUFT,
  ZZZ,
  scruffy,
} from "./art.js";
import { artCanvas, artTinted, type Art } from "./pixel.js";

export const SCENE_W = 176;

const YARD_SHARE = 0.23; // the puppy field, front band — deep enough for a few rows of dogs
const FIELD_SHARE = 0.46; // the working field
const MIN_SKY = 20;

const INK = "#402e3a";

/** Must match the flesh colours in `insideScene.ts`, or the sky omen promises the wrong thing. */
const FLESH_LIT = "#ecd9a6";
const FLESH_DEEP = "#7d5330";

const GRAVEL = "#c6bda6";
const GRAVEL_DARK = "#b0a68f";
const CONCRETE = "#d8cfb8";
const CONCRETE_DARK = "#b4ab95";
const GRASS = "#8fcf6c";
const GRASS_DARK = "#74b455";
const GRASS_DRY = "#c0bd6a";
const GRASS_DRY_DARK = "#a1a055";

export interface MillView {
  working: Partial<Record<solo.SoloProducerId, number>>;
  broken: Partial<Record<solo.SoloProducerId, number>>;
  marks: Partial<Record<solo.SoloProducerId, number>>;
  condition: number;
  hoard: number;
  seed: string;
  looming: number;
  generation: number;
}

export const EMPTY_VIEW: MillView = {
  working: {},
  broken: {},
  marks: {},
  condition: 1,
  hoard: 0,
  seed: "0",
  looming: 0,
  generation: 1,
};

type Phase = "day" | "dusk" | "night";

/** Evening holds until ten: sunset at six left the sky dark for the hours anyone actually plays. */
function phaseNow(): Phase {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return "night";
  if (h < 7 || h >= 20) return "dusk";
  return "day";
}

const SKY: Record<Phase, { top: string; bottom: string; hill: string; hillFar: string }> = {
  day: { top: "#a6ddf5", bottom: "#dcf1f7", hill: "#7cbc60", hillFar: "#9dd07e" },
  dusk: { top: "#5a5694", bottom: "#f6bb8e", hill: "#4d7a45", hillFar: "#628a55" },
  night: { top: "#232549", bottom: "#403a6c", hill: "#2b4632", hillFar: "#35503b" },
};

const NIGHT = "#141630";
const LAMP_LIGHT = "#ffdb8a";

const DARKNESS: Record<Phase, { field: number; yard: number }> = {
  day: { field: 0, yard: 0 },
  dusk: { field: 0.22, yard: 0.13 },
  night: { field: 0.46, yard: 0.31 },
};

/** LAMP_X stands just clear of the drop — the pack is what the light is for. */
const LAMP_X = 46;
const LAMP_REACH = 96;
const LAMP_SPREAD = 52;

/** Upper two ridges share period/phase so upper buildings clear lower roofs; the near one differs. */
interface Ridge {
  amp: number;
  base: number;
  phase: number;
}

const RIDGES: Ridge[] = [
  { amp: 4, base: 40, phase: 5 },
  { amp: 4, base: 29, phase: 5 },
  { amp: 4, base: 19, phase: 7 },
];

/** Sky the ridges need at full height. */
const RIDGE_ROOM = 56;

/** How far above the horizon a ridge stands at `x`, given the sky it's got. */
function ridgeAt(ridge: Ridge, x: number, scale: number): number {
  return Math.round(scale * (ridge.base + ridge.amp * Math.cos((2 * Math.PI * x) / 61 + ridge.phase)));
}

// --- Deterministic jitter — a mill's layout shouldn't reshuffle on every render ---

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** The fractional part, always positive. */
export function fract(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** Blend two `#rrggbb` colours, and return `#rrggbb` so the result can be fed straight back in. */
export function mix(a: string, b: string, k: number): string {
  const hex = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => {
    const c = Math.round(hex(a, i) + (hex(b, i) - hex(a, i)) * k);
    return clamp(c, 0, 255).toString(16).padStart(2, "0");
  });
  return `#${out.join("")}`;
}

export function rgba(hex: string, alpha: number): string {
  const c = [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- The hoard ---

/** The cap is legibility, not perf: past it the pack stops being dogs and becomes a texture. */
export const PACK_CAP = 34;

export const PACK_LEFT = 2;
export const PACK_RIGHT = SCENE_W - 12;

const DROP_X = 16;

/** Landing under the chute, kept clear; sized so a new one finishes growing before rejoining the crowd. */
export const DROP_CLEAR_X = DROP_X + 18;
export const DROP_CLEAR_D = 0.34;

/** Is this spot on the grass under the slide's mouth, given the pack's band? */
export function onLanding(x: number, y: number, back: number, front: number): boolean {
  return x < DROP_CLEAR_X && y < back + (front - back) * DROP_CLEAR_D;
}

/** The handler's spot, kept clear: resting dogs are the widest sprite and hid the whole throw. */
const PITCH_W = 14;
const PITCH_D = 9;

export function onPitch(x: number, y: number, front: number): boolean {
  return x > HAND_X - 6 && x < HAND_X + PITCH_W && y > front - PITCH_D;
}

const PACK_SPILL = 4;

/** Trot speed, px/s. Slow on purpose: crossing the yard takes most of half a minute. */
export const PACK_WALK = [5, 11] as const;

const FLAG_STEP = 7;

const BOWLS: readonly { x: number; d: number }[] = [
  { x: 44, d: 0.28 },
  { x: 118, d: 0.62 },
  { x: 86, d: 0.9 },
];

type FetchPhase = "wait" | "fly" | "chase" | "carry";

interface Fetch {
  phase: FetchPhase;
  x: number;
  y: number;
  tx: number;
  ty: number;
  from: number;
  to: number;
  dog: PackPup | null;
  until: number;
}

export const HAND_X = 40;

const FETCH_SPEED = 30;

/** Pause between throws. Ten seconds meant the fetch was usually not happening when you looked. */
const FETCH_REST = [1.2, 3.5] as const;

/** How much room the throw leaves around the handler, or it's a drop, not a throw. */
const FETCH_CLEAR = 28;

/** Samples the clear spans either side of the handler, so the ball never leaves the reachable band. */
export function fetchTarget(handX: number, roll: number = Math.random()): number {
  const lo = PACK_LEFT + 8;
  const hi = PACK_RIGHT - 8;
  const left = Math.max(0, handX - FETCH_CLEAR - lo);
  const right = Math.max(0, hi - (handX + FETCH_CLEAR));
  // A handler standing somewhere that leaves no clear span at all.
  if (left + right === 0) return clamp(handX + FETCH_CLEAR, lo, hi);
  const pick = roll * (left + right);
  return clamp(pick < left ? lo + pick : handX + FETCH_CLEAR + (pick - left), lo, hi);
}

/** Pixels of ground per animation frame. */
export const PACK_STRIDE = 4;

const GROW_CARRIED = 0.3;
const GROW_SMALL = 1.1;

/** Dogs the yard is owed: pack size and chute deliveries are unrelated clocks, so the yard runs a tab. */
const OWED_CAP = 8;
const OWED_TIMEOUT = 2.5;

/** `walked` drives the frame off distance travelled, which stops sixty dogs stepping in unison. */
export interface PackPup {
  x: number;
  y: number;
  /** Home spot, dealt uniformly — a pure random walk remembers the corner it spawned in. A lean, not a leash. */
  home: number;
  vx: number;
  vy: number;
  doing: "trot" | "stand" | "sit" | "zoom" | "rest" | "sleep";
  until: number;
  walked: number;
  coat: number;
  leaving: boolean;
  /** Has a job on; `pickAction` leaves it alone while set. */
  fetching: boolean;
  born: number;
}

/** Weighted so most of the yard stands still; two or three moving dogs read as individuals. */
export function pickAction(dog: PackPup, t: number): void {
  if (dog.leaving) {
    dog.until = t + 60;
    return;
  }
  const roll = Math.random();
  if (roll < 0.018) {
    // Zoomies: 1/30 dogs sprints for two seconds — the one thing on screen not at a walk.
    dog.doing = "zoom";
    dog.vx = (Math.random() < 0.5 ? -1 : 1) * 52;
    dog.vy = 0;
    dog.until = t + 0.8 + Math.random() * 1;
  } else if (roll < 0.40) {
    dog.doing = "trot";
    const away = dog.home - dog.x;
    const far = Math.abs(away) > 24;
    const dir = far || (Math.random() < 0.68 && Math.abs(away) > 6)
      ? Math.sign(away)
      : Math.random() < 0.5
        ? -1
        : 1;
    const pace = far ? 1.45 : 1;
    dog.vx = dir * pace * (PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]));
    // A tenth of the sideways speed: the yard is four dogs deep, faster crosses it before you register it.
    dog.vy = (Math.random() - 0.5) * 4;
    dog.until = t + 1.6 + Math.random() * 4.5;
  } else if (roll < 0.68) {
    dog.doing = "sit";
    dog.until = t + 4 + Math.random() * 9;
  } else if (roll < 0.815) {
    dog.doing = "rest";
    dog.until = t + 12 + Math.random() * 22;
  } else if (roll < 0.845) {
    // Properly asleep, long enough to be a fixture rather than a pose.
    dog.doing = "sleep";
    dog.until = t + 30 + Math.random() * 50;
  } else {
    dog.doing = "stand";
    dog.until = t + 2 + Math.random() * 4;
  }
}

/** The yard doesn't count your puppies. */
interface Stage {
  at: number;
}

export const YARD: Stage[] = [
  { at: 0 },
  { at: 5 },
  { at: 16 },
  { at: 45 },
  { at: 110 },
  { at: 200 },
  { at: 900 },
  { at: 4e3 },
  { at: 2e4 },
  { at: 8e4 },
  { at: 3e5 },
  { at: 1.5e6 },
  { at: 6e6 },
  { at: 3e7 },
  { at: 1.2e8 },
  { at: 5e8 },
  { at: 2e9 },
  { at: 1e10 },
  { at: 4e10 },
  { at: 2e11 },
  { at: 8e11 },
  { at: 3e12 },
  { at: 1.5e13 },
  { at: 6e13 },
  { at: 2.5e14 },
  { at: 1e15 },
  { at: 4e15 },
  { at: 1.5e16 },
  { at: 6e16 },
  { at: 2.5e17 },
];

interface YardLayout {
  stage: number;
  pack: number;
}

/** Where the yard settles once the opening is over. */
const PACK_FLOOR = 5;

/** One dog for the first puppy, so the first whistle puts something on the ground. */
const PACK_START = 1;

/** The hoard at which the opening ends and the stage curve takes over. */
export const PACK_OPEN_AT = 1e6;

/** How hard the fill is weighted towards the end. */
const PACK_CURVE = 1.45;

/** How the yard refills between one stage and the next. */
const PACK_EASE = 0.5;

/** How many puppies are loose in the yard once the build-out reaches `stage`. */
export function packAt(stage: number): number {
  const f = stage / (YARD.length - 1);
  return Math.round(PACK_FLOOR + (PACK_CAP - PACK_FLOOR) * Math.pow(f, PACK_CURVE));
}

/** A ceiling on the pack for the opening, and no ceiling at all after it. */
const PACK_OPEN_TOP = stageLayout(PACK_OPEN_AT).pack;

export function packOpening(amount: number): number {
  const a = Math.max(0, amount);
  if (a >= PACK_OPEN_AT) return PACK_CAP;
  const f = Math.log10(1 + a) / Math.log10(1 + PACK_OPEN_AT);
  return Math.floor(PACK_START + (PACK_OPEN_TOP + 1 - PACK_START) * f);
}

export function yardLayout(amount: number): YardLayout {
  const a = Math.max(0, amount);
  const base = stageLayout(a);
  // The opening only binds downwards and only early, so it can't turn a shrinking stage into a growing one.
  return { stage: base.stage, pack: Math.min(base.pack, packOpening(a)) };
}

/** The pack the build-out alone asks for, before the opening gets a say. */
function stageLayout(amount: number): YardLayout {
  const a = Math.max(0, amount);
  let stage = 0;
  while (stage + 1 < YARD.length && a >= YARD[stage + 1]!.at) stage++;

  const here = YARD[stage]!;
  const next = YARD[stage + 1];
  let frac = 1;
  if (next) {
    // The first stage counts puppies; every later one counts magnitudes.
    frac =
      stage === 0
        ? a / next.at
        : (Math.log10(a) - Math.log10(here.at)) / (Math.log10(next.at) - Math.log10(here.at));
  }
  frac = Math.max(0, Math.min(1, frac));

  // Every stage picks up exactly where the last one left off, so the whole run is one unbroken climb.
  const want = packAt(stage);
  const from = stage === 0 ? 0 : packAt(stage - 1);
  const grow = stage === 0 ? frac : Math.pow(frac, PACK_EASE);
  const pack = from + Math.floor((want - from) * grow);
  return { stage, pack: Math.max(0, Math.min(want, pack)) };
}

function sameLayout(a: YardLayout, b: YardLayout): boolean {
  return a.stage === b.stage && a.pack === b.pack;
}

// --- Producer placement ---

/** The tiers this scene draws, which is the outside mill and only that. */
type OutsideId = Extract<
  solo.SoloProducerId,
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
>;

type Band = "sky" | "back" | "field" | "walk";

interface Placement {
  band: Band;
  /** How many of the thing ever appear, however many you own. */
  cap: number;
  /** Drives across the field rather than standing in it. */
  speed?: number;
  /** How fast the drawn count climbs with the owned count. */
  spread?: number;
}

const PLACEMENT: Record<OutsideId, Placement> = {
  // The pup doesn't use the log curve — the field draws a bed per pen until the land is full — so its cap is only the ceiling on broken ones.
  patch: { band: "field", cap: 108 },
  hand: { band: "walk", cap: 16, spread: 3 },
  rig: { band: "field", cap: 12, spread: 2.6 },
  hauler: { band: "field", cap: 6, spread: 1.4, speed: 6 },
  machine: { band: "field", cap: 5, spread: 1.2, speed: 4.5 },
  lab: { band: "back", cap: 5 },
  refinery: { band: "back", cap: 5 },
  tower: { band: "back", cap: 5 },
  airship: { band: "sky", cap: 5, spread: 1.6, speed: 2.5 },
  reactor: { band: "back", cap: 4 },
  orbital: { band: "sky", cap: 4, spread: 1.4, speed: 7 },
  singularity: { band: "sky", cap: 3, spread: 1.2 },
};

/** What a hundred-owned tier throws light in. */
const PRIME_GLOW: Record<OutsideId, string> = {
  patch: "#a8f07a",
  hand: "#ffd782",
  rig: "#8ec9e6",
  hauler: "#ff8a4a",
  machine: "#ffe08a",
  lab: "#c88fe6",
  refinery: "#f0913c",
  tower: "#a8f07a",
  airship: "#ffe066",
  reactor: "#fff0b8",
  orbital: "#a4e884",
  singularity: "#ffe08a",
};

const ORDER: OutsideId[] = [
  "patch",
  "hand",
  "rig",
  "hauler",
  "machine",
  "lab",
  "refinery",
  "tower",
  "airship",
  "reactor",
  "orbital",
  "singularity",
];

// --- The back edge, in depth ---

/** The property doesn't stop at the skyline: it runs back from it. */
interface LotRow {
  at: number[];
  /** The ridge it stands on — where the counts you only reach late go. */
  ridge?: number;
  layer: number;
  /** Half size, and how much of the distance is drawn over it. */
  far: boolean;
  haze: number;
}

const LOT_ROWS: LotRow[] = [
  { at: [0.5], layer: 5, far: false, haze: 0 },
  { at: [0.2, 0.8], layer: 4, far: true, haze: 0.14 },
  { at: [0.31, 0.69], layer: 3, far: true, haze: 0.26 },
  { at: [0.15, 0.85], ridge: 2, layer: 2, far: true, haze: 0.34 },
  { at: [0.28, 0.72], ridge: 1, layer: 1, far: true, haze: 0.42 },
  { at: [0.38, 0.62], ridge: 0, layer: 0, far: true, haze: 0.5 },
];

const LOT = LOT_ROWS.flatMap((row, r) => row.at.map((at) => ({ ...row, at, row: r })));

/** How much ground a row is set back from the one in front, as a share of the building's own height. */
const LOT_STEP = 0.55;
const LOT_STEP_MIN = 6;

const BACK_TIERS = ORDER.filter((id) => PLACEMENT[id].band === "back");

interface Lot {
  id: OutsideId;
  art: Art;
  x: number;
  w: number;
  depth: number;
  dead: number;
  /** Empty, but staked out: the next tier's ground, waiting for it. */
  pad: boolean;
  /** Where each row's feet stand, so a row is a terrace and not a contour. */
  ground: number[];
}

/** How far back a lot is built, given how many of the tier you own. */
export function lotDepth(owned: number): number {
  if (owned <= 0) return 0;
  return Math.min(LOT.length, 1 + Math.floor(Math.log2(owned) * 1.45));
}

/** How many of a tier to actually draw. */
function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

// --- How a puppy gets from where it was made to where it's kept ---

interface Haul {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  dur: number;
  /** On a slide rather than in a pipe: picks up speed on the way down and kicks up dirt where it lands. */
  slide?: boolean;
}

interface Lump {
  from: number;
  d: number;
}

interface Whistled {
  x: number;
  y: number;
  born: number;
}

/** Dust, steam and water: the small stuff that says a machine is running rather than parked. */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dur: number;
  color: string;
  size: number;
}

const MAX_PUFFS = 40;

interface Plume {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dur: number;
  size: number;
}

const MAX_PLUMES = 80;

/** How long a whistled puppy sits in the open before it's counted and gone. */
const WHISTLED_MS = 850;

/** How much the trough holds before the machines are just tipping it over. */
const TROUGH_CAP = 12;

/** Seconds between puppies going down the trough's spout, when the trough is empty. */
const TROUGH_DRAIN = 0.8;

const PIPE_SPEED = 40;

const PIPE_BUILD_S = 3.4;

const RAISE_S = 1.5;

/** Scaffolding, which is the one thing on the mill that is meant to look cheap. */
const SCAFFOLD = "#b8a37a";

const MAX_HAULS = 24;

/** Beds a machine takes on board before it tips a basket out at the headland. */
const MACHINE_LOAD = 5;
/** What one of those baskets is worth when a hand tips it into the trough. */
const BASKET_WORTH = 3;
const MAX_BASKETS = 9;
const MAX_LUMPS = 64;

/** The angled run at the bottom of the pipeline, in pixels across and its fall. */
const CHUTE_LEN = 14;
const CHUTE_SLOPE = 0.7;

const BUILD_MS = 520;

/** How much of an arriving building is still underground, in pixels, `age` milliseconds in. */
export function buildHidden(age: number, up: boolean, height: number): number {
  const t = Math.max(0, Math.min(1, age / BUILD_MS));
  const shown = up ? 1 - (1 - t) * (1 - t) : 1 - t;
  return Math.round((1 - shown) * height);
}

// --- The pup cycle, and the people who work it ---
// The mill is scenery, not a readout.

/** How long a bed takes to come up. */
const GROW_SECONDS = 46;

/** How long a ready bed stands before the mill gets to it without you watching. */
const RIPE_SECONDS = 14;

const HAND_SPEED = 19;
const PICK_SECONDS = 1.8;
const REST_SECONDS = 2.4;

interface Hand {
  x: number;
  y: number;
  home: number;
  /** The depth it stands at when it's home — ranks, so a big crew isn't a line. */
  homeY: number;
  loiter: { x: number; y: number };
  /** The row it works by preference, so the crew covers the field. */
  rowPref: number;
  state: "resting" | "out" | "picking" | "back" | "fetch" | "hauling";
  target: number;
  /** Id of the basket it's been sent for, or -1. */
  basket: number;
  until: number;
  carrying: "none" | "puppy" | "basket";
}

interface Basket {
  id: number;
  x: number;
  y: number;
  born: number;
}

interface Bed {
  x: number;
  y: number;
  row: number;
  /** Wilted pups are skipped: nothing there is worth walking out for. */
  dry: boolean;
}

/** A pup row's extent, so everything else on the mill can work *with* it. */
interface Row {
  y: number;
  left: number;
  right: number;
}

/** How deep the field can get stocked before it stops adding rows. */
const FIELD_ROWS = 6;

const TRACK_MS = 4500;

interface Drop {
  x: number;
  y: number;
  vy: number;
  pup: number;
}

interface Flyer {
  x: number;
  y: number;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
  hold: number;
  drip: number;
}

/** Buffer pixels a second at full tilt, and how long one stands over a patch once it gets there. */
const FLY_SPEED = 27;
const FLY_HOLD = 3.6;

interface Well {
  x: number;
  y: number;
  cx: number;
  cy: number;
  r: number;
  pull: number;
  dive: number;
}

interface Caught {
  well: number;
  art: Art;
  a: number;
  r: number;
}

const CATCH_FALL = 14;
/** Angular speed is `CATCH_SWIRL / r` — angular momentum, near enough — so the last lap whips. */
const CATCH_SWIRL = 60;
const CATCH_CORE = 5;
/** How flat the orbit lies once it's close in, and how far out it's still round. */
const CATCH_TILT = 0.5;
const CATCH_FLAT = 30;
const MAX_CAUGHT = 18;
/** Things a hole picks up a second, at the bottom of a dive. */
const GRAB_RATE = 22;

export function catchOrbit(r: number, dt: number): { r: number; turn: number } {
  return { r: r - CATCH_FALL * dt, turn: (CATCH_SWIRL / Math.max(CATCH_CORE, r)) * dt };
}

function catchTilt(r: number): number {
  return CATCH_TILT + (1 - CATCH_TILT) * Math.min(1, r / CATCH_FLAT);
}

/** How often one comes down, and how much of that cycle it spends down there. */
const DIVE_PERIOD = 34;
const DIVE_SHARE = 0.32;

/** The one hash every sky tier is placed off. */
function skyHash(i: number, id: string): number {
  return fract(Math.sin((i + 1) * 47.3 + id.length * 13.1) * 4375.85);
}

/** How far into a dive something is, 0..1, given the clock and its own phase. */
function diveAt(t: number, period: number, phase: number): number {
  const c = fract(t / period + phase);
  if (c > DIVE_SHARE) return 0;
  return Math.sin(Math.PI * (c / DIVE_SHARE)) ** 2;
}

export class MillScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Scene time, in seconds, accumulated a capped frame at a time rather than read off the wall clock. */
  private clock = 0;
  private view: MillView = EMPTY_VIEW;
  private rngSeed = 1;
  private sawView = false;
  private lotSeen = new Map<string, number>();
  private raising = new Map<string, number>();
  private sawLots = false;
  private phase: Phase = "day";
  private pipeBuiltAt: number | null = null;
  /** Whether a frame has ever been drawn with nothing feeding the pipeline. */
  private sawNoPipe = false;
  private hauls: Haul[] = [];
  private lumps: Lump[] = [];
  private baskets: Basket[] = [];
  private basketId = 0;
  private machineLoad = new Map<string, number>();
  private whistled: Whistled[] = [];
  private puffs: Puff[] = [];
  /** Cooling-tower steam, on its own budget so it can't starve the dust. */
  private plumes: Plume[] = [];
  private beds: Bed[] = [];
  private rows: Row[] = [];
  private tracks: { x: number; y: number; born: number }[] = [];
  private drops: Drop[] = [];
  private flyers: Flyer[] = [];
  private wells: Well[] = [];
  private caught: Caught[] = [];
  /** Indexed the same as `beds`. */
  private stocked: number[] = [];
  private hands: Hand[] = [];
  private troughFill = 0;
  private troughClock = 0;
  private troughBox: { x: number; w: number; y: number } | null = null;
  private pipeEnd = 0;
  private dt = 0;
  private lastFrame = performance.now();
  /** The hoard the yard is currently showing, which chases the real one rather than snapping to it. */
  private shown = -1;
  private shownLayout = yardLayout(0);
  private pack: PackPup[] = [];
  private owed = 0;
  private owedSince = 0;
  private fetch: Fetch = {
    phase: "wait",
    x: HAND_X + 8,
    y: 0,
    tx: 0,
    ty: 0,
    from: 0,
    to: 0,
    dog: null,
    until: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? rect.height / rect.width : 1.1;
    this.sh = Math.max(90, Math.min(340, Math.round(SCENE_W * ratio)));
    this.canvas.width = SCENE_W;
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.generation !== this.view.generation || view.seed !== this.view.seed);
    this.view = view;
    this.rngSeed = hashSeed(view.seed);
    this.sawView = true;
    if (wiped) this.clearOut();
  }

  /** A different mill entirely: handed down, or ploughed under. */
  private clearOut(): void {
    this.shown = Math.max(0, this.view.hoard);
    this.shownLayout = yardLayout(this.shown);
    this.pack = [];
    this.owed = 0;
    this.fetch.dog = null;
    this.fetch.phase = "wait";
    this.hauls = [];
    this.lumps = [];
    this.baskets = [];
    this.machineLoad.clear();
    this.puffs = [];
    this.plumes = [];
    this.tracks = [];
    this.whistled = [];
    this.caught = [];
    this.troughFill = 0;
    // The pipeline is built once, by the mill that first needed one.
    this.pipeBuiltAt = null;
    this.sawNoPipe = false;
    // Lot depths are seeded, not raised, on a restore — and a wipe is a restore.
    this.lotSeen.clear();
    this.raising.clear();
    this.sawLots = false;
  }

  private mark(id: solo.SoloProducerId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  /** A whistle: a puppy comes up out of the ground under your finger, sits a moment, and is gone. */
  whistle(at?: { x: number; y: number }): void {
    if (this.whistled.length > 14) return;
    const top = this.fieldTop() + 8;
    const floor = this.sh - 8;
    const x = at ? Math.max(3, Math.min(SCENE_W - 8, Math.round(at.x))) : 20 + Math.random() * (SCENE_W - 60);
    const y = at ? Math.max(top, Math.min(floor, Math.round(at.y))) : top + 12 + Math.random() * 30;
    this.whistled.push({ x: Math.round(x), y: Math.round(y), born: performance.now() });
    this.puff(x, y, "dust", -10);
    this.puff(x + 3, y, "dust", 10);
  }

  private readiness(i: number, t: number): number {
    const stocked = this.stocked[i];
    if (stocked === undefined) return 0;
    return Math.min(1, (t - stocked) / GROW_SECONDS);
  }

  private lift(i: number, t: number): void {
    // Replanted part-grown, not from bare bedding.
    this.stocked[i] = t - GROW_SECONDS * 0.35;
  }

  private stepHands(t: number, dt: number, count: number, yardY: number): void {
    const unload = yardY + Math.round((this.sh - yardY) * 0.42);

    while (this.hands.length > count) this.hands.pop();
    while (this.hands.length < count) {
      const i = this.hands.length;
      // Six to a rank, ranks stepped back and offset half a place, so the crew isn't a police line.
      const rank = Math.floor(i / 6);
      const inRank = i % 6;
      const home = 12 + inRank * 26 + (rank % 2) * 13;
      const homeY = unload + rank * 7;
      // Two seconds of hashed jitter so they don't set off in chorus.
      const jitter = fract(Math.sin((i + 1) * 91.7) * 4375.85);
      this.hands.push({
        x: home,
        y: homeY,
        home,
        homeY,
        loiter: { x: home, y: homeY },
        rowPref: i % FIELD_ROWS,
        state: "resting",
        target: -1,
        basket: -1,
        until: t + jitter * 2,
        carrying: "none",
      });
    }

    for (const hand of this.hands) {
      switch (hand.state) {
        case "resting": {
          if (this.walk(hand, hand.loiter.x, hand.loiter.y, dt, 0.35)) {
            hand.loiter = {
              x: clamp(hand.home + (Math.random() - 0.5) * 26, 4, SCENE_W - 10),
              y: clamp(hand.homeY + (Math.random() - 0.5) * 14, yardY + 4, this.sh - 6),
            };
          }
          if (t < hand.until) break;
          // A basket sitting at the headland is worth more than another bed: it's already picked, and it's in the way.
          const basket = this.claimBasket(hand);
          if (basket >= 0) {
            hand.basket = basket;
            hand.state = "fetch";
            break;
          }
          const target = this.claimBed(t, hand);
          if (target < 0) {
            hand.until = t + 0.6 + Math.random();
            break;
          }
          hand.target = target;
          hand.state = "out";
          break;
        }
        case "out": {
          const bed = this.beds[hand.target];
          if (!bed) {
            hand.state = "resting";
            hand.target = -1;
            hand.until = t + 0.5;
            break;
          }
          if (this.walk(hand, bed.x + 1, bed.y, dt)) {
            hand.state = "picking";
            hand.until = t + PICK_SECONDS;
          }
          break;
        }
        case "picking": {
          if (t < hand.until) break;
          this.lift(hand.target, t);
          hand.carrying = "puppy";
          hand.state = "back";
          break;
        }
        case "fetch": {
          const basket = this.baskets.find((sk) => sk.id === hand.basket);
          if (!basket) {
            hand.basket = -1;
            hand.state = "resting";
            hand.until = t + 0.3;
            break;
          }
          if (this.walk(hand, basket.x, basket.y, dt)) {
            this.baskets = this.baskets.filter((sk) => sk.id !== hand.basket);
            hand.carrying = "basket";
            hand.state = "hauling";
          }
          break;
        }
        case "hauling": {
          // To the trough if there is one — that's where the machines' load goes — and to the yard if there isn't.
          const box = this.troughBox;
          const tx = box ? clamp(hand.x, box.x + 4, box.x + box.w - 6) : hand.home;
          const ty = box ? box.y + 3 : hand.homeY;
          if (this.walk(hand, tx, ty, dt, 0.85)) {
            hand.carrying = "none";
            hand.basket = -1;
            if (box) this.troughFill = Math.min(TROUGH_CAP, this.troughFill + BASKET_WORTH);
            this.puff(tx + 1, ty - 2, "dust");
            hand.state = "resting";
            hand.loiter = this.turnAround(hand, yardY);
            hand.until = t + 0.4;
          }
          break;
        }
        case "back": {
          const bin = this.troughBox;
          const bx = bin ? clamp(hand.x, bin.x + 4, bin.x + bin.w - 6) : hand.home;
          const by = bin ? bin.y + 3 : hand.homeY;
          if (this.walk(hand, bx, by, dt)) {
            hand.carrying = "none";
            if (bin) this.troughFill = Math.min(TROUGH_CAP, this.troughFill + 1);
            this.puff(bx + 2, by - 1, "dust");
            hand.state = "resting";
            hand.target = -1;
            hand.loiter = this.turnAround(hand, yardY);
            hand.until = t + REST_SECONDS * (0.5 + Math.random());
          }
          break;
        }
      }
    }
  }

  private claimBed(t: number, hand: Hand): number {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < this.beds.length; i++) {
      const bed = this.beds[i]!;
      if (bed.dry) continue;
      if (this.hands.some((h) => h.target === i)) continue;
      const ready = this.readiness(i, t);
      if (ready <= 0.55) continue;
      // Ripest first, then weighted against the walk, then against the row this one tends to work.
      const score =
        ready * 40 -
        Math.hypot(bed.x - hand.x, bed.y - hand.y) * 0.35 -
        Math.abs(bed.row - hand.rowPref) * 9;
      if (best < 0 || score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  private walk(hand: Hand, tx: number, ty: number, dt: number, pace = 1): boolean {
    const dx = tx - hand.x;
    const dy = ty - hand.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) {
      hand.x = tx;
      hand.y = ty;
      return true;
    }
    const step = Math.min(d, HAND_SPEED * pace * dt);
    hand.x += (dx / d) * step;
    hand.y += (dy / d) * step;
    return false;
  }

  private drawHands(t: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(this.mark("hand"));
    const pup = artCanvas(PUPPY_SPRITE);
    const basket = artCanvas(BASKET);
    for (const [i, hand] of this.hands.entries()) {
      const moving = hand.state !== "resting" && hand.state !== "picking";
      const bob = moving ? Math.floor(t * 4) % 2 : hand.state === "picking" ? 2 : 0;
      const at = this.warp(hand.x + sprite.w / 2, hand.y - sprite.h / 2 + bob);
      const x = Math.round(at.x - sprite.w / 2);
      const y = Math.round(at.y - sprite.h / 2);
      this.primeGlow("hand", x, y, sprite.w, sprite.h, t, i, 0.8);
      ctx.drawImage(sprite.canvas, x, y);
      if (hand.carrying === "puppy") ctx.drawImage(pup.canvas, x + 1, y - 4);
      // Baskets ride on the shoulder, which is also why a hand carrying one walks at eighty-five per cent pace.
      if (hand.carrying === "basket") ctx.drawImage(basket.canvas, x - 2, y - basket.h + 3);
    }
  }

  private puff(x: number, y: number, kind: "dust" | "steam" | "water", vx?: number): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    const spec = {
      dust: { color: "#b79a72", vx: -6, vy: -5, dur: 620, size: 2 },
      steam: { color: "#e8ecf0", vx: 3, vy: -13, dur: 900, size: 2 },
      water: { color: "#8ec9e6", vx: 0, vy: 4, dur: 460, size: 1 },
    }[kind];
    this.puffs.push({
      x,
      y,
      vx: (vx ?? spec.vx) + (Math.random() - 0.5) * 8,
      vy: spec.vy - Math.random() * 4,
      born: performance.now(),
      dur: spec.dur,
      color: spec.color,
      size: spec.size,
    });
  }

  /** Per-frame odds for something that should happen `perSec` times a second. */
  private chance(perSec: number): boolean {
    return Math.random() < this.dt * perSec;
  }

  start(): void {
    const loop = () => {
      this.draw(performance.now());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
  }

  // --- Geometry ------------------------------------------------------------

  /** The three bands, as fractions rather than fixed pixel depths. */
  private yardTop(): number {
    return this.sh - Math.max(34, Math.round(this.sh * YARD_SHARE));
  }

  private fieldTop(): number {
    return Math.max(MIN_SKY, this.yardTop() - Math.max(40, Math.round(this.sh * FIELD_SHARE)));
  }

  private decks(horizon: number): { deck: number; hang: number } {
    const ridge = RIDGES[0]!;
    const deck = Math.max(
      34,
      Math.round(horizon - Math.min(1, horizon / RIDGE_ROOM) * (ridge.base + ridge.amp)),
    );
    return { deck, hang: Math.round(deck * 0.44) };
  }

  /** Where the singularities are this frame, and how hard each is pulling. */
  private stepWells(t: number, horizon: number): void {
    const place = PLACEMENT.singularity;
    const n = shownCount(this.view.working.singularity ?? 0, place.cap, place.spread ?? 1);
    const sprite = artCanvas(this.mark("singularity"));
    const { hang } = this.decks(horizon);
    const lot = SCENE_W / place.cap;
    // As low as a dive gets: down through the traffic, past the hills and into the middle of the field itself.
    const floor = Math.max(hang, Math.round(horizon + (this.yardTop() - horizon) * 0.5 - sprite.h / 2));

    this.wells.length = 0;
    for (let i = 0; i < n; i++) {
      const h = skyHash(i, "singularity");
      const h2 = fract(h * 137.7);
      const h3 = fract(h2 * 91.3);
      // Hanging: a slow lissajous a few pixels wide on its own phase, so two don't breathe together.
      const home = (i / place.cap) * SCENE_W + (lot - sprite.w) / 2;
      const room = Math.max(0, hang - sprite.h - 2);
      const rest = 1 + Math.round(h2 * room) + Math.round(Math.sin(t * 0.43 + h3 * 6) * 2);
      const dive = diveAt(t, DIVE_PERIOD * (0.8 + 0.5 * h), h2);
      const x = Math.round(home + Math.sin(t * 0.31 + h2 * 6) * 5);
      const y = Math.round(rest + (floor - rest) * dive);
      this.wells.push({
        x,
        y,
        cx: x + sprite.w / 2,
        cy: y + sprite.h / 2,
        r: 18 + dive * 44,
        pull: 0.16 + dive * 0.64,
        dive,
      });
      // Feeds the same pipeline as the rest of the industrial half; it just needs no kennel to do it from.
      this.pipeEnd = Math.max(this.pipeEnd, x + Math.floor(sprite.w / 2));
      if (this.chance(1.4)) this.feedPipe(x + Math.floor(sprite.w / 2));
      this.grab(i, t, horizon);
    }
  }

  private grab(i: number, t: number, horizon: number): void {
    const well = this.wells[i]!;
    if (well.dive < 0.25 || this.caught.length >= MAX_CAUGHT) return;
    // Dirt off the ground the whole time it's down, whether or not there's anything to take.
    if (this.chance(6 * well.dive)) {
      const off = (Math.random() - 0.5) * 40;
      this.puff(well.cx + off, well.cy + 16, "dust", -off * 0.7);
    }
    if (!this.chance(GRAB_RATE * well.dive)) return;

    // Inside the reach the warp already has, less a margin — something it can barely lean on shouldn't be something it can lift.
    const reach = well.r * 0.8;
    let best: { d: number; art: Art; x: number; y: number; take: () => void } | null = null;
    const offer = (x: number, y: number, art: Art, take: () => void) => {
      const d = Math.hypot(x - well.cx, y - well.cy);
      if (d > reach || (best && d >= best.d)) return;
      best = { d, art, x, y, take };
    };

    for (const basket of this.baskets) {
      offer(basket.x + 3, basket.y - 4, BASKET, () => {
        this.baskets = this.baskets.filter((s) => s !== basket);
      });
    }
    const pipeY = this.pipeY(horizon) + 3;
    for (const lump of this.lumps) {
      const px = lump.from - lump.d;
      if (px < 2) continue;
      offer(px + 3, pipeY, PUPPY_SPRITE, () => {
        this.lumps = this.lumps.filter((l) => l !== lump);
      });
    }
    for (const whistled of this.whistled) {
      offer(whistled.x + 3, whistled.y - 6, PUPPY_SPRITE, () => {
        this.whistled = this.whistled.filter((d) => d !== whistled);
      });
    }
    for (let b = 0; b < this.beds.length; b++) {
      const bed = this.beds[b]!;
      if (bed.dry || this.readiness(b, t) < 0.8) continue;
      offer(bed.x + 3, bed.y - 5, PUPPY_SPRITE, () => this.lift(b, t));
    }
    const box = this.troughBox;
    if (box && this.troughFill > 0) {
      const tx = clamp(well.cx, box.x + 4, box.x + box.w - 5);
      offer(tx, box.y - 8, PUPPY_SPRITE, () => {
        this.troughFill = Math.max(0, this.troughFill - 1);
      });
    }

    if (!best) return;
    const got: { d: number; art: Art; x: number; y: number; take: () => void } = best;
    got.take();
    this.caught.push({
      well: i,
      art: got.art,
      a: Math.atan2(got.y - well.cy, got.x - well.cx),
      r: Math.max(CATCH_CORE, got.d),
    });
  }

  /** Where a point in the sky ends up once the holes have had a go at it. */
  private warp(x: number, y: number): { x: number; y: number } {
    let ox = x;
    let oy = y;
    for (const well of this.wells) {
      const dx = well.cx - ox;
      const dy = well.cy - oy;
      const d = Math.hypot(dx, dy);
      if (d >= well.r || d < 0.01) continue;
      const f = well.pull * (1 - d / well.r) ** 2;
      ox += dx * f;
      oy += dy * f;
    }
    return { x: ox, y: oy };
  }

  // --- Drawing -------------------------------------------------------------

  private draw(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.dt = dt;
    this.lastFrame = now;
    this.clock += dt;
    const t = this.clock;
    const phase = (this.phase = phaseNow());
    const horizon = this.fieldTop();
    const yardY = this.yardTop();

    this.stepHoard(dt);
    this.pipeEnd = 0;
    // Before anything is drawn: the sky has to know where the holes in it are before it draws the things that fall toward them.
    this.stepWells(t, horizon);

    const lots = this.lots(horizon);
    this.noteArrivals(lots, t);
    // The hills and the deep end of every lot go up together, back to front.
    this.drawSky(phase, t, horizon);
    this.drawDistance(lots, phase, horizon, t);
    this.drawGround(horizon, yardY);
    this.drawBack(lots, t, now, horizon, phase);
    this.drawField(t, now, horizon, yardY);
    this.drawBaskets(now);
    this.drawPuffs(now, dt);
    this.drawFence(yardY);
    this.drawLamp(yardY, phase);
    this.drawHoard();
    // The spout hangs over the yard on its way to the drop at the front of it, so it's drawn after the yard rather than with the trough it comes off.
    if (this.troughBox) this.drawSpout(this.troughBox);
    this.stepFetch(this.clock);
    this.stepPack(this.dt, this.clock);

    // After the hoard: the pipeline runs down the near side of the yard, so it passes in front of the pack rather than being swallowed by it.
    this.drawPipeline(horizon, yardY, dt, t);
    // The hands walk between the two bands, so they're drawn after both — and after the field has said where this frame's beds are.
    this.stepHands(t, dt, shownCount(this.view.working.hand ?? 0, PLACEMENT.hand.cap, PLACEMENT.hand.spread), yardY);
    this.drawHands(t);
    this.drawHauls(now);
    this.drawWhistled(now);
    // In front of the whole mill, because one of them may be hanging in the middle of it.
    this.drawWells(t);

    this.drawDark(phase, yardY, t);
  }

  /** Where the lamp's head hangs — the one light source the mill owns. */
  private lampHead(yardY: number): { x: number; y: number; top: number } {
    const art = artCanvas(LAMP);
    const top = yardY + 3 - art.h;
    return { x: LAMP_X + Math.floor(art.w / 2), y: top + 2, top };
  }

  private drawLamp(yardY: number, phase: Phase): void {
    const on = phase !== "day";
    const sprite = artCanvas(on ? LAMP_ON : LAMP);
    this.ctx.drawImage(sprite.canvas, LAMP_X, this.lampHead(yardY).top);
  }

  /** Nightfall, over the whole picture and not just the top four fifths of it. */
  private drawDark(phase: Phase, yardY: number, t: number): void {
    const dark = DARKNESS[phase];
    if (dark.field <= 0 && dark.yard <= 0) return;
    const ctx = this.ctx;

    ctx.fillStyle = rgba(NIGHT, dark.field);
    ctx.fillRect(0, 0, SCENE_W, yardY);
    ctx.fillStyle = rgba(NIGHT, dark.yard);
    ctx.fillRect(0, yardY, SCENE_W, this.sh - yardY);

    const head = this.lampHead(yardY);
    const flicker = 0.94 + 0.06 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 11.7);
    const lit = (phase === "night" ? 1 : 0.55) * flicker;

    const cone = ctx.createLinearGradient(0, head.y, 0, this.sh);
    cone.addColorStop(0, rgba(LAMP_LIGHT, 0.24 * lit));
    cone.addColorStop(0.55, rgba(LAMP_LIGHT, 0.12 * lit));
    cone.addColorStop(1, rgba(LAMP_LIGHT, 0));
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(head.x - 3, head.y + 2);
    ctx.lineTo(head.x + 3, head.y + 2);
    ctx.lineTo(head.x + LAMP_SPREAD, this.sh);
    ctx.lineTo(head.x - LAMP_SPREAD, this.sh);
    ctx.closePath();
    ctx.fill();

    // The pool is aimed down into the yard, not centred on the bulb.
    this.glow(head.x, yardY + (this.sh - yardY) * 0.4, LAMP_REACH, LAMP_LIGHT, 0.26 * lit);
    this.glow(head.x, head.y, 13, LAMP_LIGHT, 0.5 * lit);

    const sprite = artCanvas(LAMP_ON);
    ctx.drawImage(sprite.canvas, LAMP_X, head.top);
  }

  // --- Things going up -----------------------------------------------------

  /** Spot anything that arrived since last frame, and put it up. */
  private noteArrivals(lots: Lot[], t: number): void {
    const arrive = (key: string, n: number) => {
      const before = this.lotSeen.get(key) ?? 0;
      this.lotSeen.set(key, n);
      // Counts fall on a prestige, and everything gets built again on the way back up — which is the right answer.
      if (this.sawLots) {
        for (let i = before; i < n; i++) this.raising.set(`${key}:${i}`, t);
      }
    };

    for (const lot of lots) arrive(lot.id, lot.depth);

    this.sawLots = true;
    for (const [key, born] of this.raising) {
      if (t - born > RAISE_S) this.raising.delete(key);
    }
  }

  /** How far through its build something is, or null if it isn't being built. */
  private raiseOf(key: string, t: number): number | null {
    const born = this.raising.get(key);
    if (born === undefined) return null;
    return clamp((t - born) / RAISE_S, 0, 1);
  }

  private drawRaise(p: number, x: number, foot: number, w: number, h: number): number {
    const ctx = this.ctx;
    // Up fast, off at the end, and never quite opaque — it's scaffolding.
    const frame = clamp(p / 0.2, 0, 1) * (1 - clamp((p - 0.76) / 0.24, 0, 1));
    // Ease-out on the rise, so it settles onto the pad instead of stopping.
    const rise = clamp((p - 0.1) / 0.62, 0, 1);
    const shown = Math.max(1, Math.round(h * (1 - Math.pow(1 - rise, 2))));

    if (frame > 0.03) {
      const top = foot - h - 2;
      ctx.globalAlpha = 0.8 * frame;
      ctx.fillStyle = SCAFFOLD;
      ctx.fillRect(x - 2, top, 1, h + 2);
      ctx.fillRect(x + w + 1, top, 1, h + 2);
      for (let y = top + 3; y < foot; y += 5) ctx.fillRect(x - 2, y, w + 4, 1);
      ctx.globalAlpha = 1;
    }

    if (p < 0.75 && this.chance(9)) {
      this.puff(x + Math.random() * w, foot - 1, "dust", (Math.random() - 0.5) * 16);
    }
    if (p > 0.72 && p < 0.78) {
      this.puff(x - 1, foot - 1, "dust", -14);
      this.puff(x + w, foot - 1, "dust", 14);
    }
    return Math.min(h, shown);
  }

  private drawSky(phase: Phase, t: number, horizon: number): void {
    const ctx = this.ctx;
    const sky = SKY[phase];
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, horizon);

    if (phase === "night") {
      const rng = mulberry32(this.rngSeed ^ 0x51ed);
      ctx.fillStyle = "#f4f1d8";
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(rng() * SCENE_W);
        const y = Math.floor(rng() * Math.max(1, horizon - 8));
        if (rng() > 0.35 + 0.3 * Math.sin(t * 0.7 + i)) ctx.fillRect(x, y, 1, 1);
      }
      ctx.fillStyle = "#f7f0d0";
      ctx.beginPath();
      ctx.arc(SCENE_W - 30, 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath();
      ctx.arc(SCENE_W - 34, 17, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = phase === "dusk" ? "#ffca77" : "#fdf0a6";
      ctx.beginPath();
      ctx.arc(SCENE_W - 28, 22, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    if (phase !== "night") {
      const cloud = artCanvas(CLOUD);
      for (let i = 0; i < 3; i++) {
        const span = SCENE_W + cloud.w;
        const cx = Math.floor((((t * (3 + i) + i * 70) % span) + span) % span) - cloud.w;
        const at = this.warp(cx + cloud.w / 2, 8 + i * 13 + cloud.h / 2);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(cloud.canvas, Math.round(at.x - cloud.w / 2), Math.round(at.y - cloud.h / 2));
        ctx.globalAlpha = 1;
      }
    }

    this.drawBleed(horizon, t);
  }

  private drawBleed(horizon: number, t: number): void {
    const looming = clamp(this.view.looming, 0, 1);
    if (looming <= 0) return;
    const ctx = this.ctx;
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.42);
    // Front-loaded rather than linear, let alone squared.
    const strength = Math.pow(looming, 0.55) * pulse;

    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, rgba(FLESH_LIT, 0.62 * strength));
    grad.addColorStop(0.5, rgba(FLESH_DEEP, 0.2 * strength));
    grad.addColorStop(1, rgba(FLESH_DEEP, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, horizon);

    if (looming > 0.55) {
      ctx.globalAlpha = 0.16 * (looming - 0.55) / 0.45;
      ctx.fillStyle = FLESH_DEEP;
      const base = Math.round(horizon * 0.3);
      for (let x = 0; x < SCENE_W; x++) {
        ctx.fillRect(x, base + Math.round(2.5 * Math.sin(x / 23) + 1.5 * Math.sin(x / 7 + 2)), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Three ridges and the deep end of every lot, back to front so each ridge buries the feet of the row behind. */
  private drawDistance(lots: Lot[], phase: Phase, horizon: number, t: number): void {
    const ctx = this.ctx;
    const sky = SKY[phase];
    const scale = Math.min(1, horizon / RIDGE_ROOM);
    // Far ridges wash out toward the sky: the only thing telling three same-green ridges apart at night.
    const colors = [mix(sky.hillFar, sky.bottom, 0.4), sky.hillFar, sky.hill];

    for (let i = 0; i < RIDGES.length; i++) {
      // Drawn as 1px columns so the ridge sits on the buffer's grid instead of being antialiased into a smear by a path fill.
      const ridge = RIDGES[i]!;
      for (let x = 0; x < SCENE_W; x++) {
        const h = ridgeAt(ridge, x, scale);
        ctx.fillStyle = colors[i]!;
        ctx.fillRect(x, horizon - h, 1, h);
      }
      // Layer i is the row standing on ridge i, so each ridge goes up under its own row and in front of the row above it.
      this.drawLotLayer(lots, i, phase, t);
    }
  }

  private drawGround(horizon: number, yardY: number): void {
    const ctx = this.ctx;
    const bedding = this.view.condition;
    const dry = 1 - Math.max(0, Math.min(1, bedding));

    ctx.fillStyle = mix(GRAVEL, "#8a7f66", dry);
    ctx.fillRect(0, horizon, SCENE_W, yardY - horizon);

    ctx.fillStyle = mix(GRAVEL_DARK, "#776d57", dry);
    for (let y = horizon + 6; y < yardY; y += 9) ctx.fillRect(0, y, SCENE_W, 2);

    ctx.fillStyle = mix(GRASS, GRASS_DRY, dry);
    ctx.fillRect(0, yardY, SCENE_W, this.sh - yardY);
    ctx.fillStyle = mix(GRASS_DARK, GRASS_DRY_DARK, dry);
    ctx.fillRect(0, yardY, SCENE_W, 3);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, yardY + 3, SCENE_W, 3);
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.5;
    const rng = mulberry32(this.rngSeed ^ 0x9e37);
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(
        Math.floor(rng() * SCENE_W),
        yardY + 6 + Math.floor(rng() * Math.max(1, this.sh - yardY - 8)),
        2,
        1,
      );
    }
    ctx.globalAlpha = 1;

    const back = this.packBack();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = mix("#a89b72", "#8a7f66", dry);
    for (let i = 0; i < 26; i++) {
      const y = back + 2 + Math.floor(rng() * Math.max(1, this.sh - back - 4));
      const w = 6 + Math.floor(rng() * 14);
      ctx.fillRect(Math.floor(rng() * (DROP_X + 26)), y, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  private lots(horizon: number): Lot[] {
    const span = SCENE_W - artCanvas(TREE).w - 6;
    const width = Math.floor(span / BACK_TIERS.length);
    const scale = Math.min(1, horizon / RIDGE_ROOM);
    // The lot after the last one you've built on gets staked out.
    const next = BACK_TIERS.findIndex((id) => ((this.view.working[id] ?? 0) + (this.view.broken[id] ?? 0)) <= 0);

    return BACK_TIERS.map((id, i) => {
      const working = this.view.working[id] ?? 0;
      const broken = this.view.broken[id] ?? 0;
      // Dead kit stands at the back; the one out front only greys when nothing is left working.
      const depth = lotDepth(working + broken);
      const dead = working <= 0 ? depth : Math.min(depth - 1, Math.round((depth * broken) / (working + broken)));
      const art = this.mark(id);
      const x = 2 + i * width;

      const tall = artCanvas(shrunk(art)).h;
      const step = Math.max(LOT_STEP_MIN, Math.round(tall * LOT_STEP));
      const ground: number[] = [];
      let y = horizon + 8;
      for (const [r, row] of LOT_ROWS.entries()) {
        if (r > 0) y -= step;
        if (row.ridge !== undefined) {
          y = Math.min(y, horizon - ridgeAt(RIDGES[row.ridge]!, x + width / 2, scale));
        }
        // Clamped, so a squat sky crowds the lot together rather than posting its far end off the buffer.
        ground.push(Math.max(tall + 1, y));
      }
      return { id, art, x, w: width, depth, dead, ground, pad: depth === 0 && i === next };
    });
  }

  private drawBack(
    lots: Lot[],
    t: number,
    now: number,
    horizon: number,
    phase: Phase,
  ): void {
    // Steam first, so it comes out from behind the towers rather than over the front of them.
    this.drawPlumes(now);

    this.drawLotLayer(lots, 3, phase, t);
    this.drawLotLayer(lots, 4, phase, t);

    const tree = artCanvas(TREE);
    this.ctx.drawImage(tree.canvas, SCENE_W - tree.w - 3, horizon + 10 - tree.h);

    this.drawLotLayer(lots, 5, phase, t);
  }

  /** One depth of every lot at once, or a lot's hillside gets drawn over its neighbour's foreground. */
  private drawLotLayer(lots: Lot[], layer: number, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const haze = SKY[phase].hillFar;

    for (const lot of lots) {
      if (lot.pad && layer === LOT[0]!.layer) this.drawPad(lot);
      for (let s = 0; s < lot.depth; s++) {
        const slot = LOT[s]!;
        if (slot.layer !== layer) continue;
        const art = slot.far ? shrunk(lot.art) : lot.art;
        // Dead and distant at once still has to come out as one blit, so the two washes are folded into a single tint rather than stacked.
        const dead = s >= lot.depth - lot.dead;
        const tint = dead ? mix(haze, "#6b6b74", 0.6) : haze;
        const alpha = dead ? Math.max(0.6, slot.haze) : slot.haze;
        const sprite = alpha > 0 ? artTinted(art, tint, alpha) : artCanvas(art);

        const x = lot.x + Math.round(lot.w * slot.at - sprite.w / 2);
        const ground = lot.ground[slot.row]!;
        if (slot.far) {
          ctx.fillStyle = `rgba(24, 20, 30, ${0.3 - slot.haze * 0.25})`;
          ctx.fillRect(x, ground - 1, sprite.w, 1);
        }
        // Primed lots light the hillside, the ones up the back less — a valley with the lights on, in depth.
        if (!dead) {
          this.primeGlow(lot.id, x, ground - sprite.h, sprite.w, sprite.h, t, s, 1 - slot.haze);
        }

        // Still going up: blit only what's cleared the pad.
        const raise = this.raiseOf(`${lot.id}:${s}`, t);
        if (raise !== null && raise < 1) {
          const shown = this.drawRaise(raise, x, ground, sprite.w, sprite.h);
          ctx.drawImage(
            sprite.canvas,
            0,
            sprite.h - shown,
            sprite.w,
            shown,
            x,
            ground - shown,
            sprite.w,
            shown,
          );
          // It isn't working yet, so it doesn't light its windows and it certainly doesn't tip anything into the pipeline.
          continue;
        }

        ctx.drawImage(sprite.canvas, x, ground - sprite.h);
        if (dead) continue;

        if (slot.far) this.farLife(x, ground - sprite.h, sprite.w, sprite.h, t, s);
        else this.buildingLife(lot.id, x, ground - sprite.h, sprite.w, sprite.h, t, s);
        // Everything along the back edge stands on the pipeline, and every so often drops something into it.
        this.pipeEnd = Math.max(this.pipeEnd, x + Math.floor(sprite.w / 2));
        // Front building tips about once a second, the ones up the hill less, or the pipeline reads as solid puppy.
        if (this.chance(1.1 * (1 - slot.haze))) this.feedPipe(x + Math.floor(sprite.w / 2));
      }
    }
  }

  /** A lot with nothing on it yet: ground cleared, footings in, pegs at the corners. */
  private drawPad(lot: Lot): void {
    const ctx = this.ctx;
    const w = artCanvas(lot.art).w;
    const x = lot.x + Math.round(lot.w * 0.5 - w / 2);
    const y = lot.ground[0]!;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = CONCRETE;
    ctx.fillRect(x, y - 3, w, 3);
    ctx.fillStyle = CONCRETE_DARK;
    ctx.fillRect(x, y - 1, w, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.fillRect(x, y - 6, 1, 4);
    ctx.fillRect(x + w - 1, y - 6, 1, 4);
  }

  /** What a building two fields away does: a light on, and now and then something off the roof. */
  private farLife(x: number, top: number, w: number, h: number, t: number, idx: number): void {
    const beat = Math.sin(t * 1.3 + idx * 2.7);
    if (beat > 0.2) {
      this.ctx.fillStyle = beat > 0.8 ? "#fff0b8" : "#ffd782";
      this.ctx.fillRect(x + 1, top + Math.max(1, h >> 1), 1, 1);
    }
    if (this.chance(0.3)) this.puff(x + (w >> 1), top - 1, "steam", 2);
  }

  private markLevel(id: solo.SoloProducerId): number {
    return Math.max(0, Math.min(3, this.view.marks[id] ?? 0));
  }

  /** The hundred-owned mark, which is the one that gets its own effects. */
  private primed(id: solo.SoloProducerId): boolean {
    return this.markLevel(id) >= 3;
  }

  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0.02 || r <= 0) return;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(0.45, rgba(color, alpha * 0.42));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  private primeGlow(
    id: OutsideId,
    x: number,
    y: number,
    w: number,
    h: number,
    t: number,
    idx = 0,
    scale = 1,
  ): void {
    if (!this.primed(id)) return;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + idx * 2.3);
    this.glow(
      x + w / 2,
      y + h / 2,
      Math.max(w, h) * 0.8 * scale,
      PRIME_GLOW[id],
      0.3 * pulse * scale * this.lightGain(),
    );
  }

  private lightGain(): number {
    return { day: 0.34, dusk: 0.7, night: 1 }[this.phase];
  }

  private buildingLife(
    id: solo.SoloProducerId,
    x: number,
    top: number,
    w: number,
    h: number,
    t: number,
    idx: number,
  ): void {
    const ctx = this.ctx;
    switch (id) {
      case "lab": {
        for (const [k, c] of [2, 7, 12].entries()) {
          const beat = Math.sin(t * 1.7 + idx * 2.1 + k * 1.9);
          if (beat <= -0.2) continue;
          ctx.globalAlpha = 0.3 + 0.5 * Math.max(0, beat);
          ctx.fillStyle = "#e4fbff";
          ctx.fillRect(x + c, top + 6, 2, 2);
        }
        const glow = 0.5 + 0.5 * Math.sin(t * 1.1 + idx);
        ctx.globalAlpha = 0.2 + 0.35 * glow;
        ctx.fillStyle = "#b6f2fb";
        ctx.fillRect(x + 4, top + 1, 8, 3 - Math.round(glow));
        ctx.globalAlpha = 1;
        if (this.chance(0.5)) this.puff(x + 8, top, "steam", 2);
        break;
      }
      case "refinery": {
        const stack = top + [0, 2, 3, 3][this.markLevel("refinery")]!;
        const flick = fract(Math.sin(t * 11.3 + idx * 4.1) * 4375.85);
        const tall = 2 + Math.round(flick * 2);
        ctx.fillStyle = "#f0913c";
        ctx.fillRect(x + 11, stack - tall, 3, tall);
        ctx.fillStyle = "#ffe08a";
        ctx.fillRect(x + 12, stack - tall + 1, 1, Math.max(1, tall - 1));
        if (this.chance(0.9)) this.puff(x + 12, stack - tall - 1, "steam", 7);
        const lamp = Math.floor(t * 2.2 + idx) % 3;
        ctx.fillStyle = "#ffd782";
        ctx.fillRect(x + 2, top + h - 3 - lamp * 2, 1, 1);
        break;
      }
      case "tower": {
        // A rack of grow lights, cycling floor by floor: the light walks up the tower and starts again, so a row of them ripples.
        const floors = Math.max(1, Math.round((h - 7) / 3));
        const lit = Math.floor(t * 2.6 + idx * 1.7) % floors;
        for (const c of [2, 6]) {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "#e6ffc4";
          ctx.fillRect(x + c, top + 4 + lit * 3, 2, 2);
        }
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#c8f5a0";
        ctx.fillRect(x - 1, top + 3 + lit * 3, w + 2, 4);
        ctx.globalAlpha = 1;
        break;
      }
      case "reactor": {
        if (this.plumes.length < MAX_PLUMES && this.chance(11)) {
          this.plumes.push({
            x: x + w / 2 - 2 + (Math.random() - 0.5) * 6,
            y: top + 1 - Math.random() * 2,
            // Barely any sideways push to start with: it leaves the mouth as a column and only finds the wind once it's clear of the tower.
            vx: (Math.random() - 0.5) * 3,
            vy: -15 - Math.random() * 6,
            born: performance.now(),
            dur: 2600 + Math.random() * 1200,
            size: 3,
          });
        }
        const pulse =
          (0.5 + 0.5 * Math.sin(t * 2.7 + idx * 1.3)) * (0.8 + 0.2 * fract(Math.sin(t * 37 + idx) * 4375.85));
        ctx.fillStyle = "#9dfbe0";
        ctx.globalAlpha = 0.1 + 0.1 * pulse;
        ctx.fillRect(x + 2, top + 3, w - 4, 6);
        ctx.globalAlpha = 0.2 + 0.22 * pulse;
        ctx.fillRect(x + 4, top + 4, w - 8, 4);
        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.fillRect(x + 5, top + 5, 4, 2);
        ctx.globalAlpha = 0.08 + 0.07 * pulse;
        ctx.fillRect(x - 1, top + h - 2, w + 2, 2);
        ctx.globalAlpha = 1;
        if ((t * 0.75 + idx * 0.4) % 1 < 0.14) {
          ctx.fillStyle = "#ff5b4a";
          ctx.fillRect(x + 1, top + 1, 1, 1);
          ctx.fillRect(x + w - 2, top + 1, 1, 1);
        }
        break;
      }
      default: {
        // Anything else that ends up back here keeps the old night shift: a lit window and a wisp off the roof.
        if (this.chance(0.45)) this.puff(x + 2, top - 1, "steam");
        const beat = Math.sin(t * 1.4 + idx * 2.3);
        if (beat > 0.1) {
          ctx.fillStyle = beat > 0.75 ? "#fff0b8" : "#ffd782";
          ctx.fillRect(x + 2, top + 2, 2, 1);
        }
      }
    }
  }

  private drawPlumes(now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#eef3f7";
    this.plumes = this.plumes.filter((p) => {
      const age = now - p.born;
      if (age > p.dur) return false;
      const f = age / p.dur;
      p.x += p.vx * this.dt;
      p.y += p.vy * this.dt;
      p.vy *= 1 - this.dt * 0.35;
      p.vx += this.dt * 2.5;
      const size = p.size + Math.round(f * 4);
      ctx.globalAlpha = 0.6 * (1 - f * f);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, Math.max(1, size - 1));
      ctx.globalAlpha = 1;
      return true;
    });
  }

  // --- The pipeline --------------------------------------------------------

  /** Height of the pipe's run above the field, measured off the back baseline. */
  private pipeY(horizon: number): number {
    return horizon + 10;
  }

  private feedPipe(from: number): void {
    if (this.lumps.length >= MAX_LUMPS) return;
    this.lumps.push({ from: Math.max(8, Math.round(from)), d: 0 });
  }

  /** How far through building the pipeline we are, 0..1. */
  private pipeBuild(t: number, reach: number): number {
    if (reach <= 0) {
      // Nothing feeds it.
      this.sawNoPipe = true;
      this.pipeBuiltAt = null;
      return 0;
    }
    if (this.pipeBuiltAt === null) {
      // Already standing on the frame the tab opened: a restore, not an event.
      if (!this.sawNoPipe) return 1;
      this.pipeBuiltAt = t;
    }
    return clamp((t - this.pipeBuiltAt) / PIPE_BUILD_S, 0, 1);
  }

  private drawPipeline(horizon: number, yardY: number, dt: number, t: number): void {
    const ctx = this.ctx;
    const y = this.pipeY(horizon);
    // The riser runs right down the west side of the yard to just above the mound, because that's what it's filling.
    const foot = Math.max(yardY + 12, this.yardFloor() - 30);
    const reach = this.lumps.reduce((m, l) => Math.max(m, l.from), this.pipeEnd);
    const build = this.pipeBuild(t, reach);
    if (reach <= 0) return;
    // Nothing rides a pipe that isn't finished.
    if (build < 1) this.lumps.length = 0;

    // The four beats, each overlapping the next so the sequence flows rather than clicking from stage to stage.
    const ease = (v: number) => 1 - Math.pow(1 - clamp(v, 0, 1), 2);
    const riser = ease(build / 0.26);
    const chute = ease((build - 0.2) / 0.22);
    const run = ease((build - 0.34) / 0.46);
    const hopper = ease((build - 0.78) / 0.16);

    const body = "#a8b0b8";
    const edge = "#7f8891";
    const dark = "#68707a";
    const W = 9; // outside width of the trunk
    const runTo = 2; // left edge of the riser
    const midY = y + 3; // where the puppies ride inside the run
    // How far out from the riser the trunk has got.
    const runLen = Math.max(1, Math.round(reach * run));
    const posts = Math.round(reach * clamp(run * 1.18, 0, 1));

    ctx.fillStyle = dark;
    for (let px = 22; px < reach - 6; px += 26) {
      if (px > posts) break;
      ctx.fillRect(px, y + W, 1, 5);
      ctx.fillRect(px + 4, y + W, 1, 5);
      ctx.fillRect(px - 1, y + W + 5, 7, 1);
    }

    if (run > 0) {
      ctx.fillStyle = edge;
      ctx.fillRect(1, y, runLen, W);
      ctx.fillStyle = body;
      ctx.fillRect(1, y + 1, runLen, W - 3);
      ctx.fillStyle = "#c3cad1";
      ctx.fillRect(1, y + 1, runLen, 1);
      ctx.fillStyle = dark;
      for (let px = 14; px < runLen - 2; px += 18) ctx.fillRect(px, y, 1, W);
      if (run < 1) {
        ctx.fillStyle = fract(t * 13) > 0.4 ? "#fff0b8" : "#ffb454";
        ctx.fillRect(runLen, y + 2, 2, 3);
        if (this.chance(14)) this.puff(runLen, y + W + 2, "dust", (Math.random() - 0.5) * 20);
      }
    }

    if (hopper > 0) {
      const hx = Math.min(SCENE_W - 3, reach);
      const drop = Math.round((1 - hopper) * 12);
      ctx.fillStyle = dark;
      ctx.fillRect(hx - 10, y - 6 - drop, 12, 1);
      ctx.fillStyle = body;
      for (let i = 0; i < 5; i++) ctx.fillRect(hx - 9 + i, y - 5 - drop + i, 11 - i * 2, 1);
    }

    const top = Math.round(foot - (foot - y) * riser);
    ctx.fillStyle = edge;
    ctx.fillRect(runTo - 1, top, W, foot - top);
    ctx.fillStyle = body;
    ctx.fillRect(runTo, top, W - 2, foot - top);
    ctx.fillStyle = "#c3cad1";
    ctx.fillRect(runTo, top, 1, foot - top);
    ctx.fillStyle = dark;
    for (let cy = y + 14; cy < foot - 8; cy += 16) {
      if (cy < top) continue;
      ctx.fillRect(runTo - 2, cy, W + 2, 2);
    }
    if (riser < 1 && this.chance(12)) {
      this.puff(runTo + 4, foot - 2, "dust", (Math.random() - 0.5) * 18);
    }

    const chuteLen = Math.round(CHUTE_LEN * chute);
    for (let i = 0; i < chuteLen; i++) {
      const cx = runTo + i;
      const cy = Math.round(foot - 4 + i * CHUTE_SLOPE);
      ctx.fillStyle = dark;
      ctx.fillRect(cx, cy, 1, 1);
      ctx.fillRect(cx, cy + 8, 1, 1);
      ctx.fillStyle = body;
      ctx.fillRect(cx, cy + 1, 1, 7);
      ctx.fillStyle = "#c3cad1";
      ctx.fillRect(cx, cy + 1, 1, 1);
      if (i === 5 || i === 10) {
        ctx.fillStyle = dark;
        ctx.fillRect(cx, cy, 1, 9);
      }
    }
    const endX = runTo + chuteLen;
    const endY = Math.round(foot - 4 + chuteLen * CHUTE_SLOPE);
    ctx.fillStyle = dark;
    ctx.fillRect(endX, endY, 1, 9);

    if (build < 1) return;

    // Commissioning: one flash down the whole length of it as the last bolt goes in.
    const done = (t - (this.pipeBuiltAt ?? 0) - PIPE_BUILD_S) / 0.45;
    if (done >= 0 && done < 1) {
      ctx.fillStyle = rgba("#fff0b8", 0.5 * (1 - done));
      ctx.fillRect(1, y - 1, reach, W + 2);
      ctx.fillRect(runTo - 2, y, W + 2, foot - y);
    }

    // Outlined, so a hundred nose to tail still read as puppies rather than a stripe.
    const pup = artCanvas(PUPPY_SPRITE);
    this.lumps = this.lumps.filter((lump) => {
      lump.d += PIPE_SPEED * dt;
      const across = lump.from - runTo;
      if (lump.d < across) {
        const px = Math.round(lump.from - lump.d);
        ctx.drawImage(pup.canvas, px, midY - 2 + (px % 5 === 0 ? 0 : 1));
        return true;
      }
      const down = y + 2 + (lump.d - across);
      if (down < foot - 3) {
        ctx.drawImage(pup.canvas, runTo, Math.round(down));
        return true;
      }
      const out = down - (foot - 3);
      if (out > CHUTE_LEN + 6) {
        this.puff(runTo + CHUTE_LEN, endY + 8, "dust");
        return false;
      }
      ctx.drawImage(
        pup.canvas,
        runTo + Math.round(out),
        Math.round(foot - 3 + out * CHUTE_SLOPE),
      );
      return true;
    });
  }

  private drawField(t: number, now: number, horizon: number, yardY: number): void {
    const ctx = this.ctx;
    const rng = mulberry32(this.rngSeed);
    const top = horizon + 12;
    const depth = Math.max(20, yardY - top - 4);

    /** Ground-level y for a lane given as a fraction of the field's depth. */
    const lane = (f: number) => top + Math.round(depth * f);

    const stages = growthStages(this.mark("patch"));
    const pup = artCanvas(this.mark("patch"));
    const wiltShare = 1 - this.view.condition;
    const step = pup.w + 1;
    // A rig's width of headland at each end: the heatlamp stands off the ends of the rows.
    const marginX = 16;
    const usable = SCENE_W - marginX * 2;
    const perRow = Math.max(3, Math.floor(usable / step));
    const slots = perRow * FIELD_ROWS;
    const pups = Math.min(slots, this.view.working.patch ?? 0);
    const rowWidth = perRow * step - 1;
    const rowLeft = marginX + Math.round((usable - rowWidth) / 2);

    // Evenly through the band, the last row stopping short of the fence to leave the headland the machines turn on.
    const rowGround = (r: number) => lane(0.08 + (r * 0.78) / (FIELD_ROWS - 1));

    const tuft = artCanvas(TUFT);
    const flowers = artCanvas(FLOWERS);
    for (let i = 0; i < 14; i++) {
      const sprite = rng() < 0.3 ? flowers : tuft;
      const x = Math.floor(rng() * (SCENE_W - sprite.w));
      const foot = lane(rng());
      ctx.drawImage(sprite.canvas, x, foot - sprite.h);
    }

    this.beds.length = 0;
    this.rows.length = 0;
    this.drawTills(now);

    // The trough gets sited before anything is drawn into it, because the machines above need to know where they're aiming.
    const works =
      (this.view.working.hauler ?? 0) +
        (this.view.working.machine ?? 0) +
        (this.view.working.hand ?? 0) >
        0 || this.troughFill > 0;
    this.troughBox = works ? { x: 26, w: 112, y: lane(0.99) } : null;

    for (let r = 0; r < FIELD_ROWS; r++) {
      const count = Math.max(0, Math.min(perRow, pups - r * perRow));
      const left = rowLeft;
      const ground = rowGround(r);
      this.rows.push({ y: ground, left, right: left + rowWidth });

      const worked = count > 0 ? count * step + 1 : 0;
      ctx.fillStyle = this.view.condition < 0.7 ? "#8e8878" : "#bab5a6";
      ctx.fillRect(left - 2, ground - 2, worked, 3);
      ctx.fillStyle = "#8a8476";
      ctx.fillRect(left - 2, ground + 1, worked, 1);
      ctx.fillStyle = GRAVEL_DARK;
      for (let c = count; c < perRow; c++) ctx.fillRect(left + c * step, ground, step - 2, 1);

      // A hundred pens is a pup that glows in the dark.
      if (count > 0 && this.primed("patch")) {
        const lit = (0.7 + 0.3 * Math.sin(t * 1.2 + r)) * this.lightGain();
        const band = ctx.createLinearGradient(0, ground - pup.h - 3, 0, ground + 2);
        band.addColorStop(0, rgba(PRIME_GLOW.patch, 0));
        band.addColorStop(0.65, rgba(PRIME_GLOW.patch, 0.26 * lit));
        band.addColorStop(1, rgba(PRIME_GLOW.patch, 0));
        ctx.fillStyle = band;
        ctx.fillRect(left - 3, ground - pup.h - 3, worked + 2, pup.h + 5);
      }

      for (let c = 0; c < count; c++) {
        const i = r * perRow + c;
        const x = left + c * step;
        // Deterministic per pup rather than drawn from the layout's rng stream, so wilt doesn't reshuffle when the field changes size.
        const dry = fract(Math.sin(i * 12.9898) * 43758.5453) < wiltShare;
        this.beds.push({ x, y: ground, row: r, dry });

        // Stagger is a smooth function of position, so the field comes on in patches rather than flickering.
        this.stocked[i] ??= t - GROW_SECONDS * (0.5 + 0.5 * Math.sin(c * 0.7 + r * 2.1));

        const age = t - this.stocked[i]!;
        const stage =
          age >= GROW_SECONDS ? 3 : age >= GROW_SECONDS * 0.6 ? 2 : age >= GROW_SECONDS * 0.25 ? 1 : 0;
        // Wilt keeps the mark's silhouette and loses its colour, so an upgraded bed still reads as an upgraded bed while it's struggling.
        const art = stages[stage]!;
        const sprite = artCanvas(dry ? scruffy(art) : art);
        const sway = Math.sin(t * 1.1 + c * 0.4 + r) > 0.6 ? 1 : 0;
        ctx.drawImage(sprite.canvas, x + sway, ground - sprite.h);

        if (!dry && age > GROW_SECONDS + RIPE_SECONDS) this.lift(i, t);
      }
    }

    const lamps = shownCount(this.view.working.rig ?? 0, PLACEMENT.rig.cap, PLACEMENT.rig.spread);
    const lamp = artCanvas(this.mark("rig"));
    for (let i = 0; i < lamps; i++) {
      const row = this.rows[i % Math.max(1, this.rows.length)];
      const side = i % 2 === 0 ? 1 : -1;
      const x = row
        ? side > 0
          ? Math.min(SCENE_W - lamp.w - 2, row.right + 3)
          : Math.max(2, row.left - lamp.w - 3)
        : 14 + i * 42;
      const ground = row ? row.y : lane(0.2);
      this.primeGlow("rig", x, ground - lamp.h, lamp.w, lamp.h, t, i);
      ctx.drawImage(lamp.canvas, x, ground - lamp.h);
      if (this.chance(5)) {
        const reach = 10 + (0.5 + 0.5 * Math.sin(t * 0.8 + i)) * 22;
        this.puff(x + lamp.w / 2, ground - lamp.h + 2, "water", -side * reach);
      }
    }

    // Machines work the rows: they drive the headland just in front of a row, reach back over it, and something happens to the pup as they pass.
    for (const [id, fallback] of [
      ["hauler", 0.5],
      ["machine", 0.78],
    ] as const) {
      const place = PLACEMENT[id];
      const n = shownCount(this.view.working[id] ?? 0, place.cap, place.spread);
      const sprite = artCanvas(this.mark(id));
      const span = SCENE_W + sprite.w;
      for (let i = 0; i < n; i++) {
        // Rig takes rows from the front, van from the back, so on two rows they aren't nose to tail.
        const pick =
          id === "machine" ? this.rows.length - 1 - (i % Math.max(1, this.rows.length)) : i % Math.max(1, this.rows.length);
        const row = this.rows.length > (id === "machine" && this.rows.length < 2 ? 1 : 0) ? this.rows[pick] : undefined;
        const ground = row ? row.y + 5 : lane(fallback);
        // Phase and pace are hashed per machine rather than dealt out evenly.
        const h = fract(Math.sin((i + 1) * (id === "machine" ? 63.7 : 21.3)) * 4375.85);
        const pace = place.speed! * (0.78 + 0.44 * fract(h * 7.13));
        const x = Math.floor((((t * pace + h * span) % span) + span) % span) - sprite.w;
        const at = this.warp(x + sprite.w / 2, ground - sprite.h / 2);
        const mx = Math.round(at.x - sprite.w / 2);
        const my = Math.round(at.y - sprite.h / 2);
        this.primeGlow(id, mx, my, sprite.w, sprite.h, t, i);
        ctx.drawImage(sprite.canvas, mx, my);
        if (this.chance(2.5)) this.puff(x + 1, ground - 2, "dust");

        if (id === "hauler") {
          if (this.tracks.length < 90 && this.chance(14)) {
            this.tracks.push({ x: x + 1, y: ground - 1, born: now });
          }
        }

        // Both lift what's ready as they pass and unload via an auger over the trough, pup visibly going down it.
        const reach = id === "machine" ? 6 : 2;
        const key = `${id}${i}`;
        for (let b = 0; b < this.beds.length; b++) {
          const bed = this.beds[b]!;
          if (bed.dry || Math.abs(bed.y - (ground - 5)) > 3) continue;
          if (bed.x < x - reach || bed.x > x + sprite.w + reach) continue;
          if (this.readiness(b, t) < 1) continue;
          this.lift(b, t);
          this.machineLoad.set(key, (this.machineLoad.get(key) ?? 0) + 1);
        }
        // Full up: tip it out at the end of the row it's working and carry on.
        if ((this.machineLoad.get(key) ?? 0) >= MACHINE_LOAD && this.baskets.length < MAX_BASKETS) {
          this.machineLoad.set(key, 0);
          // No crew: tips straight into the trough rather than leaving baskets out forever.
          if (this.hands.length === 0) {
            this.troughFill = Math.min(TROUGH_CAP, this.troughFill + BASKET_WORTH);
            continue;
          }
          // Just inside the end of the row: a basket half off-screen is one nobody sees fetched.
          const at = row
            ? clamp(row.right - 8, 4, SCENE_W - 14)
            : clamp(x + sprite.w, 4, SCENE_W - 14);
          this.baskets.push({
            id: this.basketId++,
            x: at + (this.baskets.length % 3) * 3,
            y: ground + 3,
            born: now,
          });
          this.puff(at + 4, ground + 2, "dust");
        }
      }
    }

    // Everything broken is parked in one row along the fence, greyed out.
    let deadX = 6;
    for (const id of ORDER) {
      const place = PLACEMENT[id];
      if (place.band === "sky" || place.band === "back") continue;
      const brokenN = shownCount(this.view.broken[id] ?? 0, place.cap, place.spread);
      for (let i = 0; i < brokenN; i++) {
        const dead = artTinted(this.mark(id), "#6b6b74", 0.62);
        if (deadX + dead.w > SCENE_W - 6) break;
        ctx.drawImage(dead.canvas, deadX, lane(0.99) - dead.h);
        deadX += dead.w + 3;
      }
    }

    const { deck, hang } = this.decks(horizon);

    this.stepFlyers(
      shownCount(this.view.working.airship ?? 0, PLACEMENT.airship.cap, PLACEMENT.airship.spread),
      artCanvas(this.mark("airship")),
      t,
      deck,
    );

    const place = PLACEMENT.orbital;
    const n = shownCount(this.view.working.orbital ?? 0, place.cap, place.spread ?? 1);
    const sprite = artCanvas(this.mark("orbital"));
    for (let i = 0; i < n; i++) {
      const h = skyHash(i, "orbital");
      const h2 = fract(h * 137.7);
      const h3 = fract(h2 * 91.3);
      // Off `cap` rather than `n`, so buying the fourth orbital kennel doesn't shuffle the three already up there.
      const span = SCENE_W + sprite.w;
      const pace = (place.speed ?? 1) * (0.9 + 0.2 * h);
      const start = (i / place.cap + h2 * 0.12) * span;
      const gx = Math.floor((((t * pace + start) % span) + span) % span) - sprite.w;
      // Own lane in the middle deck plus a slow rise and fall, never climbing into what hangs above.
      const room = Math.max(0, deck - sprite.h - 3 - hang);
      const lane = hang + Math.round(h3 * room);
      const gy = lane + Math.round(Math.sin(t * (0.25 + h2 * 0.4) + h * 9) * 3);
      const at = this.warp(gx + sprite.w / 2, gy + sprite.h / 2);
      const x = Math.round(at.x - sprite.w / 2);
      const y = Math.round(at.y - sprite.h / 2);
      this.primeGlow("orbital", x, y, sprite.w, sprite.h, t, i);
      ctx.drawImage(sprite.canvas, x, y);

      // The orbital kennel runs a grow-light down onto the rows in sweeps.
      const cycle = (t * 0.14 + i * 0.37) % 1;
      if (cycle < 0.22) this.drawBeam(x + sprite.w / 2, y + sprite.h, t, cycle / 0.22);
    }

    this.stepDrops(t);
    this.stepTrough(now);
  }

  private drawWells(t: number): void {
    const hole = artCanvas(this.mark("singularity"));
    // Before the holes, so what's going round one passes behind it and is gone rather than sitting on top of the thing eating it.
    this.stepCaught();
    for (const [i, well] of this.wells.entries()) {
      this.drawPulse(well.cx, well.cy, t + i, 1 + well.dive * 1.6);
      this.primeGlow("singularity", well.x, well.y, hole.w, hole.h, t, i);
      this.ctx.drawImage(hole.canvas, well.x, well.y);
    }
  }

  private stepCaught(): void {
    const ctx = this.ctx;
    this.caught = this.caught.filter((c) => {
      const well = this.wells[c.well];
      // Whatever had it isn't on the canvas any more, so neither is this.
      if (!well) return false;
      const step = catchOrbit(c.r, this.dt);
      c.r = step.r;
      c.a += step.turn;
      const tilt = catchTilt(c.r);
      const x = well.cx + Math.cos(c.a) * c.r;
      const y = well.cy + Math.sin(c.a) * c.r * tilt;
      if (c.r <= 3) {
        ctx.fillStyle = "#f0e0ff";
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        return false;
      }
      const sprite = artCanvas(c.art);
      const fade = Math.min(1, (c.r - 3) / 5);
      ctx.fillStyle = rgba("#c9a4f0", 0.45 * fade);
      for (const back of [0.4, 0.8]) {
        const bx = well.cx + Math.cos(c.a - back) * (c.r + 2);
        const by = well.cy + Math.sin(c.a - back) * (c.r + 2) * tilt;
        ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      }
      ctx.globalAlpha = fade;
      ctx.drawImage(sprite.canvas, Math.round(x - sprite.w / 2), Math.round(y - sprite.h / 2));
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawTills(now: number): void {
    const ctx = this.ctx;
    this.tracks = this.tracks.filter((track) => {
      const age = now - track.born;
      if (age > TRACK_MS) return false;
      ctx.globalAlpha = 0.55 * (1 - age / TRACK_MS);
      ctx.fillStyle = CONCRETE_DARK;
      ctx.fillRect(Math.round(track.x), Math.round(track.y), 3, 2);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private stepFlyers(
    n: number,
    sprite: { w: number; h: number; canvas: CanvasImageSource },
    t: number,
    deck: number,
  ): void {
    const ctx = this.ctx;
    // The bottom of the sky, and the bottom of what a zeppelin is allowed to climb to: they work the rows, so they belong under the traffic.
    const band = { top: Math.round(deck * 0.5), bottom: Math.max(2, deck - sprite.h) };
    while (this.flyers.length < n) this.flyers.push(this.newFlyer(sprite.w, band));
    if (this.flyers.length > n) this.flyers.length = Math.max(0, n);

    for (const [i, f] of this.flyers.entries()) {
      if (f.hold > 0) {
        f.hold -= this.dt;
        f.drip -= this.dt;
        if (f.drip <= 0) {
          f.drip = 0.22 + Math.random() * 0.16;
          if (this.drops.length < 24) this.dropPupNear(f.x + sprite.w / 2, f.y + sprite.h);
        }
        if (f.hold <= 0) this.aimFlyer(f, sprite.w, band);
      } else {
        f.t += this.dt;
        const p = Math.min(1, f.t / f.dur);
        const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
        f.x = f.x0 + (f.tx - f.x0) * e;
        f.y = f.y0 + (f.ty - f.y0) * e;
        if (p >= 1) {
          f.hold = FLY_HOLD + Math.random() * 3.6;
          f.drip = 0.1;
        }
      }
      const bob = f.hold > 0 ? Math.round(Math.sin(t * 3.1 + f.x) * 1) : 0;
      const at = this.warp(f.x + sprite.w / 2, f.y + bob + sprite.h / 2);
      const fx = Math.round(at.x - sprite.w / 2);
      const fy = Math.round(at.y - sprite.h / 2);
      this.primeGlow("airship", fx, fy, sprite.w, sprite.h, t, i);
      ctx.drawImage(sprite.canvas, fx, fy);
    }
  }

  private newFlyer(w: number, band: { top: number; bottom: number }): Flyer {
    const x = Math.random() * (SCENE_W - w);
    const y = band.top + Math.random() * Math.max(0, band.bottom - band.top);
    const f: Flyer = { x, y, x0: x, y0: y, tx: x, ty: y, t: 0, dur: 1, hold: 0, drip: 0 };
    this.aimFlyer(f, w, band);
    return f;
  }

  /** Send a zeppelin somewhere worth going: over the patch that needs it most, and not over one another zeppelin is already working. */
  private aimFlyer(f: Flyer, w: number, band: { top: number; bottom: number }): void {
    let tx = Math.random() * (SCENE_W - w);
    if (this.beds.length > 0) {
      const taken = this.flyers.filter((o) => o !== f).map((o) => o.tx);
      /** Ripest wins, but anything under another zeppelin is worth much less. */
      const worth = (i: number) => {
        const x = clamp((this.beds[i]?.x ?? 0) - w / 2, 0, SCENE_W - w);
        const crowded = taken.some((o) => Math.abs(o - x) < w + 6);
        return (this.stocked[i] ?? 0) - (crowded ? 1e6 : 0);
      };
      let pick = Math.floor(Math.random() * this.beds.length);
      for (let i = 0; i < 7; i++) {
        const other = Math.floor(Math.random() * this.beds.length);
        if (worth(other) > worth(pick)) pick = other;
      }
      tx = clamp((this.beds[pick]?.x ?? tx) - w / 2, 0, SCENE_W - w);
    }
    f.x0 = f.x;
    f.y0 = f.y;
    f.tx = tx;
    f.ty = clamp(f.y + (Math.random() - 0.5) * 34, band.top, band.bottom);
    f.t = 0;
    f.hold = 0;
    f.dur = Math.max(1, Math.hypot(f.tx - f.x, f.ty - f.y) / FLY_SPEED);
  }

  /** A hovering machine whose drops all sail off to the far side of the yard is a machine that didn't need to stop. */
  private dropPupNear(x: number, y: number): void {
    if (this.beds.length === 0) return;
    let pick = -1;
    let best = Infinity;
    for (let i = 0; i < 8; i++) {
      const other = Math.floor(Math.random() * this.beds.length);
      const bed = this.beds[other];
      if (!bed) continue;
      // Nearest to the nozzle, with a nudge towards the ones furthest behind.
      const score = Math.abs(bed.x + 3 - x) - (this.clock - (this.stocked[other] ?? 0)) * 0.4;
      if (score < best) {
        best = score;
        pick = other;
      }
    }
    if (pick < 0) return;
    this.drops.push({ x, y, vy: 30 + Math.random() * 12, pup: pick });
  }

  private stepDrops(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#e6d78a";
    this.drops = this.drops.filter((drop) => {
      drop.y += drop.vy * this.dt;
      const bed = this.beds[drop.pup];
      if (!bed || drop.y >= bed.y) {
        if (bed) {
          this.stocked[drop.pup] = Math.min(t, (this.stocked[drop.pup] ?? t) - GROW_SECONDS * 0.25);
          this.puff(bed.x + 3, bed.y - 2, "water");
        }
        return false;
      }
      drop.x += (bed.x + 3 - drop.x) * Math.min(1, this.dt * 1.6);
      // Unless something with more of an opinion is in the way.
      const at = this.warp(drop.x, drop.y);
      ctx.fillRect(Math.round(at.x), Math.round(at.y), 1, 2);
      return true;
    });
  }

  private drawBeam(x: number, y: number, t: number, progress: number): void {
    const ctx = this.ctx;
    const row = this.rows[this.rows.length - 1];
    const floor = row ? row.y : this.yardTop() - 6;
    if (floor <= y) return;
    ctx.globalAlpha = 0.16 * Math.sin(progress * Math.PI);
    ctx.fillStyle = "#d8f5b0";
    const half = 3;
    ctx.fillRect(Math.round(x) - half, Math.round(y), half * 2, Math.round(floor - y));
    ctx.globalAlpha = 1;
    if (this.chance(3)) {
      for (let b = 0; b < this.beds.length; b++) {
        const bed = this.beds[b]!;
        if (Math.abs(bed.x + 3 - x) > half + 2) continue;
        this.stocked[b] = Math.min(t, (this.stocked[b] ?? t) - GROW_SECONDS * 0.06);
      }
    }
  }

  private drawPulse(cx: number, cy: number, t: number, scale = 1): void {
    const ctx = this.ctx;
    const phase = (t * 0.55) % 1;
    const r = Math.round((4 + phase * 9) * scale);
    ctx.globalAlpha = 0.5 * (1 - phase);
    ctx.fillStyle = "#c9a4f0";
    for (const [dx, dy] of [
      [0, -r],
      [0, r],
      [-r, 0],
      [r, 0],
    ] as const) {
      ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  private drawPuffs(now: number, dt: number): void {
    const ctx = this.ctx;
    this.puffs = this.puffs.filter((p) => {
      const age = now - p.born;
      if (age > p.dur) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 0.7 * (1 - age / p.dur);
      ctx.fillStyle = p.color;
      // The loosest thing on the ground, so the first thing off it.
      const at = this.warp(p.x, p.y);
      ctx.fillRect(Math.round(at.x), Math.round(at.y), p.size, p.size);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawFence(yardY: number): void {
    const ctx = this.ctx;
    const fence = artCanvas(FENCE);
    const top = yardY - fence.h + 1;
    for (let x = 0; x < SCENE_W; x += fence.w) {
      ctx.drawImage(fence.canvas, x, top);
    }

    const flag = artCanvas(FLAG);
    ctx.fillStyle = rgba(INK, 0.55);
    for (let x = 0; x < SCENE_W; x++) {
      ctx.fillRect(x, top - 5 + this.sag(x), 1, 1);
    }
    for (let i = 0; i * FLAG_STEP < SCENE_W; i++) {
      const x = i * FLAG_STEP;
      ctx.fillStyle = BUNTING[i % BUNTING.length]!;
      const y = top - 4 + this.sag(x);
      for (let r = 0; r < flag.h; r++) {
        const row = FLAG.rows[r]!;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "f") ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
  }

  /** How far the bunting dips at `x`. */
  private sag(x: number): number {
    return Math.round(1.5 + 1.5 * Math.cos((x / SCENE_W) * Math.PI * 5.6));
  }

  // --- The hoard -----------------------------------------------------------

  private stepHoard(dt: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) {
      // Adopt the hoard rather than animating up from zero, or every reload replays your whole mill's history at you.
      if (!this.sawView) return;
      this.shown = target;
      this.shownLayout = yardLayout(target);
      return;
    }

    const k = 1 - Math.exp(-dt * 3.2);
    const gap = target - this.shown;
    this.shown += gap * k;
    // Snap once it's close, so the pack settles instead of creeping forever.
    if (Math.abs(gap) < Math.max(0.5, target * 1e-4)) this.shown = target;

    const next = yardLayout(this.shown);
    if (!sameLayout(next, this.shownLayout)) this.shownLayout = next;
  }

  /** The front edge of the yard: where a dog standing at the very front stands. */
  private yardFloor(): number {
    return this.sh - 4;
  }

  /** The back of the yard the pack roams: right up under the fence. */
  private packBack(): number {
    return this.yardTop() + 5;
  }

  /** The front of it, which runs past the bottom edge on purpose. */
  private packFront(): number {
    return this.yardFloor() + PACK_SPILL;
  }

  private drawHoard(): void {
    // Feet are the only depth cue — nothing is drawn scaled — so `y` sorts dogs, bowls and tufts alike.
    const queue: { y: number; go: () => void }[] = [];
    const back = this.packBack();
    const front = this.packFront();
    for (const [i, at] of BOWLS.entries()) {
      const art = i % 2 === 0 ? BOWL : BOWL_RED;
      const sprite = artCanvas(art);
      const y = Math.round(back + (front - back) * at.d);
      queue.push({
        y,
        go: () => {
          this.propShadow(at.x, y, sprite.w);
          this.ctx.drawImage(sprite.canvas, at.x, y - sprite.h);
        },
      });
    }
    const rng = mulberry32(this.rngSeed ^ 0x51d2);
    const tuft = artCanvas(TUFT);
    const flowers = artCanvas(FLOWERS);
    for (let i = 0; i < 12; i++) {
      const sprite = rng() < 0.35 ? flowers : tuft;
      const x = Math.floor(rng() * (SCENE_W - sprite.w));
      const y = Math.round(back + (front - back) * rng());
      // The landing stays bare, weeds included — a tuft of grass in front of a half-grown puppy hides as much of it as a dog would.
      if (this.onTheLanding(x + sprite.w, y) || onPitch(x + sprite.w, y, front)) continue;
      queue.push({ y, go: () => this.ctx.drawImage(sprite.canvas, x, y - sprite.h) });
    }
    for (const dog of this.pack) queue.push({ y: dog.y, go: () => this.drawPup(dog) });
    // The ball's depth is whatever it's currently attached to, plus a hair, so it draws just in front of it.
    const hand = this.handAt();
    queue.push({ y: hand.y, go: () => this.drawHandler() });
    const ballY =
      this.fetch.phase === "carry" && this.fetch.dog
        ? this.fetch.dog.y + 1
        : this.fetch.phase === "wait"
          ? hand.y + 1
          : this.fetch.y;
    queue.push({ y: ballY, go: () => this.drawFetch() });
    queue.sort((a, b) => a.y - b.y);
    for (const item of queue) item.go();
  }

  /** Reconcile the pack against what you're holding, then let every dog in it get on with whatever it's doing. */
  private stepPack(dt: number, t: number): void {
    const want = Math.min(PACK_CAP, Math.max(0, Math.round(this.shownLayout.pack)));
    let here = this.owed;
    for (const dog of this.pack) if (!dog.leaving) here++;

    if (here < want) {
      // How far behind decides *where* they come in, and the rule is about what the gap means rather than about the clock.
      const missing = want - here;
      if (missing > 3) {
        for (let i = 0; i < missing; i++) this.pack.push(this.newPup(t, true));
      } else {
        if (this.owed === 0) this.owedSince = t;
        this.owed = Math.min(OWED_CAP, this.owed + missing);
      }
    } else if (here > want) {
      let over = here - want;
      // Cancel the tab before turning anyone out: an unarrived dog is cheaper to un-promise.
      const unpromise = Math.min(over, this.owed);
      this.owed -= unpromise;
      over -= unpromise;
      for (const dog of this.pack) {
        if (over <= 0) break;
        if (dog.leaving) continue;
        dog.leaving = true;
        dog.doing = "trot";
        dog.vx = 20 + Math.random() * 8;
        dog.vy = 0;
        dog.until = t + 60;
        over--;
      }
    }

    const back = this.packBack();
    const front = this.packFront();
    const kept: PackPup[] = [];
    for (const dog of this.pack) {
      if (t >= dog.until && !dog.fetching) pickAction(dog, t);
      if (dog.doing === "trot" || dog.doing === "zoom") {
        dog.x += dog.vx * dt;
        dog.y += dog.vy * dt;
        dog.walked += Math.abs(dog.vx) * dt;
        if (dog.y < back) {
          dog.y = back;
          dog.vy = Math.abs(dog.vy);
        } else if (dog.y > front) {
          dog.y = front;
          dog.vy = -Math.abs(dog.vy);
        }
        if (!dog.leaving) {
          if (dog.x < PACK_LEFT) {
            dog.x = PACK_LEFT;
            dog.vx = Math.abs(dog.vx);
          } else if (dog.x > PACK_RIGHT) {
            dog.x = PACK_RIGHT;
            dog.vx = -Math.abs(dog.vx);
          }
        }
      }
      this.clearTheLanding(dog, t);
      if (dog.leaving && dog.x > SCENE_W + 2) continue;
      kept.push(dog);
    }
    this.pack = kept;

    // Nothing coming down the slide (no producers, or a dry trough): let them in at the gate.
    if (this.owed > 0 && t - this.owedSince > OWED_TIMEOUT) {
      this.owedSince = t;
      this.owed--;
      this.pack.push(this.newPup(t, false));
    }
  }

  private onTheLanding(x: number, y: number): boolean {
    return onLanding(x, y, this.packBack(), this.packFront());
  }

  /** Move a dog off the landing under the chute and off the handler's spot at the front. */
  private clearTheLanding(dog: PackPup, t: number): void {
    if (dog.leaving || dog.fetching) return;
    if (this.clock - dog.born < GROW_SMALL) return;
    const landing = this.onTheLanding(dog.x, dog.y);
    if (!landing && !onPitch(dog.x, dog.y, this.packFront())) return;
    const away = landing ? 1 : -1;
    if (dog.doing === "trot" && dog.vx > 0 && dog.vy * away > 0) return;
    dog.doing = "trot";
    dog.vx = PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]);
    dog.vy = away * (3 + Math.random() * 5);
    dog.until = t + 1.5 + Math.random() * 1.5;
    dog.home = DROP_CLEAR_X + 8 + Math.random() * (PACK_RIGHT - DROP_CLEAR_X - 8);
  }

  /** Settle one off the tab, at the point on the ground where it landed. */
  private deliver(x: number, y: number): void {
    if (this.owed <= 0) return;
    this.owed--;
    const dog = this.newPup(this.clock, false);
    dog.x = clamp(x - 5, PACK_LEFT, PACK_RIGHT);
    dog.y = clamp(y, this.packBack(), this.packFront());
    this.pack.push(dog);
  }

  /** A new one: in at the drop where everything else in the yard arrives, or anywhere at all if the yard is being filled from cold. */
  private newPup(t: number, scatter: boolean): PackPup {
    const back = this.packBack();
    const front = this.packFront();
    const dog: PackPup = {
      x: scatter ? PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT) : DROP_X + Math.random() * 14 - 7,
      y: back + Math.random() * Math.max(1, front - back),
      home: PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT),
      vx: 0,
      vy: 0,
      doing: "stand",
      until: 0,
      walked: Math.random() * 40,
      coat: Math.floor(Math.random() * PACK_COATS),
      leaving: false,
      fetching: false,
      born: t,
    };
    if (scatter) {
      pickAction(dog, t);
    } else {
      dog.doing = "trot";
      dog.vx = 1.45 * (PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]));
      dog.vy = (Math.random() - 0.5) * 4;
      dog.until = t + 1.6 + Math.random() * 2.5;
    }
    return dog;
  }

  private handAt(): { x: number; y: number } {
    return { x: HAND_X, y: this.packFront() };
  }

  private stepFetch(t: number): void {
    const hand = this.handAt();
    const back = this.packBack();
    const front = this.packFront();
    const f = this.fetch;

    // The dog is only ever borrowed.
    if (f.dog && (!this.pack.includes(f.dog) || f.dog.leaving)) {
      f.dog.fetching = false;
      f.dog = null;
      if (f.phase === "carry") f.phase = "chase";
    }

    if (f.phase === "wait") {
      f.x = hand.x + 8;
      f.y = hand.y - 2;
      if (t < f.until) return;
      f.from = t;
      f.to = t + 0.85;
      f.tx = fetchTarget(hand.x);
      f.ty = back + Math.random() * Math.max(1, front - back);
      f.phase = "fly";
      return;
    }

    if (f.phase === "fly") {
      if (t < f.to) return;
      f.x = f.tx;
      f.y = f.ty;
      f.phase = "chase";
      this.puff(f.tx, f.ty, "dust", -10);
      this.puff(f.tx + 2, f.ty, "dust", 10);
      return;
    }

    if (f.phase === "chase") {
      if (!f.dog) {
        // Whoever's nearest and free.
        let best: PackPup | null = null;
        let near = Infinity;
        for (const dog of this.pack) {
          if (dog.leaving || dog.fetching) continue;
          const d = Math.abs(dog.x - f.x) + Math.abs(dog.y - f.y) * 2;
          if (d < near) {
            near = d;
            best = dog;
          }
        }
        if (!best) {
          f.phase = "wait";
          f.until = t + FETCH_REST[0];
          return;
        }
        best.fetching = true;
        f.dog = best;
      }
      const dog = f.dog!;
      this.drive(dog, f.x, f.y, t);
      if (Math.abs(dog.x - f.x) < 5 && Math.abs(dog.y - f.y) < 4) f.phase = "carry";
      return;
    }

    const dog = f.dog;
    if (!dog) {
      f.phase = "wait";
      f.until = t + FETCH_REST[0];
      return;
    }
    this.drive(dog, hand.x + 4, hand.y, t);
    if (Math.abs(dog.x - hand.x - 4) < 6 && Math.abs(dog.y - hand.y) < 5) {
      dog.fetching = false;
      dog.until = t;
      f.dog = null;
      f.phase = "wait";
      f.until = t + FETCH_REST[0] + Math.random() * (FETCH_REST[1] - FETCH_REST[0]);
    }
  }

  private drive(dog: PackPup, x: number, y: number, t: number): void {
    const dx = x - dog.x;
    const dy = y - dog.y;
    dog.doing = "trot";
    dog.until = t + 1;
    dog.vx = Math.abs(dx) < 2 ? 0 : Math.sign(dx) * FETCH_SPEED;
    dog.vy = Math.abs(dy) < 2 ? 0 : Math.sign(dy) * FETCH_SPEED * 0.35;
    // Facing comes off `vx`, and a dog walking straight up the yard has none.
    if (dog.vx === 0) dog.vx = Math.sign(x - dog.x) * 0.001 || 1;
  }

  private drawHandler(): void {
    const ctx = this.ctx;
    const hand = this.handAt();
    const sprite = artCanvas(KENNEL_HAND);
    this.propShadow(hand.x, hand.y, sprite.w);
    ctx.drawImage(sprite.canvas, hand.x, hand.y - sprite.h);
  }

  private drawFetch(): void {
    const ctx = this.ctx;
    const sprite = artCanvas(BALL);
    const f = this.fetch;
    const t = this.clock;
    let x = f.x;
    let y = f.y;
    let lift = 0;

    if (f.phase === "fly" && f.to > f.from) {
      const p = (t - f.from) / (f.to - f.from);
      x = f.x + (f.tx - f.x) * p;
      y = f.y + (f.ty - f.y) * p;
      lift = Math.round(Math.sin(p * Math.PI) * 16);
    } else if (f.phase === "carry" && f.dog) {
      x = f.dog.x + (f.dog.vx < 0 ? -1 : 7);
      y = f.dog.y - 8;
    } else if (f.phase === "wait") {
      const hand = this.handAt();
      x = hand.x + 8;
      y = hand.y - 2;
    }

    // A shadow on the ground it's over, which during the throw is the only cue for where it's going to come down.
    if (f.phase !== "carry") {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = INK;
      ctx.fillRect(Math.round(x), Math.round(y) - 1, sprite.w, 1);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(sprite.canvas, Math.round(x), Math.round(y) - sprite.h - lift);
  }

  private drawPup(dog: PackPup): void {
    const ctx = this.ctx;
    const step = Math.floor(dog.walked / PACK_STRIDE) % 2;
    const age = this.clock - dog.born;
    // Growing overrides whatever it thinks it's doing.
    const pose =
      age < GROW_SMALL
        ? POSE.newborn
        : dog.doing === "sit"
          ? // Sitting alternates the tail on the clock rather than on distance,
            POSE.sit + (Math.floor(this.clock * 1.5 + dog.x) % 2)
          : dog.doing === "rest"
            ? POSE.loaf
            : dog.doing === "sleep"
              ? POSE.sleep
              : dog.doing === "zoom"
                ? POSE.run + step
                : POSE.trot + step;
    const sprite = artCanvas(
      age < GROW_CARRIED ? PUPPY_SPRITE : PACK_POSES[dog.coat]![dog.vx < 0 ? 1 : 0]![pose]!,
    );
    const x = Math.round(dog.x);
    const y = Math.round(dog.y);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 1, y - 1, sprite.w - 2, 1);
    ctx.globalAlpha = 1;
    // A pixel of lift on the off step at a walk, and a proper bounce at a sprint — a zooming dog that stays pinned to the floor just looks fast.
    const bob =
      dog.doing === "zoom"
        ? Math.round(Math.abs(Math.sin(dog.walked / 7)) * 3)
        : dog.doing === "sleep"
          ? (Math.sin(this.clock * 0.9 + dog.x) > 0.6 ? 1 : 0)
          : dog.doing === "trot" && step === 1
            ? 1
            : 0;
    ctx.drawImage(sprite.canvas, x, y - sprite.h - bob);
    if (dog.doing === "sleep") this.drawSleep(dog, x, y - sprite.h);
  }

  private drawSleep(dog: PackPup, x: number, top: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(ZZZ);
    const p = fract(this.clock / 3.2 + dog.x * 0.11);
    // Nothing for the first stretch of the cycle, so they come one at a time rather than as a stream.
    if (p > 0.75) return;
    const rise = p / 0.75;
    ctx.globalAlpha = 0.85 * (1 - rise * rise);
    ctx.drawImage(sprite.canvas, x + (dog.vx < 0 ? -3 : 11), Math.round(top - 2 - rise * 7));
    ctx.globalAlpha = 1;
  }

  private propShadow(x: number, foot: number, w: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = INK;
    ctx.fillRect(x, foot - 1, w, 1);
    ctx.fillRect(x + 2, foot, w - 4, 1);
    ctx.globalAlpha = 1;
  }

  // --- The trough ----------------------------------------------------------

  /** Where a hand goes after it's tipped its load in: back up the headland, towards the work. */
  private turnAround(hand: Hand, yardY: number): { x: number; y: number } {
    return {
      x: clamp(hand.x + (Math.random() - 0.5) * 22, 4, SCENE_W - 10),
      y: clamp(hand.y - 6 - Math.random() * 12, this.fieldTop() + 14, yardY - 2),
    };
  }

  /** The nearest basket nobody's already walking to. */
  private claimBasket(hand: Hand): number {
    let best = -1;
    let bestD = Infinity;
    for (const basket of this.baskets) {
      if (this.hands.some((h) => h.basket === basket.id)) continue;
      const d = Math.hypot(basket.x - hand.x, basket.y - hand.y);
      if (d < bestD) {
        bestD = d;
        best = basket.id;
      }
    }
    return best;
  }

  private drawBaskets(now: number): void {
    const sprite = artCanvas(BASKET);
    for (const basket of this.baskets) {
      const age = now - basket.born;
      const drop = age < 220 ? Math.round(4 * (1 - age / 220)) : 0;
      this.ctx.drawImage(sprite.canvas, Math.round(basket.x), Math.round(basket.y) - sprite.h - drop);
    }
  }

  /** Drain a full trough into the yard, and draw the thing either way. */
  private stepTrough(now: number): void {
    const box = this.troughBox;
    if (!box) return;
    this.drawTrough(box);

    this.troughClock += this.dt;
    const interval = TROUGH_DRAIN * (1 - 0.75 * (this.troughFill / TROUGH_CAP));
    while (this.troughClock >= interval) {
      this.troughClock -= interval;
      if (this.troughFill <= 0) {
        this.troughClock = 0;
        break;
      }
      this.troughFill--;
      if (this.hauls.length >= MAX_HAULS) continue;
      const run = this.spout(box);
      const mid = (MillScene.SPOUT_W - 7) / 2;
      this.hauls.push({
        x0: run.x0 + mid,
        y0: run.y0 - 4,
        x1: run.x1 + mid,
        y1: run.y1 + 3,
        born: now,
        dur: 620,
        slide: true,
      });
    }
  }

  private drawTrough(box: { x: number; w: number; y: number }): void {
    const ctx = this.ctx;
    const { x, w, y } = box;
    const top = y - 9;

    ctx.fillStyle = "#5e3e29";
    ctx.fillRect(x + 4, y - 2, 3, 3);
    ctx.fillRect(x + w - 7, y - 2, 3, 3);
    ctx.fillStyle = INK;
    ctx.fillRect(x, top, 2, 9);
    ctx.fillRect(x + w - 2, top, 2, 9);
    ctx.fillRect(x, y - 2, w, 2);
    ctx.fillStyle = "#a97a52";
    ctx.fillRect(x + 2, top, w - 4, 7);
    ctx.fillStyle = "#7a5237";
    ctx.fillRect(x + 2, top, w - 4, 1);
    ctx.fillStyle = "#5e3e29";
    for (let sx = x + 8; sx < x + w - 6; sx += 14) ctx.fillRect(sx, top, 1, 7);

    const depth = Math.min(6, Math.ceil((this.troughFill / TROUGH_CAP) * 6));
    if (depth > 0) {
      ctx.fillStyle = "#c98b4b";
      ctx.fillRect(x + 2, y - 2 - depth, w - 4, depth);
      ctx.fillStyle = "#e2b077";
      for (let sx = x + 2; sx < x + w - 3; sx += 3) ctx.fillRect(sx, y - 2 - depth, 2, 1);
    }

  }

  /** The outfall: a gate in the trough floor near the low end, down over the fence to a mouth above the mound. */
  private spout(box: { x: number; w: number; y: number }): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } {
    const x0 = box.x + 22;
    const y0 = box.y - 2;
    // Ends over the drop, low enough that what comes off it is setting down on the ground rather than being thrown at it.
    return {
      x0,
      y0,
      x1: DROP_X - 2,
      y1: Math.max(y0 + 16, this.packBack() - 10),
    };
  }

  private static SPOUT_W = 9;

  private drawSpout(box: { x: number; w: number; y: number }): void {
    const ctx = this.ctx;
    const { x0, y0, x1, y1 } = this.spout(box);
    const W = MillScene.SPOUT_W;
    const fall = y1 - y0;

    ctx.fillStyle = "#5e3e29";
    ctx.fillRect(x0, y0 - 3, W, 3);

    for (let i = 0; i <= fall; i++) {
      const sx = Math.round(x0 + ((x1 - x0) * i) / fall);
      const sy = y0 + i;
      ctx.fillStyle = INK;
      ctx.fillRect(sx, sy, 1, 1);
      ctx.fillStyle = "#5e3e29";
      ctx.fillRect(sx + 1, sy, 1, 1);
      ctx.fillStyle = "#8a5c3c";
      ctx.fillRect(sx + 2, sy, W - 4, 1);
      ctx.fillStyle = "#a97a52";
      ctx.fillRect(sx + W - 2, sy, 1, 1);
      ctx.fillStyle = "#c39466";
      ctx.fillRect(sx + W - 1, sy, 1, 1);
    }

    ctx.fillStyle = "#c39466";
    ctx.fillRect(x1, y1, W, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(x1 - 1, y1 + 1, W + 2, 2);
  }

  private drawHauls(now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(PUPPY_SPRITE);
    this.hauls = this.hauls.filter((h) => {
      const p = (now - h.born) / h.dur;
      if (p > 1) {
        if (h.slide) {
          this.puff(h.x1 + 3, h.y1 + 4, "dust", (Math.random() - 0.5) * 20);
          // The one that just landed is the one that joins the pack, if the yard is short.
          this.deliver(h.x1 + 3, h.y1 + 4);
        }
        return false;
      }
      if (p < 0) return true;
      // A slide accelerates, and the last stretch is the puppy leaving the mouth — so it rides the boards, then drops the last few pixels.
      const f = h.slide ? p * p * 0.7 + p * 0.3 : p;
      ctx.drawImage(
        sprite.canvas,
        Math.round(h.x0 + (h.x1 - h.x0) * f),
        Math.round(h.y0 + (h.y1 - h.y0) * f),
      );
      return true;
    });
  }

  private drawWhistled(now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(PUPPY_SPRITE);
    const heart = artCanvas(HEART);
    this.whistled = this.whistled.filter((d) => {
      const age = now - d.born;
      if (age > WHISTLED_MS) return false;
      const p = age / WHISTLED_MS;
      const lift = Math.round(5 * Math.min(1, p * 6));
      ctx.globalAlpha = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
      ctx.drawImage(sprite.canvas, d.x, d.y - sprite.h - lift);
      if (p > 0.15) {
        ctx.globalAlpha *= 0.9;
        ctx.drawImage(
          heart.canvas,
          d.x + 4 + Math.round(Math.sin(p * 6) * 1.5),
          d.y - sprite.h - 5 - Math.round(p * 12),
        );
      }
      ctx.globalAlpha = 1;
      return true;
    });
  }
}
