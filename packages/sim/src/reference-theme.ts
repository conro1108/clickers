// Theme used when no game is attached (tests, tsc -p packages/sim): every id names itself.

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
