// Rules own money, inventories and timers. The truck/cart scene only reads them.
import { COOKING, INGREDIENTS, INGREDIENT_BY_ID, RECIPES, RECIPE_BY_ID, KITCHEN_UPGRADES } from "../content/cooking.js";
import { patchLevel } from "./levels.js";
import { available, availableFresh, commitHold } from "./stock.js";

const UPGRADE_BY_ID = Object.assign(Object.create(null), Object.fromEntries(KITCHEN_UPGRADES.map(u => [u.id, u])));
const units = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(1000000, n) : 0;
const amount = n => Number.isFinite(n) && n >= 0 ? Math.min(1e12, n) : 0;
const serial = n => Number.isSafeInteger(n) && n >= 1 && n <= 1e9 ? n : 1;
const zeroPantry = () => Object.fromEntries(INGREDIENTS.map(i => [i.id, 0]));
const zeroFood = () => Object.fromEntries(RECIPES.map(r => [r.id, 0]));
const sum = o => Object.values(o).reduce((n, v) => n + v, 0);
export function freshKitchen() {
  return { purchased: false, pantry: zeroPantry(), food: zeroFood(), recipes: [], prices: Object.fromEntries(RECIPES.map(r => [r.id, r.price])), displays: [null, null], orders: [], jobs: { truck: null, home: null }, upgrades: { pantry: 0, storage: 0, speed: 0, chef: 0 }, chefRecipe: null, ledger: { ingredientSpend: 0, researchSpend: 0, foodIncome: 0, foodSold: 0, invested: 0, deliveryFees: 0, batchesCooked: 0, receipts: [] }, nextOrder: 1, nextJob: 1, delivered: [], foodHolds: [] };
}
export const kitchenUnlocked = s => patchLevel(s).level >= COOKING.level;
export const pantryCapacity = s => COOKING.pantryBase * (1 + (s.kitchen?.upgrades.pantry ?? 0));
export const foodCapacity = s => COOKING.foodBase * (1 + (s.kitchen?.upgrades.storage ?? 0));
export const pantryCount = s => sum(s.kitchen?.pantry ?? {});
export const foodCount = s => sum(s.kitchen?.food ?? {});
export const homeCookingAvailable = s => !!s.kitchen?.purchased && s.house?.level >= 2 && s.house.placed.some(p => p.id === "copper-range" && p.room === "kitchen");
export const kitchenUpgradeCost = (s, id) => UPGRADE_BY_ID[id]?.costs[s.kitchen?.upgrades[id] ?? 0] ?? null;
export const foodPriceRange = (s, id) => RECIPE_BY_ID[id] ? { min: Math.ceil(RECIPE_BY_ID[id].price / 2), max: RECIPE_BY_ID[id].price * 2 } : null;

