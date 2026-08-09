# Multiplayer

Applies to both games — `packages/online` and `db/schema.sql` are shared.

## Multiplayer is a command log, and nothing else

`db/schema.sql` is The clickers' slice of the shared toybox Supabase project (see
the Shared Supabase section of `~/projects/CLAUDE.md`). It is a full rebuild, not
a migration: pushing drops the schema and every in-progress match with it.

**Never put game state in Postgres.** No stock column, no rate, no shield. The
only mutable thing a match owns is an append-only log of commands, and both
clients fold it into a `MatchState` with the same `applyCommand` the offline game
uses. That's what makes the hard bug impossible rather than merely unlikely:
sabotage is a read-modify-write across two players, and two attacks landing
together would both spend the same pre-attack shield pool — but only if there's a
row of derived state to lose an update on. Materialise anything and you need the
lock STACK.md describes; keep the log and you don't.

So `packages/sim` staying I/O-free isn't housekeeping, it's the escape hatch: an
Edge Function can validate the same log the day trusting the client stops being
funny. Deploys are scriptable through the Management API with the token
`db/push.mjs` already uses — no CLI — but a Deno function importing `@mill/sim`
needs bundling first.

What the database enforces is what breaks by accident: who may write as whom,
into which match, in what order. Sequence and timestamp are both assigned by a
trigger holding a lock on the match row, so a client never names either — client
clocks lie, and a match whose commands carry client times is unreplayable.
Affordability is *not* enforced and can't be without reimplementing the economy
in plpgsql.

**Identity is anonymous by default and claimed to be challengeable.** Anyone can
play a stranger through a join code. Being *challenged by name* requires a real
account at both ends, because a challenge is a promise to still exist tomorrow
and an anonymous session is one cleared localStorage from a new uuid. It's an
RLS rule, off the JWT's `is_anonymous` plus a security-definer lookup for the
other side — not a UI check, which is a thing to be talked out of.

`npm run db:verify` proves all of it against the live database and is not part of
`npm test`, which stays offline and instant. Run it after any schema change: RLS
bugs typecheck fine and no unit test can see one.

`npm run test:online` drives two real browsers through claim → challenge → race
and checks that the two folds agree. It uses admin-created accounts rather than
anonymous ones because anonymous signup is rate limited per IP per hour and a
test that burns two a run can only run fifteen times.

## Realtime is best-effort; always leave a repair path

A dropped message is invisible — a gap is only detectable when a *later* message
arrives to expose it, so a command lost with nothing following it strands that
client on a stale log until the buzzer, showing the wrong score and never saying
why. Both the match log and the lobby poll for what they're missing on a timer
alongside their subscription. Don't remove either; the first version had only the
subscription and stranded a player about one run in four.

## Git

This project merges straight to `main` — no feature branches or PRs.

Always commit and push after completing a piece of work, without asking for
confirmation first. Always `git pull` before pushing, in case downstream
changes have landed — this is still single-threaded on `main`, just cheap
insurance.
