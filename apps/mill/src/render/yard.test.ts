import { describe, expect, it } from "vitest";

import {
  buildHidden,
  fetchTarget,
  packAt,
  PACK_CAP,
  PACK_LEFT,
  PACK_OPEN_AT,
  PACK_RIGHT,
  SCENE_W,
  YARD,
  yardLayout,
} from "./millScene.js";

/**
 * The yard's promises: the pack only ever grows while you earn, spending it
 * visibly costs you dogs, and the crowd takes the whole run to arrive. The
 * first one is the whole reason this stopped being a counter — place value
 * emptied the yard at every power of ten, and a row of units turned it into a
 * bar chart.
 */
describe("the yard", () => {
  it("never takes anything down while the hoard grows", () => {
    let last = -1;
    for (let l = 0; l <= 15; l += 0.005) {
      const { stage } = yardLayout(10 ** l);
      expect(stage).toBeGreaterThanOrEqual(last);
      last = stage;
    }
  });

  it("costs you a stage or two when you clear out your bank", () => {
    // Anywhere past the early stages, spending nine tenths of what you have
    // should be something you can watch happen, not a rounding difference.
    for (let l = 3; l <= 13; l += 0.25) {
      const before = yardLayout(10 ** l).stage;
      const after = yardLayout(10 ** l / 10).stage;
      expect(before - after).toBeGreaterThanOrEqual(1);
    }
  });

  it("puts a dog on the ground for the very first puppy, then keeps the pack in bounds", () => {
    // It counted the first few one for one until the opening was stretched out;
    // the first one still has to land immediately, because an empty yard on the
    // first whistle reads as the whistle not having worked.
    expect(yardLayout(0).pack).toBe(0);
    expect(yardLayout(1).pack).toBe(1);
    for (let l = 0; l <= 15; l += 0.01) {
      const { stage, pack } = yardLayout(10 ** l);
      expect(pack).toBeGreaterThanOrEqual(0);
      expect(pack).toBeLessThanOrEqual(Math.min(PACK_CAP, packAt(stage)));
    }
  });

  it("never shrinks the pack while the hoard grows", () => {
    // The pack used to reset to nothing at every stage, and later took a cut
    // indoors whenever a stage added a prop. With the props gone there's
    // nothing left for a dog to leave *for*, so earning is one unbroken climb
    // and any dip is a bug.
    let last = yardLayout(1);
    for (let l = 0.05; l <= 17.5; l += 0.005) {
      const now = yardLayout(10 ** l);
      expect(now.pack, `pack fell at 1e${l.toFixed(2)}`).toBeGreaterThanOrEqual(last.pack);
      last = now;
    }
  });

  it("never leaves the field looking emptier than the stage it's on", () => {
    // Against the stage's own figure, not against the cap. The pack spends the
    // whole run climbing now, so "a decent crowd" means a decent crowd *for
    // where you are* — five dogs is a full yard on day one and a bug on day
    // five, and a flat threshold can't tell the two apart.
    //
    // From the end of the opening rather than from the first prop: below that
    // the yard is *meant* to look thin for its stage, because the pack is still
    // arriving. That's the opening's whole job.
    for (let l = Math.log10(PACK_OPEN_AT); l <= 17.5; l += 0.005) {
      const { stage, pack } = yardLayout(10 ** l);
      expect(pack, `thin at 1e${l.toFixed(2)}`).toBeGreaterThanOrEqual(Math.round(packAt(stage) * 0.75));
    }
  });

  it("takes the whole run to fill the yard, not the first minute", () => {
    // The pack used to hit its cap at a hundred and ten puppies and sit there
    // for seventeen orders of magnitude. This is the guard on that: the crowd
    // has to still be visibly growing well past the point where a player has
    // stopped being impressed by the props.
    expect(yardLayout(200).pack).toBeLessThan(PACK_CAP * 0.3);
    expect(yardLayout(1e6).pack).toBeLessThan(PACK_CAP * 0.5);
    expect(yardLayout(1e12).pack).toBeLessThan(PACK_CAP * 0.85);
    expect(yardLayout(1e17).pack).toBeGreaterThan(PACK_CAP * 0.85);
  });

  it("spends the whole opening filling the yard, not the first few whistles", () => {
    // The pack used to be one dog per puppy up to a floor of five, so ten
    // seconds in the yard was as full as it would be for the next hour and the
    // only thing left to watch arrive was props.
    expect(yardLayout(5).pack).toBeLessThanOrEqual(2);
    expect(yardLayout(200).pack).toBeLessThanOrEqual(4);
    expect(yardLayout(PACK_OPEN_AT).pack).toBeGreaterThanOrEqual(7);
  });

  it("arrives one dog at a time, including where the opening hands over", () => {
    // Aim the opening ramp at the wrong top and it lets go one short, so the
    // pack pops two at the boundary — which reads as a bug, because a dog that
    // was never on the ground has nowhere to have come from.
    let last = 0;
    for (let a = 0; a <= PACK_OPEN_AT * 1.2; a = a < 50 ? a + 1 : Math.ceil(a * 1.001)) {
      const { pack } = yardLayout(a);
      expect(pack - last, `jumped ${last} to ${pack} at ${a}`).toBeLessThanOrEqual(1);
      last = pack;
    }
  });

  it("never throws the ball somewhere no dog can reach", () => {
    // A target outside the pack's bounds pinned the chasing dog against the
    // fence, and since nothing times a chase out, the fetch loop stayed wedged
    // there for the rest of the session.
    for (const handX of [0, 12, 40, 88, 150, SCENE_W]) {
      for (let roll = 0; roll <= 1; roll += 0.001) {
        const tx = fetchTarget(handX, roll);
        expect(tx, `hand ${handX} roll ${roll.toFixed(3)}`).toBeGreaterThanOrEqual(PACK_LEFT);
        expect(tx, `hand ${handX} roll ${roll.toFixed(3)}`).toBeLessThanOrEqual(PACK_RIGHT);
      }
    }
  });

  it("throws clear of the handler, so the throw reads as a throw", () => {
    // Where the handler actually stands there's plenty of yard to the right,
    // so every throw should be well off their feet.
    for (let roll = 0; roll <= 1; roll += 0.001) {
      expect(Math.abs(fetchTarget(40, roll) - 40)).toBeGreaterThanOrEqual(20);
    }
  });

  it("has a ladder that climbs", () => {
    for (let i = 1; i < YARD.length; i++) {
      expect(YARD[i]!.at).toBeGreaterThan(YARD[i - 1]!.at);
    }
  });

  it("walks a building all the way out of the ground and all the way back in", () => {
    const h = 20;
    // The canvas side of this is a clip rect and a blit, but the arithmetic
    // that decides how much is showing is worth pinning: off by one at either
    // end and a building either pops in whole or never finishes arriving.
    expect(buildHidden(0, true, h)).toBe(h);
    expect(buildHidden(999_999, true, h)).toBe(0);
    expect(buildHidden(0, false, h)).toBe(0);
    expect(buildHidden(999_999, false, h)).toBe(h);
    for (const up of [true, false]) {
      let last = up ? h + 1 : -1;
      for (let age = 0; age <= 600; age += 10) {
        const hidden = buildHidden(age, up, h);
        expect(hidden).toBeGreaterThanOrEqual(0);
        expect(hidden).toBeLessThanOrEqual(h);
        expect(up ? hidden <= last : hidden >= last).toBe(true);
        last = hidden;
      }
    }
  });
});
