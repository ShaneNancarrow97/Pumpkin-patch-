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
const report = { file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), scope: 'UI-only exact HTML acceptance. Two native village RAFs precede explicit renderer/composer draw holding. World pixels in ui-only screenshots are stale and are not renderer/performance evidence. Input, DOM and simulation use native game RAF. Supplied level20 fixture starts with no hidden keepsakes; later legitimate eligibility counters are staged and the native model update awards six colours. No real progression pacing or physical device certification is claimed.', checks: [], screenshots: [], errors: [], consoleErrors: [], externalRequests: [], failedRequests: [] };
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
  await page.evaluate(() => { const s = PumpkinVoxel.state(), e = s.village.expansion; e.effects = [...new Set([...e.effects, 'herb-beds'])]; e.chapters['restaurant-opening'] = e.chapters['moor-stage'] = true; e.economy.herbsProcessed = 6; e.economy.treatments = 3; e.economy.commissions['cinder-first-supper'] = { done: 3, cooldown: 0 }; s.progression.homeActivities.cook = 3; s.hayride.haunts.owned.push('turning-scarecrows'); s.hayride.completed = 25; });
  await page.waitForFunction(ids => ids.every(id => PumpkinVoxel.state().looks.owned.includes(id)), SECRET_LOOKS.map(x => x.id));
  await page.locator('#vg-panel-close').click(); await page.locator('.vg-dock [data-vg-page="journal"]').click(); await page.waitForSelector('#vg-panel .homecoming-card.is-earned', { state: 'attached' });
  check('Native model awards all three paired keepsakes', await page.locator('#vg-panel .homecoming-card.is-earned').count() === 3);
  check('Earned colours reveal in the shared journal', await fold.evaluate((el, names) => names.every(name => el.textContent.includes(name)), SECRET_LOOKS.map(x => x.name)));
  // The management dock is intentionally hidden in character-control mode.
  // Return to management before testing its real Outfits button.
  await page.evaluate(() => { PumpkinVoxel.village.close(); PumpkinVoxel.scene.player.setEnabled(false); }); await frames(); await page.locator('.tab[data-tab="wardrobe"]').click();
  const first = 'natalie-homecoming-botanist'; await page.waitForSelector(`[data-look="natalie:${first}"]`); const beforeWear = await page.evaluate(() => ({ coins: PumpkinVoxel.state().coins, earned: PumpkinVoxel.state().earned }));
  await page.locator(`[data-look="natalie:${first}"]`).click(); await page.waitForFunction(id => PumpkinVoxel.state().looks.natalie === id, first);
  check('One real Wear tap equips an earned colour without charging', await page.evaluate(before => PumpkinVoxel.state().coins === before.coins && PumpkinVoxel.state().earned === before.earned, beforeWear));
  check('Both owners receive all their own earned colour choices', await page.locator('.homecoming-look').count() === 3); await page.locator('[data-who="shane"]').click(); check('Shane has matching wearable choices', await page.locator('.homecoming-look').count() === 3);
  await page.locator('[data-look="shane:shane-homecoming-ghostlight"]').click(); await page.locator('[data-who="natalie"]').click();
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390]]) { await page.setViewportSize({ width, height }); await frames(); await page.locator('.homecoming-look').first().scrollIntoViewIfNeeded(); const result = await layout('.homecoming-look', '#sheet'); check(`${name}: earned wardrobe choices fit`, result.pass, result); await shot(`ui-only-${name}-earned-wardrobe.png`); }
  check('Offline UI completes without page or loading errors', !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length);
} catch (error) { report.failure = error.stack ?? String(error); if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'ui-only-failure.png'), timeout: 30000 }).catch(() => {}); }
finally { clearInterval(activity); await browser?.close(); await new Promise(resolve => server.close(resolve)); report.passed = !report.failure && report.checks.length > 0 && report.checks.every(c => c.pass) && !report.errors.length && !report.consoleErrors.length; await fs.writeFile(path.join(out, 'browser.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failure: report.failure, htmlSha256: report.htmlSha256, out })); if (!report.passed) process.exitCode = 1;
