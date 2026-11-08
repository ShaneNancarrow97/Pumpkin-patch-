import test from "node:test";
import assert from "node:assert/strict";
import { cottage, workshop, conservatory, C } from "../src/village-models.js";

// Record the same shared-batch boxes without a renderer or a browser.
function build(draw) {
  const boxes = [], marks = [];
  draw({ block(...box) { boxes.push(box); }, mark(...point) { marks.push(point); } });
  return { boxes, marks };
}
const bounds = boxes => boxes.reduce((a, b) => [Math.min(a[0], b[0] - b[3] / 2), Math.max(a[1], b[0] + b[3] / 2), Math.min(a[2], b[2] - b[5] / 2), Math.max(a[3], b[2] + b[5] / 2), Math.min(a[4], b[1]), Math.max(a[5], b[1] + b[4])], [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]);

test("restored cottages have distinct warm panes on every wall and planted window boxes", () => {
  const { boxes } = build(f => cottage(f));
  const panes = boxes.filter(b => b[7] && [C.window, 0xffc582].includes(b[6]));
  assert.ok(panes.filter(b => b[2] > .1 && b[4] < .7).length >= 8, "the two front windows each have four individually lit panes");
  assert.ok(panes.filter(b => b[2] < -7 && b[4] < .7).length >= 8, "back windows receive the same glass");
  for (const side of [-1, 1]) assert.ok(panes.filter(b => Math.sign(b[0]) === side && Math.abs(b[0]) > 4 && b[4] < .7).length >= 8, "each side has two complete windows");
  const planterRims = boxes.filter(b => b[6] === C.woodLight && Math.abs(b[4] - .055) < .0001);
  assert.equal(planterRims.length, 6, "the front and side planters have raised wood rims");
  assert.ok(boxes.filter(b => b[6] === C.brass && b[3] < .05).length >= 12, "small shutter and planter fastenings are actual geometry");
});

test("the detail pass preserves restoration contrast, deterministic builds and chimney marks", () => {
  const ordinary = build(f => cottage(f)), repeat = build(f => cottage(f));
  assert.deepEqual(ordinary, repeat, "the same authored seed gives the same house");
  const shabby = build(f => cottage(f, { shabby: true }));
  assert.equal(shabby.boxes.filter(b => b[7]).length, 0, "unrestored homes remain dark and boarded");
  assert.ok(ordinary.boxes.some(b => b[7]), "restoring the cottage visibly lights it");
  assert.deepEqual(ordinary.marks, shabby.marks, "chimney smoke remains on the existing socket");
});

test("small joinery uses positive finite boxes within the existing building reserve", () => {
  for (const draw of [f => cottage(f), f => cottage(f, { ridge: "z" }), f => cottage(f, { shabby: true }), f => workshop(f, true), f => conservatory(f, true)]) {
    const { boxes, marks } = build(draw);
    assert.ok(boxes.length < 1250, "the cottage detail adds at most a few hundred batched boxes");
    for (const b of boxes) {
      assert.ok(b.slice(0, 7).every(Number.isFinite));
      assert.ok(b[3] > 0 && b[4] > 0 && b[5] > 0);
    }
    assert.ok(marks.some(m => m[0] === "smoke"), "named chimney mark survives");
  }
  const b = bounds(build(f => cottage(f)).boxes);
  assert.deepEqual(b, [-4.75, 4.85, -7.6, 1.15, 0, 8.2125], "the model's overall footprint and roof height remain unchanged");
});

test("restored conservatory keeps its dome out of bloom and confines warmth to small panes", () => {
  const restored = build(f => conservatory(f, true)), shabby = build(f => conservatory(f, false));
  const walls = restored.boxes.filter(b => b[3] === .5 && b[4] === 2.9 && b[5] === .5);
  const dome = restored.boxes.filter(b => b[1] >= 3.44 && b[3] === .5 && b[4] === .3 && b[5] === .5);
  assert.equal(walls.length, 20); assert.equal(dome.length, 98);
  assert.ok([...walls, ...dome].every(b => !b[7]), "large wall and dome glass stays lit by the scene, not unlit bloom");
  const glowing = restored.boxes.filter(b => b[7] && b[3] === .2 && b[4] === .85 && b[5] === .2);
  assert.equal(glowing.length, 7, "seven small wall panes light the restored glasshouse");
  assert.equal(shabby.boxes.filter(b => b[7]).length, 0, "the unrestored conservatory remains dark");
});
