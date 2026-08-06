/**
 * The connection to the shared toybox Supabase project, and who you are on it.
 *
 * Both values in the env are public: the publishable key is only useful
 * alongside the RLS policies in `db/schema.sql`, which are what actually decide
 * who may read a match or write a command.
 */

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    db: { schema: "puppy_mill" },
    auth: { persistSession: true, autoRefreshToken: true },
  },
);

/** app.profiles is the shared core of the toybox — one handle across every game. */
const app = supabase.schema("app");

export interface Me {
  id: string;
  handle: string;
  displayName: string;
  /**
   * Whether there's a real account behind this session.
   *
   * An anonymous player can do everything except be somebody's rival: a
   * challenge is a promise to still be here tomorrow, and an anonymous session
   * is one cleared localStorage away from a new uuid. The rule is enforced in
   * RLS; this is just what lets the UI say so before the insert fails.
   */
  claimed: boolean;
}

/**
 * Sign in, anonymously and silently if there's nobody here yet.
 *
 * Deliberately no login screen. A mill you can't play until you make an account
 * is a mill nobody plays, and the profile row the signup trigger creates is
 * already enough to render a name.
 */
export async function signIn(): Promise<Me> {
  const { data } = await supabase.auth.getSession();
  let user = data.session?.user;
  if (!user) {
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.user) throw error ?? new Error("could not sign in");
    user = signed.user;
  }
  return profileOf(user.id, user.is_anonymous !== true);
}

async function profileOf(id: string, claimed: boolean): Promise<Me> {
  const { data, error } = await app
    .from("profiles")
    .select("handle,display_name")
    .eq("id", id)
    .single();
  if (error) throw error;
  return { id, handle: data.handle, displayName: data.display_name, claimed };
}

/** Re-read who you are — after a rename, or after coming back from an email link. */
export async function refreshMe(): Promise<Me | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return profileOf(data.user.id, data.user.is_anonymous !== true);
}

/**
 * Handles are how one person finds another, so they're compared without case —
 * `app.profiles.handle` is plain unique text shared across every toy in the box,
 * and lowercasing on the way in is what stops `brad` and `Brad` being two
 * people. Kept to the characters that survive being read aloud.
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function handleProblem(handle: string): string | null {
  if (handle.length < 3) return "At least three characters.";
  if (handle.length > 20) return "Twenty characters at most.";
  return null;
}

export async function setHandle(handle: string, displayName: string): Promise<Me> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("not signed in");
  const { error } = await app
    .from("profiles")
    .update({ handle, display_name: displayName || handle })
    .eq("id", session.user.id);
  // 23505 is the unique index on handle. Worth its own sentence — "duplicate key
  // value violates unique constraint" is not a thing to show a player.
  if (error) throw new Error(error.code === "23505" ? "That handle is taken." : error.message);
  return profileOf(session.user.id, session.user.is_anonymous !== true);
}

/**
 * Claim the session: attach an email to the anonymous user you already are.
 *
 * The uuid does not change, so every match, challenge and command already
 * written stays yours. That's the whole reason identity is an upgrade here
 * rather than a gate — nothing has to be migrated, and nobody has to decide who
 * they are before they've seen the game.
 */
export async function claimWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export interface FoundPlayer {
  id: string;
  handle: string;
  display_name: string;
  claimed: boolean;
}

/** Look somebody up to challenge them. Null if that handle isn't anybody. */
export async function lookup(handle: string): Promise<FoundPlayer | null> {
  const { data, error } = await supabase.rpc("lookup", { p_handle: handle });
  if (error) throw error;
  return (data as FoundPlayer[])[0] ?? null;
}

/**
 * How far ahead of the server this machine's clock is, in ms.
 *
 * Every client extrapolates production forward from a checkpoint, so a clock a
 * minute fast shows a minute of puppies nobody grew — and the two players would
 * disagree about when the match ended. Commands are stamped by the database, so
 * this only has to be good enough for display and for the final buzzer.
 */
let offset = 0;

export async function syncClock(): Promise<void> {
  const sentAt = Date.now();
  const { data, error } = await supabase.rpc("server_now");
  if (error || !data) return;
  const roundTrip = Date.now() - sentAt;
  // Half the round trip is the usual guess at one-way latency, and it's the
  // right kind of wrong: it can only be off by the asymmetry, not by the whole
  // trip.
  offset = Date.now() - (new Date(data as string).getTime() + roundTrip / 2);
}

/** Now, on the server's clock. */
export function serverNow(): number {
  return Date.now() - offset;
}
