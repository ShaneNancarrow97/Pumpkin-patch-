// Exact shipped game, with an injected wall clock to avoid waiting3½ minutes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
const file = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(file), report = { html: file, sha256: createHash('sha256').update(html).digest('hex'), bytes: html.length, checks: [], errors: [], screenshots: [], scope: 'Unchanged offline HTML on loopback, normal SwiftShader rendering. Injected monotonic clock advances only inactivity; actual game rules, inputs, pause callbacks and UI run normally. Declared level6 save. Mocked standard controller and viewport checks do not certify physical hardware.' };
const check = (pass, label, detail) => { report.checks.push({ pass: !!pass, label, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) throw Error(label + ': ' + JSON.stringify(detail)); };
const s = M.freshState(); Object.assign(s, { introSeen: true, earned: M.LEVELS[5].at }); s.progression.claimed = [1, 2, 3, 4, 5, 6]; s.village.invited = s.village.toured = true; s.village.quests.invitation = { done: true, step: 3 };
s.village.quests['two-doorbells'] = { done: true, step: 3 }; s.village.unlocks.push('gathering');
const server = createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true }); page.setDefaultTimeout(120000); page.on('pageerror', e => report.errors.push(e.message));
  await page.addInitScript(save => {
    localStorage.setItem('pumpkin-patch-voxel-reference-v1', JSON.stringify(save)); localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ music: false, voiceEnabled: false }));
    const native = performance.now.bind(performance); window.__idleNow = null; performance.now = () => window.__idleNow ?? native();
  }, M.saveData(s));
  await page.goto(`http://127.0.0.1:${server.address().port}/game.html`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForSelector('body[data-ready]');
  await page.evaluate(() => { __idleNow = performance.now(); window.dispatchEvent(new Event('pointermove')); });
  const step = seconds => page.evaluate(seconds => { __idleNow += seconds * 1000; PumpkinVoxel.idleBreak.tick(); return { ...PumpkinVoxel.idleBreak.status, paused: PumpkinVoxel.state().paused }; }, seconds);
  const wake = () => page.evaluate(() => window.dispatchEvent(new Event('pointermove')));
  let status = await step(179); check(status.phase === 'active' && !status.paused, 'No warning before the final30 seconds', status);
  status = await step(1); check(status.phase === 'warning' && status.remaining === 30 && !status.paused, 'Countdown starts at3 minutes', status);
  for (const [name, width, height, tv] of [['desktop', 1280, 800, false], ['phone', 390, 844, false], ['landscape', 844, 390, false], ['fold', 1000, 900, false], ['tv', 1920, 1080, true]]) {
    await page.setViewportSize({ width, height }); await page.evaluate(tv => { document.body.classList.toggle('tv-mode', tv); document.documentElement.style.setProperty('--tv-zoom', tv ? '1.5' : '1'); }, tv); await page.waitForTimeout(350);
    const box = await page.locator('#idle-break').boundingBox(); check(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `${name}: compact countdown fits`, box);
    if (name === 'desktop') { await page.screenshot({ path: path.join(out, 'idle-countdown-desktop.png'), timeout: 90000 }); report.screenshots.push('idle-countdown-desktop.png'); }
  }
  status = await step(29); check(status.remaining === 1 && !status.paused, 'The last second still runs normally', status);
  status = await step(1); check(status.phase === 'paused' && status.paused, 'Game pauses exactly at210 seconds', status);
  const frozen = await page.evaluate(() => { const p = PumpkinVoxel, before = { time: p.state().time, coins: p.state().coins }; p.advance(20); return { before, after: { time: p.state().time, coins: p.state().coins } }; });
  check(JSON.stringify(frozen.before) === JSON.stringify(frozen.after), 'Farm simulation and income remain frozen', frozen);
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { document.body.classList.remove('tv-mode'); document.documentElement.style.setProperty('--tv-zoom', '1'); });
  const resumeBox = await page.locator('#idle-break-resume').boundingBox(); check(resumeBox && resumeBox.width >= 44 && resumeBox.height >= 44, 'Resume is a comfortable phone target', resumeBox);
  await page.screenshot({ path: path.join(out, 'idle-pause-phone.png'), timeout: 90000 }); report.screenshots.push('idle-pause-phone.png');
  await page.touchscreen.tap(resumeBox.x + resumeBox.width / 2, resumeBox.y + resumeBox.height / 2); check(!(await step(0)).paused && await page.locator('#idle-break').isHidden(), 'One tap resumes and clears the card');
  await page.evaluate(() => { PumpkinVoxel.state().paused = true; PumpkinVoxel.idleBreak.tick(); }); await page.keyboard.press('Shift'); check((await step(0)).paused, 'Ordinary input preserves a manual tea break');
  await page.evaluate(() => { PumpkinVoxel.state().paused = false; window.dispatchEvent(new Event('pointermove')); window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, .25, 0], buttons: [] }; Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [__pad] }); });
  check(!(await step(600)).paused, 'Held right stick keeps controller play active'); await page.evaluate(() => __pad.axes.fill(0)); check((await step(210)).paused, 'Releasing the controller starts a fresh3½-minute deadline');
  await page.evaluate(() => __pad.buttons.push({ pressed: true, value: 1 })); check(!(await step(0)).paused, 'A controller button resumes an automatic break'); await page.evaluate(() => __pad.buttons = []);
  // The owner POV must stop too, including its independently timed audio/view.
  await page.setViewportSize({ width: 1280, height: 800 }); await wake();
  await page.evaluate(() => { const p = PumpkinVoxel; Object.assign(p.state().hollowHouse, { purchased: true, status: 'ready', tier: 1 }); p.maze.open(); p.maze.start(); });
  await wake(); await step(210); check(await page.evaluate(() => PumpkinVoxel.maze.status.paused), 'Automatic break pauses the maze POV'); await wake(); check(await page.evaluate(() => !PumpkinVoxel.maze.status.paused), 'Activity resumes the maze stopped by this break');
  await page.evaluate(() => { PumpkinVoxel.maze.pause(true); }); await step(210); await wake(); check(await page.evaluate(() => PumpkinVoxel.maze.status.paused), 'A previously manual POV pause stays paused'); await page.evaluate(() => PumpkinVoxel.maze.close());
  await page.evaluate(() => { const p = PumpkinVoxel; Object.assign(p.state().hayride, { purchased: true, tier: 1 }); p.hayride.open(); p.hayride.start(); });
  await wake(); await step(210); check(await page.evaluate(() => PumpkinVoxel.hayride.status.paused), 'Automatic break pauses the tractor POV'); await wake(); check(await page.evaluate(() => !PumpkinVoxel.hayride.status.paused), 'Activity resumes the tractor stopped by this break'); await page.evaluate(() => PumpkinVoxel.hayride.close());
  await page.evaluate(() => PumpkinVoxel.openVillage()); await wake(); check(await page.evaluate(() => PumpkinVoxel.village.active), 'Village opens normally');
  status = await step(210); check(status.paused && await page.locator('#idle-break-resume').isVisible(), 'The village shares the same idle pause'); await page.keyboard.press('Shift'); check(!(await step(0)).paused && await page.evaluate(() => PumpkinVoxel.village.active), 'Keyboard resumes within the village');
  await page.evaluate(() => { const p = PumpkinVoxel; p.village.showPanel('journal'); document.querySelector('[data-vgx-track="green-research"]').click(); p.village.back(); document.querySelector('#vg-quest-toggle').click(); });
  check(await page.evaluate(() => PumpkinVoxel.village.status.trackedQuest === 'green-research'), 'A real chapter can be followed before completion');
  const completed = await page.evaluate(() => {
    const p = PumpkinVoxel, s = p.state(), events = [];
    for (const id of ['green-research:1', 'green-research:2', 'green-research:3']) { const r = p.rules.actVillageExpansion(s, id, id.endsWith(':2') ? { solve: true } : {}); if (!r.ok) throw Error(r.reason); events.push(...r.events); }
    const coins = s.coins; for (const e of events) p.village.onEvent(e); p.village.tick(.1);
    return { tracked: p.village.status.trackedQuest, expanded: p.village.status.questExpanded, savedPin: s.village.expansion.tracked, title: document.querySelector('#vg-quest-title').textContent, receipt: !document.querySelector('.vgx-milestone').hidden, sameCoins: coins === s.coins };
  });
  check(completed.tracked !== 'green-research' && completed.savedPin === null && !completed.expanded && completed.title !== 'The Ink Beneath the Roots' && completed.receipt && completed.sameCoins, 'Completion clears the tracker and keeps its brief receipt without granting again', completed);
  await page.evaluate(() => { const p = PumpkinVoxel; p.village.tick(6.1); p.village.close(); p.state().village.expansion.tracked = 'green-research'; p.village.open(); });
  check(await page.evaluate(() => PumpkinVoxel.state().village.expansion.tracked === null && PumpkinVoxel.village.status.trackedQuest !== 'green-research'), 'Re-entering repairs an old completed saved pin');
  await page.evaluate(() => PumpkinVoxel.village.enterHall('rowan-workshop')); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'completed-pin-cleared-rowan.png'), timeout: 90000 }); report.screenshots.push('completed-pin-cleared-rowan.png');
  check(report.errors.length === 0, 'No page errors', report.errors);
} catch (e) { report.errors.push(e.stack ?? String(e)); } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
report.passed = !report.errors.length && report.checks.every(c => c.pass); await fs.writeFile(path.join(out, 'idle-pause-browser.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors, sha256: report.sha256 })); if (!report.passed) process.exitCode = 1;
