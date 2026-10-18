// The farm: plots, seeds, upgrades, the big pumpkin and harvest streaks. Prices
// and upgrade effects follow the main game (src/core/model.mjs, plot-model.mjs,
// festival-model.mjs); the one change is that better pumpkins take a little
// longer to grow, so choosing a crop is a real choice.
import { pumpkinVarieties } from "../../../src/content/products.js";
import { economy } from "../../../src/content/economy.js";
import { addStock } from "./stock.js";

export const VARIETIES = pumpkinVarieties.map((v, i) => ({
  ...v,
  grow: [18, 24, 30, 36][i],                                                  // seconds, before the watering can
  color: [0xf0821e, 0xd9d2ff, 0x9d55e6, 0xf5c84a][i],
  glow: [0xffb04a, 0xbeb7ff, 0xb774ff, 0xffdf64][i],
}));

export const UPGRADES = [
  { id: "tools", name: "A better watering can", text: "Pumpkins grow 18% faster.", cost: 90, max: 6 },
  { id: "yield", name: "A little extra love", text: "One more pumpkin per harvest.", cost: 150, max: 5 },
  { id: "auto", name: "Helping hands", text: "Shane and Natalie plant and pick for you.", cost: 500, max: 1 },
  { id: "plots", name: "Room for more", text: "Make space for three more pumpkin plots.", cost: 300, max: 2 },
  { id: "sign", name: "Spread the word", text: "Visitors arrive 10% more often, at the stall and the shop.", cost: 400, max: 3 },
];

export const freshUpgrades = () => ({ tools: 0, yield: 0, auto: 0, plots: 0, sign: 0 });
export const freshPlots = () => Array.from({ length: 12 }, () => ({ phase: "empty", progress: 0, variety: 0 }));
export const freshStreak = () => ({ count: 0, until: 0, best: 0, bonusCoins: 0, nextBonusAt: 0 });

export const openPlots = (s) => 6 + s.upgrades.plots * 3;
export const growTime = (s, i) => VARIETIES[s.plots[i].variety].grow * Math.pow(0.82, s.upgrades.tools);
export const harvestSize = (s) => 1 + s.upgrades.yield;
export const upgradeCost = (s, id) => {
  const u = UPGRADES.find((x) => x.id === id);
  return Math.round(u.cost * Math.pow(economy.farmCostMultiplier, s.upgrades[id]));
};
// The best pumpkin any open plot can grow: what a free pumpkin from the big one is.
const bestVariety = (s) => Math.max(...s.plotLevels.slice(0, openPlots(s)));

export function plant(s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || s.plots[i].phase !== "empty") return false;
  s.plots[i] = { phase: "growing", progress: 0, variety: s.plotCrops[i] };
  return true;
}

// Returns how many pumpkins went into stock (0 if there was nothing to pick).
export function harvest(s, i) {
  const p = s.plots[i];
  if (!p || i >= openPlots(s) || p.phase !== "ready") return 0;
  const n = harvestSize(s);
  addStock(s, p.variety, n);
  s.harvested += n;
  s.plots[i] = { phase: "empty", progress: 0, variety: s.plotCrops[i] };
  return n;
}

// Tapping the big pumpkin: growing plots jump ahead; with nothing growing,
// every eighth tap shakes a pumpkin loose.
export function tap(s) {
  s.taps++;
  let growing = 0;
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase !== "growing") continue;
    growing++;
    p.progress = Math.min(1, p.progress + 1.5 / (22 * Math.pow(0.82, s.upgrades.tools)));
    if (p.progress >= 1) p.phase = "ready";
  }
  let reward = 0;
  if (!growing && s.taps % 8 === 0) { addStock(s, bestVariety(s), 1); s.harvested++; reward = 1; }
  return { boost: growing > 0, reward };
}

export function buyUpgrade(s, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || s.upgrades[id] >= u.max) return false;
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
  if (!Number.isInteger(i) || i < 0 || i >= openPlots(s) || !Number.isInteger(variety) || variety < 0 || variety > s.plotLevels[i]) return false;
  s.plotCrops[i] = variety;
  if (s.plots[i].phase === "empty") s.plots[i].variety = variety;
  return true;
}

// Picking pumpkins quickly builds a streak; every sixth in a row pays a small
// bonus, at most once a minute.
export function rewardHarvestStreak(s) {
  const f = s.streak;
  if (s.time > f.until) f.count = 0;
  f.count++;
  f.until = s.time + 5;
  f.best = Math.max(f.best, f.count);
  const bonus = f.count % 6 === 0 && s.time >= f.nextBonusAt ? economy.streakBonus : 0;
  if (bonus) {
    s.coins += bonus; s.earned += bonus; f.bonusCoins += bonus;
    f.nextBonusAt = s.time + economy.streakCooldownSeconds;
  }
  return { count: f.count, bonus };
}

export function updateFarm(s, dt, events) {
  for (let i = 0; i < openPlots(s); i++) {
    const p = s.plots[i];
    if (p.phase !== "growing") continue;
    p.progress = Math.min(1, p.progress + dt / growTime(s, i));
    if (p.progress >= 1) { p.phase = "ready"; events.push({ type: "ripe", plot: i }); }
  }
  if (!s.upgrades.auto) return;
  s.helperTimer += dt;
  if (s.helperTimer < 2) return;
  s.helperTimer %= 2;
  for (let i = 0; i < openPlots(s); i++) {
    const n = harvest(s, i);
    if (n) events.push({ type: "harvest", plot: i, count: n });
    if (plant(s, i)) events.push({ type: "plant", plot: i });
  }
}
