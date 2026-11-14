// Focused native acceptance for stationary selection, hidden ambience and return.
// Run serially: the exact game's cold software WebGPU compilation is expensive.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { VILLAGE_ATMOSPHERE_CYCLE_SECONDS } from '../src/content/village-grade.js';
import { OUTSIDE_VIEW } from '../src/village-camera.js';

const args = process.argv.slice(2), webgl = args.includes('--webgl'), gpuReadback = args.includes('--gpu-readback'), frameBudget = args.includes('--frame-budget');
if (!args[0] || !args[1] || webgl === gpuReadback) throw Error('Usage: node tools/village-detail-polish-qa.mjs HTML OUT (--webgl | --gpu-readback) [--mobile]');
const file = path.resolve(args[0]), out = path.resolve(args[1]), hash = value => createHash('sha256').update(value).digest('hex');
const viewport = args.includes('--mobile') ? { width: 844, height: 390 } : { width: 960, height: 540 };
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
const pose = { x: 87, z: -16.5, yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance };
const launchArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--disable-vulkan-surface'];
const report = { file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), viewport, preferences, pose, launchArgs,
  expectedBackend: webgl ? 'webgl' : 'webgpu', acceptancePath: gpuReadback ? 'webgpu-canvas-readback' : 'visible-page-composite',
  scope: 'Exact offline game HTML on loopback, one native village entry, genuine keyboard walking, public hall entry/exit and native game RAF/rendering. No held draws, advance(), manual tick or manual render. Stationary counter checks are conditional on exactly unchanged horizontal camera/target; changing smoothing poses are reported, with exact stationary behavior covered by Node tests. GPU acceptance reads actual canvas pixels because this software Chromium runner has a separately reproduced page-compositor defect; raw success does not certify page compositing or physical phone/TV FPS.',
  checks: [], visualCaptures: [], errors: [], consoleErrors: [], warnings: [], externalRequests: [], failedRequests: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, actual }); console.log(`${pass ? 'ok' : 'FAIL'} ${label}`); if (!pass) throw Error(`${label}: ${JSON.stringify(actual)}`); };
