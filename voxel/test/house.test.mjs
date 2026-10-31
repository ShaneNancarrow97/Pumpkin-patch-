import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

// A house at a given level with money to spend, and a way to stage a piece directly.
// A farm at the top patch level, so every house level is open to buy (rules/unlocks.js).
const at = (level) => { const s = M.freshState(); s.house.level = level; s.coins = 1e6; s.earned = 2e6; s.progression.claimed = M.LEVELS.map((l) => l.level); return s; };
const put = (s, room, id, x, z) => {
  if (!s.house.owned.includes(id)) s.house.owned.push(id);
  const instance = "t-" + s.house.placed.length + "-" + id;
  s.house.placed.push({ instance, id, room, x, z, flip: false, books: [] });
  return instance;
};
const SMALL = ["f04", "f08", "d01", "d02", "d03", "d05", "d06", "d07", "d08", "d12", "d13", "d14", "d15", "d16"];   // 1 x 1 floor pieces
const isBlocked = (s, room, x, z) => M.roomLayout(s, room).blocked.some((c) => c.x === x && c.z === z);
const clear = (s, p) => M.fits(s, p.room, p.id, p.x, p.z, p.instance);

test("rooms grow with the house, only to the right and towards the front", () => {
  const sizes = (id) => [0, 1, 2, 3].map((level) => { const L = M.roomLayout(at(level), id); return L && `${L.w}x${L.d}`; });
  assert.deepEqual(sizes("parlour"), ["10x6", "12x6", "13x7", "14x7"]);
  assert.deepEqual(sizes("bedroom"), [null, "10x6", "11x6", "12x7"]);
  assert.deepEqual(sizes("kitchen"), [null, null, "10x6", "11x7"]);
  assert.deepEqual(sizes("attic"), [null, null, null, "12x6"]);
  for (const r of M.houseRooms) for (let level = r.level; level < 3; level++) {
    const a = M.roomLayout(at(level), r.id), b = M.roomLayout(at(level + 1), r.id);
    assert.ok(b.w >= a.w && b.d >= a.d && b.capacity >= a.capacity && b.hooks.from === a.hooks.from && b.hooks.to >= a.hooks.to, r.id + " never shrinks");
  }
  const little = M.roomLayout(at(0), "parlour");
  assert.deepEqual([little.w, little.d, little.hooks.from, little.hooks.to], [M.GRID.w, M.GRID.d, M.HOOKS.from, M.HOOKS.to], "the little cottage is the old grid");
  assert.deepEqual([1, 2, 3].map((level) => M.roomCapacity(at(level), "bedroom")), [8, 10, 12]);
  assert.deepEqual([0, 1, 2, 3].map((level) => M.roomCapacity(at(level), "parlour")), [6, 10, 16, 24]);
  assert.equal(M.roomCapacity(at(0), "bedroom"), 0, "a shut room holds nothing");
  assert.equal(M.roomLayout(at(3), "parlour"), M.roomLayout(at(3), "parlour"), "layouts are cached");
  assert.ok(Object.isFrozen(M.roomLayout(at(3), "parlour").stairs[0].exit), "and frozen");
});

test("stairs, a doorway and a ladder join the rooms up, one storey over the next", () => {
  const s = at(3), L = (id) => M.roomLayout(s, id);
  assert.deepEqual(M.connections(at(0), "parlour"), []);
  assert.deepEqual(M.connections(at(1), "parlour"), [{ kind: "stair", to: "bedroom", way: "up" }]);
  assert.deepEqual(M.connections(s, "parlour"), [{ kind: "stair", to: "bedroom", way: "up" }, { kind: "door", to: "kitchen", way: "through" }]);
  assert.deepEqual(M.connections(s, "bedroom"), [{ kind: "stair", to: "parlour", way: "down" }, { kind: "ladder", to: "attic", way: "up" }]);
  assert.deepEqual(M.connections(s, "kitchen"), [{ kind: "door", to: "parlour", way: "through" }]);
  assert.deepEqual(M.connections(s, "attic"), [{ kind: "ladder", to: "bedroom", way: "down" }]);
  assert.deepEqual(M.houseRooms.map((r) => L(r.id).storey), [0, 1, 0, 2]);
  // Both ends of each link sit in the same place in the house.
  const houseX = (id, x) => L(id).offset + x;
  for (const level of [1, 2, 3]) {
    const t = at(level), up = M.roomLayout(t, "parlour").stairs[0], well = M.roomLayout(t, "bedroom").stairs[0];
    assert.equal(M.roomLayout(t, "parlour").offset + up.x, M.roomLayout(t, "bedroom").offset + well.x, "the stairwell is over the stairs");
    assert.deepEqual([up.z, up.d, up.rise], [well.z, well.d, well.rise]);
  }
  const ladder = L("bedroom").stairs[1], hatch = L("attic").stairs[0];
  assert.deepEqual([houseX("bedroom", ladder.x), ladder.z], [houseX("attic", hatch.x), hatch.z], "the hatch is over the ladder");
  assert.deepEqual([ladder.x, ladder.z], [L("bedroom").stairs[0].x, L("bedroom").stairs[0].z], "the ladder stands on the landing");
  const door = L("parlour").doors[0], back = L("kitchen").doors[0];
  assert.equal(houseX("parlour", 0), houseX("kitchen", L("kitchen").w), "the kitchen is built on to the parlour's left wall");
  assert.deepEqual([door.wall, back.wall, door.at, door.width], ["left", "right", back.at, back.width]);
  // What the next level brings, for the House tab.
  assert.deepEqual(M.nextLevel(at(0)).links, [M.HOUSE_LINKS[0]]);
  const next = M.nextLevel(at(1));
  assert.equal(next.cost, M.HOUSE_LEVELS[1].cost);
  assert.deepEqual(next.rooms.map((r) => `${r.id} ${r.opens ? "opens" : "grows"} ${r.to.w}x${r.to.d} ${r.to.capacity}`), ["parlour grows 13x7 16", "bedroom grows 11x6 10", "kitchen opens 10x6 8"]);
  assert.deepEqual(next.links, [{ kind: "door", from: "parlour", to: "kitchen" }]);
  assert.equal(M.nextLevel(s), null);
});

