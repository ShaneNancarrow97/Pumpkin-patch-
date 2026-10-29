import { updateDining } from "./rules/cooking-dining.js";
// Game rules for the voxel build. Pure: no DOM, no three.js, so the tests run it
// in Node. One step of update() is a slice of game time. The rules live in
// rules/; this file puts the state together, loads old saves and runs a step.
import { UPGRADES, VARIETIES, MAX_VARIETY_INDEX, VARIETY_COUNT, STREAK, freshPlots, freshStreak, freshUpgrades, updateFarm } from "./rules/farm.js";
import { MAX_PLOTS } from "./content/farm-layout.js";
import { freshStock, freshBatches, restoreFresh, settleFresh } from "./rules/stock.js";
import { freshWanted, restoreWanted, updateWanted } from "./rules/market.js";
import { freshOrders, restoreOrders, updateOrders } from "./rules/orders.js";
import { VISITOR_UPGRADES, closeForTheNight, freshShop, freshStall, freshVisitorUpgrades, freshBigSpender, restoreBigSpender, updateShop, updateStall } from "./rules/selling.js";
import { freshHouse, restoreHouse } from "./rules/house.js";
import { freshLooks, freshWardrobe, restoreWardrobe } from "./rules/wardrobe.js";
import { awardLevels, freshProgression, restoreProgression } from "./rules/levels.js";
import { recordHomeActivity } from "./rules/home-goals.js";
import { freshFestival, restoreFestival, updateFestival } from "./rules/festival-meadow.js";
import { freshCustomerCare, restoreCustomerCare } from "./rules/customer-care.js";
import { FAVOURS, checkMemories } from "./rules/progress.js";
import { freshEstate, restoreEstate } from "./rules/house-estate.js";
import { freshHollowHouse, restoreHollowHouse, updateHollowHouse, saveHollowVisitors, restoreHollowVisitors } from "./rules/hollow-house.js";
import { restoreIntroSeen } from "./rules/intro.js";
import { freshSocial, recordNews } from "./rules/meadow-talk.js";
import { freshHayride, restoreHayride, updateHayride, saveHayrideVisitors, restoreHayrideVisitors } from "./rules/hayride.js";
import { freshVisitorEvents, restoreVisitorEvents, updateVisitorEvents } from "./rules/visitor-events.js";
import { freshKitchen, restoreKitchen, updateKitchen } from "./rules/cooking.js";
import { freshCleanliness, restoreCleanliness, updateCleanliness } from "./rules/cleanliness.js";

export * from "./rules/farm.js";
export * from "./rules/stock.js";
export * from "./rules/market.js";
export * from "./rules/orders.js";
export * from "./rules/selling.js";
export * from "./rules/house.js";
export * from "./rules/wardrobe.js";
export * from "./rules/progress.js";
export * from "./rules/unlocks.js";

export const STATE_VERSION = 14;
export * from "./rules/visitor-events.js";
export * from "./content/visitor-events.js";
export * from "./content/farm-layout.js";
export * from "./rules/house-estate.js";
export * from "./rules/piece-colours.js";
export * from "./rules/hollow-house.js";
export * from "./rules/festival-meadow.js";
export * from "./rules/customer-care.js";
export * from "./rules/guest-needs.js";
export * from "./rules/levels.js";
export * from "./rules/intro.js";
export * from "./rules/meadow-chat.js";
export { recordNews, topicsFor } from "./rules/meadow-talk.js";
export * from "./rules/hayride.js";
export * from "./content/cooking.js";
export * from "./rules/cooking.js";
export * from "./rules/cooking-sales.js";
export * from "./content/kitchen-equipment.js";
export * from "./rules/kitchen-equipment.js";
export * from "./rules/cooking-mix.js";
export * from "./rules/cleanliness.js";

