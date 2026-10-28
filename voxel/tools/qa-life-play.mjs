// Real control gestures against the unmodified offline file. Only QA storage is staged.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2] ?? '/workspace/Pumpkin-Patch-Life-Play.html');
const out = path.resolve(process.argv[3] ?? '/tmp/life-play-qa');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(file), checks = [], errors = [], requests = [], shots = [];
let passed = false;
const meta = {
  file, sha256: createHash('sha256').update(html).digest('hex'), started: new Date().toISOString(),
  scope: 'Actual keyboard, pointer and emulated Gamepad API gestures. Diagnostic action time completes jobs without mutating the HTML. No physical controller, Bluetooth or Fold hardware verification.',
};
const report = () => fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ ...meta, passed, checks, errors, requests, shots }, null, 2));
const check = (ok, label, data) => {
  checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) }); report();
  console.log(ok ? 'ok  ' : 'FAIL', label);
  if (!ok) throw Error(label + ': ' + JSON.stringify(data));
};

// Keep unrelated economies quiet so a visitor cannot consume the tested crop.
const seed = M.freshState();
seed.introSeen = true; seed.coins = 25000; seed.earned = 100000; seed.house.level = 3;
seed.progression.homeLegacyThrough = 12;
seed.progression.claimed = M.LEVELS.slice(0, 12).map(l => l.level);
seed.progression.pending = [];
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

// Wait for actual render callbacks instead of assuming a fixed software-WebGL rate.
const frame = async (count = 2) => {
  const token = await page.evaluate(count => {
    const token = (window.lifeQAFrame ?? 0) + 1; window.lifeQAFrame = token;
    let seen = 0;
    const step = () => { if (++seen >= count) window.lifeQAFrameDone = token; else requestAnimationFrame(step); };
    requestAnimationFrame(step); return token;
  }, count);
  await page.waitForFunction(token => window.lifeQAFrameDone >= token, token);
};
const shot = async name => {
  await frame(); await page.screenshot({ path: path.join(out, name + '.png') }); shots.push(name); report();
};
const activity = () => page.evaluate(() => PumpkinVoxel.lifeActivity.state());
// Enter activates the button's accessible one-use path without wall-clock pointer jitter.
const assistedUse = async () => { await page.locator('#play-interact').focus(); await page.keyboard.press('Enter'); };
const advance = seconds => page.evaluate(seconds => PumpkinVoxel.lifeActivity.advance(seconds), seconds);
const resetActivity = () => page.evaluate(() => { PumpkinVoxel.lifeActivity.cancel(); PumpkinVoxel.scene.player.cancelWalk(); PumpkinVoxel.scene.player.cancelAction(); PumpkinVoxel.scene.player.stand(); });
const stagePlot = async (phase, index = 0) => {
  await resetActivity();
  await page.evaluate(({ phase, index }) => {
    const s = PumpkinVoxel.state(), p = PumpkinVoxel.scene.player;
    s.plots[index] = { phase, progress: phase === 'ready' ? 1 : phase === 'growing' ? .15 : 0, variety: 0 };
    const target = p.targets().find(t => t.type === 'plot' && t.index === index);
    if (!target) throw Error('Missing open plot target ' + index);
    p.teleport(target.x, target.z); p.faceTarget(target); PumpkinVoxel.playControls.tick(false);
  }, { phase, index });
  await frame();
};
const padButton = async (index, on, blocked = false) => page.evaluate(({ index, on, blocked }) => {
  lifeTestPad.buttons[index].pressed = on;
  lifeTestPad.buttons[index].value = on ? 1 : 0;
  PumpkinVoxel.playControls.tick(blocked);
}, { index, on, blocked });
const press = async index => { await padButton(index, true); await padButton(index, false); };
// Render the terrain from known orbit angles after exercising the real look stick.
const turnCamera = angle => page.evaluate(angle => {
  const orbit = () => PumpkinVoxel.scene.cameraFraming.playerOrbit.yaw;
  const delta = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const before = orbit(); PumpkinVoxel.scene.player.lookBy(.25,0);
  const response = Math.sign(delta(orbit(),before));
  if (!response) return orbit();
  for (let i=0;i<100;i++) {
    const remaining = delta(angle,orbit()); if (Math.abs(remaining)<.06) break;
    PumpkinVoxel.scene.player.lookBy(Math.sign(remaining)*response*.25,0);
  }
  return orbit();
},angle);
const layout = async label => {
  const data = await page.evaluate(() => {
    const visible = selector => [...document.querySelectorAll(selector)].filter(n => n.getClientRects().length && !n.closest('[hidden]'));
    const controls = visible('#play-controls button:not(:disabled),#sheet button:not(:disabled),#sheet select:not(:disabled)').map(n => {
      const r = n.getBoundingClientRect();
      return { label: n.getAttribute('aria-label') ?? n.textContent.trim().slice(0, 60), x: r.x, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    });
    const boxes = ['#play-stick', '#play-look', '#play-interact'].map(selector => {
      const el = document.querySelector(selector); return el && el.getClientRects().length && !el.closest('[hidden]') ? { selector, ...el.getBoundingClientRect().toJSON() } : null;
    }).filter(Boolean);
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push([a.selector, b.selector]);
    }
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, small: controls.filter(r => r.width < 43.5 || r.height < 43.5), clipped: controls.filter(r => r.x < -.5 || r.right > innerWidth + .5 || r.top < -.5 || r.bottom > innerHeight + .5), boxes, overlaps };
  });
  check(!data.overflow && !data.small.length && !data.clipped.length && !data.overlaps.length, label + ': controls fit, remain 44px and do not overlap', data);
};

