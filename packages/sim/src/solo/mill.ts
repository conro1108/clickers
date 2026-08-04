/**
 * The homestead's single authority for time and mutation.
 *
 * `advance` is the only thing that moves a mill forward, and every command runs
 * it first. Because solo has no timed effects, the only thing that can change a
 * rate mid-interval is a weather event — and those land at instants the state
 * already knows. So advancing across ten seconds and advancing across ten days
 * are the same code path, and both are exact.
 */

import { P, ms, type Millis, type Puppies } from "../numbers.js";
import {
  LAND_BY_ID,
  MAX_BEDDING,
  SOLO_PRODUCERS,
  SOLO_PRODUCER_BY_ID,
  SOLO_UPGRADE_BY_ID,
  producersIn,
  type LandId,
  type SoloProducerId,
} from "./content.js";
import {
  brokenCount,
  clickYield,
  currentRate,
  isLandAvailable,
  isPerkAvailable,
  isProducerAvailable,
  isUnlocked,
  landCost,
  perkLevel,
  producerCost,
  repairCost,
  beddingRestoreCost,
  upkeepBill,
} from "./economy.js";
import { PERK_BY_ID, headStartPuppies, perkCost, papersFor } from "./prestige.js";
import type { MillCommand, MillLogEntry, MillResult, MillState } from "./state.js";
import { fireWeather, scheduleNext, type WeatherEvent } from "./weather.js";

/** Clamp on batched whistles, matching the versus mode's flush window. */
export const MAX_WHISTLES_PER_FLUSH = 25;

/** The purchase that folds the horizon. See `converged` on `MillState`. */
export const CONVERGENCE_UPGRADE = "ur_chihuahua";

/** The rung that gates it, and so the first sign that anything is coming. */
export const CONVERGENCE_GATE_PRODUCER: SoloProducerId =
  SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE]!.requires!.producer;

/**
 * Ceiling on how many weather events one `advance` will resolve. A year-long
 * absence shouldn't spin for a hundred thousand iterations; past this the
 * remaining schedule is skipped and the mill just keeps producing. Generous
 * enough that no realistic absence hits it.
 */
const MAX_EVENTS_PER_ADVANCE = 20_000;

export function createMill(opts: { seed: string; startedAt: Millis }): MillState {
  const mill: MillState = {
    seed: opts.seed,
    startedAt: opts.startedAt,
    puppies: P.zero,
    raised: P.zero,
    checkpointAt: opts.startedAt,
    producers: {},
    broken: {},
    upgrades: [],
    land: {},
    bedding: MAX_BEDDING,
    weatherIndex: 0,
    nextWeatherAt: opts.startedAt,
    converged: false,
    world: "outside",
    papers: 0,
    perks: {},
    lifetimeRaised: P.zero,
    generation: 1,
    runStartedAt: opts.startedAt,
    log: [],
  };
  return { ...mill, nextWeatherAt: scheduleNext(mill, opts.startedAt) };
}

/**
 * Bring a mill whose checkpoint is in the *future* back to now.
 *
 * Clocks move backwards: an NTP correction, a device someone set by hand, or the
 * back room's own skew lever being put back after a jump. Whatever the cause,
 * the mill comes out of it holding a checkpoint the wall clock hasn't reached.
 *
 * That used to freeze the game solid. `integrate` clamps rather than paying out
 * negative production — correct on its own — but every command was refused with
 * "Time moved backwards." until the clock caught up, which after a week's jump
 * is a week of a mill that can't be whistled, bought from or repaired. A dev lever
 * that bricks the save for a week is not a lever, and a player whose phone
 * corrected its clock never touched a lever at all.
 *
 * So the mill rebases: the checkpoint comes back to now and everything scheduled
 * off it comes back by the same amount, so the weather keeps its place in the
 * queue instead of arriving all at once. Nothing is paid out and nothing is
 * taken away — the time simply didn't happen. What it *doesn't* do is defend
 * against a player jumping the clock forward, taking the offline production and
 * jumping back for another go. That's a cheat available from a menu that also
 * hands out free puppies, in a game with nobody else in it.
 */
export function rebase(f: MillState, now: Millis): MillState {
  if (now >= f.checkpointAt) return f;
  const back = f.checkpointAt - now;
  return {
    ...f,
    checkpointAt: now,
    nextWeatherAt: ms(Math.max(now, f.nextWeatherAt - back)),
    // Everything else stamped with a time, so nothing in the game is asked how
    // long ago something in the future was.
    startedAt: ms(Math.min(f.startedAt, now)),
    runStartedAt: ms(Math.min(f.runStartedAt, now)),
    log: f.log.map((e) => (e.at > now ? { ...e, at: ms(e.at - back) } : e)),
  };
}

