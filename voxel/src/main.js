import * as THREE from "three";
import { VARIETIES, UPGRADES, LOOKS, freshState, openPlots, plant, harvest, tap, update, buyUpgrade, upgradeCost, upgradePlot, buyLook } from "./model.js";
import { createScene, pumpkinTemplate } from "./scene.js";

const SAVE_KEY = "pumpkin-patch-voxel-reference-v1";
const $ = (id) => document.getElementById(id);
const money = (n) => "£" + Math.floor(n).toLocaleString("en-GB");

// Saves are separate from the main game, so trying this never touches real progress.
function load() {
  const s = freshState();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && Array.isArray(raw.plots) && raw.plots.length === 12) Object.assign(s, raw, { visitors: [] });
  } catch {}
  return s;
}
let state = load();
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, visitors: [] })); } catch {} };
setInterval(save, 5000);
document.addEventListener("visibilitychange", () => document.hidden && save());

// Favours from the neighbours (the bible's cast), claimed in the Journal.
const GOALS = [
  { id: "ghost", guest: "Pip the ghost", title: "A basket for a ghost", text: "Harvest 6 pumpkins.", target: 6, reward: 25, metric: (s) => s.harvested },
  { id: "witch", guest: "Mabel the witch", title: "The midnight welcome", text: "Sell to 4 visitors.", target: 4, reward: 35, metric: (s) => s.sold },
  { id: "bram", guest: "Count Bram", title: "A little pumpkin magic", text: "Tap the big pumpkin 16 times.", target: 16, reward: 20, metric: (s) => s.taps },
  { id: "bones", guest: "Bones the bookworm", title: "A patch of moonlight", text: "Upgrade a plot to Moonlight.", target: 1, reward: 40, metric: (s) => s.plotLevels.some((l) => l > 0) ? 1 : 0 },
  { id: "patch", guest: "Patch the scarecrow", title: "The night market", text: "Sell to 25 visitors.", target: 25, reward: 80, metric: (s) => s.sold },
];
state.claimed ??= [];
const ready = () => GOALS.filter((g) => !state.claimed.includes(g.id) && g.metric(state) >= g.target);

// Real banter from the game (docs/GAME-BIBLE.md §1).
const LINES = {
  natalie: ["It’s called an autumn outfit, Shane. Now help me plant something.", "We cannot keep every pumpkin. We’re running a shop, not an orange adoption centre.", "Imagine fairy lights all the way down the path. And a hot chocolate stand…", "Look at what we made together. I think we’re getting the hang of this.", "She checks every pumpkin. Mostly by sitting beside it and looking important."],
  shane: ["Do we name the pumpkins? Because this one is definitely a Kevin.", "Hear me out: a loyalty card. Buy nine pumpkins, receive a slightly larger pumpkin.", "A little dirt on your boots, a little money in the till. That’s a good day.", "One empire at a time, Nat. First pumpkins. Then world domination.", "Skyla rang the bell. That either means a sale or she wants her dinner."],
};
let lineIndex = { natalie: 0, shane: 0 };

const scene = createScene($("world"), state, {
  onTick(dt) {
    for (const e of update(state, dt)) {
      if (e.type === "sale") { scene.sale(e.amount); }
      if (e.type === "harvest") scene.harvested(e.plot);
      if (e.type === "plant" || e.type === "harvest") scene.sendTo(e.plot);
    }
    render();
  },
  onPick(what) {
    if (what.type === "plot") tapPlot(what.index);
    if (what.type === "pumpkin") boost();
    if (what.type === "shop") openSheet("shop");
    if (what.type === "home") notice("The cottage’s rooms aren’t part of this reference build.");
    if (what.type === "talk") talk(what.who);
  },
});

function tapPlot(i) {
  if (i >= openPlots(state)) return notice("Clear more ground in the Shop to open this plot.");
  const p = state.plots[i];
  if (p.phase === "empty" && plant(state, i)) scene.sendTo(i);
  else if (p.phase === "ready" && harvest(state, i)) { scene.sendTo(i); scene.harvested(i); }
  else if (p.phase === "growing") notice(VARIETIES[p.variety].name + " · " + Math.round(p.progress * 100) + "% grown. Tap the big pumpkin to hurry it.");
}
function boost() { tap(state); scene.tapPumpkin(); }

