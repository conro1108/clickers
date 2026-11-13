/**
 * The table (engine world `above`): the dining room, side-on, at dinner. Damask on the walls, the
 * Family Portraits looking down at the food, a long table with the family sat behind it — one for
 * every Place Setting — Candles and Gravy Boats down the middle, and Dinner at the front edge with a
 * fork that comes down a little further the more of it there is, and does not arrive. Waiters bring
 * roast potatoes through the swing door to the trolley at the front left. Low mood: wine on the cloth,
 * and the family stops eating.
 *
 * The family sets the scale (see `figures.ts`): the table, the door, the trolley and the waiters are
 * all sized against somebody sat in one of those chairs.
 */

import { ROASTIE } from "./art.js";
import { ADULT, waiter } from "./figures.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, rgba } from "./farmScene.js";

type TableId = "flame" | "servant" | "lid" | "broth" | "heirs" | "seventh";

const PAPER = "#5a2230";
const PAPER_STRIPE = "#6a2a3a";
const PAPER_FIGURE = "#7a3444";
const DADO = "#3a1a20";
const PANEL = "#4a2a22";
const PANEL_LIT = "#5e3a2e";
const BOARD = "#3a2418";
const BOARD_LINE = "#2a1810";
const BOARD_LIT = "#4a3020";
const CLOTH = "#f4ecdc";
const CLOTH_SHADE = "#d8ccb8";
const WINE = "#8a2a3a";
const CHAIR = "#2a1612";
const CHAIR_LIT = "#4a2a1e";
const DOOR = "#4a2e20";
const DOOR_LIGHT = "#ffe0a0";
const FORK = "#e8ecf4";
const FORK_LOW = "#8a8e9a";
const FLAME = "#ffb04a";

/** Who's sat at each place: skin, hair, and what they've dressed in. */
const FAMILY: readonly [string, string, string][] = [
  ["#e2b090", "#3a2a20", "#2a4a6a"],
  ["#c88a68", "#1a1414", "#6a2a4a"],
  ["#f0c8a8", "#c8a050", "#3a6a4a"],
  ["#a87050", "#2a1a14", "#5a4a7a"],
  ["#e8b898", "#8a8a8a", "#2a2a3a"],
  ["#d8a080", "#6a3a20", "#8a5a2a"],
];

