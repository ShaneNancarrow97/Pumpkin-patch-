import test from 'node:test';
import assert from 'node:assert/strict';
import { createPadMenu } from '../src/ui/pad-menu.js';
import { createPlayPadBoundary } from '../src/ui/play-input-boundary.js';

// A small layout-aware DOM: the production ring, event routing and input
// boundary run unchanged, without a renderer or browser timing dependency.
function fixture() {
  const old = Object.fromEntries(['document', 'addEventListener', 'getComputedStyle', 'CustomEvent'].map(k => [k, globalThis[k]]));
  const listeners = {};
  let doc;
  class Element {
    constructor(tag = 'div', id = '', rect = [0, 0, 0, 0]) {
      this.tagName = tag.toUpperCase(); this.id = id; this.children = []; this.parentElement = null;
      this.attrs = new Map(); this.dataset = {}; this.hidden = false; this.disabled = false; this.textContent = id;
      this.rect = rect; this.style = { visibility: 'visible', overflowY: 'visible', position: 'static', scrollPaddingTop: '0' };
      this.clientHeight = rect[3]; this.offsetHeight = rect[3]; this.scrollHeight = rect[3]; this.scrollTop = 0; this.clicks = 0;
      const classes = new Set();
      this.classList = { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x), toggle: (x, on = !classes.has(x)) => { if (on) classes.add(x); else classes.delete(x); return on; } };
    }
    get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
    append(...children) { for (const child of children) { this.children.push(child); child.parentElement = this; } }
    contains(el) { return this === el || this.children.some(child => child.contains(el)); }
    setAttribute(k, v) { this.attrs.set(k, String(v)); }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    removeAttribute(k) { this.attrs.delete(k); }
    hasAttribute(k) { return this.attrs.has(k); }
    matches(s) {
      if (s.includes(',')) return s.split(',').some(x => this.matches(x));
      if (s === '[hidden]') return this.hidden;
      if (s.includes(':not([hidden])')) return !this.hidden && this.matches(s.replace(':not([hidden])', ''));
      if (s.includes(':not(:disabled)')) return !this.disabled && this.matches(s.replace(':not(:disabled)', ''));
      if (s.includes(' ')) { const i = s.lastIndexOf(' '); return this.matches(s.slice(i + 1)) && !!this.parentElement?.closest(s.slice(0, i)); }
      if (s.startsWith('#')) return this.id === s.slice(1);
      if (s.startsWith('.')) return s.slice(1).split('.').every(c => this.classList.contains(c));
      if (s.startsWith('[')) {
        const m = s.match(/^\[([^=\]^]+)(?:=\"([^\"]*)\")?\]$/);
        return !!m && (m[2] == null ? this.hasAttribute(m[1]) : this.getAttribute(m[1]) === m[2]);
      }
      return this.tagName.toLowerCase() === s;
    }
    closest(s) { for (let n = this; n; n = n.parentElement) if (n.matches(s)) return n; return null; }
    querySelectorAll(s) { return this.children.flatMap(c => [...(c.matches(s) ? [c] : []), ...c.querySelectorAll(s)]); }
    querySelector(s) { return this.querySelectorAll(s)[0] ?? null; }
    getBoundingClientRect() { const [left, top, width, height] = this.rect; return { left, top, width, height, right: left + width, bottom: top + height }; }
    getClientRects() { return this.closest('[hidden]') ? [] : [this.getBoundingClientRect()]; }
    focus() { doc.activeElement = this; }
    blur() { doc.activeElement = doc.body; }
    click() { this.clicks++; this.onclick?.(); }
    dispatchEvent() { return true; }
    scrollBy({ top }) { this.scrollTop += top; }
    scrollTo({ top }) { this.scrollTop = top; }
  }
  doc = { body: new Element('body'), createElement: tag => new Element(tag),
    querySelector: s => doc.body.querySelector(s), getElementById: id => doc.body.querySelector('#' + id) };
  doc.activeElement = doc.body;
  globalThis.document = doc;
  globalThis.addEventListener = (name, cb) => { listeners[name] = cb; };
  globalThis.getComputedStyle = el => el.style;
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; Object.assign(this, options); } };
  const root = (id, rect) => { const el = new Element('div', id, rect); doc.body.append(el); return el; };
  const button = (root, id, rect) => { const el = new Element('button', id, rect); root.append(el); return el; };
  const hud = root('hud', [70, 20, 300, 44]), actions = root('actions', [150, 660, 300, 44]), dock = root('dock', [90, 730, 360, 52]);
  const stock = button(hud, 'open-stock', [80, 20, 60, 44]);
  const level = button(hud, 'open-levels', [210, 20, 64, 44]);
  button(hud, 'settings', [300, 20, 44, 44]);
  const plant = button(actions, 'plant-all', [160, 660, 80, 44]);
  button(actions, 'boost', [260, 660, 80, 44]);
  const farm = button(dock, 'farm', [100, 730, 60, 50]); farm.classList.add('tab', 'active');
  const build = button(dock, 'build', [170, 730, 60, 50]); build.classList.add('tab');
  button(dock, 'attractions', [240, 730, 60, 50]); button(dock, 'home', [310, 730, 60, 50]);
  const sheet = root('sheet', [100, 100, 400, 500]); sheet.hidden = true;
  const sheetBody = new Element('div', 'sheet-body', [100, 100, 400, 500]); sheetBody.style.overflowY = 'auto'; sheetBody.scrollHeight = 1400; sheet.append(sheetBody);
  const purchase = button(sheetBody, 'purchase', [300, 300, 100, 44]);
  return { doc, hud, actions, dock, stock, level, plant, build, sheet, sheetBody, purchase, listeners,
    restore() { for (const [k, v] of Object.entries(old)) if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } };
}
const input = (keys = [], edges = keys, extra = {}) => ({ pad: { axes: [0, 0, 0, 0] }, down: Array.from({ length: 18 }, (_, i) => keys.includes(i)), pressed: i => edges.includes(i), mode: 'dualsense', blocked: false, farmBarsEligible: true, ...extra });

