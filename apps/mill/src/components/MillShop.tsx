import { useState } from "react";
import { P, format, solo, type Millis, type Puppies } from "@mill/sim";

import { producerArt, upgradePreview } from "../marks.js";
import { artUrl, type Art } from "../render/pixel.js";

type BuyQty = 1 | 10 | "max";

/**
 * The buy size outlives the sheet.
 *
 * The shop is opened dozens of times a session and it was resetting to x1 on
 * every one of them, so a player buying in tens spent the whole run re-picking
 * ten. It's a preference, not a state of the mill — so it lives beside the save
 * rather than in it, and a mill handed down or abandoned keeps it.
 */
const QTY_KEY = "puppy-mill:buy-qty";

function loadQty(): BuyQty {
  try {
    const raw = localStorage.getItem(QTY_KEY);
    if (raw === "10") return 10;
    if (raw === "max") return "max";
  } catch {
    // A blocked localStorage just means the toggle forgets. Harmless.
  }
  return 1;
}

function saveQty(qty: BuyQty): void {
  try {
    localStorage.setItem(QTY_KEY, String(qty));
  } catch {
    // See `loadQty`.
  }
}

function Row({
  name,
  blurb,
  cost,
  meta,
  affordable,
  onBuy,
  accent,
  art,
  best,
}: {
  name: string;
  blurb: string;
  /** A paper price is rendered differently from a puppy price. */
  cost: string;
  meta?: string;
  affordable: boolean;
  onBuy: () => void;
  accent?: string;
  /** The thing itself, as it currently stands on your mill. */
  art?: Art;
  /** Most rate per puppy on the board. A dot, and nothing more. */
  best?: boolean;
}) {
  return (
    <button
      className={`row ${accent ?? ""} ${affordable ? "" : "row-locked"}`}
      onClick={onBuy}
      disabled={!affordable}
    >
      {art && (
        <span className="row-art">
          <img className="pxicon" src={artUrl(art)} alt="" />
        </span>
      )}
      <span className="row-body">
        <span className="row-name">
          {name}
          {best && <span className="row-best" title="Best rate per puppy" aria-label="best value" />}
        </span>
        <span className="row-blurb">{blurb}</span>
      </span>
      <span className="row-right">
        <span className="row-cost">{cost}</span>
        {meta && <span className="row-meta">{meta}</span>}
      </span>
    </button>
  );
}

/**
 * How long the mill has to run before it can afford the thing, in words.
 *
 * Coarse on purpose, and never a ticking clock: this is a wait measured in
 * hours at the point it first appears, and a seconds-precise countdown on a
 * two-hour number is just a spinner. It rounds to the unit above so it's always
 * a little pessimistic — the wait shortening under you is the right surprise.
 */
function waitText(msLeft: number): string {
  if (!Number.isFinite(msLeft)) return "nothing is growing";
  const mins = Math.ceil(msLeft / 60000);
  if (mins <= 1) return "moments away";
  if (mins < 60) return `about ${mins} minutes away`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return `about ${hours}h${rest ? ` ${rest}m` : ""} away`;
}

/**
 * The shop with one thing in it, which is not a shop.
 *
 * The rest of this file is a catalogue: a row, an icon, a price, next. That
 * form is the problem here — the last purchase of the run rendered as row
 * thirteen reads as another sidegrade, and the player who's been buying rows
 * for three days has no reason to look up. So the whole surface changes at
 * once. The cream goes out, the thing itself is out there in the dark at the
 * top of the sheet, the price stops being a tag and becomes a bar you are
 * visibly filling, and the button doesn't say Buy.
 *
 * Deliberately says nothing about what it does — see the blurb's note in
 * content.ts. What it costs and how far off it is, is the whole readout.
 */
