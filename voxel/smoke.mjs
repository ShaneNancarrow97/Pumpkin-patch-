// Opens the built voxel reference in headless Chromium (software WebGL), plays a
// little and screenshots it at desktop and phone sizes.
//   node smoke.mjs [--shots dir]     set CHROMIUM_PATH to use a preinstalled browser
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const at = process.argv.indexOf("--shots"), shots = at >= 0 ? process.argv[at + 1] : null;
const file = pathToFileURL(path.resolve("dist/pumpkin-patch-voxel.html")).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = false;
const check = (ok, label) => { console.log(`${ok ? "ok  " : "FAIL"} ${label}`); if (!ok) failed = true; };
for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: name !== "desktop" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(file);
  await page.waitForSelector("body[data-ready]", { timeout: 30000 });
  check(await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === "sprites", null, { timeout: 30000 }).then(() => true, () => false), `${name}: characters drawn with the original sprites`);
  await page.locator("#plant-all").click();
  await page.locator("#boost").click();
  const s = await page.evaluate(() => PumpkinVoxel.state());
  check(s.plots.slice(0, 6).every((p) => p.phase === "growing") && s.taps === 1, `${name}: plant and boost`);
  // Ripen everything rather than waiting in a slow software-rendered browser.
  await page.evaluate(() => { for (const p of PumpkinVoxel.state().plots.slice(0, 6)) { p.progress = 1; p.phase = "ready"; } PumpkinVoxel.state().visitorTimer = 0.1; });
  await page.locator("#harvest-all").click();
  check(await page.evaluate(() => PumpkinVoxel.state().harvested) === 6, `${name}: harvest`);
  await page.waitForTimeout(2500);
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
  for (const tab of ["shop", "wardrobe", "journal"]) {
    await page.locator(`[data-tab="${tab}"]`).click();
    check(await page.locator("#sheet").isVisible() && (await page.locator("#sheet-body").textContent()).length > 40, `${name}: ${tab} opens`);
    if (shots && name === "desktop") await page.screenshot({ path: `${shots}/${name}-${tab}.png` });
  }
  await page.locator("#sheet-close").click();
  check(!(await page.locator("#sheet").isVisible()), `${name}: menu closes`);
  // Settings swaps the characters to voxel figures and back.
  await page.locator("#open-settings").click();
  await page.locator("#toggle-voxel-characters").click();
  const voxels = await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === "voxels", null, { timeout: 30000 }).then(() => true, () => false);
  await page.locator("#toggle-voxel-characters").click();
  check(voxels && await page.evaluate(() => PumpkinVoxel.scene.characterStyle) === "sprites", `${name}: voxel characters switch on and off`);
  await page.locator("#sheet-close").click();
  // Home: the Home tab steps into the parlour, and a piece bought there is placed and picked up to arrange.
  await page.evaluate(() => { PumpkinVoxel.state().coins = 5000; });
  await page.locator('[data-tab="home"]').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "room") && await page.locator("#place-bar").isVisible(), `${name}: home opens the parlour`);
  await page.locator('[data-hometab="decorate"]').click();
  await page.locator('[data-decor="d01"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().house.placed.some((p) => p.id === "d01" && p.room === "parlour")), `${name}: a bought piece is placed in the room`);
  await page.locator("#sheet-close").click();
  await page.locator('[data-tool="flip"]').click();
  await page.locator('[data-tool="done"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().house.placed.find((p) => p.id === "d01").flip) && !(await page.locator("#piece-bar").isVisible()), `${name}: flip the piece and finish`);
  if (shots) await page.screenshot({ path: `${shots}/${name}-parlour.png` });
  // The shop: open it, step inside, and customers come in to browse.
  await page.evaluate(() => { PumpkinVoxel.state().stock = [4, 4, 0, 0]; });
  await page.locator('[data-tab="shop"]').click();
  await page.locator('[data-shoptab="shop"]').click();
  await page.locator('[data-shopup="open"]').click();
  await page.locator('[data-visit="shop"]').click();
  await page.locator("#sheet-close").click();
  await page.evaluate(() => PumpkinVoxel.advance(6));
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "shop" && PumpkinVoxel.state().shop.customers.length > 0), `${name}: customers come into the shop`);
  if (shots) await page.screenshot({ path: `${shots}/${name}-shopfloor.png` });
  await page.locator("#place-back").click();
  check(await page.evaluate(() => !PumpkinVoxel.scene.place) && await page.locator("#actions").isVisible(), `${name}: back to the patch`);
  // The wardrobe: buy a costume and wear it.
  await page.locator('[data-tab="wardrobe"]').click();
  const costume = await page.locator("[data-costume]:not([disabled])").first().getAttribute("data-costume");
  await page.locator(`[data-costume="${costume}"]`).click();
  if (await page.locator(`[data-wear="${costume}"]`).count()) await page.locator(`[data-wear="${costume}"]`).click();
  check(await page.evaluate((id) => Object.values(PumpkinVoxel.state().wardrobe.equipped).includes(id), costume), `${name}: buy and wear a costume`);
  await page.locator("#sheet-close").click();
  check(errors.length === 0, `${name}: no page errors${errors.length ? " — " + errors.join(" | ") : ""}`);
  await page.close();
}
await browser.close();
if (failed) process.exitCode = 1;
