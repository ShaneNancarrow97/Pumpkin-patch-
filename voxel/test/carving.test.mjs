import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const bench = () => {
  const s = M.freshState(); s.coins = 5000; s.stock = [3, 1, 0, 0, 0];
  assert.ok(M.buyEstateDecor(s, "carving-bench")); assert.ok(M.placeEstateDecor(s, "carving-bench", 11, -6));
  return s;
};
// A pumpkin from the barn, its lid off and its pulp out, ready for a stencil.
const opened = (s, variety = 0) => { assert.ok(M.startCarving(s, variety)); assert.ok(M.cutLid(s)); assert.ok(M.finishScoop(s)); return s.carving.current; };
const carveAll = (s) => { for (const p of M.STENCIL_BY_ID[s.carving.current.stencil].pieces) (M.pieceKind(p) === "etch" ? M.etchPiece : M.cutPiece)(s, p.id); };

test("carving needs a bench and a pumpkin from the barn, and leaving before the lid is cut gives it back", () => {
  const none = M.freshState(); none.stock = [3, 0, 0, 0, 0];
  assert.equal(M.startCarving(none, 0), false, "no bench");
  const s = bench();
  assert.equal(M.startCarving(s, 2), false, "no witchfire in the barn");
  assert.ok(M.startCarving(s, 0)); assert.equal(s.stock[0], 2);
  assert.equal(M.startCarving(s, 0), false, "one at a time");
  assert.ok(M.cancelCarving(s)); assert.equal(s.stock[0], 3, "back in the barn");
  M.startCarving(s, 0); M.cutLid(s); M.cancelCarving(s);
  assert.equal(s.stock[0], 2, "a pumpkin with its lid cut is spent");
});

test("the lid comes off and the pulp out before a stencil, and the seeds go to the pantry or the market", () => {
  const s = bench(); M.startCarving(s, 0);
  assert.equal(M.chooseStencil(s, "classic"), false, "lid still on");
  assert.equal(M.finishScoop(s), false, "nothing to scoop yet");
  assert.ok(M.cutLid(s)); assert.equal(M.cutLid(s), false, "once");
  assert.equal(M.chooseStencil(s, "classic"), false, "pulp still in");
  // No kitchen yet: the seeds sell.
  const coins = s.coins, seeds = M.finishScoop(s);
  assert.deepEqual(seeds, { amount: M.CARVING.seeds[0], pantry: 0, sold: M.CARVING.seeds[0], coins: M.CARVING.seeds[0] * M.INGREDIENT_BY_ID.seeds.price });
  assert.equal(s.coins - coins, seeds.coins); assert.equal(M.finishScoop(s), false, "scooped once");
  assert.ok(M.chooseStencil(s, "classic"));
  // With a kitchen, they fill the pantry while it has room.
  const k = bench(); k.kitchen.purchased = true; k.kitchen.pantry.flour = M.pantryCapacity(k) - 2;
  M.startCarving(k, 1); M.cutLid(k);
  const kept = M.finishScoop(k);
  assert.equal(kept.pantry, 2); assert.equal(kept.sold, M.CARVING.seeds[1] - 2); assert.equal(k.kitchen.pantry.seeds, 2);
});

test("every piece must be cut or etched as its stencil says, and the stencil is fixed after the first", () => {
  const s = bench(); opened(s, 1);
  assert.equal(M.cutPiece(s, "nose"), false, "no stencil yet");
  assert.ok(M.chooseStencil(s, "cat")); assert.ok(M.chooseStencil(s, "classic"));
  assert.ok(M.cutPiece(s, "eye-l")); assert.equal(M.cutPiece(s, "eye-l"), false, "once");
  assert.equal(M.cutPiece(s, "whiskers"), false, "not in this stencil");
  assert.equal(M.etchPiece(s, "nose"), false, "the nose is cut, not etched");
  assert.equal(M.chooseStencil(s, "bat"), false, "fixed once cutting");
  assert.equal(M.lightCarving(s), false, "unfinished"); assert.equal(M.finishCarving(s), false, "unfinished");
  carveAll(s); assert.ok(M.carvingDone(s));
  assert.ok(M.lightCarving(s)); assert.equal(M.cutPiece(s, "nose"), false, "no cutting once lit");
});

