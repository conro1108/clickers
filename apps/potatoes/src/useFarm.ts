import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Y, solo, type Millis, type Yield } from "@clickers/sim";

import { nowMs } from "./clock.js";

const SAVE_KEY = "potatoes-inc:farm";
/** How often batched digs are folded into the sim. */
const DIG_FLUSH_MS = 500;
// Sim tick; only has to be fine enough that weather lands promptly, the rest is extrapolated.
const TICK_MS = 250;
/** Display refresh. Doesn't touch the sim. */
const RENDER_MS = 100;
const AUTOSAVE_MS = 10_000;

export interface FarmRuntime {
  farm: solo.SiteState;
  now: Millis;
  /** What happened while the tab was closed, until it's dismissed. */
  report: solo.OfflineReport | null;
  dismissReport(): void;
  /** The pile, including digs not yet flushed — what you can actually spend. */
  budget: Yield;
  pendingDigs: number;
  error: string | null;
  dig(): void;
  dispatch(cmd: solo.SiteCommand): void;
  abandon(): void;
}

export function hasSavedFarm(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

function loadFarm(): { farm: solo.SiteState; report: solo.OfflineReport | null } {
  let saved: solo.SiteState | null = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) saved = solo.parseSite(raw);
  } catch {
    saved = null;
  }
  if (!saved) {
    return { farm: solo.createSite({ seed: newSeed(), startedAt: nowMs() }), report: null };
  }
  const resumed = solo.resumeSite(saved, nowMs());
  return { farm: resumed.site, report: resumed.report };
}

function newSeed(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

// Drives the homestead in the browser. Every mutation goes through the same `applySiteCommand` a server would call.
export function useFarm(): FarmRuntime {
  const initial = useRef<{ farm: solo.SiteState; report: solo.OfflineReport | null }>();
  initial.current ??= loadFarm();

  const [farm, setFarmRaw] = useState<solo.SiteState>(initial.current.farm);
  const [now, setNow] = useState<Millis>(() => nowMs());
  const [pendingDigs, setPendingDigs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<solo.OfflineReport | null>(() =>
    solo.worthReporting(initial.current!.report) ? initial.current!.report : null,
  );

  const farmRef = useRef(farm);
  const pendingRef = useRef(0);

  const setFarm = useCallback((next: solo.SiteState) => {
    farmRef.current = next;
    setFarmRaw(next);
  }, []);

  const save = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeSite(farmRef.current, nowMs()));
    } catch {
      // A full or blocked localStorage shouldn't take the game down with it.
    }
  }, []);

  const flushDigs = useCallback(() => {
    const count = pendingRef.current;
    if (count === 0) return;
    pendingRef.current = 0;
    setPendingDigs(0);
    const res = solo.applySiteCommand(farmRef.current, { type: "click", count }, nowMs());
    if (res.ok) setFarm(res.site);
  }, [setFarm]);

  const dispatch = useCallback(
    (cmd: solo.SiteCommand) => {
      // Bank pending clicks first, or the visible pile is a flush ahead of the spendable one.
      flushDigs();
      const res = solo.applySiteCommand(farmRef.current, cmd, nowMs());
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setError(null);
      setFarm(res.site);
      save();
    },
    [flushDigs, save, setFarm],
  );

  const dig = useCallback(() => {
    pendingRef.current += 1;
    setPendingDigs(pendingRef.current);
  }, []);

  // Truth: advance the sim so weather actually lands.
  useEffect(() => {
    const id = setInterval(() => {
      const { site: next, events } = solo.advance(farmRef.current, nowMs());
      if (events.length > 0 || next.checkpointAt !== farmRef.current.checkpointAt) setFarm(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [setFarm]);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), RENDER_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(flushDigs, DIG_FLUSH_MS);
    return () => clearInterval(id);
  }, [flushDigs]);

  useEffect(() => {
    const id = setInterval(save, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [save]);

  // On mobile `beforeunload` often never fires; `hidden` is the one that does.
  useEffect(() => {
    const onHide = () => {
      flushDigs();
      save();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushDigs, save]);

  const abandon = useCallback(() => {
    pendingRef.current = 0;
    setPendingDigs(0);
    setError(null);
    setReport(null);
    const fresh = solo.createSite({ seed: newSeed(), startedAt: nowMs() });
    setFarm(fresh);
    try {
      localStorage.setItem(SAVE_KEY, solo.serializeSite(fresh, nowMs()));
    } catch {
      /* see `save` */
    }
  }, [setFarm]);

  const budget = useMemo(
    () => Y.add(solo.projectedStock(farm, now), Y.mul(solo.clickYield(farm), pendingDigs)),
    [farm, now, pendingDigs],
  );

  return {
    farm,
    now,
    report,
    dismissReport: () => setReport(null),
    budget,
    pendingDigs,
    error,
    dig,
    dispatch,
    abandon,
  };
}
