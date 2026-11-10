/**
 * The pack: the dogs you're holding, as a crowd, for every world past the mill. The mill's lot runs
 * its own (it has a chute, a handler and a game of fetch); everywhere else the same dogs with the
 * same habits stand in a strip at the front of the picture, come in at that world's way in, and
 * trot off when they're spent. It is the count on the HUD, drawn — which is why it's in every frame.
 */

import { PACK_COATS, PACK_POSES, POSE, ZZZ } from "./art.js";
import { PACK_STRIDE, SCENE_W, clamp, fract, pickAction, type PackPup } from "./millScene.js";
import { artCanvas } from "./pixel.js";

export interface PackZone {
  left: number;
  right: number;
  /** Feet no higher than this, no lower than `front`. */
  back: number;
  front: number;
  /** Where a new one turns up: the hole, the bank, the trees. */
  door: { x: number; y: number };
  /** Which edge the spent ones leave by. */
  out?: 1 | -1;
  /** 0..1: how much of the pack would rather be lying down. A night on the hill is mostly asleep. */
  calm?: number;
}

export const PACK_MOST = 30;
const INK = "#402e3a";
const WALK = [5, 11] as const;

/**
 * How many dogs for what you're holding, against what the world's first rung costs: fifteen when you
 * can just afford the bottom of the shop, the whole thirty at a couple of thousand times that. Never
 * fewer than a dozen while you hold anything, so no world is empty of dogs.
 */
export function packFor(hoard: number, cost: number): number {
  if (!(hoard > 0) || !(cost > 0)) return 0;
  return clamp(Math.round(15 + 4.5 * Math.log10(hoard / cost)), 12, PACK_MOST);
}

export class Pack {
  dogs: PackPup[] = [];
  private started = false;
  private owed = 0;
  private nextIn = 0;
  private clock = 0;

  reset(): void {
    this.dogs = [];
    this.started = false;
    this.owed = 0;
  }

  step(dt: number, t: number, want: number, z: PackZone): void {
    this.clock = t;
    const right = z.right - 11;
    if (!this.started) {
      this.started = true;
      for (let i = 0; i < want; i++) this.dogs.push(this.dog(t, z, true));
    }
    let here = this.owed;
    for (const d of this.dogs) if (!d.leaving) here++;
    if (here < want) {
      this.owed += want - here;
    } else if (here > want) {
      let over = here - want;
      const less = Math.min(over, this.owed);
      this.owed -= less;
      over -= less;
      for (const d of this.dogs) {
        if (over <= 0) break;
        if (d.leaving) continue;
        d.leaving = true;
        d.doing = "trot";
        d.vx = (z.out ?? 1) * (20 + Math.random() * 8);
        d.vy = 0;
        d.until = t + 60;
        over--;
      }
    }
    if (this.owed > 0 && t >= this.nextIn) {
      this.owed--;
      this.nextIn = t + 0.35 + Math.random() * 0.3;
      this.dogs.push(this.dog(t, z, false));
    }

    const kept: PackPup[] = [];
    for (const d of this.dogs) {
      if (t >= d.until && !d.fetching) {
        pickAction(d, t);
        if (z.calm && !d.leaving && (d.doing === "trot" || d.doing === "stand") && Math.random() < z.calm) {
          d.doing = Math.random() < 0.6 ? "sleep" : "rest";
          d.until = t + 20 + Math.random() * 40;
        }
      }
      d.fetching = false;
      if (d.doing === "trot" || d.doing === "zoom") {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.walked += Math.abs(d.vx) * dt;
        if (d.y < z.back) {
          d.y = z.back;
          d.vy = Math.abs(d.vy);
        } else if (d.y > z.front) {
          d.y = z.front;
          d.vy = -Math.abs(d.vy);
        }
        if (!d.leaving) {
          if (d.x < z.left) {
            d.x = z.left;
            d.vx = Math.abs(d.vx);
          } else if (d.x > right) {
            d.x = right;
            d.vx = -Math.abs(d.vx);
          }
        }
      }
      if (d.leaving && (d.x > SCENE_W + 2 || d.x < -14)) continue;
      kept.push(d);
    }
    this.dogs = kept;
  }

