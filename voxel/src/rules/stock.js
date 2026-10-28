// Pumpkins waiting to be sold, counted per variety (0 Orange ... 4 Midnight Moon).
// A shopper's basket is held while they queue, so two shoppers never pick the
// same pumpkin; the hold is paid for or released. Mirrors src/core/inventory.js.
import { FRESH, dearPrice } from "./market.js";
import { VARIETY_COUNT, VARIETY_INDICES } from "../content/pumpkin-varieties.js";
export const freshStock = () => Array(VARIETY_COUNT).fill(0);
// Of each variety, the pumpkins picked in the last FRESH.seconds, as batches of
// [picked at, count], oldest first (market.js). Never more than are in stock.
export const freshBatches = () => Array.from({ length: VARIETY_COUNT }, () => []);

export const held = (s, v) => s.holds.reduce((n, h) => n + h.lines.reduce((m, l) => m + (l.variety === v ? l.quantity : 0), 0), 0);
export const available = (s, v) => (v === undefined ? s.stock.reduce((n, _, i) => n + available(s, i), 0) : (s.stock[v] ?? 0) - held(s, v));
export const stockCount = (s) => s.stock.reduce((n, c) => n + c, 0);

export function addStock(s, v, n = 1, fresh = false) {
  if (!Number.isInteger(v) || v < 0 || v >= VARIETY_COUNT || !Number.isInteger(n) || n < 1) return false;
  while (s.stock.length <= v) s.stock.push(0);
  while (s.fresh.length <= v) s.fresh.push([]);
  s.stock[v] += n;
  if (fresh) { const b = s.fresh[v], last = b.at(-1); if (last && last[0] === s.time) last[1] += n; else b.push([s.time, n]); }
  return true;
}

export const freshCount = (s, v) => (s.fresh[v] ?? []).reduce((n, b) => n + b[1], 0);
const heldFresh = (s, v) => s.holds.reduce((n, h) => n + h.lines.reduce((m, l) => m + (l.variety === v && l.fresh ? l.quantity : 0), 0), 0);
export const availableFresh = (s, v) => Math.max(0, Math.min(freshCount(s, v) - heldFresh(s, v), available(s, v)));
// Takes n of the oldest fresh pumpkins of variety v (they would turn first).
function takeFresh(s, v, n) {
  const b = s.fresh[v] ?? [];
  while (n > 0 && b.length) { const k = Math.min(n, b[0][1]); b[0][1] -= k; n -= k; if (!b[0][1]) b.shift(); }
}
// Pumpkins stop being fresh FRESH.seconds after they are picked; never more fresh than in stock.
export function settleFresh(s) {
  for (let v = 0; v < s.fresh.length; v++) {
    const b = s.fresh[v];
    while (b.length && s.time - b[0][0] >= FRESH.seconds) b.shift();
    const over = freshCount(s, v) - (s.stock[v] ?? 0);
    if (over > 0) takeFresh(s, v, over);
  }
}
export function restoreFresh(raw, s) {
  const f = freshBatches();
  if (Array.isArray(raw) && [4, VARIETY_COUNT].includes(raw.length)) raw.forEach((list, v) => {
    if (Array.isArray(list)) for (const b of list) if (Array.isArray(b) && Number.isFinite(b[0]) && b[0] <= s.time && Number.isSafeInteger(b[1]) && b[1] > 0) f[v].push([b[0], b[1]]);
    f[v].sort((a, b) => a[0] - b[0]);
  });
  s.fresh = f; settleFresh(s);
  return f;
}

// A shopper fills a basket from what is offered: their favourites first, then
// anything else, as many as their budget and basket allow. Unlike the 2D game
// (src/core/shop.js), a favourite they can't afford more of doesn't end the
// visit: they fill the rest of the basket with something cheaper.
export function quoteBasket(s, shopper, offered, prices) {
  const order = [...new Set([...(shopper.preferred ?? []), ...VARIETY_INDICES])].filter((v) => Number.isInteger(v) && v >= 0 && v < VARIETY_COUNT && offered.includes(v));
  let budget = shopper.budget, spaces = shopper.basketLimit;
  const picks = new Map();
  // A guest who came for the wanted variety buys one with the money and room
  // they brought for it (market.js wishFor); with none here, that stays unspent.
  const wish = shopper.wish, wished = wish && offered.includes(wish.variety) && available(s, wish.variety) > 0 && wish.purse >= prices[wish.variety] ? wish.variety : null;
  if (wish) { budget -= wish.purse; spaces--; }
  const lines = wished === null ? [] : [{ variety: wished, quantity: 1, price: wish.purse, fresh: availableFresh(s, wished) > 0 }];
  const mine = (v) => (lines[0]?.variety === v ? 1 : 0), mineFresh = (v) => (lines[0]?.variety === v && lines[0].fresh ? 1 : 0);
  for (const v of order) {
    if (spaces <= 0) break;
    const take = Math.min(available(s, v) - mine(v), spaces, Math.floor(budget / prices[v]));
    if (take > 0) { picks.set(v, take); budget -= take * prices[v]; spaces -= take; }
  }
  if (!picks.size && !lines.length) return null;
  // Fresh pumpkins go in first. What is left in the purse then pays a little
  // more for each fresh or wanted one (market.js), as far as it goes: the full
  // extra while it lasts, then what remains on one more.
  if (lines[0]?.fresh) { const extra = Math.min(budget, dearPrice(s, wished, prices[wished], true) - lines[0].price); if (extra > 0) { lines[0].price += extra; budget -= extra; } }
  for (const [v, take] of picks) {
    const price = prices[v], fresh = Math.max(0, Math.min(take, availableFresh(s, v) - mineFresh(v)));
    for (const [n, isFresh] of [[fresh, true], [take - fresh, false]]) {
      if (!n) continue;
      const extra = dearPrice(s, v, price, isFresh) - price, full = extra > 0 ? Math.min(n, Math.floor(budget / extra)) : 0;
      const part = full < n && extra > 0 ? budget - full * extra : 0;
      if (full) lines.push({ variety: v, quantity: full, price: price + extra, fresh: isFresh });
      if (part) lines.push({ variety: v, quantity: 1, price: price + part, fresh: isFresh });
      if (n - full - (part ? 1 : 0)) lines.push({ variety: v, quantity: n - full - (part ? 1 : 0), price, fresh: isFresh });
      budget -= full * extra + part;
    }
  }
  return lines;
}

export function chooseBasket(s, shopper, offered, owner, prices) {
  if (s.holds.some((h) => h.owner === owner)) return null;
  const lines = quoteBasket(s, shopper, offered, prices);
  if (lines) s.holds.push({ owner, lines });
  return lines;
}

// Pays for a held basket: the pumpkins leave stock. Returns the receipt.
export function commitHold(s, owner) {
  const i = s.holds.findIndex((h) => h.owner === owner);
  if (i < 0) return null;
  const [hold] = s.holds.splice(i, 1);
  for (const l of hold.lines) { s.stock[l.variety] -= l.quantity; if (l.fresh) takeFresh(s, l.variety, l.quantity); }
  settleFresh(s);
  return { lines: hold.lines, amount: hold.lines.reduce((n, l) => n + l.quantity * l.price, 0), quantity: hold.lines.reduce((n, l) => n + l.quantity, 0) };
}

export function releaseHold(s, owner) {
  s.holds = s.holds.filter((h) => h.owner !== owner);
}
