import type { Millis, Yield } from "../numbers.js";
import type { LandId, SoloProducerId, World } from "./content.js";
import type { PerkId } from "./prestige.js";

// No timed effects here: weather leaves permanent damage, so rate is piecewise-constant between
// scheduled weather events and a week offline resolves exactly.
export interface SiteState {
  /** Weather is a pure function of this and `weatherIndex`. */
  seed: string;
  startedAt: Millis;

  /** `stock` and `produced` are as of `checkpointAt`. */
  stock: Yield;
  produced: Yield;
  checkpointAt: Millis;

  producers: Partial<Record<SoloProducerId, number>>;
  broken: Partial<Record<SoloProducerId, number>>;
  upgrades: string[];
  land: Partial<Record<LandId, number>>;

  /** Multiplies the whole site; falls with weather, rises only when paid for. */
  condition: number;

  weatherIndex: number;
  nextWeatherAt: Millis;

  // --- Persists across prestige resets ---
  /** The horizon has closed. Survives prestige unless `prestige.outside` reopens it. */
  converged: boolean;
  /** The second fold: `beyond` is open. Only ever true alongside `converged`, and goes with it. */
  breached: boolean;
  /** Which site you're standing on. Both run at once; this picks shop, land and picture only. */
  world: World;
  heirlooms: number;
  perks: Partial<Record<PerkId, number>>;
  lifetimeProduced: Yield;
  generation: number;
  runStartedAt: Millis;

  log: SiteLogEntry[];
}

export interface SiteLogEntry {
  index: number;
  at: Millis;
  text: string;
  tone: "neutral" | "good" | "bad";
}

export type SiteCommand =
  | { type: "click"; count: number }
  | { type: "buy_producer"; producer: SoloProducerId; qty: number }
  | { type: "buy_upgrade"; upgrade: string }
  | { type: "buy_land"; land: LandId }
  | { type: "repair"; producer: SoloProducerId }
  | { type: "restore_condition" }
  /** Every repair on the current world plus condition, all or nothing on purpose. */
  | { type: "fix_all" }
  | { type: "buy_perk"; perk: PerkId }
  /** `outside` reopens the horizon for the next generation; ignored if never folded. */
  | { type: "prestige"; outside?: boolean }
  /** A camera move, not a decision. Refused if never folded. */
  | { type: "warp"; to: World }
  /** Cheat: pays like clicks, every multiplier applies, and logs itself. */
  | { type: "dev_grant"; clicks: number }
  /** Pull the next scheduled weather event forward to now; changes when, not which. */
  | { type: "dev_weather" }
  | { type: "dev_heirlooms"; heirlooms: number }
  /** Opening back up strips core-only kit and `ur_form`, leaving a site one purchase short of the fold. */
  | { type: "dev_fold"; converged: boolean }
  /** Closing strips beyond-only kit and `breach`, leaving a site one purchase short of it. */
  | { type: "dev_breach"; breached: boolean };

export type SiteResult =
  | { ok: true; site: SiteState; entries: SiteLogEntry[] }
  | { ok: false; reason: string };
