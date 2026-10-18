/**
 * Beyond: the inside of the Second Potato, drawn as a hollow world. You stand on the inside of a
 * sphere — the field curves up at both edges, the far side of it hangs overhead upside down, and
 * the sun in the middle is a potato with an eye. The farm again, but wrong.
 *
 * Same buffer conventions as `farmScene.ts` / `insideScene.ts`: integer-aligned unscaled blits,
 * translation-only animation. The air is an ellipse wider than the buffer; everything outside it is
 * ground, near (below) or far (above).
 */

import type { solo } from "@clickers/sim";

import { POTATO_SPRITE, PRODUCER_MARKS } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  heapSlots,
  HEAP_CAP,
  mix,
  mulberry32,
  rgba,
  yardLayout,
  type FarmView,
} from "./farmScene.js";
import { shownCount, territory } from "./insideScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type BeyondId = Extract<solo.SoloProducerId, "echo" | "kin" | "grove" | "tide" | "beacon" | "third">;

export const ORDER: BeyondId[] = ["echo", "kin", "grove", "tide", "beacon", "third"];

/** How many of each ever appear, however many you own. */
const CAP: Record<BeyondId, number> = {
  echo: 9,
  kin: 6,
  grove: 6,
  tide: 4,
  beacon: 5,
  third: 4,
};

/** What a hundred-owned tier throws light in. */
const PRIME_GLOW: Record<BeyondId, string> = {
  echo: "#e8d8ff",
  kin: "#ffd166",
  grove: "#a8f07a",
  tide: "#fff4e0",
  beacon: "#ff9a3c",
  third: "#fff4c0",
};

// --- The place ---

const AIR_HI = "#f6e6b8";
const AIR_LO = "#e8c88c";
const HAZE = "#fff4c0";
const FAR_LIT = "#c9a874";
const FAR_DEEP = "#9c7a4e";
const GRASS = "#6aa348";
const GRASS_DRY = "#a89a5a";
const SOIL = "#8a5f3f";
const SOIL_DARK = "#6b4630";
const STARCH = "#f2e3c8";
const STARCH_DEEP = "#d8c49a";
const BROKEN_TINT = "#5a5560";
const INK = "#402e3a";

/** The sun's eye blinks on its own clock, off any round number. */
const BLINK_EVERY_S = 6.3;
const BLINK_S = 0.18;
const TIDE_PERIOD_S = 9.1;

const MOTES = 26;
const DUG_MS = 1100;
const MAX_CROP = 28;

interface Mote {
  x: number;
  y: number;
  rise: number;
  phase: number;
}

interface Dug {
  x: number;
  y: number;
  born: number;
}

/** A potato on its way to the mound: drops off whatever made it, then rolls down the bowl to the pile. */
interface Crop {
  x: number;
  y: number;
  vy: number;
  rolling: boolean;
}

/** A kinsperson's walk along the near lip. */
interface Walker {
  x: number;
  dir: 1 | -1;
  until: number;
  paused: boolean;
  phase: number;
}

/** Disc filled a row at a time, so a glow stays on the pixel grid. */
function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** The same art upside down, for anything that grows off the far side. Cached so `artCanvas` caches it too. */
const flipped = new Map<Art, Art>();
function flip(art: Art): Art {
  let out = flipped.get(art);
  if (!out) {
    out = { rows: [...art.rows].reverse(), palette: art.palette };
    flipped.set(art, out);
  }
  return out;
}

/** The air ellipse for a buffer height. Pure, so the geometry can be reasoned about apart from drawing. */
export function airFor(sh: number): { cx: number; cy: number; rx: number; ry: number } {
  return { cx: SCENE_W / 2, cy: Math.round(sh * 0.4), rx: 120, ry: Math.round(sh * 0.3) };
}

