// Exercises the shipped HTML and the new farm controls, retaining browser evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = process.argv[2] || '/workspace/Pumpkin-Patch-Boost-and-Helping-Hands.html';
const out = path.join(root, 'docs/contractor-patches/boost-helping-hands/verification');
await fs.mkdir(out, { recursive: true });
const html = await fs.readFile(htmlPath);
const report = { date: new Date().toISOString(), htmlSha256: createHash('sha256').update(html).digest('hex'), checks: [], errors: [], screenshots: [], standardSmoke: process.env.FARM_QA_FOCUSED_ONLY ? { completed: false, scope: 'An earlier build passed10 desktop checks before the slow broad run was stopped. Final-build focused checks below are separate.', partialLog: 'standard-smoke-partial.log' } : null };
const check = (pass, label, detail = undefined) => { report.checks.push({ pass: !!pass, label, ...(detail === undefined ? {} : { detail }) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); };
const server = createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.statusCode = 204; res.end(); return; }
  res.setHeader('Content-Type', 'text/html'); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/game.html`;
let browser;
try {
  // The repository smoke already covers room controls, shop, costumes and visitors.
  if (!process.env.FARM_QA_FOCUSED_ONLY) {
    const log = [];
    const child = spawn(process.execPath, ['smoke.mjs', '--shots', out], { cwd: root, env: { ...process.env, GAME_URL: url, CHROMIUM_PATH: '/usr/bin/chromium', SMOKE_LITE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { const s = chunk.toString(); log.push(s); process.stdout.write(s); });
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
    const code = await new Promise(resolve => child.on('exit', resolve)); clearTimeout(timer);
    await fs.writeFile(path.join(out, 'standard-smoke.log'), log.join(''));
    report.standardSmoke = { exitCode: code, passed: code === 0, checks: log.join('').split('\n').filter(l => l.startsWith('ok  ')).length };
    check(code === 0, 'standard desktop and phone smoke passes', report.standardSmoke);
  }
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(120000);
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs', JSON.stringify({ glow: false, shadows: false, music: false, sound: false, mist: false, lakeLights: false })));
  await page.goto(url);
  await page.waitForSelector('body[data-ready]');
  if (await page.locator('[data-intro-skip]').isVisible()) await page.locator('[data-intro-skip]').click();
  await page.waitForFunction(() => PumpkinVoxel.scene.characterStyle === 'sprites', null, { timeout: 120000 });
  await page.evaluate(() => {
    const s = PumpkinVoxel.state(); s.coins = 100000; s.progression.claimed = PumpkinVoxel.rules.LEVELS.map(l => l.level); s.progression.pending = [];
    s.visitorTimer = s.shop.arrivalTimer = 1e6; s.paused = false; s.introSeen = true;
    for (const p of s.plots) Object.assign(p, { phase: 'empty', progress: 0 }); PumpkinVoxel.advance(0);
  });
  await page.locator('#plant-all').click();
  check(await page.evaluate(() => PumpkinVoxel.state().plots.filter(p => p.phase === 'growing').length === 1), 'Plant button changes exactly one plot');
  await page.locator('#plant-all').click();
  check(await page.evaluate(() => PumpkinVoxel.state().plots.filter(p => p.phase === 'growing').length === 2), 'Second plant press changes only one further plot');
  await page.locator('#boost').click();
  check(await page.evaluate(() => PumpkinVoxel.state().farmWork.boost.heat > 0 && PumpkinVoxel.state().taps === 1), 'Boost accepts a tap and adds heat');
  const shot = async name => { await page.screenshot({ path: path.join(out, name) }); report.screenshots.push(name); };
  await shot('farm-work-desktop-dial.png');
  const buy = async selector => {
    const el = page.locator(selector).first(); await el.scrollIntoViewIfNeeded(); const r = await el.boundingBox();
    await page.mouse.move(r.x+r.width/2,r.y+r.height/2); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector('.purchase-button.holding'));
  };
  const openFarm = async section => { await page.evaluate(() => PumpkinVoxel.openSheet('shop')); await page.locator(`[data-farm-section="${section}"]`).click(); };
  await openFarm('helpers');
  await buy('[data-helper-buy="shane:hire"]');
  check(await page.evaluate(() => PumpkinVoxel.state().farmWork.helpers.shane.hired && !PumpkinVoxel.state().farmWork.helpers.natalie.hired), 'Genuine hold-to-buy hires Shane without hiring Natalie');
  await buy('[data-helper-buy="shane:plant"]'); await buy('[data-helper-buy="shane:water"]');
  check(await page.evaluate(() => PumpkinVoxel.rules.helperStatus(PumpkinVoxel.state(),'shane').plantFactor === .8 && PumpkinVoxel.rules.helperStatus(PumpkinVoxel.state(),'shane').waterFactor === .8), 'Planting and watering purchases train only Shane');
  await buy('[data-helper-buy="shane:capacity"]');
  check(await page.evaluate(() => PumpkinVoxel.rules.helperStatus(PumpkinVoxel.state(),'shane').capacity === 2 && PumpkinVoxel.rules.helperStatus(PumpkinVoxel.state(),'natalie').capacity === 1), 'First basket upgrade gives Shane capacity two');
  await buy('[data-helper-buy="shane:capacity"]');
  check(await page.evaluate(() => PumpkinVoxel.rules.helperStatus(PumpkinVoxel.state(),'shane').capacity === 3), 'Second basket upgrade gives Shane capacity three');
  await shot('farm-work-desktop-helpers.png');
  await page.locator('[data-farm-section="boost"]').click();
  await buy('[data-boost-buy="power"]'); await buy('[data-boost-buy="cooling"]');
  check(await page.evaluate(() => { const b=PumpkinVoxel.rules.boostStatus(PumpkinVoxel.state());return b.strength===1.25&&b.heatPerUse===9&&b.coolPerSecond===10; }), 'Power and cooling purchases change their real rule values');
  await shot('farm-work-desktop-boost-upgrades.png');
  await page.locator('#sheet-close').click();
  // Each case stages fresh ripe crops and removes automation only for this manual-capacity fixture.
  for (const capacity of [1,2,3]) {
    await page.evaluate(n => {
      const s=PumpkinVoxel.state(); s.farmWork.helpers.shane.hired=false; s.farmWork.helpers.natalie.hired=false; s.farmWork.helpers.natalie.capacity=n-1;
      s.stock=s.stock.map(()=>0); s.fresh=s.fresh.map(()=>[]); s.harvested=0; s.visitorTimer=s.shop.arrivalTimer=1e6;
      for(const p of s.plots.slice(0,6))Object.assign(p,{phase:'ready',progress:1,variety:0,ripe:s.time}); PumpkinVoxel.advance(0);
    },capacity);
    await page.locator('#harvest-all').click();
    check(await page.evaluate(n=>PumpkinVoxel.state().harvested===n,capacity), `Manual pick button respects capacity ${capacity}`);
  }
  await page.evaluate(() => {
    const s=PumpkinVoxel.state();s.farmWork.boost={power:0,cooling:0,heat:0,overheated:false,lastUse:-1};
    for(let i=0;i<10;i++){s.time+=.2;PumpkinVoxel.rules.tap(s);} PumpkinVoxel.advance(0);
  });
  check(await page.locator('#boost').isDisabled() && (await page.locator('.boost-button-label').textContent())==='Cooling', 'Overheated dial visibly disables Boost and says Cooling');
  await shot('farm-work-desktop-overheated.png');
  check(await page.evaluate(() => {
    const s=PumpkinVoxel.state();s.paused=true;const before=JSON.stringify(s.farmWork.boost);PumpkinVoxel.advance(5);return JSON.stringify(s.farmWork.boost)===before;
  }), 'Tea break freezes heat');
  await page.evaluate(() => { PumpkinVoxel.state().paused=false;PumpkinVoxel.advance(9); });
  check(!(await page.locator('#boost').isDisabled()) && await page.evaluate(()=>!PumpkinVoxel.rules.boostStatus(PumpkinVoxel.state()).overheated), 'Active-time cooling unlocks Boost after threshold');
  check(await page.evaluate(() => {
    const s=PumpkinVoxel.state(),raw=PumpkinVoxel.rules.saveData(s);raw.version=14;delete raw.farmWork;raw.upgrades={...raw.upgrades,auto:1};
    const r=PumpkinVoxel.rules.restoreState(raw);return r.version===15&&r.farmWork.helpers.shane.hired&&r.farmWork.helpers.natalie.hired;
  }), 'Legacy shared helping-hands purchase restores both owners at version15');
  for(const [name,width,height]of[['fold-unfolded',884,1104],['phone',390,844],['phone-landscape',844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>{const s=PumpkinVoxel.state();s.paused=false;s.coins=100000;s.farmWork.helpers.shane.hired=true;s.farmWork.helpers.natalie.hired=true;PumpkinVoxel.openSheet('shop');});
    await page.locator('[data-farm-section="helpers"]').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('#sheet-body').scrollWidth<=document.querySelector('#sheet-body').clientWidth+1),`${name}: helper menu has no horizontal overflow`);
    await shot(`farm-work-${name}-helpers.png`);
    await page.locator('[data-farm-section="boost"]').click();await shot(`farm-work-${name}-boost.png`);
    check(await page.locator('.farm-boost-card').count()===2,`${name}: both boost upgrade cards reachable`);
    await page.locator('#sheet-close').click();await shot(`farm-work-${name}-dial.png`);
  }
  check(report.errors.length===0,'Focused browser run has no page or console errors',report.errors);
  await page.close();
} catch(error) { report.errors.push(error.stack||String(error));console.error(error); }
finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  report.passed=report.errors.length===0&&report.checks.every(c=>c.pass)&&report.checks.length>0;
  await fs.writeFile(path.join(out,'farm-work-browser-report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,standardSmoke:report.standardSmoke}));
if(!report.passed)process.exitCode=1;
