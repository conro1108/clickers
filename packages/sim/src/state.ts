import type { Millis, Yield } from "./numbers.js";
import type { AttackId, DefenseId, ProducerId, UpgradeId } from "./content.js";

export type PlayerId = string;

// Effects all end at a known instant, which keeps production integrable in closed form (see STACK.md).
export type ActiveEffect =
  | {
      kind: "slow";
      id: string;
      source: PlayerId;
      label: string;
      multiplier: number;
      startedAt: Millis;
      expiresAt: Millis;
    }
  | {
      kind: "shield";
      id: string;
      source: PlayerId;
      label: string;
      power: number;
      initialPower: number;
      startedAt: Millis;
      expiresAt: Millis;
    };

export interface PlayerState {
  id: PlayerId;
  name: string;
  isBot: boolean;

  /** `stock` and `produced` are checkpointed as of `checkpointAt`. */
  stock: Yield;
  checkpointAt: Millis;

  produced: Yield;

  producers: Partial<Record<ProducerId, number>>;
  /** Sabotaged units: still owned, produce nothing until repaired. */
  broken: Partial<Record<ProducerId, number>>;
  upgrades: UpgradeId[];
  attacksUsed: Partial<Record<AttackId, number>>;
  defensesUsed: Partial<Record<DefenseId, number>>;

  effects: ActiveEffect[];

  /** Click bucket; refilled by elapsed time in `applyCommand`, so folded from the log. */
  clicks: number;
  clickAt: Millis;
}

export type ScoringRule = "total_produced" | "on_hand";

export interface MatchConfig {
  seed: string;
  durationMs: number;
  /** See README — a live design fork. */
  scoring: ScoringRule;
}

export interface MatchState {
  config: MatchConfig;
  startedAt: Millis;
  players: Record<PlayerId, PlayerState>;
  order: PlayerId[];
  /** Monotonic; also the PRNG key, so it must advance on every applied event. */
  eventIndex: number;
  log: LogEntry[];
}

export interface LogEntry {
  index: number;
  at: Millis;
  actor: PlayerId;
  target?: PlayerId;
  text: string;
  tone: "neutral" | "good" | "bad";
}

export type Command =
  | { type: "click"; player: PlayerId; count: number }
  | { type: "buy_producer"; player: PlayerId; producer: ProducerId; qty: number }
  | { type: "buy_upgrade"; player: PlayerId; upgrade: UpgradeId }
  | { type: "attack"; player: PlayerId; target: PlayerId; attack: AttackId }
  | { type: "defend"; player: PlayerId; defense: DefenseId }
  | { type: "repair"; player: PlayerId; producer: ProducerId };

export type CommandResult =
  | { ok: true; state: MatchState; entries: LogEntry[] }
  | { ok: false; reason: string };
