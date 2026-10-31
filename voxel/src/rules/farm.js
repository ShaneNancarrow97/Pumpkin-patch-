// The farm: plots, seeds, upgrades, the big pumpkin and harvest streaks. Prices
// and upgrade effects follow the main game (src/core/model.mjs, plot-model.mjs,
// festival-model.mjs); the one change is that better pumpkins take a little
// longer to grow, so choosing a crop is a real choice.
import { PUMPKIN_VARIETIES } from "../content/pumpkin-varieties.js";
export { VARIETY_COUNT, MAX_VARIETY_INDEX, VARIETY_INDICES } from "../content/pumpkin-varieties.js";
import { tierOpen } from "./unlocks.js";
import { economy } from "../../../src/content/economy.js";
import { addStock, stockCount } from "./stock.js";
import { MAX_PLOTS, PLOT_COUNTS } from "../content/farm-layout.js";
export { MAX_PLOTS, PLOT_COUNTS, fieldDepth, farmPathEnd, farmExpansionTier } from "../content/farm-layout.js";

export const VARIETIES = PUMPKIN_VARIETIES;

export const UPGRADES = [
  { id: "tools", name: "A better watering can", text: "Pumpkins grow 18% faster.", cost: 90, max: 6 },
  { id: "yield", name: "A little extra love", text: "One more pumpkin per harvest.", cost: 150, max: 5 },
  { id: "auto", name: "Helping hands", text: "Shane and Natalie plant and pick for you, and rest while you play as them.", cost: 500, max: 1 },
  { id: "plots", name: "Room for more", text: "Open more beds, then buy the south field for eighteen and twenty-four plots.", costs: [300, 660, 2200, 5500], max: 4 },
  { id: "cart", name: "A market cart", text: "When the barn is full, Shane drives the extra pumpkins down to the village market for a share of the price, so the picking never has to stop.", costs: [400, 2500, 9000] },
  { id: "storage", name: "A bigger pumpkin barn", text: "Store more pumpkins before the harvest pauses. Keeps ripe crops safe when full.", costs: [60, 180, 500, 1400, 4000, 10000], max: 6 },
  // Each tier is dearer and does a little less, so the first are a few minutes' takings and the last a late goal.
  { id: "sign", name: "Spread the word", text: "Notes through letterboxes, then the parish newsletter. Visitors come more often, at the stall and the shop.", costs: [45, 120, 350, 1000, 3000], steps: [0.88, 0.89, 0.9, 0.92, 0.94], max: 5 },
].map((u) => ({ ...u, max: u.costs?.length ?? u.max }));
// How much a tiered upgrade shortens the wait, all its bought tiers together.
export const tierFactor = (steps, level) => steps.slice(0, level).reduce((f, x) => f * x, 1);

export const freshUpgrades = () => ({ tools: 0, yield: 0, auto: 0, plots: 0, sign: 0, storage: 0, cart: 0 });
export const freshPlots = () => Array.from({ length: MAX_PLOTS }, () => ({ phase: "empty", progress: 0, variety: 0 }));
// The visitor boost. Quick picks build the streak and the streak brings
// visitors sooner: +10% a pick up to ×6, then +5% a pick up to +150% at ×26.
// It holds while the streak is hot and fades after, so steady picking keeps the
// path busy without having to be perfect.
// A pick counts towards the streak at most once every `gap` seconds, so Harvest all
// is one pick and a held key can't pump the streak.
export const STREAK = { window: 5, fade: 12, cap: 1.5, gap: 0.6 };
export const streakBonus = (n) => (n < 2 ? 0 : Math.min(STREAK.cap, n <= 6 ? (n - 1) / 10 : 0.5 + (n - 6) / 20));
// The bonus now: whole while the streak is hot, then fading to nothing.
export const visitorBoostSeconds = (s) => Math.max(0, (s.streak?.visitorBoostUntil ?? 0) - s.time);
export const visitorBonus = (s) => (s.streak?.visitorBoost ?? 0) * Math.min(1, visitorBoostSeconds(s) / STREAK.fade);
export const freshStreak = () => ({ count: 0, until: 0, best: 0, bonusCoins: 0, nextBonusAt: 0, visitorBoost: 0, visitorBoostUntil: 0, last: -1 });

