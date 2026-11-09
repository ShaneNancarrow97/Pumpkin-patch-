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
import { QUEST_BY_ID } from "../src/content/village-quests.js";
import { villageNodePosition } from "../src/content/village-node-sites.js";
import { findResidentPath } from "../src/rules/village-resident-life.js";
import { villageCellFree } from "../src/rules/village-navigation.js";
import { createVillagePadState, normaliseVillageStick } from "../src/ui/village-controls.js";

// The game controller is exercised without a renderer or browser. Rules and
// room plans stay real; the small DOM adapter below supplies the input port.
// Real multi-pointer controls, menu geometry, CSS zoom and focus run separately
// in tools/village-controls-qa.mjs against Chromium.
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
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.dataset = {}; this.style = {}; this.hidden = false; this.disabled = false; this.attributes = {}; this.classes = new Set(); this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x) }; }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === "id") this.id = value; if (key === "class") this.classes = new Set(String(value).split(/\s+/)); if (key.startsWith("data-")) this.dataset[dataName(key)] = value; if (key === "hidden") this.hidden = true; if (key === "disabled") this.disabled = true; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
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
    const attr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector); if (attr?.[1] === "hidden") return this.hidden; if (attr?.[1] === "disabled") return this.disabled; if (attr) return Object.hasOwn(this.attributes, attr[1]) && (attr[2] === undefined || this.attributes[attr[1]] === attr[2]);
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) { if(selector.includes(","))return [...new Set(selector.split(",").flatMap(part=>this.querySelectorAll(part)))]; const bits = selector.trim().split(/\s+/), out = []; const walk = el => { for (const child of el.children) { if (child.matches(bits.at(-1))) { let ancestor = child.parentElement, i = bits.length - 2; while (i >= 0 && ancestor) { if (ancestor.matches(bits[i])) i--; ancestor = ancestor.parentElement; } if (i < 0) out.push(child); } walk(child); } }; walk(this); return out; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { for (let el = this; el; el = el.parentElement) if (selector.split(",").some(s => el.matches(s))) return el; return null; }
  focus() { this.doc.activeElement = this; }
  addEventListener(type, fn) { this["on" + type] = fn; }
  click() { if (!this.disabled) this.onclick?.({ target: this, stopPropagation() {} }); }
  getClientRects() { for (let el = this; el; el = el.parentElement) if (el.hidden) return []; return [{}]; }
  setPointerCapture() {}
}
function farm(level = 3) { const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[level - 1].at; M.awardLevels(s); return s; }
function headlessControls({ root, blocked, onRelease }) {
  const padState = createVillagePadState(), zone = root.querySelector("#vg-stick-zone");
  let touch = { x: 0, y: 0 }, owner = null, origin = null;
  zone.onpointerdown = e => { if (blocked()) return; owner = e.pointerId; origin = { x: e.clientX, y: e.clientY }; };
  zone.onpointermove = e => { if (e.pointerId === owner) touch = normaliseVillageStick((e.clientX - origin.x) / 42, (e.clientY - origin.y) / 42, .05); };
  const clear = () => { touch = { x: 0, y: 0 }; owner = null; };
  zone.onpointerup = zone.onpointercancel = e => { if (e.pointerId === owner) clear(); };
  const release = () => { clear(); padState.release(); onRelease(); };
  return {
    poll() { const input = padState.sample(navigator.getGamepads()); if (blocked()) clear(); return { ...input, source: input.active ? "pad" : "touch", move: blocked() ? { x: 0, y: 0 } : input.active ? input.move : touch, look: blocked() ? { x: 0, y: 0 } : input.look }; },
    handleMenu(surface, pad) {
      if (!surface || !pad) return false;
      const buttons = surface.querySelectorAll("button:not(:disabled)").filter(el => el.getClientRects().length);
      const index = buttons.indexOf(root.doc.activeElement), delta = pad.pressed(13) || pad.pressed(15) ? 1 : pad.pressed(12) || pad.pressed(14) ? -1 : 0;
      if (delta && buttons.length) buttons[(index + delta + buttons.length) % buttons.length].focus();
      if (pad.pressed(0)) (buttons[index] ?? buttons[0])?.click(); return true;
    },
    clear, release, reset() { release(); padState.reset(); padState.sample(navigator.getGamepads()); }, dispose() { release(); },
  };
}
function harness(t, s = farm(), narration) {
  const doc = { createElement(tag) { return new Element(tag, doc); }, getElementById(id) { return doc.body.querySelector("#" + id); } }; doc.body = new Element("body", doc); doc.activeElement = doc.body;
  const listeners = new Map(), globals = new Map(), pad = { connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
  for (const [key, value] of Object.entries({ document: doc, navigator: { getGamepads: () => [pad] }, addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); } })) { globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
  const cameraCalls = { follow: 0, reset: 0, focus: [], dialogue: [] };
  const notices = [], saves = [], owner = { enabled: true, who: "natalie" }, actors = [], picture = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); camera.position.set(87, 8, 15); camera.lookAt(87, 1, -4.5);
  let inside = null, touring = false, finishTour = null, conversation = null, callback = null, menuCloses = 0, leaves = 0;
  const view = { scene: picture, camera, groundAt: () => 0, sync() {}, folk: { mood() {}, talkSpot: id => ({ x: id === "rowan" ? 87 : 89, z: 8 }) }, play: { reset() { cameraCalls.reset++; }, follow() { cameraCalls.follow++; }, look() {}, zoom() {} }, cameraActions: { focus(...args) { cameraCalls.focus.push(args); } }, get inside() { return inside; }, goInside(id) { inside = id; }, goOutside() { inside = null; }, hallPoint(x, z, y = 0) { return new THREE.Vector3(4000 + x * K, y * K, z * K); }, director: { get active() { return touring; }, start(title, done, options) { touring = true; finishTour = done; this.options = options; title({ title: "Mothlight", sub: "Welcome" }); }, skip() { if (!touring) return; touring = false; finishTour(); } } };
  view.folk.spotOf=id=>({x:id==="rowan"?87:89,z:9.8});
  view.dialogueCamera={begin(player,neighbour){cameraCalls.dialogue.push({kind:"begin",player:{...player},neighbour:{...neighbour}});},end(options){cameraCalls.dialogue.push({kind:"end",options});}};
  const scene = { villageView: view, place: null, player: { state: () => ({ ...owner }), setEnabled(on, who = owner.who) { owner.enabled = on; owner.who = who; } }, enter(kind) { this.place = { kind }; }, leavePlace() { touring = false; this.place = null; }, villageCharacter() { const actor = new THREE.Group(), frame = new THREE.Group(); actor.add(new THREE.Group()); actor.userData = { idle: [frame], walk: [frame], shown: frame, show() {}, dispose() { actor.userData.disposed = true; } }; actor.userData.playerAnimate=pose=>{actor.userData.lastPose=pose;actor.userData.poseCount=(actor.userData.poseCount??0)+1;}; actors.push(actor); return actor; } };
  const game = createVillageGame({ state: () => s, scene, narration, save: () => saves.push(M.saveData(s)), notice: n => notices.push(n), closeMenus: () => menuCloses++, onLeave: () => leaves++, portrait: () => null, itemArt: () => "", controlsView: headlessControls, decorateView: () => ({ active: false, close() {}, dispose() {}, tick() {}, pick() {}, back() {}, open() { return false; } }), conversationView(options) { callback = options; return { open(options) { conversation = options; }, close() { if (conversation) { conversation = null; options.onClose(); } }, get active() { return !!conversation; }, dispose() { this.close(); } }; } });
  const h = { game, state: s, doc, scene, view, cameraCalls, owner, actors, saves, notices, listeners, pad, get conversation() { return conversation; }, get menuCloses() { return menuCloses; }, get leaves() { return leaves; }, complete() { callback.onContinue({ finished: true }); }, choose(index = 0, meta) { return callback.onChoice(index, meta); }, $(selector) { return doc.body.querySelector(selector); }, click(selector) { const el = doc.body.querySelector(selector); assert.ok(el, selector); assert.equal(el.disabled, false, selector + " enabled"); el.click(); }, key(type, key, target = doc.body) { for (const fn of listeners.get(type) ?? []) fn({ key, target, preventDefault() {}, stopImmediatePropagation() {}, repeat: false }); }, press(button) { pad.buttons[button].pressed = true; game.tick(.1); pad.buttons[button].pressed = false; game.tick(.1); } };
  h.choices = () => conversation?.choices ?? conversation?.lines?.find(line => Array.isArray(line?.choices))?.choices ?? [];
  h.chooseIntent = (intent, id) => {const choices=h.choices(),index=choices.findIndex(choice=>choice.intent===intent&&(id==null||choice.id===id));assert.ok(index>=0,`choice ${intent} ${id??""}`);assert.notEqual(choices[index].disabled,true,"choice enabled");return h.choose(index,{id:conversation.id,choice:choices[index]});};
  // Resource interactions must use the real controller path and finish their swing.
  h.walkNear = point => {
    if(point.id)point={...point,...villageNodePosition(s,point)};
    const from=game.status.position,candidates=[point,...Array.from({length:8},(_,i)=>({x:point.x+Math.cos(i*Math.PI/4)*1.5,z:point.z+Math.sin(i*Math.PI/4)*1.5}))];
    let path=[];for(const candidate of candidates){if(!villageCellFree(s,candidate.x,candidate.z))continue;path=findResidentPath(s,from,candidate);if(path.length)break;}
    // The resident pathfinder intentionally searches only a local eight-metre
    // margin. Long owner journeys use the broad arrival crossroads as a leg.
    if(!path.length){const hub={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},first=findResidentPath(s,from,hub);if(first.length)for(const candidate of candidates){const last=findResidentPath(s,hub,candidate);if(last.length){path=[...first,...last];break;}}}
    assert.ok(path.length,"resource has a walkable approach: "+point.id);
    pad.axes[0]=pad.axes[1]=0;game.tick(.05);
    for(const target of path){let reached=false;for(let n=0;n<4000;n++){
      const at=game.status.position,dx=target.x-at.x,dz=-(target.z-at.z),distance=Math.hypot(dx,dz);if(distance<.2){reached=true;break;}
      const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),forward=camera.getWorldDirection(new THREE.Vector3());right.y=forward.y=0;right.normalize();forward.normalize();
      const force=Math.min(.95,distance/.3);pad.axes[0]=(dx*right.x+dz*right.z)/distance*force;pad.axes[1]=-(dx*forward.x+dz*forward.z)/distance*force;game.tick(.05);
    }assert.ok(reached,"controller reaches resource waypoint");}
    pad.axes[0]=pad.axes[1]=0;game.tick(.05);assert.ok(Math.hypot(game.status.position.x-point.x,game.status.position.z-point.z)<3);
  };
  h.meet = id => {while(game.status.panel)game.back();if(game.status.inside)game.leaveHall();h.walkNear(view.folk.talkSpot(id));game.meet(id);};
  h.gather = node => {h.walkNear(node);const before=s.village.materials[node.material]??0;game.pick({type:"village-node",id:node.id});assert.equal(s.village.materials[node.material]??0,before,"no grant before swing finishes");assert.ok(game.status.gathering);game.tick(.4);assert.equal(s.village.materials[node.material]??0,before);game.tick(.6);assert.ok((s.village.materials[node.material]??0)>before);assert.equal(game.status.gathering,null);};
  t.after(() => { game.dispose(); for (const [key, desc] of globals) desc ? Object.defineProperty(globalThis, key, desc) : delete globalThis[key]; }); return h;
}
function welcome(h) { h.game.open(); h.game.back(); for (const who of ["rowan", "elowen"]) { h.meet(who); assert.ok(h.conversation); h.complete(); } }

