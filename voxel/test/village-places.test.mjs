import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { ARRIVAL, PLAN_SCALE as K } from '../src/content/village.js';
import { VILLAGE_PLACES, villagePlaces, villagePlaceAt, resolveVillagePlaceDestination } from '../src/content/village-places.js';
import { villageNeighbourhoodClusters, villageNeighbourhoodPaths } from '../src/content/village-neighbourhoods.js';
import { villageCellFree, villageWalkObstacles, moveVillageWalker, VILLAGE_WALK_RADIUS } from '../src/rules/village-navigation.js';

const destination = (s, id) => {
  const obstacles = villageWalkObstacles(s);
  return resolveVillagePlaceDestination(s, id, (x, z) => villageCellFree(s, x, z, VILLAGE_WALK_RADIUS, obstacles));
};
const onPath = (point, path) => path.points.slice(1).some(([bx, bz], i) => {
  const [ax, az] = path.points[i], dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((point.x / K - ax) * dx + (point.z / K - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(point.x / K - ax - dx * t, point.z / K - az - dz * t) < 1e-8;
});

test('all five public garden routes use the native path grid exactly once', () => {
  const s = M.freshState(), before = JSON.stringify(M.saveData(s));
  assert.equal(VILLAGE_PLACES.length, 5);
  for (const place of VILLAGE_PLACES) {
    const target = destination(s, place.id);
    assert.equal(target.x, place.anchor[0] * K, place.id);
    assert.equal(target.z, place.anchor[1] * K, place.id);
    assert.equal(target.realm, 'surface');
    assert.ok(villageNeighbourhoodPaths(s).some(path => onPath(target, path)), 'the route ends on authored paving: ' + place.id);
    assert.equal(villagePlaceAt(target.x, target.z)?.id, place.id);
  }
  assert.equal(JSON.stringify(M.saveData(s)), before);
  for (const id of ['__proto__', 'missing', 'green']) assert.equal(destination(s, id), null);
  assert.equal(villagePlaceAt(NaN, 0), null);
});

test('every public garden destination is reached from arrival through actual stepped walking', () => {
  const s = M.freshState(), obstacles = villageWalkObstacles(s), step = .75;
  const key = (x, z) => `${x},${z}`, start = ARRIVAL.spawn.map(v => Math.round(v / step));
  const queue = [start], visited = new Map([[key(...start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, id = key(nx, nz);
      if (visited.has(id) || !villageCellFree(s, nx * step, nz * step, VILLAGE_WALK_RADIUS, obstacles)) continue;
      visited.set(id, [x, z]); queue.push([nx, nz]);
    }
  }
  const before = JSON.stringify(M.saveData(s));
  for (const place of VILLAGE_PLACES) {
    const target = destination(s, place.id), last = [Math.round(target.x / step), Math.round(target.z / step)];
    assert.ok(visited.has(key(...last)), place.id + ' connects to arrival');
    const route = [];
    for (let at = last; at; at = visited.get(key(...at))) route.push({ x: at[0] * step, z: at[1] * step });
    route.reverse().push(target);
    let point = { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] };
    for (const next of route) {
      point = moveVillageWalker(s, point, next.x - point.x, next.z - point.z);
      assert.ok(Math.hypot(point.x - next.x, point.z - next.z) < 1e-7, place.id + ' follows a walkable route');
    }
  }
  assert.equal(JSON.stringify(M.saveData(s)), before, 'a public garden walk grants no story, items or saved progress');
});

test('blocked public paths get a nearby live approach without changing owned decoration', () => {
  for (const place of VILLAGE_PLACES) {
    const s = M.freshState(), initial = destination(s, place.id);
    const piece = { instance: 'garden-approach-' + place.id, id: 'market-crates', x: initial.x, z: initial.z, rotation: 0 };
    s.village.decor.placed.push(piece);
    const saved = M.saveData(s), before = JSON.stringify(saved), target = destination(s, place.id);
    assert.ok(target, place.id + ' retains a public approach');
    assert.ok(Math.hypot(target.x - initial.x, target.z - initial.z) > 0, place.id + ' avoids the saved piece');
    assert.ok(Math.hypot(target.x - initial.x, target.z - initial.z) <= 3, place.id + ' stays nearby');
    assert.ok(villageCellFree(s, target.x, target.z));
    assert.equal(JSON.stringify(M.saveData(s)), before, 'route selection preserves the saved piece');
    assert.equal(resolveVillagePlaceDestination(s, place.id, () => false), null, 'an entirely occupied approach has no invented target');
  }
});

test('saved courtyard decoration retains its live approach and public-place copy on reload and undo', () => {
  // Native park lawns retain the existing Green placement limits. The two
  // courts are valid pre-dressing saved placements; do not widen those limits.
  for (const id of ['reading-court', 'rowan-workyard']) {
    const s = M.freshState(), initial = destination(s, id);
    const piece = { instance: 'saved-' + id, id: 'market-crates', x: initial.x, z: initial.z, rotation: 0 };
    s.village.decor.placed.push(piece);
    const target = destination(s, id), loaded = M.restoreState(M.saveData(s));
    assert.deepEqual(loaded.village.decor.placed, [piece]);
    assert.deepEqual(destination(loaded, id), target);
    loaded.village.decor.placed = []; loaded.village.decor.owned[piece.id] = 1;
    assert.ok(M.restoreVillageDecor(loaded, { placed: [piece] }));
    assert.deepEqual(destination(loaded, id), target);
  }
  const court = VILLAGE_PLACES.find(p => p.id === 'reading-court'), s = M.freshState();
  s.village.decor.placed.push({ instance: 'reading-replacement', id: 'market-crates', x: 33 * K, z: 27 * K, rotation: 0 });
  assert.ok(!villageNeighbourhoodClusters(s).some(c => c.id === 'library-reading-court'));
  const copy = villagePlaces(s).find(p => p.id === court.id);
  assert.equal(copy.sub, 'The public garden beside Elowen’s library');
  assert.doesNotMatch(copy.sub, /waiting|find Elowen|talk|seated|reading here/i);
});
