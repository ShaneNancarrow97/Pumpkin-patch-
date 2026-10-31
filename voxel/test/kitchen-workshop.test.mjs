// Late-game economy fixtures represent a household completed before home milestones.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import * as C from "../src/rules/cooking.js";
import * as E from "../src/rules/kitchen-equipment.js";
import * as X from "../src/rules/cooking-mix.js";
import { RECIPE_BY_ID, INGREDIENTS } from "../src/content/cooking.js";

const state = () => {
  const s = M.freshState(); s.progression.homeLegacyThrough = 12; s.coins = 50000; s.earned = 110000; s.house.level = 2;
  s.stock = [100, 10, 0, 0]; s.fresh = [[], [], [], []]; s.holds = [];
  assert.equal(C.buyFoodTruck(s), true); return s;
};
const feed = (s, n = 30) => { for (const i of INGREDIENTS) s.kitchen.pantry[i.id] = n; };
const range = s => { s.house.owned.push("copper-range"); assert.ok(M.placeDecor(s, "copper-range", "kitchen")); };
const garden = (batches = 1) => ({ ingredients: { vegetables: 2, butter: 1, herbs: 1 }, pumpkins: {}, method: "pan", station: "home", batches });

test("a kitchen needs placed equipment, not items owned in storage or another room", () => {
  const s = state(); feed(s); C.researchRecipe(s, "garden-skillet");
  s.house.owned.push("kitchen-hob"); assert.equal(E.homeCookingAvailable(s), false);
  assert.equal(C.cookingReadiness(s, "garden-skillet", "home").ok, false);
  const before = s.coins; const hob = E.buyCookingEquipment(s, "kitchen-hob");
  assert.equal(hob.placed, true); assert.equal(s.coins, before, "stored ownership is not charged again");
  assert.equal(E.homeCookingAvailable(s), true);
  assert.deepEqual(E.equipmentRequirements(s, "garden-skillet").missing, ["pan"]);
  const pan = E.buyCookingEquipment(s, "kitchen-pan-rail");
  assert.equal(pan.placed, true); assert.equal(s.coins, before - 160);
  assert.equal(C.cookingReadiness(s, "garden-skillet", "home").ok, true);
  s.house.placed.find(p => p.id === "kitchen-pan-rail").room = "parlour";
  assert.equal(C.cookingReadiness(s, "garden-skillet", "home").ok, false);
  assert.equal(E.buyCookingEquipment(s, "kitchen-pan-rail").placed, true);
  assert.equal(s.coins, before - 160, "moving owned equipment never buys a second copy");
});

test("premium cooking furniture supplies actual tools but spices are both equipment and an ingredient", () => {
  const s = state(); range(s); feed(s); C.researchRecipe(s, "spiced-roast");
  assert.deepEqual(E.equipmentRequirements(s, "spiced-roast").missing, ["spice"]);
  assert.equal(E.buyCookingEquipment(s, "kitchen-spice-shelf").placed, true);
  s.kitchen.pantry.spices = 0; assert.equal(C.cookingReadiness(s, "spiced-roast", "home").ok, false);
  s.kitchen.pantry.spices = 2; assert.ok(C.startCooking(s, "spiced-roast", "home", false, 2));
  assert.equal(s.kitchen.pantry.spices, 0); assert.equal(s.kitchen.pantry.meat, 26); assert.equal(s.kitchen.pantry.vegetables, 26);
});

test("new truck baking requires a purchased kit and home recipes cannot be automated in the truck", () => {
  const s = state(); feed(s); C.researchRecipe(s, "ghost-cookies"); C.researchRecipe(s, "garden-skillet");
  assert.equal(C.startCooking(s, "ghost-cookies"), false);
  const before = s.coins; assert.equal(C.buyKitchenUpgrade(s, "truck-oven"), true); assert.equal(s.coins, before - 700);
  assert.ok(C.startCooking(s, "ghost-cookies")); assert.equal(C.startCooking(s, "garden-skillet", "truck"), false);
  C.buyKitchenUpgrade(s, "chef"); assert.equal(C.setChefRecipe(s, "garden-skillet"), false);
});

