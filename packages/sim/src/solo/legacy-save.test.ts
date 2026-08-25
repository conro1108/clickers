/**
 * A save written before the two games shared an engine still opens.
 *
 * The merge renamed every field and most content ids, which would otherwise
 * have quietly cost both games' players their site — and a half-migrated save
 * is worse than none, because you'd keep your heirlooms and lose your yard.
 */

import { describe, expect, it } from "vitest";

import { parseSite, SAVE_VERSION } from "./persist.js";

/** Shaped like the potato game's localStorage, in the words it used to use. */
const potatoSave = JSON.stringify({
  version: SAVE_VERSION,
  savedAt: 1_700_000_000_000,
  farm: {
    seed: "old-farm",
    startedAt: 1_600_000_000_000,
    checkpointAt: 1_700_000_000_000,
    potatoes: 12_345,
    harvested: 98_765,
    lifetimeHarvested: 500_000,
    soil: 0.6,
    seeds: 7,
    producers: { plot: 40, tractor: 3, harvester: 1, hand: 12 },
    broken: { tractor: 1 },
    upgrades: ["spade", "fertilizer", "plot_x2a", "tractor_x2b"],
    land: { windbreak: 2, callus_beds: 1 },
    perks: { green_thumb: 3, night_shift: 1 },
    generation: 2,
    weatherIndex: 9,
    log: [],
  },
});

/** And the puppy game's, which renamed the same things differently. */
const puppySave = JSON.stringify({
  version: SAVE_VERSION,
  savedAt: 1_700_000_000_000,
  mill: {
    seed: "old-mill",
    startedAt: 1_600_000_000_000,
    checkpointAt: 1_700_000_000_000,
    puppies: 12_345,
    raised: 98_765,
    lifetimeRaised: 500_000,
    bedding: 0.6,
    papers: 7,
    producers: { pen: 40, van: 3, groomer: 1, hand: 12 },
    broken: { van: 1 },
    upgrades: ["silver_whistle", "better_kibble", "pen_x2a", "van_x2b"],
    land: { windbreak: 2, padded_seams: 1 },
    perks: { good_stock: 3, night_shift: 1 },
    generation: 2,
    weatherIndex: 9,
    log: [],
  },
});

describe("saves from before the merge", () => {
  for (const [game, raw] of [["potato", potatoSave], ["puppy", puppySave]] as const) {
    it(`opens a ${game} save with the yard still on it`, () => {
      const site = parseSite(raw);
      expect(site).not.toBeNull();
      expect(site!.stock).toBe(12_345);
      expect(site!.produced).toBe(98_765);
      expect(site!.lifetimeProduced).toBe(500_000);
      expect(site!.condition).toBeCloseTo(0.6);
      expect(site!.heirlooms).toBe(7);
      expect(site!.generation).toBe(2);

      // The yard itself, under the ids the engine uses now.
      expect(site!.producers).toEqual({ patch: 40, hauler: 3, machine: 1, hand: 12 });
      expect(site!.broken).toEqual({ hauler: 1 });
      expect(site!.upgrades).toEqual(["tool_1", "boost_1", "patch_x2a", "hauler_x2b"]);
      expect(site!.land).toEqual({ windbreak: 2, inner_beds: 1 });
      expect(site!.perks).toEqual({ knack: 3, night_shift: 1 });
    });
  }
});
