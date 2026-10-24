import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideView } from "../src/hayride-view.js";

function fixture(purchased = true) {
  const listeners = new Map(), preview = [], gentle = [], scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x302043, .012); scene.background = new THREE.Color(0x332244);
  const originalFog = scene.fog, originalBackground = scene.background;
  const canvas = { clientWidth: 1000, clientHeight: 700, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); }, setPointerCapture() {}, releasePointerCapture() {} };
  const state = { coins: 1234, hayride: { purchased, tier: 2, open: true, income: 88, ticketsSold: 11, convoy: { progress: .3 } }, visitors: [{ id: 5, budget: 23 }] };
  const world = { scene, setPreview(progress) { preview.push(progress); }, setGentleMotion(value) { gentle.push(value); }, getPreviewFrame(progress) { return { position: new THREE.Vector3(progress * 10, 2.13, 18), target: new THREE.Vector3(progress * 10, 2, 10), yaw: 0 }; } };
  return { state, canvas, listeners, world, preview, gentle, scene, originalFog, originalBackground };
}

test("owner ride uses the existing scene without changing wallets, seats or tickets", () => {
  const f = fixture(), before = JSON.stringify(f.state), cues = [], finished = [];
  const view = createHayrideView(f.canvas, f.state, { world: f.world, onCue: cue => cues.push(cue), onComplete: status => finished.push(status) });
  assert.equal(view.enter({ gentle: true }), true); assert.equal(view.active, true);
  assert.notEqual(f.scene.fog, f.originalFog); assert.equal(view.status.tier, 2);
  const end = view.advanceForTest(1000);
  assert.equal(end.completed, true); assert.equal(end.progress, 1); assert.equal(end.eventsFired.length, 5);
  assert.equal(cues.length, 5); assert.equal(new Set(cues.map(cue => cue.id)).size, 5); assert.equal(finished.length, 1);
  view.advanceForTest(1000); assert.equal(cues.length, 5); assert.equal(finished.length, 1);
  assert.equal(JSON.stringify(f.state), before);
  view.leave(); assert.equal(f.preview.at(-1), null); assert.equal(f.gentle.at(-1), null);
  assert.equal(f.scene.fog, f.originalFog); assert.equal(f.scene.background, f.originalBackground); assert.equal(view.active, false);
  view.dispose(); assert.equal(f.listeners.size, 0);
});

test("long render frames do not skip the boarding introduction or scenic reveals", () => {
  const f = fixture(), view = createHayrideView(f.canvas, f.state, { world: f.world });
  view.enter(); view.tick(20);
  assert.equal(view.status.elapsed, .1); assert.equal(view.status.progress, 0); assert.equal(view.status.zoneName, "Rear boarding");
  assert.ok(view.camera.position.z > 20, "first view is behind rear boarding gate");
  view.advanceForTest(2.4); assert.equal(view.status.progress, 0); assert.ok(Math.abs(view.camera.position.z - 18) < 1e-8);
  view.tick(Infinity); assert.equal(view.status.elapsed, 2.5); view.tick(-5); assert.equal(view.status.elapsed, 2.5);
  view.dispose();
});

test("paused owner playback and bounded touch look are independent of the farm", () => {
  const f = fixture(), view = createHayrideView(f.canvas, f.state, { world: f.world });
  view.enter({ paused: true }); view.advanceForTest(10); assert.equal(view.status.elapsed, 0);
  assert.equal(view.setLook(100, 100), false); view.setPaused(false);
  assert.equal(view.setLook(100, -100), true);
  assert.equal(view.status.lookYaw, view.status.lookBounds.yaw); assert.equal(view.status.lookPitch, -view.status.lookBounds.pitch);
  let stopped = 0;
  const event = data => ({ pointerId: 1, button: 0, clientX: 10, clientY: 10, preventDefault() {}, stopImmediatePropagation() { stopped++; }, ...data });
  f.listeners.get("pointerdown")(event()); f.listeners.get("pointermove")(event({ clientX: -100000, clientY: 100000 }));
  view.tick(.05); assert.ok(Math.abs(view.status.lookYaw) <= view.status.lookBounds.yaw); assert.ok(Math.abs(view.status.lookPitch) <= view.status.lookBounds.pitch);
  f.listeners.get("pointerup")(event()); assert.ok(stopped >= 3);
  assert.ok(view.camera.matrixWorld.elements.every(Number.isFinite)); view.dispose();
});

