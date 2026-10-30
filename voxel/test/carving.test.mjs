import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const bench = () => {
  const s = M.freshState(); s.coins = 5000; s.stock = [3, 1, 0, 0, 0];
  assert.ok(M.buyEstateDecor(s, "carving-bench")); assert.ok(M.placeEstateDecor(s, "carving-bench", 11, -6));
  return s;
};

test("carving needs a bench and a pumpkin from the barn, and leaving before a cut gives it back", () => {
  const none = M.freshState(); none.stock = [3, 0, 0, 0, 0];
  assert.equal(M.startCarving(none, 0), false, "no bench");
  const s = bench();
  assert.equal(M.startCarving(s, 2), false, "no witchfire in the barn");
  assert.ok(M.startCarving(s, 0)); assert.equal(s.stock[0], 2);
  assert.equal(M.startCarving(s, 0), false, "one at a time");
  assert.ok(M.cancelCarving(s)); assert.equal(s.stock[0], 3, "back in the barn");
  M.startCarving(s, 0); M.chooseStencil(s, "classic"); M.cutPiece(s, "nose"); M.cancelCarving(s);
  assert.equal(s.stock[0], 2, "a cut pumpkin is spent");
});

test("every piece of the stencil must be cut, and the stencil is fixed after the first cut", () => {
  const s = bench(); M.startCarving(s, 1);
  assert.equal(M.cutPiece(s, "nose"), false, "no stencil yet");
  assert.ok(M.chooseStencil(s, "cat")); assert.ok(M.chooseStencil(s, "classic"));
  assert.ok(M.cutPiece(s, "eye-l")); assert.equal(M.cutPiece(s, "eye-l"), false, "once");
  assert.equal(M.cutPiece(s, "whiskers"), false, "not in this stencil");
  assert.equal(M.chooseStencil(s, "bat"), false, "fixed once cutting");
  assert.equal(M.finishCarving(s), false, "unfinished");
  for (const p of M.STENCIL_BY_ID.classic.pieces) M.cutPiece(s, p.id);
  assert.ok(M.carvingDone(s));
});

test("decorations add value; a lantern is kept on the doorstep or sold, and saves", () => {
  const s = bench(); M.startCarving(s, 1); M.chooseStencil(s, "skull");
  for (const p of M.STENCIL_BY_ID.skull.pieces) M.cutPiece(s, p.id);
  const plain = M.lanternValue({ variety: 1, stencil: "skull", decor: s.carving.current.decor });
  assert.equal(plain, 24 * 3 + 3 * 12);
  assert.ok(M.setCarvingDecor(s, "hat", "witch")); assert.ok(M.setCarvingDecor(s, "extras", "spider")); assert.ok(M.setCarvingDecor(s, "extras", "bolts"));
  assert.ok(M.setCarvingDecor(s, "extras", "bolts"), "toggled off again"); assert.equal(M.setCarvingDecor(s, "hat", "sombrero"), false);
  const kept = M.finishCarving(s, "keep");
  assert.equal(kept.value, plain + 2 * 6); assert.equal(s.carving.lanterns.length, 1);
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(loaded.carving.lanterns[0].decor, kept.decor);
  const coins = loaded.coins, earned = loaded.earned;
  assert.equal(M.sellLantern(loaded, loaded.carving.lanterns[0].id), kept.value);
  assert.equal(loaded.coins - coins, kept.value); assert.equal(loaded.earned - earned, kept.value);
  M.startCarving(loaded, 0); M.chooseStencil(loaded, "heart"); for (const p of M.STENCIL_BY_ID.heart.pieces) M.cutPiece(loaded, p.id);
  const before = loaded.coins, sold = M.finishCarving(loaded, "sell");
  assert.equal(loaded.coins - before, sold.value); assert.equal(loaded.carving.lanterns.length, 0);
});

test("the doorstep keeps the latest eight", () => {
  const s = bench(); s.stock = [20, 0, 0, 0, 0];
  for (let i = 0; i < 10; i++) { M.startCarving(s, 0); M.chooseStencil(s, "heart"); for (const p of M.STENCIL_BY_ID.heart.pieces) M.cutPiece(s, p.id); M.finishCarving(s, "keep"); }
  assert.equal(s.carving.lanterns.length, M.CARVING.lanternKeep); assert.equal(s.carving.lanterns[0].id, 3);
});

test("every stencil's pieces sit on the carvable face, apart from each other, and trace as closed outlines", () => {
  for (const st of M.STENCILS) {
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
