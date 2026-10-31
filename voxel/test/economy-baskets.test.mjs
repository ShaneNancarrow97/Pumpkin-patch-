// Bigger baskets, guests who fill up on cheaper pumpkins, and the market cart.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const guest = (budget, basketLimit, preferred) => ({ budget, basketLimit, preferred });

test("a guest who can't afford more of a favourite fills the basket with something cheaper", () => {
  const s = M.freshState(); s.stock = [10, 0, 0, 2];
  const lines = M.quoteBasket(s, guest(100, 3, [3]), [0, 1, 2, 3], M.VARIETIES.map((v) => v.price));
  assert.deepEqual(lines.map((l) => [l.variety, l.quantity]), [[3, 1], [0, 2]], "one Starlight, then two Oranges with the change");
  assert.ok(lines.reduce((n, l) => n + l.quantity * l.price, 0) <= 100);
});

test("guests start with baskets of three, and Bigger baskets grows them to ten", () => {
  const s = M.freshState(); s.coins = 1e7; s.earned = 2e6; s.progression.claimed = M.LEVELS.map((l) => l.level); 
  assert.equal(M.basketWant(s), 3);
  const wants = [];
  while (M.buyVisitorUpgrade(s, "appetite")) wants.push(M.basketWant(s));
  assert.deepEqual(wants, [4, 5, 6, 7, 8, 10]);
  const costs = M.VISITOR_UPGRADES.find((u) => u.id === "appetite").costs;
  for (let i = 1; i < costs.length; i++) assert.ok(costs[i] > costs[i - 1] * 2, "each tier clearly dearer");
});

test("bigger baskets bring a little more money, never a Starlight purse each", () => {
  const s = M.freshState(); s.stock = [50, 0, 0, 0]; s.visitorTimer = 0.1; s.nextVisitor = 0;
  M.update(s, 0.1); const small = s.visitors[0];
  const t = M.freshState(); t.visitorUpgrades.appetite = 6; t.stock = [50, 0, 0, 0]; t.visitorTimer = 0.1; t.nextVisitor = 0;
  M.update(t, 0.1); const big = t.visitors[0];
  assert.equal(small.basketLimit, 3); assert.equal(big.basketLimit, 10);
  assert.equal(big.budget - small.budget, 7 * M.EXTRA_PURSE);
});

test("a market cart keeps the harvest going when the barn is full, for a share and only so many a minute", () => {
  const s = M.freshState(); s.stock = [M.barnCapacity(s), 0, 0, 0];
  const ripe = (v) => { s.plots[0] = { phase: "ready", progress: 1, variety: v }; };
  ripe(3); assert.equal(M.harvest(s, 0), 0, "no cart: the crop waits on the patch"); assert.equal(M.barnBlocked(s), true);
  s.upgrades.cart = 1; const coins = s.coins;
  ripe(3); assert.equal(M.harvest(s, 0), 1); assert.equal(s.coins - coins, Math.floor(70 * 0.15)); assert.equal(s.wholesale, 10);
  assert.equal(M.stockCount(s), M.barnCapacity(s), "the barn is untouched");
  for (let i = 1; i < 10; i++) { ripe(0); assert.equal(M.harvest(s, 0), 1); }
  ripe(0); assert.equal(M.harvest(s, 0), 0, "ten a minute at the first tier"); assert.equal(M.barnBlocked(s), true);
  s.time += 60; assert.equal(M.barnBlocked(s), false); assert.equal(M.harvest(s, 0), 1, "the next minute it sets off again");
  const r = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))); assert.equal(r.upgrades.cart, 1);
});
