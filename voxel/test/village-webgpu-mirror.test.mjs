import test from "node:test";
import assert from "node:assert/strict";
import * as GL from "three";
globalThis.self ??= globalThis;
const GPU = await import("three/webgpu");
const { createVillageGpuMirror } = await import("../src/rendering/village-webgpu-mirror.js");
const factory = () => ({ convert: () => new GPU.MeshBasicNodeMaterial(), sync() {} });

test("a separately owned paced shadow initializes once without dirtying the legacy light", () => {
  const source = new GL.Scene(), sun = new GL.DirectionalLight(0x99aaff, 1.2), camera = new GL.PerspectiveCamera();
  sun.castShadow = true; sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = false; source.add(sun, sun.target);
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const light = mirror.scene.children.find(o => o.isDirectionalLight);
  assert.ok(light instanceof GPU.DirectionalLight); assert.notEqual(light.constructor, sun.constructor);
  assert.equal(light.shadow.autoUpdate, false); assert.equal(light.shadow.needsUpdate, true);
  assert.equal(sun.shadow.needsUpdate, false);
  light.shadow.needsUpdate = false; mirror.sync(source, camera);
  assert.equal(light.shadow.needsUpdate, false, "normal pacing resumes after the first target update");
  sun.shadow.needsUpdate = true; mirror.sync(source, camera); assert.equal(light.shadow.needsUpdate, true);
  mirror.dispose();
});
test("presentation wrappers share instance data while camera and geometry lifetime stay separate", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera(45, 1.5, .2, 900), geometry = new GL.BoxGeometry();
  const mesh = new GL.InstancedMesh(geometry, new GL.MeshStandardMaterial(), 2); source.add(mesh);
  let sourceDisposals = 0; geometry.addEventListener("dispose", () => sourceDisposals++);
  const originalProjection = camera.projectionMatrix.toArray(), originalSystem = camera.coordinateSystem;
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const presentation = mirror.scene.children[0];
  assert.notEqual(presentation.geometry, geometry);
  assert.equal(presentation.geometry.getAttribute("position"), geometry.getAttribute("position"));
  assert.equal(presentation.instanceMatrix, mesh.instanceMatrix);
  assert.equal(mirror.camera.coordinateSystem, GPU.WebGPUCoordinateSystem);
  assert.equal(camera.coordinateSystem, originalSystem); assert.deepEqual(camera.projectionMatrix.toArray(), originalProjection);
  source.remove(mesh); mirror.sync(source, camera); assert.equal(mirror.stats().ownedGeometryViews, 0);
  mirror.dispose(); assert.equal(sourceDisposals, 0);
});
test("closed selection-line geometry retires when the selection is removed", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera();
  const geometry = new GL.BufferGeometry().setFromPoints([new GL.Vector3(), new GL.Vector3(1, 0, 0), new GL.Vector3(1, 1, 0)]);
  const line = new GL.LineLoop(geometry, new GL.LineBasicMaterial()); source.add(line);
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const own = mirror.scene.children[0].geometry; let retired = 0; own.addEventListener("dispose", () => retired++);
  assert.deepEqual([...own.index.array], [0, 1, 2, 0]);
  source.remove(line); mirror.sync(source, camera);
  assert.equal(mirror.stats().ownedLineGeometries, 0); assert.equal(retired, 1);
  mirror.dispose(); assert.equal(retired, 1);
});

test("animated fog values retain the GPU node-cache identity and never mutate source fog", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera(); source.fog = new GL.FogExp2(0x261435, .004);
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const ownFog = mirror.scene.fog; assert.notEqual(ownFog, source.fog);
  source.fog.density = .009; source.fog.color.set(0x392448); mirror.sync(source, camera);
  assert.equal(mirror.scene.fog, ownFog); assert.equal(ownFog.density, .009); assert.equal(ownFog.color.getHex(), 0x392448);
  source.fog = new GL.Fog(0x221133, 5, 90); mirror.sync(source, camera);
  assert.notEqual(mirror.scene.fog, ownFog); const rangeFog = mirror.scene.fog;
  source.fog.far = 80; mirror.sync(source, camera); assert.equal(mirror.scene.fog, rangeFog); assert.equal(rangeFog.far, 80);
  source.fog = null; mirror.sync(source, camera); assert.equal(mirror.scene.fog, null); mirror.dispose();
});

test("shared voxel geometry is synchronized once a frame and still follows edits", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera(), geometry = new GL.BoxGeometry();
  let scans = 0;
  geometry.attributes = new Proxy(geometry.attributes, { ownKeys(target) { scans++; return Reflect.ownKeys(target); } });
  for (let i = 0; i < 48; i++) source.add(new GL.Mesh(geometry, new GL.MeshBasicMaterial()));
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  assert.equal(scans, 1, "one attribute walk for 48 shared batches");
  const wrapper = mirror.scene.children[0].geometry;
  assert.ok(mirror.scene.children.every(mesh => mesh.geometry === wrapper));
  const uv = new GL.Float32BufferAttribute(new Float32Array(48), 2);
  geometry.setAttribute("uv", uv); geometry.deleteAttribute("normal"); geometry.setDrawRange(3, 9);
  scans = 0; mirror.sync(source, camera);
  assert.equal(scans, 1); assert.equal(wrapper.getAttribute("uv"), uv);
  assert.equal(wrapper.getAttribute("normal"), undefined); assert.deepEqual(wrapper.drawRange, { start: 3, count: 9 });
  mirror.dispose();
});

