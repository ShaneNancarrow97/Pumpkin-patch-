// Mothlight Village's rules (handover 73). Pure: no DOM, no three.js, time
// only as dt. The village's state is s.village; its people, quests and decor
// are content (content/village*.js). Everything here returns events or
// results for main.js and the UI to show, and nothing is ever granted twice:
// rewards are claimed once by key (v.claims).
import { recordCompanionGather } from "./village-expansion-companions.js";
import { freshVillageExpansion, restoreVillageExpansion, updateVillageExpansion, expansionAreaInfo } from "./village-expansion.js";
import { NODES, NODE_BY_ID, MATERIALS, MATERIAL_BY_ID, DISTRICT_BY_ID, PLOTS, PLOT_BY_ID, ROADS, FIXTURES, SCENERY, VILLAGE_LEVEL, STORE_BASE, VILLAGE_BOUNDS, PLAZA, ARRIVAL, GREEN_AREA, MOOR_CORNER, NEAR_DOOR } from "../content/village.js";
import { FOLK, FOLK_BY_ID, FRIEND_XP, FRIENDSHIP, FRIEND_TITLES } from "../content/village-folk.js";
import { QUESTS, QUEST_BY_ID, STORY_OBJECTS, BLUEPRINTS, FAVOURS, FAVOUR_BY_ID, FAVOUR_WAIT, DUTIES, DUTY_BY_ID, ALMANAC_PRIZES } from "../content/village-quests.js";
import { VILLAGE_DECOR, VILLAGE_DECOR_BY_ID, STALL } from "../content/village-decor.js";
import { patchLevel } from "./levels.js";
import { VARIETIES, UPGRADES } from "./farm.js";
import { available, settleFresh } from "./stock.js";
import { decorById, ownedCopies } from "./house.js";
import { costumeById } from "./wardrobe.js";
import { visitorUpgradeCost } from "./selling.js";
import { unlockLevel } from "./unlocks.js";
import { RECIPE_BY_ID, INGREDIENT_BY_ID, COOKING } from "../content/cooking.js";
import { availableFood } from "./cooking-sales.js";
import { villageMaterialCapacity, villageGatheringYield, villageGatheringWait } from "./village-upgrades.js";
import { villageDecorBounds } from "./village-decor-geometry.js";
import { villageNodeCandidates, villageNodePosition } from "../content/village-node-sites.js";
import { villageDecorGroundClear } from "./village-navigation.js";

export { VILLAGE_LEVEL };
export * from "./village-upgrades.js";
export { villageDecorBounds } from "./village-decor-geometry.js";
const PLAYABLE = FOLK.filter((f) => f.playable).map((f) => f.id);
const count = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const time = (n) => (Number.isFinite(n) && n > 0 ? n : 0);
const level = (s) => patchLevel(s).level;

export function freshVillage() {
  return {
    expansion: freshVillageExpansion(),
    invited: false, toured: false, visits: 0, seed: 20261105, clock: 0,
    quests: {}, claims: {}, unlocks: [], effects: [], built: {}, found: {},
    friends: Object.fromEntries(PLAYABLE.map((id) => [id, { xp: 0, met: false, chatIn: 0, gifts: [], seen: [] }])),
    materials: Object.fromEntries(MATERIALS.map((m) => [m.id, 0])),
    nodes: Object.fromEntries(NODES.map((n) => [n.id, 0])), gatherCycles: {},
    stall: { rotation: 0, refreshIn: STALL.refresh, bought: {} },
    discount: 0,
    decor: { owned: {}, placed: [], next: 1 },
    favours: Object.fromEntries(PLAYABLE.map((id) => [id, { id: null, readyIn: 0, done: 0 }])),
    almanac: { page: [], pages: 0, prize: 0 },
    stats: { chats: 0, gathered: 0, gifts: 0, favours: 0, placed: 0 },
  };
}

