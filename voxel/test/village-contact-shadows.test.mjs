import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createVillageContactActorSource, createVillageContactShadows, createVillageHallContactGround, createVillageContactSurfaceIndex, villageContactOpacity, VILLAGE_CONTACT_SHADOW_BUDGET } from "../src/village-contact-shadows.js";
import { Voxels, seeded } from "../src/voxels.js";
import { hallShell } from "../src/village-models.js";
import { baronManor } from "../src/village-manor-interior.js";
import { grannyCottage } from "../src/village-granny-interior.js";
import { buildVillageNeighbourhoods } from "../src/village-neighbourhoods.js";
import { VILLAGE_NEIGHBOURHOODS } from "../src/content/village-neighbourhoods.js";
import { groundHeight } from "../src/village-terrain.js";

const entry = (x = 3, y = 2.04, z = -8, groundY = 2) => ({ position: new THREE.Vector3(x, y, z), groundY });
const pose = (mesh, i = 0) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix); return matrix; };

test("one bounded contact draw uses analytic alpha without lights, textures or a shadow pass", () => {
  const shadows = createVillageContactShadows(), mesh = shadows.group.children[0], material = mesh.material;
  shadows.update(Array.from({ length: 60 }, (_, i) => entry(i)));
  assert.equal(mesh.count, 32); assert.equal(shadows.stats.triangles, 64); assert.equal(shadows.group.children.length, 1);
  assert.equal(mesh.castShadow, false); assert.equal(mesh.receiveShadow, false); assert.equal(material.depthWrite, false); assert.equal(material.depthTest, true); assert.equal(material.transparent, true);
  assert.equal(material.map, undefined); assert.equal(shadows.stats.textures, 0); assert.equal(shadows.stats.lights, 0); assert.equal(VILLAGE_CONTACT_SHADOW_BUDGET.drawCalls, 1);
  assert.match(material.fragmentShader, /radius = dot\(q, q\)/); assert.match(material.fragmentShader, /fog_fragment/); assert.match(material.vertexShader, /instanceMatrix/);
  assert.equal(mesh.geometry.attributes.position.count, 4); shadows.dispose();
});

test("contacts follow world feet and measured ground while height softens or removes them", () => {
  const shadows = createVillageContactShadows(), mesh = shadows.group.children[0], alpha = mesh.geometry.getAttribute("contactOpacity");
  shadows.update([entry()]); assert.equal(mesh.count, 1);
  const matrix = pose(mesh), p = new THREE.Vector3().setFromMatrixPosition(matrix);
  assert.ok(p.distanceTo(new THREE.Vector3(3, 2.008, -8)) < 1e-6);
  assert.ok(Math.abs(alpha.array[0] - villageContactOpacity(.04)) < 1e-6);
  shadows.update([entry(3, 2.6, -8, 2)]); assert.ok(alpha.array[0] < .09);
  shadows.update([entry(3, 3.2, -8, 2)]); assert.equal(mesh.count, 0); assert.equal(shadows.group.visible, false);
  assert.equal(villageContactOpacity(NaN), 0); assert.equal(villageContactOpacity(-1), 0); assert.equal(villageContactOpacity(Infinity), 0);
  shadows.dispose();
});

test("hidden, absent and invalid actors leave no stale shadow; dimensions and capacity remain bounded", () => {
  const shadows = createVillageContactShadows({ capacity: 2 }), mesh = shadows.group.children[0];
  const hidden = { ...entry(), visible: false }, wide = { ...entry(), width: 500, depth: -12 };
  shadows.update([null, hidden, entry(NaN), { position: { x: 0, z: 0 }, groundY: 0 }, wide, entry(4), entry(5)]);
  assert.equal(mesh.count, 2); const size = new THREE.Vector3().setFromMatrixScale(pose(mesh)); assert.ok(Math.abs(size.x - 2.5) < 1e-6); assert.ok(Math.abs(size.z - .15) < 1e-6);
  shadows.update([hidden]); assert.equal(mesh.count, 0); assert.equal(shadows.stats.triangles, 0);
  shadows.update([entry()]); assert.equal(shadows.group.visible, true); shadows.hide(); assert.equal(shadows.group.visible, false); assert.equal(mesh.count, 0); shadows.dispose();
});

