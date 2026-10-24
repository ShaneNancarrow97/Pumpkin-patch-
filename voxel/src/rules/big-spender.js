// An occasional real customer, never a cash reward. His wallet and basket grow
// with the patch; every pumpkin still comes from available stock at normal prices.
import { patchLevel } from "./levels.js";
import { VARIETIES } from "./farm.js";

export const BIG_SPENDER_KIND = 10;
export const BIG_SPENDER_FIRST = 110;
export const freshBigSpender = () => ({ timer: BIG_SPENDER_FIRST, seen: 0, spent: 0, pumpkins: 0 });
const count = value => Number.isFinite(value) ? Math.max(0, Math.min(1e12, Math.floor(value))) : 0;
export function restoreBigSpender(raw) {
  if (!raw || typeof raw !== "object") return freshBigSpender();
  return { timer: Number.isFinite(raw.timer) ? Math.max(0, Math.min(180, raw.timer)) : BIG_SPENDER_FIRST,
    seen: count(raw.seen), spent: count(raw.spent), pumpkins: count(raw.pumpkins) };
}

// Due guests wait at the gate when the path is full. Keeping the timer at zero
// avoids either losing the event or queuing a second Baron behind the first.
export function advanceBigSpender(s, dt, room) {
  s.bigSpender ??= freshBigSpender();
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return false;
  const b = s.bigSpender;
  b.timer = Math.max(0, b.timer - dt);
  if (b.timer > 1e-8 || !room || s.visitors.some(v => v.vip || v.kind === BIG_SPENDER_KIND)) return false;
  b.seen++;
  b.timer = 150 + 15 * (b.seen % 3);
  return true;
}

export function bigSpenderBasket(s) {
  const level = patchLevel(s).level;
  const basketLimit = Math.min(20, 8 + Math.floor((level - 1) / 2) + (s.upgrades.storage || 0) + (s.customerCare?.bags || 0));
  const highest = Math.max(0, ...(s.plotLevels ?? [0]));
  const price = VARIETIES[Math.min(VARIETIES.length - 1, highest)].price;
  const budget = Math.min(800, Math.max(350 + level * 25, Math.ceil(price * basketLimit * .65)));
  return { vip: true, regular: false, budget, basketLimit, preferred: [3, 2, 1, 0] };
}
