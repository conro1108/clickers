/**
 * End: the bridge at the end of everything. A soft evening over a meadow that never needs mowing,
 * and across the sky a rainbow you can walk on. Bridge Keepers wave dogs onto it at the near foot,
 * Sunbeams lie warm on the grass, Collar Racks keep one tag for every dog that crossed, the Waiting
 * Pack sits along the front, and at the top of the arch the Last Dog waits, facing you.
 *
 * Same buffer conventions as `originScene.ts`: integer-aligned unscaled blits, translation-only
 * animation. Sky, rainbow and meadow gradient only change with size or condition.
 */

import type { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE, ZZZ } from "./art.js";
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

type EndId = Extract<solo.SoloProducerId, "ember" | "ward" | "lull" | "relic" | "legion" | "last">;

const CAP: Record<EndId, number> = {
  ember: 10,
  ward: 3,
  lull: 3,
  relic: 3,
  legion: 4,
  last: 1,
};

const PRIME_GLOW: Record<EndId, string> = {
  ember: "#ffc0e0",
  ward: "#fff4c0",
  lull: "#ffe8a0",
  relic: "#ffd166",
  legion: "#ff9ab0",
  last: "#fff4c0",
};

const SKY_TOP = "#3a2a6a";
const SKY_MID = "#c07aa8";
const SKY_LOW = "#ffd8a0";
const BANDS = ["#e05050", "#f0a040", "#f0e060", "#60c060", "#5080e0", "#9060c0"];
const MEADOW_HI = "#7ab858";
const MEADOW_LO = "#3e7a34";
const MEADOW_DRY_HI = "#a8a070";
const MEADOW_DRY_LO = "#6a6040";
const TUFT = "#2e5e2a";
const TUFT_LIT = "#c8e890";
const CLOUD = "#fff0f4";
const BLANKET = "#e08aa0";
const BLANKET_EDGE = "#a05a70";
const BROKEN_TINT = "#5a5260";

const LEAP_MS = 900;
const MAX_PUPS = 6;
const MAX_CROSSERS = 6;

interface Spot {
  x: number;
  y: number;
}

interface Leap {
  x: number;
  y: number;
  dir: 1 | -1;
  born: number;
}

/** A dog on its way over: 0 at the near foot of the arch, 1 at the far one. */
interface Crosser {
  u: number;
  speed: number;
}

function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** Where the meadow starts for a buffer height. */
export function meadowFor(sh: number): number {
  return Math.round(sh * 0.6);
}

