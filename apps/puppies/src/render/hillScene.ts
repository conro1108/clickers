/**
 * The hill (engine world `void`): open country, no roof, a night with every star out and the pack
 * asleep on the grass under it. The town they left is a smudge of orange at the bottom of the sky.
 * Stars come out one per dog that looks (some of them are dogs), the Milky Way is spilt across the
 * top, Constellations join up a dot per generation, Dry Stone Walls run along the slope with sheep
 * in their lee, Shepherds walk the crest counting, and over all of it the Dog Star, which is a
 * Chihuahua, and is shaking. Low dark: cloud comes over and the sky goes out.
 */

import { LongScene, fillDisc, type Spot, type Walker } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";
import type { PackZone } from "./pack.js";

type HillId = "mote" | "wisp" | "veil" | "nebula" | "aeon" | "fifth";

const SKY = ["#05071c", "#121a44", "#34306a"];
const HILL_TOP = "#24403c";
const HILL_LOW = "#16282a";
const HILL_EDGE = "#3c6456";
const MILK = "#8a86c8";
const LINE = "#6a7ab0";
const STAR = "#fff4c0";
const CLOUD = "#2a2c44";

export class HillScene extends LongScene<HillId> {
  protected readonly first = "mote" as const;
  private dim: Spot[] = [];
  private sheep: Spot[] = [];
  private herds: Walker[] = [];

  /** The top of the hill at `x`: up from the left, over, and down a little. */
  private crest(x: number): number {
    return Math.round(this.sh * 0.56 - 16 * Math.sin((x + 30) / 62) - 3 * Math.sin(x / 17));
  }

