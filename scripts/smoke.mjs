// Opens a built game file in headless Chromium and checks that it starts,
// renders its art, plants and harvests, and saves without page errors.
//   node scripts/smoke.mjs [file.html] [--screenshot out.png]
// Set CHROMIUM_PATH to use a preinstalled browser instead of Playwright's own.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const shotAt = args.indexOf("--screenshot");
const screenshot = shotAt >= 0 ? args.splice(shotAt, 2)[1] : null;
const file = path.resolve(args[0] ?? "dist/pumpkin-patch.html");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const problems = [];
const watch = (p) => {
  p.on("pageerror", (e) => problems.push("page error: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") problems.push("console error: " + m.text()); });
  return p;
};
let page = watch(await context.newPage());

const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

try {
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => globalThis.PumpkinPatch?.app?.state, null, { timeout: 15000 });
  check(true, "game started");
  check(await page.locator("#game-startup").isHidden(), "startup notice dismissed");

  const broken = await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => i.getAttribute("src"));
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    return imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src").slice(0, 60));
  });
  check(broken.length === 0, `all page images decode${broken.length ? ": " + broken.join(", ") : ""}`);

  const before = await page.evaluate(() => {
    const s = PumpkinPatch.app.state;
    return { harvested: s.harvested, empty: s.plots.filter((p) => p.phase === "empty").length };
  });
  await page.locator("#plant-all").click();
  const planted = await page.evaluate(() => PumpkinPatch.app.state.plots.filter((p) => p.phase !== "empty").length);
  check(planted > 0 && before.empty > 0, `planting works (${planted} plots growing)`);

  // Tapping the big pumpkin boosts growth; tap until something is ready.
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => PumpkinPatch.app.state.plots.some((p) => p.phase === "ready"));
    if (ready) break;
    await page.locator("#click-pumpkin").click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.locator("#harvest-all").click();
  const harvested = await page.evaluate(() => PumpkinPatch.app.state.harvested);
  check(harvested > before.harvested, `harvesting works (${harvested} harvested)`);

  await page.evaluate(() => PumpkinPatch.app.save());
  const saved = await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("sn-pumpkin-patch")));
  check(saved, "save written to localStorage");

  for (const nav of ["#house-nav", "#outfits-nav", "#upgrades-nav", "#scrapbook-nav"]) {
    await page.locator(nav).click();
    await page.waitForTimeout(200);
    if (await page.locator("#modal").evaluate((d) => d.open)) await page.locator("#modal .modal-close").click();
    await page.locator("#patch-nav").click();
  }
  check(true, "main navigation opens and closes");

  await page.locator("#manage-shop").click();
  check(await page.locator(".farm-shop-menu").count() === 1, "the Shop tab opens Skyla's shop");
  await page.locator("#modal .modal-close").click();

  // Tap Natalie on the map to chat. She keeps walking, and a mouse click could
  // land after she has moved on or on a button floating over her, so the tap
  // goes straight to the map at the spot she is standing on that same moment.
  await page.evaluate(() => {
    const a = PumpkinPatch.app.scene.actors[0], world = document.getElementById("world"), box = world.getBoundingClientRect();
    world.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: box.left + a.x / 1000 * box.width, clientY: box.top + (a.y - 60) / 610 * box.height }));
  });
  check(await page.locator(".conversation-menu").count() === 1, "tapping Natalie starts a chat");
  await page.locator("#modal .modal-close").click();

  await page.evaluate(() => PumpkinPatch.app.toast("A test notice"));
  check(await page.locator("#toast.show").isVisible(), "notices are visible");

  await page.locator("#preferences-nav").click();
  const version = await page.locator("#game-version").textContent();
  check(/^Pumpkin Patch \S+ · save format \d+$/.test(version), `settings shows the version (${version})`);
  const restore = page.locator("#snapshot-buttons button").first();
  check(await restore.count() === 1, "settings lists an earlier copy");
  await restore.click();
  await page.locator("#confirm-import").click();
  check(await page.evaluate(() => !document.getElementById("modal").open), "an earlier copy restores");

  // A save with one damaged section loads with only that section reset.
  // Close the game (it saves as it goes), then damage the save before reopening.
  await page.close();
  page = watch(await context.newPage());
  await page.addInitScript(() => {
    const x = JSON.parse(localStorage.getItem("sn-pumpkin-patch-halloween-v2"));
    x.coins = "broken";
    x.upgrades.tools = 1;
    localStorage.setItem("sn-pumpkin-patch-halloween-v2", JSON.stringify(x));
  });
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => globalThis.PumpkinPatch?.app?.state);
  const repaired = await page.evaluate(() => ({ repairs: PumpkinPatch.app.persistence.repairs, tools: PumpkinPatch.app.state.upgrades.tools }));
  check(repaired.repairs.join() === "coins" && repaired.tools === 1, "a damaged save is mended, keeping the rest");
  await page.waitForFunction(() => /coins/.test(document.querySelector(".repair-notice")?.textContent || ""), null, { timeout: 5000 });
  await page.locator("#repair-continue").click();
  check(await page.evaluate(() => !document.getElementById("modal").open), "the player is told what was mended");

  if (screenshot) await page.screenshot({ path: screenshot });
} catch (e) {
  problems.push(String(e.stack || e));
} finally {
  await browser.close();
}
check(problems.length === 0, "no page or console errors" + (problems.length ? "\n  " + problems.join("\n  ") : ""));
