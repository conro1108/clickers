/**
 * The fire (engine world `origin`): where the canal runs out, at the edge of a wood, at dawn.
 * Somebody is camped here. Camp Fires in the clearing with Campers going between them and the
 * Tents at the left, Bone Piles thrown out towards the trees (and the foxes' eyes that come for
 * them), a Cold Spring at the right, and the Old Dog lying by the first fire showing the rest how
 * it's done. The pack sits along the front, at the edge of the light, deciding. Low camp: the cold
 * comes in blue and the fires burn small.
 */

import { LongScene, fillDisc, type Spot, type Walker } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./millScene.js";
import type { PackZone } from "./pack.js";

type FireId = "dawn" | "elder" | "root" | "spring" | "hearth" | "first";

const SKY = ["#1e1838", "#5a3a6a", "#e0786a", "#ffc878"];
const SUN = "#fff0b0";
const HILL = "#7a4a5a";
const PINE_FAR = "#3a2836";
const PINE_NEAR = "#1e1620";
const GROUND = ["#4a3c2c", "#74623e", "#5c4c34"];
const WORN = "#8a7450";
const FIRELIGHT = "#ff9a4a";
const COLD = "#3a4a6a";
const EYES = "#ffd166";

export class FireScene extends LongScene<FireId> {
  protected readonly first = "dawn" as const;
  private hz = 110;
  private heart: Spot = { x: 92, y: 180 };
  private campers: Walker[] = [];
  private eyes: Spot[] = [];
  private tufts: Spot[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const hz = (this.hz = Math.round(sh * 0.36));
    const strip = this.stripTop;
    const cy = Math.round(hz + (strip - hz) * 0.58);
    const c = (this.heart = { x: 92, y: cy });
    this.spots = {
      dawn: [c, { x: c.x - 30, y: cy + 12 }, { x: c.x + 30, y: cy + 9 }, { x: c.x - 14, y: cy - 16 }, { x: c.x + 16, y: cy - 14 }, { x: c.x + 52, y: cy - 6 }],
      elder: [0, 1, 2, 3].map((i) => ({ x: c.x - 10 + i * 6, y: cy + 4 + (i % 2) * 5 })),
      root: [
        { x: 132, y: hz + 9 },
        { x: 156, y: hz + 12 },
        { x: 112, y: hz + 12 },
        { x: 170, y: hz + 8 },
      ],
      spring: [
        { x: 158, y: cy + 2 },
        { x: 168, y: cy + 18 },
        { x: 144, y: cy + 24 },
      ],
      hearth: [
        { x: 26, y: hz + 26 },
        { x: 48, y: hz + 18 },
        { x: 14, y: cy + 4 },
        { x: 40, y: cy - 2 },
        { x: 62, y: hz + 30 },
        { x: 24, y: cy + 22 },
      ],
      first: [
        { x: c.x + 13, y: cy + 5 },
        { x: c.x - 16, y: cy + 6 },
        { x: c.x + 2, y: cy + 15 },
      ],
    };
    this.campers = this.spots.elder.map((s, i) => ({ x: s.x, dir: -1, out: i % 2 === 0, wait: i * 1.7 }));
    this.eyes = [];
    for (let i = 0; i < 7; i++) this.eyes.push({ x: Math.round(96 + r() * 76), y: Math.round(hz - 3 - r() * 9) });
    this.tufts = [];
    for (let i = 0; i < 70; i++) this.tufts.push({ x: Math.floor(r() * SCENE_W), y: Math.round(hz + 8 + r() * (sh - hz - 10)) });
  }

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 6, front: this.sh - 3, door: { x: 2, y: this.stripTop + 8 }, calm: 0.3 };
  }

  private pine(ctx: CanvasRenderingContext2D, x: number, base: number, h: number): void {
    for (let i = 0; i < h; i++) {
      const half = Math.min(8, Math.floor((i % 6) * 0.7 + i * 0.2));
      ctx.fillRect(x - half, base - h + i, half * 2 + 1, 1);
    }
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, hz } = this;
    for (let y = 0; y < hz; y++) {
      const k = (y / hz) * (SKY.length - 1);
      const i = Math.min(SKY.length - 2, Math.floor(k));
      ctx.fillStyle = mix(SKY[i]!, SKY[i + 1]!, k - i);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = "#e8e0f0";
    for (let i = 0; i < 16; i++) ctx.fillRect((i * 41) % SCENE_W, (i * 13) % Math.round(hz * 0.3), 1, 1);
    fillDisc(ctx, 118, hz - 20, 24, rgba("#ffd890", 0.22));
    fillDisc(ctx, 118, hz - 18, 9, SUN);
    ctx.fillStyle = HILL;
    for (let x = 0; x < SCENE_W; x++) ctx.fillRect(x, Math.round(hz - 16 - 8 * Math.sin(x / 31) - 4 * Math.sin(x / 11 + 2)), 1, 30);
    ctx.fillStyle = PINE_FAR;
    for (let x = 4; x < SCENE_W; x += 11) this.pine(ctx, x + ((x * 3) % 5), hz, 30 + ((x * 7) % 16));
    ctx.fillStyle = PINE_NEAR;
    for (let x = -2; x < SCENE_W + 6; x += 15) this.pine(ctx, x + ((x * 5) % 7), hz + 4, 44 + ((x * 11) % 24));
    ctx.fillRect(0, hz - 2, SCENE_W, 8);

    for (let y = hz + 4; y < sh; y++) {
      const k = ((y - hz) / (sh - hz)) * 2;
      ctx.fillStyle = k < 1 ? mix(GROUND[0]!, GROUND[1]!, k) : mix(GROUND[1]!, GROUND[2]!, k - 1);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Where the canal gives out: the last lock, and the last of the water, off to the left.
    ctx.fillStyle = "#3d7682";
    ctx.fillRect(0, hz + 6, 22, 9);
    ctx.fillStyle = "#9ac0b0";
    ctx.fillRect(2, hz + 8, 12, 1);
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(20, hz + 2, 3, 15);
    ctx.fillRect(12, hz + 2, 16, 2);
    // The clearing, worn round the fire.
    const c = this.heart;
    for (let dy = -22; dy <= 22; dy++) {
      const half = Math.round(64 * Math.sqrt(1 - (dy * dy) / 484));
      ctx.fillStyle = rgba(WORN, 0.4 * (1 - Math.abs(dy) / 26));
      ctx.fillRect(c.x - half, c.y + dy, half * 2, 1);
    }
    for (const t of this.tufts) {
      ctx.fillStyle = "#8a7a4a";
      ctx.fillRect(t.x, t.y, 1, 2);
      ctx.fillStyle = "#c8c0a8";
      ctx.fillRect(t.x, t.y - 1, 1, 1);
    }
    const cold = clamp((1 - condition) * 1.2, 0, 1);
    if (cold > 0) {
      ctx.fillStyle = rgba(COLD, 0.42 * cold);
      ctx.fillRect(0, 0, SCENE_W, sh);
    }
  }

  protected scene(t: number): void {
    const ctx = this.ctx;
    const warm = clamp(this.view.condition, 0.3, 1);
    // What comes for the bones.
    const watching = Math.min(this.eyes.length, this.owned("root") > 0 ? 2 + Math.floor(Math.log2(1 + this.owned("root"))) : 0);
    for (let i = 0; i < watching; i++) {
      const e = this.eyes[i]!;
      if (Math.sin(t * 0.7 + i * 2.1) > 0.92) continue;
      ctx.fillStyle = EYES;
      ctx.fillRect(e.x, e.y, 1, 1);
      ctx.fillRect(e.x + 3, e.y, 1, 1);
    }
    this.each("root", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.each("spring", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken || Math.sin(t * 2.2 + i * 3) < 0.75) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(spot.x - 2 + (i % 3), spot.y - 3, 1, 1);
    });

    const props: { y: number; go: () => void }[] = [];
    const tents: Spot[] = [];
    this.each("hearth", (spot, _, __, s) => {
      tents.push(spot);
      props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y) });
    });
    // It is starting to look like a festival: a pennant for every doubling of the generations.
    if (tents.length >= 2) {
      const [a, b] = [tents[0]!, tents[1]!];
      const flags = Math.min(9, Math.floor(Math.log2(Math.max(1, this.view.generation))) + 1);
      props.push({
        y: Math.max(a.y, b.y) + 1,
        go: () => {
          for (let k = 0; k <= 12; k++) {
            const x = Math.round(a.x + ((b.x - a.x) * k) / 12);
            const y = Math.round(a.y - 9 + ((b.y - a.y) * k) / 12 + Math.sin((k / 12) * Math.PI) * 3);
            ctx.fillStyle = "#2a2018";
            ctx.fillRect(x, y, 1, 1);
            if (k > 0 && k < 12 && k <= flags) {
              ctx.fillStyle = ["#e04a4a", "#ffd166", "#4a8ae0"][k % 3]!;
              ctx.fillRect(x, y + 1, 1, 2);
            }
          }
        },
      });
    }
    this.each("dawn", (spot, i, broken, s) => {
      props.push({
        y: spot.y,
        go: () => {
          if (broken) {
            this.stand(s, spot.x, spot.y);
            return;
          }
          const r = (i === 0 ? 30 : 16) * warm;
          fillDisc(ctx, spot.x, spot.y - 2, r + Math.sin(t * 7 + i) * 1.5, rgba(FIRELIGHT, 0.13));
          fillDisc(ctx, spot.x, spot.y - 2, r * 0.5, rgba(FIRELIGHT, 0.12));
          this.stand(s, spot.x, spot.y - (Math.sin(t * 9 + i * 2) > 0.3 ? 1 : 0));
          for (let k = 0; k < (i === 0 ? 5 : 2); k++) {
            const p = (t * 0.5 + k / 5 + i * 0.3) % 1;
            ctx.fillStyle = k % 2 ? rgba("#c8c0c0", 0.4 * (1 - p)) : rgba("#ffc04a", 1 - p);
            ctx.fillRect(Math.round(spot.x + Math.sin(t * 1.3 + k * 2) * 3 + p * 4), Math.round(spot.y - 9 - p * (k % 2 ? 34 : 14)), k % 2 ? 2 : 1, k % 2 ? 2 : 1);
          }
        },
      });
    });
    this.each("first", (spot, i, broken, s) =>
      props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 0.5 + i * 2) > 0.93 ? 1 : 0)) }),
    );
    this.each("elder", (spot, i, broken, s) => {
      const w = this.campers[i]!;
      const home = this.spots.hearth[i % this.spots.hearth.length]!;
      const bob = this.pace(w, home.x + 10, spot.x, 9, broken, t);
      const k = clamp((w.x - home.x - 10) / Math.max(1, spot.x - home.x - 10), 0, 1);
      const y = Math.round(home.y + 3 + (spot.y - home.y - 3) * k);
      props.push({
        y,
        go: () => {
          if (w.dir === -1) this.standFlipped(s, w.x, y - bob);
          else this.stand(s, w.x, y - bob);
          // A bit of sausage, going just past where the light ends.
          if (broken || w.wait <= 0 || w.out) return;
          const p = (t * 0.6 + i * 0.4) % 1;
          ctx.fillStyle = "#c0704a";
          ctx.fillRect(Math.round(w.x + 4 + p * 16), Math.round(y - 8 - Math.sin(p * Math.PI) * 9 + p * 14), 2, 1);
        },
      });
    });
    this.drawPack(props);
  }
}
