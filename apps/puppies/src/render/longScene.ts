/**
 * What every world past the tunnel shares, so each scene is only its picture: the canvas and its
 * loop, a backdrop painted once per size and condition, how many of each rung show, the tap — and
 * the mill's grammar, so the places read as one game. Three bands: where you are at the top, the
 * things you bought doing something in the middle, and along the front a strip of ground with the
 * pack in it (spend and dogs trot off). Dog height, one scale: a person is about twelve pixels.
 */

import { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE } from "./art.js";
import { EMPTY_VIEW, SCENE_W, clamp, hashSeed, mulberry32, rgba, type MillView } from "./millScene.js";
import { Pack, packFor, type PackZone } from "./pack.js";
import { artCanvas, artTinted, type Sprite } from "./pixel.js";

/** How many of a rung to draw: the first few one for one, then one more silhouette per doubling. */
export function shownSome(owned: number, cap: number, spread = 1.6): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

/** Somebody going back and forth between two places. */
export interface Walker {
  x: number;
  dir: 1 | -1;
  /** Which way round they're going: out, or back. */
  out: boolean;
  wait: number;
}

export interface Spot {
  x: number;
  y: number;
}

const LEAP_MS = 900;
const BROKEN_TINT = "#3a3a4a";

export abstract class LongScene<Id extends solo.SoloProducerId> {
  protected ctx: CanvasRenderingContext2D;
  protected sh = 200;
  private t = 0;
  protected dt = 0;
  protected view: MillView = EMPTY_VIEW;
  /** Where each rung stands, filled by `layOut`. */
  protected spots = {} as Record<Id, Spot[]>;

  private ro?: ResizeObserver;
  private raf = 0;
  private lastFrame = performance.now();
  private sawView = false;
  private paper = document.createElement("canvas");
  private paintedFor = -1;
  private leaps: (Spot & { dir: 1 | -1; born: number })[] = [];
  /** This world's first rung: the pack is sized against what it costs. */
  protected abstract readonly first: Id;
  protected pack = new Pack();
  private packDrawn = false;

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
  /** Everything that moves. Call `drawPack` where the dogs belong in the order; if you don't, they go on top. */
  protected abstract scene(t: number): void;
  /** The strip the pack stands in, and where a new dog turns up. */
  protected abstract zone(): PackZone;

  /** Top of the strip at the front where the pack lives. */
  protected get stripTop(): number {
    return this.sh - Math.max(46, Math.round(this.sh * 0.27));
  }

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

  update(view: MillView): void {
    const wiped = !this.sawView || view.seed !== this.view.seed || view.generation !== this.view.generation;
    this.view = view;
    if (!wiped) return;
    this.sawView = true;
    this.leaps = [];
    this.pack.reset();
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

  whistle(at?: { x: number; y: number }): void {
    if (this.leaps.length > 12) return;
    this.leaps.push({
      x: at ? clamp(Math.round(at.x), 6, SCENE_W - 12) : Math.round(40 + Math.random() * 100),
      y: at ? clamp(Math.round(at.y), 12, this.sh - 2) : Math.round(this.sh * (0.6 + Math.random() * 0.3)),
      dir: Math.random() < 0.5 ? -1 : 1,
      born: performance.now(),
    });
    if (at) this.pack.call(at.x, this.t);
  }

  // --- For the scenes ---

  /** Every unit worth showing of a rung, working ones first. */
  protected each(id: Id, draw: (spot: Spot, i: number, broken: boolean, s: Sprite) => void): void {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownSome(w + b, this.spots[id]?.length ?? 0);
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

  /** Walk somebody between `from` and `to`, pausing at each end. Returns the bob to stand them at. */
  protected pace(w: Walker, from: number, to: number, speed: number, broken: boolean, t: number): number {
    if (broken) return 0;
    if (w.wait > 0) {
      w.wait -= this.dt;
      return 0;
    }
    const goal = w.out ? to : from;
    const dir = goal > w.x ? 1 : -1;
    w.dir = dir;
    w.x += dir * speed * this.dt;
    if ((dir === 1 && w.x >= goal) || (dir === -1 && w.x <= goal)) {
      w.x = goal;
      w.out = !w.out;
      w.wait = 0.8 + Math.random() * 2;
    }
    return Math.round(Math.abs(Math.sin(t * 8 + w.x)));
  }

  /** The pack, sorted by feet with anything else that stands in the strip. */
  protected drawPack(props: { y: number; go: () => void }[] = []): void {
    this.packDrawn = true;
    const queue = [...props, ...this.pack.queue(this.ctx)];
    queue.sort((a, b) => a.y - b.y);
    for (const item of queue) item.go();
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
    const cost = solo.SOLO_PRODUCER_BY_ID[this.first].baseCost;
    this.pack.step(this.dt, this.t, packFor(this.view.hoard, cost), this.zone());
    this.packDrawn = false;
    this.scene(this.t);
    if (!this.packDrawn) this.drawPack();
    this.drawTaps(now);
  }

  /** Whoever just got whistled up. */
  private drawTaps(now: number): void {
    const ctx = this.ctx;
    const pup = artCanvas(PUPPY_SPRITE);
    this.leaps = this.leaps.filter((l) => now - l.born < LEAP_MS);
    for (const l of this.leaps) {
      const age = (now - l.born) / LEAP_MS;
      ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      ctx.drawImage(pup.canvas, Math.round(l.x + l.dir * age * 18), Math.round(l.y - pup.h - Math.sin(Math.min(1, age * 1.4) * Math.PI) * 12));
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
