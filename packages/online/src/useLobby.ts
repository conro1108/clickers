/**
 * Everything that happens before a match does: who you are, who's asking to
 * play, and the code you're holding up while you wait.
 *
 * All three want the same thing from realtime — tell me the moment something
 * with my name on it changes — so they share one channel and one hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  liveMatch,
  namesOf,
  openChallenges,
  type ChallengeRow,
  type MatchRow,
} from "./matches.js";
import { channelName, SCHEMA } from "./config.js";
import { refreshMe, signIn, supabase, syncClock, type Me } from "./supabase.js";

export function errorText(e: unknown): string {
  // PostgrestError is a plain object, not an Error, so the `instanceof` arm
  // alone turns every database failure into the words "[object Object]" — which
  // is how a 406 from a schema that isn't exposed yet reaches a player.
  const message =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : String(e);
  // Anonymous sign-in is rate limited per IP per hour, which is invisible until
  // it isn't: the lobby just fails to load with a sentence out of an API. It's
  // reachable by a room full of people opening the game at once, and the way out
  // of it is the thing we wanted them to do anyway.
  if (/rate limit/i.test(message)) {
    return "Too many new players from here this hour. Claim an account and you'll skip that queue — or try again shortly.";
  }
  if (/row-level security/i.test(message)) return "The database wouldn't allow that.";
  return message;
}

export interface Lobby {
  me: Me | null;
  /** Challenges with your name on either end, still open. */
  challenges: ChallengeRow[];
  /** Display names for everyone mentioned in one. */
  names: Record<string, string>;
  /** A match you're in that hasn't finished — including one you never opened. */
  live: MatchRow | null;
  error: string | null;
  setMe: (me: Me) => void;
  setError: (e: string | null) => void;
  refresh: () => void;
}

export function useLobby(): Lobby {
  const [me, setMe] = useState<Me | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [live, setLive] = useState<MatchRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meRef = useRef<string | null>(null);
  meRef.current = me?.id ?? null;

  const refresh = useCallback(() => {
    void openChallenges().then(
      async (rows) => {
        setChallenges(rows);
        const found = await namesOf(rows.flatMap((c) => [c.challenger, c.opponent]));
        setNames((was) => ({ ...was, ...found }));
      },
      (e) => setError(errorText(e)),
    );
    void liveMatch().then(setLive, (e) => setError(errorText(e)));
  }, []);

  useEffect(() => {
    void signIn().then(
      (who) => {
        setMe(who);
        refresh();
      },
      (e) => setError(errorText(e)),
    );
    void syncClock();
  }, [refresh]);

  // Coming back from an email link lands with a session in the URL, which
  // supabase-js picks up on its own — this is how the screen finds out that the
  // anonymous player it was rendering is now somebody.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED" || event === "SIGNED_IN") {
        void refreshMe().then((who) => who && setMe(who));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // The same repair path the match log has, and needed for the same reason:
  // realtime is best-effort, and the one message that must not go missing here
  // is the guest walking into the match you're holding a code up for. Losing it
  // leaves the host staring at four characters forever while their opponent is
  // already playing. Two rows every few seconds is nothing.
  useEffect(() => {
    if (!me) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [me, refresh]);

  // Anything addressed to me, as it happens: a challenge arriving, a challenge
  // I sent being accepted, or the guest walking into the match I'm hosting.
  useEffect(() => {
    const id = me?.id;
    if (!id) return;
    const channel = supabase
      .channel(channelName("lobby", id))
      .on(
        "postgres_changes",
        { event: "*", schema: SCHEMA, table: "challenges", filter: `opponent=eq.${id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: SCHEMA, table: "challenges", filter: `challenger=eq.${id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: SCHEMA, table: "matches", filter: `host=eq.${id}` },
        (payload) => setLive(payload.new as MatchRow),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.id, refresh]);

  return { me, challenges, names, live, error, setMe, setError, refresh };
}
