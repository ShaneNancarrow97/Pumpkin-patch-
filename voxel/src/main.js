import { createLifeActivity } from './life-activity.js';
import { createPlayControls } from './ui/play-controls.js';
import { homeLifeSheet, createHomeJourney } from './ui/home-life-sheet.js';
import { waterPlot, wateringStatus } from './rules/hands-on.js';
import { showFirstCooking } from "./ui/cooking-reveal.js";
import { installPremiumIcons, premiumIcon } from "./ui/premium-icons.js";
import * as THREE from "three";
import { createMenuMemory } from "./ui/menu-memory.js";
import { createStockPopover } from "./ui/stock-popover.js";
import { markPurchaseSurfaces } from "./ui/purchase-surfaces.js";
import * as M from "./model.js";
import { createScene } from "./scene.js";
import { pumpkinTemplate } from "./pumpkins.js";
import { createLevelCelebration } from "./ui/level-celebration.js";
import { createAudio } from "./ui/audio.js";
import { createMazeRideUI } from "./ui/maze-ride-ui.js";
import { createMazeAudio } from "./ui/maze-audio.js";
import { createHayrideAudio } from "./ui/hayride-audio.js";
import { createHayrideRideUI } from "./ui/hayride-ride-ui.js";
import { buildMazeRideConfig } from "./rules/maze-ride.js";
import { farmSheets } from "./ui/farm-sheets.js";
import { homeSheets } from "./ui/home-sheets.js";
import { collectionSheets } from "./ui/collection-sheets.js";
import { customerCareSheet } from "./ui/customer-care-sheet.js";
import { createGuestCard } from "./ui/guest-card.js";
import { createChatCard } from "./ui/chat-card.js";
import { createUpgradeMenu } from "./ui/upgrade-menu.js";
import { createNpcRewards } from "./ui/npc-rewards.js";
import { festivalMeadowSheet } from "./ui/festival-meadow-sheet.js";
import { estateSheet } from "./ui/estate-sheet.js";
import { createEstateControls } from "./ui/estate-controls.js";
import { moreSheet } from "./ui/more-sheet.js";
import { hollowSheets, createHollowContext } from "./ui/hollow-sheet.js";
import { hayrideSheets, createHayrideContext } from "./ui/hayride-sheet.js";
import { cookingSheets } from "./ui/cooking-sheet.js";
import { createFoyerControls } from "./ui/foyer-controls.js";
import { settingsSheet } from "./ui/settings-sheet.js";
import { createIntro } from "./ui/intro.js";
import { money, $ } from "./ui/kit.js";
import { PLOTS } from "./world.js";
import { leaveHouse } from "./play-ways.js";
import { createPlaceVeil } from "./ui/place-veil.js";
import { createCarvingUI } from "./ui/carving-ui.js";

const SAVE_KEY = "pumpkin-patch-voxel-reference-v1";

// Saves are separate from the main game's, so trying this never touches real
// progress. Older voxel saves are brought up to date by restoreState().
function load() {
  try { return M.restoreState(JSON.parse(localStorage.getItem(SAVE_KEY) || "null")); } catch { return M.freshState(); }
}
let state = load();
let playControls, homeJourney, lifeActivity;
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(M.saveData(state))); } catch {} };
setInterval(save, 5000);
document.addEventListener("visibilitychange", () => document.hidden && save());

const prefs = (() => {
  // Mist and the moving lake start off for anyone who has asked for less motion.
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base = { renderQuality: "sharp", glow: true, shadows: true, voxelCharacters: false, music: true, musicVolume: 0.32, musicTrack: "lantern", musicShuffle: true, sound: false, mist: !still, lakeLights: !still, mazeSound: true, mazeVolume: .45 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(SAVE_KEY + "-prefs") || "{}") }; } catch { return base; }
})();
const savePrefs = () => { try { localStorage.setItem(SAVE_KEY + "-prefs", JSON.stringify(prefs)); } catch {} };
const audio = createAudio(prefs), mazeAudio = createMazeAudio(prefs), hayrideAudio = createHayrideAudio(prefs);
const mazeUI = createMazeRideUI({ prefs, savePrefs,
  onStart: startMazeRide, onPause: pauseMazeRide, onExit: exitMazeRide, onReplay: replayMazeRide,
  onSound: on => mazeAudio.setMuted(!on), onVolume: value => mazeAudio.setVolume(value),
  onGentle: on => { mazeAudio.setGentle(on); scene.setMazeOptions({ gentle: on }); },
  onFullscreen: () => $("fullscreen").click(),
});
const hayrideUI = createHayrideRideUI({ prefs, savePrefs,
  onStart: startHayrideRide, onPause: pauseHayrideRide, onExit: exitHayrideRide, onReplay: replayHayrideRide,
  onSound: on => hayrideAudio.setMuted(!on),
  onGentle: on => { hayrideAudio.setGentle(on); scene.setHayrideOptions({ gentle: on }); },
  onLightning: on => scene.setHayrideOptions({ lightning: on }),
  onFullscreen: () => $("fullscreen").click(),
});

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
let idle = 0, idleTea = false, memoryChimeAt = -1e9;
for (const type of ["pointerdown", "keydown", "wheel"]) addEventListener(type, () => {
  idle = 0;
  if (idleTea) { idleTea = false; state.paused = false; notice("Welcome back! Tea's finished, back to the patch."); }
}, { capture: true, passive: true });

