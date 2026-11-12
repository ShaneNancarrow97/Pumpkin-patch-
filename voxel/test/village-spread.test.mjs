import test from 'node:test';
import assert from 'node:assert/strict';
import { SPREAD, PIECES, pieceAt, pieceOfBox, spread, spreadWith, spreadStep, gather, spreadBox, spreadRect, isGap, TOWN_SQUARE, inTownSquare } from '../src/rules/village-spread.js';
import { PLAN_SCALE as K, PLOTS, FIXTURES, ROADS } from '../src/content/village.js';

const I = SPREAD.inner, O = SPREAD.inner + SPREAD.outer, R = SPREAD.rise;
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('the tree, its ring of lamps, the avenue and the gate stay where they were drawn', () => {
  for (const [x, z] of [[58, 24.6], [54.5, 21.1], [61.5, 28.1], [58, 4], [58, 12], [58, -17], [58, 34]]) assert.deepEqual(spread(x, z), [x, z], `${x},${z}`);
});

test('the houses stand back from the tree, the square widens and the districts move north', () => {
  const tree = 58, [elowen] = spread(48, 20), [rowan] = spread(66, 20);
  assert.equal(tree - elowen, 10 + O, "Elowen's door is a further INNER + OUTER from the tree");
  assert.equal(rowan - tree, 8 + O, "and so is Rowan's");
  assert.deepEqual(PIECES[pieceAt(51.2, 23.6)], [-I, 0], 'the bench moves out with the west furniture');
  assert.deepEqual(PIECES[pieceAt(64.6, 28)], [I, 0], 'the stall moves out with the east furniture');
  assert.deepEqual(spread(58, 60), [58, 60 + R], 'the Quarry side moves north, leaving room for a town square');
  assert.deepEqual(spread(0, 62), [-O, 62 + R], 'the Copse goes with the west side, north');
  assert.deepEqual(spread(152, 46), [152 + O, 46], 'the Moor goes with the east side');
  // The content keeps every plot where it now stands.
  const door = (id) => PLOTS.find((p) => p.id === id).door;
  assert.deepEqual(door('01'), [(48 - O) * K, 20 * K]); assert.deepEqual(door('02'), [(66 + O) * K, 20 * K]);
  assert.ok(Math.hypot(FIXTURES.tree.x - door('01')[0], FIXTURES.tree.z - door('01')[1]) > 30 * K, 'a long walk from the tree to her door');
});

test('every piece moves whole, and gather undoes spread wherever a piece stands', () => {
  for (let x = -100; x <= 170; x += 1.7) for (let z = -22; z <= 134; z += 1.9) {
    const p = pieceAt(x, z), [nx, nz] = spread(x, z);
    assert.deepEqual([nx - x, nz - z].map((v) => Math.round(v * 1e6) / 1e6), PIECES[p], `${x},${z} moves with ${p}`);
    const [ox, oz] = gather(nx, nz);
    assert.ok(close(ox, x, 1e-6) && close(oz, z, 1e-6), `${x},${z} comes back from ${nx},${nz} (got ${ox},${oz})`);
    assert.equal(isGap(nx, nz), false);
  }
});

test('new ground between the pieces reads as the nearest edge of a piece', () => {
  // Between Elowen's side and the square's west furniture, and between the furniture and the tree (clear of the
  // gate maples, whose island's edge is nearer to points just north of it).
  for (const [x, z] of [[30, 10], [38, 16], [50, 14], [52, 14]]) {
    assert.equal(isGap(x, z), true, `${x},${z} is new ground`);
    const [ox, oz] = gather(x, z); assert.ok(!isGap(...spread(ox, oz)), 'it reads as a drawn point');
    assert.ok(Math.abs(oz - z) < .6, 'carried straight across');
  }
});

test('the town square is new ground, as wide as the village, between the Green and the Quarry', () => {
  assert.equal(TOWN_SQUARE.z1 - TOWN_SQUARE.z0, R);
  for (let x = TOWN_SQUARE.x0 + 4; x < TOWN_SQUARE.x1 - 4; x += 6) for (let z = TOWN_SQUARE.z0 + 1; z < TOWN_SQUARE.z1 - 1; z += 4) {
    assert.ok(inTownSquare(x, z)); assert.equal(isGap(x, z), true, `${x},${z}`);
  }
  // Only the roads already drawn across it run through it: north to the Quarry and along its west side to the Copse.
  const crossing = ROADS.filter((r) => r.points.some((p, i) => i && Math.min(p[1], r.points[i - 1][1]) < TOWN_SQUARE.z0 * K && Math.max(p[1], r.points[i - 1][1]) > TOWN_SQUARE.z1 * K));
  assert.deepEqual(crossing.map((r) => r.id).sort(), ['copse', 'quarry']);
});

test('boxes move whole, or stretch across a gap when they are long', () => {
  const [x, z, w, d] = spreadBox(64, 12, 2.4, 1.2);
  assert.deepEqual([x, z, w, d], [64 + I, 12, 2.4, 1.2], 'a planter moves whole with its piece');
  const wall = spreadRect({ x0: 0, z0: .29, x1: 53.3, z1: .91 });
  assert.ok(close(wall.x0, -O, 1e-6) && close(wall.x1, 53.3, 1e-6), 'the south wall runs from the moved corner to the gate');
  assert.ok(close(wall.z1 - wall.z0, .62, 1e-9), 'and keeps its thickness');
  const square = spreadRect({ x0: 0, z0: -22, x1: 120, z1: 50 });
  assert.ok(close(square.x1 - square.x0, 120 + 2 * O, 1e-6) && close(square.z1 - square.z0, 72 + R, 1e-6), 'the Green as a whole grows by the gaps');
});

test('a quest step or a stop goes with what it was set beside', () => {
  assert.deepEqual(spreadStep(49.6, 20), [49.6 - O, 20], "a page on Elowen's step stays on her step");
  assert.deepEqual(spreadStep(64.8, 20), [64.8 + O, 20], "Rowan's bell stays at his door");
  assert.deepEqual(spreadStep(53.4, 31.4), [53.4, 31.4], 'the supper by the tree stays by the tree');
  assert.deepEqual(spreadStep(60, 80), spread(60, 80), 'beyond the Green a step moves with its district');
  assert.deepEqual(spreadWith(53, 22, 51.2, 23.6), [53 - I, 22], 'and anything can be moved with a chosen neighbour');
});

test('tall parts beside the tree stay with it however far its crown reaches', () => {
  assert.equal(pieceOfBox(54, 6, 22, .4, .4), 'C', 'the crown over the bench stays with the tree');
  assert.equal(pieceOfBox(51.2, 0, 23.6, .4, .4), 'SW', 'the bench under it moves');
  assert.equal(pieceOfBox(48.5, 0, 30, .4, .4), 'SW', 'a planter inside its island moves');
});
