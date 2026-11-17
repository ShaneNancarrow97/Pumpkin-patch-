import test from "node:test";
import assert from "node:assert/strict";
import { carvingShape, carvingSurface, buildCarving, buildLid, buildChunk, LANTERN_R } from "../src/carving-pumpkin.js";
import { pumpkinTemplate } from "../src/pumpkins.js";
import { PUMPKIN_SHAPES, plotShape } from "../src/content/pumpkin-shapes.js";
import { STENCIL_BY_ID, inPiece } from "../src/content/carving.js";

const faces = (g) => { let n = 0; g.traverse((m) => { if (m.isMesh && m.geometry.index) n += m.geometry.index.count / 6; }); return n; };

test("every shape carries the whole stencil area and the lid's ring, for every variety", () => {
  for (const { id } of PUMPKIN_SHAPES) for (let v = 0; v < 5; v++) {
    const surf = carvingSurface(v, { R: LANTERN_R, size: .62, shape: id });
    for (let u = -.72; u <= .72; u += .04) for (let w = -.64; w < .62; w += .04) assert.notEqual(surf.frontZ(u, w), null, `${id} ${v} face at (${u.toFixed(2)}, ${w.toFixed(2)})`);
    for (let i = 0; i < 24; i++) assert.notEqual(surf.topY(Math.cos(i / 24 * Math.PI * 2) * surf.lidRadius, Math.sin(i / 24 * Math.PI * 2) * surf.lidRadius), null, `${id} ${v} lid ring`);
  }
});

test("the shapes really differ: round is smooth, ribbed grooved, tall tall, squat flat", () => {
  // How far the rind's radius dips between lobes, round the middle.
  const dip = (shape) => {
    const sh = carvingShape(0, 40, shape), y = Math.floor(sh.H / 2); let lo = Infinity, hi = 0;
    for (let i = 0; i < 360; i++) {
      const a = i / 360 * Math.PI * 2; let r = 0;
      for (let d = 0; d < sh.R; d += .5) { const x = Math.floor(Math.sin(a) * d), z = Math.floor(Math.cos(a) * d); if (sh.d(x, y, z)) r = d; }
      lo = Math.min(lo, r); hi = Math.max(hi, r);
    }
    return (hi - lo) / hi;
  };
  assert.ok(dip("round") < .05, `round dips ${dip("round")}`);
  assert.ok(dip("ribbed") > .1, `ribbed dips ${dip("ribbed")}`);
  const height = (shape) => carvingSurface(0, { shape }).height;
  assert.ok(height("tall") > height("round") && height("round") > height("ribbed") && height("ribbed") > height("squat"));
});

test("each shape builds its pumpkin, lid and cut pieces, and the patch grows a mix", () => {
  const heart = STENCIL_BY_ID.heart.pieces[0];
  for (const { id } of PUMPKIN_SHAPES) {
    const lit = buildCarving(2, { R: LANTERN_R, size: .62, shape: id, cut: (u, v) => inPiece(heart, u, v), lid: "on", lit: true });
    assert.ok(faces(lit) > 1000, `${id} lantern`);
    assert.ok(faces(buildLid(2, { R: LANTERN_R, size: .62, shape: id })) > 50, `${id} lid`);
    assert.ok(faces(buildChunk(2, { R: LANTERN_R, size: .62, shape: id, mask: (u, v) => inPiece(heart, u, v) })) > 20, `${id} chunk`);
    let boxes = 0; pumpkinTemplate(0, .62, id).traverse((m) => { if (m.isInstancedMesh) boxes += m.count; });
    assert.ok(boxes > 600, `${id} patch pumpkin`);
  }
  const grown = new Set(Array.from({ length: 24 }, (_, i) => plotShape(i)));
  assert.equal(grown.size, PUMPKIN_SHAPES.length, "every shape somewhere in a full patch");
});
