import test from "node:test";
import assert from "node:assert/strict";
import { createIntro } from "../src/ui/intro.js";
import { INTRO_NARRATION, INTRO_LINES } from "../src/content/intro.js";
import { createVillageConversation, conversationPages, conversationChoiceSection } from "../src/ui/village-conversation.js";
import { FOLK_BY_ID } from "../src/content/village-folk.js";

// These DOM tests exercise the actual page/choice callbacks with fake audio.
// They need no WebGL scene, audio device, network or renderer.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.dataset = {}; this.hidden = false; this.disabled = false; this.attrs = {}; this.listeners = new Map(); this.classes = new Set();
    this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), contains: n => this.classes.has(n), toggle: (n, on = !this.classes.has(n)) => on ? this.classes.add(n) : this.classes.delete(n) };
  }
  set className(value) { this.classes = new Set(value.split(/\s+/)); }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === "id") this.id = value; if (key === "class") this.className = value; if (key === "hidden") this.hidden = true; if (key.startsWith("data-")) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = value; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children.forEach(node => { node.parentElement = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
  get isConnected() { return this === this.doc.body || !!this.parentElement?.isConnected; }
  get nextElementSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1]; }
  set innerHTML(value) {
    this.markup = value; this.replaceChildren(); const stack = [this];
    for (const match of value.matchAll(/<\/?[^>]+>/g)) {
      const token = match[0]; if (token.startsWith("</")) { stack.pop(); continue; }
      const tag = /^<([\w-]+)/.exec(token)?.[1]; if (!tag) continue;
      const el = new Element(tag, this.doc);
      for (const attr of token.slice(tag.length + 1, -1).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) el.setAttribute(attr[1], attr[2] ?? "");
      stack.at(-1).append(el); if (!["img", "input", "br", "hr", "meta", "link", "path"].includes(tag) && !token.endsWith("/>")) stack.push(el);
    }
  }
  matches(selector) { if (selector.startsWith("#")) return this.id === selector.slice(1); if (selector.startsWith(".")) return this.classes.has(selector.slice(1)); if (selector.startsWith("[")) return Object.hasOwn(this.attrs, selector.slice(1, -1)); return this.tagName === selector.toUpperCase(); }
  querySelectorAll(selector) { const matches = [], parts = selector.split(/\s+/); const visit = node => { for (const child of node.children) { if (child.matches(parts.at(-1))) { let parent = child.parentElement, i = parts.length - 2; while (i >= 0 && parent) { if (parent.matches(parts[i])) i--; parent = parent.parentElement; } if (i < 0) matches.push(child); } visit(child); } }; visit(this); return matches; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  focus() { this.doc.activeElement = this; }
  click() { if (this.disabled) return; const event = { target: this, stopPropagation() {}, preventDefault() {} }; for (const fn of this.listeners.get("click") ?? []) fn(event); }
}
function harness(t) {
  const listeners = new Map();
  const doc = { createElement: tag => new Element(tag, doc), getElementById: id => doc.body.querySelector("#" + id), addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); } };
  doc.body = new Element("body", doc); doc.activeElement = doc.body;
  const original = new Map();
  for (const [name, value] of Object.entries({ document: doc, window: { innerHeight: 800 }, matchMedia: () => ({ matches: true }) })) { original.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, value }); }
  t.after(() => { for (const [name, desc] of original) desc ? Object.defineProperty(globalThis, name, desc) : delete globalThis[name]; });
  const calls = [], subscribers = new Set(), audio = { enabled: true, playing: false, current: null,
    play(speaker, text) { calls.push(["play", speaker, text]); this.current = { speaker, text, status: this.enabled ? "playing" : "idle" }; this.playing = this.enabled; this.emit(); },
    stop() { calls.push(["stop"]); this.playing = false; if (this.current) this.current.status = "idle"; this.emit(); },
    replay() { calls.push(["replay"]); this.play(this.current.speaker, this.current.text); },
    setEnabled(on) { this.enabled = on; if (!on) this.stop(); this.emit(); },
    subscribe(fn) { subscribers.add(fn); fn(); return () => subscribers.delete(fn); }, emit() { for (const fn of subscribers) fn(); },
  };
  return { doc, audio, calls, subscribers, latest: () => calls.filter(call => call[0] === "play").at(-1), key(key, shiftKey = false) { let prevented = false; const event = { key, shiftKey, target: doc.activeElement, preventDefault() { prevented = true; }, stopImmediatePropagation() {} }; for (const fn of [...listeners.get("keydown") ?? []]) fn(event); return prevented; } };
}

