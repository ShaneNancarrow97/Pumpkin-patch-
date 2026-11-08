import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { QUESTS } from "../src/content/village-quests.js";
import { NODES } from "../src/content/village.js";
import { renderVillageChapter } from "../src/ui/village-chapters.js";

function village() {
  const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[2].at; M.awardLevels(s);
  M.inviteToVillage(s); M.finishTour(s); M.finishTalk(s, "invitation", "rowan"); M.finishTalk(s, "invitation", "elowen");
  return s;
}
function done(s, id) { s.village.quests[id] = { step: QUESTS.find(q => q.id === id).steps.length, done: true, base: null }; }
const render = (s, kind, options = {}) => renderVillageChapter({ kind, state: s, ...options });
const card = (html, selector) => html.match(new RegExp(`<button[^>]*${selector}[^>]*>`))?.[0];

test("chapter pages only read state, including an unrolled almanac and incomplete quests", () => {
  const s = village(); s.village.unlocks.push("almanac", "stall"); M.startQuest(s, "rowan-1");
  const before = structuredClone(s);
  for (const kind of ["journal", "almanac", "materials", "upgrades", "stall", "map"]) {
    const page = render(s, kind); assert.ok(page.title && page.tag && page.html); assert.deepEqual(s, before, `${kind} must not advance time, draw duties or grant rewards`);
  }
  assert.equal(render(s, "resident"), null);
});

test("parallel deliveries expose exact material counts and carry their own quest id", () => {
  const s = village(); s.village.quests["rowan-stall"] = { step: 1, done: false, base: null }; s.village.quests["rowan-2"] = { step: 0, done: false, base: null };
  Object.assign(s.village.materials, { logs: 6, stone: 2, fibre: 3 });
  const { html } = render(s, "journal", { trackedQuestId: "rowan-2" });
  const ready = card(html, 'data-quest="rowan-stall"'), waiting = card(html, 'data-quest="rowan-2"');
  assert.ok(ready && !ready.includes(" disabled")); assert.ok(waiting?.includes(" disabled"));
  assert.match(html, /6 \/ 20/); assert.match(html, /2 \/ 12/); assert.match(html, /3 \/ 4/);
  assert.match(card(html, 'data-vg-track="rowan-2"'), /aria-pressed="true"/);
  assert.match(html, /data-vg-gather="logs"/);
});

test("restoration placement and farm cooking steps point to achievable activities", () => {
  const s = village(); s.village.quests["elowen-2"] = { step: 3, done: false, base: null }; s.village.quests["two-doorbells"] = { step: 1, done: false, base: 0 };
  const { html } = render(s, "journal");
  assert.match(html, /data-vg-decorate data-near="elowen"/);
  for (const requirement of ["A lamp or lantern", "A stool or bench", "A reading stand or book cart"]) assert.ok(html.includes(requirement));
  assert.match(html, /Cooking opens at patch level 5/); assert.match(html, /£900/); assert.match(html, /data-vg-home/);
});

test("the satchel follows upgrade capacity and shows depleted gathering timers without fake stock", () => {
  const s = village(); s.village.effects.push("upgrade:satchel-pockets"); s.village.materials.logs = 59;
  for (const id of Object.keys(s.village.nodes)) if (id.startsWith("logs-")) s.village.nodes[id] = 90;
  // Nodes begin sparse; set the authored Green log nodes too.
  for (const id of ["logs-01", "logs-02", "logs-03", "logs-04"]) s.village.nodes[id] = 90;
  const { html } = render(s, "materials");
  assert.match(html, /60 of each material/); assert.match(html, /max="60" value="59"/); assert.match(html, /Next spot in 2 min/);
  assert.match(html, /Other materials belong to later districts/);
});

