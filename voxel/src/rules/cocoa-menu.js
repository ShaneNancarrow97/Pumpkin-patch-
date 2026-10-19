// The stand's premium menu uses paid stock and the same finite visitor purse.
import { quoteBasket } from "./stock.js";
import { enjoyTreat } from "./guest-needs.js";
import { VARIETIES } from "./farm.js";
export const COCOA_SPECIALS = [
  { id: "flake", name: "Chocolate-flake cocoa", tier: 2, price: 6, minPrice: 4, maxPrice: 10, cost: 3, text: "Creamy cocoa with a generous chocolate flake." },
  { id: "deluxe", name: "Ghost marshmallow cocoa", tier: 2, price: 7, minPrice: 5, maxPrice: 12, cost: 3, text: "Whipped cream, little ghost marshmallows and chocolate drizzle." },
  { id: "midnight", name: "Midnight sauce sundae", tier: 3, price: 9, minPrice: 6, maxPrice: 14, cost: 4, text: "Deluxe cocoa, chocolate flake and warm pumpkin-caramel sauce." },
  { id: "smores", name: "Midnight s’mores", tier: 3, price: 5, minPrice: 3, maxPrice: 10, cost: 2, text: "Toasted ghost marshmallow and chocolate between golden crackers." },
];
export const freshCocoaPrices = () => Object.fromEntries(COCOA_SPECIALS.map(p => [p.id, p.price]));
export function restoreCocoaPrices(raw) { return Object.fromEntries(COCOA_SPECIALS.map(p => [p.id, Number.isInteger(raw?.[p.id]) ? Math.max(p.minPrice, Math.min(p.maxPrice, raw[p.id])) : p.price])); }
export function setCocoaSpecialPrice(s, id, price) {
  const p = COCOA_SPECIALS.find(x => x.id === id);
  if (!p || s.paused || s.festival.cocoa.level < p.tier || !Number.isInteger(price) || price < p.minPrice || price > p.maxPrice) return false;
  s.festival.cocoa.prices[id] = price; return true;
}
export const freshCocoaExtras = () => Object.fromEntries(COCOA_SPECIALS.map(p => [p.id, { stock: 0, sold: 0, gross: 0, supplies: 0 }]));
const count = (x, cap = 1e12) => Number.isSafeInteger(x) ? Math.max(0, Math.min(cap, x)) : 0;
export const specialCapacity = (s, id) => s.festival.cocoa.level >= COCOA_SPECIALS.find(p => p.id === id)?.tier ? (s.festival.cocoa.level === 3 ? 30 : 20) : 0;
export function restoreCocoaExtras(raw, level) {
  const extras = freshCocoaExtras();
  for (const p of COCOA_SPECIALS) for (const key of ["stock", "sold", "gross", "supplies"]) extras[p.id][key] = count(raw?.[p.id]?.[key], key === "stock" ? (level >= p.tier ? (level === 3 ? 30 : 20) : 0) : 1e12);
  return extras;
}
export function restockCocoaSpecial(s, id) {
  const p = COCOA_SPECIALS.find(x => x.id === id); if (!p || s.paused) return 0;
  const c = s.festival.cocoa, e = c.extras[id], n = Math.min(10, specialCapacity(s, id) - e.stock), cost = n * p.cost;
  if (n < 1 || s.coins < cost) return 0;
  s.coins -= cost; e.stock += n; e.supplies += cost; c.supplies += cost; return n;
}
export const standHasStock = s => s.festival.cocoa.stock > 0 || COCOA_SPECIALS.some(p => specialCapacity(s, p.id) && s.festival.cocoa.extras[p.id].stock > 0);
export function quoteStandOrder(s, visitor) {
  const c = s.festival.cocoa;
  const basket = quoteBasket(s, visitor, [0, 1, 2, 3], VARIETIES.map(p => p.price));
  let spare = visitor.budget - (basket ?? []).reduce((sum, l) => sum + l.price * l.quantity, 0);
  const needs = visitor.needs ?? { thirst: 75, hunger: 65, value: 1 }, order = [];
  const willing = (p, need) => p.price * (.75 + .7 * need / 100) * needs.value;
  const options = [{ id: "cocoa", price: c.price, value: 4, rating: 1, stock: c.stock }, ...COCOA_SPECIALS.filter(p => p.id !== "smores" && specialCapacity(s, p.id)).map(p => ({ id: p.id, price: c.prices[p.id], value: p.price, rating: { flake: 1.2, deluxe: 1.4, midnight: 1.7 }[p.id], stock: c.extras[p.id].stock }))]
    .filter(p => p.stock > 0 && p.price <= spare && needs.thirst >= 25 && p.price <= willing({ price: p.value }, needs.thirst));
  options.sort((a, b) => (b.rating * (needs.thirst / 100 + .4) - b.price / b.value + ((visitor.id + b.id.length) % 3) * .15) - (a.rating * (needs.thirst / 100 + .4) - a.price / a.value + ((visitor.id + a.id.length) % 3) * .15));
  if (options.length) { order.push({ id: options[0].id, price: options[0].price }); spare -= options[0].price; }
  const snack = COCOA_SPECIALS.find(p => p.id === "smores");
  if (specialCapacity(s, "smores") && c.extras.smores.stock && needs.hunger >= 25 && c.prices.smores <= spare && c.prices.smores <= willing(snack, needs.hunger)) order.push({ id: "smores", price: c.prices.smores });
  return order;
}
// All lines are re-quoted against current stock immediately before this payment.
export function payStandOrder(s, visitor, order) {
  const c = s.festival.cocoa, total = order.reduce((n, l) => n + l.price, 0);
  if (visitor.treatReceipt || !order.length || total > visitor.budget || new Set(order.map(l => l.id)).size !== order.length || order.some(l => l.id === "cocoa" ? !c.stock || l.price !== c.price : !specialCapacity(s, l.id) || !c.extras[l.id]?.stock || l.price !== c.prices[l.id])) return 0;
  for (const l of order) {
    if (l.id === "cocoa") { c.stock--; c.sold++; }
    else { const e = c.extras[l.id]; e.stock--; e.sold++; e.gross += l.price; if (l.id !== "smores") c.sold++; }
  }
  for (const l of order) enjoyTreat(visitor, l.id === "smores");
  c.gross += total; c.lastSaleAt = s.time; visitor.budget -= total; visitor.cocoaSpend = total;
  visitor.cocoaKind = order.find(l => l.id !== "smores")?.id ?? null;
  visitor.snack = order.some(l => l.id === "smores"); visitor.treatReceipt = order;
  s.coins += total; s.earned += total; s.stall.cocoa += total;
  return total;
}
