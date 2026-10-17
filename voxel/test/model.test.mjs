import test from "node:test";
import assert from "node:assert/strict";
import { freshState, plant, harvest, tap, update, buyUpgrade, upgradeCost, upgradePlot, buyLook, openPlots, growTime, VISIT, VARIETIES } from "../src/model.js";

const run = (s, seconds, random = () => 0.5) => { const events = []; for (let t = 0; t < seconds; t += 0.1) events.push(...update(s, 0.1, random)); return events; };

test("plant, grow, harvest", () => {
  const s = freshState();
  assert.equal(openPlots(s), 6);
  assert.ok(plant(s, 0));
  assert.ok(!plant(s, 0), "occupied");
  assert.ok(!plant(s, 7), "locked");
  run(s, growTime(s, 0) + 0.2);
  assert.equal(s.plots[0].phase, "ready");
  assert.ok(harvest(s, 0));
  assert.deepEqual(s.stock, [0]);
});

test("tapping the big pumpkin hurries growing plots", () => {
  const s = freshState();
  plant(s, 0);
  tap(s);
  assert.ok(s.plots[0].progress > 0.1);
  assert.equal(s.taps, 1);
});

test("visitors walk in, buy the best pumpkin they can afford, and leave", () => {
  const s = freshState();
  s.stock = [0, 1];
  s.visitorTimer = 0.05;
  const events = run(s, VISIT.arrive + 0.5, () => 0.4);     // kind 2: budget 80
  const sale = events.find((e) => e.type === "sale");
  assert.ok(sale, "sold");
  assert.equal(sale.amount, VARIETIES[1].price, "picked the Moonlight");
  assert.deepEqual(s.stock, [0]);
  run(s, VISIT.linger + VISIT.leave + 0.5, () => 0.99);
  assert.ok(!s.visitors.some((v) => v.id === sale.visitor), "walked away");
});

test("a visitor with no stock waits, then leaves without paying", () => {
  const s = freshState();
  s.visitorTimer = 0.05;
  const events = run(s, VISIT.arrive + VISIT.patience + 0.5);
  assert.ok(events.some((e) => e.type === "missed"));
  assert.equal(s.coins, 40);
});

test("upgrades, plot varieties and looks cost coins and stick", () => {
  const s = freshState();
  assert.ok(!buyUpgrade(s, "tools") || s.coins >= 0);
  s.coins = 10000;
  const price = upgradeCost(s, "plots");
  assert.ok(buyUpgrade(s, "plots"));
  assert.equal(s.coins, 10000 - price);
  assert.equal(openPlots(s), 9);
  assert.ok(upgradePlot(s, 0));
  assert.equal(s.plotLevels[0], 1);
  assert.ok(buyLook(s, "natalie", "plum"));
  assert.equal(s.looks.natalie, "plum");
  assert.ok(buyLook(s, "natalie", "olive"), "owned looks are free to wear");
});

test("helping hands plant and pick", () => {
  const s = freshState();
  s.coins = 500; assert.ok(buyUpgrade(s, "helper"));
  run(s, 40);
  assert.ok(s.harvested > 0);
});
