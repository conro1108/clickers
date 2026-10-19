/**
 * End: past the last harvest. A huge red sun most of the way down, an ash plain under it, and
 * everything that was ever grown coming here to be gathered. Ash Plots still put up a sprout or two,
 * Gleaners pick over the ground, Vesper Bells ring the dusk out from the ridge, Root Cellars keep
 * one of everything, the Long Table seats every generation you farmed, and on a stone in the middle
 * the Last Potato sits, still warm.
 *
 * Same buffer conventions as `originScene.ts`: integer-aligned unscaled blits, translation-only
 * animation, everything that depends on size or seed worked out in `resize` / `layOut`.
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
import { shownCount, territory } from "./insideScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type EndId = Extract<solo.SoloProducerId, "ember" | "ward" | "lull" | "relic" | "legion" | "last">;

const CAP: Record<EndId, number> = {
  ember: 10,
  ward: 5,
  lull: 3,
  relic: 3,
  legion: 2,
  last: 3,
};

const PRIME_GLOW: Record<EndId, string> = {
  ember: "#b8d86a",
  ward: "#e0b070",
  lull: "#ffd166",
  relic: "#ffd890",
  legion: "#fff4c0",
  last: "#ffb060",
};

const SKY_TOP = "#140c1c";
const SKY_MID = "#4a1a2e";
const SKY_LOW = "#b0482e";
const SUN_CORE = "#ff7a4a";
const SUN_RIM = "#c0302a";
const SUN_BAND = "#8a2024";
const RIDGE = "#2a1a22";
const ASH_HI = "#6a5a5a";
const ASH_LO = "#2e2626";
const ASH_DRY_HI = "#4a4044";
const ASH_DRY_LO = "#1e1a1c";
const PLINTH = "#5a5050";
const PLINTH_LIT = "#a07060";
const FLAKE = "#c8b8b0";
const BROKEN_TINT = "#3a3236";
const INK = "#402e3a";

const DUG_MS = 1100;
const MAX_FLAKES = 40;

interface Spot {
  x: number;
  y: number;
}

interface Walker {
  x: number;
  dir: 1 | -1;
  until: number;
  paused: boolean;
  phase: number;
}

interface Dug {
  x: number;
  y: number;
  born: number;
}

function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** One ring of a circle, a pixel wide: a bell's note going out. */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const steps = Math.max(12, Math.round(r * 5));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 1, 1);
  }
}

/** Where the plain meets the sky. Halfway: the sun needs the room. */
export function horizonFor(sh: number): number {
  return Math.round(sh * 0.5);
}

