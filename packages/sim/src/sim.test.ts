import { describe, expect, it } from "vitest";

import { MIN_RATE_MULTIPLIER, PRODUCER_BY_ID } from "./content.js";
import { stockAt, producerCost, rateAt, repairCost, slowMultiplier } from "./economy.js";
import { Y, ms, seconds, type Millis } from "./numbers.js";
import { applyCommand, createMatch, mustApply } from "./match.js";
import type { ActiveEffect, Command, MatchState, PlayerState } from "./state.js";

const T0 = ms(1_000_000);

// Derived from content so retuning the economy doesn't invalidate these tests.
const HAND = PRODUCER_BY_ID.hand.baseRate;
/** Rate of the ten-hand site most of these tests use. */
const R = 10 * HAND;

function newMatch(): MatchState {
  return createMatch({
    config: { seed: "test-seed", durationMs: seconds(300), scoring: "total_produced" },
    startedAt: T0,
    players: [
      { id: "a", name: "Ada" },
      { id: "b", name: "Bo", isBot: true },
    ],
  });
}

/** Hand a player an economy without making them earn it. */
function withSite(state: MatchState, id: string, producers: PlayerState["producers"]): MatchState {
  return {
    ...state,
    players: { ...state.players, [id]: { ...state.players[id]!, producers } },
  };
}

function withStock(state: MatchState, id: string, stock: number): MatchState {
  return {
    ...state,
    players: { ...state.players, [id]: { ...state.players[id]!, stock: Y.of(stock) } },
  };
}

function at(offsetSeconds: number): Millis {
  return ms(T0 + seconds(offsetSeconds));
}

describe("production integration", () => {
  it("accrues at a constant rate when nothing is happening", () => {
    const s = withSite(newMatch(), "a", { hand: 10 });
    const p = s.players.a!;
    expect(rateAt(p, T0)).toBe(R);
    expect(stockAt(p, at(60))).toBeCloseTo(R * 60, 6);
  });

  it("integrates piecewise across an effect expiry rather than through it", () => {
    const base = withSite(newMatch(), "a", { hand: 10 });
    const slow: ActiveEffect = {
      kind: "slow",
      id: "e1",
      source: "b",
      label: "Blight",
      multiplier: 0.5,
      startedAt: T0,
      expiresAt: at(30),
    };
    const p = { ...base.players.a!, effects: [slow] };

    // 30s at half rate, then 30s clean.
    expect(stockAt(p, at(60))).toBeCloseTo(R * 0.5 * 30 + R * 30, 6);
    expect(stockAt(p, at(10))).toBeCloseTo(R * 0.5 * 10, 6);
  });
});

describe("attack vs defense", () => {
  it("fully blocks when the shield pool covers the attack's power", () => {
    let state = withStock(withSite(newMatch(), "b", { hand: 20 }), "a", 1e12);
    state = withStock(state, "b", 1e6);
    // Fence absorbs 200; Blight has power 110.
    state = mustApply(state, { type: "defend", player: "b", defense: "fence" }, T0);
    const res = applyCommand(state, { type: "attack", player: "a", target: "b", attack: "disease" }, T0);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.entries[0]!.text).toContain("fully blocked");
    expect(res.state.players.b!.effects.some((e) => e.kind === "slow")).toBe(false);
  });

  it("breaks units of the target's best producer, permanently", () => {
    let state = withStock(withSite(newMatch(), "b", { hand: 20, hauler: 12 }), "a", 1e12);
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "rot" }, T0);

    const b = state.players.b!;
    expect(b.broken.hauler ?? 0).toBeGreaterThan(0); // its biggest earner
    expect(b.broken.hand ?? 0).toBe(0);
    // Still owned, just not working — and still broken much later.
    expect(b.producers.hauler).toBe(12);
    expect(rateAt(b, at(600))).toBeLessThan(rateAt({ ...b, broken: {} }, at(600)));
  });
});

describe("no knockouts", () => {
  it("floors the combined slow multiplier however much sabotage stacks", () => {
    const base = withSite(newMatch(), "a", { hand: 10 });
    const slows: ActiveEffect[] = Array.from({ length: 12 }, (_, i) => ({
      kind: "slow",
      id: `e${i}`,
      source: "b",
      label: "Blight",
      multiplier: 0.25,
      startedAt: T0,
      expiresAt: at(600),
    }));
    const p = { ...base.players.a!, effects: slows };
    expect(slowMultiplier(p, T0)).toBe(MIN_RATE_MULTIPLIER);
    expect(rateAt(p, T0)).toBeCloseTo(R * MIN_RATE_MULTIPLIER, 6);
  });

  it("lets repair buy the rate back, for less than rebuilding", () => {
    let state = withStock(withStock(withSite(newMatch(), "b", { hand: 20 }), "a", 1e12), "b", 1e9);
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "disease" }, T0);
    const damaged = state.players.b!;
    const broken = damaged.broken.hand!;
    expect(broken).toBeGreaterThan(0);

    const bill = repairCost(damaged, "hand");
    expect(bill).toBeLessThan(producerCost("hand", 20 - broken, broken));

    const before = damaged.stock;
    state = mustApply(state, { type: "repair", player: "b", producer: "hand" }, T0);
    const fixed = state.players.b!;
    expect(fixed.broken.hand).toBe(0);
    expect(rateAt(fixed, T0)).toBeCloseTo(20 * HAND, 6);
    expect(before - fixed.stock).toBeCloseTo(bill, 6);
  });
});

describe("commands", () => {
  it("rejects everything once the clock hits zero", () => {
    const res = applyCommand(newMatch(), { type: "click", player: "a", count: 1 }, at(300));
    expect(res).toEqual({ ok: false, reason: "Match is over." });
  });
});

describe("determinism", () => {
  it("replays to identical state from the same seed and command sequence", () => {
    const script: [Command, number][] = [
      [{ type: "click", player: "a", count: 25 }, 0],
      [{ type: "buy_producer", player: "a", producer: "patch", qty: 1 }, 1],
      [{ type: "click", player: "a", count: 25 }, 2],
      [{ type: "attack", player: "a", target: "b", attack: "vermin" }, 40],
      [{ type: "defend", player: "a", defense: "ward" }, 41],
    ];
    const run = () => {
      let state = withStock(newMatch(), "a", 5_000);
      for (const [cmd, offset] of script) state = mustApply(state, cmd, at(offset));
      return state;
    };
    expect(JSON.stringify(run())).toEqual(JSON.stringify(run()));
  });
});
