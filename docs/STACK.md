# Stack

- **Frontend** — TypeScript + React, Vite SPA per game, static on Vercel.
- **Backend** — Supabase: Postgres holds an append-only command log (see
  `multiplayer.md`), Realtime `postgres_changes` fans it out, Auth is anonymous
  sign-in with upgrade to a real account. No Edge Functions.
- **`packages/sim`** — pure TypeScript, zero I/O. Every client folds the same
  log with the same `applyCommand`, so there is no separate authority to drift
  from. If the client ever can't be trusted, this is also the escape hatch: a
  server can validate the same log with the same code.

## No tick loop

Game state is a pure function of `(checkpoint, elapsed, rate, active effects)`.
Rates only change on discrete events, so both solo offline progression and
opponent extrapolation are one closed-form integration with a bigger `elapsed`.
This depends on rate being independent of stockpile size — see "Parked" in
`design.md`.

## Decisions

- **Vite, not Next.js.** SPA behind auth, no SEO surface.
- **Supabase Auth, not Clerk.** RLS keys off Supabase JWTs and anonymous
  sign-in matters for "send a friend a link and race me now".
- **Server time only.** Sequence and timestamps are assigned by a Postgres
  trigger; sim code never calls `Date.now()`. Client clocks lie and a log
  carrying client times is unreplayable.
- **The resource is a branded `Yield` type** (`numbers.ts`) so a bignum swap
  touches one file. Not building bignum; the top rung is already past 2^53 and
  nothing depends on exactness there.
- **Clicks batch** client-side and flush as a count; the sim clamps the rate.
  The only high-frequency write.
- **Randomness is seeded** on `(seed, event index)` so state replays instead
  of live-rolling.
