import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { NODES } from "../src/content/village.js";
import { QUESTS } from "../src/content/village-quests.js";
import { villageDecorContains } from "../src/rules/village-decor-geometry.js";

function invited() {
  const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[2].at; M.awardLevels(s);
  M.inviteToVillage(s); M.finishTour(s); M.finishTalk(s, "invitation", "rowan"); M.finishTalk(s, "invitation", "elowen");
  return s;
}
const reload = (s) => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
const done = (s, id) => { s.village.quests[id] = { step: QUESTS.find((q) => q.id === id).steps.length, base: null, done: true }; };
function workshop() {
  const s = invited(); s.village.unlocks.push("stall"); done(s, "rowan-stall"); done(s, "rowan-2");
  s.coins = 3000; Object.assign(s.village.materials, { logs: 40, stone: 40, fibre: 40, herbs: 40 }); return s;
}
// The whole home chain uses real gathering waits, deliveries and reward rules.
function gather(s, material, need) {
  for (let round = 0; s.village.materials[material] < need && round < 30; round++) {
    for (const n of NODES.filter((n) => n.district === "green" && n.material === material)) M.gatherNode(s, n.id);
    if (s.village.materials[material] < need) M.updateVillage(s, 240);
  }
  assert.ok(s.village.materials[material] >= need, material);
}
function deliver(s, id) {
  const step = M.questStep(s, id);
  for (const [material, need] of Object.entries(step.cost)) gather(s, material, need);
  assert.ok(M.doHandOver(s, step.who, id));
}

test("Rowan upgrades charge exactly once, enforce restoration and preserve the farm economy", () => {
  const s = invited(); s.coins = 3000; s.village.materials.fibre = 40;
  assert.equal(M.buyVillageUpgrade(s, "satchel-pockets"), false);
  s.village.unlocks.push("stall"); done(s, "rowan-stall");
  const before = { coins: s.coins, earned: s.earned, level: M.levelEarnings(s), fibre: s.village.materials.fibre };
  assert.equal(M.buyVillageUpgrade(s, "satchel-pockets"), true);
  assert.equal(s.coins, before.coins - 120); assert.equal(s.village.materials.fibre, before.fibre - 4);
  assert.equal(s.earned, before.earned); assert.equal(M.levelEarnings(s), before.level);
  assert.equal(M.villageMaterialCapacity(s), 60);
  const after = JSON.stringify(M.saveData(s));
  assert.equal(M.buyVillageUpgrade(s, "satchel-pockets"), false); assert.equal(JSON.stringify(M.saveData(s)), after);
  assert.equal(M.buyVillageUpgrade(s, "satchel-frame"), false, "Rowan's completed home is required");
  done(s, "rowan-2"); s.village.materials.logs = 6; s.paused = true;
  assert.equal(M.buyVillageUpgrade(s, "satchel-frame"), false); s.paused = false;
  assert.equal(M.buyVillageUpgrade(s, "satchel-frame"), true); assert.equal(M.villageMaterialCapacity(s), 80);
});

test("gathering upgrades have bounded rates, leave full nodes intact and survive older save shape", () => {
  const s = workshop(), node = NODES.find((n) => n.material === "logs" && n.district === "green");
  assert.equal(M.buyVillageUpgrade(s, "gathering-straps"), false, "the earlier kit is required");
  assert.ok(M.buyVillageUpgrade(s, "gathering-kit")); assert.ok(M.buyVillageUpgrade(s, "gathering-straps"));
  s.village.materials.logs = 38;
  const got = M.gatherNode(s, node.id); assert.equal(got.amount, 2, "last partial pile stops at capacity");
  assert.equal(s.village.nodes[node.id], 153); assert.equal(M.villageGatheringYield(s, "fibre"), 1);
  assert.equal(M.villageGatheringWait(s, "hardwood"), 480, "future district economy stays unchanged");
  M.updateVillage(s, 152); assert.equal(M.nodeReady(s, node.id), false); M.updateVillage(s, 1);
  assert.equal(M.gatherNode(s, node.id).full, true); assert.equal(M.nodeReady(s, node.id), true);
  s.village.materials.logs = 20; assert.equal(M.gatherNode(s, node.id).amount, 3);
  assert.ok(M.buyVillageUpgrade(s, "satchel-pockets")); s.village.materials.logs = 57;
  const back = reload(s); assert.equal(back.village.materials.logs, 57); assert.equal(M.villageMaterialCapacity(back), 60);
  assert.equal(M.villageGatheringYield(back, "logs"), 3); assert.equal(M.buyVillageUpgrade(back, "gathering-kit"), false);
  const old = M.saveData(invited()); delete old.village.effects;
  assert.equal(M.villageMaterialCapacity(M.restoreState(old)), 40);
});

