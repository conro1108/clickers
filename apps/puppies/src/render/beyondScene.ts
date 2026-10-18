/**
 * The beyond: the dream the Second Chihuahua is having. A floating lawn under a huge moon, at three in
 * the morning, with the mill on the horizon the size a puppy remembers it. Shares the buffer
 * conventions with `millScene.ts` and `insideScene.ts`: integer-aligned unscaled blits,
 * translation-only animation. Everything on the lawn rides one slow bob, because it's floating.
 */

import type { solo } from "@clickers/sim";

import { PRODUCER_MARKS, PUPPY_SPRITE, ZZZ } from "./art.js";
import {
  EMPTY_VIEW,
  SCENE_W,
  clamp,
  hashSeed,
  mix,
  rgba,
  shownCount,
  yardLayout,
  type MillView,
} from "./millScene.js";
import { artCanvas, artTinted, type Art, type Sprite } from "./pixel.js";

export { SCENE_W };

type BeyondId = Extract<solo.SoloProducerId, "echo" | "kin" | "grove" | "tide" | "beacon" | "third">;

/** How many of each the lawn will draw before it stops adding and starts implying. */
const CAP: Record<BeyondId, number> = {
  echo: 7,
  kin: 5,
  grove: 6,
  tide: 4,
  beacon: 5,
  third: 7,
};

/** What a hundred-owned tier throws light in. Same rule as the other two scenes. */
const PRIME_GLOW: Record<BeyondId, string> = {
  echo: "#c8d6f4",
  kin: "#ffd166",
  grove: "#7fb8c8",
  tide: "#e8eefc",
  beacon: "#ffe08a",
  third: "#fff4d0",
};

// --- The place ---

const SKY_TOP = "#07071c";
const SKY_LOW = "#2a2452";
const VOID_LOW = "#05050f";
const LAWN_BACK = "#2c4a5a";
const LAWN_FRONT = "#3f6a5a";
const LAWN_LIT = "#6a9a8a";
const EARTH = "#2a1f2e";
const EARTH_DEEP = "#140e1a";
const ROOT = "#4a3640";
const MILL_SIL = "#1a1636";
const MILL_LIT = "#ffe08a";
const MOON = "#f4f0dc";
const MOON_SHADE = "#d8d0b4";

const STARS = 46;
const MAX_PUFFS = 40;
const WHISTLED_MS = 1400;
const ECHO_RING_MS = 1600;
const KIN_SPEED = 9;

/** How dim the dream goes as the bedding above it wears: at the floor it's mostly forgotten. */
const FADE_AT_FLOOR = 0.45;

interface Star {
  x: number;
  y: number;
  phase: number;
  bright: boolean;
}

interface Whistled {
  x: number;
  y: number;
  born: number;
}

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
}

interface Walker {
  x: number;
  dir: 1 | -1;
  /** Fraction down the kin band, so they don't all walk one line. */
  lane: number;
  speed: number;
  pause: number;
}

interface Ring {
  x: number;
  y: number;
  born: number;
}

interface Firefly {
  x: number;
  y: number;
  phase: number;
}

/** Deterministic 0..1 off a seed, an id and an index: placement that doesn't shuffle on every tick. */
function jitter(seed: number, salt: string, i: number): number {
  return (hashSeed(`${seed}:${salt}:${i}`) % 10_000) / 10_000;
}

