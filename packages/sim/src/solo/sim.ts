// A headless player for tuning. Competent, not optimal.

import { Y, ms, seconds, type Millis, type Yield, type Rate } from "../numbers.js";
import { SOLO_PRODUCERS, SOLO_UPGRADES, WORLD_GATE, type SoloProducerId, type World } from "./content.js";
import {
  brokenCount,
  currentRate,
  isLandMaxed,
  isProducerAvailable,
  isUnlocked,
  landCost,
  landLevel,
  landsFor,
  producerCost,
  producerMultiplier,
  producerRateEach,
  repairCost,
  conditionRestoreCost,
  upgradeCost,
  upkeepBill,
} from "./economy.js";
import { PERKS, headStartStock, perkCost } from "./prestige.js";
import { advance, applySiteCommand, createSite, gatePending, mustApplySite } from "./site.js";
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
    if (Y.gte(pile, upgradeCost(f, u))) return [{ type: "buy_upgrade", upgrade: u.id }];
  }

  if (style.landBudget > 0) {
    for (const land of landsFor(f)) {
      if (isLandMaxed(f, land.id)) continue;
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
    if (convergedAt === null && site.depth >= 1) {
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

// --- The long game: how far a line gets, by how many seeds it arrives with ---

export interface PushResult {
  /** Days from the hand-down to each world opening; absent if it never did. */
  opened: Partial<Record<World, number>>;
  site: SiteState;
}

/**
 * One generation played to a horizon by a saver who checks in every `tickHours`: fixes what's
 * broken, takes every upgrade, then buys whichever rung has the best payback counting the wait.
 * Starts with perks bought out of `seeds`. `tools/pace.mts` is the table of these.
 */
export function simulatePush(opts: { seeds: number; generation: number; days: number; tickHours?: number; seed?: string }): PushResult {
  const tick = seconds((opts.tickHours ?? 4) * 3_600);
  let site: SiteState = { ...createSite({ seed: opts.seed ?? "push", startedAt: ms(0) }), heirlooms: opts.seeds, generation: opts.generation, reached: 1 };
  for (const perk of PERKS) {
    while ((site.perks[perk.id] ?? 0) < perk.maxLevel && perkCost(perk, site.perks[perk.id] ?? 0) < site.heirlooms * 0.05) {
      site = mustApplySite(site, { type: "buy_perk", perk: perk.id }, ms(0));
    }
  }
  site = { ...site, stock: headStartStock(site.perks.head_start ?? 0) };

  const opened: PushResult["opened"] = {};
  const buy = (cmd: SiteCommand, t: Millis): boolean => {
    const res = applySiteCommand(site, cmd, t);
    if (res.ok) site = res.site;
    return res.ok;
  };

  for (let t = ms(0); t < opts.days * DAY_MS; t = ms(t + tick)) {
    site = advance(site, t, true).site;
    buy({ type: "click", count: 25 }, t);
    for (let spent = 0; spent < 4_000; spent++) {
      if (upkeepBill(site) > 0 && upkeepBill(site) <= site.stock * 0.5 && buy({ type: "fix_all" }, t)) continue;
      const pending = gatePending(site);
      if (pending) {
        if (!buy({ type: "buy_upgrade", upgrade: WORLD_GATE[pending] }, t)) break;
        opened[pending] = t / DAY_MS;
        continue;
      }
      const upgrade = SOLO_UPGRADES.find((u) => !site.upgrades.includes(u.id) && isUnlocked(site, u) && !Object.values(WORLD_GATE).includes(u.id) && upgradeCost(site, u) <= site.stock);
      if (upgrade && buy({ type: "buy_upgrade", upgrade: upgrade.id }, t)) continue;
      const land = landsFor(site).find((l) => !isLandMaxed(site, l.id) && landLevel(site, l.id) < 6 && landCost(site, l.id) <= site.stock * 0.1);
      if (land && buy({ type: "buy_land", land: land.id }, t)) continue;
      const rate = Math.max(1, currentRate(site));
      let pick: { id: SoloProducerId; score: number } | null = null;
      for (const prod of SOLO_PRODUCERS) {
        if (!isProducerAvailable(site, prod.id)) continue;
        const cost = producerCost(site, prod.id, 1);
        const score = cost / producerRateEach(site, prod.id) + Math.max(0, cost - site.stock) / rate;
        if (!pick || score < pick.score) pick = { id: prod.id, score };
      }
      if (!pick || !buy({ type: "buy_producer", producer: pick.id, qty: 1 }, t)) break;
    }
  }
  return { opened, site };
}
