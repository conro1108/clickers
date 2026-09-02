import { format, opponentView, type MatchState, type Millis, type PlayerId } from "@clickers/sim";

// Only what `opponentView` permits: count and rate. No upgrade tree, no defenses.
export function Opponents({
  state,
  now,
  ids,
  yourScore,
}: {
  state: MatchState;
  now: Millis;
  ids: PlayerId[];
  yourScore: number;
}) {
  return (
    <>
      <ul className="opp-list">
        {ids.map((id) => {
          const view = opponentView(state, id, now);
          const delta = yourScore - view.count;
          return (
            <li key={id} className="opp">
              <div className="opp-name">{view.name}</div>
              <div className={`opp-delta ${delta >= 0 ? "ahead" : "behind"}`}>
                {delta >= 0 ? "you lead by " : "you trail by "}
                {format(Math.abs(delta))}
              </div>
              <div className="opp-figures">
                <span className="opp-count">{format(view.count)}</span>
                <span className="opp-rate">{format(view.rate)}/s</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted fog">Count and rate is all you get. Their defenses are their business.</p>
    </>
  );
}
