/**
 * After: the far side of the bridge, and it's a park. Late afternoon for ever, hills going back in
 * rows, every gate open. Shade Trees on the rises, Paddling Pools in the dips, the Sniffing Line
 * going across the front, one dog longer for each doubling of the generations. Ball Throwers throw,
 * and the ball is up in the sky a long time. In the warm middle of it, flat out, the Sixth Chihuahua.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";

type ParkId = "loam" | "drone" | "moss" | "mire" | "kinship" | "sixth";

const SKY_TOP = "#6aa8e0";
const SKY_LOW = "#ffe0a8";
const SUN = "#fff4c0";
const HILLS = ["#a8c8a0", "#8ab880", "#6aa860"];
const LAWN_HI = "#8ac868";
const LAWN_LO = "#4e9a48";
const LAWN_DRY = "#b0a868";
const MOW = "#7aba5e";
const CLOUD = "#fffaf0";
const BALL = "#d8f048";

interface Throw {
  x0: number;
  x1: number;
  y: number;
  age: number;
}

export class ParkScene extends LongScene<ParkId> {
  private hz = 90;
  private clouds: (Spot & { w: number })[] = [];
  private throws: Throw[] = [];
  private flowers: Spot[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const hz = (this.hz = Math.round(sh * 0.4));
    const at = (fx: number, fy: number): Spot => ({ x: Math.round(SCENE_W * fx), y: Math.round(hz + (sh - hz) * fy) });
    this.spots = {
      loam: [at(0.72, 0.14), at(0.12, 0.2), at(0.46, 0.1), at(0.92, 0.3), at(0.27, 0.32)],
      drone: [at(0.56, 0.74), at(0.86, 0.62), at(0.17, 0.5)],
      moss: [at(0.14, 0.02), at(0.86, 0.04), at(0.34, -0.02), at(0.62, 0)],
      mire: [at(0.76, 0.48), at(0.34, 0.6), at(0.9, 0.82)],
      kinship: [at(0.34, 0.92), at(0.62, 0.92), at(0.9, 0.97)],
      sixth: [at(0.5, 0.52)],
    };
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push({ x: r() * SCENE_W, y: 16 + r() * (hz - 40), w: 14 + Math.floor(r() * 18) });
    this.flowers = [];
    for (let i = 0; i < 60; i++) this.flowers.push({ x: Math.floor(r() * SCENE_W), y: Math.round(hz + 6 + r() * (sh - hz - 8)) });
  }

  private hill(x: number, band: number): number {
    return Math.round(this.hz - 12 + band * 5 - (7 - band) * Math.sin(x / (34 - band * 6) + band * 2));
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, hz } = this;
    for (let y = 0; y < hz + 2; y++) {
      ctx.fillStyle = mix(SKY_TOP, SKY_LOW, y / hz);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    fillDisc(ctx, 132, hz - 38, 24, rgba(SUN, 0.2));
    fillDisc(ctx, 132, hz - 38, 12, SUN);
    HILLS.forEach((c, band) => {
      ctx.fillStyle = c;
      for (let x = 0; x < SCENE_W; x++) ctx.fillRect(x, this.hill(x, band), 1, hz + 3);
    });
    // Far gates, standing open, a long way off along the top of the last rise.
    ctx.fillStyle = "#f7ecd8";
    for (let x = 12; x < SCENE_W; x += 37) {
      const y = this.hill(x, 1);
      ctx.fillRect(x, y - 3, 1, 3);
      ctx.fillRect(x + 3, y - 3, 1, 3);
    }
    const dry = clamp((1 - condition) * 1.3, 0, 1);
    for (let y = hz; y < sh; y++) {
      ctx.fillStyle = mix(mix(LAWN_HI, LAWN_LO, (y - hz) / (sh - hz)), LAWN_DRY, dry);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Mown stripes, heading for the sun.
    ctx.fillStyle = rgba(MOW, 0.4 * (1 - dry));
    for (let i = -8; i < 10; i += 2) {
      for (let y = hz; y < sh; y++) {
        const k = (y - hz) / (sh - hz);
        ctx.fillRect(Math.round(132 + (i * 9 - 44) * (0.25 + k * 2.4)), y, Math.round(2 + k * 16), 1);
      }
    }
    for (const f of this.flowers) {
      ctx.fillStyle = f.x % 3 === 0 ? "#ffffff" : f.x % 3 === 1 ? "#ffd166" : "#ffb0d0";
      ctx.fillRect(f.x, f.y, 1, 1);
    }
  }

  protected scene(t: number): void {
    this.drawClouds(t);
    this.each("moss", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("loam", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("mire", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken && Math.sin(t * 2 + i * 3) > 0.7) {
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(spot.x - 4 + i * 3, spot.y - 4, 2, 1);
      }
    });
    this.drawSixth(t);
    this.drawThrowers();
    this.drawLine(t);
    this.drawBalls();
  }

  private drawClouds(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba(CLOUD, 0.85);
    for (const c of this.clouds) {
      const x = Math.round(((c.x + t * 1.2) % (SCENE_W + 40)) - 20);
      ctx.fillRect(x, Math.round(c.y), c.w, 2);
      ctx.fillRect(x + 3, Math.round(c.y) - 2, c.w - 8, 2);
    }
  }

  private drawSixth(t: number): void {
    this.each("sixth", (spot, _, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 3, 15, SUN, 0.18);
      this.stand(s, spot.x, spot.y);
      if (broken || Math.sin(t * 0.5) < 0.6) return;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(spot.x - 12, spot.y - s.h - 2 - Math.round((t * 2) % 3), 1, 1);
    });
  }

  private drawThrowers(): void {
    this.each("drone", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken || !this.chance(0.3) || this.throws.length > 5) return;
      this.throws.push({ x0: spot.x + 4, x1: clamp(spot.x + (i % 2 ? 70 : -70), 6, SCENE_W - 6), y: spot.y - s.h, age: 0 });
    });
  }

  /** Up, and up, and a long time coming down. */
  private drawBalls(): void {
    const ctx = this.ctx;
    for (const b of this.throws) {
      b.age += this.dt / 3.2;
      const x = b.x0 + (b.x1 - b.x0) * b.age;
      const y = b.y + (this.hz + 20 - b.y) * b.age - Math.sin(b.age * Math.PI) * (b.y - 14);
      ctx.fillStyle = BALL;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    this.throws = this.throws.filter((b) => b.age < 1);
  }

  /** The line, and it gets longer: nose to tail, off the side of the park. */
  private drawLine(t: number): void {
    const dogs = Math.min(9, Math.floor(Math.log2(this.view.generation)));
    this.each("kinship", (spot, i, broken, s) => {
      const nudge = broken ? 0 : Math.sin(t * 1.3 + i) > 0.8 ? 1 : 0;
      this.stand(s, spot.x + nudge, spot.y);
      if (i !== 0) return;
      for (let k = 1; k <= dogs; k++) this.stand(s, spot.x - k * 17, spot.y + (k % 2));
    });
  }
}
