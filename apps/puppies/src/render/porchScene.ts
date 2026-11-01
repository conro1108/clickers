/**
 * Home: the top of the hill. The front of a house at dusk, clapboard and a lit window with somebody
 * moving past it, and a porch with a light left on. Doormats down the steps, the Full Bowl by the
 * door, the Height Chart up the frame, the House Cat on the rail, the Porch Lights with their moths,
 * and on the top mat, looking at the door, the Good Dog. The door comes open a little further the
 * more of them there are.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";

type PorchId = "crumb" | "guest" | "grace" | "feast" | "house" | "whole";

const SKY_TOP = "#2a2a5a";
const SKY_LOW = "#e08a6a";
const BOARD = "#d8c8a8";
const BOARD_DARK = "#b0a080";
const BOARD_SHABBY = "#8a8478";
const SHADE = "#3a3048";
const ROOF = "#4a3440";
const TRIM = "#f4ecd8";
const DOOR = "#7a2a2a";
const DOOR_LOW = "#5a1e22";
const STEP = "#a89888";
const STEP_LOW = "#7a6c62";
const PATH = "#6e5e56";
const LAWN = "#3a5a3a";
const LAWN_LOW = "#22402e";
const WARM = "#ffd890";
const FIREFLY = "#e8f080";

export class PorchScene extends LongScene<PorchId> {
  private deck = 200;
  private doorRect = { x: 70, y: 100, w: 36, h: 100 };
  private moths: { a: number; r: number; light: number }[] = [];
  private flies: (Spot & { phase: number })[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const deck = (this.deck = Math.round(sh * 0.7));
    const h = Math.round(sh * 0.4);
    this.doorRect = { x: 70, y: deck - h, w: 36, h };
    const step = (i: number) => deck + 7 + i * 10;
    this.spots = {
      crumb: [{ x: 88, y: deck + 2 }, { x: 88, y: step(1) }, { x: 88, y: step(2) }, { x: 88, y: step(3) }],
      guest: [{ x: 32, y: deck - 12 }, { x: 150, y: deck - 12 }],
      grace: [{ x: 62, y: deck - h + 2 }, { x: 114, y: deck - h + 2 }],
      feast: [{ x: 56, y: deck + 1 }, { x: 122, y: deck + 1 }],
      house: [{ x: 66, y: deck - 3 }, { x: 110, y: deck - 3 }, { x: 110, y: deck - 24 }],
      whole: [{ x: 88, y: deck }],
    };
    this.moths = [];
    for (let i = 0; i < 6; i++) this.moths.push({ a: r() * 6.28, r: 3 + r() * 7, light: i % 2 });
    this.flies = [];
    for (let i = 0; i < 12; i++) this.flies.push({ x: 8 + r() * 160, y: deck + 8 + r() * (sh - deck - 12), phase: r() * 6 });
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, deck, doorRect: d } = this;
    const eaves = 26;
    for (let y = 0; y < sh; y++) {
      ctx.fillStyle = mix(SKY_TOP, SKY_LOW, clamp((y - 10) / 80, 0, 1));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Clapboard: every board a line, shabbier the less it's kept.
    const shabby = clamp((1 - condition) * 1.2, 0, 1);
    ctx.fillStyle = mix(BOARD, BOARD_SHABBY, shabby);
    ctx.fillRect(6, eaves, SCENE_W - 12, deck - eaves);
    ctx.fillStyle = mix(BOARD_DARK, BOARD_SHABBY, shabby * 0.7);
    for (let y = eaves + 3; y < deck; y += 5) ctx.fillRect(6, y, SCENE_W - 12, 1);
    // The porch roof's shade falling on the wall.
    ctx.fillStyle = rgba(SHADE, 0.35);
    ctx.fillRect(6, eaves, SCENE_W - 12, 14);
    // Roof and posts.
    ctx.fillStyle = ROOF;
    ctx.fillRect(0, 10, SCENE_W, 16);
    ctx.fillStyle = "#6a4a54";
    for (let y = 10; y < 26; y += 3) ctx.fillRect(0, y, SCENE_W, 1);
    ctx.fillStyle = TRIM;
    ctx.fillRect(0, 26, SCENE_W, 3);
    ctx.fillRect(4, 29, 4, deck - 29);
    ctx.fillRect(SCENE_W - 8, 29, 4, deck - 29);
    // Two windows, lit.
    for (const wx of [18, 126]) {
      ctx.fillStyle = TRIM;
      ctx.fillRect(wx - 2, deck - 74, 36, 50);
      ctx.fillStyle = WARM;
      ctx.fillRect(wx, deck - 72, 32, 46);
      ctx.fillStyle = TRIM;
      ctx.fillRect(wx + 15, deck - 72, 2, 46);
      ctx.fillRect(wx, deck - 50, 32, 2);
    }
    // The rail either side of the steps.
    ctx.fillStyle = TRIM;
    ctx.fillRect(8, deck - 11, 44, 2);
    ctx.fillRect(124, deck - 11, 44, 2);
    for (let x = 12; x < 52; x += 6) ctx.fillRect(x, deck - 10, 2, 10);
    for (let x = 126; x < 168; x += 6) ctx.fillRect(x, deck - 10, 2, 10);
    // The door frame; the door itself swings, so it's in `scene`.
    ctx.fillStyle = TRIM;
    ctx.fillRect(d.x - 4, d.y - 4, d.w + 8, d.h + 4);
    // Deck and steps, widening to the lawn.
    ctx.fillStyle = STEP;
    ctx.fillRect(0, deck, SCENE_W, 3);
    ctx.fillStyle = STEP_LOW;
    ctx.fillRect(0, deck + 3, SCENE_W, 3);
    ctx.fillStyle = LAWN;
    ctx.fillRect(0, deck + 6, SCENE_W, sh - deck - 6);
    ctx.fillStyle = LAWN_LOW;
    for (let y = deck + 8; y < sh; y += 3) for (let x = (y * 7) % 11; x < SCENE_W; x += 11) ctx.fillRect(x, y, 2, 1);
    for (let i = 0; i < 4; i++) {
      const y = deck + 6 + i * 10;
      ctx.fillStyle = STEP;
      ctx.fillRect(58 - i * 4, y, 60 + i * 8, 7);
      ctx.fillStyle = STEP_LOW;
      ctx.fillRect(58 - i * 4, y + 7, 60 + i * 8, 3);
    }
    // The garden path, on down off the bottom.
    ctx.fillStyle = PATH;
    for (let y = deck + 46; y < sh; y++) {
      const left = Math.round(58 - (y - deck - 46) * 0.7);
      ctx.fillRect(left, y, (88 - left) * 2, 1);
    }
  }

  protected scene(t: number): void {
    this.drawWindowShadow(t);
    this.drawDoor();
    this.each("house", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("crumb", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("feast", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("guest", (spot, i, broken, s) => this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 0.4 + i * 3) > 0.92 ? 1 : 0)));
    this.drawLights(t);
    this.drawDog(t);
    this.drawFlies(t);
  }

  /** Somebody in the room, going past the window, not hurrying. */
  private drawWindowShadow(t: number): void {
    const ctx = this.ctx;
    const walked = (t * 5) % 120;
    if (walked > 40) return;
    const x = Math.round(8 + walked);
    ctx.fillStyle = rgba("#6a4a30", 0.55);
    ctx.save();
    ctx.beginPath();
    ctx.rect(18, this.deck - 72, 32, 46);
    ctx.clip();
    ctx.fillRect(x, this.deck - 54, 10, 30);
    fillDisc(ctx, x + 5, this.deck - 59, 4, rgba("#6a4a30", 0.55));
    ctx.restore();
  }

  /** It opens with the fleet, inward, and the hall light comes out across the deck. */
  private drawDoor(): void {
    const ctx = this.ctx;
    const d = this.doorRect;
    const open = clamp(Math.log2(this.owned("whole") + 1) / 6, 0, 1);
    ctx.fillStyle = "#fff0c8";
    ctx.fillRect(d.x, d.y, d.w, d.h);
    const w = Math.round(d.w * (1 - open * 0.8));
    ctx.fillStyle = DOOR;
    ctx.fillRect(d.x, d.y, w, d.h);
    ctx.fillStyle = DOOR_LOW;
    for (const py of [d.y + 8, d.y + Math.round(d.h * 0.55)]) ctx.fillRect(d.x + Math.round(w * 0.16), py, Math.round(w * 0.68), Math.round(d.h * 0.32));
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(d.x + w - 4, d.y + Math.round(d.h * 0.52), 2, 2);
    if (open <= 0) return;
    ctx.fillStyle = rgba(WARM, 0.25 * open);
    for (let i = 0; i < 26; i++) ctx.fillRect(d.x + w - i, this.deck + i, d.w - w + i * 2, 1);
  }

  private drawLights(t: number): void {
    const ctx = this.ctx;
    this.each("grace", (spot, i, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y + 2, 16, WARM, 0.14 + 0.02 * Math.sin(t * 3 + i));
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      for (const m of this.moths) {
        if (m.light !== i) continue;
        m.a += this.dt * 2.4;
        ctx.fillStyle = "#e8d8c0";
        ctx.fillRect(Math.round(spot.x + Math.cos(m.a) * m.r), Math.round(spot.y + 3 + Math.sin(m.a * 1.3) * m.r * 0.6), 1, 1);
      }
    });
  }

  /** You. The tail goes. */
  private drawDog(t: number): void {
    this.each("whole", (spot, _, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 7, 11, WARM, 0.12);
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      this.ctx.fillStyle = "#c98b4b";
      this.ctx.fillRect(spot.x + 6 + Math.round(Math.sin(t * 12)), spot.y - 5, 1, 2);
    });
  }

  private drawFlies(t: number): void {
    const ctx = this.ctx;
    for (const f of this.flies) {
      const on = Math.sin(t * 1.4 + f.phase);
      if (on < 0.2) continue;
      ctx.fillStyle = rgba(FIREFLY, on);
      ctx.fillRect(Math.round(f.x + Math.sin(t * 0.3 + f.phase) * 6), Math.round(f.y + Math.cos(t * 0.4 + f.phase) * 3), 1, 1);
    }
  }
}
