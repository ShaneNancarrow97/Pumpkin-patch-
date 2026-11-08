import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import * as THREE from "three";
import * as M from "../src/model.js";
import { buildSaveFile, readSaveFile } from "../src/save-file.js";
import { NODES, ARRIVAL, PLAN_SCALE as K } from "../src/content/village.js";

// The controller is exercised without a renderer or browser. Art URLs are the
// only substituted imports; its village rules and room plans remain the real ones.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await esbuild.build({ entryPoints: [path.join(root, "src/village-game.js")], bundle: true, platform: "node", format: "esm", write: false, minify: true,
  plugins: [{ name: "headless-art", setup(build) { build.onLoad({ filter: /\.(webp|png|mp3)$/ }, () => ({ contents: 'export default "headless-art"', loader: "js" })); } }], logLevel: "silent" });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "village-controller-test-")), modulePath = path.join(temp, "controller.mjs");
await fs.writeFile(modulePath, bundle.outputFiles[0].text);
let createVillageGame;
const initialDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => ({ getContext: () => ({}) }) } });
try { ({ createVillageGame } = await import(pathToFileURL(modulePath))); } finally { await fs.rm(temp, { recursive: true, force: true }); initialDocument ? Object.defineProperty(globalThis, "document", initialDocument) : delete globalThis.document; }
const dataName = name => name.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());

class Element {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.dataset = {}; this.style = {}; this.hidden = false; this.disabled = false; this.attributes = {}; this.classes = new Set(); this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x) }; }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === "id") this.id = value; if (key === "class") this.classes = new Set(String(value).split(/\s+/)); if (key.startsWith("data-")) this.dataset[dataName(key)] = value; if (key === "hidden") this.hidden = true; if (key === "disabled") this.disabled = true; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); }
  set innerHTML(html) {
    this.html = html; this.children = []; const stack = [this];
    for (const match of html.matchAll(/<\/?[^>]+>/g)) {
      const token = match[0]; if (token.startsWith("</")) { if (stack.length > 1) stack.pop(); continue; }
      const tag = /^<([\w-]+)/.exec(token)?.[1]; if (!tag) continue;
      const el = new Element(tag, this.doc);
      const attrs = token.slice(tag.length + 1, -1); for (const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g)) el.setAttribute(a[1], a[2] ?? a[3] ?? a[4] ?? "");
      stack.at(-1).append(el); if (!["img", "input", "br", "hr", "meta", "link"].includes(tag) && !token.endsWith("/>")) stack.push(el);
    }
  }
  get innerHTML() { return this.html ?? ""; }
  matches(selector) {
    selector = selector.trim(); if (selector === "button:not(:disabled)") return this.tagName === "BUTTON" && !this.disabled;
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) return this.classes.has(selector.slice(1));
    const attr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector); if (attr) return Object.hasOwn(this.attributes, attr[1]) && (attr[2] === undefined || this.attributes[attr[1]] === attr[2]);
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) { const bits = selector.trim().split(/\s+/), out = []; const walk = el => { for (const child of el.children) { if (child.matches(bits.at(-1))) { let ancestor = child.parentElement, i = bits.length - 2; while (i >= 0 && ancestor) { if (ancestor.matches(bits[i])) i--; ancestor = ancestor.parentElement; } if (i < 0) out.push(child); } walk(child); } }; walk(this); return out; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { for (let el = this; el; el = el.parentElement) if (selector.split(",").some(s => el.matches(s))) return el; return null; }
  focus() { this.doc.activeElement = this; }
  click() { if (!this.disabled) this.onclick?.(); }
  getClientRects() { for (let el = this; el; el = el.parentElement) if (el.hidden) return []; return [{}]; }
  setPointerCapture() {}
}
function farm(level = 3) { const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[level - 1].at; M.awardLevels(s); return s; }
function harness(t, s = farm()) {
  const doc = { createElement(tag) { return new Element(tag, doc); }, getElementById(id) { return doc.body.querySelector("#" + id); } }; doc.body = new Element("body", doc); doc.activeElement = doc.body;
  const listeners = new Map(), globals = new Map(), pad = { connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
  for (const [key, value] of Object.entries({ document: doc, navigator: { getGamepads: () => [pad] }, addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); } })) { globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
  const cameraCalls = { follow: 0, reset: 0, focus: [] };
  const notices = [], saves = [], owner = { enabled: true, who: "natalie" }, actors = [], picture = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); camera.position.set(87, 8, 15); camera.lookAt(87, 1, -4.5);
  let inside = null, touring = false, finishTour = null, conversation = null, callback = null, menuCloses = 0, leaves = 0;
  const view = { scene: picture, camera, groundAt: () => 0, sync() {}, folk: { mood() {}, talkSpot: id => ({ x: id === "rowan" ? 80 : 81, z: 30 }) }, play: { reset() { cameraCalls.reset++; }, follow() { cameraCalls.follow++; }, look() {}, zoom() {} }, cameraActions: { focus(...args) { cameraCalls.focus.push(args); } }, get inside() { return inside; }, goInside(id) { inside = id; }, goOutside() { inside = null; }, hallPoint(x, z, y = 0) { return new THREE.Vector3(4000 + x * K, y * K, z * K); }, director: { get active() { return touring; }, start(title, done) { touring = true; finishTour = done; title({ title: "Mothlight", sub: "Welcome" }); }, skip() { if (!touring) return; touring = false; finishTour(); } } };
  const scene = { villageView: view, place: null, player: { state: () => ({ ...owner }), setEnabled(on, who = owner.who) { owner.enabled = on; owner.who = who; } }, enter(kind) { this.place = { kind }; }, leavePlace() { touring = false; this.place = null; }, villageCharacter() { const actor = new THREE.Group(), frame = new THREE.Group(); actor.add(new THREE.Group()); actor.userData = { idle: [frame], walk: [frame], shown: frame, show() {}, dispose() { actor.userData.disposed = true; } }; actors.push(actor); return actor; } };
  const game = createVillageGame({ state: () => s, scene, save: () => saves.push(M.saveData(s)), notice: n => notices.push(n), closeMenus: () => menuCloses++, onLeave: () => leaves++, portrait: () => null, conversationView(options) { callback = options; return { open(options) { conversation = options; }, close() { if (conversation) { conversation = null; options.onClose(); } }, get active() { return !!conversation; }, dispose() { this.close(); } }; } });
  const h = { game, state: s, doc, scene, view, cameraCalls, owner, actors, saves, notices, listeners, pad, get conversation() { return conversation; }, get menuCloses() { return menuCloses; }, get leaves() { return leaves; }, complete() { callback.onContinue({ finished: true }); }, choose(index = 0) { return callback.onChoice(index); }, $(selector) { return doc.body.querySelector(selector); }, click(selector) { const el = doc.body.querySelector(selector); assert.ok(el, selector); assert.equal(el.disabled, false, selector + " enabled"); el.click(); }, key(type, key, target = doc.body) { for (const fn of listeners.get(type) ?? []) fn({ key, target, preventDefault() {}, stopImmediatePropagation() {}, repeat: false }); }, press(button) { pad.buttons[button].pressed = true; game.tick(.1); pad.buttons[button].pressed = false; game.tick(.1); } };
  t.after(() => { game.dispose(); for (const [key, desc] of globals) desc ? Object.defineProperty(globalThis, key, desc) : delete globalThis[key]; }); return h;
}
function welcome(h) { h.game.open(); h.game.back(); for (const who of ["rowan", "elowen"]) { h.game.meet(who); assert.ok(h.conversation); h.complete(); } }

