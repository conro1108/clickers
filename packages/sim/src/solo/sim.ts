/**
 * A headless miller, for tuning.
 *
 * Same job `balance.ts` does for versus: play a whole run with nobody watching
 * so a cost curve can be changed and the consequences read off, instead of
 * guessed at. This player is competent, not optimal — it buys the best value it
 * can see and keeps the place standing, which is roughly what an engaged player
 * does without a spreadsheet.
 */

import { P, ms, seconds, type Millis, type Puppies, type Rate } from "../numbers.js";
import { LANDS, SOLO_PRODUCERS, SOLO_UPGRADES, type SoloProducerId } from "./content.js";
import {
  brokenCount,
  currentRate,
  isLandAvailable,
  isProducerAvailable,
  isUnlocked,
  landCost,
  landLevel,
  producerCost,
  producerMultiplier,
  producerRateEach,
  repairCost,
  beddingRestoreCost,
} from "./economy.js";
import { advance, applyMillCommand, createMill } from "./mill.js";
import type { MillCommand, MillState } from "./state.js";

export interface MillerStyle {
  /** Whistles per second while playing. */
  whistlesPerSecond: number;
  /** How often the miller looks at the shop. */
  decisionMs: number;
  /** Share of the pile it will put into repairs in one go. */
  repairBudget: number;
  /** Share of the pile it will put into bedding restoration in one go. */
  beddingBudget: number;
  /** Share of the pile it will put into mitigation buildings in one go. */
  landBudget: number;
  /** Below this bedding health, restoring becomes a priority. */
  beddingFloor: number;
}

export const MILLER_STYLES: Record<string, MillerStyle> = {
  /** Buys growth, patches damage, ignores the land until it bites. */
  keen: {
    whistlesPerSecond: 2,
    decisionMs: 2_000,
    repairBudget: 0.35,
    beddingBudget: 0.35,
    landBudget: 0.15,
    beddingFloor: 0.9,
  },
  /** Never builds mitigation. A control group for anything land-related. */
  reckless: {
    whistlesPerSecond: 2,
    decisionMs: 2_000,
    repairBudget: 0.35,
    beddingBudget: 0.35,
    landBudget: 0,
    beddingFloor: 0.9,
  },
  /**
   * Barely clicks, checks in rarely. The idle-player shape, and the control
   * group for "how much faster is clicking?". Not zero whistles: a mill with no
   * producers and no clicks earns nothing forever, so a truly idle bot measures
   * nothing at all.
   */
  absent: {
    whistlesPerSecond: 0.05,
    decisionMs: 60_000,
    repairBudget: 0.4,
    beddingBudget: 0.4,
    landBudget: 0.2,
    beddingFloor: 0.85,
  },
};

/**
 * Production per puppy spent — the only ranking that matters when buying.
 * Measured as what the unit would actually add to the mill's rate as it stands,
 * not its clean rate, so the Down Well gets discounted for tired bedding the way
 * a buyer looking at the shop would discount it.
 */
function valueOf(f: MillState, id: SoloProducerId): number {
  return producerRateEach(f, id) / producerCost(f, id, 1);
}

/** What the miller would do right now, in priority order. */
export function millerTurn(f: MillState, style: MillerStyle): MillCommand[] {
  const cmds: MillCommand[] = [];
  const pile = f.puppies;

  // Broken kit first: it's the only spend that pays back instantly and in full.
  let best: { id: SoloProducerId; value: number } | null = null;
  for (const prod of SOLO_PRODUCERS) {
    const broken = brokenCount(f, prod.id);
    if (broken <= 0) continue;
    const cost = repairCost(f, prod.id);
    if (cost > pile * style.repairBudget) continue;
    const restored = broken * prod.baseRate * producerMultiplier(f, prod.id);
    const value = restored / cost;
    if (!best || value > best.value) best = { id: prod.id, value };
  }
  if (best) return [{ type: "repair", producer: best.id }];

  const beddingBill = beddingRestoreCost(f);
  if (f.bedding < style.beddingFloor && beddingBill > 0 && beddingBill <= pile * style.beddingBudget) {
    return [{ type: "restore_bedding" }];
  }

  // Upgrades are flat-priced doublings — always the best buy on the board when
  // they're affordable at all.
  for (const u of SOLO_UPGRADES) {
    if (f.upgrades.includes(u.id) || !isUnlocked(f, u)) continue;
    if (P.gte(pile, u.cost)) return [{ type: "buy_upgrade", upgrade: u.id }];
  }

  if (style.landBudget > 0) {
    for (const land of LANDS) {
      if (!isLandAvailable(f, land.id)) continue;
      const cost = landCost(f, land.id);
      // Keeps the buildings roughly in step rather than pouring everything into
      // whichever one happens to be cheapest.
      if (landLevel(f, land.id) > 8) continue;
      if (cost <= pile * style.landBudget) return [{ type: "buy_land", land: land.id }];
    }
  }

  let pick: { id: SoloProducerId; value: number } | null = null;
  for (const prod of SOLO_PRODUCERS) {
    if (!isProducerAvailable(f, prod.id)) continue;
    if (!P.gte(pile, producerCost(f, prod.id, 1))) continue;
    const value = valueOf(f, prod.id);
    if (!pick || value > pick.value) pick = { id: prod.id, value };
  }
  if (pick) cmds.push({ type: "buy_producer", producer: pick.id, qty: 1 });

  return cmds;
}

