import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { ARRIVAL } from "../src/content/village.js";
import { villageCellFree, villageWalkObstacles } from "../src/rules/village-navigation.js";
import { residentSegmentFree, RESIDENT_WALK_RADIUS } from "../src/rules/village-resident-life.js";
import { VILLAGE_WANDERER_LIMIT, villageWandererPlans, createVillageWandererRoutine, advanceVillageWanderer, villageStrollOnPaving } from "../src/rules/village-wanderers.js";

test("each visit has two or three distinct existing visitors on clear broad paving", () => {
  const s = M.freshState(), signatures = new Set();
  for (let visit = 1; visit <= 12; visit++) {
    s.village.visits = visit; const before = JSON.stringify(M.saveData(s)), plans = villageWandererPlans(s);
    assert.ok(plans.length >= 2 && plans.length <= VILLAGE_WANDERER_LIMIT);
    assert.equal(new Set(plans.map(p => p.kind)).size, plans.length);
    assert.deepEqual(villageWandererPlans(s), plans, "visit cosmetics are repeatable without touching the gameplay seed");
    signatures.add(plans.map(p => p.kind).join(","));
    for (const plan of plans) for (const a of plan.stops) {
      assert.ok(villageCellFree(s, a.x, a.z, RESIDENT_WALK_RADIUS)); assert.ok(villageStrollOnPaving(a));
      assert.ok(Math.hypot(a.x - ARRIVAL.back[0], a.z - ARRIVAL.back[1]) > 8, "keep the farm exit clear");
      for (const b of plan.stops) assert.ok(residentSegmentFree(s, a, b), plan.lane + " never cuts a fixed body");
    }
    assert.equal(JSON.stringify(M.saveData(s)), before);
  }
  assert.ok(signatures.size > 4, "different visits show a varied cast");
});

test("leisurely routines alternate walking and pauses without leaving paths or saved changes", () => {
  const s = M.freshState(), before = JSON.stringify(M.saveData(s)), obstacles = villageWalkObstacles(s);
  for (const plan of villageWandererPlans(s)) {
    const routine = createVillageWandererRoutine(plan); let walking = false, stopping = false;
    for (let i = 0; i < 1800; i++) {
      const old = { x: routine.x, z: routine.z };
      advanceVillageWanderer(s, plan, routine, .1, { obstacles });
      assert.ok(Math.hypot(routine.x - old.x, routine.z - old.z) <= plan.speed * .1 + 1e-8);
      assert.ok(villageCellFree(s, routine.x, routine.z, RESIDENT_WALK_RADIUS, obstacles)); assert.ok(villageStrollOnPaving(routine));
      walking ||= routine.walking; stopping ||= routine.distance > 1 && routine.wait > 1;
    }
    assert.ok(walking); assert.ok(stopping); assert.ok(routine.distance > 25);
    const stopped = structuredClone(routine);
    for (const options of [{ paused: true }, { hidden: true }]) {
      advanceVillageWanderer(s, plan, routine, .2, options);
      for (const key of ["x", "z", "age", "walkAge", "distance", "wait", "seed"]) assert.equal(routine[key], stopped[key]);
      assert.equal(routine.walking, false);
    }
  }
  assert.equal(JSON.stringify(M.saveData(s)), before);
});

test("a decoration across the lane stops a walker instead of sending it through the lawn", () => {
  const s = M.freshState(), plan = { id: "blocked-walk", start: 0, speed: .8, seed: 17, stops: [{ x: 87, z: 10 }, { x: 87, z: 15 }] };
  const routine = createVillageWandererRoutine(plan); routine.wait = 0;
  const obstacles = [...villageWalkObstacles(s), { x0: 86, x1: 88, z0: 11, z1: 12 }];
  for (let i = 0; i < 120; i++) { advanceVillageWanderer(s, plan, routine, .25, { obstacles }); assert.ok(routine.z < 10.59); assert.equal(routine.x, 87); }
  assert.ok(routine.wait > 0); assert.equal(routine.walking, false);
});
