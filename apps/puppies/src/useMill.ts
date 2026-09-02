import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Y, solo, type Millis, type Yield } from "@clickers/sim";

import { nowMs } from "./clock.js";

const SAVE_KEY = "puppy-mill:mill";
/** How often batched whistles are folded into the sim. */
const WHISTLE_FLUSH_MS = 500;
// Sim tick; only has to be fine enough that weather lands promptly, the rest is extrapolated.
const TICK_MS = 250;
/** Display refresh. Doesn't touch the sim. */
const RENDER_MS = 100;
const AUTOSAVE_MS = 10_000;

export interface MillRuntime {
  mill: solo.SiteState;
  now: Millis;
  /** What happened while the tab was closed, until it's dismissed. */
  report: solo.OfflineReport | null;
  dismissReport(): void;
  /** The pile, including whistles not yet flushed — what you can actually spend. */
  budget: Yield;
  pendingWhistles: number;
  error: string | null;
  whistle(): void;
  dispatch(cmd: solo.SiteCommand): void;
  abandon(): void;
}

export function hasSavedMill(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

function loadMill(): { mill: solo.SiteState; report: solo.OfflineReport | null } {
  let saved: solo.SiteState | null = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) saved = solo.parseSite(raw);
  } catch {
    saved = null;
  }
  if (!saved) {
    return { mill: solo.createSite({ seed: newSeed(), startedAt: nowMs() }), report: null };
  }
  const resumed = solo.resumeSite(saved, nowMs());
  return { mill: resumed.site, report: resumed.report };
}

function newSeed(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

// Drives the homestead in the browser. Every mutation goes through the same `applySiteCommand` a server would call.
export function useMill(): MillRuntime {
  const initial = useRef<{ mill: solo.SiteState; report: solo.OfflineReport | null }>();
  initial.current ??= loadMill();

  const [mill, setMillRaw] = useState<solo.SiteState>(initial.current.mill);
  const [now, setNow] = useState<Millis>(() => nowMs());
  const [pendingWhistles, setPendingWhistles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<solo.OfflineReport | null>(() =>
    solo.worthReporting(initial.current!.report) ? initial.current!.report : null,
  );

  const millRef = useRef(mill);
  const pendingRef = useRef(0);

  const setMill = useCallback((next: solo.SiteState) => {
    millRef.current = next;
    setMillRaw(next);
  }, []);

  const save = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeSite(millRef.current, nowMs()));
    } catch {
      // A full or blocked localStorage shouldn't take the game down with it.
    }
  }, []);

  const flushWhistles = useCallback(() => {
    const count = pendingRef.current;
    if (count === 0) return;
    pendingRef.current = 0;
    setPendingWhistles(0);
    const res = solo.applySiteCommand(millRef.current, { type: "click", count }, nowMs());
    if (res.ok) setMill(res.site);
  }, [setMill]);

  const dispatch = useCallback(
    (cmd: solo.SiteCommand) => {
      // Bank pending clicks first, or the visible pile is a flush ahead of the spendable one.
      flushWhistles();
      const res = solo.applySiteCommand(millRef.current, cmd, nowMs());
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setError(null);
      setMill(res.site);
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
      const { site: next, events } = solo.advance(millRef.current, nowMs());
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

  // On mobile `beforeunload` often never fires; `hidden` is the one that does.
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
    const fresh = solo.createSite({ seed: newSeed(), startedAt: nowMs() });
    setMill(fresh);
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeSite(fresh, nowMs()));
    } catch {
      /* see `save` */
    }
  }, [setMill]);

  const budget = useMemo(
    () => Y.add(solo.projectedStock(mill, now), Y.mul(solo.clickYield(mill), pendingWhistles)),
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