test("saved travel gates at level 3 and completes the real invitation before level 4", t => {
  const h = harness(t, farm(2)); assert.equal(h.game.open(), false); assert.equal(h.state.village.invited, false); assert.equal(h.saves.length, 0);
  h.state.earned = M.LEVELS[3].at + h.state.progression.bonusEarned; M.awardLevels(h.state); assert.equal(M.patchLevel(h.state).level, 3);
  h.state.paused = true; assert.equal(h.game.open(), false); h.state.paused = false;
  assert.equal(h.game.open(), true); assert.equal(h.state.village.visits, 1); assert.equal(h.owner.enabled, false); assert.equal(h.game.open(), true); assert.equal(h.state.village.visits, 1);
  h.game.back(); assert.equal(h.state.village.toured, true); assert.equal(M.questStep(h.state, "invitation").who, "rowan");
  h.meet("rowan"); h.game.back(); assert.equal(M.questStep(h.state, "invitation").who, "rowan", "closing a chat grants no quest progress");
  for (const who of ["rowan", "elowen"]) { h.meet(who); assert.equal(h.conversation.id, who); h.complete(); }
  assert.equal(M.questStatus(h.state, "invitation"), "done"); assert.equal(M.canGather(h.state), true); assert.equal(M.patchLevel(h.state).level, 4); assert.ok(h.saves.at(-1).village.quests.invitation.done);
  h.game.close(); assert.equal(h.owner.enabled, true); assert.equal(h.owner.who, "natalie"); assert.equal(h.game.active, false); assert.equal(h.scene.place, null);
  const loaded = readSaveFile(JSON.stringify(buildSaveFile(h.state, { savedAt: "2026-11-06T12:00:00.000Z" }))); assert.equal(loaded.ok, true); assert.equal(loaded.edited, false); assert.equal(loaded.state.village.quests.invitation.done, true); assert.equal(M.patchLevel(loaded.state).level, 4);
});

