/**
 * The ways a match starts, and the ways you find out somebody wants one.
 *
 * Two doors on purpose. A **join code** needs no identity at all — you read four
 * characters across a room and race a stranger. A **challenge** is addressed to
 * a handle and survives the tab being closed, which is what wanting to play Brad
 * specifically actually requires. Everything either of them is allowed to do is
 * in `db/schema.sql`; this is just the calling code.
 */

import type { ScoringRule } from "@clickers/sim";

import { GAME } from "./config.js";
import { lookup, supabase } from "./supabase.js";

export interface MatchRow {
  id: string;
  join_code: string | null;
  host: string;
  guest: string | null;
  seed: string;
  duration_ms: number;
  scoring: ScoringRule;
  status: "waiting" | "active" | "finished" | "abandoned";
  started_at: string | null;
  winner: string | null;
}

export interface ChallengeRow {
  id: string;
  challenger: string;
  opponent: string;
  duration_ms: number;
  scoring: ScoringRule;
  status: "pending" | "accepted" | "declined";
  match_id: string | null;
  created_at: string;
}

export interface MatchTerms {
  durationMs: number;
  scoring: ScoringRule;
}

/** No I/L/O/0/1 — the code gets read aloud across a room. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export async function hostMatch(terms: MatchTerms): Promise<MatchRow> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("matches")
    .insert({
      game: GAME,
      host: session.user.id,
      join_code: makeCode(),
      duration_ms: terms.durationMs,
      scoring: terms.scoring,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MatchRow;
}

export async function joinByCode(code: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("join_match", { p_code: code.trim().toUpperCase(), p_game: GAME });
  // The function raises rather than returning nothing, so the message is already
  // the sentence worth showing.
  if (error) throw new Error(error.message.replace(/^.*no open match/, "No open match"));
  return data as MatchRow;
}

export async function abandon(matchId: string): Promise<void> {
  await supabase.from("matches").update({ status: "abandoned" }).eq("id", matchId);
}

/** Mark a finished match finished. Either player may; both agree on the winner. */
export async function settle(matchId: string, winner: string | null): Promise<void> {
  await supabase.from("matches").update({ status: "finished", winner }).eq("id", matchId);
}

export async function challenge(handle: string, terms: MatchTerms): Promise<ChallengeRow> {
  const them = await lookup(handle);
  if (!them) throw new Error(`Nobody here is called ${handle}.`);
  if (!them.claimed) {
    throw new Error(`${them.display_name} is playing as a guest — they can't be challenged yet.`);
  }
  const { data: session } = await supabase.auth.getUser();
  if (them.id === session.user?.id) throw new Error("You can't challenge yourself.");

  const { data, error } = await supabase
    .from("challenges")
    .insert({ game: GAME, opponent: them.id, duration_ms: terms.durationMs, scoring: terms.scoring })
    .select()
    .single();
  if (error) throw error;
  return data as ChallengeRow;
}

export async function acceptChallenge(id: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("accept_challenge", { p_challenge: id });
  if (error) throw error;
  return data as MatchRow;
}

export async function declineChallenge(id: string): Promise<void> {
  await supabase.from("challenges").update({ status: "declined" }).eq("id", id);
}

/** Every challenge with your name on it, either end, still open. */
export async function openChallenges(): Promise<ChallengeRow[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("game", GAME)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChallengeRow[];
}

/**
 * A match you're already in that hasn't finished.
 *
 * The reason this exists: a challenge accepted while you were on the title
 * screen starts a match you never pressed a button for. Without this, the
 * challenger sits in a lobby watching a match they're already losing.
 */
export async function liveMatch(): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("game", GAME)
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as MatchRow) ?? null;
}

/** Display names for a set of user ids, from the shared profile table. */
export async function namesOf(ids: string[]): Promise<Record<string, string>> {
  const wanted = ids.filter(Boolean);
  if (wanted.length === 0) return {};
  const { data } = await supabase
    .schema("app")
    .from("profiles")
    .select("id,display_name,handle")
    .in("id", wanted);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    // "Player" is what the shared signup trigger writes for someone who hasn't
    // named themselves, so it isn't a name — it's the absence of one, and a
    // match between two of them would have both sides called Player. The handle
    // is at least unique.
    const chosen = row.display_name && row.display_name !== "Player" ? row.display_name : null;
    out[row.id] = chosen ?? row.handle;
  }
  return out;
}