test("stationary people retain buffers and no contact update changes source transforms", () => {
  const shadows = createVillageContactShadows(), source = entry(), before = source.position.toArray(), mesh = shadows.group.children[0], alpha = mesh.geometry.getAttribute("contactOpacity");
  shadows.update([source]); const versions = [mesh.instanceMatrix.version, alpha.version, shadows.stats.uploads], geometry = mesh.geometry, material = mesh.material;
  for (let frame = 0; frame < 100; frame++) shadows.update([source]);
  assert.deepEqual([mesh.instanceMatrix.version, alpha.version, shadows.stats.uploads], versions);
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material); assert.deepEqual(source.position.toArray(), before);
  source.position.x += .3; shadows.update([source]); assert.ok(mesh.instanceMatrix.version > versions[0]); assert.equal(alpha.version, versions[1]); shadows.dispose();
});

test("existing actor tags provide owner, folk, hosts, companion and cosmetic contacts across rooms and caves", () => {
  const scene = new THREE.Scene(), source = createVillageContactActorSource();
  const add = (name, data, x, y, z, visible = true) => { const root = new THREE.Group(); root.name = name; Object.assign(root.userData, data); root.position.set(x, y, z); root.visible = visible; scene.add(root); return root; };
  const owner = add("", { kind: "person" }, 4, 2.04, -8), resident = add("resident-elowen", {}, 8, 2, -10), cosmetic = add("visitor-cosmetic", { villageWanderer: true }, 9, 2, -11);
  add("resident-rowan", {}, 10, 2, -12, false); add("static-house", {}, 12, 2, -14);
  const groundCalls = [], surface = (x, z) => { groundCalls.push([x, z]); return 2; };
  const outdoor = source.collect(scene, surface); assert.equal(outdoor.length, 3); assert.deepEqual(groundCalls, [[4, 8], [8, 10], [9, 11]]); assert.equal(outdoor[0].position, owner.position); assert.equal(outdoor[2].width, .92);
  const originalEntry = outdoor[0], originalArray = outdoor; assert.equal(source.collect(scene, surface), originalArray); assert.equal(originalArray[0], originalEntry);
  owner.position.set(4000, .2, 4); resident.visible = cosmetic.visible = false;
  const hall = source.collect(scene, () => .18); assert.equal(hall.length, 1); assert.equal(hall[0].groundY, .18);
  owner.position.set(0, -5.96, 20); const cave = source.collect(scene, (x, z) => { assert.equal(x, 0); assert.equal(z, -20); return -6; }); assert.equal(cave.length, 1); assert.equal(cave[0].groundY, -6);
  owner.visible = false; assert.equal(source.collect(scene, surface).length, 0);
});

test("real hall boards and Granny/Baron rugs receive contacts above their actual rendered surfaces", () => {
  const rooms = [
    { draw: v => hallShell(v, seeded(3), { w: 12, d: 10, boards: [0x775544], wall: 0x997755 }), x: .5, z: -.75 },
    { draw: grannyCottage, x: 0, z: -3.2 }, { draw: baronManor, x: 0, z: -4.7 },
  ];
  for (const room of rooms) {
    const voxels = new Voxels(); room.draw(voxels); const floor = createVillageHallContactGround(voxels.solid), built = voxels.build(); built.scale.setScalar(1.5); built.position.x = 4000; built.updateMatrixWorld(true);
    const x = 4000 + room.x * 1.5, z = room.z * 1.5, ray = new THREE.Raycaster(new THREE.Vector3(x, .5, z), new THREE.Vector3(0, -1, 0), 0, 1), top = ray.intersectObject(built, true)[0]?.point.y;
    assert.ok(Number.isFinite(top)); assert.ok(Math.abs(floor.heightAt(x, z) - top) < 1e-6, "contact query agrees with independent raycast onto real boards/rug");
    const shadows = createVillageContactShadows(); shadows.update([entry(x, .2, z, floor.heightAt(x, z))]);
    const plane = new THREE.Vector3().setFromMatrixPosition(pose(shadows.group.children[0])); assert.ok(plane.y > top); assert.ok(plane.y - top < .009); assert.equal(shadows.stats.count, 1);
    shadows.dispose(); const materials = new Set(); built.traverse(mesh => { if (mesh.isInstancedMesh) { mesh.dispose(); materials.add(mesh.material); } }); for (const material of materials) material.dispose();
  }
});

