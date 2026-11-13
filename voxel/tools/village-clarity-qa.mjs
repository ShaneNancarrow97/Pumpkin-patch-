// Exercise the exact offline build with its normal renderer. Fixture events
// test presentation only; they do not stand in for authored story completion.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] ?? '/tmp/village-clarity-qa/browser');
const deviceScaleFactor = Number(process.env.VILLAGE_QA_DPR) || 1;
const captureOnly = process.env.VILLAGE_QA_CAPTURE_ONLY === '1';
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), s = M.freshState();
Object.assign(s, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at });
s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.pending = [];
M.inviteToVillage(s); M.finishTour(s);
s.village.quests.invitation = { step: 3, done: true }; s.village.quests['two-doorbells'] = { step: 3, done: true };
s.village.built['rowan-workshop'] = true;
const report = { html: file, sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length,
  deviceScaleFactor, scope: 'Exact HTML served unchanged on loopback; normal SwiftShader renderer, not draw-held. Declared progressed farm fixture; direct place() stages interaction boundary and camera screenshots. Synthetic completion events verify presentation and no re-awarding, not actual story progress. Native controller transactions are covered by the separate rule/controller tests.', checks: [], errors: [], screenshots: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, ...(actual === undefined ? {} : { actual }) }); if (!pass) throw Error(label); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor });
  page.setDefaultTimeout(120000); page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(save => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp' })); }, M.saveData(s));
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('body[data-ready]');
  const shot = async name => { await page.screenshot({ path: path.join(out, name), timeout: 120000 }); report.screenshots.push(name); };
  report.capture = await page.evaluate(() => { const p = PumpkinVoxel; p.openVillage(); const saved = JSON.stringify(p.state()), target = p.scene.debug.renderer.getRenderTarget(), camera = p.scene.villageView.camera.matrixWorld.toArray().join(), at = performance.now(), first = p.scene.captureVillageMap(), elapsed = performance.now() - at, again = performance.now(), second = p.scene.captureVillageMap(); return { milliseconds: elapsed, cacheMilliseconds: performance.now() - again, cached: first === second, width: first.width, height: first.height, rendererTargetRestored: target === p.scene.debug.renderer.getRenderTarget(), playCameraRestored: camera === p.scene.villageView.camera.matrixWorld.toArray().join(), stateUnchanged: saved === JSON.stringify(p.state()) }; });
  check('World snapshot caches without changing the save, play camera or render target', report.capture.cached && report.capture.rendererTargetRestored && report.capture.playCameraRestored && report.capture.stateUnchanged, report.capture);
  await page.evaluate(() => PumpkinVoxel.village.showPanel('map'));
  await page.waitForFunction(() => document.querySelector('[data-vg-map-snapshot]')?.naturalWidth > 0);
  const map = await page.evaluate(() => ({ pictures: document.querySelectorAll('[data-vg-map-snapshot]').length, imageWidth: document.querySelector('[data-vg-map-snapshot]').naturalWidth, diagrams: document.querySelectorAll('.vg-map-chart > svg').length, routeBooks: document.querySelectorAll('.vgx-map-list').length, square: !!document.querySelector('.vg-map-square-pin'), acre: !!document.querySelector('[data-vg-map-district="acre"]'), cave: !!document.querySelector('[data-vg-map-district="cave-shallows"]'), residents: document.querySelectorAll('[data-vg-map-resident]').length }));
  check('One actual world snapshot with Square, Acre and cave markers', map.pictures === 1 && map.imageWidth >= 640 && map.diagrams === 0 && map.routeBooks === 0 && map.square && map.acre && map.cave, map);
  check('Default map keeps neighbour clutter hidden', map.residents === 0);
  await shot('phone-spatial-map.png');
  await fs.writeFile(path.join(out, 'world-map.png'), Buffer.from(await page.evaluate(() => document.querySelector('[data-vg-map-snapshot]').src.split(',')[1]), 'base64'));
  report.screenshots.push('world-map.png');
  await page.locator('[data-vg-map-neighbours]').click();
  check('Neighbour toggle shows image pins without raw image URL text', await page.evaluate(() => document.querySelectorAll('[data-vg-map-resident]').length > 0 && !/data:image/.test(document.querySelector('.vg-map-chart').textContent)));
  await page.locator('[data-vg-map-district="cave-shallows"]').click();
  check('Selected cave keeps the snapshot and explains its locked requirements', await page.evaluate(() => document.querySelectorAll('[data-vg-map-snapshot]').length === 1 && /Patch level|Complete/.test(document.querySelector('#vg-panel-body').textContent)));
  if (!captureOnly) {
  await page.evaluate(() => PumpkinVoxel.village.showPanel('people'));
  check('People distinguishes known homes from live whereabouts', await page.evaluate(() => /Known home|Moonroot|Quarry|Moor|Marsh/.test(document.querySelector('#vg-panel-body').textContent)));
  await shot('phone-people.png');
  await page.evaluate(() => { const p = PumpkinVoxel, at = p.scene.villageView.folk.talkSpot('rowan'); p.village.back(); p.village.place(at.x + 3, at.z); window.__qaMeet = p.village.meet('rowan'); });
  check('Talk activates at the exact inclusive outdoor boundary', await page.evaluate(() => !document.querySelector('#village-dialogue').hidden));
  await page.setViewportSize({ width: 1280, height: 800 });
  await shot('desktop-resident-dialogue.png');
  await page.evaluate(() => PumpkinVoxel.village.back());
  await page.waitForFunction(() => !PumpkinVoxel.village.blocked);
  await page.evaluate(() => PumpkinVoxel.village.enterHall('rowan-workshop'));
  check('Rowan workshop opens with movement available', await page.evaluate(() => PumpkinVoxel.village.status.inside === 'rowan-workshop' && !PumpkinVoxel.village.blocked));
  await page.evaluate(() => { const p = PumpkinVoxel; window.__qaSaved = JSON.stringify(p.state()); p.village.onEvent({ type: 'expansion-chapter-complete', chapter: 'green-research', title: 'A ward remembered', rewards: [{ kind: 'coins', amount: 250 }] }); p.village.onEvent({ type: 'quest-done', quest: 'two-doorbells', rewards: [] }); p.village.showPanel('journal'); p.village.tick(.1); });
  check('Shared completion receipt waits behind the journal', await page.evaluate(() => document.querySelector('#village-quest-receipt').hidden));
  await page.evaluate(() => { PumpkinVoxel.village.back(); PumpkinVoxel.village.tick(.1); });
  check('Chapter uses the shared presenter and never the old separate milestone overlay', await page.evaluate(() => !document.querySelector('#village-quest-receipt').hidden && document.querySelector('#village-quest-receipt').dataset.kind === 'chapter' && !document.querySelector('.vgx-milestone')));
  check('Presentation leaves earned coins and chapter receipts unchanged', await page.evaluate(() => { const before = JSON.parse(window.__qaSaved), after = PumpkinVoxel.state(); return before.coins === after.coins && JSON.stringify(before.village.expansion.receipts) === JSON.stringify(after.village.expansion.receipts); }));
  await shot('desktop-shared-receipt.png');
  await page.evaluate(() => { PumpkinVoxel.village.leaveHall(); PumpkinVoxel.village.requestReturn('header'); });
  check('Return requires explicit confirmation', await page.evaluate(() => PumpkinVoxel.village.active && !document.querySelector('#village-return-prompt').hidden));
  await page.locator('.village-return-cancel').click();
  check('Cancel stays in the village', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.status.returnPrompt));
  await page.evaluate(() => PumpkinVoxel.village.requestReturn('header'));
  await page.locator('.village-return-confirm').click();
  check('Confirm returns to an unblocked farm', await page.evaluate(() => !PumpkinVoxel.village.active && !document.body.classList.contains('in-village')));
  }
  check('No page errors', report.errors.length === 0, report.errors);
} catch (e) { report.errors.push(e.stack ?? String(e)); }
finally { await browser?.close(); await new Promise(r => server.close(r)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, screenshots: report.screenshots }));
if (!report.passed) process.exitCode = 1;
