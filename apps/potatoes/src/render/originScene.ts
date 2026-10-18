/**
 * Origin: the first morning of the first field. You came out where you started, before there was a
 * farm — a wild valley at dawn, mist in the low ground, and in the middle of it the plant every
 * potato since has been a copy of. The outside farm's picture again (sky, hills, a field, a yard),
 * but older: no rows, no fences, nobody's machines.
 *
 * Same buffer conventions as `farmScene.ts` / `beyondScene.ts`: integer-aligned unscaled blits,
 * translation-only animation. Everything that depends only on the buffer height or the seed is
 * worked out in `resize` / `layOut`, so a frame is mostly blits and a handful of animated rects.
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

type OriginId = Extract<solo.SoloProducerId, "dawn" | "elder" | "root" | "spring" | "hearth" | "first">;

export const ORDER: OriginId[] = ["dawn", "elder", "root", "spring", "hearth", "first"];

/** How many of each ever appear, however many you own. */
const CAP: Record<OriginId, number> = {
  dawn: 10,
  elder: 6,
  root: 4,
  spring: 3,
  hearth: 4,
  first: 4,
};

/** What a hundred-owned tier throws light in. */
const PRIME_GLOW: Record<OriginId, string> = {
  dawn: "#f0d8ff",
  elder: "#ffe066",
  root: "#ffd166",
  spring: "#e0f4ff",
  hearth: "#ff9a3c",
  first: "#fff4c0",
};

// --- The place ---

const SKY_TOP = "#2e2450";
const SKY_MID = "#b8607a";
const SKY_LOW = "#ffc98a";
const SUN_CORE = "#fff6d8";
const SUN_RIM = "#ffd28a";
const RIDGE_FAR = "#8c6a8e";
const RIDGE_NEAR = "#5e6a6a";
const MOUND = "#5a7a48";
const MOUND_LIT = "#c8a060";
const MEADOW_HI = "#86a05c";
const MEADOW_LO = "#4a7436";
const MEADOW_DRY_HI = "#b0a466";
const MEADOW_DRY_LO = "#7a7040";
const TUFT = "#3c6030";
const TUFT_LIT = "#c8c070";
const SOIL = "#7a5237";
const SOIL_DARK = "#5e3e29";
const ROOT = "#c99a5a";
const ROOT_LIT = "#ffd166";
const ROOT_DEAD = "#4e3a2e";
const STALK = "#4f6a30";
const LEAF = "#3f7a34";
const LEAF_MID = "#4f8c3c";
const LEAF_LIT = "#8cc060";
const PETAL = "#c8a0e8";
const PETAL_EYE = "#ffe066";
const WATER = "#7ab8d8";
const WATER_SILT = "#9a8a5a";
const WATER_LIT = "#e0f4ff";
const BROKEN_TINT = "#5a5560";
const INK = "#402e3a";

// Constant alphas, hoisted so no frame builds them.
const MIST = rgba("#fff0e8", 0.24);
const MIST_LOW = rgba("#fff0e8", 0.16);
const GLOW_FIRST = rgba(PRIME_GLOW.first, 0.18);
const GLOW_FIRST_PRIME = rgba(PRIME_GLOW.first, 0.3);
const GLOW_ELDER = rgba(PRIME_GLOW.elder, 0.15);
const RAY = rgba(SUN_CORE, 0.07);
const HALO_1 = rgba(SUN_RIM, 0.12);
const HALO_2 = rgba(SUN_RIM, 0.2);
const SMOKE = rgba("#d8d0d8", 0.35);
const DEW = rgba("#ffffff", 0.85);
const BIRD = rgba(INK, 0.7);
const RIM = rgba(SUN_RIM, 0.55);

const RAYS = 9;
const STARS = 16;
const DUG_MS = 1100;
const MAX_CROP = 20;
const MAX_SMOKE = 24;
const MAX_DEW = 10;

interface Dug {
  x: number;
  y: number;
  born: number;
}

/** A potato on its way to the pile: pops off a plant, lands, and rolls left. */
interface Crop {
  x: number;
  y: number;
  floor: number;
  vy: number;
  rolling: boolean;
}

/** An elder's walk along the lane, stopping to tend things. */
interface Walker {
  x: number;
  dir: 1 | -1;
  until: number;
  paused: boolean;
  phase: number;
}

interface Puff {
  x: number;
  y: number;
  age: number;
}

interface Flock {
  x: number;
  y: number;
  speed: number;
}