function Convergence({
  mill,
  budget,
  dispatch,
}: {
  mill: solo.MillState;
  budget: Puppies;
  dispatch: (cmd: solo.MillCommand) => void;
}) {
  const ur = solo.SOLO_UPGRADE_BY_ID[solo.CONVERGENCE_UPGRADE]!;
  const affordable = P.gte(budget, ur.cost);
  const held = Math.max(0, Math.min(1, budget / ur.cost));
  const rate = solo.currentRate(mill);
  const left = rate > 0 ? ((ur.cost - budget) / rate) * 1000 : Infinity;

  return (
    <div className="grave">
      <div className="grave-mark" aria-hidden />
      <h3 className="grave-name">{ur.name}</h3>
      <p className="grave-blurb">{ur.blurb}</p>
      <p className="grave-line">You have spent this whole run on the outside of it.</p>

      <div className="grave-price">
        <div className="grave-track">
          <div className="grave-fill" style={{ width: `${held * 100}%` }} />
        </div>
        <div className="grave-figures">
          <span>{format(budget)}</span>
          <span>{format(ur.cost)}</span>
        </div>
      </div>

      <button
        className="grave-take"
        disabled={!affordable}
        onClick={() => dispatch({ type: "buy_upgrade", upgrade: ur.id })}
      >
        {affordable ? "Take it" : "Not yet"}
      </button>
      {!affordable && <p className="grave-wait">{waitText(left)}</p>}
    </div>
  );
}

export function GrowPanel({
  mill,
  budget,
  dispatch,
}: {
  mill: solo.MillState;
  budget: Puppies;
  dispatch: (cmd: solo.MillCommand) => void;
}) {
  const [qty, setQtyRaw] = useState<BuyQty>(loadQty);
  const setQty = (next: BuyQty) => {
    saveQty(next);
    setQtyRaw(next);
  };

  // The last stretch. Once the tenth Chihuahua Singularity is standing, the shop
  // stops being a shop: every other rung and every other upgrade comes off the
  // board and the only thing left is the one that ends the climb.
  //
  // Nothing else in the game does this, and nothing else should. It's the one
  // moment where "what do I spend this on" has a wrong answer — the tier was a
  // countdown and the shop never said so, so a player at the threshold with the
  // usual twelve rows in front of them buys another Singularity and pushes the
  // Ur-Chihuahua another hour out. Emptying the board is the game finally saying
  // out loud that there's only one thing left to save for.
  if (solo.convergencePending(mill)) {
    return <Convergence mill={mill} budget={budget} dispatch={dispatch} />;
  }

  // One shop per world. The outside mill keeps its ladder and keeps earning
  // while you're inside, but you can't buy a Down Well for a bare yard or a
  // Grooming Rig for a room made of blanket — so the shop is the shop of the
  // place you're standing in, and warping is how you change it.
  const ladder = solo.producersIn(mill.world);
  const upgrades = solo.SOLO_UPGRADES.filter((u) => {
    if (mill.upgrades.includes(u.id) || !solo.isUnlocked(mill, u)) return false;
    // Tier upgrades belong to their rung's world. Everything else — the whistling
    // tools and the globals — lifts both mills at once and so is sold in both.
    const effect = u.effect;
    if (effect.kind !== "producer_mult") return true;
    return solo.SOLO_PRODUCER_BY_ID[effect.producer].world === mill.world;
  });

  const shelf = ladder.flatMap((prod, i) => {
    const owned = mill.producers[prod.id] ?? 0;
    const n = qty === "max" ? Math.max(1, solo.affordableCount(mill, prod.id, budget)) : qty;
    const cost = solo.producerCost(mill, prod.id, n);
    // What it would actually add to the mill as it stands, tired bedding and
    // all — the Down Well's rate moves with the bedding, so a clean-rate
    // quote would be advertising a machine you can't currently buy.
    const each = solo.producerRateEach(mill, prod.id);
    const broken = solo.brokenCount(mill, prod.id);

    // The ladder reveals itself a rung at a time, but the first rung is
    // always there or an empty shop greets you at zero puppies. Both
    // ladders read the same way, which is why the bottom of the inside
    // shop is priced to be affordable more or less on arrival: walking
    // into the new world and finding one thing you can buy is the same
    // welcome the first Puppy Pen gives you.
    const prev = ladder[i - 1];
    const visible =
      solo.isProducerAvailable(mill, prod.id) &&
      (i === 0 ||
        owned > 0 ||
        (prev !== undefined && (mill.producers[prev.id] ?? 0) > 0) ||
        P.gte(P.mul(budget, 3), prod.baseCost));
    if (!visible) return [];
    return [{ prod, owned, n, cost, each, broken }];
  });

  // One dot, on whichever rung buys the most rate per puppy right now. Only
  // among rows you can actually press — a badge on a price you can't meet is
  // trivia, not a nudge — and only when there's more than one to choose from.
  const buyable = shelf.filter((r) => P.gte(budget, r.cost) && r.each > 0);
  const best =
    buyable.length > 1
      ? buyable.reduce((a, b) => (b.cost / (b.each * b.n) < a.cost / (a.each * a.n) ? b : a)).prod.id
      : undefined;

  return (
    <>
      <div className="qty-toggle">
        <span className="muted">Buy</span>
        {([1, 10, "max"] as BuyQty[]).map((q) => (
          <button key={String(q)} className={qty === q ? "on" : ""} onClick={() => setQty(q)}>
            {q === "max" ? "max" : `x${q}`}
          </button>
        ))}
      </div>

      <div className="rows">
        {shelf.map(({ prod, owned, n, cost, each, broken }) => (
          <Row
            key={prod.id}
            name={`${prod.name}${owned ? ` ×${owned}` : ""}${broken ? ` (${broken} ${prod.hurt})` : ""}`}
            blurb={`${prod.blurb} +${format(each * n)}/s`}
            cost={format(cost)}
            meta={qty === "max" ? `buy ${n}` : undefined}
            affordable={P.gte(budget, cost)}
            best={prod.id === best}
            art={producerArt(mill, prod.id)}
            onBuy={() => dispatch({ type: "buy_producer", producer: prod.id, qty: n })}
          />
        ))}
      </div>

      <div className="rows">
        {upgrades.map((u) => (
          <Row
            key={u.id}
            accent="row-upgrade"
            name={u.name}
            blurb={u.blurb}
            cost={format(u.cost)}
            affordable={P.gte(budget, u.cost)}
            art={upgradePreview(mill, u)}
            onBuy={() => dispatch({ type: "buy_upgrade", upgrade: u.id })}
          />
        ))}
      </div>
    </>
  );
}