test("source transforms compose once and unchanged presentation matrices remain clean", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera(), parent = new GL.Group();
  const child = new GL.Mesh(new GL.BoxGeometry(), new GL.MeshBasicMaterial()); parent.add(child); source.add(parent);
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const ownParent = mirror.scene.children[0], ownChild = ownParent.children[0];
  let compositions = 0, multiplies = 0;
  const compose = child.updateMatrix.bind(child); child.updateMatrix = () => { compositions++; compose(); };
  for (const object of [ownParent, ownChild]) {
    const multiply = object.matrixWorld.multiplyMatrices.bind(object.matrixWorld);
    object.matrixWorld.multiplyMatrices = (...args) => { multiplies++; return multiply(...args); };
  }
  mirror.sync(source, camera); mirror.scene.updateMatrixWorld();
  assert.equal(compositions, 1); assert.equal(multiplies, 0);
  child.position.set(2, 3, 4); mirror.sync(source, camera);
  assert.deepEqual(ownChild.matrixWorld.toArray(), child.matrixWorld.toArray()); assert.equal(multiplies, 1);
  parent.position.set(-4, 1, 8); mirror.sync(source, camera);
  assert.deepEqual(ownChild.matrixWorld.toArray(), child.matrixWorld.toArray()); assert.equal(multiplies, 3);
  const other = new GL.Group(); other.position.set(12, 0, -3); source.add(other); other.add(child); mirror.sync(source, camera);
  assert.deepEqual(ownChild.matrixWorld.toArray(), child.matrixWorld.toArray()); mirror.dispose();
});

function animatedFigure(frames) {
  const actor = new GL.Group(), lean = new GL.Group(), plane = new GL.Mesh(frames[0], new GL.MeshBasicMaterial());
  plane.customDepthMaterial = new GL.MeshDepthMaterial();
  actor.userData.show = geometry => { plane.geometry = geometry; };
  actor.add(lean); lean.add(plane); return { actor, plane };
}

test("walking-frame wrappers survive repeated steps and retire with their actor", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera();
  const frames = Array.from({ length: 8 }, () => new GL.PlaneGeometry());
  const { actor, plane } = animatedFigure(frames); source.add(actor);
  let sourceDisposals = 0, wrapperDisposals = 0;
  for (const frame of frames) frame.addEventListener("dispose", () => sourceDisposals++);
  const wrappers = new Map(), mirror = createVillageGpuMirror(factory());
  for (let step = 0; step < 40; step++) {
    plane.geometry = frames[step % frames.length]; mirror.sync(source, camera);
    const wrapper = mirror.scene.children[0].children[0].children[0].geometry;
    if (!wrappers.has(plane.geometry)) { wrappers.set(plane.geometry, wrapper); wrapper.addEventListener("dispose", () => wrapperDisposals++); }
    else assert.equal(wrapper, wrappers.get(plane.geometry), "a later gait cycle reuses the same GPU frame");
  }
  assert.equal(mirror.stats().ownedGeometryViews, 8); assert.equal(wrapperDisposals, 0);
  assert.equal(mirror.stats().geometryViewsCreated, 8); assert.equal(mirror.stats().geometryViewsRetired, 0);
  source.remove(actor); mirror.sync(source, camera);
  assert.equal(mirror.stats().ownedGeometryViews, 0); assert.equal(wrapperDisposals, 8);
  assert.equal(mirror.stats().geometryViewsRetired, 8);
  mirror.dispose(); assert.equal(sourceDisposals, 0); assert.equal(wrapperDisposals, 8);
});

test("animated geometry retention is bounded and does not retain replaced scenery", () => {
  const source = new GL.Scene(), camera = new GL.PerspectiveCamera();
  const { actor, plane } = animatedFigure([new GL.PlaneGeometry()]); source.add(actor);
  const scenery = new GL.Mesh(new GL.BoxGeometry(), new GL.MeshBasicMaterial()); source.add(scenery);
  const mirror = createVillageGpuMirror(factory()); mirror.sync(source, camera);
  const oldScenery = mirror.scene.children[1].geometry; let retired = 0; oldScenery.addEventListener("dispose", () => retired++);
  scenery.geometry = new GL.BoxGeometry(2, 2, 2);
  for (let frame = 0; frame < 100; frame++) { plane.geometry = new GL.PlaneGeometry(); mirror.sync(source, camera); }
  assert.equal(mirror.stats().ownedGeometryViews, 65, "at most 64 actor frames plus the live scenery");
  assert.equal(retired, 1, "ordinary replaced geometry retires immediately");
  source.remove(actor, scenery); mirror.sync(source, camera); assert.equal(mirror.stats().ownedGeometryViews, 0);
  mirror.dispose();
});
