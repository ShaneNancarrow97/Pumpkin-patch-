// The exact standalone game, real menu buttons, and one Chromium at a time.
// node tools/menu-item-qa.mjs [game.html] [output-dir]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { VILLAGE_DECOR } from '../src/content/village-decor.js';
import { QUEST_BY_ID } from '../src/content/village-quests.js';
import { VILLAGE_ITEM_ICONS, VILLAGE_ITEM_GRID } from '../src/content/village-item-icon-meta.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const filename=path.resolve(process.argv[2]??path.join(root,'dist/pumpkin-patch-voxel.html'));
const output=path.resolve(process.argv[3]??path.join(root,'docs/contractor-patches/menu-item-sprites/verification'));
await fs.mkdir(output,{recursive:true});
const html=await fs.readFile(filename),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixture=M.freshState();fixture.introSeen=true;fixture.paused=false;fixture.coins=20000;fixture.earned=M.LEVELS.at(-1).at;fixture.progression.claimed=M.LEVELS.map((_,i)=>i+1);fixture.progression.pending=[];fixture.visitorTimer=fixture.shop.arrivalTimer=1e6;
M.recordHomeActivity(fixture,'visit');M.inviteToVillage(fixture);M.finishTour(fixture);M.finishTalk(fixture,'invitation','rowan');M.finishTalk(fixture,'invitation','elowen');
// Declared review inventory, not a claim that this progress was earned in play.
fixture.village.unlocks=['gathering','stall','almanac'];
for(const id of ['rowan-1','rowan-stall','rowan-2','elowen-1'])fixture.village.quests[id]={step:QUEST_BY_ID[id].steps.length,base:null,done:true};
fixture.village.quests['elowen-2']={step:0,base:null,done:false};
for(const id of ['logs','stone','fibre','herbs'])fixture.village.materials[id]=32;
const native=VILLAGE_DECOR.filter(d=>!d.estate).map(d=>d.id);
for(const id of [...native,'lantern-post'])fixture.village.decor.owned[id]=1;
fixture.village.stall.rotation=2;fixture.village.stall.refreshIn=1e6;
const report={date:new Date().toISOString(),html:path.basename(filename),sha256:hash(html),bytes:html.length,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:{},
 scope:'Exact standalone HTML served on loopback. Declared high-level save with four gathered materials, completed Rowan unlocks, one active Elowen restoration and all eighteen native stored decorations. Actual visible UI buttons perform each purchase. Normal game rendering/settings for screenshots; muted audio only. Viewports emulate layouts, not physical Fold, Bluetooth or TV hardware. No gameplay/runtime source is modified.',
 fixture:{coins:fixture.coins,materials:fixture.village.materials,nativeDecor:native,stallRotation:2},checks:[],layouts:[],screenshots:[],errors:[],externalRequests:[]};