test("five batches consume five batches of inputs upfront and release portions serially", () => {
  const s = state(); s.kitchen.pantry.butter = 5; const coins = s.coins;
  assert.equal(C.maxCookingBatches(s, "wedges"), 5);
  const job = C.startCooking(s, "wedges", "truck", false, 5);
  assert.equal(job.batches, 5); assert.equal(s.stock[0], 95); assert.equal(s.kitchen.pantry.butter, 0);
  assert.equal(C.pendingCookingOutput(s), 10); C.updateKitchen(s, 29); assert.equal(s.kitchen.food.wedges, 0);
  C.updateKitchen(s, 1); assert.equal(s.kitchen.food.wedges, 2); assert.equal(job.completed, 1); assert.equal(job.remaining, 30);
  C.updateKitchen(s, 120); assert.equal(s.kitchen.food.wedges, 10); assert.equal(s.kitchen.jobs.truck, null);
  assert.equal(s.kitchen.ledger.batchesCooked, 5); assert.equal(s.coins, coins);
});

test("both stations reserve every unfinished portion, preventing storage oversubscription", () => {
  const s = state(); range(s); feed(s); C.researchRecipe(s, "garden-skillet");
  assert.ok(C.startCooking(s, "wedges", "truck", false, 10)); assert.equal(C.pendingCookingOutput(s), 20);
  const before = JSON.stringify(s.kitchen.pantry);
  assert.equal(C.startCooking(s, "garden-skillet", "home", false, 5), false);
  assert.equal(JSON.stringify(s.kitchen.pantry), before);
  assert.equal(C.maxCookingBatches(s, "garden-skillet", "home"), 3);
  assert.ok(C.startCooking(s, "garden-skillet", "home", false, 3)); assert.equal(C.pendingCookingOutput(s), 29);
  C.updateKitchen(s, 400); assert.equal(C.foodCount(s), 29);
});

test("invalid, unaffordable and oversize production requests cannot partly consume supplies", () => {
  const s = state(); s.kitchen.pantry.butter = 2;
  for (const n of [0, -1, 11, 2.5, NaN, Infinity, "5", true]) {
    const before = JSON.stringify(s); assert.equal(C.startCooking(s, "wedges", "truck", false, n), false); assert.equal(JSON.stringify(s), before);
  }
  const before = JSON.stringify(s); assert.equal(C.startCooking(s, "wedges", "truck", false, 3), false); assert.equal(JSON.stringify(s), before);
});

test("cancelling an unfinished run discards prepaid inputs and releases only future output reservations", () => {
  const s = state(); feed(s); C.startCooking(s, "wedges", "truck", false, 5); C.updateKitchen(s, 30);
  assert.equal(C.pendingCookingOutput(s), 8); assert.equal(C.cancelCooking(s), true);
  assert.equal(s.kitchen.pantry.butter, 25); assert.equal(s.stock[0], 95); assert.equal(s.kitchen.food.wedges, 2);
  assert.equal(C.pendingCookingOutput(s), 0); C.updateKitchen(s, 10000); assert.equal(s.kitchen.food.wedges, 2);
});

test("production is game-time based and a long tick releases only paid batches", () => {
  const s = state(); feed(s); C.startCooking(s, "wedges", "truck", false, 10);
  s.paused = true; const before = JSON.stringify(s.kitchen); C.updateKitchen(s, 1000); assert.equal(JSON.stringify(s.kitchen), before);
  s.paused = false; C.updateKitchen(s, 10000); assert.equal(s.kitchen.food.wedges, 20); assert.equal(s.kitchen.ledger.batchesCooked, 10);
  C.updateKitchen(s, 10000); assert.equal(s.kitchen.food.wedges, 20);
});

