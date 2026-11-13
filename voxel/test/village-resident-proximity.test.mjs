import test from "node:test";
import assert from "node:assert/strict";
import { freshState, inviteToVillage } from "../src/model.js";
import { PLAN_SCALE as K } from "../src/content/village.js";
import { villageWalkObstacles } from "../src/rules/village-navigation.js";
import { residentRoute, residentTalkOffsetBound, residentTalkPoint } from "../src/rules/village-resident-life.js";
import { mayBeWithinResidentReach, resolveNearbyVillageResidentInteraction, resolveVillageResidentInteraction, RESIDENT_REACH_EPSILON } from "../src/village-resident-interaction.js";

function fixture(pose = { x: 87, z: 9.8, yaw: Math.PI / 2 }) {
  const state = freshState(); inviteToVillage(state);
  let calls = 0;
  const view = { inside: null, activeExpansionArea: null, groundAt: () => 0, expansionTargets: [], folk: {
    people: new Map([["rowan", { root: { visible: true } }]]),
    spotOf: () => pose,
    talkSpot: () => { calls++; return residentTalkPoint(state, pose, villageWalkObstacles(state)); },
  } };
  const options = { id: "rowan", state, view, position: { x: 87, z: -25.5 }, insides: {}, doorNormal: { south: [0, -1] } };
  return { options, pose, get calls() { return calls; }, nearby: () => resolveNearbyVillageResidentInteraction(options), full: () => resolveVillageResidentInteraction(options) };
}

test("the approach bound contains every authored stop, counter reach and fallback", () => {
  const state = freshState();
  for (const restored of [false, true]) {
    if (restored) { state.village.built["elowen-conservatory"] = true; state.village.unlocks.push("stall"); }
    const obstacles = villageWalkObstacles(state);
    for (const id of ["rowan", "elowen"]) for (const pose of residentRoute(state, id).stops) {
      const point = residentTalkPoint(state, pose, obstacles);
      assert.ok(Math.hypot(point.x - pose.x, point.z - pose.z) <= residentTalkOffsetBound(pose) + 1e-8);
    }
  }
  assert.equal(residentTalkOffsetBound({}), 1.8);
  assert.equal(residentTalkOffsetBound({ reach: 3.8 * K }), 3.8 * K);
  assert.equal(residentTalkOffsetBound({ reach: -7 }), 7);
  for (const pose of [null, undefined, { reach: NaN }, { reach: "8" }]) assert.equal(residentTalkOffsetBound(pose), Infinity);
});

test("far world prompts skip clearance while the full live descriptor still resolves", () => {
  const f = fixture();
  assert.equal(f.nearby(), null); assert.equal(f.calls, 0);
  const resident = f.full();
  assert.equal(f.calls, 1); assert.equal(resident.live, true); assert.equal(resident.samePlace, true); assert.equal(resident.nearby, false);
  assert.ok(resident.point); assert.ok(resident.feet); assert.ok(resident.destination);
});

test("the broad phase preserves the inclusive approach boundary and tolerance", () => {
  const f = fixture(), bound = 3 + residentTalkOffsetBound(f.pose);
  for (const extra of [-1e-7, 0, RESIDENT_REACH_EPSILON / 2]) {
    f.options.position = { x: f.pose.x + bound + extra, z: f.pose.z };
    assert.equal(mayBeWithinResidentReach(f.options.position, f.pose), true);
    const resident = f.nearby(); assert.ok(resident); assert.deepEqual(resident, f.full()); assert.equal(resident.reach, 3);
  }
  const before = f.calls;
  f.options.position = { x: f.pose.x + bound + RESIDENT_REACH_EPSILON * 2, z: f.pose.z };
  assert.equal(f.nearby(), null); assert.equal(f.calls, before, "proven far boundary skips clearance");
});

