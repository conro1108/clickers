import { describe, expect, it } from "vitest";

import { P, format, ms, seconds } from "../numbers.js";
import {
  LANDS,
  MAX_MITIGATION,
  MAX_BEDDING,
  MIN_BEDDING,
  REPAIR_SECONDS,
  SOLO_PRODUCERS,
  SOLO_REPAIR_COST_FRACTION,
  SOLO_UPGRADES,
  SOLO_UPGRADE_BY_ID,
} from "./content.js";
import {
  brokenCount,
  currentRate,
  mitigation,
  producerCost,
  producerMultiplier,
  producerRateEach,
  repairCost,
  beddingLossRate,
  beddingRestoreCost,
  totalRepairCost,
  upkeepBill,
} from "./economy.js";
import {
  CONVERGENCE_UPGRADE,
  advance,
  applyMillCommand,
  convergencePending,
  createMill,
  pendingPapers,
} from "./mill.js";
import { parseMill, resumeMill, serializeMill } from "./persist.js";
import { MULT_PER_UNSPENT_PAPER, PERKS, papersFor } from "./prestige.js";
import { MILLER_STYLES, millerTurn, simulateCadence, simulateMill } from "./sim.js";
import type { MillState } from "./state.js";
import { WEATHER_IDS } from "./weather.js";

const HOUR = seconds(3_600);
const DAY = HOUR * 24;

/** A mill that's been played long enough to have something worth wrecking. */
function developedMill(seed = "dev", forMs = HOUR): MillState {
  return simulateMill({ seed, durationMs: forMs, style: "keen" }).mill;
}

/**
 * The same mill with a run behind it big enough that a hand-down pays.
 *
 * `papersFor` puts the first seed around the Convergence, which the always-on bot
 * takes days of simulated time to reach — far too slow for a test that only
 * wants to check what prestige does to a mill. So the output is asserted rather
 * than earned.
 */
function worthHandingDown(f: MillState): MillState {
  return { ...f, raised: Math.max(f.raised, 4e18) as never };
}