test('L2 enters the farm bars at the level badge, with one shared ring and a complete legend', () => {
  const f = fixture();
  try {
    const transitions = [], menu = createPadMenu({ onFarmBarsChange: on => transitions.push(on) });
    assert.equal(menu.tick(input([6, 0])), true, 'entry consumes simultaneous world interaction');
    assert.equal(menu.farmBars, true); assert.equal(f.doc.activeElement, f.level); assert.equal(f.level.clicks, 0);
    assert.equal(f.doc.body.classList.contains('farm-bars-nav'), true);
    menu.tick(input([6], []));
    assert.equal(menu.farmBars, true, 'holding the trigger cannot immediately close it');
    const legend = f.doc.body.children.find(el => el.classList.contains('farm-bars'));
    assert.match(legend.innerHTML, /Navigate/); assert.match(legend.innerHTML, /Select/); assert.match(legend.innerHTML, /Back/); assert.match(legend.innerHTML, /Close/);
    assert.deepEqual([f.stock, f.level, f.plant, f.build].filter(el => el.hasAttribute('data-pad-focus')), [f.level]);
    menu.tick(input()); menu.tick(input([6]));
    assert.equal(menu.hubOn, false); assert.deepEqual(transitions, [true, false]);
    assert.equal(f.doc.activeElement, f.doc.body, 'exiting releases focus from the top HUD too');
  } finally { f.restore(); }
});

test('D-pad crosses both farm rows and the action row; Cross activates once and transfers to the opened menu', () => {
  const f = fixture();
  try {
    const menu = createPadMenu(); f.build.onclick = () => { f.sheet.hidden = false; };
    menu.tick(input([6])); menu.tick(input()); menu.tick(input([13]));
    assert.equal(f.doc.activeElement, f.plant);
    menu.tick(input()); menu.tick(input([13])); assert.equal(f.doc.activeElement, f.build);
    menu.tick(input()); menu.tick(input([12])); assert.equal(f.doc.activeElement, f.plant);
    menu.tick(input()); menu.tick(input([13])); menu.tick(input()); menu.tick(input([0]));
    assert.equal(f.build.clicks, 1); assert.equal(menu.hubOn, false); assert.equal(f.doc.activeElement, f.purchase);
    menu.tick(input([0], [])); assert.equal(f.purchase.clicks, 0, 'held Cross cannot also buy in the new menu');
    f.sheet.hidden = true; menu.tick(input()); menu.tick(input([6]));
    assert.equal(f.doc.activeElement, f.build, 're-entry remembers a valid last bar choice');
  } finally { f.restore(); }
});

test('farm shortcut requires eligibility and real pad activity; open menus keep L2 scrolling and Options keeps its hub', () => {
  const f = fixture();
  try {
    const menu = createPadMenu();
    menu.tick(input([], [], { farmBarsEligible: false }));
    const shortcut = f.doc.body.children.find(el => el.className === 'farm-hud-shortcut');
    assert.equal(shortcut.hidden, true);
    assert.equal(menu.tick(input([6], [6], { farmBarsEligible: false })), false); assert.equal(menu.hubOn, false);
    menu.tick(input()); assert.equal(shortcut.hidden, false); assert.match(shortcut.innerHTML, /Farm menus/);
    f.listeners.pointerdown(); assert.equal(shortcut.hidden, true, 'touch hides pad-only instructions');
    f.sheet.hidden = false; menu.tick(input([13])); menu.tick(input()); f.sheetBody.scrollTop = 600; menu.tick(input([6]));
    assert.equal(menu.farmBars, false); assert.equal(f.sheetBody.scrollTop, 200, 'L2 still scrolls the menu upward');
    menu.tick(input()); menu.tick(input([9])); assert.equal(menu.hubOn, true); assert.equal(menu.farmBars, false);
    menu.tick(input()); menu.tick(input([9])); assert.equal(menu.hubOn, false);
  } finally { f.restore(); }
});

test('farm bar entry and exit suppress held movement, camera and action until neutral', () => {
  const f = fixture();
  try {
    const boundary = createPlayPadBoundary();
    let raw = { id: 'DualSense', index: 0, connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
    const menu = createPadMenu({ onFarmBarsChange: () => boundary.release(raw) });
    const frame = keys => { raw.buttons = raw.buttons.map((_, i) => ({ pressed: keys.includes(i), value: keys.includes(i) ? 1 : 0 })); const sampled = boundary.sample(raw); return menu.tick({ ...input(), ...sampled }); };
    frame([]); raw.axes = [.8, 0, .7, 0]; frame([6, 0]);
    let blocked = boundary.sample(raw); assert.equal(blocked.down[0], false); assert.equal(blocked.pad.axes[0], 0); assert.equal(blocked.pad.axes[2], 0);
    raw.axes = [0, 0, 0, 0]; frame([]); raw.axes = [.8, 0, .7, 0]; frame([1, 0]);
    assert.equal(menu.hubOn, false); assert.equal(f.level.clicks, 0, 'Back wins over an accidental simultaneous Cross');
    blocked = boundary.sample(raw); assert.equal(blocked.down[0], false); assert.equal(blocked.down[1], false); assert.deepEqual(blocked.pad.axes, [0, 0, 0, 0]);
    raw.axes = [0, 0, 0, 0]; frame([]); raw.axes = [.8, 0, 0, 0];
    assert.equal(boundary.sample(raw).pad.axes[0], .8, 'movement returns only after neutral');
  } finally { f.restore(); }
});
