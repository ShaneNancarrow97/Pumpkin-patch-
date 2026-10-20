// The harvest streak's visitor boost: it climbs with the streak, holds while the
// streak is hot, fades after, and speeds the arrival timers up without rescaling them.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-8, `${msg ?? ""} ${a} ≠ ${b}`);
// n picks a second apart, as quick hands would.
const picks = (s, n) => { for (let i = 0; i < n; i++) { s.time += 1; M.rewardHarvestStreak(s); } };

test("the bonus climbs in clear steps with the streak and levels off", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((n) => Math.round(M.streakBonus(n) * 100)), [0, 10, 20, 30, 40, 50]);
  assert.deepEqual([7, 10, 16, 20, 26, 40, 500].map((n) => Math.round(M.streakBonus(n) * 100)), [55, 70, 100, 120, 150, 150, 150]);
  for (let n = 1; n < 60; n++) assert.ok(M.streakBonus(n + 1) >= M.streakBonus(n));
});

test("each quick pick stacks on the streak: ×7 brings parties 55% more often", () => {
  const s = M.freshState();
  picks(s, 1); assert.equal(M.visitorBonus(s), 0);
  picks(s, 1); near(M.visitorBonus(s), 0.1);
  picks(s, 5);
  assert.equal(s.streak.count, 7); near(M.visitorBonus(s), 0.55); near(M.pathBoost(s), 0.55);
  near(M.stallGapSeconds(s), 21 / 1.55); assert.equal(M.stallArrivalSeconds(s), 21, "the upgrades' own gap is unchanged");
  near(M.visitorBoostSeconds(s), M.STREAK.window + M.STREAK.fade);
});

test("the bonus holds while the streak is hot, then fades to nothing", () => {
  const s = M.freshState();
  picks(s, 6);
  const last = s.time;
  s.time = last + M.STREAK.window; near(M.visitorBonus(s), 0.5, "still whole at the end of the streak");
  s.time += M.STREAK.fade / 2; near(M.visitorBonus(s), 0.25, "half gone halfway through the fade");
  s.time = last + M.STREAK.window + M.STREAK.fade; assert.equal(M.visitorBonus(s), 0);
  s.time += 100; assert.equal(M.visitorBonus(s), 0); assert.equal(M.pathBoost(s), 0);
});

test("a pick while the bonus fades starts a new streak but keeps what is left", () => {
  const s = M.freshState();
  picks(s, 12);                                                              // ×12: +80%
  near(M.visitorBonus(s), 0.8);
  s.time += M.STREAK.window + M.STREAK.fade / 4;                             // three-quarters left: +60%
  near(M.visitorBonus(s), 0.6);
  M.rewardHarvestStreak(s);
  assert.equal(s.streak.count, 1); near(M.visitorBonus(s), 0.6, "refreshed at what was left");
  picks(s, 6); near(M.visitorBonus(s), 0.6, "×7 alone is less than that");
  picks(s, 2); near(M.visitorBonus(s), 0.65, "×9 climbs past it");
});

test("the visitor boost no longer waits on the coin bonus's cooldown", () => {
  const s = M.freshState();
  picks(s, 6);
  assert.equal(s.streak.bonusCoins, 5); near(M.visitorBonus(s), 0.5);
  s.time += 30;                                                              // streak and fade over, coin cooldown still on
  picks(s, 6);
  assert.equal(s.streak.bonusCoins, 5, "no coins inside the minute"); near(M.visitorBonus(s), 0.5, "but the visitors still come");
  s.time += 61; picks(s, 6); assert.equal(s.streak.bonusCoins, 10);
});

test("a slow pick (over five seconds) ends the streak", () => {
  const s = M.freshState();
  for (let i = 0; i < 6; i++) { s.time += 6; M.rewardHarvestStreak(s); }
  assert.equal(s.streak.count, 1); assert.equal(s.streak.bonusCoins, 0); assert.equal(M.visitorBonus(s), 0);
});

test("timers count down faster with the bonus instead of being rescaled", () => {
  const s = M.freshState(); s.visitorTimer = 21; s.shop.unlocked = true; s.shop.arrivalTimer = 3;
  picks(s, 6);                                                               // +50%
  M.update(s, 1);
  near(s.visitorTimer, 19.5); near(s.shop.arrivalTimer, 1.5);
  // The bonus ending changes only the pace: the timer is where it was.
  s.time = s.streak.visitorBoostUntil; const before = s.visitorTimer;
  assert.equal(M.visitorBonus(s), 0); assert.equal(s.visitorTimer, before);
  M.update(s, 1); near(s.visitorTimer, before - 1);
});

test("a steady picker's party arrives sooner than an idle farm's", () => {
  const arrival = (keepPicking) => {
    const s = M.freshState(); s.visitorTimer = 21;
    for (let t = 0; t < 60; t = Math.round((t + 0.1) * 10) / 10) {
      if (keepPicking && Math.abs(t % 1) < 1e-9) M.rewardHarvestStreak(s);
      if (M.update(s, 0.1).some((e) => e.type === "arrival")) return t + 0.1;
    }
  };
  const idle = arrival(false), busy = arrival(true);
  assert.ok(Math.abs(idle - 21) < 0.11, `idle ${idle}`);
  assert.ok(busy < 15, `busy ${busy}`);                                     // about 14s, a third sooner
});