test("conversation voices follow each portrait; choices stay silent and replay grants no story progress", t => {
  const h = harness(t); let answers = 0, completed = 0, closed = 0, prefs = 0;
  const dialogue = createVillageConversation({ narration: h.audio, savePrefs: () => prefs++, portrait: id => id + ".webp", onChoice() { answers++; return "The right doorbell. Thank you."; }, onContinue() { completed++; }, onClose() { closed++; } });
  const panel = h.doc.getElementById("village-dialogue"), next = panel.querySelector("[data-village-dialogue-next]"), replay = panel.querySelector("[data-voice-replay]"), toggle = panel.querySelector("[data-voice-toggle]");
  dialogue.open({ id: "rowan", name: FOLK_BY_ID.rowan.name, lines: ["My workshop.", { who: "elowen", text: "And my library." }, { choices: [{ text: "Player words stay silent", reply: "unused" }] }] });
  assert.deepEqual(h.latest(), ["play", "rowan", "My workshop."]);
  next.click(); assert.deepEqual(h.latest(), ["play", "elowen", "And my library."]);
  assert.equal(panel.querySelector("h2").textContent, FOLK_BY_ID.elowen.name); assert.equal(panel.querySelector(".village-person-art").children[0].src, "elowen.webp");
  const plays = h.calls.filter(call => call[0] === "play").length;
  next.click(); assert.equal(h.calls.filter(call => call[0] === "play").length, plays); assert.equal(h.audio.playing, false); assert.equal(replay.disabled, true);
  panel.querySelector(".village-reply").click(); assert.equal(answers, 1); assert.deepEqual(h.latest(), ["play", "elowen", "The right doorbell. Thank you."]);
  panel.querySelector(".village-reply").click(); replay.click(); assert.equal(answers, 1); assert.equal(completed, 0); assert.equal(closed, 0);
  toggle.click(); assert.equal(h.audio.enabled, false); assert.equal(h.audio.playing, false); toggle.click(); assert.equal(h.audio.enabled, true); assert.equal(prefs, 2); assert.equal(answers, 1);
  next.click(); assert.equal(completed, 1); assert.equal(closed, 1); assert.equal(h.audio.playing, false);
  dialogue.dispose(); assert.equal(h.subscribers.size, 0);
});

test("closing or replacing a conversation cancels narration without completing a quest", t => {
  const h = harness(t); let completed = 0;
  const dialogue = createVillageConversation({ narration: h.audio, onContinue: () => completed++ });
  dialogue.open({ id: "rowan", lines: ["First", "Second"] }); dialogue.close(); assert.equal(h.audio.playing, false); assert.equal(completed, 0);
  dialogue.open({ id: "elowen", lines: ["A new visit"] }); assert.deepEqual(h.latest(), ["play", "elowen", "A new visit"]); dialogue.dispose(); assert.equal(h.audio.playing, false); assert.equal(completed, 0);
  assert.equal(conversationPages([{ who: "elowen", choices: [{ text: "Yes" }] }])[0].who, "elowen");
});

test("missing recordings leave subtitles readable and disable only that line's replay", t => {
  const h = harness(t); let completed = 0;
  h.audio.play = function (speaker, text) { const available = text !== "The workshop needs a door."; h.calls.push(["play", speaker, text]); this.current = { speaker, text, available, status: available ? "playing" : "missing" }; this.playing = available && this.enabled; this.emit(); };
  const dialogue = createVillageConversation({ narration: h.audio, onContinue: () => completed++ });
  dialogue.open({ id: "rowan", lines: ["The workshop needs a door.", "Good evening."] });
  const panel = h.doc.getElementById("village-dialogue"), replay = panel.querySelector("[data-voice-replay]"), next = panel.querySelector("[data-village-dialogue-next]");
  assert.equal(panel.querySelector(".village-dialogue-line").textContent, "The workshop needs a door."); assert.equal(next.hidden, false);
  assert.equal(replay.disabled, true); assert.equal(replay.title, "No recording for this line"); assert.equal(replay.attrs["aria-label"], "No recording for this line");
  assert.equal(panel.querySelector(".narration-status").hidden, true); const before = h.calls.length; replay.click(); assert.equal(h.calls.length, before); assert.equal(completed, 0);
  h.audio.stop(); assert.equal(replay.disabled, true, "stopping retains the missing recording state");
  next.click(); assert.equal(replay.disabled, false); assert.equal(replay.attrs["aria-label"], "Replay this line"); replay.click(); assert.deepEqual(h.latest(), ["play", "rowan", "Good evening."]); assert.equal(completed, 0);
  dialogue.dispose();
});

