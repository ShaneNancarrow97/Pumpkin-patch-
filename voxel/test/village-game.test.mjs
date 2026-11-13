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
import { spread } from "../src/rules/village-spread.js";
import { resolveVillageResidentInteraction, villageResidentLocation, withinResidentReach } from "../src/village-resident-interaction.js";
import { EXPANSION_AREAS } from "../src/content/village-expansion.js";

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
function harness(t, s = farm(), narration, extra = {}) {
  const doc = { createElement(tag) { return new Element(tag, doc); }, getElementById(id) { return doc.body.querySelector("#" + id); } }; doc.body = new Element("body", doc); doc.activeElement = doc.body;
  const listeners = new Map(), globals = new Map(), pad = { connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
  for (const [key, value] of Object.entries({ document: doc, navigator: { getGamepads: () => [pad] }, addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); } })) { globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); }
  const cameraCalls = { follow: 0, reset: 0, focus: [], dialogue: [] };
  const notices = [], saves = [], gatherSounds = [], receipts = [], chapterReceipts = [], messageReceipts = [], receiptTicks = [], owner = { enabled: true, who: "natalie" }, actors = [], picture = new THREE.Scene(), camera = new THREE.PerspectiveCamera(); camera.position.set(87, 8, 15); camera.lookAt(87, 1, -4.5);
  let inside = null, touring = false, finishTour = null, conversation = null, callback = null, menuCloses = 0, leaves = 0;
  const view = { scene: picture, camera, groundAt: () => 0, sync() {}, folk: { mood() {}, talkSpot: id => ({ x: id === "rowan" ? 87 : 89, z: 8 }) }, play: { reset() { cameraCalls.reset++; }, follow() { cameraCalls.follow++; }, look() {}, zoom() {} }, cameraActions: { focus(...args) { cameraCalls.focus.push(args); } }, get inside() { return inside; }, goInside(id) { inside = id; }, goOutside() { inside = null; }, hallPoint(x, z, y = 0) { return new THREE.Vector3(4000 + x * K, y * K, z * K); }, director: { get active() { return touring; }, start(title, done, options) { touring = true; finishTour = done; this.options = options; title({ title: "Mothlight", sub: "Welcome" }); }, skip() { if (!touring) return; touring = false; finishTour(); } } };
  view.folk.spotOf=id=>({x:id==="rowan"?87:89,z:9.8});
  Object.defineProperty(view,"expansionTargets",{configurable:true,get:()=>["rowan","elowen"].map(id=>({type:"village-folk",id,...view.folk.spotOf(id)}))});
  view.dialogueCamera={begin(player,neighbour){cameraCalls.dialogue.push({kind:"begin",player:{...player},neighbour:{...neighbour}});},end(options){cameraCalls.dialogue.push({kind:"end",options});}};
  const scene = { villageView: view, place: null, player: { state: () => ({ ...owner }), setEnabled(on, who = owner.who) { owner.enabled = on; owner.who = who; } }, enter(kind) { this.place = { kind }; }, leavePlace() { touring = false; this.place = null; }, villageCharacter() { const actor = new THREE.Group(), frame = new THREE.Group(); actor.add(new THREE.Group()); actor.userData = { idle: [frame], walk: [frame], shown: frame, show() {}, dispose() { actor.userData.disposed = true; } }; actor.userData.playerAnimate=pose=>{actor.userData.lastPose=pose;actor.userData.poseCount=(actor.userData.poseCount??0)+1;}; actors.push(actor); return actor; } };
  // Supply the scene's image/projection port so pad tests use the real map UI.
  // The capture helper and browser checks verify the rendered world itself.
  scene.captureVillageMap=()=>({url:"data:image/png;base64,headless-world-map",width:1200,height:900,projectPoint:({x,z})=>({x:(x+200)*1.8,y:(320-z)*1.8,visible:true})});
  let returnPrompt;
  const game = createVillageGame({ state: () => s, scene, narration, prefs: extra.prefs??{}, savePrefs: extra.savePrefs??(()=>{}), save: () => saves.push(M.saveData(s)), notice: n => notices.push(n), onGatherSound:e=>{gatherSounds.push(e);extra.onGatherSound?.(e);}, closeMenus: () => menuCloses++, onLeave: () => leaves++, portrait: extra.portrait??(() => null), itemArt: () => "", controlsView: headlessControls, decorateView: () => ({ active: false, close() {}, dispose() {}, tick() {}, pick() {}, back() {}, open() { return false; } }),
    returnPromptView(options){const element=doc.createElement("section");element.id="village-return-prompt";element.hidden=true;element.innerHTML='<button class="village-return-confirm" data-pad-default>Return</button><button class="village-return-cancel">Stay</button>';doc.body.append(element);let active=false;returnPrompt={open(){if(active)return false;active=true;element.hidden=false;element.querySelector("button").focus();return true;},close(){active=false;element.hidden=true;},confirm(){if(!active)return;this.close();options.onConfirm();},cancel(){if(!active)return;this.close();options.onCancel();},setInput(){},destroy(){this.close();element.remove();},get active(){return active;},element};element.querySelector(".village-return-confirm").onclick=()=>returnPrompt.confirm();element.querySelector(".village-return-cancel").onclick=()=>returnPrompt.cancel();return returnPrompt;},
    questReceiptView(){const seen=new Set(),add=(key,value,list)=>{if(!seen.has(key)){seen.add(key);list.push(value);}};return{notify(event){add(`quest:${event.quest}`,event,receipts);},notifyChapter(event){add(`chapter:${event.id}`,event,chapterReceipts);},notifyMessage(event){add(`message:${event.id}`,event,messageReceipts);},tick(options){receiptTicks.push(options);extra.onReceiptTick?.(options);},clear(){},destroy(){},get active(){return !!extra.receiptActive;}};},
    conversationView(options) { callback = options; return { open(options) { conversation = options; }, close() { if (conversation) { conversation = null; options.onClose(); } }, get active() { return !!conversation; }, dispose() { this.close(); } }; } });
  const h = { game, state: s, doc, scene, view, cameraCalls, owner, actors, saves, notices, gatherSounds, receipts, chapterReceipts, messageReceipts, receiptTicks, returnPrompt, listeners, pad, get conversation() { return conversation; }, get menuCloses() { return menuCloses; }, get leaves() { return leaves; }, complete() { callback.onContinue({ finished: true }); }, choose(index = 0, meta) { return callback.onChoice(index, meta); }, $(selector) { return doc.body.querySelector(selector); }, click(selector) { const el = doc.body.querySelector(selector); assert.ok(el, selector); assert.equal(el.disabled, false, selector + " enabled"); el.click(); }, key(type, key, target = doc.body) { for (const fn of listeners.get(type) ?? []) fn({ key, target, preventDefault() {}, stopImmediatePropagation() {}, repeat: false }); }, press(button) { pad.buttons[button].pressed = true; game.tick(.1); pad.buttons[button].pressed = false; game.tick(.1); } };
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

