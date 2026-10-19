/**
 * Weather — sabotage with nobody behind it.
 *
 * The versus mode's attacks and this are the same idea from opposite ends: your
 * site keeps getting knocked around, and staying productive means budgeting for
 * it. The difference is that nothing here is aimed at you and nothing here
 * expires. Every hit is permanent until you pay to undo it, which is what makes
 * a site you leave alone for a week a site that needs work when you get back.
 *
 * Events are a deterministic function of `(seed, weatherIndex)`, and each one
 * lands at a time the state already knows (`nextWeatherAt`). That's what lets an
 * arbitrary offline gap resolve exactly — walk the schedule, don't sample a
 * clock — and it means a save file can't be rerolled for better weather.
 */

import { Y, format, ms, seconds, type Millis, type Yield } from "../numbers.js";
import { rngFor, type Rng } from "../rng.js";
import {
  MAX_CONDITION,
  MIN_CONDITION,
  SOLO_MAX_BROKEN_SHARE,
  SOLO_PRODUCERS,
  type SoloProducerId,
  type World,
  WORLDS,
} from "./content.js";
import {
  cleanRate,
  currentRate,
  mitigation,
  producerRate,
  repairCost,
  conditionRestoreCost,
  workingCount,
} from "./economy.js";
import type { SiteState } from "./state.js";
import { named, THEME, type Shape } from "../theme.js";

/** Which producers a breakage event goes after. */
type BreakScope = "best" | "cheapest" | "all";

type WeatherEffect =
  /** Knocks units offline. They stay offline until repaired. */
  | { kind: "break"; scope: BreakScope; share: number; condition?: number }
  /** Takes condition health, which only spending brings back. */
  | { kind: "condition"; loss: number }
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
 * a running cost — but a site where nothing good ever happens is a site nobody
 * wants to check on.
 */
const KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "vermin", weight: 20, effect: { kind: "break", scope: "cheapest", share: 0.3 } },
  { id: "hail", weight: 16, effect: { kind: "break", scope: "best", share: 0.28 } },
  { id: "disease", weight: 10, effect: { kind: "break", scope: "all", share: 0.22 } },
  {
    id: "frost",
    weight: 8,
    effect: { kind: "break", scope: "best", share: 0.35, condition: 0.05 },
  },
  { id: "swelter", weight: 14, effect: { kind: "condition", loss: 0.08 } },
  { id: "rot", weight: 7, effect: { kind: "condition", loss: 0.16 } },
  {
    id: "flood",
    weight: 6,
    effect: { kind: "break", scope: "all", share: 0.18, condition: 0.1 },
  },
  // Boons are deliberately small. At 600s of production a good week was worth
  // more than every storm in a session cost, which made the weather a bonus
  // and the whole mitigation half of the game pointless.
  { id: "windfall", weight: 10, effect: { kind: "boon", seconds: 90 } },
  { id: "perfect", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

const KINDS: readonly WeatherKind[] = named(KIND_SHAPES, THEME.weather, "weather");

/**
 * What the weather becomes once the horizon closes.
 *
 * Inside the core there is no sky, so hail and frost and heatwaves stop. What
 * replaces them is the core itself — a mound of blanket with something very
 * large asleep in it, and it moves. Same three effect kinds, because the second
 * axis is the same axis and splitting it would mean two mitigation systems to
 * balance.
 *
 * This is the mechanical payoff of the Convergence, and deliberately the whole
 * of it. There is no Convergence multiplier: the ladder gets a second act at
 * the same moment the land half does, which is what the design has always
 * rested on.
 */
const CORE_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  // Every one of these is the core doing something a core does, rather than a
  // word a player has to look up. The mix is condition-heavy on purpose: what a
  // settling blanket mostly does to you is close over the ground, not smash the
  // machinery.
  { id: "settling", weight: 14, effect: { kind: "break", scope: "cheapest", share: 0.28 } },
  { id: "packing", weight: 10, effect: { kind: "break", scope: "best", share: 0.26 } },
  {
    id: "inner_press",
    weight: 8,
    effect: { kind: "break", scope: "all", share: 0.2, condition: 0.06 },
  },
  { id: "static", weight: 20, effect: { kind: "condition", loss: 0.09 } },
  { id: "decay", weight: 13, effect: { kind: "condition", loss: 0.17 } },
  { id: "surge", weight: 9, effect: { kind: "condition", loss: 0.13 } },
  // Not "Dormancy": that's what the Lullaby Rig is for, and a feed telling you
  // it went quiet right after you bought a building to make it go quiet is one
  // word doing two jobs.
  { id: "dormant", weight: 9, effect: { kind: "boon", seconds: 90 } },
  { id: "respite", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

const CORE_KINDS: readonly WeatherKind[] = named(CORE_KIND_SHAPES, THEME.weather, "weather");

/**
 * What the weather becomes through the `breach`. Same three effects again, a
 * little harder on the kit than the core, because the beyond is somewhere you
 * walked into rather than something asleep around you.
 */
const BEYOND_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "drift", weight: 16, effect: { kind: "break", scope: "cheapest", share: 0.28 } },
  { id: "undertow", weight: 12, effect: { kind: "break", scope: "best", share: 0.26 } },
  {
    id: "unravel",
    weight: 8,
    effect: { kind: "break", scope: "all", share: 0.2, condition: 0.06 },
  },
  { id: "fade", weight: 18, effect: { kind: "condition", loss: 0.09 } },
  { id: "hush", weight: 11, effect: { kind: "condition", loss: 0.16 } },
  { id: "bloom", weight: 9, effect: { kind: "boon", seconds: 90 } },
  { id: "clearing", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

const BEYOND_KINDS: readonly WeatherKind[] = named(BEYOND_KIND_SHAPES, THEME.weather, "weather");

/** Deep: heavier on the kit, because what you work down there is stone and it falls. */
const DEEP_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "quake", weight: 16, effect: { kind: "break", scope: "cheapest", share: 0.3 } },
  { id: "shear", weight: 13, effect: { kind: "break", scope: "best", share: 0.27 } },
  { id: "collapse", weight: 8, effect: { kind: "break", scope: "all", share: 0.2, condition: 0.06 } },
  { id: "dim", weight: 16, effect: { kind: "condition", loss: 0.09 } },
  { id: "smother", weight: 10, effect: { kind: "condition", loss: 0.16 } },
  { id: "vein", weight: 9, effect: { kind: "boon", seconds: 90 } },
  { id: "lode", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

/** Origin: the first world's weather again in shape, because it is the first world again. */
const ORIGIN_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "mist", weight: 16, effect: { kind: "break", scope: "cheapest", share: 0.28 } },
  { id: "gale", weight: 12, effect: { kind: "break", scope: "best", share: 0.26 } },
  { id: "unmaking", weight: 8, effect: { kind: "break", scope: "all", share: 0.2, condition: 0.06 } },
  { id: "wilt", weight: 18, effect: { kind: "condition", loss: 0.09 } },
  { id: "fallow", weight: 11, effect: { kind: "condition", loss: 0.16 } },
  { id: "harvest", weight: 9, effect: { kind: "boon", seconds: 90 } },
  { id: "jubilee", weight: 3, effect: { kind: "boon", seconds: 300 } },
];

/** Void: harder than anything before it, and the heavy breaks come round more. */
const VOID_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "flicker", weight: 16, effect: { kind: "break", scope: "cheapest", share: 0.32 } },
  { id: "tear", weight: 14, effect: { kind: "break", scope: "best", share: 0.3 } },
  { id: "unbecoming", weight: 10, effect: { kind: "break", scope: "all", share: 0.22, condition: 0.07 } },
  { id: "chill", weight: 16, effect: { kind: "condition", loss: 0.1 } },
  { id: "silence", weight: 11, effect: { kind: "condition", loss: 0.18 } },
  { id: "kindling", weight: 8, effect: { kind: "boon", seconds: 90 } },
  { id: "genesis", weight: 2, effect: { kind: "boon", seconds: 300 } },
];

/** End: the worst table in the game. Everything wears out at the end. */
const END_KIND_SHAPES: readonly Shape<WeatherKind>[] = [
  { id: "fray", weight: 16, effect: { kind: "break", scope: "cheapest", share: 0.34 } },
  { id: "rust", weight: 14, effect: { kind: "break", scope: "best", share: 0.32 } },
  { id: "entropy", weight: 11, effect: { kind: "break", scope: "all", share: 0.24, condition: 0.08 } },
  { id: "dusk", weight: 16, effect: { kind: "condition", loss: 0.11 } },
  { id: "heat_death", weight: 12, effect: { kind: "condition", loss: 0.2 } },
  { id: "afterglow", weight: 7, effect: { kind: "boon", seconds: 90 } },
  { id: "reprise", weight: 2, effect: { kind: "boon", seconds: 300 } },
];

