import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { createVillageReturnPrompt } from "../src/ui/village-return-prompt.js";
import { createVillageQuestReceipt, villageQuestReceiptData } from "../src/ui/village-quest-receipt.js";
import { QUEST_BY_ID } from "../src/content/village-quests.js";

// Exercise the real event and lifecycle callbacks without WebGL or a browser.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.dataset = {}; this.hidden = false; this.disabled = false; this.attrs = {}; this.listeners = new Map(); this.classes = new Set();
    this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), contains: name => this.classes.has(name) };
  }
  set className(value) { this.classes = new Set(value.split(/\s+/)); }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === "id") this.id = value; if (key === "class") this.className = value; if (key === "hidden") this.hidden = true; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children.forEach(node => { node.parentElement = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this); this.parentElement = null; }
  get isConnected() { return this === this.doc.body || !!this.parentElement?.isConnected; }
  set innerHTML(value) {
    this.markup = value; this.replaceChildren(); const stack = [this];
    for (const match of value.matchAll(/<\/?[^>]+>/g)) {
      const token = match[0]; if (token.startsWith("</")) { stack.pop(); continue; }
      const tag = /^<([\w-]+)/.exec(token)?.[1]; if (!tag) continue;
      const element = new Element(tag, this.doc);
      for (const attr of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(attr[1], attr[2] ?? "");
      stack.at(-1).append(element); if (!["img", "input", "br", "hr", "meta", "link", "path"].includes(tag) && !token.endsWith("/>")) stack.push(element);
    }
  }
  matches(selector) { if (selector === ":hover") return !!this.hover; if (selector.startsWith("#")) return this.id === selector.slice(1); if (selector.startsWith(".")) return this.classes.has(selector.slice(1)); if (selector.startsWith("[")) return Object.hasOwn(this.attrs, selector.slice(1, -1)) || selector === "[hidden]" && this.hidden; return this.tagName === selector.toUpperCase(); }
  querySelectorAll(selector) { const matches = []; const visit = node => { for (const child of node.children) { if (child.matches(selector)) matches.push(child); visit(child); } }; visit(this); return matches; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  focus() { this.doc.activeElement = this; }
  click() { if (!this.disabled) for (const fn of this.listeners.get("click") ?? []) fn({ target: this, stopPropagation() {}, preventDefault() {} }); }
}
function harness(t) {
  const listeners = new Map(), doc = { createElement: tag => new Element(tag, doc), addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); } };
  doc.body = new Element("body", doc); doc.activeElement = doc.body;
  const original = Object.getOwnPropertyDescriptor(globalThis, "document"); Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  t.after(() => original ? Object.defineProperty(globalThis, "document", original) : delete globalThis.document);
  return { doc, listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0), key(key, shiftKey = false) { let prevented = false; const event = { key, shiftKey, preventDefault() { prevented = true; }, stopImmediatePropagation() {} }; for (const fn of [...listeners.get("keydown") ?? []]) fn(event); return prevented; } };
}
const example = quest => ({ type: "quest-done", quest, rewards: [{ kind: "coins", amount: 150 }] });
const labels = receipt => receipt.element.querySelectorAll(".village-receipt-chip").map(chip => chip.children.at(-1).textContent);

test("a real completed conversation receipt reports granted rewards without granting or changing state", () => {
  const state = M.freshState(); M.recordHomeActivity(state, "visit"); state.earned = M.LEVELS[2].at; M.awardLevels(state);
  M.inviteToVillage(state); M.finishTour(state); M.finishTalk(state, "invitation", "rowan");
  const events = M.finishTalk(state, "invitation", "elowen"), event = events.find(event => event.type === "quest-done"), saved = JSON.stringify(M.saveData(state));
  const data = villageQuestReceiptData(event);
  assert.equal(data.title, QUEST_BY_ID.invitation.title); assert.ok(data.rewards.some(row => row.label === "+£150"));
  assert.equal(data.rewards.length, event.rewards.length, "advertised friendship or unlocks absent from the event are never invented as new grants");
  assert.equal(JSON.stringify(M.saveData(state)), saved);
  assert.deepEqual(M.finishTalk(state, "invitation", "elowen"), [], "reopening a completed chat emits no completion receipt");
});

