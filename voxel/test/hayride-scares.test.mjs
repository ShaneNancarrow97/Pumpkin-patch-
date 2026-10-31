import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import { HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH, HAYRIDE_JUMP, hayrideJumpSpot, hayrideRouteSample, hayrideSpan, hayrideRouteDistance } from "../src/content/hayride-layout.js";

const bundle = await build({ entryPoints: [new URL("../src/hayride-scares.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".webp": "dataurl" }, write: false });
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
const { createHayrideScares, hayrideScarePose } = sandbox.module.exports;

test("foreground scares remain outside the lane and gentle mode removes the lunge", () => {
  for (const offset of [4.1, 5.4, 6.1]) for (const upgraded of [false, true]) {
    for (let i = 0; i <= 200; i++) {
      const progress = .4 + i / 1000, pose = hayrideScarePose({ at: .5, offset }, progress, upgraded);
      assert.ok(pose.offset >= 2.6 && pose.offset <= offset);
      assert.ok(pose.lunge >= 0 && pose.lunge <= 1);
      assert.ok(pose.reveal >= 0 && pose.reveal <= 1);
      const gentle = hayrideScarePose({ at: .5, offset }, progress, upgraded, true);
      assert.equal(gentle.lunge, 0); assert.equal(gentle.offset, offset);
    }
  }
  assert.equal(hayrideScarePose({ at: .5, offset: 6.1 }, .1).visible, false);
});

test("the camera turns to each figure a moment before it springs, so the spring lands in view", () => {
  const spec = { at: .5, offset: 4.1 }, at = (units) => hayrideScarePose(spec, .5 + hayrideSpan(units));
  let start = -4; while (at(start).lunge < .05) start += .02;
  assert.ok(at(start).aim > .95, `already turned to it as it starts to spring (${at(start).aim.toFixed(2)})`);
  assert.equal(at(-2.5).aim, 0, "but not long before");
  assert.ok(at(1.2).aim > .95 && at(6).aim === 0, "held through the spring, then let go");
  assert.equal(hayrideScarePose(spec, .5 + hayrideSpan(-1), false, true).aim, 0, "gentle mode never turns to it");
});

test("off-map cast reads ownership without changing state and disposes only its instances", () => {
  const state = { coins: 34, hayride: { tier: 3, income: 16, ticketsSold: 2, haunts: { owned: ["bride-procession"], active: ["bride-procession"] } } };
  // Just past the bride's jump spot, across the lane from her manor, where she lunges.
  const springs = hayrideJumpSpot(HAYRIDE_STOPS.find(stop => stop.id === "bride")).at + hayrideSpan(1.2);
  const before = JSON.stringify(state), cast = createHayrideScares({ state });
  cast.tick({ progress: springs, time: 30, camera: { x: -32, y: 2, z: 15 } });
  assert.equal(cast.diagnostics.actors, 4); assert.equal(cast.diagnostics.visible, 1);
  const bride = cast.diagnostics.cast.find(entry => entry.stop === "bride");
  assert.equal(bride.actor, "haunted-girl"); assert.ok(bride.lunge > .9); assert.ok(bride.offset < 3);
  const jump = cast.lunge(); assert.ok(jump.point.toArray().every(Number.isFinite) && jump.weight > .9 && jump.aim > .9 && jump.stop === "bride");
  // A little before her spot the camera has already found her, though she hasn't sprung.
  cast.tick({ progress: springs - hayrideSpan(2.2), time: 30, camera: { x: -32, y: 2, z: 15 } });
  const ready = cast.lunge(); assert.ok(ready && ready.aim > .9 && ready.weight < .05);
  cast.tick({ progress: springs, time: 30, camera: { x: -32, y: 2, z: 15 } });
  cast.group.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
  cast.tick({ progress: springs, gentle: true });
  assert.equal(cast.diagnostics.cast.find(entry => entry.stop === "bride").lunge, 0);
  cast.tick({ progress: 0 }); assert.equal(cast.diagnostics.visible, 0); assert.equal(cast.lunge(), null);
  assert.equal(JSON.stringify(state), before);
  cast.dispose(); cast.dispose(); assert.equal(cast.group.children.length, 0); assert.equal(cast.diagnostics.disposed, true);
  const replay = createHayrideScares({ state }); replay.tick({ progress: springs });
  assert.equal(replay.diagnostics.visible, 1); replay.dispose();
});

test("each sprite scare waits across the lane from its set, and springs only once the set's animatronics have played", () => {
  const cast = createHayrideScares({ state: { hayride: { tier: 1, haunts: { owned: [], active: [] } } } });
  for (const stop of HAYRIDE_STOPS.filter(stop => HAYRIDE_JUMP.stops.includes(stop.id))) {
    const offset = stop.id === "bride" ? 6.1 : stop.id === "bus" ? 5.4 : 4.1, frame = hayrideRouteSample(stop.at * HAYRIDE_ROUTE_LENGTH), set = { x: frame.x + frame.dz * offset, z: frame.z - frame.dx * offset };
    // While the set plays, the wagon level with it, its sprite neither shows nor springs.
    for (const shift of [-2, 0, 2]) {
      cast.tick({ progress: stop.at + hayrideSpan(shift) });
      const entry = cast.diagnostics.cast.find(entry => entry.stop === stop.id);
      assert.equal(entry.lunge, 0, `${stop.id} waits while its set plays (${shift})`);
    }
    // Then it springs, from the far side of the lane, well clear of the set and never into the lane.
    cast.tick({ progress: hayrideJumpSpot(stop).at + hayrideSpan(1.2) });
    const entry = cast.diagnostics.cast.find(entry => entry.stop === stop.id), side = (x, z) => (x - frame.x) * frame.dz - (z - frame.z) * frame.dx;
    assert.ok(entry.lunge > .9, `${stop.id} springs`);
    assert.ok(Math.sign(side(entry.x, entry.z)) === -Math.sign(side(set.x, set.z)), `${stop.id} across the lane`);
    assert.ok(Math.hypot(entry.x - set.x, entry.z - set.z) > 7, `${stop.id} clear of its set`);
    assert.ok(hayrideRouteDistance(entry.x, entry.z) > 2.4, `${stop.id} off the lane`);
  }
  cast.dispose();
});
