import { describe, expect, it } from "vitest";

import { shieldPool } from "./combat.js";
import {
  ATTACK_BY_ID,
  DEFENSE_BY_ID,
  MAX_BROKEN_SHARE,
  MIN_RATE_MULTIPLIER,
  PRODUCER_BY_ID,
} from "./content.js";
import {
  checkpoint,
  stockAt,
  producerCost,
  rateAt,
  repairCost,
  slowMultiplier,
} from "./economy.js";
import { Y, ms, seconds, type Millis } from "./numbers.js";
import {
  CLICK_OVERFLOW,
  applyCommand,
  createMatch,
  mustApply,
  opponentView,
  standings,
  clicksReady,
} from "./match.js";
import type { ActiveEffect, Command, MatchState, PlayerState } from "./state.js";

const T0 = ms(1_000_000);

// Derived from content so retuning the economy doesn't invalidate these tests.
const HAND = PRODUCER_BY_ID.hand.baseRate;
const VAN = PRODUCER_BY_ID.hauler.baseRate;
/** Rate of the ten-hand site most of these tests use. */
const R = 10 * HAND;

function newMatch(scoring: "total_produced" | "on_hand" = "total_produced"): MatchState {
  return createMatch({
    config: { seed: "test-seed", durationMs: seconds(300), scoring },
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
    // Mid-effect the slow is still fully applied.
    expect(stockAt(p, at(10))).toBeCloseTo(R * 0.5 * 10, 6);
  });

  it("is unchanged by checkpointing partway through", () => {
    const base = withSite(newMatch(), "a", { hand: 10, patch: 25 });
    const slow: ActiveEffect = {
      kind: "slow",
      id: "e1",
      source: "b",
      label: "Blight",
      multiplier: 0.4,
      startedAt: T0,
      expiresAt: at(37),
    };
    const p: PlayerState = { ...base.players.a!, effects: [slow] };

    const direct = stockAt(p, at(120));
    const viaCheckpoints = [12, 37, 38, 90].reduce<PlayerState>(
      (acc, s) => checkpoint(acc, at(s)),
      p,
    );
    expect(stockAt(viaCheckpoints, at(120))).toBeCloseTo(direct, 6);
  });

  it("drops broken units from the rate and keeps them dropped", () => {
    const base = withSite(newMatch(), "a", { hand: 10, hauler: 2 });
    const p: PlayerState = { ...base.players.a!, broken: { hauler: 2 } };
    expect(rateAt(p, at(10))).toBe(R);
    // Nothing times out — a hundred seconds later it's still down.
    expect(rateAt(p, at(100))).toBe(R);
    expect(rateAt({ ...p, broken: {} }, at(10))).toBe(R + 2 * VAN);
  });
});

describe("costs", () => {
  it("charges the same for a bulk buy as for the same units one at a time", () => {
    const bulk = producerCost("patch", 0, 10);
    let piecemeal = 0;
    for (let i = 0; i < 10; i++) piecemeal += producerCost("patch", i, 1);
    // Bulk rounds once, piecemeal rounds ten times — allow the rounding drift.
    expect(Math.abs(bulk - piecemeal)).toBeLessThanOrEqual(10);
  });

  it("makes repeated sabotage progressively more expensive", () => {
    const s = withSite(newMatch(), "a", { hand: 10 });
    let state: MatchState = {
      ...s,
      players: { ...s.players, a: { ...s.players.a!, stock: Y.of(1e9) } },
    };
    const before = state.players.a!.stock;
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "vermin" }, T0);
    const firstCost = before - state.players.a!.stock;
    const mid = state.players.a!.stock;
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "vermin" }, T0);
    const secondCost = mid - state.players.a!.stock;
    expect(secondCost).toBeGreaterThan(firstCost);
  });
});