/** One table per world; the deepest open world's is the one that blows. */
const KINDS_BY_WORLD: Record<World, readonly WeatherKind[]> = {
  outside: KINDS,
  inside: CORE_KINDS,
  beyond: BEYOND_KINDS,
  deep: named(DEEP_KIND_SHAPES, THEME.weather, "weather"),
  origin: named(ORIGIN_KIND_SHAPES, THEME.weather, "weather"),
  void: named(VOID_KIND_SHAPES, THEME.weather, "weather"),
  end: named(END_KIND_SHAPES, THEME.weather, "weather"),
};

function kindsFor(f: SiteState): readonly WeatherKind[] {
  return KINDS_BY_WORLD[WORLDS[f.depth] ?? "outside"];
}

/** Which ids each world's table can produce, so a test can pin that the swap happened. */
export const WEATHER_IDS = Object.fromEntries(
  WORLDS.map((w) => [w, KINDS_BY_WORLD[w].map((k) => k.id)]),
) as Record<World, string[]>;

/** Average gap between events, before any mitigation stretches it. */
export const MEAN_WEATHER_GAP_MS = seconds(300);

/**
 * A site this small has nothing worth wrecking, so the weather leaves it alone.
 * Without this, the first ten minutes are a player with four patches
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
  /** Condition health points taken, after mitigation. */
  conditionLost: number;
  /**
   * Share of production the event took, 0..1. Broken kit and tired condition cost
   * the same thing in the end, so this is the one number worth reading.
   */
  lostShare: number;
  /** Boon windfall plus any insurance payout. */
  gained: Yield;
  text: string;
}

