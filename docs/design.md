# Design

What the games are for and the decisions that bind future changes. Both games
run the same `packages/sim`; everything here applies to both unless a section
says otherwise. Numbers live in code, not here.

## Thesis

A clicker gets a second axis once something is actively taking production
away: every purchase becomes "grow" vs "hold onto what I've got". Versus mode
supplies that pressure with an opponent; solo supplies it with weather. The
thesis is the thing to protect; multiplayer is one expression of it.

Non-goal: base-building depth. The upgrade tree must stay legible mid-match.

## Versus (the original head-to-head)

Free-for-all, everyone starts from zero, timer, most resource wins. Three
upgrade flavours — production, sabotage, defense — competing for one currency.
Playable against bots or a real person (join code / challenge by handle); lives
behind the back-room menu, solo is the front door.

Decisions:

- **Fog of war:** an opponent exposes count and production rate, nothing else.
  Enforced in `opponentView()`, not the UI.
- **No knockouts.** Sabotage is tempo loss, never elimination. Slows floor and
  breakage caps exist for this reason.
- **Defense is partial.** Attacks and shields both have strength; a strong
  shield fully blocking a weak attack is fine, but never guaranteed.
- **Real-time, no cooldowns.** Pacing comes from resource contention. Note it
  did *not* self-pace for bots; `bot.ts` caps the share of the pile one swing
  may spend.
- **Sabotage is mostly persistent damage** (broken units until repaired), not
  timed rate cuts — temporary cuts let the victim recover for free, so early
  attacks were always a self-own. Timed slows remain as the exception.
- **Sabotage is priced against the target's clean (undamaged) rate.** Flat
  prices made hitting the leader return many times what growing did; pricing
  off damaged rate would make each hit cheaper and snowball toward a knockout.
- **Scoring rule is undecided.** Held-at-buzzer flattens the endgame into
  "stop buying"; lifetime-produced keeps spending free and sabotage relevant.
  Both implemented; produced is the default until played enough.
- **Clicks are rate-limited by a token bucket** at roughly thumb speed, with
  overflow taps worth a fraction. Without it a 20 tap/s macro finished hundreds
  of times ahead; with it mashing is worth ~2x. Applies to bots too.
- **Sit-down first; slow burn not ruled out.** The command log has no turn
  counter and no assumption anyone is watching, so a slow-burn match is the
  same log plus checkpoint compaction. What's unbuilt is the design: what
  sabotage does to someone asleep. Solo's answer (buildings, not shields)
  should transfer.

Balance principles (harness in `balance.ts`, reference human in `reference.ts`):

- Grade difficulty on **margin**, not win rate — the economy is exponential, so
  wins read 15/0 or 0/15 however close the lines are.
- Grade against a reference human, not a `chill` bot; aggressive rungs look
  weaker against a punching bag.
- Neither pure growth nor sabotage may strictly dominate (`nasty` vs `greedy`).
- Sabotage should be a wash early and a good buy late — a gradient, never a
  cliff.
- Bots must spend the pile down per turn and save for better tiers (`thrift`),
  or difficulty comes out backwards (slower bot = bigger pile = better tiers).

Open: repair is an instant click at a fraction of rebuild cost, making damage a
pure tax. Repair costing *time* is the next lever if getting hit should feel
worse.

## Solo (the front door)

One site you keep, growing while away, with prestige under it.

- **Weather is sabotage with nobody behind it.** Deterministic schedule keyed on
  `(seed, weatherIndex)`; events land at instants the state already knows, so a
  week offline resolves exactly and a save can't be reloaded for better luck.
- **Nothing expires.** Broken kit and condition only recover by spending, so
  rate is constant between events and a ten-day gap is the same code path as
  ten seconds. Keep it that way.
- **Defense is permanent buildings, not timed shields**, because most weather
  lands with the tab closed. They stack with diminishing returns and never
  reach zero exposure. Weather must cost enough that mitigation pays for itself
  (at ~7% it didn't) and boons must be small (one good year outweighed every
  storm and made mitigation pointless).
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
- Puppies: kennel, bedding, weather; the fold is inside the nest. The hoard is
  a crowd, not a pile — a heap of bodies read wrong. Puppies are drawn
  head-on; side-on failed twice (see `art.ts`).
