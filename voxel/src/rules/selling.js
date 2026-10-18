// Selling: neighbours walking up the path to Skyla's stall, and, once it is
// open, customers browsing inside the Honest Pumpkin. Profiles, prices and
// timings are the main game's (src/core/stall.js, src/core/shop.js,
// src/content/stall.js, src/content/shop.js).
import { economy } from "../../../src/content/economy.js";
import { stallProfiles } from "../../../src/content/stall.js";
import { checkoutSeconds, customerModels, customerProfiles, shopCapacity, shopUpgradeCosts } from "../../../src/content/shop.js";
import { VARIETIES } from "./farm.js";
import { available, chooseBasket, commitHold, releaseHold } from "./stock.js";

const variety = (productId) => VARIETIES.findIndex((v) => "pumpkin-" + v.id === productId);
const PRICES = VARIETIES.map((v) => v.price);
// The voxel neighbours, in model.js's order: 0 ghost, 1 witch, 2 vampire, 3 skeleton, 4 scarecrow.
const KINDS = customerModels;
export const STALL_PROFILES = stallProfiles.map((p) => ({ ...p, preferred: p.preferred.map(variety) }));

// The stall: how long the walk up the path takes, and how long they wait for stock.
export const VISIT = { arrive: 7, patience: 6, linger: 1, leave: 4 };
export const freshStall = () => ({ income: 0, itemsSold: 0, served: 0, missedBudget: 0, missedStock: 0, receipts: [] });

function createPasserby(id) {
  const profile = id % STALL_PROFILES.length, p = STALL_PROFILES[profile];
  return { id, kind: id % KINDS.length, age: 0, profile, budget: p.budget, basketLimit: p.basketLimit, preferred: [...p.preferred], basket: [], amount: 0, quantity: 0, bought: null, outcome: "shopping", leaveAt: null };
}

function pay(s, receipt, ledger) {
  s.coins += receipt.amount; s.earned += receipt.amount; s.sold++;
  ledger.income += receipt.amount; ledger.itemsSold += receipt.quantity; ledger.served++;
}

export function updateStall(s, dt, events) {
  s.visitorTimer -= dt;
  if (s.visitorTimer <= 0) {
    s.visitorTimer += economy.outdoorArrivalSeconds * Math.pow(economy.advertisingFactor, s.upgrades.sign);
    s.visitors.push(createPasserby(s.nextVisitor++));
    events.push({ type: "arrival" });
  }
  for (const v of s.visitors) {
    v.age += dt;
    if (v.leaveAt !== null || v.age < VISIT.arrive) continue;
    const owner = "visitor-" + v.id, lines = chooseBasket(s, v, [0, 1, 2, 3], owner, PRICES);
    if (lines) {
      const receipt = commitHold(s, owner);
      pay(s, receipt, s.stall);
      Object.assign(v, { basket: receipt.lines, amount: receipt.amount, quantity: receipt.quantity, bought: receipt.lines[0].variety, outcome: "bought", leaveAt: v.age + VISIT.linger });
      s.stall.receipts.unshift({ visitor: v.id, profile: v.profile, amount: receipt.amount, quantity: receipt.quantity, lines: receipt.lines });
      s.stall.receipts.length = Math.min(20, s.stall.receipts.length);
      events.push({ type: "sale", route: "stall", amount: receipt.amount, quantity: receipt.quantity, visitor: v.id });
    } else if (v.age >= VISIT.arrive + VISIT.patience) {
      v.outcome = available(s) > 0 ? "budget" : "soldout";
      s.stall[v.outcome === "budget" ? "missedBudget" : "missedStock"]++;
      v.leaveAt = v.age + VISIT.linger;
      events.push({ type: "missed", reason: v.outcome, visitor: v.id });
    }
  }
  s.visitors = s.visitors.filter((v) => v.leaveAt === null || v.age < v.leaveAt + VISIT.leave);
}

// The indoor shop: open it, then add room, display tables and a faster till.
export const SHOP_UPGRADES = [
  { id: "open", name: "Open the shop", text: "Customers come inside to browse the display tables." },
  { id: "capacity", name: "More room to browse", text: "More customers can shop at once." },
  { id: "displays", name: "Two more display tables", text: "Show four varieties instead of two." },
  { id: "checkout", name: "A faster till", text: "Skyla rings up each basket more quickly." },
];
export const SHOP_CAPACITY = shopCapacity;
export const CHECKOUT_SECONDS = checkoutSeconds;
export const freshShop = () => ({ unlocked: false, capacityLevel: 0, displayLevel: 0, checkoutLevel: 0, displays: [0, 1, null, null], customers: [], nextCustomer: 0, arrivalTimer: 2, income: 0, itemsSold: 0, served: 0, invested: 0 });

