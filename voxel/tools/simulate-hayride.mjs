// A finite-stock demand comparison, separate from the playable starting save.
// node voxel/tools/simulate-hayride.mjs [report.json]
import fs from "node:fs";
import * as M from "../src/model.js";

function run(label, price, scares = false) {
  const s = M.freshState();
  Object.assign(s, { coins: 50000, earned: 70000, introSeen: true });                   // level 11, where the hayride opens
  s.progression.claimed = Array.from({ length: 8 }, (_, i) => i + 1); s.progression.pending = [];
  Object.assign(s.hollowHouse, { purchased: true, status: "ready", open: false });
  Object.assign(s.upgrades, { sign: 2, storage: 6 });
  Object.assign(s.visitorUpgrades, { lights: 1, party: 1, crowd: 1, appetite: 1 });
  s.stock = [500, 500, 300, 200]; s.shop.unlocked = true; s.shop.displays = [0, 1, 2, 3];
  if (price !== null) {
    if (!M.buyHayride(s)) throw Error("Fixture purchase failed");
    M.setHayrideTicketPrice(s, price);
    if (scares) for (const id of ["turning-scarecrows", "spider-drop"]) M.buyHayrideScare(s, id);
    M.setHayrideOpen(s, true);
  }
  const earned = s.earned; let maxGuests = 0, minWallet = Infinity;
  for (let i = 0; i < 4800; i++) {
    M.update(s, .25);
    maxGuests = Math.max(maxGuests, s.visitors.length + s.arriving.length);
    for (const v of s.visitors) minWallet = Math.min(minWallet, v.budget);
  }
  if (minWallet < 0 || maxGuests > M.visitorCapacity(s)) throw Error("Wallet/capacity invariant failed");
  return { label, seconds: 1200, price, scare: M.hayrideScareRating(s), tickets: s.hayride.ticketsSold,
    ticketsPerMinute: s.hayride.ticketsSold / 20, ticketIncome: s.hayride.income, ticketIncomePerMinute: s.hayride.income / 20,
    retail: s.stall.income + s.shop.income, earnedChangeIncludingMilestones: s.earned - earned,
    missed: s.hayride.missed, departures: s.hayride.departures, stockRemaining: s.stock.reduce((a, b) => a + b),
    maxGuests, capacity: M.visitorCapacity(s), minWallet };
}

const report = {
  scope: "Deterministic level-11 demand check, not a profit forecast. Same 1,500 finite starting pumpkins, sign2/lights1/party1/crowd1/appetite1, indoor shop and closed Hollow House. No stock refill. Fixed 0.25-second steps for 20 game minutes. Earned change includes normal once-only level rewards; ticket and retail ledgers are separate.",
  results: [run("Closed attraction", null), run("Basic £4", 4), run("Basic £8", 8), run("Basic £12", 12), run("Two scare upgrades £8", 8, true)],
};
const text = JSON.stringify(report, null, 2) + "\n";
if (process.argv[2]) fs.writeFileSync(process.argv[2], text); else process.stdout.write(text);
