import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import * as M from '../src/model.js';
import { PLAN_SCALE as K } from '../src/content/village.js';
import { Voxels, seeded } from '../src/voxels.js';
import { buildGrannyExterior } from '../src/village-granny-exterior.js';
import { createVillageExpansionWorld } from '../src/village-expansion-world.js';
import { GRANNY_DOOR, ACRE_PATHS, acreCellFree } from '../src/village-expansion-spatial.js';
import { spreadWorld } from '../src/rules/village-spread.js';

const sha = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const rows = group => {
  const list = [];
  group.traverse(mesh => { if (mesh.isInstancedMesh) for (let i = 0; i < mesh.count; i++) list.push([...mesh.instanceMatrix.array.slice(i * 16, i * 16 + 16), ...mesh.instanceColor.array.slice(i * 3, i * 3 + 3)]); });
  return list;
};
const model = () => { const voxels = new Voxels(); return { voxels, metadata: buildGrannyExterior(voxels, seeded(71)) }; };

test('Granny has deterministic recessed windows, joined door and planted detail within the old cottage budget', () => {
  const a = model(), b = model();
  assert.deepEqual(a, b);
  assert.ok(a.metadata.boxes <= 1481, 'the previous cottage used 1,481 boxes');
  assert.equal(a.metadata.boxes, a.voxels.solid.length + a.voxels.glow.length);
  assert.equal(a.voxels.glow.length, 12, 'two six-pane warm interior cards');
  for (const name of ['shell', 'roof', 'beams', 'stonework', 'windows', 'herb-boxes', 'door', 'chimney']) assert.ok(a.metadata.features[name].boxes > 0, name);
  assert.ok(a.metadata.bounds.x0 >= -73.7 && a.metadata.bounds.x1 <= -62.4);
  assert.ok(a.metadata.bounds.z0 >= 80.75 && a.metadata.bounds.z1 <= 90.25, 'original roof footprint');
  assert.ok(a.metadata.bounds.y1 < 11, 'only a modest cowl above the old chimney');
  for (const box of [...a.voxels.solid, ...a.voxels.glow]) assert.ok(box.slice(0, 6).every(Number.isFinite) && box.slice(3, 6).every(size => size > 0));
  for (const x of [-70.6, -65.4]) {
    const panes = a.voxels.glow.filter(box => Math.abs(box[0] / K - x) < .7);
    assert.equal(panes.length, 6);
    assert.ok(panes.every(box => -box[2] / K > 82), 'warmth sits behind the wall reveal');
    const curtains = a.voxels.solid.filter(box => [0x8f9482, 0xb5af91].includes(box[6]) && Math.abs(box[0] / K - x) < .7);
    assert.equal(curtains.length, 6);
    assert.ok(curtains.every(box => -box[2] / K > 81.95 && -box[2] / K < 82.09), 'folds remain inside the reveal');
  }
  assert.ok(a.metadata.features['herb-boxes'].z0 >= 81.5, 'low planters stay behind the existing body edge');
  const group = a.voxels.build({ detailShadows: false });
  assert.equal(group.children.length, 3, 'existing solid, fine-detail and glow batches');
  assert.equal(a.metadata.addedLights, 0); assert.equal(group.getObjectsByProperty('isLight', true).length, 0);
  group.traverse(object => object.material?.dispose());
});

test('cottage extraction preserves the shared random stream and the physical door approach', () => {
  const random = seeded(713), reference = seeded(713), voxels = new Voxels(), metadata = buildGrannyExterior(voxels, random);
  assert.equal(metadata.randomDraws, 1189, 'the former wall and roof colour draws');
  for (let i = 0; i < 1189; i++) reference();
  assert.equal(random(), reference(), 'later estate decoration cannot move');
  assert.deepEqual(spreadWorld(-68 * K, 79.5 * K), [GRANNY_DOOR.x, GRANNY_DOOR.z]);
  for (let z = 78; z <= 81; z += .25) assert.ok(acreCellFree(-68 * K, z * K), 'the existing stepped doorway remains approachable');
  assert.equal(acreCellFree(-68 * K, 84 * K), false, 'the original house collider remains solid');
});

test('the real Acre keeps its corn, shortcut, paths, steps, pumpkins, watchers and lamps byte-identical', () => {
  const scene = new THREE.Scene(), state = M.freshState(), pickMaterial = new THREE.MeshBasicMaterial();
  const before = JSON.stringify(M.saveData(state)), paths = JSON.stringify(ACRE_PATHS);
  const world = createVillageExpansionWorld({ scene, state, pickMaterial, groundAt: () => 4.5 }); world.sync();
  const acre = scene.getObjectByName('The Crooked Acre');
  assert.deepEqual(acre.position.toArray(), [-36, 0, -60], 'one unchanged whole-estate spread');
  const preserved = [
    [0, 824, 'e949b9f94ca517fd6b4af8cef45bba65b5a186fe6000fbc650ddd7fb62dc19b8'],
    [1, 5608, 'dade191e9e36129af648a504f3d2ad538e00cc6efe14e6dc9c542de91132dd4f'],
    [2, 40, '9ae656b825c7cbefc08024b08610897ab4431b9472ef01424081ca85ac111aa5'],
  ];
  for (const [index, count, hash] of preserved) { const list = rows(acre.children[index]); assert.equal(list.length, count); assert.equal(sha(list), hash); }
  const surrounding = rows(acre.children[3]).filter(row => { const x = row[12] / K, y = row[13] / K, z = -row[14] / K; return y < 3.9 && z < 81.25 || x < -75 || x > -60 || z > 95; });
  assert.equal(surrounding.length, 94);
  assert.equal(sha(surrounding), '4c8cbe8d282ea1507275323333157038ee6e4da79ef9f067c363bc7b1f84f3c7');
  assert.equal(acre.children[3].children.length, 3);
  assert.ok(rows(acre.children[3]).length <= 1575, 'the entire house-and-landmarks collector stays within its previous budget');
  assert.ok(acre.userData.grannyExterior.features.windows.boxes > 0);
  assert.equal(world.stats.addedLights, 0); assert.equal(world.lamps.length, 4);
  assert.equal(JSON.stringify(M.saveData(state)), before); assert.equal(JSON.stringify(ACRE_PATHS), paths);
  world.dispose(); pickMaterial.dispose();
});
