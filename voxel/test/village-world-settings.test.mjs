import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrass } from "../src/village-grass.js";
import { createVillageDistanceSettings, villageRenderReach } from "../src/village-graphics-distance.js";

function distanceFixture() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, .2, 900);
  scene.fog = new THREE.FogExp2(0x1d1430, .0072);
  const patches = [100, 140, 180, 220, 300, 380, 500].map(x => ({ chunk: new THREE.Group(), sphere: new THREE.Sphere(new THREE.Vector3(x, 0, 0), 5) }));
  const distance = createVillageDistanceSettings({ scene, camera, patches });
  return { scene, camera, patches, distance };
}

test("far preserves the existing reach and lower settings retain a proportional haze", () => {
  for (const [following, far, fog] of [[true, 250, .0072], [false, 400, .0042]]) {
    assert.deepEqual(villageRenderReach("far", { following }), { requested: "far", quality: "far", mode: following ? "play" : "look", far, fog });
    for (const quality of ["near", "balanced"]) {
      const reach = villageRenderReach(quality, { following });
      assert.ok(reach.far < far); assert.ok(reach.far >= 150);
      assert.ok(Math.abs(reach.far * reach.fog - far * fog) < 1e-12, "same haze coverage at the nearer cull boundary");
    }
  }
  assert.equal(villageRenderReach("__proto__").quality, "far");
  assert.equal(villageRenderReach(null).quality, "far");
});

test("lower distance waits behind the smooth fog before reducing actual chunk work", () => {
  const { scene, camera, patches, distance } = distanceFixture();
  distance.tick(.1, { following: true }); const before = patches.filter(p => p.chunk.visible).length, far = camera.far;
  distance.setQuality("near"); distance.tick(0, { following: true });
  assert.equal(distance.status.targetDistance, 150); assert.equal(distance.status.drawDistance, 250);
  assert.equal(patches.filter(p => p.chunk.visible).length, before, "no immediate pop when selecting a lower distance");
  distance.tick(.1, { following: true });
  assert.ok(scene.fog.density > .0072 && scene.fog.density < .012);
  assert.ok(distance.status.drawDistance > 150 && distance.status.drawDistance < 250);
  distance.tick(.5, { following: true });
  assert.equal(distance.status.drawDistance, 150); assert.equal(distance.status.visiblePatches, 2);
  assert.ok(distance.status.visiblePatches < before);
  assert.equal(camera.far, far, "the distant sky and lens are not clipped by the scenery choice");
  const fog = scene.fog.density; distance.setQuality("far"); distance.tick(0, { following: true });
  assert.equal(distance.status.visiblePatches, before); assert.equal(scene.fog.density, fog, "more distant chunks return behind the existing fog");
});

test("distance respects district haze, room visibility and full tour framing", () => {
  const { scene, distance } = distanceFixture(); distance.setQuality("near");
  distance.tick(.5, { following: true, fogScale: .8 }); assert.ok(Math.abs(scene.fog.density - .0096) < 1e-12);
  assert.ok(Math.abs(distance.status.drawDistance - 150) < 1e-10);
  distance.tick(.5, { enclosed: true }); assert.ok(Math.abs(scene.fog.density - .0015) < 1e-12); assert.equal(distance.status.drawDistance, 0); assert.equal(distance.status.mode, "inside");
  distance.tick(.5, { tour: true, following: true });
  assert.equal(distance.status.requested, "near"); assert.equal(distance.status.effective, "far"); assert.equal(distance.status.targetDistance, 400); assert.equal(distance.status.mode, "look");
  distance.tick(.5, { following: true }); assert.equal(distance.status.effective, "near"); assert.equal(distance.status.targetDistance, 150);
});

test("fog-free map presentation retains its complete visibility until the live view resumes", () => {
  const { scene, patches, distance } = distanceFixture(); distance.setQuality("near"); distance.tick(.5, { following: true });
  const fog = scene.fog, before = distance.status; scene.fog = null; patches.forEach(p => p.chunk.visible = true);
  distance.tick(.5, { following: true });
  assert.ok(patches.every(p => p.chunk.visible)); assert.deepEqual(distance.status, before);
  scene.fog = fog; distance.tick(.5, { following: true }); assert.equal(distance.status.visiblePatches, 2);
});

function grassFixture() {
  const grass = createGrass({ x0: 0, z0: 0, x1: 40, z1: 40, density: .2, scale: 1.5,
    grow: () => ({ h: .5, colours: [0x527042], flowers: true }), height: () => 0 });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); camera.position.set(15, 5, -15); scene.add(grass.group);
  const meshes = [...grass.group.children], shader = { uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
  meshes[0].material.onBeforeCompile(shader);
  return { grass, scene, camera, meshes, uniforms: shader.uniforms };
}
const buffers = meshes => meshes.map(m => ({ matrix: m.instanceMatrix.array.slice(), colour: m.instanceColor.array.slice(), matrixVersion: m.instanceMatrix.version, colourVersion: m.instanceColor.version }));

