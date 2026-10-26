import { VARIETY_COUNT } from "../content/pumpkin-varieties.js";
// Pure attraction and foyer rules. The same visitors own their money and visit
// phase indoors and outdoors; changing the camera never creates a new guest.
import { visitorCapacity, visitorReservations, COUNTER_SPOTS } from "./selling.js";
import { patchLevel } from "./levels.js";
import { available } from "./stock.js";
import { VARIETIES } from "./farm.js";
import { validPieceColour } from "./piece-colours.js";
import { extendFarmRoute, farmPathEnd, GATE_Z, counterPlace } from "../content/farm-layout.js";
import { HOLLOW_PROPERTY, FOYER_TIERS, FOYER_DECOR, FOYER_DECOR_BY_ID, FOYER_FINISHES, FOYER_FINISH_BY_ID, FOYER_DEFAULT_FINISHES, HOLLOW_LINK, hollowLinkFrom, HOLLOW_FRONT_APPROACH, HOLLOW_RETURN, MAZE_PREFABS, MAZE_PREFAB_BY_ID } from "../content/hollow-house.js";
export * from "../content/hollow-house.js";

const EPS = 1e-7, insidePhases = new Set(["entering", "queue", "serving", "admission", "returning", "requeue", "exit"]), mazePhases = new Set(["to-maze", "maze"]);
const count = (n, max = 1e12) => Number.isSafeInteger(n) ? Math.max(0, Math.min(max, n)) : 0;
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const angle = n => ((n % 360) + 360) % 360;
const lookup = (map, id) => typeof id === "string" ? map[id] : null;
const inventory = () => Object.fromEntries(FOYER_DECOR.map(d => [d.id, 0]));
const cash = (s, price) => !s.paused && Number.isFinite(s.coins) && s.coins >= price;
export function freshHollowHouse() {
  return { purchased: false, status: "derelict", restoreRemaining: 0, tier: 1, open: false, ticketPrice: 6, invested: 0, ticketsSold: 0, income: 0, completed: 0, missed: 0, runHome: 0, repeatVisits: 0, haunts: { owned: [], active: [] }, nextVisit: 0, receipts: [], lastEvent: null,
    foyer: { ownedDecor: inventory(), placed: [
      { instance: "foyer-0", id: "velvet-bench", x: -3, z: 2.7, rotation: 0 },
      { instance: "foyer-1", id: "parlour-table", x: 3.2, z: 2.9, rotation: 0 },
      { instance: "foyer-2", id: "pumpkin-cluster", x: 3.8, z: 1.8, rotation: 0 },
    ], finishes: { ...FOYER_DEFAULT_FINISHES }, ownedFinishes: Object.values(FOYER_DEFAULT_FINISHES), nextInstance: 3 } };
}
export const hollowConfig = s => FOYER_TIERS[Math.max(0, count(s?.hollowHouse?.tier, 5) - 1)];
export const hollowReady = s => s?.hollowHouse?.purchased === true && s.hollowHouse.status === "ready";
export const hollowUnlocked = s => patchLevel(s).level >= HOLLOW_PROPERTY.level;

// A frightening attraction earns word of mouth, bounded separately from cash.
export function mazeScareRating(s) {
  const h = s?.hollowHouse; if (!h || !hollowReady(s)) return 0;
  const active = new Set(h.haunts?.active ?? []), owned = new Set(h.haunts?.owned ?? []);
  const strength = MAZE_PREFABS.reduce((n,p) => n + (active.has(p.id) && owned.has(p.id) && p.tier <= h.tier ? p.scare : 0), 0);
  return strength ? Math.min(100, 8 + (h.tier - 1) * 2 + strength) : 0;
}
export const mazeFootfallBonus = s => hollowReady(s) && s.hollowHouse.open ? mazeScareRating(s) / 200 : 0;
export function buyMazePrefab(s, id) {
  const p = lookup(MAZE_PREFAB_BY_ID, id), h = s?.hollowHouse;
  if (!p || !hollowReady(s) || p.tier > h.tier || !cash(s, p.cost) || h.haunts?.owned.includes(id)) return false;
  if (!h.haunts) h.haunts = { owned: [], active: [] };
  s.coins -= p.cost; h.invested += p.cost; h.haunts.owned.push(id); h.haunts.active.push(id); return true;
}
export function setMazePrefabActive(s, id, on) {
  const p = lookup(MAZE_PREFAB_BY_ID, id), h = s?.hollowHouse;
  if (!p || !hollowReady(s) || s.paused || typeof on !== "boolean" || p.tier > h.tier || !h.haunts?.owned.includes(id)) return false;
  h.haunts.active = h.haunts.active.filter(value => value !== id); if (on) h.haunts.active.push(id); return true;
}

