import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { NODES, FIXTURES } from "../src/content/village.js";
import { FOLK_BY_ID, FRIENDSHIP } from "../src/content/village-folk.js";
import { QUESTS, STORY_OBJECTS } from "../src/content/village-quests.js";
import { VILLAGE_DECOR } from "../src/content/village-decor.js";
import { spreadWorld, spreadWith } from "../src/rules/village-spread.js";

// A farm at a level, with the home visit done (level 3's own goal).
function farm(level = 3) { const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[level - 1].at; M.awardLevels(s); return s; }
// Takes the invitation through: the tour, then Rowan, then Elowen.
function invited(s = farm()) { M.inviteToVillage(s); M.finishTour(s); M.arriveInVillage(s); for (const who of ["rowan", "elowen"]) M.finishTalk(s, "invitation", who); return s; }
const fill = (s, m, n) => { s.village.materials[m] = n; };

test("Elowen's invitation comes at level 3, and answering it is level 4's goal", () => {
  const s = farm(2); assert.equal(M.villageDue(s), false, "not at level 2");
  s.earned = M.LEVELS[2].at + s.progression.bonusEarned; M.awardLevels(s); assert.equal(M.patchLevel(s).level, 3); assert.equal(M.villageDue(s), true);
  assert.equal(M.inviteToVillage(s), true); assert.equal(M.villageDue(s), false); assert.equal(M.inviteToVillage(s), false, "once");
  assert.equal(M.questStatus(s, "invitation"), "active"); assert.equal(M.questStep(s, "invitation").kind, "tour");
  assert.equal(M.friendshipWith(s, "elowen").met, true, "Elowen met at the farm");
  s.earned = M.LEVELS[3].at + s.progression.bonusEarned; assert.equal(M.patchLevel(s).level, 3, "level 4 waits for Mothlight");
  assert.equal(M.patchLevel(s).requirements[0].action, "village");
  M.finishTour(s); assert.equal(M.questStep(s, "invitation").who, "rowan");
  assert.deepEqual(M.finishTalk(s, "invitation", "elowen"), [], "out of turn, Elowen's chat doesn't count");
  M.finishTalk(s, "invitation", "rowan");
  const before = { coins: s.coins, levelEarnings: M.levelEarnings(s) }, events = M.finishTalk(s, "invitation", "elowen");
  assert.equal(M.questStatus(s, "invitation"), "done");
  assert.equal(s.coins, before.coins + 150); assert.equal(M.levelEarnings(s), before.levelEarnings, "a gift of coins earns no level");
  assert.ok(events.some((e) => e.type === "friend-level" && e.who === "rowan" && e.level === 2));
  assert.equal(M.friendshipWith(s, "rowan").level, 2); assert.equal(s.village.decor.owned.signpost, 1, "Rowan's level 2 gift");
  assert.equal(s.village.decor.owned["moth-lamp"], 1, "Elowen's level 2 gift"); assert.equal(s.village.decor.owned["lantern-post"], 2);
  assert.equal(M.canGather(s), true); assert.equal(M.patchLevel(s).level, 4, "the level-4 goal is met");
});

test("gathering takes from a node, which grows back on the farm's clock, never past a full store", () => {
  const s = invited(), node = NODES.find((n) => n.material === "logs");
  const got = M.gatherNode(s, node.id); assert.equal(got.amount, 2); assert.equal(s.village.materials.logs, 2);
  assert.equal(M.gatherNode(s, node.id), null, "spent until it grows back");
  M.update(s, 179); assert.equal(M.nodeReady(s, node.id), false); M.update(s, 2); assert.equal(M.nodeReady(s, node.id), true);
  fill(s, "logs", M.STORE_BASE ?? 40); const full = M.gatherNode(s, node.id); assert.equal(full.full, true); assert.equal(M.nodeReady(s, node.id), true, "a full store leaves the node be");
  assert.equal(M.gatherNode(s, NODES.find((n) => n.district === "copse").id), null, "the Copse is shut");
  assert.equal(M.gatherNode(M.freshState(), node.id), null, "nothing to gather before the invitation");
});

test("chats give friendship once every few minutes, more for the tone a resident likes", () => {
  const s = invited(); s.village.friends.rowan.chatIn = 0;
  const chat = M.nextChat(s, "rowan"); assert.ok(chat?.choices.length === 3);
  const liked = chat.choices.findIndex((c) => c.tone === FOLK_BY_ID.rowan.tone), xp = s.village.friends.rowan.xp;
  const r = M.answerChat(s, "rowan", chat.id, liked); assert.equal(r.liked, true); assert.equal(s.village.friends.rowan.xp, xp + FRIENDSHIP.chat + FRIENDSHIP.liked);
  assert.equal(M.answerChat(s, "rowan", chat.id, 0), null, "once per wait"); assert.equal(M.canChat(s, "rowan"), false);
  M.update(s, FRIENDSHIP.chatWait); assert.equal(M.canChat(s, "rowan"), true);
  assert.notEqual(M.nextChat(s, "rowan").id, chat.id, "a new chat next time");
  for (const f of ["elowen", "rowan"]) for (const c of FOLK_BY_ID[f].chats) { assert.equal(c.choices.length, 3); assert.deepEqual(new Set(c.choices.map((x) => x.tone)), new Set(["warm", "curious", "playful"]), c.id); }
});

