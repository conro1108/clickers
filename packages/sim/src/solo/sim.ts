// A headless rival for tuning solo, as balance.ts is for versus. Competent, not optimal.

import { Y, ms, seconds, type Millis, type Yield, type Rate } from "../numbers.js";
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
  conditionRestoreCost,
} from "./economy.js";
import { advance, applySiteCommand, createSite } from "./site.js";
import type { SiteCommand, SiteState } from "./state.js";

export interface RivalStyle {
  clicksPerSecond: number;
  decisionMs: number;
  /** the *Budget fields are shares of the pile spent in one go */
  repairBudget: number;
  conditionBudget: number;
  landBudget: number;
  conditionFloor: number;
}

export const RIVAL_STYLES: Record<string, RivalStyle> = {
  keen: {
    clicksPerSecond: 2,
    decisionMs: 2_000,
    repairBudget: 0.35,
    conditionBudget: 0.35,
    landBudget: 0.15,
    conditionFloor: 0.9,
  },
  // control group for anything land-related
  reckless: {
    clicksPerSecond: 2,
    decisionMs: 2_000,
    repairBudget: 0.35,
    conditionBudget: 0.35,
    landBudget: 0,
    conditionFloor: 0.9,
  },
  // idle-player shape; not zero clicks, or a site with no producers earns nothing forever
  absent: {
    clicksPerSecond: 0.05,
    decisionMs: 60_000,
    repairBudget: 0.4,
    conditionBudget: 0.4,
    landBudget: 0.2,
    conditionFloor: 0.85,
  },
};

// live rate, not clean rate, so the `well` is discounted for tired condition
function valueOf(f: SiteState, id: SoloProducerId): number {
  return producerRateEach(f, id) / producerCost(f, id, 1);
}

export function rivalTurn(f: SiteState, style: RivalStyle): SiteCommand[] {
  const cmds: SiteCommand[] = [];
  const pile = f.stock;

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

  const conditionBill = conditionRestoreCost(f);
  if (f.condition < style.conditionFloor && conditionBill > 0 && conditionBill <= pile * style.conditionBudget) {
    return [{ type: "restore_condition" }];
  }

  for (const u of SOLO_UPGRADES) {
    if (f.upgrades.includes(u.id) || !isUnlocked(f, u)) continue;
    if (Y.gte(pile, u.cost)) return [{ type: "buy_upgrade", upgrade: u.id }];
  }

  if (style.landBudget > 0) {
    for (const land of LANDS) {
      if (!isLandAvailable(f, land.id)) continue;
      const cost = landCost(f, land.id);
      // keeps the buildings roughly in step
      if (landLevel(f, land.id) > 8) continue;
      if (cost <= pile * style.landBudget) return [{ type: "buy_land", land: land.id }];
    }
  }

  let pick: { id: SoloProducerId; value: number } | null = null;
  for (const prod of SOLO_PRODUCERS) {
    if (!isProducerAvailable(f, prod.id)) continue;
    if (!Y.gte(pile, producerCost(f, prod.id, 1))) continue;
    const value = valueOf(f, prod.id);
    if (!pick || value > pick.value) pick = { id: prod.id, value };
  }
  if (pick) cmds.push({ type: "buy_producer", producer: pick.id, qty: 1 });

  return cmds;
}

export interface SiteSample {
  atSeconds: number;
  rate: Rate;
  produced: Yield;
  condition: number;
  broken: number;
}

export interface SiteRunResult {
  site: SiteState;
  samples: SiteSample[];
  weatherEvents: number;
  brokeTotal: number;
  conditionLost: number;
}