export const ticketPriceRange = s => ({ min: hollowConfig(s).minTicket, max: hollowConfig(s).maxTicket });
export function buyHollowProperty(s) {
  if (!s.hollowHouse || s.hollowHouse.purchased || !hollowUnlocked(s) || !cash(s, HOLLOW_PROPERTY.price)) return false;
  const h = s.hollowHouse; s.coins -= HOLLOW_PROPERTY.price; h.invested += HOLLOW_PROPERTY.price; h.purchased = true; return true;
}
export function beginHollowRestoration(s) {
  const h = s.hollowHouse;
  if (!h?.purchased || h.status !== "derelict" || !cash(s, HOLLOW_PROPERTY.restorationCost)) return false;
  s.coins -= HOLLOW_PROPERTY.restorationCost; h.invested += HOLLOW_PROPERTY.restorationCost; h.status = "restoring"; h.restoreRemaining = HOLLOW_PROPERTY.restorationSeconds; h.open = false; return true;
}
// Opening the maze sends a small party straight up the west lane for it, so the
// first scares come within moments rather than waiting on the next stroller.
export const OPENING_PARTY = 2, PARTY_GAP = 120;
export function setHollowOpen(s, open) {
  if (s.paused || !hollowReady(s) || typeof open !== "boolean") return false;
  const h = s.hollowHouse, opening = open && !h.open;
  h.open = open;
  // Closing turns back a party still on its way; reopening sends another only
  // once a party's worth of time has passed and the lane has room for it.
  if (!open && Array.isArray(s.arriving)) s.arriving = s.arriving.filter(a => !a.forMaze);
  const t = Number.isFinite(s.time) ? s.time : 0;
  if (opening && Array.isArray(s.arriving) && Array.isArray(s.visitors) && visitorReservations(s) + OPENING_PARTY <= visitorCapacity(s) && !(t - (h.partyAt ?? -Infinity) < PARTY_GAP)) {
    h.partyAt = t;
    const party = s.nextParty++;
    for (let place = 0; place < OPENING_PARTY; place++) s.arriving.push({ party, place, size: OPENING_PARTY, wait: 0.6 + place * 0.9, forMaze: true });
  }
  return true;
}
export function setHollowTicketPrice(s, price) {
  const r = ticketPriceRange(s); if (s.paused || !hollowReady(s) || !Number.isInteger(price) || price < r.min || price > r.max) return false;
  s.hollowHouse.ticketPrice = price; return true;
}
export function upgradeHollowFoyer(s) {
  const h = s.hollowHouse, next = FOYER_TIERS[h?.tier];
  if (!hollowReady(s) || !next || patchLevel(s).level < next.patchLevel || !cash(s, next.cost)) return false;
  s.coins -= next.cost; h.invested += next.cost; h.tier++;
  // Walls expand immediately, not only when a save is restored. Keep art
  // mounted on the actual new surface and protect the larger service lanes.
  for (const p of h.foyer.placed) if (FOYER_DECOR_BY_ID[p.id]?.layer === "wall") Object.assign(p, candidate(s, p.id, p.x, p.z, p.rotation, p));
  let stored = 0;
  for (const p of [...h.foyer.placed]) if (!foyerFits(s, p.id, p.x, p.z, p.rotation, p.instance, p)) { storeFoyerDecor(s, p.instance); stored++; }
  h.lastEvent = { kind: "expanded", stored, at: s.time }; return true;
}
export function updateHollowHouse(s, dt, events = []) {
  const h = s.hollowHouse; if (!h || s.paused || !Number.isFinite(dt) || dt <= 0) return;
  if (h.status === "restoring") {
    h.restoreRemaining = Math.max(0, h.restoreRemaining - dt);
    if (!h.restoreRemaining) { h.status = "ready"; h.open = false; h.lastEvent = { kind: "restored", at: s.time }; events.push({ type: "hollow-restored" }); }
  }
}

