import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

test("free rotation preserves the centre, fits corners, and survives a save", () => {
  const s = M.freshState(), p = s.house.placed[0];
  const centre = [p.x + 1, p.z + 1];
  assert.ok(M.rotateDecor(s, p.instance, 45));
  const fp = M.pieceFootprint(p);
  assert.ok(Math.abs(p.x + fp.w / 2 - centre[0]) < 1e-6);
  assert.ok(Math.abs(p.z + fp.d / 2 - centre[1]) < 1e-6);
  assert.ok(M.fits(s, p.room, p.id, p.x, p.z, p.instance));
  const loaded = M.restoreState(M.saveData(s));
  assert.deepEqual(loaded.house.placed.find((q) => q.id === p.id), p);
  assert.ok(M.rotateDecor(s, p.instance, 360)); assert.equal(p.rotation, 0);
});

test("rotation never commits furniture through another piece or a room edge", () => {
  const s = M.freshState(), p = s.house.placed[0];
  assert.ok(M.moveDecor(s, p.instance, 0, 0)); const before = structuredClone(p);
  assert.equal(M.rotateDecor(s, p.instance, 45), false); assert.deepEqual(p, before);
  assert.equal(M.rotateDecor(s, p.instance, NaN), false);
  assert.equal(M.moveDecor(s, p.instance, Infinity, 0), false);
  assert.ok(!M.fits(s, p.room, p.id, 5.5, 0), "fractional overlap with the bookcase is still a collision");
});

test("wall pieces hang on side walls, avoid doorways and stairs, and restore", () => {
  const s = M.freshState(); s.house.level = 3; s.coins = 1e6;
  assert.ok(M.buyDecor(s, "d10")); const instance = M.placeDecor(s, "d10", "parlour");
  assert.ok(M.setDecorWall(s, instance, "left"));
  const p = s.house.placed.find((q) => q.instance === instance);
  assert.equal(p.wall, "left"); assert.ok(M.fits(s, p.room, p.id, p.x, p.z, instance));
  assert.equal(M.fits(s, p.room, p.id, 2.5, 0, instance), false, "doorway remains clear");
  assert.equal(M.fits(s, p.room, p.id, 1, 0, instance, { wall: "right" }), false, "stairs remain clear");
  assert.ok(M.setDecorWall(s, instance, "right")); assert.ok(p.x >= 5, "hangs only beyond the stairs");
  const loaded = M.restoreState(M.saveData(s));
  assert.deepEqual(loaded.house.placed.find((q) => q.id === "d10"), p);
  assert.equal(M.rotateDecor(s, instance, 45), false, "wall art stays upright against its wall");
});

// A side-wall hook may not borrow the space occupied by fixed room fixtures.
test("side-wall art avoids kitchen jar shelves", () => {
  const s = M.freshState(); s.house.level = 3; s.coins = 1e6;
  M.buyDecor(s, "d10"); const instance = M.placeDecor(s, "d10", "kitchen");
  assert.ok(M.setDecorWall(s, instance, "left"));
  const p = s.house.placed.find((q) => q.instance === instance);
  assert.equal(p.x, 5.5); assert.ok(!M.fits(s, "kitchen", "d10", 1, 0, instance));
});