/** `weather: false` suppresses the schedule, as a control group. */
export function simulateSite(opts: {
  seed: string;
  durationMs: number;
  style?: keyof typeof RIVAL_STYLES | RivalStyle;
  stepMs?: number;
  sampleEverySeconds?: number;
  weather?: boolean;
}): SiteRunResult {
  const step = opts.stepMs ?? 1_000;
  const sampleEvery = opts.sampleEverySeconds ?? 600;
  const style =
    typeof opts.style === "string"
      ? (RIVAL_STYLES[opts.style] ?? RIVAL_STYLES.keen!)
      : (opts.style ?? RIVAL_STYLES.keen!);

  const startedAt = ms(0);
  let site = createSite({ seed: opts.seed, startedAt });
  if (opts.weather === false) site = { ...site, nextWeatherAt: ms(Number.POSITIVE_INFINITY) };

  const samples: SiteSample[] = [];
  let weatherEvents = 0;
  let brokeTotal = 0;
  let conditionLost = 0;
  let clickCarry = 0;
  let nextDecision = 0;

  const apply = (cmd: SiteCommand, t: Millis) => {
    const res = applySiteCommand(site, cmd, t);
    if (res.ok) site = res.site;
  };

  for (let t = startedAt; t < startedAt + opts.durationMs; t = ms(t + step)) {
    clickCarry += (style.clicksPerSecond * step) / 1000;
    const clicks = Math.floor(clickCarry);
    if (clicks > 0) {
      clickCarry -= clicks;
      apply({ type: "click", count: clicks }, t);
    }

    if (t >= nextDecision) {
      nextDecision = t + style.decisionMs;
      for (const cmd of rivalTurn(site, style)) apply(cmd, t);
    }

    // time must advance even with nothing bought, or weather never lands on an idle site
    const stepped = advance(site, ms(t + step));
    site = stepped.site;
    weatherEvents += stepped.events.length;
    for (const e of stepped.events) {
      brokeTotal += e.brokeTotal;
      conditionLost += e.conditionLost;
    }

    const elapsed = (t + step - startedAt) / 1000;
    if (elapsed % sampleEvery === 0) {
      let broken = 0;
      for (const prod of SOLO_PRODUCERS) broken += brokenCount(site, prod.id);
      samples.push({
        atSeconds: elapsed,
        rate: currentRate(site),
        produced: site.produced,
        condition: site.condition,
        broken,
      });
    }
  }

  return { site, samples, weatherEvents, brokeTotal, conditionLost };
}

// --- Playing the way people play ---
// Sessions are stepped; the gaps between them are single `advance` calls, so nobody repairs in them.
export interface CheckInCadence {
  sessionsPerDay: number;
  sessionMs: number;
}

export const CHECK_INS: Record<"heavy" | "normal" | "light", CheckInCadence> = {
  heavy: { sessionsPerDay: 4, sessionMs: seconds(1_800) },
  normal: { sessionsPerDay: 3, sessionMs: seconds(900) },
  light: { sessionsPerDay: 2, sessionMs: seconds(600) },
};

export interface CadenceResult {
  site: SiteState;
  firstOwned: Partial<Record<SoloProducerId, number>>;
  convergedAt: number | null;
  /** Rate at the moment of the fold; prices the `ur_form`. */
  convergedRate: Rate | null;
  elapsedMs: number;
  playedMs: number;
}

const DAY_MS = seconds(86_400);

export function simulateCadence(opts: {
  seed: string;
  days: number;
  cadence: keyof typeof CHECK_INS | CheckInCadence;
  style?: keyof typeof RIVAL_STYLES | RivalStyle;
  stepMs?: number;
}): CadenceResult {
  const step = opts.stepMs ?? 1_000;
  const cadence = typeof opts.cadence === "string" ? CHECK_INS[opts.cadence] : opts.cadence;
  const style =
    typeof opts.style === "string"
      ? (RIVAL_STYLES[opts.style] ?? RIVAL_STYLES.keen!)
      : (opts.style ?? RIVAL_STYLES.keen!);

  let site = createSite({ seed: opts.seed, startedAt: ms(0) });
  const firstOwned: Partial<Record<SoloProducerId, number>> = {};
  let convergedAt: number | null = null;
  let convergedRate: Rate | null = null;
  let playedMs = 0;

  const note = (at: number) => {
    for (const prod of SOLO_PRODUCERS) {
      if (firstOwned[prod.id] === undefined && (site.producers[prod.id] ?? 0) > 0) {
        firstOwned[prod.id] = at;
      }
    }
    if (convergedAt === null && site.converged) {
      convergedAt = at;
      convergedRate = currentRate(site);
    }
  };

  const apply = (cmd: SiteCommand, t: Millis) => {
    const res = applySiteCommand(site, cmd, t);
    if (res.ok) site = res.site;
  };

  const gap = DAY_MS / cadence.sessionsPerDay;
  for (let d = 0; d < opts.days; d++) {
    for (let s = 0; s < cadence.sessionsPerDay; s++) {
      const start = Math.round(d * DAY_MS + s * gap);
      site = advance(site, ms(start), true).site;
      let clickCarry = 0;
      let nextDecision = start;
      for (let t = start; t < start + cadence.sessionMs; t += step) {
        clickCarry += (style.clicksPerSecond * step) / 1000;
        const clicks = Math.floor(clickCarry);
        if (clicks > 0) {
          clickCarry -= clicks;
          apply({ type: "click", count: clicks }, ms(t));
        }
        if (t >= nextDecision) {
          nextDecision = t + style.decisionMs;
          for (const cmd of rivalTurn(site, style)) apply(cmd, ms(t));
        }
        site = advance(site, ms(t + step)).site;
        note(t + step);
      }
      playedMs += cadence.sessionMs;
    }
  }

  const end = Math.round(opts.days * DAY_MS);
  site = advance(site, ms(end), true).site;
  note(end);
  return { site, firstOwned, convergedAt, convergedRate, elapsedMs: end, playedMs };
}
