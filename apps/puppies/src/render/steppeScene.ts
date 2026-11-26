/**
 * Long ago (engine world `wild`): the steppe, fifteen thousand years back, at the blue end of a winter
 * day. Snow to the edge of the world, the ice sheet along the bottom of the sky, a tor of old rock on
 * the left, and wolves. That's all, at first. Rung by rung a people's camp fills in round them: Flint
 * Scraps left in the snow at the edge of it, Ochre Hands up the tor, Bone Windbreaks on the windward
 * side, Tusk Huts with their doors lit, the Mammoth Herd going by along the ice, the Shared Trail up
 * from where the wolves are, the Wolf Moon (and a wolf on the tor under it), Painted Caves in the foot
 * of the rock, Grandmothers at the hut doors and, by each, chin on paws, the First Dog. The pack is
 * wolves here, and the more First Dogs there are, the more of it has turned into dogs. The aurora
 * comes out as the place fills. Low warmth: the sky greys over, the glow goes, and it snows sideways.
 */

import { DOG_COAT, POSE, WOLF_POSES, WOLF_PUP, ZZZ } from "./art.js";
import { LongScene, fillDisc, shownSome, type Spot } from "./longScene.js";
import { PACK_STRIDE, SCENE_W, clamp, fract, mix, rgba, type PackPup } from "./millScene.js";
import { Pack, type PackZone } from "./pack.js";
import { artCanvas, type Art } from "./pixel.js";

type SteppeId = "flint" | "ochre" | "cairn" | "tusk" | "herd" | "trail" | "moon" | "cave" | "ancestor" | "eighth";
const IDS: readonly SteppeId[] = ["flint", "ochre", "cairn", "tusk", "herd", "trail", "moon", "cave", "ancestor", "eighth"];

const SKY = ["#1c2450", "#34467e", "#6a7cb4", "#b4aed0", "#eec4bc"];
const OVERCAST = "#7a8298";
const DUSK = "#ffb89a";
const ICE = "#b8c8e4";
const ICE_LINE = "#8ea4cc";
const ICE_TOP = "#f4f8ff";
const PEAK = "#8090b8";
const SNOW_FAR = "#cfd2e6";
const SNOW_NEAR = "#eef2fa";
const SNOW_COLD = "#b4bed4";
const DRIFT = "#a8b4d4";
const GRASS = "#c4a466";
const GRASS_DARK = "#8a7046";
const ROCK = "#646a84";
const ROCK_LIT = "#9a8ca8";
const ROCK_DARK = "#444962";
const CAP = "#f4f6fc";
const FIRE = "#ffa04a";
const AURORA = "#6ae8b4";
const AURORA_TOP = "#8a7ad8";
const MOONLIGHT = "#fff6dc";
const INK = "#2a2c3e";

/** The pack, long ago: wolves, a third as many as there'd be dogs, so the place stays empty. */
class Wolves extends Pack {
  /** How much of the pack has turned into dogs, 0..1. */
  tame = 0;
  private at = 0;

  override step(dt: number, t: number, want: number, z: PackZone): void {
    this.at = t;
    super.step(dt, t, want > 0 ? Math.max(3, Math.round(want / 3)) : 0, z);
  }

  override queue(ctx: CanvasRenderingContext2D): { y: number; go: () => void }[] {
    return this.dogs.map((d) => ({ y: d.y, go: () => this.drawWolf(ctx, d) }));
  }

  private drawWolf(ctx: CanvasRenderingContext2D, d: PackPup): void {
    const step = Math.floor(d.walked / PACK_STRIDE) % 2;
    const pose =
      d.doing === "sit"
        ? POSE.sit + (Math.floor(this.at * 0.7 + d.x) % 2)
        : d.doing === "rest"
          ? POSE.loaf
          : d.doing === "sleep"
            ? POSE.sleep
            : d.doing === "zoom"
              ? POSE.run + step
              : POSE.trot + step;
    // Stable per wolf: whether this one is a dog yet.
    const dog = fract(Math.sin(d.born * 12.9898 + d.home * 78.233) * 43758.5453) < this.tame;
    const coat = dog ? DOG_COAT : d.coat % DOG_COAT;
    const s = artCanvas(WOLF_POSES[coat]![d.vx < 0 ? 1 : 0]![pose]!);
    const x = Math.round(d.x);
    const y = Math.round(d.y);
    ctx.fillStyle = rgba("#7888b0", 0.35);
    ctx.fillRect(x + 2, y, s.w - 4, 1);
    const bob = d.doing === "zoom" ? Math.round(Math.abs(Math.sin(d.walked / 7)) * 2) : d.doing === "trot" && step === 1 ? 1 : 0;
    ctx.drawImage(s.canvas, x, y - s.h + 1 - bob);
    if (d.doing === "sleep") {
      const z = artCanvas(ZZZ);
      const p = fract(this.at / 3.6 + d.x * 0.11);
      if (p < 0.75) {
        ctx.globalAlpha = 0.85 * (1 - p * p);
        ctx.drawImage(z.canvas, x + (d.vx < 0 ? -2 : s.w - 2), Math.round(y - s.h - 1 - p * 7));
        ctx.globalAlpha = 1;
      }
    }
  }
}

