/**
 * Saving the site, and picking it back up.
 *
 * A save is just the `SiteState` plus a version tag — there's no derived data to
 * rebuild, because the state already is a checkpoint. Coming back after an
 * absence is the same `advance` a live tick uses, handed a bigger interval.
 */

import { Y, ms, type Millis, type Yield } from "../numbers.js";
import { MAX_CONDITION, type World } from "./content.js";
import { advance, CONVERGENCE_UPGRADE, rebase } from "./site.js";
import type { SiteState } from "./state.js";
import type { WeatherEvent } from "./weather.js";

export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: number;
  site: SiteState;
}

export function serializeSite(site: SiteState, savedAt: Millis): string {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, site } satisfies SaveFile);
}

/**
 * Parse a save. Returns null for anything we can't trust rather than throwing —
 * a corrupt save should cost you a site, not the ability to open the page.
 */
export function parseSite(raw: string): SiteState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const save = parsed as Partial<SaveFile> & { farm?: unknown; mill?: unknown };
  if (save.version !== SAVE_VERSION) return null;
  // Saves from before the two games shared an engine wrote the site under the
  // name that game called it, with that game's word for every field.
  const body = save.site ?? save.farm ?? save.mill;
  if (typeof body !== "object" || body === null) return null;
  const f = renamed(body as Record<string, unknown>);
  if (typeof f.seed !== "string" || typeof f.checkpointAt !== "number") return null;

  const upgrades = Array.isArray(f.upgrades) ? (f.upgrades as string[]).map(migrateId) : [];

  // Saves written before the flag existed still know whether the world folded:
  // they're holding the upgrade that did it. Without this backfill a site that
  // had already converged would open with its sky back.
  const converged = f.converged ?? upgrades.includes(CONVERGENCE_UPGRADE);
  // And one written before there were two worlds was standing in whichever one
  // it had reached, which for a folded site is inside the core.
  const world: World = converged && f.world !== "outside" ? "inside" : "outside";

  // Fill anything a hand-edited or partial save is missing, so one absent field
  // doesn't produce NaN stock forever.
  return {
    seed: f.seed,
    startedAt: ms(f.startedAt ?? f.checkpointAt),
    stock: finite(f.stock),
    produced: finite(f.produced),
    checkpointAt: ms(f.checkpointAt),
    producers: remapKeys(f.producers),
    broken: remapKeys(f.broken),
    upgrades,
    land: remapKeys(f.land),
    condition: Number.isFinite(f.condition) ? Math.min(MAX_CONDITION, f.condition as number) : MAX_CONDITION,
    weatherIndex: Math.max(0, Math.floor(f.weatherIndex ?? 0)),
    nextWeatherAt: ms(f.nextWeatherAt ?? f.checkpointAt),
    converged,
    world,
    heirlooms: Math.max(0, Math.floor(f.heirlooms ?? 0)),
    perks: remapKeys(f.perks),
    lifetimeProduced: finite(f.lifetimeProduced),
    generation: Math.max(1, Math.floor(f.generation ?? 1)),
    runStartedAt: ms(f.runStartedAt ?? f.startedAt ?? f.checkpointAt),
    log: Array.isArray(f.log) ? f.log.slice(-60) : [],
  };
}

/**
 * The old themed field names, mapped onto the neutral ones.
 *
 * Both games kept their save in localStorage under their own vocabulary, and
 * the engine merging cost them nothing else — so it shouldn't cost them their
 * site either. Absent keys are simply not there, which the caller already fills.
 */
const OLD_NAMES: Record<string, string> = {
  potatoes: "stock",
  puppies: "stock",
  harvested: "produced",
  raised: "produced",
  lifetimeHarvested: "lifetimeProduced",
  lifetimeRaised: "lifetimeProduced",
  soil: "condition",
  bedding: "condition",
  seeds: "heirlooms",
  papers: "heirlooms",
};

/**
 * Every content id the two games used before they shared an engine.
 *
 * The potato game's ids and the puppy game's ids never collide — where both
 * had a rung they agreed on a name for, they agreed on the same name — so one
 * table migrates either save without needing to know which game wrote it.
 */