// Shared centred floor plan: functional lanes stay open at every upgrade.
export function foyerLayout(s) {
  const t = hollowConfig(s), w = t.w, d = t.d, counter = { x: -w / 2 + 2.7, z: 0 }, attendant = { x: counter.x, z: -.85 };
  const stairs = { x: -w / 2 + 1.15, z: -d / 2 + 1.5, w: 1.8, d: 2.6 };
  const mazeDoor = { x: w / 2 - 2, z: -d / 2 + .2 }, exitDoor = { x: 0, z: d / 2 };
  const queue = Array.from({ length: t.capacity }, (_, i) => ({ x: -.2 + Math.floor(i / 4) * .8, z: 1.1 + (i % 4) * .58 }));
  return { ...t, width: w, depth: d, x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, counter, attendant, stairs, mazeDoor, exitDoor, queue,
    reserved: [
      { x0: counter.x - 1.6, x1: counter.x + 1.6, z0: -1.5, z1: 1.25 },
      { x0: stairs.x - 1, x1: stairs.x + 1, z0: -d / 2, z1: -d / 2 + 3.1 },
      { x0: -.9, x1: 1.7, z0: 1, z1: d / 2 },
      { x0: -.9, x1: mazeDoor.x + .8, z0: -1.4, z1: 1.1 },
      { x0: mazeDoor.x - .85, x1: mazeDoor.x + .85, z0: -d / 2, z1: .4 },
      { x0: -1.35, x1: 1.35, z0: -d / 2, z1: -d / 2 + 1.1 },
    ] };
}
export function hollowOccupancy(s) {
  const live = (s.visitors ?? []).filter(v => v.hollow && !v.hollow.done), t = hollowConfig(s);
  return { foyer: live.filter(v => insidePhases.has(v.hollow.phase)).length, maze: live.filter(v => mazePhases.has(v.hollow.phase)).length, queue: live.filter(v => ["queue", "serving", "admission"].includes(v.hollow.phase)).length, outside: live.filter(v => ["approach", "door-wait"].includes(v.hollow.phase)).length, total: live.length, capacity: t.capacity, mazeCapacity: t.mazeCapacity };
}
export const foyerGuests = s => (s.visitors ?? []).filter(v => v.hollow && !v.hollow.done && insidePhases.has(v.hollow.phase));
const spareCash = (s, v) => {
  // Attraction spending can change the eventual basket. Keep enough for one
  // affordable pumpkin, without reserving an entire expensive basket first.
  // Someone who has already shopped needs nothing kept back.
  if (v.hollow?.fromStall || v.leaveAt !== null && v.leaveAt !== undefined) return v.budget;
  const affordable = VARIETIES.filter((p,i) => available(s,i)>0 && p.price<=v.budget).map(p=>p.price);
  return v.budget - (affordable.length ? Math.min(...affordable) : 0);
};
const brave = id => ((Math.imul(id + 19, 1103515245) >>> 8) % 100) / 100;
// Who goes to the maze, and when (the same guest never rerolls):
//   "arrival": a new guest comes up the west lane for the maze first, then walks
//     the lantern walk over to the stall for a pumpkin. About a third do, and
//     everyone in the party that opening the maze sends.
//   "after": a guest who has shopped at the stall walks the lantern walk over
//     to the maze from their place at the counter, then goes home down the
//     west lane. About half of the rest.
// Walks from or to the counter are routeVersion 4; version 3 began and ended
// them at its middle, and saves on it keep those routes (restoreHollowVisitors).
export const MAZE_FIRST = .35, MAZE_AFTER = .5;
export function planHollowVisit(s, v, when = "arrival") {
  const h = s.hollowHouse, config = hollowConfig(s), after = when === "after";
  if (!hollowReady(s) || !h.open || !Number.isFinite(v.budget) || spareCash(s, v) < h.ticketPrice || hollowOccupancy(s).outside >= config.capacity) return null;
  if (!v.forMaze && brave(after ? v.id + 7 : v.id) >= (after ? MAZE_AFTER : MAZE_FIRST)) return null;
  // Higher prices need correspondingly braver guests.
  if (!v.forMaze && h.ticketPrice > 6 + brave(v.id + 71) * (config.maxTicket - 4)) return null;
  const route = extendFarmRoute(after ? hollowLinkFrom(counterPlace(v.spot)) : HOLLOW_FRONT_APPROACH, s);
  return { visitId: "hollow-" + h.nextVisit++, routeVersion: 4, fromFront: !after, fromStall: after, phase: "approach", x: route[0][0], z: route[0][1], dx: 0, dz: -1, route: route.map(p => [...p]), segment: 1, elapsed: 0, waited: 0, walking: true, charged: false, ticket: 0, done: false, terror: 0, bravery: 24 + Math.floor(brave(v.id + 421) * 65), runs: 0, repeats: 0, fleeing: false };
}
function walk(m, target, dt) {
  const dx = target[0] - m.x, dz = target[1] - m.z, distance = Math.hypot(dx, dz); m.dx = dx; m.dz = dz; m.walking = distance > .005;
  if (distance < .005) { m.x = target[0]; m.z = target[1]; return dt; }
  const seconds = distance / (HOLLOW_PROPERTY.speed * (m.fleeing ? 1.7 : 1)), fraction = Math.min(1, dt / seconds); m.x += dx * fraction; m.z += dz * fraction; return Math.max(0, dt - seconds);
}
// Out of the house (always from its door): a maze-first guest walks the lantern
// walk back to their place at the stall for a pumpkin; a guest who has already
// shopped, or who ran from a fright, goes home down the west lane.
function returnToShop(s, v) {
  const m = v.hollow, home = m.fromStall || m.fleeing;
  m.phase = home ? "to-border" : "to-shop"; m.routeVersion = 4; m.route = extendFarmRoute(home ? HOLLOW_RETURN : hollowLinkFrom(counterPlace(v.spot)).reverse(), s).map(p => [...p]);
  m.segment = 1; m.x = m.route[0][0]; m.z = m.route[0][1]; m.walking = true; m.elapsed = 0;
}
function event(s, kind, v) { s.hollowHouse.lastEvent = { kind, visitor: v.id, at: s.time }; }
export function chargeHollowTicket(s, v) {
  const h = s.hollowHouse, m = v.hollow;
  if (s.paused || !hollowReady(s) || !h.open || !m || m.charged || h.receipts.some(r => r.visitId === m.visitId) || v.budget < h.ticketPrice || spareCash(s, v) < h.ticketPrice) return 0;
  const amount = h.ticketPrice; if (m.repeats > 0) h.repeatVisits = (h.repeatVisits ?? 0) + 1; v.budget -= amount; m.charged = true; m.ticket = amount; h.ticketsSold++; h.income += amount; s.coins += amount; s.earned += amount;
  h.receipts.unshift({ visitId: m.visitId, visitor: v.id, amount, at: s.time }); h.receipts.length = Math.min(80, h.receipts.length); event(s, "ticket", v); return amount;
}
// True suspends the ordinary stall clock while the same guest visits the house.
export function tickHollowVisit(s, v, dt, events = []) {
  const m = v.hollow; if (!m || m.done) return false;
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return true;
  const h = s.hollowHouse, t = hollowConfig(s); let remaining = dt;
  for (let step = 0; step < 32 && remaining > EPS; step++) {
    if (["approach", "arriving-house", "to-border", "to-shop"].includes(m.phase)) {
      remaining = walk(m, m.route[m.segment], remaining); if (remaining <= EPS) break;
      if (++m.segment < m.route.length) continue;
      if (m.phase === "to-shop") { m.phase = "done"; m.done = true; m.walking = false; m.justArrived = true; return false; }
      if (m.phase === "to-border" && m.fleeing) { m.phase = "done"; m.done = true; m.fledHome = true; m.walking = false; v.outcome = "frightened"; return false; }
      if (m.phase === "to-border") { m.phase = "done"; m.done = true; m.wentHome = true; m.walking = false; return false; }
      m.phase = "door-wait"; m.elapsed = 0; m.walking = false;
    }
    if (!m.charged && !["exit", "to-border", "to-shop"].includes(m.phase) && (!hollowReady(s) || !h.open)) { if (insidePhases.has(m.phase)) { m.phase = "exit"; m.elapsed = 0; } else returnToShop(s, v); continue; }
    if (m.phase === "door-wait") {
      m.waited += remaining;
      // Leave one reception place for returning maze guests, avoiding a full
      // foyer waiting for maze space while a full maze waits for foyer space.
      if (hollowOccupancy(s).foyer >= t.capacity - 1) { if (m.waited > 35) { h.missed++; returnToShop(s, v); continue; } break; }
      m.phase = "entering"; m.elapsed = 0; event(s, "welcome", v);
    }
    if (m.phase === "queue") {
      const before = (s.visitors ?? []).some(other => other !== v && other.hollow && !other.hollow.done && other.id < v.id && ["queue", "serving"].includes(other.hollow.phase));
      if (before || (s.visitors ?? []).some(other => other !== v && other.hollow?.phase === "serving" && !other.hollow.done)) { m.waited += remaining; if (m.waited > 35) { h.missed++; m.phase = "exit"; m.elapsed = 0; continue; } break; }
      m.phase = "serving"; m.elapsed = 0;
    }
    if (m.phase === "admission") {
      if (hollowOccupancy(s).maze >= t.mazeCapacity) { m.waited += remaining; if (m.waited > 35) { h.missed++; m.phase = "exit"; m.elapsed = 0; continue; } break; }
      const amount = chargeHollowTicket(s, v);
      if (!amount) { h.missed++; m.phase = "exit"; m.elapsed = 0; continue; }
      events.push({ type: "sale", route: "hollow-ticket", visitor: v.id, amount, quantity: 0 }); m.phase = "to-maze"; m.elapsed = 0;
    }
    const duration = { entering: 2.2, requeue: 2, serving: t.serviceSeconds, "to-maze": 3, maze: t.mazeSeconds, returning: 2.5, exit: 3 }[m.phase];
    if (duration === undefined) break;
    if (m.phase === "maze" && m.elapsed >= duration - EPS && hollowOccupancy(s).foyer >= t.capacity) break;
    const use = Math.min(remaining, Math.max(0, duration - m.elapsed)); m.elapsed += use; remaining -= use;
    if (m.phase === "maze") m.terror = Math.min(100, finite(m.terror) + use / duration * (10 + mazeScareRating(s) * .9) * (1 - finite(m.bravery, 55) / 200));
    if (m.elapsed < duration - EPS) break;
    m.elapsed = 0;
    if (m.phase === "entering") m.phase = "queue";
    else if (m.phase === "serving") m.phase = "admission";
    else if (m.phase === "to-maze") { m.phase = "maze"; event(s, "gesture", v); }
    else if (m.phase === "maze") {
      if (hollowOccupancy(s).foyer >= t.capacity) { m.elapsed = duration; break; }
      m.phase = "returning"; m.runs = (m.runs ?? 0) + 1; h.completed++;
      m.fleeing = finite(m.terror) >= 62 + finite(m.bravery, 55) * .28;
      if (m.fleeing) { h.runHome = (h.runHome ?? 0) + 1; if(v.needs)v.needs.happiness = Math.max(15, v.needs.happiness - 12); event(s, "frightened", v); }
      else { if (v.needs) v.needs.happiness = Math.min(100, v.needs.happiness + 12); event(s, "survivor", v); }
    }
    else if (m.phase === "returning") {
      const canRepeat = (h.haunts?.active.length ?? 0) > 0 && !m.fleeing && !m.repeats && h.open && spareCash(s,v) >= h.ticketPrice && m.terror >= 8 && brave(v.id + 211) < .36 && hollowOccupancy(s).foyer < t.capacity;
      if (canRepeat) {
        m.repeats = 1; m.visitId = "hollow-" + h.nextVisit++; m.charged = false; m.ticket = 0; m.waited = 0; m.terror *= .4; m.phase = "requeue"; event(s,"requeue",v);
      } else m.phase = "exit";
    }
    else if (m.phase === "requeue") m.phase = "queue";
    else if (m.phase === "exit") returnToShop(s, v);
  }
  return !m.done;
}

