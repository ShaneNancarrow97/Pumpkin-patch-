import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHash } from "node:crypto";
import { Voxels } from "../src/voxels.js";
import { VILLAGE_NEIGHBOURHOODS } from "../src/content/village-neighbourhoods.js";
import { buildVillageNeighbourhoods } from "../src/village-neighbourhoods.js";
import { finishVoxels } from "../src/voxel-finish.js";
import { installVillageNeighbourhoodVisibility, tickVillageNeighbourhoodVisibility, villageNeighbourhoodVisibility, withVillageNeighbourhoodVisibilityRestored } from "../src/village-neighbourhood-visibility.js";

const box = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
const point = (x, y, z) => ({ x, y, z });
const cameraAt = (x, y, z) => ({ position: new THREE.Vector3(x, y, z) });
const shaderFor = material => {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader, null); return shader;
};
const install = clusters => { const group = buildVillageNeighbourhoods(clusters); finishVoxels(group); installVillageNeighbourhoodVisibility(group); return group; };
const uniforms = group => shaderFor(group.children.find(mesh => mesh.geometry.hasAttribute("neighbourhoodBlocker")).material).uniforms;
const crownCluster = { id: "two-native-trees", kind: "orchard", x: 0, z: 0, w: 20, d: 10, props: false, trees: [{ x: 0, z: 0, size: 1 }, { x: 12, z: 0, size: 1 }] };

test("finite camera-to-owner segments reject distant, overhead and malformed blockers", () => {
  const bounds = box(-1, 3, -1, 1, 5, 1), player = point(6, 0, 0);
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 6, 0), bounds, 0), 0, "raised lens crosses the crown on the way to the owner");
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 1.7, 0), bounds, 0), 1, "crown stays overhead from the street");
  assert.equal(villageNeighbourhoodVisibility(player, point(3, 4, 0), bounds, 0), 1, "crown behind the lens stays whole");
  assert.equal(villageNeighbourhoodVisibility(point(-3, 0, 0), point(-6, 4, 0), bounds, 0), 1, "crown beyond the owner stays whole");
  assert.equal(villageNeighbourhoodVisibility(player, point(0, 4, 0), bounds, 0), 0, "lens inside foliage clears that foliage");
  assert.equal(villageNeighbourhoodVisibility(point(0, 2.3, 0), point(0, 4, 0), bounds, 0), 0, "zero-length head ray and parallel axes stay finite");
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 6, 4), bounds, 0), 1, "a neighbouring lane is not hidden");
  for (const invalid of [null, point(NaN, 0, 0), point(1, Infinity, 0), point(0, 0, undefined)]) assert.equal(villageNeighbourhoodVisibility(invalid, point(-6, 6, 0), bounds), 1);
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 6, 0), { min: { x: -1, z: -1 }, max: point(1, 5, 1) }), 1);
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 6, 0), box(1, 5, 1, -1, 3, -1)), 1);
  assert.equal(villageNeighbourhoodVisibility(player, point(-6, 6, 0), bounds, NaN), 1);
});

test("sightline visibility agrees with independent Three camera rays throughout a full orbit", () => {
  const bounds = box(-1, 3, -1, 1, 5, 1), player = point(6, 0, 0), lens = new THREE.PerspectiveCamera(48, 1.6, .2, 900), raycaster = new THREE.Raycaster(), hit = new THREE.Vector3();
  for (const elevation of [2.4, 6, 10]) for (let step = 0; step < 24; step++) {
    const angle = step / 24 * Math.PI * 2;
    lens.position.set(player.x + Math.cos(angle) * 9, elevation, Math.sin(angle) * 9);
    let crosses = false;
    for (const height of [1.7, .85]) {
      const target = new THREE.Vector3(player.x, height, player.z);
      lens.lookAt(target); lens.updateMatrixWorld(true); raycaster.setFromCamera(new THREE.Vector2(0, 0), lens);
      const contact = raycaster.ray.intersectBox(bounds, hit);
      crosses ||= !!contact && (bounds.containsPoint(lens.position) || lens.position.distanceTo(contact) <= lens.position.distanceTo(target));
    }
    assert.equal(villageNeighbourhoodVisibility(player, lens.position, bounds, 0), crosses ? 0 : 1, `orbit ${step}, elevation ${elevation}`);
    lens.fov = 66; lens.updateProjectionMatrix();
    assert.equal(villageNeighbourhoodVisibility(player, lens.position, bounds, 0), crosses ? 0 : 1, "field of view cannot change a world sightline");
  }
});

