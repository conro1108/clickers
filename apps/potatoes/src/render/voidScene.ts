/**
 * Void: before the first field. No sky yet, only the dark, and under it a plain of dark furrows
 * that something is already sowing. The Sowers walk the rows throwing light upward; it hangs there
 * as Star Eyes. Seed Clouds drift over, Ancestor Stars burn hotter for every generation, and in the
 * middle of it the Fifth Potato floats, not yet sure of its own edges.
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

type VoidId = Extract<solo.SoloProducerId, "mote" | "wisp" | "veil" | "nebula" | "aeon" | "fifth">;

const CAP: Record<VoidId, number> = {
  mote: 14,
  wisp: 5,
  veil: 3,
  nebula: 3,
  aeon: 4,
  fifth: 3,
};

const PRIME_GLOW: Record<VoidId, string> = {
  mote: "#fff4c0",
  wisp: "#ffd166",
  veil: "#c8a0e8",
  nebula: "#f0b0d0",
  aeon: "#ffd166",
  fifth: "#e8e0ff",
};

const SPACE_TOP = "#05040c";
const SPACE_MID = "#140e2a";
const SPACE_LOW = "#2a1e4a";
const BAND = "#3a2e60";
const PLAIN_HI = "#1e1830";
const PLAIN_LO = "#0c0a14";
const FURROW = "#2e2648";
const FURROW_LIT = "#4a3e70";
const STAR = "#e8e0ff";
const SEED_LIGHT = "#fff4c0";
const BROKEN_TINT = "#3a3848";
const COLD = "#0a0818";

const STARS = 70;
const FURROWS = 7;
const DUG_MS = 1200;
const MAX_THROWN = 16;
const MAX_DUST = 30;

interface Spot {
  x: number;
  y: number;
}

/** A thrown light: up out of a Sower's hand in an arc, and it hangs where it stops. */
interface Thrown {
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
  throwing: boolean;
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

/** Where the dark ends and the plain begins. Low, because the dark is most of what there is. */
export function plainFor(sh: number): number {
  return Math.round(sh * 0.66);
}

export class VoidScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private hz = 132;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: FarmView = EMPTY_VIEW;
  private sawView = false;

  private spaceRows: string[] = [];
  private plainRows: string[] = [];
  private stars: { x: number; y: number; phase: number; big: boolean }[] = [];
  private spots: Record<VoidId, Spot[]> = {} as Record<VoidId, Spot[]>;