describe("attack vs defense", () => {
  function attacker(state: MatchState): MatchState {
    return {
      ...state,
      players: { ...state.players, a: { ...state.players.a!, stock: Y.of(1e12) } },
    };
  }

  it("fully blocks when the shield pool covers the attack's power", () => {
    let state = attacker(withSite(newMatch(), "b", { hand: 20 }));
    // Fence absorbs 200; Blight has power 110.
    state = { ...state, players: { ...state.players, b: { ...state.players.b!, stock: Y.of(1e6) } } };
    state = mustApply(state, { type: "defend", player: "b", defense: "fence" }, T0);
    const res = applyCommand(state, { type: "attack", player: "a", target: "b", attack: "disease" }, T0);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.entries[0]!.text).toContain("fully blocked");
    expect(res.state.players.b!.effects.some((e) => e.kind === "slow")).toBe(false);
  });

  it("scales the effect down instead of negating it when the shield is too small", () => {
    let state = attacker(withSite(newMatch(), "b", { hand: 20 }));
    state = { ...state, players: { ...state.players, b: { ...state.players.b!, stock: Y.of(1e6) } } };
    // Scarecrow absorbs 60 vs Drought's power 260 -> ~23% mitigated.
    state = mustApply(state, { type: "defend", player: "b", defense: "ward" }, T0);
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "swelter" }, T0);

    const slow = state.players.b!.effects.find((e) => e.kind === "slow");
    expect(slow).toBeDefined();
    if (slow?.kind !== "slow") return;
    const droughtEffect = ATTACK_BY_ID.swelter.effect;
    if (droughtEffect.kind !== "slow") throw new Error("drought should be a slow");
    const potency = 1 - 60 / 260;
    expect(slow.multiplier).toBeCloseTo(1 - droughtEffect.cut * potency, 6);
  });

  it("spends shield power on what it absorbs, so it can be worn down", () => {
    let state = attacker(withSite(newMatch(), "b", { hand: 20 }));
    state = { ...state, players: { ...state.players, b: { ...state.players.b!, stock: Y.of(1e6) } } };
    state = mustApply(state, { type: "defend", player: "b", defense: "fence" }, T0);
    expect(shieldPool(state.players.b!, T0)).toBe(DEFENSE_BY_ID.fence.power);

    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "disease" }, T0);
    expect(shieldPool(state.players.b!, T0)).toBe(
      DEFENSE_BY_ID.fence.power - ATTACK_BY_ID.disease.power,
    );

    // Fence had 200 against Blight's 110, so the first one was absorbed whole.
    expect(state.players.b!.broken.hand ?? 0).toBe(0);

    // Two more and the pool is dry, so damage starts landing.
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "disease" }, at(1));
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "disease" }, at(2));
    expect(shieldPool(state.players.b!, at(2))).toBe(0);
    expect(state.players.b!.broken.hand ?? 0).toBeGreaterThan(0);
  });

  it("breaks units of the target's best producer, permanently", () => {
    let state = attacker(withSite(newMatch(), "b", { hand: 20, hauler: 12 }));
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "rot" }, T0);

    const b = state.players.b!;
    expect(b.broken.hauler ?? 0).toBeGreaterThan(0); // its biggest earner
    expect(b.broken.hand ?? 0).toBe(0);
    // Still owned, just not working — and still broken much later.
    expect(b.producers.hauler).toBe(12);
    expect(rateAt(b, at(600))).toBeLessThan(rateAt({ ...b, broken: {} }, at(600)));
  });

  it("scales breakage down rather than negating it when partly shielded", () => {
    // Big site so the difference survives rounding to whole units.
    const build = (defend: boolean) => {
      let state = attacker(withSite(newMatch(), "b", { hand: 20, hauler: 60 }));
      state = { ...state, players: { ...state.players, b: { ...state.players.b!, stock: Y.of(1e6) } } };
      if (defend) state = mustApply(state, { type: "defend", player: "b", defense: "fence" }, T0);
      state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "rot" }, T0);
      return state.players.b!.broken.hauler ?? 0;
    };
    const shielded = build(true);
    const bare = build(false);
    expect(shielded).toBeGreaterThan(0); // scaled down, not negated
    expect(shielded).toBeLessThan(bare);
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

  it("caps how much of a producer type one hit can take out", () => {
    let state = withSite(newMatch(), "b", { hand: 100 });
    state = {
      ...state,
      players: { ...state.players, a: { ...state.players.a!, stock: Y.of(1e12) } },
    };
    // Locusts hit everything; fire a pile of them and the cap should hold.
    for (let i = 0; i < 8; i++) {
      state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "sweep" }, at(i));
    }
    const b = state.players.b!;
    expect(b.broken.hand!).toBeLessThanOrEqual(Math.floor(100 * MAX_BROKEN_SHARE));
    expect(rateAt(b, at(20))).toBeGreaterThan(0); // never knocked out
  });

  it("lets repair buy the rate back, for less than rebuilding", () => {
    let state = withSite(newMatch(), "b", { hand: 20 });
    state = {
      ...state,
      players: {
        ...state.players,
        a: { ...state.players.a!, stock: Y.of(1e12) },
        b: { ...state.players.b!, stock: Y.of(1e9) },
      },
    };
    state = mustApply(state, { type: "attack", player: "a", target: "b", attack: "disease" }, T0);
    const damaged = state.players.b!;
    const broken = damaged.broken.hand!;
    expect(broken).toBeGreaterThan(0);

    const bill = repairCost(damaged, "hand");
    const rebuild = producerCost("hand", 20 - broken, broken);
    expect(bill).toBeLessThan(rebuild);

    const before = damaged.stock;
    state = mustApply(state, { type: "repair", player: "b", producer: "hand" }, T0);
    const fixed = state.players.b!;
    expect(fixed.broken.hand).toBe(0);
    expect(rateAt(fixed, T0)).toBeCloseTo(20 * HAND, 6);
    expect(before - fixed.stock).toBeCloseTo(bill, 6);
  });
});

