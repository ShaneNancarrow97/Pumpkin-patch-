import * as THREE from "three";
import * as M from "./model.js";
import { createScene } from "./scene.js";
import { pumpkinTemplate } from "./pumpkins.js";
import { createLevelCelebration } from "./ui/level-celebration.js";
import { createAudio } from "./ui/audio.js";
import { farmSheets } from "./ui/farm-sheets.js";
import { homeSheets } from "./ui/home-sheets.js";
import { collectionSheets } from "./ui/collection-sheets.js";
import { customerCareSheet } from "./ui/customer-care-sheet.js";
import { createGuestCard } from "./ui/guest-card.js";
import { createNpcRewards } from "./ui/npc-rewards.js";
import { festivalMeadowSheet } from "./ui/festival-meadow-sheet.js";
import { settingsSheet } from "./ui/settings-sheet.js";
import { money, $ } from "./ui/kit.js";
import { PLOTS } from "./world.js";

const SAVE_KEY = "pumpkin-patch-voxel-reference-v1";

// Saves are separate from the main game's, so trying this never touches real
// progress. Older voxel saves are brought up to date by restoreState().
function load() {
  try { return M.restoreState(JSON.parse(localStorage.getItem(SAVE_KEY) || "null")); } catch { return M.freshState(); }
}
let state = load();
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(M.saveData(state))); } catch {} };
setInterval(save, 5000);
document.addEventListener("visibilitychange", () => document.hidden && save());

const prefs = (() => {
  const base = { glow: true, shadows: true, voxelCharacters: false, music: true, musicVolume: 0.32, musicTrack: "lantern", musicShuffle: true, sound: false };
  try { return { ...base, ...JSON.parse(localStorage.getItem(SAVE_KEY + "-prefs") || "{}") }; } catch { return base; }
})();
const savePrefs = () => { try { localStorage.setItem(SAVE_KEY + "-prefs", JSON.stringify(prefs)); } catch {} };
const audio = createAudio(prefs);

// Shane and Natalie's own words from the main game.
const PEOPLE = { natalie: ["Natalie", "Co-owner & pumpkin whisperer"], shane: ["Shane", "Co-owner & chief pumpkin lifter"] };
const BANTER = {
  natalie: ["Our very own pumpkin patch. Just us, a few seeds, and a suspicious amount of ambition.", "It’s called an autumn outfit, Shane. Now help me plant something.", "We cannot keep every pumpkin. We’re running a shop, not an orange adoption centre.", "The shop smells like autumn and good decisions. Mostly autumn.", "That was almost as sweet as our pumpkins. Almost.", "Imagine fairy lights all the way down the path. And a hot chocolate stand…", "Look at what we made together. I think we’re getting the hang of this.", "She checks every pumpkin. Mostly by sitting beside it and looking important."],
  shane: ["I brought the spade. You brought the vision. And about twelve layers, apparently.", "Do we name the pumpkins? Because this one is definitely a Kevin.", "Hear me out: a loyalty card. Buy nine pumpkins, receive a slightly larger pumpkin.", "Nothing beats a full harvest. Except you. You’re pretty great.", "A little dirt on your boots, a little money in the till. That’s a good day.", "One empire at a time, Nat. First pumpkins. Then world domination.", "Skyla rang the bell. That either means a sale or she wants her dinner."],
};
const VISITOR_LINES = ["Lovely glow!", "Perfect for tonight.", "Freshly picked!", "Spooky choice!", "Taking this home!"];
let banterIndex = { natalie: 0, shane: 0 };

// Left alone for ten minutes, Shane and Natalie put the kettle on: the farm takes
// a tea break until you're back, so a window left open overnight doesn't play
// the whole game without you. Any tap, click or key counts as being here.
const IDLE_TEA = 600;
let idle = 0, idleTea = false;
for (const type of ["pointerdown", "keydown", "wheel"]) addEventListener(type, () => {
  idle = 0;
  if (idleTea) { idleTea = false; state.paused = false; notice("Welcome back! Tea's finished, back to the patch."); }
}, { capture: true, passive: true });

