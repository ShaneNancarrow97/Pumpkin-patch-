// A pinned single-file build; staging funds and levels never enter the artifact.
// node voxel/tools/qa-hollow-exterior.mjs /tmp/game.html /tmp/hollow-exterior-qa
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import * as M from "../src/model.js";
import { HOLLOW_PROPERTY, FOYER_TIERS } from "../src/content/hollow-house.js";

if (!process.argv[2]) throw Error("Pass the built offline HTML path.");
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || "/tmp/hollow-exterior-qa");
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), sha256 = createHash("sha256").update(html).digest("hex");
const checks = [], errors = [], externalRequests = [], samples = [];
const visualOnly = process.env.HOLLOW_EXTERIOR_QA_FOCUS === "visual";
let capture = process.env.HOLLOW_EXTERIOR_QA_SKIP_SHOTS !== "1";
const fixture = M.freshState(), gate = HOLLOW_PROPERTY.level;
Object.assign(fixture, { coins: 200000, earned: M.LEVELS[gate - 2].at, introSeen: true });
fixture.progression.claimed = M.LEVELS.slice(0, gate - 1).map(l => l.level);
fixture.progression.pending = []; fixture.visitorTimer = fixture.shop.arrivalTimer = fixture.bigSpender.timer = 1e6;
if (visualOnly) { fixture.earned = M.LEVELS.at(-1).at; fixture.progression.claimed = M.LEVELS.map(l => l.level); Object.assign(fixture.hollowHouse, { purchased: true, status: "ready", tier: 5 }); fixture.paused = true; }
const meta = { file, sha256, focus: visualOnly ? "final-visual" : process.env.HOLLOW_EXTERIOR_QA_VISUAL_AFTER_CORE === "1" ? "core-plus-final-visual" : "core", started: new Date().toISOString(), fixture: "QA-only funds; gate derived from current content" };
fs.writeFileSync(path.join(out, "run.json"), JSON.stringify(meta, null, 2));
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) });
  fs.writeFileSync(path.join(out, "progress.json"), JSON.stringify({ ...meta, checks, errors, externalRequests }, null, 2));
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) throw Error(`${label}: ${JSON.stringify(data)}`);
};
const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let page, passed = false;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true,
    deviceScaleFactor: Number(process.env.HOLLOW_QA_DPR) || 1, reducedMotion: "no-preference" });
  page.setDefaultTimeout(120000);
  page.on("pageerror", e => { errors.push(e.message); console.error("PAGE ERROR", e.message); });
  page.on("console", m => { if (m.type() === "error") { errors.push(m.text()); console.error("CONSOLE ERROR", m.text()); } });
  page.on("request", r => { const url = r.url(); if (!url.startsWith(base) && !url.startsWith("data:") && !url.startsWith("blob:")) externalRequests.push(url); });
  await page.addInitScript(seed => {
    const key = "pumpkin-patch-voxel-reference-v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    localStorage.setItem(key + "-prefs", JSON.stringify({ renderQuality: "performance", glow: false, shadows: false,
      mist: false, lakeLights: false, music: false, sound: false, mazeSound: false, hayrideSound: false }));
  }, M.saveData(fixture));
  await page.goto(base); await page.waitForSelector("body[data-ready]");
  await page.evaluate(() => PumpkinVoxel.intro?.skip());
  const frame = async () => {
    const token = await page.evaluate(() => { const n = (window.__hollowQAFrame ?? 0) + 1; window.__hollowQAFrame = n; requestAnimationFrame(() => window.__hollowQAFrameDone = n); return n; });
    await page.waitForFunction(n => window.__hollowQAFrameDone >= n && PumpkinVoxel.scene.renderStatus.calls > 0, token);
  };
  const status = () => page.evaluate(() => PumpkinVoxel.scene.hollowExteriorStatus);
  const save = () => page.evaluate(() => JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())));
  const action = name => page.locator(`[data-hollow-action="${name}"]:visible`).last();
  const click = async locator => { check(await locator.isVisible() && await locator.isEnabled(), "interaction target is available", await locator.getAttribute("data-hollow-action") || await locator.getAttribute("aria-label") || "navigation"); await locator.click({ force: true }); };
  const close = () => page.evaluate(() => { PumpkinVoxel.closeSheet(); document.querySelector('[data-hollow-context="close"]')?.click(); });
  const focus = () => page.evaluate(p => { PumpkinVoxel.scene.focus(p.x, p.z - 1.6, 1.9); }, HOLLOW_PROPERTY);
  const pick = async (x, y, z) => { await frame(); const p = await page.evaluate(([x, y, z]) => PumpkinVoxel.scene.project(x, y, z), [x, y, z]); check(p.x >= 0 && p.x <= (await page.viewportSize()).width && p.y >= 0 && p.y <= (await page.viewportSize()).height, "world target is visible", p); await page.mouse.click(p.x, p.y); await frame(); };
  const snapshot = async name => { if (!capture) return; await frame(); await page.screenshot({ path: path.join(out, name + ".png") }); samples.push({ name, status: await status(), rendering: await page.evaluate(() => PumpkinVoxel.scene.renderStatus) }); };
  const layout = async label => {
    const result = await page.locator("#sheet").evaluate(host => {
      const controls = [...host.querySelectorAll("button,select,input,summary")].filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return { label: n.textContent.trim().slice(0, 55), x: r.x, right: r.right, w: r.width, h: r.height }; });
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: controls.filter(r => r.x < -.5 || r.right > innerWidth + .5), small: controls.filter(r => r.w < 43.5 || r.h < 43.5) };
    });
    check(!result.overflow && !result.clipped.length && !result.small.length, `${label}: upgrade menu fits with 44px targets`, result);
  };
  const runVisual = async () => {
    capture = true; await close(); await page.setViewportSize({ width: 1280, height: 800 });
    for (const [label, houseStatus, tier] of [["derelict", "derelict", 1], ["tier-3", "ready", 3], ["tier-5", "ready", 5]]) {
      await page.evaluate(([status, tier]) => { const p = PumpkinVoxel, h = p.state().hollowHouse; h.status = status; h.tier = tier; p.scene.refreshHollow(); }, [houseStatus, tier]);
      await focus(); await snapshot("desktop-" + label);
      check((await status()).status === houseStatus && (await status()).tier === tier, `the final sign refinement renders ${label}`);
    }
    const saved = await save();
    await pick(HOLLOW_PROPERTY.x, 1.25, HOLLOW_PROPERTY.z + 2.54);
    check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "foyer"), "the final visible entrance still enters the foyer");
    await page.evaluate(() => PumpkinVoxel.leavePlace()); await focus();
    check(await save() === saved, "the final entrance and sign refinement cannot change farm or ticket state");
    await page.setViewportSize({ width: 390, height: 844 }); await focus();
    await page.evaluate(() => PumpkinVoxel.openHollowSheet("upgrades")); await frame(); await layout("final phone"); await snapshot("phone-upgrade-menu");
    await close(); await page.setViewportSize({ width: 874, height: 787 }); await focus(); await snapshot("fold-tier-5");
  };
  if (visualOnly) await runVisual(); else {
  check(await page.evaluate(() => !!PumpkinVoxel.scene.hollowExteriorStatus), "the farm exposes exterior diagnostics");
  await focus(); await snapshot("desktop-derelict");
  check((await status()).status === "derelict", "an unpurchased attraction remains visibly derelict");
  await page.evaluate(() => PumpkinVoxel.openHollowSheet("manage"));
  check(await action("purchase").isDisabled(), "purchase retains the current level gate");
  await page.evaluate(() => { const p = PumpkinVoxel, s = p.state(); s.earned = p.rules.LEVELS.at(-1).at; s.progression.claimed = p.rules.LEVELS.map(l => l.level); s.progression.pending = []; p.openHollowSheet("manage"); });
  const beforePurchase = await page.evaluate(() => PumpkinVoxel.state().coins);
  await click(action("purchase"));
  check(await page.evaluate(([cash, cost]) => { const s = PumpkinVoxel.state(); return s.coins === cash - cost && s.hollowHouse.purchased && s.hollowHouse.status === "derelict" && !s.hollowHouse.open; }, [beforePurchase, HOLLOW_PROPERTY.price]), "buying the house spends once and does not restore or open it");
  const beforeRestore = await page.evaluate(() => PumpkinVoxel.state().coins);
  await click(action("restore"));
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.refreshHollow(); });
  await focus(); await snapshot("desktop-restoring");
  check(await page.evaluate(([cash, cost]) => PumpkinVoxel.state().coins === cash - cost && PumpkinVoxel.state().hollowHouse.status === "restoring", [beforeRestore, HOLLOW_PROPERTY.restorationCost]), "paid restoration has its own visible stage");
  check((await status()).status === "restoring", "the farm model follows actual restoration status");
  await page.evaluate(() => PumpkinVoxel.advance(5));
  check(await page.evaluate(() => PumpkinVoxel.state().hollowHouse.restoreRemaining > 89), "paused restoration remains paused while visuals can be inspected");
  await page.evaluate(seconds => { const p = PumpkinVoxel; p.state().paused = false; p.advance(seconds + 1); p.state().paused = true; p.scene.refreshHollow(); }, HOLLOW_PROPERTY.restorationSeconds);
  await frame();
  check(await page.evaluate(() => { const h = PumpkinVoxel.state().hollowHouse; return h.status === "ready" && !h.open && h.ticketsSold === 0 && h.income === 0; }), "restoration finishes into a closed attraction without ticket income");
  await snapshot("desktop-tier-1");
  check((await status()).tier === 1 && (await status()).status === "ready", "restored tier one replaces the restoration model");
  await pick(HOLLOW_PROPERTY.x - 2.4, 2.5, HOLLOW_PROPERTY.z + 2.3);
  check(await page.locator(".hollow-context").isVisible(), "the facade opens its compact context card");
  await click(page.locator('[data-hollow-context="close"]'));
  await pick(HOLLOW_PROPERTY.x, 1.25, HOLLOW_PROPERTY.z + 2.54);
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "foyer"), "the highlighted physical door enters the existing foyer");
  check(await page.evaluate(() => PumpkinVoxel.state().hollowHouse.ticketsSold === 0 && PumpkinVoxel.state().hollowHouse.income === 0), "owner door entry cannot create a paid ticket");
  await page.evaluate(() => PumpkinVoxel.leavePlace()); await focus();

  const tierSignatures = [(await status()).signature ?? (await status()).boxes];
  for (let tier = 2; tier <= 5; tier++) {
    await page.evaluate(() => { PumpkinVoxel.state().paused = false; PumpkinVoxel.openHollowSheet("upgrades"); });
    const cash = await page.evaluate(() => PumpkinVoxel.state().coins);
    await click(action("upgrade"));
    await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.refreshHollow(); });
    await focus(); await frame();
    const ext = await status(); tierSignatures.push(ext.signature ?? ext.boxes);
    check(ext.tier === tier && await page.evaluate(([cash, cost, tier]) => PumpkinVoxel.state().coins === cash - cost && PumpkinVoxel.state().hollowHouse.tier === tier, [cash, FOYER_TIERS[tier - 1].cost, tier]), `paid tier ${tier} immediately refreshes its farm exterior`, ext);
    if ([3, 5].includes(tier)) await snapshot("desktop-tier-" + tier);
  }
  check(new Set(tierSignatures).size === 5, "the five restored appearances have distinct geometry signatures", tierSignatures);
  const beforeIdle = await save(), beforeStatus = await status();
  for (let i = 0; i < 3; i++) { await page.evaluate(() => PumpkinVoxel.scene.refreshHollow()); await frame(); }
  check(await save() === beforeIdle, "idle effects and repeated refreshes cannot alter any saved farm data or ledgers");
  const afterStatus = await status();
  check(afterStatus.rebuilds === beforeStatus.rebuilds, "an unchanged exterior is cached rather than rebuilt each frame", { beforeStatus, afterStatus });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches && PumpkinVoxel.scene.hollowExteriorStatus.reducedMotion === true); await frame();
  const gentle = await status();
  check(gentle.reducedMotion === true, "OS reduced motion immediately stills the exterior effects", gentle);
  check(await save() === beforeIdle, "reduced motion changes no progress, cash or ticket state");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !matchMedia("(prefers-reduced-motion: reduce)").matches && PumpkinVoxel.scene.hollowExteriorStatus.reducedMotion === false); await frame();
  check((await status()).reducedMotion === false, "returning to full motion resumes only the visual effects");

  for (const [label, width, height] of [["phone", 390, 844], ["phone-landscape", 844, 390], ["fold", 874, 787]]) {
    await page.setViewportSize({ width, height }); await focus();
    await page.evaluate(() => PumpkinVoxel.openHollowSheet("upgrades")); await frame(); await layout(label);
    if (label !== "phone-landscape") await snapshot(label + "-upgrade-menu");
    await close(); await focus();
    if (label === "fold") await snapshot("fold-tier-5");
  }
  const beforeReload = await page.evaluate(() => { const p = PumpkinVoxel, s = p.state(); s.paused = true; p.save(); return JSON.stringify(p.rules.saveData(p.rules.restoreState(JSON.parse(JSON.stringify(p.rules.saveData(s)))))); });
  await page.reload(); await page.waitForSelector("body[data-ready]"); await page.evaluate(() => PumpkinVoxel.intro?.skip()); await focus(); await frame();
  check((await status()).tier === 5 && (await status()).status === "ready", "save reload restores the same exterior tier");
  check(await save() === beforeReload, "save reload retains the complete paused progress, furnishings and ticket ledgers");
  if (process.env.HOLLOW_EXTERIOR_QA_VISUAL_AFTER_CORE === "1") await runVisual();
  }
  check(await page.locator("canvas").count() === 1, "the exterior retains one main WebGL canvas");
  check(externalRequests.length === 0, "the standalone HTML fetches no external runtime assets", externalRequests);
  check(errors.length === 0, "the exterior reports no page or console errors", errors);
  passed = true;
} catch (error) {
  if (page) try { await page.screenshot({ path: path.join(out, "failure.png") }); } catch {}
  throw error;
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ ...meta, passed, checks, errors, externalRequests, samples,
    rendering: "One Chromium/SwiftShader process; performance/DPR1, bloom/shadows/mist/lake lights off. Viewport checks do not establish physical Fold frame rate. Managed browser policy blocks direct file:// and native fullscreen." }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