test("gifts come from the farm, please residents by taste, and are limited", () => {
  const s = invited(); s.stock[M.VARIETIES.findIndex((v) => v.id === "orange")] = 5; s.kitchen.pantry.fish = 2;
  const xp = s.village.friends.rowan.xp, loved = M.giveGift(s, "rowan", "pumpkin:orange");
  assert.equal(loved.taste, "loved"); assert.equal(s.village.friends.rowan.xp, xp + FRIENDSHIP.gift.loved); assert.equal(s.stock[0], 4);
  assert.equal(M.giveGift(s, "elowen", "pantry:fish").taste, "disliked");
  M.giveGift(s, "rowan", "pumpkin:orange"); assert.equal(M.giveGift(s, "rowan", "pumpkin:orange"), null, "two gifts each, then a wait");
  M.update(s, FRIENDSHIP.giftWait); s.stock[0] = 3; assert.ok(M.giveGift(s, "rowan", "pumpkin:orange"), "pumpkins spoil, so fresh ones");
  assert.equal(M.giveGift(s, "rowan", "food:pumpkin-pie"), null, "only what the farm has");
  assert.ok(M.giftable(s).some((g) => g.item === "pumpkin:orange"));
});

test("Rowan's chapters: the bench, then his stall, whose stock turns over and sells for coins", () => {
  const s = invited(); assert.equal(M.questStatus(s, "rowan-1"), "offered");
  M.startQuest(s, "rowan-1"); assert.equal(M.questStep(s, "rowan-1").material, "logs");
  fill(s, "logs", 4); fill(s, "stone", 2); M.advanceQuests(s);
  assert.equal(M.handOver(s, "rowan").ok, true); M.doHandOver(s, "rowan");
  assert.equal(M.questStatus(s, "rowan-1"), "done"); assert.ok(s.village.effects.includes("bench")); assert.equal(s.village.materials.stone, 0, "taken");
  assert.equal(M.friendshipWith(s, "rowan").level, 3); assert.equal(s.village.materials.logs, 6, "and Rowan's level-3 gift of logs");
  M.startQuest(s, "rowan-stall"); fill(s, "fibre", 3); fill(s, "logs", 6); fill(s, "stone", 2); M.advanceQuests(s);
  M.doHandOver(s, "rowan"); assert.equal(M.handOver(s, "rowan").step.kind, "pay");
  s.coins = 150; assert.equal(M.handOver(s, "rowan").ok, false); s.coins = 500; M.doHandOver(s, "rowan");
  assert.equal(M.stallOpen(s), true);
  const stock = M.stallStock(s); assert.equal(stock.length, 6); assert.deepEqual(M.stallStock(s), stock, "the same stock until it turns over");
  const home = stock.find((x) => x.kind === "home"), coins = s.coins = 5000;
  if (home) { assert.ok(M.buyFromStall(s, home.key)); assert.ok(s.house.owned.includes(home.id)); }
  assert.ok(M.buyFromStall(s, "village:stool")); assert.equal(s.village.decor.owned.stool, 1); assert.ok(s.coins < coins);
  M.update(s, 901); assert.notDeepEqual(M.stallStock(s).map((x) => x.key), stock.map((x) => x.key), "new stock after a while");
  s.village.discount = .1; assert.equal(M.stallStock(s).find((x) => x.id === "stool").price, Math.round(60 * .9));
});

test("A Door of His Own raises Rowan's workshop once paid for", () => {
  const s = invited(); for (const id of ["rowan-1", "rowan-stall"]) { s.village.quests[id] = { step: 9, base: null, done: true }; }
  s.village.friends.rowan.xp = 180; assert.equal(M.questStatus(s, "rowan-2"), "offered"); M.startQuest(s, "rowan-2");
  fill(s, "logs", 20); fill(s, "stone", 12); fill(s, "fibre", 4); s.coins = 1000;
  M.doHandOver(s, "rowan"); M.doHandOver(s, "rowan");
  assert.equal(s.village.built["rowan-workshop"], true, "raised as soon as it's paid for"); assert.equal(M.questStep(s, "rowan-2").kind, "talk");
  M.finishTalk(s, "rowan-2", "rowan"); assert.equal(M.questStatus(s, "rowan-2"), "done"); assert.ok(s.house.owned.includes("shelf-bracket"));
});

