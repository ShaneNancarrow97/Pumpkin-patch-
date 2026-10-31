// Neighbours' orders. Pure rules; no renderer or DOM dependencies.
// Every few minutes one of the regulars asks for a batch of one variety by a
// deadline, and pays more than the stall does. Orders go from the barn's oldest
// pumpkins (fresh ones only when there aren't enough), so they soak up what the
// stall can't sell. A neighbour whose orders you fill comes back for more, and
// pays better; one you let down asks for less.
import { NORMAL_VISITOR_KINDS, visitorIdentity } from "../content/visitors.js";
import { VARIETIES } from "./farm.js";
import { available, settleFresh } from "./stock.js";
import { bestGrowable } from "./market.js";
import { patchLevel } from "./levels.js";

// gap: seconds between new orders; open: at most this many at once; time: seconds to fill one;
// from: the patch level they start at.
export const ORDERS = Object.freeze({ gap: 240, first: 45, open: 1, time: 300, from: 5 });
// How well you know a neighbour, by orders of theirs filled: what they pay over the stall price, and how much more they ask for.
export const ORDER_TRUST = Object.freeze([
  { filled: 0, name: "New neighbour", pay: 1.25, size: 1 },
  { filled: 1, name: "Neighbour", pay: 1.3, size: 1.25 },
  { filled: 3, name: "Regular", pay: 1.35, size: 1.5 },
  { filled: 6, name: "Good friend", pay: 1.4, size: 1.75 },
  { filled: 10, name: "Dearest neighbour", pay: 1.5, size: 2 },
]);
// A first order's size per variety, before trust and the farm's crowd tier.
const BASE = [8, 6, 5, 4, 3];

export const freshOrders = () => ({ list: [], next: 0, serial: 0, filled: 0, missed: 0, income: 0, trust: {} });
const draw = (n) => ((Math.imul(n + 0x5bd1, 2246822519) >>> 8) % 1000) / 1000;
export const orderTrust = (s, kind) => { const n = s.orders.trust[kind] ?? 0; return ORDER_TRUST.findLast((t) => n >= t.filled); };
export const orderSecondsLeft = (s, o) => Math.max(0, o.until - s.time);
export const canFillOrder = (s, o) => available(s, o.variety) >= o.count;

// A new order when one is due and there's room; expired ones go, and their neighbour trusts you a little less.
export function updateOrders(s, events) {
  const o = s.orders;
  for (const order of o.list.filter((x) => s.time >= x.until)) {
    o.missed++; o.trust[order.kind] = Math.max(0, (o.trust[order.kind] ?? 0) - 2);
    events.push({ type: "order-missed", order });
  }
  o.list = o.list.filter((x) => s.time < x.until);
  if (patchLevel(s).level < ORDERS.from) { o.next = Math.max(o.next, s.time + ORDERS.first); return; }
  if (s.time < o.next || o.list.length >= ORDERS.open) return;
  o.serial++;
  const kinds = NORMAL_VISITOR_KINDS.map((_, k) => k).filter((k) => !o.list.some((x) => x.kind === k));
  const kind = kinds[Math.floor(draw(o.serial * 7) * kinds.length)], variety = Math.floor(draw(o.serial * 13 + 1) * (bestGrowable(s) + 1));
  const trust = orderTrust(s, kind), crowd = 1 + 0.25 * (s.visitorUpgrades?.crowd ?? 0);
  const count = Math.max(2, Math.round(BASE[variety] * trust.size * crowd)), pay = Math.round(count * VARIETIES[variety].price * trust.pay);
  const order = { id: o.serial, kind, variety, count, pay, until: s.time + ORDERS.time };
  o.list.push(order); o.next = s.time + ORDERS.gap;
  events.push({ type: "order", order });
}

// Sends an order from the barn: the oldest pumpkins first. Returns the payment, or 0.
export function fillOrder(s, id) {
  const o = s.orders, order = o.list.find((x) => x.id === id);
  if (s.paused || !order || !canFillOrder(s, order)) return 0;
  s.stock[order.variety] -= order.count; settleFresh(s);
  s.coins += order.pay; s.earned += order.pay; s.sold += order.count;
  o.income += order.pay; o.filled++; o.trust[order.kind] = (o.trust[order.kind] ?? 0) + 1;
  o.list = o.list.filter((x) => x !== order);
  return order.pay;
}

export const orderFrom = (order) => visitorIdentity(order.kind).name;

const count = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : 0);
export function restoreOrders(raw, s) {
  const o = freshOrders();
  if (!raw || typeof raw !== "object") return o;
  for (const k of ["serial", "filled", "missed", "income"]) o[k] = count(raw[k]);
  o.next = Number.isFinite(raw.next) ? Math.max(0, Math.min(s.time + ORDERS.gap, raw.next)) : 0;
  for (const [k, n] of Object.entries(raw.trust ?? {})) if (/^\d+$/.test(k) && +k < NORMAL_VISITOR_KINDS.length) o.trust[k] = Math.min(1000, count(n));
  const ids = new Set();
  for (const x of Array.isArray(raw.list) ? raw.list : []) {
    if (!x || !Number.isSafeInteger(x.id) || ids.has(x.id) || !Number.isInteger(x.kind) || x.kind < 0 || x.kind >= NORMAL_VISITOR_KINDS.length) continue;
    if (!Number.isInteger(x.variety) || !VARIETIES[x.variety] || !Number.isSafeInteger(x.count) || x.count < 1 || x.count > 10000 || !Number.isSafeInteger(x.pay) || x.pay < 1 || !Number.isFinite(x.until)) continue;
    if (x.until <= s.time || o.list.length >= ORDERS.open) continue;
    ids.add(x.id); o.list.push({ id: x.id, kind: x.kind, variety: x.variety, count: x.count, pay: Math.min(x.pay, Math.round(x.count * VARIETIES[x.variety].price * 2)), until: Math.min(x.until, s.time + ORDERS.time) });
  }
  o.serial = Math.max(o.serial, ...o.list.map((x) => x.id));
  return o;
}
