import test from "node:test";
import assert from "node:assert/strict";
import { pointAlong, routeLength, stallApproach, stallDeparture, stallVisit, visitorWalkSpeed } from "../src/content/visitor-routes.mjs";
import { visitorGround, visitorWalking } from "../src/scene/farm-layers.mjs";
import { fresh, harvest, plant, update, growthTime } from "../src/core/model.mjs";

const MAP = { width: 1000, height: 610 }, SPRITE = { height: 110, halfWidth: 40 };
const same = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

test("visitors walk in from below the map and leave off the right edge", () => {
  const [x0, y0] = stallApproach[0], [x1] = stallDeparture.at(-1);
  assert.ok(y0 >= MAP.height + SPRITE.height, "starts fully out of sight");
  assert.ok(x0 > 0 && x0 < MAP.width);
  assert.ok(x1 >= MAP.width + SPRITE.halfWidth, "ends fully out of sight");
  assert.deepEqual(stallApproach.at(-1), stallDeparture[0], "leaves from the counter it reached");
});

test("pointAlong follows the route and clamps at its ends", () => {
  const route = [[0, 0], [30, 40], [30, 100]];
  assert.equal(routeLength(route), 110);
  assert.deepEqual(pointAlong(route, -5), { x: 0, y: 0 });
  assert.deepEqual(pointAlong(route, 25), { x: 15, y: 20 });
  assert.deepEqual(pointAlong(route, 80), { x: 30, y: 70 });
  assert.deepEqual(pointAlong(route, 999), { x: 30, y: 100 });
});

test("a visitor's walk has no jumps between path, counter and exit", () => {
  const counter = { x: stallApproach.at(-1)[0], y: stallApproach.at(-1)[1] };
  const v = { age: stallVisit.arriveSeconds, checked: false };
  assert.ok(same(visitorGround(v), counter), "reaches the counter exactly on arrival");
  assert.equal(visitorWalking(v), false);
  const leaving = { age: 12, checked: true, leaveAt: 12 };
  assert.ok(same(visitorGround(leaving), counter), "starts leaving from the counter");
  let previous = visitorGround({ age: 0, checked: false });
  for (let age = 0.1; age < stallVisit.arriveSeconds; age += 0.1) {
    const p = visitorGround({ age, checked: false });
    assert.ok(Math.hypot(p.x - previous.x, p.y - previous.y) <= visitorWalkSpeed * 0.1 + 1e-6, "steady pace");
    previous = p;
  }
});

test("the stall sells when the visitor reaches the counter, then they walk away", () => {
  const s = fresh();
  for (let i = 0; i < 6; i++) plant(s, i);
  for (let t = 0; t <= growthTime(s) + 0.2; t += 0.1) update(s, 0.1);
  for (let i = 0; i < 6; i++) harvest(s, i);
  s.visitorTimer = 0;
  let sale = null;
  for (let t = 0; t < 30 && !sale; t += 0.1) {
    const e = update(s, 0.1).find((x) => x.type === "sale");
    if (e) sale = s.visitors.find((v) => v.id === e.visitor);
  }
  assert.ok(sale, "a passer-by bought something");
  assert.ok(sale.age >= stallVisit.arriveSeconds, "not before reaching the counter");
  const id = sale.id;
  for (let t = 0; t < stallVisit.lingerSeconds + stallVisit.leaveSeconds + 0.3; t += 0.1) update(s, 0.1);
  assert.ok(!s.visitors.some((v) => v.id === id), "gone once off the map");
});
