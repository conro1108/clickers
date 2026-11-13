/**
 * The larder (engine world `end`): the cupboard under somebody's stairs. The underside of the stairs
 * slants across the top, a bare bulb hangs on its flex, Preserves line the shelves, Vegetable Racks
 * and Paper Sacks stand on the quarry tiles, the Chest Freezer hums in the corner, Mousetraps wait
 * along the skirting, and the Errand Kid comes in from the hall for potatoes. Low dark: the blind
 * creeps up and daylight gets in.
 *
 * Sized against the Errand Kid (`figures.ts`), who has to fit through the door.
 */

import { POTATO_SPRITE } from "./art.js";
import { ADULT, errandKid } from "./figures.js";
import { LongScene, type Carrier } from "./longScene.js";
import { SCENE_W, clamp, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type LarderId = "ember" | "ward" | "lull" | "relic" | "legion" | "last";

const LIME = "#d8d0bc";
const LIME_DIM = "#b8b09c";
const STAIR = "#5e3e29";
const STAIR_LIT = "#7a5237";
const SHELF = "#7a5237";
const TILE = "#9a4a34";
const TILE_LINE = "#7a3a2a";
const HALL = "#ffe8b0";
const BULB = "#fff0b0";

export class LarderScene extends LongScene<LarderId> {
  private floor = 190;
  private front = 284;
  private kids: Carrier[] = [];
  private mouse = { x: -20, dir: 1, until: 6 };

  protected layOut(): void {
    const sh = this.sh;
    this.floor = Math.round(sh * 0.64);
    this.front = sh - 5;
    const s1 = Math.round(sh * 0.36);
    const s2 = Math.round(sh * 0.5);
    this.spots = {
      legion: [
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ x: 46 + i * 8, y: s1 })),
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ x: 42 + i * 8, y: s2 })),
      ],
      relic: [22, 40, 58].map((x) => ({ x, y: this.floor + 6 })),
      ember: [80, 94, 108, 87, 101, 122].map((x, i) => ({ x, y: Math.round(sh * (i < 3 ? 0.76 : 0.8)) })),
      last: [{ x: 146, y: Math.round(sh * 0.82) }],
      lull: [70, 110, 40].map((x) => ({ x, y: this.front - 1 })),
      ward: [{ x: 168, y: this.front }, { x: 174, y: this.front - 5 }],
    };
    this.kids = this.spots.ward.map((s, i) => ({ x: s.x, dir: -1, loaded: false, wait: 2 + i * 3 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, floor } = this;
    const light = clamp(1 - condition, 0, 1);
    // Limewashed brick.
    ctx.fillStyle = LIME;
    ctx.fillRect(0, 0, SCENE_W, floor);
    ctx.fillStyle = LIME_DIM;
    for (let row = 0, y = 0; y < floor; row++, y += 5) {
      ctx.fillRect(0, y, SCENE_W, 1);
      for (let x = row % 2 ? 5 : 0; x < SCENE_W; x += 10) ctx.fillRect(x, y, 1, 5);
    }
    // The little window, and its blind: down when it's kept dark, creeping up when it isn't.
    const wx = 10;
    const wy = Math.round(sh * 0.12);
    ctx.fillStyle = STAIR;
    ctx.fillRect(wx - 2, wy - 2, 24, 22);
    ctx.fillStyle = "#bfe0f4";
    ctx.fillRect(wx, wy, 20, 18);
    const blind = Math.round(18 * (1 - light * 0.8));
    ctx.fillStyle = "#3a3440";
    ctx.fillRect(wx, wy, 20, blind);
    ctx.fillStyle = "#2a2430";
    ctx.fillRect(wx, wy + blind - 1, 20, 1);
    if (light > 0.1) {
      ctx.fillStyle = rgba("#fff8e0", 0.25 * light);
      ctx.beginPath();
      ctx.moveTo(wx, wy + blind);
      ctx.lineTo(wx + 20, wy + blind);
      ctx.lineTo(wx + 60, floor + 20);
      ctx.lineTo(wx + 10, floor + 20);
      ctx.fill();
    }
    // Two shelves for the jars.
    for (const y of [Math.round(sh * 0.36), Math.round(sh * 0.5)]) {
      ctx.fillStyle = SHELF;
      ctx.fillRect(36, y + 1, 58, 3);
      ctx.fillStyle = STAIR_LIT;
      ctx.fillRect(36, y + 1, 58, 1);
    }
    // The underside of the stairs: a stringer from low left to high right, treads stepping up it.
    const lowY = Math.round(sh * 0.3);
    ctx.fillStyle = STAIR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(SCENE_W, 0);
    ctx.lineTo(0, lowY);
    ctx.fill();
    ctx.fillStyle = STAIR_LIT;
    for (let i = 0; i < 9; i++) {
      const x = Math.round((i / 9) * SCENE_W);
      const y = Math.round(lowY * (1 - i / 9));
      ctx.fillRect(x, y - 3, Math.round(SCENE_W / 9), 1);
    }
    // The door to the hall, ajar, light coming round it.
    const dx = SCENE_W - 14;
    const lintel = floor - Math.round(ADULT * 1.3);
    ctx.fillStyle = HALL;
    ctx.fillRect(dx, lintel, 14, floor - lintel);
    ctx.fillStyle = STAIR;
    ctx.fillRect(dx - 2, lintel - 2, 16, 2);
    ctx.fillRect(dx - 2, lintel - 2, 2, floor - lintel + 2);
    // Quarry tiles.
    ctx.fillStyle = TILE;
    ctx.fillRect(0, floor, SCENE_W, sh - floor);
    ctx.fillStyle = TILE_LINE;
    for (let y = floor; y < sh; y += 12) ctx.fillRect(0, y, SCENE_W, 1);
    for (let row = 0, y = floor; y < sh; row++, y += 12) {
      for (let x = row % 2 ? 6 : 0; x < SCENE_W; x += 12) ctx.fillRect(x, y, 1, 12);
    }
    ctx.fillStyle = rgba(HALL, 0.25);
    ctx.fillRect(dx - 20, floor, 34, sh - floor);
    // The skirting.
    ctx.fillStyle = "#4a3a30";
    ctx.fillRect(0, floor - 3, SCENE_W - 16, 3);
  }

  protected scene(t: number): void {
    this.drawBulb(t);
    this.each("legion", (spot, i, _, s) => this.stand(s, spot.x + (i % 2), spot.y));
    this.each("relic", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("ember", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("last", (spot, _, broken, s) => {
      // A hum you can see: the lid ticking.
      const hum = broken ? 0 : Math.round(Math.sin(t * 40) * 0.5);
      this.stand(s, spot.x, spot.y + hum);
    });
    this.drawPile(POTATO_SPRITE, -2, this.front + 1, "ember");
    this.each("lull", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawMouse(t);
    this.drawKids(t);
  }

  /** The bare bulb, swinging a little on its flex. */
  private drawBulb(t: number): void {
    const ctx = this.ctx;
    const x = 100 + Math.round(Math.sin(t * 0.7) * 1.2);
    const top = Math.round(this.sh * 0.12);
    const y = Math.round(this.sh * 0.26);
    ctx.fillStyle = "#2a2430";
    ctx.fillRect(100, top, 1, y - top);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 70);
    glow.addColorStop(0, rgba(BULB, 0.22));
    glow.addColorStop(1, rgba(BULB, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - 70, y - 70, 140, 140);
    ctx.fillStyle = BULB;
    ctx.fillRect(x - 1, y, 3, 4);
  }

  /** In from the hall, a potato off the pile, back out again. */
  private drawKids(t: number): void {
    const potato = artCanvas(POTATO_SPRITE);
    const mark = this.mark("ward");
    const out: (() => void)[] = [];
    this.each("ward", (spot, i, broken) => {
      const c = this.kids[i]!;
      const still = broken || c.wait > 0;
      const bob = this.carry(c, 30 + i * 12, spot.x, 14, broken, t);
      const art = errandKid(mark, still ? 0 : ((1 + (Math.floor(t * 5 + i) % 2)) as 1 | 2));
      out.unshift(() => {
        this.face(this.sprite(art, broken), c.x, spot.y - bob, c.dir);
        // Clutched to the chest.
        if (c.loaded) this.ctx.drawImage(potato.canvas, Math.round(c.x + c.dir * 5 - potato.w / 2), spot.y - bob - 19);
      });
    });
    for (const draw of out) draw();
  }

  /** A mouse along the skirting now and then. Fewer, the more traps there are. */
  private drawMouse(t: number): void {
    const m = this.mouse;
    if (t < m.until) return;
    m.x += m.dir * 40 * this.dt;
    if (m.x > SCENE_W + 10 || m.x < -20) {
      m.dir = m.dir === 1 ? -1 : 1;
      m.until = t + 8 + this.owned("lull") * 0.5 + Math.random() * 10;
      return;
    }
    const ctx = this.ctx;
    const y = this.floor - 1;
    ctx.fillStyle = "#6a6070";
    ctx.fillRect(Math.round(m.x), y - 2, 4, 2);
    ctx.fillRect(Math.round(m.x) + (m.dir === 1 ? 4 : -1), y - 2, 1, 1);
    ctx.fillRect(Math.round(m.x) + (m.dir === 1 ? -2 : 4), y - 1, 2, 1);
  }
}
