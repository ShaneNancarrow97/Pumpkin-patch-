import test from "node:test";
import assert from "node:assert/strict";
import { createVillageShadowBudget } from "../src/rendering/village-shadow-budget.js";

const request = changes => ({ requested: true, context: "surface", shape: [2048, 2048, 28, -28], position: [0, 100, 0], target: [0, 0, 0], ...changes });
function next(budget, changes) { budget.beginFrame(); return budget.select("moon", request(changes)); }

test("skipped simulation ticks do not turn a half-rate shadow budget into every submitted frame", () => {
  for (const sourceTicksPerFrame of [1, 3, 7]) {
    const budget = createVillageShadowBudget(); let sourceDirty = true, legacyRefreshes = 0;
    for (let frame = 0; frame < 60; frame++) {
      for (let tick = 0; tick < sourceTicksPerFrame; tick++) if ((frame * sourceTicksPerFrame + tick) % 2 === 0) sourceDirty = true;
      if (sourceDirty) legacyRefreshes++;
      next(budget, { requested: sourceDirty }); sourceDirty = false;
    }
    assert.equal(budget.stats.refreshes, 30);
    assert.equal(budget.stats.frames, 60);
    if (sourceTicksPerFrame > 1) assert.equal(legacyRefreshes, 60, "all old frames inherited accumulated dirtiness");
  }
});

test("a deferred shadow request survives the source flag being consumed", () => {
  const budget = createVillageShadowBudget(); assert.equal(next(budget), true);
  assert.equal(next(budget), false);
  assert.equal(next(budget, { requested: false }), true);
  assert.equal(next(budget, { requested: false }), false);
  assert.equal(next(budget, { requested: false }), false);
  assert.equal(budget.stats.refreshes, 2);
});

test("travel between surface, rooms at the same origin and cave floors refreshes immediately", () => {
  const budget = createVillageShadowBudget();
  for (const context of ["surface", "rowan-workshop", "elowen-library", "cave-entry", "cave-deep", "surface"]) assert.equal(next(budget, { requested: false, context }), true);
  assert.equal(budget.stats.forced, 6);
});

test("a sub-footstep displacement bound refreshes moved shadows rather than stretching stale coverage", () => {
  const budget = createVillageShadowBudget(); next(budget);
  assert.equal(next(budget, { target: [.34, 0, 0], position: [.34, 100, 0] }), false);
  assert.equal(next(budget, { target: [.36, 0, 0], position: [.36, 100, 0] }), true);
  assert.equal(next(budget, { target: [.72, 0, 0], position: [.72, 100, 0] }), true);
  assert.equal(next(budget, { target: [4000, 0, 0], position: [4000, 100, 0] }), true);
});

test("light motion, projection, map size and light bias changes refresh without waiting for the cadence", () => {
  const budget = createVillageShadowBudget(); next(budget);
  assert.equal(next(budget, { position: [1, 100, 0] }), true);
  assert.equal(next(budget, { shape: [2048, 2048, 44, -44] }), true);
  assert.equal(next(budget, { shape: [1024, 1024, 44, -44] }), true);
  assert.equal(next(budget, { shape: [1024, 1024, 44, -44, -.0008] }), true);
});

test("a renderer-owned pending refresh, cinematic tour or explicit request is never deferred", () => {
  const budget = createVillageShadowBudget(); next(budget);
  assert.equal(next(budget, { rendererPending: true }), true);
  assert.equal(next(budget, { force: true }), true);
  assert.equal(next(budget, { force: true }), true);
  assert.equal(budget.stats.forced, 4);
});

test("warm re-entry, resize, re-enabled shadows and caller revisions invalidate the budget", () => {
  const budget = createVillageShadowBudget(); next(budget);
  for (let invalidation = 0; invalidation < 4; invalidation++) {
    budget.invalidate(); assert.equal(next(budget, { requested: false }), true);
  }
  assert.equal(budget.stats.invalidations, 4); assert.equal(budget.stats.refreshes, 5);
});
