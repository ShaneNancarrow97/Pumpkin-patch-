import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const arg=(n,d)=>{let i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]},file=path.resolve(arg('--html','dist/pumpkin-patch-voxel.html')),out=path.resolve(arg('--shots','qa-sandy'));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[],check=(ok,label,data)=>{checks.push({ok,label,data});console.log(`${ok?'ok':'FAIL'} ${label}`);if(!ok)throw Error(label)};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false})));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready]');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.coins=10000;s.earned=1000;s.progression.claimed=[1,2,3,4];s.progression.pending=[];s.visitorTimer=s.shop.arrivalTimer=1e6;PumpkinVoxel.openSheet('festival')});
 await page.locator('[data-festival-action="land"]').click();await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));
 check(await page.locator('[data-festival-action="upgrade"]').isDisabled(),'cocoa purchase is locked at level 4');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=2200;s.progression.claimed=[1,2,3,4,5];PumpkinVoxel.openSheet('festival')});
 check(await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.level===0)&&!await page.locator('[data-festival-action="upgrade"]').isDisabled(),'level 5 unlocks purchase without automatically building');
 const coins=await page.evaluate(()=>PumpkinVoxel.state().coins);await page.locator('[data-festival-action="upgrade"]').click();check(await page.evaluate(c=>{const s=PumpkinVoxel.state();return s.festival.cocoa.level===1&&s.coins===c-650},coins),'building requires the separate £650 purchase');
 await page.waitForFunction(()=>PumpkinVoxel.scene.festivalStatus.ready);check(await page.evaluate(()=>PumpkinVoxel.scene.festivalStatus.cashier),'Sandy is loaded and serving in the actual world');
 await page.screenshot({path:path.join(out,'desktop-sandy-cart.png')});
 const signPoint=await page.evaluate(()=>PumpkinVoxel.scene.screenPoint(47,4.45,19.55));const signCanvas=await page.locator('#world').boundingBox();await page.mouse.click(signCanvas.x+signPoint.x,signCanvas.y+signPoint.y);check(await page.locator('#sheet-title').textContent()==='Sandy’s Haunted Cocoa','actual voxel sign opens the actual stand menu');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=4500;s.progression.claimed=[1,2,3,4,5,6];PumpkinVoxel.openSheet('festival')});await page.locator('[data-festival-action="upgrade"]').click();
 await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));await page.locator('[data-special-stock="flake"]').click();await page.locator('[data-special-stock="deluxe"]').click();await page.locator('[data-special-price="flake"]').selectOption('9');
 check(await page.evaluate(()=>{const c=PumpkinVoxel.state().festival.cocoa;return c.extras.flake.stock===10&&c.extras.deluxe.stock===10&&c.prices.flake===9}),'tier 2 offers paid flake/ghost stock and editable prices');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=15000;s.progression.claimed=[1,2,3,4,5,6,7,8];s.progression.pending=[];s.coins=10000;PumpkinVoxel.openSheet('festival')});await page.locator('[data-festival-action="upgrade"]').click();
 await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));await page.locator('[data-special-stock="midnight"]').click();await page.locator('[data-special-stock="smores"]').click();await page.locator('[data-special-price="midnight"]').selectOption('10');
 check(await page.evaluate(()=>{const c=PumpkinVoxel.state().festival.cocoa;return c.level===3&&c.extras.smores.stock===10&&c.extras.midnight.stock===10&&c.prices.midnight===10}),'tier 3 unlocks sauce cocoa and s’mores with separate prices');
 await page.screenshot({path:path.join(out,'desktop-cocoa-menu.png')});
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.stock=[400,100,80,40];s.visitorUpgrades.party=3;s.visitorTimer=.1;PumpkinVoxel.closeSheet();PumpkinVoxel.advance(10)});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const point=await page.evaluate(()=>{const v=PumpkinVoxel.state().visitors.find(v=>v.festival&&!v.festival.done);if(!v)return null;const p=PumpkinVoxel.scene.screenPoint(v.festival.x,1.1,v.festival.z);return{id:v.id,x:p.x,y:p.y}});check(!!point,'visitors choose a physically routed stand visit');
 const canvas=await page.locator('#world').boundingBox();await page.mouse.click(canvas.x+point.x,canvas.y+point.y);console.log('guest pick',JSON.stringify(await page.evaluate(()=>({pick:PumpkinVoxel.scene.lastPick,menu:document.querySelector('#sheet').hidden,level:document.querySelector('#level-celebration').hidden}))));await page.waitForSelector('.guest-card:not([hidden])');check((await page.locator('.guest-card').textContent()).includes('Money left'),'tapping the walking visitor opens their live needs and money');await page.screenshot({path:path.join(out,'desktop-guest-card.png')});
 await page.locator('.guest-card button').click();await page.evaluate(()=>PumpkinVoxel.advance(45));
 check(await page.evaluate(()=>{const c=PumpkinVoxel.state().festival.cocoa;return c.sold>0||Object.values(c.extras).some(e=>e.sold>0)}),'guests pay for stock from their own finite purse');
 await page.evaluate(()=>PumpkinVoxel.openSheet('festival'));
 for(const[label,width,height]of[['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,small:[...document.querySelectorAll('#sheet button,#sheet select')].filter(e=>e.getClientRects().length).some(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9})}));check(layout.scroll<=width&&!layout.small,`${label}: menu prices and controls fit with 44px targets`,layout);await page.screenshot({path:path.join(out,`${label}-menu.png`)});
 }
 await page.locator('#sheet-close').click();await page.setViewportSize({width:874,height:787});await page.locator('#fullscreen').click();check(await page.evaluate(()=>!!document.fullscreenElement&&PumpkinVoxel.scene.cameraFraming.span>=54),'Fold fullscreen shows the expanded farm at a wide scale');
 await page.screenshot({path:path.join(out,'fold-fullscreen-farm.png')});await page.evaluate(()=>PumpkinVoxel.scene.focus(45,15,1.45));await page.screenshot({path:path.join(out,'sandy-and-village-exit.png')});
 const visual=await page.evaluate(()=>PumpkinVoxel.scene.festivalStatus);check(visual.ready&&visual.displayed.includes('smores'),'Sandy and actual stocked voxel snacks/cups are present',visual);
 await page.evaluate(()=>{PumpkinVoxel.scene.setBloom(true);PumpkinVoxel.scene.setShadows(true)});await page.screenshot({path:path.join(out,'sandy-default-lighting.png')});
 await page.waitForTimeout(5500);await page.reload();await page.waitForSelector('body[data-ready]');check(await page.evaluate(()=>{const c=PumpkinVoxel.state().festival.cocoa;return c.level===3&&c.prices.flake===9&&c.prices.midnight===10&&c.extras.smores.stock>=0}),'save/reload keeps unlocked products, prices and stock');
 check(errors.length===0,'no page or console errors');
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'SwiftShader; content QA bloom/shadows off, final lighting capture on'},null,2));await browser.close();await new Promise(r=>server.close(r))}