// Anything (old saves, junk) comes back as a valid village; unknown ids are dropped.
export function restoreVillage(raw) {
  const v = freshVillage();
  if (!raw || typeof raw !== "object") return v;
  v.expansion = restoreVillageExpansion(raw.expansion);
  v.invited = raw.invited === true; v.toured = raw.toured === true; v.visits = count(raw.visits);
  v.seed = Number.isSafeInteger(raw.seed) ? raw.seed >>> 0 : v.seed; v.clock = time(raw.clock);
  for (const [id, q] of Object.entries(raw.quests ?? {})) {
    const def = QUEST_BY_ID[id]; if (!def || !q || typeof q !== "object") continue;
    v.quests[id] = { step: Math.min(def.steps.length, count(q.step)), base: Number.isFinite(q.base) ? q.base : null, done: q.done === true };
  }
  for (const [k, on] of Object.entries(raw.claims ?? {})) if (on === true && typeof k === "string" && k.length < 80) v.claims[k] = true;
  v.unlocks = [...new Set((raw.unlocks ?? []).filter((u) => typeof u === "string" && u.length < 40))];
  v.effects = [...new Set((raw.effects ?? []).filter((u) => typeof u === "string" && u.length < 40))];
  for (const b of BLUEPRINTS) if (raw.built?.[b.id] === true) v.built[b.id] = true;
  for (const o of STORY_OBJECTS) if (raw.found?.[o.id] === true) v.found[o.id] = true;
  for (const id of PLAYABLE) {
    const f = raw.friends?.[id]; if (!f || typeof f !== "object") continue;
    v.friends[id] = { xp: Math.min(FRIEND_XP.at(-1), count(f.xp)), met: f.met === true, chatIn: Math.min(FRIENDSHIP.chatWait, time(f.chatIn)),
      gifts: (Array.isArray(f.gifts) ? f.gifts : []).filter((t) => Number.isFinite(t) && t > 0).slice(-FRIENDSHIP.giftsPer).map((t) => Math.min(FRIENDSHIP.giftWait, t)),
      seen: (Array.isArray(f.seen) ? f.seen : []).filter((c) => typeof c === "string").slice(-40) };
  }
  for (const m of MATERIALS) v.materials[m.id] = Math.min(villageMaterialCapacity(v), count(raw.materials?.[m.id]));
  const cycles = raw.gatherCycles && typeof raw.gatherCycles === "object" && !Array.isArray(raw.gatherCycles) ? raw.gatherCycles : {};
  for (const n of NODES) {
    v.nodes[n.id] = Math.min(MATERIAL_BY_ID[n.material].respawn, time(raw.nodes?.[n.id]));
    if (Number.isSafeInteger(cycles[n.id]) && cycles[n.id] >= 0) v.gatherCycles[n.id] = Math.min(1e9, cycles[n.id]);
  }
  v.stall = { rotation: count(raw.stall?.rotation), refreshIn: Math.min(STALL.refresh, time(raw.stall?.refreshIn)) || STALL.refresh, bought: {} };
  for (const [id, n] of Object.entries(raw.stall?.bought ?? {})) if (typeof id === "string") v.stall.bought[id] = Math.min(9, count(n));
  v.discount = Math.min(.25, Math.max(0, Number(raw.discount) || 0));
  for (const [id, n] of Object.entries(raw.decor?.owned ?? {})) if (VILLAGE_DECOR_BY_ID[id]) v.decor.owned[id] = Math.min(99, count(n));
  v.decor.next = Math.max(1, count(raw.decor?.next));
  for (const p of Array.isArray(raw.decor?.placed) ? raw.decor.placed : []) {
    if (!p || !VILLAGE_DECOR_BY_ID[p.id] || typeof p.instance !== "string" || ![p.x, p.z].every(Number.isFinite)) continue;
    const item = { instance: p.instance.slice(0, 24), id: p.id, x: p.x, z: p.z, rotation: Number.isFinite(p.rotation) ? ((p.rotation % 360) + 360) % 360 : 0 };
    if (v.decor.placed.some((q) => q.instance === item.instance) || !decorRoom(v, item.id, item.x, item.z, item.rotation, null, true)) { v.decor.owned[p.id] = Math.min(99, (v.decor.owned[p.id] ?? 0) + 1); continue; }
    v.decor.placed.push(item);
  }
  for (const id of PLAYABLE) {
    const f = raw.favours?.[id]; if (!f) continue;
    v.favours[id] = { id: FAVOUR_BY_ID[f.id]?.who === id ? f.id : null, readyIn: Math.min(FAVOUR_WAIT, time(f.readyIn)), done: count(f.done) };
  }
  v.almanac = { page: [], pages: count(raw.almanac?.pages), prize: count(raw.almanac?.prize) };
  for (const d of Array.isArray(raw.almanac?.page) ? raw.almanac.page.slice(0, 4) : []) if (DUTY_BY_ID[d?.id] && Number.isFinite(d.base)) v.almanac.page.push({ id: d.id, base: d.base, done: d.done === true });
  for (const k of Object.keys(v.stats)) v.stats[k] = count(raw.stats?.[k]);
  return v;
}
export const saveVillage = (v) => JSON.parse(JSON.stringify(v));

