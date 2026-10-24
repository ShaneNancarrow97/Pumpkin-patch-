// One authoritative convoy and the same guests/purses throughout its circuit.
// The renderer reads phases and progress; it never takes money or dispatches.
import { patchLevel } from "./levels.js";
import { visitorCapacity, visitorReservations } from "./selling.js";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS, HAYRIDE_SCARES, HAYRIDE_SCARE_BY_ID } from "../content/hayride.js";
import { hayrideGuestPose, hayrideReturnPlan } from "../content/hayride-layout.js";
export * from "../content/hayride.js";
const EPS = 1e-7, phases = new Set(["approach", "queue", "boarding", "riding", "unloading", "return"]);
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const count = (n, max = 1e12) => Number.isSafeInteger(n) ? Math.max(0, Math.min(max, n)) : 0;
const bounded = (n, lo, hi, fallback = lo) => Math.max(lo, Math.min(hi, finite(n, fallback)));
const sample = id => ((Math.imul(count(id) + 37, 1103515245) >>> 8) % 1000) / 1000;
const validVisit = id => typeof id === "string" && /^hayride-\d+$/.test(id) && Number.isSafeInteger(Number(id.slice(8))) && Number(id.slice(8)) < 1e12;
const validRun = id => typeof id === "string" && /^hayride-run-\d+$/.test(id) && Number.isSafeInteger(Number(id.slice(12))) && Number(id.slice(12)) < 1e12;
const live = s => (s.visitors ?? []).filter(v => v.hayride && !v.hayride.done);
const cash = (s, price) => !s.paused && Number.isFinite(s.coins) && s.coins >= price;
const freshConvoy = (run = 0) => ({ phase: "loading", elapsed: 0, progress: 0, loadWait: 0, runId: `hayride-run-${run}`, manifest: [] });
export function freshHayride() {
  return { purchased: false, tier: 1, open: false, ticketPrice: 8, invested: 0, ticketsSold: 0, income: 0, completed: 0, missed: 0, runHome: 0, departures: 0, partyAt: null, nextVisit: 0, nextRun: 1, receipts: [], haunts: { owned: [], active: [] }, convoy: freshConvoy(), lastEvent: null };
}
export const hayrideConfig = s => HAYRIDE_TIERS[Math.max(0, count(s?.hayride?.tier, HAYRIDE_TIERS.length) - 1)];
export const hayrideReady = s => s?.hayride?.purchased === true;
export const hayrideUnlocked = s => patchLevel(s).level >= HAYRIDE_PROPERTY.level && s.hollowHouse?.purchased === true && s.hollowHouse.status === "ready";
export const hayrideTicketRange = s => ({ min: hayrideConfig(s).minTicket, max: hayrideConfig(s).maxTicket });
export function hayrideScareRating(s) {
  if (!hayrideReady(s)) return 0;
  const h = s.hayride, t = hayrideConfig(s), owned = new Set(h.haunts.owned), active = new Set(h.haunts.active);
  return Math.min(100, t.scare + HAYRIDE_SCARES.reduce((n, p) => n + (p.tier <= h.tier && owned.has(p.id) && active.has(p.id) ? p.scare : 0), 0));
}
export const hayrideFootfallBonus = s => hayrideReady(s) && s.hayride.open ? hayrideScareRating(s) * .003 : 0;
export const hayrideQueue = s => live(s).filter(v => v.hayride.phase === "queue").sort((a, b) => a.hayride.order - b.hayride.order || a.id - b.id);
export function hayrideOccupancy(s) {
  const guests = live(s), h = s?.hayride, t = hayrideConfig(s), aboard = h?.convoy?.manifest.length ?? 0;
  return { queue: guests.filter(v => ["queue", "boarding"].includes(v.hayride.phase)).length, approach: guests.filter(v => v.hayride.phase === "approach").length, riding: guests.filter(v => ["riding", "unloading"].includes(v.hayride.phase)).length, total: guests.length, aboard, seats: t.seats, availableSeats: Math.max(0, t.seats - aboard), queueCapacity: t.queueCapacity };
}
export function buyHayride(s) {
  if (!s.hayride || hayrideReady(s) || !hayrideUnlocked(s) || !cash(s, HAYRIDE_PROPERTY.price)) return false;
  s.coins -= HAYRIDE_PROPERTY.price; s.hayride.invested += HAYRIDE_PROPERTY.price; s.hayride.purchased = true; return true;
}
export const HAYRIDE_OPENING_PARTY = 2, HAYRIDE_PARTY_GAP = 120;
// Opening advertises a small party, without creating wallets or bypassing the
// global guest cap. Closing cancels only members still waiting off the path.
export function setHayrideOpen(s, open) {
  if (s.paused || !hayrideReady(s) || typeof open !== "boolean") return false;
  const h = s.hayride, opening = open && !h.open; h.open = open;
  if (!open && Array.isArray(s.arriving)) s.arriving = s.arriving.filter(a => !a.forHayride);
  const now = Math.max(0, finite(s.time));
  if (opening && Array.isArray(s.arriving) && Array.isArray(s.visitors) && visitorReservations(s) + HAYRIDE_OPENING_PARTY <= visitorCapacity(s) && now - (h.partyAt ?? -Infinity) >= HAYRIDE_PARTY_GAP) {
    h.partyAt = now; const party = count(s.nextParty); s.nextParty = party + 1;
    for (let place = 0; place < HAYRIDE_OPENING_PARTY; place++) s.arriving.push({ party, place, size: HAYRIDE_OPENING_PARTY, wait: .6 + place * .9, forHayride: true });
  }
  return true;
}
export function setHayrideTicketPrice(s, price) {
  const r = hayrideTicketRange(s);
  if (s.paused || !hayrideReady(s) || !Number.isInteger(price) || price < r.min || price > r.max) return false;
  s.hayride.ticketPrice = price; return true;
}
export function upgradeHayride(s) {
  const h = s?.hayride, next = HAYRIDE_TIERS[h?.tier];
  if (!hayrideReady(s) || !next || patchLevel(s).level < next.patchLevel || !cash(s, next.cost)) return false;
  s.coins -= next.cost; h.invested += next.cost; h.tier++; return true;
}
export function buyHayrideScare(s, id) {
  const p = HAYRIDE_SCARE_BY_ID[id], h = s?.hayride;
  if (!p || !hayrideReady(s) || p.tier > h.tier || h.haunts.owned.includes(id) || !cash(s, p.cost)) return false;
  s.coins -= p.cost; h.invested += p.cost; h.haunts.owned.push(id); h.haunts.active.push(id); return true;
}
export function setHayrideScareActive(s, id, on) {
  const p = HAYRIDE_SCARE_BY_ID[id], h = s?.hayride;
  if (!p || s.paused || !hayrideReady(s) || typeof on !== "boolean" || p.tier > h.tier || !h.haunts.owned.includes(id)) return false;
  h.haunts.active = h.haunts.active.filter(k => k !== id); if (on) h.haunts.active.push(id); return true;
}
// Wish cash belongs to its pumpkin, unless that pumpkin was already paid for.
// A held wished pumpkin overlaps that reserve; do not subtract its purse twice.
export function hayrideSpendable(s, v) {
  const wish = v?.wish, wishPaid = wish && (v.basket ?? []).some(l => l.variety === wish.variety && l.price >= wish.purse && l.quantity > 0);
  const purse = wish && !wishPaid ? Math.max(0, finite(wish.purse)) : 0;
  const holds = (s.holds ?? []).filter(h => h.owner === `visitor-${v.id}`), lines = holds.flatMap(h => h.lines ?? []);
  const reserved = lines.reduce((n, l) => n + Math.max(0, finite(l.quantity)) * Math.max(0, finite(l.price)), 0);
  const heldWish = wish ? lines.filter(l => l.variety === wish.variety && l.price >= wish.purse && l.quantity > 0).length ? purse : 0 : 0;
  return Math.max(0, finite(v.budget) - reserved - Math.max(0, purse - heldWish) - Math.max(0, finite(v.paymentHold)));
}
// Returns a visit like planHollowVisit; the caller assigns it to v.hayride.
export function planHayrideVisit(s, v, when = "arrival", options = {}) {
  if (s.paused || !hayrideReady(s) || !s.hayride.open || v.hayride && !v.hayride.done || v.hollow && !v.hollow.done || v.festival && !v.festival.done || !Number.isSafeInteger(v.id)) return null;
  const h = s.hayride, t = hayrideConfig(s), occupancy = hayrideOccupancy(s), force = options.force === true || v.forHayride === true;
  if (occupancy.queue + occupancy.approach >= t.queueCapacity || hayrideSpendable(s, v) < h.ticketPrice) return null;
  const willing = sample(v.id + (when === "after" ? 401 : 0));
  if (!force && (willing >= .16 + hayrideScareRating(s) * .003 || h.ticketPrice > 4 + sample(v.id + 117) * (t.maxTicket - 2))) return null;
  const order = h.nextVisit++;
  return { visitId: `hayride-${order}`, order, routeVersion: HAYRIDE_PROPERTY.routeVersion, fromStall: when === "after", phase: "approach", elapsed: 0, approachSeconds: bounded(options.approachSeconds, .1, 300, HAYRIDE_PROPERTY.approachSeconds), returnSeconds: bounded(options.returnSeconds, .1, 300, HAYRIDE_PROPERTY.returnSeconds), waited: 0, quote: h.ticketPrice, charged: false, ticket: 0, seat: null, runId: null, terror: 0, bravery: 24 + Math.floor(sample(v.id + 421) * 65), done: false, missed: false, fleeing: false };
}
function mark(s, kind, v) { s.hayride.lastEvent = { kind, ...(v ? { visitor: v.id } : {}), at: finite(s.time) }; }
function sendBack(s, v, missed = false, position) {
  const m = v.hayride; if (missed && !m.missed) { s.hayride.missed++; m.missed = true; }
  Object.assign(m, hayrideReturnPlan(s, v, position)); m.phase = "return"; m.elapsed = 0;
}
// Payment, seat assignment and receipt are one transaction at actual boarding.
export function boardHayrideGuest(s, v, events = []) {
  const h = s?.hayride, m = v?.hayride, c = h?.convoy, t = hayrideConfig(s);
  if (s.paused || !hayrideReady(s) || !h.open || !m || m.done || m.phase !== "boarding" || m.elapsed + EPS < t.boardingSeconds || m.charged || h.receipts.some(r => r.visitId === m.visitId) || c.phase !== "loading" || c.manifest.length >= t.seats || hayrideSpendable(s, v) < m.quote) return 0;
  const seats = new Set(c.manifest.map(r => r.seat)); let seat = 0; while (seats.has(seat)) seat++;
  const amount = m.quote;
  v.budget -= amount; m.charged = true; m.ticket = amount; m.seat = seat; m.runId = c.runId; m.phase = "riding"; m.elapsed = 0;
  const receipt = { visitId: m.visitId, runId: c.runId, visitor: v.id, seat, amount, at: finite(s.time) };
  c.manifest.push({ ...receipt }); h.receipts.unshift({ ...receipt }); h.receipts.length = Math.min(256, h.receipts.length);
  h.ticketsSold++; h.income += amount; s.coins += amount; s.earned += amount; mark(s, "ticket", v);
  events.push({ type: "sale", route: "hayride-ticket", visitor: v.id, amount, quantity: 0 }); return amount;
}
// This predicate suspends normal shopping. updateHayride owns all phase clocks.
export const tickHayrideVisit = (s, v) => !!(v.hayride && !v.hayride.done);
function settle(s, events) {
  const h = s.hayride, c = h.convoy, t = hayrideConfig(s), guests = live(s);
  const waitingPoses = new Map(guests.filter(v => ["queue", "boarding"].includes(v.hayride.phase)).map(v => [v.id, hayrideGuestPose(s, v)]));
  for (const v of guests) {
    const m = v.hayride;
    if (["approach", "queue", "boarding"].includes(m.phase) && !h.open) { sendBack(s, v, true, waitingPoses.get(v.id)); continue; }
    if (m.phase === "approach" && m.elapsed + EPS >= m.approachSeconds) { m.phase = "queue"; m.elapsed = 0; }
    if (m.phase === "queue" && m.waited + EPS >= HAYRIDE_PROPERTY.queuePatience) { sendBack(s, v, true, waitingPoses.get(v.id)); continue; }
    if (m.phase === "boarding" && m.elapsed + EPS >= t.boardingSeconds && !boardHayrideGuest(s, v, events)) sendBack(s, v, true, waitingPoses.get(v.id));
    if (m.phase === "return" && m.elapsed + EPS >= m.returnSeconds) {
      m.done = true; m.elapsed = m.returnSeconds; m.wentHome = m.fromStall || m.fleeing; m.fledHome = m.fleeing; m.justArrived = !m.wentHome;
    }
  }
  if (c.phase === "departing" && c.elapsed + EPS >= HAYRIDE_PROPERTY.departureSeconds) { c.phase = "circuit"; c.elapsed = 0; }
  if (c.phase === "circuit" && c.elapsed + EPS >= t.circuitSeconds) { c.phase = "arriving"; c.elapsed = 0; c.progress = 1; }
  if (c.phase === "arriving" && c.elapsed + EPS >= HAYRIDE_PROPERTY.arrivalSeconds) {
    c.phase = "unloading"; c.elapsed = 0;
    for (const v of guests) if (c.manifest.some(r => r.visitId === v.hayride.visitId)) { v.hayride.phase = "unloading"; v.hayride.elapsed = 0; }
  }
  if (c.phase === "unloading" && c.elapsed + EPS >= HAYRIDE_PROPERTY.unloadSeconds) {
    for (const v of guests) if (c.manifest.some(r => r.visitId === v.hayride.visitId)) {
      const m = v.hayride; h.completed++; m.fleeing = m.terror >= 62 + m.bravery * .28;
      if (m.fleeing) h.runHome++;
      if (v.needs) v.needs.happiness = bounded(v.needs.happiness + (m.fleeing ? -12 : 10), 15, 100, 70);
      sendBack(s, v); mark(s, m.fleeing ? "frightened" : "survivor", v);
    }
    events.push({ type: "hayride-returned", runId: c.runId, visitors: c.manifest.length });
    h.convoy = freshConvoy(h.nextRun++); return;
  }
  if (c.phase !== "loading") return;
  const boarding = guests.find(v => v.hayride.phase === "boarding");
  if (!boarding && c.manifest.length && (c.manifest.length >= t.seats || c.loadWait + EPS >= HAYRIDE_PROPERTY.maxWait || !h.open)) {
    c.phase = "departing"; c.elapsed = 0; c.progress = 0; h.departures++; mark(s, "departure");
    events.push({ type: "hayride-departed", runId: c.runId, visitors: c.manifest.length }); return;
  }
  if (!boarding && h.open && c.manifest.length < t.seats && (!c.manifest.length || c.loadWait + t.boardingSeconds <= HAYRIDE_PROPERTY.maxWait + EPS)) {
    const next = hayrideQueue(s)[0]; if (next) { next.hayride.phase = "boarding"; next.hayride.elapsed = 0; }
  }
}
// Event-sized slices make large updates equivalent to many little ones. There
// are only finitely many guests; no new guests or repeat visits are minted here.
export function updateHayride(s, dt, events = []) {
  if (s.paused || !hayrideReady(s) || !Number.isFinite(dt) || dt <= 0) return;
  let remaining = dt;
  for (let step = 0; step < 2048; step++) {
    settle(s, events); if (remaining <= EPS) break;
    const c = s.hayride.convoy, t = hayrideConfig(s), guests = live(s); let until = Infinity;
    const duration = { departing: HAYRIDE_PROPERTY.departureSeconds, circuit: t.circuitSeconds, arriving: HAYRIDE_PROPERTY.arrivalSeconds, unloading: HAYRIDE_PROPERTY.unloadSeconds }[c.phase];
    if (duration) until = Math.min(until, Math.max(EPS, duration - c.elapsed));
    if (c.phase === "loading" && c.manifest.length && !guests.some(v => v.hayride.phase === "boarding")) until = Math.min(until, Math.max(EPS, HAYRIDE_PROPERTY.maxWait - c.loadWait));
    for (const v of guests) {
      const m = v.hayride, d = m.phase === "approach" ? m.approachSeconds : m.phase === "return" ? m.returnSeconds : m.phase === "boarding" ? t.boardingSeconds : null;
      if (d !== null) until = Math.min(until, Math.max(EPS, d - m.elapsed));
      if (m.phase === "queue") until = Math.min(until, Math.max(EPS, HAYRIDE_PROPERTY.queuePatience - m.waited));
    }
    if (!Number.isFinite(until)) break;
    const use = Math.min(remaining, until);
    for (const v of guests) {
      const m = v.hayride;
      if (["approach", "boarding", "return"].includes(m.phase)) m.elapsed += use;
      if (m.phase === "queue") m.waited += use;
      if (m.phase === "unloading") m.elapsed = c.elapsed + use;
      if (m.phase === "riding" && c.phase === "circuit") m.terror = bounded(m.terror + use / t.circuitSeconds * (10 + hayrideScareRating(s) * .9) * (1 - m.bravery / 200), 0, 100);
    }
    if (c.phase === "loading" && c.manifest.length) c.loadWait += use;
    if (duration) c.elapsed += use;
    if (c.phase === "circuit") c.progress = bounded(c.elapsed / t.circuitSeconds, 0, 1);
    remaining -= use;
  }
}

