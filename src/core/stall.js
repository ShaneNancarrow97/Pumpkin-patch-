import { findProduct, productCatalog } from "../content/products.js";
import { availableQuantity, commitStock, releaseStock } from "./inventory.js";
import { stallProfiles } from "../content/stall.js";
import { chooseBasket } from "./shop.js";
import { stallVisit } from "../content/visitor-routes.mjs";

function freshStall() {
  return { version: 1, income: 0, itemsSold: 0, served: 0, missedBudget: 0, missedStock: 0, receipts: [] };
}
function createPasserby(id) {
  const profile = id % stallProfiles.length, p = stallProfiles[profile];
  return {
    id,
    age: 0,
    bought: false,
    checked: false,
    amount: 0,
    quantity: 0,
    profile,
    budget: p.budget,
    basketLimit: p.basketLimit,
    preferred: [...p.preferred],
    basket: [],
    outcome: "shopping",
    leaveAt: 0
  };
}
function sellToPasserby(state, v) {
  if (v.checked) return false;
  const chosen = chooseBasket(state.inventory, v, productCatalog.map((p) => p.id), "visitor-" + v.id);
  if (!chosen) return false;
  const amount = chosen.basket.reduce((n, l) => n + l.quantity * l.unitPrice, 0), quantity = chosen.basket.reduce((n, l) => n + l.quantity, 0), s = state.stall;
  if (!Number.isFinite(state.coins + amount) || !Number.isFinite(state.earned + amount) || !Number.isSafeInteger(s.income + amount) || !Number.isSafeInteger(s.itemsSold + quantity) || !Number.isSafeInteger(s.served + 1)) {
    releaseStock(state.inventory, chosen.hold.id);
    return false;
  }
  const receipt = commitStock(state.inventory, chosen.hold.id);
  if (!receipt) return false;
  state.coins += receipt.amount;
  state.earned += receipt.amount;
  state.sold++;
  s.income += receipt.amount;
  s.itemsSold += receipt.quantity;
  s.served++;
  v.amount = receipt.amount;
  v.quantity = receipt.quantity;
  v.basket = chosen.basket;
  v.bought = true;
  v.checked = true;
  v.outcome = "bought";
  v.leaveAt = v.age + stallVisit.lingerSeconds;
  s.receipts.unshift({ visitorId: v.id, profile: v.profile, budget: v.budget, quantity: v.quantity, amount: v.amount, basket: v.basket.map((l) => ({ ...l })) });
  s.receipts.length = Math.min(20, s.receipts.length);
  return true;
}
function finishMissedVisit(state, v) {
  if (v.checked) return;
  v.outcome = availableQuantity(state.inventory) > 0 ? "budget" : "soldout";
  const key = v.outcome === "budget" ? "missedBudget" : "missedStock";
  if (state.stall[key] < Number.MAX_SAFE_INTEGER) state.stall[key]++;
  v.checked = true;
  v.leaveAt = v.age + stallVisit.lingerSeconds;
}
var record3 = (x) => !!x && typeof x === "object" && !Array.isArray(x);
var count2 = (x) => Number.isSafeInteger(x) && x >= 0;
function decodeStall(raw, nextVisitor) {
  if (!record3(raw) || raw.version !== 1 || !["income", "itemsSold", "served", "missedBudget", "missedStock"].every((k) => count2(raw[k])) || !Array.isArray(raw.receipts) || raw.receipts.length > 20) return null;
  const s = freshStall(), ids = /* @__PURE__ */ new Set();
  for (const key of ["income", "itemsSold", "served", "missedBudget", "missedStock"]) s[key] = raw[key];
  for (const r of raw.receipts) {
    if (!record3(r) || !count2(r.visitorId) || r.visitorId >= nextVisitor || ids.has(r.visitorId) || !count2(r.profile) || r.profile >= stallProfiles.length || !count2(r.budget) || r.budget !== stallProfiles[r.profile].budget || !count2(r.quantity) || r.quantity < 1 || r.quantity > stallProfiles[r.profile].basketLimit || !count2(r.amount) || r.amount > r.budget || !Array.isArray(r.basket) || !r.basket.length || r.basket.length > 2) return null;
    const basket = [];
    for (const l of r.basket) {
      if (!record3(l) || !findProduct(l.productId) || !count2(l.quantity) || l.quantity < 1 || l.quantity > 2 || !count2(l.unitPrice)) return null;
      basket.push({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice });
    }
    if (basket.reduce((n, l) => n + l.quantity, 0) !== r.quantity || basket.reduce((n, l) => n + l.quantity * l.unitPrice, 0) !== r.amount) return null;
    ids.add(r.visitorId);
    s.receipts.push({ visitorId: r.visitorId, profile: r.profile, budget: r.budget, quantity: r.quantity, amount: r.amount, basket });
  }
  if (s.served < s.receipts.length || s.itemsSold < s.served || s.itemsSold > s.served * 2 || s.income < s.receipts.reduce((n, r) => n + r.amount, 0) || s.itemsSold < s.receipts.reduce((n, r) => n + r.quantity, 0)) return null;
  return s;
}

export { createPasserby, decodeStall, finishMissedVisit, freshStall, sellToPasserby };