// A little seeded randomness of the village's own, so a reload never rerolls.
function roll(v) {
  let t = (v.seed = (v.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---- The invitation --------------------------------------------------------
// Elowen comes to the farm once the patch reaches level 3 (or at once, for a farm already past it).
export const villageDue = (s) => !s.village.invited && level(s) >= VILLAGE_LEVEL;
export const villageOpen = (s) => s.village.invited;
export function inviteToVillage(s) {
  const v = s.village; if (v.invited) return false;
  v.invited = true; startQuest(s, "invitation", true); meet(s, "elowen"); return true;
}
export function finishTour(s) { const v = s.village; v.toured = true; return advanceQuests(s); }
export function arriveInVillage(s) { s.village.visits++; return advanceQuests(s); }

// ---- Items: what the farm and the village hold -----------------------------
const VARIETY_BY_ID = Object.fromEntries(VARIETIES.map((x, i) => [x.id, i]));
export function villageItemName(item, n = 1) {
  const [kind, id] = item.split(":");
  if (kind === "pumpkin") return id === "any" ? (n === 1 ? "pumpkin" : "pumpkins") : `${VARIETIES[VARIETY_BY_ID[id]]?.name ?? id} pumpkin${n === 1 ? "" : "s"}`;
  if (kind === "food") return RECIPE_BY_ID[id]?.name ?? id;
  if (kind === "pantry") return (INGREDIENT_BY_ID[id]?.name ?? id).toLowerCase();
  if (kind === "material") return (MATERIAL_BY_ID[id]?.name ?? id).toLowerCase();
  return id;
}
export function villageItemCount(s, item) {
  const [kind, id] = item.split(":");
  if (kind === "pumpkin") return id === "any" ? available(s) : VARIETY_BY_ID[id] === undefined ? 0 : available(s, VARIETY_BY_ID[id]);
  if (kind === "food") return count(availableFood(s, id));
  if (kind === "pantry") return count(s.kitchen?.pantry?.[id]);
  if (kind === "material") return count(s.village.materials[id]);
  return 0;
}
// Takes n of an item, all or nothing. "pumpkin:any" takes the cheapest first.
export function takeVillageItem(s, item, n) {
  if (villageItemCount(s, item) < n || n <= 0) return false;
  const [kind, id] = item.split(":");
  if (kind === "pumpkin") {
    if (id !== "any") s.stock[VARIETY_BY_ID[id]] -= n;
    else for (let i = 0, left = n; left > 0 && i < VARIETIES.length; i++) { const take = Math.min(left, available(s, i)); s.stock[i] -= take; left -= take; }
    settleFresh(s);
  } else if (kind === "food") s.kitchen.food[id] -= n;
  else if (kind === "pantry") s.kitchen.pantry[id] -= n;
  else if (kind === "material") s.village.materials[id] -= n;
  else return false;
  return true;
}
// What a pocketful of things is worth at the stall, for favours: a little over the farm's own price.
function itemValue(item) {
  const [kind, id] = item.split(":");
  if (kind === "pumpkin") return Math.round((VARIETIES[VARIETY_BY_ID[id]]?.price ?? 12) * 1.25);
  if (kind === "food") return Math.round((RECIPE_BY_ID[id]?.basePrice ?? 20) * 1.2);
  if (kind === "pantry") return (INGREDIENT_BY_ID[id]?.price ?? 3) * 4;
  return 8;
}
// Every gift the farm could give right now.
export function giftable(s) {
  const out = [];
  VARIETIES.forEach((x, i) => { const n = available(s, i); if (n) out.push({ item: "pumpkin:" + x.id, n }); });
  for (const id of Object.keys(s.kitchen?.food ?? {})) { const n = villageItemCount(s, "food:" + id); if (n > 0 && RECIPE_BY_ID[id]) out.push({ item: "food:" + id, n }); }
  for (const [id, n] of Object.entries(s.kitchen?.pantry ?? {})) if (n > 0 && INGREDIENT_BY_ID[id]) out.push({ item: "pantry:" + id, n });
  for (const m of MATERIALS) if (s.village.materials[m.id] > 0) out.push({ item: "material:" + m.id, n: s.village.materials[m.id] });
  return out;
}

// ---- Friendship ------------------------------------------------------------
export function friendshipWith(s, who) {
  const f = s.village.friends[who]; if (!f) return null;
  const lvl = f.met ? FRIEND_XP.filter((x) => x <= f.xp).length : 0, next = FRIEND_XP[lvl];
  return { level: lvl, xp: f.xp, met: f.met, title: FRIEND_TITLES[lvl], next: next ?? null, progress: next === undefined ? 1 : lvl ? (f.xp - FRIEND_XP[lvl - 1]) / (next - FRIEND_XP[lvl - 1]) : 0 };
}
function meet(s, who) { const f = s.village.friends[who]; if (f && !f.met) { f.met = true; return true; } return false; }
// Adds friendship and gives each newly reached level's rewards (once). Returns what it gave.
export function addFriendship(s, who, xp) {
  const f = s.village.friends[who]; if (!f || xp <= 0) return [];
  meet(s, who);
  const before = friendshipWith(s, who).level; f.xp = Math.min(FRIEND_XP.at(-1), f.xp + Math.round(xp));
  const after = friendshipWith(s, who).level, out = [];
  for (let l = before + 1; l <= after; l++) {
    const key = `friend:${who}:${l}`; if (s.village.claims[key]) continue; s.village.claims[key] = true;
    out.push({ type: "friend-level", who, level: l, rewards: grantVillage(s, FOLK_BY_ID[who].rewards?.[l] ?? []) });
  }
  return out;
}

// Rewards of every kind, each given once; a thing already owned turns to coins.
function bonusCoins(s, amount) { if (amount <= 0) return; s.coins += amount; s.earned += amount; s.progression.bonusEarned += amount; }
function grantHouseDecor(s, id) {
  if (!decorById[id]) return false;
  const owned = ownedCopies(s, id), copyable = !["books", "wallpaper"].includes(decorById[id].category);
  if (owned && !copyable) return false;
  if (!s.house.owned.includes(id)) s.house.owned.push(id);
  if (copyable) { s.house.copies ??= {}; s.house.copies[id] = owned + 1; }
  return true;
}
export function grantVillage(s, rewards) {
  const v = s.village, out = [];
  for (const r of rewards) {
    const note = { ...r };
    if (r.kind === "coins") bonusCoins(s, r.amount);
    else if (r.kind === "village-decor") v.decor.owned[r.id] = (v.decor.owned[r.id] ?? 0) + (r.amount ?? 1);
    else if (r.kind === "decor") { if (!grantHouseDecor(s, r.id)) { bonusCoins(s, 60); note.duplicate = true; } }
    else if (r.kind === "material") v.materials[r.id] = Math.min(villageMaterialCapacity(s), (v.materials[r.id] ?? 0) + r.amount);
    else if (r.kind === "recipe") { const k = s.kitchen; if (k && RECIPE_BY_ID[r.id] && !k.recipes.includes(r.id)) k.recipes.push(r.id); else { bonusCoins(s, 80); note.duplicate = true; } }
    else if (r.kind === "costume") { if (costumeById[r.id] && !s.wardrobe.owned.includes(r.id)) s.wardrobe.owned.push(r.id); else { bonusCoins(s, 80); note.duplicate = true; } }
    else if (r.kind === "upgrade") {
      const u = UPGRADES.find((x) => x.id === r.id);
      if (u && s.upgrades[r.id] < u.max && unlockLevel("farm", r.id, s.upgrades[r.id]) <= level(s)) s.upgrades[r.id]++; else { bonusCoins(s, 150); note.duplicate = true; }
    }
    else if (r.kind === "visitor-upgrade") { if (visitorUpgradeCost(s, r.id) !== undefined) s.visitorUpgrades[r.id] = (s.visitorUpgrades[r.id] ?? 0) + 1; else { bonusCoins(s, 150); note.duplicate = true; } }
    else if (r.kind === "discount") v.discount = Math.max(v.discount, r.amount);
    out.push(note);
  }
  return out;
}

// A chat: what the resident says now (a chat when one's ready, else a greeting).
const band = (lvl) => (lvl >= 7 ? 3 : lvl >= 4 ? 2 : 1);
export function canChat(s, who) { const f = s.village.friends[who]; return !!f && f.chatIn <= 0; }
export function nextChat(s, who) {
  const folk = FOLK_BY_ID[who], f = s.village.friends[who]; if (!folk || !f) return null;
  const b = band(friendshipWith(s, who).level), pool = folk.chats.filter((c) => c.band <= b);
  const fresh = pool.filter((c) => c.band === b && !f.seen.includes(c.id));
  return fresh[0] ?? pool.filter((c) => !f.seen.includes(c.id))[0] ?? pool[(f.seen.length) % Math.max(1, pool.length)] ?? null;
}
// Answering a chat: friendship, a little more for the tone they like. Once per wait.
export function answerChat(s, who, chatId, choice) {
  const folk = FOLK_BY_ID[who], f = s.village.friends[who], chat = folk?.chats.find((c) => c.id === chatId), pick = chat?.choices[choice];
  if (!pick || f.chatIn > 0) return null;
  f.chatIn = FRIENDSHIP.chatWait; f.seen = [...f.seen.filter((c) => c !== chatId), chatId].slice(-40); s.village.stats.chats++;
  const liked = pick.tone === folk.tone, events = addFriendship(s, who, FRIENDSHIP.chat + (liked ? FRIENDSHIP.liked : 0));
  return { reply: pick.reply, liked, events: [...events, ...advanceQuests(s)] };
}

// Gifts: two a resident every few minutes, more for what they love.
export function tasteOf(who, item) {
  const folk = FOLK_BY_ID[who]; if (!folk) return "neutral";
  return folk.loves?.includes(item) ? "loved" : folk.likes?.includes(item) ? "liked" : folk.dislikes?.includes(item) ? "disliked" : "neutral";
}
export const giftsLeft = (s, who) => Math.max(0, FRIENDSHIP.giftsPer - (s.village.friends[who]?.gifts.length ?? FRIENDSHIP.giftsPer));
export function giveGift(s, who, item) {
  const folk = FOLK_BY_ID[who], f = s.village.friends[who];
  if (!folk || !f || giftsLeft(s, who) <= 0 || !takeVillageItem(s, item, 1)) return null;
  const taste = tasteOf(who, item), lines = folk.gift?.[taste] ?? ["Thank you."];
  f.gifts.push(FRIENDSHIP.giftWait); s.village.stats.gifts++;
  const events = addFriendship(s, who, FRIENDSHIP.gift[taste]);
  return { taste, line: lines[(s.village.stats.gifts + who.length) % lines.length], events: [...events, ...advanceQuests(s)] };
}

// ---- Quests ----------------------------------------------------------------
// A farm total a step counts from: its value when the step began.
function metric(s, kind) {
  if (kind === "sell") return s.sold;
  if (kind === "harvest") return s.harvested;
  if (kind === "carve") return s.carving?.made ?? 0;
  if (kind === "cook") return s.kitchen?.ledger?.batchesCooked ?? 0;
  if (kind === "fish") return s.fishing?.caught ?? 0;
  if (kind === "earn") return s.earned - (s.progression?.bonusEarned ?? 0);
  return 0;
}
const COUNTED = new Set(["sell", "harvest", "carve", "cook", "fish", "earn"]);
const countedStep = step => COUNTED.has(step.kind) || step.kind === "root-out";
const stepMetric = (s, step) => step.kind === "root-out" ? blightClearCount(s, step.district) : metric(s, step.kind);
// Where a quest stands: locked (not yet), offered (its giver has it), active, or done.
export function questStatus(s, id) {
  const q = QUEST_BY_ID[id], state = s.village.quests[id]; if (!q) return "locked";
  if (state?.done) return "done";
  if (state) return "active";
  if (!s.village.invited) return "locked";
  if (q.level && level(s) < q.level) return "locked";
  if (q.needs.some((n) => !s.village.quests[n]?.done)) return "locked";
  if (q.friendship && (friendshipWith(s, q.giver)?.level ?? 0) < q.friendship) return "locked";
  return "offered";
}
export const offeredBy = (s, who) => QUESTS.filter((q) => q.giver === who && questStatus(s, q.id) === "offered");
export const activeQuests = (s) => QUESTS.filter((q) => questStatus(s, q.id) === "active");
export function startQuest(s, id, quiet = false) {
  if (questStatus(s, id) !== "offered" && !(quiet && !s.village.quests[id])) return [];
  s.village.quests[id] = { step: 0, base: null, done: false };
  return advanceQuests(s);
}
export function questStep(s, id) { const q = QUEST_BY_ID[id], state = s.village.quests[id]; return state && !state.done ? q.steps[state.step] ?? null : null; }
// How far along a step is, for the journal.
export function stepProgress(s, id) {
  const step = questStep(s, id), state = s.village.quests[id]; if (!step) return null;
  if (countedStep(step)) return { have: Math.max(0, Math.min(step.n, stepMetric(s, step) - (state.base ?? stepMetric(s, step)))), need: step.n };
  if (step.kind === "gather") return { have: Math.min(step.n, s.village.materials[step.material] ?? 0), need: step.n };
  if (step.kind === "give") return { have: Math.min(step.n, villageItemCount(s, step.item)), need: step.n };
  if (step.kind === "deliver") return { have: Object.entries(step.cost).filter(([m, n]) => s.village.materials[m] >= n).length, need: Object.keys(step.cost).length, cost: step.cost };
  if (step.kind === "pay") return { have: Math.min(step.coins, s.coins), need: step.coins };
  if (step.kind === "place") { const got = placedTags(s, step.near); return { have: step.tags.filter((t) => got.has(t)).length, need: step.tags.length, missing: step.tags.filter((t) => !got.has(t)) }; }
  return null;
}
// Steps that finish by themselves (the tour, a found page, a reached total, a nook laid out, a home raised) move on here.
export function advanceQuests(s) {
  const v = s.village, events = [];
  for (const q of QUESTS) {
    const state = v.quests[q.id]; if (!state || state.done) continue;
    for (let guard = 0; guard < 12; guard++) {
      const step = q.steps[state.step]; if (!step) { events.push(...finishQuest(s, q.id)); break; }
      if (countedStep(step) && state.base === null) state.base = stepMetric(s, step);
      const done = step.kind === "tour" ? v.toured
        : step.kind === "find" ? !!v.found[step.item]
        : step.kind === "gather" ? (v.materials[step.material] ?? 0) >= step.n
        : countedStep(step) ? stepMetric(s, step) - state.base >= step.n
        : step.kind === "build" ? build(s, step.blueprint)
        : step.kind === "place" ? step.tags.every((t) => placedTags(s, step.near).has(t))
        : false;
      if (!done) break;
      state.step++; state.base = null; events.push({ type: "quest-step", quest: q.id, step: state.step - 1 });
    }
  }
  return events;
}
function build(s, id) { const b = BLUEPRINTS.find((x) => x.id === id); if (!b) return false; if (!s.village.built[id]) { s.village.built[id] = true; } return true; }
function finishQuest(s, id) {
  const q = QUEST_BY_ID[id], state = s.village.quests[id]; if (!state || state.done) return [];
  state.done = true;
  const key = "quest:" + id; if (s.village.claims[key]) return [{ type: "quest-done", quest: id, rewards: [] }];
  s.village.claims[key] = true;
  const r = q.reward, v = s.village, given = [], events = [];
  if (r.coins) { bonusCoins(s, r.coins); given.push({ kind: "coins", amount: r.coins }); }
  for (const [m, n] of Object.entries(r.materials ?? {})) { v.materials[m] = Math.min(villageMaterialCapacity(s), (v.materials[m] ?? 0) + n); given.push({ kind: "material", id: m, amount: n }); }
  for (const [d, n] of Object.entries(r.villageDecor ?? {})) { v.decor.owned[d] = (v.decor.owned[d] ?? 0) + n; given.push({ kind: "village-decor", id: d, amount: n }); }
  for (const d of r.decor ?? []) given.push(...grantVillage(s, [{ kind: "decor", id: d }]));
  for (const id of r.costumes ?? []) given.push(...grantVillage(s, [{ kind: "costume", id }]));
  for (const id of r.recipes ?? []) given.push(...grantVillage(s, [{ kind: "recipe", id }]));
  for (const u of r.unlock ?? []) if (!v.unlocks.includes(u)) v.unlocks.push(u);
  if (r.effect && !v.effects.includes(r.effect)) v.effects.push(r.effect);
  if (r.build) build(s, r.build);
  events.push({ type: "quest-done", quest: id, rewards: given });
  for (const [who, xp] of Object.entries(r.friendship ?? {})) events.push(...addFriendship(s, who, xp));
  return events;
}

// Talking to a resident: meeting them, starting what they offer, and any step that needs them.
// Returns the quest lines to play (the UI shows them, with their choices).
export function talkStep(s, who) {
  for (const q of activeQuests(s)) { const step = questStep(s, q.id); if (step?.kind === "talk" && step.who === who) return { quest: q.id, lines: q.talk?.[who] ?? [] }; }
  return null;
}
export function finishTalk(s, questId, who) {
  const step = questStep(s, questId); if (step?.kind !== "talk" || step.who !== who) return [];
  meet(s, who); s.village.quests[questId].step++; s.village.quests[questId].base = null;
  return [{ type: "quest-step", quest: questId, step: s.village.quests[questId].step - 1 }, ...advanceQuests(s)];
}
// A hand-over step at this resident (materials, coins or farm items), and whether it can be done now.
export function handOver(s, who, questId = null) {
  for (const q of activeQuests(s)) {
    if (questId && q.id !== questId) continue;
    const step = questStep(s, q.id); if (!step || step.who !== who || !["deliver", "pay", "give"].includes(step.kind)) continue;
    const ok = step.kind === "deliver" ? Object.entries(step.cost).every(([m, n]) => (s.village.materials[m] ?? 0) >= n) : step.kind === "pay" ? s.coins >= step.coins : villageItemCount(s, step.item) >= step.n;
    return { quest: q.id, step, ok };
  }
  return null;
}
export function doHandOver(s, who, questId = null) {
  const h = handOver(s, who, questId); if (!h?.ok) return null;
  const { step } = h;
  if (step.kind === "deliver") for (const [m, n] of Object.entries(step.cost)) s.village.materials[m] -= n;
  else if (step.kind === "pay") s.coins -= step.coins;
  else if (!takeVillageItem(s, step.item, step.n)) return null;
  meet(s, who); s.village.quests[h.quest].step++; s.village.quests[h.quest].base = null;
  return [{ type: "quest-step", quest: h.quest, step: s.village.quests[h.quest].step - 1 }, ...advanceQuests(s)];
}
// A story object picked up (a page of Elowen's letter), on the Green or the farm.
export function storyObjectsHere(s, place) {
  const wanted = new Set(activeQuests(s).flatMap((q) => q.steps.filter((st) => st.kind === "find").map((st) => st.item)));
  return STORY_OBJECTS.filter((o) => o.place === place && wanted.has(o.id) && !s.village.found[o.id]);
}
export function findObject(s, id) {
  if (!storyObjectsHere(s, STORY_OBJECTS.find((o) => o.id === id)?.place).some((o) => o.id === id)) return null;
  s.village.found[id] = true; return advanceQuests(s);
}

// ---- Gathering -------------------------------------------------------------
export const canGather = (s) => s.village.unlocks.includes("gathering");
// A new resource site never evicts an older decoration. It stays dormant until
// the existing piece is moved, without consuming a gather cycle.
function nodeCovered(s, node) {
  const at = villageNodePosition(s, node);
  return (s.village.decor?.placed ?? []).some(p => { const b = villageDecorBounds(p.id, p.x, p.z, p.rotation); return b && at.x + .65 > b.x0 && at.x - .65 < b.x1 && at.z + .65 > b.z0 && at.z - .65 < b.z1; });
}
export const nodeReady = (s, id) => !!NODE_BY_ID[id] && districtOpen(s, NODE_BY_ID[id].district) && (s.village.nodes[id] ?? 0) <= 0 && !nodeCovered(s, NODE_BY_ID[id]);
// Growth is a view of the existing cooldown, never a second saved clock. A
// growing patch stays visible, but becomes pickable only once it is mature.
export function nodeGrowthInfo(s, id) {
  const node = Object.hasOwn(NODE_BY_ID, id) ? NODE_BY_ID[id] : null; if (!node) return null;
  const remaining = time(s.village.nodes[id]), total = villageGatheringWait(s, node.material), ratio = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, total)));
  const mature = remaining <= 0, suppressed = nodeCovered(s, node), visible = districtOpen(s, node.district) && !suppressed;
  const age = ratio + 1e-9, stage = mature ? "mature" : node.kind !== "blight" || age < .1 ? "bare" : age < .35 ? "spores" : age < .65 ? "shoots" : "young";
  return { id, stage, ratio, remaining, total, mature, visible, suppressed, available: visible && mature, cycle: count(s.village.gatherCycles?.[id]), scale: node.scale ?? 1 };
}
// A clearing total uses the existing saved per-node cycles. It never depends
// on how many samples fit in the satchel or whether they have been handed over.
export function blightClearCount(s, district) {
  return NODES.filter(n => n.kind === "blight" && (!district || n.district === district)).reduce((total, n) => total + Math.min(1e9, count(s.village.gatherCycles?.[n.id])), 0);
}
export function gatherNode(s, id) {
  const n = NODE_BY_ID[id], v = s.village; if (s.paused || !n || !canGather(s) || !nodeReady(s, id)) return null;
  const m = MATERIAL_BY_ID[n.material], blight = n.kind === "blight", room = Math.max(0, villageMaterialCapacity(s) - (v.materials[m.id] ?? 0)); if (!blight && room <= 0) return { full: true, material: m.id };
  // Rooting out a hazard is still useful when no more samples can be stored.
  // Ordinary resource piles keep their existing full-satchel behaviour.
  const got = Math.min(room, villageGatheringYield(s, m.id)); v.materials[m.id] = (v.materials[m.id] ?? 0) + got; v.nodes[id] = villageGatheringWait(s, m.id); v.stats.gathered += got;
  // The next site is chosen only after a successful gather or clear, while hidden.
  v.gatherCycles ??= {};
  const cycle = Number.isSafeInteger(v.gatherCycles[id]) ? Math.max(0, v.gatherCycles[id]) : 0;
  v.gatherCycles[id] = blight ? Math.min(1e9, cycle + 1) : cycle >= 1e9 ? 0 : cycle + 1;
  const bonus = recordCompanionGather(s, { job: `surface:${id}:${cycle}`, material: m.id, quantity: got, capacity: villageMaterialCapacity(s) });
  v.stats.gathered += bonus;
  return { material: m.id, amount: got + bonus, ...(bonus ? { companionBonus: bonus } : {}), ...(blight ? { cleared: true, overflow: room <= 0 } : {}), events: advanceQuests(s) };
}
export const districtOpen = (s, id) => !!expansionAreaInfo(s, id)?.open;

