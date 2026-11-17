import test from "node:test";
import assert from "node:assert/strict";
import { createVillageLightSelection } from "../src/village-light-selection.js";

const distance = (p, at, flat) => (p.x - at.x) ** 2 + (p.z - at.z) ** 2 + (flat ? 0 : (p.y - at.y) ** 2);
const expected = (points, at, flat, limit = 8) => [...points].sort((a, b) => distance(a, at, flat) - distance(b, at, flat)).slice(0, limit);

test("pooled lamps match full stable sorting throughout a spread village and in tall rooms", () => {
  const points = Array.from({ length: 537 }, (_, i) => ({ x: (i * 71 % 311) - 130, y: (i * 23 % 41) * .7, z: (i * 43 % 227) - 93, id: i }));
  const selection = createVillageLightSelection();
  for (const flat of [true, false]) for (let i = 0; i < 220; i++) {
    const at = { x: -150 + i * 1.7, y: i % 39, z: Math.sin(i * .12) * 130 };
    assert.deepEqual(selection.select(points, at, flat), expected(points, at, flat));
  }
});

test("equidistant lamps keep source order without flickering between pool slots", () => {
  const points = Array.from({ length: 12 }, (_, i) => ({ id: i, x: i % 2 ? -1 : 1, y: 0, z: 0 }));
  const selection = createVillageLightSelection(), at = { x: 0, y: 0, z: 0 };
  assert.deepEqual(selection.select(points, at).map(p => p.id), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(selection.select(points, { ...at, x: .001 }), expected(points, { ...at, x: .001 }, false));
  assert.deepEqual(selection.select(points, at).map(p => p.id), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test("stationary views reuse the exact result without checking every lantern again", () => {
  const points = Array.from({ length: 240 }, (_, x) => ({ x, y: x % 6, z: -x })), at = { x: 17, y: 4, z: -21 };
  const selection = createVillageLightSelection(), first = selection.select(points, at, true);
  for (let i = 0; i < 600; i++) assert.equal(selection.select(points, { ...at, y: i }, true), first);
  assert.deepEqual(selection.stats, { selections: 1, cacheHits: 600, distanceChecks: 240, candidates: 240 });
  selection.select(points, { ...at, x: at.x + .00001 }, true);
  assert.equal(selection.stats.selections, 2, "even a tiny horizontal movement is evaluated immediately");
  selection.select(points, at, false); selection.select(points, { ...at, y: at.y + .00001 }, false);
  assert.equal(selection.stats.selections, 4, "room height and distance policy invalidate the cache");
});

test("source changes, edits and empty rooms cannot keep stale surface lamps", () => {
  const a = { x: 1, y: 0, z: 0 }, b = { x: 2, y: 0, z: 0 }, at = { x: 0, y: 0, z: 0 }, points = [a, b];
  const selection = createVillageLightSelection(1), result = selection.select(points, at);
  assert.equal(result[0], a);
  a.x = 3; selection.invalidate(); assert.equal(selection.select(points, at), result); assert.equal(result[0], b);
  points.push({ x: .2, y: 0, z: 0 }); assert.equal(selection.select(points, at)[0], points[2]);
  assert.equal(selection.select([a], at)[0], a);
  assert.deepEqual(selection.select([], at), []);
  assert.deepEqual(selection.select([{ x: NaN, y: 0, z: 0 }, b], at), [b]);
  assert.deepEqual(selection.select(points, at), [points[2]]);
});