const scene = createScene($("world"), state, {
  onTick(dt) {
    idle += dt;
    if (idle > IDLE_TEA && !state.paused) { idleTea = true; state.paused = true; notice("You've been away a while, so Shane and Natalie have put the kettle on. Tap to carry on."); }
    if (!state.paused) for (const e of M.update(state, dt)) handle(e);
    render();
  },
  canRotatePiece: () => !!home.tools.selected && M.footprint(state.house.placed.find((p) => p.instance === home.tools.selected)?.id ?? "f01").layer !== "wall",
  onRotatePiece: (degrees) => home.tools.rotate(degrees, false),
  onRotateEnd: () => { home.tools.render(); save(); },
  onPick(what) {
    if (what.type === "visitor" || what.type === "customer") guestCard.open(what.id, what.type === "customer");
    else if (what.type === "plot") tapPlot(what.index);
    else if (what.type === "pumpkin") boost();
    else if (what.type === "seeds") { sheets.shop.setTab("seeds"); openSheet("shop"); }
    else if (what.type === "shop") { if (state.shop.unlocked) enterShop(); sheets.shop.setTab("shop"); openSheet("shop"); }
    else if (what.type === "meadow-land" || what.type === "cocoa-stand") { sheets.festival.setTab(what.type === "cocoa-stand" ? "cocoa" : "estate"); openSheet("festival"); }
    else if (what.type === "home") openHome();
    else if (what.type === "talk") talk(what.who);
    else if (what.type === "piece") home.tools.select(what.instance);
    else if (what.type === "go") goTo(what.to);
    else if (what.type === "floor" || what.type === "wall") { if (home.tools.selected) home.tools.tapCell(scene.cellAt(what.point, what.type, what.wall)); }
  },
});

// What the rules report, turned into sights and sounds.
function handle(e) {
  if (e.type === "sale") {
    scene.sale(e.amount, e.route);
    audio.tone(700);
    if (e.route === "stall") scene.say(VISITOR_LINES[e.visitor % VISITOR_LINES.length]);
  }
  if (e.type === "missed" && e.reason !== "shop") scene.say(e.reason === "budget" ? "A smaller pumpkin next time." : "Back after harvest!");
  if (e.type === "harvest") { scene.harvested(e.plot, e.count); scene.sendTo(e.plot); }
  if (e.type === "plant") scene.sendTo(e.plot);
  if (e.type === "memory") {
    const m = M.MEMORIES.find((x) => x.id === e.id);
    notice("New scrapbook memory: " + m.title);
    audio.tone(880);
    if (e.id === "first") say("shane", "Five pumpkins in! Told you this spade was a solid investment.");
    if (e.id === "moon") say("natalie", "Our first Moonlight plot! Its next pumpkins will glow pale and pretty, and sell for £24 each.");
    if (e.id === "empire") say("shane", "A thousand coins. From a handful of seeds. Look at what we made together.");
  }
}

function pickPlot(i) {
  const n = M.harvest(state, i);
  if (!n) return 0;
  scene.sendTo(i); scene.harvested(i, n);
  audio.tone(650);
  if (state.harvested === n) say("natalie", "Our first pumpkin! Quick, put it in the shop before Shane gives it a name.");
  const streak = M.rewardHarvestStreak(state);
  if (streak.count >= 2) floatStreak(streak, PLOTS[i]);
  if (streak.bonus) audio.tone(880);
  return n;
}
// What the streak does for visitors, in plain words: the bonus that actually
// reaches the path, or that the path is as busy as it gets.
function streakBoostText() {
  const boost = Math.round(M.pathBoost(state) * 100), held = M.visitorBonus(state) - M.pathBoost(state) > 0.005;
  return held ? "path at its busiest" : boost ? `visitors +${boost}%` : "";
}
// One float per burst (Harvest all picks every plot at once): the last pick's words, with any coins from the burst.
let streakBurst = null;
function floatStreak(streak, at) {
  if (!streakBurst) {
    streakBurst = { coins: 0 };
    queueMicrotask(() => { const b = streakBurst; streakBurst = null; scene.float(b.text + (b.coins ? ` · +${money(b.coins)}` : ""), b.at, b.coins ? "coin" : "streak"); });
  }
  Object.assign(streakBurst, { text: [`Streak ×${streak.count}`, streakBoostText()].filter(Boolean).join(" · "), at, coins: streakBurst.coins + streak.bonus });
}
function tapPlot(i) {
  if (state.paused) return notice("Tea break. Turn it off in Settings to get back to work.");
  if (i >= M.openPlots(state)) return notice("Buy Room for more in Shop › Farm to clear this plot.");
  const p = state.plots[i];
  if (p.phase === "empty" && M.plant(state, i)) { scene.sendTo(i); audio.tone(340); }
  else if (p.phase === "ready") pickPlot(i);
  else if (p.phase === "growing") { boost(); notice(`${M.VARIETIES[p.variety].name} · ${Math.round(p.progress * 100)}% grown`); }
}
function boost() {
  if (state.paused) return;
  const { reward } = M.tap(state);
  scene.tapPumpkin();
  audio.tone(520);
  if (reward) notice("The big pumpkin shook a pumpkin loose. +1 in stock.");
}
function plantAll() { if (state.paused) return; let n = 0; for (let i = 0; i < M.openPlots(state); i++) if (M.plant(state, i)) { scene.sendTo(i); n++; } if (n) { audio.tone(340); notice(`${n} seeds planted. Give them a little love!`); } }
function harvestAll() { if (state.paused) return; let n = 0; for (let i = 0; i < M.openPlots(state); i++) n += pickPlot(i); if (n) notice(`${n} pumpkins picked for the shop.`); }