test("nearby greetings open real chat and gift actions, and each chat answer saves once", t => {
  const h = harness(t); welcome(h); h.state.stock[0] = 3;
  h.walkNear(h.view.folk.talkSpot("rowan")); h.game.showPanel("people"); h.click('[data-vg-meet="rowan"]'); assert.equal(h.game.status.panel, null); assert.equal(h.conversation.intent,"greeting");
  const xp = h.state.village.friends.rowan.xp; h.chooseIntent("chat"); assert.equal(h.conversation.id, "rowan"); assert.equal(typeof h.choose(0), "string"); const after = h.state.village.friends.rowan.xp; assert.ok(after > xp); h.choose(0); assert.equal(h.state.village.friends.rowan.xp, after); h.complete();
  h.meet("rowan"); h.chooseIntent("gift"); assert.equal(h.$('[data-vg-details-key="gifts:rowan"]').open,true); h.click('[data-vg-gift="pumpkin:orange"]'); assert.equal(h.state.stock[0], 2); assert.equal(h.state.village.friends.rowan.gifts.length, 1); assert.ok(h.conversation.lines[0]); h.complete();
  assert.equal(h.$("#vg-coins").textContent, "£" + Math.round(h.state.coins).toLocaleString("en-GB"));
});

test("initial greeting choices expose only real offers and the actual chat cooldown", t => {
  const h=harness(t);welcome(h);h.state.stock[0]=3;h.state.village.friends.rowan.chatIn=125;h.meet("rowan");
  assert.equal(h.game.status.panel,null);assert.equal(h.conversation.intent,"greeting");
  const choices=h.choices(),chat=choices.findIndex(c=>c.intent==="chat"),before=JSON.stringify(M.saveData(h.state)),saves=h.saves.length;
  assert.equal(choices[chat].disabled,true);assert.equal(choices[chat].description,"Ready in 2m 5s");
  assert.deepEqual(choices.filter(c=>c.intent==="quest").map(c=>c.id),M.offeredBy(h.state,"rowan").map(q=>`quest:start:${q.id}`));
  assert.ok(choices.some(c=>c.intent==="gift"&&!c.disabled));assert.ok(choices.some(c=>c.intent==="about"));assert.ok(choices.some(c=>c.intent==="leave"));
  assert.equal(h.choose(chat,{id:"rowan",choice:choices[chat]}),false,"disabled choices cannot be activated through a stale input");
  assert.equal(JSON.stringify(M.saveData(h.state)),before);assert.equal(h.saves.length,saves);
  assert.deepEqual(h.chooseIntent("leave"),{handled:true});assert.equal(h.conversation,null);assert.equal(h.game.status.panel,null);
  assert.equal(JSON.stringify(M.saveData(h.state)),before,"greeting and leaving grant no relationship points");
});