test("receipt data rejects unrelated or unknown events and labels converted rewards accurately", () => {
  assert.equal(villageQuestReceiptData({ type: "quest-step", quest: "invitation" }), null);
  assert.equal(villageQuestReceiptData({ type: "quest-done", quest: "missing-story" }), null);
  const state = M.freshState(); state.kitchen.recipes.push("garden-skillet");
  const granted = M.grantVillage(state, [{ kind: "recipe", id: "garden-skillet" }]);
  assert.equal(granted[0].duplicate, true);
  const data = villageQuestReceiptData({ type: "quest-done", quest: "invitation", rewards: [...granted, { kind: "coins", amount: NaN }] });
  assert.equal(data.rewards.length, 1); assert.match(data.rewards[0].label, /converted to bonus coins/); assert.doesNotMatch(data.rewards[0].label, /\+£|NaN/);
});

test("completion events are snapshotted and shown once in a bounded sequential queue", t => {
  const h = harness(t), receipt = createVillageQuestReceipt({ mount: h.doc.body, now: () => 0 });
  const event = example("invitation"); assert.equal(receipt.notify(event), true); event.rewards[0].amount = 9000;
  assert.equal(receipt.notify(structuredClone(event)), false);
  const other = Object.keys(QUEST_BY_ID).filter(id => id !== "invitation");
  for (const id of other.slice(0, 3)) assert.equal(receipt.notify(example(id)), true);
  assert.equal(receipt.notify(example(other[3])), false, "at most four pending/visible cards are retained");
  receipt.tick(); assert.equal(receipt.active, true); assert.deepEqual(labels(receipt), ["+£150"]); assert.equal(h.doc.activeElement, h.doc.body, "a receipt never takes movement focus");
  const dismiss = receipt.element.querySelector(".village-receipt-dismiss"); dismiss.click(); receipt.tick();
  assert.equal(receipt.element.dataset.quest, other[0]);
  receipt.clear(); receipt.tick(); assert.equal(receipt.active, false); assert.equal(receipt.notify(example("invitation")), false, "scene teardown cannot replay old completion events");
  receipt.destroy(); assert.equal(receipt.notify(example(other[4])), false);
});

test("receipts wait for dialogue and retain reading time while hovered or focused", t => {
  const h = harness(t); let clock = 0;
  const receipt = createVillageQuestReceipt({ now: () => clock, duration: 3000 }); receipt.notify(example("invitation"));
  receipt.tick({ blocked: true }); assert.equal(receipt.active, false); assert.equal(receipt.element.hidden, true);
  clock = 10000; receipt.tick(); assert.equal(receipt.active, true);
  receipt.element.hover = true; clock += 1000; receipt.tick(); clock += 1000; receipt.tick(); assert.equal(receipt.active, true);
  receipt.element.hover = false;
  for (let i = 0; i < 2; i++) { clock += 1000; receipt.tick(); }
  receipt.tick({ blocked: true }); clock += 10000; receipt.tick({ blocked: true }); receipt.tick();
  assert.equal(receipt.element.classList.contains("is-leaving"), false);
  clock += 1000; receipt.tick(); assert.equal(receipt.element.classList.contains("is-leaving"), true);
  clock += 250; receipt.tick(); assert.equal(receipt.active, false); receipt.destroy();
});

test("opening quests from a receipt is optional and runs once without completing or awarding anything", t => {
  const h = harness(t), opened = [];
  const receipt = createVillageQuestReceipt({ onOpenQuests: id => opened.push(id), now: () => 0 });
  receipt.notify(example("invitation")); receipt.tick(); const button = receipt.element.querySelector(".village-receipt-journal");
  assert.equal(button.hidden, false); button.click(); button.click(); assert.deepEqual(opened, ["invitation"]); assert.equal(receipt.active, false); receipt.destroy();
  const quiet = createVillageQuestReceipt({ now: () => 0 }); quiet.notify(example("invitation")); quiet.tick(); assert.equal(quiet.element.querySelector(".village-receipt-journal").hidden, true); quiet.destroy();
});

