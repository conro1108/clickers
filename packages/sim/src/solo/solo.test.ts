import { describe, expect, it } from "vitest";

import { ms, seconds } from "../numbers.js";
import { MAX_CONDITION, MIN_CONDITION, SOLO_PRODUCERS, WORLD_GATE, WORLDS, type World } from "./content.js";
import {
  brokenCount,
  currentRate,
  conditionRestoreCost,
  totalRepairCost,
  upkeepBill,
} from "./economy.js";
import { advance, applySiteCommand, gatePending, mustApplySite, pendingHeirlooms } from "./site.js";
import { parseSite, resumeSite, serializeSite } from "./persist.js";
import { MULT_PER_UNSPENT_HEIRLOOM } from "./prestige.js";
import { simulateSite } from "./sim.js";
import type { SiteState } from "./state.js";

const HOUR = seconds(3_600);
const DAY = HOUR * 24;

/** A site that's been played long enough to have something worth wrecking. */
function developedSite(seed = "dev", forMs = HOUR): SiteState {
  return simulateSite({ seed, durationMs: forMs, style: "keen" }).site;
}

/** The same site with a run behind it big enough that a hand-down pays. */
function worthHandingDown(f: SiteState): SiteState {
  return { ...f, produced: Math.max(f.produced, 4e18) as never };
}

describe("offline resolution", () => {
  it("resolves a long gap identically to ticking through it", () => {
    const base = developedSite("gap");
    const to = ms(base.checkpointAt + 6 * HOUR);

    const oneShot = advance(base, to);

    let ticked = base;
    let tickedEvents = 0;
    for (let t = base.checkpointAt; t < to; t = ms(t + 1_000)) {
      const stepped = advance(ticked, ms(Math.min(t + 1_000, to)));
      ticked = stepped.site;
      tickedEvents += stepped.events.length;
    }

    expect(tickedEvents).toBe(oneShot.events.length);
    expect(ticked.weatherIndex).toBe(oneShot.site.weatherIndex);
    expect(ticked.condition).toBeCloseTo(oneShot.site.condition, 10);
    for (const prod of SOLO_PRODUCERS) {
      expect(ticked.broken[prod.id] ?? 0).toBe(oneShot.site.broken[prod.id] ?? 0);
    }
    expect(ticked.stock / oneShot.site.stock).toBeCloseTo(1, 6);
  });

  it("survives a week away without being unrecoverable", () => {
    const base = developedSite("a");
    const { site, report } = resumeSite(base, ms(base.checkpointAt + 7 * DAY));
    expect(report).not.toBeNull();
    expect(site.condition).toBeGreaterThanOrEqual(MIN_CONDITION - 1e-9);
    expect(currentRate(site)).toBeGreaterThan(0);
    // And you can afford to put it right when you get back.
    expect(site.stock).toBeGreaterThan(totalRepairCost(site) + conditionRestoreCost(site));
  });

  it("treats a clock that jumped backwards as no time passing", () => {
    const base = developedSite("clock");
    const { site, report } = resumeSite(base, ms(base.checkpointAt - HOUR));
    expect(report).toBeNull();
    expect(site.stock).toBe(base.stock);
  });
});

describe("putting everything right", () => {
  it("charges the same as paying every bill by hand, and leaves the same site", () => {
    const base = developedSite("fixall");
    const { site: wrecked } = resumeSite(base, ms(base.checkpointAt + 2 * DAY));
    expect(wrecked.condition).toBeLessThan(MAX_CONDITION);
    expect(totalRepairCost(wrecked)).toBeGreaterThan(0);
    const now = wrecked.checkpointAt;

    const one = applySiteCommand(wrecked, { type: "fix_all" }, now);
    expect(one.ok).toBe(true);
    if (!one.ok) return;

    let byHand = wrecked;
    for (const cmd of [
      { type: "restore_condition" } as const,
      ...SOLO_PRODUCERS.filter((p) => brokenCount(wrecked, p.id) > 0).map(
        (p) => ({ type: "repair", producer: p.id }) as const,
      ),
    ]) {
      const res = applySiteCommand(byHand, cmd, now);
      expect(res.ok).toBe(true);
      if (res.ok) byHand = res.site;
    }

    expect(one.site.stock).toBeCloseTo(byHand.stock, 6);
    expect(one.site.condition).toBe(MAX_CONDITION);
    for (const prod of SOLO_PRODUCERS) {
      expect(brokenCount(one.site, prod.id)).toBe(brokenCount(byHand, prod.id));
    }
    expect(wrecked.stock - one.site.stock).toBeCloseTo(upkeepBill(wrecked), 6);
  });
});

