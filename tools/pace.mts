/**
 * How long the long game takes: a line of hand-downs, each generation played for `days` by the
 * saver in `solo.simulatePush`, printing the day each generation stood up each world's first rung. Retune `LONG_WAY` in
 * `content.ts`, run this. Takes minutes.
 *
 *   npx vite-node --root apps/potatoes tools/pace.mts -- days=30 generations=30
 *
 * `least` is the fewest of any rung before the wild, which opens itself at a hundred of each.
 */

import { solo } from "@clickers/sim";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes("=")).map((a) => a.split("=") as [string, string]));
const days = Number(args.days ?? 30);
const generations = Number(args.generations ?? 30);

let seeds = 0;
let deepest = 1;
let returns = 0;
// Start a line part way in: `from=8 seeds=3e18` skips the generations before it.
const from = Number(args.from ?? 1);
if (args.seeds) seeds = Number(args.seeds);
if (from > 1) deepest = solo.WORLDS.length - 2;
for (let generation = from; generation <= generations; generation++) {
  const { site, reached, opened, openedRate } = solo.simulatePush({ seeds, generation, days, tickHours: 6, reached: deepest, returns });
  deepest = Math.max(deepest, site.reached);
  const doors = Object.entries(reached).filter(([w]) => solo.WORLDS.indexOf(w as solo.World) >= 5).map(([w, d]) => `${w} ${d!.toFixed(0)}`).join(", ");
  const rungs = ["sixth", "seventh", "whole"].map((id) => site.producers[id as solo.SoloProducerId] ?? 0).join("/");
  // The secret world: the day it opened, the fewest of any rung before it (it opens at 100), and its own ladder.
  const before = solo.SOLO_PRODUCERS.filter((p) => p.world !== "wild");
  const least = Math.min(...before.map((p) => site.producers[p.id] ?? 0));
  const wild = solo.producersIn("wild").map((p) => site.producers[p.id] ?? 0).join("/");
  const back = returns ? ` (back ${returns}x)` : "";
  const opens = opened.wild === undefined ? "" : ` opened day ${opened.wild.toFixed(0)} at ${openedRate.wild!.toExponential(1)}/s, now ${solo.currentRate(site).toExponential(1)}/s`;
  console.log(`gen ${generation} day ${generation * days}: ${seeds.toExponential(1)} seeds, ${site.world} (${doors}), tops ${rungs}, least ${least}, wild ${wild}${back}${opens}`);
  seeds += solo.heirloomsFor(site.produced);
  returns = site.returns + (site.depth >= solo.WORLDS.indexOf("wild") ? 1 : 0);
}