const scene = createScene($("world"), state, {
  onTick(dt) {
    idle += dt;
    if (idle > IDLE_TEA && !state.paused) { idleTea = true; state.paused = true; notice("You've been away a while, so Shane and Natalie have put the kettle on. Tap to carry on."); }
    const handsOn = !!scene.player?.enabled;
    if (handsOn && !state.handsOn && state.upgrades.auto) notice("Helping hands are resting while you're in charge.");
    state.handsOn = handsOn;
    if (!state.paused) for (const e of M.update(state, dt)) handle(e);
    lifeActivity?.tick(dt);
    carvingUI?.tick(dt);
    render();
  },
  selectedPiece: () => home.tools.selected,
  canDragPiece: () => !!home.tools.selected && M.footprint(state.house.placed.find((p) => p.instance === home.tools.selected)?.id ?? "f01").layer !== "wall",
  onPieceDragStart: point => home.tools.beginDrag(point),
  onPieceDragMove: point => home.tools.dragTo(point),
  onPieceDragEnd: cancelled => home.tools.endDrag(cancelled),
  onWay: way => passThrough(way),
  // The carving bench: a piece cut out of the pumpkin (carving-view.js).
  onCarveCut: id => { const ok = M.cutPiece(state, id); if (ok) { audio.tone(392); setTimeout(() => audio.tone(262), 90); playFeel("done"); save(); carvingUI?.render(); } return ok; },
  onCarveProgress: status => carvingUI?.progress(status),
  onMazeCue: cue => mazeAudio.cue(cue),
  onMazeState: status => mazeUI.update(status),
  onMazeComplete: status => { mazeAudio.pause(true); mazeUI.update(status); },
  onHayrideCue: cue => hayrideAudio.cue(cue),
  onHayrideState: status => hayrideUI.update(status),
  onHayrideComplete: status => { hayrideAudio.pause(true); hayrideUI.update(status); },
  canRotatePiece: () => !!home.tools.selected && M.footprint(state.house.placed.find((p) => p.instance === home.tools.selected)?.id ?? "f01").layer !== "wall",
  foyerEditing: () => foyerTools.active || openTab === "foyer",
  estateEditing: () => estateTools.active,
  foyerWallEditing: () => M.FOYER_DECOR_BY_ID[foyerTools.placement?.id]?.layer === "wall",
  // Dragging and two-finger turning of the selected foyer piece, as in the house.
  estateGesture: { pose: () => estateTools.placement, begin: () => estateTools.beginGesture(), drag: (x, z) => estateTools.dragTo(x, z), turn: degrees => estateTools.turn(degrees), end: cancelled => estateTools.endGesture(cancelled) },
  foyerGesture: { pose: () => foyerTools.placement, begin: () => foyerTools.beginGesture(), drag: (x, z) => foyerTools.dragTo(x, z), turn: degrees => foyerTools.turn(degrees), end: cancelled => foyerTools.endGesture(cancelled) },
  onRotatePiece: (degrees) => home.tools.rotate(degrees, false),
  onRotateEnd: cancelled => home.tools.finishRotation(cancelled),
  // A chat marker over a group in the meadow (scene.js syncChats).
  onChat(spot) { guestCard.clear(); chatCard.open(spot); },
  onPick(what) {
    // Playing: a tap on a plot, a piece of furniture, or a garden bed or bench
    // walks the owner over and does it there.
    if (playControls?.active && !home.tools.selected && !openTab && ["plot", "piece", "estate-decor"].includes(what.type)) {
      const match = (t) => what.type === "plot" ? t?.type === "plot" && t.index === what.index : !!t && t.instance === what.instance;
      if (match(scene.player.state().target)) { interactAsPlayer(); return; }
      const goal = scene.player.targets().find(match);
      if (goal && scene.player.walkTo({ x: goal.x, z: goal.z, near: what.type === "plot" ? 1.1 : 1.8, reach: goal.reach, then: () => { if (match(scene.player.state().target)) interactAsPlayer(); } })) playFeel("select");
      else if (!goal && what.type !== "estate-decor") notice("Walk a little closer to that, then press the action button.");
      return;
    }
    if (what.type === "visitor" || what.type === "customer") {
      if (estateTools.active || foyerTools.active || home.tools.selected) return;
      // A guest chatting in the meadow opens what their group is saying.
      const chat = what.type === "visitor" && state.visitors.find((v) => v.id === what.id)?.social;
      if (chat && !chat.gone && chat.phase !== "leaving") { guestCard.clear(); chatCard.open(chat.spot); }
      else { chatCard.clear(); guestCard.open(what.id, what.type === "customer"); }
    }
    else if (what.type === "plot") tapPlot(what.index);
    else if (what.type === "pumpkin") boost();
    else if (what.type === "seeds") { sheets.shop.setTab("seeds"); openSheet("shop"); }
    else if (what.type === "shop") { if (state.shop.unlocked) enterShop(); sheets.shop.setTab("shop"); openSheet("shop"); }
    else if (what.type === "food-truck") openCookingSheet("recipes", "truck");
    else if (what.type === "food-display") openCookingSheet("food");
    else if (what.type === "meadow-land" || what.type === "cocoa-stand") { sheets.festival.setTab(what.type === "cocoa-stand" ? "cocoa" : "estate"); openSheet("festival"); }
    else if (what.type === "home") openHome();
    else if (what.type === "estate-house") { if (!estateTools.active) { enterRoom(state.house.activeRoom); closeSheet(); } else notice("Keep the house and its entrance clear. Tap an open part of the garden."); }
    else if (what.type === "estate-exit") { if (!estateTools.active) { leavePlace(); closeSheet(); } else notice("The entrance path stays clear for coming and going."); }
    else if (what.type === "estate-decor") {
      // A crop bed is tended and the carving bench opens with a tap; other
      // pieces (and beds while moving pieces) are picked up to move.
      const def = M.ESTATE_DECOR_BY_ID[state.estate.placed.find((p) => p.instance === what.instance)?.id];
      if (!estateTools.active && def?.crop) tendGardenBed(what.instance);
      else if (!estateTools.active && def?.carving) openCarving();
      else estateTools.select(what.instance);
    }
    else if (what.type === "estate-ground") { if (estateTools.active) estateTools.placeAt(what.point.x, what.point.z); }
    else if (what.type === "hollow-door") { closeSheet(); if (M.hollowReady(state)) enterFoyer(); else hollowContext.open(); }
    else if (what.type === "hollow-house") { closeSheet(); hollowContext.open(); }
    else if (what.type === "hayride" || what.type === "hayride-station") { closeSheet(); hollowContext.close(); hayrideContext.close(); hayrideContext.open(); }
    else if (what.type === "foyer-exit") { if (!foyerTools.active) leavePlace(); }
    else if (what.type === "maze-door") { if (!foyerTools.active) openMazeRide(); }
    else if (what.type === "mortimer") { if (!foyerTools.active) scene.speakMortimer(); }
    else if (what.type === "foyer-decor") foyerTools.select(what.instance);
    else if (["foyer-ground", "foyer-wall"].includes(what.type)) { if (foyerTools.active) foyerTools.placeAt(what.point.x, what.point.z, what.wall, what.point.y); }
    else if (what.type === "talk") talk(what.who);
    else if (what.type === "piece") { if (!home.tools.tapPiece(what.instance, what.point)) home.tools.select(what.instance); }
    else if (what.type === "go") goTo(what.to);
    else if (what.type === "floor" || what.type === "wall") { if (home.tools.selected) home.tools.tapCell(scene.cellAt(what.point, what.type, what.wall, home.tools.snap)); }
  },
});