test("Elowen's pages turn up in any order, one on the farm, and the almanac opens", () => {
  const s = invited(); M.startQuest(s, "elowen-1");
  assert.deepEqual(M.storyObjectsHere(s, "farm").map((o) => o.id), ["page-3"], "one page blew to the farm");
  M.findObject(s, "page-3"); assert.equal(M.questStep(s, "elowen-1").item, "page-1", "found early, it waits its turn");
  M.findObject(s, "page-1"); M.findObject(s, "page-2"); assert.equal(M.questStep(s, "elowen-1").kind, "talk");
  M.finishTalk(s, "elowen-1", "elowen"); assert.equal(M.almanacOpen(s), true);
  assert.equal(M.findObject(s, "page-1"), null, "nothing to find once it's done");
});

test("almanac duties count from the page, pay as they're done, and a full page pays its prize", () => {
  const s = invited(); s.village.unlocks.push("almanac"); M.update(s, .1);
  const page = M.almanacPage(s); assert.equal(page.length, 4); assert.equal(new Set(page.map((d) => d.id)).size, 4);
  const coins = s.coins;
  for (const d of page) { const duty = M.DUTIES?.find?.((x) => x.id === d.id); s.village.almanac.page.find((p) => p.id === d.id).base = -1e9; }
  const events = M.update(s, .1).filter((e) => e.village);
  assert.equal(events.filter((e) => e.type === "duty").length, 4); assert.ok(events.some((e) => e.type === "almanac-page"));
  assert.ok(s.coins > coins); assert.equal(s.village.almanac.pages, 1); assert.equal(M.almanacPage(s).filter((d) => d.done).length, 0, "a fresh page");
});

test("favours take farm produce and pay like a sale, counting towards the level", () => {
  const s = invited(); s.stock[0] = 20; s.stock[1] = 20; s.village.materials.logs = 10; s.village.materials.herbs = 5; s.village.materials.stone = 10; s.village.materials.fibre = 10;
  const fav = M.favourOf(s, "rowan"); assert.ok(fav && fav.who === "rowan");
  assert.equal(M.favourOf(s, "rowan").id, fav.id, "the same favour until it's done");
  const earned = M.levelEarnings(s), r = M.doFavour(s, "rowan");
  assert.ok(r.pay >= fav.pay); assert.equal(M.levelEarnings(s), earned + r.pay, "paid like a sale");
  assert.equal(M.favourOf(s, "rowan"), null, "a new one after a wait"); M.update(s, 301); assert.ok(M.favourOf(s, "rowan"));
});

test("decor goes anywhere open on the Green, but not on roads, homes, nodes or fixtures", () => {
  const s = invited(); s.village.decor.owned = { "garden-bench": 2, "moth-lamp": 1, "reading-stand": 1 };
  // Spots as drawn (world units), where they now stand.
  const at = (x, z) => spreadWorld(x, z), plot = at(21, 24);
  assert.equal(M.villageDecorFits(s, "garden-bench", ...plot), true, "your plot");
  assert.equal(M.villageDecorFits(s, "garden-bench", ...at(87, 18)), false, "the arrival road");
  assert.equal(M.villageDecorFits(s, "garden-bench", ...at(60, 30)), false, "Elowen's plot");
  assert.equal(M.villageDecorFits(s, "garden-bench", FIXTURES.well.x, FIXTURES.well.z), false, "the well");
  assert.equal(M.villageDecorFits(s, "garden-bench", ...at(77, 18)), false, "the avenue's knot garden");
  assert.equal(M.villageDecorFits(s, "garden-bench", NODES[0].x, NODES[0].z), false, "a gathering spot");
  assert.equal(M.villageDecorFits(s, "garden-bench", ...at(21, 75)), false, "the Copse isn't the Green");
  const placed = M.placeVillageDecor(s, "garden-bench", ...plot); assert.ok(placed); assert.equal(s.village.decor.owned["garden-bench"], 1);
  assert.equal(M.placeVillageDecor(s, "garden-bench", ...plot), null, "not on top of another");
  assert.equal(M.moveVillageDecor(s, placed.piece.instance, ...at(21, 30), 90), true); assert.equal(M.storeVillageDecor(s, placed.piece.instance), true);
  assert.equal(s.village.decor.owned["garden-bench"], 2);
  for (const d of VILLAGE_DECOR) assert.ok(d.w > 0 && d.d > 0 && d.height > 0 && d.cost > 0, d.id);
});

