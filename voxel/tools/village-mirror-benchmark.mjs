// CPU-only mirror benchmark: no renderer, browser, GPU, simulation or quality
// setting is involved. Compare a saved mirror module with --compare <path>.
import * as GL from "three";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
globalThis.self ??= globalThis;
const GPU = await import("three/webgpu");
const { createVillageGpuMirror } = await import("../src/rendering/village-webgpu-mirror.js");
const arg = process.argv.indexOf("--compare");
const frames = 240, warmup = 32;

function fixture() {
  const scene = new GL.Scene(), camera = new GL.PerspectiveCamera(), actors = [];
  const box = new GL.BoxGeometry(), material = new GL.MeshStandardMaterial();
  for (let i = 0; i < 640; i++) {
    const mesh = new GL.Mesh(box, material); mesh.position.set(i % 32, Math.floor(i / 32), 0); scene.add(mesh);
  }
  for (let i = 0; i < 16; i++) {
    const actor = new GL.Group(), lean = new GL.Group(), cycle = Array.from({ length: 8 }, () => new GL.PlaneGeometry());
    actor.add(lean); actor.position.set(i, 0, 3); scene.add(actor);
    for (let layer = 0; layer < 5; layer++) { const mesh = new GL.Mesh(cycle[0], material); mesh.position.z = -layer * .008; if (!layer) mesh.customDepthMaterial = new GL.MeshDepthMaterial(); lean.add(mesh); }
    actor.userData.show = frame => { for (const mesh of lean.children) mesh.geometry = frame; };
    actors.push({ actor, cycle });
  }
  return { scene, camera, actors };
}

function measure(create) {
  const { scene, camera, actors } = fixture(), converted = new WeakMap(), ownedMaterials = new Set();
  const mirror = create({ convert(source, mesh) { if (!converted.has(mesh)) { const m = new GPU.MeshBasicNodeMaterial(); converted.set(mesh, m); ownedMaterials.add(m); } return converted.get(mesh); }, sync() {} });
  const durations = [], wrappers = new Set(); let retired = 0;
  for (let frame = 0; frame < frames + warmup; frame++) {
    for (const { actor, cycle } of actors) { actor.userData.show(cycle[Math.floor(frame / 4) % cycle.length]); actor.position.z += .01; }
    const start = performance.now(); mirror.sync(scene, camera); const duration = performance.now() - start;
    if (frame >= warmup) durations.push(duration);
    mirror.scene.traverse(object => {
      if (!object.geometry || wrappers.has(object.geometry)) return;
      wrappers.add(object.geometry); object.geometry.addEventListener("dispose", () => retired++);
    });
  }
  durations.sort((a, b) => a - b);
  const report = { measuredFrames: frames, sourceObjects: 752, geometryWrappersCreated: wrappers.size, geometryWrappersRetiredDuringWalk: retired,
    medianSyncMs: +durations[Math.floor(durations.length * .5)].toFixed(3), p95SyncMs: +durations[Math.floor(durations.length * .95)].toFixed(3), final: mirror.stats() };
  mirror.dispose(); for (const material of ownedMaterials) material.dispose(); return report;
}

const results = { scope: "Synthetic CPU mirror sync only; not device FPS or GPU timing", fixture: "640 shared static boxes; 16 walking figures with 5 layers and 8 authored frames" };
if (arg >= 0) {
  const filename = resolve(process.argv[arg + 1]);
  const source = (await readFile(filename, "utf8")).replaceAll('"three/webgpu"', JSON.stringify(import.meta.resolve("three/webgpu")));
  const baseline = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  results.baselineModule = pathToFileURL(filename).href;
  results.before = measure(baseline.createVillageGpuMirror);
}
results.after = measure(createVillageGpuMirror);
console.log(JSON.stringify(results, null, 2));
