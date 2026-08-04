/**
 * The homestead, drawn.
 *
 * A low-res buffer (SCENE_W wide, height matched to the element's aspect so
 * nothing letterboxes) scaled up crisply by CSS `image-rendering: pixelated`,
 * with its own rAF loop. Same approach as cozy_sprites' habitat.
 *
 * The screen is three bands, and the split is the whole point of the rework:
 * the middle band is the **mill** — every producer you own has a silhouette out
 * there, and broken kit is visibly broken — and the front band is the **hoard**,
 * the puppies you're actually holding, piled in the yard. Spend and the yard
 * shrinks; leave the tab open and it grows. Two numbers that used to be text.
 *
 * RENDERING RULE (inherited, and it matters): every blit is integer-aligned and
 * unscaled. No ctx.scale/rotate on any sprite. At this buffer size a fractional
 * transform resamples the art off the pixel grid and 1px outlines double or
 * vanish. Animation is translation only.
 */

import type { solo } from "@mill/sim";

import {
  WAGON,
  CLOUD,
  CRATE,
  SORTER,
  BALL,
  BOWL,
  BOWL_RED,
  BUNTING,
  FENCE,
  FLAG,
  HEART,
  growthStages,
  FLOWERS,
  LAMP,
  LAMP_ON,
  PACK_COATS,
  PACK_POSES,
  PUPPY_SPRITE,
  PRODUCER_MARKS,
  BASKET,
  KENNEL,
  shrunk,
  STACK,
  TREE,
  TUFT,
  scruffy,
} from "./art.js";
import { artCanvas, artTinted, type Art } from "./pixel.js";

export const SCENE_W = 176;

const YARD_SHARE = 0.23; // the hoard yard, front band — deep enough to stand a crate stack in
const FIELD_SHARE = 0.46; // the working field
const MIN_SKY = 20;

/** The shared outline ink, for the bits of the scene drawn as rects not art. */
const INK = "#402e3a";

/**
 * The flesh, at its two extremes.
 *
 * All that's left of it out here is the stain that creeps across the sky as the
 * Convergence gets close — the ceiling itself is somewhere else now, and this
 * has to be the exact colour of it or the omen is promising the wrong thing.
 * `insideScene.ts` keeps its own copy of both, because that's where the flesh
 * actually lives.
 */
const FLESH_LIT = "#ecd9a6";
const FLESH_DEEP = "#7d5330";

/**
 * The ground, and the biggest single reason this stopped looking like a farm.
 *
 * It used to be grass over ploughed dirt, which is the right pair of colours
 * for somewhere that grows things and the wrong pair for somewhere that keeps
 * animals. A working kennel yard is hard standing: compacted gravel where the
 * runs are, because grass under sixty dogs lasts about a week, and a poured
 * concrete apron at the front where everything gets hosed down.
 *
 * Warm stone rather than the cold grey this started as, which lasted exactly
 * one screenshot: a grey yard under a grey fence beside grey plant is a car
 * park, and the dogs were the only thing in the picture with any warmth in it.
 * Warming the ground and lightening the apron keeps the contrast that made the
 * pack legible — they're still the darkest warm thing out here — and stops the
 * yard being somewhere you'd rather not be.
 *
 * The hills behind stay green on purpose. Neutral all the way to the horizon
 * reads as an institution; a compound sitting in green country reads as
 * something somebody put there, which is the joke.
 */
const GRAVEL = "#c6bda6";
const GRAVEL_DARK = "#b0a68f";
const CONCRETE = "#d8cfb8";
const CONCRETE_DARK = "#b4ab95";

/** What the scene needs to know. Everything else stays in the sim. */
export interface MillView {
  /** Working (unbroken) count per producer. */
  working: Partial<Record<solo.SoloProducerId, number>>;
  /** Broken count per producer — drawn, greyed out, right where it stands. */
  broken: Partial<Record<solo.SoloProducerId, number>>;
  /**
   * How many of a producer's three upgrades you own, 0-3. Picks which mark of
   * that tier gets drawn — spending on a tier changes something out in the
   * field, not just a number in a panel. Mark 3 is the hundred-owned one, and
   * the only one the scene draws extra effects for.
   */
  marks: Partial<Record<solo.SoloProducerId, number>>;
  /** 0..1. Drags the field's colour and wilts a share of the pup. */
  bedding: number;
  /** Puppies on hand. Drives the whole yard. */
  hoard: number;
  /** Stable across reloads, so the mill's layout is *your* mill's layout. */
  seed: string;
  /**
   * How close the horizon is to closing, 0..1. The flesh starts bleeding
   * through the sky from the first Chihuahua Singularity, so the fold arrives
   * rather than happening to you.
   *
   * Back to zero once it *has* closed. The Convergence used to replace this
   * sky with a ceiling; it opens a second mill now, and this one goes back to
   * being the mill with the weather on it — so the stain is a warning about
   * something coming, and once it has come there's nothing left to warn about.
   */
  looming: number;
  /**
   * How many mills you've handed down. The Chorus is the only thing on the
   * canvas that knows about the meta-layer, and it's the reason the meta-layer
   * is visible in the picture at all.
   */
  generation: number;
}

export const EMPTY_VIEW: MillView = {
  working: {},
  broken: {},
  marks: {},
  bedding: 1,
  hoard: 0,
  seed: "0",
  looming: 0,
  generation: 1,
};

// ---------------------------------------------------------------------------
// Time of day. The mill runs on the wall clock, so the sky should too.
// ---------------------------------------------------------------------------

type Phase = "day" | "dusk" | "night";

/**
 * Evening runs late on purpose. Sunset at six and full dark at eight is honest
 * for a November afternoon and wrong for the hours anyone actually plays in —
 * open the mill after dinner and the sky had already packed up. The light holds
 * through the evening now and only goes properly out at ten.
 */
function phaseNow(): Phase {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return "night";
  if (h < 7 || h >= 20) return "dusk";
  return "day";
}

/**
 * Softer than it was, and the daytime row is the one that matters — it's what
 * the game looks like for seventeen hours out of twenty-four.
 *
 * The old blue and green were a shade under a proper saturated primary each,
 * which is right for a picture that wants to look like farmland and wrong for
 * one that wants to look like somewhere you'd keep a puppy. Lifting the value
 * and dropping the saturation on both puts the country in the background where
 * it belongs and leaves the strongest colour in the picture on the things that
 * matter: the dogs, the bunting and the bowls.
 */
const SKY: Record<Phase, { top: string; bottom: string; hill: string; hillFar: string }> = {
  day: { top: "#a6ddf5", bottom: "#dcf1f7", hill: "#7cbc60", hillFar: "#9dd07e" },
  dusk: { top: "#5a5694", bottom: "#f6bb8e", hill: "#4d7a45", hillFar: "#628a55" },
  night: { top: "#232549", bottom: "#403a6c", hill: "#2b4632", hillFar: "#35503b" },
};

/** What the dark is made of, and what the lamp puts back. */
const NIGHT = "#141630";
const LAMP_LIGHT = "#ffdb8a";

/**
 * How far down the light goes, per phase — over the field, and over the yard.
 *
 * The yard used to be exempt outright: the dimming pass stopped dead at the
 * fence line and the bottom fifth of a 2am mill was as bright as noon. That was
 * the right *instinct* — the hoard is the thing you came back to look at — and
 * the wrong execution, because nothing in the picture accounted for it. So the
 * yard goes dark too now, just less, and what makes up the difference is a lamp
 * you can see, throwing a pool you can see the edge of.
 */
const DARKNESS: Record<Phase, { field: number; yard: number }> = {
  day: { field: 0, yard: 0 },
  dusk: { field: 0.22, yard: 0.13 },
  night: { field: 0.46, yard: 0.31 },
};

/**
 * Where the lamp post stands, how far its light carries, and how wide the cone
 * under it opens by the bottom of the screen.
 *
 * `LAMP_X` is picked to stand just clear of the mound, because the mound is the
 * thing the light is for — the hoard is what you came back to look at, and a
 * lamp at the far end of the yard from it would be a lamp lighting the crates.
 */
const LAMP_X = 46;
const LAMP_REACH = 96;
const LAMP_SPREAD = 52;

/**
 * The ridges, farthest first: how far above the horizon each one crests, and
 * how much it rolls doing it.
 *
 * There used to be two, both low, and between them they took up the bottom
 * quarter of a sky that is otherwise the emptiest part of the picture. There
 * are three now, and they're up where you can see them, because they stopped
 * being decoration: the deep end of every lot stands on them. Land you can't
 * see is land nothing can be built on.
 *
 * The upper two share a period and a phase so they run parallel, eleven pixels
 * apart, which is what guarantees a building on the upper one clears the roof
 * of the building on the lower one. The near one is on its own phase, because a
 * third parallel copy reads as a printing error rather than as hills.
 */
interface Ridge {
  amp: number;
  base: number;
  phase: number;
}

const RIDGES: Ridge[] = [
  { amp: 4, base: 40, phase: 5 },
  { amp: 4, base: 29, phase: 5 },
  { amp: 4, base: 19, phase: 7 },
];

/** Sky the ridges need at full height. Less than this and they flatten out. */
const RIDGE_ROOM = 56;

/** How far above the horizon a ridge stands at `x`, given the sky it's got. */
function ridgeAt(ridge: Ridge, x: number, scale: number): number {
  return Math.round(scale * (ridge.base + ridge.amp * Math.cos((2 * Math.PI * x) / 61 + ridge.phase)));
}

// ---------------------------------------------------------------------------
// Deterministic jitter — a mill's layout shouldn't reshuffle on every render.
// ---------------------------------------------------------------------------

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** The fractional part, always positive. Used for cheap per-index hashing. */
export function fract(x: number): number {
  return ((x % 1) + 1) % 1;
}

/**
 * Blend two `#rrggbb` colours, and return `#rrggbb` so the result can be fed
 * straight back in. It used to return `rgb(...)`, which parses as NaN on the way
 * back through and silently leaves the canvas on its previous fillStyle — the
 * ceiling spent an afternoon looking like smog because of it.
 */
export function mix(a: string, b: string, k: number): string {
  const hex = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => {
    const c = Math.round(hex(a, i) + (hex(b, i) - hex(a, i)) * k);
    return clamp(c, 0, 255).toString(16).padStart(2, "0");
  });
  return `#${out.join("")}`;
}

/** `#rrggbb` at an alpha, for the one place that needs a translucent stop. */
export function rgba(hex: string, alpha: number): string {
  const c = [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// The hoard
// ---------------------------------------------------------------------------

/**
 * The pack: every puppy you're holding, out in the yard being a puppy.
 *
 * This replaced a heap — a literal pyramid of sprites, sixty-five of them,
 * stacked front-left and running off the corner. That shape is the right one
 * for a hoard of *objects* and the wrong one for a hoard of animals: what it
 * actually drew was a pile of bodies, and no amount of palette work was going
 * to fix that. The number the yard is about didn't change; what changed is that
 * it's now a count of things that are alive.
 *
 * The trade is real and worth naming. A heap is free — blits into cached slots,
 * no state — and a pack is dozens of agents that have to be stepped, bounded
 * and depth-sorted every frame. It buys the one thing the scene most needed:
 * the yard is no longer the only part of the picture that doesn't move.
 *
 * The cap came down from sixty-five when the sprite got chunkier. That's not a
 * performance number, it's a legibility one: a fixed band of yard holds a fixed
 * number of *readable* dogs, and past it they stop being a crowd and become a
 * texture. Sixty-five eleven-pixel puppies in a thirty-pixel band is a rug.
 */
export const PACK_CAP = 44;

/** How far in from each edge a puppy will wander before turning round. */
export const PACK_LEFT = 2;
export const PACK_RIGHT = SCENE_W - 12;

/**
 * Where the slide and the pipeline set a puppy down.
 *
 * Off to the left, where both of the yard's deliveries already aimed, so
 * arrivals keep landing in the corner they always landed in — and then trot
 * out of it, which is the difference.
 */
const DROP_X = 16;

/** How much of the yard's depth the pack spreads over, back to front. */
const PACK_SPILL = 4;

/** Trot speed, buffer pixels a second. Slow: they have nowhere to be. */
export const PACK_WALK = [7, 18] as const;

/** Bunting pitch along the fence. */
const FLAG_STEP = 7;

/**
 * Where the water bowls stand, as x and a fraction of the yard's depth.
 *
 * Hand-placed and permanent, unlike everything else in the yard, which arrives
 * on a threshold. A bowl isn't a thing you unlock — it's a thing that has
 * always been there, and the yard needs at least one prop that was.
 */
const BOWLS: readonly { x: number; d: number }[] = [
  { x: 44, d: 0.28 },
  { x: 118, d: 0.62 },
  { x: 86, d: 0.9 },
];

/**
 * The ball.
 *
 * There is exactly one and it never leaves, which is the point: a yard with a
 * ball rolling around it and a dog going after the ball is doing something,
 * and a yard where sixty dogs each have a ball is a ball pit.
 *
 * It's thrown rather than simulated — an arc from wherever it is to somewhere
 * else, and then it sits until somebody gets to it. Rolling it properly would
 * need collision against the props and the pack, which is a lot of frame time
 * to spend on a joke.
 */
interface Ball {
  x: number;
  y: number;
  /** Where it's headed, and when it set off and lands. */
  tx: number;
  ty: number;
  from: number;
  to: number;
  /** The dog that went after it, if one has. */
  chaser: PackPup | null;
}

/** Pixels of ground per animation frame. Ties the step to the walk, not the clock. */
export const PACK_STRIDE = 5;

/**
 * One puppy, doing one thing until it decides to do another.
 *
 * `walked` rather than a clock phase is what stops sixty dogs stepping in
 * unison: the frame comes off distance travelled, and they're all travelling at
 * different speeds.
 */
export interface PackPup {
  x: number;
  /** Its feet, which is also its depth — the yard is drawn back to front on it. */
  y: number;
  /**
   * The bit of yard it considers its own, and the reason the yard fills evenly.
   *
   * Without it the pack is a pure random walk, and a random walk *remembers
   * where it started*: everything arrives at the drop in the left corner, and
   * diffusing out of a corner across a hundred and sixty pixels at eleven
   * pixels a second takes longer than anyone looks at the screen. Two goes at
   * fixing that by choosing better spawn positions both failed, because the
   * spawn isn't the problem — the walk is.
   *
   * Handed out uniformly across the yard whatever the dog's spawn position is,
   * and only ever a lean rather than a leash: a puppy heads roughly homeward
   * most of the time and wanders off it the rest, so the yard stays evenly
   * populated without anybody standing on a mark.
   */
  home: number;
  vx: number;
  vy: number;
  doing: "trot" | "stand" | "sit" | "zoom" | "flop";
  /** Scene clock, in seconds, at which it picks something else. */
  until: number;
  walked: number;
  coat: number;
  /** On its way out of the gate because you spent it. Doesn't turn round. */
  leaving: boolean;
}

/**
 * What a puppy does next, and for how long.
 *
 * Weighted so most of the yard is standing still at any one moment. Sixty
 * dogs all trotting is a screensaver; sixty dogs where a dozen are moving is
 * a yard, and the dozen read as individuals because the rest aren't.
 */
export function pickAction(dog: PackPup, t: number): void {
  if (dog.leaving) {
    dog.until = t + 60;
    return;
  }
  const roll = Math.random();
  if (roll < 0.03) {
    // Zoomies. One dog in thirty decides, for no reason, to go flat out in a
    // straight line for two seconds.
    //
    // It's a third of a percent of the yard at any moment and it is the single
    // most-noticed thing on the screen, because everything else out here moves
    // at a walk. A picture where nothing is ever in a hurry reads as a diorama;
    // one thing sprinting through it every few seconds reads as alive.
    dog.doing = "zoom";
    dog.vx = (Math.random() < 0.5 ? -1 : 1) * 64;
    dog.vy = 0;
    dog.until = t + 0.9 + Math.random() * 1.1;
  } else if (roll < 0.44) {
    dog.doing = "trot";
    // Homeward, and how insistently depends on how far off it is. A long way
    // out it always heads back and at a fair clip, which is what disperses a
    // delivery: everything the chute drops lands in the same corner, so without
    // this a busy mill piles its whole yard into the bottom left and leaves the
    // rest of the concrete empty. Near enough to home it's two times in three
    // and ambling, because a pack that always walks straight at a mark settles
    // into sixty stationary dots.
    const away = dog.home - dog.x;
    const far = Math.abs(away) > 24;
    const dir = far || (Math.random() < 0.68 && Math.abs(away) > 6)
      ? Math.sign(away)
      : Math.random() < 0.5
        ? -1
        : 1;
    const pace = far ? 1.6 : 1;
    dog.vx = dir * pace * (PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]));
    // A tenth of the sideways speed: the yard is about four dogs deep, and
    // anything faster crosses it before you've registered which way it went.
    dog.vy = (Math.random() - 0.5) * 4;
    dog.until = t + 0.7 + Math.random() * 2.2;
  } else if (roll < 0.70) {
    dog.doing = "sit";
    dog.until = t + 1.4 + Math.random() * 3.4;
  } else if (roll < 0.86) {
    // Flopped, and for a good while. A puppy that lies down for one second is
    // a puppy that changed its mind; the pose only reads as *settled* if it
    // outlasts a couple of the walks going on around it.
    dog.doing = "flop";
    dog.until = t + 4 + Math.random() * 7;
  } else {
    dog.doing = "stand";
    dog.until = t + 0.6 + Math.random() * 1.8;
  }
}

/**
 * The yard doesn't count your puppies. It shows what you've built with them.
 *
 * Two earlier goes at this both counted, and counting is the problem. Place
 * value emptied the whole yard every time you crossed a power of ten. Rows of
 * units fixed that but replaced it with a bar chart: forty identical sprites
 * where the only difference between a millionaire and a billionaire was three
 * more crates in the same strip.
 *
 * So: a build-out. The yard passes through a fixed sequence of stages, each
 * arriving at a threshold and each *adding one thing* to a spot that is its
 * spot forever — a basket, then another, then a crate, a wagon, a kennel, a crate stack,
 * eventually a sorting tower standing over the fence line. You don't read the
 * yard, you recognise it. Between stages the working heap grows, so there's
 * always something moving, and it's the heap that gets hauled into whatever
 * arrives next.
 *
 * Thresholds are roughly one stage per four-and-a-bit times richer. That's
 * granular enough that clearing out your bank for an upgrade visibly costs you
 * a building or two, and you watch them come back.
 */
interface Prop {
  art: Art;
  /** Left edge, in buffer pixels. */
  x: number;
  /** Which depth station it stands on: 0 is the front edge of the yard. */
  row: number;
}

interface Stage {
  /** Puppies on hand at which this stage arrives. */
  at: number;
  /** How big the pack grows before the next stage gives it somewhere to be. */
  pack: number;
  /** The one thing this stage puts in the yard. The early stages are heap only. */
  add?: Prop;
}

const p = (art: Art, x: number, row: number): Prop => ({ art, x, row });

/**
 * The build-out, in order. Positions are hand-placed rather than generated:
 * the right of the yard is the working end (baskets, crates, kennels), the left is
 * the heap with the tall stuff standing behind it.
 *
 * That way round because the heap is where everything lands, and everything
 * lands on the left — the pipeline comes down the west side and the trough
 * empties towards it. A mound in the opposite corner from the two chutes
 * feeding it was the yard's oldest lie.
 *
 * It runs out at around a hundred trillion, which is past the last thing on the
 * price list. A yard with everything in it is a fine place for the ladder to
 * stop.
 */
export const YARD: Stage[] = [
  { at: 0, pack: 5 },
  { at: 5, pack: 13 },
  { at: 16, pack: 21 },
  { at: 45, pack: 29 },
  { at: 110, pack: PACK_CAP },
  { at: 200, pack: PACK_CAP, add: p(BASKET, 159, 0) },
  { at: 900, pack: PACK_CAP, add: p(BASKET, 145, 0) },
  { at: 4e3, pack: PACK_CAP, add: p(CRATE, 159, 1) },
  { at: 2e4, pack: PACK_CAP, add: p(WAGON, 127, 0) },
  { at: 8e4, pack: PACK_CAP, add: p(BASKET, 113, 0) },
  { at: 3e5, pack: PACK_CAP, add: p(CRATE, 141, 1) },
  { at: 1.5e6, pack: PACK_CAP, add: p(KENNEL, 141, 2) },
  { at: 6e6, pack: PACK_CAP, add: p(STACK, 73, 3) },
  { at: 3e7, pack: PACK_CAP, add: p(CRATE, 123, 1) },
  { at: 1.2e8, pack: PACK_CAP, add: p(BASKET, 97, 0) },
  { at: 5e8, pack: PACK_CAP, add: p(STACK, 57, 3) },
  { at: 2e9, pack: PACK_CAP, add: p(CRATE, 105, 1) },
  { at: 1e10, pack: PACK_CAP, add: p(SORTER, 105, 3) },
  { at: 4e10, pack: PACK_CAP, add: p(CRATE, 87, 1) },
  { at: 2e11, pack: PACK_CAP, add: p(STACK, 41, 3) },
  { at: 8e11, pack: PACK_CAP, add: p(CRATE, 69, 1) },
  { at: 3e12, pack: PACK_CAP, add: p(KENNEL, 109, 2) },
  { at: 1.5e13, pack: PACK_CAP, add: p(STACK, 25, 3) },
  { at: 6e13, pack: PACK_CAP, add: p(SORTER, 129, 3) },
  { at: 2.5e14, pack: PACK_CAP, add: p(CRATE, 51, 1) },
  { at: 1e15, pack: PACK_CAP, add: p(KENNEL, 77, 2) },
  { at: 4e15, pack: PACK_CAP, add: p(BASKET, 81, 0) },
  { at: 1.5e16, pack: PACK_CAP, add: p(STACK, 10, 3) },
  { at: 6e16, pack: PACK_CAP, add: p(SORTER, 153, 3) },
  { at: 2.5e17, pack: PACK_CAP, add: p(WAGON, 63, 0) },
];

interface YardLayout {
  /** Index into YARD. Everything up to and including it is standing. */
  stage: number;
  /** Puppies loose in the yard, 0..the stage's cap. */
  pack: number;
}

/**
 * How many stay out in the yard after a stage arrives and the rest go into it,
 * as a fraction of the cap. Not zero: a mill making thousands a second should
 * never have one puppy and a kennel in the yard, which is what emptying it at
 * every threshold used to look like.
 */
const PACK_KEEP = 0.4;

