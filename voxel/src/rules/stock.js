// Pumpkins waiting to be sold, counted per variety (0 Orange ... 4 Midnight Moon).
// A shopper's basket is held while they queue, so two shoppers never pick the
// same pumpkin; the hold is paid for or released. Mirrors src/core/inventory.js.
import { FRESH, dearPrice } from "./market.js";
import { VARIETY_COUNT, VARIETY_INDICES } from "../content/pumpkin-varieties.js";
export const freshStock = () => Array(VARIETY_COUNT).fill(0);
// Of each variety, the pumpkins picked in the last FRESH.seconds, as batches of
// [picked at, count], oldest first (market.js). Never more than are in stock.
export const freshBatches = () => Array.from({ length: VARIETY_COUNT }, () => []);

// The freshness premium lasts 90 seconds; the physical pumpkin lasts fifteen
// minutes of active game time. The final three minutes are shown as fading.
// This ledger includes ordinary/legacy stock as well as fresh harvests.
export const STOCK_LIFE = Object.freeze({ seconds: 900, warning: 180 });
export const freshPumpkinAges = () => Array.from({ length: VARIETY_COUNT }, () => []);
export const freshStockWaste = () => ({ discarded: Array(VARIETY_COUNT).fill(0), lastAt: 0, lastCount: 0 });
const safeCount = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1e12) : 0;
export function restoreStockWaste(raw, s) {
  const waste = freshStockWaste();
  waste.discarded = waste.discarded.map((_, v) => safeCount(raw?.discarded?.[v]));
  waste.lastAt = Number.isFinite(raw?.lastAt) ? Math.max(0, Math.min(s.time, raw.lastAt)) : 0;
  waste.lastCount = safeCount(raw?.lastCount);
  return waste;
}
const sumAges = list => list.reduce((n, b) => n + b[1], 0);
function takeAges(list, quantity) {
  let left = quantity;
  while (left > 0 && list.length) { const n = Math.min(left, list[0][1]); list[0][1] -= n; left -= n; if (!list[0][1]) list.shift(); }
  return quantity - left;
}
function normaliseAges(raw, s) {
  const ages = freshPumpkinAges();
  for (let v = 0; v < VARIETY_COUNT; v++) {
    const target = safeCount(s.stock[v]);
    for (const batch of Array.isArray(raw?.[v]) ? raw[v] : []) {
      if (!Array.isArray(batch) || !Number.isFinite(batch[0]) || batch[0] < 0 || batch[0] > s.time || !safeCount(batch[1])) continue;
      ages[v].push([batch[0], safeCount(batch[1])]);
    }
    ages[v].sort((a,b) => a[0]-b[0]);
    const known = sumAges(ages[v]);
    // Unknown old stock gets a grace period when this feature is introduced.
    // A save with valid old dates keeps them, including already-expired dates.
    if (known < target) ages[v].push([s.time, target-known]);
    else if (known > target) {
      // Orders/carving also consume stock. Their existing rules exclude held
      // units, so reconcile from the oldest *unreserved* batches first.
      let left=known-target;
      for(const batch of ages[v]) { const spare=Math.max(0,batch[1]-protectedAt(s,v,batch[0])),n=Math.min(left,spare);batch[1]-=n;left-=n;if(!left)break; }
      ages[v]=ages[v].filter(b=>b[1]>0);
      if(left)takeAges(ages[v],left); // repairs an externally malformed state
    }
    ages[v].sort((a,b) => a[0]-b[0]);
    const merged=[];
    for(const b of ages[v]) { const last=merged.at(-1); if(last?.[0]===b[0])last[1]+=b[1];else merged.push(b); }
    ages[v]=merged;
  }
  return ages;
}
export const restorePumpkinAges = (raw, s) => normaliseAges(raw,s);
function ensureAges(s) { s.pumpkinAges = normaliseAges(s.pumpkinAges,s); }
const protectedAt = (s,v,born) => (s.holds??[]).reduce((sum,h) => sum + (h.ageReservations?.[v]??[]).reduce((n,b)=>n+(b[0]===born?b[1]:0),0),0);

