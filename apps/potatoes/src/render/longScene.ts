/**
 * What every world past the farm shares, so each scene is only its picture: the canvas and its
 * loop, a backdrop painted once per size and condition, how many of each rung show, the dig — and
 * the farm's grammar, so nine places read as one game. Side-on, a floor you can see, a pile at the
 * front left that is your potatoes (spend and it shrinks), and people carrying things to it.
 */

import { solo } from "@clickers/sim";

import { POTATO_SPRITE, PRODUCER_MARKS } from "./art.js";
import { EMPTY_VIEW, SCENE_W, clamp, hashSeed, mulberry32, rgba, type FarmView } from "./farmScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

/** How many of a tier to draw. Log: first few one-for-one, then a doubling per extra silhouette. */
export function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

/** Somebody going back and forth between where the work is and the pile. */
export interface Carrier {
  x: number;
  dir: 1 | -1;
  loaded: boolean;
  wait: number;
}

/** Pile slots: six courses off a six-wide base, filled bottom-up but starting each course early. */
const PILE_BASE = 6;
const PILE_SLOTS: { course: number; i: number }[] = (() => {
  const slots: { course: number; i: number; rank: number }[] = [];
  for (let course = 0; course < PILE_BASE; course++) {
    const n = PILE_BASE - course;
    for (let i = 0; i < n; i++) slots.push({ course, i, rank: course * 1.1 + Math.abs(i - (n - 1) / 2) * 0.7 });
  }
  return slots.sort((a, b) => a.rank - b.rank);
})();

export interface Spot {
  x: number;
  y: number;
}

const DUG_MS = 1100;
const BROKEN_TINT = "#2e2a30";

export abstract class LongScene<Id extends solo.SoloProducerId> {
  protected ctx: CanvasRenderingContext2D;
  protected sh = 200;
  private t = 0;
  protected dt = 0;
  protected view: FarmView = EMPTY_VIEW;
  /** Where each rung stands, filled by `layOut`. */
  protected spots = {} as Record<Id, Spot[]>;

