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
  P,
  brokenRate,
  clickYield,
  format,
  formatDuration,
  rateAt,
  seconds,
  slowMultiplier,
  solo,
  standings,
} from "@mill/sim";

import { clockSkew, setClockSkew } from "./clock.js";
import { abandon, type MatchRow } from "./online/matches.js";
import { useLobby } from "./online/useLobby.js";
import { useOnlineMatch } from "./online/useOnlineMatch.js";
import { AwayReport } from "./components/AwayReport.js";
import { Conditions } from "./components/Conditions.js";
import { Damage } from "./components/Damage.js";
import { MillFeed } from "./components/MillFeed.js";
import {
  MatchScene,
  MillScene,
  TitleScene,
  type MillSceneHandle,
} from "./components/MillScene.js";
import {
  GrowPanel as MillGrowPanel,
  LandPanel,
  LegacyPanel,
} from "./components/MillShop.js";
import { Feed } from "./components/Feed.js";
import { VersusLobby } from "./components/Lobby.js";
import { Opponents } from "./components/Opponents.js";
import { PxIcon } from "./components/PxIcon.js";
import { Sheet } from "./components/Sheet.js";
import { DefendPanel, GrowPanel, SabotagePanel } from "./components/Shop.js";
import { hasSavedMill, useMill } from "./useMill.js";
import { BOTS, useMatch, type MatchRuntime, type MatchSetup } from "./useMatch.js";

/**
 * The opponents the lobby offers. `greedy` is missing on purpose — it exists as
 * a control group for the balance harness, not as somebody to play.
 */
const BOT_ROSTER = (["chill", "scrappy", "nasty"] as const).map((id) => ({
  id,
  name: BOTS[id]?.name ?? id,
  blurb: BOTS[id]?.blurb ?? "",
}));

type Screen = { kind: "home" } | { kind: "mill" } | { kind: "versus" };

/**
 * Space always whistles, so the shop stays a mouse-only surface. Without the blur,
 * space would re-fire whichever shop button you last clicked.
 */
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

/**
 * Press-and-hold, as the way into something that isn't advertised.
 *
 * Returns props to spread onto whatever you're holding. Deliberately not a
 * `<button>` — the back room is reached by holding the puppy on the HUD, and a
 * focusable control there would be a thing to tab into and press by accident,
 * announcing itself to exactly the players it's hidden from.
 *
 * Pointer events rather than touch or mouse ones, so this is the same code path
 * on a phone and a trackpad, and `setPointerCapture` so sliding a thumb off the
 * icon mid-hold doesn't silently cancel it. The timer is cleared on release,
 * leave and cancel — the last of which is what fires when the browser decides
 * the gesture was a scroll.
 */
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

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

/**
 * The splash, and nothing else. You see this once — the moment you have a mill,
 * the app opens straight onto it, because a homestead game whose front door is
 * a menu makes you ask for your mill every time instead of just being there.
 */
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

      <button className="start" onClick={() => onGo({ kind: "mill" })}>
        {returning ? "Back to your mill" : "Start your mill"}
      </button>
      <p className="muted small home-note">
        A mill you keep. It runs while you're gone — and so does everything that's wrong with it.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The homestead
// ---------------------------------------------------------------------------

/**
 * The things you can open, named after what's inside them.
 *
 * The old set was Grow / Land / Legacy / Report / Mill / House — six tabs, and
 * the first three were interchangeable-sounding words that didn't say which one
 * sold you a van and which one fixed it. These are the nouns the game
 * already uses on the panels themselves.
 *
 * "Books" used to be a fourth. It held a ledger of eight numbers, six of which
 * were already on the HUD or the whistle bar or the Pedigree sheet, plus a door to the
 * back room — so it was spending a quarter of the bottom bar to repeat itself.
 * What was actually only in there went to the sheet it belonged to: the damage
 * to Upkeep, next to the bill for it; the run's output to Pedigree, next to the
 * thing it buys. `back` is what's left, and it isn't on the bar at all.
 */
type MillSheet = "shop" | "upkeep" | "papers" | "back";

