// Late-game economy fixtures represent a household completed before home milestones.
import test from "node:test";
import assert from "node:assert/strict";
import * as V from "../src/rules/visitor-events.js";
import { VISITOR_EVENT_BY_ID } from "../src/content/visitor-events.js";
import * as M from "../src/model.js";
import * as S from "../src/rules/selling.js";

const state = () => ({ coins: 50000, earned: 110000, progression: { bonusEarned: 0 }, paused: false, time: 0, nextParty: 0, kitchen: { purchased: true }, visitorUpgrades: { appetite: 0 }, visitors: [], arriving: [], visitorEvents: V.freshVisitorEvents() });
const tick = (s, seconds) => { const out = []; s.time += s.paused ? 0 : seconds; V.updateVisitorEvents(s, seconds, out); return out; };
const entered = (s, a) => { assert.equal(V.finishVisitorEventArrival(s, a), true); };

test("rush and court invitations cost once and obey their current level gates", () => {
  const s = state(); s.earned = 4500; const money = s.coins;
  assert.equal(V.buyVisitorEventUpgrade(s, "rush"), false); assert.equal(V.buyVisitorEventUpgrade(s, "vip"), false);
  s.earned = 8500; assert.equal(V.buyVisitorEventUpgrade(s, "rush"), true); assert.equal(s.coins, money - 1600);
  assert.equal(V.buyVisitorEventUpgrade(s, "rush"), false); assert.equal(V.visitorEventUpgradeCost(s, "rush"), undefined);
  s.earned = 42000; assert.equal(V.buyVisitorEventUpgrade(s, "vip"), true); assert.equal(s.coins, money - 7600);
  assert.equal(V.buyVisitorEventUpgrade(s, "constructor"), false); s.paused = true; assert.equal(V.setVisitorEventEnabled(s, "rush", false), false);
});

test("rush is a 300-second game-time occasion, and pause and disabled settings preserve its meter", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, 123); assert.equal(s.visitorEvents.rush.remaining, 177);
  s.paused = true; tick(s, 1000); assert.equal(s.visitorEvents.rush.remaining, 177);
  s.paused = false; V.setVisitorEventEnabled(s, "rush", false); tick(s, 1000); assert.equal(s.visitorEvents.rush.remaining, 177);
  V.setVisitorEventEnabled(s, "rush", true); const events = tick(s, 177);
  assert.equal(events.length, 1); assert.equal(events[0].event, "rush"); assert.ok(events[0].count >= 10 && events[0].count <= 20);
  const before = structuredClone(s.visitorEvents); tick(s, 1000000); assert.deepEqual(s.visitorEvents.rush.pending, before.rush.pending, "a blocked event cannot multiply its pending crowd"); assert.equal(s.visitorEvents.rush.event, 1); assert.equal(s.visitorEvents.seed, before.seed); assert.equal(s.visitorEvents.rush.remaining, 0);
});

test("a chosen rush survives saving and requeues only guests who had not actually entered", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, 300); const total = s.visitorEvents.rush.pending.count;
  const first = V.queueVisitorEventArrivals(s, 5); assert.equal(first.length, 5); assert.equal(first[4].wait, .4);
  assert.equal(V.queueVisitorEventArrivals(s, 0).length, 0); entered(s, first[0]); entered(s, first[1]);
  const raw = structuredClone(s.visitorEvents), seed = raw.seed;
  s.visitorEvents = V.restoreVisitorEvents(raw, s);
  assert.equal(s.visitorEvents.seed, seed); assert.equal(s.visitorEvents.rush.pending.count, total);
  const remaining = V.queueVisitorEventArrivals(s, 70); assert.equal(remaining.length, total - 2);
  assert.ok(remaining.every(a => a.place >= 2)); assert.equal(V.queueVisitorEventArrivals(s, 70).length, 0, "queued membership is reserved once");
  for (const a of remaining) entered(s, a);
  assert.equal(s.visitorEvents.rush.pending, null); assert.equal(s.visitorEvents.ledger.rushGuests, total); assert.equal(s.visitorEvents.rush.remaining, 300);
});

test("limited entrance spaces stage all 10–20 guests without losing or duplicating a member", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, 300); const size = s.visitorEvents.rush.pending.count, places = [];
  for (let n = 0; n < 20 && s.visitorEvents.rush.pending; n++) {
    const group = V.queueVisitorEventArrivals(s, 2); assert.ok(group.length <= 2);
    for (const a of group) { places.push(a.place); entered(s, a); assert.equal(V.finishVisitorEventArrival(s, a), false); }
  }
  assert.equal(places.length, size); assert.equal(new Set(places).size, size); assert.equal(s.visitorEvents.ledger.rushGroups, 1);
});

