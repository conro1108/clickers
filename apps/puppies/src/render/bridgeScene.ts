/**
 * The bridge (engine world `end`): morning, after rain, down off the hill. A river across the
 * middle, a plank bridge over it, and a rainbow with one foot on the far end. The near meadow is
 * Long Meadow and the pack waiting in it; Bridge Keepers stand at the near end and wave them over
 * one at a time (the little ones going up the planks are theirs), Sunbeams lie on the grass,
 * Collar Racks hang a collar for every dog that crosses, and at the far end the Last Dog sits and
 * waits. Past it, small, a park fence with its gate open. Low meadow: the grass goes thin and the
 * river comes up.
 */

import { PUPPY_SPRITE } from "./art.js";
import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";
import type { PackZone } from "./pack.js";
import { artCanvas } from "./pixel.js";

type BridgeId = "ember" | "ward" | "lull" | "relic" | "legion" | "last";

const SKY = ["#6a78b8", "#d8a8c8", "#ffe2b0"];
const BANDS = ["#e05050", "#f0a040", "#f0e060", "#60c060", "#5080e0", "#9060c0"];
const FAR_HI = "#a8d878";
const FAR_LO = "#78b858";
const NEAR_HI = "#7ab858";
const NEAR_LO = "#3e7a34";
const DRY = "#a8a070";
const RIVER = "#5a9ac8";
const RIVER_DEEP = "#3a6a9a";
const PLANK = "#b08a5a";
const PLANK_DARK = "#7a5a3a";
const CLOUD = "#fff4f6";

interface Crosser {
  u: number;
  speed: number;
}

