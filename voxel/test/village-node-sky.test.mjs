import test from 'node:test';
import assert from 'node:assert/strict';

// r169's browser bundle only reads self while its module initializes. Building
// the graph below never initializes a renderer, adapter, canvas context or GPU.
globalThis.self ??= globalThis;
const GPU = await import('three/webgpu');
const TSL = await import('three/tsl');
const { createVillageSkyNodeMaterial } = await import('../src/rendering/village-node-sky.js');

function fixture() {
  const art = new GPU.DataTexture(new Uint8Array([64, 32, 96, 255]), 1, 1);
  art.colorSpace = GPU.SRGBColorSpace;
  const source = new GPU.ShaderMaterial({
    name: 'village-sky', side: GPU.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new GPU.Color(.1, .08, .2) },
      middle: { value: new GPU.Color(.2, .1, .3) },
      horizon: { value: new GPU.Color(.4, .2, .3) },
      low: { value: new GPU.Color(.02, .01, .03) },
      moon: { value: new GPU.Vector3(-.4, .8, -.3).normalize() },
      villageDuskTime: { value: 0 }, villageDuskArt: { value: art },
      villageDuskArtReady: { value: 1 },
    },
  });
  const bindings = new Map();
  const bind = (ref, type) => {
    const node = type === 'texture' ? TSL.texture(ref.value) : TSL.uniform(ref.value.clone?.() ?? ref.value, type);
    bindings.set(ref, { node, type });
    return node;
  };
  const material = createVillageSkyNodeMaterial(source, bind);
  const geometry = new GPU.SphereGeometry(600, 8, 6);
  const mesh = new GPU.Mesh(geometry, material);
  return { source, art, bindings, material, geometry, mesh };
}

function build(mesh) {
  // Use the renderer's own bundled builder so TSL and builder share their
  // internal stack. Importing src/WGSLNodeBuilder alongside the bundle does not.
  const renderer = new GPU.WebGPURenderer({ canvas: { width: 1, height: 1 } });
  renderer.hasFeature = () => false;
  const builder = renderer.backend.createNodeBuilder(mesh, renderer);
  builder.camera = new GPU.PerspectiveCamera();
  builder.scene = new GPU.Scene();
  builder.build();
  return builder;
}

test('sky port borrows all eight exact uniform refs and preserves dome render state', () => {
  const { source, material, bindings, mesh, geometry, art } = fixture();
  assert.equal(bindings.size, 8);
  for (const [key, ref] of Object.entries(source.uniforms)) {
    assert.ok(bindings.has(ref), key);
    assert.equal(bindings.get(ref).type, key === 'villageDuskArt' ? 'texture' : key.startsWith('villageDusk') ? 'float' : 'vec3');
  }
  assert.equal(material.isNodeMaterial, true);
  assert.equal(material.side, GPU.BackSide);
  assert.equal(material.depthWrite, false);
  assert.equal(material.depthTest, source.depthTest);
  assert.equal(material.toneMapped, source.toneMapped);
  assert.equal(material.transparent, source.transparent);
  assert.equal(material.fog, false);
  assert.equal(material.lights, false);
  assert.equal(mesh.geometry, geometry);
  let sourceDisposed = 0;
  source.addEventListener('dispose', () => sourceDisposed++);
  art.addEventListener('dispose', () => sourceDisposed++);
  geometry.addEventListener('dispose', () => sourceDisposed++);
  material.dispose();
  assert.equal(sourceDisposed, 0);
});

test('full sky graph generates WGSL with original cloud, art, star and ridge budgets', () => {
  const { mesh } = fixture();
  const { fragmentShader: code } = build(mesh);
  assert.equal((code.match(/textureSample\(/g) || []).length, 2);
  const noise = code.slice(code.indexOf('fn villageDuskNoise'), code.indexOf('@fragment'));
  const main = code.slice(code.indexOf('@fragment'));
  assert.equal((noise.match(/villageDuskHash\(/g) || []).length, 4);
  assert.equal((main.match(/villageDuskNoise\(/g) || []).length, 5);
  assert.equal((main.match(/villageDuskHash\(/g) || []).length, 1);
  assert.equal((main.match(/\bsin\(/g) || []).length, 7);
  assert.match(main, /0\.108/);
  assert.match(main, /0\.205/);
  assert.match(main, /0\.9982/);
  assert.match(main, /pow\( [^,]+, 24\.0 \)/);
  assert.match(main, /pow\( [^,]+, 96\.0 \)/);
  assert.match(main, /vec3<f32>\( 0\.68, 0\.68, 0\.68 \)/);
  assert.match(main, /0\.12/, 'the shared cloud highlight knee reaches WGSL');
  assert.match(main, /0\.24/, 'the shared highlight shoulder reaches WGSL');
  assert.doesNotMatch(code, /NaN|undefined|textureLoad|textureStore/);
});

test('generated dome directions remain local and panorama UVs preserve native projection', () => {
  const { mesh, geometry, art } = fixture();
  const positions = geometry.getAttribute('position').array.slice();
  const { vertexShader, fragmentShader } = build(mesh);
  assert.match(vertexShader, /villageDuskDirection = normalize\( position \)/);
  assert.match(fragmentShader, /normalize\( villageDuskDirection \)/);
  assert.match(fragmentShader, /atan2\( \w+\.x, \( - \w+\.z \) \)/);
  assert.match(fragmentShader, /\/ 6\.28318530718 \) \* 2\.0/);
  assert.match(fragmentShader, /asin\( clamp\( \w+\.y, -1\.0, 1\.0 \) \) \/ 3\.14159265359/);
  assert.match(fragmentShader, /0\.001, 0\.999/);
  assert.match(fragmentShader, /smoothstep\( 0\.0, 0\.06/);
  assert.doesNotMatch(fragmentShader, /mat3x3|sRGBTransfer|LinearTosRGB|sRGBToLinear/);
  assert.deepEqual(geometry.getAttribute('position').array, positions);
  assert.equal(art.colorSpace, GPU.SRGBColorSpace);
});

test('clock, palette, readiness and texture bindings stay live without rebuilding or owning sources', () => {
  const { source, bindings, mesh } = fixture();
  const builder = build(mesh);
  const shader = builder.fragmentShader;
  source.uniforms.villageDuskTime.value = 41.25;
  source.uniforms.villageDuskArtReady.value = 0;
  source.uniforms.middle.value.setRGB(.06, .02, .08);
  const replacement = new GPU.DataTexture(new Uint8Array([32, 24, 64, 255]), 1, 1);
  replacement.colorSpace = GPU.SRGBColorSpace;
  source.uniforms.villageDuskArt.value = replacement;
  for (const [ref, { node, type }] of bindings) {
    if (type !== 'texture' && node.value?.copy) node.value.copy(ref.value);
    else node.value = ref.value;
  }
  assert.equal(bindings.get(source.uniforms.villageDuskTime).node.value, 41.25);
  assert.equal(bindings.get(source.uniforms.villageDuskArtReady).node.value, 0);
  assert.deepEqual(bindings.get(source.uniforms.middle).node.value, source.uniforms.middle.value);
  const textureNodes = builder.nodes.filter(node => node.isTextureNode && node.uvNode !== null);
  assert.equal(textureNodes.length, 2);
  for (const node of textureNodes) assert.equal(node.value, replacement);
  assert.equal(builder.fragmentShader, shader);
});
