import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/rules/cooking.js";
import { COOKING, RECIPES, RECIPE_BY_ID } from "../src/content/cooking.js";

const state = (earned = 110000) => ({ time: 0, coins: 50000, earned, progression: { bonusEarned: 0 }, paused: false, stock: [10, 4, 0, 0], fresh: [[], [], [], []], holds: [], house: { level: 0, placed: [] }, kitchen: C.freshKitchen() });
const purchased = () => { const s = state(); assert.equal(C.buyFoodTruck(s), true); return s; };
const tick = (s, dt) => { const events = []; s.time += s.paused ? 0 : dt; C.updateKitchen(s, dt, events); return events; };

test("level five unlocks permission to buy; levelling does not give a free truck", () => {
  const s = state(2199), before = s.coins;
  assert.equal(C.kitchenUnlocked(s), false); assert.equal(C.buyFoodTruck(s), false);
  s.earned = 2200; assert.equal(C.kitchenUnlocked(s), true); tick(s, 600);
  assert.equal(s.kitchen.purchased, false); assert.equal(s.coins, before);
  assert.equal(C.buyFoodTruck(s), true); assert.equal(s.coins, before - COOKING.price);
  assert.deepEqual(s.kitchen.recipes, ["wedges"]); assert.equal(C.buyFoodTruck(s), false);
});

test("an ingredient order quotes its real fee, charges once, and rejects malformed or unaffordable requests", () => {
  const s = purchased(), before = s.coins;
  const q = C.quoteIngredientOrder(s, { butter: 2, flour: 3 });
  assert.deepEqual([q.subtotal, q.fee, q.total, q.seconds], [12, 6, 18, 60]);
  assert.equal(s.coins, before, "quoting has no side effects");
  const order = C.placeIngredientOrder(s, { butter: 2, flour: 3 });
  assert.equal(order.id, 1); assert.equal(s.coins, before - 18);
  assert.equal(s.kitchen.ledger.ingredientSpend, 12); assert.equal(s.kitchen.ledger.deliveryFees, 6);
  for (const items of [{}, { milk: -1 }, { milk: 1.2 }, { milk: Infinity }, { milk: 40, flour: 1 }, { constructor: 1 }, { unknown: 1 }, []]) assert.equal(C.quoteIngredientOrder(s, items).ok, false);
  s.coins = 0; assert.equal(C.placeIngredientOrder(s, { milk: 1 }), false);
});

test("delivery uses game time, pauses, crosses all three phases and credits a parcel exactly once", () => {
  const s = purchased(); C.placeIngredientOrder(s, { butter: 2 });
  s.paused = true; tick(s, 1000); assert.equal(s.kitchen.orders[0].remaining, 42); assert.equal(s.kitchen.pantry.butter, 0);
  s.paused = false; tick(s, 42); assert.equal(s.kitchen.orders[0].phase, "travelling");
  tick(s, 12); assert.equal(s.kitchen.orders[0].phase, "unloading");
  const events = tick(s, 6); assert.equal(s.kitchen.orders.length, 0); assert.equal(s.kitchen.pantry.butter, 2);
  assert.equal(events.filter(e => e.type === "ingredient-delivery").length, 1);
  tick(s, 500); assert.equal(s.kitchen.pantry.butter, 2);
});

test("the second paid order waits its turn and a full receiving bay never discards ingredients", () => {
  const s = purchased(); s.kitchen.pantry.flour = 59;
  C.placeIngredientOrder(s, { butter: 2 }); C.placeIngredientOrder(s, { milk: 1 });
  assert.equal(C.placeIngredientOrder(s, { sugar: 1 }), false);
  tick(s, 120); assert.equal(s.kitchen.orders[0].phase, "unloading"); assert.equal(s.kitchen.orders[0].remaining, 0);
  assert.equal(s.kitchen.orders[1].remaining, 42); assert.equal(s.kitchen.pantry.butter, 0);
  s.kitchen.pantry.flour = 58; tick(s, 1); assert.equal(s.kitchen.pantry.butter, 2); assert.equal(s.kitchen.orders.length, 1);
  tick(s, 120); assert.equal(s.kitchen.pantry.milk, 0, "second parcel is held until space exists");
  s.kitchen.pantry.flour--; tick(s, 1); assert.equal(s.kitchen.pantry.milk, 1); assert.equal(s.kitchen.orders.length, 0);
});