test("production feet targets and distinct clear approaches share Talk, People and camera anchors", t => {
  const h=harness(t);welcome(h);h.game.place(87,5);h.game.tick(.05);
  assert.equal(h.$("#vg-interact").hidden,false);assert.equal(h.$("#vg-interact").textContent,"Talk");
  h.game.showPanel("people");assert.equal(h.$('[data-vg-meet="rowan"]').dataset.padLabel,"Talk to Rowan");
  h.click('[data-vg-meet="rowan"]');assert.equal(h.conversation?.id,"rowan","the inclusive three-metre approach boundary activates the advertised Talk");
  const shot=h.cameraCalls.dialogue.at(-1);assert.deepEqual({x:shot.neighbour.x,z:shot.neighbour.z},h.view.folk.spotOf("rowan"));
  assert.ok(Math.hypot(shot.player.x-shot.neighbour.x,shot.player.z-shot.neighbour.z)>3,"camera keeps the actual feet beyond interaction reach");
  h.game.back();h.game.place(87,5-2e-6);h.game.tick(.05);h.game.showPanel("people");
  assert.equal(h.$('[data-vg-meet="rowan"]').dataset.padLabel,"Find Rowan");const before=JSON.stringify(M.saveData(h.state));h.click('[data-vg-meet="rowan"]');
  assert.equal(h.conversation,null);assert.equal(JSON.stringify(M.saveData(h.state)),before);assert.equal(h.game.status.waypoint.z,8);
  h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:12}:{x:500,z:500};h.game.render();assert.equal(h.game.status.waypoint.z,12,"Find follows the same live approach used to activate Talk");
});

test("resident feet alone never advertise a duplicate Talk target", t => {
  const h=harness(t);welcome(h);h.view.folk.spotOf=id=>id==="rowan"?{x:87,z:9.8}:{x:500,z:500};h.view.folk.talkSpot=id=>id==="rowan"?{x:87,z:15}:{x:500,z:500};
  h.game.place(87,9.8);h.game.tick(.05);assert.ok(h.$("#vg-interact").hidden||h.$("#vg-interact").textContent!=="Talk");
  h.game.showPanel("people");assert.equal(h.$('[data-vg-meet="rowan"]').dataset.padLabel,"Find Rowan");h.click('[data-vg-meet="rowan"]');assert.equal(h.conversation,null);assert.equal(h.game.status.waypoint.z,15);
});

test("resident descriptor uses inclusive boundaries and preserves hall and cave identity", () => {
  const s=farm();M.inviteToVillage(s);const plan={host:"rowan",name:"Rowan’s room",hall:{w:20,d:20,host:[0,-4],blocks:[]},door:{x:0,z:0,facing:"south"}};
  const view={inside:"rowan-room",folk:{},groundAt:()=>0,hallPoint:(x,z,y=0)=>({x:4000+x*K,z:z*K,y:y*K}),expansionTargets:[]};
  const resolve=position=>resolveVillageResidentInteraction({id:"rowan",state:s,view,position,insides:{"rowan-room":plan},doorNormal:{south:[0,-1]}});
  const host=resolve({x:4000,z:6});assert.equal(host.location,"Rowan’s room");assert.equal(host.realm,"hall:rowan-room");assert.deepEqual(host.point,{x:4000,z:6});
  for(const offset of [3.3-1e-7,3.3,3.3+5e-7])assert.equal(resolve({x:4000+offset,z:6}).nearby,true,`hall boundary ${offset}`);
  assert.equal(resolve({x:4000+3.3+2e-6,z:6}).nearby,false);assert.equal(withinResidentReach(3+5e-7,3),true);assert.equal(withinResidentReach(3+2e-6,3),false);
  view.inside="another-room";assert.equal(resolve({x:4000,z:6}).nearby,false,"matching coordinates in another hall cannot talk to this host");
  view.inside=null;view.activeExpansionArea="cave-shallows";view.expansionTargets=[{type:"village-folk",id:"rowan",x:87,z:9.8}];view.folk={spotOf:()=>({x:87,z:9.8}),talkSpot:()=>({x:87,z:8})};
  assert.equal(resolve({x:87,z:8}).nearby,false,"a surface approach cannot be activated from a cave at the same coordinates");
  view.activeExpansionArea=null;view.folk.people=new Map([["rowan",{root:{visible:false}}]]);assert.equal(resolve({x:87,z:8}).nearby,false,"an invisible resident cannot inherit a stale rendered target");
  view.folk.people.get("rowan").root.visible=true;view.folk.spotOf=()=>({x:-45,z:153});view.folk.talkSpot=()=>({x:-45,z:151.2});assert.equal(resolve({x:-45,z:151.2}).available,false,"a Green resident in a locked live district cannot transact");
});

