/**
 * The seam between the engine and a game.
 *
 * Everything in this package is written in neutral vocabulary — `patch`,
 * `hauler`, `condition`, `click` — because both games are the same simulation
 * with different words painted on. The engine owns the ids, the numbers, the
 * cost curves and the balance; a theme owns nothing but what things are called.
 *
 * A theme is reached through the "@clickers/theme" module alias, which each app
 * points at its own `src/theme.ts` in vite.config.ts and tsconfig.json. That
 * indirection is deliberate: it lets `PRODUCER_BY_ID[id].name` keep working
 * everywhere — including in log lines the engine writes — without threading a
 * theme argument through every function in the sim.
 *
 * Adding a rung to a ladder is an engine change plus one line in each theme.
 * Retuning a rung is an engine change and nothing else.
 */

import { STRINGS } from "@clickers/theme";

/** Anything a player sees listed and can read a one-liner about. */
export interface Named {
  name: string;
  blurb: string;
}

/**
 * A producer also needs words for being damaged, because a hauler breaks and a
 * hand doesn't. Reads as "2 maimed" and "Patch up" whatever the game calls it.
 */
export interface ProducerNamed extends Named {
  hurt: string;
  mend: string;
}

export interface ThemeStrings {
  producers: Record<string, ProducerNamed>;
  upgrades: Record<string, Named>;
  attacks: Record<string, Named>;
  defenses: Record<string, Named>;
  soloProducers: Record<string, ProducerNamed>;
  soloClickUpgrades: Record<string, Named>;
  soloGlobalUpgrades: Record<string, Named>;
  lands: Record<string, Named>;
  perks: Record<string, Named>;
  /** Weather and its inside-world counterpart. Only ever named, never blurbed. */
  weather: Record<string, { name: string }>;
  /**
   * The three per-rung production upgrades, keyed by producer id: the x2 at ten
   * owned, the x1.5 at fifty, the x2 at a hundred. Their blurbs are generated
   * from the producer's own name, so a theme only supplies the titles.
   */
  soloTierUpgrades: Record<string, readonly [string, string, string]>;
}

export const THEME: ThemeStrings = STRINGS;

/**
 * A content row as the engine writes it: ids, numbers and mechanics, with the
 * words left out for a theme to supply.
 */
export type Shape<T> = Omit<T, "name" | "blurb" | "hurt" | "mend">;

/**
 * Paste a theme's words onto a table of engine ids and numbers.
 *
 * Throws rather than rendering `undefined` at the player: a theme that has
 * fallen behind the engine is a build-time mistake, and this is the only place
 * that can notice it.
 */
export function named<T extends { id: string }, S extends object>(
  rows: readonly T[],
  strings: Record<string, S>,
  what: string,
): readonly (T & S)[] {
  return rows.map((row) => {
    const words = strings[row.id];
    if (!words) throw new Error(`theme has no ${what} strings for "${row.id}"`);
    return { ...row, ...words };
  });
}
