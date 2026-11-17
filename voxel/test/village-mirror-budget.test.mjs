import test from 'node:test';
import assert from 'node:assert/strict';
import * as GL from 'three';
import { finishVoxels } from '../src/voxel-finish.js';
import { createLampGlow } from '../src/village-glow.js';
globalThis.self ??= globalThis;
const { createVillageNodeMaterials } = await import('../src/rendering/village-node-materials.js');
const { createVillageNodeEffects } = await import('../src/rendering/village-node-effects.js');
const { createVillageGpuMirror } = await import('../src/rendering/village-webgpu-mirror.js');
function fixture() {
  const bridge = createVillageNodeMaterials(), mirror = createVillageGpuMirror(bridge), scene = new GL.Scene(), camera = new GL.PerspectiveCamera();
  return { bridge, mirror, scene, camera, sync() { mirror.sync(scene, camera); }, dispose() { mirror.dispose(); bridge.dispose(); for (const key of ['activeMaterials', 'activeBindings', 'activeEffectMaterials', 'activePointGeometries', 'derivedInstanceBytes', 'textureWrappers']) assert.equal(bridge.stats[key], 0, `disposed ${key}`); } };
}

test('shared layout inspection is once per synchronous mirror frame and observes edits in the next one', () => {
  const f = fixture(), geometry = new GL.BoxGeometry(), source = new GL.MeshBasicMaterial();
  try {
    for (let i = 0; i < 48; i++) f.scene.add(new GL.Mesh(geometry, source));
    f.sync(); assert.equal(f.bridge.stats.layoutScans, 1);
    const first = f.mirror.scene.children[0].material;
    f.sync(); assert.equal(f.bridge.stats.layoutScans, 2); assert.equal(f.mirror.scene.children[0].material, first);
    geometry.setAttribute('customChannel', new GL.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count), 1));
    f.sync(); assert.equal(f.bridge.stats.layoutScans, 3); assert.notEqual(f.mirror.scene.children[0].material, first);
    assert.equal(f.bridge.stats.activeMaterials, 48); assert.equal(f.bridge.stats.materialRetirements, 48);
  } finally { f.dispose(); geometry.dispose(); source.dispose(); }
});

test('layout batches clear on exceptions and standalone conversion notices same-geometry layout edits', () => {
  const bridge = createVillageNodeMaterials(), geometry = new GL.BoxGeometry(), material = new GL.MeshBasicMaterial(), mesh = new GL.Mesh(geometry, material);
  try {
    let first;
    assert.throws(() => bridge.batchLayouts(() => { first = bridge.convert(material, mesh); bridge.batchLayouts(() => bridge.convert(material, mesh)); throw Error('stop snapshot'); }), /stop snapshot/);
    assert.equal(bridge.stats.layoutScans, 1);
    geometry.attributes.uv.normalized = true;
    const next = bridge.convert(material, mesh); assert.notEqual(next, first);
    assert.equal(bridge.stats.layoutScans, 3, 'unbatched validation and construction each inspect current attributes');
    assert.equal(bridge.stats.activeMaterials, 1);
  } finally { bridge.dispose(); material.dispose(); geometry.dispose(); }
});

test('repeated scenery replacement retires materials and callbacks while the one live mesh stays current', () => {
  const f = fixture(), geometry = new GL.BoxGeometry(), sources = [];
  let previous = null, disposed = 0, reads = 0;
  try {
    for (let i = 0; i < 240; i++) {
      if (previous) f.scene.remove(previous);
      const material = new GL.MeshBasicMaterial();
      Object.defineProperty(material, 'opacity', { get() { reads++; return 1; }, set() {}, configurable: true });
      previous = new GL.Mesh(geometry, material); sources.push(material); f.scene.add(previous); f.sync();
      f.mirror.scene.children[0].material.addEventListener('dispose', () => disposed++);
    }
    reads = 0; f.sync();
    assert.equal(f.mirror.stats().mirroredObjects, 1); assert.equal(f.bridge.stats.activeMaterials, 1);
    assert.equal(f.bridge.stats.activeBindings, 1); assert.equal(disposed, 239);
    assert.equal(reads, 3, 'only the current source opacity is read, rather than all 240 old sources');
    f.scene.remove(previous); f.sync(); assert.equal(f.bridge.stats.activeMaterials, 0); assert.equal(f.bridge.stats.activeBindings, 0); assert.equal(disposed, 240);
  } finally { f.dispose(); geometry.dispose(); sources.forEach(source => source.dispose()); }
});

test('hidden attached sources and shared source materials survive another mesh retirement and re-add cleanly', () => {
  const f = fixture(), geometry = new GL.BoxGeometry(), source = new GL.MeshBasicMaterial(), hidden = new GL.Group();
  const a = new GL.Mesh(geometry, source), b = new GL.Mesh(geometry, source); let sourceDisposals = 0, retired = 0;
  source.addEventListener('dispose', () => sourceDisposals++);
  try {
    hidden.add(b); hidden.visible = false; f.scene.add(a, hidden); f.sync();
    const ownedA = f.mirror.scene.children[0].material, ownedB = f.mirror.scene.children[1].children[0].material;
    ownedA.addEventListener('dispose', () => retired++); assert.notEqual(ownedA, ownedB);
    f.scene.remove(a); source.color.set(0x663399); f.sync();
    assert.equal(retired, 1); assert.equal(f.bridge.stats.activeMaterials, 1); assert.equal(f.mirror.scene.children[0].children[0].material, ownedB);
    assert.equal(ownedB.color.getHex(), 0x663399); assert.equal(sourceDisposals, 0);
    f.scene.add(a); f.sync(); assert.notEqual(f.mirror.scene.children[1].material, ownedA); assert.equal(f.bridge.stats.activeMaterials, 2);
    assert.equal(f.mirror.scene.children[0].children[0].material, ownedB);
  } finally { f.dispose(); assert.equal(sourceDisposals, 0); geometry.dispose(); source.dispose(); }
});

