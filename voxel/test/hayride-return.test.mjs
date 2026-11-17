// Guest exits stay on their visible paths, including closure and save boundaries.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { HAYRIDE_PROPERTY } from "../src/content/hayride.js";
import { hayrideGuestPose, hayrideJourneyTiming, hayridePathLength, HAYRIDE_SITE } from "../src/content/hayride-layout.js";
import { counterPlace, farmPathEnd, inFarmPatch } from "../src/content/farm-layout.js";

function prepared() {
  const s = M.freshState(); s.hayride.purchased = true; s.hayride.open = true;
  s.upgrades.plots = 4; s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  return s;
}
function guest(s, id = 0, after = false) {
  const v = { id, kind: 0, profile: 0, budget: 100, originalBudget: 100, basket: [], preferred: [0], basketLimit: 1,
    spot: id % 7, age: 0, leaveAt: null, needs: M.freshGuestNeeds(id), festival: { done: true }, hollowConsidered: true, hayrideConsidered: true };
  v.hayride = M.planHayrideVisit(s, v, after ? "after" : "arrival", { force: true, ...hayrideJourneyTiming(v, after ? "after" : "arrival", s) });
  s.visitors.push(v); return v;
}
const closePoint = (a, b, tolerance = 1e-4) => assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < tolerance, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);

test("closing during either approach returns from the current lane position", () => {
  for (const after of [false, true]) for (const fraction of [.1, .6, .95]) {
    const s = prepared(), v = guest(s, 2, after), m = v.hayride;
    m.elapsed = m.approachSeconds * fraction; const before = hayrideGuestPose(s, v);
    M.setHayrideOpen(s, false); M.updateHayride(s, .000001);
    assert.equal(m.phase, "return"); closePoint(hayrideGuestPose(s, v), before);
    assert.deepEqual(m.returnPath.at(-1), after ? [-3, farmPathEnd(s)] : counterPlace(v.spot));
    assert.equal(m.returnSeconds, hayridePathLength(m.returnPath) / HAYRIDE_SITE.speed);
    assert.equal(s.hayride.ticketsSold, 0); assert.equal(v.budget, 100);
    for (const [x, z] of m.returnPath) assert.equal(inFarmPatch(x, z, s.upgrades.plots), false);
    M.updateHayride(s, 100); assert.equal(m.done, true);
  }
});

test("closing a whole queue preserves every guest's own position and eastern exit", () => {
  const s = prepared(), guests = Array.from({ length: 6 }, (_, id) => guest(s, id));
  for (const v of guests) v.hayride.phase = "queue";
  const before = guests.map(v => hayrideGuestPose(s, v));
  M.setHayrideOpen(s, false); M.updateHayride(s, .000001);
  for (const [i, v] of guests.entries()) {
    closePoint(hayrideGuestPose(s, v), before[i]);
    assert.ok(v.hayride.returnPath.some(([x, z]) => x === -12 && z === 25.2));
    assert.ok(v.hayride.returnPath.every(([x]) => x > -14), "queued guests never cross the wagon lane");
  }
  assert.equal(s.hayride.missed, guests.length); assert.equal(s.hayride.ticketsSold, 0);
});

test("a cancelled boarding walk keeps its position before taking the rear exit", () => {
  const s = prepared(), v = guest(s); v.hayride.phase = "boarding"; v.hayride.elapsed = .75;
  const before = hayrideGuestPose(s, v); M.setHayrideOpen(s, false); M.updateHayride(s, .000001);
  closePoint(hayrideGuestPose(s, v), before);
  assert.deepEqual(v.hayride.returnPath.slice(1, 3), [[-17, 33.5], [-19, 35.6]]);
  assert.equal(s.hayride.ticketsSold, 0);
});

test("completed unloading starts at the fixed apron on expanded farms and survives reload", () => {
  const s = prepared(), v = guest(s); v.hayride.phase = "boarding"; v.hayride.elapsed = 1.5;
  assert.equal(M.boardHayrideGuest(s, v), 8);
  Object.assign(s.hayride.convoy, { phase: "unloading", elapsed: HAYRIDE_PROPERTY.unloadSeconds - .00001 });
  Object.assign(v.hayride, { phase: "unloading", elapsed: HAYRIDE_PROPERTY.unloadSeconds - .00001 });
  const before = hayrideGuestPose(s, v); M.updateHayride(s, .00001);
  assert.equal(v.hayride.phase, "return"); closePoint(hayrideGuestPose(s, v), before);
  assert.deepEqual(v.hayride.returnPath[0], [-19, 35.6]);
  assert.deepEqual(v.hayride.returnPath[1], [-19, 38]);
  M.updateHayride(s, 4); const pose = hayrideGuestPose(s, v);
  const restored = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))), r = restored.visitors[0];
  assert.deepEqual(r.hayride.returnPath, v.hayride.returnPath); closePoint(hayrideGuestPose(restored, r), pose);
  assert.equal(r.budget, 92); M.updateHayride(restored, 100);
  assert.equal(restored.hayride.ticketsSold, 1); assert.equal(restored.hayride.income, 8); assert.equal(r.hayride.done, true);
});