export interface MillSample {
  atSeconds: number;
  rate: Rate;
  raised: Puppies;
  bedding: number;
  broken: number;
}

export interface MillRunResult {
  mill: MillState;
  samples: MillSample[];
  weatherEvents: number;
  brokeTotal: number;
  beddingLost: number;
}

/**
 * Play a mill for `durationMs`.
 *
 * `weather: false` suppresses the schedule entirely, which is how the tests get
 * a control group to measure the weather's cost against.
 */
export function simulateMill(opts: {
  seed: string;
  durationMs: number;
  style?: keyof typeof MILLER_STYLES | MillerStyle;
  stepMs?: number;
  sampleEverySeconds?: number;
  weather?: boolean;
}): MillRunResult {
  const step = opts.stepMs ?? 1_000;
  const sampleEvery = opts.sampleEverySeconds ?? 600;
  const style =
    typeof opts.style === "string"
      ? (MILLER_STYLES[opts.style] ?? MILLER_STYLES.keen!)
      : (opts.style ?? MILLER_STYLES.keen!);

  const startedAt = ms(0);
  let mill = createMill({ seed: opts.seed, startedAt });
  if (opts.weather === false) mill = { ...mill, nextWeatherAt: ms(Number.POSITIVE_INFINITY) };

  const samples: MillSample[] = [];
  let weatherEvents = 0;
  let brokeTotal = 0;
  let beddingLost = 0;
  let whistleCarry = 0;
  let nextDecision = 0;

  const apply = (cmd: MillCommand, t: Millis) => {
    const res = applyMillCommand(mill, cmd, t);
    if (res.ok) mill = res.mill;
  };

  for (let t = startedAt; t < startedAt + opts.durationMs; t = ms(t + step)) {
    whistleCarry += (style.whistlesPerSecond * step) / 1000;
    const whistles = Math.floor(whistleCarry);
    if (whistles > 0) {
      whistleCarry -= whistles;
      apply({ type: "whistle", count: whistles }, t);
    }

    if (t >= nextDecision) {
      nextDecision = t + style.decisionMs;
      for (const cmd of millerTurn(mill, style)) apply(cmd, t);
    }

    // Nothing bought this step still has to move time forward, or the weather
    // never lands on an idle mill.
    const stepped = advance(mill, ms(t + step));
    mill = stepped.mill;
    weatherEvents += stepped.events.length;
    for (const e of stepped.events) {
      brokeTotal += e.brokeTotal;
      beddingLost += e.beddingLost;
    }

    const elapsed = (t + step - startedAt) / 1000;
    if (elapsed % sampleEvery === 0) {
      let broken = 0;
      for (const prod of SOLO_PRODUCERS) broken += brokenCount(mill, prod.id);
      samples.push({
        atSeconds: elapsed,
        rate: currentRate(mill),
        raised: mill.raised,
        bedding: mill.bedding,
        broken,
      });
    }
  }

  return { mill, samples, weatherEvents, brokeTotal, beddingLost };
}

// ---------------------------------------------------------------------------
// Playing the way people play
// ---------------------------------------------------------------------------