const bounded = (key, value) => { if (report[key].length < 40) report[key].push(String(value).slice(0, 3000)); };
await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ fixture, preferences, pose }, null, 2));
const server = createServer((req, res) => { if (req.url === '/favicon.ico') return res.writeHead(204).end(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page, activity;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: launchArgs, timeout: 30000 }); report.browserVersion = browser.version();
  page = await browser.newPage({ viewport, deviceScaleFactor: 1, hasTouch: args.includes('--mobile') }); page.setDefaultTimeout(180000);
  activity = setInterval(() => page.keyboard.press('Shift').catch(() => {}), 30000);
  page.on('pageerror', e => bounded('errors', e.stack ?? e.message)); page.on('console', m => { if (m.type() === 'error') bounded('consoleErrors', m.text()); else if (m.type() === 'warning') bounded('warnings', m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + '/')) bounded('externalRequests', r.url()); }); page.on('requestfailed', r => bounded('failedRequests', `${r.url().slice(0, 200)}: ${r.failure()?.errorText}`));
  await page.addInitScript(({ fixture, preferences }) => {
    localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(fixture)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(preferences));
    const NativeDate = Date, wall = new NativeDate('2026-11-13T21:00:00Z').getTime(); window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [wall])); } static now() { return wall; } };
    let seed = 20261113; Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }, { fixture, preferences });
  await page.goto(`${origin}/${webgl ? '?villageRenderer=webgl' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForSelector('body[data-ready]');
  console.log('setup: exact HTML ready; opening native village');
  const status = () => page.evaluate(() => PumpkinVoxel.scene.villageRendererStatus);
  const nativeFrames = async (count = 2) => {
    if (webgl) await page.evaluate(count => new Promise(resolve => { const next = () => --count <= 0 ? resolve() : requestAnimationFrame(next); requestAnimationFrame(next); }), count);
    else { const start = (await status()).completedFrames ?? 0; await page.waitForFunction(({ start, count }) => PumpkinVoxel.scene.villageRendererStatus.stage === 'fallback' || PumpkinVoxel.scene.villageRendererStatus.completedFrames >= start + count, { start, count }, { timeout: 180000 }); check('Native GPU frames continue without fallback', (await status()).stage === 'ready'); }
  };
  await page.evaluate(({ pose, duskClock }) => { const p = PumpkinVoxel; p.scene.player.setEnabled(true, 'natalie'); p.state().village.clock = duskClock; p.openVillage(); p.village.place(pose.x, pose.z, { x: 0, z: -1 }); p.scene.villageView.play.reset(p.scene.villageView.play.state.subject, pose); }, { pose, duskClock });
  console.log('setup: waiting for native renderer first frame');
  await page.waitForFunction(() => ['ready', 'fallback', 'disabled'].includes(PumpkinVoxel.scene.villageRendererStatus?.stage), null, { timeout: 600000 });
  report.ready = await status(); check('Requested renderer becomes ready', webgl ? report.ready.stage === 'disabled' && report.ready.backend === 'webgl' : report.ready.stage === 'ready' && report.ready.actualBackend === 'webgpu', report.ready);
  await nativeFrames(); await page.waitForFunction(() => PumpkinVoxel.scene.villageView.fidelityStats.sky.artReady);
  await page.evaluate(() => {
    const q = window.__detailQA = { segment: 'initial', samples: [], gpuFrames: [], stopped: false };
    q.read = () => {
      const p = PumpkinVoxel, v = p.scene.villageView, actor = v.scene.children.find(o => typeof o.userData?.playerAnimate === 'function'), d = actor?.userData, mesh = actor?.children[0]?.children.find(o => o.isMesh), target = v.play.state.target;
      return { segment: q.segment, position: { ...p.village.status.position }, targetScan: p.village.status.targetScan, inside: v.inside, camera: v.camera.position.toArray(), target: [target.x, target.y, target.z], grass: v.grassDetailStats, life: v.lifeDetailStats, lamps: { ...v.lampSelectionStats },
        lighting: v.scene.children.filter(o => o.isPointLight).map(o => ({ visible: o.visible, position: o.position.toArray(), intensity: o.intensity })),
        actor: { authored: !!d?.playerAuthoredDirection, idle: !!d?.playerAuthoredIdle, direction: d?.playerDirection, frame: d?.playerDirectionFrame, leg: d?.playerLeadingLeg, geometry: mesh?.geometry?.uuid, map: mesh?.material?.map?.uuid, material: mesh?.material?.uuid, materialVersion: mesh?.material?.version }, renderer: p.scene.villageRendererStatus };
    };
    const observe = () => {
      if (q.stopped) return;
      const value = q.read(), last = q.samples.at(-1), r = value.renderer;
      if (r.renderFrames && q.gpuFrames.at(-1)?.renderFrames !== r.renderFrames) {
        q.gpuFrames.push({ segment: q.segment, renderFrames: r.renderFrames, completedFrames: r.completedFrames, renderPasses: r.renderPasses, calls: r.calls, triangles: r.triangles, shadowBudget: r.shadowBudget ? { ...r.shadowBudget } : null });
        if (q.gpuFrames.length > 256) q.gpuFrames.shift();
      }
      if (!last || last.segment !== value.segment || last.actor.geometry !== value.actor.geometry || last.actor.map !== value.actor.map || last.renderer.completedFrames !== value.renderer.completedFrames) { q.samples.push(value); if (q.samples.length > 800) q.samples.shift(); }
      requestAnimationFrame(observe);
    }; requestAnimationFrame(observe);
  });
  const read = () => page.evaluate(() => window.__detailQA.read());
  const worldClip = { x: Math.round(viewport.width * .35), y: Math.round(viewport.height * .31), width: Math.round(viewport.width * .43), height: Math.round(viewport.height * .46) };
  let firstPage = null, firstGpu = null;
  const shot = async (name, initial = false) => {
    await nativeFrames(); const pageBytes = await page.screenshot({ path: path.join(out, name), timeout: 180000 }), pageImage = screenshotPixels(pageBytes), pageCrop = cropPixels(pageImage, worldClip, { x: 0, y: 0, ...viewport });
    const capture = { file: name, pageSha256: hash(pageBytes), pageWorldSha256: hash(pageCrop.rgba), state: await read() };
    if (firstPage) capture.pageChange = pixelDifference(firstPage, pageCrop); else firstPage = pageCrop;
    if (gpuReadback) {
      const canvas = await page.evaluate(() => { const c = document.querySelector('.village-webgpu-canvas'), r = c.getBoundingClientRect(), s = getComputedStyle(c); return { png: c.toDataURL('image/png'), rect: { x: r.x, y: r.y, width: r.width, height: r.height }, style: { display: s.display, visibility: s.visibility, opacity: s.opacity } }; });
      const bytes = Buffer.from(canvas.png.split(',')[1], 'base64'), image = screenshotPixels(bytes), crop = cropPixels(image, worldClip, canvas.rect), rawFile = name.replace('.png', '-webgpu-canvas.png'); await fs.writeFile(path.join(out, rawFile), bytes);
      let opaque = 0; for (let i = 3; i < crop.rgba.length; i += 4) if (crop.rgba[i] > 0) opaque++;
      capture.gpu = { file: rawFile, pngSha256: hash(bytes), worldPixelSha256: hash(crop.rgba), opaqueFraction: opaque / (crop.width * crop.height), style: canvas.style, ...(firstGpu ? { change: pixelDifference(firstGpu, crop) } : {}) }; firstGpu ??= crop;
      check(`${name}: actual GPU colour buffer is opaque`, capture.gpu.opaqueFraction > .95, capture.gpu.opaqueFraction);
      if (capture.gpu.change) check(`${name}: actual GPU world pixels change`, capture.gpu.change.changedFraction > .01, capture.gpu.change);
      if (initial) {
        const region = { x: Math.floor(image.width * .02), y: Math.floor(image.height * .01), width: Math.floor(image.width * .33), height: Math.floor(image.height * .08) }; let violet = 0;
        for (let y = region.y; y < region.y + region.height; y++) for (let x = region.x; x < region.x + region.width; x++) { const at = (y * image.width + x) * 4, r = image.rgba[at], g = image.rgba[at + 1], b = image.rgba[at + 2]; if (b > 8 && Math.max(r, g, b) > 12 && b >= g && image.rgba[at + 3] > 0) violet++; }
        capture.violetSkyFraction = violet / (region.width * region.height); check('Native dusk sky retains violet cloud colour', capture.violetSkyFraction > .70, capture.violetSkyFraction);
      }
    } else if (capture.pageChange) check(`${name}: visible world pixels change`, capture.pageChange.changedFraction > .01, capture.pageChange);
    report.visualCaptures.push(capture); console.log(`shot ${name}`);
  };
  await shot('entrance.png', true);
  report.initial = await read(); check('Grass, ambient and lamp diagnostics are available', report.initial.grass && report.initial.life && report.initial.lamps && Number.isFinite(report.initial.life.bufferUpdates));
  check('Distance detail still reduces grass vertices', report.initial.grass.vertices > 0 && report.initial.grass.vertices < report.initial.grass.fullVertices, report.initial.grass);
  const stillBefore = await read(); await nativeFrames(frameBudget ? 6 : 3); const stillAfter = await read();
  const cameraStill = [0, 2].every(i => stillBefore.camera[i] === stillAfter.camera[i]), targetStill = [0, 2].every(i => stillBefore.target[i] === stillAfter.target[i]);
  report.stationary = { before: stillBefore, after: stillAfter, cameraStill, targetStill, note: 'Exact stationary assertions run only when the native pose is unchanged; smoothing movement is not suppressed.' };
  if (cameraStill) check('Stationary camera avoids repeated grass selection', stillAfter.grass.selectionPasses === stillBefore.grass.selectionPasses && stillAfter.grass.patchChecks === stillBefore.grass.patchChecks);
  if (targetStill) check('Stationary target avoids repeated nearest-lamp searches', stillAfter.lamps.selections === stillBefore.lamps.selections && stillAfter.lamps.cacheHits > stillBefore.lamps.cacheHits);
  check('Visible ambient animation continues during native stationary frames', stillAfter.life.bufferUpdates > stillBefore.life.bufferUpdates, { before: stillBefore.life, after: stillAfter.life });
  if (frameBudget) {
    const a = stillBefore.targetScan, b = stillAfter.targetScan;
    const checked = b.nodePositionsChecked - a.nodePositionsChecked, eligible = b.nodeEligibilityChecks - a.nodeEligibilityChecks;
    check('Nearby target broad phase avoids distant readiness work', checked > 0 && eligible < checked * .2, { positionsChecked: checked, readinessChecks: eligible });
    if (!webgl && targetStill) {
      const a = stillBefore.renderer.shadowBudget, b = stillAfter.renderer.shadowBudget;
      check('Stationary GPU shadows defer redundant requests between accepted frames', b.frames > a.frames && b.deferred > a.deferred && b.refreshes - a.refreshes < b.frames - a.frames, { before: a, after: b });
    }
    if (!webgl) {
      // Exercise real mirror attachment/removal without changing authored scenery.
      // Hidden attached meshes must retain a lease; detached ones must release it.
      const count = 24, before = (await read()).renderer.materials;
      await page.evaluate(count => {
        const scene = PumpkinVoxel.scene.villageView.scene; let source;
        scene.traverse(o => { if (!source && o.type === 'Mesh' && o.material?.isMeshBasicMaterial) source = o; });
        if (!source) throw Error('No ordinary village mesh for native lifetime check');
        window.__detailQA.leaseProbes = Array.from({ length: count }, () => {
          const mesh = new source.constructor(source.geometry, source.material); mesh.visible = false; mesh.name = 'qa-material-lease'; scene.add(mesh); return mesh;
        });
      }, count);
      try {
        await nativeFrames(2); const attached = (await read()).renderer.materials;
        check('Hidden attached native meshes retain their presentation materials', attached.activeMaterials >= before.activeMaterials + count, { before: before.activeMaterials, attached: attached.activeMaterials });
        await page.evaluate(() => { for (const mesh of window.__detailQA.leaseProbes) mesh.removeFromParent(); });
        await nativeFrames(2); const detached = (await read()).renderer.materials;
        check('Detached native meshes retire materials and bindings', detached.materialRetirements >= attached.materialRetirements + count && detached.activeMaterials <= attached.activeMaterials - count && detached.activeBindings < attached.activeBindings, { attached, detached });
        report.nativeMaterialLifetime = { count, before, attached, detached };
      } finally {
        await page.evaluate(() => { for (const mesh of window.__detailQA.leaseProbes ?? []) mesh.removeFromParent(); delete window.__detailQA.leaseProbes; });
      }
    }
  }
  const walkBefore = await page.evaluate(() => { window.__detailQA.segment = 'walk'; return window.__detailQA.read(); });
  try {
    await page.keyboard.down('w');
    await page.waitForFunction(before => { const q = window.__detailQA, now = q.read(), walk = q.samples.filter(s => s.segment === 'walk' && s.actor.authored && !s.actor.idle); return Math.hypot(now.position.x - before.position.x, now.position.z - before.position.z) >= 2.8 && new Set(walk.map(s => s.actor.geometry)).size >= 3; }, walkBefore, { timeout: 180000 });
    await shot('walking.png');
  } finally { await page.keyboard.up('w'); }
  report.walk = await page.evaluate(before => { const q = window.__detailQA, after = q.read(), samples = q.samples.filter(s => s.segment === 'walk'); return { before, after, distance: Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z), legs: [...new Set(samples.map(s => s.actor.leg).filter(Boolean))], geometryFrames: new Set(samples.map(s => s.actor.geometry)).size, samples }; }, walkBefore);
  check('Genuine movement advances Natalie through alternating authored steps', report.walk.distance >= 2.8 && report.walk.geometryFrames >= 3 && report.walk.legs.includes('left') && report.walk.legs.includes('right'), { distance: report.walk.distance, geometryFrames: report.walk.geometryFrames, legs: report.walk.legs });
  check('Moving the camera refreshes grass and lamp selection', report.walk.after.grass.selectionPasses > walkBefore.grass.selectionPasses && report.walk.after.lamps.selections > walkBefore.lamps.selections);
  await page.evaluate(() => { window.__detailQA.segment = 'idle'; }); await nativeFrames(3);
  await page.waitForFunction(() => window.__detailQA.read().actor.idle, null, { timeout: 180000 }); report.idle = await read();
  check('Releasing movement restores an authored idle without recompiling its material', report.idle.actor.idle && report.idle.actor.material === walkBefore.actor.material && report.idle.actor.materialVersion === walkBefore.actor.materialVersion, report.idle.actor);
  if (!webgl) check('GPU submission remains bounded and all materials supported', report.idle.renderer.maxFramesInFlight === 1 && report.idle.renderer.materials.unsupported === 0, report.idle.renderer.materials);
  report.hallEntry = await page.evaluate(() => { const p = PumpkinVoxel, id = 'rowan-workshop', door = p.scene.villageView.insidePlan(id).door, [nx, nz] = { north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] }[door.facing]; p.village.place((door.x + nx * 1.4) * 1.5, (door.z + nz * 1.4) * 1.5); p.village.enterHall(id); return { id, door }; });
  console.log('setup: Rowan hall entered through public controls; waiting for native frames');
  await page.waitForFunction(() => PumpkinVoxel.village.status.inside === 'rowan-workshop'); await nativeFrames();
  const hallBefore = await read(); await nativeFrames(3); const hallAfter = await read(); report.hidden = { before: hallBefore, after: hallAfter };
  check('The hidden outdoor surface stops grass selection', !hallAfter.grass.visible && hallAfter.grass.patchChecks === hallBefore.grass.patchChecks, { before: hallBefore.grass, after: hallAfter.grass });
  check('The hidden outdoor life stops instance and point updates', !hallAfter.life.visible && hallAfter.life.hiddenTicks > hallBefore.life.hiddenTicks && ['bufferUpdates', 'matrixWrites', 'pointWrites'].every(key => hallAfter.life[key] === hallBefore.life[key]), { before: hallBefore.life, after: hallAfter.life });
  check('The interior retains a finite fixed pool of eight lights', hallAfter.lighting.length === 8 && hallAfter.lighting.every(l => l.visible && Number.isFinite(l.intensity) && l.position.every(Number.isFinite)), hallAfter.lighting);
  if (frameBudget) {
    check('Interior frames stop surface resource target scans', hallAfter.targetScan.nodePositionsChecked === hallBefore.targetScan.nodePositionsChecked);
    if (!webgl) check('Entering the workshop refreshes its shadow context', hallAfter.renderer.shadowBudget.invalidations > report.idle.renderer.shadowBudget.invalidations);
  }
  await shot('rowan-interior.png');
  await page.evaluate(() => PumpkinVoxel.village.leaveHall()); await page.waitForFunction(() => !PumpkinVoxel.village.status.inside); await nativeFrames();
  report.returned = await read();
  check('Returning outdoors refreshes grass and resumes ambient life', report.returned.grass.visible && report.returned.life.visible && report.returned.grass.selectionPasses > hallAfter.grass.selectionPasses && report.returned.life.bufferUpdates > hallAfter.life.bufferUpdates, { grass: report.returned.grass, life: report.returned.life });
  check('Returning outdoors refreshes the surface lamp selection', report.returned.lamps.selections > hallAfter.lamps.selections && report.returned.lighting.length === 8, report.returned.lamps);
  if (frameBudget && !webgl) check('Returning outside refreshes its shadow context', report.returned.renderer.shadowBudget.invalidations > hallAfter.renderer.shadowBudget.invalidations);
  await shot('surface-return.png');
  report.submittedFrames = await page.evaluate(() => window.__detailQA.gpuFrames);
  report.textureCounters = { initial: report.initial.renderer.materials, returned: report.returned.renderer.materials, note: 'Observed counters only: first-use textures and hall material creation make an exact per-frame ratio inappropriate.' };
  await page.evaluate(() => { window.__detailQA.stopped = true; PumpkinVoxel.village.close(); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  check('Closing the village restores the farm', await page.evaluate(() => !PumpkinVoxel.village.active && PumpkinVoxel.scene.player.enabled && [...document.querySelectorAll('.village-webgpu-canvas')].every(c => { const s = getComputedStyle(c); return s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0; })));
  check('No page, shader or loading errors', !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length, { errors: report.errors, consoleErrors: report.consoleErrors, externalRequests: report.externalRequests, failedRequests: report.failedRequests });
} catch (error) {
  report.failure = error.stack ?? String(error);
  if (page && !page.isClosed()) { await page.keyboard.up('w').catch(() => {}); report.lastState = await page.evaluate(() => window.__detailQA?.read() ?? { renderer: window.PumpkinVoxel?.scene?.villageRendererStatus }).catch(() => null); await page.screenshot({ path: path.join(out, 'failure.png'), timeout: 30000 }).catch(() => {}); }
} finally {
  clearInterval(activity); report.passed = !report.failure && report.checks.length > 0 && report.checks.every(c => c.pass);
  report.pageCompositorLimitationObserved = gpuReadback && report.visualCaptures.some(c => c.pageChange?.changedFraction <= .01 && c.gpu?.change?.changedFraction > .01);
  await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2)); await browser?.close(); await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, htmlSha256: report.htmlSha256, failure: report.failure, out })); if (!report.passed) process.exitCode = 1;
