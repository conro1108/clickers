/**
 * The arrival cut's first half: one thing out in the dark, and the fall toward it. Drawn on its own
 * full-screen canvas at whatever size the fall has reached, nearest-neighbour the whole way, so it
 * stays pixel art right up to the frame where one of its pixels is wider than the screen. What it
 * falls into is the real scene of the world you're arriving in, under it in the DOM.
 */

import type { solo } from "@clickers/sim";

import {
  CUT_BRIDGE,
  CUT_DOG_STAR,
  CUT_DOG_STAR_DIM,
  CUT_DREAM_DOG,
  CUT_FIRE,
  CUT_FIRE_FLICKER,
  CUT_NEST_DOG,
  CUT_SUNK_BALL,
} from "./art.js";
import { artCanvas, type Art } from "./pixel.js";

export interface Subject {
  /** On a clock if `fps` is set; otherwise spread over the approach, so a thing can change as you near it. */
  frames: readonly Art[];
  fps?: number;
  /** The art pixel you go through. */
  focus: { x: number; y: number };
  /** The halo behind it, as "r, g, b". */
  glow: string;
  /** The frame of light on the way through. */
  flash: string;
  shake?: boolean;
}

export const SUBJECTS: Record<Exclude<solo.World, "outside">, Subject> = {
  inside: { frames: [CUT_NEST_DOG], focus: { x: 6, y: 12 }, glow: "255, 191, 122", flash: "#fff3d6" },
  beyond: { frames: [CUT_DREAM_DOG], focus: { x: 6, y: 12 }, glow: "200, 214, 244", flash: "#e8eefc" },
  deep: { frames: [CUT_SUNK_BALL], focus: { x: 8, y: 12 }, glow: "110, 200, 220", flash: "#cfeff0" },
  origin: { frames: [CUT_FIRE, CUT_FIRE_FLICKER], fps: 5, focus: { x: 22, y: 5 }, glow: "255, 150, 60", flash: "#fff0d0" },
  void: { frames: [CUT_DOG_STAR, CUT_DOG_STAR_DIM], fps: 3, focus: { x: 10, y: 10 }, glow: "255, 244, 192", flash: "#e8e8ff", shake: true },
  end: { frames: [CUT_BRIDGE], focus: { x: 17, y: 4 }, glow: "255, 216, 160", flash: "#fff4e0" },
};

// Fractions of the cut. Kept in step with the `converge-*` keyframes in styles.css.
const FALL_FROM = 0.08;
const FALL_TO = 0.46;
const FLASH_UP = 0.41;
const FLASH_PEAK = 0.45;
const FLASH_DOWN = 0.54;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** One frame of the cut, `t` of the way through it. */
export function drawCut(ctx: CanvasRenderingContext2D, w: number, h: number, subject: Subject, t: number, ms: number): void {
  ctx.clearRect(0, 0, w, h);
  const u = clamp01((t - FALL_FROM) / (FALL_TO - FALL_FROM));
  const shown = clamp01((t - 0.06) / 0.06) * (1 - clamp01((t - 0.44) / 0.04));

  if (shown > 0) {
    const n = subject.frames.length;
    const i = subject.fps ? Math.floor((ms / 1000) * subject.fps) % n : Math.min(n - 1, Math.floor((u / 0.7) * n));
    const s = artCanvas(subject.frames[i]!);
    const side = Math.min(w, h);
    // A speck, then nearly all of the distance in the last stretch: exponential so it reads as speed, not growth.
    const from = (side * 0.06) / Math.max(s.w, s.h);
    const to = side * 1.4;
    const px = from * Math.pow(to / from, Math.pow(u, 2.4));
    // From its middle to the pixel you're going through, so the fall lands somewhere on purpose.
    const k = smooth(u);
    let ax = s.w / 2 + (subject.focus.x + 0.5 - s.w / 2) * k;
    let ay = s.h / 2 + (subject.focus.y + 0.5 - s.h / 2) * k;
    if (subject.shake && u < 0.85) {
      ax += (Math.floor(Math.random() * 3) - 1) * 0.5;
      ay += (Math.floor(Math.random() * 3) - 1) * 0.5;
    }

    ctx.globalAlpha = shown;
    const r = Math.max(s.w, s.h) * px;
    const halo = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
    halo.addColorStop(0, `rgba(${subject.glow}, 0.28)`);
    halo.addColorStop(1, `rgba(${subject.glow}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.canvas, Math.round(w / 2 - ax * px), Math.round(h / 2 - ay * px), Math.ceil(s.w * px), Math.ceil(s.h * px));
  }

  const flash = t < FLASH_PEAK ? clamp01((t - FLASH_UP) / (FLASH_PEAK - FLASH_UP)) : 1 - clamp01((t - FLASH_PEAK) / (FLASH_DOWN - FLASH_PEAK));
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.9;
    ctx.fillStyle = subject.flash;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalAlpha = 1;
}
