import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import { buildMazeRideConfig } from "../src/rules/maze-ride.js";
import { MAZE_PREFABS } from "../src/content/hollow-house.js";

// Bundle the browser adapter without a renderer; unavailable images use its
// real native fallback, while the public camera and lifecycle remain intact.
const bundle = await build({ entryPoints: [new URL("../src/maze-ride-view.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".png": "dataurl", ".webp": "dataurl" }, write: false });
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
const { createMazeRideView } = sandbox.module.exports;
const configFor = tier => { const ids = MAZE_PREFABS.map(p => p.id); return buildMazeRideConfig({ hollowHouse: { purchased: true, status: "ready", tier, haunts: { owned: ids, active: ids } } }); };
const plain = value => JSON.parse(JSON.stringify(value));
function canvasDouble() {
  const listeners = new Map(), captured = new Set();
  return {
    clientWidth: 390, clientHeight: 844, listeners, captured,
    addEventListener(name, listener) { listeners.set(name, listener); }, removeEventListener(name) { listeners.delete(name); },
    setPointerCapture(id) { captured.add(id); }, releasePointerCapture(id) { captured.delete(id); this.fire("lostpointercapture", { pointerId: id }); },
    fire(name, fields = {}) { listeners.get(name)?.({ button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, ...fields }); },
  };
}

test("pause freezes a pending look gesture, including deterministic advance", () => {
  const canvas = canvasDouble(), config = configFor(4); let blocked = false;
  const view = createMazeRideView(canvas, {}, { blocked: () => blocked });
  view.enter(config, { paused: true, gentle: false }); view.tick(3);
  assert.equal(view.status.elapsed, 0); assert.equal(view.setLook(1, 1), false);
  view.setPaused(false); view.advanceForTest(10.6);
  canvas.fire("pointerdown"); canvas.fire("pointermove", { clientX: -200, clientY: 100 }); view.tick(.02);
  assert.ok(view.status.lookYaw > 0 && view.status.lookYaw < Math.PI / 4);
  view.setPaused(true); const paused = plain(view.status);
  assert.equal(canvas.captured.size, 0);
  view.tick(5); view.advanceForTest(50);
  assert.deepEqual(plain(view.status.camera), paused.camera); assert.equal(view.status.elapsed, paused.elapsed);
  view.setPaused(false); view.tick(.02); assert.ok(view.status.elapsed > paused.elapsed);
  blocked = true; const look = view.status.lookYaw;
  canvas.fire("pointerdown"); canvas.fire("pointermove", { clientX: 1000 });
  assert.equal(view.status.inputActive, false); assert.equal(view.status.lookYaw, look);
  blocked = false; view.setLook(100, -100);
  assert.equal(view.status.lookYaw, Math.PI / 4); assert.equal(view.status.lookPitch, -Math.PI / 9);
  view.dispose(); assert.equal(canvas.listeners.size, 0);
});

test("replay refreshes actor ownership and cue ids, while exit clears active input", () => {
  const canvas = canvasDouble(), farm = { coins: 123, ticketsSold: 8, paused: false }, beforeFarm = JSON.stringify(farm), config = configFor(3), cues = [];
  let completed = 0;
  const view = createMazeRideView(canvas, farm, { onCue: cue => cues.push(cue.id), onComplete: () => completed++ });
  view.enter(config, { gentle: true }); const id = view.status.id, shell = view.scene.children.find(o => o.name === "Hollow House ride shell");
  const actors = view.scene.children.filter(o => o.userData.mazeScareActor);
  view.advanceForTest(config.duration); view.advanceForTest(1);
  assert.equal(completed, 1); assert.equal(cues.length, config.encounters.length); assert.equal(new Set(cues).size, cues.length);
  view.restart({ gentle: true }); assert.notEqual(view.status.id, id); assert.deepEqual(plain(view.status.eventsFired), []);
  assert.equal(view.scene.children.find(o => o.name === "Hollow House ride shell"), shell);
  assert.ok(actors.every(o => o.userData.disposed));
  view.advanceForTest(config.encounters[0].at + .1); assert.equal(new Set(cues).size, config.encounters.length + 1);
  canvas.fire("pointerdown"); assert.equal(canvas.captured.size, 1);
  view.leave(); assert.equal(canvas.captured.size, 0); assert.equal(view.status.active, false); assert.equal(view.status.geometryCount, 0); assert.equal(view.status.textureCount, 0);
  canvas.fire("pointerdown"); canvas.fire("pointermove", { clientX: 300 }); view.tick(10);
  assert.equal(view.status.active, false); assert.equal(view.status.elapsed, 0); assert.equal(JSON.stringify(farm), beforeFarm);
  view.dispose(); assert.equal(canvas.listeners.size, 0);
});

test("every tier finishes on a finite rail pose and frames its authored reveals", () => {
  const canvas = canvasDouble(), view = createMazeRideView(canvas, {});
  for (let tier = 1; tier <= 5; tier++) {
    const config = configFor(tier); view.enter(config, { gentle: true });
    for (const encounter of config.encounters) {
      view.restart({ gentle: true }); view.advanceForTest(encounter.at + encounter.duration * .45);
      const status = view.status, actor = status.actors.find(a => a.id === encounter.id), camera = status.camera;
      assert.ok(actor.visible); const dx = actor.x - camera.x, dz = actor.z - camera.z, distance = Math.hypot(dx, dz);
      const dot = (dx * -Math.sin(camera.yaw) + dz * -Math.cos(camera.yaw)) / distance;
      assert.ok(dot > Math.cos(.31), `portrait reveal is ahead at tier ${tier}`);
      assert.ok(distance > .8 && distance < 2.6, `tier ${tier} reveal comes close without crossing the camera`);
      assert.equal(status.lightCount, 8); assert.ok(status.batches >= 3 && status.batches <= 6);
    }
    view.advanceForTest(1e6); const complete = view.status;
    assert.equal(complete.progress, 1); assert.equal(complete.completed, true); assert.equal(complete.inputActive, false);
    assert.ok(Object.values(complete.camera).every(Number.isFinite)); assert.equal(complete.camera.y, 1.65);
    assert.equal(complete.camera.x, config.rail.at(-1).x); assert.equal(complete.camera.z, config.rail.at(-1).z);
    const pose = plain(complete.camera); view.tick(1); assert.deepEqual(plain(view.status.camera), pose);
    view.leave();
  }
  view.dispose();
});
