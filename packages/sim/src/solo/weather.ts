/**
 * Weather — sabotage with nobody behind it.
 *
 * The versus mode's attacks and this are the same idea from opposite ends: your
 * mill keeps getting knocked around, and staying productive means budgeting for
 * it. The difference is that nothing here is aimed at you and nothing here
 * expires. Every hit is permanent until you pay to undo it, which is what makes
 * a mill you leave alone for a week a mill that needs work when you get back.
 *
 * Events are a deterministic function of `(seed, weatherIndex)`, and each one
 * lands at a time the state already knows (`nextWeatherAt`). That's what lets an
 * arbitrary offline gap resolve exactly — walk the schedule, don't sample a
 * clock — and it means a save file can't be rerolled for better weather.
 */

import { P, format, ms, seconds, type Millis, type Puppies } from "../numbers.js";
import { rngFor, type Rng } from "../rng.js";
import {
  MAX_BEDDING,
  MIN_BEDDING,
  SOLO_MAX_BROKEN_SHARE,
  SOLO_PRODUCERS,
  type SoloProducerId,
} from "./content.js";
import {
  cleanRate,
  currentRate,
  mitigation,
  producerRate,
  repairCost,
  beddingRestoreCost,
  workingCount,
} from "./economy.js";
import type { MillState } from "./state.js";

/** Which producers a breakage event goes after. */
type BreakScope = "best" | "cheapest" | "all";

type WeatherEffect =
  /** Knocks units offline. They stay offline until repaired. */
  | { kind: "break"; scope: BreakScope; share: number; bedding?: number }
  /** Takes bedding health, which only spending brings back. */
  | { kind: "bedding"; loss: number }
  /** A good day. Worth this many seconds of production, paid out at once. */
  | { kind: "boon"; seconds: number };

interface WeatherKind {
  id: string;
  name: string;
  weight: number;
  effect: WeatherEffect;
}

/**
 * Weighted roughly 5:1 against you. Weather isn't meant to be a coin flip — it's
 * a running cost — but a mill where nothing good ever happens is a mill nobody
 * wants to check on.
 */
