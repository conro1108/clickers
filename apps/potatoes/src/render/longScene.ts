/**
 * What the three worlds past the end share, so each of those scenes is only its picture: the canvas
 * and its loop, a backdrop painted once per size and condition, how many of each rung show, and
 * the dig. Same buffer conventions as `originScene.ts`.
 */

import type { solo } from "@clickers/sim";

import { POTATO_SPRITE, PRODUCER_MARKS } from "./art.js";
import { EMPTY_VIEW, SCENE_W, clamp, hashSeed, mulberry32, rgba, type FarmView } from "./farmScene.js";
import { shownCount } from "./insideScene.js";
import { artCanvas, artTinted, type Sprite } from "./pixel.js";

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