test("the floor keeps a long streak on a fully upgraded farm from running away, and drops as tiers are bought", () => {
  const s = M.freshState(); s.upgrades.sign = 5; s.visitorUpgrades.lights = 4; s.shop.unlocked = true;
  picks(s, 30);
  near(M.visitorBonus(s), 1.5);
  near(M.stallGapSeconds(s), Math.max(2.5, M.stallArrivalSeconds(s) / 2.5));
  assert.ok(M.stallGapSeconds(s) < M.stallArrivalSeconds(s), "the streak still helps a maxed farm");
  near(M.shopArrivalSeconds(s) / M.shopPace(s), Math.max(M.shopArrivalSeconds(s) / 2.5, 1.1));
  const mid = M.freshState(); mid.upgrades.sign = 2; picks(mid, 30); near(M.stallGapSeconds(mid), Math.max(4.4, 21 * 0.88 * 0.89 / 2.5));
  // A fresh farm gets the whole +150%.
  const t = M.freshState(); picks(t, 30); near(M.stallGapSeconds(t), 21 / 2.5);
});

test("at most twelve neighbours on the path; the next party waits at the gate", () => {
  const s = M.freshState(); s.visitorUpgrades.party = 3; s.visitorTimer = 0.05;
  s.visitors = Array.from({ length: 11 }, (_, id) => ({ id, age: 0, leaveAt: null, spot: 0, budget: 0, basketLimit: 1, preferred: [0], basket: [], outcome: "shopping" }));
  const size = M.partySize(s, s.nextParty);
  assert.ok(size > 1);
  M.update(s, 0.1);
  assert.equal(s.arriving.length, 0); assert.equal(s.visitorTimer, 0); assert.equal(s.nextParty, 0);
  s.visitors.length = 12 - size;
  M.update(s, 0.1);
  assert.equal(s.nextParty, 1); assert.equal(M.onThePath(s), 12);
});

test("helpers never build a streak, and the tea break stops the countdown", () => {
  const s = M.freshState(); s.upgrades.auto = 1;
  for (const p of s.plots.slice(0, 6)) Object.assign(p, { phase: "ready", progress: 1 });
  const events = M.update(s, 2.1);
  assert.ok(events.some((e) => e.type === "harvest"));
  assert.equal(s.streak.count, 0); assert.equal(M.visitorBonus(s), 0);
  picks(s, 8);
  const left = M.visitorBoostSeconds(s), bonus = M.visitorBonus(s), timer = s.visitorTimer;
  s.paused = true;
  M.update(s, 30);
  assert.equal(M.visitorBoostSeconds(s), left); assert.equal(M.visitorBonus(s), bonus); assert.equal(s.visitorTimer, timer);
  const count = s.streak.count; M.rewardHarvestStreak(s);
  assert.equal(s.streak.count, count, "no picks count during tea");
});

test("saves keep a boost's level and what is left of it, and old rushes come back as +50%", () => {
  const s = M.freshState(); picks(s, 9); s.time += 8;                       // hold over, fading
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  near(M.visitorBonus(loaded), M.visitorBonus(s)); near(M.visitorBoostSeconds(loaded), M.visitorBoostSeconds(s));
  // Codex's version 5 rush: an end time and no level of its own.
  const rush = M.freshState(); rush.version = 5; rush.time = 100; delete rush.streak.visitorBoost; rush.streak.visitorBoostUntil = 110;
  const back = M.restoreState(rush);
  assert.equal(back.streak.visitorBoost, 0.5); near(M.visitorBoostSeconds(back), 10);
  // Version 4 had no rush at all; endless or silly values are held to one pick's worth.
  const v4 = M.freshState(); v4.version = 4; delete v4.streak.visitorBoostUntil; delete v4.streak.visitorBoost;
  assert.equal(M.restoreState(v4).streak.visitorBoostUntil, 0); assert.equal(M.restoreState(v4).streak.visitorBoost, 0);
  const junk = M.freshState(); junk.streak.visitorBoost = 40; junk.streak.visitorBoostUntil = 1e9; junk.streak.until = 1e9;
  const fixed = M.restoreState(junk);
  assert.equal(fixed.streak.visitorBoost, M.STREAK.cap); assert.equal(M.visitorBoostSeconds(fixed), M.STREAK.window + M.STREAK.fade);
  assert.equal(fixed.streak.until, M.STREAK.window);
  const bad = M.freshState(); bad.streak.visitorBoost = "lots"; bad.streak.visitorBoostUntil = 5;
  assert.equal(M.restoreState(bad).streak.visitorBoost, 0.5, "a non-number level is treated as an old rush");
});