for(const file of ['src/ui/village-item-art.js','src/ui/village-item-markup.js','src/ui/village-chapters.js','src/ui/village-chapters.css','src/ui/village-decorate.js','src/ui/village-decorate.css','src/village-game.js','src/content/village-item-icon-meta.js','assets/menu-items/village-items.webp','tools/menu-item-qa.mjs'])report.sourceHashes[file]=hash(await fs.readFile(path.join(root,file)));
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,...(detail===undefined?{}:{detail})});console.log(`${pass?'PASS':'FAIL'} ${label}`);};
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const click=async selector=>{await page.locator(selector+':visible').first().click();};
const close=async()=>{if(await page.locator('#vg-panel').isVisible())await click('#vg-panel-close');};
const shot=async name=>{await settle();await page.screenshot({path:path.join(output,name+'.png'),timeout:120000});report.screenshots.push(name+'.png');console.log('SHOT '+name);};
const state=()=>page.evaluate(()=>{const s=PumpkinVoxel.state();return{coins:s.coins,materials:{...s.village.materials},effects:[...s.village.effects],decor:{...s.village.decor.owned},bought:{...s.village.stall.bought},earnings:s.earned};});
async function chapter(kind){
 if(await page.locator('#village-decorate').isVisible())await click('.vd-catalogue [data-vd-action="done"]');
 await close();
 if(['materials','journal','people'].includes(kind))await click(`.vg-dock [data-vg-page="${kind}"]`);
 else {await click('.vg-dock [data-vg-page="journal"]');await click(`#vg-panel-body [data-vg-page="${kind==='stall'?'upgrades':kind}"]`);if(kind==='stall')await click('#vg-panel-body [data-vg-page="stall"]');}
 await settle();
}
async function decorate(){await close();await click('#vg-decorate');await settle();}
async function layout(name){
 const result=await page.evaluate(()=>{
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.closest('[hidden]')&&el.getClientRects().length&&r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&s.display!=='none'&&s.visibility!=='hidden';};
  const buttons=[...document.querySelectorAll('#village-game button,#village-game summary')].filter(visible).map(el=>{const r=el.getBoundingClientRect();return{label:(el.getAttribute('aria-label')??el.textContent).trim().slice(0,65),w:r.width,h:r.height,font:parseFloat(getComputedStyle(el).fontSize)};});
  const panels=[...document.querySelectorAll('#vg-panel,.vd-catalogue,.vd-placement')].filter(visible).map(el=>{const r=el.getBoundingClientRect();return{id:el.id||el.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};});
  return{size:[innerWidth,innerHeight],horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,smallTargets:buttons.filter(b=>b.w<43.5||b.h<43.5),smallText:buttons.filter(b=>b.font<12),clipped:panels.filter(r=>r.x<-.5||r.y<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5||r.scrollWidth>r.clientWidth+1),panels};
 });report.layouts.push({name,...result});check(!result.horizontalOverflow&&!result.clipped.length,name+': no horizontal overflow or clipped panel',result.clipped);check(!result.smallTargets.length&&!result.smallText.length,name+': 44px controls and readable text',{targets:result.smallTargets,text:result.smallText});
}
async function icons(selector){return page.locator(selector).evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{id:el.dataset.villageItemIcon,w:r.width,h:r.height,background:s.backgroundImage.startsWith('url('),position:s.backgroundPosition,size:s.backgroundSize,hidden:el.getAttribute('aria-hidden'),pointer:s.pointerEvents};}));}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>{report.errors.push(e.message);console.error('PAGE',e.message);});page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{const u=r.url();if(!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'))report.externalRequests.push(u);});
 await page.addInitScript(data=>{const key='pumpkin-patch-voxel-reference-v1';localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key+'-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false}));},M.saveData(fixture));
 console.log('BOOT '+report.sha256);await page.goto(origin+'/game.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});
 await click('[data-tab="more"]');await click('[data-more="village"]');await settle();
 check(await page.evaluate(()=>PumpkinVoxel.village.active&&!PumpkinVoxel.village.status.touring),'Declared saved village opens through the actual More menu');
 const atlas=await page.evaluate(async({grid,entries})=>{
  const style=document.querySelector('style[data-village-item-art]');window.__menuItemStyle=style;window.__menuItemStyleText=style?.textContent;
  const url=getComputedStyle(document.documentElement).getPropertyValue('--village-item-atlas').trim().replace(/^url\(["']?|["']?\)$/g,'');const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const cells=[];
  for(const [id,c]of entries){const rgba=ctx.getImageData(c.column*grid.cell,c.row*grid.cell,grid.cell,grid.cell).data;let opaque=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>32)opaque++;cells.push({id,opaque});}
  return{width:img.width,height:img.height,cells,styleCount:document.querySelectorAll('style[data-village-item-art]').length,embedded:url.startsWith('data:')};
 },{grid:VILLAGE_ITEM_GRID,entries:Object.entries(VILLAGE_ITEM_ICONS)});report.atlas=atlas;
 check(atlas.embedded&&atlas.width===VILLAGE_ITEM_GRID.columns*VILLAGE_ITEM_GRID.cell&&atlas.height===VILLAGE_ITEM_GRID.rows*VILLAGE_ITEM_GRID.cell,'Embedded atlas decodes at the declared dimensions',atlas);
 check(atlas.cells.length===36&&atlas.cells.every(c=>c.opaque>150),'All 36 declared atlas cells contain visible artwork');
 await chapter('materials');report.materials=await icons('.vg-ch-material [data-village-item-icon]');check(report.materials.length===4&&report.materials.every(x=>x.w===48&&x.h===48&&x.background)&&['logs','stone','fibre','herbs'].every(id=>report.materials.some(x=>x.id===id)),'Four current satchel materials have their own 48px illustrations',report.materials);await layout('desktop-satchel');await shot('desktop-satchel');
 await chapter('upgrades');report.upgrades=await icons('.vg-ch-upgrade-head [data-village-item-icon]');check(report.upgrades.length===4&&report.upgrades.every(x=>x.w===60&&x.h===60&&x.background),'All four workshop cards display their own 60px illustration',report.upgrades);
 let before=await state();await click('[data-vg-upgrade="gathering-kit"]');let after=await state();report.upgradePurchase={before,after};check(after.coins===before.coins-200&&after.materials.logs===before.materials.logs-4&&after.materials.fibre===before.materials.fibre-4&&after.effects.filter(e=>e==='upgrade:gathering-kit').length===1,'One tap buys the gathering kit and charges its coins/materials exactly once');check(await page.locator('[data-vg-upgrade="gathering-kit"]').count()===0&&after.earnings===before.earnings,'Owned workshop upgrade removes its buy button without changing farm earnings');
 await chapter('stall');report.stall=await page.evaluate(()=>[...document.querySelectorAll('.vg-ch-product')].map(el=>({key:el.querySelector('[data-vg-buy]')?.dataset.vgBuy,native:[...el.querySelectorAll('[data-village-item-icon]')].map(x=>x.dataset.villageItemIcon),garden:!!el.querySelector('.garden-sprite'),home:!!el.querySelector('.decor-icon,.thumb,img,canvas,[class*="decor-"]'),text:el.textContent.trim().slice(0,100)})));
 check(report.stall.find(x=>x.key==='village:stool')?.native.includes('stool')&&report.stall.find(x=>x.key==='village:book-cart')?.native.includes('book-cart'),'Rowan’s native stool and book cart use their matching item artwork',report.stall);
 check(report.stall.find(x=>x.key==='village:lantern-post')?.garden&&!report.stall.find(x=>x.key==='village:lantern-post')?.native.length,'Existing garden item keeps its existing garden sprite');
 check(report.stall.some(x=>x.key.startsWith('home:')&&x.home&&!x.native.length),'Farmhouse stock keeps its existing home artwork');
 const price=await page.evaluate(()=>PumpkinVoxel.rules.stallStock(PumpkinVoxel.state()).find(i=>i.key==='village:stool').price);before=await state();await click('[data-vg-buy="village:stool"]');after=await state();report.decorPurchase={price,before,after};check(after.coins===before.coins-price&&after.decor.stool===before.decor.stool+1&&(after.bought['village:stool']??0)===(before.bought['village:stool']??0)+1,'One tap purchases exactly one native stool at its displayed price');
 await decorate();report.nativeDecor=await icons('.vd-piece [data-village-item-icon]');check(native.every(id=>report.nativeDecor.filter(x=>x.id===id).length===1)&&report.nativeDecor.length===18&&report.nativeDecor.every(x=>x.w===52&&x.h===52&&x.background),'All eighteen stored native pieces display their own 52px art in Decorate',report.nativeDecor);
 check(await page.locator('[data-vd-id="lantern-post"] .garden-sprite').count()===1,'Decorate also preserves existing garden art');
 for(const [name,width,height,kind]of [['phone',390,844,'upgrades'],['fold',864,756,'decorate'],['landscape',844,390,'stall']]){
  await page.setViewportSize({width,height});await settle();if(kind==='decorate'){if(!(await page.locator('#village-decorate').isVisible()))await decorate();}else await chapter(kind);await layout(name+'-'+kind);if(kind==='stall')await page.locator('#vg-panel-body').evaluate(el=>el.scrollTop=el.scrollHeight);await shot(name+'-'+kind);
  // Every new surface is checked at each compact size, not only the photographed one.
  for(const panel of ['materials','upgrades','journal','stall']){if(panel===kind)continue;await chapter(panel);await layout(name+'-'+panel);}
  if(kind!=='decorate'){await decorate();await layout(name+'-decorate');}
 }
 await page.setViewportSize({width:1280,height:800});await chapter('journal');await click('[data-quest-card="elowen-2"] .vg-ch-reward-fold summary');await page.locator('[data-quest-card="elowen-2"]').scrollIntoViewIfNeeded();
 report.questRequirements=await icons('[data-quest-card="elowen-2"] .vg-ch-requirements [data-village-item-icon]');report.questRewards=await icons('[data-quest-card="elowen-2"] .vg-ch-rewards [data-village-item-icon]');
 check(report.questRequirements.length===4&&report.questRequirements.every(x=>x.w===24&&x.h===24&&x.hidden==='true'&&x.pointer==='none'),'Quest material requirements retain readable labels with 24px decorative sprites',report.questRequirements);check(report.questRewards.some(x=>x.id==='moth-statue'&&x.w===24&&x.h===24),'The completion reward uses the matching 24px moth-statue chip',report.questRewards);await layout('desktop-quest-chips');await shot('desktop-quest-chips');
 await close();await click('#vg-home');await click('[data-tab="more"]');await click('[data-more="village"]');await chapter('materials');
 const stable=await page.evaluate(()=>({count:document.querySelectorAll('style[data-village-item-art]').length,same:document.querySelector('style[data-village-item-art]')===window.__menuItemStyle,sameText:document.querySelector('style[data-village-item-art]')?.textContent===window.__menuItemStyleText,inlineData:[...document.querySelectorAll('[data-village-item-icon]')].some(x=>x.outerHTML.includes('data:image'))}));
 check(stable.count===1&&stable.same&&stable.sameText&&!stable.inlineData,'Live redraws and leaving/re-entering keep exactly one shared atlas stylesheet',stable);
 check(!report.errors.length,'Menu art produces no page errors',report.errors);check(!report.externalRequests.length,'Standalone menus request no external assets',report.externalRequests);
}catch(error){report.errors.push(error.stack??String(error));console.error(error);if(page)await shot('menu-item-failure').catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(output,'menu-item-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,sha256:report.sha256}));if(!report.passed)process.exitCode=1;