describe("the ladder", () => {
  it("gets more expensive per puppy of output as you climb", () => {
    const paybacks = SOLO_PRODUCERS.map((p) => p.baseCost / p.baseRate);
    for (let i = 1; i < paybacks.length; i++) {
      expect(paybacks[i]!).toBeGreaterThan(paybacks[i - 1]!);
    }
    // The gap between rungs is the pace control for the whole run, so it's
    // worth being specific: the bottom rung pays for itself in seconds, the top
    // one in many hours. Flatten that and the ladder gets cleared
    // in a single sitting.
    expect(paybacks[0]!).toBeLessThan(30);
    expect(paybacks.at(-1)!).toBeGreaterThan(3_000);
    // There used to be an upper bound here too — the top rung's *base* payback
    // capped at 40,000s, so the top of the tree couldn't be purely decorative.
    // At sixteen rungs the Second Puppy's base payback is a hundred hours and
    // it trips, but the proxy is what's broken rather than the ladder: base
    // payback stops predicting affordability once accumulated multipliers reach
    // several hundred. The test below measures the thing that assertion meant.
  });

  /**
   * What the base-payback cap was really asking: can a run that goes the
   * distance actually get to the top of the tree, and is the top of the tree
   * worth having when it does?
   *
   * Measured rather than derived, because the answer depends on every global
   * multiplier bought along the way — by the end of this run the Second Puppy
   * is the best value on the board by a wide margin despite a base payback of a
   * hundred hours.
   */
  it("puts the top rung within reach of a long run, and makes it the best buy there", () => {
    const { mill, convergedAt } = simulateCadence({
      seed: "probe",
      days: 8,
      cadence: "heavy",
      style: "keen",
    });
    const top = SOLO_PRODUCERS.at(-1)!;
    const value = (id: (typeof SOLO_PRODUCERS)[number]["id"]) =>
      producerRateEach(mill, id) / producerCost(mill, id, 1);

    console.log(
      `8d heavy: converged=${convergedAt === null ? "never" : (convergedAt / HOUR).toFixed(1) + "h"} ` +
        `owned=${SOLO_PRODUCERS.map((p) => mill.producers[p.id] ?? 0).join("/")} ` +
        `top value=${value(top.id).toExponential(2)}`,
    );

    expect(mill.producers[top.id] ?? 0).toBeGreaterThan(0);
    for (const prod of SOLO_PRODUCERS) {
      if (prod.id === top.id) continue;
      expect(value(top.id)).toBeGreaterThan(value(prod.id));
    }
  });

  it("climbs into the upper tiers over a long session", () => {
    const { mill, samples } = simulateMill({ seed: "climb", durationMs: 8 * HOUR, style: "keen" });
    const reached = SOLO_PRODUCERS.filter((p) => (mill.producers[p.id] ?? 0) > 0).length;
    console.log(
      `8h keen: tiers=${reached}/${SOLO_PRODUCERS.length} rate=${format(currentRate(mill))}/s ` +
        `raised=${format(mill.raised)} bedding=${mill.bedding.toFixed(2)} ` +
        `papers worth=${pendingPapers(mill)}`,
    );
    // With the slower economy, 8 hours of active play should still unlock
    // mid-game tiers, but a full clear now requires multiple days.
    expect(reached).toBeGreaterThanOrEqual(5);
    // Still growing at the end, not parked on a plateau.
    const [last, prior] = [samples.at(-1)!, samples.at(-2)!];
    expect(last.rate).toBeGreaterThan(prior.rate);
  });

  it("charges real money for the upgrades that lift the whole mill", () => {
    // A permanent multiplier on everything you own should cost something you
    // feel. Priced off the fleet that unlocks it, they drifted into costing
    // twenty seconds of production — you bought Fertilizer, forever, with the
    // change in your pocket. Measured in seconds of current output, which is
    // the only scale on which an early upgrade and a late one are comparable.
    const style = MILLER_STYLES.keen!;
    let mill = createMill({ seed: "prices", startedAt: ms(0) });
    const paid: { id: string; seconds: number }[] = [];
    let nextDecision = 0;
    for (let t = 0; t < 24 * HOUR; t += 1_000) {
      const whistle = applyMillCommand(mill, { type: "whistle", count: style.whistlesPerSecond }, ms(t));
      if (whistle.ok) mill = whistle.mill;
      if (t >= nextDecision) {
        nextDecision = t + style.decisionMs;
        for (const cmd of millerTurn(mill, style)) {
          const rate = currentRate(mill);
          const before = mill.upgrades.length;
          const res = applyMillCommand(mill, cmd, ms(t));
          if (res.ok) mill = res.mill;
          const id = mill.upgrades.at(-1);
          if (mill.upgrades.length > before && id) {
            const u = SOLO_UPGRADES.find((x) => x.id === id)!;
            if (u.effect.kind === "global_mult") paid.push({ id, seconds: u.cost / rate });
          }
        }
      }
      mill = advance(mill, ms(t + 1_000)).mill;
    }

    expect(paid.length).toBeGreaterThan(0);
    console.log(`globals: ${paid.map((u) => `${u.id}=${u.seconds.toFixed(0)}s`).join(" ")}`);
    for (const { seconds: s } of paid) expect(s).toBeGreaterThan(60);
  });

  /**
   * The same question, asked of the globals the 24-hour bot above never gets
   * near. Those are the ones that had drifted: priced at a flat share of the
   * fleet that unlocks them, the late ones came out at two or three hundred
   * seconds each — so the upgrade that permanently lifts every rung of the
   * ladder at once cost a fraction of the rung you were standing on, and
   * "should I save for this or keep climbing?" had one obvious answer.
   *
   * Measured two ways, because one number can't say it. What each one costs
   * depends on how far along the rest of the mill happens to be when its gate
   * opens, and that swings by a factor of four between papers — so the *median*
   * is what carries the intent ("a global is half an hour of production"), and
   * the floor is only there to catch one of them falling back into the couple-
   * of-hundred-seconds range the whole set used to sit in.
   *
   * No ceiling on purpose: the Ur-Chihuahua and the Third Puppy are deliberately
   * dearer still, and the Convergence test below holds their end of it.
   */
  it("makes every cross-mill multiplier something you stop and save for", () => {
    const style = MILLER_STYLES.keen!;
    let mill = createMill({ seed: "globals", startedAt: ms(0) });
    const paid: { id: string; seconds: number }[] = [];
    const cadence = { sessionsPerDay: 4, sessionMs: seconds(1_800) };
    const gap = DAY / cadence.sessionsPerDay;

    for (let d = 0; d < 10; d++) {
      for (let s = 0; s < cadence.sessionsPerDay; s++) {
        const start = Math.round(d * DAY + s * gap);
        mill = advance(mill, ms(start), true).mill;
        let nextDecision = start;
        for (let t = start; t < start + cadence.sessionMs; t += 1_000) {
          const whistle = applyMillCommand(mill, { type: "whistle", count: style.whistlesPerSecond }, ms(t));
          if (whistle.ok) mill = whistle.mill;
          if (t >= nextDecision) {
            nextDecision = t + style.decisionMs;
            for (const cmd of millerTurn(mill, style)) {
              const rate = currentRate(mill);
              const before = mill.upgrades.length;
              const res = applyMillCommand(mill, cmd, ms(t));
              if (res.ok) mill = res.mill;
              const id = mill.upgrades.at(-1);
              if (mill.upgrades.length > before && id) {
                const u = SOLO_UPGRADE_BY_ID[id]!;
                if (u.effect.kind === "global_mult") paid.push({ id, seconds: u.cost / rate });
              }
            }
          }
          mill = advance(mill, ms(t + 1_000)).mill;
        }
      }
    }

    console.log(`globals (10d heavy): ${paid.map((u) => `${u.id}=${u.seconds.toFixed(0)}s`).join(" ")}`);
    // The run has to actually get far enough to buy the late ones, or this
    // passes by never measuring them.
    const globals = SOLO_UPGRADES.filter((u) => u.effect.kind === "global_mult");
    expect(paid.length).toBeGreaterThanOrEqual(globals.length - 1);

    const sorted = paid.map((u) => u.seconds).sort((a, b) => a - b);
    // Was 2,000s, and came down when the weather stopped being able to wipe an
    // unlucky run. This median is taken across cadences, so it used to be held
    // up by the runs that spent the session pinned at the broken cap earning
    // almost nothing — an upgrade looks expensive in seconds-of-production when
    // your production is 13% of what you built. Measured on runs that *weren't*
    // wrecked, pacing barely moved (within about 4% over a fixed 8h run), which
    // is why the per-upgrade floor below is unchanged and is the real guard.
    expect(sorted[Math.floor(sorted.length / 2)]).toBeGreaterThan(1_500);
    for (const { id, seconds: s } of paid) expect(s, id).toBeGreaterThan(700);
  });
});