// ---- Rowan's stall ---------------------------------------------------------
export const stallOpen = (s) => s.village.unlocks.includes("stall");
// What's on the stall now: the staples, then this rotation's four, chosen by the rotation number.
export function stallStock(s) {
  const v = s.village, pool = [...VILLAGE_DECOR.filter((d) => d.stall && !STALL.staples.includes(d.id)).map((d) => "village:" + d.id), ...STALL.home.filter((id) => decorById[id]).map((id) => "home:" + id)];
  let seed = Math.imul(v.stall.rotation + 1, 2654435761) >>> 0; const pick = [];
  while (pick.length < STALL.slots && pick.length < pool.length) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; const c = pool[seed % pool.length]; if (!pick.includes(c)) pick.push(c); }
  return [...STALL.staples.map((id) => "village:" + id), ...pick].map((key) => {
    const [kind, id] = key.split(":"), base = kind === "village" ? VILLAGE_DECOR_BY_ID[id].cost : decorById[id].price;
    const name = kind === "village" ? VILLAGE_DECOR_BY_ID[id].name : decorById[id].name, staple = kind === "village" && STALL.staples.includes(id);
    return { key, kind, id, name, price: Math.round(base * (1 - v.discount)), staple, left: staple ? 99 : Math.max(0, 3 - (v.stall.bought[key] ?? 0)) };
  });
}
export function buyFromStall(s, key) {
  const item = stallStock(s).find((x) => x.key === key); if (!stallOpen(s) || !item || item.left <= 0 || s.coins < item.price) return false;
  if (item.kind === "home" && ownedCopies(s, item.id) && ["books", "wallpaper"].includes(decorById[item.id].category)) return false;
  s.coins -= item.price; s.village.stall.bought[key] = (s.village.stall.bought[key] ?? 0) + 1;
  if (item.kind === "village") s.village.decor.owned[item.id] = (s.village.decor.owned[item.id] ?? 0) + 1; else grantHouseDecor(s, item.id);
  return true;
}

