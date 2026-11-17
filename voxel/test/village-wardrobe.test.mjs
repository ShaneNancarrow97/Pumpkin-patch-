import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import * as M from "../src/model.js";
import { SECRET_LOOKS } from "../src/content/homecoming.js";
import { awardHomecomingLooks } from "../src/rules/homecoming.js";
// Real UI, bindings and rules; thumbnail bytes alone are omitted in Node.
const bundle = await build({ entryPoints: [new URL("../src/ui/collection-sheets.js", import.meta.url).pathname], bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "wardrobe-art", setup(builder) { builder.onLoad({ filter: /\.(webp|png)$/ }, () => ({ contents: 'export default "data:image/webp;base64,";' })); } }],
});
const { collectionSheets } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

const reload = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
function earnMoonfern(s) {
  s.village.expansion.effects.push("herb-beds");
  Object.assign(s.village.expansion.economy, { herbsProcessed: 6, treatments: 3 });
  awardHomecomingLooks(s);
}
function wardrobe(s) {
  let refreshed = 0;
  const ui = { state: s, portrait: id => `art/${id}.webp`, draw() {}, tone() {}, scene: { refreshLooks() { refreshed++; } } };
  const sheet = collectionSheets(ui).wardrobe;
  return { html: () => sheet.body(), refreshed: () => refreshed, click(key, value) {
    const attribute = key.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
    const button = { dataset: { [key]: value } };
    sheet.bind({ querySelectorAll: selector => selector === `[data-${attribute}]` ? [button] : [] });
    assert.equal(typeof button.onclick, "function"); button.onclick();
  } };
}

test("Village collection identifies both reward routes without selling or revealing secret looks", () => {
  const s = M.freshState(), sheet = wardrobe(s), before = JSON.stringify(s);
  sheet.click("set", "village");
  for (const who of ["natalie", "shane"]) {
    sheet.click("who", who);
    const html = sheet.html(), mummy = html.match(/<article class="card outfit[\s\S]*?<\/article>/)[0];
    assert.match(html, /Village rewards/); assert.match(html, />0 \/ 4</);
    assert.match(html, new RegExp(`art/${who}-mummy.webp`));
    assert.match(mummy, /Village route · The Lantern Keepers/);
    assert.match(mummy, /Matching outfits for Shane &amp; Natalie/);
    assert.doesNotMatch(mummy, /[Ee]xclusive|data-costume=|£/);
    assert.match(html, /Three exclusive colour pairs to discover/);
    assert.doesNotMatch(html, /data-look=|data-village-look=|data-costume=|art\/.*-(witch|scarecrow).webp/);
    for (const look of SECRET_LOOKS) assert.ok(!html.includes(look.name));
  }
  assert.equal(JSON.stringify(s), before, "collection navigation and rendering never change the save");
  sheet.click("set", "all"); assert.match(sheet.html(), /data-costume="shane-scarecrow"/);
  sheet.click("who", "natalie"); assert.match(sheet.html(), /data-costume="natalie-witch"/);
});

test("earned Village colours remain visible under another costume and explicitly equip for each owner", () => {
  const s = M.freshState(); earnMoonfern(s);
  s.wardrobe.owned.push("natalie-mummy", "shane-mummy");
  for (const who of ["natalie", "shane"]) M.wearCostume(s, who + "-mummy");
  const sheet = wardrobe(s), coins = s.coins, earned = s.earned;
  sheet.click("set", "village");
  for (const who of ["natalie", "shane"]) {
    sheet.click("who", who);
    const id = who + "-homecoming-botanist", html = sheet.html();
    assert.match(html, />2 \/ 4</); assert.match(html, /Exclusive · The herb garden/);
    assert.match(html, /Includes the original outfit/);
    assert.match(html, new RegExp(`data-village-look="${who}:${id}">Wear look`));
    assert.doesNotMatch(html, /Mulberry supper|Ghostlight knit|Ghostlight beanie/);
    sheet.click("villageLook", `${who}:${id}`);
    assert.equal(s.wardrobe.equipped[who], who + "-base"); assert.equal(s.looks[who], id);
    assert.equal(M.activeLook(s, who).id, id);
    assert.match(sheet.html(), new RegExp(`data-village-look="${who}:${id}" disabled>Worn`));
  }
  assert.equal(sheet.refreshed(), 2); assert.equal(s.coins, coins); assert.equal(s.earned, earned);
  const back = reload(s);
  for (const who of ["natalie", "shane"]) {
    assert.equal(back.wardrobe.equipped[who], who + "-base"); assert.equal(M.activeLook(back, who).id, who + "-homecoming-botanist");
  }
});

test("exclusive looks cannot be bought or equipped before earning, for the wrong owner, or while paused", () => {
  const s = M.freshState(); s.coins = 1e6;
  const id = "natalie-homecoming-botanist", before = JSON.stringify(s);
  assert.equal(M.buyLook(s, "natalie", id), false); assert.equal(M.wearVillageLook(s, "natalie", id), false);
  assert.equal(JSON.stringify(s), before);
  earnMoonfern(s);
  for (const [who, look] of [["shane", id], ["natalie", "plum"], ["__proto__", id], ["natalie", "constructor"]]) {
    const snapshot = JSON.stringify(s); assert.equal(M.wearVillageLook(s, who, look), false); assert.equal(JSON.stringify(s), snapshot);
  }
  s.paused = true; const paused = JSON.stringify(s);
  assert.equal(M.wearVillageLook(s, "natalie", id), false); assert.equal(JSON.stringify(s), paused);
  const sheet = wardrobe(s); sheet.click("set", "village");
  assert.match(sheet.html(), new RegExp(`data-village-look="natalie:${id}" disabled>Wear look`));
  sheet.click("villageLook", `natalie:${id}`); assert.equal(JSON.stringify(s), paused);
  s.paused = false;
  for (const invalid of [null, "invalid", []]) {
    s.wardrobe.equipped = invalid;
    assert.equal(M.wearVillageLook(s, "natalie", id), false);
  }
});

test("mummy costumes remain grant-only even with a completed quest flag; old ownership and level rewards remain valid", () => {
  const s = M.freshState(); s.coins = 1e6; s.village.quests["lantern-keepers"] = { step: 3, done: true };
  const sheet = wardrobe(s); sheet.click("set", "village");
  assert.doesNotMatch(sheet.html(), /data-costume=/);
  assert.match(sheet.html(), /Reward outfit/);
  for (const who of ["natalie", "shane"]) {
    const id = who + "-mummy", before = JSON.stringify(s);
    assert.equal(M.buyCostume(s, id), false); assert.equal(JSON.stringify(s), before);
    assert.equal(M.costumeVillageGate(s, id).quest, "lantern-keepers");
    assert.ok(M.LEVELS.some(level => level.rewards.some(reward => reward.kind === "costume" && reward.id === id)));
    s.wardrobe.owned.push(id); assert.equal(M.wearCostume(s, id), true);
  }
  s.village.quests = {}; const back = reload(s);
  for (const who of ["natalie", "shane"]) {
    assert.equal(M.costumeVillageGate(back, who + "-mummy"), null);
    assert.equal(back.wardrobe.equipped[who], who + "-mummy");
  }
});
