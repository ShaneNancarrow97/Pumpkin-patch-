import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { advanceBigSpender, bigSpenderBasket, freshBigSpender, restoreBigSpender } from "../src/rules/big-spender.js";
import { NORMAL_VISITOR_KINDS, VISITOR_KINDS, visitorIdentity } from "../src/content/visitors.js";

const ready = () => { const s = M.freshState(); s.bigSpender = freshBigSpender(); s.visitorTimer = 1e6; return s; };
const run = (s, seconds) => { const events = []; for (let i = 0; i < seconds * 10; i++) { s.time += .1; M.updateStall(s, .1, events); } return events; };

test("the Baron is a stable rare identity, excluded from normal visitor rotations", () => {
  assert.equal(VISITOR_KINDS[10], "baron"); assert.equal(visitorIdentity(10).name, "Baron Brassbolt");
  assert.equal(NORMAL_VISITOR_KINDS.length, 10); assert.ok(!NORMAL_VISITOR_KINDS.includes("baron"));
  const s = ready(); s.bigSpender.timer = 1e6;
  for (let id = 0; id < 40; id++) { s.visitors = []; s.nextVisitor = id; s.visitorTimer = 0; M.updateStall(s, .01, []); assert.equal(s.visitors[0].kind, id % 10); assert.ok(!s.visitors[0].vip); }
});

test("a periodic Baron respects pause, path capacity and one active visit", () => {
  const s = ready(); assert.equal(advanceBigSpender(s, 109, true), false); assert.equal(s.bigSpender.timer, 1);
  s.paused = true; assert.equal(advanceBigSpender(s, 20, true), false); assert.equal(s.bigSpender.timer, 1); s.paused = false;
  assert.equal(advanceBigSpender(s, 1, false), false); assert.equal(s.bigSpender.timer, 0); assert.equal(s.bigSpender.seen, 0);
  assert.equal(advanceBigSpender(s, .1, true), true); assert.equal(s.bigSpender.seen, 1); assert.equal(s.bigSpender.timer, 165);
  s.visitors.push({ kind: 10, vip: true }); assert.equal(advanceBigSpender(s, 200, true), false); assert.equal(s.bigSpender.timer, 0);
  s.visitors = []; assert.equal(advanceBigSpender(s, .1, true), true); assert.equal(s.bigSpender.timer, 180);
  for (const dt of [NaN, Infinity, -1, 0]) { const before = s.bigSpender.timer; assert.equal(advanceBigSpender(s, dt, true), false); assert.equal(s.bigSpender.timer, before); }
});

test("VIP basket scales within limits, and real sales reconcile stock, purse and separate tips", () => {
  const s = ready(), basic = bigSpenderBasket(s); assert.equal(basic.basketLimit, 8); assert.ok(basic.budget >= 350);
  s.earned = 110000; s.upgrades.storage = 6; s.customerCare.bags = 3; s.plotLevels.fill(3);
  const grown = bigSpenderBasket(s); assert.equal(grown.basketLimit, 20); assert.equal(grown.budget, 800);
  s.earned = 0; s.customerCare.tipJar = 3; s.stock = [0, 0, 0, 100]; s.bigSpender.timer = 0;
  const before = s.coins, events = run(s, 15), arrival = events.find(e => e.type === "vip-arrived"), receipt = s.stall.receipts[0];
  assert.ok(arrival); assert.equal(events.filter(e => e.type === "vip-arrived").length, 1); assert.equal(receipt.visitor, arrival.visitor);
  assert.equal(receipt.amount, receipt.quantity * 70); assert.equal(s.stock[3], 100 - receipt.quantity);
  assert.equal(s.bigSpender.spent, receipt.amount); assert.equal(s.bigSpender.pumpkins, receipt.quantity);
  assert.equal(s.coins - before, receipt.amount + receipt.tip); assert.equal(M.totalTips(s), receipt.tip);
  assert.ok(receipt.quantity > 2 && receipt.quantity <= 20); assert.ok(receipt.amount + receipt.tip <= grown.budget);
  assert.equal(s.bigSpender.seen, 1); assert.equal(s.holds.length, 0);
});

