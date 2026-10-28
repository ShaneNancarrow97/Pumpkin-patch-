import test from "node:test";
import assert from "node:assert/strict";
import { playerPointFree, slidePlayer } from "../src/player-control.js";

const room = { x0: 0, x1: 10, z0: 0, z1: 6 };
test("direct-control feet stay inside the room, including their radius", () => {
  assert.equal(playerPointFree(.1, 3, room, []), false);
  const p = slidePlayer({ x: 1, z: 3 }, -9, 0, room, []);
  assert.ok(p.x >= .25 && p.x < .4);
});
test("a long movement cannot tunnel through thin furniture", () => {
  const chair = [{ x: 5, z: 3, w: .1, d: 4 }];
  const p = slidePlayer({ x: 2, z: 3 }, 6, 0, room, chair);
  assert.ok(p.x <= 4.71);
  assert.equal(p.z, 3);
});
test("diagonal movement slides along furniture instead of freezing", () => {
  const table = [{ x: 5, z: 3, w: 2, d: 2 }];
  const p = slidePlayer({ x: 3.5, z: 2.5 }, 1, 1, room, table);
  assert.ok(p.x < 3.76);
  assert.ok(p.z > 3.4);
});
test("turned furniture uses its actual orientation", () => {
  const bench = [{ x: 5, z: 3, w: 3, d: .4, angle: Math.PI / 2 }];
  assert.equal(playerPointFree(5, 4, room, bench), false);
  assert.equal(playerPointFree(6, 3, room, bench), true);
});
