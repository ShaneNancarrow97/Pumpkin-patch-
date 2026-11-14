import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { NODES } from '../src/content/village.js';
import { villageNodePosition, villageNodeCandidates } from '../src/content/village-node-sites.js';
import { nearbyVillageResourceTargets, nearestVillageInteractionTarget } from '../src/village-nearby-targets.js';
import { PROXIMITY_REACH, proximityStrength } from '../src/village-proximity.js';
import { withinResidentReach, RESIDENT_TALK_REACH } from '../src/village-resident-interaction.js';

const options = { gatherReach: 2.1, talkReach: RESIDENT_TALK_REACH, withinResidentReach };
function state() {
  const s = M.freshState(); s.village.invited = true; s.earned = M.LEVELS[19].at;
  s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.homeLegacyThrough = 20;
  s.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
  return s;
}
const nearby = (s, p, stats) => nearbyVillageResourceTargets(NODES, p, n => villageNodePosition(s, n), id => M.nodeReady(s, id), PROXIMITY_REACH, stats);
const originalNodes = (s, p) => NODES.filter(n => M.nodeReady(s, n.id)).map(n => ({ type: 'village-node', id: n.id, ...villageNodePosition(s, n) }))
  .filter(t => proximityStrength(Math.hypot(t.x - p.x, t.z - p.z)) > 0);
function originalNearest(targets, p, followedStep) {
  const reachable = targets.map(t => ({ ...t, d: Math.hypot(t.x - p.x, t.z - p.z) }))
    .filter(t => t.type === 'village-folk' ? withinResidentReach(t.d, t.reach) : t.d < (t.type === 'village-node' ? options.gatherReach : options.talkReach))
    .sort((a, b) => a.d - b.d);
  return reachable.find(t => t.type === 'expansion-activity' && t.id === followedStep) ?? reachable.find(t => t.type === 'expansion-activity') ?? reachable[0] ?? null;
}

test('nearby controller nodes equal the original glowing candidates at every authored resource site', () => {
  const s = state(), positions = NODES.flatMap(villageNodeCandidates), stats = { passes: 0, nodePositionsChecked: 0, nodeEligibilityChecks: 0, nearbyNodes: 0 };
  for (const p of positions) assert.deepEqual(nearby(s, p, stats), originalNodes(s, p));
  assert.equal(stats.nodePositionsChecked, NODES.length * positions.length);
  assert.ok(stats.nodeEligibilityChecks < stats.nodePositionsChecked / 10, 'distant district and decoration eligibility is not queried');
  assert.equal(proximityStrength(PROXIMITY_REACH), 0);
  assert.ok(proximityStrength(PROXIMITY_REACH - .001) > 0, 'full original fade band is included');
});

test('gather cooldown, respawn cycle, new position and a closed district are observed immediately', () => {
  const s = state(), node = NODES.find(n => villageNodeCandidates(n).length > 1), initial = villageNodePosition(s, node);
  assert.ok(nearby(s, initial).some(t => t.id === node.id));
  s.village.nodes[node.id] = 20;
  assert.equal(nearby(s, initial).some(t => t.id === node.id), false);
  s.village.gatherCycles[node.id] = 1; s.village.nodes[node.id] = 0;
  const next = villageNodePosition(s, node); assert.notDeepEqual(next, initial);
  assert.deepEqual(nearby(s, next).find(t => t.id === node.id), { type: 'village-node', id: node.id, ...next });
  assert.deepEqual(nearby(s, initial), originalNodes(s, initial));
  s.village.invited = false;
  assert.deepEqual(nearby(s, next), []);
});

test('moving or rotating decoration changes nearby suppression without stale cached availability', () => {
  const s = state(), node = NODES.find(n => n.district === 'green'), p = villageNodePosition(s, node);
  s.village.decor.placed = [{ id: 'moth-lantern-string', instance: 1, x: p.x, z: p.z, rotation: 0 }];
  assert.equal(nearby(s, p).some(t => t.id === node.id), false);
  s.village.decor.placed[0].x += 5; s.village.decor.placed[0].rotation = 90;
  assert.ok(nearby(s, p).some(t => t.id === node.id));
  assert.deepEqual(nearby(s, p), originalNodes(s, p));
});

test('only positions inside the original strict glow boundary invoke eligibility', () => {
  const nodes = [{ id: 'edge', x: 7, z: 0 }, { id: 'near', x: 6.99, z: 0 }, { id: 'corner', x: 6, z: 6 }, { id: 'bad', x: NaN, z: 0 }, { id: 'missing' }];
  const calls = [], stats = { passes: 0, nodePositionsChecked: 0, nodeEligibilityChecks: 0, nearbyNodes: 0 };
  const targets = nearbyVillageResourceTargets(nodes, { x: 0, z: 0 }, n => n.id === 'missing' ? null : n, id => { calls.push(id); return true; }, PROXIMITY_REACH, stats);
  assert.deepEqual(calls, ['near']); assert.deepEqual(targets.map(t => t.id), calls);
  assert.deepEqual(stats, { passes: 1, nodePositionsChecked: 5, nodeEligibilityChecks: 1, nearbyNodes: 1 });
});

test('stable nearest interaction selection preserves priority, ties and each target reach', () => {
  const p = { x: 0, z: 0 }, targets = [
    { type: 'village-node', id: 'near-node', x: .2, z: 0 },
    { type: 'expansion-activity', id: 'other', name: 'Another story', x: 1, z: 0 },
    { type: 'expansion-activity', id: 'tracked', name: 'Tracked story', x: 2.5, z: 0 },
    { type: 'expansion-activity', id: 'tied', x: -1, z: 0 },
    { type: 'village-folk', id: 'rowan', x: 3.3, z: 0, reach: 3.3 },
    { type: 'village-node', id: 'edge', x: 2.1, z: 0 },
    { type: 'village-door', id: 'far-door', x: 3, z: 0 },
  ];
  for (const followedStep of ['tracked', 'other', 'missing', undefined]) for (let start = 0; start < targets.length; start++) {
    const subset = targets.slice(start), before = JSON.stringify(subset);
    assert.deepEqual(nearestVillageInteractionTarget(subset, p, { ...options, followedStep }), originalNearest(subset, p, followedStep));
    assert.equal(JSON.stringify(subset), before, 'input records retain identity and fields');
  }
  assert.equal(nearestVillageInteractionTarget([targets[4]], p, options)?.id, 'rowan', 'resident inclusive reach remains distinct');
  assert.equal(nearestVillageInteractionTarget(targets.slice(5), p, options), null, 'node and door reach remain strict');
});

test('single-pass choice matches the former stable sort across a varied deterministic target field', () => {
  const types = ['village-node', 'village-folk', 'village-page', 'village-door', 'expansion-activity', 'expansion-portal'];
  const targets = Array.from({ length: 240 }, (_, i) => ({ type: types[i % types.length], id: 'target-' + i, x: ((i * 17) % 31 - 15) * .3, z: ((i * 29) % 37 - 18) * .2, reach: 2.7 + i % 3 * .3 }));
  for (let i = 0; i < 80; i++) {
    const p = { x: Math.sin(i) * 3, z: Math.cos(i) * 4 }, followedStep = 'target-' + (i * 7 % targets.length);
    assert.deepEqual(nearestVillageInteractionTarget(targets, p, { ...options, followedStep }), originalNearest(targets, p, followedStep));
  }
});
