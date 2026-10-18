import { format, solo } from "@clickers/sim";

import { culprit } from "../worlds.js";

export function Damage({ farm }: { farm: solo.SiteState }) {
  const rate = solo.currentRate(farm);
  const lostToBreak = solo.brokenRate(farm);
  const lostToSoil = solo.conditionLossRate(farm);
  if (lostToBreak <= 0 && lostToSoil <= 0) return null;

  // Each loss is measured against its own cause: damage is the share of units offline, tired condition is the multiplier itself.
  const breakPct = Math.round((lostToBreak / Math.max(1e-9, lostToBreak + rate)) * 100);
  const soilPct = Math.round((1 - farm.condition) * 100);

  return (
    <div className="damage">
      <div className="damage-head">
        What {culprit(farm)}'s costing you
      </div>
      <div className="damage-body">
        {lostToBreak > 0 && (
          <div>
            <span className="hurt">−{breakPct}% production</span> damage ·{" "}
            <span className="muted">{format(solo.totalRepairCost(farm))} to fix</span>
          </div>
        )}
        {lostToSoil > 0 && (
          <div>
            <span className="hurt">−{soilPct}% production</span> tired soil ·{" "}
            <span className="muted">{format(solo.conditionRestoreCost(farm))} to put right</span>
          </div>
        )}
      </div>
    </div>
  );
}
