/**
 * Origin: the first morning. A clearing at the edge of a forest at dawn, a fire somebody kept going
 * all night, people in furs, and wolves edging in out of the trees — the mill, a few hundred
 * centuries early. Shares the buffer conventions with `millScene.ts` and `beyondScene.ts`:
 * integer-aligned unscaled blits, translation-only animation. The sky, the trees and the ground
 * never move, so they're painted once per size into a backdrop and blitted.
 */

import type { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE, ZZZ } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  mix,
  rgba,
  shownCount,
  yardLayout,
  type MillView,
} from "./millScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type OriginId = Extract<solo.SoloProducerId, "dawn" | "elder" | "root" | "spring" | "hearth" | "first">;

/** How many of each the clearing will draw before it stops adding and starts implying. */
const CAP: Record<OriginId, number> = {
  dawn: 6,
  elder: 6,
  root: 4,
  spring: 3,
  hearth: 4,
  first: 7,
};

/** What a hundred-owned tier throws light in. Same rule as the other scenes. */
const PRIME_GLOW: Record<OriginId, string> = {
  dawn: "#ffb04a",
  elder: "#e0c04a",
  root: "#fff4c0",
  spring: "#a8e0ff",
  hearth: "#ff8a4a",
  first: "#ffd166",
};

// --- The place ---

const SKY_TOP = "#1e1838";
const SKY_MID = "#5a3a6a";
const SKY_ROSE = "#e0786a";
const SKY_GOLD = "#ffc878";
const SUN = "#fff0b0";
const SUN_GLOW = "#ffd890";
const HILLS = "#7a4a5a";
const TREES_BACK = "#3a2836";
const TREES_FRONT = "#1e1620";
const GROUND_FAR = "#3e3226";
const GROUND_MID = "#6a5838";
const GROUND_NEAR = "#544430";
const CLEARING = "#7a6448";
const TUFT = "#8a7a4a";
const FROST = "#c8c0a8";
const ROCK = "#3e3430";
const ROCK_LIT = "#6a5a50";
const ROCK_SEAM = "#2e2622";
const HIDE = "#8a6a4a";
const HIDE_EDGE = "#5a4030";
const EYE = "#ffd166";

const FIRELIGHT = "#ff9a4a";
const SPARK_HOT = "#ffc04a";
const SPARK_COOL = "#ff7a3c";
const SMOKE = "#9a8a8a";
const STAR = "#e8e0f4";
const WATER_GLINT = "#e0f4ff";
const DIM_TINT = "#1a1420";
const COLD = "#3a4a6a";

/** Precomputed so the hot loops never build a colour string. */
const SMOKE_STEPS = Array.from({ length: 8 }, (_, i) => rgba(SMOKE, 0.32 * (1 - i / 8)));
const STAR_STEPS = Array.from({ length: 8 }, (_, i) => rgba(STAR, 0.15 + (0.6 * i) / 7));

const STARS = 18;
const MAX_SPARKS = 48;
const MAX_SMOKE = 12;
const MAX_PUPS = 14;
const LEAP_MS = 1100;
const KEEPER_SPEED = 7;

/** How far the cold gets in when the ground's been let go: a lean season, not a dead one. */
const COLD_AT_FLOOR = 0.4;

/** Where the fires go, as (x share, depth share of the ground). The first is the one that never went out. */
const FIRE_SLOTS: readonly [number, number][] = [
  [0.47, 0.5],
  [0.22, 0.4],
  [0.73, 0.6],
  [0.33, 0.68],
  [0.62, 0.36],
  [0.12, 0.62],
];

// Salts for `jit`, so placement for one thing doesn't line up with another's.
const S_STAR_X = 1;
const S_STAR_Y = 2;
const S_STAR_P = 3;
const S_TREE_H = 4;
const S_TREE_W = 5;
const S_TUFT_X = 6;
const S_TUFT_Y = 7;
const S_EYE_X = 8;
const S_EYE_P = 9;
const S_ROW_X = 10;
const S_ROW_Y = 11;
const S_KEEP_X = 12;
const S_KEEP_D = 13;
const S_KEEP_L = 14;
const S_KEEP_S = 15;
const S_WILD_X = 16;
const S_PUP = 17;
const S_BROKEN_K = 18;

