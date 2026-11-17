// Fresh pumpkins and the wanted variety (rules/market.js, rules/stock.js).
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const PRICES = M.VARIETIES.map((v) => v.price), ALL = [0, 1, 2, 3];
const guest = (budget, basketLimit, preferred, wish = null) => ({ budget, basketLimit, preferred, wish });
const count = (lines) => lines.reduce((n, l) => n + l.quantity, 0);
const total = (lines) => lines.reduce((n, l) => n + l.quantity * l.price, 0);
// A farm whose plots can grow up to `best`, with nothing wanted yet.
function farm(best = 0) { const s = M.freshState(); s.plotLevels[0] = best; return s; }

test("picked pumpkins are fresh for a minute and a half, never more of them than in stock", () => {
  const s = farm(); s.plots[0] = { phase: "ready", progress: 1, variety: 0 }; s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  assert.equal(M.harvest(s, 0), 1); assert.equal(M.freshCount(s, 0), 1);
  M.update(s, M.FRESH.seconds - 1); assert.equal(M.freshCount(s, 0), 1, "still fresh");
  M.update(s, 1.5); assert.equal(M.freshCount(s, 0), 0, "no longer fresh"); assert.equal(s.stock[0], 1, "but still in the barn");
  M.addStock(s, 1, 3, true); s.stock[1] = 2; M.settleFresh(s); assert.equal(M.freshCount(s, 1), 2);
});

test("shoppers take fresh pumpkins first and pay more only from their change", () => {
  const s = farm(); s.stock = [6, 0, 0, 0]; M.addStock(s, 0, 2, true); s.stock[0] = 6;
  const shopper = guest(30, 3, [0]), stale = farm(); stale.stock = [6, 0, 0, 0];
  const fresh = M.quoteBasket(s, shopper, ALL, PRICES), plain = M.quoteBasket(stale, shopper, ALL, PRICES);
  assert.equal(count(fresh), count(plain), "never a pumpkin fewer"); assert.equal(count(plain), 2);
  assert.deepEqual(fresh.map((l) => [l.quantity, l.price, l.fresh]), [[2, 14, true]], "two fresh Oranges at £14");
  assert.ok(total(fresh) <= shopper.budget);
  // Only £3 to spare: the first fresh one takes £2 more, the next the last £1.
  const tight = M.quoteBasket(s, guest(27, 2, [0]), ALL, PRICES);
  assert.deepEqual(tight.map((l) => [l.quantity, l.price]), [[1, 14], [1, 13]]); assert.equal(total(tight), 27);
  // Nothing to spare: fresh, at the usual price.
  assert.deepEqual(M.quoteBasket(s, guest(24, 2, [0]), ALL, PRICES).map((l) => [l.quantity, l.price, l.fresh]), [[2, 12, true]]);
});

test("a fresh pumpkin in one basket is not promised to another, and leaves the fresh count when sold", () => {
  const s = farm(); s.stock = [3, 0, 0, 0]; M.addStock(s, 0, 1, true); s.stock[0] = 3;
  const a = M.chooseBasket(s, guest(14, 1, [0]), ALL, "a", PRICES), b = M.chooseBasket(s, guest(14, 1, [0]), ALL, "b", PRICES);
  assert.equal(a[0].fresh, true); assert.equal(b[0].fresh, false); assert.equal(b[0].price, 12);
  M.commitHold(s, "a"); assert.equal(M.freshCount(s, 0), 0); assert.equal(s.stock[0], 2);
  M.commitHold(s, "b"); assert.equal(s.stock[0], 1);
});

test("nothing is wanted until a second variety can grow; then a new one every five minutes, never twice running", () => {
  const s = farm(0);
  M.update(s, 1); assert.equal(M.wantedVariety(s), null);
  s.plotLevels[0] = 2; const seen = [];
  for (let i = 0; i < 12; i++) {
    const events = M.update(s, 31); const w = events.find((e) => e.type === "wanted");
    if (w) seen.push(w.variety);
    M.update(s, M.WANTED.seconds - 31);
  }
  assert.ok(seen.length >= 10, "a new one each time"); assert.ok(seen.every((v) => v >= 0 && v <= 2), "only what the plots can grow");
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
  assert.ok(new Set(seen).size >= 2);
  assert.ok(M.wantedSecondsLeft(s) > 0 && M.wantedSecondsLeft(s) <= M.WANTED.seconds);
});

