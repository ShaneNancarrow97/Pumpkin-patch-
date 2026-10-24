// Neighbours' orders (rules/orders.js).
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { VISITOR_ROSTER } from "../src/content/visitors.js";

// A farm at the level orders start, with Moonlight to grow and no guests to buy the stock.
function farm() {
  const s = M.freshState(); s.plotLevels[0] = 1;
  s.earned = M.LEVELS.find((l) => l.level === M.ORDERS.from).at; s.progression.claimed = Array.from({ length: M.ORDERS.from }, (_, i) => i + 1);
  s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  return s;
}
const nextOrder = (s) => { for (let i = 0; i < 4000; i++) { const e = M.update(s, 0.5).find((x) => x.type === "order"); if (e) return e.order; } return null; };

test("no orders before the patch level they start at; then one at a time, every few minutes", () => {
  const early = M.freshState(); early.visitorTimer = 1e6;
  for (let i = 0; i < 600; i++) assert.ok(!M.update(early, 1).some((e) => e.type === "order"));
  const s = farm(), first = nextOrder(s);
  assert.ok(first, "an order comes"); assert.ok(s.time <= M.ORDERS.first + 1, "soon after reaching the level");
  assert.ok(first.variety <= 1, "only what the plots can grow"); assert.ok(first.count >= 2);
  assert.equal(first.pay, Math.round(first.count * M.VARIETIES[first.variety].price * M.ORDER_TRUST[0].pay));
  assert.equal(M.orderFrom(first), VISITOR_ROSTER[first.kind].name);
  M.update(s, M.ORDERS.gap + 1); assert.equal(s.orders.list.length, M.ORDERS.open, "never more than open at once");
});

test("sending an order takes the barn's oldest pumpkins first and pays the neighbour's price", () => {
  const s = farm(), o = nextOrder(s);
  assert.equal(M.fillOrder(s, o.id), 0, "not without the pumpkins"); assert.equal(s.orders.list.length, 1);
  s.stock[o.variety] = o.count + 1; M.addStock(s, o.variety, 2, true); s.stock[o.variety] = o.count + 1;
  const coins = s.coins, sold = s.sold;
  assert.equal(M.fillOrder(s, o.id), o.pay);
  assert.equal(s.coins, coins + o.pay); assert.equal(s.sold, sold + o.count); assert.equal(s.stock[o.variety], 1);
  assert.equal(M.freshCount(s, o.variety), 1, "the oldest went, so one fresh one is left");
  assert.equal(s.orders.list.length, 0); assert.equal(s.orders.filled, 1); assert.equal(s.orders.income, o.pay);
  assert.equal(M.fillOrder(s, o.id), 0, "only once");
});

test("pumpkins already in a shopper's basket can't go to an order", () => {
  const s = farm(), o = nextOrder(s); s.stock[o.variety] = o.count;
  s.holds.push({ owner: "visitor-1", lines: [{ variety: o.variety, quantity: 1, price: 12, fresh: false }] });
  assert.equal(M.canFillOrder(s, o), false); assert.equal(M.fillOrder(s, o.id), 0);
});

test("neighbours you fill orders for ask for more and pay better; let one lapse and they trust you less", () => {
  const s = farm(), o = nextOrder(s);
  s.stock[o.variety] = 1e4; M.fillOrder(s, o.id);
  assert.equal(M.orderTrust(s, o.kind).name, "Neighbour");
  s.orders.trust[o.kind] = 10; assert.equal(M.orderTrust(s, o.kind).pay, 1.5);
  const sizes = M.ORDER_TRUST.map((t) => t.size), pays = M.ORDER_TRUST.map((t) => t.pay);
  for (let i = 1; i < sizes.length; i++) { assert.ok(sizes[i] > sizes[i - 1]); assert.ok(pays[i] > pays[i - 1]); }
  const late = nextOrder(s); s.stock[late.variety] = 0; const was = s.orders.trust[late.kind] ?? 0;
  const events = []; for (let i = 0; i < M.ORDERS.time + 2; i++) events.push(...M.update(s, 1));
  assert.ok(events.some((e) => e.type === "order-missed" && e.order.id === late.id));
  assert.equal(s.orders.trust[late.kind], Math.max(0, was - 2)); assert.equal(s.orders.missed, 1);
});

test("open orders and trust survive a reload; nonsense does not", () => {
  const s = farm(), o = nextOrder(s); s.orders.trust = { 3: 4 };
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(back.orders.list, [o]); assert.deepEqual(back.orders.trust, { 3: 4 }); assert.equal(back.orders.serial, s.orders.serial);
  const raw = JSON.parse(JSON.stringify(M.saveData(s)));
  raw.orders.list = [{ ...o, pay: 1e9 }, { ...o, id: 99, kind: 42 }, { ...o, id: 98, until: 1 }, "junk"];
  raw.orders.trust = { 3: -1, banana: 5, 4: 2 };
  const odd = M.restoreState(raw).orders;
  assert.equal(odd.list.length, 1); assert.ok(odd.list[0].pay <= o.count * M.VARIETIES[o.variety].price * 2, "no silly prices");
  assert.deepEqual(odd.trust, { 3: 0, 4: 2 });
  delete raw.orders; assert.deepEqual(M.restoreState(raw).orders, M.freshOrders());
});
