import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { intoHostFrame, riderSize, nextFinish } from "../src/rules/surfaces.js";
import { BASE } from "../src/content/placement.js";

// A parlour at the top level with whatever pieces are named placed in it.
function room(...ids) {
  const s = M.freshState(); s.house.level = 3; s.coins = 1e6; s.paused = false;
  const at = {};
  for (const id of ids) { assert.ok(M.buyDecor(s, id), id); at[id] = M.placeDecor(s, id, "parlour"); assert.ok(at[id], `${id} placed`); }
  // The dining table out in the middle, clear of the doorway, to turn freely.
  if (at.f10) assert.ok(M.moveDecor(s, at.f10, 5, 2));
  return { s, at, piece: (id) => s.house.placed.find((p) => p.instance === at[id]) };
}
const within = (p, t) => {
  const r = riderSize(p.id), hw = (r.w * BASE) / 2, hd = (r.d * BASE) / 2;
  return p.x - hw >= t.x - 1e-6 && p.x + hw <= t.x + t.w + 1e-6 && p.z - hd >= t.z - 1e-6 && p.z + hd <= t.z + t.d + 1e-6;
};

test("a lamp goes onto a table top and stands within it", () => {
  const { s, at, piece } = room("f08", "d05");
  assert.equal(M.putOnTop(s, at.d05), at.f08);
  const lamp = piece("d05"), top = M.hostSurfaces(piece("f08"))[lamp.top];
  assert.equal(lamp.on, at.f08);
  assert.ok(within(lamp, top), "its base is on the top");
  assert.ok(M.fits(s, "parlour", "d05", lamp.x, lamp.z, lamp.instance, lamp));
  // Off the table it does not fit there, and big pieces never ride.
  assert.equal(M.fits(s, "parlour", "d05", lamp.x + 1, lamp.z, lamp.instance, lamp), false);
  const { s: s2, at: at2 } = room("f08", "f02");
  assert.equal(M.putOnTop(s2, at2.f02), false);
});

test("a piece on a table leaves the floor free, and a top holds only what fits", () => {
  const { s, at, piece } = room("f10", "d05", "d06", "d12", "d15", "d03", "d08");
  for (const id of ["d05", "d06", "d12", "d15", "d03", "d08"]) M.putOnTop(s, at[id], at.f10);
  const on = s.house.placed.filter((p) => p.on === at.f10);
  assert.ok(on.length >= 3, `the dining table holds a few things (${on.length})`);
  const table = piece("f10"), top = M.hostSurfaces(table)[0];
  for (const p of on) assert.ok(within(p, top), p.id);
  // No two of them stand in the same place.
  for (const a of on) for (const b of on) if (a !== b) assert.ok(Math.abs(a.x - b.x) > 0.05 || Math.abs(a.z - b.z) > 0.05, `${a.id} and ${b.id}`);
  // A floor piece can go where a lamp was, now the lamp is on the table.
  assert.ok(M.findSpot(s, "parlour", "f08") !== null);
});

test("next top cycles round the room and skips a shelf too low for a tall piece", () => {
  const { s, at, piece } = room("f08", "shelf-two-tier", "d01");
  const visits = new Set();
  for (let i = 0; i < 4; i++) { M.putOnTop(s, at.d01); const p = piece("d01"); visits.add(`${p.on}#${p.top}`); }
  assert.ok(visits.has(`${at.f08}#0`), "the tea table");
  assert.ok(visits.has(`${at["shelf-two-tier"]}#1`), "the shelf's top board");
  assert.equal(visits.has(`${at["shelf-two-tier"]}#0`), false, "the candelabrum is taller than the gap between the boards");
  // A shorter piece fits the lower board.
  const { s: s2, at: at2, piece: piece2 } = room("shelf-two-tier", "d06");
  M.putOnTop(s2, at2.d06); M.putOnTop(s2, at2.d06);
  assert.ok(new Set([piece2("d06").top]).size === 1);
});

test("what stands on a piece moves, turns, mirrors, changes room and goes into storage with it", () => {
  const { s, at, piece } = room("f10", "d03");
  M.putOnTop(s, at.d03, at.f10);
  const before = { ...piece("d03") };
  assert.ok(M.rotateDecor(s, at.f10, 90));
  assert.deepEqual({ x: piece("d03").x, z: piece("d03").z, on: piece("d03").on }, { x: before.x, z: before.z, on: before.on }, "riders keep their place on the table");
  assert.ok(M.fits(s, "parlour", "d03", piece("d03").x, piece("d03").z, at.d03, piece("d03")));
  const unflipped = structuredClone(piece("f10"));
  M.flipDecor(s, at.f10);
  assert.equal(piece("d03").x, +(M.footprint("f10").w - before.x).toFixed(6), "mirrored with the table");
  assert.ok(M.restorePose(s, at.f10, unflipped));
  assert.equal(piece("d03").x, before.x, "and back again with Undo");
  M.flipDecor(s, at.f10);
  assert.ok(M.sendToRoom(s, at.f10, "bedroom"));
  assert.equal(piece("d03").room, "bedroom");
  assert.ok(M.removeDecor(s, at.f10));
  assert.equal(piece("d03"), undefined, "into storage with the table");
  assert.ok(s.house.owned.includes("d03"));
});