let bubbleTimer;
function talk(who) {
  const lines = LINES[who], line = lines[lineIndex[who]++ % lines.length], at = scene.actorPosition(who), b = $("bubble");
  b.innerHTML = "<b>" + (who === "natalie" ? "Natalie" : "Shane") + "</b>" + line;
  b.style.left = at.x + "px"; b.style.top = at.y + "px"; b.hidden = false;
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => (b.hidden = true), 4200);
}

let noticeTimer;
function notice(text) {
  $("notice").textContent = text; $("notice").classList.add("show");
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $("notice").classList.remove("show"), 2800);
}

$("plant-all").onclick = () => { for (let i = 0; i < openPlots(state); i++) if (plant(state, i)) scene.sendTo(i); };
$("harvest-all").onclick = () => { for (let i = 0; i < openPlots(state); i++) if (harvest(state, i)) { scene.harvested(i); scene.sendTo(i); } };
$("boost").onclick = boost;

// The HUD, actions and goal line, every frame (cheap: only text changes).
function render() {
  $("coins").textContent = money(state.coins);
  $("stock").textContent = state.stock.length;
  $("sold").textContent = state.sold;
  const open = state.plots.slice(0, openPlots(state));
  const empty = open.filter((p) => p.phase === "empty").length, ripe = open.filter((p) => p.phase === "ready").length;
  $("plant-all").hidden = !empty; $("plant-count").textContent = empty;
  $("harvest-all").hidden = !ripe; $("harvest-count").textContent = ripe;
  const claimable = ready(), next = GOALS.find((g) => !state.claimed.includes(g.id));
  $("goal").classList.toggle("ready", claimable.length > 0);
  $("goal-text").textContent = claimable.length ? claimable[0].guest + " has a reward for you" : next ? next.title + " · " + Math.min(next.target, next.metric(state)) + "/" + next.target : "Every favour done. The neighbours adore you.";
  $("journal-badge").hidden = !claimable.length;
  if (openTab && refreshSheet) refreshSheet();
}
$("goal").onclick = () => openSheet("journal");

// Pumpkin thumbnails rendered from the real voxel models, once.
const thumbs = (() => {
  try {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 112;
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff0dd, 0x4a2a3a, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 3, 4); sc.add(key);
    const cam = new THREE.OrthographicCamera(-0.75, 0.75, 0.75, -0.75, 0.1, 20); cam.position.set(1.6, 1.6, 3); cam.lookAt(0, 0.4, 0);
    return VARIETIES.map((_, i) => { const m = pumpkinTemplate(i); sc.add(m); r.render(sc, cam); const url = canvas.toDataURL(); sc.remove(m); return url; });
  } catch { return VARIETIES.map(() => ""); }
})();
const thumb = (i) => thumbs[i] ? `<span class="thumb"><img src="${thumbs[i]}" alt=""></span>` : `<span class="thumb"><span class="seed-icon"></span></span>`;

