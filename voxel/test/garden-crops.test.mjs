import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

// A garden with one bed of each kind, placed clear of the house and path.
function garden() {
  const s = M.freshState(); s.coins = 10000; s.house.level = 1; s.estate.expansion = 3;
  const spots = { "berry-patch": [-14, -8], "herb-planter": [14, -8], "vegetable-bed": [-14, 10], "apple-tree": [14, 10] };
  for (const [id, [x, z]] of Object.entries(spots)) { assert.ok(M.buyEstateDecor(s, id), id); assert.ok(M.placeEstateDecor(s, id, x, z), id); }
  const bed = (id) => s.estate.placed.find((p) => p.id === id).instance;
  return { s, bed };
}

test("a bed grows from planting to ripe, and watering once hurries it", () => {
  const { s, bed } = garden(), berries = bed("berry-patch"), crop = M.gardenCropOf("berry-patch");
  assert.equal(M.gardenBedAction(s, berries).kind, "plant");
  assert.equal(M.waterGardenBed(s, berries), false, "nothing to water yet");
  assert.ok(M.plantGardenBed(s, berries)); assert.equal(M.plantGardenBed(s, berries), false, "only once");
  assert.equal(M.gardenBedStage(s.estate.placed.find((p) => p.instance === berries)), "sprout");
  M.update(s, crop.seconds / 2);
  assert.equal(M.gardenBedAction(s, berries).kind, "water");
  assert.ok(M.waterGardenBed(s, berries)); assert.equal(M.waterGardenBed(s, berries), false, "watered once a crop");
  const left = s.estate.placed.find((p) => p.instance === berries).crop.remaining;
  assert.ok(Math.abs(left - crop.seconds / 2 * M.GARDEN_WATERING) < 1e-6);
  M.update(s, left - .5); assert.equal(M.gardenBedAction(s, berries).kind, "wait");
  M.update(s, 1); assert.equal(M.gardenBedAction(s, berries).kind, "harvest");
  assert.equal(M.gardenBedStage(s.estate.placed.find((p) => p.instance === berries)), "ready");
});

test("a picked crop fills the pantry while there is room, and the rest sells", () => {
  const { s, bed } = garden(), apples = bed("apple-tree"), herbs = bed("herb-planter");
  M.plantGardenBed(s, apples); M.update(s, M.gardenCropOf("apple-tree").seconds);
  const coins = s.coins, earned = s.earned, sold = M.pickGardenBed(s, apples);
  assert.equal(sold.pantry, 0, "no kitchen yet, so it all sells");
  assert.equal(s.coins - coins, 4 * M.INGREDIENT_BY_ID.apples.price); assert.equal(s.earned - earned, s.coins - coins);
  assert.equal(M.gardenBedAction(s, apples).kind, "plant", "ready to plant again");
  s.kitchen.purchased = true; s.kitchen.pantry.flour = M.pantryCapacity(s) - 1;
  M.plantGardenBed(s, herbs); M.update(s, M.gardenCropOf("herb-planter").seconds);
  const picked = M.pickGardenBed(s, herbs);
  assert.deepEqual([picked.pantry, picked.sold], [1, 2], "one fits in the pantry");
  assert.equal(s.kitchen.pantry.herbs, 1);
  assert.equal(M.pickGardenBed(s, herbs), false, "nothing left to pick");
});

test("crops pause with the game, keep through a save, and leave with their bed", () => {
  const { s, bed } = garden(), veg = bed("vegetable-bed"), berries = bed("berry-patch");
  M.plantGardenBed(s, veg); M.plantGardenBed(s, berries); M.update(s, M.gardenCropOf("berry-patch").seconds);
  s.paused = true; assert.equal(M.pickGardenBed(s, berries), false); s.paused = false;
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(M.gardenBedAction(loaded, berries).kind, "harvest");
  assert.equal(loaded.estate.placed.find((p) => p.instance === veg).crop.remaining, s.estate.placed.find((p) => p.instance === veg).crop.remaining);
  assert.ok(M.storeEstateDecor(loaded, veg)); assert.ok(M.placeEstateDecor(loaded, "vegetable-bed", -14, 10));
  assert.equal(M.gardenBedAction(loaded, loaded.estate.placed.at(-1).instance).kind, "plant", "a stored bed comes back empty");
  const raw = JSON.parse(JSON.stringify(M.saveData(s))); raw.estate.placed.find((p) => p.instance === berries).crop = { phase: "growing", remaining: "soon" };
  assert.equal(M.gardenBedAction(M.restoreState(raw), berries).kind, "plant", "a broken crop starts afresh");
});

test("berries cook into two new recipes", () => {
  assert.ok(M.INGREDIENT_BY_ID.berries);
  for (const id of ["bramble-crumble", "bramble-apple-pie"]) assert.ok(M.RECIPE_BY_ID[id].ingredients.berries > 0, id);
});