export class TableScene extends LongScene<TableId> {
  private wall = 180;
  private back = 174;
  private edge = 192;
  private hem = 222;
  private feet = 244;
  private waiters: Carrier[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.wall = Math.round(sh * 0.66);
    this.back = Math.round(sh * 0.65);
    this.edge = Math.round(sh * 0.71);
    // A table top comes to a standing waiter's hip, so its legs are half an adult long.
    this.feet = this.edge + Math.round(ADULT * 0.5);
    this.hem = this.feet - 9;
    const seats = [24, 50, 76, 100, 126, 152];
    this.spots = {
      flame: seats.map((x) => ({ x, y: this.back + 9 })),
      lid: [38, 88, 138].map((x) => ({ x, y: this.back + 5 })),
      broth: [63, 113].map((x) => ({ x, y: this.back + 12 })),
      heirs: [20, 52, 84, 116].map((x, i) => ({ x, y: Math.round(sh * 0.4) - (i % 2) * 4 })),
      seventh: [{ x: 88, y: this.edge + 3 }],
      servant: [0, 1, 2].map((i) => ({ x: 146 + i * 9, y: sh - 3 - (i % 2) * 5 })),
    };
    this.waiters = this.spots.servant.map((s, i) => ({ x: s.x, dir: -1, loaded: true, wait: i * 1.6 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, wall, edge, hem, feet } = this;
    const dado = Math.round(sh * 0.52);
    // Damask: stripes with a figure in them.
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, SCENE_W, dado);
    for (let x = 0; x < SCENE_W; x += 14) {
      ctx.fillStyle = PAPER_STRIPE;
      ctx.fillRect(x, 0, 6, dado);
      ctx.fillStyle = PAPER_FIGURE;
      for (let y = 6 + ((x / 14) % 2) * 8; y < dado; y += 16) {
        ctx.fillRect(x + 9, y, 2, 1);
        ctx.fillRect(x + 8, y + 1, 4, 2);
        ctx.fillRect(x + 9, y + 3, 2, 1);
      }
    }
    // Dado rail and panelling down to the floor.
    ctx.fillStyle = DADO;
    ctx.fillRect(0, dado, SCENE_W, 3);
    ctx.fillStyle = PANEL;
    ctx.fillRect(0, dado + 3, SCENE_W, wall - dado - 3);
    ctx.fillStyle = PANEL_LIT;
    for (let x = 4; x < SCENE_W; x += 24) ctx.fillRect(x, dado + 6, 18, 1);
    // The swing door at the right, the kitchen's light round it.
    const doorTop = wall - Math.round(ADULT * 1.3);
    ctx.fillStyle = DOOR_LIGHT;
    ctx.fillRect(147, doorTop - 1, 28, wall - doorTop + 1);
    ctx.fillStyle = DOOR;
    ctx.fillRect(148, doorTop, 26, wall - doorTop);
    ctx.fillStyle = "#3a2018";
    ctx.fillRect(151, doorTop + 3, 20, 14);
    ctx.fillStyle = "#ffe8b0";
    ctx.fillRect(155, doorTop + 5, 12, 10);
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(150, wall - 30, 2, 8);
    // Boards.
    ctx.fillStyle = BOARD;
    ctx.fillRect(0, wall, SCENE_W, sh - wall);
    ctx.fillStyle = BOARD_LINE;
    for (let y = wall + 5; y < sh; y += 7) ctx.fillRect(0, y, SCENE_W, 1);
    for (let row = 0, y = wall; y < sh; row++, y += 7) for (let x = (row * 37) % 50; x < SCENE_W; x += 50) ctx.fillRect(x, y, 1, 7);
    ctx.fillStyle = rgba(DOOR_LIGHT, 0.12);
    ctx.fillRect(130, wall, 46, sh - wall);
    ctx.fillStyle = BOARD_LIT;
    ctx.fillRect(0, wall, SCENE_W, 1);
    // The table's legs and its shadow, under where the cloth will hang.
    ctx.fillStyle = rgba("#000000", 0.3);
    ctx.fillRect(10, feet - 2, 156, 3);
    ctx.fillStyle = CHAIR;
    for (const x of [16, 158]) ctx.fillRect(x, hem, 3, feet - hem);
    // The cloth hanging off the front edge; wine on it when the mood goes.
    ctx.fillStyle = CLOTH_SHADE;
    ctx.fillRect(10, edge, 156, hem - edge);
    ctx.fillStyle = CLOTH;
    ctx.fillRect(10, edge, 156, 2);
    for (let x = 12; x < 166; x += 8) {
      ctx.fillStyle = CLOTH;
      ctx.fillRect(x, edge + 2, 4, hem - edge - 2);
      ctx.fillStyle = CLOTH_SHADE;
      ctx.fillRect(x, hem - 1, 4, 2);
    }
    const spilled = clamp((1 - condition) * 1.3, 0, 1);
    if (spilled > 0.1) {
      ctx.fillStyle = rgba(WINE, 0.7);
      for (let i = 0; i < Math.round(spilled * 6); i++) {
        const x = 20 + ((i * 53) % 140);
        ctx.fillRect(x, edge + 3 + ((i * 7) % 10), 3 + (i % 3), 2);
      }
    }
    // A trolley at the front left, for the potatoes coming out: hip-high, two shelves.
    const ty = this.trolley;
    ctx.fillStyle = rgba("#000000", 0.3);
    ctx.fillRect(0, sh - 2, 46, 2);
    ctx.fillStyle = "#b8bcc8";
    ctx.fillRect(0, ty, 44, 2);
    ctx.fillRect(0, sh - 12, 44, 2);
    ctx.fillRect(2, ty, 2, sh - ty - 4);
    ctx.fillRect(40, ty, 2, sh - ty - 4);
    ctx.fillStyle = "#e4e8f0";
    ctx.fillRect(0, ty, 44, 1);
    ctx.fillRect(0, sh - 12, 44, 1);
    ctx.fillStyle = "#3a3a44";
    ctx.fillRect(1, sh - 4, 4, 4);
    ctx.fillRect(39, sh - 4, 4, 4);
  }

  /** The top of the trolley. */
  private get trolley(): number {
    return this.sh - Math.round(ADULT * 0.5);
  }

  protected scene(t: number): void {
    this.each("heirs", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawFamily(t);
    this.drawTop();
    this.each("lid", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      // The flame, alive.
      this.ctx.fillStyle = Math.sin(t * 9 + i * 2) > 0 ? FLAME : "#fff4c0";
      this.ctx.fillRect(spot.x - 1, spot.y - s.h + 1 + (Math.sin(t * 13 + i) > 0.6 ? 1 : 0), 1, 1);
    });
    this.each("flame", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawBoats(t);
    this.drawDinner(t);
    this.drawPile(ROASTIE, 1, this.trolley - 1, "flame");
    this.drawWaiters(t);
  }

  /** The cloth over the top of the table, drawn over everyone sat behind it. */
  private drawTop(): void {
    const ctx = this.ctx;
    ctx.fillStyle = CLOTH;
    ctx.fillRect(10, this.back, 156, this.edge - this.back);
    ctx.fillStyle = CLOTH_SHADE;
    ctx.fillRect(10, this.back, 156, 1);
  }

  /** One of the family behind every place that's laid, eating when the mood's good. */
  private drawFamily(t: number): void {
    const ctx = this.ctx;
    const laid = this.spots.flame.slice(0, this.countShown("flame"));
    const mood = clamp(this.view.condition, 0, 1);
    laid.forEach((spot, i) => {
      const [skin, hair, coat] = FAMILY[i % FAMILY.length]!;
      const x = spot.x;
      const seat = this.back + 2;
      // Chair back.
      ctx.fillStyle = CHAIR;
      ctx.fillRect(x - 7, seat - 26, 14, 26);
      ctx.fillStyle = CHAIR_LIT;
      ctx.fillRect(x - 7, seat - 26, 14, 2);
      ctx.fillRect(x - 5, seat - 22, 1, 18);
      ctx.fillRect(x + 4, seat - 22, 1, 18);
      // Them: shoulders, neck, head, hair. Eating is a dip toward the plate.
      const eating = mood > 0.5 && Math.sin(t * 1.4 + i * 1.9) > 0.7 ? 1 : 0;
      const y = seat - 10 + eating;
      ctx.fillStyle = coat;
      ctx.fillRect(x - 5, y, 10, 10);
      ctx.fillRect(x - 6, y + 2, 12, 8);
      ctx.fillStyle = skin;
      ctx.fillRect(x - 1, y - 2, 2, 2);
      ctx.fillRect(x - 3, y - 8, 6, 6);
      ctx.fillStyle = hair;
      ctx.fillRect(x - 3, y - 9, 6, 2);
      ctx.fillRect(x - 3, y - 8, 1, 3);
      ctx.fillRect(x + 2, y - 8, 1, 3);
      ctx.fillStyle = "#2a1a1a";
      ctx.fillRect(x - 2, y - 6, 1, 1);
      ctx.fillRect(x + 1, y - 6, 1, 1);
      // A bad evening: nobody's touching their food, and it shows on their faces.
      if (mood < 0.4) ctx.fillRect(x - 1, y - 4, 2, 1);
    });
  }

  private countShown(id: TableId): number {
    let n = 0;
    this.each(id, () => n++);
    return n;
  }

  private drawBoats(t: number): void {
    this.each("broth", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && Math.sin(t * 0.8 + i * 2) > 0.2) {
        this.ctx.fillStyle = rgba("#f0f4f8", 0.45);
        this.ctx.fillRect(spot.x + 2, spot.y - s.h - 2 - Math.round((t * 3 + i) % 5), 1, 2);
      }
    });
  }

