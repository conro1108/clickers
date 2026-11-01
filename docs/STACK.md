# Stack

- **Frontend** — TypeScript + React, Vite SPA per game, static on Vercel. No
  backend: a save is `localStorage`.
- **`packages/sim`** — pure TypeScript, zero I/O. If a save ever needs checking,
  a server can run the same code.

## No tick loop

Game state is a pure function of `(checkpoint, elapsed, rate)`. Rates only
change on discrete events, so offline progression is one closed-form integration
with a bigger `elapsed`. This depends on rate being independent of stockpile
size — see "Parked" in `design.md`.

## Decisions

- **Vite, not Next.js.** SPA, no SEO surface.
- **The resource is a branded `Yield` type** (`numbers.ts`) so a bignum swap
  touches one file. Not building bignum; the top rung is already past 2^53 and
  nothing depends on exactness there.
- **Clicks batch** client-side and flush as a count; the sim clamps the rate.
- **Randomness is seeded** on `(seed, event index)` so state replays instead
  of live-rolling.