export class EndScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private hz = 100;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: FarmView = EMPTY_VIEW;
  private sawView = false;

  private skyRows: string[] = [];
  private ridge: number[] = [];
  private ashRows: string[] = [];
  private ashFor = -1;
  private spots: Record<EndId, Spot[]> = {} as Record<EndId, Spot[]>;
  private specks: Spot[] = [];

  private walkers: Walker[] = [];
  private flakes: { x: number; y: number; vx: number; vy: number }[] = [];
  private rings: { x: number; y: number; age: number }[] = [];
  private dug: Dug[] = [];
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
    this.hz = horizonFor(sh);
    this.skyRows = [];
    for (let y = 0; y < this.hz; y++) {
      const k = y / Math.max(1, this.hz - 1);
      this.skyRows.push(k < 0.5 ? mix(SKY_TOP, SKY_MID, k / 0.5) : mix(SKY_MID, SKY_LOW, (k - 0.5) / 0.5));
    }
    this.ridge = [];
    for (let x = 0; x < SCENE_W; x++) {
      this.ridge.push(Math.round(this.hz - 4 - 3 * Math.sin(x / 19 + 1.3) - 1.5 * Math.sin(x / 7.1)));
    }
    this.ashFor = -1;
    if (this.sawView) this.layOut();
  }

  update(view: FarmView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.sawView = true;
      this.layOut();
      this.walkers = [];
      this.rings = [];
      this.dug = [];
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

  /** A dig: one more potato turned up out of the ash, onto the pile. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 12) return;
    const x = at ? clamp(Math.round(at.x), 3, SCENE_W - 8) : Math.round(40 + Math.random() * 100);
    const y = at
      ? clamp(Math.round(at.y), this.hz + 2, this.sh - 6)
      : Math.round(this.hz + (this.sh - this.hz) * (0.4 + Math.random() * 0.5));
    this.dug.push({ x, y, born: performance.now() });
    for (let i = 0; i < 3 && this.flakes.length < MAX_FLAKES; i++) {
      this.flakes.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 6 });
    }
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
    this.spots = {
      ember: spread(CAP.ember, 40, SCENE_W - 6, 0.3, 0.85),
      ward: [],
      lull: [
        { x: 18, y: 0 },
        { x: SCENE_W - 22, y: 0 },
        { x: 54, y: 0 },
      ],
      relic: [
        { x: 146, y: Math.round(hz + m * 0.16) },
        { x: 118, y: Math.round(hz + m * 0.12) },
        { x: 164, y: Math.round(hz + m * 0.24) },
      ],
      legion: [
        { x: 104, y: Math.round(hz + m * 0.92) },
        { x: 146, y: Math.round(hz + m * 0.92) },
      ],
      last: [
        { x: 88, y: Math.round(hz + m * 0.2) },
        { x: 70, y: Math.round(hz + m * 0.24) },
        { x: 106, y: Math.round(hz + m * 0.24) },
      ],
    };
    this.specks = [];
    for (let i = 0; i < 40; i++) this.specks.push({ x: Math.floor(r() * SCENE_W), y: Math.round(hz + 2 + r() * (m - 3)) });
  }

  private art(id: EndId): Art {
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
    if (total === 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? clamp(Math.round((total * b) / (w + b)), 1, total) : 0;
    return { working: total - broken, broken };
  }

  private sprite(id: EndId, broken: boolean): Sprite {
    return broken ? artTinted(this.art(id), BROKEN_TINT, 0.65) : artCanvas(this.art(id));
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

    this.drawSky();
    this.drawSun(t);
    this.drawRidge();
    this.drawAsh();
    this.drawCellars(t);
    this.drawLast(t);
    this.drawPlots(t);
    this.drawGleaners(t);
    this.drawTables(t);
    this.drawHoard();
    this.drawFlakes();
    this.drawDug(now);
  }

  private drawSky(): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.skyRows.length; y++) {
      ctx.fillStyle = this.skyRows[y]!;
      ctx.fillRect(0, y, SCENE_W, 1);
    }
  }

  /** The sun, enormous and most of the way down, with dark bands across it. It doesn't move. */
  private drawSun(t: number): void {
    const ctx = this.ctx;
    const cx = 92;
    const cy = this.hz + 2;
    const R = clamp(Math.round(this.hz * 0.62), 24, 70);
    // The Last Potatoes warm it a little: the more of them, the further the glow reaches.
    const warm = territory(this.view.working.last ?? 0, 0, 1);
    fillDisc(ctx, cx, cy, R + 10 + 8 * warm, rgba(SUN_RIM, 0.12));
    fillDisc(ctx, cx, cy, R + 4, rgba(SUN_RIM, 0.25));
    fillDisc(ctx, cx, cy, R, SUN_RIM);
    fillDisc(ctx, cx, cy, R - 3, SUN_CORE);
    ctx.fillStyle = SUN_BAND;
    for (let i = 0; i < 4; i++) {
      const y = Math.round(cy - R * 0.2 - i * R * 0.18 + Math.sin(t * 0.2 + i) * 0.5);
      const half = Math.floor(Math.sqrt(Math.max(0, (R - 3) ** 2 - (y - cy) ** 2)));
      if (half > 0) ctx.fillRect(cx - half, y, half * 2 + 1, 1 + (i % 2));
    }
  }

  /** The ridge along the horizon, with the Vesper Bells on it, and the rings they send out. */
  private drawRidge(): void {
    const ctx = this.ctx;
    ctx.fillStyle = RIDGE;
    for (let x = 0; x < SCENE_W; x++) {
      const top = this.ridge[x]!;
      ctx.fillRect(x, top, 1, this.hz - top + 1);
    }
    const { working, broken } = this.counts("lull");
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.lull[i]!;
      const s = this.sprite("lull", isBroken);
      const base = this.ridge[clamp(spot.x, 0, SCENE_W - 1)]!;
      const x = spot.x - (s.w >> 1);
      const y = base - s.h + 1;
      if (!isBroken && this.primed("lull")) fillDisc(ctx, spot.x, y + 5, 6, rgba(PRIME_GLOW.lull, 0.2));
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken && this.chance(0.12) && this.rings.length < 6) this.rings.push({ x: spot.x, y: y + 5, age: 0 });
    }
    for (const rg of this.rings) {
      rg.age += this.dt;
      ring(ctx, rg.x, rg.y, 4 + rg.age * 16, rgba(PRIME_GLOW.lull, Math.max(0, 0.45 - rg.age * 0.15)));
    }
    this.rings = this.rings.filter((rg) => rg.age < 3);
  }

  /** The ash plain: grey, greyer where the ground's been let go, flecked. */
  private drawAsh(): void {
    const ctx = this.ctx;
    const condition = Math.round(clamp(this.view.condition, 0, 1) * 50) / 50;
    if (condition !== this.ashFor) {
      this.ashFor = condition;
      const dry = clamp((1 - condition) * 1.3, 0, 1);
      const hi = mix(ASH_HI, ASH_DRY_HI, dry);
      const lo = mix(ASH_LO, ASH_DRY_LO, dry);
      this.ashRows = [];
      for (let y = this.hz; y < this.sh; y++) this.ashRows.push(mix(hi, lo, (y - this.hz) / Math.max(1, this.sh - this.hz)));
    }
    for (let i = 0; i < this.ashRows.length; i++) {
      ctx.fillStyle = this.ashRows[i]!;
      ctx.fillRect(0, this.hz + i, SCENE_W, 1);
    }
    // The sun lays a red road across the ash toward you.
    ctx.fillStyle = rgba(SUN_CORE, 0.12);
    for (let y = this.hz + 1; y < this.sh; y += 2) {
      const k = (y - this.hz) / (this.sh - this.hz);
      const half = Math.round(6 + k * 18);
      ctx.fillRect(92 - half, y, half * 2, 1);
    }
    ctx.fillStyle = rgba(FLAKE, 0.25);
    for (const s of this.specks) ctx.fillRect(s.x, s.y, 1, 1);
  }

  /** Root Cellars set into the far ground, doors lit from inside when they're keeping. */
  private drawCellars(t: number): void {
    const { working, broken } = this.counts("relic");
    const ctx = this.ctx;
    const keep = clamp(this.view.condition, 0, 1);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.relic[i]!;
      const s = this.sprite("relic", isBroken);
      const x = spot.x - (s.w >> 1);
      const y = spot.y - s.h + 1;
      if (!isBroken) {
        const a = (0.12 + 0.04 * Math.sin(t * 0.9 + i)) * keep;
        fillDisc(ctx, spot.x, spot.y - 2, this.primed("relic") ? 9 : 6, rgba(PRIME_GLOW.relic, a));
      }
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The Last Potato on its stone in the middle, and any more beside it. */
  private drawLast(t: number): void {
    const { working, broken } = this.counts("last");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.last[i]!;
      // The stone.
      const pw = i === 0 ? 14 : 10;
      ctx.fillStyle = PLINTH;
      ctx.fillRect(spot.x - (pw >> 1), spot.y - 3, pw, 4);
      ctx.fillStyle = PLINTH_LIT;
      ctx.fillRect(spot.x - (pw >> 1), spot.y - 3, pw, 1);
      const s = this.sprite("last", isBroken);
      const breathe = isBroken ? 0 : Math.round(Math.sin(t * 0.8 + i) * 0.5);
      if (!isBroken) {
        const prime = this.primed("last");
        fillDisc(ctx, spot.x, spot.y - 3 - (s.h >> 1), prime ? 13 : 9, rgba(PRIME_GLOW.last, prime ? 0.28 : 0.18));
      }
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1), spot.y - 3 - s.h - breathe);
    }
  }

  /** Ash Plots, each with its sprout or two. Prime ones give off a little green, the only green there is. */
  private drawPlots(t: number): void {
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
      const sway = isBroken ? 0 : Math.round(Math.sin(t * 0.9 + i * 1.3) * 0.5);
      if (!isBroken && this.primed("ember")) fillDisc(ctx, spot.x, spot.y - 4, 5, rgba(PRIME_GLOW.ember, 0.16));
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1) + sway, spot.y - s.h + 1);
    }
  }

  /** Gleaners, stooping over the ash and moving on. Broken ones sit where they stopped. */
  private drawGleaners(t: number): void {
    const { working, broken } = this.counts("ward");
    const n = working + broken;
    while (this.walkers.length < n) {
      const i = this.walkers.length;
      this.walkers.push({
        x: 30 + ((i * 41) % 120),
        dir: Math.random() < 0.5 ? 1 : -1,
        until: t + 1 + Math.random() * 3,
        paused: false,
        phase: Math.random() * 6,
      });
    }
    this.walkers.length = n;
    const ctx = this.ctx;
    const lane = this.hz + Math.round((this.sh - this.hz) * 0.6);
    for (let i = 0; i < n; i++) {
      const w = this.walkers[i]!;
      const isBroken = i >= working;
      if (!isBroken) {
        if (t >= w.until) {
          w.paused = !w.paused;
          w.until = t + (w.paused ? 1.5 + Math.random() * 2 : 2 + Math.random() * 4);
          if (!w.paused && Math.random() < 0.5) w.dir = w.dir === 1 ? -1 : 1;
        }
        if (!w.paused) {
          w.x += w.dir * 4 * this.dt;
          if (w.x < 34 || w.x > SCENE_W - 8) w.dir = w.x < 34 ? 1 : -1;
        }
      }
      const s = this.sprite("ward", isBroken);
      const stoop = isBroken ? 2 : w.paused ? Math.round(Math.abs(Math.sin(t * 2 + w.phase))) : -Math.round(Math.abs(Math.sin(t * 6 + w.phase)));
      const y = lane + (i % 2) * 5 - s.h + stoop;
      if (!isBroken && this.primed("ward")) fillDisc(ctx, w.x, y + 5, 5, rgba(PRIME_GLOW.ward, 0.15));
      ctx.drawImage(s.canvas, Math.round(w.x - s.w / 2), y);
    }
  }

  /** The Long Table at the front, candles going. Every generation adds a place at it. */
  private drawTables(t: number): void {
    const { working, broken } = this.counts("legion");
    const ctx = this.ctx;
    const seats = Math.min(10, Math.floor(Math.log2(Math.max(1, this.view.generation))));
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.legion[i]!;
      const s = this.sprite("legion", isBroken);
      const x = spot.x - (s.w >> 1);
      const y = spot.y - s.h;
      if (!isBroken) {
        const flicker = 0.14 + 0.05 * Math.sin(t * 9 + i * 2);
        fillDisc(ctx, spot.x, y + 3, this.primed("legion") ? 12 : 9, rgba(PRIME_GLOW.legion, flicker));
      }
      ctx.drawImage(s.canvas, x, y);
      if (isBroken) continue;
      // More heads down the far side, one for each doubling of the line.
      ctx.fillStyle = INK;
      for (let k = 0; k < seats; k++) {
        const hx = x + s.w + 1 + (k % 5) * 3;
        if (hx > SCENE_W - 2) break;
        ctx.fillRect(hx, y + 2 + Math.floor(k / 5) * 3, 2, 2);
      }
    }
  }

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

  /** Ash coming down, always, slowly, and blowing a little left. */
  private drawFlakes(): void {
    if (this.flakes.length < MAX_FLAKES && this.chance(6)) {
      this.flakes.push({ x: Math.random() * (SCENE_W + 20), y: -2, vx: -2 - Math.random() * 3, vy: 5 + Math.random() * 5 });
    }
    const ctx = this.ctx;
    ctx.fillStyle = rgba(FLAKE, 0.6);
    for (const f of this.flakes) {
      f.vy = Math.min(10, f.vy + 6 * this.dt);
      f.x += f.vx * this.dt;
      f.y += f.vy * this.dt;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    }
    this.flakes = this.flakes.filter((f) => f.y < this.sh && f.x > -4);
  }

  private drawDug(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    const pile = { x: 18, y: this.sh - 10 };
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      const lift = Math.round(Math.sin(Math.min(1, age * 3) * Math.PI * 0.5) * 6);
      const away = Math.max(0, (age - 0.35) / 0.65);
      const e = away * away;
      const x = Math.round(d.x + (pile.x - d.x) * e);
      const y = Math.round(d.y - lift + (pile.y - d.y) * e - Math.sin(away * Math.PI) * 10);
      ctx.globalAlpha = 1 - e * 0.6;
      ctx.drawImage(potato.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }
}
