/**
 * Void: the sky before there were dogs, with a dog in it. Night over a dark hill, Star Pups hanging
 * where they were whistled up, Sky Herders on the ridge with their crooks, a Crate Blanket thrown
 * over the top of everything, Litter Nebulae glowing as bright as the dark is kept, Constellations
 * joining up dot by dot with every generation, and the Fifth Chihuahua — the Dog Star — shaking.
 * The litter sleeps on a blanket on the hilltop.
 *
 * Same buffer conventions as `originScene.ts`: integer-aligned unscaled blits, translation-only
 * animation. The sky gradient and the hill never move, so they're worked out once per size.
 */

import type { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE, ZZZ } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  mix,
  mulberry32,
  rgba,
  shownCount,
  yardLayout,
  type MillView,
} from "./millScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type VoidId = Extract<solo.SoloProducerId, "mote" | "wisp" | "veil" | "nebula" | "aeon" | "fifth">;

const CAP: Record<VoidId, number> = {
  mote: 14,
  wisp: 4,
  veil: 3,
  nebula: 3,
  aeon: 4,
  fifth: 1,
};

const PRIME_GLOW: Record<VoidId, string> = {
  mote: "#fff4c0",
  wisp: "#ffd166",
  veil: "#c07ab0",
  nebula: "#f0a0d0",
  aeon: "#a8b8ff",
  fifth: "#fff4c0",
};

const SKY_TOP = "#04061a";
const SKY_MID = "#10163a";
const SKY_LOW = "#2a2458";
const MILKY = "#3a3a70";
const HILL = "#0e0c1c";
const HILL_EDGE = "#2a2a4a";
const STAR = "#e8e8ff";
const BLANKET = "#5a3a6a";
const BLANKET_EDGE = "#3a2448";
const BROKEN_TINT = "#2e2c40";
const COLD = "#06081a";

const STARS = 80;
const LEAP_MS = 900;
const MAX_PUPS = 6;

interface Spot {
  x: number;
  y: number;
}

interface Herder {
  x: number;
  dir: 1 | -1;
  until: number;
  paused: boolean;
}

interface Leap {
  x: number;
  y: number;
  dir: 1 | -1;
  born: number;
}

interface Streak {
  x: number;
  y: number;
  age: number;
}

function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const R = Math.round(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
  }
}

/** A line of single pixels between two points. */
function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }
}

/** Where the hill's crest sits for a buffer height. Low: this world is mostly sky. */
export function crestFor(sh: number): number {
  return Math.round(sh * 0.74);
}