test("an exact new combination teaches a recipe on its first completed batch", () => {
  const s = state(); range(s); feed(s); const before = JSON.stringify(s);
  const preview = X.previewCookingMix(s, garden(3));
  assert.equal(preview.recipe, "garden-skillet"); assert.equal(preview.known, false); assert.equal(preview.ok, true);
  assert.equal(preview.portions, 9); assert.equal(preview.seconds, 120); assert.equal(JSON.stringify(s), before);
  const job = X.startCookingMix(s, garden(3)); assert.equal(job.discovery, true); assert.equal(s.kitchen.recipes.includes("garden-skillet"), false);
  const events = []; C.updateKitchen(s, 40, events);
  assert.equal(s.kitchen.food["garden-skillet"], 3); assert.equal(s.kitchen.recipes.includes("garden-skillet"), true);
  assert.equal(events.filter(e => e.type === "recipe-discovered").length, 1);
  C.updateKitchen(s, 80, events); assert.equal(s.kitchen.food["garden-skillet"], 9);
  assert.equal(events.filter(e => e.type === "recipe-discovered").length, 1);
});

test("unknown mixes, wrong methods and malformed or excess ingredient types do not consume anything", () => {
  const s = state(); range(s); feed(s);
  const bad = [null, { ...garden(), method: "raw" }, { ...garden(), method: "bake" }, { ...garden(), ingredients: { butter: 1 } }, { ...garden(), ingredients: { constructor: 1 } }, { ...garden(), pumpkins: { "9": 1 } }, { ...garden(), ingredients: { vegetables: 2.5, butter: 1, herbs: 1 } }, { ...garden(), ingredients: { vegetables: 2, butter: 1, herbs: 1, flour: 1, meat: 1, chicken: 1 } }];
  for (const selection of bad) {
    const before = JSON.stringify(s); assert.equal(X.previewCookingMix(s, selection).ok, false); assert.equal(X.startCookingMix(s, selection), false); assert.equal(JSON.stringify(s), before);
  }
});

test("mix discovery cannot bypass level, equipment, home-only or ingredient checks", () => {
  const s = state(); feed(s); assert.equal(X.startCookingMix(s, garden()), false);
  range(s); s.earned = 1000; assert.equal(X.startCookingMix(s, garden()), false);
  s.earned = 2200; assert.equal(X.startCookingMix(s, { ...garden(), station: "truck" }), false);
  s.kitchen.pantry.herbs = 0; assert.equal(X.startCookingMix(s, garden()), false);
});

test("unlearned discovery jobs survive reload without consuming inputs twice or replaying finished batches", () => {
  const s = state(); range(s); Object.assign(s.kitchen.pantry, { vegetables: 6, butter: 3, herbs: 3 }); X.startCookingMix(s, garden(3)); C.updateKitchen(s, 15);
  const raw = structuredClone(s.kitchen), vegetables = raw.pantry.vegetables;
  s.kitchen = C.restoreKitchen(raw, s, 13); assert.equal(s.kitchen.jobs.home.remaining, 25); assert.equal(s.kitchen.jobs.home.discovery, true);
  C.updateKitchen(s, 25); assert.equal(s.kitchen.food["garden-skillet"], 3); assert.equal(s.kitchen.pantry.vegetables, vegetables);
  const partial = structuredClone(s.kitchen); s.kitchen = C.restoreKitchen(partial, s, 13);
  assert.equal(s.kitchen.jobs.home.completed, 1); C.updateKitchen(s, 80); assert.equal(s.kitchen.food["garden-skillet"], 9);
  s.kitchen = C.restoreKitchen(structuredClone(s.kitchen), s, 13); C.updateKitchen(s, 1000); assert.equal(s.kitchen.food["garden-skillet"], 9);
});

