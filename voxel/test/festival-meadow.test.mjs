import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { planFestivalVisit, tickFestivalVisit } from "../src/rules/festival-meadow.js";

const run = (s, seconds) => { const events = []; for (let i = 0; i < seconds * 10; i++) events.push(...M.update(s, .1)); return events; };
const ready = () => { const s = M.freshState(); s.festival.meadow = true; s.festival.cocoa.level = 1; s.festival.cocoa.stock = 10; s.visitorTimer = 1e6; return s; };
function guest(s, id, budget = 24) {
  const v = { id, kind: id % 5, originalBudget: budget, budget, basketLimit: 1, preferred: [0], age: 0, leaveAt: null, basket: [], bought: null, outcome: "shopping", amount: 0, quantity: 0, spot: id, mug: 0 };
  v.festival = planFestivalVisit(s, v); s.visitors.push(v); return v;
}

test("land and stand purchases are gated, one-time and save-compatible", () => {
  const s = M.freshState(); s.coins = 1e6;
  assert.equal(M.buyMeadow(s), false); s.earned = 1000; s.paused = true;
  assert.equal(M.buyMeadow(s), false); s.paused = false;
  assert.ok(M.buyMeadow(s)); const after = s.coins; assert.equal(M.buyMeadow(s), false); assert.equal(s.coins, after);
  assert.equal(M.fieldWidth(s), 54); assert.equal(M.upgradeCocoa(s), false);
  s.earned = 2200; assert.equal(s.festival.cocoa.level, 0); const beforeBuild = s.coins; assert.ok(M.upgradeCocoa(s)); assert.equal(s.coins, beforeBuild - 650); assert.equal(s.festival.cocoa.stock, 10);
  assert.equal(M.upgradeCocoa(s), false); s.earned = 4500; assert.ok(M.upgradeCocoa(s));
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))); assert.deepEqual(loaded.festival, s.festival);
  const old = M.freshState(); old.version = 5; delete old.festival;
  assert.deepEqual(M.restoreState(old).festival, M.freshState().festival);
});

test("supplies cost real money, obey capacity, and higher prices require an upgrade", () => {
  const s = ready(); s.coins = 100;
  assert.equal(M.restockCocoa(s), 10); assert.equal(s.coins, 80);
  assert.equal(M.restockCocoa(s), 10); assert.equal(M.restockCocoa(s), 0); assert.equal(s.coins, 60);
  assert.equal(M.setCocoaPrice(s, 5), false); assert.equal(M.setCocoaPrice(s, 3), true);
  assert.equal(M.setCocoaPrice(s, NaN), false); assert.equal(M.setCocoaPrice(s, 3.5), false);
  s.festival.cocoa.stock = 29; assert.equal(M.restockCocoa(s), 1); assert.equal(s.coins, 58);
  s.paused = true; assert.equal(M.setCocoaOpen(s, false), false); assert.equal(M.restockCocoa(s), 0);
});

test("a guest physically visits cocoa before pumpkins, paying both from one budget", () => {
  const s = ready(); s.stock[0] = 10; s.visitorUpgrades.cocoa = 3;
  const v = guest(s, 4), before = s.coins, events = run(s, 55);
  assert.equal(v.cocoaSpend, 4); assert.equal(v.budget, 8); assert.equal(v.amount, 12);
  assert.ok(v.amount + v.cocoaSpend <= v.originalBudget); assert.equal(s.coins, before + 16);
  assert.equal(s.festival.cocoa.stock, 9); assert.equal(s.festival.cocoa.sold, 1); assert.equal(s.stall.cocoa, 4);
  assert.equal(v.mug, 0, "the old unlimited cocoa perk does not double-charge or pay again");
  const paid = events.filter((e) => e.type === "sale");
  assert.deepEqual(paid.map((e) => e.route), ["festival-cocoa", "stall"]);
  assert.equal(s.sold, 1); assert.equal(s.stock[0], 9);
});

