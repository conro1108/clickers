/**
 * The kitchen (engine world `after`): somebody's kitchen in the evening, side-on and at the size it
 * is. Tiled wall, the night in the window, Pot Lids on the rail, Recipe Books on the shelf with a
 * spine for each generation, the hob along the worktop with Gas Rings burning and Stockpots on them,
 * the Roast Potato in its tin by the window, Kitchen Hands peeling behind the counter or fetching
 * potatoes from the sack on the lino. Low clean: the tiles go brown and the pans stop steaming.
 */

import { POTATO_SPRITE } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type KitchenId = "loam" | "drone" | "moss" | "mire" | "kinship" | "sixth";

const TILE = "#d8e0d4";
const TILE_LINE = "#b4bcb0";
const TILE_DIRTY = "#a89a78";
const STEEL = "#9aa2ae";
const STEEL_LIT = "#d0d8e2";
const STEEL_LOW = "#5a606c";
const WORKTOP = "#c8a878";
const WORKTOP_LIT = "#e2c898";
const UNIT = "#6a8a9a";
const UNIT_LIT = "#80a0b0";
const UNIT_LOW = "#4e6a78";
const LINO_A = "#e8e0cc";
const LINO_B = "#c85a4a";
const NIGHT = "#18204a";
const MOON = "#f0ecd0";
const WOOD = "#7a5432";
const WOOD_LIT = "#a87a4a";
const OVEN = "#ff9a3a";
const PEEL = "#c9a06a";
const STEAM = "#f4f8fc";
const SPINES = ["#7a2a2a", "#2a4a7a", "#3a6a3a", "#8a6a2a", "#5a3a7a"];

/** Hands alternate: even ones peel behind the counter, odd ones fetch from the sack on the floor. */
const peels = (i: number) => i % 2 === 0;

