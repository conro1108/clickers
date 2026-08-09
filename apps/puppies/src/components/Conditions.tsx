import { format, type Millis, type PlayerState } from "@clickers/sim";

/**
 * What's currently happening to your mill, over the top of the mill.
 *
 * This used to be a "Conditions" heading in a panel, with a paragraph reading
 * "Clear skies." for most of a match — a fifth of a column spent on nothing
 * being wrong. An effect is a thing with a countdown on it, so it belongs where
 * you're already looking, and it isn't there when there's nothing to say.
 */
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
