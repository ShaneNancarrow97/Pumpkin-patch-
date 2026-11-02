// Farm work is saved progress, not a sprite timer: each owner learns their own
// skills, and the big pumpkin keeps its heat through a save or scene change.
import { patchLevel } from "./levels.js";
import { HELPER_WAIT, openPlots, plant, harvest, barnBlocked } from "./farm.js";
import { waterPlot, wateringStatus } from "./hands-on.js";

export const HELPER_IDS = Object.freeze(["shane", "natalie"]);
export const HELPER_SPEED = Object.freeze([1, .8, .6, .45]);
export const BOOST_HEAT = Object.freeze({ capacity: 100, recoverAt: 35, perUse: [10, 9, 8, 7], cooling: [8, 10, 13, 16], strength: [1, 1.25, 1.5, 1.75] });
export const HELPER_UPGRADES = Object.freeze([
  { id: "hire", name: "Helping hands", text: "Tend one job at a time, and rest while you take control.", costs: [250], levels: [1] },
  { id: "plant", name: "Planting speed", text: "Plant each seed more quickly.", costs: [150, 600, 1800], levels: [1, 5, 10] },
  { id: "water", name: "Watering speed", text: "Water each thirsty crop more quickly.", costs: [150, 600, 1800], levels: [1, 5, 10] },
  { id: "capacity", name: "Picking capacity", text: "Pick two, then three ripe plots in one turn.", costs: [350, 1400], levels: [5, 9] },
]);
export const BOOST_UPGRADES = Object.freeze([
  { id: "power", name: "Pumpkin power", text: "Each accepted boost adds more growth.", costs: [150, 750, 2600], levels: [1, 5, 10] },
  { id: "cooling", name: "Cooler candle", text: "Less heat per boost and quicker cooling.", costs: [120, 600, 2200], levels: [1, 5, 10] },
]);
const tier = (n, max) => Number.isSafeInteger(n) && n > 0 ? Math.min(max, n) : 0;
const finite = (n, low, high, fallback = low) => Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;
const ownerValid = owner => HELPER_IDS.includes(owner);
const freshHelper = () => ({ hired: false, plant: 0, water: 0, capacity: 0, timer: 0, cursor: 0, kind: null });
export const freshFarmWork = () => ({ version: 1, boost: { power: 0, cooling: 0, heat: 0, overheated: false, lastUse: -1 }, helpers: { shane: freshHelper(), natalie: freshHelper() } });

// Only missing pre-feature data grants the old shared purchase to both owners.
// Once separate records exist, one owner's hire must never hire the other too.
export function restoreFarmWork(raw, s) {
  const work = freshFarmWork(), object = raw && typeof raw === "object" && !Array.isArray(raw);
  if (!object) {
    if (s.upgrades.auto) for (const owner of HELPER_IDS) work.helpers[owner].hired = true;
    return work;
  }
  const b = raw.boost;
  work.boost.power = tier(b?.power, 3); work.boost.cooling = tier(b?.cooling, 3);
  work.boost.heat = finite(b?.heat, 0, BOOST_HEAT.capacity);
  work.boost.overheated = work.boost.heat >= BOOST_HEAT.capacity || b?.overheated === true && work.boost.heat > BOOST_HEAT.recoverAt;
  work.boost.lastUse = finite(b?.lastUse, -1, Math.max(0, s.time), -1);
  for (const owner of HELPER_IDS) {
    const h = raw.helpers?.[owner], out = work.helpers[owner];
    out.hired = h?.hired === true;
    out.plant = tier(h?.plant, 3); out.water = tier(h?.water, 3); out.capacity = tier(h?.capacity, 2);
    out.cursor = tier(h?.cursor, Math.max(0, s.plots.length - 1));
    // A saved clock cannot identify its original crop object. Restart that job
    // instead of transferring partial work to whichever crop is there now.
    out.kind = null; out.timer = 0;
  }
  return work;
}

const ensureWork = s => s.farmWork ??= restoreFarmWork(undefined, s);
const helperRecord = (s, owner) => s.farmWork?.helpers?.[owner] ?? freshHelper();