/** Per-rung salt for row placement, so two rows don't jitter in step. */
const ROW_SALT: Record<OriginId, number> = { dawn: 100, elder: 200, root: 300, spring: 400, hearth: 500, first: 600 };

interface Star {
  x: number;
  y: number;
  phase: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

interface Leap {
  x: number;
  y: number;
  dir: 1 | -1;
  born: number;
}

interface Keeper {
  x: number;
  dir: 1 | -1;
  lane: number;
  speed: number;
  pause: number;
}

interface Geometry {
  /** The treeline: where the ground starts. */
  hz: number;
  /** Rows of ground below it. */
  ground: number;
  sunX: number;
  sunR: number;
}

/** Deterministic 0..1 off a seed, a salt and an index. Integer mixing only: no strings in the frame. */
function jit(seed: number, salt: number, i: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class OriginScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Scene time in seconds, accumulated a capped frame at a time — see MillScene. */
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: MillView = EMPTY_VIEW;
  private seed = 1;
  private sawView = false;
  private backdrop: HTMLCanvasElement | null = null;
  private stars: Star[] = [];
  private sparks: Spark[] = [];
  private smoke: Spark[] = [];
  private leaps: Leap[] = [];
  private keepers: Keeper[] = [];
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
    const sh = Math.max(90, Math.min(340, Math.round(SCENE_W * ratio)));
    if (sh === this.sh && this.backdrop) return;
    this.sh = sh;
    this.canvas.width = SCENE_W;
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
    this.rebuild();
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.seed = hashSeed(view.seed);
      this.sparks = [];
      this.smoke = [];
      this.leaps = [];
      this.keepers = [];
      this.shown = Math.max(0, view.hoard);
      this.rebuild();
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

  /** A whistle at the first fire: a pup bounds out of the grass, and the fire spits. */
  whistle(at?: { x: number; y: number }): void {
    if (this.leaps.length >= MAX_PUPS) return;
    const g = this.geometry();
    const x = at
      ? clamp(Math.round(at.x), 6, SCENE_W - 12)
      : Math.round(30 + Math.random() * (SCENE_W - 70));
    const y = at
      ? clamp(Math.round(at.y), g.hz + 6, this.sh - 4)
      : Math.round(g.hz + g.ground * (0.55 + Math.random() * 0.35));
    this.leaps.push({ x, y, dir: Math.random() < 0.5 ? -1 : 1, born: performance.now() });
    for (let i = 0; i < 5; i++) {
      this.spark(x + 3, y, (Math.random() - 0.5) * 30, -10 - Math.random() * 14, 500);
    }
  }

  // --- Where things are ---

  private geometry(): Geometry {
    const sh = this.sh;
    const hz = Math.round(sh * 0.42);
    return {
      hz,
      ground: sh - hz,
      sunX: 118,
      sunR: clamp(Math.round(sh * 0.07), 7, 16),
    };
  }

  private mark(id: OriginId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  private primed(id: OriginId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Working and broken units to draw, capped together so a bad night doesn't add sprites. */
  private counts(id: OriginId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total <= 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? Math.max(1, Math.round((total * b) / (w + b))) : 0;
    return { working: Math.max(0, total - broken), broken: Math.min(total, broken) };
  }

  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  // --- The backdrop, painted once per size and seed ---

  private rebuild(): void {
    if (typeof document === "undefined") return;
    const g = this.geometry();
    const bd = this.backdrop ?? document.createElement("canvas");
    bd.width = SCENE_W;
    bd.height = this.sh;
    const ctx = bd.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // Sky: night still at the top, the morning coming up under it. Banded a row at a time so it stays pixel.
    for (let y = 0; y < g.hz; y++) {
      const k = y / Math.max(1, g.hz);
      ctx.fillStyle =
        k < 0.5
          ? mix(SKY_TOP, SKY_MID, k / 0.5)
          : k < 0.85
            ? mix(SKY_MID, SKY_ROSE, (k - 0.5) / 0.35)
            : mix(SKY_ROSE, SKY_GOLD, (k - 0.85) / 0.15);
      ctx.fillRect(0, y, SCENE_W, 1);
    }

    // The sun, only just up: half a disc on the horizon, behind everything.
    for (let dy = -g.sunR; dy <= 0; dy++) {
      const half = Math.round(Math.sqrt(Math.max(0, g.sunR * g.sunR - dy * dy)));
      ctx.fillStyle = SUN;
      ctx.fillRect(g.sunX - half, g.hz - 4 + dy, half * 2, 1);
    }

    // Far hills, low and soft.
    ctx.fillStyle = HILLS;
    for (let x = 0; x < SCENE_W; x++) {
      const h = Math.round(5 + 3 * Math.sin(x * 0.045 + 1.2) + 2 * Math.sin(x * 0.11));
      ctx.fillRect(x, g.hz - 4 - h, 1, h + 4);
    }

    // Two ranks of pines. The back rank stands in front of the sun; the gaps are where the light gets through.
    this.pines(ctx, g.hz, TREES_BACK, 0, 0.55, 9);
    this.pines(ctx, g.hz + 1, TREES_FRONT, 7, 1, 13);

    // Ground: dark at the trees, lit in the middle where the fires are, darker again at your feet.
    for (let y = g.hz; y < this.sh; y++) {
      const k = (y - g.hz) / Math.max(1, g.ground);
      ctx.fillStyle = k < 0.45 ? mix(GROUND_FAR, GROUND_MID, k / 0.45) : mix(GROUND_MID, GROUND_NEAR, (k - 0.45) / 0.55);
      ctx.fillRect(0, y, SCENE_W, 1);
    }

    // The clearing worn round the first fire.
    const [fx, fy] = this.fireAt(0, g);
    const rx = 34;
    const ry = Math.max(4, Math.round(g.ground * 0.16));
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      ctx.fillStyle = rgba(CLEARING, 0.55);
      ctx.fillRect(fx - half, fy + dy, half * 2, 1);
    }

    // A rocky rise on the left, which is where the caves go: a lit lip, a body, and a couple of ledges.
    const riseTall = clamp(Math.round(this.sh * 0.07), 7, 18);
    for (let x = 0; x < 72; x++) {
      const h = Math.round(riseTall * Math.max(0, 1 - x / 72) + 2 * Math.sin(x * 0.35) + 3);
      if (h <= 0) continue;
      const top = g.hz + 8 - h;
      ctx.fillStyle = ROCK;
      ctx.fillRect(x, top, 1, h);
      ctx.fillStyle = ROCK_LIT;
      ctx.fillRect(x, top, 1, 1);
      ctx.fillStyle = ROCK_SEAM;
      if (h > 6) ctx.fillRect(x, top + Math.round(h * 0.45), 1, 1);
    }

    // Darker at your feet, so the eye goes to the fires.
    const shade = Math.round(g.ground * 0.18);
    for (let i = 0; i < shade; i++) {
      ctx.fillStyle = rgba(TREES_FRONT, 0.35 * (i / shade));
      ctx.fillRect(0, this.sh - shade + i, SCENE_W, 1);
    }

    // Tufts, frost on the tips.
    for (let i = 0; i < 40; i++) {
      const x = Math.round(2 + (SCENE_W - 6) * jit(this.seed, S_TUFT_X, i));
      const y = Math.round(g.hz + 4 + (g.ground - 6) * jit(this.seed, S_TUFT_Y, i));
      ctx.fillStyle = TUFT;
      ctx.fillRect(x, y, 1, 2);
      ctx.fillRect(x + 2, y - 1, 1, 3);
      ctx.fillStyle = FROST;
      ctx.fillRect(x + 2, y - 1, 1, 1);
    }

    this.backdrop = bd;

    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      this.stars.push({
        x: Math.round((SCENE_W - 1) * jit(this.seed, S_STAR_X, i)),
        // Only the top of the sky still has any.
        y: Math.round(g.hz * 0.4 * jit(this.seed, S_STAR_Y, i)),
        phase: jit(this.seed, S_STAR_P, i) * Math.PI * 2,
      });
    }
  }

  /** A rank of stepped pine silhouettes along `base`. */
  private pines(ctx: CanvasRenderingContext2D, base: number, color: string, offset: number, scale: number, gap: number): void {
    ctx.fillStyle = color;
    const tall = Math.max(10, Math.round(this.sh * 0.16 * scale + 8));
    for (let x = -offset, i = 0; x < SCENE_W + 10; i++) {
      const h = Math.round(tall * (0.6 + 0.5 * jit(this.seed, S_TREE_H + offset, i)));
      const w = Math.round(5 + 4 * jit(this.seed, S_TREE_W + offset, i));
      const cx = x + w;
      for (let r = 0; r < h; r++) {
        // Tiers: wider at the bottom of each third, so it reads as a pine and not a triangle.
        const tier = (r % Math.max(3, Math.round(h / 3))) / Math.max(3, Math.round(h / 3));
        const half = Math.max(0, Math.round((r / h) * w * (0.6 + 0.4 * tier)));
        ctx.fillRect(cx - half, base - h + r, half * 2 + 1, 1);
      }
      ctx.fillRect(cx, base - 2, 1, 3);
      x += w + Math.round(gap * (0.4 + jit(this.seed, S_TREE_W + 40, i)));
    }
  }

  private fireAt(i: number, g: Geometry): [number, number] {
    const [sx, sy] = FIRE_SLOTS[i % FIRE_SLOTS.length]!;
    return [Math.round(SCENE_W * sx), Math.round(g.hz + g.ground * sy)];
  }

  // --- The frame ---

  private draw(): void {
    const nowMs = performance.now();
    this.dt = Math.min(0.1, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;
    this.clock += this.dt;
    const t = this.clock;
    const g = this.geometry();

    if (this.backdrop) this.ctx.drawImage(this.backdrop, 0, 0);
    else {
      this.ctx.fillStyle = SKY_MID;
      this.ctx.fillRect(0, 0, SCENE_W, this.sh);
    }

    this.drawStars(t);
    this.glow(g.sunX, g.hz - 4, g.sunR * 3.2, SUN_GLOW, 0.22 + 0.03 * Math.sin(t * 0.4));
    this.drawEyes(g, t);
    this.drawCaves(g, t);
    this.drawBones(g, t);
    this.drawWild(g);
    this.drawSprings(g, t);
    this.drawFires(g, t);
    this.drawKeepers(g, t);
    this.drawDogs(g, t);
    this.drawHoard(g, t);
    this.drawSmoke(nowMs);
    this.drawSparks(nowMs);
    this.drawLeaps(nowMs);
    this.drawCold();
  }

  private drawStars(t: number): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * 1.1 + s.phase);
      ctx.fillStyle = STAR_STEPS[Math.min(7, Math.floor(tw * 8))]!;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }

