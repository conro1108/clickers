/**
 * A match, folded out of the command log.
 *
 * There is no state on the wire — only commands, in the order the database
 * stamped them. Both clients start from the same `createMatch` and run the same
 * `applyCommand` over the same rows, which is the entire reason the schema can
 * store no game state and still have both players agree about who won.
 *
 * It returns the same `MatchRuntime` the bot loop does, so the match screen
 * renders either one without knowing which it's looking at.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyCommand,
  checkpoint,
  clampToMatch,
  createMatch,
  isOver,
  scoreOf,
  type Command,
  type MatchState,
  type Millis,
} from "@clickers/sim";

import { namesOf, settle, type MatchRow } from "./matches.js";
import { serverNow, supabase } from "./supabase.js";
import type { MatchRuntime } from "../useMatch.js";

/** How often batched clicks are flushed into the log (STACK.md). */
const CLICK_FLUSH_MS = 500;
/** Display refresh. Nothing ticks — this only redraws extrapolated numbers. */
const RENDER_MS = 100;

interface CommandRow {
  seq: number;
  player: string;
  at: string;
  body: Omit<Command, "player">;
}

export interface OnlineRuntime extends MatchRuntime {
  /** Commands the sim refused. Nonzero means the two clients have diverged. */
  rejected: number;
  /** Whether the log has been read at least once. */
  ready: boolean;
}

function rowsToState(row: MatchRow, names: Record<string, string>, log: CommandRow[]) {
  const startedAt = new Date(row.started_at ?? Date.now()).getTime() as Millis;
  let state = createMatch({
    config: { seed: row.seed, durationMs: row.duration_ms, scoring: row.scoring },
    startedAt,
    // Host first, so `order` is the same array on both machines — it's what the
    // opponent list iterates, and a table that disagreed about its own order
    // would put the two players in different seats.
    players: [
      { id: row.host, name: names[row.host] ?? "Host" },
      { id: row.guest ?? "guest", name: names[row.guest ?? ""] ?? "Guest" },
    ],
  });
  let rejected = 0;
  for (const c of log) {
    // Clamped for the same reason the offline game clamps: nothing accrues or
    // resolves after the buzzer, and a command that arrived a moment late must
    // not be worth more than one that didn't.
    const at = clampToMatch(state, new Date(c.at).getTime() as Millis);
    const res = applyCommand(state, { ...c.body, player: c.player } as Command, at);
    if (res.ok) state = res.state;
    else rejected++;
  }
  return { state, rejected };
}

