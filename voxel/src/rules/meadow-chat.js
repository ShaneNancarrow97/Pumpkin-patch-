// Guests who stop in the meadow for a chat on their way home, and fetch a
// cocoa while they're at it (docs/plans/meadow-chatter.md). Pure rules.
//
// A chat begins only when a guest would set off home: every purchase, missed
// sale and maze choice is already settled, so chatting changes no one's
// decisions. Chatters don't count against arrivals (selling.js
// visitorReservations), no more stand at a spot than it has places, and a
// chatter joins Sandy's queue only when it leaves room for two arrivals.
// Nothing is saved: on load, everyone has gone home. The meadow's comforts
// (content/festival-meadow.js MEADOW_COMFORTS) change the numbers below.
//
// v.social: to-spot → chatting ⇄ (cocoa-run → cocoa-queue → cocoa-serving →
// cocoa-back, or with the trolley, trolley) → leaving → gone. A lone guest
// leaves after CHAT.lonely seconds.
import { CHAT_SPOTS, MEADOW_EXIT, chatPlace } from "../content/festival-meadow.js";
import { counterPlace, extendFarmRoute } from "../content/farm-layout.js";
import { standHasStock, quoteStandOrder, payStandOrder } from "./cocoa-menu.js";
import { MEADOW, cocoaServiceSeconds, cocoaQueueRank, comfortOwned, inCocoaQueue, meadowWalk } from "./festival-meadow.js";
import { converse, freshSocial, hash } from "./meadow-talk.js";

export const CHAT = Object.freeze({ chance: [0, .25, .35, .45], stay: [25, 55], lonely: 15, extra: 10, thirst: 55, line: [3.5, 5], transcript: 8, refillAfter: 15,
  bunting: 1.3, blankets: { stay: 15, lonely: 25 } });
const WALKING = new Set(["to-spot", "cocoa-run", "cocoa-back", "leaving"]);
const FETCHING = new Set(["cocoa-run", "cocoa-queue", "cocoa-serving", "cocoa-back"]);

export const chatting = (v) => !!v.social && !v.social.gone;
export const openChatSpots = (s) => s.festival?.meadow ? CHAT_SPOTS.filter((p) => s.festival.cocoa.level >= p.level && (!p.comfort || comfortOwned(s, p.comfort))) : [];
export const chatCap = (s) => openChatSpots(s).reduce((n, p) => n + p.seats, 0);
// How long a guest stays, and waits alone for company: blankets keep them longer.
const stayFor = (s, v) => CHAT.stay[0] + hash(v.id, 73) * (CHAT.stay[1] - CHAT.stay[0]) + (comfortOwned(s, "blankets") ? CHAT.blankets.stay : 0);
const patience = (s) => comfortOwned(s, "blankets") ? CHAT.blankets.lonely : CHAT.lonely;
export const chatSpot = (id) => CHAT_SPOTS.find((p) => p.id === id);
// Everyone at or on their way to a spot, apart from `but`.
export const chatMembers = (s, spot, but = null) => s.visitors.filter((v) => v !== but && chatting(v) && v.social.spot === spot && v.social.phase !== "leaving");

// The free place in the ring nearest where the guest arrives from.
function freeSeat(s, spot, from) {
  const taken = new Set(chatMembers(s, spot.id).map((v) => v.social.seat));
  let best = -1, gap = Infinity;
  for (let i = 0; i < spot.seats; i++) {
    if (taken.has(i)) continue;
    const [x, z] = chatPlace(spot, i), d = Math.hypot(x - from[0], z - from[1]);
    if (d < gap) { best = i; gap = d; }
  }
  return best;
}

