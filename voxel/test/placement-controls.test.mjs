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
  // Turned in the corner it keeps its centre: the chair itself is smaller than its cells.
  const fp = M.pieceFootprint(p);
  assert.ok(Math.abs(p.x + fp.w / 2 - 1) < 1e-6 && Math.abs(p.z + fp.d / 2 - 1) < 1e-6);
  assert.ok(M.fits(s, p.room, p.id, p.x, p.z, p.instance));
  const range = M.placementRange(s, p);
  assert.equal(M.fits(s, p.room, p.id, range.x0 - 0.05, p.z, p.instance), false, "but never through the wall");
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
  assert.ok(M.fits(s, a.room, a.id, a.x, a.z, a.instance) && a.z >= M.placementRange(s, a).z0 - 1e-6, "rotation at a wall clamps rather than pushing through it");
  assert.equal(M.moveDecor(s, a.instance, a.x, M.placementRange(s, a).z0 - .1), false);
  assert.equal(M.snapDecorPosition(1.234), 1.2);
  assert.equal(M.snapDecorPosition(1.234, 0), 1.234);
  assert.deepEqual(M.restoreState(M.saveData(s)).house.placed[0], a);
});

test("version9 twelve-plot saves migrate without losing progress or cosmetics", () => {
 const s=M.freshState();s.version=9;s.plots.length=s.plotLevels.length=s.plotCrops.length=12;
 s.coins=1234;s.plots[11]={phase:"growing",progress:.47,variety:2};s.plotLevels[11]=2;s.plotCrops[11]=2;
 const r=M.restoreState(M.saveData(s));
 assert.equal(r.version,M.STATE_VERSION);assert.equal(r.plots.length,24);assert.equal(r.plotLevels.length,24);assert.equal(r.plotCrops.length,24);
 assert.equal(r.coins,1234);assert.deepEqual(r.plots[11],s.plots[11]);assert.deepEqual(r.house,s.house);
 assert.ok(r.plots.slice(12).every(p=>p.phase==="empty"));
});

// Furniture collides by its measured size, not its cells: it stands against
// the walls, tucks into corners and sits as close to its neighbours as it looks.
test("pieces reach the walls and corners by their real size", () => {
  const s = M.freshState(); s.house.level = 3; s.coins = 1e6; s.house.placed = [];
  for (const id of ["f10", "f13", "f11"]) M.buyDecor(s, id);
  const table = M.placeDecor(s, "f10"), p = s.house.placed.find((q) => q.instance === table);
  const range = M.placementRange(s, p), body = M.pieceBody("f10");
  assert.ok(body.w < 3 && body.d < 2, "the dining table is smaller than its 3 x 2 cells");
  assert.ok(range.x0 < 0 && range.z0 < 0, "so its corner may sit past the wall line of its cells");
  // Into the back-right corner, clear of the stairs: as far as it goes.
  assert.ok(M.moveDecor(s, table, 6, range.z0));
  // Two low bookcases side by side, closer than their two-cell widths.
  const a = M.placeDecor(s, "f13"), b = M.placeDecor(s, "f11");
  assert.ok(M.moveDecor(s, a, 0, M.placementRange(s, s.house.placed.find((q) => q.instance === a)).z0));
  // The first's centre is at x 1; the second's can be just over half of each bookcase further on.
  const centre = 1 + M.pieceBody("f13").w / 2 + M.pieceBody("f11").w / 2 + 0.05;
  assert.ok(centre - 1 < 2, "nearer than the cells allowed");
  assert.ok(M.fits(s, "parlour", "f11", centre - 1, 0, b), "the next bookcase fits closer than a whole cell away");
  assert.equal(M.fits(s, "parlour", "f11", 1, 0, b), false, "but never inside the first");
});