// What the rules report, turned into sights and sounds.
function handle(e) {
  if (e.type === "cooking-started") showFirstCooking(state,e.recipe,e.station,save);
  if (e.type === "visitor-event") notice(`${e.event === "vip" ? "The midnight court" : "Harvest rush"}: ${e.count} guests are on their way.`);
  if (e.type === "vip-arrived") notice("Baron Brassbolt has arrived with a generous shopping budget.");
  if (e.type === "hollow-restored") { notice("Restoration complete. The Hollow House is ready to open."); save(); audio.tone(880); }
  if (e.type === "recipe-discovered") { notice(`Recipe discovered: ${M.RECIPE_BY_ID[e.recipe]?.name ?? "a new dish"}.`); save(); audio.tone(880); }
  if (e.type === "ingredient-delivery") { notice("Ingredients delivered to your pantry."); save(); audio.tone(660); }
  if (e.type === "cooking-complete") { notice("A fresh batch is ready for the shop."); save(); }
  if (e.type === "sale") {
    scene.sale(e.amount, e.route);
    audio.tone(700);
    if (e.route === "stall") scene.say(VISITOR_LINES[e.visitor % VISITOR_LINES.length]);
  }
  if (e.type === "order") {
    const o = e.order;
    notice(`${M.orderFrom(o)} would like ${o.count} ${M.VARIETIES[o.variety].name} within ${Math.round(M.ORDERS.time / 60)} minutes · ${money(o.pay)}. Send them from the stock panel.`);
    if (state.orders.serial === 1) say("shane", `${M.orderFrom(o)} has sent an order up! Tap the crate at the top, and send the pumpkins before the time runs out. They pay better than the stall.`);
  }
  if (e.type === "order-missed") notice(`${M.orderFrom(e.order)}’s order ran out of time. They’ll ask for a little less next time.`);
  if (e.type === "wanted") {
    const name = M.VARIETIES[e.variety].name, more = Math.round(M.WANTED.bonus * 100);
    notice(`Wanted now: ${name} pumpkins · up to ${more}% more for ${Math.round(M.WANTED.seconds / 60)} minutes`);
    if (state.wanted.serial === 1) say("natalie", `The village has gone mad for ${name} pumpkins! Keep some in the barn and they’ll pay up to ${more}% more for them.`);
  }
  if (e.type === "chat-line") scene.chatLine(e);
  if (e.type === "missed" && e.reason !== "shop") scene.say(e.reason === "budget" ? "A smaller pumpkin next time." : "Back after harvest!");
  if (e.type === "harvest") { scene.harvested(e.plot, e.count); scene.sendTo(e.plot); }
  if (e.type === "plant") scene.sendTo(e.plot);
  if (e.type === "memory") {
    const m = M.MEMORIES.find((x) => x.id === e.id);
    notice("New scrapbook memory: " + m.title);
    // An older save can meet several new memories at once: chime only once.
    if (performance.now() - memoryChimeAt > 800) { audio.tone(880); memoryChimeAt = performance.now(); }
    if (e.id === "first") say("shane", "Five pumpkins in! Told you this spade was a solid investment.");
    if (e.id === "moon") say("natalie", "Our first Moonlight plot! Its next pumpkins will glow pale and pretty, and sell for £24 each.");
    if (e.id === "empire") say("shane", "A thousand coins. From a handful of seeds. Look at what we made together.");
  }
}

function pickPlot(i) {
  const n = M.harvest(state, i);
  if (!n) { if (state.plots[i]?.phase === "ready" && M.barnBlocked(state)) notice(state.upgrades.cart ? "Barn full and the market cart is loaded. It sets off again within the minute." : "Barn full. Ripe pumpkins are safe—sell stock, add storage or buy a market cart in Build."); return 0; }
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
  const boost = Math.round(M.streakPathBoost(state) * 100), held = M.visitorBonus(state) - M.streakPathBoost(state) > 0.005;
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
  if (i >= M.openPlots(state)) return notice("Choose Manage, then Farm upgrades, to clear more plots.");
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
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => (b.hidden = true), 2000);
}
function say(who, text) {
  const d = $("dialogue"), url = scene.portrait(state.wardrobe.equipped[who]);
  d.querySelector(".dialogue-portrait").innerHTML = url ? `<img src="${url}" alt="">` : "";
  d.querySelector(".dialogue-name").innerHTML = `${PEOPLE[who][0]} <span>${PEOPLE[who][1]}</span>`;
  d.querySelector(".dialogue-text").textContent = "“" + text + "”";
  d.hidden = false;
  clearTimeout(sayTimer); sayTimer = setTimeout(() => (d.hidden = true), 3200);
}
$("dialogue").onclick = () => ($("dialogue").hidden = true);

let noticeTimer;
// Once a session, when litter first starts keeping guests away: who can help.
let litterHinted = false;
function litterHint() {
  if (litterHinted || state.paused || openTab || intro.active) return;
  const c = M.cleanlinessStatus(state);
  if (c.janitor || c.penalty < 5) return;
  litterHinted = true;
  notice(M.patchLevel(state).level >= c.hireLevel ? `Litter is putting guests off. Hettie the caretaker sweeps for £${c.hireCost}: More, then Home & hands-on play.` : "Litter is putting guests off. Pick it up in Play, or hire Hettie from level " + c.hireLevel + ".");
}
function notice(text) {
  $("notice").textContent = text; $("notice").classList.add("show");
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $("notice").classList.remove("show"), Math.max(2, text.length / 18) * 1000);
}

// Walking through a doorway, the garden gate, the hedge arch, the stairs or a
// ladder in play mode (play-ways.js): the world blurs, the next place comes in
// behind the blur, and the owner walks out of the far side. False if refused.
const placeVeil = createPlaceVeil($("world"));
function passThrough(way) {
  if (!way || !scene.player?.enabled || openTab || celebration.active || intro.active || placeVeil.busy) return false;
  if (way.to.startsWith("room:") && !M.roomUnlocked(state, way.to.slice(5))) return false;
  scene.player.hold(way);
  // arrive() always runs: if the place could not change, it only lets go.
  return placeVeil.pass(() => {
    try { if (way.to === "farm") leavePlace(); else if (way.to === "estate") enterEstate(); else enterRoom(way.to.slice(5)); }
    finally { scene.player.arrive(way.arrive); }
  });
}
const wayOut = (test) => scene.player.ways().find(test);

// A garden bed (rules/garden-crops.js): plant it, water it or pick it,
// whichever it needs. Playing, the owner does it with the same gestures as
// at the patch.
function tendGardenBed(instance, playing = false) {
  const act = M.gardenBedAction(state, instance), p = state.estate.placed.find((q) => q.instance === instance);
  if (!act || !p || state.paused) return false;
  const crop = M.gardenCropOf(p.id), at = [p.x, 1.6, p.z];
  if (act.kind === "wait") { const left = Math.ceil(p.crop.remaining); notice(`The ${crop.name} need ${left < 90 ? left + " more seconds" : Math.ceil(left / 60) + " more minutes"}.`); return false; }
  if (playing) scene.player.act(act.kind, .8, { x: p.x, z: p.z });
  let ok = false;
  if (act.kind === "plant") { ok = M.plantGardenBed(state, instance); if (ok) { scene.floatHere("Planted", ...at); chime(330, 494); } }
  else if (act.kind === "water") { ok = M.waterGardenBed(state, instance); if (ok) { scene.floatHere("Watered", ...at); chime(587, 784); } }
  else {
    const r = M.pickGardenBed(state, instance); ok = !!r;
    if (r) {
      scene.floatHere(`+${r.amount} ${crop.name}`, ...at, "coin"); chime(523, 659);
      notice(r.sold ? `${r.pantry ? `${r.pantry} ${crop.name} to the pantry, and ` : ""}${r.sold} sold at the market for ${money(r.coins)}.` : `${r.pantry} ${crop.name} to the pantry.`);
    }
  }
  if (ok) { save(); scene.refreshHouseEstate(); render(); }
  return ok;
}

