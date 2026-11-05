import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
// Earnings that reach a level, wherever the thresholds are set.
const at = (n) => M.LEVELS[n - 1].at;

test("level boundaries, rewards and maximum progress share one source", () => {
  const s = M.freshState();
  s.progression.homeActivities = { visit: 1, wardrobe: 1, cook: 10 }; s.house.level = 3; s.village.quests.invitation = { step: 3, base: null, done: true };
  s.house.wallpapers.parlour = "w01"; s.kitchen.recipes = M.RECIPES.map(r => r.id);
  s.house.placed = Array.from({ length: 12 }, (_, i) => ({ id: i === 0 ? "copper-range" : i === 1 ? "gothic-spice-cabinet" : "d03", room: ["kitchen", "kitchen", "parlour", "bedroom", "attic"][i % 5], books: i === 2 ? ["b01", "b02", "b03", "b04", "b05", "b06"] : [] }));
  for (const milestone of M.LEVELS.slice(1)) {
    s.earned = milestone.at - 1; assert.equal(M.patchLevel(s).level, milestone.level - 1);
    s.earned++; assert.equal(M.patchLevel(s).level, milestone.level);
    for (const r of milestone.rewards) {
      if (r.kind === "decor") assert.ok(M.decorById[r.id]);
      if (r.kind === "costume") assert.ok(M.costumeById[r.id]);
      if (r.kind === "upgrade") assert.ok(M.UPGRADES.find((u) => u.id === r.id && u.max === r.max));
    }
  }
  assert.equal(M.patchLevel(s).progress, 1);
});

test("a level grants real items once, without reward coins earning another level", () => {
  const s = M.freshState(); s.earned = at(2) - 1;
  assert.deepEqual(M.awardLevels(s), []);
  s.earned = at(2); const before = s.coins;
  assert.deepEqual(M.awardLevels(s), [2]);
  assert.equal(s.coins, before + 35); assert.ok(s.house.owned.includes("d03"));
  assert.equal(M.patchLevel(s).xp, at(2)); assert.equal(M.patchLevel(s).progress, 0);
  assert.deepEqual(M.awardLevels(s), []); assert.equal(s.coins, before + 35);
  assert.equal(M.dismissLevel(s, 3), false); assert.equal(M.dismissLevel(s, 2), true);
  assert.deepEqual(s.progression.pending, []);
});

test("skipping levels queues every reward, including usable costumes and upgrades", () => {
  const s = M.freshState(); s.earned = at(12);
  s.progression.homeLegacyThrough = 12;
  assert.equal(M.awardLevels(s).length, 11);
  assert.equal(s.upgrades.tools, 1); assert.equal(s.upgrades.yield, 1);
  assert.ok(M.wearCostume(s, "natalie-freddy")); assert.ok(M.wearCostume(s, "shane-jason"));
  const saved = JSON.parse(JSON.stringify(M.saveData(s))), loaded = M.restoreState(saved);
  assert.deepEqual(loaded.progression, s.progression);
  assert.deepEqual(M.awardLevels(loaded), []); assert.equal(loaded.coins, s.coins);
  assert.equal(M.patchLevel(loaded).xp, at(12));
});

test("owned rewards become honest coin receipts, and paused patches do not award", () => {
  const s = M.freshState(); s.earned = at(2); s.house.owned.push("d03"); s.paused = true;
  assert.deepEqual(M.awardLevels(s), []); s.paused = false; M.awardLevels(s);
  assert.equal(s.coins, 40 + 35 + 50); assert.equal(s.progression.receipts[2][1].duplicate, true);
  assert.equal(M.patchLevel(s).xp, at(2));
});

test("version 3 saves retain progress without replaying historical celebrations", () => {
  const old = M.freshState(); old.version = 3; old.earned = 4500; delete old.progression;
  const loaded = M.restoreState(old);
  assert.equal(loaded.version, M.STATE_VERSION); assert.equal(M.patchLevel(loaded).level, 6);
  assert.deepEqual(loaded.progression.pending, []); assert.deepEqual(M.awardLevels(loaded), []);
  assert.equal(loaded.coins, old.coins);
  loaded.earned = at(7); assert.deepEqual(M.awardLevels(loaded), []);
  loaded.house.owned.push("d01", "d03"); M.placeDecor(loaded, "d01", "parlour"); M.placeDecor(loaded, "d03", "parlour");
  assert.deepEqual(M.awardLevels(loaded), [7]);
});

