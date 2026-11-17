import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeVillageWgsl, VILLAGE_WGSL_CACHE_REVISION } from '../src/rendering/village-wgsl-cache.js';

const pair = (id, { count = 2, binding = 0, group = 1, member = 'nodeUniform0', access = 'uniform', element = 'mat4x4<f32>' } = {}) => `struct NodeBuffer_${id}Struct {\n ${member} : array< ${element}, ${count} >\n};\n@binding( ${binding} ) @group( ${group} )\nvar<${access}> NodeBuffer_${id} : NodeBuffer_${id}Struct;`;
const shader = (id, options) => `${pair(id, options)}\nfn readBuffer() -> mat4x4<f32> { return NodeBuffer_${id}.nodeUniform0[0]; }`;

test('validated generated type/variable pairs normalize by declaration order without changing the numeric ABI', () => {
  const input = `${pair(87, { binding: 3, group: 0 })}\n${pair(4, { binding: 2, group: 1, member: 'nodeUniform7', element: 'vec4<f32>', count: 31 })}\nfn readIt() -> vec4<f32> { return NodeBuffer_87.nodeUniform0[0][0] + NodeBuffer_4.nodeUniform7[2]; }`;
  const output = canonicalizeVillageWgsl(input);
  assert.match(output, /struct VillageNodeBuffer_0Struct/); assert.match(output, /struct VillageNodeBuffer_1Struct/);
  assert.match(output, /var<uniform> VillageNodeBuffer_0 : VillageNodeBuffer_0Struct/);
  assert.match(output, /VillageNodeBuffer_1\.nodeUniform7\[2\]/);
  assert.deepEqual(output.match(/@(?:binding|group)\([^)]*\)/g), input.match(/@(?:binding|group)\([^)]*\)/g));
  assert.deepEqual(output.match(/nodeUniform\d+|array<[^\n]+/g), input.match(/nodeUniform\d+|array<[^\n]+/g));
  assert.equal(output.replaceAll('VillageNodeBuffer_0', 'NodeBuffer_87').replaceAll('VillageNodeBuffer_1', 'NodeBuffer_4'), input, 'only the validated generated identifier pair changes bytes');
  assert.equal(canonicalizeVillageWgsl(output), output);
});

test('separate allocation IDs and storage access retain the same shader while element types and array counts remain meaningful', () => {
  assert.equal(canonicalizeVillageWgsl(shader(19)), canonicalizeVillageWgsl(shader(10009)));
  assert.notEqual(canonicalizeVillageWgsl(shader(19)), canonicalizeVillageWgsl(shader(10009, { count: 3 })));
  const input = `${pair(17, { access: 'storage, read_write', element: 'atomic<u32>', count: 16 })}\nfn store() { atomicStore(&NodeBuffer_17.nodeUniform0[0], 1u); }`, output = canonicalizeVillageWgsl(input);
  assert.match(output, /var<storage, read_write> VillageNodeBuffer_0/); assert.match(output, /atomicStore\(&VillageNodeBuffer_0\.nodeUniform0\[0\], 1u\)/);
  assert.ok(output.includes('array< atomic<u32>, 16 >'));
});

test('lowercase names, member names, metadata, comments, strings and CRLF bytes are untouched', () => {
  const opaque = '// NodeBuffer_42 NodeBuffer_42Struct\r\n/* outer NodeBuffer_42 /* nested NodeBuffer_42Struct */ still opaque */\r\n"NodeBuffer_42 escaped\\\" NodeBuffer_42Struct";\r\n';
  const input = opaque + shader(42).replaceAll('\n', '\r\n') + '\r\nlet nodeBuffer_42 = 7;\r\nlet NodeBuffer_42Extra = nodeBuffer_42;';
  const output = canonicalizeVillageWgsl(input);
  assert.ok(output.startsWith(opaque)); assert.ok(output.endsWith('let nodeBuffer_42 = 7;\r\nlet NodeBuffer_42Extra = nodeBuffer_42;'));
  assert.equal(output.match(/\r\n/g).length, input.match(/\r\n/g).length);
  assert.match(output, /VillageNodeBuffer_0\.nodeUniform0/); assert.doesNotMatch(output.slice(opaque.length), /NodeBuffer_42Struct/);
});

test('unpaired, mismatched or nonstandard declarations leave the entire shader unchanged', () => {
  const cases = [
    shader(3).replace('NodeBuffer_3 :', 'NodeBuffer_4 :'),
    shader(3).replace('nodeUniform0 : array', 'nodeUniform0 : f32, extra : array'),
    shader(3).replace('@binding( 0 ) @group( 1 )', '@group( 1 ) @binding( 0 )'),
    shader(3).replace('var<uniform>', 'var<private>'),
    shader(3) + '\nvar<uniform> NodeBuffer_19 : OtherStruct;',
    shader(3) + '\nstruct NodeBuffer_44Struct { member: f32 };',
    `${shader(3)}\n${pair(3)}`,
  ];
  for (const input of cases) assert.equal(canonicalizeVillageWgsl(input), input);
});

