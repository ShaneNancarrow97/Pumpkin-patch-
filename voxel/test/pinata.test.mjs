// Piñata pumpkins (handover 67): Piñata seeds make some plantings grow as
// piñatas; picking one stores its pumpkin and bursts with pantry ingredients,
// coins for whatever won't fit, all kept through a save.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const farm = (level = 3) => { const s = M.freshState(); s.pinata.level = level; s.upgrades.plots = 4; return s; };
const ripen = (s, i) => { s.plots[i].phase = "ready"; s.plots[i].progress = 1; s.plots[i].ripe = s.time; };

test("Piñata seeds open by level, cost real coins and stop at their top tier", () => {
  const s = M.freshState(); s.coins = 1e6;
  assert.equal(M.buyPinataSeeds(s, 4), false, "not before level 5");
  for (const [i, at] of M.PINATA.levels.entries()) { assert.equal(M.buyPinataSeeds(s, at), true); assert.equal(s.pinata.level, i + 1); }
  assert.equal(M.pinataUpgrade(s), null); assert.equal(M.buyPinataSeeds(s, 20), false);
  assert.equal(s.coins, 1e6 - M.PINATA.costs.reduce((a, b) => a + b, 0));
});

test("some plantings grow as piñatas, at about the chance bought, and none without seeds", () => {
  const none = farm(0), s = farm(3); let grown = 0, tries = 0;
  for (let round = 0; round < 60; round++) for (let i = 0; i < M.openPlots(s); i++) {
    s.plots[i] = { phase: "empty", progress: 0, variety: 0 }; none.plots[i] = { phase: "empty", progress: 0, variety: 0 };
    s.time += 1.3; s.harvested += 1; none.time = s.time;
    assert.ok(M.plant(s, i)); assert.ok(M.plant(none, i)); tries++;
    if (s.plots[i].pinata) grown++;
    assert.equal(none.plots[i].pinata, undefined);
  }
  const rate = grown / tries; assert.ok(rate > .06 && rate < .24, `${grown} of ${tries}`);
});

test("picking a piñata stores its pumpkin and bursts into the pantry; a full pantry pays coins", () => {
  const s = farm(); s.plots[0] = { phase: "ready", progress: 1, variety: 0, ripe: 0, pinata: true };
  const pantry = () => Object.values(s.kitchen.pantry).reduce((a, b) => a + b, 0), before = pantry(), stock = s.stock[0];
  assert.ok(M.harvest(s, 0) > 0); assert.equal(s.stock[0], stock + M.harvestSize(s), "the pumpkin goes to the barn too");
  const burst = s.pinata.last, given = pantry() - before;
  assert.ok(given >= M.PINATA.burst[0] && given <= M.PINATA.burst[1], `${given} ingredients`);
  assert.equal(Object.values(burst.items).reduce((a, b) => a + b, 0), given); assert.equal(s.pinata.popped, 1); assert.equal(s.plots[0].pinata, undefined);
  // Full pantry: coins instead.
  const full = farm(); for (const id of Object.keys(full.kitchen.pantry)) full.kitchen.pantry[id] = 999;
  full.plots[1] = { phase: "ready", progress: 1, variety: 0, ripe: 0, pinata: true }; const coins = full.coins;
  assert.ok(M.harvest(full, 1) > 0); assert.ok(full.coins > coins); assert.deepEqual(full.pinata.last.items, {});
});

test("a growing piñata and the seeds bought survive a save", () => {
  const s = farm(2); s.plots[3] = { phase: "growing", progress: .5, variety: 1, pinata: true }; s.pinata.popped = 4;
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(back.plots[3].pinata, true); assert.equal(back.pinata.level, 2); assert.equal(back.pinata.popped, 4);
  assert.equal(M.restoreState({ ...M.saveData(s), pinata: { level: 99, popped: -4 } }).pinata.level, M.PINATA.chances.length - 1);
});
