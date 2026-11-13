import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createVillageLightAir, VILLAGE_LIGHT_AIR_BUDGET, VILLAGE_DUSK_LIGHTING } from "../src/village-light-air.js";
import { createVillageAtmosphere } from "../src/village-atmosphere.js";
import { FIXTURES } from "../src/content/village.js";
import { TOWN } from "../src/content/village-town-square.js";
import { Voxels } from "../src/voxels.js";
import { finishVoxels, VOXEL_FINISH } from "../src/voxel-finish.js";

const lamps = [{ x: 87, y: 4.8, z: -36 }, { x: 94, y: 5.1, z: -15 }, { x: 82, y: 4.2, z: -90 }];
const matrices = layer => layer.group.children.map(mesh => Array.from(mesh.instanceMatrix.array));

test("world light-air has two bounded instanced draws and no lights, textures or shadow pass", () => {
  const layer = createVillageLightAir({ lamps }), repeat = createVillageLightAir({ lamps });
  assert.deepEqual(matrices(layer), matrices(repeat)); assert.equal(layer.group.children.length, 2);
  assert.deepEqual(layer.stats(), { budget: "full", shafts: 6, fireflies: 32, instances: 38, triangles: 76, drawCalls: 2, lights: 0, textures: 0, time: 0, worldUnits: true, gpuMotion: true });
  for (const mesh of layer.group.children) {
    assert.equal(mesh.isInstancedMesh, true); assert.equal(mesh.geometry.attributes.position.count, 4);
    assert.equal(mesh.castShadow, false); assert.equal(mesh.receiveShadow, false); assert.equal(mesh.frustumCulled, true);
    assert.equal(mesh.material.depthWrite, false); assert.equal(mesh.material.depthTest, true); assert.equal(mesh.material.blending, THREE.AdditiveBlending); assert.equal(mesh.material.map, undefined);
    assert.ok(Number.isFinite(mesh.boundingSphere.radius) && mesh.boundingSphere.radius > 0);
  }
  assert.equal(VILLAGE_LIGHT_AIR_BUDGET.triangles, 76); layer.dispose(); repeat.dispose();
});

