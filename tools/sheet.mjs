/**
 * A contact sheet: every world of one game side by side, at up to three stages of its ladder.
 *
 * The scenes only ever show one world at a time, so nothing else in the repo tells you whether the
 * ten read as one game, or what a world looks like the second it opens. Needs the dev server up.
 *
 *   npm run dev:puppies &
 *   node tools/sheet.mjs game=puppies out=/tmp/sheet.png
 *   node tools/sheet.mjs game=potatoes w=3,4 stages=early,full
 *
 * `early` is one of the world's first rung, `mid` a dozen of its first three, `full` thirty of
 * everything; the worlds before it are built up in every case. `stock=` multiplies what's held
 * (default is ten minutes of output), `condition=` sets the bar, `hour=` fakes the clock the mill's
 * sky runs on, `shots=dir` also keeps each phone-sized screenshot.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes("=")).map((a) => a.split("=")));
const game = args.game ?? "puppies";
const GAMES = {
  puppies: { port: 5174, key: "puppy-mill:mill", taught: "puppy-mill:taught-tap" },
  potatoes: { port: 5173, key: "potatoes-inc:farm", taught: "potatoes-inc:taught-tap" },
};
const g = GAMES[game];
const port = args.port ?? g.port;
const stages = (args.stages ?? "early,mid,full").split(",");
const out = args.out ?? join(tmpdir(), `sheet-${game}.png`);
if (args.shots) mkdirSync(args.shots, { recursive: true });

/** Runs in the page: build the save with the app's own engine and theme, and write it where the app looks. */
async function seed({ key, taught, w, stage, stock, condition }) {
  const { solo } = await import("/@fs" + "/__SIM__");
  const now = Date.now();
  const s = solo.createSite({ seed: "sheet", startedAt: now });
  const here = solo.WORLDS[w];
  for (let i = 0; i < w; i++) {
    for (const p of solo.producersIn(solo.WORLDS[i])) s.producers[p.id] = 60;
    for (const l of solo.landsIn(solo.WORLDS[i])) s.land[l.id] = 5;
  }
  const ladder = solo.producersIn(here);
  if (stage === "early") s.producers[ladder[0].id] = 1;
  if (stage === "mid") [12, 10, 6].forEach((n, i) => ladder[i] && (s.producers[ladder[i].id] = n));
  if (stage === "full") for (const p of ladder) s.producers[p.id] = 30;
  s.depth = s.reached = w;
  s.world = here;
  const deeper = solo.WORLDS.slice(w + 1).map((x) => solo.WORLD_GATE[x]);
  const open = solo.WORLDS.slice(1, w + 1).map((x) => solo.WORLD_GATE[x]);
  s.upgrades = solo.SOLO_UPGRADES.filter((u) => open.includes(u.id) || (!deeper.includes(u.id) && solo.isUnlocked(s, u))).map((u) => u.id);
  s.condition = condition;
  s.stock = Math.max(1000, solo.currentRate(s) * 600) * stock;
  s.produced = s.stock;
  s.lifetimeProduced = s.stock * 10;
  s.nextWeatherAt = now + 86_400_000;
  localStorage.clear();
  localStorage.setItem(key, solo.serializeSite(s, now));
  localStorage.setItem(taught, "1");
  // The running app saves on unload; stop it overwriting the seed on the way out.
  Storage.prototype.setItem = () => {};
}
const seedSrc = `(${seed.toString().replace("/__SIM__", new URL("../packages/sim/src/index.ts", import.meta.url).pathname)})`;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  // On the GPU: SwiftShader is ~70x slower here and lit differently from a real device.
  args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
if (args.hour) {
  await page.addInitScript((h) => {
    const real = Date.prototype.getHours;
    Date.prototype.getHours = function () {
      void real;
      return Number(h);
    };
  }, args.hour);
}
await page.goto(`http://localhost:${port}/`);
const doors = await page.evaluate(async () => {
  const { WORLD_COPY } = await import("/src/worlds.ts");
  return Object.entries(WORLD_COPY).map(([id, c]) => [id, c.door]);
});
const worlds = args.w ? args.w.split(",").map(Number) : doors.map((_, i) => i);

const cells = [];
for (const stage of stages) {
  for (const w of worlds) {
    await page.evaluate(`${seedSrc}(${JSON.stringify({ key: g.key, taught: g.taught, w, stage, stock: Number(args.stock ?? 1), condition: Number(args.condition ?? 1) })})`);
    await page.reload();
    const back = page.getByRole("button", { name: /back to work/i });
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(Number(args.settle ?? 2500));
    if (args.shots) await page.screenshot({ path: join(args.shots, `${game}-${String(w).padStart(2, "0")}-${doors[w][0]}-${stage}.png`) });
    await page.addStyleTag({ content: ".world-strip,.world-scrim,.tap-hint{visibility:hidden!important}" });
    const png = await page.locator("canvas.scene").first().screenshot();
    cells.push({ stage, w, src: `data:image/png;base64,${png.toString("base64")}` });
    process.stdout.write(".");
  }
}

const html = `<!doctype html><meta charset=utf-8><style>
  body{margin:0;padding:20px;background:#16141c;color:#eee;font:14px ui-monospace,Menlo,monospace}
  .g{display:grid;grid-template-columns:repeat(${worlds.length},260px);gap:14px}
  figure{margin:0} figcaption{padding:0 0 4px} figcaption span{color:#aaa}
  img{width:260px;display:block;image-rendering:pixelated;border:1px solid #444}
</style><div class=g>${cells
  .map((c) => `<figure><figcaption><b>${c.w + 1} ${doors[c.w][1]}</b> <span>${c.stage}</span></figcaption><img src="${c.src}"></figure>`)
  .join("")}</div>`;
const sheet = await ctx.newPage();
await sheet.setViewportSize({ width: 40 + worlds.length * 274, height: 600 });
await sheet.setContent(html);
writeFileSync(out, await sheet.screenshot({ fullPage: true }));
await browser.close();
console.log(`\n${out}`);
if (errors.length) console.log(`page errors:\n${[...new Set(errors)].join("\n")}`);