test("outdoor base frequency is fifteen seconds; Spread the word has five tiers and Fairy lights six", () => {
  const s = M.freshState(); s.coins = 1e7; s.earned = 2e6; s.progression.claimed = M.LEVELS.map((l) => l.level); 
  assert.equal(M.stallArrivalSeconds(s), 15); assert.equal(M.shopArrivalSeconds(s), 2.5);
  for (let i = 0; i < 5; i++) assert.ok(M.buyUpgrade(s, "sign"));
  assert.equal(M.buyUpgrade(s, "sign"), false);
  for (let i = 0; i < 6; i++) assert.ok(M.buyVisitorUpgrade(s, "lights"));
  assert.equal(M.buyVisitorUpgrade(s, "lights"), false);
  assert.equal(s.upgrades.sign, 5); assert.equal(s.visitorUpgrades.lights, 6);
  const sign = M.UPGRADES.find((u) => u.id === "sign").steps;
  assert.ok(Math.abs(M.stallArrivalSeconds(s) - 15 * M.tierFactor(sign, 5) * M.tierFactor(M.LIGHTS, 6)) < 1e-8);
  assert.ok(M.stallArrivalSeconds(s) > 4.5 && M.stallArrivalSeconds(s) < 5, "about five seconds, fully upgraded");
  const loaded = M.restoreState(M.saveData(s));
  assert.equal(loaded.upgrades.sign, 5); assert.equal(loaded.visitorUpgrades.lights, 6);
});

test("the slower pace keeps every level an older save reached, and fills its bar from there", () => {
  const old = M.freshState(); old.earned = 45000; old.progression.claimed = Array.from({ length: 10 }, (_, i) => i + 1); old.progression.homeLegacyThrough = 12;
  const raw = JSON.parse(JSON.stringify(M.saveData(old))); delete raw.progression.pace; delete raw.progression.floorFrom;
  const loaded = M.restoreState(raw), p = M.patchLevel(loaded);
  assert.equal(p.level, 10, "level 10 is kept, though the new pace asks more for it");
  assert.equal(p.next.at, M.LEVELS[10].at); assert.ok(p.next.at > M.LEGACY_LEVEL_AT[10] * 1.8, "level 11 asks about twice what it did");
  assert.equal(p.progress, 0, "its bar starts empty where the save was");
  loaded.earned = (45000 + p.next.at) / 2; assert.ok(Math.abs(M.patchLevel(loaded).progress - .5) < 1e-9, "and fills on the way to the next");
  assert.deepEqual(M.awardLevels(loaded), [], "no level is given again or taken away");
  const fresh = M.freshState(); fresh.earned = 42000; fresh.progression.homeLegacyThrough = 12;
  assert.equal(M.patchLevel(fresh).level, 8, "a new game needs more for each level");
  const again = M.restoreState(JSON.parse(JSON.stringify(M.saveData(loaded))));
  assert.equal(M.patchLevel(again).level, 10, "the new pace saves and loads");
  assert.equal(again.progression.pace, M.LEVEL_PACE);
});

test("the longer road to level 3 keeps every level a save reached at the earlier pace", () => {
  const old = M.freshState(); old.earned = 1500; old.progression.claimed = [1, 2, 3];
  const raw = JSON.parse(JSON.stringify(M.saveData(old))); raw.progression.pace = 2; raw.progression.floorLevel = 1; raw.progression.floorFrom = 0;
  const loaded = M.restoreState(raw), p = M.patchLevel(loaded);
  assert.equal(p.level, 3, "level 3, reached at £1,500, is kept though it now asks more");
  assert.equal(p.progress, 0, "its bar starts where the save was");
  loaded.earned = (1500 + p.next.at) / 2; assert.ok(Math.abs(M.patchLevel(loaded).progress - .5) < 1e-9, "and fills on the way to level 4");
  assert.equal(loaded.progression.pace, M.LEVEL_PACE);
  assert.deepEqual(M.awardLevels(loaded), [], "no level is given again or taken away");
  const again = M.restoreState(JSON.parse(JSON.stringify(M.saveData(loaded))));
  assert.equal(M.patchLevel(again).level, 3, "and keeps it through another save");
  const fresh = M.freshState(); fresh.earned = 1500; M.recordHomeActivity(fresh, "visit");
  assert.equal(M.patchLevel(fresh).level, 2, "a new farm needs more for level 3");
  assert.ok(M.LEVELS[2].at >= M.PACE2_LEVEL_AT[2] * 2.5, "about two and a half times what it asked");
  fresh.earned = M.LEVELS[2].at; assert.equal(M.patchLevel(fresh).level, 3);
  for (let i = 1; i < M.LEVELS.length; i++) assert.ok(M.LEVELS[i].at > M.LEVELS[i - 1].at, "every level asks more than the one before");
});