test('local shadowing, member ambiguity, attributes and unexpected type uses bail out without partial edits', () => {
  for (const extra of [
    'fn shadow() { let NodeBuffer_3 = 2; }',
    'fn shadow(NodeBuffer_3: f32) {}',
    'fn member() { let value = other.NodeBuffer_3.nodeUniform0; }',
    'alias Other = NodeBuffer_3Struct;',
    'fn make() -> NodeBuffer_3Struct { return NodeBuffer_3Struct(); }',
    '@diagnostic(NodeBuffer_3.nodeUniform0) fn metadata() {}',
    'fn bare() { let value = NodeBuffer_3; }',
    'fn wrongMember() { let value = NodeBuffer_3.otherMember; }',
  ]) {
    const input = `${shader(3)}\n${extra}`; assert.equal(canonicalizeVillageWgsl(input), input);
  }
});

test('canonical collisions, Unicode identifiers and unterminated opaque text leave input unchanged', () => {
  for (const extra of ['let VillageNodeBuffer_0 = 1;', 'struct VillageNodeBuffer_0Struct { x:f32 };', 'let éNodeBuffer_3 = 1;', '/* open comment', '"open string']) {
    const input = `${shader(3)}\n${extra}`; assert.equal(canonicalizeVillageWgsl(input), input);
  }
  const withoutBuffers = 'fn noBuffers() -> f32 { return 1.; }'; assert.equal(canonicalizeVillageWgsl(withoutBuffers), withoutBuffers);
  assert.equal(VILLAGE_WGSL_CACHE_REVISION, '169'); assert.equal(canonicalizeVillageWgsl(shader(3), '170'), shader(3));
  assert.throws(() => canonicalizeVillageWgsl({ code: shader(3) }), /source text/);
});

test('bare carriage-return line endings do not hide real buffer references inside comments', () => {
  const input = `${pair(3)}\r// NodeBuffer_3 remains in this comment\rfn readBuffer() -> mat4x4<f32> { return NodeBuffer_3.nodeUniform0[0]; }`;
  const output = canonicalizeVillageWgsl(input);
  assert.ok(output.includes('// NodeBuffer_3 remains in this comment\r'));
  assert.ok(output.includes('return VillageNodeBuffer_0.nodeUniform0[0]'));
  const ambiguous = `${shader(3)}\n// comment\u2028NodeBuffer_3.nodeUniform0[0]`;
  assert.equal(canonicalizeVillageWgsl(ambiguous), ambiguous);
});

test('24 actual identical native vertex stages share one canonical stage while a different instance count retains its variant', async () => {
  globalThis.self ??= globalThis;
  const GPU = await import('three/webgpu');
  const { Voxels } = await import('../src/voxels.js');
  const { finishVoxels } = await import('../src/voxel-finish.js');
  const { createVillageNodeMaterials } = await import('../src/rendering/village-node-materials.js');
  const renderer = new GPU.WebGPURenderer({ canvas: { width: 1280, height: 720 } }); renderer.hasFeature = () => false;
  const materials = createVillageNodeMaterials({ renderer }), originals = new Set(), canonical = new Set(), groups = [];
  const generate = count => {
    const voxels = new Voxels(); for (let i = 0; i < count; i++) voxels.block(i, 0, 0, 3, 3, 3, 0x999999);
    const group = voxels.build(); groups.push(group); finishVoxels(group); const source = group.children[0];
    const mesh = new GPU.InstancedMesh(source.geometry, materials.convert(source.material, source), source.count); mesh.instanceMatrix = source.instanceMatrix; mesh.instanceColor = source.instanceColor;
    const builder = renderer.backend.createNodeBuilder(mesh, renderer); builder.camera = new GPU.PerspectiveCamera(); builder.scene = new GPU.Scene(); builder.lightsNode = GPU.lights([]); builder.build();
    return builder.vertexShader;
  };
  try {
    for (let i = 0; i < 24; i++) { const code = generate(2); originals.add(code); canonical.add(canonicalizeVillageWgsl(code, GPU.REVISION)); }
    assert.equal(originals.size, 24, 'the pinned builder includes each unique buffer allocation ID');
    assert.equal(canonical.size, 1, 'only the validated generated type/variable names differ');
    const different = canonicalizeVillageWgsl(generate(3), GPU.REVISION); assert.ok(!canonical.has(different), 'array capacities remain part of the pipeline variant');
    assert.match([...canonical][0], /array< mat4x4<f32>, 2 >/); assert.match(different, /array< mat4x4<f32>, 3 >/);
  } finally {
    materials.dispose(); for (const group of groups) for (const mesh of group.children) { mesh.dispose(); mesh.material.dispose(); }
  }
});
