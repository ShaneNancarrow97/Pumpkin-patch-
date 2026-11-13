import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Voxels, ChunkedVoxels } from "../src/voxels.js";
import { VOXEL_AO, VOXEL_AO_FACES, createVoxelAOIndex, bakeVoxelAmbientOcclusion, packVoxelAO, unpackVoxelAO, remapVoxelAO } from "../src/rendering/voxel-ambient-occlusion.js";
import { installVoxelAmbientOcclusion, dressVoxelAOMaterial } from "../src/rendering/voxel-ao-material.js";
import { finishVoxels } from "../src/voxel-finish.js";

const cube = [.5, .5, .5, 1, 1, 1];
const values = (packed, offset = 0) => Array.from({ length: 24 }, (_, i) => unpackVoxelAO(packed, i, offset));
const top = boxes => values(bakeVoxelAmbientOcclusion(boxes).packed).slice(8, 12);

test("an isolated box and coplanar neighbours do not acquire invented AO", () => {
  assert.deepEqual(values(bakeVoxelAmbientOcclusion([cube]).packed), new Array(24).fill(0));
  assert.deepEqual(top([cube, [1.5, .5, .5, 1, 1, 1]]), [0, 0, 0, 0]);
});

test("side, diagonal and concave contacts shade the correct physical face corners", () => {
  assert.deepEqual(top([cube, [1.5, 1, .5, 1, 2, 1]]), [0, 1, 0, 1]);
  assert.deepEqual(top([cube, [1.5, 1, 1.5, 1, 2, 1]]), [0, 0, 0, 1]);
  assert.deepEqual(top([cube, [1.5, 1, .5, 1, 2, 1], [.5, 1, 1.5, 1, 2, 1]]), [0, 1, 1, 3]);
  assert.deepEqual(top([cube, [-.5, 1, .5, 1, 2, 1]]), [1, 0, 1, 0]);
});

test("packing preserves all 24 corners exactly in two Float32 words", () => {
  const brightest = packVoxelAO(new Array(24).fill(0)), darkest = packVoxelAO(new Array(24).fill(3));
  assert.deepEqual([...brightest], [0, 0]); assert.deepEqual([...darkest], [16777215, 16777215]);
  for (let phase = 0; phase < 24; phase++) {
    const corners = Array.from({ length: 24 }, (_, i) => (i * 7 + phase) % 4);
    assert.deepEqual(values(packVoxelAO(corners)), corners);
  }
  assert.equal(darkest.byteLength, VOXEL_AO.bytesPerInstance);
});

test("all unit-cube vertices map to their own normal face and signed tangents", () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1), p = geometry.getAttribute("position"), n = geometry.getAttribute("normal");
  const seen = new Set();
  for (let i = 0; i < p.count; i++) {
    const pos = [p.getX(i), p.getY(i), p.getZ(i)], normal = [n.getX(i), n.getY(i), n.getZ(i)], axis = normal.findIndex(v => Math.abs(v) > .5);
    const face = axis * 2 + (normal[axis] < 0 ? 1 : 0), [, , u, v] = VOXEL_AO_FACES[face];
    seen.add(face * 4 + (pos[u] > 0 ? 1 : 0) + (pos[v] > 0 ? 2 : 0));
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i));
});

test("90-degree transforms remap world occupancy back to local face/corner order", () => {
  const source = Array.from({ length: 24 }, (_, i) => (i * 5 + Math.floor(i / 4)) % 4), packed = packVoxelAO(source);
  const identity = [{ axis: 0, sign: 1 }, { axis: 1, sign: 1 }, { axis: 2, sign: 1 }];
  assert.deepEqual(values(remapVoxelAO(packed, identity)), source);
  const rotated = remapVoxelAO(packed, [{ axis: 2, sign: -1 }, { axis: 1, sign: 1 }, { axis: 0, sign: 1 }]);
  assert.equal(unpackVoxelAO(rotated, 3), source[23]);
  assert.equal(unpackVoxelAO(rotated, 19), source[2]);
});

test("a million-unit wall does not get rasterised into millions of grid cells", () => {
  const index = createVoxelAOIndex([cube, [0, 1, 0, 1e6, 2, 1e6]]);
  assert.ok(index.stats.entries <= 16); assert.equal(index.stats.levels, 2);
  assert.equal(index.occupied(10000, .5, 10000), true);
  assert.equal(index.occupied(1e6, .5, 1e6), false);
});

test("representative dense-grid candidate checks scale with samples, not all box pairs", () => {
  const boxes = [];
  for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 16; z++) boxes.push([x * .5, y * .5, z * .5, .5, .5, .5]);
  const { stats } = bakeVoxelAmbientOcclusion(boxes);
  assert.ok(stats.entries <= boxes.length * 8);
  assert.ok(stats.samples <= boxes.length * 72);
  assert.ok(stats.candidateTests < stats.samples * 8, JSON.stringify(stats));
  assert.equal(stats.bytes, boxes.length * 8);
});

function records(group) {
  const rows = new Map(); group.traverse(mesh => {
    if (!mesh.isInstancedMesh || !mesh.material.isMeshStandardMaterial) return;
    const ao = mesh.geometry.getAttribute("voxelAO");
    for (let i = 0; i < mesh.count; i++) {
      const a = mesh.instanceMatrix.array;
      rows.set([a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14]].join(","), [ao.getX(i), ao.getY(i)]);
    }
  }); return rows;
}

