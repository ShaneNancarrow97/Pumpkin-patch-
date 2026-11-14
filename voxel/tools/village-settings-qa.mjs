// Exact-build settings acceptance. Run serially with other software GPU jobs.
// --ui holds draws after native startup; --native never holds or steps rendering.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { VILLAGE_GRAPHICS_KEYS } from '../src/village-graphics.js';
import { OUTSIDE_VIEW } from '../src/village-camera.js';

const args = process.argv.slice(2), uiOnly = args.includes('--ui'), gpu = args.includes('--gpu'), gpuOnly = args.includes('--gpu-only');
if (!args[0] || !args[1] || uiOnly === args.includes('--native') || gpu && uiOnly || gpuOnly && !gpu) throw Error('Usage: node tools/village-settings-qa.mjs HTML OUT (--ui | --native [--gpu [--gpu-only]])');
const file = path.resolve(args[0]), out = path.resolve(args[1]), hash = value => createHash('sha256').update(value).digest('hex'), html = await fs.readFile(file);
const s = M.freshState(); Object.assign(s, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); s.shop.arrivalTimer = 1e9;
s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.pending = []; s.progression.homeLegacyThrough = 20;
M.inviteToVillage(s); M.finishTour(s); s.village.clock = 1800;
s.village.quests.invitation = { step: 3, done: true }; s.village.quests['two-doorbells'] = { step: 3, done: true };
s.village.built['elowen-library'] = s.village.built['rowan-workshop'] = true;
const fixture = M.saveData(s), preferences = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', voxelCharacters: false, glow: true, shadows: true, villageRenderer: 'webgl', villagePost: gpuOnly ? 'off' : 'balanced', villageShadows: !gpuOnly, villageDistance: 'far', villageGrass: gpuOnly ? 'off' : 'high' };
const report = { file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), mode: uiOnly ? 'ui-only' : gpuOnly ? 'native-webgpu' : gpu ? 'native-webgl-and-webgpu' : 'native-webgl',
  display: { viewport: uiOnly ? [1280,800] : [960,540], deviceScaleFactor: uiOnly ? 1 : .5, nativePixelScope: 'Native 480x270 buffer bounds software GPU cost; this validates rendering behaviour, not full-resolution visual quality or device FPS.' },
  scope: uiOnly ? 'Exact HTML UI/controller acceptance, native RAF and simulation; renderer/composer draws held only after native village startup. World pixels in UI captures are stale, not graphics or FPS evidence. Standard Gamepad API injection is not physical Bluetooth certification.' : 'Exact HTML on loopback. Native game RAF/rendering; no held draws, manual tick, advance or manual render. Graphics choices use actual HTML controls. Actual WebGPU canvas pixels are captured separately because this software Chromium runner has a known stale page-compositor limitation. No physical phone/TV FPS claim.',
  preferences, checks: [], screenshots: [], states: {}, errors: [], consoleErrors: [], warnings: [], externalRequests: [], failedRequests: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, actual }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) throw Error(`${label}: ${JSON.stringify(actual)}`); };
