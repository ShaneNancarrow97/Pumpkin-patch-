import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildWorld, yardGround } from "../src/world.js";
import { pathDistance } from "../src/content/festival-meadow.js";
import { Voxels } from "../src/voxels.js";
import { cocoaKiosk, createFestivalWorld, openMeadowEdge } from "../src/festival-meadow-world.js";
import { freshState } from "../src/model.js";

test("three cocoa tiers are native voxel models with finite, positive instances", () => {
  const counts = [], matrix = new THREE.Matrix4();
  for (let level = 1; level <= 3; level++) {
    const model = cocoaKiosk(level); let n = 0, batches = 0;
    model.traverse((m) => { if (!m.isInstancedMesh) return; batches++; n += m.count;
      for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0); }
    });
    assert.ok(batches <= 2); assert.ok(n > 200 && n < 4000); counts.push(n);
  }
  assert.ok(counts[2] > counts[0], "the pavilion visibly grows");
});

test("opening the gate compacts instance buffers without zero-scale boxes or extra batches", () => {
  const v = new Voxels(); v.box(39, 0, 18, 1, 1, 1, 0x553322); v.box(20, 0, 12, 1, 1, 1, 0x553322); v.box(41, -.5, 18, 2, .5, 2, 0x333322);
  const group = v.build(), mesh = group.children[0], geometry = mesh.geometry;
  assert.equal(openMeadowEdge(group), 1); assert.equal(group.children.length, 1); assert.equal(mesh.count, 2); assert.equal(mesh.geometry, geometry);
  const matrix = new THREE.Matrix4(); for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); assert.ok(matrix.determinant() > 0); }
});

test("the base world boots and expanded ground remains a single continuous mesh", () => {
  const w = buildWorld(); assert.ok(w.group.children.includes(w.ground));
  w.ground.geometry.computeBoundingBox(); assert.equal(w.ground.geometry.boundingBox.max.x, 40);
  const g = yardGround({ width: 54, extraPath: (x, z) => pathDistance(x, z) < .95 });
  g.geometry.computeBoundingBox(); assert.equal(g.geometry.boundingBox.max.x, 54);
  assert.ok(g.geometry.getAttribute("position").array.every(Number.isFinite));
});

test("all five menu props are finite native voxel shapes with shared cached materials", async () => {
  const { cocoaProp } = await import("../src/cocoa-props.js"); const counts = [], matrix = new THREE.Matrix4();
  for (const id of ["cocoa", "flake", "deluxe", "midnight", "smores"]) {
    const prop = cocoaProp(id); let n = 0;
    prop.traverse(m => { if (!m.isInstancedMesh) return; assert.ok(m.material.userData.sharedCocoa); n += m.count; for (let i=0;i<m.count;i++) { m.getMatrixAt(i,matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant()>0); } });
    assert.ok(n>=10); counts.push(n); assert.strictEqual(cocoaProp(id).children[0].material,prop.children[0].material);
  }
  assert.ok(counts[1]>counts[0] && counts[3]>counts[2]);
});

test("steam follows every stocked drink, but not snacks or a closed stand", () => {
  const state = freshState(), scene = new THREE.Scene(); state.festival.meadow = true; state.festival.cocoa.level = 3;
  const stand = createFestivalWorld({ scene, state, world: buildWorld(), signBoard: () => new THREE.Group() });
  let steam; scene.traverse(m => { if (m.isPoints) steam = m; }); assert.ok(steam);
  const c = state.festival.cocoa;
  stand.tick(0); assert.equal(steam.visible, false);
  for (const id of ["flake", "deluxe", "midnight"]) {
    c.extras[id].stock = 1; stand.tick(1); assert.equal(steam.visible, true, id);
    c.open = false; stand.tick(2); assert.equal(steam.visible, false, "closed " + id);
    c.open = true; c.extras[id].stock = 0;
  }
  c.extras.smores.stock = 1; stand.tick(3); assert.equal(steam.visible, false);
  c.stock = 1; stand.tick(4); assert.equal(steam.visible, true);
});