/** The one-sentence hint, which is worth showing once, ever. */
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

/**
 * How long the omen owns the screen, start of the blackout to the last frame of
 * the mill coming back. Kept in step with the `omen-veil` keyframes.
 *
 * It used to be fourteen seconds of text breathing over the sky, which is a long
 * time to hold a player still for one sentence — and because it was a label on
 * the scene rather than an event, buying the Singularity from an open shop meant
 * the whole thing played out behind the sheet.
 *
 * It's a cut now, and it's allowed to take its time, because it happens once a
 * run and it's the moment the run stops being a ladder: the lights go down, the
 * dark sits there long enough to be uncomfortable, the sentence arrives, and
 * only then the instruction. The mill comes back slowest of all.
 */
const OMEN_MS = 7600;

/**
 * And the same thing for every Singularity after the first of a run.
 *
 * Ten of them stand between the first one and the Ur-Chihuahua, and ten of the long
 * one would turn the best stretch of the ladder into a cutscene you tap through.
 * So the repeats keep the cut and lose the ceremony: one dark pull across the
 * screen and back, over whatever you were doing, with a single line in it that
 * says how much further there is to go.
 */
const OMEN_FLASH_MS = 1900;

/**
 * And the Convergence, which is the one the other two were only ever warning
 * about: the whole screen, from out under the sky to under the blanket.
 *
 * Ten seconds is longer than anything else in the game by a factor of three, and
 * it's the right length for exactly one thing. Everything else here is a run
 * that lasts days, and this fires once in it — the single moment the game has
 * been building toward since the first Chihuahua Singularity stained the sky. The
 * Singularity omen is seven seconds of the lights going out to say *something is
 * coming*; if the thing that arrives is the same blackout with different words,
 * the promise wasn't kept.
 *
 * So this one isn't a veil over the mill. It's the trip: the dark, then the
 * Ur-Chihuahua itself out there in it, then the thing turning over and settling
 * — and the whole world going with it, down under the hem and into the warm.
 * `FOLD_SWAP_MS` is what keeps the canvas from spending that arrival while this
 * is over the top of it.
 *
 * Timings live in the `converge-*` keyframes, all of them on this duration with
 * percentage offsets, so the beats can't drift out of step with each other.
 */
const CONVERGE_MS = 9600;

/**
 * When, during the trip, the canvas underneath swaps to the inside mill.
 *
 * The purchase moves you inside on the frame it lands, and the trip that earns
 * that takes nine seconds — so for the first of them the screen was showing the
 * place the cut hadn't taken you to yet, right through the fade-up. The arrival
 * before the journey, and the one reveal in the game that can only happen once.
 *
 * So the canvas holds the mill you're standing on, and swaps here. `converge-veil`
 * is fully opaque from 8% of the duration to 92%, and this sits comfortably
 * inside that: the sky is the last thing you see going into the dark, the hem
 * is the first thing you see coming out of it, and the cut in between is the
 * only account of how you got from one to the other.
 */
const FOLD_SWAP_MS = Math.round(CONVERGE_MS * 0.3);

/**
 * What the short one says, which is the same thing the long one said and then
 * increasingly less patiently.
 *
 * The whole tier is a countdown to the Ur-Chihuahua and nothing in the shop says
 * so — the price tag goes up, the rate goes up, and the one purchase that's
 * actually a threshold looks exactly like the nine before it. This is the
 * readout: the same encouragement, worded closer each time, so a player who's
 * bought eight of them can feel that it's nearly something without being told
 * what.
 *
 * Only ever asked before the fold — see the effect that reads it. Past the fold
 * there is nothing left to hint at.
 */
function omenNudge(mill: solo.MillState): string {
  const p = solo.convergenceProgress(mill);
  if (p >= 1) return "It's in reach";
  if (p >= 0.7) return "Nearly";
  if (p >= 0.4) return "Closer than it was";
  return "Keep going";
}

const HOUR_MS = 3_600_000;

/**
 * The sim's `formatDuration` is m:ss, which is right for a weather countdown and
 * useless for a skew that's routinely a week. Days and hours, no seconds.
 */
