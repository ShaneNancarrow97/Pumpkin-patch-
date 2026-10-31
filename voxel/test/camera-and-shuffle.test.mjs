import test from "node:test";
import assert from "node:assert/strict";
import { cameraLayout, controlledRoomFraming, farmVerticalLimits } from "../src/camera-layout.js";
import { createMusicQueue } from "../src/ui/music-queue.js";

test("an almost-square unfolded Fold uses the whole farm, not the phone crop", () => {
  // 874px viewport less the 88px navigation rail = 786x787 canvas.
  assert.equal(cameraLayout(786).farmSpan, 46);
  assert.equal(cameraLayout(390).farmSpan, 20);
  assert.equal(cameraLayout(412).overview, 0);
  let previous = 0;
  for (let w = 390; w < 1000; w++) {
    const span = cameraLayout(w).farmSpan;
    assert.ok(span >= previous && span - previous < (w === 390 ? 21 : .13)); previous = span;
  }
  const limits = farmVerticalLimits(23, Math.PI / 5, 26);
  assert.ok(limits.min <= 8.4 && limits.max >= 8.4, "the overview stays centred on the farm");
});

test("camera pan limits stay finite and ordered at every zoom and aspect", () => {
  for (const width of [390, 786, 1192]) for (const height of [390, 787, 844]) for (const zoom of [.5, 1, 2.6, cameraLayout(width).maxZoom]) {
    const halfHeight = cameraLayout(width).farmSpan / zoom / 2 / (width / height);
    const limits = farmVerticalLimits(halfHeight, Math.PI / 5, 26);
    assert.ok(Number.isFinite(limits.min) && limits.min <= limits.max);
  }
});

test("shuffle plays every song per round and never repeats at round boundaries", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const queue = createMusicQueue(ids, () => .37); let current = "a";
  for (let round = 0; round < 10; round++) {
    const played = [];
    for (let i = 0; i < ids.length; i++) { const next = queue.next(current); assert.notEqual(next, current); played.push(next); current = next; }
    assert.equal(new Set(played).size, ids.length);
  }
  assert.equal(queue.next("i", false), "a");
  assert.equal(createMusicQueue([]).next("a"), null);
  assert.equal(createMusicQueue(["a"]).next("a"), "a");
});

// The same cap is applied when wheel, pinch or controller input reaches framing.
test("indoor direct play leaves space around the owner and cannot zoom into a giant", () => {
  assert.equal(controlledRoomFraming(390).distance,15);
  assert.equal(controlledRoomFraming(874).distance,16.5);
  for(const width of [320,390,600,874,1280])for(const requested of [.1,.6,1,1.9,4.5,NaN,Infinity]){
    const view=controlledRoomFraming(width,requested);
    assert.ok(view.zoom>=.6&&view.zoom<=1.15);
    assert.ok(view.distance/view.zoom>=13);
  }
});