export function freshState() {
  return {
    version: STATE_VERSION,
    coins: 40, earned: 0, sold: 0, harvested: 0, taps: 0, time: 0, wholesale: 0,
    plots: freshPlots(), plotLevels: Array(MAX_PLOTS).fill(0), plotCrops: Array(MAX_PLOTS).fill(0),
    upgrades: freshUpgrades(), visitorUpgrades: freshVisitorUpgrades(), helperTimer: 0, streak: freshStreak(),
    stock: freshStock(), fresh: freshBatches(), wanted: freshWanted(), orders: freshOrders(), holds: [],
    visitorEvents: freshVisitorEvents(), stall: freshStall(), visitors: [], arriving: [], nextVisitor: 0, nextParty: 0, visitorTimer: 3,
    shop: freshShop(), bigSpender: freshBigSpender(), festival: freshFestival(), customerCare: freshCustomerCare(),
    house: freshHouse(), estate: freshEstate(), hollowHouse: freshHollowHouse(), hayride: freshHayride(), kitchen: freshKitchen(),
    wardrobe: freshWardrobe(), looks: freshLooks(),
    claimed: [], memories: [], progression: freshProgression(), paused: false, introSeen: false,
    cleanliness: freshCleanliness(),
    social: freshSocial(),                                                     // meadow news and chats: never saved
    handsOn: false,                                                            // the player is steering Shane or Natalie: never saved
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
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.plots) || ![12, MAX_PLOTS].includes(raw.plots.length)) return s;
  const v1 = !(raw.version >= 2);
  for (const k of ["coins", "earned"]) s[k] = money(raw[k]);
  for (const k of ["sold", "harvested", "taps", "nextVisitor", "nextParty", "wholesale"]) s[k] = count(raw[k]);
  s.time = money(raw.time);
  s.paused = raw.paused === true;
  s.plotLevels = Array.from({ length: MAX_PLOTS }, (_, i) => Math.min(MAX_VARIETY_INDEX, count(raw.plotLevels?.[i])));
  s.plotCrops = s.plotLevels.map((level, i) => (v1 ? level : Math.min(level, count(raw.plotCrops?.[i]))));
  s.plots = Array.from({ length: MAX_PLOTS }, (_, i) => {
    const p = raw.plots[i];
    const variety = Math.min(MAX_VARIETY_INDEX, count(p?.variety));
    return ["growing", "ready"].includes(p?.phase) ? { phase: p.phase, progress: Math.max(0, Math.min(1, Number(p.progress) || 0)), variety } : { phase: "empty", progress: 0, variety: s.plotCrops[i] };
  });
  // Tiers are kept and held to today's maxima (a save at an old maximum is a tier partway up now).
  const u = raw.upgrades ?? {}, top = Object.fromEntries(UPGRADES.map((x) => [x.id, x.max]));
  s.upgrades = v1
    ? { tools: Math.min(top.tools, count(u.tools)), yield: 0, auto: Math.min(top.auto, count(u.helper)), plots: Math.min(top.plots, count(u.plots)), sign: Math.min(top.sign, count(u.signs)) }
    : { tools: Math.min(top.tools, count(u.tools)), yield: Math.min(top.yield, count(u.yield)), auto: Math.min(top.auto, count(u.auto)), plots: Math.min(top.plots, count(u.plots)), sign: Math.min(top.sign, count(u.sign)) };
  s.upgrades.storage = Math.min(top.storage, count(u.storage));
  s.upgrades.cart = Math.min(top.cart, count(u.cart));
  for (const v of VISITOR_UPGRADES) s.visitorUpgrades[v.id] = Math.min(v.costs.length, count(raw.visitorUpgrades?.[v.id]));
  if (Array.isArray(raw.stock) && v1) for (const v of raw.stock) if (VARIETIES[v]) s.stock[v]++;
  if (Array.isArray(raw.stock) && !v1 && [4, VARIETY_COUNT].includes(raw.stock.length)) s.stock = Array.from({ length: VARIETY_COUNT }, (_, i) => count(raw.stock[i]));
  s.fresh = restoreFresh(raw.fresh, s);
  s.wanted = restoreWanted(raw.wanted, s);
  s.orders = restoreOrders(raw.orders, s);
  if (raw.streak) for (const k of Object.keys(s.streak)) s.streak[k] = money(raw.streak[k]);
  // A boost can't outlast one pick's hold and fade. Version 5's harvest rush had no level of its own: it comes back as its +50%.
  const st = s.streak;
  st.until = Math.min(st.until, s.time + STREAK.window);
  if (raw.version >= 5 && st.visitorBoostUntil > s.time) {
    st.visitorBoostUntil = Math.min(st.visitorBoostUntil, s.time + STREAK.window + STREAK.fade);
    st.visitorBoost = Math.min(STREAK.cap, typeof raw.streak?.visitorBoost === "number" ? st.visitorBoost : 0.5);
  } else st.visitorBoost = st.visitorBoostUntil = 0;
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
  s.estate = restoreEstate(raw.estate);
  s.hollowHouse = restoreHollowHouse(raw.hollowHouse);
  s.hayride = restoreHayride(raw.hayride);
  s.wardrobe = restoreWardrobe(raw.wardrobe);
  if (raw.looks && Array.isArray(raw.looks.owned)) s.looks = { natalie: raw.looks.natalie ?? "olive", shane: raw.looks.shane ?? "black", owned: [...new Set(["olive", "black", ...raw.looks.owned])] };
  const claimed = (Array.isArray(raw.claimed) ? raw.claimed : []).map((id) => (v1 ? OLD_GOALS[id] : id));
  s.claimed = [...new Set(claimed.filter((id) => FAVOURS.some((f) => f.id === id)))];
  s.memories = Array.isArray(raw.memories) ? [...new Set(raw.memories.filter((id) => typeof id === "string"))] : [];
  s.progression = restoreProgression(raw.progression, s, !(raw.version >= 4), !(raw.version >= 14));
  s.kitchen = restoreKitchen(raw.kitchen, s, raw.version);
  s.visitorEvents = restoreVisitorEvents(raw.visitorEvents, s);
  s.festival = restoreFestival(raw.festival);
  s.customerCare = restoreCustomerCare(raw.customerCare);
  s.bigSpender = restoreBigSpender(raw.bigSpender);
  s.cleanliness = restoreCleanliness(raw.cleanliness, s);
  s.introSeen = restoreIntroSeen(raw, s);
  closeForTheNight(s);
  restoreHollowVisitors(raw.hollowVisitors, s);
  restoreHayrideVisitors(raw.hayrideVisitors, s);
  return s;
}

