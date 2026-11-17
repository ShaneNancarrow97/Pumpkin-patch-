import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildEstateHouse, buildEstateGarden, buildEstateDecor, buildFarmEstateGate, disposeEstateObject } from "../src/house-estate-world.js";
import { ESTATE_DECOR, ESTATE_DEFAULT_FINISHES, ESTATE_FINISHES, ESTATE_EXPANSIONS } from "../src/content/house-estate.js";

function inspect(group) {
  let boxes = 0, batches = 0; const matrix = new THREE.Matrix4(), bounds = new THREE.Box3();
  group.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    batches++; boxes += mesh.count;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0, "no mirrored, flat or infinite boxes");
      const e = matrix.elements;
      bounds.expandByPoint(new THREE.Vector3(e[12] - e[0] / 2, e[13] - e[5] / 2, e[14] - e[10] / 2));
      bounds.expandByPoint(new THREE.Vector3(e[12] + e[0] / 2, e[13] + e[5] / 2, e[14] + e[10] / 2));
    }
  });
  return { boxes, batches, bounds };
}

test("all four houses grow in detailed 360-degree batches and retain the full upgrade reserve", () => {
  const counts = [], heights = [];
  for (let level = 0; level <= 3; level++) {
    const house = buildEstateHouse(level, ESTATE_DEFAULT_FINISHES), stats = inspect(house);
    assert.equal(stats.batches, 2); assert.ok(stats.boxes > 1200 && stats.boxes < 20000);
    assert.ok(stats.bounds.min.x >= -8 && stats.bounds.max.x <= 8);
    assert.ok(stats.bounds.min.z >= -6 && stats.bounds.max.z <= 6);
    assert.ok(stats.bounds.max.y <= house.userData.bounds.height + .01);
    assert.equal(house.userData.door.x, 0); assert.ok(house.userData.door.z < 6);
    // Cardinal facades must all contain emissive windows: the rear is finished.
    const glow = house.children.find(m => m.material.isMeshBasicMaterial), sides = new Set(), matrix = new THREE.Matrix4();
    for (let i = 0; i < glow.count; i++) { glow.getMatrixAt(i, matrix); const e = matrix.elements; if (e[12] < -2.8) sides.add("left"); if (e[12] > 2.8) sides.add("right"); if (e[14] < -2.4) sides.add("back"); if (e[14] > 2.4) sides.add("front"); }
    assert.equal(sides.size, 4); counts.push(stats.boxes); heights.push(stats.bounds.max.y);
  }
  for (let i = 1; i < counts.length; i++) { assert.ok(counts[i] > counts[i - 1]); assert.ok(heights[i] > heights[i - 1]); }
});

test("every finish option changes the relevant native model palette", () => {
  for (const finish of ESTATE_FINISHES.filter(f => f.category !== "fence")) {
    const house = buildEstateHouse(3, { ...ESTATE_DEFAULT_FINISHES, [finish.category]: finish.id });
    assert.equal(house.userData.palette[finish.category], finish.id);
    const c = new THREE.Color(finish.color), found = new THREE.Color(); let matching = false;
    house.traverse(m => { if (!m.isInstancedMesh || matching) return; for (let i = 0; i < m.count; i++) { m.getColorAt(i, found); if (Math.hypot(found.r - c.r, found.g - c.g, found.b - c.b) < .015) { matching = true; break; } } });
    assert.ok(matching, finish.id + " appears in the built model");
  }
});

test("each catalogue prop fits its paid collision footprint and declared height", () => {
  for (const item of ESTATE_DECOR) {
    const model = buildEstateDecor(item.id), { boxes, batches, bounds } = inspect(model);
    assert.ok(boxes >= 12 && boxes < 2000, item.id + " detail budget"); assert.ok(batches <= 2);
    assert.ok(bounds.min.x >= -item.w / 2 - .01 && bounds.max.x <= item.w / 2 + .01, item.id + " width");
    assert.ok(bounds.min.z >= -item.d / 2 - .01 && bounds.max.z <= item.d / 2 + .01, item.id + " depth");
    assert.ok(bounds.min.y >= -.01 && bounds.max.y <= item.height + .01, item.id + " height");
  }
});

test("all garden tiers retain a clear central gate and update their visible bounds", () => {
  for (let expansion = 0; expansion < ESTATE_EXPANSIONS.length; expansion++) {
    const state = { estate: { expansion, finishes: ESTATE_DEFAULT_FINISHES } }, garden = buildEstateGarden(state), { boxes, batches } = inspect(garden), land = ESTATE_EXPANSIONS[expansion];
    assert.ok(boxes > 1800 && boxes < 20000); assert.equal(batches, 2);
    assert.equal(garden.userData.bounds.width, land.width); assert.equal(garden.userData.bounds.depth, land.depth);
    assert.equal(garden.userData.gate.z, land.depth / 2);
  }
});

test("farm entrance stays open and disposing owned buffers preserves the shared cube", () => {
  const gate = buildFarmEstateGate(), stats = inspect(gate); assert.ok(stats.boxes > 100); assert.ok(stats.bounds.max.x <= 3.01 && stats.bounds.min.x >= -3.01);
  const first = buildEstateDecor("lantern-post"), second = buildEstateDecor("rose-bed"), cube = first.children[0].geometry;
  assert.strictEqual(cube, second.children[0].geometry); let disposed = false; cube.addEventListener("dispose", () => disposed = true);
  disposeEstateObject(first); assert.equal(disposed, false); assert.ok(second.children[0].count > 0);
});
