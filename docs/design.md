# Design

What the games are for and the decisions that bind future changes. Both games
run the same `packages/sim`; everything here applies to both unless a section
says otherwise. Numbers live in code, not here.

## Thesis

A clicker gets a second axis once something is actively taking production
away: every purchase becomes "grow" vs "hold onto what I've got". Weather
supplies that pressure. The thesis is the thing to protect.

Non-goal: base-building depth. The upgrade tree must stay legible.

## The homestead

One site you keep, growing while away, with prestige under it.

- **Weather is deterministic.** Schedule keyed on
  `(seed, weatherIndex)`; events land at instants the state already knows, so a
  week offline resolves exactly and a save can't be reloaded for better luck.
- **Nothing expires.** Broken kit and condition only recover by spending, so
  rate is constant between events and a ten-day gap is the same code path as
  ten seconds. Keep it that way.
- **Defense is permanent buildings, not timed shields**, because most weather
  lands with the tab closed. They stack with diminishing returns and never
  reach zero exposure. Weather must cost enough that mitigation pays for itself
  (at ~7% it didn't) and boons must be small (one good year outweighed every
  storm and made mitigation pointless). Only the deepest open world's buildings
  count, so every world asks for its own defences.
- **Repairs are priced against the production they restore**, not the cost
  curve. Off the working count breakage became a coupon; off the owned count
  it became unpayable and insurance a money printer.
- Past the first hour the game is gated on elapsed time, not attention — a 6x
  difference in play time moved the Convergence by less than 2x. Grind is not
  a tuning lever.

### The Convergence

Buying the top outside rung folds the world: eight more rungs arrive as a
descent through the thing you were standing on, and outside weather is replaced
by a different table with two extra buildings. It is the game's only cutscene,
and the shop empties to that one row at the threshold so the countdown is
legible.

**Binding: the Convergence must be reachable in one dedicated run, on a first
save, with no prestige.** Any retune of the gate has to keep every check-in
cadence converging inside a week from nothing.

- `converged` is enforced in the sim's command handler, not just hidden in the
  shop — a hand-edited save can't buy inside rungs under a sky. Old saves
  backfill the flag from the top-rung upgrade.
- Every generation starts outside. Prestige keeps `converged` (warp back in is
  allowed) unless the player opts to leave it behind and re-earn the fold.
- Condition scaling for inside rungs is a separate term from
  `producerMultiplier`, because clean rate and repair cost are quoted against
  that function and a condition term there would discount repairs on a site
  that was also losing dirt.

### Prestige

Hand-down mints heirlooms from the run's lifetime output (a root, so run-to-run
feedback is damped). Held heirlooms multiply output; spent ones buy permanent
perks — one pile, competing uses. The panel appears once converged or once any
heirloom exists; the curve puts the first heirloom at about the fold.

**Open — the meta-economy.** Held heirlooms multiply output linearly and
without bound, so each run funds the next many times over and any perk table
clears in a handful of generations. Moving to a fourth root fixed the minting
side (a converged week no longer hands generation two a four-figure
multiplier); the multiplier itself is still the lever — damp it, or wire
`heirloomsFor`'s unused `vigor` below 1. Not pulled because it changes how every
generation after the first feels, and the first is the one that matters.

## Parked

**Spoilage / rehoming** (stock decays unless you spend on storage): pushes
against hoarding, fits both skins. Parked because it is the one mechanic that
couples rate to stockpile size, which breaks the closed-form checkpoint model in
STACK.md. A deliberate trade if ever taken, not something to stumble into.

## Per-game

Only words and pixels differ (see CLAUDE.md). Theme choices worth knowing:

- Potatoes: farm, soil, weather; the fold is inside the tuber. The hoard is
  drawn as denominations of ten.
- Puppies: the mill makes them, and every world after it is them getting out and getting home;
  the fold is the tunnel under the yard, and the count turns from stock into the pack. The hoard is
  a crowd, not a pile — a heap of bodies read wrong. Puppies are drawn
  head-on; side-on failed twice (see `art.ts`).