test("legacy paid bakes retain a truck oven but newly researched recipes never grant free appliances", () => {
  const s = state(); const raw = structuredClone(s.kitchen); delete raw.revision;
  raw.recipes.push("ghost-cookies"); raw.jobs.truck = { id: 7, recipe: "ghost-cookies", duration: 60, remaining: 15 };
  s.kitchen = C.restoreKitchen(raw, s, 12); assert.equal(s.kitchen.upgrades["truck-oven"], 1); assert.equal(s.kitchen.jobs.truck.batches, 1);
  C.updateKitchen(s, 15); assert.equal(s.kitchen.food["ghost-cookies"], 4);
  const current = C.restoreKitchen(raw, s, 13); assert.equal(current.upgrades["truck-oven"], 0, "a malformed current-version save cannot claim the legacy allowance");
  const fresh = state(); feed(fresh); C.researchRecipe(fresh, "ghost-cookies");
  fresh.kitchen = C.restoreKitchen(structuredClone(fresh.kitchen), fresh, 13);
  assert.equal(fresh.kitchen.upgrades["truck-oven"], 0); assert.equal(C.startCooking(fresh, "ghost-cookies"), false);
});

test("storing a working appliance does not lose a paid job, but blocks another job", () => {
  const s = state(); range(s); feed(s); X.startCookingMix(s, garden()); s.house.placed = [];
  C.updateKitchen(s, 40); assert.equal(s.kitchen.food["garden-skillet"], 3);
  assert.equal(C.startCooking(s, "garden-skillet", "home"), false);
});

test("a full kitchen keeps a paid tool in storage and later placement does not charge again", () => {
  const s = state(), capacity = M.roomCapacity(s, "kitchen"); const before = s.coins;
  s.house.placed = Array.from({ length: capacity }, (_, i) => ({ instance: "full-" + i, id: "d01", room: "kitchen", x: i, z: 0 }));
  const bought = E.buyCookingEquipment(s, "kitchen-pot-rail"); assert.equal(bought.placed, false); assert.equal(s.coins, before - 180);
  assert.equal(s.house.owned.includes("kitchen-pot-rail"), true); assert.equal(E.kitchenEquipment(s).includes("pot"), false);
  s.house.placed = []; assert.equal(E.buyCookingEquipment(s, "kitchen-pot-rail").placed, true); assert.equal(s.coins, before - 180);
});

test("bulk pumpkin consumption preserves existing old and fresh shopper holds", () => {
  const s = state(); s.time = 10; s.stock[0] = 4; s.fresh[0] = [[9, 3]]; s.kitchen.pantry.butter = 2;
  s.holds = [{ owner: "old-customer", lines: [{ variety: 0, quantity: 1, fresh: false }] }, { owner: "fresh-customer", lines: [{ variety: 0, quantity: 1, fresh: true }] }];
  assert.ok(C.startCooking(s, "wedges", "truck", false, 2)); assert.equal(s.stock[0], 2); assert.deepEqual(s.fresh[0], [[9, 1]]);
  assert.equal(s.holds.length, 2);
});

test("a ready discovery waits safely for food storage and reveals its recipe only when a batch fits", () => {
  const s = state(); range(s); feed(s); X.startCookingMix(s, garden(2)); s.kitchen.food.wedges = 30;
  C.updateKitchen(s, 500); assert.equal(s.kitchen.jobs.home.remaining, 0); assert.equal(s.kitchen.recipes.includes("garden-skillet"), false);
  s.kitchen.food.wedges -= 3; C.updateKitchen(s, 1); assert.equal(s.kitchen.food["garden-skillet"], 3); assert.equal(s.kitchen.recipes.includes("garden-skillet"), true);
  assert.equal(s.kitchen.jobs.home.completed, 1); assert.equal(s.kitchen.jobs.home.remaining, 39);
});

test("restored bulk jobs reject invalid sizes and completed counters rather than manufacturing a backlog", () => {
  const s = state(); const base = structuredClone(s.kitchen);
  for (const [batches, completed] of [[11, 0], [2.5, 0], [2, -1], [2, 2], [2, 1.5]]) {
    const raw = { ...base, jobs: { truck: { id: 1, recipe: "wedges", duration: 30, remaining: 0, batches, completed }, home: null } };
    const loaded = C.restoreKitchen(raw, s, 13); assert.equal(loaded.jobs.truck, null);
  }
});
