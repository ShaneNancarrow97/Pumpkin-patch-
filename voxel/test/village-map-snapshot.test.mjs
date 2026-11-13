import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as M from '../src/model.js';
import { TOWN } from '../src/content/village-town-square.js';
import { PLAN_SCALE } from '../src/content/village.js';
import { EXPANSION_AREA_BY_ID } from '../src/content/village-expansion.js';
import { VILLAGE_GRADE } from '../src/picture-grade.js';
import { captureVillageMap, createVillageMapCamera, projectVillageMapPoint, villageMapSnapshotSignature, VILLAGE_MAP_SURFACE_BOUNDS, VILLAGE_MAP_SNAPSHOT_SIZE } from '../src/village-map-snapshot.js';
import { createVillageExpansionWorld } from '../src/village-expansion-world.js';

const size = VILLAGE_MAP_SNAPSHOT_SIZE;
const projection = camera => new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).toArray();

test('the actual-surface camera is north-up orthographic and frames the Acre and Square in full', () => {
  const camera = createVillageMapCamera(), matrix = projection(camera);
  assert.ok(camera.isOrthographicCamera); assert.ok(size.width * size.height <= 1_024_000);
  for (const a of Object.values(EXPANSION_AREA_BY_ID).filter(a => a.layer !== 'cave')) for (const x of [a.bounds[0], a.bounds[2]]) for (const z of [a.bounds[1], a.bounds[3]]) {
    const p = projectVillageMapPoint(matrix, size.width, size.height, { x, z, y: 0 });
    assert.ok(p.visible, `${a.id} corner ${x},${z} is visible`);
  }
  // The Square definition uses a rectangular footprint, checked separately from the six districts.
  for (const x of [(TOWN.cx - 24) * PLAN_SCALE, (TOWN.cx + 24) * PLAN_SCALE]) for (const z of [(TOWN.cz - 24) * PLAN_SCALE, (TOWN.cz + 24) * PLAN_SCALE]) assert.ok(projectVillageMapPoint(matrix, size.width, size.height, { x, z, y: 0 }).visible);
  const centre = { x: 50, z: 50, y: 0 }, south = projectVillageMapPoint(matrix, size.width, size.height, centre), north = projectVillageMapPoint(matrix, size.width, size.height, { ...centre, z: 90 }), east = projectVillageMapPoint(matrix, size.width, size.height, { ...centre, x: 90 });
  assert.ok(north.y < south.y); assert.ok(east.x > south.x); assert.equal(east.y, south.y);
  assert.ok(projectVillageMapPoint(matrix, size.width, size.height, { ...centre, y: 15 }).y < south.y, 'rooftops retain visible height');
  assert.equal(projectVillageMapPoint(matrix, size.width, size.height, { x: NaN, z: 5 }).visible, false);
  assert.equal(projectVillageMapPoint(matrix, size.width, size.height, { x: VILLAGE_MAP_SURFACE_BOUNDS.x1 + 1000, z: 5 }).visible, false);
});

test('image projection matches Three world coordinates, including default surface height and explicit roofs', () => {
  const camera = createVillageMapCamera(), matrix = projection(camera), point = { x: 107, z: 172 };
  for (const y of [7.5, 19]) {
    const expected = new THREE.Vector3(point.x, y, -point.z).project(camera), actual = projectVillageMapPoint(matrix, size.width, size.height, { ...point, ...(y === 19 ? { y } : {}) }, () => 7.5);
    assert.ok(Math.abs(actual.x - (expected.x + 1) * size.width / 2) < 1e-8);
    assert.ok(Math.abs(actual.y - (1 - expected.y) * size.height / 2) < 1e-8);
  }
});