describe("offline resolution", () => {
  /**
   * The whole architecture rests on this. Weather lands at instants the state
   * already knows, so resolving six hours in one call and resolving it in six
   * hours of one-second steps have to agree — otherwise "come back tomorrow" is
   * a different game from "leave the tab open", and the save file is a lie.
   */
  it("resolves a long gap identically to ticking through it", () => {
    const base = developedMill("gap");
    const to = ms(base.checkpointAt + 6 * HOUR);

    const oneShot = advance(base, to);

    let ticked = base;
    let tickedEvents = 0;
    for (let t = base.checkpointAt; t < to; t = ms(t + 1_000)) {
      const stepped = advance(ticked, ms(Math.min(t + 1_000, to)));
      ticked = stepped.mill;
      tickedEvents += stepped.events.length;
    }

    expect(tickedEvents).toBe(oneShot.events.length);
    expect(ticked.weatherIndex).toBe(oneShot.mill.weatherIndex);
    expect(ticked.bedding).toBeCloseTo(oneShot.mill.bedding, 10);
    for (const prod of SOLO_PRODUCERS) {
      expect(ticked.broken[prod.id] ?? 0).toBe(oneShot.mill.broken[prod.id] ?? 0);
    }
    // Puppies accumulate over 21,600 additions in one case and a handful in
    // the other, so this is float drift, not a modelling difference.
    expect(ticked.puppies / oneShot.mill.puppies).toBeCloseTo(1, 6);
  });

  it("survives a week away without being unrecoverable", () => {
    for (const seed of ["a", "b", "c"]) {
      const base = developedMill(seed);
      const { mill, report } = resumeMill(base, ms(base.checkpointAt + 7 * DAY));
      expect(report).not.toBeNull();

      // No knockouts, same as versus: the land floors out and the mill keeps
      // turning over however long it's left.
      expect(mill.bedding).toBeGreaterThanOrEqual(MIN_BEDDING - 1e-9);
      expect(currentRate(mill)).toBeGreaterThan(0);

      // And you can afford to put it right when you get back. A week that
      // leaves you unable to pay your own repair bill is a week that ends the
      // save, which is exactly what "a setback, not a wipe" has to rule out.
      const bill = totalRepairCost(mill) + beddingRestoreCost(mill);
      console.log(
        `week away (${seed}): pile=${format(mill.puppies)} bill=${format(bill)} ` +
          `bedding=${mill.bedding.toFixed(2)} broke=${report!.brokeTotal}`,
      );
      expect(mill.puppies).toBeGreaterThan(bill);
    }
  });

  it("reports what happened while you were out", () => {
    const base = developedMill("report");
    const { report } = resumeMill(base, ms(base.checkpointAt + 12 * HOUR));
    expect(report!.awayMs).toBe(12 * HOUR);
    expect(report!.earned).toBeGreaterThan(0);
    expect(report!.events.length).toBeGreaterThan(0);
  });

  it("treats a clock that jumped backwards as no time passing", () => {
    const base = developedMill("clock");
    const { mill, report } = resumeMill(base, ms(base.checkpointAt - HOUR));
    expect(report).toBeNull();
    expect(mill.puppies).toBe(base.puppies);
  });

  /**
   * The back room can shove the clock a week forward, and putting it back left
   * the mill holding a checkpoint the wall clock wouldn't reach for a week. It
   * kept its puppies and its kit, and refused every command that whole time:
   * no whistling, no buying, no repairs, one red banner. A phone correcting its
   * own clock did the same thing to a player who never opened the back room.
   */
  it("keeps playing after the clock is put back, rather than freezing until it catches up", () => {
    const base = developedMill("skew");
    // A week ahead, the way the dev lever leaves it...
    const { mill: jumped } = resumeMill(base, ms(base.checkpointAt + 7 * DAY));
    // ...and then back to real time.
    const back = ms(base.checkpointAt + HOUR);
    const { mill: rebased } = resumeMill(jumped, back);
    expect(rebased.checkpointAt).toBe(back);
    // Nothing the week produced is taken away.
    expect(rebased.puppies).toBe(jumped.puppies);
    // Nothing is stamped in the future any more, so nothing is asked how long
    // ago something that hasn't happened was.
    expect(rebased.nextWeatherAt).toBeGreaterThanOrEqual(back);
    expect(rebased.runStartedAt).toBeLessThanOrEqual(back);
    for (const e of rebased.log) expect(e.at).toBeLessThanOrEqual(back);
    // And the mill answers commands again.
    const whistled = applyMillCommand(rebased, { type: "whistle", count: 1 }, back);
    expect(whistled.ok).toBe(true);
    // Even from the raw future-checkpointed mill, without a reload in between.
    expect(applyMillCommand(jumped, { type: "whistle", count: 1 }, back).ok).toBe(true);
  });
});

describe("putting everything right", () => {
  /** A mill left alone long enough to have both broken kit and tired bedding. */
  function wreckedMill(seed = "fixall"): MillState {
    const base = developedMill(seed);
    const { mill } = resumeMill(base, ms(base.checkpointAt + 2 * DAY));
    expect(mill.bedding).toBeLessThan(MAX_BEDDING);
    expect(totalRepairCost(mill)).toBeGreaterThan(0);
    return mill;
  }

  it("charges the same as paying every bill by hand, and leaves the same mill", () => {
    const wrecked = wreckedMill();
    const now = wrecked.checkpointAt;

    const one = applyMillCommand(wrecked, { type: "fix_all" }, now);
    expect(one.ok).toBe(true);
    if (!one.ok) return;

    let byHand = wrecked;
    for (const cmd of [
      { type: "restore_bedding" } as const,
      ...SOLO_PRODUCERS.filter((p) => brokenCount(wrecked, p.id) > 0).map(
        (p) => ({ type: "repair", producer: p.id }) as const,
      ),
    ]) {
      const res = applyMillCommand(byHand, cmd, now);
      expect(res.ok).toBe(true);
      if (res.ok) byHand = res.mill;
    }

    expect(one.mill.puppies).toBeCloseTo(byHand.puppies, 6);
    expect(one.mill.bedding).toBe(MAX_BEDDING);
    for (const prod of SOLO_PRODUCERS) {
      expect(brokenCount(one.mill, prod.id)).toBe(brokenCount(byHand, prod.id));
    }
    expect(wrecked.puppies - one.mill.puppies).toBeCloseTo(upkeepBill(wrecked), 6);
  });

  it("only pays for the mill you're standing on", () => {
    // Everything the outside ladder has broken is billed here; the inside mill's
    // damage isn't reachable from the fields and isn't charged for.
    const wrecked = wreckedMill("scope");
    expect(wrecked.world).toBe("outside");
    const outsideBill = SOLO_PRODUCERS.filter((p) => p.world === "outside").reduce(
      (sum, p) => sum + repairCost(wrecked, p.id),
      0,
    );
    expect(upkeepBill(wrecked)).toBeCloseTo(outsideBill + beddingRestoreCost(wrecked), 6);
  });

  it("is all or nothing — an unaffordable bill changes nothing", () => {
    const wrecked = wreckedMill("broke");
    const skint = { ...wrecked, puppies: P.of(upkeepBill(wrecked) - 1) };
    const res = applyMillCommand(skint, { type: "fix_all" }, skint.checkpointAt);
    expect(res.ok).toBe(false);
  });

  it("refuses when there's nothing wrong", () => {
    const clean = createMill({ seed: "clean", startedAt: ms(0) });
    const res = applyMillCommand(clean, { type: "fix_all" }, ms(1_000));
    expect(res.ok).toBe(false);
  });
});

