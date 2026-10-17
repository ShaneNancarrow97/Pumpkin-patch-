// Headless economy simulator: runs the real game model with a scripted player
// and reports income, unsold stock, milestones and every purchase.
//
//   npm run sim -- --minutes 60 --player planner --seed 1 [--json]
//
// Players:
//   idle     plants and harvests every 10 s, never buys anything
//   steady   tends every 2 s and always buys the cheapest affordable upgrade
//   planner  tends every 2 s and saves for demand first: shop, checkout,
//            displays, signs and pumpkin varieties before growth upgrades
//   eager    like planner, but tends every 0.5 s and taps twice a second
//
// The model advances in the same 0.1 s steps as the game.
import { buy, cost, click, fresh, harvest, plant, unlocked, update, upgrades } from "../src/core/model.mjs";
import { upgradePlot } from "../src/core/plot-model.mjs";
import { assignDisplay, upgradeShop } from "../src/core/shop.js";
import { rewardHarvestStreak } from "../src/core/festival-model.mjs";
import { stockQuantity } from "../src/core/inventory.js";
import { pumpkinVarieties } from "../src/content/products.js";
import { shopUpgradeCosts } from "../src/content/shop.js";

const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const minutes = Number(arg("minutes", 60));
const player = arg("player", "planner");
const seed = Number(arg("seed", 1));
const json = process.argv.includes("--json");

// Lower rank is bought first; ties go to the cheaper option.
const DEMAND_FIRST = { "shop:open": 0, "farm:auto": 1, "shop:checkout": 2, "shop:displays": 2, "farm:sign": 3, plot: 4, "farm:plots": 5, "shop:capacity": 6, "farm:tools": 7, "farm:yield": 7 };
const PLAYERS = {
  idle: { tend: 10, buys: false, taps: 0 },
  steady: { tend: 2, buys: true, taps: 0, rank: () => 0 },
  planner: { tend: 2, buys: true, taps: 0, rank: (o) => DEMAND_FIRST[o.kind] },
  eager: { tend: 0.5, buys: true, taps: 2, rank: (o) => DEMAND_FIRST[o.kind] },
};
const policy = PLAYERS[player];
if (!policy) throw new Error(`Unknown player "${player}". Use ${Object.keys(PLAYERS).join(", ")}.`);

// Deterministic randomness (xorshift32) so runs can be compared.
let rng = seed >>> 0 || 1;
Math.random = () => {
  rng ^= rng << 13; rng >>>= 0;
  rng ^= rng >>> 17;
  rng ^= rng << 5; rng >>>= 0;
  return rng / 4294967296;
};

