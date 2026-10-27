// Opens the built voxel reference in headless Chromium (software WebGL), plays a
// little and screenshots it at desktop and phone sizes.
//   node smoke.mjs [--shots dir]     set CHROMIUM_PATH to use a preinstalled browser
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const at = process.argv.indexOf("--shots"), shots = at >= 0 ? process.argv[at + 1] : null;
const file = process.env.GAME_URL || pathToFileURL(path.resolve("dist/pumpkin-patch-voxel.html")).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = false;
const check = (ok, label) => { console.log(`${ok ? "ok  " : "FAIL"} ${label}`); if (!ok) failed = true; };
for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: name !== "desktop" });
  page.setDefaultTimeout(120000);
  // Selection now opens the compact pad; the wheel reveals the retained advanced tools.
  const revealAdvancedFurniture = async () => {
    await page.locator("#furniture-pad [data-nudge]").first().waitFor({ state: "visible" });
    await page.locator("#furniture-wheel").click();
    await page.locator("#play-radial").waitFor({ state: "visible" });
    check(await page.locator('#play-radial [data-choice="details"]').isVisible(), `${name}: furniture wheel offers More controls`);
    await page.locator('#play-radial [data-choice="details"]').click();
    await page.locator("#play-radial").waitFor({ state: "hidden" });
    await page.locator("#piece-bar").waitFor({ state: "visible" });
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  if(process.env.SMOKE_LITE)await page.addInitScript(()=>localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs",JSON.stringify({glow:false,shadows:false,music:false})));
  await page.goto(file);
  await page.waitForSelector("body[data-ready]", { timeout: 120000 });
  // A new patch opens on the introduction, with the farm held still; Skip hands it back.
  check(await page.locator("#intro").isVisible() && await page.evaluate(() => PumpkinVoxel.intro.active && PumpkinVoxel.state().paused), `${name}: a new patch opens on the introduction`);
  await page.locator("[data-intro-next]").click();
  check((await page.locator(".intro-talk .intro-name").textContent()).includes("Natalie"), `${name}: Natalie speaks first`);
  await page.locator("[data-intro-skip]").click();
  check(!(await page.locator("#intro").isVisible()) && await page.evaluate(() => !PumpkinVoxel.intro.active && !PumpkinVoxel.state().paused && PumpkinVoxel.state().introSeen), `${name}: Skip hands the farm back`);
  check(await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === "sprites", null, { timeout: 120000 }).then(() => true, () => false), `${name}: characters drawn with the original sprites`);
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
    if (tab === "journal") { await page.locator('[data-tab="more"]').click(); await page.locator(`[data-more="${tab}"]`).click(); } else if (tab === "wardrobe") await page.locator('[data-tab="wardrobe"]').click(); else { await page.locator(`[data-tab="${tab}"]`).click(); await page.locator('[data-upgrade-section="farm"]').click(); }
    check(await page.locator("#sheet").isVisible() && (await page.locator("#sheet-body").textContent()).length > 40, `${name}: ${tab} opens`);
    if (shots && name === "desktop") await page.screenshot({ path: `${shots}/${name}-${tab}.png` });
  }
  await page.locator("#sheet-close").click();
  check(!(await page.locator("#sheet").isVisible()), `${name}: menu closes`);
  // Settings swaps the characters to voxel figures and back.
  await page.locator("#open-settings").click();
  await page.locator("#toggle-voxel-characters").click();
  const voxels = await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === "voxels", null, { timeout: 120000 }).then(() => true, () => false);
  await page.locator("#toggle-voxel-characters").click();
  check(voxels && await page.evaluate(() => PumpkinVoxel.scene.characterStyle) === "sprites", `${name}: voxel characters switch on and off`);
  await page.locator("#sheet-close").click();
  // Home now enters the private garden; the house still opens the existing parlour.
  await page.evaluate(() => { PumpkinVoxel.state().coins = 5000; });
  await page.locator('[data-tab="home"]').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "estate"), `${name}: home opens the separate garden`);
  await page.locator('[data-estate-control="inside"]').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.place?.kind === "room") && await page.locator("#place-bar").isVisible(), `${name}: home opens the parlour`);
  await page.locator("#place-decorate").click();
  await page.locator('[data-hometab="decorate"]').click();
  await page.locator('[data-decor="d01"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().house.placed.some((p) => p.id === "d01" && p.room === "parlour")), `${name}: a bought piece is placed in the room`);
  check(!(await page.locator("#sheet").isVisible()), `${name}: placing furniture reveals the room`);
  await revealAdvancedFurniture();
  await page.locator('[data-tool="more"]').click();
  await page.locator('[data-tool="flip"]').click();
  await page.locator('[data-tool="done"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().house.placed.find((p) => p.id === "d01").flip) && !(await page.locator("#piece-bar").isVisible()), `${name}: flip the piece and finish`);
  // Let the control adapter observe deselection before selecting this same instance again.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  // A tea table, and the candelabrum stood on it from its toolbar.
  await page.evaluate(() => { const s = PumpkinVoxel.state(); s.house.owned.push("f08"); s.house.placed.push({ instance: "smoke-tea", id: "f08", room: "parlour", x: 8, z: 4, flip: false, books: [] }); PumpkinVoxel.scene.refreshRoom(); PumpkinVoxel.tools.select(s.house.placed.find((p) => p.id === "d01").instance); });
  await revealAdvancedFurniture();
  await page.locator('[data-tool="ontop"]').click();
  check(await page.evaluate(() => PumpkinVoxel.state().house.placed.find((p) => p.id === "d01").on === "smoke-tea"), `${name}: a candelabrum stands on the tea table`);
  await page.locator('[data-tool="done"]').click();
  if (shots) await page.screenshot({ path: `${shots}/${name}-parlour.png` });
  // The shop: open it, step inside, and customers come in to browse.
  await page.evaluate(() => { PumpkinVoxel.state().stock = [4, 4, 0, 0]; });
  await page.locator('[data-tab="shop"]').click();
  await page.locator('[data-upgrade-section="shop"]').click();
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
  // Stock cap is a real gameplay gate, and buying storage releases it.
  await page.evaluate(() => { const s=PumpkinVoxel.state();s.paused=false;s.coins=10000;s.upgrades.storage=0;s.upgrades.cart=0;window.__barn=180+40*s.upgrades.plots+20*s.upgrades.yield;s.stock=[window.__barn,0,0,0];s.visitors=[];s.arriving=[];s.shop.customers=[];s.holds=[];s.visitorTimer=s.shop.arrivalTimer=1e6;for(const p of s.plots)Object.assign(p,{phase:"empty",progress:0});Object.assign(s.plots[0],{phase:"ready",progress:1,variety:0}); });
  await page.locator("#harvest-all").click();
  check(await page.evaluate(()=>PumpkinVoxel.state().plots[0].phase==="ready"&&PumpkinVoxel.state().stock[0]===window.__barn),`${name}: full storage keeps a ripe crop instead of paying overflow money`);
  await page.locator('[data-tab="shop"]').click();await page.locator('[data-upgrade-section="farm"]').click();await page.locator('[data-buy="storage"]').click();await page.locator("#sheet-close").click();await page.locator("#harvest-all").click();
  check(await page.evaluate(()=>PumpkinVoxel.state().upgrades.storage===1&&PumpkinVoxel.state().stock[0]>window.__barn),`${name}: paid barn expansion permits harvesting again`);
  await page.evaluate(()=>{const s=PumpkinVoxel.state();s.paused=true;s.visitors=Array.from({length:5},(_,i)=>({id:500+i,kind:5+i,age:1.6+i*.8,budget:40,basketLimit:1,preferred:[0],basket:[],amount:0,quantity:0,bought:null,outcome:"shopping",leaveAt:null,spot:0,needs:{thirst:50,hunger:40,happiness:80},festival:{done:true},hollowConsidered:true}));PumpkinVoxel.scene.focus(31,17,1.9);});
  await page.waitForFunction(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500&&v.sprite&&v.visible&&v.frames===4).length===5,null,{timeout:120000});
  const poses=await page.evaluate(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500).map(v=>v.frame));await page.evaluate(()=>PumpkinVoxel.state().visitors.forEach(v=>v.age+=.25));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  check(await page.evaluate(before=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500).every((v,i)=>v.frame!==before[i]),poses),`${name}: all five new visitors render and advance through walking frames`);
  if(shots)await page.screenshot({path:`${shots}/${name}-horror-visitors.png`});
  check(errors.length === 0, `${name}: no page errors${errors.length ? " — " + errors.join(" | ") : ""}`);
  await page.close();
}
await browser.close();
if (failed) process.exitCode = 1;
