/**
 * The market (engine world `origin`): a Victorian market hall at five in the morning. Dawn through the
 * glass roof, green iron columns, the Price Board clattering on the back wall, Opening Bells hung from
 * the girders, the Family Pitch's painted boards, rows of striped Market Stalls, Brass Scales on their
 * tables, and Porters barrowing crates to the pile. Low trade: litter on the flags.
 */

import { CRATE } from "./art.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type MarketId = "dawn" | "elder" | "root" | "spring" | "hearth" | "first";

const DAWN_TOP = "#f0a878";
const DAWN_LOW = "#ffe0b0";
const IRON = "#2e5a48";
const IRON_LIT = "#4a7a64";
const BRICK = "#9a5a44";
const BRICK_LINE = "#7a4434";
const FLAG = "#8a8478";
const FLAG_LINE = "#6e6a60";
const FLAG_LIT = "#a29c90";
const DIGIT = "#ffd166";

/** Three-by-five digits for the board, as bitmasks per row. */
const DIGITS: readonly number[][] = [
  [7, 5, 5, 5, 7], [2, 6, 2, 2, 7], [7, 1, 7, 4, 7], [7, 1, 3, 1, 7], [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7], [7, 4, 7, 5, 7], [7, 1, 1, 2, 2], [7, 5, 7, 5, 7], [7, 5, 7, 1, 7],
];

export class MarketScene extends LongScene<MarketId> {
  private roof = 50;
  private wall = 150;
  private back = 180;
  private front = 284;
  private porters: Carrier[] = [];
  private board: number[] = [];
  private nextFlip = 0;
  private litter: { x: number; y: number; c: string }[] = [];

  protected layOut(random: () => number): void {
    const sh = this.sh;
    this.roof = Math.round(sh * 0.18);
    this.wall = Math.round(sh * 0.56);
    this.back = Math.round(sh * 0.64);
    this.front = sh - 5;
    this.spots = {
      first: [{ x: 88, y: Math.round(sh * 0.47) }],
      root: [{ x: 88, y: this.roof + 18 }, { x: 34, y: this.roof + 24 }, { x: 142, y: this.roof + 24 }],
      hearth: [{ x: 26, y: Math.round(sh * 0.45) }, { x: 150, y: Math.round(sh * 0.45) }],
      dawn: [22, 50, 78, 106, 134, 162, 36, 92, 148].map((x, i) => ({ x, y: i < 6 ? this.back : Math.round(sh * 0.76) })),
      spring: [64, 120, 8].map((x) => ({ x, y: Math.round(sh * 0.83) })),
      elder: [0, 1, 2, 3].map((i) => ({ x: 110 + i * 16, y: this.front - (i % 2) })),
    };
    this.porters = this.spots.elder.map((s, i) => ({ x: s.x, dir: -1, loaded: i % 2 === 1, wait: i * 0.8 }));
    this.board = Array.from({ length: 30 }, () => Math.floor(random() * 10));
    this.litter = Array.from({ length: 14 }, () => ({
      x: Math.floor(random() * SCENE_W),
      y: Math.round(this.back + 6 + random() * (sh - this.back - 10)),
      c: random() < 0.5 ? "#6aa348" : "#f4f0e4",
    }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, roof, wall } = this;
    // Dawn through the glass roof.
    const sky = ctx.createLinearGradient(0, 0, 0, roof);
    sky.addColorStop(0, DAWN_TOP);
    sky.addColorStop(1, DAWN_LOW);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_W, roof);
    ctx.fillStyle = IRON;
    for (let x = 0; x < SCENE_W; x += 12) ctx.fillRect(x, 0, 1, roof);
    for (let y = 0; y < roof; y += 9) ctx.fillRect(0, y, SCENE_W, 1);
    // A girder under the roof, arched between the columns.
    ctx.fillRect(0, roof, SCENE_W, 3);
    ctx.fillStyle = IRON_LIT;
    ctx.fillRect(0, roof, SCENE_W, 1);
    // Brick back wall, with the light coming down on it.
    ctx.fillStyle = BRICK;
    ctx.fillRect(0, roof + 3, SCENE_W, wall - roof - 3);
    ctx.fillStyle = BRICK_LINE;
    for (let row = 0, y = roof + 3; y < wall; row++, y += 4) {
      ctx.fillRect(0, y, SCENE_W, 1);
      for (let x = row % 2 ? 4 : 0; x < SCENE_W; x += 8) ctx.fillRect(x, y, 1, 4);
    }
    const light = ctx.createLinearGradient(0, roof, 0, wall);
    light.addColorStop(0, rgba(DAWN_LOW, 0.35));
    light.addColorStop(1, rgba(DAWN_LOW, 0));
    ctx.fillStyle = light;
    ctx.fillRect(0, roof, SCENE_W, wall - roof);
    // Iron columns, floor to roof.
    for (const x of [2, 58, 116, 172]) {
      ctx.fillStyle = IRON;
      ctx.fillRect(x - 2, roof, 4, sh - roof);
      ctx.fillStyle = IRON_LIT;
      ctx.fillRect(x - 2, roof, 1, sh - roof);
      ctx.fillStyle = IRON;
      ctx.fillRect(x - 4, roof + 3, 8, 2);
    }
    // Flagstones.
    ctx.fillStyle = FLAG;
    ctx.fillRect(0, wall, SCENE_W, sh - wall);
    ctx.fillStyle = FLAG_LIT;
    ctx.fillRect(0, Math.round(sh * 0.86), SCENE_W, sh);
    ctx.fillStyle = FLAG_LINE;
    for (let row = 0, y = wall; y < sh; row++, y += 9) {
      ctx.fillRect(0, y, SCENE_W, 1);
      for (let x = row % 2 ? 9 : 0; x < SCENE_W; x += 18) ctx.fillRect(x, y, 1, 9);
    }
    // Litter, more of it the worse trade gets.
    const mess = clamp(1 - condition, 0, 1);
    for (const [i, bit] of this.litter.entries()) {
      if (i / this.litter.length >= mess * 1.4) break;
      ctx.fillStyle = bit.c;
      ctx.fillRect(bit.x, bit.y, 2, 1);
    }
  }