test("only a not-yet-dispatched order can be cancelled, with the delivery fee retained", () => {
  const s = purchased(), before = s.coins; const o = C.placeIngredientOrder(s, { milk: 2 });
  assert.deepEqual(C.cancelIngredientOrder(s, o.id), { refund: 6, fee: 6 }); assert.equal(s.coins, before - 6);
  assert.equal(s.kitchen.ledger.ingredientSpend, 0); assert.equal(s.kitchen.ledger.deliveryFees, 6);
  assert.equal(C.cancelIngredientOrder(s, o.id), false);
  const dispatched = C.placeIngredientOrder(s, { milk: 1 }); tick(s, 43);
  assert.equal(C.cancelIngredientOrder(s, dispatched.id), false);
});

test("cooking consumes pantry ingredients and only unreserved pumpkins atomically", () => {
  const s = purchased(); s.stock = [1, 0, 0, 0]; s.kitchen.pantry.butter = 1;
  s.holds = [{ owner: "customer-1", lines: [{ variety: 0, quantity: 1, fresh: false }] }];
  assert.equal(C.startCooking(s, "wedges"), false); assert.equal(s.kitchen.pantry.butter, 1); assert.equal(s.stock[0], 1);
  s.holds = []; assert.ok(C.startCooking(s, "wedges")); assert.equal(s.kitchen.pantry.butter, 0); assert.equal(s.stock[0], 0);
  assert.equal(C.startCooking(s, "wedges"), false, "busy cooker does not consume twice");
  tick(s, 29); assert.equal(s.kitchen.food.wedges, 0); tick(s, 1); assert.equal(s.kitchen.food.wedges, 2);
  assert.equal(s.kitchen.ledger.batchesCooked, 1); assert.equal(s.sold, undefined, "cooking does not pretend pumpkins were sold");
});

test("using a pumpkin keeps fresh batches consistent without taking another shopper's fresh hold", () => {
  const s = purchased(); s.time = 10; s.stock[0] = 3; s.fresh[0] = [[9, 2]]; s.kitchen.pantry.butter = 1;
  s.holds = [{ owner: "customer-2", lines: [{ variety: 0, quantity: 1, fresh: true }] }];
  assert.ok(C.startCooking(s, "wedges")); assert.equal(s.stock[0], 2); assert.deepEqual(s.fresh[0], [[9, 2]], "the old pumpkin was used first");
});

test("a held old pumpkin is not mistaken for the old ingredient when only fresh stock is free", () => {
  const s = purchased(); s.time = 10; s.stock[0] = 3; s.fresh[0] = [[9, 2]]; s.kitchen.pantry.butter = 1;
  s.holds = [{ owner: "old-hold", lines: [{ variety: 0, quantity: 1, fresh: false }] }, { owner: "fresh-hold", lines: [{ variety: 0, quantity: 1, fresh: true }] }];
  assert.ok(C.startCooking(s, "wedges")); assert.equal(s.stock[0], 2); assert.deepEqual(s.fresh[0], [[9, 1]]);
  assert.equal(s.holds.length, 2, "only the transient cooking hold was settled");
});

test("cancelling a started job does not return ingredients; a completed full-store batch waits safely", () => {
  const s = purchased(); s.kitchen.pantry.butter = 2; const before = s.stock[0];
  C.startCooking(s, "wedges"); assert.equal(C.cancelCooking(s), true); assert.equal(s.stock[0], before - 1); assert.equal(s.kitchen.pantry.butter, 1);
  C.startCooking(s, "wedges"); s.kitchen.food.wedges = C.foodCapacity(s);
  tick(s, 100); assert.equal(s.kitchen.jobs.truck.remaining, 0); assert.equal(s.kitchen.food.wedges, 30);
  s.kitchen.food.wedges -= 2; tick(s, 1); assert.equal(s.kitchen.jobs.truck, null); assert.equal(s.kitchen.food.wedges, 30);
  assert.equal(C.startCooking(s, "wedges"), false);
});

test("the truck avoids a level-five dead end; the second station needs a real range in an unlocked kitchen", () => {
  const s = purchased(); s.kitchen.pantry.butter = 3;
  assert.equal(C.homeCookingAvailable(s), false); assert.equal(C.startCooking(s, "wedges", "home"), false);
  s.house.level = 2; s.house.placed = [{ id: "copper-range", room: "parlour" }]; assert.equal(C.homeCookingAvailable(s), false);
  s.house.placed[0].room = "kitchen"; assert.equal(C.homeCookingAvailable(s), true);
  assert.ok(C.startCooking(s, "wedges", "truck")); assert.ok(C.startCooking(s, "wedges", "home"));
  tick(s, 30); assert.equal(s.kitchen.food.wedges, 4);
});

