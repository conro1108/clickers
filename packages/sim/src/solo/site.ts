/**
 * The homestead's single authority for time and mutation.
 *
 * `advance` is the only thing that moves a site forward, and every command runs
 * it first. Because solo has no timed effects, the only thing that can change a
 * rate mid-interval is a weather event — and those land at instants the state
 * already knows. So advancing across ten seconds and advancing across ten days
 * are the same code path, and both are exact.
 */

import { Y, ms, type Millis, type Yield } from "../numbers.js";
import {
  LAND_BY_ID,
  MAX_CONDITION,
  SOLO_PRODUCERS,
  SOLO_PRODUCER_BY_ID,
  SOLO_UPGRADE_BY_ID,
  producersIn,
  type LandId,
  type SoloProducerId,
  type World,
  WORLD_GATE,
  WORLDS,
} from "./content.js";
import {
  brokenCount,
  clickYield,
  currentRate,
  isLandAvailable,
  isPerkAvailable,
  isProducerAvailable,
  isUnlocked,
  isWorldOpen,
  landCost,
  perkLevel,
  producerCost,
  upgradeCost,
  repairCost,
  conditionRestoreCost,
  upkeepBill,
} from "./economy.js";
import { PERK_BY_ID, headStartStock, perkCost, heirloomsFor } from "./prestige.js";
import type { SiteCommand, SiteLogEntry, SiteResult, SiteState } from "./state.js";
import { fireWeather, scheduleNext, type WeatherEvent } from "./weather.js";

/** Clamp on batched clicks, matching the versus mode's flush window. */
export const MAX_CLICKS_PER_FLUSH = 25;

/** The purchase that folds the horizon: the first gate, opening `inside`. */
export const CONVERGENCE_UPGRADE = WORLD_GATE.inside;

/** The rung that gates it, and so the first sign that anything is coming. */
export const CONVERGENCE_GATE_PRODUCER: SoloProducerId =
  SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE]!.requires!.producer;

/** What the log says when each world opens. Engine vocabulary, so nothing game-specific. */
const ARRIVAL: Record<Exclude<World, "outside">, string> = {
  inside: "the horizon closed.",
  beyond: "it opened. you went through.",
  deep: "the floor gave. you went down.",
  origin: "you came out where you started. it is the first morning.",
  void: "you went back before the first morning. there is nothing here yet.",
  end: "you went on past the last of it. this is where everything goes.",
};

/**
 * Strip everything that only exists in `worlds`, and the upgrades gated on it
 * (plus `alsoDrop`). What the dev levers use to put a fold back.
 */
function stripWorlds(site: SiteState, worlds: readonly World[], alsoDrop: readonly string[]): SiteState {
  const gone = new Set(SOLO_PRODUCERS.filter((p) => worlds.includes(p.world)).map((p) => p.id));
  const keep = <T extends Partial<Record<SoloProducerId, number>>>(rec: T) =>
    Object.fromEntries(Object.entries(rec).filter(([id]) => !gone.has(id as SoloProducerId)));
  return {
    ...site,
    producers: keep(site.producers),
    broken: keep(site.broken),
    land: Object.fromEntries(
      Object.entries(site.land).filter(([id]) => {
        const w = LAND_BY_ID[id as LandId]?.world;
        return !w || !worlds.includes(w);
      }),
    ),
    upgrades: site.upgrades.filter((id) => {
      if (alsoDrop.includes(id)) return false;
      const req = SOLO_UPGRADE_BY_ID[id]?.requires?.producer;
      return !(req && gone.has(req));
    }),
  };
}

/**
 * Ceiling on how many weather events one `advance` will resolve. A year-long
 * absence shouldn't spin for a hundred thousand iterations; past this the
 * remaining schedule is skipped and the site just keeps producing. Generous
 * enough that no realistic absence hits it.
 */
const MAX_EVENTS_PER_ADVANCE = 20_000;

