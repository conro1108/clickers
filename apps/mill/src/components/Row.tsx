import { artUrl, type Art } from "../render/pixel.js";

/**
 * A thing you can buy: what it is, what it does, what it costs.
 *
 * One row for both games. They had a copy each, and they'd drifted — the
 * homestead's grew the little picture of the thing on the left and the versus
 * one didn't, which is most of why the parked mode read as an older, plainer
 * game rather than another mode of this one.
 */
export function Row({
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
  /** A string, because a paper price is rendered differently from a puppy one. */
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
