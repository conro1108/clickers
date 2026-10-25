// Save/load. A save is the SiteState plus a version tag; resuming is `advance` with a big interval.

import { Y, ms, type Millis, type Yield } from "../numbers.js";
import { MAX_CONDITION, WORLD_GATE, WORLDS, type World } from "./content.js";
import { advance, rebase } from "./site.js";
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

/** Returns null rather than throwing: a corrupt save costs a site, not the page. */
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
  // pre-merge saves used each game's own vocabulary
  const body = save.site ?? save.farm ?? save.mill;
  if (typeof body !== "object" || body === null) return null;
  const f = renamed(body as Record<string, unknown>);
  if (typeof f.seed !== "string" || typeof f.checkpointAt !== "number") return null;

  const upgrades = Array.isArray(f.upgrades) ? (f.upgrades as string[]).map(migrateId) : [];

  const depth = savedDepth(f, upgrades);
  // An open world stays where it was. Otherwise a folded save that predates `world` lands inside, as it always did.
  const open = WORLDS.slice(0, depth + 1) as readonly unknown[];
  const world: World = open.includes(f.world)
    ? (f.world as World)
    : depth >= 1 && f.world !== "outside"
      ? "inside"
      : "outside";

  // fill missing fields so a partial save can't produce NaN forever
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
    depth,
    reached: Math.max(depth, Number.isFinite(f.reached) ? Math.min(WORLDS.length - 1, Math.floor(f.reached as number)) : 0),
    world,
    heirlooms: Math.max(0, Math.floor(f.heirlooms ?? 0)),
    perks: remapKeys(f.perks),
    lifetimeProduced: finite(f.lifetimeProduced),
    generation: Math.max(1, Math.floor(f.generation ?? 1)),
    runStartedAt: ms(f.runStartedAt ?? f.startedAt ?? f.checkpointAt),
    log: Array.isArray(f.log) ? f.log.slice(-60) : [],
  };
}

// Old themed field names mapped onto the neutral ones.
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

// Pre-merge content ids from both games; they never collide, so one table migrates either save.
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

function remapKeys<T>(rec: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, value] of Object.entries(rec ?? {})) out[migrateId(id)] = value;
  return out;
}

// per-rung upgrade ids are the producer id plus a suffix
function migrateId(id: string): string {
  const tier = /^(.+)(_x2[abc])$/.exec(id);
  if (tier) return `${OLD_IDS[tier[1]!] ?? tier[1]}${tier[2]}`;
  return OLD_IDS[id] ?? id;
}

function renamed(body: Record<string, unknown>): Partial<SiteState> {
  const out: Record<string, unknown> = {};
  // current names win over a stray legacy key beside them
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
  earned: Yield;
  events: WeatherEvent[];
  brokeTotal: number;
  conditionLost: number;
  /** boons and insurance payouts */
  gained: Yield;
}

/** A clock that moved backwards is no time passing, not an error — see `rebase`. */
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

export const REPORT_THRESHOLD_MS = 60_000;

export function worthReporting(report: OfflineReport | null): boolean {
  if (!report) return false;
  return report.awayMs >= REPORT_THRESHOLD_MS && (report.earned > 0 || report.events.length > 0);
}

/**
 * `depth` replaced two flags, `converged` (inside open) and `breached` (beyond
 * open), and those were themselves backfilled from the gates in `upgrades` for
 * saves older than either. Read whichever this save has.
 */
function savedDepth(f: Partial<SiteState> & { converged?: boolean; breached?: boolean }, upgrades: string[]): number {
  if (typeof f.depth === "number" && Number.isFinite(f.depth)) {
    return Math.max(0, Math.min(WORLDS.length - 1, Math.floor(f.depth)));
  }
  const converged = f.converged ?? upgrades.includes(WORLD_GATE.inside);
  if (!converged) return 0;
  return (f.breached ?? upgrades.includes(WORLD_GATE.beyond)) ? 2 : 1;
}