test("the pool releases its own resources exactly once", () => {
  const shadows = createVillageContactShadows(), mesh = shadows.group.children[0], scene = new THREE.Scene(); scene.add(shadows.group);
  let meshes = 0, geometries = 0, materials = 0;
  mesh.addEventListener("dispose", () => meshes++); mesh.geometry.addEventListener("dispose", () => geometries++); mesh.material.addEventListener("dispose", () => materials++);
  shadows.dispose(); shadows.dispose(); assert.deepEqual([meshes, geometries, materials], [1, 1, 1]); assert.equal(scene.children.length, 0); assert.equal(shadows.group.children.length, 0);
  shadows.update([entry()]); assert.equal(shadows.group.children.length, 0);
});

test("native path contacts clear the actual scaled gravel tops and replacement removes stale surfaces", () => {
  const ground = (x, z) => groundHeight(x / 1.5, z / 1.5) * 1.5, index = createVillageContactSurfaceIndex(ground), native = buildVillageNeighbourhoods(VILLAGE_NEIGHBOURHOODS), shadows = createVillageContactShadows();
  native.scale.setScalar(1.5); index.replace("native", native);
  assert.ok(index.stats.surfaces > 100 && index.stats.surfaces < 6232);
  for (const [dx, dz] of [[20.4, 51.6], [95.6, 58], [124.4, 58], [.4, 51.6]]) {
    const x = dx * 1.5, z = dz * 1.5, ray = new THREE.Raycaster(new THREE.Vector3(x, ground(x, z) + .3, -z), new THREE.Vector3(0, -1, 0), 0, 1), top = ray.intersectObject(native, true)[0]?.point.y, surface = index.heightAt(x, z);
    assert.ok(Number.isFinite(top)); assert.ok(Math.abs(surface - top) < 1e-6, "index matches independently rendered path height");
    shadows.update([entry(x, ground(x, z) + .04, -z, surface)]); assert.equal(shadows.stats.count, 1);
    assert.ok(new THREE.Vector3().setFromMatrixPosition(pose(shadows.group.children[0])).y > top, "gravel cannot depth-occlude the contact");
  }
  for (const mesh of native.children) mesh.getMatrixAt = () => { throw new Error("frame query must not scan instances"); };
  for (let i = 0; i < 100; i++) index.heightAt(30.6, 77.4);
  const replacement = buildVillageNeighbourhoods([]); index.replace("native", replacement); assert.equal(index.stats.surfaces, 0); assert.equal(index.heightAt(30.6, 77.4), ground(30.6, 77.4));
  index.dispose(); index.dispose(); assert.deepEqual(index.stats, { surfaces: 0, cells: 0 }); native.userData.dispose(); replacement.userData.dispose(); shadows.dispose();
});

test("Acre-style low path surfaces honour their parent translation/scale and never dispose shared cubes", () => {
  const v = new Voxels(); v.block(2, 3.005, -4, 2.7, .025, 2.7, 0x887755); const group = v.build(), parent = new THREE.Group(); parent.position.set(7, 0, 11); parent.scale.setScalar(1.5); parent.add(group);
  const index = createVillageContactSurfaceIndex(() => 4.5), geometry = group.children[0].geometry; let disposed = 0; const removed = () => disposed++; geometry.addEventListener("dispose", removed);
  index.replace("acre", group); assert.ok(Math.abs(index.heightAt(10, -5) - 4.545) < 1e-6);
  parent.position.x += 20; index.replace("acre", group); assert.equal(index.heightAt(10, -5), 4.5); assert.ok(Math.abs(index.heightAt(30, -5) - 4.545) < 1e-6);
  index.dispose(); assert.equal(disposed, 0); geometry.removeEventListener("dispose", removed); group.children[0].dispose(); group.children[0].material.dispose();
});
