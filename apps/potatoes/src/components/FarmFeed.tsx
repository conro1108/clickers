import { solo, type Millis } from "@clickers/sim";
import { Coins } from "./Coin.js";

/** Wall-clock-ish. */
function ago(at: Millis, now: Millis): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86_400)}d`;
}

export function FarmFeed({ farm, now }: { farm: solo.SiteState; now: Millis }) {
  const entries = [...farm.log].reverse().slice(0, 40);
  if (entries.length === 0) return <p className="muted">Quiet so far.</p>;
  return (
    <ul className="feed-list">
      {entries.map((e) => (
        <li key={e.index} className={`feed-item feed-${e.tone}`}>
          <span className="feed-time">{ago(e.at, now)}</span>
          <span className="feed-text"><Coins text={e.text} /></span>
        </li>
      ))}
    </ul>
  );
}