test("dialogue exposes its current text and puts controller focus on the visible reply path", t => {
  const h = harness(t); let answers = 0, completed = 0;
  const dialogue = createVillageConversation({ onChoice() { answers++; return "Thank you for listening."; }, onContinue() { completed++; } });
  dialogue.open({ id: "elowen", name: "Elowen Mothwick", lines: [{ choices: [{ tone: "warm", text: "I would love to help." }, { tone: "curious", text: "What happened here?" }] }] });
  const panel = h.doc.getElementById("village-dialogue"), reply = panel.querySelector(".village-reply"), next = panel.querySelector("[data-village-dialogue-next]");
  assert.equal(panel.attrs["aria-describedby"], "village-dialogue-line");
  assert.equal(panel.querySelector(".village-dialogue-line").attrs["aria-atomic"], "true");
  assert.equal(panel.dataset.dialogueState, "choice"); assert.ok(Object.hasOwn(reply.attrs, "data-pad-default")); assert.equal(next.hidden, true); assert.equal(h.doc.activeElement, reply);
  reply.click(); reply.click(); assert.equal(answers, 1); assert.equal(completed, 0);
  assert.equal(panel.dataset.dialogueState, "speaking"); assert.equal(h.doc.activeElement, next); assert.equal(next.hidden, false);
  next.click(); assert.equal(completed, 1); dialogue.dispose();
});

test("Tab contains the current reply path and ignores hidden narration and Continue buttons", t => {
  const h = harness(t), opener = h.doc.createElement("button"); h.doc.body.append(opener); opener.focus();
  const dialogue = createVillageConversation();
  dialogue.open({ id: "elowen", lines: [{ choices: [{ text: "I can help." }, { text: "Tell me more." }] }] });
  const panel = h.doc.getElementById("village-dialogue"), replies = panel.querySelectorAll(".village-reply"), close = panel.querySelector("[data-village-dialogue-close]");
  assert.equal(panel.attrs["aria-modal"], "true"); assert.equal(h.doc.activeElement, replies[0]);
  replies[1].focus(); assert.equal(h.key("Tab"), true); assert.equal(h.doc.activeElement, close);
  assert.equal(h.key("Tab", true), true); assert.equal(h.doc.activeElement, replies[1], "hidden Next and voice buttons are never focused");
  assert.equal(h.key("Enter"), false, "native button activation is not handled twice");
  dialogue.close(); assert.equal(h.doc.activeElement, opener); assert.equal(h.key("Tab"), false, "closing releases the keyboard boundary");
  dialogue.dispose();
});

test("a speaking page focuses Continue and replacement conversations keep their real opener", t => {
  const h = harness(t), opener = h.doc.createElement("button"); h.doc.body.append(opener); opener.focus();
  const dialogue = createVillageConversation({ narration: h.audio });
  dialogue.open({ id: "rowan", lines: ["A new door.", "A new beginning."] });
  const panel = h.doc.getElementById("village-dialogue"), next = panel.querySelector("[data-village-dialogue-next]"), close = panel.querySelector("[data-village-dialogue-close]");
  assert.equal(h.doc.activeElement, next); assert.equal(panel.querySelector(".village-dialogue-next-label").textContent, "Continue");
  assert.equal(h.key("Tab"), true); assert.equal(h.doc.activeElement, close);
  assert.equal(h.key("Tab", true), true); assert.equal(h.doc.activeElement, next);
  dialogue.open({ id: "elowen", lines: ["And a new story."] });
  assert.equal(h.doc.activeElement, next); assert.equal(panel.querySelector(".village-dialogue-next-label").textContent, "Finish chat");
  dialogue.close(); assert.equal(h.doc.activeElement, opener, "replacement never saves the previous dialogue button as its opener");
  dialogue.dispose();
});