export class KitchenScene extends LongScene<KitchenId> {
  private top = 190;
  private floor = 250;
  private rail = 40;
  private shelf = 100;
  private hands: Carrier[] = [];
  private steam: { x: number; y: number; life: number }[] = [];
  private bits: { x: number; y: number; vx: number; vy: number }[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.top = Math.round(sh * 0.68);
    this.floor = Math.round(sh * 0.86);
    this.rail = Math.round(sh * 0.13);
    this.shelf = Math.round(sh * 0.34);
    const ring = (x: number) => ({ x, y: this.top });
    this.spots = {
      loam: [ring(18), ring(38), ring(58), ring(78)],
      mire: [{ x: 18, y: this.top - 6 }, { x: 58, y: this.top - 6 }, { x: 78, y: this.top - 6 }],
      moss: [16, 36, 56, 76, 96].map((x, i) => ({ x, y: this.rail + 11 + (i % 2) })),
      kinship: [{ x: 20, y: this.shelf }, { x: 40, y: this.shelf }, { x: 60, y: this.shelf }],
      sixth: [{ x: 150, y: this.top - 3 }],
      drone: [
        { x: 112, y: this.top + 3 },
        { x: 0, y: sh - 3 },
        { x: 130, y: this.top + 4 },
        { x: 0, y: sh - 4 },
      ],
    };
    this.hands = this.spots.drone.map((_, i) => ({ x: 40 + i * 20, dir: 1, loaded: i === 1, wait: i * 0.8 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, top, floor, rail, shelf } = this;
    const dirty = clamp((1 - condition) * 1.2, 0, 1);
    // Tiles, going brown when nobody wipes them.
    ctx.fillStyle = mix(TILE, TILE_DIRTY, dirty * 0.7);
    ctx.fillRect(0, 0, SCENE_W, top);
    ctx.fillStyle = mix(TILE_LINE, TILE_DIRTY, dirty);
    for (let y = 0; y < top; y += 8) ctx.fillRect(0, y, SCENE_W, 1);
    for (let row = 0, y = 0; y < top; row++, y += 8) {
      for (let x = row % 2 ? 4 : 0; x < SCENE_W; x += 8) ctx.fillRect(x, y, 1, 8);
    }
    // The night window over the sink end.
    const wx = 124;
    const wy = Math.round(sh * 0.1);
    const ww = 42;
    const wh = Math.round(sh * 0.3);
    ctx.fillStyle = WOOD;
    ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = MOON;
    ctx.fillRect(wx + 27, wy + 7, 6, 6);
    ctx.fillRect(wx + 26, wy + 8, 8, 4);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (const [x, y] of [[6, 7], [14, 19], [36, 25], [9, 31], [20, 4]] as const) if (y < wh) ctx.fillRect(wx + x, wy + y, 1, 1);
    ctx.fillStyle = WOOD;
    ctx.fillRect(wx + (ww >> 1) - 1, wy, 2, wh);
    ctx.fillRect(wx, wy + (wh >> 1), ww, 2);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 2);
    // Gingham half-curtains.
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(wx, wy + (wh >> 1) + 2, ww, wh - (wh >> 1) - 2);
    ctx.fillStyle = "#c85a4a";
    for (let y = wy + (wh >> 1) + 2; y < wy + wh; y += 4) for (let x = wx + ((y >> 2) % 2) * 2; x < wx + ww; x += 4) ctx.fillRect(x, y, 2, 2);
    // The pot rail and the book shelf.
    ctx.fillStyle = STEEL_LOW;
    ctx.fillRect(6, rail, 102, 2);
    ctx.fillStyle = WOOD;
    ctx.fillRect(6, shelf + 1, 80, 3);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(6, shelf + 1, 80, 1);
    // The extractor hood over the hob.
    const hood = Math.round(sh * 0.44);
    ctx.fillStyle = STEEL;
    ctx.fillRect(40, shelf + 8, 16, hood - shelf - 8);
    for (let i = 0; i < 8; i++) ctx.fillRect(12 + i * 1, hood + i, 72 - i * 2, 1);
    ctx.fillStyle = STEEL_LIT;
    ctx.fillRect(12, hood, 72, 1);
    ctx.fillStyle = STEEL_LOW;
    ctx.fillRect(20, hood + 7, 56, 1);
    // The worktop, and the hob set into it.
    ctx.fillStyle = WORKTOP;
    ctx.fillRect(0, top, SCENE_W, 4);
    ctx.fillStyle = WORKTOP_LIT;
    ctx.fillRect(0, top, SCENE_W, 1);
    ctx.fillStyle = "#2a2830";
    ctx.fillRect(6, top, 88, 2);
    // A chopping board by the window.
    ctx.fillStyle = WOOD;
    ctx.fillRect(104, top - 2, 30, 2);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(104, top - 2, 30, 1);
    // Units under the worktop, the oven under the hob.
    ctx.fillStyle = UNIT;
    ctx.fillRect(0, top + 4, SCENE_W, floor - top - 4);
    ctx.fillStyle = UNIT_LOW;
    ctx.fillRect(0, floor - 3, SCENE_W, 3);
    for (let x = 100; x < SCENE_W; x += 26) {
      ctx.fillStyle = UNIT_LOW;
      ctx.fillRect(x, top + 6, 1, floor - top - 9);
      ctx.fillStyle = UNIT_LIT;
      ctx.fillRect(x + 1, top + 6, 24, 1);
      ctx.fillStyle = STEEL_LIT;
      ctx.fillRect(x + 10, top + 10, 6, 1);
    }
    ctx.fillStyle = STEEL_LOW;
    ctx.fillRect(8, top + 6, 84, floor - top - 9);
    ctx.fillStyle = STEEL;
    ctx.fillRect(10, top + 8, 80, 2);
    ctx.fillStyle = "#2a1a14";
    ctx.fillRect(16, top + 13, 68, floor - top - 19);
    ctx.fillStyle = rgba(OVEN, 0.55);
    ctx.fillRect(18, top + 15, 64, floor - top - 23);
    // Lino, in checks.
    for (let y = floor, row = 0; y < sh; y += 6, row++) {
      for (let x = 0, col = 0; x < SCENE_W; x += 6, col++) {
        ctx.fillStyle = (row + col) % 2 ? LINO_B : LINO_A;
        ctx.fillRect(x, y, 6, 6);
      }
    }
    ctx.fillStyle = rgba("#000000", 0.18);
    ctx.fillRect(0, floor, SCENE_W, 2);
  }

  protected scene(t: number): void {
    this.drawLids(t);
    this.drawBooks();
    // Behind the counter first, so the worktop cuts them off at the waist.
    this.each("drone", (spot, i, broken, s) => {
      if (!peels(i)) return;
      const bob = broken ? 0 : Math.round(Math.abs(Math.sin(t * 3 + i)) * 0.6);
      this.stand(s, spot.x, spot.y - bob);
      if (!broken && this.chance(2.5) && this.bits.length < 30) {
        this.bits.push({ x: spot.x + 5, y: spot.y - 8, vx: 4 + Math.random() * 8, vy: -14 - Math.random() * 6 });
      }
    });
    this.redrawWorktop();
    this.each("loam", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      this.ctx.fillStyle = Math.sin(t * 20 + i * 3) > 0 ? "#8ac8ff" : "#5a8af0";
      this.ctx.fillRect(spot.x - 6, spot.y - s.h, 12, 1);
    });
    this.drawPots(t);
    this.drawRoast(t);
    this.drawBits();
    this.drawPile(POTATO_SPRITE, -3, this.sh - 1, "loam");
    this.drawFetchers(t);
  }

