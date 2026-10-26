// Exercise the shipped single-file HTML. Any seeded funds/levels live only in
// this QA browser's localStorage; the downloadable artifact stays unmodified.
// node voxel/tools/qa-cooking.mjs /tmp/game.html /tmp/cooking-qa
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import * as M from "../src/model.js";

if (!process.argv[2]) throw Error("Pass the immutable offline HTML path.");
const file = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || "/tmp/cooking-qa");
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), sha256 = createHash("sha256").update(html).digest("hex");
const checks = [], errors = [], externalRequests = [], samples = [];
const focus = process.env.COOKING_QA_FOCUS || "complete-flow";
const visualOnly = ["visual", "final"].includes(focus), lightFinal = focus === "final";
const meta = { file, sha256, focus: lightFinal ? "final-artifact-smoke" : visualOnly ? "visual-regression" : "complete-flow", started: new Date().toISOString(),
  fixture: "QA-only funds and level gates; game rules, UI handlers and HTML are unmodified" };
const write = name => fs.writeFileSync(path.join(out, name), JSON.stringify({ ...meta, checks, errors, externalRequests, samples }, null, 2));
write("run.json");
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) });
  write("progress.json"); console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) throw Error(`${label}: ${JSON.stringify(data)}`);
};
const fixture = M.freshState();
Object.assign(fixture, { coins: 50000, earned: M.LEVELS[3].at, introSeen: true, paused: true });
fixture.progression.claimed = M.LEVELS.slice(0, 4).map(l => l.level);
fixture.progression.pending = [];
fixture.visitorTimer = fixture.shop.arrivalTimer = fixture.bigSpender.timer = 1e6;
if (visualOnly) {
  fixture.earned = M.LEVELS.at(-1).at; fixture.progression.claimed = M.LEVELS.map(l => l.level);
  fixture.paused = false; M.buyFoodTruck(fixture); M.placeIngredientOrder(fixture, {butter:4});
  M.updateKitchen(fixture,56,[]); fixture.kitchen.food.wedges=3; fixture.kitchen.displays=["wedges",null];
  fixture.shop.unlocked=true; fixture.paused=true;
}
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
    deviceScaleFactor: 1, reducedMotion: "reduce" });
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
    const token = await page.evaluate(() => { const n = (window.__cookingQAFrame ?? 0) + 1; window.__cookingQAFrame = n; requestAnimationFrame(() => window.__cookingQAFrameDone = n); return n; });
    await page.waitForFunction(n => window.__cookingQAFrameDone >= n && PumpkinVoxel.scene.renderStatus.calls > 0, token);
  };
  const click = async locator => {
    check(await locator.isVisible() && await locator.isEnabled(), "interaction target is available",
      await locator.getAttribute("data-cooking-action") || await locator.getAttribute("aria-label") || (await locator.textContent()).trim().slice(0, 45));
    await locator.click({ force: true });
  };
  const open = async tab => { await page.evaluate(tab => PumpkinVoxel.openCookingSheet(tab), tab); await frame(); };
  const advance = async seconds => page.evaluate(seconds => { const p = PumpkinVoxel; p.state().paused = false; p.advance(seconds); p.state().paused = true; }, seconds);
  const setLevel = async level => page.evaluate(level => { const p = PumpkinVoxel, s = p.state(); s.earned = p.rules.LEVELS[level - 1].at; s.progression.claimed = p.rules.LEVELS.slice(0, level).map(l => l.level); s.progression.pending = []; }, level);
  const snapshot = async name => { if (process.env.COOKING_QA_SKIP_SHOTS === "1") return; await frame(); await page.screenshot({ path: path.join(out, name + ".png") }); samples.push({ name, status: await page.evaluate(() => PumpkinVoxel.scene.cookingStatus), rendering: await page.evaluate(() => PumpkinVoxel.scene.renderStatus) }); write("progress.json"); };
  const layout = async label => {
    const result = await page.locator("#sheet").evaluate(host => {
      const controls = [...host.querySelectorAll("button,select,input,summary")].filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return { label: n.getAttribute("aria-label") || n.textContent.trim().slice(0, 45), x: r.x, right: r.right, w: r.width, h: r.height }; });
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, clipped: controls.filter(r => r.x < -.5 || r.right > innerWidth + .5), small: controls.filter(r => r.w < 43.5 || r.h < 43.5) };
    });
    check(!result.overflow && !result.clipped.length && !result.small.length, `${label}: menu fits with 44px touch targets`, result);
  };

  if (!visualOnly) {
  check(await page.evaluate(() => PumpkinVoxel.state().version === PumpkinVoxel.rules.STATE_VERSION && PumpkinVoxel.rules.STATE_VERSION === 12), "legacy-compatible state exposes additive cooking schema 12");
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; });
  await open("recipes");
  check(await page.locator('[data-cooking-action="purchase"]').isDisabled(), "level four previews the truck without permitting purchase");
  await setLevel(5); await open("recipes");
  check(await page.evaluate(() => !PumpkinVoxel.state().kitchen.purchased && PumpkinVoxel.state().coins === 50000), "reaching level five unlocks purchase without buying automatically");
  const purchaseCash = await page.evaluate(() => PumpkinVoxel.state().coins);
  await click(page.locator('[data-cooking-action="purchase"]'));
  check(await page.evaluate(cash => { const s = PumpkinVoxel.state(); return s.kitchen.purchased && s.coins === cash - PumpkinVoxel.rules.COOKING.price && s.kitchen.recipes.includes("wedges") && !PumpkinVoxel.rules.homeCookingAvailable(s); }, purchaseCash), "paid truck includes starter recipe and works without a home kitchen");
  check(await page.locator('[data-cooking-research="soup"]').isDisabled(), "later recipes retain their own level gates");
  await open("deliveries");
  await page.locator('[data-cooking-order-quantity="butter"]').fill("4");
  await page.locator('[data-cooking-order-quantity="butter"]').press("Tab");
  const orderCash = await page.evaluate(() => PumpkinVoxel.state().coins);
  await click(page.locator('[data-cooking-action="order"]'));
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; });
  check(await page.evaluate(cash => { const s = PumpkinVoxel.state(), o = s.kitchen.orders[0]; return s.coins === cash - 18 && o?.items.butter === 4 && s.kitchen.pantry.butter === 0 && s.kitchen.ledger.ingredientSpend === 12 && s.kitchen.ledger.deliveryFees === 6; }, orderCash), "delivery payment includes ingredients and fee but credits no ingredients early");
  const packed = await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().kitchen.orders));
  await page.evaluate(() => PumpkinVoxel.advance(10));
  check(await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().kitchen.orders)) === packed, "tea break freezes the paid delivery timer");
  await advance(43); await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.focusCooking(); PumpkinVoxel.scene.refreshCooking(); }); await frame();
  check(await page.evaluate(() => PumpkinVoxel.state().kitchen.orders[0]?.phase === "travelling" && PumpkinVoxel.scene.cookingStatus?.cart?.visible), "paid order puts a visible cart on the north receiving road");
  await snapshot("desktop-truck-delivery");
  const truckPoint=await page.evaluate(()=>PumpkinVoxel.scene.project(42.75,1.9,4.1));
  await page.mouse.click(truckPoint.x,truckPoint.y);await frame();
  check(await page.locator('[data-cooking-state="owned"]').isVisible(),"tapping the physical food truck opens its contextual cooking sheet");
  await page.evaluate(()=>PumpkinVoxel.closeSheet());
  await advance(11); await frame();
  check(await page.evaluate(() => PumpkinVoxel.state().kitchen.orders[0]?.phase === "unloading"), "cart arrives before ingredients enter the pantry");
  await advance(7);
  check(await page.evaluate(() => PumpkinVoxel.state().kitchen.orders.length === 0 && PumpkinVoxel.state().kitchen.pantry.butter === 4), "unloading credits the complete paid parcel once");
  await advance(10);
  check(await page.evaluate(() => PumpkinVoxel.state().kitchen.pantry.butter === 4 && PumpkinVoxel.state().kitchen.delivered.length === 1), "completed delivery cannot credit again on subsequent ticks");

  // Verify cancellation through the actual menu, including its retained fee.
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; }); await open("deliveries");
  await page.locator('[data-cooking-order-quantity="butter"]').fill("1"); await page.locator('[data-cooking-order-quantity="butter"]').press("Tab");
  const cancelCash = await page.evaluate(() => PumpkinVoxel.state().coins);
  await click(page.locator('[data-cooking-action="order"]'));
  await click(page.locator('[data-cooking-order-cancel]').last());
  check(await page.evaluate(cash => PumpkinVoxel.state().coins === cash - 6 && PumpkinVoxel.state().kitchen.orders.length === 0, cancelCash), "cancelling before departure refunds ingredients and retains only the stated fee");

  await page.evaluate(() => { const p = PumpkinVoxel, s = p.state(); s.stock[0] = 4; p.rules.settleFresh(s); });
  await open("recipes"); await click(page.locator('[data-cooking-start="wedges"]'));
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; });
  check(await page.evaluate(() => { const s = PumpkinVoxel.state(); return !!s.kitchen.jobs.truck && s.kitchen.pantry.butter === 3 && s.stock[0] === 3 && s.kitchen.food.wedges === 0; }), "starting a real batch consumes butter and an unreserved pumpkin immediately");
  const cooking = await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().kitchen.jobs));
  await page.evaluate(() => PumpkinVoxel.advance(10));
  check(await page.evaluate(() => JSON.stringify(PumpkinVoxel.state().kitchen.jobs)) === cooking, "tea break also freezes cooking");
  await advance(31);
  check(await page.evaluate(() => !PumpkinVoxel.state().kitchen.jobs.truck && PumpkinVoxel.state().kitchen.food.wedges === 2 && PumpkinVoxel.state().kitchen.ledger.batchesCooked === 1), "completed batch produces its declared yield once");
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; }); await open("food");
  await page.locator('[data-cooking-display="0"]').selectOption("wedges");
  await page.locator('[data-cooking-price="wedges"]').selectOption("13");
  check(await page.evaluate(() => { const k = PumpkinVoxel.state().kitchen; return k.displays[0] === "wedges" && k.prices.wedges === 13; }), "food display and selling price are controlled through the player menu");
  await page.locator('[data-cooking-disclosure="accounts"] summary').click({ force: true });
  check((await page.locator('[data-cooking-disclosure="accounts"]').textContent()).includes("£24"), "kitchen accounts include ingredient cost and both delivery fees");

  for (const [label, width, height] of [["phone", 390, 844], ["phone-landscape", 844, 390], ["fold", 874, 787]]) {
    await page.setViewportSize({ width, height }); await open(label === "phone" ? "deliveries" : "food"); await layout(label);
    if (label !== "phone-landscape") await snapshot(label + "-cooking-menu");
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { const s = PumpkinVoxel.state(); s.shop.unlocked = true; s.paused = true; PumpkinVoxel.enterShop(); PumpkinVoxel.closeSheet(); }); await frame();
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "shop"), "shop scene still opens with finished food configured");
  await snapshot("desktop-shop-food-shelves");
  await page.evaluate(() => PumpkinVoxel.leavePlace());

  // This fixture supplies a hungry shopper with one finite £30 wallet. Its
  // browsing/queue/payment transitions still run through real updateShop.
  const beforeSale = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(); s.paused = true; s.stock = [0,0,0,0]; p.rules.settleFresh(s);
    s.shop.customers = [{id:400,slot:0,kind:0,budget:30,originalBudget:30,basketLimit:3,preferred:[0],phase:"browsing",remaining:0,checkoutDuration:0,basket:[],spent:0,quantity:0,outcome:"shopping",needs:{hunger:100,thirst:50,happiness:80,value:1},wish:null}];
    s.shop.arrivalTimer = s.visitorTimer = s.bigSpender.timer = 1e6;
    return {cash:s.coins,food:s.kitchen.food.wedges,income:s.kitchen.ledger.foodIncome,sold:s.kitchen.ledger.foodSold,pumpkins:s.shop.income,tips:s.customerCare.tips.shop};
  });
  await advance(.2);
  check(await page.evaluate(() => { const s = PumpkinVoxel.state(), c = s.shop.customers[0]; return c?.food?.status === "held" && s.kitchen.foodHolds.length === 1 && s.kitchen.food.wedges === 2; }), "hungry customer reserves a real serving while queuing without debiting stock yet");
  // Posted prices may change after a quote; the queued guest keeps its price.
  await page.evaluate(() => { const p = PumpkinVoxel; p.state().paused = false; p.rules.setFoodPrice(p.state(),"wedges",14); p.state().paused = true; });
  await advance(12.1);
  check(await page.evaluate(before => { const s = PumpkinVoxel.state(), c = s.shop.customers.find(c=>c.id===400); return s.coins === before.cash+13 && s.kitchen.food.wedges===before.food-1 && s.kitchen.ledger.foodIncome===before.income+13 && s.kitchen.ledger.foodSold===before.sold+1 && s.shop.income===before.pumpkins && s.customerCare.tips.shop===before.tips && c?.budget===17 && c?.food?.status==="paid" && !s.kitchen.foodHolds.length; },beforeSale), "single finite-wallet checkout pays the locked food quote exactly once and keeps pumpkin/tip ledgers separate");
  await advance(20);
  check(await page.evaluate(before => PumpkinVoxel.state().kitchen.ledger.foodSold === before.sold+1 && PumpkinVoxel.state().coins === before.cash+13,beforeSale), "departed guest cannot pay a second time");

  // Home station requires actual purchased furniture in an actually open room.
  const homeResult = await page.evaluate(() => {
    const p=PumpkinVoxel,s=p.state(); s.paused=false;
    const before=s.coins, noRoom=p.rules.homeCookingAvailable(s);
    const a=p.rules.upgradeHouse(s),b=p.rules.upgradeHouse(s), noRange=p.rules.homeCookingAvailable(s);
    const bought=p.rules.buyDecor(s,"copper-range"), instance=p.rules.placeDecor(s,"copper-range","kitchen");
    s.stock[0]=3;p.rules.settleFresh(s);
    return {before,after:s.coins,noRoom,noRange,a,b,bought,instance,ready:p.rules.homeCookingAvailable(s)};
  });
  check(homeResult.a && homeResult.b && homeResult.bought && homeResult.instance && homeResult.ready && !homeResult.noRoom && !homeResult.noRange && homeResult.before-homeResult.after===17250,"home cooking requires both paid house expansion and a placed paid copper range",homeResult);
  await page.evaluate(() => { PumpkinVoxel.enterRoom("kitchen"); PumpkinVoxel.closeSheet(); }); await frame();
  const rangePoint=await page.evaluate(() => { const p=PumpkinVoxel,q=p.state().house.placed.find(q=>q.id==="copper-range"),f=p.rules.pieceFootprint(q);return p.scene.project(200+q.x+f.w/2,1,q.z+f.d/2); });
  await page.mouse.click(rangePoint.x,rangePoint.y); await frame();
  await click(page.locator('[data-tool="cook"]'));
  check(await page.locator('[data-cooking-station]').inputValue()==="home", "tapping the physical range exposes a compact Cook control for the home station");
  await click(page.locator('[data-cooking-start="wedges"][data-cooking-at="home"]'));
  check(await page.evaluate(()=>!!PumpkinVoxel.state().kitchen.jobs.home),"home cooker starts a batch from the same delivered pantry");
  await advance(31);
  check(await page.evaluate(()=>!PumpkinVoxel.state().kitchen.jobs.home&&PumpkinVoxel.state().kitchen.pantry.butter===2),"home batch consumes the shared pantry and finishes into shared food storage");
  await page.evaluate(()=>{PumpkinVoxel.closeSheet();PumpkinVoxel.leavePlace();PumpkinVoxel.state().paused=false;});
  await setLevel(9);await open("recipes");await page.locator('[data-cooking-disclosure="upgrades"] summary').click({force:true});
  check(await page.locator('[data-cooking-upgrade="chef"]').isDisabled(),"chef hire remains locked before level ten");
  await setLevel(10);await open("recipes");
  if(!await page.locator('[data-cooking-disclosure="upgrades"]').evaluate(n=>n.open))await page.locator('[data-cooking-disclosure="upgrades"] summary').click({force:true});
  const chefCash=await page.evaluate(()=>PumpkinVoxel.state().coins);
  await click(page.locator('[data-cooking-upgrade="chef"]'));
  await page.locator('[data-cooking-chef]').selectOption("wedges");
  check(await page.evaluate(cash=>PumpkinVoxel.state().coins===cash-7500&&PumpkinVoxel.state().kitchen.chefRecipe==="wedges",chefCash),"hiring the chef is a paid upgrade with an explicit selected recipe");
  const autoCash=await page.evaluate(()=>PumpkinVoxel.state().coins);
  await advance(100);
  check(await page.evaluate(cash=>{const s=PumpkinVoxel.state();return s.kitchen.pantry.butter===0&&!s.kitchen.jobs.truck&&s.coins===cash&&!s.kitchen.orders.length&&s.kitchen.ledger.batchesCooked===4;},autoCash),"chef cooks only supplied batches and stops without inventing inputs or ordering/spending automatically");

  const beforeReload=await page.evaluate(()=>{const p=PumpkinVoxel;p.state().paused=true;p.save();return JSON.stringify(p.rules.saveData(p.rules.restoreState(JSON.parse(JSON.stringify(p.rules.saveData(p.state()))))));});
  await page.reload();await page.waitForSelector("body[data-ready]");await page.evaluate(()=>PumpkinVoxel.intro?.skip());await frame();
  check(await page.evaluate(()=>JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())))===beforeReload,"save/reload preserves cooking inventories, recipe prices, chef and separate accounts without ghost holds");

  } else {
    const stateBefore=await page.evaluate(()=>JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())));
    await page.evaluate(()=>{PumpkinVoxel.closeSheet();PumpkinVoxel.scene.focusCooking();PumpkinVoxel.scene.refreshCooking();});await frame();
    const world=await page.evaluate(()=>PumpkinVoxel.scene.cookingStatus);
    check(world.purchased&&world.cart?.visible&&world.cart?.unloading,"final service area shows the purchased truck and unloading cart",world);
    await snapshot("desktop-truck-service-pad");
    const target=await page.evaluate(()=>PumpkinVoxel.scene.project(42.75,1.9,4.1));await page.mouse.click(target.x,target.y);await frame();
    check(await page.locator('[data-cooking-state="owned"]').isVisible(),"final terrain refinement retains the physical truck interaction");
    for(const[label,width,height]of(lightFinal?[["phone",390,844]]:[["phone",390,844],["fold",874,787]])){
      await page.setViewportSize({width,height});await open("deliveries");await layout(label);if(!lightFinal)await snapshot(label+"-delivery-menu");
      await page.evaluate(()=>{PumpkinVoxel.closeSheet();PumpkinVoxel.scene.focusCooking();});if(!lightFinal)await snapshot(label+"-truck-service-pad");
    }
    await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>{PumpkinVoxel.enterShop();PumpkinVoxel.closeSheet();});await frame();
    check(await page.evaluate(()=>PumpkinVoxel.scene.cookingStatus.displays.length===2),"both native food wall displays remain installed");
    if(!lightFinal)await snapshot("desktop-food-wall-displays");await page.evaluate(()=>PumpkinVoxel.leavePlace());
    check(await page.evaluate(()=>JSON.stringify(PumpkinVoxel.rules.saveData(PumpkinVoxel.state())))===stateBefore,"visual scene changes and terrain focus cannot alter saved stock, cash or delivery progress");
  }

  check(await page.locator("canvas").count() === 1, "one main WebGL canvas remains");
  check(externalRequests.length === 0, "standalone HTML fetches no external runtime assets", externalRequests);
  check(errors.length === 0, "no page or console errors", errors);
  passed = true;
} catch (error) {
  if (page) try { await page.screenshot({ path: path.join(out, "failure.png") }); } catch {}
  throw error;
} finally {
  fs.writeFileSync(path.join(out, "checks.json"), JSON.stringify({ ...meta, passed, checks, errors, externalRequests, samples,
    rendering: "Single Chromium/SwiftShader process; performance/DPR1, bloom/shadows/mist/lake lights off. Viewport checks do not prove physical Fold frame rate. Managed policy prevents direct file:// and native fullscreen." }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
