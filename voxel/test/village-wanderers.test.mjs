import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { ARRIVAL, PLAN_SCALE as K } from "../src/content/village.js";
import { villageNeighbourhoodPaths } from "../src/content/village-neighbourhoods.js";
import { villageCellFree, villageWalkObstacles } from "../src/rules/village-navigation.js";
import { residentSegmentFree, RESIDENT_WALK_RADIUS } from "../src/rules/village-resident-life.js";
import { VILLAGE_WANDERER_LIMIT, VILLAGE_STROLL_LANES, villageWandererPlans, createVillageWandererRoutine, advanceVillageWanderer, villageStrollOnPaving } from "../src/rules/village-wanderers.js";

const gardenLanes = new Set(VILLAGE_STROLL_LANES.filter(lane => lane.neighbourhood).map(lane => lane.id));
function assertClearPlans(s, plans) {
  const obstacles = villageWalkObstacles(s);
  assert.ok(plans.length >= 2 && plans.length <= VILLAGE_WANDERER_LIMIT);
  assert.equal(new Set(plans.map(p => p.kind)).size, plans.length);
  for (const plan of plans) for (let i = 0; i < plan.stops.length; i++) {
    const a = plan.stops[i];
    assert.ok(villageCellFree(s, a.x, a.z, RESIDENT_WALK_RADIUS, obstacles)); assert.ok(villageStrollOnPaving(a, s));
    assert.ok(Math.hypot(a.x - ARRIVAL.back[0], a.z - ARRIVAL.back[1]) > 8, "keep the farm exit clear");
    for (const b of plan.stops.slice(i + 1)) {
      assert.ok(residentSegmentFree(s, a, b, obstacles), plan.lane + " never cuts a fixed body, furniture or a locked area");
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .5);
      for (let j = 0; j <= steps; j++) assert.ok(villageStrollOnPaving({ x: a.x + (b.x - a.x) * j / steps, z: a.z + (b.z - a.z) * j / steps }, s), plan.lane + " stays paved between posts");
    }
  }
}

test("each visit shares two or three distinct visitors between the original Green and a clear garden walk", () => {
  const s = M.freshState(), signatures = new Set(), counts = new Set(), lanes = new Set();
  for (let visit = 1; visit <= 12; visit++) {
    s.village.visits = visit; const before = JSON.stringify(s), plans = villageWandererPlans(s);
    assertClearPlans(s, plans);
    assert.deepEqual(villageWandererPlans(s), plans, "visit cosmetics are repeatable without touching the gameplay seed");
    assert.equal(plans.filter(p => gardenLanes.has(p.lane)).length, 1, "one member of the same small crowd enjoys the gardens");
    assert.ok(plans.some(p => !gardenLanes.has(p.lane)), "the original Green remains in use");
    signatures.add(plans.map(p => p.kind).join(",")); counts.add(plans.length); plans.forEach(p => lanes.add(p.lane));
    assert.equal(JSON.stringify(s), before, "cosmetics leave the complete source state unchanged");
  }
  assert.ok(signatures.size > 4, "different visits show a varied cast");
  assert.deepEqual([...counts].sort(), [2, 3]);
  assert.deepEqual([...lanes].sort(), VILLAGE_STROLL_LANES.map(lane => lane.id).sort(), "both gardens and every original avenue receive visitors");
});

test("garden paving uses the shared native design grid once and excludes the surrounding lawn", () => {
  const s = M.freshState(), path = villageNeighbourhoodPaths(s)[0], [x, z] = path.points[0];
  assert.ok(villageStrollOnPaving({ x: x * K, z: z * K }, s));
  assert.equal(villageStrollOnPaving({ x: -15 * K, z: 48 * K }, s), false, "nearby bare lawn is not a garden walk");
  assert.ok(villageStrollOnPaving({ x: 95 * K, z: 58 * K }, s));
  assert.equal(villageStrollOnPaving({ x: 95, z: 58 }, s), false, "unscaled common coordinates do not become world paving");
});

