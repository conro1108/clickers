/**
 * The store (engine world `inside`): inside a big tin shed at night, where the harvest waits. Box Stacks
 * along the back wall, the Cold Store's door at the right, Night Fans turning high on the wall, Straw
 * Clamps and Sprout Foggers on the floor, Forklifts going up and down the aisle, Storehands carrying
 * sacks to the pile at the front left. Low cool: the walls sweat and the light goes yellow.
 */

import { CRATE, SACK } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type StoreId = "fold" | "deephand" | "face" | "well" | "main" | "chorus" | "heart" | "second";

const TRUSS = "#2a2630";
const TIN = "#5e6a64";
const TIN_RIB = "#4a5450";
const TIN_LIT = "#76847c";
const SWEAT = "#3e4a3a";
const FLOOR = "#7a7468";
const FLOOR_LIT = "#948e80";
const FLOOR_DARK = "#5e5a52";
const BULB = "#ffe8a0";
const MIST = "#e8f4ee";

interface Lift {
  x: number;
  dir: 1 | -1;
  wait: number;
  loaded: boolean;
}

export class StoreScene extends LongScene<StoreId> {
  private back = 170;
  private mid = 220;
  private lane = 250;
  private front = 284;
  private hands: Carrier[] = [];
  private lifts: Lift[] = [];
  private mist: { x: number; y: number; life: number }[] = [];

