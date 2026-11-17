import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HAYRIDE_VEHICLE, hayrideSeatAnchors, hayrideVehicleGeometry, buildHayrideVehicle } from "../src/hayride-vehicle.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} near ${b}`);
const allFinite = object => {
  object.updateMatrixWorld(true);
  object.traverse(child => assert.ok(child.matrixWorld.elements.every(Number.isFinite), child.name));
};

test("all three capacities have finite positive native boxes and fixed clearances", () => {
  for (const capacity of [4, 6, 8]) {
    const parts = hayrideVehicleGeometry({ capacity }), names = new Set();
    for (const part of parts) {
      assert.equal(names.has(part.name), false); if (part.parent) assert.ok(names.has(part.parent)); names.add(part.name);
      assert.ok(part.origin.every(Number.isFinite));
      for (const box of part.boxes) {
        assert.ok(box.slice(0, 7).every(Number.isFinite), part.name);
        assert.ok(box.slice(3, 6).every(n => n > 0), part.name);
      }
    }
    const model = buildHayrideVehicle({ capacity, shadows: false });
    assert.equal(model.diagnostics.seats, capacity); assert.equal(model.diagnostics.wheels, 8);
    assert.ok(model.diagnostics.boxes < 1300);
    model.setBoarding(true);
    for (const [name, body] of [["tractor", model.tractor], ["wagon", model.wagon]]) {
      const bounds = new THREE.Box3().setFromObject(body), offset = body.position;
      for (const axis of ["x", "y", "z"]) {
        // Instanced transforms are Float32 GPU data even in the native test.
        assert.ok(bounds.min[axis] - offset[axis] >= HAYRIDE_VEHICLE[`${name}Envelope`][axis][0] - 1e-6, `${name} ${axis} minimum`);
        assert.ok(bounds.max[axis] - offset[axis] <= HAYRIDE_VEHICLE[`${name}Envelope`][axis][1] + 1e-6, `${name} ${axis} maximum`);
      }
    }
    model.dispose();
  }
});

test("seat upgrades use unique mounts on actual benches and preserve the rear aisle", () => {
  for (const capacity of [4, 6, 8]) {
    const seats = hayrideSeatAnchors(capacity);
    assert.equal(seats.length, capacity); assert.equal(new Set(seats.map(s => s.id)).size, capacity);
    for (const seat of seats) {
      assert.equal(Math.abs(seat.position[0]), .87);
      assert.equal(seat.position[1], 1.2); assert.ok(Math.abs(seat.position[2]) <= 1.17);
      near(Math.abs(seat.yaw), Math.PI / 2);
    }
    const bySide = [seats.filter(s => s.position[0] < 0), seats.filter(s => s.position[0] > 0)];
    for (const side of bySide) for (let i = 1; i < side.length; i++) assert.ok(side[i].position[2] - side[i - 1].position[2] >= .77);
  }
  assert.equal(hayrideSeatAnchors(999).length, 4);
});

test("independent route headings keep both physical hitches joined", () => {
  const model = buildHayrideVehicle({ shadows: false });
  for (const [tractorYaw, wagonYaw] of [[0, 0], [.6, .25], [-.5, -.8], [Math.PI, Math.PI * .9]]) {
    model.setPose({ tractor: { x: 12, y: .4, z: 8, yaw: tractorYaw }, wagon: { x: 1, y: 0, z: 2, yaw: wagonYaw } });
    const a = model.tractor.localToWorld(new THREE.Vector3(...HAYRIDE_VEHICLE.tractorRearHitch));
    const b = model.wagon.localToWorld(new THREE.Vector3(...HAYRIDE_VEHICLE.wagonFrontHitch));
    near(a.distanceTo(b), 0); near(model.tractor.rotation.y, tractorYaw); near(model.wagon.rotation.y, wagonYaw);
  }
  model.setPose({ tractor: { x: 1 }, wagon: { x: 9, z: 5 }, alignHitch: false });
  near(model.wagon.position.x, 9); near(model.wagon.position.z, 5);
  model.setPose({ tractor: { x: NaN, y: Infinity, z: -Infinity, yaw: NaN }, wagon: null });
  model.setPose(null); allFinite(model.group); model.dispose();
});

test("gate, steps, steering and every rolling wheel are independent visual controls", () => {
  const model = buildHayrideVehicle({ shadows: false }), gate = model.groups.get("rear-gate"), steps = model.groups.get("boarding-steps");
  assert.equal(steps.visible, false); near(gate.rotation.y, 0);
  model.setBoarding(true); assert.equal(steps.visible, true); near(gate.rotation.y, -Math.PI / 2);
  model.setBoarding(false); assert.equal(steps.visible, false); near(gate.rotation.y, 0);
  model.setRollDistance(4.2);
  for (const wheel of model.wheelGroups) near(wheel.group.rotation.x, -4.2 / wheel.radius);
  model.setSteering(20);
  for (const side of [-1, 1]) near(model.groups.get(`front-steer-${side}`).rotation.y, .5);
  model.setRollDistance(NaN); model.setSteering(Infinity); allFinite(model.group); model.dispose();
});

test("disposing a convoy twice releases only its instances and materials", () => {
  const first = buildHayrideVehicle({ shadows: false }), meshes = [];
  first.group.traverse(o => { if (o.isInstancedMesh) meshes.push(o); });
  const cube = meshes[0].geometry; let disposedCube = 0, disposedInstances = 0, disposedMaterials = 0;
  cube.addEventListener("dispose", () => disposedCube++);
  for (const mesh of meshes) {
    mesh.addEventListener("dispose", () => disposedInstances++);
    mesh.material.addEventListener("dispose", () => disposedMaterials++);
  }
  first.dispose(); first.dispose();
  assert.equal(disposedCube, 0); assert.equal(disposedInstances, meshes.length); assert.equal(disposedMaterials, meshes.length);
  const next = buildHayrideVehicle({ shadows: false });
  assert.equal(next.tractor.children[0].geometry, cube); next.dispose(); assert.equal(disposedCube, 0);
});
