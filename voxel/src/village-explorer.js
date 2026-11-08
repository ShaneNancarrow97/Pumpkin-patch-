// Mothlight Village explorer (handover 73): the village on its own, before it joins
// the game. Fly round it, jump to each district, or walk it as Shane or Natalie at
// their true size. Built by `node build.mjs --village` into dist/mothlight-village.html.
// Touch: drag to turn, pinch to zoom, two fingers to pan; walking, the left of the
// screen is a stick. Keys: WASD or arrows to walk, Shift to jog, Q/E to turn.
// A pad: left stick walks, right stick looks, L1/R1 zoom, R2 jogs, ✕ goes in at a door.
// Walking up to the Velvet Bat's door offers to go in (✕, Enter, F or a tap); inside, walk out through the doorway.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import * as M from "./model.js";
import { createVillageView, TOUR, INSIDES, DOOR_NORMAL } from "./village-view.js";
import { loadSpriteSheets, spriteActor } from "./sprite-actors.js";
import { animateSprite } from "./sprite-voxels.js";
import { LEAN } from "./world.js";
import { PLAN_SCALE as K, VILLAGE_BOUNDS, RESIDENT_BY_ID } from "./content/village.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { createVillageShell } from "./ui/village-shell.js";
import { createVillageConversation } from "./ui/village-conversation.js";
import { villageSpritePortrait } from "./village-sprite-actors.js";