test("a lamp turns on its table, comes down to the floor near it, and Undo puts it back", () => {
  const { s, at, piece } = room("f10", "d05");
  M.putOnTop(s, at.d05, at.f10);
  const onTable = structuredClone(piece("d05"));
  assert.ok(M.rotateDecor(s, at.d05, 45));
  assert.equal(piece("d05").rotation, 45);
  assert.ok(M.setDown(s, at.d05));
  const lamp = piece("d05"), table = piece("f10"), tf = M.pieceFootprint(table);
  assert.equal(lamp.on, undefined); assert.equal(lamp.top, undefined);
  assert.ok(M.fits(s, "parlour", "d05", lamp.x, lamp.z, lamp.instance));
  assert.ok(Math.hypot(lamp.x - (table.x + tf.w / 2), lamp.z - (table.z + tf.d / 2)) < 3, "near the table");
  assert.ok(M.restorePose(s, at.d05, onTable));
  assert.equal(piece("d05").on, at.f10);
  const floor = { ...piece("d05"), x: lamp.x, z: lamp.z }; delete floor.on; delete floor.top;
  assert.ok(M.restorePose(s, at.d05, floor));
  assert.equal(piece("d05").on, undefined);
});

test("riders survive a save, and one whose table is gone lands on the floor", () => {
  const { s, at } = room("f10", "d03", "d05");
  M.putOnTop(s, at.d03, at.f10); M.putOnTop(s, at.d05, at.f10);
  const raw = JSON.parse(JSON.stringify(s.house));
  const back = M.restoreHouse(raw);
  assert.deepEqual(back.placed.filter((p) => p.on).map((p) => [p.id, p.on, p.top]).sort(), [["d03", at.f10, 0], ["d05", at.f10, 0]]);
  // Riders saved before their table in the list still find it.
  const reversed = M.restoreHouse({ ...raw, placed: [...raw.placed].reverse() });
  assert.equal(reversed.placed.filter((p) => p.on).length, 2);
  const lost = M.restoreHouse({ ...raw, placed: raw.placed.filter((p) => p.id !== "f10") });
  assert.ok(lost.placed.some((p) => p.id === "d03" && !p.on), "back on the floor");
  const nonsense = M.restoreHouse({ ...raw, placed: raw.placed.map((p) => (p.on ? { ...p, top: 7 } : p)) });
  assert.equal(nonsense.placed.filter((p) => p.on).length, 0);
});

test("growing the house keeps riders on their tables, or stores them with a table that has to go", () => {
  const { s, at, piece } = room("f10", "d05");
  s.house.level = 0;
  M.putOnTop(s, at.d05, at.f10);
  s.progression.claimed = M.LEVELS.map((l) => l.level);
  const grown = M.upgradeHouse(Object.assign(s, { coins: 1e6, earned: 2e6 }));
  assert.ok(grown);
  if (piece("f10")) assert.equal(piece("d05").on, at.f10);
  else assert.ok(grown.stored.some((p) => p.id === "d05"));
});

test("blank shelves can be bought, come in a finish that keeps through a save, and hold things", () => {
  const { s, at, piece } = room("shelf-etagere", "d12");
  const shelf = piece("shelf-etagere");
  assert.equal(shelf.finish, "walnut");
  shelf.finish = nextFinish("shelf-etagere", shelf.finish);
  assert.equal(shelf.finish, "ebony");
  assert.equal(M.restoreHouse(JSON.parse(JSON.stringify(s.house))).placed.find((p) => p.id === "shelf-etagere").finish, "ebony");
  assert.equal(M.restoreHouse({ ...JSON.parse(JSON.stringify(s.house)), placed: s.house.placed.map((p) => ({ ...p, finish: "tartan" })) }).placed.find((p) => p.id === "shelf-etagere").finish, "walnut");
  assert.equal(M.hostSurfaces(shelf).length, 3);
  assert.equal(M.putOnTop(s, at.d12, at["shelf-etagere"]), at["shelf-etagere"]);
  assert.ok(M.decorCategories.some(([id, name]) => id === "shelves" && name === "Shelves"));
  assert.ok(M.decorCatalog.filter((it) => it.category === "shelves").length >= 5);
});

test("arrows nudge a rider the way they point, however its table is turned", () => {
  assert.deepEqual(intoHostFrame(1, 0, 0), { x: 1, z: 0 });
  // A table turned a quarter: its own x runs towards the back of the room.
  const q = intoHostFrame(1, 0, 90);
  assert.ok(Math.abs(q.x) < 1e-9 && Math.abs(q.z - 1) < 1e-9);
  const { s, piece } = room("f10");
  assert.equal(M.hostYaw(piece("f10")), 0);
  M.rotateDecor(s, piece("f10").instance, 30);
  assert.equal(M.hostYaw(piece("f10")), 30);
});
