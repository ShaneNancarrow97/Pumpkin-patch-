// Compare exact source work against the previous release; this is not device FPS.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as GL from 'three';
globalThis.self ??= globalThis;
const base = process.argv[2] ?? '5046b4bab3f30fad978f8fc33100230b6fd0f65d';
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'village-mirror-baseline-'));
const root = new URL('../', import.meta.url), names = ['village-node-materials.js', 'village-node-effects.js', 'village-webgpu-mirror.js'];
try {
  for (const name of names) {
    const original = new URL(`src/rendering/${name}`, root);
    let source = execFileSync('git', ['show', `${base}:voxel/src/rendering/${name}`], { cwd: root, encoding: 'utf8' });
    source = source.replace(/from (["'])([^"']+)\1/g, (_, quote, specifier) => {
      const local = names.includes(path.basename(specifier)) && specifier.startsWith('./');
      const url = local ? pathToFileURL(path.join(temporary, path.basename(specifier))).href : specifier.startsWith('.') ? new URL(specifier, original).href : import.meta.resolve(specifier);
      return `from ${quote}${url}${quote}`;
    });
    await fs.writeFile(path.join(temporary, name), source);
  }
  const currentMaterials = await import('../src/rendering/village-node-materials.js'), currentMirror = await import('../src/rendering/village-webgpu-mirror.js');
  const baselineMaterials = await import(pathToFileURL(path.join(temporary, 'village-node-materials.js'))), baselineMirror = await import(pathToFileURL(path.join(temporary, 'village-webgpu-mirror.js')));
  function run(materials, mirrors) {
    let bridge = materials.createVillageNodeMaterials(), mirror = mirrors.createVillageGpuMirror(bridge);
    const scene = new GL.Scene(), camera = new GL.PerspectiveCamera(), geometry = new GL.BoxGeometry(), sources = [];
    let scans = 0, reads = 0, disposed = 0;
    geometry.attributes = new Proxy(geometry.attributes, { ownKeys(target) { scans++; return Reflect.ownKeys(target); } });
    function material() { const m = new GL.MeshBasicMaterial(); Object.defineProperty(m, 'opacity', { get() { reads++; return 1; }, set() {}, configurable: true }); sources.push(m); return m; }
    try {
      const shared = material();
      for (let i = 0; i < 240; i++) scene.add(new GL.Mesh(geometry, shared));
      mirror.sync(scene, camera); scans = 0; mirror.sync(scene, camera);
      const sharedLayouts = { liveMeshes: 240, geometryAttributeEnumerationsPerSync: scans };
      scene.clear(); mirror.dispose(); bridge.dispose();
      bridge = materials.createVillageNodeMaterials(); mirror = mirrors.createVillageGpuMirror(bridge);
      const convertedAtStart = bridge.stats.converted;
      let previous = null;
      for (let i = 0; i < 240; i++) {
        if (previous) scene.remove(previous);
        previous = new GL.Mesh(geometry, material()); scene.add(previous); mirror.sync(scene, camera);
        mirror.scene.children[0].material.addEventListener('dispose', () => disposed++);
      }
      reads = 0; mirror.sync(scene, camera);
      const replacements = { replacementFrames: 240, liveSourceMeshes: scene.children.length, liveMirroredObjects: mirror.stats().mirroredObjects, materialsCreatedDuringChurn: bridge.stats.converted - convertedAtStart, retiredChurnMaterials: disposed, retainedChurnMaterials: bridge.stats.converted - convertedAtStart - disposed, allRetainedSourceOpacityReadsPerSync: reads };
      return { sharedLayouts, replacements };
    } finally { mirror.dispose(); bridge.dispose(); geometry.dispose(); for (const source of sources) source.dispose(); }
  }
  const report = { baselineCommit: base, scope: 'Two isolated synchronous JavaScript bridge fixtures; no GPU, frame-rate, image-quality or physical-device claim.', before: run(baselineMaterials, baselineMirror), after: run(currentMaterials, currentMirror) };
  console.log(JSON.stringify(report, null, 2));
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
