/**
 * The deep: under the dream, on the bottom of sleep. A cold sea floor where everything a dog ever lost
 * has sunk — balls, slippers, a kennel — lit only by what glows and by a little light from the dream,
 * a long way up. Once there is a Fourth Chihuahua, the ridge along the back turns out to be one,
 * asleep, and breathing.
 *
 * Shares the buffer conventions with `millScene.ts` and `beyondScene.ts`: integer-aligned unscaled
 * blits, translation-only animation. Placement comes off a table of seeded randoms built once per
 * seed, and every colour used in a loop is a constant, so a frame allocates next to nothing.
 */

import type { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  mix,
  mulberry32,
  rgba,
  shownCount,
  yardLayout,
  type MillView,
} from "./millScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type DeepId = Extract<solo.SoloProducerId, "spark" | "kith" | "loom" | "vault" | "crown" | "fourth">;

/** How many of each the floor will draw before it stops adding and starts implying. */
const CAP: Record<DeepId, number> = {
  spark: 8,
  kith: 5,
  loom: 6,
  vault: 4,
  crown: 5,
  fourth: 4,
};

/** What a hundred-owned tier throws light in. Same rule as the other scenes. */
const PRIME_GLOW: Record<DeepId, string> = {
  spark: "#d8f08a",
  kith: "#ffd166",
  loom: "#ff9aa8",
  vault: "#a8e0f0",
  crown: "#c8ffe0",
  fourth: "#fff4d0",
};

// --- The place ---

const WATER_TOP = "#164a5c";
const WATER_MID = "#0a2232";
const WATER_LOW = "#050e18";
const SHAFT = "#9fe0e8";
const SILT_BACK = "#16262e";
const SILT_FRONT = "#2c3c38";
const SILT_LIT = "#46584e";
const RIDGE = "#0e1c26";
const GIANT = "#1e3440";
const GIANT_RIM = "#46687a";
const GIANT_EYE = "#0a141c";
const BONE = "#b8b098";
const TAG = "#e0c04a";
const LEATHER = "#6a3a2a";
const PEBBLE = "#3a4a46";
const HOSE = "#3a4a4a";
const BUBBLE = "#c8f0f8";
const SNOW = "#d8e8e0";
const MURK = "#1a1608";
const DIM_TINT = "#06121c";
const FISH: readonly string[] = ["#ffb454", "#9fe0e8", "#ff9aa8"];

// Translucent colours, built once rather than per pixel per frame.
const BUBBLE_RING = rgba(BUBBLE, 0.55);
const BUBBLE_GLINT = rgba("#ffffff", 0.85);
const PEBBLE_A = rgba(PEBBLE, 0.8);
const BALL_SHADOW = rgba("#000000", 0.35);
const SHAFT_TOP = rgba(SHAFT, 0.14);
const SHAFT_END = rgba(SHAFT, 0);

const SNOW_N = 38;
const MAX_BUBBLES = 56;
const WHISTLED_MS = 1700;
const KITH_SPEED = 5;
/** How murky the bottom goes as the bedding up top wears: silt kicked up into everything. */
const MURK_AT_FLOOR = 0.5;
/** Size of the seeded random table every placement is read from. */
const RAND_N = 1024;

// Slots into the random table, one per kind of placement, so two uses never read the same run.
const R_SNOW = 1;
const R_DECOR = 2;
const R_ROW = 3;
const R_ROWY = 4;
const R_WALK = 5;
const R_SWIM = 6;
const R_FISH = 7;
const R_HOARD = 8;
const R_SHAFT = 9;

interface Bubble {
  x: number;
  y: number;
  vy: number;
  big: boolean;
  phase: number;
}

interface Flake {
  x: number;
  y: number;
  speed: number;
  phase: number;
}

interface Decor {
  x: number;
  y: number;
  kind: 0 | 1 | 2 | 3;
}

interface Walker {
  x: number;
  dir: 1 | -1;
  lane: number;
  speed: number;
  pause: number;
}

interface Swimmer {
  x: number;
  dir: 1 | -1;
  y: number;
  speed: number;
  phase: number;
}

interface Whistled {
  x: number;
  y: number;
  born: number;
}

