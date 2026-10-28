// Focused release checks against the exact, unmodified offline HTML.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { PLAYER_SIDE_WALK_META } from '../src/player-side-walk-meta.js';

const file = path.resolve(process.argv[2] ?? '/workspace/Pumpkin-Patch-Life-Play-Fit.html');
const out = path.resolve(process.argv[3] ?? '/tmp/life-play-fit');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), checks = [], errors = [], requests = [], shots = [];
let passed = false;
const meta = {
  file, sha256: createHash('sha256').update(html).digest('hex'), started: new Date().toISOString(),
  scope: 'Exact HTML; indoor projected sprite size and pitch/zoom limits, compact right-thumb UI and notices, forgiving real pointer holds, illustrated can rendering and cancellation. QA state/time only, HTML untouched. No physical Fold/Bluetooth test.',
};
const report = () => fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ ...meta, passed, checks, errors, requests, shots }, null, 2));
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) }); report();
  console.log(ok ? 'ok  ' : 'FAIL', label);
  if (!ok) throw Error(label + ': ' + JSON.stringify(data));
};
const seed = M.freshState();
seed.introSeen = true; seed.coins = 25000; seed.earned = 100000; seed.house.level = 3;
seed.progression.homeLegacyThrough = 12;
seed.progression.claimed = M.LEVELS.slice(0, 12).map(l => l.level); seed.progression.pending = [];
seed.visitorTimer = seed.shop.arrivalTimer = seed.bigSpender.timer = 1e6; seed.orders.next = 1e6;
const server = http.createServer((request, response) => {
  if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  response.setHeader('Content-Type', 'text/html'); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
page.setDefaultTimeout(120000);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  if (!request.url().startsWith(base) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) requests.push(request.url());
});
await page.addInitScript(s => {
  const key = 'pumpkin-patch-voxel-reference-v1';
  localStorage.setItem(key, JSON.stringify(s));
  localStorage.setItem(key + '-prefs', JSON.stringify({ renderQuality: 'performance', shadows: false, glow: false, mist: false, lakeLights: false, music: false, sound: false }));
}, M.saveData(seed));
const frame = async (count = 2) => {
  const token = await page.evaluate(count => {
    const token = (window.lifeReleaseFrame ?? 0) + 1; window.lifeReleaseFrame = token;
    let seen = 0;
    const step = () => { if (++seen >= count) window.lifeReleaseFrameDone = token; else requestAnimationFrame(step); };
    requestAnimationFrame(step); return token;
  }, count);
  await page.waitForFunction(token => window.lifeReleaseFrameDone >= token, token);
};
const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png') }); shots.push(name); report(); };
const status = () => page.evaluate(() => ({ p: PumpkinVoxel.scene.player.state(), camera: PumpkinVoxel.scene.cameraFraming }));
const wrapped = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const travelled = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const touch = (id, x, y) => ({ id, x, y, radiusX: 5, radiusY: 5, force: 1 });
const fit = async () => page.evaluate(() => {
  const visible = [...document.querySelectorAll('#play-controls button:not(:disabled)')].filter(n => n.getClientRects().length && !n.closest('[hidden]'));
  const boxes = visible.map(n => ({ label: n.getAttribute('aria-label') ?? n.textContent.trim(), ...n.getBoundingClientRect().toJSON() }));
  return {
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    small: boxes.filter(r => r.width < 43.5 || r.height < 43.5),
    clipped: boxes.filter(r => r.x < -.5 || r.right > innerWidth + .5 || r.top < -.5 || r.bottom > innerHeight + .5),
  };
});

