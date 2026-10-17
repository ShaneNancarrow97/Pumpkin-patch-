import { freshHouse, restoreHouse, validHouseRooms } from "./house-model.mjs";
import { economy } from "../content/economy.js";
import { pumpkinVarieties } from "../content/products.js";
import { addLegacyStock, decodeInventory, freshInventory, migrateLegacyInventory } from "./inventory.js";
import { decodeShop, freshShop, persistentShopHolds, updateShop } from "./shop.js";
import { createPasserby, decodeStall, finishMissedVisit, freshStall, sellToPasserby } from "./stall.js";
import { freshWardrobe, restoreWardrobe, validWardrobe } from "./costume-model.mjs";
import { freshFestival, restoreFestival } from "./festival-model.mjs";
import { freshPlotCrops, freshPlotLevels, restorePlotCrops, restorePlotLevels, selectedPlotVariety } from "./plot-model.mjs";
import { stallVisit } from "../content/visitor-routes.mjs";

var SAVE_KEY = "sn-pumpkin-patch-halloween-v2";
var upgrades = [
  { id: "tools", name: "A better watering can", description: "Pumpkins grow 18% faster.", icon: "♧", cost: 90, max: 6 },
  { id: "yield", name: "A little extra love", description: "One more pumpkin per harvest.", icon: "♡", cost: 150, max: 5 },
  { id: "auto", name: "Helping hands", description: "Shane & Natalie plant and pick for you.", icon: "☞", cost: 500, max: 1 },
  { id: "plots", name: "Room for more", description: "Make space for 3 more pumpkin plots.", icon: "▦", cost: 300, max: 2 },
  { id: "sign", name: "Spread the word", description: "Visitors arrive 10% more often.", icon: "⚑", cost: 400, max: 3 }
];
function fresh() {
  return { version: 9, stall: freshStall(), shop: freshShop(), wardrobe: freshWardrobe(), house: freshHouse(), festival: freshFestival(), plotLevels: freshPlotLevels(), plotCrops: freshPlotCrops(), coins: 30, inventory: freshInventory(), earned: 0, sold: 0, harvested: 0, clicks: 0, elapsed: 0, plots: Array.from({ length: 12 }, () => ({ phase: "empty", progress: 0, price: 12 })), upgrades: { tools: 0, yield: 0, auto: 0, plots: 0, sign: 0 }, autoTimer: 0, visitorTimer: 2, visitors: [], nextVisitor: 0, paused: false, sound: false, music: true, musicVolume: 0.32, achievements: [], savedAt: Date.now() };
}
function unlocked(s) {
  return 6 + s.upgrades.plots * 3;
}
function growthTime(s) {
  return 22 * Math.pow(0.82, s.upgrades.tools);
}
function price(s, i) {
  return i === void 0 ? Math.max(...s.plotLevels.slice(0, unlocked(s)).map((level2) => pumpkinVarieties[level2].price)) : selectedPlotVariety(s, i).price;
}
function cost(s, id) {
  const u = upgrades.find((x) => x.id === id);
  return Math.round(u.cost * Math.pow(economy.farmCostMultiplier, s.upgrades[id]));
}
function plant(s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= unlocked(s) || s.plots[i].phase !== "empty" || s.paused)
    return false;
  s.plots[i] = { phase: "growing", progress: 0, price: price(s, i) };
  return true;
}
function harvest(s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= unlocked(s))
    return 0;
  const p = s.plots[i];
  if (i >= unlocked(s) || p.phase !== "ready" || s.paused)
    return 0;
  const n = 1 + s.upgrades.yield;
  if (!addLegacyStock(s.inventory, p.price, n))
    return 0;
  s.harvested += n;
  s.plots[i] = { phase: "empty", progress: 0, price: price(s, i) };
  return n;
}
function click(s) {
  if (s.paused)
    return { boost: false, reward: 0 };
  s.clicks++;
  const growing = s.plots.slice(0, unlocked(s)).filter((p) => p.phase === "growing");
  growing.forEach((p) => {
    p.progress = Math.min(1, p.progress + 1.5 / growthTime(s));
    if (p.progress >= 1)
      p.phase = "ready";
  });
  let reward = 0;
  if (!growing.length && s.clicks % 8 === 0) {
    if (addLegacyStock(s.inventory, price(s))) {
      s.harvested++;
      reward = 1;
    }
  }
  return { boost: !!growing.length, reward };
}
function buy(s, id) {
  const u = upgrades.find((x) => x.id === id);
  if (!u || s.upgrades[id] >= u.max || s.coins < cost(s, id) || s.paused)
    return false;
  s.coins -= cost(s, id);
  s.upgrades[id]++;
  return true;
}
function update(s, dt) {
  if (s.paused)
    return [];
  const events = [];
  s.elapsed += dt;
  s.plots.slice(0, unlocked(s)).forEach((p, i) => {
    if (p.phase === "growing") {
      p.progress = Math.min(1, p.progress + dt / growthTime(s));
      if (p.progress >= 1) {
        p.phase = "ready";
        events.push({ type: "ripe", index: i });
      }
    }
  });
  if (s.upgrades.auto) {
    s.autoTimer += dt;
    if (s.autoTimer >= 2) {
      s.autoTimer %= 2;
      for (let i = 0; i < unlocked(s); i++) {
        if (s.plots[i].phase === "ready") {
          const count3 = harvest(s, i);
          events.push({ type: "harvest", index: i, count: count3 });
        }
        if (s.plots[i].phase === "empty") {
          plant(s, i);
          events.push({ type: "plant", index: i });
        }
      }
    }
  }
  s.visitorTimer -= dt;
  if (s.visitorTimer <= 0) {
    s.visitorTimer += economy.outdoorArrivalSeconds * Math.pow(economy.advertisingFactor, s.upgrades.sign);
    if (s.nextVisitor < Number.MAX_SAFE_INTEGER) {
      s.visitors.push(createPasserby(s.nextVisitor++));
      events.push({ type: "arrival" });
    }
  }
  events.push(...updateShop(s, dt));
  for (const v of s.visitors) {
    v.age += dt;
    if (v.age >= stallVisit.arriveSeconds && !v.checked) {
      if (sellToPasserby(s, v)) {
        events.push({ type: "sale", route: "stall", amount: v.amount, quantity: v.quantity, visitor: v.id });
      } else if (v.age >= stallVisit.arriveSeconds + stallVisit.patienceSeconds) {
        finishMissedVisit(s, v);
        events.push({ type: "empty", reason: v.outcome, visitor: v.id });
      }
    }
  }
  s.visitors = s.visitors.filter((v) => v.age < (v.checked ? v.leaveAt + stallVisit.leaveSeconds : stallVisit.arriveSeconds + stallVisit.patienceSeconds + stallVisit.leaveSeconds));
  const conditions = { first: s.harvested >= 5, visitors: s.sold >= 10, moon: s.plotLevels.some((level2) => level2 > 0), helper: s.upgrades.auto > 0, empire: s.earned >= 1e3, clicker: s.clicks >= 100 };
  for (const [id, met] of Object.entries(conditions))
    if (met && !s.achievements.includes(id)) {
      s.achievements.push(id);
      events.push({ type: "achievement", id });
    }
  return events;
}
function serialize(s) {
  return JSON.stringify({ ...s, inventory: { ...s.inventory, reservations: persistentShopHolds(s.shop, s.inventory) }, visitors: [], paused: false, savedAt: Date.now() });
}
function decodeSave(raw) {
  try {
    const x = JSON.parse(raw);
    if (!x || ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(x.version) || !Array.isArray(x.plots) || x.plots.length !== 12 || !Array.isArray(x.achievements) || !x.upgrades)
      return null;
    const inventory = x.version === 1 ? migrateLegacyInventory(x.inventory) : decodeInventory(x.inventory);
    if (!inventory)
      return null;
    const state = fresh();
    for (const key of ["coins", "earned", "sold", "harvested", "elapsed", "clicks"]) {
      if (!Number.isFinite(x[key]) || x[key] < 0)
        return null;
      state[key] = x[key];
    }
    for (const upgrade of upgrades) {
      const level2 = x.upgrades[upgrade.id];
      if (!Number.isInteger(level2) || level2 < 0 || level2 > upgrade.max)
        return null;
      state.upgrades[upgrade.id] = level2;
    }
    if (x.plots.some((plot) => !plot || !["empty", "growing", "ready"].includes(plot.phase) || !Number.isFinite(plot.progress) || plot.progress < 0 || plot.progress > 1 || !pumpkinVarieties.some((variety) => variety.price === plot.price)))
      return null;
    state.shop = x.version >= 4 ? decodeShop(x.shop, inventory) : freshShop();
    if (!state.shop) return null;
    state.inventory = { ...inventory, reservations: persistentShopHolds(state.shop, inventory) };
    state.plots = x.plots.map(({ phase, progress, price: price2 }) => ({ phase, progress, price: price2 }));
    state.achievements = [...new Set(x.achievements.filter((id) => ["first", "visitors", "moon", "helper", "empire", "clicker"].includes(id)))];
    if (x.version >= 7 && !validHouseRooms(x.house)) return null;
    state.house = restoreHouse(x.house, x.version);
    if (x.version >= 8 && !validWardrobe(x.wardrobe)) return null;
    state.wardrobe = restoreWardrobe(x.wardrobe);
    state.festival = restoreFestival(x.festival, state.elapsed);
    if (x.version >= 5 && (!Array.isArray(x.plotLevels) || x.plotLevels.length !== 12 || x.plotLevels.some((level2) => !Number.isInteger(level2) || level2 < 0 || level2 > 3))) return null;
    state.plotLevels = restorePlotLevels(x.plotLevels, state.plots);
    state.plotCrops = restorePlotCrops(x.plotCrops, state.plotLevels, x.version);
    if (!state.plotCrops) return null;
    state.sound = !!x.sound;
    state.music = x.music !== false;
    state.musicVolume = Number.isFinite(x.musicVolume) ? Math.min(1, Math.max(0, x.musicVolume)) : 0.32;
    state.autoTimer = Number.isFinite(x.autoTimer) ? Math.max(0, Math.min(2, x.autoTimer)) : 0;
    state.nextVisitor = Number.isSafeInteger(x.nextVisitor) && x.nextVisitor >= 0 ? x.nextVisitor : 0;
    if (x.version >= 9) {
      if (!Number.isSafeInteger(x.nextVisitor) || x.nextVisitor < 0) return null;
      state.stall = decodeStall(x.stall, state.nextVisitor);
      if (!state.stall) return null;
      if (state.stall.income + state.shop.income > state.earned || state.stall.served + state.shop.served > state.sold) return null;
    }
    state.visitorTimer = Number.isFinite(x.visitorTimer) ? Math.max(0, Math.min(economy.outdoorArrivalSeconds, x.visitorTimer)) : 2;
    state.savedAt = Number.isFinite(x.savedAt) && x.savedAt >= 0 ? x.savedAt : Date.now();
    return state;
  } catch {
    return null;
  }
}

export { SAVE_KEY, buy, click, cost, decodeSave, fresh, growthTime, harvest, plant, price, serialize, unlocked, update, upgrades };