/**
 * How the yard refills between one stage and the next. Well under 1, so most of
 * the pack is back within the first slice of the stage and the long tail is
 * spent topping it up — the yard should read as busy most of the time and only
 * be conspicuously thin right after something took half of them indoors.
 */
const PACK_EASE = 0.5;

export function yardLayout(amount: number): YardLayout {
  const a = Math.max(0, amount);
  let stage = 0;
  while (stage + 1 < YARD.length && a >= YARD[stage + 1]!.at) stage++;

  const here = YARD[stage]!;
  const next = YARD[stage + 1];
  let frac = 1;
  if (next) {
    // The first stage counts puppies; every stage after it counts magnitudes,
    // because that's the only scale on which the later ones are the same size.
    frac =
      stage === 0
        ? a / next.at
        : (Math.log10(a) - Math.log10(here.at)) / (Math.log10(next.at) - Math.log10(here.at));
  }
  frac = Math.max(0, Math.min(1, frac));

  // Where the mound starts this stage. A stage that put something in the yard
  // was built out of the pile, so the pile starts low; a stage that only made
  // room for a bigger mound picks up exactly where the last one left off, so
  // the early game is one unbroken climb rather than four resets to nothing.
  const from = stage === 0 ? 0 : here.add ? Math.round(here.pack * PACK_KEEP) : YARD[stage - 1]!.pack;
  const grow = stage === 0 ? frac : Math.pow(frac, PACK_EASE);
  const pack = from + Math.floor((here.pack - from) * grow);
  return { stage, pack: Math.max(0, Math.min(here.pack, pack)) };
}

function sameLayout(a: YardLayout, b: YardLayout): boolean {
  return a.stage === b.stage && a.pack === b.pack;
}

/**
 * A handful of puppies being carried into the unit they just added up to, or
 * a unit coming apart because you spent it. Short-lived, purely cosmetic, and
 * the only thing on this canvas that interpolates a position — it still lands
 * on whole pixels.
 */
interface Bundle {
  art: Art;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  dur: number;
  /** Rises and fades instead of travelling. Used for puppies you spent. */
  poof: boolean;
}

/**
 * Somebody moving the hoard about by hand.
 *
 * A crate doesn't appear in the yard because a number went up, it appears
 * because the pile got bagged and carried into it. So every stage change now
 * has a person in it: out from the mound with a basket on the shoulder, tip it
 * in, walk back for the next one — and when you spend the yard back down, the
 * same walk in reverse, off out of the gate with what you paid.
 */
interface Porter {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  /** How long the loaded leg takes. The empty leg back takes the same. */
  walk: number;
  /** Comes home empty afterwards. False for a load that's leaving for good. */
  home: boolean;
}

/** Yard pace, buffer pixels a second. Slower than the field: it's heavy. */
const PORTER_SPEED = 24;
/** How long they stand at the far end tipping the basket in. */
const PORTER_TIP = 300;

// ---------------------------------------------------------------------------
// Producer placement
// ---------------------------------------------------------------------------

/**
 * The tiers this scene draws, which is the outside mill and only that.
 *
 * Everything inside the nest has its own picture — see `insideScene.ts`. So
 * does the ceiling that used to come down over this one: the Convergence opens
 * a second place rather than repainting this one, and a mill you can walk back
 * out to is a mill with its sky still in it.
 */
type OutsideId = Extract<
  solo.SoloProducerId,
  | "pen"
  | "hand"
  | "heatlamp"
  | "van"
  | "groomer"
  | "lab"
  | "kibble"
  | "tower"
  | "zeppelin"
  | "reactor"
  | "orbital"
  | "singularity"
>;

/** A producer flying, driving or standing somewhere specific. */
type Band = "sky" | "back" | "field" | "walk";

interface Placement {
  band: Band;
  /** How many of the thing ever appear, however many you own. */
  cap: number;
  /** Drives across the field rather than standing in it. */
  speed?: number;
  /**
   * How fast the drawn count climbs with the owned count. A long run buys a
   * hundred and forty kennel hands and only fifty orbital kennels, so the tiers you
   * stack deepest need the shallowest curve to keep looking different at
   * twenty, fifty and a hundred.
   */
  spread?: number;
}

const PLACEMENT: Record<OutsideId, Placement> = {
  // The pup doesn't use the log curve — the field draws a bed per pen until
  // the land is full — so its cap is only the ceiling on broken ones.
  pen: { band: "field", cap: 108 },
  hand: { band: "walk", cap: 16, spread: 3 },
  heatlamp: { band: "field", cap: 12, spread: 2.6 },
  // Slow. A van that crosses the screen in fifteen seconds is a van
  // working a field; one that does it in five is a toy being pushed along.
  van: { band: "field", cap: 6, spread: 1.4, speed: 6 },
  groomer: { band: "field", cap: 5, spread: 1.2, speed: 4.5 },
  lab: { band: "back", cap: 5 },
  kibble: { band: "back", cap: 5 },
  tower: { band: "back", cap: 5 },
  zeppelin: { band: "sky", cap: 5, spread: 1.6, speed: 2.5 },
  reactor: { band: "back", cap: 4 },
  orbital: { band: "sky", cap: 4, spread: 1.4, speed: 7 },
  singularity: { band: "sky", cap: 3, spread: 1.2 },
};

/**
 * What a hundred-owned tier throws light in.
 *
 * The fourth mark is the only upgrade in the game that does anything to the
 * scene beyond its own silhouette, and this is it: **primed kit is lit**. One
 * rule, applied in every band, because that's what makes it read — a mill three
 * tiers deep into hundred-marks is glowing in six places at once, and after dark
 * it's the only thing keeping the field visible.
 *
 * Colours are per-tier and near enough to what the sprite is already made of
 * that the light looks like it came off the thing: the kibble burns orange,
 * the reactor and the towers run cold, the singularity's is the gold its fourth
 * mark's jet is drawn in.
 */
const PRIME_GLOW: Record<OutsideId, string> = {
  pen: "#a8f07a",
  hand: "#ffd782",
  heatlamp: "#8ec9e6",
  van: "#ff8a4a",
  groomer: "#ffe08a",
  lab: "#c88fe6",
  kibble: "#f0913c",
  tower: "#a8f07a",
  zeppelin: "#ffe066",
  reactor: "#fff0b8",
  orbital: "#a4e884",
  singularity: "#ffe08a",
};

const ORDER: OutsideId[] = [
  "pen",
  "hand",
  "heatlamp",
  "van",
  "groomer",
  "lab",
  "kibble",
  "tower",
  "zeppelin",
  "reactor",
  "orbital",
  "singularity",
];

// ---------------------------------------------------------------------------
// The back edge, in depth
// ---------------------------------------------------------------------------

/**
 * The property doesn't stop at the skyline: it runs back from it.
 *
 * The back edge used to be one row of the last few things you'd bought, and
 * when the row filled up the *lowest* tiers were shifted off the left and gone
 * — so the reward for buying a fusion reactor was your nest labs being
 * demolished, and every mill past the middle of the ladder looked like the same
 * four buildings.
 *
 * It's a *plan* now. Each of the four back tiers owns a lot, in tier order,
 * from the first frame — so a tier arrives where it was always going to stand
 * and nothing already up there moves. One of it stands at the front of its lot
 * at full size, forever, which is what you watch change as you buy that tier's
 * upgrades. Everything else you own of it is built up the lot behind: two at a
 * time, half size, stepping back and up the hillside, and at the counts you
 * only reach on a long run, out onto the ridges themselves.
 *
 * So the lot's *depth* is the count, and it's read the way the yard is read —
 * recognised, not counted. Ten of something, fifty and a hundred are three
 * visibly different lots, and none of them is ever nothing.
 */
interface LotRow {
  /** Where in the lot each one stands, as fractions of the lot's width. */
  at: number[];
  /** The ridge it stands on — where the counts you only reach late go. */
  ridge?: number;
  /**
   * Which pass draws it. Higher is nearer: the deep rows are interleaved with
   * the ridges so each ridge buries the feet of whatever's on the one behind,
   * and the top layer is the building out front.
   */
  layer: number;
  /** Half size, and how much of the distance is drawn over it. */
  far: boolean;
  haze: number;
}

/**
 * The lot, front row first. Two at a time behind the one out front, so a lot
 * grows evenly either side of it rather than lopsidedly.
 *
 * The files zigzag rather than running straight back. Two clean columns is what
 * the first go did, and with a tall tier — the Vertical Mill is forty pixels of
 * building, twenty when it's halved — each column overlapped itself into a
 * single unbroken shaft, so a lot of ten towers read as three very tall ones.
 * Off-setting every row sideways keeps them reading as separate buildings on a
 * hillside however tall they are.
 */
const LOT_ROWS: LotRow[] = [
  { at: [0.5], layer: 5, far: false, haze: 0 },
  { at: [0.2, 0.8], layer: 4, far: true, haze: 0.14 },
  { at: [0.31, 0.69], layer: 3, far: true, haze: 0.26 },
  { at: [0.15, 0.85], ridge: 2, layer: 2, far: true, haze: 0.34 },
  { at: [0.28, 0.72], ridge: 1, layer: 1, far: true, haze: 0.42 },
  { at: [0.38, 0.62], ridge: 0, layer: 0, far: true, haze: 0.5 },
];

/** The rows flattened into the order they're filled in. */
const LOT = LOT_ROWS.flatMap((row, r) => row.at.map((at) => ({ ...row, at, row: r })));

/**
 * How much ground a row is set back from the one in front, as a share of the
 * building's own height. Held to a floor so a squat tier still steps back.
 */
const LOT_STEP = 0.55;
const LOT_STEP_MIN = 6;

/** The tiers with a lot, left to right. Fixed, so a lot is a lot forever. */
const BACK_TIERS = ORDER.filter((id) => PLACEMENT[id].band === "back");

/** A tier's lot, as laid out this frame. */
interface Lot {
  id: OutsideId;
  /** Whichever mark of it you're running. */
  art: Art;
  /** Left edge and width, in buffer pixels. */
  x: number;
  w: number;
  /** How many of `LOT`'s slots are filled, and how many of those are dead. */
  depth: number;
  dead: number;
  /** Empty, but staked out: the next tier's ground, waiting for it. */
  pad: boolean;
  /** Where each row's feet stand, so a row is a terrace and not a contour. */
  ground: number[];
}

/**
 * How far back a lot is built, given how many of the tier you own.
 *
 * Log, like everything else that has to survive counts running into the
 * hundreds: the first one is the building out front, and after that it takes a
 * bit over half a doubling to add another. Ten, fifty and a hundred come out at
 * five, nine and ten — three lots you can tell apart across the room, which is
 * the only test this has to pass.
 */
export function lotDepth(owned: number): number {
  if (owned <= 0) return 0;
  return Math.min(LOT.length, 1 + Math.floor(Math.log2(owned) * 1.45));
}

/**
 * How many of a tier to actually draw. Counts run to hundreds and the field
 * holds a couple of dozen things before it's soup, so the mapping is
 * logarithmic: the first few are one-for-one and after that it takes a
 * doubling to add another silhouette.
 */
function shownCount(owned: number, cap: number, spread = 2.4): number {
  if (owned <= 0) return 0;
  if (owned <= 4) return Math.min(owned, cap);
  return Math.min(cap, 4 + Math.floor(Math.log2(owned / 4) * spread));
}

// ---------------------------------------------------------------------------

/**
 * How a puppy gets from where it was made to where it's kept.
 *
 * There used to be one answer to this and it was ballistics: everything on the
 * mill threw its puppies at the yard on a parabola, and a busy mill looked
 * like a hailstorm. Nothing on a mill moves like that. So every tier now has
 * plumbing instead — the machines auger into a trough, the kennels pipe it down,
 * the hands carry it — and the only thing that leaves the ground unassisted is
 * the one you whistled up yourself.
 */

/** A puppy on a chute or an auger: straight line, constant speed, no arc. */
interface Haul {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  dur: number;
  /**
   * On a slide rather than in a pipe: picks up speed on the way down and
   * kicks up dirt where it lands. A puppy on an auger is being pushed at a
   * constant rate; a puppy on a chute is falling.
   */
  slide?: boolean;
}

/** A puppy inside the pipeline, measured as distance travelled along it. */
interface Lump {
  /** Where on the horizontal run it was fed in. */
  from: number;
  d: number;
}

/** A puppy you turned up yourself: out of the bedding, and gone into the basket. */
interface Whistled {
  x: number;
  y: number;
  born: number;
}

/**
 * Dust, steam and water: the small stuff that says a machine is running rather
 * than parked. One pixel each, no sprite, no transform — cheap enough that
 * every tier can have some without the frame budget noticing.
 */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dur: number;
  color: string;
  size: number;
}

const MAX_PUFFS = 40;

/**
 * A billow of steam off a cooling tower. Fatter, slower and longer-lived than a
 * puff, and it grows as it climbs — a reactor's plume is the biggest thing on
 * the property and it should be drawn like weather, not like exhaust.
 */
interface Plume {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  dur: number;
  size: number;
}

const MAX_PLUMES = 80;

/** How long a whistled puppy sits in the open before it's counted and gone. */
const WHISTLED_MS = 850;

/**
 * How much the trough holds before the machines are just tipping it over.
 * Small on purpose: the level is drawn in six pixels, so a cap much past this
 * means the first few puppies in there round away to nothing showing.
 */
const TROUGH_CAP = 12;

/**
 * Seconds between puppies going down the trough's spout, when the trough is
 * empty. A full one empties four times faster, which is what stops the level
 * from either pinning at the brim or never showing anything in there at all —
 * it settles wherever the machines above it are actually keeping it.
 */
const TROUGH_DRAIN = 0.8;

/** Buffer pixels a second, for a puppy in the pipeline. */
const PIPE_SPEED = 40;

/**
 * How long the pipeline takes to build, in seconds.
 *
 * Second only to the fold, and deliberately so. This is the moment the mill
 * stops being a field with people in it and becomes an industrial concern —
 * the single biggest change to the picture that isn't the horizon closing — and
 * it used to arrive between two frames, fully welded, because a number went up.
 */
const PIPE_BUILD_S = 3.4;

/** How long one building takes to go up on its lot, in seconds. */
const RAISE_S = 1.5;

/** Scaffolding, which is the one thing on the mill that is meant to look cheap. */
const SCAFFOLD = "#b8a37a";

const MAX_HAULS = 24;

/** Beds a machine takes on board before it tips a basket out at the headland. */
const MACHINE_LOAD = 5;
/** What one of those baskets is worth when a hand tips it into the trough. */
const BASKET_WORTH = 3;
/** Baskets that can be waiting at once. Past this the machines hold their load. */
const MAX_BASKETS = 9;
const MAX_LUMPS = 64;

/** The angled run at the bottom of the pipeline, in pixels across and its fall. */
const CHUTE_LEN = 14;
const CHUTE_SLOPE = 0.7;

/** How long a building takes to come out of the ground, or to go back into it. */
const BUILD_MS = 520;

/**
 * How much of an arriving building is still underground, in pixels, `age`
 * milliseconds in. Rising eases out so it lands rather than stops; sinking is
 * linear, because something you can no longer afford shouldn't linger.
 */
export function buildHidden(age: number, up: boolean, height: number): number {
  const t = Math.max(0, Math.min(1, age / BUILD_MS));
  const shown = up ? 1 - (1 - t) * (1 - t) : 1 - t;
  return Math.round((1 - shown) * height);
}

// ---------------------------------------------------------------------------
// The pup cycle, and the people who work it
// ---------------------------------------------------------------------------
//
// The mill is scenery, not a readout. None of what follows is derived from your
// production rate and none of it feeds back into it — the field grows on its
// own clock and the hands walk at their own pace whether you're making twelve
// puppies a second or twelve trillion. What it's for is having somewhere to
// look: a mill that idles is still a mill doing something.

/** How long a bed takes to come up. Long, on purpose — this is a place, not a slot machine. */
const GROW_SECONDS = 46;

/** How long a ready bed stands before the mill gets to it without you watching. */
const RIPE_SECONDS = 14;

/** Buffer pixels a second. A kennel hand crosses the field in about five. */
const HAND_SPEED = 19;
const PICK_SECONDS = 1.8;
const REST_SECONDS = 2.4;

/**
 * One kennel hand, working. They pick the bed that's been ready longest, carry it
 * down to the yard, drop it on the pile and walk back for another.
 */
interface Hand {
  x: number;
  y: number;
  /** Where in the yard this one unloads. Spread out, so they don't queue. */
  home: number;
  /** The depth it stands at when it's home — ranks, so a big crew isn't a line. */
  homeY: number;
  /** Where it's ambling to while it has nothing to do. */
  loiter: { x: number; y: number };
  /** The row it works by preference, so the crew covers the field. */
  rowPref: number;
  state: "resting" | "out" | "picking" | "back" | "fetch" | "hauling";
  /** Index into the drawn beds. -1 while resting. */
  target: number;
  /** Id of the basket it's been sent for, or -1. */
  basket: number;
  /** Wall time at which a timed state ends. */
  until: number;
  carrying: "none" | "puppy" | "basket";
}

/**
 * A machine's load, tipped out at the end of the row for somebody to deal with.
 *
 * The machines used to auger straight into the trough from wherever they stood,
 * which meant the puppy left the grooming rig as a thrown object and crossed forty
 * pixels of open air. This is the same journey with the work put back in: the
 * grooming rig fills, tips a basket at the headland, and a hand walks out for it.
 */
interface Basket {
  id: number;
  x: number;
  y: number;
  /** Wall clock at the drop, so it can land rather than appear. */
  born: number;
}

/** One pup in a row, as drawn this frame. Ground point, not top-left. */
interface Bed {
  x: number;
  y: number;
  /** Which pup row it stands in. */
  row: number;
  /** Wilted pups are skipped: nothing there is worth walking out for. */
  dry: boolean;
}

/** A pup row's extent, so everything else on the mill can work *with* it. */
interface Row {
  y: number;
  left: number;
  right: number;
}

/** How deep the field can get stocked before it stops adding rows. */
const FIELD_ROWS = 6;

/** How long a van's wheel track stays fresh behind it. */
const TRACK_MS = 4500;

/** A pup air-dropped from a zeppelin, on its way down to a specific pen. */
interface Drop {
  x: number;
  y: number;
  vy: number;
  /** Index into `beds`. The drop is aimed, so it visibly does something. */
  pup: number;
}

/**
 * A cloud zeppelin, working the sky the way the hands work the ground.
 *
 * These used to drift left to right at a fixed pace on a fixed lane, dropping
 * on whatever happened to be under them, and a rank of them was a screensaver.
 * A zeppelin has a *job*: pick a patch that needs bringing on, dart over it from
 * wherever it is, stop dead, and dump on it. So it holds a position and a
 * destination and moves between them, and it goes up and left as readily as
 * down and right.
 */
interface Flyer {
  x: number;
  y: number;
  /** Where the current dash started, and where it ends. */
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  /** Seconds into the dash, and how long the dash takes. */
  t: number;
  dur: number;
  /** Seconds left standing over the patch. Zero while it's travelling. */
  hold: number;
  /** Metronome for the drops while it's holding. */
  drip: number;
}

/**
 * Buffer pixels a second at full tilt, and how long one stands over a patch
 * once it gets there.
 *
 * The first go at this had them crossing the screen in three seconds and moving
 * on after one, which is a swarm rather than a crew: five of them at once and
 * the sky never held still. They work a patch properly now, and take their time
 * getting to the next one.
 */
const FLY_SPEED = 27;
const FLY_HOLD = 3.6;

/**
 * A Chihuahua Singularity, as the rest of the sky experiences it.
 *
 * It hangs in its column most of the time, and every half a minute or so it
 * comes down over the mill and goes back up — which is the only way a thing that
 * doesn't travel gets to be watched. On the way it drags: clouds, orbital kennels,
 * zeppelins and the pups they're dropping all bend toward it as it passes and
 * spring back once it's gone, because a hole in the sky that nothing reacts to
 * is a sticker of a hole in the sky.
 *
 * The drag is a displacement rather than a force. Nothing up here has to know it
 * happened — they fly the routes they were flying and get drawn somewhere else —
 * so a machine can't be left stranded in orbit by a badly timed dive.
 *
 * The exception is the loose pup, which it doesn't lean on but actually takes:
 * see `Caught`.
 */
interface Well {
  /** Top-left of the sprite, and the middle of it, which is what pulls. */
  x: number;
  y: number;
  cx: number;
  cy: number;
  /** How far the pull reaches, and how hard it is at the centre. */
  r: number;
  pull: number;
  /** 0 holding station, 1 at the bottom of a dive. */
  dive: number;
}

/**
 * Something loose that a singularity has got hold of.
 *
 * The drag on the sky is a displacement and everything caught in it springs
 * back once the hole has gone by. This is the other half of the thing, and the
 * half you can point at: a basket waiting at the headland, a puppy riding the
 * pipeline, what's sitting in the trough. It comes off the mill, goes round the
 * hole on a shrinking orbit, and doesn't come back.
 *
 * Held in polar around the well's centre rather than in scene coordinates, so
 * whatever it's got stays with it — including on the climb back up, if the
 * thing is still outside the hole by the time the dive is over.
 */
interface Caught {
  /** Which well has it. It lets go if that one stops being drawn. */
  well: number;
  art: Art;
  /** Angle round the hole, and how far out. */
  a: number;
  r: number;
}

/** Pixels a second a caught thing closes on the hole. */
const CATCH_FALL = 14;
/**
 * How fast it goes round, as `CATCH_SWIRL / r` radians a second — angular
 * momentum, near enough: the tighter the orbit the faster the lap, which is
 * what makes the last one whip. Capped at the core radius, because past that
 * it's a couple of pixels wide and any faster is a strobe.
 */
const CATCH_SWIRL = 60;
const CATCH_CORE = 5;
/**
 * How flat the orbit lies once it's close in, and how far out it's still round.
 *
 * A flat orbit all the way out means a thing grabbed from directly above the
 * hole has to start half as far above it as it really is, which is a jump. So
 * the wide end of the spiral is a circle — it can enter it exactly where it was
 * standing — and it lies down into the drain as it closes.
 */
const CATCH_TILT = 0.5;
const CATCH_FLAT = 30;
const MAX_CAUGHT = 18;
/** Things a hole picks up a second, at the bottom of a dive. */
const GRAB_RATE = 22;

/** One frame of an orbit: where it's got to, and how far round it went. */
export function catchOrbit(r: number, dt: number): { r: number; turn: number } {
  return { r: r - CATCH_FALL * dt, turn: (CATCH_SWIRL / Math.max(CATCH_CORE, r)) * dt };
}

