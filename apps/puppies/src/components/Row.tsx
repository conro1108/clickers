import { artUrl, type Art } from "../render/pixel.js";

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
