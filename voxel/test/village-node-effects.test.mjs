import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLampGlow } from '../src/village-glow.js';
import { createVillageContactShadows } from '../src/village-contact-shadows.js';
import { createVillageLightAir } from '../src/village-light-air.js';

globalThis.self ??= globalThis;
const GPU = await import('three/webgpu');
const T = await import('three/tsl');
const { createVillageNodeEffects } = await import('../src/rendering/village-node-effects.js');

function fixtures() {
  const glow = createLampGlow([{ head: new THREE.Vector3(2, 3, 4), ground: new THREE.Vector3(2, 0, 4) }]);
  const contact = createVillageContactShadows();
  contact.update([{ position: { x: 1, y: 0, z: 2 }, groundY: 0 }]);
  const air = createVillageLightAir({ lamps: [{ x: 1, y: 3, z: 4 }] });
  return { glow, contact, air, meshes: [...glow.group.children, ...contact.group.children, ...air.group.children], dispose() { glow.dispose(); contact.dispose(); air.dispose(); } };
}
function build(material, source, { fog = false } = {}) {
  const renderer = new GPU.WebGPURenderer({ canvas: { width: 1280, height: 720 } });
  renderer.hasFeature = () => false;
  const mirror = source.isInstancedMesh ? new GPU.InstancedMesh(source.geometry, material, source.instanceMatrix.count) : new GPU.Mesh(source.geometry, material);
  if (source.isInstancedMesh) mirror.count = source.count;
  const builder = renderer.backend.createNodeBuilder(mirror, renderer);
  builder.camera = new GPU.PerspectiveCamera(48, 16 / 9, .1, 1000);
  builder.scene = new GPU.Scene();
  if (fog) {
    builder.scene.fog = new GPU.FogExp2(0x332244, .007);
    // Renderer Nodes.getForRender supplies this for actual scene renders.
    builder.fogNode = T.densityFog(T.color(0x332244), T.float(.007));
  }
  builder.build();
  return { vertex: builder.vertexShader, fragment: builder.fragmentShader, builder };
}

