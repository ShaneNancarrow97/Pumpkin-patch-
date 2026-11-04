import test from "node:test";
import assert from "node:assert/strict";
import * as H from "../src/rules/house.js";

const state = (level = 0, plain = true) => {
  const s = { coins: 1e6, paused: false, house: H.freshHouse() };
  s.house.level = level;
  s.house.placed = [];
  if (plain) for (const room of ["parlour", "bedroom", "kitchen", "attic"]) s.house.roomStyles[room] = `${room}-plain-${room === "attic" ? "ash" : "cream"}`;
  return s;
};
const buy = (s, id, count = 1) => { for (let i = 0; i < count; i++) assert.equal(H.buyDecor(s, id), true, id); };
const piece = (s, instance) => s.house.placed.find(p => p.instance === instance);
const allClear = s => s.house.placed.every(p => H.fits(s, p.room, p.id, p.x, p.z, p.instance));

test("paid furniture copies can coexist, store and place again without losing ownership", () => {
  const s = state(), id = "household-cream-mug", before = s.coins;
  buy(s, id, 3);
  assert.equal(s.coins, before - 3 * H.decorById[id].price);
  assert.equal(s.house.owned.filter(x => x === id).length, 1);
  assert.deepEqual([H.ownedCopies(s, id), H.placedCopies(s, id), H.availableCopies(s, id)], [3, 0, 3]);
  const instances = [H.placeDecor(s, id), H.placeDecor(s, id), H.placeDecor(s, id)];
  assert.equal(new Set(instances).size, 3);
  assert.ok(instances.every(Boolean));
  assert.equal(H.placeDecor(s, id), null, "a fourth unpurchased copy cannot appear");
  assert.equal(H.removeDecor(s, instances[1]), true);
  assert.deepEqual([H.ownedCopies(s, id), H.placedCopies(s, id), H.availableCopies(s, id)], [3, 2, 1]);
  assert.ok(H.placeDecor(s, id));
  assert.equal(allClear(s), true);
  const restored = H.restoreHouse(JSON.parse(JSON.stringify(s.house)));
  assert.equal(restored.placed.filter(p => p.id === id).length, 3);
  assert.deepEqual(restored.copies, s.house.copies);
});

test("books remain unique, while a wallpaper purchase is reusable", () => {
  const s = state(2);
  buy(s, "b02");
  assert.equal(H.buyDecor(s, "b02"), false);
  const paper = H.decorCatalog.find(x => x.category === "wallpaper").id;
  buy(s, paper);
  assert.equal(H.buyDecor(s, paper), false);
  assert.equal(H.applyWallpaper(s, "parlour", paper), true);
  assert.equal(H.applyWallpaper(s, "bedroom", paper), true);
  assert.equal(H.ownedCopies(s, paper), 1);
  assert.equal(H.placeDecor(s, "b02"), null);
});

test("copies migrate from legacy ownership and repair duplicate instance identities", () => {
  const s = state(), id = "household-cream-mug";
  buy(s, id, 2);
  const a = H.placeDecor(s, id), b = H.placeDecor(s, id);
  piece(s, b).instance = a;
  const restored = H.restoreHouse(s.house);
  assert.equal(restored.placed.length, 2);
  assert.equal(new Set(restored.placed.map(p => p.instance)).size, 2);
  assert.equal(H.availableCopies({ house: restored }, id), 0);
  const legacy = H.restoreHouse({ level: 0, owned: ["d10"], placed: [{ instance: "legacy", id: "d10", room: "parlour", x: 3.5, z: 0, books: [] }] });
  assert.equal(legacy.copies.d10, 1);
  assert.equal(legacy.placed[0].instance, "legacy");
  assert.equal(Object.hasOwn(legacy.placed[0], "y"), false, "legacy mount stays implicit");
  const bad = H.restoreHouse({ owned: [id, "constructor", "__proto__"], copies: { [id]: Infinity }, placed: [] });
  assert.deepEqual(bad.owned, [id]);
  assert.equal(bad.copies[id], 1, "malformed quantity cannot erase a paid item");
});

