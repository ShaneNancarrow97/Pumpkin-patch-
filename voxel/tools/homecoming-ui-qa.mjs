// UI-only acceptance on exact game HTML. Native village frames precede holding
// renderer/composer draws; game RAF, rules, keyboard and DOM remain live.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { SECRET_LOOKS } from '../src/content/homecoming.js';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node tools/homecoming-ui-qa.mjs HTML OUT');
const file = path.resolve(input), out = path.resolve(output), hash = v => createHash('sha256').update(v).digest('hex'), html = await fs.readFile(file), s = M.freshState();
Object.assign(s, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); s.shop.arrivalTimer = 1e9;
s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.pending = []; s.progression.homeLegacyThrough = 20;
M.inviteToVillage(s); M.finishTour(s); s.village.clock = 1800; s.village.quests.invitation = { step: 3, done: true }; s.village.quests['two-doorbells'] = { step: 3, done: true };
s.village.built['elowen-library'] = s.village.built['rowan-workshop'] = true; M.startQuest(s, 'rowan-1'); M.actVillageExpansion(s, 'track', { chapter: 'green-research' });
const fixture = M.saveData(s), preferences = { music: false, sound: false, voiceEnabled: false, frameRate: '30', renderQuality: 'sharp', voxelCharacters: false, glow: true, shadows: true, villageTrackedQuest: 'green-research' };
const report = { file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), scope: 'UI-only exact HTML acceptance. Two native village RAFs precede explicit renderer/composer draw holding. World pixels in ui-only screenshots are stale and are not renderer/performance evidence. Input, DOM and simulation use native game RAF. Supplied level20 fixture starts with no hidden keepsakes or mummy outfits. The real Lantern Keepers handover, 24 harvests and completion rule grant the paired outfits; legitimate eligibility counters are then staged and the native model update awards six colours. Real wardrobe buttons test each owner and explicit outfit/colour switching. TV layout is enabled through the actual Settings control. No real progression pacing or physical device certification is claimed.', checks: [], screenshots: [], errors: [], consoleErrors: [], externalRequests: [], failedRequests: [] };
const check = (label, pass, actual) => { report.checks.push({ label, pass: !!pass, actual }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) throw Error(`${label}: ${JSON.stringify(actual)}`); };
await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ fixture, preferences }, null, 2));
const server = createServer((req, res) => { if (req.url === '/favicon.ico') return res.writeHead(204).end(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page, activity;
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const ledger = () => page.evaluate(() => { const s = PumpkinVoxel.state(); return JSON.stringify({ coins: s.coins, earned: s.earned, claims: s.village.claims, looks: s.looks, costumes: s.wardrobe }); });
const shot = async name => { await frames(); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push({ file: name, drawHeld: true }); };
async function layout(selector, surface) {
  const details = await page.evaluate(({ selector, surface }) => {
    const root = document.querySelector(surface), box = root.getBoundingClientRect(), tiny = [], small = [];
    const visible = el => { if (el.closest('[hidden],.sr,.sr-only,[aria-hidden=true]')) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const zoom = el => { if (Number.isFinite(el.currentCSSZoom)) return el.currentCSSZoom; let z = 1; for (let p = el; p; p = p.parentElement) z *= parseFloat(getComputedStyle(p).zoom) || 1; return z; };
    for (const piece of document.querySelectorAll(selector)) {
      for (const button of piece.querySelectorAll('button,summary')) if (visible(button)) { const r = button.getBoundingClientRect(); if (r.width < 43.9 || r.height < 43.9) tiny.push({ text: button.textContent.trim(), width: r.width, height: r.height }); }
      const walker = document.createTreeWalker(piece, NodeFilter.SHOW_TEXT); while (walker.nextNode()) { const n = walker.currentNode, el = n.parentElement; if (n.textContent.trim() && visible(el) && !el.closest('svg')) { const size = parseFloat(getComputedStyle(el).fontSize) * zoom(el); if (size < 11.99) small.push({ text: n.textContent.trim(), size }); } }
    }
    return { box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, viewport: [innerWidth, innerHeight], tiny, small, documentOverflow: document.documentElement.scrollWidth - innerWidth, contentOverflow: root.scrollWidth - root.clientWidth };
  }, { selector, surface });
  return { pass: details.box.left >= -.5 && details.box.top >= -.5 && details.box.right <= details.viewport[0] + .5 && details.box.bottom <= details.viewport[1] + .5 && !details.tiny.length && !details.small.length && details.documentOverflow <= 1 && details.contentOverflow <= 1, ...details };
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); report.browser = browser.version();
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: true }); page.setDefaultTimeout(180000);
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message)); page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 2000)); });
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin + '/')) report.externalRequests.push(r.url()); }); page.on('requestfailed', r => report.failedRequests.push(r.url().slice(0, 200)));
  activity = setInterval(() => page.keyboard.press('Shift').catch(() => {}), 30000);
  await page.addInitScript(({ fixture, preferences }) => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(fixture)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify(preferences)); }, { fixture, preferences });
  await page.goto(`${origin}/game.html?villageRenderer=webgl`, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => { PumpkinVoxel.scene.player.setEnabled(true, 'natalie'); PumpkinVoxel.openVillage(); PumpkinVoxel.village.place(87, -16.5, { x: 0, z: -1 }); }); await page.waitForFunction(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked); await frames();
  report.rendererBeforeHold = await page.evaluate(() => PumpkinVoxel.scene.villageRendererStatus);
  await page.evaluate(() => { const d = PumpkinVoxel.scene.debug; window.__homecomingDraw = { renderer: d.renderer.render, composer: d.composer.render }; d.renderer.render = () => {}; d.composer.render = () => {}; }); report.drawHeld = true;
  await page.locator('.vg-dock [data-vg-page="journal"]').click(); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === 'journal');
  const fold = page.locator('#vg-panel .homecoming-discoveries'), initial = await ledger();
  check('Discoveries start collapsed below the active objective', await fold.evaluate(el => !el.open && !!(document.querySelector('.vg-journal-following')?.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
  check('Locked journal hides all secret colour names and swatches', await fold.evaluate((el, names) => !names.some(name => el.textContent.includes(name)) && !el.querySelector('.homecoming-colours'), SECRET_LOOKS.map(x => x.name)));
  await fold.locator('summary').click();
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390]]) { await page.setViewportSize({ width, height }); await frames(); await fold.locator('summary').scrollIntoViewIfNeeded(); const result = await layout('#vg-panel .homecoming-discoveries', '#vg-panel'); check(`${name}: discovery text, targets and scrolling fit`, result.pass, result); await shot(`ui-only-${name}-locked-discoveries.png`); }
  check('Reading and resizing the ledger changes no ownership or currency', await ledger() === initial);
  // View the new collection while its rewards are still locked, using the farm
  // dock in management mode. No save fields are rewritten by browsing it.
  await page.evaluate(() => { PumpkinVoxel.village.close(); PumpkinVoxel.scene.player.setEnabled(false); }); await frames(); await page.locator('.tab[data-tab="wardrobe"]').click();
  await page.locator('[data-set="village"]').click();
  const lockedWardrobe = await ledger();
  for (const who of ['natalie', 'shane']) {
    await page.locator(`[data-who="${who}"]`).click();
    check(`${who}: village mummy route is clear and not sold as a cash unlock`, await page.locator('.village-wardrobe').evaluate(el => el.textContent.includes('Village rewards') && el.textContent.includes('The Lantern Keepers') && !el.querySelector('[data-costume]') && !el.querySelector('.village-reward-outfit').textContent.includes('Exclusive')));
    check(`${who}: all unearned colour names remain secret`, await page.locator('.village-wardrobe').evaluate((el, names) => !names.some(name => el.textContent.includes(name)) && el.textContent.includes('Three exclusive colour pairs'), SECRET_LOOKS.map(x => x.name)));
  }
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390]]) {
    await page.setViewportSize({ width, height }); await frames(); await page.locator('[data-who="natalie"]').click();
    await page.locator('.village-wardrobe-heading').scrollIntoViewIfNeeded();
    const result = await layout('.village-wardrobe, #sheet .segmented', '#sheet'); check(`${name}: locked Village collection and owner controls fit`, result.pass, result); await shot(`ui-only-${name}-locked-village-wardrobe.png`);
  }
  check('Browsing both locked wardrobes changes no ownership or currency', await ledger() === lockedWardrobe);
  const lantern = await page.evaluate(() => {
    const s = PumpkinVoxel.state(), rules = PumpkinVoxel.rules;
    Object.assign(s.village.materials, { logs: 12, stone: 8, fibre: 6, herbs: 4 });
    const before = { ...s.wardrobe.equipped };
    rules.startQuest(s, 'lantern-keepers');
    const handedOver = !!rules.doHandOver(s, 'rowan', 'lantern-keepers');
    let harvested = 0;
    for (let i = 0; i < 24; i++) { s.plots[0] = { phase: 'ready', variety: 0, progress: 1, ripe: s.time }; if (rules.harvest(s, 0)) harvested++; }
    rules.advanceQuests(s); const events = rules.finishTalk(s, 'lantern-keepers', 'elowen');
    return { handedOver, harvested, done: events.some(e => e.type === 'quest-done' && e.quest === 'lantern-keepers'), owned: ['natalie-mummy', 'shane-mummy'].every(id => s.wardrobe.owned.includes(id)), unchangedOutfits: ['natalie', 'shane'].every(who => s.wardrobe.equipped[who] === before[who]) };
  });
  check('Real Lantern Keepers rules grant both mummy outfits without automatic equipping', lantern.handedOver && lantern.harvested === 24 && lantern.done && lantern.owned && lantern.unchangedOutfits, lantern);
  await page.evaluate(() => { PumpkinVoxel.closeSheet(); PumpkinVoxel.openVillage(); }); await page.waitForFunction(() => PumpkinVoxel.village.active && !PumpkinVoxel.village.blocked); await frames();
  await page.evaluate(() => { const s = PumpkinVoxel.state(), e = s.village.expansion; e.effects = [...new Set([...e.effects, 'herb-beds'])]; e.chapters['restaurant-opening'] = e.chapters['moor-stage'] = true; e.economy.herbsProcessed = 6; e.economy.treatments = 3; e.economy.commissions['cinder-first-supper'] = { done: 3, cooldown: 0 }; s.progression.homeActivities.cook = 3; s.hayride.haunts.owned.push('turning-scarecrows'); s.hayride.completed = 25; });
  await page.waitForFunction(ids => ids.every(id => PumpkinVoxel.state().looks.owned.includes(id)), SECRET_LOOKS.map(x => x.id));
  await page.locator('.vg-dock [data-vg-page="journal"]').click(); await page.waitForSelector('#vg-panel .homecoming-card.is-earned', { state: 'attached' });
  check('Native model awards all three paired keepsakes', await page.locator('#vg-panel .homecoming-card.is-earned').count() === 3);
  check('Earned colours reveal in the shared journal', await fold.evaluate((el, names) => names.every(name => el.textContent.includes(name)), SECRET_LOOKS.map(x => x.name)));
  // The management dock is intentionally hidden in character-control mode.
  // Return to management before testing its real Outfits button.
  await page.evaluate(() => { PumpkinVoxel.village.close(); PumpkinVoxel.scene.player.setEnabled(false); }); await frames(); await page.locator('.tab[data-tab="wardrobe"]').click();
  await page.locator('[data-set="village"]').click();
  const beforeWear = await page.evaluate(() => ({ coins: PumpkinVoxel.state().coins, earned: PumpkinVoxel.state().earned }));
  for (const [who, colour] of [['natalie', 'botanist'], ['shane', 'ghostlight']]) {
    await page.locator(`[data-who="${who}"]`).click();
    await page.locator(`[data-wear="${who}-mummy"]`).click();
    check(`${who}: earned mummy is wearable while all three colour choices remain accessible`, await page.evaluate(who => PumpkinVoxel.state().wardrobe.equipped[who] === who + '-mummy' && document.querySelectorAll('.homecoming-look').length === 3, who));
    const id = `${who}-homecoming-${colour}`;
    await page.locator(`[data-village-look="${who}:${id}"]`).click();
    check(`${who}: one explicit Wear look tap equips the earned colour and original outfit`, await page.evaluate(({ who, id }) => PumpkinVoxel.state().wardrobe.equipped[who] === who + '-base' && PumpkinVoxel.state().looks[who] === id, { who, id }));
  }
  check('Wearing the paired village rewards charges no currency', await page.evaluate(before => PumpkinVoxel.state().coins === before.coins && PumpkinVoxel.state().earned === before.earned, beforeWear));
  await page.locator('[data-who="natalie"]').click();
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390], ['tv', 1920, 1080]]) {
    await page.setViewportSize({ width, height }); await frames();
    if (name === 'tv') { await page.evaluate(() => PumpkinVoxel.openSheet('settings')); await page.locator('#toggle-tv').click(); await page.evaluate(() => PumpkinVoxel.openSheet('wardrobe')); await page.locator('[data-set="village"]').click(); check('TV layout uses the real Settings toggle', await page.locator('body').evaluate(el => el.classList.contains('tv-mode'))); }
    for (const who of ['natalie', 'shane']) {
      await page.locator(`[data-who="${who}"]`).click();
      await page.locator('.homecoming-look').first().scrollIntoViewIfNeeded(); const result = await layout('.village-wardrobe, #sheet .segmented', '#sheet'); check(`${name}: ${who} earned reward collection fits`, result.pass, result);
    }
    await page.locator('[data-who="natalie"]').click(); await page.locator('.village-wardrobe-heading').scrollIntoViewIfNeeded(); await shot(`ui-only-${name}-earned-wardrobe.png`);
  }
  check('Offline UI completes without page or loading errors', !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length);
} catch (error) { report.failure = error.stack ?? String(error); if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'ui-only-failure.png'), timeout: 30000 }).catch(() => {}); }
finally { clearInterval(activity); await browser?.close(); await new Promise(resolve => server.close(resolve)); report.passed = !report.failure && report.checks.length > 0 && report.checks.every(c => c.pass) && !report.errors.length && !report.consoleErrors.length; await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failure: report.failure, htmlSha256: report.htmlSha256, out })); if (!report.passed) process.exitCode = 1;
