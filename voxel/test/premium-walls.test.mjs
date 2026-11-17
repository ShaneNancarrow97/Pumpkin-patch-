import test from "node:test";
import assert from "node:assert/strict";
import { PREMIUM_WALL_ITEMS, PREMIUM_WALL_RECIPES } from "../src/decor-models/premium-walls.js";
import { buildModel } from "../src/decor-models/kit.js";
import { premiumWallProp, premiumWallStats } from "../src/premium-wall-props.js";

// The recipes have their own palettes; a plain art field tests the geometry independently.
function build(item) {
  const art = { w: item.width, h: item.height };
  const pixels = Array.from({ length: art.h }, () => new Int32Array(art.w).fill(0xa47954));
  return buildModel(PREMIUM_WALL_RECIPES[item.id], art, pixels);
}

test("premium walls have unique ids and real, deterministic voxel volume", () => {
  assert.equal(PREMIUM_WALL_ITEMS.length, 6);
  assert.equal(new Set(PREMIUM_WALL_ITEMS.map((item) => item.id)).size, 6);
  for (const item of PREMIUM_WALL_ITEMS) {
    assert.ok(PREMIUM_WALL_RECIPES[item.id], item.id + " has a native recipe");
    const first = build(item), second = build(item), { grid } = first;
    assert.ok(grid.count > 100, item.id + " is not blank");
    assert.ok(grid.count < grid.kind.length * .8, item.id + " keeps its hollow space");
    assert.deepEqual(grid.kind, second.grid.kind, item.id + " occupancy is deterministic");
    assert.deepEqual(grid.rgb, second.grid.rgb, item.id + " palette is deterministic");
    const slices = [];
    for (let z = 0; z < grid.nz; z++) {
      let count = 0;
      for (let y = 0; y < grid.ny; y++) for (let x = 0; x < grid.nx; x++) count += grid.filled(x, y, z);
      if (count) slices.push({ z, count });
    }
    assert.ok(slices.length >= 4, item.id + " has actual depth");
    assert.ok(new Set(slices.map((slice) => slice.count)).size > 1, item.id + " is not an extruded flat silhouette");
  }
});

test("wall props are centred, face forward and share cached mesh geometry", () => {
  for (const item of PREMIUM_WALL_ITEMS) {
    const a = premiumWallProp(item.id), b = premiumWallProp(item.id);
    assert.equal(a.userData.native, true, item.id + " uses native placement without sprite lean");
    assert.ok(a.userData.width > 0 && a.userData.height > 0 && a.userData.depth > 0);
    assert.notEqual(a, b, "instances have independent transforms");
    const meshesA = [], meshesB = [];
    a.traverse((node) => { if (node.isMesh) meshesA.push(node); });
    b.traverse((node) => { if (node.isMesh) meshesB.push(node); });
    assert.ok(meshesA.length > 0 && meshesA.length <= 2, item.id + " batches solid/glow voxels");
    meshesA.forEach((mesh, i) => {
      assert.equal(mesh.geometry, meshesB[i].geometry, "instances share cached geometry");
      assert.equal(mesh.material.map, null, "the model is not a textured standee");
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      assert.ok(box.min.z >= -.00001, item.id + " back stays against the wall at z = 0");
      assert.ok(box.min.y >= -.00001, item.id + " base starts at y = 0");
      assert.ok(box.min.x >= -a.userData.width / 2 - .001 && box.max.x <= a.userData.width / 2 + .001, item.id + " fits its centred width");
    });
    const stats = premiumWallStats(item.id);
    assert.ok(stats && stats.triangles > 0 && stats.triangles < 35000, item.id + " has a bounded mesh budget");
  }
});