export function LandPanel({
  mill,
  budget,
  dispatch,
}: {
  mill: solo.MillState;
  budget: Puppies;
  dispatch: (cmd: solo.MillCommand) => void;
}) {
  const beddingBill = solo.beddingRestoreCost(mill);
  // Damage on the mill you're standing on. What broke on the other one is
  // waiting for you when you go back, which is the cost of keeping two places:
  // nothing down here can be fixed from up there.
  const damaged = solo
    .producersIn(mill.world)
    .filter((p) => solo.brokenCount(mill, p.id) > 0);
  const elsewhere = solo
    .producersIn(mill.world === "inside" ? "outside" : "inside")
    .reduce((n, p) => n + solo.brokenCount(mill, p.id), 0);

  // Everything above, as one payment. Only offered when there's more than one
  // thing to pay for — a "fix all" over a single row is the same button twice,
  // and the row it duplicates is the one that says what it's actually mending.
  const bill = solo.upkeepBill(mill);
  const jobs = damaged.length + (beddingBill > 0 ? 1 : 0);
  const brokenHere = damaged.reduce((n, p) => n + solo.brokenCount(mill, p.id), 0);
  // Only what this button actually buys back: the kit on this mill, quoted the
  // same way the individual repair rows quote it, plus the bedding if it's tired.
  // `brokenRate` would be wrong here — it counts the other mill's damage too,
  // and nothing you press from this world puts that right.
  const backHere =
    damaged.reduce(
      (r, p) => r + solo.brokenCount(mill, p.id) * solo.producerRateEach(mill, p.id),
      0,
    ) + (beddingBill > 0 ? solo.beddingLossRate(mill) : 0);

  return (
    <>
      {(damaged.length > 0 || beddingBill > 0) && (
        <>
          <p className="hint">
            Nothing here mends on its own. What the weather hurt stays hurt and tired bedding
            stays tired until you spend on it — that's what {mill.converged ? "the nest" : "the weather"}{" "}
            actually costs.
          </p>
          {jobs > 1 && (
            <div className="rows">
              <Row
                accent="row-repair row-fixall"
                name="Put everything right"
                blurb={`${
                  brokenHere > 0 && beddingBill > 0
                    ? `${brokenHere} broken and the bedding`
                    : brokenHere > 0
                      ? `${brokenHere} broken`
                      : "the bedding"
                } · restores +${format(backHere)}/s`}
                cost={format(bill)}
                affordable={P.gte(budget, bill)}
                onBuy={() => dispatch({ type: "fix_all" })}
              />
            </div>
          )}
          <div className="rows">
            {beddingBill > 0 && (
              <Row
                accent="row-repair"
                name="Restore the bedding"
                blurb={`Back to 100% from ${Math.round(mill.bedding * 100)}% · restores +${format(
                  solo.beddingLossRate(mill),
                )}/s`}
                cost={format(beddingBill)}
                affordable={P.gte(budget, beddingBill)}
                onBuy={() => dispatch({ type: "restore_bedding" })}
              />
            )}
            {damaged.map((prod) => {
              const broken = solo.brokenCount(mill, prod.id);
              const cost = solo.repairCost(mill, prod.id);
              // What it gives back as things stand, tired bedding included — the
              // same convention the Grow panel quotes. The *price* stays on the
              // clean rate, which is deliberate: repairs are billed against the
              // production restored at full health.
              const back = broken * solo.producerRateEach(mill, prod.id);
              return (
                <Row
                  key={`repair-${prod.id}`}
                  accent="row-repair"
                  name={`${prod.mend} ${prod.name}`}
                  blurb={`${broken} ${prod.hurt} · restores +${format(back)}/s`}
                  cost={format(cost)}
                  affordable={P.gte(budget, cost)}
                  onBuy={() => dispatch({ type: "repair", producer: prod.id })}
                />
              );
            })}
          </div>
        </>
      )}

      {elsewhere > 0 && (
        <p className="hint">
          {elsewhere} more {elsewhere === 1 ? "thing is" : "things are"} broken{" "}
          {mill.world === "inside" ? "out under the sky" : "down inside the puppy"}. You'll have to
          be standing there to put {elsewhere === 1 ? "it" : "them"} right.
        </p>
      )}

      <p className="hint">
        Buildings work whether you're here or not, which is the only kind of defence worth having
        against {mill.converged ? "something that stirs" : "weather that lands"} while the tab is
        closed. They never stop it outright.
      </p>
      <div className="rows">
        {solo.landsIn(mill.world).filter((land) => solo.isLandAvailable(mill, land.id)).map((land) => {
          const level = solo.landLevel(mill, land.id);
          const cost = solo.landCost(mill, land.id);
          const now = solo.mitigation(mill, land.role);
          return (
            <Row
              key={land.id}
              accent="row-defend"
              name={`${land.name}${level ? ` ×${level}` : ""}`}
              blurb={land.blurb}
              cost={format(cost)}
              meta={`${Math.round(now * 100)}% now`}
              affordable={P.gte(budget, cost)}
              onBuy={() => dispatch({ type: "buy_land", land: land.id })}
            />
          );
        })}
      </div>
    </>
  );
}

