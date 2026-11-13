// Exact offline village UI acceptance. Native screenshots and the optional
// held-draw UI pass are labelled separately; input always uses game RAF.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { MATERIALS } from '../src/content/village.js';
import { OUTSIDE_VIEW } from '../src/village-camera.js';

const args = process.argv.slice(2);
if (!args[0] || !args[1]) throw Error('Usage: node tools/village-ui-couture-qa.mjs HTML OUT [--no-map] [--quick] [--hold-draws | --hero-only]');
const file = path.resolve(args[0]), out = path.resolve(args[1]), quick = args.includes('--quick'), holdDraws = args.includes('--hold-draws'), heroOnly = args.includes('--hero-only');
if (holdDraws && heroOnly) throw Error('--hero-only requires native rendering; do not combine it with --hold-draws');
const hash = value => createHash('sha256').update(value).digest('hex');
const html = await fs.readFile(file), s = M.freshState();
Object.assign(s, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); s.shop.arrivalTimer = 1e9;
s.progression.claimed = M.LEVELS.map(x => x.level); s.progression.pending = []; s.progression.homeLegacyThrough = 20;
M.inviteToVillage(s); M.finishTour(s); s.village.clock = 1800;
s.village.quests.invitation = { step: 3, done: true }; s.village.quests['two-doorbells'] = { step: 3, done: true };
s.village.quests['rowan-stall'] = { step: 3, done: true };
s.village.built['elowen-library'] = s.village.built['rowan-workshop'] = true;
s.village.unlocks = [...new Set([...s.village.unlocks, 'gathering', 'stall'])];
s.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
for (const who of ['elowen', 'rowan', 'mabel', 'tansy', 'opal', 'cinder', 'corvus', 'baron', 'granny']) s.village.friends[who] = { met: true, xp: 1080, chatIn: 0, gifts: [], seen: [] };
for (const item of MATERIALS) s.village.materials[item.id] = Math.min(30, M.villageMaterialCapacity(s));
s.village.decor.owned['moth-lamp'] = 2; s.village.decor.owned['stool'] = 1;
s.village.effects.push('upgrade:gathering-kit');
M.startQuest(s, 'rowan-1'); M.actVillageExpansion(s, 'track', { chapter: 'green-research' });
const fixture = M.saveData(s), prefs = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', voxelCharacters: false, glow: true, shadows: true, villageTrackedQuest: 'green-research' };
const stockItem = M.stallStock(s).find(item => item.kind === 'village' && item.left > 0);
const views = quick ? [['desktop', 1280, 800], ['phone', 390, 844]] : [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390], ['fold', 720, 900]];
const report = {
  date: new Date().toISOString(), html: file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)),
  stateVersion: s.version, preferences: prefs, quick, heroOnly, holdDrawsRequested: holdDraws, drawHeld: false, mapIncluded: !heroOnly && !args.includes('--no-map'),
  scope: 'Exact unchanged offline HTML over loopback; declared level20 supplied-inventory fixture, not earned progression. ' + (holdDraws ? 'UI-only coverage: first native village frame and HUD capture precede explicit renderer/composer draw holding. All subsequent held screenshots are prefixed ui-only; camera/world pixels during these checks are not normal-render proof. Input, simulation and DOM still use native game RAF; no manual game ticks or UI replacement. Map capture, if requested, temporarily restores native draws and is labelled separately. ' : 'Actual DOM clicks and keyboard use native game RAF with actual WebGL throughout; no held draws, patched renderer, manual game ticks or UI replacement. ' + (heroOnly ? 'Limited native hero pass: desktop journal, real nearby Rowan dialogue and portrait journal only; full UI parity belongs to the separate broad report. ' : 'Injected standard Gamepad API exercises the actual controller path. ')) + 'Explicit WebGL fallback isolates the HTML/CSS change from GPU compilation. Viewports and software rendering do not certify physical Bluetooth, Fold or TV performance.',
  fixtureNotes: ['Completed introduction/tour and staged restoration entries including Rowan’s stall', 'Both original mainline and expansion stories available', '30 of each material, 2 moth lamps and 1 stool supplied for catalogue states; gathering kit owned', ...(heroOnly ? [] : ['One actual one-tap stall purchase is verified against its canonical quoted price', 'Read-only resizing, navigation and Other stories must not grant rewards or consume resources'])],
  checks: [], screenshots: [], captures: [], errors: [], consoleErrors: [], externalRequests: [], failedRequests: [], observations: [],
};
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ save: fixture, preferences: prefs }, null, 2));
const check = (label, pass, detail) => { report.checks.push({ label, pass: !!pass, ...(detail === undefined ? {} : { detail }) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass && detail) console.log(JSON.stringify(detail)); };
const server = createServer((req, res) => { if (req.url === '/favicon.ico') return res.writeHead(204).end(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page, activity, drawsHeld = false;
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const startedAt = Date.now();
async function stage(name) {
  const entry = { stage: name, elapsedMs: Date.now() - startedAt, at: new Date().toISOString() };
  report.observations.push(entry); console.log(`STAGE ${name} (${Math.round(entry.elapsedMs / 1000)}s)`);
  await fs.writeFile(path.join(out, 'progress.json'), JSON.stringify({ ...entry, htmlSha256: report.htmlSha256, completedChecks: report.checks.length, screenshots: report.screenshots, errors: report.errors }, null, 2));
}
// One bad viewport must not hide the other independent acceptance observations.
const section = async (name, fn) => { await stage(name); try { await fn(); } catch (error) { report.errors.push({ section: name, message: error.stack ?? String(error) }); console.error(`ERROR ${name}: ${error.message}`); } await stage(`${name} finished`); };
async function shot(name) {
  await frames(); await page.evaluate(() => document.fonts.ready);
  const filename = `${drawsHeld ? 'ui-only-' : ''}${name}.png`;
  await page.screenshot({ path: path.join(out, filename), timeout: 180000 }); report.screenshots.push(filename);
  report.captures.push({ file: filename, drawHeld: drawsHeld, scope: drawsHeld ? 'HTML/CSS and input only; world draws held' : 'Native actual WebGL with game RAF' }); console.log(`SHOT ${filename}`);
}
async function hold() {
  if (!holdDraws || drawsHeld) return;
  await page.evaluate(() => {
    const d = PumpkinVoxel.scene.debug;
    window.__coutureDraw ??= { renderer: d.renderer.render, composer: d.composer.render };
    d.renderer.render = () => {}; d.composer.render = () => {};
  }); drawsHeld = true; report.drawHeld = true; await stage('holding world draws for explicitly UI-only checks');
}
async function resume() {
  if (!drawsHeld) return;
  await page.evaluate(() => { const d = PumpkinVoxel.scene.debug; d.renderer.render = __coutureDraw.renderer; d.composer.render = __coutureDraw.composer; });
  drawsHeld = false; await stage('restored native world draws'); await frames();
}
async function closeSurfaces() {
  for (let i = 0; i < 12; i++) {
    const busy = await page.evaluate(() => { const p = PumpkinVoxel.village; return p.status.panel || p.status.returnPrompt || p.decorating || !!document.querySelector('#village-dialogue:not([hidden])'); });
    if (!busy) break;
    await page.keyboard.press('Escape'); await frames();
  }
  await page.waitForFunction(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked);
}
async function panel(kind) {
  await closeSurfaces();
  await page.locator(`.vg-dock [data-vg-page="${kind}"]`).click();
  await page.waitForFunction(id => PumpkinVoxel.village.status.panel === id, kind); await frames();
}
async function readResources() {
  return page.evaluate(() => { const s = PumpkinVoxel.state(), v = s.village, e = v.expansion; return JSON.stringify({ coins: s.coins, earned: s.earned, stock: s.stock, pantry: s.kitchen.pantry, food: s.kitchen.food, recipes: s.kitchen.recipes, houseOwned: s.house.owned, copies: s.house.copies, outfits: s.wardrobe.owned, claimed: s.progression.claimed, materials: v.materials, quests: v.quests, claims: v.claims, unlocks: v.unlocks, effects: v.effects, built: v.built, decor: v.decor, chapters: e.chapters, gems: e.gems, questItems: e.questItems, receipts: e.receipts }); });
}
async function layout(selector = '#vg-panel') {
  return page.locator(selector).evaluate(root => {
    const rect = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
    const visible = el => {
      if (!el || el.closest('[hidden],[inert],.sr,.sr-only,[aria-hidden=true]')) return false;
      const style = getComputedStyle(el), b = el.getBoundingClientRect();
      if (style.visibility === 'hidden' || style.display === 'none' || b.width <= 0 || b.height <= 0) return false;
      let left = Math.max(0, b.left), top = Math.max(0, b.top), right = Math.min(innerWidth, b.right), bottom = Math.min(innerHeight, b.bottom);
      // Elements below the fold and artwork inside aria-hidden wrappers are
      // not visible targets. A scroll container retains its own full bounds.
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p), clip = p.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
        if (/(auto|scroll|hidden|clip)/.test(s.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
      }
      return right - left > .1 && bottom - top > .1;
    };
    const zoom = el => { if (Number.isFinite(el.currentCSSZoom)) return el.currentCSSZoom; let z = 1; for (let p = el; p; p = p.parentElement) z *= parseFloat(getComputedStyle(p).zoom) || 1; return z; };
    const controls = [...root.querySelectorAll('button,summary,select,input:not([type=hidden])')].filter(visible).map(el => ({ label: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 70), ...rect(el) }));
    const tiny = controls.filter(el => el.width < 43.9 || el.height < 43.9);
    const small = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement, text = node.textContent.trim();
      if (!text || !visible(el) || el.closest('svg,style,script')) continue;
      const physical = parseFloat(getComputedStyle(el).fontSize) * zoom(el);
      if (physical < 11.99) small.push({ text: text.slice(0, 70), font: physical });
    }
    const scrollSurfaces = [...root.querySelectorAll('#vg-panel-body,.village-dialogue-body,.village-dialogue-replies,.vd-list')].filter(visible);
    const overflow = scrollSurfaces.map(el => ({ class: el.id || el.className, x: el.scrollWidth - el.clientWidth }));
    const box = rect(root), outside = box.x < -.5 || box.y < -.5 || box.right > innerWidth + .5 || box.bottom > innerHeight + .5;
    const details = { box, viewport: [innerWidth, innerHeight], scale: zoom(root), tiny, small: small.slice(0, 32), overflow, documentOverflow: document.documentElement.scrollWidth - innerWidth };
    return { pass: !outside && !tiny.length && !small.length && overflow.every(item => item.x <= 1) && details.documentOverflow <= 1, ...details };
  });
}
async function checkLayout(label, selector) { const result = await layout(selector); check(label, result.pass, result); }
async function openNeighbour(who = 'rowan') {
  await closeSurfaces();
  // Staging only: actual Talk/People interaction below still resolves the live
  // neighbour and the shipped proximity gate, never a synthetic conversation.
  await page.evaluate(who => { const p = PumpkinVoxel, at = p.scene.villageView.folk.talkSpot(who); p.village.place(at.x, at.z); }, who);
  await page.locator('.vg-dock [data-vg-page="people"]').click();
  await page.locator(`#vg-panel [data-vg-meet="${who}"]`).click();
  await page.waitForSelector('#village-dialogue:not([hidden]) .village-reply'); await frames();
}
const openRowan = () => openNeighbour('rowan');
async function installPad() {
  await page.evaluate(() => {
    window.__couturePad = { id: 'DualSense Wireless Controller QA', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__couturePad] });
  }); await frames();
}
async function release(index) { await page.evaluate(i => { window.__couturePad.buttons[i] = { pressed: false, value: 0 }; }, index); await frames(); }
async function press(index, expectation, arg) {
  await release(index); await page.evaluate(i => { window.__couturePad.buttons[i] = { pressed: true, value: 1 }; }, index);
  try { if (expectation) await page.waitForFunction(expectation, arg); else await frames(); } finally { await release(index); }
}
async function disconnectPad() { await page.evaluate(() => { if (window.__couturePad) window.__couturePad.connected = false; window.dispatchEvent(new Event('gamepaddisconnected')); }); await frames(); }

