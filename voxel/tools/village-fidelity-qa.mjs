// Ordinary offline renders compare the playable village, never the supplied
// concept image. Staged fixtures are explicit; software GL is not device FPS.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { VILLAGE_ATMOSPHERE_CYCLE_SECONDS, villageAtmosphereAt } from '../src/content/village-grade.js';
import { OUTSIDE_VIEW } from '../src/village-camera.js';

const argv = process.argv.slice(2), file = path.resolve(argv[0]), out = path.resolve(argv[1]);
const baseline = argv.includes('--baseline'), tvOnly = argv.includes('--tv-only'), referenceOnly = argv.includes('--reference-only'), conversationOnly = argv.includes('--conversation-only'), uiOnly = tvOnly || conversationOnly || argv.includes('--ui-only'), worldOnly = argv.includes('--world-only');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const duskClock = VILLAGE_ATMOSPHERE_CYCLE_SECONDS * 2 / 3;
if (villageAtmosphereAt(null, duskClock).phase !== 'dusk') throw Error('The existing saved-clock dusk contract changed');
const html = await fs.readFile(file), state = M.freshState();
Object.assign(state, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); state.shop.arrivalTimer = 1e9;
state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.pending = []; state.progression.homeLegacyThrough = 20;
M.inviteToVillage(state); M.finishTour(state); state.village.clock = duskClock;
state.village.quests.invitation = { step: 3, done: true }; state.village.quests['two-doorbells'] = { step: 3, done: true };
state.village.built['elowen-library'] = state.village.built['rowan-workshop'] = true;
state.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
for (const who of ['elowen', 'rowan', 'mabel', 'tansy', 'opal', 'cinder', 'corvus', 'baron', 'granny']) state.village.friends[who] = { met: true, xp: 1080, chatIn: 0, gifts: [], seen: [] };
M.startQuest(state, 'rowan-1'); M.actVillageExpansion(state, 'track', { chapter: 'green-research' });
const fixture = M.saveData(state), preferences = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', voxelCharacters: false, glow: true, shadows: true, villageTrackedQuest: 'green-research' };
const views = { entrance: { x: 87, z: -7.5, yaw: 0, pitch: .30, distance: 13 }, detail: { x: 83, z: -3, yaw: -.12, pitch: .30, distance: 8 }, granny: { x: -138, z: 179.25, yaw: 0, pitch: .24, distance: 12 }, square: { x: 87, z: 78, yaw: 0, pitch: .30, distance: 13 } };
// Keep the original wide comparison unchanged. This additional view uses the
// shipped follow-camera numbers rather than shrinking or faking the owner.
const referenceEntrance = { x: 87, z: -16.5, yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance };
const report = { file, baseline, uiOnly, tvOnly, worldOnly, referenceOnly, conversationOnly, htmlSha256: sha(html), bytes: html.length, harnessSha256: sha(await fs.readFile(new URL(import.meta.url))), fixtureSha256: sha(JSON.stringify(fixture)), stateVersion: state.version, preferences, staging: { duskClock, period: VILLAGE_ATMOSPHERE_CYCLE_SECONDS, phase: 'dusk', owner: 'natalie', views, referenceEntrance, referenceComparison: { baselineAndFinalUseSamePose: true, cameraSource: 'OUTSIDE_VIEW.pitch and OUTSIDE_VIEW.distance', wideComparisonPoseUnchanged: true }, wallClock: '2026-11-13T21:00:00Z', randomSeed: 20261113 }, scope: 'Exact offline HTML served unchanged over loopback. Normal native RAF, renderer and composer throughout; no held draws or manual renders. A declared progressed fixture opens existing gates without claiming authored story completion. place() and saved-clock staging compose matching views; keyboard and injected standard Gamepad API exercise actual input. No physical Bluetooth or device FPS certification.', checks: [], errors: [], consoleErrors: [], externalRequests: [], screenshots: [], views: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, ...(actual === undefined ? {} : { actual }) }); console.log(`${pass ? 'ok' : 'FAIL'} ${label}`); if (!pass) throw Error(label); };
await fs.mkdir(out, { recursive: true });
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }); page.setDefaultTimeout(180000);
  page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('request', req => { if (/^https?:/.test(req.url()) && !req.url().startsWith(`http://127.0.0.1:${server.address().port}`)) report.externalRequests.push(req.url()); });
  await page.addInitScript(({ save, preferences }) => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(preferences)); const NativeDate = Date, wall = new NativeDate('2026-11-13T21:00:00Z').getTime(); window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [wall])); } static now() { return wall; } }; let seed = 20261113; Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }; }, { save: fixture, preferences });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForSelector('body[data-ready]'); console.log('ready');
  await page.evaluate(() => { const p = PumpkinVoxel; p.scene.player.setEnabled(true, 'natalie'); p.openVillage(); });
  const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const stage = async (id, pose = views[id]) => { await page.keyboard.press('Shift'); await page.evaluate(({ pose, clock }) => { const p = PumpkinVoxel, v = p.scene.villageView; while (p.village.status.panel) p.village.back(); p.state().village.clock = clock; p.village.place(pose.x, pose.z, { x: 0, z: -1 }); v.play.reset(v.play.state.subject, { yaw: pose.yaw, pitch: pose.pitch, distance: pose.distance }); v.tick(.1); }, { pose, clock: duskClock }); await frames(); };
  const shot = async (name, { preserveInput = false } = {}) => { if (!preserveInput) await page.keyboard.press('Shift'); await frames(); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name); console.log(`shot ${name}`); };
  const viewInfo = () => page.evaluate(() => { const v = PumpkinVoxel.scene.villageView, renderer = PumpkinVoxel.scene.debug.renderer; let meshes = 0, instances = 0; v.scene.traverse(o => { if (o.isMesh) meshes++; if (o.isInstancedMesh) instances += o.count; }); return { position: PumpkinVoxel.village.status.position, who: PumpkinVoxel.village.status.who, atmosphere: v.districtAtmosphereStats, fidelity: v.fidelityStats ?? null, contact: v.contactShadowStats, lights: v.scene.children.filter(o => o.isPointLight).length, meshes, instances, memory: { ...renderer.info.memory }, programs: renderer.info.programs.length, lastRenderPass: { ...renderer.info.render } }; });
  if (referenceOnly) {
    await stage('reference-entrance', referenceEntrance); await shot('entrance-reference-world.png'); report.views.push({ id: 'reference-entrance', ...await viewInfo() });
    await page.evaluate(() => PumpkinVoxel.village.showPanel('journal')); await shot('entrance-reference-journal.png');
    if (!baseline) {
      check('The actual ground texture keeps native arrival lawns green and roads bare', ...(await groundTextureCheck(page)));
      await openRowan(page, frames); await dialoguePadInput(page, frames); await shot('conversation-desktop.png', { preserveInput: true });
      check('The reference conversation preserves its canonical greeting choices', ...(await dialogueChoiceCheck(page)));
      check('The reference conversation has readable, contained desktop surfaces', ...(await conversationLayoutCheck(page)));
      check('The selected reference reply has an opaque readable gold surface', ...(await dialogueContrastCheck(page)));
    }
  }
  if (!uiOnly && !referenceOnly) {
    await stage('entrance'); await shot('entrance-world.png'); const entrance = await viewInfo(); report.views.push({ id: 'entrance', ...entrance });
    check('The staged entrance is the playable Natalie village at the existing dusk phase', entrance.who === 'natalie' && entrance.atmosphere.phase === 'dusk' && entrance.lights === 8, entrance);
    await page.evaluate(() => PumpkinVoxel.village.showPanel('journal')); await shot('entrance-journal.png');
    await stage('detail'); await shot('entrance-detail.png'); report.views.push({ id: 'detail', ...await viewInfo() });
    await stage('granny'); await shot('granny-cottage.png'); report.views.push({ id: 'granny', ...await viewInfo() });
    await stage('square'); await shot('moonclock-square.png'); report.views.push({ id: 'square', ...await viewInfo() });
    if (!baseline) {
      check('The actual ground texture keeps native arrival lawns green and roads bare', ...(await groundTextureCheck(page)));
      const stats = await page.evaluate(() => PumpkinVoxel.scene.villageView.fidelityStats);
      check('Fidelity keeps sky on its existing draw and air within two bounded batches', stats?.sky?.addedDrawCalls === 0 && stats.sky.addedTextures === 0 && stats.sky.addedLights === 0 && stats.sky.addedPasses === 0 && stats.air.drawCalls <= 2 && stats.air.triangles <= 76 && stats.air.lights === 0 && stats.air.textures === 0, stats);
      const paused = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView; p.state().paused = true; const before = JSON.stringify(v.fidelityStats); v.tick(.25); const after = JSON.stringify(v.fidelityStats); p.state().paused = false; return { held: before === after }; });
      check('New sky and air clocks hold while the game is paused', paused.held, paused);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await page.evaluate(() => { const v = PumpkinVoxel.scene.villageView; v.tick(.1); const before = JSON.stringify(v.fidelityStats); v.tick(.25); return { held: before === JSON.stringify(v.fidelityStats) }; });
      check('Reduced motion holds the new visual clocks', reduced.held, reduced); await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    if (!argv.includes('--no-atlas')) {
      const snapshot = await page.evaluate(() => { const p = PumpkinVoxel, v = p.scene.villageView, saved = JSON.stringify(p.state()), grade = v.scene.userData.grade, colours = v.scene.children.filter(o => o.isLight).map(l => [l.color.toArray(), l.intensity, l.groundColor?.toArray()]), target = p.scene.debug.renderer.getRenderTarget(), camera = v.camera.matrixWorld.toArray().join(), fidelity = JSON.stringify(v.fidelityStats ?? null), objects = []; v.scene.traverse(o => { if (o.userData.villageDuskSky || o.name === 'village-light-air') objects.push([o, o.visible]); }); const first = p.scene.captureVillageMap(), second = p.scene.captureVillageMap(); return { url: first.url, cached: first === second, unchanged: saved === JSON.stringify(p.state()), gradeRestored: grade === v.scene.userData.grade, paletteRestored: JSON.stringify(colours) === JSON.stringify(v.scene.children.filter(o => o.isLight).map(l => [l.color.toArray(), l.intensity, l.groundColor?.toArray()])), targetRestored: target === p.scene.debug.renderer.getRenderTarget(), cameraRestored: camera === v.camera.matrixWorld.toArray().join(), fidelityRestored: fidelity === JSON.stringify(v.fidelityStats ?? null) && objects.every(([o, visible]) => o.visible === visible) }; });
      check('Atlas capture restores the exact save, camera, palette, target and fidelity state', snapshot.cached && snapshot.unchanged && snapshot.gradeRestored && snapshot.paletteRestored && snapshot.targetRestored && snapshot.cameraRestored && snapshot.fidelityRestored);
      await fs.writeFile(path.join(out, 'actual-world-atlas.png'), Buffer.from(snapshot.url.split(',')[1], 'base64')); report.screenshots.push('actual-world-atlas.png');
    }
  }
  if (!worldOnly && !referenceOnly) {
    if (!conversationOnly) { await stage('entrance'); await page.evaluate(() => PumpkinVoxel.village.showPanel('journal')); }
    if (!tvOnly) {
      if (!conversationOnly) {
      await shot('journal-desktop.png');
      if (!baseline) await journalChecks(page, check);
      for (const [name, width, height] of [['phone', 390, 844], ['landscape', 844, 390], ['fold', 720, 900]]) {
        await page.setViewportSize({ width, height }); await page.locator('#vg-panel-body').evaluate(el => { el.scrollTop = 0; }); await shot(`journal-${name}.png`);
        if (!baseline) check(`${width}×${height} keeps legible controls in one vertical reading flow`, ...(await layoutCheck(page)));
      }
      await page.setViewportSize({ width: 1280, height: 720 });
      if (!baseline) await routeChecks(page, check);
      }
      if (!baseline) await conversationScreens(page, check, frames, shot);
    }
    await page.evaluate(() => PumpkinVoxel.village.close()); await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => PumpkinVoxel.openSheet('settings'));
    if (!await page.evaluate(() => document.body.classList.contains('tv-mode'))) await page.locator('#toggle-tv').click();
    await page.locator('#sheet-close').click(); await page.evaluate(() => { const p = PumpkinVoxel; p.state().village.clock = 1800; p.openVillage(); p.village.showPanel('journal'); });
    if (!conversationOnly) {
      await shot('journal-tv.png');
      if (!baseline) { check('The final journal uses the real TV mode and its accessible layout', await page.evaluate(() => document.body.classList.contains('tv-mode'))); check('TV journal keeps readable controls and contained text', ...(await layoutCheck(page))); await controllerChecks(page, check, frames); }
    }
    if (!baseline) {
      await openRowan(page, frames); await dialoguePadInput(page, frames); await shot('conversation-tv.png', { preserveInput: true });
      check('TV conversation preserves its canonical greeting choices', ...(await dialogueChoiceCheck(page)));
      check('TV conversation text and controls stay legible and contained', ...(await conversationLayoutCheck(page)));
      check('The selected TV reply keeps opaque gold and readable label and note contrast', ...(await dialogueContrastCheck(page)));
    }
    report.views.push({ id: 'tv', ...await viewInfo() });
    if (!baseline) { const budget = await page.evaluate(() => PumpkinVoxel.scene.villageView.fidelityStats?.air); check('TV air uses its reduced bounded workload', budget?.shafts <= 3 && budget.fireflies <= 16 && budget.triangles <= 38, budget); }
  }
  report.programs = await page.evaluate(() => { const programs = PumpkinVoxel.scene.debug.renderer.info.programs; return { count: programs.length, failed: programs.filter(p => p.diagnostics?.runnable === false).map(p => p.diagnostics) }; });
  check('Normal rendering completes without page, console, shader or external-request errors', !report.errors.length && !report.consoleErrors.length && !report.programs.failed.length && !report.externalRequests.length, report.programs);
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser?.close(); await new Promise(r => server.close(r)); }
report.passed = !report.errors.length && !report.consoleErrors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, screenshots: report.screenshots }));
if (!report.passed) process.exitCode = 1;

