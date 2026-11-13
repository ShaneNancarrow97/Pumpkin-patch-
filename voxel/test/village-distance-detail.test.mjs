import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrass } from "../src/village-grass.js";
import { createVillageAtmosphere } from "../src/village-atmosphere.js";
import { VILLAGE_DETAIL_DISTANCE as D, villageDetailFade, villageGrassDetailLevel, villageGrassBladeFade } from "../src/village-distance-detail.js";

test("distant grass retains a long base silhouette with continuous detail fades", () => {
  for (const rank of [0, 1, 2]) {
    let last = 1;
    for (let distance = 0; distance <= 120; distance += .1) {
      const value = villageGrassBladeFade(distance, rank);
      assert.ok(value >= 0 && value <= last + 1e-12);
      assert.ok(last - value < .008, "no abrupt opacity step as camera moves");
      last = value;
    }
  }
  assert.equal(villageGrassBladeFade(28, 2), 1);
  assert.equal(villageGrassBladeFade(52, 2), 0);
  assert.equal(villageGrassBladeFade(65, 0), 1);
  assert.ok(villageGrassBladeFade(90, 0) > 0);
  assert.equal(villageGrassBladeFade(105, 0), 0);
  assert.equal(villageDetailFade(100, D.lifeFrom, D.lifeTo), 0);
});

test("geometry hysteresis switches only at already invisible detail", () => {
  assert.equal(villageGrassDetailLevel(53, 5), 5);
  assert.equal(villageGrassDetailLevel(53, 3), 3);
  assert.equal(villageGrassDetailLevel(51.9, 3), 5);
  assert.equal(villageGrassDetailLevel(54.1, 5), 3);
  assert.equal(villageGrassDetailLevel(79, 3), 3);
  assert.equal(villageGrassDetailLevel(79, 1), 1);
  assert.equal(villageGrassDetailLevel(77.9, 1), 3);
  for (let distance = 0; distance < 130; distance += .1) {
    const level = villageGrassDetailLevel(distance, 5);
    if (level < 5) assert.equal(villageGrassBladeFade(distance, 2), 0);
    if (level < 3) assert.equal(villageGrassBladeFade(distance, 1), 0);
  }
});

test("real instanced grass submits fewer vertices with no new draws, uploads or early patch disappearance", () => {
  const grass = createGrass({ x0: 0, z0: 0, x1: 20, z1: 20, density: .12, scale: 1.5,
    grow: () => ({ h: .5, colours: [0x527042], flowers: true }), height: () => 0 });
  const meshes = [...grass.group.children], tuft = meshes[0], material = tuft.material;
  const matrices = meshes.map(mesh => mesh.instanceMatrix.array.slice());
  const camera = new THREE.PerspectiveCamera(), root = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const versions = meshes.map(mesh => mesh.instanceMatrix.version);
  let sawMiddle = false, sawFar = false;
  const geometry = new Map();
  for (const x of [15, 100, 120, 145, 120, 100, 15]) {
    camera.position.set(x, 5, -15); grass.tick(1, camera, null);
    const stats = grass.stats(), vertices = tuft.geometry.drawRange.count;
    assert.equal(grass.group.children.length, meshes.length);
    assert.equal(tuft.material, material);
    if (stats.middlePatches) { assert.equal(vertices, 18); sawMiddle = true; }
    if (stats.farPatches) { assert.equal(vertices, 6); sawFar = true; }
    if (geometry.has(vertices)) assert.equal(tuft.geometry, geometry.get(vertices), "reuse fixed LOD wrappers");
    else geometry.set(vertices, tuft.geometry);
    for (let i = 0; i < tuft.count; i++) {
      tuft.getMatrixAt(i, matrix); root.setFromMatrixPosition(matrix).multiplyScalar(1.5);
      const distance = Math.hypot(root.x - camera.position.x, root.z - camera.position.z);
      if (vertices <= 18) assert.equal(villageGrassBladeFade(distance, 2), 0);
      if (vertices <= 6) assert.equal(villageGrassBladeFade(distance, 1), 0);
      if (!tuft.visible) assert.equal(villageGrassBladeFade(distance, 0), 0);
    }
    assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.array), matrices);
    assert.deepEqual(meshes.map(mesh => mesh.instanceMatrix.version), versions);
    assert.ok(stats.vertices <= stats.fullVertices);
  }
  assert.ok(sawMiddle && sawFar);
  assert.equal(geometry.size, 3);
  const layouts = [...geometry.values()].map(g => g.attributes);
  for (const attributes of layouts) assert.equal(attributes.position, layouts[0].position);
});

test("tiny atmosphere fades before draws and buffer updates stop, and resumes without hidden-time catchup", () => {
  const air = createVillageAtmosphere(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  air.group.scale.setScalar(1.5); scene.add(air.group);
  camera.position.copy(air.group.children[0].boundingSphere.center).multiplyScalar(1.5);
  air.tick(.1, { camera }); const close = air.stats(); assert.equal(close.distanceFade, 1);
  camera.position.x += 70;
  air.tick(.1, { camera }); const transition = air.stats();
  assert.ok(transition.distanceFade > 0 && transition.distanceFade < 1);
  camera.position.x += 1000;
  for (let i = 0; i < 100; i++) air.tick(.1, { camera });
  const far = air.stats(); assert.equal(far.distanceFade, 0); assert.equal(air.group.visible, false);
  assert.equal(far.drawCalls, 0); assert.equal(far.triangles, 0);
  assert.equal(far.bufferUpdates, transition.bufferUpdates); assert.equal(far.time, transition.time);
  camera.position.copy(air.group.children[0].boundingSphere.center).multiplyScalar(1.5);
  air.tick(.05, { camera }); const back = air.stats();
  assert.equal(back.distanceFade, 1); assert.equal(back.visible, true);
  assert.ok(Math.abs(back.time - transition.time - .05) < 1e-10);
  const held = air.stats(); air.tick(1, { camera, reducedMotion: true });
  assert.equal(air.stats().time, held.time); assert.equal(air.stats().bufferUpdates, held.bufferUpdates);
});
