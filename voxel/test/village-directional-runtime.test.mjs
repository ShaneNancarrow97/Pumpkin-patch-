import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { DIRECTION_NAMES } from "../src/directional-sprite-math.js";

// Real actor code with tiny in-memory art manifests: verify texture ownership,
// lazy loading and camera-facing selection without needing a WebGL context.
test("village actors lazily load their own directions and restore the original greeting material", async () => {
  const cell = { w: 192, h: 256, ax: 96, ay: 248 }, frames = Array.from({ length: 64 }, (_, i) => ({ x: i % 8 * cell.w, y: Math.floor(i / 8) * cell.h, ...cell }));
  const legacy = { w: 1152, h: 256, rows: 230, height: 2.3, frames: Array.from({ length: 6 }, (_, i) => ({ x: i * cell.w, y: 0, ...cell })), actions: { idle: [0], walk: [1, 2, 3, 4], wave: [5], talk: [0] } };
  const directional = { w: 1536, h: 2048, cell, rows: 230, height: 2.3, frames, directions: [...DIRECTION_NAMES], walk: DIRECTION_NAMES.map((_, row) => Array.from({ length: 8 }, (_, phase) => row * 8 + phase)) };
  const originals = { elowen: { ...legacy, url: "test:elowen-front" }, rowan: { ...legacy, url: "test:rowan-front" } }, directions = { elowen: { ...directional, url: "test:elowen-turns" }, rowan: { ...directional, url: "test:rowan-turns" } };
  const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL("../src/village-sprite-actors.js", import.meta.url))], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", plugins: [{ name: "fixture-manifests", setup(plugin) {
    plugin.onResolve({ filter: /content\/(village|directional)-sprite-meta\.js$/ }, args => ({ path: args.path.includes("/directional-") ? "directional" : "village", namespace: "fixture" }));
    plugin.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: `export const ${args.path === "directional" ? "DIRECTIONAL_SPRITES" : "VILLAGE_SPRITES"}=${JSON.stringify(args.path === "directional" ? directions : originals)};`, loader: "js" }));
  } }] });
  const previousImage = globalThis.Image, loaded = [];
  globalThis.Image = class {
    set src(value) { loaded.push(value); this.width = value.endsWith("turns") ? 1536 : 1152; this.height = value.endsWith("turns") ? 2048 : 256; queueMicrotask(() => this.onload()); }
  };
  try {
    const actors = await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].text).toString("base64"));
    await actors.readyVillageSprites();
    assert.deepEqual(loaded.sort(), ["test:elowen-front", "test:rowan-front"]);
    const first = actors.createVillageSprite("elowen"), second = actors.createVillageSprite("elowen"), camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 4, 5);
    const oldMaterial = first.userData.mesh.material, oldDepth = first.userData.mesh.customDepthMaterial;
    await first.userData.directionalReady;
    assert.equal(loaded.filter(url => url === "test:elowen-turns").length, 1, "same resident shares its decoded atlas");
    assert.ok(!loaded.includes("test:rowan-turns"), "unused directional art is not decoded");
    actors.tickVillageSprite(first, { walking: true, heading: { x: 0, z: 1 }, phase: .625, camera });
    assert.equal(first.userData.atlas, "directional"); assert.equal(first.userData.frame, 5); assert.equal(first.userData.leadingLeg, "right");
    assert.notEqual(first.userData.mesh.material, oldMaterial); assert.notEqual(first.userData.mesh.customDepthMaterial, oldDepth);
    assert.equal(second.userData.mesh.material, oldMaterial, "switching one actor never repaints the other's idle");
    camera.position.set(-5, 4, 0);
    actors.tickVillageSprite(first, { walking: true, phase: .625, camera });
    assert.equal(first.userData.direction, "right"); assert.equal(first.userData.frame, 21); assert.equal(first.userData.leadingLeg, "right");
    actors.tickVillageSprite(first, { walking: false, mood: "wave", phase: .625, camera });
    assert.equal(first.userData.atlas, "legacy"); assert.equal(first.userData.frame, 5); assert.equal(first.userData.requestedDirection, "right");
    assert.equal(first.userData.mesh.material, oldMaterial); assert.equal(first.userData.mesh.customDepthMaterial, oldDepth);
    actors.tickVillageSprite(first, { walking: true, phase: .625, camera });
    assert.equal(first.userData.frame, 21, "greeting does not reset the movement heading or foot phase");
    assert.equal(first.children.length, 1); assert.equal(first.userData.lean.children.length, 1, "direction changes reuse the same render mesh");
  } finally { if (previousImage === undefined) delete globalThis.Image; else globalThis.Image = previousImage; }
});