test("saved travel gates at level 3 and completes the real invitation before level 4", t => {
  const h = harness(t, farm(2)); assert.equal(h.game.open(), false); assert.equal(h.state.village.invited, false); assert.equal(h.saves.length, 0);
  h.state.earned = M.LEVELS[3].at + h.state.progression.bonusEarned; M.awardLevels(h.state); assert.equal(M.patchLevel(h.state).level, 3);
  h.state.paused = true; assert.equal(h.game.open(), false); h.state.paused = false;
  assert.equal(h.game.open(), true); assert.equal(h.state.village.visits, 1); assert.equal(h.owner.enabled, false); assert.equal(h.game.open(), true); assert.equal(h.state.village.visits, 1);
  h.game.back(); assert.equal(h.state.village.toured, true); assert.equal(M.questStep(h.state, "invitation").who, "rowan");
  h.game.meet("rowan"); h.game.back(); assert.equal(M.questStep(h.state, "invitation").who, "rowan", "closing a chat grants no quest progress");
  for (const who of ["rowan", "elowen"]) { h.game.meet(who); assert.equal(h.conversation.id, who); h.complete(); }
  assert.equal(M.questStatus(h.state, "invitation"), "done"); assert.equal(M.canGather(h.state), true); assert.equal(M.patchLevel(h.state).level, 4); assert.ok(h.saves.at(-1).village.quests.invitation.done);
  h.game.close(); assert.equal(h.owner.enabled, true); assert.equal(h.owner.who, "natalie"); assert.equal(h.game.active, false); assert.equal(h.scene.place, null);
  const loaded = readSaveFile(JSON.stringify(buildSaveFile(h.state, { savedAt: "2026-11-06T12:00:00.000Z" }))); assert.equal(loaded.ok, true); assert.equal(loaded.edited, false); assert.equal(loaded.state.village.quests.invitation.done, true); assert.equal(M.patchLevel(loaded.state).level, 4);
});