// These helpers inspect real DOM surfaces and use the existing canonical actions.
async function journalChecks(page, check) {
  const tabs = await page.locator('.vf-journal-tabs [role=tab]').evaluateAll(items => items.map(el => ({ id: el.dataset.vgJournalTab, selected: el.getAttribute('aria-selected'), controls: el.getAttribute('aria-controls'), tabIndex: el.tabIndex })));
  check('Active, Discover and Completed are real labelled journal tabs', tabs.length === 3 && tabs.map(t => t.id).join() === 'active,discover,completed' && tabs.filter(t => t.selected === 'true' && t.tabIndex === 0).length === 1, tabs);
  for (const [key, id] of [['ArrowRight', 'discover'], ['End', 'completed'], ['Home', 'active']]) {
    if (key === 'ArrowRight') await page.locator('[data-vg-journal-tab=active]').focus();
    await page.keyboard.press(key);
    const selection = await page.evaluate(() => ({ selected: PumpkinVoxel.village.status.journalTab, panels: [...document.querySelectorAll('.vf-journal-page')].filter(el => !el.hidden).map(el => el.id), focused: document.activeElement?.dataset.vgJournalTab }));
    check(`${key} selects ${id} without exposing another journal page`, selection.selected === id && selection.focused === id && selection.panels.length === 1 && selection.panels[0] === `vf-page-${id}`, selection);
  }
  const hero = await page.locator('.vf-story-hero').evaluate(el => ({ id: el.dataset.questCard, portrait: !!el.querySelector('.vf-story-portrait img'), guideButtons: el.querySelectorAll('.vf-show-way').length, folded: !el.querySelector('.vf-story-fold').open, progress: { value: el.querySelector('meter').value, max: el.querySelector('meter').max }, text: el.querySelector('.vf-next-objective').textContent.trim() }));
  check('One portrait-led followed task exposes its actual progress and one primary route action', await page.locator('.vg-journal-following').count() === 1 && hero.id === 'green-research' && hero.portrait && hero.guideButtons === 1 && hero.folded && hero.progress.max > hero.progress.value && hero.text.length > 15, hero);
  const layout = await page.locator('#vg-panel').evaluate(el => { const b = el.getBoundingClientRect(); return { width: b.width, height: b.height, left: b.left, right: b.right, viewportWidth: innerWidth, viewportHeight: innerHeight }; });
  check('The desktop journal leaves most of the world visible', layout.width <= 430 && layout.width / layout.viewportWidth <= .34 && layout.left >= layout.viewportWidth * .62 && layout.height <= layout.viewportHeight - 140, layout);
  check('Desktop journal text and controls remain legible', ...(await layoutCheck(page)));
  const hud = await page.evaluate(() => { const r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; }; return { header: r('.vg-heading'), dock: r('.vg-dock'), objective: r('#vg-objective'), area: innerWidth * innerHeight }; });
  check('Default village chrome stays compact at the edges', hud.header.height <= 70 && hud.dock.height <= 86 && hud.dock.width <= 520 && hud.objective.width <= 360 && (hud.header.width * hud.header.height + hud.dock.width * hud.dock.height + hud.objective.width * hud.objective.height) / hud.area < .23, hud);
}
async function layoutCheck(page) {
  const actual = await page.locator('#vg-panel').evaluate(panel => {
    const visible = el => { const style = getComputedStyle(el); if (el.closest('[hidden]') || style.visibility === 'hidden' || style.display === 'none') return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const controls = [...panel.querySelectorAll('button,summary')].filter(visible), text = [...panel.querySelectorAll('p,b,strong,small,h2,h3,h4,summary,[role=tab]')].filter(visible);
    const targets = controls.map(el => { const b = el.getBoundingClientRect(); return { label: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 60), width: b.width, height: b.height }; });
    const small = text.map(el => ({ text: el.textContent.trim().slice(0, 60), font: parseFloat(getComputedStyle(el).fontSize) })).filter(x => x.text && x.font < 12);
    const body = panel.querySelector('#vg-panel-body'), b = panel.getBoundingClientRect();
    return { overflow: body.scrollWidth - body.clientWidth, targets: targets.filter(t => t.width < 43.5 || t.height < 43.5), small, panel: { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }, viewport: { width: innerWidth, height: innerHeight } };
  });
  return [actual.overflow <= 1 && !actual.targets.length && !actual.small.length && actual.panel.x >= -1 && actual.panel.y >= -1 && actual.panel.right <= actual.viewport.width + 1 && actual.panel.bottom <= actual.viewport.height + 1, actual];
}
async function routeChecks(page, check) {
  await page.evaluate(() => { while (PumpkinVoxel.village.status.panel) PumpkinVoxel.village.back(); PumpkinVoxel.village.showPanel('journal'); });
  const row = page.locator('details[data-vg-details-key="objective:rowan-1"]'); await row.locator(':scope > summary').click(); await row.locator('[data-vg-track="rowan-1"]').click();
  check('Following a legacy story keeps the HUD and journal on its canonical objective', await page.evaluate(() => PumpkinVoxel.village.status.trackedQuest === 'rowan-1' && document.querySelector('#vg-quest-title').textContent === 'Loose Boards' && document.querySelector('.vf-story-hero').dataset.questCard === 'rowan-1'));
  await page.locator('.vf-show-way').click();
  check('The main route action closes the journal and restores walking input', await page.evaluate(() => !PumpkinVoxel.village.blocked && !PumpkinVoxel.village.status.panel && PumpkinVoxel.village.status.waypoint?.objectiveId === 'rowan-1'));
  await page.evaluate(() => { window.__fidelityWalk = PumpkinVoxel.village.status.position; }); await page.keyboard.down('d'); await page.evaluate(() => { for (let i = 0; i < 8; i++) PumpkinVoxel.village.tick(.1); }); await page.keyboard.up('d');
  check('A real keyboard movement remains effective after routing and journal dismissal', await page.evaluate(() => { const p = PumpkinVoxel.village.status.position, b = window.__fidelityWalk; return !PumpkinVoxel.village.blocked && Math.hypot(p.x - b.x, p.z - b.z) > .2; }));
  await page.evaluate(() => PumpkinVoxel.village.showPanel('map'));
  check('The actual-world map offers the same followed legacy objective', await page.locator('[data-vg-objective-guide="rowan-1"]').count() > 0);
  await page.locator('[data-vg-objective-guide="rowan-1"]').first().click();
  check('Map routing releases its menu without replacing followed ownership', await page.evaluate(() => !PumpkinVoxel.village.blocked && PumpkinVoxel.village.status.waypoint?.objectiveId === 'rowan-1'));
  await page.evaluate(() => PumpkinVoxel.village.requestReturn('header')); await page.locator('.village-return-cancel').click();
  check('Cancelling farm travel keeps the village playable', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
}
async function controllerChecks(page, check, frames) {
  await page.evaluate(() => { window.__fidelityPad = { id: 'DualSense Wireless Controller QA', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) }; Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__fidelityPad] }); });
  const release = async index => { await page.evaluate(i => { window.__fidelityPad.buttons[i] = { pressed: false, value: 0 }; }, index); await frames(); };
  const press = index => page.evaluate(i => { window.__fidelityPad.buttons[i] = { pressed: true, value: 1 }; }, index);
  await release(9); await press(9); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === null); await release(9);
  await press(9); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'navigation'); await release(9);
  const before = await page.evaluate(() => document.activeElement?.dataset.vgPage); await press(13); await page.waitForFunction(old => document.activeElement?.dataset.vgPage && document.activeElement.dataset.vgPage !== old, before); await release(13);
  const destination = await page.evaluate(() => document.activeElement.dataset.vgPage); await press(0); await page.waitForFunction(id => PumpkinVoxel.village.status.panel === id, destination); await release(0);
  check('Injected DualSense Options, D-pad and Cross operate real village menus', ['map', 'people', 'journal', 'materials', 'upgrades'].includes(destination), { source: 'Standard Gamepad API injection, not physical Bluetooth', destination });
  await page.evaluate(() => PumpkinVoxel.village.showPanel('journal')); const current = await page.evaluate(() => PumpkinVoxel.village.status.journalTab); await press(5); await page.waitForFunction(old => PumpkinVoxel.village.status.journalTab !== old, current); await release(5);
  check('The actual pad bumper changes the selected journal tab and its sole visible page', await page.evaluate(() => { const id = PumpkinVoxel.village.status.journalTab; return document.querySelector(`[data-vg-journal-tab="${id}"]`).getAttribute('aria-selected') === 'true' && [...document.querySelectorAll('.vf-journal-page')].filter(el => !el.hidden).length === 1; }));
  await press(1); await page.waitForFunction(() => PumpkinVoxel.village.status.panel !== 'journal'); await release(1);
  await page.evaluate(() => { while (PumpkinVoxel.village.status.panel) PumpkinVoxel.village.back(); PumpkinVoxel.village.requestReturn('header'); }); await press(1); await page.waitForFunction(() => !PumpkinVoxel.village.status.returnPrompt); await release(1);
  check('Circle cancels the farm return prompt without leaving or locking the village', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
  await page.evaluate(() => PumpkinVoxel.village.requestReturn('header')); await press(0); await page.waitForFunction(() => !PumpkinVoxel.village.active); await release(0);
  check('Cross confirms the farm return and restores the farm', await page.evaluate(() => !document.body.classList.contains('in-village')));
  await page.evaluate(() => { PumpkinVoxel.openVillage(); PumpkinVoxel.village.showPanel('journal'); });
}

