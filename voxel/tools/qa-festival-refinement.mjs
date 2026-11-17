// Focused regression for the contractor menus and guest-card lifecycle.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const file = path.resolve(arg("--html", "dist/pumpkin-patch-voxel.html")), out = path.resolve(arg("--shots", "qa-refinement"));
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  res.setHeader("Content-Type", "text/html"); res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const checks = [], errors = [];
const check = (ok, label, data) => { checks.push({ ok, label, data }); console.log(`${ok ? "ok" : "FAIL"} ${label}`); if (!ok) throw Error(label); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  page.setDefaultTimeout(120000);
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs", JSON.stringify({ glow: false, shadows: false, music: false })));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForSelector("body[data-ready]");
  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.coins = 10000; s.earned = 15000;
    s.progression.claimed = Array.from({ length: 12 }, (_, i) => i + 1); s.progression.pending = [];
    s.visitorTimer = s.shop.arrivalTimer = 1e6; s.festival.meadow = true;
    Object.assign(s.festival.cocoa, { level: 3, stock: 10, courier: true, autoSupply: false });
    PumpkinVoxel.scene.refreshEstate(); PumpkinVoxel.openSheet("festival");
  });
  await page.locator('[data-festival-tab="cocoa"]').click();
  check((await page.locator("#sheet-body").textContent()).includes("plain cups in stock") && (await page.locator("#sheet-body").textContent()).includes("Midnight sauce cocoa"), "stock and drink names distinguish plain cocoa from specials");
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.openSheet("festival"); });
  const paused = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('[data-cocoa-price],[data-special-price],[data-festival-action="open"],[data-festival-action="auto"]')];
    return { count: controls.length, disabled: controls.every(e => e.disabled) };
  });
  check(paused.count > 8 && paused.disabled, "all cocoa prices and operating switches disable during tea break", paused);
  const staleEvent = await page.evaluate(() => {
    const s = PumpkinVoxel.state(), before = s.coins, oldPrice = s.festival.cocoa.prices.flake;
    const select = document.querySelector('[data-special-price="flake"]'); select.value = "9"; select.dispatchEvent(new Event("change"));
    return s.coins === before && s.festival.cocoa.prices.flake === oldPrice && select.value === String(oldPrice);
  });
  check(staleEvent, "a rejected stale price event restores the saved price without charging");
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; PumpkinVoxel.openSheet("festival"); });
  await page.locator('[data-special-price="flake"]').selectOption("9");
  check(await page.evaluate(() => PumpkinVoxel.state().festival.cocoa.prices.flake === 9), "prices become editable again after resuming");
  for (const [label, width, height] of [["phone", 390, 844], ["fold", 874, 787], ["landscape", 844, 390]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, small: [...document.querySelectorAll("#sheet button,#sheet select")].filter(e => e.getClientRects().length).some(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }) }));
    check(layout.width <= width && !layout.small, `${label}: refined menu fits with 44px controls`, layout);
    await page.screenshot({ path: path.join(out, `${label}-menu.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.stock = [200, 50, 50, 50]; s.visitorTimer = .1;
    PumpkinVoxel.closeSheet(); PumpkinVoxel.advance(10); s.paused = true;
    const v = s.visitors.find(v => v.festival && !v.festival.done);
    if (v) PumpkinVoxel.scene.focus(v.festival.x, v.festival.z, 1.5);
  });
  const tapGuest = async () => {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const point = await page.evaluate(() => {
      const v = PumpkinVoxel.state().visitors.find(v => v.festival && !v.festival.done);
      return v ? PumpkinVoxel.scene.screenPoint(v.festival.x, 1.1, v.festival.z) : null;
    });
    if (!point) throw Error("No staged guest");
    const canvas = await page.locator("#world").boundingBox(); await page.mouse.click(canvas.x + point.x, canvas.y + point.y);
    await page.waitForSelector(".guest-card:not([hidden])");
  };
  await tapGuest(); await page.keyboard.press("Escape");
  check(await page.locator(".guest-card").isHidden(), "Escape dismisses the guest inspector");
  await tapGuest(); await page.evaluate(() => PumpkinVoxel.enterRoom("parlour"));
  check(await page.locator(".guest-card").isHidden(), "entering the house clears the outdoor guest inspector");
  await page.evaluate(() => PumpkinVoxel.leavePlace());
  check(await page.locator(".guest-card").isHidden(), "returning outside does not revive the stale guest inspector");
  await tapGuest(); await page.evaluate(() => { PumpkinVoxel.state().shop.unlocked = true; PumpkinVoxel.enterShop(); });
  check(await page.locator(".guest-card").isHidden(), "entering Skyla’s shop also clears the outdoor inspector");
  await page.evaluate(() => { PumpkinVoxel.leavePlace(); PumpkinVoxel.scene.fitView(); });
  check(await page.evaluate(() => !document.querySelector(".world-signs")), "signage remains part of the voxel world without floating map labels");
  check(errors.length === 0, "no page or console errors", errors);
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ file, checks, errors, rendering: "Chromium/SwiftShader; bloom and shadows off for focused UI QA" }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