test("wall pieces move vertically and stack above each other on all three walls", () => {
  const s = state();
  buy(s, "d10", 3);
  const a = H.placeDecor(s, "d10"), b = H.placeDecor(s, "d10"), c = H.placeDecor(s, "d10");
  assert.equal(H.moveWallDecor(s, c, "left", 2, .2), true, "different wall has its own surface");
  assert.equal(H.moveWallDecor(s, a, "back", 2, .2), true);
  assert.equal(H.moveWallDecor(s, b, "back", 2, 1.6), true, "same horizontal span above another picture");
  assert.equal(H.moveWallDecor(s, b, "back", 2, .4), false, "actual 2D overlap rejected");
  assert.equal(H.moveWallDecor(s, c, "right", 2.35, 2.125), true);
  assert.deepEqual([piece(s, c).wall, piece(s, c).x, piece(s, c).y, piece(s, c).z], ["right", 2.35, 2.125, 0]);
  assert.equal(allClear(s), true);
  const restored = H.restoreHouse(JSON.parse(JSON.stringify(s.house)));
  assert.deepEqual(restored.placed.map(p => [p.wall, p.x, p.y]), s.house.placed.map(p => [p.wall, p.x, p.y]));
});

test("wall bounds use real item heights and permit the whole plain wall", () => {
  const s = state(), id = "household-coat-hooks", p = { id, room: "parlour", wall: "back" };
  const r = H.wallPlacementRange(s, p);
  assert.deepEqual(r, { x0: .05, x1: 8.75, y0: .05, y1: 4.65, z0: 0, z1: 0 });
  assert.equal(H.fits(s, "parlour", id, r.x0, 0, undefined, { wall: "back", y: .05 }), true);
  assert.equal(H.fits(s, "parlour", id, r.x1, 0, undefined, { wall: "back", y: r.y1 }), true);
  assert.equal(H.fits(s, "parlour", id, .049, 0, undefined, { y: .05 }), false);
  assert.equal(H.fits(s, "parlour", id, 1, 0, undefined, { y: r.y1 + .01 }), false);
  assert.equal(H.fits(s, "parlour", id, 1, 0, undefined, { y: NaN }), false);
  assert.equal(H.fits(s, "parlour", id, 1, 1, undefined, { y: .5 }), false, "wall z remains the legacy zero coordinate");
});

test("authored windows and doors reserve real rectangles rather than whole columns", () => {
  const s = state(2, false), id = "household-coat-hooks";
  assert.ok(H.wallZones(s, "parlour", "back").some(z => z.kind === "window"));
  assert.equal(H.fits(s, "parlour", id, .8, 0, undefined, { y: 2 }), false, "not through the window");
  assert.equal(H.fits(s, "parlour", id, .8, 0, undefined, { y: .1 }), true, "space below its sill");
  assert.equal(H.fits(s, "parlour", id, .8, 0, undefined, { y: 4.3 }), true, "space above its frame");
  assert.equal(H.fits(s, "parlour", id, 2.25, 0, undefined, { wall: "left", y: 1 }), false, "door opening");
  assert.equal(H.fits(s, "parlour", id, 2.25, 0, undefined, { wall: "left", y: 3.8 }), true, "art above a door remains possible");
  assert.equal(H.fits(s, "parlour", id, 2.25, 0, undefined, { wall: "right", y: 3.8 }), false, "stair clearance remains protected");
});