export function useOnlineMatch(initialRow: MatchRow | null, meId: string | null): OnlineRuntime {
  // The row is watched, not just read: a match can end because the other player
  // walked out of it, and a client that only knew about the clock would sit
  // there whistling at a race nobody else is in.
  const [row, setRow] = useState<MatchRow | null>(initialRow);
  useEffect(() => setRow(initialRow), [initialRow?.id]);
  useEffect(() => {
    const id = initialRow?.id;
    if (!id) return;
    const channel = supabase
      .channel(`puppy-mill:row:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "puppy_mill", table: "matches", filter: `id=eq.${id}` },
        (payload) => setRow(payload.new as MatchRow),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initialRow?.id]);

  const [names, setNames] = useState<Record<string, string>>({});
  const [log, setLog] = useState<CommandRow[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Millis>(() => serverNow() as Millis);
  const [pendingClicks, setPendingClicks] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef(0);
  const logRef = useRef<CommandRow[]>([]);
  logRef.current = log;
  const matchId = row?.id ?? null;

  useEffect(() => {
    if (!row) return;
    void namesOf([row.host, row.guest ?? ""]).then(setNames);
  }, [row?.host, row?.guest]);

  /**
   * Pull anything the log is missing, from wherever it got to.
   *
   * This is the repair path, and it is not optional. Realtime is best-effort: a
   * dropped message is invisible, because the gap check can only notice one when
   * a *later* message arrives to expose it — so a command lost with nothing
   * following it strands that client on a stale log until the buzzer, showing
   * the wrong score and never saying why. It's also what covers a tab that slept
   * through a reconnect, and the first read of the match.
   *
   * Cheap enough to run on a timer: it asks for `seq` past what it holds, which
   * is almost always nothing.
   */
  const reconcile = useCallback(async (id: string) => {
    const have = logRef.current;
    const from = have.length === 0 ? 0 : have[have.length - 1]!.seq + 1;
    const { data, error: err } = await supabase
      .from("commands")
      .select("seq,player,at,body")
      .eq("match_id", id)
      .gte("seq", from)
      .order("seq");
    if (err) {
      setError(err.message);
      return;
    }
    setReady(true);
    if (!data?.length) return;
    setLog((prev) => {
      const last = prev.length === 0 ? -1 : prev[prev.length - 1]!.seq;
      const missing = (data as CommandRow[]).filter((c) => c.seq > last);
      return missing.length === 0 ? prev : [...prev, ...missing];
    });
  }, []);

  useEffect(() => {
    setLog([]);
    logRef.current = [];
    setReady(false);
    if (!matchId) return;
    void reconcile(matchId);
    const id = setInterval(() => void reconcile(matchId), 5000);
    return () => clearInterval(id);
  }, [matchId, reconcile]);

  // -- realtime -------------------------------------------------------------

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`puppy-mill:match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "puppy_mill", table: "commands", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const next = payload.new as CommandRow;
          const have = logRef.current;
          const expected = have.length === 0 ? 0 : have[have.length - 1]!.seq + 1;
          // Fast path for the next command in sequence. Anything else means a
          // message was missed or arrived out of order, and the log is the one
          // thing the two clients are never allowed to disagree about — so go
          // and fetch what's missing rather than guess at it.
          if (next.seq === expected) setLog((prev) => [...prev, next]);
          else if (next.seq > expected) void reconcile(matchId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, reconcile]);

  // -- the fold -------------------------------------------------------------

  const { state, rejected } = useMemo(() => {
    if (!row) return { state: null as MatchState | null, rejected: 0 };
    return rowsToState(row, names, log);
  }, [row, names, log]);

  // -- writing --------------------------------------------------------------

  const send = useCallback(
    async (body: Omit<Command, "player">) => {
      if (!matchId) return;
      const { error: err } = await supabase.from("commands").insert({ match_id: matchId, body });
      if (err) setError(err.message);
      else setError(null);
    },
    [matchId],
  );

  const flushClicks = useCallback(() => {
    const count = pendingRef.current;
    if (count === 0) return;
    pendingRef.current = 0;
    setPendingClicks(0);
    void send({ type: "click", count } as Omit<Command, "player">);
  }, [send]);

  const dispatch = useCallback(
    (cmd: Command) => {
      // Bank the clicks you've already made before spending, exactly as the
      // offline game does: the pile you can see would otherwise be up to a flush
      // ahead of the pile the sim will let you spend.
      flushClicks();
      const { player: _player, ...body } = cmd;
      void send(body as Omit<Command, "player">);
    },
    [flushClicks, send],
  );

  const click = useCallback(() => {
    if (!state || isOver(state, serverNow() as Millis)) return;
    pendingRef.current += 1;
    setPendingClicks(pendingRef.current);
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => setNow(serverNow() as Millis), RENDER_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(flushClicks, CLICK_FLUSH_MS);
    return () => clearInterval(id);
  }, [flushClicks]);

  // The buzzer. Whoever notices first writes it down — both clients fold the
  // same log, so they name the same winner, and the second write is the same
  // row with the same values.
  const settled = useRef(false);
  useEffect(() => {
    if (!state || !row || !matchId || settled.current) return;
    if (row.status !== "active" || !isOver(state, now)) return;
    settled.current = true;
    const end = clampToMatch(state, now);
    const ranked = Object.values(state.players)
      .map((p) => ({ id: p.id, score: scoreOf(p, end, state.config.scoring) }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    // A draw has no winner, and writing one down would invent a result.
    const winner = top && (ranked[1] === undefined || top.score > ranked[1].score) ? top.id : null;
    void settle(matchId, winner);
  }, [state, row, matchId, now]);

  const clamped = state ? clampToMatch(state, now) : now;
  const me = useMemo(
    () => (state && meId && state.players[meId] ? checkpoint(state.players[meId]!, clamped) : null),
    [state, meId, clamped],
  );

  return {
    state: state!,
    now: clamped,
    me: me!,
    pendingClicks,
    // The clock, or somebody walking out. Both end the match, and the second one
    // is the reason the row is subscribed to at all.
    over: Boolean(state && (isOver(state, now) || row?.status === "finished" || row?.status === "abandoned")),
    error,
    click,
    dispatch,
    restart: () => {},
    rejected,
    ready: ready && Boolean(state) && Boolean(me),
  };
}