/** Roll the mill forward with no weather in between. */
function integrate(f: MillState, to: Millis, offline: boolean): MillState {
  if (to <= f.checkpointAt) return { ...f, checkpointAt: ms(Math.max(f.checkpointAt, to)) };
  // Night Shift is the only thing that distinguishes an hour away from an hour
  // watching, and it only ever pays *more* — being away is never punished for
  // its own sake, only for the weather you weren't there to fix.
  const bonus = offline ? 1 + 0.2 * perkLevel(f, "night_shift") : 1;
  const made = P.of(P.overTime(currentRate(f), to - f.checkpointAt) * bonus);
  return {
    ...f,
    puppies: P.add(f.puppies, made),
    raised: P.add(f.raised, made),
    lifetimeRaised: P.add(f.lifetimeRaised, made),
    checkpointAt: to,
  };
}

export interface AdvanceResult {
  mill: MillState;
  /** Weather that landed in the interval, oldest first. */
  events: WeatherEvent[];
}

/**
 * Bring a mill up to `to`, resolving every weather event that falls in between.
 *
 * `offline` only affects the Night Shift bonus — the weather does not care
 * whether anyone was watching, which is the point of the mode.
 */
export function advance(f: MillState, to: Millis, offline = false): AdvanceResult {
  const events: WeatherEvent[] = [];
  // A mill ahead of the clock comes back to it first, so the tick loop heals a
  // backwards clock by itself within a tick rather than sitting on a checkpoint
  // it can never reach.
  let mill = rebase(f, to);
  let guard = 0;

  while (mill.nextWeatherAt <= to && guard++ < MAX_EVENTS_PER_ADVANCE) {
    const at = ms(Math.max(mill.nextWeatherAt, mill.checkpointAt));
    mill = integrate(mill, at, offline);
    const fired = fireWeather(mill, at);
    mill = fired.mill;
    if (fired.event) events.push(fired.event);
  }

  if (mill.nextWeatherAt <= to) {
    // Bailed out on the guard. Push the schedule past `to` so the mill doesn't
    // spend the rest of its life stuck resolving the same backlog.
    mill = { ...mill, nextWeatherAt: scheduleNext(mill, to) };
  }

  mill = integrate(mill, to, offline);
  if (events.length > 0) mill = { ...mill, log: appendLog(mill, events) };
  return { mill, events };
}

/**
 * Monotonic, and deliberately not `log.length` — the feed is trimmed, so a
 * length-based index starts repeating itself the moment it fills up.
 */
function nextLogIndex(f: MillState): number {
  return (f.log[f.log.length - 1]?.index ?? -1) + 1;
}