const STEP = 0.1;
const s = fresh();
const log = [];
const milestones = {};
const outdoor = { arrivals: 0, sales: 0, leftEmptyHanded: 0 };
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(3)}m${String(Math.floor(t % 60)).padStart(2, "0")}s`;
const reach = (name, t) => { if (milestones[name] === undefined) milestones[name] = Math.round(t); };

function options() {
  const list = upgrades.filter((u) => s.upgrades[u.id] < u.max).map((u) => ({
    kind: "farm:" + u.id, label: `farm:${u.id} ${s.upgrades[u.id] + 1}`, price: cost(s, u.id), apply: () => buy(s, u.id),
  }));
  for (let i = 0; i < unlocked(s); i++) {
    const next = pumpkinVarieties[s.plotLevels[i] + 1];
    if (next) list.push({ kind: "plot", label: `plot ${i + 1} -> ${next.id}`, price: next.cost, apply: () => upgradePlot(s, i) });
  }
  const shop = s.shop;
  const levels = { open: Number(shop.unlocked), capacity: shop.capacityLevel, displays: shop.displayLevel, checkout: shop.checkoutLevel };
  for (const [id, prices] of Object.entries(shopUpgradeCosts)) {
    const price = prices[levels[id]];
    if (price !== undefined && (id === "open" || shop.unlocked)) {
      list.push({ kind: "shop:" + id, label: `shop:${id} ${levels[id] + 1}`, price, apply: () => upgradeShop(s, id) });
    }
  }
  return list.sort((a, b) => policy.rank(a) - policy.rank(b) || a.price - b.price);
}

// Keep the shop displays on the best varieties the patch is growing.
function stockDisplays() {
  if (!s.shop.unlocked) return;
  const slots = s.shop.displayLevel ? 4 : 2;
  const grown = [...new Set(s.plotLevels.slice(0, unlocked(s)))].sort((a, b) => b - a).map((l) => "pumpkin-" + pumpkinVarieties[l].id);
  const wanted = grown.slice(0, slots);
  s.shop.displays.forEach((id, i) => { if (i < slots && id && !wanted.includes(id)) assignDisplay(s, i, null); });
  for (const id of wanted) {
    if (s.shop.displays.slice(0, slots).includes(id)) continue;
    const free = s.shop.displays.findIndex((d, i) => i < slots && !d);
    if (free >= 0) assignDisplay(s, free, id);
  }
}

let nextTend = 0, nextTap = 0;
const total = minutes * 60;
for (let t = 0; t < total; t += STEP) {
  if (t >= nextTend) {
    nextTend += policy.tend;
    if (!s.upgrades.auto) {
      for (let i = 0; i < unlocked(s); i++) if (harvest(s, i) > 0) rewardHarvestStreak(s);
      for (let i = 0; i < unlocked(s); i++) plant(s, i);
    }
    if (policy.buys) {
      // Buy the top-ranked option once affordable; never skip ahead to a cheaper one.
      for (let pick = options()[0]; pick && pick.price <= s.coins; pick = options()[0]) {
        if (!pick.apply()) break;
        log.push({ t: Math.round(t), what: pick.label, price: pick.price });
        if (pick.kind === "shop:open") reach("shopOpened", t);
        if (pick.kind === "farm:auto") reach("helpingHands", t);
      }
      stockDisplays();
    }
  }
  if (policy.taps && t >= nextTap) { nextTap += 1 / policy.taps; click(s); }
  for (const e of update(s, STEP)) {
    if (e.type === "arrival") outdoor.arrivals++;
    if (e.type === "sale" && e.route === "stall") outdoor.sales++;
    if (e.type === "empty") outdoor.leftEmptyHanded++;
    if (e.type === "sale") reach("firstSale", t);
  }
  if (s.earned >= 1000) reach("earned1k", t);
  if (s.earned >= 10000) reach("earned10k", t);
  if (s.earned >= 100000) reach("earned100k", t);
  if (policy.buys && !options().length) reach("everythingBought", t);
}

const result = {
  player, minutes, seed,
  coins: Math.round(s.coins),
  earned: Math.round(s.earned),
  earnedPerMinute: Math.round(s.earned / minutes),
  harvested: s.harvested,
  unsoldStock: stockQuantity(s.inventory),
  outdoor,
  shop: { unlocked: s.shop.unlocked, served: s.shop.served, itemsSold: s.shop.itemsSold, income: Math.round(s.shop.income) },
  milestonesSeconds: milestones,
  purchases: log.length,
};

if (json) {
  console.log(JSON.stringify({ ...result, log }, null, 2));
} else {
  console.log(`Pumpkin Patch economy · ${player} player · ${minutes} min · seed ${seed}\n`);
  for (const [k, v] of Object.entries(result)) {
    if (["player", "minutes", "seed", "milestonesSeconds"].includes(k)) continue;
    console.log(`  ${k.padEnd(16)} ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  console.log("\n  milestones:");
  for (const [k, v] of Object.entries(milestones)) console.log(`   ${fmt(v)}  ${k}`);
  if (log.length) {
    console.log("\n  purchases:");
    for (const e of log.slice(0, 30)) console.log(`   ${fmt(e.t)}  £${String(e.price).padStart(6)}  ${e.what}`);
    if (log.length > 30) console.log(`   … ${log.length - 30} more (use --json for the full log)`);
  }
}
