/** The mill, drawn: a cutaway of the building, floor by floor, standing on the lot the pack runs in.
 *
 * The farm next door is a landscape — sky, hills, rows, a yard. This is the opposite of that on purpose:
 * a shed with the front wall taken off, stacked cages under heat lamps, a lift shaft, a neon sign on the
 * roof, and a strip of urban night above it. Buying pens makes it taller; buying towers makes it taller
 * still. Nothing here has a horizon.
 *
 * Low-res buffer scaled up by CSS `image-rendering: pixelated`, own rAF loop.
 * RENDERING RULE: every blit is integer-aligned and unscaled — no ctx.scale/rotate; animation is translation only. */

import type { solo } from "@clickers/sim";

import {
  BALL,
  BOWL,
  BOWL_RED,
  CAGE_BROKEN,
  DESK,
  FLOOD,
  GLYPHS,
  HOIST_CAGE,
  KENNEL_HAND,
  NOTE,
  PACK_COATS,
  PACK_POSES,
  PALLETS,
  POSE,
  PRODUCER_MARKS,
  PUPPY_SPRITE,
  SACK,
  SKIP,
  TYRE,
  ZZZ,
} from "./art.js";
import { artCanvas, artTinted, type Art } from "./pixel.js";

export const SCENE_W = 176;
const W = SCENE_W;

const INK = "#402e3a";
const NIGHT = "#141630";

/** Must match the flesh colours in `insideScene.ts`, or the sky omen promises the wrong thing. */
const FLESH_LIT = "#ecd9a6";
const FLESH_DEEP = "#7d5330";

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

/** No green in any of these. It's a sky over an industrial estate. */
const SKY: Record<Phase, { top: string; bottom: string; far: string; window: string }> = {
  day: { top: "#a9bfd0", bottom: "#e6dfd0", far: "#8f9ba6", window: "#c9d6dc" },
  dusk: { top: "#3f3566", bottom: "#e8906c", far: "#4a3d55", window: "#f7c96a" },
  night: { top: "#10122a", bottom: "#3a2a48", far: "#1b1830", window: "#ffd88a" },
};

const DARK: Record<Phase, { out: number; inside: number }> = {
  day: { out: 0, inside: 0 },
  dusk: { out: 0.24, inside: 0.05 },
  night: { out: 0.5, inside: 0.1 },
};

// --- Shared helpers (the inside scene borrows these) --------------------------

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

export function fract(x: number): number {
  return x - Math.floor(x);
}

