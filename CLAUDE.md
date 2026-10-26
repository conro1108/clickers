# CLAUDE.md

Two clicker games that are one game underneath. `apps/potatoes` is Yield, Inc.
(a farm, weather, sabotage); `apps/puppies` is Puppy Mill (a kennel, same
shape, different world). They share `packages/sim` outright: same numbers, same
cost curves, same balance. What differs is every word and every pixel. Vite +
React + TypeScript, Supabase for versus. `npm run dev` (potatoes, :5173) /
`dev:puppies` (:5174) / `test` / `typecheck` / `build` / `db:push`.

## The split

| You want to change | Edit | Affects |
| --- | --- | --- |
| Balance, cost curves, mechanics, offline model | `packages/sim` | both games |
| What something is *called* | `apps/<game>/src/theme.ts` | one game |
| Art, scenes, layout, colour, copy | `apps/<game>/src/` | one game |
| Lobby, challenges, command log | `packages/online` | both games |

If a change lands in two places, it's probably in the wrong place. The point of
the monorepo is that retuning a rung is one edit.

## Map

Two modes: **solo** (the homestead you keep, `packages/sim/src/solo/`) and
**versus** (a five-minute match, the rest of `packages/sim/src`). Their ladders
are separate on purpose, so tuning one never retunes the other.

| Want to change… | File |
| --- | --- |
| Versus rungs, upgrades, attacks, defences | `packages/sim/src/content.ts` |
| Versus rates, prices, repair | `packages/sim/src/economy.ts` |
| How an attack lands, shields | `packages/sim/src/combat.ts` |
| Match rules, commands, click rate limits, scoring | `packages/sim/src/match.ts`, types in `state.ts` |
| The bot ladder | `packages/sim/src/bot.ts` |
| The reference human the ladder is graded against | `packages/sim/src/reference.ts` |
| Headless versus match for tuning | `packages/sim/src/balance.ts` |
| Number formatting, suffixes, the `Yield` brand | `packages/sim/src/numbers.ts` |
| Seeded randomness | `packages/sim/src/rng.ts` |
| Theme seam, `named()` | `packages/sim/src/theme.ts` (tests use `reference-theme.ts`) |
| Worlds, their order, gates, solo rungs, lands, upgrades | `packages/sim/src/solo/content.ts` |
| Solo rates, prices, seed tax | `packages/sim/src/solo/economy.ts` |
| Solo time, commands, whether a gate is pending (`advance`, `applySiteCommand`, `gatePending`) | `packages/sim/src/solo/site.ts`, types in `state.ts` |
| Weather | `packages/sim/src/solo/weather.ts` |
| Heirlooms and perks | `packages/sim/src/solo/prestige.ts` |
| Save/load, old-id migrations | `packages/sim/src/solo/persist.ts` |
| Headless solo rival for tuning | `packages/sim/src/solo/sim.ts` |
| Which game, which schema | `packages/online/src/config.ts` |
| Join codes, challenges | `packages/online/src/matches.ts` |
| Folding the command log into a match | `packages/online/src/useOnlineMatch.ts` |
| Who you are, handles, lobby realtime | `packages/online/src/supabase.ts`, `useLobby.ts` |
| Screens, the homestead, door strip, arrival cuts, dev back room | `apps/<game>/src/App.tsx` |
| Per-world words: door, shop subtitle, gate line, cut | `apps/<game>/src/worlds.ts` |
| Solo loop, autosave | `apps/<game>/src/useFarm.ts` / `useMill.ts` |
| Bot match loop | `apps/<game>/src/useMatch.ts` |
| Solo shop, gate sale screen, upkeep, seeds | `components/FarmShop.tsx` / `MillShop.tsx` |
| The outside world's picture | `render/farmScene.ts` / `millScene.ts` |
| The other worlds' pictures | `render/<world>Scene.ts` (inside, beyond, deep, origin, void, end) |
| Which scene draws | `components/FarmScene.tsx` / `MillScene.tsx` |
| The fall half of an arrival cut | `render/crossing.ts`, `components/CutFall.tsx` |
| Sprites and icons | `render/art.ts` (char grids), `render/pixel.ts` |
| Producer art changing with upgrades | `apps/<game>/src/marks.ts` |
| Versus shop, feed, opponents, lobby | `components/Shop.tsx`, `Feed.tsx`, `Opponents.tsx`, `Lobby.tsx` |
| Screenshot a seeded save / drive two browsers | `tools/shot.mts` / `tools/two-players.mts` |

Worlds are `WORLDS` in `solo/content.ts`, one depth: `SiteState.depth` indexes
it, and everything up to it is open and producing. Each world past the first
opens with the gate upgrade `WORLD_GATE` names, bought at the bottom of the
ladder before it. `void` and `end` are `TAXED_WORLDS`, priced against your
seeds. Adding a world is engine content, a `worlds.ts` entry and a scene per app.

## Theming

`packages/sim` speaks neutral vocabulary (`stock`, `condition`, `patch`,
`hauler`, `machine`) and owns the ids, numbers and mechanics. Each app's
`src/theme.ts` supplies the words, reached through the `@clickers/theme` alias
in its `vite.config.ts` and `tsconfig.json`; that alias is the only thing that
makes a build one game rather than the other. Adding a rung is an engine change
plus one line per theme; retuning is engine only. A theme that falls behind
throws at startup (`named()`) rather than showing a player `undefined`.

## The games are allowed to diverge

Scenes, components, styles and copy are per-game, and the two pictures are
different on purpose (the farm is a landscape, the mill a building). The scenes
agree only on the producer ids they switch on.

## Online

One Supabase schema, `clickers`, for both games. It holds only an append-only
command log, folded identically on every client by the shared engine; `VITE_GAME`
in each app's `.env` sets the `game` column that keeps the two lobbies apart.

## Gotchas

- The app shells are copies, not shared: `App.tsx`, the shop and the hooks
  exist once per game, so a behaviour fix there usually belongs in both.
- `depth`, `reached` and `world` are three different things. `depth` is this
  run and goes back to 0 on a hand-down, `reached` is the deepest any
  generation got, `world` is only where you're looking. Key a hint off `depth`
  and it vanishes after a hand-down; assume you stood in the deepest world and
  the arrival cut holds the wrong picture.
- The `dev_depth` lever opens worlds without walking you through them, so an
  arrival has to check you actually moved, or the dev lever plays a cut.
- A pending gate freezes the shop from the moment ten of the last rung stand.
  Price a gate against that frozen rate, not a bought-out ladder, or a player
  sits on a "Not yet" screen for days.
- `OLD_IDS` in `persist.ts` maps retired ids onto new ones. Reusing a retired id
  for new content quietly hands old saves something they never bought.
