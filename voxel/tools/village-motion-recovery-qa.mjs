// Native regression for idle/walk atlas hand-off, repeated gait frames and dusk.
// Run serially: the full scene's software WebGPU compilation is memory intensive.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { VILLAGE_ATMOSPHERE_CYCLE_SECONDS } from '../src/content/village-grade.js';
import { OUTSIDE_VIEW } from '../src/village-camera.js';

const args = process.argv.slice(2);
if (!args[0] || !args[1]) throw new Error('Usage: node tools/village-motion-recovery-qa.mjs HTML OUT [--webgl | --gpu-readback]');
const file = path.resolve(args[0]), out = path.resolve(args[1]), webgl = args.includes('--webgl'), gpuReadback = args.includes('--gpu-readback');
if (webgl && gpuReadback) throw new Error('--gpu-readback requires the actual WebGPU backend; do not combine it with --webgl');
const hash = value => createHash('sha256').update(value).digest('hex');
// Chromium screenshots are non-interlaced 8-bit RGB/RGBA PNGs. Decode pixels
// locally so changing PNG encoding or metadata cannot masquerade as animation.
function screenshotPixels(png) {
  let width, height, channels, stride, raw, offset = 8; const chunks = [];
  while (offset < png.length) {
    const size = png.readUInt32BE(offset), kind = png.toString('ascii', offset + 4, offset + 8), data = png.subarray(offset + 8, offset + 8 + size); offset += size + 12;
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0; if (data[8] !== 8 || !channels || data[12]) throw Error('Unsupported Chromium screenshot PNG'); }
    if (kind === 'IDAT') chunks.push(data);
    if (kind === 'IEND') break;
  }
  stride = width * channels; raw = inflateSync(Buffer.concat(chunks));
  if (raw.length !== height * (stride + 1)) throw Error('Unexpected screenshot scanline length');
  const decoded = Buffer.alloc(height * stride), rgba = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => { const p = a + b - c, aa = Math.abs(p - a), bb = Math.abs(p - b), cc = Math.abs(p - c); return aa <= bb && aa <= cc ? a : bb <= cc ? b : c; };
  for (let y = 0; y < height; y++) {
    const start = y * stride, input = y * (stride + 1), filter = raw[input];
    if (filter > 4) throw Error('Unknown screenshot PNG filter');
    for (let x = 0; x < stride; x++) { const a = x >= channels ? decoded[start + x - channels] : 0, b = y ? decoded[start + x - stride] : 0, c = y && x >= channels ? decoded[start + x - stride - channels] : 0; decoded[start + x] = raw[input + 1 + x] + (filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c)); }
  }
  for (let p = 0; p < width * height; p++) { rgba[p * 4] = decoded[p * channels]; rgba[p * 4 + 1] = decoded[p * channels + 1]; rgba[p * 4 + 2] = decoded[p * channels + 2]; rgba[p * 4 + 3] = channels === 4 ? decoded[p * channels + 3] : 255; }
  return { width, height, rgba };
}
function pixelDifference(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw Error('World-crop sizes differ');
  let changed = 0, totalDelta = 0;
  for (let p = 0; p < a.rgba.length; p += 4) { const delta = Math.max(Math.abs(a.rgba[p] - b.rgba[p]), Math.abs(a.rgba[p + 1] - b.rgba[p + 1]), Math.abs(a.rgba[p + 2] - b.rgba[p + 2])); if (delta > 8) changed++; totalDelta += delta; }
  return { changedPixels: changed, changedFraction: changed / (a.width * a.height), meanMaxChannelDelta: totalDelta / (a.width * a.height) };
}
function cropPixels(image, clip, rect) {
  const x = Math.round((clip.x - rect.x) * image.width / rect.width), y = Math.round((clip.y - rect.y) * image.height / rect.height);
  const width = Math.round(clip.width * image.width / rect.width), height = Math.round(clip.height * image.height / rect.height);
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width < 1 || height < 1 || x + width > image.width || y + height > image.height) throw Error('World crop is outside the GPU canvas');
  const rgba = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) image.rgba.copy(rgba, row * width * 4, ((y + row) * image.width + x) * 4, ((y + row) * image.width + x + width) * 4);
  return { width, height, rgba };
}
const html = await fs.readFile(file), s = M.freshState(), duskClock = VILLAGE_ATMOSPHERE_CYCLE_SECONDS * 2 / 3;
Object.assign(s, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); s.shop.arrivalTimer = 1e9;
s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.pending = []; s.progression.homeLegacyThrough = 20;
M.inviteToVillage(s); M.finishTour(s); s.village.clock = duskClock;
s.village.quests.invitation = { step: 3, done: true }; s.village.quests['two-doorbells'] = { step: 3, done: true };
s.village.built['elowen-library'] = s.village.built['rowan-workshop'] = true;
s.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
M.startQuest(s, 'rowan-1'); M.actVillageExpansion(s, 'track', { chapter: 'green-research' });
const fixture = M.saveData(s), preferences = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', voxelCharacters: false, glow: true, shadows: true, villageTrackedQuest: 'green-research' };
const launchArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--disable-vulkan-surface'];
const pose = { x: 87, z: -16.5, yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance };
const report = { file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), expectedBackend: webgl ? 'webgl' : 'webgpu', acceptancePath: gpuReadback ? 'webgpu-canvas-readback' : 'visible-page-composite', gpuReadback, viewport: { width: 960, height: 540 }, preferences, launchArgs, pose,
  scope: 'Exact offline HTML on loopback, native game RAF/rendering and genuine keyboard movement. Source actor frame/atlas observations plus rendered screenshots; explicit atlas bindings have separate node-material regression tests. ' + (gpuReadback ? 'Explicit diagnostic GPU-readback acceptance: motion must change the actual WebGPU canvas pixels. Page-composite pixel differences and computed canvas styles remain recorded, but a raw-render pass does NOT establish a live browser page composite. Use only with a separately established software-browser compositor limitation; preserved full GPU-canvas PNGs are the native-render evidence. ' : 'Strict visible-page acceptance: rendered world pixels outside the HUD must change during movement and camera rotation. ') + 'Dawn/SwiftShader is not physical phone/TV FPS. No held draws, simulation fast-forward, manual render or animation calls.',
  checks: [], screenshots: [], visualCaptures: [], segments: [], errors: [], consoleErrors: [], warnings: [], externalRequests: [], failedRequests: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, actual }); console.log(`${pass ? 'ok' : 'FAIL'} ${label}`); if (!pass) throw new Error(`${label}: ${JSON.stringify(actual)}`); };