  private walkers: Walker[] = [];
  private thrown: Thrown[] = [];
  private dust: { x: number; y: number; vy: number }[] = [];
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
    const resized = sh !== this.sh || this.spaceRows.length === 0;
    this.sh = sh;
    this.canvas.width = SCENE_W;
    this.canvas.height = sh;
    this.ctx.imageSmoothingEnabled = false;
    if (!resized) return;
    this.hz = plainFor(sh);
    this.spaceRows = [];
    for (let y = 0; y < this.hz; y++) {
      const k = y / Math.max(1, this.hz - 1);
      this.spaceRows.push(k < 0.6 ? mix(SPACE_TOP, SPACE_MID, k / 0.6) : mix(SPACE_MID, SPACE_LOW, (k - 0.6) / 0.4));
    }
    this.plainRows = [];
    for (let y = this.hz; y < sh; y++) {
      this.plainRows.push(mix(PLAIN_HI, PLAIN_LO, (y - this.hz) / Math.max(1, sh - this.hz)));
    }
    const r = mulberry32(11);
    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      this.stars.push({
        x: Math.floor(r() * SCENE_W),
        y: Math.floor(r() * (this.hz - 4)),
        phase: r() * 6,
        big: r() < 0.08,
      });
    }
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
      this.thrown = [];
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

  /** A dig: a potato of light comes up out of the furrow where you tapped and goes on the pile. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 12) return;
    const x = at ? clamp(Math.round(at.x), 3, SCENE_W - 8) : Math.round(40 + Math.random() * 100);
    const y = at
      ? clamp(Math.round(at.y), this.hz + 2, this.sh - 6)
      : Math.round(this.hz + (this.sh - this.hz) * (0.3 + Math.random() * 0.5));
    this.dug.push({ x, y, born: performance.now() });
  }

  // --- Where things are ---

  private layOut(): void {
    const r = mulberry32(hashSeed(this.view.seed + ":void"));
    const sky = this.hz;
    const scatter = (n: number, x0: number, x1: number, y0: number, y1: number): Spot[] => {
      const out: Spot[] = [];
      const step = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        out.push({
          x: Math.round(x0 + step * (i + 0.5) + (r() - 0.5) * step * 0.8),
          y: Math.round(sky * (y0 + r() * (y1 - y0))),
        });
      }
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    };
    this.spots = {
      mote: scatter(CAP.mote, 6, SCENE_W - 6, 0.12, 0.8),
      wisp: [],
      veil: [
        { x: 0, y: Math.round(sky * 0.08) },
        { x: 0, y: Math.round(sky * 0.2) },
        { x: 0, y: Math.round(sky * 0.32) },
      ],
      nebula: [
        { x: 36, y: Math.round(sky * 0.3) },
        { x: 140, y: Math.round(sky * 0.22) },
        { x: 92, y: Math.round(sky * 0.12) },
      ],
      aeon: scatter(CAP.aeon, 14, SCENE_W - 14, 0.08, 0.45),
      fifth: [
        { x: 88, y: Math.round(sky * 0.62) },
        { x: 50, y: Math.round(sky * 0.7) },
        { x: 128, y: Math.round(sky * 0.7) },
      ],
    };
  }

  private art(id: VoidId): Art {
    const marks = PRODUCER_MARKS[id];
    return marks[clamp(this.view.marks[id] ?? 0, 0, marks.length - 1)] ?? marks[0];
  }

  private primed(id: VoidId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  private counts(id: VoidId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total === 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? clamp(Math.round((total * b) / (w + b)), 1, total) : 0;
    return { working: total - broken, broken };
  }

  private sprite(id: VoidId, broken: boolean): Sprite {
    return broken ? artTinted(this.art(id), BROKEN_TINT, 0.7) : artCanvas(this.art(id));
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

    this.drawSpace(t);
    this.drawNebulae(t);
    this.drawVeils(t);
    this.drawAeons(t);
    this.drawMotes(t);
    this.drawFifth(t);
    this.drawPlain(t);
    this.drawSowers(t);
    this.drawThrown();
    this.drawDust();
    this.drawHoard();
    this.drawDug(now);
    this.drawCold();
  }

  /** The dark, and a faint band across it where there will one day be a galaxy. */
  private drawSpace(t: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.spaceRows.length; y++) {
      ctx.fillStyle = this.spaceRows[y]!;
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba(BAND, 0.5);
    for (let x = 0; x < SCENE_W; x += 2) {
      const y = Math.round(this.hz * 0.5 - x * 0.25 + Math.sin(x / 13) * 3);
      if (y > 0 && y < this.hz) ctx.fillRect(x, y, 2, 3);
    }
    for (const s of this.stars) {
      const on = Math.sin(t * 0.9 + s.phase);
      if (on < -0.3) continue;
      ctx.fillStyle = on > 0.7 ? STAR : rgba(STAR, 0.5);
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big && on > 0.8) {
        ctx.fillRect(s.x - 1, s.y, 3, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 3);
      }
    }
  }

  /** Seed Clouds: soft heaps of colour, only as bright as the dark is kept. They let seed fall. */
  private drawNebulae(t: number): void {
    const { working, broken } = this.counts("nebula");
    const ctx = this.ctx;
    const keep = clamp(this.view.condition, 0, 1);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.nebula[i]!;
      const drift = Math.round(Math.sin(t * 0.1 + i * 2) * 3);
      const cx = spot.x + drift;
      const a = isBroken ? 0.06 : 0.1 + 0.12 * keep * keep;
      const hue = isBroken ? "#4a4458" : i % 2 === 0 ? "#9a6ad0" : "#d06aa0";
      fillDisc(ctx, cx, spot.y, 20, rgba(hue, a * 0.6));
      fillDisc(ctx, cx - 7, spot.y + 2, 13, rgba(hue, a));
      fillDisc(ctx, cx + 8, spot.y - 1, 11, rgba(hue, a));
      if (this.primed("nebula") && !isBroken) fillDisc(ctx, cx, spot.y, 9, rgba(PRIME_GLOW.nebula, 0.18));
      const s = this.sprite("nebula", isBroken);
      ctx.drawImage(s.canvas, cx - (s.w >> 1), spot.y - (s.h >> 1));
      if (!isBroken && this.dust.length < MAX_DUST && this.chance(0.6 * keep)) {
        this.dust.push({ x: cx + Math.round((Math.random() - 0.5) * 20), y: spot.y + 6, vy: 4 + Math.random() * 4 });
      }
    }
  }

  /** Night Cloths, hung across the dark from rods off the left edge, rippling. */
  private drawVeils(t: number): void {
    const { working, broken } = this.counts("veil");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const y0 = this.spots.veil[i]!.y;
      const cloth = isBroken ? rgba("#3a3848", 0.25) : rgba(i % 2 ? "#3a2a70" : "#2a2060", 0.45);
      ctx.fillStyle = cloth;
      for (let x = 0; x < SCENE_W; x += 2) {
        // A torn cloth is only there in strips.
        if (isBroken && (x + i * 7) % 18 < 7) continue;
        const wave = Math.round(Math.sin(x / 15 + t * 0.6 + i) * 2);
        ctx.fillRect(x, y0 + wave, 2, 4);
      }
      if (!isBroken) {
        ctx.fillStyle = this.primed("veil") ? PRIME_GLOW.veil : STAR;
        for (let x = (i * 11) % 23; x < SCENE_W; x += 23) {
          ctx.fillRect(x, y0 + 1 + Math.round(Math.sin(x / 15 + t * 0.6 + i) * 2), 1, 1);
        }
      }
      const s = this.sprite("veil", isBroken);
      ctx.drawImage(s.canvas, 1, y0 - 1);
    }
  }

  /** Ancestor Stars, burning hotter the more farms have been handed down. */
  private drawAeons(t: number): void {
    const { working, broken } = this.counts("aeon");
    const ctx = this.ctx;
    const heat = Math.min(8, Math.log2(Math.max(1, this.view.generation)));
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.aeon[i]!;
      if (!isBroken) {
        const pulse = 0.12 + 0.05 * Math.sin(t * 1.3 + i * 1.7);
        fillDisc(ctx, spot.x, spot.y, 5 + heat, rgba(PRIME_GLOW.aeon, pulse));
        if (this.primed("aeon")) fillDisc(ctx, spot.x, spot.y, 8 + heat, rgba(PRIME_GLOW.aeon, 0.08));
      }
      const s = this.sprite("aeon", isBroken);
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1), spot.y - (s.h >> 1));
    }
  }

  /** Star Eyes, hanging where they were thrown. Now and then one blinks. */
  private drawMotes(t: number): void {
    const { working, broken } = this.counts("mote");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.mote[i]!;
      const s = this.sprite("mote", isBroken);
      const bob = isBroken ? 0 : Math.round(Math.sin(t * 0.8 + i * 1.9) * 0.6);
      const x = spot.x - (s.w >> 1);
      const y = spot.y - (s.h >> 1) + bob;
      if (!isBroken && this.primed("mote")) fillDisc(ctx, spot.x, spot.y + bob, 5, rgba(PRIME_GLOW.mote, 0.18));
      ctx.drawImage(s.canvas, x, y);
      // A blink: the lid comes down over the middle for a beat.
      if (!isBroken && Math.sin(t * 0.37 + i * 2.3) > 0.985) {
        ctx.fillStyle = "#2a2050";
        ctx.fillRect(spot.x - 1, spot.y + bob - (s.h >> 1) + (s.h >> 1), 3, 1);
      }
    }
  }

  /** The Fifth Potato, floating over the plain. Its outline won't sit still until it's decided. */
  private drawFifth(t: number): void {
    const { working, broken } = this.counts("fifth");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.fifth[i]!;
      const s = this.sprite("fifth", isBroken);
      const bob = isBroken ? 0 : Math.round(Math.sin(t * 0.5 + i) * 2);
      const decided = this.primed("fifth");
      const jitter = isBroken || decided ? 0 : Math.sin(t * 7 + i * 3) > 0.7 ? 1 : 0;
      const cx = spot.x + jitter;
      const cy = spot.y + bob;
      if (!isBroken) {
        fillDisc(ctx, cx, cy, i === 0 ? 16 : 11, rgba(PRIME_GLOW.fifth, decided ? 0.2 : 0.12));
        fillDisc(ctx, cx, cy, i === 0 ? 10 : 7, rgba(PRIME_GLOW.fifth, 0.1));
      }
      ctx.drawImage(s.canvas, cx - (s.w >> 1), cy - (s.h >> 1));
      // Its shadow on the plain, which is how you know it's above it and not painted on the dark.
      ctx.fillStyle = rgba("#000000", 0.35);
      ctx.fillRect(cx - 4, this.hz + 3 + i * 2, 9, 1);
    }
  }

  /** The plain: furrows running away to the edge of the dark, lit faintly where the seed has landed. */
  private drawPlain(t: number): void {
    const ctx = this.ctx;
    for (let i = 0; i < this.plainRows.length; i++) {
      ctx.fillStyle = this.plainRows[i]!;
      ctx.fillRect(0, this.hz + i, SCENE_W, 1);
    }
    ctx.fillStyle = FURROW_LIT;
    ctx.fillRect(0, this.hz, SCENE_W, 1);
    const sown = territory(this.view.working.wisp ?? 0, 0, 1);
    const deep = this.sh - this.hz;
    for (let f = 0; f < FURROWS; f++) {
      // Rows converge on a point on the horizon, like any field seen from its end.
      const footX = (SCENE_W * (f + 0.5)) / FURROWS;
      const vx = SCENE_W / 2;
      for (let y = 1; y < deep; y++) {
        const k = y / deep;
        const x = Math.round(vx + (footX - vx) * k);
        const lit = sown > 0 && Math.abs(((t * 12 + f * 17) % (deep + 20)) - y) < 2;
        ctx.fillStyle = lit ? rgba(SEED_LIGHT, 0.5 * sown + 0.2) : FURROW;
        ctx.fillRect(x, this.hz + y, 1, 1);
      }
    }
  }

  /** Sowers, walking the plain and throwing light upward. Broken ones have sat down. */
  private drawSowers(t: number): void {
    const { working, broken } = this.counts("wisp");
    const n = working + broken;
    while (this.walkers.length < n) {
      const i = this.walkers.length;
      this.walkers.push({
        x: 20 + ((i * 53) % 136),
        dir: Math.random() < 0.5 ? 1 : -1,
        until: t + 1 + Math.random() * 2,
        throwing: false,
        phase: Math.random() * 6,
      });
    }
    this.walkers.length = n;
    const ctx = this.ctx;
    const lane = this.hz + Math.round((this.sh - this.hz) * 0.42);
    for (let i = 0; i < n; i++) {
      const w = this.walkers[i]!;
      const isBroken = i >= working;
      if (!isBroken) {
        if (t >= w.until) {
          w.throwing = !w.throwing;
          w.until = t + (w.throwing ? 0.6 : 2 + Math.random() * 3);
          if (w.throwing && this.thrown.length < MAX_THROWN) {
            this.thrown.push({ x: w.x, y: lane - 10, vx: (Math.random() - 0.5) * 12, vy: -38 - Math.random() * 18, age: 0 });
          }
        }
        if (!w.throwing) {
          w.x += w.dir * 5 * this.dt;
          if (w.x < 10 || w.x > SCENE_W - 10) w.dir = w.x < 10 ? 1 : -1;
        }
      }
      const s = this.sprite("wisp", isBroken);
      const bob = isBroken || w.throwing ? 0 : Math.round(Math.abs(Math.sin(t * 7 + w.phase)));
      const y = lane + (i % 2) * 6 - s.h - bob + (isBroken ? 2 : 0);
      if (!isBroken && this.primed("wisp")) fillDisc(ctx, w.x, y + 4, 5, rgba(PRIME_GLOW.wisp, 0.15));
      ctx.drawImage(s.canvas, Math.round(w.x - s.w / 2), y);
    }
  }

  /** Thrown light: up, slowing, and gone into the dark where it stops. */
  private drawThrown(): void {
    const ctx = this.ctx;
    for (const p of this.thrown) {
      p.age += this.dt;
      p.vy += 22 * this.dt;
      p.x += p.vx * this.dt;
      p.y += p.vy * this.dt;
      const fading = p.vy > 0;
      ctx.fillStyle = fading ? rgba(SEED_LIGHT, Math.max(0, 1 - p.age / 3)) : SEED_LIGHT;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      if (!fading) ctx.fillRect(Math.round(p.x), Math.round(p.y) + 1, 1, 1);
    }
    this.thrown = this.thrown.filter((p) => p.age < 3 && p.y > 0);
  }

  /** Seed falling out of the clouds, settling into the furrows. */
  private drawDust(): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba("#e0b070", 0.7);
    for (const d of this.dust) {
      d.y += d.vy * this.dt;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
    }
    this.dust = this.dust.filter((d) => d.y < this.hz + 4);
  }

  /** The pile, front left: the same heap the farm keeps, which out here is mostly light. */
  private drawHoard(): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const heap = Math.min(HEAP_CAP, Math.max(0, Math.round(yardLayout(this.shown).heap)));
    const potato = artCanvas(POTATO_SPRITE);
    const slots = heapSlots();
    const foot = this.sh - 1;
    if (heap > 0) fillDisc(this.ctx, 22, foot - 4, 14, rgba(SEED_LIGHT, 0.06));
    for (let i = 0; i < heap; i++) {
      const slot = slots[i];
      if (!slot) break;
      this.ctx.drawImage(potato.canvas, slot.x + 4, foot + slot.y);
    }
  }

  private drawDug(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    const pile = { x: 18, y: this.sh - 10 };
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      const lift = Math.round(Math.sin(Math.min(1, age * 3) * Math.PI * 0.5) * 7);
      const away = Math.max(0, (age - 0.35) / 0.65);
      const e = away * away;
      const x = Math.round(d.x + (pile.x - d.x) * e);
      const y = Math.round(d.y - lift + (pile.y - d.y) * e - Math.sin(away * Math.PI) * 10);
      fillDisc(ctx, x + 3, y + 2, 4, rgba(SEED_LIGHT, 0.25 * (1 - e)));
      ctx.globalAlpha = 1 - e * 0.6;
      ctx.drawImage(potato.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }

  /** A dark that's been let go gets colder, and the picture goes with it. */
  private drawCold(): void {
    const k = clamp((1 - this.view.condition) / 0.75, 0, 1) * 0.4;
    if (k <= 0.001) return;
    this.ctx.fillStyle = rgba(COLD, k);
    this.ctx.fillRect(0, 0, SCENE_W, this.sh);
  }
}
