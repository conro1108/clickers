/**
 * Above: the kitchen, from counter height and a long way down. Tiled wall, a night window, a rack
 * of pots, steel running the width of it. Gas Rings burn along the range with Stockpots on them,
 * Pot Lids hang rattling, Recipe Books fill the shelf with a spine for each generation, Scullions
 * go back and forth along the floor with the peelings, and the Seventh Potato waits on the board.
 * Every so often the knife comes down, and the whole room is its shadow for a moment.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";

type KitchenId = "flame" | "servant" | "lid" | "broth" | "heirs" | "seventh";

const TILE = "#b8c0b0";
const TILE_DIM = "#8a9288";
const TILE_DIRTY = "#7a7460";
const GROUT = "#6a7068";
const STEEL = "#8a92a0";
const STEEL_LIT = "#d0d8e4";
const STEEL_LOW = "#3e4250";
const FLOOR = "#2a2630";
const FLOOR_LIT = "#5a5660";
const NIGHT = "#141c3a";
const MOON = "#f0ecd0";
const WOOD = "#7a5432";
const WOOD_LIT = "#a87a4a";
const PEEL = "#c9a06a";
const STEAM = "#f0f4f8";
const SPINES = ["#7a2a2a", "#2a4a7a", "#3a6a3a", "#8a6a2a", "#5a3a7a"];

interface Scullion {
  x: number;
  dir: 1 | -1;
  until: number;
  stopped: boolean;
}

export class KitchenScene extends LongScene<KitchenId> {
  private counter = 150;
  private range = 170;
  private shelf = 70;
  private cooks: Scullion[] = [];
  private steam: { x: number; y: number; life: number }[] = [];
  private peels: { x: number; y: number; vy: number }[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.counter = Math.round(sh * 0.66);
    this.range = this.counter + 4;
    this.shelf = Math.round(sh * 0.3);
    const ring = (x: number): Spot => ({ x, y: this.range });
    this.spots = {
      flame: [ring(20), ring(50), ring(80), ring(110)],
      servant: [0, 1, 2, 3].map((i) => ({ x: 20 + i * 46, y: sh - 6 + (i % 2) * 2 })),
      lid: [{ x: 18, y: this.shelf - 18 }, { x: 40, y: this.shelf - 16 }, { x: 62, y: this.shelf - 18 }, { x: 84, y: this.shelf - 16 }, { x: 106, y: this.shelf - 18 }],
      broth: [{ x: 20, y: this.range - 7 }, { x: 80, y: this.range - 7 }, { x: 50, y: this.range - 7 }],
      heirs: [{ x: 18, y: this.shelf + 22 }, { x: 42, y: this.shelf + 22 }, { x: 66, y: this.shelf + 22 }],
      seventh: [{ x: 146, y: this.counter - 1 }],
    };
    this.cooks = this.spots.servant.map((spot, i) => ({ x: spot.x, dir: i % 2 ? -1 : 1, until: i + 1, stopped: false }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, counter, shelf } = this;
    const dirty = clamp((1 - condition) * 1.2, 0, 1);
    ctx.fillStyle = mix(TILE, TILE_DIRTY, dirty);
    ctx.fillRect(0, 0, SCENE_W, counter);
    ctx.fillStyle = mix(TILE_DIM, TILE_DIRTY, dirty);
    for (let row = 0, y = 0; y < counter; row++, y += 12) {
      for (let x = row % 2 ? -8 : 0; x < SCENE_W; x += 16) if ((x * 7 + row * 13) % 5 === 0) ctx.fillRect(x + 1, y + 1, 15, 11);
    }
    ctx.fillStyle = GROUT;
    for (let row = 0, y = 0; y < counter; row++, y += 12) {
      ctx.fillRect(0, y, SCENE_W, 1);
      for (let x = row % 2 ? -8 : 0; x < SCENE_W; x += 16) ctx.fillRect(x, y, 1, 12);
    }
    // The night window, far side of the room.
    const wx = 128;
    const wy = 10;
    const ww = 40;
    const wh = Math.round(sh * 0.3);
    ctx.fillStyle = WOOD;
    ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(wx, wy, ww, wh);
    fillDisc(ctx, wx + 27, wy + 11, 6, MOON);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (const [x, y] of [[6, 7], [14, 19], [31, 25], [9, 30], [33, 4]] as const) if (y < wh) ctx.fillRect(wx + x, wy + y, 1, 1);
    ctx.fillStyle = WOOD;
    ctx.fillRect(wx + (ww >> 1), wy, 2, wh);
    ctx.fillRect(wx, wy + (wh >> 1), ww, 2);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 2);
    // Pot rack and book shelf.
    ctx.fillStyle = STEEL_LOW;
    ctx.fillRect(6, shelf - 34, 112, 2);
    ctx.fillStyle = WOOD;
    ctx.fillRect(6, shelf + 22, 112, 3);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(6, shelf + 22, 112, 1);
    // Counter, range, the front of the units.
    ctx.fillStyle = STEEL;
    ctx.fillRect(0, counter, SCENE_W, sh - counter);
    ctx.fillStyle = STEEL_LIT;
    ctx.fillRect(0, counter, SCENE_W, 1);
    ctx.fillStyle = "#2e2a34";
    ctx.fillRect(4, counter + 1, 122, 9);
    ctx.fillStyle = STEEL_LOW;
    ctx.fillRect(0, counter + 18, SCENE_W, sh - counter - 18);
    ctx.fillStyle = STEEL;
    for (let x = 6; x < SCENE_W; x += 56) {
      ctx.fillRect(x, counter + 23, 50, sh - counter - 18);
      ctx.fillStyle = STEEL_LOW;
      ctx.fillRect(x + 15, counter + 28, 20, 2);
      ctx.fillStyle = STEEL;
    }
    // The floor they walk on, a long way down.
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, sh - 12, SCENE_W, 12);
    ctx.fillStyle = FLOOR_LIT;
    ctx.fillRect(0, sh - 12, SCENE_W, 1);
    // The chopping board the potato sits on.
    ctx.fillStyle = WOOD;
    ctx.fillRect(128, counter - 2, 44, 4);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(128, counter - 2, 44, 1);
  }

  protected scene(t: number): void {
    this.drawBooks();
    this.drawLids(t);
    this.drawRings(t);
    this.drawPots(t);
    this.drawSeventh(t);
    this.drawCooks(t);
    this.drawBits();
    this.drawKnife(t);
  }

  /** The knife, and the dark it brings with it. Rare, quick, and stops just short of the potato. */
  private drawKnife(t: number): void {
    const cycle = (t + 12) % 22;
    if (this.owned("servant") === 0 || cycle > 2.2) return;
    const ctx = this.ctx;
    const k = cycle < 1 ? cycle : cycle < 1.2 ? 1 : Math.max(0, 1 - (cycle - 1.2));
    const low = Math.round((this.counter + 34) * k) - 90;
    ctx.fillStyle = `rgba(10,10,20,${0.28 * k})`;
    ctx.fillRect(0, 0, SCENE_W, this.sh);
    ctx.fillStyle = STEEL_LIT;
    ctx.fillRect(130, low - 40, 20, 64);
    for (let i = 0; i < 20; i++) ctx.fillRect(130, low + 24 + i, 20 - i, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(130, low - 40, 2, 84);
    ctx.fillStyle = "#2a1a14";
    ctx.fillRect(134, low - 72, 11, 32);
    if (cycle > 1 && cycle < 1.05 && this.peels.length < 16) this.peels.push({ x: 146, y: this.counter, vy: -18 });
  }

  private drawBooks(): void {
    const ctx = this.ctx;
    this.each("heirs", (spot, i, _, s) => this.stand(s, spot.x + (i % 2), spot.y - 1));
    if (this.owned("heirs") === 0) return;
    const n = Math.min(12, Math.floor(Math.log2(this.view.generation)) * 2);
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = SPINES[k % SPINES.length]!;
      const h = 7 + ((k * 5) % 4);
      ctx.fillRect(80 + k * 3, this.shelf + 22 - h, 2, h);
    }
  }

  private drawLids(t: number): void {
    const ctx = this.ctx;
    this.each("lid", (spot, i, broken, s) => {
      const rattle = !broken && Math.sin(t * 0.7 + i * 2) > 0.92 ? Math.round(Math.sin(t * 50)) : 0;
      ctx.fillStyle = STEEL_LOW;
      ctx.fillRect(spot.x, this.shelf - 32, 1, spot.y - this.shelf + 32 - s.h + 2);
      this.stand(s, spot.x + rattle, spot.y);
    });
  }

  private drawRings(t: number): void {
    this.each("flame", (spot, i, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 3, 7, "#5a8af0", 0.14 + 0.05 * Math.sin(t * 7 + i * 3));
      this.stand(s, spot.x, spot.y);
    });
  }

  private drawPots(t: number): void {
    const kept = clamp(this.view.condition, 0, 1);
    this.each("broth", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      const wobble = Math.round(Math.sin(t * 5 + spot.x));
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(spot.x - 4 + wobble, spot.y - s.h + 1, 1, 1);
      if (this.chance(3 * kept) && this.steam.length < 40) this.steam.push({ x: spot.x - 6 + Math.random() * 12, y: spot.y - s.h, life: 2.4 });
    });
  }

  private drawSeventh(t: number): void {
    this.each("seventh", (spot, _, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 6, 16, "#fff4c0", 0.1 + 0.03 * Math.sin(t));
      this.stand(s, spot.x, spot.y);
    });
  }

  /** Back and forth along the floor, stopping to peel. */
  private drawCooks(t: number): void {
    this.each("servant", (spot, i, broken, s) => {
      const c = this.cooks[i]!;
      if (!broken) {
        if (t >= c.until) {
          c.stopped = !c.stopped;
          c.until = t + (c.stopped ? 2 + Math.random() * 3 : 3 + Math.random() * 4);
          if (!c.stopped && Math.random() < 0.5) c.dir = c.dir === 1 ? -1 : 1;
        }
        if (!c.stopped) {
          c.x += c.dir * 6 * this.dt;
          if (c.x < 8) c.dir = 1;
          if (c.x > SCENE_W - 8) c.dir = -1;
        } else if (this.chance(1.6) && this.peels.length < 16) {
          this.peels.push({ x: c.x + 5, y: spot.y - 7, vy: 0 });
        }
      }
      const step = broken || c.stopped ? 0 : Math.round(Math.abs(Math.sin(t * 7 + i)));
      this.stand(s, c.x, spot.y - step);
    });
  }

  /** Steam rising, peelings falling. */
  private drawBits(): void {
    const ctx = this.ctx;
    for (const p of this.steam) {
      p.life -= this.dt;
      p.y -= 10 * this.dt;
      p.x += Math.sin(p.y / 7) * 5 * this.dt;
      ctx.fillStyle = rgba(STEAM, Math.min(0.4, p.life * 0.2));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
    }
    this.steam = this.steam.filter((p) => p.life > 0);
    ctx.fillStyle = PEEL;
    for (const p of this.peels) {
      p.vy += 40 * this.dt;
      p.y += p.vy * this.dt;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
    }
    this.peels = this.peels.filter((p) => p.y < this.sh - 6);
  }
}
