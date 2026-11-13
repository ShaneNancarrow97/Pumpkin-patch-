// Saved choices and timers make occasional crowds repeatable across reloads.
import { VISITOR_EVENT_UPGRADES, VISITOR_EVENT_BY_ID, VISITOR_EVENT_GAP, COURTIER_KINDS } from "../content/visitor-events.js";
import { patchLevel } from "./levels.js";

const whole = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(1e9, n) : 0;
// The farm's own guests. Guests out on the hayride, and the attractions' own
// guests (bonus), are bounded by their attraction instead, and by the total.
export const visitorWorldCount = s => (s.visitors ?? []).filter(v => !v.bonus && !(v.hayride && !v.hayride.done)).length + (s.arriving ?? []).filter(a => !a.bonus).length;
export const visitorTotalCount = s => (s.visitors?.length ?? 0) + (s.arriving?.length ?? 0);
const count = n => Number.isFinite(n) && n >= 0 ? Math.min(1e9, n) : 0;
const channel = id => ({ level: 0, enabled: true, remaining: VISITOR_EVENT_BY_ID[id].seconds, event: 0, pending: null });
export const freshVisitorEvents = () => ({ seed: 0x4d69646e, rush: channel("rush"), vip: channel("vip"), ledger: { rushGroups: 0, rushGuests: 0, vipGroups: 0, vipGuests: 0 } });
function roll(s, from, to) {
  const e = s.visitorEvents;
  let n = e.seed >>> 0; n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
  e.seed = n >>> 0 || 0x4d69646e;
  return from + e.seed % (to - from + 1);
}
export function visitorEventUpgradeCost(s, id) {
  const u = VISITOR_EVENT_BY_ID[id]; return u?.costs[s.visitorEvents?.[id]?.level ?? 0];
}
export function buyVisitorEventUpgrade(s, id) {
  const u = VISITOR_EVENT_BY_ID[id], e = s.visitorEvents?.[id], price = visitorEventUpgradeCost(s, id);
  if (s.paused || !u || !e || price === undefined || patchLevel(s).level < u.level || s.coins < price) return false;
  s.coins -= price; e.level++; return true;
}
export function setVisitorEventEnabled(s, id, on) {
  const e = VISITOR_EVENT_BY_ID[id] && s.visitorEvents?.[id];
  if (s.paused || !e?.level || typeof on !== "boolean") return false;
  e.enabled = on; return true;
}
export function updateVisitorEvents(s, dt, events = []) {
  if (s.paused || !s.visitorEvents || !Number.isFinite(dt) || dt <= 0) return;
  for (const u of VISITOR_EVENT_UPGRADES) {
    const e = s.visitorEvents[u.id]; if (!e.level || !e.enabled) continue;
    e.remaining = Math.max(0, e.remaining - dt);
    if (e.pending || e.remaining > 1e-8 || e.event >= 1e9) continue;
    const size = roll(s, u.min, u.max), offset = u.id === "vip" ? roll(s, 0, 3) : 0;
    const offers = u.id === "vip" ? Array.from({ length: size }, (_, i) => ({ kind: COURTIER_KINDS[(offset + i) % 4], budget: roll(s, 140, 250), basketLimit: roll(s, 10, 14) })) : [];
    e.pending = { serial: ++e.event, count: size, delivered: [], queued: [], party: null, offers };
    e.remaining = u.seconds;
    s.visitorEvents.ledger[u.id + "Groups"]++;
    events.push({ type: "visitor-event", event: u.id, count: size });
  }
}

