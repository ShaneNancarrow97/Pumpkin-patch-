import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const file=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]||'qa-menu-cocoa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[],checks=[];let page;
function check(ok,label,data){checks.push({ok,label,data});console.log((ok?'ok ':'FAIL ')+label);if(!ok)throw Error(label);}
try{
 page=await browser.newPage({viewport:{width:874,height:787},deviceScaleFactor:2,hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false})));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('body[data-ready]');
 const tapHouse=async()=>{const p=await page.evaluate(()=>PumpkinVoxel.scene.screenPoint(6.5,3,6.4)),b=await page.locator('#world').boundingBox();await page.touchscreen.tap(b.x+p.x,b.y+p.y);};
 await tapHouse();await page.waitForSelector('.building-context:not([hidden])');
 check((await page.locator('.building-context').textContent()).includes('Purchase unlocks at patch level 6'),'fresh unpurchased house opens its level-gated card on touch');
 const time=await page.evaluate(()=>PumpkinVoxel.state().time);await page.waitForFunction(t=>PumpkinVoxel.state().time>t,time,{timeout:120000});check(await page.evaluate(t=>PumpkinVoxel.state().time>t,time),'simulation continues after selecting the unpurchased house');
 await page.locator('[data-hollow-context="manage"]').click();check(await page.locator('[data-hollow-action="purchase"]').isDisabled(),'Manage opens the locked purchase menu');
 await page.evaluate(()=>{PumpkinVoxel.closeSheet();const s=PumpkinVoxel.state();s.earned=2000000;s.progression.claimed=Array.from({length:20},(_,i)=>i+1);s.progression.pending=[];s.coins=100000;});
 await tapHouse();check((await page.locator('.building-context').textContent()).includes('A forgotten house'),'unowned eligible house opens without a scope error');
 await page.locator('[data-hollow-context="manage"]').click();check(await page.locator('[data-hollow-action="purchase"]').isEnabled(),'eligible player can purchase from the map menu');
 await page.evaluate(()=>{PumpkinVoxel.closeSheet();const s=PumpkinVoxel.state();s.festival.meadow=true;s.festival.cocoa.level=3;PumpkinVoxel.openSheet('festival');});
 await page.locator('[data-festival-tab="cocoa"]').click();
 const icons=await page.locator('.cocoa-art').evaluateAll(async els=>Promise.all(els.map(async e=>{const style=getComputedStyle(e),r=e.getBoundingClientRect(),url=style.backgroundImage.slice(5,-2),img=new Image();img.src=url;await img.decode();return {w:r.width,h:r.height,loaded:img.naturalWidth>0,size:style.backgroundSize,position:style.backgroundPosition};})));
 check(icons.length>=5&&icons.every(i=>i.loaded&&Math.abs(i.w-56)<.1&&Math.abs(i.h-56)<.1&&i.size==='300% 200%'),'cocoa item atlas loads and every product thumbnail has visible dimensions',icons);
 await page.screenshot({path:path.join(out,'fold-cocoa-menu.png')});
 await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'cocoa menu fits a narrow phone');
 check(!errors.length,'no runtime errors',errors);
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors},null,2));await browser.close();await new Promise(r=>server.close(r));}
