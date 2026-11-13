import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { HOME_BONDS, SECRET_LOOKS } from "../src/content/homecoming.js";
import { awardHomecomingLooks } from "../src/rules/homecoming.js";
import { renderHomecoming, renderWardrobeColours } from "../src/ui/homecoming.js";
import { renderVillageJournal } from "../src/ui/village-journal.js";
import { villageObjectives } from "../src/village-objectives.js";

test("unearned keepsakes offer clues without revealing or selling their colours", () => {
  const s = M.freshState(), before = JSON.stringify(s), html = renderHomecoming(s);
  assert.match(html, /^<details class="homecoming-discoveries"[^>]*><summary>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b|data-look=|data-costume=|£/);
  for (const look of SECRET_LOOKS) {
    assert.ok(!html.includes(look.name), `${look.id} name stays hidden`);
    assert.ok(!html.includes((look.sweater ?? look.beanie).toString(16)), `${look.id} colour stays hidden`);
  }
  for (const bond of HOME_BONDS) for (const step of bond.steps) assert.ok(html.includes(step.label));
  assert.match(html, /These keepsakes cannot be bought/);
  assert.match(html, /<small>Village<\/small>/); assert.match(html, /<small>Farm<\/small>/);
  assert.equal(JSON.stringify(s), before, "reading never settles a reward");
});

test("the same earned pair is named in both worlds and retains its real farm benefit", () => {
  const s = M.freshState();
  s.village.expansion.effects.push("herb-beds");
  Object.assign(s.village.expansion.economy, { herbsProcessed: 6, treatments: 3 });
  awardHomecomingLooks(s);
  const before = JSON.stringify(s), farm = renderHomecoming(s), village = renderHomecoming(s, { village: true });
  for (const html of [farm, village]) {
    for (const look of SECRET_LOOKS.filter(look => look.bond === "botanist")) assert.ok(html.includes(look.name));
    assert.match(html, /fresh 10% longer/);
    assert.match(html, /Both worlds share the same wardrobe/);
    assert.doesNotMatch(html, /data-look=|data-costume=|Mulberry supper|Ghostlight knit/);
  }
  assert.match(village, /Farm → Outfits/);
  assert.equal(JSON.stringify(s), before);
});

test("wardrobe retains normal prices and only exposes earned secrets as wear actions", () => {
  const s = M.freshState(), secrets = SECRET_LOOKS.filter(look => look.character === "natalie");
  const looks = [{ id: "olive", name: "Olive knit", sweater: 0x604625, price: 0 }, { id: "plum", name: "Plum knit", sweater: 0x5b2a4a, price: 120 }, ...secrets];
  s.coins = 120;
  const locked = renderWardrobeColours(s, "natalie", looks);
  assert.match(locked, />£120<\/button>/);
  for (const secret of secrets) assert.ok(!locked.includes(secret.id));
  s.looks.owned.push(secrets[0].id);
  const available = renderWardrobeColours(s, "natalie", looks);
  assert.match(available, new RegExp(`data-look="natalie:${secrets[0].id}">Wear`));
  assert.doesNotMatch(available, /£NaN|£undefined/);
  s.paused = true;
  assert.match(renderWardrobeColours(s, "natalie", looks), new RegExp(`data-look="natalie:${secrets[0].id}" disabled>Wear`));
  s.paused = false; s.looks.natalie = secrets[0].id;
  assert.match(renderWardrobeColours(s, "natalie", looks), new RegExp(`data-look="natalie:${secrets[0].id}" disabled>Worn`));
  s.wardrobe.equipped.natalie = "natalie-wheelchair";
  assert.doesNotMatch(renderWardrobeColours(s, "natalie", looks), /data-look=/);
});

test("the journal keeps its actionable objective ahead of the collapsed discovery ledger", () => {
  const s = M.freshState();
  M.inviteToVillage(s); s.village.toured = true;
  s.village.quests.invitation = { step: 3, done: true };
  s.village.quests["two-doorbells"] = { step: 3, done: true };
  s.village.quests["rowan-1"] = { step: 0, done: false, base: null };
  const records = villageObjectives(s), followed = records.find(record => record.id === "rowan-1");
  const html = renderVillageJournal({ state: s, records, followed }).html;
  assert.ok(html.indexOf('data-vg-objective-guide="rowan-1"') < html.indexOf('class="homecoming-discoveries"'));
  assert.ok(html.indexOf('class="homecoming-discoveries"') < html.indexOf('data-vg-details-key="explore-help"'));
  assert.equal((html.match(/class="homecoming-discoveries"/g) ?? []).length, 1);
  assert.match(html, /data-vg-details-key="homecoming:discoveries"[^>]*><summary>/);
});