try {
  if (process.env.COUTURE_EXPECTED_SHA && report.htmlSha256 !== process.env.COUTURE_EXPECTED_SHA) throw Error('HTML hash mismatch');
  await stage('launching Chromium');
  const launchArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: launchArgs }); report.browserVersion = browser.version(); report.launchArgs = launchArgs;
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true }); page.setDefaultTimeout(180000);
  page.on('pageerror', error => report.errors.push({ section: 'page', message: error.stack ?? error.message }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 2000)); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) report.externalRequests.push(request.url()); });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url().slice(0, 200), reason: request.failure()?.errorText }));
  activity = setInterval(() => page.keyboard.press('Shift').catch(() => {}), 30000);
  await page.addInitScript(({ save, prefs }) => {
    localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(prefs));
    const NativeDate = Date, wall = new NativeDate('2026-11-13T21:00:00Z').getTime(); window.Date = class extends NativeDate { constructor(...values) { super(...(values.length ? values : [wall])); } static now() { return wall; } };
    let seed = 20261113; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }, { save: fixture, prefs });
  await stage('loading offline HTML');
  await page.goto(`${origin}/game.html?villageRenderer=webgl`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await stage('DOM loaded; waiting for game ready'); await page.waitForSelector('body[data-ready]');
  await stage('game ready; building the actual village');
  await page.evaluate(pose => { const p = PumpkinVoxel; p.scene.player.setEnabled(true, 'natalie'); p.openVillage(); p.village.place(87, -16.5, { x: 0, z: -1 }); p.scene.villageView.play.reset(p.scene.villageView.play.state.subject, pose); }, { yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance });
  await stage('village constructed; waiting for native frames');
  await page.waitForFunction(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked); await frames();
  await stage('village native frames ready');
  report.renderer = await page.evaluate(() => PumpkinVoxel.scene.villageRendererStatus);
  check('The tested HTML retains its actual explicit WebGL village fallback', report.renderer.backend === 'webgl' && report.renderer.requested === 'webgl', report.renderer);
  const originalResources = await readResources();

  if (heroOnly) await section('native hero surfaces', async () => {
    await panel('journal'); await checkLayout('Native desktop journal retains readable controls'); await shot('native-desktop-journal');
    await openRowan(); await checkLayout('Native nearby Rowan dialogue remains readable', '#village-dialogue'); await shot('native-desktop-dialogue');
    check('Native dialogue is Rowan’s real greeting with canonical activity choices', await page.evaluate(() => document.querySelector('#village-dialogue h2')?.textContent.includes('Rowan') && !!document.querySelector('#village-dialogue [data-village-choice-id="stories"]') && !!document.querySelector('#village-dialogue [data-village-choice-id="farm-gifts"]')));
    await closeSurfaces(); await page.setViewportSize({ width: 390, height: 844 }); await panel('journal');
    await checkLayout('Native portrait journal retains readable controls'); await shot('native-portrait-journal');
    check('Native hero pass never replaces the renderer or composer draw functions', !report.drawHeld && !await page.evaluate(() => !!window.__coutureDraw));
  });

  if (!heroOnly) {
  await section('navigation', async () => {
    const nav = await page.locator('.vg-dock button').evaluateAll(items => items.map(el => ({ page: el.dataset.vgPage || (el.id === 'vg-decorate' ? 'decorate' : null), label: el.getAttribute('aria-label'), art: !!el.querySelector('.vf-art') })));
    check('All six illustrated village destinations remain reachable', nav.length === 6 && nav.map(x => x.page).join() === 'map,people,journal,materials,upgrades,decorate' && nav.every(x => x.art && x.label), nav);
    await shot('01-village-hud');
    await hold();
    for (const kind of ['journal', 'people', 'materials', 'upgrades']) {
      await panel(kind); check(`${kind} opens through its actual dock button`, await page.evaluate(id => PumpkinVoxel.village.status.panel === id && document.querySelector(`.vg-dock [data-vg-page="${id}"]`).getAttribute('aria-current') === 'page', kind));
      await checkLayout(`Desktop ${kind} has readable targets and a contained drawer`); await shot(`desktop-${kind}`);
      await page.keyboard.press('Escape'); await frames();
      check(`${kind} Escape restores focus to the visible dock opener`, await page.evaluate(id => !PumpkinVoxel.village.status.panel && document.activeElement === document.querySelector(`.vg-dock [data-vg-page="${id}"]`), kind));
    }
    await page.locator('#vg-decorate').click(); await page.waitForFunction(() => PumpkinVoxel.village.decorating); await frames();
    check('Build retains owned collections, category choices, stall access and undo', await page.evaluate(() => !!document.querySelector('[data-vd-collection="stored"]') && !!document.querySelector('[data-vd-collection="placed"]') && document.querySelectorAll('[data-vd-category]').length >= 5 && !!document.querySelector('[data-vd-action="shop"]') && !!document.querySelector('[data-vd-action="undo"]')));
    await checkLayout('Desktop Build catalogue has readable controls', '#village-decorate .vd-catalogue'); await shot('desktop-build');
    await page.locator('.vd-catalogue [data-vd-action="shop"]').click(); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'stall');
    await checkLayout('The actual stall retains readable prices and product cards'); await shot('desktop-stall');
    const offered = await page.locator('[data-vg-buy]').evaluateAll(items => items.map(el => el.dataset.vgBuy));
    check('Every canonical stall item still has its purchase control', M.stallStock(s).every(item => offered.includes(item.key)), offered);
    await closeSurfaces();
  });

  await section('short desktop journal', async () => {
    await page.setViewportSize({ width: 960, height: 540 }); await panel('journal');
    const visible = await page.evaluate(() => {
      const body = document.querySelector('#vg-panel-body'), hero = body.querySelector('.vf-story-hero'), title = hero?.querySelector('h3'), action = hero?.querySelector('.vf-show-way');
      const rect = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const bodyBox = rect(body), titleBox = rect(title), actionBox = rect(action);
      const fullyVisible = b => !!b && b.width > 0 && b.height > 0 && b.left >= Math.max(0, bodyBox.left) - .5 && b.right <= Math.min(innerWidth, bodyBox.right) + .5 && b.top >= Math.max(0, bodyBox.top) - .5 && b.bottom <= Math.min(innerHeight, bodyBox.bottom) + .5;
      return { scrollTop: body.scrollTop, body: bodyBox, title: titleBox, action: actionBox, titleText: title?.textContent.trim(), actionText: action?.textContent.trim(), titleVisible: fullyVisible(titleBox), actionVisible: fullyVisible(actionBox), targetValid: !!actionBox && actionBox.width >= 43.9 && actionBox.height >= 43.9 };
    });
    check('960×540 opens the tracked title and primary Show the way fully above the fold', visible.scrollTop <= 1 && visible.titleVisible && visible.actionVisible && visible.targetValid, visible);
    await checkLayout('960×540 journal retains visible 44px controls and 12px text'); await shot('short-desktop-journal');
    await closeSurfaces(); await page.setViewportSize({ width: 1280, height: 800 });
  });

  await section('journal and read-only parity', async () => {
    await panel('journal');
    const tabs = await page.locator('[data-vg-journal-tab]').evaluateAll(items => items.map(el => ({ id: el.dataset.vgJournalTab, selected: el.getAttribute('aria-selected'), control: el.getAttribute('aria-controls') })));
    check('Journal retains Active, Discover and Completed tabs', tabs.map(x => x.id).join() === 'active,discover,completed' && tabs.filter(x => x.selected === 'true').length === 1, tabs);
    for (const id of ['discover', 'completed', 'active']) {
      await page.locator(`[data-vg-journal-tab="${id}"]`).click();
      check(`${id} tab selects exactly its own page`, await page.evaluate(id => PumpkinVoxel.village.status.journalTab === id && [...document.querySelectorAll('.vf-journal-page')].filter(el => !el.hidden).length === 1 && document.querySelector(`#vf-page-${id}`)?.hidden === false, id));
    }
    const summary = page.locator('.vf-story-hero details > summary').first();
    await summary.click(); await frames();
    check('The followed story exposes its original rewards and details on demand', await summary.evaluate(el => el.parentElement.open));
    await panel('materials'); await page.locator('#vg-panel [data-vg-page="upgrades"]').first().click(); await frames();
    check('Satchel links to Workshop with a real back trail', await page.evaluate(() => PumpkinVoxel.village.status.panel === 'upgrades' && PumpkinVoxel.village.status.panelParent === 'materials'));
    await page.locator('#vg-panel-back').click(); await frames();
    check('Back returns to the same Satchel page', await page.evaluate(() => PumpkinVoxel.village.status.panel === 'materials'));
    await closeSurfaces(); check('Opening and reading menus does not spend or grant resources', originalResources === await readResources());
  });

  await section('one-tap purchase', async () => {
    await page.locator('#vg-decorate').click(); await page.locator('.vd-catalogue [data-vd-action="shop"]').click();
    const before = await page.evaluate(key => ({ coins: PumpkinVoxel.state().coins, bought: PumpkinVoxel.state().village.stall.bought[key] ?? 0 }), stockItem.key);
    await page.locator(`[data-vg-buy="${stockItem.key}"]`).click();
    const after = await page.evaluate(key => ({ coins: PumpkinVoxel.state().coins, bought: PumpkinVoxel.state().village.stall.bought[key] ?? 0 }), stockItem.key);
    check('One actual tap buys exactly one item at its canonical price', before.coins - after.coins === stockItem.price && after.bought - before.bought === 1, { item: stockItem.key, price: stockItem.price, before, after });
    await closeSurfaces();
  });

  await section('responsive drawers', async () => {
    for (const [name, width, height] of views.slice(1)) {
      await page.setViewportSize({ width, height });
      for (const kind of ['journal', 'people', 'materials', 'upgrades']) {
        await panel(kind); await checkLayout(`${width}×${height} ${kind} retains readable controls without horizontal overflow`);
        if (kind === 'journal' || name === 'phone' && kind === 'materials') await shot(`${name}-${kind}`);
      }
      await closeSurfaces(); await page.locator('#vg-decorate').click(); await frames();
      await checkLayout(`${width}×${height} Build catalogue remains contained`, '#village-decorate .vd-catalogue');
      if (name === 'phone') await shot('phone-build');
      await closeSurfaces();
    }
  });

  await section('dialogue', async () => {
    await page.setViewportSize({ width: 1280, height: 800 }); await openRowan();
    const semantic = await page.locator('#village-dialogue .village-reply').evaluateAll(items => items.map(el => ({ id: el.dataset.villageChoiceId, disabled: el.disabled })));
    check('Nearby People opens Rowan with canonical chat, story and activity choices', semantic.some(x => x.id === 'stories') && semantic.some(x => x.id === 'chat') && semantic.some(x => x.id === 'farm-gifts'), semantic);
    for (const [name, width, height] of views) {
      await page.setViewportSize({ width, height }); await frames();
      await checkLayout(`${width}×${height} dialogue remains readable`, '#village-dialogue');
      const after = await page.locator('#village-dialogue .village-reply').evaluateAll(items => items.map(el => ({ id: el.dataset.villageChoiceId, disabled: el.disabled })));
      check(`${width}×${height} keeps every reply and its availability`, JSON.stringify(semantic) === JSON.stringify(after));
      if (name === 'desktop' || name === 'phone' || name === 'landscape') await shot(`${name}-dialogue`);
    }
    const before = await readResources();
    await page.locator('#village-dialogue [data-village-choice-id="stories"]').click();
    await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'journal' && PumpkinVoxel.village.status.panelId === 'rowan');
    check('Other stories opens Rowan’s real journal without granting or consuming anything', before === await readResources());
    await closeSurfaces();
    await page.setViewportSize({ width: 1280, height: 800 }); await openRowan();
    await page.locator('#village-dialogue [data-village-choice-id="about"]').click();
    await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'resident' && PumpkinVoxel.village.status.panelId === 'rowan');
    check('More about Rowan retains friendship, gifts and his original resident actions', await page.evaluate(() => !!document.querySelector('.vg-resident-summary meter') && !!document.querySelector('[data-vg-chat="rowan"]') && !!document.querySelector('[data-vg-details-key="gifts:rowan"]') && !!document.querySelector('[data-vg-details-key="about:rowan"]')));
    await checkLayout('Resident details remain readable and usable'); await shot('desktop-resident');
    await openRowan(); await page.locator('#village-dialogue [data-village-choice-id="farm-gifts"]').click();
    await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'upgrades');
    check('Rowan’s discovery action opens his actual Workshop improvements', await page.locator('#vg-panel-body').evaluate(el => !!el.querySelector('[data-vg-upgrade="satchel-pockets"]') && el.querySelectorAll('[data-vg-upgrade-card]').length > 0));
    await checkLayout('Rowan’s Workshop destination retains readable upgrade cards'); await shot('desktop-rowan-workshop');
    await openNeighbour('opal');
    check('The actual nearby Opal greeting offers its discovery action', await page.locator('#village-dialogue [data-village-choice-id="farm-gifts"]').count() === 1);
    const discoveryResources = await readResources();
    await page.locator('#village-dialogue [data-village-choice-id="farm-gifts"]').click();
    await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'farm-gifts' && PumpkinVoxel.village.status.panelId === 'opal');
    check('Opal’s discovery page contains her real cold-store blueprint and transaction', await page.locator('#vg-panel-body .vc-discovery-card [data-expansion-economy="cold-store"]').count() === 1);
    check('Reading Opal’s blueprint neither buys the upgrade nor consumes resources', discoveryResources === await readResources());
    await checkLayout('Opal’s actual village discovery shares the readable drawer'); await shot('desktop-opal-discoveries');
    await closeSurfaces();
  });

  if (!args.includes('--no-map')) await section('map', async () => {
    const wasHeld = drawsHeld;
    try {
    await resume();
    await page.setViewportSize({ width: 1280, height: 800 }); await panel('map');
    check('Map retains its actual-world snapshot and selectable requirements markers', await page.evaluate(() => document.querySelector('[data-vg-map-snapshot]')?.src.startsWith('data:image/png;base64,') && document.querySelectorAll('[data-vg-map-district]').length >= 5));
    await page.locator('[data-vg-map-district="quarry"]').first().click(); await frames();
    check('A map marker opens the canonical district requirements', await page.locator('[data-vg-map-detail="quarry"] .vg-map-requirements').count() === 1);
    await checkLayout('Map drawer, marker controls and requirements remain legible'); await shot('desktop-map');
    await closeSurfaces();
    } finally { if (wasHeld) await hold(); }
  });

  await section('TV and controller', async () => {
    await page.evaluate(() => PumpkinVoxel.village.close()); await page.setViewportSize({ width: 1920, height: 1080 }); await page.evaluate(() => PumpkinVoxel.openSheet('settings'));
    if (!await page.evaluate(() => document.body.classList.contains('tv-mode'))) await page.locator('#toggle-tv').click();
    await page.locator('#sheet-close').click(); await page.evaluate(() => PumpkinVoxel.openVillage()); await frames();
    check('TV tests use the actual Settings TV mode', await page.evaluate(() => document.body.classList.contains('tv-mode')));
    for (const kind of ['journal', 'people', 'materials', 'upgrades']) { await panel(kind); await checkLayout(`Real TV mode keeps ${kind} legible at its effective zoom`); if (kind === 'journal' || kind === 'upgrades') await shot(`tv-${kind}`); }
    await closeSurfaces(); await page.locator('.vg-dock [data-vg-page="people"]').focus(); await installPad();
    await press(9, () => PumpkinVoxel.village.status.panel === 'navigation');
    check('DualSense Options opens the real navigation hub', await page.evaluate(() => PumpkinVoxel.village.status.panel === 'navigation'));
    const before = await page.evaluate(() => document.activeElement?.dataset.vgPage);
    await press(13, old => document.activeElement?.dataset.vgPage && document.activeElement.dataset.vgPage !== old, before);
    const destination = await page.evaluate(() => document.activeElement?.dataset.vgPage);
    await press(0, id => PumpkinVoxel.village.status.panel === id, destination);
    check('D-pad chooses and Cross activates the real menu destination', ['map', 'people', 'journal', 'materials', 'upgrades'].includes(destination), { destination });
    await press(1, () => PumpkinVoxel.village.status.panel === 'navigation');
    check('Circle returns through the same panel trail', await page.evaluate(() => PumpkinVoxel.village.status.panel === 'navigation'));
    await press(9, () => PumpkinVoxel.village.status.panel === null);
    check('Options dismisses the hub and restores focus outside hidden content', await page.evaluate(() => !document.activeElement?.closest('[hidden]') && !document.activeElement?.closest('#vg-panel') && !PumpkinVoxel.village.blocked));
    await panel('journal'); const old = await page.evaluate(() => PumpkinVoxel.village.status.journalTab);
    await press(5, old => PumpkinVoxel.village.status.journalTab !== old, old);
    check('R1 moves the real journal tab and leaves one page visible', await page.evaluate(() => [...document.querySelectorAll('.vf-journal-page')].filter(el => !el.hidden).length === 1));
    await press(9, () => PumpkinVoxel.village.status.panel === null); await openRowan();
    await press(13); await shot('tv-dialogue'); await checkLayout('Real TV dialogue preserves readable reply targets', '#village-dialogue');
    await press(1, () => !document.querySelector('#village-dialogue:not([hidden])')); await closeSurfaces();
    await page.locator('#vg-home').click(); await press(1, () => !PumpkinVoxel.village.status.returnPrompt);
    check('Circle cancels travel without leaving the village', await page.evaluate(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked));
    await page.locator('#vg-home').click(); await press(0, () => !PumpkinVoxel.village.active);
    check('Cross confirms travel and returns cleanly to the farm', await page.evaluate(() => !document.body.classList.contains('in-village') && !PumpkinVoxel.village.active));
    await disconnectPad();
  });

  await section('reduced motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (!await page.evaluate(() => PumpkinVoxel.village.active)) await page.evaluate(() => PumpkinVoxel.openVillage());
    await panel('journal');
    const motion = await page.locator('#vg-panel').evaluate(el => ({ reduced: matchMedia('(prefers-reduced-motion:reduce)').matches, animation: getComputedStyle(el).animationName, animationDuration: getComputedStyle(el).animationDuration, transitionDuration: getComputedStyle(el).transitionDuration }));
    check('Reduced-motion mode removes nonessential panel animation', motion.reduced && (motion.animation === 'none' || motion.animationDuration.split(',').every(v => parseFloat(v) <= .001)), motion);
  });
  }
  check('No page, console, failed or external requests occur in the offline build', !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length, { page: report.errors.length, console: report.consoleErrors.length, failed: report.failedRequests.length, external: report.externalRequests.length });
} catch (error) { report.errors.push({ section: 'startup', message: error.stack ?? String(error) }); }
finally {
  clearInterval(activity); await browser?.close(); await new Promise(resolve => server.close(resolve));
  report.passed = report.checks.length > 0 && report.checks.every(item => item.pass) && !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length;
  await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failures: report.checks.filter(item => !item.pass).map(item => item.label), errors: report.errors, htmlSha256: report.htmlSha256, out }, null, 2));
  process.exitCode = report.passed ? 0 : 1;
}
