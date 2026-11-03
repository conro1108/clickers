/**
 * How long the long game takes: a line of hand-downs, each generation played for `days` by the
 * saver in `solo.simulatePush`, printing the day each generation stood up each world's first rung. Retune `LONG_WAY` in
 * `content.ts`, run this. Takes minutes.
 *
 *   npx vite-node --root apps/potatoes tools/pace.mts -- days=30 generations=30
 */

import { solo } from "@clickers/sim";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes("=")).map((a) => a.split("=") as [string, string]));
const days = Number(args.days ?? 30);
const generations = Number(args.generations ?? 30);

let seeds = 0;
for (let generation = 1; generation <= generations; generation++) {
  const { site, reached } = solo.simulatePush({ seeds, generation, days, tickHours: 6 });
  const doors = Object.entries(reached).filter(([w]) => solo.WORLDS.indexOf(w as solo.World) >= 5).map(([w, d]) => `${w} ${d!.toFixed(0)}`).join(", ");
  const rungs = ["sixth", "seventh", "whole"].map((id) => site.producers[id as solo.SoloProducerId] ?? 0).join("/");
  console.log(`gen ${generation} day ${generation * days}: ${seeds.toExponential(1)} seeds, ${site.world} (${doors}), tops ${rungs}`);
  seeds += solo.heirloomsFor(site.produced);
}
