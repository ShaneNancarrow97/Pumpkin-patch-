// The ordinary offline renderer: declared visual fixtures, UI actions and real
// keyboard walking. This is flow/art verification, not a hardware FPS claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]), baseline = process.argv.includes('--baseline'), tvOnly = process.argv.includes('--tv-only'), uiOnly = tvOnly || process.argv.includes('--ui-only');
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), state = M.freshState();
Object.assign(state, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); state.shop.arrivalTimer = 1e9;
state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.pending = []; state.progression.homeLegacyThrough = 20;
M.inviteToVillage(state); M.finishTour(state);
state.village.quests.invitation = { step: 3, done: true }; state.village.quests['two-doorbells'] = { step: 3, done: true };
state.village.built['elowen-library'] = state.village.built['rowan-workshop'] = true;
state.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
for (const who of ['elowen', 'rowan', 'mabel', 'tansy', 'opal', 'cinder', 'corvus', 'baron', 'granny']) state.village.friends[who] = { met: true, xp: 1080, chatIn: 0, gifts: [], seen: [] };
M.startQuest(state, 'rowan-1'); M.actVillageExpansion(state, 'track', { chapter: 'green-research' });
const preferences = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', villageTrackedQuest: 'green-research' };
const report = { file, baseline, uiOnly, tvOnly, htmlSha256: createHash('sha256').update(html).digest('hex'), bytes: html.length,
  scope: 'Normal SwiftShader renderer. Declared progressed save opens existing district/home gates for comparison, without completing the authored stories through play. place() stages matching views; clock staging tests display palettes only. UI choices and real keyboard input check the followed task, map route, menu release and confirmed return. No draw suppression, device FPS claim or physical controller certification.', checks: [], errors: [], screenshots: [], places: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, ...(actual === undefined ? {} : { actual }) }); if (!pass) throw Error(label); console.log('ok ' + label); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.setDefaultTimeout(180000);
  page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') { report.errors.push(m.text()); console.log('CONSOLE ERROR ' + m.text().slice(0, 300)); } });
  await page.addInitScript(({ save, preferences }) => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(preferences)); const NativeDate = Date, wall = new NativeDate('2026-11-13T21:00:00Z').getTime(); window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [wall])); } static now() { return wall; } }; }, { save: M.saveData(state), preferences });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForSelector('body[data-ready]'); console.log('ready');
  await page.evaluate(() => PumpkinVoxel.openVillage());
  const shot = async (name, preserveInput = false) => { if (!preserveInput) await page.keyboard.press('Shift'); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name); console.log('shot ' + name); };
  const stage = async (x, z, { yaw = 0, pitch = .32, distance = 12 } = {}) => { await page.keyboard.press('Shift'); await page.evaluate(({ x, z, yaw, pitch, distance }) => { const p = PumpkinVoxel, v = p.scene.villageView; p.village.place(x, z, { x: 0, z: -1 }); v.play.reset(v.play.state.subject, { yaw, pitch, distance }); v.tick(.1); }, { x, z, yaw, pitch, distance }); };
  if (!uiOnly) {
  const spots = [['green', 87, 12], ['square', 87, 78], ...['copse', 'quarry', 'moor', 'marsh', 'acre'].map(id => { const a = M.EXPANSION_AREAS.find(a => a.id === id); return [id, a.spawn.x, a.spawn.z]; })];
  for (const [id, x, z] of spots) {
    await stage(x, z); await shot(`district-${id}.png`);
    const view = await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView, lights = v.scene.children.filter(o => o.isPointLight); return { position: PumpkinVoxel.village.status.position, atmosphere: v.districtAtmosphereStats, contacts: v.contactShadowStats, grade: v.scene.userData.grade, fog: v.scene.fog.color.toArray(), lights: lights.length }; });
    report.places.push({ id, ...view });
    if (!baseline) check(`${id} uses its world palette and the existing eight-light pool`, view.atmosphere.district === id && view.lights === 8, { atmosphere: view.atmosphere, lights: view.lights });
  }
  await stage(-138, 179.25, { pitch: .24, distance: 12 }); await shot('granny-cottage-exterior.png');
  for (const [id, name] of [['baron-manor', 'baron'], ['granny-cottage', 'granny']]) {
    await page.evaluate(id => { const p = PumpkinVoxel, door = p.scene.villageView.insidePlan(id).door, [nx, nz] = { north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] }[door.facing]; p.village.place((door.x + nx * 1.4) * 1.5, (door.z + nz * 1.4) * 1.5); p.village.enterHall(id); }, id);
    check(`${name} home opens through its existing gate`, await page.evaluate(id => PumpkinVoxel.village.status.inside === id, id));
    await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView; v.play.reset(v.play.state.subject, { yaw: 0, pitch: .52, distance: 12 }); v.tick(.1); });
    await shot(`${name}-interior.png`);
    if (!baseline) {
      const contacts = await page.evaluate(() => PumpkinVoxel.scene.villageView.contactShadowStats);
      check(`${name} room grounds its owner and host within the single contact batch`, contacts.count >= 2 && contacts.capacity === 32 && contacts.triangles <= 64, contacts);
    }
    await page.evaluate(() => PumpkinVoxel.village.leaveHall());
  }
  if (!baseline) {
    await stage(87, 78);
    const water = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView, before = v.waterStats.time; v.tick(.25); const moving = v.waterStats.time; p.state().paused = true; v.tick(.25); const paused = v.waterStats.time; p.state().paused = false; return { before, moving, paused, stats: v.waterStats }; });
    check('Shared water moves on the view clock and rests during pause', water.moving > water.before && water.paused === water.moving && water.stats.addedMeshes === 0 && water.stats.addedLights === 0, water);
    const phase = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView, clock = p.state().village.clock; p.state().village.clock = 1800; v.tick(.1); const dusk = { ...v.districtAtmosphereStats }; p.state().village.clock = clock; v.tick(.1); return { dusk, restored: { ...v.districtAtmosphereStats } }; });
    check('The saved village clock controls the subtle time palette without changing district', phase.dusk.phase === 'dusk' && phase.restored.phase === 'night' && phase.dusk.district === 'square', phase);
  }
  const snapshot = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView, saved = JSON.stringify(p.state()), grade = v.scene.userData.grade, colours = v.scene.children.filter(o => o.isLight).map(l => [l.color.toArray(), l.intensity, l.groundColor?.toArray()]), target = p.scene.debug.renderer.getRenderTarget(), camera = v.camera.matrixWorld.toArray().join(), first = p.scene.captureVillageMap(), second = p.scene.captureVillageMap(); return { url: first.url, cached: first === second, unchanged: saved === JSON.stringify(p.state()), gradeRestored: grade === v.scene.userData.grade, paletteRestored: JSON.stringify(colours) === JSON.stringify(v.scene.children.filter(o => o.isLight).map(l => [l.color.toArray(), l.intensity, l.groundColor?.toArray()])), targetRestored: target === p.scene.debug.renderer.getRenderTarget(), cameraRestored: camera === v.camera.matrixWorld.toArray().join() }; });
  check('The actual-world atlas restores save, camera, grade, palette and render target', snapshot.cached && snapshot.unchanged && snapshot.gradeRestored && snapshot.paletteRestored && snapshot.targetRestored && snapshot.cameraRestored);
  await fs.writeFile(path.join(out, 'village-world-atlas.png'), Buffer.from(snapshot.url.split(',')[1], 'base64')); report.screenshots.push('village-world-atlas.png');
  }
  if (!tvOnly) { await page.evaluate(() => PumpkinVoxel.village.showPanel('journal')); await shot('desktop-journal.png'); }
  if (!baseline) {
    if (!tvOnly) {
    const archived = await page.evaluate(() => [...document.querySelectorAll('details[data-vg-details-key="objectives:later"],details[data-vg-details-key="objectives:finished"]')].every(d => !d.open));
    check('One followed story leads the journal; future and finished information starts folded', archived && await page.locator('.vg-journal-following').count() === 1);
    const legacy = page.locator('details[data-vg-details-key="objective:rowan-1"]'); await legacy.locator(':scope > summary').click();
    await page.locator('[data-vg-track="rowan-1"]').click();
    check('Following a legacy quest replaces the chapter in both the journal and tracker', await page.evaluate(() => PumpkinVoxel.village.status.trackedQuest === 'rowan-1' && document.querySelector('#vg-quest-title').textContent === 'Loose Boards'));
    await page.evaluate(() => PumpkinVoxel.village.showPanel('map'));
    check('The map offers the same followed legacy objective', await page.locator('[data-vg-objective-guide="rowan-1"]').count() > 0);
    await page.locator('[data-vg-objective-guide="rowan-1"]').first().click();
    check('Map routing keeps legacy objective ownership and releases play', await page.evaluate(() => PumpkinVoxel.village.status.waypoint?.objectiveId === 'rowan-1' && !PumpkinVoxel.village.blocked));
    await page.evaluate(() => PumpkinVoxel.village.showPanel('journal'));
    for (const [name, width, height] of [['phone-journal.png', 390, 844], ['landscape-journal.png', 844, 390], ['fold-journal.png', 720, 900]]) {
      await page.setViewportSize({ width, height }); await page.locator('#vg-panel-body').evaluate(el => { el.scrollTop = 0; }); await shot(name);
      const layout = await page.locator('#vg-panel-body').evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth, font: parseFloat(getComputedStyle(el).fontSize) }));
      check(`${width}×${height} journal keeps a vertical reading flow`, layout.overflow <= 1, layout);
    }
    await page.evaluate(() => PumpkinVoxel.village.back()); await page.setViewportSize({ width: 1280, height: 800 }); await stage(87, 12);
    await page.evaluate(() => { window.__qaWalk = PumpkinVoxel.village.status.position; }); await page.keyboard.down('d'); await page.evaluate(() => { for (let i = 0; i < 8; i++) PumpkinVoxel.village.tick(.1); }); await page.keyboard.up('d');
    check('Walking remains available after journal and map navigation', await page.evaluate(() => { const p = PumpkinVoxel.village.status.position, b = window.__qaWalk; return !PumpkinVoxel.village.blocked && Math.hypot(p.x - b.x, p.z - b.z) > .2; }));
    await page.evaluate(() => PumpkinVoxel.village.requestReturn('header')); await page.locator('.village-return-cancel').click();
    check('Cancelling return keeps village control available', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
    await page.evaluate(() => PumpkinVoxel.village.requestReturn('header')); await page.locator('.village-return-confirm').click();
    check('Confirmed return reaches the farm', await page.evaluate(() => !PumpkinVoxel.village.active && !document.body.classList.contains('in-village')));
    } else await page.evaluate(() => PumpkinVoxel.village.close());
    // Exercise the shipped TV preference through its real Settings control.
    await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => PumpkinVoxel.openSheet('settings'));
    if (!await page.evaluate(() => document.body.classList.contains('tv-mode'))) await page.locator('#toggle-tv').click();
    await page.locator('#sheet-close').click(); await page.evaluate(() => { PumpkinVoxel.openVillage(); PumpkinVoxel.village.showPanel('journal'); });
    check('The journal opens with the actual TV-mode setting', await page.evaluate(() => document.body.classList.contains('tv-mode') && PumpkinVoxel.village.status.panel === 'journal'));
    await shot('tv-journal.png');
    await page.evaluate(() => { window.__qaPad = { id: 'DualSense Wireless Controller QA', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) }; Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__qaPad] }); });
    const neutral = async index => { await page.evaluate(i => { window.__qaPad.buttons[i] = { pressed: false, value: 0 }; }, index); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    const press = index => page.evaluate(i => { window.__qaPad.buttons[i] = { pressed: true, value: 1 }; }, index);
    await neutral(9); await press(9); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === null); await neutral(9);
    await press(9); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'navigation'); await neutral(9);
    const beforeFocus = await page.evaluate(() => document.activeElement?.dataset.vgPage); await press(13);
    await page.waitForFunction(before => document.activeElement?.dataset.vgPage && document.activeElement.dataset.vgPage !== before, beforeFocus); await neutral(13);
    const destination = await page.evaluate(() => document.activeElement.dataset.vgPage); await press(0);
    await page.waitForFunction(expected => PumpkinVoxel.village.status.panel === expected, destination); await neutral(0);
    check('Injected DualSense Options, D-pad and Cross open and select real village menus', ['map', 'people', 'journal', 'materials', 'upgrades'].includes(destination), { source: 'Standard Gamepad API mock, not physical Bluetooth', destination });
    await page.evaluate(() => { const p = PumpkinVoxel; while (p.village.status.panel) p.village.back(); const at = p.scene.villageView.folk.talkSpot('rowan'); p.village.place(at.x, at.z); p.village.meet('rowan'); });
    await page.waitForSelector('#village-dialogue:not([hidden])');
    const readContrast = () => page.evaluate(() => {
      const el = document.querySelector('#village-dialogue .village-reply[data-pad-focus],#village-dialogue .village-reply:focus'); if (!el) return { pass: false, reason: 'No focused reply' };
      const style = getComputedStyle(el), rgb = value => [...value.matchAll(/rgba?\(([^)]+)\)/g)].map(m => m[1].split(/[, /]+/).filter(Boolean).map(Number));
      const luminance = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const colours = rgb(style.backgroundImage), foreground = rgb(style.color)[0], note = el.querySelector('.village-reply-note,.village-reply-tone'), inks = [foreground, ...(note ? rgb(getComputedStyle(note).color) : [])];
      const ratios = colours.flatMap(c => inks.map(ink => { const a = luminance(c), b = luminance(ink); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
      return { pass: colours.length >= 2 && colours.every(c => (c[3] ?? 1) >= .96) && ratios.every(r => r >= 4.5), minimumContrast: Math.min(...ratios), backgroundImage: style.backgroundImage, backgroundColour: style.backgroundColor, ink: style.color };
    });
    const contrast = await readContrast();
    check('The TV-focused reply has an opaque surface and readable label and note contrast', contrast.pass, contrast);
    await shot('tv-neighbour-dialogue.png', true);
    await page.locator('#village-dialogue .village-reply[data-pad-focus]').hover();
    const hoveredContrast = await readContrast();
    check('Hovering the selected TV reply preserves readable action colours', hoveredContrast.pass, hoveredContrast);
    check('The neighbour greeting exposes one primary story action and an accessible story list', await page.locator('#village-dialogue [data-village-choice-id^="quest:"],#village-dialogue [data-village-choice-id^="expansion:"]').count() === 1 && await page.locator('#village-dialogue .village-reply').filter({ hasText: 'Other stories' }).count() === 1);
    await page.locator('#village-dialogue .village-reply').filter({ hasText: 'Other stories' }).click();
    check('Other stories opens the selected neighbour’s journal without remote transactions', await page.evaluate(() => PumpkinVoxel.village.status.panel === 'journal' && PumpkinVoxel.village.status.panelId === 'rowan'));
  }
  report.programs = await page.evaluate(() => { const programs = PumpkinVoxel.scene.debug.renderer.info.programs; return { count: programs.length, failed: programs.filter(p => p.diagnostics?.runnable === false).map(p => p.diagnostics) }; });
  check('Normal draws compiled every observed program without page, console or shader errors', report.programs.failed.length === 0 && report.errors.length === 0, report.programs);
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser?.close(); await new Promise(r => server.close(r)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, screenshots: report.screenshots }));
if (!report.passed) process.exitCode = 1;