test("stairs, doorways and the space in front of them block placement", () => {
  const s = at(3), P = M.roomLayout(s, "parlour");
  s.house.owned.push("f04", "f16", "d10");
  for (const c of P.blocked) assert.ok(!M.fits(s, "parlour", "f04", c.x, c.z), `blocked at ${c.x}, ${c.z}`);
  assert.ok(isBlocked(s, "parlour", 13, 0) && isBlocked(s, "parlour", 13, 4), "the stairs up the right-hand wall");
  assert.ok(isBlocked(s, "parlour", 13, 5), "the foot of the stairs is kept clear");
  assert.ok(isBlocked(s, "parlour", 0, 2) && isBlocked(s, "parlour", 0, 3), "and the kitchen doorway's threshold");
  assert.equal(P.blocked.length, 8);
  assert.ok(M.fits(s, "parlour", "f04", 13, 6) && M.fits(s, "parlour", "f04", 12, 0) && M.fits(s, "parlour", "f04", 0, 4), "right beside them is fine");
  assert.ok(!M.fits(s, "parlour", "f16", 12, 4), "a rug can't go on the stairs either");
  assert.ok(M.fits(s, "parlour", "f16", 11, 5));
  // The upstairs end: the open stairwell and the step off the landing.
  assert.deepEqual(M.roomLayout(s, "bedroom").blocked.map((c) => `${c.x},${c.z}`), ["10,0", "11,0", "11,1", "11,2", "11,3", "11,4"]);
  assert.deepEqual(M.roomLayout(s, "attic").blocked.map((c) => `${c.x},${c.z}`), ["11,0", "11,1"]);
  // Wall pieces hang on more hooks in a wider room, and never past them.
  assert.ok(!M.fits(at(0), "parlour", "d10", 7, 0));
  assert.ok(M.fits(s, "parlour", "d10", 10, 0) && !M.fits(s, "parlour", "d10", 11, 0));
  // findSpot steps over the landing and the pieces along the back to a free place.
  const b = at(1);
  SMALL.slice(0, 8).forEach((id, x) => put(b, "bedroom", id, x, 0));
  const spot = M.findSpot(b, "bedroom", "f04");
  assert.ok(spot && M.fits(b, "bedroom", "f04", spot.x, spot.z));
  assert.ok(!M.roomLayout(b, "bedroom").blocked.some((c) => spot.x < c.x + 1 && spot.x + 1 > c.x && spot.z < c.z + 1 && spot.z + 1 > c.z), "not on the landing");
});

