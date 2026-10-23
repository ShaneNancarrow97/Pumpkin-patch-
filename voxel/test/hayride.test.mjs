import test from "node:test";
import assert from "node:assert/strict";
import * as H from "../src/rules/hayride.js";

function prepared() { return { hayride: H.freshHayride(), hollowHouse: { purchased: true, status: "ready" }, coins: 100000, earned: 200000, progression: { bonusEarned: 0 }, visitors: [], holds: [], time: 0, nextVisitor: 0, paused: false }; }
function opened() { const s = prepared(); assert.ok(H.buyHayride(s)); assert.ok(H.setHayrideOpen(s, true)); return s; }
function guest(s, id = s.visitors.length, options = {}) {
  const v = { id, kind: id % 5, budget: 100, originalBudget: 100, basket: [], preferred: [0], basketLimit: 1, spot: id % 8, age: 0, leaveAt: null, needs: { happiness: 70 }, festival: { done: true }, ...options };
  v.hayride = H.planHayrideVisit(s, v, options.fromStall ? "after" : "arrival", { force: true, approachSeconds: .1, returnSeconds: .1 });
  assert.ok(v.hayride); s.visitors.push(v); return v;
}
function advance(s, dt) { s.time += dt; const events = []; H.updateHayride(s, dt, events); return events; }
function roundTrip(s) {
  const next = prepared(); next.coins = s.coins; next.earned = s.earned; next.time = s.time; next.hayride = H.restoreHayride(JSON.parse(JSON.stringify(s.hayride)));
  H.restoreHayrideVisitors(JSON.parse(JSON.stringify(H.saveHayrideVisitors(s))), next); return next;
}

