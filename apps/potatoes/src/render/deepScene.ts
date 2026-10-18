/**
 * Deep: under the floor of the hollow world, where the starch has set into crystal. A cave drawn
 * front-on — a ceiling with the crack you came down, two walls, a ledge, a shelf, and a floor with a
 * still lake in it — lit by one shaft of the hollow world's sun falling through the crack, and by
 * the crystal itself. The Fourth Potato hangs over the water, in the light.
 *
 * Same buffer conventions as the other scenes: integer-aligned unscaled blits, translation-only
 * animation. Everything that doesn't move (rock, walls, the specks in the back wall, the shaft, the
 * lake's basin) is drawn once per size and seed to an offscreen layer; a frame draws only what lives.
 */

import type { solo } from "@clickers/sim";

import { POTATO_SPRITE, PRODUCER_MARKS } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  heapSlots,
  HEAP_CAP,
  mix,
  mulberry32,
  rgba,
  yardLayout,
  type FarmView,
} from "./farmScene.js";
import { shownCount } from "./insideScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type DeepId = Extract<solo.SoloProducerId, "spark" | "kith" | "loom" | "vault" | "crown" | "fourth">;

export const ORDER: DeepId[] = ["spark", "kith", "loom", "vault", "crown", "fourth"];

/** How many of each ever appear, however many you own. */
const CAP: Record<DeepId, number> = {
  spark: 10,
  kith: 6,
  loom: 4,
  vault: 5,
  crown: 4,
  fourth: 3,
};

/** What a hundred-owned tier throws light in, as the fill it's drawn with. */
const PRIME_FILL: Record<DeepId, string> = {
  spark: rgba("#8fd0f0", 0.18),
  kith: rgba("#ffd166", 0.16),
  loom: rgba("#b080ff", 0.2),
  vault: rgba("#ffd166", 0.2),
  crown: rgba("#8fd0f0", 0.2),
  fourth: rgba("#8fd0f0", 0.14),
};

// --- The place ---

const VOID_HI = "#2a2244";
const VOID_LO = "#0e0a18";
const ROCK = "#2c2442";
const ROCK_LIT = "#4a3f66";
const ROCK_DEEP = "#1a1428";
const FLOOR = "#3a3150";
const FLOOR_LIT = "#5a4e7e";
const SPECK = "#7fb0c8";
const SHAFT = "#ffd166";
const SKYLIGHT = "#fff4c0";
const WATER_HI = "#2a5a78";
const WATER_LO = "#10243a";
const GLASS = "#cfe8f0";
const GLINT = "#ffffff";
const BROKEN_TINT = "#3a3644";

// Hoisted so the frame allocates no colour strings in its loops.
const SHAFT_BODY = rgba(SHAFT, 0.07);
const SHAFT_CORE = rgba(SHAFT, 0.1);
const SHAFT_MOTE = rgba(SKYLIGHT, 0.55);
const CRACK_GLOW = rgba(SKYLIGHT, 0.35);
const WATER_LINE = rgba("#8fd0f0", 0.55);
const RIPPLE = "#8fd0f0";
const BEAM = rgba(SHAFT, 0.2);
const DRIP = rgba(GLASS, 0.85);
const FOURTH_HALO = rgba("#8fd0f0", 0.1);
const GEODE_LIGHT = "#b080ff";
const SPIRE_BAND_A = GLASS;
const SPIRE_BAND_B = "#7fb0c8";

/** Off any round number, so the bob and the shimmer never fall into step. */
const BOB_PERIOD_S = 4.3;
const DRIPS_PER_S = 0.7;

const MOTES = 16;
const MAX_CROP = 24;
const MAX_RIPPLES = 10;
const MAX_DRIPS = 6;
const SHARDS_PER_DIG = 7;
const DUG_S = 0.7;
const RIPPLE_S = 1.3;

interface Geo {
  /** Per column: the bottom of the ceiling rock. 0 where the crack is. */
  ceil: number[];
  /** Per row: the x of the left wall's face, and of the right wall's. */
  left: number[];
  right: number[];
  crack: number;
  tips: { x: number; y: number }[];
  ledgeY: number;
  ledgeX1: number;
  shelfY: number;
  shelfX0: number;
  floorY: number;
  pool: { cx: number; cy: number; rx: number; ry: number };
  /** Per row offset from the pool's top: half the pool's width there. */
  poolHalf: number[];
}

