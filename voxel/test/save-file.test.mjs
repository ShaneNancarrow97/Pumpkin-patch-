// Save files (handover 66): a farm saved to a file loads back the same, older
// files and text backups load, junk is turned away with a reason, and every
// file kept in test/fixtures (one per file and save version, never rewritten)
// still loads in this build.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as M from "../src/model.js";
import { buildSaveFile, readSaveFile, saveFileName, saveSummary, checksum, SAVE_FILE_FORMAT, SAVE_FILE_VERSION } from "../src/save-file.js";

const same = (a, b) => assert.equal(JSON.stringify(M.saveData(a)), JSON.stringify(M.saveData(b)));
function farm() {
  const s = M.freshState(); s.coins = 9000; s.earned = M.LEVELS[4].at; s.house.level = 2;
  M.buyDecor(s, "household-piano"); M.placeDecor(s, "household-piano", "parlour");
  s.stock = s.stock.map((_, i) => (i === 0 ? 7 : 0));
  return M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
}

test("a farm saved to a file loads back the same", () => {
  const s = farm(), prefs = { music: false, voiceEnabled: false, voiceVolume: .45 };
  const file = buildSaveFile(s, { prefs, savedAt: "2026-11-04T10:00:00.000Z" });
  assert.equal(file.format, SAVE_FILE_FORMAT); assert.equal(file.fileVersion, SAVE_FILE_VERSION); assert.equal(file.stateVersion, M.STATE_VERSION);
  assert.deepEqual(file.summary, saveSummary(s));
  const got = readSaveFile(JSON.stringify(file));
  assert.ok(got.ok); same(got.state, s);
  assert.equal(got.savedAt, "2026-11-04T10:00:00.000Z"); assert.deepEqual(got.prefs, prefs);
  assert.equal(got.newer, false); assert.equal(got.edited, false); assert.equal(got.legacy, false);
  assert.equal(got.state.house.placed.length, s.house.placed.length);
  // Pretty-printed, or with a byte-order mark from a text editor, it reads the same.
  assert.ok(readSaveFile("﻿" + JSON.stringify(file, null, 2)).ok);
});

test("an edited file is flagged but loads; a newer one is flagged and loads what it can", () => {
  const file = buildSaveFile(farm());
  const edited = { ...file, state: { ...file.state, coins: 999999 } };
  const got = readSaveFile(JSON.stringify(edited));
  assert.ok(got.ok && got.edited); assert.equal(got.state.coins, 999999);
  const newer = { ...file, fileVersion: SAVE_FILE_VERSION + 1, state: { ...file.state, version: M.STATE_VERSION + 3, somethingNew: { x: 1 } } };
  const later = readSaveFile(JSON.stringify(newer));
  assert.ok(later.ok && later.newer); assert.equal(later.summary.coins, file.summary.coins);
});

test("a text backup from Copy a backup (the bare save) loads too", () => {
  const s = farm(), got = readSaveFile(JSON.stringify(M.saveData(s)));
  assert.ok(got.ok && got.legacy); same(got.state, s); assert.equal(got.savedAt, null); assert.equal(got.prefs, null);
});

test("anything else is turned away with a reason", () => {
  const file = buildSaveFile(farm());
  for (const text of ["", "not json", "[]", "{}", "null", "42", JSON.stringify({ format: SAVE_FILE_FORMAT, state: null }), JSON.stringify({ ...file, state: { ...file.state, plots: [1, 2] } }), JSON.stringify({ plots: "many" })]) {
    const got = readSaveFile(text);
    assert.equal(got.ok, false, text.slice(0, 40)); assert.ok(got.reason.length > 10);
  }
});

test("the checksum notices a single changed character", () => {
  const text = JSON.stringify(buildSaveFile(farm()).state);
  assert.match(checksum(text), /^[0-9a-f]{8}$/);
  assert.notEqual(checksum(text), checksum(text.replace(/"coins":\d/, '"coins":1')));
});

test("a file's name says the level and when", () => {
  assert.equal(saveFileName(farm(), new Date(2026, 10, 4, 9, 5)), `pumpkin-patch-level-${saveSummary(farm()).level}-2026-11-04-0905.json`);
});

// Every save file kept in test/fixtures must load in every later build, with
// its farm intact. Add a file for each new version (tools/save-fixture.mjs);
// never change an old one.
test("every kept save file from an earlier build still loads", () => {
  const dir = new URL("./fixtures/", import.meta.url), files = fs.readdirSync(dir).filter((f) => /^save-file-v\d+-state\d+\.json$/.test(f));
  assert.ok(files.includes("save-file-v1-state16.json"));
  for (const name of files) {
    const text = fs.readFileSync(new URL(name, dir), "utf8"), kept = JSON.parse(text), got = readSaveFile(text);
    assert.ok(got.ok, name); assert.equal(got.edited, false, `${name}: unchanged since it was saved`);
    assert.equal(got.summary.coins, kept.summary.coins, `${name}: coins`);
    assert.equal(got.summary.plots, kept.summary.plots, `${name}: plots`);
    assert.equal(got.summary.houseLevel, kept.summary.houseLevel, `${name}: house level`);
    assert.ok(got.summary.level >= kept.summary.level, `${name}: a reached level is kept`);
    assert.equal(got.state.house.placed.length, kept.state.house.placed.length, `${name}: furniture`);
    assert.equal(got.state.kitchen.purchased, kept.state.kitchen.purchased, `${name}: the food truck`);
    assert.deepEqual(got.state.stock.slice(0, kept.state.stock.length), kept.state.stock, `${name}: stock`);
  }
});