test("chunks and shadow-detail splits preserve the same AO neighbours and original draw batches", () => {
  const whole = new Voxels(), chunks = new ChunkedVoxels(1);
  for (const v of [whole, chunks]) {
    v.box(.9, 0, .1, .1, .1, .1, 0x887755);
    v.box(1, 0, .1, .1, .4, .1, 0x887755);
    v.box(.9, 0, .2, .1, .4, .1, 0x887755);
  }
  const a = whole.build({ ambientOcclusion: true, detailShadows: false, small: .2 });
  const b = chunks.build({ ambientOcclusion: true, detailShadows: false, small: .2 });
  assert.deepEqual(records(a), records(b));
  assert.ok([...records(b).values()].some(words => values(words).some(v => v > 0)));
  assert.equal(b.userData.voxelAOStats.instances, 3); assert.equal(b.userData.voxelAOStats.bytes, 24);
  assert.equal(a.children.length, 2, "AO does not create a draw batch");
});

test("AO is opt-in, preserves the shared BOX and excludes glowing boxes", () => {
  const v = new Voxels(); v.box(0, 0, 0, 1, 1, 1, 0x888888).box(1, 0, 0, 1, 2, 1, 0xffff88, true);
  const ordinary = v.build(), shared = ordinary.children[0].geometry, baked = v.build({ ambientOcclusion: true });
  assert.equal(shared.getAttribute("voxelAO"), undefined);
  assert.notEqual(baked.children[0].geometry, shared);
  assert.deepEqual(values(baked.children[0].geometry.getAttribute("voxelAO").array), new Array(24).fill(0), "emissive windows cannot occlude the solid");
  assert.equal(baked.children[1].geometry.getAttribute("voxelAO"), undefined);
  assert.equal(v.build().children[0].geometry, shared);
});

test("the completed-scope installer measures final placement and is idempotent", () => {
  const root = new THREE.Group(), a = new Voxels(), b = new Voxels();
  a.box(0, 0, 0, 1, 1, 1, 0x888888); b.box(1, 0, 0, 1, 2, 1, 0x888888);
  const one = a.build(), two = b.build(); root.add(one, two); two.position.x = 10;
  const stats = installVoxelAmbientOcclusion(root);
  assert.equal(stats.instances, 2); assert.equal(stats.bytes, 16);
  assert.deepEqual(values(one.children[0].geometry.getAttribute("voxelAO").array), new Array(24).fill(0), "moved-away wall is not the original local neighbour");
  assert.equal(installVoxelAmbientOcclusion(root).instances, 0);
});

test("hidden, fading and arbitrarily rotated batches cannot leave false permanent AO", () => {
  const root = new THREE.Group(), make = () => { const v = new Voxels(); v.box(0, 0, 0, 1, 1, 1, 0x888888); return v.build(); };
  const regular = make(), rotated = make(), hidden = make(), fading = make();
  rotated.rotation.y = Math.PI / 4; hidden.visible = false; fading.children[0].material.alphaHash = true;
  root.add(regular, rotated, hidden, fading);
  const stats = installVoxelAmbientOcclusion(root);
  assert.equal(stats.instances, 1); assert.equal(stats.skipped, 1);
  assert.equal(rotated.children[0].geometry.getAttribute("voxelAO"), undefined);
  assert.equal(hidden.children[0].geometry.getAttribute("voxelAO"), undefined);
  assert.equal(fading.children[0].geometry.getAttribute("voxelAO"), undefined);
});

test("WebGL AO composes previous hooks and shades only indirect lighting", () => {
  const material = new THREE.MeshStandardMaterial(); material.onBeforeCompile = shader => { shader.uniforms.sentinel = { value: 7 }; };
  material.customProgramCacheKey = () => "prior-finish";
  dressVoxelAOMaterial(material);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.sentinel.value, 7);
  assert.match(shader.vertexShader, /attribute vec2 voxelAO/);
  assert.match(shader.fragmentShader, /reflectedLight.indirectDiffuse \*= voxelAOFactor/);
  assert.match(shader.fragmentShader, /reflectedLight.indirectSpecular \*= voxelAOFactor/);
  assert.doesNotMatch(shader.fragmentShader, /\b(?:directDiffuse|directSpecular|diffuseColor) \*= voxelAOFactor/);
  assert.match(material.customProgramCacheKey(), /prior-finish\|voxel-neighbour-ao/);
  assert.equal(material.userData.voxelAO.strength, .24);
});

test("a later village finish retains opt-in AO exactly once", () => {
  const v = new Voxels(); v.box(0, 0, 0, 1, 1, 1, 0x888888);
  const group = v.build({ ambientOcclusion: true }); finishVoxels(group); finishVoxels(group);
  const material = group.children[0].material;
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /finTone/);
  assert.equal([...shader.fragmentShader.matchAll(/float voxelAOFactor =/g)].length, 1);
  assert.equal([...shader.vertexShader.matchAll(/attribute vec2 voxelAO/g)].length, 1);
  assert.match(material.customProgramCacheKey(), /voxel-finish-lit-fidelity-1\|voxel-neighbour-ao/);
});