test("hall People and prompt share the inclusive reach and stale gifts cannot cross halls", t => {
  const h=harness(t);welcome(h);h.state.stock[0]=3;h.game.enterHall("rowan-workshop");
  const feet=h.view.hallPoint(-.4,-5.1);h.game.place(feet.x,-feet.z-3.3);h.game.tick(.05);
  assert.equal(h.$("#vg-interact").hidden,false);assert.equal(h.$("#vg-interact").textContent,"Talk");h.game.showPanel("people");assert.equal(h.$('[data-vg-meet="rowan"]').dataset.padLabel,"Talk to Rowan");assert.match(h.$("#vg-panel-body").innerHTML,/Rowan&#39;s workshop/);
  h.click('[data-vg-meet="rowan"]');assert.equal(h.conversation?.id,"rowan");h.chooseIntent("gift");const gift=h.$('[data-vg-gift="pumpkin:orange"]'),before=JSON.stringify(M.saveData(h.state));
  h.view.goInside("elowen-library");gift.click();assert.equal(JSON.stringify(M.saveData(h.state)),before);assert.equal(h.state.stock[0],3);assert.equal(h.conversation,null,"a stale resident transaction cannot use matching hall-local coordinates");
});

test("People uses live spread districts and the Square, and labels unknown or locked homes honestly", t => {
  const h=harness(t);welcome(h);const locations={elowen:{x:87,z:87},rowan:{x:87,z:8},mabel:{x:-45,z:153},tansy:{x:-45,z:183},opal:{x:78,z:171},cinder:{x:99,z:165},corvus:{x:258,z:69},baron:{x:258,z:102},granny:{x:-138,z:181}};
  const original=h.view.folk.spotOf;h.view.folk.spotOf=id=>locations[id]??original(id);h.view.folk.talkSpot=id=>({...h.view.folk.spotOf(id),z:h.view.folk.spotOf(id).z-1.8});
  Object.defineProperty(h.view,"expansionTargets",{configurable:true,get:()=>Object.keys(locations).map(id=>({type:"village-folk",id,...h.view.folk.spotOf(id)}))});
  const row=id=>new RegExp('<button[^>]*data-vg-meet="'+id+'"[^>]*>[\\s\\S]*?</button>').exec(h.$("#vg-panel-body").innerHTML)?.[0]??"";
  h.game.showPanel("people");
  assert.match(row("elowen"),/Moonclock Square/);assert.match(row("mabel"),/Moonroot Copse/);assert.match(row("opal"),/Lantern Quarry/);assert.match(row("corvus"),/Carnival Moor/);assert.match(row("granny"),/The Crooked Acre/);
  assert.equal(h.$('[data-vg-meet="mabel"]').dataset.padLabel,"Find Mabel");assert.match(row("mabel"),/Opens at farm level 6/);
  h.game.back();h.game.place(locations.mabel.x,locations.mabel.z-1.8);const before=JSON.stringify(M.saveData(h.state));h.game.meet("mabel");assert.equal(h.conversation,null);assert.equal(JSON.stringify(M.saveData(h.state)),before,"rendered but locked residents cannot grant any transaction");
  Object.defineProperty(h.view,"expansionTargets",{configurable:true,value:[]});h.game.showPanel("people");assert.match(row("mabel"),/Known home · Mabel’s haberdashery · Moonroot Copse/);assert.doesNotMatch(row("mabel"),/\d+ m/);assert.equal(h.$('[data-vg-meet="rowan"]').dataset.padLabel,"Find Rowan");assert.match(row("rowan"),/Whereabouts unconfirmed/);
});

test("surface location gives nested districts precedence over Hollow Green", () => {
  for(const id of ["copse","quarry","moor","acre","marsh"]){const area=EXPANSION_AREAS.find(a=>a.id===id),point={x:(area.bounds[0]+area.bounds[2])/2,z:(area.bounds[1]+area.bounds[3])/2};assert.equal(villageResidentLocation(point).area,id,id);}
  assert.equal(villageResidentLocation({x:58*K,z:58*K}).area,"square");
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
  h.game.pick({type:"village-node",id:node.id});h.game.tick(1);assert.equal(h.game.status.gathering.progress,.5);h.state.paused=true;h.game.tick(20);assert.equal(h.game.status.gathering,null,"pause cancels a partial pull without a hidden job");assert.equal(M.blightClearCount(h.state,"green"),0);h.state.paused=false;h.game.tick(.05);h.game.pick({type:"village-node",id:node.id});h.game.tick(2);
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
  // The library's door, drawn at 47.6, 18.6, now stands back from the tree with the house.
  assert.deepEqual(h.cameraCalls.focus.at(-1), [spread(47.6, 18.6)[0] * K, 18.6 * K, 26]);
  const held = { position: h.game.status.position, follows: h.cameraCalls.follow, resets: h.cameraCalls.reset };
  for (let i = 0; i < 5; i++) h.game.tick(.1);
  assert.equal(h.game.status.surveying, true); assert.deepEqual(h.game.status.position, held.position); assert.equal(h.cameraCalls.follow, held.follows, "idle frames leave the selected place in view"); assert.equal(h.cameraCalls.reset, held.resets);
  h.key("keydown", "d"); h.game.tick(.2); h.key("keyup", "d"); assert.equal(h.game.status.surveying, false); assert.ok(h.cameraCalls.reset > held.resets); assert.ok(h.cameraCalls.follow > held.follows); assert.ok(h.game.status.position.x > held.position.x);
  showMap(); const beforeCentre = h.cameraCalls.reset; h.click("#vg-look"); assert.equal(h.game.status.surveying, false); assert.equal(h.cameraCalls.reset, beforeCentre + 1); h.game.tick(.1); assert.ok(h.cameraCalls.follow > held.follows);
  showMap(); h.press(11); assert.equal(h.game.status.surveying, false, "R3 centres the playable owner");
  showMap(); h.game.enterHall("rowan-workshop"); assert.equal(h.game.status.surveying, false, "going inside restores the room's follow camera"); h.game.leaveHall();
  showMap(); h.game.close(); h.game.open(); assert.equal(h.game.status.surveying, false, "a new visit starts at the carriage");
});

test("the world map captures on opening, freezes its pins and resolves resident clicks live", t => {
  const h=harness(t);let captures=0;const snapshot={url:"data:image/png;base64,world-map-fixture",width:1200,height:800,projectPoint:({x,z})=>({x:x+200,y:400-z,visible:true})};
  h.scene.captureVillageMap=()=>{captures++;return snapshot;};h.game.open();h.game.back();assert.equal(captures,0,"entering the village does not capture a map");
  h.game.showPanel("map");assert.equal(captures,1);assert.match(h.$("#vg-panel-body").innerHTML,/world-map-fixture/);h.click('[data-vg-map-neighbours]');assert.equal(captures,1,"showing neighbours only changes the overlay");
  const opened=h.$("#vg-panel-body").innerHTML;h.view.folk.spotOf=id=>id==="rowan"?{x:130,z:11}:{x:89,z:9.8};h.view.folk.talkSpot=id=>id==="rowan"?{x:130,z:9.2}:{x:89,z:8};h.game.tick(1);
  assert.equal(captures,1);assert.equal(h.$("#vg-panel-body").innerHTML,opened,"moving residents do not reparse the captured image during panel refresh");
  h.click('[data-vg-map-resident="rowan"]');assert.equal(h.conversation,null);assert.equal(h.game.status.waypoint.x,130,"a cached resident pin follows the current live approach");
  h.game.showPanel("map");assert.equal(captures,2);h.game.showPanel("map","copse");h.game.tick(1);assert.equal(captures,2,"area selection and panel ticks reuse the opening's capture");
  h.game.showPanel("people");h.game.back();assert.equal(h.game.status.panel,"map");assert.equal(captures,3,"returning to Map takes a fresh cached-scene snapshot");
});

test("a failed map capture leaves play and routes usable and retries on reopening", t => {
  const h=harness(t);h.game.open();h.game.back();let captures=0;h.scene.captureVillageMap=()=>{captures++;throw Error("capture fixture");};const before=JSON.stringify(M.saveData(h.state)),at=h.game.status.position;
  assert.doesNotThrow(()=>h.game.showPanel("map"));assert.equal(captures,1);assert.match(h.$("#vg-panel-body").innerHTML,/Map picture unavailable/);assert.equal(JSON.stringify(M.saveData(h.state)),before);assert.deepEqual(h.game.status.position,at);
  h.game.showPanel("map","green");assert.equal(captures,1);h.click('[data-vg-focus="arrival"]');assert.equal(h.game.status.panel,null,"walking destinations remain available when the picture fails");
  h.game.showPanel("map");assert.equal(captures,2);h.game.close();assert.equal(h.game.active,false);
});

test("a scene without a map capture hook keeps the map's destination controls available", t => {
  const h=harness(t);delete h.scene.captureVillageMap;h.game.open();h.game.back();assert.doesNotThrow(()=>h.game.showPanel("map"));assert.match(h.$("#vg-panel-body").innerHTML,/Preparing the village view/);h.click('[data-vg-focus="arrival"]');assert.equal(h.game.status.panel,null);
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
  h.game.pick({type:"village-node",id:node.id});h.state.paused=true;h.game.tick(10);assert.equal(h.game.status.gathering,null,"pause cancels rather than leaving stale work behind");assert.equal(h.state.village.materials.logs??0,before);h.state.paused=false;h.game.tick(.05);h.game.pick({type:"village-node",id:node.id});h.game.tick(1);const after=h.state.village.materials.logs;assert.ok(after>before);h.game.tick(1);assert.equal(h.state.village.materials.logs,after,"completed swing grants once");
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

test("carriage Cross opens confirmation, held Cross cannot leave, and fresh Cross returns once", t => {
  const h=harness(t);h.game.open();h.game.back();h.walkNear({x:ARRIVAL.back[0],z:ARRIVAL.back[1]+1.4});h.game.tick(.05);
  assert.match(h.$('#vg-interact').textContent,/Farm/);
  h.pad.buttons[0].pressed=true;assert.doesNotThrow(()=>h.game.tick(.1));
  assert.equal(h.game.active,true);assert.equal(h.game.status.returnPrompt,true);assert.equal(h.leaves,0);
  for(let n=0;n<4;n++)h.game.tick(.1);assert.equal(h.game.active,true,"the opener's held Cross cannot confirm");
  h.pad.buttons[0].pressed=false;h.game.tick(.1);h.press(0);
  assert.equal(h.game.active,false);assert.equal(h.scene.place,null);assert.equal(h.owner.enabled,true);assert.equal(h.leaves,1);
  assert.doesNotThrow(()=>h.game.tick(.1));assert.equal(h.game.open(),true);h.game.close();assert.equal(h.leaves,2,"programmatic close stays immediate");
});

test("root Back and header Farm confirm travel, with a second Circle keeping the village playable", t => {
  const h=harness(t);welcome(h);const at={...h.game.status.position};
  h.press(1);assert.equal(h.game.status.returnPrompt,true);assert.equal(h.leaves,0);
  h.press(1);assert.equal(h.game.status.returnPrompt,false);assert.equal(h.game.active,true);assert.deepEqual(h.game.status.position,at);
  h.pad.axes[0]=.8;h.game.tick(.1);assert.notDeepEqual(h.game.status.position,at,"a fresh push after a neutral cancel walks without an extra neutral poll");h.pad.axes[0]=0;h.game.tick(.05);
  h.click('#vg-home');assert.equal(h.game.status.returnPrompt,true);h.click('.village-return-cancel');assert.equal(h.game.active,true);
  h.click('#vg-home');h.click('.village-return-confirm');assert.equal(h.game.active,false);assert.equal(h.leaves,1);
});

test("canceling the walking exit requires leaving and re-entering before another automatic prompt", t => {
  const h=harness(t);h.game.open();h.game.back();h.walkNear({x:ARRIVAL.back[0],z:ARRIVAL.back[1]+2});
  h.pad.axes[1]=1;for(let n=0;n<40&&!h.game.status.returnPrompt;n++)h.game.tick(.1);
  assert.equal(h.game.status.returnPrompt,true);assert.equal(h.game.status.returnPathArmed,false);assert.equal(h.leaves,0);
  h.pad.axes[1]=0;h.press(1);assert.equal(h.game.status.returnPrompt,false);
  h.pad.axes[1]=1;for(let n=0;n<8;n++)h.game.tick(.1);assert.equal(h.game.status.returnPrompt,false,"remaining at the exit does not reopen it");
  h.pad.axes[1]=0;h.game.tick(.05);h.pad.axes[1]=-1;for(let n=0;n<40&&h.game.status.position.z<ARRIVAL.back[1]+2.5;n++)h.game.tick(.1);h.pad.axes[1]=0;h.game.tick(.05);assert.ok(h.game.status.position.z>ARRIVAL.back[1]+1.2,"the real owner can walk back from the carriage edge");assert.equal(h.game.status.returnPathArmed,true);
  h.pad.axes[1]=1;for(let n=0;n<40&&!h.game.status.returnPrompt;n++)h.game.tick(.1);h.pad.axes[1]=0;assert.equal(h.game.status.returnPrompt,true);h.press(0);
  assert.equal(h.game.active,false);assert.equal(h.leaves,1);for(let n=0;n<5;n++)assert.doesNotThrow(()=>h.game.tick(.1));
});

test("Options opens the six-action village hub and Cross chooses a real menu", t => {
  const h=harness(t);h.game.open();h.game.back();h.press(9);assert.equal(h.game.status.panel,"navigation");
  const cards=h.$('#vg-panel-body').querySelectorAll('button');assert.equal(cards.length,6);assert.ok(h.doc.activeElement===cards[0],"the first menu action receives focus");
  h.press(0);assert.equal(h.game.status.panel,"map");h.press(1);assert.equal(h.game.status.panel,"navigation","Circle returns to the menu that opened the map");h.press(1);assert.equal(h.game.status.panel,null);
});

test("closing a village menu from neutral does not swallow the next movement push", t => {
  const h=harness(t);welcome(h);h.game.showPanel("navigation");h.game.tick(.1);const at={...h.game.status.position};
  h.game.back();h.pad.axes[0]=.8;h.game.tick(.1);assert.notDeepEqual(h.game.status.position,at);
  h.pad.axes[0]=0;h.game.tick(.1);h.game.showPanel("materials");h.game.tick(.1);h.click('#vg-panel-close');const next={...h.game.status.position};h.pad.axes[0]=-.8;h.game.tick(.1);assert.notDeepEqual(h.game.status.position,next);
});

test("gather sounds follow accepted work contacts, success and cancellation once", t => {
  const h=harness(t);welcome(h);const node=NODES.find(n=>n.district==="green"&&n.material==="logs");
  h.game.pick({type:"village-node",id:node.id});assert.deepEqual(h.gatherSounds,[],"a remote request is not a tool contact");
  h.walkNear(node);h.game.pick({type:"village-node",id:node.id});const job=h.gatherSounds[0].job;
  assert.deepEqual(h.gatherSounds.map(e=>e.phase),["start"]);h.game.tick(.29);assert.equal(h.gatherSounds.length,1);
  h.game.tick(.02);h.game.tick(.5);h.game.tick(.2);
  assert.deepEqual(h.gatherSounds.map(e=>e.phase),["start","strike","strike","complete"]);
  assert.ok(h.gatherSounds.every(e=>e.id===node.id&&e.material==="logs"&&e.job===job));h.game.tick(3);assert.equal(h.gatherSounds.length,4);
  const stone=NODES.find(n=>n.district==="green"&&n.material==="stone");h.walkNear(stone);h.game.pick({type:"village-node",id:stone.id});h.game.tick(.4);h.game.back();h.game.tick(3);
  assert.deepEqual(h.gatherSounds.slice(4).map(e=>e.phase),["start","strike","cancel"]);assert.ok(h.gatherSounds[4].job>job);assert.equal(h.state.village.materials.stone??0,0);
});

test("pause and teardown cancel gather audio without stale success or reward", t => {
  const h=harness(t,undefined,undefined,{onGatherSound(){throw Error("audio unavailable");}});welcome(h);const node=NODES.find(n=>n.district==="green"&&n.kind==="blight");h.walkNear(node);h.game.pick({type:"village-node",id:node.id});h.game.tick(.4);h.state.paused=true;assert.doesNotThrow(()=>h.game.tick(.1));
  assert.equal(h.game.status.gathering,null);assert.deepEqual(h.gatherSounds.map(e=>e.phase),["start","strike","cancel"]);assert.equal(M.blightClearCount(h.state,"green"),0);
  h.state.paused=false;h.game.tick(.1);h.game.pick({type:"village-node",id:node.id});h.game.close();assert.equal(h.gatherSounds.at(-1).phase,"cancel");assert.equal(M.blightClearCount(h.state,"green"),0);
});

test("quest completion receipts receive actual awarded events and wait behind interactions", t => {
  const h=harness(t);welcome(h);const receipt=h.receipts.find(e=>e.quest==="invitation");assert.ok(receipt);assert.equal(receipt.type,"quest-done");assert.ok(Array.isArray(receipt.rewards));
  const saved=JSON.stringify(M.saveData(h.state));h.game.onEvent(receipt);h.game.onEvent(receipt);assert.equal(JSON.stringify(M.saveData(h.state)),saved,"opening a receipt never grants its reward again");assert.equal(h.receipts.filter(e=>e.quest==="invitation").length,1);
  h.meet("rowan");h.game.tick(.1);assert.equal(h.receiptTicks.at(-1).blocked,true);h.game.back();h.game.tick(.1);assert.equal(h.receiptTicks.at(-1).blocked,false);
});

test("farm unlocks and friendship feedback share the presenter without granting rewards", t => {
  const h=harness(t);welcome(h);const before=JSON.stringify(M.saveData(h.state));
  assert.equal(h.game.onEvent({type:"farm-milestone",id:"recipe:new-stew",title:"A new recipe for your kitchen"}),true);
  assert.deepEqual(h.messageReceipts.at(-1),{id:"recipe:new-stew",title:"A new recipe for your kitchen",important:true});
  h.game.onEvent({type:"friend-level",who:"mabel",level:2});assert.equal(h.messageReceipts.at(-1).important,undefined);assert.match(h.messageReceipts.at(-1).title,/Mabel/);
  assert.equal(JSON.stringify(M.saveData(h.state)),before,"notification routing only presents already-awarded changes");
});

test("a receipt becoming visible this frame keeps the farm reminder waiting", t => {
  const options={receiptActive:false,onReceiptTick(){options.receiptActive=true;}},h=harness(t,farm(),null,options);h.game.open();h.game.back();h.game.tick(600);
  const reminder=h.$("#village-game").children.find(el=>el.className==="vg-farm-reminder");assert.equal(reminder.hidden,true,"the receipt tick runs before deciding the reminder's visibility");
  options.onReceiptTick=null;options.receiptActive=false;h.game.tick(.1);assert.equal(reminder.hidden,false,"the deferred reminder resumes after the receipt");
});

function expansionFarm(){
 const s=farm();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;s.village.invited=true;s.village.toured=true;s.village.quests.invitation={step:3,done:true,base:null};s.village.quests['two-doorbells']={step:3,done:true,base:null};s.village.unlocks.push('gathering');return s;
}
function expansionScene(h,spawn=M.EXPANSION_VEINS[0]){
 let area=null;h.view.expansionGroundAt=()=>-12;h.view.moveExpansionWalker=(p,dx,dz)=>({x:p.x+dx,z:p.z+dz});
 Object.defineProperty(h.view,'activeExpansionArea',{configurable:true,get:()=>area});
 Object.defineProperty(h.view,'expansionTargets',{configurable:true,get:()=>area?[...M.EXPANSION_VEINS.filter(v=>v.area===area).map(v=>({...v,type:'expansion-activity'})),{type:'expansion-portal',id:'cave-exit',targetArea:'surface',area,x:spawn.x,z:spawn.z+1}]:[{type:'expansion-portal',id:'cave-shallows',targetArea:'cave-shallows',area:'green',x:ARRIVAL.spawn[0]+1,z:ARRIVAL.spawn[1]}]});
 h.view.enterExpansionArea=id=>{area=id;return{id,spawn:{x:spawn.x,z:spawn.z}};};h.view.leaveExpansionArea=()=>{const previous=area;area=null;return{previous,spawn:{x:-45,z:159}};};
}
test('a distant canvas cave hit only guides; a nearby portal enters and mining grants only after the tool swing',t=>{
 const h=harness(t,expansionFarm());expansionScene(h);h.game.open();
 Object.defineProperty(h.view,'expansionTargets',{configurable:true,value:[{type:'expansion-portal',id:'cave-shallows',targetArea:'cave-shallows',x:ARRIVAL.spawn[0]+30,z:ARRIVAL.spawn[1]}]});
 h.game.pick({type:'expansion-portal',id:'cave-shallows'});assert.equal(h.game.status.area,'green');assert.ok(h.game.status.waypoint);assert.equal(h.state.village.expansion.area,'green');
 expansionScene(h);h.game.pick({type:'expansion-portal',id:'cave-shallows'});assert.equal(h.game.status.area,'cave-shallows');assert.equal(h.actors.at(-1).position.y,-11.96);
 const vein=M.EXPANSION_VEINS[0],before=h.state.village.materials.stone??0;h.game.tick(.05);h.press(0);assert.ok(h.game.status.gathering);h.game.tick(.5);assert.equal(h.state.village.materials.stone??0,before);h.game.tick(.6);assert.equal(h.state.village.materials.stone,before+2);assert.ok(h.state.village.expansion.veins[vein.id].remaining>0);assert.equal(h.gatherSounds.filter(e=>e.phase==='complete').length,1);
 h.game.pick({type:'expansion-activity',id:vein.id});assert.equal(h.game.status.gathering,null);assert.equal(h.state.village.materials.stone,before+2);
});
test('Circle cancels cave mining and stale underground panel buttons cannot mine from the surface',t=>{
 const h=harness(t,expansionFarm());expansionScene(h);h.game.open();h.game.pick({type:'expansion-portal',id:'cave-shallows'});const vein=M.EXPANSION_VEINS[0],before=h.state.village.materials.stone??0;
 h.game.pick({type:'expansion-activity',id:vein.id});h.game.tick(.35);h.press(1);assert.equal(h.game.status.gathering,null);assert.equal(h.state.village.materials.stone??0,before);assert.equal(h.state.village.expansion.veins[vein.id],undefined);
 h.game.showPanel('expansion',vein.id);const stale=h.$('[data-vgx-act]');assert.ok(stale);h.game.back();h.game.back();assert.equal(h.game.status.area,'copse');stale.click();h.game.tick(2);assert.equal(h.state.village.materials.stone??0,before);assert.equal(h.game.status.gathering,null);assert.equal(h.game.status.returnPrompt,false);
});
test('Back from a deeper cave restores the preceding landing before asking to leave the village',t=>{
 const s=expansionFarm();s.village.expansion.chapters['quarry-bell']=true;const h=harness(t,s);expansionScene(h);h.game.open();assert.equal(h.game.enterExpansion('cave-workings'),true);h.game.back();assert.equal(h.game.status.area,'cave-shallows');assert.deepEqual(h.game.status.position,{x:15,z:-36});assert.equal(h.game.status.returnPrompt,false);h.game.back();assert.equal(h.game.status.area,'copse');assert.equal(h.game.status.returnPrompt,false);h.game.back();assert.equal(h.game.status.returnPrompt,true);
});
test('Cross gathers a visible ready resource in a later district using the same tool flow',t=>{
 const h=harness(t,expansionFarm());h.game.open();const node=NODES.find(n=>n.district==='copse'&&n.material==='hardwood'&&M.nodeReady(h.state,n.id));assert.ok(node);const target={...node,...villageNodePosition(h.state,node)};
 // This scene adapter supplies an unobstructed route. The actual district
 // navigation and collision grid are tested by the expansion world suite.
 h.view.moveExpansionWalker=(from,dx,dz)=>({x:from.x+dx,z:from.z+dz});const at=h.game.status.position,delta=new THREE.Vector3(target.x-at.x,0,-(target.z-at.z)),distance=delta.length(),camera=h.view.camera,right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),forward=camera.getWorldDirection(new THREE.Vector3());right.y=forward.y=0;right.normalize();forward.normalize();delta.normalize();h.pad.axes[0]=delta.dot(right);h.pad.axes[1]=-delta.dot(forward);h.game.tick(distance/3.3);h.pad.axes[0]=h.pad.axes[1]=0;h.game.tick(.05);assert.ok(Math.hypot(h.game.status.position.x-target.x,h.game.status.position.z-target.z)<.05);const before=h.state.village.materials.hardwood??0;h.press(0);assert.equal(h.game.status.gathering?.id,node.id);h.game.tick(1);assert.ok(h.state.village.materials.hardwood>before);assert.equal(h.game.status.gathering,null);
});

test('a saved expansion follow and a journal walking route show the actual chapter, area and giver',t=>{
 const s=expansionFarm();assert.equal(M.actVillageExpansion(s,'track',{chapter:'copse-threads'}).ok,true);const h=harness(t,s,null,{portrait:id=>`data:image/png;base64,${id}`});h.game.open();const q=M.expansionJournal(s).find(c=>c.id==='copse-threads');assert.equal(h.$('#vg-quest-title').textContent,q.title);assert.match(h.$('#vg-task').textContent,/Moonroot Copse.*Study Mabel/);assert.equal(h.$('#vg-quest-counts').textContent,'0/3');assert.match(h.$('#vg-quest-portrait').innerHTML,/base64,mabel/);assert.equal(h.game.status.trackedQuest,'copse-threads');
 const before={...h.game.status.position};h.game.showPanel('journal');h.click('[data-vgx-guide="green-research"]');assert.equal(s.village.expansion.tracked,'green-research');assert.equal(h.$('#vg-quest-title').textContent,'The Ink Beneath the Roots');assert.match(h.$('#vg-task').textContent,/Hollow Green.*moth-marked page/);assert.match(h.$('#vg-quest-portrait').innerHTML,/base64,elowen/);assert.deepEqual(h.game.status.position,before,'following a route does not teleport');assert.equal(M.expansionActivityInfo(s,'green-research:1').done,false,'following does not complete an activity');
});
test('a completed chapter leaves the tracker and keeps its archived named rewards',t=>{
 const s=expansionFarm();M.actVillageExpansion(s,'track',{chapter:'green-research'});for(const id of ['green-research:1','green-research:2','green-research:3'])assert.equal(M.actVillageExpansion(s,id,id.endsWith(':2')?{solve:true}:{}).ok,true);const prefs={villageTrackedQuest:'green-research'},h=harness(t,s,null,{prefs});h.game.open();assert.equal(s.village.expansion.tracked,null);assert.equal(prefs.villageTrackedQuest,null);assert.notEqual(h.game.status.trackedQuest,'green-research');assert.notEqual(h.$('#vg-quest-title').textContent,'The Ink Beneath the Roots');assert.equal(h.game.status.questExpanded,false);
 h.game.showPanel('journal');const html=h.$('#vg-panel-body').innerHTML;assert.match(html,/The first ward lantern burns/);assert.match(html,/Finish “Two Doorbells”|Reach farm level|A Door Worth Knocking On/);assert.doesNotMatch(html,/>mothlight pattern table</);h.game.back();const rewards=[{kind:'decor',id:'mothlight-pattern-table',label:'mothlight pattern table'},{kind:'costume',id:'natalie-mummy',label:'natalie mummy'},{kind:'recipe',id:'cinders-lantern-stew',label:'cinders lantern stew'}],before=JSON.stringify(M.saveData(s));h.game.onEvent({type:'expansion-chapter-complete',chapter:'test-presentation',title:'A name worth keeping',rewards});const receipt=JSON.stringify(h.chapterReceipts.at(-1));for(const [id,catalog]of [['mothlight-pattern-table',M.decorById],['natalie-mummy',M.costumeById],['cinders-lantern-stew',M.RECIPE_BY_ID]])assert.ok(receipt.includes(catalog[id].name),id);assert.equal(JSON.stringify(M.saveData(s)),before,'presenting a receipt does not settle a reward again');
});

test('live chapter completion clears the pin, expanded details and route and queues one receipt',t=>{
 const s=expansionFarm(),prefs={},h=harness(t,s,null,{prefs});h.game.open();h.game.showPanel('journal');h.click('[data-vgx-guide="green-research"]');h.click('#vg-quest-toggle');
 assert.equal(h.game.status.trackedQuest,'green-research');assert.equal(h.game.status.questExpanded,true);assert.equal(h.game.status.waypoint.chapter,'green-research');
 const events=[];for(const id of ['green-research:1','green-research:2','green-research:3']){const result=M.actVillageExpansion(s,id,id.endsWith(':2')?{solve:true}:{});assert.ok(result.ok);events.push(...result.events);}
 const after=JSON.stringify(M.saveData(s));for(const event of events)h.game.onEvent(event);h.game.tick(.1);
 assert.equal(prefs.villageTrackedQuest,null);assert.notEqual(h.game.status.trackedQuest,'green-research');assert.equal(h.game.status.questExpanded,false);assert.equal(h.game.status.waypoint,null);
 const receipt=h.chapterReceipts.at(-1);assert.equal(receipt.id,'green-research');assert.equal(receipt.title,'The Ink Beneath the Roots');assert.equal(h.$('#village-game').children.some(el=>el.className==='vgx-milestone'),false,'chapter receipts share the notification presenter');h.game.tick(9.1);assert.equal(h.chapterReceipts.length,1);assert.equal(JSON.stringify(M.saveData(s)),after,'clearing the marker never grants rewards again');
});

test('an imported completed pin is removed and an empty tracker cannot expand with the D-pad',t=>{
 const s=expansionFarm();s.village.expansion.chapters['green-research']=true;s.village.expansion.receipts['green-research']={claimed:true};s.village.expansion.tracked='green-research';
 for(const q of Object.values(QUEST_BY_ID))s.village.quests[q.id]={done:true,step:q.steps.length,base:null};
 const restored=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))),prefs={villageTrackedQuest:'green-research'},h=harness(t,restored,null,{prefs});h.game.open();
 assert.equal(prefs.villageTrackedQuest,null);assert.equal(h.game.status.trackedQuest,null);assert.equal(h.$('#vg-objective').hidden,true);h.press(12);assert.equal(h.game.status.questExpanded,false);
});
