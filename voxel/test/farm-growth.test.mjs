import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as M from "../src/model.js";
import { MAX_PLOTS, PLOT_POSITIONS, inFarmPatch, fieldDepth, farmPathEnd, extendFarmRoute, DROP, GATE_Z, PATCH } from "../src/content/farm-layout.js";
import { buildFarmAnnex, createFarmExpansion } from "../src/farm-expansion-world.js";

test("south-field purchases preserve the old tiers and open eighteen then twenty-four beds", () => {
  const s = M.freshState(); s.coins = 10000;
  assert.equal(M.openPlots(s), 6); assert.equal(s.plots.length, MAX_PLOTS);
  for (const [cost, count] of [[300, 9], [660, 12], [2200, 18], [5500, 24]]) {
    assert.equal(M.upgradeCost(s, "plots"), cost);
    s.coins = cost - 1; assert.equal(M.buyUpgrade(s, "plots"), false);
    s.coins = cost; assert.ok(M.buyUpgrade(s, "plots"));
    assert.equal(s.coins, 0); assert.equal(M.openPlots(s), count);
  }
  assert.equal(M.buyUpgrade(s, "plots"), false);
  assert.equal(M.plant(s, 23), true); assert.equal(M.plant(s, 24), false);
});

test("cheap barn tiers expand capacity substantially and require room for the whole harvest", () => {
  const s = M.freshState(); assert.equal(M.barnCapacity(s), 180);
  s.upgrades.yield = 2; const cap = M.barnCapacity(s);
  s.stock = [cap - 2, 0, 0, 0]; s.plots[0] = { phase: "ready", progress: 1, variety: 3 };
  assert.equal(M.harvest(s, 0), 0); assert.equal(s.plots[0].phase, "ready");
  s.coins = 60; assert.ok(M.buyUpgrade(s, "storage")); assert.equal(s.coins, 0);
  assert.equal(M.barnCapacity(s), cap + 180); assert.equal(M.harvest(s, 0), 3);
  assert.equal(M.stockCount(s), cap + 1); assert.equal(s.stock[3], 3);
  s.coins = 20000;
  for (const cost of [180, 500, 1400, 4000, 10000]) {
    assert.equal(M.upgradeCost(s, "storage"), cost); assert.ok(M.buyUpgrade(s, "storage"));
  }
  assert.equal(M.barnCapacity(s), 11220); assert.equal(M.buyUpgrade(s, "storage"), false);
});

test("legacy purchased storage retains every pumpkin and at least its previous capacity", () => {
  for (let level = 0; level <= 5; level++) {
    const s = M.freshState(); s.version = 9; s.upgrades.storage = level;
    s.plots.length = s.plotLevels.length = s.plotCrops.length = 12;
    const oldCap = 60 + [0, 40, 120, 280, 600, 1240][level];
    s.stock = [oldCap + 100, 10, 5, 2];
    const restored = M.restoreState(JSON.parse(JSON.stringify(s)));
    assert.ok(M.barnCapacity(restored) >= oldCap); assert.deepEqual(restored.stock, s.stock);
    assert.equal(restored.upgrades.storage, level);
  }
});

test("field growth keeps plot IDs stable, clear of paths and inside the purchased soil", () => {
  // The first twelve keep their order and spacing; the whole lower yard sits DROP further south.
  const original = [11.2, 13.8, 16.4, 19].flatMap(z => [16.5, 20, 23.5].map(x => ({ x, z: z + DROP })));
  assert.deepEqual(PLOT_POSITIONS.slice(0, 12), original);
  assert.ok(PATCH.back - PATCH.rz > 11.6 + 0.6, "the patch's top clears the lantern walk");
  assert.equal(new Set(PLOT_POSITIONS.map(p => `${p.x}:${p.z}`)).size, MAX_PLOTS);
  for (const tier of [0, 1, 2, 3, 4]) {
    const s = M.freshState(); s.upgrades.plots = tier;
    for (const p of PLOT_POSITIONS.slice(0, M.openPlots(s))) {
      assert.ok(inFarmPatch(p.x, p.z, tier)); assert.ok(Math.abs(p.x - 33) > 5);
      assert.ok(p.z < fieldDepth(s) - 2); assert.ok(farmPathEnd(s) > fieldDepth(s));
    }
  }
});

test("expanded routes clone points and only move the gate leg to the visible exit", () => {
  const route = [[-3, GATE_Z], [-3, 24], [7.1, 11.6]], copy = structuredClone(route);
  for (const [tier, end, depth] of [[0, 30, 26], [3, 34, 31], [4, 39, 36]].map(([t, e, d]) => [t, e + DROP, d + DROP])) {
    const s = M.freshState(); s.upgrades.plots = tier;
    assert.deepEqual(extendFarmRoute(route, s), [[-3, end], ...route.slice(1)]);
    assert.equal(fieldDepth(s), depth); assert.equal(farmPathEnd(s), end);
    assert.notEqual(extendFarmRoute(route, s)[1], route[1]);
  }
  assert.deepEqual(route, copy);
});

test("native annex geometry has positive finite instances and keeps both exit lanes clear", () => {
  const s = M.freshState(), matrix = new THREE.Matrix4(); let previous = 0;
  for (const tier of [3, 4]) {
    s.upgrades.plots = tier; const model = buildFarmAnnex(s); let batches = 0, boxes = 0;
    model.traverse(mesh => {
      if (!mesh.isInstancedMesh) return; batches++; boxes += mesh.count;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0);
        const a = matrix.elements, x = a[12], z = a[14];
        if (z > 24.7 + DROP && z < farmPathEnd(s)) for (const lane of [-3, 33]) assert.ok(Math.abs(x - lane) > .85, `blocked exit at ${x},${z}`);
      }
    });
    assert.equal(batches, 2); assert.ok(boxes > 500 && boxes < 20000);
    assert.equal(model.userData.plots, tier === 3 ? 18 : 24); assert.ok(boxes >= previous); previous = boxes;
  }
});

test("expansion controller replaces terrain once, preserves meadow width and reuses fixed light count", () => {
  const s = M.freshState(), scene = new THREE.Scene(), group = new THREE.Group();
  const original = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial());
  const frontBoundary = new THREE.Group(), patchBoundary = new THREE.Group();
  group.add(original, frontBoundary, patchBoundary); scene.add(group);
  const world = { group, ground: original, frontBoundary, patchBoundary };
  const lamp = new THREE.PointLight(); lamp.position.set(4, 2.2, 25.1 + DROP); scene.add(lamp);
  const controller = createFarmExpansion(scene, s, world); assert.equal(world.ground, original);
  s.upgrades.plots = 3; s.festival.meadow = true; controller.sync();
  const ground = world.ground; ground.geometry.computeBoundingBox();
  assert.equal(ground.geometry.boundingBox.max.x, 54); assert.equal(ground.geometry.boundingBox.max.z, fieldDepth(s) + 5);
  assert.ok(ground.geometry.getAttribute("position").array.every(Number.isFinite));
  assert.equal(frontBoundary.visible, false); assert.equal(patchBoundary.visible, false);
  assert.equal(lamp.position.z, fieldDepth(s) - .9); assert.equal(scene.children.filter(c => c.isPointLight).length, 1);
  controller.sync(); assert.equal(world.ground, ground); assert.equal(group.children.filter(c => c.name === "Purchased south field").length, 1);
  assert.equal(controller.status.plots, 18);
});
