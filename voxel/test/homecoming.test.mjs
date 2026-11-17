import test from "node:test";
import assert from "node:assert/strict";
import { HOME_BONDS, SECRET_LOOKS, SECRET_LOOK_IDS } from "../src/content/homecoming.js";
import { homecomingInfo, awardHomecomingLooks } from "../src/rules/homecoming.js";

const fresh = () => ({
  paused: false, coins: 120, earned: 220,
  looks: { natalie: "olive", shane: "black", owned: ["olive", "black"] },
  wardrobe: { equipped: { natalie: "natalie-base", shane: "shane-base" } },
  progression: { homeActivities: { cook: 0 } },
  village: { claims: {}, expansion: { effects: [], chapters: {}, economy: { herbsProcessed: 0, treatments: 0, commissions: {} } } },
  hayride: { completed: 0, haunts: { owned: [] } },
});
function qualify(s, id) {
  const e = s.village.expansion;
  if (id === "botanist") { e.effects.push("herb-beds"); e.economy.herbsProcessed = 6; e.economy.treatments = 3; }
  if (id === "midnight-host") { e.chapters["restaurant-opening"] = true; s.progression.homeActivities.cook = 3; e.economy.commissions["cinder-first-supper"] = { done: 3, remaining: 120 }; }
  if (id === "ghostlight") { e.chapters["moor-stage"] = true; s.hayride.haunts.owned.push("turning-scarecrows"); s.hayride.completed = 25; }
  return s;
}
const info = (s, id) => homecomingInfo(s).find(bond => bond.id === id);
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test("a homecoming is one named pair of base-sprite colours, never a purchasable outfit", () => {
  assert.equal(SECRET_LOOKS.length, 6);
  assert.equal(new Set(SECRET_LOOK_IDS).size, 6);
  for (const bond of HOME_BONDS) {
    const looks = SECRET_LOOKS.filter(look => bond.lookIds.includes(look.id));
    assert.deepEqual(looks.map(look => look.character).sort(), ["natalie", "shane"]);
    assert.ok(looks.every(look => look.secret === true && !Object.hasOwn(look, "price")));
    assert.ok(looks.every(look => Number.isInteger(look[look.character === "natalie" ? "sweater" : "beanie"])));
    assert.ok(bond.steps.some(step => step.world === "farm") && bond.steps.some(step => step.world === "village"));
  }
});

test("the shared status is read-only, reports the next real work and never leaks mutable content", () => {
  const s = qualify(fresh(), "botanist");
  s.village.expansion.economy.treatments = 2;
  const before = structuredClone(s);
  freeze(s);
  const rows = homecomingInfo(s), row = rows.find(bond => bond.id === "botanist");
  assert.equal(row.ready, false);
  assert.deepEqual(row.steps.map(step => [step.have, step.need, step.complete]), [[1, 1, true], [6, 6, true], [2, 3, false]]);
  row.lookIds.push("edited-ui-array"); row.steps[0].have = 999;
  assert.deepEqual(s, before);
  assert.equal(info(s, "botanist").lookIds.length, 2);
  assert.equal(info(s, "botanist").steps[0].have, 1);
});

test("farm wealth, harvest spam and existing costume ownership cannot buy a hidden pair", () => {
  const s = fresh();
  s.coins = s.earned = s.harvested = s.sold = 1e12;
  s.wardrobe.owned = ["natalie-mummy", "shane-scarecrow"];
  s.hayride.completed = 1e6;
  s.progression.homeActivities.cook = 1e6;
  const before = structuredClone(s);
  assert.deepEqual(awardHomecomingLooks(s), []);
  assert.ok(homecomingInfo(s).every(bond => !bond.ready && !bond.owned));
  assert.deepEqual(s, before);
});

test("every bond requires both the village discovery and its farm follow-through", () => {
  for (const id of HOME_BONDS.map(bond => bond.id)) {
    const s = qualify(fresh(), id), e = s.village.expansion;
    e.effects = []; e.chapters = {};
    assert.equal(info(s, id).ready, false, `${id} cannot be earned only on the farm`);
    const villageOnly = qualify(fresh(), id);
    villageOnly.progression.homeActivities.cook = 0;
    villageOnly.village.expansion.economy.herbsProcessed = 0;
    villageOnly.hayride.completed = 0;
    assert.equal(info(villageOnly, id).ready, false, `${id} needs hands-on follow-through`);
    assert.equal(info(qualify(fresh(), id), id).ready, true);
  }
});

test("the commission reward counts actual Cinder stew deliveries, not arbitrary food or income", () => {
  const s = qualify(fresh(), "midnight-host"), economy = s.village.expansion.economy;
  economy.commissions = { "cinder-pastry-table": { done: 99 }, "granny-pudding-parcel": { done: 99 } };
  economy.portions = 1000; economy.income = 100000;
  assert.equal(info(s, "midnight-host").ready, false);
  economy.commissions["cinder-first-supper"] = { done: 2 };
  assert.equal(info(s, "midnight-host").steps.at(-1).have, 2);
  economy.commissions["cinder-first-supper"].done = 3;
  assert.equal(info(s, "midnight-host").ready, true);
});

