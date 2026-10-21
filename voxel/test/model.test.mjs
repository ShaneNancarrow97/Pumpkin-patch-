import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const run = (s, seconds, step = 0.1) => { const events = []; for (let t = 0; t < seconds - 1e-9; t += step) events.push(...M.update(s, step)); return events; };
const stocked = (s, counts) => { s.stock = [...counts]; return s; };

test("plant, grow and harvest, with A little extra love adding pumpkins", () => {
  const s = M.freshState();
  assert.equal(M.openPlots(s), 6);
  assert.ok(M.plant(s, 0));
  assert.ok(!M.plant(s, 0), "occupied");
  assert.ok(!M.plant(s, 7), "not cleared yet");
  run(s, M.growTime(s, 0) + 0.2);
  assert.equal(s.plots[0].phase, "ready");
  assert.equal(M.harvest(s, 0), 1);
  assert.deepEqual(s.stock, [1, 0, 0, 0]);
  s.upgrades.yield = 2;
  M.plant(s, 1); s.plots[1] = { ...s.plots[1], phase: "ready", progress: 1 };
  assert.equal(M.harvest(s, 1), 3);
  assert.equal(s.harvested, 4);
});

test("the big pumpkin hurries growing plots, and shakes a pumpkin loose every eighth tap when nothing grows", () => {
  const s = M.freshState();
  M.plant(s, 0);
  assert.equal(M.tap(s).boost, true);
  assert.ok(s.plots[0].progress > 0.05);
  s.plots[0] = { phase: "empty", progress: 0, variety: 0 };
  let rewards = 0;
  for (let i = 0; i < 15; i++) { s.time += 0.2; rewards += M.tap(s).reward; }
  assert.equal(s.taps, 16);
  assert.equal(rewards, 2);
  assert.equal(M.available(s), 2);
});

test("upgrades cost 2.2 times more each level and stop at their maximum", () => {
  const s = M.freshState();
  s.coins = 1e6;
  assert.equal(M.upgradeCost(s, "tools"), 90);
  assert.ok(M.buyUpgrade(s, "tools"));
  assert.equal(M.upgradeCost(s, "tools"), 198);
  assert.ok(M.buyUpgrade(s, "plots") && M.buyUpgrade(s, "plots"));
  assert.ok(!M.buyUpgrade(s, "plots"), "max 2");
  assert.equal(M.openPlots(s), 12);
  assert.ok(M.buyUpgrade(s, "auto"));
  run(s, 2.1);
  assert.ok(s.plots.every((p) => p.phase === "growing"), "helping hands planted everything");
});

test("better seeds per plot, and any owned variety can be chosen", () => {
  const s = M.freshState();
  assert.ok(!M.upgradePlot(s, 0), "can't afford Moonlight");
  s.coins = 1000;
  assert.ok(M.upgradePlot(s, 0));
  assert.equal(s.plotLevels[0], 1);
  assert.equal(s.plotCrops[0], 1, "moved up to the new best crop");
  assert.ok(M.choosePlotCrop(s, 0, 0));
  assert.ok(!M.choosePlotCrop(s, 0, 2), "Witchfire not unlocked");
  M.plant(s, 0);
  assert.equal(s.plots[0].variety, 0);
});

test("a harvest streak pays £5 on every sixth pick, once a minute", () => {
  const s = M.freshState();
  const bonuses = [];
  for (let i = 0; i < 12; i++) { s.time += 1; bonuses.push(M.rewardHarvestStreak(s).bonus); }
  assert.deepEqual(bonuses.filter(Boolean), [5]);
  assert.equal(s.streak.best, 12);
  s.time += 10;
  assert.equal(M.rewardHarvestStreak(s).count, 1, "streak broken after five seconds");
});

test("stall visitors fill a basket with their favourites, within budget", () => {
  const s = stocked(M.freshState(), [5, 2, 1, 1]);
  s.visitorTimer = 0.05;
  run(s, 0.1);
  assert.equal(s.visitors.length, 1);
  const v = s.visitors[0];
  assert.equal(v.profile, 0);                                                   // "A little lantern": £12, one pumpkin
  const events = run(s, M.VISIT.arrive);
  const sale = events.find((e) => e.type === "sale");
  assert.ok(sale);
  assert.equal(sale.amount, 12);
  assert.deepEqual(s.stock, [4, 2, 1, 1]);
  assert.equal(s.stall.served, 1);
  assert.equal(v.bought, 0);
});

test("stall visitors leave empty-handed when there's nothing they can buy", () => {
  const s = M.freshState();
  s.visitorTimer = 0.05;
  const events = run(s, M.VISIT.arrive + M.VISIT.patience + 0.3);
  assert.ok(events.some((e) => e.type === "missed" && e.reason === "soldout"));
  assert.equal(s.stall.missedStock, 1);
});

