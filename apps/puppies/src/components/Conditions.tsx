import { format, type Millis, type PlayerState } from "@clickers/sim";

export function Conditions({ me, now }: { me: PlayerState; now: Millis }) {
  if (me.effects.length === 0) return null;
  return (
    <ul className="chips conditions">
      {me.effects.map((e) => {
        const left = Math.max(0, e.expiresAt - now) / 1000;
        return (
          <li key={e.id} className={`chip chip-${e.kind}`}>
            <span className="chip-name">{e.label}</span>
            <span className="chip-detail">
              {e.kind === "slow"
                ? `−${Math.round((1 - e.multiplier) * 100)}%`
                : `${format(e.power)} left`}
            </span>
            <span className="chip-timer">{left.toFixed(0)}s</span>
          </li>
        );
      })}
    </ul>
  );
}
