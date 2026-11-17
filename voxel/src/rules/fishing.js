// The garden's fishing lake (handover 71). A lake piece placed in the garden
// is fished from its jetty: cast, wait for a bite, strike while the window is
// open. Traps round its edge fill while the farm runs and are emptied by
// hand. Fish go into the kitchen's pantry while there is room, as the
// garden's crops do, and the rest sell at the village market; curiosities
// (a golden koi, a pearl) sell to collectors. Rolls come from a seed kept in
// the save, so a farm always plays out the same way and a reload can't reroll.
import { ESTATE_DECOR_BY_ID } from "../content/house-estate.js";
import { INGREDIENT_BY_ID } from "../content/cooking.js";
import { FISH, FISH_BY_ID, RODS, BAITS, TRAP_COSTS, TRAP_TIERS, LUCK, LAKE } from "../content/fishing.js";
import { pantryCapacity, pantryCount } from "./cooking.js";
import { patchLevel } from "./levels.js";
export { FISH, FISH_BY_ID, RODS, BAITS, TRAP_COSTS, TRAP_TIERS, LAKE, RARITY_NAMES } from "../content/fishing.js";

const LINE_PHASES = ["wait", "bite", "caught", "gone", "early"];
const clampInt = (n, lo, hi) => (Number.isSafeInteger(n) ? Math.max(lo, Math.min(hi, n)) : lo);
const finite = (n, lo, hi, fallback = lo) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback);

export function freshFishing() {
  return { rod: 0, bait: 0, trapTier: 0, traps: [], log: {}, caught: 0, earned: 0, seed: 20261105, line: null };
}