export class EndScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private hz = 120;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: MillView = EMPTY_VIEW;
  private sawView = false;

  private skyRows: string[] = [];
  private meadowRows: string[] = [];
  private meadowFor = -1;
  private arch = { cx: 96, r: 70, foot: 120 };
  private spots: Record<EndId, Spot[]> = {} as Record<EndId, Spot[]>;
  private tufts: Spot[] = [];
  private clouds: { x: number; y: number; w: number }[] = [];

  private leaps: Leap[] = [];
  private crossers: Crosser[] = [];
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
    const resized = sh !== this.sh || this.skyRows.length === 0;
    this.sh = sh;
    this.canvas.width = SCENE_W;
    this.canvas.height = sh;
    this.ctx.imageSmoothingEnabled = false;
    if (!resized) return;
    this.hz = meadowFor(sh);
    this.skyRows = [];
    for (let y = 0; y < this.hz; y++) {
      const k = y / Math.max(1, this.hz - 1);
      this.skyRows.push(k < 0.55 ? mix(SKY_TOP, SKY_MID, k / 0.55) : mix(SKY_MID, SKY_LOW, (k - 0.55) / 0.45));
    }
    // The arch stands on the meadow with its feet near the edges; its top clears the buffer's.
    const r = Math.min(80, this.hz - 12);
    this.arch = { cx: 96, r, foot: this.hz + 2 };
    const cr = mulberry32(9);
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({ x: cr() * SCENE_W, y: 6 + cr() * this.hz * 0.5, w: 14 + Math.round(cr() * 16) });
    }
    this.meadowFor = -1;
    if (this.sawView) this.layOut();
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.sawView = true;
      this.layOut();
      this.leaps = [];
      this.crossers = [];
      this.shown = Math.max(0, view.hoard);
    }
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

  /** A whistle: a pup bounds up out of the long grass. */
  whistle(at?: { x: number; y: number }): void {
    if (this.leaps.length >= MAX_PUPS) return;
    const x = at ? clamp(Math.round(at.x), 6, SCENE_W - 12) : Math.round(30 + Math.random() * (SCENE_W - 60));
    const y = at
      ? clamp(Math.round(at.y), this.hz + 6, this.sh - 4)
      : Math.round(this.hz + (this.sh - this.hz) * (0.4 + Math.random() * 0.5));
    this.leaps.push({ x, y, dir: Math.random() < 0.5 ? -1 : 1, born: performance.now() });
  }

  // --- Where things are ---

  private layOut(): void {
    const r = mulberry32(hashSeed(this.view.seed + ":end"));
    const hz = this.hz;
    const m = this.sh - hz;
    const spread = (n: number, lo: number, hi: number, yLo: number, yHi: number): Spot[] => {
      const out: Spot[] = [];
      const step = (hi - lo) / n;
      for (let i = 0; i < n; i++) {
        out.push({
          x: Math.round(lo + step * (i + 0.5) + (r() - 0.5) * step * 0.6),
          y: Math.round(hz + m * (yLo + r() * (yHi - yLo))),
        });
      }
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    };
    const foot = this.arch.cx - this.arch.r;
    this.spots = {
      ember: spread(CAP.ember, 8, SCENE_W - 8, 0.15, 0.6),
      ward: [
        { x: foot + 6, y: Math.round(hz + m * 0.16) },
        { x: foot + 16, y: Math.round(hz + m * 0.22) },
        { x: foot - 2, y: Math.round(hz + m * 0.26) },
      ],
      lull: [
        { x: 60, y: Math.round(hz + m * 0.34) },
        { x: 132, y: Math.round(hz + m * 0.3) },
        { x: 96, y: Math.round(hz + m * 0.44) },
      ],
      relic: [
        { x: this.arch.cx + this.arch.r - 6, y: Math.round(hz + m * 0.18) },
        { x: this.arch.cx + this.arch.r - 18, y: Math.round(hz + m * 0.24) },
        { x: this.arch.cx + this.arch.r + 4, y: Math.round(hz + m * 0.28) },
      ],
      legion: [
        { x: 92, y: this.sh - 2 },
        { x: 112, y: this.sh - 2 },
        { x: 132, y: this.sh - 2 },
        { x: 152, y: this.sh - 2 },
      ],
      last: [{ x: this.arch.cx, y: this.arch.foot - this.arch.r - 2 }],
    };
    this.tufts = [];
    for (let i = 0; i < 50; i++) this.tufts.push({ x: Math.floor(r() * SCENE_W), y: Math.round(hz + 2 + r() * (m - 3)) });
    this.tufts.sort((a, b) => a.y - b.y);
  }

  /** A point on the arch's top band, `u` 0..1 from near foot to far. */
  private onArch(u: number): Spot {
    const a = Math.PI * (1 - u);
    return {
      x: Math.round(this.arch.cx + Math.cos(a) * this.arch.r),
      y: Math.round(this.arch.foot - Math.sin(a) * this.arch.r),
    };
  }

  private mark(id: EndId): Art {
    const marks = PRODUCER_MARKS[id];
    return marks[clamp(this.view.marks[id] ?? 0, 0, marks.length - 1)] ?? marks[0];
  }

  private primed(id: EndId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  private counts(id: EndId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total <= 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? Math.max(1, Math.round((total * b) / (w + b))) : 0;
    return { working: Math.max(0, total - broken), broken: Math.min(total, broken) };
  }

  private sprite(id: EndId, broken: boolean): Sprite {
    return broken ? artTinted(this.mark(id), BROKEN_TINT, 0.6) : artCanvas(this.mark(id));
  }

  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  // --- Drawing ---

  private draw(): void {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += this.dt;
    const t = this.clock;
    this.ctx.clearRect(0, 0, SCENE_W, this.sh);

    this.drawSky(t);
    this.drawRainbow();
    this.drawLast(t);
    this.drawCrossers(t);
    this.drawMeadow(t);
    this.drawBeams(t);
    this.drawRacks(t);
    this.drawKeepers(t);
    this.drawFlowers(t);
    this.drawHoard(t);
    this.drawPack(t);
    this.drawLeaps(now);
  }

  private drawSky(t: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.skyRows.length; y++) {
      ctx.fillStyle = this.skyRows[y]!;
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba(CLOUD, 0.55);
    for (const c of this.clouds) {
      const x = Math.round(((c.x + t * 1.5) % (SCENE_W + 40)) - 20);
      ctx.fillRect(x, Math.round(c.y), c.w, 2);
      ctx.fillRect(x + 3, Math.round(c.y) - 2, c.w - 6, 2);
    }
  }

  /** The bridge: six bands in an arch, feet in the meadow. */
  private drawRainbow(): void {
    const ctx = this.ctx;
    const { cx, r, foot } = this.arch;
    for (let b = 0; b < BANDS.length; b++) {
      ctx.fillStyle = rgba(BANDS[b]!, 0.75);
      const rb = r - b * 2;
      for (let x = -rb; x <= rb; x++) {
        const y = Math.round(foot - Math.sqrt(Math.max(0, rb * rb - x * x)));
        ctx.fillRect(cx + x, y, 1, 2);
      }
    }
  }

  /** The Last Dog, sat at the top of the arch, facing back the way everyone came. */
  private drawLast(t: number): void {
    const { working, broken } = this.counts("last");
    if (working + broken === 0) return;
    const isBroken = working === 0;
    const spot = this.spots.last[0]!;
    const s = this.sprite("last", isBroken);
    const ctx = this.ctx;
    if (!isBroken) {
      const reach = 10 + Math.min(10, Math.log2(1 + (this.view.working.last ?? 0)) * 2);
      fillDisc(ctx, spot.x, spot.y - (s.h >> 1), reach, rgba(PRIME_GLOW.last, this.primed("last") ? 0.3 : 0.18));
    }
    const ears = isBroken ? 0 : Math.sin(t * 0.6) > 0.9 ? 1 : 0;
    ctx.drawImage(s.canvas, spot.x - (s.w >> 1), spot.y - s.h - ears);
  }

  /** Dogs walking the bridge, sent over by the Keepers. More keepers, more of them going. */
  private drawCrossers(t: number): void {
    const keepers = this.counts("ward").working;
    if (keepers > 0 && this.crossers.length < MAX_CROSSERS && this.chance(0.08 * keepers)) {
      this.crossers.push({ u: 0, speed: 0.025 + Math.random() * 0.015 });
    }
    const pup = artCanvas(PUPPY_SPRITE);
    const ctx = this.ctx;
    for (const c of this.crossers) {
      c.u += c.speed * this.dt;
      const p = this.onArch(c.u);
      const hop = Math.round(Math.abs(Math.sin(t * 8 + c.u * 40)));
      ctx.drawImage(pup.canvas, p.x - (pup.w >> 1), p.y - pup.h - hop);
    }
    this.crossers = this.crossers.filter((c) => c.u < 1);
  }

  private drawMeadow(t: number): void {
    const ctx = this.ctx;
    const condition = Math.round(clamp(this.view.condition, 0, 1) * 50) / 50;
    if (condition !== this.meadowFor) {
      this.meadowFor = condition;
      const dry = clamp((1 - condition) * 1.3, 0, 1);
      const hi = mix(MEADOW_HI, MEADOW_DRY_HI, dry);
      const lo = mix(MEADOW_LO, MEADOW_DRY_LO, dry);
      this.meadowRows = [];
      for (let y = this.hz; y < this.sh; y++) this.meadowRows.push(mix(hi, lo, (y - this.hz) / Math.max(1, this.sh - this.hz)));
    }
    for (let i = 0; i < this.meadowRows.length; i++) {
      ctx.fillStyle = this.meadowRows[i]!;
      ctx.fillRect(0, this.hz + i, SCENE_W, 1);
    }
    const wind = Math.sin(t * 0.8);
    for (let i = 0; i < this.tufts.length; i++) {
      const tf = this.tufts[i]!;
      ctx.fillStyle = TUFT;
      ctx.fillRect(tf.x, tf.y - 2, 1, 2);
      ctx.fillStyle = TUFT_LIT;
      ctx.fillRect(tf.x + Math.round(wind * 0.8 + Math.sin(t * 1.3 + i) * 0.4), tf.y - 3, 1, 1);
    }
  }

  /** Sunbeams slanting down out of the sky onto warm patches of grass. */
  private drawBeams(t: number): void {
    const { working, broken } = this.counts("lull");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.lull[i]!;
      if (!isBroken) {
        const a = 0.08 + 0.03 * Math.sin(t * 0.5 + i);
        ctx.fillStyle = rgba(PRIME_GLOW.lull, this.primed("lull") ? a * 1.6 : a);
        for (let y = 0; y < spot.y; y += 2) {
          const k = y / spot.y;
          const x = Math.round(spot.x - 24 * (1 - k));
          ctx.fillRect(x - 3 - Math.round(k * 3), y, 7 + Math.round(k * 6), 2);
        }
      }
      const s = this.sprite("lull", isBroken);
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1), spot.y - s.h + 1);
    }
  }

  /** Collar Racks at the far foot, tags catching the light as bright as the meadow is kept. */
  private drawRacks(t: number): void {
    const { working, broken } = this.counts("relic");
    const ctx = this.ctx;
    const keep = clamp(this.view.condition, 0, 1);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.relic[i]!;
      const s = this.sprite("relic", isBroken);
      const x = clamp(spot.x - (s.w >> 1), 0, SCENE_W - s.w);
      const y = spot.y - s.h + 1;
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken && Math.sin(t * 2 + i * 1.7) > 1 - 0.3 * keep) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 2 + ((i * 3) % (s.w - 4)), y + s.h - 1, 1, 1);
      }
      if (!isBroken && this.primed("relic")) fillDisc(ctx, x + (s.w >> 1), y + (s.h >> 1), 6, rgba(PRIME_GLOW.relic, 0.16));
    }
  }

  /** Bridge Keepers at the near foot. Now and then one waves. */
  private drawKeepers(t: number): void {
    const { working, broken } = this.counts("ward");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.ward[i]!;
      const s = this.sprite("ward", isBroken);
      const wave = isBroken ? 0 : Math.sin(t * 1.5 + i * 2) > 0.85 ? 1 : 0;
      const x = clamp(spot.x - (s.w >> 1), 0, SCENE_W - s.w);
      const y = spot.y - s.h + 1 - wave;
      if (!isBroken && this.primed("ward")) fillDisc(ctx, x + (s.w >> 1), y + 3, 6, rgba(PRIME_GLOW.ward, 0.18));
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The Long Meadow's flowers, back to front. */
  private drawFlowers(t: number): void {
    const { working, broken } = this.counts("ember");
    const n = working + broken;
    if (n === 0) return;
    const ctx = this.ctx;
    const order: number[] = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => this.spots.ember[a]!.y - this.spots.ember[b]!.y);
    for (const i of order) {
      const isBroken = i >= working;
      const spot = this.spots.ember[i]!;
      const s = this.sprite("ember", isBroken);
      const sway = isBroken ? 0 : Math.round(Math.sin(t * 1.1 + i * 1.7) * 0.6);
      if (!isBroken && this.primed("ember")) fillDisc(ctx, spot.x, spot.y - 3, 5, rgba(PRIME_GLOW.ember, 0.18));
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1) + sway, spot.y - s.h + 1);
    }
  }

  /** The litter, asleep on a blanket at the front left. */
  private drawHoard(t: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const n = Math.min(18, yardLayout(this.shown).pack);
    if (n <= 0) return;
    const pup = artCanvas(PUPPY_SPRITE);
    const z = artCanvas(ZZZ);
    const perRow = 6;
    const rows = Math.ceil(n / perRow);
    const w = perRow * 7 + 6;
    const x0 = 4;
    const foot = this.sh - 3;
    const ctx = this.ctx;
    ctx.fillStyle = BLANKET_EDGE;
    ctx.fillRect(x0, foot - rows * 4 - 2, w, rows * 4 + 4);
    ctx.fillStyle = BLANKET;
    ctx.fillRect(x0 + 1, foot - rows * 4 - 1, w - 2, rows * 4 + 2);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = x0 + 3 + col * 7 + (row % 2) * 3;
      const y = foot - row * 4 - pup.h + 1;
      const breath = Math.sin(t * 1.4 + i * 1.9) > 0.6 ? 1 : 0;
      ctx.drawImage(pup.canvas, x, y - breath);
      if (i % 7 === 3) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(z.canvas, x + 4, y - 6 - Math.round((t * 3 + i) % 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  /** The Waiting Pack along the front. Every doubling of the generations adds a dog to the end of the row. */
  private drawPack(t: number): void {
    const { working, broken } = this.counts("legion");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.legion[i]!;
      const s = this.sprite("legion", isBroken);
      const x = clamp(spot.x - (s.w >> 1), 0, SCENE_W - s.w);
      const y = spot.y - s.h;
      if (!isBroken && this.primed("legion")) fillDisc(ctx, x + (s.w >> 1), y + 2, 7, rgba(PRIME_GLOW.legion, 0.16));
      const look = isBroken ? 0 : Math.sin(t * 0.9 + i * 2.2) > 0.9 ? 1 : 0;
      ctx.drawImage(s.canvas, x, y - look);
    }
    if (working === 0) return;
    const extra = Math.min(8, Math.floor(Math.log2(Math.max(1, this.view.generation))));
    const last = this.spots.legion[Math.max(0, working + broken - 1)]!;
    ctx.fillStyle = "#8a6a4a";
    for (let k = 0; k < extra; k++) {
      const x = last.x + 8 + k * 4;
      if (x > SCENE_W - 3) break;
      ctx.fillRect(x, this.sh - 6, 2, 4);
      ctx.fillRect(x, this.sh - 7, 1, 1);
    }
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
}