test("resident panels use real gift and chat shapes, and each chat answer saves once", t => {
  const h = harness(t); welcome(h); h.state.stock[0] = 3;
  h.game.showPanel("people"); h.click('[data-vg-meet="rowan"]'); assert.equal(h.game.status.panel, "resident");
  const xp = h.state.village.friends.rowan.xp; h.click('[data-vg-chat="rowan"]'); assert.equal(h.conversation.id, "rowan"); assert.equal(typeof h.choose(0), "string"); const after = h.state.village.friends.rowan.xp; assert.ok(after > xp); h.choose(0); assert.equal(h.state.village.friends.rowan.xp, after); h.complete();
  h.game.meet("rowan"); h.click('[data-vg-gift="pumpkin:orange"]'); assert.equal(h.state.stock[0], 2); assert.equal(h.state.village.friends.rowan.gifts.length, 1); assert.ok(h.conversation.lines[0]); h.complete();
  assert.equal(h.$("#vg-coins").textContent, "£" + Math.round(h.state.coins).toLocaleString("en-GB"));
});

test("Rowan's UI callbacks consume gathered materials, charge the opening cost and save a stall purchase", t => {
  const h = harness(t); welcome(h); h.state.coins = 1000;
  h.game.meet("rowan"); h.click('[data-vg-start="rowan-1"]'); h.complete(); assert.equal(h.game.status.panel, "journal"); h.game.back();
  for (const material of ["logs", "logs", "stone"]) { const node = NODES.find(n => n.district === "green" && n.material === material && M.nodeReady(h.state, n.id)); assert.ok(node, material); h.game.pick({ type: "village-node", id: node.id }); }
  h.game.meet("rowan"); h.click('[data-vg-handover="rowan"]'); assert.equal(M.questStatus(h.state, "rowan-1"), "done"); assert.equal(h.state.village.materials.stone, 0);
  h.click('[data-vg-start="rowan-stall"]'); h.complete(); h.game.back();
  for (const material of ["stone", "fibre", "fibre", "fibre"]) { const node = NODES.find(n => n.district === "green" && n.material === material && M.nodeReady(h.state, n.id)); assert.ok(node, material); h.game.pick({ type: "village-node", id: node.id }); }
  h.game.meet("rowan"); h.click('[data-vg-handover="rowan"]'); const coins = h.state.coins; h.click('[data-vg-handover="rowan"]'); assert.equal(h.state.coins, coins - 200); assert.equal(M.stallOpen(h.state), true);
  h.game.back(); h.game.pick({ type: "village-stall" }); const price = M.stallStock(h.state).find(x => x.key === "village:stool").price, before = h.state.coins; h.click('[data-vg-buy="village:stool"]'); assert.equal(h.state.coins, before - price); assert.equal(h.state.village.decor.owned.stool, 1);
  const restored = M.restoreState(h.saves.at(-1)); assert.equal(restored.village.decor.owned.stool, 1); assert.equal(M.stallOpen(restored), true); assert.equal(restored.coins, h.state.coins);
});

test("Elowen's pages advance the same saved quest across village and farm visits", t => {
  const h = harness(t); welcome(h); h.game.meet("elowen"); h.click('[data-vg-start="elowen-1"]'); h.complete(); h.game.back();
  for (const id of ["page-1", "page-2"]) h.game.pick({ type: "village-page", id });
  assert.equal(M.questStep(h.state, "elowen-1").item, "page-3"); h.game.close();
  assert.ok(M.findObject(h.state, "page-3"), "the farm pickup uses the same live state"); h.game.open(); h.game.meet("elowen"); assert.equal(h.conversation.id, "elowen"); h.complete();
  assert.equal(M.questStatus(h.state, "elowen-1"), "done"); assert.ok(h.state.village.unlocks.includes("almanac"));
  assert.equal(M.restoreState(h.saves.at(-1)).village.quests["elowen-1"].done, true);
});

