// The first festival extension. Pure rules; no renderer or DOM dependencies.
import { freshCocoaPrices, restoreCocoaPrices, freshCocoaExtras, restoreCocoaExtras, standHasStock, quoteStandOrder, payStandOrder } from "./cocoa-menu.js";
export * from "./cocoa-menu.js";
import { extendFarmRoute, counterPlace } from "../content/farm-layout.js";
import { patchLevel } from "./levels.js";
import { MEADOW, COCOA_TIERS, COCOA_SUPPLY, COCOA_APPROACH, PUMPKIN_APPROACH, MEADOW_COMFORTS, COMFORT_FOOTFALL } from "../content/festival-meadow.js";
export { MEADOW, COCOA_TIERS, COCOA_SUPPLY, MEADOW_COMFORTS, COMFORT_FOOTFALL, fieldWidth } from "../content/festival-meadow.js";
export const freshFestival = () => ({ meadow: false, comforts: [], cocoa: { level: 0, stock: 0, price: 4, open: true, courier: false, autoSupply: false, sold: 0, gross: 0, supplies: 0, invested: 0, missed: 0, prices: freshCocoaPrices(), extras: freshCocoaExtras(), lastSaleAt: -10 } });
const count = (n, cap = 1e12) => Number.isSafeInteger(n) ? Math.max(0, Math.min(cap, n)) : 0;
export function restoreFestival(raw) {
  const f = freshFestival();
  if (!raw || typeof raw !== "object") return f;
  f.meadow = raw.meadow === true;
  f.comforts = f.meadow && Array.isArray(raw.comforts) ? MEADOW_COMFORTS.map((x) => x.id).filter((id) => raw.comforts.includes(id)) : [];
  const c = f.cocoa, saved = raw.cocoa ?? {};
  c.level = f.meadow ? count(saved.level, 3) : 0;
  c.stock = count(saved.stock, COCOA_TIERS[c.level - 1]?.capacity ?? 0);
  c.price = Math.max(3, count(Number.isInteger(saved.price) ? saved.price : 4, COCOA_TIERS[c.level - 1]?.maxPrice ?? 4));
  c.open = saved.open !== false; c.courier = c.level >= 2 && saved.courier === true; c.autoSupply = c.courier && saved.autoSupply === true;
  for (const key of ["sold", "gross", "supplies", "invested", "missed"]) c[key] = count(saved[key]);
  c.extras = restoreCocoaExtras(saved.extras, c.level);
  c.prices = restoreCocoaPrices(saved.prices);
  return f;
}
const spendable = (s, amount) => !s.paused && Number.isFinite(s.coins) && s.coins >= amount;
export function buyMeadow(s) {
  if (s.festival.meadow || patchLevel(s).level < MEADOW.level || !spendable(s, MEADOW.price)) return false;
  s.coins -= MEADOW.price; s.festival.meadow = true; s.festival.cocoa.invested += MEADOW.price; return true;
}
export function upgradeCocoa(s) {
  const c = s.festival.cocoa, tier = COCOA_TIERS[c.level];
  if (!s.festival.meadow || !tier || patchLevel(s).level < tier.level || !spendable(s, tier.price)) return false;
  s.coins -= tier.price; c.invested += tier.price; c.level++;
  if (c.level === 1) c.stock = 10;
  return true;
}
// Comforts for the meadow: each bought once, from the cocoa menu.
export const comfortOwned = (s, id) => !!s.festival?.comforts?.includes(id);
export function buyComfort(s, id) {
  const comfort = MEADOW_COMFORTS.find((x) => x.id === id);
  if (!comfort || !s.festival.meadow || comfortOwned(s, id) || s.festival.cocoa.level < comfort.stand || !spendable(s, comfort.price)) return false;
  s.coins -= comfort.price; s.festival.cocoa.invested += comfort.price; s.festival.comforts.push(id);
  return true;
}
// A lively meadow is the talk of the village: a few more visitors for each comfort.
export const meadowFootfallBonus = (s) => s.festival?.meadow ? (s.festival.comforts?.length ?? 0) * COMFORT_FOOTFALL : 0;
export const cocoaCapacity = (s) => COCOA_TIERS[s.festival.cocoa.level - 1]?.capacity ?? 0;
export const cocoaServiceSeconds = (s) => Math.max(1, 2.8 / (1 + .2 * (s.festival.cocoa.level - 1) + .16 * (s.visitorUpgrades?.cocoa ?? 0)));
export function setCocoaPrice(s, price) {
  const c = s.festival.cocoa;
  if (s.paused || !c.level || !Number.isInteger(price) || price < 3 || price > COCOA_TIERS[c.level - 1].maxPrice) return false;
  c.price = price; return true;
}
export function setCocoaOpen(s, open) {
  if (s.paused || !s.festival.cocoa.level || typeof open !== "boolean") return false;
  s.festival.cocoa.open = open; return true;
}
export function restockCocoa(s) {
  const c = s.festival.cocoa, n = Math.min(COCOA_SUPPLY.batch, cocoaCapacity(s) - c.stock), cost = n * COCOA_SUPPLY.unit;
  if (!c.level || n < 1 || !spendable(s, cost)) return 0;
  s.coins -= cost; c.supplies += cost; c.stock += n; return n;
}
export function hireCocoaCourier(s) {
  const c = s.festival.cocoa;
  if (c.level < 2 || c.courier || !spendable(s, COCOA_SUPPLY.courier)) return false;
  s.coins -= COCOA_SUPPLY.courier; c.invested += COCOA_SUPPLY.courier; c.courier = true; c.autoSupply = true; return true;
}
export function setCocoaAutoSupply(s, on) {
  if (s.paused || !s.festival.cocoa.courier || typeof on !== "boolean") return false;
  s.festival.cocoa.autoSupply = on; return true;
}
export function updateFestival(s) {
  const c = s.festival.cocoa;
  if (!s.paused && c.courier && c.autoSupply && c.stock <= 5 && s.coins >= COCOA_SUPPLY.reserve + COCOA_SUPPLY.batch * COCOA_SUPPLY.unit) restockCocoa(s);
}
// Festival guests bring a small, explicit allowance. A higher cocoa price competes
// with their pumpkin money; quote the intended basket before selling a drink.
export const cocoaAllowance = s => s.festival.cocoa.level && s.festival.cocoa.open && standHasStock(s) ? [0, 4, 7, 9][s.festival.cocoa.level] : 0;
export const wantsCocoa = (s, v) => quoteStandOrder(s, v).length > 0;
// Guests on their way to Sandy, waiting or being served, including chatters
// fetching a drink (meadow-chat.js). Places in the queue go by arrival order;
// a chatter takes the order of the moment they set off for it, behind everyone
// already there and ahead of anyone who arrives later.
export const inCocoaQueue = (v) => v.festival && ["to-cocoa", "queue", "serving"].includes(v.festival.phase) || ["cocoa-run", "cocoa-queue", "cocoa-serving"].includes(v.social?.phase);
const inQueue = inCocoaQueue;
export const cocoaQueueOrder = (v) => v.social?.queueOrder ?? v.id;
export const cocoaQueueRank = (s, v) => s.visitors.filter((other) => other !== v && cocoaQueueOrder(other) < cocoaQueueOrder(v) && inQueue(other)).length;
export function planFestivalVisit(s, v) {
  const c = s.festival?.cocoa;
  if (!c?.level || !c.open || !standHasStock(s) || !wantsCocoa(s, v)) return null;
  const rank = s.visitors.filter(inQueue).length;
  if (rank >= MEADOW.queue) return null;
  const route = [...extendFarmRoute(COCOA_APPROACH, s), [47, 20.6 + rank * .8]];
  return { phase: "to-cocoa", route, segment: 1, x: route[0][0], z: route[0][1], dx: 0, dz: -1, elapsed: 0, walking: true, done: false };
}
export function meadowWalk(m, target, dt) {
  const dx = target[0] - m.x, dz = target[1] - m.z, d = Math.hypot(dx, dz);
  m.dx = dx; m.dz = dz; m.walking = d > .005;
  if (d < .005) { m.x = target[0]; m.z = target[1]; return dt; }
  const seconds = d / MEADOW.speed, step = Math.min(dt / seconds, 1);
  m.x += dx * step; m.z += dz * step;
  return Math.max(0, dt - seconds);
}
// Back down the lane and up the main path to their own place at Skyla's counter.
function leaveCounter(m, spot) {
  m.phase = "to-shop"; m.route = [[m.x, m.z], [49, m.z], ...PUMPKIN_APPROACH.slice(0, -1), counterPlace(spot)]; m.segment = 1; m.walking = true;
}
// Returns true while the guest is on the excursion. Payment occurs exactly once
// at the counter, before the pumpkin rules see the guest's remaining budget.
export function tickFestivalVisit(s, v, dt, events) {
  const m = v.festival;
  if (!m || m.done) return false;
  if (s.paused) return true;
  let remaining = dt;
  for (let i = 0; i < 24 && remaining > 1e-9; i++) {
    if (m.phase === "to-cocoa" || m.phase === "to-shop") {
      remaining = meadowWalk(m, m.route[m.segment], remaining);
      if (remaining <= 1e-9) break;
      if (++m.segment < m.route.length) continue;
      if (m.phase === "to-shop") { m.done = true; m.walking = false; m.justArrived = true; return false; }
      m.phase = "queue";
    } else {
      const c = s.festival.cocoa;
      if (!c.open || !standHasStock(s) || !wantsCocoa(s, v)) { c.missed++; leaveCounter(m, v.spot); continue; }
      const rank = cocoaQueueRank(s, v);
      remaining = meadowWalk(m, [47, 20.6 + rank * .8], remaining);
      if (rank || remaining <= 1e-9) break;
      m.phase = "serving"; m.walking = false;
      const duration = cocoaServiceSeconds(s), use = Math.min(remaining, duration - m.elapsed);
      m.elapsed += use; remaining -= use;
      if (m.elapsed + 1e-9 < duration) break;
      const order = quoteStandOrder(s, v), amount = payStandOrder(s, v, order);
      if (amount) events.push({ type: "sale", route: "festival-cocoa", visitor: v.id, amount, quantity: order.length, items: order });
      leaveCounter(m, v.spot);
    }
  }
  return !m.done;
}