test("research, food shelf selection and price boundaries honour ownership and level gates", () => {
  const s = purchased(); s.earned = 2200;
  assert.equal(C.researchRecipe(s, "soup"), false); assert.equal(C.assignFoodDisplay(s, 0, "soup"), false);
  s.earned = 4500; const before = s.coins; assert.equal(C.researchRecipe(s, "soup"), true); assert.equal(s.coins, before - RECIPE_BY_ID.soup.research);
  assert.equal(C.researchRecipe(s, "soup"), false); assert.equal(C.assignFoodDisplay(s, 0, "soup"), true);
  assert.equal(C.assignFoodDisplay(s, 2, "soup"), false); assert.equal(C.setFoodPrice(s, "soup", 0), false);
  assert.equal(C.setFoodPrice(s, "soup", 27), false); assert.equal(C.setFoodPrice(s, "soup", 26), true);
  assert.equal(C.setFoodPrice(s, "soup", NaN), false); assert.equal(C.setFoodPrice(s, "constructor", 12), false);
});

test("capacity upgrades cost coins and stop at their final tier; speed affects only new batches", () => {
  const s = purchased(); s.kitchen.pantry.butter = 2; C.startCooking(s, "wedges");
  assert.equal(C.buyKitchenUpgrade(s, "speed"), true); assert.equal(s.kitchen.jobs.truck.duration, 30);
  s.kitchen = C.restoreKitchen(JSON.parse(JSON.stringify(s.kitchen)), s); assert.equal(s.kitchen.jobs.truck.duration, 30, "reload cannot accelerate a batch already underway");
  tick(s, 30); C.startCooking(s, "wedges"); assert.equal(s.kitchen.jobs.truck.duration, 25.5);
  assert.equal(C.pantryCapacity(s), 60);
  for (let i = 0; i < 3; i++) assert.equal(C.buyKitchenUpgrade(s, "pantry"), true);
  assert.equal(C.pantryCapacity(s), 240); assert.equal(C.buyKitchenUpgrade(s, "pantry"), false);
});

test("the hired chef uses real inputs, respects pause and storage, and never orders for free", () => {
  const s = purchased(); s.earned = 26000;
  assert.equal(C.buyKitchenUpgrade(s, "chef"), false); assert.equal(C.setChefRecipe(s, "wedges"), false);
  s.earned = 42000; assert.equal(C.buyKitchenUpgrade(s, "chef"), true); assert.equal(C.setChefRecipe(s, "wedges"), true);
  const before = s.coins; tick(s, 100); assert.equal(s.kitchen.jobs.truck, null); assert.equal(s.kitchen.orders.length, 0); assert.equal(s.coins, before);
  s.kitchen.pantry.butter = 2; tick(s, 1); assert.equal(s.kitchen.pantry.butter, 1); assert.equal(s.kitchen.jobs.truck.automatic, true);
  s.paused = true; tick(s, 100); assert.equal(s.kitchen.food.wedges, 0); s.paused = false;
  tick(s, 30); assert.equal(s.kitchen.food.wedges, 2); assert.equal(s.kitchen.pantry.butter, 0);
  tick(s, 30); assert.equal(s.kitchen.food.wedges, 4); assert.equal(s.kitchen.jobs.truck, null);
  assert.equal(C.setChefRecipe(s, null), true);
});

test("restore sanitises IDs, duplicate deliveries/jobs and transient food holds without crediting anything twice", () => {
  const s = purchased(), base = C.freshKitchen();
  const raw = { ...base, purchased: true, recipes: ["wedges", "constructor", "soup", "soup"], pantry: { butter: -4, flour: Infinity, sugar: 9, constructor: 1 }, food: { wedges: 4, soup: 2 }, upgrades: { pantry: 999, speed: NaN }, displays: ["soup", "unknown"], prices: { soup: -5 }, delivered: [1, 1, -3, "3"], foodHolds: [{ owner: "old-customer", recipe: "wedges", quantity: 4 }], orders: [{ id: 1, phase: "unloading", remaining: 0, items: { milk: 4 } }, { id: 2, phase: "travelling", remaining: 999, items: { milk: 2 } }, { id: 2, phase: "ordered", remaining: 42, items: { milk: 2 } }], jobs: { truck: { id: 7, recipe: "wedges", remaining: 500 }, home: { id: 7, recipe: "wedges", remaining: 0 } } };
  s.kitchen = C.restoreKitchen(raw, s); const k = s.kitchen;
  assert.deepEqual(k.recipes, ["wedges", "soup"]); assert.equal(k.pantry.butter, 0); assert.equal(k.pantry.flour, 0); assert.equal(k.pantry.sugar, 9);
  assert.deepEqual(k.displays, ["soup", null]); assert.deepEqual(k.foodHolds, []); assert.equal(k.orders.length, 1); assert.equal(k.orders[0].remaining, 12);
  assert.equal(k.jobs.truck.remaining, 30); assert.equal(k.jobs.home, null); assert.equal(k.nextJob, 8); assert.equal(k.nextOrder, 3);
  tick(s, 18); assert.equal(k.pantry.milk, 2); assert.equal(k.orders.length, 0); assert.deepEqual(k.delivered, [1, 2]);
  const again = C.restoreKitchen({ ...k, orders: [{ id: 2, phase: "unloading", remaining: 0, items: { milk: 2 } }] }, s);
  s.kitchen = again; tick(s, 100); assert.equal(again.pantry.milk, 2, "saved delivered ID cannot be delivered again");
});