function appendLog(f: MillState, events: WeatherEvent[]): MillLogEntry[] {
  const base = nextLogIndex(f);
  const entries = events.map((e, i) => ({
    index: base + i,
    at: e.at,
    text: e.text,
    tone: e.tone,
  }));
  // The feed is a ticker, not an archive — a long absence shouldn't leave a
  // thousand entries to scroll past.
  return [...f.log, ...entries].slice(-60);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function fail(reason: string): MillResult {
  return { ok: false, reason };
}

/**
 * Pure: the same (mill, command, time) always gives the same result. Same
 * contract as the versus `applyCommand`, so this can move behind a server later
 * without touching any game logic.
 */
export function applyMillCommand(f0: MillState, cmd: MillCommand, now: Millis): MillResult {
  // A clock that went backwards is `advance`'s problem and it deals with it by
  // rebasing. This used to refuse the command instead, which meant a mill
  // holding a future checkpoint couldn't be whistled, bought from or repaired until
  // the wall clock caught up with it.
  const advanced = advance(f0, now);
  let mill = advanced.mill;
  const entries: MillLogEntry[] = [];
  const at = mill.checkpointAt;

  const note = (text: string, tone: MillLogEntry["tone"]) => {
    entries.push({ index: nextLogIndex(mill) + entries.length, at, text, tone });
  };

  const spend = (cost: Puppies): boolean => {
    if (!P.gte(mill.puppies, cost)) return false;
    mill = { ...mill, puppies: P.sub(mill.puppies, cost) };
    return true;
  };

  switch (cmd.type) {
    case "whistle": {
      const count = Math.max(0, Math.min(MAX_WHISTLES_PER_FLUSH, Math.floor(cmd.count)));
      if (count === 0) return fail("Nothing to flush.");
      const gained = P.mul(clickYield(mill), count);
      mill = {
        ...mill,
        puppies: P.add(mill.puppies, gained),
        raised: P.add(mill.raised, gained),
        lifetimeRaised: P.add(mill.lifetimeRaised, gained),
      };
      break;
    }

    case "dev_grant": {
      const whistles = Math.max(0, Math.floor(cmd.whistles));
      if (whistles === 0) return fail("Nothing to grant.");
      const gained = P.mul(clickYield(mill), whistles);
      mill = {
        ...mill,
        puppies: P.add(mill.puppies, gained),
        raised: P.add(mill.raised, gained),
        lifetimeRaised: P.add(mill.lifetimeRaised, gained),
      };
      note(`dev: granted ${whistles} whistles' worth.`, "neutral");
      break;
    }

    case "dev_weather": {
      // `advance` has already run to `at`, so moving the appointment to now
      // doesn't fire it here — the next tick does, through the ordinary path.
      // That matters: a hand-rolled `fireWeather` would skip the mitigation and
      // the log entry that the real schedule goes through.
      mill = { ...mill, nextWeatherAt: at };
      note("dev: pulled the next event forward.", "neutral");
      break;
    }

    case "dev_papers": {
      const papers = Math.max(0, Math.floor(cmd.papers));
      if (papers === 0) return fail("Nothing to grant.");
      mill = { ...mill, papers: mill.papers + papers };
      note(`dev: granted ${papers} Pedigree Paper.`, "neutral");
      break;
    }

    case "dev_fold": {
      if (cmd.converged === mill.converged) return fail("It's already like that.");
      if (cmd.converged) {
        mill = { ...mill, converged: true };
        note("dev: folded the horizon.", "neutral");
        break;
      }
      // Everything that only exists under a ceiling goes with the ceiling. An
      // upgrade belongs to the world of the producer that gates it, which is
      // also why `ur_puppy` has to be named here rather than derived: it's
      // gated on the Chihuahua Singularity, out under the sky.
      const inside = new Set(producersIn("inside").map((p) => p.id));
      const keep = <T extends Partial<Record<SoloProducerId, number>>>(rec: T) =>
        Object.fromEntries(Object.entries(rec).filter(([id]) => !inside.has(id as SoloProducerId)));
      mill = {
        ...mill,
        converged: false,
        world: "outside",
        producers: keep(mill.producers),
        broken: keep(mill.broken),
        land: Object.fromEntries(
          Object.entries(mill.land).filter(([id]) => LAND_BY_ID[id as LandId]?.world !== "inside"),
        ),
        upgrades: mill.upgrades.filter((id) => {
          if (id === CONVERGENCE_UPGRADE) return false;
          const req = SOLO_UPGRADE_BY_ID[id]?.requires?.producer;
          return !(req && inside.has(req));
        }),
      };
      note("dev: put the sky back.", "neutral");
      break;
    }

    case "buy_producer": {
      const producer = SOLO_PRODUCER_BY_ID[cmd.producer];
      if (!producer) return fail("No such producer.");
      if (!isProducerAvailable(mill, producer.id)) return fail("There's nowhere to put it yet.");
      const qty = Math.max(1, Math.floor(cmd.qty));
      const cost = producerCost(mill, producer.id, qty);
      const had = mill.producers[producer.id] ?? 0;
      if (!spend(cost)) return fail("Not enough puppies.");
      mill = {
        ...mill,
        producers: { ...mill.producers, [producer.id]: had + qty },
      };
      // The one purchase in the game that's the start of something rather than
      // more of the same. Buying a rung is otherwise silent, and it should stay
      // that way — this is the exception because nothing else told you.
      if (had === 0 && producer.id === CONVERGENCE_GATE_PRODUCER) {
        note("the first Chihuahua Singularity is running. the horizon looks wrong.", "neutral");
      }
      break;
    }

    case "buy_upgrade": {
      const upgrade = SOLO_UPGRADE_BY_ID[cmd.upgrade];
      if (!upgrade) return fail("No such upgrade.");
      if (mill.upgrades.includes(upgrade.id)) return fail("Already owned.");
      if (!isUnlocked(mill, upgrade)) return fail("Not unlocked yet.");
      if (!spend(upgrade.cost)) return fail("Not enough puppies.");
      mill = { ...mill, upgrades: [...mill.upgrades, upgrade.id] };
      note(`bought ${upgrade.name}.`, "neutral");
      // The Convergence. You acquire the first puppy and discover you have
      // always been inside it — on a button you chose to press, rather than on
      // a threshold crossing while you were looking somewhere else.
      // The Convergence puts you *in* the puppy, not merely under a new
      // ceiling: the fold ends with you standing on the inside mill, with a
      // shop you have never seen. Coming back out is a thing you go and ask for.
      if (upgrade.id === CONVERGENCE_UPGRADE && !mill.converged) {
        mill = { ...mill, converged: true, world: "inside" };
        note("the horizon closed.", "good");
      }
      break;
    }

    case "buy_land": {
      const land = LAND_BY_ID[cmd.land];
      if (!land) return fail("No such building.");
      if (!isLandAvailable(mill, land.id)) return fail("Nothing to build that against yet.");
      const cost = landCost(mill, land.id);
      if (!spend(cost)) return fail("Not enough puppies.");
      const level = (mill.land[land.id] ?? 0) + 1;
      mill = { ...mill, land: { ...mill.land, [land.id]: level } };
      note(`built ${land.name} ${romanish(level)}.`, "good");
      break;
    }

    case "repair": {
      const producer = SOLO_PRODUCER_BY_ID[cmd.producer];
      if (!producer) return fail("No such producer.");
      const broken = brokenCount(mill, producer.id);
      if (broken <= 0) return fail("Nothing to put right there.");
      const cost = repairCost(mill, producer.id);
      if (!spend(cost)) return fail("Not enough puppies.");
      mill = { ...mill, broken: { ...mill.broken, [producer.id]: 0 } };
      note(`put ${broken}x ${producer.name} back to work.`, "good");
      break;
    }

    case "restore_bedding": {
      const cost = beddingRestoreCost(mill);
      if (cost <= 0) return fail("The bedding is already fine.");
      if (!spend(cost)) return fail("Not enough puppies.");
      mill = { ...mill, bedding: MAX_BEDDING };
      note("put the bedding right.", "good");
      break;
    }

    case "fix_all": {
      const cost = upkeepBill(mill);
      if (cost <= 0) return fail("Nothing here needs putting right.");
      if (!spend(cost)) return fail("Not enough puppies.");
      const tiredBedding = mill.bedding < MAX_BEDDING;
      let mended = 0;
      const broken = { ...mill.broken };
      for (const prod of producersIn(mill.world)) {
        const n = brokenCount(mill, prod.id);
        if (n <= 0) continue;
        mended += n;
        broken[prod.id] = 0;
      }
      mill = { ...mill, broken, bedding: MAX_BEDDING };
      const put = [mended > 0 ? `${mended}x broken kit` : "", tiredBedding ? "the bedding" : ""].filter(
        Boolean,
      );
      note(`put ${put.join(" and ")} right.`, "good");
      break;
    }

    case "buy_perk": {
      const perk = PERK_BY_ID[cmd.perk];
      if (!perk) return fail("No such perk.");
      if (!isPerkAvailable(mill, perk.id)) return fail("Nothing to grow that in yet.");
      const level = mill.perks[perk.id] ?? 0;
      if (level >= perk.maxLevel) return fail("Already fully grown.");
      const cost = perkCost(perk, level);
      // Pedigree spent stop counting toward the output multiplier. That's the
      // whole trade, so it has to come out of the same number.
      if (mill.papers < cost) return fail("Not enough Pedigree Paper.");
      mill = {
        ...mill,
        papers: mill.papers - cost,
        perks: { ...mill.perks, [perk.id]: level + 1 },
      };
      note(`grew ${perk.name} to ${romanish(level + 1)}.`, "good");
      break;
    }

    case "warp": {
      if (!mill.converged) return fail("There's only the one world out here.");
      if (mill.world === cmd.to) return fail("You're already there.");
      mill = { ...mill, world: cmd.to };
      break;
    }

    case "prestige": {
      const earned = papersFor(mill.raised);
      if (earned <= 0) return fail("Nothing worth handing down yet.");
      const out = cmd.outside === true && mill.converged;
      mill = resetForNextGeneration(mill, earned, at, out);
      note(`handed the mill down. +${earned} Pedigree Paper.`, "good");
      if (out) note("the horizon is open again.", "neutral");
      break;
    }
  }

  return { ok: true, mill: { ...mill, log: [...mill.log, ...entries].slice(-60) }, entries };
}

/**
 * Everything a generation earns is wiped except the papers and what they bought.
 * `lifetimeRaised` deliberately survives — it's the only number in the game
 * that never goes backwards — and so does `converged`, unless the mill is being
 * handed down with the sky asked for.
 *
 * `outside` is the only way out of the puppy, and it's a door rather than a
 * consequence: it costs nothing, gives nothing, and hands the next generation a
 * world with a horizon in it and the Convergence to reach again. The four tiers
 * inside the puppy go out of reach with it, which is the price and is meant to
 * be — a run under the sky that kept the ceiling's kit would just be the folded
 * run with different weather.
 */
function resetForNextGeneration(
  f: MillState,
  earned: number,
  at: Millis,
  outside = false,
): MillState {
  const papers = f.papers + earned;
  const converged = f.converged && !outside;
  const next: MillState = {
    ...f,
    puppies: P.zero,
    raised: P.zero,
    checkpointAt: at,
    producers: {},
    broken: {},
    upgrades: [],
    land: {},
    bedding: MAX_BEDDING,
    weatherIndex: f.weatherIndex,
    converged,
    /**
     * Every generation starts outside, folded or not.
     *
     * Not where you were standing, which is what this did first and what soft-
     * locks the save: a hand-down clears `producers`, and the cheapest row in
     * the inside shop is most of a quadrillion puppies. Landing there with an
     * empty mill means one unaffordable row, a whistle worth one puppy, and no
     * signal at all that the way out is a lever in the back room.
     *
     * Starting in the fields is also the better read. The inside is somewhere
     * you got to; a mill that hasn't been built yet hasn't got there yet, and
     * the door is still open the moment you can afford to walk through it.
     */
    world: "outside",
    papers,
    generation: f.generation + 1,
    runStartedAt: at,
  };
  const stake = headStartPuppies(perkLevel(next, "head_start"));
  return {
    ...next,
    puppies: stake,
    nextWeatherAt: scheduleNext(next, at),
  };
}

/** Level badges, without pretending to be real Roman numerals past a point. */
function romanish(n: number): string {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[n - 1] ?? String(n);
}

/**
 * The pile at `now`, without advancing anything.
 *
 * For display between ticks only. It extrapolates at the current rate, so it's
 * exact right up until the next weather event and slightly optimistic after —
 * which is why the app still ticks `advance` on a short interval and treats
 * this as a smoothing layer, not as truth.
 */
export function projectedPuppies(f: MillState, now: Millis): Puppies {
  return P.add(f.puppies, P.overTime(currentRate(f), Math.max(0, now - f.checkpointAt)));
}

export function projectedRaised(f: MillState, now: Millis): Puppies {
  return P.add(f.raised, P.overTime(currentRate(f), Math.max(0, now - f.checkpointAt)));
}

/** Convenience for tests: apply a command, throw if it was rejected. */
export function mustApplyMill(f: MillState, cmd: MillCommand, now: Millis): MillState {
  const res = applyMillCommand(f, cmd, now);
  if (!res.ok) throw new Error(`command rejected: ${res.reason}`);
  return res.mill;
}

/**
 * How close the horizon is to closing, 0..1, off whatever gates the Ur-Chihuahua.
 *
 * The Convergence is the only thing in the game you can't be told about in
 * advance without spoiling it, and it was also the only thing with no build-up
 * at all: you bought a Chihuahua Singularity, nothing acknowledged it, and nine
 * purchases later the world folded. This is what the scene leans on to start
 * showing its hand — the ceiling bleeding through the sky well before it lands —
 * so the fold reads as arriving rather than as happening to you.
 *
 * Stays at 1 once folded, because the sky is still drawn underneath the sweep
 * for the three seconds it takes to come down and it shouldn't snap back to
 * blue on the frame you press the button.
 */
export function convergenceProgress(f: MillState): number {
  if (f.converged) return 1;
  const gate = SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE]?.requires;
  if (!gate || gate.count <= 0) return 0;
  return Math.min(1, (f.producers[gate.producer] ?? 0) / gate.count);
}

/**
 * The Ur-Chihuahua is on the table and unbought — the last stretch of the run.
 *
 * The shop empties itself down to this one row while it's true, which is the
 * only place in the game a purchase is made the only thing you can do. It's the
 * point: the tenth Chihuahua Singularity is a threshold nothing in the shop marked,
 * and a player who reaches it with a screen full of rungs will keep buying rungs
 * and never notice what the tier was counting down to. There is roughly a
 * thousand seconds of production between the gate opening and the price being
 * met, and the whole of it should be spent looking at the thing you're saving
 * for.
 */
export function convergencePending(f: MillState): boolean {
  const upgrade = SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE];
  if (!upgrade || f.converged || f.upgrades.includes(CONVERGENCE_UPGRADE)) return false;
  return isUnlocked(f, upgrade);
}

/** What a prestige right now would pay. Zero means it isn't worth doing yet. */
export function pendingPapers(f: MillState): number {
  return papersFor(f.raised);
}

export { SOLO_PRODUCERS, type SoloProducerId };