describe("weather", () => {
  it("is a running cost, not a wipe", () => {
    const ratios = ["w1", "w2", "w3"].map((seed) => {
      const withWeather = simulateMill({ seed, durationMs: 4 * HOUR, style: "keen" });
      const control = simulateMill({ seed, durationMs: 4 * HOUR, style: "keen", weather: false });
      console.log(
        `${seed}: weathered=${format(withWeather.mill.raised)} ` +
          `clear=${format(control.mill.raised)} ` +
          `events=${withWeather.weatherEvents} broke=${withWeather.brokeTotal}`,
      );
      return withWeather.mill.raised / control.mill.raised;
    });
    const median = [...ratios].sort((a, b) => a - b)[1]!;
    // It has to actually cost you something, or the land is decoration...
    expect(median).toBeLessThan(0.97);
    // ...and it can't be the dominant term, or growing is beside the point.
    expect(median).toBeGreaterThan(0.35);
  });

  /**
   * Measured on an absence, because that's the only place mitigation can pay.
   * A miller sitting at the shop repairs everything the moment it breaks, and
   * puppies spent barely move the output curve — spend a third of your income
   * on repairs all session and you finish about a percent behind. So online,
   * land and no land come out the same. Away, nobody is fixing anything, and
   * what you built is the only thing standing between the mill and the floor.
   */
  it("makes building the land worth the puppies it costs", () => {
    const ratios = ["l1", "l2", "l3"].map((seed) => {
      const base = developedMill(seed, 2 * HOUR);
      const bare: MillState = { ...base, land: {} };
      const built: MillState = {
        ...base,
        land: { windbreak: 6, drainage: 6, pest_control: 4 },
      };
      const away = ms(base.checkpointAt + 2 * HOUR);
      const after = (f: MillState) => advance(f, away, true).mill;
      const [left, kept] = [after(bare), after(built)];
      console.log(
        `${seed}: bare=${format(currentRate(left))}/s bedding=${left.bedding.toFixed(2)} ` +
          `built=${format(currentRate(kept))}/s bedding=${kept.bedding.toFixed(2)}`,
      );
      return currentRate(kept) / currentRate(left);
    });
    const median = [...ratios].sort((a, b) => a - b)[1]!;
    expect(median).toBeGreaterThan(1.5);
  });

  /**
   * The bug this pins is the one a player actually reports, and they report it
   * as "everything breaks at once".
   *
   * Damage here is permanent and the events never stop, so when the worst case
   * was a constant — half of every producer broken, bedding on the floor — every
   * unattended mill walked to that same constant and sat there. Eight hours away
   * and a week away returned the *identical* wreck at about 87% down, no matter
   * what the run had been spent on. That isn't a running cost, it's a cutscene
   * with a repair bill attached.
   *
   * So what's asserted is that the absence's damage saturates somewhere the
   * player chose, rather than somewhere the constants did.
   */
  it("lets a mill you built up survive being left alone", () => {
    for (const seed of ["k1", "k2", "k3"]) {
      const base = developedMill(seed, HOUR);
      const bare: MillState = { ...base, land: {} };
      const built: MillState = {
        ...base,
        land: { windbreak: 12, drainage: 12, pest_control: 10 },
      };
      // Measured against the mill you walked away from, since both start with
      // whatever the active hour already did to them.
      const kept = (f: MillState, hours: number) =>
        currentRate(advance(f, ms(base.checkpointAt + hours * HOUR), true).mill) / currentRate(f);

      for (const hours of [8, 24 * 7]) {
        console.log(
          `${seed} ${hours}h: bare kept ${(kept(bare, hours) * 100).toFixed(0)}%, ` +
            `built kept ${(kept(built, hours) * 100).toFixed(0)}%`,
        );
        // A mill with the land behind it comes back needing a tidy, not a rebuild.
        expect(kept(built, hours)).toBeGreaterThan(0.8);
        // One without still gets taken apart — that's what the land is for.
        expect(kept(bare, hours)).toBeLessThan(0.35);
      }
      // And the wreck has to stop being a fixed destination: a week away can't
      // cost a built mill materially more than a night away.
      expect(kept(built, 24 * 7)).toBeGreaterThan(kept(built, 8) - 0.05);
    }
  });

  /**
   * Broken kit and tired bedding are the same injury billed two ways, so their
   * prices have to stay in the same league. They drifted an order of magnitude
   * apart once — repairs paid for themselves in minutes while the bedding bill
   * took two hours, which made restoring bedding a button nobody should ever press.
   */
  it("prices fixing the land in the same league as fixing the kit", () => {
    const mill = developedMill("prices", 2 * HOUR);
    const hurt: MillState = { ...mill, bedding: mill.bedding - 0.1 };
    const payback = beddingRestoreCost(hurt) / beddingLossRate(hurt);
    const repairPayback = REPAIR_SECONDS * SOLO_REPAIR_COST_FRACTION;
    console.log(`bedding payback=${Math.round(payback)}s, repair payback=${repairPayback}s`);
    expect(payback).toBeLessThan(2 * repairPayback);
    // And not so cheap that letting the bedding go is free.
    expect(payback).toBeGreaterThan(0.5 * repairPayback);
  });

  /**
   * The other half of that: both bills also have to compete with the ladder,
   * because that's what the puppies would otherwise be spent on. Priced at
   * twenty minutes of payback, restoring bedding lost to every producer on the
   * board and the weather's bedding half was a tax with no move attached.
   */
  it("prices fixing the land against what else you could buy", () => {
    const mill = developedMill("versus_ladder", 2 * HOUR);
    const hurt: MillState = { ...mill, bedding: mill.bedding - 0.15 };
    const beddingPayback = beddingRestoreCost(hurt) / beddingLossRate(hurt);

    let bestRung = Infinity;
    for (const prod of SOLO_PRODUCERS) {
      const gain = prod.baseRate * producerMultiplier(hurt, prod.id) * hurt.bedding;
      bestRung = Math.min(bestRung, producerCost(hurt, prod.id, 1) / gain);
    }
    console.log(`bedding payback=${Math.round(beddingPayback)}s, best rung=${Math.round(bestRung)}s`);
    expect(beddingPayback).toBeLessThan(3 * bestRung);
  });

  it("leaves an idle mill alone until it has something worth wrecking", () => {
    // Ten minutes of a brand-new mill should not be spent watching your four
    // puppy pens break.
    const early = simulateMill({ seed: "grace", durationMs: seconds(600), style: "keen" });
    expect(early.brokeTotal).toBe(0);
  });
});

