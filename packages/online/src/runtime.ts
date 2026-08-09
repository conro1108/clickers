/**
 * What a match looks like to the UI, whoever is running it.
 *
 * Both apps' `useMatch` (a bot match, all local) and `useOnlineMatch` (a real
 * opponent, folded from a command log) return this same shape, which is what
 * lets one set of components render either without knowing the difference.
 */

import type { Command, MatchState, Millis, PlayerState } from "@clickers/sim";

export interface MatchRuntime {
  state: MatchState;
  now: Millis;
  /** You, integrated forward to `now`. */
  me: PlayerState;
  /** Clicks banked client-side but not yet flushed — shown optimistically. */
  pendingClicks: number;
  over: boolean;
  error: string | null;
  click(): void;
  dispatch(cmd: Command): void;
  restart(): void;
}
