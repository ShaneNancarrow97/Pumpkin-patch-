// Exercises the model/selling/save boundary, rather than duplicating pure ride rules.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

function prepared() {
  const s = M.freshState();
  Object.assign(s, { coins: 100000, earned: 2e6, introSeen: true });                 // the top level, with every level claimed
  s.progression.claimed = M.LEVELS.map((l) => l.level);
  s.progression.pending = [];
  Object.assign(s.hollowHouse, { purchased: true, status: "ready", open: false });
  s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  return s;
}
function opened() {
  const s = prepared();
  assert.ok(M.buyHayride(s)); assert.ok(M.setHayrideOpen(s, true));
  s.arriving = []; s.hayride.guestTimer = 1e6;                                    // no parties of its own unless a test asks
  return s;
}
function guest(s, id = 700, options = {}) {
  const v = { id, kind: id % 5, profile: 0, age: 0, budget: 100, originalBudget: 100, basketLimit: 1,
    preferred: [0], basket: [], amount: 0, quantity: 0, bought: null, outcome: "shopping", leaveAt: null,
    mug: 0, party: id, place: 0, size: 1, spot: id % 8, needs: M.freshGuestNeeds(id), festival: { done: true },
    hollowConsidered: true, hollow: null, hayrideConsidered: true, ...options };
  v.hayride = M.planHayrideVisit(s, v, "arrival", { force: true, approachSeconds: .1, returnSeconds: .1 });
  assert.ok(v.hayride, "the complete visitor receives a real visit plan");
  s.visitors.push(v); s.nextVisitor = Math.max(s.nextVisitor, id + 1);
  return v;
}
function advance(s, seconds) { for (let t = 0; t < seconds - 1e-8; t += .1) M.update(s, Math.min(.1, seconds - t)); }

test("legacy saves gain a locked hayride while retaining Claude's stock, market and intro fields", () => {
  const s = prepared();
  s.stock = [11, 7, 3, 1]; s.fresh = [[[s.time, 2]], [], [], []];
  s.plotLevels[0] = 2; s.wanted = { variety: 2, until: s.time + 200, serial: 9 };
  const raw = JSON.parse(JSON.stringify(M.saveData(s)));
  raw.version = 10; delete raw.hayride; delete raw.hayrideVisitors;
  const restored = M.restoreState(raw);
  assert.equal(restored.version, M.STATE_VERSION); assert.ok(restored.version >= 11);
  assert.equal(restored.hayride.purchased, false); assert.equal(restored.hayride.open, false);
  assert.deepEqual(restored.stock, [...s.stock, ...Array(Math.max(0, M.VARIETIES.length-s.stock.length)).fill(0)]); assert.deepEqual(restored.fresh, [...s.fresh, ...Array.from({length: Math.max(0,M.VARIETIES.length-s.fresh.length)},()=>[])]);
  assert.deepEqual(restored.wanted, s.wanted); assert.deepEqual(restored.orders, s.orders);
  assert.equal(restored.introSeen, true); assert.equal(restored.coins, s.coins);
  assert.deepEqual(restored.progression.claimed, s.progression.claimed);
});

test("model updates suspend shopping during the queue, charge once on boarding and keep tips separate", () => {
  const s = opened(), visitors = [700, 701, 702, 703].map(id => guest(s, id));
  const before = { coins: s.coins, earned: s.earned, sold: s.sold, tips: { ...s.customerCare.tips } };
  advance(s, 1);
  assert.equal(s.hayride.ticketsSold, 0); assert.equal(s.hayride.income, 0);
  assert.ok(visitors.every(v => v.age === 0), "queueing does not progress the stall visit");
  advance(s, 10);
  assert.equal(s.hayride.ticketsSold, 4); assert.equal(s.hayride.income, 32);
  assert.equal(s.hayride.convoy.manifest.length, 4);
  assert.equal(s.coins - before.coins, 32); assert.equal(s.earned - before.earned, 32);
  assert.equal(s.sold, before.sold); assert.deepEqual(s.customerCare.tips, before.tips);
  for (const v of visitors) { assert.equal(v.budget, 92); assert.equal(M.boardHayrideGuest(s, v), 0); }
  assert.equal(s.hayride.receipts.length, 4);
});

test("paid riders survive the full save boundary and finish offscreen without a second ticket", () => {
  const s = opened(); [710, 711, 712, 713].forEach(id => guest(s, id)); advance(s, 24);
  assert.equal(s.hayride.convoy.phase, "circuit");
  const money = { income: s.hayride.income, sold: s.hayride.ticketsSold, coins: s.coins };
  const raw = JSON.parse(JSON.stringify(M.saveData(s)));
  assert.equal(raw.visitors.length, 0); assert.equal(raw.hayrideVisitors.length, 4);
  const restored = M.restoreState(raw);
  assert.equal(restored.visitors.length, 4);
  assert.equal(new Set(restored.visitors.map(v => v.id)).size, 4);
  assert.equal(restored.hayride.convoy.manifest.length, 4);
  assert.ok(restored.visitors.every(v => v.hayride.charged && v.budget === 92));
  restored.visitorTimer = restored.shop.arrivalTimer = restored.bigSpender.timer = 1e6;
  assert.ok(M.setHayrideOpen(restored, false)); advance(restored, 150);
  assert.equal(restored.hayride.completed, 4);
  assert.equal(restored.hayride.ticketsSold, money.sold); assert.equal(restored.hayride.income, money.income);
  assert.equal(restored.hayride.convoy.manifest.length, 0);
  assert.equal(restored.coins, money.coins, "no stock means no unrelated retail takings");
});