test("eligible legacy play grants both looks once without changing selections, economy or level progress", () => {
  const s = fresh();
  HOME_BONDS.forEach(bond => qualify(s, bond.id));
  delete s.village.claims;
  s.looks.natalie = "plum"; s.looks.shane = "moss";
  s.looks.owned.push("plum", "moss");
  s.wardrobe.equipped.natalie = "natalie-mummy";
  const before = structuredClone(s), events = [];
  assert.deepEqual(awardHomecomingLooks(s, events), HOME_BONDS.map(bond => bond.id));
  assert.deepEqual(events, HOME_BONDS.map(bond => ({ type: "homecoming-unlocked", id: bond.id })));
  assert.ok(SECRET_LOOK_IDS.every(id => s.looks.owned.includes(id)));
  assert.deepEqual(s.wardrobe, before.wardrobe);
  assert.deepEqual(s.progression, before.progression);
  assert.equal(s.looks.natalie, "plum"); assert.equal(s.looks.shane, "moss");
  assert.equal(s.coins, before.coins); assert.equal(s.earned, before.earned);
  assert.deepEqual(Object.keys(s).sort(), Object.keys(before).sort());
  const settled = structuredClone(s), claims = s.village.claims, owned = s.looks.owned;
  assert.deepEqual(awardHomecomingLooks(s, events), []);
  assert.deepEqual(s, settled);
  assert.equal(events.length, 3);
  assert.equal(s.village.claims, claims, "settled rewards do not replace the ledger every frame");
  assert.equal(s.looks.owned, owned, "settled rewards do not replace the inventory every frame");
});

test("pause defers all awards and repairs until the authoritative simulation resumes", () => {
  const s = qualify(fresh(), "botanist"), events = [];
  s.paused = true;
  const before = structuredClone(s);
  assert.deepEqual(awardHomecomingLooks(s, events), []);
  assert.deepEqual(s, before); assert.deepEqual(events, []);
  s.paused = false;
  assert.deepEqual(awardHomecomingLooks(s, events), ["botanist"]);
});

test("saved claims repair a missing half of a pair silently and survive a JSON round trip", () => {
  let s = qualify(fresh(), "botanist");
  awardHomecomingLooks(s);
  s = JSON.parse(JSON.stringify(s));
  const pair = info(s, "botanist").lookIds;
  s.looks.owned = s.looks.owned.filter(id => id !== pair[1]);
  s.village.expansion = {};
  const events = [];
  assert.equal(info(s, "botanist").owned, true);
  assert.deepEqual(awardHomecomingLooks(s, events), []);
  assert.ok(pair.every(id => s.looks.owned.includes(id)));
  assert.deepEqual(events, []);
  const importedPair = fresh(); importedPair.looks.owned.push(...pair);
  awardHomecomingLooks(importedPair, events);
  assert.equal(importedPair.village.claims["homecoming:botanist"], true);
  assert.deepEqual(events, []);
});

test("one unclaimed colour does not grant its partner until the two-world work is complete", () => {
  const s = fresh(), pair = info(s, "botanist").lookIds;
  s.looks.owned.push(pair[0]);
  assert.deepEqual(awardHomecomingLooks(s), []);
  assert.equal(s.looks.owned.includes(pair[1]), false);
  qualify(s, "botanist");
  assert.deepEqual(awardHomecomingLooks(s), ["botanist"]);
  assert.equal(s.looks.owned.filter(id => id === pair[0]).length, 1);
  assert.ok(s.looks.owned.includes(pair[1]));
});

test("old and malformed data neither crashes nor fabricates eligibility", () => {
  for (const s of [undefined, null, 7, [], {}, { village: null }, { village: { expansion: null }, looks: {} }, { village: { expansion: { effects: "herb-beds restaurant-opening moor-stage", chapters: { "restaurant-opening": "true" }, economy: { herbsProcessed: Infinity, treatments: "3", commissions: { "cinder-first-supper": { done: NaN } } } } }, looks: { owned: "both" } }]) {
    assert.ok(homecomingInfo(s).every(bond => !bond.ready && !bond.owned));
    assert.deepEqual(awardHomecomingLooks(s), []);
  }
  for (const bad of [-1, Infinity, NaN, "6", null, {}, []]) {
    const s = qualify(fresh(), "botanist"); s.village.expansion.economy.herbsProcessed = bad;
    assert.equal(info(s, "botanist").ready, false);
  }
});

test("legacy expansion reward ledgers qualify and inherited claim keys do not award freebies", () => {
  const s = qualify(fresh(), "botanist");
  s.village.expansion.unlocks = s.village.expansion.effects;
  delete s.village.expansion.effects;
  assert.equal(info(s, "botanist").ready, true);
  assert.deepEqual(awardHomecomingLooks(s), ["botanist"]);
  const unrelated = fresh(); unrelated.village.claims = Object.create({ "homecoming:botanist": true });
  assert.equal(info(unrelated, "botanist").owned, false);
  assert.deepEqual(awardHomecomingLooks(unrelated), []);
});