  /** The worktop again over the waist of anyone behind it. */
  private redrawWorktop(): void {
    const ctx = this.ctx;
    ctx.fillStyle = UNIT;
    ctx.fillRect(98, this.top + 4, SCENE_W - 98, 4);
    ctx.fillStyle = WORKTOP;
    ctx.fillRect(98, this.top, SCENE_W - 98, 4);
    ctx.fillStyle = WORKTOP_LIT;
    ctx.fillRect(98, this.top, SCENE_W - 98, 1);
    ctx.fillStyle = WOOD;
    ctx.fillRect(104, this.top - 2, 30, 2);
    ctx.fillStyle = WOOD_LIT;
    ctx.fillRect(104, this.top - 2, 30, 1);
  }

  private drawLids(t: number): void {
    const ctx = this.ctx;
    this.each("moss", (spot, i, broken, s) => {
      const rattle = !broken && Math.sin(t * 0.7 + i * 2) > 0.94 ? Math.round(Math.sin(t * 50)) : 0;
      ctx.fillStyle = STEEL_LOW;
      ctx.fillRect(spot.x, this.rail + 2, 1, spot.y - this.rail - s.h);
      this.stand(s, spot.x + rattle, spot.y);
    });
  }

  private drawBooks(): void {
    const ctx = this.ctx;
    this.each("kinship", (spot, i, _, s) => this.stand(s, spot.x + (i % 2), spot.y));
    if (this.owned("kinship") === 0) return;
    const n = Math.min(7, Math.floor(Math.log2(Math.max(1, this.view.generation))) * 2);
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = SPINES[k % SPINES.length]!;
      const h = 7 + ((k * 5) % 4);
      ctx.fillRect(72 + k * 2, this.shelf + 1 - h, 2, h);
    }
  }

  private drawPots(t: number): void {
    const kept = clamp(this.view.condition, 0, 1);
    this.each("mire", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      const wobble = Math.round(Math.sin(t * 5 + spot.x));
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(spot.x - 4 + wobble, spot.y - s.h + 1, 1, 1);
      if (this.chance(3 * kept) && this.steam.length < 40) this.steam.push({ x: spot.x - 6 + Math.random() * 12, y: spot.y - s.h, life: 2.4 });
    });
  }

  /** The tin, and what's in it. */
  private drawRoast(t: number): void {
    const ctx = this.ctx;
    this.each("sixth", (spot, _, broken, s) => {
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(spot.x - 14, spot.y - 4, 28, 5);
      ctx.fillStyle = "#5a5a68";
      ctx.fillRect(spot.x - 14, spot.y - 4, 28, 1);
      this.stand(s, spot.x, spot.y - 2);
      if (!broken && Math.sin(t * 1.3) > 0.2 && this.steam.length < 40 && this.chance(2)) {
        this.steam.push({ x: spot.x - 4 + Math.random() * 8, y: spot.y - s.h - 2, life: 2 });
      }
    });
  }

  /** From the sack on the floor to the worktop with a potato, and back. */
  private drawFetchers(t: number): void {
    const potato = artCanvas(POTATO_SPRITE);
    this.each("drone", (spot, i, broken, s) => {
      if (peels(i)) return;
      const c = this.hands[i]!;
      const bob = this.carry(c, 26 + i * 3, 104 + i * 6, 11, broken, t);
      this.stand(s, c.x, spot.y - bob);
      if (c.loaded) this.ctx.drawImage(potato.canvas, Math.round(c.x - potato.w / 2), Math.round(spot.y - s.h - potato.h + 2 - bob));
    });
  }

  /** Steam rising off the pans; peel flying off the peelers onto the worktop. */
  private drawBits(): void {
    const ctx = this.ctx;
    for (const p of this.steam) {
      p.life -= this.dt;
      p.y -= 10 * this.dt;
      p.x += Math.sin(p.y / 7) * 5 * this.dt;
      ctx.fillStyle = rgba(STEAM, Math.min(0.45, p.life * 0.2));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
    }
    this.steam = this.steam.filter((p) => p.life > 0);
    ctx.fillStyle = PEEL;
    for (const b of this.bits) {
      b.vy += 50 * this.dt;
      b.x += b.vx * this.dt;
      b.y += b.vy * this.dt;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 1);
    }
    this.bits = this.bits.filter((b) => b.y < this.top);
  }
}