test("legacy mount defaults remain stable, explicit invalid heights safely clamp on restore", () => {
  const s = state();
  assert.equal(H.wallMountHeight(s, { id: "d10" }), 2.9 - H.wallPieceHeight("d10") / 2);
  assert.equal(H.wallMountHeight(s, { id: "d04" }), 5.2 - .45 - H.wallPieceHeight("d04"));
  buy(s, "d10", 2);
  const a = H.placeDecor(s, "d10"), b = H.placeDecor(s, "d10");
  Object.assign(piece(s, a), { x: 2, y: 100 });
  Object.assign(piece(s, b), { x: 4, y: -100 });
  const h = H.restoreHouse(s.house), restored = { house: h };
  assert.equal(h.placed.length, 2);
  assert.equal(piece(restored, a).y, H.wallPlacementRange(restored, piece(restored, a)).y1);
  assert.equal(piece(restored, b).y, .05);
  assert.equal(allClear(restored), true);
});

test("switching ornate/plain styles rehomes only conflicts and conserves paid copies", () => {
  const s = state();
  assert.equal(H.setRoomStyle(s, "parlour-haunted"), false, "a free tier finish does not bypass its house upgrade");
  buy(s, "d10");
  const a = H.placeDecor(s, "d10");
  assert.equal(H.moveWallDecor(s, a, "back", 2.8, 2), true);
  assert.equal(H.setRoomStyle(s, "parlour-warm"), true);
  assert.equal(allClear(s), true, "new columns never clip existing art");
  assert.equal(H.ownedCopies(s, "d10"), 1);
  assert.equal(H.setRoomStyle(s, "parlour-plain-cream"), true);
  assert.equal(H.wallZones(s, "parlour", "back").length, 0);
  assert.equal(H.setRoomStyle(s, "house-default"), true);
  assert.equal(H.roomStyle(s, "parlour").id, "parlour-warm");
});

test("bathroom ownership changes cached layouts, doors and preserves room upgrades", () => {
  const s = state(2), before = H.roomLayout(s, "kitchen");
  assert.equal(H.roomLayout(s, "bathroom"), null);
  assert.equal(H.roomUnlocked(s, "bathroom"), false);
  s.house.extensions.bathroom = true;
  const bath = H.roomLayout(s, "bathroom"), kitchen = H.roomLayout(s, "kitchen");
  assert.notEqual(kitchen, before);
  assert.deepEqual([bath.w, bath.d, bath.storey, bath.offset, bath.stairs.length], [6, 6, 0, -16, 0]);
  assert.equal(bath.offset + bath.w, kitchen.offset);
  assert.ok(kitchen.doors.some(d => d.wall === "left" && d.to === "bathroom"));
  assert.ok(bath.doors.some(d => d.wall === "right" && d.to === "kitchen"));
  assert.equal(H.roomCapacity(s, "bathroom"), 48);
  buy(s, "household-basin");
  assert.ok(H.placeDecor(s, "household-basin", "bathroom"));
  const h = H.restoreHouse(JSON.parse(JSON.stringify(s.house)));
  assert.equal(h.extensions.bathroom, true);
  assert.equal(h.placed[0].room, "bathroom");
});

test("room budgets support small collections instead of filling after six mugs", () => {
  const s = state(), id = "household-cream-mug";
  buy(s, id, 49);
  for (let i = 0; i < 48; i++) assert.ok(H.placeDecor(s, id), `copy ${i + 1}`);
  assert.equal(H.roomCapacity(s, "parlour"), 48);
  assert.equal(H.placeDecor(s, id), null);
  assert.equal(H.availableCopies(s, id), 1);
});

test("wall transfers preserve chosen height and media round trips safely", () => {
  const s = state(2);
  buy(s, "household-wall-television");
  const a = H.placeDecor(s, "household-wall-television");
  assert.equal(H.moveWallDecor(s, a, "left", 4.3, .7), true);
  piece(s, a).media = { on: true, channel: 2 };
  assert.equal(H.sendToRoom(s, a, "bedroom"), true);
  assert.equal(piece(s, a).y, .7);
  const h = H.restoreHouse(JSON.parse(JSON.stringify(s.house)));
  assert.deepEqual(h.placed[0].media, { on: true, channel: 2 });
  assert.equal(h.placed[0].y, .7);
});