const KINDS: readonly WeatherKind[] = [
  { id: "foxes", name: "Foxes", weight: 20, effect: { kind: "break", scope: "cheapest", share: 0.3 } },
  { id: "hail", name: "Hailstorm", weight: 16, effect: { kind: "break", scope: "best", share: 0.28 } },
  { id: "cough", name: "Kennel Cough", weight: 10, effect: { kind: "break", scope: "all", share: 0.22 } },
  {
    id: "frost",
    name: "Late Frost",
    weight: 8,
    effect: { kind: "break", scope: "best", share: 0.35, bedding: 0.05 },
  },
  { id: "heatwave", name: "Heatwave", weight: 14, effect: { kind: "bedding", loss: 0.08 } },
  { id: "rot", name: "Bedding Rot", weight: 7, effect: { kind: "bedding", loss: 0.16 } },
  {
    id: "flood",
    name: "Flooding",
    weight: 6,
    effect: { kind: "break", scope: "all", share: 0.18, bedding: 0.1 },
  },
  // Boons are deliberately small. At 600s of production a good week was worth
  // more than every storm in a session cost, which made the weather a bonus
  // and the whole mitigation half of the game pointless.
  { id: "bigLitter", name: "Big Litter", weight: 10, effect: { kind: "boon", seconds: 90 } },
  { id: "perfect", name: "Perfect Season", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

/**
 * What the weather becomes once the horizon closes.
 *
 * Inside the nest there is no sky, so hail and frost and heatwaves stop. What
 * replaces them is the nest itself — a mound of blanket with something very
 * large asleep in it, and it moves. Same three effect kinds, because the second
 * axis is the same axis and splitting it would mean two mitigation systems to
 * balance.
 *
 * This is the mechanical payoff of the Convergence, and deliberately the whole
 * of it. There is no Convergence multiplier: the ladder gets a second act at
 * the same moment the land half does, which is what the design has always
 * rested on.
 */
const NEST_KINDS: readonly WeatherKind[] = [
  // Every one of these is the nest doing something a nest does, rather than a
  // word a player has to look up. The mix is bedding-heavy on purpose: what a
  // settling blanket mostly does to you is close over the ground, not smash the
  // machinery.
  { id: "settling", name: "The Nest Settles", weight: 14, effect: { kind: "break", scope: "cheapest", share: 0.28 } },
  { id: "packing", name: "Packing Down", weight: 10, effect: { kind: "break", scope: "best", share: 0.26 } },
  {
    id: "turnover",
    name: "It Turns Over",
    weight: 8,
    effect: { kind: "break", scope: "all", share: 0.2, bedding: 0.06 },
  },
  { id: "static", name: "Static Bloom", weight: 20, effect: { kind: "bedding", loss: 0.09 } },
  { id: "matting", name: "Matting", weight: 13, effect: { kind: "bedding", loss: 0.17 } },
  { id: "shedding", name: "A Great Shedding", weight: 9, effect: { kind: "bedding", loss: 0.13 } },
  // Not "Dormancy": that's what the Lullaby Rig is for, and a feed telling you
  // it went quiet right after you bought a building to make it go quiet is one
  // word doing two jobs.
  { id: "deepSleep", name: "Deep Sleep", weight: 9, effect: { kind: "boon", seconds: 90 } },
  { id: "sigh", name: "A Contented Sigh", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

function kindsFor(f: MillState): readonly WeatherKind[] {
  return f.converged ? NEST_KINDS : KINDS;
}

/** Which ids each table can produce, so a test can pin that the swap happened. */
export const WEATHER_IDS = {
  sky: KINDS.map((k) => k.id),
  nest: NEST_KINDS.map((k) => k.id),
} as const;

/** Average gap between events, before any mitigation stretches it. */
export const MEAN_WEATHER_GAP_MS = seconds(300);

/**
 * A mill this small has nothing worth wrecking, so the weather leaves it alone.
 * Without this, the first ten minutes are a player with four puppy pens
 * watching two of them break.
 */
export const WEATHER_MIN_RATE = 25;

export interface WeatherEvent {
  index: number;
  at: Millis;
  id: string;
  name: string;
  tone: "good" | "bad";
  broke: Partial<Record<SoloProducerId, number>>;
  brokeTotal: number;
  /** Bedding health points taken, after mitigation. */
  beddingLost: number;
  /**
   * Share of production the event took, 0..1. Broken kit and tired bedding cost
   * the same thing in the end, so this is the one number worth reading.
   */
  lostShare: number;
  /** Boon windfall plus any insurance payout. */
  gained: Puppies;
  text: string;
}

/** When the next event lands, given the mill as it stands at `from`. */
export function scheduleNext(f: MillState, from: Millis): Millis {
  const rng = rngFor(f.seed, hashIndex(f.weatherIndex, "gap"));
  const calm = 1 - mitigation(f, "frequency");
  const gap = (MEAN_WEATHER_GAP_MS * rng.range(0.55, 1.75)) / Math.max(0.05, calm);
  return ms(from + Math.round(gap));
}

/** Keeps the gap roll and the event roll on different streams of the same seed. */
function hashIndex(index: number, tag: string): number {
  let h = index * 2654435761;
  for (let i = 0; i < tag.length; i++) h = (h ^ tag.charCodeAt(i)) * 16777619;
  return h >>> 0;
}

function pickKind(rng: Rng, kinds: readonly WeatherKind[]): WeatherKind {
  const total = kinds.reduce((sum, k) => sum + k.weight, 0);
  let roll = rng.next() * total;
  for (const kind of kinds) {
    roll -= kind.weight;
    if (roll <= 0) return kind;
  }
  return kinds[kinds.length - 1]!;
}

/** Producer types this event can hit, worst-first by scope. */
function targetsFor(f: MillState, scope: BreakScope): SoloProducerId[] {
  const live = SOLO_PRODUCERS.filter((prod) => workingCount(f, prod.id) > 0);
  if (live.length === 0) return [];
  if (scope === "all") return live.map((prod) => prod.id);
  if (scope === "cheapest") return [live[0]!.id];
  const best = live.reduce((a, b) => (producerRate(f, b.id) > producerRate(f, a.id) ? b : a));
  return [best.id];
}

/**
 * Each producer says what being hurt looks like for it, so a storm reads as
 * "3x Transport Van broken, 2x Kennel Hand worn out" rather than one verb over both.
 */
function describeBreak(broke: Partial<Record<SoloProducerId, number>>): string {
  return SOLO_PRODUCERS.filter((prod) => (broke[prod.id] ?? 0) > 0)
    .map((prod) => `${broke[prod.id]}x ${prod.name} ${prod.hurt}`)
    .join(", ");
}

/**
 * Resolve the event due at `at`. The mill must already be integrated forward to
 * that instant — `advance` in mill.ts is the only thing that should call this.
 *
 * Returns `null` for an event that came to nothing (too small a mill, or a
 * storm with nothing left to break), so the caller can quietly reschedule
 * rather than log a non-event.
 */
export function fireWeather(f: MillState, at: Millis): { mill: MillState; event: WeatherEvent | null } {
  const index = f.weatherIndex;
  const advanced: MillState = { ...f, weatherIndex: index + 1 };

  if (cleanRate(f) < WEATHER_MIN_RATE) {
    return { mill: { ...advanced, nextWeatherAt: scheduleNext(advanced, at) }, event: null };
  }

  const rng = rngFor(f.seed, hashIndex(index, "event"));
  const kind = pickKind(rng, kindsFor(f));

  let mill = advanced;
  const rateBefore = currentRate(mill);
  const broke: Partial<Record<SoloProducerId, number>> = {};
  let brokeTotal = 0;
  let beddingLost = 0;
  let gained = P.zero;

  if (kind.effect.kind === "boon") {
    gained = P.overTime(currentRate(mill), seconds(kind.effect.seconds));
  } else {
    const before = { repairs: totalRepairs(mill), bedding: beddingRestoreCost(mill) };

    // Breakage and bedding are mitigated separately — a windbreak saves the kit,
    // ditches save the bedding.
    const breakPotency = 1 - mitigation(mill, "breakage");
    const beddingPotency = 1 - mitigation(mill, "bedding");

    if (kind.effect.kind === "break") {
      const brokenNow = { ...mill.broken };
      for (const id of targetsFor(mill, kind.effect.scope)) {
        const owned = mill.producers[id] ?? 0;
        const already = brokenNow[id] ?? 0;
        const working = owned - already;
        if (working <= 0) continue;
        // Jitter so identical storms aren't identical, and so the seeded PRNG
        // stays the only randomness anywhere in the sim.
        const rolled = kind.effect.share * breakPotency * rng.range(0.8, 1.2);
        // "A storm always takes at least one unit — unless you built something
        // that stops it."
        //
        // The floor here used to be a flat `Math.max(1, …)`, which is the first
        // half of that sentence without the second. Every storm took a unit of
        // everything it looked at no matter what stood in the way, so mitigation
        // could thin the hits and stretch the gaps but never prevent one, and a
        // mill left alone walked to the broken cap regardless of what the run had
        // been spent on.
        //
        // Dropping the floor outright fixes that and overshoots: it hands the
        // same relief to mills with no land at all, because a storm rounding 0.4
        // units down to nothing is a storm that missed. So the floor is kept and
        // *mitigated* — at bare land it's the old guaranteed unit, and what you
        // build erodes it. That leaves the relief aimed at the players who paid
        // for it, which is the whole point.
        //
        // Below one unit the remainder is odds rather than a rounding, so a small
        // mill still occasionally loses its only van instead of being immune to
        // arithmetic.
        const exact = Math.max(breakPotency, working * rolled);
        const want = Math.floor(exact) + (rng.next() < exact % 1 ? 1 : 0);
        if (want <= 0) continue;
        const cap = Math.max(0, Math.round(owned * brokenCeiling(mill)) - already);
        const hit = Math.min(want, working, cap);
        if (hit <= 0) continue;
        brokenNow[id] = already + hit;
        broke[id] = (broke[id] ?? 0) + hit;
        brokeTotal += hit;
      }
      mill = { ...mill, broken: brokenNow };
    }

    const beddingHit =
      kind.effect.kind === "bedding" ? kind.effect.loss : (kind.effect.bedding ?? 0);
    if (beddingHit > 0) {
      beddingLost = takeBedding(mill, beddingHit * beddingPotency);
      mill = { ...mill, bedding: mill.bedding - beddingLost };
    }

    if (brokeTotal === 0 && beddingLost <= 1e-9) {
      return { mill: { ...mill, nextWeatherAt: scheduleNext(mill, at) }, event: null };
    }

    // Insurance covers a share of the bill the event just handed you. It buys
    // nothing back directly — you still have to go and spend it on repairs.
    const billed =
      totalRepairs(mill) - before.repairs + (beddingRestoreCost(mill) - before.bedding);
    gained = P.of(Math.max(0, billed) * mitigation(mill, "payout"));
  }

  mill = {
    ...mill,
    puppies: P.add(mill.puppies, gained),
    raised: P.add(mill.raised, gained),
    lifetimeRaised: P.add(mill.lifetimeRaised, gained),
  };
  mill = { ...mill, nextWeatherAt: scheduleNext(mill, at) };

  const lostShare = rateBefore > 0 ? Math.max(0, 1 - currentRate(mill) / rateBefore) : 0;

  // What happened, then what it costs you — in output, which is the only unit
  // the player has any feel for. "Took 8.0 bedding" is a number from the engine;
  // "−8% production" is the same fact in the terms you'd act on.
  const parts: string[] = [];
  if (brokeTotal > 0) parts.push(describeBreak(broke));
  if (beddingLost > 1e-9) parts.push("tired the bedding");
  if (kind.effect.kind === "boon") parts.push(`a good run, +${format(gained)}`);
  const cost =
    lostShare > 0.0005 ? ` −${(lostShare * 100).toFixed(0)}% production.` : "";
  const text = `${kind.name} — ${parts.join(", ")}.${cost}`;

  return {
    mill,
    event: {
      index,
      at,
      id: kind.id,
      name: kind.name,
      tone: kind.effect.kind === "boon" ? "good" : "bad",
      broke,
      brokeTotal,
      beddingLost,
      lostShare,
      gained,
      text,
    },
  };
}

function totalRepairs(f: MillState): number {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += repairCost(f, prod.id);
  return total;
}

/** Bedding actually taken, clamped so the land can never be run into the ground. */
function takeBedding(f: MillState, want: number): number {
  return Math.max(0, Math.min(want, f.bedding - beddingFloor(f)));
}

/**
 * How far down the land can be pushed, and how much of the kit can be taken
 * apart, given what you've built against it.
 *
 * Slowing the damage was never enough on its own. Every hit here is permanent
 * and the events never stop, so *any* positive rate of loss walks a mill to its
 * clamp over a long enough absence — mitigation bought hours and changed
 * nothing about where the mill ended up. Both worst cases were constants, so
 * every unattended mill arrived at the identical wreck: every producer at half
 * broken, bedding on the floor, production down about 87%. Come back after
 * eight hours or a week and the mill was in the same state, which is what made
 * the weather read as one catastrophe that had already happened rather than a
 * running cost you manage.
 *
 * So the land sets the floor as well as the slope. A mill behind a full row of
 * poplars still gets knocked about by a storm, and still needs someone to come
 * and put it right — it just can't be dismantled while you're not looking.
 */
function brokenCeiling(f: MillState): number {
  return SOLO_MAX_BROKEN_SHARE * (1 - mitigation(f, "breakage"));
}

function beddingFloor(f: MillState): number {
  return MAX_BEDDING - (MAX_BEDDING - MIN_BEDDING) * (1 - mitigation(f, "bedding"));
}