  /** The plate at the front edge, and the fork that has been coming down since you got here. */
  private drawDinner(t: number): void {
    const ctx = this.ctx;
    this.each("seventh", (spot, _, __, s) => {
      this.stand(s, spot.x, spot.y);
      const reach = clamp(Math.log2(this.owned("seventh") + 1) / 7, 0, 1);
      const tip = Math.round(spot.y - s.h - 16 + reach * 12 + Math.sin(t * 0.6) * 1.2);
      ctx.fillStyle = FORK;
      for (const dx of [-3, -1, 1, 3]) ctx.fillRect(spot.x + dx, tip - 5, 1, 5);
      ctx.fillRect(spot.x - 3, tip - 7, 7, 2);
      ctx.fillRect(spot.x - 1, tip - 22, 3, 15);
      ctx.fillStyle = FORK_LOW;
      ctx.fillRect(spot.x + 1, tip - 22, 1, 15);
    });
  }

  /** Out of the swing door with the potatoes, across the front of the room to the trolley, and back. */
  private drawWaiters(t: number): void {
    const mark = this.mark("servant");
    const out: (() => void)[] = [];
    this.each("servant", (spot, i, broken) => {
      const c = this.waiters[i]!;
      const still = broken || c.wait > 0;
      const bob = this.carry(c, 160 - i * 5, 64 + i * 9, 12, broken, t);
      const art = waiter(mark, still ? 0 : ((1 + (Math.floor(t * 4 + i) % 2)) as 1 | 2), c.loaded);
      const draw = () => this.face(this.sprite(art, broken), c.x, spot.y - bob, c.dir);
      // The one walking further back goes down first.
      if (i % 2) out.unshift(draw);
      else out.push(draw);
    });
    for (const draw of out) draw();
  }
}