test("recipe gifts survive an unpurchased kitchen save and the later food truck purchase", () => {
  let s = invited(); M.addFriendship(s, "elowen", 60);
  assert.ok(s.kitchen.recipes.includes("ghost-cookies")); assert.equal(s.kitchen.purchased, false);
  s = reload(s); assert.ok(s.kitchen.recipes.includes("ghost-cookies"));
  s.house.level = 1; s.earned = M.LEVELS[4].at + s.progression.bonusEarned; M.awardLevels(s); s.coins = 2000;
  assert.ok(M.buyFoodTruck(s)); assert.deepEqual(s.kitchen.recipes, ["wedges", "ghost-cookies"]);
  assert.ok(reload(s).kitchen.recipes.includes("ghost-cookies"));
});

test("saved food favours wait for a usable recipe and reserved meals cannot be gifted", () => {
  const s = invited(); s.kitchen.recipes.push("ghost-cookies"); s.village.favours.elowen.id = "e-cookies";
  assert.notEqual(M.favourOf(s, "elowen").id, "e-cookies", "a pre-truck gifted recipe cannot block the resident");
  s.village.favours.rowan.id = "r-apples"; s.kitchen.pantry.apples = 0;
  assert.equal(M.favourOf(s, "rowan").id, "r-apples", "using up an ingredient does not reroll an accepted favour");
  s.kitchen.purchased = true; s.kitchen.recipes.push("pumpkin-pie"); s.village.favours.rowan.id = "r-pie";
  assert.notEqual(M.favourOf(s, "rowan").id, "r-pie", "recipe level also matters");
  s.kitchen.food["ghost-cookies"] = 2; s.kitchen.foodHolds.push({ owner: "customer-1", recipe: "ghost-cookies", quantity: 2, price: 4 });
  assert.equal(M.villageItemCount(s, "food:ghost-cookies"), 0);
  assert.equal(M.giftable(s).some((g) => g.item === "food:ghost-cookies"), false);
  assert.equal(M.giveGift(s, "elowen", "food:ghost-cookies"), null);
  s.village.favours.elowen.id = "e-cookies";
  assert.equal(M.doFavour(s, "elowen"), null); assert.equal(s.kitchen.food["ghost-cookies"], 2);
});

test("quest handovers select the requested chapter and show individual missing resources", () => {
  const s = invited(); done(s, "elowen-1"); s.village.friends.elowen.xp = 120;
  M.startQuest(s, "elowen-moonlight"); M.startQuest(s, "elowen-2");
  Object.assign(s.village.materials, { logs: 18, stone: 13, fibre: 6, herbs: 2 });
  assert.equal(M.questRequirementRows(s, "elowen-2").find((r) => r.key === "stone").complete, false);
  assert.equal(M.doHandOver(s, "elowen", "elowen-2"), null); s.village.materials.stone++;
  assert.ok(M.doHandOver(s, "elowen", "elowen-2"), "an older unfilled pumpkin request does not block this delivery");
  assert.equal(M.questStep(s, "elowen-moonlight").kind, "give"); assert.equal(M.questStep(s, "elowen-2").kind, "pay");
});

test("decoration transforms reject invalid and rounded collisions; undo conserves later rewards", () => {
  const s = invited(); s.village.decor.owned.stool = 2;
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(M.villageDecorFits(s, "stool", bad, 24), false);
    assert.equal(M.placeVillageDecor(s, "stool", 21, 24, bad), null);
  }
  const first = M.placeVillageDecor(s, "stool", 21, 24, 10).piece;
  assert.equal(M.villageDecorFits(s, "stool", 21.806, 24), true);
  assert.equal(M.placeVillageDecor(s, "stool", 21.806, 24), null, "rounding across the required gap cannot sneak through");
  const snapshot = structuredClone(s.village.decor), stats = s.village.stats.placed;
  assert.ok(M.moveVillageDecor(s, first.instance, 21, 30, 90));
  M.grantVillage(s, [{ kind: "village-decor", id: "stool", amount: 1 }]);
  const next = s.village.decor.next; assert.ok(M.restoreVillageDecor(s, snapshot));
  assert.equal(s.village.decor.owned.stool, 2); assert.equal(s.village.decor.placed[0].z, 24);
  assert.equal(s.village.stats.placed, stats); assert.equal(s.village.decor.next, next);
  assert.equal(M.restoreVillageDecor(s, { placed: [{ ...first, x: 87, z: 18 }] }), false);
  assert.equal(s.village.decor.placed[0].z, 24, "invalid undo is atomic");
  assert.equal(villageDecorContains("moth-lantern-string", 21, 24, 90, 21, 25, .32), true);
  assert.equal(villageDecorContains("moth-lantern-string", 21, 24, 90, 22, 24, .32), false);
});

