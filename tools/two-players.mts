/**
 * Two browsers, one match. The only way to see multiplayer work.
 *
 * Unit tests can't see any of this, and `db/verify.mjs` only covers the
 * database's half — this is the half where two React apps have to end up
 * looking at the same race. It drives the headline path end to end: claim a
 * handle, call somebody out by name, have them take it, and check that two
 * machines holding no shared state agree about the score.
 *
 *   npx vite apps/web --port 5199 &
 *   npx vite-node --config apps/web/vite.config.ts tools/two-players.mts -- out=/tmp/vs
 *
 * Args: `out=` screenshot stem, `rounds=` whistle-and-spend passes per side,
 * `port=`.
 *
 * The two players are real accounts, made and deleted through the admin API.
 * They were anonymous sign-ins once, which was tidier — and then a few runs in a
 * row hit `over_request_rate_limit`, because anonymous signup is rate limited
 * per IP per hour and this burns two of them a run. Real accounts aren't
 * limited, and they're also the only way to test challenges, which by design
 * anonymous players can't send.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium, type Page } from "playwright-core";

import { solo } from "@mill/sim";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.includes("="))
    .map((a) => a.split("=") as [string, string]),
);
const stem = args.out ?? "/tmp/vs";
const port = args.port ?? "5199";
const rounds = Number(args.rounds ?? 3);

const env: Record<string, string> = {};
for (const line of readFileSync(join(homedir(), "projects", ".supabase.env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
}
const URL_ = env.SUPABASE_URL!;
const KEY = env.SUPABASE_PUBLISHABLE_KEY!;
const SECRET = env.SUPABASE_SECRET_KEY!;
const STORAGE_KEY = `sb-${new URL(URL_).hostname.split(".")[0]}-auth-token`;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
}

const made: string[] = [];

/** A real account, and the session a browser would have had after signing in. */
async function account(handle: string) {
  const email = `vs-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();
  const user = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  }).then((r) => r.json());
  if (!user.id) throw new Error(`could not create ${handle}: ${JSON.stringify(user)}`);
  made.push(user.id);

  const session = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!session.access_token) throw new Error(`could not sign in ${handle}`);
  return { id: user.id as string, session, handle };
}

async function setHandleDirectly(user: { id: string; session: { access_token: string } }, handle: string) {
  await fetch(`${URL_}/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${user.session.access_token}`,
      "Content-Type": "application/json",
      "Content-Profile": "app",
    },
    body: JSON.stringify({ handle, display_name: handle }),
  });
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

/**
 * Somebody who has never opened this game, following a link they were sent.
 *
 * No mill in localStorage, no session, no idea the back room exists — which is
 * the whole point of the test. Everything they need has to happen on load.
 */
async function openInvite(label: string, url: string): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: 400, height: 800 },
    deviceScaleFactor: 2,
    // The host copies the play link to the clipboard, and the test reads it back
    // from there rather than rebuilding the URL itself — otherwise it would be
    // checking a string it wrote, not the one the button produces.
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [${label}] ${m.text().slice(0, 160)}`);
  });
  await page.goto(url);
  return page;
}

