import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeSave, fresh, serialize } from "../src/core/model.mjs";
import { makeBackup, readBackup } from "../src/core/save-model.mjs";
import { createPersistence } from "../src/platform/storage.js";
import { stockQuantity } from "../src/core/inventory.js";

const fixture = (name) => fs.readFileSync(new URL("fixtures/" + name, import.meta.url), "utf8");
const memoryStorage = (items = {}) => ({
  items,
  getItem: (k) => (k in items ? items[k] : null),
  setItem: (k, v) => { items[k] = String(v); },
});
const CURRENT = fresh().version;

test("a fresh save round-trips", () => {
  const s = fresh();
  s.coins = 1234;
  const back = decodeSave(serialize(s));
  assert.equal(back.coins, 1234);
  assert.equal(back.version, CURRENT);
});

for (const name of ["save-v7-midnight-2.8.json", "save-v9-midnight-2.10.json"]) {
  test(`real save ${name} loads without losing progress`, () => {
    const raw = fixture(name);
    const original = JSON.parse(raw);
    const s = decodeSave(raw);
    assert.ok(s, "save decodes");
    assert.equal(s.version, CURRENT);
    for (const key of ["coins", "earned", "sold", "harvested", "clicks"]) assert.equal(s[key], original[key], key);
    assert.deepEqual(s.upgrades, original.upgrades);
    assert.equal(stockQuantity(s.inventory), stockQuantity(original.inventory));
    // and survives another save/load cycle
    assert.equal(decodeSave(serialize(s)).coins, original.coins);
  });
}

test("damaged saves are rejected rather than half-loaded", () => {
  const good = JSON.parse(fixture("save-v9-midnight-2.10.json"));
  assert.equal(decodeSave("not json"), null);
  assert.equal(decodeSave("{}"), null);
  assert.equal(decodeSave(JSON.stringify({ ...good, coins: -5 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...good, plots: good.plots.slice(1) })), null);
  assert.equal(decodeSave(JSON.stringify({ ...good, version: CURRENT + 1 })), null, "future saves are not guessed at");
});

test("backups round-trip and explain bad files", () => {
  const s = fresh();
  s.coins = 777;
  assert.equal(readBackup(makeBackup(s)).coins, 777);
  assert.throws(() => readBackup("{"), /not a readable/);
  assert.throws(() => readBackup(JSON.stringify({ format: "pumpkin-patch-backup", revision: 99 })), /unsupported/);
  assert.throws(() => readBackup(JSON.stringify({ coins: 1 })), /incomplete/);
});

test("an unreadable stored save is kept, not overwritten", () => {
  const storage = memoryStorage({ "sn-pumpkin-patch-halloween-v2": "{broken" });
  const persistence = createPersistence(storage);
  const s = persistence.load();
  assert.equal(s.coins, 30, "falls back to a fresh patch");
  assert.equal(persistence.save(s).ok, false);
  assert.equal(storage.items["sn-pumpkin-patch-halloween-v2"], "{broken");
  assert.equal(persistence.retainedSave, "{broken");
});

test("older saves are retained once before upgrading", () => {
  const old = fixture("save-v7-midnight-2.8.json");
  const storage = memoryStorage({ "sn-pumpkin-patch-halloween-v2": old });
  const persistence = createPersistence(storage);
  const s = persistence.load();
  assert.equal(persistence.save(s).ok, true);
  assert.ok(Object.values(storage.items).includes(old), "pre-upgrade copy kept");
  assert.equal(JSON.parse(storage.items["sn-pumpkin-patch-halloween-v2"]).version, CURRENT);
});
