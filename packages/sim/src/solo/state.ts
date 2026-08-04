import type { Millis, Puppies } from "../numbers.js";
import type { LandId, SoloProducerId, World } from "./content.js";
import type { PerkId } from "./prestige.js";

/**
 * The whole homestead, checkpointed.
 *
 * Note what isn't here: no timed effects. Weather in solo leaves permanent
 * damage, so nothing about a mill changes on its own between the instant it was
 * last touched and the next scheduled weather event. That makes the rate
 * piecewise-constant with boundaries we already know, which is what lets a week
 * offline resolve exactly rather than approximately.
 */
export interface MillState {
  /** Fixed at creation. Weather is a pure function of this and the event index. */
  seed: string;
  startedAt: Millis;

  /** Puppies on hand as of `checkpointAt`. */
  puppies: Puppies;
  /** Raised during the current run, also as of `checkpointAt`. */
  raised: Puppies;
  checkpointAt: Millis;

  producers: Partial<Record<SoloProducerId, number>>;
  /** Knocked offline by weather. Owned, producing nothing, until repaired. */
  broken: Partial<Record<SoloProducerId, number>>;
  upgrades: string[];
  /** Levels of each permanent mitigation building. */
  land: Partial<Record<LandId, number>>;

  /**
   * Multiplies the whole mill. Falls when weather hits and rises only when you
   * pay to put it right — the slow tax that makes ignoring the land expensive.
   */
  bedding: number;

  /** Cursor into the seeded weather schedule. Advances on every event. */
  weatherIndex: number;
  nextWeatherAt: Millis;

  // --- Persists across prestige resets -------------------------------------
  /**
   * The horizon has closed. Survives prestige by default, so the next
   * generation starts in the folded world and re-climbs to the tiers that only
   * exist inside it.
   *
   * The one thing that can put it back is handing the mill down and asking for
   * the sky — see `prestige`'s `outside`. It's the player's call rather than
   * automatic in either direction: making it routine would spend the spectacle
   * every generation, and making it permanent means the best ten seconds of the
   * game are something you're allowed to have exactly once and then never
   * again, on a save you keep for weeks.
   */
  converged: boolean;
  /**
   * Which mill you're standing on, and nothing more.
   *
   * Both mills run at once — the outside fields keep turning over puppies
   * while you're down in the flesh, and that's the whole pitch of the fold: you
   * don't trade the old mill in, you inherit it as an income and go build
   * something else with the money. So this touches no rate and no price. It
   * picks which shop, which land, and which picture.
   *
   * Always `outside` on a mill that hasn't converged, because there is nowhere
   * else to be.
   */
  world: World;
  /** Pedigree Paper on hand, spendable on perks. */
  papers: number;
  perks: Partial<Record<PerkId, number>>;
  /** Output across every run, ever. Only ever goes up. */
  lifetimeRaised: Puppies;
  /** How many times the mill has been handed down. */
  generation: number;
  runStartedAt: Millis;

  log: MillLogEntry[];
}

export interface MillLogEntry {
  index: number;
  at: Millis;
  text: string;
  tone: "neutral" | "good" | "bad";
}

export type MillCommand =
  | { type: "whistle"; count: number }
  | { type: "buy_producer"; producer: SoloProducerId; qty: number }
  | { type: "buy_upgrade"; upgrade: string }
  | { type: "buy_land"; land: LandId }
  | { type: "repair"; producer: SoloProducerId }
  | { type: "restore_bedding" }
  /**
   * Every repair on the mill you're standing on, plus the bedding, in one payment.
   *
   * All or nothing on purpose. Paying down half a bill in whatever order the
   * shop happened to list it is not a decision anyone was making — the choice
   * worth keeping is "put one thing right now or the whole lot later", and a
   * button that half-empties your yard takes that away without saying so.
   */
  | { type: "fix_all" }
  | { type: "buy_perk"; perk: PerkId }
  /**
   * `outside` opens the horizon back up on the way down: the next generation
   * starts under a sky, with the four tiers inside the puppy out of reach and
   * the Convergence to climb to all over again. Ignored by a mill that never
   * folded, which has nowhere to come out of.
   */
  | { type: "prestige"; outside?: boolean }
  /**
   * Step between the two mills. Free, instant, and reversible — it's a camera
   * move, not a decision. Refused on a mill that never folded, which has only
   * the one world.
   */
  | { type: "warp"; to: World }
  /**
   * A cheat, and named like one. `whistle` is deliberately capped so a batched
   * flush can't be forged, which also makes it useless for filling a yard up to
   * look at it. This pays out the same way a whistle does — every multiplier you
   * own applies — and writes itself into the log so a save that used it says so.
   */
  | { type: "dev_grant"; whistles: number }
  /**
   * Pull the next weather event forward to now. The schedule is a pure function
   * of the seed and `weatherIndex`, so this changes *when* the next one lands
   * and nothing about which one it is — you get the event the mill was always
   * going to get, early. Refused inside the puppy only in the sense that the
   * nest's table is what fires there, which is correct: the lever is "send the
   * next hazard", not "send rain".
   */
  | { type: "dev_weather" }
  /** Pedigree without a hand-down, for looking at the perk table. */
  | { type: "dev_papers"; papers: number }
  /**
   * Fold the horizon, or open it back up.
   *
   * Opening it back up is the only lever here that destroys anything: it strips
   * the kit that only exists inside the puppy and takes `ur_puppy` back off
   * the shelf, because the state it has to leave behind is "a mill one purchase
   * short of the fold" — which is the only state the fold animation can be
   * watched from. The yard and the run's output are left alone.
   */
  | { type: "dev_fold"; converged: boolean };

export type MillResult =
  | { ok: true; mill: MillState; entries: MillLogEntry[] }
  | { ok: false; reason: string };