// Speech: tapping Shane or Natalie, and lines for big moments.
let bubbleTimer, sayTimer;
function talk(who) {
  const lines = BANTER[who], line = lines[banterIndex[who]++ % lines.length], at = scene.actorPosition(who), b = $("bubble");
  b.innerHTML = "<b>" + PEOPLE[who][0] + "</b>" + line;
  b.style.left = at.x + "px"; b.style.top = at.y + "px"; b.hidden = false;
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => (b.hidden = true), 4200);
}
function say(who, text) {
  const d = $("dialogue"), url = scene.portrait(state.wardrobe.equipped[who]);
  d.querySelector(".dialogue-portrait").innerHTML = url ? `<img src="${url}" alt="">` : "";
  d.querySelector(".dialogue-name").innerHTML = `${PEOPLE[who][0]} <span>${PEOPLE[who][1]}</span>`;
  d.querySelector(".dialogue-text").textContent = "“" + text + "”";
  d.hidden = false;
  clearTimeout(sayTimer); sayTimer = setTimeout(() => (d.hidden = true), 6500);
}
$("dialogue").onclick = () => ($("dialogue").hidden = true);

let noticeTimer;
function notice(text) {
  $("notice").textContent = text; $("notice").classList.add("show");
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $("notice").classList.remove("show"), 2800);
}

// Stepping inside the cottage or the shop, and back out.
function enterRoom(id) { guestCard.clear(); home.tools.select(null); state.house.activeRoom = id; scene.enter("room", id); renderPlace(); }
// Up or down the stairs, or through a doorway, to the next room.
function goTo(id) {
  const name = M.houseRooms.find((r) => r.id === id)?.name.toLowerCase() ?? id, layout = M.roomLayout(state, scene.place?.id);
  const way = layout?.stairs.find((st) => st.up === id) ? "Up to" : layout?.stairs.find((st) => st.down === id) ? "Down to" : "Through to";
  home.tools.select(null); enterRoom(id); notice(`${way} the ${name}.`); audio.tone(440);
  if (openTab === "home") draw();
}
function enterShop() { guestCard.clear(); home.tools.select(null); scene.enter("shop"); renderPlace(); }
function leavePlace() { guestCard.clear(); home.tools.select(null); scene.leavePlace(); renderPlace(); }
function openHome() { if (scene.place?.kind !== "room") { enterRoom(state.house.activeRoom); closeSheet(); } else { sheets.home.setTab("rooms"); openSheet("home"); } }
function renderPlace() {
  const p = scene.place, inside = !!p;
  document.body.classList.toggle("inside-place", inside);
  $("place-bar").hidden = !inside; $("actions").hidden = inside; $("goal").hidden = inside;
  if (inside) $("place-title").textContent = p.kind === "shop" ? "The Honest Pumpkin" : "The " + M.houseRooms.find((r) => r.id === p.id).name;
  $("place-rooms").disabled = p?.kind === "shop";
  $("place-rooms").setAttribute("aria-label", p?.kind === "shop" ? "The Honest Pumpkin" : "Choose a room");
  $("place-decorate").hidden = p?.kind !== "room";
  home.tools.render();
  markTab();
}
$("place-back").onclick = () => { leavePlace(); closeSheet(); };
$("place-rooms").onclick = () => { sheets.home.setTab("rooms"); openSheet("home"); };
$("place-decorate").onclick = () => { sheets.home.setTab("decorate"); openSheet("home"); };

$("plant-all").onclick = plantAll;
$("harvest-all").onclick = harvestAll;
$("boost").onclick = boost;