test("master stencils open as lanterns are made, and etched pieces add value", () => {
  const s = bench(); s.stock = [6, 0, 0, 0, 0]; opened(s);
  assert.equal(M.chooseStencil(s, "harvest-moon"), false, "locked until the first lantern");
  M.chooseStencil(s, "heart"); carveAll(s); M.finishCarving(s, "keep");
  opened(s); assert.ok(M.chooseStencil(s, "harvest-moon"));
  assert.equal(M.cutPiece(s, "moon"), false, "the moon is etched");
  carveAll(s); assert.deepEqual(s.carving.current.etched, ["moon"]);
  const lantern = M.finishCarving(s, "keep");
  assert.equal(lantern.value, M.VARIETIES[0].price * 3 + 3 * 12 + M.CARVING.perEtch, "an orange pumpkin, three stars and one etched piece");
  for (const st of M.STENCILS) assert.equal(M.stencilOpen(s, st.id), (st.unlock ?? 0) <= 2, st.id);
});

test("freehand shapes are cut wherever the knife closes a loop, within reason", () => {
  const s = bench(); opened(s); assert.ok(M.chooseStencil(s, "free"));
  assert.equal(M.carvingDone(s), false, "nothing drawn yet");
  assert.equal(M.addFreePiece(s, [[0, 0], [.01, 0], [0, .01]]), false, "too small");
  assert.equal(M.addFreePiece(s, [[0, 0], [.9, 0], [0, .3]]), false, "off the face");
  assert.equal(M.addFreePiece(s, [[0, 0], [NaN, 0], [0, .3]]), false, "not a shape");
  assert.equal(M.addFreePiece(s, [[-.2, 0], [.2, 0]]), false, "not closed");
  assert.equal(M.addFreePiece(s, [[-.2, .1], [.2, .1], [0, .4123456]]), 1);
  assert.deepEqual(s.carving.current.free[0][2], [0, .412], "kept to three places");
  assert.ok(M.carvingDone(s));
  for (let i = 1; i < M.CARVING.freeMax; i++) M.addFreePiece(s, [[-.5, -.5], [-.3, -.5], [-.4, -.3]]);
  assert.equal(M.addFreePiece(s, [[-.5, -.5], [-.3, -.5], [-.4, -.3]]), false, "at most freeMax");
  assert.equal(M.chooseStencil(s, "classic"), false, "fixed once carving");
  const value = M.lanternValue({ variety: 0, stencil: "free", decor: s.carving.current.decor, free: s.carving.current.free });
  assert.equal(value, M.VARIETIES[0].price * 3 + 2 * 12 + M.CARVING.freeMax * M.CARVING.perFree);
  const path = Array.from({ length: 60 }, (_, i) => [Math.cos(i / 60 * Math.PI * 2) * .3, Math.sin(i / 60 * Math.PI * 2) * .3]);
  assert.ok(M.simplifyPath(path, .01).length < 30, "a drawn circle is thinned");
  assert.ok(Math.abs(M.polygonArea(path) - Math.PI * .09) < .01);
});

test("decorations add value; a named lantern is kept on the doorstep or sold, and saves", () => {
  const s = bench(); opened(s, 1); M.chooseStencil(s, "skull"); carveAll(s);
  const plain = M.lanternValue({ variety: 1, stencil: "skull", decor: s.carving.current.decor });
  assert.equal(plain, 24 * 3 + 3 * 12);
  assert.ok(M.setCarvingDecor(s, "hat", "witch")); assert.ok(M.setCarvingDecor(s, "extras", "spider")); assert.ok(M.setCarvingDecor(s, "extras", "bolts"));
  assert.ok(M.setCarvingDecor(s, "extras", "bolts"), "toggled off again"); assert.equal(M.setCarvingDecor(s, "hat", "sombrero"), false);
  assert.ok(M.nameCarving(s, "  <b>Old\nBones</b> the Magnificent Lantern  "));
  assert.equal(s.carving.current.name, "bOld Bones/b the Magnifi");
  const kept = M.finishCarving(s, "keep");
  assert.equal(kept.value, plain + 2 * 6); assert.equal(s.carving.lanterns.length, 1); assert.equal(kept.name, "bOld Bones/b the Magnifi");
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(loaded.carving.lanterns[0].decor, kept.decor); assert.equal(loaded.carving.lanterns[0].name, kept.name);
  const coins = loaded.coins, earned = loaded.earned;
  assert.equal(M.sellLantern(loaded, loaded.carving.lanterns[0].id), kept.value);
  assert.equal(loaded.coins - coins, kept.value); assert.equal(loaded.earned - earned, kept.value);
  loaded.stock[0] = 1; opened(loaded); M.chooseStencil(loaded, "heart"); carveAll(loaded);
  const before = loaded.coins, sold = M.finishCarving(loaded, "sell");
  assert.equal(loaded.coins - before, sold.value); assert.equal(loaded.carving.lanterns.length, 0);
});