test('all replaced material variants and derived instance arrays retire with their source mesh', () => {
  const f = fixture(), geometry = new GL.BoxGeometry(), material = new GL.MeshStandardMaterial(), mesh = new GL.InstancedMesh(geometry, material, 3), group = new GL.Group();
  group.add(mesh); finishVoxels(group); const materials = [material];
  try {
    f.scene.add(group); f.sync(); const old = f.mirror.scene.children[0].children[0].material; let retired = 0; old.addEventListener('dispose', () => retired++);
    assert.equal(f.bridge.stats.derivedInstanceBytes, 36);
    mesh.material = new GL.MeshStandardMaterial(); materials.push(mesh.material); finishVoxels(group); f.sync();
    assert.equal(f.bridge.stats.activeMaterials, 2);
    f.scene.remove(group); f.sync(); assert.equal(f.bridge.stats.activeMaterials, 0); assert.equal(f.bridge.stats.derivedInstanceBytes, 0); assert.equal(retired, 1);
    f.scene.add(group); f.sync(); assert.equal(f.bridge.stats.activeMaterials, 1); assert.equal(f.bridge.stats.derivedInstanceBytes, 36);
  } finally { f.dispose(); geometry.dispose(); materials.forEach(source => source.dispose()); }
});

test('effect leases are per mesh even with a shared source material and re-add after retirement', () => {
  const f = fixture(), glow = createLampGlow([{ head: new GL.Vector3(2, 3, 4), ground: new GL.Vector3(2, 0, 4) }]);
  const a = glow.group.children[0], b = a.clone(); let sourceDisposals = 0, retired = 0;
  a.material.addEventListener('dispose', () => sourceDisposals++);
  try {
    f.scene.add(a, b); f.sync(); const ownedA = f.mirror.scene.children[0].material, ownedB = f.mirror.scene.children[1].material; ownedA.addEventListener('dispose', () => retired++);
    assert.notEqual(ownedA, ownedB); assert.equal(f.bridge.stats.activeEffectMaterials, 2);
    f.scene.remove(a); f.sync(); assert.equal(retired, 1); assert.equal(f.bridge.stats.activeEffectMaterials, 1); assert.equal(f.mirror.scene.children[0].material, ownedB);
    f.scene.add(a); f.sync(); assert.notEqual(f.mirror.scene.children[1].material, ownedA); assert.equal(f.bridge.stats.activeEffectMaterials, 2);
    f.scene.remove(a, b); f.sync(); assert.equal(f.bridge.stats.activeEffectMaterials, 0); assert.equal(f.bridge.stats.activeBindings, 0); assert.equal(sourceDisposals, 0);
  } finally { f.dispose(); glow.dispose(); }
});

test('removed particle descriptors release owned material geometry and buffers without touching source points', () => {
  const f = fixture(), geometry = new GL.BufferGeometry().setAttribute('position', new GL.Float32BufferAttribute([1, 2, 3], 3)), material = new GL.PointsMaterial(), points = new GL.Points(geometry, material);
  let sourceDisposals = 0, ownedDisposals = 0;
  geometry.addEventListener('dispose', () => sourceDisposals++); material.addEventListener('dispose', () => sourceDisposals++);
  try {
    f.scene.add(points); f.sync(); const first = f.mirror.scene.children[0];
    first.geometry.addEventListener('dispose', () => ownedDisposals++); first.material.addEventListener('dispose', () => ownedDisposals++);
    f.scene.remove(points); f.sync(); assert.equal(ownedDisposals, 2); assert.equal(f.bridge.stats.activeEffectMaterials, 0); assert.equal(f.bridge.stats.activePointGeometries, 0);
    geometry.attributes.position.setX(0, 8); geometry.attributes.position.needsUpdate = true;
    f.scene.add(points); f.sync(); const next = f.mirror.scene.children[0]; assert.notEqual(next.geometry, first.geometry); assert.equal(next.geometry.attributes.pointPosition.getX(0), 8); assert.equal(sourceDisposals, 0);
  } finally { f.dispose(); assert.equal(ownedDisposals, 2); geometry.dispose(); material.dispose(); }
});

test('a failed effect conversion removes partial uniform bindings before a later retry', () => {
  const effects = createVillageNodeEffects(), source = new GL.ShaderMaterial({ fragmentShader: 'float duskNoise(vec2 p) { return 0.; }', uniforms: { villageDuskTime: { value: 0 }, villageDuskArt: { value: null }, top: { value: new GL.Color() } } }), mesh = new GL.Mesh(new GL.SphereGeometry(), source);
  try {
    assert.throws(() => effects.convert(source, mesh), /required source uniform/); assert.equal(effects.stats.materials, 0); assert.equal(effects.stats.bindings, 0); assert.equal(effects.stats.bufferBindings, 0);
    assert.doesNotThrow(() => effects.sync());
  } finally { effects.dispose(); mesh.geometry.dispose(); source.dispose(); }
});