const selectors = Object.fromEntries(VILLAGE_GRAPHICS_KEYS.map(key => [key, '#vg-setting-' + key]));
await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ fixture, preferences }, null, 2));
const server = createServer((req, res) => { if (req.url === '/favicon.ico') return res.writeHead(204).end(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page, activity;
const frames = (count = 2) => page.evaluate(count => new Promise(resolve => { const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }), count);
const read = () => page.evaluate(() => ({ ...PumpkinVoxel.scene.villageGraphicsStatus, position: { ...PumpkinVoxel.village.status.position }, place: PumpkinVoxel.scene.place, glShadows: PumpkinVoxel.scene.debug.renderer.shadowMap.enabled }));
const kept = () => page.evaluate(keys => { const p = JSON.parse(localStorage.getItem('pumpkin-patch-voxel-reference-v1-prefs')); return Object.fromEntries([...keys, 'glow', 'shadows'].map(key => [key, p[key]])); }, VILLAGE_GRAPHICS_KEYS);
async function choose(key, value) { console.log(`Choosing ${key}: ${value}`); await page.locator(selectors[key]).selectOption(String(value)); await page.waitForFunction(({ key, value }) => PumpkinVoxel.scene.villageGraphicsStatus.preferences[key] === (key === 'villageShadows' ? value === 'on' : value), { key, value }); await frames(); }
async function openSettings() { await page.locator('#vg-settings').click(); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'settings'); }
async function enterVillage() {
  await page.evaluate(() => { const p = PumpkinVoxel; p.scene.player.setEnabled(true, 'natalie'); p.openVillage(); p.village.place(87, -16.5, { x: 0, z: -1 }); });
  await page.waitForFunction(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked); await frames();
  await page.evaluate(pose => { const v = PumpkinVoxel.scene.villageView; v.play.reset(v.play.state.subject, pose); }, { x: 87, z: -16.5, yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance }); await frames();
}
async function holdUiDraws() { await page.evaluate(() => { const d = PumpkinVoxel.scene.debug; window.__settingsDrawHeld = true; d.renderer.render = () => {}; d.composer.render = () => {}; }); }
async function screenshot(name) { await frames(); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push({ file: name, drawHeld: uiOnly }); }
async function layout() {
  const result = await page.evaluate(() => {
    const panel = document.querySelector('#vg-panel'), box = panel.getBoundingClientRect(), tiny = [], small = [];
    const visible = el => { if (el.closest('[hidden],[aria-hidden=true],.sr,.sr-only')) return false; const r = el.getBoundingClientRect(), style = getComputedStyle(el); return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; };
    const zoom = el => { if (Number.isFinite(el.currentCSSZoom)) return el.currentCSSZoom; let z = 1; for (let p = el; p; p = p.parentElement) z *= parseFloat(getComputedStyle(p).zoom) || 1; return z; };
    for (const el of [...panel.querySelectorAll('button,select'), document.querySelector('#vg-settings')]) if (visible(el)) { const r = el.getBoundingClientRect(); if (r.width < 43.9 || r.height < 43.9) tiny.push({ id: el.id, width: r.width, height: r.height }); }
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT); while (walker.nextNode()) { const n = walker.currentNode, el = n.parentElement; if (n.textContent.trim() && visible(el) && !el.closest('svg,option')) { const size = parseFloat(getComputedStyle(el).fontSize) * zoom(el); if (size < 11.99) small.push({ text: n.textContent.trim(), size }); } }
    const header = [...document.querySelectorAll('#vg-home,#vg-location,.vf-header-tools > *')].filter(visible).map(el => { const r = el.getBoundingClientRect(); return { id: el.id, x: r.x, y: r.y, right: r.right, bottom: r.bottom }; });
    const overlaps = []; for (let i = 0; i < header.length; i++) for (let j = i + 1; j < header.length; j++) { const a = header[i], b = header[j]; if (Math.min(a.right,b.right) - Math.max(a.x,b.x) > 1 && Math.min(a.bottom,b.bottom) - Math.max(a.y,b.y) > 1) overlaps.push([a.id,b.id]); }
    return { box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, viewport: [innerWidth,innerHeight], tiny, small, header, overlaps, documentOverflow: document.documentElement.scrollWidth - innerWidth, contentOverflow: panel.scrollWidth - panel.clientWidth };
  });
  return { ...result, pass: result.box.left >= -.5 && result.box.top >= -.5 && result.box.right <= result.viewport[0] + .5 && result.box.bottom <= result.viewport[1] + .5 && !result.tiny.length && !result.small.length && !result.overlaps.length && result.documentOverflow <= 1 && result.contentOverflow <= 1 };
}
async function padRelease(index) { await page.evaluate(i => { window.__settingsPad.buttons[i] = { pressed: false, value: 0 }; }, index); await frames(3); }
async function padPress(index, expectation, arg) { await padRelease(index); await page.evaluate(i => { window.__settingsPad.buttons[i] = { pressed: true, value: 1 }; }, index); try { if (expectation) await page.waitForFunction(expectation, arg); else await frames(3); } finally { await padRelease(index); } }
async function controllerChecks() {
  await page.evaluate(() => { window.__settingsPad = { id: 'DualSense Wireless Controller QA', index: 0, connected: true, mapping: 'standard', axes: [0,0,0,0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) }; Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__settingsPad.connected ? [window.__settingsPad] : [] }); }); await frames();
  await padPress(1, () => !PumpkinVoxel.village.status.panel);
  await padPress(9, () => PumpkinVoxel.village.status.panel === 'navigation');
  for (let i = 0; i < 8 && !(await page.evaluate(() => document.activeElement?.dataset.vgPage === 'settings')); i++) await padPress(13);
  check('Options and D-pad reach the village Settings card', await page.evaluate(() => document.activeElement?.dataset.vgPage === 'settings'));
  await padPress(0, () => PumpkinVoxel.village.status.panel === 'settings');
  await padPress(13);
  check('Settings opens with a reachable post-effects select', await page.evaluate(() => document.activeElement?.id === 'vg-setting-villagePost'));
  await padPress(0, () => PumpkinVoxel.scene.villageGraphicsStatus.preferences.villagePost === 'high');
  await padPress(14, () => PumpkinVoxel.scene.villageGraphicsStatus.preferences.villagePost === 'balanced');
  check('Cross and D-pad change real settings immediately', (await kept()).villagePost === 'balanced');
  const before = (await read()).position; await page.keyboard.down('w'); await page.evaluate(() => { window.__settingsPad.axes[1] = -1; }); await frames(8); await page.keyboard.up('w'); await page.evaluate(() => { window.__settingsPad.axes[1] = 0; });
  const after = (await read()).position; check('Movement input cannot move the owner underneath Settings', Math.hypot(before.x-after.x,before.z-after.z) < 1e-6, { before, after });
  await padPress(1, () => PumpkinVoxel.village.status.panel !== 'settings');
  if (await page.evaluate(() => !!PumpkinVoxel.village.status.panel)) await padPress(1, () => !PumpkinVoxel.village.status.panel);
  check('Circle returns from Settings without leaving the village', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
  await page.evaluate(() => { window.__settingsPad.connected = false; window.dispatchEvent(new Event('gamepaddisconnected')); }); await frames();
  await openSettings();
}
async function gpuFrames(count = 2) { const before = (await read()).renderer.completedFrames ?? 0; await page.waitForFunction(({before,count}) => PumpkinVoxel.scene.villageRendererStatus.stage === 'fallback' || PumpkinVoxel.scene.villageRendererStatus.completedFrames >= before + count, {before,count}, {timeout:180000}); check('Native GPU frames continue without fallback', (await read()).renderer.stage === 'ready'); }
function pngPixels(bytes) {
  let w,h,c,at=8; const chunks=[];
  while(at<bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+n);at+=n+12;if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);c=data[9]===6?4:data[9]===2?3:0;if(data[8]!==8||!c||data[12])throw Error('Unsupported capture PNG');}if(type==='IDAT')chunks.push(data);if(type==='IEND')break;}
  const stride=w*c,raw=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(w*h*c),paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
  for(let y=0;y<h;y++){const offset=y*stride,input=y*(stride+1),f=raw[input];for(let x=0;x<stride;x++){const a=x>=c?pixels[offset+x-c]:0,b=y?pixels[offset+x-stride]:0,d=y&&x>=c?pixels[offset+x-stride-c]:0;pixels[offset+x]=raw[input+x+1]+(f===0?0:f===1?a:f===2?b:f===3?Math.floor((a+b)/2):paeth(a,b,d));}}
  let opaque=0;const colours=new Set();for(let i=0;i<pixels.length;i+=c){if(c===3||pixels[i+3]>240)opaque++;if(colours.size<2048)colours.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);}return{width:w,height:h,opaqueFraction:opaque/(w*h),colours:colours.size,pixelSha256:hash(pixels)};
}
async function gpuShot(name) { await gpuFrames(); const data=await page.evaluate(()=>document.querySelector('.village-webgpu-canvas').toDataURL('image/png'));const bytes=Buffer.from(data.split(',')[1],'base64');await fs.writeFile(path.join(out,name),bytes);const pixels=pngPixels(bytes);check(`${name}: actual GPU canvas contains an opaque detailed world`,pixels.opaqueFraction>.95&&pixels.colours>128,pixels);report.screenshots.push({file:name,drawHeld:false,actualGpuCanvas:true,sha256:hash(bytes),...pixels}); }

