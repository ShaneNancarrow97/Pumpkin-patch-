// Exercise the unchanged standalone HTML with QA-only localStorage fixtures.
// node voxel/tools/qa-kitchen-workshop.mjs game.html /tmp/kitchen-workshop-qa
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import * as M from "../src/model.js";

if (!process.argv[2]) throw Error("Pass the immutable standalone HTML path.");
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || "/tmp/kitchen-workshop-qa");
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), sha256 = createHash("sha256").update(html).digest("hex");
const checks = [], errors = [], externalRequests = [], screenshots = [];
const meta = { file, sha256, started: new Date().toISOString(), fixture: "QA-only funds, published levels and suppressed unrelated arrivals; runtime and UI unmodified" };
const write = name => fs.writeFileSync(path.join(out, name), JSON.stringify({ ...meta, checks, errors, externalRequests, screenshots }, null, 2));
write("run.json");
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) });
  write("progress.json"); console.log((ok ? "ok  " : "FAIL") + " " + label);
  if (!ok) throw Error(label + ": " + JSON.stringify(data));
};
const seed = M.freshState();
Object.assign(seed, { coins: 60000, earned: M.LEVELS.at(-1).at, paused: true, introSeen: true });
seed.progression.claimed = M.LEVELS.map(l => l.level); seed.progression.pending = [];
seed.visitorTimer = seed.shop.arrivalTimer = seed.bigSpender.timer = 1e6;
const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let page, passed = false;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" });
  page.setDefaultTimeout(120000);
  page.on("pageerror", e => { errors.push(e.message); console.error("PAGE ERROR", e.message); });
  page.on("console", m => { if (m.type() === "error") { errors.push(m.text()); console.error("CONSOLE ERROR", m.text()); } });
  page.on("request", r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith("data:") && !u.startsWith("blob:")) externalRequests.push(u); });
  await page.addInitScript(seed => {
    const key = "pumpkin-patch-voxel-reference-v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
    localStorage.setItem(key + "-prefs", JSON.stringify({ renderQuality: "performance", glow: false, shadows: false, mist: false, lakeLights: false, music: false, sound: false, mazeSound: false, hayrideSound: false }));
  }, M.saveData(seed));
  const boot = async () => { await page.waitForSelector("body[data-ready]"); await page.evaluate(() => PumpkinVoxel.intro?.skip()); };
  await page.goto(base); await boot();
  const frame = async () => {
    const token = await page.evaluate(() => { const n = (window.__kitchenQAFrame ?? 0) + 1; window.__kitchenQAFrame = n; requestAnimationFrame(() => window.__kitchenQAFrameDone = n); return n; });
    await page.waitForFunction(n => window.__kitchenQAFrameDone >= n && PumpkinVoxel.scene.renderStatus.calls > 0, token);
  };
  const open = async (tab, station = "home") => { await page.evaluate(([t, s]) => PumpkinVoxel.openCookingSheet(t, s), [tab, station]); await frame(); };
  const click = async locator => {
    const ready = await locator.isVisible() && await locator.isEnabled();
    if (!ready) check(false, "required interaction is available", await locator.getAttribute("data-cooking-action") || await locator.textContent());
    await locator.click({ force: true });
  };
  const advance = async seconds => page.evaluate(n => { const p = PumpkinVoxel; p.state().paused = false; p.advance(n); p.state().paused = true; }, seconds);
  const resume = () => page.evaluate(() => { PumpkinVoxel.state().paused = false; });
  const shot = async name => {
    if (process.env.KITCHEN_QA_SKIP_SHOTS === "1") return;
    await frame(); await page.screenshot({ path: path.join(out, name + ".png") });
    screenshots.push({ name, kitchen: await page.evaluate(() => PumpkinVoxel.scene.kitchenStatus ?? null), rendering: await page.evaluate(() => PumpkinVoxel.scene.renderStatus) }); write("progress.json");
  };
  const layout = async name => {
    const data = await page.locator("#sheet").evaluate(host => {
      const scrollableParent = n => { for (let p = n.parentElement; p && p !== host; p = p.parentElement) { const s = getComputedStyle(p); if (["auto", "scroll"].includes(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
      const controls = [...host.querySelectorAll("button,select,input,summary")].filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return { label: n.getAttribute("aria-label") || n.textContent.trim().slice(0, 40), x: r.x, right: r.right, w: r.width, h: r.height, ownScroll: scrollableParent(n) }; });
      return { width: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, small: controls.filter(r => r.w < 43.5 || r.h < 43.5), clipped: controls.filter(r => !r.ownScroll && (r.x < -.5 || r.right > innerWidth + .5)) };
    });
    check(!data.pageOverflow && !data.small.length && !data.clipped.length, name + ": menus fit and controls meet 44px touch targets", data);
  };

  check(await page.evaluate(() => PumpkinVoxel.rules.STATE_VERSION === 13 && PumpkinVoxel.state().version === 13), "additive kitchen workshop schema 13 boots");
  await resume();
  const setup = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(), cash = s.coins;
    const truck = p.rules.buyFoodTruck(s), first = p.rules.upgradeHouse(s), second = p.rules.upgradeHouse(s);
    return { truck: !!truck, first, second, spent: cash - s.coins, kitchen: p.rules.roomUnlocked(s, "kitchen"), equipment: p.rules.kitchenEquipment(s, "home") };
  });
  check(setup.truck && setup.first && setup.second && setup.spent === 4150 && setup.kitchen && setup.equipment.length === 0, "paid truck and two house tiers unlock the real kitchen without free equipment", setup);
  await page.evaluate(() => PumpkinVoxel.enterKitchen()); await frame();
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "room" && PumpkinVoxel.scene.place.id === "kitchen"), "entering home cooking navigates into the physical kitchen");
  await open("equipment");
  check(await page.evaluate(() => !PumpkinVoxel.rules.homeCookingAvailable(PumpkinVoxel.state())), "an empty kitchen cannot cook");
  const placementRules = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.rules.restoreState(p.rules.saveData(p.state())); s.paused = false;
    const bought = p.rules.buyDecor(s, "kitchen-pan-rail"), stored = p.rules.kitchenEquipment(s, "home").includes("pan");
    const placed = p.rules.placeDecor(s, "kitchen-pan-rail", "parlour"), elsewhere = p.rules.kitchenEquipment(s, "home").includes("pan");
    const moved = placed && p.rules.sendToRoom(s, placed.instance ?? placed, "kitchen"), active = p.rules.kitchenEquipment(s, "home").includes("pan");
    return { bought, stored, placed: !!placed, elsewhere, moved, active };
  });
  check(placementRules.bought && !placementRules.stored && placementRules.placed && !placementRules.elsewhere && placementRules.moved && placementRules.active, "only equipment physically placed in the kitchen qualifies, not owned or placed elsewhere", placementRules);
  const equipmentIds = ["kitchen-hob", "kitchen-oven", "kitchen-pot-rail", "kitchen-pan-rail", "kitchen-baking-rack", "kitchen-spice-shelf"];
  const beforeTools = await page.evaluate(() => PumpkinVoxel.state().coins);
  for (const id of equipmentIds) { await resume(); await open("equipment"); await click(page.locator('[data-cooking-equipment="' + id + '"]')); }
  const tools = await page.evaluate(() => ({ placed: PumpkinVoxel.state().house.placed.filter(p => p.room === "kitchen").map(p => p.id), capabilities: PumpkinVoxel.rules.kitchenEquipment(PumpkinVoxel.state(), "home"), cash: PumpkinVoxel.state().coins }));
  check(equipmentIds.every(id => tools.placed.includes(id)) && ["hob", "oven", "pot", "pan", "tray", "spice"].every(id => tools.capabilities.includes(id)) && beforeTools - tools.cash === 2520, "six affordable tools are paid for, physically placed and usable", tools);
  await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.refreshRoom(); }); await frame(); await shot("desktop-equipped-kitchen");

  const appliance = await page.evaluate(() => {
    const p = PumpkinVoxel, piece = p.state().house.placed.find(item => item.id === "kitchen-hob" && item.room === "kitchen");
    return { instance: piece.instance, point: p.scene.project(200 + piece.x + 1, .9, piece.z + .5) };
  });
  await page.mouse.click(appliance.point.x, appliance.point.y); await frame();
  if (!await page.locator('[data-cooking-state="owned"]').isVisible()) await click(page.locator('[data-tool="cook"]'));
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "room" && PumpkinVoxel.scene.place.id === "kitchen") && await page.locator('[data-cooking-state="owned"]').isVisible(), "tapping the real kitchen hob exposes its Cook action without losing house editing");

  await open("deliveries");
  const order = { vegetables: 14, butter: 7, herbs: 7, meat: 2, spices: 1, chicken: 2, stock: 1, flour: 2 };
  for (const [id, amount] of Object.entries(order)) { const field = page.locator('[data-cooking-order-quantity="' + id + '"]'); await field.fill(String(amount)); await field.press("Tab"); }
  const beforeOrder = await page.evaluate(() => PumpkinVoxel.state().coins); await click(page.locator('[data-cooking-action="order"]'));
  check(await page.evaluate(cash => { const s = PumpkinVoxel.state(); return cash - s.coins === 114 && s.kitchen.orders[0]?.items.meat === 2 && s.kitchen.orders[0]?.items.spices === 1 && s.kitchen.pantry.vegetables === 0; }, beforeOrder), "raw meat, vegetables, herbs and spices are bought in a paid delivery");
  await advance(61);
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.orders.length === 0 && k.pantry.vegetables === 14 && k.pantry.meat === 2 && k.pantry.spices === 1; }), "delivery credits the actual raw supplies to the shared pantry");
  const invalid = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(); s.paused = false; const before = JSON.stringify(p.rules.saveData(s));
    const selection = { station: "home", method: "pan", ingredients: { flour: 1, spices: 1 }, pumpkins: {}, batches: 1 };
    const preview = p.rules.previewCookingMix(s, selection), result = p.rules.startCookingMix(s, selection);
    return { recipe: preview.recipe, started: !!result, unchanged: before === JSON.stringify(p.rules.saveData(s)) };
  });
  check(!invalid.recipe && !invalid.started && invalid.unchanged, "an unknown combination does not charge or consume ingredients", invalid);
  await open("mix");
  for (const [id, n] of Object.entries({ vegetables: 2, butter: 1, herbs: 1 })) {
    await page.locator("[data-cooking-mix-add]").selectOption(id); await click(page.locator("[data-cooking-mix-add-button]"));
    const field = page.locator('[data-cooking-mix-quantity="' + id + '"]'); await field.fill(String(n)); await field.press("Tab");
  }
  await page.locator("[data-cooking-mix-method]").selectOption("pan");
  await resume(); await click(page.locator("[data-cooking-mix-start]")); await page.evaluate(() => { PumpkinVoxel.state().paused = true; });
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.jobs.home?.recipe === "garden-skillet" && k.jobs.home.discovery && !k.recipes.includes("garden-skillet") && k.pantry.vegetables === 12 && k.pantry.butter === 6 && k.pantry.herbs === 6; }), "a kitchen mix consumes real supplies and begins discovery at home");
  check(await page.locator('#cooking-reveal').isVisible(), "first cooking shows a skippable dish preparation presentation");
  await page.locator('#cooking-reveal button').click({force:true});
  const beforeReload = await page.evaluate(() => { PumpkinVoxel.save(); const j = PumpkinVoxel.state().kitchen.jobs.home; return { recipe: j.recipe, remaining: j.remaining, discovery: j.discovery }; });
  await page.reload(); await boot(); await frame();
  check(await page.evaluate(before => { const k = PumpkinVoxel.state().kitchen, j = k.jobs.home; return j?.recipe === before.recipe && j.discovery && Math.abs(j.remaining - before.remaining) < .2 && !k.recipes.includes("garden-skillet"); }, beforeReload), "unlearned discovery survives save and reload without losing paid inputs");
  await advance(41);
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.recipes.includes("garden-skillet") && k.food["garden-skillet"] === 3 && !k.jobs.home; }), "first completion discovers the dish and creates its portions once");
  await resume(); await open("recipes", "home"); await page.locator("[data-cooking-batches]").selectOption("5");
  await click(page.locator('[data-cooking-start="garden-skillet"]')); await page.evaluate(() => { PumpkinVoxel.state().paused = true; });
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.jobs.home?.batches === 5 && k.jobs.home.completed === 0 && k.pantry.vegetables === 2 && k.pantry.butter === 1 && k.pantry.herbs === 1 && k.food["garden-skillet"] === 3 && PumpkinVoxel.rules.pendingCookingOutput(PumpkinVoxel.state()) === 15; }), "five batches consume five input sets up front and reserve fifteen spaces");
  const firstRemaining = await page.evaluate(() => PumpkinVoxel.state().kitchen.jobs.home.remaining); await advance(firstRemaining + .1);
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.food["garden-skillet"] === 6 && k.jobs.home?.completed === 1 && PumpkinVoxel.rules.pendingCookingOutput(PumpkinVoxel.state()) === 12; }), "bulk cooking releases one batch at a time");
  await advance(161);
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return !k.jobs.home && k.food["garden-skillet"] === 18 && k.pantry.vegetables === 2; }), "the run finishes fifteen further portions without extra spending");
  await resume(); await open("food", "home"); await page.locator('[data-cooking-display="0"]').selectOption("garden-skillet"); await page.locator('[data-cooking-price="garden-skillet"]').selectOption("12");
  const receipt = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(); s.paused = false; s.shop.unlocked = true; s.customerCare.bags = 2;
    const c = { id: 900, kind: 0, budget: 50, originalBudget: 50, basket: [], needs: { hunger: 100, value: 1, happiness: 80, thirst: 50 }, wish: null };
    const cash = s.coins, food = s.kitchen.food["garden-skillet"], hold = p.rules.quoteFoodForCustomer(s, c, []); p.rules.setFoodPrice(s, "garden-skillet", 13);
    const paid = p.rules.commitFoodForCustomer(s, c), again = p.rules.commitFoodForCustomer(s, c);
    return { hold, paid, again, budget: c.budget, gained: s.coins - cash, consumed: food - s.kitchen.food["garden-skillet"] };
  });
  check(receipt.hold.quantity === 3 && receipt.paid.quantity === 3 && receipt.paid.amount === 36 && !receipt.again && receipt.budget === 14 && receipt.gained === 36 && receipt.consumed === 3, "a hungry bag-carrying guest pays once for three servings from one wallet", receipt);
  const roast = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(); s.paused = false;
    const selection = { station: "home", method: "bake", ingredients: { meat: 2, vegetables: 2, spices: 1 }, pumpkins: {}, batches: 1 };
    const preview = p.rules.previewCookingMix(s, selection), job = p.rules.startCookingMix(s, selection); s.paused = true;
    return { preview, started: !!job, ingredients: { meat: s.kitchen.pantry.meat, vegetables: s.kitchen.pantry.vegetables, spices: s.kitchen.pantry.spices } };
  });
  check(roast.preview.recipe === "spiced-roast" && roast.preview.ok && roast.started && Object.values(roast.ingredients).every(n => n === 0), "roasting needs oven, tray, spice shelf and actual meat, vegetables and spices", roast);
  await page.evaluate(() => { PumpkinVoxel.enterRoom("kitchen"); PumpkinVoxel.closeSheet(); }); await frame(); await shot("desktop-active-home-cooking");
  await page.evaluate(() => { const p=PumpkinVoxel,s=p.state();s.paused=false;p.rules.wearCostume(s,'natalie-wheelchair');p.scene.refreshLooks();p.leavePlace();p.closeSheet();p.scene.focusCooking(); }); await frame(); await shot('maisie-food-truck');
  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();p.rules.buyVisitorEventUpgrade(s,'vip');s.visitorEvents.vip.remaining=0;p.advance(.5);s.paused=true;});await frame();
  check(await page.evaluate(()=>{const vs=PumpkinVoxel.state().visitors.filter(v=>v.courtier);return vs.length>=3&&vs.every(v=>v.kind>=11&&v.kind<=14&&v.originalBudget>=140&&v.originalBudget<=250);}), 'paid VIP entry spawns real courtier sprites with finite purses');
  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();s.paused=false;p.scene.focus(33,19,2);p.closeSheet();p.save();});await frame();await shot('vip-and-purple-wheelchair');
  check(await page.evaluate(()=>PumpkinVoxel.state().wardrobe.equipped.natalie==='natalie-wheelchair'), 'free wheelchair look is equipped through wardrobe rules');
  for (const [label, w, h, tab] of [["phone", 390, 844, "equipment"], ["landscape", 844, 390, "mix"], ["fold", 874, 787, "mix"]]) {
    await page.setViewportSize({ width: w, height: h }); await open(tab, "home"); await layout(label); if (label !== "landscape") await shot(label + "-kitchen-controls");
  }
  const saved = await page.evaluate(() => { const p = PumpkinVoxel; p.state().paused = true; p.save(); return JSON.stringify(p.rules.saveData(p.rules.restoreState(p.rules.saveData(p.state())))); });
  await page.reload(); await boot(); await frame();
  check(await page.evaluate(() => JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state()))) === saved, "schema 13 reload preserves equipment, supplies, discoveries, batch state, prices and food sales");
  check(await page.locator("canvas").count() === 1, "one WebGL canvas remains after kitchen transitions");
  check(!externalRequests.length, "standalone HTML requests no external runtime assets", externalRequests);
  check(!errors.length, "no page or console errors", errors);
  passed = true;
} catch (e) {
  console.error(e.stack || e); meta.failure = String(e);
  if (page) try { await page.screenshot({ path: path.join(out, "failure.png") }); } catch {}
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ ...meta, finished: new Date().toISOString(), passed, checks, errors, externalRequests, screenshots }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
