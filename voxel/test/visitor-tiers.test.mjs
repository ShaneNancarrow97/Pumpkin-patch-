// The visitor-frequency upgrades: more tiers, cheap at first and dearer each
// time, each doing a little less; old saves keep their tiers and lose nothing.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { LEVELS as LEVEL_TABLE } from "../src/rules/levels.js";
// Earnings that reach a level, wherever the thresholds are set.
const at = (n) => LEVEL_TABLE[n - 1].at;

const SIGN = M.UPGRADES.find((u) => u.id === "sign"), LIGHTS = M.VISITOR_UPGRADES.find((u) => u.id === "lights");

test("Spread the word and Fairy lights start at tens of pounds and get dearer every tier", () => {
  for (const costs of [SIGN.costs, LIGHTS.costs]) {
    for (let i = 1; i < costs.length; i++) assert.ok(costs[i] > costs[i - 1] * 2.5, `tier ${i + 1} is clearly dearer`);
  }
  assert.ok(SIGN.costs[0] < 100 && SIGN.costs[1] < 200, "the first two are a few minutes' takings");
  assert.ok(LIGHTS.costs[0] <= 200);
  assert.equal(SIGN.costs.length, 5); assert.equal(LIGHTS.costs.length, 4);
  assert.equal(SIGN.max, 5);
  const s = M.freshState(); s.coins = 1e7; s.earned = 2e6; s.progression.claimed = M.LEVELS.map((l) => l.level); 
  SIGN.costs.forEach((price, level) => { assert.equal(M.upgradeCost(s, "sign"), price); const c = s.coins; M.buyUpgrade(s, "sign"); assert.equal(c - s.coins, price); assert.equal(s.upgrades.sign, level + 1); });
  assert.equal(M.upgradeCost(s, "sign"), undefined);
});

test("each tier does a little less than the one before", () => {
  for (const steps of [SIGN.steps, M.LIGHTS]) {
    const gaps = steps.map((_, n) => 21 * M.tierFactor(steps, n) - 21 * M.tierFactor(steps, n + 1));
    for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] < gaps[i - 1], `tier ${i + 1} saves less time than tier ${i}`);
  }
  // Neither path alone, nor both together, gets silly.
  const s = M.freshState(); s.upgrades.sign = 5; s.visitorUpgrades.lights = 4;
  assert.ok(M.stallArrivalSeconds(s) > M.ARRIVAL_FLOOR.stall);
  assert.ok(M.shopArrivalSeconds(s) > M.ARRIVAL_FLOOR.shop);
});

test("the Shop sheet's figures: a fresh farm, then one tier of each", () => {
  const s = M.freshState();
  assert.equal(M.stallArrivalSeconds(s), 21);
  s.upgrades.sign = 1; assert.ok(Math.abs(M.stallArrivalSeconds(s) - 21 * SIGN.steps[0]) < 1e-9);
  s.visitorUpgrades.lights = 1; assert.ok(Math.abs(M.stallArrivalSeconds(s) - 21 * SIGN.steps[0] * M.LIGHTS[0]) < 1e-9);
  assert.equal(M.visitorUpgradeCost(s, "lights"), LIGHTS.costs[1]);
});

test("old saves keep their tiers, and are never slower than before", () => {
  // The old rules: Spread the word ×0.9 a tier, Fairy lights ×0.88, four tiers each.
  for (let n = 0; n <= 4; n++) {
    const s = M.freshState(); s.upgrades.sign = n; s.visitorUpgrades.lights = n;
    const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
    assert.equal(loaded.upgrades.sign, n); assert.equal(loaded.visitorUpgrades.lights, n);
    assert.ok(M.stallArrivalSeconds(loaded) <= 21 * 0.9 ** n * 0.88 ** n + 1e-9, `tier ${n}`);
    assert.ok(M.shopArrivalSeconds(loaded) <= 3 * 0.9 ** n + 1e-9);
  }
  // A save at the old maximum has one more Spread the word to buy, and the lights are done.
  const old = M.freshState(); old.upgrades.sign = 4; old.visitorUpgrades.lights = 4; old.coins = 1e6; old.earned = 2e6; old.progression.claimed = M.LEVELS.map((l) => l.level);
  const loaded = M.restoreState(old);
  assert.equal(M.upgradeCost(loaded, "sign"), SIGN.costs[4]); assert.ok(M.buyUpgrade(loaded, "sign"));
  assert.equal(M.buyVisitorUpgrade(loaded, "lights"), false);
});

test("restoreState holds tiers to the new maxima, version 1 saves included", () => {
  const s = M.freshState(); s.upgrades.sign = 99; s.visitorUpgrades.lights = 40; s.upgrades.tools = 9;
  const loaded = M.restoreState(s);
  assert.equal(loaded.upgrades.sign, 5); assert.equal(loaded.visitorUpgrades.lights, 4); assert.equal(loaded.upgrades.tools, 6);
  const v1 = M.freshState(); delete v1.version; v1.upgrades = { tools: 2, helper: 1, plots: 1, signs: 6 };
  const migrated = M.restoreState(v1);
  assert.equal(migrated.upgrades.sign, 5); assert.equal(migrated.upgrades.auto, 1);
  const neg = M.freshState(); neg.upgrades.sign = -3; neg.visitorUpgrades.lights = 2.5;
  assert.equal(M.restoreState(neg).upgrades.sign, 0); assert.equal(M.restoreState(neg).visitorUpgrades.lights, 0);
});

test("level gifts still give a real tier, and coins when that upgrade is already at its maximum", () => {
  for (const level of M.LEVELS) for (const r of level.rewards.filter((x) => x.kind === "upgrade")) {
    assert.equal(M.UPGRADES.find((u) => u.id === r.id).max, r.max, `${r.id}'s gift knows its maximum`);
  }
  const gift = M.freshState(); gift.earned = at(4); gift.progression.claimed = [1, 2, 3];
  M.awardLevels(gift); assert.equal(gift.upgrades.tools, 1);
  const full = M.freshState(); full.earned = at(4); full.progression.claimed = [1, 2, 3]; full.upgrades.tools = 6;
  const coins = full.coins; M.awardLevels(full);
  assert.equal(full.upgrades.tools, 6); assert.equal(full.coins, coins + 100 + 100);
  assert.equal(full.progression.receipts[4][1].duplicate, true);
  // Buying the frequency tiers doesn't disturb a gift.
  const both = M.freshState(); both.coins = 1e6; both.earned = 2e6; both.progression.claimed = M.LEVELS.map((l) => l.level); while (M.buyUpgrade(both, "sign")); both.earned = at(4); both.progression.claimed = [1, 2, 3];
  M.awardLevels(both); assert.equal(both.upgrades.sign, 5); assert.equal(both.upgrades.tools, 1);
});