export class BeyondScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: FarmView = EMPTY_VIEW;
  private rng: () => number = mulberry32(1);
  private sawView = false;
  /** Per-column edges of the air: far ground ends at `ceil[x]`, near ground starts at `ground[x]`. */
  private ceil: number[] = [];
  private ground: number[] = [];
  /** Stable per-seed x positions per tier, so your beyond is laid out like yours. */
  private spots: Record<BeyondId, number[]> = {} as Record<BeyondId, number[]>;
  private motes: Mote[] = [];
  private dug: Dug[] = [];
  private crop: Crop[] = [];
  private walkers: Walker[] = [];
  /** Where the sun is looking. Toward the last dig, drifting back to the field. */
  private look = { x: 0, y: 0 };
  private shown = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? rect.height / rect.width : 1.1;
    this.sh = Math.max(90, Math.min(340, Math.round(SCENE_W * ratio)));
    this.canvas.width = SCENE_W;
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
    const { cx, cy, rx, ry } = airFor(this.sh);
    this.ceil = [];
    this.ground = [];
    for (let x = 0; x < SCENE_W; x++) {
      const u = (x + 0.5 - cx) / rx;
      const dy = ry * Math.sqrt(Math.max(0, 1 - u * u));
      this.ceil.push(Math.round(cy - dy));
      this.ground.push(Math.round(cy + dy));
    }
  }

  update(view: FarmView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.rng = mulberry32(hashSeed(view.seed + ":beyond"));
      this.layOut();
      this.motes = [];
      this.dug = [];
      this.crop = [];
      this.walkers = [];
      this.shown = Math.max(0, view.hoard);
    }
    this.sawView = true;
  }

  start(): void {
    if (this.raf) return;
    this.lastFrame = performance.now();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
  }

  /** A dig: a potato comes up where you tapped, and falls toward the sun. The sun watches it go. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 12) return;
    const x = at ? clamp(Math.round(at.x), 3, SCENE_W - 8) : Math.round(50 + Math.random() * 100);
    const floor = this.ground[clamp(x, 0, SCENE_W - 1)]!;
    const y = at ? clamp(Math.round(at.y), 4, this.sh - 6) : floor + 3 + Math.round(Math.random() * 8);
    this.dug.push({ x, y, born: performance.now() });
    this.look = { x, y };
  }

  // --- Where things are ---

  /** Spread each tier's spots across its stretch of the bowl, jittered once per seed. */
  private layOut(): void {
    const spread = (n: number, lo: number, hi: number): number[] => {
      const out: number[] = [];
      const step = (hi - lo) / n;
      for (let i = 0; i < n; i++) out.push(Math.round(lo + step * (i + 0.5) + (this.rng() - 0.5) * step * 0.6));
      return out;
    };
    // Mixed rather than left-to-right, so the first few of a tier don't all bunch at one end.
    const shuffle = (xs: number[]): number[] => {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [xs[i], xs[j]] = [xs[j]!, xs[i]!];
      }
      return xs;
    };
    this.spots = {
      echo: shuffle(spread(CAP.echo, 62, 138)),
      kin: spread(CAP.kin, 40, 150),
      grove: shuffle(spread(CAP.grove, 10, 160)),
      tide: spread(CAP.tide, 138, 172),
      // Up the left slope, where the bowl starts to climb toward the far side.
      beacon: shuffle(spread(CAP.beacon, 12, 52)),
      third: [],
    };
  }

  private art(id: BeyondId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = clamp(this.view.marks[id] ?? 0, 0, marks.length - 1);
    return marks[level] ?? marks[0];
  }

  private primed(id: BeyondId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Drawn working and broken counts. Broken ones keep their place, greyed, so damage is where it happened. */
  private counts(id: BeyondId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total === 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? clamp(Math.round((total * b) / (w + b)), 1, total) : 0;
    return { working: total - broken, broken };
  }

  private sprite(id: BeyondId, broken: boolean, up = false): Sprite {
    const art = up ? flip(this.art(id)) : this.art(id);
    return broken ? artTinted(art, BROKEN_TINT, 0.6) : artCanvas(art);
  }

  private groundAt(x: number): number {
    return this.ground[clamp(Math.round(x), 0, SCENE_W - 1)]!;
  }

  private ceilAt(x: number): number {
    return this.ceil[clamp(Math.round(x), 0, SCENE_W - 1)]!;
  }

  private sun(): { x: number; y: number } {
    const { cx, cy, ry } = airFor(this.sh);
    return { x: cx, y: Math.round(cy - ry * 0.12) };
  }

  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  // --- Drawing ---

  private draw(): void {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += this.dt;
    const t = this.clock;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SCENE_W, this.sh);

    this.drawAir();
    this.drawOrbiters(t, true);
    this.drawSun(t);
    this.drawOrbiters(t, false);
    this.drawFar(t);
    this.drawGrove(t);
    this.drawMotes(t);
    this.drawNear();
    this.drawTide(t);
    this.drawBeacons(t);
    this.drawEcho(t);
    this.drawHoard();
    this.stepCrop();
    this.drawKin(t);
    this.drawDug(now);
  }

  /** The air: bright at the sun, warmer toward the ground, so the eye goes to the middle first. */
  private drawAir(): void {
    const ctx = this.ctx;
    const sun = this.sun();
    for (let y = 0; y < this.sh; y++) {
      const k = clamp(Math.abs(y - sun.y) / (this.sh * 0.6), 0, 1);
      ctx.fillStyle = mix(AIR_HI, AIR_LO, k);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // The halo grows with how many suns you've hung; the first is there before you buy anything.
    const lit = territory(this.view.working.third ?? 0, 0, 1);
    for (const [r, a] of [
      [34 + 10 * lit, 0.1],
      [24 + 6 * lit, 0.14],
      [16 + 3 * lit, 0.2],
    ] as const) {
      fillDisc(ctx, sun.x, sun.y, r, rgba(HAZE, a + 0.06 * lit));
    }
  }

  /** The sun: a potato, lit from inside, with an eye that follows your digging and blinks. */
  private drawSun(t: number): void {
    const ctx = this.ctx;
    const { x, y } = this.sun();
    const pulse = Math.round(Math.sin(t * 1.3) * 0.6);
    // Oblong, tilted a pixel: the same potato silhouette the HUD icon uses, at sun scale.
    for (let dy = -8; dy <= 8; dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, 1 - (dy / 8.5) ** 2)) * (11 + pulse));
      const lean = Math.round(dy * -0.15);
      ctx.fillStyle = dy < -4 ? "#fff4c0" : dy < 3 ? "#ffd166" : "#e0a040";
      ctx.fillRect(x - half + lean, y + dy, half * 2 + 1, 1);
    }
    ctx.fillStyle = "#c98b4b";
    ctx.fillRect(x - 7, y + 4, 1, 1);
    ctx.fillRect(x + 6, y - 2, 1, 1);
    ctx.fillRect(x + 3, y + 5, 1, 1);

    // The look eases back toward the middle of the field between digs.
    const rest = { x: SCENE_W / 2, y: this.groundAt(SCENE_W / 2) };
    const k = 1 - Math.pow(0.4, this.dt);
    this.look.x += (rest.x - this.look.x) * k * 0.3;
    this.look.y += (rest.y - this.look.y) * k * 0.3;

    const blink = (t % BLINK_EVERY_S) < BLINK_S;
    if (blink) {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 4, y, 9, 1);
      return;
    }
    ctx.fillStyle = INK;
    ctx.fillRect(x - 4, y - 2, 9, 5);
    ctx.fillStyle = "#fffbe8";
    ctx.fillRect(x - 3, y - 1, 7, 3);
    const dx = clamp(Math.round((this.look.x - x) / 30), -2, 2);
    const dy = clamp(Math.round((this.look.y - y) / 40), -1, 1);
    ctx.fillStyle = this.primed("third") ? "#7a3aa0" : "#2a1520";
    ctx.fillRect(x - 1 + dx, y - 1 + Math.max(0, dy), 3, 2);
  }

  /** Inner Suns: smaller copies of it on a tilted orbit. `back` draws the half behind the big one. */
  private drawOrbiters(t: number, back: boolean): void {
    const { working, broken } = this.counts("third");
    const n = working + broken;
    if (n === 0) return;
    const sun = this.sun();
    for (let i = 0; i < n; i++) {
      const isBroken = i >= working;
      // Broken ones stop where they are.
      const a = (isBroken ? 0 : t * 0.22) + (i * Math.PI * 2) / n;
      const behind = Math.sin(a) < 0;
      if (behind !== back) continue;
      const s = this.sprite("third", isBroken);
      const x = Math.round(sun.x + Math.cos(a) * 30 - s.w / 2);
      const y = Math.round(sun.y + Math.sin(a) * 10 - s.h / 2);
      if (this.primed("third") && !isBroken) fillDisc(this.ctx, x + s.w / 2, y + s.h / 2, 8, rgba(PRIME_GLOW.third, 0.3));
      this.ctx.globalAlpha = behind ? 0.75 : 1;
      this.ctx.drawImage(s.canvas, x, y);
      this.ctx.globalAlpha = 1;
    }
  }

  /** The far side: your field, upside down overhead, hazed by the distance across the sun. */
  private drawFar(t: number): void {
    const ctx = this.ctx;
    const furrow = rgba(INK, 0.18);
    const crop = mix(GRASS, FAR_LIT, 0.35);
    for (let x = 0; x < SCENE_W; x++) {
      const c = this.ceil[x]!;
      if (c <= 0) continue;
      ctx.fillStyle = FAR_DEEP;
      ctx.fillRect(x, 0, 1, c);
      ctx.fillStyle = FAR_LIT;
      ctx.fillRect(x, Math.max(0, c - 4), 1, 4);
      // Furrows, following the curve, hanging the wrong way.
      ctx.fillStyle = furrow;
      for (let r = 7; r < c; r += 6) ctx.fillRect(x, c - r, 1, 1);
      // Tiny crops along the lip, pointing at you.
      if ((x * 7 + 3) % 9 === 0) {
        ctx.fillStyle = crop;
        ctx.fillRect(x, c, 1, 2);
      }
    }
    // A shimmer across the lip, which is the heat of the sun between you and it.
    ctx.fillStyle = rgba(HAZE, 0.25);
    const sx = Math.round(((t * 9) % (SCENE_W + 40)) - 20);
    for (let x = sx; x < sx + 18; x++) {
      if (x < 0 || x >= SCENE_W) continue;
      ctx.fillRect(x, this.ceil[x]! - 1, 1, 2);
    }
  }

  /** Upside Groves: potato trees hanging off the far side. They drop their crop down to you. */
  private drawGrove(t: number): void {
    const { working, broken } = this.counts("grove");
    const n = working + broken;
    for (let i = 0; i < n; i++) {
      const isBroken = i >= working;
      const s = this.sprite("grove", isBroken, true);
      const cx = this.spots.grove[i]!;
      const x = Math.round(cx - s.w / 2);
      const sway = isBroken ? 0 : Math.round(Math.sin(t * 0.8 + i * 1.7) * 0.6);
      const y = this.ceilAt(cx) - 2;
      if (this.primed("grove") && !isBroken) fillDisc(this.ctx, cx, y + s.h - 3, 7, rgba(PRIME_GLOW.grove, 0.25));
      this.ctx.drawImage(s.canvas, x + sway, y);
      if (!isBroken && this.chance(0.18) && this.crop.length < MAX_CROP) {
        this.crop.push({ x: cx + sway, y: y + s.h - 2, vy: 0, rolling: false });
      }
    }
  }

  /** Dust falling up: off the field, toward the sun. The ambient motion in a world with no weather to speak of. */
  private drawMotes(t: number): void {
    const ctx = this.ctx;
    const sun = this.sun();
    while (this.motes.length < MOTES) {
      const x = Math.random() * SCENE_W;
      this.motes.push({
        x,
        y: this.groundAt(x) - Math.random() * 40,
        rise: 4 + Math.random() * 6,
        phase: Math.random() * 6,
      });
    }
    for (const m of this.motes) {
      m.y -= m.rise * this.dt;
      m.x += (sun.x - m.x) * 0.08 * this.dt + Math.sin(t + m.phase) * 0.05;
      const d = Math.hypot(m.x - sun.x, m.y - sun.y);
      ctx.fillStyle = rgba(HAZE, clamp(d / 60, 0, 0.7));
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
    this.motes = this.motes.filter((m) => Math.hypot(m.x - sun.x, m.y - sun.y) > 10 && m.y > 0);
  }

  /** The near field: the bowl you stand in, its lip curving up to meet the far side at both edges. */
  private drawNear(): void {
    const ctx = this.ctx;
    const grass = mix(GRASS, GRASS_DRY, clamp(1 - this.view.condition, 0, 1) * 1.3);
    for (let x = 0; x < SCENE_W; x++) {
      const g = this.ground[x]!;
      if (g >= this.sh) continue;
      ctx.fillStyle = SOIL;
      ctx.fillRect(x, g, 1, this.sh - g);
      ctx.fillStyle = grass;
      ctx.fillRect(x, g, 1, 2);
      ctx.fillStyle = SOIL_DARK;
      for (let r = 6; g + r < this.sh; r += 5) ctx.fillRect(x, g + r, 1, 1);
    }
  }

  /** The starch sea, banked against the right of the bowl. It comes in further the better the ground is. */
  private drawTide(t: number): void {
    const { working, broken } = this.counts("tide");
    const n = working + broken;
    if (n === 0) return;
    const ctx = this.ctx;
    const swell = Math.sin((t / TIDE_PERIOD_S) * Math.PI * 2);
    const reach = Math.round(126 + (1 - this.view.condition) * 30 - swell * 3);
    for (let x = reach; x < SCENE_W; x++) {
      const g = this.ground[x]!;
      const depth = Math.min(16, Math.round((x - reach) / 2));
      ctx.fillStyle = STARCH_DEEP;
      ctx.fillRect(x, g - 1, 1, depth + 2);
      ctx.fillStyle = STARCH;
      ctx.fillRect(x, g - 1, 1, 1);
    }
    for (let i = 0; i < n; i++) {
      const isBroken = i >= working;
      const cx = this.spots.tide[i]!;
      if (cx < reach + 4) continue;
      const s = this.sprite("tide", isBroken);
      const bob = isBroken ? 0 : Math.round(Math.sin(t * 1.4 + i) * 0.6);
      const x = Math.round(cx - s.w / 2);
      const y = this.groundAt(cx) - s.h + 3 + bob;
      if (this.primed("tide") && !isBroken) fillDisc(ctx, cx, y + 4, 7, rgba(PRIME_GLOW.tide, 0.3));
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** Hearth Lanterns, one flame each, glowing wider the more farms you've handed down. */
  private drawBeacons(t: number): void {
    const { working, broken } = this.counts("beacon");
    const ctx = this.ctx;
    const reach = 3 + Math.min(5, Math.log2(Math.max(1, this.view.generation)));
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const cx = this.spots.beacon[i]!;
      const s = this.sprite("beacon", isBroken);
      const x = Math.round(cx - s.w / 2);
      const y = this.groundAt(cx) - s.h + 2;
      if (!isBroken) {
        const flicker = 0.18 + 0.06 * Math.sin(t * 7 + i * 2.3);
        fillDisc(ctx, cx, y + 2, reach + (this.primed("beacon") ? 3 : 0), rgba(PRIME_GLOW.beacon, flicker));
      }
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** Echo Plots, along the front of the bowl. Each has its pale twin, which comes and goes. */
  private drawEcho(t: number): void {
    const { working, broken } = this.counts("echo");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const cx = this.spots.echo[i]!;
      const s = this.sprite("echo", isBroken);
      // Three rows down into the near field, so nine don't read as a fence.
      const row = 6 + (i % 3) * 8;
      const x = Math.round(cx - s.w / 2);
      const y = this.groundAt(cx) - s.h + row;
      if (!isBroken) {
        // The twin: the same plant a step back, fading in and out on its own phase.
        const a = 0.25 + 0.2 * Math.sin(t * 0.9 + i * 1.9);
        ctx.globalAlpha = a;
        ctx.drawImage(s.canvas, x - 3, y - 2);
        ctx.globalAlpha = 1;
        if (this.primed("echo")) fillDisc(ctx, cx, y + 3, 6, rgba(PRIME_GLOW.echo, 0.3));
      }
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken && this.chance(0.12) && this.crop.length < MAX_CROP) {
        this.crop.push({ x: cx, y: y + s.h - 3, vy: -12, rolling: false });
      }
    }
  }

  /** The hoard: a mound at the front-left, the same heap the farm keeps, in the bottom of the bowl. */
  private drawHoard(): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const heap = Math.min(HEAP_CAP, Math.max(0, Math.round(yardLayout(this.shown).heap)));
    const potato = artCanvas(POTATO_SPRITE);
    const slots = heapSlots();
    const foot = this.sh - 1;
    for (let i = 0; i < heap; i++) {
      const slot = slots[i];
      if (!slot) break;
      this.ctx.drawImage(potato.canvas, slot.x + 4, foot + slot.y);
    }
  }

  /** Crop falls to the field, then rolls downhill and left into the mound. */
  private stepCrop(): void {
    const potato = artCanvas(POTATO_SPRITE);
    const ctx = this.ctx;
    for (const c of this.crop) {
      const floor = this.groundAt(c.x) + 2;
      if (!c.rolling) {
        c.vy += 70 * this.dt;
        c.y += c.vy * this.dt;
        if (c.y >= floor) {
          c.y = floor;
          c.rolling = true;
        }
      } else {
        c.x -= 26 * this.dt;
        c.y = this.groundAt(c.x) + 2;
      }
      ctx.drawImage(potato.canvas, Math.round(c.x) - 3, Math.round(c.y) - potato.h);
    }
    this.crop = this.crop.filter((c) => c.x > 30);
  }

  /** Kinfolk, walking the near lip and stopping to look at things. Broken ones stand where they stopped. */
  private drawKin(t: number): void {
    const { working, broken } = this.counts("kin");
    const n = working + broken;
    while (this.walkers.length < n) {
      const i = this.walkers.length;
      this.walkers.push({
        x: this.spots.kin[i] ?? 90,
        dir: Math.random() < 0.5 ? 1 : -1,
        until: t + 1 + Math.random() * 3,
        paused: false,
        phase: Math.random() * 6,
      });
    }
    this.walkers.length = n;
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const w = this.walkers[i]!;
      const isBroken = i >= working;
      if (!isBroken) {
        if (t >= w.until) {
          w.paused = !w.paused;
          w.until = t + (w.paused ? 0.8 + Math.random() * 2 : 2 + Math.random() * 4);
          if (!w.paused && Math.random() < 0.5) w.dir = w.dir === 1 ? -1 : 1;
        }
        if (!w.paused) {
          w.x += w.dir * 7 * this.dt;
          if (w.x < 34 || w.x > 156) w.dir = w.x < 34 ? 1 : -1;
        }
      }
      const s = this.sprite("kin", isBroken);
      const bob = !isBroken && !w.paused ? Math.round(Math.abs(Math.sin(t * 8 + w.phase)) * 1) : 0;
      const x = Math.round(w.x - s.w / 2);
      const y = this.groundAt(w.x) - s.h + 5 - bob;
      if (this.primed("kin") && !isBroken) fillDisc(ctx, w.x, y + 4, 6, rgba(PRIME_GLOW.kin, 0.25));
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** A dug potato: up out of the ground, then off toward the sun, getting smaller in the glare. */
  private drawDug(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    const sun = this.sun();
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      const lift = Math.round(Math.sin(Math.min(1, age * 3) * Math.PI * 0.5) * 5);
      // After the pop, it goes the wrong way.
      const away = Math.max(0, (age - 0.3) / 0.7);
      const e = away * away;
      const x = Math.round(d.x + (sun.x - d.x) * e * 0.8);
      const y = Math.round(d.y - lift + (sun.y - d.y) * e * 0.8);
      ctx.globalAlpha = 1 - e;
      ctx.drawImage(potato.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }
}
