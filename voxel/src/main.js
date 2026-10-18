import * as THREE from "three";
import * as M from "./model.js";
import { createScene } from "./scene.js";
import { pumpkinTemplate } from "./pumpkins.js";
import { createAudio } from "./ui/audio.js";
import { farmSheets } from "./ui/farm-sheets.js";
import { homeSheets } from "./ui/home-sheets.js";
import { collectionSheets } from "./ui/collection-sheets.js";
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
  const base = { glow: true, shadows: true, voxelCharacters: false, music: true, musicVolume: 0.32, sound: false };
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

const scene = createScene($("world"), state, {
  onTick(dt) {
    if (!state.paused) for (const e of M.update(state, dt)) handle(e);
    render();
  },
  onPick(what) {
    if (what.type === "plot") tapPlot(what.index);
    else if (what.type === "pumpkin") boost();
    else if (what.type === "shop") { if (state.shop.unlocked) enterShop(); sheets.shop.setTab("shop"); openSheet("shop"); }
    else if (what.type === "home") openHome();
    else if (what.type === "talk") talk(what.who);
    else if (what.type === "piece") home.tools.select(what.instance);
    else if (what.type === "go") goTo(what.to);
    else if (what.type === "floor" || what.type === "wall") { if (home.tools.selected) home.tools.tapCell(scene.cellAt(what.point, what.type)); }
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
  if (streak.bonus) { scene.float(`Streak ×${streak.count} · +${money(streak.bonus)}`, PLOTS[i], "coin"); audio.tone(880); }
  return n;
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
function enterRoom(id) { state.house.activeRoom = id; scene.enter("room", id); renderPlace(); }
// Up or down the stairs, or through a doorway, to the next room.
function goTo(id) {
  const name = M.houseRooms.find((r) => r.id === id)?.name.toLowerCase() ?? id, layout = M.roomLayout(state, scene.place?.id);
  const way = layout?.stairs.find((st) => st.up === id) ? "Up to" : layout?.stairs.find((st) => st.down === id) ? "Down to" : "Through to";
  home.tools.select(null); enterRoom(id); notice(`${way} the ${name}.`); audio.tone(440);
  if (openTab === "home") draw();
}
function enterShop() { scene.enter("shop"); renderPlace(); }
function leavePlace() { home.tools.select(null); scene.leavePlace(); renderPlace(); }
function openHome() { if (scene.place?.kind !== "room") enterRoom(state.house.activeRoom); openSheet("home"); }
function renderPlace() {
  const p = scene.place, inside = !!p;
  $("place-bar").hidden = !inside; $("actions").hidden = inside; $("goal").hidden = inside;
  if (inside) $("place-title").textContent = p.kind === "shop" ? "The Honest Pumpkin" : "The " + M.houseRooms.find((r) => r.id === p.id).name;
  $("place-decorate").hidden = p?.kind !== "room";
  home.tools.render();
  markTab();
}
$("place-back").onclick = () => { leavePlace(); closeSheet(); };
$("place-decorate").onclick = () => { sheets.home.setTab("decorate"); openSheet("home"); };

$("plant-all").onclick = plantAll;
$("harvest-all").onclick = harvestAll;
$("boost").onclick = boost;

// The HUD, actions, goal and streak, every frame (cheap: only text changes).
const text = (id, value) => { const el = $(id); if (el.textContent !== String(value)) el.textContent = value; };
function render() {
  text("coins", money(state.coins));
  text("stock", M.available(state));
  text("sold", state.sold);
  const lvl = M.patchLevel(state);
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
  const streak = state.streak, on = streak.count >= 2 && state.time <= streak.until;
  $("streak").hidden = !on || !!scene.place;
  if (on) text("streak", `Harvest streak ×${streak.count}`);
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
const sheets = { ...farmSheets(ui), home: home.home, shelf: home.shelf, ...collection, ...settingsSheet(ui) };

let openTab = null, lastBody = "";
const TABS = { shop: "shop", home: "home", shelf: "home", wardrobe: "wardrobe", journal: "journal", reader: "journal", settings: null };
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
  openTab = tab; lastBody = "";
  const sheet = sheets[tab];
  sheet.opened?.();
  $("sheet-eyebrow").textContent = sheet.eyebrow;
  $("sheet").hidden = false; $("sheet-body").scrollTop = 0; draw();
  markTab();
  $("sheet-close").focus({ preventScroll: true });
}
function closeSheet() { openTab = null; $("sheet").hidden = true; markTab(); }
function markTab() {
  const active = openTab ? TABS[openTab] : scene.place?.kind === "room" ? "home" : scene.place?.kind === "shop" ? "shop" : "patch";
  document.querySelectorAll(".tab").forEach((t) => { const on = t.dataset.tab === active; t.classList.toggle("active", on); t.setAttribute("aria-pressed", String(on)); });
}
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
  const tab = t.dataset.tab;
  if (tab === "patch") { leavePlace(); closeSheet(); scene.focus(window.innerWidth < 700 ? 15.5 : 20, 13.5); }
  else if (tab === "home") openHome();
  else openSheet(tab);
}));
$("open-settings").onclick = () => openSheet("settings");
$("sheet-close").onclick = closeSheet;

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  const tools = home.tools;
  if (e.key === "Escape") { if (tools.selected) tools.select(null); else closeSheet(); return; }
  if (tools.selected && scene.place?.kind === "room") {
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (nudge) { e.preventDefault(); tools.nudge(...nudge); return; }
    if (e.key === "f" || e.key === "F") return tools.act("flip");
    if (e.key === "Delete" || e.key === "Backspace") return tools.act("store");
  }
  if (scene.place || openTab) return;
  if (e.key === " ") { e.preventDefault(); boost(); }
  if (e.key === "p" || e.key === "P") plantAll();
  if (e.key === "h" || e.key === "H") harvestAll();
});

scene.setBloom(prefs.glow); if (!prefs.shadows) scene.setShadows(false); scene.setVoxelCharacters(prefs.voxelCharacters);
render(); renderPlace();
// For the smoke test and screenshots: `advance` runs the rules forward, since a
// software-rendered browser only manages a few frames a second.
const advance = (seconds) => { for (let t = 0; t < seconds; t += 0.1) for (const e of M.update(state, 0.1)) handle(e); render(); };
window.PumpkinVoxel = { state: () => state, scene, notice, openSheet, closeSheet, enterRoom, enterShop, leavePlace, tools: home.tools, advance };
document.body.dataset.ready = "true";
