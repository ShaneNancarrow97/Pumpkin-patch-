import test from "node:test";
import assert from "node:assert/strict";
import { createIntro } from "../src/ui/intro.js";
import { INTRO_NARRATION, INTRO_LINES } from "../src/content/intro.js";
import { createVillageConversation, conversationPages } from "../src/ui/village-conversation.js";
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
    this.replaceChildren(); const stack = [this];
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
  assert.equal(h.doc.activeElement, next); assert.equal(next.textContent, "Continue");
  assert.equal(h.key("Tab"), true); assert.equal(h.doc.activeElement, close);
  assert.equal(h.key("Tab", true), true); assert.equal(h.doc.activeElement, next);
  dialogue.open({ id: "elowen", lines: ["And a new story."] });
  assert.equal(h.doc.activeElement, next); assert.equal(next.textContent, "Finish chat");
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