test("the woodland purchase needs level eight and a restored first attraction", () => {
  const s = prepared(); s.earned = 14999; assert.equal(H.buyHayride(s), false); s.earned = 15000;
  s.hollowHouse.status = "restoring"; assert.equal(H.buyHayride(s), false); s.hollowHouse.status = "ready";
  const money = s.coins; assert.equal(H.buyHayride(s), true); assert.equal(s.coins, money - 7500); assert.equal(H.buyHayride(s), false);
  assert.equal(s.hayride.open, false); assert.equal(H.setHayrideTicketPrice(s, 13), false); assert.equal(H.setHayrideTicketPrice(s, 4), true);
  s.paused = true; assert.equal(H.setHayrideOpen(s, true), false);
});
test("capacity upgrades and stronger owned scares have paid progression and bounded appeal", () => {
  const s = opened(); assert.equal(H.hayrideScareRating(s), 20); const base = H.hayrideFootfallBonus(s);
  assert.ok(H.buyHayrideScare(s, "turning-scarecrows")); assert.equal(H.buyHayrideScare(s, "turning-scarecrows"), false); assert.ok(H.hayrideFootfallBonus(s) > base);
  assert.equal(H.buyHayrideScare(s, "bus-breakout"), false); s.earned = 41999; assert.equal(H.upgradeHayride(s), false); s.earned = 42000;
  assert.ok(H.upgradeHayride(s)); assert.equal(H.hayrideConfig(s).seats, 6); assert.equal(H.setHayrideTicketPrice(s, 16), true);
  s.earned = 110000; assert.ok(H.upgradeHayride(s)); for (const p of H.HAYRIDE_SCARES) if (!s.hayride.haunts.owned.includes(p.id)) assert.ok(H.buyHayrideScare(s, p.id));
  assert.equal(H.hayrideScareRating(s), 100); assert.equal(H.hayrideFootfallBonus(s), .3); assert.equal(H.upgradeHayride(s), false);
  assert.ok(H.setHayrideScareActive(s, "bus-breakout", false)); assert.ok(H.hayrideScareRating(s) < 100); H.setHayrideOpen(s, false); assert.equal(H.hayrideFootfallBonus(s), 0);
});
test("queuing is free, quotes lock, and boarding takes the shared purse exactly once", () => {
  const s = opened(), v = guest(s), before = s.coins; advance(s, .1); assert.equal(s.hayride.ticketsSold, 0); assert.equal(v.hayride.phase, "boarding");
  H.setHayrideTicketPrice(s, 12); const events = advance(s, 1.5); assert.equal(v.budget, 92); assert.equal(s.coins, before + 8); assert.equal(s.hayride.income, 8);
  assert.equal(s.hayride.convoy.manifest.length, 1); assert.equal(events.filter(e => e.route === "hayride-ticket").length, 1);
  assert.equal(H.boardHayrideGuest(s, v), 0); assert.equal(s.coins, before + 8); assert.equal(s.hayride.receipts[0].amount, 8);
});
test("wished pumpkin cash and existing basket holds cannot buy a ride", () => {
  const s = opened(), v = { id: 1, budget: 27, basket: [], wish: { variety: 1, purse: 24 } };
  assert.equal(H.hayrideSpendable(s, v), 3); assert.equal(H.planHayrideVisit(s, v, "arrival", { force: true }), null);
  v.budget = 40; s.holds = [{ owner: "visitor-1", lines: [{ variety: 1, quantity: 1, price: 24 }] }]; assert.equal(H.hayrideSpendable(s, v), 16, "a held wish overlaps its reserved purse");
  s.holds = [{ owner: "visitor-1", lines: [{ variety: 0, quantity: 1, price: 12 }] }]; assert.equal(H.hayrideSpendable(s, v), 4);
  s.holds = []; v.basket = [{ variety: 1, quantity: 1, price: 24 }]; v.budget = 16; assert.equal(H.hayrideSpendable(s, v), 16, "a fulfilled wish no longer reserves cash");
});
test("an unaffordable guest at boarding returns without a receipt or a seat", () => {
  const s = opened(), v = guest(s); advance(s, .1); v.budget = 2; advance(s, 2);
  assert.equal(s.hayride.ticketsSold, 0); assert.equal(s.hayride.convoy.manifest.length, 0); assert.equal(s.hayride.missed, 1); assert.equal(v.hayride.phase, "return");
  advance(s, 100); assert.ok(v.hayride.done);
});
test("a full wagon departs immediately while a partial wagon waits fifteen seconds", () => {
  const s = opened(); for (let i = 0; i < 4; i++) guest(s, i); advance(s, 6.1);
  assert.equal(s.hayride.convoy.phase, "departing"); assert.equal(s.hayride.convoy.manifest.length, 4); assert.equal(s.hayride.departures, 1);
  const p = opened(); guest(p); advance(p, 16.5); assert.equal(p.hayride.convoy.phase, "loading"); advance(p, .1); assert.equal(p.hayride.convoy.phase, "departing");
  const empty = opened(); advance(empty, 1e6); assert.equal(empty.hayride.departures, 0);
});
test("the queue is bounded and drains over successive paid circuits under a large update", () => {
  const s = opened(); for (let i = 0; i < 8; i++) guest(s, i);
  const ninth = { id: 9, budget: 100 }; assert.equal(H.planHayrideVisit(s, ninth, "arrival", { force: true }), null);
  const events = advance(s, 500); assert.equal(s.hayride.ticketsSold, 8); assert.equal(s.hayride.completed, 8); assert.equal(s.hayride.departures, 2);
  assert.equal(H.hayrideOccupancy(s).total, 0); assert.equal(s.hayride.convoy.phase, "loading"); assert.equal(events.filter(e => e.type === "hayride-departed").length, 2);
});
test("large slices and small slices produce the same departures, receipts and terror", () => {
  const a = opened(), b = opened(); for (let i = 0; i < 8; i++) { guest(a, i); guest(b, i); }
  advance(a, 250); for (let i = 0; i < 2500; i++) advance(b, .1);
  for (const key of ["ticketsSold", "income", "completed", "missed", "departures"]) assert.equal(a.hayride[key], b.hayride[key], key);
  assert.equal(a.coins, b.coins); for (let i = 0; i < a.visitors.length; i++) assert.ok(Math.abs(a.visitors[i].hayride.terror - b.visitors[i].hayride.terror) < 1e-6);
});
test("closing rejects unpaid guests but completes and unloads the already-paid wagon", () => {
  const s = opened(), paid = guest(s), waiting = guest(s, 1); advance(s, 1.6); assert.equal(paid.hayride.charged, true);
  H.setHayrideOpen(s, false); advance(s, 130); assert.equal(s.hayride.ticketsSold, 1); assert.equal(s.hayride.completed, 1); assert.equal(s.hayride.missed, 1);
  assert.ok(paid.hayride.done); assert.equal(waiting.hayride.charged, false); assert.ok(waiting.hayride.done);
});
test("tea break pauses boarding and movement without changing queued quotes", () => {
  const s = opened(); guest(s); advance(s, 1); const before = structuredClone(s.hayride), visit = structuredClone(s.visitors[0].hayride);
  s.paused = true; advance(s, 1000); assert.deepEqual(s.hayride, before); assert.deepEqual(s.visitors[0].hayride, visit);
});
test("every active phase survives a round trip without an extra debit", () => {
  for (const seconds of [.05, .2, 2, 18, 24, 111, 116, 118.65]) {
    const s = opened(); guest(s); advance(s, seconds); const r = roundTrip(s), charged = s.hayride.ticketsSold;
    assert.equal(r.visitors.length, H.saveHayrideVisitors(s).length); assert.equal(r.hayride.ticketsSold, charged);
    advance(r, 300); assert.equal(r.hayride.ticketsSold, 1); assert.equal(r.hayride.completed, 1); assert.equal(r.hayride.income, 8); assert.equal(r.visitors[0].budget, 92);
  }
});
test("waiting queue members survive while another visitor is boarding", () => {
  const s = opened(); for (let i = 0; i < 3; i++) guest(s, i); advance(s, .2); assert.equal(H.hayrideQueue(s).length, 2);
  const r = roundTrip(s); assert.equal(H.hayrideQueue(r).length, 2); advance(r, 300); assert.equal(r.hayride.ticketsSold, 3); assert.equal(r.hayride.completed, 3);
});
test("a fulfilled wished purchase remains fulfilled after saving an active after-shop visit", () => {
  const s = opened(), v = guest(s, 0, { budget: 20, fromStall: true, wish: { variety: 1, purse: 24 }, basket: [{ variety: 1, quantity: 1, price: 24 }] });
  advance(s, 2); const r = roundTrip(s); assert.equal(H.hayrideSpendable(r, r.visitors[0]), H.hayrideSpendable(s, v));
});
test("restore repairs duplicate seats/guests and rejects impossible paid records", () => {
  const s = opened(); guest(s); guest(s, 1); advance(s, 4); const raw = structuredClone(s.hayride), visits = H.saveHayrideVisitors(s);
  raw.convoy.manifest.push({ ...raw.convoy.manifest[0] }); raw.receipts.push({ visitId: "hayride-999999999999999999999", runId: "hayride-run-1", visitor: 8, seat: 0, amount: 8 });
  const r = prepared(); r.hayride = H.restoreHayride(raw); H.restoreHayrideVisitors([...visits, visits[0], { ...visits[0], id: 88 }], r);
  assert.equal(r.visitors.length, 2); assert.equal(r.hayride.convoy.manifest.length, 2); assert.ok(Number.isSafeInteger(r.hayride.nextVisit));
  const broken = prepared(); broken.hayride = H.restoreHayride(raw); H.restoreHayrideVisitors([{ ...visits[0], hayride: { ...visits[0].hayride, visitId: "hayride-77" } }], broken);
  assert.equal(broken.visitors.length, 0); assert.equal(broken.hayride.convoy.manifest.length, 0); assert.equal(broken.hayride.convoy.phase, "loading");
});
test("a guest cannot hold two attractions or rejoin without a new explicit consideration", () => {
  const s = opened(); assert.equal(H.planHayrideVisit(s, { id: 0, budget: 100, hollow: { done: false } }, "arrival", { force: true }), null);
  assert.equal(H.planHayrideVisit(s, { id: 0, budget: 100, festival: { done: false } }, "arrival", { force: true }), null);
  const v = guest(s); assert.equal(H.planHayrideVisit(s, v, "arrival", { force: true }), null);
});
test("opening advertises one bounded party, and closing/reopening cannot conjure guests", () => {
  const s = prepared(); s.arriving = [{ party: 99, place: 0, size: 1, wait: 50 }]; s.nextParty = 100;
  H.buyHayride(s); assert.ok(H.setHayrideOpen(s, true)); assert.equal(s.arriving.filter(a => a.forHayride).length, 2); assert.equal(s.nextParty, 101); assert.equal(s.hayride.partyAt, 0);
  assert.ok(H.setHayrideOpen(s, true)); assert.equal(s.arriving.filter(a => a.forHayride).length, 2);
  H.setHayrideOpen(s, false); assert.equal(s.arriving.length, 1, "ordinary arrivals remain");
  for (let i = 0; i < 20; i++) { H.setHayrideOpen(s, true); H.setHayrideOpen(s, false); }
  assert.equal(s.arriving.length, 1); assert.equal(s.nextParty, 101);
  const restored = H.restoreHayride(structuredClone(s.hayride)); assert.equal(restored.partyAt, 0); s.hayride = restored;
  H.setHayrideOpen(s, true); assert.equal(s.arriving.length, 1); H.setHayrideOpen(s, false); s.time = 120; H.setHayrideOpen(s, true);
  assert.equal(s.arriving.filter(a => a.forHayride).length, 2); assert.equal(s.nextParty, 102);
});
test("an opening party respects the global guest limit instead of stealing return spaces", () => {
  const s = prepared(); s.arriving = []; s.nextParty = 0; H.buyHayride(s);
  s.visitors = Array.from({ length: 15 }, (_, id) => ({ id })); H.setHayrideOpen(s, true); assert.equal(s.arriving.length, 0);
  H.setHayrideOpen(s, false); s.visitors.pop(); H.setHayrideOpen(s, true); assert.equal(s.arriving.length, 2);
  assert.equal(H.restoreHayride({ ...s.hayride, partyAt: NaN }).partyAt, null);
});

test("an already-completed Hollow House visit remains marked after hayride reload", () => {
  const s = opened(); guest(s, 0, { hollow: { done: true } }); advance(s, 2); const r = roundTrip(s); assert.deepEqual(r.visitors[0].hollow, { done: true });
});

test("a malformed pending quote cannot exceed the restored tier ticket band", () => {
  const s = opened(); guest(s); advance(s, .2); const raw = H.saveHayrideVisitors(s); raw[0].hayride.quote = 20; const r = prepared(); r.hayride = H.restoreHayride(s.hayride); H.restoreHayrideVisitors(raw, r); assert.equal(r.visitors[0].hayride.quote, 12);
});