test("A Room for Quiet Wings asks for a reading nook by Elowen's door, made of a light, a seat and books", () => {
  const s = invited(); s.village.quests["elowen-1"] = { step: 9, base: null, done: true }; s.village.friends.elowen.xp = 120;
  M.startQuest(s, "elowen-2"); fill(s, "logs", 18); fill(s, "stone", 14); fill(s, "fibre", 6); fill(s, "herbs", 2); s.coins = 2000;
  M.doHandOver(s, "elowen"); M.doHandOver(s, "elowen"); assert.equal(s.village.built["elowen-conservatory"], true);
  assert.deepEqual(M.stepProgress(s, "elowen-2").missing, ["light", "seat", "books"]);
  s.village.decor.owned = { "moth-lamp": 1, "garden-bench": 1, "reading-stand": 1 };
  // Set out beside her door as drawn, and moved with her house.
  const byElowen = (x, z) => spreadWith(x / 1.5, z / 1.5, 48, 20).map((v) => v * 1.5);
  assert.ok(M.placeVillageDecor(s, "moth-lamp", ...byElowen(74.4, 36.9))); assert.ok(M.placeVillageDecor(s, "garden-bench", ...byElowen(80.1, 37.2))); assert.equal(M.questStep(s, "elowen-2").kind, "place");
  assert.ok(M.placeVillageDecor(s, "reading-stand", ...byElowen(74.1, 33.9))); assert.equal(M.questStep(s, "elowen-2").kind, "talk", "light, seat and books: done");
});

test("friendship rewards are given once, and turn to coins when they can't be", () => {
  const s = invited(); s.upgrades.storage = 0;
  const events = M.addFriendship(s, "rowan", 400); assert.ok(events.some((e) => e.level === 4 && e.rewards[0].kind === "upgrade"));
  assert.equal(s.upgrades.storage, 1, "Rowan's shelves"); assert.ok(s.wardrobe.owned.includes("shane-scarecrow"), "his scarecrow costume at 5");
  assert.deepEqual(M.addFriendship(s, "rowan", 0), []); const coins = s.coins;
  s.village.claims = {}; s.village.friends.rowan.xp = 0; M.addFriendship(s, "rowan", 300);
  assert.ok(s.coins > coins, "a costume already owned pays coins instead");
});

test("the village saves and loads, and junk comes back as a fresh village", () => {
  const s = invited(); M.startQuest(s, "rowan-1"); s.village.decor.owned["moth-lamp"] = 2; M.placeVillageDecor(s, "moth-lamp", ...spreadWorld(14, 14));
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(back.village, s.village);
  const junk = M.restoreState({ ...JSON.parse(JSON.stringify(M.saveData(s))), village: { invited: "yes", quests: { nope: {}, "rowan-1": { step: 99 } }, decor: { placed: [{ id: "moth-lamp", instance: "x", ...(([x, z]) => ({ x, z }))(spreadWorld(58, 12)) }] }, materials: { logs: 9e9 } } });
  assert.equal(junk.village.invited, false); assert.equal(junk.village.quests.nope, undefined); assert.equal(junk.village.quests["rowan-1"].step, QUESTS.find((q) => q.id === "rowan-1").steps.length);
  assert.equal(junk.village.decor.placed.length, 0, "a piece on a road goes back to storage"); assert.equal(junk.village.decor.owned["moth-lamp"], 1); assert.equal(junk.village.materials.logs, 40);
  assert.deepEqual(M.restoreState(JSON.parse(JSON.stringify(M.saveData(M.freshState())))).village, M.freshState().village);
});

test("every quest's steps, givers, objects and rewards point at real things", () => {
  for (const q of QUESTS) {
    if (q.giver) assert.ok(FOLK_BY_ID[q.giver], q.id);
    for (const n of q.needs) assert.ok(QUESTS.some((x) => x.id === n), `${q.id} needs ${n}`);
    for (const st of q.steps) {
      if (st.kind === "find") assert.ok(STORY_OBJECTS.some((o) => o.id === st.item), st.item);
      if (["talk", "deliver", "pay", "give"].includes(st.kind)) assert.ok(FOLK_BY_ID[st.who], `${q.id}: ${st.kind} needs someone`);
      if (st.kind === "talk") assert.ok(q.talk[st.who]?.length, `${q.id}: ${st.who} has lines`);
    }
    for (const d of Object.keys(q.reward.villageDecor ?? {})) assert.ok(VILLAGE_DECOR.some((x) => x.id === d), d);
    for (const d of q.reward.decor ?? []) assert.ok(M.decorById[d], d);
  }
  for (const f of ["elowen", "rowan"]) for (const rs of Object.values(FOLK_BY_ID[f].rewards)) for (const r of rs) {
    if (r.kind === "decor") assert.ok(M.decorById[r.id], r.id);
    if (r.kind === "village-decor") assert.ok(VILLAGE_DECOR.some((x) => x.id === r.id), r.id);
    if (r.kind === "costume") assert.ok(M.costumeById[r.id], r.id);
    if (r.kind === "recipe") assert.ok(M.RECIPE_BY_ID[r.id], r.id);
  }
});