export function stockCondition(s, v) {
  const result={fresh:0,stored:0,fading:0,total:0,nextDiscardIn:null};
  const ages=normaliseAges(s.pumpkinAges,s),variants=v===undefined?Array.from({length:VARIETY_COUNT},(_,i)=>i):[v];
  for(const variety of variants)for(const [born,n] of ages[variety]??[]) {
    const age=Math.max(0,s.time-born),remaining=Math.max(0,STOCK_LIFE.seconds-age);
    result.total+=n;
    // The existing freshness ledger decides the actual premium; legacy stock
    // can have a new shelf-life without receiving a free freshness premium.
    if(remaining<=STOCK_LIFE.warning)result.fading+=n;else result.stored+=n;
    if(result.nextDiscardIn===null||remaining<result.nextDiscardIn)result.nextDiscardIn=remaining;
  }
  result.fresh=variants.reduce((n,i)=>n+Math.min(freshCount(s,i),s.stock[i]??0),0);
  result.stored=Math.max(0,result.stored-result.fresh);
  return result;
}
export const totalDiscarded = s => (s.stockWaste?.discarded??[]).reduce((n,q)=>n+safeCount(q),0);
export function settlePumpkinStock(s, events=[]) {
  ensureAges(s);ensureHoldReservations(s);s.stockWaste??=freshStockWaste();
  const byVariety=Array(VARIETY_COUNT).fill(0);
  for(let v=0;v<VARIETY_COUNT;v++) {
    const kept=[];
    for(const [born,n] of s.pumpkinAges[v]) {
      const preserve=s.time-born>=STOCK_LIFE.seconds?Math.min(n,protectedAt(s,v,born)):n;
      byVariety[v]+=n-preserve;if(preserve)kept.push([born,preserve]);
    }
    s.pumpkinAges[v]=kept;
    if(v<s.stock.length||byVariety[v])s.stock[v]=Math.max(0,(s.stock[v]??0)-byVariety[v]);
    s.stockWaste.discarded[v]=(s.stockWaste.discarded[v]??0)+byVariety[v];
  }
  const quantity=byVariety.reduce((n,q)=>n+q,0);
  if(quantity){s.stockWaste.lastAt=s.time;s.stockWaste.lastCount=quantity;settleFresh(s);events.push({type:"stock-discarded",quantity,byVariety});}
  return quantity;
}

// A basket reserves the exact batches it picked. Expiry never takes an item
// out of a shopper's hands; the agreed basket can finish checkout once.
function ageReservations(s,lines) {
  const claims=freshPumpkinAges(),free=s.pumpkinAges.map((list,v)=>list.map(([at,n])=>[at,Math.max(0,n-protectedAt(s,v,at))]));
  for(const line of lines) {
    let left=line.quantity;
    const candidates=free[line.variety];
    const ordered=line.fresh?[...candidates.filter(b=>s.time-b[0]<FRESH.seconds),...candidates.filter(b=>s.time-b[0]>=FRESH.seconds)]:candidates;
    for(const batch of ordered) { const n=Math.min(left,batch[1]);if(n){claims[line.variety].push([batch[0],n]);batch[1]-=n;left-=n;}if(!left)break; }
  }
  return claims;
}
function ensureHoldReservations(s) {
  for(const hold of s.holds??[])if(!hold.ageReservations)hold.ageReservations=ageReservations(s,hold.lines);
}
function consumeClaims(s,claims,lines) {
  const totals=Array(VARIETY_COUNT).fill(0);for(const l of lines)totals[l.variety]+=l.quantity;
  for(let v=0;v<VARIETY_COUNT;v++) {
    let taken=0;
    for(const [born,n] of claims?.[v]??[]) { const batch=s.pumpkinAges[v].find(b=>b[0]===born);if(batch){const q=Math.min(n,batch[1]);batch[1]-=q;taken+=q;} }
    s.pumpkinAges[v]=s.pumpkinAges[v].filter(b=>b[1]>0);
    if(totals[v]>taken)takeAges(s.pumpkinAges[v],totals[v]-taken);
  }
}

export const held = (s, v) => s.holds.reduce((n, h) => n + h.lines.reduce((m, l) => m + (l.variety === v ? l.quantity : 0), 0), 0);
export const available = (s, v) => (v === undefined ? s.stock.reduce((n, _, i) => n + available(s, i), 0) : (s.stock[v] ?? 0) - held(s, v));
export const stockCount = (s) => s.stock.reduce((n, c) => n + c, 0);

export function addStock(s, v, n = 1, fresh = false) {
  if (!Number.isInteger(v) || v < 0 || v >= VARIETY_COUNT || !Number.isInteger(n) || n < 1) return false;
  ensureAges(s);
  while (s.stock.length <= v) s.stock.push(0);
  while (s.fresh.length <= v) s.fresh.push([]);
  s.stock[v] += n;
  const ages=s.pumpkinAges[v],lastAge=ages.at(-1);if(lastAge?.[0]===s.time)lastAge[1]+=n;else ages.push([s.time,n]);
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
  ensureAges(s);ensureHoldReservations(s);
  const lines = quoteBasket(s, shopper, offered, prices);
  if (lines) s.holds.push({ owner, lines, ageReservations:ageReservations(s,lines) });
  return lines;
}

// Pays for a held basket: the pumpkins leave stock. Returns the receipt.
export function commitHold(s, owner) {
  const i = s.holds.findIndex((h) => h.owner === owner);
  if (i < 0) return null;
  ensureAges(s);ensureHoldReservations(s);
  const [hold] = s.holds.splice(i, 1);
  consumeClaims(s,hold.ageReservations,hold.lines);
  for (const l of hold.lines) { s.stock[l.variety] -= l.quantity; if (l.fresh) takeFresh(s, l.variety, l.quantity); }
  settleFresh(s);
  return { lines: hold.lines, amount: hold.lines.reduce((n, l) => n + l.quantity * l.price, 0), quantity: hold.lines.reduce((n, l) => n + l.quantity, 0) };
}

export function releaseHold(s, owner) {
  s.holds = s.holds.filter((h) => h.owner !== owner);
}
