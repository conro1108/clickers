/**
 * The heap (engine world `home`): the bottom of the back garden at dusk, where what nobody finished
 * goes. The back door of the house at the left, Compost Bays along the fence, Wet Sacking over them,
 * a Fairy Ring on the lawn, and a cut-away strip of soil along the front where the Worm Gang works and
 * the White Thread runs. The Seed Potato sits on the middle bay, sprouting — and over the hedge, the
 * farm, where it goes next. Low heat: the heap stops steaming and the lawn goes grey.
 */

import { POTATO_SPRITE } from "./art.js";
import { LongScene } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";

type HeapId = "crumb" | "guest" | "grace" | "feast" | "house" | "whole";

const DUSK_TOP = "#4a4a7a";
const DUSK_LOW = "#f0a070";
const FIELD = "#6a8a3a";
const FIELD_ROW = "#587a30";
const HEDGE = "#3a5a2a";
const FENCE = "#7a5a3a";
const LAWN = "#5a8a3a";
const LAWN_DULL = "#7a7a5a";
const SOIL = "#3a2a1e";
const SOIL_LIT = "#4e3828";
const BRICK = "#8a4a3a";
const DOOR_LIGHT = "#ffe8a0";

export class HeapScene extends LongScene<HeapId> {
  private horizon = 80;
  private fence = 150;
  private soil = 250;
  private worms: { x: number; y: number; dir: 1 | -1 }[] = [];
  private steam: { x: number; y: number; life: number }[] = [];