test("replaced greeting choices cannot answer a fresh chat or transact in a reopened session", t => {
  const h=harness(t);welcome(h);h.meet("rowan");const first=h.conversation,firstChoices=h.choices(),chatIndex=firstChoices.findIndex(c=>c.intent==="chat");
  const oldChat={id:first.id,choice:firstChoices[chatIndex]};h.chooseIntent("chat");
  const xp=h.state.village.friends.rowan.xp;assert.equal(h.choose(chatIndex,oldChat),false);assert.equal(h.state.village.friends.rowan.xp,xp,"a detached greeting is not an answer to the new chat");
  h.game.back();h.meet("rowan");assert.equal(h.choose(chatIndex,oldChat),false,"closing and reopening creates a new choice session");
  h.chooseIntent("quest","quest:start:rowan-1");assert.equal(M.questStatus(h.state,"rowan-1"),"active");assert.equal(h.conversation.heading,QUEST_BY_ID["rowan-1"].title);
  assert.equal(h.choose(chatIndex,oldChat),false);h.complete();assert.equal(h.game.status.panel,"journal");
});

test("greeting actions and chat answers recheck the neighbour before any remote transaction", t => {
  const h=harness(t);welcome(h);h.state.stock[0]=3;const post=h.view.folk.talkSpot;
  const far=()=>{h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:30}:post(id);};
  const meet=()=>{h.view.folk.talkSpot=post;h.meet("rowan");};
  meet();h.chooseIntent("chat");const xp=h.state.village.friends.rowan.xp;far();assert.deepEqual(h.choose(0),{handled:true});
  assert.equal(h.state.village.friends.rowan.xp,xp);assert.equal(h.state.village.friends.rowan.chatIn,0);assert.equal(h.conversation,null);
  meet();far();const beforeQuest=JSON.stringify(M.saveData(h.state));h.chooseIntent("quest","quest:start:rowan-1");
  assert.equal(JSON.stringify(M.saveData(h.state)),beforeQuest);assert.equal(h.conversation,null);assert.equal(h.game.status.waypoint.folkId,"rowan");
  meet();far();h.chooseIntent("gift");assert.equal(h.state.stock[0],3);assert.equal(h.game.status.panel,null,"remote gifts cannot open a transaction panel");
  h.view.folk.talkSpot=post;M.startQuest(h.state,"rowan-1");h.state.village.materials.logs=4;h.state.village.materials.stone=2;M.advanceQuests(h.state);
  meet();far();const beforeDelivery=JSON.stringify(M.saveData(h.state));h.chooseIntent("quest","quest:deliver:rowan-1");
  assert.equal(JSON.stringify(M.saveData(h.state)),beforeDelivery,"remote handovers consume nothing and grant no rewards");assert.equal(h.conversation,null);
});

test("a ready greeting handover saves once and its old button cannot start the next story", t => {
  const h=harness(t);welcome(h);M.startQuest(h.state,"rowan-1");h.state.village.materials.logs=4;h.state.village.materials.stone=2;M.advanceQuests(h.state);h.meet("rowan");
  const choices=h.choices(),index=choices.findIndex(c=>c.id==="quest:deliver:rowan-1"),stale={id:"rowan",choice:choices[index]};
  h.chooseIntent("quest","quest:deliver:rowan-1");assert.equal(M.questStatus(h.state,"rowan-1"),"done");assert.equal(h.state.village.materials.stone,0);
  const after=JSON.stringify(M.saveData(h.state)),saves=h.saves.length;assert.equal(h.choose(index,stale),false);
  assert.equal(JSON.stringify(M.saveData(h.state)),after);assert.equal(h.saves.length,saves);assert.equal(M.questStatus(h.state,"rowan-stall"),"offered");assert.equal(h.conversation.intent,"greeting");
});

test("nearby conversation framing restores on close and is cancelled immediately when leaving", t => {
  const h=harness(t);welcome(h);const post=h.view.folk.talkSpot;
  h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:30}:post(id);const before=h.cameraCalls.dialogue.length;h.game.meet("rowan");assert.equal(h.cameraCalls.dialogue.length,before,"a distant neighbour cannot claim the dialogue camera");
  h.view.folk.talkSpot=post;h.meet("rowan");const begun=h.cameraCalls.dialogue.at(-1);assert.equal(begun.kind,"begin");assert.deepEqual({x:begun.player.x,z:begun.player.z},h.game.status.position);assert.equal(begun.player.y,h.actors.at(-1).position.y);assert.equal(begun.neighbour.folkId,"rowan");
  assert.deepEqual({x:begun.neighbour.x,z:begun.neighbour.z},h.view.folk.spotOf("rowan"));assert.notEqual(begun.neighbour.z,post("rowan").z,"camera subject is the resident's feet, not the player's approach point");assert.ok(Math.hypot(begun.player.x-begun.neighbour.x,begun.player.z-begun.neighbour.z)>1.5,"the two camera subjects remain distinct");
  h.chooseIntent("chat");assert.deepEqual(h.cameraCalls.dialogue.slice(-2).map(call=>call.kind),["end","begin"],"replacement releases then reframes using the same camera boundary");
  h.game.back();assert.equal(h.cameraCalls.dialogue.at(-1).kind,"end");h.meet("rowan");h.game.close();assert.deepEqual(h.cameraCalls.dialogue.at(-1),{kind:"end",options:{immediate:true}});
});

