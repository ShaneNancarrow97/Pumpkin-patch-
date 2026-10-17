import { decodeSave, fresh, upgrades } from "./model.mjs";
import { decodeInventory, migrateLegacyInventory } from "./inventory.js";
import { decodeShop, freshShop } from "./shop.js";
import { decodeStall, freshStall } from "./stall.js";
import { freshHouse, restoreHouse, validHouseRooms } from "./house-model.mjs";
import { restoreWardrobe, validWardrobe } from "./costume-model.mjs";
import { restorePlotLevels } from "./plot-model.mjs";
import { freshRoomStyles } from "../content/rooms.mjs";
import { pumpkinVarieties } from "../content/products.js";

// The schema this build writes. Schemas 10-19 belong to the lost 2.11-2.16
// builds, so this line of development moves to 20 when the format changes.
var SAVE_SCHEMA = fresh().version;
var record = (x) => !!x && typeof x === "object" && !Array.isArray(x);
var count = (x) => Number.isSafeInteger(x) && x >= 0;

// The schema a raw save claims to be, or null when it is not a save at all.
function saveSchema(raw) {
  try {
    const x = JSON.parse(raw);
    return record(x) && Number.isInteger(x.version) ? x.version : null;
  } catch {
    return null;
  }
}

// Loads a save, resetting only the sections that fail validation.
// Returns { state, repairs } where repairs names each reset section, or null
// when the save cannot be read at all or comes from a newer game.
function repairSave(raw) {
  let x;
  try {
    x = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!record(x) || !Number.isInteger(x.version) || x.version < 1 || x.version > SAVE_SCHEMA) return null;
  const strict = decodeSave(raw);
  if (strict) return { state: strict, repairs: [] };

  const v = x.version, base = fresh(), repairs = [];
  const fix = (label) => { if (!repairs.includes(label)) repairs.push(label); };

  for (const key of ["coins", "earned", "sold", "harvested", "elapsed", "clicks"]) {
    if (!Number.isFinite(x[key]) || x[key] < 0) {
      x[key] = base[key];
      fix(key === "coins" ? "coins" : "lifetime totals");
    }
  }

  if (!record(x.upgrades)) x.upgrades = {};
  for (const u of upgrades) {
    const level = x.upgrades[u.id];
    if (!Number.isInteger(level) || level < 0 || level > u.max) {
      x.upgrades[u.id] = Number.isFinite(level) ? Math.max(0, Math.min(u.max, Math.floor(level))) : 0;
      fix("farm upgrades");
    }
  }

  const prices = pumpkinVarieties.map((variety) => variety.price);
  const goodPlot = (p) => record(p) && ["empty", "growing", "ready"].includes(p.phase) && Number.isFinite(p.progress) && p.progress >= 0 && p.progress <= 1 && prices.includes(p.price);
  if (!Array.isArray(x.plots) || x.plots.length !== 12) {
    x.plots = base.plots;
    fix("plots");
  } else if (!x.plots.every(goodPlot)) {
    x.plots = x.plots.map((p) => goodPlot(p) ? p : { phase: "empty", progress: 0, price: prices.includes(p?.price) ? p.price : prices[0] });
    fix("plots");
  }

  if (!Array.isArray(x.achievements)) {
    x.achievements = [];
    fix("achievements");
  }

  if (v === 1) {
    if (!migrateLegacyInventory(x.inventory)) {
      x.inventory = Array.isArray(x.inventory) ? x.inventory.filter((price) => prices.includes(price)) : [];
      fix("stored pumpkins");
    }
  } else if (!decodeInventory(x.inventory)) {
    x.inventory = salvageInventory(x.inventory);
    fix("stored pumpkins");
  }
  const inventory = v === 1 ? migrateLegacyInventory(x.inventory) : decodeInventory(x.inventory);

  if (v >= 4 && !decodeShop(x.shop, inventory)) {
    x.shop = salvageShop(x.shop);
    fix("Skyla's shop");
  }

  if (v >= 5) {
    const levelsOk = Array.isArray(x.plotLevels) && x.plotLevels.length === 12 && x.plotLevels.every((l) => Number.isInteger(l) && l >= 0 && l <= 3);
    if (!levelsOk) {
      x.plotLevels = restorePlotLevels(Array.isArray(x.plotLevels) && x.plotLevels.length === 12 ? x.plotLevels : null, x.plots);
      fix("pumpkin varieties");
    }
    const crops = Array.isArray(x.plotCrops) && x.plotCrops.length === 12 ? x.plotCrops : [];
    const fixedCrops = x.plotLevels.map((level, i) => {
      const chosen = pumpkinVarieties.findIndex((variety) => "pumpkin-" + variety.id === crops[i]);
      return chosen >= 0 && chosen <= level ? crops[i] : "pumpkin-" + pumpkinVarieties[level].id;
    });
    if (JSON.stringify(fixedCrops) !== JSON.stringify(x.plotCrops)) {
      x.plotCrops = fixedCrops;
      fix("crop choices");
    }
  }

  if (v >= 7 && !validHouseRooms(x.house)) {
    x.house = salvageHouse(x.house, v);
    fix("house");
  }
  if (v >= 8 && !validWardrobe(x.wardrobe)) {
    x.wardrobe = restoreWardrobe(x.wardrobe);
    fix("outfits");
  }

  if (v >= 9) {
    const receipts = record(x.stall) && Array.isArray(x.stall.receipts) ? x.stall.receipts : [];
    if (!count(x.nextVisitor)) {
      x.nextVisitor = receipts.reduce((n, r) => count(r?.visitorId) ? Math.max(n, r.visitorId + 1) : n, 0);
      fix("roadside stall");
    }
    if (!decodeStall(x.stall, x.nextVisitor)) {
      x.stall = salvageStall(x.stall, x.nextVisitor);
      fix("roadside stall");
    }
    const shop = x.shop;
    if (x.stall.income + shop.income > x.earned || x.stall.served + shop.served > x.sold) {
      x.earned = Math.max(x.earned, x.stall.income + shop.income);
      x.sold = Math.max(x.sold, x.stall.served + shop.served);
      fix("lifetime totals");
    }
  }

  const state = decodeSave(JSON.stringify(x));
  return state ? { state, repairs } : null;
}