test('snapshot invalidation follows structural saved changes and ignores clocks, people and inventory', () => {
  const state = M.freshState(), key = villageMapSnapshotSignature(state), before = JSON.stringify(state);
  assert.equal(JSON.stringify(state), before);
  state.village.clock += 30; state.village.friends.elowen.chatIn = 16; state.village.expansion.veins.example = 29; state.coins += 120; state.village.nodes[Object.keys(state.village.nodes)[0]] = 20;
  assert.equal(villageMapSnapshotSignature(state), key);
  state.village.built.R1 = true; assert.notEqual(villageMapSnapshotSignature(state), key);
  const built = villageMapSnapshotSignature(state); state.village.decor.placed.push({ instance: 'v1', id: 'bench', x: 1, z: 3, rotation: 90 }); assert.notEqual(villageMapSnapshotSignature(state), built);
  const decor = villageMapSnapshotSignature(state); state.village.expansion.effects.push('acre-shortcut'); assert.notEqual(villageMapSnapshotSignature(state), decor);
});

function fixture({ fail = null } = {}) {
  const state = M.freshState(), scene = new THREE.Scene(), playCamera = new THREE.PerspectiveCamera(48, 1.5, .2, 900);
  scene.userData = { grade: VILLAGE_GRADE, exposure: 1.2 }; scene.fog = new THREE.FogExp2(0x111111, .02);
  playCamera.position.set(8, 9, 10); playCamera.updateMatrixWorld();
  const initialTarget = new THREE.WebGLRenderTarget(4, 4), targets = new Map(), viewport = new THREE.Vector4(4, 7, 300, 200), scissor = new THREE.Vector4(8, 3, 90, 80);
  let entered = false, reads = 0, renders = 0, syncs = 0, encoded;
  const renderer = {
    target: initialTarget, face: 2, mip: 1, viewport: viewport.clone(), scissor: scissor.clone(), scissorTest: true,
    clearColour: new THREE.Color(0x234567), clearAlpha: .4, autoClear: false,
    toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.7, outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: { enabled: true, autoUpdate: true, needsUpdate: true }, xr: { enabled: true },
    getRenderTarget() { return this.target; }, getActiveCubeFace() { return this.face; }, getActiveMipmapLevel() { return this.mip; },
    getViewport(v) { return v.copy(this.viewport); }, getScissor(v) { return v.copy(this.scissor); }, getScissorTest() { return this.scissorTest; },
    getClearColor(v) { return v.copy(this.clearColour); }, getClearAlpha() { return this.clearAlpha; },
    setRenderTarget(t, face = 0, mip = 0) { this.target = t; this.face = face; this.mip = mip; if (t && t !== initialTarget && !targets.has(t)) { targets.set(t, false); t.addEventListener('dispose', () => targets.set(t, true)); } },
    setViewport(...v) { assert.equal(entered, false, 'target viewport is physical pixels and must not be rescaled by the play DPR'); this.viewport.copy(v[0]?.isVector4 ? v[0] : new THREE.Vector4(...v)); }, setScissor(v) { this.scissor.copy(v); }, setScissorTest(v) { this.scissorTest = v; },
    setClearColor(c, a) { this.clearColour.copy(c); this.clearAlpha = a; }, clear() {},
    render(subject, camera) { assert.ok(entered); renders++; if (subject === scene) { assert.ok(camera.isOrthographicCamera); assert.notEqual(camera, playCamera); } if (fail === 'render') throw new Error('render failed'); },
    readRenderTargetPixels(target, x, y, w, h, data) { reads++; assert.equal(target.texture.type, THREE.UnsignedByteType); data[0] = 19; data[(h - 1) * w * 4] = 41; },
  };
  const view = { scene, camera: playCamera, groundAt: () => 6, sync() { syncs++; }, withMapSurface(fn) { entered = true; const fog = scene.fog; scene.fog = null; try { return fn(); } finally { entered = false; scene.fog = fog; } } };
  const createCanvas = () => ({ getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData(data) { encoded = data.data; } }), toDataURL() { if (fail === 'encode') throw new Error('encode failed'); return 'data:image/png;base64,c25hcHNob3Q='; } });
  const status = () => ({ reads, renders, syncs, entered, targets, encoded });
  const verifyRestored = () => { assert.equal(renderer.target, initialTarget); assert.equal(renderer.face, 2); assert.equal(renderer.mip, 1); assert.deepEqual(renderer.viewport, viewport); assert.deepEqual(renderer.scissor, scissor); assert.equal(renderer.scissorTest, true); assert.equal(renderer.clearColour.getHex(), 0x234567); assert.equal(renderer.clearAlpha, .4); assert.equal(renderer.autoClear, false); assert.equal(renderer.toneMappingExposure, 1.7); assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping); assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace); assert.deepEqual(renderer.shadowMap, { enabled: true, autoUpdate: true, needsUpdate: true }); assert.equal(renderer.xr.enabled, true); assert.ok(scene.fog); assert.equal(entered, false); assert.ok([...targets.values()].every(Boolean), 'all temporary targets are disposed'); assert.deepEqual(playCamera.position.toArray(), [8, 9, 10]); };
  return { renderer, view, state, createCanvas, status, verifyRestored };
}

