import { solo } from "@clickers/sim";

import { PRODUCER_MARKS } from "./render/art.js";
import type { Art } from "./render/pixel.js";

// Counted off upgrade effects, not the `<id>_x2a` naming, so renaming a tier upgrade cannot silently stop the art changing.
export function producerMark(farm: solo.SiteState, id: solo.SoloProducerId): number {
  let level = 0;
  for (const upgrade of solo.SOLO_UPGRADES) {
    const effect = upgrade.effect;
    if (effect.kind !== "producer_mult" || effect.producer !== id) continue;
    if (farm.upgrades.includes(upgrade.id)) level++;
  }
  return level;
}

export function producerArt(farm: solo.SiteState, id: solo.SoloProducerId): Art {
  const marks = PRODUCER_MARKS[id];
  return marks[Math.min(marks.length - 1, producerMark(farm, id))] ?? marks[0];
}

/** The mark *after* the purchase; producer-less upgrades get no thumbnail. */
export function upgradePreview(
  farm: solo.SiteState,
  upgrade: solo.SoloUpgrade,
): Art | undefined {
  const effect = upgrade.effect;
  if (effect.kind !== "producer_mult") return undefined;
  const marks = PRODUCER_MARKS[effect.producer];
  return marks[Math.min(marks.length - 1, producerMark(farm, effect.producer) + 1)];
}