test("the owner billboard and idle pose keep facing a moving dialogue camera and its return", t => {
  const h=harness(t);welcome(h);h.meet("rowan");const actor=h.actors.at(-1),at={...h.game.status.position},phase=actor.userData.lastPose.phase;
  const turnCamera=(x,z)=>{h.view.camera.position.set(actor.position.x+x,actor.position.y+4,actor.position.z+z);h.view.camera.lookAt(actor.position);};
  turnCamera(5,-6);const initialCount=actor.userData.poseCount;h.pad.axes[0]=.8;h.game.tick(.1);
  assert.equal(actor.rotation.y,Math.atan2(5,-6));assert.ok(actor.userData.poseCount>initialCount);assert.equal(actor.userData.lastPose.walking,false);assert.equal(actor.userData.lastPose.facing,"front");assert.equal(actor.userData.lastPose.keepFacingOnIdle,false);assert.equal(actor.userData.lastPose.phase,phase);assert.deepEqual(h.game.status.position,at);
  h.game.back();h.view.dialogueCamera.active=true;turnCamera(-7,3);h.game.tick(.1);
  assert.equal(actor.rotation.y,Math.atan2(-7,3));assert.equal(actor.userData.lastPose.walking,false);assert.equal(actor.userData.lastPose.phase,phase);assert.deepEqual(h.game.status.position,at,"camera return updates art without walking the owner");
});

test("a fresh stick hold introduced during the camera return needs neutral before walking resumes", t => {
  const h=harness(t);welcome(h);h.meet("rowan");h.view.dialogueCamera.active=true;h.game.tick(.1);h.game.back();
  h.pad.axes[0]=0;h.game.tick(.1);h.pad.axes[0]=.8;h.game.tick(.1);const at={...h.game.status.position};
  h.view.dialogueCamera.active=false;h.game.tick(.1);assert.deepEqual(h.game.status.position,at,"a hold introduced after the dialogue must not leak out of its returning camera");
  h.pad.axes[0]=0;h.game.tick(.1);h.pad.axes[0]=.8;h.game.tick(.1);assert.notDeepEqual(h.game.status.position,at,"a fresh push after neutral resumes normal walking");
});

test("Blackroot uses a two-second hand pull, can be cancelled, and clears even when samples are full", t => {
  const h=harness(t);welcome(h);h.meet("elowen");h.chooseIntent("quest","quest:start:blight-first-signs");
  const answer=h.choices()[0];assert.ok(answer.reply);const saved=JSON.stringify(M.saveData(h.state));assert.equal(h.choose(0,{id:"elowen",choice:answer}),undefined,"scripted story choices keep their own written reply");assert.equal(JSON.stringify(M.saveData(h.state)),saved);h.complete();h.game.back();
  h.game.showPanel("journal");h.click('[data-vg-gather="cursed-spores"]');assert.match(h.game.status.waypoint.label,/Cursed fungus/);
  const node=NODES.find(n=>n.id===h.game.status.waypoint.nodeId);assert.equal(node.kind,"blight");assert.ok(M.nodeReady(h.state,node.id));h.walkNear(node);h.game.tick(.05);assert.equal(h.$("#vg-interact").textContent,"Root out");
  h.game.pick({type:"village-node",id:node.id});assert.equal(h.game.status.gathering.tool,"hands");h.game.tick(.7);assert.equal(M.blightClearCount(h.state,"green"),0);h.game.back();h.game.tick(3);assert.equal(M.blightClearCount(h.state,"green"),0,"cancelled pulling never clears a patch");
  h.game.pick({type:"village-node",id:node.id});h.game.tick(1);assert.equal(h.game.status.gathering.progress,.5);h.state.paused=true;h.game.tick(20);assert.equal(h.game.status.gathering.progress,.5);h.state.paused=false;h.game.tick(1);
  assert.equal(M.blightClearCount(h.state,"green"),1);assert.equal(h.state.village.materials["cursed-spores"],1);assert.equal(M.stepProgress(h.state,"blight-first-signs").have,1);h.game.tick(3);assert.equal(M.blightClearCount(h.state,"green"),1,"a finished pull cannot award again");
  const next=NODES.filter(n=>n.kind==="blight"&&n.district==="green"&&M.nodeReady(h.state,n.id)).sort((a,b)=>{const at=h.game.status.position;return Math.hypot(a.x-at.x,a.z-at.z)-Math.hypot(b.x-at.x,b.z-at.z);})[0];h.state.village.materials["cursed-spores"]=M.villageMaterialCapacity(h.state);h.walkNear(next);h.game.pick({type:"village-node",id:next.id});assert.ok(h.game.status.gathering,"full samples do not prevent clearing");h.game.tick(2);
  assert.equal(M.blightClearCount(h.state,"green"),2);assert.equal(h.state.village.materials["cursed-spores"],M.villageMaterialCapacity(h.state));assert.match(h.notices.at(-1),/sample satchel full/);assert.equal(M.stepProgress(h.state,"blight-first-signs").have,2);
});

