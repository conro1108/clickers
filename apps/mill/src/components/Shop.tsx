import { useState } from "react";
import {
  ATTACKS,
  DEFENSES,
  P,
  PRODUCERS,
  UPGRADES,
  affordableCount,
  attackCost,
  brokenRate,
  cleanRate,
  format,
  producerCost,
  producerMultiplier,
  rate,
  repairCost,
  repeatCost,
  shieldPool,
  totalRepairCost,
  type Command,
  type Millis,
  type PlayerState,
  type Puppies,
} from "@mill/sim";

import { matchProducerArt, matchUpgradePreview } from "../marks.js";
import { Row } from "./Row.js";

type BuyQty = 1 | 10 | "max";

/**
 * The three shops of the head-to-head prototype, as sheet panels.
 *
 * They used to be three tabs inside a bordered column that sat beside the mill
 * all match. The homestead learned years ago that a phone has room for the mill
 * or for the catalogue and not both, and this is the same fix: the mill is the
 * screen, and each of these is a thing you open, spend in, and close.
 */
export function GrowPanel({
  me,
  budget,
  dispatch,
}: {
  me: PlayerState;
  budget: Puppies;
  dispatch: (cmd: Command) => void;
}) {
  const [qty, setQty] = useState<BuyQty>(1);

  const shelf = PRODUCERS.flatMap((prod, i) => {
    const owned = me.producers[prod.id] ?? 0;
    const n = qty === "max" ? Math.max(1, affordableCount(me, prod.id, budget)) : qty;
    const cost = producerCost(prod.id, owned, n);
    const each = prod.baseRate * producerMultiplier(me, prod.id);
    const broken = Math.min(me.broken[prod.id] ?? 0, owned);
    // The ladder reveals itself a rung at a time — but the first rung
    // is always there, or an empty shop greets you at zero puppies.
    const prev = PRODUCERS[i - 1];
    const visible =
      i === 0 ||
      owned > 0 ||
      (prev !== undefined && (me.producers[prev.id] ?? 0) > 0) ||
      P.gte(P.mul(budget, 3), producerCost(prod.id, 0, 1));
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

  const offered = UPGRADES.filter(
    (u) =>
      !me.upgrades.includes(u.id) &&
      (!u.requires || (me.producers[u.requires.producer] ?? 0) >= u.requires.count),
  );

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
            art={matchProducerArt(me.upgrades, prod.id)}
            name={`${prod.name}${owned ? ` ×${owned}` : ""}${broken ? ` (${broken} ${prod.hurt})` : ""}`}
            blurb={`${prod.blurb} +${format(each * n)}/s`}
            cost={format(cost)}
            meta={qty === "max" ? `buy ${n}` : undefined}
            affordable={P.gte(budget, cost)}
            best={prod.id === best}
            onBuy={() => dispatch({ type: "buy_producer", player: me.id, producer: prod.id, qty: n })}
          />
        ))}
      </div>

      {offered.length > 0 && <h3 className="sheet-section">Upgrades</h3>}
      <div className="rows">
        {offered.map((u) => (
          <Row
            key={u.id}
            accent="row-upgrade"
            art={matchUpgradePreview(me.upgrades, u)}
            name={u.name}
            blurb={u.blurb}
            cost={format(u.cost)}
            affordable={P.gte(budget, u.cost)}
            onBuy={() => dispatch({ type: "buy_upgrade", player: me.id, upgrade: u.id })}
          />
        ))}
      </div>
    </>
  );
}

