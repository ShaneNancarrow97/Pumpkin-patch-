// Check the shipped rules and existing level checklist in the exact offline build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), report = { html: file, sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length, checks: [], errors: [], screenshots: [], scope: 'Exact offline bytes served on loopback; declared level5 save with ten million takings and missing village story. Normal SwiftShader rendering. Viewports are not physical Fold/TV/controller certification.' };
const check = (pass, label, detail) => { report.checks.push({ pass: !!pass, label, detail }); if (!pass) throw Error(label + ': ' + JSON.stringify(detail)); };
const s = M.freshState(); Object.assign(s, { introSeen: true, paused: true, coins: 9000000, earned: 10000000 });
s.progression.claimed = [1, 2, 3, 4, 5]; s.progression.homeLegacyThrough = 5;
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);
  page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(save => { localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ music: false, voiceEnabled: false })); }, M.saveData(s));
  await page.goto(`http://127.0.0.1:${server.address().port}/game.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('body[data-ready]', { timeout: 120000 });
  const initial = await page.evaluate(() => { const s = PumpkinVoxel.state(); return { version: s.version, coins: s.coins, earned: s.earned, ...PumpkinVoxel.rules.patchLevel(s) }; });
  check(initial.level === 5 && initial.xp === 15375 && initial.coins === 9000000 && initial.earned === 10000000 && initial.version === 20, 'Loaded game keeps coins and bounds banked progress', initial);
  await page.locator('#open-levels').click();
  await page.locator('.level-card').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  for (const [name, width, height] of [['desktop', 1280, 800], ['phone', 390, 844], ['landscape', 844, 390], ['fold', 1000, 900]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(650);
    const layout = await page.evaluate(() => {
      const el = document.querySelector('.level-card'), r = el.getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, text: el.textContent, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, targets: [...el.querySelectorAll('.level-close,.level-continue,[data-level-village]')].map(b => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height }; }) };
    });
    check(layout.scrollWidth <= width + 1 && layout.rect.x >= -1 && layout.rect.y >= -1 && layout.rect.x + layout.rect.w <= width + 1 && layout.rect.y + layout.rect.h <= height + 1, `${name}: checklist fits viewport`, layout.rect);
    check(layout.targets.every(r => r.w >= 43.5 && r.h >= 43.5), `${name}: primary targets retain 44px areas`, layout.targets);
    check(/Progress bank full/.test(layout.text) && /25% head start/.test(layout.text) && /Further sales still pay coins/.test(layout.text), `${name}: bank policy is clear`);
    if (name === 'desktop' || name === 'phone') { const filename = `balanced-progression-${name}.png`; await page.screenshot({ path: path.join(out, filename), timeout: 90000 }); report.screenshots.push(filename); }
  }
  await page.locator('.level-close').click();
  const run = await page.evaluate(() => {
    const m = PumpkinVoxel.rules, s = PumpkinVoxel.state(); s.paused = false;
    s.house.placed = [{ id: 'd01', room: 'parlour' }]; s.progression.homeActivities.wardrobe = 1;
    s.village.expansion.effects.push('green-research', 'green-workshop', 'green-supper');
    const first = m.awardLevels(s), bank = m.patchLevel(s).xp, coins = s.coins;
    const again = m.awardLevels(s), loaded = m.restoreState(JSON.parse(JSON.stringify(m.saveData(s)))), afterLoad = m.awardLevels(loaded);
    s.paused = true;
    return { first, again, afterLoad, level: m.patchLevel(loaded).level, bank, afterBank: m.patchLevel(loaded).xp, coins, loadedCoins: loaded.coins, pending: loaded.progression.pending };
  });
  check(JSON.stringify(run.first) === '[6]' && !run.again.length && !run.afterLoad.length && run.level === 6 && run.bank === run.afterBank && run.coins === run.loadedCoins, 'Finishing the story promotes once and reload cannot reuse overflow', run);
  check(report.errors.length === 0, 'No page errors', report.errors);
} catch (e) { report.errors.push(e.stack ?? String(e)); } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass);
await fs.writeFile(path.join(out, 'balanced-progression-browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, sha256: report.sha256 }));
if (!report.passed) process.exitCode = 1;
