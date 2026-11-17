// Exact offline build, ordinary WebGL draws. Staged positions test presentation;
// canonical interaction parity and live collision rules have separate tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] ?? '/tmp/village-refinement-qa');
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), state = M.freshState();
Object.assign(state, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at });
state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.pending = [];
M.inviteToVillage(state); M.finishTour(state);
state.village.quests.invitation = { step: 3, done: true }; state.village.quests['two-doorbells'] = { step: 3, done: true };
state.village.built['elowen-library'] = state.village.built['rowan-workshop'] = true;
const report = { html: file, sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length,
  scope: 'Normal SwiftShader rendering of exact offline HTML. Declared progressed save; place() and elevated follow camera stage sightlines. Short view ticks settle fades; screenshots compile and draw actual shaders. Keyboard and real DOM choices check movement, wayfinding and return. Not a physical controller or device performance test.', checks: [], errors: [], screenshots: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, ...(actual === undefined ? {} : { actual }) }); if (!pass) throw Error(label); console.log('ok ' + label); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(180000);
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  await page.addInitScript(save => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp' })); }, M.saveData(state));
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('body[data-ready]'); console.log('ready');
  await page.evaluate(() => PumpkinVoxel.openVillage());
  const shot = async name => { await page.keyboard.press('Shift'); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name); console.log('shot ' + name); };
  report.neighbourhoods = await page.evaluate(() => PumpkinVoxel.scene.villageView.neighbourhoodStatus);
  const budget = report.neighbourhoods;
  check('Native scene retains 6,232 boxes, three batches, 29 overhead groups and eight pooled lights', budget.visualBudget.boxes === 6232 && budget.visualBudget.meshes === 3 && budget.neighbourhoodVisibility.blockers === 29 && await page.evaluate(() => PumpkinVoxel.scene.villageView.scene.children.filter(o => o.isPointLight).length === 8), budget.visualBudget);
  await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView; p.village.place(-18, 66, { x: 1, z: 0 }); v.play.reset({ x: -18, y: v.groundAt(-18, 66), z: -66 }, { yaw: -Math.PI / 2, pitch: .8 }); for (let i = 0; i < 15; i++) v.tick(.1); });
  await shot('orchard-follow-sightline.png');
  const fade = await page.evaluate(() => PumpkinVoxel.scene.villageView.neighbourhoodStatus.neighbourhoodVisibility);
  check('Elevated orchard follow camera clears a local crown while retaining other crowns', fade.faded > 0 && fade.faded < fade.blockers && fade.fullShadows, fade);
  const snapshot = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView, saved = JSON.stringify(p.state()), before = v.neighbourhoodStatus.neighbourhoodVisibility.faded, target = p.scene.debug.renderer.getRenderTarget(), camera = v.camera.matrixWorld.toArray().join(), first = p.scene.captureVillageMap(), second = p.scene.captureVillageMap(); return { url: first.url, width: first.width, height: first.height, cached: first === second, unchanged: saved === JSON.stringify(p.state()), fadeRestored: before === v.neighbourhoodStatus.neighbourhoodVisibility.faded, cameraRestored: camera === v.camera.matrixWorld.toArray().join(), targetRestored: target === p.scene.debug.renderer.getRenderTarget() }; });
  check('Fresh actual-world atlas restores play fade, camera, render target and save', snapshot.cached && snapshot.unchanged && snapshot.fadeRestored && snapshot.cameraRestored && snapshot.targetRestored, { ...snapshot, url: undefined });
  await fs.writeFile(path.join(out, 'village-world-atlas.png'), Buffer.from(snapshot.url.split(',')[1], 'base64')); report.screenshots.push('village-world-atlas.png');
  await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView; v.play.pause(); v.tick(.1); });
  check('Leaving follow mode immediately restores all native crowns', await page.evaluate(() => PumpkinVoxel.scene.villageView.neighbourhoodStatus.neighbourhoodVisibility.faded === 0));
  await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView; p.village.place(190.5, 96, { x: 0, z: -1 }); v.play.reset({ x: 190.5, y: v.groundAt(190.5, 96), z: -96 }, { yaw: 0, pitch: .8 }); for (let i = 0; i < 15; i++) v.tick(.1); });
  await shot('lantern-pavilion-sightline.png');
  check('The pavilion roof can clear without removing its posts and furniture', await page.evaluate(() => PumpkinVoxel.scene.villageView.neighbourhoodStatus.neighbourhoodVisibility.faded > 0));
  await page.evaluate(() => PumpkinVoxel.village.showPanel('map'));
  await page.waitForFunction(() => document.querySelector('[data-vg-map-snapshot]')?.naturalWidth > 0);
  const folded = await page.evaluate(() => { const d = document.querySelector('details[data-vg-details-key="map-landmarks"]'); return { folded: !d.open, gardens: d.querySelectorAll('[data-vg-focus="cider-orchard"],[data-vg-focus="lantern-commons"],[data-vg-focus="community-beds"],[data-vg-focus="reading-court"],[data-vg-focus="rowan-workyard"]').length, pins: document.querySelectorAll('[data-vg-map-resident]').length }; });
  check('Five garden shortcuts live inside the existing folded landmark list, without extra resident pins', folded.folded && folded.gardens === 5 && folded.pins === 0, folded);
  await page.locator('details[data-vg-details-key="map-landmarks"] > summary').click();
  await page.setViewportSize({ width: 720, height: 900 }); await shot('fold-garden-map.png');
  await page.locator('[data-vg-focus="cider-orchard"]').scrollIntoViewIfNeeded(); await shot('fold-garden-shortcuts.png');
  for (const [name, width, height] of [['phone-garden-shortcuts.png', 390, 844], ['landscape-garden-shortcuts.png', 844, 390]]) {
    await page.setViewportSize({ width, height }); await page.locator('[data-vg-focus="cider-orchard"]').scrollIntoViewIfNeeded(); await shot(name);
    const layout = await page.evaluate(() => { const panel = document.querySelector('#vg-panel-body'), buttons = [...panel.querySelectorAll('[data-vg-focus="cider-orchard"],[data-vg-focus="lantern-commons"],[data-vg-focus="community-beds"],[data-vg-focus="reading-court"],[data-vg-focus="rowan-workyard"]')]; return { overflow: panel.scrollWidth - panel.clientWidth, minTarget: Math.min(...buttons.map(b => b.getBoundingClientRect().height)) }; });
    check(`${width}×${height} garden list scrolls vertically with comfortable targets`, layout.overflow <= 1 && layout.minTarget >= 44, layout);
  }
  await page.setViewportSize({ width: 720, height: 900 });
  await page.evaluate(() => { window.__qaGuideBefore = { position: PumpkinVoxel.village.status.position, coins: PumpkinVoxel.state().coins }; });
  await page.locator('[data-vg-focus="cider-orchard"]').click();
  const guide = await page.evaluate(() => { const p = PumpkinVoxel, st = p.village.status; return { panel: st.panel, surveying: st.surveying, waypoint: st.waypoint, unchangedPosition: JSON.stringify(window.__qaGuideBefore.position) === JSON.stringify(st.position), unchangedCoins: window.__qaGuideBefore.coins === p.state().coins }; });
  check('A map choice creates a walking guide, closes Map and preserves position and coins', guide.panel === null && !guide.surveying && guide.waypoint.placeId === 'cider-orchard' && guide.unchangedPosition && guide.unchangedCoins, guide);
  for (const [name, x, z] of [['Cider Orchard', 0, 51], ['Lantern Commons', 124, 59.5], ['Community Beds', 19, 72], ['Reading Court', 33, 24], ['Rowan’s Workyard', 82, 17.5]]) {
    await page.evaluate(({ x, z }) => PumpkinVoxel.village.place(x * 1.5, z * 1.5), { x, z });
    check('Local name reads ' + name, await page.locator('#vg-place').textContent() === name);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => PumpkinVoxel.village.place(14 * 1.5, 52 * 1.5, { x: 0, z: -1 })); await shot('orchard-walk.png');
  await page.evaluate(() => PumpkinVoxel.village.place(112 * 1.5, 58 * 1.5, { x: 1, z: 0 })); await shot('lantern-common.png');
  await page.evaluate(() => { window.__qaWalkBefore = PumpkinVoxel.village.status.position; });
  await page.keyboard.down('d'); await page.evaluate(() => { for (let i = 0; i < 8; i++) PumpkinVoxel.village.tick(.1); }); await page.keyboard.up('d');
  check('Movement remains available after choosing a garden destination', await page.evaluate(() => { const p = PumpkinVoxel.village.status.position, before = window.__qaWalkBefore; return !PumpkinVoxel.village.blocked && Math.hypot(p.x - before.x, p.z - before.z) > .2; }));
  await page.evaluate(() => PumpkinVoxel.village.enterHall('rowan-workshop'));
  check('Interior name takes precedence over an outdoor place', await page.locator('#vg-place').textContent() === "Rowan's workshop");
  await page.evaluate(() => { PumpkinVoxel.village.leaveHall(); PumpkinVoxel.village.requestReturn('header'); });
  check('Farm return still requires confirmation', await page.evaluate(() => PumpkinVoxel.village.active && !document.querySelector('#village-return-prompt').hidden));
  await page.locator('.village-return-cancel').click();
  check('Cancel keeps the village active and unblocked', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
  await page.evaluate(() => PumpkinVoxel.village.requestReturn('header')); await page.locator('.village-return-confirm').click();
  check('Confirmed return reaches the farm', await page.evaluate(() => !PumpkinVoxel.village.active && !document.body.classList.contains('in-village')));
  report.programs = await page.evaluate(() => { const programs = PumpkinVoxel.scene.debug.renderer.info.programs; return { count: programs.length, failed: programs.filter(p => p.diagnostics?.runnable === false).map(p => p.diagnostics) }; });
  check('Ordinary renderer compiled every observed program without shader or page errors', report.programs.failed.length === 0 && report.errors.length === 0, report.programs);
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser?.close(); await new Promise(r => server.close(r)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, screenshots: report.screenshots }));
if (!report.passed) process.exitCode = 1;