export function SabotagePanel({
  me,
  budget,
  opponents,
  dispatch,
}: {
  me: PlayerState;
  budget: Puppies;
  opponents: PlayerState[];
  dispatch: (cmd: Command) => void;
}) {
  const [target, setTarget] = useState<string>(opponents[0]?.id ?? "");
  const targetId = opponents.some((o) => o.id === target) ? target : (opponents[0]?.id ?? "");
  const targetPlayer = opponents.find((o) => o.id === targetId);
  const targetRate = targetPlayer ? cleanRate(targetPlayer) : rate(0);

  return (
    <>
      {opponents.length > 1 && (
        <div className="qty-toggle">
          <span className="muted">Target</span>
          {opponents.map((o) => (
            <button
              key={o.id}
              className={targetId === o.id ? "on" : ""}
              onClick={() => setTarget(o.id)}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        Priced against the size of the mill you're hitting. A big enough shield eats an attack whole.
      </p>
      <div className="rows">
        {ATTACKS.map((a) => {
          const used = me.attacksUsed[a.id] ?? 0;
          const cost = attackCost(a, used, targetRate);
          return (
            <Row
              key={a.id}
              accent="row-attack"
              name={a.name}
              blurb={a.blurb}
              cost={format(cost)}
              meta={`power ${a.power}`}
              affordable={P.gte(budget, cost) && targetId !== ""}
              onBuy={() => dispatch({ type: "attack", player: me.id, target: targetId, attack: a.id })}
            />
          );
        })}
      </div>
    </>
  );
}

export function DefendPanel({
  me,
  now,
  budget,
  dispatch,
}: {
  me: PlayerState;
  now: Millis;
  budget: Puppies;
  dispatch: (cmd: Command) => void;
}) {
  const lost = brokenRate(me);
  const clean = cleanRate(me);

  return (
    <>
      {/* Same block, and the same argument for it, as the homestead's Upkeep
          sheet: what's being taken off the top, above the bill for stopping it. */}
      {lost > 0 && (
        <div className="damage">
          <div className="damage-head">What they're costing you</div>
          <div className="damage-body">
            <span className="hurt">−{Math.round((lost / Math.max(1e-9, clean + lost)) * 100)}% production</span>{" "}
            damage · <span className="muted">{format(totalRepairCost(me))} to fix</span>
          </div>
        </div>
      )}

      {PRODUCERS.some((prod) => (me.broken[prod.id] ?? 0) > 0) && (
        <>
          <p className="hint">
            Nothing mends on its own. Putting it right costs less than rebuilding, but it's still
            puppies you didn't grow with — that's the price of getting hit.
          </p>
          <div className="rows">
            {PRODUCERS.map((prod) => {
              const broken = Math.min(me.broken[prod.id] ?? 0, me.producers[prod.id] ?? 0);
              if (broken <= 0) return null;
              const cost = repairCost(me, prod.id);
              const back = broken * prod.baseRate * producerMultiplier(me, prod.id);
              return (
                <Row
                  key={`repair-${prod.id}`}
                  accent="row-repair"
                  art={matchProducerArt(me.upgrades, prod.id)}
                  name={`${prod.mend} ${prod.name}`}
                  blurb={`${broken} ${prod.hurt} · restores +${format(back)}/s`}
                  cost={format(cost)}
                  affordable={P.gte(budget, cost)}
                  onBuy={() => dispatch({ type: "repair", player: me.id, producer: prod.id })}
                />
              );
            })}
          </div>
        </>
      )}

      <h3 className="sheet-section">Cover</h3>
      <p className="hint">
        Shield left: <strong>{format(shieldPool(me, now))}</strong>. It's a pool, not a wall — every
        attack it soaks spends some of it.
      </p>
      <div className="rows">
        {DEFENSES.map((d) => {
          const used = me.defensesUsed[d.id] ?? 0;
          const cost = repeatCost(d.baseCost, d.growth, used);
          return (
            <Row
              key={d.id}
              accent="row-defend"
              name={d.name}
              blurb={d.blurb}
              cost={format(cost)}
              meta={`+${d.power} absorb`}
              affordable={P.gte(budget, cost)}
              onBuy={() => dispatch({ type: "defend", player: me.id, defense: d.id })}
            />
          );
        })}
      </div>
    </>
  );
}