test("Return focuses the real confirm action and a confirmation runs once before releasing the modal", t => {
  const h = harness(t), opener = h.doc.createElement("button"); h.doc.body.append(opener); opener.focus(); let confirmations = 0, cancellations = 0;
  const prompt = createVillageReturnPrompt({ onConfirm() { confirmations++; assert.equal(prompt.active, false); }, onCancel() { cancellations++; } });
  assert.equal(prompt.open(), true); assert.equal(prompt.open(), false);
  const confirm = prompt.element.querySelector(".village-return-confirm"); assert.equal(h.doc.activeElement, confirm); assert.ok(Object.hasOwn(confirm.attrs, "data-pad-default"));
  assert.equal(prompt.element.attrs["aria-modal"], "true"); assert.equal(h.key("Enter"), false, "native Enter is not activated twice");
  confirm.click(); confirm.click(); assert.equal(confirmations, 1); assert.equal(cancellations, 0); assert.equal(h.doc.activeElement, opener);
  prompt.open(); prompt.close({ restoreFocus: false }); assert.equal(confirmations, 1); assert.equal(cancellations, 0, "programmatic close is silent");
  prompt.destroy(); assert.equal(prompt.open(), false); assert.equal(h.listenerCount(), 0);
});

test("Stay and Escape cancel once, contain Tab and release their keyboard boundary on close", t => {
  const h = harness(t); let cancellations = 0;
  const prompt = createVillageReturnPrompt({ onCancel: () => cancellations++ }); prompt.open();
  const confirm = prompt.element.querySelector(".village-return-confirm"), cancel = prompt.element.querySelector(".village-return-cancel");
  assert.equal(h.key("Tab"), true); assert.equal(h.doc.activeElement, cancel); assert.equal(h.key("Tab"), true); assert.equal(h.doc.activeElement, confirm);
  assert.equal(h.key("Tab", true), true); assert.equal(h.doc.activeElement, cancel);
  assert.equal(h.key("Escape"), true); assert.equal(prompt.active, false); assert.equal(cancellations, 1); assert.equal(h.key("Escape"), false);
  prompt.open(); cancel.click(); cancel.click(); assert.equal(cancellations, 2); prompt.destroy();
});

test("return legends follow actual input family and remain unchanged when opening without a fresh pad", t => {
  const h = harness(t), prompt = createVillageReturnPrompt(), confirm = prompt.element.querySelector(".village-return-confirm-glyph"), cancel = prompt.element.querySelector(".village-return-cancel-glyph");
  prompt.setInput("pad", { id: "DualSense Wireless Controller" }); prompt.open(); assert.match(confirm.markup, /data-ps5-icon="cross"/); assert.match(cancel.markup, /data-ps5-icon="circle"/);
  prompt.setInput("pad", { id: "Xbox Wireless Controller" }); assert.match(confirm.markup, /glyph-xbox-a/); assert.match(cancel.markup, /glyph-xbox-b/); assert.doesNotMatch(confirm.markup, /data-ps5-icon/);
  prompt.setInput("keyboard"); assert.match(confirm.markup, />Enter</); assert.match(cancel.markup, />Esc</);
  prompt.setInput("touch"); assert.equal(confirm.markup, ""); assert.equal(cancel.markup, ""); prompt.destroy();
});

test("a return callback may open the next menu without having its focus stolen", t => {
  const h = harness(t), opener = h.doc.createElement("button"), destination = h.doc.createElement("button"); h.doc.body.append(opener, destination); opener.focus();
  const prompt = createVillageReturnPrompt({ onConfirm: () => destination.focus() }); prompt.open(); prompt.confirm(); assert.equal(h.doc.activeElement, destination); prompt.destroy();
});
