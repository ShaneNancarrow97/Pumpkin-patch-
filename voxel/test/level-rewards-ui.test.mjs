import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import * as M from '../src/model.js';
import { levelGiftCard, levelUnlockCards, levelReceiptCards, levelRequirementView, createRewardCarousel } from '../src/ui/level-reward-cards.js';

const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
test('all twenty level presentations are read-only and never invent a free purchase', () => {
  const state = freeze(M.freshState());
  for (const level of M.LEVELS) {
    const cards = levelReceiptCards(level, state, true);
    assert.equal(new Set(cards.map(card => card.key)).size, cards.length, `level ${level.level} has stable unique cards`);
    assert.equal(cards.filter(card => card.origin === 'gift').length, level.rewards.length);
    for (const card of cards.filter(card => card.origin === 'unlock')) {
      assert.equal(card.badge, 'Level gate opened'); assert.ok(card.where); assert.ok(card.note);
      if (card.price != null) assert.ok(Number.isFinite(card.price) && card.price >= 0, `${card.key} has a real price`);
      assert.doesNotMatch(card.badge, /granted|added|yours/i);
    }
  }
});
test('receipts honour actual once-only gifts while previews explain duplicate compensation', () => {
  const s = M.freshState(); s.earned = M.LEVELS[1].at; M.awardLevels(s);
  const before = JSON.stringify(s), cards = levelReceiptCards(M.LEVELS[1], s);
  assert.equal(cards[1].kind, 'decor', 'a just-awarded decoration is still displayed as its actual gift');
  assert.equal(cards[1].id, 'd03'); assert.equal(cards[1].duplicate, undefined);
  assert.equal(levelGiftCard({ kind: 'decor', id: 'd03' }, { preview: true, state: s }).title, '£50 bonus coins');
  assert.equal(JSON.stringify(s), before, 'viewing or previewing never grants, spends or dismisses anything');
  s.progression.receipts[2][1].duplicate = true;
  assert.equal(levelReceiptCards(M.LEVELS[1], s)[1].title, '£50 bonus coins');
  const r = { kind: 'upgrade', id: 'tools', name: 'A better watering can', max: 9 }; s.upgrades.tools = 9;
  assert.equal(levelGiftCard(r, { preview: true, state: s, level: 4 }).title, '£100 bonus coins');
});
test('upgrade cards explain the actual price, destination and prerequisite for level five', () => {
  const s = M.freshState(), cards = levelUnlockCards(5, s), house = cards.find(card => card.key === 'house:1');
  // Level-five opens the next kitchen attraction, not free ownership of it.
  const kitchen = cards.find(card => card.key === 'kitchen');
  assert.equal(kitchen.price, M.COOKING.price); assert.match(kitchen.note, /Purchase/); assert.equal(kitchen.origin, 'unlock');
  const cocoa = cards.find(card => card.key.startsWith('cocoa:'));
  assert.equal(cocoa.price, M.COCOA_TIERS.find(t => t.level === 5).price); assert.match(cocoa.note, /plot/);
  if (house) { assert.equal(house.price, M.HOUSE_LEVELS[1].cost); assert.equal(house.title, M.HOUSE_LEVELS[2].name); }
  const gatedFarm = levelUnlockCards(15, s).find(card => card.key.startsWith('farm:'));
  assert.ok(gatedFarm); assert.match(gatedFarm.note, /earlier tiers/); assert.ok(gatedFarm.price > 0);
});
test('next-level requirements exclude gift coins and show the real home blocker', () => {
  const s = M.freshState(); s.progression.claimed = [1, 2, 3, 4]; s.progression.homeLegacyThrough = 4;
  s.progression.bonusEarned = 500; s.earned = M.LEVELS[4].at + 500;
  const view = levelRequirementView(s);
  assert.equal(view.current.level, 4); assert.equal(view.next.level, 5);
  assert.equal(view.earnings.have, M.LEVELS[4].at); assert.equal(view.earnings.met, true);
  assert.deepEqual(view.home, M.homeRequirements(s, 5)); assert.equal(view.home[0].met, false);
  s.house.level = 1; assert.equal(M.homeRequirements(s, 5)[0].met, true); assert.equal(levelRequirementView(s).current.level, 5);
});
test('reward browsing clamps at either end and tolerates an empty collection', () => {
  const c = createRewardCarousel(3); assert.equal(c.index, 0); assert.equal(c.select(1), 1);
  assert.equal(c.select(99), 2); assert.equal(c.select(-3), 0); assert.equal(c.select(NaN), 0);
  assert.equal(createRewardCarousel(0).select(9), 0);
});