/** When the next event lands, given the site as it stands at `from`. */
export function scheduleNext(f: SiteState, from: Millis): Millis {
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
function targetsFor(f: SiteState, scope: BreakScope): SoloProducerId[] {
  const live = SOLO_PRODUCERS.filter((prod) => workingCount(f, prod.id) > 0);
  if (live.length === 0) return [];
  if (scope === "all") return live.map((prod) => prod.id);
  if (scope === "cheapest") return [live[0]!.id];
  const best = live.reduce((a, b) => (producerRate(f, b.id) > producerRate(f, a.id) ? b : a));
  return [best.id];
}

/**
 * Each producer says what being hurt looks like for it, so a storm reads as
 * "3x Transport Van broken, 2x Hand worn out" rather than one verb over both.
 */
function describeBreak(broke: Partial<Record<SoloProducerId, number>>): string {
  return SOLO_PRODUCERS.filter((prod) => (broke[prod.id] ?? 0) > 0)
    .map((prod) => `${broke[prod.id]}x ${prod.name} ${prod.hurt}`)
    .join(", ");
}

/**
 * Resolve the event due at `at`. The site must already be integrated forward to
 * that instant — `advance` in site.ts is the only thing that should call this.
 *
 * Returns `null` for an event that came to nothing (too small a site, or a
 * storm with nothing left to break), so the caller can quietly reschedule
 * rather than log a non-event.
 */
export function fireWeather(f: SiteState, at: Millis): { site: SiteState; event: WeatherEvent | null } {
  const index = f.weatherIndex;
  const advanced: SiteState = { ...f, weatherIndex: index + 1 };

  if (cleanRate(f) < WEATHER_MIN_RATE) {
    return { site: { ...advanced, nextWeatherAt: scheduleNext(advanced, at) }, event: null };
  }

  const rng = rngFor(f.seed, hashIndex(index, "event"));
  const kind = pickKind(rng, kindsFor(f));

  let site = advanced;
  const rateBefore = currentRate(site);
  const broke: Partial<Record<SoloProducerId, number>> = {};
  let brokeTotal = 0;
  let conditionLost = 0;
  let gained = Y.zero;

  if (kind.effect.kind === "boon") {
    gained = Y.overTime(currentRate(site), seconds(kind.effect.seconds));
  } else {
    const before = { repairs: totalRepairs(site), condition: conditionRestoreCost(site) };

    // Breakage and condition are mitigated separately — a windbreak saves the kit,
    // ditches save the condition.
    const breakPotency = 1 - mitigation(site, "breakage");
    const conditionPotency = 1 - mitigation(site, "condition");

    if (kind.effect.kind === "break") {
      const brokenNow = { ...site.broken };
      for (const id of targetsFor(site, kind.effect.scope)) {
        const owned = site.producers[id] ?? 0;
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
        // site left alone walked to the broken cap regardless of what the run had
        // been spent on.
        //
        // Dropping the floor outright fixes that and overshoots: it hands the
        // same relief to sites with no land at all, because a storm rounding 0.4
        // units down to nothing is a storm that missed. So the floor is kept and
        // *mitigated* — at bare land it's the old guaranteed unit, and what you
        // build erodes it. That leaves the relief aimed at the players who paid
        // for it, which is the whole point.
        //
        // Below one unit the remainder is odds rather than a rounding, so a small
        // site still occasionally loses its only hauler instead of being immune to
        // arithmetic.
        const exact = Math.max(breakPotency, working * rolled);
        const want = Math.floor(exact) + (rng.next() < exact % 1 ? 1 : 0);
        if (want <= 0) continue;
        const cap = Math.max(0, Math.round(owned * brokenCeiling(site)) - already);
        const hit = Math.min(want, working, cap);
        if (hit <= 0) continue;
        brokenNow[id] = already + hit;
        broke[id] = (broke[id] ?? 0) + hit;
        brokeTotal += hit;
      }
      site = { ...site, broken: brokenNow };
    }

    const conditionHit =
      kind.effect.kind === "condition" ? kind.effect.loss : (kind.effect.condition ?? 0);
    if (conditionHit > 0) {
      conditionLost = takeCondition(site, conditionHit * conditionPotency);
      site = { ...site, condition: site.condition - conditionLost };
    }

    if (brokeTotal === 0 && conditionLost <= 1e-9) {
      return { site: { ...site, nextWeatherAt: scheduleNext(site, at) }, event: null };
    }

    // Insurance covers a share of the bill the event just handed you. It buys
    // nothing back directly — you still have to go and spend it on repairs.
    const billed =
      totalRepairs(site) - before.repairs + (conditionRestoreCost(site) - before.condition);
    gained = Y.of(Math.max(0, billed) * mitigation(site, "payout"));
  }

  site = {
    ...site,
    stock: Y.add(site.stock, gained),
    produced: Y.add(site.produced, gained),
    lifetimeProduced: Y.add(site.lifetimeProduced, gained),
  };
  site = { ...site, nextWeatherAt: scheduleNext(site, at) };

  const lostShare = rateBefore > 0 ? Math.max(0, 1 - currentRate(site) / rateBefore) : 0;

  // What happened, then what it costs you — in output, which is the only unit
  // the player has any feel for. "Took 8.0 condition" is a number from the engine;
  // "−8% production" is the same fact in the terms you'd act on.
  const parts: string[] = [];
  if (brokeTotal > 0) parts.push(describeBreak(broke));
  if (conditionLost > 1e-9) parts.push("tired the condition");
  if (kind.effect.kind === "boon") parts.push(`a good run, +${format(gained)}`);
  const cost =
    lostShare > 0.0005 ? ` −${(lostShare * 100).toFixed(0)}% production.` : "";
  const text = `${kind.name} — ${parts.join(", ")}.${cost}`;

  return {
    site,
    event: {
      index,
      at,
      id: kind.id,
      name: kind.name,
      tone: kind.effect.kind === "boon" ? "good" : "bad",
      broke,
      brokeTotal,
      conditionLost,
      lostShare,
      gained,
      text,
    },
  };
}

function totalRepairs(f: SiteState): number {
  let total = 0;
  for (const prod of SOLO_PRODUCERS) total += repairCost(f, prod.id);
  return total;
}

/** Condition actually taken, clamped so the land can never be run into the ground. */
function takeCondition(f: SiteState, want: number): number {
  return Math.max(0, Math.min(want, f.condition - conditionFloor(f)));
}

/**
 * How far down the land can be pushed, and how much of the kit can be taken
 * apart, given what you've built against it.
 *
 * Slowing the damage was never enough on its own. Every hit here is permanent
 * and the events never stop, so *any* positive rate of loss walks a site to its
 * clamp over a long enough absence — mitigation bought hours and changed
 * nothing about where the site ended up. Both worst cases were constants, so
 * every unattended site arrived at the identical wreck: every producer at half
 * broken, condition on the floor, production down about 87%. Come back after
 * eight hours or a week and the site was in the same state, which is what made
 * the weather read as one catastrophe that had already happened rather than a
 * running cost you manage.
 *
 * So the land sets the floor as well as the slope. A site behind a full row of
 * poplars still gets knocked about by a storm, and still needs someone to come
 * and put it right — it just can't be dismantled while you're not looking.
 */
function brokenCeiling(f: SiteState): number {
  return SOLO_MAX_BROKEN_SHARE * (1 - mitigation(f, "breakage"));
}

function conditionFloor(f: SiteState): number {
  return MAX_CONDITION - (MAX_CONDITION - MIN_CONDITION) * (1 - mitigation(f, "condition"));
}