describe("commands", () => {
  it("rejects buys you can't afford", () => {
    const res = applyCommand(newMatch(), { type: "buy_producer", player: "a", producer: "patch", qty: 1 }, T0);
    expect(res).toEqual({ ok: false, reason: "Not enough stock." });
  });

  it("rejects sabotaging yourself", () => {
    const res = applyCommand(newMatch(), { type: "attack", player: "a", target: "a", attack: "vermin" }, T0);
    expect(res.ok).toBe(false);
  });

  it("rejects everything once the clock hits zero", () => {
    const res = applyCommand(newMatch(), { type: "click", player: "a", count: 1 }, at(300));
    expect(res).toEqual({ ok: false, reason: "Match is over." });
  });

  it("clamps a batched click flush", () => {
    const res = applyCommand(newMatch(), { type: "click", player: "a", count: 10_000 }, T0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Clamped to MAX_CLICKS_PER_FLUSH (25), of which the bucket covers its
    // CLICK_BURST (15) at full price and the rest at CLICK_OVERFLOW.
    expect(res.state.players.a!.stock).toBe(15 + 10 * CLICK_OVERFLOW);
  });

  /**
   * The click bucket, which is the only thing standing between this game and
   * an autoclicker. Measured before it existed: 20 taps a second finished a
   * three-minute match 434x ahead of one tap a second.
   */
  it("pays full price for clicking at a rate a person can manage", () => {
    // Five a second for twenty seconds, in the 500ms batches the client sends.
    let state = newMatch();
    for (let i = 1; i <= 40; i++) {
      state = mustApply(state, { type: "click", player: "a", count: 2 }, at(i * 0.5));
    }
    // Nothing lost: a thumb does 3-4/s flat out and never touches the ceiling.
    expect(state.players.a!.stock).toBe(80);
  });

  it("stops paying full price for clicking faster than hands go", () => {
    let state = newMatch();
    // Twenty a second over the same twenty seconds — an autoclicker, or a very
    // determined person. Four times the taps.
    for (let i = 1; i <= 40; i++) {
      state = mustApply(state, { type: "click", player: "a", count: 10 }, at(i * 0.5));
    }
    const macro = state.players.a!.stock;
    // Still worth something — a click is never refused, it just stops being
    // worth a whole click, so mashing degrades instead of breaking.
    expect(macro).toBeGreaterThan(80);
    // But nowhere near the 4x it used to buy, and the gap keeps closing the
    // longer the match runs: the bucket refills at a fixed rate and the
    // overflow is all that scales.
    expect(macro).toBeLessThan(80 * 2.5);
  });

  it("refills the bucket while you aren't clicking", () => {
    let state = newMatch();
    const drain = applyCommand(state, { type: "click", player: "a", count: 25 }, T0);
    expect(drain.ok).toBe(true);
    if (!drain.ok) return;
    // Three seconds of not touching it puts CLICK_RATE x 3 back.
    expect(clicksReady(drain.state.players.a!, at(3))).toBe(15);
  });

  it("gates upgrades behind their producer requirement", () => {
    let state = newMatch();
    state = { ...state, players: { ...state.players, a: { ...state.players.a!, stock: Y.of(1e9) } } };
    expect(applyCommand(state, { type: "buy_upgrade", player: "a", upgrade: "mult_patch" }, T0).ok).toBe(false);

    state = withSite(state, "a", { patch: 10 });
    expect(applyCommand(state, { type: "buy_upgrade", player: "a", upgrade: "mult_patch" }, T0).ok).toBe(true);
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
      let state = { ...newMatch() };
      state = { ...state, players: { ...state.players, a: { ...state.players.a!, stock: Y.of(5_000) } } };
      for (const [cmd, offset] of script) state = mustApply(state, cmd, at(offset));
      return state;
    };
    expect(JSON.stringify(run())).toEqual(JSON.stringify(run()));
  });
});

describe("visibility", () => {
  it("exposes only an opponent's count and rate", () => {
    let state = withSite(newMatch(), "b", { hand: 4 });
    state = mustApply(state, { type: "click", player: "b", count: 5 }, T0);
    const view = opponentView(state, "b", at(10));
    expect(Object.keys(view).sort()).toEqual(["count", "id", "name", "rate"]);
  });

  it("ranks standings by the configured scoring rule", () => {
    let state = withSite(newMatch("on_hand"), "a", { hand: 10 });
    state = {
      ...state,
      players: { ...state.players, b: { ...state.players.b!, stock: Y.of(10_000) } },
    };
    expect(standings(state, at(10))[0]!.player.id).toBe("b");
  });

  it("stops the clock at match end", () => {
    const state = withSite(newMatch(), "a", { hand: 10 });
    const final = standings(state, at(10_000))[0]!.score;
    expect(final).toBeCloseTo(R * 300, 6);
  });
});
