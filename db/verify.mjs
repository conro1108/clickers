#!/usr/bin/env node
// Prove the schema still enforces what it claims to. Run after `npm run db:push`.
//
// Not part of `npm test`: it needs the network and the live shared database, and
// vitest should stay offline and instant. But it earns its keep — RLS bugs
// typecheck fine, pass every unit test, and then let a stranger read your match.
// The rules worth checking here are the ones the game cannot enforce for itself:
// who may write as whom, into which match, in what order, and who is allowed to
// be somebody's rival.
//
// Signs in throwaway users — two anonymous, two with real accounts, because the
// challenge rules are specifically about the difference — and deletes them all
// at the end.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(join(homedir(), "projects", ".supabase.env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEY: KEY, SUPABASE_SECRET_KEY: SECRET } = env;

let failures = 0;
const users = [];

async function anon(label) {
  const res = await fetch(`${URL_}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  if (!body.access_token) throw new Error(`${label} sign-in failed: ${JSON.stringify(body)}`);
  users.push(body.user.id);
  return { token: body.access_token, id: body.user.id, label };
}

/** A real account, made through the admin API so there's no inbox in the loop. */
async function claimed(label) {
  const email = `verify-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();
  const made = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  }).then((r) => r.json());
  if (!made.id) throw new Error(`${label} create failed: ${JSON.stringify(made)}`);
  users.push(made.id);

  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!res.access_token) throw new Error(`${label} sign-in failed: ${JSON.stringify(res)}`);
  return { token: res.access_token, id: made.id, label };
}