test("legacy hospitality debits spare cash, and a physical Sandy stand fully replaces it", () => {
  for (const physical of [false, true]) {
    const s = ready(); s.stock[0] = 10; s.visitorUpgrades.cocoa = 3; s.nextVisitor = 4; s.visitorTimer = 0;
    if (physical) { s.festival.meadow = true; s.festival.cocoa.level = 1; s.festival.cocoa.stock = 0; s.festival.cocoa.open = false; }
    M.updateStall(s, .1, []); const v = s.visitors[0], budget = v.budget; run(s, 8);
    assert.equal(v.amount, 12); assert.equal(v.mug, physical ? 0 : 7); assert.equal(v.budget, budget - v.amount - v.mug);
    assert.equal(s.stall.cocoa, v.mug); assert.ok(v.budget >= 0);
  }
});

test("frightened guests leave without an extra pumpkin purchase", () => {
  const s = ready(); s.stock[0] = 10; s.visitorTimer = 0; M.updateStall(s, .1, []);
  const v = s.visitors[0]; v.age = 8; v.hollowConsidered = true; v.hollow = { done: true, fledHome: true, terror: 90, fleeing: true };
  const cash = s.coins; M.updateStall(s, .1, []); assert.equal(s.visitors.length, 0); assert.equal(s.stock[0], 10); assert.equal(s.coins, cash);
  assert.equal(M.guestHeading(v), "Running home after a fright");
});

test("scare footfall boosts arrivals only when open and retains the existing frequency floor", () => {
  const s = ready(); Object.assign(s.hollowHouse, { purchased: true, status: "ready", tier: 5, open: true });
  s.hollowHouse.haunts = { owned: M.MAZE_PREFABS.map(p => p.id), active: M.MAZE_PREFABS.map(p => p.id) };
  assert.equal(M.mazeFootfallBonus(s), .5); assert.equal(M.stallPace(s), 1.5); assert.equal(M.streakPathBoost(s), 0);
  s.streak.visitorBoost = 1.5; s.streak.visitorBoostUntil = s.time + 100; assert.equal(M.stallPace(s), 3); assert.equal(M.streakPathBoost(s), 1.5);
  s.upgrades.sign = 5; s.visitorUpgrades.lights = 4; assert.ok(M.stallGapSeconds(s) >= 2.5);
  s.hollowHouse.open = false; assert.equal(M.mazeFootfallBonus(s), 0); s.hollowHouse.open = true; s.hollowHouse.status = "restoring"; assert.equal(M.mazeFootfallBonus(s), 0);
});

test("the rare visitor schedule and ledgers restore safely without inventing purchases", () => {
  assert.deepEqual(restoreBigSpender(null), freshBigSpender());
  assert.deepEqual(restoreBigSpender({ timer: Infinity, seen: -1, spent: NaN, pumpkins: 2.9 }), { timer: 110, seen: 0, spent: 0, pumpkins: 2 });
  assert.deepEqual(restoreBigSpender({ timer: -4, seen: 9, spent: 700, pumpkins: 10 }), { timer: 0, seen: 9, spent: 700, pumpkins: 10 });
  assert.equal(restoreBigSpender({ timer: 999 }).timer, 180);
  const s = ready(); s.bigSpender = { timer: 32, seen: 3, spent: 650, pumpkins: 13 };
  assert.deepEqual(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).bigSpender, s.bigSpender);
});

test("maze and cocoa excursions reserve room for their return, even during the fastest streak", () => {
  const s = ready(); s.stock = [10000, 10000, 10000, 10000]; s.earned = 110000;
  Object.assign(s.upgrades, { sign: 5, plots: 4 }); Object.assign(s.visitorUpgrades, { party: 3, lights: 4, crowd: 4 });
  Object.assign(s.hollowHouse, { purchased: true, status: "ready", tier: 5, open: true });
  s.hollowHouse.haunts = { owned: M.MAZE_PREFABS.map(p => p.id), active: M.MAZE_PREFABS.map(p => p.id) };
  s.streak.visitorBoost = 1.5; s.streak.visitorBoostUntil = 1e6; s.visitorTimer = 0;
  let peak = 0;
  for (let i = 0; i < 9000; i++) { s.time += .1; M.updateStall(s, .1, []); peak = Math.max(peak, M.visitorReservations(s)); assert.ok(M.onThePath(s) <= M.visitorCapacity(s)); assert.ok(M.visitorReservations(s) <= M.visitorCapacity(s)); assert.ok(s.visitors.filter(v => v.vip).length <= 1); }
  assert.equal(peak, M.visitorCapacity(s)); assert.ok(s.hollowHouse.completed > 0);
  const t = ready(); t.visitors = Array.from({ length: M.visitorCapacity(t) }, (_, id) => ({ id, festival: { done: false } }));
  assert.equal(M.onThePath(t), 0); assert.equal(M.visitorReservations(t), M.visitorCapacity(t));
});
