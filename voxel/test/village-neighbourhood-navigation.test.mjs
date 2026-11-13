import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as M from '../src/model.js';
import { NODES, ROADS, ARRIVAL, GATES, PLAN_SCALE as K } from '../src/content/village.js';
import { villageNodeCandidates } from '../src/content/village-node-sites.js';
import { villageNeighbourhoodClusters, villageNeighbourhoodObstacles, villageNeighbourhoodPaths } from '../src/content/village-neighbourhoods.js';
import { villageCellFree, villageWalkObstacles, moveVillageWalker, villageDecorGroundClear, villageCameraReach, VILLAGE_WALK_RADIUS } from '../src/rules/village-navigation.js';
import { TOWN_SQUARE } from '../src/rules/village-spread.js';

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

test('every new garden path and the eastern pergola can be walked from the arrival', () => {
  const s = M.freshState(), obstacles = villageWalkObstacles(s), step = .75;
  const start = ARRIVAL.spawn.map(v => Math.round(v / step)), queue = [start], key = (x, z) => `${x},${z}`, seen = new Set([key(...start)]);
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (seen.has(k) || !villageCellFree(s, nx * step, nz * step, VILLAGE_WALK_RADIUS, obstacles)) continue;
      seen.add(k); queue.push([nx, nz]);
    }
  }
  const reaches = p => {
    const x = Math.round(p.x / step), z = Math.round(p.z / step);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (seen.has(key(x + dx, z + dz))) {
      const from = { x: (x + dx) * step, z: (z + dz) * step }, end = moveVillageWalker(s, from, p.x - from.x, p.z - from.z);
      if (Math.hypot(end.x - p.x, end.z - p.z) < 1e-7) return true;
    }
    return false;
  };
  for (const path of villageNeighbourhoodPaths()) {
    let p = { x: path.points[0][0] * K, z: path.points[0][1] * K };
    assert.ok(reaches(p), 'the path connects to the playable village at ' + JSON.stringify(path.points[0]));
    for (const [x, z] of path.points.slice(1)) {
      p = moveVillageWalker(s, p, x * K - p.x, z * K - p.z);
      assert.ok(Math.hypot(p.x - x * K, p.z - z * K) < 1e-7, `the owner walks the new path to ${x},${z}`);
    }
  }
  for (const [x, z] of [[124, 59.5], [124, 62], [124, 67.2], [134, 64]]) assert.ok(reaches({ x: x * K, z: z * K }), `eastern garden approach ${x},${z}`);
});

test('the native town park ends before every closed district and keeps the eastern boundary solid', () => {
  const s = M.freshState(); s.earned = M.LEVELS[19].at; s.progression.claimed = M.LEVELS.map(l => l.level); s.village.invited = true;
  for (const gate of GATES) assert.equal(villageCellFree(s, gate.x, gate.z), false, gate.id + ' remains closed');
  const from = { x: 141 * K, z: 72 * K }, end = moveVillageWalker(s, from, 12 * K, 0);
  assert.ok(end.x <= TOWN_SQUARE.x1 * K - VILLAGE_WALK_RADIUS + 1e-7, 'walking east stops at the park edge');
  assert.ok(end.x > 142 * K, 'the formerly unreachable eastern park is playable');
  assert.equal(villageCellFree(s, (TOWN_SQUARE.x1 + 1) * K, from.z), false, 'the park does not grant passage into the Moor');
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