// Status is a read-only view shared by the menus and the controlled actions.
export function helperStatus(s, owner) {
  if (!ownerValid(owner)) return null;
  const h = helperRecord(s, owner), plantLevel = tier(h.plant, 3), waterLevel = tier(h.water, 3), capacityLevel = tier(h.capacity, 2);
  const plantFactor = HELPER_SPEED[plantLevel], waterFactor = HELPER_SPEED[waterLevel];
  return { hired: h.hired === true, plantLevel, waterLevel, capacityLevel, plantFactor, waterFactor, plantSeconds: 2.4 * plantFactor, waterSeconds: 3 * waterFactor, pickSeconds: 2, capacity: capacityLevel + 1 };
}

// Upgrade quotes contain their prerequisites as well as their price. The rule
// repeats every check so stale menu buttons cannot buy a locked or paused tier.
export function helperUpgradeInfo(s, owner, kind) {
  if (!ownerValid(owner)) return null;
  const u = HELPER_UPGRADES.find(x => x.id === kind);
  if (!u) return null;
  const h = helperRecord(s, owner), level = kind === "hire" ? +!!h.hired : tier(h[kind], u.costs.length);
  const max = u.costs.length, done = level >= max, cost = done ? 0 : u.costs[level], requiredLevel = done ? 1 : u.levels[level];
  const unlocked = patchLevel(s).level >= requiredLevel && (kind === "hire" || h.hired === true);
  return { id: kind, name: u.name, level, max, cost, requiredLevel, done, unlocked, affordable: s.coins >= cost, canBuy: !s.paused && !done && unlocked && s.coins >= cost };
}

export function buyHelperUpgrade(s, owner, kind) {
  const info = helperUpgradeInfo(s, owner, kind);
  if (!info?.canBuy) return false;
  const h = ensureWork(s).helpers[owner];
  s.coins -= info.cost;
  if (kind === "hire") h.hired = true;
  else h[kind]++;
  s.upgrades.auto = 1;
  return true;
}

// This old entry point is kept for earlier saves, tests and API integrations.
export function grantLegacyHelpers(s) {
  const work = ensureWork(s);
  for (const owner of HELPER_IDS) work.helpers[owner].hired = true;
}

export function boostStatus(s) {
  const b = s.farmWork?.boost ?? freshFarmWork().boost, powerLevel = tier(b.power, 3), coolingLevel = tier(b.cooling, 3), heat = finite(b.heat, 0, 100);
  return { powerLevel, coolingLevel, heat, overheated: heat >= 100 || b.overheated === true && heat > BOOST_HEAT.recoverAt, strength: BOOST_HEAT.strength[powerLevel], heatPerUse: BOOST_HEAT.perUse[coolingLevel], coolPerSecond: BOOST_HEAT.cooling[coolingLevel], capacity: BOOST_HEAT.capacity, recoverAt: BOOST_HEAT.recoverAt };
}

export function boostUpgradeInfo(s, kind) {
  const u = BOOST_UPGRADES.find(x => x.id === kind);
  if (!u) return null;
  const level = tier(s.farmWork?.boost?.[kind], u.costs.length), max = u.costs.length, done = level >= max, cost = done ? 0 : u.costs[level], requiredLevel = done ? 1 : u.levels[level], unlocked = patchLevel(s).level >= requiredLevel;
  return { id: kind, name: u.name, level, max, cost, requiredLevel, done, unlocked, affordable: s.coins >= cost, canBuy: !s.paused && !done && unlocked && s.coins >= cost };
}

export function buyBoostUpgrade(s, kind) {
  const info = boostUpgradeInfo(s, kind);
  if (!info?.canBuy) return false;
  s.coins -= info.cost; ensureWork(s).boost[kind]++;
  return true;
}

// Accepted taps alone heat the candle or count towards the eighth-tap pumpkin.
export function useBoost(s) {
  if (s.paused) return { accepted: false, reason: "paused" };
  const status = boostStatus(s), work = ensureWork(s), b = work.boost;
  if (status.overheated) return { accepted: false, reason: "overheated" };
  if (s.time - b.lastUse < .14 - 1e-9) return { accepted: false, reason: "cooldown" };
  b.lastUse = s.time; b.heat = Math.min(100, status.heat + status.heatPerUse); b.overheated = b.heat >= 100;
  s.lastTap = s.time;
  return { accepted: true, strength: status.strength };
}

