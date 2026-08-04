import { format, solo } from "@mill/sim";

/**
 * What's currently being taken off the top, and what it costs to stop.
 *
 * This used to head a ledger of eight numbers, six of which were already on the
 * HUD or the whistle bar. The ledger is gone; this is the part that wasn't repeated
 * anywhere, and it belongs above the repair bill rather than in a tab of its
 * own — reading what broke and paying for it are the same errand.
 */
export function Damage({ mill }: { mill: solo.MillState }) {
  const rate = solo.currentRate(mill);
  const lostToBreak = solo.brokenRate(mill);
  const lostToBedding = solo.beddingLossRate(mill);
  if (lostToBreak <= 0 && lostToBedding <= 0) return null;

  // Each loss is measured against its own cause rather than a common total,
  // because that's what each one is exactly worth: damage is the share of
  // units offline, tired bedding is the multiplier itself.
  const breakPct = Math.round((lostToBreak / Math.max(1e-9, lostToBreak + rate)) * 100);
  const beddingPct = Math.round((1 - mill.bedding) * 100);

  return (
    <div className="damage">
      <div className="damage-head">
        What {mill.converged ? "the tuber's" : "the weather's"} costing you
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
            <span className="muted">{format(solo.beddingRestoreCost(mill))} to put right</span>
          </div>
        )}
      </div>
    </div>
  );
}