// What is worth saving: everything except who is out walking or shopping.
export const saveData = (s) => ({ ...s, hollowVisitors: saveHollowVisitors(s), hayrideVisitors: saveHayrideVisitors(s), visitors: [], arriving: [], holds: [], shop: { ...s.shop, customers: [] }, kitchen: { ...s.kitchen, foodHolds: [], diners: [] }, social: undefined, handsOn: undefined });

// Advances the farm by dt seconds and returns what happened, for the scene to show.
export function update(s, dt) {
  const events = [];
  if (s.paused) return events;
  // The streak's boost is read from the clock, so the arrival timers just count down faster while it lasts.
  s.time += dt;
  updateFarm(s, dt, events);
  settleFresh(s); updateWanted(s, events); updateOrders(s, events);
  updateFestival(s);
  updateHollowHouse(s, dt, events);
  updateHayride(s, dt, events);
  updateKitchen(s, dt, events);
  for (const e of events) if (e.type === "cooking-complete" && e.station === "home") recordHomeActivity(s, "cook");
  updateVisitorEvents(s, dt, events);
  updateStall(s, dt, events);
  updateShop(s, dt, events);
  updateCleanliness(s, dt, events);
  updateDining(s, dt);
  checkMemories(s, events);
  for (const level of awardLevels(s)) events.push({ type: "level-up", level });
  recordNews(s, events);
  return events;
}
