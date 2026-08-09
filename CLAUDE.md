# CLAUDE.md

Two clicker games that are one game underneath.

`apps/battle` is the potato one (Yield, Inc. — a farm, weather, sabotage).
`apps/mill` is the puppy one (Puppy Mill — a kennel, same shape, different
world). They share `packages/sim` outright: same numbers, same cost curves,
same balance. What differs is every word and every pixel.

## The split, and where to make a change

| You want to change | Edit | Affects |
| --- | --- | --- |
| Balance, cost curves, mechanics, offline model | `packages/sim` | both games |
| What something is *called* | `apps/<game>/src/theme.ts` | one game |
| Art, scenes, layout, colour, copy | `apps/<game>/src/` | one game |
| Lobby, challenges, command log | `packages/online` | both games |

If a change lands in two places, it's probably in the wrong place. The point of
the monorepo is that retuning a rung is one edit.

## How theming works

`packages/sim` is written in neutral vocabulary — `stock`, `condition`,
`click`, `patch`, `hauler`, `machine` — and owns the ids, the numbers and the
mechanics. It knows nothing about potatoes or puppies.

Each app supplies a `src/theme.ts`: a `ThemeStrings` of names, blurbs and
damage words, keyed by engine id. The engine reaches it through the
`@clickers/theme` module alias, set per app in `vite.config.ts` and
`tsconfig.json`. That alias is the only thing that makes a build one game
rather than the other.

The indirection is there so `PRODUCER_BY_ID[id].name` keeps working everywhere,
including in the log lines the engine writes, without threading a theme
argument through every function in the sim.

**Adding a rung** is an engine change plus one line in each theme.
**Retuning a rung** is an engine change and nothing else.
A theme that falls behind throws at startup — `named()` in `packages/sim/src/theme.ts`
refuses to render an id it has no words for, rather than showing a player
`undefined`.

The engine's own tests run against `packages/sim/src/reference-theme.ts`, which
answers every id with its own name and so can never fall out of date. Each app's
tests run against that game's real theme, which is what catches a stale pack.

## The games are allowed to diverge

Nothing about the visual layer is shared. `apps/battle/src/render/farmScene.ts`
and `apps/mill/src/render/millScene.ts` are ~4k lines each of independent art,
and the components, styles and copy are per-game. Divergence there is expected
and costs nothing.

The one thing the scenes agree on is the producer id list they switch on — that
is "what you own", not "what it looks like".

## Commands

```
npm run dev            # the potato game, port 5173
npm run dev:mill       # the puppy game, port 5174 (both can run at once)
npm test               # sim + both apps' tests
npm run typecheck      # sim, online, both apps
npm run build          # both apps
npm run db:push        # rebuild the clickers schema
```

## Online

One Supabase schema, `clickers`, serves both games. The tables hold nothing but
an append-only log of commands; the engine folds that log identically on every
client. Since both games now run the same engine, a potato match and a puppy
match are the same rows — the `game` column exists only to keep the two lobbies
apart. `VITE_GAME` in each app's `.env` is what sets it.

See `db/schema.sql` for why there is no game state in the database.

## History

Both games were separate repos (`battle_clicker`, `puppy_mill`) until they were
merged here. Each repo's paths were rewritten to their monorepo homes before the
merge, so `git log apps/battle/src/App.tsx` reaches all the way back to the
original prototype. The old GitHub repos are archives; nothing pushes to them.
