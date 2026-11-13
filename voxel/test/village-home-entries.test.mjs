import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import * as M from '../src/model.js';
import { ARRIVAL, PLAN_SCALE as K, PLOTS, ROADS } from '../src/content/village.js';
import { EXPANSION_INSIDES, expansionHomeOpen } from '../src/village-expansion-interiors.js';
import { buildBeyond, spreadVillage } from '../src/village-world.js';
import { createVillageExpansionWorld } from '../src/village-expansion-world.js';
import { groundHeight } from '../src/village-terrain.js';
import { GRANNY_DOOR } from '../src/village-expansion-spatial.js';
import { villageCellFree, villageWalkObstacles, moveVillageWalker, VILLAGE_WALK_RADIUS } from '../src/rules/village-navigation.js';
import { resolveVillageResidentInteraction } from '../src/village-resident-interaction.js';
import { readSaveFile } from '../src/save-file.js';

const NORMAL = { east: [1, 0], west: [-1, 0], south: [0, -1] };
const approach = (plan, distance) => { const [nx, nz] = NORMAL[plan.door.facing]; return { x: (plan.door.x + nx * distance) * K, z: (plan.door.z + nz * distance) * K }; };
function openState() {
  const s = M.freshState(); s.earned = M.LEVELS[19].at; s.progression.claimed = M.LEVELS.map(l => l.level);
  s.progression.homeLegacyThrough = 20; s.village.invited = true; s.village.toured = true;
  s.village.quests['two-doorbells'] = { step: 3, done: true, base: null };
  s.village.expansion.effects = M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...c.reward?.effects ?? []]);
  return s;
}

test('the six district home entries share the actual spread plot and road-spur anchors exactly once', () => {
  for (const plan of Object.values(EXPANSION_INSIDES).filter(p => p.host !== 'granny')) {
    const plot = PLOTS.find(p => p.resident === plan.host), spur = ROADS.find(r => r.plot === plot.id && r.kind === 'door-spur');
    assert.deepEqual([plan.door.x * K, plan.door.z * K], plot.door, plan.host + ' matches its exterior plot');
    assert.deepEqual([plan.door.x * K, plan.door.z * K], spur.points[0], plan.host + ' begins at its physical door-spur');
    assert.equal(plan.door.facing, plot.facing);
  }
  const granny = EXPANSION_INSIDES['granny-cottage'];
  assert.deepEqual([granny.door.x * K, granny.door.z * K], [-138, 182.25]);
  assert.equal(granny.door.x * K, GRANNY_DOOR.x);
  assert.equal(granny.door.z * K - GRANNY_DOOR.z, 2 * K, 'the resident/steps post remains two design units in front of the house');
});

test('corrected entry approaches face the real transformed exteriors, including Granny’s rendered doorway', () => {
  const s = openState(), before = JSON.stringify(M.saveData(s));
  const beyond = spreadVillage(buildBeyond({ closedGates: false })); beyond.scale.setScalar(K); beyond.updateMatrixWorld(true);
  const scene = new THREE.Scene(), pickMaterial = new THREE.MeshBasicMaterial();
  const world = createVillageExpansionWorld({ scene, state: s, pickMaterial, groundAt: (x, z) => groundHeight(x / K, z / K) * K });
  world.sync(); const acre = scene.getObjectByName('The Crooked Acre'); acre.updateMatrixWorld(true);
  assert.deepEqual(acre.position.toArray(), [-36, 0, -60], 'the house moves with the whole Acre, once');
  for (const [id, plan] of Object.entries(EXPANSION_INSIDES)) {
    const [nx, nz] = NORMAL[plan.door.facing], from = approach(plan, 3.2);
    const origin = new THREE.Vector3(from.x, groundHeight(plan.door.x, plan.door.z) * K + 1.4, -from.z);
    const ray = new THREE.Raycaster(origin, new THREE.Vector3(-nx, 0, nz), 0, 20);
    // Corvus and the Baron use their authored eastern plot entries. Their
    // original canvas/porch geometry stands farther inside those front yards.
    const hits = ray.intersectObject(id === 'granny-cottage' ? acre.children[3] : beyond, true);
    assert.ok(hits.length && hits[0].distance < 16, id + ' faces its actual exterior rather than an empty pre-spread position');
    if (id === 'granny-cottage') {
      const doorOrigin = approach(plan, 1.4), doorRay = new THREE.Raycaster(new THREE.Vector3(doorOrigin.x, 6.9, -doorOrigin.z), new THREE.Vector3(0, 0, -1), 0, 3);
      const doorHit = doorRay.intersectObject(acre.children[3], true)[0];
      assert.ok(doorHit); assert.ok(Math.abs(doorHit.point.x + 138) < 1e-7);
      assert.ok(-doorHit.point.z > 182.4 && -doorHit.point.z < 183, 'the physical front-door trim is directly behind the corrected entry');
    }
  }
  assert.equal(JSON.stringify(M.saveData(s)), before);
  world.dispose(); pickMaterial.dispose();
  const materials = new Set(); beyond.traverse(o => { o.dispose?.(); if (o.material) materials.add(o.material); });
  for (const material of materials) material.dispose();
});

