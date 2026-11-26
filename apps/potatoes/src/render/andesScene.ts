/**
 * The New World (engine world `wild`): the high lake every potato came from, thousands of years ago. The
 * secret world past the heap, and drawn as a new beginning rather than the next stop: snow peaks over a cold
 * blue lake with the mountains upside down in it, gold puna grass on the near shore, a hill on the right.
 * At first nothing on it but wind, glints on the water and a condor. Then, rung by rung: Wild Patches in the
 * grass, Foragers carrying to the cloth at the front left, Stone Terraces up the hill, Chuño spread for the
 * frost, Llamas, a Trail zigzagging over the pass, the Moon Calendar's stones (and a moon in the daytime sky,
 * fuller for every generation), Storehouses on top of the hill, the Ayllu's houses smoking on the shore with
 * a reed boat out on the water, and the First Potato on its cloth at the front. The sky turning: grey light,
 * ashen grass, hail, and the llamas stop grazing.
 */

import { CONDOR, WILD_TUBER } from "./art.js";
import { LongScene, type Carrier, type Spot } from "./longScene.js";
import { SCENE_W, clamp, fract, mix, rgba } from "./farmScene.js";
import { artCanvas } from "./pixel.js";

type WildId = "flint" | "ochre" | "cairn" | "tusk" | "herd" | "trail" | "moon" | "cave" | "ancestor" | "eighth";

const ZENITH = "#183888";
const SKY_MID = "#3c74c4";
const SKY_LOW = "#bcd8ec";
const GREY_TOP = "#4a5262";
const GREY_LOW = "#b4b8bc";
const ROCK_LIT = "#7c7894";
const ROCK_SHADE = "#4c4a66";
const FOOT_LIT = "#8a7468";
const FOOT_SHADE = "#5a4a56";
const SNOW_LIT = "#f4f6fa";
const SNOW_SHADE = "#aab8d8";
const FAR_ROCK = "#90a0c4";
const FAR_SNOW = "#dce6f4";
const FAR_SHORE = "#8a7848";
const FAR_SHORE_LIT = "#b09a60";
const LAKE_FAR = "#3a6ab8";
const LAKE_NEAR = "#1a3a7a";
const SLATE = "#3a4658";
const PEBBLE = "#a89878";
const REED = "#8a8a40";
const REED_TIP = "#c8bc68";
const PUNA_FAR = "#cdb474";
const PUNA_NEAR = "#b08a44";
const ASH = "#8a8476";
const TUFT = "#8a6c34";
const TUFT_LIT = "#ead48c";
const HILL = "#a68c4c";
const HILL_LIT = "#c4a862";
const STONE = "#9a948a";
const STONE_LIT = "#bab4a8";
const STONE_DARK = "#6e6a62";
const PLANTED = "#6a8a3a";
const PLANTED_DARK = "#4a6a2a";
const FLOWER = "#c8a8ec";
const TRAIL = "#ead6aa";
const MOON = "#f4f0dc";
const WEAVE = ["#c83a3a", "#e8823a", "#3a4aa0", "#ffd166", "#3a8a5a"];

/** A hash in 0..1 per integer, for anything that should look scattered but hold still. */
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
/** Smooth noise along one axis, in -1..1. */
function noise(x: number, period: number, salt: number): number {
  const i = Math.floor(x / period);
  const f = x / period - i;
  const a = hash(i + salt * 101);
  const b = hash(i + 1 + salt * 101);
  return (a + (b - a) * f * f * (3 - 2 * f)) * 2 - 1;
}

/** Smooth noise over the plane, in -1..1: for patches of grass that are greener or drier than the rest. */
function noise2(x: number, y: number, period: number, salt: number): number {
  const i = Math.floor(x / period);
  const j = Math.floor(y / period);
  const fx = x / period - i;
  const fy = y / period - j;
  const h = (a: number, b: number) => hash(a * 57 + b * 113 + salt * 7);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = h(i, j) + (h(i + 1, j) - h(i, j)) * sx;
  const low = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * sx;
  return (top + (low - top) * sy) * 2 - 1;
}

interface Peak {
  x: number;
  top: number;
}

interface Llama {
  x: number;
  dir: 1 | -1;
  goal: number;
  wait: number;
}

export class AndesScene extends LongScene<WildId> {
  private horizon = 130;
  private shore = 175;
  private hillTop = 84;
  private peakTop = 32;
  private ridge: number[] = [];
  private owner: number[] = [];
  private peaks: Peak[] = [];
  private trailPts: Spot[] = [];
  private tufts: { x: number; y: number; h: number }[] = [];
  private glints: { x: number; y: number; k: number; p: number }[] = [];
  private clouds: { x: number; y: number; len: number; speed: number }[] = [];
  private llamas: Llama[] = [];
  private foragers: Carrier[] = [];
  private smoke: { x: number; y: number; life: number }[] = [];
  private hail: { x: number; y: number }[] = [];
  private boat = { x: 24, dir: 1 as 1 | -1 };
  /** The hill's colour at the condition last painted, so a slipped terrace shows the hill through it. */
  private hillNow = HILL;
  private layers?: { range: HTMLCanvasElement; ground: HTMLCanvasElement };