  protected layOut(random: () => number): void {
    const sh = this.sh;
    this.horizon = Math.round(sh * 0.32);
    this.fence = Math.round(sh * 0.56);
    this.soil = Math.round(sh * 0.84);
    const bay = this.fence + 14;
    this.spots = {
      crumb: [72, 100, 128, 156].map((x) => ({ x, y: bay })),
      grace: [72, 128, 156].map((x) => ({ x: x + 1, y: bay - 7 })),
      whole: [{ x: 100, y: bay - 13 }],
      feast: [52, 92, 136, 160].map((x, i) => ({ x, y: Math.round(sh * 0.74) + (i % 2) * 4 })),
      house: [40, 96, 150].map((x, i) => ({ x, y: this.soil + 10 + (i % 2) * 6 })),
      guest: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 20 + i * 26, y: this.soil + 14 + ((i * 5) % 9) })),
    };
    this.worms = this.spots.guest.map((s, i) => ({ x: s.x + random() * 10, y: s.y, dir: i % 2 ? 1 : -1 }));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, horizon, fence, soil } = this;
    const cold = clamp((1 - condition) * 1.2, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, DUSK_TOP);
    sky.addColorStop(1, DUSK_LOW);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_W, horizon);
    // The farm over the hedge: striped fields running to the horizon, the barn, a tractor going home.
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, horizon, SCENE_W, fence - horizon);
    ctx.fillStyle = FIELD_ROW;
    for (let y = horizon + 2, gap = 2; y < fence; y += gap, gap++) ctx.fillRect(0, y, SCENE_W, 1);
    ctx.fillStyle = "#8a3a2a";
    ctx.fillRect(126, horizon - 9, 16, 10);
    ctx.fillStyle = "#6a2a20";
    for (let i = 0; i < 10; i++) ctx.fillRect(124 + i, horizon - 9 - Math.min(i, 9 - i) * 0.6, 20 - i * 2, 1);
    ctx.fillStyle = "#f4ecd8";
    ctx.fillRect(132, horizon - 5, 4, 6);
    ctx.fillStyle = "#c83a3a";
    ctx.fillRect(150, horizon + 4, 5, 3);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(150, horizon + 7, 2, 1);
    ctx.fillRect(154, horizon + 7, 1, 1);
    // The hedge and fence at the bottom of the garden.
    ctx.fillStyle = HEDGE;
    ctx.fillRect(0, fence - 10, SCENE_W, 10);
    for (let x = 0; x < SCENE_W; x += 5) ctx.fillRect(x, fence - 12 + ((x * 3) % 3), 4, 2);
    ctx.fillStyle = FENCE;
    for (let x = 34; x < SCENE_W; x += 9) ctx.fillRect(x, fence - 8, 2, 10);
    ctx.fillRect(34, fence - 6, SCENE_W, 1);
    ctx.fillRect(34, fence - 2, SCENE_W, 1);
    // The lawn, greying when the heap goes cold.
    ctx.fillStyle = mix(LAWN, LAWN_DULL, cold * 0.7);
    ctx.fillRect(0, fence, SCENE_W, soil - fence);
    ctx.fillStyle = rgba("#000000", 0.08);
    for (let x = 0; x < SCENE_W; x += 7) ctx.fillRect(x + ((x * 5) % 4), fence + 8 + ((x * 11) % 40), 1, 2);
    // The back of the house: brick, the door with the kitchen light behind it, the step.
    ctx.fillStyle = BRICK;
    ctx.fillRect(0, 0, 30, soil);
    ctx.fillStyle = "#6a3a2e";
    for (let row = 0, y = 0; y < soil; row++, y += 4) {
      ctx.fillRect(0, y, 30, 1);
      for (let x = row % 2 ? 4 : 0; x < 30; x += 8) ctx.fillRect(x, y, 1, 4);
    }
    const doorTop = Math.round(sh * 0.48);
    ctx.fillStyle = DOOR_LIGHT;
    ctx.fillRect(8, doorTop, 16, soil - doorTop - 6);
    ctx.fillStyle = "#3a5a4a";
    ctx.fillRect(16, doorTop, 8, soil - doorTop - 6);
    ctx.fillStyle = "#8a8478";
    ctx.fillRect(4, soil - 6, 26, 6);
    ctx.fillStyle = rgba(DOOR_LIGHT, 0.2);
    ctx.fillRect(30, soil - 20, 30, 20);
    // The cut-away soil along the front.
    ctx.fillStyle = SOIL;
    ctx.fillRect(0, soil, SCENE_W, sh - soil);
    ctx.fillStyle = SOIL_LIT;
    ctx.fillRect(0, soil, SCENE_W, 2);
    ctx.fillStyle = "#5a4430";
    for (let x = 3; x < SCENE_W; x += 13) ctx.fillRect(x, soil + 6 + ((x * 7) % 20), 2, 1);
  }

  protected scene(t: number): void {
    this.drawThreads();
    this.each("house", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawWorms();
    this.each("crumb", (spot, _, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(1.2 * this.view.condition) && this.steam.length < 40) {
        this.steam.push({ x: spot.x - 8 + Math.random() * 16, y: spot.y - s.h, life: 2.5 });
      }
    });
    this.each("grace", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("whole", (spot, _, broken, s) => {
      const lean = broken ? 0 : Math.round(Math.sin(t * 0.6) * 0.6);
      this.stand(s, spot.x + lean, spot.y);
    });
    this.drawSteam();
    this.each("feast", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawPile(POTATO_SPRITE, 30, this.soil + 2, "crumb");
  }

  /** The White Thread: pale lines of mould joining every knot in the soil. */
  private drawThreads(): void {
    const n = this.owned("house");
    if (n <= 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = rgba("#e8f0e0", 0.5);
    const strands = Math.min(5, 1 + Math.floor(Math.log2(n)));
    for (let k = 0; k < strands; k++) {
      const base = this.soil + 6 + k * 5;
      for (let x = 0; x < SCENE_W; x++) ctx.fillRect(x, Math.round(base + Math.sin(x / (9 + k * 3) + k) * 3), 1, 1);
    }
  }

  /** The gang, nosing back and forth through the soil. */
  private drawWorms(): void {
    this.each("guest", (spot, i, broken, s) => {
      const w = this.worms[i]!;
      if (!broken) {
        w.x += w.dir * 3 * this.dt;
        if (w.x < 6 || w.x > SCENE_W - 6) w.dir = w.dir === 1 ? -1 : 1;
      }
      if (w.dir === 1) this.standFlipped(s, w.x, spot.y);
      else this.stand(s, w.x, spot.y);
    });
  }

  private drawSteam(): void {
    const ctx = this.ctx;
    for (const p of this.steam) {
      p.life -= this.dt;
      p.y -= 6 * this.dt;
      p.x += Math.sin(p.y / 6) * 3 * this.dt;
      ctx.fillStyle = rgba("#f0e8e0", Math.min(0.35, p.life * 0.15));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    this.steam = this.steam.filter((p) => p.life > 0);
  }
}