describe("prestige", () => {
  it("pays more for a bigger run, with sharply diminishing returns", () => {
    expect(papersFor(4e14 as never)).toBe(1);
    expect(papersFor(4e18 as never)).toBe(10);
    expect(papersFor(4e22 as never)).toBe(100);
    // Ten papers costs ten thousand times the output of one.
    expect(papersFor(4e18 as never)).toBeGreaterThan(papersFor(4e17 as never));
  });

  /**
   * The reason the curve is a fourth root rather than a cube root. Output above
   * the fold runs about a million times a pre-fold run's, and a cube root turned
   * that into tens of thousands of papers — enough unspent multiplier to make the
   * next generation a formality. This is the guard on that: a run six orders of
   * magnitude richer is worth double digits more papers, not four.
   */
  it("keeps a converged run's payout in the same league as an unconverged one", () => {
    const preFold = papersFor(5e17 as never);
    const deepConverged = papersFor(2.5e24 as never);
    expect(preFold).toBeGreaterThan(0);
    expect(deepConverged / preFold).toBeLessThan(100);
    // And the pile it hands over is a boost, not a coronation.
    expect(1 + MULT_PER_UNSPENT_PAPER * deepConverged).toBeLessThan(20);
  });

  it("wipes the run, keeps the inheritance, and starts you stronger", () => {
    // Pedigree now land around the Convergence rather than a day or two short of
    // it, so the milestone this measures at is a multi-day run at a realistic
    // check-in cadence — not the always-on bot, which never gets there.
    const base = simulateCadence({ seed: "prestige", days: 5, cadence: "normal" }).mill;
    const earned = pendingPapers(base);
    expect(earned).toBeGreaterThan(0);

    const rateBefore = currentRate(base);
    const res = applyMillCommand(base, { type: "prestige" }, base.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { mill: MillState }).mill;

    expect(next.papers).toBe(base.papers + earned);
    expect(next.generation).toBe(base.generation + 1);
    expect(next.raised).toBe(0);
    expect(next.bedding).toBe(1);
    expect(Object.values(next.producers).reduce((a, b) => a + b, 0)).toBe(0);
    // Lifetime is the one number that never goes backwards.
    expect(next.lifetimeRaised).toBeGreaterThanOrEqual(base.lifetimeRaised);
    // And the papers are worth something on the way back up.
    expect(1 + MULT_PER_UNSPENT_PAPER * next.papers).toBeGreaterThan(1);
    expect(currentRate(next)).toBeLessThan(rateBefore);
  });

  it("refuses a prestige that would pay nothing", () => {
    const fresh = simulateMill({ seed: "tiny", durationMs: seconds(30), style: "keen" }).mill;
    const res = applyMillCommand(fresh, { type: "prestige" }, fresh.checkpointAt);
    expect(res.ok).toBe(false);
  });
});

