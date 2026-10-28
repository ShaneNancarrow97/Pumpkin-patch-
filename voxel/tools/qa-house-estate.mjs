// Play the self-contained estate build; staged money is not a pacing test.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const file = path.resolve(arg("--html", "dist/pumpkin-patch-voxel.html")), out = path.resolve(arg("--shots", "qa-house-estate"));
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  res.setHeader("Content-Type", "text/html"); res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const checks = [], errors = [];
const check = (ok, label, data) => { checks.push({ ok, label, data }); console.log(`${ok ? "ok" : "FAIL"} ${label}`); if (!ok) throw Error(label); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true }); page.setDefaultTimeout(120000);
  page.on("pageerror", e => { errors.push(e.message); console.log("PAGEERROR " + e.message); });
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs", JSON.stringify({ glow: false, shadows: false, music: false })));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForSelector("body[data-ready]");
  await page.evaluate(() => { const s = PumpkinVoxel.state(); s.visitorTimer = s.shop.arrivalTimer = 1e6; });
  check(await page.evaluate(() => PumpkinVoxel.state().estate.placed.length === 5), "a fresh or migrated save starts with five garden pieces");
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const tapWorld = async (x, y, z) => {
    await settle();
    const p = await page.evaluate(([x, y, z]) => PumpkinVoxel.scene.screenPoint(x, y, z), [x, y, z]);
    const b = await page.locator("#world").boundingBox();
    if (!p || p.x < 0 || p.y < 0 || p.x >= b.width || p.y >= b.height) throw Error(`World point outside view: ${JSON.stringify({ x, y, z, p, b })}`);
    await page.mouse.click(b.x + p.x, b.y + p.y);
  };
  await tapWorld(20, 2.5, 3);
  await page.waitForFunction(() => PumpkinVoxel.scene.place?.kind === "estate");
  check(await page.evaluate(() => PumpkinVoxel.scene.estateStatus.active && PumpkinVoxel.scene.estateStatus.placed === 5), "tapping the physical farm gate enters the separate estate");
  await page.screenshot({ path: path.join(out, "desktop-starter-garden.png") });

  const startAngle = await page.evaluate(() => PumpkinVoxel.scene.estateStatus.azimuth);
  const angles = [];
  for (let n = 0; n < 8; n++) { await page.locator('[data-estate-control="orbit-right"]').click(); angles.push(await page.evaluate(() => PumpkinVoxel.scene.estateStatus.azimuth)); }
  const finalAngle = angles.at(-1), angleGap = Math.abs(Math.atan2(Math.sin(finalAngle - startAngle), Math.cos(finalAngle - startAngle)));
  check(angles.some(n => Math.abs(n - startAngle) > 1) && angleGap < .04, "orbit controls complete a full 360-degree circuit", { startAngle, angles });
  const beforeDrag = await page.evaluate(() => PumpkinVoxel.scene.estateStatus.azimuth);
  await page.mouse.move(650, 330); await page.mouse.down(); await page.mouse.move(835, 365, { steps: 8 }); await page.mouse.up(); await settle();
  check(await page.evaluate(before => PumpkinVoxel.scene.place?.kind === "estate" && Math.abs(PumpkinVoxel.scene.estateStatus.azimuth - before) > .1, beforeDrag), "dragging really orbits the camera and does not enter the house on release");
  await page.locator('[data-estate-control="view-reset"]').click();
  await tapWorld(0, 2, 2.8); await page.waitForFunction(() => PumpkinVoxel.scene.place?.kind === "room");
  check((await page.locator("#place-back").textContent()).includes("garden"), "tapping the house enters the existing interior with a garden return");
  await page.locator("#place-back").click(); await page.waitForFunction(() => PumpkinVoxel.scene.place?.kind === "estate");
  check(await page.evaluate(() => PumpkinVoxel.scene.estateStatus.active), "leaving an interior returns to the same garden scene");
  await page.locator("#place-back").click(); await page.waitForFunction(() => !PumpkinVoxel.scene.place);
  await page.locator('[data-tab="home"]').click(); await page.waitForFunction(() => PumpkinVoxel.scene.place?.kind === "estate");
  check(true, "Home navigation reaches the estate from the farm");

  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.coins = 100000; s.earned = 2000000;
    s.progression.claimed = Array.from({ length: 20 }, (_, i) => i + 1); s.progression.pending = [];
    s.claimed = ["basket", "welcome", "magic", "library", "walls", "costumes", "seeds", "haunt", "market", "empire"];
    PumpkinVoxel.openEstateSheet("grounds");
  });
  check(await page.locator("[data-estate-expand]").isDisabled(), "garden expansion waits for the matching house upgrade");
  await page.locator('[data-estate-tab="garden"]').click();
  const beforeBuy = await page.evaluate(() => PumpkinVoxel.state().coins);
  await page.locator('[data-estate-buy="stone-urn"]').click();
  check(await page.evaluate(before => PumpkinVoxel.state().coins === before - 140 && PumpkinVoxel.state().estate.ownedDecor["stone-urn"] === 1, beforeBuy), "buying a garden piece charges once and adds one stored item");
  await page.locator('[data-estate-place="stone-urn"]').click();
  await page.locator('[data-estate-control="view-reset"]').click(); await tapWorld(-6, .025, 8);
  check(await page.evaluate(() => PumpkinVoxel.state().estate.placed.length === 6 && PumpkinVoxel.state().estate.ownedDecor["stone-urn"] === 0 && PumpkinVoxel.estateTools.active), "a real ground tap places the paid item and consumes one inventory copy");
  await page.locator('[data-estate-control="turn-right"]').click();
  await page.locator('[data-estate-control="done"]').click();
  check(await page.evaluate(() => !PumpkinVoxel.estateTools.active && PumpkinVoxel.scene.estateStatus.preview === null && PumpkinVoxel.state().estate.placed.find(p => p.id === "stone-urn").rotation === 15), "rotation persists and Done removes the selection footprint");

  await tapWorld(-6, .8, 8);
  const original = await page.evaluate(() => { const p = PumpkinVoxel.state().estate.placed.find(p => p.id === "stone-urn"); return { ...p }; });
  const blocked = await page.evaluate(() => PumpkinVoxel.estateTools.placeAt(0, 8));
  check(!blocked && await page.evaluate(p => { const n = PumpkinVoxel.state().estate.placed.find(n => n.instance === p.instance); return n.x === p.x && n.z === p.z; }, original), "the front entrance path rejects a move without losing the valid placement");
  await page.locator('[data-estate-control="cancel"]').click();
  await tapWorld(-6, .8, 8); await page.evaluate(() => PumpkinVoxel.estateTools.placeAt(9, 6.5));
  await page.locator('[data-estate-control="cancel"]').click();
  check(await page.evaluate(p => { const n = PumpkinVoxel.state().estate.placed.find(n => n.instance === p.instance); return n.x === p.x && n.z === p.z && n.rotation === p.rotation && !PumpkinVoxel.estateTools.active; }, original), "Cancel restores an existing piece’s original pose and clears selection");
  await tapWorld(-6, .8, 8); await page.locator('[data-estate-control="store"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().estate.placed.length === 5 && PumpkinVoxel.state().estate.ownedDecor["stone-urn"] === 1 && !PumpkinVoxel.estateTools.active), "storing returns exactly one reusable copy");
  await page.evaluate(() => { PumpkinVoxel.estateTools.selectForPlacement("stone-urn"); PumpkinVoxel.estateTools.placeAt(-9, 8); });
  await page.locator('[data-estate-control="cancel"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().estate.placed.length === 5 && PumpkinVoxel.state().estate.ownedDecor["stone-urn"] === 1), "cancelling a newly placed copy conserves garden inventory");

  const starterPieces = await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().estate.placed));
  await page.evaluate(() => PumpkinVoxel.openEstateSheet("grounds"));
  const houseCosts = [650, 2600, 9000], gardenCosts = [650, 2200, 6500];
  for (let n = 0; n < 3; n++) {
    const beforeHouse = await page.evaluate(() => PumpkinVoxel.state().coins); await page.locator("[data-estate-house]").click();
    await page.waitForFunction(level => PumpkinVoxel.scene.estateStatus.houseLevel === level, n + 1);
    check(await page.evaluate(({ level, before, cost }) => PumpkinVoxel.state().house.level === level && PumpkinVoxel.state().coins === before - cost, { level: n + 1, before: beforeHouse, cost: houseCosts[n] }), `house upgrade ${n + 1} charges correctly and rebuilds the exterior`);
    const beforeGarden = await page.evaluate(() => PumpkinVoxel.state().coins); await page.locator("[data-estate-expand]").click();
    check(await page.evaluate(({ level, before, cost }) => PumpkinVoxel.state().estate.expansion === level && PumpkinVoxel.state().coins === before - cost, { level: n + 1, before: beforeGarden, cost: gardenCosts[n] }), `garden expansion ${n + 1} is a separate paid purchase`);
  }
  check(await page.evaluate(p => JSON.stringify(PumpkinVoxel.state().estate.placed) === p, starterPieces), "every house and plot upgrade preserves all earlier garden placements");

  await page.locator('[data-estate-tab="exterior"]').click();
  for (const [part, id, cost] of [["walls", "moon-stone", 280], ["roof", "witch-plum", 260], ["trim", "bone-ivory", 180], ["door", "copper-door", 160], ["fence", "weathered-pickets", 220]]) {
    await page.locator(`[data-estate-part="${part}"]`).click(); const before = await page.evaluate(() => PumpkinVoxel.state().coins);
    await page.locator(`[data-estate-buyfinish="${id}"]`).click();
    check(await page.evaluate(({ part, id, before, cost }) => { const s = PumpkinVoxel.state(); return s.coins === before - cost && s.estate.finishes[part] === id && s.estate.ownedFinishes.includes(id); }, { part, id, before, cost }), `${part} finish is bought once and applied to its own exterior part`);
  }
  await page.locator("#sheet-close").click(); await page.locator('[data-estate-control="view-reset"]').click();
  for (const side of ["front", "right", "back", "left"]) {
    await page.screenshot({ path: path.join(out, `desktop-haven-${side}.png`) });
    await page.evaluate(() => PumpkinVoxel.scene.estateCamera.rotate(90));
  }
  await page.locator('[data-estate-control="view-reset"]').click();
  for (const [label, width, height] of [["phone", 390, 844], ["fold", 874, 787], ["landscape", 844, 390]]) {
    await page.setViewportSize({ width, height }); await page.evaluate(() => PumpkinVoxel.scene.fitView());
    const layout = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(".estate-controls button,#place-bar button")].filter(e => e.getClientRects().length);
      return { width: document.documentElement.scrollWidth, small: controls.map(e => ({ label: e.getAttribute("aria-label"), r: e.getBoundingClientRect() })).filter(({ r }) => r.width < 43.9 || r.height < 43.9).map(e => e.label) };
    });
    check(layout.width <= width && !layout.small.length, `${label}: estate controls fit with 44px touch targets`, layout);
    await page.screenshot({ path: path.join(out, `${label}-estate.png`) });
    await page.locator('[data-estate-control="garden"]').click();
    const catalogue = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, small: [...document.querySelectorAll("#sheet button")].filter(e => e.getClientRects().length).some(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }) }));
    check(catalogue.width <= width && !catalogue.small, `${label}: garden catalogue is scrollable without horizontal overflow`, catalogue);
    if (label === "phone") await page.screenshot({ path: path.join(out, "phone-garden-catalogue.png") });
    await page.locator("#sheet-close").click();
  }
  const beforeSave = await page.evaluate(() => { const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v; return { house: PumpkinVoxel.state().house.level, estate: JSON.stringify(canonical(PumpkinVoxel.state().estate)) }; });
  await page.waitForTimeout(5500); await page.reload(); await page.waitForSelector("body[data-ready]");
  check(await page.evaluate(saved => { const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v; return PumpkinVoxel.state().house.level === saved.house && JSON.stringify(canonical(PumpkinVoxel.state().estate)) === saved.estate; }, beforeSave), "save/reload preserves the house, plot, purchased finishes, stored items and placements");
  await page.setViewportSize({ width: 874, height: 787 }); await page.locator('[data-tab="home"]').click();
  await page.waitForFunction(() => PumpkinVoxel.scene.place?.kind === "estate");
  await page.evaluate(() => { PumpkinVoxel.scene.setBloom(true); PumpkinVoxel.scene.setShadows(true); PumpkinVoxel.scene.fitView(); });
  await page.screenshot({ path: path.join(out, "fold-estate-default-lighting.png") });
  check(errors.length === 0, "no page or console errors", errors);
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ file, checks, errors, rendering: "Chromium/SwiftShader; core content QA bloom/shadows off, final Fold capture on; staged progression is not a pacing measurement" }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
