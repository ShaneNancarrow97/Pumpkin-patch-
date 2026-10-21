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
  assert.ok(M.rotateDecor(s, p.instance, 45));
  assert.equal(p.x, 0); assert.equal(p.z, 0);
  assert.ok(M.fits(s, p.room, p.id, p.x, p.z, p.instance));
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
  assert.equal(p.x, 5.2); assert.ok(!M.fits(s, "kitchen", "d10", 1, 0, instance));
});

// A turned piece occupies its rectangle, not the empty corners around it.
test("fine placement packs rotated furniture near walls without accepting real collisions", () => {
  const s = M.freshState(), a = structuredClone(s.house.placed[0]);
  Object.assign(a, { x: 2, z: 2, rotation: 45 });
  s.house.placed = [a];
  assert.ok(M.fits(s, a.room, a.id, .1, .1, null, { rotation: 0 }));
  assert.equal(M.fits(s, a.room, a.id, 2, 2), false);
  assert.ok(M.rotateDecor(s, a.instance, 15));
  assert.ok(M.moveDecor(s, a.instance, a.x, 0));
  assert.equal(a.z, 0);
  assert.ok(M.rotateDecor(s, a.instance, 25));
  assert.equal(a.z, 0, "rotation at a wall clamps rather than pushing through it");
  assert.equal(M.moveDecor(s, a.instance, a.x, -.1), false);
  assert.equal(M.snapDecorPosition(1.234), 1.2);
  assert.equal(M.snapDecorPosition(1.234, 0), 1.234);
  assert.deepEqual(M.restoreState(M.saveData(s)).house.placed[0], a);
});

test("version9 twelve-plot saves migrate without losing progress or cosmetics", () => {
 const s=M.freshState();s.version=9;s.plots.length=s.plotLevels.length=s.plotCrops.length=12;
 s.coins=1234;s.plots[11]={phase:"growing",progress:.47,variety:2};s.plotLevels[11]=2;s.plotCrops[11]=2;
 const r=M.restoreState(M.saveData(s));
 assert.equal(r.version,10);assert.equal(r.plots.length,24);assert.equal(r.plotLevels.length,24);assert.equal(r.plotCrops.length,24);
 assert.equal(r.coins,1234);assert.deepEqual(r.plots[11],s.plots[11]);assert.deepEqual(r.house,s.house);
 assert.ok(r.plots.slice(12).every(p=>p.phase==="empty"));
});
