import { useState } from "react";
import { Y, format, solo, type Millis, type Yield } from "@clickers/sim";

import { producerArt, upgradePreview } from "../marks.js";
import { artUrl, type Art } from "../render/pixel.js";
import { culprit, threat, WORLD_COPY } from "../worlds.js";

type BuyQty = 1 | 10 | "max";

// Buy size is a preference, not farm state: kept beside the save so it survives a hand-down.
const QTY_KEY = "potatoes-inc:buy-qty";

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
  cost: string;
  meta?: string;
  affordable: boolean;
  onBuy: () => void;
  accent?: string;
  art?: Art;
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
          {best && (
            <span className="row-best" title="Best rate per potato" aria-label="best value" />
          )}
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

// The single-item end-of-run sheet: no cream, price as a fill bar, button does not say Buy.
// Says nothing about what it does on purpose — see the blurb note in content.ts.
function Convergence({
  farm,
  budget,
  dispatch,
  upgrade,
  line,
}: {
  farm: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
  /** The fold's `ur_form`, or the breach one world further in. */
  upgrade: string;
  line: string;
}) {
  const ur = solo.SOLO_UPGRADE_BY_ID[upgrade]!;
  const price = solo.upgradeCost(farm, ur);
  const affordable = Y.gte(budget, price);
  const held = Math.max(0, Math.min(1, budget / price));
  const rate = solo.currentRate(farm);
  const left = rate > 0 ? ((price - budget) / rate) * 1000 : Infinity;

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
          <span>{format(price)}</span>
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
  farm,
  budget,
  dispatch,
}: {
  farm: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  const [qty, setQtyRaw] = useState<BuyQty>(loadQty);
  const setQty = (next: BuyQty) => {
    saveQty(next);
    setQtyRaw(next);
  };

  // Once ten of the last rung stand, everything else leaves the board: buying another would push the gate out.
  // The Ur-Potato first, then the same again at the bottom of every world after it.
  const gate = solo.gatePending(farm);
  if (gate) {
    return (
      <Convergence
        farm={farm}
        budget={budget}
        dispatch={dispatch}
        upgrade={solo.WORLD_GATE[gate]}
        line={WORLD_COPY[gate].gateLine ?? ""}
      />
    );
  }

  // One shop per world; warping is how you change it.
  const ladder = solo.producersIn(farm.world);
  const upgrades = solo.SOLO_UPGRADES.filter((u) => {
    if (farm.upgrades.includes(u.id) || !solo.isUnlocked(farm, u)) return false;
    // Tier upgrades belong to their rung's world; dig tools and globals lift both and are sold in both.
    const effect = u.effect;
    if (effect.kind !== "producer_mult") return true;
    return solo.SOLO_PRODUCER_BY_ID[effect.producer].world === farm.world;
  });

  const shelf = ladder.flatMap((prod, i) => {
    const owned = farm.producers[prod.id] ?? 0;
    const n = qty === "max" ? Math.max(1, solo.affordableCount(farm, prod.id, budget)) : qty;
    const cost = solo.producerCost(farm, prod.id, n);
    // Quote the rate as the farm stands, tired soil and all, not the clean rate.
    const each = solo.producerRateEach(farm, prod.id);
    const broken = solo.brokenCount(farm, prod.id);

    // First rung is always shown, or an empty shop greets you at zero.
    const prev = ladder[i - 1];
    const visible =
      solo.isProducerAvailable(farm, prod.id) &&
      (i === 0 ||
        owned > 0 ||
        (prev !== undefined && (farm.producers[prev.id] ?? 0) > 0) ||
        Y.gte(Y.mul(budget, 3), solo.producerCost(farm, prod.id, 1)));
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
            art={producerArt(farm, prod.id)}
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
            cost={format(solo.upgradeCost(farm, u))}
            affordable={Y.gte(budget, solo.upgradeCost(farm, u))}
            art={upgradePreview(farm, u)}
            onBuy={() => dispatch({ type: "buy_upgrade", upgrade: u.id })}
          />
        ))}
      </div>
    </>
  );
}