// The renderer reads positions; it never advances the visit or charges a ticket.
export function foyerVisitorPosition(s, v) {
  const m = v.hollow, l = foyerLayout(s), queue = foyerGuests(s).filter(g => ["queue", "serving", "admission", "requeue"].includes(g.hollow.phase)), rank = Math.max(0, queue.findIndex(g => g.id === v.id));
  const blend = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  if (!m) return null;
  if (m.phase === "entering") return blend(l.exitDoor, l.queue[Math.min(rank, l.queue.length - 1)], Math.min(1, m.elapsed / 2.2));
  if (m.phase === "requeue") return blend({ x: .9, z: l.exitDoor.z - 1.2 }, l.queue[Math.min(rank, l.queue.length - 1)], Math.min(1,m.elapsed / 2));
  if (m.phase === "queue") return l.queue[Math.min(rank, l.queue.length - 1)];
  const servicePoint = { x: l.counter.x + .8, z: l.counter.z + 1.1 };
  if (m.phase === "serving") return blend(l.queue[0], servicePoint, Math.min(1, m.elapsed / .8));
  if (m.phase === "admission") return servicePoint;
  if (m.phase === "to-maze") { const t=Math.min(1,m.elapsed/3),corner={x:l.mazeDoor.x,z:1.1}; return t<.5?blend(servicePoint,corner,t*2):blend(corner,l.mazeDoor,(t-.5)*2); }
  if (m.phase === "returning") return blend(l.mazeDoor, { x: .9, z: l.exitDoor.z - 1.2 }, Math.min(1, m.elapsed / 2.5));
  if (m.phase === "exit") return blend({ x: .9, z: l.exitDoor.z - 1.2 }, l.exitDoor, Math.min(1, m.elapsed / 3));
  return null;
}

