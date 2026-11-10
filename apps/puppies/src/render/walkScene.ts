/**
 * Above: the long walk. Night on a hill, a path going back and forth up it and over the top, one
 * small light at the end. Good Posts stand along the way, Stiles cut it, a Stream crosses it, and
 * Paw Prints go up it, more for every generation. Night Walkers keep going, torches on, and near the
 * top somebody is carrying the Seventh Chihuahua. Every so often there's a whistle from up there.
 */

import type { PackZone } from "./pack.js";
import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";

type WalkId = "flame" | "servant" | "lid" | "broth" | "heirs" | "seventh";

const SKY_TOP = "#1a1c48";
const SKY_LOW = "#b0708a";
const MOON = "#f0ecd0";
const FAR_HILL = "#1e2a4e";
const HILL_HI = "#2e4a5a";
const HILL_LO = "#1a2a3a";
const HILL_BARE = "#3a3a44";
const PATH = "#8a8878";
const PATH_LOW = "#5a5a58";
const WALL = "#5a6070";
const LIGHT = "#ffd166";
const STAR = "#c8c8ff";
/** Where anything stands on the path: above this it runs out of pixels. */
const PATH_TOP = 0.68;

export class WalkScene extends LongScene<WalkId> {
  protected readonly first = "flame" as const;

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 6, front: this.sh - 3, door: { x: 2, y: this.stripTop + 10 } };
  }

  private path: Spot[] = [];
  private stars: Spot[] = [];
  private rims: number[] = [];
  private walkers: number[] = [];
  private notes: (Spot & { age: number })[] = [];
  private lamp: Spot = { x: 88, y: 40 };

  /** Where you are `u` of the way up the path, 0 at your feet. */
  private on(u: number): Spot {
    return this.path[clamp(Math.round(u * (this.path.length - 1)), 0, this.path.length - 1)]!;
  }

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const top = Math.round(sh * 0.26);
    this.lamp = { x: 92, y: top };
    // Three sweeps back and forth, closing up as they get further away.
    this.path = [];
    for (let i = 0; i <= 400; i++) {
      const u = i / 400;
      const reach = 76 * (1 - u) ** 1.2 + 4;
      this.path.push({ x: Math.round(92 + Math.sin(u * Math.PI * 4.6) * reach), y: Math.round(sh - 2 - (sh - 2 - top) * (1 - (1 - u) ** 1.7)) });
    }
    const up = (u: number, side: number): Spot => {
      const p = this.on(u);
      return { x: clamp(p.x + side, 8, SCENE_W - 8), y: p.y };
    };
    const stream = (u: number): Spot => ({ x: this.on(u).x, y: this.on(u).y + 3 });
    this.walkers = [0.06, 0.25, 0.42, 0.54, 0.64];
    this.spots = {
      flame: [up(0.1, 14), up(0.19, -14), up(0.31, 20), up(0.44, -20), up(0.51, 18)],
      servant: this.walkers.map((u) => this.on(u)),
      lid: [this.on(0.18), this.on(0.35), this.on(0.55)],
      broth: [stream(0.28), stream(0.51)],
      heirs: [this.on(0.06), this.on(0.23), this.on(0.39), this.on(0.44)],
      seventh: [up(PATH_TOP, 12)],
    };
    this.rims = [];
    for (let x = 0; x < SCENE_W; x++) this.rims.push(Math.round(top + 4 + Math.abs(x - 92) * 0.42 + 2.5 * Math.sin(x / 11) + Math.sin(x / 4.3)));
    this.stars = [];
    for (let i = 0; i < 50; i++) this.stars.push({ x: Math.floor(r() * SCENE_W), y: Math.floor(r() * top * 1.3) });
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, rims, path } = this;
    const low = this.lamp.y + 60;
    for (let y = 0; y < sh; y++) {
      ctx.fillStyle = mix(SKY_TOP, SKY_LOW, Math.min(1, y / low));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    for (const s of this.stars) {
      ctx.fillStyle = rgba(STAR, s.x % 3 === 0 ? 0.9 : 0.45);
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    fillDisc(ctx, 38, 34, 26, rgba(MOON, 0.08));
    fillDisc(ctx, 38, 34, 17, MOON);
    fillDisc(ctx, 33, 30, 3, "#d8d4b8");
    fillDisc(ctx, 44, 39, 2, "#d8d4b8");
    // A ridge further off, for the distance.
    ctx.fillStyle = FAR_HILL;
    for (let x = 0; x < SCENE_W; x++) {
      const y = Math.round(this.lamp.y + 24 + 6 * Math.sin(x / 23 + 2) + 3 * Math.sin(x / 9));
      ctx.fillRect(x, y, 1, sh - y);
    }
    const bare = clamp((1 - condition) * 1.2, 0, 1);
    for (let x = 0; x < SCENE_W; x++) {
      const top = rims[x]!;
      for (let y = top; y < sh; y += 2) {
        ctx.fillStyle = mix(mix(HILL_HI, HILL_LO, (y - top) / (sh - top)), HILL_BARE, bare);
        ctx.fillRect(x, y, 1, 2);
      }
    }
    // Field walls, following the hill round.
    ctx.fillStyle = rgba(WALL, 0.55);
    for (let band = 1; band < 5; band++) {
      const y0 = this.lamp.y + (sh - this.lamp.y) * (band / 5) ** 1.5;
      for (let x = 0; x < SCENE_W; x += 2) ctx.fillRect(x, Math.round(y0 + Math.sin(x / 19 + band) * 4 + Math.abs(x - 92) * 0.12), 1, 1);
    }
    // The path: broad near you, a thread by the top.
    for (let i = 0; i < path.length; i++) {
      const p = path[i]!;
      const u = i / path.length;
      const w = Math.max(1, Math.round(9 * (1 - u) ** 2));
      ctx.fillStyle = PATH_LOW;
      ctx.fillRect(p.x - w, p.y, w * 2 + 1, 2);
      ctx.fillStyle = PATH;
      ctx.fillRect(p.x - w + 1, p.y, Math.max(1, w * 2 - 1), 1);
    }
    // The house, that far up: a roof, and one lit window.
    const { x, y } = this.lamp;
    ctx.fillStyle = "#0e1020";
    ctx.fillRect(x - 9, y - 9, 18, 11);
    for (let i = 0; i < 9; i++) ctx.fillRect(x - 11 + i, y - 9 - i, 22 - i * 2, 1);
    ctx.fillRect(x + 4, y - 20, 2, 6);
    ctx.fillStyle = LIGHT;
    ctx.fillRect(x - 6, y - 6, 3, 3);
    ctx.fillRect(x + 2, y - 5, 3, 5);
  }

  protected scene(t: number): void {
    this.drawLight(t);
    this.each("broth", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken || Math.sin(t * 3 + i) < 0.4) return;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(spot.x - 7 + ((t * 8) | 0) % 14, spot.y - 3, 2, 1);
    });
    this.drawPrints();
    this.each("lid", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("flame", (spot, i, broken, s) => {
      if (!broken && this.primed("flame")) this.glow(spot.x, spot.y - s.h + 3, 6, LIGHT, 0.15 + 0.05 * Math.sin(t + i));
      this.stand(s, spot.x, spot.y);
    });
    this.drawWalkers(t);
    this.each("seventh", (spot, _, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 6, 11, LIGHT, 0.09);
      this.stand(s, spot.x, spot.y);
    });
    this.drawNotes();
  }

  /** The window breathes a little. Now and then a whistle comes down from it. */
  private drawLight(t: number): void {
    const { x, y } = this.lamp;
    this.glow(x, y - 2, 7 + Math.sin(t * 0.8), LIGHT, 0.14);
    if (this.chance(0.12) && this.notes.length < 6) this.notes.push({ x: x + 3, y: y - 4, age: 0 });
  }

  private drawPrints(): void {
    const ctx = this.ctx;
    this.each("heirs", (spot, i, _, s) => this.stand(s, spot.x + (i % 2 ? 3 : -3), spot.y + 2));
    if (this.owned("heirs") === 0) return;
    const pairs = clamp(Math.floor(Math.log2(this.view.generation)) * 6, 0, 45);
    ctx.fillStyle = "#d8d0c8";
    for (let k = 0; k < pairs; k++) {
      const p = this.on(0.03 + k * 0.014);
      ctx.fillRect(p.x + (k % 2 ? 1 : -2), p.y, 1, 1);
    }
  }

  private drawWalkers(t: number): void {
    this.each("servant", (_, i, broken, s) => {
      if (!broken) this.walkers[i] = this.walkers[i]! + 0.014 * this.dt;
      if (this.walkers[i]! > PATH_TOP) this.walkers[i] = 0.02;
      const u = this.walkers[i]!;
      const p = this.on(u);
      this.ctx.globalAlpha = clamp(Math.min(u - 0.02, PATH_TOP - u) / 0.04, 0, 1);
      if (!broken) this.glow(p.x + 6, p.y - 5, 3 + 4 * (1 - u), "#ffe8a0", 0.1);
      this.stand(s, p.x, p.y - (broken ? 0 : Math.round(Math.abs(Math.sin(t * 4 + i)))));
      this.ctx.globalAlpha = 1;
    });
  }

  private drawNotes(): void {
    const ctx = this.ctx;
    for (const n of this.notes) {
      n.age += this.dt / 3;
      ctx.fillStyle = rgba(LIGHT, Math.max(0, 0.7 - n.age * 0.7));
      ctx.fillRect(Math.round(n.x + n.age * 14), Math.round(n.y - 8 * n.age + Math.sin(n.age * 18) * 2), 1, 2);
    }
    this.notes = this.notes.filter((n) => n.age < 1);
  }
}