// A small seeded generator (mulberry32) that advances the save's seed.
export function fishingRandom(s) {
  const f = s.fishing; let t = (f.seed = (f.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// The placed lake, if the garden has one.
export const isLakePiece = (id) => !!ESTATE_DECOR_BY_ID[id]?.lake;
export const fishingLake = (s) => s?.estate?.placed?.find((p) => isLakePiece(p.id)) ?? null;
// A point on the lake, from its own plan (content/fishing.js LAKE) to the garden's.
export function lakePoint(piece, x, z) {
  const a = (Number(piece?.rotation) || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  return { x: piece.x + x * c + z * sn, z: piece.z - x * sn + z * c };
}

export const currentRod = (s) => RODS[clampInt(s?.fishing?.rod, 0, RODS.length - 1)];
export const currentBait = (s) => BAITS[clampInt(s?.fishing?.bait, 0, BAITS.length - 1)];
export const currentTraps = (s) => TRAP_TIERS[clampInt(s?.fishing?.trapTier, 0, TRAP_TIERS.length - 1)];

// What can come up, and how often, from the rod or a trap with the gear in use.
export function fishOdds(s, source = "rod") {
  const luck = source === "rod" ? currentRod(s).luck + currentBait(s).luck : currentTraps(s).luck;
  const noJunk = source === "rod" && currentRod(s).noJunk;
  const list = FISH.filter((f) => f[source] > 0 && !(noJunk && f.junk)).map((f) => ({ fish: f, weight: f[source] * Math.max(.08, 1 + luck * LUCK[f.rarity]) }));
  const total = list.reduce((n, e) => n + e.weight, 0);
  return list.map((e) => ({ ...e, chance: e.weight / total }));
}
function rollCatch(s, source) {
  const odds = fishOdds(s, source); let r = fishingRandom(s);
  let pick = odds[odds.length - 1].fish;
  for (const e of odds) { if (r < e.chance) { pick = e.fish; break; } r -= e.chance; }
  // Most fish are small: a skewed roll through the size range.
  const kg = Math.round((pick.kg[0] + (pick.kg[1] - pick.kg[0]) * fishingRandom(s) ** 1.7) * 100) / 100;
  return { id: pick.id, kg };
}

// Where a catch goes: ingredients to the pantry while it has room (the rest
// sold at their market price), a curiosity sold for its value, junk nowhere.
function deliver(s, catches) {
  const out = { pantry: {}, sold: 0, coins: 0, junk: 0 };
  const k = s.kitchen;
  let room = k?.purchased && k.pantry ? Math.max(0, pantryCapacity(s) - pantryCount(s)) : 0;
  for (const c of catches) {
    const f = FISH_BY_ID[c.id]; if (!f) continue;
    if (f.junk) { out.junk++; continue; }
    if (f.value) { out.coins += f.value; continue; }
    for (const [id, n] of Object.entries(f.gives ?? {})) {
      const into = k?.pantry && id in k.pantry ? Math.min(n, room) : 0;
      if (into) { k.pantry[id] += into; room -= into; out.pantry[id] = (out.pantry[id] ?? 0) + into; }
      if (n - into) { out.sold += n - into; out.coins += (n - into) * (INGREDIENT_BY_ID[id]?.price ?? 3); }
    }
  }
  if (out.coins) { s.coins += out.coins; s.earned += out.coins; s.fishing.earned += out.coins; }
  return out;
}
function record(s, c) {
  const f = s.fishing, e = f.log[c.id] ?? { n: 0, best: 0 };
  const best = c.kg > e.best && e.n > 0;
  f.log[c.id] = { n: e.n + 1, best: Math.max(e.best, c.kg) }; f.caught++;
  return { ...c, first: e.n === 0, record: best };
}

// The line. Casting starts a wait; a bite opens the strike window; a strike
// in time lands the fish, too early scares it off, too late it gets away.
export function castLine(s) {
  if (!s?.fishing || s.paused || !fishingLake(s)) return false;
  const [lo, hi] = currentBait(s).bite;
  s.fishing.line = { phase: "wait", t: 0, biteAt: Math.round((lo + (hi - lo) * fishingRandom(s)) * 100) / 100 };
  return s.fishing.line;
}
export function strikeLine(s) {
  const line = s?.fishing?.line; if (!line || s.paused) return false;
  if (line.phase === "wait") { s.fishing.line = { phase: "early", t: 0 }; return { early: true }; }
  if (line.phase !== "bite") return false;
  const c = record(s, rollCatch(s, "rod")), got = deliver(s, [c]);
  s.fishing.line = { phase: "caught", t: 0, catch: c };
  return { ...c, ...got };
}
export function reelIn(s) { if (s?.fishing) s.fishing.line = null; return true; }

// Traps: bought one at a time (up to four), then improved together.
export function trapCount(s) { return Math.min(TRAP_COSTS.length, s?.fishing?.traps?.length ?? 0); }
export function trapCatches(s) { return (s?.fishing?.traps ?? []).reduce((n, t) => n + t.catch.length, 0); }
export function emptyTraps(s) {
  if (!s?.fishing || s.paused || !fishingLake(s)) return false;
  const catches = s.fishing.traps.flatMap((t) => t.catch);
  if (!catches.length) return { catches: [], pantry: {}, sold: 0, coins: 0, junk: 0 };
  for (const t of s.fishing.traps) t.catch = [];
  const logged = catches.map((c) => record(s, c));
  return { catches: logged, ...deliver(s, logged) };
}

// The gear's next step: what it is, its price and whether it can be bought now.
const level = (s) => patchLevel(s).level;
function step(s, list, index) {
  const next = list[index + 1]; if (!next) return null;
  return { ...next, locked: level(s) < next.level, afford: (s?.coins ?? 0) >= next.cost };
}
export const nextRod = (s) => step(s, RODS, s.fishing.rod);
export const nextBait = (s) => step(s, BAITS, s.fishing.bait);
export const nextTrapTier = (s) => step(s, TRAP_TIERS, s.fishing.trapTier);
export function nextTrap(s) {
  const n = trapCount(s); if (n >= TRAP_COSTS.length) return null;
  return { cost: TRAP_COSTS[n], locked: false, afford: (s?.coins ?? 0) >= TRAP_COSTS[n] };
}
function pay(s, next) {
  if (!next || next.locked || s.paused || !fishingLake(s) || !(s.coins >= next.cost)) return false;
  s.coins -= next.cost; return true;
}
export function buyRod(s) { if (!pay(s, nextRod(s))) return false; s.fishing.rod++; return true; }
export function buyBait(s) { if (!pay(s, nextBait(s))) return false; s.fishing.bait++; return true; }
export function buyTrapTier(s) { if (!pay(s, nextTrapTier(s))) return false; s.fishing.trapTier++; return true; }
export function buyTrap(s) { if (!pay(s, nextTrap(s))) return false; s.fishing.traps.push({ t: 0, catch: [] }); return true; }

// The lake's time passing: the line's wait and window, and the traps filling
// (only while the lake is in the garden). A full trap stops filling.
export function updateFishing(s, dt) {
  const f = s?.fishing; if (!f || s.paused || !(dt > 0)) return;
  const line = f.line;
  if (line) {
    line.t += dt;
    if (line.phase === "wait" && line.t >= line.biteAt) f.line = { phase: "bite", t: 0, window: currentRod(s).window };
    else if (line.phase === "bite" && line.t > line.window) f.line = { phase: "gone", t: 0 };
  }
  if (!fishingLake(s)) return;
  const tier = currentTraps(s);
  for (const trap of f.traps) {
    if (trap.catch.length >= tier.holds) { trap.t = 0; continue; }
    trap.t += dt;
    while (trap.t >= tier.every && trap.catch.length < tier.holds) { trap.t -= tier.every; trap.catch.push(rollCatch(s, "trap")); }
  }
}

// Everything the menu and the lake's model need, in one look.
export function fishingStatus(s) {
  const f = s.fishing, tier = currentTraps(s);
  return {
    lake: fishingLake(s), rod: currentRod(s), bait: currentBait(s), trapTier: tier,
    traps: f.traps.map((t) => ({ held: t.catch.length, holds: tier.holds, full: t.catch.length >= tier.holds, next: Math.max(0, tier.every - t.t) })),
    waiting: trapCatches(s), caught: f.caught, earned: f.earned, species: Object.keys(f.log).length, line: f.line,
  };
}

// A saved lake, checked: unknown fish, bad numbers and an over-long trap line
// are dropped. A line in the water isn't kept.
export function restoreFishing(raw) {
  const f = freshFishing();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return f;
  f.rod = clampInt(raw.rod, 0, RODS.length - 1); f.bait = clampInt(raw.bait, 0, BAITS.length - 1); f.trapTier = clampInt(raw.trapTier, 0, TRAP_TIERS.length - 1);
  const holds = TRAP_TIERS[f.trapTier].holds;
  f.traps = (Array.isArray(raw.traps) ? raw.traps : []).slice(0, TRAP_COSTS.length).map((t) => ({
    t: finite(t?.t, 0, TRAP_TIERS[f.trapTier].every, 0),
    catch: (Array.isArray(t?.catch) ? t.catch : []).filter((c) => FISH_BY_ID[c?.id] && FISH_BY_ID[c.id].trap > 0).slice(0, holds).map((c) => ({ id: c.id, kg: finite(c.kg, 0, 50, 0) })),
  }));
  for (const [id, e] of Object.entries(raw.log && typeof raw.log === "object" ? raw.log : {})) {
    if (!FISH_BY_ID[id]) continue;
    const n = clampInt(e?.n, 0, 1e9); if (n) f.log[id] = { n, best: finite(e?.best, 0, 50, 0) };
  }
  f.caught = clampInt(raw.caught, 0, 1e9); f.earned = finite(raw.earned, 0, 1e12, 0);
  f.seed = Number.isSafeInteger(raw.seed) ? raw.seed >>> 0 : f.seed;
  return f;
}
export const saveFishing = (f) => f && { ...f, line: null };
export { LINE_PHASES };