test('every instanced custom family generates native WGSL with its authored transform and alpha path', () => {
  const f = fixtures(), effects = createVillageNodeEffects();
  try {
    const families = [];
    for (const source of f.meshes) {
      const material = effects.convert(source.material, source);
      families.push(material.userData.villageNodeEffect);
      const generated = build(material, source, { fog: material.fog });
      assert.match(generated.vertex, /@vertex/);
      assert.match(generated.fragment, /@fragment/);
      assert.doesNotMatch(generated.vertex + generated.fragment, /gl_Position|gl_FragColor|#include/);
      assert.equal(material.vertexNode !== null, true);
      assert.equal(material.fragmentNode !== null, true);
      // No automatic InstanceNode exists alongside the explicit matrix columns.
      assert.doesNotMatch(generated.vertex, /var<uniform>[^;]*array<mat4/);
      if (['contact', 'air-fly'].includes(material.userData.villageNodeEffect)) assert.match(generated.fragment, /discard/);
      if (material.userData.villageNodeEffect === 'contact') {
        assert.match(generated.fragment, /v_positionView\.z/);
        const instancePosition = generated.vertex.indexOf('varyings.positionLocal = nodeVar');
        const finalFogPosition = generated.vertex.lastIndexOf('varyings.v_positionView = ');
        assert.ok(finalFogPosition > instancePosition, 'fog centre is explicitly assigned after the complete instance transform');
      }
      assert.equal(material.blending, source.material.blending);
      assert.equal(material.depthWrite, source.material.depthWrite);
      assert.equal(material.toneMapped, source.material.toneMapped);
    }
    assert.deepEqual(families, ['halo', 'pool', 'contact', 'shaft', 'air-fly']);
    assert.equal(effects.stats.materials, 5);
    assert.equal(effects.stats.geometries, 0);
    assert.equal(effects.stats.fallbackTextures, 0);
  } finally { effects.dispose(); f.dispose(); }
});

test('live source uniforms are copied, materials cache per object, and unknown custom shaders are rejected', () => {
  const f = fixtures(), effects = createVillageNodeEffects();
  try {
    const source = f.meshes[0], material = effects.convert(source.material, source);
    assert.equal(effects.convert(source.material, source), material);
    const generated = build(material, source);
    const timeGroup = generated.builder.uniforms.vertex.find(entry => entry.type === 'float' && entry.node.value === 0);
    assert.ok(timeGroup, 'time is a real native uniform');
    f.glow.tick(5, { density: .02 }); effects.sync();
    assert.equal(timeGroup.node.value, 5);
    assert.equal(source.material.uniforms.time.value, 5);
    assert.equal(effects.convert(new THREE.ShaderMaterial(), source), null);
    assert.equal(effects.convert(new THREE.MeshBasicMaterial(), source), null);
    source.instanceMatrix.needsUpdate = true;
    assert.doesNotThrow(() => effects.sync());
  } finally { effects.dispose(); f.dispose(); }
});

test('effects dispose only owned resources exactly once and retain source geometry/matrices', () => {
  const f = fixtures(), observed = [], effects = createVillageNodeEffects({ trackMaterial: value => observed.push(value) });
  let sourceDisposals = 0, ownDisposals = 0;
  try {
    const arrays = f.meshes.map(mesh => mesh.instanceMatrix.array);
    for (const source of f.meshes) {
      source.material.addEventListener('dispose', () => sourceDisposals++);
      source.geometry.addEventListener('dispose', () => sourceDisposals++);
      effects.convert(source.material, source).addEventListener('dispose', () => ownDisposals++);
    }
    effects.dispose(); effects.dispose(); effects.sync();
    assert.equal(ownDisposals, 5);
    assert.equal(observed.length, 5);
    assert.equal(sourceDisposals, 0);
    f.meshes.forEach((mesh, i) => assert.equal(mesh.instanceMatrix.array, arrays[i]));
    assert.throws(() => effects.convert(f.meshes[0].material, f.meshes[0]), /disposed/);
  } finally { f.dispose(); }
});

test('sky starts with a bounded fallback sampler and follows atlas-style palette/texture restoration', () => {
  const source = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    fragmentShader: 'float duskNoise(vec2 p) { return 0.; }',
    uniforms: {
      top: { value: new THREE.Color(.1, .08, .2) }, middle: { value: new THREE.Color(.2, .1, .3) },
      horizon: { value: new THREE.Color(.4, .2, .3) }, low: { value: new THREE.Color(.02, .01, .03) },
      moon: { value: new THREE.Vector3(-.4, .8, -.3).normalize() }, villageDuskTime: { value: 0 },
      villageDuskArt: { value: null }, villageDuskArtReady: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(600, 8, 6), source), effects = createVillageNodeEffects();
  const art = new THREE.DataTexture(new Uint8Array([80, 30, 110, 255]), 1, 1); art.colorSpace = THREE.SRGBColorSpace;
  let artDisposed = 0; art.addEventListener('dispose', () => artDisposed++);
  try {
    const material = effects.convert(source, mesh), generated = build(material, mesh);
    assert.equal(effects.stats.fallbackTextures, 1);
    assert.equal((generated.fragment.match(/textureSample\(/g) || []).length, 2);
    const textureNodes = generated.builder.nodes.filter(node => node.isTextureNode && node.uvNode !== null);
    assert.equal(textureNodes.length, 2);
    assert.ok(textureNodes.every(node => node.value.image.width === 1));
    source.uniforms.villageDuskArt.value = art; source.uniforms.villageDuskArtReady.value = 1;
    source.uniforms.middle.value.setRGB(.02, .01, .06); source.uniforms.villageDuskTime.value = 4.5; effects.sync();
    assert.ok(textureNodes.every(node => node.value === art));
    source.uniforms.villageDuskArt.value = null; source.uniforms.villageDuskArtReady.value = 0; effects.sync();
    assert.ok(textureNodes.every(node => node.value !== art && node.value.isDataTexture));
    effects.dispose(); assert.equal(artDisposed, 0);
  } finally { effects.dispose(); art.dispose(); source.dispose(); mesh.geometry.dispose(); }
});
