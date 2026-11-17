// Easy moving (handover 64): drags and taps land at the clear spot nearest the
// pointer, arrows hop past what's in the way, and wall pieces go round corners.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

// A level 2 parlour (13 by 7): a doorway on the left wall at z 2 to 4, stairs
// along the right wall's back five units and the back wall's right end.
function room(style = "parlour-plain-cream") {
  const s = M.freshState(); s.coins = 1e6; s.house.level = 2; s.house.placed = [];
  assert.ok(M.setRoomStyle(s, style));
  const put = (id, pose) => { assert.ok(M.buyDecor(s, id)); const i = M.placeDecor(s, id, "parlour"); const p = s.house.placed.find(q => q.instance === i); if (pose) Object.assign(p, pose); return p; };
  return { s, put };
}

test("a floor drag slides up to a neighbour and pins at the room's edge", () => {
  const { s, put } = room(), piano = put("household-piano", { x: 0, z: 5 }), washer = put("household-washing-machine", { x: 5, z: 5 });
  assert.ok(M.fits(s, "parlour", piano.id, 0, 5, piano.instance) && M.fits(s, "parlour", washer.id, 5, 5, washer.instance));
  // Onto the washer: the nearest clear spot, beside it rather than on it.
  assert.ok(!M.fits(s, "parlour", piano.id, 4.6, 5, piano.instance), "where it's dropped is taken");
  const spot = M.nearestSpot(s, piano, { x: 4.6, z: 5 });
  assert.ok(spot && M.fits(s, "parlour", piano.id, spot.x, spot.z, piano.instance));
  assert.ok(Math.hypot(spot.x - 4.6, spot.z - 5) <= M.NEAR_REACH + 1e-9);
  // Out through the side wall: pinned at the edge.
  const r = M.placementRange(s, piano);
  assert.deepEqual(M.nearestSpot(s, piano, { x: -4, z: 5 }), { x: +r.x0.toFixed(6), z: 5 });
  // Riders keep to their tops.
  assert.equal(M.nearestSpot(s, { ...piano, on: washer.instance }, { x: 1, z: 1 }), null);
});

test("a wall spot slides to the edge of a door, and is null with nothing clear in reach", () => {
  const { s, put } = room(), rail = put("household-towel-rail");
  assert.deepEqual(M.nearestSpot(s, rail, { wall: "left", x: 1.2, y: 1 }), { wall: "left", x: .7, y: 1, z: 0 });
  assert.equal(M.nearestSpot(s, rail, { wall: "left", x: 2.4, y: 1 }), null, "the middle of the doorway is too far from clear wall");
  const top = M.wallPlacementRange(s, rail).y1;
  assert.deepEqual(M.nearestSpot(s, rail, { wall: "back", x: 3, y: 9 }), { wall: "back", x: 3, y: +top.toFixed(6), z: 0 }, "pinned to the top of the wall");
});

test("floor arrows hop past a neighbour, but only a few units", () => {
  const { s, put } = room(), piano = put("household-piano", { x: 0, z: 0 }), washer = put("household-washing-machine", { x: 2, z: 0 });
  assert.ok(M.stepDecor(s, piano.instance, 1, 0));
  assert.equal(piano.x, 2.9, "past the washer, flush against it");
  assert.ok(M.stepDecor(s, piano.instance, -1, 0)); assert.equal(piano.x, 0, "and back over it");
  assert.ok(M.stepDecor(s, piano.instance, 1, 0)); assert.equal(piano.x, 2.9);
  // A row of baths beyond: nothing clear within four units, so it stays put.
  put("household-clawfoot-bath", { x: 4.9, z: 0 }); put("household-clawfoot-bath", { x: 7, z: 0 });
  assert.equal(M.stepDecor(s, piano.instance, 1, 0), false, "never further than four units");
  assert.equal(piano.x, 2.9);
  assert.ok(washer);
});

test("wall arrows hop a doorway and go round the back corners both ways", () => {
  const { s, put } = room(), rail = put("household-towel-rail");
  assert.ok(M.moveWallDecor(s, rail.instance, "left", .6, 1));
  // Towards the front along the left wall the doorway is in the way: the rail hops it.
  for (let i = 0; i < 2; i++) M.stepDecor(s, rail.instance, -1, 0);
  assert.ok(rail.x >= 4.05 && rail.x < 4.15, "hopped the doorway to its far side");
  // Up a wall a step at a time.
  const before = rail.y; assert.ok(M.stepDecor(s, rail.instance, 0, -1)); assert.equal(rail.y, +(before + .1).toFixed(6));
  // From the back wall's right end round onto the right wall, past the stairs that fill its back end.
  assert.ok(M.moveWallDecor(s, rail.instance, "back", 10, 1));
  let guard = 0; while (rail.wall === "back" && guard++ < 40) M.stepDecor(s, rail.instance, 1, 0);
  assert.equal(rail.wall, "right"); assert.ok(rail.x >= 5 - 1e-9, "clear of the stairs"); assert.equal(rail.y, 1, "at the same height");
  // The front end of a side wall goes nowhere.
  rail.x = M.wallPlacementRange(s, rail).x1;
  assert.equal(M.stepDecor(s, rail.instance, 1, 0), false); assert.equal(rail.wall, "right");
});

test("hanging on another wall starts at the shared corner and keeps the height", () => {
  const { s, put } = room(), rail = put("household-towel-rail");
  assert.ok(M.moveWallDecor(s, rail.instance, "left", 3, 3.8));
  assert.ok(M.hangOnWall(s, rail.instance, "back"));
  assert.deepEqual({ wall: rail.wall, x: rail.x, y: rail.y }, { wall: "back", x: .05, y: 3.8 }, "the back wall's left end");
  assert.ok(M.hangOnWall(s, rail.instance, "left"));
  assert.deepEqual({ wall: rail.wall, x: rail.x, y: rail.y }, { wall: "left", x: .05, y: 3.8 }, "the left wall's back end");
  assert.equal(M.hangOnWall(s, "nobody", "left"), false);
});

test("a piece fits only where it clears the room and every other piece on its own", () => {
  // A plain separating-axis check over every piece, as fits did before the pre-test.
  const { s, put } = room("parlour-manor"), piano = put("household-piano");
  put("household-guitar"); put("f01"); put("household-washing-machine", { rotation: 45 }); put("household-moth-rug");
  const pieces = M.roomPieces(s, "parlour").filter(p => p.instance !== piano.instance);
  let checked = 0, clear = 0, mismatched = 0;
  for (let x = -.5; x <= 13; x += .25) for (let z = -.5; z <= 7; z += .25) {
    const fast = M.fits(s, "parlour", piano.id, x, z, piano.instance);
    // Clear of every other floor piece by the full test, one at a time.
    const alone = pieces.every(q => { const saved = s.house.placed; s.house.placed = [piano, q]; const ok = M.fits(s, "parlour", piano.id, x, z, piano.instance); s.house.placed = saved; return ok; });
    const empty = (() => { const saved = s.house.placed; s.house.placed = [piano]; const ok = M.fits(s, "parlour", piano.id, x, z, piano.instance); s.house.placed = saved; return ok; })();
    if (fast !== (alone && empty)) mismatched++;
    if (fast) clear++;
    checked++;
  }
  assert.equal(mismatched, 0);
  assert.ok(checked > 1000 && clear > 50);
});