test("in-flight deliveries and paid jobs survive reload; new/default saves get no invented stock", () => {
  const s = purchased(); C.placeIngredientOrder(s, { butter: 2 }); tick(s, 48);
  const before = s.coins; s.kitchen = C.restoreKitchen(JSON.parse(JSON.stringify(s.kitchen)), s);
  assert.equal(s.kitchen.orders[0].phase, "travelling"); assert.equal(s.kitchen.orders[0].remaining, 6); tick(s, 12);
  assert.equal(s.kitchen.pantry.butter, 2); C.startCooking(s, "wedges"); tick(s, 12);
  s.kitchen = C.restoreKitchen(JSON.parse(JSON.stringify(s.kitchen)), s); assert.equal(s.kitchen.jobs.truck.remaining, 18);
  tick(s, 18); assert.equal(s.kitchen.food.wedges, 2); assert.equal(s.coins, before);
  assert.deepEqual(C.restoreKitchen(undefined, s), C.freshKitchen());
  assert.equal(C.restoreKitchen({ purchased: false, pantry: { butter: 99 } }, s).pantry.butter, 0);
});

test("all eight recipes use positive finite costs/times/yields and remain within the published level range", () => {
  assert.equal(RECIPES.length, 8);
  assert.deepEqual(RECIPES.map(r => r.level), [5, 6, 7, 8, 9, 10, 11, 12]);
  for (const r of RECIPES) { assert.ok(r.price > 0 && r.yield > 0 && r.seconds > 0); assert.ok(Object.keys(r.ingredients).length > 0); }
});

test("corrupt restored inventories cannot exceed total capacity and invalid station names cannot mutate jobs", () => {
  const s = purchased();
  s.kitchen = C.restoreKitchen({ ...s.kitchen, pantry: { flour: 1000000, butter: 1000000 }, food: { wedges: 1000000 }, jobs: { truck: null, home: null } }, s);
  assert.equal(C.pantryCount(s), C.pantryCapacity(s)); assert.equal(C.foodCount(s), C.foodCapacity(s));
  assert.equal(C.cancelCooking(s, "constructor"), false); assert.equal(C.cancelCooking(s, "__proto__"), false);
  const before = JSON.stringify(s.kitchen); C.updateKitchen(s, NaN); C.updateKitchen(s, Infinity); C.updateKitchen(s, -5); assert.equal(JSON.stringify(s.kitchen), before);
});

test("model migration persists paid cooking progress and clears only transient customer food holds", async () => {
  const M = await import("../src/model.js"), s = M.freshState();
  assert.equal(s.version, M.STATE_VERSION); assert.deepEqual(s.kitchen, C.freshKitchen());
  s.earned = 2200; s.coins = 2000; assert.equal(M.buyFoodTruck(s), true);
  M.placeIngredientOrder(s, { butter: 2 }); M.update(s, 48);
  s.kitchen.food.wedges = 2; s.kitchen.foodHolds.push({ owner: "customer-9", recipe: "wedges", quantity: 1, price: 11 });
  const saved = M.saveData(s); assert.deepEqual(saved.kitchen.foodHolds, []); assert.equal(s.kitchen.foodHolds.length, 1, "saving does not change the live reservation");
  const restored = M.restoreState(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.kitchen.orders[0].phase, "travelling"); assert.equal(restored.kitchen.orders[0].remaining, 6);
  assert.equal(restored.kitchen.food.wedges, 2); assert.deepEqual(restored.kitchen.foodHolds, []);
  M.update(restored, 12); assert.equal(restored.kitchen.pantry.butter, 2); assert.equal(restored.kitchen.orders.length, 0);
  assert.deepEqual(M.restoreState({ ...saved, version: 11, kitchen: undefined }).kitchen, C.freshKitchen(), "an old save gets an empty locked kitchen");
});
