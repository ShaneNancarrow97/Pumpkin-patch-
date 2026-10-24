import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { CHAT_SPOTS, MEADOW, MEADOW_EXIT, chatPlace, pathDistance } from "../src/content/festival-meadow.js";
import { hollowPathDistance } from "../src/content/hollow-house.js";
import { counterPlace } from "../src/content/farm-layout.js";
import { CHAT, chatMembers, planChat } from "../src/rules/meadow-chat.js";
import { converse, freshSocial, recordNews } from "../src/rules/meadow-talk.js";

// A busy evening at the meadow: a full stand, plenty of pumpkins, big parties.
function evening(level = 3, stock = 400) {
  const s = M.freshState(); s.coins = 1e6; s.earned = 2e5;
  s.festival.meadow = true; s.festival.cocoa.level = level; s.festival.cocoa.stock = 100;
  for (const id of Object.keys(s.festival.cocoa.extras)) s.festival.cocoa.extras[id].stock = 30;
  s.stock = [stock, stock, stock, stock]; s.visitorUpgrades.party = 3; s.visitorUpgrades.crowd = 4; s.upgrades.sign = 4;
  return s;
}
function play(s, seconds, each = () => {}) {
  const events = [];
  for (let t = 0; t < seconds; t += .1) { const step = M.update(s, .1); events.push(...step); if (s.festival.cocoa.stock < 20) s.festival.cocoa.stock = 100; each(s, step); }
  return events;
}
// Chat switched off by closing every spot.
function withoutChat(fn) {
  const levels = CHAT_SPOTS.map((p) => p.level);
  try { for (const p of CHAT_SPOTS) p.level = 99; return fn(); } finally { CHAT_SPOTS.forEach((p, i) => { p.level = levels[i]; }); }
}

test("chat spots and their walks stay off the paths and clear of the benches, booth and planters", () => {
  // Benches, the booth, the planters and the lantern spot's hay bales (festival-meadow-world.js).
  const solid = [[41.1, 21.3, 44.9, 21.9], [43.7, 16.2, 50.3, 19.8], [42.4, 7.6, 43.6, 8.4], [51.4, 27.6, 52.6, 28.4], [52.68, 14.6, 53.13, 15.4], [49.5, 12.78, 50.3, 13.23]];
  const inside = ([x, z], m = .25) => solid.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  for (const spot of CHAT_SPOTS) {
    for (let seat = 0; seat < spot.seats; seat++) {
      const place = chatPlace(spot, seat);
      assert.ok(pathDistance(...place) >= 1.2, `${spot.id} place ${seat} is off the meadow paths`);
      assert.ok(hollowPathDistance(...place) >= 1.2, `${spot.id} place ${seat} is off the lantern walk`);
      assert.ok(!inside(place, .35), `${spot.id} place ${seat} is clear of props`);
      for (const route of [[counterPlace(0), ...spot.to, place], [place, ...spot.cocoa, [47, 20.6]], [place, ...spot.exit, ...MEADOW_EXIT.slice(spot.join)]])
        for (let i = 1; i < route.length; i++) for (let k = 0; k <= 20; k++) {
          const a = route[i - 1], b = route[i], p = [a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20];
          assert.ok(!inside(p), `${spot.id}'s walk from ${a} to ${b} misses the props`);
        }
    }
  }
});

test("chatting changes no arrivals or pumpkin sales, and leaves the cocoa queue to arrivals", () => {
  for (const level of [1, 3]) {
    const tally = (s, events) => ({ arrivals: events.filter((e) => e.type === "arrival").length, income: s.stall.income, sold: s.stall.itemsSold, cocoa: events.filter((e) => e.route === "festival-cocoa" && !e.chat).length });
    const on = evening(level), onEvents = play(on, 600), with_ = tally(on, onEvents);
    const off = evening(level), without = withoutChat(() => tally(off, play(off, 600)));
    assert.ok(onEvents.some((e) => e.type === "chat-line"), "they chat");
    assert.equal(with_.arrivals, without.arrivals); assert.equal(with_.income, without.income); assert.equal(with_.sold, without.sold);
    assert.ok(with_.cocoa >= without.cocoa * .95 - 1, `arrivals still get their cocoa at level ${level}: ${with_.cocoa} v ${without.cocoa}`);
  }
});