test("cocoa preserves planned pumpkin money; drink-only guests can still buy", () => {
  const s = ready(); s.stock[0] = 10;
  const cautious = guest(s, 1, 12); assert.equal(cautious.festival, null);
  run(s, 55); assert.equal(cautious.amount, 12); assert.equal(cautious.cocoaSpend, undefined);
  const t = ready(); t.stock[1] = 10; const drink = guest(t, 0, 12); assert.ok(drink.festival);
  run(t, 55); assert.equal(drink.cocoaSpend, 4); assert.equal(drink.amount, 0); assert.equal(drink.budget, 8);
});
test("new festival visitors bring an explicit finite cocoa allowance", () => {
  const s = ready(); s.stock[0] = 10; s.visitorTimer = .1; M.update(s, .1); s.visitorTimer = 1e6;
  const v = s.visitors[0]; assert.equal(v.originalBudget, 22); assert.equal(v.cocoaAllowance, 4);
  run(s, 55); assert.equal(v.cocoaSpend, 4); assert.equal(v.amount, 12); assert.ok(v.cocoaSpend + v.amount <= v.originalBudget);
});

test("the bounded queue serves FIFO and full queues keep other guests on the normal path", () => {
  const s = ready(); s.stock[0] = 20;
  const visitors = Array.from({ length: 5 }, (_, i) => guest(s, i, 100));
  assert.ok(visitors.slice(0, 4).every((v) => v.festival)); assert.equal(visitors[4].festival, null);
  const paid = [];
  for (let i = 0; i < 900; i++) {
    const events = M.update(s, .1); paid.push(...events.filter((e) => e.route === "festival-cocoa"));
    assert.ok(s.visitors.filter((v) => v.festival?.phase === "serving").length <= 1);
  }
  assert.deepEqual(paid.map((e) => e.visitor), [0, 1, 2, 3]);
  assert.equal(s.festival.cocoa.stock, 6); assert.equal(s.festival.cocoa.gross, 16);
});

test("closing or selling out sends queued guests on without charging or reserving stock", () => {
  const s = ready(), v = guest(s, 2); run(s, 8);
  M.setCocoaOpen(s, false); const events = run(s, 50);
  assert.equal(v.cocoaSpend, undefined); assert.equal(s.festival.cocoa.stock, 10);
  assert.ok(v.festival.done); assert.equal(events.filter((e) => e.route === "festival-cocoa").length, 0);
  s.festival.cocoa.open = true; s.festival.cocoa.stock = 0;
  assert.equal(guest(s, 6).festival, null); assert.equal(s.holds.length, 0);
});

test("large and small visitor time slices charge a drink exactly once", () => {
  const a = ready(), b = ready(), va = guest(a, 0), vb = guest(b, 0), ae = [], be = [];
  tickFestivalVisit(a, va, 40, ae);
  for (let i = 0; i < 400; i++) tickFestivalVisit(b, vb, .1, be);
  assert.equal(a.festival.cocoa.sold, 1); assert.equal(b.festival.cocoa.sold, 1);
  assert.equal(va.budget, vb.budget); assert.equal(a.coins, b.coins);
  assert.equal(ae.length, 1); assert.equal(be.length, 1);
});

test("the courier pays for supplies, maintains a reserve, and pauses cleanly", () => {
  const s = ready(); s.festival.cocoa.level = 2; s.coins = 1200;
  assert.ok(M.hireCocoaCourier(s)); assert.equal(s.coins, 0);
  s.festival.cocoa.stock = 4; s.coins = 119; M.updateFestival(s); assert.equal(s.festival.cocoa.stock, 4);
  s.coins = 120; M.updateFestival(s); assert.equal(s.festival.cocoa.stock, 14); assert.equal(s.coins, 100);
  M.updateFestival(s); assert.equal(s.coins, 100); assert.equal(s.festival.cocoa.supplies, 20);
  s.paused = true; s.coins = 1000; s.festival.cocoa.stock = 0; M.updateFestival(s); assert.equal(s.festival.cocoa.stock, 0);
});

test("malformed saves cannot create stock or a stand on unowned land", () => {
  const raw = M.freshState(); raw.festival = { meadow: false, cocoa: { level: 3, stock: 1000, courier: true } };
  const loaded = M.restoreState(raw); assert.equal(loaded.festival.cocoa.level, 0); assert.equal(loaded.festival.cocoa.stock, 0);
  raw.festival = { meadow: true, cocoa: { level: 9, stock: 1e9, price: -5, gross: Infinity } };
  const c = M.restoreState(raw).festival.cocoa;
  assert.equal(c.level, 3); assert.equal(c.stock, 100); assert.equal(c.price, 3); assert.equal(c.gross, 0);
});
