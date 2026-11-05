// Piñata pumpkins: now and then a planted pumpkin grows as a piñata, striped
// in fiesta colours. Picked, it gives its pumpkin to the barn as usual and
// bursts with a handful of pantry ingredients for Maisie's kitchen; anything
// the pantry can't hold is paid in coins instead. Piñata seeds, bought on the
// Seeds page, set how often one grows. The roll is a hash of the farm's own
// numbers, so the rules stay deterministic and testable.
import { INGREDIENTS, COOKING } from "../content/cooking.js";

export const PINATA = Object.freeze({
  name: "Piñata seeds",
  chances: [0, .05, .09, .14],
  costs: [1200, 5000, 16000],
  levels: [5, 10, 15],
  burst: [3, 6],
});
export const freshPinata = () => ({ level: 0, popped: 0, items: 0, last: null });
export function restorePinata(raw) {
  const p = freshPinata();
  if (!raw || typeof raw !== "object") return p;
  const whole = (n) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  p.level = Math.min(PINATA.chances.length - 1, whole(raw.level));
  p.popped = whole(raw.popped); p.items = whole(raw.items);
  return p;
}
// A number in [0, 1) from the farm's own counts: the same state always rolls the same.
function roll(...parts) {
  let h = 0x9e3779b9;
  for (const n of parts) { h = Math.imul(h ^ (Math.floor(Number(n) || 0) >>> 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; }
  return (h >>> 0) / 4294967296;
}
export const pinataChance = (s) => PINATA.chances[s.pinata?.level ?? 0] ?? 0;
// Whether a pumpkin planted now in plot i grows as a piñata.
export const plantsPinata = (s, i) => pinataChance(s) > 0 && roll(s.time * 10, i, s.harvested, s.taps, 7) < pinataChance(s);
// The next tier of Piñata seeds: its price and the level it opens at, or null when complete.
export function pinataUpgrade(s) {
  const level = s.pinata?.level ?? 0;
  return level >= PINATA.costs.length ? null : { tier: level + 1, cost: PINATA.costs[level], opensAt: PINATA.levels[level], chance: PINATA.chances[level + 1] };
}
export function buyPinataSeeds(s, patchLevel) {
  const next = pinataUpgrade(s);
  if (!next || s.paused || s.coins < next.cost || patchLevel < next.opensAt) return false;
  s.coins -= next.cost; s.pinata.level++;
  return true;
}
// The burst from a picked piñata in plot i: ingredients into the pantry while
// there's room, the rest as coins at their shop price. Returns what it gave.
export function burstPinata(s, i) {
  s.pinata ??= freshPinata();
  const k = s.kitchen, [lo, hi] = PINATA.burst, n = lo + Math.floor(roll(s.time * 10, i, s.harvested, 3) * (hi - lo + 1));
  const room = k ? Math.max(0, COOKING.pantryBase * (1 + (k.upgrades?.pantry ?? 0)) - Object.values(k.pantry ?? {}).reduce((a, b) => a + b, 0)) : 0;
  const items = {}; let coins = 0, stored = 0;
  for (let j = 0; j < n; j++) {
    const ingredient = INGREDIENTS[Math.floor(roll(s.time * 10, i, j, s.harvested, 11) * INGREDIENTS.length)];
    if (k?.pantry && stored < room) { k.pantry[ingredient.id] = (k.pantry[ingredient.id] ?? 0) + 1; stored++; items[ingredient.id] = (items[ingredient.id] ?? 0) + 1; }
    else coins += Math.max(1, ingredient.price);
  }
  if (coins) { s.coins += coins; s.earned += coins; }
  s.pinata.popped++; s.pinata.items += stored;
  s.pinata.last = { plot: i, items, coins, at: s.time, serial: s.pinata.popped };
  return s.pinata.last;
}
