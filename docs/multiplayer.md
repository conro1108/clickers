# Multiplayer

Shared by both games: `packages/online` and `db/schema.sql`. The schema is the
`clickers` slice of the shared toybox Supabase project (see the Shared Supabase
section of `~/projects/CLAUDE.md`). Pushing it is a full rebuild that drops
every in-progress match.

## Only a command log

**Never put game state in Postgres.** No stock column, no rate, no shield. A
match owns an append-only log of commands; both clients fold it with the same
`applyCommand` the offline game uses. Sabotage is a read-modify-write across two
players, and two attacks landing together would spend the same shield pool —
but only if there is a derived row to lose an update on. Keep the log and no
lock is needed.

The database enforces what breaks by accident: who may write as whom, into
which match, in what order. Sequence and timestamp come from a trigger holding
a lock on the match row; a client never names either. Affordability is *not*
enforced and can't be without reimplementing the economy in plpgsql.

**Identity is anonymous by default, claimed to be challengeable.** Anyone can
play a stranger by join code. Being challenged by handle requires a real
account at both ends — an anonymous session is one cleared localStorage from a
new uuid. This is an RLS rule off the JWT's `is_anonymous` plus a
security-definer lookup for the other side, not a UI check. Don't let it become
one.

## Realtime is best-effort; keep the repair path

A dropped message is invisible until a later one exposes the gap, so a command
lost with nothing following it strands a client on a stale log until the buzzer.
Both the match log and the lobby poll on a timer alongside their subscription.
Don't remove either — subscription-only stranded a player about one run in
four.

## Verifying

- `npm run db:verify` proves the RLS rules against the live database. Not part
  of `npm test`; run it after any schema change — RLS bugs typecheck fine.
- `npm run test:online` drives two real browsers through claim → challenge →
  race and checks the two folds agree. Uses admin-created accounts because
  anonymous signup is rate-limited per IP per hour.