  protected layOut(r: () => number): void {
    const sky = (fx: number, fy: number): Spot => ({ x: Math.round(SCENE_W * fx), y: Math.round(this.sh * 0.5 * fy) });
    const stars: Spot[] = [];
    for (let i = 0; i < 18; i++) stars.push(sky(0.05 + r() * 0.9, 0.08 + r() * 0.78));
    const slope = (x: number, down: number): Spot => ({ x, y: this.crest(x) + down });
    this.spots = {
      mote: stars,
      wisp: [0, 1, 2].map((i) => slope(40 + i * 40, 2)),
      veil: [slope(34, 14), slope(118, 12), slope(76, 28), slope(150, 30)],
      nebula: [sky(0.24, 0.3), sky(0.56, 0.5), sky(0.84, 0.74)],
      aeon: [sky(0.2, 0.72), sky(0.76, 0.26), sky(0.4, 0.14), sky(0.6, 0.86)],
      fifth: [sky(0.66, 0.52)],
    };
    this.herds = this.spots.wisp.map((s, i) => ({ x: s.x, dir: 1, out: i % 2 === 0, wait: i * 2 }));
    this.dim = [];
    for (let i = 0; i < 70; i++) this.dim.push({ x: Math.floor(r() * SCENE_W), y: Math.floor(r() * this.sh * 0.52) });
    this.sheep = [];
    for (const w of this.spots.veil) for (let k = 0; k < 2; k++) this.sheep.push({ x: Math.round(w.x - 6 + k * 9 + r() * 3), y: w.y + 4 + k });
  }

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 4, front: this.sh - 3, door: { x: 2, y: this.stripTop + 10 }, calm: 0.75 };
  }

  protected backdrop(ctx: CanvasRenderingContext2D): void {
    const sh = this.sh;
    const low = Math.round(sh * 0.62);
    for (let y = 0; y < low; y++) {
      const k = (y / low) * 2;
      ctx.fillStyle = k < 1 ? mix(SKY[0]!, SKY[1]!, k) : mix(SKY[1]!, SKY[2]!, k - 1);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    for (const s of this.dim) {
      ctx.fillStyle = rgba("#c8c8ff", 0.35 + ((s.x * 7 + s.y) % 5) / 10);
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    // The town, a long way back and a long way down.
    fillDisc(ctx, 12, this.crest(0) + 2, 12, rgba("#ff9a3c", 0.06));
    fillDisc(ctx, 12, this.crest(0) + 2, 7, rgba("#ff9a3c", 0.06));
    ctx.fillStyle = "#ffb060";
    for (let i = 0; i < 6; i++) ctx.fillRect(2 + i * 4 + (i % 2), this.crest(0) - 3 + (i % 3), 1, 1);
    for (let x = 0; x < SCENE_W; x++) {
      const top = this.crest(x);
      for (let y = top; y < sh; y++) {
        ctx.fillStyle = y === top ? HILL_EDGE : mix(HILL_TOP, HILL_LOW, (y - top) / (sh - top));
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = rgba("#6a9a7a", 0.5);
    for (let i = 0; i < 60; i++) {
      const x = (i * 53) % SCENE_W;
      ctx.fillRect(x, this.crest(x) + 6 + ((i * 29) % Math.max(1, sh - this.crest(x) - 8)), 1, 2);
    }
  }

  protected scene(t: number): void {
    const ctx = this.ctx;
    const dark = clamp(this.view.condition, 0, 1);
    this.drawMilk(dark);
    this.each("aeon", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      // A dot per doubling of the generations, joined up. It's a dog. It's always a dog.
      const dots = Math.min(7, Math.floor(Math.log2(Math.max(1, this.view.generation))) + 1);
      let px = spot.x + 5;
      let py = spot.y - 2;
      for (let k = 0; k < dots; k++) {
        const nx = px + 5 + ((i + k) % 3);
        const ny = py + (((i * 3 + k * 5) % 5) - 2);
        ctx.fillStyle = LINE;
        const steps = Math.max(Math.abs(nx - px), Math.abs(ny - py));
        for (let q = 1; q < steps; q++) ctx.fillRect(Math.round(px + ((nx - px) * q) / steps), Math.round(py + ((ny - py) * q) / steps), 1, 1);
        ctx.fillStyle = STAR;
        ctx.fillRect(nx, ny, 1, 1);
        px = nx;
        py = ny;
      }
    });
    this.each("mote", (spot, i, broken, s) => {
      if (!broken) fillDisc(ctx, spot.x, spot.y - 3, 5 + (Math.sin(t * 1.7 + i * 2.3) > 0.6 ? 1 : 0), rgba("#a8b8ff", 0.14));
      this.stand(s, spot.x + (!broken && Math.sin(t * 3 + i) > 0.9 ? 1 : 0), spot.y);
    });
    this.each("fifth", (spot, _, broken, s) => {
      const n = this.view.working.fifth ?? 0;
      const reach = 10 + Math.min(16, Math.log2(1 + n) * 3);
      // It is shaking. It stops when there are a hundred of it.
      const shake = broken || this.primed("fifth") ? 0 : Math.round(Math.sin(t * 40));
      if (!broken) {
        fillDisc(ctx, spot.x, spot.y - 4, reach, rgba(STAR, 0.08));
        fillDisc(ctx, spot.x, spot.y - 4, reach * 0.55, rgba(STAR, 0.1));
        ctx.fillStyle = rgba(STAR, 0.5);
        ctx.fillRect(spot.x - Math.round(reach), spot.y - 4, Math.round(reach) * 2, 1);
        ctx.fillRect(spot.x, spot.y - 4 - Math.round(reach), 1, Math.round(reach) * 2);
      }
      this.stand(s, spot.x + shake, spot.y);
    });
    // Cloud, when the dark isn't kept.
    if (dark < 1) {
      for (let i = 0; i < 7; i++) {
        const y = Math.round(this.sh * 0.5 * (0.1 + i * 0.13));
        const x = Math.round(((i * 61 + t * (2 + (i % 3))) % (SCENE_W + 120)) - 100);
        ctx.fillStyle = rgba(CLOUD, 0.9 * (1 - dark));
        ctx.fillRect(x, y, 90, 7);
        ctx.fillRect(x + 12, y - 4, 60, 4);
        ctx.fillRect(x + 20, y + 7, 54, 3);
      }
    }

    const props: { y: number; go: () => void }[] = [];
    this.each("veil", (spot, _, __, s) => props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y) }));
    const walls = Math.min(this.spots.veil.length, this.owned("veil"));
    for (let i = 0; i < walls * 2 && i < this.sheep.length; i++) {
      const sh = this.sheep[i]!;
      props.push({
        y: sh.y,
        go: () => {
          ctx.fillStyle = "#d8d8d0";
          ctx.fillRect(sh.x, sh.y - 4, 6, 3);
          ctx.fillRect(sh.x + 1, sh.y - 5, 4, 1);
          ctx.fillStyle = "#2a2a30";
          ctx.fillRect(sh.x + (i % 2 ? 5 : -1), sh.y - 4, 2, 2);
          ctx.fillRect(sh.x + 1, sh.y - 1, 1, 1);
          ctx.fillRect(sh.x + 4, sh.y - 1, 1, 1);
        },
      });
    }
    this.each("wisp", (_, i, broken, s) => {
      const w = this.herds[i]!;
      const bob = this.pace(w, 12 + i * 20, SCENE_W - 20 - i * 14, 6, broken, t);
      const y = this.crest(Math.round(w.x)) + 3;
      props.push({
        y,
        go: () => {
          if (w.dir === -1) this.standFlipped(s, w.x, y - bob);
          else this.stand(s, w.x, y - bob);
        },
      });
    });
    this.drawPack(props);
  }

  /** A spilt bowl, right across the sky, and only as bright as the dark is kept. */
  private drawMilk(dark: number): void {
    const ctx = this.ctx;
    let lit = 0;
    this.each("nebula", (spot, _, broken, s) => {
      if (!broken) lit++;
      this.stand(s, spot.x, spot.y);
    });
    if (lit === 0) return;
    const alpha = (0.07 + 0.05 * lit) * dark * dark;
    const top = Math.round(this.sh * 0.5);
    for (let x = 0; x < SCENE_W; x += 2) {
      const y = Math.round(top * (0.08 + (x / SCENE_W) * 0.72));
      const w = 9 + Math.round(5 * Math.sin(x / 19));
      ctx.fillStyle = rgba(MILK, alpha);
      ctx.fillRect(x, y - w, 2, w * 2);
      ctx.fillStyle = rgba("#d8d0ff", alpha);
      ctx.fillRect(x, y - (w >> 1), 2, w);
    }
  }
}
