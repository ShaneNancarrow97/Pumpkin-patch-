import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rules/house-estate.js";

const state = (level = 0) => ({ house: { level }, estate: E.freshEstate(), coins: 20000, paused: false });
const empty = (level = 0) => { const s = state(level); s.estate.placed = []; return s; };
const copies = (s, id) => s.estate.ownedDecor[id] + s.estate.placed.filter(p => p.id === id).length;

test("the free welcome garden is valid and round-trips without touching the house", () => {
  const s = state(); assert.equal(s.estate.placed.length, 5); assert.equal(E.estateScore(s), 6);
  for (const p of s.estate.placed) assert.equal(E.estateFits(s, p.id, p.x, p.z, p.rotation, p.instance), true, p.instance);
  assert.deepEqual(E.restoreEstate(s.estate), s.estate);
  assert.deepEqual(E.restoreEstate(null), E.freshEstate()); assert.deepEqual(E.restoreEstate([]), E.freshEstate());
  assert.equal(s.house.level, 0); assert.equal(s.coins, 20000);
});

test("each garden expansion requires its existing house level and a separate payment", () => {
  const s = state(), pieces = structuredClone(s.estate.placed);
  assert.equal(E.canExpandEstate(s), false); assert.equal(E.expandEstate(s), false);
  for (let level = 1; level <= 3; level++) {
    s.house.level = level; const next = E.ESTATE_EXPANSIONS[level], before = s.coins;
    assert.equal(E.canExpandEstate(s), true); assert.equal(E.expandEstate(s), true);
    assert.equal(s.coins, before - next.cost); assert.equal(s.estate.expansion, level);
    assert.equal(E.estateBounds(s).width, next.width); assert.equal(E.estateBounds(s).capacity, next.capacity);
    assert.deepEqual(s.estate.placed, pieces);
  }
  assert.equal(E.expandEstate(s), false); assert.equal(s.estate.invested, 9350);
  const poor = state(3); poor.coins = 649; assert.equal(E.expandEstate(poor), false); assert.equal(poor.coins, 649);
});

test("buying, moving, rotating and storing conserve paid decoration copies", () => {
  const s = empty(), id = "garden-bench", before = s.coins;
  assert.equal(E.placeEstateDecor(s, id, 10, 2), false);
  assert.equal(E.buyEstateDecor(s, id), true); assert.equal(s.coins, before - 250); assert.equal(copies(s, id), 1);
  const p = E.placeEstateDecor(s, id, 10, 2, 450); assert.ok(p); assert.equal(p.rotation, 90);
  assert.equal(copies(s, id), 1); assert.equal(s.estate.ownedDecor[id], 0);
  assert.equal(E.placeEstateDecor(s, id, -10, 2), false);
  assert.ok(E.moveEstateDecor(s, p.instance, -10, -2, -15)); assert.equal(p.rotation, 345);
  const snapshot = structuredClone(p); assert.equal(E.moveEstateDecor(s, p.instance, 0, 0, 45), false); assert.deepEqual(p, snapshot);
  assert.equal(E.storeEstateDecor(s, p.instance), true); assert.equal(copies(s, id), 1); assert.equal(s.estate.ownedDecor[id], 1);
  assert.equal(E.storeEstateDecor(s, p.instance), false); assert.ok(E.placeEstateDecor(s, id, -10, -2, 30));
  assert.equal(copies(s, id), 1); assert.equal(s.estate.invested, 250);
});

test("all angle directions respect fence bounds and the reserved house and gate path", () => {
  const s = empty(3);
  for (let rotation = -360; rotation <= 720; rotation += 15) {
    assert.equal(E.estateFits(s, "garden-bench", 10, 0, rotation), true, "side space " + rotation);
    assert.equal(E.estateFits(s, "garden-bench", 0, 0, rotation), false, "house " + rotation);
    assert.equal(E.estateFits(s, "garden-bench", 0, 10, rotation), false, "gate path " + rotation);
    assert.equal(E.estateFits(s, "garden-bench", 12.5, 0, rotation), false, "fence " + rotation);
  }
  assert.equal(E.estateFits(s, "garden-bench", 11.9, 0, 0), false);
  assert.equal(E.estateFits(s, "garden-bench", 11.9, 0, 90), true);
  assert.equal(E.estateFits(s, "garden-bench", 10, 0, NaN), false);
  assert.equal(E.estateFits(s, "garden-bench", Infinity, 0, 0), false);
  assert.equal(E.estateFits(s, "missing", 10, 0), false);
});

