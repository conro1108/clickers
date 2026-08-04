import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { P, solo, type Millis, type Puppies } from "@mill/sim";

import { nowMs } from "./clock.js";

const SAVE_KEY = "puppies-inc:mill";
/** How often batched whistles are folded into the sim. */
const WHISTLE_FLUSH_MS = 500;
/**
 * How often the sim is actually advanced. Only has to be fine enough that a
 * weather event lands promptly — everything between ticks is extrapolated.
 */
const TICK_MS = 250;
/** Display refresh. Doesn't touch the sim. */
const RENDER_MS = 100;
const AUTOSAVE_MS = 10_000;

export interface MillRuntime {
  mill: solo.MillState;
  now: Millis;
  /** What happened while the tab was closed, until it's dismissed. */
  report: solo.OfflineReport | null;
  dismissReport(): void;
  /** The pile, including whistles not yet flushed — what you can actually spend. */
  budget: Puppies;
  pendingWhistles: number;
  error: string | null;
  whistle(): void;
  dispatch(cmd: solo.MillCommand): void;
  /** Burn the save and start over. Not prestige — this keeps nothing. */
  abandon(): void;
}

export function hasSavedMill(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

function loadMill(): { mill: solo.MillState; report: solo.OfflineReport | null } {
  let saved: solo.MillState | null = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) saved = solo.parseMill(raw);
  } catch {
    saved = null;
  }
  if (!saved) {
    return { mill: solo.createMill({ seed: newSeed(), startedAt: nowMs() }), report: null };
  }
  return solo.resumeMill(saved, nowMs());
}

function newSeed(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/**
 * Drives the homestead in the browser. Every mutation goes through the same
 * `applyMillCommand` a server would call, so moving this behind a network
 * round-trip later doesn't touch any game logic.
 */
export function useMill(): MillRuntime {
  const initial = useRef<{ mill: solo.MillState; report: solo.OfflineReport | null }>();
  initial.current ??= loadMill();

  const [mill, setMillRaw] = useState<solo.MillState>(initial.current.mill);
  const [now, setNow] = useState<Millis>(() => nowMs());
  const [pendingWhistles, setPendingWhistles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<solo.OfflineReport | null>(() =>
    solo.worthReporting(initial.current!.report) ? initial.current!.report : null,
  );

  const millRef = useRef(mill);
  const pendingRef = useRef(0);

  const setMill = useCallback((next: solo.MillState) => {
    millRef.current = next;
    setMillRaw(next);
  }, []);

  const save = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeMill(millRef.current, nowMs()));
    } catch {
      // A full or blocked localStorage shouldn't take the game down with it.
    }
  }, []);

  const flushWhistles = useCallback(() => {
    const count = pendingRef.current;
    if (count === 0) return;
    pendingRef.current = 0;
    setPendingWhistles(0);
    const res = solo.applyMillCommand(millRef.current, { type: "whistle", count }, nowMs());
    if (res.ok) setMill(res.mill);
  }, [setMill]);

  const dispatch = useCallback(
    (cmd: solo.MillCommand) => {
      // Bank what you've already whistled before spending, or the pile you can see
      // is a flush ahead of the pile you can spend.
      flushWhistles();
      const res = solo.applyMillCommand(millRef.current, cmd, nowMs());
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setError(null);
      setMill(res.mill);
      save();
    },
    [flushWhistles, save, setMill],
  );

  const whistle = useCallback(() => {
    pendingRef.current += 1;
    setPendingWhistles(pendingRef.current);
  }, []);

  // Truth: advance the sim so weather actually lands.
  useEffect(() => {
    const id = setInterval(() => {
      const { mill: next, events } = solo.advance(millRef.current, nowMs());
      if (events.length > 0 || next.checkpointAt !== millRef.current.checkpointAt) setMill(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [setMill]);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), RENDER_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(flushWhistles, WHISTLE_FLUSH_MS);
    return () => clearInterval(id);
  }, [flushWhistles]);

  useEffect(() => {
    const id = setInterval(save, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [save]);

  // Closing the tab is the single most likely moment to lose progress, and on
  // mobile `beforeunload` often never fires — `hidden` is the one that does.
  useEffect(() => {
    const onHide = () => {
      flushWhistles();
      save();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushWhistles, save]);

  const abandon = useCallback(() => {
    pendingRef.current = 0;
    setPendingWhistles(0);
    setError(null);
    setReport(null);
    const fresh = solo.createMill({ seed: newSeed(), startedAt: nowMs() });
    setMill(fresh);
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeMill(fresh, nowMs()));
    } catch {
      /* see `save` */
    }
  }, [setMill]);

  const budget = useMemo(
    () => P.add(solo.projectedPuppies(mill, now), P.mul(solo.clickYield(mill), pendingWhistles)),
    [mill, now, pendingWhistles],
  );

  return {
    mill,
    now,
    report,
    dismissReport: () => setReport(null),
    budget,
    pendingWhistles,
    error,
    whistle,
    dispatch,
    abandon,
  };
}