// Cooling uses active game time: a tea break or a reload cannot cool for free.
export function updateBoost(s, dt) {
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return;
  const b = ensureWork(s).boost, status = boostStatus(s);
  b.heat = Math.max(0, status.heat - status.coolPerSecond * dt);
  if (b.heat <= BOOST_HEAT.recoverAt) b.overheated = false;
}

// Actual crop references are transient: a new plant in the same bed is still a
// different job. Each helper reserves one target before either clock advances.
const helperJobs = new WeakMap();
const orderedPlots = (s, h) => Array.from({ length: openPlots(s) }, (_, k) => (h.cursor + k) % openPlots(s));
const ripeForHelpers = (s, i) => s.plots[i]?.phase === "ready" && s.time - (s.plots[i].ripe ?? -Infinity) >= HELPER_WAIT;
function validJob(s, job) {
  if (!job || job.plot < 0 || job.plot >= openPlots(s) || s.plots[job.plot] !== job.crop) return false;
  if (job.kind === "plant") return job.crop.phase === "empty";
  if (job.kind === "water") return wateringStatus(s, job.plot).available;
  return ripeForHelpers(s, job.plot) && !barnBlocked(s);
}

// A cyclic scan shares jobs without permanently favouring the first few beds.
function nextJob(s, h, reserved) {
  const indices = orderedPlots(s, h).filter(i => !reserved.has(i));
  const pick = !barnBlocked(s) && indices.find(i => ripeForHelpers(s, i));
  if (pick !== false && pick !== undefined) return { kind: "harvest", plot: pick, crop: s.plots[pick] };
  const empty = indices.find(i => s.plots[i].phase === "empty");
  if (empty !== undefined) return { kind: "plant", plot: empty, crop: s.plots[empty] };
  const water = indices.find(i => wateringStatus(s, i).available);
  return water === undefined ? null : { kind: "water", plot: water, crop: s.plots[water] };
}

// One completion per owner per step bounds catch-up and prevents a field-wide
// sweep. Capacity is ripe plots per picking turn, never extra crop yield.
export function updateHelpers(s, dt, events) {
  if (s.paused || s.handsOn || !Number.isFinite(dt) || dt <= 0) return;
  const work = ensureWork(s), reserved = new Set(), entries = HELPER_IDS.map(owner => ({ owner, h: work.helpers[owner], status: helperStatus(s, owner), job: null }));
  // Retain every valid reservation first, so a helper starting a new job cannot
  // steal a target whose other helper is already most of the way through.
  for (const entry of entries) {
    const { h, status } = entry, previous = helperJobs.get(h);
    if (status.hired && validJob(s, previous) && !reserved.has(previous.plot)) {
      entry.job = previous; reserved.add(previous.plot);
    } else { helperJobs.delete(h); h.timer = 0; h.kind = null; }
  }
  for (const entry of entries) {
    if (!entry.status.hired || entry.job) continue;
    entry.job = nextJob(s, entry.h, reserved);
    if (!entry.job) continue;
    helperJobs.set(entry.h, entry.job); entry.h.kind = entry.job.kind; reserved.add(entry.job.plot);
  }
  for (const { owner, h, status, job } of entries) {
    if (!job) continue;
    h.timer += dt;
    const seconds = job.kind === "plant" ? status.plantSeconds : job.kind === "water" ? status.waterSeconds : status.pickSeconds;
    if (h.timer + 1e-9 < seconds) continue;
    h.timer = 0; h.kind = null; helperJobs.delete(h); reserved.delete(job.plot);
    if (job.kind === "harvest") {
      // Extra basket places never take another helper's reserved primary crop.
      const candidates = [job.plot, ...orderedPlots(s, h).filter(i => i !== job.plot && !reserved.has(i) && ripeForHelpers(s, i))];
      for (const i of candidates.slice(0, status.capacity)) {
        const count = harvest(s, i);
        if (!count) break;
        h.cursor = (i + 1) % openPlots(s); events.push({ type: "harvest", owner, plot: i, count });
      }
    } else if (job.kind === "plant" ? plant(s, job.plot) : waterPlot(s, job.plot)) {
      h.cursor = (job.plot + 1) % openPlots(s); events.push({ type: job.kind, owner, plot: job.plot });
    }
  }
}
