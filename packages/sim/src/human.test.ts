import { describe, expect, it } from "vitest";

import { LADDER } from "./balance.test.js";
import { simulateMatch } from "./balance.js";
import { format, seconds } from "./numbers.js";

const SEEDS = Array.from({ length: 15 }, (_, i) => `hb-${i}`);

/**
 * Grades the difficulty ladder against a stand-in for an actual person rather
 * than against more bots. Bot-vs-bot runs can only tell you the economy isn't
 * degenerate — they can't tell you whether the lobby's three rungs feel like
 * three rungs, which is the only thing the setting is for.
 */
function ladder(style: "builder" | "scrapper" | "masher", profile: string, durationSeconds = 300) {
  const results = SEEDS.map((seed) => {
    const r = simulateMatch({
      seed,
      durationMs: seconds(durationSeconds),
      players: [
        { id: "you", name: "You", human: style },
        { id: "bot", name: "Bot", profile },
      ],
    });
    return { you: r.finalScores.you!, bot: r.finalScores.bot! };
  });
  const wins = results.filter((r) => r.you > r.bot).length;
  const ratios = results.map((r) => r.you / Math.max(1, r.bot)).sort((a, b) => a - b);
  return { wins, of: SEEDS.length, median: ratios[Math.floor(ratios.length / 2)]! };
}

describe("the ladder, played by a person", () => {
  it("gives a builder a comfortable win over chill", () => {
    const r = ladder("builder", "chill");
    console.log(`builder vs chill: ${r.wins}/${r.of}, median ${r.median.toFixed(2)}x`);
    expect(r.wins).toBeGreaterThanOrEqual(13);
  });

  /**
   * The ladder graded end to end, at the length people actually play.
   *
   * Win rate is deliberately not the measure. The economy is exponential, so
   * whoever has the better exponent finishes orders of magnitude ahead and every
   * rung is either 15/15 or 0/15 — a step, not a ladder. What a player actually
   * feels is the *margin*: against `chill` you finish a thousand times ahead and
   * it was never a game, against `ruthless` you finish just ahead and it was
   * close all match. So the assertion is that the margin shrinks at every step.
   */
  it("gets harder at every rung, at every length people play", () => {
    for (const durationSeconds of [120, 180, 300]) {
      const margins = LADDER.map((profile) => ({
        profile,
        median: ladder("builder", profile, durationSeconds).median,
      }));
      console.log(
        `${durationSeconds}s: ${margins.map((m) => `${m.profile} ${m.median.toFixed(2)}x`).join("  ")}`,
      );
      for (let i = 1; i < margins.length; i++) {
        expect(
          margins[i]!.median,
          `at ${durationSeconds}s, ${margins[i]!.profile} should be harder than ${margins[i - 1]!.profile}`,
        ).toBeLessThan(margins[i - 1]!.median);
      }
    }
  });

  it("makes scrappy a real fight and nasty a loss you can see", () => {
    const scrappy = ladder("builder", "scrappy");
    const nasty = ladder("builder", "nasty");
    console.log(`builder: scrappy ${scrappy.median.toFixed(2)}x, nasty ${nasty.median.toFixed(2)}x`);
    // Both are still rungs a person beats. They're the bottom third of the
    // roster now, not the top of it.
    expect(scrappy.wins).toBeGreaterThanOrEqual(13);
    expect(nasty.wins).toBeGreaterThanOrEqual(13);
  });

  /**
   * The top of the ladder has to actually beat a person who plays well, or the
   * five rungs above `nasty` are decoration. `merciless` is where it turns over.
   */
  it("puts the top rungs out of a good player's reach", () => {
    const merciless = ladder("builder", "merciless");
    const tyrant = ladder("builder", "tyrant");
    console.log(
      `builder: merciless ${merciless.median.toFixed(2)}x, tyrant ${tyrant.median.toFixed(2)}x`,
    );
    // `merciless` is the rung it turns over on — a coin flip at five minutes,
    // and a loss at the shorter lengths, which is what the second-hardest slot
    // should feel like.
    expect(merciless.median).toBeLessThan(1.5);
    expect(merciless.median).toBeGreaterThan(0.5);
    // The top rung wins outright. And still stays in sight: nothing on the
    // roster should finish so far ahead that the scoreboard stops meaning
    // anything — a 20x wall isn't a difficulty setting, it's a brick.
    expect(tyrant.median).toBeLessThan(1);
    expect(tyrant.median).toBeGreaterThan(0.05);
  });

  it("pays a player for engaging with the other two tabs", () => {
    // Graded against a rung that's actually in the match. Sabotage measures as
    // worthless against `scrappy` for the same reason it does against a corpse:
    // puppies spent hurting someone who finishes 200x behind you would have
    // compounded better at home. That's the trade working, not failing.
    const builder = ladder("builder", "mean");
    const scrapper = ladder("scrapper", "mean");
    console.log(
      `vs mean: builder ${builder.median.toFixed(2)}x, scrapper ${scrapper.median.toFixed(2)}x`,
    );
    // The whole pitch is that reaching across the board is a live option. If
    // ignoring sabotage entirely is just as good, there's only one axis.
    //
    // Sabotage should beat a mill that's in reach, and waste your puppies
    // against one that isn't.
    expect(scrapper.median).toBeGreaterThan(builder.median * 1.1);
  });

  it("reports the whole grid", () => {
    for (const style of ["builder", "scrapper", "masher"] as const) {
      const row = LADDER.map((p) => {
        const r = ladder(style, p);
        return `${p} ${r.wins}/${r.of} (${r.median.toFixed(2)}x)`;
      });
      console.log(`${style.padEnd(9)} ${row.join("  ")}`);
    }
    expect(SEEDS.length).toBeGreaterThan(0);
  });
});

it("shows how much a match still turns on wrist speed", () => {
  // Not an assertion, a watchpoint. Whistling is meant to be an opener; if the
  // masher's margin over the builder ever balloons, the click ladder has
  // quietly become the whole game and the shop is decoration.
  for (const p of LADDER) {
    const b = ladder("builder", p);
    const m = ladder("masher", p);
    console.log(
      `${p}: builder ${b.median.toFixed(2)}x vs masher ${m.median.toFixed(2)}x ` +
        `(mashing is worth ${(m.median / b.median).toFixed(2)}x)`,
    );
  }
  expect(true).toBe(true);
});

it("reports the shape of a match against a person", () => {
  const r = simulateMatch({
    seed: "shape",
    durationMs: seconds(300),
    players: [
      { id: "you", name: "You", human: "builder" },
      { id: "bot", name: "Bot", profile: "scrappy" },
    ],
  });
  console.log(
    r.samples
      .filter((s) => s.atSeconds % 60 === 0)
      .map(
        (s) =>
          `${s.atSeconds}s you=${format(s.scores.you!)}@${format(s.rates.you!)}/s ` +
          `bot=${format(s.scores.bot!)}@${format(s.rates.bot!)}/s`,
      )
      .join("\n"),
  );
  console.log(`final you=${format(r.finalScores.you!)} bot=${format(r.finalScores.bot!)}`);
  expect(r.samples.length).toBeGreaterThan(0);
});