interface Mote {
  u: number;
  off: number;
  speed: number;
}

interface Drip {
  x: number;
  y: number;
  vy: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
}

/** A potato on its way to the mound: falls, then rolls left to the pile. Into the lake, it sinks. */
interface Crop {
  x: number;
  y: number;
  vy: number;
  land: number;
  rolling: boolean;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

interface Walker {
  x: number;
  dir: 1 | -1;
  until: number;
  paused: boolean;
}

/** Disc filled a row at a time, so a glow stays on the pixel grid. */
function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** The same art upside down, for reflections. Cached so `artCanvas` caches it too. */
const flipped = new Map<Art, Art>();
function flip(art: Art): Art {
  let out = flipped.get(art);
  if (!out) {
    out = { rows: [...art.rows].reverse(), palette: art.palette };
    flipped.set(art, out);
  }
  return out;
}

/** The cave for a buffer height and seed. Pure, so the layout can be reasoned about apart from drawing. */
export function caveFor(sh: number, seed: string): Geo {
  const rng = mulberry32(hashSeed(seed + ":deep:rock"));
  const p = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const c0 = Math.max(7, Math.round(sh * 0.07));
  const crack = Math.round(SCENE_W * 0.36);

  const ceil: number[] = [];
  for (let x = 0; x < SCENE_W; x++) {
    const open = Math.abs(x - crack) <= 2;
    ceil.push(open ? 0 : Math.round(c0 + 3 * Math.sin(x * 0.11 + p[0]!) + 2 * Math.sin(x * 0.29 + p[1]!)));
  }

  const floorY = Math.round(sh * 0.7);
  const left: number[] = [];
  const right: number[] = [];
  for (let y = 0; y < sh; y++) {
    left.push(Math.round(11 + 5 * Math.sin(y * 0.07 + p[2]!) + 2.5 * Math.sin(y * 0.21 + p[3]!)));
    right.push(SCENE_W - Math.round(11 + 5 * Math.sin(y * 0.06 + p[4]!) + 2.5 * Math.sin(y * 0.23 + p[5]!)));
  }

  const tips: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const x = Math.round(left[c0]! + 4 + rng() * (right[c0]! - left[c0]! - 8));
    if (Math.abs(x - crack) < 6) continue;
    tips.push({ x, y: ceil[x]! + 3 + Math.floor(rng() * 9) });
  }

  const poolDepth = sh - floorY;
  const pool = {
    cx: 116,
    cy: floorY + Math.round(poolDepth * 0.52),
    rx: 38,
    ry: Math.max(5, Math.round(poolDepth * 0.3)),
  };
  const poolHalf: number[] = [];
  for (let dy = -pool.ry; dy <= pool.ry; dy++) {
    poolHalf.push(Math.floor(pool.rx * Math.sqrt(Math.max(0, 1 - (dy / pool.ry) ** 2))));
  }

  return {
    ceil,
    left,
    right,
    crack,
    tips,
    ledgeY: Math.round(sh * 0.5),
    ledgeX1: 86,
    shelfY: Math.round(sh * 0.36),
    shelfX0: 126,
    floorY,
    pool,
    poolHalf,
  };
}

