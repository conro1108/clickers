import { useState } from "react";
import { seconds, type ScoringRule } from "@mill/sim";

import {
  acceptChallenge,
  challenge,
  declineChallenge,
  hostMatch,
  joinByCode,
  type ChallengeRow,
  type MatchRow,
  type MatchTerms,
} from "../online/matches.js";
import {
  claimWithEmail,
  handleProblem,
  normalizeHandle,
  setHandle,
  type Me,
} from "../online/supabase.js";
import { errorText, type Lobby as LobbyState } from "../online/useLobby.js";
import { TitleScene } from "./MillScene.js";
import { PxIcon } from "./PxIcon.js";

export const LENGTHS = [
  { label: "2 min", ms: seconds(120) },
  { label: "5 min", ms: seconds(300) },
  { label: "10 min", ms: seconds(600) },
];

/**
 * Who you are, at the top of the lobby.
 *
 * Anonymous is the default and stays playable — the handle is already real (the
 * signup trigger hands out `player-1a2b3c4d`), it just isn't yours yet. What an
 * email buys is being *findable tomorrow*, which is the only thing a challenge
 * actually needs, so that's what the copy promises rather than "sign up".
 */
function Identity({ me, onMe, onError }: { me: Me; onMe: (me: Me) => void; onError: (e: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [handle, setHandleText] = useState(me.handle);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const cleaned = normalizeHandle(handle);
  const problem = handleProblem(cleaned);

  return (
    <div className="identity">
      <div className="identity-row">
        <PxIcon name="paw" size={16} />
        <span className="identity-handle">@{me.handle}</span>
        {me.claimed ? (
          <span className="identity-tag">yours</span>
        ) : (
          <span className="identity-tag guest">guest</span>
        )}
        <button className="ghost small-btn" onClick={() => setOpen((o) => !o)}>
          {open ? "Done" : me.claimed ? "Rename" : "Claim"}
        </button>
      </div>

      {open && (
        <div className="identity-panel">
          <label className="field">
            <span>Handle</span>
            <input
              value={handle}
              onChange={(e) => setHandleText(e.target.value)}
              placeholder="brad"
              maxLength={20}
            />
          </label>
          <button
            className="ghost"
            disabled={busy || Boolean(problem) || cleaned === me.handle}
            onClick={async () => {
              setBusy(true);
              onError(null);
              try {
                onMe(await setHandle(cleaned, cleaned));
              } catch (e) {
                onError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {problem ?? `Take @${cleaned || "…"}`}
          </button>

          {!me.claimed && (
            <>
              <p className="muted small">
                A guest can play anyone who shares a code. To be challenged by name you have to still
                be here tomorrow — an email link is what makes that true. Nothing else changes: same
                mill, same handle, same matches.
              </p>
              <label className="field">
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>
              <button
                className="ghost"
                disabled={busy || !email.includes("@")}
                onClick={async () => {
                  setBusy(true);
                  onError(null);
                  try {
                    await claimWithEmail(email);
                    setSent(true);
                  } catch (e) {
                    onError(errorText(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send me the link
              </button>
              {sent && <p className="muted small">Sent. Open it on this device and come back.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Challenges({
  rows,
  names,
  meId,
  onEnter,
  onError,
  onRefresh,
}: {
  rows: ChallengeRow[];
  names: Record<string, string>;
  meId: string;
  onEnter: (row: MatchRow) => void;
  onError: (e: string | null) => void;
  onRefresh: () => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="field">
      <span>Challenges</span>
      <ul className="challenge-list">
        {rows.map((c) => {
          const mine = c.challenger === meId;
          const them = names[mine ? c.opponent : c.challenger] ?? "someone";
          const mins = Math.round(c.duration_ms / 60000);
          return (
            <li key={c.id} className="challenge">
              <div>
                <div className="challenge-who">
                  {mine ? `You challenged ${them}` : `${them} wants a race`}
                </div>
                <div className="muted small">
                  {mins} min · {c.scoring === "on_hand" ? "biggest pile" : "most raised"}
                </div>
              </div>
              {mine ? (
                <button
                  className="ghost small-btn"
                  onClick={async () => {
                    await declineChallenge(c.id);
                    onRefresh();
                  }}
                >
                  Withdraw
                </button>
              ) : (
                <div className="challenge-actions">
                  <button
                    className="ghost small-btn"
                    onClick={async () => {
                      await declineChallenge(c.id);
                      onRefresh();
                    }}
                  >
                    No
                  </button>
                  <button
                    className="small-btn on"
                    onClick={async () => {
                      onError(null);
                      try {
                        onEnter(await acceptChallenge(c.id));
                      } catch (e) {
                        onError(errorText(e));
                      }
                    }}
                  >
                    Race
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Door = "bot" | "code" | "friend";

/**
 * The versus lobby: the terms of the race, then the three ways into one.
 *
 * A bot needs nothing. A code needs nothing but somebody in earshot. A name
 * needs both of you to be real accounts, which is the one thing in this screen
 * that isn't free — so it's the door that explains itself.
 */
export function VersusLobby({
  lobby,
  bots,
  botProfile,
  onBot,
  onEnter,
  onBack,
}: {
  lobby: LobbyState;
  bots: readonly { id: string; name: string; blurb: string }[];
  /** Which rung is selected when the screen opens. */
  botProfile: string;
  onBot: (profile: string, terms: MatchTerms) => void;
  onEnter: (row: MatchRow) => void;
  onBack: () => void;
}) {
  const { me, challenges, names, error, setMe, setError, refresh } = lobby;
  const [door, setDoor] = useState<Door>("bot");
  // The roster used to start a match on the tap that picked the opponent, which
  // meant the blurb under it described whoever was first in the list and nobody
  // ever read one. With eight rungs the blurb is the only thing telling you what
  // you're walking into, so picking and starting are two presses.
  const [bot, setBot] = useState(botProfile);
  const [durationMs, setDurationMs] = useState(seconds(300));
  const [scoring, setScoring] = useState<ScoringRule>("total_raised");
  const [code, setCode] = useState("");
  const [hosted, setHosted] = useState<MatchRow | null>(null);
  const [friend, setFriend] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const terms: MatchTerms = { durationMs, scoring };

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lobby">
      <h1>
        Puppies, <span>Inc.</span>
      </h1>
      <p className="tagline">Grow puppies. Ruin someone else's. You can't afford to do both.</p>

      <TitleScene />

      {me && <Identity me={me} onMe={setMe} onError={setError} />}
      {error && <div className="error">{error}</div>}

      {me && (
        <Challenges
          rows={challenges}
          names={names}
          meId={me.id}
          onEnter={onEnter}
          onError={setError}
          onRefresh={refresh}
        />
      )}

      <div className="field">
        <span>Match length</span>
        <div className="choices">
          {LENGTHS.map((l) => (
            <button
              key={l.label}
              className={durationMs === l.ms ? "on" : ""}
              onClick={() => setDurationMs(l.ms)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Winner is</span>
        <div className="choices">
          <button
            className={scoring === "total_raised" ? "on" : ""}
            onClick={() => setScoring("total_raised")}
          >
            most raised
          </button>
          <button className={scoring === "on_hand" ? "on" : ""} onClick={() => setScoring("on_hand")}>
            biggest pile
          </button>
        </div>
        <p className="muted small">
          Raised counts everything you ever whistled up, so spending is free. Biggest pile counts what
          you're holding at the buzzer, so late purchases cost you the game.
        </p>
      </div>

      <div className="field">
        <span>Against</span>
        <div className="choices">
          {([
            ["bot", "a bot"],
            ["code", "a code"],
            ["friend", "a name"],
          ] as const).map(([id, label]) => (
            <button key={id} className={door === id ? "on" : ""} onClick={() => setDoor(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {door === "bot" && (
        <>
          {/* In ladder order, easiest first — the row you're on is the setting. */}
          <div className="choices roster">
            {bots.map((b, i) => (
              <button key={b.id} className={bot === b.id ? "on" : ""} onClick={() => setBot(b.id)}>
                <span className="roster-rung">{i + 1}</span>
                {b.name}
              </button>
            ))}
          </div>
          <p className="muted small">{bots.find((b) => b.id === bot)?.blurb}</p>
          <button className="start" onClick={() => onBot(bot, terms)}>
            Start match
          </button>
        </>
      )}

      {door === "code" && (
        <>
          {hosted?.join_code ? (
            <div className="waiting">
              <div className="waiting-code">{hosted.join_code}</div>
              {/* Both, because they're for different rooms. The code is for
                  someone sitting next to you; the link is for someone who
                  isn't, and it's the one that works on a person who has never
                  opened this game — it takes them past the splash, past the
                  mill and past the back room straight into the race. */}
              <div className="choices halves">
                <button
                  className="ghost"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(`${location.origin}${location.pathname}?join=${hosted.join_code}`)
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1600);
                      });
                  }}
                >
                  {copied ? "Copied" : "Copy play link"}
                </button>
              </div>
              <p className="muted small">
                Send the link, or read the code out. The race starts the moment they're in — you
                don't have to press anything else.
              </p>
            </div>
          ) : (
            <button
              className="start"
              disabled={busy}
              onClick={() => guard(async () => setHosted(await hostMatch(terms)))}
            >
              Open a match
            </button>
          )}
          <label className="field">
            <span>Or join one</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
            />
          </label>
          <button
            className="ghost"
            disabled={busy || code.trim().length < 4}
            onClick={() => guard(async () => onEnter(await joinByCode(code)))}
          >
            Join
          </button>
        </>
      )}

      {door === "friend" && (
        <>
          {me && !me.claimed ? (
            <p className="muted small">
              You're playing as a guest. Claim your handle above and you can call people out by name
              — and they can call you.
            </p>
          ) : (
            <>
              <label className="field">
                <span>Their handle</span>
                <input
                  value={friend}
                  onChange={(e) => setFriend(e.target.value)}
                  placeholder="brad"
                  maxLength={20}
                />
              </label>
              <button
                className="start"
                disabled={busy || friend.trim().length < 3}
                onClick={() =>
                  guard(async () => {
                    await challenge(normalizeHandle(friend), terms);
                    setSent(friend.trim());
                    setFriend("");
                    refresh();
                  })
                }
              >
                Challenge
              </button>
              {sent && (
                <p className="muted small">
                  Sent to @{normalizeHandle(sent)}. It'll be waiting whenever they next open the game
                  — you'll drop straight into the race when they take it.
                </p>
              )}
            </>
          )}
        </>
      )}

      <div className="home-aside">
        <button className="ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