  /** Eyes in the treeline: always a pair or two, more of them the more you throw past the light. */
  private drawEyes(g: Geometry, t: number): void {
    const bones = this.view.working.root ?? 0;
    const pairs = 2 + (bones > 0 ? shownCount(bones, 5) : 0);
    const ctx = this.ctx;
    for (let i = 0; i < pairs; i++) {
      const phase = jit(this.seed, S_EYE_P, i) * 20;
      // Open for a few seconds, shut for a few, so the forest is watching rather than lit.
      const open = Math.sin(t * 0.35 + phase) > 0.1;
      if (!open || (t * 3 + phase) % 6 < 0.15) continue;
      const x = Math.round(70 + (SCENE_W - 76) * jit(this.seed, S_EYE_X, i));
      const y = g.hz - 3 - (i % 3) * 2;
      ctx.fillStyle = EYE;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 3, y, 1, 1);
    }
  }

  /**
   * A row of sprites standing on one line of the ground, spread across `from`..`to`.
   * Broken ones are drawn by `brokenDraw`, or dimmed in place.
   */
  private standRow(
    id: OriginId,
    y: number,
    t: number,
    from: number,
    to: number,
    each?: (x: number, y: number, art: Sprite, i: number) => void,
  ): void {
    const { working, broken } = this.counts(id);
    const n = working + broken;
    if (n === 0) return;
    const art = artCanvas(this.mark(id));
    const dim = artTinted(this.mark(id), DIM_TINT, 0.6);
    for (let i = 0; i < n; i++) {
      const k = from + (to - from) * ((i + 0.5) / n);
      const jx = Math.round((jit(this.seed, S_ROW_X + ROW_SALT[id], i) - 0.5) * 6);
      const x = Math.round(SCENE_W * k - art.w / 2 + jx);
      const yy = y - art.h + Math.round(jit(this.seed, S_ROW_Y + ROW_SALT[id], i) * 2);
      if (i < working) {
        this.primeGlow(id, x, yy, art.w, art.h, t, i);
        this.ctx.drawImage(art.canvas, x, yy);
        each?.(x, yy, art, i);
      } else {
        this.ctx.globalAlpha = 0.6;
        this.ctx.drawImage(dim.canvas, x, yy);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  /** Painted caves along the rocky rise, firelight moving in the mouths of the working ones. */
  private drawCaves(g: Geometry, t: number): void {
    this.standRow("hearth", g.hz + Math.round(g.ground * 0.1), t, 0.04, 0.4, (x, y, art, i) => {
      const flick = 0.6 + 0.4 * Math.sin(t * 9 + i * 2.3) * Math.sin(t * 3.1 + i);
      this.glow(x + art.w / 2, y + art.h - 2, 6, FIRELIGHT, 0.35 * flick);
    });
  }

  private drawBones(g: Geometry, t: number): void {
    this.standRow("root", g.hz + Math.round(g.ground * 0.1), t, 0.55, 0.97);
  }

  /** Gone wild: the First Dogs that went back to the trees, sat just inside them, dim. */
  private drawWild(g: Geometry): void {
    const { broken } = this.counts("first");
    if (broken === 0) return;
    const dim = artTinted(this.mark("first"), TREES_FRONT, 0.7);
    for (let i = 0; i < broken; i++) {
      const x = Math.round(48 + (SCENE_W - 70) * jit(this.seed, S_WILD_X, i));
      this.ctx.globalAlpha = 0.55;
      this.ctx.drawImage(dim.canvas, x, g.hz - dim.h + 3);
      this.ctx.globalAlpha = 1;
      // Still watching, though.
      this.ctx.fillStyle = EYE;
      this.ctx.fillRect(x + 3, g.hz - dim.h + 5, 1, 1);
    }
  }

  private drawSprings(g: Geometry, t: number): void {
    this.standRow("spring", g.hz + Math.round(g.ground * 0.36), t, 0.8, 0.98, (x, y, art, i) => {
      // The water catches the sun now and then.
      if (Math.sin(t * 2.3 + i * 2.7) > 0.9) {
        this.ctx.fillStyle = WATER_GLINT;
        this.ctx.fillRect(x + 4 + (i % 3), y + art.h - 3, 1, 1);
      }
    });
  }

  /** The fires: the first one that never went out, and every one lit off it since. */
  private drawFires(g: Geometry, t: number): void {
    const { working, broken } = this.counts("dawn");
    const n = working + broken;
    if (n === 0) return;
    const art = artCanvas(this.mark("dawn"));
    const dim = artTinted(this.mark("dawn"), "#3a3440", 0.75);
    for (let i = 0; i < n; i++) {
      const [cx, cy] = this.fireAt(i, g);
      const x = cx - Math.round(art.w / 2);
      const y = cy - art.h;
      if (i < working) {
        const flick = 0.75 + 0.15 * Math.sin(t * 11 + i * 1.7) + 0.1 * Math.sin(t * 4.3 + i);
        this.glow(cx, cy - 4, 26 + (i === 0 ? 6 : 0), FIRELIGHT, 0.3 * flick);
        this.primeGlow("dawn", x, y, art.w, art.h, t, i);
        // A pixel of jump on the flame now and then: translation only, but it reads as flicker.
        const hop = Math.sin(t * 13 + i * 3) > 0.7 ? -1 : 0;
        this.ctx.drawImage(art.canvas, x, y + hop);
        if (this.chance(3.2)) {
          this.spark(cx + Math.round((Math.random() - 0.5) * 4), y + 1, (Math.random() - 0.5) * 6, -12 - Math.random() * 10);
        }
        if (i === 0 && this.chance(1.4)) this.puffSmoke(cx, y - 2);
      } else {
        // Gone out: cold stones and a thread of smoke.
        this.ctx.drawImage(dim.canvas, x, y);
        if (this.chance(0.5)) this.puffSmoke(cx, y + 3);
      }
    }
  }

  /** Fire Keepers walk between the fires, stop, and walk again. */
  private drawKeepers(g: Geometry, t: number): void {
    const { working, broken } = this.counts("elder");
    while (this.keepers.length < working) {
      const i = this.keepers.length;
      this.keepers.push({
        x: 16 + (SCENE_W - 40) * jit(this.seed, S_KEEP_X, i),
        dir: jit(this.seed, S_KEEP_D, i) > 0.5 ? 1 : -1,
        lane: jit(this.seed, S_KEEP_L, i),
        speed: KEEPER_SPEED * (0.7 + 0.6 * jit(this.seed, S_KEEP_S, i)),
        pause: 0,
      });
    }
    this.keepers.length = Math.min(this.keepers.length, working);
    const art = this.mark("elder");
    const sprite = artCanvas(art);
    const band0 = g.hz + Math.round(g.ground * 0.42);
    const band1 = g.hz + Math.round(g.ground * 0.74);
    for (let i = 0; i < this.keepers.length; i++) {
      const w = this.keepers[i]!;
      if (w.pause > 0) {
        w.pause -= this.dt;
      } else {
        w.x += w.dir * w.speed * this.dt;
        if (this.chance(0.18)) w.pause = 1 + Math.random() * 2;
      }
      if (w.x < 6) w.dir = 1;
      if (w.x > SCENE_W - sprite.w - 6) w.dir = -1;
      const y = Math.round(band0 + (band1 - band0) * w.lane);
      const step = w.pause > 0 ? 0 : Math.round(Math.abs(Math.sin(t * 5 + i)));
      const x = Math.round(w.x);
      const yy = y - sprite.h - step;
      this.primeGlow("elder", x, yy, sprite.w, sprite.h, t, i);
      this.ctx.drawImage(sprite.canvas, x, yy);
    }
    // Frozen ones sit where they stopped, hunched and grey.
    const dim = artTinted(art, COLD, 0.6);
    for (let i = 0; i < broken; i++) {
      const x = Math.round(20 + (SCENE_W - 40) * jit(this.seed, S_BROKEN_K, i));
      const y = Math.round(band0 + (band1 - band0) * jit(this.seed, S_BROKEN_K + 50, i)) - dim.h + 2;
      this.ctx.globalAlpha = 0.7;
      this.ctx.drawImage(dim.canvas, x, y);
      this.ctx.globalAlpha = 1;
    }
  }

  /** The First Dogs: sat in a line in the firelight, looking up now and then. */
  private drawDogs(g: Geometry, t: number): void {
    const { working } = this.counts("first");
    if (working === 0) return;
    const art = artCanvas(this.mark("first"));
    const y = g.hz + Math.round(g.ground * 0.82);
    for (let i = 0; i < working; i++) {
      const k = 0.1 + 0.8 * ((i + 0.5) / working);
      const x = Math.round(SCENE_W * k - art.w / 2 + (jit(this.seed, S_ROW_X + ROW_SALT.first, i) - 0.5) * 8);
      const look = Math.sin(t * 0.7 + i * 2.1) > 0.94 ? -1 : 0;
      const yy = y - art.h + look;
      this.primeGlow("first", x, yy, art.w, art.h, t, i);
      this.glow(x + art.w / 2, yy + art.h / 2, 9, FIRELIGHT, 0.1);
      this.ctx.drawImage(art.canvas, x, yy);
    }
  }

  /** The hoard: a litter asleep on a hide by the fire, the same count the yard would show. */
  private drawHoard(g: Geometry, t: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    const k = 1 - Math.pow(0.06, this.dt);
    this.shown += (target - this.shown) * k;
    const n = Math.min(18, yardLayout(this.shown).pack);
    if (n <= 0) return;
    const pup = artCanvas(PUPPY_SPRITE);
    const z = artCanvas(ZZZ);
    const perRow = 6;
    const rows = Math.ceil(n / perRow);
    const hideW = perRow * 7 + 6;
    const hideX = Math.round(SCENE_W * 0.47 - hideW / 2);
    const hideY = Math.min(this.sh - 3, g.hz + Math.round(g.ground * 0.66) + 4);
    const ctx = this.ctx;
    ctx.fillStyle = HIDE_EDGE;
    ctx.fillRect(hideX, hideY - rows * 4 - 2, hideW, rows * 4 + 4);
    ctx.fillStyle = HIDE;
    ctx.fillRect(hideX + 1, hideY - rows * 4 - 1, hideW - 2, rows * 4 + 2);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = hideX + 3 + col * 7 + (row % 2) * 3 + Math.round((jit(this.seed, S_PUP, i) - 0.5) * 2);
      const y = hideY - row * 4 - pup.h + 1;
      const breath = Math.sin(t * 1.4 + i * 1.9) > 0.6 ? 1 : 0;
      ctx.drawImage(pup.canvas, x, y - breath);
      if (i % 7 === 3) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(z.canvas, x + 4, y - 6 - Math.round((t * 3 + i) % 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  // --- Particles ---

  private spark(x: number, y: number, vx: number, vy: number, life = 900 + Math.random() * 700): void {
    if (this.sparks.length >= MAX_SPARKS) return;
    this.sparks.push({ x, y, vx, vy, born: performance.now(), life });
  }

  private puffSmoke(x: number, y: number): void {
    if (this.smoke.length >= MAX_SMOKE) return;
    this.smoke.push({ x, y, vx: 2 + Math.random() * 3, vy: -6 - Math.random() * 3, born: performance.now(), life: 2600 });
  }

  private drawSparks(now: number): void {
    const ctx = this.ctx;
    let kept = 0;
    for (const s of this.sparks) {
      const age = (now - s.born) / s.life;
      if (age >= 1) continue;
      this.sparks[kept++] = s;
      const x = Math.round(s.x + s.vx * age + Math.sin(age * 9 + s.born) * 1.5);
      const y = Math.round(s.y + s.vy * age * 2);
      ctx.fillStyle = age < 0.4 ? SPARK_HOT : SPARK_COOL;
      ctx.globalAlpha = 1 - age;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
    this.sparks.length = kept;
  }

  private drawSmoke(now: number): void {
    const ctx = this.ctx;
    let kept = 0;
    for (const s of this.smoke) {
      const age = (now - s.born) / s.life;
      if (age >= 1) continue;
      this.smoke[kept++] = s;
      ctx.fillStyle = SMOKE_STEPS[Math.min(7, Math.floor(age * 8))]!;
      const size = age > 0.5 ? 3 : 2;
      ctx.fillRect(Math.round(s.x + s.vx * age * 4), Math.round(s.y + s.vy * age * 4), size, size);
    }
    this.smoke.length = kept;
  }

  private drawLeaps(now: number): void {
    const ctx = this.ctx;
    const pup = artCanvas(PUPPY_SPRITE);
    let kept = 0;
    for (const l of this.leaps) {
      const age = (now - l.born) / LEAP_MS;
      if (age >= 1) continue;
      this.leaps[kept++] = l;
      const x = Math.round(l.x + l.dir * age * 18);
      const y = Math.round(l.y - pup.h - Math.sin(Math.min(1, age * 1.4) * Math.PI) * 12);
      ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      ctx.drawImage(pup.canvas, x, y);
      ctx.globalAlpha = 1;
    }
    this.leaps.length = kept;
  }

  /** A lean season is the cold getting in: the picture goes blue-grey as the ground goes. */
  private drawCold(): void {
    const c = clamp(this.view.condition, 0, 1);
    const k = clamp((1 - c) / 0.75, 0, 1) * COLD_AT_FLOOR;
    if (k <= 0.001) return;
    this.ctx.fillStyle = rgba(COLD, k);
    this.ctx.fillRect(0, 0, SCENE_W, this.sh);
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

  private primeGlow(id: OriginId, x: number, y: number, w: number, h: number, t: number, idx = 0): void {
    if (!this.primed(id)) return;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + idx * 2.3);
    this.glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.9, PRIME_GLOW[id], 0.4 * pulse);
  }
}