test("oriented rectangles prevent collisions while allowing touching and diagonal gaps", () => {
  const s = empty(); s.estate.ownedDecor["garden-bench"] = 3;
  const first = E.placeEstateDecor(s, "garden-bench", -11, 0, 45); assert.ok(first);
  assert.equal(E.estateFits(s, "garden-bench", -11, 0, 135), false);
  // Parallel benches offset along the short normal: bounding boxes overlap,
  // but the actual rotated footprints are separated.
  assert.equal(E.estateFits(s, "garden-bench", -11 + 1 / Math.sqrt(2), 1 / Math.sqrt(2), 45), false);
  assert.equal(E.estateFits(s, "garden-bench", -11 + 1.25 / Math.sqrt(2), 1.25 / Math.sqrt(2), 45), true);
  const touching = empty(); touching.estate.ownedDecor["lantern-post"] = 2;
  assert.ok(E.placeEstateDecor(touching, "lantern-post", 10, 0));
  assert.ok(E.placeEstateDecor(touching, "lantern-post", 10.8, 0));
});

test("placement capacity is distinct from the owned inventory", () => {
  const s = empty(); s.estate.ownedDecor["lantern-post"] = 20;
  for (const x of [-11, -10, -9, 9, 10, 11]) for (const z of [-9, 9]) assert.ok(E.placeEstateDecor(s, "lantern-post", x, z));
  assert.equal(s.estate.placed.length, 12); assert.equal(E.placeEstateDecor(s, "lantern-post", 10, 0), false);
  assert.equal(s.estate.ownedDecor["lantern-post"], 8);
  s.house.level = 1; assert.equal(E.expandEstate(s), true);
  assert.ok(E.placeEstateDecor(s, "lantern-post", 10, 0)); assert.equal(copies(s, "lantern-post"), 20);
});

test("finish purchase and selection are separate, one-time, gated transactions", () => {
  const s = state(), before = s.coins;
  assert.equal(E.equipEstateFinish(s, "moon-stone"), false);
  assert.equal(E.buyEstateFinish(s, "moon-stone"), true); assert.equal(s.coins, before - 280);
  assert.equal(s.estate.finishes.walls, "warm-timber"); assert.equal(E.equipEstateFinish(s, "moon-stone"), true);
  assert.equal(s.estate.finishes.walls, "moon-stone"); assert.equal(E.buyEstateFinish(s, "moon-stone"), false);
  assert.equal(E.buyEstateFinish(s, "pumpkin-plaster"), false); s.house.level = 2;
  assert.equal(E.buyEstateFinish(s, "pumpkin-plaster"), true); assert.equal(E.equipEstateFinish(s, "pumpkin-plaster"), true);
  assert.equal(s.estate.finishes.roof, "midnight-slate"); assert.equal(s.house.level, 2);
  assert.deepEqual(E.restoreEstate(s.estate), s.estate);
});

test("tea break and invalid money prevent every modifying garden action", () => {
  const s = state(3); E.buyEstateDecor(s, "garden-bench"); E.buyEstateFinish(s, "moon-stone"); s.paused = true;
  const before = structuredClone(s);
  assert.equal(E.expandEstate(s), false); assert.equal(E.buyEstateDecor(s, "lantern-post"), false);
  assert.equal(E.placeEstateDecor(s, "garden-bench", 10, -2), false); assert.equal(E.moveEstateDecor(s, "garden-0", -4, 9, 45), false);
  assert.equal(E.storeEstateDecor(s, "garden-0"), false); assert.equal(E.buyEstateFinish(s, "witch-plum"), false); assert.equal(E.equipEstateFinish(s, "moon-stone"), false);
  assert.deepEqual(s, before);
  for (const bad of [NaN, Infinity, -10, "10000"]) { s.paused = false; s.coins = bad; assert.equal(E.buyEstateDecor(s, "lantern-post"), false); assert.equal(E.expandEstate(s), false); }
  for (const bad of ["missing", "__proto__", "constructor", "toString"]) { assert.equal(E.buyEstateDecor(s, bad), false); assert.equal(E.buyEstateFinish(s, bad), false); assert.equal(E.equipEstateFinish(s, bad), false); }
});