test('one actual scene draw and readback are cached; image rows and immutable pin projection stay aligned', () => {
  const f = fixture(), before = JSON.stringify(f.state), snapshot = captureVillageMap(f.renderer, f.view, f.state, f);
  f.verifyRestored(); assert.equal(snapshot.url, 'data:image/png;base64,c25hcHNob3Q='); assert.equal(f.status().renders, 2); assert.equal(f.status().reads, 1);
  assert.equal(f.status().encoded[0], 41); assert.equal(f.status().encoded[(size.height - 1) * size.width * 4], 19, 'WebGL rows are flipped into the PNG');
  const projected = snapshot.projectPoint({ x: 50, z: 60 }); f.view.camera.position.set(100, 200, 300); f.state.village.clock += 1;
  assert.equal(captureVillageMap(f.renderer, f.view, f.state, f), snapshot); assert.deepEqual(snapshot.projectPoint({ x: 50, z: 60 }), projected); assert.equal(f.status().reads, 1); assert.equal(f.status().syncs, 1);
  f.state.village.clock -= 1; assert.equal(JSON.stringify(f.state), before, 'capture never changes the save');
  f.state.village.expansion.effects.push('acre-shortcut'); assert.notEqual(captureVillageMap(f.renderer, f.view, f.state, f), snapshot); assert.equal(f.status().reads, 2);
});

for (const fail of ['render', 'encode']) test(`capture restores the renderer, visibility and resources after ${fail} failure`, () => {
  const f = fixture({ fail }); assert.throws(() => captureVillageMap(f.renderer, f.view, f.state, f), new RegExp(`${fail} failed`)); f.verifyRestored();
});

test('the real expansion surface adapter hides cave-local rooms and restores every visibility and Acre fade after failure', () => {
  const state = M.freshState(); state.village.invited = true; state.earned = M.LEVELS.at(-1).at; state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.homeLegacyThrough = 20;
  state.village.expansion.effects = M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]);
  state.village.quests['two-doorbells'] = { done: true };
  const scene = new THREE.Scene(), world = createVillageExpansionWorld({ scene, state, groundAt: () => 0, pickMaterial: new THREE.MeshBasicMaterial({ visible: false }) });
  world.sync(); assert.ok(world.enter('cave-shallows'));
  const before = JSON.stringify(state), rows = []; scene.traverse(o => rows.push([o, o.visible]));
  const acre = scene.getObjectByName('The Crooked Acre'), cave = scene.getObjectByName('cave-shallows'); assert.equal(acre.visible, false); assert.equal(cave.visible, true);
  const corn = scene.getObjectByName('Acre corn'); let faded; corn.traverse(o => { if (!faded && o.material) faded = o.material; }); faded.opacity = .35;
  assert.throws(() => world.withMapSurface(() => { assert.equal(acre.visible, true); assert.equal(cave.visible, false); assert.equal(faded.opacity, 1); assert.equal(world.active, 'cave-shallows'); throw new Error('snapshot stopped'); }), /snapshot stopped/);
  for (const [o, visible] of rows) assert.equal(o.visible, visible, o.name); assert.equal(faded.opacity, .35); assert.equal(world.active, 'cave-shallows'); assert.equal(JSON.stringify(state), before); world.dispose();
});