export const HELPER_WAIT = 8;
export const openPlots = (s) => PLOT_COUNTS[Math.max(0, Math.min(PLOT_COUNTS.length - 1, Math.trunc(s.upgrades.plots || 0)))];
export const growTime = (s, i) => VARIETIES[s.plots[i].variety].grow * Math.pow(0.82, s.upgrades.tools);
export const harvestSize = (s) => 1 + s.upgrades.yield;
export const upgradeCost = (s, id) => {
  const u = UPGRADES.find((x) => x.id === id);
  return u.costs ? u.costs[s.upgrades[id]] : Math.round(u.cost * Math.pow(economy.farmCostMultiplier, s.upgrades[id]));
};
// The best pumpkin any open plot can grow: what a free pumpkin from the big one is.
const bestVariety = (s) => Math.max(...s.plotLevels.slice(0, openPlots(s)));

export function plant(s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || s.plots[i].phase !== "empty") return false;
  s.plots[i] = { phase: "growing", progress: 0, variety: s.plotCrops[i] };
  return true;
}

// Existing stock is never discarded on load. New harvests need room for the
// whole crop, so a full barn leaves ripe pumpkins on the patch for later.
export const STORAGE_BONUS = [0, 180, 500, 1200, 2600, 5400, 11000];
export const barnCapacity = s => 180 + 40 * s.upgrades.plots + 20 * s.upgrades.yield + STORAGE_BONUS[Math.min(STORAGE_BONUS.length - 1, s.upgrades.storage || 0)];
export const barnSpace = s => Math.max(0, barnCapacity(s) - stockCount(s));
// With a market cart, a crop the barn can't take goes to the village market for
// a share of its price instead of waiting on the patch: the barn is a choice
// about what to keep for the stall, not a wall that stops the harvest. The cart
// carries only so many a minute; past that, crops wait on the patch as before.
export const CART = [{ share: 0, perMinute: 0 }, { share: 0.15, perMinute: 10 }, { share: 0.25, perMinute: 20 }, { share: 0.35, perMinute: 35 }];
export const cartTier = (s) => CART[Math.min(CART.length - 1, s.upgrades.cart || 0)];
export const cartRoom = (s) => {
  const c = cartTier(s), minute = Math.floor(s.time / 60);
  return c.perMinute - (s.cartMinute === minute ? s.cartLoad || 0 : 0);
};
// Whether a harvest has nowhere to go: the barn is full and the cart (if any) is loaded for this minute.
export const barnBlocked = (s) => barnSpace(s) < harvestSize(s) && cartRoom(s) < harvestSize(s);
function store(s, v, n) {
  if (barnSpace(s) >= n) { addStock(s, v, n, true); return true; }
  const c = cartTier(s);
  if (!c.share || cartRoom(s) < n) return false;
  const minute = Math.floor(s.time / 60);
  if (s.cartMinute !== minute) { s.cartMinute = minute; s.cartLoad = 0; }
  s.cartLoad += n;
  const pay = n * Math.max(1, Math.floor(VARIETIES[v].price * c.share));
  s.coins += pay; s.earned += pay; s.wholesale = (s.wholesale || 0) + pay;
  return true;
}

// Returns how many pumpkins were picked (0 if there was nothing to pick).
export function harvest(s, i) {
  const p = s.plots[i];
  if (!p || i >= openPlots(s) || p.phase !== "ready") return 0;
  const n = harvestSize(s);
  if (!store(s, p.variety, n)) return 0;
  s.harvested += n;
  s.plots[i] = { phase: "empty", progress: 0, variety: s.plotCrops[i] };
  return n;
}

