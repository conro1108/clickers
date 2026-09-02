/**
 * Screenshot the farm at a seeded save state, in a real browser.
 *
 *   npx vite --port 5199 &
 *   npx vite-node tools/shot.mts -- plot=40 hand=20 out=/tmp/farm.png
 *
 * Args: `producer=count`, `potatoes=`, `soil=` (0..1), `broken=`, `out=`, `port=`, `hour=`,
 * `world=inside|outside`, `open=<Sheet>|back`, `down=inside|outside`, `plough=1`,
 * `buy=<producer|upgrade> burst=n every=ms` (seeds one short, buys through the shop, shoots frames).
 * A seeded farm renders as a restore, so `buy=` is the only way to photograph a transition.
 */

import { chromium } from "playwright-core";

import { solo } from "@battle/sim";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.includes("="))
    .map((a) => a.split("=") as [string, string]),
);

const out = args.out ?? "/tmp/farm.png";
const port = args.port ?? "5199";

const now = Date.now();
const farm = solo.createFarm({ seed: "shot", startedAt: now });

for (const p of solo.SOLO_PRODUCERS) {
  const n = Number(args[p.id] ?? 0);
  if (n > 0) farm.producers[p.id] = n;
}
farm.potatoes = Number(args.potatoes ?? 1e9);
farm.harvested = farm.potatoes;
farm.lifetimeHarvested = farm.potatoes;
if (args.soil) farm.soil = Number(args.soil);
// `broken=n` knocks n of every owned tier offline for the Upkeep sheet and damaged-mark art.
if (args.broken) {
  const n = Number(args.broken);
  for (const p of solo.SOLO_PRODUCERS) {
    const owned = farm.producers[p.id] ?? 0;
    if (owned > 0) farm.broken[p.id] = Math.min(owned, n);
  }
}
// The scene reads owned upgrades to pick which mark of each tier it draws.
if (args.marks === "all") farm.upgrades = solo.SOLO_UPGRADES.map((u) => u.id);
// Settable alone so the fold can be shot without every other upgrade; a pre-converged seed renders folded, unanimated.
farm.converged = args.converged !== "0" && (args.converged === "1" || farm.upgrades.includes("ur_potato"));
// A converged save lands inside by default; `world=outside` photographs the old farm with its ceiling on.
farm.world = farm.converged && args.world !== "outside" ? "inside" : "outside";
if (args.generation) farm.generation = Number(args.generation);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 });

// The sky reads `new Date().getHours()`; pin it before any app code runs.
if (args.hour) {
  await page.addInitScript((hour: string) => {
    const Real = Date;
    const at = new Real();
    at.setHours(Number(hour), 30, 0, 0);
    const shift = at.getTime() - Real.now();
    // eslint-disable-next-line no-global-assign
    (globalThis as { Date: DateConstructor }).Date = class extends Real {
      constructor(...a: ConstructorParameters<DateConstructor>) {
        super(...(a.length === 0 ? [Real.now() + shift] : a));
      }
      static override now() {
        return Real.now() + shift;
      }
    } as DateConstructor;
  }, args.hour);
}

await page.goto(`http://localhost:${port}/`);
await page.evaluate(
  ([key, save]) => {
    localStorage.setItem(key!, save!);
    localStorage.setItem("potatoes-inc:taught-tap", "1");
  },
  ["potatoes-inc:farm", solo.serializeFarm(farm, now)],
);
await page.reload();

// Faking the clock opens a checkpoint gap, so the away report is up before anything else.
const back = page.getByRole("button", { name: "Get back to work" });
if (await back.isVisible().catch(() => false)) await back.click();

await page.waitForTimeout(Number(args.settle ?? 2500));

// `buy=` takes an upgrade id too — the Convergence is worth photographing mid-arrival.
if (args.buy) {
  const thing =
    solo.SOLO_PRODUCER_BY_ID[args.buy as solo.SoloProducerId] ?? solo.SOLO_UPGRADE_BY_ID[args.buy];
  if (!thing) throw new Error(`nothing called ${args.buy} in the shop`);
  await page.getByRole("button", { name: "Shop" }).click();
  // The Ur-Potato has no shop row; its only button says "Take it".
  const row =
    args.buy === solo.CONVERGENCE_UPGRADE
      ? page.getByRole("button", { name: "Take it" })
      : page.getByRole("button").filter({ hasText: thing.name }).first();
  await row.click();
  // The Convergence closes the sheet itself and eats the click that would close it.
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
} else if (args.down) {
  // `down=`: prestige and which world to hand down. Not `hand=` — that is the Farmhand count, same namespace.
  page.on("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Seeds", exact: true }).click();
  if (args.down === "outside") await page.getByRole("button", { name: "Back under the sky" }).click();
  await page.getByRole("button").filter({ hasText: "Hand the farm down" }).first().click();
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
  await page.waitForTimeout(Number(args.after ?? 2500));
} else if (args.plough) {
  // The other wipe: a new farm on a new seed, keeping nothing.
  page.on("dialog", (d) => void d.accept());
  await openBackRoom();
  await page.getByRole("button", { name: "Plough it all under" }).click();
  await page.waitForTimeout(Number(args.after ?? 2500));
} else if (args.open === "back") {
  await openBackRoom();
} else if (args.open) {
  await page.getByRole("button", { name: args.open, exact: true }).click();
  // Sheet slides up; shooting on the click catches it off the bottom.
  await page.waitForTimeout(500);
}

// The back room is a 700ms hold on the HUD potato, so a real press-and-wait — `.click()` releases too fast.
async function openBackRoom() {
  const potato = page.locator(".hud-bank");
  await potato.hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

const burst = Number(args.burst ?? 0);
if (burst > 0) {
  const every = Number(args.every ?? 300);
  const stem = out.replace(/\.png$/, "");
  for (let i = 0; i < burst; i++) {
    await page.screenshot({ path: `${stem}-${i}.png` });
    console.log(`${stem}-${i}.png`);
    await page.waitForTimeout(every);
  }
} else {
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
