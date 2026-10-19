// Contractor QA against the exact offline HTML, served unchanged on localhost
// because managed Chromium disallows file navigation. No remote assets needed.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]};
const html=path.resolve(arg('--html','dist/pumpkin-patch-voxel.html')), dir=path.resolve(arg('--shots','qa-house-levels'));
fs.mkdirSync(dir,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(html));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[];
const check=(ok,label)=>{checks.push({label,ok});console.log(`${ok?'ok':'FAIL'} ${label}`);if(!ok)throw Error(label)};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{if(!localStorage.getItem('qa-initialised')){localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:false}));localStorage.setItem('qa-initialised','true')}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready]');
 await page.locator('[data-tab="home"]').click();check(!await page.locator('#sheet').isVisible(),'home enters directly, with no covering menu');
 await page.evaluate(()=>PumpkinVoxel.tools.select('piece-0'));
 await page.locator('[data-tool="rotate-right"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().house.placed[0].rotation===15),'onscreen rotation changes the actual furniture');
 await page.screenshot({path:path.join(dir,'desktop-placement.png')});
 await page.locator('[data-tool="move"]').click();await page.evaluate(()=>PumpkinVoxel.tools.tapCell({x:4,z:3}));
 check(await page.evaluate(()=>PumpkinVoxel.tools.selected===null)&&!await page.locator('#piece-bar').isVisible(),'placing furniture clears selection, ring and tool tray');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.coins=50000;s.house.level=3;PumpkinVoxel.enterRoom('kitchen')});
 await page.locator('#place-decorate').click();await page.locator('[data-hometab="decorate"]').click();await page.locator('#decor-search').fill('Midnight cat portrait');
 await page.locator('[data-decor="d10"]').click();check(!await page.locator('#sheet').isVisible(),'purchase reveals placed item immediately');
 await page.locator('[data-wall="left"]').click();check(await page.evaluate(()=>PumpkinVoxel.state().house.placed.find(p=>p.id==='d10').wall==='left'),'wall art moves onto the left wall');
 await page.locator('[data-tool="done"]').click();await page.screenshot({path:path.join(dir,'kitchen-side-wall.png')});
 await page.evaluate(()=>{PumpkinVoxel.enterRoom('parlour');PumpkinVoxel.state().earned=150;PumpkinVoxel.advance(.1)});
 await page.waitForSelector('#level-celebration:not([hidden])');
 check(await page.evaluate(()=>PumpkinVoxel.state().house.owned.includes('d03')&&PumpkinVoxel.state().progression.pending[0]===2),'level 2 gives real decor and queues a persistent celebration');
 await page.screenshot({path:path.join(dir,'desktop-level-up.png')});await page.locator('.level-continue').click();
 check(await page.evaluate(()=>!PumpkinVoxel.state().progression.pending.length),'level celebration acknowledges without replaying rewards');
 for(const [label,width,height] of [['phone',390,844],['landscape',844,390],['fold-closed',412,915],['fold-open',874,787]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>PumpkinVoxel.tools.select('piece-0'));
  const layout=await page.evaluate(()=>{
   const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
   const small=[...document.querySelectorAll('#hud button,#place-bar button,#piece-bar button,#dock button')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9}).map(e=>e.getAttribute('aria-label')||e.textContent);
   return {scroll:document.documentElement.scrollWidth,small,tray:rect('piece-bar'),hud:rect('hud'),room:rect('place-bar')};
  });
  check(layout.scroll<=width&&!layout.small.length&&layout.tray.y>=0&&layout.tray.y+layout.tray.h<=height,`${label}: controls fit with 44px touch targets`);
  check(!(layout.hud.x<layout.room.x+layout.room.w&&layout.room.x<layout.hud.x+layout.hud.w&&layout.hud.y<layout.room.y+layout.room.h&&layout.room.y<layout.hud.y+layout.hud.h),`${label}: room navigation and level HUD do not overlap`);
  await page.screenshot({path:path.join(dir,`${label}-house-tools.png`)});await page.locator('[data-tool="done"]').click();
  await page.locator('#place-decorate').click();await page.screenshot({path:path.join(dir,`${label}-catalogue.png`)});await page.locator('#sheet-close').click();
  await page.locator('#open-levels').click();check(await page.locator('#level-celebration').isVisible(),`${label}: level chip opens next rewards`);await page.screenshot({path:path.join(dir,`${label}-next-level.png`)});await page.locator('.level-continue').click();
 }
 await page.setViewportSize({width:1280,height:800});
 await page.locator('#fullscreen').click();check(await page.evaluate(()=>!!document.fullscreenElement),'fullscreen button enters fullscreen');await page.evaluate(()=>document.exitFullscreen());
 await page.locator('#open-settings').click();await page.locator('#toggle-music').click();
 const tracks=await page.locator('#music-track option').evaluateAll(opts=>opts.map(o=>o.value));check(tracks.length===8,'eight MIDI songs available, including all four supplied files');
 for(const id of tracks){await page.locator('#music-track').selectOption(id);await page.waitForTimeout(200);const status=await page.evaluate(()=>PumpkinVoxel.audio.status);check(status.playing&&status.track===id&&status.duration>30,`MIDI playback: ${id}`)}
 await page.locator('#toggle-music').click();check(!(await page.evaluate(()=>PumpkinVoxel.audio.status.playing)),'muting stops the MIDI scheduler');await page.locator('#sheet-close').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const s=PumpkinVoxel.state();s.earned=535;PumpkinVoxel.advance(.1)});await page.waitForSelector('#level-celebration:not([hidden])');
 check(await page.locator('.level-confetti i').count()===0,'reduced motion skips confetti');await page.locator('.level-continue').click();
 await page.reload();await page.waitForSelector('body[data-ready]');
 check(await page.evaluate(()=>{const s=PumpkinVoxel.state();return s.house.placed[0].rotation===15&&s.house.placed.some(p=>p.id==='d10'&&p.wall==='left')&&s.wardrobe.owned.includes('natalie-witch')&&!s.progression.pending.length}),'save/reload preserves rotations, wall, costume and acknowledged levels');
 check(errors.length===0,'no page or console errors');
}finally{
 fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify({html,checks,errors,rendering:'SwiftShader, bloom/shadows off for content QA; default-bloom smoke is separate'},null,2));
 await browser.close();await new Promise(r=>server.close(r));
}