test("fresh, restored and custom furniture contexts retain clear routes without changing source state", () => {
  const upgraded = M.freshState();
  upgraded.village.visits = 8;
  upgraded.village.built["elowen-conservatory"] = true; upgraded.village.built["rowan-workshop"] = true; upgraded.village.unlocks.push("stall");
  const piece = { instance: "old-reading-court", id: "market-crates", x: 33 * K, z: 27 * K, rotation: 37 };
  upgraded.village.decor.placed.push(piece);
  const restored = M.restoreState(M.saveData(upgraded));
  assert.deepEqual(restored.village.decor.placed, [piece], "a valid older layout remains placed after reload");
  for (const s of [M.freshState(), upgraded, restored]) {
    const before = JSON.stringify(s), plans = villageWandererPlans(s);
    assertClearPlans(s, plans); assert.ok(plans.some(p => gardenLanes.has(p.lane)));
    assert.equal(JSON.stringify(s), before);
  }
  assert.deepEqual(villageWandererPlans(restored), villageWandererPlans(upgraded), "reload preserves this visit's people and posts");
});

test("a player's furniture suppresses garden traffic with its paving and leaves the original lanes available", () => {
  const s = M.freshState();
  const orchard = { instance: "orchard-overlay", id: "market-crates", x: -4 * K, z: 51 * K, rotation: 37 };
  s.village.decor.placed.push(orchard);
  let before = JSON.stringify(s), plans = villageWandererPlans(s);
  assertClearPlans(s, plans);
  assert.ok(plans.some(p => p.lane === "lantern-common")); assert.ok(plans.every(p => p.lane !== "cider-orchard"));
  assert.equal(villageStrollOnPaving({ x: -15 * K, z: 51 * K }, s), false, "a hidden path is not counted as active paving");
  assert.equal(JSON.stringify(s), before);
  s.village.decor.placed.push({ instance: "commons-overlay", id: "market-crates", x: 107 * K, z: 58 * K, rotation: 37 });
  before = JSON.stringify(s); plans = villageWandererPlans(s);
  assertClearPlans(s, plans); assert.ok(plans.every(p => !gardenLanes.has(p.lane)));
  assert.equal(JSON.stringify(s), before);
});

test("leisurely routines alternate walking and pauses without leaving paths or saved changes", () => {
  const s = M.freshState(), before = JSON.stringify(s), obstacles = villageWalkObstacles(s);
  const plans = villageWandererPlans(s);
  const orchardVisit = { ...s, village: { ...s.village, visits: 3 } };
  const orchard = villageWandererPlans(orchardVisit).find(plan => plan.lane === "cider-orchard");
  assert.ok(orchard); plans.push(orchard);
  assert.deepEqual([...new Set(plans.filter(plan => gardenLanes.has(plan.lane)).map(plan => plan.lane))].sort(), [...gardenLanes].sort(), "both garden walks are exercised");
  for (const plan of plans) {
    const routine = createVillageWandererRoutine(plan); let walking = false, stopping = false;
    for (let i = 0; i < 1800; i++) {
      const old = { x: routine.x, z: routine.z };
      advanceVillageWanderer(s, plan, routine, .1, { obstacles });
      assert.ok(Math.hypot(routine.x - old.x, routine.z - old.z) <= plan.speed * .1 + 1e-8);
      assert.ok(villageCellFree(s, routine.x, routine.z, RESIDENT_WALK_RADIUS, obstacles)); assert.ok(villageStrollOnPaving(routine, s));
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
  assert.equal(JSON.stringify(s), before);
});

test("a decoration across the lane stops a walker instead of sending it through the lawn", () => {
  const s = M.freshState(), plan = { id: "blocked-walk", start: 0, speed: .8, seed: 17, stops: [{ x: 87, z: 10 }, { x: 87, z: 15 }] };
  const routine = createVillageWandererRoutine(plan); routine.wait = 0;
  const obstacles = [...villageWalkObstacles(s), { x0: 86, x1: 88, z0: 11, z1: 12 }];
  for (let i = 0; i < 120; i++) { advanceVillageWanderer(s, plan, routine, .25, { obstacles }); assert.ok(routine.z < 10.59); assert.equal(routine.x, 87); }
  assert.ok(routine.wait > 0); assert.equal(routine.walking, false);
});
