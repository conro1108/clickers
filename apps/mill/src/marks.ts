import { UPGRADES, solo, type ProducerId, type Upgrade } from "@mill/sim";

import { PRODUCER_MARKS } from "./render/art.js";
import type { Art } from "./render/pixel.js";

/**
 * The two games' upgrade tables are different lists of the same shape, and the
 * art doesn't care which one it was asked about — a Kennel Hand with two tiers
 * on it looks the same whether the tiers were bought in a match or over three
 * days. So the mark rules are written once against the shape.
 */
interface TieredUpgrade {
  id: string;
  effect: { kind: string; producer?: string };
}

/**
 * How many of a producer's own multiplier upgrades you've bought — which is
 * which mark of the thing is standing out in the field.
 *
 * Counted off the upgrade table's effects rather than the `<id>_x2a` naming
 * convention, so renaming or adding a tier upgrade doesn't quietly stop the art
 * from changing.
 */
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

export function producerMark(mill: solo.MillState, id: solo.SoloProducerId): number {
  return markOf(mill.upgrades, solo.SOLO_UPGRADES, id);
}

/** The art for a producer as it currently stands on this mill. */
export function producerArt(mill: solo.MillState, id: solo.SoloProducerId): Art {
  return artAt(id, producerMark(mill, id));
}

/**
 * What a tier upgrade turns its producer into — the mark *after* the purchase,
 * not the one you already have. That's the pitch: the row is showing you a
 * van with an exhaust stack you don't own yet.
 *
 * Upgrades that aren't tied to one producer (global multipliers, whistle upgrades)
 * have nothing to show and get no thumbnail.
 */
export function upgradePreview(
  mill: solo.MillState,
  upgrade: solo.SoloUpgrade,
): Art | undefined {
  const effect = upgrade.effect;
  if (effect.kind !== "producer_mult") return undefined;
  return artAt(effect.producer, producerMark(mill, effect.producer) + 1);
}

// --- The same three, for the head-to-head prototype ------------------------
//
// Its producers are the first six of the solo ladder under the same ids, so
// they already have art; only the upgrade table it counts against differs.

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
