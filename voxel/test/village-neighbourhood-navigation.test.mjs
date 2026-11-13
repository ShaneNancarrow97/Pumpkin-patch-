import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as M from '../src/model.js';
import { NODES, ROADS, ARRIVAL, PLAN_SCALE as K } from '../src/content/village.js';
import { villageNodeCandidates } from '../src/content/village-node-sites.js';
import { villageNeighbourhoodClusters, villageNeighbourhoodObstacles } from '../src/content/village-neighbourhoods.js';
import { villageCellFree, villageWalkObstacles, moveVillageWalker, villageDecorGroundClear, villageCameraReach } from '../src/rules/village-navigation.js';

test('the village dressing preserves every authored and saved-cycle resource position', () => {
  // Recorded before the new scenery: a gather cycle must still resolve to the
  // same point, including candidates not currently visible in the save.
  const candidates = NODES.map(n => ({ id: n.id, points: villageNodeCandidates(n) }));
  assert.equal(candidates.reduce((sum, n) => sum + n.points.length, 0), 676);
  assert.equal(createHash('sha256').update(JSON.stringify(candidates)).digest('hex'), 'd1d5703ef8acb22b8f389a7e1871dc6b92c3de9c68f146f7cb3ef6a4f6259c61');
  const obstacles = villageWalkObstacles(null);
  for (const n of NODES.filter(n => n.district === 'green')) for (const p of villageNodeCandidates(n)) {
    assert.ok(villageCellFree(null, p.x, p.z, .65, obstacles), n.id + ' retains its full pickup clearance');
  }
});

test('the recorded Green to Moonclock Square to Quarry walk still follows every original segment', () => {
  const s = M.freshState();
  s.earned = M.LEVELS[19].at; s.progression.claimed = M.LEVELS.map(l => l.level);
  s.village.invited = true; s.village.toured = true;
  s.village.quests.invitation = { step: 3, base: null, done: true };
  s.village.quests['two-doorbells'] = { step: 3, base: null, done: true };
  s.village.expansion.effects.push('copse-restored');
  // The exact nine waypoints in village-clarity/verification/perf-baseline.json.
  const route = [[87, 12], [91.2, 32.4], [98, 46], [87, 60], [94.8, 87], [88.8, 107.4], [87, 111], [87, 138], [87, 156]];
  let p = { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] };
  const saved = JSON.stringify(M.saveData(s));
  for (const [x, z] of route) {
    p = moveVillageWalker(s, p, x - p.x, z - p.z);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 1e-7, `original walk reaches ${x},${z}`);
  }
  assert.equal(JSON.stringify(M.saveData(s)), saved, 'walking does not change saved resources or furniture');
});

test('new solid features leave the full width of every established road clear', () => {
  for (const b of villageNeighbourhoodObstacles()) for (const road of ROADS) for (let i = 1; i < road.points.length; i++) {
    const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i], h = road.width / 2;
    const lane = { x0: Math.min(ax, bx) - h, x1: Math.max(ax, bx) + h, z0: Math.min(az, bz) - h, z1: Math.max(az, bz) + h };
    const overlaps = b.r !== undefined
      ? Math.hypot(Math.max(lane.x0, Math.min(lane.x1, b.x)) - b.x, Math.max(lane.z0, Math.min(lane.z1, b.z)) - b.z) < b.r
      : b.x0 < lane.x1 && b.x1 > lane.x0 && b.z0 < lane.z1 && b.z1 > lane.z0;
    assert.equal(overlaps, false, `${b.neighbourhood} keeps ${road.id} open`);
  }
});

test('saved furniture suppresses new scenery on reload and undo without losing the piece', () => {
  const piece = { instance: 'before-dressing', id: 'market-crates', x: 33 * K, z: 27 * K, rotation: 45 };
  const s = M.freshState(); s.village.decor.placed.push(piece);
  const all = villageNeighbourhoodClusters(), selected = villageNeighbourhoodClusters(s);
  const hidden = all.filter(c => !selected.some(visible => visible.id === c.id));
  assert.ok(hidden.length, 'an existing piece takes precedence over its new courtyard cluster');
  for (const c of hidden) assert.ok(!villageNeighbourhoodObstacles(s).some(b => b.neighbourhood === c.id), c.id + ' has no invisible collider');
  const restored = M.restoreState(M.saveData(s));
  assert.deepEqual(restored.village.decor.placed, [piece]);
  assert.equal(restored.village.decor.owned[piece.id] ?? 0, 0, 'the old piece stays placed rather than being put into storage');
  assert.deepEqual(villageNeighbourhoodClusters(restored).map(c => c.id), selected.map(c => c.id));
  const snapshot = { placed: [piece] };
  restored.village.decor.placed = []; restored.village.decor.owned[piece.id] = 1;
  assert.equal(M.restoreVillageDecor(restored, snapshot), true, 'undo uses the snapshot for scenery precedence');
  assert.deepEqual(restored.village.decor.placed, [piece]);
  assert.deepEqual(villageNeighbourhoodClusters(restored).map(c => c.id), selected.map(c => c.id));
});

test('native solid bodies block walking and new furniture while low scenery leaves the camera arm clear', () => {
  const native = villageNeighbourhoodObstacles();
  assert.ok(native.length > 0);
  for (const b of native) {
    const x = b.r !== undefined ? b.x : (b.x0 + b.x1) / 2, z = b.r !== undefined ? b.z : (b.z0 + b.z1) / 2;
    assert.equal(villageCellFree(null, x, z, 0), false, b.neighbourhood + ' is solid');
    assert.equal(villageDecorGroundClear('stool', x, z), false, b.neighbourhood + ' cannot be decorated through');
  }
  const lawn = native.find(b => {
    const x = b.r !== undefined ? b.x : (b.x0 + b.x1) / 2, z = b.r !== undefined ? b.z : (b.z0 + b.z1) / 2;
    return x < 34 * K && z > 42 * K && z < 75 * K;
  });
  assert.ok(lawn, 'a low solid furnishing dresses the western town lawn');
  const x = lawn.r !== undefined ? lawn.x : (lawn.x0 + lawn.x1) / 2, z = lawn.r !== undefined ? lawn.z : (lawn.z0 + lawn.z1) / 2;
  assert.equal(villageCameraReach({ x: x - 2, z }, { x: x + 2, z }), 1, 'the camera can pass over the low furnishings on the town lawns');
});