// The carving bench's close-up (carving-view.js, ui/carving-ui.js): opened
// from a bench in the garden, it goes back to wherever it was opened from.
let carvingUI = null, carvingFrom = null;
function openCarving() {
  if (state.paused || carvingUI?.isOpen) return false;
  if (!M.carvingBenches(state)) { notice("Place a carving bench in the garden to carve pumpkins."); return false; }
  carvingFrom = scene.place?.kind ?? null;
  lifeActivity?.cancel(); closeSheet(); guestCard.clear(); home.tools.select(null); estateTools.cancel();
  scene.enter("carving"); document.body.classList.add("carving-open"); carvingUI.open(); renderPlace();
  return true;
}
function closeCarving() {
  if (!carvingUI?.isOpen) return;
  // A pumpkin not yet cut goes back to the barn; a started one waits on the bench.
  if (state.carving.current && !state.carving.current.cut.length) M.cancelCarving(state);
  carvingUI.close(); document.body.classList.remove("carving-open");
  if (carvingFrom === "estate") enterEstate(); else if (carvingFrom === "room") enterRoom(state.house.activeRoom); else leavePlace();
  save(); render();
}

// Stepping inside the cottage or the shop, and back out.
let interiorFromEstate = false;
function enterRoom(id) {
  lifeActivity?.cancel();
  if (mazeUI.active) stopMazePresentation(); if (hayrideUI.active) stopHayridePresentation();
  if (!M.roomUnlocked(state, id)) id = "parlour";
  if (scene.place?.kind === "estate") interiorFromEstate = true; else if (scene.place?.kind !== "room") interiorFromEstate = false;
  foyerTools.cancel(); hollowContext.close(); hayrideContext.close(); estateTools.cancel(); guestCard.clear(); home.tools.select(null); state.house.activeRoom = id; scene.enter("room", id); M.recordHomeActivity?.(state,"visit"); save(); renderPlace();
}
function enterEstate() { if (mazeUI.active) stopMazePresentation(); if (hayrideUI.active) stopHayridePresentation(); foyerTools.cancel(); hollowContext.close(); hayrideContext.close(); estateTools.cancel(); guestCard.clear(); home.tools.select(null); scene.enter("estate"); closeSheet(); renderPlace(); }
function enterFoyer() { if (mazeUI.active) stopMazePresentation(); if (hayrideUI.active) stopHayridePresentation(); if (!M.hollowReady(state)) { openHollowSheet(); return false; } foyerTools.cancel(); estateTools.cancel(); hollowContext.close(); hayrideContext.close(); guestCard.clear(); home.tools.select(null); interiorFromEstate = false; scene.enter("foyer"); closeSheet(); renderPlace(); return true; }
// The owner’s walkthrough is a transient camera experience, never a paid visit.
function openMazeRide() {
  if (mazeUI.active) return true;
  if (hayrideUI.active) exitHayrideRide();
  const config = buildMazeRideConfig(state);
  if (!config) { openHollowSheet(); return false; }
  foyerTools.cancel(); estateTools.cancel(); home.tools.select(null); hollowContext.close(); hayrideContext.close(); guestCard.clear(); closeSheet();
  document.body.classList.add("maze-experience");
  scene.enter("maze", { config, options: { ...mazeUI.options, paused: true } });
  mazeUI.open(config); audio.setSceneGain(.08); renderPlace(); return true;
}
function startMazeRide(options = mazeUI.options) {
  if (scene.place?.kind !== "maze" || !mazeUI.active) return false;
  scene.setMazeOptions(options); mazeAudio.start(options); scene.pauseMazeRide(false); mazeUI.update(scene.mazeStatus); return true;
}
function pauseMazeRide(on = true) {
  if (scene.place?.kind !== "maze") return false;
  scene.pauseMazeRide(on); mazeAudio.pause(on); mazeUI.update(scene.mazeStatus); return true;
}
function replayMazeRide(options = mazeUI.options) {
  if (scene.place?.kind !== "maze") return false;
  mazeAudio.start(options); scene.restartMazeRide(options); mazeUI.update(scene.mazeStatus); return true;
}
function stopMazePresentation() { mazeUI.close(); mazeAudio.stop(); audio.setSceneGain(1); document.body.classList.remove("maze-experience"); }
function exitMazeRide() {
  if (!mazeUI.active && scene.place?.kind !== "maze") return false;
  stopMazePresentation(); scene.enter("foyer"); renderPlace(); return true;
}
function openHollowSheet(tab = "manage") { sheets.hollow.setTab(tab); openSheet("hollow"); }
function openFoyerSheet(tab = "catalogue") { sheets.foyer.setTab(tab); openSheet("foyer"); }
function openHayrideSheet(tab = "overview") { sheets.hayride.setTab?.(tab); openSheet("hayride"); }
function openShopSheet(tab = "shop") { sheets.shop.setTab(tab); openSheet("shop"); }
function openCocoaSheet() { sheets.festival.setTab("cocoa"); openSheet("festival"); }
function openCookingSheet(tab = "recipes", station = null) { sheets.cooking.setTab(tab); if (station) sheets.cooking.setStation?.(station); openSheet("cooking"); }
function enterKitchen({ tab = "recipes", noOpen = false } = {}) {
  if (!M.homeKitchenOpen(state)) { notice("Expand the house to unlock its kitchen."); sheets.home.setTab("house"); openSheet("home"); return false; }
  if (scene.place?.kind !== "room" || scene.place.id !== "kitchen") enterRoom("kitchen");
  if (!noOpen) openCookingSheet(tab, "home");
  return true;
}
function focusHayride() { if (scene.place) leavePlace(); closeSheet(); scene.focusHayride(); }
// The free owner camera has no seat, receipt or visitor in the live convoy.
function openHayrideRide() {
  if (hayrideUI.active) return true;
  if (!M.hayrideReady(state)) { openHayrideSheet(); return false; }
  if (mazeUI.active) exitMazeRide();
  foyerTools.cancel(); estateTools.cancel(); home.tools.select(null); hollowContext.close(); hayrideContext.close(); guestCard.clear(); closeSheet();
  scene.enter("hayride", { ...hayrideUI.options, paused: true });
  hayrideUI.open(M.hayrideConfig(state)); audio.setSceneGain(.12); renderPlace(); return true;
}
function startHayrideRide(options = hayrideUI.options) { if (scene.place?.kind !== "hayride" || !hayrideUI.active) return false; scene.setHayrideOptions(options); hayrideAudio.start(options); scene.pauseHayrideRide(false); hayrideUI.update(scene.hayrideRideStatus); return true; }
function pauseHayrideRide(on = true) { if (scene.place?.kind !== "hayride") return false; scene.pauseHayrideRide(on); hayrideAudio.pause(on); hayrideUI.update(scene.hayrideRideStatus); return true; }
function replayHayrideRide(options = hayrideUI.options) { if (scene.place?.kind !== "hayride") return false; hayrideAudio.start(options); scene.restartHayrideRide(options); hayrideUI.update(scene.hayrideRideStatus); return true; }
function stopHayridePresentation() { hayrideUI.close(); hayrideAudio.stop(); audio.setSceneGain(1); }
function exitHayrideRide() { if (!hayrideUI.active && scene.place?.kind !== "hayride") return false; stopHayridePresentation(); scene.leavePlace(); renderPlace(); return true; }
// Up or down the stairs, or through a doorway, to the next room.
function goTo(id) {
  const name = M.houseRooms.find((r) => r.id === id)?.name.toLowerCase() ?? id, layout = M.roomLayout(state, scene.place?.id);
  const way = layout?.stairs.find((st) => st.up === id) ? "Up to" : layout?.stairs.find((st) => st.down === id) ? "Down to" : "Through to";
  home.tools.select(null); enterRoom(id); notice(`${way} the ${name}.`); audio.tone(440);
  if (openTab === "home") draw();
}
function enterShop() { if (mazeUI.active) stopMazePresentation(); if (hayrideUI.active) stopHayridePresentation(); foyerTools.cancel(); hollowContext.close(); hayrideContext.close(); estateTools.cancel(); guestCard.clear(); home.tools.select(null); interiorFromEstate = false; scene.enter("shop"); renderPlace(); }
function leavePlace() { lifeActivity?.cancel(); if (mazeUI.active) stopMazePresentation(); if (hayrideUI.active) stopHayridePresentation(); foyerTools.cancel(); hollowContext.close(); hayrideContext.close(); estateTools.cancel(); guestCard.clear(); home.tools.select(null); interiorFromEstate = false; scene.leavePlace(); renderPlace(); }
function openHome() { if (scene.place?.kind === "room") { sheets.home.setTab("rooms"); openSheet("home"); } else if (scene.place?.kind === "estate") openEstateSheet("grounds"); else enterEstate(); }
function openEstateSheet(tab = "garden") { sheets.estate.setTab(tab); openSheet("estate"); }
function upgradeEstateHouse() {
  if (state.paused) return false;
  const grown = M.upgradeHouse(state); if (!grown) return false;
  scene.refreshHouseEstate(); scene.refreshRoom(); save(); audio.tone(880);
  notice(`${M.HOUSE_LEVELS[state.house.level].name} is ready.${grown.moved.length || grown.stored.length ? " Interior pieces were safely moved or stored to clear the new stairs." : " Your garden stays just as you placed it."}`);
  return true;
}
function renderPlace() {
  const p = scene.place, inside = !!p;
  document.body.classList.toggle("inside-place", inside);
  document.body.classList.toggle("house-estate", p?.kind === "estate");
  $("place-bar").hidden = !inside; $("actions").hidden = inside; $("goal").hidden = inside;
  if (inside) $("place-title").textContent = p.kind === "carving" ? "The carving bench" : p.kind === "hayride" ? "The Hollow Hayride" : p.kind === "estate" ? "Home & Garden" : p.kind === "maze" ? "The Hollow House · Walkthrough" : p.kind === "foyer" ? "The Hollow House · Foyer" : p.kind === "shop" ? "The Honest Pumpkin" : "The " + M.houseRooms.find((r) => r.id === p.id).name;
  $("place-back").setAttribute("aria-label", p?.kind === "room" && interiorFromEstate ? "Back to the garden" : "Back to the patch");
  $("place-back").querySelector(".place-back-text").textContent = p?.kind === "room" && interiorFromEstate ? "Back to garden" : "Back to farm";
  $("place-rooms").disabled = p?.kind === "shop";
  $("place-rooms").setAttribute("aria-label", p?.kind === "estate" ? "Manage the grounds" : p?.kind === "shop" ? "The Honest Pumpkin" : "Choose a room");
  $("place-cook").hidden = !(p?.kind === "room" && p.id === "kitchen");
  $("place-decorate").hidden = !["room", "foyer"].includes(p?.kind);
  home.tools.render();
  markTab();
}
$("place-back").onclick = () => { if (scene.place?.kind === "room" && interiorFromEstate) enterEstate(); else leavePlace(); closeSheet(); };
$("place-rooms").onclick = () => { if (scene.place?.kind === "foyer") openHollowSheet(); else if (scene.place?.kind === "estate") openEstateSheet("grounds"); else { sheets.home.setTab("rooms"); openSheet("home"); } };
$("place-cook").onclick = () => openCookingSheet(M.homeCookingAvailable(state) ? "recipes" : "equipment", "home");
$("place-decorate").onclick = () => { if (scene.place?.kind === "foyer") openFoyerSheet(); else { sheets.home.setTab("decorate"); openSheet("home"); } };

