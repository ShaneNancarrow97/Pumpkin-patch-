import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { freshKitchen } from '../src/rules/cooking.js';
import { availableFood } from '../src/rules/cooking-sales.js';
import { truckGuestPose, TRUCK_HATCH, TRUCK_WALK_SPEED, TRUCK_QUEUE_CAPACITY } from '../src/content/cooking-visits.js';

const setup = ({ food = 30, purchased = true, sellAt = 'truck' } = {}) => {
  const s = M.freshState();
  s.coins = 500; s.earned = M.LEVELS[19].at;
  s.progression.claimed = M.LEVELS.map(l => l.level);
  s.stock[0] = 40;
  s.kitchen = freshKitchen(); s.kitchen.purchased = purchased; s.kitchen.sellAt = sellAt;
  s.kitchen.recipes = ['wedges']; s.kitchen.displays = ['wedges', null]; s.kitchen.food.wedges = food;
  s.kitchen.prices.wedges = 11; s.customerCare.bags = 1;
  // Spawn the real native starving visitor (33), rather than constructing a
  // paid receipt or a fake customer. Native needs, basket and wallet apply.
  s.nextVisitor = 33; s.visitorTimer = 0; s.shop.arrivalTimer = 1e9;
  return s;
};
const step = (s, seconds = .1) => M.update(s, seconds);
const spawn = s => { step(s); s.visitorTimer = 1e9; const v = s.visitors.find(v => v.id === 33); assert.ok(v); return v; };
const until = (s, predicate, limit = 120) => {
  const events = [];
  for (let t = 0; !predicate() && t < limit; t += .1) events.push(...step(s));
  assert.ok(predicate(), 'visitor completed the native simulation phase');
  return events;
};

test('a real farm visitor walks to Maisie, pays once at the hatch, then carries the meal to the boundary', () => {
  const s = setup(), v = spawn(s), beforeCoins = s.coins, beforeFood = s.kitchen.food.wedges;
  const startPurse = v.originalBudget, all = [];
  all.push(...until(s, () => v.takeaway?.phase === 'approach'));
  assert.equal(v.food.status, 'held'); assert.equal(s.kitchen.food.wedges, beforeFood);
  assert.equal(s.kitchen.ledger.foodIncome, 0); assert.ok(v.quantity > 0, 'the same visitor first bought pumpkins');
  const afterPumpkins = s.coins, mealPurse = v.budget, quantity = v.food.quantity;
  assert.equal(availableFood(s, 'wedges'), beforeFood - quantity);
  let last = truckGuestPose(v); const phases = new Set(['approach']);
  while (v.takeaway.phase !== 'serving') {
    all.push(...step(s)); const pose = truckGuestPose(v); phases.add(v.takeaway.phase);
    assert.ok(Math.hypot(pose.x - last.x, pose.z - last.z) <= TRUCK_WALK_SPEED * .1 + 1e-8, 'no teleport between walking and queue phases');
    assert.equal(s.kitchen.ledger.foodIncome, 0, 'no charge before reaching the hatch');
    assert.equal(s.coins, afterPumpkins); last = pose;
  }
  assert.ok(phases.has('queue') && phases.has('to-hatch'));
  assert.equal(last.x, TRUCK_HATCH[0]); assert.equal(last.z, TRUCK_HATCH[1]);
  assert.equal(last.walking, false); assert.equal(last.served, false);
  all.push(...until(s, () => v.food.status === 'paid'));
  assert.equal(truckGuestPose(v).served, true); assert.equal(v.foodSpend, quantity * 11);
  assert.equal(v.budget, mealPurse - quantity * 11); assert.ok(v.budget >= 0);
  assert.equal(s.kitchen.food.wedges, beforeFood - quantity); assert.equal(s.kitchen.foodHolds.length, 0);
  assert.equal(s.kitchen.ledger.foodSold, quantity); assert.equal(s.kitchen.ledger.foodIncome, quantity * 11);
  all.push(...until(s, () => !s.visitors.some(g => g.id === v.id)));
  const meals = all.filter(e => e.type === 'sale' && e.route === 'takeaway');
  assert.equal(meals.length, 1); assert.equal(meals[0].foodQuantity, quantity);
  assert.equal(s.kitchen.ledger.receipts.length, 1); assert.equal(v.takeaway.gone, true);
  const paid = v.amount + (v.tip ?? 0) + (v.mug ?? 0) + v.foodSpend;
  assert.equal(startPurse - v.budget, paid); assert.equal(s.coins - beforeCoins, paid);
  assert.equal(s.stall.income, v.amount); assert.equal(s.stall.itemsSold, v.quantity); assert.equal(s.sold, 1, 'food portions never inflate pumpkin transaction count');
  const again = step(s, 10); assert.equal(again.filter(e => e.route === 'takeaway').length, 0);
});