const shopLevel = (shop, id) => (id === "open" ? Number(shop.unlocked) : id === "capacity" ? shop.capacityLevel : id === "displays" ? shop.displayLevel : shop.checkoutLevel);
export const shopUpgradeCost = (s, id) => shopUpgradeCosts[id]?.[shopLevel(s.shop, id)];
export const displayCount = (shop) => (shop.displayLevel ? 4 : 2);

export function upgradeShop(s, id) {
  const price = shopUpgradeCost(s, id);
  if (price === undefined || s.coins < price || (id !== "open" && !s.shop.unlocked)) return false;
  s.coins -= price; s.shop.invested += price;
  if (id === "open") s.shop.unlocked = true;
  else s.shop[id === "capacity" ? "capacityLevel" : id === "displays" ? "displayLevel" : "checkoutLevel"]++;
  return true;
}

// Puts a variety on a display table (null clears it). Each variety shows once.
export function assignDisplay(s, slot, v) {
  const shop = s.shop;
  if (!shop.unlocked || !Number.isInteger(slot) || slot < 0 || slot >= displayCount(shop)) return false;
  if (v !== null && (!Number.isInteger(v) || !VARIETIES[v] || shop.displays.some((d, i) => i !== slot && d === v))) return false;
  shop.displays[slot] = v;
  return true;
}

function createCustomer(id, slot) {
  const p = customerProfiles[(id * 7) % customerProfiles.length];
  return { id, slot, kind: (id * 3 + Math.floor(id / 5)) % KINDS.length, budget: p.budget, basketLimit: p.basketLimit, preferred: p.preferred.map(variety), phase: "entering", remaining: 3, checkoutDuration: 0, basket: [], spent: 0, quantity: 0, outcome: "shopping" };
}
const occupied = (shop) => shop.customers.filter((c) => c.phase !== "leaving").length;

export function updateShop(s, dt, events) {
  const shop = s.shop;
  if (!shop.unlocked) return;
  shop.arrivalTimer -= dt;
  if (shop.arrivalTimer <= 0) {
    if (occupied(shop) < SHOP_CAPACITY[shop.capacityLevel]) {
      const used = new Set(shop.customers.filter((c) => c.phase !== "leaving").map((c) => c.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      shop.customers.push(createCustomer(shop.nextCustomer++, slot));
      shop.arrivalTimer += economy.indoorArrivalSeconds * Math.pow(economy.advertisingFactor, s.upgrades.sign);
    } else shop.arrivalTimer = 0.5;
  }
  const offered = shop.displays.slice(0, displayCount(shop)).filter((v) => v !== null);
  for (const c of shop.customers) {
    if (c.phase === "queue") continue;
    c.remaining = Math.max(0, c.remaining - dt);
    if (c.remaining > 1e-8) continue;
    if (c.phase === "entering") { c.phase = "browsing"; c.remaining = 4; }
    else if (c.phase === "browsing") {
      const lines = chooseBasket(s, c, offered, "customer-" + c.id, PRICES);
      if (lines) { c.basket = lines; c.phase = "queue"; }
      else { c.outcome = "unavailable"; c.phase = "leaving"; c.remaining = 3; events.push({ type: "missed", reason: "shop", customer: c.id }); }
    } else if (c.phase === "paying") {
      const receipt = commitHold(s, "customer-" + c.id);
      if (!receipt) { c.phase = "leaving"; c.remaining = 3; continue; }
      pay(s, receipt, shop);
      Object.assign(c, { spent: receipt.amount, quantity: receipt.quantity, outcome: "bought", phase: "leaving", remaining: 3 });
      events.push({ type: "sale", route: "shop", amount: receipt.amount, quantity: receipt.quantity, customer: c.id });
    }
  }
  shop.customers = shop.customers.filter((c) => c.phase !== "leaving" || c.remaining > 1e-8);
  if (!shop.customers.some((c) => c.phase === "paying")) {
    const next = shop.customers.find((c) => c.phase === "queue");
    if (next) { next.phase = "paying"; next.checkoutDuration = next.remaining = CHECKOUT_SECONDS[shop.checkoutLevel]; }
  }
}

// Customers and baskets are not saved: on load, everyone has gone home.
export function closeForTheNight(s) {
  for (const c of s.shop.customers) releaseHold(s, "customer-" + c.id);
  s.shop.customers = [];
  s.holds = [];
}