test("a close callback can hand off to another conversation without stealing its focus", t => {
  const h = harness(t), opener = h.doc.createElement("button"); h.doc.body.append(opener); opener.focus(); let handoff = false;
  const dialogue = createVillageConversation({ onClose() { if (!handoff) { handoff = true; dialogue.open({ id: "elowen", lines: [{ choices: [{ text: "I am listening." }] }] }); } } });
  dialogue.open({ id: "rowan", lines: ["Elowen has something to say."] }); dialogue.close();
  const panel = h.doc.getElementById("village-dialogue");
  assert.equal(dialogue.active, true); assert.equal(h.doc.activeElement, panel.querySelector(".village-reply"), "new session keeps its primary action");
  dialogue.close(); assert.equal(h.doc.activeElement, opener, "the hand-off retains the original world/menu opener"); dialogue.dispose();
});

test("a completed page can open another session without closing or answering the new one", t => {
  const h = harness(t); let completed = 0, answered = 0;
  const dialogue = createVillageConversation({ onContinue() { completed++; dialogue.open({ id: "elowen", lines: [{ choices: [{ text: "What can I do?" }] }] }); }, onChoice() { answered++; } });
  dialogue.open({ id: "rowan", lines: ["You should meet Elowen."] });
  const panel = h.doc.getElementById("village-dialogue"), next = panel.querySelector("[data-village-dialogue-next]"); next.click();
  assert.equal(completed, 1); assert.equal(dialogue.active, true); assert.equal(h.doc.activeElement, panel.querySelector(".village-reply"));
  next.click(); assert.equal(completed, 1); assert.equal(answered, 0, "a stale primary action cannot answer the replacement"); dialogue.dispose();
});

test("a greeting focuses the first usable real action and keeps requirement copy beside disabled choices", t => {
  const h = harness(t); let answered = 0;
  const dialogue = createVillageConversation({ onChoice(index, metadata) { answered++; assert.equal(index, 1); assert.equal(metadata.choice.id, "chat"); return { handled: true }; } });
  dialogue.open({ id: "rowan", intent: "greeting", lines: [{ text: "Good evening.", choices: [{ id: "quest", intent: "quest", text: "Restore the door", description: "Bring 12 logs first", disabled: true }, { id: "chat", intent: "chat", text: "Have a chat" }, { id: "gift", intent: "gift", label: "Give a present" }] }] });
  const panel = h.doc.getElementById("village-dialogue"), choices = panel.querySelectorAll(".village-reply");
  assert.equal(panel.dataset.dialogueIntent, "greeting"); assert.equal(h.doc.activeElement, choices[1]); assert.equal(choices[0].disabled, true);
  assert.equal(choices[0].querySelector(".village-reply-note").textContent, "Bring 12 logs first");
  assert.equal(choices[2].querySelector(".village-reply-label").textContent, "Give a present");
  assert.ok(Object.hasOwn(choices[1].attrs, "data-pad-default")); assert.equal(Object.hasOwn(choices[0].attrs, "data-pad-default"), false);
  assert.equal(choices[0].querySelector(".dialogue-choice-icon").attrs["data-dialogue-icon"], "quest");
  assert.equal(choices[2].querySelector(".dialogue-choice-icon").attrs["data-dialogue-icon"], "gift");
  choices[0].click(); assert.equal(answered, 0); choices[1].click(); choices[1].click(); assert.equal(answered, 1);
  assert.equal(panel.querySelector(".village-dialogue-line").textContent, "Good evening.", "handled actions never invent a Thank-you reply"); dialogue.dispose();
});

test("detached replies from a replaced conversation cannot spend or answer in the new session", t => {
  const h = harness(t); let answered = 0;
  const dialogue = createVillageConversation({ onChoice() { answered++; return "A real reply."; } });
  dialogue.open({ id: "rowan", lines: [{ choices: [{ id: "gift", intent: "gift", text: "Give a present" }] }] });
  const panel = h.doc.getElementById("village-dialogue"), stale = panel.querySelector(".village-reply");
  dialogue.open({ id: "elowen", lines: [{ choices: [{ text: "Tell me about the Green." }] }] });
  stale.click(); assert.equal(answered, 0); assert.equal(panel.dataset.dialogueState, "choice");
  panel.querySelector(".village-reply").click(); assert.equal(answered, 1); assert.equal(panel.querySelector(".village-dialogue-line").textContent, "A real reply."); dialogue.dispose();
});

