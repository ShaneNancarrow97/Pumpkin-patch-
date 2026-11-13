import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const bondEvents = events => events.filter(event => event.type === "homecoming-unlocked");
function quietFarm() {
  const s = M.freshState();
  s.visitorTimer = s.shop.arrivalTimer = s.bigSpender.timer = 1e6;
  return s;
}
function eligibleFarm() {
  const s = quietFarm(), e = s.village.expansion;
  e.effects.push("herb-beds", "restaurant-opening", "moor-stage");
  e.chapters["restaurant-opening"] = e.chapters["moor-stage"] = true;
  e.economy.herbsProcessed = 6; e.economy.treatments = 3;
  e.economy.commissions["cinder-first-supper"] = { done: 3, remaining: 0 };
  s.progression.homeActivities.cook = 3;
  s.hayride.haunts.owned.push("turning-scarecrows"); s.hayride.completed = 25;
  return s;
}
const roundTrip = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test("real village herbs, supplied wax and farm stock treatments unlock a pair on the next model tick", () => {
  const s = quietFarm(), events = [];
  s.kitchen.purchased = true;
  s.village.expansion.effects.push("herb-beds", "preservation-research");
  s.village.materials.herbs = 6; s.kitchen.pantry.butter = 3;
  const coins = s.coins, earned = s.earned;
  assert.ok(M.processExpansionHerbs(s, 6).ok);
  for (let i = 0; i < 3; i++) {
    assert.ok(M.startExpansionWax(s).ok);
    events.push(...M.update(s, 30));
    M.addStock(s, 0, 1);
    assert.ok(M.treatExpansionStock(s, `0:${s.time}`).ok);
  }
  assert.deepEqual(bondEvents(events), [], "the final treatment has not yet been settled by the model");
  assert.deepEqual(bondEvents(M.update(s, .01)), [{ type: "homecoming-unlocked", id: "botanist" }]);
  assert.equal(s.village.materials.herbs, 0);
  assert.equal(s.kitchen.pantry.herbs, 3); assert.equal(s.kitchen.pantry.butter, 0);
  assert.equal(s.village.expansion.economy.treatments, 3);
  assert.equal(s.coins, coins); assert.equal(s.earned, earned);
  assert.ok(M.HOME_BONDS[0].lookIds.every(id => s.looks.owned.includes(id)));
});

test("both farm and village update paths settle legacy work once, without income or automatic equipping", () => {
  for (const villageAway of [false, true]) {
    const s = eligibleFarm(), coins = s.coins, earned = s.earned;
    const events = bondEvents(M.update(s, .01, { villageAway }));
    assert.deepEqual(events.map(event => event.id), M.HOME_BONDS.map(bond => bond.id));
    assert.ok(M.SECRET_LOOK_IDS.every(id => s.looks.owned.includes(id)));
    assert.equal(s.looks.natalie, "olive"); assert.equal(s.looks.shane, "black");
    assert.equal(s.coins, coins); assert.equal(s.earned, earned);
    assert.deepEqual(bondEvents(M.update(s, .01, { villageAway })), []);
  }
});

test("version 20 round trip preserves every paired colour, claim and equipped base look", () => {
  const s = eligibleFarm();
  M.update(s, .01);
  const pair = M.HOME_BONDS.find(bond => bond.id === "midnight-host").lookIds;
  assert.ok(M.buyLook(s, "natalie", pair[0])); assert.ok(M.buyLook(s, "shane", pair[1]));
  const saved = M.saveData(s), restored = roundTrip(s);
  assert.equal(saved.version, 20); assert.equal(restored.version, 20);
  assert.deepEqual(restored.looks, s.looks);
  assert.deepEqual(restored.village.claims, s.village.claims);
  assert.equal(M.activeLook(restored, "natalie").id, pair[0]);
  assert.equal(M.activeLook(restored, "shane").id, pair[1]);
  assert.deepEqual(bondEvents(M.update(restored, .01)), []);
  assert.equal(restored.coins, s.coins); assert.equal(restored.earned, s.earned);
});

