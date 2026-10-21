// A headless run of the game's rules, to see what the visitor upgrades and the
// harvest streak's visitor boost do to the economy. A simple player harvests and
// replants every few seconds, keeps the best pumpkins on the shop tables and
// buys the cheapest thing it can afford. Two players: one picks with the helper
// buttons and never builds a streak, the other picks by hand, so every pick
// counts towards the streak as it does in the game; a keen hand picker also
// plays the current rules, looking every second, to show how far the boost can
// go before the arrival floor holds it. Reports income per in-game
// hour, early, mid and late; when the first upgrades, the shop and each level
// arrive; how much the boost actually adds; and each visitor upgrade's payback.
//   node tools/economy-sim.mjs [hours=4] [--old path/to/old/model.js]
// With --old, the same two players also play an older copy of the rules
// (for example a `git archive` of the last commit), for a before and after.
import { pathToFileURL } from "node:url";
import path from "node:path";

const args = process.argv.slice(2), oldAt = args.indexOf("--old");
const OLD = oldAt >= 0 ? args.splice(oldAt, 2)[1] : null;
const HOURS = Number(args[0]) || 4, STEP = 0.1, PAYBACK_WINDOW = 600;
const PHASES = [["early", 0, 900], ["mid", 900, 5400], ["late", 5400, HOURS * 3600]];
const FIRSTS = ["sign 1", "sign 2", "lights 1", "sign 3", "lights 2", "tools 1", "yield 1", "auto 1", "shop open"];

// Everything the player might buy, as [label, price, buy, visitor id]. Decor
// and the house are left out: they don't earn.
function shoppingList(M, s) {
  const list = M.UPGRADES.filter((u) => s.upgrades[u.id] < u.max).map((u) => [`${u.id} ${s.upgrades[u.id] + 1}`, M.upgradeCost(s, u.id), () => M.buyUpgrade(s, u.id)]);
  const plot = s.plotLevels.slice(0, M.openPlots(s)).reduce((best, l, i) => (l < 3 && (best < 0 || l < s.plotLevels[best]) ? i : best), -1);
  if (plot >= 0) list.push(["seeds " + M.VARIETIES[s.plotLevels[plot] + 1].name, M.VARIETIES[s.plotLevels[plot] + 1].cost, () => M.upgradePlot(s, plot)]);
  for (const u of M.SHOP_UPGRADES) {
    const price = M.shopUpgradeCost(s, u.id);
    if (price !== undefined && (u.id === "open" || s.shop.unlocked)) list.push(["shop " + u.id, price, () => M.upgradeShop(s, u.id)]);
  }
  for (const u of M.VISITOR_UPGRADES) {
    const price = M.visitorUpgradeCost(s, u.id);
    if (price !== undefined && M.visitorUpgradeUnlocked(s, u.id)) list.push([`${u.id} ${s.visitorUpgrades[u.id] + 1}`, price, () => M.buyVisitorUpgrade(s, u.id), u.id]);
  }
  return list.sort((a, b) => a[1] - b[1]);
}

// The player's chores: pick, replant and fill the tables with the dearest
// pumpkins in stock. A hand picker's every pick goes through the streak, as
// tapping a ripe plot or Harvest all does in the game.
function tend(M, s, byHand) {
  for (let i = 0; i < M.openPlots(s); i++) { if (M.harvest(s, i) && byHand) M.rewardHarvestStreak(s); M.plant(s, i); }
  if (!s.shop.unlocked) return;
  const best = [3, 2, 1, 0].filter((v) => M.available(s, v) > 0).slice(0, M.displayCount(s.shop));
  for (let i = 0; i < M.displayCount(s.shop); i++) M.assignDisplay(s, i, null);
  best.forEach((v, i) => M.assignDisplay(s, i, v));
}

// Runs for some seconds with no shopping; returns what was earned.
function coast(M, s, seconds, byHand, every) {
  const from = s.earned;
  for (let t = 0, act = 0; t < seconds; t += STEP) { M.update(s, STEP); if ((act += STEP) >= every - 1e-9) { act = 0; tend(M, s, byHand); } }
  return s.earned - from;
}

// What the streak adds to the path right now, under either set of rules.
const boostNow = (M, s) => (M.pathBoost ? M.pathBoost(s) : M.visitorRushSeconds?.(s) > 0 ? 0.5 : 0);

