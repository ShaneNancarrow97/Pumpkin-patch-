import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { buildWater, spreadVillage } from "../src/village-world.js";
import { createVillageWaterClock, createVillageWaterMaterial, VILLAGE_WATER } from "../src/village-water-material.js";

// The Square's static paving texture needs a canvas; these tests inspect its
// actual water geometry and materials, so no browser drawing is required here.
const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const { buildTownSquare } = await import("../src/village-town-square.js");

const waterMeshes = root => {
  const meshes = []; root.traverse(mesh => { if (mesh.isMesh && mesh.material?.userData.villageWater) meshes.push(mesh); }); return meshes;
};
const compile = material => {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.phong.vertexShader, fragmentShader: THREE.ShaderLib.phong.fragmentShader };
  material.onBeforeCompile(shader, null); return shader;
};
function fingerprint(root) {
  const hash = createHash("sha256"); let triangles = 0;
  root.updateMatrixWorld(true);
  for (const mesh of waterMeshes(root)) {
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    hash.update(JSON.stringify(mesh.matrixWorld.toArray()));
    for (const name of Object.keys(mesh.geometry.attributes).sort()) {
      hash.update(name); const a = mesh.geometry.attributes[name].array; hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
    }
    if (mesh.geometry.index) { const a = mesh.geometry.index.array; hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)); }
  }
  return { sha: hash.digest("hex"), meshes: waterMeshes(root).length, triangles };
}
function dispose(root) {
  const materials = new Set(), geometries = new Set();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.isInstancedMesh) geometries.add(mesh.geometry);
    else mesh.dispose(); // Instanced voxels share the global cube.
    for (const material of [].concat(mesh.material)) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) { material.map?.dispose(); material.dispose(); }
}

test("one water clock advances by elapsed time, ignores bad deltas and freezes the held ripple for reduced motion", () => {
  const clock = createVillageWaterClock(); assert.equal(clock.uniform.value, 0);
  clock.tick(.1); assert.equal(clock.uniform.value, .1);
  clock.tick(.1, { reducedMotion: true }); assert.equal(clock.uniform.value, .1);
  for (const invalid of [NaN, Infinity, -1, 0]) clock.tick(invalid);
  assert.equal(clock.uniform.value, .1);
  clock.tick(5); assert.equal(clock.uniform.value, .35, "a long suspended frame cannot jump the water ahead");
  clock.tick(.05); assert.ok(Math.abs(clock.uniform.value - .4) < 1e-12, "motion resumes from the held surface");
  const thirty = createVillageWaterClock(), sixty = createVillageWaterClock();
  for (let i = 0; i < 30; i++) thirty.tick(1 / 30);
  for (let i = 0; i < 60; i++) sixty.tick(1 / 60);
  assert.ok(Math.abs(thirty.uniform.value - sixty.uniform.value) < 1e-12, "frame rate does not change the water's speed");
});