test('hungry guests buy directly from the truck even when no pumpkins are available', () => {
  const s = setup(); s.stock.fill(0); const v = spawn(s);
  const events = until(s, () => !s.visitors.includes(v));
  assert.equal(v.food.status, 'paid'); assert.equal(v.quantity, 0);
  assert.equal(events.filter(e => e.route === 'takeaway').length, 1);
  assert.equal(s.stall.income, 0); assert.equal(s.kitchen.ledger.foodIncome, v.foodSpend);
});

test('an empty, unpurchased or unaffordable menu produces no truck trip, no food sale and no hold', () => {
  for (const mode of ['empty', 'closed', 'overpriced', 'not-displayed']) {
    const s = setup({ food: mode === 'empty' ? 0 : 30, purchased: mode !== 'closed' });
    if (mode === 'overpriced') s.kitchen.prices.wedges = 1000;
    if (mode === 'not-displayed') s.kitchen.displays = [null, null];
    const v = spawn(s), food = s.kitchen.food.wedges;
    const events = until(s, () => !s.visitors.includes(v));
    assert.equal(v.takeaway, undefined, mode); assert.equal(s.kitchen.food.wedges, food, mode);
    assert.equal(s.kitchen.ledger.foodIncome, 0, mode); assert.equal(s.kitchen.foodHolds.length, 0, mode);
    assert.equal(events.some(e => e.route === 'takeaway'), false, mode);
  }
});

test('the hatch queues real customers, holds each portion once and never runs two tills at once', () => {
  const s = setup({ food: 2 }); s.stock.fill(0); s.customerCare.bags = 0;
  s.arriving = Array.from({ length: 5 }, (_, place) => ({ party: 0, place, size: 5, wait: 0 })); s.visitorTimer = 1e9;
  step(s); const guests = [...s.visitors]; guests.forEach(v => { v.needs.hunger = 100; v.needs.value = 1; });
  const events = [];
  for (let t = 0; t < 70; t += .1) {
    events.push(...step(s));
    assert.ok(s.kitchen.foodHolds.length <= 2);
    assert.ok(s.visitors.filter(v => ['serving', 'to-hatch'].includes(v.takeaway?.phase)).length <= 1);
    assert.ok(s.visitors.filter(v => v.takeaway && !v.takeaway.gone).length <= TRUCK_QUEUE_CAPACITY);
    assert.ok(s.kitchen.food.wedges >= 0); assert.ok(availableFood(s, 'wedges') >= 0);
  }
  assert.equal(s.kitchen.food.wedges, 0); assert.equal(s.kitchen.ledger.foodSold, 2);
  assert.equal(s.kitchen.ledger.foodIncome, 22); assert.equal(s.kitchen.foodHolds.length, 0);
  assert.equal(guests.filter(v => v.food?.status === 'paid').length, 2);
  assert.equal(events.filter(e => e.route === 'takeaway').length, 2);
});

test('pause freezes approach and hatch service; a load releases unpaid holds without inventing sales', () => {
  const s = setup(), v = spawn(s);
  until(s, () => v.takeaway?.phase === 'serving'); s.paused = true;
  const snapshot = JSON.stringify(s); assert.deepEqual(step(s, 60), []); assert.equal(JSON.stringify(s), snapshot);
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(loaded.kitchen.food.wedges, 30); assert.equal(loaded.kitchen.foodHolds.length, 0);
  assert.equal(loaded.kitchen.ledger.foodIncome, 0); assert.equal(loaded.visitors.length, 0);
  s.paused = false; until(s, () => v.food.status === 'paid');
  const paid = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(paid.kitchen.food.wedges, s.kitchen.food.wedges);
  assert.equal(paid.kitchen.ledger.foodIncome, v.foodSpend); assert.equal(paid.kitchen.ledger.foodSold, v.food.quantity);
});

test('a failed handover releases stock and never debits a visitor whose change is no longer sufficient', () => {
  const s = setup(), v = spawn(s); until(s, () => v.takeaway?.phase === 'serving');
  v.budget = 0; const before = s.coins;
  const events = until(s, () => !s.visitors.includes(v));
  assert.equal(v.food.status, 'released'); assert.equal(s.kitchen.food.wedges, 30); assert.equal(s.coins, before);
  assert.equal(s.kitchen.foodHolds.length, 0); assert.equal(s.kitchen.ledger.foodIncome, 0);
  assert.equal(events.some(e => e.route === 'takeaway'), false);
});

test('guests who already left at an attraction exit cannot teleport back to buy food', () => {
  for (const ended of ['hollow', 'hayride']) {
    const s = setup(), v = spawn(s); v.age = 12; v.leaveAt = 10;
    v[ended] = { done: true, wentHome: true }; v.hollowConsidered = true; v.hayrideConsidered = true;
    const before = s.coins, wallet = v.budget;
    const events = step(s);
    assert.equal(s.visitors.includes(v), false); assert.equal(v.takeaway, undefined);
    assert.equal(s.kitchen.foodHolds.length, 0); assert.equal(s.kitchen.ledger.foodIncome, 0);
    assert.equal(s.coins, before); assert.equal(v.budget, wallet); assert.equal(events.some(e => e.route === 'takeaway'), false);
  }
});
