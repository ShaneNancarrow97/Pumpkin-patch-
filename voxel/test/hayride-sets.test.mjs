import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildRoadsideSet } from "../src/hayride-sets.js";
import { Voxels, seeded } from "../src/voxels.js";
import { hayrideRouteProfile } from "../src/content/hayride-layout.js";

// The wagon's space beside a set, in the set's frame (the lane runs along x at
// z = offset): its rails and wheels up to 2.15 within 1.45 of the lane's
// middle, and the tractor's canopy up to 3.3 within 1.05.
const intrudes = (offset, [x, y, z, w, h, d]) => {
  const near = Math.abs(z - offset) - d / 2, bottom = y - h / 2;
  return (near < 1.45 && bottom < 2.15) || (near < 1.05 && bottom < 3.3);
};
const boxesOf = (brood) => {
  const out = [], p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), corner = new THREE.Vector3();
  for (const rig of brood.spiders) {
    rig.root.updateMatrixWorld(true);
    for (const sh of rig.shapes) {
      // The world-space bounds of each rotated box, from its eight corners.
      sh.o.matrixWorld.decompose(p, q, s); const box = new THREE.Box3();
      for (const cx of [-0.5, 0.5]) for (const cy of [-0.5, 0.5]) for (const cz of [-0.5, 0.5]) box.expandByPoint(corner.set(cx, cy, cz).applyMatrix4(sh.o.matrixWorld));
      const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()); out.push([c.x, c.y, c.z, size.x, size.y, size.z]);
    }
  }
  return out;
};

test("the graveyard and the thicket keep out of the wagon's way, actors and all", () => {
  const stops = hayrideRouteProfile(2).stops;
  for (const id of ["graveyard", "thicket"]) {
    const offset = stops.find((s) => s.id === id).offset, v = new Voxels(), group = new THREE.Group(), set = buildRoadsideSet(id, v, group, seeded(9));
    for (const b of [...v.solid, ...v.glow]) assert.ok(!intrudes(offset, b), `${id} dressing at ${b.slice(0, 3).map((n) => n.toFixed(2))} is in the wagon's way`);
    for (let t = 0; t < 12; t += 0.37) for (const ramp of [0.3, 1]) {
      for (const a of set.actors) a.animate?.({ time: t, near: true, ramp, wave: 1, on: true, camera: new THREE.Vector3(t - 6, 2.7, offset), forward: new THREE.Vector3(1, 0, 0), set: { group } });
      for (const b of boxesOf(set.brood)) assert.ok(!intrudes(offset, b), `${id} actor at ${b.slice(0, 3).map((n) => n.toFixed(2))} reaches the wagon (t ${t.toFixed(2)})`);
    }
    set.brood.dispose();
  }
});

test("the new scenes come alive only when their haunt is on and the wagon is near", () => {
  for (const id of ["graveyard", "thicket"]) {
    const group = new THREE.Group(), set = buildRoadsideSet(id, new Voxels(), group, seeded(9)), pose = () => JSON.stringify(boxesOf(set.brood).map((b) => b.map((n) => n.toFixed(3))));
    const ctx = (on, near, time) => ({ time, near, ramp: near ? 1 : 0, wave: 0, on, camera: new THREE.Vector3(0, 2.7, 5), forward: new THREE.Vector3(1, 0, 0), set: { group } });
    for (const a of set.actors) a.animate?.(ctx(false, false, 3)); const idle = pose();
    for (const a of set.actors) a.animate?.(ctx(true, true, 3)); const alive = pose();
    assert.notEqual(alive, idle, `${id} moves when it springs`);
    set.brood.dispose();
  }
});