// Decoration surfaces use oriented rectangles and share the core circulation plan.
function candidate(s, id, x, z, rotation = 0, options = {}) {
  const d = lookup(FOYER_DECOR_BY_ID, id); if (!d || ![x, z, rotation].every(Number.isFinite)) return null;
  const l = foyerLayout(s), wall = ["left", "right"].includes(options.wall) ? options.wall : "back";
  const p = { id, x, z, rotation: angle(rotation) };
  if(validPieceColour(options.tint))p.tint=options.tint;
  if (d.layer === "wall") {
    p.wall = wall; p.y = Math.max(1.2, Math.min(3.1, finite(options.y, 2.2)));
    if (wall === "back") { p.z = l.z0 + .13; p.rotation = 0; }
    else { p.x = wall === "left" ? l.x0 + .13 : l.x1 - .13; p.rotation = wall === "left" ? 90 : 270; }
  }
  return p;
}
function rect(id, x, z, rotation) {
  const d = FOYER_DECOR_BY_ID[id], a = rotation * Math.PI / 180;
  return { x, z, hx: d.w / 2, hz: d.d / 2, ux: Math.cos(a), uz: -Math.sin(a), vx: Math.sin(a), vz: Math.cos(a) };
}
function overlap(a, b) {
  for (const [x, z] of [[a.ux, a.uz], [a.vx, a.vz], [b.ux, b.uz], [b.vx, b.vz]]) {
    const distance = Math.abs((a.x - b.x) * x + (a.z - b.z) * z), ra = a.hx * Math.abs(a.ux * x + a.uz * z) + a.hz * Math.abs(a.vx * x + a.vz * z), rb = b.hx * Math.abs(b.ux * x + b.uz * z) + b.hz * Math.abs(b.vx * x + b.vz * z);
    if (distance >= ra + rb - EPS) return false;
  } return true;
}
const axis = b => ({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, hx: (b.x1 - b.x0) / 2, hz: (b.z1 - b.z0) / 2, ux: 1, uz: 0, vx: 0, vz: 1 });
export function foyerFits(s, id, x, z, rotation = 0, ignore, options = {}) {
  const p = candidate(s, id, x, z, rotation, options), d = lookup(FOYER_DECOR_BY_ID, id); if (!p || !s.hollowHouse?.foyer) return false;
  const l = foyerLayout(s), r = rect(id, p.x, p.z, p.rotation), hw = Math.abs(r.ux) * r.hx + Math.abs(r.vx) * r.hz, hd = Math.abs(r.uz) * r.hx + Math.abs(r.vz) * r.hz;
  if (d.layer === "wall") {
    const centre = p.wall === "back" ? p.x : p.z, length = p.wall === "back" ? l.w : l.d;
    if (Math.abs(centre) + d.w / 2 > length / 2 - .4) return false;
    const overlapsFixture = (u, w, y, h) => Math.abs(centre-u) < (d.w+w)/2-EPS && p.y < y+h-EPS && p.y+d.height > y+EPS;
    if (p.wall !== "back" && (p.z + d.w / 2 > l.d * .05 || overlapsFixture(-1.1, 1.35, 1.6, 1.8))) return false;
    if (p.wall === "back" && (overlapsFixture(-1.4, 1.4, 1.6, 1.8) || overlapsFixture(.1, 2.6, 0, 3.95))) return false;
    if (p.wall === "back" && (p.x - d.w / 2 < l.x0 + 2.4 || p.x + d.w / 2 > l.mazeDoor.x - .9)) return false;
    if (p.wall === "left" && p.z - d.w / 2 < l.z0 + 3.1) return false;
  } else {
    if (p.x - hw < l.x0 + .35 || p.x + hw > l.x1 - .35 || p.z - hd < l.z0 + .35 || p.z + hd > l.z1 - .35) return false;
    if (d.layer === "floor" && l.reserved.some(b => overlap(r, axis(b)))) return false;
    if (d.layer === "ceiling" && overlap(r, axis({x0:-1,x1:1,z0:-.7,z1:1.2}))) return false;
  }
  return !s.hollowHouse.foyer.placed.some(q => {
    if (q.instance === ignore) return false; const other = FOYER_DECOR_BY_ID[q.id]; if (!other || d.layer !== other.layer) return false;
    if (d.layer === "wall") return q.wall === p.wall && Math.abs((p.wall === "back" ? p.x : p.z) - (p.wall === "back" ? q.x : q.z)) < (d.w + other.w) / 2 - EPS && p.y < q.y + other.height - EPS && p.y + d.height > q.y + EPS;
    return overlap(r, rect(q.id, q.x, q.z, q.rotation));
  });
}
const decorEditable = s => hollowReady(s) && !s.paused;
export function buyFoyerDecor(s, id) {
  const d = lookup(FOYER_DECOR_BY_ID, id), f = s.hollowHouse?.foyer; if (!d || !f || !decorEditable(s) || d.tier > s.hollowHouse.tier || !cash(s, d.cost) || f.ownedDecor[id] + f.placed.filter(p => p.id === id).length >= 100) return false;
  s.coins -= d.cost; s.hollowHouse.invested += d.cost; f.ownedDecor[id]++; return true;
}
export function placeFoyerDecor(s, id, x, z, rotation = 0, options = {}) {
  const f = s.hollowHouse?.foyer, d = lookup(FOYER_DECOR_BY_ID, id); if (!f || !d || !decorEditable(s) || !f.ownedDecor[id] || f.placed.length >= hollowConfig(s).decorCapacity || !foyerFits(s, id, x, z, rotation, null, options)) return false;
  const p = candidate(s, id, x, z, rotation, options); let instance; do { instance = "foyer-" + f.nextInstance++; } while (f.placed.some(q => q.instance === instance));
  p.instance = instance; f.ownedDecor[id]--; f.placed.push(p); return p;
}
export function moveFoyerDecor(s, instance, x, z, rotation, options = {}) {
  const p = s.hollowHouse?.foyer.placed.find(q => q.instance === instance); if (!p || !decorEditable(s) || !foyerFits(s, p.id, x, z, rotation, instance, { ...p, ...options })) return false;
  Object.assign(p, candidate(s, p.id, x, z, rotation, { ...p, ...options })); return p;
}
export function storeFoyerDecor(s, instance) {
  const f = s.hollowHouse?.foyer, index = f?.placed.findIndex(p => p.instance === instance); if (!f || index < 0 || !decorEditable(s)) return false;
  const [p] = f.placed.splice(index, 1); f.ownedDecor[p.id]++; return true;
}
export function buyFoyerFinish(s, id) {
  const item = lookup(FOYER_FINISH_BY_ID, id), h = s.hollowHouse;
  if (!item || !decorEditable(s) || item.tier > h.tier || h.foyer.ownedFinishes.includes(id) || !cash(s, item.cost)) return false;
  s.coins -= item.cost; h.invested += item.cost; h.foyer.ownedFinishes.push(id); return true;
}
export function equipFoyerFinish(s, id) {
  const item = lookup(FOYER_FINISH_BY_ID, id), h = s.hollowHouse;
  if (!item || !decorEditable(s) || item.tier > h.tier || !h.foyer.ownedFinishes.includes(id)) return false;
  h.foyer.finishes[item.category] = id; return true;
}