test("a chat begins only once a guest has finished, and never for the maze or the Baron", () => {
  const s = evening(3), seen = new Set();
  play(s, 400, (state) => { for (const v of state.visitors) if (v.social && !seen.has(v.id)) {
    seen.add(v.id);
    assert.notEqual(v.outcome, "shopping"); assert.ok(v.leaveAt !== null && v.age >= v.leaveAt);
    assert.ok(!v.vip); assert.ok(!v.hollow || v.hollow.done && !v.hollow.wentHome);
  } });
  assert.ok(seen.size > 10);
});

test("the caps hold: per spot, overall, one away for a drink per group and one drink a guest", () => {
  const s = evening(3), paid = new Map(), hadTreat = new Set();
  const events = play(s, 900, (state, step) => {
    const chatters = state.visitors.filter(M.chatting);
    assert.ok(chatters.length <= M.chatCap(state));
    for (const spot of CHAT_SPOTS) {
      const here = chatMembers(state, spot.id);
      assert.ok(here.length <= spot.seats, `${spot.id} holds at most ${spot.seats}`);
      assert.equal(new Set(here.map((v) => v.social.seat)).size, here.length, "one guest a place");
      assert.ok(here.filter((v) => v.social.phase.startsWith("cocoa")).length <= 1, "one of a group away for a drink");
    }
    for (const v of state.visitors) if (v.treatReceipt && !v.social) hadTreat.add(v.id);
    for (const e of step) if (e.chat) { assert.ok(!hadTreat.has(e.visitor), "no second drink"); paid.set(e.visitor, (paid.get(e.visitor) ?? 0) + 1); }
  });
  assert.ok(paid.size > 3, "some chatters fetch a cocoa");
  assert.ok([...paid.values()].every((n) => n === 1));
  assert.ok(events.filter((e) => e.chat).every((e) => e.amount <= 14));
});

test("every chatter goes home in good time, and a guest left alone leaves after 15 seconds", () => {
  const s = evening(3), started = new Map(), longest = { t: 0 };
  play(s, 900, (state) => {
    for (const v of state.visitors) if (v.social && !started.has(v.id)) started.set(v.id, state.time);
    for (const [id, at] of started) if (!state.visitors.some((v) => v.id === id)) { longest.t = Math.max(longest.t, state.time - at); started.delete(id); }
  });
  assert.ok(longest.t > 20 && longest.t < CHAT.stay[1] + CHAT.extra + CHAT.lonely + 45, `longest chat ${longest.t.toFixed(1)}s`);

  const lone = evening(1); lone.visitorTimer = 1e9;
  const v = { id: 3, kind: 1, budget: 0, originalBudget: 20, needs: { thirst: 0, hunger: 0, happiness: 100, value: 1 }, preferred: [0], basket: [], outcome: "bought", leaveAt: 9, age: 9, spot: 0, festival: { done: true }, hollowConsidered: true, mazeAfterConsidered: true, socialConsidered: true };
  v.social = planChat(lone, { ...v, id: 1 }) ?? planChat(lone, { ...v, id: 2 }) ?? planChat(lone, v);
  assert.ok(v.social, "someone in this little crowd fancies a chat");
  lone.visitors.push(v);
  let chattingFrom = null, leftAt = null;
  for (let t = 0; t < 80 && leftAt === null; t += .1) {
    M.update(lone, .1);
    if (v.social.phase === "chatting" && chattingFrom === null) chattingFrom = lone.time;
    if (v.social.phase === "leaving") leftAt = lone.time;
  }
  assert.ok(leftAt - chattingFrom >= CHAT.lonely - .2 && leftAt - chattingFrom < CHAT.lonely + .5, `left after ${(leftAt - chattingFrom).toFixed(1)}s alone`);
  play(lone, 30); assert.equal(lone.visitors.length, 0, "and walks out of the meadow");
});

