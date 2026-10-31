import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { freshState, saveData, restoreState } from '../src/model.js';
import { freshKitchen } from '../src/rules/cooking.js';
import { foodBasketLimit, quoteFoodForCustomer, commitFoodForCustomer, availableFood, foodPaymentReserve, protectedFoodPurse } from '../src/rules/cooking-sales.js';
import { updateShop } from '../src/rules/selling.js';
import { buildFoodProp, buildFoodWallDisplay, disposeFoodProp } from '../src/food-props.js';

const setup = () => {
  const s = freshState(); s.shop.unlocked = true; s.shop.arrivalTimer = 1e9;
  s.kitchen = freshKitchen(); s.kitchen.purchased = true;
  s.kitchen.recipes = ['wedges']; s.kitchen.displays = ['wedges', null]; s.kitchen.food.wedges = 20;
  return s;
};
const guest = (id = 0, budget = 100, hunger = 100) => ({ id, kind: 0, slot: 0, budget, originalBudget: budget, basketLimit: 1, preferred: [0], basket: [], phase: 'browsing', remaining: 0, checkoutDuration: 0, needs: { hunger, thirst: 50, happiness: 80, value: 1 }, wish: null });
const tick = (s, seconds) => { const events = []; for (let t = 0; t < seconds; t += .1) { s.time += .1; updateShop(s, .1, events); } return events; };

test('carrier bags and appetite bound how many real portions a guest may take home', () => {
  for (const [bags, hunger, vip, expected] of [[0, 100, false, 1], [0, 100, true, 1], [1, 69, false, 1], [1, 70, false, 2], [1, 100, false, 2], [2, 84, false, 2], [2, 85, false, 3], [3, 100, false, 3], [1, 50, true, 6]]) {
    const s = setup(), c = guest(0, 100, hunger); c.vip = vip; s.customerCare.bags = bags;
    assert.equal(foodBasketLimit(s, c), expected);
    assert.equal(quoteFoodForCustomer(s, c).quantity, expected);
  }
  const s = setup(); s.customerCare.bags = 3;
  assert.equal(quoteFoodForCustomer(s, guest(0, 100, 39)), null);
});

test('bulk orders spend only change after the pumpkin basket and protected wanted money', () => {
  const s = setup(), c = guest(2, 105); s.customerCare.bags = 3;
  c.wish = { variety: 3, purse: 70 }; c.basket = [{ variety: 0, quantity: 1, price: 13 }];
  const h = quoteFoodForCustomer(s, c); assert.equal(h.quantity, 2); assert.equal(foodPaymentReserve(s, c), 22);
  const receipt = commitFoodForCustomer(s, c, { reserved: 13, protectedPurse: protectedFoodPurse(s, c) });
  assert.equal(receipt.amount, 22); assert.equal(c.budget, 83); assert.equal(c.budget - 13, 70);
  const b = guest(3, 21); assert.equal(quoteFoodForCustomer(s, b).quantity, 1);
});

test('two hungry bulk buyers cannot reserve the same last serving or change their quoted price', () => {
  const s = setup(), a = guest(1), b = guest(2); s.customerCare.bags = 2; s.kitchen.food.wedges = 4;
  const held = quoteFoodForCustomer(s, a); assert.equal(held.quantity, 3); assert.equal(availableFood(s, 'wedges'), 1);
  assert.equal(quoteFoodForCustomer(s, b).quantity, 1); assert.equal(availableFood(s, 'wedges'), 0);
  s.kitchen.prices.wedges = 22; assert.strictEqual(quoteFoodForCustomer(s, a), held); assert.equal(foodPaymentReserve(s, a), 33);
  assert.equal(commitFoodForCustomer(s, a).amount, 33); assert.equal(commitFoodForCustomer(s, b).amount, 11);
  assert.equal(s.kitchen.food.wedges, 0); assert.equal(s.kitchen.ledger.foodSold, 4); assert.equal(s.kitchen.ledger.foodIncome, 44);
});

test('bulk food receipt is paid exactly once, has separate accounts and survives reload', () => {
  const s = setup(), c = guest(); s.customerCare.bags = 2; quoteFoodForCustomer(s, c);
  const coins = s.coins, earned = s.earned, r = commitFoodForCustomer(s, c);
  assert.equal(r.quantity, 3); assert.equal(r.amount, 33); assert.equal(c.budget, 67);
  assert.equal(s.coins - coins, 33); assert.equal(s.earned - earned, 33); assert.equal(s.kitchen.ledger.foodSold, 3);
  assert.equal(s.shop.income, 0); assert.equal(s.shop.itemsSold, 0); assert.equal(s.customerCare.tips.shop, 0); assert.equal(s.sold, 0);
  assert.equal(commitFoodForCustomer(s, c), null); assert.equal(s.coins - coins, 33);
  const restored = restoreState(JSON.parse(JSON.stringify(saveData(s))));
  assert.deepEqual(restored.kitchen.ledger.receipts[0], r); assert.equal(restored.kitchen.food.wedges, 17);
});