test("the Phong patch uses transformed world positions and filtered waves while preserving ordinary render chunks", () => {
  const clock = createVillageWaterClock(), material = createVillageWaterMaterial({ clock }), shader = compile(material);
  assert.equal(shader.uniforms.villageWaterTime, clock.uniform);
  assert.match(shader.vertexShader, /vVillageWaterWorld = \(modelMatrix \* vec4\(transformed, 1\.\)\)\.xyz/);
  assert.doesNotMatch(shader.vertexShader, /vVillageWaterWorld = position/, "rotated XY discs must not use a degenerate local XZ plane");
  assert.match(shader.fragmentShader, /mat3\(viewMatrix\) \* villageWaterNormal\(vVillageWaterWorld\.xz\)/);
  assert.match(shader.fragmentShader, /fwidth\(broadPhase\)/); assert.match(shader.fragmentShader, /fwidth\(finePhase\)/);
  assert.equal((shader.fragmentShader.match(/cos\(/g) ?? []).length, 2, "only two procedural wave octaves");
  assert.match(shader.fragmentShader, /clamp\(dot\(normal, normalize\(vViewPosition\)\), 0\., 1\.\)/, "Fresnel stays finite at round-off limits");
  for (const chunk of ["lights_phong_fragment", "lights_fragment_begin", "shadowmap_pars_fragment", "fog_fragment", "tonemapping_fragment", "colorspace_fragment"])
    assert.ok(shader.fragmentShader.includes(`#include <${chunk}>`), `${chunk} remains owned by Three`);
  assert.equal(material.normalMap, null); assert.equal(material.envMap, null); assert.equal(material.map, null);
  assert.deepEqual(material.userData.villageWater, { worldUnits: true, octaves: 2, textures: 0 });
  assert.ok(VILLAGE_WATER.broadSlope + VILLAGE_WATER.fineSlope < .1, "water normals stay within six degrees of the surface");
  assert.ok(Math.max(...VILLAGE_WATER.sheen) <= .04, "neutral sheen cannot bleach the whole pool");
  material.dispose();
});

test("water composes existing material hooks and cache keys without changing transparency or fog", () => {
  let previousCalls = 0;
  const material = createVillageWaterMaterial({ opacity: .9, onBeforeCompile(shader) { previousCalls++; shader.uniforms.authoredUniform = { value: 7 }; }, customProgramCacheKey: () => "authored-water" });
  const shader = compile(material);
  assert.equal(previousCalls, 1); assert.equal(shader.uniforms.authoredUniform.value, 7);
  assert.equal(material.customProgramCacheKey(), "authored-water|village-water-world-ripples-v1");
  assert.equal(material.isMeshPhongMaterial, true); assert.equal(material.transparent, true); assert.equal(material.opacity, .9);
  assert.equal(material.fog, true); assert.equal(material.depthWrite, true); assert.equal(material.side, THREE.FrontSide);
  material.dispose();
});

test("every village pool shares the view's exact water clock with no additional draw, texture or light", () => {
  const clock = createVillageWaterClock(), world = buildWater({ waterClock: clock }), square = buildTownSquare({ waterClock: clock }), all = [...waterMeshes(world), ...waterMeshes(square)], materials = new Set(all.map(mesh => mesh.material));
  assert.equal(all.length, 14); assert.equal(materials.size, 3);
  for (const material of materials) { assert.equal(material.userData.waterClock, clock); assert.equal(compile(material).uniforms.villageWaterTime, clock.uniform); }
  assert.equal(world.children.length, 11);
  let squareDraws = 0, lights = 0;
  square.traverse(mesh => { if (mesh.isMesh) squareDraws++; if (mesh.isLight) lights++; });
  world.traverse(mesh => { if (mesh.isLight) lights++; });
  assert.equal(squareDraws, 24); assert.equal(lights, 0); assert.equal(square.userData.visualBudget.boxes, 6136);
  const before = all.map(mesh => ({ matrix: mesh.matrix.toArray(), positions: Array.from(mesh.geometry.attributes.position.array) }));
  clock.tick(.12);
  for (const material of materials) assert.equal(compile(material).uniforms.villageWaterTime.value, .12);
  assert.deepEqual(all.map(mesh => ({ matrix: mesh.matrix.toArray(), positions: Array.from(mesh.geometry.attributes.position.array) })), before, "clock updates never rewrite geometry");
  assert.ok(waterMeshes(world).every(mesh => mesh.receiveShadow), "surface water still receives the existing moon shadows");
  dispose(world); dispose(square);
});

test("all existing water silhouettes, vertices, indices and placements remain exactly unchanged", () => {
  const world = buildWater(), square = buildTownSquare();
  assert.deepEqual(fingerprint(world), { sha: "62ea0a15942d93c66539d314e55b5f8e06ff73a421d72ebb7b4afe1734cd0254", meshes: 11, triangles: 250 });
  assert.deepEqual(fingerprint(square), { sha: "ce2dbcbec589e2b11afb9c705cd230c13ae897448e46c1da518ba3335e431158", meshes: 3, triangles: 144 });
  const material = waterMeshes(world)[0].material, shader = compile(material); spreadVillage(world);
  assert.equal(compile(material).uniforms.villageWaterTime, shader.uniforms.villageWaterTime, "spreading water does not replace its clock");
  assert.equal(fingerprint(world).meshes, 11); assert.equal(fingerprint(world).triangles, 250);
  const oldClock = material.userData.waterClock, second = buildWater();
  assert.notEqual(waterMeshes(second)[0].material.userData.waterClock, oldClock, "standalone builders do not share mutable global clocks");
  dispose(world); dispose(square); dispose(second);
});

test("water animation leaves the Moonclock's existing Date tick contract intact", () => {
  const clock = createVillageWaterClock(), square = buildTownSquare({ waterClock: clock }), hands = [];
  square.traverse(mesh => { if (mesh.userData.kind && mesh.userData.face === 1) hands.push(mesh); });
  clock.tick(.2); square.userData.tick(new Date(2026, 9, 31, 3, 30, 0));
  assert.equal(clock.uniform.value, .2);
  assert.ok(Math.abs(hands.find(mesh => mesh.userData.kind === "m").rotation.z + Math.PI) < 1e-9);
  assert.ok(Math.abs(hands.find(mesh => mesh.userData.kind === "h").rotation.z + 7 * Math.PI / 12) < 1e-9);
  dispose(square);
});