export function restoreHollowHouse(raw) {
  const h = freshHollowHouse(); if (!raw || typeof raw !== "object") return h;
  h.purchased = raw.purchased === true; h.status = h.purchased && ["restoring", "ready"].includes(raw.status) ? raw.status : "derelict";
  h.tier = h.status === "ready" ? Math.max(1, count(raw.tier, 5)) : 1; h.open = h.status === "ready" && raw.open === true;
  h.restoreRemaining = h.status === "restoring" ? Math.max(.001, Math.min(HOLLOW_PROPERTY.restorationSeconds, finite(raw.restoreRemaining, HOLLOW_PROPERTY.restorationSeconds))) : 0;
  h.ticketPrice = Math.max(4, Math.min(FOYER_TIERS[h.tier - 1].maxTicket, Number.isInteger(raw.ticketPrice) ? raw.ticketPrice : 6));
  for (const k of ["invested", "ticketsSold", "income", "completed", "missed", "runHome", "repeatVisits", "nextVisit"]) h[k] = count(raw[k]);
  h.haunts.owned = [...new Set((Array.isArray(raw.haunts?.owned) ? raw.haunts.owned : []).filter(id => lookup(MAZE_PREFAB_BY_ID,id)))];
  h.haunts.active = [...new Set((Array.isArray(raw.haunts?.active) ? raw.haunts.active : []).filter(id => h.haunts.owned.includes(id) && MAZE_PREFAB_BY_ID[id].tier <= h.tier))];
  const receiptIds = new Set();
  for (const r of Array.isArray(raw.receipts) ? raw.receipts.slice(0, 80) : []) if (typeof r?.visitId === "string" && /^hollow-\d+$/.test(r.visitId) && !receiptIds.has(r.visitId) && Number.isSafeInteger(r.amount) && r.amount >= 4 && r.amount <= 24) {
    receiptIds.add(r.visitId); h.receipts.push({ visitId: r.visitId, visitor: count(r.visitor), amount: r.amount, at: Math.max(0, finite(r.at)) }); h.nextVisit = Math.max(h.nextVisit, Number(r.visitId.slice(7)) + 1);
  }
  const f = h.foyer, saved = raw.foyer ?? {};
  f.placed = [];
  for (const d of FOYER_DECOR) f.ownedDecor[d.id] = count(saved.ownedDecor?.[d.id], 100);
  f.ownedFinishes = [...new Set([...Object.values(FOYER_DEFAULT_FINISHES), ...(Array.isArray(saved.ownedFinishes) ? saved.ownedFinishes.filter(id => lookup(FOYER_FINISH_BY_ID, id)) : [])])];
  for (const [category, id] of Object.entries(saved.finishes ?? {})) if (lookup(FOYER_FINISH_BY_ID, id)?.category === category && f.ownedFinishes.includes(id)) f.finishes[category] = id;
  const context = { hollowHouse: h }, seen = new Set(); f.nextInstance = count(saved.nextInstance, 1000000);
  for (const item of Array.isArray(saved.placed) ? saved.placed.slice(0, 1000) : []) {
    const d = lookup(FOYER_DECOR_BY_ID, item?.id); if (!d) continue;
    if (f.placed.length >= hollowConfig(context).decorCapacity || !foyerFits(context, item.id, item.x, item.z, finite(item.rotation), null, item)) { f.ownedDecor[item.id] = Math.min(100, f.ownedDecor[item.id] + 1); continue; }
    let instance = typeof item.instance === "string" && /^foyer-\d+$/.test(item.instance) ? item.instance : "foyer-" + f.nextInstance++;
    while (seen.has(instance)) instance = "foyer-" + f.nextInstance++; seen.add(instance); f.nextInstance = Math.max(f.nextInstance, Number(instance.slice(6)) + 1);
    f.placed.push({ ...candidate(context, item.id, item.x, item.z, finite(item.rotation), item), instance });
  }
  return h;
}