test("the wanted variety fetches up to a quarter more, from change, with or without freshness", () => {
  const s = farm(1); s.wanted = { variety: 1, until: s.time + 100, serial: 1 }; s.stock = [0, 4, 0, 0];
  assert.equal(M.dearPrice(s, 1, 24, false), 30); assert.equal(M.dearPrice(s, 1, 24, true), 36); assert.equal(M.dearPrice(s, 0, 12, false), 12);
  const lines = M.quoteBasket(s, guest(60, 2, [1]), ALL, PRICES);
  assert.deepEqual(lines.map((l) => [l.quantity, l.price]), [[2, 30]]);
});

test("a keen guest brings money for one wanted pumpkin on top; without one in stock it stays in their pocket", () => {
  const s = farm(1); s.wanted = { variety: 1, until: s.time + 100, serial: 1 }; s.stock = [10, 3, 0, 0];
  const wish = { variety: 1, purse: 30 }, keen = guest(18 + 30, 3 + 1, [0], wish), plain = guest(18, 3, [0]);
  const got = M.quoteBasket(s, keen, ALL, PRICES), usual = M.quoteBasket(s, plain, ALL, PRICES);
  assert.equal(count(got), count(usual) + 1, "one Moonlight more"); assert.deepEqual(got[0], { variety: 1, quantity: 1, price: 30, fresh: false }, "at its wanted price");
  assert.deepEqual(got.slice(1), usual, "and otherwise the same basket");
  assert.ok(total(got) <= keen.budget);
  s.stock[1] = 0;
  assert.deepEqual(M.quoteBasket(s, keen, ALL, PRICES), usual, "the same basket as anyone else's");
});

test("some new guests come keen for the wanted variety, never the Baron", () => {
  const s = farm(1); s.coins = 1e6; s.wanted = { variety: 1, until: 1e9, serial: 3 }; s.stock = [200, 200, 0, 0];
  s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  let keen = 0;
  for (let i = 0; i < 200; i++) { s.arriving.push({ party: i, place: 0, size: 1, wait: 0 }); M.update(s, 0.1); }
  for (const v of s.visitors) if (v.wish) { keen++; assert.equal(v.wish.variety, 1); assert.equal(v.wish.purse, 30); }
  assert.ok(keen > 10 && keen < 60, `about ${M.WANTED.keen * 100}% keen (${keen} of ${s.visitors.length})`);
  s.bigSpender.timer = 0; s.visitors = []; for (let i = 0; i < 50 && !s.visitors.some((v) => v.vip); i++) M.update(s, 0.1);
  const baron = s.visitors.find((v) => v.vip); if (baron) assert.equal(baron.wish, null);
});

test("fresh pumpkins and the wanted variety survive a reload; nonsense does not", () => {
  const s = farm(2); s.time = 500; s.stock = [5, 5, 0, 0]; M.addStock(s, 1, 2, true); s.stock[1] = 5;
  s.wanted = { variety: 2, until: 650, serial: 4 };
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(M.freshCount(back, 1), 2); assert.deepEqual(back.wanted, { variety: 2, until: 650, serial: 4 });
  const raw = JSON.parse(JSON.stringify(M.saveData(s)));
  raw.fresh = [[["x", 2]], [[499, 99]], "junk", [[1e9, 1]]]; raw.wanted = { variety: 9, until: "soon", serial: -1 };
  const odd = M.restoreState(raw);
  assert.deepEqual([0, 1, 2, 3].map((v) => M.freshCount(odd, v)), [0, 5, 0, 0], "held to stock; future and junk dropped");
  assert.deepEqual(odd.wanted, M.freshWanted());
  raw.fresh = [[], [[100, 3]], [], []]; assert.equal(M.freshCount(M.restoreState(raw), 1), 0, "long since picked");
  delete raw.fresh; delete raw.wanted; const old = M.restoreState(raw);
  assert.deepEqual(old.fresh, [[], [], [], [], []]); assert.deepEqual(old.wanted, M.freshWanted());
});