// ---- Decorating the Green --------------------------------------------------
// Where decor may go: on the Green (south band, less the Moor's inset), off the roads,
// homes, gathering spots and the square's fixtures, and clear of other decor.
const GREEN = GREEN_AREA;
const overlap = (a, b, gap = 0) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.z0 < b.z1 + gap && b.z0 < a.z1 + gap;
const roadBoxes = ROADS.filter((r) => r.kind !== "future-spur").flatMap((r) => r.points.slice(1).map((p, i) => {
  const q = r.points[i], h = r.width / 2; return { x0: Math.min(p[0], q[0]) - h, x1: Math.max(p[0], q[0]) + h, z0: Math.min(p[1], q[1]) - h, z1: Math.max(p[1], q[1]) + h };
}));
const fixtureBoxes = [...Object.values(FIXTURES), ...SCENERY].map((f) => f.r ? { x0: f.x - f.r, x1: f.x + f.r, z0: f.z - f.r, z1: f.z + f.r } : f.x0 !== undefined ? { x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1 } : { x0: f.x - f.w / 2, x1: f.x + f.w / 2, z0: f.z - f.d / 2, z1: f.z + f.d / 2 });
const homeBoxes = PLOTS.filter((p) => p.kind !== "reservation").map((p) => ({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1 }));
// Keep every possible small-prop site clear, so decorating never moves a visible resource.
const nodeBoxes = NODES.flatMap(n => villageNodeCandidates(n).map(p => ({ x0: p.x - .55, x1: p.x + .55, z0: p.z - .55, z1: p.z + .55 })));
const MOOR_INSET = MOOR_CORNER;
function decorRoom(v, id, x, z, rotation, ignore, restoring = false) {
  const b = villageDecorBounds(id, x, z, rotation); if (!b) return false;
  if (b.x0 < GREEN.x0 || b.x1 > GREEN.x1 || b.z0 < GREEN.z0 || b.z1 > GREEN.z1 || overlap(b, MOOR_INSET)) return false;
  if ([...roadBoxes, ...fixtureBoxes, ...homeBoxes, ...(restoring ? [] : nodeBoxes)].some((o) => overlap(b, o))) return false;
  // A saved piece takes precedence over newly dressed scenery, including the
  // first piece restored and an undo snapshot that differs from the live save.
  const sceneryState = { village: { decor: { placed: restoring ? [...v.decor.placed, { id, x, z, rotation }] : v.decor.placed } } };
  if (!villageDecorGroundClear(id, x, z, rotation, sceneryState)) return false;
  return !v.decor.placed.some((p) => p.instance !== ignore && overlap(b, villageDecorBounds(p.id, p.x, p.z, p.rotation), .05));
}
export const villageDecorFits = (s, id, x, z, rotation = 0, ignore = null) => decorRoom(s.village, id, x, z, rotation, ignore);
const decorTransform = (x, z, rotation) => ({ x: Math.round(x * 20) / 20, z: Math.round(z * 20) / 20, rotation: ((Math.round(rotation) % 360) + 360) % 360 });
export function placeVillageDecor(s, id, x, z, rotation = 0) {
  const v = s.village, t = decorTransform(x, z, rotation); if (!(v.decor.owned[id] > 0) || !villageDecorFits(s, id, t.x, t.z, t.rotation)) return null;
  let instance; do { instance = "v" + v.decor.next++; } while (v.decor.placed.some((p) => p.instance === instance));
  const p = { instance, id, ...t };
  v.decor.owned[id]--; v.decor.placed.push(p); v.stats.placed++;
  return { piece: p, events: advanceQuests(s) };
}
export function moveVillageDecor(s, instance, x, z, rotation) {
  const p = s.village.decor.placed.find((q) => q.instance === instance); if (!p) return false;
  const t = decorTransform(x, z, rotation === undefined ? p.rotation : rotation);
  if (!villageDecorFits(s, p.id, t.x, t.z, t.rotation, instance)) return false;
  Object.assign(p, t); advanceQuests(s); return true;
}
export function storeVillageDecor(s, instance) {
  const v = s.village, i = v.decor.placed.findIndex((q) => q.instance === instance); if (i < 0) return false;
  const [p] = v.decor.placed.splice(i, 1); v.decor.owned[p.id] = (v.decor.owned[p.id] ?? 0) + 1; return true;
}
// Undo changes the layout only. Recompute storage from the current total so
// purchases and quest prizes earned since the snapshot are never lost or copied.
export function restoreVillageDecor(s, snapshot) {
  if (!Array.isArray(snapshot?.placed)) return false;
  const v = s.village, totals = { ...v.decor.owned }, placed = [];
  for (const p of v.decor.placed) totals[p.id] = (totals[p.id] ?? 0) + 1;
  for (const p of snapshot.placed) {
    if (!p || typeof p.instance !== "string" || !totals[p.id] || placed.some((q) => q.instance === p.instance)) return false;
    if (!decorRoom({ decor: { placed } }, p.id, p.x, p.z, p.rotation ?? 0, null, true)) return false;
    totals[p.id]--; placed.push({ instance: p.instance, id: p.id, x: p.x, z: p.z, rotation: p.rotation ?? 0 });
  }
  v.decor.placed = placed; v.decor.owned = totals;
  return true;
}
// Where a resident's door is, for a step that asks for decor near it.
export function doorOf(who) { const plot = PLOTS.find((p) => p.resident === who); return plot ? { x: plot.door[0], z: plot.door[1] } : { x: ARRIVAL.noticeboard[0], z: ARRIVAL.noticeboard[1] }; }
function placedTags(s, near) {
  const door = doorOf(near), tags = new Set();
  for (const p of s.village.decor.placed) if (Math.hypot(p.x - door.x, p.z - door.z) <= NEAR_DOOR) for (const t of VILLAGE_DECOR_BY_ID[p.id].tags) tags.add(t);
  return tags;
}