/** How much of its height an orbit keeps, that far out from the hole. */
function catchTilt(r: number): number {
  return CATCH_TILT + (1 - CATCH_TILT) * Math.min(1, r / CATCH_FLAT);
}

/** How often one comes down, and how much of that cycle it spends down there. */
const DIVE_PERIOD = 34;
const DIVE_SHARE = 0.32;

/** The one hash every sky tier is placed off. Stable per tier and index. */
function skyHash(i: number, id: string): number {
  return fract(Math.sin((i + 1) * 47.3 + id.length * 13.1) * 4375.85);
}

/**
 * How far into a dive something is, 0..1, given the clock and its own phase.
 *
 * Eases down, hangs at the bottom, eases back — one sine, which is exactly the
 * shape of a thing that has weight and is deciding rather than a thing on a
 * lift. The rest of the cycle it's flat zero and the sky is left alone.
 */
function diveAt(t: number, period: number, phase: number): number {
  const c = fract(t / period + phase);
  if (c > DIVE_SHARE) return 0;
  return Math.sin(Math.PI * (c / DIVE_SHARE)) ** 2;
}

export class MillScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private raf = 0;
  private sh = 200;
  /**
   * Scene time, in seconds, accumulated a capped frame at a time rather than
   * read off the wall clock.
   *
   * A backgrounded tab stops getting frames, and a scene clock derived from a
   * fixed epoch comes back minutes ahead: every bed in the field is suddenly
   * long overdue, every one of them lifts on the same frame, and switching back
   * to the game greeted you with the entire output going off at once. The mill
   * pauses with the tab now and picks up where it left off.
   */
  private clock = 0;
  private view: MillView = EMPTY_VIEW;
  private rngSeed = 1;
  /** Whether a view has ever been pushed. The first one never animates. */
  private sawView = false;
  /**
   * How deep each lot was last frame, and which of its slots are mid-build.
   *
   * Same argument the fold makes about `sawView`: the first frame a scene draws
   * is a *restore*, so it fills the depths and raises nothing. Otherwise every
   * reload would put eleven kibble pups up in front of you at once.
   */
  private lotSeen = new Map<string, number>();
  private raising = new Map<string, number>();
  private sawLots = false;
  /** What time of day it is, worked out once a frame and read by everything. */
  private phase: Phase = "day";
  /** When the pipeline started being built, on the scene clock. */
  private pipeBuiltAt: number | null = null;
  /** Whether a frame has ever been drawn with nothing feeding the pipeline. */
  private sawNoPipe = false;
  private hauls: Haul[] = [];
  private lumps: Lump[] = [];
  /** Baskets tipped out by the machines, waiting for a hand. */
  private baskets: Basket[] = [];
  private basketId = 0;
  /** How full each drawn machine is, keyed by tier and index. */
  private machineLoad = new Map<string, number>();
  private whistled: Whistled[] = [];
  private puffs: Puff[] = [];
  /** Cooling-tower steam, on its own budget so it can't starve the dust. */
  private plumes: Plume[] = [];
  /** The pups as laid out this frame. Deterministic, so an index is a place. */
  private beds: Bed[] = [];
  /** This frame's pup rows. Rigs stand beside these; machines drive along them. */
  private rows: Row[] = [];
  /** Fresh wheel track behind a van, fading. */
  private tracks: { x: number; y: number; born: number }[] = [];
  private drops: Drop[] = [];
  /** The zeppelins aloft, one entry each, kept between frames. */
  private flyers: Flyer[] = [];
  /** This frame's singularities. Placed before the sky, so the sky can feel them. */
  private wells: Well[] = [];
  /** What they've taken off the mill, still going round. */
  private caught: Caught[] = [];
  /** When each bed was last cleared. Indexed the same as `beds`. */
  private stocked: number[] = [];
  private hands: Hand[] = [];
  /** What's sitting in the trough, 0..TROUGH_CAP, and the spout's metronome. */
  private troughFill = 0;
  private troughClock = 0;
  /** This frame's trough, as `[x, w, ground]`. Null when nothing works the field. */
  private troughBox: { x: number; w: number; y: number } | null = null;
  /** How far right the pipeline reaches this frame. 0 when nothing feeds it. */
  private pipeEnd = 0;
  private dt = 0;
  private lastFrame = performance.now();
  /**
   * The hoard the yard is currently showing, which chases the real one rather
   * than snapping to it. This is what makes spending *look* like spending:
   * buy a van and you watch the crates come back apart.
   */
  private shown = -1;
  private shownLayout = yardLayout(0);
  private pack: PackPup[] = [];
  private ball: Ball = { x: 80, y: 0, tx: 80, ty: 0, from: 0, to: 0, chaser: null };
  private bundles: Bundle[] = [];
  /** The yard crew, moving the pile into and out of what it paid for. */
  private porters: Porter[] = [];
  /**
   * Stages part-way through arriving or leaving, as stage index to the moment
   * it started. A prop on this list is drawn sliding out of or down into the
   * ground rather than just standing there.
   */
  private building = new Map<number, { born: number; up: boolean }>();

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
  }

  update(view: MillView): void {
    const wiped =
      this.sawView && (view.generation !== this.view.generation || view.seed !== this.view.seed);
    this.view = view;
    this.rngSeed = hashSeed(view.seed);
    this.sawView = true;
    if (wiped) this.clearOut();
  }

  /**
   * A different mill entirely: handed down, or ploughed under. Take everything
   * the last one left standing off the canvas.
   *
   * The yard chases the hoard rather than snapping to it, which is what makes
   * spending look like spending — but a chase is the wrong verb for a wipe.
   * Coming down from a late-run hoard it's an exponential decay through
   * twenty-odd orders of magnitude, so a mill you no longer own kept its crate stacks,
   * its crates, its pipeline and a heap up the side of the screen for twenty
   * seconds after the generation that built them was cleared.
   *
   * A generation bump or a new seed is the whole tell: prestige does the first,
   * ploughing it all under does the second, and nothing else does either.
   */
  private clearOut(): void {
    this.shown = Math.max(0, this.view.hoard);
    this.shownLayout = yardLayout(this.shown);
    this.building.clear();
    this.bundles = [];
    this.porters = [];
    this.pack = [];
    this.ball.chaser = null;
    this.hauls = [];
    this.lumps = [];
    this.baskets = [];
    this.machineLoad.clear();
    this.puffs = [];
    this.plumes = [];
    this.tracks = [];
    this.whistled = [];
    this.caught = [];
    this.troughFill = 0;
    // The pipeline is built once, by the mill that first needed one. The next
    // generation builds its own.
    this.pipeBuiltAt = null;
    this.sawNoPipe = false;
    // Lot depths are seeded rather than raised on a restore, and a wipe is a
    // restore: the next mill shouldn't put its first pen up in a cloud of
    // dust it didn't earn, and it definitely shouldn't demolish eleven
    // kibble pups on the way out.
    this.lotSeen.clear();
    this.raising.clear();
    this.sawLots = false;
  }

  /** Which mark of a tier to draw, given the upgrades bought on it. */
  private mark(id: solo.SoloProducerId): Art {
    const marks = PRODUCER_MARKS[id];
    const level = Math.max(0, Math.min(marks.length - 1, this.view.marks[id] ?? 0));
    return marks[level] ?? marks[0];
  }

  /**
   * A whistle: a puppy comes up out of the ground where you put your finger, sits
   * in the open for a moment in a cloud of its own dirt, and is gone.
   *
   * It doesn't travel. Whistling is the one thing on this mill you do with your
   * hands, and the whole reward is seeing the thing come out of the bedding at the
   * spot you picked — carting it anywhere afterwards is the machines' job.
   */
  whistle(at?: { x: number; y: number }): void {
    if (this.whistled.length > 14) return;
    const top = this.fieldTop() + 8;
    const floor = this.sh - 8;
    const x = at ? Math.max(3, Math.min(SCENE_W - 8, Math.round(at.x))) : 20 + Math.random() * (SCENE_W - 60);
    const y = at ? Math.max(top, Math.min(floor, Math.round(at.y))) : top + 12 + Math.random() * 30;
    this.whistled.push({ x: Math.round(x), y: Math.round(y), born: performance.now() });
    this.puff(x, y, "dust", -10);
    this.puff(x + 3, y, "dust", 10);
  }

  /** How ready a bed is, 0..1, where 1 is ready to lift. */
  private readiness(i: number, t: number): number {
    const stocked = this.stocked[i];
    if (stocked === undefined) return 0;
    return Math.min(1, (t - stocked) / GROW_SECONDS);
  }

  /**
   * Clear a bed and start it again. Nothing is drawn coming off it: whatever
   * lifted the bed is the thing that carries it, and a bed that went over and
   * got tidied up off-screen shouldn't produce a puppy out of thin air.
   */
  private lift(i: number, t: number): void {
    // Replanted part-grown, not from bare bedding. A mill running eleven machines
    // sweeps every row every few seconds, and a bed that goes back to a two
    // pixel sprout each time means the field you spent the whole game buying
    // is permanently brown.
    this.stocked[i] = t - GROW_SECONDS * 0.35;
  }

  /**
   * The kennel hands, going about it.
   *
   * Each one walks out to whichever bed has been ready longest, spends a moment
   * pulling it, carries the puppy down to the yard, drops it on the pile and
   * walks back. Nothing here is fast and nothing here is synchronised — the
   * point is that there's always somebody halfway across the field.
   */
  private stepHands(t: number, dt: number, count: number, yardY: number): void {
    const unload = yardY + Math.round((this.sh - yardY) * 0.42);

    while (this.hands.length > count) this.hands.pop();
    while (this.hands.length < count) {
      const i = this.hands.length;
      // Sixteen of them have to stand somewhere: six to a rank, ranks stepped
      // back into the yard and offset half a place so the crew reads as a crew
      // and not a police line.
      const rank = Math.floor(i / 6);
      const inRank = i % 6;
      const home = 12 + inRank * 26 + (rank % 2) * 13;
      const homeY = unload + rank * 7;
      // Staggered so they don't set off on the same frame like a chorus, but
      // barely — two seconds of jitter off a hash rather than two seconds per
      // hand in a queue. Sixteen hands standing in the yard counting to thirty
      // is the crew you just bought doing nothing, which is the opposite of
      // what buying them was for.
      const jitter = fract(Math.sin((i + 1) * 91.7) * 4375.85);
      this.hands.push({
        x: home,
        y: homeY,
        home,
        homeY,
        loiter: { x: home, y: homeY },
        rowPref: i % FIELD_ROWS,
        state: "resting",
        target: -1,
        basket: -1,
        until: t + jitter * 2,
        carrying: "none",
      });
    }

    for (const hand of this.hands) {
      switch (hand.state) {
        case "resting": {
          // Idle hands amble. They pick a spot a few paces off, wander to it at
          // half pace, and pick another — so a crew with nothing ready to lift
          // reads as people standing about a mill rather than a rank of clones
          // waiting for a whistle.
          if (this.walk(hand, hand.loiter.x, hand.loiter.y, dt, 0.35)) {
            hand.loiter = {
              x: clamp(hand.home + (Math.random() - 0.5) * 26, 4, SCENE_W - 10),
              y: clamp(hand.homeY + (Math.random() - 0.5) * 14, yardY + 4, this.sh - 6),
            };
          }
          if (t < hand.until) break;
          // A basket sitting at the headland is worth more than another bed:
          // it's already picked, and it's in the way.
          const basket = this.claimBasket(hand);
          if (basket >= 0) {
            hand.basket = basket;
            hand.state = "fetch";
            break;
          }
          const target = this.claimBed(t, hand);
          if (target < 0) {
            // Nothing ready and nothing growing: try again shortly.
            hand.until = t + 0.6 + Math.random();
            break;
          }
          hand.target = target;
          hand.state = "out";
          break;
        }
        case "out": {
          const bed = this.beds[hand.target];
          if (!bed) {
            hand.state = "resting";
            hand.target = -1;
            hand.until = t + 0.5;
            break;
          }
          if (this.walk(hand, bed.x + 1, bed.y, dt)) {
            hand.state = "picking";
            hand.until = t + PICK_SECONDS;
          }
          break;
        }
        case "picking": {
          if (t < hand.until) break;
          this.lift(hand.target, t);
          hand.carrying = "puppy";
          hand.state = "back";
          break;
        }
        case "fetch": {
          const basket = this.baskets.find((sk) => sk.id === hand.basket);
          if (!basket) {
            hand.basket = -1;
            hand.state = "resting";
            hand.until = t + 0.3;
            break;
          }
          if (this.walk(hand, basket.x, basket.y, dt)) {
            this.baskets = this.baskets.filter((sk) => sk.id !== hand.basket);
            hand.carrying = "basket";
            hand.state = "hauling";
          }
          break;
        }
        case "hauling": {
          // To the trough if there is one — that's where the machines' load
          // goes — and to the yard if there isn't.
          const box = this.troughBox;
          const tx = box ? clamp(hand.x, box.x + 4, box.x + box.w - 6) : hand.home;
          const ty = box ? box.y + 3 : hand.homeY;
          if (this.walk(hand, tx, ty, dt, 0.85)) {
            hand.carrying = "none";
            hand.basket = -1;
            if (box) this.troughFill = Math.min(TROUGH_CAP, this.troughFill + BASKET_WORTH);
            this.puff(tx + 1, ty - 2, "dust");
            hand.state = "resting";
            hand.loiter = this.turnAround(hand, yardY);
            hand.until = t + 0.4;
          }
          break;
        }
        case "back": {
          // To the trough, same as the baskets. One deposit point for the whole
          // mill: what a hand pulls out of a bed goes where a grooming rig's load
          // goes, and the trough empties towards the mound.
          const bin = this.troughBox;
          const bx = bin ? clamp(hand.x, bin.x + 4, bin.x + bin.w - 6) : hand.home;
          const by = bin ? bin.y + 3 : hand.homeY;
          if (this.walk(hand, bx, by, dt)) {
            hand.carrying = "none";
            if (bin) this.troughFill = Math.min(TROUGH_CAP, this.troughFill + 1);
            // Set down, not thrown. The dirt it kicks up is the whole event.
            this.puff(bx + 2, by - 1, "dust");
            hand.state = "resting";
            hand.target = -1;
            hand.loiter = this.turnAround(hand, yardY);
            hand.until = t + REST_SECONDS * (0.5 + Math.random());
          }
          break;
        }
      }
    }
  }

  /**
   * The bed that's been ready longest and isn't already somebody's job. Wilted
   * beds are passed over — there's nothing under them worth the walk, which is
   * the bedding bar showing up as behaviour rather than a number.
   */
  private claimBed(t: number, hand: Hand): number {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < this.beds.length; i++) {
      const bed = this.beds[i]!;
      if (bed.dry) continue;
      if (this.hands.some((h) => h.target === i)) continue;
      const ready = this.readiness(i, t);
      if (ready <= 0.55) continue;
      // Ripest first, then weighted against the walk, then against the row
      // this one tends to work. Purely by readiness they all set off for the
      // same corner, because beds come on in patches; purely by distance they
      // all crowd the near row. Each hand leaning towards a row of its own is
      // what spreads the crew over the whole field.
      const score =
        ready * 40 -
        Math.hypot(bed.x - hand.x, bed.y - hand.y) * 0.35 -
        Math.abs(bed.row - hand.rowPref) * 9;
      if (best < 0 || score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /** Step a hand toward a point. True once it's there. */
  private walk(hand: Hand, tx: number, ty: number, dt: number, pace = 1): boolean {
    const dx = tx - hand.x;
    const dy = ty - hand.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) {
      hand.x = tx;
      hand.y = ty;
      return true;
    }
    const step = Math.min(d, HAND_SPEED * pace * dt);
    hand.x += (dx / d) * step;
    hand.y += (dy / d) * step;
    return false;
  }

  private drawHands(t: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(this.mark("hand"));
    const pup = artCanvas(PUPPY_SPRITE);
    const basket = artCanvas(BASKET);
    for (const [i, hand] of this.hands.entries()) {
      const moving = hand.state !== "resting" && hand.state !== "picking";
      // A 1px bob while walking, and a deeper stoop while pulling a bed.
      const bob = moving ? Math.floor(t * 4) % 2 : hand.state === "picking" ? 2 : 0;
      // Lifted off the ground if one of them comes down in the row they're
      // working. They keep walking the route they were walking — see `warp` —
      // so what it looks like is a kennel hand being picked up and put back down,
      // which is the correct response to a hole in the world arriving overhead.
      const at = this.warp(hand.x + sprite.w / 2, hand.y - sprite.h / 2 + bob);
      const x = Math.round(at.x - sprite.w / 2);
      const y = Math.round(at.y - sprite.h / 2);
      // A hand who owns a piece of the place carries a lamp. Sixteen of them
      // walking a dark field is the single best thing the fourth marks do.
      this.primeGlow("hand", x, y, sprite.w, sprite.h, t, i, 0.8);
      ctx.drawImage(sprite.canvas, x, y);
      if (hand.carrying === "puppy") ctx.drawImage(pup.canvas, x + 1, y - 4);
      // Baskets ride on the shoulder, which is also why a hand carrying one
      // walks at eighty-five per cent pace.
      if (hand.carrying === "basket") ctx.drawImage(basket.canvas, x - 2, y - basket.h + 3);
    }
  }

  private puff(x: number, y: number, kind: "dust" | "steam" | "water", vx?: number): void {
    if (this.puffs.length >= MAX_PUFFS) return;
    const spec = {
      dust: { color: "#b79a72", vx: -6, vy: -5, dur: 620, size: 2 },
      steam: { color: "#e8ecf0", vx: 3, vy: -13, dur: 900, size: 2 },
      water: { color: "#8ec9e6", vx: 0, vy: 4, dur: 460, size: 1 },
    }[kind];
    this.puffs.push({
      x,
      y,
      vx: (vx ?? spec.vx) + (Math.random() - 0.5) * 8,
      vy: spec.vy - Math.random() * 4,
      born: performance.now(),
      dur: spec.dur,
      color: spec.color,
      size: spec.size,
    });
  }

  /** Per-frame odds for something that should happen `perSec` times a second. */
  private chance(perSec: number): boolean {
    return Math.random() < this.dt * perSec;
  }

  start(): void {
    const loop = () => {
      this.draw(performance.now());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
  }

  // --- Geometry ------------------------------------------------------------

  /**
   * The three bands, as fractions rather than fixed pixel depths. Fixed depths
   * looked right at one aspect ratio and left two thirds of a tall phone as
   * empty sky — the mill should get the screen, not the weather.
   */
  private yardTop(): number {
    return this.sh - Math.max(34, Math.round(this.sh * YARD_SHARE));
  }

  private fieldTop(): number {
    return Math.max(MIN_SKY, this.yardTop() - Math.max(40, Math.round(this.sh * FIELD_SHARE)));
  }

  /**
   * How much sky the machines have, and where the hanging tier's deck ends.
   *
   * `deck` is the top of the frame down to where the far ridge crests, which is
   * as low as anything up here should sit before it's flying in front of the
   * hills instead of above them. Floored, because a squat landscape sky has no
   * room at all and everything in it has always just flown a bit low in that
   * case.
   *
   * Three tiers used to draw their altitude from one range, which is three tiers
   * taking turns being in front of each other. They're stacked by how long an
   * overlap would last instead: the singularities hang and never travel, so they
   * get the top and everything passes underneath them; the orbital kennels cross, so
   * they get the middle; the zeppelins dash, hold and drip, so they get the
   * bottom, nearest the rows they're stocking.
   */
  private decks(horizon: number): { deck: number; hang: number } {
    const ridge = RIDGES[0]!;
    const deck = Math.max(
      34,
      Math.round(horizon - Math.min(1, horizon / RIDGE_ROOM) * (ridge.base + ridge.amp)),
    );
    return { deck, hang: Math.round(deck * 0.44) };
  }

  /**
   * Where the singularities are this frame, and how hard each is pulling.
   *
   * Placed before anything is drawn, because half the point of them is what the
   * rest of the sky does about them — the clouds go up before the machines do,
   * and both have to be able to ask where the holes are.
   *
   * A singularity can't be placed by hash the way the travelling tiers are: a
   * orbital kennel that overlaps another one has passed it by the time you look up,
   * and two of these dealt the same corner are still in that corner ten minutes
   * later. So each one owns a column — `cap` even lots across the width — and
   * everything else it does happens inside that column.
   */
  private stepWells(t: number, horizon: number): void {
    const place = PLACEMENT.singularity;
    const n = shownCount(this.view.working.singularity ?? 0, place.cap, place.spread ?? 1);
    const sprite = artCanvas(this.mark("singularity"));
    const { hang } = this.decks(horizon);
    const lot = SCENE_W / place.cap;
    // As low as a dive gets: down through the traffic, past the hills and into
    // the middle of the field itself.
    //
    // Stopping it at the skyline made it a weather event happening to the sky.
    // Down here it's happening to the mill — it comes down among the rows and
    // the crew, and what it drags is the work.
    const floor = Math.max(hang, Math.round(horizon + (this.yardTop() - horizon) * 0.5 - sprite.h / 2));

    this.wells.length = 0;
    for (let i = 0; i < n; i++) {
      const h = skyHash(i, "singularity");
      const h2 = fract(h * 137.7);
      const h3 = fract(h2 * 91.3);
      // Hanging: high in its column, and never quite still — a slow lissajous a
      // few pixels wide, on its own phase, so two of them don't breathe
      // together. Staggered vertically by what room the deck leaves, so three of
      // them aren't a row of portals at one exact altitude.
      const home = (i / place.cap) * SCENE_W + (lot - sprite.w) / 2;
      const room = Math.max(0, hang - sprite.h - 2);
      const rest = 1 + Math.round(h2 * room) + Math.round(Math.sin(t * 0.43 + h3 * 6) * 2);
      // And every half a minute or so, it comes down. Off the clock rather than
      // out of a bag, so it's a thing the mill does on a rhythm you can learn
      // rather than a jump scare — and on its own phase, because three of them
      // descending in step is a formation flight, not weather.
      const dive = diveAt(t, DIVE_PERIOD * (0.8 + 0.5 * h), h2);
      const x = Math.round(home + Math.sin(t * 0.31 + h2 * 6) * 5);
      const y = Math.round(rest + (floor - rest) * dive);
      this.wells.push({
        x,
        y,
        cx: x + sprite.w / 2,
        cy: y + sprite.h / 2,
        // It reaches further and pulls harder the lower it gets. Resting, it's
        // barely more than a lens the clouds bend through; at the bottom of a
        // dive it's worth about half a cloud's width of displacement, which at
        // this resolution is the difference between a drift and a grab.
        r: 18 + dive * 44,
        pull: 0.16 + dive * 0.64,
        dive,
      });
      // What it makes goes into the same pipeline as everything else the
      // industrial half of the mill produces — it just doesn't need a kennel to
      // do it from. Booked here rather than where it's drawn, because the pipe
      // is laid out long before the last thing on top of it is painted.
      this.pipeEnd = Math.max(this.pipeEnd, x + Math.floor(sprite.w / 2));
      if (this.chance(1.4)) this.feedPipe(x + Math.floor(sprite.w / 2));
      // And what it takes on the way down.
      this.grab(i, t, horizon);
    }
  }

  /**
   * What a diving singularity picks up.
   *
   * The displacement is the sky *leaning*; this is the hole actually taking
   * something, which is the part you can watch happen to a thing you recognise.
   * Same rule as the warp about what's fair game — anything loose, nothing
   * rooted — so it robs the headland, the pipeline and the trough, and leaves
   * the pup, the rigs and the kennels alone.
   *
   * The nearest thing in reach, one at a time, several a second: a hole that
   * swallowed everything on the same frame would read as a delete rather than
   * as a pull.
   */
  private grab(i: number, t: number, horizon: number): void {
    const well = this.wells[i]!;
    if (well.dive < 0.25 || this.caught.length >= MAX_CAUGHT) return;
    // Dirt off the ground under it the whole time it's down, whether or not
    // there's anything to take: it's the wind of the thing, and it's what says
    // the field is being pulled at rather than just passed over.
    if (this.chance(6 * well.dive)) {
      const off = (Math.random() - 0.5) * 40;
      this.puff(well.cx + off, well.cy + 16, "dust", -off * 0.7);
    }
    if (!this.chance(GRAB_RATE * well.dive)) return;

    // Inside the reach the warp already has, less a margin — something it can
    // barely lean on shouldn't be something it can lift.
    const reach = well.r * 0.8;
    let best: { d: number; art: Art; x: number; y: number; take: () => void } | null = null;
    const offer = (x: number, y: number, art: Art, take: () => void) => {
      const d = Math.hypot(x - well.cx, y - well.cy);
      if (d > reach || (best && d >= best.d)) return;
      best = { d, art, x, y, take };
    };

    // A basket at the headland: the biggest loose thing on the mill, and the one
    // whose going is worth the most work.
    for (const basket of this.baskets) {
      offer(basket.x + 3, basket.y - 4, BASKET, () => {
        this.baskets = this.baskets.filter((s) => s !== basket);
      });
    }
    // Puppies on the pipeline's horizontal run, lifted straight out of it.
    const pipeY = this.pipeY(horizon) + 3;
    for (const lump of this.lumps) {
      const px = lump.from - lump.d;
      if (px < 2) continue;
      offer(px + 3, pipeY, PUPPY_SPRITE, () => {
        this.lumps = this.lumps.filter((l) => l !== lump);
      });
    }
    // What the crew has just turned up and hasn't carried off yet.
    for (const whistled of this.whistled) {
      offer(whistled.x + 3, whistled.y - 6, PUPPY_SPRITE, () => {
        this.whistled = this.whistled.filter((d) => d !== whistled);
      });
    }
    // The ready pup out of the beds under it. The pup stays in the ground —
    // it's the puppy that goes, the same one a hand would have walked out for,
    // and the bed goes back to part-grown exactly as if one had. This is what
    // makes a dive over open field worth watching on a mill that hasn't got a
    // pipeline yet: everything else out here is somebody's load, and there's
    // never more than one of those in reach.
    for (let b = 0; b < this.beds.length; b++) {
      const bed = this.beds[b]!;
      if (bed.dry || this.readiness(b, t) < 0.8) continue;
      offer(bed.x + 3, bed.y - 5, PUPPY_SPRITE, () => this.lift(b, t));
    }
    // And off the top of the trough, at the point on it nearest the hole.
    const box = this.troughBox;
    if (box && this.troughFill > 0) {
      const tx = clamp(well.cx, box.x + 4, box.x + box.w - 5);
      offer(tx, box.y - 8, PUPPY_SPRITE, () => {
        this.troughFill = Math.max(0, this.troughFill - 1);
      });
    }

    if (!best) return;
    const got: { d: number; art: Art; x: number; y: number; take: () => void } = best;
    got.take();
    // Entered on the orbit that passes through where it was standing, so it
    // leaves the ground from where you last saw it rather than snapping onto a
    // seam — which is what the wide end of the spiral being round is for.
    this.caught.push({
      well: i,
      art: got.art,
      a: Math.atan2(got.y - well.cy, got.x - well.cx),
      r: Math.max(CATCH_CORE, got.d),
    });
  }

  /**
   * Where a point in the sky ends up once the holes have had a go at it.
   *
   * Displacement, not force: the thing being warped is drawn somewhere else and
   * never told, so it stays on whatever route it was flying and springs back as
   * the well leaves. Falls off with the square of the distance, so the edge of
   * the field is a lean and the middle of it is a swallow.
   *
   * One rule about what gets to move: anything loose does — clouds, machines,
   * the crew, dust, drops in the air. Anything rooted doesn't. The pup stays in
   * the ground, the rigs stay on their stands and the kennels stay on the hill,
   * because a mill that comes apart every thirty seconds isn't a mill, and the
   * point of the thing coming down is what it does to the work going on around
   * it rather than to the place itself.
   */
  private warp(x: number, y: number): { x: number; y: number } {
    let ox = x;
    let oy = y;
    for (const well of this.wells) {
      const dx = well.cx - ox;
      const dy = well.cy - oy;
      const d = Math.hypot(dx, dy);
      if (d >= well.r || d < 0.01) continue;
      const f = well.pull * (1 - d / well.r) ** 2;
      ox += dx * f;
      oy += dy * f;
    }
    return { x: ox, y: oy };
  }

  // --- Drawing -------------------------------------------------------------

  private draw(now: number): void {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.dt = dt;
    this.lastFrame = now;
    this.clock += dt;
    const t = this.clock;
    const phase = (this.phase = phaseNow());
    const horizon = this.fieldTop();
    const yardY = this.yardTop();

    this.stepHoard(dt, now);
    this.pipeEnd = 0;
    // Before anything is drawn: the sky has to know where the holes in it are
    // before it draws the things that fall toward them.
    this.stepWells(t, horizon);

    const lots = this.lots(horizon);
    this.noteArrivals(lots, t);
    // The hills and the deep end of every lot go up together, back to front.
    this.drawSky(phase, t, horizon);
    this.drawDistance(lots, phase, horizon, t);
    this.drawGround(horizon, yardY);
    this.drawBack(lots, t, now, horizon, phase);
    this.drawField(t, now, horizon, yardY);
    this.drawBaskets(now);
    this.drawPuffs(now, dt);
    this.drawFence(yardY);
    this.drawLamp(yardY, phase);
    this.drawHoard(now);
    // The spout hangs over the yard on its way to the mound at the front of it,
    // so it's drawn after the yard rather than with the trough it comes off:
    // behind the crate stacks it was pouring the pup out somewhere you couldn't see.
    if (this.troughBox) this.drawSpout(this.troughBox);
    this.stepPack(this.dt, this.clock);
    this.stepBall(this.clock);
    this.drawPorters(now);
    // After the hoard: the pipeline runs down the near side of the yard, so it
    // passes in front of the crate stacks rather than being swallowed by them.
    this.drawPipeline(horizon, yardY, dt, t);
    // The hands walk between the two bands, so they're drawn after both — and
    // after the field has said where this frame's beds are.
    this.stepHands(t, dt, shownCount(this.view.working.hand ?? 0, PLACEMENT.hand.cap, PLACEMENT.hand.spread), yardY);
    this.drawHands(t);
    this.drawHauls(now);
    this.drawWhistled(now);
    this.drawBundles(now);
    // In front of the whole mill, because one of them may be hanging in the
    // middle of it.
    this.drawWells(t);

    this.drawDark(phase, yardY, t);
  }

  /** Where the lamp's head hangs — the one light source the mill owns. */
  private lampHead(yardY: number): { x: number; y: number; top: number } {
    const art = artCanvas(LAMP);
    const top = yardY + 3 - art.h;
    return { x: LAMP_X + Math.floor(art.w / 2), y: top + 2, top };
  }

  /**
   * The lamp post on the yard gate. Drawn with the fence, because that's where
   * it stands — in front of the field, behind everything in the yard.
   */
  private drawLamp(yardY: number, phase: Phase): void {
    const on = phase !== "day";
    const sprite = artCanvas(on ? LAMP_ON : LAMP);
    this.ctx.drawImage(sprite.canvas, LAMP_X, this.lampHead(yardY).top);
  }

  /**
   * Nightfall, over the whole picture and not just the top four fifths of it.
   *
   * Three passes, in this order, and the order is the entire trick:
   *  1. the field goes dark flat, because nothing out there is lit;
   *  2. the yard goes dark too, less, because it's the yard;
   *  3. the lamp puts its own light back — a warm pool over a cold wash, which
   *     is what lamplight actually looks like and what stops the yard from
   *     reading as a band the renderer forgot about.
   *
   * The lamp's head is re-blitted last so the one thing in the picture that is
   * emitting light isn't also being dimmed by the pass that made it necessary.
   */
  private drawDark(phase: Phase, yardY: number, t: number): void {
    const dark = DARKNESS[phase];
    if (dark.field <= 0 && dark.yard <= 0) return;
    const ctx = this.ctx;

    ctx.fillStyle = rgba(NIGHT, dark.field);
    ctx.fillRect(0, 0, SCENE_W, yardY);
    ctx.fillStyle = rgba(NIGHT, dark.yard);
    ctx.fillRect(0, yardY, SCENE_W, this.sh - yardY);

    // A slow flicker, a couple of per cent deep. A lamp that holds perfectly
    // steady is a rectangle of colour; one that breathes is a light.
    const head = this.lampHead(yardY);
    const flicker = 0.94 + 0.06 * Math.sin(t * 2.3) + 0.02 * Math.sin(t * 11.7);
    const lit = (phase === "night" ? 1 : 0.55) * flicker;

    // The cone. This is the difference between "the yard came out lighter" and
    // "that lamp is lighting the yard", and it's the whole reason the post was
    // worth drawing: you can see where the light comes from and where it stops.
    const cone = ctx.createLinearGradient(0, head.y, 0, this.sh);
    cone.addColorStop(0, rgba(LAMP_LIGHT, 0.24 * lit));
    cone.addColorStop(0.55, rgba(LAMP_LIGHT, 0.12 * lit));
    cone.addColorStop(1, rgba(LAMP_LIGHT, 0));
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(head.x - 3, head.y + 2);
    ctx.lineTo(head.x + 3, head.y + 2);
    ctx.lineTo(head.x + LAMP_SPREAD, this.sh);
    ctx.lineTo(head.x - LAMP_SPREAD, this.sh);
    ctx.closePath();
    ctx.fill();

    // The pool it lands in, aimed down into the yard rather than centred on the
    // bulb — the light is up on a post and what it lights is the ground.
    this.glow(head.x, yardY + (this.sh - yardY) * 0.4, LAMP_REACH, LAMP_LIGHT, 0.26 * lit);
    this.glow(head.x, head.y, 13, LAMP_LIGHT, 0.5 * lit);

    const sprite = artCanvas(LAMP_ON);
    ctx.drawImage(sprite.canvas, LAMP_X, head.top);
  }

  // --- Things going up -----------------------------------------------------
  //
  // Nothing on this mill should simply appear. The yard already had this: a
  // crate arrives because somebody bagged the pile and carried it in. The back
  // edge did not — a fusion reactor turned up between two frames because a
  // number went up, which is the one place the picture stopped being a place
  // where work happens and went back to being a readout.

  /** Spot anything that arrived since last frame, and put it up. */
  private noteArrivals(lots: Lot[], t: number): void {
    const arrive = (key: string, n: number) => {
      const before = this.lotSeen.get(key) ?? 0;
      this.lotSeen.set(key, n);
      // Counts fall on a prestige, and everything gets built again on the way
      // back up — which is the right answer. Handing the mill down and watching
      // it go back up is the point of handing it down.
      if (this.sawLots) {
        for (let i = before; i < n; i++) this.raising.set(`${key}:${i}`, t);
      }
    };

    for (const lot of lots) arrive(lot.id, lot.depth);

    this.sawLots = true;
    for (const [key, born] of this.raising) {
      if (t - born > RAISE_S) this.raising.delete(key);
    }
  }

  /** How far through its build something is, or null if it isn't being built. */
  private raiseOf(key: string, t: number): number | null {
    const born = this.raising.get(key);
    if (born === undefined) return null;
    return clamp((t - born) / RAISE_S, 0, 1);
  }

  /**
   * One building going up: scaffolding, then the thing rising into it, then
   * the scaffolding coming off.
   *
   * A second and a half, which is a tenth of what the fold gets — this fires
   * five times in a row when a lot goes from four deep to nine, and anything
   * statelier would have the back edge permanently under construction. Returns
   * how much of the sprite has cleared the ground, so the caller can blit that
   * much of it: the building comes *up out of the pad*, which is both cheaper
   * and a better read than fading one in.
   */
  private drawRaise(p: number, x: number, foot: number, w: number, h: number): number {
    const ctx = this.ctx;
    // Up fast, off at the end, and never quite opaque — it's scaffolding.
    const frame = clamp(p / 0.2, 0, 1) * (1 - clamp((p - 0.76) / 0.24, 0, 1));
    // Ease-out on the rise, so it settles onto the pad instead of stopping.
    const rise = clamp((p - 0.1) / 0.62, 0, 1);
    const shown = Math.max(1, Math.round(h * (1 - Math.pow(1 - rise, 2))));

    if (frame > 0.03) {
      const top = foot - h - 2;
      ctx.globalAlpha = 0.8 * frame;
      ctx.fillStyle = SCAFFOLD;
      ctx.fillRect(x - 2, top, 1, h + 2);
      ctx.fillRect(x + w + 1, top, 1, h + 2);
      for (let y = top + 3; y < foot; y += 5) ctx.fillRect(x - 2, y, w + 4, 1);
      ctx.globalAlpha = 1;
    }

    // Dirt coming off the pad the whole way up, and one last shove of it as the
    // thing lands.
    if (p < 0.75 && this.chance(9)) {
      this.puff(x + Math.random() * w, foot - 1, "dust", (Math.random() - 0.5) * 16);
    }
    if (p > 0.72 && p < 0.78) {
      this.puff(x - 1, foot - 1, "dust", -14);
      this.puff(x + w, foot - 1, "dust", 14);
    }
    return Math.min(h, shown);
  }

  private drawSky(phase: Phase, t: number, horizon: number): void {
    const ctx = this.ctx;
    const sky = SKY[phase];
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, horizon);

    if (phase === "night") {
      const rng = mulberry32(this.rngSeed ^ 0x51ed);
      ctx.fillStyle = "#f4f1d8";
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(rng() * SCENE_W);
        const y = Math.floor(rng() * Math.max(1, horizon - 8));
        if (rng() > 0.35 + 0.3 * Math.sin(t * 0.7 + i)) ctx.fillRect(x, y, 1, 1);
      }
      // Moon
      ctx.fillStyle = "#f7f0d0";
      ctx.beginPath();
      ctx.arc(SCENE_W - 30, 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky.top;
      ctx.beginPath();
      ctx.arc(SCENE_W - 34, 17, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = phase === "dusk" ? "#ffca77" : "#fdf0a6";
      ctx.beginPath();
      ctx.arc(SCENE_W - 28, 22, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drifting clouds. Day only — at night they'd just be grey smears.
    //
    // Warped by whatever's hanging in the sky with them: a cloud that sails
    // straight past a hole in the world is the cheapest way to say the hole
    // isn't real. They're the loosest thing up here, so they're the first thing
    // to lean.
    if (phase !== "night") {
      const cloud = artCanvas(CLOUD);
      for (let i = 0; i < 3; i++) {
        const span = SCENE_W + cloud.w;
        const cx = Math.floor((((t * (3 + i) + i * 70) % span) + span) % span) - cloud.w;
        const at = this.warp(cx + cloud.w / 2, 8 + i * 13 + cloud.h / 2);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(cloud.canvas, Math.round(at.x - cloud.w / 2), Math.round(at.y - cloud.h / 2));
        ctx.globalAlpha = 1;
      }
    }

    this.drawBleed(horizon, t);
  }

  /**
   * The flesh, showing through early.
   *
   * From the first Chihuahua Singularity the top of the sky starts taking on the
   * colour of the thing on the other side of it, deepening with every one you
   * buy until the Ur-Chihuahua is affordable and it's unmistakable. It's over the
   * clouds and the sun rather than under them, because it isn't weather — it's
   * the far side of something, and the things in front of it should be stained
   * by it too.
   *
   * This is the only build-up the fold gets. Without it you buy a rung, nothing
   * acknowledges it, and nine purchases later the world folds with no warning
   * that it was ever going to. It clears the moment the fold lands: what's
   * bleeding through arrives, and this sky goes back to being a sky.
   */
  private drawBleed(horizon: number, t: number): void {
    const looming = clamp(this.view.looming, 0, 1);
    if (looming <= 0) return;
    const ctx = this.ctx;
    // A slow breath on top of the level, so it reads as something alive on the
    // other side rather than as a filter someone left on.
    const pulse = 0.88 + 0.12 * Math.sin(t * 0.42);
    // Front-loaded rather than linear, let alone squared. The whole point is
    // that the *first* Chihuahua Singularity changes something you can see — on a
    // curve that only gets going in the back half, one of them is a tenth of
    // the way to a wash nobody would notice, which is the same as nothing.
    const strength = Math.pow(looming, 0.55) * pulse;

    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, rgba(FLESH_LIT, 0.62 * strength));
    grad.addColorStop(0.5, rgba(FLESH_DEEP, 0.2 * strength));
    grad.addColorStop(1, rgba(FLESH_DEEP, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCENE_W, horizon);

    // And once it's close, the first hint of the vascular seam — the one piece
    // of structure the ceiling has, arriving before the ceiling does.
    if (looming > 0.55) {
      ctx.globalAlpha = 0.16 * (looming - 0.55) / 0.45;
      ctx.fillStyle = FLESH_DEEP;
      const base = Math.round(horizon * 0.3);
      for (let x = 0; x < SCENE_W; x++) {
        ctx.fillRect(x, base + Math.round(2.5 * Math.sin(x / 23) + 1.5 * Math.sin(x / 7 + 2)), 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  /**
   * The far half of the property: three ridges and the deep end of every lot
   * standing on them, drawn back to front so each ridge buries the feet of
   * what's on the one behind it.
   *
   * Interleaving them is the whole reason the depth reads as distance rather
   * than as a second row of buildings floating over the first. A building whose
   * base is cut off by a hill is over that hill.
   */
  private drawDistance(lots: Lot[], phase: Phase, horizon: number, t: number): void {
    const ctx = this.ctx;
    const sky = SKY[phase];
    const scale = Math.min(1, horizon / RIDGE_ROOM);
    // The far ones wash out toward the sky they're seen against, which is the
    // only thing that tells three ridges of the same green apart at night.
    const colors = [mix(sky.hillFar, sky.bottom, 0.4), sky.hillFar, sky.hill];

    for (let i = 0; i < RIDGES.length; i++) {
      // Drawn as 1px columns so the ridge sits on the buffer's grid instead of
      // being antialiased into a smear by a path fill.
      const ridge = RIDGES[i]!;
      for (let x = 0; x < SCENE_W; x++) {
        const h = ridgeAt(ridge, x, scale);
        ctx.fillStyle = colors[i]!;
        ctx.fillRect(x, horizon - h, 1, h);
      }
      // Layer i is the row standing on ridge i, so each ridge goes up under its
      // own row and in front of the row above it.
      this.drawLotLayer(lots, i, phase, t);
    }
  }

  private drawGround(horizon: number, yardY: number): void {
    const ctx = this.ctx;
    const bedding = this.view.bedding;
    // Tired bedding isn't a number on this screen — the ground goes the colour
    // of ground nobody has raked in a while. Churned and going to mud, rather
    // than the parched yellow a field went: hard standing doesn't wither, it
    // gets walked into a mess.
    const dry = 1 - Math.max(0, Math.min(1, bedding));

    ctx.fillStyle = mix(GRAVEL, "#8a7f66", dry);
    ctx.fillRect(0, horizon, SCENE_W, yardY - horizon);

    // Tracks: shallow bands that give the yard a direction to be worked in.
    ctx.fillStyle = mix(GRAVEL_DARK, "#776d57", dry);
    for (let y = horizon + 6; y < yardY; y += 9) ctx.fillRect(0, y, SCENE_W, 2);

    // The front yard: poured concrete, because this is where everything gets
    // set down, walked over and hosed off.
    ctx.fillStyle = CONCRETE;
    ctx.fillRect(0, yardY, SCENE_W, this.sh - yardY);
    // Shade along the back of it, under the fence, where nothing stands. One
    // flat brown from the fence to the bottom of the screen gave the yard no
    // floor at all — everything in it looked stuck to a wall.
    ctx.fillStyle = CONCRETE_DARK;
    ctx.fillRect(0, yardY, SCENE_W, 3);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, yardY + 3, SCENE_W, 3);
    ctx.globalAlpha = 1;
    const rng = mulberry32(this.rngSeed ^ 0x9e37);
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(
        Math.floor(rng() * SCENE_W),
        yardY + 6 + Math.floor(rng() * Math.max(1, this.sh - yardY - 8)),
        2,
        1,
      );
    }

    // The apron: the strip by the gate where everything gets set down and then
    // walked over all day, so it's bare and paler than the rest. It used to be
    // a patch in the corner because the corner was where the pile stood; now
    // that the pile walks about, the worn ground has to go where the traffic
    // does, which is the whole width of the yard.
    const back = this.packBack();
    ctx.fillStyle = "#cdc4ad";
    ctx.fillRect(0, back - 2, SCENE_W, this.sh - back + 2);
    ctx.fillStyle = "#ded5be";
    ctx.fillRect(0, back + 2, SCENE_W, this.sh - back - 2);
    // The drain, down the middle of the apron. One dark line with a pale one
    // under it is all a channel needs, and it's the only thing in the yard that
    // says this floor gets washed rather than swept.
    const drain = Math.round((this.sh + back) / 2);
    ctx.fillStyle = "#7e7a6e";
    ctx.fillRect(0, drain, SCENE_W, 1);
    ctx.fillStyle = "#c8c3b5";
    ctx.fillRect(0, drain + 1, SCENE_W, 1);
  }

  /**
   * The back edge as lots: one per tier, in tier order, each with the art it's
   * standing and how far back it's built.
   *
   * Worked out once a frame and handed to every pass, because a lot is drawn in
   * six slices either side of the ridges, the ceiling and the ground, and they
   * all have to agree about what's where.
   */
  private lots(horizon: number): Lot[] {
    // The lots divide the back edge between them and keep their share whether
    // the tier is bought or not — a kibble arrives in the space that was
    // always the kibble's, and nothing already standing shuffles along.
    const span = SCENE_W - artCanvas(TREE).w - 6;
    const width = Math.floor(span / BACK_TIERS.length);
    const scale = Math.min(1, horizon / RIDGE_ROOM);
    // The lot after the last one you've built on gets staked out. Empty ground
    // isn't dead space — it's the thing you're filling in, the same argument
    // the field makes by ploughing a line across the rows you haven't bought.
    // Only the one, though: four surveyed pads on a mill with no kennels on it
    // reads as a building site rather than as a mill with room to grow.
    const next = BACK_TIERS.findIndex((id) => ((this.view.working[id] ?? 0) + (this.view.broken[id] ?? 0)) <= 0);

    return BACK_TIERS.map((id, i) => {
      const working = this.view.working[id] ?? 0;
      const broken = this.view.broken[id] ?? 0;
      // Dead kit stands at the *back* of the lot, and the one out front only
      // goes grey when there's nothing left working — the building you watch
      // for the upgrade art shouldn't be the one the weather took.
      const depth = lotDepth(working + broken);
      const dead = working <= 0 ? depth : Math.min(depth - 1, Math.round((depth * broken) / (working + broken)));
      const art = this.mark(id);
      const x = 2 + i * width;

      // Where each row stands. Sampled at the lot's middle rather than under
      // each building, so a row comes out as a terrace cut into the hill and
      // not as three kennels following a contour.
      //
      // Every row's feet are strictly higher on the screen than the row in
      // front of it, whatever the ridge under it is doing. Without that rule a
      // tall tier steps back further than the next ridge stands up, and its
      // fourth row comes out standing *in front of* its third.
      const tall = artCanvas(shrunk(art)).h;
      const step = Math.max(LOT_STEP_MIN, Math.round(tall * LOT_STEP));
      const ground: number[] = [];
      let y = horizon + 8;
      for (const [r, row] of LOT_ROWS.entries()) {
        if (r > 0) y -= step;
        if (row.ridge !== undefined) {
          y = Math.min(y, horizon - ridgeAt(RIDGES[row.ridge]!, x + width / 2, scale));
        }
        // Clamped, so a squat landscape sky crowds the lot together rather than
        // posting its far end off the top of the buffer.
        ground.push(Math.max(tall + 1, y));
      }
      return { id, art, x, w: width, depth, dead, ground, pad: depth === 0 && i === next };
    });
  }

  /** The tree, the steam, and the near end of every lot. */
  private drawBack(
    lots: Lot[],
    t: number,
    now: number,
    horizon: number,
    phase: Phase,
  ): void {
    // Steam first, so it comes out from behind the towers rather than over
    // the front of them.
    this.drawPlumes(now);

    this.drawLotLayer(lots, 3, phase, t);
    this.drawLotLayer(lots, 4, phase, t);

    // No groomer. It stood here for a long time as a bookend and it never meant
    // anything — nothing you buy touched it, and it was taking a third of the
    // back edge away from the tiers that do.
    const tree = artCanvas(TREE);
    this.ctx.drawImage(tree.canvas, SCENE_W - tree.w - 3, horizon + 10 - tree.h);

    this.drawLotLayer(lots, 5, phase, t);
  }

  /**
   * One depth of every lot at once, so the whole back edge is drawn in order of
   * distance rather than lot by lot — otherwise a lot's hillside would be drawn
   * over its neighbour's foreground.
   *
   */
  private drawLotLayer(lots: Lot[], layer: number, phase: Phase, t: number): void {
    const ctx = this.ctx;
    // What the distance is seen through: the air over the hills.
    const haze = SKY[phase].hillFar;

    for (const lot of lots) {
      if (lot.pad && layer === LOT[0]!.layer) this.drawPad(lot);
      for (let s = 0; s < lot.depth; s++) {
        const slot = LOT[s]!;
        if (slot.layer !== layer) continue;
        const art = slot.far ? shrunk(lot.art) : lot.art;
        // Dead and distant at once still has to come out as one blit, so the
        // two washes are folded into a single tint rather than stacked.
        const dead = s >= lot.depth - lot.dead;
        const tint = dead ? mix(haze, "#6b6b74", 0.6) : haze;
        const alpha = dead ? Math.max(0.6, slot.haze) : slot.haze;
        const sprite = alpha > 0 ? artTinted(art, tint, alpha) : artCanvas(art);

        const x = lot.x + Math.round(lot.w * slot.at - sprite.w / 2);
        const ground = lot.ground[slot.row]!;
        // A pixel of shadow under the ones up the hill. Without it a hillside
        // is a flat wash of one colour and the buildings on it read as stuck to
        // the sky rather than standing on anything.
        if (slot.far) {
          ctx.fillStyle = `rgba(24, 20, 30, ${0.3 - slot.haze * 0.25})`;
          ctx.fillRect(x, ground - 1, sprite.w, 1);
        }
        // Primed lots light the hillside they stand on, and the ones up the
        // back light it less — a lot of a hundred labs should read as a valley
        // with the lights on, in depth, not as one bright building out front.
        if (!dead) {
          this.primeGlow(lot.id, x, ground - sprite.h, sprite.w, sprite.h, t, s, 1 - slot.haze);
        }

        // Still going up: blit only what's cleared the pad. A source rect, so
        // it's still a 1:1 integer blit — the sprite is cropped, never scaled.
        const raise = this.raiseOf(`${lot.id}:${s}`, t);
        if (raise !== null && raise < 1) {
          const shown = this.drawRaise(raise, x, ground, sprite.w, sprite.h);
          ctx.drawImage(
            sprite.canvas,
            0,
            sprite.h - shown,
            sprite.w,
            shown,
            x,
            ground - shown,
            sprite.w,
            shown,
          );
          // It isn't working yet, so it doesn't light its windows and it
          // certainly doesn't tip anything into the pipeline.
          continue;
        }

        ctx.drawImage(sprite.canvas, x, ground - sprite.h);
        if (dead) continue;

        // Up close you get the industry — lit windows, a flare, a reactor
        // breathing. Further back you get a lamp on and the odd wisp off the
        // roof, because the detail those routines draw is measured in single
        // pixels off the top left corner and half of one is a smudge.
        if (slot.far) this.farLife(x, ground - sprite.h, sprite.w, sprite.h, t, s);
        else this.buildingLife(lot.id, x, ground - sprite.h, sprite.w, sprite.h, t, s);
        // Everything along the back edge stands on the pipeline, and every so
        // often drops something into it. A trickle, not a conveyor: the far
        // side of the property should read as a place that's busy.
        this.pipeEnd = Math.max(this.pipeEnd, x + Math.floor(sprite.w / 2));
        // The building out front tips in about once a second and the ones up
        // the hill less often, or a mill with four full lots feeds the trunk
        // forty times a second and the pipeline reads as solid puppy.
        if (this.chance(1.1 * (1 - slot.haze))) this.feedPipe(x + Math.floor(sprite.w / 2));
      }
    }
  }

  /** A lot with nothing on it yet: ground cleared, footings in, pegs at the corners. */
  private drawPad(lot: Lot): void {
    const ctx = this.ctx;
    const w = artCanvas(lot.art).w;
    const x = lot.x + Math.round(lot.w * 0.5 - w / 2);
    const y = lot.ground[0]!;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = CONCRETE;
    ctx.fillRect(x, y - 3, w, 3);
    ctx.fillStyle = CONCRETE_DARK;
    ctx.fillRect(x, y - 1, w, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    ctx.fillRect(x, y - 6, 1, 4);
    ctx.fillRect(x + w - 1, y - 6, 1, 4);
  }

  /**
   * What a building two fields away does: a light on, and now and then
   * something off the roof. That's all you'd see of one.
   */
  private farLife(x: number, top: number, w: number, h: number, t: number, idx: number): void {
    const beat = Math.sin(t * 1.3 + idx * 2.7);
    if (beat > 0.2) {
      this.ctx.fillStyle = beat > 0.8 ? "#fff0b8" : "#ffd782";
      this.ctx.fillRect(x + 1, top + Math.max(1, h >> 1), 1, 1);
    }
    if (this.chance(0.3)) this.puff(x + (w >> 1), top - 1, "steam", 2);
  }

  /** Which mark of a tier is standing, 0..3. */
  private markLevel(id: solo.SoloProducerId): number {
    return Math.max(0, Math.min(3, this.view.marks[id] ?? 0));
  }

  /** The hundred-owned mark, which is the one that gets its own effects. */
  private primed(id: solo.SoloProducerId): boolean {
    return this.markLevel(id) >= 3;
  }

  /**
   * Light, as a radial fill rather than a sprite.
   *
   * The scene's one hard rule is that every *blit* is integer-aligned and
   * unscaled, because art resampled off the pixel grid loses its outline. A
   * gradient isn't art — the sky and the fold are both painted this way — and
   * light is the one thing on this canvas that has no business having edges.
   */
  private glow(cx: number, cy: number, r: number, color: string, alpha: number): void {
    if (alpha <= 0.02 || r <= 0) return;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(color, alpha));
    grad.addColorStop(0.45, rgba(color, alpha * 0.42));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  /**
   * The halo a primed unit stands in. Drawn *before* its sprite, so the sprite
   * lands crisp on top and what you see is a seam of light around the thing
   * rather than a wash over it.
   *
   * It breathes, on a phase taken from the unit's index — a whole field of them
   * pulsing in lockstep reads as a shader, and the mill is meant to read as a
   * lot of separate machines that happen to all be expensive now.
   */
  private primeGlow(
    id: OutsideId,
    x: number,
    y: number,
    w: number,
    h: number,
    t: number,
    idx = 0,
    scale = 1,
  ): void {
    if (!this.primed(id)) return;
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.5 + idx * 2.3);
    this.glow(
      x + w / 2,
      y + h / 2,
      Math.max(w, h) * 0.8 * scale,
      PRIME_GLOW[id],
      0.3 * pulse * scale * this.lightGain(),
    );
  }

  /**
   * How much a light is worth right now.
   *
   * Full after dark and a third of that at noon, because a glow painted at full
   * strength over a lit field isn't light — it's fog. Held well above zero in
   * daylight anyway: the hundred-owned mark has to be visible at every hour, and
   * in daylight what's left of it reads as heat haze off something expensive.
   */
  private lightGain(): number {
    return { day: 0.34, dusk: 0.7, night: 1 }[this.phase];
  }

  /**
   * What a building on the back edge does while it stands there.
   *
   * Every one of them used to get the same two blinking pixels and the same
   * wisp of steam off the top left corner, which at a glance made the whole
   * skyline one building repeated. They're different industries: the lab is lit
   * and bubbling, the kibble is on fire, the tower is a rack of grow lights
   * cycling, and the reactor is a reactor.
   */
  private buildingLife(
    id: solo.SoloProducerId,
    x: number,
    top: number,
    w: number,
    h: number,
    t: number,
    idx: number,
  ): void {
    const ctx = this.ctx;
    switch (id) {
      case "lab": {
        // Three lit windows on their own phases, and whatever's in the dome.
        for (const [k, c] of [2, 7, 12].entries()) {
          const beat = Math.sin(t * 1.7 + idx * 2.1 + k * 1.9);
          if (beat <= -0.2) continue;
          ctx.globalAlpha = 0.3 + 0.5 * Math.max(0, beat);
          ctx.fillStyle = "#e4fbff";
          ctx.fillRect(x + c, top + 6, 2, 2);
        }
        const glow = 0.5 + 0.5 * Math.sin(t * 1.1 + idx);
        ctx.globalAlpha = 0.2 + 0.35 * glow;
        ctx.fillStyle = "#b6f2fb";
        ctx.fillRect(x + 4, top + 1, 8, 3 - Math.round(glow));
        ctx.globalAlpha = 1;
        if (this.chance(0.5)) this.puff(x + 8, top, "steam", 2);
        break;
      }
      case "kibble": {
        // The flare stack, which is the one thing on the skyline that's alight.
        // Later marks draw a flame into the art, so the live one is anchored to
        // where the stack actually tops out rather than to the top of the
        // sprite — otherwise the upgrade lights a second fire above the first.
        const stack = top + [0, 2, 3, 3][this.markLevel("kibble")]!;
        const flick = fract(Math.sin(t * 11.3 + idx * 4.1) * 4375.85);
        const tall = 2 + Math.round(flick * 2);
        ctx.fillStyle = "#f0913c";
        ctx.fillRect(x + 11, stack - tall, 3, tall);
        ctx.fillStyle = "#ffe08a";
        ctx.fillRect(x + 12, stack - tall + 1, 1, Math.max(1, tall - 1));
        if (this.chance(0.9)) this.puff(x + 12, stack - tall - 1, "steam", 7);
        // Vessel lights down the near tank, running in sequence.
        const lamp = Math.floor(t * 2.2 + idx) % 3;
        ctx.fillStyle = "#ffd782";
        ctx.fillRect(x + 2, top + h - 3 - lamp * 2, 1, 1);
        break;
      }
      case "tower": {
        // A rack of grow lights, cycling floor by floor: the light walks up the
        // tower and starts again, so a row of them ripples.
        const floors = Math.max(1, Math.round((h - 7) / 3));
        const lit = Math.floor(t * 2.6 + idx * 1.7) % floors;
        for (const c of [2, 6]) {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "#e6ffc4";
          ctx.fillRect(x + c, top + 4 + lit * 3, 2, 2);
        }
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#c8f5a0";
        ctx.fillRect(x - 1, top + 3 + lit * 3, w + 2, 4);
        ctx.globalAlpha = 1;
        break;
      }
      case "reactor": {
        // Steam off the tower, continuously. This is the only thing on the mill
        // that draws its own weather.
        if (this.plumes.length < MAX_PLUMES && this.chance(11)) {
          this.plumes.push({
            x: x + w / 2 - 2 + (Math.random() - 0.5) * 6,
            y: top + 1 - Math.random() * 2,
            // Barely any sideways push to start with: it leaves the mouth as a
            // column and only finds the wind once it's clear of the tower.
            vx: (Math.random() - 0.5) * 3,
            vy: -15 - Math.random() * 6,
            born: performance.now(),
            dur: 2600 + Math.random() * 1200,
            size: 3,
          });
        }
        // The core, seen through the throat of the tower, and its bloom.
        // A slow breath with a fast flicker on top of it — a steady glow reads
        // as a light left on, and this is supposed to be a reaction.
        const pulse =
          (0.5 + 0.5 * Math.sin(t * 2.7 + idx * 1.3)) * (0.8 + 0.2 * fract(Math.sin(t * 37 + idx) * 4375.85));
        ctx.fillStyle = "#9dfbe0";
        ctx.globalAlpha = 0.1 + 0.1 * pulse;
        ctx.fillRect(x + 2, top + 3, w - 4, 6);
        ctx.globalAlpha = 0.2 + 0.22 * pulse;
        ctx.fillRect(x + 4, top + 4, w - 8, 4);
        ctx.globalAlpha = 0.5 + 0.5 * pulse;
        ctx.fillRect(x + 5, top + 5, 4, 2);
        // Hazard strobes on the rim, and the light the whole thing throws on
        // the ground it stands on.
        ctx.globalAlpha = 0.08 + 0.07 * pulse;
        ctx.fillRect(x - 1, top + h - 2, w + 2, 2);
        ctx.globalAlpha = 1;
        if ((t * 0.75 + idx * 0.4) % 1 < 0.14) {
          ctx.fillStyle = "#ff5b4a";
          ctx.fillRect(x + 1, top + 1, 1, 1);
          ctx.fillRect(x + w - 2, top + 1, 1, 1);
        }
        break;
      }
      default: {
        // Anything else that ends up back here keeps the old night shift: a
        // lit window and a wisp off the roof.
        if (this.chance(0.45)) this.puff(x + 2, top - 1, "steam");
        const beat = Math.sin(t * 1.4 + idx * 2.3);
        if (beat > 0.1) {
          ctx.fillStyle = beat > 0.75 ? "#fff0b8" : "#ffd782";
          ctx.fillRect(x + 2, top + 2, 2, 1);
        }
      }
    }
  }

  /** Cooling-tower steam: rises, spreads, thins out and is gone. */
  private drawPlumes(now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#eef3f7";
    this.plumes = this.plumes.filter((p) => {
      const age = now - p.born;
      if (age > p.dur) return false;
      const f = age / p.dur;
      p.x += p.vx * this.dt;
      p.y += p.vy * this.dt;
      // It slows as it climbs and leans off downwind, like the real thing.
      p.vy *= 1 - this.dt * 0.35;
      p.vx += this.dt * 2.5;
      const size = p.size + Math.round(f * 4);
      ctx.globalAlpha = 0.6 * (1 - f * f);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, Math.max(1, size - 1));
      ctx.globalAlpha = 1;
      return true;
    });
  }

  // --- The pipeline --------------------------------------------------------
  //
  // Everything on the back edge is a building, and a building doesn't carry
  // things. What it does is pipe them: one run along the foot of the kennels,
  // one riser down the west side of the field, and a spout over the yard. You
  // can see the puppies moving inside it, which is the entire point — the
  // industrial half of the ladder used to prove it was working by lobbing
  // produce over the fence.

  /** Height of the pipe's run above the field, measured off the back baseline. */
  private pipeY(horizon: number): number {
    return horizon + 10;
  }

  private feedPipe(from: number): void {
    if (this.lumps.length >= MAX_LUMPS) return;
    this.lumps.push({ from: Math.max(8, Math.round(from)), d: 0 });
  }

  /**
   * How far through building the pipeline we are, 0..1.
   *
   * Latched the first time anything feeds it, and only if the scene has already
   * drawn a frame without one — the same restore-versus-event rule the fold
   * plays by. Coming back to a mill that already has a pipeline shouldn't put on
   * a three-second show about it.
   */
  private pipeBuild(t: number, reach: number): number {
    if (reach <= 0) {
      // Nothing feeds it. Remember that we saw the mill without one — and drop
      // the latch, so handing the mill down and climbing back to the industrial
      // tiers puts the pipeline in again rather than restoring it.
      this.sawNoPipe = true;
      this.pipeBuiltAt = null;
      return 0;
    }
    if (this.pipeBuiltAt === null) {
      // Already standing on the frame the tab opened: a restore, not an event.
      if (!this.sawNoPipe) return 1;
      this.pipeBuiltAt = t;
    }
    return clamp((t - this.pipeBuiltAt) / PIPE_BUILD_S, 0, 1);
  }

  /**
   * The pipeline, and the three and a half seconds of it being built.
   *
   * Erected in the order a real one would be, because that's what makes it read
   * as construction rather than as a wipe: the riser goes up out of the yard
   * first — it's the piece standing nearest to you — the outfall bolts onto the
   * bottom of it, then the trunk runs out section by section toward the kennels
   * with the trestles going in a beat ahead of it, and last the hopper drops
   * onto the far end. Only then does anything go down it.
   */
  private drawPipeline(horizon: number, yardY: number, dt: number, t: number): void {
    const ctx = this.ctx;
    const y = this.pipeY(horizon);
    // The riser runs right down the west side of the yard to just above the
    // mound, because that's what it's filling. Stopping at the top of the yard
    // meant a chute pointed at forty pixels of empty dirt.
    const foot = Math.max(yardY + 12, this.station(0) - 30);
    const reach = this.lumps.reduce((m, l) => Math.max(m, l.from), this.pipeEnd);
    const build = this.pipeBuild(t, reach);
    if (reach <= 0) return;
    // Nothing rides a pipe that isn't finished. The kennels carry on tipping into
    // it while it's going up, so this is a bin rather than a gate.
    if (build < 1) this.lumps.length = 0;

    // The four beats, each overlapping the next so the sequence flows rather
    // than clicking from stage to stage.
    const ease = (v: number) => 1 - Math.pow(1 - clamp(v, 0, 1), 2);
    const riser = ease(build / 0.26);
    const chute = ease((build - 0.2) / 0.22);
    const run = ease((build - 0.34) / 0.46);
    const hopper = ease((build - 0.78) / 0.16);

    // Everything the industrial half of the mill makes comes down this thing,
    // and for a long time it was a five pixel drainpipe. It's now built like it
    // carries the load: a nine-pixel trunk on trestles, a hopper where the
    // kennels tip into it, collars down the riser and a proper outfall over the
    // yard with the pup visibly falling out of it.
    const body = "#a8b0b8";
    const edge = "#7f8891";
    const dark = "#68707a";
    const W = 9; // outside width of the trunk
    const runTo = 2; // left edge of the riser
    const midY = y + 3; // where the puppies ride inside the run
    // How far out from the riser the trunk has got. The trestle under a section
    // goes in before the section does, which is the whole reason the run reads
    // as being built rather than extruded.
    const runLen = Math.max(1, Math.round(reach * run));
    const posts = Math.round(reach * clamp(run * 1.18, 0, 1));

    // Trestles under the horizontal run, so it's carried rather than floating.
    ctx.fillStyle = dark;
    for (let px = 22; px < reach - 6; px += 26) {
      if (px > posts) break;
      ctx.fillRect(px, y + W, 1, 5);
      ctx.fillRect(px + 4, y + W, 1, 5);
      ctx.fillRect(px - 1, y + W + 5, 7, 1);
    }

    // The run: dark rims top and bottom, lit body, and a highlight line along
    // the top so it reads as a tube and not a rectangle.
    if (run > 0) {
      ctx.fillStyle = edge;
      ctx.fillRect(1, y, runLen, W);
      ctx.fillStyle = body;
      ctx.fillRect(1, y + 1, runLen, W - 3);
      ctx.fillStyle = "#c3cad1";
      ctx.fillRect(1, y + 1, runLen, 1);
      // Seams, every so often along the run.
      ctx.fillStyle = dark;
      for (let px = 14; px < runLen - 2; px += 18) ctx.fillRect(px, y, 1, W);
      // The welder working the leading edge, and the dust it throws down onto
      // the field. Only while it's actually running out.
      if (run < 1) {
        ctx.fillStyle = fract(t * 13) > 0.4 ? "#fff0b8" : "#ffb454";
        ctx.fillRect(runLen, y + 2, 2, 3);
        if (this.chance(14)) this.puff(runLen, y + W + 2, "dust", (Math.random() - 0.5) * 20);
      }
    }

    // The hopper at the far end, where the kennels tip in: a funnel wider than
    // the pipe, so the run has somewhere to have come from. It comes down onto
    // the trunk once the trunk has got there.
    if (hopper > 0) {
      const hx = Math.min(SCENE_W - 3, reach);
      const drop = Math.round((1 - hopper) * 12);
      ctx.fillStyle = dark;
      ctx.fillRect(hx - 10, y - 6 - drop, 12, 1);
      ctx.fillStyle = body;
      for (let i = 0; i < 5; i++) ctx.fillRect(hx - 9 + i, y - 5 - drop + i, 11 - i * 2, 1);
    }

    // The riser, with collars. Erected from the yard upward, because that's the
    // way you put a standpipe in and it's the beat that starts the sequence.
    const top = Math.round(foot - (foot - y) * riser);
    ctx.fillStyle = edge;
    ctx.fillRect(runTo - 1, top, W, foot - top);
    ctx.fillStyle = body;
    ctx.fillRect(runTo, top, W - 2, foot - top);
    ctx.fillStyle = "#c3cad1";
    ctx.fillRect(runTo, top, 1, foot - top);
    ctx.fillStyle = dark;
    for (let cy = y + 14; cy < foot - 8; cy += 16) {
      if (cy < top) continue;
      ctx.fillRect(runTo - 2, cy, W + 2, 2);
    }
    if (riser < 1 && this.chance(12)) {
      this.puff(runTo + 4, foot - 2, "dust", (Math.random() - 0.5) * 18);
    }

    // The outfall: a chute, angled the way the puppies actually leave. It was
    // drawn as a right-angled box with a lip, and the pup came out of it on a
    // diagonal — the pipe was telling you one thing and the puppies another.
    const chuteLen = Math.round(CHUTE_LEN * chute);
    for (let i = 0; i < chuteLen; i++) {
      const cx = runTo + i;
      const cy = Math.round(foot - 4 + i * CHUTE_SLOPE);
      ctx.fillStyle = dark;
      ctx.fillRect(cx, cy, 1, 1);
      ctx.fillRect(cx, cy + 8, 1, 1);
      ctx.fillStyle = body;
      ctx.fillRect(cx, cy + 1, 1, 7);
      ctx.fillStyle = "#c3cad1";
      ctx.fillRect(cx, cy + 1, 1, 1);
      // A couple of bands across it, like the riser's collars.
      if (i === 5 || i === 10) {
        ctx.fillStyle = dark;
        ctx.fillRect(cx, cy, 1, 9);
      }
    }
    // The open end, squared off so it reads as a mouth and not a broken pipe.
    const endX = runTo + chuteLen;
    const endY = Math.round(foot - 4 + chuteLen * CHUTE_SLOPE);
    ctx.fillStyle = dark;
    ctx.fillRect(endX, endY, 1, 9);

    if (build < 1) return;

    // Commissioning: one flash down the whole length of it as the last bolt
    // goes in. It's the only thing that says *finished*, and without it the
    // build just stops.
    const done = (t - (this.pipeBuiltAt ?? 0) - PIPE_BUILD_S) / 0.45;
    if (done >= 0 && done < 1) {
      ctx.fillStyle = rgba("#fff0b8", 0.5 * (1 - done));
      ctx.fillRect(1, y - 1, reach, W + 2);
      ctx.fillRect(runTo - 2, y, W + 2, foot - y);
    }

    // Whole puppies in the pipe, not tan squares: outlined, so a hundred of
    // them nose to tail still reads as a hundred puppies rather than a stripe.
    const pup = artCanvas(PUPPY_SPRITE);
    this.lumps = this.lumps.filter((lump) => {
      lump.d += PIPE_SPEED * dt;
      const across = lump.from - runTo;
      if (lump.d < across) {
        // Along the run, riding with a one pixel jog so the contents rattle
        // rather than slide.
        const px = Math.round(lump.from - lump.d);
        ctx.drawImage(pup.canvas, px, midY - 2 + (px % 5 === 0 ? 0 : 1));
        return true;
      }
      const down = y + 2 + (lump.d - across);
      if (down < foot - 3) {
        ctx.drawImage(pup.canvas, runTo, Math.round(down));
        return true;
      }
      // Down the chute and off the end onto the pile. It's already in the
      // yard's count — this is just the last thing you see it do.
      const out = down - (foot - 3);
      if (out > CHUTE_LEN + 6) {
        this.puff(runTo + CHUTE_LEN, endY + 8, "dust");
        return false;
      }
      ctx.drawImage(
        pup.canvas,
        runTo + Math.round(out),
        Math.round(foot - 3 + out * CHUTE_SLOPE),
      );
      return true;
    });
  }

  private drawField(t: number, now: number, horizon: number, yardY: number): void {
    const ctx = this.ctx;
    const rng = mulberry32(this.rngSeed);
    const top = horizon + 12;
    const depth = Math.max(20, yardY - top - 4);

    /** Ground-level y for a lane given as a fraction of the field's depth. */
    const lane = (f: number) => top + Math.round(depth * f);

    // The field.
    //
    // The land is all there from the first frame: five worked rows, full width,
    // waiting. Buying a Puppy Pen pups one bed in it. Before, the rows were
    // sized to the pup and the pup was a log curve on the owned count, which
    // meant the field's shape was a readout — and a readout that spent most of
    // the game with the front half of the ground left as lawn. Empty runs
    // are not dead space, they're the thing you're filling in, and one pen
    // buying one visible pup is a straighter line between the button and the
    // mill than any curve was.
    const stages = growthStages(this.mark("pen"));
    const pup = artCanvas(this.mark("pen"));
    const wiltShare = 1 - this.view.bedding;
    const step = pup.w + 1;
    // Wide, but leaving a rig's width of headland at each end: the heatlamp
    // stands off the ends of the rows it waters, and a row that runs to the
    // screen edge has nowhere to put it.
    const marginX = 16;
    const usable = SCENE_W - marginX * 2;
    const perRow = Math.max(3, Math.floor(usable / step));
    const slots = perRow * FIELD_ROWS;
    // One pen, one bed, until the land runs out — which it does at ninety
    // pens, deep into a run and well past the point where the field stopped
    // being the thing you're watching.
    const pups = Math.min(slots, this.view.working.pen ?? 0);
    const rowWidth = perRow * step - 1;
    const rowLeft = marginX + Math.round((usable - rowWidth) / 2);

    // Evenly through the band, the last row stopping short of the fence to
    // leave the headland the machines turn on.
    const rowGround = (r: number) => lane(0.08 + (r * 0.78) / (FIELD_ROWS - 1));

    // A little ambient green around the edges of the worked ground: weeds are
    // what ground nobody is working does.
    const tuft = artCanvas(TUFT);
    const flowers = artCanvas(FLOWERS);
    for (let i = 0; i < 14; i++) {
      const sprite = rng() < 0.3 ? flowers : tuft;
      const x = Math.floor(rng() * (SCENE_W - sprite.w));
      const foot = lane(rng());
      ctx.drawImage(sprite.canvas, x, foot - sprite.h);
    }

    this.beds.length = 0;
    this.rows.length = 0;
    this.drawTills(now);

    // The trough gets sited before anything is drawn into it, because the
    // machines above need to know where they're aiming.
    // Everything the field produces goes in the trough — the machines tip
    // baskets for the crew to carry over, and the crew's own pickings go in the
    // same place. So it's there as soon as anybody's working, not just when
    // there's a machine.
    const works =
      (this.view.working.van ?? 0) +
        (this.view.working.groomer ?? 0) +
        (this.view.working.hand ?? 0) >
        0 || this.troughFill > 0;
    this.troughBox = works ? { x: 26, w: 112, y: lane(0.99) } : null;

    for (let r = 0; r < FIELD_ROWS; r++) {
      const count = Math.max(0, Math.min(perRow, pups - r * perRow));
      const left = rowLeft;
      const ground = rowGround(r);
      this.rows.push({ y: ground, left, right: left + rowWidth });

      // Worked bedding under the beds you own, and the rest of the row left as
      // grass with the run line still marked out across it. Working the
      // whole row regardless made a new mill look like six enormous empty
      // planters; a marked-out line reads as the land being there and waiting,
      // which is what it is.
      const worked = count > 0 ? count * step + 1 : 0;
      // The run each pen stands on: a poured pad, not a bed of soil. Which is
      // what a row of pens actually is, and it keeps the last of the brown off
      // the part of the picture the dogs are standing on.
      ctx.fillStyle = this.view.bedding < 0.7 ? "#8e8878" : "#bab5a6";
      ctx.fillRect(left - 2, ground - 2, worked, 3);
      ctx.fillStyle = "#8a8476";
      ctx.fillRect(left - 2, ground + 1, worked, 1);
      // The staked-out rest of the row: the marker telling you the beds you
      // haven't bought yet are still there.
      ctx.fillStyle = GRAVEL_DARK;
      for (let c = count; c < perRow; c++) ctx.fillRect(left + c * step, ground, step - 2, 1);

      // A hundred pens is a pup that glows in the dark. One band the length
      // of the row rather than a halo per pup: at ninety beds the haloes
      // would merge into a single wash anyway, and cost ninety gradients a
      // frame to arrive at it.
      if (count > 0 && this.primed("pen")) {
        const lit = (0.7 + 0.3 * Math.sin(t * 1.2 + r)) * this.lightGain();
        const band = ctx.createLinearGradient(0, ground - pup.h - 3, 0, ground + 2);
        band.addColorStop(0, rgba(PRIME_GLOW.pen, 0));
        band.addColorStop(0.65, rgba(PRIME_GLOW.pen, 0.26 * lit));
        band.addColorStop(1, rgba(PRIME_GLOW.pen, 0));
        ctx.fillStyle = band;
        ctx.fillRect(left - 3, ground - pup.h - 3, worked + 2, pup.h + 5);
      }

      for (let c = 0; c < count; c++) {
        const i = r * perRow + c;
        const x = left + c * step;
        // Deterministic per pup rather than drawn from the layout's rng
        // stream, so wilt doesn't reshuffle when the field changes size.
        const dry = fract(Math.sin(i * 12.9898) * 43758.5453) < wiltShare;
        this.beds.push({ x, y: ground, row: r, dry });

        // Neighbours come on together: the stagger is a smooth function of where
        // the pup stands, so the field comes on in patches like a real one
        // instead of flickering at random.
        this.stocked[i] ??= t - GROW_SECONDS * (0.5 + 0.5 * Math.sin(c * 0.7 + r * 2.1));

        const age = t - this.stocked[i]!;
        const stage =
          age >= GROW_SECONDS ? 3 : age >= GROW_SECONDS * 0.6 ? 2 : age >= GROW_SECONDS * 0.25 ? 1 : 0;
        // Wilt keeps the mark's silhouette and loses its colour, so an upgraded
        // bed still reads as an upgraded bed while it's struggling.
        const art = stages[stage]!;
        const sprite = artCanvas(dry ? scruffy(art) : art);
        // A 1px sway on a slow sine, offset along the row — the whole field
        // leans together in a wave, which is cheap and reads as wind.
        const sway = Math.sin(t * 1.1 + c * 0.4 + r) > 0.6 ? 1 : 0;
        ctx.drawImage(sprite.canvas, x + sway, ground - sprite.h);

        if (!dry && age > GROW_SECONDS + RIPE_SECONDS) this.lift(i, t);
      }
    }

    // A lamp stands at the end of the rows it warms, alternating sides, and
    // throws across them. A lamp in the middle of nowhere was just a pole.
    const lamps = shownCount(this.view.working.heatlamp ?? 0, PLACEMENT.heatlamp.cap, PLACEMENT.heatlamp.spread);
    const lamp = artCanvas(this.mark("heatlamp"));
    for (let i = 0; i < lamps; i++) {
      const row = this.rows[i % Math.max(1, this.rows.length)];
      const side = i % 2 === 0 ? 1 : -1;
      const x = row
        ? side > 0
          ? Math.min(SCENE_W - lamp.w - 2, row.right + 3)
          : Math.max(2, row.left - lamp.w - 3)
        : 14 + i * 42;
      const ground = row ? row.y : lane(0.2);
      this.primeGlow("heatlamp", x, ground - lamp.h, lamp.w, lamp.h, t, i);
      ctx.drawImage(lamp.canvas, x, ground - lamp.h);
      // The warm spills out over the pens on a slow sine, so it reads as
      // one lamp swinging rather than a static glow.
      if (this.chance(5)) {
        const reach = 10 + (0.5 + 0.5 * Math.sin(t * 0.8 + i)) * 22;
        this.puff(x + lamp.w / 2, ground - lamp.h + 2, "water", -side * reach);
      }
    }

    // Machines work the rows: they drive the headland just in front of a row,
    // reach back over it, and something happens to the pup as they pass.
    for (const [id, fallback] of [
      ["van", 0.5],
      ["groomer", 0.78],
    ] as const) {
      const place = PLACEMENT[id];
      const n = shownCount(this.view.working[id] ?? 0, place.cap, place.spread);
      const sprite = artCanvas(this.mark(id));
      const span = SCENE_W + sprite.w;
      for (let i = 0; i < n; i++) {
        // The grooming rig takes the rows from the front, the van from the back,
        // so on a mill with two rows they aren't nose to tail on the same one.
        // With nothing stocked they fall back to their own lanes on open grass.
        const pick =
          id === "groomer" ? this.rows.length - 1 - (i % Math.max(1, this.rows.length)) : i % Math.max(1, this.rows.length);
        const row = this.rows.length > (id === "groomer" && this.rows.length < 2 ? 1 : 0) ? this.rows[pick] : undefined;
        const ground = row ? row.y + 5 : lane(fallback);
        // Phase and pace are hashed per machine rather than dealt out evenly.
        // Evenly spaced starts at one shared speed drew two perfect diagonals
        // — the vans going one way down the rows and the grooming rigs the
        // other — and a mill that renders a clean X across itself all day is
        // clearly a formula and not a place where work is happening.
        const h = fract(Math.sin((i + 1) * (id === "groomer" ? 63.7 : 21.3)) * 4375.85);
        const pace = place.speed! * (0.78 + 0.44 * fract(h * 7.13));
        const x = Math.floor((((t * pace + h * span) % span) + span) % span) - sprite.w;
        // Where it's drawn, once anything hanging over the field has had its
        // say. The work it does is off `x` and `ground` regardless: a van
        // being lifted out of the row still ploughs the row.
        const at = this.warp(x + sprite.w / 2, ground - sprite.h / 2);
        const mx = Math.round(at.x - sprite.w / 2);
        const my = Math.round(at.y - sprite.h / 2);
        this.primeGlow(id, mx, my, sprite.w, sprite.h, t, i);
        ctx.drawImage(sprite.canvas, mx, my);
        if (this.chance(2.5)) this.puff(x + 1, ground - 2, "dust");

        if (id === "van") {
          // A van does a round. The track it leaves is the whole reason to
          // watch one cross a field.
          if (this.tracks.length < 90 && this.chance(14)) {
            this.tracks.push({ x: x + 1, y: ground - 1, born: now });
          }
        }

        // Both of them lift what's ready under the header as they pass, and
        // both of them unload the same way a real one does: an auger swung out
        // over the trough, with the pup visibly going down it.
        const reach = id === "groomer" ? 6 : 2;
        const key = `${id}${i}`;
        for (let b = 0; b < this.beds.length; b++) {
          const bed = this.beds[b]!;
          if (bed.dry || Math.abs(bed.y - (ground - 5)) > 3) continue;
          if (bed.x < x - reach || bed.x > x + sprite.w + reach) continue;
          if (this.readiness(b, t) < 1) continue;
          this.lift(b, t);
          this.machineLoad.set(key, (this.machineLoad.get(key) ?? 0) + 1);
        }
        // Full up: tip it out at the end of the row it's working and carry on.
        // A basket on the headland is a job for somebody, which is the point —
        // the machines and the crew are the same operation now.
        if ((this.machineLoad.get(key) ?? 0) >= MACHINE_LOAD && this.baskets.length < MAX_BASKETS) {
          this.machineLoad.set(key, 0);
          // Nobody to fetch it: a mill with machines and no crew tips straight
          // into the trough rather than leaving baskets out in the rain forever.
          if (this.hands.length === 0) {
            this.troughFill = Math.min(TROUGH_CAP, this.troughFill + BASKET_WORTH);
            continue;
          }
          // Just inside the end of the row, not past it: a basket half off the
          // side of the screen is a basket nobody sees get fetched.
          const at = row
            ? clamp(row.right - 8, 4, SCENE_W - 14)
            : clamp(x + sprite.w, 4, SCENE_W - 14);
          this.baskets.push({
            id: this.basketId++,
            x: at + (this.baskets.length % 3) * 3,
            y: ground + 3,
            born: now,
          });
          this.puff(at + 4, ground + 2, "dust");
        }
      }
    }

    // Everything broken is parked in one row along the fence, greyed out. One
    // strip of dead machinery is a thing you notice from across the room; the
    // same units scattered among the working ones is not.
    let deadX = 6;
    for (const id of ORDER) {
      const place = PLACEMENT[id];
      if (place.band === "sky" || place.band === "back") continue;
      const brokenN = shownCount(this.view.broken[id] ?? 0, place.cap, place.spread);
      for (let i = 0; i < brokenN; i++) {
        const dead = artTinted(this.mark(id), "#6b6b74", 0.62);
        if (deadX + dead.w > SCENE_W - 6) break;
        ctx.drawImage(dead.canvas, deadX, lane(0.99) - dead.h);
        deadX += dead.w + 3;
      }
    }

    // The sky tiers, above everything on the ground — and each of them doing
    // its own job to the field below rather than sliding past it.
    const { deck, hang } = this.decks(horizon);

    this.stepFlyers(
      shownCount(this.view.working.zeppelin ?? 0, PLACEMENT.zeppelin.cap, PLACEMENT.zeppelin.spread),
      artCanvas(this.mark("zeppelin")),
      t,
      deck,
    );

    // The orbital kennels, crossing. Everything up here gets its own pace, its own
    // altitude and its own slow wander off a hash, so it doesn't fly in
    // formation — but *only* off a hash meant nothing kept two of them apart,
    // and a hash that deals two of them the same corner and near enough the same
    // speed parks them on top of each other for a minute at a time. So the hash
    // is the variation now and the spacing is dealt: each index owns a share of
    // the sky, and the hash moves it around inside its share.
    const place = PLACEMENT.orbital;
    const n = shownCount(this.view.working.orbital ?? 0, place.cap, place.spread ?? 1);
    const sprite = artCanvas(this.mark("orbital"));
    for (let i = 0; i < n; i++) {
      const h = skyHash(i, "orbital");
      const h2 = fract(h * 137.7);
      const h3 = fract(h2 * 91.3);
      // Off `cap` rather than `n`, so buying the fourth orbital kennel doesn't
      // shuffle the three already up there.
      const span = SCENE_W + sprite.w;
      // A tenth either side of the tier's speed. Wide enough that they pull
      // apart and drift back together over a couple of minutes, narrow enough
      // that a lap doesn't close the quarter-screen gap they start with — the
      // old spread was two to one, which caught the one in front up inside a
      // single crossing.
      const pace = (place.speed ?? 1) * (0.9 + 0.2 * h);
      const start = (i / place.cap + h2 * 0.12) * span;
      const gx = Math.floor((((t * pace + start) % span) + span) % span) - sprite.w;
      // Its own lane in the middle deck, plus a slow rise and fall across it —
      // they drift through each other's altitude rather than flying in a stack,
      // without ever climbing into what's hanging above them.
      const room = Math.max(0, deck - sprite.h - 3 - hang);
      const lane = hang + Math.round(h3 * room);
      const gy = lane + Math.round(Math.sin(t * (0.25 + h2 * 0.4) + h * 9) * 3);
      // And then whatever the sky is doing to it. A orbital kennel that passes
      // under a diving singularity gets leaned on and let go.
      const at = this.warp(gx + sprite.w / 2, gy + sprite.h / 2);
      const x = Math.round(at.x - sprite.w / 2);
      const y = Math.round(at.y - sprite.h / 2);
      this.primeGlow("orbital", x, y, sprite.w, sprite.h, t, i);
      ctx.drawImage(sprite.canvas, x, y);

      // The orbital kennel runs a grow-light down onto the rows in sweeps.
      const cycle = (t * 0.14 + i * 0.37) % 1;
      if (cycle < 0.22) this.drawBeam(x + sprite.w / 2, y + sprite.h, t, cycle / 0.22);
    }

    this.stepDrops(t);
    this.stepTrough(now);
  }

  /**
   * The singularities, wherever this frame's dive has left them.
   *
   * Drawn last of anything in the world, because a dive takes one down through
   * the pipeline, the fence and the crew, and every one of those passing in
   * front of it made it a sticker on the back of the picture. It isn't standing
   * in the mill — it's a hole between you and the mill, and it should occlude
   * whatever it comes down over.
   */
  private drawWells(t: number): void {
    const hole = artCanvas(this.mark("singularity"));
    // Before the holes, so what's going round one passes behind it and is gone
    // rather than sitting on top of the thing eating it.
    this.stepCaught();
    for (const [i, well] of this.wells.entries()) {
      this.drawPulse(well.cx, well.cy, t + i, 1 + well.dive * 1.6);
      this.primeGlow("singularity", well.x, well.y, hole.w, hole.h, t, i);
      this.ctx.drawImage(hole.canvas, well.x, well.y);
    }
  }

  /** What the holes are holding, going round and going in. */
  private stepCaught(): void {
    const ctx = this.ctx;
    this.caught = this.caught.filter((c) => {
      const well = this.wells[c.well];
      // Whatever had it isn't on the canvas any more, so neither is this.
      if (!well) return false;
      const step = catchOrbit(c.r, this.dt);
      c.r = step.r;
      c.a += step.turn;
      const tilt = catchTilt(c.r);
      const x = well.cx + Math.cos(c.a) * c.r;
      const y = well.cy + Math.sin(c.a) * c.r * tilt;
      // The last couple of pixels are the thing going in: one lit pixel where
      // it went, and then nothing.
      if (c.r <= 3) {
        ctx.fillStyle = "#f0e0ff";
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        return false;
      }
      const sprite = artCanvas(c.art);
      const fade = Math.min(1, (c.r - 3) / 5);
      // A pixel of the pull streaming off behind it, back along the orbit it
      // just came round. Without it a basket on a wide first lap reads as a basket
      // that happens to be hanging in the air.
      ctx.fillStyle = rgba("#c9a4f0", 0.45 * fade);
      for (const back of [0.4, 0.8]) {
        const bx = well.cx + Math.cos(c.a - back) * (c.r + 2);
        const by = well.cy + Math.sin(c.a - back) * (c.r + 2) * tilt;
        ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      }
      ctx.globalAlpha = fade;
      ctx.drawImage(sprite.canvas, Math.round(x - sprite.w / 2), Math.round(y - sprite.h / 2));
      ctx.globalAlpha = 1;
      return true;
    });
  }

  /** Furrow behind a van: fresh dark bedding that grasses back over. */
  private drawTills(now: number): void {
    const ctx = this.ctx;
    this.tracks = this.tracks.filter((track) => {
      const age = now - track.born;
      if (age > TRACK_MS) return false;
      ctx.globalAlpha = 0.55 * (1 - age / TRACK_MS);
      ctx.fillStyle = CONCRETE_DARK;
      ctx.fillRect(Math.round(track.x), Math.round(track.y), 3, 2);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  /**
   * The zeppelins, flying. Each one dashes to a patch that needs bringing on,
   * stops over it, empties its hopper into it, and picks somewhere else.
   *
   * The dash eases in and out, which is what makes it read as a machine going
   * somewhere on purpose rather than a cloud being blown about: it leans on,
   * runs, and settles.
   */
  private stepFlyers(
    n: number,
    sprite: { w: number; h: number; canvas: CanvasImageSource },
    t: number,
    deck: number,
  ): void {
    const ctx = this.ctx;
    // The bottom of the sky, and the bottom of what a zeppelin is allowed to
    // climb to: they work the rows, so they belong under the traffic.
    const band = { top: Math.round(deck * 0.5), bottom: Math.max(2, deck - sprite.h) };
    while (this.flyers.length < n) this.flyers.push(this.newFlyer(sprite.w, band));
    if (this.flyers.length > n) this.flyers.length = Math.max(0, n);

    for (const [i, f] of this.flyers.entries()) {
      if (f.hold > 0) {
        // Parked. It bobs on the spot and drips, and the drops are aimed at
        // whatever's underneath rather than halfway across the field.
        f.hold -= this.dt;
        f.drip -= this.dt;
        if (f.drip <= 0) {
          f.drip = 0.22 + Math.random() * 0.16;
          if (this.drops.length < 24) this.dropPupNear(f.x + sprite.w / 2, f.y + sprite.h);
        }
        if (f.hold <= 0) this.aimFlyer(f, sprite.w, band);
      } else {
        f.t += this.dt;
        const p = Math.min(1, f.t / f.dur);
        // Ease in and out of the dash.
        const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
        f.x = f.x0 + (f.tx - f.x0) * e;
        f.y = f.y0 + (f.ty - f.y0) * e;
        if (p >= 1) {
          f.hold = FLY_HOLD + Math.random() * 3.6;
          f.drip = 0.1;
        }
      }
      const bob = f.hold > 0 ? Math.round(Math.sin(t * 3.1 + f.x) * 1) : 0;
      // Warped where it's drawn rather than where it's flying: a zeppelin caught
      // by a passing singularity gets dragged off its patch and lands back on it
      // afterwards, instead of losing the run it was in the middle of.
      const at = this.warp(f.x + sprite.w / 2, f.y + bob + sprite.h / 2);
      const fx = Math.round(at.x - sprite.w / 2);
      const fy = Math.round(at.y - sprite.h / 2);
      this.primeGlow("zeppelin", fx, fy, sprite.w, sprite.h, t, i);
      ctx.drawImage(sprite.canvas, fx, fy);
    }
  }

  private newFlyer(w: number, band: { top: number; bottom: number }): Flyer {
    const x = Math.random() * (SCENE_W - w);
    const y = band.top + Math.random() * Math.max(0, band.bottom - band.top);
    const f: Flyer = { x, y, x0: x, y0: y, tx: x, ty: y, t: 0, dur: 1, hold: 0, drip: 0 };
    this.aimFlyer(f, w, band);
    return f;
  }

  /**
   * Send a zeppelin somewhere worth going: over the patch that needs it most, and
   * not over one another zeppelin is already working.
   *
   * The neediest bed is the neediest bed for all five of them at once, so aiming
   * on need alone sent the whole fleet to the same corner and left them hovering
   * there in a heap. Picking the neediest of a handful of *candidates that
   * nothing else is sitting on* keeps them working the field they're supposed to
   * be working, spread across it.
   */
  private aimFlyer(f: Flyer, w: number, band: { top: number; bottom: number }): void {
    let tx = Math.random() * (SCENE_W - w);
    if (this.beds.length > 0) {
      const taken = this.flyers.filter((o) => o !== f).map((o) => o.tx);
      /** Ripest wins, but anything under another zeppelin is worth much less. */
      const worth = (i: number) => {
        const x = clamp((this.beds[i]?.x ?? 0) - w / 2, 0, SCENE_W - w);
        const crowded = taken.some((o) => Math.abs(o - x) < w + 6);
        return (this.stocked[i] ?? 0) - (crowded ? 1e6 : 0);
      };
      let pick = Math.floor(Math.random() * this.beds.length);
      for (let i = 0; i < 7; i++) {
        const other = Math.floor(Math.random() * this.beds.length);
        if (worth(other) > worth(pick)) pick = other;
      }
      tx = clamp((this.beds[pick]?.x ?? tx) - w / 2, 0, SCENE_W - w);
    }
    f.x0 = f.x;
    f.y0 = f.y;
    f.tx = tx;
    // It changes height as it goes, and by enough to see — a leg should be able
    // to be a climb or a dive. Taken off where it already is rather than off
    // the whole band, so the move is relative to the machine that's making it
    // instead of a fresh draw from the whole sky every time.
    f.ty = clamp(f.y + (Math.random() - 0.5) * 34, band.top, band.bottom);
    f.t = 0;
    f.hold = 0;
    f.dur = Math.max(1, Math.hypot(f.tx - f.x, f.ty - f.y) / FLY_SPEED);
  }

  /**
   * Aim a drop at a pen that could use one, near where it was let go: a
   * zeppelin that stopped somewhere on purpose drops on what it's standing over.
   * A hovering machine whose drops all sail off to the far side of the yard is
   * a machine that didn't need to stop.
   */
  private dropPupNear(x: number, y: number): void {
    if (this.beds.length === 0) return;
    let pick = -1;
    let best = Infinity;
    for (let i = 0; i < 8; i++) {
      const other = Math.floor(Math.random() * this.beds.length);
      const bed = this.beds[other];
      if (!bed) continue;
      // Nearest to the nozzle, with a nudge towards the ones furthest behind.
      const score = Math.abs(bed.x + 3 - x) - (this.clock - (this.stocked[other] ?? 0)) * 0.4;
      if (score < best) {
        best = score;
        pick = other;
      }
    }
    if (pick < 0) return;
    this.drops.push({ x, y, vy: 30 + Math.random() * 12, pup: pick });
  }

  /** Drops falling, and what they do when they land. */
  private stepDrops(t: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#e6d78a";
    this.drops = this.drops.filter((drop) => {
      drop.y += drop.vy * this.dt;
      const bed = this.beds[drop.pup];
      if (!bed || drop.y >= bed.y) {
        if (bed) {
          // Brought on by a quarter of its cycle, and a puff where it landed.
          this.stocked[drop.pup] = Math.min(t, (this.stocked[drop.pup] ?? t) - GROW_SECONDS * 0.25);
          this.puff(bed.x + 3, bed.y - 2, "water");
        }
        return false;
      }
      // Drift toward the pen it's aimed at, so the drop reads as deliberate.
      drop.x += (bed.x + 3 - drop.x) * Math.min(1, this.dt * 1.6);
      // Unless something with more of an opinion is in the way. It still lands
      // where it was aimed — the drop falls the whole time, it just takes a
      // detour around whatever came down over the yard.
      const at = this.warp(drop.x, drop.y);
      ctx.fillRect(Math.round(at.x), Math.round(at.y), 1, 2);
      return true;
    });
  }

  /** A floodlight sweeping down from an orbital kennel onto the rows. */
  private drawBeam(x: number, y: number, t: number, progress: number): void {
    const ctx = this.ctx;
    const row = this.rows[this.rows.length - 1];
    const floor = row ? row.y : this.yardTop() - 6;
    if (floor <= y) return;
    // Fades in and out over the sweep rather than snapping on.
    ctx.globalAlpha = 0.16 * Math.sin(progress * Math.PI);
    ctx.fillStyle = "#d8f5b0";
    const half = 3;
    ctx.fillRect(Math.round(x) - half, Math.round(y), half * 2, Math.round(floor - y));
    ctx.globalAlpha = 1;
    // Anything under it comes on a little, which is the point of the thing.
    if (this.chance(3)) {
      for (let b = 0; b < this.beds.length; b++) {
        const bed = this.beds[b]!;
        if (Math.abs(bed.x + 3 - x) > half + 2) continue;
        this.stocked[b] = Math.min(t, (this.stocked[b] ?? t) - GROW_SECONDS * 0.06);
      }
    }
  }

  /** The singularity, breathing. Four points on the grid, no rotation. */
  private drawPulse(cx: number, cy: number, t: number, scale = 1): void {
    const ctx = this.ctx;
    const phase = (t * 0.55) % 1;
    const r = Math.round((4 + phase * 9) * scale);
    ctx.globalAlpha = 0.5 * (1 - phase);
    ctx.fillStyle = "#c9a4f0";
    for (const [dx, dy] of [
      [0, -r],
      [0, r],
      [-r, 0],
      [r, 0],
    ] as const) {
      ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Dust, steam and water, drawn between the field and the fence. */
  private drawPuffs(now: number, dt: number): void {
    const ctx = this.ctx;
    this.puffs = this.puffs.filter((p) => {
      const age = now - p.born;
      if (age > p.dur) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 0.7 * (1 - age / p.dur);
      ctx.fillStyle = p.color;
      // The loosest thing on the ground, so the first thing off it.
      const at = this.warp(p.x, p.y);
      ctx.fillRect(Math.round(at.x), Math.round(at.y), p.size, p.size);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawFence(yardY: number): void {
    const ctx = this.ctx;
    const fence = artCanvas(FENCE);
    const top = yardY - fence.h + 1;
    for (let x = 0; x < SCENE_W; x += fence.w) {
      ctx.drawImage(fence.canvas, x, top);
    }

    // Bunting. Somebody climbed up and tied this on, which is a fact about the
    // people running the place and the cheapest one the scene can state.
    //
    // Drawn rather than blitted per flag: it's a string with a sag in it, and
    // the sag is the whole difference between bunting and a row of triangles.
    // Two cosines an octave apart keep the dip from repeating on the tile.
    const flag = artCanvas(FLAG);
    ctx.fillStyle = rgba(INK, 0.55);
    for (let x = 0; x < SCENE_W; x++) {
      ctx.fillRect(x, top - 5 + this.sag(x), 1, 1);
    }
    for (let i = 0; i * FLAG_STEP < SCENE_W; i++) {
      const x = i * FLAG_STEP;
      ctx.fillStyle = BUNTING[i % BUNTING.length]!;
      const y = top - 4 + this.sag(x);
      for (let r = 0; r < flag.h; r++) {
        const row = FLAG.rows[r]!;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "f") ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
  }

  /** How far the bunting dips at `x`. Small: it's a string, not a washing line. */
  private sag(x: number): number {
    return Math.round(1.5 + 1.5 * Math.cos((x / SCENE_W) * Math.PI * 5.6));
  }

  // --- The hoard -----------------------------------------------------------

  /**
   * Move the shown hoard toward the real one and fire off whatever that
   * transition should look like. Exponential chase, so a small whistle is a nudge
   * and a big purchase is a visible drain rather than a jump cut.
   */
  private stepHoard(dt: number, now: number): void {
    const target = Math.max(0, this.view.hoard);
    if (this.shown < 0) {
      // Adopt the hoard rather than animating up from zero, or every reload
      // replays your whole mill's history at you.
      //
      // Gated on `sawView` and not just on the first frame, which is the bug
      // this comment is really about. The scene mounts against `EMPTY_VIEW` and
      // gets the real one a frame or two later, so "first frame" adopted a
      // hoard of nothing and then eased up to the true figure — invisible for
      // the number, and very visible for the pack, because a yard that *grows*
      // into sixty dogs brings them in through the drop one at a time and ends
      // up with all of them stood in the left-hand corner.
      if (!this.sawView) return;
      this.shown = target;
      this.shownLayout = yardLayout(target);
      return;
    }

    const k = 1 - Math.exp(-dt * 3.2);
    const gap = target - this.shown;
    this.shown += gap * k;
    // Snap once it's close, so the heap settles instead of creeping forever.
    if (Math.abs(gap) < Math.max(0.5, target * 1e-4)) this.shown = target;

    const next = yardLayout(this.shown);
    if (!sameLayout(next, this.shownLayout)) {
      if (next.stage !== this.shownLayout.stage) this.turnStage(this.shownLayout.stage, next.stage, now);
      this.shownLayout = next;
    }

    this.ambleYard(now);

    const cutoff = now - 900;
    if (this.bundles.length > 0) this.bundles = this.bundles.filter((b) => b.born + b.dur > cutoff);
    for (const [stage, run] of this.building) {
      if (run.born + BUILD_MS < now) this.building.delete(stage);
    }
  }

  /**
   * How far back in the yard something stands. 0 is the heap at the front edge;
   * each station back steps by the same amount, so the yard reads as depth
   * rather than as a stack of shelves. On a short screen the steps tighten
   * instead of the back row walking off the top.
   */
  private station(i: number): number {
    const step = Math.max(5, Math.min(9, Math.floor((this.sh - this.yardTop() - 12) / 4)));
    return this.sh - 4 - i * step;
  }

  /** Where a prop's feet are, once it's finished arriving. */
  private propFoot(prop: Prop): number {
    return this.station(prop.row);
  }

  /**
   * The back of the yard the pack roams: right up under the fence.
   *
   * The props only use the back four stations, which left a clear band of
   * apron between the fence and the deepest dog — the picture had a stripe of
   * nothing across it at exactly the height the eye lands. Depth is the only
   * room this yard has to spare, it can't get any wider, and every pixel of it
   * is one more row of dogs that isn't standing on the row in front.
   */
  private packBack(): number {
    return this.yardTop() + 5;
  }

  /**
   * The front of it, which runs past the bottom edge on purpose.
   *
   * A puppy whose feet land on the last visible row is a puppy standing at a
   * wall. Letting the band spill off the bottom means some of them are always
   * half out of frame, which is what makes the yard read as continuing past the
   * screen rather than as a shelf with dogs on it.
   */
  private packFront(): number {
    return this.station(0) + PACK_SPILL;
  }

  /**
   * Crossing a threshold. Going up, the heap gets carried into whatever just
   * arrived and the new thing rises out of the ground behind a cloud of its own
   * dust; going down, it sinks back into the ground it came out of. Either way
   * the stage that moved is the loudest thing on the canvas for half a second,
   * because it's the only part of the yard that ever changes shape.
   */
  private turnStage(from: number, to: number, now: number): void {
    const up = to > from;
    // A purchase can drop several stages at once. Each one gets its own moment,
    // stacked up in sequence, so a big spend reads as a demolition rather than
    // as everything blinking out on the same frame.
    const moved: number[] = [];
    for (let s = Math.min(from, to) + 1; s <= Math.max(from, to); s++) moved.push(s);
    if (!up) moved.reverse();

    for (const [i, stage] of moved.entries()) {
      const prop = YARD[stage]?.add;
      if (!prop) continue;
      const born = now + i * 120;
      this.building.set(stage, { born, up });
      const sprite = artCanvas(prop.art);
      const foot = this.propFoot(prop);
      // Dust at the feet, thrown outward — the same puffs the machines use.
      for (let d = 0; d < 4; d++) {
        this.puff(prop.x + 2 + (d * sprite.w) / 3, foot - 2, "dust", d < 2 ? -14 : 14);
      }
      const arrives = this.sendPorter(prop, sprite.w, foot, born, up);
      if (!up || this.bundles.length > 24) continue;
      // What the porter tips in when they get there. Three puppies over the
      // lip is enough to read as "that pile went in there" without burying the
      // thing that just arrived.
      const drop = prop.x + Math.floor(sprite.w / 2);
      for (let n = 0; n < 3; n++) {
        this.bundles.push({
          art: PUPPY_SPRITE,
          x0: drop - 8,
          y0: foot - 12,
          x1: drop - 3 + n * 2,
          y1: foot - sprite.h + 2,
          born: arrives + n * 90,
          dur: 380,
          poof: false,
        });
      }
    }
  }

  /**
   * Send somebody out with a basket, and say when they'll get there.
   *
   * Going up they set off from the mound and come back for another; going down
   * they come out of whatever's being taken apart and carry it off the right
   * hand edge, which is where the yard's gate is as far as anyone watching is
   * concerned. Either way the load is only ever on screen once.
   */
  private sendPorter(prop: Prop, w: number, foot: number, born: number, up: boolean): number {
    const at = this.doorstep(prop, w, foot);
    const yard = this.station(0);
    const mound = { x: DROP_X + 10, y: yard };
    const gate = { x: SCENE_W + 4, y: yard };
    return up ? this.pushPorter(mound, at, born, true) : this.pushPorter(at, gate, born, false);
  }

  /** Where you'd stand to load something: at its feet, a little to the left. */
  private doorstep(prop: Prop, w: number, foot: number): { x: number; y: number } {
    return { x: prop.x + Math.floor(w / 2) - 10, y: foot };
  }

  private pushPorter(
    start: { x: number; y: number },
    end: { x: number; y: number },
    born: number,
    home: boolean,
  ): number {
    if (this.porters.length > 5) return born;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const walk = Math.max(500, Math.min(2400, (dist / PORTER_SPEED) * 1000));
    this.porters.push({ x0: start.x, y0: start.y, x1: end.x, y1: end.y, born, walk, home });
    return born + walk;
  }

  /**
   * The yard, being kept. Every so often somebody shifts a basket from one store
   * to another — nothing to do with the count, which doesn't move a puppy
   * either way. It's just that a yard where the only thing that ever happens is
   * a threshold being crossed is a yard nobody works in.
   */
  private ambleYard(now: number): void {
    if (this.porters.length > 0 || !this.chance(0.06)) return;
    const standing: Prop[] = [];
    for (let s = 0; s <= this.shownLayout.stage && s < YARD.length; s++) {
      const prop = YARD[s]?.add;
      if (prop) standing.push(prop);
    }
    if (standing.length < 2) return;
    const i = Math.floor(Math.random() * standing.length);
    let j = Math.floor(Math.random() * (standing.length - 1));
    if (j >= i) j++;
    const from = standing[i]!;
    const to = standing[j]!;
    const a = this.doorstep(from, artCanvas(from.art).w, this.propFoot(from));
    const b = this.doorstep(to, artCanvas(to.art).w, this.propFoot(to));
    this.pushPorter(a, b, now, true);
  }

  /**
   * The yard crew, walking. Drawn like the field hands — same sprite, same
   * one-pixel bob — because they are the field hands: this is the same mill at
   * the other end of the same day.
   */
  private drawPorters(now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(this.mark("hand"));
    const basket = artCanvas(BASKET);
    this.porters = this.porters.filter((porter) => {
      const age = now - porter.born;
      if (age < 0) return true;
      const total = porter.home ? porter.walk * 2 + PORTER_TIP : porter.walk;
      if (age > total) return false;

      // Out loaded, a beat to heave the basket in, then back empty. A load that's
      // leaving skips both: it walks the one leg and goes out of shot with it.
      let f: number;
      let load = true;
      if (age < porter.walk) {
        f = age / porter.walk;
      } else if (age < porter.walk + PORTER_TIP) {
        f = 1;
        load = age < porter.walk + PORTER_TIP / 2;
      } else {
        f = 1 - (age - porter.walk - PORTER_TIP) / porter.walk;
        load = false;
      }

      const x = Math.round(porter.x0 + (porter.x1 - porter.x0) * f);
      const y = Math.round(porter.y0 + (porter.y1 - porter.y0) * f);
      const walking = age < porter.walk || age > porter.walk + PORTER_TIP;
      // Stooped while they're heaving the basket off the shoulder.
      const bob = walking ? Math.floor(now / 190) % 2 : 2;
      const top = y - sprite.h + bob;
      if (!porter.home) ctx.globalAlpha = Math.max(0, Math.min(1, (SCENE_W + 2 - x) / 12));
      ctx.drawImage(sprite.canvas, x, top);
      if (load) ctx.drawImage(basket.canvas, x - 2, top - basket.h + 3);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  /**
   * The yard: everything built so far, back stations first, and the working
   * heap in front of the lot.
   */
  private drawHoard(now: number): void {
    const layout = this.shownLayout;

    // Back to front, and the pack is in the sort rather than on top of it, so a
    // puppy behind a crate is behind the crate. Nothing here is drawn scaled —
    // depth is only ever draw order — and feet are the only depth cue there is,
    // so `y` is the key for a dog and a kennel alike.
    //
    // The sort is stable, which is what keeps props in stage order inside a
    // row: two crates on the same station have identical keys, and the one you
    // bought first has to stay behind the one you bought second.
    const queue: { y: number; go: () => void }[] = [];
    for (let stage = 0; stage < YARD.length; stage++) {
      const prop = YARD[stage]?.add;
      if (!prop) continue;
      const run = this.building.get(stage);
      if (stage > layout.stage && !run) continue;
      queue.push({ y: this.propFoot(prop), go: () => this.drawProp(prop, run, now) });
    }
    // The bowls stand in the yard forever, so they go in the same depth sort as
    // everything else and dogs walk in front of and behind them.
    const back = this.packBack();
    const front = this.packFront();
    for (const [i, at] of BOWLS.entries()) {
      const art = i % 2 === 0 ? BOWL : BOWL_RED;
      const sprite = artCanvas(art);
      const y = Math.round(back + (front - back) * at.d);
      queue.push({
        y,
        go: () => {
          this.propShadow(at.x, y, sprite.w);
          this.ctx.drawImage(sprite.canvas, at.x, y - sprite.h);
        },
      });
    }
    for (const dog of this.pack) queue.push({ y: dog.y, go: () => this.drawPup(dog) });
    queue.push({ y: this.ball.y, go: () => this.drawBall() });
    queue.sort((a, b) => a.y - b.y);
    for (const item of queue) item.go();
  }

  /**
   * Reconcile the pack against what you're holding, then let every dog in it
   * get on with whatever it's doing.
   *
   * Arrivals and departures are rationed to a few a frame rather than snapped
   * to the number, so buying a tier empties the yard as a walk-out and a good
   * minute fills it as a trickle. Both are the same code: the count moves, and
   * the yard takes a moment to agree.
   */
  private stepPack(dt: number, t: number): void {
    const want = Math.min(PACK_CAP, Math.max(0, Math.round(this.shownLayout.pack)));
    let here = 0;
    for (const dog of this.pack) if (!dog.leaving) here++;

    if (here < want) {
      // How far behind decides *where* they come in, and the rule is about what
      // the gap means rather than about the clock. Up to a frame's worth
      // missing is production: they arrive at the drop and trot out of the
      // corner. More than that is the scene catching up with a save that was
      // already full — nobody delivered those, they've been in the yard for
      // hours — so they scatter across the whole width.
      //
      // Keying this off an empty pack instead was the obvious version and it
      // was wrong twice. The hoard eases in over the first second, so the frame
      // where the pack is empty is a frame that only wants one dog, and the
      // other sixty-four then queued through the corner one at a time.
      const missing = want - here;
      const scatter = missing > 3;
      const batch = scatter ? missing : Math.min(3, missing);
      for (let i = 0; i < batch; i++) this.pack.push(this.newPup(t, scatter));
    } else if (here > want) {
      let over = here - want;
      for (const dog of this.pack) {
        if (over <= 0) break;
        if (dog.leaving) continue;
        // Out of the gate under its own steam, rather than blinking out. The
        // yard emptying is the most legible thing a purchase does, and it's
        // worth the second and a half it takes to watch.
        dog.leaving = true;
        dog.doing = "trot";
        dog.vx = 26 + Math.random() * 10;
        dog.vy = 0;
        dog.until = t + 60;
        over--;
      }
    }

    const back = this.packBack();
    const front = this.packFront();
    const kept: PackPup[] = [];
    for (const dog of this.pack) {
      if (t >= dog.until) pickAction(dog, t);
      if (dog.doing === "trot" || dog.doing === "zoom") {
        dog.x += dog.vx * dt;
        dog.y += dog.vy * dt;
        dog.walked += Math.abs(dog.vx) * dt;
        if (dog.y < back) {
          dog.y = back;
          dog.vy = Math.abs(dog.vy);
        } else if (dog.y > front) {
          dog.y = front;
          dog.vy = -Math.abs(dog.vy);
        }
        if (!dog.leaving) {
          if (dog.x < PACK_LEFT) {
            dog.x = PACK_LEFT;
            dog.vx = Math.abs(dog.vx);
          } else if (dog.x > PACK_RIGHT) {
            dog.x = PACK_RIGHT;
            dog.vx = -Math.abs(dog.vx);
          }
        }
      }
      if (dog.leaving && dog.x > SCENE_W + 2) continue;
      kept.push(dog);
    }
    this.pack = kept;
  }

  /**
   * A new one: in at the drop where everything else in the yard arrives, or
   * anywhere at all if the yard is being filled from cold.
   *
   * Either way it gets a home anywhere in the yard, which is what actually
   * disperses a delivery — see `PackPup.home`. A dropped one also starts off
   * walking rather than picking an action at random, because the corner is
   * where the last one landed and the one before that, and a third of them
   * choosing to sit down on the spot is how a delivery becomes a scrum.
   */
  private newPup(t: number, scatter: boolean): PackPup {
    const back = this.packBack();
    const front = this.packFront();
    const dog: PackPup = {
      x: scatter ? PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT) : DROP_X + Math.random() * 14 - 7,
      y: back + Math.random() * Math.max(1, front - back),
      home: PACK_LEFT + Math.random() * (PACK_RIGHT - PACK_LEFT),
      vx: 0,
      vy: 0,
      doing: "stand",
      until: 0,
      walked: Math.random() * 40,
      coat: Math.floor(Math.random() * PACK_COATS),
      leaving: false,
    };
    if (scatter) {
      pickAction(dog, t);
    } else {
      // Straight off toward wherever it's going to live, rather than a random
      // first action. The drop is one corner of a wide yard and the walk out of
      // it is the whole dispersal.
      dog.doing = "trot";
      dog.vx = 1.6 * (PACK_WALK[0] + Math.random() * (PACK_WALK[1] - PACK_WALK[0]));
      dog.vy = (Math.random() - 0.5) * 4;
      dog.until = t + 1.2 + Math.random() * 2;
    }
    return dog;
  }

  /**
   * The ball, and whoever is currently interested in it.
   *
   * The chase is the whole feature and it's three rules: if nobody's on it,
   * the nearest dog within reach takes it on; a dog that has it trots at it
   * regardless of where home is; and when it gets there it knocks it somewhere
   * else and loses interest. That produces a ball that crosses the yard all
   * day with a different dog behind it each time, off about fifteen lines.
   */
  private stepBall(t: number): void {
    const back = this.packBack();
    const front = this.packFront();
    if (this.ball.to === 0) {
      this.ball.y = this.ball.ty = Math.round((back + front) / 2);
      this.ball.to = t;
    }

    // In flight: a straight line with a hop in it, because a ball that slides
    // along the ground reads as being dragged.
    if (t < this.ball.to) return;
    this.ball.x = this.ball.tx;
    this.ball.y = this.ball.ty;

    const chaser = this.ball.chaser;
    if (chaser && this.pack.includes(chaser) && !chaser.leaving) {
      chaser.doing = "trot";
      chaser.until = t + 0.4;
      const dx = this.ball.x - chaser.x;
      chaser.vx = Math.sign(dx || 1) * 26;
      chaser.vy = Math.sign(this.ball.y - chaser.y) * 6;
      if (Math.abs(dx) < 6 && Math.abs(this.ball.y - chaser.y) < 4) {
        // Got it. Knock it somewhere else and go back to being a dog.
        this.ball.tx = PACK_LEFT + 6 + Math.random() * (PACK_RIGHT - PACK_LEFT - 12);
        this.ball.ty = back + Math.random() * Math.max(1, front - back);
        this.ball.from = t;
        this.ball.to = t + 0.5 + Math.random() * 0.3;
        this.ball.chaser = null;
        chaser.until = t;
      }
      return;
    }

    this.ball.chaser = null;
    // Nobody on it. Whoever's nearest and not already busy leaving takes it on.
    let best: PackPup | null = null;
    let near = 46;
    for (const dog of this.pack) {
      if (dog.leaving) continue;
      const d = Math.abs(dog.x - this.ball.x) + Math.abs(dog.y - this.ball.y) * 2;
      if (d < near) {
        near = d;
        best = dog;
      }
    }
    this.ball.chaser = best;
  }

  private drawBall(): void {
    const ctx = this.ctx;
    const sprite = artCanvas(BALL);
    const t = this.clock;
    let x = this.ball.x;
    let y = this.ball.y;
    let hop = 0;
    if (t < this.ball.to && this.ball.to > this.ball.from) {
      const f = (t - this.ball.from) / (this.ball.to - this.ball.from);
      x = this.ball.x + (this.ball.tx - this.ball.x) * f;
      y = this.ball.y + (this.ball.ty - this.ball.y) * f;
      hop = Math.round(Math.sin(f * Math.PI) * 7);
    }
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(x), Math.round(y) - 1, sprite.w, 1);
    ctx.globalAlpha = 1;
    ctx.drawImage(sprite.canvas, Math.round(x), Math.round(y) - sprite.h - hop);
  }

  /**
   * One puppy, and the shadow that stops it floating.
   *
   * The frame comes off `walked` rather than the clock, so a dog that's stopped
   * holds the pose it stopped in instead of running on the spot, and the bob is
   * on the same phase — a pixel of lift on the off frame, which at this size is
   * the entire difference between walking and sliding.
   */
  private drawPup(dog: PackPup): void {
    const ctx = this.ctx;
    const step = Math.floor(dog.walked / PACK_STRIDE) % 2;
    // Sitting alternates the tail on the clock rather than on distance, for the
    // obvious reason that a sitting dog isn't covering any. `x` stands in for a
    // per-dog phase — it's constant while sat, and free.
    const pose =
      dog.doing === "sit"
        ? 2 + (Math.floor(this.clock * 2.6 + dog.x) % 2)
        : dog.doing === "flop"
          ? 4
          : step;
    const sprite = artCanvas(PACK_POSES[dog.coat]![dog.vx < 0 ? 1 : 0]![pose]!);
    const x = Math.round(dog.x);
    const y = Math.round(dog.y);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = INK;
    ctx.fillRect(x + 1, y - 1, sprite.w - 2, 1);
    ctx.globalAlpha = 1;
    // A pixel of lift on the off step at a walk, and a proper bounce at a
    // sprint — a zooming dog that stays pinned to the floor just looks fast.
    const bob =
      dog.doing === "zoom"
        ? Math.round(Math.abs(Math.sin(dog.walked / 7)) * 3)
        : dog.doing === "trot" && step === 1
          ? 1
          : 0;
    ctx.drawImage(sprite.canvas, x, y - sprite.h - bob);
  }

  /**
   * One thing in the yard, standing or in the middle of arriving. Arrivals rise
   * out of the ground: the sprite is clipped to the footprint it will end up
   * occupying and slid up into it, which costs a clip rect but keeps every
   * pixel of the art on the grid.
   */
  private drawProp(prop: Prop, run: { born: number; up: boolean } | undefined, now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(prop.art);
    const foot = this.propFoot(prop);
    const top = foot - sprite.h;
    if (!run) {
      this.propShadow(prop.x, foot, sprite.w);
      ctx.drawImage(sprite.canvas, prop.x, top);
      this.propLife(prop, top);
      return;
    }

    const hidden = buildHidden(now - run.born, run.up, sprite.h);
    if (hidden >= sprite.h) return;
    this.propShadow(prop.x, foot, sprite.w);
    ctx.save();
    ctx.beginPath();
    ctx.rect(prop.x, top, sprite.w, sprite.h);
    ctx.clip();
    ctx.drawImage(sprite.canvas, prop.x, top + hidden);
    ctx.restore();
  }

  /**
   * The lights on the things in the yard that are big enough to have them. The
   * yard is where you look when nothing else is happening, and a kennel with a
   * lamp over the door is a kennel somebody works in.
   */
  private propLife(prop: Prop, top: number): void {
    const ctx = this.ctx;
    const t = this.clock;
    if (prop.art === KENNEL) {
      // A lamp either side of the door, on a slow flicker.
      const lit = 0.7 + 0.3 * Math.sin(t * 2.1 + prop.x);
      for (const c of [2, 24]) {
        ctx.globalAlpha = lit;
        ctx.fillStyle = "#ffd782";
        ctx.fillRect(prop.x + c, top + 6, 1, 1);
        ctx.globalAlpha = 0.16 * lit;
        ctx.fillRect(prop.x + c - 1, top + 5, 3, 3);
      }
      ctx.globalAlpha = 1;
    } else if (prop.art === SORTER && (t * 0.5 + prop.x * 0.02) % 1 < 0.18) {
      // A beacon on the head house: it's the tallest thing you own.
      ctx.fillStyle = "#ff5b4a";
      ctx.fillRect(prop.x + 9, top + 1, 1, 1);
      ctx.globalAlpha = 0.28;
      ctx.fillRect(prop.x + 8, top, 3, 3);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * A pool of shade under something's feet. Two pixels of it, tucked in at the
   * ends — with a dozen things standing on the same flat brown, this is the
   * only thing telling you which of them are near and which are far.
   */
  private propShadow(x: number, foot: number, w: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = INK;
    ctx.fillRect(x, foot - 1, w, 1);
    ctx.fillRect(x + 2, foot, w - 4, 1);
    ctx.globalAlpha = 1;
  }

  /** Puppies being carried between columns, drawn over the columns themselves. */
  private drawBundles(now: number): void {
    const ctx = this.ctx;
    for (const b of this.bundles) {
      const p = (now - b.born) / b.dur;
      if (p < 0 || p > 1) continue;
      const sprite = artCanvas(b.art);
      if (b.poof) {
        ctx.globalAlpha = 1 - p;
        ctx.drawImage(sprite.canvas, b.x0, Math.round(b.y0 + (b.y1 - b.y0) * p));
        ctx.globalAlpha = 1;
        continue;
      }
      // Ease out, with a hop over the gap — a flat lerp reads as a slide.
      const e = 1 - (1 - p) * (1 - p);
      const x = Math.round(b.x0 + (b.x1 - b.x0) * e);
      const y = Math.round(b.y0 + (b.y1 - b.y0) * e - Math.sin(p * Math.PI) * 11);
      ctx.drawImage(sprite.canvas, x, y);
    }
  }

  // --- The trough ----------------------------------------------------------
  //
  // The field machines' answer to "where does it go". A van and a grooming rig
  // are the two things out there big enough to be carrying a load, and the
  // load has to end up somewhere you can see: a trough across the headland,
  // filled by auger from whatever's working the rows above it, emptying down a
  // spout through the fence into the yard.

  /**
   * Where a hand goes after it's tipped its load in: back up the headland,
   * towards the work.
   *
   * Not on down into the yard. The yard is where the puppies are kept, not
   * where the people are, and a crew that carries every load down past the
   * trough and then wanders about among the crates spends most of the day
   * walking away from the field it's supposed to be picking.
   */
  private turnAround(hand: Hand, yardY: number): { x: number; y: number } {
    return {
      x: clamp(hand.x + (Math.random() - 0.5) * 22, 4, SCENE_W - 10),
      y: clamp(hand.y - 6 - Math.random() * 12, this.fieldTop() + 14, yardY - 2),
    };
  }

  /** The nearest basket nobody's already walking to. */
  private claimBasket(hand: Hand): number {
    let best = -1;
    let bestD = Infinity;
    for (const basket of this.baskets) {
      if (this.hands.some((h) => h.basket === basket.id)) continue;
      const d = Math.hypot(basket.x - hand.x, basket.y - hand.y);
      if (d < bestD) {
        bestD = d;
        best = basket.id;
      }
    }
    return best;
  }

  /** The baskets waiting at the headland, dropping the last inch as they land. */
  private drawBaskets(now: number): void {
    const sprite = artCanvas(BASKET);
    for (const basket of this.baskets) {
      const age = now - basket.born;
      const drop = age < 220 ? Math.round(4 * (1 - age / 220)) : 0;
      this.ctx.drawImage(sprite.canvas, Math.round(basket.x), Math.round(basket.y) - sprite.h - drop);
    }
  }

  /** Drain a full trough into the yard, and draw the thing either way. */
  private stepTrough(now: number): void {
    const box = this.troughBox;
    if (!box) return;
    this.drawTrough(box);

    this.troughClock += this.dt;
    const interval = TROUGH_DRAIN * (1 - 0.75 * (this.troughFill / TROUGH_CAP));
    while (this.troughClock >= interval) {
      this.troughClock -= interval;
      if (this.troughFill <= 0) {
        this.troughClock = 0;
        break;
      }
      this.troughFill--;
      if (this.hauls.length >= MAX_HAULS) continue;
      // Down the middle of the slide, and off the end into the pile.
      const run = this.spout(box);
      const mid = (MillScene.SPOUT_W - 7) / 2;
      this.hauls.push({
        x0: run.x0 + mid,
        y0: run.y0 - 4,
        x1: run.x1 + mid,
        y1: run.y1 + 3,
        born: now,
        dur: 620,
        slide: true,
      });
    }
  }

  private drawTrough(box: { x: number; w: number; y: number }): void {
    const ctx = this.ctx;
    const { x, w, y } = box;
    const top = y - 9;

    // Open-topped, so what's in it is the readable part. Walls and floor in
    // the outline ink, planking inside, and two stubby legs under it.
    ctx.fillStyle = "#5e3e29";
    ctx.fillRect(x + 4, y - 2, 3, 3);
    ctx.fillRect(x + w - 7, y - 2, 3, 3);
    ctx.fillStyle = INK;
    ctx.fillRect(x, top, 2, 9);
    ctx.fillRect(x + w - 2, top, 2, 9);
    ctx.fillRect(x, y - 2, w, 2);
    // Lit planking with dark staves. A trough in the yard's own dark wood
    // disappeared into the fence behind it and read as a bench.
    ctx.fillStyle = "#a97a52";
    ctx.fillRect(x + 2, top, w - 4, 7);
    ctx.fillStyle = "#7a5237";
    ctx.fillRect(x + 2, top, w - 4, 1);
    ctx.fillStyle = "#5e3e29";
    for (let sx = x + 8; sx < x + w - 6; sx += 14) ctx.fillRect(sx, top, 1, 7);

    const depth = Math.min(6, Math.ceil((this.troughFill / TROUGH_CAP) * 6));
    if (depth > 0) {
      ctx.fillStyle = "#c98b4b";
      ctx.fillRect(x + 2, y - 2 - depth, w - 4, depth);
      ctx.fillStyle = "#e2b077";
      for (let sx = x + 2; sx < x + w - 3; sx += 3) ctx.fillRect(sx, y - 2 - depth, 2, 1);
    }

  }

  /**
   * Where the trough's outfall runs: a gate in the floor a little along from
   * the low end, then down over the fence to a mouth that hangs above the
   * mound. Both ends in one place, because the puppies on it have to agree
   * with the woodwork under them.
   */
  private spout(box: { x: number; w: number; y: number }): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } {
    const x0 = box.x + 22;
    const y0 = box.y - 2;
    // Ends over the drop, low enough that what comes off it is setting down on
    // the ground rather than being thrown at it. It leans back the other way
    // from the pipeline's outfall, so the yard's two arrivals aren't the same
    // line drawn twice.
    return {
      x0,
      y0,
      x1: DROP_X - 2,
      y1: Math.max(y0 + 16, this.packBack() - 10),
    };
  }

  /** How wide the boards are, and what a puppy rides down the middle of. */
  private static SPOUT_W = 9;

  /**
   * The slide, drawn as a channel: a side board down each edge with the run
   * between them, lit on the high side and shaded on the low one, and an open
   * mouth over the pile.
   *
   * It used to be a line of two-pixel dots from the trough to the mound, which
   * is a perfectly good way to describe a path and a terrible way to draw a
   * chute — the pup came out of the trough and went down a piece of string.
   * The first go at fixing it put battens across the run and made a ladder, so
   * everything here reads *along* the fall: rails, a highlight and a floor.
   */
  private drawSpout(box: { x: number; w: number; y: number }): void {
    const ctx = this.ctx;
    const { x0, y0, x1, y1 } = this.spout(box);
    const W = MillScene.SPOUT_W;
    const fall = y1 - y0;

    // The throat: a collar under the trough floor, so the slide is fed by the
    // trough rather than just touching it.
    ctx.fillStyle = "#5e3e29";
    ctx.fillRect(x0, y0 - 3, W, 3);

    for (let i = 0; i <= fall; i++) {
      const sx = Math.round(x0 + ((x1 - x0) * i) / fall);
      const sy = y0 + i;
      // Low side: a side board standing proud of the floor, so the channel has
      // a visible near edge holding the pup in.
      ctx.fillStyle = INK;
      ctx.fillRect(sx, sy, 1, 1);
      ctx.fillStyle = "#5e3e29";
      ctx.fillRect(sx + 1, sy, 1, 1);
      // The floor, in trough wood, and the far rail catching the light.
      ctx.fillStyle = "#8a5c3c";
      ctx.fillRect(sx + 2, sy, W - 4, 1);
      ctx.fillStyle = "#a97a52";
      ctx.fillRect(sx + W - 2, sy, 1, 1);
      ctx.fillStyle = "#c39466";
      ctx.fillRect(sx + W - 1, sy, 1, 1);
    }

    // The mouth: open, with the floor's shadow under the lip. This is the last
    // thing the puppy is inside before it's on the pile.
    ctx.fillStyle = "#c39466";
    ctx.fillRect(x1, y1, W, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(x1 - 1, y1 + 1, W + 2, 2);
  }

  /** Puppies on an auger or a spout: straight line, constant speed, no arc. */
  private drawHauls(now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(PUPPY_SPRITE);
    this.hauls = this.hauls.filter((h) => {
      const p = (now - h.born) / h.dur;
      if (p > 1) {
        if (h.slide) this.puff(h.x1 + 3, h.y1 + 4, "dust", (Math.random() - 0.5) * 20);
        return false;
      }
      if (p < 0) return true;
      // A slide accelerates, and the last stretch is the puppy leaving the
      // mouth — so it rides the boards, then drops the last few pixels.
      const f = h.slide ? p * p * 0.7 + p * 0.3 : p;
      ctx.drawImage(
        sprite.canvas,
        Math.round(h.x0 + (h.x1 - h.x0) * f),
        Math.round(h.y0 + (h.y1 - h.y0) * f),
      );
      return true;
    });
  }

  /**
   * What your own whistling turns up: a puppy, held a beat, and a heart.
   *
   * The heart is the only part of this scene that isn't a thing in the world —
   * there is no heart-shaped object on a mill — and it earns the exception by
   * being the only feedback the click has. Everything else you do here shows up
   * as a number moving; whistling a dog over should feel like something.
   */
  private drawWhistled(now: number): void {
    const ctx = this.ctx;
    const sprite = artCanvas(PUPPY_SPRITE);
    const heart = artCanvas(HEART);
    this.whistled = this.whistled.filter((d) => {
      const age = now - d.born;
      if (age > WHISTLED_MS) return false;
      const p = age / WHISTLED_MS;
      const lift = Math.round(5 * Math.min(1, p * 6));
      ctx.globalAlpha = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
      ctx.drawImage(sprite.canvas, d.x, d.y - sprite.h - lift);
      // Rises faster than the puppy and drifts, so the two don't read as one
      // object. Held back a beat as well: the dog arrives, and *then* it's
      // pleased about it.
      if (p > 0.15) {
        ctx.globalAlpha *= 0.9;
        ctx.drawImage(
          heart.canvas,
          d.x + 4 + Math.round(Math.sin(p * 6) * 1.5),
          d.y - sprite.h - 5 - Math.round(p * 12),
        );
      }
      ctx.globalAlpha = 1;
      return true;
    });
  }
}
