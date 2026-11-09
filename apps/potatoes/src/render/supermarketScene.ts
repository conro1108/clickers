/**
 * The supermarket (engine world `void`): the produce aisle under strip lights. Shelves of bagged
 * potatoes along the back, Ceiling Speakers leaking Muzak, Loyalty Card promos hung over the aisle,
 * Veg Misters fogging the produce cases, Shelf Stackers bringing bags out from the stockroom to the
 * pile, and Checkouts beeping along the front. Low shelves: gaps where the stock should be.
 */

import { POTATO_BAG } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type SupermarketId = "mote" | "wisp" | "veil" | "nebula" | "aeon" | "fifth";

const CEILING = "#e8ecf0";
const GRID = "#c8ced6";
const TUBE = "#ffffff";
const WALL = "#f2f0ea";
const WALL_BAND = "#3a8a5a";
const FLOOR = "#e4e2dc";
const FLOOR_LINE = "#ccc8c0";
const SHINE = "#ffffff";

export class SupermarketScene extends LongScene<SupermarketId> {
  private ceiling = 30;
  private back = 160;
  private mid = 210;
  private front = 284;
  private stackers: Carrier[] = [];
  private notes: { x: number; y: number; life: number }[] = [];
  private fog: { x: number; y: number; life: number }[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.ceiling = Math.round(sh * 0.1);
    this.back = Math.round(sh * 0.56);
    this.mid = Math.round(sh * 0.72);
    this.front = sh - 5;
    this.spots = {
      mote: [12, 34, 56, 78, 100, 122, 144, 166].map((x) => ({ x, y: this.back })),
      veil: [30, 88, 146, 59].map((x) => ({ x, y: this.ceiling + 6 })),
      aeon: [{ x: 60, y: Math.round(sh * 0.3) }, { x: 120, y: Math.round(sh * 0.28) }, { x: 26, y: Math.round(sh * 0.28) }],
      nebula: [24, 56, 88, 120, 152].map((x) => ({ x, y: this.mid })),
      fifth: [{ x: 150, y: Math.round(sh * 0.9) }, { x: 112, y: Math.round(sh * 0.92) }],
      wisp: [0, 1, 2].map((i) => ({ x: 120 + i * 14, y: Math.round(sh * 0.8) })),
    };
    this.stackers = this.spots.wisp.map((s, i) => ({ x: s.x, dir: -1, loaded: i === 1, wait: i }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, ceiling, back } = this;
    // Ceiling tiles and the tubes in them.
    ctx.fillStyle = CEILING;
    ctx.fillRect(0, 0, SCENE_W, ceiling);
    ctx.fillStyle = GRID;
    for (let x = 0; x < SCENE_W; x += 16) ctx.fillRect(x, 0, 1, ceiling);
    ctx.fillRect(0, ceiling - 1, SCENE_W, 1);
    ctx.fillStyle = TUBE;
    for (let x = 4; x < SCENE_W; x += 32) ctx.fillRect(x, Math.round(ceiling / 2) - 1, 24, 2);
    // Wall, with the green band the whole chain is painted in.
    ctx.fillStyle = WALL;
    ctx.fillRect(0, ceiling, SCENE_W, back - ceiling);
    ctx.fillStyle = WALL_BAND;
    ctx.fillRect(0, Math.round(sh * 0.18), SCENE_W, 6);
    ctx.fillStyle = "#ffffff";
    for (let x = 8; x < 60; x += 4) ctx.fillRect(x, Math.round(sh * 0.18) + 2, 2, 2);
    // The aisle sign: FRESH PRODUCE, as blocks.
    ctx.fillStyle = "#e83a3a";
    ctx.fillRect(110, Math.round(sh * 0.18) - 1, 54, 8);
    ctx.fillStyle = "#ffffff";
    for (let x = 113; x < 162; x += 4) ctx.fillRect(x, Math.round(sh * 0.18) + 2, 2, 2);
    // Glossy floor: tiles, and the lights in it.
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, back, SCENE_W, sh - back);
    ctx.fillStyle = FLOOR_LINE;
    for (let y = back; y < sh; y += 10) ctx.fillRect(0, y, SCENE_W, 1);
    for (let x = 0; x < SCENE_W; x += 10) ctx.fillRect(x, back, 1, sh - back);
    ctx.fillStyle = rgba(SHINE, 0.6);
    for (let x = 4; x < SCENE_W; x += 32) ctx.fillRect(x + 4, Math.round(sh * 0.86), 16, 1);
    // A wet-floor sign when the shelves aren't being kept.
    if (condition < 0.6) {
      ctx.fillStyle = "#f0c020";
      ctx.fillRect(90, Math.round(sh * 0.88) - 8, 5, 8);
      ctx.fillStyle = "#402e3a";
      ctx.fillRect(92, Math.round(sh * 0.88) - 6, 1, 3);
    }
  }

