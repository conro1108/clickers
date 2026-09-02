/**
 * Screenshot the mill at a made-up save state.
 *
 * Visual work on the scene can't be checked by a typechecker — "the middle of
 * the screen is empty" is not a thing a unit test says. So: seed a mill
 * straight into localStorage, load the app in a real browser, shoot it.
 *
 *   npx vite --port 5199 &
 *   npx vite-node tools/shot.mts -- plot=40 hand=20 out=/tmp/mill.png
 *
 * Args are `producer=count` for anything in the shop, plus `puppies=`,
 * `bedding=` (0..1), `out=` and `port=`. Everything is optional.
 *
 * A seeded mill always renders as a **restore** — the scene refuses to replay
 * the fold, the pipeline going in, or a kennel going up for a mill that already
 * had them when the tab opened, which is the right call and also means the
 * plain form of this tool can't photograph any of it. `buy=` is the way in: it
 * settles the mill, then actually buys the thing through the shop the way a
 * player would, then takes a burst of frames while it arrives.
 *
 *   ... buy=lab burst=6 every=350 out=/tmp/build.png   ->  build-0.png ...
 *
 * `buy=` takes upgrade ids too, so the Convergence can be photographed
 * mid-arrival. The two wipes work the same way: `down=inside`/`down=outside`
 * hands the mill on, `shutdown=1` shuts the whole line down, and `open=Shop` just
 * opens a sheet. Watch the namespace — every one of these shares it with the
 * producer ids, which is why handing down isn't `hand=`.
 *
 * `open=back` is the odd one: the back room has no button, so that one holds
 * the puppy on the HUD for 700ms the way a player has to.
 *
 * `hour=` fakes the wall clock the sky runs on, so night can be shot at noon.
 */

import { chromium } from "playwright-core";

import { solo } from "@clickers/sim";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.includes("="))
    .map((a) => a.split("=") as [string, string]),
);

const out = args.out ?? "/tmp/mill.png";
const port = args.port ?? "5199";

// The save is stamped on the faked clock too, or the hours between "now" and
// the hour asked for are hours of weather, and nothing in the shot survives.
const shift = (() => {
  if (!args.hour) return 0;
  const at = new Date();
  at.setHours(Number(args.hour), 30, 0, 0);
  return at.getTime() - Date.now();
})();
const now = Date.now() + shift;
const mill = solo.createSite({ seed: "shot", startedAt: now });

for (const p of solo.SOLO_PRODUCERS) {
  const n = Number(args[p.id] ?? 0);
  if (n > 0) mill.producers[p.id] = n;
}
mill.stock = Number(args.puppies ?? 1e9) as typeof mill.stock;
mill.produced = mill.stock;
mill.lifetimeProduced = mill.stock;
if (args.bedding) mill.condition = Number(args.bedding);
// `broken=n` knocks n of every owned tier offline, which is what the Upkeep
// sheet and the damaged-mark art both need to have anything to show.
if (args.broken) {
  const n = Number(args.broken);
  for (const p of solo.SOLO_PRODUCERS) {
    const owned = mill.producers[p.id] ?? 0;
    if (owned > 0) mill.broken[p.id] = Math.min(owned, n);
  }
}
// The scene reads owned upgrades to pick which mark of each tier it draws.
if (args.marks === "all") mill.upgrades = solo.SOLO_UPGRADES.map((u) => u.id);
// ...and whether the horizon has closed. Settable on its own so the fold can be
// shot against a mill that hasn't bought every other upgrade in the game. Note
// that a mill seeded as already-converged renders folded without animating —
// the scene refuses to replay the fold on a restore. `buy=` is how you get at
// the transition: seed the mill one purchase short of it and make that purchase
// through the shop.
mill.converged = args.converged !== "0" && (args.converged === "1" || mill.upgrades.includes(solo.CONVERGENCE_UPGRADE));
// Which of the two mills to stand on. A converged save lands inside by default,
// because that's where the fold leaves you; `world=outside` is how the old mill
// gets photographed with its ceiling on.
mill.world = mill.converged && args.world !== "outside" ? "inside" : "outside";
if (args.generation) mill.generation = Number(args.generation);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: Number(args.width ?? 400), height: Number(args.height ?? 800) },
  deviceScaleFactor: 2,
});