// Decided once, as the guest would set off home. Busy spots draw more:
// a second guest usually joins the first, so a pair grows into a group.
export function planChat(s, v) {
  const c = s.festival?.cocoa, open = openChatSpots(s);
  if (!open.length || !c.open || v.vip || v.hollow && !v.hollow.done || v.hayride && !v.hayride.done) return null;
  if (s.visitors.filter(chatting).length >= chatCap(s)) return null;
  const mood = .6 + .6 * Math.max(0, Math.min(1, ((v.needs?.happiness ?? 70) - 30) / 70));
  if (hash(v.id, 71) >= CHAT.chance[c.level] * mood * (comfortOwned(s, "bunting") ? CHAT.bunting : 1)) return null;
  const weights = open.map((p) => { const n = chatMembers(s, p.id).length; return n >= p.seats ? 0 : n ? 2.5 + n : 1; });
  let pick = hash(v.id, 72) * weights.reduce((a, b) => a + b, 0), spot = null;
  for (let i = 0; i < open.length && !spot; i++) if (weights[i] && (pick -= weights[i]) < 0) spot = open[i];
  spot ??= open.findLast((_, i) => weights[i]);
  if (!spot) return null;
  const seat = freeSeat(s, spot, spot.to.at(-1)), start = counterPlace(v.spot);
  return { phase: "to-spot", spot: spot.id, seat, route: [start, ...extendFarmRoute(spot.to, s), chatPlace(spot, seat)], segment: 1, x: start[0], z: start[1], dx: 0, dz: -1, walking: true, until: 0, alone: 0, talked: 0, elapsed: 0, drinks: v.treatReceipt ? 1 : 0, gone: false };
}

const go = (m, phase, route) => { m.phase = phase; m.route = [[m.x, m.z], ...route]; m.segment = 1; m.walking = true; };
const face = (m, spot) => { m.dx = spot.x - m.x; m.dz = spot.z - m.z; m.walking = false; };
// Home by the meadow's path, or for the dance floor, back down the lane and out of the farm gate.
const leave = (s, m, spot) => go(m, "leaving", extendFarmRoute([...spot.exit, ...(spot.join === undefined ? [] : MEADOW_EXIT.slice(spot.join))], s));
const comeBack = (m, spot) => go(m, "cocoa-back", [...[...spot.cocoa].reverse(), chatPlace(spot, m.seat)]);
const queuePlace = (s, v) => [47, 20.6 + cocoaQueueRank(s, v) * .8];
// A chatter spends what's left of their purse, and keeps a little pocket money
// for a cocoa with friends: enough for Sandy's plain cocoa, never more.
const pocketMoney = (s, v) => Math.max(0, s.festival.cocoa.price - v.budget);
// A refill is plain cocoa in their souvenir mug, whatever they had first.
const chatOrder = (s, v) => v.social?.drinks ? (s.festival.cocoa.stock > 0 ? [{ id: "cocoa", price: s.festival.cocoa.price }] : []) : quoteStandOrder(s, { ...v, budget: v.budget + pocketMoney(s, v) }, false);
// One drink a guest, or with souvenir mugs a refill once they've talked a
// while. Without the trolley, one of a group goes at a time, and only while
// the queue leaves room for two more arrivals; the trolley comes to them.
function wantsDrink(s, v, others) {
  const c = s.festival.cocoa, m = v.social, mugs = comfortOwned(s, "mugs");
  if (m.drinks >= (mugs ? 2 : 1) || !c.open || !standHasStock(s)) return false;
  if (m.drinks ? m.talked < CHAT.refillAfter : (v.needs?.thirst ?? 0) < CHAT.thirst) return false;
  if (!comfortOwned(s, "trolley") && (others.some((o) => FETCHING.has(o.social.phase)) || s.visitors.filter(inCocoaQueue).length >= MEADOW.queue - 2)) return false;
  return chatOrder(s, v).length > 0;
}
// Paid for at Sandy's counter or her trolley. A refill is a fresh order, so the
// guest's earlier receipt is set aside for it.
function buyDrink(s, v, events) {
  const m = v.social, order = chatOrder(s, v), pocket = pocketMoney(s, v), receipt = v.treatReceipt;
  v.budget += pocket; v.treatReceipt = null;
  const amount = payStandOrder(s, v, order);
  if (amount) { m.drinks++; v.pocketMoney = (v.pocketMoney ?? 0) + pocket; events.push({ type: "sale", route: "festival-cocoa", visitor: v.id, amount, quantity: order.length, items: order, chat: true, refill: m.drinks > 1 }); }
  else { v.budget -= pocket; v.treatReceipt = receipt; }
}