test("a session saves at every stage, and one from before lids still carries on", () => {
  const s = bench(); s.stock = [4, 0, 0, 0, 0];
  const round = () => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).carving.current;
  M.startCarving(s, 0); assert.equal(round().lid, false);
  M.cutLid(s); assert.deepEqual([round().lid, round().scooped], [true, false]);
  M.finishScoop(s); M.chooseStencil(s, "free"); M.addFreePiece(s, [[-.2, .1], [.2, .1], [0, .4]]);
  assert.deepEqual(round().free, s.carving.current.free);
  M.lightCarving(s); assert.equal(round().lit, true);
  // From the first carving bench: no lid or scoop fields, but a stencil and cuts.
  const raw = M.saveData(s); raw.carving.current = { variety: 0, stencil: "classic", cut: ["nose", "bogus"], decor: { hat: "top" } };
  const old = M.restoreState(JSON.parse(JSON.stringify(raw))).carving.current;
  assert.deepEqual([old.lid, old.scooped, old.lit, old.cut, old.etched, old.free], [true, true, false, ["nose"], [], []]);
  assert.equal(old.decor.hat, "top");
  raw.carving.current = { variety: 0, stencil: null, cut: [] };
  assert.equal(M.restoreState(JSON.parse(JSON.stringify(raw))).carving.current.lid, false, "an untouched old session starts at the lid");
  raw.carving.lanterns = [{ variety: 0, stencil: "free", free: [] }, { variety: 0, stencil: "classic" }];
  assert.deepEqual(M.restoreState(JSON.parse(JSON.stringify(raw))).carving.lanterns.map((l) => l.stencil), ["classic"], "a freehand lantern needs its shapes");
});

test("the doorstep keeps the latest eight", () => {
  const s = bench(); s.stock = [20, 0, 0, 0, 0];
  for (let i = 0; i < 10; i++) { opened(s); M.chooseStencil(s, "heart"); carveAll(s); M.finishCarving(s, "keep"); }
  assert.equal(s.carving.lanterns.length, M.CARVING.lanternKeep); assert.equal(s.carving.lanterns[0].id, 3);
});

test("every stencil's pieces sit on the carvable face, apart from each other, and trace as closed outlines", () => {
  for (const st of M.STENCILS) {
    assert.ok(M.STENCIL_GROUPS.some(([id]) => id === st.group), `${st.id} is in the book`);
    for (const piece of st.pieces) {
      const outline = M.pieceOutline(piece);
      assert.ok(outline.length >= 8, `${st.id} ${piece.id} outline`);
      for (const [u, v] of piece.outer) assert.ok(Math.abs(u) <= .72 && v > -.66 && v < .62, `${st.id} ${piece.id} on the face (${u}, ${v})`);
      // Somewhere inside the piece is cut.
      let inside = 0; for (let u = -1; u <= 1; u += .02) for (let v = -1; v <= 1; v += .02) if (M.inPiece(piece, u, v)) inside++;
      assert.ok(inside > 4, `${st.id} ${piece.id} has area`);
      for (const other of st.pieces) if (other !== piece) for (const [u, v] of piece.outer) assert.ok(!M.inPiece(other, u, v), `${st.id} ${piece.id} clear of ${other.id}`);
    }
  }
});

test("a pumpkin can be any of the shapes, and keeps its shape on the doorstep and in saves", () => {
  const s = bench(); s.stock = [3, 0, 0, 0, 0];
  assert.equal(M.startCarving(s, 0, "pear"), false, "no such shape"); assert.equal(s.stock[0], 3, "nothing taken");
  assert.ok(M.startCarving(s, 0, "warty")); assert.equal(s.carving.current.shape, "warty");
  assert.equal(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).carving.current.shape, "warty");
  M.cutLid(s); M.finishScoop(s); M.chooseStencil(s, "heart"); carveAll(s);
  assert.equal(M.finishCarving(s, "keep").shape, "warty");
  assert.ok(M.startCarving(s, 0)); assert.equal(s.carving.current.shape, "ribbed", "ribbed unless picked");
  const raw = M.saveData(s); raw.carving.lanterns[0].shape = "banana"; delete raw.carving.current.shape;
  const loaded = M.restoreState(JSON.parse(JSON.stringify(raw)));
  assert.equal(loaded.carving.lanterns[0].shape, "ribbed"); assert.equal(loaded.carving.current.shape, "ribbed");
  assert.deepEqual(M.PUMPKIN_SHAPES.map((sh) => sh.id), ["ribbed", "round", "tall", "squat", "warty"]);
});
