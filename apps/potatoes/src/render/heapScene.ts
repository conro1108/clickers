/**
 * After: under the ash. A cross-section of the heap, ash along the top and the last red of the sun
 * through the cracks, everything that ever ended packed in layers and going back to dirt, hotter the
 * further down you look. Rot Beds steam, the Worm Gang works its tunnels, Wet Sacking hangs off the
 * roof, Fairy Rings light up the rich patches, and White Thread runs through all of it from the
 * Sixth Potato in the hot middle, with a pulse going out along it for every generation.
 */

import { LongScene, fillDisc, type Spot } from "./longScene.js";
import { SCENE_W, clamp, mix, rgba } from "./farmScene.js";

type HeapId = "loam" | "drone" | "moss" | "mire" | "kinship" | "sixth";

const ASH = "#4e4648";
const ASH_LIT = "#8a7a78";
const DIRT_TOP = "#1e1416";
const DIRT_MID = "#3a2318";
const DIRT_LOW = "#6a3418";
const DIRT_SOUR = "#2a2a22";
const THREAD = "#d8e8d0";
const HEAT = "#ff8a3a";
const SPORE = "#c8f0d8";

// Bits of every earlier world, sunk into the dirt.
const JUNK = ["#7a8a98", "#d0b0f8", "#ffd166", "#e8e0d0", "#c04a4a", "#8ad0e8"];

interface Thread {
  points: Spot[];
  speed: number;
}

export class HeapScene extends LongScene<HeapId> {
  private ash = 30;
  private threads: Thread[] = [];
  private tunnels: { y: number; from: number; to: number }[] = [];
  private worms: { x: number; dir: 1 | -1; phase: number }[] = [];
  private motes: { x: number; y: number; vy: number; life: number }[] = [];
  private junk: (Spot & { c: string })[] = [];

  protected layOut(r: () => number): void {
    const sh = this.sh;
    const ash = (this.ash = Math.round(sh * 0.14));
    const heart: Spot = { x: 90, y: Math.round(sh * 0.66) };
    const at = (fx: number, fy: number): Spot => ({ x: Math.round(SCENE_W * fx), y: Math.round(sh * fy) });
    this.tunnels = [0.4, 0.54, 0.68, 0.82].map((fy, i) => {
      const from = 6 + Math.floor(r() * 40);
      return { y: Math.round(sh * fy) + (i % 2), from, to: SCENE_W - 6 - Math.floor(r() * 40) };
    });
    this.spots = {
      loam: [at(0.2, 0.34), at(0.78, 0.31), at(0.47, 0.42), at(0.13, 0.55), at(0.88, 0.52), at(0.62, 0.3)],
      drone: this.tunnels.flatMap((t) => [{ x: t.from, y: t.y }, { x: t.to, y: t.y }]),
      moss: [{ x: 26, y: ash + 12 }, { x: 150, y: ash + 12 }, { x: 96, y: ash + 12 }, { x: 62, y: ash + 12 }],
      mire: [at(0.84, 0.72), at(0.14, 0.76), at(0.67, 0.52), at(0.32, 0.56), at(0.92, 0.86)],
      kinship: [at(0.33, 0.8), at(0.73, 0.84), at(0.52, 0.5)],
      sixth: [heart],
    };
    this.worms = this.spots.drone.map((spot, i) => ({ x: spot.x, dir: i % 2 ? -1 : 1, phase: i * 1.7 }));
    this.junk = [];
    for (let i = 0; i < 70; i++) {
      const y = ash + 4 + Math.floor(r() * (sh - ash - 8));
      this.junk.push({ x: Math.floor(r() * SCENE_W), y, c: JUNK[Math.floor(r() * JUNK.length)]! });
    }
    // Threads wander out from the heart in pixel steps, each forking off the last.
    this.threads = [];
    for (let i = 0; i < 26; i++) {
      const base = this.threads[Math.floor(r() * this.threads.length)]?.points;
      const start = base ? base[Math.floor(r() * base.length)]! : heart;
      const a = r() * Math.PI * 2;
      const points: Spot[] = [start];
      let { x, y } = start;
      for (let s = 0, n = 20 + Math.floor(r() * 40); s < n; s++) {
        const turn = a + Math.sin(s * 0.3 + i) * 0.9;
        x += Math.cos(turn) * 1.4;
        y += Math.sin(turn) * 1.1;
        if (y < ash + 6 || y > sh - 3 || x < 1 || x > SCENE_W - 2) break;
        points.push({ x: Math.round(x), y: Math.round(y) });
      }
      this.threads.push({ points, speed: 12 + r() * 16 });
    }
  }

