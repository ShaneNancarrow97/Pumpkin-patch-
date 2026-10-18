// A headless run of the game's rules, to see what the visitor upgrades do to
// the economy. A simple player harvests and replants every few seconds, keeps
// the best pumpkins on the shop tables and buys the cheapest thing it can
// afford. It plays once without the visitor upgrades (the game as it was) and
// once with them, then reports income per in-game hour and each visitor
// upgrade's payback time, measured against a copy of the game that didn't buy it.
//   node tools/economy-sim.mjs [hours=4]
import * as M from "../src/model.js";

const HOURS = Number(process.argv[2]) || 4, STEP = 0.1, ACT = 3, PAYBACK_WINDOW = 600, MILESTONES = [1000, 10000, 50000, 100000, 250000];

// Everything the player might buy, as [label, price, buy]. Decor and the house
// are left out: they don't earn.
function shoppingList(s, visitors) {
  const list = M.UPGRADES.filter((u) => s.upgrades[u.id] < u.max).map((u) => [`${u.id} ${s.upgrades[u.id] + 1}`, M.upgradeCost(s, u.id), () => M.buyUpgrade(s, u.id)]);
  const plot = s.plotLevels.slice(0, M.openPlots(s)).reduce((best, l, i) => (l < 3 && (best < 0 || l < s.plotLevels[best]) ? i : best), -1);
  if (plot >= 0) list.push(["seeds " + M.VARIETIES[s.plotLevels[plot] + 1].name, M.VARIETIES[s.plotLevels[plot] + 1].cost, () => M.upgradePlot(s, plot)]);
  for (const u of M.SHOP_UPGRADES) {
    const price = M.shopUpgradeCost(s, u.id);
    if (price !== undefined && (u.id === "open" || s.shop.unlocked)) list.push(["shop " + u.id, price, () => M.upgradeShop(s, u.id)]);
  }
  if (visitors) for (const u of M.VISITOR_UPGRADES) {
    const price = M.visitorUpgradeCost(s, u.id);
    if (price !== undefined && M.visitorUpgradeUnlocked(s, u.id)) list.push([`${u.id} ${s.visitorUpgrades[u.id] + 1}`, price, () => M.buyVisitorUpgrade(s, u.id), u.id]);
  }
  return list.sort((a, b) => a[1] - b[1]);
}

// The player's chores: pick, replant and fill the tables with the dearest pumpkins in stock.
function tend(s) {
  for (let i = 0; i < M.openPlots(s); i++) { M.harvest(s, i); M.plant(s, i); }
  if (!s.shop.unlocked) return;
  const best = [3, 2, 1, 0].filter((v) => M.available(s, v) > 0).slice(0, M.displayCount(s.shop));
  for (let i = 0; i < M.displayCount(s.shop); i++) M.assignDisplay(s, i, null);
  best.forEach((v, i) => M.assignDisplay(s, i, v));
}

// Runs for some seconds with no shopping; returns what was earned.
function coast(s, seconds) {
  const from = s.earned;
  for (let t = 0, act = 0; t < seconds; t += STEP) { M.update(s, STEP); if ((act += STEP) >= ACT) { act = 0; tend(s); } }
  return s.earned - from;
}

function play(visitors) {
  const s = M.freshState(), hourly = [], bought = [], paybacks = [], reached = {};
  let act = 0;
  for (let step = 1; step <= HOURS * 3600 / STEP; step++) {
    M.update(s, STEP);
    if (step % (3600 / STEP) === 0) hourly.push(s.earned - hourly.reduce((n, h) => n + h, 0));
    for (const m of MILESTONES) if (!reached[m] && s.earned >= m) reached[m] = s.time;
    if ((act += STEP) < ACT) continue;
    act = 0;
    tend(s);
    for (let item = shoppingList(s, visitors)[0]; item && s.coins >= item[1]; item = shoppingList(s, visitors)[0]) {
      const [label, price, buy, visitorId] = item;
      // A visitor upgrade's worth: the same farm with and without it, for ten minutes.
      if (visitorId) {
        const without = structuredClone(s), with_ = structuredClone(s);
        M.buyVisitorUpgrade(with_, visitorId);
        const gain = (coast(with_, PAYBACK_WINDOW) - coast(without, PAYBACK_WINDOW)) / PAYBACK_WINDOW;
        paybacks.push({ label, at: s.time, price, perHour: gain * 3600, payback: gain > 0 ? price / gain : Infinity });
      }
      buy();
      bought.push({ label, price, at: s.time });
    }
  }
  return { s, hourly, bought, paybacks, reached };
}

const clock = (t) => `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}`;
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const runs = { before: play(false), after: play(true) };

console.log(`Income per in-game hour (player tends every ${ACT}s, buys the cheapest thing it can afford)`);
console.log("hour   before      after");
for (let h = 0; h < HOURS; h++) console.log(`${String(h + 1).padStart(4)}  ${gbp(runs.before.hourly[h]).padStart(9)}  ${gbp(runs.after.hourly[h]).padStart(9)}`);
for (const [name, r] of Object.entries(runs)) {
  const st = r.s.stall, sh = r.s.shop;
  console.log(`\n${name}: earned ${gbp(r.s.earned)}; stall served ${st.served} (${gbp(st.income)}, and ${gbp(st.cocoa)} in hot chocolate), missed ${st.missedStock} sold out and ${st.missedBudget} over budget; shop served ${sh.served} (${gbp(sh.income)})`);
  console.log("  earned " + MILESTONES.map((m) => `${gbp(m)} at ${r.reached[m] ? clock(r.reached[m]) : "-"}`).join(", "));
}
console.log("\nVisitor upgrades: when bought, what they add, and how long they take to pay for themselves");
for (const p of runs.after.paybacks) console.log(`${clock(p.at)}  ${p.label.padEnd(10)} ${gbp(p.price).padStart(8)}  +${gbp(p.perHour).padStart(8)}/h  payback ${Number.isFinite(p.payback) ? (p.payback / 60).toFixed(1) + " min" : "never (in 10 min)"}`);
console.log("\nEverything bought, in order (after):");
console.log(runs.after.bought.map((b) => `${clock(b.at)} ${b.label}`).join(" · "));