// Bound the visible frame conservatively, including transparent atlas gutters.
const measureOwner=()=>page.evaluate(()=>{
 const api=PumpkinVoxel,p=api.scene.player.state(),camera=api.scene.debug.active(),scene=api.scene.debug.scene;
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 let actor;scene.traverse(o=>{if(o.userData.playerAnimate&&Math.abs(o.position.x-(200+p.position.x))<.01&&Math.abs(o.position.z-p.position.z)<.01)actor=o;});
 if(!actor)throw Error('Missing controlled home actor');
 const mesh=actor.children[0].children.find(m=>m.isMesh),g=mesh.geometry;g.computeBoundingBox();let lo=Infinity,hi=-Infinity;
 for(const x of [g.boundingBox.min.x,g.boundingBox.max.x])for(const y of [g.boundingBox.min.y,g.boundingBox.max.y]){
  const v=camera.position.clone().set(x,y,0).applyMatrix4(mesh.matrixWorld).project(camera);lo=Math.min(lo,v.y);hi=Math.max(hi,v.y);
 }
 return {fraction:(hi-lo)/2,leanStretch:actor.children[0].scale.y,worldScale:actor.scale.y,framing:api.scene.cameraFraming};
});
try{
 await page.goto(base);await page.waitForSelector('body[data-ready]');
 await page.waitForFunction(()=>PumpkinVoxel.scene.characterStyle==='sprites');
 await page.evaluate(()=>{PumpkinVoxel.intro?.skip();PumpkinVoxel.state().progression.pending=[];});
 await page.locator('.house-goal-modal [data-later]').evaluateAll(ns=>ns.forEach(n=>n.click()));
 await page.locator('.level-continue').evaluateAll(ns=>ns.forEach(n=>n.click()));
 await page.evaluate(()=>{PumpkinVoxel.playControls.start('natalie');PumpkinVoxel.enterRoom('parlour');PumpkinVoxel.closeSheet();PumpkinVoxel.scene.player.teleport(5,4);PumpkinVoxel.scene.player.recenter();});
 for(const [name,width,height]of [['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>PumpkinVoxel.scene.player.recenter());await frame(2);
  const body=await measureOwner();check(body.fraction<.28&&body.framing.roomDistance>=15,`${name}: the owner fits naturally with room around them`,body);
  const layout=await page.evaluate(()=>{
   const r=s=>document.querySelector(s).getBoundingClientRect().toJSON(),action=r('#play-interact'),move=r('#play-stick'),look=r('#play-look');
   const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   return {action,move,look,select:getComputedStyle(document.querySelector('#play-interact')).userSelect,overflow:document.documentElement.scrollWidth>innerWidth+1,right:action.x+action.width/2>innerWidth*.72,overlap:overlap(action,move)||overlap(action,look)};
  });
  const touchFit=await fit();
  check(layout.right&&!layout.overlap&&!layout.overflow&&layout.move.width<=92&&layout.look.width<=92&&!touchFit.small.length&&!touchFit.clipped.length&&layout.select==='none',`${name}: compact controls put Interact within the right thumb's reach`,{layout,touchFit});
  await shot(name+'-room-controls');
  const toast=await page.evaluate(()=>{PumpkinVoxel.notice('This crop has had a drink. Try the next one.');const n=document.getElementById('notice');return {...n.getBoundingClientRect().toJSON(),text:n.textContent};});
  check(toast.height<=80&&toast.width<=Math.min(width-20,320)&&toast.top>=0&&toast.bottom<=height,`${name}: the notification stays a small intrinsic-height toast`,toast);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>PumpkinVoxel.scene.player.recenter());await frame();
 const normal=await measureOwner();await page.evaluate(()=>{for(let i=0;i<35;i++)PumpkinVoxel.scene.player.lookBy(0,1);});await frame();
 const steep=await measureOwner();check(Math.abs(normal.leanStretch-steep.leanStretch)<.001,'Looking down no longer doubles indoor sprite world height',{normal,steep});
 await page.evaluate(()=>{PumpkinVoxel.scene.player.recenter();for(let i=0;i<30;i++)PumpkinVoxel.scene.player.zoom(1);});await frame();
 const zoomed=await measureOwner();check(zoomed.framing.zoom<=1.15&&zoomed.framing.roomDistance>=13&&zoomed.fraction<.33,'Indoor zoom cannot turn the owner into a screen-filling giant',zoomed);
 await page.evaluate(()=>PumpkinVoxel.leavePlace());await page.setViewportSize({width:874,height:787});
 await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state();a.lifeActivity.cancel();p.cancelAction();s.plots[0]={phase:'growing',progress:.1,variety:0};const t=p.targets().find(t=>t.type==='plot'&&t.index===0);p.teleport(t.x-1.2,t.z);p.faceTarget(t);p.recenter();});await frame();
 const button=await page.locator('#play-interact').boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();
 check(await page.evaluate(()=>PumpkinVoxel.lifeActivity.state().active&&PumpkinVoxel.lifeActivity.state().holding),'Pressing the right-hand button begins a visible held action');
 await page.evaluate(()=>PumpkinVoxel.lifeActivity.advance(.2));await page.waitForTimeout(260);await page.mouse.up();
 check(await page.evaluate(()=>{const j=PumpkinVoxel.lifeActivity.state();return j.active&&!j.holding&&j.assisted;}),'Releasing a longer press finishes the current use instead of losing it');
 await frame(1);
 const can=await page.evaluate(()=>{let m;PumpkinVoxel.scene.debug.scene.traverse(o=>{if(o.name==='Illustrated watering can')m=o;});return {state:PumpkinVoxel.scene.player.state(),geometry:m?.geometry.type,width:m?.material.map?.image?.width,height:m?.material.map?.image?.height};});
 check(can.state.canVisible&&can.state.dropsVisible&&can.state.waterCanStyle==='sprite'&&can.geometry==='PlaneGeometry'&&can.width===256&&can.height===184,'Watering draws the illustrated can and an animated pour',can);
 await shot('illustrated-can-hold');await page.evaluate(()=>PumpkinVoxel.lifeActivity.advance(2));
 check(await page.evaluate(()=>{const a=PumpkinVoxel,j=a.lifeActivity.state();return !j.active&&!j.travelling&&a.state().plots[0].progress>=.22&&j.last?.target.index===0;}),'Release commits one watering use and stops the chain');
 await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state();s.wardrobe.equipped.natalie='natalie-tiffany';a.scene.refreshLooks();s.plots[0]={phase:'growing',progress:.1,variety:0};const t=p.targets().find(t=>t.type==='plot'&&t.index===0);p.teleport(t.x-1.2,t.z);p.faceTarget(t);a.interactAsPlayer('water',{phase:'tap'});});await frame(1);await shot('costume-illustrated-can');
 check(await page.evaluate(()=>PumpkinVoxel.state().wardrobe.equipped.natalie==='natalie-tiffany'&&PumpkinVoxel.scene.player.state().waterCanStyle==='sprite'&&PumpkinVoxel.scene.player.state().canVisible),'Costume watering keeps the selected outfit and uses the same painted can');
 await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state();a.lifeActivity.cancel();s.plots[0]={phase:'empty',progress:0,variety:0};a.interactAsPlayer('plant',{phase:'tap'});a.lifeActivity.advance(.2);});
 await page.keyboard.down('d');await frame(2);await page.keyboard.up('d');
 check(await page.evaluate(()=>!PumpkinVoxel.lifeActivity.state().active&&PumpkinVoxel.state().plots[0].phase==='empty'),'Movement still cancels unfinished work without planting');
 check(errors.length===0&&requests.length===0,'The refinement flow has no browser errors or external runtime assets',{errors,requests});passed=true;
}catch(error){meta.failure=String(error);console.error(error.stack??error);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{report();await browser.close();await new Promise(resolve=>server.close(resolve));}
if(!passed)process.exitCode=1;