  protected scene(t: number): void {
    const gaps = clamp(1 - this.view.condition, 0, 1);
    this.each("mote", (spot, i, _, s) => {
      this.stand(s, spot.x, spot.y);
      // Gaps on the shelves, the worse they're kept.
      if ((i * 0.31) % 1 < gaps) {
        this.ctx.fillStyle = "#f4f6fa";
        this.ctx.fillRect(spot.x - 7 + (i % 3) * 4, spot.y - 14, 6, 4);
      }
    });
    this.each("veil", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(0.5) && this.notes.length < 12) this.notes.push({ x: spot.x + (i % 2 ? 3 : -3), y: spot.y + 2, life: 3 });
    });
    this.drawNotes();
    this.each("aeon", (spot, i, broken, s) => {
      this.ctx.fillStyle = "#8a92a0";
      this.ctx.fillRect(spot.x, this.ceiling, 1, spot.y - s.h - this.ceiling + 2);
      const sway = broken ? 0 : Math.round(Math.sin(t * 0.8 + i) * 0.6);
      this.stand(s, spot.x + sway, spot.y);
    });
    this.each("nebula", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      // A burst of mist every few seconds, all down the case.
      if (!broken && Math.sin(t * 0.9 + i * 1.3) > 0.97 && this.fog.length < 60) {
        for (let k = 0; k < 4; k++) this.fog.push({ x: spot.x - 8 + k * 5, y: spot.y - 9, life: 1.4 });
      }
    });
    this.drawFog();
    this.drawPile(POTATO_BAG, -4, this.front + 2, "mote");
    this.drawStackers(t);
    this.each("fifth", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) {
        this.ctx.fillStyle = "#ff3a3a";
        this.ctx.fillRect(spot.x + 9, spot.y - 16, 1, 1);
        return;
      }
      // The scanner's beep: a flash of red across the glass.
      if ((t * 1.7 + i * 0.5) % 1 < 0.08) {
        this.ctx.fillStyle = rgba("#ff3a3a", 0.8);
        this.ctx.fillRect(spot.x - 4, spot.y - 9, 6, 1);
      }
    });
  }

  /** Out of the stockroom with a bag, to the pile, and back. */
  private drawStackers(t: number): void {
    const bag = artCanvas(POTATO_BAG);
    this.each("wisp", (spot, i, broken, s) => {
      const c = this.stackers[i]!;
      const bob = this.carry(c, SCENE_W - 6, 30 + i * 8, 11, broken, t);
      this.stand(s, c.x, spot.y - bob);
      if (c.loaded) this.ctx.drawImage(bag.canvas, Math.round(c.x - bag.w / 2), Math.round(spot.y - s.h - bag.h + 3 - bob));
    });
  }

  private drawNotes(): void {
    const ctx = this.ctx;
    for (const n of this.notes) {
      n.life -= this.dt;
      n.y += 4 * this.dt;
      n.x += Math.sin(n.life * 3) * 4 * this.dt;
      ctx.fillStyle = rgba("#8a92a0", Math.min(0.7, n.life * 0.3));
      ctx.fillRect(Math.round(n.x), Math.round(n.y), 1, 3);
      ctx.fillRect(Math.round(n.x) - 1, Math.round(n.y) + 2, 1, 1);
    }
    this.notes = this.notes.filter((n) => n.life > 0);
  }

  private drawFog(): void {
    const ctx = this.ctx;
    for (const f of this.fog) {
      f.life -= this.dt;
      f.y += 3 * this.dt;
      ctx.fillStyle = rgba("#ffffff", Math.min(0.55, f.life * 0.4));
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 4, 2);
    }
    this.fog = this.fog.filter((f) => f.life > 0);
  }
}