export function createSite(opts: { seed: string; startedAt: Millis }): SiteState {
  const site: SiteState = {
    seed: opts.seed,
    startedAt: opts.startedAt,
    stock: Y.zero,
    produced: Y.zero,
    checkpointAt: opts.startedAt,
    producers: {},
    broken: {},
    upgrades: [],
    land: {},
    condition: MAX_CONDITION,
    weatherIndex: 0,
    nextWeatherAt: opts.startedAt,
    depth: 0,
    world: "outside",
    heirlooms: 0,
    perks: {},
    lifetimeProduced: Y.zero,
    generation: 1,
    runStartedAt: opts.startedAt,
    log: [],
  };
  return { ...site, nextWeatherAt: scheduleNext(site, opts.startedAt) };
}

/**
 * Bring a site whose checkpoint is in the *future* back to now.
 *
 * Clocks move backwards: an NTP correction, a device someone set by hand, or the
 * back room's own skew lever being put back after a jump. Whatever the cause,
 * the site comes out of it holding a checkpoint the wall clock hasn't reached.
 *
 * That used to freeze the game solid. `integrate` clamps rather than paying out
 * negative production — correct on its own — but every command was refused with
 * "Time moved backwards." until the clock caught up, which after a week's jump
 * is a week of a site that can't be clickd, bought from or repaired. A dev lever
 * that bricks the save for a week is not a lever, and a player whose phone
 * corrected its clock never touched a lever at all.
 *
 * So the site rebases: the checkpoint comes back to now and everything scheduled
 * off it comes back by the same amount, so the weather keeps its place in the
 * queue instead of arriving all at once. Nothing is paid out and nothing is
 * taken away — the time simply didn't happen. What it *doesn't* do is defend
 * against a player jumping the clock forward, taking the offline production and
 * jumping back for another go. That's a cheat available from a menu that also
 * hands out free stock, in a game with nobody else in it.
 */
