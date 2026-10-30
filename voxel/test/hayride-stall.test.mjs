import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideView } from "../src/hayride-view.js";
import { STALL, STALL_CUES, ENGINE, JINGLE, BLINKS, engineAt, stallAlong, stallLamps, stallBlink, hollowManPlace, createHollowMan, poseHollowMan } from "../src/hayride-stall.js";
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

test("pitch dark but for his face and the starter's brown-outs; his face flickers with the music box; the camera blinks", () => {
  assert.equal(stallLamps(null), null); assert.equal(stallLamps(-5), null); assert.equal(stallLamps(STALL.hold + 5), null);
  for (const t of [.5, 3, 8, STALL.hush + .5, STALL.stretch + .3, STALL.reveal + .3]) { const l = stallLamps(t); assert.ok(l.head === 0 && l.lanterns === 0 && l.wagon === 0 && l.sky < .1 && l.dark === 1, `dark at ${t}`); }
  assert.ok(stallLamps(6.4).head > 0 && stallLamps(10.8).head > 0 && stallLamps(10.8).head < .3, "faint brown-outs as the starter turns");
  assert.ok(stallLamps(STALL.hold + .1).head > 1.5, "the headlamp bursts on as the engine catches");
  // The tune is ten seconds and winds down; his face flares on each note and gutters between.
  assert.equal(JINGLE.length, 22); assert.ok(JINGLE.at(-1).t < STALL.hush - STALL.jingle);
  const gaps = JINGLE.slice(1).map((n, i) => n.t - JINGLE[i].t); assert.ok(gaps.at(-1) > gaps[0] * 1.5, "running down");
  for (const i of [3, 9, 15]) {
    const on = hollowManPlace(STALL.jingle + JINGLE[i].t + .02, 100, 94.5), off = hollowManPlace(STALL.jingle + JINGLE[i + 1].t - .02, 100, 94.5);
    assert.ok(on.glow > 1 && on.light > .6 && off.glow < on.glow * .6, `note ${i} lights his face`);
  }
  assert.ok(gaps.every((g) => g > .33), "under three flickers a second");
  // Blinks: shut on each, open between; the long one in the hush covers his climb onto the roof.
  for (const b of BLINKS) assert.equal(stallBlink(b.t + .02), 1);
  assert.equal(stallBlink(5), 0); assert.equal(stallBlink(STALL.climb), 1, "eyes shut as he climbs");
});
test("he skulks round the wagon in the dark, climbs onto the tractor's roof, stretches until his face is in yours, then the chase", () => {
  const stop = 100, rider0 = stop - STALL.bench, at = (t, rider = rider0) => hollowManPlace(t, stop, rider);
  assert.deepEqual([1, 3, 6, 13, STALL.hush + .4, STALL.climb + .5, STALL.stretch + .6, STALL.reveal + .5].map((t) => at(t)?.mode ?? null), [null, "stalk", "skulk", "skulk", "perch", "perch", "stretch", "face"]);
  // Round the tractor and the wagon, never through them.
  const angles = [];
  for (let t = STALL.jingle; t < STALL.hush; t += .1) { const p = at(t); assert.ok(!(p.along > stop - 6.4 && p.along < stop + 3.4 && Math.abs(p.side) < 1.5), `clear of the wagon at ${t.toFixed(1)}`); angles.push(Math.atan2(p.side, p.along - stop + 2.4)); }
  assert.ok(new Set(angles.map((a) => Math.round(a * 2))).size >= 10, "all the way round");
  // In the hush he's on the roof, unseen; he's lit as he climbs; he stretches all the way to you.
  assert.ok(at(STALL.hush + .4).perch && at(STALL.hush + .4).glow === 0 && at(STALL.hush + .4).y === STALL.roof);
  assert.ok(at(STALL.climb + .8).glow > .4);
  assert.ok(at(STALL.stretch + .1).reach < .1 && at(STALL.reveal - .05).reach > .95 && at(STALL.reveal + .5).reach === 1);
  for (const t of [STALL.stretch + .3, STALL.reveal + .3]) assert.equal(at(t).gaze, 1);
  assert.ok(!at(STALL.reveal).open && at(STALL.reveal + .8).open === 1, "his face splits open once it's in yours");
  assert.equal(at(5).gaze < .6, true, "the camera only half turns to find him while he skulks");
  // Frantic: zig-zagging across the lane behind the rider, lunging close, then falling back to howl.
  const chase = []; for (let u = 0; u < 6; u += .05) chase.push(at(STALL.hold + u, rider0 + u * 2));
  assert.ok(chase.every((p) => p.mode === "run" && p.frantic && p.along < rider0 + 12));
  const sides = chase.map((p) => p.side), gaps = chase.map((p, i) => rider0 + i * .1 - p.along);
  assert.ok(Math.max(...sides) > 1 && Math.min(...sides) < -1, "across the lane and back");
  assert.ok(Math.min(...gaps) < 2.4 && Math.max(...gaps) > 4.5, "lunging close, then back");
  assert.ok(Math.min(...gaps) > 1.95, "but never into the rider");
  assert.equal(stallBlink(STALL.hold), 1, "your eyes are shut as he's flung off the roof");
  assert.equal(at(25, rider0 + STALL.chase + 2).mode, "howl"); assert.equal(at(28, rider0 + STALL.gone + 1), null);
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
  assert.ok(at(STALL.reveal + .3).fire < 8 && at(STALL.reveal + .3).level > 0, "the starter grinds under him as he's in your face");
  const roar = at(STALL.hold + .6), settled = at(STALL.hold + 6), plain = engineAt(.8, null);
  assert.ok(roar.fire > 38 && roar.level > 1.1, "it catches with a roar");
  assert.ok(Math.abs(settled.fire - plain.fire) < 1 && Math.abs(settled.level - plain.level) < .05 && settled.rough < .01, "and settles to the wagon's pace");
  assert.deepEqual(at(STALL.hold + 11), plain);
});

