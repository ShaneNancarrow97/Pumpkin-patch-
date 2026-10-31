import test from "node:test";
import assert from "node:assert/strict";
import { playerPointFree, slidePlayer, farmPlayerGeometry } from "../src/player-control.js";
import { fieldDepth } from "../src/content/farm-layout.js";
import { COOKING_SITE } from "../src/content/cooking-layout.js";
import { MEADOW } from "../src/content/festival-meadow.js";

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

const farm = ({ plots = 0, kitchen = false, meadow = false, cocoa = 0 } = {}) => ({ upgrades: { plots }, kitchen: { purchased: kitchen }, festival: { meadow, cocoa: { level: cocoa } } });
const walkable = (s, x, z) => { const g = farmPlayerGeometry(s); return playerPointFree(x, z, g.bounds, g.obstacles); };
test("the owner stays inside the front fence, however far the field has grown", () => {
  for (const plots of [0, 3, 4]) {
    const s = farm({ plots, meadow: true }), fence = fieldDepth(s) - 1.4;
    assert.equal(walkable(s, 20, fence - .55), true, `just inside (${plots})`);
    assert.equal(walkable(s, 20, fence - .45), false, `not on the pickets (${plots})`);
    assert.equal(walkable(s, 33, fence + .3), false, `not out of the gate (${plots})`);
  }
});
test("east of the yard only the truck's paving opens, until the meadow is bought", () => {
  assert.equal(walkable(farm(), 42, 6), false, "nothing east before either is bought");
  const truck = farm({ kitchen: true }), cook = { x: COOKING_SITE.truck.x, z: COOKING_SITE.truck.z + 2.1 };
  assert.equal(walkable(truck, cook.x, cook.z), true, "the truck's counter");
  assert.equal(walkable(truck, 50, 6.5), true, "the paving");
  for (const [x, z] of [[42, 9], [45, 18], [39.4, 14], [50, 26]]) assert.equal(walkable(truck, x, z), false, `not through the east fence at ${x}, ${z}`);
  const meadow = farm({ kitchen: true, meadow: true });
  for (const [x, z] of [[45, 12], [43, 23.3], [52.5, 26], [42, 9]]) assert.equal(walkable(meadow, x, z), true, `the meadow at ${x}, ${z}`);
  assert.equal(walkable(meadow, 53.4, 15), false, "not past the meadow's east fence");
  const grown = farm({ plots: 4, meadow: true });
  assert.equal(walkable(grown, 36, 33), true, "the grown field runs down past the meadow");
  assert.equal(walkable(grown, 45, 30), false, "but the meadow keeps its own front fence");
  assert.equal(walkable(grown, 37, 27.6), false, "where it runs on to the lane");
  for (const z of [26.9, 28.3]) assert.equal(walkable(grown, 37, z), true, `either side of it (${z})`);
});
test("the cocoa kiosk is walked round once it stands in the meadow", () => {
  const [x, z] = MEADOW.stand;
  assert.equal(walkable(farm({ meadow: true }), x, z), true, "an empty meadow");
  for (const cocoa of [1, 5]) {
    const s = farm({ meadow: true, cocoa });
    assert.equal(walkable(s, x, z), false, `the kiosk at level ${cocoa}`);
    assert.equal(walkable(s, MEADOW.counter[0], MEADOW.counter[1] + .3), true, `its queue at level ${cocoa}`);
  }
});
