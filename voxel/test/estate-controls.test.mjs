import test from "node:test";
import assert from "node:assert/strict";
import { freshEstate, buyEstateDecor, storeEstateDecor } from "../src/rules/house-estate.js";
import { createEstateControls } from "../src/ui/estate-controls.js";

// Use the real editing controller and pure rules, without a WebGL browser.
function fixture() {
  const listeners = new Map(), previews = [], host = { hidden: true, setAttribute() {}, addEventListener(name, fn) { listeners.set(name, fn); }, querySelector() { return null; } };
  const oldDocument = globalThis.document;
  globalThis.document = { activeElement: null, createElement: () => host, body: { append() {}, classList: { contains: () => false } } };
  const state = { coins: 10000, paused: false, house: { level: 3 }, estate: freshEstate() };
  const ui = { state, scene: { place: { kind: "estate" }, previewEstateDecor: p => previews.push(p), refreshHouseEstate() {} }, save() {}, tone() {}, notice() {} };
  return { state, host, previews, tools: createEstateControls(ui), cleanup() { globalThis.document = oldDocument; } };
}

test("new garden placement consumes one stored copy, and Cancel returns it", () => {
  const f = fixture(); try {
    buyEstateDecor(f.state, "lantern-post"); const coins = f.state.coins, count = f.state.estate.placed.length;
    assert.equal(f.tools.selectForPlacement("lantern-post"), true); assert.equal(f.tools.active, true);
    assert.equal(f.tools.placeAt(0, 0), false); assert.equal(f.state.estate.ownedDecor["lantern-post"], 1);
    assert.equal(f.tools.placeAt(-5, 8), true); assert.equal(f.state.estate.ownedDecor["lantern-post"], 0); assert.equal(f.state.estate.placed.length, count + 1);
    f.tools.cancel(); assert.equal(f.state.estate.ownedDecor["lantern-post"], 1); assert.equal(f.state.estate.placed.length, count);
    assert.equal(f.state.coins, coins); assert.equal(f.tools.active, false); assert.equal(f.previews.at(-1), null);
  } finally { f.cleanup(); }
});

test("Done retains a new piece and removes its selection preview", () => {
  const f = fixture(); try {
    buyEstateDecor(f.state, "stone-urn"); f.tools.selectForPlacement("stone-urn"); assert.equal(f.tools.placeAt(-5, 9), true);
    const instance = f.tools.selected; f.tools.rotate(45); f.tools.done();
    assert.equal(f.state.estate.placed.find(p => p.instance === instance).rotation, 45);
    assert.equal(f.state.estate.ownedDecor["stone-urn"], 0); assert.equal(f.tools.selected, null); assert.equal(f.previews.at(-1), null);
  } finally { f.cleanup(); }
});

test("moving Cancel restores the initial pose, and invalid taps keep the last valid one", () => {
  const f = fixture(); try {
    const piece = f.state.estate.placed.find(p => p.id === "garden-bench"), original = { ...piece };
    f.tools.select(piece.instance); assert.equal(f.tools.placeAt(10, 6), true); assert.equal(f.tools.rotate(30), true);
    const lastValid = { ...piece }; assert.equal(f.tools.placeAt(0, 0), false); assert.deepEqual(piece, lastValid);
    f.tools.cancel(); assert.deepEqual(piece, original); assert.equal(f.tools.active, false);
  } finally { f.cleanup(); }
});

test("paused tools cannot move a piece; removed pieces cannot leave stale selection", () => {
  const f = fixture(); try {
    const piece = f.state.estate.placed.find(p => p.id === "garden-bench"), original = { ...piece };
    f.tools.select(piece.instance); f.state.paused = true; assert.equal(f.tools.placeAt(10, 6), false); assert.deepEqual(piece, original);
    f.state.paused = false; storeEstateDecor(f.state, piece.instance); f.tools.tick();
    assert.equal(f.tools.selected, null); assert.equal(f.previews.at(-1), null);
  } finally { f.cleanup(); }
});
