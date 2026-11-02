#!/usr/bin/env node
// Actual offline Three.js game, not the receipt lab. Navigation only: no purchases.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Mothlight-Full-Game.html');
const out=path.resolve(process.argv[3]??path.join(pack,'verification/browser'));
fs.mkdirSync(out,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[],errors=[],externalRequests=[],screenshots=[];
const bytes=fs.readFileSync(html);
const report={htmlSHA256:sha(bytes),htmlBytes:bytes.length,scope:'Actual offline voxel game; theme and existing menu navigation on software WebGL. Exact embedded HTML served over loopback because managed Chromium blocks file URLs. Reduced-effects QA preferences only. No physical Fold, Bluetooth, ride or full-economy claim.',qaSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),passed:false,checks,errors,externalRequests,screenshots};
const write=()=>fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2)+'\n');
function check(ok,label,data){checks.push({ok:!!ok,label,...(data===undefined?{}:{data})});write();console.log((ok?'ok  ':'FAIL ')+label);if(!ok)throw Error(label+': '+JSON.stringify(data));}
let browser,page,server;
const visible=selector=>page.locator(selector).isVisible();
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});screenshots.push(name+'.png');write();}
async function money(){return page.evaluate(()=>({coins:PumpkinVoxel.state().coins,earned:PumpkinVoxel.state().earned}));}
async function surface(selector,label){
 const data=await page.locator(selector).evaluate(e=>{
  const r=e.getBoundingClientRect(),style=getComputedStyle(e);
  const rgb=value=>value.startsWith('#')&&value.length===7?[parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)]:value.match(/[\d.]+/g)?.map(Number);
  const lum=value=>{const c=rgb(value);return c?.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);};
  const title=e.querySelector('#sheet-title,.manage-menu-heading b')??e;
  const controls=[...e.querySelectorAll('button')].filter(b=>!b.disabled&&(b.checkVisibility?b.checkVisibility():!!b.getClientRects().length)).map(b=>({text:(b.getAttribute('aria-label')??b.textContent).trim().slice(0,45),...b.getBoundingClientRect().toJSON()})).filter(b=>b.bottom>=r.top&&b.top<=r.bottom);
  const paperColors=[style.backgroundColor,...style.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(value=>typeof value==='string'?value:value[0]).filter(value=>(rgb(value)?.[3]??1)>=.99);
  const purple=paperColors.length>0&&paperColors.every(value=>{const [r,g,b]=rgb(value);return r>g+5&&b>g+6&&lum(value)>.012&&lum(value)<.15;});
  const paperBase=(rgb(style.backgroundColor)?.[3]??1)>=.99?style.backgroundColor:style.getPropertyValue('--panel').trim();
  const baseLum=lum(paperBase),text=[...e.querySelectorAll('#sheet-title,h3,p,.manage-menu-heading b,button b,button small')].filter(node=>(node.checkVisibility?node.checkVisibility():!!node.getClientRects().length)&&!node.closest('button:disabled,.purchase-button,button.gold')).map(node=>{const color=getComputedStyle(node).color,ink=lum(color);return {text:node.textContent.trim().slice(0,45),color,contrast:(Math.max(ink,baseLum)+.05)/(Math.min(ink,baseLum)+.05)};});
  return {rect:r.toJSON(),width:innerWidth,height:innerHeight,paper:style.backgroundColor,background:style.backgroundImage,paperColors,purple,colorScheme:style.colorScheme,paperBase,text,titleInk:getComputedStyle(title).color,controls,small:controls.filter(b=>b.width<43.5||b.height<43.5),horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 check(data.rect.width>0&&data.rect.height>0&&data.rect.left>=-1&&data.rect.right<=data.width+1&&data.rect.top>=-1&&data.rect.bottom<=data.height+1&&!data.horizontalOverflow,label+': panel fits the viewport without horizontal scrolling',data);
 check(!data.small.length,label+': visible enabled buttons retain comfortable44px targets',data.small);
 check(data.purple&&data.colorScheme.includes('dark'),label+': actual menu surface keeps purple parchment and the dark color scheme',{paper:data.paper,background:data.background,paperColors:data.paperColors,colorScheme:data.colorScheme});
 check(data.text.length>=2&&data.text.every(sample=>sample.contrast>=4.5),label+': normal labels contrast at least4.5:1 against the declared purple paper base',{basis:'Computed text versus declared solid paper base; gradients are not sampled per pixel and purchase controls use separate amber surfaces.',paperBase:data.paperBase,samples:data.text});
 return data;
}
async function closeSheet(){if(await visible('#sheet'))await page.locator('#sheet-close').click();}
async function closedWorld(label){
 await closeSheet();
 const data=await page.evaluate(()=>{
  const canvas=document.querySelector('#world'),r=canvas.getBoundingClientRect();
  const targets=[document.querySelector('#open-settings'),...document.querySelectorAll('#dock button')].filter(Boolean).filter(e=>e.checkVisibility?e.checkVisibility():!!e.getClientRects().length);
  const blocked=targets.filter(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !hit||!e.contains(hit);}).map(e=>e.id||e.dataset.tab);
  return {canvas:{width:r.width,height:r.height,display:getComputedStyle(canvas).display},blocked,sheetHidden:document.querySelector('#sheet').hidden,manageHidden:document.querySelector('#upgrade-menu').hidden,overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 check(data.canvas.width>100&&data.canvas.height>100&&data.canvas.display!=='none'&&data.sheetHidden&&data.manageHidden&&!data.blocked.length&&!data.overflow,label+': farm canvas, HUD and dock are unobstructed after closing menus',data);
}

try{
 server=http.createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}response.setHeader('Content-Type','text/html');response.end(bytes);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:'reduce'});
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))externalRequests.push(r.url());});
 await page.route('**/*',route=>[origin,'data:','blob:'].some(prefix=>route.request().url().startsWith(prefix))?route.continue():route.abort());
 // These are the existing smoke test's documented lighter preferences, not a
 // modified game save or a change to the delivered game's default quality.
 await page.addInitScript(()=>localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false})));
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForSelector('body[data-ready]',{timeout:120000});
 check(await page.evaluate(()=>!!window.PumpkinVoxel&&typeof FestivalBridgeLab==='undefined'&&document.body.classList.contains('mothlight-game')),'The real voxel game boots with the optional ledger theme and no receipt-lab runtime');
 if(await visible('#intro'))await page.locator('[data-intro-skip]').click();
 await page.waitForFunction(()=>PumpkinVoxel.scene.characterStyle==='sprites',null,{timeout:120000});
 check(await page.evaluate(()=>!PumpkinVoxel.intro.active&&PumpkinVoxel.state().introSeen&&PumpkinVoxel.scene.characterStyle==='sprites'),'The existing introduction hands control back to the sprite-based farm');
 const initialMoney=await money();
 for(const [name,width,height]of [['desktop',1280,800],['fold',874,787],['phone',390,844]]){
  await page.setViewportSize({width,height});
  await closedWorld(name+' initial');
  if(name==='desktop'||name==='phone')await shot(name+'-farm');
  await page.locator('[data-tab="shop"]').click();
  await page.locator('#upgrade-menu').waitFor({state:'visible'});
  await surface('#upgrade-menu',name+' Manage');
  if(name==='desktop'||name==='phone')await shot(name+'-manage');
  await page.locator('[data-upgrade-section="farm"]').click();
  await page.locator('#sheet').waitFor({state:'visible'});
  check((await page.locator('#sheet-body').textContent()).length>40,name+': existing farm upgrade content opens');
  await surface('#sheet .sheet-frame',name+' Farm upgrades');
  if(name==='desktop'){
   const edge=()=>page.locator('#sheet .sheet-frame').evaluate(e=>{const style=getComputedStyle(e,'::before');return {animation:style.animationName,duration:style.animationDuration,pointerEvents:style.pointerEvents,background:style.backgroundImage};});
   let decor=await edge();check(decor.animation==='none'&&decor.pointerEvents==='none','Reduced motion keeps the sparkling page edge static and noninteractive',decor);
   await page.emulateMedia({reducedMotion:'no-preference'});decor=await edge();
   check(decor.animation==='mothlight-foil'&&decor.duration==='6s'&&decor.pointerEvents==='none'&&decor.background.includes('radial-gradient'),'Normal motion adds only the restrained six-second sparkling page edge',decor);
   await page.emulateMedia({reducedMotion:'reduce'});decor=await edge();check(decor.animation==='none','Restoring reduced motion stops the page-edge twinkle');
  }
  await shot(name+'-farm-upgrades');
  await closeSheet();
  await page.locator('[data-tab="wardrobe"]').click();
  await page.locator('#sheet').waitFor({state:'visible'});
  check((await page.locator('#sheet-body').textContent()).length>40,name+': existing wardrobe opens');
  await surface('#sheet .sheet-frame',name+' Wardrobe');
  if(name==='desktop')await shot(name+'-wardrobe');
  await closeSheet();
  await page.locator('#open-settings').click();
  await page.locator('#sheet').waitFor({state:'visible'});
  check((await page.locator('#sheet-body').textContent()).length>40,name+': existing settings open');
  await surface('#sheet .sheet-frame',name+' Settings');
  if(name==='phone')await shot(name+'-settings');
  await closeSheet();
  // Official existing diagnostic API opens the actual Home sheet without
  // requiring a scene rebuild or granting any house upgrade in this UI pass.
  await page.evaluate(()=>PumpkinVoxel.openSheet('home'));
  await surface('#sheet .sheet-frame',name+' Home sheet');
  await closeSheet();
  await closedWorld(name+' final');
  check(JSON.stringify(await money())===JSON.stringify(initialMoney),name+': menu navigation does not charge coins or change earned income');
 }
 await page.evaluate(()=>PumpkinVoxel.save());
 check(await page.evaluate(()=>{const raw=JSON.parse(localStorage.getItem('pumpkin-patch-voxel-reference-v1'));return raw?.version===14&&raw.coins===PumpkinVoxel.state().coins;}),'Existing save key and version14 serializer still record the real game state');
 check(errors.length===0&&externalRequests.length===0,'Full offline game menu pass has no JavaScript errors or external requests',{errors,externalRequests});
 report.passed=true;
}catch(error){report.failure=String(error);console.error(error.stack??error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{write();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
if(!report.passed)process.exitCode=1;