describe("the Convergence", () => {
  /**
   * The binding constraint on the whole endgame: **the fold has to be reachable
   * in a single dedicated run**, on a first save, with no prestige and no papers.
   * Not something you find out about three generations deep.
   *
   * Measured at a modest check-in cadence with the clock jumped between
   * sessions, so the mill runs unattended and nobody repairs anything in the
   * gaps — which is the only thing separating this from the always-on bot. A
   * week is the outer bound; the design target is day four.
   *
   * Without this guard the next retune quietly breaks the thing the endgame is
   * most specific about, and it would break silently: every other test in this
   * file still passes with the fold three days further away.
   */
  it("is reachable in one playthrough at a modest check-in cadence", () => {
    for (const seed of ["one", "two"]) {
      const run = simulateCadence({ seed, days: 7, cadence: "normal", style: "keen" });
      // What the Ur-Chihuahua actually costs at the moment it's affordable, in the
      // only unit an early upgrade and a late one are comparable in. The other
      // late globals are in the hundreds-to-thousands range; this has to stay
      // there or moving its gate to ten turned it into a giveaway.
      const price = SOLO_UPGRADE_BY_ID.ur_chihuahua!.cost / (run.convergedRate ?? Infinity);
      console.log(
        `${seed}: 3x15min/day converged at ` +
          `${run.convergedAt === null ? "never" : `day ${(run.convergedAt / DAY).toFixed(1)}`} ` +
          `for ${price.toFixed(0)}s of production`,
      );
      expect(run.convergedAt).not.toBeNull();
      expect(run.convergedAt!).toBeLessThan(7 * DAY);
      expect(price).toBeGreaterThan(60);
      // And on a first save: no prestige, no papers, nothing handed down.
      expect(run.mill.generation).toBe(1);
      expect(run.mill.papers).toBe(0);
    }
  });

  it("keeps the tiers above the fold out of an unfolded world", () => {
    const mill = developedMill("gate");
    expect(mill.converged).toBe(false);
    for (const prod of SOLO_PRODUCERS.filter((p) => p.world === "inside")) {
      const rich: MillState = { ...mill, puppies: 1e30 as never };
      expect(applyMillCommand(rich, { type: "buy_producer", producer: prod.id, qty: 1 }, rich.checkpointAt).ok)
        .toBe(false);
      expect(applyMillCommand(
        { ...rich, converged: true },
        { type: "buy_producer", producer: prod.id, qty: 1 },
        rich.checkpointAt,
      ).ok).toBe(true);
    }
  });

  /**
   * What the shop hangs its one piece of tunnel vision on. The window opens on
   * the tenth Chihuahua Singularity and shuts on the purchase, and nowhere else —
   * a mill that's already folded must not get an empty shop for the rest of
   * the run.
   */
  it("empties the shop only between the gate opening and the purchase", () => {
    const gate = SOLO_UPGRADE_BY_ID[CONVERGENCE_UPGRADE]!.requires!;
    const base = developedMill("pending");
    const short: MillState = { ...base, producers: { [gate.producer]: gate.count - 1 } };
    const ready: MillState = { ...base, producers: { [gate.producer]: gate.count } };

    expect(convergencePending(short)).toBe(false);
    expect(convergencePending(ready)).toBe(true);
    // Bought, and the shop comes back.
    expect(convergencePending({ ...ready, upgrades: [CONVERGENCE_UPGRADE] })).toBe(false);
    expect(convergencePending({ ...ready, converged: true })).toBe(false);
  });

  it("happens to you once, and outlives the mill it happened to", () => {
    const base = worthHandingDown(developedMill("fold", 24 * HOUR));
    const folded: MillState = { ...base, converged: true };
    const res = applyMillCommand(folded, { type: "prestige" }, folded.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { mill: MillState }).mill;
    // The run is gone; the world it happened in isn't.
    expect(next.producers).toEqual({});
    expect(next.converged).toBe(true);
  });

  /**
   * ...unless you hand the mill down and ask for the sky. The one door out, and
   * the only thing in the game that puts a permanent flag back.
   */
  it("hands the sky down too, if that's what you asked for", () => {
    const base = worthHandingDown(developedMill("sky", 24 * HOUR));
    const folded: MillState = { ...base, converged: true };
    const res = applyMillCommand(folded, { type: "prestige", outside: true }, folded.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { mill: MillState }).mill;
    expect(next.converged).toBe(false);
    // And the world above the fold goes with it: the tiers that mill the inside
    // of the puppy are unbuyable again, whatever you can afford.
    const rich: MillState = { ...next, puppies: 1e30 as never };
    for (const prod of SOLO_PRODUCERS.filter((p) => p.world === "inside")) {
      expect(
        applyMillCommand(rich, { type: "buy_producer", producer: prod.id, qty: 1 }, rich.checkpointAt).ok,
      ).toBe(false);
    }
    // Which means it's there to climb to again.
    expect(convergencePending({ ...next, producers: { singularity: 10 } })).toBe(true);
  });

  it("has no sky to offer a mill that never folded", () => {
    const base = worthHandingDown(developedMill("nofold", 24 * HOUR));
    expect(base.converged).toBe(false);
    const res = applyMillCommand(base, { type: "prestige", outside: true }, base.checkpointAt);
    expect(res.ok).toBe(true);
    expect((res as { mill: MillState }).mill.converged).toBe(false);
  });

  it("swaps the weather for the nest's immune response", () => {
    const base = developedMill("immune", 2 * HOUR);
    const seen = (f: MillState) =>
      new Set(advance(f, ms(f.checkpointAt + 6 * HOUR)).events.map((e) => e.id));

    const sky = seen(base);
    const nest = seen({ ...base, converged: true });
    console.log(`sky=${[...sky].join(",")} nest=${[...nest].join(",")}`);

    expect(sky.size).toBeGreaterThan(0);
    expect(nest.size).toBeGreaterThan(0);
    for (const id of sky) expect(WEATHER_IDS.sky).toContain(id);
    // No hail and no frost inside a puppy. There's no sky for them to come
    // out of, which is the point of the swap.
    for (const id of nest) expect(WEATHER_IDS.nest).toContain(id);
  });

  /**
   * The Hem Hollow is the only thing at the top of the ladder that feeds
   * back into the land half, and the reason that half currently stops mattering
   * at four buildings. It has to stack the way a building does — diminishing,
   * under the clamp — or two hundred of them turn the weather off.
   */
  it("lets the ceiling calm the weather without ever stopping it", () => {
    const base: MillState = { ...developedMill("calm"), converged: true };
    const few: MillState = { ...base, producers: { ...base.producers, hem: 10 } };
    const many: MillState = { ...base, producers: { ...base.producers, hem: 400 } };
    expect(mitigation(few, "frequency")).toBeGreaterThan(mitigation(base, "frequency"));
    expect(mitigation(many, "frequency")).toBeGreaterThan(mitigation(few, "frequency"));
    expect(mitigation(many, "frequency")).toBeLessThanOrEqual(MAX_MITIGATION);
  });

  /**
   * The Down Well's wrinkle: its rate scales *with* bedding as well as being
   * multiplied by it, so letting the dirt go costs it twice and restoring the
   * dirt is a live decision at the top instead of a rounding error.
   */
  it("makes the Down Well care about the bedding twice over", () => {
    const base: MillState = {
      ...developedMill("well"),
      converged: true,
      producers: { well: 10 },
      broken: {},
    };
    const half: MillState = { ...base, bedding: 0.5 };
    const whole = currentRate({ ...base, bedding: 1 });
    // A quarter, not a half: once for the mill-wide bedding factor and once for
    // the tap's own.
    expect(currentRate(half) / whole).toBeCloseTo(0.25, 6);
    // And the row that sells you the fix has to quote what the fix gives back,
    // which is three quarters here and not the one quarter that `rate * (1 -
    // bedding)` would report.
    expect(beddingLossRate(half)).toBeCloseTo(whole - currentRate(half), 6);
  });

  it("holds the perks that only make sense inside the puppy until it happens", () => {
    const base = developedMill("perks");
    const rich: MillState = { ...base, papers: 1_000_000 };
    for (const perk of PERKS.filter((p) => p.afterFold)) {
      expect(applyMillCommand(rich, { type: "buy_perk", perk: perk.id }, rich.checkpointAt).ok).toBe(false);
      expect(applyMillCommand(
        { ...rich, converged: true },
        { type: "buy_perk", perk: perk.id },
        rich.checkpointAt,
      ).ok).toBe(true);
    }
  });
});

