import test from "node:test";
import assert from "node:assert/strict";
import { freshState } from "../src/model.js";
import { PLAN_SCALE as K, FIXTURES, GATES } from "../src/content/village.js";
import { villageCellFree, villageWalkObstacles } from "../src/rules/village-navigation.js";
import { spreadWith, gather } from "../src/rules/village-spread.js";
// Probes drawn beside something on the Green, moved with it now the village is spread apart.
const beside = (ax, az) => (x, z) => { const [a, b] = spreadWith(x, z, ax, az); return { x: a * K, z: b * K }; };
const byElowen = beside(48, 20), byBench = beside(...gather(FIXTURES.bench.x / K, FIXTURES.bench.z / K));
import { RESIDENT_WALK_RADIUS, RESIDENT_WALK_SPEED, residentRoute, createResidentRoutine, advanceResidentRoutine, residentSegmentFree, findResidentPath, residentTalkPoint } from "../src/rules/village-resident-life.js";

function state(restored = false) {
  const s = freshState();
  if (restored) { s.village.built["elowen-conservatory"] = true; s.village.unlocks.push("stall"); }
  return s;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test("both neighbours complete small, deterministic routes and return to their familiar posts", () => {
  for (const restored of [false, true]) for (const id of ["elowen", "rowan"]) {
    const s = state(restored), route = residentRoute(s, id), a = createResidentRoutine(s, id), b = createResidentRoutine(s, id), obstacles = villageWalkObstacles(s), visited = new Set();
    let walked = false, waved = false, returned = false, left = false;
    for (let i = 0; i < 2400; i++) {
      const before = { x: a.x, z: a.z };
      advanceResidentRoutine(s, a, .1, { obstacles }); advanceResidentRoutine(s, b, .1, { obstacles });
      assert.deepEqual(a, b, route.key + " deterministic step " + i);
      assert.ok(distance(before, a) <= RESIDENT_WALK_SPEED * .1 + 1e-8, "no teleports");
      assert.ok(villageCellFree(s, a.x, a.z, RESIDENT_WALK_RADIUS, obstacles), route.key + " stays on clear ground");
      assert.ok(distance(a, route.stops[0]) < 5.2, "stays near the usual meeting place");
      if (a.walking) walked = left = true;
      if (a.action === "wave") waved = true;
      if (!a.travelling) { visited.add(a.stop); if (left && a.stop === 0) returned = true; }
      const talk = residentTalkPoint(s, a, obstacles);
      assert.ok(villageCellFree(s, talk.x, talk.z, RESIDENT_WALK_RADIUS, obstacles), "live talk prompt stays on clear ground");
      assert.ok(distance(a, talk) <= 5.7 + 1e-8, "prompt remains beside its current neighbour");
    }
    assert.ok(walked && waved && returned, route.key + " walks, greets and comes home");
    assert.equal(visited.size, route.stops.length, route.key + " reaches each authored stop");
  }
  assert.equal(createResidentRoutine(state(), "vesper"), null, "the hall host keeps his welcoming post");
  assert.equal(createResidentRoutine(state(), "mabel"), null, "future cast do not gain unfinished gameplay");
});

test("conversations, greetings, paused rooms and reduced motion hold the exact foot position", () => {
  const s = state(), obstacles = villageWalkObstacles(s);
  for (const option of ["talking", "waving", "paused", "reducedMotion"]) {
    const r = createResidentRoutine(s, "elowen");
    for (let i = 0; i < 50; i++) advanceResidentRoutine(s, r, .1, { obstacles });
    assert.equal(r.walking, true);
    const pose = { x: r.x, z: r.z, walkAge: r.walkAge, wait: r.wait, path: [...r.path] };
    for (let i = 0; i < 100; i++) advanceResidentRoutine(s, r, .1, { obstacles, [option]: true });
    assert.deepEqual({ x: r.x, z: r.z, walkAge: r.walkAge, wait: r.wait, path: r.path }, pose, option);
    assert.equal(r.walking, false);
    assert.equal(r.action, option === "talking" ? "talk" : option === "waving" ? "wave" : "idle");
    advanceResidentRoutine(s, r, .1, { obstacles }); assert.equal(r.walking, true, "resumes the same leg");
  }
});

test("restoring a home changes the destination without moving a resident instantly", () => {
  const s = state(), residents = ["elowen", "rowan"].map(id => createResidentRoutine(s, id));
  s.village.built["elowen-conservatory"] = true; s.village.unlocks.push("stall");
  const obstacles = villageWalkObstacles(s);
  for (const r of residents) {
    let arrived = false;
    for (let i = 0; i < 1800; i++) {
      const before = { x: r.x, z: r.z }; advanceResidentRoutine(s, r, .1, { obstacles });
      assert.ok(distance(before, r) <= RESIDENT_WALK_SPEED * .1 + 1e-8);
      assert.ok(residentSegmentFree(s, before, r, obstacles), "home transition avoids the tree, well, houses and stall");
      if (!r.travelling && r.stop === 0) { arrived = true; break; }
    }
    assert.equal(arrived, true, r.id + " walks all the way to the new post");
  }
});

test("routes detour around furniture, reject water and gates, and never cut corners", () => {
  const s = state(), from = { x: 53 * K, z: 32 * K }, to = { x: 56 * K, z: 32 * K }, obstacle = { x0: 54 * K, z0: 31.2 * K, x1: 55 * K, z1: 32.8 * K }, obstacles = [...villageWalkObstacles(s), obstacle];
  assert.equal(residentSegmentFree(s, from, to, obstacles), false);
  const path = findResidentPath(s, from, to, obstacles);
  assert.ok(path.length > 1, "takes a route round the furniture");
  let previous = from;
  for (const point of path) { assert.ok(residentSegmentFree(s, previous, point, obstacles)); previous = point; }
  assert.deepEqual(path.at(-1), to);
  for (const target of [FIXTURES.pond, ...GATES, byElowen(44, 20)]) assert.deepEqual(findResidentPath(s, from, target, obstacles), [], "cannot route into water, a closed district or a home");
  assert.equal(residentSegmentFree(s, from, { x: Infinity, z: 0 }, obstacles), false);
});

test("new obstructions stop a walk immediately and a long frame cannot jump through them", () => {
  const s = state(), r = createResidentRoutine(s, "elowen"), original = villageWalkObstacles(s);
  for (let i = 0; i < 50; i++) advanceResidentRoutine(s, r, .1, { obstacles: original });
  const before = { x: r.x, z: r.z }, dx = Math.sin(r.yaw), dz = -Math.cos(r.yaw), centre = { x: r.x + dx * .6, z: r.z + dz * .6 }, blocked = [...original, { x: centre.x, z: centre.z, r: .1 }];
  advanceResidentRoutine(s, r, 50, { obstacles: blocked });
  assert.ok(distance(before, r) <= RESIDENT_WALK_SPEED * .25 + 1e-8, "tab resume cannot create a giant stride");
  assert.ok(villageCellFree(s, r.x, r.z, RESIDENT_WALK_RADIUS, blocked));
  assert.equal(r.walking, false, "holds when a new piece blocks this leg");
  for (let i = 0; i < 500; i++) advanceResidentRoutine(s, r, .1, { obstacles: original });
  assert.notDeepEqual({ x: r.x, z: r.z }, before, "can resume once furniture is removed");
});


test("restoration routes cannot skim a planter or bench corner between coarse samples",()=>{
  const s=state(true),boxes=villageWalkObstacles(s);
  // This former smoothed route passed .12-unit samples, then stopped forever
  // when its next .072-unit stride touched the north-west bench corner.
  // Measured from the bench, which now stands out from the tree with the square's west furniture.
  const from=byBench(53.6,30.2),to=byBench(50,24.6);
  assert.equal(residentSegmentFree(s,from,to,boxes),false);
  const route=findResidentPath(s,from,residentRoute(s,"elowen").stops[0],boxes);
  assert.ok(route.length>0);let p=from;for(const q of route){assert.equal(residentSegmentFree(s,p,q,boxes),true);p=q;}
});
