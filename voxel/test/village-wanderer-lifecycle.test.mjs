import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";
import * as THREE from "three";
import * as M from "../src/model.js";

// Load the actual render adapter with asset imports stubbed; no image decoding,
// WebGL or replacement copy of the lifecycle logic is needed for this check.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await build({ entryPoints: [path.join(root, "src/village-wanderers.js")], bundle: true, platform: "node", format: "esm", write: false, minify: true, logLevel: "silent",
  plugins: [{ name: "headless-art", setup(builder) { builder.onLoad({ filter: /\.(webp|png|mp3)$/ }, () => ({ contents: 'export default "headless-art"', loader: "js" })); } }] });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "village-wanderers-")), filename = path.join(temp, "adapter.mjs");
await fs.writeFile(filename, bundle.outputFiles[0].text);
const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => ({ getContext: () => ({}) }) } });
let createVillageWanderers;
try { ({ createVillageWanderers } = await import(pathToFileURL(filename))); }
finally { oldDocument ? Object.defineProperty(globalThis, "document", oldDocument) : delete globalThis.document; await fs.rm(temp, { recursive: true, force: true }); }

test("roamers use at most three private-material planes and cleanly hide, pause, clear and retry", t => {
  const state = M.freshState(), saved = JSON.stringify(M.saveData(state)), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  camera.position.set(87, 6, 10); camera.lookAt(87, 1, -5);
  let ready = false, created = 0, disposed = 0, geometryDisposals = 0;
  const frames = Array.from({ length: 4 }, () => new THREE.PlaneGeometry(1, 1.7)), texture = new THREE.DataTexture(new Uint8Array(16).fill(255), 2, 2);
  for (const frame of frames) frame.addEventListener("dispose", () => geometryDisposals++);
  t.after(() => { frames.forEach(frame => frame.dispose()); texture.dispose(); });
  const factory = () => {
    if (!ready) return null; created++;
    const sprite = new THREE.Group(), lean = new THREE.Group(), material = new THREE.MeshStandardMaterial({ map: texture }), mesh = new THREE.Mesh(frames[0], material);
    material.addEventListener("dispose", () => disposed++); lean.add(mesh); sprite.add(lean);
    sprite.userData = { walk: frames, shown: frames[0], show(frame) { mesh.geometry = frame; }, dispose() { material.dispose(); } };
    return sprite;
  };
  const crowd = createVillageWanderers({ scene, state: () => state, createVisitor: factory, groundAt: () => .35 });
  crowd.tick(.1, camera); assert.equal(crowd.status.count, 0, "wait for the real visitor sheets");
  ready = true; crowd.tick(.25, camera); crowd.tick(.25, camera);
  assert.ok(crowd.status.count >= 2 && crowd.status.count <= 3); assert.equal(scene.children.length, crowd.status.count);
  let meshes = 0;
  scene.traverse(mesh => { if (!mesh.isMesh) return; meshes++; assert.equal(mesh.castShadow, false); assert.ok(mesh.material.userData.villageRim); });
  assert.equal(meshes, crowd.status.count, "one colour plane per passer-by");
  assert.ok(scene.children.every(figure => figure.position.y === .35));
  for (let i = 0; i < 160 && !scene.children.some(root => root.children[0].userData.shown !== frames[0]); i++) crowd.tick(.1, camera);
  assert.ok(scene.children.some(root => root.children[0].userData.shown !== frames[0]), "distance advances the existing walking frames");
  const footFrames = scene.children.map(root => root.children[0].userData.shown);
  const beforePause = crowd.status.people.map(p => [p.x, p.z, p.distance]);
  crowd.tick(.2, camera, { paused: true }); assert.deepEqual(crowd.status.people.map(p => [p.x, p.z, p.distance]), beforePause);
  assert.ok(scene.children.every((root, i) => root.children[0].userData.shown === footFrames[i]), "pause keeps the exact walking pose");
  crowd.tick(.2, camera, { hidden: true }); assert.ok(crowd.status.people.every(p => !p.visible));
  assert.deepEqual(crowd.status.people.map(p => [p.x, p.z, p.distance]), beforePause);
  crowd.clear(); assert.equal(scene.children.length, 0); assert.equal(disposed, created); assert.equal(geometryDisposals, 0, "shared atlas frames stay alive");
  crowd.clear(); assert.equal(disposed, created, "clear is idempotent");
  crowd.tick(.1, camera); assert.ok(crowd.status.count >= 2 && crowd.status.count <= 3);
  crowd.clear(); assert.equal(disposed, created); assert.equal(JSON.stringify(M.saveData(state)), saved);
});
