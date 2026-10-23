// Operational hayride QA against a real isolated offline build. No fixture is
// baked into the HTML. One SwiftShader browser runs at a time.
// node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-qa
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import * as M from "../src/model.js";
import { HAYRIDE_PROPERTY, HAYRIDE_SCARES } from "../src/content/hayride.js";
import { HAYRIDE_SITE } from "../src/content/hayride-layout.js";

if (!process.argv[2]) throw Error("Pass a built offline HTML path.");
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || "/tmp/hayride-qa");
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), checks = [], errors = [], externalRequests = [], samples = [], limitations = [];
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) throw Error(`${label}: ${JSON.stringify(data)}`);
};
const fixture = M.freshState();
Object.assign(fixture, { coins: 100000, earned: 14999, introSeen: true });
fixture.progression.claimed = Array.from({ length: 7 }, (_, i) => i + 1);
fixture.progression.pending = [];
Object.assign(fixture.hollowHouse, { purchased: true, status: "ready", open: false });
fixture.visitorTimer = fixture.shop.arrivalTimer = fixture.bigSpender.timer = 1e6;
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
    reducedMotion: "reduce", deviceScaleFactor: Number(process.env.HAYRIDE_QA_DPR) || 1 });
  page.setDefaultTimeout(120000);
  page.on("pageerror", error => { errors.push(error.message); console.error("PAGE ERROR", error.message); });
  page.on("console", message => { if (message.type() === "error") { errors.push(message.text()); console.error("CONSOLE ERROR", message.text()); } });
  page.on("request", request => {
    const url = request.url();
    if (!url.startsWith(base) && !url.startsWith("data:") && !url.startsWith("blob:")) externalRequests.push(url);
  });
  await page.addInitScript(seed => {
    const key = "pumpkin-patch-voxel-reference-v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    localStorage.setItem(key + "-prefs", JSON.stringify({ renderQuality: "performance", glow: false,
      shadows: false, mist: false, lakeLights: false, music: false, sound: false, mazeSound: false }));
  }, M.saveData(fixture));
  await page.goto(base);
  await page.waitForSelector("body[data-ready]");
  await page.evaluate(() => PumpkinVoxel.intro?.skip());
  const frame = async () => {
    const token = await page.evaluate(() => {
      const next = (window.__hayrideQAFrameToken ?? 0) + 1; window.__hayrideQAFrameToken = next;
      requestAnimationFrame(() => { window.__hayrideQARendered = next; }); return next;
    });
    await page.waitForFunction(next => window.__hayrideQARendered >= next && PumpkinVoxel.scene.renderStatus.calls > 0, token);
  };
  const action = name => page.locator(`[data-hayride-action="${name}"]:visible`).last();
  // Force skips animation stability polling, but still sends a real pointer
  // click to an asserted visible, enabled control; it does not call its handler.
  const click = async locator => { check(await locator.isVisible() && await locator.isEnabled(), "interaction target is available", await locator.getAttribute("data-hayride-action") || await locator.getAttribute("aria-label") || "navigation"); await locator.click({ force: true }); };
  const state = () => page.evaluate(() => {
    const s = PumpkinVoxel.state(), h = s.hayride;
    return { time: s.time, coins: s.coins, earned: s.earned, sold: s.sold, tips: { ...s.customerCare.tips },
      version: s.version, h: JSON.parse(JSON.stringify(h)), visitors: s.visitors.map(v => ({ id: v.id,
        budget: v.budget, age: v.age, hayride: v.hayride && { ...v.hayride } })) };
  });
  const advance = async seconds => {
    await page.evaluate(seconds => { const p = PumpkinVoxel, s = p.state(); s.paused = false; p.advance(seconds); s.paused = true; }, seconds);
    return state();
  };
  const resume = () => page.evaluate(() => { PumpkinVoxel.state().paused = false; PumpkinVoxel.advance(0); });
  const snapshot = async name => {
    await frame(); await page.screenshot({ path: path.join(out, name + ".png") });
    samples.push({ name, state: await state(), rendering: await page.evaluate(() => PumpkinVoxel.scene.renderStatus) });
  };
  const layout = async label => {
    const data = await page.locator("#sheet").evaluate(host => {
      const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden";
      const controls = [...host.querySelectorAll("button,input,select,summary")].filter(visible).map(node => {
        const r = node.getBoundingClientRect(); return { action: node.dataset.hayrideAction || node.dataset.hayridePriceStep || node.tagName,
          x: r.x, right: r.right, width: r.width, height: r.height };
      });
      return { width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        clipped: controls.filter(r => r.x < -.5 || r.right > innerWidth + .5),
        small: controls.filter(r => r.width < 43.5 || r.height < 43.5),
        scrollable: host.querySelector(".sheet-body").scrollHeight >= host.querySelector(".sheet-body").clientHeight };
    });
    check(!data.horizontalOverflow && !data.clipped.length && !data.small.length, `${label}: scrollable management fits with 44px targets`, data);
  };
  const rideAction = name => page.locator(`#hayride-ride-ui [data-hayride-ride="${name}"]:visible`).filter({ hasNot: page.locator("[inert]") }).last();
  const rideStatus = () => page.evaluate(() => PumpkinVoxel.hayride.status);
  const rideLayout = async label => {
    const data = await page.locator("#hayride-ride-ui").evaluate(host => {
      const controls = [...host.querySelectorAll("button")].filter(node => node.getClientRects().length && !node.closest("[inert]")).map(node => {
        const r = node.getBoundingClientRect(); return { action: node.dataset.hayrideRide, x: r.x, right: r.right,
          y: r.y, bottom: r.bottom, width: r.width, height: r.height };
      });
      return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        clipped: controls.filter(r => r.x < -.5 || r.right > innerWidth + .5 || r.y < -.5 || r.bottom > innerHeight + .5),
        small: controls.filter(r => r.width < 43.5 || r.height < 43.5) };
    });
    check(!data.overflow && !data.clipped.length && !data.small.length, `${label}: ride controls fit with 44px targets`, data);
  };

  check(await page.evaluate(() => !!PumpkinVoxel.rules?.planHayrideVisit && typeof PumpkinVoxel.scene.focusHayride === "function"), "model and scene QA hooks are available");
  check((await state()).version >= 11, "the published game migrates into the hayride save version");
  await click(page.locator('[data-tab="attractions"]'));
  await click(page.locator('[data-attraction="hayride"]'));
  check(await action("purchase").isDisabled(), "level 7 cannot purchase the hayride");
  check((await page.locator("[data-hayride-gate]").textContent()).includes("8"), "locked attraction explains the level-8 purchase gate");
  await page.evaluate(() => { const s = PumpkinVoxel.state(); s.earned = 15000; s.progression.claimed = [1,2,3,4,5,6,7,8]; PumpkinVoxel.openSheet("hayride"); });
  const beforePurchase = await state();
  await click(action("purchase"));
  let s = await state();
  check(s.h.purchased && s.h.tier === 1 && !s.h.open && beforePurchase.coins - s.coins === HAYRIDE_PROPERTY.price, "purchase spends coins once and starts with closed admissions", s.h);
  check(await page.locator('[data-hayride-state="owned"]').isVisible(), "purchase reveals operational controls on the same page");
  await click(page.locator('[data-hayride-price-step="1"]'));
  check((await state()).h.ticketPrice === 9, "real price control increases the posted ticket");
  await click(page.locator('[data-hayride-price-step="-1"]'));
  check((await state()).h.ticketPrice === 8, "real price control decreases the posted ticket");
  await click(action("open"));
  check((await state()).h.open && await action("open").getAttribute("aria-pressed") === "true", "admissions open through the live management page");
  await layout("desktop");

  // Real rules create the visit and exact receipt; fixtures only supply guests
  // and money. They cannot skip a phase or mark a visit as paid.
  const seeded = await page.evaluate(() => {
    const p = PumpkinVoxel, m = p.rules, s = p.state(); s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
    // The genuine opening party is covered by model integration tests. Isolate
    // this capacity-four browser scenario before any invitation can board.
    if (s.hayride.ticketsSold) return false;
    s.visitors = []; s.arriving = [];
    for (let i = 0; i < 4; i++) {
      const id = 700 + i, v = { id, kind: i, profile: 0, age: 0, budget: 100, originalBudget: 100,
        basketLimit: 1, preferred: [0], basket: [], amount: 0, quantity: 0, bought: null, outcome: "shopping",
        leaveAt: null, mug: 0, party: 700, place: i, size: 4, spot: i, needs: m.freshGuestNeeds(id),
        festival: { done: true }, hollowConsidered: true, hollow: null, hayrideConsidered: true };
      v.hayride = m.planHayrideVisit(s, v, "arrival", { force: true, approachSeconds: .1 });
      if (!v.hayride) return false; s.visitors.push(v); s.nextVisitor = Math.max(s.nextVisitor, id + 1);
    }
    return true;
  });
  check(seeded, "four identifiable visitors obtain ordinary visit plans");
  s = await advance(.5);
  check(s.h.ticketsSold === 0 && s.h.convoy.manifest.length === 0 && s.visitors.filter(v => ["queue", "boarding"].includes(v.hayride?.phase)).length === 4, "the actual queue and boarding approach collect no early ticket", s.h);
  await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.focusHayride(); });
  await snapshot("desktop-station-queue");
  const beforeBoard = await state(); s = await advance(9);
  check(s.h.ticketsSold === 4 && s.h.income === 32 && s.h.convoy.manifest.length === 4, "boarding fills the wagon and records exactly four paid tickets", s.h);
  check(s.coins - beforeBoard.coins === 32 && s.earned - beforeBoard.earned === 32 && s.sold === beforeBoard.sold && JSON.stringify(s.tips) === JSON.stringify(beforeBoard.tips), "ticket revenue reconciles without retail or tip duplication");
  check(s.visitors.filter(v => v.id >= 700 && v.id < 704).every(v => v.budget === 92 && v.hayride.charged), "each passenger spends one ticket from their original purse");
  check(await page.evaluate(() => PumpkinVoxel.state().visitors.filter(v => v.hayride?.charged).every(v => PumpkinVoxel.rules.boardHayrideGuest(PumpkinVoxel.state(), v) === 0)), "replaying the boarding action cannot charge again");
  check(["departing", "circuit"].includes(s.h.convoy.phase) && s.h.departures === 1, "a full wagon departs once", s.h.convoy);
  await snapshot("desktop-tractor-departure");

  // A genuine world pick opens the small context card instead of a full sheet.
  await page.evaluate(() => { PumpkinVoxel.scene.focusHayride(); }); await frame();
  const station = await page.evaluate(hit => PumpkinVoxel.scene.project(hit.x, hit.y, hit.z), HAYRIDE_SITE.hit);
  check(station && station.x >= 0 && station.x <= 1280 && station.y >= 0 && station.y <= 800, "station remains visible and pickable in its focused camera", station);
  await page.mouse.click(station.x, station.y); await frame();
  check(await page.locator(".hayride-context").isVisible(), "tapping the voxel station opens the small attraction card");
  await click(page.locator('[data-hayride-context="manage"]'));
  check(await page.locator('[data-hayride-state="owned"]').isVisible(), "the context card opens management deliberately");

  // The owner experience is a separate presentation clock. Freeze ordinary
  // rules only for exact financial comparisons; the paid convoy is untouched.
  await page.setViewportSize({ width: 874, height: 787 }); await frame();
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.openSheet("hayride"); });
  const beforeOwner = await page.evaluate(() => JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())));
  const beforeResources = await page.evaluate(() => ({ geometries: PumpkinVoxel.scene.renderStatus.geometries, textures: PumpkinVoxel.scene.renderStatus.textures }));
  await click(action("experience"));
  check(await page.locator("#hayride-ride-ui").getAttribute("data-stage") === "brief", "the real Ride along action opens a free owner briefing");
  await rideLayout("Fold ride briefing");
  await click(rideAction("start")); await frame();
  let r = await rideStatus();
  check(r.active && !r.paused && !r.completed && await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "hayride"), "Start enters the wagon camera without entering another farm place", r);
  check(await page.locator("#hud").isHidden() && await page.locator("#dock").isHidden() && await page.locator("#actions").isHidden(), "the owner ride hides ordinary HUD and farming controls");
  check(["x","y","z"].every(k => Number.isFinite(r.camera[k])), "the boarding camera has a finite native world pose", r.camera);
  await snapshot("fold-owner-boarding");
  const plotsBeforeLook = await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().plots));
  await page.mouse.move(430, 450); await page.mouse.down(); await page.mouse.move(650, 405, { steps: 4 }); await page.mouse.up(); await frame();
  r = await rideStatus();
  check(Math.abs(r.lookYaw) > .001 && Math.abs(r.lookYaw) <= r.lookBounds.yaw && Math.abs(r.lookPitch) <= r.lookBounds.pitch, "dragging the actual canvas looks around within wagon bounds", r);
  await page.keyboard.press("h");
  check(await page.evaluate(before => JSON.stringify(PumpkinVoxel.state().plots) === before, plotsBeforeLook), "farm keyboard shortcuts do not act under the ride camera");
  await click(rideAction("pause"));
  const pausedAt = (await rideStatus()).elapsed;
  await page.evaluate(() => PumpkinVoxel.hayride.advance(10));
  check((await rideStatus()).paused && (await rideStatus()).elapsed === pausedAt && await page.locator("#hayride-ride-ui").getAttribute("data-stage") === "pause", "Pause stops only the owner presentation clock");
  await click(rideAction("resume"));
  await page.evaluate(() => PumpkinVoxel.scene.fitView());
  await page.evaluate(() => { const r = PumpkinVoxel.hayride.status; PumpkinVoxel.hayride.advance(Math.max(0, 2.5 + r.rideDuration * .56 - r.elapsed)); });
  r = await rideStatus();
  check(r.eventsFired.length >= 3 && r.zoneName.toLowerCase().includes("bride"), "the continuous wagon rail reaches the manor after the patch and spider tunnel", r);
  await snapshot("fold-ride-bride");
  await page.evaluate(() => {
    window.__hayrideQAHidden = true;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__hayrideQAHidden });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => window.__hayrideQAHidden ? "hidden" : "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  check((await rideStatus()).paused, "tab interruption pauses the owner ride");
  await page.evaluate(() => { window.__hayrideQAHidden = false; document.dispatchEvent(new Event("visibilitychange")); });
  check((await rideStatus()).paused, "returning to the tab waits for explicit Resume");
  await click(rideAction("resume"));
  await page.evaluate(() => PumpkinVoxel.hayride.advance(1000)); await frame();
  r = await rideStatus();
  check(r.completed && r.progress === 1 && r.eventsFired.length === 5 && new Set(r.eventsFired).size === 5 && await page.locator("#hayride-ride-ui").getAttribute("data-stage") === "result", "the full owner circuit finishes all five scare scenes once", r);
  const warmedResources = await page.evaluate(() => ({ geometries: PumpkinVoxel.scene.renderStatus.geometries, textures: PumpkinVoxel.scene.renderStatus.textures }));
  const fired = JSON.stringify(r.eventsFired);
  await page.evaluate(() => PumpkinVoxel.hayride.advance(1000));
  check(JSON.stringify((await rideStatus()).eventsFired) === fired, "a completed experience emits no duplicate scenes");
  await click(rideAction("replay")); await frame();
  check(!(await rideStatus()).completed && (await rideStatus()).eventsFired.length === 0, "Replay starts a fresh presentation without another paid visit");
  await click(rideAction("pause"));
  await page.setViewportSize({ width: 390, height: 844 }); await frame();
  await rideLayout("portrait paused ride"); await snapshot("phone-ride-paused");
  await page.setViewportSize({ width: 844, height: 390 }); await frame(); await rideLayout("landscape paused ride");
  await click(rideAction("exit")); await frame();
  check(!(await rideStatus()).active && await page.locator("#hayride-ride-ui").isHidden() && await page.locator("#dock").isVisible() && await page.evaluate(() => !PumpkinVoxel.scene.place), "Exit immediately restores the ordinary farm camera and controls");
  check(await page.evaluate(before => JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())) === before, beforeOwner), "free ride, pause, five scenes, replay and Exit preserve the complete farm save and paid ledgers");
  const afterResources = await page.evaluate(() => ({ geometries: PumpkinVoxel.scene.renderStatus.geometries, textures: PumpkinVoxel.scene.renderStatus.textures }));
  check(afterResources.geometries <= warmedResources.geometries && afterResources.textures <= warmedResources.textures, "repeated owner rides keep warmed scene resource counts stable", { beforeResources, warmedResources, afterResources });
  await page.setViewportSize({ width: 1280, height: 800 }); await frame();
  await page.evaluate(() => PumpkinVoxel.openSheet("hayride"));

  await resume();
  // The guest currently queued would keep a price quote, but all four current
  // passengers have paid. A new posted price must not alter their receipts.
  await click(page.locator('[data-hayride-price-step="1"]'));
  check((await state()).h.receipts.every(r => r.amount === 8), "changing price preserves tickets already paid");
  await click(action("open"));
  check(!(await state()).h.open, "closing admissions does not cancel paid riders");
  await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.enterRoom("parlour"); });
  s = await advance(20);
  check(s.h.convoy.phase === "circuit" && await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "room"), "the same convoy keeps running while viewing the house interior");
  const paid = { income: s.h.income, tickets: s.h.ticketsSold, receipts: JSON.stringify(s.h.receipts), wallets: s.visitors.filter(v => v.hayride).map(v => [v.id, v.budget]) };
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.save(); });
  await page.reload(); await page.waitForSelector("body[data-ready]");
  s = await state();
  check(s.h.ticketsSold === paid.tickets && s.h.income === paid.income && JSON.stringify(s.h.receipts) === paid.receipts && s.h.convoy.manifest.length === 4, "reload preserves the paid convoy and receipt ledger", s.h);
  check(JSON.stringify(s.visitors.filter(v => v.hayride).map(v => [v.id, v.budget])) === JSON.stringify(paid.wallets), "reload retains guest identities and remaining wallets");
  s = await advance(150);
  check(s.h.completed === 4 && s.h.ticketsSold === paid.tickets && s.h.income === paid.income && !s.h.convoy.manifest.length, "background completion unloads everybody without another ticket", s.h);

  await resume();
  await page.evaluate(() => { const s = PumpkinVoxel.state(); s.earned = 200000; s.progression.claimed = Array.from({ length: 12 }, (_, i) => i + 1); PumpkinVoxel.openSheet("hayride"); });
  await click(action("upgrade"));
  check((await state()).h.tier === 2 && await page.evaluate(() => PumpkinVoxel.rules.hayrideConfig(PumpkinVoxel.state()).seats) === 6, "first paid tier adds six seats");
  await click(action("upgrade"));
  check((await state()).h.tier === 3 && await page.evaluate(() => PumpkinVoxel.rules.hayrideConfig(PumpkinVoxel.state()).seats) === 8, "second paid tier adds eight seats");
  await click(page.locator('[data-hayride-disclosure="scares"] > summary'));
  const scare = HAYRIDE_SCARES[0];
  const beforeScare = await page.evaluate(() => PumpkinVoxel.rules.hayrideScareRating(PumpkinVoxel.state()));
  await click(page.locator(`[data-hayride-scare-buy="${scare.id}"]`));
  check(await page.evaluate(before => PumpkinVoxel.rules.hayrideScareRating(PumpkinVoxel.state()) > before, beforeScare), "a purchased scare improvement increases the real rating");
  await click(action("open"));
  check(await page.evaluate(() => PumpkinVoxel.rules.hayrideFootfallBonus(PumpkinVoxel.state()) > 0), "open attraction appeal contributes to visitor footfall");
  await click(page.locator(`[data-hayride-scare-toggle="${scare.id}"]`));
  check(await page.evaluate(id => !PumpkinVoxel.state().hayride.haunts.active.includes(id), scare.id), "turning off an owned scare changes the active installation without repurchase");
  await click(page.locator('[data-hayride-disclosure="scares"] > summary'));
  await snapshot("desktop-hayride-management");

  for (const [label, width, height] of [["phone",390,844],["phone-landscape",844,390],["fold-unfolded",874,787]]) {
    await page.setViewportSize({ width, height }); await frame(); await layout(label); await snapshot(label + "-management");
  }
  await page.locator("#sheet-close").click({ force: true });
  await page.evaluate(() => PumpkinVoxel.scene.focusHayride());
  await snapshot("fold-unfolded-station");

  await page.setViewportSize({ width: 874, height: 787 }); await frame();
  const fullButton = page.locator("#fullscreen");
  check(await fullButton.isVisible(), "fullscreen control remains available for the unfolded game");
  if (await page.evaluate(() => document.fullscreenEnabled && !!document.documentElement.requestFullscreen)) {
    await fullButton.click({ force: true });
    await page.waitForFunction(() => !!document.fullscreenElement);
    check(await page.evaluate(() => !!document.fullscreenElement), "fullscreen opens through a genuine button gesture");
    await page.evaluate(() => document.exitFullscreen());
  } else {
    limitations.push("Managed Chromium disables fullscreen (FullscreenAllowed: false). Successful OS fullscreen entry is unverified.");
    await fullButton.click({ force: true });
    await page.waitForFunction(() => [...document.querySelectorAll("[role=status],.notice")].some(node => node.textContent.includes("Fullscreen is unavailable")));
    check(!(await page.evaluate(() => !!document.fullscreenElement)), "fullscreen policy refusal leaves the game usable");
  }
  check(await page.locator("canvas").count() === 1, "the expansion retains one main WebGL canvas");
  check(externalRequests.length === 0, "the single-file HTML needs no external runtime asset requests", externalRequests);
  check(errors.length === 0, "the integrated expansion reports no page or console errors", errors);
  passed = true;
} catch (error) {
  if (page) try { await page.screenshot({ path: path.join(out, "failure.png") }); } catch {}
  throw error;
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ file,
    sha256: createHash("sha256").update(html).digest("hex"), passed, checks, errors, externalRequests, samples, limitations,
    rendering: "Chromium SwiftShader, performance profile, bloom/shadows/mist/lake lights off; desktop and phone/Fold layouts; real UI clicks with stability polling bypassed; game-time advancement uses ordinary rules" }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
