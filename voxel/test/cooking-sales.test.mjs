import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, saveData, restoreState } from '../src/model.js';
import { freshKitchen } from '../src/rules/cooking.js';
import { RECIPE_BY_ID } from '../src/content/cooking.js';
import { quoteFoodForCustomer, commitFoodForCustomer, releaseFoodForCustomer, availableFood, foodPaymentReserve, protectedFoodPurse } from '../src/rules/cooking-sales.js';
import { updateShop, closeForTheNight } from '../src/rules/selling.js';

const setup = () => {
  const s = freshState(); s.shop.unlocked = true; s.shop.arrivalTimer = 1e9;
  s.kitchen = freshKitchen(); s.kitchen.purchased = true;
  s.kitchen.recipes = ['wedges']; s.kitchen.displays = ['wedges', null]; s.kitchen.food.wedges = 20; s.kitchen.prices.wedges = RECIPE_BY_ID.wedges.basePrice;
  return s;
};
const guest = (id = 0, budget = 100) => ({ id, kind: 0, slot: 0, budget, originalBudget: budget, basketLimit: 3, preferred: [0], basket: [], phase: 'browsing', remaining: 0, checkoutDuration: 0, needs: { hunger: 100, thirst: 50, happiness: 80, value: 1 }, wish: null });
const tick = (s, seconds) => { const events = []; for (let t = 0; t < seconds; t += .1) { s.time += .1; updateShop(s, .1, events); } return events; };

test('hungry guests reserve one real serving, lock its price and cannot reroll or oversell it', () => {
  const s = setup(), a = guest(), b = guest(1); s.kitchen.food.wedges = 1;
  const h = quoteFoodForCustomer(s, a); assert.ok(h); assert.equal(availableFood(s, 'wedges'), 0);
  assert.equal(quoteFoodForCustomer(s, b), null); assert.strictEqual(quoteFoodForCustomer(s, a), h); assert.equal(s.kitchen.foodHolds.length, 1);
  s.kitchen.prices.wedges = 99; assert.equal(foodPaymentReserve(s, a), 11);
  const coins = s.coins, earned = s.earned, receipt = commitFoodForCustomer(s, a);
  assert.equal(receipt.amount, 11); assert.equal(s.coins, coins + 11); assert.equal(s.earned, earned + 11); assert.equal(a.budget, 89);
  assert.equal(s.kitchen.food.wedges, 0); assert.equal(a.food.status, 'paid'); assert.equal(s.kitchen.ledger.foodIncome, 11); assert.equal(s.kitchen.ledger.foodSold, 1);
  assert.equal(s.shop.income, 0); assert.equal(s.shop.itemsSold, 0); assert.equal(s.customerCare.tips.shop, 0); assert.equal(s.sold, 0);
  assert.equal(commitFoodForCustomer(s, a), null); assert.equal(s.coins, coins + 11); assert.equal(s.kitchen.ledger.receipts.length, 1);
});

test('food must fit actual change after pumpkins and an unspent wanted-pumpkin purse', () => {
  const s = setup(), a = guest(2, 94); a.wish = { variety: 3, purse: 70 }; a.basket = [{ variety: 0, quantity: 1, price: 12 }];
  assert.equal(protectedFoodPurse(s, a), 70); assert.ok(quoteFoodForCustomer(s, a));
  const r = commitFoodForCustomer(s, a, { reserved: 12, protectedPurse: protectedFoodPurse(s, a) }); assert.equal(r.amount, 11); assert.equal(a.budget, 83);
  const b = guest(3, 92); b.wish = a.wish; b.basket = a.basket; assert.equal(quoteFoodForCustomer(s, b), null);
  assert.equal(protectedFoodPurse(s, a, [{ variety: 3, quantity: 1, price: 70 }]), 0);
});

test('guests decline expensive food and low hunger; payment failure releases the hold without losses', () => {
  const s = setup(), a = guest(); s.kitchen.prices.wedges = 100;
  assert.equal(quoteFoodForCustomer(s, a), null); s.kitchen.prices.wedges = 11; a.needs.hunger = 20;
  assert.equal(quoteFoodForCustomer(s, a), null); a.needs.hunger = 100; assert.ok(quoteFoodForCustomer(s, a));
  a.budget = 10; const before = s.coins; assert.equal(commitFoodForCustomer(s, a), null); assert.equal(s.coins, before); assert.equal(s.kitchen.food.wedges, 20); assert.equal(s.kitchen.foodHolds.length, 0); assert.equal(a.food.status, 'released');
});