const OLD_IDS: Record<string, string> = {
  backhoe: "tool_5",
  bedding_rot: "rot",
  better_kibble: "boost_1",
  bigLitter: "windfall",
  big_lap: "tool_6",
  blight: "disease",
  bruise: "fold",
  bumper: "windfall",
  callus: "packing",
  callus_beds: "inner_beds",
  carrying_voice: "strong_click",
  ceramic_bulbs: "mult_rig",
  cough: "disease",
  crop_rotation: "boost_2",
  deepSleep: "dormant",
  deep_bedding: "deep_condition",
  deep_roots: "deep_condition",
  designer_genes: "boost_3",
  dormancy_rig: "inner_calm",
  drip_lines: "mult_rig",
  drought: "swelter",
  erosion: "rot",
  fertilizer: "boost_1",
  fleece: "face",
  flesh_tithe: "core_tithe",
  flush: "respite",
  foxes: "vermin",
  fresh_ticking: "inner_lining",
  gmo_seed: "boost_3",
  gold_spade: "tool_3",
  gold_whistle: "tool_3",
  good_stock: "knack",
  green_thumb: "knack",
  greenhouse: "shelter",
  groomer: "machine",
  guard_dog: "ward",
  habitat_charter: "habitat",
  hands_of_god: "tool_6",
  harvester: "machine",
  heatlamp: "rig",
  heatwave: "swelter",
  hem: "fold",
  inspection: "sweep",
  irrigation: "rig",
  kennel_club: "charter",
  kibble: "refinery",
  lint_reclaim: "inner_reclaim",
  linthand: "deephand",
  locusts: "sweep",
  lullaby_rig: "inner_calm",
  matting: "decay",
  mineral_rights: "deep_rights",
  moles: "vermin",
  necrosis: "decay",
  nest_tithe: "core_tithe",
  overtime_pay: "mult_hand",
  padded_seams: "inner_beds",
  pen: "patch",
  phloem: "static",
  pithand: "deephand",
  plot: "patch",
  quarantine: "shelter",
  quarry: "face",
  quiescent: "dormant",
  raised_beds: "mult_patch",
  rest_rotation: "boost_2",
  ring: "main",
  sap_reclaim: "inner_reclaim",
  scar_tissue: "inner_lining",
  scarecrow: "ward",
  seam: "main",
  seeder: "airship",
  shedding: "surge",
  sigh: "respite",
  silver_whistle: "tool_1",
  soil_rot: "rot",
  spade: "tool_1",
  sprout_pressure: "inner_press",
  squeaker: "tool_5",
  starch_flood: "surge",
  straw_bedding: "mult_patch",
  strong_back: "strong_click",
  suberin: "settling",
  subsidy: "charter",
  terraform: "habitat",
  third_chihuahua: "third_form",
  third_potato: "third_form",
  tractor: "hauler",
  treats: "tool_4",
  trowel: "tool_4",
  turbo_diesel: "mult_hauler",
  turnover: "inner_press",
  two_hand_spade: "tool_2",
  two_tone_whistle: "tool_2",
  ur_chihuahua: "ur_form",
  ur_potato: "ur_form",
  van: "hauler",
  voles: "vermin",
  zeppelin: "airship",
};

/** Migrate the keys of an id-keyed record, e.g. `{ tractor: 3 }` -> `{ hauler: 3 }`. */
function remapKeys<T>(rec: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, value] of Object.entries(rec ?? {})) out[migrateId(id)] = value;
  return out;
}

/** Ids of the per-rung upgrades are the producer id plus a suffix. */
function migrateId(id: string): string {
  const tier = /^(.+)(_x2[abc])$/.exec(id);
  if (tier) return `${OLD_IDS[tier[1]!] ?? tier[1]}${tier[2]}`;
  return OLD_IDS[id] ?? id;
}

function renamed(body: Record<string, unknown>): Partial<SiteState> {
  const out: Record<string, unknown> = {};
  // Aliases first and current names second, so a save already written in the
  // new vocabulary always wins over a stray legacy key sitting beside it.
  for (const [key, value] of Object.entries(body)) {
    const to = OLD_NAMES[key];
    if (to) out[to] = value;
  }
  for (const [key, value] of Object.entries(body)) {
    if (!OLD_NAMES[key]) out[key] = value;
  }
  return out as Partial<SiteState>;
}

function finite(n: unknown): Yield {
  return Y.of(typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : 0);
}

export interface OfflineReport {
  awayMs: number;
  /** Yield produced while away, before anything the weather handed back. */
  earned: Yield;
  events: WeatherEvent[];
  brokeTotal: number;
  conditionLost: number;
  /** Boons and insurance payouts collected in your absence. */
  gained: Yield;
}

/**
 * Resolve everything that happened between the save and now.
 *
 * A clock that moved backwards (an NTP correction, a fiddled system clock, the
 * back room's skew lever being put back) is no time passing rather than an
 * error: the site rebases onto the earlier clock and carries on. It used to keep
 * the later checkpoint, which is the same thing as freezing the game until the
 * wall clock caught up — see `rebase`.
 */
export function resumeSite(saved: SiteState, now: Millis): { site: SiteState; report: OfflineReport | null } {
  if (now <= saved.checkpointAt) return { site: rebase(saved, now), report: null };

  const before = saved.stock;
  const { site, events } = advance(saved, now, true);
  const awayMs = now - saved.checkpointAt;

  const gained = Y.of(events.reduce((sum, e) => sum + e.gained, 0));
  const report: OfflineReport = {
    awayMs,
    earned: Y.of(Math.max(0, site.stock - before - gained)),
    events,
    brokeTotal: events.reduce((sum, e) => sum + e.brokeTotal, 0),
    conditionLost: events.reduce((sum, e) => sum + e.conditionLost, 0),
    gained,
  };
  return { site, report };
}

/** Below this, an absence isn't worth interrupting anyone with a report. */
export const REPORT_THRESHOLD_MS = 60_000;

export function worthReporting(report: OfflineReport | null): boolean {
  if (!report) return false;
  return report.awayMs >= REPORT_THRESHOLD_MS && (report.earned > 0 || report.events.length > 0);
}
