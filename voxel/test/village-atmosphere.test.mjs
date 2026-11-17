import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createVillageAtmosphere, VILLAGE_ATMOSPHERE_BUDGET } from "../src/village-atmosphere.js";
import { mothTree, workshop, conservatory, mothBanner } from "../src/village-models.js";
import { buildGreen, buildHomes } from "../src/village-world.js";

function record(draw) {
  const boxes = [];
  draw({ block(...box) { boxes.push(box); } });
  return boxes;
}
function bounds(boxes) {
  return boxes.reduce((a, b) => [Math.min(a[0], b[0] - b[3] / 2), Math.max(a[1], b[0] + b[3] / 2),
    Math.min(a[2], b[2] - b[5] / 2), Math.max(a[3], b[2] + b[5] / 2),
    Math.min(a[4], b[1]), Math.max(a[5], b[1] + b[4])], [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]);
}
const matrices = atmosphere => atmosphere.group.children.map(mesh => Array.from(mesh.instanceMatrix.array));

test("the hero tree and restored houses retain their original footprints and finite geometry", () => {
  const models = [
    { draw: f => mothTree(f, 0, 0), max: 8600, bounds: [-6.810155179150402, 7.075534705694764, -7.08291433829069, 7.087591793525964, 0, 9.977900886113941] },
    { draw: f => workshop(f, true), max: 1150, bounds: [-4.75, 6, -7.6, 2.2, 0, 8.2125] },
    { draw: f => conservatory(f, true), max: 1320, bounds: [-4.25, 10.412627886980772, -7.778691207617522, 1.32, 0, 8.3125] },
  ];
  for (const model of models) {
    const boxes = record(model.draw);
    assert.deepEqual(boxes, record(model.draw), "a repeated build uses the same geometry and colour seed");
    assert.ok(boxes.length <= model.max);
    assert.deepEqual(bounds(boxes), model.bounds, "new details remain inside the measured original model");
    for (const box of boxes) {
      assert.ok(box.slice(0, 7).every(Number.isFinite));
      assert.ok(box.slice(3, 6).every(size => size > 0));
      if (box[7]) assert.ok(box[3] * box[4] * box[5] < .12, "only small panes/votives emit, never broad roof or emblem surfaces");
    }
  }
  const banner = record(f => mothBanner(f, 0, 2.22, 0, .78));
  assert.ok(bounds(banner)[4] > 2.2, "banners hang above the owner's walking clearance");
  for (const draw of [f => workshop(f, false), f => conservatory(f, false)]) assert.equal(record(draw).filter(b => b[7]).length, 0);
});

// The61% larger playable Green adds an arrival meadow and clearings; light count stays fixed.
test("static polish remains in bounded batches after the Green expansion", () => {
  // The limits rose by under 3% when pumpkins gained a foot and shoulder and blooms their four petals, and the
  // Green's by 3% more when the village was spread apart: its walls and hedgerow run the wider Green.
  // The native entrance adds 621 boxes for dressed stone/heraldry; its soft
  // nearfield forecourt adds 640 more, using the same 39 meshes/light pool.
  for (const [group, maxBoxes, maxMeshes] of [[buildGreen(), 40150, 50], [buildHomes({ "rowan-workshop": true, "elowen-conservatory": true }), 5900, 2]]) {
    let boxes = 0, meshes = 0, lights = 0;
    group.traverse(object => { if (object.isInstancedMesh) boxes += object.count; if (object.isMesh) meshes++; if (object.isLight) lights++; });
    assert.ok(boxes <= maxBoxes); assert.ok(meshes <= maxMeshes); assert.equal(lights, 0);
    assert.equal(group.userData.visualBudget.boxes, boxes);
  }
});

test("atmosphere has two bounded batches, fixed resources and a smaller TV budget", () => {
  const atmosphere = createVillageAtmosphere(), repeat = createVillageAtmosphere();
  assert.deepEqual(matrices(atmosphere), matrices(repeat));
  const meshes = atmosphere.group.children, geometry = meshes.map(mesh => mesh.geometry), materials = meshes.map(mesh => mesh.material);
  assert.equal(meshes.length, 2); assert.equal(atmosphere.stats().instances, 46); assert.equal(atmosphere.stats().triangles, 552);
  assert.ok(meshes.every(mesh => mesh.isInstancedMesh && !mesh.castShadow && !mesh.receiveShadow && mesh.frustumCulled));
  assert.ok(meshes.every(mesh => !mesh.material.map && !mesh.material.transparent));
  assert.equal(VILLAGE_ATMOSPHERE_BUDGET.lights, 0);
  const emissive = meshes[1].material.color;
  assert.ok(Math.max(emissive.r, emissive.g, emissive.b) <= VILLAGE_ATMOSPHERE_BUDGET.maxEmissiveChannel);
  for (let i = 0; i < 600; i++) atmosphere.tick(.1);
  const matrix = new THREE.Matrix4(), corner = new THREE.Vector3();
  for (const [index, mesh] of meshes.entries()) {
    assert.equal(mesh.geometry, geometry[index]); assert.equal(mesh.material, materials[index]);
    assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
        corner.set(x, y, z).applyMatrix4(matrix);
        assert.ok(mesh.boundingSphere.containsPoint(corner), "animation stays inside its fixed culling sphere");
      }
    }
  }
  atmosphere.tick(0, { budget: "tv" });
  assert.equal(atmosphere.stats().instances, 23); assert.equal(atmosphere.stats().triangles, 276);
  atmosphere.tick(0, { budget: "full" }); assert.equal(atmosphere.stats().instances, 46);
});

test("reduced motion freezes animation and buffer uploads; invalid deltas stay finite", () => {
  const atmosphere = createVillageAtmosphere(); atmosphere.tick(.05);
  const before = matrices(atmosphere), stats = atmosphere.stats();
  for (let i = 0; i < 20; i++) atmosphere.tick(.1, { reducedMotion: true });
  assert.deepEqual(matrices(atmosphere), before); assert.equal(atmosphere.stats().time, stats.time);
  assert.equal(atmosphere.stats().bufferUpdates, stats.bufferUpdates);
  for (const dt of [NaN, Infinity, -1, -Infinity]) atmosphere.tick(dt);
  assert.deepEqual(matrices(atmosphere), before);
  atmosphere.tick(.05); assert.notDeepEqual(matrices(atmosphere), before);
});