function formatSkew(msAhead: number): string {
  const hours = Math.round(msAhead / HOUR_MS);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return [d ? `${d}d` : "", h || !d ? `${h}h` : ""].filter(Boolean).join(" ");
}

/**
 * Everything that isn't the mill: the parked head-to-head prototype, and the
 * levers that exist for looking at the game rather than playing it.
 *
 * Reached by holding the puppy on the HUD and by nothing else. It used to be
 * the back half of a tab on the bottom bar, which meant a quarter of the most
 * valuable strip of the screen was pointing at three cheat buttons.
 *
 * What's in here is chosen by one rule: a lever earns its place if it reaches a
 * state you can't otherwise get to in under a minute. Everything the game shows
 * you is a function of time, money, damage, papers, or which side of the fold
 * you're on — so those are the five knobs, and there isn't a sixth.
 */
function BackRoom({
  mill,
  onVersus,
  onTitle,
  onAbandon,
  dispatch,
}: {
  mill: solo.MillState;
  onVersus: () => void;
  onTitle: () => void;
  onAbandon: () => void;
  dispatch: (cmd: solo.MillCommand) => void;
}) {
  // Read once per open rather than watched. Nothing else in the app can change
  // it, and a skew that re-rendered every tick would be a clock, which invites
  // reading it as one.
  const [skew, setSkew] = useState(() => clockSkew());
  const jump = (byMs: number) => {
    setClockSkew(clockSkew() + byMs);
    setSkew(clockSkew());
    // Nothing has to be dispatched: the tick loop calls `nowMs` and `advance`
    // resolves the whole gap exactly, weather and all, the same way it resolves
    // a closed tab. That's the entire reason the lever is a clock skew and not
    // a sim command.
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
          ] as const).map(([label, whistles]) => (
            <button key={whistles} className="ghost" onClick={() => dispatch({ type: "dev_grant", whistles })}>
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
          {[10, 1_000, 100_000].map((papers) => (
            <button key={papers} className="ghost" onClick={() => dispatch({ type: "dev_papers", papers })}>
              +{papers.toLocaleString()}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>The horizon</h3>
        <p className="muted small">
          {mill.converged
            ? "Strips the kit that only exists in here and puts the Ur-Chihuahua back on the shelf, which leaves you one purchase short of the fold. Your yard and this run's output are untouched."
            : "Folds it without the purchase, so without the animation. To watch that, buy the Ur-Chihuahua."}
        </p>
        <button
          className="ghost"
          onClick={() => dispatch({ type: "dev_fold", converged: !mill.converged })}
        >
          {mill.converged ? "Put the sky back" : "Fold it now"}
        </button>
      </section>

      <section>
        <h3>Versus a bot</h3>
        <p className="muted small">
          The older head-to-head prototype: two mills, one clock, and upgrades that reach across the
          table. Parked, but it still runs.
        </p>
        <button className="ghost" onClick={onVersus}>
          Open the lobby
        </button>
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

/**
 * The homestead screen: a HUD you can read at a glance, the mill itself filling
 * everything between, and one verb at the bottom. Everything else is a sheet.
 *
 * The old layout put the mill's whole state in three columns of text and the
 * mill itself nowhere. Now the two numbers you actually play against — what
 * you've built and what you're holding — are the picture, and the panels are
 * where you go to change them.
 */
function Homefarm({ onGo }: { onGo: (screen: Screen) => void }) {
  const { mill, now, report, dismissReport, budget, pendingWhistles, error, whistle, dispatch, abandon } =
    useMill();
  const [sheet, setSheet] = useState<MillSheet | null>(null);
  const sceneRef = useRef<MillSceneHandle>(null);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const popId = useRef(0);
  const [taught, setTaught] = useState(() => wasSeen(TAUGHT_KEY));
  // The only nudge in the game. The first Chihuahua Singularity is where the run
  // stops being "buy the next rung" and starts being a climb toward something,
  // and nothing on the screen said so — the ceiling has begun bleeding through
  // the sky by now, but a player who hasn't seen the fold before has no reason
  // to read that as a promise rather than as a sunset.
  //
  // Hung off the count going up rather than off a threshold or a once-ever flag,
  // so it's an answer to a purchase: the first of a run gets the whole cut, and
  // every one after it gets the short version. `n` restarts the animation when
  // two land close together — same element, so without it the second is silent.
  const [omen, setOmen] = useState<{ kind: "full" | "flash"; n: number; text: string } | null>(
    null,
  );
  const omenId = useRef(0);
  const singularities = mill.producers.singularity ?? 0;
  // Held in a ref rather than in the effect's deps: the line depends on a mill
  // that changes every tick, and the effect should run when a Singularity is
  // bought, not when a puppy is grown.
  const nudge = useRef("");
  nudge.current = omenNudge(mill);
  // Same, and for the same reason: whether the horizon has closed is a fact
  // about the mill, not a reason to re-run this.
  const folded = useRef(mill.converged);
  folded.current = mill.converged;
  // Seeded from the first render, so opening a save that already has a sky full
  // of them is not eleven purchases' worth of news.
  const hadSingularities = useRef(singularities);
  useEffect(() => {
    const had = hadSingularities.current;
    hadSingularities.current = singularities;
    // Prestige takes them all away again, and that isn't an omen.
    if (singularities <= had) return;
    // And past the fold it isn't an omen either. The whole point of the cut is
    // that something is coming — it's a warning, worded a little closer each
    // time, about a horizon you haven't reached yet. Once you've been inside the
    // puppy it has already arrived, and a Singularity bought from the mill
    // upstairs is just the next rung on the ladder: darkening the screen to
    // promise it again is the game teasing you with something you own.
    if (folded.current) return;
    const full = had === 0;
    setOmen({ kind: full ? "full" : "flash", n: omenId.current++, text: nudge.current });
    // The purchase happens in the shop, and the point of the omen is the sky.
    // Every one of them puts you back on the mill for it, short version
    // included — a cut that plays out behind the sheet you bought it from is a
    // cut nobody watched, and the sky answering a Singularity is the only thing
    // that says the tier is going anywhere. Reopening the shop is a tap; ten of
    // these arriving unseen is the whole tier saying nothing.
    setSheet(null);
    const id = setTimeout(() => setOmen(null), full ? OMEN_MS : OMEN_FLASH_MS);
    return () => clearTimeout(id);
  }, [singularities]);

  // The Convergence. Same shape as the omen and for the same reason: it's an
  // answer to a purchase, not a state the mill is in. Seeded from the first
  // render so a folded save reopens as a folded mill rather than as the best
  // ten seconds of the run, spent on a page load.
  const [converging, setConverging] = useState(false);
  // Which mill the canvas is drawing, while the trip is holding it back. Null
  // once the swap has happened, and null forever after — from then on the world
  // you're standing in is the world you can see.
  const [heldWorld, setHeldWorld] = useState<solo.World | null>(null);
  const wasConverged = useRef(mill.converged);
  // A layout effect rather than an ordinary one: the purchase and the world it
  // moves you to land in the same render, so anything that waits until after the
  // paint has already let a frame of the inside mill through.
  useLayoutEffect(() => {
    const was = wasConverged.current;
    wasConverged.current = mill.converged;
    if (!mill.converged || was) return;
    // It's bought from the shop, and the shop is the last thing that should be
    // on screen for it.
    setSheet(null);
    setConverging(true);
    // Stay out under the sky until the dark has taken the screen.
    setHeldWorld("outside");
    const swap = setTimeout(() => setHeldWorld(null), FOLD_SWAP_MS);
    const id = setTimeout(() => setConverging(false), CONVERGE_MS);
    return () => {
      clearTimeout(id);
      clearTimeout(swap);
    };
  }, [mill.converged]);

  // And the small version of the same rule, for every purchase that puts
  // something in the picture that wasn't there before.
  //
  // The first of a kind is the only purchase that *reveals* rather than adds:
  // outside, a new lot opens at the back of the land and the kit goes up in
  // scaffolding; inside, a first machine on a new stratum breaks the floor open
  // and drops the shaft another band. Both of those animate for a second or two
  // and both of them are bought from a sheet that covers the entire mill, so
  // until now the answer to the most interesting purchases in the game was a
  // number changing on the row you tapped.
  //
  // Deliberately *only* the first of a kind. Every subsequent one raises a
  // building too, and a shop that threw you out on each of the fifty pens you
  // buy in a run would make the shop unusable to save a second and a half of
  // scaffolding you've seen already.
  const kinds = solo.SOLO_PRODUCERS.filter((p) => (mill.producers[p.id] ?? 0) > 0)
    .map((p) => p.id)
    .join(",");
  // Seeded from the first render, so opening a save doesn't read its whole mill
  // as having just arrived.
  const hadKinds = useRef(kinds);
  useEffect(() => {
    const had = new Set(hadKinds.current.split(",").filter(Boolean));
    const arrived = kinds.split(",").filter((id) => id && !had.has(id));
    hadKinds.current = kinds;
    // A hand-down takes them all away, and that isn't a reveal — but everything
    // bought on the way back up is, which is the point of handing it down.
    if (arrived.length === 0) return;
    setSheet(null);
  }, [kinds]);

  const perWhistle = solo.clickYield(mill);
  const rate = solo.currentRate(mill);
  // Only what you can actually do something about from here. The dot is a call
  // to action, and repairs are per-world — a badge lit by kit broken on the
  // other mill sends you to a panel with nothing in it to press. What's broken
  // over there is still worth knowing, and the panel says so once you're in it.
  // Bedding is one number for both mills, so it counts wherever you're standing.
  const needsAttention =
    mill.bedding < 1 ||
    solo.producersIn(mill.world).some((p) => solo.brokenCount(mill, p.id) > 0);
  // Shown the moment a hand-down would pay anything, and then never taken away.
  //
  // This was held until the Convergence, on the reasoning that the first paper
  // landed a day or two short of the fold and a player who took that hint would
  // reset just before the payoff. But holding a whole mechanic behind the
  // endgame means a first save can't find out prestige exists, and the fold is
  // days of play to reach — that's a long time to be told nothing. The fix
  // belonged in `papersFor`, and it's there now: the first paper lands around the
  // fold rather than well before it, so an early reset costs a paper or two and
  // the trap this gate was guarding against mostly isn't one.
  //
  // Anyone who already has papers or has already handed a mill down keeps the tab
  // regardless of what this run has earned, which also covers a save that
  // converged and prestiged before `converged` existed as a flag.
  const showPapers =
    mill.converged || mill.papers > 0 || mill.generation > 1 || solo.pendingPapers(mill) > 0;

  // Right to left in order of how often you reach for it. The far left of a
  // bottom bar is the corner a thumb has to travel for, and Shop is where you
  // go every time you can afford anything — so it gets the near end, and Pedigree
  // slots in at the far end where appearing later doesn't shuffle the rest.
  const nav: { id: MillSheet; label: string; icon: Parameters<typeof PxIcon>[0]["name"] }[] = [
    ...(showPapers ? ([{ id: "papers", label: "Pedigree", icon: "paw" }] as const) : []),
    // Named for what you do in it rather than for what put you there. "Weather"
    // was the cause, and it stopped being true the moment the horizon closed —
    // nothing sends weather at a folded mill, and the tab still said so. Repairs,
    // the bedding and the buildings that blunt the next one are all the same job.
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

  useSpaceToWhistle(onWhistle, report === null && sheet === null && omen === null && !converging);

  const beddingPct = Math.round(mill.bedding * 100);
  const hold = useHold(useCallback(() => setSheet("back"), []));
  const kitOnTheLand = solo.SOLO_PRODUCERS.reduce((n, p) => n + (mill.producers[p.id] ?? 0), 0);

  // The shop has emptied itself for the Ur-Chihuahua. Worth knowing out here as
  // well as inside the sheet: the bottom bar is the only part of the game a
  // player sees without opening anything, so it's where the change announces
  // itself.
  const lastPurchase = solo.convergencePending(mill);

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
            <div className="hud-value">{format(budget)}</div>
            <div className="hud-label">in the yard</div>
          </div>
        </div>
        <div className="hud-side">
          <div className="hud-rate">{format(rate)}/s</div>
          <div className="bedding" title="Bedding health">
            <div className="bedding-track">
              <div
                className={`bedding-fill ${mill.bedding < 0.75 ? "low" : ""}`}
                style={{ width: `${beddingPct}%` }}
              />
            </div>
            <span className={mill.bedding < 1 ? "hurt" : "muted"}>bedding {beddingPct}%</span>
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
      </MillScene>

      {/* The button is no longer the way you whistle — the scene is. What's left is
          the label that says so and the number that says how hard, which is the
          part worth keeping around. */}
      <div className="whistlebar">
        <button className="whistle" onClick={() => onWhistle()}>
          <PxIcon name="puppy" size={14} />
          <span className="whistle-label">Whistle</span>
          <span className="whistle-yield">+{format(perWhistle)}</span>
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
              : mill.world === "inside"
                ? "What there is to work down here, and what makes it work harder."
                : "More kit on the land, and the upgrades that make it worth more."
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
          <MillGrowPanel mill={mill} budget={budget} dispatch={dispatch} />
        </Sheet>
      )}
      {/* Damage, defence and the log of what caused it are one subject, and
          splitting them across two tabs meant reading the report in one place
          and paying for it in another.

          The title is the job; the subtitle names whatever's been doing the
          damage. That's keyed off `converged` rather than `world`, because so is
          the weather schedule: once the horizon has closed nothing sends weather
          at either mill, so the sheet reads the same on both sides of the
          door. */}
      {sheet === "upkeep" && (
        <Sheet
          title="Upkeep"
          sub={`What ${mill.converged ? "the nest" : "the weather"} broke, what it costs, and what stops it next time.`}
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong>{format(budget)}</strong>
            </>
          }
        >
          {/* Which mill you're standing on heads the sheet that's about a mill.
              It used to be a lever in the back room, on the grounds that what it
              should look like out front is a question about the whole post-fold
              layout — but Upkeep is already the per-world screen. What you can
              build and what's broken both change when you step across, so the
              door belongs on top of them rather than three taps away with the
              cheats. */}
          {mill.converged && (
            <div className="choices halves world-door">
              {(["outside", "inside"] as const).map((to) => (
                <button
                  key={to}
                  className={mill.world === to ? "on" : ""}
                  // Disabled where you already are, rather than dispatching a
                  // warp the sim will refuse — a refusal is an error banner, and
                  // one that says "You're already there." over a button drawn as
                  // already-there is the game telling you off for agreeing.
                  disabled={mill.world === to}
                  onClick={() => {
                    dispatch({ type: "warp", to });
                    // The point of stepping across is to be standing there.
                    setSheet(null);
                  }}
                >
                  {to === "outside" ? "Out under the sky" : "Inside the nest"}
                </button>
              ))}
            </div>
          )}
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

      {/* And the thing they were warning about. The lights go out, the
          Ur-Chihuahua is out there in the dark, and then it turns around three
          times and lies down — and the camera goes under with it, through the
          hem and into the warm. The only cut in the game that moves rather than
          fades, because the reveal is a place and you have to be taken to it.

          It's over everything, including the shop it was bought from, and it
          eats every input for its ten seconds. What it lifts on is the inside
          of the nest: the purchase moves the mill there, so the canvas
          underneath has already swapped to the other scene by the time the
          words clear. The cut is the whole journey now — there's no second act
          waiting on the canvas for it to get out of the way of. */}
      {converging && (
        <div className="converge" role="presentation">
          <div className="converge-dog" />
          <div className="converge-warm" />
          {/* In the order they arrive. The sentence lands first, on the frame
              you come under the hem and can see where you are — the card is
              the name for what just happened to you, and naming it before it
              happens is a chapter heading on a thing you haven't read. It's
              also what's still up as the mill comes back underneath it. */}
          <div className="converge-words">
            <p className="converge-line">The ground was never ground</p>
            <p className="converge-call">You have always been under the blanket</p>
            <p className="converge-title">The Convergence</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Versus (the older prototype)
// ---------------------------------------------------------------------------

/** The sheets of a match, in the order they sit on the bar. */
type MatchSheet = "match" | "defend" | "sabotage" | "shop";

/**
 * A match, on the homestead's shell.
 *
 * Three bordered panels of text used to share the screen — your mill as a
 * column of numbers, the shop beside it, opponents and the log beside that —
 * which read as a spreadsheet of the game rather than the game. It's the same
 * sim; what changed is that the mill is the picture, the clock and the bank are
 * the only things pinned over it, and everything else is a sheet you open.
 */
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
  const [sheet, setSheet] = useState<MatchSheet | null>(null);
  const sceneRef = useRef<MillSceneHandle>(null);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const popId = useRef(0);

  const table = standings(state, now);
  const opponentIds = state.order.filter((id) => id !== me.id);
  const opponents = opponentIds.map((id) => state.players[id]!);
  // Clicks you've made but that haven't been flushed into the sim yet still
  // count — `dispatch` banks them before it spends, so this is honest.
  const budget = useMemo(
    () => P.add(me.puppies, P.mul(clickYield(me), pendingClicks)),
    [me, pendingClicks],
  );
  const yourScore = table.find((s) => s.player.id === me.id)?.score ?? 0;
  const bestRival = Math.max(0, ...table.filter((s) => s.player.id !== me.id).map((s) => s.score));
  const timeLeft = state.startedAt + state.config.durationMs - now;
  const perClick = clickYield(me);
  const rate = rateAt(me, now);
  const slow = slowMultiplier(me, now);
  const broken = brokenRate(me) > 0;

  const onWhistle = useCallback(
    (at?: { x: number; y: number }) => {
      if (over) return;
      click();
      sceneRef.current?.whistle(at);
      const id = popId.current++;
      setPops((p) => [...p.slice(-6), { id, text: `+${format(clickYield(me))}` }]);
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
    },
    [click, me, over],
  );
  useSpaceToWhistle(onWhistle, !over && sheet === null);

  // Where you stand, as a bar rather than a number: your share of the two
  // scores, so a match you're losing is visibly a bar under half.
  const share = yourScore + bestRival > 0 ? yourScore / (yourScore + bestRival) : 0.5;

  return (
    <div className="app mill-app">
      <header className="hud">
        <div className="hud-bank">
          <PxIcon name="puppy" size={28} />
          <div>
            <div className="hud-value">{format(budget)}</div>
            <div className="hud-label">to spend</div>
          </div>
        </div>
        {/* The one thing this game has that the homestead doesn't, and the
            reason every decision in it is made under pressure. */}
        <div className={`hud-clock ${timeLeft < seconds(30) ? "urgent" : ""}`}>
          {formatDuration(timeLeft)}
        </div>
        <div className="hud-side">
          <div className={`hud-rate ${slow < 1 ? "hurt" : ""}`}>{format(rate)}/s</div>
          {/* Sits exactly where the homestead's bedding meter does, and reads
              the same way: a bar you want full, with the number beside it. */}
          <div className="bedding lead" title="Your score against the best of them">
            <div className="bedding-track">
              <div
                className={`bedding-fill ${share < 0.5 ? "low" : ""}`}
                style={{ width: `${Math.round(share * 100)}%` }}
              />
            </div>
            <span className={share < 0.5 ? "hurt" : "muted"}>
              {yourScore >= bestRival ? "+" : "−"}
              {format(Math.abs(yourScore - bestRival))}
            </span>
          </div>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <MatchScene ref={sceneRef} me={me} hoard={budget} onWhistle={onWhistle}>
        <Conditions me={me} now={now} />
      </MatchScene>

      <div className="whistlebar">
        <button className="whistle" onClick={() => onWhistle()} disabled={over}>
          <PxIcon name="puppy" size={14} />
          <span className="whistle-label">Whistle</span>
          <span className="whistle-yield">+{format(perClick)}</span>
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
        {([
          { id: "match", label: "Match", icon: "clipboard" },
          { id: "sabotage", label: "Sabotage", icon: "cloud" },
          { id: "defend", label: "Defend", icon: "shield" },
          { id: "shop", label: "Shop", icon: "basket" },
        ] as const).map((item) => (
          <button
            key={item.id}
            className={item.id === "defend" && broken ? "alert" : undefined}
            onClick={() => setSheet(item.id)}
          >
            <PxIcon name={item.icon} size={20} />
            <span>{item.label}</span>
            {item.id === "defend" && broken && <span className="nav-dot" />}
          </button>
        ))}
      </nav>

      {sheet === "shop" && (
        <Sheet
          title="Shop"
          sub="More kit in the yard, and the upgrades that make it worth more."
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong>{format(budget)}</strong>
            </>
          }
        >
          <GrowPanel me={me} budget={budget} dispatch={dispatch} />
        </Sheet>
      )}
      {sheet === "sabotage" && (
        <Sheet
          title="Sabotage"
          sub="Reach across the table. Everything here is a puppy you didn't grow with."
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong>{format(budget)}</strong>
            </>
          }
        >
          <SabotagePanel me={me} budget={budget} opponents={opponents} dispatch={dispatch} />
        </Sheet>
      )}
      {sheet === "defend" && (
        <Sheet
          title="Defend"
          sub="What they broke, what it costs, and what stops it next time."
          onClose={() => setSheet(null)}
          foot={
            <>
              <span className="muted">To spend</span>
              <strong>{format(budget)}</strong>
            </>
          }
        >
          <DefendPanel me={me} now={now} budget={budget} dispatch={dispatch} />
        </Sheet>
      )}
      {/* The match itself: where everyone stands, what wins it, what's happened
          — and the way out, which is the only place it needs to be. A Leave
          button pinned to the bar all match is a button you press by accident. */}
      {sheet === "match" && (
        <Sheet
          title="The match"
          sub={`${formatDuration(Math.max(0, timeLeft))} left · ${
            state.config.scoring === "on_hand" ? "biggest pile wins" : "most raised wins"
          }`}
          onClose={() => setSheet(null)}
        >
          <Opponents state={state} now={now} ids={opponentIds} yourScore={yourScore} />
          <h3 className="sheet-section">Yard report</h3>
          <Feed state={state} />
          <div className="choices">
            <button className="ghost" onClick={onExit}>
              Leave the match
            </button>
          </div>
        </Sheet>
      )}

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
              <button className={onRematch ? "ghost" : "start"} onClick={onExit}>
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

/**
 * A match against a person, folded out of the command log.
 *
 * The screen is the same one the bot plays on — that's the whole point of the
 * runtime being an interface. What's different is that there's a moment before
 * the log has been read, and a way for the match to end that isn't the clock.
 */
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
          Puppies, <span>Inc.</span>
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

/**
 * The versus mode, and the only place the app talks to the network.
 *
 * Sign-in lives in here rather than in `App` on purpose: it's anonymous and
 * silent, but it still creates a user, and somebody who only ever plays their
 * own mill should never have one made for them.
 */
function Versus({ onLeave }: { onLeave: () => void }) {
  const lobby = useLobby();
  const [inMatch, setInMatch] = useState<
    { kind: "bot"; setup: MatchSetup } | { kind: "online"; row: MatchRow } | null
  >(null);

  // A challenge accepted at the other end starts a match you never pressed a
  // button for — without this the challenger sits in the lobby watching a race
  // they're already losing.
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
          // Leaving a live match is forfeiting it, and saying so in the row is
          // what stops the lobby walking you straight back into it.
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

export function App() {
  // A mill you already own is the app. The splash is for the one session where
  // you don't have one yet.
  const [screen, setScreen] = useState<Screen>(() =>
    hasSavedMill() ? { kind: "mill" } : { kind: "home" },
  );

  switch (screen.kind) {
    case "mill":
      return <Homefarm onGo={setScreen} />;
    case "versus":
      return <Versus onLeave={() => setScreen({ kind: "mill" })} />;
    default:
      return <Home onGo={setScreen} />;
  }
}
