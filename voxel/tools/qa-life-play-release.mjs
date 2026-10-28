// Focused release checks against the exact, unmodified offline HTML.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { PLAYER_SIDE_WALK_META } from '../src/player-side-walk-meta.js';

const file = path.resolve(process.argv[2] ?? '/workspace/Pumpkin-Patch-Life-Play.html');
const out = path.resolve(process.argv[3] ?? '/tmp/life-play-release');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), checks = [], errors = [], requests = [], shots = [];
let passed = false;
const meta = {
  file, sha256: createHash('sha256').update(html).digest('hex'), started: new Date().toISOString(),
  scope: 'Exact HTML; simultaneous CDP touch pointers, all twenty owner looks through the live animation adapter, orbit, water/pet presentation and phone/Fold radial layouts. Diagnostic animation updates stage frame coverage without editing the HTML. Screenshots require human visual review for art duplication. Emulation does not verify physical Fold hardware, Bluetooth or mobile GPU performance.',
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

try {
  await page.goto(base); await page.waitForSelector('body[data-ready]');
  await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === 'sprites' && !!PumpkinVoxel.lifeActivity);
  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6; s.orders.next = 1e6;
    s.progression.pending = []; PumpkinVoxel.intro?.skip();
  });
  await page.locator('.house-goal-modal [data-later]').evaluateAll(nodes => nodes.forEach(n => n.click()));
  await page.locator('.level-continue').evaluateAll(nodes => nodes.forEach(n => n.click()));
  await page.evaluate(() => { PumpkinVoxel.playControls.start('natalie'); PumpkinVoxel.scene.player.teleport(20, 16); PumpkinVoxel.scene.player.recenter(); });
  await frame();

  // Keep both pointers present in each CDP packet, just like two actual thumbs.
  const cdp = await page.context().newCDPSession(page);
  const a = await page.locator('#play-stick').boundingBox(), b = await page.locator('#play-look').boundingBox();
  const left = touch(1, a.x + a.width / 2, a.y + a.height / 2), right = touch(2, b.x + b.width / 2, b.y + b.height / 2);
  const initial = await status();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] });
  const leftMoved = { ...left, x: left.x + a.width * .29 }, rightMoved = { ...right, x: right.x + b.width * .29 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [leftMoved, rightMoved] });
  await frame(4);
  const both = await status();
  check(travelled(initial.p.position, both.p.position) > .1 && Math.abs(wrapped(both.camera.playerOrbit.yaw, initial.camera.playerOrbit.yaw)) > .02,
    'Two simultaneous captured touches move the owner and turn the camera', { initial, both });
  const leftChanged = { ...leftMoved, y: left.y - a.height * .2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [leftChanged, rightMoved] });
  await frame(3);
  const changed = await status();
  check(travelled(both.p.position, changed.p.position) > .05 && Math.abs(wrapped(changed.camera.playerOrbit.yaw, both.camera.playerOrbit.yaw)) > .02,
    'Moving one thumb does not steal the other thumb’s camera capture', { both, changed });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [rightMoved] });
  await frame(5);
  const moveReleased = await status(); await frame(3); const lookingOnly = await status();
  check(travelled(moveReleased.p.position, lookingOnly.p.position) < .05 && Math.abs(wrapped(lookingOnly.camera.playerOrbit.yaw, moveReleased.camera.playerOrbit.yaw)) > .02,
    'Releasing MOVE stops travel while the held LOOK thumb keeps turning', { moveReleased, lookingOnly });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frame(4); const released = await status(); await frame(3); const settled = await status();
  check(travelled(released.p.position, settled.p.position) < .03 && Math.abs(wrapped(settled.camera.playerOrbit.yaw, released.camera.playerOrbit.yaw)) < .005,
    'Releasing both touches clears movement and camera input', { released, settled });

  // Exercise every live wardrobe actor; native asset audits cover alpha anchors.
  const looks = await page.evaluate(entries => {
    const api = PumpkinVoxel, s = api.state(), rows = [];
    api.lifeActivity.cancel(); api.scene.player.recenter();
    for (const [id, expected] of entries) {
      const who = id.startsWith('shane-') ? 'shane' : 'natalie';
      s.wardrobe.equipped[who] = id; api.scene.refreshLooks();
      const p = api.scene.player; p.setEnabled(true, who); p.setBlocked(false); p.teleport(20, 16); p.recenter(); p.input(1, 0);
      const frames = [], heights = [], directions = [];
      for (let i = 0; i < 7; i++) { p.update(.15, 20 + i * .15); const v = p.state(); frames.push(v.spriteFrame); heights.push(v.spriteStature); directions.push(v.spriteDirection); }
      p.input(0, 0); p.update(.15, 22);
      rows.push({ id, frames: [...new Set(frames)], directions: [...new Set(directions)], heights: [...new Set(heights)], expectedHeight: expected.targetHeight * 2.3 / 320, count: p.state().sideFrameCount });
    }
    s.wardrobe.equipped.shane = 'shane-base'; s.wardrobe.equipped.natalie = 'natalie-base'; api.scene.refreshLooks(); api.playControls.start('natalie');
    return rows;
  }, Object.entries(PLAYER_SIDE_WALK_META));
  check(looks.length === 20 && looks.every(r => r.count === 4 && r.frames.length >= 3 && r.directions.every(d => d === 'side')),
    'All twenty equipped looks use multiple distance-driven side-walk frames', looks);
  check(looks.every(r => r.heights.length === 1 && Number.isFinite(r.heights[0]) && Math.abs(r.heights[0] - r.expectedHeight) < .001),
    'Every look retains its declared foot-anchored stature through its walk', looks.map(({ id, heights, expectedHeight }) => ({ id, heights, expectedHeight })));
  await frame();

  await page.evaluate(() => {
    const api = PumpkinVoxel, p = api.scene.player, s = api.state();
    api.lifeActivity.cancel(); s.plots[0] = { phase: 'growing', progress: .15, variety: 0 };
    const t = p.targets().find(t => t.type === 'plot' && t.index === 0);
    p.teleport(t.x, t.z); p.faceTarget(t); p.recenter(); api.interactAsPlayer('water', { phase: 'tap' });
  });
  await frame(1); const water = await status();
  check(water.p.canVisible && water.p.dropsVisible && water.p.canScale >= 1.4 && water.p.spriteDirection === 'water',
    'Base watering uses the empty-handed stance plus the physical can and stream', water.p);
  await shot('single-can-watering');
  await page.evaluate(() => { PumpkinVoxel.lifeActivity.cancel(); PumpkinVoxel.scene.player.recenter(); });

  const threeQuarter = await page.evaluate(() => {
    const p = PumpkinVoxel.scene.player;
    for (let i = 0; i < 30; i++) p.lookBy(-.2, 0);
    return PumpkinVoxel.scene.cameraFraming.playerOrbit.yaw;
  });
  await frame(); await shot('farm-three-quarter-orbit');
  check(Math.abs(wrapped(threeQuarter, -Math.PI / 2)) < .12, 'The orbit also reaches the farm’s 270-degree side', { yaw: threeQuarter });

  await page.evaluate(() => { const a = PumpkinVoxel; a.enterRoom('parlour'); a.closeSheet(); }); await frame(3);
  const petBefore = await page.evaluate(() => {
    const a = PumpkinVoxel, p = a.scene.player, t = p.targets().find(t => t.type === 'pet');
    if (!t) throw Error('No home pet socket'); p.teleport(t.x, t.z); p.faceTarget(t);
    return a.scene.petsStatus.find(p => p.who === t.pet);
  });
  await frame(); await page.evaluate(() => PumpkinVoxel.interactAsPlayer('hand', { phase: 'tap' }));
  await page.waitForFunction(before => PumpkinVoxel.scene.petsStatus.some(p => p.who === before.who && p.reactions > (before.reactions ?? 0)), petBefore);
  const pets = await page.evaluate(() => PumpkinVoxel.scene.petsStatus);
  check(pets.filter(p => p.who === petBefore.who).length === 1 && pets.some(p => p.who === petBefore.who && p.reacting),
    'The live home companion reacts to petting; screenshot records the pose for visual review', pets);
  await shot('single-companion-petting'); await page.evaluate(() => PumpkinVoxel.scene.player.stand());

  for (const [name, width, height] of [['phone', 390, 844], ['fold', 874, 787]]) {
    await page.setViewportSize({ width, height }); await frame();
    await page.locator('#play-wheel').click(); await frame();
    const data = await fit();
    check(!data.overflow && !data.small.length && !data.clipped.length, `${name}: radial choices fit with 44px targets and no horizontal overflow`, data);
    await shot(name + '-release-radial'); await page.locator('.radial-close').click();
  }
  check(errors.length === 0 && requests.length === 0, 'The release flow has no browser errors or external runtime asset requests', { errors, requests });
  passed = true;
} catch (error) {
  meta.failure = String(error); console.error(error.stack ?? error);
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  report(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
