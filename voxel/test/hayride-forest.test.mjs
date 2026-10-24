import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideForest, hayrideForestClearance } from "../src/hayride-forest.js";

// Validate the final instance transforms, so later tree/fern edits cannot put
// solid foliage through the seated camera or the moving convoy's corridor.
test("the dense off-map forest has a clear low corridor and bounded native geometry", () => {
  const forest = createHayrideForest(), matrix = new THREE.Matrix4();
  let boxes = 0, high = 0, lights = 0, meshes = 0;
  forest.group.traverse(object => {
    if (object.isLight) lights++;
    if (!object.isInstancedMesh) return;
    meshes++;
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix); const e = matrix.elements;
      assert.ok(e.every(Number.isFinite)); assert.ok(matrix.determinant() > 0);
      const x = e[12], z = e[14], y0 = e[13] - e[5] / 2;
      if (y0 < forest.diagnostics.overheadHeight - 1e-6)
        assert.ok(hayrideForestClearance(x, z, e[0], e[10]) >= 2.35 - 1e-5, `Low forest box clips convoy corridor at ${x},${z}`);
      if (e[13] > 8) high++;
      boxes++;
    }
  });
  assert.ok(forest.diagnostics.trees >= 80, "the route is enclosed by a substantial tree line");
  assert.ok(forest.diagnostics.treeBases.every(p => p.height > 7));
  assert.ok(high > 1000, "tall canopy frames the sky above the seated camera");
  assert.equal(boxes, forest.diagnostics.boxes); assert.ok(boxes < 45000);
  assert.ok(meshes <= 2); assert.equal(lights, 0);
  assert.equal(forest.group.userData.hayrideForest.offMap, true);
  forest.dispose();
});

test("forest generation is stable and disposal preserves the game's shared voxel geometry", () => {
  const a = createHayrideForest(), b = createHayrideForest();
  assert.deepEqual(a.diagnostics, b.diagnostics);
  assert.deepEqual(a.group.children[0].children[0].instanceMatrix.array, b.group.children[0].children[0].instanceMatrix.array);
  assert.deepEqual(a.group.children[0].children[0].instanceColor.array, b.group.children[0].children[0].instanceColor.array);
  let geometryDisposed = false;
  a.group.children[0].children[0].geometry.addEventListener("dispose", () => { geometryDisposed = true; });
  a.tick(5); a.tick(500, { gentle: true }); a.dispose();
  assert.equal(geometryDisposed, false, "Voxels.BoxGeometry is shared with the whole game");
  b.dispose();
});