  private ro?: ResizeObserver;
  private raf = 0;
  private lastFrame = performance.now();
  private sawView = false;
  private paper = document.createElement("canvas");
  private paintedFor = -1;
  private dug: (Spot & { born: number })[] = [];
  private pileShown = -1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  /** Decide where everything stands, once per size and seed. */
  protected abstract layOut(random: () => number): void;
  /** Everything that holds still. Repainted only when the size or the condition moves. */
  protected abstract backdrop(ctx: CanvasRenderingContext2D, condition: number): void;
  /** Everything that moves. */
  protected abstract scene(t: number): void;

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? rect.height / rect.width : 1.1;
    const sh = Math.max(90, Math.min(340, Math.round(SCENE_W * ratio)));
    if (sh === this.sh && this.paintedFor >= 0) return;
    this.sh = sh;
    this.canvas.width = this.paper.width = SCENE_W;
    this.canvas.height = this.paper.height = sh;
    this.ctx.imageSmoothingEnabled = false;
    this.place();
  }

  private place(): void {
    this.layOut(mulberry32(hashSeed(this.view.seed + ":long")));
    this.paintedFor = -1;
  }

  update(view: FarmView): void {
    const wiped = !this.sawView || view.seed !== this.view.seed || view.generation !== this.view.generation;
    this.view = view;
    if (!wiped) return;
    this.sawView = true;
    this.dug = [];
    this.resize();
    this.place();
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

  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 12) return;
    this.dug.push({
      x: at ? clamp(Math.round(at.x), 3, SCENE_W - 8) : Math.round(40 + Math.random() * 100),
      y: at ? clamp(Math.round(at.y), 8, this.sh - 6) : Math.round(this.sh * (0.5 + Math.random() * 0.35)),
      born: performance.now(),
    });
  }

  // --- For the scenes ---

  /** Every unit worth showing of a rung, working ones first. */
  protected each(id: Id, draw: (spot: Spot, i: number, broken: boolean, s: Sprite) => void): void {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, this.spots[id]?.length ?? 0);
    // A lone hero doesn't go dark over one broken in a hundred.
    const dead = b > 0 ? clamp(Math.round((total * b) / (w + b)), total > 1 ? 1 : 0, total) : 0;
    const marks = PRODUCER_MARKS[id as keyof typeof PRODUCER_MARKS];
    const art = marks[clamp(this.view.marks[id] ?? 0, 0, marks.length - 1)]!;
    for (let i = 0; i < total; i++) {
      const broken = i >= total - dead;
      draw(this.spots[id][i]!, i, broken, broken ? artTinted(art, BROKEN_TINT, 0.65) : artCanvas(art));
    }
  }

  /** How many a rung has, for things that scale with the fleet rather than the units shown. */
  protected owned(id: Id): number {
    return (this.view.working[id] ?? 0) + (this.view.broken[id] ?? 0);
  }

  protected primed(id: Id): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Bottom-centre on the spot, on whole pixels. */
  protected stand(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1));
  }

  protected glow(x: number, y: number, r: number, color: string, alpha: number): void {
    fillDisc(this.ctx, x, y, r, rgba(color, alpha));
  }

  protected chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  /** Bottom-centre on the spot, mirrored: for anything with a front that has to face where it's going. */
  protected standFlipped(s: Sprite, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(x + s.w / 2), Math.round(y - s.h + 1));
    ctx.scale(-1, 1);
    ctx.drawImage(s.canvas, 0, 0);
    ctx.restore();
  }

  /**
   * The pile at the front left: the potatoes you're holding, in this world's packaging. Logarithmic
   * against what the world's first rung costs, so it means the same thing in every world — a couple of
   * items when you can afford the bottom of the shop, a mound when you're sitting on a thousand times
   * that — and it chases the real figure, so a big purchase visibly drains it. Runs off the left edge,
   * like the farm's heap: something to recognise, not count.
   */
  protected drawPile(item: Art, x0: number, foot: number, scale: solo.SoloProducerId): void {
    const cost = solo.SOLO_PRODUCER_BY_ID[scale].baseCost;
    const hoard = Math.max(0, this.view.hoard);
    const target = hoard <= 0 ? 0 : clamp(2 + 3 * Math.log10(hoard / cost), 0, PILE_SLOTS.length);
    this.pileShown = this.pileShown < 0 ? target : this.pileShown + (target - this.pileShown) * (1 - Math.exp(-this.dt * 3));
    const n = Math.floor(this.pileShown);
    if (n <= 0) return;
    const s = artCanvas(item);
    const stepX = s.w - 2;
    const stepY = s.h - 3;
    const shown = PILE_SLOTS.slice(0, n).sort((a, b) => a.course - b.course || a.i - b.i);
    for (const slot of shown) {
      const x = x0 + slot.i * stepX + (slot.course * stepX) / 2;
      this.stand(s, x, foot - slot.course * stepY);
    }
  }

  /**
   * Walk a carrier between the work at `from` and the pile at `to`, loading at one end and dropping
   * at the other. Returns the bob to stand them at. Broken carriers stand where they are.
   */
  protected carry(c: Carrier, from: number, to: number, speed: number, broken: boolean, t: number): number {
    if (broken) return 0;
    if (c.wait > 0) {
      c.wait -= this.dt;
      return 0;
    }
    const goal = c.loaded ? to : from;
    const dir = goal > c.x ? 1 : -1;
    c.dir = dir;
    c.x += dir * speed * this.dt;
    if ((dir === 1 && c.x >= goal) || (dir === -1 && c.x <= goal)) {
      c.x = goal;
      c.loaded = !c.loaded;
      c.wait = 0.5 + Math.random() * 1.2;
    }
    return Math.round(Math.abs(Math.sin(t * 8 + c.x)));
  }

  // --- The frame ---

  private draw(): void {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.t += this.dt;
    const ctx = this.ctx;
    const condition = Math.round(clamp(this.view.condition, 0, 1) * 50) / 50;
    if (condition !== this.paintedFor) {
      this.paintedFor = condition;
      this.backdrop(this.paper.getContext("2d")!, condition);
    }
    ctx.drawImage(this.paper, 0, 0);
    this.scene(this.t);
    this.drawTaps(now);
  }

  /** A potato up out of the ground and gone. */
  private drawTaps(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      ctx.globalAlpha = 1 - age * age;
      ctx.drawImage(potato.canvas, d.x, Math.round(d.y - Math.sin(Math.min(1, age * 2) * Math.PI * 0.5) * 10));
      ctx.globalAlpha = 1;
    }
  }
}

export function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}