  /** The hill's left edge at height y: a rounded top, spreading to the shore. */
  private hillEdge(y: number): number {
    const k = clamp((y - this.hillTop) / (this.shore + 2 - this.hillTop), 0, 1);
    return Math.round(146 - 46 * Math.sqrt(k));
  }

  protected layOut(random: () => number): void {
    const sh = this.sh;
    this.layers = undefined;
    this.horizon = Math.round(sh * 0.41);
    this.shore = Math.round(sh * 0.55);
    this.hillTop = Math.round(sh * 0.27);
    // The world strip sits over the top of the canvas; the tallest peak stops just under it.
    this.peakTop = Math.max(30, Math.round(sh * 0.1));
    const H = this.horizon - this.peakTop;

    // The range: one great massif left of centre, its shoulders, and lower peaks running off right behind the hill.
    const shape: [number, number, number][] = [
      [-8, 0.42, 30],
      [20, 0.64, 24],
      [52, 1, 34],
      [72, 0.82, 18],
      [102, 0.54, 28],
      [134, 0.7, 30],
      [174, 0.5, 30],
    ];
    const ps = shape.map(([x, h, w]) => [x + Math.round((random() - 0.5) * 6), h * (0.95 + random() * 0.06), w] as const);
    this.peaks = ps.map(([x, h]) => ({ x, top: Math.round(this.horizon - H * h) }));
    for (let x = 0; x < SCENE_W; x++) {
      let best = 0;
      let who = 0;
      ps.forEach(([px, h, w], i) => {
        const u = Math.abs(x - px) / w;
        const v = u < 1 ? h * Math.pow(1 - u, 1.15) : 0;
        if (v > best) {
          best = v;
          who = i;
        }
      });
      const crag = noise(x, 3, 1) * 1.6 + noise(x, 7, 2) * 1.4;
      this.ridge[x] = Math.round(this.horizon - H * best + crag * Math.min(1, best * 1.6));
      this.owner[x] = who;
    }

    // The trail: up the massif's shoulder in switchbacks, from the far shore to the notch beside the summit.
    const pass = this.saddle(this.peaks[2]!.x + 4, this.peaks[3]!.x);
    const foot = this.horizon - 4;
    const crest = this.ridge[pass]! + 2;
    this.trailPts = [];
    for (let i = 0; i <= 6; i++) {
      const y = Math.round(foot - ((foot - crest) * i) / 6);
      let x = i === 6 ? pass : i % 2 ? pass + 6 - i : pass - 16 + i * 2;
      // Never off the mountain: slide toward the pass until the ground is under it.
      while (x !== pass && y < this.ridge[clamp(x, 0, SCENE_W - 1)]! + 2) x += x < pass ? 1 : -1;
      this.trailPts.push({ x, y });
    }

    const D = sh - this.shore;
    const at = (k: number) => Math.round(this.shore + D * k);
    this.spots = {
      // Wild potato coming up all over the near shore, first by the water, then everywhere.
      flint: [
        [40, 0.3], [96, 0.26], [64, 0.42], [20, 0.48], [118, 0.36], [84, 0.52],
        [148, 0.3], [34, 0.62], [108, 0.6], [160, 0.48], [8, 0.34], [136, 0.56],
      ].map(([x, k]) => ({ x: x!, y: at(k!) })),
      // Walking between the patches and the cloth at the front.
      ochre: [0, 1, 2, 3].map((i) => ({ x: 70 + i * 16, y: at(0.88) + (i % 2) * 4 })),
      // The terraces up the hill, bottom first: wall tops.
      cairn: [0, 1, 2, 3, 4].map((i) => ({
        x: 0,
        y: Math.round(this.shore - 2 - (i * (this.shore - 2 - (this.hillTop + 22))) / 4),
      })),
      // Chuño spread on the flat in front, where the frost lies longest.
      tusk: [70, 94, 118, 142, 162].map((x, i) => ({ x, y: at(0.72) + (i % 2) * 3 })),
      // Grazing lanes; each llama wanders its own.
      herd: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 70 + i * 17, y: at(0.36 + (i % 3) * 0.1) })),
      trail: this.trailPts.slice(1).map((p) => p),
      // A short row of stones in front of the hill, where the horizon can be read off them.
      moon: [[96, 0], [105, -3], [113, 1], [124, -2]].map(([x, dy]) => ({ x: x!, y: at(0.15) + dy! })),
      // The stores, up on top of the hill where the wind keeps them cold.
      cave: [
        { x: 154, y: this.hillTop + 4 },
        { x: 167, y: this.hillTop + 3 },
        { x: 141, y: this.hillTop + 11 },
        { x: 160, y: this.hillTop + 13 },
        { x: 173, y: this.hillTop + 15 },
      ],
      // The ayllu's houses along the shore to the left.
      ancestor: [14, 34, 54, 74, 24].map((x, i) => ({ x, y: i === 4 ? at(0.2) : at(0.1) + (i % 2) * 2 })),
      eighth: [{ x: 146, y: sh - 3 }],
    };

    this.llamas = this.spots.herd.map((s, i) => ({ x: s.x, dir: i % 2 ? 1 : -1, goal: s.x, wait: random() * 4 }));
    this.foragers = this.spots.ochre.map((s, i) => ({ x: s.x, dir: -1, loaded: i % 2 === 0, wait: i * 1.3 }));

    this.tufts = [];
    for (let i = 0; i < 46; i++) {
      const k = Math.pow(random(), 0.7);
      this.tufts.push({ x: Math.round(random() * SCENE_W), y: at(0.06 + k * 0.94), h: 2 + Math.round(k * 3) });
    }
    this.tufts.sort((a, b) => a.y - b.y);

    this.glints = [];
    for (let i = 0; i < 16; i++) {
      this.glints.push({
        x: Math.round(random() * (SCENE_W - 60)),
        y: Math.round(this.horizon + 2 + random() * (this.shore - this.horizon - 6)),
        k: 0.6 + random() * 1.6,
        p: random() * 6.28,
      });
    }
    this.clouds = [0, 1, 2].map((i) => ({
      x: random() * SCENE_W,
      y: Math.round(this.peakTop + 4 + i * (H * 0.22) + random() * 4),
      len: 18 + Math.round(random() * 22),
      speed: 0.6 + random() * 0.8,
    }));
  }

  /** The lowest point of the ridge between two columns: where a trail would cross. */
  private saddle(from: number, to: number): number {
    let best = from;
    for (let x = from; x <= to; x++) if (this.ridge[x]! > this.ridge[best]!) best = x;
    return best;
  }

  /**
   * The mountains and the grass, which the sky doesn't change: painted pixel by pixel once per layout,
   * because doing it on every step of the condition bar costs a dropped frame each time.
   */
  private paintLayers(): { range: HTMLCanvasElement; ground: HTMLCanvasElement } {
    const { sh, horizon, shore, peakTop } = this;
    const H = horizon - peakTop;
    const layer = () => {
      const c = document.createElement("canvas");
      c.width = SCENE_W;
      c.height = sh;
      return c;
    };
    const range = layer();
    const ground = layer();
    let ctx = range.getContext("2d")!;
    // The far range, pale with distance, showing between the near peaks.
    const far: number[] = [];
    for (let x = -1; x <= SCENE_W; x++) {
      far[x + 1] = Math.round(horizon - H * (0.6 + 0.1 * Math.sin(x * 0.06 + 1.3) + 0.06 * Math.sin(x * 0.17)));
    }
    for (let x = 0; x < SCENE_W; x++) {
      // Walk uphill to the summit this column hangs off: its left face is lit, its right in shade.
      let px = x;
      for (;;) {
        const here = far[px + 1]!;
        if (px > 0 && far[px]! < here) px--;
        else if (px < SCENE_W - 1 && far[px + 2]! < here) px++;
        else break;
      }
      const top = far[x + 1]!;
      const line = Math.round(horizon - H * 0.5 + noise(x, 5, 3) * 3);
      for (let y = top; y < horizon; y++) {
        const lit = x <= px + (y - far[px + 1]!) * 0.5;
        const snow = y < line;
        ctx.fillStyle = snow ? (lit ? FAR_SNOW : mix(FAR_SNOW, FAR_ROCK, 0.4)) : lit ? FAR_ROCK : mix(FAR_ROCK, ROCK_SHADE, 0.3);
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // The near range: lit on the faces toward the morning, snow above the line, brown puna at the feet.
    const snowline = horizon - H * 0.5;
    const footline = horizon - H * 0.1;
    for (let x = 0; x < SCENE_W; x++) {
      const p = this.peaks[this.owner[x]!]!;
      // Snow lying longer down the gullies, a few pixels at most.
      const gully = hash(Math.floor(x / 2) * 3 + 7) > 0.72 ? 1 + Math.round(hash(Math.floor(x / 2)) * 4) : 0;
      for (let y = this.ridge[x]!; y < horizon; y++) {
        const lit = x < p.x + (y - p.top) * 0.14 + noise(y, 4, x > p.x ? 5 : 6) * 1.5;
        const line = snowline + noise(x, 4, 7) * 4 + gully;
        const snow = y < line || y < p.top + 3;
        const foot = y > footline + noise(x, 6, 8) * 4;
        ctx.fillStyle = snow ? (lit ? SNOW_LIT : SNOW_SHADE) : foot ? (lit ? FOOT_LIT : FOOT_SHADE) : lit ? ROCK_LIT : ROCK_SHADE;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Haze at the foot of the range, where there's the most air between you and it.
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = rgba("#dce8f4", (i / 10) * 0.22);
      ctx.fillRect(0, horizon - 10 + i, SCENE_W, 1);
    }
    // The far shore: low brown hummocks along the water.
    for (let x = 0; x < SCENE_W; x++) {
      const top = Math.round(horizon - 3 - 1.6 * Math.sin(x * 0.13) - 1.2 * Math.sin(x * 0.31 + 2));
      ctx.fillStyle = FAR_SHORE;
      ctx.fillRect(x, top, 1, horizon - top);
      ctx.fillStyle = FAR_SHORE_LIT;
      ctx.fillRect(x, top, 1, 1);
    }

    ctx = ground.getContext("2d")!;
    // Patchy: greener where the water sits, drier and darker where the wind gets at it.
    const D = sh - shore;
    for (let y = shore; y < sh; y++) {
      const base = mix(PUNA_FAR, PUNA_NEAR, (y - shore) / D);
      let run = 0;
      let runColor = "";
      for (let x = 0; x <= SCENE_W; x++) {
        let color = runColor;
        if (x < SCENE_W) {
          const v = noise2(x, (y - shore) * 2.2, 18, 4) * 0.7 + noise2(x, y * 2, 7, 5) * 0.3;
          const step = Math.round(v * 3) / 3;
          const tone = step > 0.2 ? mix(base, "#a8a458", step * 0.45) : step < -0.2 ? mix(base, "#8a6a34", -step * 0.4) : base;
          color = tone;
        }
        if (color !== runColor || x === SCENE_W) {
          if (run > 0) {
            ctx.fillStyle = runColor;
            ctx.fillRect(x - run, y, run, 1);
          }
          run = 0;
          runColor = color;
        }
        run++;
      }
    }
    // A bofedal by the water: cushion-green wet ground, bits of sky lying in it.
    for (let y = shore + 3; y < shore + 9; y++) {
      const half = Math.round(30 * Math.sqrt(1 - Math.pow((y - shore - 6) / 3.5, 2)));
      ctx.fillStyle = y % 2 ? "#6a8a44" : "#5a7a3a";
      ctx.fillRect(66 - half, y, half * 2, 1);
      ctx.fillStyle = rgba("#bcd8ec", 0.7);
      for (let x = 66 - half + ((y * 5) % 7); x < 66 + half - 2; x += 9) ctx.fillRect(x, y, 2, 1);
    }
    ctx.fillStyle = rgba("#000000", 0.18);
    ctx.fillRect(0, shore, SCENE_W, 1);
    ctx.fillStyle = PEBBLE;
    ctx.fillRect(0, shore + 1, SCENE_W, 1);
    for (let x = 0; x < SCENE_W; x += 3) ctx.fillRect(x + (x % 2), shore + 2, 2, 1);
    // Tussock texture, denser and longer toward you.
    for (let y = shore + 4; y < sh; y++) {
      const k = (y - shore) / D;
      for (let x = 0; x < SCENE_W; x++) {
        const h = hash(x * 31 + y * 17);
        if (h < 0.05 + k * 0.08) {
          ctx.fillStyle = rgba("#5a4020", 0.18 + k * 0.12);
          ctx.fillRect(x, y, 2 + Math.round(k * 2), 1);
        } else if (h > 0.985 - k * 0.02) {
          ctx.fillStyle = rgba("#fff0c0", 0.2);
          ctx.fillRect(x, y, 2, 1);
        }
      }
    }
    // A few boulders the glaciers left.
    for (const [bx, k, w] of [[58, 0.2, 5], [128, 0.44, 7], [12, 0.76, 6], [96, 0.92, 4], [170, 0.68, 5]] as const) {
      const by = Math.round(shore + D * k);
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(bx - 1, by - 2, w + 2, 3);
      ctx.fillRect(bx, by - 3, w, 1);
      ctx.fillStyle = STONE;
      ctx.fillRect(bx, by - 2, w, 2);
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(bx, by - 3, w - 2, 1);
      ctx.fillStyle = rgba("#000000", 0.2);
      ctx.fillRect(bx, by + 1, w + 2, 1);
    }

    return { range, ground };
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, horizon, shore } = this;
    const dull = clamp((1 - condition) * 1.25, 0, 1);

    // The sky: very blue overhead, the way it is when there's this little air.
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, mix(ZENITH, GREY_TOP, dull * 0.75));
    sky.addColorStop(0.55, mix(SKY_MID, GREY_TOP, dull * 0.6));
    sky.addColorStop(1, mix(SKY_LOW, GREY_LOW, dull * 0.7));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCENE_W, horizon);

    this.layers ??= this.paintLayers();
    ctx.drawImage(this.layers.range, 0, 0);

    // The lake, darker toward you, with everything above it upside down in it.
    const lakeH = shore - horizon;
    for (let y = horizon; y < shore; y++) {
      ctx.fillStyle = mix(mix(LAKE_FAR, LAKE_NEAR, (y - horizon) / lakeH), SLATE, dull * 0.6);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Squashed, the way a reflection is when you look at it this low across the water, so the snow gets in.
    for (let i = 0; i < lakeH; i++) {
      const src = horizon - 1 - Math.floor(i * 1.7);
      if (src < 0) break;
      const dx = i % 5 === 2 ? 1 : i % 7 === 4 ? -1 : 0;
      ctx.globalAlpha = 0.5 - (i / lakeH) * 0.22;
      ctx.drawImage(ctx.canvas, 0, src, SCENE_W, 1, dx, horizon + i, SCENE_W, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba("#ffffff", 0.07);
    for (let y = horizon + 2; y < shore; y += 3) {
      for (let x = (y * 7) % 11; x < SCENE_W; x += 11 + (y % 5)) ctx.fillRect(x, y, 4 + (x % 3), 1);
    }

    // The near shore: puna grass, gold when it's kept, ash when the sky has had its way.
    ctx.drawImage(this.layers.ground, 0, 0);
    if (dull > 0) {
      ctx.fillStyle = rgba(ASH, dull * 0.8);
      ctx.fillRect(0, shore, SCENE_W, sh - shore);
    }

    // The hill on the right: lit down its left side, the side facing the morning.
    this.hillNow = mix(HILL, ASH, dull * 0.7);
    const lit = mix(HILL_LIT, ASH, dull * 0.6);
    const turned = mix(mix(HILL, "#7a6038", 0.45), ASH, dull * 0.7);
    for (let y = this.hillTop; y <= shore + 2; y++) {
      const x0 = this.hillEdge(y);
      // Lit down the near side, turning away into shadow toward the right edge.
      const turn = Math.round(x0 + (SCENE_W - x0) * 0.62 + noise(y, 6, 9) * 3);
      ctx.fillStyle = this.hillNow;
      ctx.fillRect(x0, y, SCENE_W - x0, 1);
      ctx.fillStyle = turned;
      ctx.fillRect(turn, y, SCENE_W - turn, 1);
      ctx.fillStyle = lit;
      ctx.fillRect(x0, y, 3 + Math.round((noise(y, 5, 10) + 1) * 2), 1);
      ctx.fillStyle = rgba("#5a4020", 0.18);
      for (let x = x0 + 4 + (y % 4); x < SCENE_W; x += 7 + (y % 3)) ctx.fillRect(x, y, 2, 1);
    }
    // Outcrops of the rock under it.
    for (const [k, dx] of [[0.12, 14], [0.42, 30], [0.7, 50], [0.3, 52]] as const) {
      const y = Math.round(this.hillTop + (shore - this.hillTop) * k);
      const x = this.hillEdge(y) + dx;
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(x + 1, y, 3, 1);
      ctx.fillStyle = STONE;
      ctx.fillRect(x, y + 1, 4, 1);
      ctx.fillStyle = STONE_DARK;
      ctx.fillRect(x + 4, y + 1, 1, 1);
      ctx.fillRect(x, y + 2, 6, 1);
      ctx.fillStyle = rgba("#000000", 0.15);
      ctx.fillRect(x + 1, y + 3, 6, 1);
    }
    ctx.fillStyle = rgba("#000000", 0.18);
    for (let y = this.hillTop; y <= shore; y++) ctx.fillRect(this.hillEdge(y) - 1, y, 1, 1);

    // Totora reeds along the water's edge.
    for (let x = 0; x < SCENE_W; x++) {
      const near = x < 60 || (x > this.hillEdge(shore) - 16 && x < this.hillEdge(shore));
      if (!near || hash(x * 5 + 1) < 0.3) continue;
      const h = 3 + Math.round(hash(x * 9) * 5);
      ctx.fillStyle = mix(REED, ASH, dull * 0.5);
      ctx.fillRect(x, shore - h, 1, h);
      ctx.fillStyle = mix(REED_TIP, ASH, dull * 0.5);
      ctx.fillRect(x, shore - h, 1, 1);
    }

    // The cloth at the front left, where everything gathered goes.
    for (let i = 0; i < 5; i++) {
      const y = sh - 5 + i;
      ctx.fillStyle = WEAVE[i % WEAVE.length]!;
      ctx.fillRect(0, y, 42, 1);
      if (i === 2) {
        ctx.fillStyle = WEAVE[4]!;
        for (let x = 1; x < 42; x += 3) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = rgba("#000000", 0.25);
    ctx.fillRect(42, sh - 5, 1, 5);
  }

  protected scene(t: number): void {
    this.drawMoon();
    this.drawClouds();
    this.drawShadows();
    this.drawCondor(t);
    this.drawTrail(t);
    this.drawGlints(t);
    this.drawBoat(t);
    this.drawTerraces();
    this.each("cave", (spot, _, __, s) => this.stand(s, spot.x, spot.y));
    this.drawTufts(t);
    this.drawShore(t);
    this.drawSmoke();
    this.drawPile(WILD_TUBER, 3, this.sh - 5, "flint");
    this.drawClumps(t);
    this.drawHail();
  }

  /** Each cloud's shadow, sliding over the grass and up the hill a long way below it. */
  private drawShadows(): void {
    const ctx = this.ctx;
    const D = this.sh - this.shore;
    this.clouds.forEach((c, i) => {
      const cy = Math.round(this.shore + D * (0.25 + i * 0.27));
      const rx = c.len * 0.9;
      const ry = 3 + i;
      const cx = c.x + c.len / 2 - 20 + i * 14;
      ctx.fillStyle = rgba("#2a2010", 0.08);
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
        ctx.fillRect(Math.round(cx - half), cy + dy, half * 2, 1);
      }
    });
  }

  /** Big ichu clumps right at the front, between you and all of it. */
  private drawClumps(t: number): void {
    const ctx = this.ctx;
    const dull = clamp((1 - this.view.condition) * 1.25, 0, 1);
    const base = mix("#6a5028", ASH, dull * 0.5);
    const tip = mix(TUFT_LIT, "#c8c4b8", dull * 0.7);
    const gust = ((t * 26) % (SCENE_W + 160)) - 80;
    for (const [x, h] of [[56, 9], [94, 12], [124, 8], [172, 11]] as const) {
      const near = Math.max(0, 1 - Math.abs(x - gust) / 16);
      const sway = Math.sin(t * 1.4 + x * 0.3) * 0.8 + near * 2;
      for (let b = -3; b <= 3; b++) {
        const bh = h - Math.abs(b) * 1.4;
        for (let j = 0; j < bh; j++) {
          const f = j / bh;
          const bx = Math.round(x + b * (0.6 + f * 0.9) + sway * f * f);
          ctx.fillStyle = f > 0.7 ? tip : base;
          ctx.fillRect(bx, this.sh - 1 - j, 1, 1);
        }
      }
    }
  }

  private drawClouds(): void {
    const ctx = this.ctx;
    const dull = clamp((1 - this.view.condition) * 1.25, 0, 1);
    for (const c of this.clouds) {
      c.x += c.speed * this.dt;
      if (c.x > SCENE_W + 4) c.x = -c.len - 4;
      const x = Math.round(c.x);
      ctx.fillStyle = rgba(mix("#ffffff", "#9aa0aa", dull), 0.85);
      ctx.fillRect(x, c.y, c.len, 2);
      ctx.fillRect(x + 3, c.y - 1, c.len - 9, 1);
      ctx.fillStyle = rgba(mix("#c8d4e8", "#7a808a", dull), 0.7);
      ctx.fillRect(x + 2, c.y + 2, c.len - 4, 1);
    }
  }

  /** In the daytime sky, a phase fuller for every generation the line has had. */
  private drawMoon(): void {
    const n = this.owned("moon");
    if (n <= 0) return;
    const ctx = this.ctx;
    const working = (this.view.working.moon ?? 0) > 0;
    const full = clamp(0.2 + this.view.generation * 0.07, 0.2, 1);
    const cx = 150;
    const cy = this.peakTop + 6;
    const r = 6;
    ctx.fillStyle = rgba(MOON, working ? 0.92 : 0.45);
    for (let dy = -r; dy <= r; dy++) {
      const hw = Math.sqrt(r * r - dy * dy);
      const from = Math.round(hw * (1 - 2 * full));
      const to = Math.round(hw);
      if (to > from) ctx.fillRect(cx + from, cy + dy, to - from, 1);
    }
    ctx.fillStyle = rgba("#c8c4b0", working ? 0.5 : 0.25);
    ctx.fillRect(cx + 2, cy - 2, 2, 1);
    ctx.fillRect(cx + 1, cy + 2, 1, 1);
  }

  /** One condor, riding the air in slow circles and never once flapping. */
  private drawCondor(t: number): void {
    const a = (t / 46) * Math.PI * 2;
    const x = 104 + Math.cos(a) * 40;
    const y = this.peakTop + 22 + Math.sin(a) * 8;
    this.stand(artCanvas(CONDOR), x, y);
  }

  private drawTrail(t: number): void {
    const ctx = this.ctx;
    const shown: { a: Spot; b: Spot; broken: boolean }[] = [];
    this.each("trail", (spot, i, broken) => shown.push({ a: this.trailPts[i]!, b: spot, broken }));
    if (shown.length === 0) return;
    for (const { a, b, broken } of shown) {
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      for (let s = 0; s <= steps; s++) {
        if (broken && s % 3 !== 0) continue;
        const x = Math.round(a.x + ((b.x - a.x) * s) / steps);
        const y = Math.round(a.y + ((b.y - a.y) * s) / steps);
        ctx.fillStyle = rgba("#2a2030", broken ? 0.12 : 0.3);
        ctx.fillRect(x, y + 1, 1, 1);
        ctx.fillStyle = rgba(TRAIL, broken ? 0.4 : 0.9);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // A cairn at the top once the trail reaches the pass.
    if (shown.length === this.trailPts.length - 1) {
      const top = this.trailPts.at(-1)!;
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(top.x, top.y - 2, 1, 2);
      ctx.fillRect(top.x - 1, top.y - 1, 3, 1);
    }
    // A string of llamas and a driver, very small, going up and coming back.
    const open = shown.filter((s) => !s.broken);
    if (open.length === 0) return;
    const pts = [this.trailPts[0]!, ...open.map((s) => s.b)];
    const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
    const total = lens.reduce((a, b) => a + b, 0);
    for (let k = 0; k < 4; k++) {
      let d = (((t * 2.2 - k * 3) % (total * 2)) + total * 2) % (total * 2);
      if (d > total) d = total * 2 - d;
      let i = 0;
      while (i < lens.length - 1 && d > lens[i]!) d -= lens[i++]!;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const f = lens[i]! > 0 ? d / lens[i]! : 0;
      ctx.fillStyle = k === 3 ? "#3a2a2a" : "#f0e8d8";
      ctx.fillRect(Math.round(a.x + (b.x - a.x) * f), Math.round(a.y + (b.y - a.y) * f) - 1, 1, 1);
    }
  }

  private drawGlints(t: number): void {
    const ctx = this.ctx;
    for (const g of this.glints) {
      const v = Math.sin(t * g.k + g.p);
      if (v < 0.75) continue;
      ctx.fillStyle = rgba("#ffffff", v > 0.93 ? 0.85 : 0.4);
      ctx.fillRect(g.x, g.y, v > 0.93 ? 3 : 2, 1);
    }
  }

  /** A reed boat out on the water once there's a village to row home to. */
  private drawBoat(t: number): void {
    if ((this.view.working.ancestor ?? 0) <= 0) return;
    const ctx = this.ctx;
    const b = this.boat;
    b.x += b.dir * 1.4 * this.dt;
    if (b.x > 70) b.dir = -1;
    if (b.x < 10) b.dir = 1;
    const x = Math.round(b.x);
    const y = this.shore - 5 + Math.round(Math.sin(t * 1.2));
    ctx.fillStyle = rgba("#000000", 0.2);
    ctx.fillRect(x - 5, y + 2, 11, 1);
    ctx.fillStyle = "#c8b060";
    ctx.fillRect(x - 4, y, 9, 2);
    ctx.fillRect(x - 5, y - 1, 1, 2);
    ctx.fillRect(x + 5, y - 1, 1, 2);
    ctx.fillStyle = "#8a7238";
    ctx.fillRect(x - 4, y + 1, 9, 1);
    // Whoever's in it, standing, with a pole.
    ctx.fillStyle = "#a0402e";
    ctx.fillRect(x - 1, y - 4, 2, 4);
    ctx.fillStyle = "#1e1a22";
    ctx.fillRect(x - 1, y - 6, 2, 2);
    ctx.fillStyle = "#8a6a3a";
    ctx.fillRect(x + 2 * b.dir, y - 7, 1, 9);
  }

  /** The hill in steps: a dry stone wall under each, planted along the top, in flower once they're kept a while. */
  private drawTerraces(): void {
    const ctx = this.ctx;
    const flowering = this.primed("cairn");
    this.each("cairn", (spot, i, broken) => {
      const y = spot.y;
      const x0 = this.hillEdge(y) + 1;
      const w = SCENE_W - x0;
      ctx.fillStyle = broken ? mix(this.hillNow, "#6a5a3a", 0.3) : PLANTED;
      ctx.fillRect(x0 + 1, y - 3, w, 3);
      if (!broken) {
        ctx.fillStyle = PLANTED_DARK;
        for (let x = x0 + 2 + (i % 2); x < SCENE_W; x += 3) ctx.fillRect(x, y - 3, 1, 2);
        if (flowering) {
          ctx.fillStyle = FLOWER;
          for (let x = x0 + 4 + i; x < SCENE_W; x += 6) ctx.fillRect(x, y - 4, 1, 1);
        }
      }
      ctx.fillStyle = STONE;
      ctx.fillRect(x0, y, w, 3);
      ctx.fillStyle = STONE_LIT;
      ctx.fillRect(x0, y, w, 1);
      ctx.fillStyle = STONE_DARK;
      for (let x = x0 + (i % 2) * 2; x < SCENE_W; x += 4) ctx.fillRect(x, y + 1 + ((x >> 2) % 2), 1, 1);
      ctx.fillStyle = rgba("#000000", 0.25);
      ctx.fillRect(x0, y + 3, w, 1);
      if (broken) {
        // It slipped: a gap in the wall and the stones down the slope under it.
        const gx = x0 + 8 + ((i * 13) % Math.max(1, w - 20));
        ctx.fillStyle = this.hillNow;
        ctx.fillRect(gx, y, 7, 3);
        ctx.fillStyle = STONE;
        ctx.fillRect(gx - 1, y + 4, 2, 1);
        ctx.fillRect(gx + 3, y + 5, 2, 1);
        ctx.fillRect(gx + 6, y + 4, 1, 1);
      }
    });
  }

  /** Ichu grass in the wind, and every so often a gust going through it. */
  private drawTufts(t: number): void {
    const ctx = this.ctx;
    const dull = clamp((1 - this.view.condition) * 1.25, 0, 1);
    const dark = mix(TUFT, ASH, dull * 0.6);
    const light = mix(TUFT_LIT, "#c8c4b8", dull * 0.7);
    const gust = ((t * 26) % (SCENE_W + 160)) - 80;
    for (const tf of this.tufts) {
      const near = Math.max(0, 1 - Math.abs(tf.x - gust) / 16);
      const sway = Math.round(Math.sin(t * 1.7 + tf.x * 0.23) * 0.6 + near * 1.4);
      ctx.fillStyle = near > 0.4 ? light : dark;
      for (const [dx, lean] of [[-1, -1], [0, 0], [1, 1]] as const) {
        const h = tf.h - Math.abs(dx);
        for (let j = 0; j < h; j++) {
          const bend = j >= h - 1 ? sway + lean : j >= h - 2 ? Math.round((sway + lean) / 2) : 0;
          ctx.fillRect(tf.x + dx + bend, tf.y - j, 1, 1);
        }
      }
    }
  }

  /** Everything standing on the near shore, back to front, so a llama can walk in front of a house. */
  private drawShore(t: number): void {
    const items: { y: number; draw: () => void }[] = [];
    const add = (y: number, draw: () => void) => items.push({ y, draw });

    this.each("ancestor", (spot, i, broken, s) =>
      add(spot.y, () => {
        this.stand(s, spot.x, spot.y);
        if (!broken && this.chance(1.1) && this.smoke.length < 60) {
          this.smoke.push({ x: spot.x + 1 + (i % 2), y: spot.y - s.h, life: 3.5 });
        }
      }),
    );
    this.each("moon", (spot, _, __, s) => add(spot.y, () => this.stand(s, spot.x, spot.y)));
    this.each("flint", (spot, _, __, s) => add(spot.y, () => this.stand(s, spot.x, spot.y)));
    this.each("tusk", (spot, i, broken, s) =>
      add(spot.y, () => {
        this.stand(s, spot.x, spot.y);
        // Frost on it, catching the light.
        if (!broken && Math.sin(t * 2.3 + i * 1.7) > 0.8) {
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fillRect(spot.x - 5 + ((i * 5) % 11), spot.y - 3, 1, 1);
        }
      }),
    );
    const grazing = this.view.condition > 0.45;
    this.each("herd", (spot, i, broken, s) => {
      const l = this.llamas[i]!;
      let bob = 0;
      if (!broken && grazing) {
        if (l.wait > 0) l.wait -= this.dt;
        else {
          const dir = l.goal > l.x ? 1 : -1;
          l.dir = dir;
          l.x += dir * 2.6 * this.dt;
          bob = Math.round(Math.abs(Math.sin(t * 5 + i)));
          if (Math.abs(l.goal - l.x) < 1) {
            l.goal = 56 + Math.random() * 112;
            l.wait = 2 + Math.random() * 6;
          }
        }
      }
      add(spot.y, () => this.face(s, l.x, spot.y - bob, l.dir));
    });
    const mark = this.mark("ochre");
    this.each("ochre", (spot, i, broken, s) => {
      const c = this.foragers[i]!;
      const bob = this.carry(c, 74 + i * 14, 40 + i * 3, 7, broken, t);
      add(spot.y, () => {
        this.face(s, c.x, spot.y - bob, c.dir);
        if (!c.loaded || broken) return;
        // The bundle on their back: whatever cloth this generation weaves.
        const bx = Math.round(c.x) + (c.dir === -1 ? 3 : -6);
        const by = spot.y - bob - 9;
        this.ctx.fillStyle = WEAVE[mark % WEAVE.length]!;
        this.ctx.fillRect(bx, by, 4, 4);
        this.ctx.fillStyle = WEAVE[(mark + 1) % WEAVE.length]!;
        this.ctx.fillRect(bx, by + 1, 4, 1);
      });
    });
    this.each("eighth", (spot, _, broken, s) =>
      add(spot.y, () => {
        if (!broken) this.glow(spot.x - 3, spot.y - 6, 13 + Math.sin(t * 0.8), "#fff0c0", 0.1);
        this.stand(s, spot.x, spot.y);
      }),
    );

    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
  }

  private drawSmoke(): void {
    const ctx = this.ctx;
    for (const p of this.smoke) {
      p.life -= this.dt;
      p.y -= 4 * this.dt;
      p.x += (1.5 + Math.sin(p.y / 5) * 0.8) * this.dt;
      ctx.fillStyle = rgba("#e8e4dc", Math.min(0.4, p.life * 0.12));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
    }
    this.smoke = this.smoke.filter((p) => p.life > 0);
  }

  /** The sky turning: hail, slanting in off the lake. */
  private drawHail(): void {
    const ctx = this.ctx;
    const dull = clamp((1 - this.view.condition) * 1.25, 0, 1);
    const rate = Math.max(0, dull - 0.35) * 90;
    for (let i = 0; i < 4; i++) {
      if (this.hail.length < 160 && this.chance(rate / 4)) this.hail.push({ x: Math.random() * (SCENE_W + 40) - 40, y: -2 });
    }
    ctx.fillStyle = rgba("#eef2f6", 0.75);
    for (const h of this.hail) {
      h.y += 70 * this.dt;
      h.x += 18 * this.dt;
      ctx.fillRect(Math.round(h.x), Math.round(h.y), 1, 2);
    }
    this.hail = this.hail.filter((h) => h.y < this.sh);
  }
}