// Plain validated state only: active visits are restored separately so their
// ids and paid manifests can be reconciled before the next simulation step.
export function restoreHayride(raw) {
  const h = freshHayride(); if (!raw || typeof raw !== "object") return h;
  h.purchased = raw.purchased === true; if (!h.purchased) return h;
  h.tier = Math.max(1, count(raw.tier, HAYRIDE_TIERS.length)); h.open = raw.open === true;
  const t = HAYRIDE_TIERS[h.tier - 1]; h.ticketPrice = Math.round(bounded(raw.ticketPrice, t.minTicket, t.maxTicket, 8));
  for (const k of ["invested", "ticketsSold", "completed", "missed", "runHome", "departures", "nextVisit", "nextRun"]) h[k] = count(raw[k]);
  h.nextRun = Math.max(1, h.nextRun); h.income = bounded(raw.income, 0, 1e12); h.partyAt = Number.isFinite(raw.partyAt) && raw.partyAt >= 0 ? Math.min(1e12, raw.partyAt) : null;
  h.haunts.owned = [...new Set((Array.isArray(raw.haunts?.owned) ? raw.haunts.owned : []).filter(id => HAYRIDE_SCARE_BY_ID[id]?.tier <= h.tier))];
  h.haunts.active = [...new Set((Array.isArray(raw.haunts?.active) ? raw.haunts.active : []).filter(id => h.haunts.owned.includes(id)))];
  const receipts = new Set();
  for (const r of Array.isArray(raw.receipts) ? raw.receipts.slice(0, 256) : []) {
    if (!r || !validVisit(r.visitId) || !validRun(r.runId) || receipts.has(r.visitId) || !Number.isSafeInteger(r.visitor) || r.visitor < 0 || !Number.isInteger(r.amount) || r.amount < 4 || r.amount > 20 || !Number.isInteger(r.seat) || r.seat < 0 || r.seat >= 8) continue;
    h.receipts.push({ visitId: r.visitId, runId: r.runId, visitor: r.visitor, seat: r.seat, amount: r.amount, at: Math.max(0, finite(r.at)) }); receipts.add(r.visitId);
    h.nextVisit = Math.max(h.nextVisit, Number(r.visitId.slice(8)) + 1); h.nextRun = Math.max(h.nextRun, Number(r.runId.slice(12)) + 1);
  }
  const c = raw.convoy, convoyPhases = new Set(["loading", "departing", "circuit", "arriving", "unloading"]);
  if (c && convoyPhases.has(c.phase) && validRun(c.runId)) {
    const duration = { loading: 0, departing: HAYRIDE_PROPERTY.departureSeconds, circuit: t.circuitSeconds, arriving: HAYRIDE_PROPERTY.arrivalSeconds, unloading: HAYRIDE_PROPERTY.unloadSeconds }[c.phase];
    h.convoy = { phase: c.phase, elapsed: bounded(c.elapsed, 0, duration), progress: c.phase === "circuit" ? bounded(c.elapsed / t.circuitSeconds, 0, 1) : ["arriving", "unloading"].includes(c.phase) ? 1 : 0, loadWait: bounded(c.loadWait, 0, HAYRIDE_PROPERTY.maxWait), runId: c.runId, manifest: [] };
    h.nextRun = Math.max(h.nextRun, Number(c.runId.slice(12)) + 1);
    const usedSeats = new Set(), usedVisits = new Set(), usedGuests = new Set();
    for (const m of Array.isArray(c.manifest) ? c.manifest : []) {
      const receipt = h.receipts.find(r => r.visitId === m?.visitId && r.runId === c.runId && r.visitor === m.visitor && r.seat === m.seat);
      if (!receipt || receipt.seat >= t.seats || usedSeats.has(receipt.seat) || usedVisits.has(receipt.visitId) || usedGuests.has(receipt.visitor)) continue;
      h.convoy.manifest.push({ ...receipt }); usedSeats.add(receipt.seat); usedVisits.add(receipt.visitId); usedGuests.add(receipt.visitor);
    }
  }
  if (!c || !convoyPhases.has(c.phase) || !validRun(c.runId)) h.convoy = freshConvoy(h.nextRun++);
  return h;
}
export function saveHayrideVisitors(s) {
  return live(s).map(v => ({ ...v, festival: { done: true }, hollow: v.hollow?.done === true ? { done: true } : null, basket: (v.basket ?? []).map(l => ({ ...l })), hayride: { ...v.hayride } }));
}
export function restoreHayrideVisitors(raw, s) {
  if (!hayrideReady(s) || !Array.isArray(raw)) return;
  const h = s.hayride, ids = new Set((s.visitors ?? []).map(v => v.id)), visits = new Set(); let boarding = false;
  for (const input of raw.slice(0, 50)) {
    const m = input?.hayride;
    if (!m || !phases.has(m.phase) || !Number.isSafeInteger(input.id) || input.id < 0 || ids.has(input.id) || !validVisit(m.visitId) || visits.has(m.visitId) || !Number.isFinite(input.budget) || input.budget < 0) continue;
    const receipt = h.receipts.find(r => r.visitId === m.visitId && r.visitor === input.id), charged = m.charged === true && !!receipt;
    if (["riding", "unloading"].includes(m.phase) && (!charged || !h.convoy.manifest.some(r => r.visitId === m.visitId))) continue;
    if (m.charged && !charged || charged && !["riding", "unloading", "return"].includes(m.phase)) continue;
    const approachSeconds = bounded(m.approachSeconds, .1, 300, HAYRIDE_PROPERTY.approachSeconds), returnSeconds = bounded(m.returnSeconds, .1, 300, HAYRIDE_PROPERTY.returnSeconds);
    const returnPath = Array.isArray(m.returnPath) && m.returnPath.length >= 2 && m.returnPath.length <= 64 && m.returnPath.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && Math.abs(n) <= 200)) ? m.returnPath.map(p => [...p]) : null;
    let phase = m.phase; if (phase === "boarding") { if (boarding || h.convoy.phase !== "loading") phase = "queue"; else boarding = true; }
    const duration = phase === "approach" ? approachSeconds : phase === "return" ? returnSeconds : phase === "boarding" ? hayrideConfig(s).boardingSeconds : phase === "unloading" ? HAYRIDE_PROPERTY.unloadSeconds : 0;
    const basket = (Array.isArray(input.basket) ? input.basket : []).slice(0, 128).filter(l => Number.isInteger(l?.variety) && l.variety >= 0 && l.variety < 4 && Number.isSafeInteger(l.quantity) && l.quantity > 0 && l.quantity <= 1000 && Number.isFinite(l.price) && l.price >= 0 && l.price <= 10000).map(l => ({ variety: l.variety, quantity: l.quantity, price: l.price, fresh: l.fresh === true }));
    const wish = Number.isInteger(input.wish?.variety) && input.wish.variety >= 0 && input.wish.variety < 4 && Number.isFinite(input.wish.purse) && input.wish.purse >= 0 && input.wish.purse <= 10000 ? { variety: input.wish.variety, purse: input.wish.purse } : null;
    const v = { ...input, id: input.id, kind: count(input.kind, 10), profile: count(input.profile, 20), spot: count(input.spot, 7), age: Math.max(0, finite(input.age)), budget: Math.min(10000, input.budget), originalBudget: Math.max(input.budget, finite(input.originalBudget, input.budget)), preferred: Array.isArray(input.preferred) ? input.preferred.filter(n => Number.isInteger(n) && n >= 0 && n < 4) : [0], basketLimit: Math.max(1, count(input.basketLimit, input.vip === true ? 20 : 10)), basket, wish, paymentHold: 0, leaveAt: null, outcome: "shopping", festival: { done: true }, hollow: input.hollow?.done === true ? { done: true } : null, hollowConsidered: true, hayrideConsidered: true,
      hayride: { visitId: m.visitId, order: Number(m.visitId.slice(8)), routeVersion: HAYRIDE_PROPERTY.routeVersion, fromStall: m.fromStall === true, phase, elapsed: bounded(m.elapsed, 0, duration), approachSeconds, returnSeconds, ...(returnPath ? { returnPath } : {}), waited: bounded(m.waited, 0, HAYRIDE_PROPERTY.queuePatience), quote: Math.round(bounded(m.quote, hayrideConfig(s).minTicket, hayrideConfig(s).maxTicket, h.ticketPrice)), charged, ticket: charged ? receipt.amount : 0, seat: charged ? receipt.seat : null, runId: charged ? receipt.runId : null, terror: bounded(m.terror, 0, 100), bravery: bounded(m.bravery, 0, 100, 55), done: false, missed: m.missed === true, fleeing: m.fleeing === true } };
    if (!v.needs || typeof v.needs !== "object") v.needs = { thirst: 50, hunger: 50, happiness: 70, value: 1 };
    s.visitors.push(v); ids.add(v.id); visits.add(m.visitId); s.nextVisitor = Math.max(s.nextVisitor, v.id + 1); h.nextVisit = Math.max(h.nextVisit, Number(m.visitId.slice(8)) + 1);
  }
  h.convoy.manifest = h.convoy.manifest.filter(r => s.visitors.some(v => v.id === r.visitor && v.hayride?.visitId === r.visitId && !v.hayride.done));
  if (!h.convoy.manifest.length && h.convoy.phase !== "loading") h.convoy = freshConvoy(h.nextRun++);
}
