import {
  MAX_BROKEN_SHARE,
  PRODUCERS,
  type Attack,
  type Defense,
  type ProducerId,
} from "./content.js";
import { isActive, producerRate, workingCount } from "./economy.js";
import { ms, type Millis } from "./numbers.js";
import type { Rng } from "./rng.js";
import type { ActiveEffect, PlayerState } from "./state.js";

export interface AttackOutcome {
  /** 0 = landed clean, 1 = absorbed entirely. */
  mitigation: number;
  blocked: boolean;
  absorbed: number;
  broke: Partial<Record<ProducerId, number>>;
  brokeTotal: number;
  applied?: ActiveEffect;
}

function activeShields(p: PlayerState, t: Millis) {
  return p.effects
    .filter((e): e is Extract<ActiveEffect, { kind: "shield" }> => e.kind === "shield" && isActive(e, t))
    .sort((a, b) => a.startedAt - b.startedAt);
}

export function shieldPool(p: PlayerState, t: Millis): number {
  return activeShields(p, t).reduce((sum, s) => sum + s.power, 0);
}

// oldest shield first
function drainShields(p: PlayerState, t: Millis, amount: number): PlayerState {
  let left = amount;
  const effects = p.effects.map((e) => {
    if (left <= 0 || e.kind !== "shield" || !isActive(e, t)) return e;
    const taken = Math.min(e.power, left);
    left -= taken;
    return { ...e, power: e.power - taken };
  });
  return { ...p, effects: effects.filter((e) => e.kind !== "shield" || e.power > 0) };
}

function targetsFor(p: PlayerState, scope: "best" | "cheapest" | "all"): ProducerId[] {
  const live = PRODUCERS.filter((prod) => workingCount(p, prod.id) > 0);
  if (live.length === 0) return [];
  if (scope === "all") return live.map((prod) => prod.id);
  if (scope === "cheapest") return [live[0]!.id];
  const best = live.reduce((a, b) => (producerRate(p, b.id) > producerRate(p, a.id) ? b : a));
  return [best.id];
}

/** A partial shield scales the effect down rather than negating it (docs/design.md). */
export function resolveAttack(args: {
  attack: Attack;
  attackerId: string;
  defender: PlayerState;
  at: Millis;
  rng: Rng;
  eventIndex: number;
}): { defender: PlayerState; outcome: AttackOutcome } {
  const { attack, attackerId, at, rng, eventIndex } = args;

  const pool = shieldPool(args.defender, at);
  const mitigation = attack.power > 0 ? Math.min(1, pool / attack.power) : 0;
  const absorbed = Math.min(pool, attack.power);
  let defender = drainShields(args.defender, at, absorbed);

  const potency = 1 - mitigation;
  const outcome: AttackOutcome = {
    mitigation,
    blocked: potency <= 1e-9,
    absorbed,
    broke: {},
    brokeTotal: 0,
  };
  if (outcome.blocked) return { defender, outcome };

  if (attack.effect.kind === "slow") {
    const applied: ActiveEffect = {
      kind: "slow",
      id: `${eventIndex}:${attack.id}`,
      source: attackerId,
      label: attack.name,
      multiplier: 1 - attack.effect.cut * potency,
      startedAt: at,
      expiresAt: ms(at + attack.effect.durationMs),
    };
    defender = { ...defender, effects: [...defender.effects, applied] };
    outcome.applied = applied;
    return { defender, outcome };
  }

  // Breakage: mitigation scales how many units go down; nothing here times out.
  const share = attack.effect.share * potency;
  const broken = { ...defender.broken };
  for (const id of targetsFor(defender, attack.effect.scope)) {
    const owned = defender.producers[id] ?? 0;
    const already = broken[id] ?? 0;
    const working = owned - already;
    if (working <= 0) continue;

    const rolled = share * rng.range(0.85, 1.15);
    const want = Math.max(1, Math.round(working * rolled));
    const cap = Math.max(0, Math.floor(owned * MAX_BROKEN_SHARE) - already);
    const hit = Math.min(want, working, cap);
    if (hit <= 0) continue;

    broken[id] = already + hit;
    outcome.broke[id] = (outcome.broke[id] ?? 0) + hit;
    outcome.brokeTotal += hit;
  }
  defender = { ...defender, broken };

  return { defender, outcome };
}

export function describeBreak(broke: Partial<Record<ProducerId, number>>): string {
  const parts = PRODUCERS.filter((prod) => (broke[prod.id] ?? 0) > 0).map(
    (prod) => `${broke[prod.id]}x ${prod.name} ${prod.hurt}`,
  );
  return parts.join(", ");
}

export function buildShield(
  defense: Defense,
  playerId: string,
  at: Millis,
  eventIndex: number,
): ActiveEffect {
  return {
    kind: "shield",
    id: `${eventIndex}:${defense.id}`,
    source: playerId,
    label: defense.name,
    power: defense.power,
    initialPower: defense.power,
    startedAt: at,
    expiresAt: ms(at + defense.durationMs),
  };
}
