import { economy } from "../content/economy.js";
import { findProduct, productCatalog } from "../content/products.js";
import { commitStock, reserveStock } from "./inventory.js";
import { checkoutSeconds, customerModels, customerProfiles, shopCapacity, shopUpgradeCosts, supportedCheckoutSeconds } from "../content/shop.js";

function freshShop() {
  return {
    version: 1,
    unlocked: false,
    capacityLevel: 0,
    displayLevel: 0,
    checkoutLevel: 0,
    displays: ["pumpkin-orange", "pumpkin-moonlight", null, null],
    customers: [],
    nextCustomer: 0,
    arrivalTimer: 2,
    income: 0,
    itemsSold: 0,
    served: 0,
    invested: 0,
    receipts: []
  };
}
function upgradeShop(state, id) {
  const s = state.shop;
  if (state.paused || !Number.isFinite(state.coins) || !Object.prototype.hasOwnProperty.call(shopUpgradeCosts, id)) return false;
  const level2 = id === "open" ? Number(s.unlocked) : id === "capacity" ? s.capacityLevel : id === "displays" ? s.displayLevel : s.checkoutLevel;
  const price2 = shopUpgradeCosts[id][level2];
  if (price2 === void 0 || state.coins < price2 || id !== "open" && !s.unlocked || !Number.isSafeInteger(s.invested + price2)) return false;
  state.coins -= price2;
  s.invested += price2;
  if (id === "open") s.unlocked = true;
  else if (id === "capacity") s.capacityLevel++;
  else if (id === "displays") s.displayLevel++;
  else s.checkoutLevel++;
  return true;
}
function assignDisplay(state, slot, product) {
  const s = state.shop;
  if (state.paused || !s.unlocked || !Number.isInteger(slot) || slot < 0 || slot >= (s.displayLevel ? 4 : 2) || product !== null && (!findProduct(product) || s.displays.some((id, i) => i !== slot && id === product))) return false;
  s.displays[slot] = product;
  return true;
}
function offeredProducts(shop) {
  return shop.displays.slice(0, shop.displayLevel ? 4 : 2).filter((id) => !!id);
}
function basketFromHold(inventory, hold) {
  return hold.lines.map((line) => ({
    productId: inventory.lots.find((lot) => lot.id === line.lotId).productId,
    quantity: line.quantity,
    unitPrice: line.unitPrice
  }));
}
function chooseBasket(inventory, customer, offered, owner = "shop-customer-" + customer.id) {
  const order = [.../* @__PURE__ */ new Set([...customer.preferred, ...productCatalog.map((p) => p.id)])].filter((id) => offered.includes(id));
  let budget = customer.budget, spaces = customer.basketLimit;
  const requests = [];
  for (const productId of order) {
    let count3 = 0;
    for (const lot of inventory.lots.filter((lot2) => lot2.productId === productId)) {
      const held = inventory.reservations.reduce((sum, r) => sum + r.lines.reduce((n, l) => n + (l.lotId === lot.id ? l.quantity : 0), 0), 0);
      const free = lot.quantity - held;
      if (!free) continue;
      const take = Math.min(free, spaces, lot.unitPrice ? Math.floor(budget / lot.unitPrice) : spaces);
      count3 += take;
      budget -= take * lot.unitPrice;
      spaces -= take;
      if (take < free || !spaces) break;
    }
    if (count3) requests.push({ productId, quantity: count3 });
    if (!spaces) break;
  }
  if (!requests.length) return null;
  const hold = reserveStock(inventory, owner, requests, customer.budget);
  return hold ? { hold, basket: basketFromHold(inventory, hold) } : null;
}
function createCustomer(id, slot) {
  const profile = customerProfiles[id * 7 % customerProfiles.length];
  return {
    id,
    slot,
    model: customerModels[(id * 3 + Math.floor(id / 5)) % customerModels.length],
    budget: profile.budget,
    preferred: [...profile.preferred],
    basketLimit: profile.basketLimit,
    phase: "entering",
    remaining: 3,
    checkoutDuration: 0,
    reservationId: null,
    basket: [],
    spent: 0,
    quantity: 0,
    outcome: "shopping"
  };
}
function occupiedPlaces(shop) {
  return shop.customers.filter((c) => c.phase !== "leaving").length;
}
function updateShop(state, dt) {
  const s = state.shop, events = [];
  if (state.paused || !s.unlocked || !Number.isFinite(dt) || dt <= 0) return events;
  s.arrivalTimer -= dt;
  if (s.arrivalTimer <= 0) {
    if (occupiedPlaces(s) < shopCapacity[s.capacityLevel] && s.nextCustomer < Number.MAX_SAFE_INTEGER) {
      const used = new Set(s.customers.filter((c) => c.phase !== "leaving").map((c) => c.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      s.customers.push(createCustomer(s.nextCustomer++, slot));
      s.arrivalTimer += economy.indoorArrivalSeconds * Math.pow(economy.advertisingFactor, state.upgrades.sign);
    } else s.arrivalTimer = 0.5;
  }
  for (const c of s.customers) {
    if (c.phase === "queue") continue;
    c.remaining = Math.max(0, c.remaining - dt);
    if (c.remaining > 1e-8) continue;
    if (c.phase === "entering") {
      c.phase = "browsing";
      c.remaining = 4;
    } else if (c.phase === "browsing") {
      const chosen = chooseBasket(state.inventory, c, offeredProducts(s));
      if (chosen) {
        c.reservationId = chosen.hold.id;
        c.basket = chosen.basket;
        c.phase = "queue";
      } else {
        c.outcome = "unavailable";
        c.phase = "leaving";
        c.remaining = 3;
      }
    } else if (c.phase === "paying") {
      const hold = state.inventory.reservations.find((r) => r.id === c.reservationId);
      const amount = hold?.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) || 0;
      const quantity = hold?.lines.reduce((sum, l) => sum + l.quantity, 0) || 0;
      if (!hold || amount > c.budget || !Number.isFinite(state.coins + amount) || !Number.isFinite(state.earned + amount) || !Number.isSafeInteger(s.income + amount) || !Number.isSafeInteger(s.itemsSold + quantity) || !Number.isSafeInteger(s.served + 1)) continue;
      const receipt = commitStock(state.inventory, hold.id);
      if (!receipt) continue;
      state.coins += receipt.amount;
      state.earned += receipt.amount;
      state.sold++;
      s.income += receipt.amount;
      s.itemsSold += receipt.quantity;
      s.served++;
      c.spent = receipt.amount;
      c.quantity = receipt.quantity;
      c.outcome = "bought";
      s.receipts.unshift({ customerId: c.id, amount: c.spent, quantity: c.quantity, basket: c.basket.map((l) => ({ ...l })) });
      s.receipts.length = Math.min(s.receipts.length, 20);
      c.reservationId = null;
      c.phase = "leaving";
      c.remaining = 3;
      events.push({ type: "sale", route: "shop", amount: c.spent, quantity: c.quantity, visitor: c.id });
    }
  }
  s.customers = s.customers.filter((c) => c.phase !== "leaving" || c.remaining > 1e-8);
  if (!s.customers.some((c) => c.phase === "paying")) {
    const next = s.customers.find((c) => c.phase === "queue");
    if (next) {
      next.phase = "paying";
      next.checkoutDuration = checkoutSeconds[s.checkoutLevel];
      next.remaining = next.checkoutDuration;
    }
  }
  return events;
}
var record2 = (x) => !!x && typeof x === "object" && !Array.isArray(x);
var count = (x) => Number.isSafeInteger(x) && x >= 0;
function level(x, max) {
  return count(x) && x <= max;
}
function decodeLines(raw) {
  if (!Array.isArray(raw) || raw.length > 3) return null;
  const lines = [];
  for (const line of raw) {
    if (!record2(line) || !findProduct(line.productId) || !count(line.quantity) || line.quantity < 1 || line.quantity > 3 || !count(line.unitPrice)) return null;
    lines.push({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice });
  }
  return lines.reduce((n, l) => n + l.quantity, 0) <= 3 ? lines : null;
}
function decodeShop(raw, inventory) {
  if (!record2(raw) || raw.version !== 1 || typeof raw.unlocked !== "boolean" || !level(raw.capacityLevel, 3) || !level(raw.displayLevel, 1) || !level(raw.checkoutLevel, 2) || !count(raw.nextCustomer) || typeof raw.arrivalTimer !== "number" || !Number.isFinite(raw.arrivalTimer) || raw.arrivalTimer < 0 || raw.arrivalTimer > 5 || !["income", "itemsSold", "served", "invested"].every((k) => count(raw[k])) || !Array.isArray(raw.displays) || raw.displays.length !== 4 || !Array.isArray(raw.customers) || !Array.isArray(raw.receipts) || raw.receipts.length > 20) return null;
  const s = freshShop();
  s.unlocked = raw.unlocked;
  s.capacityLevel = raw.capacityLevel;
  s.displayLevel = raw.displayLevel;
  s.checkoutLevel = raw.checkoutLevel;
  s.nextCustomer = raw.nextCustomer;
  s.arrivalTimer = raw.arrivalTimer;
  for (const k of ["income", "itemsSold", "served", "invested"]) s[k] = raw[k];
  const products = /* @__PURE__ */ new Set();
  for (const [i, id] of raw.displays.entries()) {
    if (id !== null && (!findProduct(id) || products.has(id) || i >= 2 && !s.displayLevel)) return null;
    if (id) products.add(id);
    s.displays[i] = id;
  }
  const ids = /* @__PURE__ */ new Set(), slots = /* @__PURE__ */ new Set();
  if (raw.customers.length > shopCapacity[s.capacityLevel] + 2 || !s.unlocked && raw.customers.length) return null;
  for (const r of raw.customers) {
    if (!record2(r) || !count(r.id) || r.id >= s.nextCustomer || ids.has(r.id) || !customerModels.includes(r.model) || !count(r.budget) || r.budget > 1e3 || !level(r.basketLimit, 3) || !r.basketLimit || !Array.isArray(r.preferred) || r.preferred.length > 4 || r.preferred.some((id) => !findProduct(id)) || !["entering", "browsing", "queue", "paying", "leaving"].includes(r.phase) || !level(r.slot, shopCapacity[s.capacityLevel] - 1) || typeof r.remaining !== "number" || !Number.isFinite(r.remaining) || r.remaining < 0 || r.remaining > (r.phase === "paying" ? 12 : r.phase === "browsing" ? 4 : r.phase === "queue" ? 0 : 3) || !count(r.spent) || r.spent > r.budget || !level(r.quantity, 3) || !["shopping", "bought", "unavailable"].includes(r.outcome)) return null;
    const basket = decodeLines(r.basket);
    if (!basket) return null;
    const duration = r.checkoutDuration === void 0 ? r.phase === "paying" ? 3.5 : 0 : r.checkoutDuration;
    if (typeof duration !== "number" || ![0, ...supportedCheckoutSeconds].includes(duration) || r.phase === "paying" && (!duration || r.remaining > duration)) return null;
    const c = {
      id: r.id,
      model: r.model,
      budget: r.budget,
      preferred: r.preferred,
      basketLimit: r.basketLimit,
      phase: r.phase,
      remaining: r.remaining,
      checkoutDuration: duration,
      slot: r.slot,
      basket,
      reservationId: null,
      spent: r.spent,
      quantity: r.quantity,
      outcome: r.outcome
    };
    ids.add(c.id);
    if (c.phase !== "leaving") {
      if (slots.has(c.slot)) return null;
      slots.add(c.slot);
    }
    if (c.phase === "queue" || c.phase === "paying") {
      const hold = inventory.reservations.find((h) => h.id === r.reservationId && h.owner === "shop-customer-" + c.id);
      if (!hold || JSON.stringify(basketFromHold(inventory, hold)) !== JSON.stringify(basket) || basket.reduce((n, l) => n + l.quantity * l.unitPrice, 0) > c.budget || basket.reduce((n, l) => n + l.quantity, 0) > c.basketLimit || c.outcome !== "shopping") return null;
      c.reservationId = hold.id;
    } else if (r.reservationId !== null) return null;
    if (c.phase !== "leaving" && (c.spent || c.quantity || c.outcome !== "shopping")) return null;
    if ((c.phase === "entering" || c.phase === "browsing") && c.basket.length) return null;
    if (c.phase === "leaving" && (c.outcome === "shopping" || c.outcome === "unavailable" && (c.basket.length || c.spent || c.quantity))) return null;
    if (c.phase === "leaving" && c.outcome === "bought" && (c.quantity < 1 || c.basket.reduce((n, l) => n + l.quantity, 0) !== c.quantity || c.basket.reduce((n, l) => n + l.quantity * l.unitPrice, 0) !== c.spent)) return null;
    s.customers.push(c);
  }
  if (occupiedPlaces(s) > shopCapacity[s.capacityLevel] || s.customers.filter((c) => c.phase === "paying").length > 1) return null;
  const receiptIds = /* @__PURE__ */ new Set();
  for (const r of raw.receipts) {
    if (!record2(r) || !count(r.customerId) || r.customerId >= s.nextCustomer || receiptIds.has(r.customerId) || !count(r.amount) || !count(r.quantity) || !r.quantity) return null;
    const basket = decodeLines(r.basket);
    if (!basket || basket.reduce((n, l) => n + l.quantity, 0) !== r.quantity || basket.reduce((n, l) => n + l.quantity * l.unitPrice, 0) !== r.amount) return null;
    receiptIds.add(r.customerId);
    s.receipts.push({ customerId: r.customerId, amount: r.amount, quantity: r.quantity, basket });
  }
  if (inventory.reservations.some((h) => h.owner.startsWith("shop-customer-") && !s.customers.some((c) => c.reservationId === h.id))) return null;
  if (s.served < s.receipts.length || s.income < s.receipts.reduce((n, r) => n + r.amount, 0) || s.itemsSold < s.receipts.reduce((n, r) => n + r.quantity, 0)) return null;
  if (!s.unlocked && (s.capacityLevel || s.displayLevel || s.checkoutLevel || s.income || s.itemsSold || s.served || s.invested || s.receipts.length)) return null;
  return s;
}
function persistentShopHolds(shop, inventory) {
  const ids = new Set(shop.customers.filter((c) => c.phase === "queue" || c.phase === "paying").map((c) => c.reservationId));
  return inventory.reservations.filter((h) => ids.has(h.id)).map((h) => ({ ...h, lines: h.lines.map((l) => ({ ...l })) }));
}

export { assignDisplay, chooseBasket, decodeShop, freshShop, occupiedPlaces, persistentShopHolds, updateShop, upgradeShop };