function rest(user, path, opts = {}, schema = "puppy_mill") {
  return fetch(`${URL_}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
      "Accept-Profile": schema,
      "Content-Profile": schema,
      Prefer: "return=representation",
    },
  });
}

async function check(label, res, wantStatus) {
  const body = await res.text();
  const ok = res.status === wantStatus;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}` +
      (ok ? "" : ` — got ${res.status}, wanted ${wantStatus}: ${body.slice(0, 200)}`),
  );
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function claim(label, cond) {
  if (!cond) failures++;
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
}

const host = await anon("host");
const guest = await anon("guest");
const stranger = await anon("stranger");

console.log("identity");
const profiles = await check(
  "signup auto-creates a row in app.profiles",
  await rest(host, `profiles?id=eq.${host.id}&select=handle`, {}, "app"),
  200,
);
claim("the profile row exists", profiles?.length === 1);

const found = await check(
  "lookup() finds a player by handle",
  await rest(host, "rpc/lookup", {
    method: "POST",
    body: JSON.stringify({ p_handle: profiles[0].handle.toUpperCase() }),
  }),
  200,
);
claim("lookup is case-insensitive and returns the right player", found?.[0]?.id === host.id);
claim("an anonymous player reads as unclaimed", found?.[0]?.claimed === false);

console.log("\nmatch lifecycle");
const CODE = `V${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const made = await check(
  "host opens a match",
  await rest(host, "matches", {
    method: "POST",
    body: JSON.stringify({ host: host.id, join_code: CODE, duration_ms: 300000 }),
  }),
  201,
);
const id = made?.[0]?.id;

await check(
  "a host cannot open a match in somebody else's name",
  await rest(host, "matches", {
    method: "POST",
    body: JSON.stringify({ host: guest.id, join_code: `${CODE}X`, duration_ms: 300000 }),
  }),
  403,
);

const peek = await check(
  "a stranger cannot see a match they aren't in",
  await rest(stranger, `matches?id=eq.${id}&select=id`),
  200,
);
claim("...and gets an empty list rather than the row", peek?.length === 0);

await check(
  "nobody can write to a match that hasn't started",
  await rest(host, "commands", {
    method: "POST",
    body: JSON.stringify({ match_id: id, body: { type: "click", count: 1 } }),
  }),
  400,
);

await check(
  "a stranger cannot join with the wrong code",
  await rest(stranger, "rpc/join_match", { method: "POST", body: JSON.stringify({ p_code: "NOPE" }) }),
  400,
);
const joined = await check(
  "guest joins by code",
  await rest(guest, "rpc/join_match", { method: "POST", body: JSON.stringify({ p_code: CODE }) }),
  200,
);
claim("the match is active", joined?.status === "active");
claim("the clock started on the server", Boolean(joined?.started_at));
await check(
  "the code is spent — a second player cannot walk in",
  await rest(stranger, "rpc/join_match", { method: "POST", body: JSON.stringify({ p_code: CODE }) }),
  400,
);

console.log("\nthe command log");
function send(user, body) {
  return rest(user, "commands", {
    method: "POST",
    body: JSON.stringify({ match_id: id, body }),
  });
}

const first = await check("host sends a command", await send(host, { type: "click", count: 4 }), 201);
claim("the sequence starts at 0", first?.[0]?.seq === 0);
claim("the database stamped the time", Boolean(first?.[0]?.at));

const second = await check(
  "guest sends one into the same match",
  await send(guest, { type: "click", count: 2 }),
  201,
);
claim("the sequence is dense across both players", second?.[0]?.seq === 1);

await check(
  "a player cannot act as their opponent",
  await rest(host, "commands", {
    method: "POST",
    body: JSON.stringify({ match_id: id, player: guest.id, body: { type: "click", count: 99 } }),
  }),
  403,
);
await check(
  "a stranger cannot act in someone else's match",
  await send(stranger, { type: "click", count: 99 }),
  403,
);

const seen = await check("both players read the same log", await rest(guest, `commands?match_id=eq.${id}&select=seq,player,body&order=seq`), 200);
claim("...and it is both commands, in order", seen?.length === 2 && seen[0].seq === 0);

const spy = await check(
  "a stranger cannot read the log",
  await rest(stranger, `commands?match_id=eq.${id}&select=seq`),
  200,
);
claim("...and gets nothing back", spy?.length === 0);

console.log("\nchallenges — the identity rule");
await check(
  "an anonymous player cannot challenge anyone",
  await rest(host, "challenges", {
    method: "POST",
    body: JSON.stringify({ challenger: host.id, opponent: guest.id, duration_ms: 300000 }),
  }),
  403,
);

const brad = await claimed("brad");
const you = await claimed("you");

await check(
  "a real account still cannot challenge an anonymous one",
  await rest(you, "challenges", {
    method: "POST",
    body: JSON.stringify({ challenger: you.id, opponent: host.id, duration_ms: 300000 }),
  }),
  403,
);

const challenge = await check(
  "a real account can challenge a real account",
  await rest(you, "challenges", {
    method: "POST",
    body: JSON.stringify({ challenger: you.id, opponent: brad.id, duration_ms: 300000 }),
  }),
  201,
);
const challengeId = challenge?.[0]?.id;

const nosy = await check(
  "a third party cannot see the challenge",
  await rest(stranger, `challenges?id=eq.${challengeId}&select=id`),
  200,
);
claim("...and gets nothing back", nosy?.length === 0);

await check(
  "you cannot accept a challenge aimed at someone else",
  await rest(you, "rpc/accept_challenge", {
    method: "POST",
    body: JSON.stringify({ p_challenge: challengeId }),
  }),
  400,
);
const accepted = await check(
  "the challenged player accepts",
  await rest(brad, "rpc/accept_challenge", {
    method: "POST",
    body: JSON.stringify({ p_challenge: challengeId }),
  }),
  200,
);
claim("it starts a live match between the two of them", accepted?.status === "active");
claim("with the challenger as host", accepted?.host === you.id && accepted?.guest === brad.id);
await check(
  "a challenge cannot be accepted twice",
  await rest(brad, "rpc/accept_challenge", {
    method: "POST",
    body: JSON.stringify({ p_challenge: challengeId }),
  }),
  400,
);

// Realtime is the piece with no fallback: if it stops delivering, the match just
// silently stops updating for one player and looks like a hang. It's also the
// piece most likely to break invisibly — a table has to be in the
// supabase_realtime publication and the schema has to be granted, and miss
// either and subscribe() still reports SUBSCRIBED.
console.log("\nrealtime");
{
  const rt = createClient(URL_, KEY, {
    db: { schema: "puppy_mill" },
    auth: { persistSession: false },
  });
  // As a player: realtime applies the same RLS as a select, so a watcher who
  // isn't in the match would correctly see nothing and pass for the wrong reason.
  await rt.realtime.setAuth(guest.token);

  const arrived = [];
  // Waited on rather than slept past. A fixed sleep here is a coin flip: too
  // short and a healthy subscription reports as broken, which is worse than no
  // test at all because the next person deletes it.
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("subscribe timed out")), 10000);
    rt.channel(`verify:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "puppy_mill", table: "commands", filter: `match_id=eq.${id}` },
        (p) => arrived.push(p.new.seq),
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (err || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(err ?? new Error(status));
        }
      });
  });

  try {
    await ready;
    await check(
      "the command being watched for actually inserts",
      await send(host, { type: "buy_producer", producer: "pen", qty: 1 }),
      201,
    );
    const deadline = Date.now() + 8000;
    while (arrived.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
    claim(
      `an inserted command arrives over the wire${arrived.length ? "" : " — nothing did in 8s"}`,
      arrived.length > 0,
    );
  } catch (e) {
    failures++;
    console.log(`  FAIL could not subscribe — ${e.message}`);
  }
  await rt.removeChannel(rt.getChannels()[0]);
}

for (const uid of users) {
  await fetch(`${URL_}/auth/v1/admin/users/${uid}`, {
    method: "DELETE",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
}

console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
