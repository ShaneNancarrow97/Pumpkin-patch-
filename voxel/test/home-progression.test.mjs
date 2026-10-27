import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

// A completed legacy household is useful when testing later milestones alone.
const reached = (level, legacy = 1) => {
  const s = M.freshState(); s.earned = M.LEVELS[level - 1].at;
  s.progression.homeLegacyThrough = legacy; s.coins = 100000;
  return s;
};
test("twenty levels combine earned income and the next useful home task", () => {
  assert.equal(M.LEVELS.length, 20);
  const s = reached(5);
  assert.equal(M.patchLevel(s).level, 2); assert.equal(M.patchLevel(s).blocked, true);
  assert.equal(M.homeGoal(s).action, "home");
  assert.equal(M.recordHomeActivity(s, "visit"), true);
  assert.equal(M.patchLevel(s).level, 4);
  assert.equal(M.patchLevel(s).requirements[0].action, "upgrade-house");
  const earned = s.earned, coins = s.coins;
  assert.ok(M.upgradeHouse(s));
  assert.equal(s.coins, coins - 650); assert.equal(s.earned, earned);
  assert.equal(M.patchLevel(s).level, 5); assert.equal(M.patchLevel(s).blocked, false);
});
test("earned income is banked at a blocked milestone without granting its reward", () => {
  const s = reached(5); M.recordHomeActivity(s, "visit");
  const xp = M.levelEarnings(s); assert.deepEqual(M.awardLevels(s), [2, 3, 4]);
  assert.equal(M.levelEarnings(s), xp); assert.ok(!s.progression.claimed.includes(5));
  M.upgradeHouse(s); const coins = s.coins;
  assert.deepEqual(M.awardLevels(s), [5]); assert.equal(s.coins, coins + 150);
  assert.deepEqual(M.awardLevels(s), []);
});
test("already awarded home milestones do not regress when furniture is stored", () => {
  const s = reached(7, 6); s.house.placed.push({ instance: "third", id: "d03", room: "parlour", books: [] }, { instance: "fourth", id: "d01", room: "parlour", books: [] });
  assert.ok(M.awardLevels(s).includes(7));
  s.house.placed = []; assert.equal(M.patchLevel(s).level, 7);
  const restored = M.restoreState(M.saveData(s)); assert.equal(M.patchLevel(restored).level, 7);
});
test("version13 saves retain their earned level and rewards but new levels need home goals", () => {
  const old = reached(20); old.version = 13;
  old.earned = 110000; old.progression.claimed = Array.from({ length: 12 }, (_, i) => i + 1);
  delete old.progression.homeActivities; delete old.progression.homeLegacyThrough; delete old.progression.homeVersion;
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(old))));
  assert.equal(loaded.version, 14); assert.equal(M.patchLevel(loaded).level, 12);
  assert.equal(loaded.progression.homeLegacyThrough, 12); assert.deepEqual(M.awardLevels(loaded), []);
  assert.equal(loaded.coins, old.coins); loaded.earned = M.LEVELS[12].at;
  assert.equal(M.patchLevel(loaded).level, 12); assert.equal(M.homeGoal(loaded).action, "recipes");
});
test("home activity survives saves, rejects malformed counts and never gives money or XP", () => {
  const s = M.freshState(); const coins = s.coins, earned = s.earned;
  assert.equal(M.recordHomeActivity(s, "unknown"), false); s.paused = true;
  assert.equal(M.recordHomeActivity(s, "visit"), false); s.paused = false;
  M.recordHomeActivity(s, "visit"); M.recordHomeActivity(s, "wardrobe");
  const r = M.restoreState(M.saveData(s)); assert.deepEqual(r.progression.homeActivities, s.progression.homeActivities);
  assert.equal(s.coins, coins); assert.equal(s.earned, earned);
  const raw = M.saveData(s); raw.progression.homeActivities = { visit: Infinity, wardrobe: -8, cook: 2.5, decorate: 3 };
  const repaired = M.restoreState(raw); assert.equal(repaired.progression.homeActivities.visit, 0); assert.equal(repaired.progression.homeActivities.decorate, 3);
});
test("home cooking milestones count finished paid home batches, never truck cooking", () => {
  const s = reached(11, 10); s.house.level = 2; assert.ok(M.buyFoodTruck(s));
  s.visitorTimer = s.bigSpender.timer = s.shop.arrivalTimer = 1e6;
  assert.ok(M.buyCookingEquipment(s, "kitchen-hob")); assert.ok(M.buyCookingEquipment(s, "kitchen-pan-rail"));
  s.stock[0] = 2; s.kitchen.pantry.butter = 2;
  assert.ok(M.startCooking(s, "wedges", "truck")); M.update(s, 31);
  assert.equal(s.progression.homeActivities.cook, 0); assert.equal(M.patchLevel(s).level, 10);
  assert.ok(M.startCooking(s, "wedges", "home")); assert.equal(s.progression.homeActivities.cook, 0);
  M.update(s, 31); assert.equal(s.progression.homeActivities.cook, 1); assert.equal(M.patchLevel(s).level, 11);
});
test("late home goals require useful placed kitchen equipment and a furnished whole house", () => {
  const s = reached(20, 12); s.progression.claimed = M.LEVELS.slice(0, 19).map(l => l.level);
  s.house.level = 3; s.house.placed = Array.from({ length: 12 }, (_, i) => ({ instance: "test-" + i, id: "d03", room: ["parlour", "bedroom", "kitchen", "attic"][i % 4], books: [] }));
  assert.equal(M.patchLevel(s).level, 20); s.house.placed = s.house.placed.filter(p => p.room !== "attic");
  assert.equal(M.patchLevel(s).level, 19); assert.equal(M.homeGoal(s).requirements.find(r => r.id === "four-rooms").met, false);
});
