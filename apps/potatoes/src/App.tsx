import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  Y,
  clickGain,
  format,
  formatDuration,
  seconds,
  solo,
  standings,
} from "@clickers/sim";

import { abandon, errorText, joinByCode, useLobby, useOnlineMatch, type MatchRow } from "@clickers/online";

import { clockSkew, setClockSkew } from "./clock.js";
import { AwayReport } from "./components/AwayReport.js";
import { Damage } from "./components/Damage.js";
import { CutFall } from "./components/CutFall.js";
import { Farm } from "./components/Farm.js";
import { FarmFeed } from "./components/FarmFeed.js";
import { FarmScene, TitleScene, type FarmSceneHandle } from "./components/FarmScene.js";
import { GrowPanel, LandPanel, LegacyPanel } from "./components/FarmShop.js";
import { Feed } from "./components/Feed.js";
import { Opponents } from "./components/Opponents.js";
import { PxIcon } from "./components/PxIcon.js";
import { Sheet } from "./components/Sheet.js";
import { VersusLobby } from "./components/Lobby.js";
import { Shop } from "./components/Shop.js";
import { hasSavedFarm, useFarm } from "./useFarm.js";
import { culprit, WORLD_COPY } from "./worlds.js";
import { BOTS, useMatch, type MatchRuntime, type MatchSetup } from "./useMatch.js";

// `greedy` is left out: it is a control group for the balance harness, not an opponent.
const BOT_ROSTER = ([
  "chill",
  "scrappy",
  "nasty",
  "mean",
  "vicious",
  "ruthless",
  "merciless",
  "tyrant",
] as const).map((id) => ({
  id,
  name: BOTS[id]?.name ?? id,
  blurb: BOTS[id]?.blurb ?? "",
}));

type Screen = { kind: "home" } | { kind: "farm" } | { kind: "versus" };

// Space always digs; without the blur it would re-fire the last-clicked shop button.
function useSpaceToDig(dig: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (el && el.tagName === "BUTTON") el.blur();
      e.preventDefault();
      dig();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dig, enabled]);
}

/** How long a press has to be held before it's asking for the back room. */
const HOLD_MS = 700;

// Press-and-hold into the back room. Not a `<button>` so it cannot be tabbed into by the players it is hidden from.
// Pointer events + `setPointerCapture` so a thumb sliding off mid-hold does not cancel; `pointercancel` fires on scroll.
function useHold(onHold: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);
  useEffect(() => stop, [stop]);
  return {
    onPointerDown: (e: PointerEvent) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      stop();
      timer.current = setTimeout(onHold, HOLD_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  };
}

// --- Home ---

// The splash; seen once. Once you have a farm the app opens straight onto it.
function Home({ onGo }: { onGo: (screen: Screen) => void }) {
  const returning = hasSavedFarm();
  return (
    <div className="lobby">
      <h1>
        Yield, <span>Inc.</span>
      </h1>
      <p className="tagline">
        Grow potatoes. The weather will have opinions about that.
      </p>

      {/* Somebody's farm, running. A title screen for a game about a place
          shouldn't be a page of type. */}
      <TitleScene />

      <button className="start" onClick={() => onGo({ kind: "farm" })}>
        {returning ? "Back to your farm" : "Start your farm"}
      </button>
      <p className="muted small home-note">
        A farm you keep. It grows while you're gone — and so does everything that's wrong with it.
      </p>
    </div>
  );
}

// --- The homestead ---

// Sheets, named for what is inside them. `back` is not on the bar.
type FarmSheet = "shop" | "upkeep" | "seeds" | "back";

const TAUGHT_KEY = "potatoes-inc:taught-tap";

/** A blocked localStorage reports everything as already seen. Harmless. */
function wasSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function markSeen(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // A blocked localStorage just means the hint comes back. Harmless.
  }
}

// Omen length, blackout to last frame of the farm returning. Kept in step with the `omen-veil` keyframes.
const OMEN_MS = 7600;

// Short omen for every Singularity after the first of a run: one dark pull with a single line in it.
const OMEN_FLASH_MS = 1900;

// The Convergence: outside the potato to inside it. Timings live in the `converge-*` keyframes as percentage offsets of this.
// `FOLD_SWAP_MS` keeps the canvas from spending the arrival while this is over the top of it.
const CONVERGE_MS = 9600;

