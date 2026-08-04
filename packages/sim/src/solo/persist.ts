/**
 * Saving the mill, and picking it back up.
 *
 * A save is just the `MillState` plus a version tag — there's no derived data to
 * rebuild, because the state already is a checkpoint. Coming back after an
 * absence is the same `advance` a live tick uses, handed a bigger interval.
 */

import { P, ms, type Millis, type Puppies } from "../numbers.js";
import { MAX_BEDDING, type World } from "./content.js";
import { advance, CONVERGENCE_UPGRADE, rebase } from "./mill.js";
import type { MillState } from "./state.js";
import type { WeatherEvent } from "./weather.js";

export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: number;
  mill: MillState;
}

export function serializeMill(mill: MillState, savedAt: Millis): string {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, mill } satisfies SaveFile);
}

/**
 * Parse a save. Returns null for anything we can't trust rather than throwing —
 * a corrupt save should cost you a mill, not the ability to open the page.
 */
export function parseMill(raw: string): MillState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const save = parsed as Partial<SaveFile>;
  if (save.version !== SAVE_VERSION || typeof save.mill !== "object" || save.mill === null) {
    return null;
  }
  const f = save.mill as Partial<MillState>;
  if (typeof f.seed !== "string" || typeof f.checkpointAt !== "number") return null;

  const upgrades = Array.isArray(f.upgrades) ? (f.upgrades as string[]) : [];

  // Saves written before the flag existed still know whether the world folded:
  // they're holding the upgrade that did it. Without this backfill a mill that
  // had already converged would open with its sky back.
  const converged = f.converged ?? upgrades.includes(CONVERGENCE_UPGRADE);
  // And one written before there were two worlds was standing in whichever one
  // it had reached, which for a folded mill is inside the puppy.
  const world: World = converged && f.world !== "outside" ? "inside" : "outside";

  // Fill anything a hand-edited or partial save is missing, so one absent field
  // doesn't produce NaN puppies forever.
  return {
    seed: f.seed,
    startedAt: ms(f.startedAt ?? f.checkpointAt),
    puppies: finite(f.puppies),
    raised: finite(f.raised),
    checkpointAt: ms(f.checkpointAt),
    producers: { ...(f.producers ?? {}) },
    broken: { ...(f.broken ?? {}) },
    upgrades,
    land: f.land ?? {},
    bedding: Number.isFinite(f.bedding) ? Math.min(MAX_BEDDING, f.bedding as number) : MAX_BEDDING,
    weatherIndex: Math.max(0, Math.floor(f.weatherIndex ?? 0)),
    nextWeatherAt: ms(f.nextWeatherAt ?? f.checkpointAt),
    converged,
    world,
    papers: Math.max(0, Math.floor(f.papers ?? 0)),
    perks: f.perks ?? {},
    lifetimeRaised: finite(f.lifetimeRaised),
    generation: Math.max(1, Math.floor(f.generation ?? 1)),
    runStartedAt: ms(f.runStartedAt ?? f.startedAt ?? f.checkpointAt),
    log: Array.isArray(f.log) ? f.log.slice(-60) : [],
  };
}

function finite(n: unknown): Puppies {
  return P.of(typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 0);
}

export interface OfflineReport {
  awayMs: number;
  /** Puppies produced while away, before anything the weather handed back. */
  earned: Puppies;
  events: WeatherEvent[];
  brokeTotal: number;
  beddingLost: number;
  /** Boons and insurance payouts collected in your absence. */
  gained: Puppies;
}

/**
 * Resolve everything that happened between the save and now.
 *
 * A clock that moved backwards (an NTP correction, a fiddled system clock, the
 * back room's skew lever being put back) is no time passing rather than an
 * error: the mill rebases onto the earlier clock and carries on. It used to keep
 * the later checkpoint, which is the same thing as freezing the game until the
 * wall clock caught up — see `rebase`.
 */
export function resumeMill(saved: MillState, now: Millis): { mill: MillState; report: OfflineReport | null } {
  if (now <= saved.checkpointAt) return { mill: rebase(saved, now), report: null };

  const before = saved.puppies;
  const { mill, events } = advance(saved, now, true);
  const awayMs = now - saved.checkpointAt;

  const gained = P.of(events.reduce((sum, e) => sum + e.gained, 0));
  const report: OfflineReport = {
    awayMs,
    earned: P.of(Math.max(0, mill.puppies - before - gained)),
    events,
    brokeTotal: events.reduce((sum, e) => sum + e.brokeTotal, 0),
    beddingLost: events.reduce((sum, e) => sum + e.beddingLost, 0),
    gained,
  };
  return { mill, report };
}

/** Below this, an absence isn't worth interrupting anyone with a report. */
export const REPORT_THRESHOLD_MS = 60_000;

export function worthReporting(report: OfflineReport | null): boolean {
  if (!report) return false;
  return report.awayMs >= REPORT_THRESHOLD_MS && (report.earned > 0 || report.events.length > 0);
}