  /** Whoever's nearest comes running. */
  call(x: number, t: number): void {
    let best: PackPup | null = null;
    let near = Infinity;
    for (const d of this.dogs) {
      if (d.leaving) continue;
      const far = Math.abs(d.x - x);
      if (far > 12 && far < near) {
        near = far;
        best = d;
      }
    }
    if (!best) return;
    best.doing = "zoom";
    best.vx = Math.sign(x - best.x) * 52;
    best.vy = 0;
    best.until = t + Math.min(1.6, near / 52);
  }

  /** One entry per dog, to be sorted by `y` with whatever else stands in the strip. */
  queue(ctx: CanvasRenderingContext2D): { y: number; go: () => void }[] {
    return this.dogs.map((d) => ({ y: d.y, go: () => this.draw(ctx, d) }));
  }

  private dog(t: number, z: PackZone, scatter: boolean): PackPup {
    const right = z.right - 11;
    const d: PackPup = {
      x: scatter ? z.left + Math.random() * (right - z.left) : z.door.x,
      y: scatter ? z.back + Math.random() * Math.max(1, z.front - z.back) : clamp(z.door.y, z.back, z.front),
      home: z.left + Math.random() * (right - z.left),
      vx: 0,
      vy: 0,
      doing: "stand",
      until: 0,
      walked: Math.random() * 40,
      coat: Math.floor(Math.random() * PACK_COATS),
      leaving: false,
      fetching: false,
      born: t,
    };
    if (scatter) {
      pickAction(d, t);
      if (z.calm && Math.random() < z.calm) {
        d.doing = Math.random() < 0.6 ? "sleep" : "rest";
        d.until = t + Math.random() * 40;
      }
    } else {
      d.doing = "trot";
      d.vx = Math.sign(d.home - d.x || 1) * 1.6 * (WALK[0] + Math.random() * (WALK[1] - WALK[0]));
      d.vy = (Math.random() - 0.3) * 6;
      d.until = t + Math.min(6, Math.abs(d.home - d.x) / Math.abs(d.vx));
    }
    return d;
  }

  private draw(ctx: CanvasRenderingContext2D, d: PackPup): void {
    const step = Math.floor(d.walked / PACK_STRIDE) % 2;
    const pose =
      d.doing === "sit"
        ? POSE.sit + (Math.floor(this.clock * 1.5 + d.x) % 2)
        : d.doing === "rest"
          ? POSE.loaf
          : d.doing === "sleep"
            ? POSE.sleep
            : d.doing === "zoom"
              ? POSE.run + step
              : POSE.trot + step;
    const s = artCanvas(PACK_POSES[d.coat]![d.vx < 0 ? 1 : 0]![pose]!);
    const x = Math.round(d.x);
    const y = Math.round(d.y);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 1, y - 1, s.w - 2, 1);
    ctx.globalAlpha = 1;
    const bob =
      d.doing === "zoom"
        ? Math.round(Math.abs(Math.sin(d.walked / 7)) * 3)
        : d.doing === "sleep"
          ? Math.sin(this.clock * 0.9 + d.x) > 0.6
            ? 1
            : 0
          : d.doing === "trot" && step === 1
            ? 1
            : 0;
    ctx.drawImage(s.canvas, x, y - s.h - bob);
    if (d.doing === "sleep") {
      const z = artCanvas(ZZZ);
      const p = fract(this.clock / 3.2 + d.x * 0.11);
      if (p < 0.75) {
        const rise = p / 0.75;
        ctx.globalAlpha = 0.85 * (1 - rise * rise);
        ctx.drawImage(z.canvas, x + (d.vx < 0 ? -3 : 11), Math.round(y - s.h - 2 - rise * 7));
        ctx.globalAlpha = 1;
      }
    }
  }
}
