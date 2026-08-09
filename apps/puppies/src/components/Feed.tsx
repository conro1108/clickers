import { formatDuration, type MatchState } from "@clickers/sim";

/** The match log, in the same list the homestead's yard report uses. */
export function Feed({ state }: { state: MatchState }) {
  const entries = [...state.log].reverse().slice(0, 40);
  if (entries.length === 0) return <p className="muted">Quiet so far.</p>;
  return (
    <ul className="feed-list">
      {entries.map((e) => (
        <li key={e.index} className={`feed-item feed-${e.tone}`}>
          <span className="feed-time">{formatDuration(e.at - state.startedAt)}</span>
          <span className="feed-text">
            <strong>{state.players[e.actor]?.name ?? e.actor}</strong> {e.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