export function buyFoodTruck(s) {
  if (s.paused || !kitchenUnlocked(s) || !s.kitchen || s.kitchen.purchased || s.coins < COOKING.price) return false;
  s.coins -= COOKING.price; s.kitchen.purchased = true; s.kitchen.recipes = ["wedges"]; s.kitchen.ledger.invested += COOKING.price;
  return true;
}
export function quoteIngredientOrder(s, requested) {
  const no = reason => ({ ok: false, reason, items: {}, subtotal: 0, fee: COOKING.deliveryFee, total: 0, seconds: COOKING.deliverySeconds });
  if (!s.kitchen?.purchased) return no("Purchase the food truck first.");
  if (s.paused) return no("Resume the game to order ingredients.");
  if (s.kitchen.orders.length >= COOKING.maxOrders) return no("Two deliveries are already on the way.");
  if (!requested || typeof requested !== "object" || Array.isArray(requested)) return no("Choose some ingredients.");
  const items = {};
  for (const [id, n] of Object.entries(requested)) {
    if (!INGREDIENT_BY_ID[id] || !Number.isSafeInteger(n) || n < 0 || n > COOKING.orderLimit) return no("Invalid ingredient quantity.");
    if (n) items[id] = n;
  }
  const count = sum(items);
  if (!count) return no("Choose some ingredients.");
  if (count > COOKING.orderLimit) return no(`A cart carries at most ${COOKING.orderLimit} ingredients.`);
  const subtotal = Object.entries(items).reduce((n, [id, qty]) => n + INGREDIENT_BY_ID[id].price * qty, 0), total = subtotal + COOKING.deliveryFee;
  return { ok: s.coins >= total, reason: s.coins >= total ? "" : "Not enough coins for this delivery.", items, subtotal, fee: COOKING.deliveryFee, total, seconds: COOKING.deliverySeconds };
}
export function placeIngredientOrder(s, items) {
  const q = quoteIngredientOrder(s, items); if (!q.ok || s.kitchen.nextOrder >= 1e9) return false;
  const order = { id: s.kitchen.nextOrder++, phase: "ordered", remaining: 42, items: { ...q.items }, subtotal: q.subtotal, fee: q.fee, total: q.total };
  s.coins -= q.total; s.kitchen.ledger.ingredientSpend += q.subtotal; s.kitchen.ledger.deliveryFees += q.fee; s.kitchen.orders.push(order);
  return order;
}
export function cancelIngredientOrder(s, id) {
  const k = s.kitchen, i = k?.orders.findIndex(o => o.id === id);
  if (s.paused || i == null || i < 0 || k.orders[i].phase !== "ordered") return false;
  const [o] = k.orders.splice(i, 1); s.coins += o.subtotal; k.ledger.ingredientSpend = Math.max(0, k.ledger.ingredientSpend - o.subtotal);
  return { refund: o.subtotal, fee: o.fee };
}
export function researchRecipe(s, id) {
  const k = s.kitchen, r = RECIPE_BY_ID[id];
  if (s.paused || !k?.purchased || !r || k.recipes.includes(id) || patchLevel(s).level < r.level || s.coins < r.research) return false;
  s.coins -= r.research; k.ledger.researchSpend += r.research; k.recipes.push(id); return true;
}
export function cookingReadiness(s, id, station = "truck") {
  const k = s.kitchen, r = RECIPE_BY_ID[id], no = reason => ({ ok: false, reason });
  if (s.paused) return no("Resume the game to cook.");
  if (!k?.purchased) return no("Purchase the food truck first.");
  if (!r || !k.recipes.includes(id)) return no("Research this recipe first.");
  if (!["truck", "home"].includes(station)) return no("Choose a cooking station.");
  if (station === "home" && !homeCookingAvailable(s)) return no("Place a copper range in your unlocked kitchen first.");
  if (k.jobs[station]) return no("This cooker is busy.");
  const pending = Object.values(k.jobs).reduce((n, j) => n + (RECIPE_BY_ID[j?.recipe]?.yield ?? 0), 0);
  if (foodCount(s) + pending + r.yield > foodCapacity(s)) return no("Make room in the food cupboard first.");
  for (const [ingredient, n] of Object.entries(r.ingredients)) if ((k.pantry[ingredient] ?? 0) < n) return no(`Need ${n} ${INGREDIENT_BY_ID[ingredient].name.toLowerCase()}.`);
  for (const [v, n] of Object.entries(r.pumpkins)) if (available(s, +v) < n) return no(`Need ${n} unreserved ${+v === 1 ? "Moonlight" : "Orange"} pumpkin.`);
  return { ok: true, reason: "" };
}
export function startCooking(s, id, station = "truck", automatic = false) {
  if (!cookingReadiness(s, id, station).ok || s.kitchen.nextJob >= 1e9) return false;
  const k = s.kitchen, r = RECIPE_BY_ID[id];
  const pumpkinLines = [];
  for (const [v, n] of Object.entries(r.pumpkins)) {
    // Use old pumpkins first, excluding both old and fresh shopper holds. A
    // simple stock decrement would count a reserved old pumpkin as available
    // and leave too many fresh pumpkins after the cook used a fresh one.
    const fresh = Math.max(0, n - (available(s, +v) - availableFresh(s, +v)));
    if (n > fresh) pumpkinLines.push({ variety: +v, quantity: n - fresh, price: 0, fresh: false });
    if (fresh) pumpkinLines.push({ variety: +v, quantity: fresh, price: 0, fresh: true });
  }
  if (pumpkinLines.length) {
    const owner = `cooking:${k.nextJob}`;
    if (s.holds.some(h => h.owner === owner)) return false;
    s.holds.push({ owner, lines: pumpkinLines }); commitHold(s, owner);
  }
  for (const [ingredient, n] of Object.entries(r.ingredients)) k.pantry[ingredient] -= n;
  const duration = r.seconds * Math.pow(0.85, k.upgrades.speed), job = { id: k.nextJob++, recipe: id, duration, remaining: duration, automatic: automatic === true };
  k.jobs[station] = job; return job;
}
export function cancelCooking(s, station = "truck") {
  if (s.paused || !["truck", "home"].includes(station) || !s.kitchen?.jobs[station]) return false;
  s.kitchen.jobs[station] = null; return true;
}
export function buyKitchenUpgrade(s, id) {
  const k = s.kitchen, u = UPGRADE_BY_ID[id], cost = kitchenUpgradeCost(s, id);
  if (s.paused || !k?.purchased || !u || cost === null || patchLevel(s).level < u.level || s.coins < cost) return false;
  s.coins -= cost; k.upgrades[id]++; k.ledger.invested += cost; return true;
}
export function setChefRecipe(s, id) {
  const k = s.kitchen;
  if (s.paused || !k?.purchased || !k.upgrades.chef || (id !== null && !k.recipes.includes(id))) return false;
  k.chefRecipe = id; return true;
}
export function assignFoodDisplay(s, slot, id) {
  const k = s.kitchen;
  if (s.paused || !k?.purchased || !Number.isInteger(slot) || slot < 0 || slot > 1 || (id !== null && !k.recipes.includes(id))) return false;
  k.displays[slot] = id; return true;
}
export function setFoodPrice(s, id, value) {
  const k = s.kitchen, range = foodPriceRange(s, id);
  if (s.paused || !k?.purchased || !k.recipes.includes(id) || !range || !Number.isInteger(value) || value < range.min || value > range.max) return false;
  k.prices[id] = value; return true;
}
export function kitchenSummary(s) {
  return { level: patchLevel(s).level, unlocked: kitchenUnlocked(s), purchased: !!s.kitchen?.purchased, pantry: { used: pantryCount(s), capacity: pantryCapacity(s) }, food: { used: foodCount(s), capacity: foodCapacity(s) }, homeAvailable: homeCookingAvailable(s), chefHired: !!s.kitchen?.upgrades.chef };
}