interface Spot {
  x: number;
  y: number;
}

interface Leaf {
  x: number;
  y: number;
  r: number;
  /** Higher leaves sway more. */
  sway: number;
}

/** A limb of the great plant, from the trunk out to a cluster. */
interface Branch {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sway: number;
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

/** Where the valley's bands fall for a buffer height. Pure, so layout can be reasoned about apart from drawing. */
export function valleyFor(sh: number): { hz: number; soilTop: number } {
  const hz = Math.round(sh * 0.42);
  const soilH = clamp(Math.round(sh * 0.12), 10, 30);
  return { hz, soilTop: sh - soilH };
}

export class OriginScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  private hz = 84;
  private soilTop = 176;
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: FarmView = EMPTY_VIEW;
  private rng: () => number = mulberry32(1);
  private sawView = false;

  // Worked out once per size.
  private skyRows: string[] = [];
  private ridgeFar: number[] = [];
  private ridgeNear: number[] = [];
  private stars: { x: number; y: number; phase: number }[] = [];
  // Once per condition, which only moves on weather and purchases.
  private meadowRows: string[] = [];
  private meadowFor = -1;

  // Once per seed.
  private spots: Record<OriginId, Spot[]> = {} as Record<OriginId, Spot[]>;
  private tufts: Spot[] = [];
  private leaves: Leaf[] = [];
  private branches: Branch[] = [];
  private blooms: Spot[] = [];
  private strands: { y: number; phase: number; amp: number }[] = [];

  private dug: Dug[] = [];
  private crop: Crop[] = [];
  private walkers: Walker[] = [];
  private smoke: Puff[] = [];
  private dew: (Spot & { age: number })[] = [];
  private flock: Flock | null = null;
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
    this.canvas.height = this.sh;
    this.ctx.imageSmoothingEnabled = false;
    if (!resized) return;
    const { hz, soilTop } = valleyFor(sh);
    this.hz = hz;
    this.soilTop = soilTop;

