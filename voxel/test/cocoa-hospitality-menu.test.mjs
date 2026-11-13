import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import * as M from "../src/model.js";

// Load real menu/rule code, replacing only artwork and shared thumbnail markup.
const compiled = build({
  stdin: { contents: 'export { farmSheets } from "./src/ui/farm-sheets.js"; export { festivalMeadowSheet } from "./src/ui/festival-meadow-sheet.js";', resolveDir: new URL("..", import.meta.url).pathname },
  bundle: true, platform: "node", format: "cjs", write: false,
  plugins: [{ name: "menu-art-only", setup(builder) {
    builder.onResolve({ filter: /(?:^|\/)kit\.js$/ }, args => ({ path: args.path, namespace: "menu-kit" }));
    builder.onLoad({ filter: /.*/, namespace: "menu-kit" }, () => ({ contents: 'export const money=n=>"£"+Math.floor(n).toLocaleString("en-GB"); export const plural=(n,one,many=one+"s")=>`${n} ${n===1?one:many}`; export const segmented=(name,label,options,current)=>`<div class="segmented">${options.map(([id,text])=>`<button data-${name}="${id}" aria-pressed="${id===current}">${text}</button>`).join("")}</div>`;' }));
    builder.onResolve({ filter: /(?:^|\/)sandy\.js$/ }, args => ({ path: args.path, namespace: "menu-sandy-art" }));
    builder.onLoad({ filter: /.*/, namespace: "menu-sandy-art" }, () => ({ contents: 'export const cocoaArt=id=>`<span class="thumb" data-cocoa-art="${id}"></span>`;' }));
    builder.onLoad({ filter: /\.(webp|png)$/ }, () => ({ contents: 'export default "data:image/webp;base64,";' }));
  } }],
});
async function menus() { const sandbox = { module: { exports: {} } }; vm.runInNewContext((await compiled).outputFiles[0].text, sandbox); return sandbox.module.exports; }
function body(html) {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(match => {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(attr => [attr[1], attr[2] ?? ""]));
    const dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-")).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase()), value]));
    return { attrs, dataset, disabled: Object.hasOwn(attrs, "disabled"), listeners: [], addEventListener(type, fn) { if (type === "click") this.listeners.push(fn); }, click() { if (!this.disabled) { this.onclick?.(); for (const fn of this.listeners) fn(); } } };
  });
  return { querySelectorAll(selector) { const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1]; return attr ? buttons.filter(button => Object.hasOwn(button.attrs, attr)) : []; }, querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; } };
}
function setup() {
  const state = M.freshState(); state.festival.meadow = true; state.festival.cocoa.level = 1; state.coins = 10000;
  const calls = { saves: 0, draws: 0, notices: [], speech: [] };
  return { state, calls, ui: { state, scene: { place: null }, thumb: () => "", save: () => calls.saves++, draw: () => calls.draws++, tone() {}, notice: text => calls.notices.push(text), say: (...line) => calls.speech.push(line) } };
}
function select(sheet, data, value) {
  const rendered = body(sheet.body()); sheet.bind(rendered);
  const button = rendered.querySelectorAll(`[data-${data}]`).find(button => Object.values(button.dataset).includes(value)); assert.ok(button, `${data} ${value} is reachable`); button.click();
}

test("hospitality has one purchase home in Sandy's Upgrade tab and none in visitor categories", async () => {
  const { farmSheets, festivalMeadowSheet } = await menus(), h = setup(), sandy = festivalMeadowSheet(h.ui).festival;
  select(sandy, "sandy-section", "upgrade"); const saved = JSON.stringify(M.saveData(h.state)), html = sandy.body();
  assert.equal((html.match(/data-cocoa-hospitality-card/g) ?? []).length, 1); assert.match(html, /Cocoa hospitality/); assert.match(html, /Bring a friend required/); assert.match(html, /Opens after Bring a friend\./);
  assert.equal(JSON.stringify(M.saveData(h.state)), saved, "discovering the upgrade awards nothing");
  const visitors = farmSheets(h.ui).shop; visitors.setTab("visitors");
  for (const category of ["arrivals", "spending", "events"]) {
    select(visitors, "visitor-section", category); assert.doesNotMatch(visitors.body(), /data-visitup="cocoa"|Cocoa hospitality/);
  }
});

test("Sandy purchases the existing saved cocoa tier at its original price and retains its effects", async () => {
  const { festivalMeadowSheet } = await menus(), h = setup(); h.state.visitorUpgrades.party = 1;
  const sandy = festivalMeadowSheet(h.ui).festival; select(sandy, "sandy-section", "upgrade");
  const price = M.visitorUpgradeCost(h.state, "cocoa"), cash = h.state.coins, service = M.cocoaServiceSeconds(h.state), patience = M.stallPatience(h.state), stand = structuredClone(h.state.festival.cocoa);
  const rendered = body(sandy.body()); sandy.bind(rendered); const buy = rendered.querySelector("[data-cocoa-hospitality]"); assert.equal(buy.disabled, false); buy.click();
  assert.equal(h.state.coins, cash - price); assert.equal(h.state.visitorUpgrades.cocoa, 1); assert.ok(M.cocoaServiceSeconds(h.state) < service); assert.ok(M.stallPatience(h.state) > patience);
  assert.deepEqual(h.state.festival.cocoa, stand, "the original upgrade is not duplicated into stand state"); assert.equal(h.calls.saves, 1); assert.equal(h.calls.speech.length, 1);
  const loaded = M.restoreState(M.saveData(h.state)); assert.equal(loaded.visitorUpgrades.cocoa, 1); assert.equal(M.visitorUpgradeCost(loaded, "cocoa"), 700);
  h.ui.state = loaded; assert.match(sandy.body(), /Tier 1 of 3/); assert.match(sandy.body(), /Improve hospitality · £700/);
});

test("Sandy preserves prerequisite, affordability, paused and fully-owned states without charging twice", async () => {
  const { festivalMeadowSheet } = await menus(), h = setup(), sandy = festivalMeadowSheet(h.ui).festival; select(sandy, "sandy-section", "upgrade");
  const cash = h.state.coins; let rendered = body(sandy.body()); sandy.bind(rendered);
  const locked = rendered.querySelector("[data-cocoa-hospitality]"); assert.equal(locked.disabled, true); locked.onclick(); assert.equal(h.state.coins, cash); assert.equal(h.state.visitorUpgrades.cocoa, 0);
  h.state.visitorUpgrades.party = 1; h.state.coins = 249; rendered = body(sandy.body()); sandy.bind(rendered); assert.equal(rendered.querySelector("[data-cocoa-hospitality]").disabled, true);
  h.state.coins = cash; h.state.paused = true; rendered = body(sandy.body()); sandy.bind(rendered); const paused = rendered.querySelector("[data-cocoa-hospitality]"); assert.equal(paused.disabled, true); paused.onclick(); assert.equal(h.state.coins, cash);
  h.state.paused = false; h.state.visitorUpgrades.cocoa = 3; h.state.visitorUpgrades.party = 0;
  assert.match(sandy.body(), /Tier 3 of 3/); assert.match(sandy.body(), /Fully improved/); rendered = body(sandy.body()); sandy.bind(rendered); rendered.querySelector("[data-cocoa-hospitality]").onclick(); assert.equal(h.state.coins, cash);
  assert.equal(h.calls.saves, 0); assert.doesNotMatch(sandy.body(), /£NaN|£undefined/);
});