test("a save taken mid-chat loads with nobody chatting and nothing else changed", () => {
  const s = evening(3); play(s, 200);
  assert.ok(s.visitors.some(M.chatting));
  const saved = JSON.parse(JSON.stringify(M.saveData(s)));
  assert.equal(saved.social, undefined);
  const loaded = M.restoreState(saved);
  assert.equal(loaded.visitors.length, 0); assert.deepEqual(loaded.social, freshSocial());
  const stand = (f) => ({ ...f, cocoa: { ...f.cocoa, lastSaleAt: 0 } });            // the last sale's time was never saved
  assert.deepEqual(stand(loaded.festival), stand(s.festival)); assert.equal(loaded.coins, s.coins);
});

test("the talk reflects the news: a new haunt comes up first, and no topic repeats in a conversation", () => {
  const s = evening(3); s.hollowHouse.purchased = true; s.hollowHouse.status = "ready"; s.hollowHouse.open = true;
  recordNews(s); s.time += 30;
  s.hollowHouse.haunts.owned.push("phantom-finale"); s.hollowHouse.haunts.active.push("phantom-finale"); recordNews(s);
  assert.equal(s.social.news.at(-1).kind, "haunt");
  const speakers = [{ id: 1, kind: 0, outcome: "bought", basket: [{ variety: 1 }], bought: 1, quantity: 2 }, { id: 2, kind: 3, outcome: "soldout", preferred: [3] }, { id: 3, kind: 7, cocoaSpend: 4, cocoaKind: "cocoa" }];
  const group = { id: 9, used: [], count: 0, thread: null };
  const lines = Array.from({ length: 4 }, (_, i) => converse(s, group, speakers[i % 3]));
  assert.ok(lines.some((l) => /phantom finale/.test(l.text)), lines.map((l) => l.text).join(" / "));
  for (let i = 0; i < 40; i++) converse(s, group, speakers[i % 3]);
  assert.equal(new Set(group.used).size, group.used.length, "never the same topic twice");
  const again = { id: 9, used: [], count: 0, thread: null };
  assert.deepEqual(Array.from({ length: 4 }, (_, i) => converse(s, again, speakers[i % 3]).text), lines.map((l) => l.text), "the same group says the same thing");
});

test("news is noticed as things change, once per story, and never on load", () => {
  const s = evening(3); s.stock = [0, 0, 0, 0];
  recordNews(s); assert.equal(s.social.news.length, 0, "the first look is quiet");
  s.stock[2] = 4; s.festival.cocoa.prices.deluxe = 9; recordNews(s);
  assert.deepEqual(s.social.news.map((n) => n.kind), ["stock-fresh", "cocoa-price"]);
  s.stock[2] = 0; recordNews(s); s.stock[2] = 3; recordNews(s);
  assert.equal(s.social.news.filter((n) => n.kind === "stock-fresh").length, 1, "the same story within 45 seconds is one story");
  for (let i = 0; i < 30; i++) { s.time += 50; s.festival.cocoa.price = 3 + (i % 2); recordNews(s); }
  assert.ok(s.social.news.length <= 16);
});

test("chatters fetch from Sandy in their turn, behind guests already queuing", () => {
  const s = evening(1), order = [];
  play(s, 900, (state) => {
    const queue = state.visitors.filter(M.inCocoaQueue).sort((a, b) => M.cocoaQueueRank(state, a) - M.cocoaQueueRank(state, b));
    assert.ok(queue.length <= MEADOW.queue + 1);
    const serving = state.visitors.filter((v) => v.festival?.phase === "serving" || v.social?.phase === "cocoa-serving");
    assert.ok(serving.length <= 1, "Sandy serves one at a time");
    for (const v of serving) if (order.at(-1) !== v.id) order.push(v.id);
  });
  assert.ok(order.length > 20);
});
