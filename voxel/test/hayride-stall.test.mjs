import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideView } from "../src/hayride-view.js";
import { STALL, STALL_CUES, ENGINE, engineAt, stallAlong, stallLamps, hollowManPlace, createHollowMan, poseHollowMan } from "../src/hayride-stall.js";
import { HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH } from "../src/content/hayride-layout.js";
import { HAYRIDE_SCARE_BY_ID } from "../src/content/hayride.js";

// A ride with the Hollow Man bought (or not), through a stand-in world that records the breakdown's clock.
function ride({ owned = true, active = true, gentle = false, tier = 1 } = {}) {
  const scene = new THREE.Scene(), stalls = [];
  const canvas = { clientWidth: 1000, clientHeight: 700, addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {} };
  const state = { hayride: { purchased: true, tier, routeLevel: 0, haunts: { owned: owned ? ["hollow-man"] : [], active: owned && active ? ["hollow-man"] : [] } } };
  const world = { scene, setPreview() {}, setGentleMotion() {}, setStall(t) { stalls.push(t); }, getPreviewFrame(p) { return { position: new THREE.Vector3(p * 10, 2, 18), target: new THREE.Vector3(p * 10, 2, 10), yaw: 0 }; } };
  const cues = [], view = createHayrideView(canvas, state, { world, onCue: (cue) => cues.push(cue) });
  view.enter({ gentle });
  return { view, cues, stalls };
}
const run = (view, seconds, step = .1) => { const seen = []; for (let t = 0; t < seconds; t += step) seen.push(view.advanceForTest(step)); return seen; };

test("the Hollow Man is a tier-one scare, and the tractor dies in the deep wood between the manor and the pursuit", () => {
  const p = HAYRIDE_SCARE_BY_ID["hollow-man"];
  assert.ok(p && p.tier === 1 && p.cost > 0 && p.scare > 0);
  const bride = HAYRIDE_STOPS.find((s) => s.id === "bride"), pursuit = HAYRIDE_STOPS.find((s) => s.id === "pursuit");
  const along = stallAlong(HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH);
  assert.ok(along > bride.at * HAYRIDE_ROUTE_LENGTH + 8 && along < pursuit.at * HAYRIDE_ROUTE_LENGTH - 18, "well clear of the manor, and further from the pursuit");
});

test("bought and switched on, the wagon stands still in the dark, he's revealed, it roars away and the ride runs that much longer", () => {
  const { view, cues, stalls } = ride(), plain = ride({ owned: false });
  assert.equal(view.status.duration, plain.view.status.duration + STALL.hold);
  const frames = run(view, view.status.duration + 1);
  const stopped = frames.filter((f) => Number.isFinite(f.stall) && f.stall > .05 && f.stall < STALL.hold - .05);
  assert.ok(stopped.length > 80, "about 9.6 s of frames standing still");
  assert.ok(stopped.every((f) => f.progress === stopped[0].progress), "the wagon doesn't move while the engine's dead");
  // Every beat once, in order, with the reveal an encounter.
  const beats = cues.filter((c) => c.type === "stall" || c.stop === "hollow").map((c) => c.id.replace("hayride-", ""));
  assert.deepEqual(beats, STALL_CUES.map((b) => b.encounter ? "hollow" : b.id));
  assert.ok(frames.at(-1).eventsFired.includes("hollow") && frames.at(-1).eventsFired.length === 6);
  assert.ok(stalls.some((t) => t > STALL.reveal) && stalls.some((t) => t < 0), "the world hears the breakdown's clock before and after");
  // The photo waits for the reveal, then for its own frame.
  const reveal = frames.find((f) => f.stall >= STALL.reveal);
  assert.ok(reveal); assert.equal(frames.at(-1).completed, true);
  // The engine's dead while the wagon stands, and roars as it pulls away.
  assert.ok(stopped.some((f) => f.engine.level === 0) && frames.some((f) => f.stall > STALL.hold && f.engine.level > 1.1));
  assert.ok(stopped.filter((f) => f.stall > .2).every((f) => f.pace < 1e-9), "standing still"); assert.ok(frames.at(-30).pace > .1, "rolling into the station");
  // Tension rises in the dark and is highest just before he's caught in the light.
  const dark = frames.filter((f) => f.stall > 1 && f.stall < STALL.reveal).map((f) => f.tension);
  assert.ok(dark.every((t) => t >= .6) && Math.max(...dark) > .95);
});

test("switched off, unbought, or in gentle mode, the ride is as before", () => {
  for (const options of [{ owned: false }, { active: false }, { gentle: true }]) {
    const { view, cues } = ride(options);
    const end = run(view, view.status.duration + 1).at(-1);
    assert.equal(cues.some((c) => c.type === "stall" || c.stop === "hollow"), false, JSON.stringify(options));
    assert.equal(end.eventsFired.length, 5); assert.equal(end.stall, null);
  }
});