    // Violet overhead, rose in the middle, peach on the horizon: a sky that hasn't decided yet.
    this.skyRows = [];
    for (let y = 0; y < hz; y++) {
      const k = y / Math.max(1, hz - 1);
      this.skyRows.push(k < 0.55 ? mix(SKY_TOP, SKY_MID, k / 0.55) : mix(SKY_MID, SKY_LOW, (k - 0.55) / 0.45));
    }
    this.ridgeFar = [];
    this.ridgeNear = [];
    for (let x = 0; x < SCENE_W; x++) {
      this.ridgeFar.push(Math.round(hz - 9 - 5 * Math.sin(x / 23 + 0.7) - 3 * Math.sin(x / 9.5)));
      this.ridgeNear.push(Math.round(hz - 3 - 3 * Math.sin(x / 17 + 2.1) - 1.5 * Math.sin(x / 6.3)));
    }
    const starRng = mulberry32(7);
    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      this.stars.push({
        x: Math.floor(starRng() * SCENE_W),
        y: Math.floor(starRng() * hz * 0.45),
        phase: starRng() * 6,
      });
    }
    this.meadowFor = -1;
    if (this.sawView) this.layOut();
  }

  update(view: FarmView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.sawView = true;
      this.layOut();
      this.dug = [];
      this.crop = [];
      this.walkers = [];
      this.smoke = [];
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

  /** A dig: a potato comes up where you tapped, catches the light, and goes on the pile. */
  dig(at?: { x: number; y: number }): void {
    if (this.dug.length > 12) return;
    const m = this.soilTop - this.hz;
    const x = at ? clamp(Math.round(at.x), 3, SCENE_W - 8) : Math.round(40 + Math.random() * 100);
    const y = at
      ? clamp(Math.round(at.y), this.hz + 2, this.sh - 6)
      : Math.round(this.hz + m * (0.4 + Math.random() * 0.5));
    this.dug.push({ x, y, born: performance.now() });
    if (this.dew.length < MAX_DEW) this.dew.push({ x, y: y - 2, age: 0 });
  }

  // --- Where things are ---

  private layOut(): void {
    this.rng = mulberry32(hashSeed(this.view.seed + ":origin"));
    const hz = this.hz;
    const m = this.soilTop - hz;
    const r = this.rng;
    const spread = (n: number, lo: number, hi: number, yLo: number, yHi: number): Spot[] => {
      const out: Spot[] = [];
      const step = (hi - lo) / n;
      for (let i = 0; i < n; i++) {
        out.push({
          x: Math.round(lo + step * (i + 0.5) + (r() - 0.5) * step * 0.6),
          y: Math.round(hz + m * (yLo + r() * (yHi - yLo))),
        });
      }
      // Mixed, so the first few of a tier don't all bunch at one end.
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    };
    this.spots = {
      dawn: spread(CAP.dawn, 30, 132, 0.3, 0.95),
      elder: [],
      root: spread(CAP.root, 14, 164, 0.08, 0.28),
      // Round the pool, which sits on the right of the valley.
      spring: [
        { x: 140, y: Math.round(hz + m * 0.36) },
        { x: 162, y: Math.round(hz + m * 0.5) },
        { x: 128, y: Math.round(hz + m * 0.58) },
      ],
      hearth: spread(CAP.hearth, 10, 58, 0.42, 0.78),
      first: [],
    };

    this.tufts = [];
    for (let i = 0; i < 46; i++) {
      this.tufts.push({ x: Math.floor(r() * SCENE_W), y: Math.round(hz + 2 + r() * (m - 3)) });
    }
    this.tufts.sort((a, b) => a.y - b.y);

    // The great plant: a stalk, leaf clusters up it, a crown. Seeded so your valley's is yours.
    // A trunk, then limbs fanning out and up off its top half, a cluster at the end of each and one
    // part-way along: the shape of a potato plant, grown to the size of a tree.
    const base = this.plantBase();
    const height = this.plantHeight();
    this.leaves = [];
    this.branches = [];
    this.blooms = [];
    const limbs = 6;
    for (let i = 0; i < limbs; i++) {
      const k = 0.4 + (0.5 * i) / (limbs - 1);
      const side = i % 2 === 0 ? -1 : 1;
      const x0 = base.x;
      const y0 = Math.round(base.y - height * k);
      // Lower limbs reach further out; higher ones climb more than they spread.
      const reach = (1 - k) * 46 + 8 + r() * 6;
      const climb = height * (0.18 + k * 0.12);
      const x1 = Math.round(x0 + side * reach);
      // Never so high its cluster leaves the top of the buffer.
      const y1 = Math.max(9, Math.round(y0 - climb));
      this.branches.push({ x0, y0, x1, y1, sway: k });
      this.leaves.push({ x: x1, y: y1, r: 5 + Math.round(r() * 2), sway: k });
      this.leaves.push({
        x: Math.round(x0 + (x1 - x0) * 0.55),
        y: Math.round(y0 + (y1 - y0) * 0.55 - 2),
        r: 3 + Math.round(r() * 2),
        sway: k * 0.8,
      });
    }
    this.leaves.push({ x: base.x, y: Math.max(9, Math.round(base.y - height - 3)), r: 7, sway: 1 });
    this.leaves.push({ x: base.x - 6, y: Math.round(base.y - height + 3), r: 5, sway: 0.95 });
    this.leaves.push({ x: base.x + 7, y: Math.round(base.y - height + 2), r: 5, sway: 0.95 });
    for (let i = 0; i < 16; i++) {
      const leaf = this.leaves[Math.floor(r() * this.leaves.length)]!;
      this.blooms.push({
        x: Math.round(leaf.x + (r() - 0.5) * leaf.r * 2),
        y: Math.round(leaf.y + (r() - 0.5) * leaf.r * 1.6),
      });
    }
    // Upper blooms first, so the crown flowers before the stalk does.
    this.blooms.sort((a, b) => a.y - b.y);

    this.strands = [];
    for (let i = 0; i < CAP.root * 2; i++) {
      this.strands.push({ y: r(), phase: r() * 6, amp: 1 + r() * 2 });
    }
  }

  private plantBase(): Spot {
    return { x: 88, y: this.hz - 4 };
  }

  private plantHeight(): number {
    // Tall, but the crown (about ten rows over the trunk) always clears the top of the buffer.
    return Math.min(clamp(Math.round(this.hz * 0.78), 26, 110), this.plantBase().y - 12);
  }

  private art(id: OriginId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = clamp(this.view.marks[id] ?? 0, 0, marks.length - 1);
    return marks[level] ?? marks[0];
  }

  private primed(id: OriginId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Drawn working and broken counts. Broken ones keep their place, greyed, so damage is where it happened. */
  private counts(id: OriginId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total === 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? clamp(Math.round((total * b) / (w + b)), 1, total) : 0;
    return { working: total - broken, broken };
  }

  private sprite(id: OriginId, broken: boolean): Sprite {
    return broken ? artTinted(this.art(id), BROKEN_TINT, 0.6) : artCanvas(this.art(id));
  }

  private sun(): Spot {
    return { x: 120, y: this.hz - 10 };
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

    this.drawSky(t);
    this.drawSun(t);
    this.drawBirds();
    this.drawRidges();
    this.drawMist(t, this.hz - 6, MIST, 0.6, 0);
    this.drawPlant(t);
    this.drawMeadow(t);
    this.drawMist(t, this.hz + 3, MIST_LOW, 1.1, 40);
    this.drawSpring(t);
    this.drawRoots(t);
    this.drawHearths(t);
    this.drawDawn(t);
    this.drawElders(t);
    this.drawSoil(t);
    this.drawHoard();
    this.stepCrop();
    this.drawDew();
    this.drawDug(now);
  }

  /** The sky, with the last few stars going out at the top. */
  private drawSky(t: number): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.skyRows.length; y++) {
      ctx.fillStyle = this.skyRows[y]!;
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    ctx.fillStyle = "#fff4e0";
    for (const s of this.stars) {
      // Only some of them are still on, and those come and go.
      if (Math.sin(t * 0.7 + s.phase) < 0.2) continue;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }

  /** The first sun, half up behind the hills, rays turning slowly enough to miss. */
  private drawSun(t: number): void {
    const ctx = this.ctx;
    const { x, y } = this.sun();
    ctx.fillStyle = RAY;
    for (let i = 0; i < RAYS; i++) {
      const a = t * 0.05 + (i * Math.PI * 2) / RAYS;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      for (let d = 12; d < 70; d += 2) {
        const px = Math.round(x + ca * d);
        const py = Math.round(y + sa * d);
        if (py >= this.hz) break;
        ctx.fillRect(px, py, 2, 2);
      }
    }
    // The halo widens with the First Potatoes: the more of it you've woken, the further it reaches.
    const lit = territory(this.view.working.first ?? 0, 0, 1);
    fillDisc(ctx, x, y, 22 + 8 * lit, HALO_1);
    fillDisc(ctx, x, y, 14 + 4 * lit, HALO_2);
    fillDisc(ctx, x, y, 9, SUN_RIM);
    fillDisc(ctx, x, y, 7, SUN_CORE);
  }

  /** Now and then three birds cross. Nothing has frightened them yet. */
  private drawBirds(): void {
    if (!this.flock && this.chance(0.04)) {
      this.flock = { x: -10, y: 8 + Math.random() * this.hz * 0.4, speed: 10 + Math.random() * 6 };
    }
    const f = this.flock;
    if (!f) return;
    f.x += f.speed * this.dt;
    const ctx = this.ctx;
    ctx.fillStyle = BIRD;
    const flap = Math.floor(this.clock * 6) % 2;
    for (let i = 0; i < 3; i++) {
      const bx = Math.round(f.x - i * 7);
      const by = Math.round(f.y + (i % 2) * 3);
      ctx.fillRect(bx - 1, by - flap, 1, 1);
      ctx.fillRect(bx, by, 1, 1);
      ctx.fillRect(bx + 1, by - flap, 1, 1);
    }
    if (f.x > SCENE_W + 20) this.flock = null;
  }

  /** Two lines of hills, the far one hazed lavender by the morning between you and it. */
  private drawRidges(): void {
    const ctx = this.ctx;
    for (let x = 0; x < SCENE_W; x++) {
      const far = this.ridgeFar[x]!;
      ctx.fillStyle = RIDGE_FAR;
      ctx.fillRect(x, far, 1, this.hz - far);
      const near = this.ridgeNear[x]!;
      ctx.fillStyle = RIDGE_NEAR;
      ctx.fillRect(x, near, 1, this.hz - near + 1);
    }
    // The light catches the far ridge's top edge, on the side facing the sun.
    ctx.fillStyle = RIM;
    const sun = this.sun();
    for (let x = Math.max(0, sun.x - 50); x < Math.min(SCENE_W, sun.x + 50); x++) {
      ctx.fillRect(x, this.ridgeFar[x]!, 1, 1);
    }
  }

  /** A band of mist, drifting. Lumps rather than a stripe, so it reads as weather and not as paint. */
  private drawMist(t: number, y: number, color: string, speed: number, offset: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const span = SCENE_W + 60;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 41 + offset + t * speed * 3) % span) - 30;
      const w = 22 + ((i * 13) % 17);
      const lift = Math.round(Math.sin(t * 0.3 + i) * 1);
      ctx.fillRect(Math.round(cx - w / 2), y - 2 + lift, w, 2);
      ctx.fillRect(Math.round(cx - w / 2 + 4), y - 4 + lift, w - 8, 2);
      ctx.fillRect(Math.round(cx - w / 2 - 3), y + lift, w + 6, 2);
    }
  }

  /**
   * The plant everything came from, on its rise in the middle of the valley. It's there before you
   * own anything — it's the landmark, the way the sun is in the beyond — and it flowers as you wake
   * the First Potatoes round its foot.
   */
  private drawPlant(t: number): void {
    const ctx = this.ctx;
    const base = this.plantBase();
    // The rise it stands on.
    for (let dy = 0; dy < 9; dy++) {
      const half = Math.round(30 * Math.sqrt(1 - (dy / 9) ** 2));
      ctx.fillStyle = dy === 8 ? MOUND_LIT : MOUND;
      ctx.fillRect(base.x - half, base.y + 4 - dy, half * 2 + 1, 1);
    }
    const height = this.plantHeight();
    const sway = Math.sin(t * 0.6);
    // The trunk: thick at the foot, thinning as it goes, leaning only at the top.
    for (let i = 0; i < height; i++) {
      const k = i / height;
      const lean = Math.round(sway * k * k * 1.5);
      const w = k < 0.3 ? 5 : k < 0.65 ? 4 : 3;
      ctx.fillStyle = STALK;
      ctx.fillRect(base.x - (w >> 1) + lean, base.y - i, w, 1);
      ctx.fillStyle = MOUND_LIT;
      ctx.fillRect(base.x - (w >> 1) + lean + w - 1, base.y - i, 1, 1);
    }
    // Flared roots where it meets the rise.
    ctx.fillStyle = STALK;
    ctx.fillRect(base.x - 5, base.y, 11, 2);
    ctx.fillRect(base.x - 7, base.y + 1, 3, 1);
    ctx.fillRect(base.x + 5, base.y + 1, 3, 1);
    for (const b of this.branches) {
      const steps = Math.max(Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0));
      const tip = sway * b.sway * 1.5;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        // A slight upward bow, so a limb reads as grown rather than ruled.
        const x = Math.round(b.x0 + (b.x1 - b.x0) * u + tip * u);
        const y = Math.round(b.y0 + (b.y1 - b.y0) * u - Math.sin(u * Math.PI) * 3);
        ctx.fillStyle = STALK;
        ctx.fillRect(x, y, u < 0.5 ? 2 : 1, 2);
      }
    }
    for (const leaf of this.leaves) {
      const dx = Math.round(sway * leaf.sway * 1.5);
      fillDisc(ctx, leaf.x + dx, leaf.y, leaf.r, LEAF);
      // Lit from the sun's side, which is the right; a lighter crown on each cluster gives it volume.
      fillDisc(ctx, leaf.x + dx + 1, leaf.y - 1, Math.max(1, leaf.r - 2), LEAF_MID);
      ctx.fillStyle = LEAF_LIT;
      ctx.fillRect(leaf.x + dx + 1, leaf.y - leaf.r + 1, Math.max(1, leaf.r - 2), 1);
      ctx.fillRect(leaf.x + dx + leaf.r - 1, leaf.y - 2, 1, 2);
    }
    const first = this.counts("first");
    const awake = first.working + first.broken;
    const flowers = Math.round(3 + territory(this.view.working.first ?? 0, 0, this.blooms.length - 3));
    for (let i = 0; i < Math.min(flowers, this.blooms.length); i++) {
      const b = this.blooms[i]!;
      const dx = Math.round(sway * 1.2);
      ctx.fillStyle = PETAL;
      ctx.fillRect(b.x + dx - 1, b.y, 3, 1);
      ctx.fillRect(b.x + dx, b.y - 1, 1, 3);
      ctx.fillStyle = PETAL_EYE;
      ctx.fillRect(b.x + dx, b.y, 1, 1);
    }

    // The First Potatoes, in the hollows of its roots at the foot of the rise.
    const slots = [-17, 15, -8, 23];
    for (let i = 0; i < awake; i++) {
      const isBroken = i >= first.working;
      const s = this.sprite("first", isBroken);
      const cx = base.x + slots[i]!;
      const breathe = isBroken ? 0 : Math.round(Math.sin(t * 0.9 + i * 1.3) * 0.5);
      const x = Math.round(cx - s.w / 2);
      const y = base.y + 6 - s.h - breathe;
      if (!isBroken) {
        fillDisc(ctx, cx, y + s.h / 2, this.primed("first") ? 9 : 7, this.primed("first") ? GLOW_FIRST_PRIME : GLOW_FIRST);
      }
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The valley floor: no rows, no fences, grass the ground's health colours. */
  private drawMeadow(t: number): void {
    const ctx = this.ctx;
    const condition = Math.round(clamp(this.view.condition, 0, 1) * 50) / 50;
    if (condition !== this.meadowFor) {
      this.meadowFor = condition;
      const dry = clamp((1 - condition) * 1.3, 0, 1);
      const hi = mix(MEADOW_HI, MEADOW_DRY_HI, dry);
      const lo = mix(MEADOW_LO, MEADOW_DRY_LO, dry);
      this.meadowRows = [];
      for (let y = this.hz; y < this.soilTop; y++) {
        this.meadowRows.push(mix(hi, lo, (y - this.hz) / Math.max(1, this.soilTop - this.hz)));
      }
    }
    for (let i = 0; i < this.meadowRows.length; i++) {
      ctx.fillStyle = this.meadowRows[i]!;
      ctx.fillRect(0, this.hz + i, SCENE_W, 1);
    }
    // Long morning shadow off the rise, falling away from the sun.
    ctx.fillStyle = rgba(INK, 0.12);
    ctx.fillRect(28, this.hz, 46, 2);
    const wind = Math.sin(t * 0.8);
    for (let i = 0; i < this.tufts.length; i++) {
      const tf = this.tufts[i]!;
      const lean = Math.round(wind * 0.8 + Math.sin(t * 1.3 + i) * 0.4);
      ctx.fillStyle = TUFT;
      ctx.fillRect(tf.x, tf.y - 2, 1, 2);
      ctx.fillRect(tf.x + 2, tf.y - 1, 1, 1);
      ctx.fillStyle = TUFT_LIT;
      ctx.fillRect(tf.x + 1 + lean, tf.y - 3, 1, 1);
    }
  }

  /** The spring's pool, on the right of the valley. Clear when the ground is good, silty when it isn't. */
  private drawSpring(t: number): void {
    const { working, broken } = this.counts("spring");
    const n = working + broken;
    if (n === 0) return;
    const ctx = this.ctx;
    const m = this.soilTop - this.hz;
    const cx = 146;
    const cy = Math.round(this.hz + m * 0.48);
    const rx = Math.round(10 + territory(this.view.working.spring ?? 0, 0, 12));
    const ry = Math.max(3, Math.round(rx * 0.32));
    const water = mix(WATER, WATER_SILT, clamp((1 - this.view.condition) * 1.4, 0, 1));
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
      ctx.fillStyle = dy === -ry ? INK : water;
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
    // Glints that slide across, slower than you'd think water would.
    ctx.fillStyle = WATER_LIT;
    for (let i = 0; i < 3; i++) {
      const gx = Math.round(cx - rx + 3 + ((t * 4 + i * 9) % (rx * 2 - 6)));
      ctx.fillRect(gx, cy - 1 + i, 2, 1);
    }
    for (let i = 0; i < n; i++) {
      const isBroken = i >= working;
      const spot = this.spots.spring[i]!;
      const s = this.sprite("spring", isBroken);
      const x = Math.round(spot.x - s.w / 2);
      const y = spot.y - s.h + 2;
      if (this.primed("spring") && !isBroken) fillDisc(ctx, spot.x, y + 3, 7, rgba(PRIME_GLOW.spring, 0.3));
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken) {
        // It wells: one pixel up and back, on its own beat.
        const up = Math.floor((t * 2 + i) % 3);
        ctx.fillStyle = WATER_LIT;
        ctx.fillRect(spot.x, y - up, 1, 1);
      }
    }
  }

  /** Mother Root knots, coming up out of the meadow. The rest of the root is under it, in the soil. */
  private drawRoots(t: number): void {
    const { working, broken } = this.counts("root");
    const ctx = this.ctx;
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.root[i]!;
      const s = this.sprite("root", isBroken);
      const x = Math.round(spot.x - s.w / 2);
      const y = spot.y - s.h + 3;
      if (!isBroken && this.primed("root")) {
        fillDisc(ctx, spot.x, y + s.h - 2, 7, rgba(PRIME_GLOW.root, 0.22 + 0.06 * Math.sin(t * 1.1 + i)));
      }
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** First Fires down the left of the valley, smoke going straight up. The glow grows with every generation. */
  private drawHearths(t: number): void {
    const { working, broken } = this.counts("hearth");
    const ctx = this.ctx;
    const reach = 4 + Math.min(6, Math.log2(Math.max(1, this.view.generation)));
    for (let i = 0; i < working + broken; i++) {
      const isBroken = i >= working;
      const spot = this.spots.hearth[i]!;
      const s = this.sprite("hearth", isBroken);
      const x = Math.round(spot.x - s.w / 2);
      const y = spot.y - s.h + 2;
      if (!isBroken) {
        const flicker = 0.16 + 0.07 * Math.sin(t * 8 + i * 2.1);
        fillDisc(ctx, spot.x, y + 3, reach + (this.primed("hearth") ? 3 : 0), rgba(PRIME_GLOW.hearth, flicker));
        if (this.chance(1.4) && this.smoke.length < MAX_SMOKE) this.smoke.push({ x: spot.x, y: y - 1, age: 0 });
      }
      ctx.drawImage(s.canvas, x, y);
    }
    ctx.fillStyle = SMOKE;
    for (const p of this.smoke) {
      p.age += this.dt;
      p.y -= 6 * this.dt;
      // Straight up until it's high enough to catch the breeze.
      p.x += (p.age > 1.5 ? 3 : 0.4) * this.dt;
      const size = p.age > 2 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
    this.smoke = this.smoke.filter((p) => p.age < 4 && p.y > 0);
  }

  /** Wild Patches, scattered the way nothing planted ever is. They drop their crop to roll to the pile. */
  private drawDawn(t: number): void {
    const { working, broken } = this.counts("dawn");
    const n = working + broken;
    if (n === 0) return;
    const ctx = this.ctx;
    // Back to front, so nearer plants stand in front of further ones.
    const order: number[] = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => this.spots.dawn[a]!.y - this.spots.dawn[b]!.y);
    for (const i of order) {
      const isBroken = i >= working;
      const spot = this.spots.dawn[i]!;
      const s = this.sprite("dawn", isBroken);
      const sway = isBroken ? 0 : Math.round(Math.sin(t * 1.1 + i * 1.7) * 0.6);
      const x = Math.round(spot.x - s.w / 2) + sway;
      const y = spot.y - s.h + 1;
      // Prime patches get a pale ring of their own petals on the grass, not a halo.
      if (this.primed("dawn") && !isBroken) {
        ctx.fillStyle = PRIME_GLOW.dawn;
        ctx.fillRect(spot.x - 6, spot.y, 1, 1);
        ctx.fillRect(spot.x + 5, spot.y - 1, 1, 1);
        ctx.fillRect(spot.x - 3, spot.y + 2, 1, 1);
        ctx.fillRect(spot.x + 3, spot.y + 2, 1, 1);
      }
      ctx.drawImage(s.canvas, x, y);
      if (!isBroken && this.chance(0.1) && this.crop.length < MAX_CROP) {
        this.crop.push({ x: spot.x, y: y + s.h - 4, floor: spot.y + 1, vy: -14, rolling: false });
      }
    }
  }

  /** Elders, walking the lane through the middle and stopping to tend. Broken ones sit where they stopped. */
  private drawElders(t: number): void {
    const { working, broken } = this.counts("elder");
    const n = working + broken;
    const lane = Math.round(this.hz + (this.soilTop - this.hz) * 0.64);
    while (this.walkers.length < n) {
      const i = this.walkers.length;
      this.walkers.push({
        x: 36 + ((i * 47) % 110),
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
          w.until = t + (w.paused ? 1 + Math.random() * 2.5 : 2 + Math.random() * 4);
          if (!w.paused && Math.random() < 0.5) w.dir = w.dir === 1 ? -1 : 1;
        }
        if (!w.paused) {
          w.x += w.dir * 6 * this.dt;
          if (w.x < 30 || w.x > 150) w.dir = w.x < 30 ? 1 : -1;
        }
      }
      const s = this.sprite("elder", isBroken);
      // Walking bobs; stopping stoops, which is the tending.
      const bob = isBroken ? 0 : w.paused ? Math.round(Math.abs(Math.sin(t * 2 + w.phase))) : Math.round(Math.abs(Math.sin(t * 8 + w.phase)));
      const x = Math.round(w.x - s.w / 2);
      const y = lane + (i % 2) * 5 - s.h + (w.paused ? bob : -bob) + (isBroken ? 2 : 0);
      if (this.primed("elder") && !isBroken) fillDisc(ctx, w.x, y + 5, 5, GLOW_ELDER);
      ctx.drawImage(s.canvas, x, y);
    }
  }

  /** The cut edge at the front: soil, with the Mother Root running through it, lit where it's working. */
  private drawSoil(t: number): void {
    const ctx = this.ctx;
    const top = this.soilTop;
    ctx.fillStyle = SOIL;
    ctx.fillRect(0, top, SCENE_W, this.sh - top);
    ctx.fillStyle = TUFT;
    ctx.fillRect(0, top, SCENE_W, 1);
    ctx.fillStyle = SOIL_DARK;
    for (let y = top + 3; y < this.sh; y += 4) {
      for (let x = (y * 7) % 9; x < SCENE_W; x += 9) ctx.fillRect(x, y, 2, 1);
    }
    const { working, broken } = this.counts("root");
    const n = Math.min(this.strands.length, (working + broken) * 2);
    const deep = this.sh - top;
    const pulse = (t * 30) % (SCENE_W + 40);
    for (let i = 0; i < n; i++) {
      const strand = this.strands[i]!;
      const isBroken = i >= working * 2;
      const y0 = top + 2 + Math.round(strand.y * (deep - 5));
      for (let x = 0; x < SCENE_W; x++) {
        const y = y0 + Math.round(Math.sin(x / 11 + strand.phase) * strand.amp);
        // A torn root is only there in pieces.
        if (isBroken && (x + i * 5) % 11 < 4) continue;
        const lit = !isBroken && Math.abs(x - pulse + 20) < 4;
        ctx.fillStyle = isBroken ? ROOT_DEAD : lit ? ROOT_LIT : ROOT;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /** The pile: the same heap the farm keeps, at the front left. */
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

  /** Crop pops off a plant, lands, and rolls left to the pile. */
  private stepCrop(): void {
    const potato = artCanvas(POTATO_SPRITE);
    const ctx = this.ctx;
    for (const c of this.crop) {
      if (!c.rolling) {
        c.vy += 70 * this.dt;
        c.y += c.vy * this.dt;
        if (c.y >= c.floor) {
          c.y = c.floor;
          c.rolling = true;
        }
      } else {
        c.x -= 22 * this.dt;
        // Downhill toward the pile at the front.
        c.y = Math.min(this.sh - 4, c.y + 6 * this.dt);
      }
      ctx.drawImage(potato.canvas, Math.round(c.x) - 3, Math.round(c.y) - potato.h);
    }
    this.crop = this.crop.filter((c) => c.x > 24);
  }

  /** Dew catching the first light: little sparks on the grass that come and go. */
  private drawDew(): void {
    const ctx = this.ctx;
    if (this.dew.length < MAX_DEW && this.chance(2)) {
      const x = Math.floor(Math.random() * SCENE_W);
      const y = Math.round(this.hz + 3 + Math.random() * (this.soilTop - this.hz - 4));
      this.dew.push({ x, y, age: 0 });
    }
    ctx.fillStyle = DEW;
    for (const d of this.dew) {
      d.age += this.dt;
      const on = d.age < 0.6;
      ctx.fillRect(d.x, d.y, 1, 1);
      if (on && d.age > 0.15 && d.age < 0.45) {
        ctx.fillRect(d.x - 1, d.y, 3, 1);
        ctx.fillRect(d.x, d.y - 1, 1, 3);
      }
    }
    this.dew = this.dew.filter((d) => d.age < 0.6);
  }

  /** A dug potato: up out of the ground into the light, then onto the pile at the front left. */
  private drawDug(now: number): void {
    const ctx = this.ctx;
    const potato = artCanvas(POTATO_SPRITE);
    const pile = { x: 18, y: this.sh - 10 };
    this.dug = this.dug.filter((d) => now - d.born < DUG_MS);
    for (const d of this.dug) {
      const age = (now - d.born) / DUG_MS;
      const lift = Math.round(Math.sin(Math.min(1, age * 3) * Math.PI * 0.5) * 6);
      const away = Math.max(0, (age - 0.35) / 0.65);
      const e = away * away;
      const x = Math.round(d.x + (pile.x - d.x) * e);
      // An arc: up, over, and down onto the pile.
      const y = Math.round(d.y - lift + (pile.y - d.y) * e - Math.sin(away * Math.PI) * 10);
      ctx.globalAlpha = 1 - e * 0.6;
      ctx.drawImage(potato.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }
}