test("actual model tags keep all geometry unchanged and independently identify 28 crowns plus one roof", () => {
  const group = buildVillageNeighbourhoods(VILLAGE_NEIGHBOURHOODS), hash = createHash("sha256"), counts = new Map();
  for (const mesh of group.children) {
    hash.update(Buffer.from(mesh.instanceMatrix.array.buffer)); hash.update(Buffer.from(mesh.instanceColor.array.buffer));
    for (const id of mesh.userData.neighbourhoodVisibilityIDs) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  assert.equal(hash.digest("hex"), "e1287c7c8839488e69d634c14a766756580b2b249cd4fcad4cbbafa0c6fd674f", "original voxel matrices and colours are retained exactly");
  assert.equal(group.userData.viewBlockers.filter(b => b.kind === "crown").length, 28);
  assert.equal(group.userData.viewBlockers.filter(b => b.kind === "pavilion").length, 1);
  assert.equal(counts.size, 30, "permanent scenery plus 29 independent overhead groups");
  for (const b of group.userData.viewBlockers) {
    assert.ok(b.bounds.min.every(Number.isFinite) && b.bounds.max.every(Number.isFinite));
    if (b.kind === "crown") assert.equal(counts.get(b.id), 49, "40 foliage boxes and nine attached apples, no ground apples or leaves");
  }
  assert.deepEqual(group.userData.visualBudget, { boxes: 6232, meshes: 3, addedLights: 0 });
  group.userData.dispose();
});

test("per-instance alpha hashing composes with the voxel finish and preserves physical shadows", () => {
  const group = install(VILLAGE_NEIGHBOURHOODS), material = group.children[0].material, shader = shaderFor(material);
  assert.equal(material.transparent, false); assert.equal(material.alphaHash, true); assert.equal(material.opacity, 1);
  assert.match(material.customProgramCacheKey(), /voxel-finish-lit-fidelity-1\|native-neighbourhood-visibility-30/);
  assert.ok(shader.uniforms.finPitch && shader.uniforms.finNear, "finish and lamp uniforms remain installed");
  assert.match(shader.fragmentShader, /finTone/);
  assert.match(shader.vertexShader, /neighbourhoodVisibility\[30\]/);
  assert.match(shader.fragmentShader, /diffuseColor\.a \*= vNeighbourhoodVisibility;\n#include <alphahash_fragment>/);
  assert.doesNotMatch(shader.fragmentShader, /neighbourhoodVisibility\[/, "group lookup happens once per vertex");
  assert.equal(shader.uniforms.neighbourhoodVisibility.value[0], 1);
  assert.equal(group.children[0].castShadow, true); assert.equal(group.children[1].castShadow, false);
  assert.ok(group.children.every(mesh => mesh.customDepthMaterial === undefined && mesh.customDistanceMaterial === undefined));
  const ids = group.children[0].geometry.getAttribute("neighbourhoodBlocker");
  assert.equal(ids.count, group.children[0].count); assert.equal(ids.isInstancedBufferAttribute, true);
  group.userData.dispose();
});

test("only the crossed crown eases away, hysteresis holds its edge, and reduced motion and look mode restore", () => {
  const group = install([crownCluster]), u = uniforms(group), player = point(6, 0, 0), camera = cameraAt(-6, 5, 0), matrices = group.children.map(mesh => Array.from(mesh.instanceMatrix.array));
  tickVillageNeighbourhoodVisibility(group, player, camera, .1);
  assert.ok(u.neighbourhoodVisibility.value[1] > 0 && u.neighbourhoodVisibility.value[1] < .5, "first frame eases into the cutout");
  assert.equal(u.neighbourhoodVisibility.value[2], 1, "adjacent tree stays whole");
  for (let i = 0; i < 7; i++) tickVillageNeighbourhoodVisibility(group, player, camera, .1);
  assert.equal(u.neighbourhoodVisibility.value[1], 0);
  const edge = group.userData.viewBlockers[0].bounds.max[2] + .35;
  player.z = edge; camera.position.z = edge;
  tickVillageNeighbourhoodVisibility(group, player, camera, .1, { reducedMotion: true });
  assert.equal(u.neighbourhoodVisibility.value[1], 0, "existing cutout holds through the wider leave margin");
  tickVillageNeighbourhoodVisibility(group, null, camera, .1);
  assert.equal(u.neighbourhoodVisibility.value[1], 1, "look mode resets immediately");
  tickVillageNeighbourhoodVisibility(group, player, camera, .1, { reducedMotion: true });
  assert.equal(u.neighbourhoodVisibility.value[1], 1, "same edge does not enter a fresh cutout");
  player.z = 0; camera.position.z = 0;
  tickVillageNeighbourhoodVisibility(group, player, camera, .1, { reducedMotion: true });
  assert.equal(u.neighbourhoodVisibility.value[1], 0, "reduced motion changes the settled state without an animated dissolve");
  player.z = 9; camera.position.z = 9;
  tickVillageNeighbourhoodVisibility(group, player, camera, .1);
  assert.ok(u.neighbourhoodVisibility.value[1] > .1 && u.neighbourhoodVisibility.value[1] < 1, "moving clear gently restores the crown");
  for (let i = 0; i < 10; i++) tickVillageNeighbourhoodVisibility(group, player, camera, .1);
  assert.equal(u.neighbourhoodVisibility.value[1], 1); assert.equal(group.userData.neighbourhoodVisibility.faded, 0);
  assert.deepEqual(group.children.map(mesh => Array.from(mesh.instanceMatrix.array)), matrices, "frame updates never rewrite boxes");
  group.userData.dispose();
});

test("world-space blockers follow terrain, orientation and root scaling, including later matrix changes", () => {
  const cluster = VILLAGE_NEIGHBOURHOODS.find(c => c.id === "lantern-pergola"), group = install([{ ...cluster, facing: "east" }]), parent = new THREE.Group();
  parent.scale.setScalar(1.5); parent.position.set(7, 3, 11); parent.add(group); parent.updateMatrixWorld(true);
  const b = group.userData.viewBlockers[0], local = box(...b.bounds.min, ...b.bounds.max), world = local.clone().applyMatrix4(group.matrixWorld), center = world.getCenter(new THREE.Vector3());
  assert.ok(center.x > 180 && center.z < -70, "native spread positions are scaled once with world z reversed");
  const player = point(center.x, world.min.y - 3, center.z), camera = cameraAt(center.x, world.max.y + 2, center.z), u = uniforms(group);
  tickVillageNeighbourhoodVisibility(group, player, camera, 0, { reducedMotion: true });
  assert.equal(u.neighbourhoodVisibility.value[1], 0, "raised lens and owner under this rotated roof clear it");
  parent.position.x += 30;
  tickVillageNeighbourhoodVisibility(group, player, camera, 0, { reducedMotion: true });
  assert.equal(u.neighbourhoodVisibility.value[1], 1, "changed parent matrix invalidates cached world bounds");
  group.userData.dispose();
});

test("atlas scopes disable only view fades and restore exact uniforms through nested throws", () => {
  const group = install([crownCluster]), u = uniforms(group);
  tickVillageNeighbourhoodVisibility(group, point(6, 0, 0), cameraAt(-6, 5, 0), .1);
  const values = u.neighbourhoodVisibility.value, before = Array.from(values);
  assert.throws(() => withVillageNeighbourhoodVisibilityRestored(group, () => {
    assert.equal(u.neighbourhoodFadeEnabled.value, 0);
    assert.throws(() => withVillageNeighbourhoodVisibilityRestored(group, () => { assert.equal(u.neighbourhoodFadeEnabled.value, 0); throw new Error("inner capture"); }), /inner capture/);
    assert.equal(u.neighbourhoodFadeEnabled.value, 0, "inner failure preserves outer atlas state");
    throw new Error("outer capture");
  }), /outer capture/);
  assert.equal(u.neighbourhoodFadeEnabled.value, 1); assert.equal(u.neighbourhoodVisibility.value, values); assert.deepEqual(Array.from(values), before);
  assert.equal(withVillageNeighbourhoodVisibilityRestored(group, () => "atlas result"), "atlas result");
  group.userData.dispose();
});

test("owned visibility geometries dispose once while the global cube and unrelated scenery remain valid", () => {
  const group = buildVillageNeighbourhoods(VILLAGE_NEIGHBOURHOODS), globalBox = group.children[0].geometry, clones = [], materials = new Set(group.children.map(mesh => mesh.material));
  let sharedDisposals = 0, ownDisposals = 0, meshDisposals = 0, materialDisposals = 0;
  const sharedDisposed = () => sharedDisposals++; globalBox.addEventListener("dispose", sharedDisposed);
  finishVoxels(group); installVillageNeighbourhoodVisibility(group); installVillageNeighbourhoodVisibility(group);
  for (const mesh of group.children) {
    if (mesh.geometry !== globalBox) { clones.push(mesh.geometry); mesh.geometry.addEventListener("dispose", () => ownDisposals++); }
    mesh.addEventListener("dispose", () => meshDisposals++);
  }
  for (const material of materials) material.addEventListener("dispose", () => materialDisposals++);
  assert.equal(clones.length, 2); assert.equal(globalBox.hasAttribute("neighbourhoodBlocker"), false);
  group.userData.dispose(); group.userData.dispose();
  assert.equal(sharedDisposals, 0); assert.equal(ownDisposals, 2); assert.equal(meshDisposals, 3); assert.equal(materialDisposals, 2);
  const voxels = new Voxels(); voxels.block(0, 0, 0, 1, 1, 1, 0xffffff); const sibling = voxels.build();
  assert.equal(sibling.children[0].geometry, globalBox); assert.equal(sibling.children[0].geometry.hasAttribute("neighbourhoodBlocker"), false);
  sibling.children[0].dispose(); sibling.children[0].material.dispose(); globalBox.removeEventListener("dispose", sharedDisposed);
});

test("empty or replaced scenery stays valid and future blocker growth fails explicitly at its budget", () => {
  const empty = install([]); tickVillageNeighbourhoodVisibility(empty, point(0, 0, 0), cameraAt(1, 2, 3), .1);
  assert.equal(empty.userData.neighbourhoodVisibility.blockers, 0); assert.equal(empty.userData.neighbourhoodVisibility.faded, 0);
  assert.equal(withVillageNeighbourhoodVisibilityRestored(empty, () => 12), 12); empty.userData.dispose();
  const noCrown = install([{ id: "meadow-only", kind: "meadow", x: 0, z: 0, w: 3, d: 3, count: 2 }]);
  assert.ok(noCrown.children.every(mesh => !mesh.material.alphaHash)); noCrown.userData.dispose();
  const tooMany = new THREE.Group(); tooMany.userData.viewBlockers = Array.from({ length: 65 }, () => ({}));
  assert.throws(() => installVillageNeighbourhoodVisibility(tooMany), /at most 64 blockers/);
});