test("quality reduces actual scattered instance and blade draws without buffer uploads or new meshes", () => {
  const { grass, camera, meshes } = grassFixture(); grass.tick(0, camera); const high = grass.stats(), kept = buffers(meshes), fullCounts = meshes.map(m => m.count), materials = meshes.map(m => m.material);
  assert.ok(high.flowerInstances > 0);
  grass.setQuality("balanced"); grass.tick(1, camera); const balanced = grass.stats();
  assert.equal(balanced.quality, "balanced"); assert.ok(balanced.vertices < high.vertices * .5); assert.ok(balanced.instances < high.instances * .73);
  assert.equal(balanced.fullInstances, high.instances); assert.equal(balanced.fullVertices, high.fullVertices); assert.equal(balanced.fullPatches, 0);
  grass.setQuality("low"); grass.tick(2, camera); const low = grass.stats();
  assert.ok(low.vertices < balanced.vertices * .3); assert.ok(low.instances < high.instances * .46); assert.equal(low.flowerInstances, 0); assert.equal(low.farPatches, low.activePatches);
  assert.equal(grass.group.children.length, meshes.length); assert.deepEqual(buffers(meshes), kept); assert.deepEqual(meshes.map(m => m.material), materials);
  grass.setQuality("high"); grass.tick(3, camera); assert.equal(grass.stats().vertices, high.vertices); assert.equal(grass.stats().flowerInstances, high.flowerInstances); assert.deepEqual(meshes.map(m => m.count), fullCounts);
  assert.deepEqual(buffers(meshes), kept); assert.equal(grass.stats().selectionPasses, 4, "each real quality change invalidates the stationary selection once");
  grass.setQuality("high"); grass.tick(4, camera); assert.equal(grass.stats().selectionPasses, 4, "unchanged settings remain cached");
});

test("off stops grass work and a later enable selects the current view before drawing", () => {
  const { grass, camera, meshes, uniforms } = grassFixture(); grass.tick(3, camera, { x: 1, z: 2 }); const selected = grass.stats().selectionPasses;
  grass.setQuality("off");
  for (let frame = 0; frame < 40; frame++) { camera.position.x += 40; grass.tick(frame, camera, { x: frame, z: frame }); }
  assert.equal(uniforms.uTime.value, 3); assert.deepEqual(uniforms.uGrassPlayer.value.toArray(), [1, 2]); assert.equal(grass.stats().selectionPasses, selected);
  assert.equal(grass.stats().vertices, 0); assert.equal(grass.stats().instances, 0); assert.equal(grass.stats().visible, false); assert.ok(meshes.every(m => m.count === 0 && !m.visible));
  grass.setQuality("balanced"); grass.tick(42, camera); assert.equal(grass.stats().selectionPasses, selected + 1); assert.equal(grass.stats().activePatches, 0);
  camera.position.set(15, 5, -15); grass.tick(43, camera); assert.ok(grass.stats().vertices > 0); assert.equal(uniforms.uTime.value, 43);
});

test("changing quality inside a hidden surface preserves its ownership and refreshes on return", () => {
  const { grass, scene, camera } = grassFixture(); grass.tick(0, camera); const initial = grass.stats();
  scene.visible = false; grass.setQuality("low"); grass.tick(1, camera);
  assert.equal(scene.visible, false); assert.equal(grass.stats().visible, false); assert.equal(grass.stats().selectionPasses, initial.selectionPasses);
  scene.visible = true; grass.tick(2, camera); assert.equal(grass.stats().selectionPasses, initial.selectionPasses + 1); assert.ok(grass.stats().vertices < initial.vertices);
  grass.setQuality("constructor"); grass.tick(3, camera); assert.equal(grass.stats().quality, "high"); assert.equal(grass.stats().vertices, initial.vertices);
});

test("the genuine WebGPU mirror tracks quality counts and bounded LOD wrappers without changing shared buffers", async () => {
  globalThis.self ??= globalThis;
  const { createVillageNodeMaterials } = await import("../src/rendering/village-node-materials.js");
  const { createVillageGpuMirror } = await import("../src/rendering/village-webgpu-mirror.js");
  const { grass, scene, camera, meshes } = grassFixture(), bridge = createVillageNodeMaterials(), mirror = createVillageGpuMirror(bridge), kept = buffers(meshes);
  try {
    for (const quality of ["high", "balanced", "low", "off", "high"]) {
      grass.setQuality(quality); grass.tick(1, camera); mirror.sync(scene, camera);
      const rendered = []; mirror.scene.traverse(o => { if (o.isInstancedMesh) rendered.push(o); });
      assert.equal(rendered.length, meshes.length);
      for (let i = 0; i < meshes.length; i++) {
        assert.equal(rendered[i].count, meshes[i].count); assert.equal(rendered[i].visible, meshes[i].visible); assert.equal(rendered[i].geometry.drawRange.count, meshes[i].geometry.drawRange.count);
      }
      assert.equal(bridge.stats.unsupported, 0); assert.deepEqual(buffers(meshes), kept);
    }
  } finally { mirror.dispose(); bridge.dispose(); }
});