try {
  await page.goto(base); await page.waitForSelector('body[data-ready]');
  await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === 'sprites' && typeof PumpkinVoxel.lifeActivity?.advance === 'function');
  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6; s.orders.next = 1e6;
    s.progression.pending = []; PumpkinVoxel.intro?.skip();
  });
  await page.locator('.house-goal-modal [data-later]').evaluateAll(nodes => nodes.forEach(n => n.click()));
  await page.locator('.level-continue').evaluateAll(nodes => nodes.forEach(n => n.click()));
  await page.locator('#play-toggle').click(); await page.locator('[data-choice="natalie"]').click(); await frame();
  check(await page.evaluate(() => PumpkinVoxel.scene.player.state().enabled && PumpkinVoxel.scene.player.state().who === 'natalie'), 'Natalie enters the direct-control mode');
  await layout('Desktop');

  const beforeMove = await page.evaluate(() => PumpkinVoxel.scene.player.state().position);
  const stick = await page.locator('#play-stick').boundingBox();
  await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2); await page.mouse.down();
  await page.mouse.move(stick.x + stick.width / 2 + 38, stick.y + stick.height / 2); await frame(4); await page.mouse.up();
  const afterMove = await page.evaluate(() => PumpkinVoxel.scene.player.state().position);
  check(Math.hypot(afterMove.x - beforeMove.x, afterMove.z - beforeMove.z) > .1, 'The movement thumbstick moves the selected owner', { beforeMove, afterMove });
  await page.locator('#play-gait').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.player.state().gait === 'jog'), 'The on-screen gait button switches to jogging');

  // A deliberately released hold must not secretly plant anything.
  await stagePlot('empty');
  const interact = await page.locator('#play-interact').boundingBox();
  await page.mouse.move(interact.x + interact.width / 2, interact.y + interact.height / 2); await page.mouse.down();
  check((await activity()).active, 'Pointer down begins a tool action before committing its rule');
  await advance(.25); await page.waitForTimeout(260); await page.mouse.up();
  check(await page.evaluate(() => PumpkinVoxel.state().plots[0].phase === 'empty'), 'Releasing an unfinished hold leaves the plot empty');
  check(!(await activity()).active, 'Releasing the unfinished hold clears the action');

  await stagePlot('empty'); await assistedUse();
  check((await activity()).active, 'The accessible one-use button path enables an assisted action');
  await advance(1.5);
  check(await page.evaluate(() => PumpkinVoxel.state().plots[0].phase === 'growing'), 'The assisted action plants only when its timer completes');
  await advance(2);
  check(await page.evaluate(() => PumpkinVoxel.state().plots[0].phase === 'growing'), 'Finishing the same action again does not replace its crop');

  await stagePlot('growing');
  const growth = await page.evaluate(() => PumpkinVoxel.state().plots[0].progress);
  await assistedUse(); await frame(1);
  const waterVisual = await page.evaluate(() => PumpkinVoxel.scene.player.state());
  check(waterVisual.canVisible === true && waterVisual.dropsVisible === true && waterVisual.canScale >= 1.4, 'A physical watering can and pour are visible during the action', waterVisual);
  await shot('watering-progress'); await advance(1.5);
  check(await page.evaluate(growth => PumpkinVoxel.state().plots[0].progress > growth + .10, growth), 'Completed watering increases the nearby crop growth');

  await stagePlot('ready');
  const picked = await page.evaluate(() => PumpkinVoxel.state().harvested);
  await assistedUse(); await advance(1.5); await advance(1.5);
  check(await page.evaluate(picked => PumpkinVoxel.state().harvested === picked + 1, picked), 'A completed pick awards exactly one normal crop');

  // Movement interrupts work, rather than leaving a charged tool behind a menu.
  await stagePlot('empty', 1);
  const button = await page.locator('#play-interact').boundingBox();
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2); await page.mouse.down(); await advance(.2);
  await page.keyboard.down('d'); await frame(3); await page.keyboard.up('d'); await page.mouse.up();
  check(!(await activity()).active && await page.evaluate(() => PumpkinVoxel.state().plots[1].phase === 'empty'), 'Manual movement cancels a tool action without planting');

  await page.evaluate(() => PumpkinVoxel.scene.player.recenter()); await frame(3);
  const cameraBefore = await page.evaluate(() => PumpkinVoxel.scene.cameraFraming);
  const look = await page.locator('#play-look').boundingBox();
  await page.mouse.move(look.x + look.width / 2, look.y + look.height / 2); await page.mouse.down();
  await page.mouse.move(look.x + look.width / 2 + 32, look.y + look.height / 2); await frame(4); await page.mouse.up();
  const cameraAfter = await page.evaluate(() => PumpkinVoxel.scene.cameraFraming);
  check(Number.isFinite(cameraAfter.playerOrbit?.yaw) && Math.abs(cameraAfter.playerOrbit.yaw - cameraBefore.playerOrbit.yaw) > .02, 'The second thumbstick rotates camera yaw rather than panning the farm', { cameraBefore, cameraAfter });
  await page.locator('#play-recenter').click(); await frame(3);
  const centred = await page.evaluate(() => { const camera = PumpkinVoxel.scene.debug.active(), p = PumpkinVoxel.scene.player.state().position, point = camera.position.clone().set(p.x, 1.1, p.z).project(camera); return { yaw: PumpkinVoxel.scene.cameraFraming.playerOrbit?.yaw, x: point.x, y: point.y }; });
  check(Math.abs(centred.yaw) < .01 && Math.abs(centred.x) < .16 && Math.abs(centred.y) < .35, 'Recenter returns camera yaw and keeps the character near the view centre', centred);
  const quarterYaw = await turnCamera(Math.PI / 2); await frame(); await shot('farm-quarter-orbit');
  const oppositeYaw = await turnCamera(Math.PI); await frame(); await shot('farm-opposite-orbit');
  check(Math.abs(Math.atan2(Math.sin(quarterYaw-Math.PI/2),Math.cos(quarterYaw-Math.PI/2))) < .12 && Math.abs(Math.abs(oppositeYaw)-Math.PI) < .12, 'Farm orbit reaches quarter and opposite views with finite camera values', {quarterYaw,oppositeYaw});
  await page.locator('#play-recenter').click(); await frame();

  // Emulated standard DualSense input exercises the actual polling adapter.
  await page.evaluate(() => {
    window.lifeTestPad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor:054c)', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [lifeTestPad] });
    PumpkinVoxel.playControls.tick(false);
  });
  const gaitBefore = await page.evaluate(() => PumpkinVoxel.scene.player.state().gait);
  await press(10);
  check(await page.evaluate(gaitBefore => PumpkinVoxel.scene.player.state().gait !== gaitBefore, gaitBefore), 'DualSense L3 changes walk/jog gait');
  await press(11);
  await stagePlot('empty'); await padButton(2, true); await advance(1.5); await padButton(2, false);
  check(await page.evaluate(() => PumpkinVoxel.state().plots[0].phase === 'growing'), 'A held DualSense Square completes a real planting action');
  await resetActivity();

  await page.evaluate(() => { PumpkinVoxel.enterRoom('parlour'); PumpkinVoxel.closeSheet(); }); await frame(3);
  await page.evaluate(() => {
    const p = PumpkinVoxel.scene.player, target = p.targets().find(t => t.type === 'sit');
    if (!target) throw Error('The starter chair has no sitting target');
    p.teleport(target.x, target.z); p.faceTarget(target);
  }); await frame(); await page.locator('#play-interact').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.player.state().pose?.kind === 'sit'), 'The owner can sit in an existing chair'); await shot('sitting-at-home');
  await page.keyboard.down('d'); await frame(3); await page.keyboard.up('d');
  check(await page.evaluate(() => !PumpkinVoxel.scene.player.state().pose), 'Moving stands the owner up safely');

  await page.evaluate(() => {
    const p = PumpkinVoxel.scene.player, target = p.targets().find(t => t.type === 'read');
    if (!target) throw Error('The stocked starter bookshelf has no reading target');
    p.teleport(target.x, target.z); p.faceTarget(target);
  }); await frame(); await page.locator('#play-interact').click();
  check(await page.evaluate(() => PumpkinVoxel.scene.player.state().pose?.kind === 'read') || await page.locator('#sheet[data-section="reader"]:not([hidden])').count() > 0, 'A stocked bookshelf offers an actual reading interaction');
  await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.scene.player.stand(); }); await frame();

  const petBefore = await page.evaluate(() => {
    const p = PumpkinVoxel.scene.player, target = p.targets().find(t => t.type === 'pet');
    if (!target) throw Error('The parlour pet has no interaction target');
    p.teleport(target.x, target.z); p.faceTarget(target);
    return PumpkinVoxel.scene.petsStatus.find(x => x.who === (target.pet ?? target.who));
  }); await frame(); await page.locator('#play-interact').click();
  check(await page.evaluate(before => PumpkinVoxel.scene.petsStatus.some(p => p.who === before.who && (p.reactions > (before.reactions ?? 0) || p.reacting === true || p.phase === 'happy')), petBefore), 'Petting gives the home companion a visible happy reaction');
  await page.evaluate(() => PumpkinVoxel.scene.player.stand());

  for (const [name, width, height] of [['phone', 390, 844], ['landscape', 844, 390], ['fold', 874, 787]]) {
    await page.setViewportSize({ width, height }); await frame(); await layout(name);
    if (name !== 'landscape') await shot(name + '-controls');
    await press(3); await frame(); await layout(name + ' radial');
    if (name === 'fold') await shot('fold-tool-wheel');
    await press(1);
  }
  check(errors.length === 0, 'The complete flow has no browser errors', errors);
  check(requests.length === 0, 'The game requests no external runtime assets', requests);
  passed = true;
} catch (error) {
  meta.failure = String(error); console.error(error.stack ?? error);
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  report(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
if (!passed) process.exitCode = 1;