test("incomplete saved paired ownership is repaired from its claim without another reward event", () => {
  const s = eligibleFarm(); M.update(s, .01);
  const id = M.SECRET_LOOK_IDS[1]; s.looks.owned = s.looks.owned.filter(look => look !== id);
  const restored = roundTrip(s), coins = restored.coins;
  assert.equal(restored.looks.owned.includes(id), false);
  assert.deepEqual(bondEvents(M.update(restored, .01)), []);
  assert.equal(restored.looks.owned.includes(id), true);
  assert.equal(restored.coins, coins);
});

test("secret colours cannot be bought with any wallet and cannot poison the coin balance", () => {
  for (const coins of [0, 1e12, Infinity, NaN]) {
    const s = quietFarm(); s.coins = coins;
    for (const look of M.SECRET_LOOKS) assert.equal(M.buyLook(s, look.character, look.id), false);
    assert.ok(Object.is(s.coins, coins));
    assert.deepEqual(s.looks, M.freshLooks());
  }
  const s = quietFarm(); s.coins = NaN;
  assert.equal(M.buyLook(s, "natalie", "plum"), false);
  s.coins = Infinity;
  assert.equal(M.buyLook(s, "shane", "moss"), false);
});

test("ordinary colours still buy once, while all look changes and model rewards honour pause", () => {
  const s = eligibleFarm(); s.coins = 500;
  assert.ok(M.buyLook(s, "natalie", "plum")); assert.equal(s.coins, 380);
  assert.ok(M.buyLook(s, "natalie", "olive")); assert.equal(s.coins, 380);
  assert.ok(M.buyLook(s, "natalie", "plum")); assert.equal(s.coins, 380);
  s.paused = true;
  const before = structuredClone(s);
  assert.equal(M.buyLook(s, "natalie", "rust"), false);
  assert.equal(M.buyLook(s, "natalie", "olive"), false);
  assert.deepEqual(M.update(s, 1), []);
  assert.deepEqual(s, before);
  s.paused = false;
  assert.equal(bondEvents(M.update(s, .01)).length, 3);
});

test("restore drops unknown, unowned or wrong-character selections while retaining valid old purchases", () => {
  const s = quietFarm();
  s.looks = { natalie: M.SECRET_LOOK_IDS[0], shane: "plum", owned: ["plum", "plum", "__proto__", "fake", null, 2, M.SECRET_LOOK_IDS[1]] };
  const restored = roundTrip(s);
  assert.deepEqual(restored.looks, { natalie: "olive", shane: "black", owned: ["olive", "black", "plum", M.SECRET_LOOK_IDS[1]] });
  assert.ok(M.buyLook(restored, "natalie", "plum"));
  assert.equal(M.activeLook(restored, "natalie").id, "plum");
  for (const raw of [null, [], "plum", { owned: "plum" }, { natalie: "plum", owned: [] }]) assert.deepEqual(M.restoreLooks(raw), M.freshLooks());
});

test("active colours require ownership and the matching base costume even before restore", () => {
  const s = quietFarm(); s.looks.natalie = M.SECRET_LOOK_IDS[0];
  assert.equal(M.activeLook(s, "natalie"), undefined);
  s.looks.owned.push(M.SECRET_LOOK_IDS[0]);
  assert.equal(M.activeLook(s, "natalie").id, M.SECRET_LOOK_IDS[0]);
  s.wardrobe.equipped.natalie = "natalie-mummy";
  assert.equal(M.activeLook(s, "natalie"), undefined);
  for (const who of ["__proto__", "constructor", "guest"]) {
    assert.equal(M.buyLook(s, who, "plum"), false);
    assert.equal(M.activeLook(s, who), undefined);
  }
  assert.equal(M.activeLook(null, "natalie"), undefined);
});
