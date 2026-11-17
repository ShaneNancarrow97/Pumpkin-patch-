// First-person owner walkthrough flow and layout QA. Run against an isolated
// build: node tools/qa-maze-ride.mjs /tmp/maze.html /tmp/maze-qa
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { freshState, update } from '../src/model.js';
import { foyerLayout } from '../src/rules/hollow-house.js';
import { buildMazeRideConfig } from '../src/rules/maze-ride.js';

if (!process.argv[2]) throw Error('Pass the built offline HTML path.');
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] || '/tmp/maze-ride-qa');
fs.mkdirSync(out, { recursive: true });
const checks = [], errors = [], externalRequests = [], samples = [];
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) throw Error(`${label}: ${JSON.stringify(data)}`);
};
const prefabs = ['cobweb-canopy', 'whispering-portraits', 'spectral-parade', 'thunder-chamber', 'phantom-finale'];
// Generate a receipt through the ordinary ticket rules, then freeze the farm.
const seed = freshState();
Object.assign(seed.hollowHouse, { purchased: true, status: 'ready', tier: 5, open: true });
seed.stock = [100, 100, 100, 100]; seed.visitorTimer = 0; seed.bigSpender.timer = 1e6;
for (let t = 0; t < 300 && !seed.hollowHouse.receipts.length; t += .1) update(seed, .1);
if (!seed.hollowHouse.receipts.length || !seed.visitors.some(v => v.hollow?.charged)) throw Error('Paid guest fixture did not produce its ordinary ticket.');
seed.paused = true; seed.hollowHouse.open = false; seed.visitorTimer = 1e6;
const fixture = JSON.parse(JSON.stringify(seed));
const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fs.readFileSync(file)); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let page;
try {
  await (async () => {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: 'reduce', deviceScaleFactor: Number(process.env.MAZE_QA_DPR) || 1 });
  page.setDefaultTimeout(120000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { const url = request.url(); if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) externalRequests.push(url); });
  await page.addInitScript(({ quality, visual }) => localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ renderQuality: quality, glow: visual, shadows: visual, music: true, musicVolume: .2, sound: false, mazeSound: true, mazeVolume: .35 })), { quality: process.env.MAZE_QA_QUALITY || 'performance', visual: !!process.env.MAZE_QA_VISUAL });
  await page.goto(base);
  await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => PumpkinVoxel.intro?.skip());
  const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const status = () => page.evaluate(() => PumpkinVoxel.maze.status);
  const farm = () => page.evaluate(() => JSON.stringify(PumpkinVoxel.state()));
  const stage = () => page.locator('#maze-ride-ui').getAttribute('data-stage');
  const action = name => page.locator(`#maze-ride-ui [data-maze-action="${name}"]:visible`).last();
  const snapshot = async (name, capture) => { await frame(); await page.screenshot({ path: path.join(out, name + '.png') }); samples.push({ name, status: await status(), ...(capture ? { capture } : {}) }); };
  const advanceTo = async elapsed => { const s = await status(); if (elapsed > s.elapsed) await page.evaluate(seconds => PumpkinVoxel.maze.advance(seconds), elapsed - s.elapsed); await frame(); return status(); };
  const layout = async label => {
    const result = await page.locator('#maze-ride-ui').evaluate(host => {
      const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
      const controls = [...host.querySelectorAll('button,input')].filter(visible).map(node => { const r = node.getBoundingClientRect(); return { action: node.dataset.mazeAction || 'volume', width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
      const clipped = controls.filter(r => r.left < -.5 || r.right > innerWidth + .5 || r.top < -.5 || r.bottom > innerHeight + .5);
      const small = controls.filter(r => r.width < 43.5 || r.height < 43.5);
      return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1, controls, clipped, small };
    });
    check(!result.overflow && !result.clipped.length && !result.small.length, `${label}: controls fit with 44px targets`, result);
  };
  check(await page.evaluate(() => !!PumpkinVoxel.maze && typeof PumpkinVoxel.maze.advance === 'function'), 'walkthrough test API is available');
  const unavailable = await page.evaluate(() => ({ open: PumpkinVoxel.maze.open(), start: PumpkinVoxel.maze.start({ sound: false }) }));
  check(unavailable.open === false && unavailable.start === false && await page.locator('#maze-ride-ui').isHidden(), 'fresh derelict house rejects entry and start', unavailable);
  await page.evaluate(() => { Object.assign(PumpkinVoxel.state().hollowHouse, { purchased: true, status: 'restoring', restoreRemaining: 30 }); });
  check(await page.evaluate(() => PumpkinVoxel.maze.open()) === false, 'restoring attraction rejects entry');
  await page.evaluate(fixtureState => { Object.assign(PumpkinVoxel.state(), fixtureState); PumpkinVoxel.enterFoyer(); }, fixture);
  await frame();
  const mazeDoor = foyerLayout(fixture).mazeDoor;
  const doorPoint = await page.evaluate(door => PumpkinVoxel.scene.screenPoint(door.x, 1.45, door.z + .24), mazeDoor);
  await page.mouse.click(doorPoint.x, doorPoint.y); await frame();
  check(await stage() === 'brief', 'actual foyer doorway click opens the briefing', doorPoint);
  await page.keyboard.press('Escape'); await frame();
  check(await page.locator('#maze-ride-ui').isHidden() && await page.evaluate(() => PumpkinVoxel.scene.place?.kind === 'foyer'), 'Escape closes the briefing and returns to the foyer');
  const liveFarmCheck = async () => {
    await page.evaluate(() => { PumpkinVoxel.state().hollowHouse.open = true; PumpkinVoxel.maze.open(); });
    await action('start').click(); await frame();
    const beforeLive = await page.evaluate(() => { const s = PumpkinVoxel.state(); s.paused = false; return { time: s.time, tickets: s.hollowHouse.ticketsSold, receipts: JSON.stringify(s.hollowHouse.receipts), coins: s.coins }; });
    await frame();
    const afterLive = await page.evaluate(() => { const s = PumpkinVoxel.state(); s.paused = true; return { time: s.time, tickets: s.hollowHouse.ticketsSold, receipts: JSON.stringify(s.hollowHouse.receipts), coins: s.coins }; });
    check(afterLive.time > beforeLive.time && afterLive.tickets === beforeLive.tickets && afterLive.receipts === beforeLive.receipts && afterLive.coins === beforeLive.coins, 'live farm advances over two ride frames without charging a second owner ticket', { before: beforeLive, after: afterLive });
    await action('exit').click(); await frame();
    await page.evaluate(() => { PumpkinVoxel.state().hollowHouse.open = false; });
  };
  const visualCheck = async () => {
    await page.setViewportSize({ width: 874, height: 787 });
    await page.evaluate(() => { const h = PumpkinVoxel.state().hollowHouse; h.tier = 3; h.haunts = { owned: ['cobweb-canopy', 'whispering-portraits', 'spectral-parade'], active: ['cobweb-canopy', 'whispering-portraits', 'spectral-parade'] }; PumpkinVoxel.maze.open(); });
    if (await action('gentle').getAttribute('aria-pressed') === 'true') await action('gentle').click();
    await action('start').click(); await frame();
    await layout('final Sharp Fold running');
    const girl = await page.evaluate(() => PumpkinVoxel.maze.config.encounters.find(event => event.actor === 'haunted-girl'));
    check(!!girl, 'final visual tour includes the haunted girl encounter');
    // Freeze an exact reveal pose: software rendering can otherwise advance past
    // it while screenshot() waits. Only the pause shade is hidden for this image.
    await page.evaluate(at => {
      PumpkinVoxel.maze.advance(Math.max(0, at + 1.35 - PumpkinVoxel.maze.status.elapsed));
      PumpkinVoxel.scene.pauseMazeRide(true);
      document.querySelector('.maze-ride-shade').style.display = 'none';
    }, girl.at);
    await snapshot('final-sharp-fold-haunted-girl', 'Deterministic reveal paused at cue+1.35s; pause shade hidden only for art inspection.');
    const reveal = await status(), actor = reveal.actors.find(a => a.actor === 'haunted-girl' && a.visible);
    const distance = actor && Math.hypot(actor.x - reveal.camera.x, actor.z - reveal.camera.z);
    check(actor?.pose === 'scare' && distance > .8 && distance < 2.6, 'haunted girl reveals close to the viewer without crossing the camera', { distance, actor });
    const rendering = await page.evaluate(() => ({ ...PumpkinVoxel.scene.renderStatus, shadows: PumpkinVoxel.scene.renderer.shadowMap.enabled }));
    check(rendering.quality === 'sharp' && rendering.pixelRatio === 2 && rendering.postprocessRatio === 2 && rendering.antialias === 'density' && rendering.shadows, 'final Fold image uses Sharp with full DPR2 postprocessing and no FXAA softening', rendering);
    await page.evaluate(() => PumpkinVoxel.maze.close()); await frame();
  };
  if (process.env.MAZE_QA_VISUAL_ONLY) {
    await visualCheck();
    check(externalRequests.length === 0 && errors.length === 0, 'final visual pass has no external requests or browser errors', { externalRequests, errors });
    return;
  }
  if (process.env.MAZE_QA_FOCUSED_ONLY) {
    await liveFarmCheck();
    await page.evaluate(() => PumpkinVoxel.maze.open());
    await layout('final desktop briefing');
    await action('start').click(); await frame(); await action('pause').click(); await frame();
    await action('sound').click();
    check(await page.evaluate(() => !!document.activeElement?.closest('.maze-ride-panel') && !document.activeElement?.closest('[inert]')), 'paused Sound action retains focus in the modal panel');
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); check(await page.evaluate(() => !!document.activeElement?.closest('.maze-ride-panel') && !document.activeElement?.closest('[inert]')), `paused Tab ${i + 1} stays inside the modal panel`); }
    for (const [width, height] of [[390, 844], [844, 390], [874, 787], [1280, 800]]) { await page.setViewportSize({ width, height }); await frame(); await layout(`final ${width}x${height} paused`); }
    await action('resume').click(); await page.evaluate(() => PumpkinVoxel.maze.advance(1000)); await frame(); await layout('final desktop result');
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); check(await page.evaluate(() => !!document.activeElement?.closest('.maze-ride-panel') && !document.activeElement?.closest('[inert]')), `result Tab ${i + 1} stays inside the modal panel`); }
    await action('exit').click(); await frame();
    if (process.env.MAZE_QA_VISUAL) await visualCheck();
    check(externalRequests.length === 0 && errors.length === 0, 'final focused pass has no external requests or browser errors', { externalRequests, errors });
    return;
  }
  const before = await farm(), baselineMusic = await page.evaluate(() => PumpkinVoxel.audio.status.sceneGain);
  if (!process.env.MAZE_QA_EXTENDED_ONLY) {
  check(await page.evaluate(() => PumpkinVoxel.maze.open()) === true, 'restored closed attraction admits a free owner preview');
  check(await stage() === 'brief', 'entry presents a briefing before motion');
  check(await action('gentle').getAttribute('aria-pressed') === 'true', 'reduced motion defaults gentle motion on');
  await layout('desktop briefing');
  await snapshot('entry-briefing-desktop');
  await action('start').click(); await frame();
  let s = await status();
  check(s.active && !s.paused && !s.completed && await stage() === 'running', 'actual Start gesture enters the running walkthrough', s);
  check(s.audio?.active && s.audio.context === 'running' && s.audio.voices > 0 && s.audio.voices <= 14, 'Start gesture unlocks bounded offline ride audio', s.audio);
  check(await page.evaluate(() => PumpkinVoxel.audio.status.sceneGain < 1), 'farm music is ducked during the walkthrough');
  const originalRenderCounts = { geometryCount: s.geometryCount, textureCount: s.textureCount, lightCount: s.lightCount };
  const elapsed0 = s.elapsed, farmTime0 = await page.evaluate(() => PumpkinVoxel.state().time);
  await page.evaluate(() => PumpkinVoxel.maze.advance(1));
  s = await status();
  check(s.elapsed >= elapsed0 + .99 && await page.evaluate(() => PumpkinVoxel.state().time) === farmTime0, 'walkthrough clock advances while the ordinary farm is paused', { elapsed0, elapsed: s.elapsed, farmTime0 });
  await layout('desktop running');
  await snapshot('entry-running-desktop');
  await action('sound').click(); await frame();
  check((await status()).audio.muted && (await status()).audio.voices === 0, 'ride Sound control mutes and clears its voices');
  await action('sound').click(); await frame();
  check(!(await status()).audio.muted && (await status()).audio.voices > 0, 'ride Sound control restores bounded ambience');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x: 630, y: 470 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 0, x: 1270, y: 790 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frame(); s = await status();
  check(Math.abs(s.lookYaw) <= Math.PI / 4 + .001 && Math.abs(s.lookPitch) <= Math.PI / 9 + .001 && Math.abs(s.lookYaw) + Math.abs(s.lookPitch) > .01, 'real touch drag changes look within comfortable bounds', { lookYaw: s.lookYaw, lookPitch: s.lookPitch });
  await page.mouse.move(500, 450); await page.mouse.wheel(0, 1500); await page.mouse.click(500, 450); await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('p'); await page.keyboard.press(' '); await frame();
  check(await farm() === before && await page.evaluate(() => !document.pointerLockElement && scrollX === 0 && scrollY === 0), 'touch, tap, wheel and farm shortcuts do not leak into the farm or pointer lock');
  await page.keyboard.press('Escape'); await frame(); s = await status();
  const pausedElapsed = s.elapsed, pausedEvents = s.eventsFired;
  check(s.paused && await stage() === 'pause' && s.audio.voices === 0, 'Escape pauses motion and clears active sounds', s.audio);
  await page.evaluate(() => PumpkinVoxel.maze.advance(1000));
  s = await status();
  check(s.elapsed === pausedElapsed && JSON.stringify(s.eventsFired) === JSON.stringify(pausedEvents), 'paused artificial advancement cannot move time or duplicate cues');
  await page.locator('#maze-ride-ui [data-maze-volume]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  check(Math.abs((await status()).audio.volume - .05) < .001, 'Maze volume preference updates through its keyboard-accessible control', (await status()).audio);
  await action('gentle').click(); await frame();
  check(!(await status()).gentle, 'Gentle motion control updates the view independently');
  await action('gentle').click(); await frame();
  check((await status()).gentle, 'Gentle motion can be restored before resuming');
  await action('resume').click(); await frame();
  check(!(await status()).paused && (await status()).audio.context === 'running', 'explicit Resume gesture restarts the ride');
  // A deterministic hidden-tab event exercises the actual installed handlers.
  await page.evaluate(() => { window.__mazeQAHidden = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__mazeQAHidden }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__mazeQAHidden ? 'hidden' : 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await frame(); s = await status();
  check(s.paused && s.audio.voices === 0, 'visibility interruption pauses the ride and stops voices', s.audio);
  await page.evaluate(() => { window.__mazeQAHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await frame();
  check((await status()).paused && await stage() === 'pause', 'returning visibility waits for explicit Resume');
  await action('resume').click(); await frame();
  await page.evaluate(() => PumpkinVoxel.maze.advance(1000)); await frame(); s = await status();
  check(s.completed && s.elapsed === s.duration && s.progress === 1 && await stage() === 'result', 'large advancement completes exactly at the route duration', s);
  const finishedEvents = JSON.stringify(s.eventsFired), finishedRun = s.runId ?? s.id;
  await page.evaluate(() => PumpkinVoxel.maze.advance(1000));
  check(JSON.stringify((await status()).eventsFired) === finishedEvents, 'completed timeline emits no duplicate encounters');
  await action('replay').click(); await frame(); s = await status();
  check(s.active && !s.completed && s.elapsed < 1 && s.eventsFired.length === 0 && (!finishedRun || (s.runId ?? s.id) !== finishedRun), 'Replay resets the presentation timeline and encounter history', s);
  check(s.geometryCount === originalRenderCounts.geometryCount && s.textureCount === originalRenderCounts.textureCount && s.lightCount === originalRenderCounts.lightCount && await page.locator('canvas').count() === 1, 'Replay keeps stable native scene resources and one WebGL canvas', { before: originalRenderCounts, after: { geometryCount: s.geometryCount, textureCount: s.textureCount, lightCount: s.lightCount } });
  await action('exit').click(); await frame();
  check(!(await status()).active && await page.evaluate(() => PumpkinVoxel.scene.place?.kind === 'foyer') && await page.locator('#maze-ride-ui').isHidden(), 'Exit returns immediately to the foyer');
  check(await page.evaluate(() => PumpkinVoxel.audio.status.sceneGain) === baselineMusic && (await status()).audio.voices === 0, 'Exit restores the farm music mix and stops ride voices');
  check(await farm() === before, 'free owner preview, replay and Exit preserve a genuine paid guest, receipts and complete farm state');

  }
  await liveFarmCheck();
  let s;
  // Each tier gains its authored chambers and active, owned, valid haunts.
  for (let tier = 1; tier <= 5; tier++) {
    const tierState = JSON.parse(JSON.stringify(fixture)); tierState.hollowHouse.tier = tier; tierState.hollowHouse.haunts = { owned: prefabs.slice(0, tier), active: [...prefabs, 'unknown-haunt'] };
    const config = buildMazeRideConfig(tierState);
    await page.evaluate(({ tier, owned, active }) => { const h = PumpkinVoxel.state().hollowHouse; h.tier = tier; h.haunts = { owned, active }; PumpkinVoxel.maze.open(); }, { tier, owned: prefabs.slice(0, tier), active: [...prefabs, 'unknown-haunt'] });
    await action('start').click(); await frame(); s = await status();
    check(s.tier === tier && s.chambers.length === tier && JSON.stringify(s.activeHaunts) === JSON.stringify(config.activePrefabs), `tier ${tier} snapshots only its owned, active, valid haunts`, { tier: s.tier, chambers: s.chambers, activeHaunts: s.activeHaunts });
    for (const zone of config.zones) {
      const encounter = config.encounters.find(event => event.zone === zone.id);
      s = await advanceTo(encounter.at + 1.35);
      check(s.zoneName === zone.name && s.eventsFired.includes(encounter.id) && s.camera && ['x', 'y', 'z'].every(k => Number.isFinite(s.camera[k])) && Math.abs(s.camera.y - 1.65) < .2 && s.actors.some(actor => actor.visible), `tier ${tier}: ${zone.name} has a finite eye-height view and encounter`, { zone: s.zoneName, camera: s.camera, actors: s.actors });
      if (tier === 3 && zone.index === 2) await snapshot('tier3-haunted-girl-scare');
    }
    if (tier === 5) {
      await advanceTo(config.duration - 1.2); await snapshot('tier5-finale-desktop');
      for (const [width, height] of [[390, 844], [844, 390], [874, 787]]) {
        await page.evaluate(() => PumpkinVoxel.maze.restart({ sound: true, gentle: true })); await advanceTo(config.duration - 1.5); await page.setViewportSize({ width, height }); await frame(); await layout(`${width}x${height} running`); await snapshot(`tier5-finale-${width}x${height}`);
        await action('pause').click(); await frame(); await layout(`${width}x${height} paused`); await page.screenshot({ path: path.join(out, `pause-${width}x${height}.png`) }); await action('resume').click();
      }
    }
    await page.evaluate(() => PumpkinVoxel.maze.advance(1000)); await frame();
    s = await status();
    check(s.completed && s.eventsFired.length === config.encounters.length && new Set(s.eventsFired).size === s.eventsFired.length && s.lightCount <= 8 && s.batches < 80, `tier ${tier} completes all cues once with bounded render batches/lights`, { events: s.eventsFired, lightCount: s.lightCount, batches: s.batches, geometryCount: s.geometryCount });
    await action('exit').click(); await frame();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const h = PumpkinVoxel.state().hollowHouse; h.tier = 5; h.haunts = { owned: ['cobweb-canopy'], active: ['whispering-portraits', 'phantom-finale'] }; PumpkinVoxel.maze.open(); });
  await layout('portrait full-tier briefing'); await action('start').click(); await frame(); s = await status();
  check(s.activeHaunts.length === 0, 'inactive owned and active unowned installations add no extra encounters', s.activeHaunts);
  await action('pause').click();
  const rideTime = (await status()).elapsed;
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; PumpkinVoxel.advance(.5); PumpkinVoxel.state().paused = true; });
  check((await status()).elapsed === rideTime && await page.evaluate(time => PumpkinVoxel.state().time > time, fixture.time), 'ordinary farm simulation can advance independently while the walkthrough is paused');
  await action('exit').click(); await frame();
  check(await page.locator('#place-bar').isVisible() && await page.evaluate(() => PumpkinVoxel.scene.place?.kind === 'foyer'), 'foyer controls are restored after repeated tours');
  check(externalRequests.length === 0, 'offline HTML requests no external runtime assets', externalRequests);
  check(errors.length === 0, 'browser reports no page or console errors', errors);
  })();
} catch (error) {
  if (page) { try { await page.screenshot({ path: path.join(out, 'failure.png') }); } catch {} }
  throw error;
} finally {
  fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'), dpr: Number(process.env.MAZE_QA_DPR) || 1, bloomAndShadows: !!process.env.MAZE_QA_VISUAL, checks, errors, externalRequests, samples, mode: process.env.MAZE_QA_VISUAL_ONLY ? 'visual-only' : process.env.MAZE_QA_FOCUSED_ONLY ? 'focused-only' : process.env.MAZE_QA_EXTENDED_ONLY ? 'extended-only' : 'full', rendering: `${process.env.MAZE_QA_QUALITY || 'performance'} profile; Chromium SwiftShader; real Start/Resume clicks, real CDP touch; synthetic visibilitychange using document.hidden; ordinary-rules paid-guest fixture` }, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