// ---- Favours ---------------------------------------------------------------
// The favour a resident would ask for now (one at a time; a new one a few minutes after the last).
export function favourOf(s, who) {
  const v = s.village, f = v.favours[who]; if (!f || !friendshipWith(s, who)?.met) return null;
  // Earlier saves could request a gifted recipe years before it could be cooked.
  if (FAVOUR_BY_ID[f.id]?.item.startsWith("food:") && !favourAvailable(s, FAVOUR_BY_ID[f.id])) f.id = null;
  if (f.id) return FAVOUR_BY_ID[f.id];
  if (f.readyIn > 0) return null;
  const pool = FAVOURS.filter((x) => x.who === who && favourAvailable(s, x));
  if (!pool.length) return null;
  f.id = pool[Math.floor(roll(v) * pool.length)].id; return FAVOUR_BY_ID[f.id];
}
function favourAvailable(s, f) {
  if (!f || f.level > level(s) || f.when && !f.when(s)) return false;
  if (!f.item.startsWith("food:")) return true;
  const recipe = RECIPE_BY_ID[f.item.slice(5)];
  return !!s.kitchen?.purchased && !!recipe && recipe.level <= level(s) && s.kitchen.recipes.includes(recipe.id);
}
export function doFavour(s, who) {
  const v = s.village, f = v.favours[who], fav = f?.id && FAVOUR_BY_ID[f.id];
  if (!fav || !takeVillageItem(s, fav.item, fav.n)) return null;
  // Paid like a sale: it counts towards the farm's level.
  const pay = Math.max(fav.pay, itemValue(fav.item) * fav.n);
  s.coins += pay; s.earned += pay; f.id = null; f.readyIn = FAVOUR_WAIT; f.done++; v.stats.favours++;
  return { pay, favour: fav.id, events: [...addFriendship(s, who, FRIENDSHIP.favour), ...advanceQuests(s)] };
}