/**
 * The two mills.
 *
 * The fold used to bolt four rungs onto the end of one ladder; it hands you a
 * second place now. The invariant that makes that worth having is that the old
 * mill doesn't stop — you inherit it as an income and go build somewhere else
 * with the money — so most of what's here is about `world` staying a camera and
 * never becoming a switch on the economy.
 */
describe("the two worlds", () => {
  const folded = (f: MillState): MillState => ({ ...f, converged: true, world: "inside" });

  it("keeps the outside mill earning while you're inside", () => {
    const base = developedMill("both", 2 * HOUR);
    const outside = currentRate(base);
    const inside = currentRate(folded(base));
    // Nothing new was bought, so standing somewhere else changed nothing.
    expect(inside).toBe(outside);

    // And a mill with rungs in both worlds is making what both of them make.
    const withBoth: MillState = {
      ...folded(base),
      producers: { ...base.producers, linthand: 3 },
    };
    expect(currentRate(withBoth)).toBeGreaterThan(outside);
    expect(currentRate({ ...withBoth, world: "outside" })).toBe(currentRate(withBoth));
  });

  it("splits the ladder cleanly, and keeps payback climbing across the seam", () => {
    const outside = SOLO_PRODUCERS.filter((p) => p.world === "outside");
    const inside = SOLO_PRODUCERS.filter((p) => p.world === "inside");
    expect(outside.length + inside.length).toBe(SOLO_PRODUCERS.length);
    // The inside is a climb rather than a coda. Four rungs was a shop you
    // cleared in an afternoon.
    expect(inside.length).toBeGreaterThanOrEqual(8);
    // The two ladders are contiguous: the whole table is outside, then inside,
    // which is what lets the shop show one slice of it per world without any
    // rung going missing.
    const firstInside = SOLO_PRODUCERS.findIndex((p) => p.world === "inside");
    expect(SOLO_PRODUCERS.slice(firstInside).every((p) => p.world === "inside")).toBe(true);
    // And the bottom of the inside shop is buyable more or less on arrival: the
    // Ur-Chihuahua costs more than the first rung of the world it opens.
    expect(inside[0]!.baseCost).toBeLessThan(SOLO_UPGRADE_BY_ID.ur_chihuahua!.cost);
  });

  it("gives the inside its own land, one role for one", () => {
    const roles = (world: "outside" | "inside") =>
      new Set(LANDS.filter((l) => l.world === world).map((l) => l.role));
    expect(roles("inside")).toEqual(roles("outside"));
  });

  it("puts you inside the moment the world folds", () => {
    const base = developedMill("arrive", 24 * HOUR);
    const ready: MillState = {
      ...base,
      producers: { ...base.producers, singularity: 10 },
      puppies: 1e30 as never,
    };
    expect(ready.world).toBe("outside");
    const res = applyMillCommand(ready, { type: "buy_upgrade", upgrade: CONVERGENCE_UPGRADE }, ready.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { mill: MillState }).mill;
    expect(next.converged).toBe(true);
    expect(next.world).toBe("inside");
  });

  it("lets a folded mill step between the two, and refuses one that never folded", () => {
    const base = developedMill("warp");
    expect(applyMillCommand(base, { type: "warp", to: "inside" }, base.checkpointAt).ok).toBe(false);

    const inside = folded(base);
    const out = applyMillCommand(inside, { type: "warp", to: "outside" }, inside.checkpointAt);
    expect(out.ok).toBe(true);
    const there = (out as { mill: MillState }).mill;
    expect(there.world).toBe("outside");
    // Standing outside doesn't put the inside shop out of reach — the rungs are
    // gated on the fold, not on where your feet are.
    const rich: MillState = { ...there, puppies: 1e30 as never };
    expect(
      applyMillCommand(rich, { type: "buy_producer", producer: "linthand", qty: 1 }, rich.checkpointAt).ok,
    ).toBe(true);
    // And going nowhere is refused rather than silently costing a command.
    expect(applyMillCommand(there, { type: "warp", to: "outside" }, there.checkpointAt).ok).toBe(false);
  });

  /**
   * The one that soft-locked the save. A hand-down clears `producers`, and the
   * cheapest row inside costs most of a quadrillion — so a generation that
   * started where it left off started in a shop it could never buy from, with
   * one whistle's worth of income and no way to know the exit was a lever in the
   * back room.
   */
  it("starts every generation outside, with the door still open behind it", () => {
    const base = folded(worthHandingDown(developedMill("handdown", 24 * HOUR)));
    const stay = applyMillCommand(base, { type: "prestige" }, base.checkpointAt);
    const kept = (stay as { mill: MillState }).mill;
    expect(kept.world).toBe("outside");
    // The fold came with you, so the way back in is one warp rather than a
    // second climb.
    expect(kept.converged).toBe(true);
    expect(applyMillCommand(kept, { type: "warp", to: "inside" }, kept.checkpointAt).ok).toBe(true);
    // And whatever it starts you with is spendable on the shop it starts in.
    expect(SOLO_PRODUCERS[0]!.baseCost).toBeLessThan(SOLO_PRODUCERS.find((p) => p.world === "inside")!.baseCost);

    const leave = applyMillCommand(base, { type: "prestige", outside: true }, base.checkpointAt);
    const next = (leave as { mill: MillState }).mill;
    expect(next.converged).toBe(false);
    expect(next.world).toBe("outside");
    expect(applyMillCommand(next, { type: "warp", to: "inside" }, next.checkpointAt).ok).toBe(false);
  });

  it("reopens an old save in the world it was standing in", () => {
    const base = developedMill("save2");
    const roundTrip = (f: MillState) => parseMill(serializeMill(f, f.checkpointAt))!;

    expect(roundTrip(base).world).toBe("outside");
    expect(roundTrip(folded(base)).world).toBe("inside");
    expect(roundTrip({ ...folded(base), world: "outside" }).world).toBe("outside");

    // A save written before `world` existed: a folded one reopens inside, which
    // is where the fold left it, and an unfolded one has nowhere else to be.
    const legacy = (f: MillState) => {
      const { world: _drop, ...rest } = f;
      return parseMill(JSON.stringify({ version: 1, savedAt: 0, mill: rest }))!;
    };
    expect(legacy(folded(base)).world).toBe("inside");
    expect(legacy(base).world).toBe("outside");
  });
});

