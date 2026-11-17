import test from "node:test";
import assert from "node:assert/strict";
import { DIRECTION_NAMES, WALK_PHASES, directionalAngle, directionFromAngle, gaitPhase, validDirectionalSprite, directionalSpritePose } from "../src/directional-sprite-math.js";
import { villageDirectionalPose } from "../src/village-sprite-math.js";

const cell = { w: 192, h: 256, ax: 96, ay: 248 };
const sheet = () => ({ url: "test.webp", w: 1536, h: 2048, cell, rows: 230, height: 2.3, directions: [...DIRECTION_NAMES], frames: Array.from({ length: 64 }, (_, i) => ({ x: (i % 8) * cell.w, y: Math.floor(i / 8) * cell.h, ...cell })), walk: DIRECTION_NAMES.map((_, row) => Array.from({ length: 8 }, (_, phase) => row * 8 + phase)) });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("the eight screen-relative sectors wrap through the front without a seam", () => {
  DIRECTION_NAMES.forEach((direction, i) => {
    for (const turns of [-3, 0, 2]) assert.equal(directionFromAngle(i * Math.PI / 4 + turns * Math.PI * 2), direction);
    assert.equal(directionFromAngle(i * Math.PI / 4 + Math.PI / 8 - 1e-7), direction);
    assert.equal(directionFromAngle(i * Math.PI / 4 - Math.PI / 8 + 1e-7), direction);
  });
  assert.equal(directionFromAngle(2 * Math.PI - 1e-7), "front");
  assert.equal(directionFromAngle(Math.PI / 8 + 1e-7), "frontRight");
  assert.equal(directionFromAngle(-Math.PI / 8 - 1e-7), "frontLeft");
  assert.equal(directionFromAngle(NaN), "front");
});

test("world heading is measured against the camera and retained when movement stops", () => {
  const heading = { x: 0, z: 1 };
  assert.equal(directionFromAngle(directionalAngle(heading, { x: 0, z: 1 })), "front");
  assert.equal(directionFromAngle(directionalAngle(heading, { x: -1, z: 0 })), "right");
  assert.equal(directionFromAngle(directionalAngle(heading, { x: 0, z: -1 })), "back");
  assert.equal(directionFromAngle(directionalAngle(heading, { x: 1, z: 0 })), "left");
  assert.equal(directionFromAngle(directionalAngle({ x: 2, z: 2 }, { x: 0, z: 9 })), "frontRight");
  near(directionalAngle({ x: 0, z: 0 }, { x: 0, z: 1 }, Math.PI), Math.PI);
  near(directionalAngle(heading, { x: 0, z: 0 }, Math.PI / 2), Math.PI / 2);
  assert.equal(directionalAngle(null, null, NaN), 0);
});

test("all eight foot phases survive direction changes and both contact legs are drawn", () => {
  const meta = sheet();
  assert.equal(WALK_PHASES.length, 8);
  for (let phaseIndex = 0; phaseIndex < 8; phaseIndex++) {
    const phase = gaitPhase((phaseIndex + .25) * 1.2 / 8);
    DIRECTION_NAMES.forEach((direction, row) => {
      const pose = directionalSpritePose(meta, { angle: row * Math.PI / 4, phase, walking: true });
      assert.equal(pose.direction, direction);
      assert.equal(pose.frame, row * 8 + phaseIndex);
      assert.equal(pose.phaseIndex, phaseIndex);
      assert.equal(pose.leadingLeg, phaseIndex < 4 ? "left" : "right");
      near(pose.phase, phase);
    });
  }
  near(gaitPhase(1.2), 0); near(gaitPhase(2.1), .75);
  near(gaitPhase(.3, .6), .5);
  for (const value of [NaN, Infinity, -3]) assert.equal(gaitPhase(value), 0);
  assert.equal(gaitPhase(1, 0), 0);
});

test("uncovered directions and actions use an explicit fallback rather than mirrored art", () => {
  const meta = sheet();
  assert.equal(directionalSpritePose(meta, { walking: false }), null);
  assert.equal(directionalSpritePose(meta, { walking: true, mood: "wave" }), null);
  assert.equal(directionalSpritePose(meta, { walking: true, mood: "talk" }), null);
  const partial = { ...meta, directions: ["right"], walk: [meta.walk[2]] };
  assert.ok(validDirectionalSprite(partial));
  assert.equal(directionalSpritePose(partial, { walking: true, angle: -Math.PI / 2 }), null);
  assert.equal(directionalSpritePose(partial, { walking: true, angle: Math.PI / 2 }).frame, 16);
  meta.idle = DIRECTION_NAMES.map((_, i) => [i * 8]);
  const idle = directionalSpritePose(meta, { angle: Math.PI, walking: false });
  assert.equal(idle.frame, 32); assert.equal(idle.leadingLeg, null); assert.equal(idle.action, "idle");
  meta.idle[4] = [];
  assert.equal(directionalSpritePose(meta, { angle: Math.PI, walking: false }), null);
  const floating = directionalSpritePose({ ...sheet(), locomotion: "float" }, { walking: true, phase: .625 });
  assert.equal(floating.frame, 5); assert.equal(floating.leadingLeg, null, "Cinder's tail phases are not labelled as legs");
});

test("the loader rejects stale frame bounds, changed anchors and duplicated step indices", () => {
  assert.ok(validDirectionalSprite(sheet()));
  assert.equal(validDirectionalSprite(undefined), false);
  for (const mutate of [
    meta => { meta.frames[63].x = 1600; },
    meta => { meta.frames[5].ax++; },
    meta => { meta.walk[0][4] = meta.walk[0][0]; },
    meta => { meta.walk[0].pop(); },
    meta => { meta.directions[7] = "left"; },
    meta => { meta.frames[8].y = NaN; },
    meta => { meta.height = 0; },
  ]) {
    const meta = sheet(); mutate(meta); assert.equal(validDirectionalSprite(meta), false);
  }
});

test("village idle, talk and wave retain their original performances while new walk art loads", () => {
  const legacy = { frames: Array.from({ length: 6 }, () => ({})), actions: { idle: [0], walk: [1, 2, 3, 4], wave: [5], talk: [0] } }, directional = sheet();
  const options = { angle: Math.PI, phase: .625, time: .5 };
  for (const mood of ["idle", "talk", "wave"]) {
    const pose = villageDirectionalPose(legacy, directional, { ...options, mood });
    assert.equal(pose.atlas, "legacy"); assert.equal(pose.authored, false);
    assert.equal(pose.direction, "front"); assert.equal(pose.requestedDirection, "back");
    assert.equal(pose.frame, mood === "wave" ? 5 : 0);
  }
  const waiting = villageDirectionalPose(legacy, undefined, { ...options, walking: true });
  assert.equal(waiting.atlas, "legacy"); assert.equal(waiting.frame, 4);
  const loaded = villageDirectionalPose(legacy, directional, { ...options, walking: true });
  assert.equal(loaded.atlas, "directional"); assert.equal(loaded.frame, 37); assert.equal(loaded.leadingLeg, "right");
});
