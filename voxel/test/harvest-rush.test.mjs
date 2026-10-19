import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

test("six quick picks start a 20-second rush immediately, with 50% more visitors", () => {
  const s = M.freshState(); s.visitorTimer = 21; s.shop.arrivalTimer = 3;
  for (let i = 0; i < 5; i++) { s.time++; M.rewardHarvestStreak(s); }
  assert.equal(M.visitorRushSeconds(s), 0);
  s.time++; const reward = M.rewardHarvestStreak(s);
  assert.equal(reward.visitorRush, 20); assert.equal(M.stallArrivalSeconds(s), 14); assert.equal(M.shopArrivalSeconds(s), 2);
  assert.equal(s.visitorTimer, 14); assert.equal(s.shop.arrivalTimer, 2);
  const until = s.streak.visitorBoostUntil;
  for (let i = 0; i < 6; i++) { s.time++; M.rewardHarvestStreak(s); }
  assert.equal(s.streak.visitorBoostUntil, until, "a longer streak cannot stack or extend the rush");
  s.time = until; assert.equal(M.visitorRushSeconds(s), 0); assert.equal(M.stallArrivalSeconds(s), 21);
});

test("the minute cooldown and five-second streak window still apply", () => {
  const s = M.freshState();
  for (let i = 0; i < 6; i++) { s.time += 6; M.rewardHarvestStreak(s); }
  assert.equal(s.streak.count, 1); assert.equal(M.visitorRushSeconds(s), 0);
  for (let i = 0; i < 5; i++) { s.time++; M.rewardHarvestStreak(s); }
  assert.equal(M.visitorRushSeconds(s), 20);
  s.time += 61;
  for (let i = 0; i < 6; i++) M.rewardHarvestStreak(s);
  assert.equal(M.visitorRushSeconds(s), 20);
});

test("expiry removes the rate boost and preserves the remaining arrival progress", () => {
  const s = M.freshState();
  for (let i = 0; i < 6; i++) M.rewardHarvestStreak(s);
  s.time = 19.9; s.visitorTimer = 8; s.shop.unlocked = true; s.shop.arrivalTimer = 1;
  M.update(s, .1);
  assert.equal(M.visitorRushSeconds(s), 0);
  assert.ok(Math.abs(s.visitorTimer - 11.9) < 1e-8);
  assert.ok(Math.abs(s.shop.arrivalTimer - 1.4) < 1e-8);
});

test("rush saves migrate from v4, keep remaining game time, and reject endless durations", () => {
  const old = M.freshState(); old.version = 4; delete old.streak.visitorBoostUntil;
  assert.equal(M.restoreState(old).streak.visitorBoostUntil, 0);
  const s = M.freshState(); for (let i = 0; i < 6; i++) M.rewardHarvestStreak(s); s.time = 7;
  const loaded = M.restoreState(M.saveData(s)); assert.equal(loaded.version, M.STATE_VERSION); assert.equal(M.visitorRushSeconds(loaded), 13);
  loaded.paused = true; M.update(loaded, 30); assert.equal(M.visitorRushSeconds(loaded), 13, "tea break pauses the countdown");
  s.streak.visitorBoostUntil = 1e9; assert.equal(M.visitorRushSeconds(M.restoreState(s)), 20);
});