test("his lamps, his place and the camera's gaze follow the breakdown's clock", () => {
  assert.equal(stallLamps(null), null); assert.equal(stallLamps(-5), null); assert.equal(stallLamps(14), null);
  const dark = [.5, 2, 4, 5, 6.5, 8].map(stallLamps);
  assert.ok(dark.every((l) => l.lanterns === 0 && l.head === 0), "out in the dark (between the flickers)");
  assert.ok(stallLamps(6).head > 0 && stallLamps(7.2).head > 0 && stallLamps(7.2).head < .3, "faint flickers as the starter turns");
  assert.ok([.5, 4, STALL.reveal + .2].every((t) => stallLamps(t).sky < .1 && stallLamps(t).dark === 1), "real dark: the moon and the fog all but black");
  assert.equal(stallLamps(STALL.reveal + .2).head, 0, "his own face reveals him");
  assert.ok(stallLamps(STALL.hold + .1).head > 1.5, "and the headlamp bursts on as the engine catches");
  assert.equal(stallLamps(12.99).head > .99, true);
  // He circles in the trees, stands far down the lane, is revealed beside the tractor, reaches as the wagon comes past,
  // chases it from behind, howls after it, and is gone, by how far the wagon has gone.
  const stop = 100, rider0 = stop - 5.5, spot = stop + STALL.ahead;
  const at = (t, rider = rider0) => hollowManPlace(t, stop, rider)?.mode ?? null;
  assert.deepEqual([1, 3, 6.5, 7.5, 8.6].map((t) => at(t)), [null, "stalk", null, "lurk", "reveal"]);
  assert.equal(at(10, spot - 3), "reach"); assert.equal(at(12, spot + 4), "run"); assert.equal(at(16, spot + STALL.chase + 3), "howl"); assert.equal(at(18, spot + STALL.gone + 1), null);
  assert.ok(hollowManPlace(3, stop, rider0).side > 5, "the walk round is in the trees");
  const reveal = hollowManPlace(STALL.reveal + .1, stop, rider0);
  assert.equal(reveal.along, spot); assert.equal(reveal.side, STALL.side); assert.ok(reveal.light > .9);
  // His jack-o'-lantern face smoulders in the dark, then catches light, flaring as the flame takes, and blazes.
  const glow = (t) => hollowManPlace(t, stop, rider0).glow;
  assert.ok(glow(3) < .2 && glow(7.5) < .3 && glow(STALL.reveal - .01) < .3, "only embers before the reveal");
  assert.ok(glow(STALL.reveal + .2) > 2 && glow(STALL.reveal + .2) > glow(STALL.hold - .1) && glow(STALL.hold - .1) > 1.4, "a flare, then a steady blaze");
  for (let passed = 0; passed < STALL.chase; passed += 2) { const p = hollowManPlace(12, stop, spot + passed); assert.ok(p.along <= spot + passed - 1.2, "he chases from behind"); assert.equal(p.gaze, 1); }
  assert.equal(hollowManPlace(5, stop, rider0).gaze, 0, "the camera leaves you to find him in the trees");
  assert.ok(hollowManPlace(17, stop, spot + STALL.gone - .5).gaze < .05, "and turns ahead again as he falls behind");
});

test("the tractor idles standing, revs with the wagon, and through the breakdown dies, won't start twice, then roars", () => {
  assert.deepEqual(engineAt(0, null), { fire: ENGINE.idle, level: .75, rough: 0 });
  const paces = [0, .5, 1, 1.5, 2.5].map((p) => engineAt(p, null).fire);
  assert.ok(paces.every((f, i) => !i || f >= paces[i - 1]) && paces.at(-1) <= 40, `revs with the wagon's pace: ${paces}`);
  const at = (t) => engineAt(.8, t);
  assert.equal(at(-3).rough, 0); assert.ok(at(-1).rough > at(-2).rough && at(-.1).rough > .4, "it coughs harder as the wagon slows");
  assert.ok(at(.5).fire < at(.1).fire && at(1.5).level < .4, "it chugs down"); assert.equal(at(3).level, 0, "and dies");
  const cranks = STALL_CUES.filter((c) => c.sound === "ignition" || c.sound === "crank");
  assert.equal(cranks.length, 3);
  for (const [i, c] of cranks.entries()) {
    const turning = at(c.t + .5); assert.ok(turning.level > 0 && turning.fire < 8, `the starter turns it over slowly (${c.id})`);
    if (i < 2) { assert.ok(at(c.t + 1.05).fire > 10, "it fires once..."); assert.equal(at(c.t + 1.25).level, 0, "...and dies again"); }
  }
  const roar = at(STALL.hold + .6), settled = at(STALL.hold + 6), plain = engineAt(.8, null);
  assert.ok(roar.fire > 38 && roar.level > 1.1, "it catches with a roar");
  assert.ok(Math.abs(settled.fire - plain.fire) < 1 && Math.abs(settled.level - plain.level) < .05 && settled.rough < .01, "and settles to the wagon's pace");
  assert.deepEqual(at(20), plain);
});

test("the Hollow Man is one jointed rig, every pose keeps him on his feet and his face burns", () => {
  const man = createHollowMan(), feet = new THREE.Vector3(), head = new THREE.Vector3();
  for (const mode of ["stalk", "lurk", "reveal", "reach", "run", "howl"]) for (const k of [0, .5, 1]) {
    poseHollowMan(man.rig, 1.7, mode, k); man.sync(1); man.rig.root.updateMatrixWorld(true);
    man.rig.legs[0].knee.getWorldPosition(feet); man.rig.head.getWorldPosition(head);
    assert.ok(head.y > 2.3, `${mode} ${k}: head up at ${head.y.toFixed(2)}`); assert.ok(feet.y > .2 && feet.y < 1.2, `${mode} ${k}: knees above the ground`);
  }
  const [body, face] = man.group.children;
  assert.ok(body.count > 60 && face.count > 10, `${body.count} body blocks, ${face.count} burning`);
  man.dispose();
});
