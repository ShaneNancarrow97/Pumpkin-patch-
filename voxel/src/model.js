// Game rules for the voxel build. Pure: no DOM, no three.js, so the tests run it
// in Node. One step of update() is a slice of game time. The rules live in
// rules/; this file puts the state together, loads old saves and runs a step.
import { VARIETIES, freshPlots, freshStreak, freshUpgrades, updateFarm } from "./rules/farm.js";
import { freshStock } from "./rules/stock.js";
import { VISITOR_UPGRADES, closeForTheNight, freshShop, freshStall, freshVisitorUpgrades, updateShop, updateStall } from "./rules/selling.js";
import { freshHouse, restoreHouse } from "./rules/house.js";
import { freshLooks, freshWardrobe, restoreWardrobe } from "./rules/wardrobe.js";
import { awardLevels, freshProgression, restoreProgression } from "./rules/levels.js";
import { FAVOURS, checkMemories } from "./rules/progress.js";

export * from "./rules/farm.js";
export * from "./rules/stock.js";
export * from "./rules/selling.js";
export * from "./rules/house.js";
export * from "./rules/wardrobe.js";
export * from "./rules/progress.js";

export const STATE_VERSION = 4;
export * from "./rules/levels.js";

export function freshState() {
  return {
    version: STATE_VERSION,
    coins: 40, earned: 0, sold: 0, harvested: 0, taps: 0, time: 0,
    plots: freshPlots(), plotLevels: Array(12).fill(0), plotCrops: Array(12).fill(0),
    upgrades: freshUpgrades(), visitorUpgrades: freshVisitorUpgrades(), helperTimer: 0, streak: freshStreak(),
    stock: freshStock(), holds: [],
    stall: freshStall(), visitors: [], arriving: [], nextVisitor: 0, nextParty: 0, visitorTimer: 3,
    shop: freshShop(),
    house: freshHouse(),
    wardrobe: freshWardrobe(), looks: freshLooks(),
    claimed: [], memories: [], progression: freshProgression(), paused: false,
  };
}

const count = (x) => (Number.isSafeInteger(x) && x >= 0 ? x : 0);
const money = (x) => (Number.isFinite(x) && x >= 0 ? x : 0);
// The first voxel saves (version 1, unnumbered) had different upgrades, a list
// of pumpkins for stock, and five goals under other names. Version 2 saves lack
// only the visitor upgrades, which start at nothing.
const OLD_GOALS = { ghost: "basket", witch: "welcome", bram: "magic", bones: "seeds", patch: "market" };

// Builds a valid state from whatever was saved, keeping everything that makes sense.
export function restoreState(raw) {
  const s = freshState();
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.plots) || raw.plots.length !== 12) return s;
  const v1 = !(raw.version >= 2);
  for (const k of ["coins", "earned"]) s[k] = money(raw[k]);
  for (const k of ["sold", "harvested", "taps", "nextVisitor", "nextParty"]) s[k] = count(raw[k]);
  s.time = money(raw.time);
  s.paused = raw.paused === true;
  s.plotLevels = raw.plotLevels?.length === 12 ? raw.plotLevels.map((l) => Math.max(0, Math.min(3, count(l)))) : s.plotLevels;
  s.plotCrops = s.plotLevels.map((level, i) => (v1 ? level : Math.min(level, count(raw.plotCrops?.[i]))));
  s.plots = raw.plots.map((p, i) => {
    const variety = Math.min(3, count(p?.variety));
    return ["growing", "ready"].includes(p?.phase) ? { phase: p.phase, progress: Math.max(0, Math.min(1, Number(p.progress) || 0)), variety } : { phase: "empty", progress: 0, variety: s.plotCrops[i] };
  });
  const u = raw.upgrades ?? {};
  s.upgrades = v1
    ? { tools: Math.min(6, count(u.tools)), yield: 0, auto: Math.min(1, count(u.helper)), plots: Math.min(2, count(u.plots)), sign: Math.min(4, count(u.signs)) }
    : { tools: Math.min(6, count(u.tools)), yield: Math.min(5, count(u.yield)), auto: Math.min(1, count(u.auto)), plots: Math.min(2, count(u.plots)), sign: Math.min(4, count(u.sign)) };
  for (const v of VISITOR_UPGRADES) s.visitorUpgrades[v.id] = Math.min(v.costs.length, count(raw.visitorUpgrades?.[v.id]));
  if (Array.isArray(raw.stock) && v1) for (const v of raw.stock) if (VARIETIES[v]) s.stock[v]++;
  if (Array.isArray(raw.stock) && !v1 && raw.stock.length === 4) s.stock = raw.stock.map(count);
  if (raw.streak) for (const k of Object.keys(s.streak)) s.streak[k] = money(raw.streak[k]);
  if (raw.stall) for (const k of ["income", "itemsSold", "served", "missedBudget", "missedStock", "cocoa"]) s.stall[k] = count(raw.stall[k]);
  if (raw.shop && typeof raw.shop === "object") {
    const shop = raw.shop;
    s.shop.unlocked = shop.unlocked === true;
    s.shop.capacityLevel = Math.min(3, count(shop.capacityLevel));
    s.shop.displayLevel = Math.min(1, count(shop.displayLevel));
    s.shop.checkoutLevel = Math.min(2, count(shop.checkoutLevel));
    if (Array.isArray(shop.displays) && shop.displays.length === 4) s.shop.displays = shop.displays.map((d, i) => (VARIETIES[d] && shop.displays.indexOf(d) === i ? d : null));
    for (const k of ["nextCustomer", "income", "itemsSold", "served", "invested"]) s.shop[k] = count(shop[k]);
  }
  s.house = restoreHouse(raw.house);
  s.wardrobe = restoreWardrobe(raw.wardrobe);
  if (raw.looks && Array.isArray(raw.looks.owned)) s.looks = { natalie: raw.looks.natalie ?? "olive", shane: raw.looks.shane ?? "black", owned: [...new Set(["olive", "black", ...raw.looks.owned])] };
  const claimed = (Array.isArray(raw.claimed) ? raw.claimed : []).map((id) => (v1 ? OLD_GOALS[id] : id));
  s.claimed = [...new Set(claimed.filter((id) => FAVOURS.some((f) => f.id === id)))];
  s.memories = Array.isArray(raw.memories) ? [...new Set(raw.memories.filter((id) => typeof id === "string"))] : [];
  s.progression = restoreProgression(raw.progression, s, !(raw.version >= 4));
  closeForTheNight(s);
  return s;
}

// What is worth saving: everything except who is out walking or shopping.
export const saveData = (s) => ({ ...s, visitors: [], arriving: [], holds: [], shop: { ...s.shop, customers: [] } });

// Advances the farm by dt seconds and returns what happened, for the scene to show.
export function update(s, dt) {
  const events = [];
  s.time += dt;
  updateFarm(s, dt, events);
  updateStall(s, dt, events);
  updateShop(s, dt, events);
  checkMemories(s, events);
  for (const level of awardLevels(s)) events.push({ type: "level-up", level });
  return events;
}