test("the court has stable varied appearances and finite purses and baskets after a reload", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "vip"); tick(s, 240);
  const p = s.visitorEvents.vip.pending; assert.ok(p.count >= 3 && p.count <= 5);
  for (const o of p.offers) { assert.ok(o.kind >= 11 && o.kind <= 14); assert.ok(o.budget >= 140 && o.budget <= 250); assert.ok(o.basketLimit >= 10 && o.basketLimit <= 14); }
  assert.ok(new Set(p.offers.map(o => o.kind)).size >= 3);
  const before = structuredClone(p.offers), raw = structuredClone(s.visitorEvents);
  s.visitorEvents = V.restoreVisitorEvents(raw, s); assert.deepEqual(s.visitorEvents.vip.pending.offers, before);
  const arrivals = V.queueVisitorEventArrivals(s, 10); assert.equal(arrivals.length, p.count);
  for (const a of arrivals) { assert.equal(a.courtier, true); assert.deepEqual(a.offer, before[a.place]); entered(s, a); }
  assert.equal(s.visitorEvents.vip.remaining, 240);
});

test("the saved seed chooses the same next group regardless of frame slicing or inspection", () => {
  const a = state(), b = state(); V.buyVisitorEventUpgrade(a, "rush"); V.buyVisitorEventUpgrade(b, "rush");
  tick(a, 300); for (let i = 0; i < 300; i++) { V.visitorEventUpgradeCost(b, "rush"); tick(b, 1); }
  assert.deepEqual(a.visitorEvents, b.visitorEvents); const original = JSON.stringify(a.visitorEvents);
  V.updateVisitorEvents(a, NaN); V.updateVisitorEvents(a, Infinity); V.updateVisitorEvents(a, -1); assert.equal(JSON.stringify(a.visitorEvents), original);
});

test("staged entry and reloads do not restart the five-minute cadence", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, 300);
  const entries = V.queueVisitorEventArrivals(s, 70); tick(s, 2); entries.forEach(a => entered(s, a));
  assert.equal(s.visitorEvents.rush.remaining, 298);
  tick(s, 297); s.visitorEvents = V.restoreVisitorEvents(structuredClone(s.visitorEvents), s);
  assert.equal(s.visitorEvents.rush.remaining, 1); tick(s, 1);
  assert.equal(s.visitorEvents.rush.event, 2); assert.equal(s.visitorEvents.ledger.rushGroups, 2);
});

test("restoring malformed event data cannot create oversized groups, arbitrary visitors or infinite counters", () => {
  const s = state(), raw = { seed: 0, rush: { level: Infinity, remaining: NaN, pending: { serial: 1, count: 999 } }, vip: { level: 1, remaining: -5, event: 1, pending: { serial: 1, count: 3, delivered: [], party: 7, offers: [{ kind: 11, budget: Infinity, basketLimit: 10 }, { kind: 12, budget: 180, basketLimit: 12 }, { kind: 13, budget: 200, basketLimit: 14 }] } }, ledger: { rushGroups: -4, vipGuests: Infinity } };
  const loaded = V.restoreVisitorEvents(raw, s); assert.equal(loaded.rush.level, 0); assert.equal(loaded.rush.pending, null); assert.equal(loaded.vip.pending, null);
  assert.equal(loaded.vip.remaining, 0); assert.equal(loaded.ledger.rushGroups, 0); assert.equal(loaded.ledger.vipGuests, 0);
  assert.ok(loaded.seed > 0);
});

test("meal allowances are a once-on-arrival purse contribution, and pumpkin selection only reserves that real money", () => {
  const s = state(); assert.equal(V.foodMealAllowance(s, 0), 12); s.visitorUpgrades.appetite = 6; assert.equal(V.foodMealAllowance(s, 0), 24);
  assert.equal(Array.from({ length: 1000 }, (_, i) => V.starvingGuest(s, i)).filter(Boolean).length, 25);
  const id = 33; assert.equal(V.foodMealAllowance(s, id), 50);
  const g = { id, budget: 90, mealPurse: 50, wish: { purse: 24, variety: 1 } }; const before = JSON.stringify(g);
  assert.equal(V.pumpkinShoppingProfile(s, g).budget, 40); assert.equal(JSON.stringify(g), before);
  g.food = { status: "paid" }; assert.equal(V.mealPurseReserve(s, g), 0); assert.equal(V.pumpkinShoppingProfile(s, g).budget, 90);
  s.kitchen.purchased = false; assert.equal(V.foodMealAllowance(s, id), 0); assert.equal(V.starvingGuest(s, id), false);
});

test("turning off an occasion does not delete a group which was already invited", () => {
  const s = state(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, VISITOR_EVENT_BY_ID.rush.seconds);
  const count = s.visitorEvents.rush.pending.count; assert.equal(V.setVisitorEventEnabled(s, "rush", false), true);
  const arrivals = V.queueVisitorEventArrivals(s, 70); assert.equal(arrivals.length, count); arrivals.forEach(a => entered(s, a));
  tick(s, 5000); assert.equal(s.visitorEvents.rush.pending, null); assert.equal(s.visitorEvents.rush.remaining, 300);
});