test("conversation prompts switch with actual input and retain the supplied controller family when opening", t => {
  const h = harness(t), dialogue = createVillageConversation();
  dialogue.setInput("pad", { id: "DualSense Wireless Controller" });
  dialogue.open({ id: "rowan", lines: [{ choices: [{ text: "A friendly word." }] }] });
  const panel = h.doc.getElementById("village-dialogue"), confirm = () => panel.querySelector(".village-reply").querySelector(".village-dialogue-confirm");
  assert.equal(panel.dataset.input, "dualsense"); assert.match(confirm().markup, /data-ps5-icon="cross"/);
  assert.match(panel.querySelector(".village-dialogue-back-glyph").markup, /data-ps5-icon="circle"/);
  dialogue.setInput("pad", { id: "Xbox Wireless Controller" }); assert.equal(panel.dataset.input, "xbox"); assert.match(confirm().markup, /glyph-xbox-a/); assert.doesNotMatch(confirm().markup, /data-ps5-icon/);
  dialogue.setInput("keyboard"); assert.match(confirm().markup, />Enter</); assert.doesNotMatch(confirm().markup, />E</, "the conversation uses native Enter, not the world's E action");
  dialogue.setInput("touch"); assert.equal(confirm().markup, ""); assert.equal(panel.querySelector(".village-dialogue-back-glyph").markup, ""); dialogue.dispose();
});

test("greeting section headings preserve disabled, unknown and canonical action order with once-only callbacks", t => {
  const h = harness(t), game = h.doc.createElement("section"); game.id = "village-game"; h.doc.body.append(game);
  const choices = [
    { id: "chat", intent: "chat", label: "Have a chat", disabled: true, description: "Ready in 20s" },
    { id: "quest:start:rowan-1", intent: "quest", label: "Loose Boards" },
    { id: "stories", intent: "stories", label: "Other stories" },
    { id: "farm-gifts", intent: "workshop", label: "Bring a discovery home" },
    { id: "companion", intent: "companion", label: "Come exploring with me" },
    { id: "gift", intent: "gift", label: "Give a present" },
    { id: "unknown", intent: "future-intent", label: "An authored action" },
    { id: "leave", intent: "leave", label: "See you soon" },
  ], snapshot = JSON.stringify(choices);
  let accepted = 0;
  const dialogue = createVillageConversation({ onChoice(index, metadata) { accepted++; assert.equal(index, 4); assert.equal(metadata.choice, choices[4]); return { handled: true }; } });
  dialogue.open({ id: "rowan", intent: "greeting", lines: [{ text: "Good evening.", choices }] });
  const panel = h.doc.getElementById("village-dialogue"), buttons = panel.querySelectorAll(".village-reply"), sections = panel.querySelectorAll(".village-response-section");
  assert.deepEqual(buttons.map(button => button.dataset.villageChoiceId), choices.map(choice => choice.id));
  assert.deepEqual(buttons.map(button => button.dataset.villageChoice), choices.map((_, index) => String(index)));
  assert.equal(buttons[0].disabled, true); assert.equal(h.doc.activeElement, buttons[1]);
  for (const [index, art, semantic] of [[0, "chat", "chat"], [1, "journal", "quest"], [2, "chat", "chat"], [3, "satchel", "quest"], [4, "compass", "about"], [5, "satchel", "gift"], [7, "back", "leave"]]) {
    const icon = buttons[index].querySelector(".dialogue-choice-icon");
    assert.equal(icon.dataset.dialogueIcon, semantic); assert.ok(icon.querySelector(".vf-art-" + art), `the ${choices[index].intent} picture keeps its semantic wrapper`);
  }
  assert.equal(buttons[6].querySelector(".vf-art"), null, "unknown metadata keeps its canonical fallback icon");
  assert.deepEqual(sections.map(section => section.querySelector("h3").textContent), ["Stories", "Activities"]);
  assert.deepEqual(sections[0].querySelectorAll("button").map(button => button.dataset.villageChoiceId), ["quest:start:rowan-1", "stories"]);
  assert.deepEqual(sections[1].querySelectorAll("button").map(button => button.dataset.villageChoiceId), ["farm-gifts", "companion"]);
  for (const section of sections) { const title = section.querySelector("h3"); assert.equal(section.attrs["role"], "group"); assert.equal(section.attrs["aria-labelledby"], title.id); assert.equal(Object.hasOwn(title.attrs, "tabindex"), false); }
  assert.equal(buttons[6].parentElement, panel.querySelector(".village-dialogue-replies"), "unknown metadata is not assigned a guessed category");
  buttons[4].click(); buttons[4].click(); assert.equal(accepted, 1); assert.equal(JSON.stringify(choices), snapshot);
  dialogue.dispose();
});

