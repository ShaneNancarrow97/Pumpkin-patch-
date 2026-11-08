// The integrated offline game: saved Green restorations, real menu transactions,
// arranging, controller input, touch layouts and TV. One Chromium is reused.
// node tools/village-living-qa.mjs [game.html] [output-dir]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { NODES } from '../src/content/village.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.resolve(process.argv[2] ?? path.join(root, 'dist/pumpkin-patch-voxel.html'));
const output = path.resolve(process.argv[3] ?? path.join(root, 'docs/contractor-patches/mothlight-living-village/verification/game'));
await fs.mkdir(output, { recursive: true });
const html = await fs.readFile(filename), fixture = M.freshState();
fixture.introSeen = true; fixture.paused = false; fixture.coins = 6000; fixture.earned = M.LEVELS[2].at;
fixture.progression.claimed = [1, 2, 3]; fixture.progression.pending = []; fixture.visitorTimer = fixture.shop.arrivalTimer = 1e6;
M.recordHomeActivity(fixture, 'visit'); M.inviteToVillage(fixture); M.finishTour(fixture);
M.finishTalk(fixture, 'invitation', 'rowan'); M.finishTalk(fixture, 'invitation', 'elowen');
function gatherFixture(material, need) {
  for (let n = 0; fixture.village.materials[material] < need && n < 50; n++) {
    for (const node of NODES.filter(x => x.district === 'green' && x.material === material)) M.gatherNode(fixture, node.id);
    if (fixture.village.materials[material] < need) M.updateVillage(fixture, 240);
  }
  if (fixture.village.materials[material] < need) throw new Error(`Fixture could not gather ${need} ${material}`);
}
M.startQuest(fixture, 'rowan-1'); gatherFixture('logs', 4); gatherFixture('stone', 2); M.doHandOver(fixture, 'rowan', 'rowan-1');
M.startQuest(fixture, 'rowan-stall'); gatherFixture('fibre', 3);
for (const [material, need] of Object.entries(M.questStep(fixture, 'rowan-stall').cost)) gatherFixture(material, need);
M.doHandOver(fixture, 'rowan', 'rowan-stall'); M.doHandOver(fixture, 'rowan', 'rowan-stall');
M.startQuest(fixture, 'elowen-1'); for (const id of ['page-1', 'page-2', 'page-3']) M.findObject(fixture, id); M.finishTalk(fixture, 'elowen-1', 'elowen');
for (const material of ['logs', 'stone', 'fibre', 'herbs']) gatherFixture(material, 40);
const fixtureData = M.saveData(fixture), saveKey = 'pumpkin-patch-voxel-reference-v1';
const report = { date: new Date().toISOString(), html: path.basename(filename), sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length,
  scope: 'Full game in one Chromium/SwiftShader browser. A declared £6000 starting-savings fixture completes invitation, bench, stall and letter through real model rules before boot. All subsequent quest acceptance, journal deliveries, payments, purchases and decoration transactions use the visible UI. Ground placement uses the same world-pick callback as a tap. Resident routes are sampled through their real tick adapter. Layout and standard-pad emulation do not certify physical Fold, Bluetooth or TV hardware.',
  fixture: { coins: fixture.coins, earned: fixture.earned, materials: fixture.village.materials, completed: Object.keys(fixture.village.quests).filter(id => fixture.village.quests[id].done), almanac: M.almanacPage(fixture) }, checks: [], screenshots: [], layouts: [], errors: [], externalRequests: [] };