// ---- The almanac's duties --------------------------------------------------
const dutyMetric = (s, kind) => ({ chat: s.village.stats.chats, gather: s.village.stats.gathered, gift: s.village.stats.gifts, favour: s.village.stats.favours, decorate: s.village.stats.placed }[kind] ?? metric(s, kind));
export const almanacOpen = (s) => s.village.unlocks.includes("almanac");
function drawPage(s) {
  const v = s.village, pool = DUTIES.filter((d) => d.level <= level(s) && (!d.when || d.when(s))), page = [];
  while (page.length < 4 && page.length < pool.length) { const d = pool[Math.floor(roll(v) * pool.length)]; if (!page.some((p) => p.id === d.id)) page.push({ id: d.id, base: dutyMetric(s, d.kind), done: false }); }
  v.almanac.page = page;
}
export function almanacPage(s) {
  if (!almanacOpen(s)) return [];
  return s.village.almanac.page.map((p) => { const d = DUTY_BY_ID[p.id]; return { ...p, text: d.text, coins: d.coins, need: d.n, have: p.done ? d.n : Math.max(0, Math.min(d.n, dutyMetric(s, d.kind) - p.base)) }; });
}
function settleAlmanac(s) {
  const v = s.village, events = []; if (!almanacOpen(s)) return events;
  if (!v.almanac.page.length) drawPage(s);
  for (const p of v.almanac.page) {
    const d = DUTY_BY_ID[p.id]; if (p.done || dutyMetric(s, d.kind) - p.base < d.n) continue;
    p.done = true; bonusCoins(s, d.coins); events.push({ type: "duty", duty: d.id, coins: d.coins });
  }
  if (v.almanac.page.length && v.almanac.page.every((p) => p.done)) {
    const prize = ALMANAC_PRIZES[v.almanac.prize % ALMANAC_PRIZES.length], given = [];
    if (prize.coins) { bonusCoins(s, prize.coins); given.push({ kind: "coins", amount: prize.coins }); }
    for (const [m, n] of Object.entries(prize.materials ?? {})) { v.materials[m] = Math.min(villageMaterialCapacity(s), (v.materials[m] ?? 0) + n); given.push({ kind: "material", id: m, amount: n }); }
    for (const [d, n] of Object.entries(prize.villageDecor ?? {})) { v.decor.owned[d] = (v.decor.owned[d] ?? 0) + n; given.push({ kind: "village-decor", id: d, amount: n }); }
    v.almanac.prize++; v.almanac.pages++; events.push({ type: "almanac-page", rewards: given }); drawPage(s);
  }
  return events;
}

