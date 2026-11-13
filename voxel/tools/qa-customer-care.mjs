// Play the standalone contractor build; no dev server or extra build is needed.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const arg=(n,d)=>{let i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]};
const file=path.resolve(arg('--html','dist/pumpkin-patch-voxel.html')),out=path.resolve(arg('--shots','qa-customer-care'));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[],check=(ok,label,data)=>{checks.push({ok,label,data});console.log(`${ok?'ok':'FAIL'} ${label}`);if(!ok)throw Error(label)};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false})));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready]');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.visitorTimer=s.shop.arrivalTimer=1e6;s.harvested=6;PumpkinVoxel.advance(.1)});
 await page.waitForSelector('[data-collect-favour="basket"]');check(await page.locator('.npc-reward').isVisible(),'completed NPC favour appears in the game');await page.screenshot({path:path.join(out,'desktop-collect-reward.png')});
 const before=await page.evaluate(()=>PumpkinVoxel.state().coins);await page.locator('[data-collect-favour="basket"]').click();check(await page.evaluate(before=>{const s=PumpkinVoxel.state();return s.claimed.includes('basket')&&s.coins===before+25},before),'Collect credits the reward exactly once');
 await page.setViewportSize({width:390,height:844});await page.mouse.move(1,820);await page.evaluate(()=>{PumpkinVoxel.state().taps=16;PumpkinVoxel.advance(.1)});await page.waitForSelector('[data-collect-favour="magic"]');await page.screenshot({path:path.join(out,'phone-collect-reward.png')});
 await page.waitForFunction(()=>document.querySelector('.npc-reward').hidden,null,{timeout:60000});check(await page.evaluate(()=>!PumpkinVoxel.state().claimed.includes('magic')),'uncollected NPC card fades without spending or losing the reward');
 await page.locator('#goal').click();await page.locator('[data-claim="magic"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().claimed.includes('magic')),'faded reward can still be collected in Journal');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.shop.unlocked=true;s.coins=10000;PumpkinVoxel.openSheet('shop')});await page.locator('[data-care]').click();
 for(let i=0;i<3;i++){await page.locator('[data-care-upgrade="bags"]').click();await page.locator('[data-care-upgrade="tipJar"]').click();}
 check(await page.evaluate(()=>{const c=PumpkinVoxel.state().customerCare;return c.bags===3&&c.tipJar===3&&c.invested===8080}),'three bag and generosity tiers are buyable from the shop');
 const sales=await page.evaluate(()=>{const s=PumpkinVoxel.state();s.progression.claimed=Array.from({length:12},(_,i)=>i+1);s.progression.pending=[];s.stock=[1000,50,50,50];s.nextVisitor=4;s.visitorTimer=s.shop.arrivalTimer=.1;s.shop.capacityLevel=3;const before=s.coins;PumpkinVoxel.advance(600);return{coins:s.coins-before,products:s.stall.income+s.shop.income,cocoa:s.stall.cocoa,tips:s.customerCare.tips.stall+s.customerCare.tips.shop,graded:s.customerCare.graded}});
 check(sales.tips>0&&sales.graded>0&&sales.coins===sales.products+sales.cocoa+sales.tips,'tips reconcile separately from goods revenue in live gameplay',sales);
 await page.locator('[data-care-tab="stats"]').click();check((await page.locator('#sheet-body').textContent()).includes('indoor shop tips'),'stats show stall tips, shop tips and total tips separately');
 for(const[label,width,height]of[['desktop',1280,800],['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,small:[...document.querySelectorAll('#sheet button')].filter(e=>e.getClientRects().length).some(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9})}));check(layout.scroll<=width&&!layout.small,`${label}: customer stats fit with touch-sized controls`,layout);await page.screenshot({path:path.join(out,`${label}-tips-stats.png`)});
 }
 await page.waitForTimeout(5500);await page.reload();await page.waitForSelector('body[data-ready]');check(await page.evaluate(()=>{const s=PumpkinVoxel.state();return s.customerCare.bags===3&&s.customerCare.tipJar===3&&s.customerCare.tips.stall+s.customerCare.tips.shop>0&&s.claimed.includes('magic')}),'save/reload preserves upgrades, separate tips and collected rewards');
 // Inspect the revised continuous yard and reused original boundary art.
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.festival.meadow=true;s.festival.cocoa.level=3;s.festival.cocoa.stock=30;PumpkinVoxel.closeSheet();PumpkinVoxel.scene.refreshEstate();PumpkinVoxel.scene.fitView()});
 for(const[label,width,height]of[['desktop',1280,800],['fold',874,787]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>PumpkinVoxel.scene.fitView());await page.screenshot({path:path.join(out,`${label}-cohesive-expansion.png`)});
 }
 await page.evaluate(()=>PumpkinVoxel.scene.focus(45,17,1.45));await page.screenshot({path:path.join(out,'meadow-boundary-detail.png')});
 check(errors.length===0,'no page or console errors');
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'SwiftShader, bloom/shadows off for content QA'},null,2));await browser.close();await new Promise(r=>server.close(r))}