const farm = () => {
  const s = M.freshState(); s.progression.homeLegacyThrough = 12; s.coins = 50000; s.earned = 110000;
  s.visitorEvents = V.freshVisitorEvents(); s.bigSpender.timer = 1e6;
  s.visitorTimer = 1e6; s.shop.arrivalTimer = 1e6;
  return s;
};
test("the two new party tiers each add two places and keep old tiers valid on reload", () => {
  const s = farm(); s.visitorUpgrades.party = 3; assert.equal(S.partyMax(s), 4);
  assert.equal(S.buyVisitorUpgrade(s, "party"), true); assert.equal(S.partyMax(s), 6);
  assert.equal(S.buyVisitorUpgrade(s, "party"), true); assert.equal(S.partyMax(s), 8); assert.equal(S.buyVisitorUpgrade(s, "party"), false);
  assert.deepEqual(Array.from({ length: 8 }, (_, n) => S.partySize(s, n)).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(M.restoreState(M.saveData(s)).visitorUpgrades.party, 5);
});

test("one rush enters within two seconds while preserving its complete invited count", () => {
  const s = farm(); V.buyVisitorEventUpgrade(s, "rush"); tick(s, 300); const size = s.visitorEvents.rush.pending.count;
  const events = []; S.updateStall(s, 2.1, events);
  assert.equal(s.visitors.length, size); assert.equal(s.arriving.length, 0);
  assert.equal(s.visitorEvents.rush.pending, null); assert.equal(s.visitorEvents.ledger.rushGuests, size);
  assert.ok(s.visitors.every(v => v.eventType === "rush")); assert.equal(events.filter(e => e.type === "arrival").length, size);
});

test("a full farm holds a rush without losing guests and never exceeds seventy during staged entry", () => {
  const s = farm(); s.visitorUpgrades.crowd = 7;
  const guest = id => ({ id, kind: 0, age: 0, profile: 0, budget: 30, originalBudget: 30, basketLimit: 3, preferred: [0], basket: [], quantity: 0, outcome: "shopping", leaveAt: null, mug: 0, party: id, place: 0, size: 1, spot: 0 });
  s.visitors = Array.from({ length: 70 }, (_, i) => guest(i)); s.nextVisitor = 70;
  V.buyVisitorEventUpgrade(s, "rush"); tick(s, 300); const wanted = s.visitorEvents.rush.pending.count;
  S.updateStall(s, .1, []); assert.equal(s.arriving.length, 0); assert.equal(s.visitorEvents.rush.pending.delivered.length, 0);
  s.visitors.splice(0, 5); let peak = V.visitorWorldCount(s);
  for (let n = 0; n < 400 && s.visitorEvents.rush.pending; n++) {
    s.time += .1; S.updateStall(s, .1, []); peak = Math.max(peak, V.visitorWorldCount(s));
    assert.ok(V.visitorWorldCount(s) <= 70);
  }
  assert.ok(peak <= 70); assert.equal(s.visitorEvents.ledger.rushGuests, wanted); assert.equal(s.visitorEvents.rush.pending, null);
});

test("courtiers keep their quoted full purses and do not inflate the Baron's private ledger", () => {
  const s = farm(); s.kitchen.purchased = true; V.buyVisitorEventUpgrade(s, "vip"); tick(s, 240);
  const offers = structuredClone(s.visitorEvents.vip.pending.offers); S.updateStall(s, 1, []);
  const courtiers = s.visitors.filter(v => v.courtier); assert.equal(courtiers.length, offers.length);
  for (const v of courtiers) {
    assert.equal(v.originalBudget, offers[v.place].budget); assert.equal(v.kind, offers[v.place].kind); assert.equal(v.mealPurse, 40);
    assert.ok(v.budget >= 140 && v.budget <= 250); assert.equal(v.basketLimit, offers[v.place].basketLimit);
  }
  s.stock[0] = 200; const before = s.bigSpender.spent;
  for (let n = 0; n < 100; n++) { s.time += .1; S.updateStall(s, .1, []); }
  assert.ok(s.stall.income > 0); assert.equal(s.bigSpender.spent, before);
  for (const v of courtiers) assert.ok(v.budget >= 0 && v.originalBudget - v.budget >= v.amount);
});

test("normal indoor visitors bring a reserved meal contribution once and starving guests bring a larger one", () => {
  const make = (cooking, id) => {
    const s = farm(); s.kitchen.purchased = cooking; s.shop.unlocked = true; s.shop.arrivalTimer = 0; s.shop.nextCustomer = id;
    S.updateShop(s, .01, []); return { s, guest: s.shop.customers[0] };
  };
  const old = make(false, 0), normal = make(true, 0), hungry = make(true, 33);
  assert.equal(normal.guest.originalBudget - old.guest.originalBudget, 12); assert.equal(normal.guest.mealPurse, 12);
  const starting = normal.guest.budget; normal.s.stock[0] = 100;
  normal.guest.needs.hunger = 100; normal.guest.phase = "browsing"; normal.guest.remaining = 0;
  S.updateShop(normal.s, .01, []); assert.equal(normal.guest.budget, starting, "quoting never debits the real purse");
  const pumpkinAmount = normal.guest.basket.reduce((n, l) => n + l.quantity * l.price, 0);
  assert.ok(pumpkinAmount <= starting - 12);
  assert.equal(hungry.guest.starving, true); assert.equal(hungry.guest.mealPurse, 50); assert.equal(hungry.guest.needs.hunger, 100);
  assert.equal(hungry.guest.originalBudget, hungry.guest.budget);
});