const check = (pass, label, detail) => { report.checks.push({ pass: !!pass, label, ...(detail === undefined ? {} : { detail }) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page;
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const click = async selector => { const item = page.locator(selector + ':visible').first(); await item.waitFor({ state: 'visible' }); await item.evaluate(el => { if (el.disabled) throw new Error(`Disabled: ${el.textContent}`); el.click(); }); };
const shot = async name => { const file = `${name}.png`; await page.screenshot({ path: path.join(output, file), timeout: 120000 }); report.screenshots.push(file); console.log(`SHOT ${file}`); };
const state = () => page.evaluate(() => { const p = PumpkinVoxel, s = p.state(); return { coins: s.coins, earned: s.earned, levelEarnings: p.rules.levelEarnings(s), village: JSON.parse(JSON.stringify(s.village)), status: p.village.status, decor: p.village.decorate.status, cap: p.rules.villageMaterialCapacity(s), almanac: p.rules.almanacPage(s) }; });
const closePanel = async () => { if (await page.locator('#vg-panel').isVisible()) await click('#vg-panel-close'); };
async function dialogue(label) {
  const result=await page.evaluate(()=>{const lines=[];for(let n=0;n<30;n++){const panel=document.getElementById('village-dialogue');if(panel.hidden)break;lines.push(panel.querySelector('.village-dialogue-line')?.textContent);const reply=panel.querySelector('.village-dialogue-replies:not([hidden]) .village-reply:not(:disabled)');(reply??panel.querySelector('[data-village-dialogue-next]'))?.click();}return{closed:document.getElementById('village-dialogue').hidden,lines};});
  check(result.closed, `${label}: dialogue finishes`,result.lines);
}
async function neighbour(id) { await closePanel(); await click('[data-vg-page="people"]'); await click(`[data-vg-meet="${id}"]`); }
async function accept(id, who) { await neighbour(who); await click(`[data-vg-start="${id}"]`); await dialogue(id); }
async function journal() { await closePanel(); await click('[data-vg-page="journal"]'); }
async function handover(id, who) { await click(`[data-quest-card="${id}"] [data-vg-handover="${who}"]`); }
async function ground(x, z) { await page.evaluate(({x,z}) => PumpkinVoxel.village.pick({ type: 'village-ground', point: { x, z } }), {x,z}); }
async function chooseStored(id) { await click('[data-vd-collection="stored"]'); await click(`[data-vd-id="${id}"]`); }
async function placeStored(id, x, z) {
  await chooseStored(id); await ground(x, z);
  const selected = (await state()).decor.selection; check(selected?.valid, `${id}: intended reading-nook position is clear`, selected);
  await click('.vd-placement [data-vd-action="confirm"]');
}
async function layout(name) {
  const result = await page.evaluate(() => {
    const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return !el.closest('[hidden]') && r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const targets = [...document.querySelectorAll('#village-game button,#village-dialogue button')].filter(visible).map(el => { const r = el.getBoundingClientRect(); return { name: (el.getAttribute('aria-label') ?? el.textContent).trim().slice(0,60), w:r.width, h:r.height, font:parseFloat(getComputedStyle(el).fontSize) }; });
    const panels = [...document.querySelectorAll('#vg-panel,.vd-catalogue,.vd-placement,#village-dialogue')].filter(visible).map(el => { const r=el.getBoundingClientRect(); return { id:el.id||el.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom }; });
    return { size:[innerWidth,innerHeight],tv:document.body.classList.contains('tv-mode'),overflow:document.documentElement.scrollWidth>innerWidth+1,smallTargets:targets.filter(b=>b.w<43.5||b.h<43.5),smallText:targets.filter(b=>b.font<12),clipped:panels.filter(r=>r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5) };
  });
  report.layouts.push({ name,...result }); check(!result.overflow && !result.clipped.length, `${name}: panel fits viewport`, result.clipped); check(!result.smallTargets.length && !result.smallText.length, `${name}: readable 44px controls`, {targets:result.smallTargets,text:result.smallText});
}
async function pad(button) {
  await page.evaluate(button => { const p=window.__villagePad; p.buttons[button]={pressed:true,value:1}; PumpkinVoxel.village.tick(.02); p.buttons[button]={pressed:false,value:0}; PumpkinVoxel.village.tick(.02); }, button);
}
try {
  browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium', headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  page = await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:'no-preference'}); page.setDefaultTimeout(10000);
  page.on('pageerror',e=>{report.errors.push(e.message);console.error('PAGE',e.message);}); page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('request',r=>{const u=r.url();if(!u.startsWith(origin)&&!u.startsWith('file:')&&!u.startsWith('blob:')&&!u.startsWith('data:'))report.externalRequests.push(u);});
  await page.addInitScript(({data,key})=>{
    if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key+'-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false,mist:false,lakeLights:false,frameRate:'30'}));}
    window.__villagePads=[];window.__villagePad={id:'DualSense Wireless Controller',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__villagePads});
  },{data:fixtureData,key:saveKey});
  console.log('BOOT '+report.sha256);await page.goto(origin+'/game.html',{waitUntil:'domcontentloaded',timeout:180000}); await page.waitForSelector('body[data-ready]',{timeout:180000});console.log('READY');
  const unrelated = await page.evaluate(()=>{const s=PumpkinVoxel.state();return {estate:s.estate,equipped:s.wardrobe.equipped,stock:s.stock,farmWork:s.farmWork,owned:[...s.wardrobe.owned]};});
  await click('[data-tab="more"]'); await click('[data-more="village"]'); await settle(); await page.evaluate(()=>PumpkinVoxel.scene.villageView.spritesReady);
  check((await state()).status.active && !(await state()).status.touring,'checkpoint enters the saved village without replaying the tour');
  await click('[data-vg-page="map"]');await click('[data-vg-focus="elowen-library"]');await settle();await shot('desktop-green-arrival');
  await accept('rowan-2','rowan'); await accept('elowen-2','elowen'); await click('[data-vg-track="elowen-2"]');
  check((await page.locator('#vg-objective').textContent()).includes('18 logs'),'Following a journal story updates the live objective');
  check(await page.locator('[data-quest-card="elowen-2"] .vg-ch-requirements li').count()===4,'Journal lists each required restoration material');
  await layout('desktop-journal'); await shot('desktop-journal-requirements');
  let before=await state(); await handover('rowan-2','rowan'); let after=await state();
  check(after.village.materials.logs<before.village.materials.logs && after.village.quests['elowen-2'].step===before.village.quests['elowen-2'].step,'Rowan journal handover consumes only its named quest materials');
  await handover('rowan-2','rowan'); await click('[data-quest-card="rowan-2"] [data-vg-meet="rowan"]'); await dialogue('Rowan restored workshop');
  check((await state()).village.built['rowan-workshop'] && (await state()).village.quests['rowan-2'].done,'Rowan workshop restoration completes through visible handovers and dialogue');
  await journal(); await handover('elowen-2','elowen'); before=await state(); await handover('elowen-2','elowen'); after=await state();
  check(after.coins===before.coins-450 && after.village.built['elowen-conservatory'],'Elowen payment consumes exactly £450 and raises the conservatory');
  await fs.writeFile(path.join(output,'checkpoint-restorations.json'),JSON.stringify(await page.evaluate(()=>PumpkinVoxel.rules.saveData(PumpkinVoxel.state())),null,2));
  await closePanel(); await page.evaluate(ids=>{for(const id of ids)if(PumpkinVoxel.rules.nodeReady(PumpkinVoxel.state(),id))PumpkinVoxel.village.pick({type:'village-node',id});}, ['logs-01','logs-02']); await journal(); await click('[data-vg-page="upgrades"]'); before=await state(); await click('[data-vg-upgrade="gathering-kit"]'); after=await state();
  check(after.coins===before.coins-200 && after.village.materials.logs===before.village.materials.logs-4 && after.village.materials.fibre===before.village.materials.fibre-4,'Workshop upgrade charges its exact displayed coins and materials');
  check(after.levelEarnings===before.levelEarnings && await page.locator('[data-vg-upgrade="gathering-kit"]').count()===0,'Owned upgrade cannot be bought twice and does not replace farm earnings');
  await click('[data-vg-page="stall"]'); const price=await page.evaluate(()=>PumpkinVoxel.rules.stallStock(PumpkinVoxel.state()).find(i=>i.key==='village:stool').price);
  before=await state(); await click('[data-vg-buy="village:stool"]'); after=await state(); check(after.coins===before.coins-price && after.village.decor.owned.stool===1,'Stall price button buys one stored stool');
  await click('[data-vg-decorate]'); await placeStored('stool',80.1,37.2);
  let stool=(await state()).village.decor.placed.find(p=>p.id==='stool'); const original={...stool};
  await click('[data-vd-collection="placed"]'); await click(`[data-vd-instance="${stool.instance}"]`); await ground(80.1,39.6); await page.keyboard.press('e');
  check((await state()).decor.selection.rotation===15,'Keyboard turns the held piece by one 15-degree step'); await click('.vd-placement [data-vd-action="confirm"]');
  check((await state()).village.decor.placed.find(p=>p.id==='stool').z===39.6,'Moving a placed piece confirms its new position');
  await click('.vd-catalogue [data-vd-action="done"]'); await journal(); await click('[data-vg-page="upgrades"]'); before=await state(); await click('[data-vg-upgrade="satchel-pockets"]'); after=await state();
  check(after.coins===before.coins-120 && after.cap===60,'Extra satchel pockets purchase raises capacity to 60'); const coinsAfterPurchase=after.coins;
  await closePanel(); await click('#vg-decorate'); await click('.vd-catalogue [data-vd-action="undo"]'); after=await state();
  check(after.coins===coinsAfterPurchase && after.cap===60 && after.village.decor.placed.find(p=>p.id==='stool').z===original.z,'Decor undo restores placement while preserving the intervening purchase and farm purse');
  await click('[data-vd-collection="placed"]'); stool=after.village.decor.placed.find(p=>p.id==='stool'); await click(`[data-vd-instance="${stool.instance}"]`); before=await state(); await ground(81.2,38); await click('.vd-placement [data-vd-action="cancel"]');
  check(JSON.stringify((await state()).village.decor)===JSON.stringify(before.village.decor),'Cancel discards a moved preview without changing saved decor');
  await click(`[data-vd-instance="${stool.instance}"]`); await click('.vd-placement [data-vd-action="store"]'); after=await state();
  check(after.village.decor.owned.stool===1 && !after.village.decor.placed.some(p=>p.id==='stool'),'Store returns the exact placed copy to the catalogue');
  await click('.vd-catalogue [data-vd-action="undo"]'); after=await state(); check(after.village.decor.owned.stool===0 && after.village.decor.placed.filter(p=>p.id==='stool').length===1,'Undo storage restores one copy without duplication');
  await placeStored('moth-lamp',74.4,36.9); await placeStored('reading-stand',74.1,33.9);
  await page.setViewportSize({width:900,height:840}); await settle(); await layout('fold-unfolded-decor'); await shot('fold-unfolded-reading-nook');
  await click('.vd-catalogue [data-vd-action="done"]'); await journal(); check((await state()).village.quests['elowen-2'].step===4,'Three real placed pieces satisfy the reading-nook quest');
  await click('[data-quest-card="elowen-2"] [data-vg-meet="elowen"]'); await dialogue('Elowen reading nook'); check((await state()).village.quests['elowen-2'].done,'Elowen conservatory chapter finishes through its journal talk action');
  for(const who of ['elowen','rowan']){await neighbour(who);await click(`[data-vg-chat="${who}"]`);await dialogue(`${who} almanac chat`);}
  await page.evaluate(()=>PumpkinVoxel.advance(.2)); await journal(); await click('[data-vg-page="almanac"]'); after=await state();
  check(after.almanac.find(d=>d.id==='chat')?.done,'Two visible conversations complete the almanac chat duty');
  check((await page.locator('#vg-panel-body').textContent()).includes('Complete · coins received'),'Almanac shows completed duty progress and automatic reward receipt');
  await layout('fold-unfolded-almanac'); await shot('fold-unfolded-almanac'); await closePanel();
  const residents=await page.evaluate(()=>{
    const v=PumpkinVoxel.scene.villageView,f=v.folk,before=f.diagnostics(),children=v.scene.children.length,frames={elowen:new Set(),rowan:new Set()};
    for(let i=0;i<240;i++){f.tick(.1,i*.1,v.camera,{paused:false,reducedMotion:false});for(const id of ['elowen','rowan']){const p=f.people.get(id);if(p.walking)frames[id].add(p.root.userData.frame);}}
    const moved=f.diagnostics(),e=f.people.get('elowen'),position=e.root.position.clone();f.mood('elowen','talk');for(let i=0;i<30;i++)f.tick(.1,24+i*.1,v.camera,{paused:false,reducedMotion:false});
    const stopped=e.root.position.equals(position);f.mood('elowen','idle');const still=e.root.position.clone();for(let i=0;i<10;i++)f.tick(.1,28+i*.1,v.camera,{reducedMotion:true});
    e.root.updateMatrixWorld(true);const proxy=e.hit.getWorldPosition(e.root.position.clone());
    return{before,moved,frames:Object.fromEntries(Object.entries(frames).map(([id,list])=>[id,[...list]])),stopped,reduced:e.root.position.equals(still),proxyFollows:Math.hypot(proxy.x-e.root.position.x,proxy.z-e.root.position.z)<.001,childrenBefore:children,childrenAfter:v.scene.children.length,atmosphere:v.atmosphereStats};
  }); report.residents=residents;
  check(Object.values(residents.frames).every(f=>f.length===4),'Resident routes use all four authored walking frames',residents.frames); check(residents.stopped&&residents.reduced&&residents.proxyFollows,'Conversations and reduced motion hold feet; pick proxy follows actual pose');
  check(residents.childrenBefore===residents.childrenAfter,'Resident ticks allocate no scene objects'); check(!!residents.atmosphere,'Integrated atmosphere reports its live state',residents.atmosphere);
  await page.setViewportSize({width:390,height:844});await settle();
  const touch=await page.evaluate(()=>{
    const game=PumpkinVoxel.village,v=PumpkinVoxel.scene.villageView,old={...game.status.position},camera=v.camera.position.clone();
    const send=(id,type,pointerId,dx=0,dy=0)=>{const el=document.getElementById(id),r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId,clientX:r.x+r.width/2+dx,clientY:r.y+r.height/2+dy}));};
    send('vg-stick-zone','pointerdown',31);send('vg-stick-zone','pointermove',31,26,-12);send('vg-look-zone','pointerdown',32);send('vg-look-zone','pointermove',32,-22,15);game.tick(.12);
    const both=document.querySelectorAll('.vg-thumb-zone.is-held').length,moved=Math.hypot(game.status.position.x-old.x,game.status.position.z-old.z)>0,looked=!v.camera.position.equals(camera);
    send('vg-look-zone','pointerup',32);const one=document.querySelectorAll('.vg-thumb-zone.is-held').length;send('vg-stick-zone','pointercancel',31);game.tick(.01);
    return{both,one,moved,looked,released:document.querySelectorAll('.vg-thumb-zone.is-held').length};
  });check(touch.both===2&&touch.one===1&&touch.released===0&&touch.moved&&touch.looked,'Fold cover: simultaneous movement and camera thumbs release independently',touch);
  await layout('fold-cover-green');await shot('fold-cover-green');
  await page.evaluate(()=>{__villagePads=[__villagePad];PumpkinVoxel.village.tick(.01);});check((await state()).status.input!=='pad','An idle connected DualSense leaves the touch interface visible');
  await pad(9);check((await state()).status.panel==='journal'&&(await state()).status.input==='pad','DualSense Options opens the journal and switches to controller controls');
  const focusBefore=await page.evaluate(()=>document.activeElement?.outerHTML);await pad(13);const focusAfter=await page.evaluate(()=>document.activeElement?.outerHTML);check(focusBefore!==focusAfter&&await page.locator('[data-pad-focus]').count()>0,'D-pad moves a visible focus ring through the journal');
  await page.locator('#vg-panel [data-vg-page="almanac"]').focus();await pad(0);check((await state()).status.panel==='almanac','Cross activates the focused Almanac action');await pad(1);check((await state()).status.panel===null&&(await state()).status.active,'Circle closes one panel and keeps the player in the village');
  await page.evaluate(()=>{__villagePads=[];dispatchEvent(new Event('gamepaddisconnected'));PumpkinVoxel.village.tick(.01);});
  await page.setViewportSize({width:844,height:390});await settle();await click('#vg-decorate');await chooseStored('lantern-post');await ground(25,45);await layout('fold-landscape-placement');await shot('fold-landscape-placement');await click('.vd-placement [data-vd-action="cancel"]');await click('.vd-catalogue [data-vd-action="done"]');
  await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>PumpkinVoxel.scene.villageView.cameraActions.focus(80,37,23));await settle();await shot('desktop-living-green');
  await page.evaluate(()=>PumpkinVoxel.village.enterHall('velvet-bat'));await settle();await neighbour('vesper');await shot('velvet-bat-welcome');await dialogue('Vesper welcome');await page.evaluate(()=>PumpkinVoxel.village.leaveHall());
  const saved=await state();await click('#vg-home');check(!(await state()).status.active,'Farm button leaves the edited village normally');
  check(await page.evaluate(expected=>{const s=PumpkinVoxel.state();const current={estate:s.estate,equipped:s.wardrobe.equipped,stock:s.stock,farmWork:s.farmWork};const {owned,...kept}=expected;return JSON.stringify(current)===JSON.stringify(kept)&&owned.every(id=>s.wardrobe.owned.includes(id));},unrelated),'Village chapter preserves unrelated farm stock, garden, equipped outfits and helping hands');
  await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key+'-prefs')||'{}');p.tvMode=true;localStorage.setItem(key+'-prefs',JSON.stringify(p));},saveKey);await page.setViewportSize({width:1920,height:1080});
  await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});after=await state();
  const durable=v=>JSON.stringify({quests:v.quests,claims:v.claims,built:v.built,effects:v.effects,owned:v.decor.owned,placed:v.decor.placed,almanac:v.almanac,stats:v.stats});
  check(after.coins===saved.coins&&durable(after.village)===durable(saved.village),'Reload preserves exact coins, both restorations, upgrades, placed pieces and almanac receipts');
  await click('[data-tab="more"]');await click('[data-more="village"]');await settle();await page.evaluate(()=>{__villagePads=[__villagePad];PumpkinVoxel.village.tick(.01);});await pad(9);await layout('tv-journal');await shot('tv-journal');await pad(1);await page.evaluate(()=>PumpkinVoxel.scene.villageView.cameraActions.focus(80,37,25));await settle();await layout('tv-green');await shot('tv-living-green');
  check((await state()).coins===saved.coins,'Revisiting and reopening menus never repays the completed almanac duty');
  report.localFileCheck = 'Not run: managed Chrome policy blocks file URLs. This report verifies the identical self-contained HTML on loopback with zero external asset requests; opening the downloaded file on a physical device remains unverified.';
  check(!report.externalRequests.length,'Self-contained full game uses no external assets',report.externalRequests);check(!report.errors.length,'Integrated flow has no page or console errors',report.errors);
}catch(error){report.debug=page?await state().catch(()=>null):null;report.errors.push(error.stack??String(error));console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(output,'village-living-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,screenshots:report.screenshots.length,sha256:report.sha256}));if(!report.passed)process.exitCode=1;
