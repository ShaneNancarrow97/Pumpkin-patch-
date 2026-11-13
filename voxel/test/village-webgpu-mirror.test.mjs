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