const canvas = document.querySelector("canvas"), $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const state = M.freshState(); state.earned = M.LEVELS[2].at; M.recordHomeActivity(state, "visit"); M.inviteToVillage(state);
let everyone = false;
let shell = null, dialogue = null, talking = null;
const blocked = () => !!shell?.blocked || !!dialogue?.active;
const view = createVillageView(canvas, state, { blocked, everyone: () => everyone, onPick: (hit) => { if (blocked()) return; if (hit.type === "village-folk") meet(hit.id); if (hit.type === "village-door") goIn(hit.id); } });
// The preview uses the same authored conversations as the saved village. Its
// temporary state stays in this page; travelling in the real game saves it.
function meet(id) {
  shell?.close(false);
  const person = HOST_BY_ID[id] ?? FOLK_BY_ID[id]; if (!person) return;
  const quest = M.talkStep(state, id), chat = !quest && M.canChat(state, id) ? M.nextChat(state, id) : null;
  talking = { id, quest: quest?.quest, chat: chat?.id };
  dialogue.open({ id, name: person.name, role: person.role, lines: quest?.lines?.length ? quest.lines : chat?.lines ?? [person.greet?.[0] ?? "Good evening."], choices: chat?.choices, friendship: M.friendshipWith(state,id) });
  view.folk.mood(id, "talk");
}
dialogue = createVillageConversation({ portrait: villageSpritePortrait,
  onChoice(index, info) { if (!talking?.chat) return info.choice.reply; return M.answerChat(state, talking.id, talking.chat, index)?.reply ?? false; },
  onContinue() { if (talking?.quest) M.finishTalk(state,talking.quest,talking.id); },
  onClose(id) { view.folk.mood(id,"wave"); talking=null; },
});
shell = createVillageShell({ onMeet: meet, portrait: villageSpritePortrait, available: id => everyone || (HOST_BY_ID[id] ?? FOLK_BY_ID[id])?.district === "green", onOverlayChange(open) { if (open) dialogue.close(false); } });
view.spritesReady.then(() => shell.refresh());
const composer = new EffectComposer(renderer), bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .45, .86);
composer.addPass(new RenderPass(view.scene, view.camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
function fit() {
  const w = innerWidth, h = innerHeight, ratio = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(ratio); renderer.setSize(w, h, false); composer.setPixelRatio(ratio); composer.setSize(w, h);
  bloom.resolution.set(w / 4, h / 4); view.resize(w, h);
}
addEventListener("resize", fit); view.enter(); fit();

// Places to jump to (design grid: camera at, looking at; x east, height, z north).
const PLACES = {
  green: null,
  tree: [[58, 7.5, 9], [58, 4.2, 24.6]],
  bat: [[100, 16, 46], [102, 5, 21]],
  copse: [[12, 24, 46], [-12, 3, 82]],
  quarry: [[56, 26, 40], [62, 8, 78]],
  moor: [[118, 24, 18], [144, 4, 52]],
  marsh: [[78, 26, 92], [84, 0, 122]],
  valley: [[64, 150, -66], [64, 0, 64]],
};
function go(id) {
  if (view.inside) leaveHall();
  if (walking) setWalk(false);
  const p = PLACES[id]; if (!p) view.cameraActions.reset(); else view.cameraActions.place(p[0].map((v) => v * K), p[1].map((v) => v * K));
  shell.setPlace(id);
}
for (const b of document.querySelectorAll("[data-place]")) b.addEventListener("click", () => go(b.dataset.place));
$("everyone").addEventListener("click", () => { everyone = !everyone; $("everyone").classList.toggle("on", everyone); view.sync(); });
// Restored: the homes as they'll be once their quests are done, Rowan's stall open and the bench mended.
const before = JSON.stringify({ built: state.village.built, unlocks: state.village.unlocks, effects: state.village.effects });
$("restored").addEventListener("click", () => {
  const on = !$("restored").classList.contains("on"); $("restored").classList.toggle("on", on); const v = state.village;
  if (on) { v.built = { ...v.built, "rowan-workshop": true, "elowen-conservatory": true }; v.unlocks = [...new Set([...v.unlocks, "stall", "gathering"])]; v.effects = [...new Set([...v.effects, "bench"])]; }
  else Object.assign(v, JSON.parse(before));
  view.sync();
});
// The grand tour: the flight Elowen gives on arrival, its titles rising at each stop. Tour again skips it.
let titleTimer = 0;
$("tour").addEventListener("click", () => {
  dialogue.close(false); shell.close(false);
  if (document.body.classList.contains("touring")) { view.director.skip(); return; }
  if (walking) setWalk(false);
  document.body.classList.add("touring"); $("tour").classList.add("on"); $("tour").textContent = "Skip";
  view.director.start((k) => {
    $("title-name").textContent = k.title; $("title-sub").textContent = k.sub; $("title").classList.add("shown");
    clearTimeout(titleTimer); titleTimer = setTimeout(() => $("title").classList.remove("shown"), 3400);
  }, () => { M.finishTour(state); document.body.classList.remove("touring"); $("tour").classList.remove("on"); $("tour").textContent = "Take the grand tour"; $("title").classList.remove("shown"); });
});

// ---- Walking: an owner at play-mode size, a stick, keys and a pad ------------------------
let sheets = null, actor = null, who = "shane", walking = false, age = 0, still = 0, facing = "front";
const pos = { x: 58 * K, z: 12 * K }, heading = { x: 0, z: 1 }, move = { x: 0, y: 0 }, keys = new Set();
const right = new THREE.Vector3(), forward = new THREE.Vector3();
loadSpriteSheets().then((s) => { sheets = s; $("walk").disabled = false; }).catch(() => { $("walk").textContent = "Walk (sprites failed)"; });
function makeActor() {
  if (actor) { view.scene.remove(actor); actor.userData.dispose?.(); }
  actor = spriteActor(sheets, who); view.scene.add(actor); place();
}
function place() { actor.position.set(pos.x, view.inside ? .2 : view.groundAt(pos.x, pos.z) + .04, -pos.z); }
function setWalk(on) {
  if (on && !sheets) return;
  walking = on; document.body.classList.toggle("walking", on); $("walk").classList.toggle("on", on);
  if (on) { if (!actor) makeActor(); actor.visible = true; place(); view.play.reset({ x: actor.position.x, y: actor.position.y, z: actor.position.z }); for (const b of document.querySelectorAll("[data-place]")) b.classList.remove("on"); }
  else { if (actor) actor.visible = false; $("act").hidden = true; const hall = view.inside; view.leave(); view.enter(); if (hall) { view.goInside(hall); $("leave").hidden = false; view.cameraActions.place(toPlace(view.hallPoint(0, 8.6, 9.6)), toPlace(view.hallPoint(0, -6.4, 1.4))); } }
}
$("walk").addEventListener("click", () => setWalk(!walking));
$("who").addEventListener("click", () => { who = who === "shane" ? "natalie" : "shane"; $("who").textContent = who === "shane" ? "Shane" : "Natalie"; if (sheets && walking) makeActor(); });
addEventListener("keydown", (e) => { if (blocked() || e.target?.closest?.("button,summary,input,select,textarea,[role=dialog]")) return; keys.add(e.key.toLowerCase()); if (e.key === " " && !e.repeat) { e.preventDefault(); setWalk(!walking); } if ((e.key === "Enter" || e.key.toLowerCase() === "f") && !e.repeat && offer) act(); });
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());

// The stick: wherever a thumb lands on the left of the screen while walking.
const stick = $("stick"), knob = $("knob"), pad = $("pad");
let stickId = null, sx = 0, sy = 0;
pad.addEventListener("pointerdown", (e) => { if(blocked())return; stickId = e.pointerId; sx = e.clientX; sy = e.clientY; pad.setPointerCapture(e.pointerId); stick.style.transform = `translate(${sx - 60}px, ${sy - 60}px)`; stick.classList.add("shown"); knob.style.transform = ""; e.preventDefault(); });
pad.addEventListener("pointermove", (e) => {
  if (e.pointerId !== stickId) return;
  let dx = e.clientX - sx, dy = e.clientY - sy; const d = Math.hypot(dx, dy), max = 46; if (d > max) { dx *= max / d; dy *= max / d; }
  move.x = dx / max; move.y = dy / max; knob.style.transform = `translate(${dx}px, ${dy}px)`;
});
const release = (e) => { if (e.pointerId !== stickId) return; stickId = null; move.x = move.y = 0; stick.classList.remove("shown"); };
pad.addEventListener("pointerup", release); pad.addEventListener("pointercancel", release);

// ---- Inside: through the Velvet Bat's door and out again, with a fade between ----------------------------
const fade = (then) => { $("fade").classList.add("on"); setTimeout(() => { then(); requestAnimationFrame(() => $("fade").classList.remove("on")); }, 320); };
const toPlace = (v) => [v.x, v.y, -v.z];
function goIn(id) {
  const plan = INSIDES[id]; if (!plan || view.inside === id) return;
  fade(() => {
    view.goInside(id); $("leave").hidden = walking; $("act").hidden = true;
    if (walking) { const p = view.hallPoint(plan.hall.spawn[0], plan.hall.spawn[1]); pos.x = p.x; pos.z = -p.z; heading.x = 0; heading.z = 1; place(); view.play.reset({ x: actor.position.x, y: actor.position.y, z: actor.position.z }); }
    else view.cameraActions.place(toPlace(view.hallPoint(0, 8.6, 9.6)), toPlace(view.hallPoint(0, -6.4, 1.4)));
  });
}
const DOOR_THETA = { north: Math.PI, south: 0, east: Math.PI / 2, west: -Math.PI / 2 };
function leaveHall() {
  const id = view.inside; if (!id) return; const d = INSIDES[id].door, [nx, nz] = DOOR_NORMAL[d.facing];
  view.goOutside(); $("leave").hidden = true;
  // Out on the doorstep, turned away from the door, with the camera looking back at the door just left.
  if (walking) { pos.x = (d.x + nx * 3.2) * K; pos.z = (d.z + nz * 3.2) * K; heading.x = nx; heading.z = -nz; place(); view.play.reset({ x: actor.position.x, y: actor.position.y, z: actor.position.z }, DOOR_THETA[d.facing]); }
  else view.cameraActions.place([(d.x + nx * 20) * K, 13 * K, (d.z + nz * 20) * K], [(d.x - nx * 2) * K, 4 * K, (d.z - nz * 2) * K]);
}
$("leave").addEventListener("click", () => fade(leaveHall));
$("act").addEventListener("click", () => act());
let offer = null;
function act() { if (offer) goIn(offer); }
// Where a walker may stand inside a hall: within its walls (out through the doorway only) and clear of its furniture.
function hallFree(plan, lx, lz) {
  const h = plan.hall, hw = h.w / 2, pad = .4;
  if (lx < -hw + pad + .2 || lx > hw - pad - .2 || lz < -h.d + pad + .2) return false;
  if (lz > -.25 && Math.abs(lx) > 1.05) return false;
  return !h.blocks.some(([x0, z0, x1, z1]) => lx > x0 - pad && lx < x1 + pad && lz > z0 - pad && lz < z1 + pad);
}
let padCross = false;
function readPad() {
  const g = [...(navigator.getGamepads?.() ?? [])].find(Boolean); if (!g) return null;
  const dead = (v) => Math.abs(v) < .15 ? 0 : v;
  const cross = !!g.buttons[0]?.pressed, pressed = cross && !padCross; padCross = cross;
  return { x: dead(g.axes[0] ?? 0), y: dead(g.axes[1] ?? 0), lx: dead(g.axes[2] ?? 0), ly: dead(g.axes[3] ?? 0), jog: !!g.buttons[7]?.pressed || !!g.buttons[10]?.pressed, act: pressed, zoomIn: !!g.buttons[5]?.pressed, zoomOut: !!g.buttons[4]?.pressed };
}
function walk(dt, time) {
  const gp = readPad(), k = (a, b) => (keys.has(a) || keys.has(b) ? 1 : 0);
  let ix = move.x + (k("d", "arrowright") - k("a", "arrowleft")) + (gp?.x ?? 0), iy = move.y + (k("s", "arrowdown") - k("w", "arrowup")) + (gp?.y ?? 0);
  const n = Math.hypot(ix, iy); if (n > 1) { ix /= n; iy /= n; }
  const cam = view.camera; right.set(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize(); cam.getWorldDirection(forward); forward.y = 0; forward.normalize();
  // Screen up is away from the camera; three's z runs south, the realm's north.
  const wx = right.x * ix - forward.x * iy, wz = right.z * ix - forward.z * iy, speed = 3.3 * (keys.has("shift") || gp?.jog ? 1.6 : 1) * (view.inside ? .8 : 1);
  const moving = Math.hypot(wx, wz) > .05;
  if (moving && view.inside) {
    const plan = INSIDES[view.inside], o = view.hallPoint(0, 0), nx = pos.x + wx * speed * dt, nz = pos.z - wz * speed * dt, local = (x, z) => [(x - o.x) / K, -z / K];
    const [ax, az] = local(nx, nz), [bx, bz] = local(nx, pos.z), [cx, cz] = local(pos.x, nz);
    if (az > 0 && Math.abs(ax) < 1.05) { fade(leaveHall); }
    else if (hallFree(plan, ax, az)) { pos.x = nx; pos.z = nz; } else if (hallFree(plan, bx, bz)) pos.x = nx; else if (hallFree(plan, cx, cz)) pos.z = nz;
    heading.x = wx; heading.z = wz; age += Math.hypot(wx, wz) * speed * dt / 2.3; still = 0;
  } else if (moving) {
    pos.x = THREE.MathUtils.clamp(pos.x + wx * speed * dt, VILLAGE_BOUNDS.x0 - 20, VILLAGE_BOUNDS.x1 + 20);
    pos.z = THREE.MathUtils.clamp(pos.z - wz * speed * dt, VILLAGE_BOUNDS.z0 - 20, VILLAGE_BOUNDS.z1 + 20);
    heading.x = wx; heading.z = wz; age += Math.hypot(wx, wz) * speed * dt / 2.3; still = 0;
  } else still += dt;
  place();
  // At a door that can be gone through, offer it.
  offer = null;
  if (!view.inside) for (const [id, p] of Object.entries(INSIDES)) { const [nx, nz] = DOOR_NORMAL[p.door.facing]; if (Math.hypot(pos.x - (p.door.x + nx * 1.4) * K, pos.z - (p.door.z + nz * 1.4) * K) < 2.8) offer = id; }
  $("act").hidden = !offer; if (offer) $("act").innerHTML = `<b>✕</b>Go into ${INSIDES[offer].name.replace(/^The /, "the ")}`;
  if (offer && (gp?.act || keys.has("enter") || keys.has("f"))) { keys.delete("enter"); keys.delete("f"); act(); }
  const lookX = (gp?.lx ?? 0) + (k("e", "e") - k("q", "q")), lookY = gp?.ly ?? 0;
  view.play.look(lookX, lookY, dt); if (gp?.zoomIn) view.play.zoom(-1); if (gp?.zoomOut) view.play.zoom(1);
  view.play.follow({ x: actor.position.x, y: actor.position.y, z: actor.position.z }, dt);
  // Which way they're seen from: across the screen (side), away (back) or towards (front).
  const hx = heading.x * right.x + heading.z * right.z, away = heading.x * forward.x + heading.z * forward.z;
  if (moving) facing = Math.abs(hx) > Math.abs(away) * .75 ? "side" : away > 0 ? "back" : "front";
  const shown = still > 1.2 ? "front" : facing;
  animateSprite(actor, moving ? age : time, moving, moving ? hx : 0, who === "shane" ? 1.7 : 0);
  actor.userData.playerAnimate?.({ who, outfit: who + "-base", facing: shown, walking: moving, time, age: moving ? age : time, dx: moving ? hx : 0, controlled: true });
}
// Sprites turn to the camera and lean back as in the garden, so they stand 2.3 tall on screen.
function faceCamera(f) {
  const c = view.camera, dx = c.position.x - f.position.x, dz = c.position.z - f.position.z; f.rotation.y = Math.atan2(dx, dz);
  const lean = f.children[0]; if (lean) { const pitch = Math.atan2(c.position.y - f.position.y - 1.2, Math.hypot(dx, dz)); lean.rotation.x = -LEAN; lean.scale.y = Math.min(1.6, 1 / Math.cos(Math.max(0, pitch - LEAN))); }
}

// ---- The frame loop, with a small frame-rate readout ---------------------------
let last = performance.now(), time = 0, frames = 0, fpsAt = last;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
  // The active hall owns the label, including direct preview/debug entry.
  shell.setRoom(INSIDES[view.inside]?.name);
  if (blocked()) { keys.clear(); move.x = move.y = 0; stick.classList.remove("shown"); }
  else if (walking && actor) walk(dt, time);
  view.tick(dt); if (walking && actor) faceCamera(actor);
  renderer.toneMappingExposure = view.scene.userData.exposure ?? 1; composer.render();
  frames++; if (now - fpsAt > 1000) { $("fps").textContent = `${Math.round(frames * 1000 / (now - fpsAt))} fps`; frames = 0; fpsAt = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => document.body.classList.add("ready"), 400);
// For checks in a browser: the view and the tour's stops.
window.explorer = { view, TOUR, shell, dialogue, meet, state:()=>state, place: (i) => view.cameraActions.place(TOUR[i].at, TOUR[i].look), walkTo(x, z) { pos.x = x; pos.z = z; if (actor) place(); },
  // What one frame draws: draw calls and triangles across every pass (shadows and bloom included).
  frameStats() { renderer.info.autoReset = false; renderer.info.reset(); view.tick(1 / 30); view.scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) o.shadow.needsUpdate = true; }); composer.render(); const i = renderer.info.render; renderer.info.autoReset = true; return { calls: i.calls, tris: i.triangles }; },
  // What each part of the village costs in the current view: the frame without it, subtracted.
  partStats() { const root = view.scene.children.find((c) => c.isGroup && c.scale.x > 1.2), all = this.frameStats(), out = { all };
    root.children.forEach((c, k) => { if (!c.visible) return; c.visible = false; const s = this.frameStats(); c.visible = true; out[k + ":" + (c.name || c.type) + ":" + c.children.length] = { calls: all.calls - s.calls, tris: all.tris - s.tris }; }); return out; } };
