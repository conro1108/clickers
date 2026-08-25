import { describe, expect, it } from "vitest";

import { simulateMatch } from "./balance.js";
import { seconds } from "./numbers.js";

function fiveMinuteMatch(seed: string) {
  return simulateMatch({
    seed,
    durationMs: seconds(300),
    players: [
      { id: "p1", name: "P1", profile: "scrappy" },
      { id: "p2", name: "P2", profile: "nasty" },
    ],
  });
}

describe("match pacing", () => {
  it("keeps both sites growing for the whole match", () => {
    const result = fiveMinuteMatch("s1");
    const last = result.samples.at(-1)!;
    for (const id of ["p1", "p2"]) {
      expect(result.finalScores[id]!).toBeGreaterThan(0);
      expect(Number.isFinite(result.finalScores[id]!)).toBe(true);
      // Nobody flatlined at the buzzer — that would be a knockout.
      expect(last.rates[id]!).toBeGreaterThan(0);
    }
  });

  it("actually exercises sabotage and defense", () => {
    const result = fiveMinuteMatch("s2");
    expect(result.attacksLanded + result.attacksBlocked).toBeGreaterThan(0);
    expect(result.defensesBought).toBeGreaterThan(0);
  });
});
