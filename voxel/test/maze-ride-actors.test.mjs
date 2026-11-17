import test from 'node:test';
import assert from 'node:assert/strict';
import { MAZE_SCARE_ACTORS, MAZE_HAUNTED_GIRL, MAZE_RIDE_ACTORS, mazeScareActorMetadata, mazeHauntedGirlMetadata } from '../src/maze-ride-actor-meta.js';

// Odd dimensions exercise the rounded grid boundaries used by generated art.
function atlas(w = 83, h = 49) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) {
    const x0 = Math.round(col * w / 4), y0 = Math.round(row * h / 2), cellH = Math.round((row + 1) * h / 2) - y0;
    const bottom = cellH - 3 - col, top = row ? 2 : 4;
    for (let y = top; y <= bottom; y++) for (let x = 8; x < 13; x++) pixels[((y0 + y) * w + x0 + x) * 4 + 3] = 255;
    // An asymmetric raised sleeve must not drag the torso anchor sideways.
    if (row) for (let y = 2; y <= 5; y++) for (let x = 2; x < 10; x++) pixels[((y0 + y) * w + x0 + x) * 4 + 3] = 255;
  }
  return { w, h, pixels };
}

test('the 4 by 2 grid covers non-divisible source dimensions without gaps', () => {
  const { w, h, pixels } = atlas(), meta = mazeScareActorMetadata(w, h, pixels);
  assert.deepEqual(Object.keys(meta.actors), ['ghoul', 'clown', 'scarecrow', 'wraith']);
  for (let row = 0; row < 2; row++) {
    const frames = Object.values(meta.actors).map(actor => actor.frames[row]);
    assert.equal(frames[0].x, 0);
    assert.equal(frames.at(-1).x + frames.at(-1).w, w);
    assert.equal(frames.reduce((sum, frame) => sum + frame.w, 0), w);
    for (let col = 1; col < 4; col++) assert.equal(frames[col].x, frames[col - 1].x + frames[col - 1].w);
  }
  for (const actor of Object.values(meta.actors)) {
    assert.equal(actor.frames[0].y, 0);
    assert.equal(actor.frames[0].h, actor.frames[1].y);
    assert.equal(actor.frames[1].y + actor.frames[1].h, h);
  }
});

test('poses share body scale and torso centre while each alpha foot stays grounded', () => {
  const { w, h, pixels } = atlas(), meta = mazeScareActorMetadata(w, h, pixels);
  for (const actor of Object.values(meta.actors)) {
    assert.ok(actor.height >= 2.2 && actor.height <= 2.6);
    assert.equal(actor.anchorX, 10.5);
    for (const frame of actor.frames) {
      assert.equal(frame.unit, actor.unit);
      assert.equal(frame.ax, actor.anchorX);
      assert.equal(frame.ay, frame.bounds.bottom + 1);
      assert.equal((frame.ay - (frame.bounds.bottom + 1)) * frame.unit, 0);
      assert.equal(actor.poses[frame.pose], frame);
    }
    assert.equal(actor.bodyPixels * actor.unit, actor.height);
    assert.ok(actor.frames[0].bounds.top > actor.frames[1].bounds.top);
    assert.ok(actor.frames[0].bounds.left > actor.frames[1].bounds.left);
  }
});

test('all complete characters are required and faint alpha does not alter anchors', () => {
  const { w, h, pixels } = atlas();
  pixels[3] = 32;
  assert.equal(mazeScareActorMetadata(w, h, pixels).actors.ghoul.frames[0].bounds.top, 4);
  const x = Math.round(3 * w / 4), y = Math.round(h / 2);
  for (let yy = y; yy < h; yy++) for (let xx = x; xx < w; xx++) pixels[(yy * w + xx) * 4 + 3] = 0;
  assert.throws(() => mazeScareActorMetadata(w, h, pixels), /Missing wraith scare pose/);
  assert.throws(() => mazeScareActorMetadata(3, h, pixels), /Invalid/);
  assert.throws(() => mazeScareActorMetadata(w, 0, pixels), /Invalid/);
  assert.throws(() => mazeScareActorMetadata(w, h, pixels.slice(0, -1)), /Invalid/);
  assert.equal(MAZE_SCARE_ACTORS.length, 4);
});

test('the separate haunted girl sheet shares scale and anchors across two horizontal poses', () => {
  const w = 43, h = 25, pixels = new Uint8ClampedArray(w * h * 4);
  for (let pose = 0; pose < 2; pose++) {
    const start = Math.round(pose * w / 2);
    for (let y = pose ? 2 : 4; y <= 22; y++) for (let x = pose ? 5 : 8; x < (pose ? 10 : 13); x++) pixels[(y * w + start + x) * 4 + 3] = 255;
    if (pose) for (let x = 2; x < 18; x++) pixels[(3 * w + start + x) * 4 + 3] = 255;
  }
  const meta = mazeHauntedGirlMetadata(w, h, pixels), girl = meta.actors['haunted-girl'];
  assert.equal(meta.columns, 2); assert.equal(meta.rows, 1);
  assert.deepEqual(Object.keys(meta.actors), ['haunted-girl']);
  assert.equal(girl.height, 2.3); assert.equal(girl.bodyPixels * girl.unit, 2.3);
  assert.equal(girl.frames[0].x + girl.frames[0].w, girl.frames[1].x);
  assert.equal(girl.frames[1].x + girl.frames[1].w, w);
  assert.equal(girl.anchorMode, 'torso');
  assert.notEqual(girl.frames[0].ax, girl.frames[1].ax);
  assert.equal(girl.frames[0].unit, girl.frames[1].unit);
  for (const frame of girl.frames) {
    assert.equal(frame.y, 0); assert.equal(frame.h, h); assert.equal(frame.ay, frame.bounds.bottom + 1);
    assert.equal((frame.torsoX - frame.ax) * frame.unit, 0);
  }
  assert.equal(girl.poses.lurking, girl.frames[0]); assert.equal(girl.poses.scare, girl.frames[1]);
  assert.equal(MAZE_HAUNTED_GIRL.id, 'haunted-girl'); assert.equal(MAZE_RIDE_ACTORS.length, 5);
  for (let y = 0; y < h; y++) for (let x = Math.round(w / 2); x < w; x++) pixels[(y * w + x) * 4 + 3] = 0;
  assert.throws(() => mazeHauntedGirlMetadata(w, h, pixels), /Missing haunted-girl scare pose/);
});
