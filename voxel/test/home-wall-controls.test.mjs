import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import * as M from "../src/model.js";
import { projectWallRay } from "../src/wall-drag.js";

test("wall touch projection follows the visible face, including corners and out-of-bounds previews", () => {
  const room = { w: 10, d: 6 }, origin = { x: 5, y: 4, z: 12 };
  const back = projectWallRay({ origin, direction: { x: 0, y: -.1, z: -1 } }, room);
  assert.deepEqual(back, { wall: "back", x: 5, y: 2.8, z: 0 });
  const left = projectWallRay({ origin, direction: { x: -.5, y: -.2, z: -1 } }, room, "back");
  assert.deepEqual(left, { wall: "left", x: 2, y: 2, z: 0 });
  const right = projectWallRay({ origin, direction: { x: .5, y: -.2, z: -1 } }, room, "left");
  assert.deepEqual(right, { wall: "right", x: 2, y: 2, z: 0 });
  const outside = projectWallRay({ origin, direction: { x: 0, y: 1, z: -1 } }, room, "back");
  assert.equal(outside.y, 16, "do not clamp a bad location into an apparently valid edge");
  assert.equal(projectWallRay({ origin, direction: { x: 0, y: 1, z: 0 } }, room), null);
});

let homeModule;
async function harness() {
  homeModule ??= build({
    entryPoints: [new URL("../src/ui/home-sheets.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", write: false,
    plugins: [{ name: "ui-icon-double", setup(build) { build.onLoad({ filter: /\/ui\/kit\.js$/ }, () => ({ contents: `
      export const money=n=>"£"+Math.floor(n).toLocaleString("en-GB"), $=id=>document.getElementById(id);
      export const decorIcon=(id)=>'<span class="thumb" data-icon="'+id+'"></span>';
      export const segmented=()=>'', spooky=()=>'', plural=(n,s)=>n+' '+s;
    `, loader: "js" })); } }],
  });
  const bundle = await homeModule, classes = new Set(), moves = [], hint = { textContent: "" };
  let writes = 0, saved = 0;
  const bar = { hidden: true, get innerHTML() { return this.html ?? ""; }, set innerHTML(v) { this.html = v; writes++; }, querySelectorAll: () => [], querySelector: q => q === "[data-placement-hint]" ? hint : null };
  const document = { getElementById: () => bar, body: { classList: { add: v => classes.add(v), remove: v => classes.delete(v), toggle(v, on) { if (on) classes.add(v); else classes.delete(v); } } } };
  const sandbox = { module: { exports: {} }, document, structuredClone };
  vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
  const state = M.freshState(); state.coins = 100000; state.house.level = 2;
  state.house.placed = [];
  assert.ok(M.setRoomStyle(state, "parlour-plain-cream"));
  const scene = { place: { kind: "room", id: "parlour" }, selectPiece() {}, showGrid() {}, keepInView() {}, refreshRoom() {}, movePiece(...args) { moves.push(args); }, previewPiece(...args) { moves.push(args); } };
  const ui = { state, scene, closeSheet() {}, save() { saved++; }, notice() {}, draw() {}, tone() {} };
  const home = sandbox.module.exports.homeSheets(ui);
  return { ...home, state, moves, bar, hint, classes, get writes() { return writes; }, get saved() { return saved; } };
}
const json = value => JSON.parse(JSON.stringify(value));
const placed = h => h.state.house.placed.find(p => p.instance === h.tools.selected);
async function wallFixture() {
  const h = await harness(); assert.ok(M.buyDecor(h.state, "household-towel-rail"));
  const instance = M.placeDecor(h.state, "household-towel-rail", "parlour");
  assert.ok(M.moveWallDecor(h.state, instance, "back", 4, .3));
  h.tools.select(instance); return h;
}

test("wall drag previews height and a new face without mutating the save or rebuilding the toolbar", async () => {
  const h = await wallFixture(), p = placed(h), before = json(p), writes = h.writes;
  assert.equal(h.tools.beginDrag({ wall: "back", x: 4.23, y: .54, z: 0 }), true);
  assert.equal(h.tools.dragTo({ wall: "left", x: .73, y: 4.04, z: 0 }), true);
  assert.deepEqual(json(p), before, "transient previews cannot mutate placed data");
  assert.equal(h.writes, writes, "touch moves preserve DOM and pointer focus");
  assert.deepEqual(json(h.moves.at(-1)[1]), { ...before, wall: "left", x: .5, y: 3.8, z: 0 });
  assert.equal(h.tools.endDrag(), true);
  assert.deepEqual({ x: p.x, y: p.y, wall: p.wall }, { x: .5, y: 3.8, wall: "left" });
  assert.equal(h.saved, 1, "one gesture writes one saved placement");
  h.tools.act("undo");
  assert.deepEqual(json(p), before, "Undo restores wall, height and horizontal position together");
});

test("a wall drag pins to the wall's end, waits at the last clear spot by a door, cancels back, and nudges change height", async () => {
  const h = await wallFixture(), p = placed(h), before = json(p);
  h.tools.beginDrag({ wall: "back", x: 4.1, y: .5, z: 0 });
  // Past the wall's end the rail is pinned there, not refused.
  assert.equal(h.tools.dragTo({ wall: "back", x: -2, y: .5, z: 0 }), true);
  assert.deepEqual(json(h.moves.at(-1)[1]), { ...before, wall: "back", x: .05, y: .3, z: 0 });
  assert.equal(h.tools.endDrag(true), false); assert.deepEqual(json(p), before, "a cancelled drag puts it back"); assert.equal(h.saved, 0);
  // Into the middle of the doorway, with no clear wall within reach: it waits where it was, and a red outline shows the finger.
  h.tools.beginDrag({ wall: "back", x: 4.1, y: .5, z: 0 });
  assert.equal(h.tools.dragTo({ wall: "left", x: 2.5, y: 1.2, z: 0 }), false);
  const ghost = h.moves.findLast(m => m.length === 5);
  assert.equal(ghost[3], false, "the finger's spot shows red");
  assert.deepEqual(json(h.moves.at(-1)[1]), before, "the piece itself stays at the last clear spot");
  assert.match(h.hint.textContent, /No room there/);
  // On along the wall to a clear spot, then back into the door: it waits at that clear spot, and that's where it goes.
  assert.equal(h.tools.dragTo({ wall: "left", x: .6, y: 1.2, z: 0 }), true);
  assert.equal(h.tools.dragTo({ wall: "left", x: 2.5, y: 1.2, z: 0 }), false);
  assert.equal(h.tools.endDrag(), true);
  assert.deepEqual({ wall: p.wall, x: p.x, y: p.y }, { wall: "left", x: .5, y: 1 });
  assert.equal(h.saved, 1);
  h.tools.act("undo"); assert.deepEqual(json(p), before);
  h.tools.nudge(0, -1); assert.equal(p.y, .4); assert.equal(p.x, 4);
  h.tools.nudge(0, 1); assert.equal(p.y, .3);
  assert.ok(h.bar.innerHTML.includes("Raise on wall 0.1") === false, "nudge row stays hidden until Move is opened");
});

test("wall arrows run on round the back corners, and the turn buttons carry a wall piece to the next wall", async () => {
  const h = await wallFixture(), p = placed(h);
  assert.ok(M.moveWallDecor(h.state, p.instance, "back", .15, 1));
  h.tools.nudge(-1, 0); assert.deepEqual({ wall: p.wall, x: p.x }, { wall: "back", x: .05 });
  h.tools.nudge(-1, 0); assert.deepEqual({ wall: p.wall, x: p.x, y: p.y }, { wall: "left", x: .05, y: 1 }, "left past the back wall's end goes round onto the left wall, by the corner");
  h.tools.nudge(-1, 0); assert.equal(p.x, .15, "on the left wall, left runs towards the front");
  h.tools.nudge(1, 0); h.tools.nudge(1, 0); assert.deepEqual({ wall: p.wall, x: p.x }, { wall: "back", x: .05 }, "and right runs back round the corner");
  assert.equal(h.tools.rotate(15), true); assert.equal(p.wall, "right", "the turn buttons hang it on the next wall round");
  assert.ok(p.x >= 5 - 1e-9, "on the right wall it clears the stairs");
  assert.equal(h.tools.rotate(15), false, "the right wall is as far round as it goes");
  assert.equal(h.tools.rotate(-15), true); assert.equal(p.wall, "back");
});

test("the catalogue exposes per-copy selection and the optional bathroom gate", async () => {
  const h = await harness();
  for (let i = 0; i < 2; i++) { assert.ok(M.buyDecor(h.state, "household-cream-mug")); assert.ok(M.placeDecor(h.state, "household-cream-mug")); }
  h.home.setTab("decorate"); const cat = h.home.body();
  assert.ok(cat.includes("Little treasures")); assert.ok(cat.includes("Electronics"));
  assert.ok(cat.includes("+1 · £25"), "furniture remains purchasable when all existing copies are placed");
  const pickButton = { dataset: { pick: "household-cream-mug" }, addEventListener() {} }, strip = { innerHTML: "", querySelectorAll: () => [] };
  const catalogueBody = { querySelectorAll: q => q === "[data-pick]" ? [pickButton] : [], querySelector: q => q === ".build-detail" ? strip : null };
  h.home.bind(catalogueBody); pickButton.onclick();
  for (const p of h.state.house.placed) assert.ok(strip.innerHTML.includes(`data-id="${p.instance}"`), "each placed copy has its own selection target");
  assert.ok(strip.innerHTML.includes("2 owned · 0 in storage"));
  h.home.setTab("rooms"); const rooms = h.home.body();
  assert.ok(rooms.includes('data-room-extension="bathroom"'));
  assert.ok(rooms.includes("£4,500")); assert.ok(rooms.includes("Moonmilk plaster"));
  assert.ok(rooms.includes("Full-height walls"));
});