// The HUD, actions, goal and streak, every frame (cheap: only text changes).
const text = (id, value) => { const el = $(id); if (el.textContent !== String(value)) el.textContent = value; };
function render() {
  if (M.awardLevels(state).length) save();
  text("coins", money(state.coins));
  text("stock", `${M.available(state)}/${M.barnCapacity(state)}`);
  text("sold", state.sold);
  const lvl = M.patchLevel(state);
  text("level-number", lvl.level);
  $("open-levels").setAttribute("aria-label", `Level ${lvl.level}: ${lvl.name}. ${lvl.next ? Math.round(lvl.progress * 100) + "% to level " + lvl.next.level : "Maximum level"}. View rewards`);
  $("open-levels").style.setProperty("--progress", (lvl.progress * 100).toFixed(1) + "%");
  celebration.tick(!!openTab || !!home.tools.selected || state.paused);
  guestCard.tick(!!openTab || celebration.active);
  npcRewards.tick(!!openTab || !!home.tools.selected || celebration.active || state.paused || document.hidden);
  $("level-bar").style.width = (lvl.progress * 100).toFixed(1) + "%";
  $("hud-level").title = `Level ${lvl.level}: ${lvl.name}. ${lvl.tagline}.`;
  text("level-name", lvl.name);
  const open = state.plots.slice(0, M.openPlots(state));
  const empty = open.filter((p) => p.phase === "empty").length, ripe = open.filter((p) => p.phase === "ready").length;
  $("plant-all").hidden = !empty; text("plant-count", empty);
  $("harvest-all").hidden = !ripe; text("harvest-count", ripe);
  const ready = M.claimable(state), next = M.FAVOURS.find((f) => !state.claimed.includes(f.id));
  $("goal").classList.toggle("ready", ready.length > 0);
  text("goal-text", ready.length ? (ready.length > 1 ? `${ready.length} favours are ready to claim` : ready[0].guest + " has a reward for you") : next ? `${next.title} · ${M.favourProgress(state, next)}/${next.target}` : "Every favour done. The neighbours adore you.");
  $("journal-badge").hidden = !ready.length;
  // The streak chip: the streak and its visitor bonus while it's hot, then the bonus fading once it ends.
  const streak = state.streak, on = streak.count >= 2 && state.time <= streak.until, boost = streakBoostText(), chip = $("streak");
  chip.hidden = (!on && !boost) || !!scene.place;
  chip.classList.toggle("fading", !on);
  if (!chip.hidden) {
    const words = on ? [`Streak ×${streak.count}`, boost] : [boost[0].toUpperCase() + boost.slice(1)];
    text("streak", [...words, `${Math.ceil(M.visitorBoostSeconds(state))}s`].filter(Boolean).join(" · "));
    chip.style.setProperty("--fade", on ? 1 : Math.min(1, M.visitorBoostSeconds(state) / M.STREAK.fade).toFixed(2));
  }
  $("paused").hidden = !state.paused;
  if (openTab) draw();
}
$("goal").onclick = () => { sheets.journal.setTab("favours"); openSheet("journal"); };

// Pumpkin thumbnails rendered from the real voxel models, once.
const thumbs = (() => {
  try {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 112;
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff0dd, 0x4a2a3a, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 3, 4); sc.add(key);
    const cam = new THREE.OrthographicCamera(-0.75, 0.75, 0.75, -0.75, 0.1, 20); cam.position.set(1.6, 1.6, 3); cam.lookAt(0, 0.4, 0);
    const urls = M.VARIETIES.map((_, i) => { const m = pumpkinTemplate(i); sc.add(m); r.render(sc, cam); const url = canvas.toDataURL(); sc.remove(m); return url; });
    r.dispose();
    return urls;
  } catch { return M.VARIETIES.map(() => ""); }
})();

// The menus. Each sheet module gets this small toolkit.
const ui = {
  get state() { return state; }, scene, prefs, savePrefs, audio, save,
  notice, say, tone: (f) => audio.tone(f),
  draw: () => draw(), openSheet: (tab) => openSheet(tab), closeSheet: () => closeSheet(),
  thumb: (v) => (thumbs[v] ? `<span class="thumb"><img src="${thumbs[v]}" alt=""></span>` : `<span class="thumb"><span class="seed-icon"></span></span>`),
  portrait: (id) => scene.portrait(id),
  enterRoom, enterShop, leavePlace,
  read: (id) => collection.read(id),
  replaceState(next) { localStorage.setItem(SAVE_KEY, JSON.stringify(M.saveData(next))); state = next; location.reload(); },
};
const home = homeSheets(ui), collection = collectionSheets(ui);
const sheets = { ...farmSheets(ui), home: home.home, shelf: home.shelf, ...collection, ...festivalMeadowSheet(ui), ...customerCareSheet(ui), ...settingsSheet(ui) };