test("three interiors return to the village, and leaving during a tour or inside starts a clean visit", t => {
  const h = harness(t); h.game.open(); assert.equal(h.game.status.touring, true); h.game.close(); assert.equal(h.state.village.toured, false); assert.equal(h.$("#vg-tour").hidden, true);
  h.game.open(); h.game.back();
  for (const id of ["elowen-library", "rowan-workshop", "velvet-bat"]) { h.game.enterHall(id); assert.equal(h.game.status.inside, id); assert.ok(h.game.status.position.x > 3900); h.game.leaveHall(); assert.equal(h.game.status.inside, null); assert.ok(h.game.status.position.x < 200); }
  h.game.enterHall("velvet-bat"); h.game.close(); assert.equal(h.view.inside, null); assert.equal(h.actors.at(-1).userData.disposed, true);
  h.game.open(); assert.equal(h.game.status.inside, null); assert.deepEqual(h.game.status.position, { x: ARRIVAL.spawn[0], z: ARRIVAL.spawn[1] });
  const sizes = [...h.listeners.values()].map(s => s.size); h.game.close(); h.game.open(); assert.deepEqual([...h.listeners.values()].map(s => s.size), sizes, "visits reuse listeners"); h.game.dispose(); assert.ok([...h.listeners.values()].every(s => s.size === 0)); assert.equal(h.$("#village-game"), null);
});

test("keyboard, touch and pad movement stop behind menus and while paused", t => {
  const h = harness(t); welcome(h); const start = h.game.status.position;
  h.key("keydown", "d"); h.game.tick(.2); assert.ok(h.game.status.position.x > start.x); h.key("keyup", "d");
  const zone = h.$("#vg-stick-zone"); zone.onpointerdown({ pointerId: 1, clientX: 20, clientY: 20 }); zone.onpointermove({ pointerId: 1, clientX: 60, clientY: 20 }); h.game.showPanel("map"); const stopped = h.game.status.position; h.game.tick(.2); assert.deepEqual(h.game.status.position, stopped); h.game.back(); h.game.tick(.2); assert.deepEqual(h.game.status.position, stopped, "menu clears the held thumbstick");
  h.pad.axes[0] = 1; h.press(2); assert.equal(h.game.status.panel, "map"); const menuAt = h.game.status.position; h.game.tick(.2); assert.deepEqual(h.game.status.position, menuAt, "pad movement cannot pass through a menu"); h.press(13); assert.notEqual(h.doc.activeElement.id, "vg-panel-close", "D-pad moves the focus among menu buttons"); h.pad.axes[0] = 0; h.press(0); assert.equal(h.game.status.panel, null, "confirm activates the focused map destination"); h.press(2); h.press(1); assert.equal(h.game.status.panel, null, "back closes a panel");
  h.state.paused = true; h.key("keydown", "d"); h.pad.axes[0] = 1; const pausedAt = h.game.status.position; h.game.tick(1); assert.deepEqual(h.game.status.position, pausedAt); h.pad.axes[0] = 0; h.state.paused = false; h.game.tick(.1); assert.deepEqual(h.game.status.position, pausedAt);
});


test("Map destinations hold their view until movement or camera centre resumes following", t => {
  const h = harness(t); welcome(h); h.game.tick(.1);
  const showMap = () => { h.game.showPanel("map"); h.click('[data-vg-focus="elowen-library"]'); };
  showMap(); assert.equal(h.game.status.surveying, true); assert.equal(h.game.status.panel, null);
  assert.deepEqual(h.cameraCalls.focus.at(-1), [47.6 * K, 18.6 * K, 26]);
  const held = { position: h.game.status.position, follows: h.cameraCalls.follow, resets: h.cameraCalls.reset };
  for (let i = 0; i < 5; i++) h.game.tick(.1);
  assert.equal(h.game.status.surveying, true); assert.deepEqual(h.game.status.position, held.position); assert.equal(h.cameraCalls.follow, held.follows, "idle frames leave the selected place in view"); assert.equal(h.cameraCalls.reset, held.resets);
  h.key("keydown", "d"); h.game.tick(.2); h.key("keyup", "d"); assert.equal(h.game.status.surveying, false); assert.ok(h.cameraCalls.reset > held.resets); assert.ok(h.cameraCalls.follow > held.follows); assert.ok(h.game.status.position.x > held.position.x);
  showMap(); const beforeCentre = h.cameraCalls.reset; h.click("#vg-look"); assert.equal(h.game.status.surveying, false); assert.equal(h.cameraCalls.reset, beforeCentre + 1); h.game.tick(.1); assert.ok(h.cameraCalls.follow > held.follows);
  showMap(); h.press(11); assert.equal(h.game.status.surveying, false, "R3 centres the playable owner");
  showMap(); h.game.enterHall("rowan-workshop"); assert.equal(h.game.status.surveying, false, "going inside restores the room's follow camera"); h.game.leaveHall();
  showMap(); h.game.close(); h.game.open(); assert.equal(h.game.status.surveying, false, "a new visit starts at the carriage");
});
