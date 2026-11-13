import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRiders } from "../src/hayride-riders.js";
import { buildHayrideVehicle, HAYRIDE_VEHICLE } from "../src/hayride-vehicle.js";

const ride = (capacity = 8) => {
  const scene = new THREE.Scene(), vehicle = buildHayrideVehicle({ capacity }); scene.add(vehicle.group);
  const riders = createRiders({ wagon: vehicle.wagon, seats: vehicle.seatAnchors, eye: vehicle.cameraAnchor, scene });
  return { scene, vehicle, riders };
};

test("passengers fill the benches well ahead of the rider's eye, facing the aisle", () => {
  for (const [capacity, count] of [[4, 2], [6, 4], [8, 4]]) {
    const { vehicle, riders } = ride(capacity);
    assert.equal(riders.people.length, count, `${capacity} seats`);
    for (const p of riders.people) {
      assert.ok(p.root.position.z < HAYRIDE_VEHICLE.rearCamera[2] - 1.6, "nobody sits under the rider's nose");
      const facing = new THREE.Vector3(0, 0, 1).applyEuler(p.root.rotation);
      assert.ok(facing.x * -Math.sign(p.root.position.x) > 0.99, "each faces the aisle");
    }
    assert.equal(new Set(riders.people.map((p) => p.look.id)).size, count, "no two alike");
    riders.dispose(); vehicle.dispose();
  }
});

test("passengers jump at a scare and settle; gentle mode keeps them calm", () => {
  const { riders } = ride(), arm = () => riders.people.map((p) => p.arms[0].shoulder.rotation.x);
  riders.tick({ time: 10, d: 4 }); const rest = arm();
  riders.fright(10); riders.tick({ time: 10.6, d: 4 }); const scared = arm();
  assert.ok(scared.every((a, i) => a < rest[i] - 0.3), "arms fly up");
  riders.tick({ time: 18, d: 4 }); assert.ok(arm().every((a, i) => Math.abs(a - rest[i]) < 0.05), "and come back down");
  riders.fright(20); riders.tick({ time: 20.6, d: 4, gentle: true }); assert.deepEqual(arm(), rest, "gentle riders stay still");
});

test("passengers turn to look at a scene as it comes level", () => {
  const { riders, vehicle } = ride(); vehicle.group.updateMatrixWorld(true);
  const scene = new THREE.Vector3(-8, 1.4, -10);                                  // ahead on the left
  const facing = (p) => {
    const eye = p.head.getWorldPosition(new THREE.Vector3()), dir = new THREE.Vector3(0, 0, 1).applyQuaternion(p.head.getWorldQuaternion(new THREE.Quaternion()));
    return dir.setY(0).normalize().dot(scene.clone().sub(eye).setY(0).normalize());
  };
  riders.tick({ time: 1, d: 0 }); const before = riders.people.map(facing);
  riders.tick({ time: 1, d: 0, look: scene, weight: 1 }); const after = riders.people.map(facing);
  for (const [i, p] of riders.people.entries()) assert.ok(after[i] > 0.95 || after[i] > before[i] + 0.5, `${p.look.id} turns towards it (${before[i].toFixed(2)} to ${after[i].toFixed(2)})`);
});