// Inspect the material actually bound to the rendered ground, not a separately
// reconstructed painter or a design-grid guess at its texture coordinates.
async function groundTextureCheck(page) {
  const actual = await page.evaluate(() => {
    const scene = PumpkinVoxel.scene.villageView.scene, qualifies = object => object?.isMesh && !!object.geometry?.index && !!object.material?.userData?.grassDetail && !!object.material?.map?.isDataTexture && !!object.material.map.image?.data;
    // The view names the earth mesh 'ground'; do not confuse it with the
    // separate invisible picking plane whose userData says village-ground.
    const candidates = []; let mesh = [scene.getObjectByName('ground'), scene.getObjectByName('village-ground')].find(qualifies);
    scene.traverse(object => {
      if (!object.isMesh || !(/ground/i.test(object.name) || object.material?.userData?.grassDetail)) return;
      candidates.push({ name: object.name, indexed: !!object.geometry?.index, vertices: object.geometry?.getAttribute('position')?.count ?? 0, grassDetail: !!object.material?.userData?.grassDetail, dataTexture: !!object.material?.map?.isDataTexture, imageData: !!object.material?.map?.image?.data, stairCutouts: object.geometry?.userData?.stairCutouts?.count ?? null });
      if (!mesh && qualifies(object) && object.geometry.userData.stairCutouts) mesh = object;
    });
    if (!mesh) return { pass: false, reason: 'No indexed rendered ground with grass-detail DataTexture', candidates };
    const material = mesh.material, map = material.map, image = map.image;
    const geometry = mesh.geometry, positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), indices = geometry.index.array, samples = [];
    mesh.updateWorldMatrix(true, false);
    for (const [id, worldX, logicalZ, lawn] of [['west-lawn', 78, -9, true], ['east-lawn', 96, -8.25, true], ['arrival-road', 87, -9, false], ['forage-path', 78, -16.5, false]]) {
      const point = mesh.worldToLocal(mesh.position.clone().set(worldX, 100, -logicalZ)); let found = null;
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i], b = indices[i + 1], c = indices[i + 2], ax = positions.getX(a), az = positions.getZ(a), bx = positions.getX(b), bz = positions.getZ(b), cx = positions.getX(c), cz = positions.getZ(c), denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
        if (Math.abs(denominator) < 1e-10) continue;
        const wa = ((bz - cz) * (point.x - cx) + (cx - bx) * (point.z - cz)) / denominator, wb = ((cz - az) * (point.x - cx) + (ax - cx) * (point.z - cz)) / denominator, wc = 1 - wa - wb;
        if (Math.min(wa, wb, wc) < -1e-7 || Math.max(wa, wb, wc) > 1.0000001) continue;
        const u = uv.getX(a) * wa + uv.getX(b) * wb + uv.getX(c) * wc, v = uv.getY(a) * wa + uv.getY(b) * wb + uv.getY(c) * wc, mapped = map.transformUv(map.offset.clone().set(u, v));
        const x = Math.max(0, Math.min(image.width - 1, Math.floor(mapped.x * image.width))), y = Math.max(0, Math.min(image.height - 1, Math.floor(mapped.y * image.height))), at = (y * image.width + x) * 4, rgba = Array.from(image.data.slice(at, at + 4));
        found = { id, world: [worldX, logicalZ], local: [point.x, point.z], triangle: [a, b, c], barycentric: [wa, wb, wc], uv: [u, v], transformedUv: [mapped.x, mapped.y], pixel: [x, y], rgba, lawn, pass: lawn ? rgba[1] > rgba[0] && rgba[3] > 128 : rgba[3] === 0 }; break;
      }
      samples.push(found ?? { id, world: [worldX, logicalZ], pass: false, reason: 'No rendered XZ triangle' });
    }
    return { pass: samples.every(s => s.pass), selectedMesh: mesh.name, candidates, texture: { width: image.width, height: image.height, channels: image.data.length / image.width / image.height, flipY: map.flipY, grassDetail: material.userData.grassDetail }, samples };
  });
  return [actual.pass, actual];
}
async function openRowan(page, frames) {
  await page.evaluate(() => {
    const p = PumpkinVoxel;
    if (document.querySelector('#village-dialogue:not([hidden])')) p.village.back();
    while (p.village.status.panel) p.village.back();
    const at = p.scene.villageView.folk.talkSpot('rowan'); p.state().village.clock = 1800; p.village.place(at.x, at.z); p.village.meet('rowan');
  });
  await page.waitForSelector('#village-dialogue:not([hidden]) .village-reply'); await frames();
  await page.evaluate(() => { window.__fidelityGreetingChoices = [...document.querySelectorAll('#village-dialogue .village-reply')].map(el => ({ id: el.dataset.villageChoiceId, disabled: el.disabled, label: el.querySelector('.village-reply-label')?.textContent.trim() })); });
}
// A standard-pad pulse changes the real input owner and real menu focus. It
// does not call setInput, paint a glyph, or activate a story transaction.
async function dialoguePadInput(page, frames) {
  await page.evaluate(() => {
    window.__fidelityPad ??= { id: 'DualSense Wireless Controller QA', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
    window.__fidelityPad.buttons[13] = { pressed: false, value: 0 };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__fidelityPad] });
  });
  await frames(); await page.evaluate(() => { window.__fidelityPad.buttons[13] = { pressed: true, value: 1 }; });
  await page.waitForFunction(() => document.querySelector('#village-dialogue')?.dataset.input === 'dualsense');
  await frames(); await page.evaluate(() => { window.__fidelityPad.buttons[13] = { pressed: false, value: 0 }; }); await frames();
}
async function dialogueChoiceCheck(page) {
  const actual = await page.evaluate(() => {
    const panel = document.querySelector('#village-dialogue'), choices = [...panel.querySelectorAll('.village-reply')], semantic = choices.map(el => ({ id: el.dataset.villageChoiceId, disabled: el.disabled, label: el.querySelector('.village-reply-label')?.textContent.trim() }));
    const previous = window.__fidelityGreetingChoices;
    return { name: panel.querySelector('h2')?.textContent.trim(), intent: panel.dataset.dialogueIntent, input: panel.dataset.input, unchanged: JSON.stringify(semantic) === JSON.stringify(previous), semantic, primaryStories: semantic.filter(c => /^(quest|expansion):/.test(c.id ?? '')).length, otherStories: semantic.filter(c => /Other stories/.test(c.label ?? '')).length, bound: choices.every(el => typeof el.onclick === 'function') };
  });
  return [actual.name === 'Rowan Rattlewood' && actual.unchanged && actual.bound && actual.primaryStories === 1 && actual.otherStories === 1, actual];
}
async function conversationLayoutCheck(page) {
  const actual = await page.locator('#village-dialogue').evaluate(panel => {
    const root = panel.getBoundingClientRect(), scale = root.width / (panel.offsetWidth || root.width), visible = el => { const b = el.getBoundingClientRect(), style = getComputedStyle(el); return !el.closest('[hidden],.sr,.sr-only,[aria-hidden=true]') && style.visibility !== 'hidden' && style.display !== 'none' && b.width > 0 && b.height > 0; };
    const box = el => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
    const surfaces = ['.village-dialogue-speech', '.village-dialogue-response', '.village-dialogue-back'].map(selector => ({ selector, el: panel.querySelector(selector) })).filter(({ el }) => el && visible(el)).map(({ selector, el }) => ({ selector, ...box(el) }));
    const controls = [...panel.querySelectorAll('button')].filter(visible).map(el => ({ label: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 60), ...box(el) }));
    const small = [...panel.querySelectorAll('p,small,h2,h3,.village-reply-label,.village-reply-tone,.village-reply-note,.village-dialogue-role,.village-dialogue-page,.village-dialogue-bond span,.village-response-section-title,.village-dialogue-back>span,.village-dialogue-next-label')].filter(visible).map(el => ({ text: el.textContent.trim().slice(0, 70), cssFont: parseFloat(getComputedStyle(el).fontSize), physicalFont: parseFloat(getComputedStyle(el).fontSize) * scale })).filter(item => item.text && item.physicalFont < 11.8);
    const overflow = ['.village-dialogue-body', '.village-dialogue-replies'].map(selector => { const el = panel.querySelector(selector); return { selector, amount: el ? el.scrollWidth - el.clientWidth : 0 }; });
    const clipped = surfaces.filter(b => b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1), tinyTargets = controls.filter(b => b.width < 43.5 || b.height < 43.5);
    const speech = surfaces.find(b => b.selector === '.village-dialogue-speech'), replies = surfaces.find(b => b.selector === '.village-dialogue-response');
    const overlap = speech && replies ? Math.max(0, Math.min(speech.right, replies.right) - Math.max(speech.left, replies.left)) * Math.max(0, Math.min(speech.bottom, replies.bottom) - Math.max(speech.top, replies.top)) : 0;
    return { pass: !clipped.length && !tinyTargets.length && !small.length && overflow.every(x => x.amount <= 1) && overlap <= 1, viewport: [innerWidth, innerHeight], scale, surfaces, clipped, tinyTargets, small, overflow, overlap };
  });
  return [actual.pass, actual];
}
async function dialogueContrastCheck(page) {
  const actual = await page.evaluate(() => {
    const el = document.querySelector('#village-dialogue .village-reply[data-pad-focus],#village-dialogue .village-reply:focus'); if (!el) return { pass: false, reason: 'No focused reply' };
    const style = getComputedStyle(el), rgb = value => [...value.matchAll(/rgba?\(([^)]+)\)/g)].map(m => m[1].split(/[, /]+/).filter(Boolean).map(Number));
    const luminance = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const colours = rgb(style.backgroundImage), note = el.querySelector('.village-reply-note,.village-reply-tone'), inks = [rgb(style.color)[0], ...(note ? rgb(getComputedStyle(note).color) : [])].filter(Boolean);
    const ratios = colours.flatMap(c => inks.map(ink => { const a = luminance(c), b = luminance(ink); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
    return { pass: colours.length >= 2 && colours.every(c => (c[3] ?? 1) >= .96) && ratios.length > 0 && ratios.every(r => r >= 4.5), minimumContrast: Math.min(...ratios), backgroundImage: style.backgroundImage, backgroundColour: style.backgroundColor, ink: style.color, choice: el.dataset.villageChoiceId };
  });
  return [actual.pass, actual];
}
async function conversationScreens(page, check, frames, shot) {
  await page.setViewportSize({ width: 1280, height: 720 }); await openRowan(page, frames); await dialoguePadInput(page, frames);
  for (const [name, width, height] of [['desktop', 1280, 720], ['phone', 390, 844], ['landscape', 844, 390], ['fold', 720, 900]]) {
    await page.setViewportSize({ width, height });
    if (name !== 'desktop') { await page.dispatchEvent('#village-dialogue .village-dialogue-person', 'pointerdown', { pointerType: 'touch', button: 0 }); await frames(); }
    await shot(`conversation-${name}.png`, { preserveInput: true });
    check(`${width}×${height} conversation keeps text, controls and panels readable`, ...(await conversationLayoutCheck(page)));
    check(`${width}×${height} conversation retains the canonical reply order and availability`, ...(await dialogueChoiceCheck(page)));
    if (name === 'desktop') check('Desktop selected reply preserves opaque gold and readable contrast', ...(await dialogueContrastCheck(page)));
  }
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#village-dialogue:not([hidden])') && !PumpkinVoxel.village.blocked);
  check('Closing a conversation releases actual village control', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
}