// Keeps every lot that is valid on its own; held stock is released.
function salvageInventory(raw) {
  const lots = [];
  for (const lot of record(raw) && Array.isArray(raw.lots) ? raw.lots : []) {
    const candidate = { ...lot, id: "lot-" + lots.length };
    if (decodeInventory({ version: 1, nextLot: 1, nextReservation: 0, lots: [{ ...candidate, id: "lot-0" }], reservations: [] })) lots.push(candidate);
  }
  return { version: 1, nextLot: lots.length, nextReservation: 0, lots, reservations: [] };
}

// Keeps paid shop upgrades and earnings; customers in the shop go home.
function salvageShop(raw) {
  const s = freshShop(), r = record(raw) ? raw : {};
  const level = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : 0;
  s.unlocked = r.unlocked === true;
  s.capacityLevel = level(r.capacityLevel, 3);
  s.displayLevel = level(r.displayLevel, 1);
  s.checkoutLevel = level(r.checkoutLevel, 2);
  for (const key of ["income", "itemsSold", "served", "invested", "nextCustomer"]) if (count(r[key])) s[key] = r[key];
  return s;
}

function salvageStall(raw, nextVisitor) {
  const s = freshStall(), r = record(raw) ? raw : {};
  for (const key of ["income", "itemsSold", "served", "missedBudget", "missedStock"]) if (count(r[key])) s[key] = r[key];
  return decodeStall(s, nextVisitor) || freshStall();
}

// Keeps every purchase; falls back to default room styles, then a fresh layout.
function salvageHouse(raw, version) {
  const restored = restoreHouse(raw, version);
  if (validHouseRooms(restored)) return restored;
  const plain = { ...restored, activeRoom: "parlour", roomStyles: freshRoomStyles() };
  if (validHouseRooms(plain)) return plain;
  const h = freshHouse();
  h.level = restored.level;
  h.owned = [...new Set([...h.owned, ...restored.owned])];
  h.ownedRoomStyles = restored.ownedRoomStyles;
  return validHouseRooms(h) ? h : freshHouse();
}

export { SAVE_SCHEMA, repairSave, saveSchema };
