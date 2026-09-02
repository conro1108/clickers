/**
 * The inside of the potato, drawn as a descent: a cutaway shaft, shallow strata at the top, deep at
 * the bottom, one bore down the left that all crop falls down into the mound. Shares only the buffer
 * conventions with `farmScene.ts`: integer-aligned unscaled blits, translation-only animation.
 * Colour is the depth model (gold lid -> ochre cortex -> magenta ring -> near-black core); keeping
 * all four zones in one hue family puts back the "stack of bands" bug this replaced.
 */

import type { solo } from "@clickers/sim";

import {
  HOIST_CAGE,
  POTATO_SPRITE,
  PRODUCER_MARKS,
  SHAFT_CREW_UP,
} from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  mix,
  mulberry32,
  rgba,
  yardLayout,
  type FarmView,
} from "./farmScene.js";
import { artCanvas, artTinted, type Art } from "./pixel.js";

export { SCENE_W };

// --- The ladder, and how deep each rung is ---

type InsideId = Extract<
  solo.SoloProducerId,
  "fold" | "deephand" | "face" | "well" | "main" | "chorus" | "heart" | "second"
>;

/** Ladder order, shallowest first, which is also top-of-screen first. */
export const ORDER: InsideId[] = [
  "fold",
  "deephand",
  "face",
  "well",
  "main",
  "chorus",
  "heart",
  "second",
];

export interface Zone {
  id: string;
  /** The two rungs that work this stratum, shallower one first. */
  tiers: [InsideId, InsideId];
  /** Top of the band, catching light off the cut above it. */
  lit: string;
  /** The body of the material. */
  flesh: string;
  /** The bottom of the band, in its own shadow. */
  deep: string;
  /** The one colour in the stratum that isn't the material — sprouts, sap, embers. */
  accent: string;
  /** Share of the shaft's height before normalising. Deeper zones get slightly more room. */
  weight: number;
}

/** Four strata. `hollow`/`cortex` are potato colours; `ring`/`core` deliberately leave the ochre family. */
export const ZONES: readonly Zone[] = [
  {
    id: "hollow",
    tiers: ["fold", "deephand"],
    lit: "#e8cf9a",
    flesh: "#d0b078",
    deep: "#a8814a",
    accent: "#a8f07a",
    weight: 1,
  },
  {
    id: "cortex",
    tiers: ["face", "well"],
    lit: "#cfa068",
    flesh: "#b07f4a",
    deep: "#7d5330",
    accent: "#fff4e0",
    weight: 1.15,
  },
  {
    id: "main",
    tiers: ["main", "chorus"],
    lit: "#a8636a",
    flesh: "#84454f",
    deep: "#4e2833",
    accent: "#e0a8dc",
    weight: 1.3,
  },
  {
    id: "core",
    tiers: ["heart", "second"],
    // Nearly black, well below the ring's darkest value, or the bottom two strata merge.
    lit: "#4a1f31",
    flesh: "#301324",
    deep: "#180a14",
    accent: "#ffb454",
    weight: 1.5,
  },
];

const ZONE_OF: Record<InsideId, number> = (() => {
  const out = {} as Record<InsideId, number>;
  ZONES.forEach((z, i) => z.tiers.forEach((t) => (out[t] = i)));
  return out;
})();

export function zoneOf(id: InsideId): number {
  return ZONE_OF[id];
}

/** How many strata are open: deepest owned rung + 1. A prefix, since you cut through to get there. */
export function openZones(working: Partial<Record<string, number>>): number {
  let deepest = -1;
  for (const id of ORDER) {
    if ((working[id] ?? 0) > 0) deepest = Math.max(deepest, ZONE_OF[id]);
  }
  return deepest + 1;
}

/** What a hundred-owned tier throws light in. Same rule the outside farm uses. */
const PRIME_GLOW: Record<InsideId, string> = {
  fold: "#ffd8e0",
  deephand: "#a8f07a",
  face: "#fff4e0",
  well: "#ff9a3c",
  main: "#e0a8dc",
  chorus: "#fff4c0",
  heart: "#ff7a6a",
  second: "#ffd166",
};

// --- The place ---

/** The lid: the underside of what closed over you, still the brightest thing. */
const LID_LIT = "#f2e0b4";
const LID_DEEP = "#c9a05c";

/** The sump floor, at the bottom of everything. Dark, so the hoard reads on it. */
const SUMP_DEEP = "#2c1620";
const SUMP_FLOOR = "#7a5648";
const SUMP_SPOIL = "#a88c5c";

/** The void in the bore, which is the only true dark in the picture. */
const VOID = "#160c12";

const INK = "#402e3a";

/** Gloom before anything of yours is lit. Constant: no time of day inside a potato. Sits where dusk sat outside. */
const GLOOM = 0.26;

/** Heartbeat period. Off any round number so it can't fall into step with the sheaves or accents. */
const HEART_PULSE_S = 2.7;

/** The lid's share of the buffer, clamped so it's a lip and never a ceiling. */
const LID_MIN = 11;
const LID_MAX = 20;
const LID_SHARE = 0.08;

/** The sump's share. It holds the mound, the broken kit and the cysts. */
const SUMP_MIN = 34;
const SUMP_SHARE = 0.21;

/** Nothing thinner than this is a stratum you can put a machine on. */
const BAND_MIN = 15;

/** The lid. */
export const LID = -1;
/** The sump, at the bottom, with the mound in it. */
export const SUMP = -2;
/** Potato you haven't cut into yet, between the deepest workings and the sump. */
export const UNDUG = -3;

export interface Band {
  /** Index into `ZONES`, or one of `LID` / `SUMP` / `UNDUG`. */
  zone: number;
  top: number;
  bottom: number;
}

/**
 * Where the strata break. Every zone gets the same share whether or not the ones below are open;
 * the remainder is undug potato (dividing the shaft among open zones stretched one band over the screen).
 * `openF` is fractional: an arriving zone eases its share in from zero. See `drawBreak`.
 */
export function bandsFor(sh: number, openF: number): Band[] {
  const lidH = clamp(Math.round(sh * LID_SHARE), LID_MIN, LID_MAX);
  const sumpH = Math.max(SUMP_MIN, Math.round(sh * SUMP_SHARE));
  const open = Math.max(0, Math.min(ZONES.length, openF));
  const whole = Math.ceil(open);
  const bands: Band[] = [{ zone: LID, top: 0, bottom: lidH }];

  // Never less than one readable stratum per open zone, however short the buffer.
  const body = Math.max(BAND_MIN * whole, sh - lidH - sumpH);
  const total = ZONES.reduce((a, z) => a + z.weight, 0);

  let y = lidH;
  for (let i = 0; i < whole; i++) {
    // Only the arriving band is scaled, so the reveal opens a floor rather than re-laying the picture.
    const part = i === whole - 1 ? open - (whole - 1) : 1;
    const full = Math.max(BAND_MIN, Math.round((ZONES[i]!.weight / total) * body));
    const h = Math.max(1, Math.round(full * part));
    bands.push({ zone: i, top: y, bottom: y + h });
    y += h;
  }

  const sumpTop = Math.max(y, sh - sumpH);
  if (sumpTop > y) bands.push({ zone: UNDUG, top: y, bottom: sumpTop });
  bands.push({ zone: SUMP, top: sumpTop, bottom: Math.max(sumpTop + 8, sh) });
  return bands;
}

/** Bore width from everything owned inside. Log, like every count that runs into the hundreds. */
export function boreWidth(total: number): number {
  // Never sealed: the fold leaves a crack before the first rung, or the arrival is a wall over a mound.
  return Math.max(10, Math.round(territory(total, 11, 34)));
}

/** Where the bore's left edge sits. Under the mound, which is the point. */
const BORE_X = 7;

// --- Counts, ground and traffic ---

/** How many of a tier to draw. Log: first few one-for-one, then a doubling per extra silhouette. */
export function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

/**
 * How a tier occupies its stratum. Identical `n`-in-a-row layouts read as eight shelves of merchandise,
 * so each rung does something else with the space: `bench` stands on the line, `knot` gathers into
 * groups with some tucked behind, `niche` is cut into the wall, `sunk` into the floor, `hang` off the roof.
 * No two rungs visible at once share a layout.
 */
type Layout = "bench" | "knot" | "niche" | "sunk" | "hang";

const LAYOUT: Record<InsideId, Layout> = {
  fold: "knot",
  // Never drawn from a slot — the Pit Hands are the crew.
  deephand: "bench",
  face: "niche",
  well: "sunk",
  main: "hang",
  chorus: "knot",
  heart: "niche",
  // Two of them, each most of a stratum.
  second: "bench",
};

/** Odds a gap between two units is tight rather than open. High clumps into knots; low is a picket fence. */
const TIGHT: Record<Layout, number> = {
  bench: 0.3,
  knot: 0.62,
  niche: 0.34,
  sunk: 0.4,
  hang: 0.36,
};

/** Minimum gap on top of unit width. Knots touch; pockets that abut merge into one stepped black block. */
const MIN_GAP: Record<Layout, number> = {
  bench: 1,
  knot: 0,
  niche: 5,
  sunk: 3,
  hang: 4,
};

/** Where a unit stands, and whether it's tucked in behind the ones in front. */
interface Slot {
  x: number;
  y: number;
  /** Set back into the group: drawn first, dimmer, and a little higher. */
  back: boolean;
}

/** How many of each tier ever appear on its ledge, however many you own. */
const CAP: Record<InsideId, number> = {
  fold: 5,
  deephand: 6,
  face: 5,
  well: 4,
  main: 5,
  chorus: 6,
  heart: 4,
  second: 2,
};

/** How much ground a tier has worked, from count. Log, pinned: one is visibly some, 128 is all of it. */
export function territory(owned: number, min: number, max: number): number {
  if (owned <= 0) return 0;
  const k = Math.min(1, Math.log2(owned) / Math.log2(128));
  return min + (max - min) * k;
}

/**
 * Spawn rate per second for `n` drawn units. Tied to the visible count, not the real rate (which spans
 * twenty orders of magnitude). Sub-linear and capped: overfeed the one bore and it reads as texture.
 */
