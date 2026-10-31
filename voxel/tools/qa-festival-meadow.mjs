import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const arg=(n,d)=>{let i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]};
const file=path.resolve(arg('--html','dist/pumpkin-patch-voxel.html')),out=path.resolve(arg('--shots','qa-festival-meadow'));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[],check=(ok,label,data)=>{checks.push({ok,label,data});console.log(`${ok?'ok':'FAIL'} ${label}`);if(!ok)throw Error(label)};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false}));});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready]');
 await page.locator('[data-tab="shop"]').click();await page.locator('[data-festival]').click();check(await page.locator('[data-festival-action="land"]').isDisabled(),'meadow unlock is gated on a fresh patch');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=1000;s.progression.claimed=[1,2,3,4];s.coins=2000;PumpkinVoxel.openSheet('festival')});
 await page.locator('[data-festival-action="land"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().festival.meadow)&&!await page.locator('#sheet').isVisible(),'land purchase opens the east gate and reveals the world');
 await page.screenshot({path:path.join(out,'desktop-prepared-meadow.png')});
 // Use the actual map hit target, through the renderer's projection and picking.
 const point=await page.evaluate(()=>PumpkinVoxel.scene.screenPoint(47,1.5,17.9));const canvas=await page.locator('#world').boundingBox();await page.mouse.click(canvas.x+point.x,canvas.y+point.y);
 await page.waitForSelector('[data-festival-action="upgrade"]');check(true,'prepared cocoa pitch is clickable on the map');
 check(await page.locator('[data-festival-action="upgrade"]').isDisabled(),'cocoa purchase stays locked below level 5');await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=2200;s.progression.claimed=[1,2,3,4,5];PumpkinVoxel.openSheet('festival')});await page.locator('[data-festival-action="upgrade"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.level===1),'building a stand changes the map and grants starter cups');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.stock=[40,30,20,10];s.visitorTimer=.1;s.visitorUpgrades.party=3});await page.evaluate(()=>PumpkinVoxel.advance(10));
 const touring=await page.evaluate(()=>PumpkinVoxel.state().visitors.filter(v=>v.festival&&!v.festival.done).map(v=>({id:v.id,phase:v.festival.phase,x:v.festival.x,z:v.festival.z})));check(touring.length>0,'visitors walk over to the physical stand',touring);
 await page.screenshot({path:path.join(out,'desktop-cocoa-cart.png')});
 await page.evaluate(()=>PumpkinVoxel.advance(45));check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.sold>0),'visitors pay for stocked cocoa before continuing to pumpkins');
 await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));await page.locator('[data-festival-tab="cocoa"]').click();await page.screenshot({path:path.join(out,'desktop-stand-management.png')});
 const before=await page.evaluate(()=>PumpkinVoxel.state().coins);await page.locator('[data-festival-action="restock"]').click();check(await page.evaluate(before=>PumpkinVoxel.state().coins<before,before),'restocking spends actual coins');
 await page.locator('[data-cocoa-price="3"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.price===3),'the posted cup price is selectable');
 await page.locator('[data-festival-action="open"]').click();check(await page.evaluate(()=>!PumpkinVoxel.state().festival.cocoa.open),'stand can be closed');await page.locator('[data-festival-action="open"]').click();
 for(const [label,width,height]of[['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{PumpkinVoxel.scene.fitView();PumpkinVoxel.openSheet('festival')});
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,small:[...document.querySelectorAll('#sheet button')].filter(e=>e.getClientRects().length).some(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9})}));check(layout.scroll<=width&&!layout.small,`${label}: management fits with 44px controls`,layout);
  await page.screenshot({path:path.join(out,`${label}-management.png`)});await page.locator('[data-festival-action="visit"]').click();await page.screenshot({path:path.join(out,`${label}-meadow.png`)});
 }
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=8500;s.progression.claimed=[1,2,3,4,5,6,7];s.coins=20000;PumpkinVoxel.openSheet('festival')});await page.locator('[data-festival-action="upgrade"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.level===2),'tier 2 rebuilds the kiosk');
 await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));await page.locator('[data-festival-action="courier"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.courier),'moth courier can be hired');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=42000;s.progression.claimed=[1,2,3,4,5,6,7,8,9,10];PumpkinVoxel.openSheet('festival')});await page.locator('[data-festival-action="upgrade"]').click();await page.screenshot({path:path.join(out,'desktop-midnight-pavilion.png')});
 check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.level===3),'tier 3 grows into the pavilion');
 await page.locator('#open-settings').click();await page.locator('#copy-backup').click();await page.locator('#sheet-close').click();await page.waitForTimeout(5500);await page.reload();await page.waitForSelector('body[data-ready]');
 check(await page.evaluate(()=>{const f=PumpkinVoxel.state().festival;return f.meadow&&f.cocoa.level===3&&f.cocoa.courier&&f.cocoa.sold>0}),'save/reload keeps land, stand, courier and sales');
 check(errors.length===0,'no page or console errors');
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'SwiftShader with bloom and shadows off for content QA'},null,2));await browser.close();await new Promise(r=>server.close(r))}
