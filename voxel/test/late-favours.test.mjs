import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

test("the grand favours pay out once their season's work is done", () => {
  const s = M.freshState(), f = M.FAVOURS.find((x) => x.id === "warm-hands");
  assert.equal(M.claimFavour(s, f.id), 0);
  s.festival.cocoa.sold = f.target;
  const coins = s.coins;
  assert.equal(M.claimFavour(s, f.id), f.reward);
  assert.equal(s.coins, coins + f.reward);
  assert.equal(M.claimFavour(s, f.id), 0, "a favour is thanked only once");
});

test("every favour and memory reads a fresh save without error, and none is met at the start", () => {
  const s = M.freshState();
  for (const f of M.FAVOURS) { assert.ok(Number.isFinite(M.favourProgress(s, f)), f.id); assert.ok(M.favourProgress(s, f) < f.target, f.id); assert.match(M.favourFace(f), /^(natalie|visitor-[a-z-]+)$/); }
  for (const m of M.MEMORIES) assert.equal(m.met(s), false, m.id);
  assert.equal(new Set(M.FAVOURS.map((f) => f.id)).size, M.FAVOURS.length);
  assert.equal(new Set(M.MEMORIES.map((m) => m.id)).size, M.MEMORIES.length);
});

test("grand favours are kept across a save", () => {
  const s = M.freshState(); s.harvested = 2500; M.claimFavour(s, "harvester");
  assert.ok(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).claimed.includes("harvester"));
});