export function rebase(f: SiteState, now: Millis): SiteState {
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

/** Roll the site forward with no weather in between. */
function integrate(f: SiteState, to: Millis, offline: boolean): SiteState {
  if (to <= f.checkpointAt) return { ...f, checkpointAt: ms(Math.max(f.checkpointAt, to)) };
  // Night Shift is the only thing that distinguishes an hour away from an hour
  // watching, and it only ever pays *more* — being away is never punished for
  // its own sake, only for the weather you weren't there to fix.
  const bonus = offline ? 1 + 0.2 * perkLevel(f, "night_shift") : 1;
  const made = Y.of(Y.overTime(currentRate(f), to - f.checkpointAt) * bonus);
  return {
    ...f,
    stock: Y.add(f.stock, made),
    produced: Y.add(f.produced, made),
    lifetimeProduced: Y.add(f.lifetimeProduced, made),
    checkpointAt: to,
  };
}

export interface AdvanceResult {
  site: SiteState;
  /** Weather that landed in the interval, oldest first. */
  events: WeatherEvent[];
}

/**
 * Bring a site up to `to`, resolving every weather event that falls in between.
 *
 * `offline` only affects the Night Shift bonus — the weather does not care
 * whether anyone was watching, which is the point of the mode.
 */
export function advance(f: SiteState, to: Millis, offline = false): AdvanceResult {
  const events: WeatherEvent[] = [];
  // A site ahead of the clock comes back to it first, so the tick loop heals a
  // backwards clock by itself within a tick rather than sitting on a checkpoint
  // it can never reach.
  let site = rebase(f, to);
  let guard = 0;

  while (site.nextWeatherAt <= to && guard++ < MAX_EVENTS_PER_ADVANCE) {
    const at = ms(Math.max(site.nextWeatherAt, site.checkpointAt));
    site = integrate(site, at, offline);
    const fired = fireWeather(site, at);
    site = fired.site;
    if (fired.event) events.push(fired.event);
  }

  if (site.nextWeatherAt <= to) {
    // Bailed out on the guard. Push the schedule past `to` so the site doesn't
    // spend the rest of its life stuck resolving the same backlog.
    site = { ...site, nextWeatherAt: scheduleNext(site, to) };
  }

  site = integrate(site, to, offline);
  if (events.length > 0) site = { ...site, log: appendLog(site, events) };
  return { site, events };
}

/**
 * Monotonic, and deliberately not `log.length` — the feed is trimmed, so a
 * length-based index starts repeating itself the moment it fills up.
 */
function nextLogIndex(f: SiteState): number {
  return (f.log[f.log.length - 1]?.index ?? -1) + 1;
}

function appendLog(f: SiteState, events: WeatherEvent[]): SiteLogEntry[] {
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

function fail(reason: string): SiteResult {
  return { ok: false, reason };
}

/**
 * Pure: the same (site, command, time) always gives the same result. Same
 * contract as the versus `applyCommand`, so this can move behind a server later
 * without touching any game logic.
 */
export function applySiteCommand(f0: SiteState, cmd: SiteCommand, now: Millis): SiteResult {
  // A clock that went backwards is `advance`'s problem and it deals with it by
  // rebasing. This used to refuse the command instead, which meant a site
  // holding a future checkpoint couldn't be clickd, bought from or repaired until
  // the wall clock caught up with it.
  const advanced = advance(f0, now);
  let site = advanced.site;
  const entries: SiteLogEntry[] = [];
  const at = site.checkpointAt;

  const note = (text: string, tone: SiteLogEntry["tone"]) => {
    entries.push({ index: nextLogIndex(site) + entries.length, at, text, tone });
  };

  const spend = (cost: Yield): boolean => {
    if (!Y.gte(site.stock, cost)) return false;
    site = { ...site, stock: Y.sub(site.stock, cost) };
    return true;
  };

  switch (cmd.type) {
    case "click": {
      const count = Math.max(0, Math.min(MAX_CLICKS_PER_FLUSH, Math.floor(cmd.count)));
      if (count === 0) return fail("Nothing to flush.");
      const gained = Y.mul(clickYield(site), count);
      site = {
        ...site,
        stock: Y.add(site.stock, gained),
        produced: Y.add(site.produced, gained),
        lifetimeProduced: Y.add(site.lifetimeProduced, gained),
      };
      break;
    }

    case "dev_grant": {
      const clicks = Math.max(0, Math.floor(cmd.clicks));
      if (clicks === 0) return fail("Nothing to grant.");
      const gained = Y.mul(clickYield(site), clicks);
      site = {
        ...site,
        stock: Y.add(site.stock, gained),
        produced: Y.add(site.produced, gained),
        lifetimeProduced: Y.add(site.lifetimeProduced, gained),
      };
      note(`dev: granted ${clicks} clicks' worth.`, "neutral");
      break;
    }

    case "dev_weather": {
      // `advance` has already run to `at`, so moving the appointment to now
      // doesn't fire it here — the next tick does, through the ordinary path.
      // That matters: a hand-rolled `fireWeather` would skip the mitigation and
      // the log entry that the real schedule goes through.
      site = { ...site, nextWeatherAt: at };
      note("dev: pulled the next event forward.", "neutral");
      break;
    }

    case "dev_heirlooms": {
      const heirlooms = Math.max(0, Math.floor(cmd.heirlooms));
      if (heirlooms === 0) return fail("Nothing to grant.");
      site = { ...site, heirlooms: site.heirlooms + heirlooms };
      note(`dev: granted ${heirlooms} Heirloom.`, "neutral");
      break;
    }

    case "dev_depth": {
      const depth = Math.max(0, Math.min(WORLDS.length - 1, Math.floor(cmd.depth)));
      if (depth === site.depth) return fail("It's already like that.");
      if (depth > site.depth) {
        site = { ...site, depth };
        note(`dev: opened the way to ${WORLDS[depth]}.`, "neutral");
        break;
      }
      // Everything that only exists past the line goes with it. An upgrade
      // belongs to the world of the producer that gates it, which is also why
      // the gates have to be named rather than derived: each one is gated on a
      // producer in the world *before* the one it opens.
      const closed = WORLDS.slice(depth + 1);
      const here = WORLDS.indexOf(site.world) > depth ? WORLDS[depth]! : site.world;
      site = {
        ...stripWorlds(site, closed, closed.map((w) => WORLD_GATE[w as Exclude<World, "outside">])),
        depth,
        world: here,
      };
      note(`dev: closed everything past ${WORLDS[depth]}.`, "neutral");
      break;
    }

    case "buy_producer": {
      const producer = SOLO_PRODUCER_BY_ID[cmd.producer];
      if (!producer) return fail("No such producer.");
      if (!isProducerAvailable(site, producer.id)) return fail("There's nowhere to put it yet.");
      const qty = Math.max(1, Math.floor(cmd.qty));
      const cost = producerCost(site, producer.id, qty);
      const had = site.producers[producer.id] ?? 0;
      if (!spend(cost)) return fail("Not enough stock.");
      site = {
        ...site,
        producers: { ...site.producers, [producer.id]: had + qty },
      };
      // The one purchase in the game that's the start of something rather than
      // more of the same. Buying a rung is otherwise silent, and it should stay
      // that way — this is the exception because nothing else told you.
      if (had === 0 && producer.id === CONVERGENCE_GATE_PRODUCER) {
        note("the first `singularity` is running. the horizon looks wrong.", "neutral");
      }
      break;
    }

    case "buy_upgrade": {
      const upgrade = SOLO_UPGRADE_BY_ID[cmd.upgrade];
      if (!upgrade) return fail("No such upgrade.");
      if (site.upgrades.includes(upgrade.id)) return fail("Already owned.");
      if (!isUnlocked(site, upgrade)) return fail("Not unlocked yet.");
      if (!spend(upgradeCost(site, upgrade))) return fail("Not enough stock.");
      site = { ...site, upgrades: [...site.upgrades, upgrade.id] };
      note(`bought ${upgrade.name}.`, "neutral");
      // The Convergence. You acquire the first unit and discover you have
      // always been inside it — on a button you chose to press, rather than on
      // a threshold crossing while you were looking somewhere else.
      // The Convergence puts you *in* the core, not merely under a new
      // ceiling: the fold ends with you standing on the inside site, with a
      // shop you have never seen. Coming back out is a thing you go and ask for.
      //
      // Every later gate is the same move one world further. Only the gate of
      // the *next* world opens anything; buying one again after a hand-down is
      // just its multiplier.
      const opens = WORLDS[site.depth + 1] as Exclude<World, "outside"> | undefined;
      if (opens && upgrade.id === WORLD_GATE[opens]) {
        site = { ...site, depth: site.depth + 1, world: opens };
        note(ARRIVAL[opens], "good");
      }
      break;
    }

    case "buy_land": {
      const land = LAND_BY_ID[cmd.land];
      if (!land) return fail("No such building.");
      if (!isLandAvailable(site, land.id)) return fail("Nothing to build that against yet.");
      const cost = landCost(site, land.id);
      if (!spend(cost)) return fail("Not enough stock.");
      const level = (site.land[land.id] ?? 0) + 1;
      site = { ...site, land: { ...site.land, [land.id]: level } };
      note(`built ${land.name} ${romanish(level)}.`, "good");
      break;
    }

    case "repair": {
      const producer = SOLO_PRODUCER_BY_ID[cmd.producer];
      if (!producer) return fail("No such producer.");
      const broken = brokenCount(site, producer.id);
      if (broken <= 0) return fail("Nothing to put right there.");
      const cost = repairCost(site, producer.id);
      if (!spend(cost)) return fail("Not enough stock.");
      site = { ...site, broken: { ...site.broken, [producer.id]: 0 } };
      note(`put ${broken}x ${producer.name} back to work.`, "good");
      break;
    }

    case "restore_condition": {
      const cost = conditionRestoreCost(site);
      if (cost <= 0) return fail("The condition is already fine.");
      if (!spend(cost)) return fail("Not enough stock.");
      site = { ...site, condition: MAX_CONDITION };
      note("put the condition right.", "good");
      break;
    }

    case "fix_all": {
      const cost = upkeepBill(site);
      if (cost <= 0) return fail("Nothing here needs putting right.");
      if (!spend(cost)) return fail("Not enough stock.");
      const tiredCondition = site.condition < MAX_CONDITION;
      let mended = 0;
      const broken = { ...site.broken };
      for (const prod of producersIn(site.world)) {
        const n = brokenCount(site, prod.id);
        if (n <= 0) continue;
        mended += n;
        broken[prod.id] = 0;
      }
      site = { ...site, broken, condition: MAX_CONDITION };
      const put = [mended > 0 ? `${mended}x broken kit` : "", tiredCondition ? "the condition" : ""].filter(
        Boolean,
      );
      note(`put ${put.join(" and ")} right.`, "good");
      break;
    }

    case "buy_perk": {
      const perk = PERK_BY_ID[cmd.perk];
      if (!perk) return fail("No such perk.");
      if (!isPerkAvailable(site, perk.id)) return fail("Nothing to grow that in yet.");
      const level = site.perks[perk.id] ?? 0;
      if (level >= perk.maxLevel) return fail("Already fully grown.");
      const cost = perkCost(perk, level);
      // Heirloom spent stop counting toward the output multiplier. That's the
      // whole trade, so it has to come out of the same number.
      if (site.heirlooms < cost) return fail("Not enough Heirloom.");
      site = {
        ...site,
        heirlooms: site.heirlooms - cost,
        perks: { ...site.perks, [perk.id]: level + 1 },
      };
      note(`grew ${perk.name} to ${romanish(level + 1)}.`, "good");
      break;
    }

    case "warp": {
      if (site.depth === 0) return fail("There's only the one world out here.");
      if (!isWorldOpen(site, cmd.to)) return fail("There's no way through to there yet.");
      if (site.world === cmd.to) return fail("You're already there.");
      site = { ...site, world: cmd.to };
      break;
    }

    case "prestige": {
      const earned = heirloomsFor(site.produced);
      if (earned <= 0) return fail("Nothing worth handing down yet.");
      const out = cmd.outside === true && site.depth > 0;
      site = resetForNextGeneration(site, earned, at, out);
      note(`handed the site down. +${earned} Heirloom.`, "good");
      if (out) note("the horizon is open again.", "neutral");
      break;
    }
  }

  return { ok: true, site: { ...site, log: [...site.log, ...entries].slice(-60) }, entries };
}

/**
 * Everything a generation earns is wiped except the heirlooms and what they bought.
 * `lifetimeProduced` deliberately survives — it's the only number in the game
 * that never goes backwards — and so does `depth`, unless the site is being
 * handed down with the sky asked for.
 *
 * `outside` is the only way out of the core, and it's a door rather than a
 * consequence: it costs nothing, gives nothing, and hands the next generation a
 * world with a horizon in it and the Convergence to reach again. The four tiers
 * inside the core go out of reach with it, which is the price and is meant to
 * be — a run under the sky that kept the ceiling's kit would just be the folded
 * run with different weather.
 */
function resetForNextGeneration(
  f: SiteState,
  earned: number,
  at: Millis,
  outside = false,
): SiteState {
  const heirlooms = f.heirlooms + earned;
  const next: SiteState = {
    ...f,
    stock: Y.zero,
    produced: Y.zero,
    checkpointAt: at,
    producers: {},
    broken: {},
    upgrades: [],
    land: {},
    condition: MAX_CONDITION,
    weatherIndex: f.weatherIndex,
    depth: outside ? 0 : f.depth,
    /**
     * Every generation starts outside, folded or not.
     *
     * Not where you were standing, which is what this did first and what soft-
     * locks the save: a hand-down clears `producers`, and the cheapest row in
     * the inside shop is most of a quadrillion stock. Landing there with an
     * empty site means one unaffordable row, a click worth one unit, and no
     * signal at all that the way out is a lever in the back room.
     *
     * Starting in the fields is also the better read. The inside is somewhere
     * you got to; a site that hasn't been built yet hasn't got there yet, and
     * the door is still open the moment you can afford to walk through it.
     */
    world: "outside",
    heirlooms,
    generation: f.generation + 1,
    runStartedAt: at,
  };
  const stake = headStartStock(perkLevel(next, "head_start"));
  return {
    ...next,
    stock: stake,
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
export function projectedStock(f: SiteState, now: Millis): Yield {
  return Y.add(f.stock, Y.overTime(currentRate(f), Math.max(0, now - f.checkpointAt)));
}

export function projectedProduced(f: SiteState, now: Millis): Yield {
  return Y.add(f.produced, Y.overTime(currentRate(f), Math.max(0, now - f.checkpointAt)));
}

/** Convenience for tests: apply a command, throw if it was rejected. */
export function mustApplySite(f: SiteState, cmd: SiteCommand, now: Millis): SiteState {
  const res = applySiteCommand(f, cmd, now);
  if (!res.ok) throw new Error(`command rejected: ${res.reason}`);
  return res.site;
}

/**
 * How close the horizon is to closing, 0..1, off whatever gates the `ur_form`.
 *
 * The Convergence is the only thing in the game you can't be told about in
 * advance without spoiling it, and it was also the only thing with no build-up
 * at all: you bought a `singularity`, nothing acknowledged it, and nine
 * purchases later the world folded. This is what the scene leans on to start
 * showing its hand — the ceiling bleeding through the sky well before it lands —
 * so the fold reads as arriving rather than as happening to you.
 *
 * Stays at 1 once folded, because the sky is still drawn underneath the sweep
 * for the three seconds it takes to come down and it shouldn't snap back to
 * blue on the frame you press the button.
 */
export function convergenceProgress(f: SiteState): number {
  if (f.depth >= 1) return 1;
  const gate = SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE]?.requires;
  if (!gate || gate.count <= 0) return 0;
  return Math.min(1, (f.producers[gate.producer] ?? 0) / gate.count);
}

/**
 * The `ur_form` is on the table and unbought — the last stretch of the run.
 *
 * The shop empties itself down to this one row while it's true, which is the
 * only place in the game a purchase is made the only thing you can do. It's the
 * point: the tenth `singularity` is a threshold nothing in the shop marked,
 * and a player who reaches it with a screen full of rungs will keep buying rungs
 * and never notice what the tier was counting down to. There is roughly a
 * thousand seconds of production between the gate opening and the price being
 * met, and the whole of it should be spent looking at the thing you're saving
 * for.
 */
export function convergencePending(f: SiteState): boolean {
  return gatePending(f) === "inside";
}

/**
 * The world whose gate is on the table and unbought, if any — the same
 * last-stretch moment as `convergencePending`, for whichever world is next.
 */
export function gatePending(f: SiteState): Exclude<World, "outside"> | null {
  const next = WORLDS[f.depth + 1] as Exclude<World, "outside"> | undefined;
  if (!next) return null;
  const upgrade = SOLO_UPGRADE_BY_ID[WORLD_GATE[next]];
  if (!upgrade || f.upgrades.includes(upgrade.id)) return null;
  return isUnlocked(f, upgrade) ? next : null;
}

/** What a prestige right now would pay. Zero means it isn't worth doing yet. */
export function pendingHeirlooms(f: SiteState): number {
  return heirloomsFor(f.produced);
}

export { SOLO_PRODUCERS, type SoloProducerId };