// ---- One step of the village's time ------------------------------------------
// Nodes grow back, the stall restocks, favours return and gifts and chats come round
// again on their own active-play clock; then quests and the almanac catch up.
export function updateVillage(s, dt) {
  const v = s.village; if (s.paused || !v?.invited || !Number.isFinite(dt) || !(dt > 0)) return [];
  const events = [];
  v.clock += dt;
  for (const id in v.nodes) if (v.nodes[id] > 0) {
    v.nodes[id] = Math.max(0, v.nodes[id] - dt);
    if (v.nodes[id] === 0) events.push({ type: "village-resource-ready", id });
  }
  for (const id of PLAYABLE) {
    const f = v.friends[id]; f.chatIn = Math.max(0, f.chatIn - dt); f.gifts = f.gifts.map((t) => t - dt).filter((t) => t > 0);
    const fav = v.favours[id]; if (!fav.id && fav.readyIn > 0) fav.readyIn = Math.max(0, fav.readyIn - dt);
  }
  v.stall.refreshIn -= dt;
  if (v.stall.refreshIn <= 0) { v.stall.rotation++; v.stall.refreshIn = STALL.refresh; v.stall.bought = {}; }
  updateVillageExpansion(s, dt, events);
  return [...events, ...advanceQuests(s), ...settleAlmanac(s)];
}

// What a quest's step says in the journal, with its progress.
export function questStepText(s, id) {
  const step = questStep(s, id); if (!step) return "";
  const p = stepProgress(s, id);
  return p && p.need > 1 && !["deliver", "place"].includes(step.kind) ? `${step.text} (${p.have}/${p.need})` : step.text;
}
// Concrete requirements for the current Journal card and resident hand-over.
// Materials retain their individual counts rather than a misleading 3/4 total.
export function questRequirementRows(s, id) {
  const step = questStep(s, id); if (!step) return [];
  const row = (key, label, have, need) => ({ key, label, have, need, complete: have >= need });
  if (step.kind === "deliver") return Object.entries(step.cost).map(([m, n]) => row(m, MATERIAL_BY_ID[m].name, s.village.materials[m] ?? 0, n));
  if (step.kind === "gather") return [row(step.material, MATERIAL_BY_ID[step.material].name, s.village.materials[step.material] ?? 0, step.n)];
  if (step.kind === "root-out") { const p = stepProgress(s, id); return [row("blight:" + step.district, "Fresh patches cleared · " + (DISTRICT_BY_ID[step.district]?.name ?? "Mothlight"), p.have, p.need)]; }
  if (step.kind === "give") return [row(step.item, villageItemName(step.item, step.n), villageItemCount(s, step.item), step.n)];
  if (step.kind === "pay") return [row("coins", "Coins", s.coins, step.coins)];
  if (step.kind === "place") { const tags = placedTags(s, step.near), names = { light: "A lamp or lantern", seat: "A stool or bench", books: "A reading stand or book cart" }; return step.tags.map((tag) => row(tag, names[tag] ?? tag, +tags.has(tag), 1)); }
  const p = stepProgress(s, id);
  return p ? [row(step.kind, step.text, p.have, p.need)] : [];
}
// Practical next actions for farm steps whose equipment is bought elsewhere.
export function questStepHint(s, id) {
  const step = questStep(s, id); if (!step) return "";
  if (step.kind === "root-out") return "Look for red-and-purple Blackroot fungus off the paths. Root out the whole patch; only fresh clears since this step began count. A full satchel never prevents clearing.";
  if (step.kind === "cook") return !s.kitchen?.purchased ? `Cooking opens at patch level ${COOKING.level}. Buy Maisie's food truck for £${COOKING.price}; then cook a batch of pumpkin wedges.` : "Return to the farm and finish a batch at Maisie's truck or your home kitchen. Earlier batches do not count.";
  if (step.kind === "carve") return s.estate?.placed?.some((p) => p.id === "carving-bench") ? "Return to your garden's carving bench and finish a new jack-o'-lantern." : "Buy a carving bench for the garden, place it, then finish a jack-o'-lantern at the bench.";
  if (step.kind === "place") return "Place all three pieces within the reading nook by Elowen's door. Rowan always stocks a stool; your letter reward includes a reading stand.";
  if (step.kind === "find") return step.item === "page-3" ? "Take the carriage home. This page is beside your pumpkin patch." : "Look for the loose page marked on the Green's map.";
  if (step.kind === "deliver" || step.kind === "give" || step.kind === "pay") return `Bring the full amount to ${FOLK_BY_ID[step.who].name}; it is taken only when you hand it over.`;
  return "";
}
// Rewards settle on the farm clock; the panel never needs a claim button.
export function almanacPrize(s) {
  const prize = ALMANAC_PRIZES[s.village.almanac.prize % ALMANAC_PRIZES.length];
  return [
    ...(prize.coins ? [{ kind: "coins", amount: prize.coins }] : []),
    ...Object.entries(prize.materials ?? {}).map(([id, amount]) => ({ kind: "material", id, amount })),
    ...Object.entries(prize.villageDecor ?? {}).map(([id, amount]) => ({ kind: "village-decor", id, amount })),
  ];
}
// The one quest to show on screen: the story first, then the oldest friendship quest.
export function trackedQuest(s) { const list = activeQuests(s); return list.find((q) => q.kind === "story") ?? list[0] ?? null; }
// Who has something for you: a quest to offer, a step to do with them, or a favour.
export function folkWithNews(s) {
  return PLAYABLE.filter((who) => friendshipWith(s, who)?.met || who === "rowan").filter((who) => offeredBy(s, who).length || talkStep(s, who) || handOver(s, who));
}
export { PLAYABLE as VILLAGE_FOLK, GREEN as VILLAGE_GREEN, PLAZA as VILLAGE_PLAZA };
