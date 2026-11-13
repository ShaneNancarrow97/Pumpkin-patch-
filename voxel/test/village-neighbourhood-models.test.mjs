import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Voxels } from "../src/voxels.js";
import { VILLAGE_NEIGHBOURHOODS } from "../src/content/village-neighbourhoods.js";
import { buildVillageNeighbourhoods } from "../src/village-neighbourhoods.js";

test("the inhabited neighbourhoods stay in three batches with no extra lights", () => {
  const group = buildVillageNeighbourhoods(VILLAGE_NEIGHBOURHOODS);
  let boxes = 0, meshes = 0, lights = 0;
  group.traverse(o => { if (o.isInstancedMesh) boxes += o.count; if (o.isMesh) meshes++; if (o.isLight) lights++; });
  assert.ok(boxes > 3000 && boxes <= 6000, `${boxes} boxes give the open lawns detail within the mobile budget`);
  assert.ok(meshes <= 3, `${meshes} combined batches`);
  assert.equal(lights, 0);
  assert.equal(group.userData.spread, "native");
  assert.deepEqual(group.userData.activeIDs, VILLAGE_NEIGHBOURHOODS.map(c => c.id));
  assert.equal(group.userData.visualBudget.boxes, boxes);
  assert.equal(group.userData.visualBudget.meshes, meshes);
  group.userData.dispose();
});

test("every rendered neighbourhood stays inside the footprint used to protect saved decorations", () => {
  for (const cluster of VILLAGE_NEIGHBOURHOODS) {
    const group = buildVillageNeighbourhoods([cluster]), bounds = new THREE.Box3().setFromObject(group), b = cluster.bounds, tolerance = .002;
    assert.ok(bounds.min.x >= b.x0 - tolerance && bounds.max.x <= b.x1 + tolerance, `${cluster.id} x fits its protected ground`);
    assert.ok(-bounds.max.z >= b.z0 - tolerance && -bounds.min.z <= b.z1 + tolerance, `${cluster.id} z fits its protected ground`);
    group.userData.dispose();
  }
});

test("rebuilding selected clusters frees their resources without disposing the village's shared cube", () => {
  const group = buildVillageNeighbourhoods(VILLAGE_NEIGHBOURHOODS.slice(0, 4)), meshes = group.children.filter(o => o.isInstancedMesh), materials = new Set(meshes.map(o => o.material)), geometry = meshes[0].geometry;
  let geometryDisposals = 0, meshDisposals = 0, materialDisposals = 0;
  const geometryDisposed = () => geometryDisposals++;
  geometry.addEventListener("dispose", geometryDisposed);
  for (const mesh of meshes) mesh.addEventListener("dispose", () => meshDisposals++);
  for (const material of materials) material.addEventListener("dispose", () => materialDisposals++);
  group.userData.dispose(); group.userData.dispose();
  assert.equal(group.children.length, 0);
  assert.equal(geometryDisposals, 0, "the shared BOX is still owned by every village batch");
  assert.equal(meshDisposals, meshes.length);
  assert.equal(materialDisposals, materials.size, "shared solid material is released once");
  const fresh = new Voxels(); fresh.block(0, 0, 0, 1, 1, 1, 0xffffff);
  const sibling = fresh.build();
  assert.equal(sibling.children[0].geometry, geometry);
  sibling.children[0].dispose(); sibling.children[0].material.dispose();
  geometry.removeEventListener("dispose", geometryDisposed);
});
