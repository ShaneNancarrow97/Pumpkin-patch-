import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGrass } from "../src/village-grass.js";
import { VILLAGE_DETAIL_DISTANCE as D, villageGrassDetailLevel } from "../src/village-distance-detail.js";

function fixture() {
  const grass = createGrass({ x0: 0, z0: 0, x1: 40, z1: 40, density: .12, scale: 1.5,
    grow: () => ({ h: .5, colours: [0x527042], flowers: true }), height: () => 0 });
  const root = new THREE.Group(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  scene.add(root); root.add(grass.group); camera.position.set(15, 5, -15);
  const meshes = [...grass.group.children], material = meshes[0].material;
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader };
  material.onBeforeCompile(shader);
  return { grass, root, scene, camera, meshes, uniforms: shader.uniforms };
}
const budget = grass => {
  const { patches, activePatches, fullPatches, middlePatches, farPatches, vertices, fullVertices } = grass.stats();
  return { patches, activePatches, fullPatches, middlePatches, farPatches, vertices, fullVertices };
};
const stateOf = meshes => meshes.map(mesh => ({ geometry: mesh.geometry, visible: mesh.visible,
  matrixVersion: mesh.instanceMatrix.version, colourVersion: mesh.instanceColor.version,
  matrices: [...mesh.instanceMatrix.array], colours: [...mesh.instanceColor.array] }));

test("a stationary lawn selects once while breeze and player-clearance uniforms remain live", () => {
  const { grass, camera, meshes, uniforms } = fixture();
  grass.tick(0, camera, { x: 0, z: 0 });
  const before = stateOf(meshes), selected = budget(grass);
  for (let frame = 1; frame <= 120; frame++) {
    camera.position.y = 5 + frame / 10; camera.rotation.y = frame / 10;
    grass.tick(frame / 30, camera, { x: frame / 2, z: -frame / 4 });
  }
  assert.equal(grass.stats().selectionPasses, 1);
  assert.equal(grass.stats().patchChecks, grass.stats().patches);
  assert.deepEqual(budget(grass), selected);
  assert.deepEqual(stateOf(meshes), before, "no geometry replacement, instance upload or appearance change");
  assert.equal(uniforms.uTime.value, 4);
  assert.deepEqual(uniforms.uGrassPlayer.value.toArray(), [60, -30]);
  assert.deepEqual(uniforms.uGrassCamera.value.toArray(), [15, -15]);
});

test("every horizontal camera change refreshes selection without a movement threshold", () => {
  const { grass, camera, uniforms } = fixture();
  grass.tick(0, camera, null); const first = grass.stats().selectionPasses;
  camera.position.x += 1e-8; grass.tick(1, camera, null);
  assert.equal(grass.stats().selectionPasses, first + 1);
  camera.position.z -= 1e-8; grass.tick(2, camera, null);
  assert.equal(grass.stats().selectionPasses, first + 2);
  assert.deepEqual(uniforms.uGrassCamera.value.toArray(), [camera.position.x, camera.position.z]);
  assert.deepEqual(uniforms.uGrassPlayer.value.toArray(), [1e6, 1e6]);
});

test("hidden ancestors avoid selection and return refreshes LOD before the grass draws", () => {
  const { grass, root, camera, meshes, uniforms } = fixture();
  grass.tick(0, camera, { x: 0, z: 0 });
  const before = stateOf(meshes), selected = budget(grass), passes = grass.stats().selectionPasses;
  root.visible = false;
  for (let frame = 1; frame <= 100; frame++) { camera.position.x += 10; grass.tick(frame, camera, { x: frame, z: -frame }); }
  assert.equal(grass.stats().visible, false);
  assert.equal(grass.stats().selectionPasses, passes);
  assert.deepEqual(stateOf(meshes), before);
  assert.deepEqual(budget(grass), selected, "hidden diagnostics retain the last selected budget");
  assert.equal(uniforms.uTime.value, 100);
  assert.deepEqual(uniforms.uGrassPlayer.value.toArray(), [100, -100]);
  root.visible = true; grass.tick(101, camera, null);
  assert.equal(grass.stats().visible, true);
  assert.equal(grass.stats().selectionPasses, passes + 1);
  assert.equal(grass.stats().activePatches, 0);
  assert.ok(meshes.every(mesh => !mesh.visible));
  camera.position.set(15, 5, -15); grass.tick(102, camera, null);
  assert.equal(grass.stats().activePatches, grass.stats().patches);
  assert.ok(meshes.every(mesh => mesh.visible));
});

test("self-hidden and nested-hidden surfaces defer first selection and refresh even at the same camera", () => {
  const { grass, scene, camera, meshes } = fixture();
  grass.group.visible = false; grass.tick(0, camera, null);
  assert.equal(grass.stats().selectionPasses, 0);
  grass.group.visible = true; scene.visible = false; grass.tick(1, camera, null);
  assert.equal(grass.stats().selectionPasses, 0);
  scene.visible = true; grass.tick(2, camera, null);
  assert.equal(grass.stats().selectionPasses, 1);
  grass.group.visible = false; grass.tick(3, camera, null);
  // Temporary visibility ownership, as used by map/interior presentation,
  // must not leave a deliberately hidden child stale when the surface returns.
  meshes.forEach(mesh => { mesh.visible = false; });
  grass.group.visible = true; grass.tick(4, camera, null);
  assert.equal(grass.stats().selectionPasses, 2);
  assert.ok(meshes.every(mesh => mesh.visible));
});

test("cached approach, retreat and hover preserve the original whole-patch LOD choices", () => {
  const { grass, camera, meshes } = fixture(), radius = (Math.SQRT2 * 10 + 1) * 1.5;
  const tufts = meshes.filter(mesh => mesh.geometry.getAttribute("position").count === 30);
  assert.equal(tufts.length, 4);
  const previous = tufts.map(() => ({ detail: 5, visible: true }));
  const centres = [[10, 10], [10, 30], [30, 10], [30, 30]];
  const route = [15, 15, 100, 100, 121, 121, 145, 145, 200, 200, 145, 121, 100, 15, 15];
  let passes = 0, prior = NaN;
  for (const x of route) {
    camera.position.set(x, 5, -15); grass.tick(x, camera, null);
    if (x !== prior) passes++; prior = x;
    for (let i = 0; i < tufts.length; i++) {
      const [px, pz] = centres[i], nearest = Math.max(0, Math.hypot(px - x / 1.5, pz - 10) * 1.5 - radius), old = previous[i];
      const visible = nearest < D.grassFarTo + (old.visible ? D.switchMargin : 0);
      const detail = villageGrassDetailLevel(nearest, old.detail);
      assert.equal(tufts[i].visible, visible);
      assert.equal(Number.isFinite(tufts[i].geometry.drawRange.count) ? tufts[i].geometry.drawRange.count : 30, detail * 6);
      previous[i] = { visible, detail };
    }
  }
  assert.equal(grass.stats().selectionPasses, passes);
  assert.equal(grass.stats().patchChecks, passes * 4);
});
