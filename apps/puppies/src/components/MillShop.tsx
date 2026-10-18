import { useState } from "react";
import { Y, format, solo, type Millis, type Yield } from "@clickers/sim";

import { producerArt, upgradePreview } from "../marks.js";
import { Row } from "./Row.js";

type BuyQty = 1 | 10 | "max";

// Buy size is a preference, not mill state: kept beside the save so it survives a hand-down.
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
  }
}

// Wait-until-affordable in words. Coarse and rounded up on purpose: a precise countdown on a two-hour number is a spinner.
function waitText(msLeft: number): string {
  if (!Number.isFinite(msLeft)) return "nothing is growing";
  const mins = Math.ceil(msLeft / 60000);
  if (mins <= 1) return "moments away";
  if (mins < 60) return `about ${mins} minutes away`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return `about ${hours}h${rest ? ` ${rest}m` : ""} away`;
}

/** Where each world is, as a phrase that finishes "broken …". */
const WHERE: Record<solo.World, string> = {
  outside: "out under the sky",
  inside: "down inside the puppy",
  beyond: "in the dream",
};

// The single-item end-of-run sheet: no cream, price as a fill bar, button does not say Buy.
// Says nothing about what it does on purpose — see the blurb note in content.ts.
function Convergence({
  mill,
  budget,
  dispatch,
  upgrade = solo.CONVERGENCE_UPGRADE,
  line = "You have spent this whole run on the outside of it.",
}: {
  mill: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
  upgrade?: string;
  line?: string;
}) {
  const ur = solo.SOLO_UPGRADE_BY_ID[upgrade]!;
  const affordable = Y.gte(budget, ur.cost);
  const held = Math.max(0, Math.min(1, budget / ur.cost));
  const rate = solo.currentRate(mill);
  const left = rate > 0 ? ((ur.cost - budget) / rate) * 1000 : Infinity;

  return (
    <div className="grave">
      <div className="grave-mark" aria-hidden />
      <h3 className="grave-name">{ur.name}</h3>
      <p className="grave-blurb">{ur.blurb}</p>
      <p className="grave-line">{line}</p>

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
  mill: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  const [qty, setQtyRaw] = useState<BuyQty>(loadQty);
  const setQty = (next: BuyQty) => {
    saveQty(next);
    setQtyRaw(next);
  };

  // Once the tenth Singularity stands, everything else leaves the board: buying another would push the Ur-Chihuahua out.
  if (solo.convergencePending(mill)) {
    return <Convergence mill={mill} budget={budget} dispatch={dispatch} />;
  }
  // The same again at the bottom of the nest: the tenth Second Chihuahua, and the dream it's having.
  if (solo.breachPending(mill)) {
    return (
      <Convergence
        mill={mill}
        budget={budget}
        dispatch={dispatch}
        upgrade={solo.BREACH_UPGRADE}
        line="You have spent this whole run in the warm, next to it, while it slept."
      />
    );
  }

  // One shop per world; warping is how you change it.
  const ladder = solo.producersIn(mill.world);
  const upgrades = solo.SOLO_UPGRADES.filter((u) => {
    if (mill.upgrades.includes(u.id) || !solo.isUnlocked(mill, u)) return false;
    // Tier upgrades belong to their rung's world; whistle tools and globals lift both and are sold in both.
    const effect = u.effect;
    if (effect.kind !== "producer_mult") return true;
    return solo.SOLO_PRODUCER_BY_ID[effect.producer].world === mill.world;
  });

  const shelf = ladder.flatMap((prod, i) => {
    const owned = mill.producers[prod.id] ?? 0;
    const n = qty === "max" ? Math.max(1, solo.affordableCount(mill, prod.id, budget)) : qty;
    const cost = solo.producerCost(mill, prod.id, n);
    // Quote the rate as the mill stands, tired bedding and all, not the clean rate.
    const each = solo.producerRateEach(mill, prod.id);
    const broken = solo.brokenCount(mill, prod.id);

    // First rung is always shown, or an empty shop greets you at zero.
    const prev = ladder[i - 1];
    const visible =
      solo.isProducerAvailable(mill, prod.id) &&
      (i === 0 ||
        owned > 0 ||
        (prev !== undefined && (mill.producers[prev.id] ?? 0) > 0) ||
        Y.gte(Y.mul(budget, 3), prod.baseCost));
    if (!visible) return [];
    return [{ prod, owned, n, cost, each, broken }];
  });

  // Best-rate dot: only among affordable rows, only when there is more than one.
  const buyable = shelf.filter((r) => Y.gte(budget, r.cost) && r.each > 0);
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
            affordable={Y.gte(budget, cost)}
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
            affordable={Y.gte(budget, u.cost)}
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
  mill: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  const conditionBill = solo.conditionRestoreCost(mill);
  // Damage on this world only; the other mill's waits for you there.
  const damaged = solo
    .producersIn(mill.world)
    .filter((p) => solo.brokenCount(mill, p.id) > 0);
  // Every other open world, by name, so the hint can say where.
  const elsewhere = (["outside", "inside", "beyond"] as const)
    .filter((w) => w !== mill.world && solo.isWorldOpen(mill, w))
    .map((w) => ({
      where: WHERE[w],
      n: solo.producersIn(w).reduce((n, p) => n + solo.brokenCount(mill, p.id), 0),
    }))
    .filter((e) => e.n > 0);

  // Fix-all only when there is more than one thing to pay for.
  const bill = solo.upkeepBill(mill);
  const jobs = damaged.length + (conditionBill > 0 ? 1 : 0);
  const brokenHere = damaged.reduce((n, p) => n + solo.brokenCount(mill, p.id), 0);
  // Not `brokenRate` — it counts the other mill's damage too, which nothing here can fix.
  const backHere =
    damaged.reduce(
      (r, p) => r + solo.brokenCount(mill, p.id) * solo.producerRateEach(mill, p.id),
      0,
    ) + (conditionBill > 0 ? solo.conditionLossRate(mill) : 0);

  return (
    <>
      {(damaged.length > 0 || conditionBill > 0) && (
        <>
          <p className="hint">
            Nothing here mends on its own. What the weather hurt stays hurt and tired bedding
            stays tired until you spend on it — that's what {mill.breached ? "the dream" : mill.converged ? "the nest" : "the weather"}{" "}
            actually costs.
          </p>
          {jobs > 1 && (
            <div className="rows">
              <Row
                accent="row-repair row-fixall"
                name="Put everything right"
                blurb={`${
                  brokenHere > 0 && conditionBill > 0
                    ? `${brokenHere} broken and the bedding`
                    : brokenHere > 0
                      ? `${brokenHere} broken`
                      : "the bedding"
                } · restores +${format(backHere)}/s`}
                cost={format(bill)}
                affordable={Y.gte(budget, bill)}
                onBuy={() => dispatch({ type: "fix_all" })}
              />
            </div>
          )}
          <div className="rows">
            {conditionBill > 0 && (
              <Row
                accent="row-repair"
                name="Restore the bedding"
                blurb={`Back to 100% from ${Math.round(mill.condition * 100)}% · restores +${format(
                  solo.conditionLossRate(mill),
                )}/s`}
                cost={format(conditionBill)}
                affordable={Y.gte(budget, conditionBill)}
                onBuy={() => dispatch({ type: "restore_condition" })}
              />
            )}
            {damaged.map((prod) => {
              const broken = solo.brokenCount(mill, prod.id);
              const cost = solo.repairCost(mill, prod.id);
              // Rate restored as things stand (tired bedding included); the price stays on the clean rate.
              const back = broken * solo.producerRateEach(mill, prod.id);
              return (
                <Row
                  key={`repair-${prod.id}`}
                  accent="row-repair"
                  name={`${prod.mend} ${prod.name}`}
                  blurb={`${broken} ${prod.hurt} · restores +${format(back)}/s`}
                  cost={format(cost)}
                  affordable={Y.gte(budget, cost)}
                  onBuy={() => dispatch({ type: "repair", producer: prod.id })}
                />
              );
            })}
          </div>
        </>
      )}

      {elsewhere.map(({ where, n }) => (
        <p key={where} className="hint">
          {n} more {n === 1 ? "thing is" : "things are"} broken {where}. You'll have to be standing
          there to put {n === 1 ? "it" : "them"} right.
        </p>
      ))}

      <p className="hint">
        Buildings work whether you're here or not, which is the only kind of defence worth having
        against {mill.breached ? "a dream that twitches" : mill.converged ? "something that stirs" : "weather that lands"} while the tab is
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
              affordable={Y.gte(budget, cost)}
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
  mill: solo.SiteState;
  now: Millis;
  pendingWhistles: number;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  // Defaults to the world you are standing in.
  const [outside, setOutside] = useState(false);
  const pending = solo.pendingHeirlooms(mill);
  const thisRun = solo.projectedProduced(mill, now);
  const multNow = 1 + solo.MULT_PER_UNSPENT_HEIRLOOM * mill.heirlooms;
  const multAfter = 1 + solo.MULT_PER_UNSPENT_HEIRLOOM * (mill.heirlooms + pending);

  return (
    <>
      <div className="legacy-head">
        <div>
          <div className="legacy-value">{mill.heirlooms}</div>
          <div className="muted small">Pedigree Paper · ×{multNow.toFixed(2)} output</div>
        </div>
        {/* This run's output is what `pendingHeirlooms` is computed from, so it
            reads here rather than in a ledger somewhere else — the number and
            the thing it buys in the same glance. Lifetime is the only figure in
            the game that never goes backwards, and it's the one that makes a
            hand-down feel like it added up to something. */}
        <div className="muted small legacy-runs">
          <div>This run {format(Y.add(thisRun, Y.mul(solo.clickYield(mill), pendingWhistles)))}</div>
          <div>Lifetime {format(mill.lifetimeProduced)}</div>
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
            ceiling, with the tiers that mill it already in the shop{mill.breached ? ", and the dream still open" : ""}. Go back out and the horizon
            opens — no Hem Hollow, no Warm Heart{mill.breached ? ", no dream" : ""}, weather instead of the nest, and the
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
              affordable={!maxed && mill.heirlooms >= cost}
              onBuy={() => dispatch({ type: "buy_perk", perk: perk.id })}
            />
          );
        })}
      </div>
    </>
  );
}