test("placement follows each room's size, capacity and blocked cells", () => {
  const s = at(3);
  assert.ok(M.buyDecor(s, "f02"));
  const sofa = M.placeDecor(s, "f02");
  assert.ok(M.moveDecor(s, sofa, 10, 5), "out into the bigger parlour");
  assert.ok(!M.moveDecor(s, sofa, 11, 5), "not on the foot of the stairs");
  assert.ok(!M.moveDecor(s, sofa, 10, 6), "not off the front");
  assert.ok(!M.moveDecor(s, sofa, 0, 1), "not in the doorway");
  assert.ok(M.sendToRoom(s, sofa, "attic"));
  const p = s.house.placed.find((q) => q.instance === sofa);
  assert.ok(clear(s, p) && p.room === "attic");
  // The bedroom holds 8 when it opens, and 2 more for each level after.
  const t = at(1);
  t.house.owned.push(...SMALL);
  for (const id of SMALL.slice(0, 8)) assert.ok(M.placeDecor(t, id, "bedroom"), id);
  assert.equal(M.placeDecor(t, SMALL[8], "bedroom"), null, "the bedroom is full");
  assert.ok(M.roomPieces(t, "bedroom").every((q) => clear(t, q)));
  t.house.level = 2;
  assert.ok(M.placeDecor(t, SMALL[8], "bedroom"));
});

test("upgrading never leaves a piece on new stairs or in a doorway", () => {
  const s = M.freshState();
  s.coins = 1e6; s.earned = 2e6; s.progression.claimed = M.LEVELS.map((l) => l.level); 
  for (const id of ["f04", "f08", "d01", "d02"]) { M.buyDecor(s, id); M.placeDecor(s, id); }
  const before = JSON.stringify(s.house.placed);
  assert.deepEqual(M.upgradeHouse(s), { level: 1, moved: [], stored: [] }, "the stairs go up on new floor");
  assert.equal(JSON.stringify(s.house.placed), before);
  // The kitchen doorway opens in the parlour's left wall, where the armchair now stands.
  const chair = s.house.placed.find((p) => p.id === "f01");
  assert.ok(M.moveDecor(s, chair.instance, 0, 2));
  const grown = M.upgradeHouse(s);
  assert.deepEqual(grown.moved, [{ instance: chair.instance, id: "f01", room: "parlour", x: 3.5, z: 0 }]);
  assert.deepEqual([chair.x, chair.z], [3.5, 0], "to the first free spot");
  assert.deepEqual(grown.stored, []);
  assert.ok(s.house.placed.every((p) => clear(s, p)), "everything has a proper place");
  assert.deepEqual(M.upgradeHouse(s), { level: 3, moved: [], stored: [] });
  // With no spot big enough, a piece goes back into storage.
  const t = at(1);
  t.house.placed = [];
  const bed = put(t, "parlour", "f06", 0, 1);
  [[3, 2], [6, 2], [9, 2], [3, 5], [6, 5], [9, 5], [2, 5]].forEach(([x, z], i) => put(t, "parlour", SMALL[i], x, z));
  assert.ok(t.house.placed.every((p) => clear(t, p)));
  const r = M.upgradeHouse(t);
  assert.deepEqual([r.moved, r.stored], [[], [{ instance: bed, id: "f06", room: "parlour" }]]);
  assert.ok(t.house.owned.includes("f06") && !t.house.placed.some((p) => p.id === "f06"), "still owned, waiting in storage");
});

test("old saves: pieces on the 10 x 6 grid keep their places, and none are lost to the new stairs", () => {
  const piece = (instance, id, room, x, z, books = []) => ({ instance, id, room, x, z, flip: false, books });
  const raw = {
    level: 2, owned: ["f01", "f11", "b01", "f04", "d13", "f05", "f13", "d10"], nextInstance: 9,
    placed: [
      piece("piece-0", "f01", "parlour", 2, 3), piece("piece-1", "f11", "parlour", 6, 0, ["b01"]), piece("piece-2", "d10", "parlour", 5, 0),
      piece("piece-3", "f04", "parlour", 0, 2),                                   // where the kitchen doorway is now
      piece("piece-4", "f05", "bedroom", 7, 0),                                   // the bed over the top of the stairs
      piece("piece-5", "d13", "kitchen", 9, 3),                                   // on the doorway's threshold
      piece("piece-6", "f13", "bedroom", 0, 0),
    ],
  };
  const h = M.restoreHouse(raw), s = { house: h };
  assert.equal(h.placed.length, 7, "every piece kept");
  const where = (id) => { const p = h.placed.find((q) => q.id === id); return [p.room, p.x, p.z]; };
  for (const id of ["f01", "f11", "d10", "f13"]) { const p = raw.placed.find((q) => q.id === id); assert.deepEqual(where(id), [p.room, p.x, p.z], id + " stays put"); }
  for (const id of ["f04", "f05", "d13"]) {
    const p = raw.placed.find((q) => q.id === id), [room, x, z] = where(id);
    assert.ok(room === p.room && (x !== p.x || z !== p.z), id + " moved within its room");
  }
  assert.ok(h.placed.every((p) => clear(s, p)));
  assert.deepEqual(h.placed.find((p) => p.id === "f11").books, ["b01"]);
  assert.deepEqual(M.restoreHouse(JSON.parse(JSON.stringify(h))), h, "and it round-trips");
});
