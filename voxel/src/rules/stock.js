// Pumpkins waiting to be sold, counted per variety (0 Orange ... 3 Starlight).
// A shopper's basket is held while they queue, so two shoppers never pick the
// same pumpkin; the hold is paid for or released. Mirrors src/core/inventory.js.
export const freshStock = () => [0, 0, 0, 0];

export const held = (s, v) => s.holds.reduce((n, h) => n + h.lines.reduce((m, l) => m + (l.variety === v ? l.quantity : 0), 0), 0);
export const available = (s, v) => (v === undefined ? s.stock.reduce((n, _, i) => n + available(s, i), 0) : s.stock[v] - held(s, v));
export const stockCount = (s) => s.stock.reduce((n, c) => n + c, 0);

export function addStock(s, v, n = 1) {
  if (!Number.isInteger(v) || v < 0 || v >= s.stock.length || !Number.isInteger(n) || n < 1) return false;
  s.stock[v] += n;
  return true;
}

// A shopper fills a basket from what is offered: their favourites first, then
// anything else, as many as their budget and basket allow (src/core/shop.js).
export function chooseBasket(s, shopper, offered, owner, prices) {
  if (s.holds.some((h) => h.owner === owner)) return null;
  const order = [...new Set([...shopper.preferred, 0, 1, 2, 3])].filter((v) => offered.includes(v));
  let budget = shopper.budget, spaces = shopper.basketLimit;
  const lines = [];
  for (const v of order) {
    const free = available(s, v), price = prices[v];
    if (!free) continue;
    const take = Math.min(free, spaces, Math.floor(budget / price));
    if (take > 0) { lines.push({ variety: v, quantity: take, price }); budget -= take * price; spaces -= take; }
    if (take < free || !spaces) break;
  }
  if (!lines.length) return null;
  s.holds.push({ owner, lines });
  return lines;
}

// Pays for a held basket: the pumpkins leave stock. Returns the receipt.
export function commitHold(s, owner) {
  const i = s.holds.findIndex((h) => h.owner === owner);
  if (i < 0) return null;
  const [hold] = s.holds.splice(i, 1);
  for (const l of hold.lines) s.stock[l.variety] -= l.quantity;
  return { lines: hold.lines, amount: hold.lines.reduce((n, l) => n + l.quantity * l.price, 0), quantity: hold.lines.reduce((n, l) => n + l.quantity, 0) };
}

export function releaseHold(s, owner) {
  s.holds = s.holds.filter((h) => h.owner !== owner);
}