describe("prestige", () => {
  it("wipes the run, keeps the inheritance, and starts you stronger", () => {
    const base = worthHandingDown(developedSite("prestige"));
    const earned = pendingHeirlooms(base);
    expect(earned).toBeGreaterThan(0);

    const rateBefore = currentRate(base);
    const res = applySiteCommand(base, { type: "prestige" }, base.checkpointAt);
    expect(res.ok).toBe(true);
    const next = (res as { site: SiteState }).site;

    expect(next.heirlooms).toBe(base.heirlooms + earned);
    expect(next.generation).toBe(base.generation + 1);
    expect(next.produced).toBe(0);
    expect(next.condition).toBe(1);
    expect(Object.values(next.producers).reduce((a, b) => a + b, 0)).toBe(0);
    expect(next.lifetimeProduced).toBeGreaterThanOrEqual(base.lifetimeProduced);
    expect(1 + MULT_PER_UNSPENT_HEIRLOOM * next.heirlooms).toBeGreaterThan(1);
    expect(currentRate(next)).toBeLessThan(rateBefore);
  });
});

describe("the worlds", () => {
  it("opens each world with the gate at the bottom of the one before, and not before", () => {
    let site: SiteState = { ...developedSite("gates"), stock: 1e40 as never };
    for (const world of WORLDS.slice(1)) {
      const rung = SOLO_PRODUCERS.find((p) => p.world === world)!;
      const buy = { type: "buy_producer", producer: rung.id, qty: 1 } as const;
      expect(applySiteCommand(site, buy, site.checkpointAt).ok).toBe(false);
      // Ten of the last rung of the world you're in puts the gate on the shelf.
      const last = SOLO_PRODUCERS.filter((p) => p.world === site.world).at(-1)!;
      site = { ...site, producers: { ...site.producers, [last.id]: 10 } };
      expect(gatePending(site)).toBe(world);
      site = mustApplySite(site, { type: "buy_upgrade", upgrade: WORLD_GATE[world as Exclude<World, "outside">] }, site.checkpointAt);
      expect(site.world).toBe(world);
      expect(applySiteCommand(site, buy, site.checkpointAt).ok).toBe(true);
    }
    expect(site.depth).toBe(WORLDS.length - 1);
  });

  it("starts every generation outside, with the doors still open behind it", () => {
    const base: SiteState = { ...worthHandingDown(developedSite("handdown")), depth: 3, world: "deep" };
    const kept = mustApplySite(base, { type: "prestige" }, base.checkpointAt);
    expect(kept.world).toBe("outside");
    expect(kept.depth).toBe(3);
    expect(applySiteCommand(kept, { type: "warp", to: "deep" }, kept.checkpointAt).ok).toBe(true);

    const next = mustApplySite(base, { type: "prestige", outside: true }, base.checkpointAt);
    expect(next.depth).toBe(0);
    expect(applySiteCommand(next, { type: "warp", to: "inside" }, next.checkpointAt).ok).toBe(false);
  });
});

describe("saving", () => {
  it("round-trips a site exactly", () => {
    const site = developedSite("save");
    const restored = parseSite(serializeSite(site, site.checkpointAt));
    expect(restored).toEqual(site);
  });

  it("reads a save from before `depth` as the worlds it had open", () => {
    const { depth: _, ...old } = { ...developedSite("old"), world: "beyond" as const };
    const parsed = parseSite(serializeSite({ ...old, converged: true, breached: true } as never, old.checkpointAt));
    expect(parsed?.depth).toBe(2);
    expect(parsed?.world).toBe("beyond");
  });

  it("refuses junk rather than throwing", () => {
    expect(parseSite("not json")).toBeNull();
    expect(parseSite("{}")).toBeNull();
    expect(parseSite(JSON.stringify({ version: 999, site: {} }))).toBeNull();
  });
});