/**
 * `simulateMill` never closes the tab. That's the right control group for the
 * economy but the wrong model of a person, and the difference matters here
 * specifically: nobody repairs anything in the gaps. A mill that gets checked on
 * three times a day spends most of the week accumulating damage nobody is there
 * to undo, which is the only thing separating a real playthrough from the
 * always-on bot.
 *
 * So: play a session, jump the clock to the next one, play again. Only the
 * sessions are stepped — the gaps are single `advance` calls, which is both
 * exact (solo has no timed effects) and cheap enough that a fortnight of this
 * runs in a test.
 */
export interface CheckInCadence {
  /** Sessions a day, spread evenly through it. */
  sessionsPerDay: number;
  /** How long one lasts. */
  sessionMs: number;
}

/** The three cadences the endgame's pacing is quoted against. */
export const CHECK_INS: Record<"heavy" | "normal" | "light", CheckInCadence> = {
  heavy: { sessionsPerDay: 4, sessionMs: seconds(1_800) },
  normal: { sessionsPerDay: 3, sessionMs: seconds(900) },
  light: { sessionsPerDay: 2, sessionMs: seconds(600) },
};

export interface CadenceResult {
  mill: MillState;
  /** Elapsed ms at which each producer was first owned. */
  firstOwned: Partial<Record<SoloProducerId, number>>;
  /** Elapsed ms at which the horizon closed, or null if it never did. */
  convergedAt: number | null;
  /** What the mill was making the moment it folded. Prices the Ur-Chihuahua. */
  convergedRate: Rate | null;
  /** Wall clock covered, including everything spent away. */
  elapsedMs: number;
  /** How much of that was actually spent playing. */
  playedMs: number;
}

const DAY_MS = seconds(86_400);

export function simulateCadence(opts: {
  seed: string;
  days: number;
  cadence: keyof typeof CHECK_INS | CheckInCadence;
  style?: keyof typeof MILLER_STYLES | MillerStyle;
  stepMs?: number;
}): CadenceResult {
  const step = opts.stepMs ?? 1_000;
  const cadence = typeof opts.cadence === "string" ? CHECK_INS[opts.cadence] : opts.cadence;
  const style =
    typeof opts.style === "string"
      ? (MILLER_STYLES[opts.style] ?? MILLER_STYLES.keen!)
      : (opts.style ?? MILLER_STYLES.keen!);

  let mill = createMill({ seed: opts.seed, startedAt: ms(0) });
  const firstOwned: Partial<Record<SoloProducerId, number>> = {};
  let convergedAt: number | null = null;
  let convergedRate: Rate | null = null;
  let playedMs = 0;

  const note = (at: number) => {
    for (const prod of SOLO_PRODUCERS) {
      if (firstOwned[prod.id] === undefined && (mill.producers[prod.id] ?? 0) > 0) {
        firstOwned[prod.id] = at;
      }
    }
    if (convergedAt === null && mill.converged) {
      convergedAt = at;
      convergedRate = currentRate(mill);
    }
  };

  const apply = (cmd: MillCommand, t: Millis) => {
    const res = applyMillCommand(mill, cmd, t);
    if (res.ok) mill = res.mill;
  };

  const gap = DAY_MS / cadence.sessionsPerDay;
  for (let d = 0; d < opts.days; d++) {
    for (let s = 0; s < cadence.sessionsPerDay; s++) {
      const start = Math.round(d * DAY_MS + s * gap);
      // Everything between check-ins happens to a mill with nobody in it.
      mill = advance(mill, ms(start), true).mill;
      let whistleCarry = 0;
      let nextDecision = start;
      for (let t = start; t < start + cadence.sessionMs; t += step) {
        whistleCarry += (style.whistlesPerSecond * step) / 1000;
        const whistles = Math.floor(whistleCarry);
        if (whistles > 0) {
          whistleCarry -= whistles;
          apply({ type: "whistle", count: whistles }, ms(t));
        }
        if (t >= nextDecision) {
          nextDecision = t + style.decisionMs;
          for (const cmd of millerTurn(mill, style)) apply(cmd, ms(t));
        }
        mill = advance(mill, ms(t + step)).mill;
        note(t + step);
      }
      playedMs += cadence.sessionMs;
    }
  }

  const end = Math.round(opts.days * DAY_MS);
  mill = advance(mill, ms(end), true).mill;
  note(end);
  return { mill, firstOwned, convergedAt, convergedRate, elapsedMs: end, playedMs };
}