const bounded = (list, value) => { if (report[list].length < 40) report[list].push(String(value).slice(0, 5000)); };
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ save: fixture, preferences, pose }, null, 2));
const server = createServer((req, res) => { if (req.url === '/favicon.ico') return res.writeHead(204).end(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page, activity;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: launchArgs, timeout: 30000 });
  report.browserVersion = browser.version(); page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 }); page.setDefaultTimeout(180000);
  activity = setInterval(() => page.keyboard.press('Shift').catch(() => {}), 30000);
  page.on('pageerror', e => bounded('errors', e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error') bounded('consoleErrors', m.text()); else if (m.type() === 'warning') bounded('warnings', m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + '/')) bounded('externalRequests', r.url()); });
  page.on('requestfailed', r => bounded('failedRequests', `${r.url().slice(0, 200)}: ${r.failure()?.errorText}`));
  await page.addInitScript(({ fixture, preferences }) => {
    localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(fixture)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(preferences));
    const NativeDate = Date, wall = new NativeDate('2026-11-13T21:00:00Z').getTime();
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [wall])); } static now() { return wall; } };
    let seed = 20261113; Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }, { fixture, preferences });
  await page.goto(`${origin}/${webgl ? '?villageRenderer=webgl' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('body[data-ready]');
  const status = () => page.evaluate(() => PumpkinVoxel.scene.villageRendererStatus);
  const nativeFrames = async (count = 2) => {
    if (webgl) await page.evaluate(count => new Promise(resolve => { const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }), count);
    else { const start = (await status()).completedFrames ?? 0; await page.waitForFunction(({ start, count }) => PumpkinVoxel.scene.villageRendererStatus.stage === 'fallback' || PumpkinVoxel.scene.villageRendererStatus.completedFrames >= start + count, { start, count }, { timeout: 180000 }); check('Native GPU frames continue without fallback', (await status()).stage === 'ready'); }
  };
  const worldClip = { x: 350, y: 170, width: 430, height: 270 }; let firstWorld = null, firstGpuWorld = null;
  const shot = async name => {
    await nativeFrames(); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name);
    // This central crop excludes the HUD and thumbsticks. A live counter or
    // HTML label over a frozen world must never satisfy the motion acceptance.
    const cropName = name.replace('.png', '-world-crop.png'), bytes = await page.screenshot({ path: path.join(out, cropName), clip: worldClip, timeout: 180000 }), pixels = screenshotPixels(bytes);
    const capture = { file: name, crop: cropName, clip: worldClip, pngSha256: hash(bytes), pixelSha256: hash(pixels.rgba), renderer: await status(), canvases: [] };
    const canvases = await page.evaluate(() => {
      const original = PumpkinVoxel.scene.debug.renderer.domElement, gpu = document.querySelector('.village-webgpu-canvas');
      return [['webgl', original], ['webgpu', gpu]].filter(([, canvas]) => canvas).map(([backend, canvas]) => {
        const s = getComputedStyle(canvas), r = canvas.getBoundingClientRect();
        const result = { backend, hidden: canvas.hidden, width: canvas.width, height: canvas.height, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, css: { display: s.display, visibility: s.visibility, opacity: s.opacity, zIndex: s.zIndex, position: s.position, transform: s.transform, pointerEvents: s.pointerEvents }, parent: canvas.parentElement?.className, ancestors: [] };
        for (let p = canvas.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); result.ancestors.push({ tag: p.tagName, id: p.id, hidden: p.hidden, display: s.display, visibility: s.visibility, opacity: s.opacity, zIndex: s.zIndex }); }
      // Default acceptance uses the page screenshot. The explicit diagnostic
      // mode below instead checks this real canvas without altering its frame.
        try { result.png = canvas.toDataURL('image/png'); } catch (error) { result.readbackError = String(error); }
        return result;
      });
    });
    for (const canvas of canvases) {
      const { png, ...details } = canvas;
      if (png?.startsWith('data:image/png;base64,')) {
        const bytes = Buffer.from(png.split(',')[1], 'base64'), image = screenshotPixels(bytes), output = name.replace('.png', `-${canvas.backend}-canvas.png`); await fs.writeFile(path.join(out, output), bytes);
        details.readback = { file: output, pngSha256: hash(bytes), pixelSha256: hash(image.rgba), opaquePixels: image.rgba.filter((v, i) => i % 4 === 3 && v > 0).length };
        if (canvas.backend === 'webgpu') {
          const crop = cropPixels(image, worldClip, canvas.rect), opaque = crop.rgba.filter((v, i) => i % 4 === 3 && v > 0).length;
          capture.gpuWorld = { width: crop.width, height: crop.height, pixelSha256: hash(crop.rgba), opaqueFraction: opaque / (crop.width * crop.height), ...(firstGpuWorld ? { changeFromInitial: pixelDifference(firstGpuWorld, crop) } : {}) };
          firstGpuWorld ??= crop;
          // The fixed dusk entrance pose has open sky here. A changing opaque
          // world alone cannot detect a black sky caused by a bad colour port.
          // Keep this acceptance specific to the raw GPU fixture's first view.
          if (gpuReadback && name === 'webgpu-dusk-world.png') {
            const region = { x: Math.floor(image.width * .02), y: Math.floor(image.height * .01), width: Math.floor(image.width * .33), height: Math.floor(image.height * .08) };
            let violet = 0, dark = 0; const total = region.width * region.height, sum = [0, 0, 0];
            for (let y = region.y; y < region.y + region.height; y++) for (let x = region.x; x < region.x + region.width; x++) {
              const at = (y * image.width + x) * 4, r = image.rgba[at], g = image.rgba[at + 1], b = image.rgba[at + 2], peak = Math.max(r, g, b);
              if (b > 8 && peak > 12 && b >= g && image.rgba[at + 3] > 0) violet++;
              if (peak <= 12) dark++;
              sum[0] += r; sum[1] += g; sum[2] += b;
            }
            capture.gpuSky = { region, totalPixels: total, nonblackVioletPixels: violet, nonblackVioletFraction: violet / total, nearBlackFraction: dark / total, meanRgb: sum.map(v => v / total) };
          }
        }
      }
      capture.canvases.push(details);
    }
    if (firstWorld) capture.changeFromInitial = pixelDifference(firstWorld, pixels); else firstWorld = pixels;
    report.visualCaptures.push(capture); console.log(`shot ${name}`);
    if (capture.changeFromInitial) {
      capture.pageCompositeChanged = capture.changeFromInitial.changedFraction > .01;
      if (!gpuReadback) check(`${name}: rendered world visibly changes outside the HUD`, capture.pageCompositeChanged, capture.changeFromInitial);
    }
    if (gpuReadback) {
      check(`${name}: real WebGPU readback contains an opaque world`, capture.gpuWorld?.opaqueFraction > .95, capture.gpuWorld);
      if (name === 'webgpu-dusk-world.png') check('Initial GPU dusk sky retains visible violet cloud colour', capture.gpuSky?.nonblackVioletFraction > .70, capture.gpuSky);
      if (capture.changeFromInitial) check(`${name}: actual GPU-rendered world changes outside the HUD`, capture.gpuWorld?.changeFromInitial?.changedFraction > .01, capture.gpuWorld);
    }
  };
  const open = async () => {
    await page.evaluate(({ pose, duskClock }) => { const p = PumpkinVoxel; p.scene.player.setEnabled(true, 'natalie'); p.state().village.clock = duskClock; p.openVillage(); p.village.place(pose.x, pose.z, { x: 0, z: -1 }); p.scene.villageView.play.reset(p.scene.villageView.play.state.subject, pose); }, { pose, duskClock });
    await page.waitForFunction(() => ['ready', 'fallback', 'disabled'].includes(PumpkinVoxel.scene.villageRendererStatus?.stage), null, { timeout: 600000 });
    const found = await status(); check('Requested native renderer becomes ready', webgl ? found.stage === 'disabled' && found.backend === 'webgl' : found.stage === 'ready' && found.actualBackend === 'webgpu', found);
    await nativeFrames();
  };
  await open(); await page.waitForFunction(() => PumpkinVoxel.scene.villageView.fidelityStats.sky.artReady);
  // Read-only observer. It never advances a game clock, changes a frame, or draws.
  await page.evaluate(() => {
    const capture = window.__villageMotionQA = { segment: 'idle', samples: [], stopped: false };
    capture.read = () => {
      const p = PumpkinVoxel, actor = p.scene.villageView.scene.children.find(o => typeof o.userData?.playerAnimate === 'function');
      const d = actor?.userData, mesh = actor?.children[0]?.children.find(o => o.isMesh);
      return { segment: capture.segment, at: performance.now(), position: { ...p.village.status.position }, direction: d?.playerDirection, frame: d?.playerDirectionFrame, authored: !!d?.playerAuthoredDirection, idle: !!d?.playerAuthoredIdle, leg: d?.playerLeadingLeg, geometry: mesh?.geometry?.uuid, map: mesh?.material?.map?.uuid, material: mesh?.material?.uuid, materialVersion: mesh?.material?.version, stature: d?.playerStature, gpuFrames: p.scene.villageRendererStatus.completedFrames ?? 0 };
    };
    const sample = () => { if (capture.stopped) return; const next = capture.read(), last = capture.samples.at(-1); if (!last || next.segment !== last.segment || next.geometry !== last.geometry || next.map !== last.map || next.gpuFrames !== last.gpuFrames || Math.hypot(next.position.x - last.position.x, next.position.z - last.position.z) > .001) { capture.samples.push(next); if (capture.samples.length > 1600) capture.samples.shift(); } requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  });
  await shot(`${webgl ? 'webgl' : 'webgpu'}-dusk-world.png`);
  report.distanceDetail = await page.evaluate(() => PumpkinVoxel.scene.villageView.grassDetailStats);
  check('Distant grass submits fewer vertices with its long fade retained', report.distanceDetail?.vertices > 0 && report.distanceDetail.vertices < report.distanceDetail.fullVertices && report.distanceDetail.middlePatches + report.distanceDetail.farPatches > 0, report.distanceDetail);

  const segment = async (name, key, distance = 1.8, picture = null) => {
    const before = await page.evaluate(name => { window.__villageMotionQA.segment = name; return window.__villageMotionQA.read(); }, name), beforeRenderer = await status();
    try {
      await page.keyboard.down(key);
      await page.waitForFunction(({ before, distance, name }) => { const q = window.__villageMotionQA, now = q.read(); return Math.hypot(now.position.x - before.position.x, now.position.z - before.position.z) >= distance && q.samples.filter(s => s.segment === name && s.authored && !s.idle).length >= 4; }, { before, distance, name }, { timeout: 180000 });
      if (picture) await shot(picture);
    } finally { await page.keyboard.up(key); }
    const result = await page.evaluate(({ name, before }) => { const q = window.__villageMotionQA, after = q.read(), samples = q.samples.filter(s => s.segment === name); return { name, before, after, distance: Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z), frames: [...new Set(samples.map(s => s.geometry))], maps: [...new Set(samples.map(s => s.map))], directions: [...new Set(samples.map(s => s.direction))], legs: [...new Set(samples.map(s => s.leg).filter(Boolean))], samples }; }, { name, before });
    result.beforeRenderer = beforeRenderer; result.afterRenderer = await status(); report.segments.push(result);
    check(`${name}: genuine keyboard movement advances the owner`, result.distance >= distance, { distance: result.distance, direction: result.directions });
    check(`${name}: authored walking advances through distinct drawings`, result.frames.length >= 3, { frames: result.frames.length, maps: result.maps });
    return result;
  };
  const forward = await segment('forward', 'w', 2.8, 'natalie-walking-away.png');
  check('Forward walking alternates left and right leading legs', forward.legs.includes('left') && forward.legs.includes('right'), forward.legs);
  await segment('turn-right', 'd', 1.3, 'natalie-walking-right.png');
  await page.evaluate(() => { window.__villageMotionQA.segment = 'rest'; }); await nativeFrames(3);
  report.rest = await page.evaluate(() => window.__villageMotionQA.samples.filter(s => s.segment === 'rest'));
  check('Releasing movement settles into an authored contact pose', report.rest.some(s => s.idle), report.rest.slice(-3));
  // Walking back toward the camera exercises the separate front atlas at rest.
  await segment('toward-camera', 's', 1.8);
  await page.evaluate(() => { window.__villageMotionQA.segment = 'front-rest'; }); await nativeFrames(3);
  report.frontRest = await page.evaluate(() => window.__villageMotionQA.read());
  await segment('resume', 'w', 2.8);
  report.warmCounters = await status();
  check('Resuming after idle keeps the same live material identity', new Set(report.segments.flatMap(s => s.samples.map(f => f.material))).size === 1);
  const sourceVersions = [...new Set(report.segments.flatMap(s => s.samples.map(f => f.materialVersion)))];
  check('Changing gait atlases does not request material recompilation', sourceVersions.length === 1, sourceVersions);
  if (!webgl) check('GPU submission remains bounded to one frame', report.warmCounters.maxFramesInFlight === 1 && report.warmCounters.materials.unsupported === 0, { maxInFlight: report.warmCounters.maxFramesInFlight, geometryViews: report.warmCounters.ownedGeometryViews, created: report.warmCounters.geometryViewsCreated, retired: report.warmCounters.geometryViewsRetired });
  await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView; v.play.reset(v.play.state.subject, { yaw: .45, pitch: -.12, distance: 7.6 }); });
  await shot(`${webgl ? 'webgl' : 'webgpu'}-sky-tilted.png`);
  report.sky = await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView, halo = v.scene.getObjectByName('village-moon-halo'); return { fidelity: v.fidelityStats.sky, exposure: v.scene.userData.exposure, halo: halo ? { opacity: halo.material.opacity, size: halo.scale.x } : null }; });
  check('Moon glow is local and restrained', report.sky.halo?.size === 88 && report.sky.halo.opacity === .34, report.sky.halo);
  await page.evaluate(() => { window.__villageMotionQA.stopped = true; PumpkinVoxel.village.close(); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  report.returned = await page.evaluate(() => {
    const overlays = [...document.querySelectorAll('.village-webgpu-canvas')].map(c => { const s = getComputedStyle(c); return { hiddenAttribute: c.hidden, display: s.display, visibility: s.visibility, opacity: s.opacity, concealed: s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || Number(s.opacity) === 0 }; });
    return { active: PumpkinVoxel.village.active, playerEnabled: PumpkinVoxel.scene.player.enabled, overlays, overlaysHidden: overlays.every(c => c.concealed), renderer: PumpkinVoxel.scene.villageRendererStatus };
  });
  check('Returning to farm hides the village renderer and restores play', !report.returned.active && report.returned.playerEnabled && report.returned.overlaysHidden, report.returned);
  const prior = report.returned.renderer.completedFrames ?? 0; await open(); report.reentered = await status();
  check('Warm village re-entry continues rendering', webgl ? report.reentered.backend === 'webgl' : report.reentered.completedFrames > prior && report.reentered.stage === 'ready', report.reentered);
  check('No page, shader or loading errors', !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length, { errors: report.errors, consoleErrors: report.consoleErrors, failedRequests: report.failedRequests, externalRequests: report.externalRequests });
} catch (error) {
  report.failure = error.stack ?? String(error);
  if (page && !page.isClosed()) { await page.keyboard.up('w').catch(() => {}); await page.keyboard.up('d').catch(() => {}); await page.keyboard.up('s').catch(() => {}); report.lastState = await page.evaluate(() => ({ village: window.PumpkinVoxel?.village.status, renderer: window.PumpkinVoxel?.scene.villageRendererStatus, recentMotion: window.__villageMotionQA?.samples.slice(-20) })).catch(() => null); await page.screenshot({ path: path.join(out, 'failure.png'), timeout: 30000 }).then(() => report.screenshots.push('failure.png')).catch(() => {}); }
} finally {
  clearInterval(activity); report.passed = !report.failure && report.checks.length > 0 && report.checks.every(c => c.pass);
  const pageChanges = report.visualCaptures.filter(c => c.changeFromInitial);
  report.pageCompositeAccepted = pageChanges.length >= 3 && pageChanges.every(c => c.pageCompositeChanged);
  report.pageCompositorLimitationObserved = gpuReadback && pageChanges.some(c => !c.pageCompositeChanged && c.gpuWorld?.changeFromInitial?.changedFraction > .01);
  await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2));
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify({ passed: report.passed, htmlSha256: report.htmlSha256, checks: report.checks.length, failure: report.failure }));
if (!report.passed) process.exitCode = 1;
