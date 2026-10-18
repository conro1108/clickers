import { format, solo } from "@clickers/sim";

import { culprit } from "../worlds.js";

export function Damage({ mill }: { mill: solo.SiteState }) {
  const rate = solo.currentRate(mill);
  const lostToBreak = solo.brokenRate(mill);
  const lostToBedding = solo.conditionLossRate(mill);
  if (lostToBreak <= 0 && lostToBedding <= 0) return null;

  // Each loss is measured against its own cause: damage is the share of units offline, tired condition is the multiplier itself.
  const breakPct = Math.round((lostToBreak / Math.max(1e-9, lostToBreak + rate)) * 100);
  const beddingPct = Math.round((1 - mill.condition) * 100);

  return (
    <div className="damage">
      <div className="damage-head">
        What {culprit(mill)}'s costing you
      </div>
      <div className="damage-body">
        {lostToBreak > 0 && (
          <div>
            <span className="hurt">−{breakPct}% production</span> damage ·{" "}
            <span className="muted">{format(solo.totalRepairCost(mill))} to fix</span>
          </div>
        )}
        {lostToBedding > 0 && (
          <div>
            <span className="hurt">−{beddingPct}% production</span> tired bedding ·{" "}
            <span className="muted">{format(solo.conditionRestoreCost(mill))} to put right</span>
          </div>
        )}
      </div>
    </div>
  );
}