describe("the back room", () => {
  it("pays out where a capped whistle can't, and says so in the log", () => {
    const mill = developedMill("grant");
    const whistles = 10_000;
    const res = applyMillCommand(mill, { type: "dev_grant", whistles }, mill.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { mill: MillState }).mill;

    // A `whistle` of the same size is clamped to a flush's worth; this isn't.
    const whistled = applyMillCommand(mill, { type: "whistle", count: whistles }, mill.checkpointAt);
    expect((whistled as { mill: MillState }).mill.puppies).toBeLessThan(next.puppies);

    const entries = (res as { entries: { text: string }[] }).entries;
    expect(entries.some((e) => e.text.startsWith("dev:"))).toBe(true);
  });

  it("pulls the next event forward without changing which one it is", () => {
    const mill = developedMill("weather-lever");
    // What the schedule was always going to send next, left alone.
    const natural = advance(mill, ms(mill.nextWeatherAt + 1_000)).events[0];
    expect(natural).toBeDefined();

    const res = applyMillCommand(mill, { type: "dev_weather" }, mill.checkpointAt);
    expect(res.ok).toBe(true);
    const pulled = (res as { mill: MillState }).mill;
    expect(pulled.nextWeatherAt).toBe(mill.checkpointAt);

    // It lands on the very next tick, and it's the same event — the lever moves
    // the appointment, not the schedule.
    const soon = advance(pulled, ms(pulled.checkpointAt + 1_000));
    expect(soon.events).toHaveLength(1);
    expect(soon.events[0]!.id).toBe(natural!.id);
  });

  it("grants papers without a hand-down", () => {
    const mill = developedMill("seed-lever");
    const res = applyMillCommand(mill, { type: "dev_papers", papers: 500 }, mill.checkpointAt);
    const next = (res as { mill: MillState }).mill;
    expect(next.papers).toBe(mill.papers + 500);
    // Nothing else about the run moves — this is not a prestige.
    expect(next.generation).toBe(mill.generation);
    expect(next.producers).toEqual(mill.producers);
  });

  it("folds and unfolds, leaving a mill one purchase short of the fold", () => {
    const base = developedMill("fold-lever");
    const folded = (applyMillCommand(base, { type: "dev_fold", converged: true }, base.checkpointAt) as {
      mill: MillState;
    }).mill;
    expect(folded.converged).toBe(true);
    expect(applyMillCommand(folded, { type: "dev_fold", converged: true }, folded.checkpointAt).ok).toBe(
      false,
    );

    // Buy the things that only exist under a ceiling, then take the ceiling away.
    const kitted: MillState = {
      ...folded,
      world: "inside",
      producers: { ...folded.producers, hem: 12 },
      broken: { ...folded.broken, hem: 3 },
      land: { ...folded.land, padded_seams: 1 },
      upgrades: [...folded.upgrades, CONVERGENCE_UPGRADE, "hem_x2a", "ceiling_rights"],
    };
    const opened = (applyMillCommand(kitted, { type: "dev_fold", converged: false }, kitted.checkpointAt) as {
      mill: MillState;
    }).mill;

    expect(opened.converged).toBe(false);
    expect(opened.world).toBe("outside");
    expect(opened.producers.hem).toBeUndefined();
    expect(opened.broken.hem).toBeUndefined();
    // The Ur-Chihuahua goes back on the shelf, which is the whole point: the fold
    // only animates on a real purchase, so this is the state to watch it from.
    expect(opened.upgrades).not.toContain(CONVERGENCE_UPGRADE);
    expect(opened.upgrades).not.toContain("hem_x2a");
    expect(opened.land.padded_seams).toBeUndefined();
    // `ceiling_rights` is gated on the Hem Hollow, so it goes with it —
    // whereas an upgrade gated on an outside rung is untouched.
    expect(opened.upgrades).not.toContain("ceiling_rights");
    // The yard and the run's output are somebody's afternoon. Left alone.
    expect(opened.puppies).toBe(kitted.puppies);
    expect(opened.raised).toBe(kitted.raised);
    // And what it leaves behind is a mill the sim will actually accept commands
    // against — no orphaned inside kit, no upgrade with nothing to multiply.
    expect(applyMillCommand(opened, { type: "warp", to: "inside" }, opened.checkpointAt).ok).toBe(false);
  });
});

describe("saving", () => {
  it("round-trips a mill exactly", () => {
    const mill = developedMill("save");
    const restored = parseMill(serializeMill(mill, mill.checkpointAt));
    expect(restored).toEqual(mill);
  });

  it("refuses junk rather than throwing", () => {
    expect(parseMill("not json")).toBeNull();
    expect(parseMill("{}")).toBeNull();
    expect(parseMill(JSON.stringify({ version: 999, mill: {} }))).toBeNull();
  });
});