$("plant-all").onclick = plantAll;
$("harvest-all").onclick = harvestAll;
$("boost").onclick = boost;

// The HUD, actions, goal and streak, every frame (cheap: only text changes).
const text = (id, value) => { const el = $(id); if (el.textContent !== String(value)) el.textContent = value; };
function render() {
  const controlsBlocked=!!openTab || celebration.active || intro.active || upgradeMenu?.open || mazeUI.active || hayrideUI.active || state.paused || !!homeJourney?.active || !!carvingUI?.isOpen;
  playControls?.tick(controlsBlocked); homeJourney?.tick();
  if (mazeUI.active) mazeUI.update(scene.mazeStatus);
  if (hayrideUI.active) hayrideUI.update(scene.hayrideRideStatus);
  if (M.awardLevels(state).length) save();
  text("coins", money(state.coins));
  text("stock", `${M.available(state)}/${M.barnCapacity(state)}`);
  text("sold", state.sold);
  text("visitor-now", state.visitors.length + state.shop.customers.length);
  litterHint();
  const lvl = M.patchLevel(state);
  text("level-number", lvl.level);
  $("open-levels").setAttribute("aria-label", `Level ${lvl.level}: ${lvl.name}. ${lvl.next ? Math.round(lvl.progress * 100) + "% to level " + lvl.next.level : "Maximum level"}. View rewards`);
  $("open-levels").style.setProperty("--progress", (lvl.progress * 100).toFixed(1) + "%");
  celebration.tick(mazeUI.active || hayrideUI.active || !!openTab || !!home.tools.selected || state.paused);
  stockPopover.tick(mazeUI.active || hayrideUI.active || celebration.active || !!openTab || estateTools.active || foyerTools.active || !!home.tools.selected);
  guestCard.tick(mazeUI.active || hayrideUI.active || !!openTab || celebration.active || estateTools.active || foyerTools.active || !!home.tools.selected);
  if (scene.place) chatCard.clear();
  chatCard.tick(mazeUI.active || hayrideUI.active || !!openTab || celebration.active || estateTools.active || foyerTools.active || !!home.tools.selected);
  estateTools.tick(!!openTab || celebration.active);
  foyerTools.tick(!!openTab || celebration.active);
  hollowContext.tick(mazeUI.active || hayrideUI.active || !!openTab || celebration.active);
  hayrideContext.tick(mazeUI.active || hayrideUI.active || !!scene.place || !!openTab || celebration.active);
  npcRewards.tick(!!playControls?.active || mazeUI.active || hayrideUI.active || !!scene.place || !!openTab || !!home.tools.selected || celebration.active || state.paused || document.hidden);
  $("level-bar").style.width = (lvl.progress * 100).toFixed(1) + "%";
  $("hud-level").title = `Level ${lvl.level}: ${lvl.name}. ${lvl.tagline}.`;
  text("level-name", lvl.name);
  const open = state.plots.slice(0, M.openPlots(state));
  const empty = open.filter((p) => p.phase === "empty").length, ripe = open.filter((p) => p.phase === "ready").length, full = M.barnBlocked(state);
  $("plant-all").hidden = !empty; text("plant-count", empty);
  // A full barn stacks its note under the label (style.css), so Harvest still fits beside Boost on a phone.
  $("harvest-all").hidden = !ripe; text("harvest-count", full ? "Barn full" : ripe); $("harvest-all").classList.toggle("barn-full", full);
  $("harvest-all").setAttribute("aria-label", full ? "Barn full: sell pumpkins, add storage or buy a market cart" : `Harvest ${ripe} ready plots`);
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

// The new-game introduction, which Settings can play again. The farm holds
// still while it plays, and the patch counts it as seen once it ends.
let pausedBeforeIntro = false;
const intro = createIntro({
  people: PEOPLE,
  portrait: (who) => scene.portrait(who === "skyla" ? "skyla" : state.wardrobe.equipped[who]),
  pumpkin: (v) => thumbs[v],
  hold: () => { pausedBeforeIntro = state.paused; state.paused = true; },
  release: () => { state.paused = pausedBeforeIntro; state.introSeen = true; save(); render(); },
  onOpen: () => { closeSheet(); home.tools.select(null); $("dialogue").hidden = true; $("bubble").hidden = true; },
});

// The menus. Each sheet module gets this small toolkit.
const ui = {
  get state() { return state; }, scene, prefs, savePrefs, audio, save,
  get playControls(){return playControls;}, followHomeGoal, homeTab:t=>sheets.home.setTab(t),
  notice, say, tone: (f) => audio.tone(f),
  draw: () => draw(), openSheet: (tab) => openSheet(tab), closeSheet: () => closeSheet(),
  thumb: (v) => (thumbs[v] ? `<span class="thumb"><img src="${thumbs[v]}" alt=""></span>` : `<span class="thumb"><span class="seed-icon"></span></span>`),
  portrait: (id) => scene.portrait(id),
  intro,
  enterRoom, enterShop, enterEstate, enterFoyer, leavePlace, openEstateSheet, upgradeEstateHouse, openHollowSheet, openFoyerSheet, openMazeRide, openHayrideSheet, focusHayride, openHayrideRide, openCookingSheet, openShopSheet, openCocoaSheet, enterKitchen, showCookingAnimation(job,station) { showFirstCooking(state,job.recipe,station,save); }, openKitchenDecorate() { sheets.home.setTab("decorate"); openSheet("home"); },
  get estateTools() { return estateTools; },
  get foyerTools() { return foyerTools; }, get hollowContext() { return hollowContext; },
  read: (id) => collection.read(id),
  replaceState(next) { localStorage.setItem(SAVE_KEY, JSON.stringify(M.saveData(next))); state = next; location.reload(); },
};
const home = homeSheets(ui), collection = collectionSheets(ui);
const sheets = { ...farmSheets(ui), home: home.home, shelf: home.shelf, ...collection, ...festivalMeadowSheet(ui), ...customerCareSheet(ui), ...estateSheet(ui), ...hollowSheets(ui), ...hayrideSheets(ui), ...cookingSheets(ui), ...moreSheet(ui), ...homeLifeSheet(ui), ...settingsSheet(ui) };
const estateTools = createEstateControls(ui);
const foyerTools = createFoyerControls(ui), hollowContext = createHollowContext(ui);
const hayrideContext = createHayrideContext(ui);

let openTab = null, lastBody = "", sheetReturnFocus = null;
const menuMemory = createMenuMemory($("sheet-body"));
const celebration = createLevelCelebration({ state: () => state, audio, save, openRewards: () => { sheets.journal.setTab("levels"); openSheet("journal"); } });
const npcRewards = createNpcRewards({ state: () => state, portrait: (kind, id) => scene.portrait(M.favourFace(M.FAVOURS.find((f) => f.id === id) ?? { kind })), save, tone: f => audio.tone(f), notice });
const guestCard = createGuestCard({ state: () => state, portrait: id => scene.portrait(id), onListen: spot => chatCard.open(spot) });
const chatCard = createChatCard({ state: () => state, portrait: id => scene.portrait(id), onGuest: id => { chatCard.clear(); guestCard.open(id); } });
const stockPopover = createStockPopover({ state: () => state, onOpen() { closeSheet(); hollowContext.close(); hayrideContext.close(); guestCard.clear(); chatCard.clear(); }, onManagePumpkins() { sheets.shop.setTab("farm"); openSheet("shop"); }, onManageCocoa() { sheets.festival.setTab("cocoa"); openSheet("festival"); }, onSendOrder(id) {
  const o = state.orders.list.find((x) => x.id === id), pay = o && M.fillOrder(state, id);
  if (!pay) return;
  audio.tone(880); notice(`Sent ${o.count} ${M.VARIETIES[o.variety].name} to ${M.orderFrom(o)} · ${money(pay)}`); scene.sale(pay, "order"); save(); draw();
} });
$("open-levels").onclick = () => celebration.preview();
$("fullscreen").onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.fullscreenEnabled === false) notice("Fullscreen is unavailable here. Try opening this HTML in Chrome or Safari."); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else notice("For fullscreen, add the game to your home screen from the browser menu."); }
  catch { notice("Fullscreen is unavailable here. Try opening this HTML in Chrome or Safari."); }
};
document.addEventListener("fullscreenchange", () => { const on = !!document.fullscreenElement; if (on) requestAnimationFrame(() => scene.fitView()); $("fullscreen").setAttribute("aria-pressed", String(on)); $("fullscreen").setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen"); });
const TABS = { homelife:"more", cooking: "shop", shop: "shop", festival: "shop", care: "shop", estate: "home", home: "home", shelf: "home", wardrobe: "wardrobe", journal: "more", reader: "more", more: "more", settings: "more", attractions: "attractions", hollow: "attractions", foyer: "attractions", hayride: "attractions" };
function draw() {
  if(menuMemory.dragging)return;
  const sheet = sheets[openTab]; if (!sheet) return;
  const html = sheet.body();
  if (html === lastBody) return;                                                 // only redraw when something changed
  lastBody = html;
  const body = $("sheet-body"), restoreFocus = menuMemory.captureFocus(); menuMemory.before();
  body.innerHTML = html; markPurchaseSurfaces(body); sheet.bind(body); menuMemory.after(openTab); restoreFocus();
  const title = typeof sheet.title === "function" ? sheet.title() : sheet.title;
  text("sheet-title", title);
}
function openSheet(tab) {
  lifeActivity?.cancel();
  if (hayrideUI.active) exitHayrideRide();
  if (mazeUI.active) exitMazeRide();
  if(!openTab)sheetReturnFocus=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;
  menuMemory.leave();
  stockPopover.close();
  if (foyerTools.active) foyerTools.cancel();
  hollowContext.close(); hayrideContext.close();
  if (estateTools.active) estateTools.cancel();
  if (home.tools.selected) home.tools.select(null);
  document.body.classList.add("menu-open");
  $("sheet").dataset.section = tab;
  openTab = tab; lastBody = "";
  const sheet = sheets[tab];
  if(tab === "wardrobe" && scene.place?.kind === "room") { M.recordHomeActivity?.(state,"wardrobe"); save(); }
  sheet.opened?.();
  $("sheet-eyebrow").textContent = sheet.eyebrow;
  $("sheet").hidden = false; $("sheet-body").scrollTop = 0; draw();
  markTab();
  $("sheet-close").focus({ preventScroll: true });
}
function closeSheet() { const wasOpen=!!openTab;menuMemory.leave();document.body.classList.remove("menu-open"); openTab = null; $("sheet").hidden = true; markTab();if(wasOpen&&sheetReturnFocus?.isConnected&&!sheetReturnFocus.closest("#sheet")&&sheetReturnFocus.getClientRects().length)sheetReturnFocus.focus({preventScroll:true});sheetReturnFocus=null; }
function markTab() {
  const active = openTab ? TABS[openTab] : ["foyer", "maze", "hayride"].includes(scene.place?.kind) ? "attractions" : ["room", "estate"].includes(scene.place?.kind) ? "home" : scene.place?.kind === "shop" ? "shop" : "patch";
  document.querySelectorAll(".tab").forEach((t) => { const on = t.dataset.tab === active; t.classList.toggle("active", on); t.setAttribute("aria-pressed", String(on)); });
}
// Manage opens the farm and business directory.
const upgradeMenu = createUpgradeMenu({ button: document.querySelector('.tab[data-tab="shop"]'), choose(section) { if(section === "homelife") openSheet("homelife"); else if (section === "cooking") openCookingSheet(); else if(section === "cocoa") openCocoaSheet(); else { sheets.shop.setTab(section); openSheet("shop"); } } });
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
  const tab = t.dataset.tab;
  if (tab === "shop") { upgradeMenu.toggle(); return; }
  upgradeMenu.close();
  if (tab === "patch") { leavePlace(); closeSheet(); scene.fitView(); }
  else if (tab === "home") openHome();
  else openSheet(tab);
}));
$("open-settings").onclick = () => openSheet("settings");
$("sheet-close").onclick = closeSheet;

