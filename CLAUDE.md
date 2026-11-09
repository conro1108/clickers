# CLAUDE.md

Two clicker games that are one game underneath. `apps/potatoes` is Small
Potatoes (a farm, then the potato's whole journey to the table and back); `apps/puppies` is Puppy Mill (a kennel, same
shape, different world). They share `packages/sim` outright: same numbers, same
cost curves, same balance. What differs is every word and every pixel. Vite +
React + TypeScript, no backend. `npm run dev` (potatoes, :5173) /
`dev:puppies` (:5174) / `test` / `typecheck` / `build`.

## The split

| You want to change | Edit | Affects |
| --- | --- | --- |
| Balance, cost curves, mechanics, offline model | `packages/sim` | both games |
| What something is *called* | `apps/<game>/src/theme.ts` | one game |
| Art, scenes, layout, colour, copy | `apps/<game>/src/` | one game |

If a change lands in two places, it's probably in the wrong place. The point of
the monorepo is that retuning a rung is one edit.

## Map

| Want to change… | File |
| --- | --- |
| Number formatting, tier coins, the `Yield` brand | `packages/sim/src/numbers.ts` (drawn by `components/Coin.tsx`, art in `render/coin.ts`) |
| Seeded randomness | `packages/sim/src/rng.ts` |
| Theme seam, `named()` | `packages/sim/src/theme.ts` (tests use `reference-theme.ts`) |
| Worlds, their order, gates, rungs, lands, upgrades | `packages/sim/src/solo/content.ts` |
| Rates, prices | `packages/sim/src/solo/economy.ts` |
| Time, commands, whether a gate is pending (`advance`, `applySiteCommand`, `gatePending`) | `packages/sim/src/solo/site.ts`, types in `state.ts` |
| Weather | `packages/sim/src/solo/weather.ts` |
| Heirlooms and perks | `packages/sim/src/solo/prestige.ts` |
| Save/load, old-id migrations | `packages/sim/src/solo/persist.ts` |
| Headless player for tuning | `packages/sim/src/solo/sim.ts` |
| How long the long game takes | `tools/pace.mts` |
| Screens, the homestead, door strip, arrival cuts, dev back room | `apps/<game>/src/App.tsx` |
| Per-world words: door, shop subtitle, gate line, cut | `apps/<game>/src/worlds.ts` |
| Game loop, autosave | `apps/<game>/src/useFarm.ts` / `useMill.ts` |
| Shop, gate sale screen, upkeep, seeds | `components/FarmShop.tsx` / `MillShop.tsx` |
| The outside world's picture | `render/farmScene.ts` / `millScene.ts` |
| The other worlds' pictures | potatoes: `render/<place>Scene.ts` (store, factory, road, market, supermarket, larder, kitchen, table, heap). puppies: `render/<world>Scene.ts`, then park/walk/porch |
| What the potato worlds share: the floor, the front-left pile, carriers | potatoes `render/longScene.ts` (puppies has its own for its last three) |
| Which engine world is which potato place, and every per-world word | `apps/potatoes/src/worlds.ts` |
| Which scene draws | `components/FarmScene.tsx` / `MillScene.tsx` |
| The fall half of an arrival cut | `render/crossing.ts`, `components/CutFall.tsx` |
| Sprites and icons | `render/art.ts` (char grids), `render/pixel.ts` |
| Producer art changing with upgrades | `apps/<game>/src/marks.ts` |
| Screenshot a seeded save | `tools/shot.mts` |

Worlds are `WORLDS` in `solo/content.ts`, one depth: `SiteState.depth` indexes
it, and everything up to it is open and producing. Each world past the first
opens with the gate upgrade `WORLD_GATE` names, bought at the bottom of the
ladder before it. From the void on, each world's first rung is priced past
what a run earns without enough seeds behind it, so which generation reaches
which world is set by price alone (`tools/pace.mts`). Adding a world is engine content, a `worlds.ts` entry
and a scene per app.

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

## Gotchas

- The app shells are copies, not shared: `App.tsx`, the shop and the hooks
  exist once per game, so a behaviour fix there usually belongs in both.
- `depth` (this run, back to 0 on a hand-down), `reached` (deepest any
  generation got) and `world` (where you're looking) are easy to mix up.
- Reusing an id retired in `OLD_IDS` (`persist.ts`) hands old saves something
  they never bought.
- In the potato game the engine's world ids are just slots: `inside` is the
  store, `void` the supermarket, `home` the heap. Name scenes and art after the
  place, and look the slot up in the header of `worlds.ts`, or you'll draw a
  void in the supermarket.
- Only the deepest open world's four buildings count (`landsFor`), so a site's
  defences drop to its perks at every gate. Pricing a world's buildings so the
  first level isn't cheap on arrival leaves that world undefended.
