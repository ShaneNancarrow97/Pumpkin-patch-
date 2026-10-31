// Actual hayride menu and handlers, with the game's shell/CSS and pure state.
// This harness intentionally does not initialize the renderer or main game.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'docs/plans/hayride-upgrade-icons/verification'));
fs.mkdirSync(out, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const build = fs.readFileSync(path.join(root, 'build.mjs'), 'utf8');
const cssList = build.match(/const css = inline\(\[([\s\S]*?)\]\.map/);
if (!cssList) throw Error('Cannot locate the real game stylesheet order');
const cssFiles = [...cssList[1].matchAll(/"([^"]+\.css)"/g)].map(m => m[1]);
const mime = { '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp' };
const inlineAssetFiles=[];
const css = cssFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
  .replace(/url\('(assets\/[^']+)'\)/g, (_, file) => {inlineAssetFiles.push(file);return `url('data:${mime[path.extname(file)]};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}')`;});
const entry = `
import * as M from './src/model.js';
import { hayrideSheets } from './src/ui/hayride-sheet.js';
import { HAYRIDE_ICON_IDS } from './src/content/hayride-icon-map.js';
const host=document.getElementById('sheet-body');
const callbacks=[];
let state=M.freshState();
const ui={
 get state(){return state;},
 save(){callbacks.push('save');},
 scene:{refreshHayride(){callbacks.push('refreshHayride');}},
 tone(){callbacks.push('tone');},notice(text){callbacks.push({notice:text});},
 draw(){draw();},closeSheet(){callbacks.push('closeSheet');},
 focusHayride(){callbacks.push('focusHayride');},openHayrideRide(){callbacks.push('openHayrideRide');}
};
const menu=hayrideSheets(ui).hayride;
function draw(){
 const top=host.scrollTop;host.innerHTML=menu.body();menu.bind(host);host.scrollTop=top;
 document.getElementById('sheet-title').textContent=menu.title;
 document.getElementById('sheet-eyebrow').textContent=menu.eyebrow;
 document.getElementById('coins').textContent='£'+state.coins.toLocaleString('en-GB');
 document.getElementById('level-number').textContent=String(M.patchLevel(state).level);
}
function level(n){state.earned=M.LEVELS[n-1].at;state.progression.claimed=M.LEVELS.slice(0,n).map(x=>x.level);state.progression.pending=[];}
function fixture({patchLevel=20,purchased=false,tier=1,routeLevel=0,fleet=0,dispatch=0,coins=120000,paused=false,tab='overview'}={}){
 state=M.freshState();state.introSeen=true;state.coins=coins;state.house.level=3;
 state.hollowHouse.purchased=true;state.hollowHouse.status='ready';level(patchLevel);
 Object.assign(state.hayride,{purchased,tier,routeLevel,fleet,dispatch});state.paused=paused;
 menu.setTab(tab);draw();host.scrollTop=0;
}
function snapshot(){const h=state.hayride;return{coins:state.coins,patchLevel:M.patchLevel(state).level,purchased:h.purchased,tier:h.tier,routeLevel:h.routeLevel,fleet:h.fleet,dispatch:h.dispatch,price:h.ticketPrice,owned:[...h.haunts.owned],active:[...h.haunts.active],invested:h.invested,tickets:h.ticketsSold,income:h.income,guests:state.visitors.length};}
document.getElementById('sheet').hidden=false;document.getElementById('sheet').dataset.section='hayride';
document.body.classList.add('menu-open');document.body.dataset.ready='true';
document.getElementById('sheet-close').onclick=()=>{document.getElementById('sheet').hidden=true;};
window.HayrideIconQA={fixture,snapshot,callbacks,iconIDs:HAYRIDE_ICON_IDS,
 get state(){return state;},setLevel(n){level(n);draw();},draw,
 setTab(tab){menu.setTab(tab);draw();},
 catalog:{property:M.HAYRIDE_PROPERTY,tiers:M.HAYRIDE_TIERS,operations:M.HAYRIDE_OPERATIONS,routes:M.HAYRIDE_ROUTE_UPGRADES,scares:M.HAYRIDE_SCARES}
};
fixture({patchLevel:10});
`;
const compiled = await esbuild.build({ absWorkingDir:root,stdin: { contents: entry, resolveDir: root, sourcefile: 'hayride-menu-fixture.mjs' }, bundle: true, format: 'iife', loader: { '.webp': 'dataurl', '.png': 'dataurl' }, target: ['es2020'], write: false, minify: false,metafile:true });
const shell = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8');
const html = shell.replace('/* @build:style */', () => css).replace('/* @build:script */', () => compiled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(out, 'actual-menu-fixture.html'), html);
const sourceFiles = ['src/ui/hayride-sheet.js', 'src/ui/hayride-icons.js', 'src/content/hayride-icon-map.js', 'src/content/hayride.js', 'src/rules/hayride.js', 'assets/hayride-upgrade-icons.webp', 'src/index.html', ...cssFiles];
const repository=path.dirname(root);
const inputs=[...new Set([...sourceFiles,...inlineAssetFiles,'build.mjs','package.json','package-lock.json','tools/qa-hayride-icons.mjs',...Object.keys(compiled.metafile.inputs)].map(file=>path.resolve(root,file)).filter(file=>fs.existsSync(file)))];
const sourcePaths=inputs.filter(file=>file.startsWith(repository+path.sep)&&!file.includes(path.sep+'node_modules'+path.sep));
const dependencies=inputs.filter(file=>file.includes(path.sep+'node_modules'+path.sep));
for(const file of inputs)if(!sourcePaths.includes(file)&&!dependencies.includes(file))throw Error('Unexpected compiled input outside repository: '+file);
const report = {
  scope: 'Actual hayrideSheets module, its real purchase/toggle handlers and model rules, complete game CSS in build order and real index.html shell. Pure test fixtures deliberately set level/unlocks; no WebGL, main game loop, 3D picking, sound or physical-device claims.',
  fixtureSha256: digest(html), sourceHashes: Object.fromEntries(sourcePaths.map(file => [path.relative(repository,file).split(path.sep).join('/'), digest(fs.readFileSync(file))])),
  dependencyHashes:Object.fromEntries(dependencies.map(file=>[file.split(path.sep+'node_modules'+path.sep).at(-1).split(path.sep).join('/'),digest(fs.readFileSync(file))])),
  started: new Date().toISOString(), passed: false, checks: [], errors: [], externalRequests: [], screenshots: [], icons: {},
};
const write = () => fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(report, null, 2));
const check = (ok, label, data) => { report.checks.push({ ok: !!ok, label, ...(data === undefined ? {} : { data }) }); write(); console.log((ok ? 'ok ' : 'FAIL ') + label); if (!ok) throw Error(label + ': ' + JSON.stringify(data)); };
const server = http.createServer((req, res) => { if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; } res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
page.setDefaultTimeout(30000);
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
page.on('request', request => { if (![base, 'data:', 'blob:'].some(prefix => request.url().startsWith(prefix))) report.externalRequests.push(request.url()); });
await page.route('**/*', route => [base, 'data:', 'blob:'].some(prefix => route.request().url().startsWith(prefix)) ? route.continue() : route.abort());
await page.addInitScript(() => { const getContext = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { if (/webgl/i.test(kind)) throw Error('WebGL is outside the menu harness scope'); return getContext.call(this, kind, ...args); }; });
const snap = () => page.evaluate(() => HayrideIconQA.snapshot());
const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); report.screenshots.push(name + '.png'); write(); };
async function inspectIcons() {
  const icons = await page.evaluate(async () => {
    const result = [];
    for (const el of document.querySelectorAll('[data-hayride-icon]')) {
      if (!el.getClientRects().length || el.closest('[hidden]')) continue;
      const style = getComputedStyle(el), id = el.dataset.hayrideIcon;
      const url = style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
      if (!url) { result.push({ id, error: 'no background URL' }); continue; }
      const image = new Image(); image.src = url; await image.decode();
      const width = Math.round(el.getBoundingClientRect().width), height = Math.round(el.getBoundingClientRect().height);
      const scale = style.backgroundSize.split(' ').map(parseFloat), position = style.backgroundPosition.split(' ').map(parseFloat);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'), drawWidth = width * scale[0] / 100, drawHeight = height * scale[1] / 100;
      ctx.drawImage(image, (width - drawWidth) * position[0] / 100, (height - drawHeight) * position[1] / 100, drawWidth, drawHeight);
      const pixels = ctx.getImageData(0, 0, width, height).data; let alpha = 0, hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 24) alpha++; for (let j = 0; j < 4; j++) hash = Math.imul(hash ^ pixels[i + j], 16777619); }
      // Compare different menu sizes at one sampling resolution, using each
      // element's actual CSS crop/position instead of its declared icon ID.
      const common=document.createElement('canvas');common.width=common.height=48;const commonContext=common.getContext('2d'),commonWidth=48*scale[0]/100,commonHeight=48*scale[1]/100;
      commonContext.drawImage(image,(48-commonWidth)*position[0]/100,(48-commonHeight)*position[1]/100,commonWidth,commonHeight);
      const sample=commonContext.getImageData(0,0,48,48).data;let visualHash=2166136261;
      for(let i=0;i<sample.length;i++)visualHash=Math.imul(visualHash^sample[i],16777619);
      result.push({ id, width, height, alpha, hash: visualHash >>> 0, actualSizeHash:hash>>>0, imageWidth: image.width, imageHeight: image.height, backgroundPosition: style.backgroundPosition, ariaHidden: el.getAttribute('aria-hidden') });
    }
    return result;
  });
  for (const icon of icons) {
    check(!icon.error && icon.alpha > icon.width * icon.height * .08 && icon.imageWidth === 768 && icon.imageHeight === 576 && icon.ariaHidden === 'true', 'actual CSS icon decodes and draws ' + icon.id, icon);
    report.icons[icon.id] = icon;
  }
  write();
}
async function paidClick(selector, price, property, expected, label) {
  const before = await snap();
  check(!await page.locator(selector).isDisabled(), label + ': legal purchase is enabled');
  await page.locator(selector).click();
  const after = await snap();
  check(after.coins === before.coins - price && after[property] === expected, label + ': real handler charges exactly once', { before, after, price });
  return after;
}
try {
  await page.goto(base); await page.waitForFunction(() => window.HayrideIconQA); await page.evaluate(() => document.fonts.ready);
  check(await page.locator('[data-hayride-action="purchase"]').isDisabled(), 'level10 keeps the hayride purchase locked'); await inspectIcons(); await shot('desktop-locked-purchase');
  await page.evaluate(() => HayrideIconQA.fixture({ patchLevel: 11 }));
  await paidClick('[data-hayride-action="purchase"]', 7500, 'purchased', true, 'first tractor purchase');
  check(await page.locator('.service-identity [data-hayride-icon="tier1"]').count() === 1, 'the owned station uses the first-tier tractor art');
  await page.locator('[data-hayride-section="upgrade"]').click();
  check(await page.locator('[data-hayride-action="upgrade"]').isDisabled(), 'tier2 retains patch-level13 gate');
  check(await page.locator('[data-hayride-operation="fleet"]').isDisabled(), 'second tractor retains tier2/level15 gate');
  await inspectIcons(); await shot('desktop-first-tier-upgrades');
  await page.evaluate(() => HayrideIconQA.setLevel(13));
  await paidClick('[data-hayride-action="upgrade"]', 6500, 'tier', 2, 'Lantern convoy');
  check(await page.locator('.service-identity [data-hayride-icon="tier2"]').count() === 1, 'upgrading changes the station illustration to tier2');
  await paidClick('[data-hayride-operation="dispatch"]', 1800, 'dispatch', 1, 'first station crew');
  await paidClick('[data-hayride-operation="dispatch"]', 4200, 'dispatch', 2, 'second station crew');
  check(await page.locator('[data-hayride-operation="dispatch"]').isDisabled(), 'fully trained crew cannot be purchased a third time');
  await page.evaluate(() => HayrideIconQA.setLevel(15));
  await paidClick('[data-hayride-operation="fleet"]', 12000, 'fleet', 1, 'second tractor');
  await paidClick('[data-hayride-route]', 8500, 'routeLevel', 1, 'forgotten graveyard detour');
  check(await page.locator('[data-hayride-icon="route2"]').count() === 1 && await page.locator('[data-hayride-route]').isDisabled(), 'the next route switches to thicket art and retains its higher gate');
  await inspectIcons(); await shot('desktop-second-tier-upgrades');
  await page.evaluate(() => HayrideIconQA.setLevel(16));
  await paidClick('[data-hayride-action="upgrade"]', 14000, 'tier', 3, 'Midnight procession');
  check(await page.locator('.service-identity [data-hayride-icon="tier3"]').count() === 1, 'the final station tier uses the midnight illustration');
  await page.locator('[data-hayride-section="scares"]').click(); await inspectIcons(); await shot('desktop-scare-purchases');
  const scares = await page.evaluate(() => HayrideIconQA.catalog.scares);
  for (const scare of scares) {
    const before = await snap(); await page.locator('[data-hayride-scare-buy="' + scare.id + '"]').click(); const after = await snap();
    check(after.coins === before.coins - scare.cost && after.owned.includes(scare.id) && after.active.includes(scare.id), scare.name + ': its actual purchase handler charges once and activates it', { price: scare.cost, before: before.coins, after: after.coins });
  }
  const beforeToggle = await snap();
  await page.locator('[data-hayride-scare-toggle="turning-scarecrows"]').click();
  const off = await snap();
  check(!off.active.includes('turning-scarecrows') && off.coins === beforeToggle.coins && await page.locator('[data-hayride-scare-toggle="turning-scarecrows"]').getAttribute('aria-pressed') === 'false', 'owned scare switches off without another purchase');
  await page.locator('[data-hayride-scare-toggle="turning-scarecrows"]').click();
  const on = await snap(); check(on.active.includes('turning-scarecrows') && on.coins === off.coins, 'owned scare switches back on for no charge');
  await page.evaluate(() => { HayrideIconQA.setLevel(18); HayrideIconQA.setTab('upgrade'); });
  await paidClick('[data-hayride-route]', 16000, 'routeLevel', 2, 'crooked thicket extension');
  const complete = await snap();
  check(complete.tickets === 0 && complete.income === 0 && complete.guests === 0 && complete.coins === 37300, 'upgrade handlers preserve admissions and finite funds', complete);
  await page.evaluate(() => HayrideIconQA.setTab('overview'));
  const priceBefore = await snap();
  await page.locator('[data-hayride-price-step="1"]').click();
  const priceUp = await snap(); check(priceUp.price === priceBefore.price + 1 && priceUp.coins === priceBefore.coins, 'ticket stepper remains a price setting, not a payment');
  await page.locator('[data-hayride-price-step="-1"]').click(); check((await snap()).price === priceBefore.price, 'ticket price can be reduced again');
  for (const [name, width, height] of [['phone', 390, 844], ['fold', 874, 787], ['landscape', 844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const tab of ['upgrade', 'scares']) {
      await page.evaluate(tab => HayrideIconQA.fixture({ purchased: true, tier: tab === 'scares' ? 3 : 2, patchLevel: 20, tab }), tab);
      await inspectIcons();
      const layout = await page.evaluate(() => {
        const sheet = document.getElementById('sheet'), body = document.getElementById('sheet-body'), rect = sheet.getBoundingClientRect();
        const buttons = [...sheet.querySelectorAll('button')].filter(el => el.getClientRects().length && !el.closest('[hidden]'));
        const small = buttons.map(el => ({ text: el.textContent.trim(), ...el.getBoundingClientRect().toJSON() })).filter(r => r.width < 43.5 || r.height < 43.5);
        const overlaps = [...document.querySelectorAll('.hayride-next,.hayride-scare')].map(row => { const children = [...row.children].map(el => el.getBoundingClientRect()); return children.length === 2 && Math.min(children[0].right,children[1].right)-Math.max(children[0].left,children[1].left)>.5 && Math.min(children[0].bottom,children[1].bottom)-Math.max(children[0].top,children[1].top)>.5; }).filter(Boolean).length;
        return { documentOverflow: document.documentElement.scrollWidth > innerWidth + 1, bodyOverflow: body.scrollWidth > body.clientWidth + 1, clippedSheet: rect.left < -.5 || rect.right > innerWidth + .5 || rect.top < -.5 || rect.bottom > innerHeight + .5, small, overlaps, sheet: rect.toJSON() };
      });
      check(!layout.documentOverflow && !layout.bodyOverflow && !layout.clippedSheet && !layout.small.length && !layout.overlaps, name + ': ' + tab + ' menu fits, keeps44px targets and has no overlapping rows', layout);
      await shot(name + '-' + tab + '-top');
      await page.locator('#sheet-body').evaluate(el => { el.scrollTop = el.scrollHeight; }); await shot(name + '-' + tab + '-bottom');
    }
  }
  await page.evaluate(() => HayrideIconQA.fixture({ purchased: true, tier: 1, patchLevel: 20, coins: 100, tab: 'upgrade' }));
  check(await page.locator('[data-hayride-action="upgrade"]').isDisabled() && await page.locator('[data-hayride-operation="dispatch"]').isDisabled(), 'insufficient money still disables upgrades');
  await page.evaluate(() => HayrideIconQA.fixture({ purchased: true, tier: 2, patchLevel: 20, paused: true, tab: 'upgrade' }));
  check(await page.locator('[data-hayride-action="upgrade"]').isDisabled() && await page.locator('[data-hayride-operation="fleet"]').isDisabled() && await page.locator('[data-hayride-route]').isDisabled(), 'pause still disables actual management purchases');
  const expectedIDs = await page.evaluate(() => [...HayrideIconQA.iconIDs]);
  check(expectedIDs.every(id => report.icons[id]) && Object.keys(report.icons).length === 12, 'all12 authored icons were exercised through actual menu states', Object.keys(report.icons));
  const hashes = Object.values(report.icons).map(icon => icon.hash);
  check(new Set(hashes).size === hashes.length, 'the12 actual CSS crops display distinct sprite art');
  check(!Object.keys(compiled.metafile.inputs).some(file=>/docs\/plans\/hayride-upgrade-icons\/.*\.png$/.test(file)), 'full-size generation PNGs are not imported into the menu bundle');
  check(report.errors.length === 0 && report.externalRequests.length === 0, 'menu fixture has no page errors or external runtime requests', { errors: report.errors, externalRequests: report.externalRequests });
  report.passed = true;
} catch (error) {
  report.failure = String(error); console.error(error.stack ?? error); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  write(); await browser.close(); await new Promise(resolve => server.close(resolve));
}
