import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import * as F from "../src/rules/farm-work.js";
import { waterPlot, wateringStatus } from "../src/rules/hands-on.js";

const fresh = () => { const s = M.freshState(); s.farmWork = F.freshFarmWork(); s.coins = 1e6; s.visitorTimer = s.shop.arrivalTimer = 1e9; return s; };
const allLevels = s => { s.progression.claimed = M.LEVELS.map(l => l.level); return s; };
const eventsAfter = (s, dt) => { const events = []; s.time += dt; F.updateHelpers(s, dt, events); return events; };
const ready = (s, indices = [0, 1, 2, 3, 4, 5]) => { for (const i of indices) s.plots[i] = { phase: "ready", progress: 1, variety: 0, ripe: s.time - M.HELPER_WAIT }; };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≈ ${b}`);

test("one helper is a separate paid hire; their skills and prices are independent", () => {
  const s = fresh(), cash = s.coins;
  assert.equal(F.buyHelperUpgrade(s, "shane", "water"), false, "skills require that owner's hire");
  assert.ok(F.buyHelperUpgrade(s, "shane", "hire"));
  assert.equal(s.coins, cash - 250); assert.equal(s.upgrades.auto, 1);
  assert.equal(F.helperStatus(s, "natalie").hired, false);
  assert.equal(F.buyHelperUpgrade(s, "shane", "hire"), false);
  assert.ok(F.buyHelperUpgrade(s, "shane", "plant"));
  near(F.helperStatus(s, "shane").plantSeconds, 1.92);
  assert.equal(F.helperStatus(s, "natalie").plantSeconds, 2.4);
  assert.equal(F.helperUpgradeInfo(s, "shane", "plant").requiredLevel, 5);
  assert.equal(F.buyHelperUpgrade(s, "shane", "plant"), false, "the second skill waits for level5");
  assert.equal(F.buyHelperUpgrade(s, "shane", "capacity"), false);
  allLevels(s);
  assert.ok(F.buyHelperUpgrade(s, "shane", "capacity")); assert.equal(F.helperStatus(s, "shane").capacity, 2);
  assert.ok(F.buyHelperUpgrade(s, "shane", "capacity")); assert.equal(F.helperStatus(s, "shane").capacity, 3);
  assert.equal(F.buyHelperUpgrade(s, "shane", "capacity"), false);
  assert.equal(F.helperStatus(s, "natalie").capacity, 1);
  s.paused = true; const pauseCash = s.coins;
  assert.equal(F.buyHelperUpgrade(s, "natalie", "hire"), false); assert.equal(s.coins, pauseCash);
  assert.equal(F.helperUpgradeInfo(s, "nobody", "hire"), null);
  assert.equal(F.buyHelperUpgrade(s, "shane", "unknown"), false);
});

test("old shared auto purchase grants both once, while separate saved hires remain separate", () => {
  const s = fresh(); s.upgrades.auto = 1;
  const legacy = F.restoreFarmWork(undefined, s);
  assert.equal(legacy.helpers.shane.hired, true); assert.equal(legacy.helpers.natalie.hired, true);
  assert.equal(legacy.boost.heat, 0);
  const separate = F.freshFarmWork(); separate.helpers.shane.hired = true; separate.helpers.shane.plant = 2;
  const loaded = F.restoreFarmWork(JSON.parse(JSON.stringify(separate)), s);
  assert.equal(loaded.helpers.shane.hired, true); assert.equal(loaded.helpers.shane.plant, 2);
  assert.equal(loaded.helpers.natalie.hired, false);
  const bundle = fresh(); assert.ok(M.buyUpgrade(bundle, "auto"));
  assert.equal(bundle.coins, 1e6 - 500); assert.equal(F.helperStatus(bundle, "shane").hired, true); assert.equal(F.helperStatus(bundle, "natalie").hired, true);
});

test("helper turns sow a single plot and faster planting changes real throughput", () => {
  const base = fresh(); F.buyHelperUpgrade(base, "shane", "hire");
  assert.deepEqual(eventsAfter(base, 2.39), []);
  assert.deepEqual(eventsAfter(base, .01), [{ type: "plant", owner: "shane", plot: 0 }]);
  assert.equal(base.plots.filter(p => p.phase === "growing").length, 1);
  const fast = fresh(); F.buyHelperUpgrade(fast, "shane", "hire"); F.buyHelperUpgrade(fast, "shane", "plant");
  assert.equal(eventsAfter(fast, 1.92)[0]?.type, "plant");
  assert.equal(fast.plots.filter(p => p.phase === "growing").length, 1);
  assert.equal(eventsAfter(fast, 999).length, 1, "large catch-up never sweeps the field");
  const both = fresh(); M.buyUpgrade(both, "auto");
  assert.deepEqual(eventsAfter(both, 2.4).map(e => [e.owner, e.plot]), [["shane", 0], ["natalie", 1]]);
});

test("picking capacity is ripe plots per turn and shares the real storage/yield rules", () => {
  const s = allLevels(fresh()); F.buyHelperUpgrade(s, "shane", "hire");
  F.buyHelperUpgrade(s, "shane", "capacity"); F.buyHelperUpgrade(s, "shane", "capacity");
  ready(s); s.upgrades.yield = 2;
  const events = eventsAfter(s, 2);
  assert.equal(events.length, 3); assert.ok(events.every(e => e.type === "harvest" && e.owner === "shane" && e.count === 3));
  assert.equal(s.harvested, 9); assert.equal(M.stockCount(s), 9);
  assert.equal(s.plots.filter(p => p.phase === "ready").length, 3);
  assert.equal(s.streak.count, 0); assert.equal(M.visitorBonus(s), 0);
  const partial = allLevels(fresh()); F.buyHelperUpgrade(partial, "shane", "hire");
  F.buyHelperUpgrade(partial, "shane", "capacity"); F.buyHelperUpgrade(partial, "shane", "capacity");
  ready(partial); partial.upgrades.yield = 1;
  partial.stock[0] = M.barnCapacity(partial) - 3;
  assert.equal(eventsAfter(partial, 2).filter(e => e.type === "harvest").length, 1);
  assert.equal(M.stockCount(partial), M.barnCapacity(partial) - 1);
  assert.equal(partial.plots.filter(p => p.phase === "ready").length, 5);
});

test("helpers leave the grace period, rest during play mode and never pick a full barn", () => {
  const s = fresh(); F.buyHelperUpgrade(s, "shane", "hire"); ready(s);
  for (const p of s.plots.slice(0, 6)) p.ripe = s.time;
  assert.equal(eventsAfter(s, 2).length, 0);
  s.handsOn = true; const before = JSON.stringify(s.farmWork.helpers);
  assert.deepEqual(eventsAfter(s, 30), []); assert.equal(JSON.stringify(s.farmWork.helpers), before);
  s.handsOn = false; assert.equal(eventsAfter(s, 2)[0].type, "harvest");
  const full = fresh(); F.buyHelperUpgrade(full, "shane", "hire"); ready(full);
  full.stock[0] = M.barnCapacity(full); const cash = full.coins;
  assert.deepEqual(eventsAfter(full, 10), []); assert.equal(full.harvested, 0); assert.equal(full.coins, cash);
  assert.equal(full.plots[0].phase, "ready");
});

test("helper watering respects the shared cooldown and prioritises planting and ripe crops", () => {
  const s = fresh(); F.buyHelperUpgrade(s, "natalie", "hire");
  for (let i = 0; i < M.openPlots(s); i++) M.plant(s, i);
  const before = s.coins;
  assert.deepEqual(eventsAfter(s, 3), [{ type: "water", owner: "natalie", plot: 0 }]);
  near(s.plots[0].progress, .12); assert.equal(s.coins, before);
  assert.equal(wateringStatus(s, 0).available, false); assert.equal(waterPlot(s, 0), false);
  M.harvest(s, 1); s.plots[1] = { phase: "empty", progress: 0, variety: 0 };
  assert.deepEqual(eventsAfter(s, 2.4), [{ type: "plant", owner: "natalie", plot: 1 }]);
  s.plots[4] = { phase: "ready", progress: 1, variety: 0, ripe: s.time - 9 };
  assert.equal(eventsAfter(s, 2)[0]?.type, "harvest");
});

test("partial helper work belongs to the actual crop and cannot jump to a new target", () => {
  const s = fresh(); F.buyHelperUpgrade(s, "shane", "hire");
  for (let i = 0; i < M.openPlots(s); i++) M.plant(s, i);
  assert.deepEqual(eventsAfter(s, 2.9), []);
  assert.ok(waterPlot(s, 0), "the player finishes the original watering job");
  assert.deepEqual(eventsAfter(s, .1), []); near(s.plots[1].progress, 0);
  assert.deepEqual(eventsAfter(s, 2.9), [{ type: "water", owner: "shane", plot: 1 }]);
  const replaced = fresh(); F.buyHelperUpgrade(replaced, "shane", "hire");
  assert.deepEqual(eventsAfter(replaced, 2.3), []);
  replaced.plots[0] = { phase: "empty", progress: 0, variety: 0 };
  assert.deepEqual(eventsAfter(replaced, .1), [], "even an identical-looking replacement is a new job");
  assert.deepEqual(eventsAfter(replaced, 2.3), [{ type: "plant", owner: "shane", plot: 0 }]);
});

test("both helpers reserve distinct jobs and a larger basket preserves the other reservation", () => {
  const s = fresh(); M.buyUpgrade(s, "auto");
  for (let i = 0; i < M.openPlots(s); i++) M.plant(s, i);
  assert.deepEqual(eventsAfter(s, 2.9), []);
  const both = eventsAfter(s, .1);
  assert.deepEqual(both.map(e => [e.owner, e.plot]), [["shane", 0], ["natalie", 1]]);
  near(s.plots[0].progress, .12); near(s.plots[1].progress, .12);
  const baskets = allLevels(fresh()); M.buyUpgrade(baskets, "auto"); ready(baskets);
  F.buyHelperUpgrade(baskets, "shane", "capacity"); F.buyHelperUpgrade(baskets, "shane", "capacity");
  assert.deepEqual(eventsAfter(baskets, 1.9), []);
  const picked = eventsAfter(baskets, .1);
  assert.deepEqual(picked.filter(e => e.owner === "shane").map(e => e.plot), [0, 2, 3]);
  assert.deepEqual(picked.filter(e => e.owner === "natalie").map(e => e.plot), [1]);
  const partial = fresh(); F.buyHelperUpgrade(partial, "shane", "hire");
  eventsAfter(partial, 2.3);
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(partial))));
  assert.equal(loaded.farmWork.helpers.shane.timer, 0);
  assert.deepEqual(eventsAfter(loaded, .1), [], "reload restarts a partial job without crop identity");
});

test("boost heat rejects repeated and overheated taps without growth, rewards or tap count", () => {
  const s = fresh(); M.plant(s, 0);
  const one = M.tap(s); assert.equal(one.accepted, true); assert.equal(one.boost, true);
  near(F.boostStatus(s).heat, 10); const progress = s.plots[0].progress;
  assert.equal(M.tap(s).reason, "cooldown"); near(F.boostStatus(s).heat, 10); near(s.plots[0].progress, progress); assert.equal(s.taps, 1);
  for (let i = 0; i < 9; i++) { s.time += .2; assert.equal(M.tap(s).accepted, true); }
  assert.equal(F.boostStatus(s).heat, 100); assert.equal(F.boostStatus(s).overheated, true);
  const snapshot = JSON.stringify({ plots: s.plots, taps: s.taps, stock: s.stock, coins: s.coins, farmWork: s.farmWork });
  s.time += 1; assert.equal(M.tap(s).reason, "overheated");
  assert.equal(JSON.stringify({ plots: s.plots, taps: s.taps, stock: s.stock, coins: s.coins, farmWork: s.farmWork }), snapshot);
  F.updateBoost(s, 8); near(F.boostStatus(s).heat, 36); assert.equal(F.boostStatus(s).overheated, true);
  F.updateBoost(s, .125); near(F.boostStatus(s).heat, 35); assert.equal(F.boostStatus(s).overheated, false);
  s.time += .2; assert.equal(M.tap(s).accepted, true);
});

test("cooling and power upgrades are paid, level gated and change bounded boost effects", () => {
  const base = fresh(), improved = fresh(); M.plant(base, 0); M.plant(improved, 0);
  const cash = improved.coins; assert.ok(F.buyBoostUpgrade(improved, "power")); assert.ok(F.buyBoostUpgrade(improved, "cooling"));
  assert.equal(improved.coins, cash - 270); assert.equal(F.boostUpgradeInfo(improved, "power").requiredLevel, 5);
  assert.equal(F.buyBoostUpgrade(improved, "power"), false);
  M.tap(base); M.tap(improved); near(improved.plots[0].progress / base.plots[0].progress, 1.25);
  near(F.boostStatus(improved).heat, 9); near(F.boostStatus(improved).coolPerSecond, 10);
  const before = JSON.stringify(improved.farmWork); improved.paused = true;
  assert.equal(M.tap(improved).reason, "paused"); assert.equal(F.buyBoostUpgrade(improved, "cooling"), false);
  F.updateBoost(improved, 999); assert.equal(JSON.stringify(improved.farmWork), before);
  improved.paused = false; allLevels(improved);
  for (let i = 0; i < 2; i++) { assert.ok(F.buyBoostUpgrade(improved, "power")); assert.ok(F.buyBoostUpgrade(improved, "cooling")); }
  assert.equal(F.buyBoostUpgrade(improved, "power"), false); assert.equal(F.buyBoostUpgrade(improved, "cooling"), false);
  const status = F.boostStatus(improved); near(status.strength, 1.75); near(status.heatPerUse, 7); near(status.coolPerSecond, 16);
});

test("saved heat, hysteresis, skill ownership and tap cadence survive bounded restoration", () => {
  const s = allLevels(fresh()); F.buyHelperUpgrade(s, "shane", "hire"); F.buyHelperUpgrade(s, "shane", "plant");
  s.time = 40; s.farmWork.boost.heat = 82; s.farmWork.boost.overheated = true; s.farmWork.boost.lastUse = 40;
  const raw = JSON.parse(JSON.stringify(s.farmWork)), loaded = { ...s, farmWork: F.restoreFarmWork(raw, s) };
  assert.equal(F.boostStatus(loaded).heat, 82); assert.equal(F.boostStatus(loaded).overheated, true);
  assert.equal(F.helperStatus(loaded, "shane").plantLevel, 1); assert.equal(F.helperStatus(loaded, "natalie").hired, false);
  assert.equal(M.tap(loaded).reason, "overheated");
  raw.boost.overheated = false; raw.boost.heat = 20; loaded.farmWork = F.restoreFarmWork(raw, s);
  assert.equal(M.tap(loaded).reason, "cooldown");
  const junk = F.restoreFarmWork({ boost: { power: 99, cooling: -1, heat: Infinity, lastUse: 1e99 }, helpers: { shane: { hired: true, plant: 99, water: 99, capacity: 99, timer: Infinity, kind: "plant", cursor: 1e9 } } }, s);
  assert.equal(junk.boost.power, 3); assert.equal(junk.boost.cooling, 0); assert.equal(junk.boost.heat, 0); assert.equal(junk.boost.lastUse, s.time);
  assert.equal(junk.helpers.shane.plant, 3); assert.equal(junk.helpers.shane.capacity, 2); assert.equal(junk.helpers.shane.timer, 0);
  assert.ok(junk.helpers.shane.cursor < s.plots.length);
});

test("the public save migration keeps legacy hires and a new single-owner hot candle", () => {
  const old = fresh(); old.upgrades.auto = 1;
  const rawOld = JSON.parse(JSON.stringify(M.saveData(old))); rawOld.version = 14; delete rawOld.farmWork;
  const migrated = M.restoreState(rawOld);
  assert.equal(migrated.version, M.STATE_VERSION); assert.ok(F.helperStatus(migrated, "shane").hired); assert.ok(F.helperStatus(migrated, "natalie").hired);
  const one = fresh(); F.buyHelperUpgrade(one, "natalie", "hire"); F.buyHelperUpgrade(one, "natalie", "water");
  one.time = 12; one.farmWork.boost.heat = 90; one.farmWork.boost.overheated = true;
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(one))));
  assert.equal(F.helperStatus(loaded, "shane").hired, false); assert.equal(F.helperStatus(loaded, "natalie").waterLevel, 1);
  assert.equal(F.boostStatus(loaded).heat, 90); assert.equal(M.tap(loaded).reason, "overheated");
});

test("eighth accepted tap still grants exactly one real pumpkin within barn capacity", () => {
  const s = fresh();
  for (let i = 0; i < 8; i++) { if (i) s.time += .2; M.tap(s); }
  assert.equal(M.stockCount(s), 1); assert.equal(s.harvested, 1); assert.equal(s.taps, 8);
  const full = fresh(); full.stock[0] = M.barnCapacity(full); const cash = full.coins;
  for (let i = 0; i < 8; i++) { if (i) full.time += .2; M.tap(full); }
  assert.equal(M.stockCount(full), M.barnCapacity(full)); assert.equal(full.harvested, 0); assert.equal(full.coins, cash);
});
