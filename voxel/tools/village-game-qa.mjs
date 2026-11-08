// Review the real farm → Mothlight → farm journey in one Chromium instance.
// The starting save is a declared level-three fixture. Once travelling, all
// rewards, materials, unlocks and purchases come through shipped game actions.
//   node tools/village-game-qa.mjs [file.html] [output-dir]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { chromium } from "playwright";
import * as M from "../src/model.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const filename=path.resolve(process.argv[2]??path.join(root,"dist/pumpkin-patch-voxel.html"));
const output=path.resolve(process.argv[3]??path.join(root,"docs/contractor-patches/village-design-and-cast/verification/game"));
await fs.mkdir(output,{recursive:true});
const html=await fs.readFile(filename),fixture=M.freshState();
fixture.introSeen=true;fixture.paused=false;fixture.coins=500;fixture.earned=M.LEVELS[2].at;
fixture.progression.claimed=[1,2,3];fixture.progression.pending=[];fixture.progression.homeActivities.visit=1;
fixture.visitorTimer=fixture.shop.arrivalTimer=1e6;
const fixtureData=M.saveData(fixture),gate=M.restoreState(fixtureData);gate.earned=M.LEVELS[3].at;
const report={html:path.basename(filename),date:new Date().toISOString(),sha256:createHash("sha256").update(html).digest("hex"),bytes:html.length,
 scope:"Real game HTML in Chromium/SwiftShader. The level-three save starts with £500 earned savings and a prior home visit. No progress or purse edits after travel. Conversations, quest acceptance, handovers and purchases use visible UI; gathering uses the same world-pick callback as a tap. Viewport emulation is not physical Fold/controller certification.",
 fixture:{earned:fixture.earned,coins:fixture.coins,level:M.patchLevel(fixture).level,priorHomeVisits:fixture.progression.homeActivities.visit},checks:[],screenshots:[],metrics:[],conversations:[],errors:[],externalRequests:[]};
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,...(detail===undefined?{}:{detail})});console.log(`${pass?"PASS":"FAIL"} ${label}`);};
check(M.patchLevel(gate).level===3&&M.patchLevel(gate).blocked,"level four requires the invitation even at its earned threshold");
const server=createServer((req,res)=>{if(req.url==="/favicon.ico"){res.statusCode=204;res.end();return;}res.setHeader("Content-Type","text/html");res.end(html);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const settle=async()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const shot=async name=>{const file=`game-${name}.png`;await page.screenshot({path:path.join(output,file),timeout:180000});report.screenshots.push(file);console.log(`SHOT ${file}`);};
const click=async selector=>{const item=page.locator(selector).first();await item.waitFor({state:"visible",timeout:20000});await item.evaluate(el=>{if(el.disabled)throw new Error(`Disabled: ${el.textContent}`);el.click();});};
const state=async()=>page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();return{coins:s.coins,earned:s.earned,level:p.rules.patchLevel(s).level,village:JSON.parse(JSON.stringify(s.village)),status:p.village.status,place:p.scene.place?.kind,gate:p.rules.homeRequirements(s,4)};});
async function dialogue(label){
 const choices=[];
 for(let n=0;n<20;n++){
  if(await page.locator("#village-dialogue").isHidden())break;
  const replies=page.locator("#village-dialogue .village-reply");
  if(await replies.first().isVisible().catch(()=>false)){
   const available=await replies.allTextContents();choices.push(available);await replies.first().evaluate(el=>el.click());
  }else await click("#village-dialogue [data-village-dialogue-next]");
 }
 check(await page.locator("#village-dialogue").isHidden(),`${label}: conversation reaches Done`,choices);report.conversations.push({label,choices});
}
async function neighbour(id){await click('[data-vg-page="people"]');await click(`[data-vg-meet="${id}"]`);}
async function startQuest(id){await neighbour("rowan");await click(`[data-vg-start="${id}"]`);await dialogue(id);await click("#vg-panel-close");}
async function gather(ids){await page.evaluate(ids=>{for(const id of ids)PumpkinVoxel.village.pick({type:"village-node",id});},ids);}
async function metrics(name){
 const value=await page.evaluate(()=>{
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0&&s.display!=="none"&&s.visibility!=="hidden";};
  const buttons=[...document.querySelectorAll("#village-game button,#village-dialogue button")].filter(visible).map(el=>{const r=el.getBoundingClientRect();return{label:(el.getAttribute("aria-label")??el.textContent).trim().slice(0,70),w:r.width,h:r.height,font:parseFloat(getComputedStyle(el).fontSize)};});
  return{viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,smallTargets:buttons.filter(b=>b.w<43.5||b.h<43.5),smallText:buttons.filter(b=>b.font<12)};
 });report.metrics.push({name,...value});check(!value.overflow,`${name}: no horizontal overflow`);check(!value.smallTargets.length,`${name}: controls meet 44px targets`,value.smallTargets);check(!value.smallText.length,`${name}: controls stay at least 12px`,value.smallText);
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:"reduce"});page.setDefaultTimeout(30000);
 page.on("pageerror",e=>report.errors.push(e.message));page.on("console",m=>{if(m.type()==="error")report.errors.push(m.text());});page.on("request",r=>{const u=r.url();if(!u.startsWith(origin)&&!u.startsWith("blob:")&&!u.startsWith("data:"))report.externalRequests.push(u);});
 await page.addInitScript(data=>{const key="pumpkin-patch-voxel-reference-v1";if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key+"-prefs",JSON.stringify({music:false,sound:false,mist:false,lakeLights:false}));}},fixtureData);
 await page.goto(origin+"/game.html",{waitUntil:"domcontentloaded",timeout:180000});await page.waitForSelector("body[data-ready]",{timeout:180000});await settle();
 check((await state()).level===3,"declared level-three save boots in the real farm");
 const unrelated=await page.evaluate(()=>{const s=PumpkinVoxel.state();return JSON.stringify({house:s.house,estate:s.estate,wardrobe:s.wardrobe,stock:s.stock,farmWork:s.farmWork});});
 await click('[data-tab="more"]');check(await page.locator('[data-more="village"]').isVisible(),"More contains a visible Mothlight journey");await click('[data-more="village"]');await settle();
 let s=await state();check(s.status.active&&s.place==="village"&&s.village.invited,"More enters the actual village and accepts Elowen's invitation");
 check(s.status.touring,"the first visit starts Elowen's tour");check(await page.locator('.npc-reward').isHidden(),"farm favour cards stay off the village playfield");await shot("desktop-first-tour");await click("#vg-tour-skip");await settle();
 s=await state();check(s.village.toured&&s.village.quests.invitation.step===1,"Skip tour completes the tour step through its visible control");
 await click("#vg-home");await click('[data-tab="more"]');await click('[data-more="homelife"]');await click('[data-life="goal"]');await settle();
 s=await state();check(s.status.active&&!s.status.touring&&s.village.quests.invitation.step===1,"the home-goal action returns to the saved village quest");
 await neighbour("rowan");await shot("desktop-rowan-introduction");await dialogue("Rowan invitation");check((await state()).village.quests.invitation.step===2,"Rowan's finished introduction advances the invitation");
 await neighbour("elowen");await dialogue("Elowen invitation");s=await state();
 check(s.village.quests.invitation.done&&s.village.unlocks.includes("gathering"),"meeting both neighbours unlocks gathering through the real invitation");check(s.coins===650,"invitation pays its once-only £150 reward",s.coins);check(s.gate.every(r=>r.met),"completed invitation satisfies the level-four home requirement");
 await startQuest("rowan-1");await gather(["logs-01","logs-02","stone-01"]);s=await state();
 check(s.village.materials.logs===4&&s.village.materials.stone===2&&s.village.quests["rowan-1"].step===2,"logs and stone gathering advances Loose Boards to its delivery");
 const gathered=s.village.stats.gathered;await gather(["logs-01"]);check((await state()).village.stats.gathered===gathered,"a freshly gathered node cannot pay out twice");
 await neighbour("rowan");await click('[data-vg-handover="rowan"]');s=await state();check(s.village.quests["rowan-1"].done&&s.village.effects.includes("bench")&&s.coins===710,"Rowan consumes the materials, repairs the bench and pays £60",s.coins);await click("#vg-panel-close");
 await startQuest("rowan-stall");await gather(["logs-03","logs-04","logs-05","stone-02","fibre-01","fibre-02","fibre-03"]);await neighbour("rowan");const beforeStallMaterials=(await state()).village.materials;await click('[data-vg-handover="rowan"]');
 s=await state();check(s.village.quests["rowan-stall"].step===2&&Object.entries({logs:6,stone:2,fibre:3}).every(([id,n])=>s.village.materials[id]===beforeStallMaterials[id]-n),"stall repair consumes six logs, two stone and three fibre",{before:beforeStallMaterials,after:s.village.materials,step:s.village.quests["rowan-stall"].step});
 await click('[data-vg-handover="rowan"]');s=await state();check(s.village.quests["rowan-stall"].done&&s.village.unlocks.includes("stall")&&s.coins===510,"the real £200 handover opens Rowan's stall",s.coins);await click("#vg-panel-close");
 await page.evaluate(()=>PumpkinVoxel.village.pick({type:"village-stall"}));
 const stock=await page.evaluate(()=>PumpkinVoxel.rules.stallStock(PumpkinVoxel.state()).find(i=>i.key==="village:stool"));await shot("desktop-rowan-stall");await click('[data-vg-buy="village:stool"]');s=await state();
 check(s.coins===510-stock.price&&s.village.decor.owned.stool===1&&s.village.stall.bought["village:stool"]===1,"one visible price click buys a stool and deducts its exact price",{price:stock.price,coins:s.coins});await click("#vg-panel-close");
 for(const id of ["velvet-bat","elowen-library","rowan-workshop"]){await page.evaluate(id=>PumpkinVoxel.village.enterHall(id),id);await settle();check((await state()).status.inside===id,`actual-game interior ${id} opens`);await shot(`inside-${id}`);await page.evaluate(()=>PumpkinVoxel.village.leaveHall());await settle();}
 for(const [name,width,height]of [["desktop",1280,800],["phone",390,844],["landscape",844,390],["fold",900,840]]){
  await page.setViewportSize({width,height});await settle();await metrics(name);await shot(`${name}-green`);await click('[data-vg-page="journal"]');await metrics(`${name}-journal`);await shot(`${name}-journal`);await click("#vg-panel-close");
 }
 const before=await state();await click("#vg-home");await settle();s=await state();check(!s.status.active&&s.place!=="village","Farm returns from Mothlight through its visible control");
 check(await page.evaluate(expected=>{const s=PumpkinVoxel.state();return JSON.stringify({house:s.house,estate:s.estate,wardrobe:s.wardrobe,stock:s.stock,farmWork:s.farmWork})===expected;},unrelated),"village travel preserves the fixture's house, garden, wardrobe, stock and helping hands");await shot("returned-farm");
 await page.reload({waitUntil:"domcontentloaded",timeout:180000});await page.waitForSelector("body[data-ready]",{timeout:180000});s=await state();
 const persist=v=>({invited:v.invited,toured:v.toured,visits:v.visits,quests:v.quests,claims:v.claims,unlocks:v.unlocks,effects:v.effects,built:v.built,materials:v.materials,owned:v.decor.owned,bought:v.stall.bought,stats:v.stats});
 check(s.coins===before.coins&&JSON.stringify(persist(s.village))===JSON.stringify(persist(before.village)),"reload preserves coins, completed quests, gathering, owned stool, purchase counts and reward claims");
 await click('[data-tab="more"]');await click('[data-more="village"]');await settle();s=await state();check(s.status.active&&!s.status.touring&&s.coins===before.coins,"revisiting Mothlight keeps the finished tour and does not repay its rewards");
 check(!report.externalRequests.length,"actual-game journey makes no external asset or font requests",report.externalRequests);check(!report.errors.length,"actual-game village flow has no page or console errors",report.errors);
}catch(error){report.errors.push(error.stack??String(error));console.error(error);if(page)await shot("failure").catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(output,"village-game-report.json"),JSON.stringify(report,null,2)+"\n");}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,screenshots:report.screenshots.length,sha256:report.sha256}));if(!report.passed)process.exitCode=1;