export class DeepScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Back edge of the sea floor. Everything above it is water. */
  private floorY = 140;
  /** Rows of floor between the back edge and the bottom of the buffer. */
  private floorH = 60;
  /** One colour per floor row, back to front, so the frame doesn't mix strings. */
  private floorRows: string[] = [];
  private waterGrad: CanvasGradient | null = null;
  private shaftGrad: CanvasGradient | null = null;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: MillView = EMPTY_VIEW;
  private sawView = false;
  private rand: Float64Array = new Float64Array(RAND_N);
  private snow: Flake[] = [];
  private decor: Decor[] = [];
  private bubbles: Bubble[] = [];
  private walkers: Walker[] = [];
  private swimmers: Swimmer[] = [];
  private fish: Swimmer[] = [];
  private whistled: Whistled[] = [];
  /** Displayed hoard, chasing the real one so spending looks like spending. */
  private shown = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.reseed("0");
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
    this.floorY = Math.round(this.sh * 0.62);
    this.floorH = this.sh - this.floorY;
    this.floorRows = [];
    for (let i = 0; i <= this.floorH; i++) {
      this.floorRows.push(mix(SILT_BACK, SILT_FRONT, i / Math.max(1, this.floorH)));
    }
    const water = this.ctx.createLinearGradient(0, 0, 0, this.floorY);
    water.addColorStop(0, WATER_TOP);
    water.addColorStop(0.45, WATER_MID);
    water.addColorStop(1, WATER_LOW);
    this.waterGrad = water;
    const shaft = this.ctx.createLinearGradient(0, 0, 0, this.floorY);
    shaft.addColorStop(0, SHAFT_TOP);
    shaft.addColorStop(1, SHAFT_END);
    this.shaftGrad = shaft;
    this.place();
  }

  private reseed(seed: string): void {
    const next = mulberry32(hashSeed(seed));
    for (let i = 0; i < RAND_N; i++) this.rand[i] = next();
  }

  /** A seeded 0..1 for slot `slot`, index `i`. Same answer every frame, no strings built. */
  private r(slot: number, i: number): number {
    return this.rand[(slot * 131 + i * 17) % RAND_N]!;
  }

  /** Things that depend only on the seed and the buffer size. */
  private place(): void {
    this.snow = [];
    for (let i = 0; i < SNOW_N; i++) {
      this.snow.push({
        x: this.r(R_SNOW, i) * SCENE_W,
        y: this.r(R_SNOW, i + 50) * this.sh,
        speed: 1.5 + this.r(R_SNOW, i + 100) * 3,
        phase: this.r(R_SNOW, i + 150) * 10,
      });
    }
    this.decor = [];
    for (let i = 0; i < 14; i++) {
      this.decor.push({
        x: Math.round(4 + this.r(R_DECOR, i) * (SCENE_W - 12)),
        y: Math.round(this.floorY + 3 + this.r(R_DECOR, i + 40) * (this.floorH - 6)),
        kind: Math.floor(this.r(R_DECOR, i + 80) * 4) as Decor["kind"],
      });
    }
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.reseed(view.seed);
      this.place();
      this.bubbles = [];
      this.walkers = [];
      this.swimmers = [];
      this.fish = [];
      this.whistled = [];
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

  /** A whistle down here comes out as a burst of bubbles, and a pup goes up in the biggest one. */
  whistle(at?: { x: number; y: number }): void {
    if (this.whistled.length > 14) return;
    const x = at ? clamp(Math.round(at.x), 6, SCENE_W - 12) : Math.round(20 + Math.random() * (SCENE_W - 40));
    const y = at
      ? clamp(Math.round(at.y), 14, this.sh - 8)
      : Math.round(this.floorY + this.floorH * (0.4 + Math.random() * 0.4));
    this.whistled.push({ x, y, born: performance.now() });
    for (let i = 0; i < 5; i++) this.bubble(x + Math.round((Math.random() - 0.5) * 10), y, i === 0);
  }

  // --- What to draw ---

  private mark(id: DeepId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  private primed(id: DeepId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  private owned(id: DeepId): number {
    return (this.view.working[id] ?? 0) + (this.view.broken[id] ?? 0);
  }

  /** Working and broken units to draw, capped together so a bad night doesn't add sprites. */
  private counts(id: DeepId): { working: number; broken: number } {
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

  /** A floor row, as a share of the way from the back edge to the bottom. */
  private row(k: number): number {
    return this.floorY + Math.round(this.floorH * k);
  }

  // --- The frame ---

  private draw(): void {
    const nowMs = performance.now();
    this.dt = Math.min(0.1, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;
    this.clock += this.dt;
    const t = this.clock;

    this.drawWater(t);
    this.drawSnow(t, false);
    this.drawGiant(t);
    this.drawFloor();
    this.drawFourths(t);
    this.drawReefs(t);
    this.drawFish(t);
    this.drawKennels(t);
    this.drawKith(t);
    this.drawBalls(t);
    this.drawHoard(t);
    this.drawAnglers(t);
    this.drawBubbles();
    this.drawSnow(t, true);
    this.drawWhistled(nowMs);
    this.drawMurk();
  }

  /** Water, the light from the dream a long way up, and the shafts it comes down in. */
  private drawWater(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.waterGrad ?? WATER_MID;
    ctx.fillRect(0, 0, SCENE_W, this.floorY);
    this.glow(SCENE_W * 0.58, -8, 70, "#c8f0f8", 0.16);
    if (!this.shaftGrad) return;
    ctx.fillStyle = this.shaftGrad;
    for (let i = 0; i < 4; i++) {
      const x0 = Math.round(20 + this.r(R_SHAFT, i) * (SCENE_W - 40));
      const w = 5 + Math.round(this.r(R_SHAFT, i + 10) * 9);
      const sway = Math.sin(t * 0.25 + i * 1.7) * 6;
      const lean = 0.18 + this.r(R_SHAFT, i + 20) * 0.12;
      const bx = x0 + this.floorY * lean + sway;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(bx + w * 2.2, this.floorY);
      ctx.lineTo(bx, this.floorY);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Marine snow: slow flecks coming down from the dream. Half behind everything, half in front. */
  private drawSnow(t: number, front: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = SNOW;
    for (let i = front ? 1 : 0; i < this.snow.length; i += 2) {
      const f = this.snow[i]!;
      f.y += f.speed * this.dt;
      if (f.y > this.sh) {
        f.y = -2;
        f.x = Math.random() * SCENE_W;
      }
      const x = Math.round(f.x + Math.sin(t * 0.5 + f.phase) * 3);
      ctx.globalAlpha = front ? 0.5 : 0.25;
      ctx.fillRect(x, Math.round(f.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The back ridge. Without a Fourth Chihuahua it's silt; with one it's the Fourth Chihuahua, the
   * size of the whole floor, asleep — an ear, a shut eye, and a breath every few seconds.
   */
  private drawGiant(t: number): void {
    const ctx = this.ctx;
    const base = this.floorY + 1;
    if (this.owned("fourth") <= 0) {
      ctx.fillStyle = RIDGE;
      for (let x = 0; x < SCENE_W; x++) {
        const h = Math.round(4 + Math.sin(x * 0.045 + 1) * 3 + Math.sin(x * 0.13) * 1.5);
        ctx.fillRect(x, base - h, 1, h);
      }
      return;
    }
    const cx = Math.round(SCENE_W * 0.46);
    const rx = Math.round(SCENE_W * 0.4);
    const breath = Math.sin(t * 0.7) > 0.2 ? 1 : 0;
    const ry = clamp(Math.round(this.sh * 0.14), 10, 40) + breath;
    // The body: a long low curl, top half only — the floor covers the rest.
    for (let dy = -ry; dy <= 0; dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      ctx.fillStyle = dy <= -ry + 1 ? GIANT_RIM : GIANT;
      ctx.fillRect(cx - half, base + dy, half * 2, 1);
    }
    // A tail laid round the front of it.
    ctx.fillStyle = GIANT_RIM;
    ctx.fillRect(cx - rx + 4, base - 2, Math.round(rx * 0.7), 1);
    // The head, tucked at the right end, with the ear up.
    const hx = cx + rx - Math.round(ry * 0.4);
    const hr = Math.max(6, Math.round(ry * 0.62));
    const hy = base - Math.round(ry * 0.45);
    for (let dy = -hr; dy <= hr; dy++) {
      const half = Math.round(hr * 1.2 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (hr * hr))));
      ctx.fillStyle = dy <= -hr + 1 ? GIANT_RIM : GIANT;
      ctx.fillRect(hx - half, Math.min(base, hy + dy), half * 2, 1);
    }
    const earH = Math.round(hr * 1.1);
    for (let i = 0; i < earH; i++) {
      const w = Math.max(1, Math.round(((i + 1) / earH) * hr * 0.7));
      ctx.fillStyle = i === 0 ? GIANT_RIM : GIANT;
      ctx.fillRect(hx - Math.round(hr * 0.5) - Math.floor(w / 2), hy - hr - earH + i + 2, w, 1);
    }
    // The eye, shut. It twitches open, very rarely, for a frame or two.
    const open = t % 23 < 0.12;
    ctx.fillStyle = open ? "#c8ffe0" : GIANT_EYE;
    ctx.fillRect(hx + Math.round(hr * 0.2), hy - Math.round(hr * 0.15), Math.max(3, Math.round(hr * 0.4)), open ? 2 : 1);
    // Nose at the far end. On the out-breath, a bubble.
    const nx = hx + Math.round(hr * 1.15);
    const ny = hy + Math.round(hr * 0.15);
    ctx.fillStyle = GIANT_EYE;
    ctx.fillRect(nx - 2, ny, 2, 2);
    if (breath === 0 && this.chance(0.9)) this.bubble(nx, ny - 1, Math.random() < 0.4);
  }

  /** The silt, back to front, with whatever got lost lying in it. */
  private drawFloor(): void {
    const ctx = this.ctx;
    for (let i = 0; i <= this.floorH; i++) {
      ctx.fillStyle = i === 0 ? SILT_LIT : this.floorRows[i]!;
      ctx.fillRect(0, this.floorY + i, SCENE_W, 1);
    }
    for (const d of this.decor) {
      if (d.kind === 0) {
        // A bone.
        ctx.fillStyle = BONE;
        ctx.fillRect(d.x, d.y, 5, 1);
        ctx.fillRect(d.x - 1, d.y - 1, 1, 1);
        ctx.fillRect(d.x - 1, d.y + 1, 1, 1);
        ctx.fillRect(d.x + 5, d.y - 1, 1, 1);
        ctx.fillRect(d.x + 5, d.y + 1, 1, 1);
      } else if (d.kind === 1) {
        // A collar, with the tag still catching something.
        ctx.fillStyle = LEATHER;
        ctx.fillRect(d.x, d.y, 6, 1);
        ctx.fillRect(d.x, d.y - 1, 1, 1);
        ctx.fillRect(d.x + 5, d.y - 1, 1, 1);
        ctx.fillStyle = TAG;
        ctx.fillRect(d.x + 2, d.y + 1, 2, 1);
      } else {
        ctx.fillStyle = PEBBLE_A;
        ctx.fillRect(d.x, d.y, d.kind === 2 ? 2 : 3, 1);
      }
    }
  }

  /** A row of sprites standing on one floor row, spread across `from..to` of the width. */
  private standRow(
    id: DeepId,
    y: number,
    t: number,
    from: number,
    to: number,
    each?: (x: number, y: number, art: Sprite, i: number) => void,
    rise?: (i: number) => number,
  ): void {
    const { working, broken } = this.counts(id);
    const n = working + broken;
    if (n === 0) return;
    const art = artCanvas(this.mark(id));
    const dim = artTinted(this.mark(id), DIM_TINT, 0.65);
    const slot = R_ROW + id.length * 7;
    for (let i = 0; i < n; i++) {
      const k = from + (to - from) * ((i + 0.5) / n);
      const jx = Math.round((this.r(slot, i) - 0.5) * 8);
      const x = Math.round(4 + (SCENE_W - 8) * k - art.w / 2 + jx);
      const yy = y - art.h + Math.round(this.r(R_ROWY + slot, i) * 2);
      if (i < working) {
        const up = rise?.(i) ?? 0;
        this.primeGlow(id, x, yy - up, art.w, art.h, t, i);
        this.ctx.drawImage(art.canvas, x, yy - up);
        each?.(x, yy - up, art, i);
      } else {
        this.ctx.globalAlpha = 0.45;
        this.ctx.drawImage(dim.canvas, x, yy);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  /** Smaller sleepers, curled against the big one's belly. */
  private drawFourths(t: number): void {
    this.standRow("fourth", this.row(0.12), t, 0.2, 0.7, (x, y, art) => {
      if (this.chance(0.15)) this.bubble(x + art.w - 1, y + 3, false);
    });
  }

  private drawReefs(t: number): void {
    this.standRow("loom", this.row(0.26), t, 0.03, 0.97);
  }

  /** Fish, more of them the more reef there is, darting and stopping round it. */
  private drawFish(t: number): void {
    const want = (this.view.working.loom ?? 0) > 0 ? Math.min(12, 2 + 2 * shownCount(this.view.working.loom ?? 0, CAP.loom)) : 0;
    while (this.fish.length < want) {
      const i = this.fish.length;
      this.fish.push({
        x: this.r(R_FISH, i) * SCENE_W,
        dir: this.r(R_FISH, i + 30) > 0.5 ? 1 : -1,
        y: this.row(0.1) - 4 - this.r(R_FISH, i + 60) * 14,
        speed: 6 + this.r(R_FISH, i + 90) * 10,
        phase: this.r(R_FISH, i + 120) * 10,
      });
    }
    this.fish.length = want;
    const ctx = this.ctx;
    for (const [i, f] of this.fish.entries()) {
      // Dart, hang, dart: speed pulses rather than holding steady.
      const go = Math.max(0, Math.sin(t * 1.3 + f.phase));
      f.x += f.dir * f.speed * go * this.dt;
      if (f.x < 2) f.dir = 1;
      if (f.x > SCENE_W - 4) f.dir = -1;
      const x = Math.round(f.x);
      const y = Math.round(f.y + Math.sin(t * 0.8 + f.phase) * 2);
      ctx.fillStyle = FISH[i % FISH.length]!;
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x - f.dir, y - 1, 1, 1);
      ctx.fillRect(x - f.dir, y + 1, 1, 1);
    }
  }

  /** Sunken kennels, leaking their air a bubble at a time out of the door. */
  private drawKennels(t: number): void {
    this.standRow("vault", this.row(0.44), t, 0.12, 0.88, (x, y, art) => {
      if (this.chance(0.5)) this.bubble(x + Math.round(art.w / 2), y + art.h - 4, Math.random() < 0.3);
    });
  }

  /** Divers walk the bottom on lead boots, slowly, on hoses that go all the way back up. */
  private drawKith(t: number): void {
    const { working, broken } = this.counts("kith");
    while (this.walkers.length < working) {
      const i = this.walkers.length;
      this.walkers.push({
        x: 20 + (SCENE_W - 40) * this.r(R_WALK, i),
        dir: this.r(R_WALK, i + 20) > 0.5 ? 1 : -1,
        lane: this.r(R_WALK, i + 40),
        speed: KITH_SPEED * (0.7 + 0.6 * this.r(R_WALK, i + 60)),
        pause: 0,
      });
    }
    this.walkers.length = Math.min(this.walkers.length, working);
    const art = this.mark("kith");
    const sprite = artCanvas(art);
    const hosed = (this.view.marks.kith ?? 0) < 3;
    const band0 = this.row(0.5);
    const band1 = this.row(0.64);
    for (const [i, w] of this.walkers.entries()) {
      if (w.pause > 0) {
        w.pause -= this.dt;
      } else {
        w.x += w.dir * w.speed * this.dt;
        if (this.chance(0.12)) w.pause = 1 + Math.random() * 2;
      }
      if (w.x < 4) w.dir = 1;
      if (w.x > SCENE_W - sprite.w - 4) w.dir = -1;
      const x = Math.round(w.x);
      const y = Math.round(band0 + (band1 - band0) * w.lane) - sprite.h;
      if (hosed) this.drawHose(x + (w.dir > 0 ? 3 : sprite.w - 4), y, t, i);
      this.primeGlow("kith", x, y, sprite.w, sprite.h, t, i);
      this.blit(sprite, x, y, w.dir < 0);
      if (!hosed && this.chance(0.3)) this.bubble(x + 3, y + 2, false);
    }
    const dim = artTinted(art, DIM_TINT, 0.65);
    for (let i = 0; i < broken; i++) {
      const x = Math.round(16 + (SCENE_W - 32) * this.r(R_WALK, i + 200));
      const y = Math.round(band0 + (band1 - band0) * this.r(R_WALK, i + 220)) - dim.h;
      this.ctx.globalAlpha = 0.45;
      this.ctx.drawImage(dim.canvas, x, y);
      this.ctx.globalAlpha = 1;
    }
  }

  /** A hose from a helmet up out of the picture, swinging a little more the higher it goes. */
  private drawHose(x: number, top: number, t: number, i: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = HOSE;
    for (let y = top; y >= 0; y -= 1) {
      const up = (top - y) / Math.max(1, top);
      const dx = Math.round(Math.sin(y * 0.06 + t * 0.5 + i * 1.9) * 4 * up);
      ctx.fillRect(x + dx, y, 1, 1);
    }
  }

  /** Lost balls in the front row, glowing faintly, and now and then one bounces in slow motion. */
  private drawBalls(t: number): void {
    const lift = (i: number) => Math.round(Math.pow(Math.max(0, Math.sin(t * 0.6 + i * 2.3)), 10) * 4);
    this.standRow(
      "spark",
      this.row(0.74),
      t,
      0.04,
      0.96,
      (x, y, art, i) => {
        const up = lift(i);
        if (up > 0) {
          // Its shadow stays on the silt while it's up.
          this.ctx.fillStyle = BALL_SHADOW;
          this.ctx.fillRect(x + 1, y + art.h + up, art.w - 2, 1);
        }
        this.glow(x + art.w / 2, y + art.h / 2, 6, "#d8f08a", 0.12);
      },
      lift,
    );
  }

  /** The hoard: puppies asleep on the silt at the front, breathing out bubbles instead of Zs. */
  private drawHoard(t: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const n = Math.min(24, yardLayout(this.shown).pack);
    if (n <= 0) return;
    const pup = artCanvas(PUPPY_SPRITE);
    const perRow = 8;
    const y0 = this.sh - 2;
    const span = Math.min(SCENE_W - 40, perRow * 9);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const y = y0 - row * 4 - pup.h;
      const x = Math.round(SCENE_W / 2 - span / 2 + col * (span / perRow) + (row % 2) * 4 + (this.r(R_HOARD, i) - 0.5) * 3);
      const breath = Math.sin(t * 1.2 + i * 1.9) > 0.6 ? 1 : 0;
      this.ctx.drawImage(pup.canvas, x, y - breath);
      if (i % 5 === 2 && this.chance(0.35)) this.bubble(x + 2, y - 1, false);
    }
  }

  /** Angler pups, cruising mid-water with their lights out in front. */
  private drawAnglers(t: number): void {
    const { working, broken } = this.counts("crown");
    const n = working + broken;
    while (this.swimmers.length < n) {
      const i = this.swimmers.length;
      this.swimmers.push({
        x: 10 + (SCENE_W - 30) * this.r(R_SWIM, i),
        dir: this.r(R_SWIM, i + 20) > 0.5 ? 1 : -1,
        y: Math.round(this.sh * 0.18 + (this.floorY - this.sh * 0.18 - 16) * this.r(R_SWIM, i + 40)),
        speed: 3 + 4 * this.r(R_SWIM, i + 60),
        phase: this.r(R_SWIM, i + 80) * 10,
      });
    }
    this.swimmers.length = n;
    const art = this.mark("crown");
    const sprite = artCanvas(art);
    const dim = artTinted(art, DIM_TINT, 0.7);
    // Where the light is in the sprite, by mark: three lures on the last one, one otherwise.
    const lures = (this.view.marks.crown ?? 0) >= 3 ? [1, 4, 7] : [7];
    for (const [i, s] of this.swimmers.entries()) {
      const x = Math.round(s.x);
      const y = Math.round(s.y + Math.sin(t * 0.7 + s.phase) * 2);
      if (i >= working) {
        // Gone dark: sinking slowly, light out, not going anywhere.
        this.ctx.globalAlpha = 0.5;
        this.blit(dim, x, y + 2, s.dir < 0);
        this.ctx.globalAlpha = 1;
        continue;
      }
      s.x += s.dir * s.speed * this.dt;
      if (s.x < 2) s.dir = 1;
      if (s.x > SCENE_W - sprite.w - 2) s.dir = -1;
      this.primeGlow("crown", x, y, sprite.w, sprite.h, t, i);
      const pulse = 0.75 + 0.25 * Math.sin(t * 2.2 + s.phase);
      for (const col of lures) {
        const lx = s.dir < 0 ? x + sprite.w - 1 - col : x + col;
        this.glow(lx + 0.5, y + 0.5, 9, "#c8ffe0", 0.35 * pulse);
      }
      this.blit(sprite, x, y, s.dir < 0);
    }
  }

  private bubble(x: number, y: number, big: boolean): void {
    if (this.bubbles.length >= MAX_BUBBLES) return;
    this.bubbles.push({ x, y, vy: big ? 9 + Math.random() * 4 : 6 + Math.random() * 6, big, phase: Math.random() * 10 });
  }

  private drawBubbles(): void {
    const ctx = this.ctx;
    let kept = 0;
    for (const b of this.bubbles) {
      b.y -= b.vy * this.dt;
      if (b.y < -3) continue;
      this.bubbles[kept++] = b;
      const x = Math.round(b.x + Math.sin(b.y * 0.2 + b.phase) * 1.2);
      const y = Math.round(b.y);
      if (b.big) {
        ctx.fillStyle = BUBBLE_RING;
        ctx.fillRect(x, y - 1, 2, 1);
        ctx.fillRect(x, y + 2, 2, 1);
        ctx.fillRect(x - 1, y, 1, 2);
        ctx.fillRect(x + 2, y, 1, 2);
        ctx.fillStyle = BUBBLE_GLINT;
        ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = BUBBLE_RING;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.bubbles.length = kept;
  }

  private drawWhistled(now: number): void {
    const ctx = this.ctx;
    const pup = artCanvas(PUPPY_SPRITE);
    let kept = 0;
    for (const d of this.whistled) {
      const age = (now - d.born) / WHISTLED_MS;
      if (age >= 1) continue;
      this.whistled[kept++] = d;
      const x = Math.round(d.x + Math.sin(age * 6) * 2);
      const y = Math.round(d.y - age * 30);
      ctx.globalAlpha = age > 0.6 ? 1 - (age - 0.6) / 0.4 : 1;
      ctx.fillStyle = BUBBLE_RING;
      for (let a = 0; a < 20; a++) {
        const th = (a / 20) * Math.PI * 2;
        ctx.fillRect(Math.round(x + 3 + Math.cos(th) * 6), Math.round(y + 2 + Math.sin(th) * 6), 1, 1);
      }
      ctx.fillStyle = BUBBLE_GLINT;
      ctx.fillRect(x - 1, y - 2, 1, 1);
      ctx.drawImage(pup.canvas, x, y);
      ctx.globalAlpha = 1;
    }
    this.whistled.length = kept;
  }

  /** Tired bedding up top is silt kicked up down here: the whole picture goes murky. */
  private drawMurk(): void {
    const k = clamp((1 - clamp(this.view.condition, 0, 1)) / 0.75, 0, 1) * MURK_AT_FLOOR;
    if (k <= 0.001) return;
    this.ctx.globalAlpha = k;
    this.ctx.fillStyle = MURK;
    this.ctx.fillRect(0, 0, SCENE_W, this.sh);
    this.ctx.globalAlpha = 1;
  }

  // --- Light and blitting ---

  /** Whole-pixel blit, mirrored about the sprite's own width when facing left. */
  private blit(sprite: Sprite, x: number, y: number, flip: boolean): void {
    if (!flip) {
      this.ctx.drawImage(sprite.canvas, x, y);
      return;
    }
    this.ctx.save();
    this.ctx.translate(x + sprite.w, y);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(sprite.canvas, 0, 0);
    this.ctx.restore();
  }

  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0.001 || r <= 0) return;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  private primeGlow(id: DeepId, x: number, y: number, w: number, h: number, t: number, idx = 0): void {
    if (!this.primed(id)) return;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + idx * 2.3);
    this.glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.9, PRIME_GLOW[id], 0.4 * pulse);
  }
}