// Sequential deliveries share one service road. The second order cannot travel
// through the first cart or start its lead time while the bay is blocked.
export function updateKitchen(s, dt, events = []) {
  const k = s.kitchen;
  if (s.paused || !k?.purchased || !Number.isFinite(dt) || dt <= 0) return;
  let left = dt, turns = 0;
  while (k.orders.length && turns++ < 8) {
    const o = k.orders[0], used = Math.min(left, o.remaining); o.remaining = Math.max(0, o.remaining - used); left -= used;
    if (o.remaining > 1e-8) break;
    if (o.phase === "ordered") { o.phase = "travelling"; o.remaining = 12; }
    else if (o.phase === "travelling") { o.phase = "unloading"; o.remaining = 6; }
    else {
      if (pantryCount(s) + sum(o.items) > pantryCapacity(s)) { o.remaining = 0; break; }
      if (!k.delivered.includes(o.id)) {
        for (const [id, n] of Object.entries(o.items)) k.pantry[id] += n;
        k.delivered.push(o.id); k.delivered = k.delivered.slice(-64); events.push({ type: "ingredient-delivery", order: o.id, quantity: sum(o.items) });
      }
      k.orders.shift();
    }
    if (left <= 0) break;
  }
  for (const station of ["truck", "home"]) {
    const job = k.jobs[station]; if (!job) continue;
    job.remaining = Math.max(0, job.remaining - dt);
    const r = RECIPE_BY_ID[job.recipe];
    if (job.remaining <= 1e-8 && foodCount(s) + r.yield <= foodCapacity(s)) {
      k.food[r.id] += r.yield; k.jobs[station] = null; k.ledger.batchesCooked++;
      events.push({ type: "cooking-complete", station, recipe: r.id, quantity: r.yield });
    }
  }
  // At most one batch starts per simulation update. Long dt never invents a
  // backlog of free work; input consumption still happens through startCooking.
  if (k.upgrades.chef && k.chefRecipe && !k.jobs.truck) startCooking(s, k.chefRecipe, "truck", true);
}