// The sky is a pure function of `new Date().getHours()`, so pinning that is the
// whole of what it takes to shoot 2am. Installed before any app code runs.
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
    localStorage.setItem("puppy-mill:taught-tap", "1");
  },
  ["puppy-mill:mill", solo.serializeSite(mill, now)],
);
await page.reload();

// Faking the clock opens a gap between the save's checkpoint and "now", so the
// away report is sitting over the yard before anything else can be looked at.
const back = page.getByRole("button", { name: "Get back to work" });
if (await back.isVisible().catch(() => false)) await back.click();

await page.waitForTimeout(Number(args.settle ?? 2500));

// `buy=` takes an upgrade id as well as a producer one — the Convergence is a
// purchase off the same shelf, and it's the one thing on it worth photographing
// mid-arrival.
if (args.buy) {
  const thing =
    solo.SOLO_PRODUCER_BY_ID[args.buy as solo.SoloProducerId] ?? solo.SOLO_UPGRADE_BY_ID[args.buy];
  if (!thing) throw new Error(`nothing called ${args.buy} in the shop`);
  await page.getByRole("button", { name: "Shop" }).click();
  // The Ur-Puppy isn't a shop row and its button doesn't carry its name — the
  // sheet is given over to it, and the only thing to press says "Take it".
  const row =
    args.buy === solo.CONVERGENCE_UPGRADE
      ? page.getByRole("button", { name: "Take it" })
      : page.getByRole("button").filter({ hasText: thing.name }).first();
  await row.click();
  // The Convergence takes the sheet away itself, and it eats the click that
  // would close one that's still open.
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
} else if (args.down) {
  // `down=inside` / `down=outside`: prestige, and which world to hand down. The
  // sky coming back is the other transition worth photographing.
  //
  // Not `hand=`, which is the Kennel Hand count. Every arg here shares one
  // namespace with sixteen producer ids, and the collision is silent: a mill
  // with `hand=143` on it quietly handed itself down instead.
  page.on("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Pedigree", exact: true }).click();
  if (args.down === "outside") await page.getByRole("button", { name: "Back under the sky" }).click();
  await page.getByRole("button").filter({ hasText: "Hand the mill down" }).first().click();
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
  await page.waitForTimeout(Number(args.after ?? 2500));
} else if (args.shutdown) {
  // The other wipe: a new mill on a new seed, keeping nothing.
  page.on("dialog", (d) => void d.accept());
  await openBackRoom();
  await page.getByRole("button", { name: "Shut the whole line down" }).click();
  await page.waitForTimeout(Number(args.after ?? 2500));
} else if (args.open === "back") {
  await openBackRoom();
} else if (args.open) {
  // Any of the nav sheets by name: `open=Shop`, `open=Pedigree`, `open=Upkeep`.
  await page.getByRole("button", { name: args.open, exact: true }).click();
  // The sheet slides up; shooting on the click catches it still off the bottom.
  await page.waitForTimeout(500);
}

/**
 * The back room has no button. It's a 700ms hold on the puppy in the HUD, so
 * this is a real press-and-wait rather than a click — `.click()` releases in a
 * few milliseconds and the timer never fires.
 */
async function openBackRoom() {
  const puppy = page.locator(".hud-bank");
  await puppy.hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

// `tap=x,y` taps the scene at that fraction of its width and height, for the whistle.
if (args.tap) {
  const [fx, fy] = args.tap.split(",").map(Number) as [number, number];
  const scene = page.locator("canvas.scene");
  const box = await scene.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(Number(args.afterTap ?? 250));
  }
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