// Queued entries still belong to the saved occasion until they actually enter.
// A save drops ordinary arrivals; restore requeues only the unentered members.
export function queueVisitorEventArrivals(s, slots) {
  if (!s.visitorEvents || !Number.isInteger(slots) || slots <= 0) return [];
  const entries = [];
  for (const id of ["rush", "vip"]) {
    const e = s.visitorEvents[id], p = e.pending; if (!p || !slots) continue;
    if (p.party === null) p.party = s.nextParty++;
    const free = Array.from({ length: p.count }, (_, i) => i).filter(i => !p.delivered.includes(i) && !p.queued.includes(i)).slice(0, slots);
    const ahead = p.queued.length;
    for (const [i, place] of free.entries()) {
      entries.push({ party: p.party, place, size: p.count, wait: (ahead + i) * VISITOR_EVENT_GAP, eventType: id, eventSerial: p.serial, ...(id === "vip" ? { courtier: true, offer: { ...p.offers[place] } } : {}) });
      p.queued.push(place); slots--;
    }
  }
  return entries;
}
export function finishVisitorEventArrival(s, arrival) {
  const e = s.visitorEvents?.[arrival.eventType], p = e?.pending;
  if (!p || p.serial !== arrival.eventSerial || !p.queued.includes(arrival.place) || p.delivered.includes(arrival.place)) return false;
  p.queued = p.queued.filter(i => i !== arrival.place); p.delivered.push(arrival.place);
  s.visitorEvents.ledger[arrival.eventType + "Guests"]++;
  if (p.delivered.length === p.count) e.pending = null;
  return true;
}

export function restoreVisitorEvents(raw, s) {
  const result = freshVisitorEvents();
  if (!raw || typeof raw !== "object") return result;
  if (Number.isInteger(raw.seed) && raw.seed > 0 && raw.seed <= 0xffffffff) result.seed = raw.seed;
  for (const key of Object.keys(result.ledger)) result.ledger[key] = whole(raw.ledger?.[key]);
  for (const u of VISITOR_EVENT_UPGRADES) {
    const r = raw[u.id], e = result[u.id]; if (!r || typeof r !== "object") continue;
    e.level = Math.min(u.costs.length, whole(r.level)); e.enabled = r.enabled !== false;
    e.event = whole(r.event); e.remaining = Number.isFinite(r.remaining) ? Math.max(0, Math.min(u.seconds, r.remaining)) : u.seconds;
    const p = r.pending;
    if (!e.level || !p || !Number.isInteger(p.serial) || p.serial < 1 || p.serial > 1e9 || !Number.isInteger(p.count) || p.count < u.min || p.count > u.max) continue;
    const delivered = [...new Set((Array.isArray(p.delivered) ? p.delivered : []).filter(i => Number.isInteger(i) && i >= 0 && i < p.count))];
    if (delivered.length === p.count) { e.remaining = u.seconds; continue; }
    const offers = u.id === "vip" && Array.isArray(p.offers) && p.offers.length === p.count ? p.offers.map(o => o && COURTIER_KINDS.includes(o.kind) && Number.isInteger(o.budget) && o.budget >= 140 && o.budget <= 250 && Number.isInteger(o.basketLimit) && o.basketLimit >= 10 && o.basketLimit <= 14 ? { kind: o.kind, budget: o.budget, basketLimit: o.basketLimit } : null) : [];
    if (u.id === "vip" && offers.some(o => !o) || u.id === "vip" && offers.length !== p.count) continue;
    const party = Number.isSafeInteger(p.party) && p.party >= 0 && p.party < 1e9 ? p.party : null;
    e.pending = { serial: p.serial, count: p.count, delivered, queued: [], party, offers };
    e.event = Math.max(e.event, p.serial);
    if (s && party !== null) s.nextParty = Math.max(s.nextParty, party + 1);
  }
  return result;
}

// Extra meal money is added once on arrival, then protected while choosing
// pumpkins. It remains part of the same finite wallet, not a second account.
export const starvingGuest = (s, id) => !!s.kitchen?.purchased && Number.isSafeInteger(id) && id >= 0 && (id + 7) % 40 === 0;
export const foodMealAllowance = (s, id) => s.kitchen?.purchased ? starvingGuest(s, id) ? 50 : 12 + 2 * Math.min(6, whole(s.visitorUpgrades?.appetite)) : 0;
export function mealPurseReserve(s, guest) {
  if (!s.kitchen?.purchased || guest.food?.status === "paid" || guest.dining?.paid) return 0;
  return Math.min(count(guest.budget), count(guest.mealPurse));
}
export const pumpkinShoppingProfile = (s, guest) => ({ ...guest, budget: Math.max(0, count(guest.budget) - mealPurseReserve(s, guest)) });