// When the canvas swaps to the inside farm. `converge-veil` is opaque from 8% to 92%; this sits inside that.
const FOLD_SWAP_MS = Math.round(CONVERGE_MS * 0.3);

// A walk between open worlds, or back into one this line has already been to: a dip to dark and out, not a cut.
// The canvas swaps at the darkest frame. Kept in step with the `crossing` keyframes.
const CROSS_MS = 700;
const CROSS_SWAP_MS = Math.round(CROSS_MS * 0.45);

// The short omen's line: same encouragement, worded closer each time. Only asked before the fold.
function omenNudge(farm: solo.SiteState): string {
  const p = solo.convergenceProgress(farm);
  if (p >= 1) return "It's in reach";
  if (p >= 0.7) return "Nearly";
  if (p >= 0.4) return "Closer than it was";
  return "Keep going";
}

const HOUR_MS = 3_600_000;

// The sim's `formatDuration` is m:ss; a skew is routinely a week. Days and hours, no seconds.
function formatSkew(msAhead: number): string {
  const hours = Math.round(msAhead / HOUR_MS);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return [d ? `${d}d` : "", h || !d ? `${h}h` : ""].filter(Boolean).join(" ");
}

// The back room: the parked versus prototype plus dev levers. Reached only by holding the HUD potato.
// A lever earns a place only if it reaches a state you cannot otherwise get to in under a minute.
function BackRoom({
  farm,
  onVersus,
  onTitle,
  onAbandon,
  dispatch,
}: {
  farm: solo.SiteState;
  onVersus: () => void;
  onTitle: () => void;
  onAbandon: () => void;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  // Read once per open, not watched: a skew that re-rendered every tick reads as a clock.
  const [skew, setSkew] = useState(() => clockSkew());
  const jump = (byMs: number) => {
    setClockSkew(clockSkew() + byMs);
    setSkew(clockSkew());
    // No dispatch needed: the tick loop calls `nowMs` and `advance` resolves the gap like a closed tab.
  };

  return (
    <div className="backroom">
      <section>
        <h3>Push the clock</h3>
        <p className="muted small">
          Moves the farm's idea of now, and resolves the gap the way a closed tab does. Sticks across
          a reload.
        </p>
        <div className="choices">
          {([
            ["+1 hour", HOUR_MS],
            ["+8 hours", 8 * HOUR_MS],
            ["+1 day", 24 * HOUR_MS],
            ["+1 week", 7 * 24 * HOUR_MS],
          ] as const).map(([label, by]) => (
            <button key={label} className="ghost" onClick={() => jump(by)}>
              {label}
            </button>
          ))}
        </div>
        {skew > 0 && (
          <>
            <p className="muted small">
              Running {formatSkew(skew)} ahead of the wall clock. Putting it back rebases the farm
              onto real time — you keep everything the jump produced, and the clock you skipped
              simply didn't happen.
            </p>
            <button
              className="ghost"
              onClick={() => {
                setClockSkew(0);
                setSkew(0);
              }}
            >
              Put the clock back
            </button>
          </>
        )}
      </section>

      <section>
        <h3>Fill the yard</h3>
        <p className="muted small">
          Real digs, so they respect every multiplier you own — and they will absolutely ruin your
          save's pacing.
        </p>
        <div className="choices">
          {([
            ["+100 digs", 100],
            ["+10k digs", 10_000],
            ["+1M digs", 1_000_000],
          ] as const).map(([label, clicks]) => (
            <button key={clicks} className="ghost" onClick={() => dispatch({ type: "dev_grant", clicks })}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Break something</h3>
        <p className="muted small">
          Pulls the next scheduled event forward to now. Same event, early — it's how you get damaged
          kit and a dirty soil bar without waiting for the sky.
        </p>
        <button className="ghost" onClick={() => dispatch({ type: "dev_weather" })}>
          Send the next event
        </button>
      </section>

      <section>
        <h3>Seeds</h3>
        <p className="muted small">
          Without the hand-down that normally pays for them, so the perk table is reachable on a
          first run.
        </p>
        <div className="choices">
          {[10, 1_000, 100_000].map((heirlooms) => (
            <button key={heirlooms} className="ghost" onClick={() => dispatch({ type: "dev_heirlooms", heirlooms })}>
              +{heirlooms.toLocaleString()}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>The worlds</h3>
        <p className="muted small">
          Opens every world up to the one you pick, without the purchases, so without the cuts —
          to watch one, buy its gate. Picking a shallower one strips the kit that only exists past
          it and puts those gates back on the shelf. Your yard and this run's harvest are untouched.
        </p>
        <div className="choices">
          {solo.WORLDS.map((w, depth) => (
            <button
              key={w}
              className={farm.depth === depth ? "ghost on" : "ghost"}
              disabled={farm.depth === depth}
              onClick={() => dispatch({ type: "dev_depth", depth })}
            >
              {WORLD_COPY[w].door}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Versus a bot</h3>
        <p className="muted small">
          The older head-to-head prototype: two farms, one clock, and upgrades that reach across the
          table. Parked, but it still runs.
        </p>
        <button className="ghost" onClick={onVersus}>
          Open the lobby
        </button>
      </section>

      <section>
        <h3>Start over</h3>
        <p className="muted small">
          Not a hand-down. This keeps nothing — not the seeds, not the generation, not the fold.
        </p>
        <div className="choices">
          <button className="ghost" onClick={onTitle}>
            Back to the title
          </button>
          <button
            className="ghost danger"
            onClick={() => {
              if (window.confirm("Plough it all under? This keeps nothing — not even seeds.")) {
                onAbandon();
              }
            }}
          >
            Plough it all under
          </button>
        </div>
      </section>
    </div>
  );
}

// The homestead screen: HUD, the farm filling everything between, one verb at the bottom. Everything else is a sheet.
function Homefarm({ onGo }: { onGo: (screen: Screen) => void }) {
  const { farm, now, report, dismissReport, budget, pendingDigs, error, dig, dispatch, abandon } =
    useFarm();
  const [sheet, setSheet] = useState<FarmSheet | null>(null);
  const sceneRef = useRef<FarmSceneHandle>(null);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const popId = useRef(0);
  const [taught, setTaught] = useState(() => wasSeen(TAUGHT_KEY));
  // Hung off the count going up, not a threshold: first of a run gets the whole cut, the rest the short one.
  // `n` restarts the animation when two land close together.
  const [omen, setOmen] = useState<{ kind: "full" | "flash"; n: number; text: string } | null>(
    null,
  );
  const omenId = useRef(0);
  const singularities = farm.producers.singularity ?? 0;
  // Ref, not effect dep: the line depends on a farm that changes every tick.
  const nudge = useRef("");
  nudge.current = omenNudge(farm);
  // Same reason.
  const folded = useRef(farm.depth >= 1);
  folded.current = farm.depth >= 1;
  // Seeded from the first render so a loaded save is not eleven purchases' worth of news.
  const hadSingularities = useRef(singularities);
  useEffect(() => {
    const had = hadSingularities.current;
    hadSingularities.current = singularities;
    // Prestige takes them all away; not an omen.
    if (singularities <= had) return;
    // Past the fold it is not an omen either: the horizon has already arrived.
    if (folded.current) return;
    // The whole cut once ever; a later generation already knows what the sky is about to do.
    const full = had === 0 && farm.reached === 0;
    setOmen({ kind: full ? "full" : "flash", n: omenId.current++, text: nudge.current });
    // Close the shop so the sky is seen; a cut behind a sheet is a cut nobody watched.
    setSheet(null);
    const id = setTimeout(() => setOmen(null), full ? OMEN_MS : OMEN_FLASH_MS);
    return () => clearTimeout(id);
  }, [singularities]);

  // The Convergence, same shape: an answer to a purchase, seeded from first render so a folded save reopens folded.
  // Every gate after it plays the same cut with its own words; `cut` is the world being arrived in.
  const [cut, setCut] = useState<solo.World | null>(null);
  // Which farm the canvas draws while the trip holds it back. Null once swapped, and forever after.
  const [heldWorld, setHeldWorld] = useState<solo.World | null>(null);
  const wasDepth = useRef(farm.depth);
  const wasReached = useRef(farm.reached);
  // Where you stood when you bought the gate, which needn't be the deepest open world.
  const wasWorld = useRef(farm.world);
  // The short way between worlds: which one, and `n` to restart the dip when two land close together.
  const [crossing, setCrossing] = useState<{ to: solo.World; n: number } | null>(null);
  const crossId = useRef(0);
  const crossTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => crossTimers.current.forEach(clearTimeout), []);
  // `then` runs at the darkest frame — a warp, or the held farm letting go.
  const cross = useCallback((to: solo.World, then: () => void) => {
    crossTimers.current.forEach(clearTimeout);
    setCrossing({ to, n: crossId.current++ });
    crossTimers.current = [
      setTimeout(then, CROSS_SWAP_MS),
      setTimeout(() => setCrossing(null), CROSS_MS),
    ];
  }, []);
  // Layout effect: the purchase and the world it moves you to land in the same render, so a plain effect lets a frame through.
  useLayoutEffect(() => {
    const was = wasDepth.current;
    const reached = wasReached.current;
    wasDepth.current = farm.depth;
    wasReached.current = farm.reached;
    const stood = wasWorld.current;
    const arrived = solo.WORLDS[farm.depth];
    // Only one step down, and only if it took you with it: the dev lever opens worlds without walking you
    // through them, and a hand-down or a lever going the other way is not an arrival.
    if (farm.depth !== was + 1 || farm.world !== arrived || !WORLD_COPY[arrived].cut) return;
    setSheet(null);
    setHeldWorld(stood);
    // Somewhere an earlier generation has already been: the way back in, not the revelation.
    if (farm.depth <= reached) {
      cross(arrived, () => setHeldWorld(null));
      return;
    }
    setCut(arrived);
    // Stay in the world you bought it from until the dark has taken the screen.
    const swap = setTimeout(() => setHeldWorld(null), FOLD_SWAP_MS);
    const id = setTimeout(() => setCut(null), CONVERGE_MS);
    return () => {
      clearTimeout(id);
      clearTimeout(swap);
      setHeldWorld(null);
    };
  }, [farm.depth]);
  // After the effect above, so a gate purchase reads where you stood before it moved you.
  useLayoutEffect(() => {
    wasWorld.current = farm.world;
  }, [farm.world]);

  // Close the shop on the first of a kind: those are the purchases that reveal (new lot, new stratum) rather than add.
  // Only the first — throwing you out on every plot would make the shop unusable.
  const kinds = solo.SOLO_PRODUCERS.filter((p) => (farm.producers[p.id] ?? 0) > 0)
    .map((p) => p.id)
    .join(",");
  // Seeded from the first render so a loaded save does not read as just arrived.
  const hadKinds = useRef(kinds);
  useEffect(() => {
    const had = new Set(hadKinds.current.split(",").filter(Boolean));
    const arrived = kinds.split(",").filter((id) => id && !had.has(id));
    hadKinds.current = kinds;
    // A hand-down takes them all away; everything bought on the way back up is a reveal again.
    if (arrived.length === 0) return;
    setSheet(null);
  }, [kinds]);

  const perDig = solo.clickYield(farm);
  const rate = solo.currentRate(farm);
  // Upkeep mends every world from wherever you stand, so any of them lights the dot.
  const needsAttention =
    farm.condition < 1 || solo.SOLO_PRODUCERS.some((p) => solo.brokenCount(farm, p.id) > 0);
  // Shown the moment a hand-down would pay anything, and then never taken away (also covers saves that predate `depth`).
  const showSeeds =
    farm.depth >= 1 || farm.heirlooms > 0 || farm.generation > 1 || solo.pendingHeirlooms(farm) > 0;

  // Right to left by how often you reach for it: Shop nearest the thumb, Seeds at the far end so appearing later shuffles nothing.
  const nav: { id: FarmSheet; label: string; icon: Parameters<typeof PxIcon>[0]["name"] }[] = [
    ...(showSeeds ? ([{ id: "seeds", label: "Seeds", icon: "sprout" }] as const) : []),
    // Named for what you do in it: nothing sends weather at a folded farm, so "Weather" stopped being true.
    { id: "upkeep", label: "Upkeep", icon: "wrench" },
    { id: "shop", label: "Shop", icon: "basket" },
  ];

  const onDig = useCallback((at?: { x: number; y: number }) => {
    dig();
    sceneRef.current?.dig(at);
    setTaught((was) => {
      if (was) return was;
      markSeen(TAUGHT_KEY);
      return true;
    });
    const id = popId.current++;
    setPops((p) => [...p.slice(-6), { id, text: `+${format(solo.clickYield(farm))}` }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
  }, [dig, farm]);

  useSpaceToDig(onDig, report === null && sheet === null && omen === null && cut === null && crossing === null);

  const soilPct = Math.round(farm.condition * 100);
  const hold = useHold(useCallback(() => setSheet("back"), []));
  // Keep where you're standing on screen when the strip is wider than the phone.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector(".on")?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [farm.world, farm.depth]);
  const kitOnTheLand = solo.SOLO_PRODUCERS.reduce((n, p) => n + (farm.producers[p.id] ?? 0), 0);

  // The shop has emptied itself for the Ur-Potato; the bottom bar is where that announces itself.
  const lastPurchase = solo.gatePending(farm) !== null;

  return (
    <div className="app farm-app">
      <header className="hud">
        {/* Hold the potato for the back room. Nothing on screen says so, which
            is the point — everything back there is either parked or a cheat,
            and neither is worth a pixel of a bar you look at all game. */}
        <div className="hud-bank" {...hold}>
          <PxIcon name="potato" size={22} />
          <div>
            <div className="hud-value">{format(budget)}</div>
            <div className="hud-label">in the yard</div>
          </div>
        </div>
        <div className="hud-side">
          <div className="hud-rate">{format(rate)}/s</div>
          <div className="soil" title="Soil health">
            <div className="soil-track">
              <div
                className={`soil-fill ${farm.condition < 0.75 ? "low" : ""}`}
                style={{ width: `${soilPct}%` }}
              />
            </div>
            <span className={farm.condition < 1 ? "hurt" : "muted"}>soil {soilPct}%</span>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <FarmScene
        ref={sceneRef}
        farm={farm}
        hoard={budget}
        world={heldWorld ?? farm.world}
        onDig={onDig}
      >
        {/* The whole scene digs, which is not something a farm looks like it
            does. One sentence, once, and then never again. */}
        {!taught && <p className="tap-hint">Tap the farm to dig</p>}
        {/* The worlds, top to bottom, on the farm rather than in a sheet:
            where you're standing is part of the picture, and so is getting
            somewhere else. A dot is a world with something broken in it. */}
        {farm.depth >= 1 && (
          <div className="world-strip" ref={strip}>
            {solo.openWorlds(farm).map((to) => (
              <button
                key={to}
                className={(heldWorld ?? farm.world) === to ? "on" : undefined}
                disabled={farm.world === to || crossing !== null || cut !== null}
                onClick={() => cross(to, () => dispatch({ type: "warp", to }))}
              >
                {WORLD_COPY[to].door}
                {solo.producersIn(to).some((p) => solo.brokenCount(farm, p.id) > 0) && (
                  <span className="world-dot" />
                )}
              </button>
            ))}
          </div>
        )}
      </FarmScene>

      {/* The button is no longer the way you dig — the scene is. What's left is
          the label that says so and the number that says how hard, which is the
          part worth keeping around. */}
      <div className="digbar">
        <button className="click" onClick={() => onDig()}>
          <PxIcon name="potato" size={16} />
          <span className="dig-label">Dig</span>
          <span className="dig-yield">+{format(perDig)}</span>
        </button>
        <div className="pops" aria-hidden>
          {pops.map((p) => (
            <span key={p.id} className="pop">
              {p.text}
            </span>
          ))}
        </div>
      </div>

      <nav className="nav">
        {nav.map((item) => (
          <button
            key={item.id}
            className={
              [
                item.id === "upkeep" && needsAttention ? "alert" : "",
                item.id === "shop" && lastPurchase ? "waiting" : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onClick={() => setSheet(item.id)}
          >
            <PxIcon name={item.icon} size={20} />
            <span>{item.label}</span>
            {item.id === "upkeep" && needsAttention && <span className="nav-dot" />}
          </button>
        ))}
      </nav>

      {/* Past the threshold the shop isn't a shop any more, and the frame around
          it has to go too — a dark sheet with one thing in it still reads as a
          catalogue if it's captioned "More kit on the land" and footed with a
          running total of what you have to spend. There's nothing to compare
          and nothing to budget: the only number that matters is on the bar. */}
      {sheet === "shop" && (
        <Sheet
          tone={lastPurchase ? "grave" : undefined}
          title={lastPurchase ? "Nothing left to sell you" : "Shop"}
          sub={
            lastPurchase
              ? "What's below was never stock."
              : WORLD_COPY[farm.world].shopSub
          }
          onClose={() => setSheet(null)}
          foot={
            lastPurchase ? undefined : (
              <>
                {/* The one number off the old ledger that had nowhere else to
                    go. It reads as a footnote to a catalogue rather than a
                    stat: what you've bought, under what you can spend. */}
                <span className="muted">{kitOnTheLand} on the land</span>
                <strong>{format(budget)}</strong>
              </>
            )
          }
        >
          <GrowPanel farm={farm} budget={budget} dispatch={dispatch} />
        </Sheet>
      )}
      {/* Damage, defence and the log of what caused it are one subject, and
          splitting them across two tabs meant reading the report in one place
          and paying for it in another.

          The title is the job; the subtitle names whatever's been doing the
          damage. That's keyed off `depth` rather than `world`, because so is
          the weather schedule: it's the deepest open world's table that blows
          at every farm, so the sheet reads the same on every side of the
          door. */}
      {sheet === "upkeep" && (
        <Sheet
          title="Upkeep"
          sub={`What ${culprit(farm)} broke, what it costs, and what stops it next time.`}
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong>{format(budget)}</strong>
            </>
          }
        >
          <Damage farm={farm} />
          <LandPanel farm={farm} budget={budget} dispatch={dispatch} />
          <h3 className="sheet-section">Field report</h3>
          <FarmFeed farm={farm} now={now} />
        </Sheet>
      )}
      {sheet === "seeds" && (
        <Sheet
          title="Seeds"
          sub={`Generation ${farm.generation}. Hand the farm down, or spend what the last one left you.`}
          onClose={() => setSheet(null)}
        >
          <LegacyPanel farm={farm} now={now} pendingDigs={pendingDigs} dispatch={dispatch} />
        </Sheet>
      )}
      {/* No tab, no button, no hint: hold the potato on the HUD. Everything in
          here is either parked or a cheat, and both are things you go looking
          for on purpose. */}
      {sheet === "back" && (
        <Sheet title="The back room" sub="Levers, not gameplay." onClose={() => setSheet(null)}>
          <BackRoom
            farm={farm}
            onVersus={() => onGo({ kind: "versus" })}
            onTitle={() => onGo({ kind: "home" })}
            onAbandon={() => {
              abandon();
              setSheet(null);
            }}
            dispatch={dispatch}
          />
        </Sheet>
      )}

      {report && <AwayReport report={report} onDismiss={dismissReport} />}

      {/* The first Tuber Singularity of a run: everything goes out, one sentence
          and one instruction arrive in the dark, and the farm fades back up
          underneath them. Deliberately says nothing about what's coming — the
          punchline has to land on a button the player chose to press, not on a
          label that gave it away. It eats taps for its seven seconds, which is
          the point.

          Every Singularity after that gets the same darkness for a quarter as
          long, over whatever's on screen, carrying the same instruction worded
          a little closer each time. */}
      {omen && (
        <div
          key={omen.n}
          className={omen.kind === "full" ? "omen-veil" : "omen-veil flash"}
          role="presentation"
        >
          {omen.kind === "full" ? (
            <>
              <p className="omen-line">The horizon isn't where you left it</p>
              <p className="omen-call">Keep going</p>
            </>
          ) : (
            <p className="omen-nudge">{omen.text}</p>
          )}
        </div>
      )}

      {/* And the thing they were warning about. The lights go out, and the
          one thing out in the dark is what this world is the inside of — the
          tuber, its eye, the glass under it — and you fall at it until one of
          its pixels is wider than the screen. On the other side is the real
          farm you've just bought, drawn full-screen and still settling, with
          the words over it. Then the veil lifts and it's the same farm in the
          app, so there's nothing to swap on the way out.

          It's over everything, including the shop it was bought from, and it
          eats every input for its ten seconds. */}
      {crossing && (
        <div key={crossing.n} className="crossing" role="presentation">
          <p>{WORLD_COPY[crossing.to].door}</p>
        </div>
      )}

      {cut && (
        <div className="converge" role="presentation">
          <div className="converge-place">
            <FarmScene farm={farm} hoard={budget} world={cut} onDig={() => {}} />
          </div>
          <CutFall world={cut} ms={CONVERGE_MS} />
          {/* In the order they arrive: the sentence in the dark, the reveal on
              the frame you can see where you are, and the card last, still up
              as the farm comes back underneath it. */}
          <div className="converge-words">
            <p className="converge-line">{WORLD_COPY[cut].cut?.line}</p>
            <p className="converge-call">{WORLD_COPY[cut].cut?.call}</p>
            <p className="converge-title">{WORLD_COPY[cut].cut?.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Versus (the older prototype) ---

function Match({
  runtime,
  onExit,
  onRematch,
}: {
  runtime: MatchRuntime;
  onExit: () => void;
  /** Absent online, where a rematch is a fresh challenge rather than a reset. */
  onRematch?: () => void;
}) {
  const { state, now, me, pendingClicks, over, error, click, dispatch } = runtime;
  useSpaceToDig(click);

  const table = standings(state, now);
  const opponentIds = state.order.filter((id) => id !== me.id);
  const opponents = opponentIds.map((id) => state.players[id]!);
  // Unflushed clicks count (`dispatch` banks them first). `clickGain`, not `clickYield`: a drained bucket makes a dig worth less.
  const budget = useMemo(
    () => Y.add(me.stock, clickGain(me, now, pendingClicks)),
    [me, now, pendingClicks],
  );
  const yourScore = table.find((s) => s.player.id === me.id)?.score ?? 0;
  const timeLeft = state.startedAt + state.config.durationMs - now;

  return (
    <div className="app">
      {/* Pinned, because the two numbers you actually play against — the clock
          and what's in the bank — are otherwise scrolled off the moment you go
          shopping, which is exactly when you need them. */}
      <header className="topbar">
        <div className="brand">
          Yield, <span>Inc.</span>
        </div>
        <div className={`clock ${timeLeft < seconds(30) ? "urgent" : ""}`}>
          {formatDuration(timeLeft)}
        </div>
        <div className="topbar-bank">
          <span className="topbar-bank-value">{format(budget)}</span>
          <span className="topbar-bank-label">to spend</span>
        </div>
        <div className="topbar-right">
          <span className="muted rule">
            {state.config.scoring === "on_hand" ? "biggest pile wins" : "most harvested wins"}
          </span>
          <button className="ghost" onClick={onExit}>
            Leave
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main className="grid">
        <Farm
          state={state}
          me={me}
          now={now}
          pendingClicks={pendingClicks}
          onClick={click}
          disabled={over}
        />
        <Shop me={me} now={now} budget={budget} opponents={opponents} dispatch={dispatch} />
        <div className="sidebar">
          <Opponents state={state} now={now} ids={opponentIds} yourScore={yourScore} />
          <Feed state={state} />
        </div>
      </main>

      {over && (
        <div className="overlay">
          <div className="result">
            <h2>{table[0]?.player.id === me.id ? "You win." : `${table[0]?.player.name} wins.`}</h2>
            <ol className="final">
              {table.map((s) => (
                <li key={s.player.id}>
                  <span>{s.player.name}</span>
                  <strong>{format(s.score)}</strong>
                </li>
              ))}
            </ol>
            <div className="result-actions">
              {onRematch && (
                <button className="start" onClick={onRematch}>
                  Rematch
                </button>
              )}
              <button className="ghost" onClick={onExit}>
                {onRematch ? "Change setup" : "Back to the lobby"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A match against the local bot loop. */
function BotMatch({ setup, onExit }: { setup: MatchSetup; onExit: () => void }) {
  const runtime = useMatch(setup);
  return <Match runtime={runtime} onExit={onExit} onRematch={runtime.restart} />;
}

// A match against a person, folded out of the command log. Same screen as the bot, plus a pre-log wait and a non-clock ending.
function OnlineMatch({
  row,
  meId,
  onExit,
}: {
  row: MatchRow;
  meId: string;
  onExit: (row: MatchRow) => void;
}) {
  const runtime = useOnlineMatch(row, meId);
  if (!runtime.ready) {
    return (
      <div className="lobby">
        <h1>
          Yield, <span>Inc.</span>
        </h1>
        <p className="tagline">Catching up on the match…</p>
        {runtime.error && <div className="error">{runtime.error}</div>}
        <TitleScene />
        <div className="home-aside">
          <button className="ghost" onClick={() => onExit(row)}>
            Back
          </button>
        </div>
      </div>
    );
  }
  return <Match runtime={runtime} onExit={() => onExit(row)} />;
}

// The versus mode, and the only place the app talks to the network. Sign-in lives here so solo players never get a user made.
function Versus({ onLeave, invite }: { onLeave: () => void; invite?: string | null }) {
  const lobby = useLobby();
  const [inMatch, setInMatch] = useState<
    { kind: "bot"; setup: MatchSetup } | { kind: "online"; row: MatchRow } | null
  >(null);

  // An invite link walks itself in: anonymous sign-in has happened by the time `me` exists, and the code is spent on arrival.
  const walkedIn = useRef(false);
  useEffect(() => {
    if (walkedIn.current || !invite || !lobby.me) return;
    walkedIn.current = true;
    // A join code is good once; scrub it from the address bar so a refresh does not error.
    window.history.replaceState(null, "", window.location.pathname);
    void joinByCode(invite).then(
      (row) => setInMatch({ kind: "online", row }),
      // A dead link lands in the lobby holding the reason.
      (e) => lobby.setError(errorText(e)),
    );
  }, [invite, lobby.me, lobby.setError]);

  // A challenge accepted at the other end starts a match you never pressed a button for.
  useEffect(() => {
    if (!inMatch && lobby.live?.status === "active") {
      setInMatch({ kind: "online", row: lobby.live });
    }
  }, [inMatch, lobby.live]);

  if (inMatch?.kind === "bot") {
    return (
      <BotMatch
        key={`${inMatch.setup.durationMs}-${inMatch.setup.botProfile}-${inMatch.setup.scoring}`}
        setup={inMatch.setup}
        onExit={() => setInMatch(null)}
      />
    );
  }
  if (inMatch?.kind === "online" && lobby.me) {
    return (
      <OnlineMatch
        key={inMatch.row.id}
        row={inMatch.row}
        meId={lobby.me.id}
        onExit={(row) => {
          // Leaving a live match is forfeiting it; saying so stops the lobby walking you back in.
          void abandon(row.id);
          setInMatch(null);
          lobby.refresh();
        }}
      />
    );
  }

  return (
    <VersusLobby
      lobby={lobby}
      bots={BOT_ROSTER}
      botProfile={BOT_ROSTER[0]!.id}
      onBot={(profile, terms) =>
        setInMatch({
          kind: "bot",
          setup: {
            playerName: lobby.me?.displayName ?? "You",
            durationMs: terms.durationMs,
            botProfile: profile as MatchSetup["botProfile"],
            scoring: terms.scoring,
          },
        })
      }
      onEnter={(row) => setInMatch({ kind: "online", row })}
      onBack={onLeave}
    />
  );
}

// The invite link, read once at boot. Query param, not a path: no router, and `/play/ABCD` would 404 cold.
function inviteCode(): string | null {
  const code = new URLSearchParams(window.location.search).get("join");
  return code ? code.trim().toUpperCase() : null;
}

export function App() {
  const [invite] = useState(inviteCode);
  // An invite outranks both the farm and the splash: they came to play a specific person.
  const [screen, setScreen] = useState<Screen>(() =>
    invite ? { kind: "versus" } : hasSavedFarm() ? { kind: "farm" } : { kind: "home" },
  );

  switch (screen.kind) {
    case "farm":
      return <Homefarm onGo={setScreen} />;
    case "versus":
      return <Versus invite={invite} onLeave={() => setScreen({ kind: "farm" })} />;
    default:
      return <Home onGo={setScreen} />;
  }
}