test('food-only customers queue and pay Skyla even when no pumpkins are available', () => {
  const s = setup(), a = guest(4, 30); s.shop.customers = [a]; const before = s.coins, events = tick(s, 17);
  assert.equal(a.food.status, 'paid'); assert.equal(a.outcome, 'bought'); assert.equal(a.spent, 11); assert.equal(a.budget, 19);
  assert.equal(s.coins, before + 11); assert.equal(s.shop.income, 0); assert.equal(s.shop.served, 0); assert.equal(s.kitchen.ledger.foodIncome, 11);
  assert.deepEqual(events.filter(e => e.type === 'sale').map(e => e.route), ['food']); assert.equal(events.filter(e => e.type === 'missed').length, 0);
});

test('mixed checkout reconciles finite wallets, pumpkin ledger, food ledger and separate tips', () => {
  const s = setup(); s.customerCare.tipJar = 3; let food = 0, pumpkins = 0, tips = 0;
  const before = s.coins;
  for (let id = 0; id < 150; id++) {
    s.kitchen.food.wedges = 1; s.stock = [1, 0, 0, 0]; const a = guest(id, 30); a.basketLimit = 1;
    s.shop.customers = [a]; const events = tick(s, 17);
    const sales = events.filter(e => e.type === 'sale'); food += sales.filter(e => e.route === 'food').reduce((n, e) => n + e.amount, 0); pumpkins += sales.filter(e => e.route === 'shop').reduce((n, e) => n + e.amount - e.tip, 0); tips += sales.reduce((n, e) => n + (e.tip ?? 0), 0);
    assert.equal(a.food.status, 'paid'); assert.ok(a.budget >= 0); assert.equal(a.originalBudget - a.budget, a.spent + a.tip);
    assert.equal(a.quantity, 1); assert.equal(s.stock[0], 0); assert.equal(s.kitchen.food.wedges, 0);
  }
  assert.ok(food > 0 && tips > 0); assert.equal(s.kitchen.ledger.foodIncome, food); assert.equal(s.shop.income, pumpkins); assert.equal(s.customerCare.tips.shop, tips);
  assert.equal(s.coins - before, pumpkins + food + tips); assert.equal(s.kitchen.ledger.receipts.length, 32);
});

test('unspent wanted money stays in the wallet even when food and a tip are both offered', () => {
  for (let id = 0; id < 80; id++) {
    const s = setup(), a = guest(id, 94); s.customerCare.tipJar = 3; s.stock[0] = 1; a.basketLimit = 2; a.wish = { variety: 3, purse: 70 }; s.shop.customers = [a];
    tick(s, 17); assert.equal(a.food.status, 'paid'); assert.ok(a.budget >= 70); assert.equal(a.spent, 23); assert.ok((a.tip ?? 0) <= 1);
  }
});

test('holds are released on close and restore, while actual food stock and paid sales survive', () => {
  const s = setup(), a = guest(); quoteFoodForCustomer(s, a); s.shop.customers = [a]; assert.equal(availableFood(s, 'wedges'), 19);
  const restored = restoreState(JSON.parse(JSON.stringify(saveData(s)))); assert.equal(restored.kitchen.foodHolds.length, 0); assert.equal(restored.kitchen.food.wedges, 20);
  closeForTheNight(s); assert.equal(s.kitchen.foodHolds.length, 0); assert.equal(availableFood(s, 'wedges'), 20); assert.equal(s.shop.customers.length, 0);
  const b = guest(2); quoteFoodForCustomer(s, b); commitFoodForCustomer(s, b); const paid = restoreState(JSON.parse(JSON.stringify(saveData(s))));
  assert.equal(paid.kitchen.food.wedges, 19); assert.equal(paid.kitchen.ledger.foodSold, 1); assert.equal(paid.kitchen.ledger.foodIncome, 11);
});

test('pause stops direct shop ticks, quotes and payments without releasing paid-for inventory', () => {
  const s = setup(), a = guest(); s.shop.customers = [a]; quoteFoodForCustomer(s, a); s.paused = true;
  const snapshot = JSON.stringify(s), events = []; updateShop(s, 20, events); assert.equal(JSON.stringify(s), snapshot); assert.deepEqual(events, []);
  assert.equal(commitFoodForCustomer(s, a), null); assert.equal(s.kitchen.foodHolds.length, 1); assert.equal(quoteFoodForCustomer(s, guest(1)), null);
  s.paused = false; assert.ok(commitFoodForCustomer(s, a));
});
