/**
 * The table (engine world `above`). A dark dining room, a long white cloth running away to the far end, a chair down
 * there and somebody sitting in it who has been sitting there the whole time. Place Settings go down
 * both sides, Candles along the middle, the Family Portraits hang on the wall and look at the food,
 * Waiters come in through the swing door, and in front of you, on one plate, is Dinner. The fork
 * comes down a little further the more of them there are, and it does not arrive.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";

type TableId = "flame" | "servant" | "lid" | "broth" | "heirs" | "seventh";

const WALL = "#2a1a24";
const WALL_STRIPE = "#3a2230";
const DADO = "#1a1018";
const FLOOR = "#120c10";
const CLOTH = "#f4ecdc";
const CLOTH_LOW = "#c8bca8";
const CLOTH_STAINED = "#b0a080";
const CLOTH_EDGE = "#8a8070";
const CHAIR = "#1a0e12";
const GUEST = "#0c080c";
const FORK = "#e8ecf4";
const FORK_LOW = "#8a8e9a";
const BULB = "#ffd890";
const CANDLE = "#ffb04a";
const DOOR = "#4a2e20";

export class TableScene extends LongScene<TableId> {
  private far = 70;
  private near = 300;
  private waiters: { k: number; dir: 1 | -1; pause: number }[] = [];
  private motes: Spot[] = [];

  /** How wide the table is at a depth, 0 at the far end to 1 at your end. */
  private half(k: number): number {
    return 18 + 58 * k;
  }

  private rowY(k: number): number {
    return Math.round(this.far + (this.near - this.far) * k);
  }

  protected layOut(r: () => number): void {
    const sh = this.sh;
    this.far = Math.round(sh * 0.34);
    this.near = Math.round(sh * 0.86);
    const crumb: Spot[] = [];
    for (const k of [0.74, 0.5, 0.32, 0.16, 0.62, 0.42]) {
      for (const side of [-1, 1]) crumb.push({ x: Math.round(88 + side * (this.half(k) - 11)), y: this.rowY(k) });
    }
    const mid = (k: number): Spot => ({ x: 88, y: this.rowY(k) });
    this.spots = {
      flame: crumb,
      servant: [0, 1, 2].map((i) => ({ x: 55 + i * 30, y: this.far - 1 })),
      lid: [mid(0.46), mid(0.3), mid(0.14)],
      broth: [{ x: 88 - 26, y: this.rowY(0.72) }, { x: 88 + 26, y: this.rowY(0.72) }],
      heirs: [{ x: 28, y: Math.round(sh * 0.2) }, { x: 148, y: Math.round(sh * 0.2) }, { x: 28, y: Math.round(sh * 0.08) + 14 }, { x: 148, y: Math.round(sh * 0.08) + 14 }],
      seventh: [mid(0.98)],
    };
    this.waiters = this.spots.servant.map((_, i) => ({ k: i * 0.3, dir: 1, pause: i * 3 }));
    this.motes = [];
    for (let i = 0; i < 16; i++) this.motes.push({ x: r() * SCENE_W, y: r() * this.far });
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, far, near } = this;
    const base = far - 6;
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, SCENE_W, base);
    ctx.fillStyle = WALL_STRIPE;
    for (let x = 0; x < SCENE_W; x += 12) ctx.fillRect(x, 0, 5, base);
    ctx.fillStyle = DADO;
    ctx.fillRect(0, base - 4, SCENE_W, 4);
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, base, SCENE_W, sh - base);
    // Boards running off toward the far wall.
    ctx.fillStyle = "#1e1418";
    for (let i = -6; i <= 6; i++) {
      for (let y = base; y < sh; y++) ctx.fillRect(Math.round(88 + i * 8 * (1 + ((y - base) / (sh - base)) * 3.4)), y, 1, 1);
    }
    // The swing door, left of the far end, with light round its edge.
    ctx.fillStyle = DOOR;
    ctx.fillRect(46, base - 38, 18, 38);
    ctx.fillStyle = rgba(BULB, 0.8);
    ctx.fillRect(45, base - 39, 20, 1);
    ctx.fillRect(45, base - 39, 1, 39);
    ctx.fillRect(64, base - 39, 1, 39);
    fillDisc(ctx, 55, base - 26, 3, "#ffe0a0");
    // The chair, and who's in it.
    ctx.fillStyle = CHAIR;
    ctx.fillRect(74, far - 42, 28, 50);
    ctx.fillRect(70, far - 46, 36, 6);
    ctx.fillStyle = GUEST;
    fillDisc(ctx, 88, far - 26, 7, GUEST);
    ctx.fillRect(78, far - 18, 20, 26);
    // The cloth: wide at your end, narrow at theirs, and it shows the wear.
    const stain = clamp((1 - condition) * 1.3, 0, 1);
    for (let y = far; y <= near; y++) {
      const k = (y - far) / (near - far);
      const left = Math.round(88 - this.half(k));
      ctx.fillStyle = mix(mix(CLOTH_LOW, CLOTH, k), CLOTH_STAINED, stain);
      ctx.fillRect(left, y, (88 - left) * 2, 1);
    }
    const left = Math.round(88 - this.half(1));
    const width = (88 - left) * 2;
    ctx.fillStyle = CLOTH_EDGE;
    ctx.fillRect(left, near + 1, width, sh - near - 1);
    ctx.fillStyle = CLOTH_LOW;
    for (let x = left; x < left + width; x += 7) ctx.fillRect(x, near + 3, 4, sh - near - 3);
    ctx.fillStyle = rgba(CLOTH_LOW, 0.5);
    for (let y = far + 2; y < near; y += 6) {
      const k = (y - far) / (near - far);
      ctx.fillRect(88, y, 1, 3);
      ctx.fillRect(Math.round(88 - this.half(k) * 0.42), y, 1, 2);
      ctx.fillRect(Math.round(88 + this.half(k) * 0.42), y, 1, 2);
    }
  }

  protected scene(t: number): void {
    this.drawDust(t);
    this.each("heirs", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawWaiters(t);
    this.each("flame", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawBoats(t);
    this.drawCandles(t);
    this.drawDinner(t);
  }

  private drawDust(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba(BULB, 0.25);
    for (const m of this.motes) ctx.fillRect(Math.round((m.x + Math.sin(t * 0.2 + m.y) * 6 + SCENE_W) % SCENE_W), Math.round(m.y + Math.sin(t * 0.3 + m.x)), 1, 1);
  }

  /** Out of the swing door, along the wall behind the table, and back. */
  private drawWaiters(t: number): void {
    this.each("servant", (spot, i, broken, s) => {
      const w = this.waiters[i]!;
      if (!broken) {
        w.pause -= this.dt;
        if (w.pause <= 0) {
          w.k += w.dir * 0.09 * this.dt;
          if (w.k > 1 || w.k < 0) {
            w.dir = w.k > 1 ? -1 : 1;
            w.k = clamp(w.k, 0, 1);
            w.pause = 1.5 + i;
          }
        }
      }
      const x = 55 + w.k * 100;
      const y = spot.y - Math.round(Math.abs(Math.sin(t * 5 + i)) * (broken ? 0 : 1));
      this.ctx.globalAlpha = w.k < 0.03 ? 0 : 1;
      this.stand(s, x, y);
      this.ctx.globalAlpha = 1;
    });
  }

  private drawBoats(t: number): void {
    this.each("broth", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && Math.sin(t * 0.8 + i * 2) > 0.2) {
        this.ctx.fillStyle = rgba("#f0f4f8", 0.4);
        this.ctx.fillRect(spot.x + 2, spot.y - s.h - 2 - Math.round((t * 3 + i) % 5), 1, 2);
      }
    });
  }

  private drawCandles(t: number): void {
    this.each("lid", (spot, i, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - s.h + 2, 10 + Math.sin(t * 8 + i), CANDLE, 0.12);
      this.stand(s, spot.x, spot.y);
    });
  }

  /** The plate, and the fork that has been coming down since you got here. */
  private drawDinner(t: number): void {
    const ctx = this.ctx;
    this.each("seventh", (spot, _, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 6, 18, "#fff4c0", 0.08);
      this.stand(s, spot.x, spot.y);
      const reach = clamp(Math.log2(this.owned("seventh") + 1) / 7, 0, 1);
      const tip = Math.round(spot.y - s.h - 28 + reach * 24 + Math.sin(t * 0.6) * 1.2);
      ctx.fillStyle = FORK;
      ctx.fillRect(spot.x - 6, tip - 8, 2, 8);
      ctx.fillRect(spot.x - 2, tip - 8, 2, 8);
      ctx.fillRect(spot.x + 2, tip - 8, 2, 8);
      ctx.fillRect(spot.x + 6, tip - 8, 2, 8);
      ctx.fillRect(spot.x - 6, tip - 12, 14, 4);
      ctx.fillRect(spot.x - 1, tip - 40, 4, 28);
      ctx.fillStyle = FORK_LOW;
      ctx.fillRect(spot.x + 2, tip - 40, 1, 28);
      ctx.fillRect(spot.x + 6, tip - 8, 1, 8);
    });
  }
}