export function flow(n: number): number {
  return Math.min(1.1, 0.24 + n * 0.1);
}

// --- Loose things ---

/** Starch dust, drifting up the bore. The ambient motion in a room with no weather. */
interface Mote {
  x: number;
  y: number;
  rise: number;
  sway: number;
  phase: number;
  bright: boolean;
}

const MOTES = 30;

/** A potato you turned up yourself, sitting in the open before it's carted off. */
interface Dug {
  x: number;
  y: number;
  born: number;
}

const DUG_MS = 850;

/** A breath of starch off something that just moved. */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

const MAX_PUFFS = 40;

/** A potato on its way to the mound: roll left along the ledge, fall the bore, slide into the pile. */
interface Crop {
  phase: "roll" | "fall" | "slide";
  x: number;
  y: number;
  /** Fall speed, and the spin it's carrying while it does. */
  vy: number;
  spin: number;
  /** Which tier cut it — or the farm overhead, tipping its harvest down. */
  from: InsideId | "above";
}

/** Potatoes/sec the farm overhead sends down. Constant from the first second after the fold, not a metering. */
const OUTSIDE_FLOW = 0.4;

/** Shaft crew: work a face, walk the bench, wait at the shaft, ride the cage. `post` is (zone, rung). */
interface Crew {
  x: number;
  y: number;
  post: { zone: number; first: boolean };
  state: "walk" | "work" | "wait" | "ride" | "mingle" | "climb";
  /** Where they're heading along the bench. */
  tx: number;
  /** Scene-clock time the current state runs out. */
  until: number;
  /** Where they're going when the cage comes, while waiting or riding. */
  bound: { zone: number; first: boolean } | null;
  /** By manway rather than cage: one bench up or down is a climb, further is a fare. */
  ladder: boolean;
  /** Carrying a fresh cut up to the Bruise Beds — the one journey that runs against the bore. */
  cargo: boolean;
  facing: 1 | -1;
  /** Phase for the walk bob, so a line of them isn't in lockstep. */
  phase: number;
}

/** How long a unit stays visibly in the middle of having made something. */
const WORK_BEAT_S = 0.45;

const CREW_SPEED = 13;
/** Slower than the walk: it's a ladder, and they're carrying lamps. */
const CLIMB_SPEED = 10;
const MAX_CREW = 9;
/** Two: enough that a carry is usually happening, few enough the bore stays the crop's road. */
const MAX_CARRY = 2;

/**
 * The hoist: a cage on a rope carrying people between benches (crop always goes down by gravity).
 * Only moves when called: fetches whoever waits at the shaft head, delivers, parks at the nearest bench.
 */
interface Hoist {
  y: number;
  /** Scene-clock time the doors close again, if it's stopped at a level. */
  restUntil: number;
  riders: Crew[];
  /** Who it's on its way to collect, if anyone. */
  errand: Crew | null;
  /** Which lane of the bore it runs in, as an offset from `BORE_X`. */
  lane: number;
  /** Rope paid out over the cage's life, px. The pit-head sheave turns off this and nothing else. */
  spin: number;
}

/** Cage count: min of bore width and crew size (no crew, no cages), capped at three. */
export function hoistCount(bore: number, crew: number): number {
  if (crew <= 0) return 0;
  const lanes = clamp(Math.floor((bore - 1) / 10), 1, 3);
  return Math.min(lanes, Math.ceil(crew / 3));
}

/** Lane pitch. A cage is nine wide; slight overlap is fine, the rope tells you which is which. */
const HOIST_LANE = 9;

/**
 * Run one cage `dist` px toward its target; returns whether it arrived. Pure so it can be tested:
 * a near-threshold check once left cages parked forever and stills couldn't tell. Must land exactly
 * on target, or riders step off into the wall.
 */
export function hoistRun(y: number, target: number, dist: number): { y: number; arrived: boolean } {
  const d = target - y;
  if (Math.abs(d) <= dist) return { y: target, arrived: true };
  return { y: y + Math.sign(d) * dist, arrived: false };
}

/** Row of the cage sprite a rider stands on — the row that lines up with a bench. */
const CAGE_FLOOR = 9;

const HOIST_SPEED = 19;
const HOIST_REST_S = 1.3;
const HOIST_SEATS = 2;

const MAX_CROP = 26;
/** Buffer pixels a second. A potato rolling itself along a ledge is unhurried. */
const ROLL_SPEED = 26;
/** Buffer pixels a second squared. Gentler than real gravity: it's a deep hole. */
const FALL_G = 190;
const SLIDE_SPEED = 34;

// --- The hoard ---

/** The hoard as a mound: same pile, same corner as outside. Storage down here is cysts, not sheds. */
const HEAP_BASE = 11;
const HEAP_COURSES = 10;
const HEAP_X = -14;
const HEAP_STEP = 5;
const HEAP_CLIMB = 1.15;

/** Capacity of the slot table above. Derived here, not imported: the outside scene has its own courses. */
const HEAP_CAP = ((HEAP_BASE + (HEAP_BASE - HEAP_COURSES + 1)) * HEAP_COURSES) / 2;

let heapCache: { x: number; y: number }[] | null = null;

function heapSlots(): { x: number; y: number }[] {
  if (!heapCache) {
    const h = artCanvas(POTATO_SPRITE).h;
    const slots: { x: number; y: number; key: number }[] = [];
    for (let course = 0; course < HEAP_COURSES; course++) {
      const n = HEAP_BASE - course;
      for (let i = 0; i < n; i++) {
        slots.push({
          x: HEAP_X + Math.round(course * (HEAP_STEP / 2)) + i * HEAP_STEP,
          y: -h - course * 3 - (i % 2),
          key: Math.abs(i - (n - 1) / 2) + course * HEAP_CLIMB,
        });
      }
    }
    slots.sort((a, b) => a.key - b.key);
    heapCache = slots.map(({ x, y }) => ({ x, y }));
  }
  return heapCache;
}

/** Where a sliding potato is aiming, and where the pile's shoulder is. */
const HEAP_CROWN_X = HEAP_X + Math.round((HEAP_COURSES - 1) * (HEAP_STEP / 2)) + 3;

/** A cyst: a swelling grown around your hoard. One per stage of the outside yard's build-out curve. */
const CYST_SLOTS: { x: number; row: number; w: number }[] = [
  { x: 158, row: 0, w: 9 },
  { x: 140, row: 1, w: 11 },
  { x: 122, row: 0, w: 9 },
  { x: 152, row: 2, w: 13 },
  { x: 104, row: 1, w: 11 },
  { x: 128, row: 3, w: 15 },
  { x: 86, row: 0, w: 9 },
  { x: 106, row: 3, w: 15 },
  { x: 82, row: 2, w: 13 },
  { x: 62, row: 3, w: 15 },
];

/** How many stages of the yard curve go by before another cyst swells up. */
const CYST_EVERY = 3;

/** How long the floor takes to give way when a new stratum opens. */
const REVEAL_S = 1.9;

// ---------------------------------------------------------------------------