document.addEventListener("keydown", (e) => {
  // The carving bench has the keyboard to itself while it is open (ui/carving-ui.js).
  if (intro.active || mazeUI.active || hayrideUI.active || homeJourney?.active || carvingUI?.isOpen) return;
  if(playControls?.handleKey(e))return;
  if (e.key !== "Escape" && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (celebration.active) return;
  const tools = home.tools;
  if (e.key === "Escape") { guestCard.clear(); hollowContext.close(); hayrideContext.close(); if (foyerTools.active) foyerTools.cancel(); else if (estateTools.active) estateTools.cancel(); else if (tools.selected) tools.select(null); else closeSheet(); return; }
  if (upgradeMenu.open) return;
  if (foyerTools.active && scene.place?.kind === "foyer") {
    if (e.key.toLowerCase() === "r") { e.preventDefault(); foyerTools.rotate(e.shiftKey ? -15 : 15); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); foyerTools.undo(); return; }
  }
  if (estateTools.active && scene.place?.kind === "estate") {
    const nudge = { ArrowLeft: [-.5, 0], ArrowRight: [.5, 0], ArrowUp: [0, -.5], ArrowDown: [0, .5] }[e.key];
    if (nudge) { e.preventDefault(); estateTools.nudge(...nudge); return; }
    if (e.key.toLowerCase() === "r") { e.preventDefault(); estateTools.rotate(e.shiftKey ? -15 : 15); return; }
  }
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

// The controller layer uses the same purchases and farming rules as taps.
// Timed crop work commits here once, using the same stock and streak rules as taps.
function commitPlayerWork(kind,t){
  const at=t.type==='plot'?PLOTS[t.index]:t;
  let ok=false;if(kind==='plant')ok=M.plant(state,t.index);else if(kind==='harvest')ok=!!pickPlot(t.index);else if(kind==='water')ok=waterPlot(state,t.index);else if(kind==='clean')ok=M.cleanLitter(state,t.id);
  if(ok){M.recordHomeActivity?.(state,kind);if(at)scene.actionBurst(kind,at.x,at.z);if(kind!=='harvest')chime(...({plant:[330,494],water:[587,784],clean:[784,1047]})[kind]);save();}
  return !!ok;
}
// Two quick notes, rising: the sound of a job done.
function chime(a,b){audio.tone(a);setTimeout(()=>audio.tone(b),75);}
// Play mode's feel: a buzz on touch, a rumble on a pad, a note for choices.
function playFeel(kind,info={}){
  if(kind==='select')audio.tone(700);
  if(prefs.haptics===false)return;
  const strength={done:14,open:8,select:6,tick:3}[kind]??0;if(!strength)return;
  const pad=info.pad??Array.from(navigator.getGamepads?.()??[]).find(g=>g?.connected);
  try{if(pad?.vibrationActuator)pad.vibrationActuator.playEffect?.('dual-rumble',{duration:strength*4,strongMagnitude:kind==='done'?.25:.05,weakMagnitude:kind==='done'?.5:.2});else navigator.vibrate?.(strength);}catch{}
}
function interactAsPlayer(tool='hand',options={}) {
  if(['release','cancel'].includes(options.phase))return lifeActivity?.handle(tool,options);
  const p=scene.player?.state(),t=p?.target;if(!p?.enabled||state.paused||openTab)return false;
  if(p.pose){scene.player.stand();return true;}
  if(p.available===false){if(p.place==='estate')enterRoom(state.house.activeRoom);else leavePlace();return true;}
  if(!t)return false;
  if(['plot','litter'].includes(t.type)){
    const ok=lifeActivity.handle(tool,options);
    if(!ok&&t.type==='plot'&&['hand','water'].includes(tool)&&wateringStatus(state,t.index).seconds)notice('This crop has had a drink. Try the next one.');
    else if(!ok&&t.type==='plot'&&state.plots[t.index].phase==='ready'&&M.barnBlocked(state))notice('Barn full. Sell stock or expand storage.');
    return ok;
  }
  if(options.phase && !['tap','start'].includes(options.phase))return false;
  if(tool!=='hand'){notice('Choose Interact for doors, cooking and furniture.');return false;}
  if(t.type==='pumpkin'){boost();scene.player.act('harvest',.7);}
  else if(t.type==='home'){const way=wayOut(w=>w.id==='arch');if(way)passThrough(way);else enterEstate();}
  else if(t.type==='shop'){if(state.shop.unlocked)enterShop();else openShopSheet('shop');}
  else if(t.type==='cooking')openCookingSheet('recipes',t.station??'truck');
  else if(t.type==='wardrobe'){M.recordHomeActivity(state,'wardrobe');save();openSheet('wardrobe');}
  else if(t.type==='sit')scene.player.rest('sit',t);
  else if(t.type==='read'){scene.player.rest('read',t);if(t.book)collection.read(t.book);else {sheets.journal.setTab('library');openSheet('journal');}}
  else if(t.type==='pet')scene.player.rest('pet',t);
  else if(t.type==='bed')tendGardenBed(t.instance,true);
  else if(t.type==='carve')openCarving();
  else if(t.type==='go'){const way=wayOut(w=>t.way?w.id===t.way:w.to==='room:'+t.to);if(way)passThrough(way);else goTo(t.to);}
  else if(t.type==='exit')passThrough(wayOut(w=>w.id==='out')??leaveHouse(state));
  else if(t.type==='piece')home.tools.select(t.instance);
  return true;
}
function followHomeGoal(){
  const g=M.homeGoal?.(state);if(!g){openSheet('homelife');return;}
  const a=g.action;if(a==='upgrade-house'){enterRoom('parlour');sheets.home.setTab('house');openSheet('home');}
  else if(a==='wardrobe'){enterRoom('parlour');M.recordHomeActivity?.(state,'wardrobe');openSheet('wardrobe');}
  else if(a==='cook'||a==='equipment'){enterKitchen({tab:a==='equipment'?'equipment':'recipes'});}
  else if(a==='recipes'){openCookingSheet('recipes');}
  else if(a==='home'){enterRoom('parlour');closeSheet();}
  else {enterRoom(g.room??state.house.activeRoom);sheets.home.setTab('decorate');openSheet('home');}
  save();
}
lifeActivity=createLifeActivity({state:()=>state,player:scene.player,commit:commitPlayerWork,notice,blocked:()=>!!openTab||intro.active||celebration.active||!!homeJourney?.active||!!playControls?.radial||!!home.tools.selected||upgradeMenu.open});
carvingUI=createCarvingUI({ state:()=>state, view:scene.carving, feel:playFeel, actions:{
  start:(v)=>{const ok=!!M.startCarving(state,v);if(ok){save();scene.carving.refresh();render();}else notice("Pick that kind of pumpkin first.");return ok;},
  stencil:(id)=>{const ok=M.chooseStencil(state,id);if(ok){save();scene.carving.refresh();}return ok;},
  decor:(g,id)=>{const ok=M.setCarvingDecor(state,g,id);if(ok){save();scene.carving.refresh();}return ok;},
  done:()=>M.carvingDone(state),
  value:()=>{const c=state.carving.current;return c?M.lanternValue({variety:c.variety,stencil:c.stencil,decor:c.decor}):0;},
  finish:(how)=>{const l=M.finishCarving(state,how);if(l){chime(523,784);if(how==="sell")notice(`Sold your lantern at the village fair for ${money(l.value)}.`);else notice("Your lantern glows on the doorstep.");save();render();scene.refreshHouseEstate();}return l;},
  close:closeCarving,
}});
// B shuts the carving bench through back(), after this tick has noted B as held: closing renders, and a render ticks the pad again.
playControls=createPlayControls({feel:playFeel,getActivity:()=>lifeActivity.state(),scene,state:()=>state,tools:home.tools,action:interactAsPlayer,openHome,openManage:()=>{closeSheet();upgradeMenu.toggle();},editNearby(){const t=scene.player.state().target;scene.player.stand();if(t?.instance)home.tools.select(t.instance);else {notice("Walk close to a piece of furniture to move it.");}},openWardrobe(){if(scene.place?.kind==='room')M.recordHomeActivity?.(state,'wardrobe');save();openSheet('wardrobe');},decorate(){scene.player.stand();if(scene.place?.kind!=='room')enterRoom(state.house.activeRoom);sheets.home.setTab('decorate');openSheet('home');},portrait:who=>scene.portrait(state.wardrobe.equipped[who]),notice,back(){if(carvingUI?.isOpen){queueMicrotask(closeCarving);return;}if(lifeActivity.state().active){lifeActivity.cancel();return;}if(intro.active)intro.skip();else if(homeJourney?.active)homeJourney.close();else if(celebration.active)document.querySelector(".level-continue")?.click();else if(upgradeMenu.open)upgradeMenu.close();else if(openTab)closeSheet();else if(home.tools.selected)home.tools.act("done");else if(scene.player.state().pose)scene.player.stand();else if(scene.place)leavePlace();else scene.player.setEnabled(false);}});
homeJourney=createHomeJourney({state:()=>state,blocked:()=>!!openTab||celebration.active||intro.active||mazeUI.active||hayrideUI.active||!!home.tools.selected||!!playControls.radial||state.paused,follow:followHomeGoal,open:()=>openSheet('homelife')});
scene.setRenderQuality(prefs.renderQuality); scene.setBloom(prefs.glow); scene.setAmbience({ mist: prefs.mist, lake: prefs.lakeLights }); if (!prefs.shadows) scene.setShadows(false); scene.setVoxelCharacters(prefs.voxelCharacters);
render(); renderPlace();
// For the smoke test and screenshots: `advance` runs the rules forward, since a
// software-rendered browser only manages a few frames a second.
const advance = (seconds) => { for (let t = 0; t < seconds; t += 0.1) for (const e of M.update(state, 0.1)) handle(e); render(); };
const mazeDiagnostics = {
  open: openMazeRide, start: startMazeRide, close: exitMazeRide, pause: pauseMazeRide, restart: replayMazeRide,
  advance(seconds) { const status = scene.advanceMazeRide(seconds); mazeUI.update(status); return { ...status, audio: mazeAudio.status }; },
  get config() { return scene.mazeConfig; }, get status() { return { ...scene.mazeStatus, phase: mazeUI.phase, audio: mazeAudio.status }; },
};
const hayrideDiagnostics = { open: openHayrideRide, start: startHayrideRide, pause: pauseHayrideRide, close: exitHayrideRide, restart: replayHayrideRide, advance: seconds => scene.advanceHayrideRide(seconds), get status() { return scene.hayrideRideStatus; } };
window.PumpkinVoxel = { lifeActivity, playControls, interactAsPlayer, followHomeGoal, openCarving, closeCarving, get carvingUI() { return carvingUI; }, tendGardenBed, maze: mazeDiagnostics, hayride: hayrideDiagnostics, state: () => state, scene, intro, notice, openSheet, closeSheet, enterRoom, enterShop, enterEstate, enterFoyer, leavePlace, openEstateSheet, openHollowSheet, openFoyerSheet, openHayrideSheet, focusHayride, openCookingSheet, enterKitchen, estateTools, foyerTools, tools: home.tools, audio, advance, rules: M, save };
installPremiumIcons().then(loaded=>{document.body.dataset.premiumIcons=String(loaded);});
$("place-decorate").innerHTML=premiumIcon("exterior")+"Decorate";
document.body.dataset.ready = "true";
if (M.shouldShowIntro(state)) intro.play();