test("visibility interruption pauses until explicit resume and rejects unowned rides", () => {
  const old = globalThis.document, docListeners = new Map();
  globalThis.document = { hidden: false, addEventListener(name, fn) { docListeners.set(name, fn); }, removeEventListener(name) { docListeners.delete(name); } };
  try {
    const f = fixture(), view = createHayrideView(f.canvas, f.state, { world: f.world });
    view.enter(); view.advanceForTest(20); const elapsed = view.status.elapsed;
    document.hidden = true; docListeners.get("visibilitychange")(); view.tick(.1); assert.equal(view.status.elapsed, elapsed); assert.equal(view.status.paused, true);
    document.hidden = false; assert.equal(view.status.paused, true); view.setPaused(false); view.tick(.1); assert.ok(view.status.elapsed > elapsed);
    view.dispose(); assert.equal(docListeners.size, 0);
    const locked = fixture(false), reject = createHayrideView(locked.canvas, locked.state, { world: locked.world });
    assert.equal(reject.enter(), false); assert.equal(reject.active, false); assert.equal(locked.preview.length, 0); reject.dispose();
  } finally { if (old === undefined) delete globalThis.document; else globalThis.document = old; }
});

test("the director frames roadside scenery while touch look and gentle mode stay in control", () => {
  const f = fixture();
  f.world.getPreviewFrame = () => ({ position: new THREE.Vector3(0, 2, 18), target: new THREE.Vector3(0, 2, 10), yaw: 0, focusTarget: new THREE.Vector3(-8, 2, 18), focusWeight: 1 });
  const view = createHayrideView(f.canvas, f.state, { world: f.world }), direction = new THREE.Vector3();
  view.enter({ gentle: false }); view.advanceForTest(3); view.camera.getWorldDirection(direction);
  assert.ok(direction.x < -.99, "the nearby set is framed during its encounter");
  view.setLook(.5, 0); view.camera.getWorldDirection(direction);
  assert.ok(direction.z < -.8, "a deliberate look overrides the guided glance");
  view.setOptions({ gentle: true }); view.setLook(0, 0); view.camera.getWorldDirection(direction);
  assert.ok(direction.z < -.99, "gentle mode keeps the unturned forward view");
  view.dispose();
});

test("off-map lightning and delayed thunder obey controls and reset on exit", () => {
  const f = fixture(), flashes = [], cues = [];
  f.world.setLightning = value => flashes.push(value);
  const before = JSON.stringify(f.state), view = createHayrideView(f.canvas, f.state, { world: f.world, onCue: cue => cues.push(cue) });
  view.enter({ gentle: false, lightning: true }); view.advanceForTest(13.2);
  assert.equal(view.status.lightningIntensity, 1); assert.equal(flashes.at(-1), 1);
  view.setPaused(true); assert.equal(flashes.at(-1), 0);
  view.setPaused(false); view.advanceForTest(1);
  assert.equal(cues.filter(cue => cue.type === "weather").length, 1);
  view.advanceForTest(.1); assert.equal(cues.filter(cue => cue.type === "weather").length, 1);
  view.setOptions({ gentle: true }); view.advanceForTest(26.1);
  assert.equal(flashes.at(-1), 0); assert.equal(cues.filter(cue => cue.type === "weather").length, 1);
  view.leave(); assert.equal(flashes.at(-1), 0); assert.equal(JSON.stringify(f.state), before);
  view.dispose();
});