export class InsideScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Scene time in seconds, accumulated a capped frame at a time — see FarmScene. */
  private clock = 0;
  private view: FarmView = EMPTY_VIEW;
  private rng: () => number = mulberry32(1);
  private dt = 0;
  private lastFrame = performance.now();
  private motes: Mote[] = [];
  private dug: Dug[] = [];
  private puffs: Puff[] = [];
  private crop: Crop[] = [];
  private crew: Crew[] = [];
  private hoists: Hoist[] = [];
  /** When each drawn unit last turned something up, keyed `id:index`. Drives the work bob and spark. */
  private worked = new Map<string, number>();
  private sawView = false;
  /** Strata drawn open, chasing how many are. Snapped on first view, eased after. `revealAt` = reveal start. */
  private openShown = 0;
  private revealAt: number | null = null;
  /** Heartbeat wavefront last frame, or null. `drawAccent` reads it a frame late. */
  private pulseY: number | null = null;
  /** Hoard shown, chasing the real one so spending looks like spending. */
  private shown = -1;

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

  update(view: FarmView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.rng = mulberry32(hashSeed(view.seed));
      this.clearOut();
      // A restore, a hand-down or a plough-under all open at their true depth.
      this.openShown = openZones(view.working);
      this.revealAt = null;
    } else if (openZones(view.working) > Math.ceil(this.openShown) && this.revealAt === null) {
      this.revealAt = this.clock;
    }
    this.sawView = true;
  }

  /** A different tuber entirely: handed down, or ploughed under. */
  private clearOut(): void {
    this.motes = [];
    this.dug = [];
    this.puffs = [];
    this.crop = [];
    this.crew = [];
    this.hoists = [];
    this.worked.clear();
    this.shown = Math.max(0, this.view.hoard);
  }

  start(): void {
    if (this.raf) return;
    this.lastFrame = performance.now();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
  }

  /** A dig: a potato comes up where you put your finger. Same feedback as outside. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 14) return;
    const bands = this.bands();
    const sump = bands[bands.length - 1]!;
    const x = at
      ? Math.max(3, Math.min(SCENE_W - 8, Math.round(at.x)))
      : 30 + Math.random() * (SCENE_W - 70);
    const y = at
      ? Math.max(bands[0]!.bottom, Math.min(this.sh - 8, Math.round(at.y)))
      : sump.top + 4 + Math.random() * 12;
    this.dug.push({ x: Math.round(x), y: Math.round(y), born: performance.now() });
    this.puff(x, y, -10);
    this.puff(x + 3, y, 10);
  }

  // --- Where things are ---

  /** How far through the current reveal, 0..1, eased. */
  private revealK(): number {
    if (this.revealAt === null) return 1;
    const k = clamp((this.clock - this.revealAt) / REVEAL_S, 0, 1);
    // Slow out of the break, fast into the settle.
    return k * k * (3 - 2 * k);
  }

  private bands(): Band[] {
    const target = openZones(this.view.working);
    if (this.revealAt !== null) {
      const k = this.revealK();
      const from = Math.ceil(this.openShown);
      const openF = from + (target - from) * k;
      if (k >= 1) {
        this.openShown = target;
        this.revealAt = null;
      }
      return bandsFor(this.sh, openF);
    }
    this.openShown = target;
    return bandsFor(this.sh, target);
  }

  /** The bore's right edge. Its left edge is `BORE_X`. */
  private boreRight(): number {
    let total = 0;
    for (const id of ORDER) total += this.owned(id);
    return BORE_X + boreWidth(total);
  }

  /** Manway's left rail: on the bore's working side, clear of the cage lanes on the other wall. */
  private manwayX(): number {
    return this.boreRight() - 4;
  }

  /** Which mark of a tier to draw, given the upgrades bought on it. */
  private mark(id: InsideId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  /** Owned a hundred of it, so it's lit. */
  private primed(id: InsideId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  private owned(id: InsideId): number {
    return this.view.working[id] ?? 0;
  }

  private working(id: InsideId): number {
    return shownCount(this.owned(id), CAP[id]);
  }

  /** Per-frame odds for something that should happen `perSec` times a second. */
  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  /**
   * Where a tier's units stand. Each rung of a zone gets its own half of the ledge and its own bench
   * (interleaving made a bruise/eye stripe). Spread by `territory`, arranged by `LAYOUT`, gaps uneven
   * on purpose — evenly spaced anything is a shelf.
   */
  private slots(id: InsideId, band: Band): Slot[] {
    const n = this.working(id);
    if (n <= 0) return [];
    const art = artCanvas(this.mark(id));
    const left = this.boreRight() + 3;
    const right = SCENE_W - 3;
    const mid = Math.round((left + right) / 2);
    const first = ZONES[band.zone]!.tiers[0] === id;
    const from = first ? left : mid + 2;
    const to = first ? mid - 2 : right;
    const foot = this.benchY(band, first);
    const kind = LAYOUT[id];

    const room = Math.max(art.w, to - from);
    // Never tighter than the units are wide, or a well-bought tier draws as a heap of rubble.
    const pitch = art.w + MIN_GAP[kind];
    const spread = clamp(territory(this.owned(id), art.w + 2, room), n * (pitch + 1), room);
    // Seeded off the tier: per-frame jitter is a vibrating farm.
    const rng = mulberry32(hashSeed(id) ^ 0x51e);

    // Each gap is tight or open; the slack is divided by weight, giving groups with daylight between.
    const gaps: number[] = [];
    for (let i = 0; i < n - 1; i++) gaps.push(rng() < TIGHT[kind] ? 0.22 : 1.5);
    const total = gaps.reduce((a, w) => a + w, 0) || 1;
    const slack = Math.max(0, spread - n * pitch);

    // Headroom between this tier's line and whatever is above it.
    const roof = first ? band.top : this.benchY(band, true);
    const headroom = Math.max(0, foot - roof - art.h - 4);

    const out: Slot[] = [];
    let x = from;
    for (let i = 0; i < n; i++) {
      if (i > 0) x += pitch + (slack * gaps[i - 1]!) / total;
      // Only inside a knot and only behind someone; a lone faded unit just looks faded.
      const back = kind === "knot" && i > 0 && gaps[i - 1]! < 1 && rng() < 0.55;
      let y: number;
      switch (kind) {
        case "niche":
          // Staggered up the face, never so high it breaks the roof of the seam.
          y = foot - art.h - 3 - Math.round(rng() * Math.min(10, headroom));
          break;
        case "sunk":
          // Set into the floor, showing about half. `drawTiers` clips the rest.
          y = foot - art.h + Math.max(2, Math.round(art.h * 0.45));
          break;
        case "hang":
          // Off the roof on a stem, each a different length.
          y = roof + 3 + Math.round(rng() * Math.min(14, headroom));
          break;
        default:
          // Bedded a pixel or two into the line so the bottom edge is ragged; a step back if tucked.
          y = foot - art.h + Math.round(rng() * 2) - (back ? 3 : 0);
      }
      out.push({
        x: clamp(Math.round(x) + (back ? -3 : 0), this.boreRight() + 1, SCENE_W - art.w - 1),
        y: clamp(y, roof + 1, foot - 1),
        back,
      });
    }
    return out;
  }

  /** The line a tier stands on: band floor for the deeper rung, a bench half-way up for the shallower. Clamped off the cut above. */
  private benchY(band: Band, first: boolean): number {
    if (!first) return band.bottom - 1;
    const h = band.bottom - band.top;
    return band.top + clamp(Math.round(h * 0.52), 11, Math.max(11, h - 12));
  }

  // --- Drawing ---

  private draw(): void {
    const now = performance.now();
    // Capped, so a backgrounded tab doesn't come back and fire every animation at once.
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += this.dt;
    const t = this.clock;

    const ctx = this.ctx;
    const bands = this.bands();
    const sump = bands[bands.length - 1]!;

    ctx.clearRect(0, 0, SCENE_W, this.sh);

    // Place, then the dark, then everything you built over the dark: lit kit is the only light source.
    this.drawLid(bands[0]!);
    for (const band of bands) {
      if (band.zone >= 0) this.drawStratum(band, t);
      else if (band.zone === UNDUG) this.drawUndug(band, bands);
    }
    this.drawSump(sump);
    this.drawBore(bands, t);
    this.drawHeadgear(bands);
    this.drawGloom(bands[0]!.bottom, sump.top);
    // Over the gloom, like the kit: it's lit sap, not terrain.
    this.drawVein(bands, t);

    // Deepest first, so near ledges overlap far ones where a sprite overhangs its cut.
    for (let i = bands.length - 1; i >= 0; i--) {
      const band = bands[i]!;
      if (band.zone >= 0) this.drawTiers(band, t);
    }

    this.stepHoist(bands, t);
    this.stepCrew(bands, t);
    this.drawLadderway(bands);
    this.drawHoist(bands);
    this.drawCrew();
    this.drawPulse(bands, t);

    this.drawMotes(bands[0]!.bottom, sump.top, t);
    this.drawHoard(sump.top);
    this.stepCrop(bands, sump.top);
    this.drawCrop();
    this.drawBroken(sump.top);
    this.drawDug(now);
    this.drawPuffs(now);
    this.drawBreak(bands, t);

    this.emit(bands, t);
  }

  /** The lid: the one warm, bright thing, so the eye enters at the top. A lip, not a ceiling. */
  private drawLid(lid: Band): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, lid.bottom);
    grad.addColorStop(0, LID_LIT);
    grad.addColorStop(1, LID_DEEP);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, lid.bottom);

    const rng = mulberry32(0x11d);
    for (let i = 0; i < 22; i++) {
      const y = Math.round(rng() * (lid.bottom - 2)) + 1;
      const x = Math.round(rng() * SCENE_W);
      const w = 3 + Math.round(rng() * 11);
      ctx.fillStyle = rgba(rng() > 0.6 ? "#f7ecd0" : "#b0854a", 0.22);
      ctx.fillRect(x, y, w, 1);
    }
    // Two vascular rings and eyes sprouting downward: the one thing here the player has seen before.
    for (let i = 0; i < 2; i++) {
      const base = Math.round(lid.bottom * (0.42 + i * 0.3));
      ctx.fillStyle = rgba("#a8703c", 0.35);
      for (let x = 0; x < SCENE_W; x++) {
        ctx.fillRect(x, base + Math.round(Math.sin(x * 0.09 + i * 2) * 1.6), 1, 1);
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = 14 + Math.round(rng() * (SCENE_W - 28));
      const y = lid.bottom - 4;
      ctx.fillStyle = rgba("#8a5a2c", 0.6);
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = rgba("#f2e0b4", 0.5);
      ctx.fillRect(x, y - 1, 3, 1);
      // Pale stems, not green: sprouting in the dark etiolates, and green would read as crop.
      ctx.fillStyle = rgba("#e6dcc0", 0.55);
      ctx.fillRect(x + 1, y + 2, 1, 2 + Math.round(rng() * 2));
    }
    // The cut where the lid stops and the potato starts.
    ctx.fillStyle = INK;
    ctx.fillRect(0, lid.bottom - 1, SCENE_W, 1);
  }

  /** One stratum. Gradient runs lit -> deep so each band is brighter at top than the one above is at bottom. */
  private drawStratum(band: Band, t: number): void {
    const ctx = this.ctx;
    const zone = ZONES[band.zone]!;
    const h = band.bottom - band.top;
    if (h <= 0) return;

    const grad = ctx.createLinearGradient(0, band.top, 0, band.bottom);
    grad.addColorStop(0, zone.lit);
    grad.addColorStop(0.45, zone.flesh);
    grad.addColorStop(1, zone.deep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, band.top, SCENE_W, h);

    // Marbling, low contrast so it doesn't compete with the kit in front of it.
    const rng = mulberry32(0x5a1 + band.zone * 977);
    const veins = Math.round(h * 0.55);
    for (let i = 0; i < veins; i++) {
      const y = band.top + 1 + Math.round(rng() * Math.max(1, h - 2));
      const x = Math.round(rng() * SCENE_W);
      const w = 4 + Math.round(rng() * 16);
      ctx.fillStyle = rgba(rng() > 0.5 ? zone.lit : zone.deep, 0.22);
      ctx.fillRect(x, y, w, 1);
    }

    // The worked face: a paler bite cut back into the far end of the ledge, as wide as the zone has cut.
    // Scored vertically; horizontal steps read as wooden panelling.
    const cut = this.faceWidth(band.zone);
    if (cut > 0) {
      const x0 = SCENE_W - cut;
      const face = mix(zone.lit, "#f7f1dc", 0.3);
      const rock = mulberry32(0x77 + band.zone * 313);
      for (let y = band.top + 1; y < band.bottom - 1; y++) {
        const jag = Math.round(Math.sin(y * 0.9 + band.zone * 3) * 2 + (rock() - 0.5) * 2);
        ctx.fillStyle = rgba(face, 0.42);
        ctx.fillRect(x0 + jag, y, SCENE_W - x0 - jag, 1);
      }
      for (let i = 0; i < Math.round(cut / 5); i++) {
        const x = x0 + 3 + Math.round(rock() * Math.max(1, cut - 4));
        const y = band.top + 2 + Math.round(rock() * Math.max(1, h - 6));
        ctx.fillStyle = rgba(zone.deep, 0.3);
        ctx.fillRect(x, y, 1, 2 + Math.round(rock() * 4));
      }
    }

    // One accent per zone, moving: sprouts, sap, embers.
    this.drawAccent(band, t);

    // The floor: three pixels with a bright lip, or the ring and core pool into one dark mass.
    ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.55), 0.75);
    ctx.fillRect(0, band.bottom - 3, SCENE_W, 1);
    ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.2), 0.5);
    ctx.fillRect(0, band.bottom - 2, SCENE_W, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(0, band.bottom - 1, SCENE_W, 1);
  }

  /**
   * Undug potato: denser, darker, featureless next to the strata. Tinted slightly toward the next
   * zone — a hint only; naming the next stratum before it's bought spends the reveal.
   */
  private drawUndug(band: Band, bands: Band[]): void {
    const ctx = this.ctx;
    const h = band.bottom - band.top;
    if (h <= 0) return;
    const nextZone = ZONES[bands.filter((b) => b.zone >= 0).length] ?? ZONES[ZONES.length - 1]!;
    const near = mix(nextZone.deep, "#241220", 0.5);
    const far = mix(nextZone.deep, "#140a12", 0.78);

    const grad = ctx.createLinearGradient(0, band.top, 0, band.bottom);
    grad.addColorStop(0, near);
    grad.addColorStop(1, far);
    ctx.fillStyle = grad;
    ctx.fillRect(0, band.top, SCENE_W, h);

    // Dense mottle: solid material, not a surface. Most of the screen on a farm one rung in.
    const rng = mulberry32(0x3f0d);
    for (let i = 0; i < Math.round(h * 5); i++) {
      const x = Math.round(rng() * SCENE_W);
      const y = band.top + Math.round(rng() * h);
      ctx.fillStyle = rgba(rng() > 0.55 ? near : "#0e0710", 0.22 + rng() * 0.3);
      ctx.fillRect(x, y, 1 + Math.round(rng() * 3), 1);
    }
    // Starch nodules: the pale stuff locked in the flesh, the reason to cut into it.
    for (let i = 0; i < Math.round(h / 7); i++) {
      const x = 3 + Math.round(rng() * (SCENE_W - 8));
      const y = band.top + 2 + Math.round(rng() * Math.max(1, h - 5));
      const w = 2 + Math.round(rng() * 3);
      ctx.fillStyle = rgba(SUMP_SPOIL, 0.28);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = rgba("#e6dcc0", 0.16);
      ctx.fillRect(x + 1, y - 1, Math.max(1, w - 2), 1);
    }
    // Fissures off the shaft; the stulls in the bore are the answer to them.
    for (let i = 0; i < Math.round(h / 22) + 1; i++) {
      let x = Math.round(rng() * SCENE_W);
      let y = band.top + Math.round(rng() * Math.max(1, h - 12));
      const len = 6 + Math.round(rng() * 18);
      const lean = rng() > 0.5 ? 1 : -1;
      for (let s = 0; s < len; s++) {
        ctx.fillStyle = rgba("#0a050a", 0.4);
        ctx.fillRect(x, y, 1, 1);
        y += 1;
        if (rng() > 0.6) x += lean;
        if (y >= band.bottom - 1) break;
      }
    }
  }

  /** How far the worked face is cut back into a zone's wall. */
  private faceWidth(zone: number): number {
    const owned = ZONES[zone]!.tiers.reduce((sum, id) => sum + this.owned(id), 0);
    return Math.round(territory(owned, 0, 62));
  }

  /** The one moving, highlighted thing per stratum; without it the deep two go to mush. */
  private drawAccent(band: Band, t: number): void {
    const ctx = this.ctx;
    const zone = ZONES[band.zone]!;
    const h = band.bottom - band.top;
    const rng = mulberry32(0x9e3 + band.zone * 131);
    const n = 5 + band.zone;
    for (let i = 0; i < n; i++) {
      const x = Math.round(rng() * (SCENE_W - 8)) + 4;
      const y = band.top + 2 + Math.round(rng() * Math.max(1, h - 6));
      // The heartbeat passing lifts whatever it passes.
      const lift = this.pulseY !== null && Math.abs(this.pulseY - y) < 9 ? 1.9 : 1;
      const pulse = (0.35 + 0.3 * Math.sin(t * 0.9 + i * 1.9)) * lift;
      if (band.zone === 0) {
        // Pale stems: etiolated, and off green so they don't read as crop.
        ctx.fillStyle = rgba(mix(zone.accent, "#f7f1dc", 0.55), Math.min(0.85, 0.5 * lift));
        ctx.fillRect(x, y, 1, 3);
        ctx.fillRect(x + 1, y - 1, 1, 1);
      } else if (band.zone === 1) {
        ctx.fillStyle = rgba(zone.accent, Math.min(0.8, 0.3 * lift));
        ctx.fillRect(x, y, 2, 1);
      } else if (band.zone === 2) {
        // Sap, beading and running. The colour that says this is an organ.
        const run = Math.round((t * 6 + i * 13) % Math.max(4, h - 4));
        ctx.fillStyle = rgba(zone.accent, 0.55 * pulse + 0.2);
        ctx.fillRect(x, band.top + 2 + run, 1, 2);
      } else {
        ctx.fillStyle = rgba(zone.accent, 0.22 * pulse);
        ctx.fillRect(x, y, 1, 1);
        this.glow(x, y, 5, zone.accent, 0.1 * pulse);
      }
    }
  }

  /** Everything of yours standing on one stratum, on its two benches. */
  private drawTiers(band: Band, t: number): void {
    const ctx = this.ctx;
    const zone = ZONES[band.zone]!;
    zone.tiers.forEach((id, ti) => {
      // Pit Hands aren't drawn here: they are the crew, and a static row would show the rung twice.
      if (id === "deephand") return;
      const slots = this.slots(id, band);
      if (slots.length === 0) return;
      const art = artCanvas(this.mark(id));

      // Bench under the shallower rung only; the deeper stands on the band floor, already drawn.
      if (ti === 0) {
        const foot = this.benchY(band, true);
        const x0 = Math.max(this.boreRight(), slots[0]!.x - 3);
        const x1 = Math.min(SCENE_W, slots[slots.length - 1]!.x + art.w + 3);
        ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.45), 0.6);
        ctx.fillRect(x0, foot - 1, x1 - x0, 1);
        ctx.fillStyle = INK;
        ctx.fillRect(x0, foot, x1 - x0, 1);
        // The undercut, so the bench is a shelf of material rather than a ruled line.
        ctx.fillStyle = rgba(zone.deep, 0.5);
        ctx.fillRect(x0 + 1, foot + 1, x1 - x0 - 2, 2);
      }

      const kind = LAYOUT[id];
      const foot = this.benchY(band, ti === 0);
      const roof = ti === 0 ? band.top : this.benchY(band, true);
      // The ones set back go down first, so the front of a knot overlaps them.
      const order = [...slots.keys()].sort(
        (a, b) => Number(slots[b]!.back) - Number(slots[a]!.back),
      );

      order.forEach((i) => {
        const slot = slots[i]!;
        // Work beat: a unit that just produced drops a pixel and throws a spark.
        // `worked` can hold a future time (the chorus books beats ahead), so hold still until then.
        const since = t - (this.worked.get(`${id}:${i}`) ?? -99);
        const beat = since >= 0 && since < WORK_BEAT_S ? 1 - since / WORK_BEAT_S : 0;
        const drop = Math.round(Math.sin(beat * Math.PI) * 2);
        this.setting(kind, zone, slot, art.w, art.h, roof, foot);
        this.primeGlow(id, slot.x, slot.y, art.w, art.h, t, i);
        // Set back into the group, so it takes the stratum's own shadow.
        const sprite = slot.back ? artTinted(this.mark(id), zone.deep, 0.45) : art;
        if (kind === "sunk") {
          // Only what's above the rim. The rest is in the floor.
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, roof, SCENE_W, Math.max(0, foot - roof));
          ctx.clip();
          ctx.drawImage(sprite.canvas, slot.x, slot.y + drop);
          ctx.restore();
        } else {
          ctx.drawImage(sprite.canvas, slot.x, slot.y + drop);
        }
        if (beat > 0.55) {
          ctx.fillStyle = rgba("#fff4c0", (beat - 0.55) * 2);
          ctx.fillRect(slot.x + art.w - 2, slot.y + drop + 2, 2, 1);
          ctx.fillRect(slot.x + art.w, slot.y + drop + 1, 1, 1);
        }
      });
    });
  }

  /** What a unit sits in, hangs off or is cut into — drawn behind it. Most of the strata difference lives here. */
  private setting(
    kind: Layout,
    zone: Zone,
    slot: Slot,
    w: number,
    h: number,
    roof: number,
    foot: number,
  ): void {
    const ctx = this.ctx;
    if (kind === "niche") {
      // Its own short ledge cut into the face. A bounded pocket read as a picture in a frame; a ledge
      // has no side edges. Same three lines as the main benches: lit top, ink, undercut.
      const rng = mulberry32(hashSeed(zone.id) ^ (slot.x * 2654435761));
      const lx = slot.x - 1 - Math.round(rng() * 2);
      const lw = w + 3 + Math.round(rng() * 3);
      // The face behind it, in shadow, so the unit isn't lit from behind by the flat wall.
      ctx.fillStyle = rgba(zone.deep, 0.45);
      ctx.fillRect(slot.x - 1, slot.y + 1, w + 2, h);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.35), 0.6);
      ctx.fillRect(lx, slot.y + h, lw, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(lx, slot.y + h + 1, lw, 1);
      ctx.fillStyle = rgba(zone.deep, 0.5);
      ctx.fillRect(lx + 1, slot.y + h + 2, lw - 2, 1);
      // Spoil under the cut, because something had to come out of it.
      ctx.fillStyle = rgba(zone.deep, 0.55);
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(lx + Math.round(rng() * lw), slot.y + h + 3 + Math.round(rng() * 2), 1, 1);
      }
    } else if (kind === "hang") {
      // The stem up to the roof: two pixels of it say hanging rather than floating.
      const x = slot.x + Math.floor(w / 2);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.3), 0.5);
      ctx.fillRect(x, roof, 1, Math.max(0, slot.y - roof));
      ctx.fillStyle = rgba(zone.deep, 0.7);
      ctx.fillRect(x - 1, roof, 3, 1);
    } else if (kind === "sunk") {
      // The rim it's sunk through, and the shadow the hole throws under it.
      ctx.fillStyle = rgba(zone.deep, 0.85);
      ctx.fillRect(slot.x - 1, foot - 3, w + 2, 3);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.3), 0.5);
      ctx.fillRect(slot.x - 2, foot - 4, w + 4, 1);
    }
  }

  /** The bore, drawn over the strata: one continuous hole, edges lit per band it passes through. */
  private drawBore(bands: Band[], t: number): void {
    const ctx = this.ctx;
    const right = this.boreRight();
    const top = bands[0]!.bottom;
    const floor = bands[bands.length - 1]!.top;
    if (right <= BORE_X || floor <= top) return;

    const grad = ctx.createLinearGradient(0, top, 0, floor);
    grad.addColorStop(0, mix(VOID, LID_DEEP, 0.28));
    grad.addColorStop(1, VOID);
    ctx.fillStyle = grad;
    ctx.fillRect(BORE_X, top, right - BORE_X, floor - top);

    // Walls lit per band, a cut lip at each floor. Runs the whole height including the undug.
    for (const band of bands) {
      const h = band.bottom - band.top;
      if (h <= 0 || band.zone === LID || band.zone === SUMP) continue;
      const zone = band.zone >= 0 ? ZONES[band.zone]! : null;
      ctx.fillStyle = rgba(zone ? mix(zone.lit, "#ffffff", 0.3) : "#8a6a58", 0.6);
      ctx.fillRect(BORE_X, band.top, 1, h);
      ctx.fillStyle = rgba(zone ? zone.deep : "#0e0710", 0.6);
      ctx.fillRect(right - 1, band.top, 1, h);
      if (!zone) continue;
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.5), 0.7);
      ctx.fillRect(BORE_X, band.bottom - 2, right - BORE_X, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(BORE_X, band.bottom - 1, right - BORE_X, 1);
    }

    // Stulls: what stops a tall black rectangle reading as a gap in the art.
    for (let y = top + 9; y < floor - 4; y += 13) {
      ctx.fillStyle = rgba("#4d4148", 0.85);
      ctx.fillRect(BORE_X + 1, y, right - BORE_X - 2, 1);
      ctx.fillStyle = rgba("#8a6a58", 0.5);
      ctx.fillRect(BORE_X + 1, y - 1, right - BORE_X - 2, 1);
    }

    // A slow breath of light, so the shaft is never static.
    const drift = ((t * 9) % (floor - top + 40)) - 20;
    this.glow(BORE_X + (right - BORE_X) / 2, top + drift, 14, "#f0c68c", 0.07);
  }

  /** The sap vein: the Ring Main as one vessel the full height of the workings, drip-feeding each stratum. Sap only, never crop. */
  private drawVein(bands: Band[], t: number): void {
    if (this.owned("main") <= 0) return;
    const ctx = this.ctx;
    const open = bands.filter((b) => b.zone >= 0);
    if (open.length === 0) return;
    const trunkX = SCENE_W - 8;
    const top = open[0]!.top + 3;
    const bottom = open[open.length - 1]!.bottom - 2;
    if (bottom <= top) return;
    const vein = ZONES[2]!.accent;
    for (let y = top; y < bottom; y++) {
      const jag = Math.round(Math.sin(y * 0.16 + 2) * 1.5);
      // Shadowed both sides: a bare pink line vanished over the pale worked faces.
      ctx.fillStyle = rgba("#4e2833", 0.6);
      ctx.fillRect(trunkX + jag - 1, y, 1, 1);
      ctx.fillStyle = rgba(vein, 0.85);
      ctx.fillRect(trunkX + jag, y, 1, 1);
      ctx.fillStyle = rgba("#4e2833", 0.6);
      ctx.fillRect(trunkX + jag + 1, y, 1, 1);
    }
    // Sap climbing it — with the heartbeat, one of two upward flows.
    for (let i = 0; i < 2; i++) {
      const y = bottom - ((t * 20 + (i * (bottom - top)) / 2) % (bottom - top));
      const jag = Math.round(Math.sin(y * 0.16 + 2) * 1.5);
      ctx.fillStyle = rgba(mix(vein, "#ffffff", 0.5), 0.8);
      ctx.fillRect(trunkX + jag, Math.round(y), 1, 2);
    }
    // The branch along the pumps' own seam, so the trunk is visibly theirs.
    const ring = bands.find((b) => b.zone === 2);
    if (ring) {
      const slots = this.slots("main", ring);
      if (slots.length > 0) {
        const y = ring.top + 2;
        const from = slots[0]!.x + 2;
        ctx.fillStyle = rgba(vein, 0.45);
        ctx.fillRect(from, y, Math.max(1, trunkX - from), 1);
      }
    }
    // A drip-feed into each stratum: elbow, a drop crawling down, a splash.
    for (const band of open) {
      const floor = band.bottom - 3;
      const elbowY = band.top + Math.round((band.bottom - band.top) * 0.35);
      const jag = Math.round(Math.sin(elbowY * 0.16 + 2) * 1.5);
      ctx.fillStyle = rgba(vein, 0.45);
      ctx.fillRect(trunkX + jag - 3, elbowY, 4, 1);
      const p = (t * 0.45 + band.zone * 0.37) % 1;
      if (p < 0.7) {
        const y = elbowY + 1 + (p / 0.7) * Math.max(1, floor - elbowY - 1);
        ctx.fillStyle = rgba(mix(vein, "#ffffff", 0.35), 0.7);
        ctx.fillRect(trunkX + jag - 3, Math.round(y), 1, 1);
      } else if (p < 0.8) {
        ctx.fillStyle = rgba(mix(vein, "#ffffff", 0.5), 0.5);
        ctx.fillRect(trunkX + jag - 4, floor, 3, 1);
      }
    }
  }

  /** The pit-head: the shaft continues up through the lid with daylight in it; `OUTSIDE_FLOW` potatoes fall out of it. */
  private drawHeadgear(bands: Band[]): void {
    const ctx = this.ctx;
    const lid = bands[0]!;
    const right = this.boreRight();
    const x0 = BORE_X + 1;
    const w = right - x0 - 1;
    if (w <= 2) return;

    // The shaft above, lit from the top: the only place the sky shows.
    const grad = ctx.createLinearGradient(0, 0, 0, lid.bottom);
    grad.addColorStop(0, mix(LID_LIT, "#fff7e0", 0.5));
    grad.addColorStop(0.55, mix(VOID, LID_DEEP, 0.4));
    grad.addColorStop(1, mix(VOID, LID_DEEP, 0.15));
    ctx.fillStyle = grad;
    ctx.fillRect(x0 + 1, 0, w - 1, lid.bottom);
    // Walls cut through the lid: lit one side, shadow the other, same as the bore below.
    ctx.fillStyle = rgba("#8a5a2c", 0.9);
    ctx.fillRect(x0, 0, 1, lid.bottom);
    ctx.fillStyle = rgba(LID_DEEP, 0.9);
    ctx.fillRect(right - 1, 0, 1, lid.bottom);

    // The beam, bolted across the mouth, and a sheave per rope hung off it.
    const beamY = lid.bottom - 4;
    ctx.fillStyle = "#4d4148";
    ctx.fillRect(x0 - 1, beamY, w + 2, 2);
    ctx.fillStyle = rgba("#8a8f96", 0.6);
    ctx.fillRect(x0 - 1, beamY, w + 2, 1);

    // One idle sheave even with no cages: a pit-head with no wheel is scaffolding.
    const lanes = Math.max(1, this.hoists.length);
    for (let i = 0; i < lanes; i++) {
      const h = this.hoists[i];
      const cx = BORE_X + 1 + (h ? h.lane : 0) + 4;
      this.drawSheave(cx, bands[0]!.bottom, h ? h.spin : 0);
    }
  }

  /** One sheave: a steel ring whose bright rim pixel walks as the rope pays out. */
  private drawSheave(cx: number, cy: number, spin: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#b8c0c8";
    ctx.fillRect(cx - 2, cy - 1, 1, 3);
    ctx.fillRect(cx + 2, cy - 1, 1, 3);
    ctx.fillRect(cx - 1, cy - 2, 3, 1);
    ctx.fillRect(cx - 1, cy + 2, 3, 1);
    ctx.fillStyle = "#3a2a30";
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    // Four stations round the rim, advanced by rope travel only.
    const spots = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ] as const;
    const at = spots[Math.floor(spin / 6) % 4]!;
    ctx.fillStyle = "#fff4c0";
    ctx.fillRect(cx + at[0], cy + at[1], 1, 1);
    ctx.fillStyle = "#8a8f96";
    ctx.fillRect(cx, cy, 1, 1);
  }

  /** The manway: a fixed ladder on the shaft's working side, for the trips a cage is overkill for. */
  private drawLadderway(bands: Band[]): void {
    const posts = this.posts(bands);
    if (posts.length < 2) return;
    const ctx = this.ctx;
    const rx = this.manwayX();
    const top = this.postY(bands, posts[0]!) - 9;
    const bottom = this.postY(bands, posts[posts.length - 1]!);
    if (bottom <= top) return;
    // Timber rails, not steel: has to read as the other thing beside the ropes.
    ctx.fillStyle = rgba("#8a6a58", 0.75);
    ctx.fillRect(rx, top, 1, bottom - top);
    ctx.fillRect(rx + 3, top, 1, bottom - top);
    ctx.fillStyle = rgba("#b8977a", 0.55);
    for (let y = top + 2; y < bottom; y += 4) ctx.fillRect(rx + 1, y, 2, 1);
  }

  /** The sump: dark on purpose, so the mound reads against it. */
  private drawSump(sump: Band): void {
    const ctx = this.ctx;
    const h = this.sh - sump.top;
    const grad = ctx.createLinearGradient(0, sump.top, 0, this.sh);
    grad.addColorStop(0, SUMP_FLOOR);
    grad.addColorStop(0.35, mix(SUMP_FLOOR, SUMP_DEEP, 0.55));
    grad.addColorStop(1, SUMP_DEEP);
    ctx.fillStyle = grad;
    ctx.fillRect(0, sump.top, SCENE_W, h);

    // Spoil: what's been cut and hasn't been picked up, banked against the back.
    const rng = mulberry32(0x2c0);
    for (let i = 0; i < 26; i++) {
      const x = Math.round(rng() * SCENE_W);
      const y = sump.top + Math.round(rng() * Math.min(6, h));
      ctx.fillStyle = rgba(SUMP_SPOIL, 0.25 + rng() * 0.25);
      ctx.fillRect(x, y, 1 + Math.round(rng() * 3), 1);
    }
    ctx.fillStyle = INK;
    ctx.fillRect(0, sump.top, SCENE_W, 1);
    ctx.fillStyle = rgba(SUMP_SPOIL, 0.5);
    ctx.fillRect(0, sump.top + 1, SCENE_W, 1);
  }

  /** Starch dust, rising up the shaft. It falls up in here. */
  private drawMotes(top: number, floor: number, t: number): void {
    const ctx = this.ctx;
    if (this.motes.length === 0) {
      for (let i = 0; i < MOTES; i++) {
        this.motes.push({
          x: this.rng() * SCENE_W,
          y: top + this.rng() * Math.max(1, floor - top),
          rise: 3 + this.rng() * 7,
          sway: 2 + this.rng() * 5,
          phase: this.rng() * 6.28,
          bright: this.rng() > 0.7,
        });
      }
    }
    for (const m of this.motes) {
      m.y -= m.rise * this.dt;
      if (m.y < top) {
        m.y = floor;
        m.x = this.rng() * SCENE_W;
      }
      const x = Math.round(m.x + Math.sin(t * 0.5 + m.phase) * m.sway);
      ctx.fillStyle = rgba("#e6dcc0", m.bright ? 0.4 : 0.18);
      ctx.fillRect(x, Math.round(m.y), 1, 1);
    }
  }

  // --- The crop, going down ---

  /** Every tier turns something up, on the visible count. Same three-phase journey for every rung. */
  private emit(bands: Band[], t: number): void {
    // The farm overhead, from the first frame after the fold, whether or not you own a thing.
    if (this.chance(OUTSIDE_FLOW)) this.dropFromAbove();
    for (const band of bands) {
      if (band.zone < 0) continue;
      ZONES[band.zone]!.tiers.forEach((id, ti) => {
        const n = this.working(id);
        if (n <= 0 || !this.chance(flow(n))) return;
        // A Pit Hand turns crop up wherever they stand: what they produce comes out of the figure.
        if (id === "deephand") {
          const who = this.crew[Math.floor(Math.random() * this.crew.length)];
          if (who && who.state === "work") this.cut(who.x + 2, who.y - 3, id);
          return;
        }
        const slots = this.slots(id, band);
        const pick = Math.floor(Math.random() * slots.length);
        const from = slots[pick];
        if (!from) return;
        this.worked.set(`${id}:${pick}`, t);
        const art = artCanvas(this.mark(id));
        const cx = from.x + art.w / 2;
        // A hand on this bench may shoulder it for the presses — see `tryCarry`.
        if (this.tryCarry(id, band, ti, cx, bands)) return;
        // Off the bench it was cut on, not the band floor.
        this.cut(cx, this.benchY(band, ti === 0) - 4, id);
      });
    }
    // The Second Potato fruits rather than being worked, so it drops straight into the bore.
    if (this.owned("second") > 0 && this.chance(0.2)) {
      this.puff(this.boreRight() + 2, bands[bands.length - 1]!.top - 6, -4);
    }
    // The Chorus: every so often the whole shaft answers, band by band, a wave of work-beats.
    if (
      this.owned("chorus") > 0 &&
      bands.filter((b) => b.zone >= 0).length > 1 &&
      this.chance(0.14)
    ) {
      this.chorusWave(bands, t);
    }
  }

  /** Whether a hand shoulders a fresh cut for the Bruise Beds instead of letting it roll. Rationed hard. */
  private tryCarry(id: InsideId, band: Band, ti: number, cutX: number, bands: Band[]): boolean {
    // The beds don't feed themselves, and a hand carrying its own dig reads as make-work.
    if (id === "fold" || id === "deephand") return false;
    if (this.owned("fold") <= 0) return false;
    if (Math.random() > 0.35) return false;
    if (this.crew.filter((c) => c.cargo).length >= MAX_CARRY) return false;
    const posts = this.posts(bands);
    const beds = posts.find((p) => p.zone === 0 && p.first);
    if (!beds) return false;
    const here = posts.findIndex((p) => p.zone === band.zone && p.first === (ti === 0));
    if (here < 0) return false;
    const porter = this.crew.find(
      (c) =>
        !c.cargo &&
        (c.state === "walk" || c.state === "work" || c.state === "mingle") &&
        c.post.zone === band.zone &&
        c.post.first === (ti === 0) &&
        Math.abs(c.x - cutX) < 45,
    );
    if (!porter) return false;
    porter.cargo = true;
    porter.bound = beds;
    porter.ladder = Math.abs(posts.indexOf(beds) - here) === 1;
    porter.state = "walk";
    porter.tx = this.boreRight() - 4;
    return true;
  }

  /** End of a carry: pressed into the nearest bed, or set down to roll if its bench stopped existing. */
  private deliver(c: Crew, bands: Band[], t: number): void {
    c.cargo = false;
    const band = bands.find((b) => b.zone === 0);
    if (band && c.post.zone === 0 && c.post.first) {
      const slots = this.slots("fold", band);
      if (slots.length > 0) {
        let best = 0;
        slots.forEach((s, i) => {
          if (Math.abs(s.x - c.x) < Math.abs(slots[best]!.x - c.x)) best = i;
        });
        const art = artCanvas(this.mark("fold"));
        const slot = slots[best]!;
        // The press takes its beat and the pressed crop rolls from the bed.
        this.worked.set(`fold:${best}`, t);
        this.cut(slot.x + art.w / 2, this.benchY(band, true) - 4, "fold");
        return;
      }
    }
    this.cut(c.x + 3, c.y - 4, "fold");
  }

  /** Every visible unit answers the Chorus, later the further from the seam. */
  private chorusWave(bands: Band[], t: number): void {
    for (const band of bands) {
      if (band.zone < 0) continue;
      for (const id of ZONES[band.zone]!.tiers) {
        if (id === "deephand") continue;
        const n = this.working(id);
        for (let i = 0; i < n; i++) {
          const delay = 0.12 + Math.abs(band.zone - 2) * 0.16 + i * 0.04;
          this.worked.set(`${id}:${i}`, t + delay);
        }
      }
    }
  }

  private cut(x: number, y: number, from: InsideId): void {
    if (this.crop.length >= MAX_CROP) return;
    this.crop.push({ phase: "roll", x, y, vy: 0, spin: Math.random() * 6.28, from });
    this.puff(x, y, Math.random() > 0.5 ? 6 : -6);
  }

  /** A potato from the farm above, entering at the very top of the frame. */
  private dropFromAbove(): void {
    if (this.crop.length >= MAX_CROP) return;
    const potato = artCanvas(POTATO_SPRITE);
    const right = this.boreRight();
    const x = BORE_X + 2 + Math.random() * Math.max(1, right - BORE_X - 4 - potato.w);
    this.crop.push({
      phase: "fall",
      x,
      y: 1,
      // Already moving when it clears the lid: it's been falling since the farm.
      vy: 26 + Math.random() * 18,
      spin: Math.random() * 6.28,
      from: "above",
    });
  }

  private stepCrop(bands: Band[], sumpTop: number): void {
    const lip = this.boreRight() - 2;
    const floor = sumpTop - 2;
    const kept: Crop[] = [];
    for (const c of this.crop) {
      if (c.phase === "roll") {
        c.x -= ROLL_SPEED * this.dt;
        if (c.x <= lip) {
          c.phase = "fall";
          c.x = BORE_X + 2 + Math.random() * Math.max(1, lip - BORE_X - 3);
        }
      } else if (c.phase === "fall") {
        c.vy += FALL_G * this.dt;
        c.y += c.vy * this.dt;
        c.spin += this.dt * 9;
        if (c.y >= floor) {
          c.y = floor;
          c.phase = "slide";
          this.puff(c.x, c.y + 3, -8, -4);
          this.puff(c.x + 2, c.y + 3, 8, -4);
        }
      } else {
        c.x -= SLIDE_SPEED * this.dt;
        // Into the pile, and gone.
        if (c.x <= HEAP_CROWN_X + 6) {
          this.puff(c.x, c.y, -4);
          continue;
        }
      }
      kept.push(c);
    }
    this.crop = kept;
    void bands;
  }

  private drawCrop(): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    for (const c of this.crop) {
      // A pixel of wobble rather than rotation: rotating the blit resamples off the grid.
      const wob = c.phase === "fall" ? Math.round(Math.sin(c.spin) * 1) : 0;
      ctx.drawImage(potato.canvas, Math.round(c.x) + wob, Math.round(c.y));
    }
  }

  // --- The crew and the hoist ---

  /** Bodies underground: exactly the Pit Hands you own. */
  private crewSize(bands: Band[]): number {
    if (bands.filter((b) => b.zone >= 0).length === 0) return 0;
    return Math.min(MAX_CREW, shownCount(this.owned("deephand"), MAX_CREW, 1.7));
  }

  /** Which benches exist to stand on, as `(zone, first)` pairs. */
  private posts(bands: Band[]): { zone: number; first: boolean }[] {
    const out: { zone: number; first: boolean }[] = [];
    for (const b of bands) {
      if (b.zone < 0) continue;
      for (const first of [true, false]) {
        if (this.working(ZONES[b.zone]!.tiers[first ? 0 : 1]) > 0) out.push({ zone: b.zone, first });
      }
    }
    return out;
  }

  private postY(bands: Band[], post: { zone: number; first: boolean }): number {
    const band = bands.find((b) => b.zone === post.zone);
    return band ? this.benchY(band, post.first) : bands[bands.length - 1]!.top;
  }

  /** The crew. Nothing fast, nothing synchronised, or it reads as a machine. */
  private stepCrew(bands: Band[], t: number): void {
    const posts = this.posts(bands);
    if (posts.length === 0) {
      this.crew = [];
      for (const h of this.hoists) h.riders = [];
      return;
    }
    const want = this.crewSize(bands);
    while (this.crew.length > want) this.crew.pop();
    while (this.crew.length < want) {
      const post = posts[this.crew.length % posts.length]!;
      this.crew.push({
        x: this.boreRight() + 6 + this.rng() * 40,
        y: this.postY(bands, post),
        post,
        state: "walk",
        tx: this.boreRight() + 10 + this.rng() * 60,
        until: 0,
        bound: null,
        ladder: false,
        cargo: false,
        facing: 1,
        phase: this.rng() * 6.28,
      });
    }

    const head = this.boreRight() - 4;
    for (const c of this.crew) {
      // A bench that stopped existing puts whoever was on it back on one that does.
      if (!posts.some((p) => p.zone === c.post.zone && p.first === c.post.first)) {
        c.post = posts[Math.floor(this.rng() * posts.length)]!;
        c.state = "walk";
      }
      if (c.state !== "ride" && c.state !== "climb") c.y = this.postY(bands, c.post);

      switch (c.state) {
        case "walk": {
          const d = c.tx - c.x;
          c.facing = d >= 0 ? 1 : -1;
          if (Math.abs(d) <= 1) {
            c.x = c.tx;
            if (c.tx <= head + 2 && c.bound) {
              c.state = c.ladder ? "climb" : "wait";
            } else {
              // A carry ends when the walk does: pressed on the beds' bench, else set down to roll.
              if (c.cargo) this.deliver(c, bands, t);
              // Usually lean on a machine; sometimes stand next to whoever else is here.
              const near = this.crew.find(
                (o) =>
                  o !== c &&
                  o.post.zone === c.post.zone &&
                  o.post.first === c.post.first &&
                  o.state === "work",
              );
              if (near && this.rng() < 0.35) {
                c.state = "mingle";
                c.until = t + 2 + this.rng() * 3;
                c.facing = near.x > c.x ? 1 : -1;
              } else {
                c.state = "work";
                c.until = t + 1.6 + this.rng() * 3.4;
              }
            }
          } else {
            c.x += Math.sign(d) * CREW_SPEED * this.dt;
          }
          break;
        }
        case "work":
        case "mingle": {
          if (t < c.until) break;
          c.state = "walk";
          // Every so often, change levels; that's what the cage is for.
          if (posts.length > 1 && this.rng() < 0.3) {
            let to = posts[Math.floor(this.rng() * posts.length)]!;
            if (to.zone === c.post.zone && to.first === c.post.first) {
              to = posts[(posts.indexOf(c.post) + 1) % posts.length] ?? to;
            }
            c.bound = to;
            // One bench over is a climb; further is a fare. `posts` is top-first, so index distance is bench distance.
            const at = posts.findIndex(
              (p) => p.zone === c.post.zone && p.first === c.post.first,
            );
            c.ladder = Math.abs(posts.indexOf(to) - at) === 1;
            c.tx = head;
          } else {
            c.bound = null;
            c.tx = this.wanderTo(c, bands);
          }
          break;
        }
        case "wait": {
          // Nothing on the rope to wait for: give up the trip rather than stand at the head forever.
          if (this.hoists.length === 0) {
            c.bound = null;
            c.state = "walk";
            c.tx = this.wanderTo(c, bands);
            break;
          }
          // Whichever cage is at this level with a seat; nobody waits for a specific cage.
          const at = this.postY(bands, c.post);
          const cage = this.hoists.find(
            (h) => h.riders.length < HOIST_SEATS && Math.abs(h.y - at) <= 3 && t < h.restUntil,
          );
          if (cage) {
            c.state = "ride";
            cage.riders.push(c);
          }
          break;
        }
        case "climb": {
          const to = c.bound;
          // The bench they were climbing to stopped existing: back onto the one they left.
          if (!to || !posts.some((p) => p.zone === to.zone && p.first === to.first)) {
            c.bound = null;
            c.state = "walk";
            c.tx = this.wanderTo(c, bands);
            break;
          }
          // On the manway at ladder pace. Same arrive-exactly contract as the cage.
          c.x = this.manwayX() - 2;
          const step = hoistRun(c.y, this.postY(bands, to), CLIMB_SPEED * this.dt);
          c.y = step.y;
          if (step.arrived) {
            c.post = to;
            c.bound = null;
            c.state = "walk";
            c.x = head;
            c.tx = this.wanderTo(c, bands);
          }
          break;
        }
        case "ride": {
          const cage = this.hoists.find((h) => h.riders.includes(c));
          if (!cage) {
            c.state = "walk";
            break;
          }
          c.x = BORE_X + cage.lane + 1 + cage.riders.indexOf(c) * 4;
          // Standing on the cage floor, so arrival is already at bench height.
          c.y = cage.y;
          const to = c.bound;
          if (to && Math.abs(cage.y - this.postY(bands, to)) <= 3 && t < cage.restUntil) {
            cage.riders = cage.riders.filter((r) => r !== c);
            c.post = to;
            c.bound = null;
            c.state = "walk";
            c.x = head;
            c.tx = this.wanderTo(c, bands);
          }
          break;
        }
      }
    }
  }

  /** Somewhere on this bench worth walking to — usually a machine on it. */
  private wanderTo(c: Crew, bands: Band[]): number {
    const band = bands.find((b) => b.zone === c.post.zone);
    if (!band) return c.x;
    const id = ZONES[c.post.zone]!.tiers[c.post.first ? 0 : 1];
    const slots = this.slots(id, band);
    if (slots.length > 0 && this.rng() < 0.8) {
      const slot = slots[Math.floor(this.rng() * slots.length)]!;
      return clamp(slot.x - 5, this.boreRight() + 2, SCENE_W - 8);
    }
    return this.boreRight() + 4 + this.rng() * (SCENE_W - this.boreRight() - 14);
  }

  /**
   * The cages: a rider is taken where they said; an empty cage collects whoever waits at the head;
   * otherwise park at the nearest bench. Two benches is the floor for a cage existing at all.
   * Benches are the whole of where a cage can be — clamping off the sump once moored a cage forever.
   */
  private stepHoist(bands: Band[], t: number): void {
    const posts = this.posts(bands);
    const want =
      posts.length < 2 ? 0 : hoistCount(this.boreRight() - BORE_X, this.crew.length);
    while (this.hoists.length > want) {
      // Whoever was aboard a cage just taken off the rope walks instead.
      for (const r of this.hoists.pop()!.riders) r.state = "walk";
    }
    while (this.hoists.length < want) {
      // Parked at different benches, so a new cage isn't shadowing one already on the rope.
      const i = this.hoists.length;
      this.hoists.push({
        y: this.postY(bands, posts[i % posts.length]!),
        restUntil: 0,
        riders: [],
        errand: null,
        lane: i * HOIST_LANE,
        spin: 0,
      });
    }

    for (const h of this.hoists) {
      // Someone aboard outranks someone waiting.
      const rider = h.riders.find((r) => r.bound);
      if (rider) h.errand = null;
      else {
        if (h.errand && !(h.errand.state === "wait" && this.crew.includes(h.errand))) {
          h.errand = null;
        }
        h.errand ??= this.callFor(h, bands);
      }

      const to = rider?.bound ?? h.errand?.post ?? null;
      if (t < h.restUntil) continue;
      if (to === null) {
        // Idle sits at a level: a cage stopped mid-shaft reads as broken down.
        const park = hoistRun(h.y, this.nearestPost(posts, bands, h.y), HOIST_SPEED * this.dt);
        h.spin += Math.abs(park.y - h.y);
        h.y = park.y;
        continue;
      }
      const step = hoistRun(h.y, this.postY(bands, to), HOIST_SPEED * this.dt);
      h.spin += Math.abs(step.y - h.y);
      h.y = step.y;
      // Doors at both ends, long enough to get on and off.
      if (step.arrived) h.restUntil = t + HOIST_REST_S;
    }
  }

  /** The nearest waiting body this cage could go and get, if it has a seat. */
  private callFor(h: Hoist, bands: Band[]): Crew | null {
    if (h.riders.length >= HOIST_SEATS) return null;
    let best: Crew | null = null;
    let near = Infinity;
    for (const c of this.crew) {
      if (c.state !== "wait" || !c.bound) continue;
      // One cage per caller, or all three set off for the same person.
      if (this.hoists.some((o) => o !== h && o.errand === c)) continue;
      const d = Math.abs(this.postY(bands, c.post) - h.y);
      if (d < near) {
        near = d;
        best = c;
      }
    }
    return best;
  }

  private nearestPost(
    posts: { zone: number; first: boolean }[],
    bands: Band[],
    y: number,
  ): number {
    let best = y;
    let near = Infinity;
    for (const p of posts) {
      const at = this.postY(bands, p);
      if (Math.abs(at - y) < near) {
        near = Math.abs(at - y);
        best = at;
      }
    }
    return best;
  }

  private drawHoist(bands: Band[]): void {
    const ctx = this.ctx;
    const cage = artCanvas(HOIST_CAGE);
    const top = bands[0]!.bottom;
    for (const h of this.hoists) {
      const x = BORE_X + 1 + h.lane;
      // `h.y` is the level; the cage hangs above it so its floor lands on the bench.
      const y = Math.round(h.y) - CAGE_FLOOR;
      // The rope up to the head: says hung, not hovering, and which box is on which line.
      ctx.fillStyle = rgba("#b8c0c8", 0.75);
      ctx.fillRect(x + 4, top, 1, Math.max(0, y - top));
      // Lit from inside, so a steel box in a black shaft is findable.
      this.glow(x + 4, y + 6, 13, "#ffe6a0", 0.16);
      ctx.drawImage(cage.canvas, x, y);
    }
  }

  private drawCrew(): void {
    const ctx = this.ctx;
    for (const c of this.crew) {
      // Two poses: arms up on the ladder and at the face, down otherwise.
      const up = c.state === "ride" || c.state === "work" || c.state === "climb";
      // Walking crew wear the Pit Hand tier's mark; the arms-up pose is the one shared sprite.
      const art = artCanvas(up ? SHAFT_CREW_UP : this.mark("deephand"));
      const bob = c.state === "walk" ? Math.round(Math.sin(this.clock * 7 + c.phase) * 0.5) : 0;
      const x = Math.round(c.x);
      const y = Math.round(c.y) - art.h + bob;
      // The lamp, which is what makes them findable in the deep strata.
      this.glow(x + 3, y + 2, 9, "#ffe6a0", 0.22);
      ctx.drawImage(art.canvas, x, y);
      // The load, held overhead the whole way to the presses.
      if (c.cargo) {
        const potato = artCanvas(POTATO_SPRITE);
        ctx.drawImage(potato.canvas, x + 1, y - potato.h + 2);
      }
      // The call: a blink at the lip while somebody waits at the shaft head.
      if (c.state === "wait" && Math.sin(this.clock * 6 + c.phase) > 0) {
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(this.boreRight() - 1, y + 1, 1, 1);
        this.glow(this.boreRight() - 1, y + 1, 4, "#ffd166", 0.3);
      }
    }
  }

  // --- The sump ---

  /** The hoard: a mound at the front, cysts swelling around it as you get richer. Chases the real number. */
  private drawHoard(sumpTop: number): void {
    const ctx = this.ctx;
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    // Exponential chase on the magnitude, so each order takes about the same moment.
    const k = 1 - Math.pow(0.06, this.dt);
    this.shown += (target - this.shown) * k;
    const layout = yardLayout(this.shown);

    // The cysts first: the mound is heaped in front of them.
    const cysts = Math.min(CYST_SLOTS.length, Math.floor(layout.stage / CYST_EVERY));
    for (let i = 0; i < cysts; i++) this.drawCyst(CYST_SLOTS[i]!, sumpTop, i);

    const potato = artCanvas(POTATO_SPRITE);
    const slots = heapSlots();
    const heap = Math.min(HEAP_CAP, Math.max(0, Math.round(layout.heap)));
    const foot = this.sh - 3;
    for (let i = 0; i < heap; i++) {
      const slot = slots[i];
      if (!slot) break;
      ctx.drawImage(potato.canvas, slot.x, foot + slot.y);
    }
  }

  /**
   * One cyst, drawn from courses since its size is a variable. What makes it read as storage:
   * crop visible through the skin, a slow breathe on its own phase, and a wet highlight lit from the shaft.
   */
  private drawCyst(slot: { x: number; row: number; w: number }, sumpTop: number, i: number): void {
    const ctx = this.ctx;
    const breathe = Math.sin(this.clock * 0.8 + i * 1.7);
    const base = sumpTop + 6 + slot.row * 6;
    const w = slot.w + (breathe > 0.6 ? 1 : 0);
    const courses = Math.max(2, Math.round(w / 2.4));
    const skin = mix(SUMP_SPOIL, "#e6dcc0", 0.4);

    // Skin opaque, crop dimmed on top: a translucent film over a dark sump comes out grey.
    for (let c = 0; c < courses; c++) {
      // Narrows faster near the crown: a dome, not a ziggurat. Whole pixels.
      const inset = Math.round(Math.pow(c / courses, 1.5) * (w / 2));
      const span = w - inset * 2;
      if (span <= 0) break;
      const y = base - c;
      ctx.fillStyle = INK;
      ctx.fillRect(slot.x + inset - 1, y, span + 2, 1);
      ctx.fillStyle = c === courses - 1 ? mix(skin, "#f7f1dc", 0.55) : skin;
      ctx.fillRect(slot.x + inset, y, span, 1);
    }

    // The crop showing through, in the potato's own colour.
    const rng = mulberry32(0x9c + i * 71);
    for (let c = 1; c < courses - 1; c += 2) {
      const inset = Math.round(Math.pow(c / courses, 1.5) * (w / 2)) + 2;
      for (let x = slot.x + inset; x < slot.x + w - inset - 1; x += 4) {
        if (rng() < 0.2) continue;
        ctx.fillStyle = rgba("#8a5a24", 0.5);
        ctx.fillRect(x, base - c - 1, 3, 2);
        ctx.fillStyle = rgba("#c98b4b", 0.45);
        ctx.fillRect(x, base - c - 1, 2, 1);
      }
    }

    ctx.fillStyle = INK;
    ctx.fillRect(slot.x - 1, base + 1, w + 2, 1);
    // The wet highlight down its shaft-facing shoulder.
    ctx.fillStyle = rgba("#fff4e0", 0.55 + breathe * 0.15);
    ctx.fillRect(slot.x + 2, base - courses + 2, 1, Math.max(1, courses - 3));
    ctx.fillRect(slot.x + 3, base - courses + 1, 1, 1);
  }

  /** Dead kit, in one strip along the front, clear of the corner where the bore comes down. */
  private drawBroken(sumpTop: number): void {
    const ctx = this.ctx;
    let x = Math.max(24, this.boreRight() + 6);
    for (const id of ORDER) {
      const n = shownCount(this.view.broken[id] ?? 0, CAP[id]);
      for (let i = 0; i < n; i++) {
        const dead = artTinted(this.mark(id), "#6b6b74", 0.62);
        if (x + dead.w > SCENE_W - 6) return;
        ctx.drawImage(dead.canvas, x, sumpTop - dead.h + 2);
        x += dead.w + 3;
      }
    }
  }

  // --- The reveal ---

  /** The floor giving way when a stratum opens: a crack plus starch, over the window `bandsFor` eases in. Cheap on purpose. */
  private drawBreak(bands: Band[], t: number): void {
    if (this.revealAt === null) return;
    const ctx = this.ctx;
    const k = clamp((this.clock - this.revealAt) / REVEAL_S, 0, 1);
    const opening = bands.find((b) => b.zone === Math.ceil(this.openShown) - 1);
    const y = opening ? opening.bottom : bands[bands.length - 1]!.top;

    // The crack runs out from the bore, because that's where the cutting is.
    const reach = Math.round(k * SCENE_W * 1.15);
    for (let x = BORE_X; x < Math.min(SCENE_W, BORE_X + reach); x++) {
      const jag = Math.round(Math.sin(x * 0.7 + t) * 1.6);
      ctx.fillStyle = rgba(VOID, 0.85 * (1 - k * 0.4));
      ctx.fillRect(x, y - 2 + jag, 1, 3);
      if (Math.random() < 0.06) this.puff(x, y, (Math.random() - 0.5) * 20, -14);
    }
    // A flare along the break as it lets go.
    const flash = Math.max(0, 1 - Math.abs(k - 0.35) * 5);
    if (flash > 0) {
      ctx.fillStyle = rgba("#f7f1dc", 0.5 * flash);
      ctx.fillRect(0, y - 3, SCENE_W, 4);
    }
  }

  // --- Small things ---

  private drawDug(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      // Up out of the flesh, hang, and gone.
      const lift = Math.round(Math.sin(Math.min(1, age * 1.6) * Math.PI * 0.5) * 5);
      ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      ctx.drawImage(potato.canvas, d.x, d.y - lift);
      ctx.globalAlpha = 1;
    }
  }

  private puff(x: number, y: number, vx: number, vy = -6): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    this.puffs.push({ x, y, vx, vy, born: performance.now(), life: 500 + Math.random() * 400 });
  }

  private drawPuffs(now: number): void {
    const ctx = this.ctx;
    this.puffs = this.puffs.filter((p) => now - p.born < p.life);
    for (const p of this.puffs) {
      const age = (now - p.born) / p.life;
      const x = Math.round(p.x + p.vx * age);
      const y = Math.round(p.y + p.vy * age);
      ctx.fillStyle = rgba("#e6dcc0", 0.35 * (1 - age));
      ctx.fillRect(x, y, 2, 2);
    }
  }

  /** The heartbeat: warm light climbing the bore from core to lid, the one signal that travels against the crop. */
  private drawPulse(bands: Band[], t: number): void {
    this.pulseY = null;
    if (this.owned("heart") <= 0) return;
    const heart = bands.find((b) => b.zone === 3);
    if (!heart) return;
    const k = (t % HEART_PULSE_S) / HEART_PULSE_S;
    // The beat is the first half of the period; the rest is diastole.
    if (k > 0.55) return;
    const p = k / 0.55;
    const from = (heart.top + heart.bottom) / 2;
    const to = bands[0]!.bottom;
    const y = from + (to - from) * p;
    this.pulseY = y;
    this.glow((BORE_X + this.boreRight()) / 2, y, 13, "#ff7a6a", 0.11 * (1 - p * 0.45));
    this.ctx.fillStyle = rgba("#ff7a6a", 0.05 * (1 - p));
    this.ctx.fillRect(0, Math.round(y), SCENE_W, 1);
  }

  /** The dark the shaft is in before anything of yours is standing in it. */
  private drawGloom(top: number, sumpTop: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba("#140a10", GLOOM);
    ctx.fillRect(0, top, SCENE_W, this.sh - top);
    // The lid takes less: it's the closest thing to a source.
    ctx.fillStyle = rgba("#140a10", GLOOM * 0.35);
    ctx.fillRect(0, 0, SCENE_W, top);
    // The sump is warmed rather than dimmed: the hoard is what you came to look at.
    ctx.fillStyle = rgba("#f0c68c", 0.07);
    ctx.fillRect(0, sumpTop, SCENE_W, this.sh - sumpTop);
  }

  // --- Light ---

  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0.001 || r <= 0) return;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  /** A hundred-owned tier's glow. Breathes on a per-unit phase, or a stratum of them reads as a shader. */
  private primeGlow(
    id: InsideId,
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
    this.glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.9 * scale, PRIME_GLOW[id], 0.4 * pulse * scale);
  }
}