export class DeepScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: FarmView = EMPTY_VIEW;
  private sawView = false;
  private geo: Geo = caveFor(200, "0");
  /** The rock, drawn once per size and seed. */
  private bg: HTMLCanvasElement | null = null;
  private bgKey = "";
  private spots: Record<DeepId, number[]> = {} as Record<DeepId, number[]>;
  /** Seams sit in the walls, so they need a side and a height as well as a place in the list. */
  private seams: { x: number; y: number }[] = [];
  /** Geodes stand either side of the lake at different depths into the floor. */
  private geodes: { x: number; foot: number }[] = [];
  private glintUntil: number[] = [];
  private motes: Mote[] = [];
  private drips: Drip[] = [];
  private ripples: Ripple[] = [];
  private crop: Crop[] = [];
  private shards: Shard[] = [];
  private dug: { x: number; y: number; age: number }[] = [];
  private walkers: Walker[] = [];
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
    this.layOut();
  }

  update(view: FarmView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    const reseed = !this.sawView || view.seed !== this.view.seed;
    this.view = view;
    if (reseed) this.layOut();
    if (wiped || !this.sawView) {
      this.crop = [];
      this.walkers = [];
      this.ripples = [];
      this.shown = Math.max(0, view.hoard);
    }
    this.sawView = true;
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

  /** A dig: crystal chips fly where you tapped, and a potato comes out of it and drops. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 10) return;
    const g = this.geo;
    const x = at ? clamp(Math.round(at.x), 4, SCENE_W - 6) : Math.round(g.left[g.floorY]! + 10 + Math.random() * 60);
    const y = at ? clamp(Math.round(at.y), 4, this.sh - 6) : g.floorY + 4 + Math.round(Math.random() * 10);
    this.dug.push({ x, y, age: 0 });
    for (let i = 0; i < SHARDS_PER_DIG && this.shards.length < 40; i++) {
      const a = (i / SHARDS_PER_DIG) * Math.PI * 2 + Math.random() * 0.5;
      this.shards.push({ x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 20, age: 0 });
    }
  }

  // --- Where things are ---

  private layOut(): void {
    this.geo = caveFor(this.sh, this.view.seed);
    const g = this.geo;
    const rng = mulberry32(hashSeed(this.view.seed + ":deep"));
    const spread = (n: number, lo: number, hi: number): number[] => {
      const out: number[] = [];
      const step = (hi - lo) / n;
      for (let i = 0; i < n; i++) out.push(Math.round(lo + step * (i + 0.5) + (rng() - 0.5) * step * 0.5));
      return out;
    };
    const shuffle = (xs: number[]): number[] => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [xs[i], xs[j]] = [xs[j]!, xs[i]!];
      }
      return xs;
    };

    // Seams alternate walls, spaced down the cave, kept off the ledge and the shelf so nothing stands in them.
    const top = Math.max(...g.ceil.slice(g.left[0]!, g.right[0]!)) + 10;
    const bottom = g.floorY - 10;
    const heights = shuffle(spread(CAP.spark, top, bottom));
    this.seams = heights.map((y, i) => {
      const onLeft = i % 2 === 0;
      let yy = y;
      const avoid = onLeft ? g.ledgeY : g.shelfY;
      if (Math.abs(yy - avoid) < 12) yy = avoid + (yy < avoid ? -12 : 13);
      yy = clamp(yy, top, bottom);
      return { x: onLeft ? g.left[yy]! - 4 : g.right[yy]! - 5, y: yy };
    });
    this.glintUntil = this.seams.map(() => 0);

    const floorDepth = this.sh - g.floorY;
    this.spots = {
      spark: [],
      kith: spread(CAP.kith, g.left[g.ledgeY]! + 6, g.ledgeX1 - 6),
      loom: spread(CAP.loom, g.shelfX0 + 6, g.right[g.shelfY]! - 6),
      vault: [],
      crown: shuffle(spread(CAP.crown, 146, 170)),
      fourth: [],
    };
    // Either side of the lake, at depths into the floor: x, then how far toward you as a share.
    const geodeAt: [number, number][] = [[50, 0.55], [64, 0.25], [160, 0.4], [58, 0.85], [168, 0.75]];
    this.geodes = geodeAt.map(([x, k]) => ({ x, foot: Math.round(g.floorY + 3 + k * (floorDepth - 14)) }));
    this.motes = [];
    for (let i = 0; i < MOTES; i++) {
      this.motes.push({ u: rng(), off: rng() * 2 - 1, speed: 0.02 + rng() * 0.03 });
    }
    this.bgKey = "";
  }

  private art(id: DeepId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = clamp(this.view.marks[id] ?? 0, 0, marks.length - 1);
    return marks[level] ?? marks[0];
  }

  private primed(id: DeepId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Drawn working and broken counts. Broken ones keep their place, greyed, so damage is where it happened. */
  private counts(id: DeepId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total === 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? clamp(Math.round((total * b) / (w + b)), 1, total) : 0;
    return { working: total - broken, broken };
  }

  private sprite(id: DeepId, broken: boolean): Sprite {
    return broken ? artTinted(this.art(id), BROKEN_TINT, 0.6) : artCanvas(this.art(id));
  }

  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  private inPool(x: number, y: number): boolean {
    const { cx, cy, rx, ry } = this.geo.pool;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }

  private ripple(x: number, y: number): void {
    if (this.ripples.length < MAX_RIPPLES) this.ripples.push({ x, y, age: 0 });
  }

  /** Where a thing dropped at `x` comes to rest on the floor: somewhere into it, by where it fell. */
  private landing(x: number): number {
    const depth = this.sh - this.geo.floorY;
    return this.geo.floorY + 4 + (Math.abs(Math.round(x) * 7) % Math.max(1, Math.round(depth * 0.55)));
  }

  /** The shaft of light at row `y`: centre and half-width. From the crack to the water, widening. */
  private shaftAt(y: number): { cx: number; half: number } {
    const g = this.geo;
    const end = g.pool.cy - g.pool.ry - 4;
    const k = clamp(y / end, 0, 1);
    return { cx: g.crack + (g.pool.cx - g.crack) * k, half: 2 + k * 13 };
  }

  // --- The rock, once ---

  private paintBackground(): HTMLCanvasElement {
    const key = `${this.sh}:${this.view.seed}`;
    if (this.bg && this.bgKey === key) return this.bg;
    const bg = this.bg ?? document.createElement("canvas");
    bg.width = SCENE_W;
    bg.height = this.sh;
    const ctx = bg.getContext("2d")!;
    const g = this.geo;
    const sh = this.sh;
    const rng = mulberry32(hashSeed(this.view.seed + ":deep:specks"));

    // The back wall: darker toward the floor, which is where the eye should land last.
    for (let y = 0; y < sh; y++) {
      ctx.fillStyle = mix(VOID_HI, VOID_LO, y / sh);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Specks of crystal in the back wall. The back of the cave is starch too.
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rng() * SCENE_W);
      const y = Math.floor(rng() * g.floorY);
      ctx.fillStyle = rgba(SPECK, 0.25 + rng() * 0.45);
      ctx.fillRect(x, y, 1, 1);
    }

    // The shaft from the crack, a body and a brighter core.
    const end = g.pool.cy - g.pool.ry - 4;
    for (let y = 0; y < end; y++) {
      const { cx, half } = this.shaftAt(y);
      ctx.fillStyle = SHAFT_BODY;
      ctx.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
      ctx.fillStyle = SHAFT_CORE;
      ctx.fillRect(Math.round(cx - half * 0.45), y, Math.round(half * 0.9), 1);
    }

    // The ceiling, with the crack left open to the bowl above.
    for (let x = 0; x < SCENE_W; x++) {
      const c = g.ceil[x]!;
      if (c <= 0) continue;
      ctx.fillStyle = ROCK;
      ctx.fillRect(x, 0, 1, c);
      ctx.fillStyle = ROCK_LIT;
      ctx.fillRect(x, c - 1, 1, 1);
    }
    fillDisc(ctx, g.crack, 0, 7, CRACK_GLOW);
    ctx.fillStyle = SKYLIGHT;
    ctx.fillRect(g.crack - 1, 0, 3, 2);

    // Stalactites: crystal, dripping.
    for (const tip of g.tips) {
      const base = g.ceil[tip.x]!;
      const len = tip.y - base;
      for (let k = 0; k < len; k++) {
        const w = Math.max(1, Math.round((1 - k / len) * 3));
        ctx.fillStyle = k === len - 1 ? GLINT : k % 3 === 0 ? GLASS : SPECK;
        ctx.fillRect(tip.x - Math.floor(w / 2), base + k, w, 1);
      }
    }

    // Walls, with a lit face.
    for (let y = 0; y < sh; y++) {
      const l = g.left[y]!;
      const r = g.right[y]!;
      ctx.fillStyle = ROCK;
      ctx.fillRect(0, y, l, 1);
      ctx.fillRect(r, y, SCENE_W - r, 1);
      ctx.fillStyle = ROCK_DEEP;
      ctx.fillRect(0, y, Math.max(0, l - 6), 1);
      ctx.fillRect(r + 6, y, Math.max(0, SCENE_W - r - 6), 1);
      ctx.fillStyle = ROCK_LIT;
      ctx.fillRect(l - 1, y, 1, 1);
      ctx.fillRect(r, y, 1, 1);
    }

    // The ledge on the left, where the cutters walk, and the shelf on the right, where the looms stand.
    const shelf = (x0: number, x1: number, y: number, taperLeft: boolean) => {
      ctx.fillStyle = ROCK_LIT;
      ctx.fillRect(x0, y, x1 - x0, 1);
      ctx.fillStyle = ROCK;
      ctx.fillRect(x0, y + 1, x1 - x0, 3);
      for (let k = 0; k < 5; k++) {
        const cut = Math.round(((k + 1) / 5) * (x1 - x0) * 0.7);
        ctx.fillStyle = ROCK_DEEP;
        if (taperLeft) ctx.fillRect(x0 + cut, y + 4 + k, x1 - x0 - cut, 1);
        else ctx.fillRect(x0, y + 4 + k, x1 - x0 - cut, 1);
      }
    };
    shelf(0, g.ledgeX1, g.ledgeY, false);
    shelf(g.shelfX0, SCENE_W, g.shelfY, true);

    // The floor: a lit rim at the back, darkening toward you.
    const depth = sh - g.floorY;
    for (let y = g.floorY; y < sh; y++) {
      ctx.fillStyle = y === g.floorY ? FLOOR_LIT : mix(FLOOR, ROCK_DEEP, ((y - g.floorY) / depth) * 0.55);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rng() < 0.5 ? ROCK_LIT : ROCK_DEEP;
      ctx.fillRect(Math.floor(rng() * SCENE_W), g.floorY + 2 + Math.floor(rng() * (depth - 2)), 1 + Math.floor(rng() * 2), 1);
    }

    // The lake's basin. The water moves on top of this; the basin doesn't.
    const { cx, cy, ry } = g.pool;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = g.poolHalf[dy + ry]!;
      ctx.fillStyle = mix(WATER_HI, WATER_LO, (dy + ry) / (2 * ry));
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      ctx.fillStyle = ROCK_LIT;
      ctx.fillRect(cx - half - 1, cy + dy, 1, 1);
      ctx.fillRect(cx + half + 1, cy + dy, 1, 1);
    }
    // Where the shaft lands on the water.
    fillDisc(ctx, cx, cy - ry + 3, 6, rgba(SHAFT, 0.12));

    this.bg = bg;
    this.bgKey = key;
    return bg;
  }

  // --- Drawing ---

  private draw(): void {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += this.dt;
    const t = this.clock;
    const ctx = this.ctx;

    ctx.drawImage(this.paintBackground(), 0, 0);
    this.drawMotes();
    this.drawDrips();
    this.drawSeams(t);
    this.drawLooms(t);
    this.drawKith(t);
    this.drawSpires(t);
    this.drawWater(t);
    this.drawFourth(t);
    this.drawGeodes(t);
    this.drawHoard();
    this.stepCrop();
    this.drawDug();

    // A tired cave is a darker one: the crystal only shines as well as the field up top is kept.
    const gloom = 1 - clamp(this.view.condition, 0, 1);
    if (gloom > 0.01) {
      ctx.fillStyle = rgba(VOID_LO, gloom * 0.5);
      ctx.fillRect(0, 0, SCENE_W, this.sh);
    }
  }

  /** Dust in the shaft, drifting down toward the water. */
  private drawMotes(): void {
    const ctx = this.ctx;
    const end = this.geo.pool.cy - this.geo.pool.ry - 4;
    ctx.fillStyle = SHAFT_MOTE;
    for (const m of this.motes) {
      m.u += m.speed * this.dt;
      if (m.u > 1) m.u -= 1;
      const y = Math.round(m.u * end);
      const { cx, half } = this.shaftAt(y);
      ctx.fillRect(Math.round(cx + m.off * half * 0.8), y, 1, 1);
    }
  }

  /** Water off the stalactites. Into the lake, a ring; onto the floor, nothing. */
  private drawDrips(): void {
    const g = this.geo;
    if (g.tips.length > 0 && this.drips.length < MAX_DRIPS && this.chance(DRIPS_PER_S)) {
      const tip = g.tips[Math.floor(Math.random() * g.tips.length)]!;
      this.drips.push({ x: tip.x, y: tip.y, vy: 0 });
    }
    const ctx = this.ctx;
    ctx.fillStyle = DRIP;
    const surface = g.pool.cy - g.pool.ry + 2;
    this.drips = this.drips.filter((d) => {
      d.vy += 160 * this.dt;
      d.y += d.vy * this.dt;
      const wet = Math.abs(d.x - g.pool.cx) < g.pool.rx - 2;
      const floor = wet ? surface + ((d.x * 3) % Math.max(1, g.pool.ry)) : this.landing(d.x);
      if (d.y >= floor) {
        if (wet) this.ripple(d.x, Math.round(floor));
        return false;
      }
      ctx.fillRect(d.x, Math.round(d.y), 1, 2);
      return true;
    });
  }

  /** Glint seams, in the walls. They flash now and then, and what you chip off them falls. */
  private drawSeams(t: number): void {
    const { working, broken } = this.counts("spark");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const seam = this.seams[i];
      if (!seam) break;
      const isBroken = i >= working;
      const s = this.sprite("spark", isBroken);
      const x = seam.x;
      const y = seam.y - s.h + 2;
      if (!isBroken && this.primed("spark")) fillDisc(ctx, x + s.w / 2, y + 4, 5, PRIME_FILL.spark);
      ctx.drawImage(s.canvas, x, y);
      if (isBroken) continue;
      if (this.chance(0.35)) this.glintUntil[i] = t + 0.18;
      if (t < this.glintUntil[i]!) {
        const gx = x + 2 + (i % 4);
        const gy = y + 1;
        ctx.fillStyle = GLINT;
        ctx.fillRect(gx - 1, gy, 3, 1);
        ctx.fillRect(gx, gy - 1, 1, 3);
      }
      if (this.chance(0.1) && this.crop.length < MAX_CROP) {
        const cx = x + s.w / 2;
        this.crop.push({ x: cx, y: y + s.h, vy: 0, land: this.landing(cx), rolling: false });
      }
    }
  }

  /** Hush looms on the shelf. A light runs down one string at a time: the hum, made visible. */
  private drawLooms(t: number): void {
    const { working, broken } = this.counts("loom");
    const g = this.geo;
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const s = this.sprite("loom", isBroken);
      const cx = this.spots.loom[i]!;
      const x = Math.round(cx - s.w / 2);
      const y = g.shelfY - s.h + 1;
      if (!isBroken && this.primed("loom")) fillDisc(ctx, cx, y + 4, 7, PRIME_FILL.loom);
      ctx.drawImage(s.canvas, x, y);
      if (isBroken) continue;
      // Three strings at columns 2, 4, 6; the light walks down whichever one is humming.
      const phase = t * 1.7 + i * 1.3;
      const string = 2 + 2 * (Math.floor(phase) % 3);
      const run = Math.floor((phase % 1) * 6);
      ctx.fillStyle = GLINT;
      ctx.fillRect(x + string, y + 1 + run, 1, 1);
    }
  }

  /** Cutters on the ledge, lamps on. They walk, stop, swing at the wall. Broken ones sit in the dark. */
  private drawKith(t: number): void {
    const { working, broken } = this.counts("kith");
    const n = working + broken;
    const g = this.geo;
    const lo = g.left[g.ledgeY]! + 4;
    const hi = g.ledgeX1 - 4;
    while (this.walkers.length < n) {
      const i = this.walkers.length;
      this.walkers.push({
        x: this.spots.kith[i] ?? (lo + hi) / 2,
        dir: Math.random() < 0.5 ? 1 : -1,
        until: t + 1 + Math.random() * 3,
        paused: false,
      });
    }
    this.walkers.length = n;
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const w = this.walkers[i]!;
      const isBroken = i >= working;
      if (!isBroken) {
        if (t >= w.until) {
          w.paused = !w.paused;
          w.until = t + (w.paused ? 1 + Math.random() * 2 : 2 + Math.random() * 3);
          if (!w.paused && Math.random() < 0.5) w.dir = w.dir === 1 ? -1 : 1;
        }
        if (!w.paused) {
          w.x += w.dir * 6 * this.dt;
          if (w.x < lo || w.x > hi) w.dir = w.x < lo ? 1 : -1;
        }
      }
      const s = this.sprite("kith", isBroken);
      const x = Math.round(w.x - s.w / 2);
      const y = g.ledgeY - s.h + 1;
      if (!isBroken) {
        // The lamp beam: a widening wedge ahead of them, along the ledge.
        ctx.fillStyle = BEAM;
        for (let k = 1; k <= 12; k++) {
          const half = Math.floor(k / 4);
          const bx = w.dir === 1 ? x + s.w + k - 1 : x - k;
          ctx.fillRect(bx, y + 1 - half, 1, half * 2 + 1);
        }
        if (this.primed("kith")) fillDisc(ctx, w.x, y + 5, 6, PRIME_FILL.kith);
      }
      ctx.drawImage(s.canvas, x, y);
      // Stopped, they're working: a chip of light off the pick.
      if (!isBroken && w.paused && (t * 3 + i) % 1 < 0.15) {
        ctx.fillStyle = GLINT;
        ctx.fillRect(w.dir === 1 ? x + s.w + 1 : x - 2, y + 5, 1, 1);
      }
    }
  }

  /** Crown spires at the back of the floor, one band of crystal per generation, standing in the lake's reflection. */
  private drawSpires(t: number): void {
    const { working, broken } = this.counts("crown");
    const g = this.geo;
    const ctx = this.ctx;
    const bands = Math.min(12, Math.max(1, this.view.generation));
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const s = this.sprite("crown", isBroken);
      const cx = this.spots.crown[i]!;
      const x = Math.round(cx - s.w / 2);
      const ext = bands * 2;
      const foot = g.floorY + 2 + (i % 2) * 3;
      const y = foot - s.h - ext;
      if (!isBroken && this.primed("crown")) fillDisc(ctx, cx, y + 6, 7, PRIME_FILL.crown);
      // The column under the crown, banded by generation.
      for (let k = 0; k < ext; k++) {
        ctx.fillStyle = isBroken ? BROKEN_TINT : k % 2 === 0 ? SPIRE_BAND_A : SPIRE_BAND_B;
        ctx.fillRect(x + 1, foot - ext + k, s.w - 2, 1);
      }
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken) {
        // A glint climbing the spire, on its own clock.
        const climb = (t * 0.5 + i * 0.37) % 1;
        ctx.fillStyle = GLINT;
        ctx.fillRect(x + 3, Math.round(foot - climb * (s.h + ext)), 1, 1);
      }
    }
  }

  /** The water: a shimmer across it, reflections of what hangs over it, and rings where things land. */
  private drawWater(t: number): void {
    const g = this.geo;
    const { cx, cy, rx, ry } = g.pool;
    const ctx = this.ctx;
    const rows = ry * 2;
    ctx.fillStyle = WATER_LINE;
    for (let i = 0; i < 5; i++) {
      const r = (i * 7 + Math.floor(t * 1.5)) % Math.max(1, rows - 2) + 1;
      const half = g.poolHalf[r]!;
      if (half < 4) continue;
      const span = half * 2 - 4;
      const x = Math.round(cx - half + 1 + ((i * 37 + t * 9) % span));
      ctx.fillRect(x, cy - ry + r, 3, 1);
    }

    // Reflections of the Fourth Potato, clipped to the water.
    const { working } = this.counts("fourth");
    if (working > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.3;
      const flippedSprite = artCanvas(flip(this.art("fourth")));
      for (let i = 0; i < working; i++) {
        const p = this.fourthAt(i, t);
        // Mirrored about the far edge of the water, and squashed by half: you're looking at it at a slant.
        const top = cy - ry;
        const gap = top - (p.y + flippedSprite.h);
        ctx.drawImage(flippedSprite.canvas, Math.round(p.x - flippedSprite.w / 2), top + Math.round(gap * 0.5));
      }
      ctx.restore();
    }

    this.ripples = this.ripples.filter((rp) => (rp.age += this.dt) < RIPPLE_S);
    ctx.fillStyle = RIPPLE;
    for (const rp of this.ripples) {
      const k = rp.age / RIPPLE_S;
      const r = 1 + k * 9;
      ctx.globalAlpha = 1 - k;
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        const px = Math.round(rp.x + Math.cos(ang) * r);
        const py = Math.round(rp.y + Math.sin(ang) * r * 0.35);
        if (this.inPool(px, py)) ctx.fillRect(px, py, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Where the `i`th Fourth Potato hangs: the first over the middle of the water, in the light; the others flank it, higher. */
  private fourthAt(i: number, t: number): { x: number; y: number } {
    const { cx } = this.geo.pool;
    const bob = Math.round(Math.sin((t / BOB_PERIOD_S) * Math.PI * 2 + i * 2.1) * 2);
    // In the shaft, well clear of the floor: it hangs, it doesn't sit.
    const base = this.geo.floorY - 26;
    if (i === 0) return { x: cx, y: base + bob };
    return { x: cx + (i === 1 ? -22 : 20), y: base - 8 + bob };
  }

  /** The Fourth Potato, hanging over the water. Now and then something drips off it and rings the lake. */
  private drawFourth(t: number): void {
    const { working, broken } = this.counts("fourth");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const s = this.sprite("fourth", isBroken);
      const p = this.fourthAt(i, t);
      const x = Math.round(p.x - s.w / 2);
      if (!isBroken) {
        const pulse = 9 + Math.round(Math.sin(t * 1.3 + i) * 1.5);
        fillDisc(ctx, p.x, p.y + s.h / 2, pulse, FOURTH_HALO);
        if (this.primed("fourth")) fillDisc(ctx, p.x, p.y + s.h / 2, pulse + 3, PRIME_FILL.fourth);
      }
      ctx.drawImage(s.canvas, x, p.y);
      if (!isBroken && this.chance(0.25)) {
        const { cy, ry } = this.geo.pool;
        this.ripple(p.x + Math.round((Math.random() - 0.5) * 6), cy - ry + 3 + Math.floor(Math.random() * 4));
      }
    }
  }

  /** Geodes split open on the floor, lit inside by the field up top: brighter the better it's kept. */
  private drawGeodes(t: number): void {
    const { working, broken } = this.counts("vault");
    const ctx = this.ctx;
    const cond = clamp(this.view.condition, 0, 1);
    // Condition-scaled, and drawn that way: the light goes as condition squared, same as the output.
    const light = rgba(GEODE_LIGHT, 0.35 * cond * cond);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const s = this.sprite("vault", isBroken);
      const { x: cx, foot } = this.geodes[i]!;
      const x = Math.round(cx - s.w / 2);
      const y = foot - s.h;
      if (!isBroken) {
        fillDisc(ctx, cx, y + s.h / 2, 7 + Math.round(Math.sin(t * 0.8 + i) * 1), light);
        if (this.primed("vault")) fillDisc(ctx, cx, y + s.h / 2, 10, PRIME_FILL.vault);
      }
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The hoard: the same heap the farm keeps, in the front-left corner of the cave floor. */
  private drawHoard(): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const heap = Math.min(HEAP_CAP, Math.max(0, Math.round(yardLayout(this.shown).heap)));
    const potato = artCanvas(POTATO_SPRITE);
    const slots = heapSlots();
    const foot = this.sh - 1;
    for (let i = 0; i < heap; i++) {
      const slot = slots[i];
      if (!slot) break;
      this.ctx.drawImage(potato.canvas, slot.x + 4, foot + slot.y);
    }
  }

  /** Crop falls to the floor and rolls left to the mound. Whatever finds the water sinks with a ring. */
  private stepCrop(): void {
    const potato = artCanvas(POTATO_SPRITE);
    const ctx = this.ctx;
    this.crop = this.crop.filter((c) => {
      if (!c.rolling) {
        c.vy += 120 * this.dt;
        c.y += c.vy * this.dt;
        if (c.y >= c.land) {
          c.y = c.land;
          c.rolling = true;
        }
      } else {
        c.x -= 24 * this.dt;
      }
      if (c.rolling && this.inPool(c.x, c.y)) {
        this.ripple(Math.round(c.x), Math.round(c.y));
        return false;
      }
      if (c.x < 34) return false;
      ctx.drawImage(potato.canvas, Math.round(c.x) - 3, Math.round(c.y) - potato.h);
      return true;
    });
  }

  /** A dig: chips of crystal fly, and the potato that was in it pops up and drops into the crop. */
  private drawDug(): void {
    const ctx = this.ctx;
    this.shards = this.shards.filter((s) => (s.age += this.dt) < 0.6);
    for (const s of this.shards) {
      s.vy += 90 * this.dt;
      s.x += s.vx * this.dt;
      s.y += s.vy * this.dt;
      ctx.globalAlpha = 1 - s.age / 0.6;
      ctx.fillStyle = s.age < 0.15 ? GLINT : GLASS;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    const potato = artCanvas(POTATO_SPRITE);
    this.dug = this.dug.filter((d) => {
      d.age += this.dt;
      if (d.age >= DUG_S) {
        // Handed to the crop: from here it falls and rolls like any other.
        if (this.crop.length < MAX_CROP) {
          const land = d.y > this.geo.floorY ? Math.min(this.sh - 3, d.y + 3) : this.landing(d.x);
          this.crop.push({ x: d.x + 3, y: d.y, vy: 0, land, rolling: false });
        }
        return false;
      }
      const lift = Math.round(Math.sin((d.age / DUG_S) * Math.PI) * 6);
      ctx.drawImage(potato.canvas, d.x, d.y - lift - potato.h);
      return true;
    });
  }
}