test("a rider returns to the stall with the same purse and can buy a real pumpkin", () => {
  const s = opened(), v = guest(s, 720, { budget: 40, originalBudget: 40 });
  s.stock = [100, 0, 0, 0]; advance(s, 150);
  assert.equal(s.hayride.ticketsSold, 1); assert.equal(s.hayride.completed, 1);
  const receipt = s.stall.receipts.find(r => r.visitor === v.id);
  assert.ok(receipt, "the visitor shopped after returning from the circuit");
  assert.equal(receipt.quantity, 1);
  assert.equal(v.budget, 40 - 8 - receipt.amount - (receipt.tip || 0) - (receipt.mug || 0));
  assert.equal(s.stock[0], 99); assert.equal(s.hayride.receipts[0].visitor, receipt.visitor);
});

test("riders leave their place on the farm free while they're out, so the stall keeps its visitors coming", () => {
  const s = opened(); s.visitorUpgrades.party = 0; [730, 731, 732, 733].forEach(id => guest(s, id)); advance(s, 12);
  const cap = M.visitorCapacity(s);
  for (let i = s.visitors.length; i < cap; i++) s.visitors.push({ id: 800 + i, kind: 0, profile: 0, age: 0,
    budget: 40, originalBudget: 40, basketLimit: 1, preferred: [0], basket: [], bought: null,
    outcome: "shopping", leaveAt: null, spot: i % 8, needs: M.freshGuestNeeds(800 + i),
    festival: { done: true }, hollowConsidered: true, hayrideConsidered: true, mazeAfterConsidered: true, hayrideAfterConsidered: true });
  assert.equal(M.visitorReservations(s), cap - 4, "the four riders take no place while they're away");
  const before = s.visitors.length; s.visitorTimer = 0; M.update(s, .1);
  assert.equal(s.visitors.length + s.arriving.length, before + 1, "a new neighbour sets off for the stall");
  assert.equal(s.hayride.convoy.manifest.length, 4);
});

test("opening sends real guests through the ordinary selling pipeline without inventing another purse", () => {
  const s = prepared(); assert.ok(M.buyHayride(s)); assert.ok(M.setHayrideOpen(s, true));
  assert.ok(s.arriving.some(a => a.forHayride), "first opening invites a small party");
  advance(s, 24);
  assert.ok(s.hayride.ticketsSold > 0, "the invited visitors really board and pay");
  for (const receipt of s.hayride.receipts) {
    const v = s.visitors.find(v => v.id === receipt.visitor);
    assert.ok(v?.forHayride); assert.equal(v.budget, v.originalBudget - receipt.amount);
  }
});

test("the hayride brings its own parties while its queue has room, and they shop after their ride", () => {
  const s = opened(); s.stock = [500, 0, 0, 0]; s.hayride.guestTimer = 0;
  const farmPlaces = M.visitorReservations(s);
  M.update(s, .1);
  const invited = s.arriving.filter((a) => a.forHayride);
  assert.ok(invited.length >= 2 && invited.every((a) => a.bonus), "a party of the ride's own guests sets off");
  assert.equal(M.visitorReservations(s), farmPlaces, "they never take a place on the farm");
  for (let i = 0; i < 3000; i++) {
    M.update(s, .1);
    const o = M.hayrideOccupancy(s), coming = s.arriving.filter((a) => a.forHayride).length;
    assert.ok(o.queue + o.approach + coming <= M.hayrideConfig(s).queueCapacity, "never more than the queue can hold");
  }
  assert.ok(s.hayride.ticketsSold >= 4, "the ride sells its own tickets");
  const riders = new Set(s.hayride.receipts.map((r) => r.visitor));
  assert.ok(s.stall.receipts.some((r) => riders.has(r.visitor)), "riders go on to buy pumpkins at the stall");
});

test("a rider who came for the ride goes on to the stall even after a fright", () => {
  const s = opened(), v = guest(s, 740, { budget: 60, originalBudget: 60 });
  s.stock = [100, 0, 0, 0]; v.hayride.bravery = 0; s.hayride.tier = 3; s.hayride.haunts = { owned: M.HAYRIDE_SCARES.map((p) => p.id), active: M.HAYRIDE_SCARES.map((p) => p.id) };
  advance(s, 160);
  assert.equal(v.hayride.fleeing, true, "the ride frightened them");
  assert.ok(!v.hayride.wentHome, "they don't run straight home");
  assert.ok(s.stall.receipts.some((r) => r.visitor === v.id), "they buy a pumpkin on the way out");
});