test("the Hollow Man is one fine jointed rig: he keeps his feet in every pose, stretches to reach, and his face burns", () => {
  const man = createHollowMan(), v = new THREE.Vector3(), head = new THREE.Vector3(), hips = new THREE.Vector3(), feet = new THREE.Vector3();
  const [body, face] = man.group.children;
  assert.ok(body.count > 250 && face.count >= 20, `${body.count} body blocks, ${face.count} burning`);
  for (const mode of ["stalk", "skulk", "perch", "run", "howl"]) for (const k of [0, .5, 1]) {
    poseHollowMan(man.rig, 1.7 + k, mode, k, mode === "run" ? { lunge: k } : null); man.sync(1);
    man.rig.head.getWorldPosition(head); man.rig.hips.getWorldPosition(hips); man.rig.legs[0].knee.localToWorld(feet.set(0, -.96, 0));
    assert.ok([head, hips, feet].every((p) => p.toArray().every(Number.isFinite)));
    assert.ok(head.y > hips.y, `${mode} ${k}: head above his hips`); assert.ok(feet.y > -.15 && feet.y < .5, `${mode} ${k}: on his feet (${feet.y.toFixed(2)})`);
  }
  // On the roof he stretches: his face lands where it's aimed, five units off, and his hands on the wagon's sides.
  man.rig.root.position.set(0, STALL.roof, 0); man.rig.root.updateMatrixWorld(true);
  const aim = { head: new THREE.Vector3(0, 2, 5), hands: [new THREE.Vector3(1.3, 1.2, 4), new THREE.Vector3(-1.3, 1.2, 4)] };
  poseHollowMan(man.rig, 2, "face", .3, aim); man.sync(1);
  man.rig.head.localToWorld(v.set(0, .38, .3));
  assert.ok(v.distanceTo(aim.head) < .7, `his face reaches you (${v.distanceTo(aim.head).toFixed(2)} off)`);
  man.rig.arms.forEach((a, i) => { a.wrist.getWorldPosition(v); assert.ok(v.distanceTo(aim.hands[i]) < .5, `hand ${i} on the wagon's side`); });
  assert.ok(man.rig.torso.scale.y > 2, "a body stretched far longer than a man's");
  // His face splits open: every petal swings out, and the maw's glowing flesh and teeth are there behind it.
  const tips = (open) => { poseHollowMan(man.rig, 2, "face", .3, { ...aim, open }); man.sync(1); return man.rig.petals.map((p) => p.counter.localToWorld(new THREE.Vector3(0, 0, .1))); };
  const shut = tips(0), opened = tips(1);
  assert.ok(opened.every((p, i) => p.distanceTo(shut[i]) > .15), "all five petals peel back");
  assert.ok(face.count > 100, `${face.count} glowing blocks: the carving, the flesh and the teeth`);
  man.dispose();
});