  protected layOut(): void {
    const sh = this.sh;
    this.back = Math.round(sh * 0.58);
    this.mid = Math.round(sh * 0.72);
    this.lane = Math.round(sh * 0.84);
    this.front = sh - 5;
    const wall = Math.round(sh * 0.24);
    this.spots = {
      face: [44, 60, 76, 92, 108, 124, 28].map((x) => ({ x, y: this.back })),
      second: [{ x: 155, y: this.back }],
      well: [{ x: 40, y: wall }, { x: 84, y: wall }, { x: 128, y: wall - 6 }, { x: 62, y: wall - 14 }],
      chorus: [{ x: 14, y: this.back }],
      fold: [30, 70, 110, 50, 90].map((x, i) => ({ x, y: this.mid + (i % 2) * 2 })),
      heart: [{ x: 140, y: this.mid + 1 }, { x: 160, y: this.mid + 3 }, { x: 128, y: this.mid + 3 }],
      main: [0, 1, 2].map((i) => ({ x: 60 + i * 40, y: this.lane + i * 2 })),
      deephand: [0, 1, 2, 3, 4].map((i) => ({ x: 90 + i * 16, y: this.front - (i % 2) })),
    };
    this.hands = this.spots.deephand.map((s, i) => ({ x: s.x, dir: -1, loaded: i % 2 === 0, wait: i * 0.7 }));
    this.lifts = this.spots.main.map((s, i) => ({ x: s.x, dir: i % 2 ? 1 : -1, wait: i * 1.5, loaded: false }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, back } = this;
    const warm = clamp((1 - condition) * 1.3, 0, 1);
    // The tin wall, ribbed, sweating when the cool goes.
    ctx.fillStyle = mix(TIN, SWEAT, warm * 0.6);
    ctx.fillRect(0, 0, SCENE_W, back);
    for (let x = 0; x < SCENE_W; x += 6) {
      ctx.fillStyle = TIN_RIB;
      ctx.fillRect(x, 0, 1, back);
      ctx.fillStyle = TIN_LIT;
      ctx.fillRect(x + 1, 0, 1, back);
    }
    if (warm > 0.15) {
      ctx.fillStyle = rgba(SWEAT, 0.5 * warm);
      for (let x = 3; x < SCENE_W; x += 11) ctx.fillRect(x, Math.round(back * 0.3 + ((x * 7) % 23)), 2, Math.round(back * 0.5));
    }
    // Roof trusses: a dark band and a zigzag of steel.
    const roof = Math.round(sh * 0.09);
    ctx.fillStyle = TRUSS;
    ctx.fillRect(0, 0, SCENE_W, roof);
    for (let x = 0; x < SCENE_W; x++) {
      const zig = Math.abs(((x % 22) - 11));
      ctx.fillRect(x, roof + Math.round(zig * 0.5), 1, 1);
    }
    ctx.fillRect(0, roof + 6, SCENE_W, 1);
    // Bulbs on flexes, and the light they throw on the wall.
    for (const bx of [36, 96, 150]) {
      ctx.fillStyle = TRUSS;
      ctx.fillRect(bx, roof + 6, 1, 10);
      const glow = ctx.createRadialGradient(bx, roof + 18, 0, bx, roof + 18, 46);
      glow.addColorStop(0, rgba(mix(BULB, "#ffb050", warm), 0.32));
      glow.addColorStop(1, rgba(BULB, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 46, roof - 28, 92, 92);
      ctx.fillStyle = BULB;
      ctx.fillRect(bx - 1, roof + 16, 3, 3);
    }
    // The concrete, lighter toward you, with the aisle line painted down it.
    ctx.fillStyle = FLOOR_DARK;
    ctx.fillRect(0, back, SCENE_W, sh - back);
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, back + 6, SCENE_W, sh - back - 6);
    ctx.fillStyle = FLOOR_LIT;
    ctx.fillRect(0, Math.round(sh * 0.8), SCENE_W, sh);
    ctx.fillStyle = "#c8b048";
    for (let x = 2; x < SCENE_W; x += 12) ctx.fillRect(x, this.lane + 4, 7, 1);
    ctx.fillStyle = rgba("#000000", 0.18);
    ctx.fillRect(0, back, SCENE_W, 2);
  }

  protected scene(t: number): void {
    this.each("well", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      // The blades, turning: a bar drawn round the hub.
      const a = t * 9 + i;
      this.ctx.fillStyle = "#e8eef4";
      for (let r = 1; r < 4; r++) {
        this.ctx.fillRect(Math.round(spot.x + Math.cos(a) * r), Math.round(spot.y - 6 + Math.sin(a) * r), 1, 1);
        this.ctx.fillRect(Math.round(spot.x - Math.cos(a) * r), Math.round(spot.y - 6 - Math.sin(a) * r), 1, 1);
      }
    });
    this.each("chorus", (spot, _, __, s) => {
      this.stand(s, spot.x, spot.y);
      // A page for every generation: the book fattens.
      const pages = Math.min(5, Math.floor(Math.log2(Math.max(1, this.view.generation))));
      this.ctx.fillStyle = "#f4ecd8";
      for (let k = 0; k < pages; k++) this.ctx.fillRect(spot.x - 7 + k, spot.y - 10 - k, 6, 1);
    });
    // Stacked higher the more you own: to the rafters, eventually.
    const tiers = this.owned("face") >= 40 ? 3 : this.owned("face") >= 8 ? 2 : 1;
    this.each("face", (spot, i, _, s) => {
      for (let k = tiers - 1; k >= 0; k--) this.stand(s, spot.x, spot.y - (i % 2) - k * (s.h - 1));
    });
    this.each("second", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(2) && this.mist.length < 50) this.mist.push({ x: spot.x - 6 + Math.random() * 12, y: spot.y - 2, life: 1.6 });
    });
    this.each("fold", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("heart", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(3) && this.mist.length < 50) this.mist.push({ x: spot.x - 1, y: spot.y - 11, life: 2.6 });
    });
    this.drawMist();
    this.drawLifts(t);
    this.drawPile(SACK, -6, this.front + 3, "fold");
    this.drawHands(t);
  }

  /** Up and down the aisle with a box on the forks, out to the stacks and back. */
  private drawLifts(t: number): void {
    const box = artCanvas(CRATE);
    this.each("main", (spot, i, broken, s) => {
      const lift = this.lifts[i]!;
      if (!broken) {
        if (lift.wait > 0) lift.wait -= this.dt;
        else {
          lift.x += lift.dir * 14 * this.dt;
          if (lift.x < 30 || lift.x > SCENE_W - 20) {
            lift.dir = lift.dir === 1 ? -1 : 1;
            lift.loaded = !lift.loaded;
            lift.wait = 1 + Math.random() * 2;
            lift.x = clamp(lift.x, 30, SCENE_W - 20);
          }
        }
      }
      const y = spot.y;
      // Forks face the way it's going.
      if (lift.dir === -1) this.stand(s, lift.x, y);
      else this.standFlipped(s, lift.x, y);
      if (lift.loaded) {
        const fx = lift.dir === -1 ? lift.x - 8 : lift.x + 8;
        this.ctx.drawImage(box.canvas, Math.round(fx - box.w / 2), Math.round(y - 4 - box.h));
      }
      if (!broken && lift.wait <= 0 && Math.sin(t * 6 + i) > 0.8) {
        this.ctx.fillStyle = "#ff9a3a";
        this.ctx.fillRect(Math.round(lift.x + 2), y - 12, 1, 1);
      }
    });
  }

  /** Sacks from the far end of the floor to the pile, and back for more. */
  private drawHands(t: number): void {
    const sack = artCanvas(SACK);
    this.each("deephand", (spot, i, broken, s) => {
      const c = this.hands[i]!;
      const bob = this.carry(c, spot.x, 30 + (i % 3) * 6, 12, broken, t);
      this.stand(s, c.x, spot.y - bob);
      if (c.loaded) this.ctx.drawImage(sack.canvas, Math.round(c.x - sack.w / 2), Math.round(spot.y - s.h - sack.h + 3 - bob));
    });
  }

  private drawMist(): void {
    const ctx = this.ctx;
    for (const m of this.mist) {
      m.life -= this.dt;
      m.y -= 5 * this.dt;
      m.x += Math.sin(m.y / 5) * 3 * this.dt;
      ctx.fillStyle = rgba(MIST, Math.min(0.45, m.life * 0.25));
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 3, 2);
    }
    this.mist = this.mist.filter((m) => m.life > 0);
  }
}