try {
  if(process.env.VILLAGE_SETTINGS_EXPECTED_SHA && report.htmlSha256!==process.env.VILLAGE_SETTINGS_EXPECTED_SHA) throw Error('HTML hash mismatch');
  const launchArgs=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist',...(gpu?['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']:[])];
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:launchArgs,timeout:30000});report.browserVersion=browser.version();report.launchArgs=launchArgs;
  page=await browser.newPage({viewport:uiOnly?{width:1280,height:800}:{width:960,height:540},deviceScaleFactor:uiOnly?1:.5,hasTouch:true});page.setDefaultTimeout(180000);
  page.on('pageerror',e=>report.errors.push(e.stack??e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,3000));else if(m.type()==='warning'&&report.warnings.length<40)report.warnings.push(m.text().slice(0,1000));});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))report.externalRequests.push(r.url());});page.on('requestfailed',r=>report.failedRequests.push(r.url().slice(0,200)));
  activity=setInterval(()=>page.keyboard.press('Shift').catch(()=>{}),30000);
  await page.addInitScript(({fixture,preferences})=>{if(!localStorage.getItem('__settingsQASeeded')){localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(fixture));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify(preferences));localStorage.setItem('__settingsQASeeded','1');}}, {fixture,preferences});
  await page.goto(`${origin}/game.html?villageRenderer=webgl`,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]');await enterVillage();
  check('Initial village uses the compatible renderer', (await read()).renderer.requested==='webgl'&&(await read()).renderer.backend==='webgl');
  if(uiOnly)await holdUiDraws();
  await openSettings();check('Header gear opens five village graphics controls',await page.locator('#vg-panel [data-village-setting]').count()===5);
  if(uiOnly){
    await controllerChecks();
    for(const[name,width,height]of[['desktop',1280,800],['phone',390,844],['landscape',844,390],['tv',1920,1080]]){
      await page.setViewportSize({width,height});await frames();
      if(name==='tv'){await page.evaluate(()=>{PumpkinVoxel.village.close();PumpkinVoxel.openSheet('settings');});await page.locator('#toggle-tv').click();await page.evaluate(()=>PumpkinVoxel.closeSheet());await enterVillage();await openSettings();check('TV layout uses the real Settings toggle',await page.locator('body').evaluate(el=>el.classList.contains('tv-mode')));}
      const result=await layout();check(`${name}: village controls and header remain readable and fit`,result.pass,result);await screenshot(`ui-only-${name}-settings.png`);
    }
    await choose('villagePost','low');await choose('villageShadows','off');await choose('villageDistance','near');await choose('villageGrass','low');await choose('villageRenderer','webgl');
    const saved=await kept();check('All five choices save without changing farm glow or shadows',saved.villageRenderer==='webgl'&&saved.villagePost==='low'&&!saved.villageShadows&&saved.villageDistance==='near'&&saved.villageGrass==='low'&&saved.glow&&saved.shadows,saved);
    await page.setViewportSize({width:640,height:480});await page.goto(`${origin}/game.html`,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]');await enterVillage();await holdUiDraws();await openSettings();
    const restored=await read();check('Reload restores the selected village settings without a query override',VILLAGE_GRAPHICS_KEYS.every(k=>restored.preferences[k]===saved[k]),restored.preferences);
    await page.locator('[data-village-settings-reset]').click();await frames();const defaults=await kept();check('Reset restores village defaults and keeps farm preferences',defaults.villageRenderer==='auto'&&defaults.villagePost==='balanced'&&defaults.villageShadows===true&&defaults.villageDistance==='far'&&defaults.villageGrass==='high'&&defaults.glow&&defaults.shadows,defaults);
    // Leave this UI-only run on GL; native WebGPU is tested by --native --gpu.
    await choose('villageRenderer','webgl');
  }else{
    if(!gpuOnly){
    report.states.baseline=await read();await choose('villagePost','low');const subtle=await read();await choose('villagePost','high');const rich=await read();check('Post choices adjust the real WebGL glow strength',subtle.post.enabled&&rich.post.enabled&&rich.post.bloomStrength>subtle.post.bloomStrength*2,{subtle:subtle.post,rich:rich.post});await choose('villagePost','off');await choose('villageShadows','off');
    check('Post Off bypasses village post processing',(await read()).post.enabled===false);
    check('Village shadow choice changes the actual WebGL shadow setting',!(await read()).glShadows);
    await choose('villageGrass','low');await page.waitForFunction(()=>PumpkinVoxel.scene.villageGraphicsStatus.world.grass.quality==='low'&&PumpkinVoxel.scene.villageGraphicsStatus.world.grass.instances>0);const low=await read();
    check('Low grass reduces actual submitted instances and vertices while stationary',low.world.grass.instances<report.states.baseline.world.grass.instances&&low.world.grass.vertices<report.states.baseline.world.grass.vertices,{high:report.states.baseline.world.grass,low:low.world.grass});
    await choose('villageGrass','off');const off=await read();await frames(4);const offLater=await read();check('Grass Off removes blade work and stops selection',off.world.grass.instances===0&&off.world.grass.vertices===0&&!off.world.grass.visible&&offLater.world.grass.selectionPasses===off.world.grass.selectionPasses,offLater.world.grass);
    await choose('villageGrass','high');await page.waitForFunction(()=>PumpkinVoxel.scene.villageGraphicsStatus.world.grass.instances>0);const high=await read();check('High grass returns immediately at a stationary camera',high.world.grass.instances===report.states.baseline.world.grass.instances&&high.world.grass.vertices===report.states.baseline.world.grass.vertices,high.world.grass);
    await choose('villageDistance','near');await page.waitForFunction(()=>{const d=PumpkinVoxel.scene.villageGraphicsStatus.world.distance;return d.targetDistance===150&&d.drawDistance<250;});report.states.near=await read();check('Near distance reduces actual chunk range behind graduated fog',report.states.near.world.distance.drawDistance>=150&&report.states.near.world.distance.fogDensity>report.states.baseline.world.distance.fogDensity,{before:report.states.baseline.world.distance,after:report.states.near.world.distance});
    await screenshot('native-webgl-settings.png');
    await page.locator('.vg-dock [data-vg-page="map"]').click();await page.waitForFunction(()=>PumpkinVoxel.village.status.panel==='map');const afterMap=await read();check('Opening the real map preserves the selected distance and grass policy',afterMap.preferences.villageDistance==='near'&&afterMap.world.distance.requested==='near'&&afterMap.preferences.villageGrass==='high');await openSettings();
    await choose('villageDistance','far');await page.waitForFunction(()=>PumpkinVoxel.scene.villageGraphicsStatus.world.distance.targetDistance===250);check('Far restores the original chunk range', (await read()).world.distance.drawDistance===250);
    }
    if(gpu){
      await choose('villageGrass','off');await choose('villageRenderer','webgpu');console.log('Waiting for the real WebGPU first frame');
      await page.waitForFunction(()=>['ready','fallback'].includes(PumpkinVoxel.scene.villageRendererStatus.stage),null,{timeout:600000});check('Explicit WebGPU overrides the initial WebGL query and becomes ready',(await read()).renderer.stage==='ready'&&(await read()).renderer.requested==='webgpu');await gpuFrames();report.states.gpuOff=await read();
      // Three r169 still draws its required ACES/sRGB output quad when optional
      // post effects are Off: one scene render plus one display conversion.
      const direct=report.states.gpuOff.renderer;
      check('Post Off skips optional bloom, grade and FXAA; scene and display conversion remain',direct.post.effects==='off'&&!direct.post.hdr&&!direct.post.bloom&&!direct.post.displayGrade&&!direct.post.fxaa&&!direct.post.shadows&&direct.shadowBudget.refreshes===0&&direct.renderPasses===2,{post:direct.post,renderPasses:direct.renderPasses,shadowBudget:direct.shadowBudget});await gpuShot('native-gpu-effects-off.png');
      await choose('villagePost','balanced');await gpuFrames();report.states.gpuBalanced=await read();check('Increasing post effects enables the actual GPU post pipeline',report.states.gpuBalanced.renderer.post.hdr&&report.states.gpuBalanced.renderer.renderPasses>report.states.gpuOff.renderer.renderPasses,report.states.gpuBalanced.renderer.post);await gpuShot('native-gpu-effects-balanced.png');
      const framesBefore=(await read()).renderer.completedFrames;await choose('villageRenderer','auto');await gpuFrames();check('Automatic retains the healthy GPU with a single overlay',(await read()).renderer.completedFrames>framesBefore&&await page.locator('.village-webgpu-canvas').count()===1);
      await choose('villageRenderer','webgl');await page.waitForFunction(()=>PumpkinVoxel.scene.villageRendererStatus.stage==='disabled');check('Switching back to WebGL removes the GPU presentation canvas',await page.locator('.village-webgpu-canvas').count()===0&&(await read()).renderer.backend==='webgl');
    }
    await choose('villageShadows','off');await choose('villagePost','off');await page.evaluate(()=>PumpkinVoxel.village.close());await frames();report.states.farm=await read();check('Returning to the farm restores its original glow and shadow choices',report.states.farm.glShadows===true&&report.states.farm.post.enabled===true&&report.states.farm.farm.bloom===true&&report.states.farm.farm.shadows===true&&!await page.evaluate(()=>PumpkinVoxel.village.active));
    const farmPrefs=await kept();check('Village settings never overwrite farm glow or shadows',farmPrefs.glow===true&&farmPrefs.shadows===true,farmPrefs);
  }
  check('Settings finish without page, shader or loading errors',!report.errors.length&&!report.consoleErrors.length&&!report.externalRequests.length&&!report.failedRequests.length);
}catch(error){report.failure=error.stack??String(error);if(page&&!page.isClosed()){report.lastState=await read().catch(()=>null);await page.screenshot({path:path.join(out,'failure.png'),timeout:30000}).catch(()=>{});}}
finally{clearInterval(activity);report.passed=!report.failure&&report.checks.length>0&&report.checks.every(c=>c.pass)&&!report.errors.length&&!report.consoleErrors.length;await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,htmlSha256:report.htmlSha256,failure:report.failure,out}));if(!report.passed)process.exitCode=1;