test('all seven live entry, return and known-home approaches can be walked from arrival', () => {
  const s = openState(), boxes = villageWalkObstacles(s), step = .75, key = (x, z) => `${x},${z}`;
  // Stay just inside the walkable lanes rather than choosing the exact
  // half-grid seam of a terrain/ramp cell, where float drift can change sides.
  const coordinate = n => n * step + .03;
  const start = ARRIVAL.spawn.map(n => Math.round((n - .03) / step)), queue = [start], previous = new Map([[key(...start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, id = key(nx, nz);
      if (previous.has(id) || !villageCellFree(s, coordinate(nx), coordinate(nz), VILLAGE_WALK_RADIUS, boxes)) continue;
      // Match the real walker's short collision probes: free endpoints alone
      // can cut across the edge of a round fountain or a thin diagonal gap.
      const probes = Math.ceil(step / .18);
      if (Array.from({ length: probes - 1 }, (_, j) => (j + 1) / probes).some(t => !villageCellFree(s, coordinate(x + dx * t), coordinate(z + dz * t), VILLAGE_WALK_RADIUS, boxes))) continue;
      previous.set(id, [x, z]); queue.push([nx, nz]);
    }
  }
  const before = JSON.stringify(M.saveData(s));
  for (const [id, plan] of Object.entries(EXPANSION_INSIDES)) {
    const near = approach(plan, 1.4), exit = approach(plan, 3.2), last = [Math.round((exit.x - .03) / step), Math.round((exit.z - .03) / step)];
    assert.ok(previous.has(key(...last)), id + ' connects to arrival');
    const route = [];
    for (let at = last; at; at = previous.get(key(...at))) route.push({ x: coordinate(at[0]), z: coordinate(at[1]) });
    route.reverse().push(exit, near, exit);
    let point = { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] };
    for (const target of route) {
      const from = point;
      point = moveVillageWalker(s, point, target.x - point.x, target.z - point.z);
      assert.ok(Math.hypot(point.x - target.x, point.z - target.z) < 1e-6, id + ' follows the actual stepped surface route ' + JSON.stringify({ from, target, end: point }));
    }
    const resolved = resolveVillageResidentInteraction({ id: plan.host, state: s, view: { folk: {}, expansionTargets: [] }, position: exit, insides: EXPANSION_INSIDES, doorNormal: NORMAL });
    assert.equal(resolved.live, false); assert.equal(resolved.destination.hallId, id);
    assert.equal(resolved.destination.x, exit.x); assert.equal(resolved.destination.z, exit.z, 'known-home guidance shares the return approach');
    const [nx, nz] = NORMAL[plan.door.facing], hit = approach(plan, .5);
    assert.ok(Math.hypot(near.x - hit.x, near.z - hit.z) < 3, 'the visible door hit and enter prompt share inclusive reach');
    assert.ok(villageCellFree(s, (plan.door.x + nx * 1.4) * K, (plan.door.z + nz * 1.4) * K));
  }
  assert.equal(JSON.stringify(M.saveData(s)), before, 'checking or walking corrected entrances never transacts');
});

test('door correction preserves all existing home and district gates across version-20 restore', () => {
  assert.equal(M.STATE_VERSION, 20);
  const old = readSaveFile(fs.readFileSync(new URL('fixtures/save-file-v1-state20.json', import.meta.url), 'utf8'));
  assert.equal(old.ok, true);
  for (const s of [old.state, openState()]) {
    const before = JSON.stringify(M.saveData(s)), decisions = Object.values(EXPANSION_INSIDES).map(plan => expansionHomeOpen(s, plan));
    const restored = M.restoreState(M.saveData(s));
    assert.deepEqual(Object.values(EXPANSION_INSIDES).map(plan => expansionHomeOpen(restored, plan)), decisions);
    assert.equal(JSON.stringify(M.saveData(s)), before);
  }
  for (const plan of Object.values(EXPANSION_INSIDES)) {
    const s = openState(); assert.ok(expansionHomeOpen(s, plan));
    const flags = new Set(['home-' + plan.host, ...(plan.host === 'cinder' ? ['restaurant-opening'] : plan.host === 'granny' ? ['granny-listens'] : [])]);
    s.village.expansion.effects = s.village.expansion.effects.filter(id => !flags.has(id));
    assert.equal(expansionHomeOpen(s, plan), false, plan.host + ' keeps its saved restoration condition');
    const locked = M.freshState(); locked.village.expansion.effects = [...flags];
    assert.equal(expansionHomeOpen(locked, plan), false, plan.host + ' cannot bypass the district gate');
  }
});