test("shafts sit at the actual world tree and native Moonclock, while lantern centres use supplied world coordinates", () => {
  const layer = createVillageLightAir({ lamps }), [shafts, flies] = layer.group.children, matrix = new THREE.Matrix4(), centre = new THREE.Vector3();
  shafts.getMatrixAt(0, matrix); centre.setFromMatrixPosition(matrix); assert.ok(Math.abs(centre.x - FIXTURES.tree.x) < 4); assert.ok(Math.abs(centre.z + FIXTURES.tree.z) < 4);
  shafts.getMatrixAt(1, matrix); centre.setFromMatrixPosition(matrix); assert.ok(Math.abs(centre.x - TOWN.gate.x * 1.5) < 3); assert.ok(Math.abs(centre.z + TOWN.gate.z * 1.5) < 1);
  flies.getMatrixAt(0, matrix); centre.setFromMatrixPosition(matrix); assert.ok(Math.abs(centre.x - lamps[0].x) < 1); assert.ok(Math.abs(centre.y - lamps[0].y) < 1); assert.ok(Math.abs(centre.z - lamps[0].z) < 1);
  assert.match(shafts.material.vertexShader, /modelMatrix \* instanceMatrix/); assert.match(flies.material.vertexShader, /viewMatrix \* vec4\(centre/); layer.dispose();
});

test("GPU motion advances only its kept uniform and holds phase under pause or reduced motion", () => {
  const layer = createVillageLightAir({ lamps }), before = matrices(layer), geometries = layer.group.children.map(m => m.geometry), materials = layer.group.children.map(m => m.material), versions = layer.group.children.map(m => m.instanceMatrix.version);
  for (const mesh of layer.group.children) mesh.setMatrixAt = () => { throw new Error("frame updates cannot rewrite instances"); };
  layer.tick(.05); assert.equal(layer.stats().time, .05);
  const timeUniform = layer.group.children[0].material.uniforms.airTime;
  assert.equal(layer.group.children[1].material.uniforms.airTime, timeUniform);
  for (const options of [{ paused: true }, { reducedMotion: true }, { paused: true, reducedMotion: true }]) for (let frame = 0; frame < 20; frame++) layer.tick(.1, options);
  assert.equal(timeUniform.value, .05); layer.tick(.05); assert.equal(timeUniform.value, .1);
  for (const dt of [NaN, Infinity, -Infinity, -1]) layer.tick(dt); assert.equal(timeUniform.value, .1);
  layer.tick(5); assert.equal(timeUniform.value, .2, "long hidden time cannot jump a whole flight");
  assert.deepEqual(matrices(layer), before); assert.deepEqual(layer.group.children.map(m => m.instanceMatrix.version), versions);
  assert.deepEqual(layer.group.children.map(m => m.geometry), geometries); assert.deepEqual(layer.group.children.map(m => m.material), materials); layer.dispose();
});

test("TV halves the quad work and tree cutaways affect only the tree ribbons", () => {
  const layer = createVillageLightAir({ lamps }), [shafts] = layer.group.children;
  layer.tick(0, { budget: "tv", treeVisibility: 0, density: .008 }); assert.equal(layer.stats().triangles, 38); assert.equal(layer.stats().shafts, 3); assert.equal(layer.stats().fireflies, 16);
  assert.equal(shafts.material.uniforms.airTreeVisibility.value, 0); assert.deepEqual(Array.from(shafts.geometry.getAttribute("airTree").array), [1, 0, 1, 0, 1, 1]);
  assert.match(shafts.material.vertexShader, /mix\(1\., airTreeVisibility, airTree\)/); assert.equal(shafts.material.uniforms.airHaze.value, .008);
  layer.tick(0, { budget: "full", treeVisibility: Infinity, density: NaN }); assert.equal(layer.stats().triangles, 76); assert.equal(shafts.material.uniforms.airTreeVisibility.value, 1); assert.ok(Number.isFinite(shafts.material.uniforms.airHaze.value)); layer.dispose();
});

test("TV's static firefly subset still samples the later Square lanterns", () => {
  const field = Array.from({ length: 64 }, (_, i) => ({ x: i * 10, y: 5, z: 0 })), layer = createVillageLightAir({ lamps: field }); layer.tick(0, { budget: "tv" });
  const flies = layer.group.children[1], matrix = new THREE.Matrix4(), chosen = new Set();
  for (let i = 0; i < flies.count; i += 2) { flies.getMatrixAt(i, matrix); chosen.add(Math.round(matrix.elements[12] / 10)); }
  assert.equal(chosen.size, 8); assert.ok([...chosen].some(i => i < 8)); assert.ok([...chosen].some(i => i >= 48), "the reduced count includes the Square at the end of the authored lamp list"); layer.dispose();
});

test("reduced square dust plus restrained air uses fewer triangles than the previous particles", () => {
  const atmosphere = createVillageAtmosphere(), air = createVillageLightAir({ lamps });
  assert.equal(atmosphere.stats().particles, 16); assert.equal(atmosphere.stats().triangles + air.stats().triangles, 628);
  assert.ok(VILLAGE_DUSK_LIGHTING.moon > .8 && VILLAGE_DUSK_LIGHTING.moon < 1); assert.ok(VILLAGE_DUSK_LIGHTING.sky >= .9 && VILLAGE_DUSK_LIGHTING.sky <= 1);
  air.dispose(); atmosphere.group.traverse(mesh => { if (mesh.isInstancedMesh) mesh.dispose(); }); const geometry = new Set(atmosphere.group.children.map(m => m.geometry)), material = new Set(atmosphere.group.children.map(m => m.material)); for (const g of geometry) g.dispose(); for (const m of material) m.dispose();
});

test("empty lamp lists create no stray fireflies and all owned resources dispose once", () => {
  const layer = createVillageLightAir({ lamps: [null, { x: NaN, y: 2, z: 3 }] }), scene = new THREE.Scene(); scene.add(layer.group);
  assert.equal(layer.stats().fireflies, 0); assert.equal(layer.stats().triangles, 12);
  let meshes = 0, geometries = 0, materials = 0;
  for (const mesh of layer.group.children) { mesh.addEventListener("dispose", () => meshes++); mesh.geometry.addEventListener("dispose", () => geometries++); mesh.material.addEventListener("dispose", () => materials++); }
  layer.dispose(); layer.dispose(); layer.tick(.1); assert.deepEqual([meshes, geometries, materials], [2, 2, 2]); assert.equal(scene.children.length, 0); assert.equal(layer.group.children.length, 0);
});

test("fine stone grain composes with the existing voxel finish without changing geometry or emissive glass", () => {
  const voxels = new Voxels(); voxels.block(0, 0, 0, 4, 3, .5, 0xaaa49b); voxels.block(1, 1, 0, 1, 1, .03, 0xffc88a, true);
  const group = voxels.build(), geometry = group.children.map(m => m.geometry), matricesBefore = group.children.map(m => Array.from(m.instanceMatrix.array)); finishVoxels(group);
  const shaders = group.children.map(mesh => { const kind = mesh.material.isMeshStandardMaterial ? "standard" : "basic", shader = { uniforms: {}, vertexShader: THREE.ShaderLib[kind].vertexShader, fragmentShader: THREE.ShaderLib[kind].fragmentShader }; mesh.material.onBeforeCompile(shader); return shader; });
  assert.match(shaders[0].fragmentShader, /finGrainShow.*finPx \* 4/); assert.match(shaders[0].fragmentShader, /finNeutral/); assert.match(shaders[0].fragmentShader, /if \(finGrainShow > \.001\)/); assert.doesNotMatch(shaders[1].fragmentShader, /finGrainShow/);
  assert.ok(shaders.every(s => s.uniforms.finNear && s.uniforms.finPitch)); assert.ok(VOXEL_FINISH.tone < .11 && VOXEL_FINISH.patch < .15 && VOXEL_FINISH.grain <= .06);
  assert.equal(group.children[0].material.customProgramCacheKey(), "voxel-finish-lit-fidelity-1"); assert.notEqual(group.children[0].material.customProgramCacheKey(), group.children[1].material.customProgramCacheKey());
  assert.deepEqual(group.children.map(m => m.geometry), geometry); assert.deepEqual(group.children.map(m => Array.from(m.instanceMatrix.array)), matricesBefore);
  for (const mesh of group.children) { mesh.dispose(); mesh.material.dispose(); }
});