test("section labels rely on greeting intents while ordinary written replies retain their original path", t => {
  const h = harness(t), dialogue = createVillageConversation();
  assert.equal(conversationChoiceSection("quest"), "Stories"); assert.equal(conversationChoiceSection("stories"), "Stories");
  assert.equal(conversationChoiceSection("workshop"), "Activities"); assert.equal(conversationChoiceSection("companion"), "Activities");
  for (const intent of [undefined, "chat", "gift", "warm", "future-intent"]) assert.equal(conversationChoiceSection(intent), null);
  dialogue.open({ id: "elowen", intent: "chat", lines: [{ choices: [{ id: "written", intent: "quest", tone: "curious", text: "What happened next?" }, { id: "reply", tone: "warm", text: "I am listening." }] }] });
  const panel = h.doc.getElementById("village-dialogue");
  assert.equal(panel.querySelectorAll(".village-response-section").length, 0);
  assert.deepEqual(panel.querySelectorAll(".village-reply").map(button => button.dataset.villageChoiceId), ["written", "reply"]);
  assert.equal(panel.querySelector(".village-reply-tone").textContent, "Curious"); dialogue.dispose();
});

test("the speech header shows only the supplied current speaker's real friendship metadata", t => {
  const h = harness(t), friend = { level: 4, title: "Pal", progress: .375 }, before = JSON.stringify(friend);
  const dialogue = createVillageConversation({ portrait: id => id + ".webp" });
  dialogue.open({ id: "rowan", friendship: friend, lines: [{ text: "A familiar face." }, { who: "elowen", text: "A different neighbour." }] });
  const panel = h.doc.getElementById("village-dialogue"), bond = panel.querySelector(".village-dialogue-bond"), next = panel.querySelector("[data-village-dialogue-next]");
  assert.equal(bond.parentElement, panel.querySelector(".village-dialogue-head")); assert.equal(bond.hidden, false);
  assert.equal(bond.querySelector("span").textContent, "Level 4 · Pal"); assert.equal(bond.querySelector("meter").value, .375);
  next.click(); assert.equal(bond.hidden, true); assert.equal(bond.children.length, 0, "another speaker never inherits Rowan's progress");
  dialogue.open({ id: "vesper", lines: ["Welcome to the Velvet Bat."] }); assert.equal(bond.hidden, true); assert.equal(bond.children.length, 0);
  assert.equal(JSON.stringify(friend), before); dialogue.dispose();
});

test("introduction speaks its title and alternating lines; replay and mute do not advance it", t => {
  const h = harness(t), overlay = h.doc.createElement("section"); overlay.id = "intro"; h.doc.body.append(overlay); let released = 0;
  const intro = createIntro({ narration: h.audio, people: { shane: ["Shane", "Farmer"], natalie: ["Natalie", "Farmer"] }, portrait: id => id + ".webp", pumpkin: () => null, hold() {}, release: () => released++, onOpen() {} });
  intro.play(); assert.deepEqual(h.latest(), ["play", "natalie", INTRO_NARRATION]);
  overlay.querySelector("[data-voice-replay]").click(); assert.equal(intro.step, 0); assert.equal(released, 0);
  intro.next(); assert.deepEqual(h.latest(), ["play", INTRO_LINES[0].who, INTRO_LINES[0].text]); intro.next(); assert.deepEqual(h.latest(), ["play", INTRO_LINES[1].who, INTRO_LINES[1].text]);
  h.audio.current.status = "blocked"; h.audio.playing = false; h.audio.emit(); assert.equal(overlay.querySelector(".narration-status").hidden, false); assert.equal(overlay.querySelector("[data-voice-replay]").attrs["aria-label"], "Play this line");
  overlay.querySelector("[data-voice-toggle]").click(); assert.equal(intro.step, 2); assert.equal(h.audio.playing, false);
  intro.skip(); assert.equal(intro.active, false); assert.equal(h.audio.playing, false); assert.equal(released, 1); assert.equal(h.subscribers.size, 0);
});
