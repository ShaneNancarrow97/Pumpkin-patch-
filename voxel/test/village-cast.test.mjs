import test from "node:test";
import assert from "node:assert/strict";
import { validVillageSprite, villageFrameShape, villageSpritePose, visibleVillagePick, activeVillageMood } from "../src/village-sprite-math.js";

const frames = Array.from({ length: 6 }, (_, i) => ({ x: i * 100, y: 0, w: 100, h: 200, ax: 50, ay: 190 }));
const meta = { url: "test.webp", w: 600, h: 200, rows: 180, frames, actions: { idle: [0], walk: [1, 2, 3, 4], wave: [5] } };
test("village cast metadata rejects clipped cells and invalid scale or anchors", () => {
  assert.equal(validVillageSprite(meta), true);
  for (const broken of [{ ...meta, rows: 0 }, { ...meta, frames: [{ ...frames[0], x: -1 }] }, { ...meta, frames: [{ ...frames[0], x: 550 }] }, { ...meta, frames: [{ ...frames[0], ay: Infinity }] }, { ...meta, frames: [{ ...frames[0], ax: 120 }] }, { ...meta, actions: { walk: [99] } }]) assert.equal(validVillageSprite(broken), false);
});
test("a whole walking strip shares its body height, floor anchor and width", () => {
  const shapes = frames.map(f => villageFrameShape(meta, f));
  for (const shape of shapes) assert.deepEqual(shape, shapes[0]);
  assert.ok(Math.abs(shapes[0].unit * meta.rows - 2.3) < 1e-9);
  assert.equal(shapes[0].x, 0);
  assert.ok(Math.abs(shapes[0].y - shapes[0].height / 2 + (200 - 190) * shapes[0].unit) < 1e-9, "transparent foot padding remains below the shared anchor");
});
test("moving neighbours alternate authored left and right leg phases; idle never walks", () => {
  const poses = [0, 1 / 6, 2 / 6, 3 / 6].map(time => villageSpritePose(meta, { walking: true, time }));
  assert.deepEqual(poses.map(p => p.frame), [1, 2, 3, 4]);
  assert.deepEqual(poses.map(p => p.leadingLeg), ["left", "left", "right", "right"]);
  assert.deepEqual(villageSpritePose(meta, { time: 40 }), { action: "idle", frame: 0, leadingLeg: null });
  assert.equal(villageSpritePose(meta, { mood: "wave", time: 2 }).frame, 5);
  assert.equal(villageSpritePose(meta, { walking: true, time: NaN }).frame, 1);
});
test("ray picks discard hidden residents and hosts in a closed hall, including ancestors", () => {
  const scene = { visible: true }, hiddenHall = { visible: false, parent: scene }, person = { visible: true, parent: hiddenHall }, hit = { visible: true, parent: person };
  assert.equal(visibleVillagePick(hit), false);
  hiddenHall.visible = true; assert.equal(visibleVillagePick(hit), true);
  person.visible = false; assert.equal(visibleVillagePick(hit), false);
  assert.equal(visibleVillagePick({ visible: true, material: { visible: false }, parent: scene }), true, "transparent hit materials remain intentionally pickable");
});
test("greetings use the village clock and finish after two seconds even on a slow load", () => {
  const greeting = { m: "wave", at: 700 };
  assert.equal(activeVillageMood(greeting, 700.3), "wave");
  assert.equal(activeVillageMood(greeting, 703), "idle");
  assert.equal(activeVillageMood({ m: "wave", at: NaN }, 700), "idle");
  assert.equal(activeVillageMood({ m: "talk", at: 10 }, 900), "talk");
});