test("Rowan's live 5.7-unit counter offset remains reachable at the full three-unit boundary", () => {
  const f = fixture(); f.options.state.village.unlocks.push("stall");
  Object.assign(f.pose, residentRoute(f.options.state, "rowan").stops[0], { yaw: -Math.PI / 2 });
  const point = f.full().point;
  assert.ok(Math.abs(Math.hypot(point.x - f.pose.x, point.z - f.pose.z) - 3.8 * K) < 1e-8);
  for (const extra of [0, RESIDENT_REACH_EPSILON / 2]) {
    f.options.position = { x: point.x - 3 - extra, z: point.z };
    assert.ok(f.nearby()); assert.deepEqual(f.nearby(), f.full());
  }
  f.pose.reach = undefined;
  assert.equal(f.nearby(), null, "a moving resident loses the counter allowance immediately");
  Object.assign(f.pose, { x: 87, z: 9.8, yaw: Math.PI / 2 });
  f.options.position = { x: 89, z: 9.8 };
  assert.deepEqual(f.nearby(), f.full(), "the next call uses the moved feet and current approach");
});

test("unknown poses and reach metadata fall back to canonical live clearance", () => {
  const f = fixture();
  f.options.view.folk.spotOf = undefined;
  f.options.targets = [{ type: "village-folk", id: "rowan", x: 87, z: 9.8 }];
  assert.equal(f.nearby(), null); assert.equal(f.calls, 1, "an authored fallback target cannot prove the live offset");
  assert.equal(mayBeWithinResidentReach({ x: 0, z: 0 }, undefined), true);
  assert.equal(mayBeWithinResidentReach({ x: NaN, z: 0 }, f.pose), true);
  f.options.view.folk.spotOf = () => ({ ...f.pose, reach: Infinity });
  f.nearby(); assert.equal(f.calls, 2);
});

test("near candidates still obey visibility, live district and realm guards", () => {
  const f = fixture(); f.options.position = { x: 89, z: 9.8 };
  assert.ok(f.nearby());
  f.options.view.folk.people.get("rowan").root.visible = false;
  const before = f.calls; assert.equal(f.nearby(), null); assert.equal(f.calls, before);
  f.options.view.folk.people.get("rowan").root.visible = true;
  for (const realm of ["hall", "cave"]) {
    f.options.view.inside = realm === "hall" ? "another-room" : null;
    f.options.view.activeExpansionArea = realm === "cave" ? "cave-shallows" : null;
    assert.equal(f.nearby(), null); assert.equal(f.calls, before, `${realm} cannot resolve a surface prompt`);
  }
  f.options.view.inside = f.options.view.activeExpansionArea = null;
  Object.assign(f.pose, { x: -45, z: 153 }); f.options.position = { x: -43.2, z: 153 };
  f.options.view.folk.talkSpot = () => ({ x: -43.2, z: 153 });
  assert.equal(f.nearby(), null); assert.equal(f.full().available, false, "a locked live district cannot advertise Talk");
});

test("the current hall host keeps canonical clearance and the inclusive 3.3-unit reach", () => {
  const f = fixture(), plan = { host: "rowan", name: "Rowan's room", hall: { w: 20, d: 20, host: [0, -4], blocks: [] }, door: { x: 0, z: 0, facing: "south" } };
  f.options.insides = { "rowan-room": plan }; f.options.view.inside = "rowan-room";
  f.options.view.hallPoint = (x, z, y = 0) => ({ x: 4000 + x * K, z: z * K, y: y * K });
  for (const extra of [-1e-7, 0, RESIDENT_REACH_EPSILON / 2]) {
    f.options.position = { x: 4000 + 3.3 + extra, z: 6 };
    const resident = f.nearby(); assert.ok(resident); assert.deepEqual(resident, f.full()); assert.equal(resident.reach, 3.3);
  }
  f.options.position.x = 4000 + 3.3 + RESIDENT_REACH_EPSILON * 2;
  assert.equal(f.nearby(), null); assert.equal(f.calls, 0, "hall clearance never uses the surface talk port");
});