function play(M, byHand, every, paybacks) {
  const s = M.freshState(), hourly = [], bought = [], levels = {}, phase = PHASES.map(() => ({ earned: 0, boost: 0, served: 0, time: 0 }));
  let act = 0, crowd = 0, held = 0;
  for (let step = 1; step <= HOURS * 3600 / STEP; step++) {
    const from = s.earned, served = s.stall.served + s.shop.served, timer = s.visitorTimer;
    M.update(s, STEP);
    const p = phase[PHASES.findIndex(([, a, b]) => s.time > a && s.time <= b + 1e-6)];
    if (p) { p.earned += s.earned - from; p.boost += boostNow(M, s) * STEP; p.served += s.stall.served + s.shop.served - served; p.time += STEP; }
    crowd = Math.max(crowd, s.visitors.length + s.arriving.length);
    if (timer === 0 && s.visitorTimer === 0) held += STEP;
    if (step % (3600 / STEP) === 0) hourly.push(s.earned - hourly.reduce((n, h) => n + h, 0));
    const level = M.patchLevel(s).level;
    if (!levels[level]) levels[level] = s.time;
    if ((act += STEP) < every - 1e-9) continue;
    act = 0;
    tend(M, s, byHand);
    for (let item = shoppingList(M, s)[0]; item && s.coins >= item[1]; item = shoppingList(M, s)[0]) {
      const [label, price, buy, visitorId] = item;
      // A visitor upgrade's worth: the same farm with and without it, for ten minutes.
      if (paybacks && (visitorId || label.startsWith("sign"))) {
        const without = structuredClone(s), with_ = structuredClone(s);
        if (visitorId) M.buyVisitorUpgrade(with_, visitorId); else M.buyUpgrade(with_, "sign");
        const gain = (coast(M, with_, PAYBACK_WINDOW, byHand, every) - coast(M, without, PAYBACK_WINDOW, byHand, every)) / PAYBACK_WINDOW;
        paybacks.push({ label, at: s.time, price, perHour: gain * 3600, payback: gain > 0 ? price / gain : Infinity });
      }
      buy();
      bought.push({ label, price, at: s.time });
    }
  }
  return { s, hourly, bought, levels, phase, crowd, held };
}

const load = async (file) => import(pathToFileURL(path.resolve(file)).href);
const rules = { now: await import("../src/model.js"), ...(OLD ? { old: await load(OLD) } : {}) };
const paybacks = [], runs = [], PLAYERS = [["no streak", false, 3], ["by hand", true, 3], ["keen, 1s", true, 1]];
for (const [name, M] of Object.entries(rules)) for (const [who, byHand, every] of PLAYERS) {
  if (name === "old" && every === 1) continue;
  runs.push({ label: `${name} ${who}`, ...play(M, byHand, every, name === "now" && who === "by hand" ? paybacks : null) });
}

const clock = (t) => (t === undefined ? "-" : `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}m${String(Math.floor(t % 60)).padStart(2, "0")}`);
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const col = (x, w = 15) => String(x).padStart(w);
const head = (title) => console.log(`\n${title}\n${"".padStart(18)}${runs.map((r) => col(r.label)).join("")}`);
const row = (label, f) => console.log(label.padEnd(18) + runs.map((r) => col(f(r))).join(""));

console.log(`Players look every 3s (keen: 1s) and buy the cheapest thing they can afford; ${HOURS} in-game hours.`);
head("Income per in-game hour");
for (let h = 0; h < HOURS; h++) row(`hour ${h + 1}`, (r) => gbp(r.hourly[h]));
for (const [i, [name, a, b]] of PHASES.entries()) row(`${name} ${a / 60}-${b / 60} min`, (r) => gbp(r.phase[i].earned / (r.phase[i].time / 3600)) + "/h");
head("Visitors served a minute, and the boost the path actually got (time-averaged)");
for (const [i, [name]] of PHASES.entries()) row(`${name} served`, (r) => (r.phase[i].served / (r.phase[i].time / 60)).toFixed(1));
for (const [i, [name]] of PHASES.entries()) row(`${name} boost`, (r) => `+${Math.round(r.phase[i].boost / r.phase[i].time * 100)}%`);
row("most on the path", (r) => r.crowd);
row("party held at gate", (r) => `${Math.round(r.held)}s`);
head("First purchases (in-game time)");
for (const label of FIRSTS) row(label, (r) => clock(r.bought.find((b) => b.label === label)?.at));
head("Levels (in-game time)");
for (let level = 2; level <= (rules.now.LEVELS?.length ?? 0); level++) row(`${level} ${rules.now.LEVELS[level - 1].name}`.slice(0, 18), (r) => clock(r.levels[level]));
head("Totals");
row("earned", (r) => gbp(r.s.earned));
row("best streak", (r) => r.s.streak.best);
row("stall served", (r) => r.s.stall.served);
row("shop served", (r) => r.s.shop.served);
row("missed (budget)", (r) => r.s.stall.missedBudget);
row("missed (sold out)", (r) => r.s.stall.missedStock);

console.log("\nVisitor-frequency and visitor upgrades (now, by hand): when bought, what they add, and how long they take to pay for themselves");
for (const p of paybacks) console.log(`${clock(p.at)}  ${p.label.padEnd(10)} ${gbp(p.price).padStart(8)}  +${gbp(p.perHour).padStart(8)}/h  payback ${Number.isFinite(p.payback) ? (p.payback / 60).toFixed(1) + " min" : "never (in 10 min)"}`);
console.log("\nEverything bought, in order (now, by hand):");
console.log(runs.find((r) => r.label === "now by hand").bought.map((b) => `${clock(b.at).slice(0, 5)} ${b.label}`).join(" · "));