// This small DOM exercises the actual modal's callbacks, keyboard and pointer
// gestures. Only thumbnail rendering is stubbed: the state/rules are real.
class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = new Map(); this.hidden = false; this.disabled = false; this.inert = false; this.tabIndex = 0; this.scrollLeft = 0; this.scrollTop = 0; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = v; if (k === 'class') { this.className = v; if (v === 'level-receipt-body') this.scrollTop = 91; } if (k === 'hidden') this.hidden = true; if (k === 'tabindex') this.tabIndex = +v; if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v; }
  append(el) { el.parentElement = this; this.children.push(el); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(el => el !== this); this.parentElement = null; }
  get isConnected() { return this === this.doc.body || !!this.parentElement?.isConnected; }
  set innerHTML(html) {
    this.html = html; this.children.forEach(el => { el.parentElement = null; }); this.children = [];
    const stack = [this];
    for (const match of html.matchAll(/<\/?[^>]+>/g)) {
      const token = match[0]; if (token.startsWith('</')) { stack.pop(); continue; }
      const tag = /^<([\w-]+)/.exec(token)?.[1]; if (!tag) continue;
      const el = new Element(tag, this.doc);
      for (const attr of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(attr[1], attr[2] ?? '');
      stack.at(-1).append(el); if (!['img', 'input', 'br', 'hr'].includes(tag) && !token.endsWith('/>')) stack.push(el);
    }
  }
  matches(q) { if (q === '[hidden]') return this.hidden; if (q.startsWith('#')) return this.id === q.slice(1); if (q.startsWith('.')) return (this.className ?? '').split(/\s+/).includes(q.slice(1)); if (q.startsWith('[')) return Object.hasOwn(this.attrs, q.slice(1, -1)); return this.tagName === q.toUpperCase(); }
  querySelectorAll(q) { const found = []; const walk = el => { for (const child of el.children) { if (child.matches(q)) found.push(child); walk(child); } }; walk(this); return found; }
  querySelector(q) { return this.querySelectorAll(q)[0] ?? null; }
  closest(q) { for (let el = this; el; el = el.parentElement) if (el.matches(q)) return el; return null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, fields = {}) { const event = { target: this, preventDefault() {}, stopPropagation() {}, ...fields }; for (const fn of this.listeners.get(type) ?? []) fn(event); }
  click() { if (!this.disabled) { this.onclick?.(); this.emit('click'); } }
  focus() { this.doc.activeElement = this; }
  getBoundingClientRect() { return { left: 0, right: 44 }; }
  scrollIntoView() { this.doc.verticalScrollCalls = (this.doc.verticalScrollCalls ?? 0) + 1; const body = this.closest('.level-receipt-body'); if (body) body.scrollTop = 250; }
}
let compiled;
async function harness(state = M.freshState()) {
  compiled ??= build({ entryPoints: [new URL('../src/ui/level-celebration.js', import.meta.url).pathname], bundle: true, platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'receipt-art-only', setup(b) { b.onLoad({ filter: /\/ui\/kit\.js$/ }, () => ({ contents: 'export const money=n=>"£"+Math.floor(n).toLocaleString("en-GB");export const decorIcon=(id,size)=>`<span class="thumb" data-decor="${id}"></span>`;', loader: 'js' })); } }] });
  const document = { getElementById: id => document.body.querySelector('#' + id) }; document.body = new Element('body', document); document.activeElement = document.body;
  const world = new Element('main', document), opener = new Element('button', document), overlay = new Element('section', document); overlay.id = 'level-celebration'; overlay.hidden = true;
  world.append(opener); document.body.append(world); document.body.append(overlay); opener.focus();
  let saves = 0, jingles = 0, libraries = 0, homes = 0, villages = 0;
  const sandbox = { module: { exports: {} }, document, window: {}, matchMedia: () => ({ matches: true }), setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext((await compiled).outputFiles[0].text, sandbox);
  const ui = sandbox.module.exports.createLevelCelebration({ state: () => state, audio: { levelUp() { jingles++; } }, save() { saves++; }, openRewards() { libraries++; }, openHome() { homes++; }, openVillage() { villages++; } });
  return { state, ui, overlay, world, opener, document, get saves() { return saves; }, get jingles() { return jingles; }, get libraries() { return libraries; }, get homes() { return homes; }, get villages() { return villages; } };
}
test('Continue dismisses only this earned receipt and a stale action cannot dismiss the following level', async () => {
  const s = M.freshState(); s.earned = M.LEVELS[3].at; s.progression.homeLegacyThrough = 4; M.awardLevels(s);
  const h = await harness(s), coins = s.coins; h.ui.tick(false);
  assert.equal(h.ui.status.level, 2); assert.equal(h.jingles, 1); assert.equal(h.world.inert, true);
  const stale = h.overlay.querySelector('.level-continue'); stale.click(); stale.click();
  assert.equal(h.saves, 1); assert.deepEqual(s.progression.pending, [3, 4]); assert.equal(s.coins, coins);
  assert.equal(h.document.activeElement, h.opener); assert.equal(h.world.inert, false);
  h.ui.tick(false); assert.equal(h.ui.status.level, 3); stale.click();
  assert.equal(h.ui.status.level, 3); assert.deepEqual(s.progression.pending, [3, 4]);
  h.overlay.querySelector('.level-close').click(); assert.deepEqual(s.progression.pending, [4]); assert.equal(s.coins, coins); h.ui.dispose();
});
test('real carousel callbacks support arrows, touch swipe, keyboard and shoulder-tab semantics', async () => {
  const h = await harness(); h.ui.preview(); const count = h.ui.status.cardCount;
  assert.ok(count >= 2); assert.equal(h.overlay.querySelector('[data-level-prev]').disabled, true);
  h.overlay.querySelector('[data-level-next]').click(); assert.equal(h.ui.status.cardIndex, 1);
  assert.equal(h.overlay.querySelectorAll('[data-level-card-tab]')[1].attrs['aria-pressed'], 'true');
  const stage = h.overlay.querySelector('[data-level-card-stage]');
  stage.emit('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, clientX: 100, clientY: 50 }); stage.emit('pointerup', { pointerId: 1, clientX: 160, clientY: 55 });
  assert.equal(h.ui.status.cardIndex, 0, 'a right swipe selects the preceding card');
  stage.emit('pointerdown', { pointerId: 2, pointerType: 'touch', button: 0, clientX: 100, clientY: 50 }); stage.emit('pointerup', { pointerId: 2, clientX: 110, clientY: 150 }); assert.equal(h.ui.status.cardIndex, 0, 'vertical reading does not change card');
  h.overlay.emit('keydown', { key: 'End' }); assert.equal(h.ui.status.cardIndex, count - 1); assert.equal(h.overlay.querySelector('[data-level-next]').disabled, true);
  assert.equal(h.overlay.querySelectorAll('[data-level-card-view]').filter(el => !el.hidden).length, 1);
  h.overlay.emit('keydown', { key: 'Home' }); assert.equal(h.ui.status.cardIndex, 0);
  assert.ok(h.overlay.querySelector('[data-pad-tabs]')); h.overlay.querySelectorAll('[data-level-card-tab]')[1].click(); assert.equal(h.ui.status.cardIndex, 1, 'the same tab click used by generic pad menus advances the collection');
  assert.equal(h.saves, 0); assert.equal(h.jingles, 0); h.ui.dispose();
});
test('clicking level leads with exact requirements, and Visit home closes without claiming or spending', async () => {
  const s = M.freshState(); s.progression.claimed = [1, 2, 3, 4]; s.progression.homeLegacyThrough = 4; s.earned = M.LEVELS[4].at;
  const h = await harness(s), before = JSON.stringify(s); h.ui.preview();
  assert.equal(h.ui.status.mode, 'requirements'); assert.equal(h.ui.status.level, 5);
  assert.ok(h.overlay.html.indexOf('level-requirements') < h.overlay.html.indexOf('level-carousel'));
  assert.match(h.overlay.html, /£9,000/); assert.match(h.overlay.html, /Still needed/); assert.match(h.overlay.html, /Upgrade to the Crooked cottage/);
  const home = h.overlay.querySelector('[data-level-home]'); home.click(); home.click();
  assert.equal(h.homes, 1); assert.equal(h.ui.active, false); assert.equal(JSON.stringify(s), before); assert.equal(h.jingles, 0); h.ui.dispose();
});
test('maximum level opens the existing library, and blocked overlays wait their turn', async () => {
  const s = M.freshState(); s.progression.claimed = M.LEVELS.map(l => l.level);
  const h = await harness(s); h.ui.preview(); assert.equal(h.libraries, 1); assert.equal(h.ui.active, false);
  s.progression.pending = [20]; h.ui.tick(true); assert.equal(h.ui.active, false); h.ui.tick(false); assert.equal(h.ui.status.level, 20);
  h.overlay.emit('keydown', { key: 'Escape' }); assert.equal(h.ui.active, false); assert.deepEqual(s.progression.pending, []); h.ui.dispose();
});

test('the village invitation blocker points to the village rather than the private house', async () => {
  const s = M.freshState(); s.progression.claimed = [1, 2, 3]; s.progression.homeLegacyThrough = 3; s.earned = M.LEVELS[3].at;
  const h = await harness(s), before = JSON.stringify(s); h.ui.preview();
  assert.equal(h.ui.status.level, 4); assert.match(h.overlay.html, /Meet Mothlight&#39;s first neighbours/);
  assert.equal(h.overlay.querySelector('[data-level-home]'), null);
  const village = h.overlay.querySelector('[data-level-village]'); assert.ok(village); village.click(); village.click();
  assert.equal(h.villages, 1); assert.equal(h.homes, 0); assert.equal(JSON.stringify(s), before); h.ui.dispose();
});

test('requirements open at the top and carousel browsing scrolls only the horizontal dot strip', async () => {
  const s = M.freshState(); s.progression.claimed = [1, 2, 3, 4]; s.progression.homeLegacyThrough = 4; s.earned = M.LEVELS[4].at;
  const h = await harness(s); h.ui.preview();
  const body = h.overlay.querySelector('.level-receipt-body'), strip = h.overlay.querySelector('.level-card-tabs'), tabs = h.overlay.querySelectorAll('[data-level-card-tab]');
  assert.equal(body.scrollTop, 0, 'initial selection keeps the requirements heading at the start of the scroll area');
  assert.equal(h.document.verticalScrollCalls ?? 0, 0, 'opening never asks ancestors to scroll to the dot strip');
  strip.getBoundingClientRect = () => ({ left: 0, right: 132 });
  tabs.forEach((tab, i) => { tab.getBoundingClientRect = () => ({ left: i * 44 - strip.scrollLeft, right: (i + 1) * 44 - strip.scrollLeft }); });
  body.scrollTop = 137; h.overlay.emit('keydown', { key: 'End' });
  assert.ok(strip.scrollLeft > 0, 'the last dot is brought into view horizontally'); assert.equal(body.scrollTop, 137);
  h.overlay.emit('keydown', { key: 'Home' }); assert.equal(strip.scrollLeft, 0); assert.equal(body.scrollTop, 137, 'browsing back preserves where requirements were being read');
  assert.equal(h.document.verticalScrollCalls ?? 0, 0);
  assert.match(h.overlay.html, /requirements above/); assert.doesNotMatch(h.overlay.html, /home milestones above/); h.ui.dispose();
});