test("upgrade cards reflect locked, affordable, paused and owned transactions", () => {
  const s = village(); s.coins = 1000; s.village.materials.fibre = 20;
  assert.match(card(render(s, "upgrades").html, 'data-vg-upgrade="satchel-pockets"'), /disabled/);
  done(s, "rowan-stall"); s.village.unlocks.push("stall");
  assert.doesNotMatch(card(render(s, "upgrades").html, 'data-vg-upgrade="satchel-pockets"'), /disabled/);
  s.paused = true; assert.match(card(render(s, "upgrades").html, 'data-vg-upgrade="satchel-pockets"'), /disabled/);
  s.paused = false; assert.equal(M.buyVillageUpgrade(s, "satchel-pockets"), true);
  assert.equal(card(render(s, "upgrades").html, 'data-vg-upgrade="satchel-pockets"'), undefined);
});

test("almanac explains automatic payment and keeps finished-story rewards as receipts", () => {
  const s = village(); s.village.unlocks.push("almanac"); M.updateVillage(s, .1);
  const { html } = render(s, "almanac");
  assert.equal((html.match(/class="vg-ch-duty/g) ?? []).length, 4);
  assert.match(html, /Rewards arrive automatically/); assert.doesNotMatch(html, /data-vg-claim/);
  const journal = render(s, "journal").html;
  assert.match(journal, /Completed · rewards received/); assert.match(journal, /The Moving Address/);
});

test("friendship keepsakes name the gifted recipe and do not imply a second claim", () => {
  const s = village(); M.addFriendship(s, "elowen", 100);
  const { html } = render(s, "journal");
  assert.match(html, /Ghost.*cookies.*recipe/i);
  assert.match(html, /Milestones reached/);
  assert.doesNotMatch(html, /data-vg-claim/);
});

test("farmhouse stock counts all owned copies, not only unplaced pieces", () => {
  const s = village(); s.village.unlocks.push("stall");
  let item;
  for (let rotation = 0; rotation < 30 && !item; rotation++) { s.village.stall.rotation = rotation; item = M.stallStock(s).find(i => i.kind === "home"); }
  assert.ok(item);
  if (!s.house.owned.includes(item.id)) s.house.owned.push(item.id);
  s.house.copies[item.id] = 2;
  s.house.placed.push({ id: item.id, instance: "test-room-piece", room: "parlour", x: 1, z: 1, rotation: 0, books: [] });
  const { html } = render(s, "stall");
  assert.match(html, /2 owned/);
});

test("the followed story leads with the useful gathering action when a delivery is short", () => {
  const s = village();
  s.village.quests["rowan-1"] = { step: 2, done: false, base: null };
  s.village.quests["elowen-1"] = { step: 0, done: false, base: null };
  Object.assign(s.village.materials, { logs: 0, stone: 0 });
  const { html } = render(s, "journal", { trackedQuestId: "rowan-1" });
  assert.ok(html.indexOf('data-quest-card="rowan-1"') < html.indexOf('data-quest-card="elowen-1"'));
  const gather = card(html, 'data-vg-gather="logs"'), give = card(html, 'data-vg-handover="rowan"');
  assert.match(gather, /vg-ch-primary/); assert.match(gather, /data-pad-default/); assert.doesNotMatch(gather, /disabled/);
  assert.match(give, /disabled/); assert.doesNotMatch(give, /data-pad-default/);
  assert.match(html, /Next step/); assert.match(html, /Village bench restored · £60/);
});

test("the valuable costume reward is visible before its optional full receipt", () => {
  const s = village(); s.village.quests["lantern-keepers"] = { step: 0, done: false, base: null };
  const { html } = render(s, "journal", { trackedQuestId: "lantern-keepers" });
  const start = html.indexOf('data-quest-card="lantern-keepers"'), end = html.indexOf("</article>", start), quest = html.slice(start, end);
  assert.ok(quest.indexOf("Moonlit mummy outfits for both") < quest.indexOf('<details class="vg-ch-reward-fold"'));
  assert.match(quest, /Moonlit mummy outfits for both · £250/);
  assert.match(quest, /All rewards/); assert.match(quest, /aria-pressed="true"/);
});

test("one followed quest leads while other active stories start folded with stable memory keys", () => {
  const s = village();
  s.village.quests["rowan-1"] = { step: 2, done: false, base: null };
  s.village.quests["elowen-1"] = { step: 0, done: false, base: null };
  const html = render(s, "journal", { trackedQuestId: "rowan-1" }).html;
  assert.equal((html.match(/vg-ch-quest is-tracked/g) ?? []).length, 1);
  assert.match(html, /<details class="vg-ch-story-fold" data-vg-details-key="story:elowen-1">/);
  assert.doesNotMatch(html, /<details[^>]*story:elowen-1[^>]*\bopen\b/);
  assert.match(html, /data-vg-details-key="reward:rowan-1"/);
  assert.match(html, /data-vg-details-key="reward:elowen-1"/);
  assert.match(html, /data-vg-details-key="finished-stories"/);
  assert.match(html, /data-vg-details-key="friendship-keepsakes"/);
  assert.match(html, /data-vg-details-key="explore-help"/);
  // Following another story changes presentation, without changing either quest.
  const before = structuredClone(s), changed = render(s, "journal", { trackedQuestId: "elowen-1" }).html;
  assert.match(changed, /data-vg-details-key="story:rowan-1"/); assert.deepEqual(s, before);
});

test("satchel priorities show the supplies first and explain full, returning and quest-needed stock", () => {
  const s = village(); s.village.quests["rowan-1"] = { step: 2, done: false, base: null };
  let html = render(s, "materials").html;
  assert.ok(html.indexOf('data-vg-material="logs"') < html.indexOf('data-vg-page="upgrades"'));
  assert.match(html, /Needed for a quest/);
  assert.doesNotMatch(card(html, 'data-vg-gather="logs"'), /disabled/);
  s.village.materials.logs = M.villageMaterialCapacity(s);
  html = render(s, "materials").html;
  assert.match(card(html, 'data-vg-gather="logs"'), /disabled/);
  assert.match(html, /Use some supplies or improve your satchel/);
  s.village.materials.logs = 0;
  for (const node of NODES) if (node.material === "logs" && node.district === "green") s.village.nodes[node.id] = 80;
  html = render(s, "materials").html;
  assert.match(card(html, 'data-vg-gather="logs"'), /disabled/); assert.match(html, /Next spot in 2 min/);
});

test("the workshop puts unlocked choices before future plans and gives the precise shortage", () => {
  const s = village(); done(s, "rowan-stall"); s.village.unlocks.push("stall");
  s.coins = 100; s.village.materials.fibre = 3;
  let html = render(s, "upgrades").html;
  assert.ok(html.indexOf('class="vg-ch-upgrade-list"') < html.indexOf('data-vg-details-key="workshop-later"'));
  assert.match(html, /Need £20 more and 1 more fibre/);
  assert.match(card(html, 'data-vg-upgrade="satchel-pockets"'), /disabled/);
  assert.match(html, /data-vg-upgrade="satchel-frame"[^>]*disabled/);
  s.coins = 120; s.village.materials.fibre = 4;
  html = render(s, "upgrades").html;
  assert.match(card(html, 'data-vg-upgrade="satchel-pockets"'), /data-pad-default/);
  s.paused = true;
  assert.match(render(s, "upgrades").html, /Resume play to make this improvement/);
  s.paused = false; assert.equal(M.buyVillageUpgrade(s, "satchel-pockets"), true);
  html = render(s, "upgrades").html;
  assert.equal(card(html, 'data-vg-upgrade="satchel-pockets"'), undefined);
  assert.match(html, /data-vg-details-key="workshop-owned"/);
});

test("stall prices explain insufficient funds and become usable when the quote is affordable", () => {
  const s = village(); s.village.unlocks.push("stall"); s.coins = 0;
  const item = M.stallStock(s).find(i => i.left > 0); assert.ok(item);
  let html = render(s, "stall").html;
  assert.match(html, /Available to spend/); assert.match(html, /more needed/);
  assert.match(card(html, `data-vg-buy="${item.key}"`), /disabled/);
  s.coins = item.price;
  html = render(s, "stall").html;
  assert.doesNotMatch(card(html, `data-vg-buy="${item.key}"`), /disabled/);
  assert.ok(html.indexOf(`data-vg-buy="${item.key}"`) < html.indexOf('data-vg-decorate'));
});