export class BeyondScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /** Scene time in seconds, accumulated a capped frame at a time — see MillScene. */
  private clock = 0;
  private dt = 0;
  private lastFrame = performance.now();
  private view: MillView = EMPTY_VIEW;
  private seed = 1;
  private sawView = false;
  private stars: Star[] = [];
  private whistled: Whistled[] = [];
  private puffs: Puff[] = [];
  private walkers: Walker[] = [];
  private rings: Ring[] = [];
  private flies: Firefly[] = [];
  /** Displayed hoard, chasing the real one so spending looks like spending. */
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
    this.placeStars();
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.seed !== this.view.seed || view.generation !== this.view.generation);
    this.view = view;
    if (wiped || !this.sawView) {
      this.seed = hashSeed(view.seed);
      this.whistled = [];
      this.puffs = [];
      this.walkers = [];
      this.rings = [];
      this.flies = [];
      this.shown = Math.max(0, view.hoard);
      this.placeStars();
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

  /** A whistle out here comes up as a dream bubble with a puppy in it, and floats off. */
  whistle(at?: { x: number; y: number }): void {
    if (this.whistled.length > 14) return;
    const g = this.geometry();
    const x = at
      ? clamp(Math.round(at.x), 6, SCENE_W - 12)
      : Math.round(30 + Math.random() * (SCENE_W - 70));
    const y = at
      ? clamp(Math.round(at.y), 14, this.sh - 8)
      : Math.round(g.top + (g.front - g.top) * (0.6 + Math.random() * 0.3));
    this.whistled.push({ x, y, born: performance.now() });
    this.puff(x, y, -9);
    this.puff(x + 4, y, 9);
  }

  // --- Where things are ---

  private geometry(): { top: number; front: number; tip: number; moonX: number; moonY: number; moonR: number } {
    const sh = this.sh;
    const top = Math.round(sh * 0.47);
    const front = Math.round(sh * 0.84);
    const tip = Math.min(sh - 1, front + Math.max(8, Math.round(sh * 0.15)));
    const moonR = clamp(Math.round(sh * 0.11), 10, 22);
    return { top, front, tip, moonX: SCENE_W - 34, moonY: Math.max(moonR + 4, Math.round(sh * 0.18)), moonR };
  }

  /** Left and right edge of the lawn at buffer row `y`: narrower at the back, so it reads as a top. */
  private edges(y: number, top: number, front: number): [number, number] {
    const k = clamp((y - top) / Math.max(1, front - top), 0, 1);
    return [Math.round(18 - 14 * k), Math.round(SCENE_W - 18 + 14 * k)];
  }

  private placeStars(): void {
    const g = this.geometry();
    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      // Above the lawn mostly; a few under it, because it's floating and there's sky down there too.
      const under = i % 6 === 0;
      const y = under
        ? Math.round(g.front + (this.sh - g.front) * jitter(this.seed, "sy", i))
        : Math.round((g.top - 4) * jitter(this.seed, "sy", i));
      this.stars.push({
        x: Math.round((SCENE_W - 1) * jitter(this.seed, "sx", i)),
        y,
        phase: jitter(this.seed, "sp", i) * Math.PI * 2,
        bright: i % 7 === 0,
      });
    }
  }

  private mark(id: BeyondId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  private primed(id: BeyondId): boolean {
    return (this.view.marks[id] ?? 0) >= 3;
  }

  /** Working and broken units to draw, capped together so a storm doesn't add sprites. */
  private counts(id: BeyondId): { working: number; broken: number } {
    const w = this.view.working[id] ?? 0;
    const b = this.view.broken[id] ?? 0;
    const total = shownCount(w + b, CAP[id]);
    if (total <= 0) return { working: 0, broken: 0 };
    const broken = b > 0 ? Math.max(1, Math.round((total * b) / (w + b))) : 0;
    return { working: Math.max(0, total - broken), broken: Math.min(total, broken) };
  }

  private chance(perSec: number): boolean {
    return Math.random() < perSec * this.dt;
  }

  // --- The frame ---

  private draw(): void {
    const nowMs = performance.now();
    this.dt = Math.min(0.1, (nowMs - this.lastFrame) / 1000);
    this.lastFrame = nowMs;
    this.clock += this.dt;
    const t = this.clock;
    const ctx = this.ctx;
    const g = this.geometry();
    // The whole island drifts a pixel up and down. Translation only, on whole pixels.
    const bob = Math.round(Math.sin(t * 0.55) * 1.2);

    this.drawSky(g);
    this.drawStars(t);
    this.drawMoon(g, t);
    this.drawMoonDogs(g, t);
    this.drawMill(g);

    ctx.save();
    ctx.translate(0, bob);
    this.drawIsland(g);
    this.drawLawn(g);
    this.drawGrove(g, t);
    this.drawEchoes(g, t);
    this.drawBeacons(g, t);
    this.drawTides(g, t);
    this.drawKin(g, t);
    this.drawHoard(g, t);
    this.drawRings(nowMs);
    this.drawFlies(g, t);
    ctx.restore();

    this.drawWhistled(nowMs);
    this.drawPuffs(nowMs);
    this.drawFade();
  }

  private drawSky(g: { top: number; front: number }): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.sh);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(clamp(g.top / this.sh, 0, 1), SKY_LOW);
    grad.addColorStop(1, VOID_LOW);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, this.sh);
  }

  private drawStars(t: number): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.phase));
      ctx.fillStyle = rgba("#e8eefc", tw * (s.bright ? 1 : 0.7));
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.bright && tw > 0.85) {
        ctx.fillStyle = rgba("#e8eefc", 0.35);
        ctx.fillRect(s.x - 1, s.y, 1, 1);
        ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1);
        ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
  }

  /** Far too big, the way the moon is when you're small. Once there are Moon Dogs, it has ears. */
  private drawMoon(g: { moonX: number; moonY: number; moonR: number }, t: number): void {
    const ctx = this.ctx;
    const { moonX: cx, moonY: cy, moonR: r } = g;
    this.glow(cx, cy, r * 2.4, "#c8d6f4", 0.18 + 0.03 * Math.sin(t * 0.7));
    const dog = (this.view.working.third ?? 0) + (this.view.broken.third ?? 0) > 0;
    if (dog) {
      // Ears: two stepped triangles off the top, drawn as rows so they stay on the grid.
      const earH = Math.round(r * 0.7);
      for (let i = 0; i < earH; i++) {
        const w = Math.max(1, Math.round(((i + 1) / earH) * r * 0.45));
        const y = cy - r - earH + i + Math.round(r * 0.35);
        ctx.fillStyle = MOON_SHADE;
        ctx.fillRect(cx - Math.round(r * 0.7) - Math.floor(w / 2), y, w, 1);
        ctx.fillRect(cx + Math.round(r * 0.7) - Math.floor(w / 2), y, w, 1);
      }
    }
    for (let y = -r; y <= r; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillStyle = y > r * 0.35 ? MOON_SHADE : MOON;
      ctx.fillRect(cx - half, cy + y, half * 2, 1);
    }
    // Craters, or — once it has ears — a face.
    ctx.fillStyle = rgba("#a8a088", 0.55);
    if (dog) {
      const blink = (t % 5.3) < 0.18;
      const ey = cy - Math.round(r * 0.15);
      const ew = Math.max(1, Math.round(r * 0.14));
      ctx.fillRect(cx - Math.round(r * 0.4), ey, ew, blink ? 1 : ew);
      ctx.fillRect(cx + Math.round(r * 0.4) - ew, ey, ew, blink ? 1 : ew);
      ctx.fillStyle = rgba("#6a6a9a", 0.7);
      ctx.fillRect(cx - 1, cy + Math.round(r * 0.2), 3, 2);
    } else {
      ctx.fillRect(cx - Math.round(r * 0.4), cy - Math.round(r * 0.3), 3, 2);
      ctx.fillRect(cx + Math.round(r * 0.2), cy + Math.round(r * 0.1), 4, 3);
      ctx.fillRect(cx - Math.round(r * 0.1), cy + Math.round(r * 0.5), 2, 2);
    }
  }

  /** The last rung lives in the sky: small moons, curled, on an arc round the big one. */
  private drawMoonDogs(g: { moonX: number; moonY: number; moonR: number }, t: number): void {
    const { working, broken } = this.counts("third");
    const n = working + broken;
    if (n === 0) return;
    const art = artCanvas(this.mark("third"));
    const dim = artTinted(this.mark("third"), "#1a1838", 0.7);
    // Strung out to the left of the big one, along a shallow arc, the way a litter follows its mother.
    const left = 8;
    const right = g.moonX - g.moonR - art.w - 6;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 1 : i / (n - 1);
      const x = Math.round(right - (right - left) * k * Math.min(1, n / CAP.third));
      const y = Math.max(
        2,
        Math.round(g.moonY - g.moonR + 4 + Math.sin(k * Math.PI) * -6 + (i % 2) * 5 + Math.sin(t * 0.9 + i) * 1),
      );
      if (i < working) {
        this.primeGlow("third", x, y, art.w, art.h, t, i);
        this.glow(x + art.w / 2, y + art.h / 2, 8, "#e8eefc", 0.12);
        this.ctx.drawImage(art.canvas, x, y);
      } else {
        this.ctx.globalAlpha = 0.5;
        this.ctx.drawImage(dim.canvas, x, y);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  /** The mill on the horizon, the size a puppy remembers it, with a food bowl on the roof. */
  private drawMill(g: { top: number }): void {
    const ctx = this.ctx;
    const base = g.top + 2;
    const x = 26;
    const w = 46;
    const h = Math.min(Math.round(this.sh * 0.3), base - 14);
    ctx.fillStyle = MILL_SIL;
    ctx.fillRect(x, base - h, w, h);
    // A roof that leans too far, and a bowl bigger than the roof.
    for (let i = 0; i < 9; i++) ctx.fillRect(x - 2 + i, base - h - 9 + i, w + 4 - i * 2 + 6, 1);
    ctx.fillRect(x + 8, base - h - 14, 30, 3);
    ctx.fillRect(x + 11, base - h - 11, 24, 2);
    // Windows: one always lit, one that comes and goes.
    ctx.fillStyle = rgba(MILL_LIT, 0.85);
    ctx.fillRect(x + 8, base - h + 8, 4, 4);
    ctx.fillStyle = rgba(MILL_LIT, 0.35 + 0.3 * Math.max(0, Math.sin(this.clock * 0.4)));
    ctx.fillRect(x + 30, base - h + 14, 4, 4);
    this.glow(x + 10, base - h + 10, 7, MILL_LIT, 0.18);
  }

  /** The underside: earth tapering to a point, roots trailing off into the stars. */
  private drawIsland(g: { top: number; front: number; tip: number }): void {
    const ctx = this.ctx;
    const [l0, r0] = this.edges(g.front, g.top, g.front);
    const depth = Math.max(1, g.tip - g.front);
    for (let y = g.front; y <= g.tip; y++) {
      const k = (y - g.front) / depth;
      const half = Math.round(((r0 - l0) / 2) * (1 - k * k * 0.92) * (1 - k * 0.15));
      const cx = Math.round((l0 + r0) / 2 + Math.sin(k * 3) * 4);
      ctx.fillStyle = mix(EARTH, EARTH_DEEP, k);
      ctx.fillRect(cx - half, y, half * 2, 1);
    }
    ctx.fillStyle = ROOT;
    for (let i = 0; i < 9; i++) {
      const x = Math.round(l0 + 12 + (r0 - l0 - 24) * jitter(this.seed, "root", i));
      const len = 3 + Math.round(jitter(this.seed, "rlen", i) * 10);
      const k = Math.abs(x - (l0 + r0) / 2) / ((r0 - l0) / 2);
      const from = Math.round(g.front + depth * (1 - Math.sqrt(Math.max(0, 1 - k))) * 0.9);
      for (let j = 0; j < len; j++) ctx.fillRect(x + (j > len / 2 ? 1 : 0), from + j, 1, 1);
    }
  }

  private drawLawn(g: { top: number; front: number }): void {
    const ctx = this.ctx;
    for (let y = g.top; y <= g.front; y++) {
      const [l, r] = this.edges(y, g.top, g.front);
      const k = (y - g.top) / Math.max(1, g.front - g.top);
      ctx.fillStyle = y === g.top ? LAWN_LIT : mix(LAWN_BACK, LAWN_FRONT, k);
      ctx.fillRect(l, y, r - l, 1);
    }
    // The lip, catching the moon.
    const [l, r] = this.edges(g.front, g.top, g.front);
    ctx.fillStyle = LAWN_LIT;
    ctx.fillRect(l, g.front, r - l, 1);
    // Tufts.
    ctx.fillStyle = rgba(LAWN_LIT, 0.6);
    for (let i = 0; i < 28; i++) {
      const y = Math.round(g.top + 3 + (g.front - g.top - 5) * jitter(this.seed, "ty", i));
      const [tl, tr] = this.edges(y, g.top, g.front);
      const x = Math.round(tl + 2 + (tr - tl - 4) * jitter(this.seed, "tx", i));
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 2, y - 1, 1, 2);
    }
  }

  /** A row of sprites standing on one line of the lawn, spread across what's open. */
  private standRow(
    id: BeyondId,
    y: number,
    g: { top: number; front: number },
    t: number,
    from = 0.08,
    to = 0.92,
    each?: (x: number, y: number, art: Sprite, i: number) => void,
  ): void {
    const { working, broken } = this.counts(id);
    const n = working + broken;
    if (n === 0) return;
    const art = artCanvas(this.mark(id));
    const dim = artTinted(this.mark(id), "#10102a", 0.65);
    const [l, r] = this.edges(y, g.top, g.front);
    for (let i = 0; i < n; i++) {
      const k = from + (to - from) * ((i + 0.5) / n);
      const jx = Math.round((jitter(this.seed, id, i) - 0.5) * 6);
      const x = Math.round(l + (r - l) * k - art.w / 2 + jx);
      const yy = y - art.h + Math.round(jitter(this.seed, `${id}y`, i) * 2);
      if (i < working) {
        this.primeGlow(id, x, yy, art.w, art.h, t, i);
        this.ctx.drawImage(art.canvas, x, yy);
        each?.(x, yy, art, i);
      } else {
        // Gone vague: dimmed, and only half there.
        this.ctx.globalAlpha = 0.45;
        this.ctx.drawImage(dim.canvas, x, yy);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  private drawGrove(g: { top: number; front: number }, t: number): void {
    // Trees at the back edge, kept off the middle so the mill shows between them.
    this.standRow("grove", g.top + 3, g, t, 0.02, 0.98);
  }

  private drawEchoes(g: { top: number; front: number }, t: number): void {
    const y = g.top + Math.round((g.front - g.top) * 0.22) + 4;
    this.standRow("echo", y, g, t, 0.06, 0.94, (x, yy, art, i) => {
      // An echo kennel barks now and then, and what comes back is a ring.
      if (this.rings.length < 6 && this.chance(0.12) && jitter(this.seed, "ring", i) > 0.2) {
        this.rings.push({ x: x + Math.round(art.w / 2), y: yy + 4, born: performance.now() });
      }
    });
  }

  private drawBeacons(g: { top: number; front: number }, t: number): void {
    const y = g.top + Math.round((g.front - g.top) * 0.42) + 6;
    this.standRow("beacon", y, g, t, 0.14, 0.86, (x, yy, art, i) => {
      const flicker = 0.85 + 0.15 * Math.sin(t * 7 + i * 1.7) * (jitter(this.seed, "fl", i) > 0.7 ? 1 : 0.2);
      this.glow(x + art.w / 2, yy + 2, 14, "#ffe08a", 0.28 * flicker);
    });
  }

  private drawTides(g: { top: number; front: number }, t: number): void {
    const y = g.top + Math.round((g.front - g.top) * 0.56) + 4;
    this.standRow("tide", y, g, t, 0.2, 0.8, (x, yy, art, i) => {
      // The moon in it shivers.
      if (Math.sin(t * 2.1 + i * 2) > 0.92) {
        this.ctx.fillStyle = rgba("#e8eefc", 0.6);
        this.ctx.fillRect(x + Math.round(art.w / 2) + 2, yy + art.h - 3, 2, 1);
      }
    });
  }

  /** Throwers walk, stop, wind up, and walk again. */
  private drawKin(g: { top: number; front: number }, t: number): void {
    const { working, broken } = this.counts("kin");
    while (this.walkers.length < working) {
      const i = this.walkers.length;
      this.walkers.push({
        x: 30 + (SCENE_W - 60) * jitter(this.seed, "kx", i),
        dir: jitter(this.seed, "kd", i) > 0.5 ? 1 : -1,
        lane: jitter(this.seed, "kl", i),
        speed: KIN_SPEED * (0.7 + 0.6 * jitter(this.seed, "ks", i)),
        pause: 0,
      });
    }
    this.walkers.length = Math.min(this.walkers.length, working);
    const art = this.mark("kin");
    const sprite = artCanvas(art);
    const band0 = g.top + Math.round((g.front - g.top) * 0.6);
    const band1 = g.top + Math.round((g.front - g.top) * 0.76);
    for (const [i, w] of this.walkers.entries()) {
      const y = Math.round(band0 + (band1 - band0) * w.lane);
      const [l, r] = this.edges(y, g.top, g.front);
      if (w.pause > 0) {
        w.pause -= this.dt;
      } else {
        w.x += w.dir * w.speed * this.dt;
        if (this.chance(0.15)) w.pause = 0.8 + Math.random() * 1.5;
      }
      if (w.x < l + 4) w.dir = 1;
      if (w.x > r - sprite.w - 4) w.dir = -1;
      const step = w.pause > 0 ? 0 : Math.round(Math.abs(Math.sin(t * 6 + i)));
      const x = Math.round(w.x);
      const yy = y - sprite.h - step;
      this.primeGlow("kin", x, yy, sprite.w, sprite.h, t, i);
      this.ctx.drawImage(sprite.canvas, x, yy);
    }
    // The vague ones stand where they were last pictured.
    const dim = artTinted(art, "#10102a", 0.65);
    for (let i = 0; i < broken; i++) {
      const x = Math.round(24 + (SCENE_W - 48) * jitter(this.seed, "kb", i));
      const y = Math.round(band0 + (band1 - band0) * jitter(this.seed, "kby", i)) - dim.h;
      this.ctx.globalAlpha = 0.4;
      this.ctx.drawImage(dim.canvas, x, y);
      this.ctx.globalAlpha = 1;
    }
  }

  /** The hoard: a heap of puppies asleep on the front lawn, the same count the yard would show. */
  private drawHoard(g: { top: number; front: number }, t: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) this.shown = target;
    const k = 1 - Math.pow(0.06, this.dt);
    this.shown += (target - this.shown) * k;
    const n = Math.min(24, yardLayout(this.shown).pack);
    if (n <= 0) return;
    const pup = artCanvas(PUPPY_SPRITE);
    const z = artCanvas(ZZZ);
    const perRow = 8;
    const y0 = g.front - 2;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const y = y0 - row * 4 - pup.h;
      const [l, r] = this.edges(y0, g.top, g.front);
      const span = Math.min(r - l - 20, perRow * 9);
      const x = Math.round((l + r) / 2 - span / 2 + col * (span / perRow) + (row % 2) * 4 + (jitter(this.seed, "pp", i) - 0.5) * 3);
      // Breathing: a pixel up and down, out of step with each other.
      const breath = Math.sin(t * 1.4 + i * 1.9) > 0.6 ? 1 : 0;
      this.ctx.drawImage(pup.canvas, x, y - breath);
      if (i % 6 === 2) {
        const zy = y - 6 - Math.round(((t * 3 + i) % 4));
        this.ctx.globalAlpha = 0.55;
        this.ctx.drawImage(z.canvas, x + 4, zy);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  private drawRings(now: number): void {
    const ctx = this.ctx;
    this.rings = this.rings.filter((r) => now - r.born < ECHO_RING_MS);
    for (const ring of this.rings) {
      const age = (now - ring.born) / ECHO_RING_MS;
      const rad = Math.round(3 + age * 14);
      ctx.fillStyle = rgba("#c8d6f4", 0.4 * (1 - age));
      // A ring of whole pixels, sparse enough to read as sound rather than a shape.
      for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(ring.x + Math.cos(th) * rad), Math.round(ring.y + Math.sin(th) * rad * 0.6), 1, 1);
      }
    }
  }

  /** Fireflies, more of them the more grove there is. */
  private drawFlies(g: { top: number; front: number }, t: number): void {
    const want = Math.min(14, 2 + 2 * ((this.view.working.grove ?? 0) > 0 ? shownCount(this.view.working.grove ?? 0, 6) : 0));
    while (this.flies.length < want) {
      const i = this.flies.length;
      this.flies.push({
        x: 10 + (SCENE_W - 20) * jitter(this.seed, "fx", i),
        y: g.top - 10 + (g.front - g.top) * jitter(this.seed, "fy", i),
        phase: jitter(this.seed, "fp", i) * 10,
      });
    }
    this.flies.length = want;
    for (const f of this.flies) {
      const x = Math.round(f.x + Math.sin(t * 0.4 + f.phase) * 8);
      const y = Math.round(f.y + Math.cos(t * 0.31 + f.phase) * 4);
      const on = 0.5 + 0.5 * Math.sin(t * 2 + f.phase * 3);
      if (on < 0.3) continue;
      this.glow(x, y, 4, "#d8f08a", 0.25 * on);
      this.ctx.fillStyle = rgba("#f0ffb0", on);
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  private drawWhistled(now: number): void {
    const ctx = this.ctx;
    const pup = artCanvas(PUPPY_SPRITE);
    this.whistled = this.whistled.filter((d) => now - d.born < WHISTLED_MS);
    for (const d of this.whistled) {
      const age = (now - d.born) / WHISTLED_MS;
      const x = Math.round(d.x + Math.sin(age * 5) * 2);
      const y = Math.round(d.y - age * 22);
      const alpha = age > 0.6 ? 1 - (age - 0.6) / 0.4 : 1;
      ctx.globalAlpha = alpha;
      // The bubble: a pixel ring round the pup, with a glint.
      ctx.fillStyle = rgba("#e8eefc", 0.6);
      const r = 6;
      for (let a = 0; a < 20; a++) {
        const th = (a / 20) * Math.PI * 2;
        ctx.fillRect(Math.round(x + 3 + Math.cos(th) * r), Math.round(y + 2 + Math.sin(th) * r), 1, 1);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1, y - 2, 1, 1);
      ctx.drawImage(pup.canvas, x, y);
      ctx.globalAlpha = 1;
    }
  }

  private puff(x: number, y: number, vx: number, vy = -6): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    this.puffs.push({ x, y, vx, vy, born: performance.now(), life: 500 + Math.random() * 400 });
  }

  private drawPuffs(now: number): void {
    const ctx = this.ctx;
    this.puffs = this.puffs.filter((p) => now - p.born < p.life);
    for (const p of this.puffs) {
      const age = (now - p.born) / p.life;
      ctx.fillStyle = rgba("#c8d6f4", 0.4 * (1 - age));
      ctx.fillRect(Math.round(p.x + p.vx * age), Math.round(p.y + p.vy * age), 2, 2);
    }
  }

  /** Tired bedding up in the nest is a dream that's going: the whole picture dims toward forgotten. */
  private drawFade(): void {
    const c = clamp(this.view.condition, 0, 1);
    const k = clamp((1 - c) / 0.75, 0, 1) * FADE_AT_FLOOR;
    if (k <= 0.001) return;
    this.ctx.fillStyle = rgba("#05050f", k);
    this.ctx.fillRect(0, 0, SCENE_W, this.sh);
  }

  // --- Light ---

  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0.001 || r <= 0) return;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  private primeGlow(id: BeyondId, x: number, y: number, w: number, h: number, t: number, idx = 0): void {
    if (!this.primed(id)) return;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + idx * 2.3);
    this.glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.9, PRIME_GLOW[id], 0.4 * pulse);
  }
}