test("Rowan's UI callbacks consume gathered materials, charge the opening cost and save a stall purchase", t => {
  const h = harness(t); welcome(h); h.state.coins = 1000;
  h.meet("rowan"); h.chooseIntent("quest","quest:start:rowan-1"); h.complete(); assert.equal(h.game.status.panel, "journal"); h.game.back();
  for (const material of ["logs", "logs", "stone"]) { const node = NODES.find(n => n.district === "green" && n.material === material && M.nodeReady(h.state, n.id)); assert.ok(node, material); h.gather(node); }
  h.meet("rowan"); h.chooseIntent("quest","quest:deliver:rowan-1"); assert.equal(M.questStatus(h.state, "rowan-1"), "done"); assert.equal(h.state.village.materials.stone, 0);
  h.chooseIntent("quest","quest:start:rowan-stall"); h.complete(); h.game.back();
  for (const material of ["stone", "fibre", "fibre", "fibre"]) { const node = NODES.find(n => n.district === "green" && n.material === material && M.nodeReady(h.state, n.id)); assert.ok(node, material); h.gather(node); }
  h.meet("rowan"); h.chooseIntent("quest","quest:deliver:rowan-stall"); const coins = h.state.coins; h.chooseIntent("quest","quest:deliver:rowan-stall"); assert.equal(h.state.coins, coins - 200); assert.equal(M.stallOpen(h.state), true);
  h.game.back(); h.game.pick({ type: "village-stall" }); const price = M.stallStock(h.state).find(x => x.key === "village:stool").price, before = h.state.coins; h.click('[data-vg-buy="village:stool"]'); assert.equal(h.state.coins, before - price); assert.equal(h.state.village.decor.owned.stool, 1);
  const restored = M.restoreState(h.saves.at(-1)); assert.equal(restored.village.decor.owned.stool, 1); assert.equal(M.stallOpen(restored), true); assert.equal(restored.coins, h.state.coins);
});