// Returns true while the guest is in the meadow, so the stall's rules leave them be.
export function tickChat(s, v, dt, events) {
  const m = v.social;
  if (!m || m.gone) return false;
  if (s.paused) return true;
  const spot = chatSpot(m.spot);
  let remaining = dt;
  for (let i = 0; i < 24 && remaining > 1e-9; i++) {
    if (WALKING.has(m.phase)) {
      remaining = meadowWalk(m, m.route[m.segment], remaining);
      if (remaining <= 1e-9) break;
      if (++m.segment < m.route.length) continue;
      if (m.phase === "leaving") { m.gone = true; m.walking = false; return false; }
      if (m.phase === "cocoa-run") { m.phase = "cocoa-queue"; continue; }
      if (m.phase === "to-spot") m.until = s.time + stayFor(s, v);
      else if (s.time >= m.until) m.until = s.time + CHAT.extra;                    // back with a drink: a little longer
      m.phase = "chatting"; face(m, spot);
    } else if (m.phase === "chatting") {
      const others = chatMembers(s, m.spot, v);
      m.alone = others.length ? 0 : m.alone + remaining;
      if (others.length) m.talked += remaining;
      if (s.time >= m.until || m.alone >= patience(s)) { leave(s, m, spot); continue; }
      if (wantsDrink(s, v, others)) {
        if (comfortOwned(s, "trolley")) { m.phase = "trolley"; m.elapsed = 0; face(m, spot); continue; }
        m.queueOrder = s.nextVisitor - .5; go(m, "cocoa-run", [...spot.cocoa, queuePlace(s, v)]); continue;
      }
      face(m, spot); break;
    } else if (m.phase === "trolley") {
      // Sandy pours at the trolley, a little slower than at her counter.
      const duration = cocoaServiceSeconds(s) + 1.5, use = Math.min(remaining, duration - m.elapsed);
      m.elapsed += use; remaining -= use;
      if (m.elapsed + 1e-9 < duration) break;
      buyDrink(s, v, events); m.phase = "chatting"; m.talked = 0;
    } else if (m.phase === "cocoa-queue") {
      const c = s.festival.cocoa;
      if (!c.open || !standHasStock(s) || !chatOrder(s, v).length) { comeBack(m, spot); continue; }
      const place = queuePlace(s, v);
      remaining = meadowWalk(m, place, remaining);
      if (place[1] > 20.61 || remaining <= 1e-9) break;
      m.phase = "cocoa-serving"; m.walking = false; m.elapsed = 0;
    } else if (m.phase === "cocoa-serving") {
      const duration = cocoaServiceSeconds(s), use = Math.min(remaining, duration - m.elapsed);
      m.elapsed += use; remaining -= use;
      if (m.elapsed + 1e-9 < duration) break;
      buyDrink(s, v, events); m.talked = 0;
      comeBack(m, spot);
    } else break;
  }
  return true;
}

// The talk at each spot: a line every few seconds while two or more are there,
// from each in turn. The conversation ends when the spot empties.
export function updateChats(s, events) {
  const social = s.social ??= freshSocial();
  for (const spot of CHAT_SPOTS) {
    const everyone = chatMembers(s, spot.id), talkers = everyone.filter((v) => v.social.phase === "chatting").sort((a, b) => a.id - b.id);
    if (!everyone.length) { delete social.groups[spot.id]; continue; }
    if (talkers.length < 2) continue;
    const group = social.groups[spot.id] ??= { id: social.nextGroup++, spot: spot.id, lines: [], used: [], count: 0, thread: null, last: null, nextAt: s.time + 1.2 };
    if (s.time < group.nextAt) continue;
    const at = talkers.findIndex((v) => v.id === group.last), speaker = talkers[(at + 1) % talkers.length];
    const line = converse(s, group, speaker);
    group.last = speaker.id; group.nextAt = s.time + CHAT.line[0] + hash(group.id, group.count, 74) * (CHAT.line[1] - CHAT.line[0]);
    group.lines.push({ at: s.time, visitor: speaker.id, kind: speaker.kind, text: line.text, chip: line.chip });
    if (group.lines.length > CHAT.transcript) group.lines.shift();
    events.push({ type: "chat-line", spot: spot.id, visitor: speaker.id, text: line.text });
  }
}