/** A player, in their own context so the two have separate storage and sessions. */
async function open(label: string, user: { session: unknown }): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: 400, height: 800 },
    deviceScaleFactor: 2,
    // The host copies the play link to the clipboard, and the test reads it back
    // from there rather than rebuilding the URL itself — otherwise it would be
    // checking a string it wrote, not the one the button produces.
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [${label}] ${m.text().slice(0, 160)}`);
  });

  // A mill in localStorage so the app opens on the homestead rather than the
  // splash, and the session beside it so the versus screen never has to sign
  // anybody in.
  const now = Date.now();
  const mill = solo.createMill({ seed: `${label}-vs`, startedAt: now });
  mill.producers.pen = 20;
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(
    ([millKey, save, authKey, session]) => {
      localStorage.setItem(millKey as string, save as string);
      localStorage.setItem("puppy-mill:taught-tap", "1");
      localStorage.setItem(authKey as string, session as string);
    },
    ["puppy-mill:mill", solo.serializeMill(mill, now), STORAGE_KEY, JSON.stringify(user.session)] as const,
  );
  await page.reload();
  await page.waitForTimeout(1000);

  // Into the back room, which is still the only door to versus.
  await page.locator(".hud-bank").hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Open the lobby" }).click();
  await page.waitForSelector(".identity-handle", { timeout: 20000 });
  return page;
}

/** Whistle a stake up off the scene, then spend it in the shop. */
async function playARound(page: Page) {
  const box = (await page.locator(".scene").boundingBox())!;
  for (let i = 0; i < 45; i++) {
    await page.mouse.click(box.x + 60 + (i % 7) * 30, box.y + box.height * 0.62);
  }
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    const rows = page.locator(".sheet .row:not([disabled])");
    if ((await rows.count()) === 0) break;
    await rows.first().click();
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(1200);
}

const stamp = Math.random().toString(36).slice(2, 6);
const you = await account(`vs-you-${stamp}`);
const brad = await account(`vs-brad-${stamp}`);
await setHandleDirectly(you, `vsyou${stamp}`);

const a = await open("you", you);
const b = await open("brad", brad);

console.log("identity");
check(
  "a claimed account is marked as yours, not as a guest",
  (await a.locator(".identity-tag").innerText()).trim().toLowerCase() === "yours",
);

// Brad names himself through the UI, which is the handle picker's only test.
await b.getByRole("button", { name: "Rename" }).click();
const bradHandle = `brad${stamp}`;
await b.getByPlaceholder("brad").fill(bradHandle);
await b.getByRole("button", { name: `Take @${bradHandle}` }).click();
await b.waitForTimeout(1200);
check(
  "picking a handle sticks",
  (await b.locator(".identity-handle").innerText()) === `@${bradHandle}`,
  await b.locator(".identity-handle").innerText(),
);
await b.getByRole("button", { name: "Done" }).click();
await b.screenshot({ path: `${stem}-identity.png` });

console.log("\nthe challenge");
await a.getByRole("button", { name: "a name" }).click();
await a.getByPlaceholder("brad").fill(bradHandle);
await a.getByRole("button", { name: "Challenge" }).click();
await a.waitForTimeout(1000);
await a.screenshot({ path: `${stem}-challenged.png` });

// Brad pressed nothing — it arrives on its own.
try {
  await b.waitForSelector(".challenge", { timeout: 20000 });
  check("the challenge arrives on the other screen by itself", true);
} catch {
  check("the challenge arrives on the other screen by itself", false, "nothing showed up");
}
await b.screenshot({ path: `${stem}-invite.png` });

await b.getByRole("button", { name: "Race" }).click();

// And the challenger is pulled in without pressing anything either.
try {
  await b.waitForSelector(".hud-clock", { timeout: 25000 });
  await a.waitForSelector(".hud-clock", { timeout: 25000 });
  check("both players land in the match", true);
} catch {
  check("both players land in the match", false, "somebody was left in the lobby");
  await a.screenshot({ path: `${stem}-stuck-you.png` });
  await b.screenshot({ path: `${stem}-stuck-brad.png` });
}

if (failures === 0) {
  console.log("\nthe race");
  for (let i = 0; i < rounds; i++) await Promise.all([playARound(a), playARound(b)]);
  await a.waitForTimeout(2000);
  await a.screenshot({ path: `${stem}-you.png` });
  await b.screenshot({ path: `${stem}-brad.png` });

  /** "1.20K" and "−0.4" as they're printed on the HUD, back to a number. */
  function unformat(text: string): number {
    const t = text.trim();
    const scale = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[t.slice(-1).toUpperCase()] ?? 1;
    const sign = t.startsWith("−") || t.startsWith("-") ? -1 : 1;
    return sign * parseFloat(t.replace(/[+−-]/g, "")) * scale;
  }

  /**
   * The whole bet, checked.
   *
   * Each client is asked two things it worked out for itself by folding the log:
   * how far ahead its player is, and what the opponent has scored. Added, those
   * give what that client believes its *own* player has scored — a number the
   * other client also has an opinion about. Comparing the two across machines is
   * the actual claim: no shared state, same answer.
   */
  async function readScores(page: Page) {
    await page.getByRole("button", { name: "Match", exact: true }).click();
    await page.waitForTimeout(500);
    const theirs = unformat(await page.locator(".opp-count").first().innerText());
    const delta = unformat(await page.locator(".lead span").innerText());
    await page.screenshot({ path: `${stem}-standings.png` });
    await page.getByRole("button", { name: "Close" }).click();
    return { theirs, mine: theirs + delta };
  }

  const sa = await readScores(a);
  const sb = await readScores(b);
  // A tolerance rather than an equality: both mills are still producing between
  // the two reads. A fold that had actually drifted would be out by a run of
  // purchases, not by half a second of puppies.
  const agrees = (x: number, y: number) =>
    Math.abs(x - y) <= Math.max(3, 0.06 * Math.max(Math.abs(x), Math.abs(y)));
  check(
    "the two clients agree about the score",
    agrees(sa.mine, sb.theirs) && agrees(sb.mine, sa.theirs),
    `you say ${sa.mine}/${sa.theirs}, brad says ${sb.mine}/${sb.theirs}`,
  );
  check("both players have actually produced something", sa.mine > 0 && sb.mine > 0);
}

// --- and the other door: a link, followed by a total stranger ---------------
//
// The link is the invite that works on someone who isn't in the room and has
// never played. It has to carry them past the splash, past the mill and past
// the back room, and sign them in on the way, without asking for anything.
console.log("\nthe play link");
{
  const host = await account(`vs-link-${stamp}`);
  const hostPage = await open("linkhost", host);
  await hostPage.getByRole("button", { name: "a code" }).click();
  await hostPage.getByRole("button", { name: "Open a match" }).click();
  await hostPage.waitForSelector(".waiting-code", { timeout: 20000 });
  const code = await hostPage.locator(".waiting-code").innerText();

  // Straight off the button the host would actually press.
  await hostPage.getByRole("button", { name: "Copy play link" }).click();
  await hostPage.waitForTimeout(400);
  const link = await hostPage.evaluate(() => navigator.clipboard.readText());
  check("the copied link carries the code", link.includes(`?join=${code}`), link);

  const guest = await openInvite("linkguest", link);
  try {
    await guest.waitForSelector(".hud-clock", { timeout: 30000 });
    check("a stranger following the link lands straight in the race", true);
  } catch {
    check(
      "a stranger following the link lands straight in the race",
      false,
      (await guest.locator("body").innerText()).slice(0, 160).replace(/\n+/g, " | "),
    );
    await guest.screenshot({ path: `${stem}-link-stuck.png` });
  }
  await guest.screenshot({ path: `${stem}-link-guest.png` });
  check(
    "the code is taken back out of the address bar",
    !(await guest.evaluate(() => window.location.search)).includes("join"),
  );
  await hostPage.waitForSelector(".hud-clock", { timeout: 25000 }).catch(() => {});
  check("and the host is pulled in with them", (await hostPage.locator(".hud-clock").count()) > 0);
}

for (const id of made) {
  await fetch(`${URL_}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
}
await browser.close();

console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
