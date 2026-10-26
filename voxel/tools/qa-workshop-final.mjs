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
seed.wardrobe.equipped.natalie="natalie-wheelchair";
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
    localStorage.setItem(key + "-prefs", JSON.stringify({ renderQuality: "performance", voxelCharacters: true, glow: false, shadows: false, mist: false, lakeLights: false, music: false, sound: false, mazeSound: false, hayrideSound: false }));
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

  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();s.paused=false;p.rules.buyFoodTruck(s);p.rules.upgradeHouse(s);p.rules.upgradeHouse(s);for(const id of ['kitchen-hob','kitchen-oven','kitchen-pot-rail','kitchen-pan-rail','kitchen-baking-rack','kitchen-spice-shelf'])p.rules.buyCookingEquipment(s,id);p.rules.wearCostume(s,'natalie-wheelchair');p.scene.refreshLooks();p.scene.refreshCooking();s.kitchen.diners=[{id:'qa-ghost',kind:0,seat:'a-left',phase:'eating',distance:0,remaining:50},{id:'qa-duke',kind:11,seat:'b-left',phase:'eating',distance:0,remaining:50}];s.paused=true;p.closeSheet();p.scene.focus(47,5,2.4);});await frame();
  check(await page.evaluate(()=>PumpkinVoxel.scene.cookingStatus.maisieVisible),'Maisie is present at the truck');
  check(await page.evaluate(()=>{const d=PumpkinVoxel.scene.cookingStatus.diners;return d.length===2&&d.every(p=>p.seated)}),'original and VIP seated art renders at two benches');await shot('final-maisie-truck-and-diners');
  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();s.kitchen.diners=[];s.paused=false;p.rules.buyVisitorEventUpgrade(s,'vip');s.visitorEvents.vip.remaining=0;p.advance(1);s.paused=true;});await frame();
  const a=await page.evaluate(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.kind>=11));
  check(a.length>=3&&a.every(v=>v.sprite&&v.frames===4),'four-frame courtier walking models are installed');
  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();s.paused=false;p.advance(.3);s.paused=true;const v=p.scene.visitorStatus.find(v=>v.kind>=11);if(v)p.scene.focus(v.x,v.z,3.2)});await frame();
  const b=await page.evaluate(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.kind>=11));check(a.some(v=>b.find(n=>n.id===v.id)?.frame!==v.frame),'VIP walk cycle advances between opposite-leg frames');await shot('final-vip-walk');
  await page.evaluate(()=>{PumpkinVoxel.enterRoom('kitchen');PumpkinVoxel.closeSheet();});await frame();await shot('final-purple-wheelchair-kitchen');
  for(const [name,w,h] of [['phone',390,844],['fold',874,787]]){await page.setViewportSize({width:w,height:h});await open('mix','home');await layout(name);await shot('final-'+name+'-mix');}
  check(!errors.length,'final artifact has no browser errors',errors);check(!externalRequests.length,'all final assets are embedded',externalRequests);passed=true;
} catch(e){meta.failure=String(e);console.error(e.stack||e);} finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({...meta,passed,checks,errors,externalRequests,screenshots},null,2));await browser.close();await new Promise(r=>server.close(r));}if(!passed)process.exitCode=1;
