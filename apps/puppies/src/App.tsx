import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { format, solo } from "@clickers/sim";

import { clockSkew, setClockSkew } from "./clock.js";
import { AwayReport } from "./components/AwayReport.js";
import { CutFall } from "./components/CutFall.js";
import { Damage } from "./components/Damage.js";
import { MillFeed } from "./components/MillFeed.js";
import {
  MillScene,
  TitleScene,
  type MillSceneHandle,
} from "./components/MillScene.js";
import {
  GrowPanel as MillGrowPanel,
  LandPanel,
  LegacyPanel,
} from "./components/MillShop.js";
import { PxIcon } from "./components/PxIcon.js";
import { Sheet } from "./components/Sheet.js";
import { hasSavedMill, useMill } from "./useMill.js";
import { WORLD_COPY, culprit } from "./worlds.js";
import { Num, Coins } from "./components/Coin.js";

type Screen = { kind: "home" } | { kind: "puppies" };

// Space always whistles; without the blur it would re-fire the last-clicked shop button.
function useSpaceToWhistle(whistle: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (el && el.tagName === "BUTTON") el.blur();
      e.preventDefault();
      whistle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [whistle, enabled]);
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

// The splash; seen once. Once you have a mill the app opens straight onto it.
function Home({ onGo }: { onGo: (screen: Screen) => void }) {
  const returning = hasSavedMill();
  return (
    <div className="lobby">
      <h1>
        Puppy <span>Mill</span>
      </h1>
      <p className="tagline">
        Breed chihuahuas. The weather will have opinions about that.
      </p>

      {/* Somebody's mill, running. A title screen for a game about a place
          shouldn't be a page of type. */}
      <TitleScene />

      <button className="start" onClick={() => onGo({ kind: "puppies" })}>
        {returning ? "Back to your mill" : "Start your mill"}
      </button>
      <p className="muted small home-note">
        A mill you keep. It runs while you're gone — and so does everything that's wrong with it.
      </p>
    </div>
  );
}

// --- The homestead ---

// Sheets, named for what is inside them. `back` is not on the bar.
type MillSheet = "shop" | "upkeep" | "papers" | "back";

const TAUGHT_KEY = "puppy-mill:taught-tap";

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

// Omen length, blackout to last frame of the mill returning. Kept in step with the `omen-veil` keyframes.
const OMEN_MS = 7600;

// Short omen for every Singularity after the first of a run: one dark pull with a single line in it.
const OMEN_FLASH_MS = 1900;

// The Convergence: sky to blanket. Timings live in the `converge-*` keyframes as percentage offsets of this.
// `FOLD_SWAP_MS` keeps the canvas from spending the arrival while this is over the top of it.
const CONVERGE_MS = 9600;

// When the canvas swaps to the inside mill. `converge-veil` is opaque from 8% to 92%; this sits inside that.
const FOLD_SWAP_MS = Math.round(CONVERGE_MS * 0.3);

// A walk between open worlds, or back into one this line has already been to: a dip to dark and out, not a cut.
// The canvas swaps at the darkest frame. Kept in step with the `walk` keyframes.
const WALK_MS = 700;
const WALK_SWAP_MS = Math.round(WALK_MS * 0.45);

