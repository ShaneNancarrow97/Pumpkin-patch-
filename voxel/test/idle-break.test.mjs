import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleBreakClock, idlePadInUse, IDLE_PAUSE_SECONDS, IDLE_WARNING_SECONDS } from '../src/idle-break.js';
import { createIdleBreak } from '../src/ui/idle-break.js';

test('real-time idle clock warns for the last30 seconds and pauses exactly at3½ minutes once', () => {
  let time = 0; const c = createIdleBreakClock(() => time);
  assert.equal(IDLE_PAUSE_SECONDS, 210); assert.equal(IDLE_WARNING_SECONDS, 30);
  time = 179.99; assert.equal(c.tick().phase, 'active');
  time = 180; assert.deepEqual(c.tick(), { phase: 'warning', remaining: 30, pause: false, resume: false });
  time = 209.99; assert.equal(c.tick().remaining, 1);
  time = 210; assert.equal(c.tick().pause, true);
  time = 7200; assert.deepEqual(c.tick(true), { phase: 'paused', remaining: 0, pause: false, resume: false });
  assert.equal(c.activity(true), true); assert.equal(c.tick().remaining, 210);
});
test('activity restarts the entire deadline; manual pauses and external resumes stay distinct', () => {
  let time = 0; const c = createIdleBreakClock(() => time);
  time = 200; c.tick(); assert.equal(c.activity(), false);
  time = 379; assert.equal(c.tick().phase, 'active');
  time = 380; assert.equal(c.tick().remaining, 30);
  time = 400; assert.equal(c.tick(true).phase, 'active'); assert.equal(c.activity(true), false);
  time = 600; c.tick(true); assert.equal(c.tick(false).remaining, 210);
  time = 810; assert.equal(c.tick().pause, true);
  time = 900; assert.equal(c.tick(false).phase, 'active', 'a separate Resume starts a fresh deadline');
});
test('a skipped frame or background interval cannot extend the inactivity limit', () => {
  let time = 0; const c = createIdleBreakClock(() => time);
  time = 3600; assert.equal(c.tick().pause, true);
});
test('controller buttons and either radial stick count, with drift and nonstandard trigger axes excluded', () => {
  const pad = extra => ({ connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: [], ...extra });
  assert.equal(idlePadInUse([]), false); assert.equal(idlePadInUse([null, pad({})]), false);
  assert.equal(idlePadInUse([pad({ axes: [.05, -.06, .04, .02] })]), false);
  assert.equal(idlePadInUse([pad({ axes: [.15, .15, 0, 0] })]), true);
  assert.equal(idlePadInUse([pad({ axes: [0, 0, -.2, 0] })]), true);
  assert.equal(idlePadInUse([pad({ buttons: [{ pressed: true }] })]), true);
  assert.equal(idlePadInUse([pad({ mapping: '', axes: [-1, -1] })]), false);
  assert.equal(idlePadInUse([pad({ connected: false, buttons: [{ pressed: true }] })]), false);
});

// Only the DOM is doubled: use the actual input handlers and pause callbacks.
class Events {
  listeners = new Map();
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, extra = {}) { for (const fn of this.listeners.get(type) ?? []) fn(extra); }
  get count() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}
class Element extends Events {
  hidden = true; dataset = {}; writes = 0; text = '';
  set textContent(text) { this.text = text; this.writes++; }
  get textContent() { return this.text; }
}
function harness() {
  const target = new Events(), doc = new Events(), elements = new Map(); doc.hidden = false;
  doc.getElementById = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const state = { paused: false }; let time = 0, pads = [], pauses = 0, resumes = 0;
  const api = createIdleBreak({ state: () => state, target, doc, now: () => time, getPads: () => pads, onPause: () => pauses++, onResume: () => resumes++ });
  return { api, target, doc, state, el: doc.getElementById, at(t) { time = t; api.tick(); }, pads(p) { pads = p; }, get pauses() { return pauses; }, get resumes() { return resumes; } };
}
test('the existing game pause flag changes once and the warning becomes a clear resume card', () => {
  const h = harness(); h.at(180);
  assert.equal(h.el('idle-break').hidden, false); assert.equal(h.el('idle-break-time').textContent, '0:30');
  assert.equal(h.el('idle-break-resume').hidden, true); assert.equal(h.state.paused, false);
  const writes = h.el('idle-break-copy').writes; h.at(181); assert.equal(h.el('idle-break-time').textContent, '0:29');
  assert.equal(h.el('idle-break-copy').writes, writes, 'screen-reader message is not rewritten every second');
  h.at(210); h.at(500); assert.equal(h.pauses, 1); assert.equal(h.state.paused, true);
  assert.equal(h.el('idle-break-resume').hidden, false); assert.match(h.el('idle-break-copy').textContent, /3½ minutes/);
  h.el('idle-break-resume').emit('click'); assert.equal(h.resumes, 1); assert.equal(h.state.paused, false); assert.equal(h.el('idle-break').hidden, true);
});
test('held touch and keys remain active; releasing them starts a fresh deadline', () => {
  for (const [down, up, data] of [['pointerdown', 'pointerup', { pointerId: 7 }], ['keydown', 'keyup', { code: 'KeyW' }]]) {
    const h = harness(); h.target.emit(down, data); h.at(1000); assert.equal(h.state.paused, false);
    h.target.emit(up, data); h.at(1209); assert.equal(h.state.paused, false); h.at(1210); assert.equal(h.state.paused, true);
  }
});
test('mouse, wheel and accessibility click reset a warning, without releasing a manual tea break', () => {
  for (const event of ['pointermove', 'wheel', 'click']) {
    const h = harness(); h.at(200); h.target.emit(event); h.at(379); assert.equal(h.el('idle-break').hidden, true);
    h.state.paused = true; h.at(800); h.target.emit(event); assert.equal(h.state.paused, true); assert.equal(h.resumes, 0);
  }
});
test('held gamepad input prevents a break and a fresh button resumes only an automatic break', () => {
  const h = harness(), g = { connected: true, mapping: 'standard', axes: [0, 0, -.25, 0], buttons: [] };
  h.pads([g]); h.at(1000); assert.equal(h.state.paused, false);
  h.pads([]); h.at(1210); assert.equal(h.state.paused, true);
  h.pads([{ ...g, axes: [0, 0, 0, 0], buttons: [{ pressed: true }] }]); h.at(1211);
  assert.equal(h.state.paused, false); assert.equal(h.resumes, 1);
  h.state.paused = true; h.at(2000); assert.equal(h.state.paused, true); assert.equal(h.resumes, 1);
});
test('blur and a hidden page clear lost held inputs; cancelled pointers cannot keep a farm awake', () => {
  for (const event of ['blur', 'visibilitychange', 'pointercancel']) {
    const h = harness(); h.target.emit('pointerdown', { pointerId: 9 });
    if (event === 'visibilitychange') { h.doc.hidden = true; h.doc.emit(event); }
    else h.target.emit(event, { pointerId: 9 });
    h.at(210); assert.equal(h.state.paused, true, event);
  }
});
test('disposal hides the card and removes all input and document listeners', () => {
  const h = harness(); assert.ok(h.target.count > 0); h.at(180); h.api.dispose();
  assert.equal(h.target.count, 0); assert.equal(h.doc.count, 0); assert.equal(h.el('idle-break-resume').count, 0); assert.equal(h.el('idle-break').hidden, true);
});