// Sheets.
let openTab = null, refreshSheet = null, shopTab = "upgrades";
const ICONS = { tools: "spark-icon", signs: "coin-icon", plots: "seed-icon", helper: "basket-icon" };
const SHEETS = {
  shop: {
    eyebrow: "Skyla’s counter", title: "The Honest Pumpkin",
    body() {
      const seg = `<div class="segmented" role="group" aria-label="Shop sections"><button data-shop="upgrades" aria-pressed="${shopTab === "upgrades"}">Upgrades</button><button data-shop="seeds" aria-pressed="${shopTab === "seeds"}">Seeds</button></div>`;
      if (shopTab === "upgrades") return seg + UPGRADES.map((u) => {
        const level = state.upgrades[u.id], max = level >= u.max, price = upgradeCost(state, u.id);
        return `<article class="card${max ? " done" : ""}"><span class="thumb"><span class="${ICONS[u.id]}"></span></span><div><h3>${u.name}</h3><p>${u.text}</p><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</div></div>
          <button class="button ${max ? "" : "gold"}" data-buy="${u.id}" ${max || state.coins < price ? "disabled" : ""}>${max ? "Owned" : money(price)}${!max && state.coins < price ? `<small>need ${money(price - state.coins)}</small>` : ""}</button></article>`;
      }).join("");
      return seg + `<p>Each plot grows its own variety. Better pumpkins sell for more, to visitors who can afford them.</p><div class="plot-grid">` + state.plots.map((p, i) => {
        if (i >= openPlots(state)) return `<div class="plot-card"><span class="thumb"><span class="seed-icon"></span></span><h3>Plot ${i + 1}</h3><p>Not cleared yet</p></div>`;
        const lvl = state.plotLevels[i], next = VARIETIES[lvl + 1];
        return `<div class="plot-card">${thumb(lvl)}<h3>Plot ${i + 1} · ${VARIETIES[lvl].name}</h3><p>${money(VARIETIES[lvl].price)} each</p>${next ? `<button class="button" data-plot="${i}" ${state.coins < next.cost ? "disabled" : ""}>${next.name} · ${money(next.cost)}</button>` : `<p>Best seeds</p>`}</div>`;
      }).join("") + `</div>`;
    },
    bind(body) {
      body.querySelectorAll("[data-shop]").forEach((b) => (b.onclick = () => { shopTab = b.dataset.shop; draw(); }));
      body.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => { if (buyUpgrade(state, b.dataset.buy)) { notice(UPGRADES.find((u) => u.id === b.dataset.buy).name + " bought."); draw(); } }));
      body.querySelectorAll("[data-plot]").forEach((b) => (b.onclick = () => { if (upgradePlot(state, +b.dataset.plot)) { notice("Plot " + (+b.dataset.plot + 1) + " will grow " + VARIETIES[state.plotLevels[+b.dataset.plot]].name + "."); draw(); } }));
    },
  },
  wardrobe: {
    eyebrow: "Dress for the witching hour", title: "Wardrobe",
    body() {
      const block = (who, name, key) => `<div class="who"><h3>${name}</h3></div>` + LOOKS[who].map((l) => {
        const owned = state.looks.owned.includes(l.id), wearing = state.looks[who] === l.id;
        return `<article class="card"><span class="swatch" style="background:#${l[key].toString(16).padStart(6, "0")}"></span><div><h3>${l.name}</h3><p>${wearing ? "Wearing now" : owned ? "In the wardrobe" : money(l.price)}</p></div>
          <button class="button ${wearing ? "" : "gold"}" data-look="${who}:${l.id}" ${wearing || (!owned && state.coins < l.price) ? "disabled" : ""}>${wearing ? "Worn" : owned ? "Wear" : "Buy"}</button></article>`;
      }).join("");
      return `<p>Recolour their signature pieces. The full outfits from the main game are a later step for this build.</p>` + block("natalie", "Natalie’s knit", "sweater") + block("shane", "Shane’s beanie", "beanie");
    },
    bind(body) {
      body.querySelectorAll("[data-look]").forEach((b) => (b.onclick = () => { const [who, id] = b.dataset.look.split(":"); if (buyLook(state, who, id)) { scene.refreshLooks(); draw(); } }));
    },
  },
  journal: {
    eyebrow: "The neighbourhood after dark", title: "Midnight favours",
    body() {
      return GOALS.map((g) => {
        const done = state.claimed.includes(g.id), have = Math.min(g.target, g.metric(state)), can = !done && have >= g.target;
        return `<article class="card${done ? " done" : ""}"><span class="thumb"><span class="ghost-icon"></span></span><div><p class="eyebrow" style="letter-spacing:.06em">${g.guest}</p><h3>${g.title}</h3><p>${g.text}</p><div class="bar"><i style="width:${have / g.target * 100}%"></i></div></div>
          <button class="button ${can ? "gold" : ""}" data-claim="${g.id}" ${can ? "" : "disabled"}>${done ? "Thanked" : can ? "Claim " + money(g.reward) : have + "/" + g.target}</button></article>`;
      }).join("");
    },
    bind(body) {
      body.querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => { const g = GOALS.find((x) => x.id === b.dataset.claim); if (g && !state.claimed.includes(g.id) && g.metric(state) >= g.target) { state.claimed.push(g.id); state.coins += g.reward; notice(g.guest + " says thank you: +" + money(g.reward)); draw(); } }));
    },
  },
  settings: {
    eyebrow: "Make yourself at home", title: "Settings",
    body() {
      return `<div class="setting"><span>Glow<small>Bloom on lanterns, windows and ripe pumpkins</small></span><button class="button" id="toggle-glow" aria-pressed="${prefs.glow}">${prefs.glow ? "On" : "Off"}</button></div>
        <div class="setting"><span>Moonlit shadows<small>Turn off on slower phones</small></span><button class="button" id="toggle-shadows" aria-pressed="${prefs.shadows}">${prefs.shadows ? "On" : "Off"}</button></div>
        <div class="setting"><span>Voxel characters<small>Build Shane, Natalie, Skyla and the visitors from voxels instead of the original sprites</small></span><button class="button" id="toggle-voxel-characters" aria-pressed="${prefs.voxelCharacters}">${prefs.voxelCharacters ? "On" : "Off"}</button></div>
        <div class="setting"><span>Start a new patch<small>Clears this reference build only</small></span><button class="button danger" id="reset">${confirmReset ? "Tap again to reset" : "Reset"}</button></div>
        <p class="about">Voxel reference build of Shane &amp; Natalie’s Pumpkin Patch, made from docs/GAME-BIBLE.md. Drag to look around, pinch or scroll to zoom, tap plots, the big pumpkin, the shop, or Shane and Natalie.</p>`;
    },
    bind(body) {
      body.querySelector("#toggle-glow").onclick = () => { prefs.glow = !prefs.glow; scene.setBloom(prefs.glow); savePrefs(); draw(); };
      body.querySelector("#toggle-shadows").onclick = () => { prefs.shadows = !prefs.shadows; scene.setShadows(prefs.shadows); savePrefs(); draw(); };
      body.querySelector("#toggle-voxel-characters").onclick = () => { prefs.voxelCharacters = !prefs.voxelCharacters; scene.setVoxelCharacters(prefs.voxelCharacters); savePrefs(); draw(); };
      body.querySelector("#reset").onclick = () => { if (!confirmReset) { confirmReset = true; draw(); return; } localStorage.removeItem(SAVE_KEY); location.reload(); };
    },
  },
};
let confirmReset = false;
const prefs = (() => { const base = { glow: true, shadows: true, voxelCharacters: false }; try { return { ...base, ...JSON.parse(localStorage.getItem(SAVE_KEY + "-prefs") || "{}") }; } catch { return base; } })();
const savePrefs = () => { try { localStorage.setItem(SAVE_KEY + "-prefs", JSON.stringify(prefs)); } catch {} };
scene.setBloom(prefs.glow); if (!prefs.shadows) scene.setShadows(false); scene.setVoxelCharacters(prefs.voxelCharacters);