// Tapping the big pumpkin: growing plots jump ahead; with nothing growing,
// every eighth tap shakes a pumpkin loose.
// Taps closer than a seventh of a second are a held key or a bot: ignored.
export function tap(s) {
  if (s.time - (s.lastTap ?? -Infinity) < 0.14) return { boost: false, reward: 0 };
  s.lastTap = s.time;
  s.taps++;
  let growing = 0;
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase !== "growing") continue;
    growing++;
    p.progress = Math.min(1, p.progress + 1.5 / (22 * Math.pow(0.82, s.upgrades.tools)));
    if (p.progress >= 1) { p.phase = "ready"; p.ripe = s.time; }
  }
  let reward = 0;
  if (!growing && s.taps % 8 === 0 && store(s, bestVariety(s), 1)) { s.harvested++; reward = 1; }
  return { boost: growing > 0, reward };
}

export function buyUpgrade(s, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || s.upgrades[id] >= u.max || !tierOpen(s, "farm", id, s.upgrades[id])) return false;
  const c = upgradeCost(s, id);
  if (s.coins < c) return false;
  s.coins -= c;
  s.upgrades[id]++;
  return true;
}

// Better seeds for one plot. If it was growing its best crop, it moves up too.
export function upgradePlot(s, i) {
  const next = VARIETIES[s.plotLevels[i] + 1];
  if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || !next || s.coins < next.cost) return false;
  s.coins -= next.cost;
  const wasBest = s.plotCrops[i] === s.plotLevels[i];
  s.plotLevels[i]++;
  if (wasBest) choosePlotCrop(s, i, s.plotLevels[i]);
  return true;
}

// Any variety up to the plot's level can be grown there.
export function choosePlotCrop(s, i, variety) {
  if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || !Number.isInteger(variety) || !VARIETIES[variety] || variety > s.plotLevels[i]) return false;
  s.plotCrops[i] = variety;
  if (s.plots[i].phase === "empty") s.plots[i].variety = variety;
  return true;
}

// Picking pumpkins quickly builds a streak. Every pick lifts the visitor boost
// (a new streak keeps whatever is still fading); every sixth in a row pays a
// small bonus, at most once a minute. Helpers' picks never come through here.
export function rewardHarvestStreak(s) {
  const f = s.streak;
  if (s.paused) return { count: f.count, bonus: 0, visitors: visitorBonus(s) };
  if (s.time > f.until) f.count = 0;
  else if (f.count && s.time - (f.last ?? -Infinity) < STREAK.gap) { f.until = s.time + STREAK.window; f.visitorBoostUntil = f.until + STREAK.fade; return { count: f.count, bonus: 0, visitors: visitorBonus(s) }; }
  f.count++;
  f.last = s.time;
  f.until = s.time + STREAK.window;
  f.best = Math.max(f.best, f.count);
  f.visitorBoost = Math.max(streakBonus(f.count), visitorBonus(s));
  f.visitorBoostUntil = f.until + STREAK.fade;
  const bonus = f.count % 6 === 0 && s.time >= f.nextBonusAt ? economy.streakBonus : 0;
  if (bonus) {
    s.coins += bonus; s.earned += bonus; f.bonusCoins += bonus;
    f.nextBonusAt = s.time + economy.streakCooldownSeconds;
  }
  return { count: f.count, bonus, visitors: f.visitorBoost };
}

export function updateFarm(s, dt, events) {
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase !== "growing") continue;
    p.progress = Math.min(1, p.progress + dt / growTime(s, i));
    if (p.progress >= 1) { p.phase = "ready"; p.ripe = s.time; events.push({ type: "ripe", plot: i }); }
  }
  // Helping hands step back while the player is steering Shane or Natalie:
  // the farm is theirs to work by hand.
  if (!s.upgrades.auto || s.handsOn) return;
  s.helperTimer += dt;
  if (s.helperTimer < 2) return;
  s.helperTimer %= 2;
  // Helpers leave a fresh pumpkin a few seconds for Shane and Natalie, so a
  // player picking by hand keeps the picks (and the streak) that are theirs.
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i], n = p.phase === "ready" && s.time - (p.ripe ?? -Infinity) >= HELPER_WAIT ? harvest(s, i) : 0;
    if (n) events.push({ type: "harvest", plot: i, count: n });
    if (plant(s, i)) events.push({ type: "plant", plot: i });
  }
}
