// The guests' carving stand: built at its level, guests carve at free benches
// and pay for the design and extras, upgrades speed it up, saves keep it.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const farm = (lvl = 14) => { const s = M.freshState(); s.coins = 1e6; s.earned = M.LEVELS[lvl - 1].at; s.progression.claimed = M.LEVELS.slice(0, lvl).map((l) => l.level); return s; };

test("the stand opens at its level and costs what it says", () => {
  const early = farm(M.CARVING_STAND.level - 1); assert.equal(M.buildCarvingStand(early), false);
  const s = farm(); const before = s.coins; assert.ok(M.buildCarvingStand(s)); assert.equal(before - s.coins, M.CARVING_STAND.cost);
  assert.equal(M.buildCarvingStand(s), false, "built once");
});

test("guests carve, pay for their design and extras, and never outnumber the benches", () => {
  const s = farm(); M.buildCarvingStand(s); M.buyStandExtra(s, "candle"); M.buyStandDesign(s, "cat");
  let sold = 0, paid = 0, most = 0;
  for (let i = 0; i < 1800; i++) { for (const e of M.update(s, 1)) if (e.type === "carving-sold") { sold++; paid += e.fee; assert.ok(e.fee >= M.STAND_DESIGN_BY_ID.classic.price); } most = Math.max(most, s.carvingStand.carvers.length); }
  assert.ok(sold > 10, `${sold} carved in half an hour`); assert.equal(s.carvingStand.income, paid);
  assert.ok(most <= M.standValue(s, "benches"));
  assert.ok(s.carvingStand.carvers.every((k) => k.design && Number.isFinite(k.fee)));
});

test("benches, tools and the sign make the stand earn more", () => {
  const run = (s) => { let paid = 0; for (let i = 0; i < 1800; i++) for (const e of M.update(s, 1)) if (e.type === "carving-sold") paid += e.fee; return paid; };
  const plain = farm(); M.buildCarvingStand(plain);
  const better = farm(); M.buildCarvingStand(better); for (const id of ["benches", "tools", "sign"]) while (M.buyStandUpgrade(better, id));
  for (const d of M.CARVING_STAND.designs) M.buyStandDesign(better, d.id);
  assert.ok(run(better) > run(plain) * 1.5);
});

test("a stand saves and loads, without the guests at its benches", () => {
  const s = farm(); M.buildCarvingStand(s); M.buyStandUpgrade(s, "benches"); M.buyStandDesign(s, "spooky"); M.buyStandExtra(s, "paint");
  for (let i = 0; i < 300; i++) M.update(s, 1);
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(back.carvingStand.built, true); assert.equal(back.carvingStand.benches, 1);
  assert.deepEqual(back.carvingStand.designs, ["classic", "spooky"]); assert.deepEqual(back.carvingStand.extras, ["paint"]);
  assert.deepEqual(back.carvingStand.carvers, []); assert.equal(back.carvingStand.income, s.carvingStand.income);
  assert.deepEqual(M.restoreState({}).carvingStand, M.freshCarvingStand());
});

test("each sale is tallied by design, and every carver is a guest kind the farm can draw", () => {
  const s = farm(); M.buildCarvingStand(s); for (const d of ["spooky", "cat"]) M.buyStandDesign(s, d);
  const kinds = new Set();
  for (let i = 0; i < 1800; i++) { M.update(s, 1); for (const k of s.carvingStand.carvers) kinds.add(k.kind); }
  const tally = s.carvingStand.tally;
  assert.equal(Object.values(tally).reduce((a, b) => a + b, 0), s.carvingStand.carved);
  assert.ok(Object.keys(tally).every((id) => s.carvingStand.designs.includes(id)));
  assert.ok([...kinds].every((k) => Number.isInteger(k) && k >= 0 && k < 10), [...kinds].join());
  const shares = M.designShares(s); assert.ok(Math.abs(Object.values(shares).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(Object.values(shares).every((x) => x > .15), "every design on the menu draws its share");
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(back.carvingStand.tally, tally);
});

test("a guest's lantern goes whole, open, carved, then lit", () => {
  const stages = [45, 30, 15, 3].map((left) => M.carvingStage({ left, length: 45 }).id);
  assert.deepEqual(stages, ["whole", "open", "carved", "lit"]);
  assert.equal(M.carverProgress({ left: 0, length: 45 }), 1);
});