  protected scene(t: number): void {
    this.drawBoard(t);
    this.each("root", (spot, i, broken, s) => {
      const ctx = this.ctx;
      ctx.fillStyle = IRON;
      ctx.fillRect(spot.x, this.roof + 3, 1, spot.y - s.h - this.roof - 2);
      // The bell rung at five: a swing, once a minute or so.
      const swing = broken ? 0 : Math.round(Math.sin(t * 6) * (Math.sin(t * 0.1 + i) > 0.95 ? 2 : 0));
      this.stand(s, spot.x + swing, spot.y);
    });
    this.each("hearth", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("dawn", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("spring", (spot, i, broken, s) => {
      const ctx = this.ctx;
      ctx.fillStyle = "#7a5237";
      ctx.fillRect(spot.x - 8, spot.y, 16, 2);
      ctx.fillRect(spot.x - 7, spot.y + 2, 1, 6);
      ctx.fillRect(spot.x + 6, spot.y + 2, 1, 6);
      const tip = broken ? 0 : Math.round(Math.sin(t * 1.5 + i * 2));
      this.stand(s, spot.x, spot.y);
      ctx.fillStyle = "#c98b4b";
      ctx.fillRect(spot.x - 5, spot.y - 10 + tip, 3, 1);
    });
    this.drawPile(CRATE, -6, this.front + 3, "dawn");
    this.drawPorters(t);
  }

  /** The board, flipping a digit at a time: what a potato is worth, changing while you watch. */
  private drawBoard(t: number): void {
    const n = this.owned("first");
    this.each("first", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && t > this.nextFlip) {
        this.board[Math.floor(Math.random() * this.board.length)] = Math.floor(Math.random() * 10);
        this.nextFlip = t + Math.max(0.08, 0.6 / Math.max(1, Math.log2(n + 1)));
      }
      const ctx = this.ctx;
      const left = spot.x - Math.floor(s.w / 2);
      const top = spot.y - s.h + 1;
      ctx.fillStyle = DIGIT;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          const d = DIGITS[this.board[row * 5 + col]!]!;
          const cx = left + 2 + col * 8 + 2;
          const cy = top + 2 + row * 8 + 1;
          for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (d[y]! & (4 >> x)) ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    });
  }

  /** Crates on a sack barrow, from the stalls at the far end to the pile. */
  private drawPorters(t: number): void {
    const crate = artCanvas(CRATE);
    const ctx = this.ctx;
    this.each("elder", (spot, i, broken, s) => {
      const c = this.porters[i]!;
      const bob = this.carry(c, spot.x + 20, 34 + (i % 2) * 8, 10, broken, t);
      this.stand(s, c.x, spot.y - bob);
      // The barrow, out in front.
      const bx = Math.round(c.x + c.dir * 7);
      ctx.fillStyle = "#3a3a44";
      ctx.fillRect(bx, spot.y - 9, 1, 9);
      ctx.fillRect(bx - 1, spot.y - 1, 3, 2);
      if (c.loaded) ctx.drawImage(crate.canvas, Math.round(bx - crate.w / 2 + c.dir * 2), Math.round(spot.y - crate.h - 1));
    });
  }
}