// The short omen's line: same encouragement, worded closer each time. Only asked before the fold.
function omenNudge(mill: solo.SiteState): string {
  const p = solo.convergenceProgress(mill);
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

// The back room: dev levers. Reached only by holding the HUD puppy.
// A lever earns a place only if it reaches a state you cannot otherwise get to in under a minute.
function BackRoom({
  mill,
  onTitle,
  onAbandon,
  dispatch,
}: {
  mill: solo.SiteState;
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
          Moves the mill's idea of now, and resolves the gap the way a closed tab does. Sticks across
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
              Running {formatSkew(skew)} ahead of the wall clock. Putting it back rebases the mill
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
          Real whistles, so they respect every multiplier you own — and they will absolutely ruin your
          save's pacing.
        </p>
        <div className="choices">
          {([
            ["+100 whistles", 100],
            ["+10k whistles", 10_000],
            ["+1M whistles", 1_000_000],
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
          kit and a dirty bedding bar without waiting for the sky.
        </p>
        <button className="ghost" onClick={() => dispatch({ type: "dev_weather" })}>
          Send the next event
        </button>
      </section>

      <section>
        <h3>Pedigree</h3>
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
        <h3>How far in</h3>
        <p className="muted small">
          Opens every world up to the one you pick without the purchases, so without the cuts — to
          watch one, buy its gate. Going back strips the kit that only exists past the line and puts
          the gates back on the shelf. The yard and this run's output are untouched.
        </p>
        <div className="choices depth-row">
          {solo.WORLDS.map((w, depth) => (
            <button
              key={w}
              className={mill.depth === depth ? "ghost on" : "ghost"}
              disabled={mill.depth === depth}
              onClick={() => dispatch({ type: "dev_depth", depth })}
            >
              {WORLD_COPY[w].door}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Start over</h3>
        <p className="muted small">
          Not a hand-down. This keeps nothing — not the papers, not the generation, not the fold.
        </p>
        <div className="choices">
          <button className="ghost" onClick={onTitle}>
            Back to the title
          </button>
          <button
            className="ghost danger"
            onClick={() => {
              if (window.confirm("Shut the whole line down? This keeps nothing — not even papers.")) {
                onAbandon();
              }
            }}
          >
            Shut the whole line down
          </button>
        </div>
      </section>
    </div>
  );
}

// The homestead screen: HUD, the mill filling everything between, one verb at the bottom. Everything else is a sheet.
function Homefarm({ onGo }: { onGo: (screen: Screen) => void }) {
  const { mill, now, report, dismissReport, budget, pendingWhistles, error, whistle, dispatch, abandon } =
    useMill();
  const [sheet, setSheet] = useState<MillSheet | null>(null);
  const sceneRef = useRef<MillSceneHandle>(null);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const popId = useRef(0);
  const [taught, setTaught] = useState(() => wasSeen(TAUGHT_KEY));
  // Hung off the count going up, not a threshold: first of a run gets the whole cut, the rest the short one.
  // `n` restarts the animation when two land close together.
  const [omen, setOmen] = useState<{ kind: "full" | "flash"; n: number; text: string } | null>(
    null,
  );
  const omenId = useRef(0);
  const singularities = mill.producers.singularity ?? 0;
  // Ref, not effect dep: the line depends on a mill that changes every tick.
  const nudge = useRef("");
  nudge.current = omenNudge(mill);
  // Same reason.
  const folded = useRef(mill.depth >= 1);
  folded.current = mill.depth >= 1;
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
    const full = had === 0 && mill.reached === 0;
    setOmen({ kind: full ? "full" : "flash", n: omenId.current++, text: nudge.current });
    // Close the shop so the sky is seen; a cut behind a sheet is a cut nobody watched. A later generation
    // has watched it, and is buying them by the ten.
    if (mill.reached === 0) setSheet(null);
    const id = setTimeout(() => setOmen(null), full ? OMEN_MS : OMEN_FLASH_MS);
    return () => clearTimeout(id);
  }, [singularities]);

  // The Convergence, same shape: an answer to a purchase, seeded from first render so an open save reopens open.
  // Which world's cut is playing. Same overlay for all of them, different words and colours.
  const [crossing, setCrossing] = useState<solo.World | null>(null);
  const converging = crossing !== null;
  // Which mill the canvas draws while the trip holds it back. Null once swapped, and forever after.
  const [heldWorld, setHeldWorld] = useState<solo.World | null>(null);
  const wasDepth = useRef(mill.depth);
  const wasReached = useRef(mill.reached);
  // Where you stood when you bought the gate, which needn't be the deepest open world.
  const wasWorld = useRef(mill.world);
  // The short way between worlds: which one, and `n` to restart the dip when two land close together.
  const [walk, setWalk] = useState<{ to: solo.World; n: number } | null>(null);
  const walkId = useRef(0);
  const walkTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => walkTimers.current.forEach(clearTimeout), []);
  // `then` runs at the darkest frame — a warp, or the held mill letting go.
  const walkTo = useCallback((to: solo.World, then: () => void) => {
    walkTimers.current.forEach(clearTimeout);
    setWalk({ to, n: walkId.current++ });
    walkTimers.current = [
      setTimeout(then, WALK_SWAP_MS),
      setTimeout(() => setWalk(null), WALK_MS),
    ];
  }, []);
  // Layout effect: the purchase and the world it moves you to land in the same render, so a plain effect lets a frame through.
  useLayoutEffect(() => {
    const was = wasDepth.current;
    const reached = wasReached.current;
    wasDepth.current = mill.depth;
    wasReached.current = mill.reached;
    const stood = wasWorld.current;
    const arrived = solo.WORLDS[mill.depth];
    // One world further, and standing in it: a gate was bought. The back-room lever opens without moving you, so no cut.
    if (mill.depth !== was + 1 || !arrived || mill.world !== arrived) return;
    // Stay in the world you left until the dark has taken the screen.
    setHeldWorld(stood);
    // Somewhere an earlier generation has already been: the way back in, not the revelation. The walk draws over
    // the shop, which stays open on the new world's ladder.
    if (mill.depth <= reached) {
      walkTo(arrived, () => setHeldWorld(null));
      return;
    }
    setSheet(null);
    setCrossing(arrived);
    const swap = setTimeout(() => setHeldWorld(null), FOLD_SWAP_MS);
    const id = setTimeout(() => setCrossing(null), CONVERGE_MS);
    return () => {
      clearTimeout(id);
      clearTimeout(swap);
      setHeldWorld(null);
    };
  }, [mill.depth]);
  // After the effect above, so a gate purchase reads where you stood before it moved you.
  useLayoutEffect(() => {
    wasWorld.current = mill.world;
  }, [mill.world]);

  // Close the shop on the first of a kind: those are the purchases that reveal (new lot, new stratum) rather than add.
  // Only the first — throwing you out on every pen would make the shop unusable.
  const kinds = solo.SOLO_PRODUCERS.filter((p) => (mill.producers[p.id] ?? 0) > 0)
    .map((p) => p.id)
    .join(",");
  // Seeded from the first render so a loaded save does not read as just arrived.
  const hadKinds = useRef(kinds);
  useEffect(() => {
    const had = new Set(hadKinds.current.split(",").filter(Boolean));
    // Only in worlds no generation has got past: everywhere shallower, an earlier one has already seen it all.
    const arrived = kinds
      .split(",")
      .filter((id) => id && !had.has(id))
      .filter((id) => solo.WORLDS.indexOf(solo.SOLO_PRODUCER_BY_ID[id as solo.SoloProducerId].world) >= mill.reached);
    hadKinds.current = kinds;
    if (arrived.length === 0) return;
    setSheet(null);
  }, [kinds]);

  const perWhistle = solo.clickYield(mill);
  const rate = solo.currentRate(mill);
  // Upkeep mends every world from wherever you stand, so any of them lights the dot.
  const needsAttention =
    mill.condition < 1 || solo.SOLO_PRODUCERS.some((p) => solo.brokenCount(mill, p.id) > 0);
  // Shown the moment a hand-down would pay anything, and then never taken away (also covers saves from before the fold had a flag).
  const showPapers =
    mill.depth >= 1 || mill.heirlooms > 0 || mill.generation > 1 || solo.pendingHeirlooms(mill) > 0;

  // Right to left by how often you reach for it: Shop nearest the thumb, Pedigree at the far end so appearing later shuffles nothing.
  const nav: { id: MillSheet; label: string; icon: Parameters<typeof PxIcon>[0]["name"] }[] = [
    ...(showPapers ? ([{ id: "papers", label: "Pedigree", icon: "paw" }] as const) : []),
    // Named for what you do in it: nothing sends weather at a folded mill, so "Weather" stopped being true.
    { id: "upkeep", label: "Upkeep", icon: "wrench" },
    { id: "shop", label: "Shop", icon: "basket" },
  ];

  const onWhistle = useCallback((at?: { x: number; y: number }) => {
    whistle();
    sceneRef.current?.whistle(at);
    setTaught((was) => {
      if (was) return was;
      markSeen(TAUGHT_KEY);
      return true;
    });
    const id = popId.current++;
    setPops((p) => [...p.slice(-6), { id, text: `+${format(solo.clickYield(mill))}` }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
  }, [whistle, mill]);

  useSpaceToWhistle(onWhistle, report === null && sheet === null && omen === null && !converging && walk === null);

  const beddingPct = Math.round(mill.condition * 100);
  const hold = useHold(useCallback(() => setSheet("back"), []));
  // Keep where you're standing on screen when the strip is wider than the phone.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector(".on")?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [mill.world, mill.depth]);
  const kitOnTheLand = solo.SOLO_PRODUCERS.reduce((n, p) => n + (mill.producers[p.id] ?? 0), 0);

  // The shop has emptied itself for the Ur-Chihuahua; the bottom bar is where that announces itself.
  const gateWaiting = solo.gatePending(mill) !== null;
  const arrival = crossing ? WORLD_COPY[crossing].arrival : undefined;

  return (
    <div className="app mill-app">
      <header className="hud">
        {/* Hold the puppy for the back room. Nothing on screen says so, which
            is the point — everything back there is either parked or a cheat,
            and neither is worth a pixel of a bar you look at all game. */}
        <div className="hud-bank" {...hold}>
          {/* 28 and 14, not 22 and 16: the head is a 14px grid, so anything but
              a whole multiple of it lands some pixels a screen pixel wider than
              their neighbours and the eyes come out lopsided. */}
          <PxIcon name="puppy" size={28} />
          <div>
            <div className="hud-value"><Num n={budget} /></div>
            <div className="hud-label">in the yard</div>
          </div>
        </div>
        <div className="hud-side">
          <div className="hud-rate"><Num n={rate} />/s</div>
          <div className="bedding" title="Bedding health">
            <div className="bedding-track">
              <div
                className={`bedding-fill ${mill.condition < 0.75 ? "low" : ""}`}
                style={{ width: `${beddingPct}%` }}
              />
            </div>
            <span className={mill.condition < 1 ? "hurt" : "muted"}>bedding {beddingPct}%</span>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <MillScene
        ref={sceneRef}
        mill={mill}
        hoard={budget}
        world={heldWorld ?? mill.world}
        onWhistle={onWhistle}
      >
        {/* The whole scene whistles, which is not something a mill looks like it
            does. One sentence, once, and then never again. */}
        {!taught && <p className="tap-hint">Tap the mill to whistle</p>}
        {/* The worlds, top to bottom, on the mill rather than in a sheet:
            where you're standing is part of the picture, and so is getting
            somewhere else. A dot is a world with something broken in it. */}
        {mill.depth >= 1 && (
          <div className="world-strip" ref={strip}>
            {solo.openWorlds(mill).map((to) => (
              <button
                key={to}
                className={(heldWorld ?? mill.world) === to ? "on" : undefined}
                disabled={mill.world === to || walk !== null || converging}
                onClick={() => walkTo(to, () => dispatch({ type: "warp", to }))}
              >
                {WORLD_COPY[to].door}
                {solo.producersIn(to).some((p) => solo.brokenCount(mill, p.id) > 0) && (
                  <span className="world-dot" />
                )}
              </button>
            ))}
          </div>
        )}
      </MillScene>

      {/* The button is no longer the way you whistle — the scene is. What's left is
          the label that says so and the number that says how hard, which is the
          part worth keeping around. */}
      <div className="whistlebar">
        <button className="click" onClick={() => onWhistle()}>
          <PxIcon name="puppy" size={14} />
          <span className="whistle-label">Whistle</span>
          <span className="whistle-yield">+<Num n={perWhistle} /></span>
        </button>
        <div className="pops" aria-hidden>
          {pops.map((p) => (
            <span key={p.id} className="pop">
              <Coins text={p.text} />
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
                item.id === "shop" && gateWaiting ? "waiting" : "",
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

      {sheet === "shop" && (
        <Sheet
          title="Shop"
          sub={WORLD_COPY[mill.world].shop}
          onClose={() => setSheet(null)}
          foot={
            <>
              {/* The one number off the old ledger that had nowhere else to
                  go. It reads as a footnote to a catalogue rather than a
                  stat: what you've bought, under what you can spend. */}
              <span className="muted">{kitOnTheLand} on the land</span>
              <strong><Num n={budget} /></strong>
            </>
          }
        >
          <MillGrowPanel mill={mill} budget={budget} dispatch={dispatch} />
        </Sheet>
      )}
      {/* Damage, defence and the log of what caused it are one subject, and
          splitting them across two tabs meant reading the report in one place
          and paying for it in another.

          The title is the job; the subtitle names whatever's been doing the
          damage. That's keyed off the deepest open world rather than the one
          you're standing in, because so is the weather schedule: the deepest
          world's weather lands on every mill, so the sheet reads the same on
          every side of the door. */}
      {sheet === "upkeep" && (
        <Sheet
          title="Upkeep"
          sub={`What ${culprit(mill)} broke, what it costs, and what stops it next time.`}
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong><Num n={budget} /></strong>
            </>
          }
        >
          <Damage mill={mill} />
          <LandPanel mill={mill} budget={budget} dispatch={dispatch} />
          <h3 className="sheet-section">Yard report</h3>
          <MillFeed mill={mill} now={now} />
        </Sheet>
      )}
      {sheet === "papers" && (
        <Sheet
          title="Pedigree"
          sub={`Generation ${mill.generation}. Hand the mill down, or spend what the last one left you.`}
          onClose={() => setSheet(null)}
        >
          <LegacyPanel mill={mill} now={now} pendingWhistles={pendingWhistles} dispatch={dispatch} />
        </Sheet>
      )}
      {/* No tab, no button, no hint: hold the puppy on the HUD. Everything in
          here is either parked or a cheat, and both are things you go looking
          for on purpose. */}
      {sheet === "back" && (
        <Sheet title="The back room" sub="Levers, not gameplay." onClose={() => setSheet(null)}>
          <BackRoom
            mill={mill}
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

      {/* The first Chihuahua Singularity of a run: everything goes out, one sentence
          and one instruction arrive in the dark, and the mill fades back up
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
          one thing out in the dark is the dog this world is inside of — or its
          ball, its fire, its star — and you fall at it until one of its pixels
          is wider than the screen. On the other side is the real mill you've
          just bought, drawn full-screen and still settling, with the words
          over it. Then the veil lifts and it's the same mill in the app, so
          there's nothing to swap on the way out.

          It's over everything, including the shop it was bought from, and it
          eats every input for its ten seconds. */}
      {walk && (
        <div key={walk.n} className="walk" role="presentation">
          <p>{WORLD_COPY[walk.to].door}</p>
        </div>
      )}

      {crossing && arrival && (
        <div className="converge" role="presentation">
          <div className="converge-place">
            <MillScene mill={mill} hoard={budget} world={crossing} onWhistle={() => {}} />
          </div>
          <CutFall world={crossing} ms={CONVERGE_MS} />
          {/* In the order they arrive: the sentence in the dark, the reveal on
              the frame you can see where you are, and the card last, still up
              as the mill comes back underneath it. */}
          <div className="converge-words">
            <p className="converge-line">{arrival.line}</p>
            <p className="converge-call">{arrival.call}</p>
            <p className="converge-title">{arrival.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>(() => (hasSavedMill() ? { kind: "puppies" } : { kind: "home" }));

  return screen.kind === "puppies" ? <Homefarm onGo={setScreen} /> : <Home onGo={setScreen} />;
}