let lastBody = "";
function draw() {
  const sheet = SHEETS[openTab]; if (!sheet) return;
  const html = sheet.body();
  if (html === lastBody) return;                                                 // only redraw when something changed
  lastBody = html;
  const body = $("sheet-body"), scroll = body.scrollTop;
  body.innerHTML = html; sheet.bind(body); body.scrollTop = scroll;
}
function openSheet(tab) {
  openTab = tab; confirmReset = false; lastBody = "";
  const sheet = SHEETS[tab];
  $("sheet-eyebrow").textContent = sheet.eyebrow; $("sheet-title").textContent = sheet.title;
  $("sheet").hidden = false; refreshSheet = draw; draw();
  document.querySelectorAll(".tab").forEach((t) => { const on = t.dataset.tab === tab; t.classList.toggle("active", on); t.setAttribute("aria-pressed", String(on)); });
  $("sheet-close").focus({ preventScroll: true });
}
function closeSheet() {
  openTab = null; refreshSheet = null; $("sheet").hidden = true;
  document.querySelectorAll(".tab").forEach((t) => { const on = t.dataset.tab === "patch"; t.classList.toggle("active", on); t.setAttribute("aria-pressed", String(on)); });
}
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => (t.dataset.tab === "patch" ? (closeSheet(), scene.focus(window.innerWidth < 700 ? 15.5 : 20, 13.5)) : openSheet(t.dataset.tab))));
$("open-settings").onclick = () => openSheet("settings");
$("sheet-close").onclick = closeSheet;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); if (e.key === " " && !openTab) { e.preventDefault(); boost(); } });

render();
window.PumpkinVoxel = { state: () => state, scene, notice, openSheet, closeSheet };
document.body.dataset.ready = "true";
