// Inspect the new neighbourhoods in the normally rendered, exact offline game.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3] ?? '/tmp/village-cohesion-qa');
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), state = M.freshState();
Object.assign(state, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at });
state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.pending = [];
M.inviteToVillage(state); M.finishTour(state);
state.village.quests.invitation = { step: 3, done: true }; state.village.quests['two-doorbells'] = { step: 3, done: true };
state.village.built['elowen-library'] = state.village.built['rowan-workshop'] = true;
const report = { html: file, sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length,
  scope: 'Declared progressed save. Normal SwiftShader rendering, no held draws. place() stages view positions; real keyboard input plus direct controller ticks tests park access, and short ticks exercise cosmetic visitors. These are functional checks, not performance measurements. Candidate/resource and full path walking compatibility are tested separately in pure navigation checks.', checks: [], errors: [], screenshots: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, ...(actual === undefined ? {} : { actual }) }); if (!pass) throw Error(label); console.log('ok ' + label); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(180000);
  page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(save => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp' })); }, M.saveData(state));
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('body[data-ready]'); console.log('ready');
  const budget = await page.evaluate(() => { PumpkinVoxel.openVillage(); return PumpkinVoxel.scene.villageView.neighbourhoodStatus; });
  report.neighbourhoods = budget;
  check('Twenty-two authored neighbourhood clusters use three bounded batches and no new lights', budget.activeIDs.length === 22 && budget.visualBudget.boxes <= 8000 && budget.visualBudget.meshes <= 3 && budget.visualBudget.addedLights === 0, budget.visualBudget);
  check('The finished gardens use the existing eight-light pool and all measured solids', budget.obstacles.length === 59 && await page.evaluate(() => PumpkinVoxel.scene.villageView.scene.children.filter(o => o.isPointLight).length === 8));
  const snapshot = await page.evaluate(() => { const p = PumpkinVoxel, saved = JSON.stringify(p.state()), first = p.scene.captureVillageMap(), second = p.scene.captureVillageMap(); return { url: first.url, cached: first === second, unchanged: saved === JSON.stringify(p.state()) }; });
  check('The atlas captures the actual dressed world and caches without changing the save', snapshot.cached && snapshot.unchanged);
  await fs.writeFile(path.join(out, 'village-world-atlas.png'), Buffer.from(snapshot.url.split(',')[1], 'base64')); report.screenshots.push('village-world-atlas.png');
  await page.evaluate(() => PumpkinVoxel.village.place(119.7 * 1.5, 58 * 1.5, { x: 0, z: -1 }));
  await page.keyboard.down('d'); await page.evaluate(() => { for (let i = 0; i < 20; i++) PumpkinVoxel.village.tick(.1); }); await page.keyboard.up('d');
  check('Actual keyboard movement can reach the eastern park beyond the old x120 boundary', await page.evaluate(() => PumpkinVoxel.village.status.position.x > 120.3 * 1.5));
  const shot = async (name, x, z, heading) => {
    await page.evaluate(({ x, z, heading }) => { PumpkinVoxel.village.place(x * 1.5, z * 1.5, heading); }, { x, z, heading });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name); console.log('shot ' + name);
  };
  await shot('orchard-and-gardens.png', 14, 52, { x: 0, z: -1 });
  await shot('lantern-common.png', 112, 58, { x: 1, z: 0 });
  await shot('library-court.png', 34, 23, { x: 0, z: -1 });
  const suppression = await page.evaluate(() => {
    const p = PumpkinVoxel, placed = p.state().village.decor.placed;
    placed.push({ id: 'moth-lamp', instance: 'qa-owned-court', x: 49.5, z: 40.5, rotation: 15 }); p.scene.villageView.sync();
    const hidden = !p.scene.villageView.neighbourhoodStatus.activeIDs.includes('library-reading-court');
    placed.pop(); p.scene.villageView.sync();
    return { hidden, restored: p.scene.villageView.neighbourhoodStatus.activeIDs.includes('library-reading-court') };
  });
  check('An existing owned decoration takes priority and the native court restores when it is removed', suppression.hidden && suppression.restored, suppression);
  const traffic = await page.evaluate(() => { const p = PumpkinVoxel; for (let i = 0; i < 32; i++) p.village.tick(.25); return p.village.status.wanderers; });
  check('Two or three cosmetic passers-by include an actual moving garden stroller', traffic.count >= 2 && traffic.count <= 3 && traffic.people.some(p => ['cider-orchard', 'lantern-common'].includes(p.lane) && p.distance > 0), traffic.people);
  await page.evaluate(() => PumpkinVoxel.village.showPanel('map'));
  await page.waitForFunction(() => document.querySelector('[data-vg-map-snapshot]')?.naturalWidth > 0);
  await page.setViewportSize({ width: 720, height: 900 });
  await page.screenshot({ path: path.join(out, 'fold-village-map.png'), timeout: 180000 }); report.screenshots.push('fold-village-map.png');
  check('The actual world snapshot remains available in the Fold-sized map', await page.locator('[data-vg-map-snapshot]').count() === 1);
  check('No page errors', report.errors.length === 0, report.errors);
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser?.close(); await new Promise(r => server.close(r)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, screenshots: report.screenshots }));
if (!report.passed) process.exitCode = 1;
