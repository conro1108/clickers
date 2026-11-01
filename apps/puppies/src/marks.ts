import { solo } from "@clickers/sim";

import { PRODUCER_MARKS } from "./render/art.js";
import type { Art } from "./render/pixel.js";

function artAt(id: keyof typeof PRODUCER_MARKS, level: number): Art {
  const marks = PRODUCER_MARKS[id];
  return marks[Math.min(marks.length - 1, level)] ?? marks[0];
}

// Counted off upgrade effects, not the `<id>_x2a` naming, so renaming a tier upgrade cannot silently stop the art changing.
export function producerMark(mill: solo.SiteState, id: solo.SoloProducerId): number {
  let level = 0;
  for (const upgrade of solo.SOLO_UPGRADES) {
    const effect = upgrade.effect;
    if (effect.kind !== "producer_mult" || effect.producer !== id) continue;
    if (mill.upgrades.includes(upgrade.id)) level++;
  }
  return level;
}

export function producerArt(mill: solo.SiteState, id: solo.SoloProducerId): Art {
  return artAt(id, producerMark(mill, id));
}

/** The mark *after* the purchase; producer-less upgrades get no thumbnail. */
export function upgradePreview(
  mill: solo.SiteState,
  upgrade: solo.SoloUpgrade,
): Art | undefined {
  const effect = upgrade.effect;
  if (effect.kind !== "producer_mult") return undefined;
  return artAt(effect.producer, producerMark(mill, effect.producer) + 1);
}
