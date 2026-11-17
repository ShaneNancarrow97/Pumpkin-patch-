import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createVillageLife } from "../src/village-life.js";
import { seeded } from "../src/voxels.js";

const setup = () => {
  const life = createVillageLife({ chimneyTops: [{ x: 30, y: 12, z: 8 }] }), surface = new THREE.Group(), scene = new THREE.Scene();
  surface.add(life.group); scene.add(surface);
  life.setBuilt({ "rowan-workshop": true, "elowen-conservatory": true });
  return { life, surface, scene, camera: new THREE.PerspectiveCamera(), pool: [{ userData: { base: 48 } }, { userData: {} }] };
};
function dispose(life) { life.group.traverse(o => { o.geometry?.dispose?.(); for (const material of [].concat(o.material ?? [])) material.dispose?.(); }); }
function snapshot(life) {
  const objects = [];
  life.group.traverse(o => objects.push({ type: o.type, position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray(),
    matrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null,
    points: o.isPoints ? Object.fromEntries(Object.entries(o.geometry.attributes).map(([key, a]) => [key, Array.from(a.array)])) : null,
    opacity: o.material?.opacity }));
  return createHash("sha256").update(JSON.stringify(objects)).digest("hex");
}
function buffers(life) {
  const attributes = new Set();
  life.group.traverse(o => { if (o.instanceMatrix) attributes.add(o.instanceMatrix); if (o.instanceColor) attributes.add(o.instanceColor); for (const a of Object.values(o.geometry?.attributes ?? {})) attributes.add(a); });
  return [...attributes];
}

// Recorded from the released life layer before scratch reuse. These cover
// water, smoke, animal flights/climbs, dropped leaves and the carnival at once.
test("allocation reuse keeps every visible pose and light at the released values", () => {
  const random = Math.random;
  Math.random = seeded(444);
  const life = createVillageLife({ chimneyTops: [{ x: 30, y: 12, z: 8 }] });
  life.setBuilt({ "rowan-workshop": true, "elowen-conservatory": true });
  const camera = new THREE.PerspectiveCamera(), pool = [{ userData: { base: 48 } }, { userData: {} }];
  const expected = new Map([
    [1, "b4582a7120a82f07a63ef782bdd88a43472e4c790976f1bde1f80963a1d020c2"],
    [5, "7f9f7c50667711270d991c3ccb9a24e0143f9350c558eb16a4681af780de8fa6"],
    [10, "9234ad84692b8610f5eac9ddf5db6acc5dcdff0876a30184a8d562ba462bb8da"],
    [40, "7f518be6a5711d165e75da617a351bcf5f87e5a501082a20a376b8229e3b49c1"],
    [80, "deec1ef462ee0eda38a9afefb2461a20335b5156416509ff46d1851deb793b44"],
  ]);
  try {
    for (let i = 1; i <= 80; i++) {
      life.tick(i * .2, .2, camera, pool);
      if (expected.has(i)) assert.equal(snapshot(life), expected.get(i), `same complete pose at ${i * .2}s`);
    }
    assert.deepEqual(pool.map(l => l.intensity), [42.04739760796856, 44.21515410235681]);
  } finally { Math.random = random; dispose(life); }
});

test("hidden surface performs no matrix writes or buffer invalidations while indoor lamps flicker", () => {
  const { life, surface, scene, camera, pool } = setup();
  let writes = 0;
  life.group.traverse(o => { if (o.isInstancedMesh) { const set = o.setMatrixAt; o.setMatrixAt = function (...args) { writes++; return set.apply(this, args); }; } });
  try {
    life.tick(.2, .2, camera, pool);
    const posed = writes, before = snapshot(life), attrs = buffers(life), versions = attrs.map(a => a.version), initial = life.stats(), light = pool[0].intensity;
    assert.equal(posed, initial.matricesPerTick);
    assert.equal(initial.bufferUpdates, 16);
    for (const parent of [life.group, surface, scene]) {
      parent.visible = false;
      for (let i = 0; i < 40; i++) life.tick(1 + i * .1, .1, camera, pool);
      assert.equal(life.stats().visible, false);
      parent.visible = true;
    }
    assert.equal(writes, posed, "no hidden instanced pose is recomputed");
    assert.equal(snapshot(life), before, "hidden animals and particles hold their existing poses");
    assert.deepEqual(attrs.map(a => a.version), versions, "neither renderer is asked to upload invisible buffers");
    const after = life.stats();
    assert.equal(after.hiddenTicks, 120);
    assert.equal(after.bufferUpdates, initial.bufferUpdates);
    assert.equal(after.matrixWrites, initial.matrixWrites);
    assert.equal(after.pointWrites, initial.pointWrites);
    assert.notEqual(pool[0].intensity, light, "the visible home's shared light pool still breathes");
  } finally { dispose(life); }
});

test("returning outside resumes the same buffers with one frame of animation work", () => {
  const { life, surface, camera, pool } = setup();
  try {
    life.tick(.2, .2, camera, pool);
    const before = life.stats(), attrs = buffers(life), versions = attrs.map(a => a.version), objects = [];
    life.group.traverse(o => objects.push([o, o.geometry, o.material, o.instanceMatrix]));
    surface.visible = false;
    for (let i = 0; i < 100; i++) life.tick(200 + i, 1, camera, pool);
    surface.visible = true; life.tick(300.05, .05, camera, pool);
    const after = life.stats();
    assert.equal(after.visible, true);
    assert.equal(after.matrixWrites - before.matrixWrites, before.matricesPerTick);
    assert.equal(after.pointWrites - before.pointWrites, before.pointsPerTick);
    assert.equal(after.bufferUpdates - before.bufferUpdates, 16);
    assert.equal(attrs.filter((a, i) => a.version === versions[i] + 1).length, 16);
    for (const [o, geometry, material, matrix] of objects) { assert.equal(o.geometry, geometry); assert.equal(o.material, material); assert.equal(o.instanceMatrix, matrix); }
    life.group.traverse(o => { if (o.instanceMatrix) assert.ok(o.instanceMatrix.array.every(Number.isFinite)); });
  } finally { dispose(life); }
});

test("a surface hidden before its first frame never starts animation buffers", () => {
  const { life, surface, camera, pool } = setup();
  try {
    const attrs = buffers(life), versions = attrs.map(a => a.version);
    surface.visible = false; life.tick(1, .1, camera, pool);
    assert.equal(life.stats().bufferUpdates, 0);
    assert.equal(life.stats().matrixWrites, 0);
    assert.equal(life.stats().pointWrites, 0);
    assert.deepEqual(attrs.map(a => a.version), versions);
    assert.ok(pool.every(l => Number.isFinite(l.intensity) && l.intensity > 0));
  } finally { dispose(life); }
});