export function restoreKitchen(raw, s) {
  const k = freshKitchen();
  if (!raw || typeof raw !== "object" || raw.purchased !== true) return k;
  k.purchased = true;
  for (const u of KITCHEN_UPGRADES) k.upgrades[u.id] = Math.min(u.costs.length, units(raw.upgrades?.[u.id]));
  k.recipes = [...new Set(["wedges", ...(Array.isArray(raw.recipes) ? raw.recipes.filter(id => RECIPE_BY_ID[id]) : [])])];
  for (const i of INGREDIENTS) k.pantry[i.id] = units(raw.pantry?.[i.id]);
  for (const r of RECIPES) {
    k.food[r.id] = k.recipes.includes(r.id) ? units(raw.food?.[r.id]) : 0;
    const n = raw.prices?.[r.id]; k.prices[r.id] = Number.isInteger(n) ? Math.min(r.price * 2, Math.max(Math.ceil(r.price / 2), n)) : r.price;
  }
  // Valid saves already fit. Corrupt oversized counters are bounded across
  // the whole cupboard, rather than allowing a million of every known ID.
  let pantryRoom = COOKING.pantryBase * (1 + k.upgrades.pantry), foodRoom = COOKING.foodBase * (1 + k.upgrades.storage);
  for (const i of INGREDIENTS) { k.pantry[i.id] = Math.min(pantryRoom, k.pantry[i.id]); pantryRoom -= k.pantry[i.id]; }
  for (const r of RECIPES) { k.food[r.id] = Math.min(foodRoom, k.food[r.id]); foodRoom -= k.food[r.id]; }
  k.displays = [0, 1].map(i => k.recipes.includes(raw.displays?.[i]) ? raw.displays[i] : null);
  k.chefRecipe = k.upgrades.chef && k.recipes.includes(raw.chefRecipe) ? raw.chefRecipe : null;
  for (const key of Object.keys(k.ledger).filter(key => key !== "receipts")) k.ledger[key] = amount(raw.ledger?.[key]);
  k.ledger.foodSold = units(k.ledger.foodSold); k.ledger.batchesCooked = units(k.ledger.batchesCooked);
  const receiptIds = new Set();
  for (const r of (Array.isArray(raw.ledger?.receipts) ? raw.ledger.receipts : []).slice(-32)) {
    if (!r || !Number.isSafeInteger(r.id) || r.id < 1 || receiptIds.has(r.id) || !RECIPE_BY_ID[r.recipe] || r.quantity !== 1 || !Number.isFinite(r.amount) || r.amount < 0 || !Number.isFinite(r.at)) continue;
    receiptIds.add(r.id); k.ledger.receipts.push({ id: r.id, recipe: r.recipe, quantity: 1, amount: Math.min(r.amount, RECIPE_BY_ID[r.recipe].price * 2), at: Math.max(0, Math.min(s.time ?? 0, r.at)) });
  }
  k.delivered = [...new Set((Array.isArray(raw.delivered) ? raw.delivered : []).filter(n => Number.isSafeInteger(n) && n > 0 && n < 1e9))].slice(-64);
  const orderIds = new Set(k.delivered);
  for (const o of Array.isArray(raw.orders) ? raw.orders : []) {
    if (k.orders.length >= COOKING.maxOrders) break;
    if (!o || !Number.isSafeInteger(o.id) || o.id < 1 || o.id >= 1e9 || orderIds.has(o.id) || !["ordered", "travelling", "unloading"].includes(o.phase) || !Number.isFinite(o.remaining) || !o.items || typeof o.items !== "object" || Array.isArray(o.items)) continue;
    const items = {}, entries = Object.entries(o.items);
    if (!entries.length || entries.some(([id, n]) => !INGREDIENT_BY_ID[id] || !Number.isSafeInteger(n) || n <= 0 || n > COOKING.orderLimit)) continue;
    for (const [id, n] of entries) items[id] = n;
    if (sum(items) > COOKING.orderLimit) continue;
    orderIds.add(o.id);
    const subtotal = entries.reduce((n, [id, qty]) => n + INGREDIENT_BY_ID[id].price * qty, 0), phase = k.orders.length ? "ordered" : o.phase;
    const duration = phase === "ordered" ? 42 : phase === "travelling" ? 12 : 6;
    k.orders.push({ id: o.id, items, subtotal, fee: COOKING.deliveryFee, total: subtotal + COOKING.deliveryFee, phase, remaining: k.orders.length ? 42 : Math.max(0, Math.min(duration, o.remaining)) });
  }
  k.nextOrder = Math.min(1e9, Math.max(serial(raw.nextOrder), ...[...orderIds].map(id => id + 1)));
  const jobIds = new Set();
  for (const station of ["truck", "home"]) {
    const j = raw.jobs?.[station], r = RECIPE_BY_ID[j?.recipe];
    if (!j || !r || !k.recipes.includes(r.id) || !Number.isSafeInteger(j.id) || j.id < 1 || j.id >= 1e9 || jobIds.has(j.id) || !Number.isFinite(j.remaining)) continue;
    jobIds.add(j.id); const fastest = r.seconds * Math.pow(0.85, UPGRADE_BY_ID.speed.costs.length);
    const duration = Number.isFinite(j.duration) ? Math.max(fastest, Math.min(r.seconds, j.duration)) : r.seconds * Math.pow(0.85, k.upgrades.speed);
    k.jobs[station] = { id: j.id, recipe: r.id, remaining: Math.max(0, Math.min(duration, j.remaining)), duration, automatic: j.automatic === true };
  }
  k.nextJob = Math.min(1e9, Math.max(serial(raw.nextJob), ...[...jobIds].map(id => id + 1)));
  // Visitors don't survive reload; their baskets must not lock finished food.
  k.foodHolds = [];
  return k;
}