export function LandPanel({
  farm,
  budget,
  dispatch,
}: {
  farm: solo.SiteState;
  budget: Yield;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  const conditionBill = solo.conditionRestoreCost(farm);
  // Every world's damage, mended from wherever you stand: walking down to fix something is a chore, not a choice.
  const damaged = solo.SOLO_PRODUCERS.filter((p) => solo.brokenCount(farm, p.id) > 0);

  // Fix-all only when there is more than one thing to pay for.
  const bill = solo.upkeepBill(farm);
  const jobs = damaged.length + (conditionBill > 0 ? 1 : 0);
  const brokenHere = damaged.reduce((n, p) => n + solo.brokenCount(farm, p.id), 0);
  const backHere = solo.brokenRate(farm) + solo.conditionLossRate(farm);

  return (
    <>
      {(damaged.length > 0 || conditionBill > 0) && (
        <>
          <p className="hint">
            Nothing here mends on its own. What the weather hurt stays hurt and tired soil
            stays tired until you spend on it — that's what {culprit(farm)}{" "}
            actually costs.
          </p>
          {jobs > 1 && (
            <div className="rows">
              <Row
                accent="row-repair row-fixall"
                name="Put everything right"
                blurb={`${
                  brokenHere > 0 && conditionBill > 0
                    ? `${brokenHere} broken and the soil`
                    : brokenHere > 0
                      ? `${brokenHere} broken`
                      : "the soil"
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
                name="Restore the soil"
                blurb={`Back to 100% from ${Math.round(farm.condition * 100)}% · restores +${format(
                  solo.conditionLossRate(farm),
                )}/s`}
                cost={format(conditionBill)}
                affordable={Y.gte(budget, conditionBill)}
                onBuy={() => dispatch({ type: "restore_condition" })}
              />
            )}
            {damaged.map((prod) => {
              const broken = solo.brokenCount(farm, prod.id);
              const cost = solo.repairCost(farm, prod.id);
              // Rate restored as things stand (tired soil included); the price stays on the clean rate.
              const back = broken * solo.producerRateEach(farm, prod.id);
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

      <p className="hint">
        Buildings work whether you're here or not, which is the only kind of defence worth having
        against {threat(farm)} while the tab is
        closed. They never stop it outright.
      </p>
      <div className="rows">
        {solo.landsIn(farm.world).filter((land) => solo.isLandAvailable(farm, land.id)).map((land) => {
          const level = solo.landLevel(farm, land.id);
          const cost = solo.landCost(farm, land.id);
          const now = solo.mitigation(farm, land.role);
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
  farm,
  now,
  pendingDigs,
  dispatch,
}: {
  farm: solo.SiteState;
  now: Millis;
  pendingDigs: number;
  dispatch: (cmd: solo.SiteCommand) => void;
}) {
  const pending = solo.pendingHeirlooms(farm);
  const thisRun = solo.projectedProduced(farm, now);
  const multNow = 1 + solo.MULT_PER_UNSPENT_HEIRLOOM * farm.heirlooms;
  const multAfter = 1 + solo.MULT_PER_UNSPENT_HEIRLOOM * (farm.heirlooms + pending);

  return (
    <>
      <div className="legacy-head">
        <div>
          <div className="legacy-value">{farm.heirlooms}</div>
          <div className="muted small">Heirloom Seed · ×{multNow.toFixed(2)} output</div>
        </div>
        {/* This run's harvest is what `pendingHeirlooms` is computed from, so it
            reads here rather than in a ledger somewhere else — the number and
            the thing it buys in the same glance. Lifetime is the only figure in
            the game that never goes backwards, and it's the one that makes a
            hand-down feel like it added up to something. */}
        <div className="muted small legacy-runs">
          <div>This run {format(Y.add(thisRun, Y.mul(solo.clickYield(farm), pendingDigs)))}</div>
          <div>Lifetime {format(farm.lifetimeProduced)}</div>
        </div>
      </div>

      <p className="hint">
        Seeds do two jobs, and you can't have both. Held, every seed makes this farm and every
        farm after it produce more. Spent, they buy something permanent. Same choice as everything
        else here — one pile, competing uses.
      </p>
      {farm.reached >= 5 && (
        <p className="hint">
          Past the first field, prices rise with everything your seeds and generations have bought
          you. Holding more still helps out there, but only just.
        </p>
      )}

      {/* The tab used to be held until the fold so nobody could hand the farm
          down on the eve of the best thing in the game. It isn't any more, so
          the warning has to live somewhere — and a sentence is a better version
          of it than a locked door, because it tells you what you'd be giving up
          instead of pretending there's nothing there. */}
      {farm.reached === 0 && (
        <p className="hint">
          The shop still has an end you haven't reached. Nothing stops you handing this farm down
          first, but the run that gets all the way there is worth having once.
        </p>
      )}

      {farm.depth >= 1 && (
        <p className="hint">
          Every door you've opened closes behind a hand-down. The next generation starts under the
          sky and digs its way back in — faster, for the seeds.
        </p>
      )}

      <div className="rows">
        <Row
          accent="row-upgrade"
          name={pending > 0 ? `Hand the farm down — +${pending} seed` : "Hand the farm down"}
          blurb={
            pending > 0
              ? `Clears everything this generation built. Output goes ×${multNow.toFixed(
                  2,
                )} → ×${multAfter.toFixed(2)}.${farm.depth >= 1 ? " Every door closes." : ""}`
              : "Not worth doing yet — grow this generation further first."
          }
          cost={pending > 0 ? `+${pending}` : "—"}
          affordable={pending > 0}
          onBuy={() => {
            const where = farm.depth >= 1 ? " Every world past the sky closes until you reach it again." : "";
            if (
              window.confirm(
                `Hand the farm down? Everything this generation built is cleared.${where}`,
              )
            ) {
              dispatch({ type: "prestige" });
            }
          }}
        />
      </div>

      <div className="rows">
        {solo.PERKS.filter((perk) => solo.isPerkAvailable(farm, perk.id)).map((perk) => {
          const level = farm.perks[perk.id] ?? 0;
          const maxed = level >= perk.maxLevel;
          const cost = solo.perkCost(perk, level);
          return (
            <Row
              key={perk.id}
              accent="row-defend"
              name={`${perk.name}${level ? ` ×${level}` : ""}`}
              blurb={maxed ? "Fully grown." : perk.blurb}
              cost={maxed ? "—" : `${cost} seed`}
              affordable={!maxed && farm.heirlooms >= cost}
              onBuy={() => dispatch({ type: "buy_perk", perk: perk.id })}
            />
          );
        })}
      </div>
    </>
  );
}
