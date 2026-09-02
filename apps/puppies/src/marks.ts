import { UPGRADES, solo, type ProducerId, type Upgrade } from "@clickers/sim";

import { PRODUCER_MARKS } from "./render/art.js";
import type { Art } from "./render/pixel.js";

// Both upgrade tables share this shape, so the mark rules are written once against it.
interface TieredUpgrade {
  id: string;
  effect: { kind: string; producer?: string };
}

// Counted off upgrade effects, not the `<id>_x2a` naming, so renaming a tier upgrade cannot silently stop the art changing.
function markOf(owned: readonly string[], table: readonly TieredUpgrade[], id: string): number {
  let level = 0;
  for (const upgrade of table) {
    if (upgrade.effect.kind !== "producer_mult" || upgrade.effect.producer !== id) continue;
    if (owned.includes(upgrade.id)) level++;
  }
  return level;
}

function artAt(id: keyof typeof PRODUCER_MARKS, level: number): Art {
  const marks = PRODUCER_MARKS[id];
  return marks[Math.min(marks.length - 1, level)] ?? marks[0];
}

export function producerMark(mill: solo.SiteState, id: solo.SoloProducerId): number {
  return markOf(mill.upgrades, solo.SOLO_UPGRADES, id);
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

// --- Same three for the head-to-head mode: same ids, different upgrade table ---

export function matchMark(owned: readonly string[], id: ProducerId): number {
  return markOf(owned, UPGRADES, id);
}

export function matchProducerArt(owned: readonly string[], id: ProducerId): Art {
  return artAt(id, matchMark(owned, id));
}

export function matchUpgradePreview(owned: readonly string[], upgrade: Upgrade): Art | undefined {
  const effect = upgrade.effect;
  if (effect.kind !== "producer_mult") return undefined;
  return artAt(effect.producer, matchMark(owned, effect.producer) + 1);
}
