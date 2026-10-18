import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeSave, fresh, serialize } from "../src/core/model.mjs";
import { SAVE_SCHEMA, repairSave } from "../src/core/save-repair.mjs";
import { makeBackup, readBackupWithRepairs } from "../src/core/save-model.mjs";
import { createPersistence } from "../src/platform/storage.js";
import { stockQuantity } from "../src/core/inventory.js";

const KEY = "sn-pumpkin-patch-halloween-v2";
const good = () => JSON.parse(fs.readFileSync(new URL("fixtures/save-v9-midnight-2.10.json", import.meta.url), "utf8"));
const memoryStorage = (items = {}) => ({
  items,
  getItem: (k) => (k in items ? items[k] : null),
  setItem: (k, v) => { items[k] = String(v); },
});
// A mid-game patch with a shop, a bigger house and an outfit.
const richSave = () => {
  const s = decodeSave(JSON.stringify(good()));
  s.coins = 5000;
  s.shop.unlocked = true;
  s.shop.capacityLevel = 2;
  s.shop.invested = 4700;
  s.upgrades.tools = 3;
  s.house.owned.push("f02", "d01");
  return JSON.parse(serialize(s));
};

test("an intact save needs no repairs", () => {
  const result = repairSave(JSON.stringify(good()));
  assert.deepEqual(result.repairs, []);
  assert.equal(result.state.coins, good().coins);
});

test("a bad coin balance resets only the coins", () => {
  const x = richSave();
  x.coins = "lots";
  const { state, repairs } = repairSave(JSON.stringify(x));
  assert.deepEqual(repairs, ["coins"]);
  assert.equal(state.coins, fresh().coins);
  assert.equal(state.upgrades.tools, 3);
  assert.equal(state.shop.capacityLevel, 2);
});

test("a damaged house keeps every purchase", () => {
  const x = richSave();
  x.house.level = 99;
  x.house.roomStyles = "broken";
  const { state, repairs } = repairSave(JSON.stringify(x));
  assert.deepEqual(repairs, ["house"]);
  for (const id of ["f02", "d01"]) assert.ok(state.house.owned.includes(id), id);
  assert.equal(state.coins, 5000);
});

test("a damaged shop keeps its paid upgrades", () => {
  const x = richSave();
  x.shop.customers = "nope";
  const { state, repairs } = repairSave(JSON.stringify(x));
  assert.deepEqual(repairs, ["Skyla's shop"]);
  assert.equal(state.shop.unlocked, true);
  assert.equal(state.shop.capacityLevel, 2);
  assert.equal(state.shop.invested, 4700);
});

test("one bad stock lot does not lose the others", () => {
  const x = richSave();
  const before = stockQuantity(x.inventory);
  assert.ok(x.inventory.lots.length >= 1);
  x.inventory.lots.push({ id: "lot-x", productId: "pumpkin-banana", locationId: "barn", quantity: 4, unitPrice: 12 });
  const { state, repairs } = repairSave(JSON.stringify(x));
  assert.deepEqual(repairs, ["stored pumpkins"]);
  assert.equal(stockQuantity(state.inventory), before);
});

test("bad plots, upgrades, wardrobe and stall are each mended", () => {
  const x = richSave();
  x.plots[2] = { phase: "exploded" };
  x.upgrades.yield = 42;
  x.wardrobe = { owned: "everything" };
  x.stall = { version: 1, income: -3 };
  x.plotCrops[0] = "pumpkin-starlight";
  const { state, repairs } = repairSave(JSON.stringify(x));
  assert.deepEqual(new Set(repairs), new Set(["plots", "farm upgrades", "outfits", "roadside stall", "crop choices"]));
  assert.equal(state.plots[2].phase, "empty");
  assert.equal(state.upgrades.yield, 5, "clamped to the maximum");
  assert.equal(state.coins, 5000);
  assert.ok(decodeSave(serialize(state)), "the mended save passes strict checks");
});

test("unreadable and newer saves are not guessed at", () => {
  assert.equal(repairSave("{nope"), null);
  assert.equal(repairSave("[]"), null);
  assert.equal(repairSave(JSON.stringify({ ...good(), version: 13 })), null);
});

test("a repaired stored save loads, saves, and keeps the original", () => {
  const x = richSave();
  x.coins = null;
  const original = JSON.stringify(x);
  const storage = memoryStorage({ [KEY]: original });
  const p = createPersistence(storage);
  const s = p.load();
  assert.deepEqual(p.repairs, ["coins"]);
  assert.equal(s.shop.capacityLevel, 2);
  assert.equal(p.save(s).ok, true);
  assert.equal(storage.items[KEY + "-before-repair"], original);
  assert.equal(p.retainedSave, original);
});

test("a save from a newer game is kept untouched", () => {
  const raw = JSON.stringify({ ...good(), version: 13 });
  const storage = memoryStorage({ [KEY]: raw });
  const p = createPersistence(storage);
  assert.equal(p.load().coins, 30);
  assert.equal(p.newerSchema, 13);
  const result = p.save(fresh());
  assert.equal(result.ok, false);
  assert.match(result.reason, /newer version/);
  assert.equal(storage.items[KEY], raw);
});

test("three snapshots are kept at least ten minutes apart", () => {
  let clock = 1_000_000;
  const storage = memoryStorage();
  const p = createPersistence(storage, () => clock);
  const s = fresh();
  for (const minutes of [0, 5, 11, 15, 25, 40]) {
    clock = 1_000_000 + minutes * 60_000;
    s.coins = 100 + minutes;
    assert.equal(p.save(s).ok, true);
  }
  const snaps = p.snapshots;
  assert.equal(snaps.length, 3);
  assert.deepEqual(snaps.map((x) => JSON.parse(x.raw).coins), [140, 125, 111]);
});

test("the last backup time is remembered", () => {
  let clock = 5_000;
  const p = createPersistence(memoryStorage(), () => clock);
  assert.equal(p.lastBackup, null);
  p.markBackup();
  assert.equal(p.lastBackup, 5_000);
});

test("backups carry the game version and report repairs on import", () => {
  const backup = JSON.parse(makeBackup(fresh(), "3.0.0"));
  assert.equal(backup.gameVersion, "3.0.0");
  backup.state.coins = -1;
  const { state, repairs } = readBackupWithRepairs(JSON.stringify(backup));
  assert.deepEqual(repairs, ["coins"]);
  assert.equal(state.coins, 30);
  assert.throws(() => readBackupWithRepairs(JSON.stringify({ ...backup, state: { ...backup.state, version: SAVE_SCHEMA + 4 } })), /newer version/);
});
