import fs from "node:fs";import path from "node:path";import http from "node:http";import {chromium} from "playwright";
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]},file=path.resolve(arg("--html","dist/pumpkin-patch-voxel.html")),out=path.resolve(arg("--shots","qa-premium"));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==="/favicon.ico"){res.writeHead(204);res.end();return;}res.setHeader("Content-Type","text/html");res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});const checks=[],errors=[];let page;
const check=(ok,label)=>{checks.push({ok,label});console.log((ok?"ok ":"FAIL ")+label);if(!ok)throw Error(label);};
try{
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(120000);page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs",JSON.stringify({glow:false,shadows:false,music:false})));await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready][data-premium-icons="true"]');
 check(await page.evaluate(()=>document.body.dataset.premiumIconCount==="30"),"all thirty generated icons load from the bundled atlas");
 check(await page.locator('.dock button .premium-icon').count()===5,"all five navigation shortcuts use the generated artwork and retain labels");
 await page.screenshot({path:path.join(out,"desktop-premium-farm.png")});
 await page.locator('[data-tab="more"]').click();check(await page.locator('.more-icon .premium-icon').count()===4,"More destinations use one consistent icon family");await page.screenshot({path:path.join(out,"desktop-premium-more.png")});await page.locator('#sheet-close').click();
 await page.locator('[data-tab="shop"]').click();await page.locator('[data-upgrade-section="farm"]').click();check(await page.locator('#sheet-title').textContent()==="Farm upgrades","Upgrades opens a clearly titled management menu");await page.screenshot({path:path.join(out,"desktop-premium-build.png")});await page.locator('#sheet-close').click();
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.paused=true;s.visitors=Array.from({length:5},(_,i)=>({id:500+i,kind:5+i,age:1.6+i*.8,budget:40,basketLimit:1,preferred:[0],basket:[],amount:0,quantity:0,bought:null,outcome:"shopping",leaveAt:null,spot:0,needs:{thirst:50,hunger:40,happiness:80},festival:{done:true},hollowConsidered:true}));PumpkinVoxel.scene.focus(31,17,1.9);});
 await page.waitForFunction(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500&&v.sprite&&v.visible&&v.frames===4).length===5);
 check(true,"mummy, zombie, werewolf, undead pirate and clown each render four walking frames");
 const poses=await page.evaluate(()=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500).map(v=>v.frame));await page.evaluate(()=>PumpkinVoxel.state().visitors.forEach(v=>v.age+=.25));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 check(await page.evaluate(before=>PumpkinVoxel.scene.visitorStatus.filter(v=>v.id>=500).every((v,i)=>v.frame!==before[i]),poses),"walking changes the sprite frame for all five new visitors");await page.screenshot({path:path.join(out,"desktop-new-visitors.png")});
 for(const[label,width,height]of[["phone",390,844],["fold",874,787],["landscape",844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>PumpkinVoxel.scene.fitView());
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.dock button,.hud button')].filter(e=>e.getClientRects().length).every(e=>{const b=e.getBoundingClientRect();return b.width>=43.9&&b.height>=43.9;})),`${label}: navigation fits and retains touch targets`);
  await page.locator('[data-tab="more"]').click();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: generated menu icons cause no horizontal overflow`);await page.screenshot({path:path.join(out,`${label}-premium-menu.png`)});await page.locator('#sheet-close').click();
 }
 check(errors.length===0,"no page or console errors");
}catch(e){if(page)await page.screenshot({path:path.join(out,"failure.png")}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,"checks.json"),JSON.stringify({file,checks,errors,rendering:"Chromium/SwiftShader, bloom/shadows off; viewport emulation, not physical-device certification"},null,2));await browser.close();await new Promise(r=>server.close(r));}
