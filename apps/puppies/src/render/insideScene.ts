/** The inside of the nest, drawn as a descent. */

import type { solo } from "@clickers/sim";

import {
  HOIST_CAGE,
  PACK_COATS,
  PACK_POSES,
  POSE,
  PUPPY_SPRITE,
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
  type MillView,
  PACK_CAP,
  PACK_LEFT,
  PACK_RIGHT,
  PACK_STRIDE,
  pickAction,
  type PackPup,
} from "./millScene.js";
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
  lit: string;
  weave: string;
  deep: string;
  /** The one colour in the stratum that isn't the material — threads, lint, embers. */
  accent: string;
  /** Share of the shaft's height, before normalising over however many zones are open. */
  weight: number;
}

/** Four strata, and the colour run that is the whole point. */
export const ZONES: readonly Zone[] = [
  {
    id: "fold",
    tiers: ["fold", "deephand"],
    lit: "#f6efe4",
    weave: "#e6dccb",
    deep: "#c2b6a2",
    accent: "#f0a8c0",
    weight: 1,
  },
  {
    id: "face",
    tiers: ["face", "well"],
    lit: "#e4d3ae",
    weave: "#cdb488",
    deep: "#a48a5e",
    accent: "#fffaf0",
    weight: 1.15,
  },
  {
    id: "main",
    tiers: ["main", "chorus"],
    lit: "#a06a62",
    weave: "#7a4a48",
    deep: "#48282a",
    accent: "#e8b0a0",
    weight: 1.3,
  },
  {
    id: "warm",
    tiers: ["heart", "second"],
    lit: "#3a1c1c",
    weave: "#241010",
    deep: "#140808",
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

/** How many strata are open, which is the deepest rung you own plus one. */
export function openZones(working: Partial<Record<string, number>>): number {
  let deepest = -1;
  for (const id of ORDER) {
    if ((working[id] ?? 0) > 0) deepest = Math.max(deepest, ZONE_OF[id]);
  }
  return deepest + 1;
}

/** What a hundred-owned tier throws light in. Same rule the outside mill uses. */
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

/** The fold: the underside of what closed over you, still the brightest thing. */
const LID_LIT = "#f2e0b4";
const LID_DEEP = "#c9a05c";

const SUMP_DEEP = "#2c1620";
const SUMP_FLOOR = "#7a5648";
const SUMP_SPOIL = "#a88c5c";

const VOID = "#160c12";

const INK = "#402e3a";

/** How dark it is down here before anything of yours is lit. */
const GLOOM = 0.26;

const LID_MIN = 11;
const LID_MAX = 20;
const LID_SHARE = 0.08;

const SUMP_MIN = 34;
const SUMP_SHARE = 0.21;

/** Nothing thinner than this is a stratum you can put a machine on. */
const BAND_MIN = 15;

export const HEM = -1;
export const SUMP = -2;
/** Puppy you haven't cut into yet, between the deepest workings and the sump. */
export const UNWHISTLED = -3;

export interface Band {
  /** Index into `ZONES`, or one of `HEM` / `SUMP` / `UNWHISTLED`. */
  zone: number;
  top: number;
  bottom: number;
}

/** Where the strata break, given a buffer height and how many are open. */
export function bandsFor(sh: number, openF: number): Band[] {
  const lidH = clamp(Math.round(sh * LID_SHARE), LID_MIN, LID_MAX);
  const sumpH = Math.max(SUMP_MIN, Math.round(sh * SUMP_SHARE));
  const open = Math.max(0, Math.min(ZONES.length, openF));
  const whole = Math.ceil(open);
  const bands: Band[] = [{ zone: HEM, top: 0, bottom: lidH }];

  // Never less than one readable stratum per open zone, however short the buffer.
  const body = Math.max(BAND_MIN * whole, sh - lidH - sumpH);
  const total = ZONES.reduce((a, z) => a + z.weight, 0);

  let y = lidH;
  for (let i = 0; i < whole; i++) {
    // Only the arriving band is scaled; the rest stay full size so the reveal opens a floor rather than re-laying the picture.
    const part = i === whole - 1 ? open - (whole - 1) : 1;
    const full = Math.max(BAND_MIN, Math.round((ZONES[i]!.weight / total) * body));
    const h = Math.max(1, Math.round(full * part));
    bands.push({ zone: i, top: y, bottom: y + h });
    y += h;
  }

  const sumpTop = Math.max(y, sh - sumpH);
  if (sumpTop > y) bands.push({ zone: UNWHISTLED, top: y, bottom: sumpTop });
  bands.push({ zone: SUMP, top: sumpTop, bottom: Math.max(sumpTop + 8, sh) });
  return bands;
}

/** How wide the bore is, given everything you own inside. */
export function boreWidth(total: number): number {
  return Math.round(territory(total, 11, 34));
}

/** Where the bore's left edge sits. Under the mound, which is the point. */
const BORE_X = 7;

// --- Counts, ground and traffic ---

export function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

type Layout = "bench" | "knot" | "niche" | "sunk" | "hang";

const LAYOUT: Record<InsideId, Layout> = {
  fold: "knot",
  deephand: "bench",
  face: "niche",
  well: "sunk",
  main: "hang",
  chorus: "knot",
  heart: "niche",
  second: "bench",
};

/** How often the gap between two units is a tight one rather than an open one. */
const TIGHT: Record<Layout, number> = {
  bench: 0.3,
  knot: 0.62,
  niche: 0.34,
  sunk: 0.4,
  hang: 0.36,
};

/** The closest two units of a tier can ever be, on top of their own width. */
const MIN_GAP: Record<Layout, number> = {
  bench: 1,
  knot: 0,
  niche: 5,
  sunk: 3,
  hang: 4,
};

interface Slot {
  x: number;
  y: number;
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

export function territory(owned: number, min: number, max: number): number {
  if (owned <= 0) return 0;
  const k = Math.min(1, Math.log2(owned) / Math.log2(128));
  return min + (max - min) * k;
}

export function flow(n: number): number {
  return Math.min(1.1, 0.24 + n * 0.1);
}

// --- Loose things ---

interface Mote {
  x: number;
  y: number;
  rise: number;
  sway: number;
  phase: number;
  bright: boolean;
}

const MOTES = 30;

interface Whistled {
  x: number;
  y: number;
  born: number;
}

const WHISTLED_MS = 850;

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

const MAX_PUFFS = 40;

/** A puppy on its way to the mound, which is the only journey in the scene. */
interface Pup {
  phase: "roll" | "fall" | "slide";
  x: number;
  y: number;
  vy: number;
  spin: number;
  from: InsideId;
}

/** One of the shaft crew, and the reason the place stops looking abandoned. */
interface Crew {
  x: number;
  y: number;
  post: { zone: number; first: boolean };
  state: "walk" | "work" | "wait" | "ride" | "mingle";
  tx: number;
  until: number;
  bound: { zone: number; first: boolean } | null;
  facing: 1 | -1;
  /** Phase for the walk bob, so a line of them isn't in lockstep. */
  phase: number;
}

const WORK_BEAT_S = 0.45;

const CREW_SPEED = 13;
const MAX_CREW = 9;

/** The hoist: a cage on a rope, fetching and carrying people between benches. */
interface Hoist {
  y: number;
  restUntil: number;
  riders: Crew[];
  errand: Crew | null;
  /** Which lane of the bore it runs in, as an offset from `BORE_X`. */
  lane: number;
}

/** How many cages the shaft runs. */
export function hoistCount(bore: number, crew: number): number {
  if (crew <= 0) return 0;
  const lanes = clamp(Math.floor((bore - 1) / 10), 1, 3);
  return Math.min(lanes, Math.ceil(crew / 3));
}

const HOIST_LANE = 9;

/** Run one cage `dist` pixels towards where it's been called to, and say whether it got there. */
export function hoistRun(y: number, target: number, dist: number): { y: number; arrived: boolean } {
  const d = target - y;
  if (Math.abs(d) <= dist) return { y: target, arrived: true };
  return { y: y + Math.sign(d) * dist, arrived: false };
}

/** Row of the cage sprite its floor is on; must line up with a bench. */
const CAGE_FLOOR = 9;

const HOIST_SPEED = 19;
const HOIST_REST_S = 1.3;
const HOIST_SEATS = 2;

const MAX_LOOSE = 26;
/** Buffer pixels a second. A puppy rolling itself along a ledge is unhurried. */
const ROLL_SPEED = 26;
/** Buffer pixels a second squared. Gentler than real gravity: it's a deep hole. */
const FALL_G = 190;
const SLIDE_SPEED = 34;

// --- The hoard ---

const HEAP_CROWN_X = 12;

/** A pocket: a fold of blanket closed around what you're holding — the inside's kennel/crate stack. */
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

const CYST_EVERY = 3;

const REVEAL_S = 1.9;

export class InsideScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Scene time in seconds, accumulated a capped frame at a time — see MillScene. */
  private clock = 0;
  private view: MillView = EMPTY_VIEW;
  private rng: () => number = mulberry32(1);
  private dt = 0;
  private lastFrame = performance.now();
  private motes: Mote[] = [];
  private whistled: Whistled[] = [];
  private puffs: Puff[] = [];
  private pup: Pup[] = [];
  private pack: PackPup[] = [];
  private crew: Crew[] = [];
  private hoists: Hoist[] = [];
  private worked = new Map<string, number>();
  private sawView = false;
  private openShown = 0;
  private revealAt: number | null = null;
  /** Displayed hoard, chasing the real one so spending looks like spending. */
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

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.rng = mulberry32(hashSeed(view.seed));
      this.clearOut();
      this.openShown = openZones(view.working);
      this.revealAt = null;
    } else if (openZones(view.working) > Math.ceil(this.openShown) && this.revealAt === null) {
      this.revealAt = this.clock;
    }
    this.sawView = true;
  }

  private clearOut(): void {
    this.motes = [];
    this.whistled = [];
    this.puffs = [];
    this.pup = [];
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

  whistle(at?: { x: number; y: number }): void {
    if (this.whistled.length > 14) return;
    const bands = this.bands();
    const sump = bands[bands.length - 1]!;
    const x = at
      ? Math.max(3, Math.min(SCENE_W - 8, Math.round(at.x)))
      : 30 + Math.random() * (SCENE_W - 70);
    const y = at
      ? Math.max(bands[0]!.bottom, Math.min(this.sh - 8, Math.round(at.y)))
      : sump.top + 4 + Math.random() * 12;
    this.whistled.push({ x: Math.round(x), y: Math.round(y), born: performance.now() });
    this.puff(x, y, -10);
    this.puff(x + 3, y, 10);
  }

  // --- Where things are ---

  private revealK(): number {
    if (this.revealAt === null) return 1;
    const k = clamp((this.clock - this.revealAt) / REVEAL_S, 0, 1);
    // Slow out of the break and fast into the settle: the floor gives, then the stratum drops into place.
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

  private boreRight(): number {
    let total = 0;
    for (const id of ORDER) total += this.owned(id);
    return BORE_X + boreWidth(total);
  }

  /** Which mark of a tier to draw, given the upgrades bought on it. */
  private mark(id: InsideId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

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

  /** Where a tier's units stand along its stratum. */
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
    const pitch = art.w + MIN_GAP[kind];
    const spread = clamp(territory(this.owned(id), art.w + 2, room), n * (pitch + 1), room);
    // Seeded off the tier, so a mill's scatter is the same every frame and the same on every reload.
    const rng = mulberry32(hashSeed(id) ^ 0x51e);

    // Gaps are tight or open; the tier's slack is divided among them by weight, so a spread comes out as groups.
    const gaps: number[] = [];
    for (let i = 0; i < n - 1; i++) gaps.push(rng() < TIGHT[kind] ? 0.22 : 1.5);
    const total = gaps.reduce((a, w) => a + w, 0) || 1;
    const slack = Math.max(0, spread - n * pitch);

    const roof = first ? band.top : this.benchY(band, true);
    const headroom = Math.max(0, foot - roof - art.h - 4);

    const out: Slot[] = [];
    let x = from;
    for (let i = 0; i < n; i++) {
      if (i > 0) x += pitch + (slack * gaps[i - 1]!) / total;
      // Only inside a knot and only behind someone; a lone tucked unit just looks faded.
      const back = kind === "knot" && i > 0 && gaps[i - 1]! < 1 && rng() < 0.55;
      let y: number;
      switch (kind) {
        case "niche":
          y = foot - art.h - 3 - Math.round(rng() * Math.min(10, headroom));
          break;
        case "sunk":
          y = foot - art.h + Math.max(2, Math.round(art.h * 0.45));
          break;
        case "hang":
          y = roof + 3 + Math.round(rng() * Math.min(14, headroom));
          break;
        default:
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

  /** The line a tier's units stand on: the band floor for the deeper rung, a bench half-way up for the shallower. */
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

    // The place first, then the dark over it, then everything you built on top of the dark.
    this.drawLid(bands[0]!);
    for (const band of bands) {
      if (band.zone >= 0) this.drawStratum(band, t);
      else if (band.zone === UNWHISTLED) this.drawUnworked(band, bands);
    }
    this.drawSump(sump);
    this.drawBore(bands, t);
    this.drawGloom(bands[0]!.bottom, sump.top);

    // Deepest first, so near ledges overlap far ones where a sprite overhangs its cut.
    for (let i = bands.length - 1; i >= 0; i--) {
      const band = bands[i]!;
      if (band.zone >= 0) this.drawTiers(band, t);
    }

    this.stepHoist(bands, t);
    this.stepCrew(bands, t);
    this.drawHoist(bands);
    this.drawCrew();

    this.drawMotes(bands[0]!.bottom, sump.top, t);
    this.drawHoard(sump.top);
    this.stepPup(bands, sump.top);
    this.drawPup();
    this.drawBroken(sump.top);
    this.drawWhistled(now);
    this.drawPuffs(now);
    this.drawBreak(bands, t);

    this.emit(bands, t);
  }

  /** The fold: the underside of what closed over you. */
  private drawLid(hem: Band): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, hem.bottom);
    grad.addColorStop(0, LID_LIT);
    grad.addColorStop(1, LID_DEEP);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, hem.bottom);

    const rng = mulberry32(0x11d);
    for (let i = 0; i < 22; i++) {
      const y = Math.round(rng() * (hem.bottom - 2)) + 1;
      const x = Math.round(rng() * SCENE_W);
      const w = 3 + Math.round(rng() * 11);
      ctx.fillStyle = rgba(rng() > 0.6 ? "#f7ecd0" : "#b0854a", 0.22);
      ctx.fillRect(x, y, w, 1);
    }
    for (let i = 0; i < 2; i++) {
      const base = Math.round(hem.bottom * (0.42 + i * 0.3));
      ctx.fillStyle = rgba("#a8703c", 0.35);
      for (let x = 0; x < SCENE_W; x++) {
        ctx.fillRect(x, base + Math.round(Math.sin(x * 0.09 + i * 2) * 1.6), 1, 1);
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = 14 + Math.round(rng() * (SCENE_W - 28));
      const y = hem.bottom - 4;
      ctx.fillStyle = rgba("#8a5a2c", 0.6);
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = rgba("#f2e0b4", 0.5);
      ctx.fillRect(x, y - 1, 3, 1);
      ctx.fillStyle = rgba("#e6dcc0", 0.55);
      ctx.fillRect(x + 1, y + 2, 1, 2 + Math.round(rng() * 2));
    }
    ctx.fillStyle = INK;
    ctx.fillRect(0, hem.bottom - 1, SCENE_W, 1);
  }

  /** One stratum: its material, its marbling, its worked face and its floor. */
  private drawStratum(band: Band, t: number): void {
    const ctx = this.ctx;
    const zone = ZONES[band.zone]!;
    const h = band.bottom - band.top;
    if (h <= 0) return;

    const grad = ctx.createLinearGradient(0, band.top, 0, band.bottom);
    grad.addColorStop(0, zone.lit);
    grad.addColorStop(0.45, zone.weave);
    grad.addColorStop(1, zone.deep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, band.top, SCENE_W, h);

    const rng = mulberry32(0x5a1 + band.zone * 977);
    const veins = Math.round(h * 0.55);
    for (let i = 0; i < veins; i++) {
      const y = band.top + 1 + Math.round(rng() * Math.max(1, h - 2));
      const x = Math.round(rng() * SCENE_W);
      const w = 4 + Math.round(rng() * 16);
      ctx.fillStyle = rgba(rng() > 0.5 ? zone.lit : zone.deep, 0.22);
      ctx.fillRect(x, y, w, 1);
    }

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

    this.drawAccent(band, t);

    ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.55), 0.75);
    ctx.fillRect(0, band.bottom - 3, SCENE_W, 1);
    ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.2), 0.5);
    ctx.fillRect(0, band.bottom - 2, SCENE_W, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(0, band.bottom - 1, SCENE_W, 1);
  }

  /** The blanket you haven't cut into yet. */
  private drawUnworked(band: Band, bands: Band[]): void {
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

    const rng = mulberry32(0x3f0d);
    for (let i = 0; i < Math.round(h * 5); i++) {
      const x = Math.round(rng() * SCENE_W);
      const y = band.top + Math.round(rng() * h);
      ctx.fillStyle = rgba(rng() > 0.55 ? near : "#0e0710", 0.22 + rng() * 0.3);
      ctx.fillRect(x, y, 1 + Math.round(rng() * 3), 1);
    }
    for (let i = 0; i < Math.round(h / 7); i++) {
      const x = 3 + Math.round(rng() * (SCENE_W - 8));
      const y = band.top + 2 + Math.round(rng() * Math.max(1, h - 5));
      const w = 2 + Math.round(rng() * 3);
      ctx.fillStyle = rgba(SUMP_SPOIL, 0.28);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = rgba("#e6dcc0", 0.16);
      ctx.fillRect(x + 1, y - 1, Math.max(1, w - 2), 1);
    }
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

  private drawAccent(band: Band, t: number): void {
    const ctx = this.ctx;
    const zone = ZONES[band.zone]!;
    const h = band.bottom - band.top;
    const rng = mulberry32(0x9e3 + band.zone * 131);
    const n = 5 + band.zone;
    for (let i = 0; i < n; i++) {
      const x = Math.round(rng() * (SCENE_W - 8)) + 4;
      const y = band.top + 2 + Math.round(rng() * Math.max(1, h - 6));
      const pulse = 0.35 + 0.3 * Math.sin(t * 0.9 + i * 1.9);
      if (band.zone === 0) {
        // Pale, not green — green would read as pup.
        ctx.fillStyle = rgba(mix(zone.accent, "#f7f1dc", 0.55), 0.5);
        ctx.fillRect(x, y, 1, 3);
        ctx.fillRect(x + 1, y - 1, 1, 1);
      } else if (band.zone === 1) {
        ctx.fillStyle = rgba(zone.accent, 0.3);
        ctx.fillRect(x, y, 2, 1);
      } else if (band.zone === 2) {
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
      if (id === "deephand") return;
      const slots = this.slots(id, band);
      if (slots.length === 0) return;
      const art = artCanvas(this.mark(id));

      if (ti === 0) {
        const foot = this.benchY(band, true);
        const x0 = Math.max(this.boreRight(), slots[0]!.x - 3);
        const x1 = Math.min(SCENE_W, slots[slots.length - 1]!.x + art.w + 3);
        ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.45), 0.6);
        ctx.fillRect(x0, foot - 1, x1 - x0, 1);
        ctx.fillStyle = INK;
        ctx.fillRect(x0, foot, x1 - x0, 1);
        ctx.fillStyle = rgba(zone.deep, 0.5);
        ctx.fillRect(x0 + 1, foot + 1, x1 - x0 - 2, 2);
      }

      const kind = LAYOUT[id];
      const foot = this.benchY(band, ti === 0);
      const roof = ti === 0 ? band.top : this.benchY(band, true);
      const order = [...slots.keys()].sort(
        (a, b) => Number(slots[b]!.back) - Number(slots[a]!.back),
      );

      order.forEach((i) => {
        const slot = slots[i]!;
        const since = t - (this.worked.get(`${id}:${i}`) ?? -99);
        const beat = since < WORK_BEAT_S ? 1 - since / WORK_BEAT_S : 0;
        const drop = Math.round(Math.sin(beat * Math.PI) * 2);
        this.setting(kind, zone, slot, art.w, art.h, roof, foot);
        this.primeGlow(id, slot.x, slot.y, art.w, art.h, t, i);
        // Tucked units take the stratum's own shadow: the only depth cue available at eleven pixels a sprite.
        const sprite = slot.back ? artTinted(this.mark(id), zone.deep, 0.45) : art;
        if (kind === "sunk") {
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

  /** What a unit sits in, hangs off or is cut into — drawn behind it. */
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
      const rng = mulberry32(hashSeed(zone.id) ^ (slot.x * 2654435761));
      const lx = slot.x - 1 - Math.round(rng() * 2);
      const lw = w + 3 + Math.round(rng() * 3);
      ctx.fillStyle = rgba(zone.deep, 0.45);
      ctx.fillRect(slot.x - 1, slot.y + 1, w + 2, h);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.35), 0.6);
      ctx.fillRect(lx, slot.y + h, lw, 1);
      ctx.fillStyle = INK;
      ctx.fillRect(lx, slot.y + h + 1, lw, 1);
      ctx.fillStyle = rgba(zone.deep, 0.5);
      ctx.fillRect(lx + 1, slot.y + h + 2, lw - 2, 1);
      ctx.fillStyle = rgba(zone.deep, 0.55);
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(lx + Math.round(rng() * lw), slot.y + h + 3 + Math.round(rng() * 2), 1, 1);
      }
    } else if (kind === "hang") {
      const x = slot.x + Math.floor(w / 2);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.3), 0.5);
      ctx.fillRect(x, roof, 1, Math.max(0, slot.y - roof));
      ctx.fillStyle = rgba(zone.deep, 0.7);
      ctx.fillRect(x - 1, roof, 3, 1);
    } else if (kind === "sunk") {
      ctx.fillStyle = rgba(zone.deep, 0.85);
      ctx.fillRect(slot.x - 1, foot - 3, w + 2, 3);
      ctx.fillStyle = rgba(mix(zone.lit, "#ffffff", 0.3), 0.5);
      ctx.fillRect(slot.x - 2, foot - 4, w + 4, 1);
    }
  }

  /** The bore: the open shaft everything falls down, and the spine of the picture. */
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

    for (const band of bands) {
      const h = band.bottom - band.top;
      if (h <= 0 || band.zone === HEM || band.zone === SUMP) continue;
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

    for (let y = top + 9; y < floor - 4; y += 13) {
      ctx.fillStyle = rgba("#4d4148", 0.85);
      ctx.fillRect(BORE_X + 1, y, right - BORE_X - 2, 1);
      ctx.fillStyle = rgba("#8a6a58", 0.5);
      ctx.fillRect(BORE_X + 1, y - 1, right - BORE_X - 2, 1);
    }

    // A slow breath of light down it, so the shaft is never completely static even on a mill that isn't producing.
    const drift = ((t * 9) % (floor - top + 40)) - 20;
    this.glow(BORE_X + (right - BORE_X) / 2, top + drift, 14, "#f0c68c", 0.07);
  }

  /** The sump: the floor of the workings, where everything ends up. */
  private drawSump(sump: Band): void {
    const ctx = this.ctx;
    const h = this.sh - sump.top;
    const grad = ctx.createLinearGradient(0, sump.top, 0, this.sh);
    grad.addColorStop(0, SUMP_FLOOR);
    grad.addColorStop(0.35, mix(SUMP_FLOOR, SUMP_DEEP, 0.55));
    grad.addColorStop(1, SUMP_DEEP);
    ctx.fillStyle = grad;
    ctx.fillRect(0, sump.top, SCENE_W, h);

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

  /** Lint dust, rising up the shaft. It falls up in here. */
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

  // --- The pup, going down ---

  /** Every tier turns something up, on the count you can see rather than the rate. */
  private emit(bands: Band[], t: number): void {
    for (const band of bands) {
      if (band.zone < 0) continue;
      ZONES[band.zone]!.tiers.forEach((id, ti) => {
        const n = this.working(id);
        if (n <= 0 || !this.chance(flow(n))) return;
        // A Pit Hand turns pup up wherever they're standing, not from a slot.
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
        // Off the bench it was cut on, not the band floor, or the puppy appears a bench below its machine.
        this.cut(from.x + art.w / 2, this.benchY(band, ti === 0) - 4, id);
      });
    }
    // The Second Puppy fruits rather than being worked, so it drops straight into the bore.
    if (this.owned("second") > 0 && this.chance(0.2)) {
      this.puff(this.boreRight() + 2, bands[bands.length - 1]!.top - 6, -4);
    }
  }

  private cut(x: number, y: number, from: InsideId): void {
    if (this.pup.length >= MAX_LOOSE) return;
    this.pup.push({ phase: "roll", x, y, vy: 0, spin: Math.random() * 6.28, from });
    this.puff(x, y, Math.random() > 0.5 ? 6 : -6);
  }

  private stepPup(bands: Band[], sumpTop: number): void {
    const lip = this.boreRight() - 2;
    const floor = sumpTop - 2;
    const kept: Pup[] = [];
    for (const c of this.pup) {
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
        if (c.x <= HEAP_CROWN_X + 6) {
          this.puff(c.x, c.y, -4);
          continue;
        }
      }
      kept.push(c);
    }
    this.pup = kept;
    void bands;
  }

  private drawPup(): void {
    const ctx = this.ctx;
    const puppy = artCanvas(PUPPY_SPRITE);
    for (const c of this.pup) {
      // A pixel of wobble rather than a rotation: rotating the blit resamples it off the grid.
      const wob = c.phase === "fall" ? Math.round(Math.sin(c.spin) * 1) : 0;
      ctx.drawImage(puppy.canvas, Math.round(c.x) + wob, Math.round(c.y));
    }
  }

  // --- The crew and the hoist ---

  /** How many bodies are underground: exactly the Pit Hands you've bought. */
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

  /** The crew, going about it. */
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
        facing: 1,
        phase: this.rng() * 6.28,
      });
    }

    const head = this.boreRight() - 4;
    for (const c of this.crew) {
      // A bench that stopped existing (tier sold, mill wiped) puts its occupant on one that does.
      if (!posts.some((p) => p.zone === c.post.zone && p.first === c.post.first)) {
        c.post = posts[Math.floor(this.rng() * posts.length)]!;
        c.state = "walk";
      }
      if (c.state !== "ride") c.y = this.postY(bands, c.post);

      switch (c.state) {
        case "walk": {
          const d = c.tx - c.x;
          c.facing = d >= 0 ? 1 : -1;
          if (Math.abs(d) <= 1) {
            c.x = c.tx;
            if (c.tx <= head + 2 && c.bound) {
              c.state = "wait";
            } else {
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
          if (posts.length > 1 && this.rng() < 0.3) {
            let to = posts[Math.floor(this.rng() * posts.length)]!;
            if (to.zone === c.post.zone && to.first === c.post.first) {
              to = posts[(posts.indexOf(c.post) + 1) % posts.length] ?? to;
            }
            c.bound = to;
            c.tx = head;
          } else {
            c.bound = null;
            c.tx = this.wanderTo(c, bands);
          }
          break;
        }
        case "wait": {
          // Nothing on the rope to wait for: no cages, or the target bench is gone.
          if (this.hoists.length === 0) {
            c.bound = null;
            c.state = "walk";
            c.tx = this.wanderTo(c, bands);
            break;
          }
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
        case "ride": {
          const cage = this.hoists.find((h) => h.riders.includes(c));
          if (!cage) {
            c.state = "walk";
            break;
          }
          c.x = BORE_X + cage.lane + 1 + cage.riders.indexOf(c) * 4;
          // Stand on the cage floor, so arriving at a bench is already at the height to walk off.
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

  /** The cages, running errands. */
  private stepHoist(bands: Band[], t: number): void {
    const posts = this.posts(bands);
    const want =
      posts.length < 2 ? 0 : hoistCount(this.boreRight() - BORE_X, this.crew.length);
    while (this.hoists.length > want) {
      // Aboard a cage just taken off the rope: walk instead.
      for (const r of this.hoists.pop()!.riders) r.state = "walk";
    }
    while (this.hoists.length < want) {
      const i = this.hoists.length;
      this.hoists.push({
        y: this.postY(bands, posts[i % posts.length]!),
        restUntil: 0,
        riders: [],
        errand: null,
        lane: i * HOIST_LANE,
      });
    }

    for (const h of this.hoists) {
      // Someone aboard outranks someone waiting: you finish the trip you're on.
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
        h.y = hoistRun(h.y, this.nearestPost(posts, bands, h.y), HOIST_SPEED * this.dt).y;
        continue;
      }
      const step = hoistRun(h.y, this.postY(bands, to), HOIST_SPEED * this.dt);
      h.y = step.y;
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
      // One cage per caller.
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
      // `h.y` is the stopped level; the cage hangs above it so its floor lands on the bench.
      const y = Math.round(h.y) - CAGE_FLOOR;
      ctx.fillStyle = rgba("#b8c0c8", 0.75);
      ctx.fillRect(x + 4, top, 1, Math.max(0, y - top));
      // Lit from inside, so a steel box in a black shaft can be found — same reason the crew carry lamps.
      this.glow(x + 4, y + 6, 13, "#ffe6a0", 0.16);
      ctx.drawImage(cage.canvas, x, y);
    }
  }

  private drawCrew(): void {
    const ctx = this.ctx;
    for (const c of this.crew) {
      const up = c.state === "ride" || c.state === "work";
      // Walking crew wear the Pit Hand tier's current mark, so its upgrades visibly re-kit them.
      const art = artCanvas(up ? SHAFT_CREW_UP : this.mark("deephand"));
      const bob = c.state === "walk" ? Math.round(Math.sin(this.clock * 7 + c.phase) * 0.5) : 0;
      const x = Math.round(c.x);
      const y = Math.round(c.y) - art.h + bob;
      this.glow(x + 3, y + 2, 9, "#ffe6a0", 0.22);
      ctx.drawImage(art.canvas, x, y);
    }
  }

  // --- The sump ---

  /** The hoard: a mound of puppies with the blanket folding up around it into cysts as you get richer. */
  private drawHoard(sumpTop: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    // Exponential chase on the magnitude, so it takes about the same moment to cross one order as the next.
    const k = 1 - Math.pow(0.06, this.dt);
    this.shown += (target - this.shown) * k;
    const layout = yardLayout(this.shown);

    const cysts = Math.min(CYST_SLOTS.length, Math.floor(layout.stage / CYST_EVERY));
    for (let i = 0; i < cysts; i++) this.drawCyst(CYST_SLOTS[i]!, sumpTop, i);

    this.stepPack(layout.pack, sumpTop);
  }

  /** The sump's pack, on the same terms as the yard's — see `millScene.ts`. */
  private stepPack(want: number, sumpTop: number): void {
    const ctx = this.ctx;
    const target = Math.min(PACK_CAP, Math.max(0, Math.round(want)));
    const back = sumpTop + 3;
    const front = this.sh - 3;

    let here = 0;
    for (const dog of this.pack) if (!dog.leaving) here++;
    if (here < target) {
      const scatter = target - here > 3;
      for (let i = 0; i < (scatter ? target - here : Math.min(3, target - here)); i++) {
        this.pack.push({
          x: scatter
            ? PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT)
            : HEAP_CROWN_X + Math.random() * 16 - 8,
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
          born: this.clock,
        });
      }
    } else if (here > target) {
      let over = here - target;
      for (const dog of this.pack) {
        if (over <= 0) break;
        if (dog.leaving) continue;
        dog.leaving = true;
        dog.doing = "trot";
        dog.vx = 26 + Math.random() * 10;
        dog.vy = 0;
        dog.until = this.clock + 60;
        over--;
      }
    }

    const kept: PackPup[] = [];
    for (const dog of this.pack) {
      if (this.clock >= dog.until) pickAction(dog, this.clock);
      if (dog.doing === "trot") {
        dog.x += dog.vx * this.dt;
        dog.y += dog.vy * this.dt;
        dog.walked += Math.abs(dog.vx) * this.dt;
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
      if (dog.leaving && dog.x > SCENE_W + 2) continue;
      kept.push(dog);
    }
    this.pack = kept;

    for (const dog of [...this.pack].sort((a, b) => a.y - b.y)) {
      const step = Math.floor(dog.walked / PACK_STRIDE) % 2;
      const pose =
        dog.doing === "sit"
          ? POSE.sit + (Math.floor(this.clock * 2.6 + dog.x) % 2)
          : dog.doing === "rest"
            ? POSE.loaf
            : dog.doing === "sleep"
              ? POSE.sleep
              : dog.doing === "zoom"
                ? POSE.run + step
                : POSE.trot + step;
      const sprite = artCanvas(PACK_POSES[dog.coat]![dog.vx < 0 ? 1 : 0]![pose]!);
      const x = Math.round(dog.x);
      const y = Math.round(dog.y);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 1, y - 1, sprite.w - 2, 1);
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite.canvas, x, y - sprite.h - (dog.doing === "trot" && step === 1 ? 1 : 0));
    }
  }

  /** One fold of the blanket, drawn rather than blitted. */
  private drawCyst(slot: { x: number; row: number; w: number }, sumpTop: number, i: number): void {
    const ctx = this.ctx;
    const breathe = Math.sin(this.clock * 0.8 + i * 1.7);
    const base = sumpTop + 6 + slot.row * 6;
    const w = slot.w + (breathe > 0.6 ? 1 : 0);
    const courses = Math.max(2, Math.round(w / 2.4));
    const ticking = mix(SUMP_SPOIL, "#e6dcc0", 0.4);

    for (let c = 0; c < courses; c++) {
      // Narrows faster near the crown, which is what makes it a dome and not a ziggurat.
      const inset = Math.round(Math.pow(c / courses, 1.5) * (w / 2));
      const span = w - inset * 2;
      if (span <= 0) break;
      const y = base - c;
      ctx.fillStyle = INK;
      ctx.fillRect(slot.x + inset - 1, y, span + 2, 1);
      ctx.fillStyle = c === courses - 1 ? mix(ticking, "#f7f1dc", 0.55) : ticking;
      ctx.fillRect(slot.x + inset, y, span, 1);
    }

    // Packed rounds of pup showing through, in the fold's own colour.
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
    ctx.fillStyle = rgba("#fff4e0", 0.55 + breathe * 0.15);
    ctx.fillRect(slot.x + 2, base - courses + 2, 1, Math.max(1, courses - 3));
    ctx.fillRect(slot.x + 3, base - courses + 1, 1, 1);
  }

  /** What the nest closed around, left where it stands in a strip along the front. */
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

  /** The floor giving way when a new stratum opens. */
  private drawBreak(bands: Band[], t: number): void {
    if (this.revealAt === null) return;
    const ctx = this.ctx;
    const k = clamp((this.clock - this.revealAt) / REVEAL_S, 0, 1);
    const opening = bands.find((b) => b.zone === Math.ceil(this.openShown) - 1);
    const y = opening ? opening.bottom : bands[bands.length - 1]!.top;

    const reach = Math.round(k * SCENE_W * 1.15);
    for (let x = BORE_X; x < Math.min(SCENE_W, BORE_X + reach); x++) {
      const jag = Math.round(Math.sin(x * 0.7 + t) * 1.6);
      ctx.fillStyle = rgba(VOID, 0.85 * (1 - k * 0.4));
      ctx.fillRect(x, y - 2 + jag, 1, 3);
      if (Math.random() < 0.06) this.puff(x, y, (Math.random() - 0.5) * 20, -14);
    }
    const flash = Math.max(0, 1 - Math.abs(k - 0.35) * 5);
    if (flash > 0) {
      ctx.fillStyle = rgba("#f7f1dc", 0.5 * flash);
      ctx.fillRect(0, y - 3, SCENE_W, 4);
    }
  }

  // --- Small things ---

  private drawWhistled(now: number): void {
    const ctx = this.ctx;
    const puppy = artCanvas(PUPPY_SPRITE);
    this.whistled = this.whistled.filter((d) => now - d.born < WHISTLED_MS);
    for (const d of this.whistled) {
      const age = (now - d.born) / WHISTLED_MS;
      const lift = Math.round(Math.sin(Math.min(1, age * 1.6) * Math.PI * 0.5) * 5);
      ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      ctx.drawImage(puppy.canvas, d.x, d.y - lift);
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

  /** The dark the shaft is in before anything of yours is standing in it. */
  private drawGloom(top: number, sumpTop: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba("#140a10", GLOOM);
    ctx.fillRect(0, top, SCENE_W, this.sh - top);
    ctx.fillStyle = rgba("#140a10", GLOOM * 0.35);
    ctx.fillRect(0, 0, SCENE_W, top);
    // The sump is warmed rather than dimmed: the hoard is what you came back to see.
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