export function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export function rgba(hex: string, alpha: number): string {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${alpha})`;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many of a thing get drawn for how many you own: a log curve, so a hundred reads as "a lot" and not as a hundred. */
export function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  return Math.min(cap, Math.max(1, Math.ceil(spread * Math.log10(1 + owned))));
}

// --- The lot, and the pack that runs in it ------------------------------------

export const PACK_CAP = 34;
export const PACK_LEFT = 2;
export const PACK_RIGHT = SCENE_W - 12;

/** Where the chute lands them. */
const DROP_X = 22;

/** Landing under the chute, kept clear; sized so a new one finishes growing before rejoining the crowd. */
const DROP_CLEAR_X = DROP_X + 16;
const DROP_CLEAR_D = 0.34;

function onLanding(x: number, y: number, back: number, front: number): boolean {
  return x < DROP_CLEAR_X && y < back + (front - back) * DROP_CLEAR_D;
}

/** The handler's spot, kept clear: resting dogs are the widest sprite and hid the whole throw. */
const HAND_X = 44;
const PITCH_W = 14;
const PITCH_D = 9;

function onPitch(x: number, y: number, front: number): boolean {
  return x > HAND_X - 6 && x < HAND_X + PITCH_W && y > front - PITCH_D;
}

const PACK_SPILL = 4;

/** Trot speed, px/s. Slow on purpose: crossing the lot takes most of half a minute. */
const PACK_WALK = [5, 11] as const;

const BOWLS: readonly { x: number; d: number }[] = [
  { x: 62, d: 0.3 },
  { x: 128, d: 0.66 },
  { x: 96, d: 0.92 },
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

const FETCH_SPEED = 30;
const FETCH_REST = [1.2, 3.5] as const;
const FETCH_CLEAR = 28;

function fetchTarget(handX: number, roll: number = Math.random()): number {
  const lo = PACK_LEFT + 8;
  const hi = PACK_RIGHT - 8;
  const left = Math.max(0, handX - FETCH_CLEAR - lo);
  const right = Math.max(0, hi - (handX + FETCH_CLEAR));
  if (left + right === 0) return clamp(handX + FETCH_CLEAR, lo, hi);
  const pick = roll * (left + right);
  return clamp(pick < left ? lo + pick : handX + FETCH_CLEAR + (pick - left), lo, hi);
}

/** Pixels of ground per animation frame. */
export const PACK_STRIDE = 4;

const GROW_CARRIED = 0.3;
const GROW_SMALL = 1.1;

/** Dogs the lot is owed: pack size and lift deliveries are unrelated clocks, so the lot runs a tab. */
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

/** Weighted so most of the lot stands still; two or three moving dogs read as individuals. */
export function pickAction(dog: PackPup, t: number): void {
  if (dog.leaving) {
    dog.until = t + 60;
    return;
  }
  const roll = Math.random();
  if (roll < 0.018) {
    dog.doing = "zoom";
    dog.vx = (Math.random() < 0.5 ? -1 : 1) * 52;
    dog.vy = 0;
    dog.until = t + 0.8 + Math.random() * 1;
  } else if (roll < 0.4) {
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
    dog.vy = (Math.random() - 0.5) * 4;
    dog.until = t + 1.6 + Math.random() * 4.5;
  } else if (roll < 0.68) {
    dog.doing = "sit";
    dog.until = t + 4 + Math.random() * 9;
  } else if (roll < 0.815) {
    dog.doing = "rest";
    dog.until = t + 12 + Math.random() * 22;
  } else if (roll < 0.845) {
    dog.doing = "sleep";
    dog.until = t + 30 + Math.random() * 50;
  } else {
    dog.doing = "stand";
    dog.until = t + 2 + Math.random() * 4;
  }
}

/** The lot doesn't count your puppies. */
const YARD: { at: number }[] = [
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

const PACK_FLOOR = 5;
const PACK_START = 1;
const PACK_OPEN_AT = 1e6;
const PACK_CURVE = 1.45;
const PACK_EASE = 0.5;

function packAt(stage: number): number {
  const f = stage / (YARD.length - 1);
  return Math.round(PACK_FLOOR + (PACK_CAP - PACK_FLOOR) * Math.pow(f, PACK_CURVE));
}

const PACK_OPEN_TOP = stageLayout(PACK_OPEN_AT).pack;

function packOpening(amount: number): number {
  const a = Math.max(0, amount);
  if (a >= PACK_OPEN_AT) return PACK_CAP;
  const f = Math.log10(1 + a) / Math.log10(1 + PACK_OPEN_AT);
  return Math.floor(PACK_START + (PACK_OPEN_TOP + 1 - PACK_START) * f);
}

export function yardLayout(amount: number): YardLayout {
  const a = Math.max(0, amount);
  const base = stageLayout(a);
  return { stage: base.stage, pack: Math.min(base.pack, packOpening(a)) };
}

function stageLayout(amount: number): YardLayout {
  const a = Math.max(0, amount);
  let stage = 0;
  while (stage + 1 < YARD.length && a >= YARD[stage + 1]!.at) stage++;
  const here = YARD[stage]!;
  const next = YARD[stage + 1];
  let frac = 1;
  if (next) {
    frac =
      stage === 0
        ? a / next.at
        : (Math.log10(a) - Math.log10(here.at)) / (Math.log10(next.at) - Math.log10(here.at));
  }
  frac = Math.max(0, Math.min(1, frac));
  const want = packAt(stage);
  const from = stage === 0 ? 0 : packAt(stage - 1);
  const grow = stage === 0 ? frac : Math.pow(frac, PACK_EASE);
  const pack = from + Math.floor((want - from) * grow);
  return { stage, pack: Math.max(0, Math.min(want, pack)) };
}

function sameLayout(a: YardLayout, b: YardLayout): boolean {
  return a.stage === b.stage && a.pack === b.pack;
}

// --- The building ---------------------------------------------------------------

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

const LOT_SHARE = 0.24;
const LOT_MIN = 36;
/** The van lane along the back of the lot, under the building. */
const LANE_H = 15;

const FLOOR_H = 30;
const PLANE_H = 6;
const SLAB_H = 2;
const FACADE_H = 15;
const ROOF_H = 6;

/** The lift shaft, which runs the full height of the cutaway down the left side. */
const SHAFT_L = 2;
const SHAFT_R = 15;
const ROOM_L = SHAFT_R + 1;
const ROOM_R = W - 3;

const CAGE_H = 10;
const CAGE_PITCH = 13;
const CAGES_PER_TIER = 12;
/** The ground floor gives its first two slots to the office. */
const OFFICE_SLOTS = 2;
const MAX_PEN_FLOORS = 5;

type RoomKind = "pens" | "empty" | "works" | "deep";

interface Floor {
  kind: RoomKind;
  top: number;
  bottom: number;
  /** For pen floors: which cage this floor starts at. */
  from: number;
  /** For pen floors: how many cages it has room for. */
  slots: number;
}

interface Layout {
  lotTop: number;
  floors: Floor[];
  /** Top of the cutaway — the bottom of the façade, or of the roof. */
  cutTop: number;
  facade: number;
  roofY: number;
  skyBottom: number;
}

/** Wall paint by room, and what the tube light does to the floor. */
interface Paint {
  wall: string;
  dado: string;
  plane: string;
  planeDark: string;
}

const PENS_PAINT: Paint = { wall: "#97aca8", dado: "#7f9490", plane: "#a39e95", planeDark: "#8f8a83" };
const EMPTY_PAINT: Paint = { wall: "#6e7a7a", dado: "#5b6666", plane: "#736f6a", planeDark: "#615d58" };
const SALON_PAINT: Paint = { wall: "#b7a3c6", dado: "#9a86ab", plane: "#c9c2cc", planeDark: "#aaa2b0" };
const LAB_PAINT: Paint = { wall: "#e4e8e2", dado: "#c4cbc4", plane: "#d6dbd4", planeDark: "#b9c0b8" };
const REACTOR_PAINT: Paint = { wall: "#46556a", dado: "#36434f", plane: "#5b6a7a", planeDark: "#48555f" };
const VOID_PAINT: Paint = { wall: "#1f1830", dado: "#160f22", plane: "#2a2140", planeDark: "#1c1530" };

/** The building starts this tall, however little is in it. */
const MIN_FLOORS = 4;
/** Where a shared floor is split. */
const SPLIT_X = ROOM_L + Math.floor((ROOM_R - ROOM_L) / 2);

const LOT = "#aaa59d";
const LOT_DARK = "#928d85";
const TUBE = "#eefaf0";
const TUBE_GLOW = "#b8f0d8";
const LAMP_GLOW = "#ff7a3d";
const FLOOD_LIGHT = "#ffe6a8";
const NEON = "#ff5fa0";
const NEON_OFF = "#9a6a86";

/** What a hundred-owned tier throws light in. */
const PRIME_GLOW: Partial<Record<OutsideId, string>> = {
  machine: "#ffe08a",
  lab: "#7fe0a0",
  reactor: "#7fe8cc",
  singularity: "#b98ae6",
};

interface Hand {
  x: number;
  y: number;
  floor: number;
  state: "idle" | "walk" | "tend" | "carry" | "load";
  tx: number;
  until: number;
}

interface Lift {
  y: number;
  floor: number;
  target: number;
  cargo: number;
  state: "idle" | "move" | "unload";
  until: number;
}

interface Van {
  x: number;
  y: number;
  speed: number;
  until: number;
}

interface Drop {
  born: number;
}

interface Note {
  x: number;
  y: number;
  born: number;
  flip: boolean;
}

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

const MAX_PUFFS = 60;
const HAND_SPEED = 14;
const LIFT_SPEED = 22;
const CHUTE_S = 0.55;
const RAISE_S = 1.1;

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
  private dt = 0;
  private lastFrame = performance.now();

  private hands: Hand[] = [];
  private lift: Lift = { y: 0, floor: 0, target: 0, cargo: 0, state: "idle", until: 0 };
  private vans: Van[] = [];
  private drops: Drop[] = [];
  private notes: Note[] = [];
  private puffs: Puff[] = [];
  /** How many floors were standing last frame, so a new one can be seen going up. */
  private floorsSeen = -1;
  private floorBorn = new Map<number, number>();
  private machineShake = new Map<number, number>();
  private signOut = -1;
  private signOutUntil = 0;

  /** The hoard the lot is currently showing, which chases the real one rather than snapping to it. */
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

  /** A different mill entirely: handed down, or shut down. */
  private clearOut(): void {
    this.shown = Math.max(0, this.view.hoard);
    this.shownLayout = yardLayout(this.shown);
    this.pack = [];
    this.owed = 0;
    this.fetch.dog = null;
    this.fetch.phase = "wait";
    this.hands = [];
    this.vans = [];
    this.drops = [];
    this.puffs = [];
    this.notes = [];
    this.lift.cargo = 0;
    this.lift.state = "idle";
    this.floorsSeen = -1;
    this.floorBorn.clear();
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

  private mark(id: OutsideId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  private owned(id: OutsideId): number {
    return (this.view.working[id] ?? 0) + (this.view.broken[id] ?? 0);
  }

  /** How many of `shown` should be drawn broken, given the real ratio. */
  private brokenOf(id: OutsideId, shown: number): number {
    const owned = this.owned(id);
    const broken = this.view.broken[id] ?? 0;
    if (owned <= 0 || broken <= 0) return 0;
    return Math.min(shown, Math.max(1, Math.round((broken / owned) * shown)));
  }

  /** Per-frame odds for something that should happen `perSec` times a second. */
  private chance(perSec: number): boolean {
    return Math.random() < this.dt * perSec;
  }

  // --- Geometry ------------------------------------------------------------------

  private layout(): Layout {
    const sh = this.sh;
    const lotTop = sh - Math.max(LOT_MIN, Math.round(sh * LOT_SHARE));
    const skyStuff = this.owned("airship") + this.owned("orbital") > 0;
    const skyMin = skyStuff ? 24 : 14;
    const avail = lotTop - ROOF_H - skyMin;
    const fit = Math.max(1, Math.floor(avail / FLOOR_H));

    const cages = Math.min(this.owned("patch"), CAGES_PER_TIER * 2 * MAX_PEN_FLOORS);
    const specials: RoomKind[] = [];
    if (this.owned("machine") + this.owned("lab") > 0) specials.push("works");
    if (this.owned("reactor") + this.owned("singularity") > 0) specials.push("deep");
    const towers = shownCount(this.owned("tower"), 5, 1.6);
    // The tower counts as a floor of the budget: it's the one purchase whose whole point is being seen from the street.
    const towerRoom = towers > 0 ? 1 : 0;
    // The ground floor is always there; the rooms you've bought come next, and the top is cut off before any of them.
    while (1 + specials.length + towerRoom > fit && specials.length > 0) specials.pop();
    const groundSlots = CAGES_PER_TIER * 2 - OFFICE_SLOTS;
    let penFloors = 1;
    let placed = groundSlots;
    while (1 + specials.length + towerRoom + (penFloors - 1) < fit && placed < cages && penFloors < MAX_PEN_FLOORS) {
      penFloors++;
      placed += CAGES_PER_TIER * 2;
    }
    // A shed you haven't filled yet still has its upper floors; they're just dark.
    let empties = 0;
    while (penFloors + specials.length + towerRoom + empties < Math.min(fit, MIN_FLOORS)) empties++;

    const floors: Floor[] = [];
    let bottom = lotTop;
    let from = 0;
    for (let i = 0; i < penFloors; i++) {
      const slots = i === 0 ? groundSlots : CAGES_PER_TIER * 2;
      floors.push({ kind: "pens", top: bottom - FLOOR_H, bottom, from, slots });
      from += slots;
      bottom -= FLOOR_H;
    }
    for (let i = 0; i < empties; i++) {
      floors.push({ kind: "empty", top: bottom - FLOOR_H, bottom, from: 0, slots: 0 });
      bottom -= FLOOR_H;
    }
    for (const kind of specials) {
      floors.push({ kind, top: bottom - FLOOR_H, bottom, from: 0, slots: 0 });
      bottom -= FLOOR_H;
    }
    const cutTop = bottom;

    const room = Math.max(0, cutTop - ROOF_H - skyMin);
    const facade = towers > 0 ? Math.min(1 + towers, Math.floor(room / FACADE_H)) : 0;
    const roofY = cutTop - facade * FACADE_H;
    return { lotTop, floors, cutTop, facade, roofY, skyBottom: roofY - ROOF_H };
  }

  /** Where a hand's feet go on a floor. */
  private floorFoot(f: Floor): number {
    return f.bottom - SLAB_H - 1;
  }

  private cageAt(f: Floor, i: number): { x: number; y: number } {
    const slot = i - f.from + (f.from === 0 ? OFFICE_SLOTS : 0);
    const tier = Math.floor(slot / CAGES_PER_TIER);
    const col = slot % CAGES_PER_TIER;
    const base = f.bottom - SLAB_H - PLANE_H + 2;
    return { x: ROOM_L + 1 + col * CAGE_PITCH, y: base - CAGE_H - tier * CAGE_H };
  }

  private liftTopAt(f: Floor): number {
    return f.bottom - SLAB_H - artCanvas(HOIST_CAGE).h;
  }

  // --- The frame -------------------------------------------------------------------

  private draw(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.dt = dt;
    this.lastFrame = now;
    this.clock += dt;
    const t = this.clock;
    const phase = phaseNow();
    const L = this.layout();

    this.noteFloors(L, t);
    this.stepHoard(dt);

    this.drawSky(L, phase, t);
    this.drawFacade(L, phase, t);
    this.drawRoof(L, phase, t);
    this.drawFloors(L, phase, t, now);
    this.stepLift(L, t);
    this.drawShaft(L, t);
    this.stepHands(L, t, dt);
    this.drawHands(L, t);
    this.drawLot(L, phase, t);
    this.stepVans(L, dt);
    this.drawVans(L, t);
    this.drawChute(L);
    this.stepDrops(L, t);
    this.drawDrops(L, t);
    this.stepFetch(t, L);
    this.stepPack(dt, t, L);
    this.drawPack(L);
    this.drawPuffs(now, dt);
    this.drawDark(L, phase, t);
    this.drawNotes(now);
  }

  // --- Sky -------------------------------------------------------------------------

  private drawSky(L: Layout, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const sky = SKY[phase];
    const h = Math.max(1, L.skyBottom);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, h);

    if (phase === "night") {
      const rng = mulberry32(this.rngSeed ^ 0x51ed);
      ctx.fillStyle = "#e8e4d0";
      for (let i = 0; i < 22; i++) {
        const x = Math.floor(rng() * W);
        const y = Math.floor(rng() * Math.max(1, h - 6));
        if (rng() > 0.35 + 0.3 * Math.sin(t * 0.7 + i)) ctx.fillRect(x, y, 1, 1);
      }
    }
    // The moon is a thin one, low: the roofline is what this sky is for.
    const moonY = Math.min(9, Math.max(4, h - 10));
    if (phase === "night") {
      ctx.fillStyle = "#f4ecd0";
      ctx.beginPath();
      ctx.arc(W - 62, moonY + 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath();
      ctx.arc(W - 65, moonY + 1, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (h > 14) {
      ctx.fillStyle = phase === "dusk" ? "#ffb56a" : "#fbf2c4";
      ctx.beginPath();
      ctx.arc(W - 26, clamp(h - 16, 8, 26), 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Smog, drifting: two soft bands.
    if (phase !== "night" && h > 30) {
      ctx.fillStyle = rgba(phase === "day" ? "#ffffff" : "#ffb090", 0.16);
      for (let i = 0; i < 2; i++) {
        const bw = 70 + i * 30;
        const bx = Math.floor(((t * (2 + i) + i * 90) % (W + bw)) - bw);
        const by = Math.round(h * (0.3 + i * 0.25));
        ctx.fillRect(bx, by, bw, 3);
        ctx.fillRect(bx + 10, by - 2, bw - 30, 2);
        ctx.fillRect(bx + 6, by + 3, bw - 16, 1);
      }
    }

    // The estate behind: blocks and stacks, and their windows if it's dark.
    const rng = mulberry32(this.rngSeed ^ 0xe57a);
    let x = -3;
    while (x < W) {
      const w = 6 + Math.floor(rng() * 12);
      const bh = 3 + Math.floor(rng() * Math.max(2, Math.min(30, h - 4)));
      ctx.fillStyle = sky.far;
      ctx.fillRect(x, L.skyBottom - bh, w, bh);
      if (rng() < 0.3) ctx.fillRect(x + w - 3, L.skyBottom - bh - 4, 2, 4);
      if (phase !== "day") {
        ctx.fillStyle = sky.window;
        for (let wy = L.skyBottom - bh + 2; wy < L.skyBottom - 1; wy += 3) {
          for (let wx = x + 1; wx < x + w - 1; wx += 3) {
            if (rng() < 0.4) ctx.fillRect(wx, wy, 1, 1);
          }
        }
      }
      x += w + 1 + Math.floor(rng() * 3);
    }

    this.drawWires(L, phase, t);
    this.drawSkyTraffic(L, t);
    this.drawBleed(L, t);
  }

  /** A pole on the corner, two wires off it across the sky, and the pigeons that live on them. */
  private drawWires(L: Layout, phase: Phase, t: number): void {
    const h = L.skyBottom;
    if (h < 40) return;
    const ctx = this.ctx;
    const px = 6;
    const top = h - 34;
    const ink = phase === "night" ? "#0a0b18" : "#2e2838";
    ctx.fillStyle = ink;
    ctx.fillRect(px, top, 2, 34);
    ctx.fillRect(px - 4, top + 3, 10, 1);
    ctx.fillRect(px - 3, top + 7, 8, 1);
    const wire = (y0: number, y1: number, sag: number) => {
      for (let x = px + 2; x < W; x++) {
        const k = (x - px) / (W - px);
        const y = Math.round(y0 + (y1 - y0) * k + sag * Math.sin(k * Math.PI));
        ctx.fillRect(x, y, 1, 1);
      }
    };
    wire(top + 3, top + 9, 4);
    wire(top + 7, top + 13, 4);
    // Pigeons: on the top wire, and one of them shuffles.
    const rng = mulberry32(this.rngSeed ^ 0x9160);
    for (let i = 0; i < 4; i++) {
      const k = 0.15 + rng() * 0.75;
      const hop = i === 1 && Math.sin(t * 0.8) > 0.97 ? 1 : 0;
      const x = Math.round(px + 2 + (W - px) * k);
      const y = Math.round(top + 3 + 6 * k + 4 * Math.sin(k * Math.PI)) - 3 - hop;
      ctx.fillStyle = ink;
      ctx.fillRect(x, y, 3, 2);
      ctx.fillRect(x + 2, y - 1, 1, 1);
    }
  }

  /** Zeppelins at the mast, and the kennel going over. */
  private drawSkyTraffic(L: Layout, t: number): void {
    const ctx = this.ctx;
    const ships = shownCount(this.owned("airship"), 4, 1.6);
    const shipsBroken = this.brokenOf("airship", ships);
    const zep = artCanvas(this.mark("airship"));
    const mastX = W - 10;
    const mastTop = L.skyBottom - 18;
    for (let i = 0; i < ships; i++) {
      const broken = i >= ships - shipsBroken;
      const bob = Math.round(Math.sin(t * 0.9 + i * 1.7) * 1.5);
      let x: number;
      let y: number;
      if (i === 0) {
        x = mastX - zep.w + 1 + Math.round(Math.sin(t * 0.4) * 1.5);
        y = mastTop - 3 + bob;
      } else {
        const span = W + zep.w + 40 * i;
        x = Math.floor(((t * (4 + i * 1.5) + i * 97) % span) - zep.w);
        y = Math.max(1, mastTop - 6 - i * 7) + bob;
      }
      if (broken) {
        ctx.drawImage(artTinted(this.mark("airship"), INK, 0.55).canvas, x, y + 4);
      } else {
        ctx.drawImage(zep.canvas, x, y);
      }
    }
    const sats = shownCount(this.owned("orbital"), 3, 1.4);
    if (sats > 0) {
      const sat = artCanvas(this.mark("orbital"));
      for (let i = 0; i < sats; i++) {
        const span = W + sat.w + 60;
        const x = Math.floor(span - ((t * (9 + i * 2) + i * 131) % span)) - sat.w;
        const y = Math.max(0, Math.min(L.skyBottom - sat.h - 2, 2 + i * 6));
        ctx.drawImage(sat.canvas, x, y);
      }
    }
  }

  private drawBleed(L: Layout, t: number): void {
    const looming = clamp(this.view.looming, 0, 1);
    if (looming <= 0) return;
    const ctx = this.ctx;
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.42);
    const strength = Math.pow(looming, 0.55) * pulse;
    const h = Math.max(1, L.skyBottom);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgba(FLESH_LIT, 0.62 * strength));
    grad.addColorStop(0.5, rgba(FLESH_DEEP, 0.2 * strength));
    grad.addColorStop(1, rgba(FLESH_DEEP, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, h);
  }

  // --- Façade and roof -------------------------------------------------------------

  /** The tower: the floors above the cutaway you only ever see the outside of. */
  private drawFacade(L: Layout, phase: Phase, t: number): void {
    if (L.facade <= 0) return;
    const ctx = this.ctx;
    const art = this.mark("tower");
    const wall = art.palette.m ?? "#cfd6dc";
    // Warm windows, tinted a little towards whatever the mark's colour is, so a refit shows from the street.
    const lit = mix("#ffd88a", art.palette.g ?? "#6dc45a", 0.3);
    const rng = mulberry32(this.rngSeed ^ 0x70e5);
    for (let i = 0; i < L.facade; i++) {
      const top = L.roofY + i * FACADE_H;
      ctx.fillStyle = mix(wall, INK, 0.25);
      ctx.fillRect(0, top, W, FACADE_H);
      ctx.fillStyle = wall;
      ctx.fillRect(2, top + 1, W - 4, FACADE_H - 2);
      ctx.fillStyle = INK;
      ctx.fillRect(0, top + FACADE_H - 1, W, 1);
      for (let x = 10; x < W - 12; x += 22) {
        const on = phase === "day" ? false : rng() < 0.7 || Math.sin(t * 0.3 + x + i) > 0.9;
        ctx.fillStyle = INK;
        ctx.fillRect(x, top + 3, 7, 6);
        ctx.fillStyle = on ? lit : SKY[phase].window;
        ctx.fillRect(x + 1, top + 4, 5, 4);
        if (!on) {
          ctx.fillStyle = mix(SKY[phase].window, INK, 0.4);
          ctx.fillRect(x + 1, top + 6, 5, 2);
        }
      }
    }
  }

  private drawRoof(L: Layout, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const y = L.skyBottom;
    // Parapet: a lip, then the slab the cutaway hangs off.
    ctx.fillStyle = INK;
    ctx.fillRect(0, y, W, ROOF_H);
    ctx.fillStyle = "#6f6a74";
    ctx.fillRect(1, y + 1, W - 2, 2);
    ctx.fillStyle = "#57525c";
    ctx.fillRect(1, y + 3, W - 2, ROOF_H - 4);

    // What stands on it, feet on the parapet.
    const foot = y + 1;
    const silos = shownCount(this.owned("refinery"), 3, 1);
    const silosBroken = this.brokenOf("refinery", silos);
    if (silos > 0) {
      const art = this.mark("refinery");
      const sprite = artCanvas(art);
      for (let i = 0; i < silos; i++) {
        const x = 56 + i * (sprite.w + 2);
        const broken = i >= silos - silosBroken;
        ctx.drawImage((broken ? artTinted(art, INK, 0.5) : sprite).canvas, x, foot - sprite.h);
        if (!broken && this.chance(1.6)) this.puff(x + 12, foot - sprite.h, "smoke");
      }
    }
    // A water tank on legs, and a vent, so the roof isn't a line.
    ctx.fillStyle = INK;
    ctx.fillRect(W - 46, foot - 9, 10, 6);
    ctx.fillRect(W - 45, foot - 3, 1, 3);
    ctx.fillRect(W - 38, foot - 3, 1, 3);
    ctx.fillStyle = "#8d959d";
    ctx.fillRect(W - 45, foot - 8, 8, 4);
    ctx.fillStyle = "#a8b0b8";
    ctx.fillRect(W - 45, foot - 8, 8, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(W - 30, foot - 5, 8, 5);
    ctx.fillStyle = "#a8b0b8";
    ctx.fillRect(W - 29, foot - 4, 6, 3);

    if (this.owned("airship") > 0) {
      ctx.fillStyle = INK;
      ctx.fillRect(W - 10, foot - 18, 2, 18);
      ctx.fillRect(W - 12, foot - 18, 6, 1);
      ctx.fillStyle = "#e8405a";
      if (Math.floor(t * 1.5) % 2 === 0) ctx.fillRect(W - 10, foot - 20, 2, 2);
    }

    this.drawSign(6, foot - 12, phase, t);
  }

  /** PUPPY MILL, in neon, and one letter out. */
  private drawSign(x: number, y: number, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const text = "PUPPY MILL";
    const w = text.length * 4 + 3;
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, 9);
    ctx.fillStyle = "#2a2230";
    ctx.fillRect(x + 1, y + 1, w - 2, 7);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 3, y + 9, 1, 3);
    ctx.fillRect(x + w - 4, y + 9, 1, 3);

    const on = phase !== "day";
    if (on && t > this.signOutUntil) {
      this.signOut = Math.random() < 0.3 ? Math.floor(Math.random() * text.length) : -1;
      this.signOutUntil = t + (this.signOut >= 0 ? 0.12 + Math.random() * 0.5 : 1.5 + Math.random() * 5);
    }
    let cx = x + 2;
    for (let i = 0; i < text.length; i++) {
      const glyph = GLYPHS[text[i]!];
      const dead = i === this.signOut;
      ctx.fillStyle = on && !dead ? NEON : NEON_OFF;
      if (glyph) {
        for (let r = 0; r < glyph.length; r++) {
          const row = glyph[r]!;
          for (let c = 0; c < row.length; c++) if (row[c] === "#") ctx.fillRect(cx + c, y + 2 + r, 1, 1);
        }
      }
      cx += 4;
    }
    if (on) this.glow(x + w / 2, y + 4, w * 0.7, NEON, 0.16);
  }

  // --- The cutaway ------------------------------------------------------------------

  private noteFloors(L: Layout, t: number): void {
    const n = L.floors.length;
    if (this.floorsSeen >= 0 && n > this.floorsSeen) {
      for (let i = this.floorsSeen; i < n; i++) this.floorBorn.set(i, t);
    }
    this.floorsSeen = n;
    for (const [i, born] of this.floorBorn) if (t - born > RAISE_S) this.floorBorn.delete(i);
  }

  private drawFloors(L: Layout, phase: Phase, t: number, now: number): void {
    const ctx = this.ctx;
    const looming = clamp(this.view.looming, 0, 1);
    for (let i = L.floors.length - 1; i >= 0; i--) {
      const f = L.floors[i]!;
      const born = this.floorBorn.get(i);
      const rise = born === undefined ? 1 : clamp((t - born) / RAISE_S, 0, 1);
      if (rise < 1) {
        ctx.globalAlpha = 0.25 + 0.75 * rise;
        if (this.chance(14)) this.puff(ROOM_L + Math.random() * (ROOM_R - ROOM_L), f.bottom - 1, "dust");
      }
      const paint = this.paintOf(f);
      const wall = looming > 0 ? mix(paint.wall, FLESH_DEEP, looming * 0.3) : paint.wall;
      ctx.fillStyle = wall;
      ctx.fillRect(0, f.top, W, FLOOR_H - SLAB_H - PLANE_H);
      ctx.fillStyle = paint.dado;
      ctx.fillRect(0, f.bottom - SLAB_H - PLANE_H - 1, W, 1);
      ctx.fillStyle = paint.plane;
      ctx.fillRect(0, f.bottom - SLAB_H - PLANE_H, W, PLANE_H);
      ctx.fillStyle = paint.planeDark;
      ctx.fillRect(0, f.bottom - SLAB_H - 1, W, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(0, f.bottom - SLAB_H, W, SLAB_H);
      // Outer walls, either side.
      ctx.fillRect(0, f.top, 2, FLOOR_H);
      ctx.fillRect(W - 2, f.top, 2, FLOOR_H);

      // The second half of a shared floor, and the wall between.
      if (f.kind === "works" || f.kind === "deep") this.drawSplit(f, looming);

      // The tube, and the wash it puts on the ceiling. An empty floor has a bulb instead.
      if (f.kind === "empty") {
        this.drawEmptyFloor(f, i, t);
      } else {
        const flicker = looming > 0.4 && Math.sin(t * 23 + i * 5) > 0.92 ? 0.3 : 1;
        ctx.fillStyle = INK;
        ctx.fillRect(ROOM_L + 10, f.top + 1, ROOM_R - ROOM_L - 20, 3);
        ctx.fillStyle = mix(TUBE, wall, 1 - flicker);
        ctx.fillRect(ROOM_L + 11, f.top + 2, ROOM_R - ROOM_L - 22, 1);
        ctx.fillStyle = rgba(TUBE_GLOW, 0.22 * flicker);
        ctx.fillRect(ROOM_L + 8, f.top + 4, ROOM_R - ROOM_L - 16, 3);
      }

      switch (f.kind) {
        case "pens":
          this.drawPenFloor(f, i, phase, t);
          break;
        case "works":
          if (this.owned("machine") > 0) this.drawGroomFloor(f, t, now, this.owned("lab") > 0);
          if (this.owned("lab") > 0) this.drawLabFloor(f, t, this.owned("machine") > 0);
          break;
        case "deep":
          if (this.owned("reactor") > 0) this.drawReactorFloor(f, t, this.owned("singularity") > 0);
          if (this.owned("singularity") > 0) this.drawVoidFloor(f, t, this.owned("reactor") > 0);
          break;
        case "empty":
          break;
      }
      ctx.globalAlpha = 1;
    }
  }

  /** The paint on the left-hand (or only) half of a floor. */
  private paintOf(f: Floor): Paint {
    switch (f.kind) {
      case "pens":
        return PENS_PAINT;
      case "empty":
        return EMPTY_PAINT;
      case "works":
        return this.owned("machine") > 0 ? SALON_PAINT : LAB_PAINT;
      case "deep":
        return this.owned("reactor") > 0 ? REACTOR_PAINT : VOID_PAINT;
    }
  }

  /** A shared floor: the other paint on the right, and a partition with a door in it. */
  private drawSplit(f: Floor, looming: number): void {
    const both =
      f.kind === "works"
        ? this.owned("machine") > 0 && this.owned("lab") > 0
        : this.owned("reactor") > 0 && this.owned("singularity") > 0;
    if (!both) return;
    const ctx = this.ctx;
    const paint = f.kind === "works" ? LAB_PAINT : VOID_PAINT;
    const wall = looming > 0 ? mix(paint.wall, FLESH_DEEP, looming * 0.3) : paint.wall;
    ctx.fillStyle = wall;
    ctx.fillRect(SPLIT_X, f.top, ROOM_R - SPLIT_X + 1, FLOOR_H - SLAB_H - PLANE_H);
    ctx.fillStyle = paint.dado;
    ctx.fillRect(SPLIT_X, f.bottom - SLAB_H - PLANE_H - 1, ROOM_R - SPLIT_X + 1, 1);
    ctx.fillStyle = paint.plane;
    ctx.fillRect(SPLIT_X, f.bottom - SLAB_H - PLANE_H, ROOM_R - SPLIT_X + 1, PLANE_H);
    ctx.fillStyle = paint.planeDark;
    ctx.fillRect(SPLIT_X, f.bottom - SLAB_H - 1, ROOM_R - SPLIT_X + 1, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(SPLIT_X - 1, f.top, 2, FLOOR_H - SLAB_H);
    // A door in the partition, ajar.
    ctx.fillStyle = "#5b525f";
    ctx.fillRect(SPLIT_X - 1, f.bottom - SLAB_H - 12, 2, 10);
  }

  /** A floor nobody's fitted out: one bulb, the flat-packed cages, and the broom. */
  private drawEmptyFloor(f: Floor, index: number, t: number): void {
    const ctx = this.ctx;
    const cx = ROOM_L + 60 + ((index * 37) % 50);
    ctx.fillStyle = INK;
    ctx.fillRect(cx, f.top, 1, 5);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(cx - 1, f.top + 5, 3, 3);
    ctx.fillRect(cx, f.top + 8, 1, 1);
    this.glow(cx, f.top + 9, 20, "#ffd77a", 0.16 + 0.02 * Math.sin(t * 3 + index));
    const foot = f.bottom - SLAB_H - 1;
    const odd = index % 2 === 1;
    // Flat-packed cages against one wall or the other.
    const stackX = odd ? ROOM_L + 4 : ROOM_R - 20;
    ctx.fillStyle = INK;
    for (let i = 0; i < 4; i++) ctx.fillRect(stackX, foot - 3 - i * 3, 14, 1);
    ctx.fillStyle = "#c4ccd2";
    for (let i = 0; i < 4; i++) ctx.fillRect(stackX + 1, foot - 2 - i * 3, 12, 1);
    if (odd) {
      // A ladder left leaning, and a tin of paint.
      ctx.fillStyle = "#b8965a";
      ctx.fillRect(ROOM_R - 30, foot - 18, 1, 18);
      ctx.fillRect(ROOM_R - 25, foot - 18, 1, 18);
      for (let i = 0; i < 5; i++) ctx.fillRect(ROOM_R - 29, foot - 15 + i * 3, 4, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(ROOM_R - 44, foot - 5, 6, 5);
      ctx.fillStyle = "#e0507a";
      ctx.fillRect(ROOM_R - 43, foot - 4, 4, 1);
    } else {
      // A broom, and a bucket.
      ctx.fillStyle = "#b8965a";
      ctx.fillRect(ROOM_L + 30, foot - 12, 1, 10);
      ctx.fillStyle = "#d8b070";
      ctx.fillRect(ROOM_L + 28, foot - 3, 5, 3);
      ctx.fillStyle = INK;
      ctx.fillRect(ROOM_L + 38, foot - 4, 6, 4);
      ctx.fillStyle = "#8d959d";
      ctx.fillRect(ROOM_L + 39, foot - 3, 4, 2);
    }
    // Cobweb in the corner.
    ctx.fillStyle = rgba("#ffffff", 0.35);
    ctx.fillRect(ROOM_L + 1, f.top + 1, 4, 1);
    ctx.fillRect(ROOM_L + 1, f.top + 2, 2, 1);
    ctx.fillRect(ROOM_L + 1, f.top + 3, 1, 2);
  }

  private drawPenFloor(f: Floor, index: number, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const cagesShown = Math.min(this.owned("patch"), CAGES_PER_TIER * 2 * MAX_PEN_FLOORS);
    const broken = this.brokenOf("patch", cagesShown);
    const condition = clamp(this.view.condition, 0, 1);
    const cageArt = this.mark("patch");
    const grime = condition < 0.6 ? artTinted(cageArt, "#5a4a30", (0.6 - condition) * 0.9) : artCanvas(cageArt);
    const dead = artCanvas(CAGE_BROKEN);

    if (f.from === 0) {
      // The office: a desk, the phone, and the kibble stacked by the lift.
      const desk = artCanvas(DESK);
      const foot = f.bottom - SLAB_H - 1;
      ctx.drawImage(desk.canvas, ROOM_L + 13, foot - desk.h);
      const sack = artCanvas(SACK);
      ctx.drawImage(sack.canvas, ROOM_L + 1, foot - sack.h);
      ctx.drawImage(sack.canvas, ROOM_L + 6, foot - sack.h);
      ctx.drawImage(sack.canvas, ROOM_L + 3, foot - sack.h * 2 + 1);
      // A calendar on the wall.
      ctx.fillStyle = "#f4ecd8";
      ctx.fillRect(ROOM_L + 14, f.top + 8, 6, 7);
      ctx.fillStyle = "#e8405a";
      ctx.fillRect(ROOM_L + 14, f.top + 8, 6, 2);
    }

    const end = Math.min(cagesShown, f.from + f.slots);
    for (let i = f.from; i < end; i++) {
      const at = this.cageAt(f, i);
      const isDead = i >= cagesShown - broken;
      ctx.drawImage((isDead ? dead : grime).canvas, at.x, at.y);
      // The straw goes to seed with the bedding: flies over the worst of it.
      if (!isDead && condition < 0.55 && Math.sin(t * 9 + i * 3.1) > 0.4) {
        ctx.fillStyle = INK;
        ctx.fillRect(at.x + 2 + Math.floor(fract(t * 1.3 + i * 0.7) * 8), at.y + 2 + Math.floor(fract(t * 2.1 + i) * 4), 1, 1);
      }
    }

    this.drawLamps(f, index, phase, t);
  }

  /** How many heat lamps hang on this floor, and where. */
  private lampsOn(L: Layout, index: number): { x: number; y: number; broken: boolean }[] {
    const pens = L.floors.filter((f) => f.kind === "pens").length;
    const f = L.floors[index];
    if (!f || f.kind !== "pens" || pens === 0) return [];
    const total = shownCount(this.owned("rig"), 12, 5);
    const brokenN = this.brokenOf("rig", total);
    const out: { x: number; y: number; broken: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      if (i % pens !== index) continue;
      const onFloor = Math.ceil((total - i) / pens);
      const slot = Math.floor(i / pens);
      const pitch = (ROOM_R - ROOM_L) / (onFloor + slot + 1);
      out.push({ x: Math.round(ROOM_L + pitch * (slot + 1)), y: f.top + 1, broken: i >= total - brokenN });
    }
    return out;
  }

  private drawLamps(f: Floor, index: number, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const art = this.mark("rig");
    const sprite = artCanvas(art);
    const off = artTinted(art, INK, 0.6);
    const L = this.layout();
    for (const lamp of this.lampsOn(L, index)) {
      const sway = Math.round(Math.sin(t * 0.8 + lamp.x) * 0.6);
      ctx.drawImage((lamp.broken ? off : sprite).canvas, lamp.x - Math.floor(sprite.w / 2) + sway, lamp.y);
      if (!lamp.broken) {
        const strength = phase === "day" ? 0.22 : 0.3;
        this.glow(lamp.x + sway, lamp.y + sprite.h + 6, 16, LAMP_GLOW, strength);
        ctx.fillStyle = rgba(LAMP_GLOW, 0.1);
        ctx.fillRect(lamp.x - 10 + sway, lamp.y + sprite.h, 20, f.bottom - SLAB_H - lamp.y - sprite.h);
      }
    }
  }

  private drawGroomFloor(f: Floor, t: number, now: number, half: boolean): void {
    const ctx = this.ctx;
    const n = shownCount(this.owned("machine"), half ? 3 : 4, 1.2);
    const brokenN = this.brokenOf("machine", n);
    const art = this.mark("machine");
    const sprite = artCanvas(art);
    const foot = f.bottom - SLAB_H;
    const left = ROOM_L;
    const right = half ? SPLIT_X - 2 : ROOM_R;
    const pitch = (right - left - 8) / n;
    // A bench along the back, with the kit on it.
    ctx.fillStyle = "#8a7aa0";
    ctx.fillRect(left + 2, f.top + 8, right - left - 4, 2);
    for (let i = 0; i < n; i++) {
      const broken = i >= n - brokenN;
      const x = Math.round(left + 4 + pitch * i + (pitch - sprite.w) / 2);
      const shake = this.machineShake.get(i) ?? 0;
      const going = !broken && now < shake;
      if (!broken && !going && this.chance(0.35)) this.machineShake.set(i, now + 1400);
      const jx = going ? (Math.floor(now / 60) % 2 === 0 ? 1 : 0) : 0;
      ctx.drawImage((broken ? artTinted(art, INK, 0.5) : sprite).canvas, x + jx, foot - sprite.h);
      if (going && this.chance(12)) this.puff(x + sprite.w - 2, foot - sprite.h + 6, "fluff", 8);
      if (this.primed("machine")) this.glow(x + sprite.w / 2, foot - sprite.h / 2, 14, PRIME_GLOW.machine!, 0.14);
      // Mirrors over each station.
      ctx.fillStyle = INK;
      ctx.fillRect(x + 1, f.top + 5, sprite.w - 2, 1);
    }
  }

  private drawLabFloor(f: Floor, t: number, half: boolean): void {
    const ctx = this.ctx;
    const n = shownCount(this.owned("lab"), half ? 2 : 3, 1);
    const brokenN = this.brokenOf("lab", n);
    const art = this.mark("lab");
    const sprite = artCanvas(art);
    const foot = f.bottom - SLAB_H;
    const left = half ? SPLIT_X + 1 : ROOM_L;
    const right = ROOM_R;
    const pitch = (right - left - 8) / n;
    // Tiles.
    ctx.fillStyle = "#cfd5cf";
    for (let x = left + 2; x < right; x += 6) ctx.fillRect(x, f.top + 6, 1, FLOOR_H - SLAB_H - PLANE_H - 8);
    for (let i = 0; i < n; i++) {
      const broken = i >= n - brokenN;
      const x = Math.round(left + 4 + pitch * i + (pitch - sprite.w) / 2);
      ctx.drawImage((broken ? artTinted(art, INK, 0.5) : sprite).canvas, x, foot - sprite.h);
      if (!broken) {
        const g = art.palette.g ?? "#7fd0e0";
        this.glow(x + sprite.w / 2, foot - sprite.h + 4, 12, g, 0.16 + 0.06 * Math.sin(t * 2 + i));
        if (this.chance(2)) this.puff(x + 4 + Math.random() * (sprite.w - 8), foot - sprite.h + 2, "bubble");
      }
      if (this.primed("lab")) this.glow(x + sprite.w / 2, foot - sprite.h / 2, 16, PRIME_GLOW.lab!, 0.14);
    }
  }

  private drawReactorFloor(f: Floor, t: number, half: boolean): void {
    const ctx = this.ctx;
    const n = shownCount(this.owned("reactor"), 2, 1);
    const brokenN = this.brokenOf("reactor", n);
    const art = this.mark("reactor");
    const sprite = artCanvas(art);
    const foot = f.bottom - SLAB_H;
    const left = ROOM_L;
    const right = half ? SPLIT_X - 2 : ROOM_R;
    const pitch = (right - left - 8) / n;
    // Hazard stripe along the dado.
    for (let x = left; x < right; x += 4) {
      ctx.fillStyle = Math.floor(x / 4) % 2 === 0 ? "#e8b93f" : INK;
      ctx.fillRect(x, f.bottom - SLAB_H - PLANE_H - 2, Math.min(4, right - x), 1);
    }
    for (let i = 0; i < n; i++) {
      const broken = i >= n - brokenN;
      const x = Math.round(left + 4 + pitch * i + (pitch - sprite.w) / 2);
      ctx.drawImage((broken ? artTinted(art, INK, 0.5) : sprite).canvas, x, foot - sprite.h);
      if (!broken) {
        const g = art.palette.g ?? "#7fe8cc";
        const pulse = 0.2 + 0.1 * Math.sin(t * 2.6 + i);
        this.glow(x + sprite.w / 2, foot - 9, 18, g, pulse);
        if (this.chance(1.2)) this.puff(x + 6, foot - sprite.h, "steam");
      }
      if (this.primed("reactor")) this.glow(x + sprite.w / 2, foot - sprite.h / 2, 20, PRIME_GLOW.reactor!, 0.14);
    }
  }

  private drawVoidFloor(f: Floor, t: number, half: boolean): void {
    const ctx = this.ctx;
    const n = shownCount(this.owned("singularity"), 2, 1.2);
    const art = this.mark("singularity");
    const sprite = artCanvas(art);
    const left = half ? SPLIT_X + 1 : ROOM_L;
    const right = ROOM_R;
    const pitch = (right - left - 8) / n;
    const rng = mulberry32(this.rngSeed ^ 0x5106);
    ctx.fillStyle = "#6a5a8a";
    for (let i = 0; i < 18; i++) {
      const x = left + Math.floor(rng() * (right - left));
      const y = f.top + 5 + Math.floor(rng() * (FLOOR_H - 10));
      if (Math.sin(t * 1.3 + i) > 0.2) ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < n; i++) {
      const x = Math.round(left + 4 + pitch * i + (pitch - sprite.w) / 2);
      const y = f.top + 6 + Math.round(Math.sin(t * 0.7 + i * 2) * 2);
      const p = art.palette.p ?? "#8a6ad0";
      this.glow(x + sprite.w / 2, y + sprite.h / 2, 16, p, 0.18 + 0.06 * Math.sin(t * 1.9 + i));
      ctx.drawImage(sprite.canvas, x, y);
      if (this.primed("singularity")) this.glow(x + sprite.w / 2, y + sprite.h / 2, 22, PRIME_GLOW.singularity!, 0.14);
    }
  }

  private primed(id: OutsideId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  // --- The lift ----------------------------------------------------------------------

  private stepLift(L: Layout, t: number): void {
    const lift = this.lift;
    const n = L.floors.length;
    if (n === 0) return;
    lift.floor = Math.min(lift.floor, n - 1);
    lift.target = Math.min(lift.target, n - 1);
    const at = (i: number) => this.liftTopAt(L.floors[i]!);

    switch (lift.state) {
      case "idle": {
        lift.y = at(lift.floor);
        if (t < lift.until) break;
        if (lift.cargo > 0 && lift.floor !== 0) {
          lift.target = 0;
          lift.state = "move";
        } else if (lift.cargo > 0) {
          lift.state = "unload";
          lift.until = t + 0.4;
        } else if (n > 1 && Math.random() < 0.6) {
          lift.target = Math.floor(Math.random() * n);
          if (lift.target !== lift.floor) lift.state = "move";
          else lift.until = t + 2;
        } else {
          lift.until = t + 2 + Math.random() * 4;
        }
        break;
      }
      case "move": {
        const ty = at(lift.target);
        const d = ty - lift.y;
        const step = Math.min(Math.abs(d), LIFT_SPEED * this.dt);
        lift.y += Math.sign(d) * step;
        if (Math.abs(ty - lift.y) < 0.5) {
          lift.y = ty;
          lift.floor = lift.target;
          lift.state = "idle";
          lift.until = t + 0.8 + Math.random() * 1.5;
        }
        break;
      }
      case "unload": {
        if (t < lift.until) break;
        if (lift.cargo <= 0 || lift.floor !== 0) {
          lift.state = "idle";
          lift.until = t + 1;
          break;
        }
        lift.cargo--;
        this.drops.push({ born: t });
        lift.until = t + 0.5;
        break;
      }
    }
  }

  private drawShaft(L: Layout, t: number): void {
    const ctx = this.ctx;
    if (L.floors.length === 0) return;
    const top = L.cutTop;
    const bottom = L.lotTop - SLAB_H;
    ctx.fillStyle = INK;
    ctx.fillRect(SHAFT_L - 1, top, SHAFT_R - SHAFT_L + 2, bottom - top);
    ctx.fillStyle = "#2a2530";
    ctx.fillRect(SHAFT_L, top, SHAFT_R - SHAFT_L, bottom - top);
    ctx.fillStyle = "#5b525f";
    ctx.fillRect(SHAFT_L + 1, top, 1, bottom - top);
    ctx.fillRect(SHAFT_R - 2, top, 1, bottom - top);
    // Landings: a strip of light where each floor meets the shaft.
    for (const f of L.floors) {
      ctx.fillStyle = "#8f8a83";
      ctx.fillRect(SHAFT_L, f.bottom - SLAB_H - 1, SHAFT_R - SHAFT_L, 1);
    }
    const car = artCanvas(HOIST_CAGE);
    const y = Math.round(this.lift.y);
    ctx.fillStyle = "#6a6270";
    ctx.fillRect(SHAFT_L + 5, top, 1, Math.max(0, y - top));
    ctx.drawImage(car.canvas, SHAFT_L + 2, y);
    if (this.lift.cargo > 0) {
      const pup = artCanvas(PUPPY_SPRITE);
      const bounce = this.lift.state === "move" ? Math.floor(t * 8) % 2 : 0;
      ctx.drawImage(pup.canvas, SHAFT_L + 3, y + car.h - 3 - pup.h - bounce);
    }
    // Floor numbers on the shaft wall.
    for (const [i, f] of L.floors.entries()) {
      ctx.fillStyle = "#c4ccd2";
      const digits = Math.min(i, 9);
      for (let d = 0; d <= digits && d < 5; d++) ctx.fillRect(SHAFT_R + 1, f.top + 6 + d * 2, 1, 1);
    }
  }

  // --- The staff -----------------------------------------------------------------------

  private stepHands(L: Layout, t: number, dt: number): void {
    const live = L.floors.map((f, i) => (f.kind === "empty" ? -1 : i)).filter((i) => i >= 0);
    const n = live.length;
    const count = n === 0 ? 0 : shownCount(this.owned("hand"), 14, 6);
    while (this.hands.length > count) this.hands.pop();
    while (this.hands.length < count) {
      const i = this.hands.length;
      const floor = live[i % n]!;
      const f = L.floors[floor]!;
      const x = ROOM_L + 10 + Math.random() * (ROOM_R - ROOM_L - 24);
      this.hands.push({ x, y: this.floorFoot(f) - Math.floor(Math.random() * 3), floor, state: "idle", tx: x, until: t + Math.random() * 2 });
    }
    for (const [i, hand] of this.hands.entries()) {
      // Floors come and go; a hand on a floor that isn't there any more steps onto one that is.
      if (!live.includes(hand.floor)) hand.floor = live[i % n]!;
      const f = L.floors[hand.floor]!;
      const foot = this.floorFoot(f);
      if (hand.y > foot || hand.y < foot - 3) hand.y = foot - Math.floor(Math.random() * 3);
      switch (hand.state) {
        case "idle": {
          if (t < hand.until) break;
          const roll = Math.random();
          if (roll < 0.18 && f.kind === "pens" && f.from < this.owned("patch")) {
            hand.state = "carry";
            hand.tx = SHAFT_R + 3;
          } else {
            hand.state = "walk";
            hand.tx = ROOM_L + 6 + Math.random() * (ROOM_R - ROOM_L - 16);
          }
          break;
        }
        case "walk": {
          if (this.walk(hand, dt)) {
            hand.state = "tend";
            hand.until = t + 1 + Math.random() * 2.5;
          }
          break;
        }
        case "tend": {
          if (t < hand.until) break;
          hand.state = "idle";
          hand.until = t + 0.4 + Math.random() * 1.6;
          break;
        }
        case "carry": {
          if (this.walk(hand, dt)) {
            hand.state = "load";
            hand.until = t + 0.6;
          }
          break;
        }
        case "load": {
          if (t < hand.until) break;
          // Into the lift, if it's here; otherwise it goes down the stairs and we don't draw the stairs.
          if (this.lift.floor === hand.floor && this.lift.state === "idle") this.lift.cargo = Math.min(4, this.lift.cargo + 1);
          else this.owedFallback();
          hand.state = "idle";
          hand.until = t + 0.5 + Math.random();
          break;
        }
      }
    }
  }

  /** A pup that went down the stairs still arrives. */
  private owedFallback(): void {
    if (this.owed > 0) this.drops.push({ born: this.clock });
  }

  private walk(hand: Hand, dt: number): boolean {
    const d = hand.tx - hand.x;
    if (Math.abs(d) < 1) {
      hand.x = hand.tx;
      return true;
    }
    hand.x += Math.sign(d) * Math.min(Math.abs(d), HAND_SPEED * dt);
    return false;
  }

  private drawHands(L: Layout, t: number): void {
    const ctx = this.ctx;
    const art = this.mark("hand");
    const sprite = artCanvas(art);
    const pup = artCanvas(PUPPY_SPRITE);
    for (const hand of this.hands) {
      if (hand.floor >= L.floors.length) continue;
      const moving = hand.state === "walk" || hand.state === "carry";
      const bob = moving ? Math.floor(t * 5 + hand.x) % 2 : hand.state === "tend" ? (Math.floor(t * 2) % 2) : 0;
      const x = Math.round(hand.x);
      const y = Math.round(hand.y) - sprite.h + bob;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = INK;
      ctx.fillRect(x + 1, Math.round(hand.y), sprite.w - 2, 1);
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite.canvas, x, y);
      if (hand.state === "carry" || hand.state === "load") ctx.drawImage(pup.canvas, x + 1, y - 4);
    }
  }

  // --- The lot -------------------------------------------------------------------------

  private drawLot(L: Layout, phase: Phase, t: number): void {
    const ctx = this.ctx;
    const top = L.lotTop;
    ctx.fillStyle = LOT;
    ctx.fillRect(0, top, W, this.sh - top);
    // The lane: darker, with a worn yellow line at its front edge.
    ctx.fillStyle = LOT_DARK;
    ctx.fillRect(0, top, W, LANE_H);
    ctx.fillStyle = "#d8c25a";
    for (let x = 30; x < W; x += 9) ctx.fillRect(x, top + LANE_H, 5, 1);
    // Cracks and a drain, seeded so the lot is the same lot every time.
    const rng = mulberry32(this.rngSeed ^ 0x10ad);
    ctx.fillStyle = LOT_DARK;
    for (let i = 0; i < 9; i++) {
      let x = Math.floor(rng() * W);
      let y = top + LANE_H + 2 + Math.floor(rng() * Math.max(1, this.sh - top - LANE_H - 4));
      const len = 3 + Math.floor(rng() * 7);
      for (let j = 0; j < len; j++) {
        ctx.fillRect(x, y, 1, 1);
        x += rng() < 0.5 ? 1 : 0;
        y += rng() < 0.7 ? 1 : 0;
      }
    }
    ctx.fillStyle = INK;
    ctx.fillRect(W - 40, top + LANE_H + 3, 8, 3);
    ctx.fillStyle = LOT_DARK;
    ctx.fillRect(W - 39, top + LANE_H + 4, 1, 1);
    ctx.fillRect(W - 37, top + LANE_H + 4, 1, 1);
    ctx.fillRect(W - 35, top + LANE_H + 4, 1, 1);
    // A puddle, when it's dark enough to reflect anything.
    if (phase !== "day") {
      ctx.fillStyle = rgba(SKY[phase].bottom, 0.35);
      ctx.fillRect(100, top + LANE_H + 8, 14, 3);
      ctx.fillRect(103, top + LANE_H + 11, 8, 1);
    }
    // The floodlight on the wall, over the lot.
    const flood = artCanvas(FLOOD);
    ctx.drawImage(flood.canvas, W - 26, top);
    void t;
  }

  private stepVans(L: Layout, dt: number): void {
    const n = shownCount(this.owned("hauler"), 4, 1.4);
    const y = L.lotTop + LANE_H - 2;
    while (this.vans.length > n) this.vans.pop();
    while (this.vans.length < n) {
      const i = this.vans.length;
      this.vans.push({ x: -20 - i * 50, y, speed: 9 + Math.random() * 4, until: 0 });
    }
    const brokenN = this.brokenOf("hauler", n);
    for (const [i, van] of this.vans.entries()) {
      van.y = y;
      if (i >= n - brokenN) {
        // Broken down where it stopped: bonnet up, going nowhere.
        van.x = Math.min(van.x, W - 30);
        continue;
      }
      if (this.clock < van.until) continue;
      van.x += van.speed * dt;
      // A stop at the bay under the chute, then off.
      if (van.x > 34 && van.x < 36 && Math.random() < 0.7) {
        van.until = this.clock + 2 + Math.random() * 3;
        van.x = 36;
      }
      if (van.x > W + 4) van.x = -24 - Math.random() * 60;
    }
  }

  private drawVans(L: Layout, t: number): void {
    const ctx = this.ctx;
    const n = this.vans.length;
    const brokenN = this.brokenOf("hauler", n);
    const art = this.mark("hauler");
    const sprite = artCanvas(art);
    for (const [i, van] of this.vans.entries()) {
      const broken = i >= n - brokenN;
      const x = Math.round(van.x);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = INK;
      ctx.fillRect(x + 2, van.y + 1, sprite.w - 4, 1);
      ctx.globalAlpha = 1;
      const rock = !broken && this.clock >= van.until && Math.floor(t * 6 + i) % 2 === 0 ? 1 : 0;
      ctx.drawImage((broken ? artTinted(art, INK, 0.5) : sprite).canvas, x, van.y - sprite.h + 1 - rock);
      if (!broken && this.clock >= van.until && this.chance(4)) this.puff(x - 1, van.y - 2, "exhaust", -8);
    }
    void L;
  }

  /** The chute: from the foot of the shaft down onto the lot. */
  private chute(L: Layout): { x0: number; y0: number; x1: number; y1: number } {
    return { x0: SHAFT_R - 4, y0: L.lotTop - SLAB_H - 2, x1: DROP_X, y1: L.lotTop + LANE_H + 1 };
  }

  private drawChute(L: Layout): void {
    const ctx = this.ctx;
    const c = this.chute(L);
    const steps = c.y1 - c.y0;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(c.x0 + ((c.x1 - c.x0) * i) / steps);
      const y = c.y0 + i;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 1, y, 6, 1);
      ctx.fillStyle = "#a8b0b8";
      ctx.fillRect(x, y, 4, 1);
    }
    ctx.fillStyle = INK;
    ctx.fillRect(c.x0 - 1, c.y0 - 2, 8, 2);
  }

  private stepDrops(L: Layout, t: number): void {
    const c = this.chute(L);
    const kept: Drop[] = [];
    for (const d of this.drops) {
      if (t - d.born >= CHUTE_S) {
        this.deliver(c.x1 + 2, c.y1 + 2, L);
        this.puff(c.x1 + 2, c.y1 + 1, "dust", -6);
        continue;
      }
      kept.push(d);
    }
    this.drops = kept;
  }

  private drawDrops(L: Layout, t: number): void {
    const ctx = this.ctx;
    const c = this.chute(L);
    const pup = artCanvas(PUPPY_SPRITE);
    for (const d of this.drops) {
      const p = clamp((t - d.born) / CHUTE_S, 0, 1);
      const x = Math.round(c.x0 + (c.x1 - c.x0) * p);
      const y = Math.round(c.y0 + (c.y1 - c.y0) * p);
      ctx.drawImage(pup.canvas, x - 1, y - pup.h);
    }
  }

  // --- Lighting ----------------------------------------------------------------------------

  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(r * 2), Math.ceil(r * 2));
  }

  private drawDark(L: Layout, phase: Phase, t: number): void {
    const dark = DARK[phase];
    const ctx = this.ctx;
    if (dark.out > 0) {
      // Outside: the façade and the roof, and the lot. The sky is already whatever colour the hour is.
      ctx.fillStyle = rgba(NIGHT, dark.out * 0.8);
      ctx.fillRect(0, L.skyBottom, W, L.cutTop - L.skyBottom);
      ctx.fillStyle = rgba(NIGHT, dark.out);
      ctx.fillRect(0, L.lotTop, W, this.sh - L.lotTop);
    }
    if (dark.inside > 0) {
      ctx.fillStyle = rgba(NIGHT, dark.inside);
      ctx.fillRect(0, L.cutTop, W, L.lotTop - L.cutTop);
    }
    // The heat lamps punch through whatever the hour did to the room.
    if (dark.inside > 0) {
      for (const [i, f] of L.floors.entries()) {
        if (f.kind !== "pens") continue;
        for (const lamp of this.lampsOn(L, i)) {
          if (!lamp.broken) this.glow(lamp.x, lamp.y + 14, 15, LAMP_GLOW, 0.14);
        }
      }
    }
    if (phase === "day") return;

    // The floodlight: a cone down and left across the lot, and a pool where it lands.
    const flicker = 0.94 + 0.06 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 11.7);
    const lit = (phase === "night" ? 1 : 0.55) * flicker;
    const hx = W - 23;
    const hy = L.lotTop + 3;
    const cone = ctx.createLinearGradient(0, hy, 0, this.sh);
    cone.addColorStop(0, rgba(FLOOD_LIGHT, 0.26 * lit));
    cone.addColorStop(0.6, rgba(FLOOD_LIGHT, 0.12 * lit));
    cone.addColorStop(1, rgba(FLOOD_LIGHT, 0));
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy);
    ctx.lineTo(hx + 3, hy);
    ctx.lineTo(hx + 30, this.sh);
    ctx.lineTo(hx - 92, this.sh);
    ctx.closePath();
    ctx.fill();
    this.glow(hx - 26, L.lotTop + (this.sh - L.lotTop) * 0.55, 70, FLOOD_LIGHT, 0.22 * lit);
    this.glow(hx, hy, 8, FLOOD_LIGHT, 0.5 * lit);
    // The sign throws pink onto the parapet.
    this.glow(28, L.skyBottom + 2, 26, NEON, 0.12 * lit);
  }

  // --- Whistles ------------------------------------------------------------------------------

  /** A whistle: notes off your fingertip, and the nearest dogs look up. */
  whistle(at?: { x: number; y: number }): void {
    if (this.notes.length > 16) return;
    const L = this.layout();
    const x = at ? clamp(Math.round(at.x), 4, W - 8) : 30 + Math.random() * (W - 60);
    const y = at ? clamp(Math.round(at.y), 8, this.sh - 4) : L.lotTop + 20 + Math.random() * 20;
    const now = performance.now();
    this.notes.push({ x, y, born: now, flip: false });
    this.notes.push({ x: x + 6, y: y - 3, born: now + 90, flip: true });

    // Two dogs near it perk up; one of them comes to see.
    const near = this.pack
      .filter((d) => !d.leaving && !d.fetching)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
      .slice(0, 2);
    for (const [i, dog] of near.entries()) {
      if (i === 0 && Math.hypot(dog.x - x, dog.y - y) > 14 && y > L.lotTop) {
        dog.doing = "zoom";
        dog.vx = Math.sign(x - dog.x || 1) * 40;
        dog.vy = clamp((y - dog.y) * 1.2, -12, 12);
        dog.until = this.clock + Math.min(0.9, Math.abs(x - dog.x) / 40);
      } else {
        dog.doing = "stand";
        dog.vx = Math.sign(x - dog.x || 1) * 0.001;
        dog.until = this.clock + 1.2;
      }
    }
  }

  private drawNotes(now: number): void {
    const ctx = this.ctx;
    const note = artCanvas(NOTE);
    const kept: Note[] = [];
    for (const n of this.notes) {
      const age = (now - n.born) / 1000;
      if (age < 0) {
        kept.push(n);
        continue;
      }
      if (age > 0.9) continue;
      kept.push(n);
      const p = age / 0.9;
      ctx.globalAlpha = 1 - p * p;
      const wob = Math.round(Math.sin(age * 9 + (n.flip ? 2 : 0)) * 1.5);
      ctx.drawImage(note.canvas, n.x + wob, Math.round(n.y - note.h - p * 14));
      ctx.globalAlpha = 1;
    }
    this.notes = kept;
  }

  // --- Puffs -----------------------------------------------------------------------------------

  private puff(x: number, y: number, kind: "dust" | "steam" | "smoke" | "fluff" | "bubble" | "exhaust", vx?: number): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    const spec = {
      dust: { color: "#b7ab98", vx: -6, vy: -5, dur: 620, size: 2 },
      steam: { color: "#e8ecf0", vx: 3, vy: -13, dur: 900, size: 2 },
      smoke: { color: "#8f8a94", vx: 4, vy: -9, dur: 1600, size: 2 },
      fluff: { color: "#f4e6cc", vx: 6, vy: -4, dur: 700, size: 1 },
      bubble: { color: "#bff2e0", vx: 0, vy: -6, dur: 800, size: 1 },
      exhaust: { color: "#6b6470", vx: -8, vy: -3, dur: 500, size: 1 },
    }[kind];
    this.puffs.push({
      x,
      y,
      vx: (vx ?? spec.vx) + (Math.random() - 0.5) * 6,
      vy: spec.vy - Math.random() * 3,
      born: performance.now(),
      dur: spec.dur,
      color: spec.color,
      size: spec.size,
    });
  }

  private drawPuffs(now: number, dt: number): void {
    const ctx = this.ctx;
    const kept: Puff[] = [];
    for (const p of this.puffs) {
      const age = now - p.born;
      if (age > p.dur) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = age / p.dur;
      ctx.globalAlpha = 0.8 * (1 - k);
      ctx.fillStyle = p.color;
      const s = p.size + (k > 0.5 ? 1 : 0);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      kept.push(p);
    }
    ctx.globalAlpha = 1;
    this.puffs = kept;
  }

  // --- The pack --------------------------------------------------------------------------------

  private stepHoard(dt: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) {
      if (!this.sawView) return;
      this.shown = target;
      this.shownLayout = yardLayout(target);
      return;
    }
    const k = 1 - Math.exp(-dt * 3.2);
    const gap = target - this.shown;
    this.shown += gap * k;
    if (Math.abs(gap) < Math.max(0.5, target * 1e-4)) this.shown = target;
    const next = yardLayout(this.shown);
    if (!sameLayout(next, this.shownLayout)) this.shownLayout = next;
  }

  private packBack(L: Layout): number {
    return L.lotTop + LANE_H + 4;
  }

  private packFront(): number {
    return this.sh - 4 + PACK_SPILL;
  }

  private drawPack(L: Layout): void {
    // Feet are the only depth cue — nothing is drawn scaled — so `y` sorts dogs, bowls and props alike.
    const queue: { y: number; go: () => void }[] = [];
    const back = this.packBack(L);
    const front = this.packFront();
    const prop = (art: Art, x: number, y: number) => {
      const sprite = artCanvas(art);
      queue.push({
        y,
        go: () => {
          this.propShadow(x, y, sprite.w);
          this.ctx.drawImage(sprite.canvas, x, y - sprite.h);
        },
      });
    };
    for (const [i, at] of BOWLS.entries()) {
      prop(i % 2 === 0 ? BOWL : BOWL_RED, at.x, Math.round(back + (front - back) * at.d));
    }
    prop(SKIP, W - 20, back + 4);
    prop(PALLETS, W - 36, front - 3);
    prop(TYRE, 150, Math.round(back + (front - back) * 0.5));
    for (const dog of this.pack) queue.push({ y: dog.y, go: () => this.drawPup(dog) });
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
  private stepPack(dt: number, t: number, L: Layout): void {
    const want = Math.min(PACK_CAP, Math.max(0, Math.round(this.shownLayout.pack)));
    let here = this.owed;
    for (const dog of this.pack) if (!dog.leaving) here++;

    if (here < want) {
      const missing = want - here;
      if (missing > 3) {
        for (let i = 0; i < missing; i++) this.pack.push(this.newPup(t, true, L));
      } else {
        if (this.owed === 0) this.owedSince = t;
        this.owed = Math.min(OWED_CAP, this.owed + missing);
      }
    } else if (here > want) {
      let over = here - want;
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

    const back = this.packBack(L);
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
      this.clearTheLanding(dog, t, L);
      if (dog.leaving && dog.x > SCENE_W + 2) continue;
      kept.push(dog);
    }
    this.pack = kept;

    // Nothing coming down the chute: let them in at the gate.
    if (this.owed > 0 && t - this.owedSince > OWED_TIMEOUT) {
      this.owedSince = t;
      this.owed--;
      this.pack.push(this.newPup(t, false, L));
    }
  }

  private clearTheLanding(dog: PackPup, t: number, L: Layout): void {
    if (dog.leaving || dog.fetching) return;
    if (this.clock - dog.born < GROW_SMALL) return;
    const back = this.packBack(L);
    const front = this.packFront();
    const landing = onLanding(dog.x, dog.y, back, front);
    if (!landing && !onPitch(dog.x, dog.y, front)) return;
    const away = landing ? 1 : -1;
    if (dog.doing === "trot" && dog.vx > 0 && dog.vy * away > 0) return;
    dog.doing = "trot";
    dog.vx = PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]);
    dog.vy = away * (3 + Math.random() * 5);
    dog.until = t + 1.5 + Math.random() * 1.5;
    dog.home = DROP_CLEAR_X + 8 + Math.random() * (PACK_RIGHT - DROP_CLEAR_X - 8);
  }

  /** Settle one off the tab, at the point on the ground where it landed. */
  private deliver(x: number, y: number, L: Layout): void {
    if (this.owed <= 0) return;
    this.owed--;
    const dog = this.newPup(this.clock, false, L);
    dog.x = clamp(x - 5, PACK_LEFT, PACK_RIGHT);
    dog.y = clamp(y, this.packBack(L), this.packFront());
    this.pack.push(dog);
  }

  private newPup(t: number, scatter: boolean, L: Layout): PackPup {
    const back = this.packBack(L);
    const front = this.packFront();
    const dog: PackPup = {
      x: scatter ? PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT) : DROP_X + Math.random() * 10 - 5,
      y: scatter ? back + Math.random() * Math.max(1, front - back) : back + 2,
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
      dog.vy = 2 + Math.random() * 4;
      dog.until = t + 1.6 + Math.random() * 2.5;
    }
    return dog;
  }

  private handAt(): { x: number; y: number } {
    return { x: HAND_X, y: this.packFront() };
  }

  private stepFetch(t: number, L: Layout): void {
    const hand = this.handAt();
    const back = this.packBack(L);
    const front = this.packFront();
    const f = this.fetch;

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
    const pose =
      age < GROW_SMALL
        ? POSE.newborn
        : dog.doing === "sit"
          ? POSE.sit + (Math.floor(this.clock * 1.5 + dog.x) % 2)
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
}