test("restore sanitises inventories and finishes, repairs IDs and returns blocked pieces to storage", () => {
  const raw = { expansion: 99, invested: -50, nextInstance: 0, ownedDecor: { "garden-bench": 1, "lantern-post": -2, "rose-bed": Infinity, "missing": 8 }, ownedFinishes: ["moon-stone", "moon-stone", "bogus", "__proto__"], finishes: { walls: "moon-stone", roof: "moon-stone", trim: "moon-silver" }, placed: [
    { instance: "garden-1", id: "garden-bench", x: 10, z: 0, rotation: 390 },
    { instance: "garden-1", id: "garden-bench", x: -10, z: 0, rotation: -30 },
    { instance: "garden-bad", id: "stone-urn", x: 0, z: 0, rotation: 0 },
    { instance: "garden-3", id: "stone-urn", x: Infinity, z: 8, rotation: 0 },
    { instance: "garden-4", id: "stone-urn", x: 5, z: 10, rotation: NaN },
    { instance: "garden-4", id: "missing", x: 5, z: 10, rotation: 0 },
  ] };
  const e = E.restoreEstate(raw); assert.equal(e.expansion, 3); assert.equal(e.invested, 0);
  assert.equal(e.finishes.walls, "moon-stone"); assert.equal(e.finishes.roof, "midnight-slate"); assert.equal(e.finishes.trim, "old-brass");
  assert.deepEqual(e.ownedFinishes, [...Object.values(E.ESTATE_DEFAULT_FINISHES), "moon-stone"]);
  assert.equal(e.placed.length, 2); assert.notEqual(e.placed[0].instance, e.placed[1].instance); assert.equal(e.placed[0].rotation, 30); assert.equal(e.placed[1].rotation, 330);
  assert.equal(e.ownedDecor["garden-bench"], 1); assert.equal(e.ownedDecor["stone-urn"], 3); assert.equal(e.ownedDecor["lantern-post"], 0); assert.equal(e.ownedDecor["rose-bed"], 0); assert.equal(e.ownedDecor.missing, undefined);
  const s = { estate: e, house: { level: 3 }, coins: 500 }; assert.ok(E.placeEstateDecor(s, "stone-urn", 10, 8));
  assert.equal(new Set(e.placed.map(p => p.instance)).size, e.placed.length);
  assert.deepEqual(E.restoreEstate(e), e);
});

test("valid saves preserve expansions and purchases independent of a later house-level repair", () => {
  const s = state(3); E.expandEstate(s); E.expandEstate(s); E.expandEstate(s); E.buyEstateDecor(s, "moon-fountain"); E.buyEstateFinish(s, "moon-silver"); E.equipEstateFinish(s, "moon-silver");
  const p = E.placeEstateDecor(s, "moon-fountain", 17, -11, 37); assert.ok(p);
  const saved = structuredClone(s.estate), repaired = { estate: E.restoreEstate(saved), house: { level: 0 } };
  assert.deepEqual(repaired.estate, saved); assert.equal(E.estateBounds(repaired).width, 44);
});

test("JSON-shaped junk IDs and collections cannot throw or invent ownership", () => {
  const badId = { toString: null }, raw = { expansion: "3", ownedDecor: [], ownedFinishes: [badId, "constructor"], finishes: { walls: badId }, placed: [null, true, "garden", { id: badId }, { id: "__proto__" }, { id: "constructor" }] };
  assert.doesNotThrow(() => E.restoreEstate(raw));
  const e = E.restoreEstate(raw); assert.equal(e.expansion, 0); assert.deepEqual(e.placed, []); assert.deepEqual(e.ownedFinishes, Object.values(E.ESTATE_DEFAULT_FINISHES));
  const s = state(); assert.equal(E.buyEstateDecor(s, badId), false); assert.equal(E.placeEstateDecor(s, badId, 10, 0), false); assert.equal(E.estateFits(s, badId, 10, 0), false); assert.equal(E.buyEstateFinish(s, badId), false); assert.equal(E.equipEstateFinish(s, badId), false);
});