test("almanac duties and prizes pay once across saving and never increase retail progression", () => {
  let s = invited(); s.village.unlocks.push("almanac");
  s.village.almanac.page = [{ id: "gather", base: 0, done: false }, { id: "chat", base: 0, done: false }, { id: "gift", base: 0, done: false }, { id: "decorate", base: 0, done: false }];
  const earnings = M.levelEarnings(s), coins = s.coins;
  s.village.stats.gathered = 8; M.updateVillage(s, .1); assert.equal(s.coins, coins + 50);
  s = reload(s); M.updateVillage(s, .1); assert.equal(s.coins, coins + 50);
  Object.assign(s.village.stats, { chats: 2, gifts: 1, placed: 1 });
  const events = M.updateVillage(s, .1); assert.equal(events.filter((e) => e.type === "almanac-page").length, 1);
  assert.equal(s.village.almanac.pages, 1); assert.equal(s.village.decor.owned["flower-barrow"], 1);
  const paid = s.coins; s = reload(s); M.updateVillage(s, .1);
  assert.equal(s.coins, paid); assert.equal(s.village.almanac.pages, 1); assert.equal(M.levelEarnings(s), earnings);
});

test("both Green restorations reach a playable first supper with the existing farm cooking rules", () => {
  const s = invited(); s.coins = 6000;
  M.startQuest(s, "rowan-1"); gather(s, "logs", 4); gather(s, "stone", 2); deliver(s, "rowan-1");
  M.startQuest(s, "rowan-stall"); gather(s, "fibre", 3); deliver(s, "rowan-stall"); assert.ok(M.doHandOver(s, "rowan", "rowan-stall"));
  M.startQuest(s, "rowan-2"); deliver(s, "rowan-2"); assert.ok(M.doHandOver(s, "rowan", "rowan-2"));
  assert.equal(s.village.built["rowan-workshop"], true); M.finishTalk(s, "rowan-2", "rowan");
  M.startQuest(s, "elowen-1"); for (const id of ["page-3", "page-2", "page-1"]) M.findObject(s, id); M.finishTalk(s, "elowen-1", "elowen");
  M.startQuest(s, "elowen-2"); deliver(s, "elowen-2"); assert.ok(M.doHandOver(s, "elowen", "elowen-2"));
  assert.equal(s.village.built["elowen-conservatory"], true); assert.ok(M.buyFromStall(s, "village:stool"));
  assert.ok(M.placeVillageDecor(s, "moth-lamp", 74.4, 36.9));
  assert.ok(M.placeVillageDecor(s, "stool", 80.1, 37.2));
  assert.ok(M.placeVillageDecor(s, "reading-stand", 74.1, 33.9)); M.finishTalk(s, "elowen-2", "elowen");
  s.house.level = 1; s.earned = M.LEVELS[4].at + s.progression.bonusEarned; M.awardLevels(s);
  assert.equal(M.questStatus(s, "two-doorbells"), "offered"); M.startQuest(s, "two-doorbells");
  s.stock[0] = 11; assert.ok(M.doHandOver(s, "elowen", "two-doorbells"));
  assert.match(M.questStepHint(s, "two-doorbells"), /level 5/);
  assert.ok(M.buyFoodTruck(s)); s.kitchen.pantry.butter = 1;
  assert.ok(M.startCooking(s, "wedges")); M.updateKitchen(s, 30, []); M.advanceQuests(s);
  assert.equal(M.questStep(s, "two-doorbells").kind, "talk");
  assert.ok(M.finishTalk(s, "two-doorbells", "rowan").some((e) => e.type === "quest-done"));
  assert.equal(M.questStatus(reload(s), "two-doorbells"), "done");
  assert.equal(M.districtOpen(s, "copse"), false, "finishing the chapter does not open empty future districts");
});
