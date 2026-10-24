import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildModel } from "../src/decor-models/kit.js";
import { PREMIUM_FURNITURE_ITEMS, PREMIUM_FURNITURE_RECIPES, premiumFurnitureProp, premiumFurnitureStats } from "../src/premium-furniture-props.js";

// Plain pixels keep the test independent of generated art and browser loaders.
function build(item) {
  const art = { w: item.width, h: item.height };
  const pixels = Array.from({ length: art.h }, () => new Int32Array(art.w).fill(-1));
  return buildModel(PREMIUM_FURNITURE_RECIPES[item.id], art, pixels);
}

test("premium furniture has deterministic, hollow native volume", () => {
  assert.equal(PREMIUM_FURNITURE_ITEMS.length, 6);
  assert.equal(new Set(PREMIUM_FURNITURE_ITEMS.map((item) => item.id)).size, 6);
  for (const item of PREMIUM_FURNITURE_ITEMS) {
    assert.ok(PREMIUM_FURNITURE_RECIPES[item.id], `${item.id} has a native recipe`);
    const first = build(item), second = build(item), { grid } = first;
    assert.ok(grid.count > 100, `${item.id} has real voxel volume`);
    assert.ok(grid.count < grid.kind.length * .8, `${item.id} retains open space`);
    assert.deepEqual(grid.kind, second.grid.kind, `${item.id} deterministic geometry`);
    assert.deepEqual(grid.rgb, second.grid.rgb, `${item.id} deterministic colours`);
    const slices = [];
    for (let z = 0; z < grid.nz; z++) {
      let count = 0;
      for (let y = 0; y < grid.ny; y++) for (let x = 0; x < grid.nx; x++) count += grid.filled(x, y, z);
      if (count) slices.push(count);
    }
    assert.ok(slices.length >= 6, `${item.id} has real depth`);
    assert.ok(new Set(slices).size > 1, `${item.id} is not an extruded silhouette`);
  }
});

test("floor furniture fits its footprint and caches finite, texture-free geometry", () => {
  for (const item of PREMIUM_FURNITURE_ITEMS) {
    const a = premiumFurnitureProp(item.id), b = premiumFurnitureProp(item.id);
    assert.equal(a.userData.native, true, `${item.id} uses native placement`);
    assert.notEqual(a, b, "instances have independent transforms");
    const meshesA = [], meshesB = [];
    a.traverse((node) => { if (node.isMesh) meshesA.push(node); });
    b.traverse((node) => { if (node.isMesh) meshesB.push(node); });
    assert.ok(meshesA.length > 0 && meshesA.length <= 2, `${item.id} batches solid and glow`);
    meshesA.forEach((mesh, i) => {
      assert.equal(mesh.geometry, meshesB[i].geometry, `${item.id} shares cached geometry`);
      assert.equal(mesh.material.map, null, `${item.id} has no sprite texture`);
      for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite), `${item.id} ${name} has no NaN`);
    });
    const box = new THREE.Box3().setFromObject(a), epsilon = .002;
    assert.ok(box.min.y >= -epsilon, `${item.id} starts at the floor`);
    assert.ok(box.min.x >= -a.userData.width / 2 - epsilon && box.max.x <= a.userData.width / 2 + epsilon, `${item.id} fits centred width`);
    assert.ok(box.min.z >= -a.userData.depth / 2 - epsilon && box.max.z <= a.userData.depth / 2 + epsilon, `${item.id} fits centred depth`);
    assert.ok(a.userData.width <= item.footprint[0] + epsilon && a.userData.depth <= item.footprint[1] + epsilon, `${item.id} fits placement cells`);
    const stats = premiumFurnitureStats(item.id);
    assert.ok(stats && stats.triangles > 0 && stats.triangles <= 50000, `${item.id} has a bounded mesh budget`);
    assert.ok(Array.isArray(a.userData.sockets), `${item.id} exposes compatible furniture sockets`);
  }
});