test("the indoor shop: open it, set the tables, and customers browse, queue and pay", () => {
  const s = stocked(M.freshState(), [10, 10, 0, 0]);
  s.visitorTimer = 1e9;                                                         // keep the stall quiet
  assert.ok(!M.upgradeShop(s, "capacity"), "not open yet");
  s.coins = 10000;
  assert.ok(M.upgradeShop(s, "open"));
  assert.equal(M.shopUpgradeCost(s, "open"), undefined);
  assert.ok(M.assignDisplay(s, 1, 1));
  assert.ok(!M.assignDisplay(s, 0, 1), "a variety shows once");
  assert.ok(!M.assignDisplay(s, 2, 2), "only two tables until the upgrade");
  const coins = s.coins;
  const events = run(s, 2 + 3 + 4 + M.CHECKOUT_SECONDS[0] + 0.5);
  const sale = events.find((e) => e.type === "sale" && e.route === "shop");
  assert.ok(sale, "a customer paid");
  assert.equal(s.coins, coins + sale.amount);
  assert.equal(s.shop.served, 1);
});

test("held baskets stop two shoppers taking the same pumpkin", () => {
  const s = stocked(M.freshState(), [1, 0, 0, 0]);
  const shopper = { budget: 100, basketLimit: 3, preferred: [0] };
  assert.ok(M.chooseBasket(s, shopper, [0, 1, 2, 3], "a", [12, 24, 42, 70]));
  assert.equal(M.chooseBasket(s, shopper, [0, 1, 2, 3], "b", [12, 24, 42, 70]), null);
  M.releaseHold(s, "a");
  assert.ok(M.chooseBasket(s, shopper, [0, 1, 2, 3], "b", [12, 24, 42, 70]));
  assert.equal(M.commitHold(s, "b").amount, 12);
  assert.deepEqual(s.stock, [0, 0, 0, 0]);
});

test("the house: buy, place, move and store decor, within each room's grid and capacity", () => {
  const s = M.freshState();
  assert.equal(M.roomPieces(s, "parlour").length, 2);
  s.coins = 1e5;
  assert.ok(M.buyDecor(s, "f02"));
  assert.ok(!M.buyDecor(s, "f02"), "already owned");
  const sofa = M.placeDecor(s, "f02");
  assert.ok(sofa);
  const piece = s.house.placed.find((p) => p.instance === sofa);
  assert.ok(M.fits(s, "parlour", "f02", piece.x, piece.z, sofa));
  assert.ok(!M.moveDecor(s, sofa, 2, 3), "the armchair is there");
  assert.ok(M.moveDecor(s, sofa, 6, 4));
  assert.ok(!M.moveDecor(s, sofa, 8, 4), "off the edge");
  assert.ok(M.flipDecor(s, sofa));
  assert.ok(M.buyDecor(s, "f15") && M.placeDecor(s, "f15"), "a rug can go under furniture");
  assert.ok(M.buyDecor(s, "d10") && M.placeDecor(s, "d10"), "a portrait goes on the wall");
  assert.equal(s.house.placed.find((p) => p.id === "d10").z, 0);
  for (const id of ["d01", "d02", "d03"]) { M.buyDecor(s, id); M.placeDecor(s, id); }
  assert.equal(M.roomPieces(s, "parlour").length, 6);
  M.buyDecor(s, "d05");
  assert.equal(M.placeDecor(s, "d05"), null, "the little cottage's parlour holds 6");
  assert.ok(M.removeDecor(s, sofa));
  assert.ok(M.placeDecor(s, "d05"));
});

test("a bigger house opens rooms; styles and wallpaper make it more haunted", () => {
  const s = M.freshState();
  s.coins = 1e5;
  assert.ok(!M.roomUnlocked(s, "bedroom"));
  assert.equal(M.roomStyle(s, "parlour").id, "parlour-warm");
  assert.ok(M.upgradeHouse(s));
  assert.ok(M.roomUnlocked(s, "bedroom"));
  assert.equal(M.roomStyle(s, "parlour").id, "parlour-crooked");
  assert.equal(M.roomCapacity(s, "parlour"), 10);
  assert.ok(!M.setRoomStyle(s, "bedroom-celestial"), "not bought");
  assert.ok(M.buyRoomStyle(s, "bedroom-celestial"));
  assert.equal(M.roomStyle(s, "bedroom").id, "bedroom-celestial");
  assert.ok(M.setRoomStyle(s, "bedroom-base"));
  const chair = s.house.placed.find((p) => p.id === "f01").instance;
  assert.ok(M.sendToRoom(s, chair, "bedroom"));
  assert.equal(M.roomPieces(s, "bedroom").length, 1);
  assert.ok(!M.sendToRoom(s, chair, "attic"), "the attic isn't open yet");
  const before = M.spookyScore(s);
  assert.ok(M.buyDecor(s, "w05") && M.applyWallpaper(s, "bedroom", "w05"));
  assert.equal(M.spookyScore(s), before + 4);
  assert.ok(M.placeDecor(s, "f05" ) === null, "not owned");
});