test("Elowen's pages advance the same saved quest across village and farm visits", t => {
  const h = harness(t); welcome(h); h.meet("elowen"); h.chooseIntent("quest","quest:start:elowen-1"); h.complete(); h.game.back();
  for (const id of ["page-1", "page-2"]) h.game.pick({ type: "village-page", id });
  assert.equal(M.questStep(h.state, "elowen-1").item, "page-3"); h.game.close();
  assert.ok(M.findObject(h.state, "page-3"), "the farm pickup uses the same live state"); h.game.open(); h.meet("elowen"); assert.equal(h.conversation.id, "elowen"); h.complete();
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
  h.pad.axes[0] = 1; h.press(2); assert.equal(h.game.status.panel, "map"); const menuAt = h.game.status.position; h.game.tick(.2); assert.deepEqual(h.game.status.position, menuAt, "pad movement cannot pass through a menu"); h.press(13); assert.notEqual(h.doc.activeElement.id, "vg-panel-close", "D-pad moves the focus among menu buttons"); h.pad.axes[0] = 0; h.press(0); assert.equal(h.game.status.panel, "map", "confirm opens the selected region criteria without travelling"); assert.ok(["green","copse","quarry","moor","marsh"].includes(h.game.status.panelId),"confirm opens criteria for the focused region"); h.click('[data-vg-focus="arrival"]'); assert.equal(h.game.status.panel, null, "a real landmark shortcut closes the map"); h.press(2); h.press(1); assert.equal(h.game.status.panel, null, "back closes a panel");
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

test("tour narration can replay and mute without completing the tour; leaving cancels it", t => {
  const listeners = new Set(), voice = { enabled: true, playing: false, current: null,
    emit() { for (const fn of listeners) fn(); }, subscribe(fn) { listeners.add(fn); fn(); return () => listeners.delete(fn); },
    play(speaker, text) { this.current = { speaker, text, status: this.enabled ? "playing" : "idle" }; this.playing = this.enabled; this.emit(); },
    replay() { this.play(this.current.speaker, this.current.text); },
    stop() { this.playing = false; if (this.current) this.current.status = "idle"; this.emit(); },
    setEnabled(on) { this.enabled = on; if (!on) this.stop(); this.emit(); },
  };
  const h = harness(t, farm(), voice); h.game.open();
  assert.deepEqual(voice.current, { speaker: "narrator", text: "Mothlight. Welcome", status: "playing" }); assert.equal(h.view.director.options.hold(), true);
  const before = JSON.stringify(M.saveData(h.state)), saves = h.saves.length;
  h.press(12); assert.equal(h.doc.activeElement.attributes["data-voice-replay"], "", "D-pad reaches replay during the tour"); h.press(0); assert.equal(h.state.village.toured, false);
  const tour = h.$("#vg-tour"); tour.querySelector("[data-voice-replay]").click(); tour.querySelector("[data-voice-toggle]").click();
  assert.equal(voice.enabled, false); assert.equal(h.view.director.options.hold(), false); assert.equal(JSON.stringify(M.saveData(h.state)), before); assert.equal(h.saves.length, saves);
  tour.querySelector("[data-voice-toggle]").click(); assert.equal(voice.playing, true);
  h.game.close(); assert.equal(voice.playing, false); assert.equal(h.state.village.toured, false);
  h.game.open(); h.game.back(); assert.equal(voice.playing, false); assert.equal(h.state.village.toured, true);
});


test("resource tools require a nearby owner, finish once, and cancel safely", t => {
  const h=harness(t);welcome(h);const node=NODES.find(n=>n.district==="green"&&n.material==="logs");
  const before=h.state.village.materials.logs??0;
  h.game.pick({type:"village-node",id:node.id});assert.equal(h.game.status.gathering,null);assert.equal(h.state.village.materials.logs??0,before);assert.ok(h.game.status.waypoint,"distant resource becomes a walking destination");
  h.walkNear(node);h.game.pick({type:"village-node",id:node.id});assert.equal(h.game.status.gathering.tool,"axe");const at=h.game.status.position;
  h.key("keydown","d");h.game.tick(.25);h.key("keyup","d");assert.deepEqual(h.game.status.position,at,"a tool swing does not slide the character");
  h.game.back();assert.equal(h.game.status.gathering,null);h.game.tick(1);assert.equal(h.state.village.materials.logs??0,before,"cancelled tool swing grants nothing");assert.ok(M.nodeReady(h.state,node.id));
  h.game.pick({type:"village-node",id:node.id});h.state.paused=true;h.game.tick(10);assert.equal(h.game.status.gathering.progress,0,"paused time cannot finish a swing");h.state.paused=false;h.game.tick(1);const after=h.state.village.materials.logs;assert.ok(after>before);h.game.tick(1);assert.equal(h.state.village.materials.logs,after,"completed swing grants once");
  const stone=NODES.find(n=>n.district==="green"&&n.material==="stone");h.walkNear(stone);h.game.pick({type:"village-node",id:stone.id});assert.equal(h.game.status.gathering.tool,"pickaxe");h.game.close();assert.equal(h.game.status.gathering,null);assert.equal(h.state.village.materials.stone??0,0,"leaving cancels mining without an award");
});


test("followed quest stays pinned and its details toggle without opening a menu", t => {
  const h=harness(t);welcome(h);h.meet("rowan");h.chooseIntent("quest","quest:start:rowan-1");h.complete();h.game.back();h.game.render();
  assert.equal(h.$("#vg-objective").hidden,false);assert.equal(h.$("#vg-quest-title").textContent,QUEST_BY_ID["rowan-1"].title);assert.equal(h.game.status.questExpanded,false);
  h.click("#vg-quest-toggle");assert.equal(h.game.status.questExpanded,true);assert.equal(h.game.status.panel,null,"expanding keeps the owner in the world");assert.equal(h.$("#vg-quest-details").hidden,false);
  h.pad.buttons[12].pressed=true;h.game.tick(.1);assert.equal(h.game.status.questExpanded,false);h.game.tick(.1);h.game.tick(.1);assert.equal(h.game.status.questExpanded,false,"a held D-pad Up toggles once");h.pad.buttons[12].pressed=false;h.game.tick(.1);
  h.press(12);assert.equal(h.game.status.questExpanded,true);
  const next=material=>NODES.find(n=>n.district==="green"&&n.material===material&&M.nodeReady(h.state,n.id));
  h.gather(next("logs"));assert.equal(h.$("#vg-quest-counts").textContent,"2/4");assert.match(h.$("#vg-quest-details").innerHTML,/2 \/ 4/);h.gather(next("logs"));assert.match(h.$("#vg-task").textContent,/stone/);h.gather(next("stone"));assert.equal(h.$("#vg-quest-counts").textContent,"2/2 ready");assert.match(h.$("#vg-quest-details").innerHTML,/4 \/ 4/);assert.match(h.$("#vg-task").textContent,/Rowan/);
  h.game.showPanel("map");h.press(12);assert.equal(h.game.status.questExpanded,true,"D-pad Up navigates an open menu instead of toggling the HUD");h.game.back();h.meet("elowen");h.chooseIntent("chat");h.press(12);assert.equal(h.game.status.questExpanded,true,"dialogue keeps priority");h.game.back();
  h.key("keydown","t");assert.equal(h.game.status.questExpanded,false);h.key("keyup","t");assert.equal(h.game.status.panel,null);h.game.close();h.game.open();assert.equal(h.$("#vg-objective").hidden,false,"every later visit pins the current story");
});

test("respawned resources use their saved new position for guidance and collection", t => {
  const h=harness(t);welcome(h);const node=NODES.find(n=>n.district==="green"&&n.material==="logs"),before={...villageNodePosition(h.state,node)};h.gather(node);
  assert.equal(h.state.village.gatherCycles[node.id],1);const after=villageNodePosition(h.state,node);assert.notDeepEqual(after,before,"the next visible resource uses another site");
  h.state.village.nodes[node.id]=.05;const events=M.update(h.state,.1,{villageAway:true});assert.ok(events.some(e=>e.type==="village-resource-ready"&&e.id===node.id));let synced=0;h.view.sync=()=>synced++;
  const notices=h.notices.length;for(const e of events.filter(e=>e.type==="village-resource-ready"))h.game.onEvent(e);assert.equal(synced,1);assert.equal(h.notices.length,notices,"resource return does not create a toast");
  h.game.pick({type:"village-node",id:node.id});assert.equal(h.game.status.waypoint.x,after.x);assert.equal(h.game.status.waypoint.z,after.z);if(h.game.status.gathering)h.game.back();h.gather(node);assert.equal(h.state.village.gatherCycles[node.id],2,"the next gather follows the current location and awards once");
});

test("distant neighbours become live walking destinations, and Cross talks only nearby", t => {
  const h=harness(t);h.game.open();h.game.back();const at=h.game.status.position,saved=h.saves.length;
  h.game.showPanel("people");h.click('[data-vg-meet="rowan"]');
  assert.equal(h.conversation,null);assert.equal(h.game.status.panel,null);assert.deepEqual(h.game.status.position,at,"choosing a neighbour does not teleport the owner");
  assert.equal(h.game.status.waypoint.folkId,"rowan");assert.equal(h.saves.length,saved,"distant selection earns no relationship or quest progress");
  const original=h.view.folk.talkSpot;h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:12}:original(id);h.game.render();
  assert.equal(h.game.status.waypoint.z,12,"the direction marker follows a roaming neighbour");h.walkNear(h.view.folk.talkSpot("rowan"));h.game.tick(.1);h.press(0);
  assert.equal(h.conversation?.id,"rowan","Cross starts the real nearby conversation");h.complete();assert.equal(M.questStep(h.state,"invitation").who,"elowen");
});

test("journal handovers and stale resident buttons cannot transact across the village", t => {
  const h=harness(t);welcome(h);M.startQuest(h.state,"rowan-1");h.state.village.materials.logs=4;h.state.village.materials.stone=2;M.advanceQuests(h.state);
  h.walkNear({x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]});h.game.showPanel("journal");const before=JSON.stringify(M.saveData(h.state));h.click('[data-vg-handover="rowan"]');
  assert.equal(JSON.stringify(M.saveData(h.state)),before,"remote journal delivery consumes no materials and grants no reward");assert.equal(h.game.status.panel,null);assert.equal(h.game.status.waypoint.folkId,"rowan");
  h.meet("rowan");h.chooseIntent("quest","quest:deliver:rowan-1");assert.equal(M.questStatus(h.state,"rowan-1"),"done");h.game.back();
  h.state.stock[0]=3;h.meet("rowan");h.chooseIntent("about");const gift=h.$('[data-vg-gift="pumpkin:orange"]'),chat=h.$('[data-vg-chat="rowan"]');
  const post=h.view.folk.talkSpot;h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:30}:post(id);const stock=h.state.stock[0],xp=h.state.village.friends.rowan.xp;
  gift.click();chat.click();assert.equal(h.state.stock[0],stock);assert.equal(h.state.village.friends.rowan.xp,xp);assert.equal(h.conversation,null,"a stale chat button cannot bypass the distance check");
});