let openTab = null, lastBody = "";
const celebration = createLevelCelebration({ state: () => state, audio, save, openRewards: () => { sheets.journal.setTab("levels"); openSheet("journal"); } });
const npcRewards = createNpcRewards({ state: () => state, portrait: (kind, id) => scene.portrait(id === "empire" ? "natalie" : "visitor-" + ["ghost", "witch", "vampire", "skeleton", "scarecrow"][kind]), save, tone: f => audio.tone(f), notice });
const guestCard = createGuestCard({ state: () => state, portrait: id => scene.portrait(id) });
$("open-levels").onclick = () => celebration.preview();
$("fullscreen").onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else notice("For fullscreen, add the game to your home screen from the browser menu."); }
  catch { notice("Fullscreen is unavailable here. Try opening this HTML in Chrome or Safari."); }
};
document.addEventListener("fullscreenchange", () => { const on = !!document.fullscreenElement; if (on) requestAnimationFrame(() => scene.fitView()); $("fullscreen").setAttribute("aria-pressed", String(on)); $("fullscreen").setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen"); });
const TABS = { shop: "shop", festival: "shop", care: "shop", home: "home", shelf: "home", wardrobe: "wardrobe", journal: "journal", reader: "journal", settings: null };
function draw() {
  const sheet = sheets[openTab]; if (!sheet) return;
  const html = sheet.body();
  if (html === lastBody) return;                                                 // only redraw when something changed
  lastBody = html;
  const body = $("sheet-body"), scroll = body.scrollTop, active = document.activeElement?.id;
  body.innerHTML = html; sheet.bind(body); body.scrollTop = scroll;
  const title = typeof sheet.title === "function" ? sheet.title() : sheet.title;
  text("sheet-title", title);
  if (active === "decor-search") { const i = $("decor-search"); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }
}
function openSheet(tab) {
  if (home.tools.selected) home.tools.select(null);
  document.body.classList.add("menu-open");
  $("sheet").dataset.section = tab;
  openTab = tab; lastBody = "";
  const sheet = sheets[tab];
  sheet.opened?.();
  $("sheet-eyebrow").textContent = sheet.eyebrow;
  $("sheet").hidden = false; $("sheet-body").scrollTop = 0; draw();
  markTab();
  $("sheet-close").focus({ preventScroll: true });
}
function closeSheet() { document.body.classList.remove("menu-open"); openTab = null; $("sheet").hidden = true; markTab(); }
function markTab() {
  const active = openTab ? TABS[openTab] : scene.place?.kind === "room" ? "home" : scene.place?.kind === "shop" ? "shop" : "patch";
  document.querySelectorAll(".tab").forEach((t) => { const on = t.dataset.tab === active; t.classList.toggle("active", on); t.setAttribute("aria-pressed", String(on)); });
}
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
  const tab = t.dataset.tab;
  if (tab === "patch") { leavePlace(); closeSheet(); scene.fitView(); }
  else if (tab === "home") openHome();
  else openSheet(tab);
}));
$("open-settings").onclick = () => openSheet("settings");
$("sheet-close").onclick = closeSheet;

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (celebration.active) return;
  const tools = home.tools;
  if (e.key === "Escape") { guestCard.clear(); if (tools.selected) tools.select(null); else closeSheet(); return; }
  if (tools.selected && scene.place?.kind === "room") {
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (nudge) { e.preventDefault(); tools.nudge(...nudge); return; }
    if (e.key === "r" || e.key === "R") { e.preventDefault(); tools.rotate(e.shiftKey ? -15 : 15); return; }
    if (e.key === "f" || e.key === "F") return tools.act("flip");
    if (e.key === "Delete" || e.key === "Backspace") return tools.act("store");
  }
  if (scene.place || openTab || e.repeat) return;                                 // a held key is one press
  if (e.key === " ") { e.preventDefault(); boost(); }
  if (e.key === "p" || e.key === "P") plantAll();
  if (e.key === "h" || e.key === "H") harvestAll();
});

scene.setBloom(prefs.glow); if (!prefs.shadows) scene.setShadows(false); scene.setVoxelCharacters(prefs.voxelCharacters);
render(); renderPlace();
// For the smoke test and screenshots: `advance` runs the rules forward, since a
// software-rendered browser only manages a few frames a second.
const advance = (seconds) => { for (let t = 0; t < seconds; t += 0.1) for (const e of M.update(state, 0.1)) handle(e); render(); };
window.PumpkinVoxel = { state: () => state, scene, notice, openSheet, closeSheet, enterRoom, enterShop, leavePlace, tools: home.tools, audio, advance };
document.body.dataset.ready = "true";