export class VoidScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private crest = 148;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: MillView = EMPTY_VIEW;
  private sawView = false;

  private skyRows: string[] = [];
  private hill: number[] = [];
  private stars: { x: number; y: number; phase: number }[] = [];
  private spots: Record<VoidId, Spot[]> = {} as Record<VoidId, Spot[]>;

  private herders: Herder[] = [];
  private leaps: Leap[] = [];
  private streaks: Streak[] = [];
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
    const sh = Math.max(90, Math.min(340, Math.round(SCENE_W * ratio)));
    const resized = sh !== this.sh || this.skyRows.length === 0;
    this.sh = sh;
    this.canvas.width = SCENE_W;
    this.canvas.height = sh;
    this.ctx.imageSmoothingEnabled = false;
    if (!resized) return;
    this.crest = crestFor(sh);
    this.skyRows = [];
    for (let y = 0; y < sh; y++) {
      const k = y / Math.max(1, this.crest);
      this.skyRows.push(k < 0.6 ? mix(SKY_TOP, SKY_MID, k / 0.6) : mix(SKY_MID, SKY_LOW, clamp((k - 0.6) / 0.4, 0, 1)));
    }
    // A long low hill, highest a little right of middle, where the herders stand.
    this.hill = [];
    for (let x = 0; x < SCENE_W; x++) {
      const k = (x - 104) / 90;
      this.hill.push(Math.round(this.crest + 14 * k * k - 2 * Math.sin(x / 9)));
    }
    const r = mulberry32(5);
    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      this.stars.push({ x: Math.floor(r() * SCENE_W), y: Math.floor(r() * this.crest), phase: r() * 6 });
    }
    if (this.sawView) this.layOut();
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.sawView = true;
      this.layOut();
      this.herders = [];
      this.leaps = [];
      this.streaks = [];
      this.shown = Math.max(0, view.hoard);
    }
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

  /** A whistle: a star streaks across from where you tapped, and a pup jumps up on the hill. */
  whistle(at?: { x: number; y: number }): void {
    if (this.leaps.length >= MAX_PUPS) return;
    const x = at ? clamp(Math.round(at.x), 6, SCENE_W - 12) : Math.round(30 + Math.random() * (SCENE_W - 60));
    const y = at ? clamp(Math.round(at.y), 4, this.sh - 4) : Math.round(this.crest * (0.2 + Math.random() * 0.5));
    this.streaks.push({ x, y: Math.min(y, this.crest - 4), age: 0 });
    const hx = clamp(x, 10, SCENE_W - 14);
    this.leaps.push({ x: hx, y: this.hill[hx]! + 2, dir: Math.random() < 0.5 ? -1 : 1, born: performance.now() });
  }

  // --- Where things are ---

  private layOut(): void {
    const r = mulberry32(hashSeed(this.view.seed + ":void"));
    const sky = this.crest;
    const scatter = (n: number, x0: number, x1: number, y0: number, y1: number): Spot[] => {
      const out: Spot[] = [];
      const step = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        out.push({
          x: Math.round(x0 + step * (i + 0.5) + (r() - 0.5) * step * 0.8),
          y: Math.round(sky * (y0 + r() * (y1 - y0))),
        });
      }
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    };
    this.spots = {
      mote: scatter(CAP.mote, 8, SCENE_W - 8, 0.18, 0.85),
      wisp: [],
      veil: [
        { x: 0, y: Math.round(sky * 0.05) },
        { x: 0, y: Math.round(sky * 0.15) },
        { x: 0, y: Math.round(sky * 0.25) },
      ],
      nebula: [
        { x: 32, y: Math.round(sky * 0.42) },
        { x: 148, y: Math.round(sky * 0.36) },
        { x: 100, y: Math.round(sky * 0.58) },
      ],
      aeon: [
        { x: 10, y: Math.round(sky * 0.2) },
        { x: 132, y: Math.round(sky * 0.12) },
        { x: 54, y: Math.round(sky * 0.55) },
        { x: 150, y: Math.round(sky * 0.6) },
      ],
      fifth: [{ x: 84, y: Math.round(sky * 0.34) }],
    };
  }

  private mark(id: VoidId): Art {
    const marks = PRODUCER_MARKS[id];
    return marks[clamp(this.view.marks[id] ?? 0, 0, marks.length - 1)] ?? marks[0];
  }

  private primed(id: VoidId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  private counts(id: VoidId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total <= 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? Math.max(1, Math.round((total * b) / (w + b))) : 0;
    return { working: Math.max(0, total - broken), broken: Math.min(total, broken) };
  }

  private sprite(id: VoidId, broken: boolean): Sprite {
    return broken ? artTinted(this.mark(id), BROKEN_TINT, 0.7) : artCanvas(this.mark(id));
  }

  // --- Drawing ---

  private draw(): void {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += this.dt;
    const t = this.clock;
    this.ctx.clearRect(0, 0, SCENE_W, this.sh);

    this.drawSky(t);
    this.drawNebulae(t);
    this.drawConstellations(t);
    this.drawVeils(t);
    this.drawMotes(t);
    this.drawDogStar(t);
    this.drawStreaks();
    this.drawHill();
    this.drawHerders(t);
    this.drawHoard(t);
    this.drawLeaps(now);
    this.drawCold();
  }

  private drawSky(t: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.sh; y++) {
      ctx.fillStyle = this.skyRows[y]!;
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // The milky way, a soft diagonal, before anyone named it after anything.
    ctx.fillStyle = rgba(MILKY, 0.45);
    for (let x = 0; x < SCENE_W; x += 2) {
      const y = Math.round(this.crest * 0.15 + x * 0.35 + Math.sin(x / 11) * 3);
      if (y < this.crest) ctx.fillRect(x, y, 2, 4);
    }
    for (const s of this.stars) {
      const on = Math.sin(t * 1.1 + s.phase);
      if (on < -0.4) continue;
      ctx.fillStyle = on > 0.6 ? STAR : rgba(STAR, 0.45);
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }

  /** Litter Nebulae: soft pink clouds with something curled up asleep in each. Dim if the sky's let go. */
  private drawNebulae(t: number): void {
    const { working, broken } = this.counts("nebula");
    const ctx = this.ctx;
    const keep = clamp(this.view.condition, 0, 1);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.nebula[i]!;
      const cx = spot.x + Math.round(Math.sin(t * 0.12 + i * 2) * 3);
      const a = isBroken ? 0.05 : 0.08 + 0.12 * keep * keep;
      const hue = isBroken ? "#3a3448" : i % 2 === 0 ? "#c06aa0" : "#8a6ad0";
      fillDisc(ctx, cx, spot.y, 19, rgba(hue, a * 0.6));
      fillDisc(ctx, cx - 6, spot.y + 2, 12, rgba(hue, a));
      fillDisc(ctx, cx + 7, spot.y - 2, 10, rgba(hue, a));
      if (!isBroken && this.primed("nebula")) fillDisc(ctx, cx, spot.y, 8, rgba(PRIME_GLOW.nebula, 0.18));
      const s = this.sprite("nebula", isBroken);
      ctx.drawImage(s.canvas, cx - (s.w >> 1), spot.y - (s.h >> 1));
    }
  }

  /**
   * Constellations: a dog, dot to dot, with a tail of stars that grows a star for every doubling of
   * the generations you raised. Broken ones have lost their tails and gone dim.
   */
  private drawConstellations(t: number): void {
    const { working, broken } = this.counts("aeon");
    const ctx = this.ctx;
    const tail = clamp(Math.floor(Math.log2(Math.max(1, this.view.generation))), 0, 7);
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const o = this.spots.aeon[i]!;
      const s = this.sprite("aeon", isBroken);
      if (!isBroken && this.primed("aeon")) fillDisc(ctx, o.x + (s.w >> 1), o.y + (s.h >> 1), 8, rgba(PRIME_GLOW.aeon, 0.14));
      ctx.drawImage(s.canvas, o.x, o.y);
      if (isBroken) continue;
      let px = o.x + s.w - 1;
      let py = o.y + 3;
      for (let k = 0; k < tail; k++) {
        const nx = px + 4;
        const ny = o.y + 3 + Math.round(Math.sin(k * 1.3 + i) * 3);
        if (nx >= SCENE_W - 1) break;
        ctx.fillStyle = rgba("#6a7ab0", 0.5 + 0.15 * Math.sin(t * 0.8 + k));
        line(ctx, px, py, nx, ny);
        ctx.fillStyle = STAR;
        ctx.fillRect(nx, ny, 1, 1);
        px = nx;
        py = ny;
      }
    }
  }

  /** Crate Blankets thrown over the top of the sky, plaid, rippling; a kicked-off one is in strips. */
  private drawVeils(t: number): void {
    const { working, broken } = this.counts("veil");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const y0 = this.spots.veil[i]!.y;
      for (let x = 0; x < SCENE_W; x += 2) {
        if (isBroken && (x + i * 9) % 20 < 8) continue;
        const wave = Math.round(Math.sin(x / 16 + t * 0.5 + i) * 2);
        const plaid = (Math.floor(x / 6) + i) % 2 === 0;
        ctx.fillStyle = isBroken ? rgba("#3a3448", 0.3) : rgba(plaid ? "#5a3a8a" : "#3a3a7a", 0.5);
        ctx.fillRect(x, y0 + wave, 2, 4);
      }
      if (!isBroken && this.primed("veil")) {
        ctx.fillStyle = PRIME_GLOW.veil;
        for (let x = (i * 7) % 19; x < SCENE_W; x += 19) ctx.fillRect(x, y0 + 4 + Math.round(Math.sin(x / 16 + t * 0.5 + i) * 2), 1, 1);
      }
      const s = this.sprite("veil", isBroken);
      ctx.drawImage(s.canvas, SCENE_W - s.w - 1, y0 - 1);
    }
  }

  /** Star Pups, hanging in the dark and wagging when you look at them. */
  private drawMotes(t: number): void {
    const { working, broken } = this.counts("mote");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.mote[i]!;
      const s = this.sprite("mote", isBroken);
      const wag = isBroken ? 0 : Math.sin(t * 3 + i * 1.7) > 0.8 ? 1 : 0;
      if (!isBroken) fillDisc(ctx, spot.x, spot.y, this.primed("mote") ? 6 : 4, rgba(PRIME_GLOW.mote, 0.12));
      ctx.drawImage(s.canvas, spot.x - (s.w >> 1) + wag, spot.y - (s.h >> 1));
    }
  }

  /** The Dog Star. It shakes, because it's a Chihuahua, until you've done enough to settle it. */
  private drawDogStar(t: number): void {
    const { working, broken } = this.counts("fifth");
    if (working + broken === 0) return;
    const ctx = this.ctx;
    const isBroken = working === 0;
    const spot = this.spots.fifth[0]!;
    const s = this.sprite("fifth", isBroken);
    const settled = this.primed("fifth");
    const shake = isBroken || settled ? 0 : Math.round(Math.sin(t * 40) * 0.8);
    const all = this.view.working.fifth ?? 0;
    const reach = 10 + Math.min(12, Math.log2(1 + all) * 3);
    if (!isBroken) {
      fillDisc(ctx, spot.x, spot.y, reach + 6, rgba(PRIME_GLOW.fifth, 0.06));
      fillDisc(ctx, spot.x, spot.y, reach, rgba(PRIME_GLOW.fifth, 0.12));
      // Four long rays, because that's how a bright star looks to a tired eye.
      ctx.fillStyle = rgba(PRIME_GLOW.fifth, 0.35);
      ctx.fillRect(spot.x - reach - 4, spot.y, (reach + 4) * 2 + 1, 1);
      ctx.fillRect(spot.x, spot.y - reach - 4, 1, (reach + 4) * 2 + 1);
    }
    ctx.drawImage(s.canvas, spot.x - (s.w >> 1) + shake, spot.y - (s.h >> 1));
  }

  private drawStreaks(): void {
    const ctx = this.ctx;
    for (const st of this.streaks) {
      st.age += this.dt;
      const x = st.x + st.age * 90;
      const y = st.y + st.age * 30;
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = rgba(STAR, Math.max(0, (1 - k / 8) * (1 - st.age)));
        ctx.fillRect(Math.round(x - k * 3), Math.round(y - k), 2, 1);
      }
    }
    this.streaks = this.streaks.filter((st) => st.age < 1);
  }

  private drawHill(): void {
    const ctx = this.ctx;
    for (let x = 0; x < SCENE_W; x++) {
      const top = this.hill[x]!;
      ctx.fillStyle = HILL;
      ctx.fillRect(x, top, 1, this.sh - top);
      ctx.fillStyle = HILL_EDGE;
      ctx.fillRect(x, top, 1, 1);
    }
  }

  /** Sky Herders on the hill, walking it slowly, crooks up. */
  private drawHerders(t: number): void {
    const { working, broken } = this.counts("wisp");
    const n = working + broken;
    while (this.herders.length < n) {
      const i = this.herders.length;
      this.herders.push({ x: 70 + ((i * 29) % 80), dir: i % 2 ? 1 : -1, until: t + 2 + Math.random() * 3, paused: false });
    }
    this.herders.length = n;
    const ctx = this.ctx;
    for (let i = 0; i < n; i++) {
      const h = this.herders[i]!;
      const isBroken = i >= working;
      if (!isBroken) {
        if (t >= h.until) {
          h.paused = !h.paused;
          h.until = t + (h.paused ? 2 + Math.random() * 3 : 2 + Math.random() * 4);
          if (!h.paused && Math.random() < 0.5) h.dir = h.dir === 1 ? -1 : 1;
        }
        if (!h.paused) {
          h.x += h.dir * 4 * this.dt;
          if (h.x < 50 || h.x > SCENE_W - 8) h.dir = h.x < 50 ? 1 : -1;
        }
      }
      const s = this.sprite("wisp", isBroken);
      const x = Math.round(h.x - s.w / 2);
      const top = this.hill[clamp(Math.round(h.x), 0, SCENE_W - 1)]!;
      const bob = isBroken || h.paused ? 0 : Math.round(Math.abs(Math.sin(t * 7 + i)));
      const y = top - s.h + 1 - bob + (isBroken ? 2 : 0);
      if (!isBroken && this.primed("wisp")) fillDisc(ctx, h.x, y + 4, 5, rgba(PRIME_GLOW.wisp, 0.16));
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The litter, asleep on a blanket on the near slope, the same count the yard would show. */
  private drawHoard(t: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    this.shown += (target - this.shown) * (1 - Math.pow(0.06, this.dt));
    const n = Math.min(18, yardLayout(this.shown).pack);
    if (n <= 0) return;
    const pup = artCanvas(PUPPY_SPRITE);
    const z = artCanvas(ZZZ);
    const perRow = 6;
    const rows = Math.ceil(n / perRow);
    const w = perRow * 7 + 6;
    const x0 = 6;
    const foot = Math.min(this.sh - 3, this.hill[x0 + (w >> 1)]! + 10);
    const ctx = this.ctx;
    ctx.fillStyle = BLANKET_EDGE;
    ctx.fillRect(x0, foot - rows * 4 - 2, w, rows * 4 + 4);
    ctx.fillStyle = BLANKET;
    ctx.fillRect(x0 + 1, foot - rows * 4 - 1, w - 2, rows * 4 + 2);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = x0 + 3 + col * 7 + (row % 2) * 3;
      const y = foot - row * 4 - pup.h + 1;
      const breath = Math.sin(t * 1.4 + i * 1.9) > 0.6 ? 1 : 0;
      ctx.drawImage(pup.canvas, x, y - breath);
      if (i % 7 === 3) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(z.canvas, x + 4, y - 6 - Math.round((t * 3 + i) % 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawLeaps(now: number): void {
    const ctx = this.ctx;
    const pup = artCanvas(PUPPY_SPRITE);
    let kept = 0;
    for (const l of this.leaps) {
      const age = (now - l.born) / LEAP_MS;
      if (age >= 1) continue;
      this.leaps[kept++] = l;
      const x = Math.round(l.x + l.dir * age * 14);
      const y = Math.round(l.y - pup.h - Math.sin(Math.min(1, age * 1.4) * Math.PI) * 10);
      ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      ctx.drawImage(pup.canvas, x, y);
      ctx.globalAlpha = 1;
    }
    this.leaps.length = kept;
  }

  /** A sky that's been let go gets colder, and the picture goes with it. */
  private drawCold(): void {
    const k = clamp((1 - this.view.condition) / 0.75, 0, 1) * 0.4;
    if (k <= 0.001) return;
    this.ctx.fillStyle = rgba(COLD, k);
    this.ctx.fillRect(0, 0, SCENE_W, this.sh);
  }
}
