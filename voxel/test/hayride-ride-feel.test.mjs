import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideView, hayridePace, rootJolt, hayrideRoots, AXLES, RUT_GAP, LIGHTS_OUT } from "../src/hayride-view.js";
import { buildRideHill } from "../src/hayride-station.js";
import { createMoonShafts } from "../src/hayride-moonlight.js";
import { Voxels, seeded } from "../src/voxels.js";
import { HAYRIDE_RIDE_HILL, hayrideRouteProfile, hayrideRouteSample, hayrideRouteDistance, hayrideUnderHill } from "../src/content/hayride-layout.js";

test("the wagon creeps past each scene and picks up speed between, in the same time", () => {
  const { stops, length } = hayrideRouteProfile(0), pace = hayridePace(stops, length), dt = 1e-3;
  assert.equal(pace(0), 0); assert.equal(pace(1), 1);
  let last = 0; for (let f = 0.001; f < 1; f += 0.001) { const p = pace(f); assert.ok(p >= last, "never runs backwards"); last = p; }
  const speedAt = (p) => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (pace(mid) < p) lo = mid; else hi = mid; } return (pace(lo + dt) - pace(lo)) / dt; };
  for (let i = 1; i < stops.length; i++) {
    const at = stops[i].at, between = (stops[i - 1].at + at) / 2;
    assert.ok(speedAt(at) < speedAt(between) * 0.6, `slows for ${stops[i].id}`);
  }
});

test("each root jolts the wagon twice, front axle then rear, and only where roots lie", () => {
  const length = hayrideRouteProfile(0).length, roots = hayrideRoots(length);
  assert.equal(rootJolt(0, length), 0); assert.equal(rootJolt(RUT_GAP * 0.5, length), 0);
  for (let k = 1; k <= roots; k++) for (const axle of AXLES) assert.ok(rootJolt(k * RUT_GAP + axle.behind + 0.2, length) > 0.4 * axle.weight, `root ${k}`);
  assert.equal(rootJolt((roots + 1) * RUT_GAP + AXLES[1].behind + 0.2, length), 0, "no root past the last");
});

test("a full ride rumbles into the hill, thuds over every root and fails its lamps twice", () => {
  const scene = new THREE.Scene(), cues = [], canvas = { clientWidth: 1000, clientHeight: 700, addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {} };
  const state = { coins: 0, hayride: { purchased: true, tier: 2, open: true, convoy: { progress: 0 } }, visitors: [] };
  const world = { scene, setPreview() {}, setGentleMotion() {}, getPreviewFrame: (p) => ({ position: new THREE.Vector3(p * 10, 2.7, 18), target: new THREE.Vector3(p * 10, 2.1, 9), yaw: 0 }) };
  const view = createHayrideView(canvas, state, { world, onCue: (cue) => cues.push(cue) });
  view.enter({ gentle: false }); for (let i = 0; i < 4000 && !view.status.completed; i++) view.advanceForTest(0.05);
  const of = (type) => cues.filter((c) => c.type === type), length = hayrideRouteProfile(0).length;
  assert.equal(of("encounter").length, 5);
  assert.deepEqual(of("lights").map((c) => c.scene), LIGHTS_OUT.stops);
  assert.equal(of("tunnel").length, 1);
  assert.equal(of("bump").length, hayrideRoots(length) * AXLES.length);
  assert.equal(new Set(cues.map((c) => c.id)).size, cues.length, "each cue fires once");
  view.dispose();
});

// The wagon's space along the lane: rails and wheels to 2.15 within 1.45 of the
// lane's middle, riders' hats to 2.8 within 1.15, the tractor's canopy to 3.35 within 1.05.
const inWay = (lateral, bottom) => (lateral < 1.45 && bottom < 2.15) || (lateral < 1.15 && bottom < 2.8) || (lateral < 1.05 && bottom < 3.35);
test("the ride's hill lets the whole convoy through its bore", () => {
  const start = Array.from({ length: 141 }, (_, i) => hayrideRouteSample(i * 0.1, 0)), laneX = (z) => start.reduce((b, p) => (Math.abs(p.z - z) < Math.abs(b.z - z) ? p : b)).x;
  const v = new Voxels(), out = buildRideHill(v, seeded(5521), laneX), { z0, z1 } = HAYRIDE_RIDE_HILL;
  assert.ok(v.solid.length > 1500, "the hill is built"); assert.ok(out.glows.length >= 5); assert.ok(out.sign.y > 3.5);
  for (const [x, y, z, w, h, d] of [...v.solid, ...v.glow]) {
    if (z + d / 2 < z0 - 1.2 || z - d / 2 > z1 + 1.2) continue;
    assert.ok(!inWay(Math.abs(x - laneX(z)) - w / 2, y - h / 2), `a box at ${[x, y, z].map((n) => n.toFixed(2))} is in the wagon's way`);
  }
  assert.equal(hayrideUnderHill(laneX(20), 20), 1); assert.equal(hayrideUnderHill(laneX(30), 30), 0);
});

test("moonlight falls beside the lane, never across it", () => {
  const profile = hayrideRouteProfile(2), moon = createMoonShafts({ sample: (d) => hayrideRouteSample(d, 2), length: profile.length, lane: (x, z) => hayrideRouteDistance(x, z, 2), r: seeded(7213) });
  assert.ok(moon.spots.length >= 10);
  for (const s of moon.spots) assert.ok(hayrideRouteDistance(s.x, s.z, 2) > 3.4, `a shaft at ${s.x.toFixed(1)}, ${s.z.toFixed(1)} is on the lane`);
  moon.tick(3); moon.dispose();
});
