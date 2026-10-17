import test from "node:test";
import assert from "node:assert/strict";
import { buy, click, cost, fresh, growthTime, harvest, plant, unlocked, update } from "../src/core/model.mjs";
import { stockQuantity } from "../src/core/inventory.js";
import { economy } from "../src/content/economy.js";

const grow = (s) => { for (let t = 0; t <= growthTime(s) + 0.2; t += 0.1) update(s, 0.1); };

test("a fresh patch starts with six plots and £30", () => {
  const s = fresh();
  assert.equal(unlocked(s), 6);
  assert.equal(s.coins, 30);
  assert.equal(stockQuantity(s.inventory), 0);
});

test("plant, grow and harvest one pumpkin", () => {
  const s = fresh();
  assert.equal(plant(s, 0), true);
  assert.equal(plant(s, 0), false, "cannot plant an occupied plot");
  assert.equal(harvest(s, 0), 0, "cannot harvest before it is ripe");
  grow(s);
  assert.equal(s.plots[0].phase, "ready");
  assert.equal(harvest(s, 0), 1);
  assert.equal(s.harvested, 1);
  assert.equal(s.plots[0].phase, "empty");
});

test("locked plots and paused games ignore actions", () => {
  const s = fresh();
  assert.equal(plant(s, 6), false);
  assert.equal(plant(s, -1), false);
  s.paused = true;
  assert.equal(plant(s, 0), false);
  assert.deepEqual(update(s, 1), []);
});

test("tapping the big pumpkin speeds growing plots", () => {
  const s = fresh();
  plant(s, 0);
  click(s);
  assert.ok(s.plots[0].progress > 0);
});

test("upgrades cost more each level and need enough coins", () => {
  const s = fresh();
  assert.equal(buy(s, "tools"), false, "£30 is not enough");
  s.coins = 10_000;
  const first = cost(s, "tools");
  assert.equal(buy(s, "tools"), true);
  assert.equal(s.coins, 10_000 - first);
  assert.equal(cost(s, "tools"), Math.round(90 * economy.farmCostMultiplier));
  assert.equal(buy(s, "nonsense"), false);
});

test("helping hands plant and harvest automatically", () => {
  const s = fresh();
  s.coins = 500;
  assert.equal(buy(s, "auto"), true);
  for (let t = 0; t < 60; t += 0.1) update(s, 0.1);
  assert.ok(s.harvested > 0);
});

test("passers-by buy stocked pumpkins", () => {
  const s = fresh();
  for (let i = 0; i < 6; i++) plant(s, i);
  grow(s);
  for (let i = 0; i < 6; i++) harvest(s, i);
  for (let t = 0; t < 120; t += 0.1) update(s, 0.1);
  assert.ok(s.sold > 0);
  assert.ok(s.coins > 30);
});
