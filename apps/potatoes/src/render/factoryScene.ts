/**
 * The factory (engine world `beyond`): a white-tiled packhouse under strip lights. Washers tumble along
 * the back wall, the Crisp Line fries at the right, a belt runs the width of the floor carrying
 * potatoes left to the pile, Graders shake on the belt with Line Workers picking behind it, a Safety
 * Officer walks the front, and the Long Service Wall fills with brass. Low line: grease on everything.
 */

import { POTATO_BAG, POTATO_SPRITE } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type FactoryId = "echo" | "kin" | "grove" | "tide" | "beacon" | "third";

const TILE = "#dfe6ea";
const TILE_LINE = "#c4ced4";
const GREASE = "#b8a888";
const CEILING = "#9aa4ac";
const TUBE = "#f8fcff";
const WINDOW = "#bfe0f4";
const FLOOR = "#5a8a6a";
const FLOOR_LIT = "#6e9e7e";
const WALKWAY = "#e8c840";
const BELT = "#2e2e36";
const BELT_LIT = "#4a4a56";
const STEEL = "#9aa4b0";

export class FactoryScene extends LongScene<FactoryId> {
  private back = 160;
  private belt = 210;
  private front = 284;
  private officers: Carrier[] = [];
  private spuds: { x: number; kind: number }[] = [];
  private steam: { x: number; y: number; life: number }[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.back = Math.round(sh * 0.56);
    this.belt = Math.round(sh * 0.83);
    this.front = sh - 5;
    const wall = Math.round(sh * 0.3);
    this.spots = {
      beacon: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ x: 14 + (i % 5) * 13, y: wall + Math.floor(i / 5) * 9 })),
      echo: [22, 50, 78, 106].map((x) => ({ x, y: this.back })),
      third: [{ x: 152, y: this.back }],
      kin: [36, 54, 72, 90, 108, 126, 144].map((x) => ({ x, y: this.belt - 3 })),
      tide: [40, 80, 120].map((x, i) => ({ x, y: Math.round(sh * 0.7) + (i % 2) * 3 })),
      grove: [{ x: 150, y: Math.round(sh * 0.74) }, { x: 100, y: Math.round(sh * 0.75) }],
    };
    this.officers = this.spots.grove.map((s, i) => ({ x: s.x, dir: 1, loaded: false, wait: i * 2 }));
    this.spuds = Array.from({ length: 10 }, (_, i) => ({ x: 20 + i * 16, kind: i % 3 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, back, belt } = this;
    const grime = clamp((1 - condition) * 1.3, 0, 1);
    // Tiles, going yellow with grease as the line runs dirty.
    ctx.fillStyle = mix(TILE, GREASE, grime * 0.55);
    ctx.fillRect(0, 0, SCENE_W, back);
    ctx.fillStyle = mix(TILE_LINE, GREASE, grime * 0.7);
    for (let y = 0; y < back; y += 8) ctx.fillRect(0, y, SCENE_W, 1);
    for (let row = 0, y = 0; y < back; row++, y += 8) {
      for (let x = row % 2 ? 4 : 0; x < SCENE_W; x += 8) ctx.fillRect(x, y, 1, 8);
    }
    // Ceiling and strip lights.
    const top = Math.round(sh * 0.08);
    ctx.fillStyle = CEILING;
    ctx.fillRect(0, 0, SCENE_W, top);
    ctx.fillStyle = TUBE;
    for (const x of [14, 70, 126]) ctx.fillRect(x, top - 2, 36, 2);
    ctx.fillStyle = rgba(TUBE, 0.25);
    for (const x of [14, 70, 126]) ctx.fillRect(x - 4, top, 44, 3);
    // A strip of high windows, daylight outside.
    const wy = top + 6;
    ctx.fillStyle = "#7a8890";
    ctx.fillRect(0, wy - 1, SCENE_W, 9);
    ctx.fillStyle = WINDOW;
    for (let x = 4; x < SCENE_W; x += 22) ctx.fillRect(x, wy, 18, 7);
    // "LONG SERVICE" header over the plaques: a painted band.
    const wall = Math.round(sh * 0.3);
    ctx.fillStyle = "#3a5a8a";
    ctx.fillRect(6, wall - 18, 68, 5);
    ctx.fillStyle = "#e8eef4";
    for (let x = 9; x < 72; x += 4) ctx.fillRect(x, wall - 17, 2, 3);
    // Painted floor and the yellow walkway along the front.
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, back, SCENE_W, sh - back);
    ctx.fillStyle = FLOOR_LIT;
    ctx.fillRect(0, belt + 6, SCENE_W, sh - belt - 6);
    ctx.fillStyle = WALKWAY;
    ctx.fillRect(0, Math.round(sh * 0.62), SCENE_W, 1);
    ctx.fillRect(0, belt + 6, SCENE_W, 1);
    ctx.fillRect(0, sh - 2, SCENE_W, 1);
    if (grime > 0.2) {
      ctx.fillStyle = rgba(GREASE, 0.5 * grime);
      for (let x = 7; x < SCENE_W; x += 19) ctx.fillRect(x, back + 6 + ((x * 3) % 20), 9, 2);
    }
    ctx.fillStyle = rgba("#000000", 0.15);
    ctx.fillRect(0, back, SCENE_W, 2);
  }

  protected scene(t: number): void {
    this.each("beacon", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("echo", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      // The drum tumbling, behind the porthole.
      const a = t * 6 + i * 2;
      this.ctx.fillStyle = "#c98b4b";
      this.ctx.fillRect(Math.round(spot.x + Math.cos(a) * 2) - 1, Math.round(spot.y - 9 + Math.sin(a) * 2), 2, 2);
      if (this.chance(1.5)) this.drip(spot.x - 7, spot.y - 4);
    });
    this.each("third", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(5) && this.steam.length < 50) this.steam.push({ x: spot.x - 16 + Math.random() * 16, y: spot.y - 22, life: 2 });
    });
    this.drawSteam();
    this.each("tide", (spot, i, broken, s) => {
      const shake = broken ? 0 : Math.round(Math.sin(t * 30 + i));
      this.stand(s, spot.x + shake, spot.y);
    });
    this.each("grove", (spot, i, broken, s) => {
      const c = this.officers[i]!;
      const bob = this.carry(c, spot.x, spot.x - 40, 5, broken, t);
      this.stand(s, c.x, spot.y - bob);
      // The clipboard.
      this.ctx.fillStyle = "#f4f0e4";
      this.ctx.fillRect(Math.round(c.x + 4), spot.y - 8 - bob, 3, 4);
    });
    this.each("kin", (spot, i, broken, s) => {
      // Picking: a hand up every so often.
      const pick = !broken && Math.sin(t * 2.2 + i * 1.7) > 0.85 ? 1 : 0;
      this.stand(s, spot.x, spot.y - pick);
    });
    this.drawBelt(t);
    this.drawPile(POTATO_BAG, -4, this.front + 2, "echo");
  }

  /** The belt, running left, carrying potatoes toward the pile. Stops if every washer's down. */
  private drawBelt(t: number): void {
    const ctx = this.ctx;
    const y = this.belt;
    ctx.fillStyle = BELT;
    ctx.fillRect(0, y - 2, SCENE_W, 4);
    ctx.fillStyle = BELT_LIT;
    const run = (this.view.working.echo ?? 0) > 0;
    const off = run ? Math.floor(t * 12) % 6 : 0;
    for (let x = -off; x < SCENE_W; x += 6) ctx.fillRect(x, y - 2, 3, 1);
    ctx.fillStyle = STEEL;
    for (let x = 4; x < SCENE_W; x += 24) ctx.fillRect(x, y + 2, 2, 8);
    ctx.fillRect(0, y + 2, SCENE_W, 1);
    if (!run) return;
    const potato = artCanvas(POTATO_SPRITE);
    for (const sp of this.spuds) {
      sp.x -= 12 * this.dt;
      if (sp.x < 16) sp.x += SCENE_W - 4;
      ctx.drawImage(potato.canvas, Math.round(sp.x), y - 2 - potato.h + 2);
    }
  }

  private drip(x: number, y: number): void {
    if (this.steam.length < 50) this.steam.push({ x, y: -y, life: 0.8 });
  }

  /** Steam off the fryer rises; water off the washers (stored with a negative y) falls. */
  private drawSteam(): void {
    const ctx = this.ctx;
    for (const p of this.steam) {
      p.life -= this.dt;
      if (p.y >= 0) {
        p.y -= 9 * this.dt;
        p.x += Math.sin(p.y / 6) * 4 * this.dt;
        ctx.fillStyle = rgba("#ffffff", Math.min(0.5, p.life * 0.3));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 2);
      } else {
        p.y -= 30 * this.dt;
        ctx.fillStyle = rgba("#8ac8f0", 0.8);
        ctx.fillRect(Math.round(p.x), Math.round(-p.y), 1, 2);
      }
    }
    this.steam = this.steam.filter((p) => p.life > 0);
  }
}