  protected backdrop(ctx: CanvasRenderingContext2D, condition: number): void {
    const { sh, ash } = this;
    const sour = clamp((1 - condition) * 1.3, 0, 1);
    for (let y = ash; y < sh; y++) {
      const k = (y - ash) / (sh - ash);
      const c = k < 0.55 ? mix(DIRT_TOP, DIRT_MID, k / 0.55) : mix(DIRT_MID, DIRT_LOW, (k - 0.55) / 0.45);
      ctx.fillStyle = mix(c, DIRT_SOUR, sour);
      ctx.fillRect(0, y, SCENE_W, 1);
    }
    // Strata: the heap settled in the order things ended.
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let band = 0; band < 7; band++) {
      const y0 = ash + 12 + band * ((sh - ash) / 7);
      for (let x = 0; x < SCENE_W; x++) ctx.fillRect(x, Math.round(y0 + Math.sin(x / (9 + band * 2) + band) * 2.4), 1, 1 + (band % 2));
    }
    for (const j of this.junk) {
      ctx.fillStyle = rgba(j.c, 0.5);
      ctx.fillRect(j.x, j.y, 1 + (j.x % 3 === 0 ? 1 : 0), 1);
    }
    // Tunnels, worn into the dirt.
    for (const t of this.tunnels) {
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      for (let x = t.from; x < t.to; x++) ctx.fillRect(x, t.y - 3 + Math.round(Math.sin(x / 11 + t.y) * 1.5), 1, 5);
    }
    // The heat at the bottom of it.
    const heart = this.spots.sixth[0]!;
    fillDisc(ctx, heart.x, heart.y - 7, sh * 0.26, rgba(HEAT, 0.06));
    fillDisc(ctx, heart.x, heart.y - 7, sh * 0.15, rgba(HEAT, 0.09));
    // The ash lid, and where the sun gets through it.
    for (let x = 0; x < SCENE_W; x++) {
      const top = ash - 8 + Math.round(2.5 * Math.sin(x / 13) + 1.5 * Math.sin(x / 5.3));
      ctx.fillStyle = "#6a2024";
      ctx.fillRect(x, 0, 1, top);
      ctx.fillStyle = ASH_LIT;
      ctx.fillRect(x, top, 1, 1);
      ctx.fillStyle = ASH;
      ctx.fillRect(x, top + 1, 1, ash - top + 2 + Math.round(1.4 * Math.sin(x / 3.7)));
    }
  }

  protected scene(t: number): void {
    this.drawThreads(t);
    this.drawBeds();
    this.drawWorms(t);
    this.drawRings(t);
    this.drawKnots(t);
    this.drawSixth(t);
    this.drawSacks(t);
    this.drawMotes();
  }

  /** As much of the web as this line has earned, and the pulses running along it. */
  private drawThreads(t: number): void {
    if (this.owned("kinship") === 0) return;
    const ctx = this.ctx;
    const n = clamp(3 + Math.floor(Math.log2(this.view.generation) * 3) + Math.floor(Math.log2(this.owned("kinship"))), 3, this.threads.length);
    ctx.fillStyle = rgba(THREAD, 0.3);
    for (let i = 0; i < n; i++) for (const p of this.threads[i]!.points) ctx.fillRect(p.x, p.y, 1, 1);
    ctx.fillStyle = THREAD;
    for (let i = 0; i < n; i++) {
      const { points, speed } = this.threads[i]!;
      const head = Math.floor((t * speed + i * 17) % (points.length + 12));
      for (let k = Math.max(0, head - 2); k <= head && k < points.length; k++) ctx.fillRect(points[k]!.x, points[k]!.y, 1, 1);
    }
  }

  private drawBeds(): void {
    this.each("loam", (spot, i, broken, s) => {
      this.stand(s, spot.x, spot.y);
      if (broken) return;
      if (this.primed("loam")) this.glow(spot.x, spot.y - 5, 8, "#a4e884", 0.1);
      if (this.chance(0.5) && this.motes.length < 30) this.motes.push({ x: spot.x - 6 + (i * 5) % 12, y: spot.y - s.h, vy: -7, life: 2 });
    });
  }

  /** Each gang works a tunnel, nosing along it and doubling back. */
  private drawWorms(t: number): void {
    this.each("drone", (_, i, broken, s) => {
      const w = this.worms[i]!;
      const lane = this.tunnels[Math.floor(i / 2)]!;
      if (!broken) {
        w.x += w.dir * (5 + 2 * Math.sin(t * 2 + w.phase)) * this.dt;
        if (w.x < lane.from) w.dir = 1;
        if (w.x > lane.to) w.dir = -1;
      }
      const y = lane.y + Math.round(Math.sin(w.x / 11 + lane.y) * 1.5) + 2;
      const ctx = this.ctx;
      const left = Math.round(w.x - s.w / 2);
      ctx.save();
      if (w.dir === 1) {
        ctx.translate(left * 2 + s.w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(s.canvas, left, y - s.h + 1);
      ctx.restore();
    });
  }

  private drawRings(t: number): void {
    const lit = clamp(this.view.condition, 0, 1);
    this.each("mire", (spot, i, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 4, this.primed("mire") ? 14 : 10, "#40c0a8", (0.08 + 0.05 * Math.sin(t * 1.3 + i * 2)) * lit);
      this.stand(s, spot.x, spot.y);
      if (!broken && this.chance(0.5) && this.motes.length < 30) this.motes.push({ x: spot.x, y: spot.y - s.h, vy: -7, life: 3 });
    });
  }

  private drawKnots(t: number): void {
    this.each("kinship", (spot, i, broken, s) => {
      if (!broken) this.glow(spot.x, spot.y - 5, 8, THREAD, 0.1 + 0.04 * Math.sin(t * 0.9 + i));
      this.stand(s, spot.x, spot.y);
    });
  }

  /** It breathes. Slowly, and it's the only thing down here that does. */
  private drawSixth(t: number): void {
    this.each("sixth", (spot, _, broken, s) => {
      const breathe = broken ? 0 : Math.round(Math.sin(t * 0.7));
      if (!broken) {
        this.glow(spot.x, spot.y - 7, 24, HEAT, 0.08);
        this.glow(spot.x, spot.y - 7, 15, HEAT, 0.12);
      }
      this.stand(s, spot.x, spot.y - breathe);
    });
  }

  private drawSacks(t: number): void {
    this.each("moss", (spot, i, broken, s) => {
      this.stand(s, spot.x + (broken ? 0 : Math.round(Math.sin(t * 0.6 + i))), spot.y);
      if (!broken && this.chance(0.4) && this.motes.length < 30) this.motes.push({ x: spot.x - 4 + (i * 7) % 9, y: spot.y + 1, vy: 30, life: 9 });
    });
  }

  /** Steam going up off the beds and rings; drips coming down off the sacks. */
  private drawMotes(): void {
    const ctx = this.ctx;
    for (const m of this.motes) {
      const drip = m.vy > 0;
      m.life -= this.dt;
      m.y += m.vy * this.dt;
      m.x += drip ? 0 : Math.sin(m.y / 5) * 3 * this.dt;
      ctx.fillStyle = drip ? rgba("#8ad0e8", 0.7) : rgba(SPORE, Math.min(0.4, m.life * 0.2));
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, drip ? 2 : 1);
    }
    this.motes = this.motes.filter((m) => m.life > 0 && m.y < this.sh && m.y > this.ash);
  }
}