test('150 mixed till checkouts reconcile bags, pumpkin money, food units and voluntary tips', () => {
  const s = setup(); s.customerCare.tipJar = 3;
  const before = s.coins; let food = 0, units = 0, pumpkins = 0, tips = 0;
  for (let id = 0; id < 150; id++) {
    s.customerCare.bags = id % 3; s.kitchen.food.wedges = 10; s.stock = [1, 0, 0, 0];
    const c = guest(id, 24 + id % 60); s.shop.customers = [c];
    const events = tick(s, 17), foodSale = events.find(e => e.type === 'sale' && e.route === 'food');
    assert.ok(c.budget >= 0); assert.equal(c.originalBudget - c.budget, c.spent + (c.tip ?? 0));
    assert.equal(c.food.status, 'paid'); assert.equal(s.kitchen.food.wedges, 10 - c.food.quantity);
    assert.ok(c.food.quantity >= 1 && c.food.quantity <= 3); assert.equal(c.food.quantity, foodSale.quantity);
    food += foodSale.amount; units += foodSale.quantity;
    for (const e of events.filter(e => e.type === 'sale' && e.route === 'shop')) { pumpkins += e.amount - e.tip; tips += e.tip; }
  }
  assert.ok(units > 150); assert.equal(s.kitchen.ledger.foodSold, units); assert.equal(s.kitchen.ledger.foodIncome, food);
  assert.equal(s.shop.income, pumpkins); assert.equal(s.customerCare.tips.shop, tips); assert.equal(s.coins - before, food + pumpkins + tips);
});

test('a short wallet or invalid hold releases the reservation without losing food or minting money', () => {
  for (const quantity of [0, -1, 9, Infinity]) {
    const s = setup(), c = guest(); s.customerCare.bags = 2; const h = quoteFoodForCustomer(s, c); h.quantity = quantity;
    const before = s.coins; assert.equal(commitFoodForCustomer(s, c), null); assert.equal(s.coins, before); assert.equal(s.kitchen.food.wedges, 20); assert.equal(s.kitchen.foodHolds.length, 0);
  }
  const s = setup(), c = guest(); s.customerCare.bags = 2; quoteFoodForCustomer(s, c); c.budget = 32;
  assert.equal(commitFoodForCustomer(s, c), null); assert.equal(s.kitchen.food.wedges, 20); assert.equal(c.budget, 32);
});

test('pause preserves a bulk reservation and stops both quoting and payment', () => {
  const s = setup(), c = guest(); s.customerCare.bags = 2; quoteFoodForCustomer(s, c); s.paused = true;
  const before = JSON.stringify(s); assert.equal(commitFoodForCustomer(s, c), null); assert.equal(quoteFoodForCustomer(s, guest(1)), null);
  assert.equal(JSON.stringify(s), before); s.paused = false; assert.equal(commitFoodForCustomer(s, c).quantity, 3);
});

test('each new home dish can sell from the same shelves and finite guest wallet', () => {
  for (const id of ['garden-skillet', 'harvest-broth', 'spiced-roast', 'moonfire-chicken', 'haunted-pie', 'pumpkin-spice-biscuits']) {
    const s = setup(), c = guest(); s.customerCare.bags = 2;
    s.kitchen.recipes.push(id); s.kitchen.food[id] = 3; s.kitchen.displays = [id, null];
    const held = quoteFoodForCustomer(s, c); assert.ok(held, id); assert.equal(held.recipe, id); assert.equal(held.quantity, 3);
    const before = s.coins, r = commitFoodForCustomer(s, c);
    assert.equal(r.quantity, 3); assert.equal(s.kitchen.food[id], 0); assert.equal(s.coins - before, r.amount);
    assert.equal(c.budget, 100 - r.amount); assert.ok(c.budget >= 0);
  }
});

test('six new native dishes fit the product displays and never dispose the shared cube', () => {
  const ids = ['garden-skillet', 'harvest-broth', 'spiced-roast', 'moonfire-chicken', 'haunted-pie', 'pumpkin-spice-biscuits'];
  let sharedDisposed = 0, disposedMaterials = 0; const matrix = new THREE.Matrix4(), boxes = [];
  for (const id of ids) {
    const prop = buildFoodProp(id, { scale: 1 }); let count = 0;
    prop.traverse(m => {
      if (!m.isInstancedMesh) return;
      m.geometry.addEventListener('dispose', () => sharedDisposed++); m.material.addEventListener('dispose', () => disposedMaterials++);
      count += m.count;
      for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0); }
    });
    prop.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(prop), size = box.getSize(new THREE.Vector3());
    assert.ok(size.x <= 1.2 && size.y <= .65 && size.z <= .7); assert.ok(count >= 20 && count < 180); boxes.push(count);
    disposeFoodProp(prop);
    const cabinet = buildFoodWallDisplay({ recipeId: id, count: 3 }); assert.equal(cabinet.children.filter(c => c.userData.nativeFood).length, 3); disposeFoodProp(cabinet);
  }
  assert.ok(new Set(boxes).size >= 5); assert.equal(sharedDisposed, 0); assert.ok(disposedMaterials >= ids.length);
});
