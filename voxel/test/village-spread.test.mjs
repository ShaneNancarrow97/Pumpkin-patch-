import test from 'node:test';
import assert from 'node:assert/strict';
import { SPREAD, spread, gather, spreadBox, stretchBox } from '../src/rules/village-spread.js';

test('the tree stays put while both houses, the gardens and the avenue move away from it', () => {
  assert.deepEqual(spread(58, 24.6), [58, 24.6]);
  const [elowen] = spread(48, 20), [rowan] = spread(66, 20);
  assert.equal(58 - elowen, 30); assert.equal(rowan - 58, 28);
  assert.equal(spread(52.1, 17.8)[0], 46.1, 'the well moves out of the ring round the tree');
  assert.deepEqual(spread(58, 4), [58, -4], 'the gate moves south, on the same road');
  assert.deepEqual(spread(58, 34), [58, 64], 'the cross road moves north, leaving room for a town square');
  assert.equal(spread(0, 62)[0], -SPREAD.farGap); assert.equal(spread(152, 46)[0], 152 + SPREAD.farGap);
});

test('gather undoes spread everywhere, and new ground reads as the edge of its cut', () => {
  for (let x = -100; x <= 170; x += 3.7) for (let z = -22; z <= 134; z += 4.3) {
    const [nx, nz] = spread(x, z), [ox, oz] = gather(nx, nz);
    assert.ok(Math.abs(ox - x) < 1e-9 && Math.abs(oz - z) < 1e-9, `${x},${z}`);
  }
  assert.equal(gather(40, 20)[0], SPREAD.outer[0]); assert.equal(gather(76, 20)[0], SPREAD.outer[1]);
  assert.ok(Math.abs(gather(58, 45)[1] - SPREAD.north) < .02, 'the town square is the old square carried north');
  assert.equal(gather(58, 12)[1], SPREAD.avenue);
});

test('boxes move whole or stretch, as asked', () => {
  const garden = spreadBox({ x0: 61.6, z0: 8, x1: 66.4, z1: 15.6 });
  assert.ok(Math.abs((garden.x1 - garden.x0) - 4.8) < 1e-9, 'a garden keeps its size'); assert.ok(Math.abs(garden.x0 - 67.6) < 1e-9);
  const square = stretchBox({ x0: 50, z0: 18, x1: 64, z1: 30 });
  assert.equal(square.x1 - square.x0, 26, 'the square nearly doubles in width');
});