test("books go on shelves, up to each shelf's spaces, and remember the page you were on", () => {
  const s = M.freshState();
  s.coins = 1e5;
  const shelf = s.house.placed.find((p) => p.id === "f11").instance;
  assert.ok(!M.availableBook(s, "b01"), "already on the shelf");
  for (const id of ["b02", "b03", "b04", "b05", "b06", "b07", "b08", "b09"]) { M.buyDecor(s, id); }
  for (const id of ["b02", "b03", "b04", "b05", "b06", "b07", "b08"]) assert.ok(M.shelfBook(s, shelf, id));
  assert.ok(!M.shelfBook(s, shelf, "b09"), "the walnut bookshelf holds 8");
  assert.equal(M.shelvedBooks(s), 8);
  assert.ok(M.unshelfBook(s, shelf, "b02"));
  assert.ok(M.rememberBookPage(s, "b01", 2));
  assert.ok(!M.rememberBookPage(s, "b01", 99));
});

test("costumes from the main game, and recolours on the original outfits", () => {
  const s = M.freshState();
  s.coins = 1000;
  assert.ok(M.buyCostume(s, "natalie-witch"));
  assert.ok(M.wearCostume(s, "natalie-witch"));
  assert.equal(M.activeLook(s, "natalie"), undefined, "no recolour over a costume");
  assert.ok(M.buyLook(s, "shane", "moss"));
  assert.equal(M.activeLook(s, "shane").id, "moss");
});

test("favours pay out once, and memories are noticed as they're made", () => {
  const s = M.freshState();
  s.harvested = 6;
  assert.equal(M.claimable(s).map((f) => f.id).join(), "basket");
  assert.equal(M.claimFavour(s, "basket"), 25);
  assert.equal(M.claimFavour(s, "basket"), 0);
  s.harvested = 5;
  const events = run(s, 0.1);
  assert.ok(events.some((e) => e.type === "memory" && e.id === "first"));
  assert.ok(!run(s, 0.1).some((e) => e.type === "memory"));
});

test("old voxel saves load into the new rules, and new saves round-trip", () => {
  const old = { coins: 500, earned: 900, sold: 30, harvested: 40, taps: 20, plots: Array.from({ length: 12 }, (_, i) => ({ phase: i ? "empty" : "ready", progress: i ? 0 : 1, variety: 1 })), plotLevels: [1, ...Array(11).fill(0)], upgrades: { tools: 2, signs: 3, plots: 1, helper: 1 }, stock: [0, 0, 1, 3], looks: { natalie: "plum", shane: "black", owned: ["olive", "black", "plum"] }, claimed: ["ghost", "bones"] };
  const s = M.restoreState(old);
  assert.deepEqual(s.upgrades, { tools: 2, yield: 0, auto: 1, plots: 1, sign: 3, storage: 0 });
  assert.deepEqual(s.stock, [2, 1, 0, 1]);
  assert.deepEqual(s.claimed, ["basket", "seeds"]);
  assert.equal(s.plotCrops[0], 1);
  assert.equal(s.looks.natalie, "plum");
  s.coins = 5000;
  M.buyDecor(s, "f02"); M.placeDecor(s, "f02"); M.upgradeShop(s, "open");
  const again = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(again.house, s.house);
  assert.equal(again.shop.unlocked, true);
  assert.deepEqual(M.restoreState(null), M.freshState());
});

test("a held key or a bot can't pump the big pumpkin or the streak", () => {
  const s = M.freshState(); M.plant(s, 0);
  M.tap(s); const after = s.plots[0].progress;
  for (let i = 0; i < 30; i++) M.tap(s);                                       // thirty taps in the same instant
  assert.equal(s.plots[0].progress, after); assert.equal(s.taps, 1);
  for (let i = 0; i < 12; i++) M.rewardHarvestStreak(s);                       // Harvest all: twelve picks at once
  assert.equal(s.streak.count, 1, "a burst of picks is one pick");
  s.time += 0.7; M.rewardHarvestStreak(s); assert.equal(s.streak.count, 2);
});

test("a full barn leaves ripe crops safe instead of paying for harvest spam", () => {
 const s=M.freshState();s.stock=[60,0,0,0];s.plots[0]={phase:"ready",progress:1,variety:3};const coins=s.coins;
 assert.equal(M.harvest(s,0),0);assert.equal(s.plots[0].phase,"ready");assert.equal(M.stockCount(s),60);assert.equal(s.coins,coins);assert.equal(s.harvested,0);
 s.coins=1000;assert.ok(M.buyUpgrade(s,"storage"));assert.equal(M.barnCapacity(s),100);assert.equal(M.harvest(s,0),1);assert.equal(M.stockCount(s),61);
 assert.equal(M.restoreState(M.saveData(s)).upgrades.storage,1);
});
