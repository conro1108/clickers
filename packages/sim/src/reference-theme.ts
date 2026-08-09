/**
 * The theme the engine uses when there is no game attached — `npm test` and
 * `tsc -p packages/sim`.
 *
 * It answers every id with its own name, so it can never fall behind the
 * content tables and no test ever has to be updated because a producer got
 * renamed in one of the games. Tests that care about wording are the apps'
 * business; tests in here care about numbers.
 */

import type { Named, ProducerNamed, ThemeStrings } from "./theme.js";

const producerWords = new Proxy({} as Record<string, ProducerNamed>, {
  get: (_, id: string) => ({ name: id, blurb: id, hurt: "damaged", mend: "Repair" }),
});

const words = new Proxy({} as Record<string, Named>, {
  get: (_, id: string) => ({ name: id, blurb: id }),
});

const weatherWords = new Proxy({} as Record<string, { name: string }>, {
  get: (_, id: string) => ({ name: id }),
});

const tierWords = new Proxy({} as Record<string, readonly [string, string, string]>, {
  get: (_, id: string) => [`${id} I`, `${id} II`, `${id} III`] as const,
});

export const STRINGS: ThemeStrings = {
  producers: producerWords,
  upgrades: words,
  attacks: words,
  defenses: words,
  soloProducers: producerWords,
  soloClickUpgrades: words,
  soloGlobalUpgrades: words,
  lands: words,
  perks: words,
  weather: weatherWords,
  soloTierUpgrades: tierWords,
};