export class BridgeScene extends LongScene<BridgeId> {
  protected readonly first = "ember" as const;
  private farTop = 100;
  private far = 130;
  private near = 160;
  private crossers: Crosser[] = [];
  private clouds: (Spot & { w: number })[] = [];
  private tufts: Spot[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    this.farTop = Math.round(sh * 0.36);
    const far = (this.far = Math.round(sh * 0.45));
    const near = (this.near = Math.round(sh * 0.55));
    const strip = this.stripTop;
    const lawn = (fx: number, k: number): Spot => ({ x: Math.round(SCENE_W * fx), y: Math.round(near + 6 + (strip - near) * k) });
    const flowers: Spot[] = [];
    for (let i = 0; i < 14; i++) {
      const fx = i % 2 ? 0.04 + r() * 0.36 : 0.62 + r() * 0.34;
      flowers.push(lawn(fx, 0.05 + r() * 0.95));
    }
    this.spots = {
      ember: flowers,
      ward: [lawn(0.4, 0.12), lawn(0.63, 0.14), lawn(0.34, 0.4)],
      lull: [lawn(0.2, 0.7), lawn(0.8, 0.55), lawn(0.5, 0.95)],
      relic: [lawn(0.78, 0.2), lawn(0.9, 0.42), lawn(0.14, 0.26)],
      legion: [lawn(0.5, 0.5), lawn(0.3, 0.8), lawn(0.7, 0.86), lawn(0.1, 0.56)],
      last: [{ x: 88, y: far - 1 }],
    };
    this.crossers = [];
    this.clouds = [];
    for (let i = 0; i < 5; i++) this.clouds.push({ x: r() * SCENE_W, y: 10 + r() * this.farTop * 0.6, w: 16 + Math.floor(r() * 20) });
    this.tufts = [];
    for (let i = 0; i < 60; i++) this.tufts.push({ x: Math.floor(r() * SCENE_W), y: Math.round(near + 6 + r() * (sh - near - 8)) });
  }

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 6, front: this.sh - 3, door: { x: 2, y: this.stripTop + 8 }, calm: 0.25 };
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, farTop, far, near } = this;
    const thin = clamp((1 - condition) * 1.3, 0, 1);
    for (let y = 0; y < farTop + 4; y++) {
      const k = (y / farTop) * 2;
      ctx.fillStyle = k < 1 ? mix(SKY[0]!, SKY[1]!, k) : mix(SKY[1]!, SKY[2]!, Math.min(1, k - 1));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // One foot on the far end of the bridge, and the rest of it up and away to the right.
    const cx = 88 + 66;
    const R = 66;
    BANDS.forEach((c, i) => {
      ctx.fillStyle = rgba(c, 0.8);
      const rr = R - i * 2;
      for (let a = 0; a <= 1; a += 0.004) {
        const x = cx - Math.cos(a * Math.PI) * rr;
        const y = far - 2 - Math.sin(a * Math.PI) * rr;
        if (x < SCENE_W) ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    });
    // The far side: brighter than this one, and already a park if you look.
    for (let y = farTop; y < far; y++) {
      ctx.fillStyle = mix(FAR_HI, FAR_LO, (y - farTop) / (far - farTop));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = FAR_HI;
    for (let x = 0; x < SCENE_W; x++) ctx.fillRect(x, Math.round(farTop - 3 - 3 * Math.sin(x / 23)), 1, 5);
    ctx.fillStyle = "#f7ecd8";
    for (let x = 6; x < SCENE_W; x += 5) if (x < 76 || x > 100) ctx.fillRect(x, farTop + 2, 1, 4);
    ctx.fillRect(4, farTop + 3, 72, 1);
    ctx.fillRect(100, farTop + 3, 72, 1);
    ctx.fillStyle = "#4a8a4a";
    for (const x of [22, 58, 124, 160]) {
      fillDisc(ctx, x, farTop - 5, 5, "#4a8a4a");
      ctx.fillRect(x, farTop - 1, 1, 4);
    }
    // The river. It comes up when the meadow isn't kept.
    const rise = Math.round(thin * 5);
    for (let y = far; y < near + rise; y++) {
      ctx.fillStyle = mix(RIVER, RIVER_DEEP, (y - far) / (near - far));
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    for (let y = near + rise; y < sh; y++) {
      ctx.fillStyle = mix(mix(NEAR_HI, NEAR_LO, (y - near) / (sh - near)), DRY, thin);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    for (const t of this.tufts) {
      ctx.fillStyle = "#2e5e2a";
      ctx.fillRect(t.x, t.y, 1, 2);
      ctx.fillStyle = "#c8e890";
      ctx.fillRect(t.x, t.y - 1, 1, 1);
    }
    // The bridge: planks, going over and away from you, with a rail each side.
    for (let y = far - 2; y <= near + 4; y++) {
      const k = (y - far + 2) / (near - far + 6);
      const half = Math.round(7 + k * 5);
      ctx.fillStyle = (y - far) % 3 === 0 ? PLANK_DARK : PLANK;
      ctx.fillRect(88 - half, y, half * 2, 1);
      ctx.fillStyle = PLANK_DARK;
      ctx.fillRect(88 - half - 1, y, 1, 1);
      ctx.fillRect(88 + half, y, 1, 1);
    }
    ctx.fillStyle = "#5a4028";
    for (const k of [0, 0.5, 1]) {
      const y = Math.round(far - 2 + k * (near - far + 6));
      const half = Math.round(7 + k * 5);
      ctx.fillRect(88 - half - 1, y - 6, 1, 6);
      ctx.fillRect(88 + half, y - 6, 1, 6);
    }
  }

  protected scene(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgba(CLOUD, 0.85);
    for (const c of this.clouds) {
      const x = Math.round(((c.x + t * 1.4) % (SCENE_W + 40)) - 20);
      ctx.fillRect(x, Math.round(c.y), c.w, 2);
      ctx.fillRect(x + 3, Math.round(c.y) - 2, c.w - 8, 2);
    }
    // Light on the water.
    ctx.fillStyle = rgba("#ffffff", 0.45);
    for (let i = 0; i < 14; i++) {
      const x = (i * 37 + t * (4 + (i % 3))) % SCENE_W;
      if (Math.abs(x - 88) < 14) continue;
      ctx.fillRect(Math.round(x), this.far + 2 + ((i * 5) % Math.max(1, this.near - this.far - 3)), 3 + (i % 3), 1);
    }
    this.each("last", (spot, _, broken, s) => {
      if (!broken) fillDisc(ctx, spot.x, spot.y - 4, this.primed("last") ? 14 : 10, rgba("#fff4c0", 0.25));
      this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 0.8) > 0.94 ? 1 : 0));
    });
    this.drawCrossers(t);
    this.each("lull", (spot, i, broken) => {
      if (broken) return;
      // A warm patch that never moves, and the slant of light that makes it.
      for (let y = 0; y < spot.y; y += 1) {
        const k = y / spot.y;
        ctx.fillStyle = rgba("#ffe8a0", 0.05 + 0.05 * k);
        ctx.fillRect(Math.round(spot.x + 40 - k * 40 - 4 - k * 5), y, Math.round(8 + k * 10), 1);
      }
      void i;
    });
    const props: { y: number; go: () => void }[] = [];
    this.each("lull", (spot, _, __, s) => props.push({ y: spot.y - 2, go: () => this.stand(s, spot.x, spot.y) }));
    this.each("ember", (spot, i, broken, s) =>
      props.push({ y: spot.y, go: () => this.stand(s, spot.x + (!broken && Math.sin(t * 1.2 + i) > 0.7 ? 1 : 0), spot.y) }),
    );
    this.each("relic", (spot, i, broken, s) =>
      props.push({
        y: spot.y,
        go: () => {
          this.stand(s, spot.x, spot.y);
          if (broken || Math.sin(t * (1 + this.view.condition * 2) + i * 2) < 0.8) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(spot.x - 3 + (i % 3) * 3, spot.y - 1, 1, 1);
        },
      }),
    );
    this.each("legion", (spot, i, broken, s) =>
      props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 0.6 + i * 1.7) > 0.9 ? 1 : 0)) }),
    );
    this.each("ward", (spot, i, broken, s) =>
      props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 2 + i * 2) > 0.8 ? 1 : 0)) }),
    );
    this.drawPack(props);
  }

  /** Waved over, one at a time, up the planks and into the light at the far end. */
  private drawCrossers(t: number): void {
    const keepers = this.view.working.ward ?? 0;
    if (keepers > 0 && this.crossers.length < 6 && this.chance(0.12 * Math.min(6, keepers))) {
      this.crossers.push({ u: 0, speed: 0.07 + Math.random() * 0.04 });
    }
    const pup = artCanvas(PUPPY_SPRITE);
    for (const c of this.crossers) {
      c.u += c.speed * this.dt;
      const y = this.near + 6 - c.u * (this.near - this.far + 8);
      const hop = Math.round(Math.abs(Math.sin(t * 9 + c.speed * 200)) * 2);
      this.ctx.globalAlpha = c.u > 0.85 ? clamp((1 - c.u) / 0.15, 0, 1) : 1;
      this.ctx.drawImage(pup.canvas, Math.round(88 - 3 + Math.sin(c.speed * 400) * 3), Math.round(y) - pup.h - hop);
      this.ctx.globalAlpha = 1;
    }
    this.crossers = this.crossers.filter((c) => c.u < 1);
  }
}
