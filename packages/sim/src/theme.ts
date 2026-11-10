// The seam between engine and game: "@clickers/theme" is aliased per app to its src/theme.ts
// (vite.config.ts, tsconfig.json). See CLAUDE.md for how theming works.

import { STRINGS } from "@clickers/theme";

export interface Named {
  name: string;
  blurb: string;
}

/** `hurt`/`mend` read as "2 maimed" / "Patch up". */
export interface ProducerNamed extends Named {
  hurt: string;
  mend: string;
  /** For "{plural} produce twice as much." Only needed where name + "s" is wrong. */
  plural?: string;
}

/** The engine's own nouns, where a game has a better word. Each falls back to the neutral one. */
export interface Terms {
  /** "+3 {heirloom}." */
  heirloom?: string;
  /** "put the {condition} right." */
  condition?: string;
  /** "handed the {site} down." */
  site?: string;
  /** The log line when the first of the top outside rung starts running. */
  omen?: string;
  /** The log line as each world opens, by world id. */
  arrivals?: Record<string, string>;
}

export interface ThemeStrings {
  soloProducers: Record<string, ProducerNamed>;
  soloClickUpgrades: Record<string, Named>;
  soloGlobalUpgrades: Record<string, Named>;
  lands: Record<string, Named>;
  perks: Record<string, Named>;
  weather: Record<string, { name: string }>;
  /** Titles for the three per-rung upgrades (at 10/50/100 owned); blurbs are generated. */
  soloTierUpgrades: Record<string, readonly [string, string, string]>;
  terms?: Terms;
}

export const THEME: ThemeStrings = STRINGS;

export const TERMS: Required<Omit<Terms, "omen" | "arrivals">> = {
  heirloom: THEME.terms?.heirloom ?? "Heirloom",
  condition: THEME.terms?.condition ?? "condition",
  site: THEME.terms?.site ?? "site",
};

export type Shape<T> = Omit<T, "name" | "blurb" | "hurt" | "mend">;

/** Paste a theme's words onto engine rows. Throws on a missing id rather than rendering `undefined`. */
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