interface Flake {
  x: number;
  y: number;
  speed: number;
  big: boolean;
}

export class SteppeScene extends LongScene<SteppeId> {
  protected readonly first = "flint" as const;
  protected override pack = new Wolves();
  private hz = 130;
  private tor = { base: 180, top: 100 };
  private herdX: number[] = [];
  private flakes: Flake[] = [];
  private tufts: (Spot & { tall: boolean })[] = [];
  private drifts: (Spot & { w: number })[] = [];
  /** The tor, painted with the backdrop but drawn over the herd, which goes behind it. */
  private torPaper = document.createElement("canvas");

  protected override get tapArt(): Art {
    return WOLF_PUP;
  }

  protected zone(): PackZone {
    return { left: 2, right: SCENE_W - 2, back: this.stripTop + 5, front: this.sh - 3, door: { x: 2, y: this.stripTop + 12 }, out: -1, calm: 0.45 };
  }

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const hz = (this.hz = Math.round(sh * 0.42));
    const strip = this.stripTop;
    const mid = strip - hz;
    const at = (f: number) => Math.round(hz + mid * f);
    const base = at(0.5);
    const top = Math.max(30, base - Math.round(sh * 0.22));
    this.tor = { base, top };
    const torH = base - top;
    const huts: Spot[] = [
      { x: 122, y: at(0.4) },
      { x: 156, y: at(0.28) },
      { x: 142, y: at(0.7) },
      { x: 104, y: at(0.76) },
      { x: 168, y: at(0.54) },
    ];
    // The trail: up from the front, where the wolves are, to the middle of the camp.
    const trail: Spot[] = [];
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      trail.push({ x: Math.round(70 + 52 * k + 10 * Math.sin(k * 5.2)), y: Math.round(sh - 4 - (sh - 4 - at(0.62)) * k) });
    }
    this.spots = {
      flint: [
        { x: 92, y: strip + 2 },
        { x: 60, y: strip - 3 },
        { x: 124, y: strip + 1 },
        { x: 36, y: strip + 4 },
        { x: 150, y: strip - 2 },
        { x: 78, y: strip - 6 },
      ],
      ochre: [
        { x: 34, y: top + Math.round(torH * 0.6) },
        { x: 16, y: top + Math.round(torH * 0.62) },
        { x: 30, y: top + Math.round(torH * 0.3) },
        { x: 52, y: top + Math.round(torH * 0.78) },
        { x: 4, y: top + Math.round(torH * 0.82) },
      ],
      cairn: [
        { x: 88, y: at(0.34) },
        { x: 82, y: at(0.56) },
        { x: 76, y: at(0.8) },
        { x: 62, y: at(0.66) },
      ],
      tusk: huts,
      herd: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 0, y: hz + 9 + (i % 2) * 4 })),
      trail,
      moon: [{ x: 140, y: Math.max(40, Math.round(sh * 0.15)) + 13 }],
      cave: [
        { x: 18, y: base + 3 },
        { x: 50, y: base + 5 },
      ],
      ancestor: huts.slice(0, 3).map((h) => ({ x: h.x + 15, y: h.y + 2 })),
      // Across the doorstep, in the light.
      eighth: huts.slice(0, 3).map((h) => ({ x: h.x - 1, y: h.y + 8 })),
    };
    this.herdX = [0, 1, 2, 3, 4, 5].map((i) => Math.round(((i * 0.37 + r() * 0.1) % 1) * (SCENE_W + 60)) - 30);
    this.flakes = [];
    for (let i = 0; i < 150; i++) this.flakes.push({ x: r() * SCENE_W, y: r() * sh, speed: 0.6 + r() * 0.8, big: r() < 0.12 });
    this.tufts = [];
    for (let i = 0; i < 22; i++) {
      const y = Math.round(hz + 6 + Math.pow(r(), 0.6) * (sh - hz - 8));
      const x = Math.floor(r() * SCENE_W);
      for (let k = 0; k < 3; k++) this.tufts.push({ x: x + Math.round(r() * 6), y: y + Math.round(r() * 2), tall: r() < 0.4 });
    }
    this.drifts = [];
    for (let i = 0; i < 26; i++) this.drifts.push({ x: Math.floor(r() * SCENE_W) - 10, y: Math.round(hz + 3 + r() * (sh - hz - 4)), w: 8 + Math.floor(r() * 26) });
  }

  // --- What holds still ---

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, hz } = this;
    const cold = clamp((1 - condition) * 1.25, 0, 1);
    // The sky: deep blue down to a pink belt, and on the right where the sun went, a glow.
    for (let y = 0; y < hz; y++) {
      const k = (y / hz) * (SKY.length - 1);
      const i = Math.min(SKY.length - 2, Math.floor(k));
      const base = mix(mix(SKY[i]!, SKY[i + 1]!, k - i), OVERCAST, cold * 0.75);
      const glow = Math.pow(y / hz, 5) * (1 - cold);
      for (let x = 0; x < SCENE_W; x += 4) {
        ctx.fillStyle = mix(base, DUSK, glow * (0.15 + 0.55 * Math.pow(x / SCENE_W, 1.6)));
        ctx.fillRect(x, y, 4, 1);
      }
    }
    // Far mountains on the right, snow on their tops.
    for (let x = 96; x < SCENE_W; x++) {
      const h = Math.round(12 + 7 * Math.sin(x / 9) + 5 * Math.sin(x / 4.3 + 1) + (x - 96) * 0.08);
      for (let y = hz - h; y < hz; y++) {
        ctx.fillStyle = y < hz - h + 3 ? mix(CAP, OVERCAST, cold * 0.4) : mix(PEAK, OVERCAST, cold * 0.5);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // The ice sheet: a wall along the bottom of the sky, as far as anyone has ever walked.
    for (let x = 0; x < 128; x++) {
      const end = x > 104 ? (x - 104) * 0.5 : 0;
      const h = Math.round(11 + 1.5 * Math.sin(x / 13) + Math.sin(x / 3.1) * 0.6 - end);
      if (h <= 0) continue;
      ctx.fillStyle = mix(ICE_TOP, OVERCAST, cold * 0.3);
      ctx.fillRect(x, hz - h, 1, 1);
      ctx.fillStyle = mix((x * 7) % 5 === 0 || (x * 3) % 11 === 0 ? ICE_LINE : ICE, OVERCAST, cold * 0.45);
      ctx.fillRect(x, hz - h + 1, 1, h - 1);
    }
    // The plain: snow to the front, pinker far off, white near, bluer the colder it is.
    for (let y = hz; y < sh; y++) {
      const k = Math.pow((y - hz) / (sh - hz), 0.6);
      ctx.fillStyle = mix(mix(SNOW_FAR, SNOW_NEAR, k), SNOW_COLD, cold * 0.6);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = rgba(ICE_LINE, 0.5);
    ctx.fillRect(0, hz, SCENE_W, 1);
    for (const d of this.drifts) {
      ctx.fillStyle = rgba(DRIFT, 0.32 + 0.2 * cold);
      ctx.fillRect(d.x, d.y, d.w, 1);
      ctx.fillStyle = rgba("#ffffff", 0.5);
      ctx.fillRect(d.x + 2, d.y - 1, d.w - 4, 1);
    }
    // The steppe under the snow: dry grass, poking through.
    for (const t of this.tufts) {
      const near = (t.y - hz) / (sh - hz);
      ctx.fillStyle = near > 0.5 ? GRASS : rgba(GRASS, 0.6);
      ctx.fillRect(t.x, t.y - 1, 1, 2);
      if (t.tall && near > 0.3) {
        ctx.fillStyle = GRASS_DARK;
        ctx.fillRect(t.x + 1, t.y - 2, 1, 3);
        ctx.fillRect(t.x - 1, t.y, 1, 1);
      }
    }
    this.torPaper.width = SCENE_W;
    this.torPaper.height = sh;
    this.drawTor(this.torPaper.getContext("2d")!, cold);
    // The front: a drift where the wolves stand, the brightest snow in the picture.
    const strip = this.stripTop;
    for (let x = 0; x < SCENE_W; x++) {
      const y = Math.round(strip - 1 + 2 * Math.sin(x / 23) + Math.sin(x / 7));
      ctx.fillStyle = rgba("#ffffff", 0.7 - cold * 0.3);
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = rgba(DRIFT, 0.4);
      ctx.fillRect(x, y + 1, 1, 1);
    }
    if (cold > 0) {
      ctx.fillStyle = rgba("#dfe6f2", 0.28 * cold);
      ctx.fillRect(0, 0, SCENE_W, sh);
    }
  }

  /** Granite: rounded slabs stacked up by the weather. Lit pink on the sunset side, snow on every ledge. */
  private drawTor(ctx: CanvasRenderingContext2D, cold: number): void {
    const { base, top } = this.tor;
    const H = base - top;
    const y = (f: number) => Math.round(base - H * f);
    // Top first: each slab sits on the ones drawn after it.
    const slabs = [
      { x0: 20, x1: 40, y0: y(1), y1: y(0.66), r: 6 },
      { x0: 6, x1: 46, y0: y(0.72), y1: y(0.36), r: 8 },
      { x0: 40, x1: 56, y0: y(0.5), y1: y(0.2), r: 6 },
      { x0: -8, x1: 30, y0: y(0.44), y1: base + 2, r: 8 },
      { x0: 24, x1: 66, y0: y(0.3), y1: base + 3, r: 9 },
    ];
    const lit = mix(ROCK_LIT, ROCK, cold * 0.7);
    for (const b of slabs) {
      const w = b.x1 - b.x0;
      const round = (x: number) => {
        const edge = Math.min(x - b.x0, b.x1 - x);
        if (edge >= b.r) return 0;
        const d = b.r - edge;
        return Math.round(b.r - Math.sqrt(b.r * b.r - d * d));
      };
      for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
        const lift = round(clamp(x, b.x0, b.x1)) + (x < b.x0 || x > b.x1 ? 1 : 0);
        ctx.fillStyle = INK;
        ctx.fillRect(x, b.y0 + lift - 1, 1, b.y1 - b.y0 - lift * 2 + 2);
      }
      for (let x = b.x0; x <= b.x1; x++) {
        const lift = round(x);
        const y0 = b.y0 + lift;
        const h = b.y1 - b.y0 - lift * 2;
        const side = (x - b.x0) / w;
        ctx.fillStyle = side > 0.7 ? lit : side < 0.18 ? ROCK_DARK : ROCK;
        ctx.fillRect(x, y0, 1, h);
        // The underside in shadow, the top in snow.
        ctx.fillStyle = rgba(ROCK_DARK, 0.6);
        ctx.fillRect(x, y0 + h - 2, 1, 2);
        ctx.fillStyle = CAP;
        ctx.fillRect(x, y0, 1, lift > 2 ? 1 : 2 + ((x * 5) % 3 === 0 ? 1 : 0));
      }
      // A crack or two, never level, so it reads as stone and not a wall.
      ctx.fillStyle = rgba(INK, 0.4);
      for (let k = 0; k < Math.floor(w / 14); k++) {
        const cx = b.x0 + 6 + k * 13 + ((b.y0 * 7) % 5);
        const cy = b.y0 + Math.round((b.y1 - b.y0) * 0.45) + (k % 2) * 3;
        for (let q = 0; q < 5; q++) ctx.fillRect(cx + q, cy + (q > 2 ? 1 : 0), 1, 1);
      }
    }
    // Where the rock meets the snow, the snow piles up.
    for (let x = -2; x < 70; x++) {
      const yy = base + Math.round(1 + Math.sin(x / 5) * 1.5);
      ctx.fillStyle = SNOW_NEAR;
      ctx.fillRect(x, yy, 1, 4);
    }
  }

  // --- What moves ---

  protected scene(t: number): void {
    const ctx = this.ctx;
    const warm = clamp(this.view.condition, 0, 1);
    const cold = 1 - warm;
    this.pack.tame = clamp(Math.log2(1 + this.owned("eighth")) / 9, 0, 0.75);

    this.drawAurora(t, warm);
    this.drawMoon(t);
    this.drawHerd(t, warm);
    ctx.drawImage(this.torPaper, 0, 0);
    this.each("ochre", (spot, _, broken, s) => {
      ctx.globalAlpha = broken ? 0.4 : 0.72;
      this.stand(s, spot.x, spot.y);
      ctx.globalAlpha = 1;
    });
    this.each("cave", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (!broken) this.glow(spot.x, spot.y - 4, 6 + (Math.sin(t * 9 + i * 3) > 0.4 ? 1 : 0), FIRE, 0.14);
    });
    this.drawTorWolf(t);
    this.each("trail", (spot, _, __, s) => this.stand(s, spot.x, spot.y));

    const props: { y: number; go: () => void }[] = [];
    this.each("cairn", (spot, _, __, s) =>
      props.push({
        y: spot.y,
        go: () => {
          this.stand(s, spot.x, spot.y);
          // Snow banked up on the windward side.
          ctx.fillStyle = SNOW_NEAR;
          for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(spot.x - s.w / 2) - 3 + k, spot.y - 3 + k, 6 - k, 1);
        },
      }),
    );
    const wind = this.wind(cold);
    this.each("tusk", (spot, i, broken, s) =>
      props.push({
        y: spot.y,
        go: () => {
          if (!broken) {
            // The door's light on the snow, wider than it is deep.
            for (let dy = 0; dy < 5; dy++) {
              const half = Math.round(13 - dy * 2.2);
              ctx.fillStyle = rgba(FIRE, 0.16 - dy * 0.025);
              ctx.fillRect(spot.x - half, spot.y + 1 + dy, half * 2 + 1, 1);
            }
          }
          this.stand(s, spot.x, spot.y);
          if (broken) return;
          // Smoke out of the top, leaning with the wind.
          const roof = spot.y - s.h;
          for (let k = 0; k < 6; k++) {
            const p = fract(t * 0.18 + k / 6 + i * 0.37);
            const x = spot.x + Math.sin(t * 0.9 + k * 1.7 + i) * 1.5 + p * p * wind * 0.9;
            const y = roof - p * 30;
            ctx.fillStyle = rgba("#c8ccdc", 0.55 * (1 - p));
            const big = p > 0.35 ? 2 : 1;
            ctx.fillRect(Math.round(x), Math.round(y), big, big);
          }
        },
      }),
    );
    this.each("ancestor", (spot, i, broken, s) =>
      props.push({
        y: spot.y,
        go: () => {
          this.stand(s, spot.x, spot.y);
          if (!broken) this.breath(spot.x + 4, spot.y - 8, t, i, wind);
        },
      }),
    );
    this.each("eighth", (spot, i, broken, s) =>
      props.push({
        y: spot.y,
        go: () => {
          if (!broken) this.glow(spot.x, spot.y - 3, 10, FIRE, 0.1);
          this.stand(s, spot.x, spot.y - (!broken && Math.sin(t * 0.6 + i * 2) > 0.95 ? 1 : 0));
        },
      }),
    );
    this.each("flint", (spot, _, __, s) => props.push({ y: spot.y, go: () => this.stand(s, spot.x, spot.y) }));
    this.drawPack(props);
    this.drawSnow(t, cold);
  }

  /** How hard it's blowing, in pixels a second: worse in the cold, better behind the bones. */
  private wind(cold: number): number {
    const shelter = shownSome(this.owned("cairn"), 4);
    return (5 + 46 * cold) * (1 - 0.12 * shelter);
  }

  private breath(x: number, y: number, t: number, i: number, wind: number): void {
    const p = fract(t * 0.35 + i * 0.41);
    if (p > 0.45) return;
    const k = p / 0.45;
    this.ctx.fillStyle = rgba("#ffffff", 0.6 * (1 - k));
    this.ctx.fillRect(Math.round(x + k * 4 + k * wind * 0.08), Math.round(y - k * 3), 2, 1);
  }

  /** It comes out as the place fills up, and goes thin in the cold. */
  private drawAurora(t: number, warm: number): void {
    let rungs = 0;
    for (const id of IDS) if (this.owned(id) > 0) rungs++;
    const strength = (rungs / IDS.length) * (0.35 + 0.65 * warm);
    if (strength <= 0) return;
    const ctx = this.ctx;
    const top = Math.max(26, Math.round(this.sh * 0.09));
    for (let x = 0; x < SCENE_W; x += 2) {
      const y = Math.round(top + 10 + 7 * Math.sin(x / 31 + t * 0.07) + 3 * Math.sin(x / 13 - t * 0.11));
      const h = Math.round(12 + 7 * Math.sin(x / 19 + t * 0.15));
      const a = strength * (0.12 + 0.08 * Math.sin(x / 9 + t * 0.4));
      if (a <= 0) continue;
      ctx.fillStyle = rgba(AURORA_TOP, a * 0.6);
      ctx.fillRect(x, y - h, 2, Math.round(h * 0.5));
      ctx.fillStyle = rgba(AURORA, a);
      ctx.fillRect(x, y - Math.round(h * 0.5), 2, Math.round(h * 0.5));
      ctx.fillStyle = rgba(AURORA, a * 1.6);
      ctx.fillRect(x, y, 2, 1);
    }
  }

  /** Brighter for every generation that ever looked up at it, and it lays a path on the snow. */
  private drawMoon(t: number): void {
    const ctx = this.ctx;
    this.each("moon", (spot, _, broken, s) => {
      if (!broken) {
        const reach = 9 + Math.min(18, Math.log2(1 + this.view.generation) * 3) + Math.min(6, Math.log2(1 + this.owned("moon")));
        fillDisc(ctx, spot.x, spot.y - 6, reach, rgba(MOONLIGHT, 0.07));
        fillDisc(ctx, spot.x, spot.y - 6, reach * 0.6, rgba(MOONLIGHT, 0.08));
        // Moonlight on the snow, under it.
        for (let y = this.hz + 2; y < this.stripTop; y += 2) {
          const k = (y - this.hz) / (this.stripTop - this.hz);
          const half = Math.round(3 + k * 14 + Math.sin(y * 1.3 + t * 2) * 1.5);
          ctx.fillStyle = rgba(MOONLIGHT, 0.16 * (1 - k * 0.7));
          ctx.fillRect(spot.x - half, y, half * 2, 1);
        }
      }
      this.stand(s, spot.x, spot.y);
    });
  }

  /** Under the moon, on the top of the tor: one of them, sat, looking at it. */
  private drawTorWolf(t: number): void {
    if (this.owned("moon") <= 0) return;
    const s = artCanvas(WOLF_POSES[0]![0]![POSE.sit + (Math.sin(t * 0.3) > 0.8 ? 1 : 0)]!);
    this.stand(s, 32, this.tor.top + 2);
  }

  /** Going past along the ice, a whole day of them, as close as the warmth lets them come. */
  private drawHerd(t: number, warm: number): void {
    const ctx = this.ctx;
    const wind = this.wind(1 - warm);
    this.each("herd", (spot, i, broken, s) => {
      if (!broken) this.herdX[i] = (this.herdX[i]! + this.dt * (1.6 + (i % 3) * 0.4)) % (SCENE_W + 60);
      const x = Math.round(this.herdX[i]! - 30);
      const y = spot.y - (!broken && Math.sin(t * 2.2 + i) > 0.6 ? 1 : 0);
      ctx.globalAlpha = 0.45 + 0.5 * warm;
      this.stand(s, x, y);
      ctx.globalAlpha = 1;
      if (!broken) this.breath(x + s.w / 2, y - 7, t, i + 3, wind);
    });
  }

  private drawSnow(t: number, cold: number): void {
    const ctx = this.ctx;
    const count = Math.round(24 + 120 * cold);
    const wind = this.wind(cold);
    const fall = 9 + 14 * cold;
    for (let i = 0; i < count && i < this.flakes.length; i++) {
      const f = this.flakes[i]!;
      f.y += fall * f.speed * this.dt;
      f.x += (wind * f.speed + Math.sin(t * 1.3 + i) * 3) * this.dt;
      if (f.y > this.sh) {
        f.y -= this.sh + 2;
        f.x = Math.random() * SCENE_W;
      }
      if (f.x > SCENE_W) f.x -= SCENE_W;
      if (f.x < 0) f.x += SCENE_W;
      ctx.fillStyle = rgba("#ffffff", 0.55 + 0.35 * f.speed - 0.3);
      const big = f.big ? 2 : 1;
      ctx.fillRect(Math.round(f.x), Math.round(f.y), big, big);
    }
    // Spindrift along the ground when it's really blowing.
    if (cold > 0.35) {
      for (let k = 0; k < 8; k++) {
        const y = this.hz + 6 + ((k * 37) % (this.sh - this.hz - 8));
        const x = ((t * wind * 2.2 + k * 53) % (SCENE_W + 40)) - 20;
        ctx.fillStyle = rgba("#ffffff", 0.35 * (cold - 0.35));
        ctx.fillRect(Math.round(x), y, 18, 1);
      }
    }
  }
}