// Only unfinished attraction visits cross a save. Ordinary shoppers keep their
// existing transient contract; there are no pumpkin holds during this detour.
export function saveHollowVisitors(s) {
  return (s.visitors ?? []).filter(v => v.hollow && !v.hollow.done).map(v => ({ ...v, hollow: { ...v.hollow, route: v.hollow.route.map(p => [...p]) }, festival: { done: true }, basket: [] }));
}
export function restoreHollowVisitors(raw, s) {
  if (!s.hollowHouse?.purchased || !Array.isArray(raw)) return;
  const ids = new Set(s.visitors.map(v => v.id)), visits = new Set(), phases = new Set(["approach", "transfer-in", "arriving-house", "door-wait", "entering", "queue", "serving", "admission", "to-maze", "maze", "returning", "requeue", "exit", "to-border", "transfer-out", "to-shop"]);
  for (const input of raw.slice(0, 50)) {
    const m = input?.hollow;
    if (!m || !phases.has(m.phase) || !Number.isSafeInteger(input.id) || ids.has(input.id) || typeof m.visitId !== "string" || !/^hollow-\d+$/.test(m.visitId) || visits.has(m.visitId) || !Number.isFinite(input.budget) || input.budget < 0) continue;
    const charged = m.charged === true && s.hollowHouse.receipts.some(r => r.visitId === m.visitId);
    if (["to-maze", "maze", "returning"].includes(m.phase) && !charged) continue;
    // Older saves could catch a guest mid-way through the off-screen transfer the
    // farm used before the lantern walk: one bound for the maze comes up from the
    // west gate, one bound back for the stall arrives at the counter.
    const legacy = m.phase === "transfer-in" ? "approach" : m.phase === "transfer-out" ? "to-shop" : null;
    const phase = legacy ?? m.phase, fromFront = legacy === "approach" || m.fromFront === true || (m.route?.[0]?.[0] === -3 && m.route?.[0]?.[1] >= 30);
    const fromStall = !fromFront && m.fromStall === true, spot = Number.isSafeInteger(input.spot) && input.spot >= 0 && input.spot < COUNTER_SPOTS ? input.spot : 0;
    // A guest saved mid-walk on an older layout starts that walk afresh: the old
    // routes and their segment numbers do not fit the new ones. Version 3 walks
    // to and from the counter's middle still fit, so they carry on along them.
    const walking = ["approach", "arriving-house", "to-shop", "to-border"].includes(phase), restart = !legacy && walking && m.routeVersion !== 3 && m.routeVersion !== 4;
    const middle = m.routeVersion === 3 && !legacy, link = middle ? HOLLOW_LINK : hollowLinkFrom(counterPlace(spot));
    const route = extendFarmRoute(phase === "to-shop" ? [...link].reverse() : phase === "to-border" ? HOLLOW_RETURN : ["approach", "arriving-house"].includes(phase) ? (fromFront ? HOLLOW_FRONT_APPROACH : link) : HOLLOW_FRONT_APPROACH, s);
    // A guest near a gate keeps their place on the lane as the land (or the farm's
    // layout) moves the gate: shift that outer leg once, saved gate to today's.
    const savedGate = Array.isArray(m.route) ? Math.max(30, ...m.route.map(p => finite(p?.[1]))) : GATE_Z;
    const at = legacy === "approach" || restart ? route[0] : legacy === "to-shop" ? route.at(-2) : [finite(m.x, HOLLOW_PROPERTY.door[0]), finite(m.z, HOLLOW_PROPERTY.door[1])];
    const z = at[1] + (!legacy && !restart && at[1] >= savedGate - 1.5 ? farmPathEnd(s) - savedGate : 0);
    const v = { ...input, id: input.id, spot, vip: input.kind === 10 && input.vip === true, budget: Math.min(10000, input.budget), originalBudget: Math.max(input.budget, finite(input.originalBudget, input.budget)), preferred: Array.isArray(input.preferred) ? input.preferred.filter(n => Number.isInteger(n) && n >= 0 && n < VARIETY_COUNT) : [0], basketLimit: Math.max(1, count(input.basketLimit, input.vip === true ? 20 : 10)), basket: [], leaveAt: null, outcome: "shopping", age: Math.max(0, finite(input.age)), festival: { done: true }, hollowConsidered: true,
      hollow: { ...m, routeVersion: middle ? 3 : 4, phase, charged, ticket: charged ? count(m.ticket, 24) : 0, done: false, fromFront, fromStall, route, segment: legacy === "to-shop" ? route.length - 1 : legacy || restart ? 1 : Math.max(1, Math.min(route.length - 1, count(m.segment))), x: at[0], z, dx: finite(m.dx), dz: finite(m.dz, 1), elapsed: Math.max(0, Math.min(35, finite(m.elapsed))), waited: Math.max(0, Math.min(35, finite(m.waited))), terror: Math.max(0,Math.min(100,finite(m.terror))), bravery: Math.max(0,Math.min(100,finite(m.bravery,24 + Math.floor(brave(input.id + 421) * 65)))), runs: count(m.runs,2), repeats: count(m.repeats,1), fleeing: m.fleeing === true, fledHome: false } };
    if (!v.needs || typeof v.needs !== "object") v.needs = { thirst: 50, hunger: 50, happiness: 70, value: 1 };
    ids.add(v.id); visits.add(m.visitId); s.visitors.push(v); s.nextVisitor = Math.max(s.nextVisitor, v.id + 1); s.hollowHouse.nextVisit = Math.max(s.hollowHouse.nextVisit, Number(m.visitId.slice(7)) + 1);
  }
}