export function LegacyPanel({
  mill,
  now,
  pendingWhistles,
  dispatch,
}: {
  mill: solo.MillState;
  now: Millis;
  pendingWhistles: number;
  dispatch: (cmd: solo.MillCommand) => void;
}) {
  // Which world the next generation gets. Defaults to the one you're standing
  // in: coming back out is a thing you go and ask for.
  const [outside, setOutside] = useState(false);
  const pending = solo.pendingPapers(mill);
  const thisRun = solo.projectedRaised(mill, now);
  const multNow = 1 + solo.MULT_PER_UNSPENT_PAPER * mill.papers;
  const multAfter = 1 + solo.MULT_PER_UNSPENT_PAPER * (mill.papers + pending);

  return (
    <>
      <div className="legacy-head">
        <div>
          <div className="legacy-value">{mill.papers}</div>
          <div className="muted small">Pedigree Paper · ×{multNow.toFixed(2)} output</div>
        </div>
        {/* This run's output is what `pendingPapers` is computed from, so it
            reads here rather than in a ledger somewhere else — the number and
            the thing it buys in the same glance. Lifetime is the only figure in
            the game that never goes backwards, and it's the one that makes a
            hand-down feel like it added up to something. */}
        <div className="muted small legacy-runs">
          <div>This run {format(P.add(thisRun, P.mul(solo.clickYield(mill), pendingWhistles)))}</div>
          <div>Lifetime {format(mill.lifetimeRaised)}</div>
        </div>
      </div>

      <p className="hint">
        Pedigree do two jobs, and you can't have both. Held, every paper makes this mill and every
        mill after it produce more. Spent, they buy something permanent. Same choice as everything
        else here — one pile, competing uses.
      </p>

      {/* The only way back out of the puppy, and it's on the one screen where
          you're already deciding what the next generation inherits.

          The fold survives prestige because finding out you've always been
          inside the puppy is a thing that should happen to you once. But
          "once" turned into "once ever, on a save you keep for weeks" — the
          best ten seconds in the game, locked behind a flag, with the world
          you'd want to show someone gone for good. So: the horizon is part of
          what you hand down. Keep the ceiling, or give the next generation a
          sky and the climb back to it. */}
      {/* The tab used to be held until the fold so nobody could hand the mill
          down on the eve of the best thing in the game. It isn't any more, so
          the warning has to live somewhere — and a sentence is a better version
          of it than a locked door, because it tells you what you'd be giving up
          instead of pretending there's nothing there. */}
      {!mill.converged && (
        <p className="hint">
          The shop still has an end you haven't reached. Nothing stops you handing this mill down
          first, but the run that gets all the way there is worth having once.
        </p>
      )}

      {mill.converged && (
        <>
          <p className="hint">
            You can hand down the sky as well. Stay inside and the next generation starts under the
            ceiling, with the tiers that mill it already in the shop. Go back out and the horizon
            opens — no Hem Hollow, no Warm Heart, weather instead of the nest, and the
            Convergence to reach all over again.
          </p>
          <div className="choices halves">
            <button className={outside ? "" : "on"} onClick={() => setOutside(false)}>
              Inside the puppy
            </button>
            <button className={outside ? "on" : ""} onClick={() => setOutside(true)}>
              Back under the sky
            </button>
          </div>
        </>
      )}

      <div className="rows">
        <Row
          accent="row-upgrade"
          name={pending > 0 ? `Hand the mill down — +${pending} paper` : "Hand the mill down"}
          blurb={
            pending > 0
              ? `Clears everything this generation built. Output goes ×${multNow.toFixed(
                  2,
                )} → ×${multAfter.toFixed(2)}.${
                  mill.converged ? (outside ? " Starts outside the puppy." : " Starts inside the puppy.") : ""
                }`
              : "Not worth doing yet — grow this generation further first."
          }
          cost={pending > 0 ? `+${pending}` : "—"}
          affordable={pending > 0}
          onBuy={() => {
            const where =
              mill.converged && outside
                ? " The next mill starts outside the puppy, and everything above the fold goes with it."
                : "";
            if (
              window.confirm(
                `Hand the mill down? Everything this generation built is cleared.${where}`,
              )
            ) {
              dispatch({ type: "prestige", outside });
            }
          }}
        />
      </div>

      <div className="rows">
        {solo.PERKS.filter((perk) => solo.isPerkAvailable(mill, perk.id)).map((perk) => {
          const level = mill.perks[perk.id] ?? 0;
          const maxed = level >= perk.maxLevel;
          const cost = solo.perkCost(perk, level);
          return (
            <Row
              key={perk.id}
              accent="row-defend"
              name={`${perk.name}${level ? ` ×${level}` : ""}`}
              blurb={maxed ? "Fully grown." : perk.blurb}
              cost={maxed ? "—" : `${cost} paper`}
              affordable={!maxed && mill.papers >= cost}
              onBuy={() => dispatch({ type: "buy_perk", perk: perk.id })}
            />
          );
        })}
      </div>
    </>
  );
}
