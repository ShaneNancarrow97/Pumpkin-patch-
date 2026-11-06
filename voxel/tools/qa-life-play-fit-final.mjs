// Focused release checks against the exact, unmodified offline HTML.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { PLAYER_SIDE_WALK_META } from '../src/player-side-walk-meta.js';

const file = path.resolve(process.argv[2] ?? '/workspace/Pumpkin-Patch-Life-Play-Fit.html');
const out = path.resolve(process.argv[3] ?? '/tmp/life-play-fit-final');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), checks = [], errors = [], requests = [], shots = [];
let passed = false;
const meta = {
  file, sha256: createHash('sha256').update(html).digest('hex'), started: new Date().toISOString(),
  scope: 'Exact final HTML; phone-to-Fold framing, final illustrated-can screenshot, compact notice and actual right-thumb release. Diagnostic action time only; no HTML edits. Hardware tests remain separate.',
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


try{
 await page.setViewportSize({width:390,height:844});await page.goto(base);await page.waitForSelector('body[data-ready]');
 await page.waitForFunction(()=>PumpkinVoxel.scene.characterStyle==='sprites');
 await page.evaluate(()=>{PumpkinVoxel.intro?.skip();PumpkinVoxel.state().progression.pending=[];});
 await page.locator('.house-goal-modal [data-later]').evaluateAll(ns=>ns.forEach(n=>n.click()));
 await page.locator('.level-continue').evaluateAll(ns=>ns.forEach(n=>n.click()));
 await page.evaluate(()=>{PumpkinVoxel.playControls.start('natalie');const p=PumpkinVoxel.scene.player;p.teleport(15.3,14.2);p.recenter();});await frame();
 const before=await page.evaluate(()=>PumpkinVoxel.scene.cameraFraming.zoom);
 await page.setViewportSize({width:874,height:787});await frame(3);
 const after=await page.evaluate(()=>PumpkinVoxel.scene.cameraFraming.zoom);
 check(Math.abs(before-after)<.001,'Unfolding the phone preserves the direct-play camera distance',{before,after});
 await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state();s.plots[0]={phase:'growing',progress:.1,variety:0};const t=p.targets().find(t=>t.type==='plot'&&t.index===0);p.teleport(t.x-1.2,t.z);p.faceTarget(t);p.recenter();});await frame();
 const r=await page.locator('#play-interact').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 await page.evaluate(()=>PumpkinVoxel.lifeActivity.advance(.2));await page.waitForTimeout(260);await page.mouse.up();
 const active=await page.evaluate(()=>PumpkinVoxel.lifeActivity.state());
 check(active.active&&!active.holding&&active.assisted,'The final right-thumb release finishes one current use',active);await frame(1);
 const can=await page.evaluate(()=>{let mesh;PumpkinVoxel.scene.debug.scene.traverse(o=>{if(o.name==='Illustrated watering can')mesh=o;});return {state:PumpkinVoxel.scene.player.state(),geometry:mesh?.geometry.type,width:mesh?.material.map?.image?.width};});
 check(can.state.canVisible&&can.state.waterCanStyle==='sprite'&&can.geometry==='PlaneGeometry'&&can.width===256,'The exact release displays the painted watering can',can);
 await shot('final-fold-watering');await page.evaluate(()=>PumpkinVoxel.lifeActivity.advance(2));
 const notice=await page.evaluate(()=>{PumpkinVoxel.notice('This crop has had a drink. Try the next one.');return document.getElementById('notice').getBoundingClientRect().toJSON();});
 check(notice.height<80&&notice.width<=320,'The final notice remains compact',notice);
 await page.evaluate(()=>{const a=PumpkinVoxel;a.enterRoom('parlour');a.closeSheet();a.scene.player.teleport(5,4);a.scene.player.recenter();});await frame(2);await shot('final-fold-house');
 check(errors.length===0&&requests.length===0,'The exact release has no browser errors or external runtime assets',{errors,requests});passed=true;
}catch(error){meta.failure=String(error);console.error(error.stack??error);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{report();await browser.close();await new Promise(resolve=>server.close(resolve));}
if(!passed)process.exitCode=1;