test("Vesper can only greet the owner beside the tavern counter", t => {
  const h=harness(t);h.game.open();h.game.back();h.game.meet("vesper");assert.equal(h.conversation,null);assert.match(h.game.status.waypoint.label,/Velvet Bat/);
  h.game.enterHall("velvet-bat");h.game.meet("vesper");assert.equal(h.conversation,null,"entering a room alone is not close enough to its host");
  h.game.tick(.1);h.pad.axes[1]=-1;for(let i=0;i<45;i++)h.game.tick(.1);h.pad.axes[1]=0;h.game.tick(.1);h.press(0);
  assert.equal(h.conversation?.id,"vesper");assert.equal(h.game.status.inside,"velvet-bat");
});

test("Cross at the village return path finishes the frame safely and allows repeated visits", t => {
  const h=harness(t);h.game.open();h.game.back();h.walkNear({x:ARRIVAL.back[0],z:ARRIVAL.back[1]+1.4});h.game.tick(.05);
  assert.match(h.$('#vg-interact').textContent,/Farm/);
  assert.doesNotThrow(()=>h.press(0),'returning during a controller frame cannot touch the removed actor');
  assert.equal(h.game.active,false);assert.equal(h.scene.place,null);assert.equal(h.owner.enabled,true);assert.equal(h.leaves,1);
  assert.doesNotThrow(()=>h.game.tick(.1));assert.equal(h.game.open(),true);assert.equal(h.game.active,true);h.game.close();assert.equal(h.leaves,2);
});


test("walking through the carriage threshold returns once without waiting for another button", t => {
  const h=harness(t);h.game.open();h.game.back();h.walkNear({x:ARRIVAL.back[0],z:ARRIVAL.back[1]+2});
  h.pad.axes[1]=1;for(let i=0;i<40&&h.game.active;i++)h.game.tick(.1);h.pad.axes[1]=0;
  assert.equal(h.game.active,false);assert.equal(h.leaves,1);assert.equal(h.scene.place,null);assert.equal(h.owner.enabled,true);
  for(let i=0;i<5;i++)assert.doesNotThrow(()=>h.game.tick(.1));assert.equal(h.leaves,1);
});

test("Options opens the six-action village hub and Cross chooses a real menu", t => {
  const h=harness(t);h.game.open();h.game.back();h.press(9);assert.equal(h.game.status.panel,"navigation");
  const cards=h.$('#vg-panel-body').querySelectorAll('button');assert.equal(cards.length,6);assert.ok(h.doc.activeElement===cards[0],"the first menu action receives focus");
  h.press(0);assert.equal(h.game.status.panel,"map");h.press(1);assert.equal(h.game.status.panel,"navigation","Circle returns to the menu that opened the map");h.press(1);assert.equal(h.game.status.panel,null);
});
