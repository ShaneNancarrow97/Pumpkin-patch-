import test from "node:test";
import assert from "node:assert/strict";
import { PLAYER_SIDE_WALK_META } from "../src/player-side-walk-meta.js";
import { PLAYER_DIRECTION_META } from "../src/player-direction-meta.js";
import { PLAYER_VIEW_SCALE } from "../src/player-view-scale.js";
import { playerViewScale } from "../src/player-view-size.js";

// The side and back turnarounds have bigger heads than the front sprites, so
// tools/measure_player_views.py shrinks them to read as the same person.
test("every owner look has its turnarounds sized against the front sprite", () => {
  assert.deepEqual(Object.keys(PLAYER_VIEW_SCALE).sort(), Object.keys(PLAYER_SIDE_WALK_META).sort());
  for (const [id, view] of Object.entries(PLAYER_VIEW_SCALE)) {
    for (const key of ["side", "back", "plant", "harvest", "water"]) if (key in view) assert.ok(view[key] >= 0.85 && view[key] <= 1, `${id} ${key} ${view[key]}`);
    assert.equal(view.standSide, PLAYER_SIDE_WALK_META[id].phase.indexOf("pass"), `${id} stands on its passing frame`);
    assert.ok(view.standBack >= 0 && view.standBack < PLAYER_DIRECTION_META[id].back.length, `${id} back stand frame`);
  }
  // The everyday looks have the biggest-headed side art.
  for (const id of ["shane-base", "natalie-base"]) assert.ok(PLAYER_VIEW_SCALE[id].side < 0.92, id);
});

test("the front is drawn at the owner's own size, controlled or not, and the turns relative to it", () => {
  for (const [id, m] of Object.entries(PLAYER_SIDE_WALK_META)) {
    assert.equal(playerViewScale(id, "front"), 1);
    const side = playerViewScale(id, "side") * m.frontScale.idle, back = playerViewScale(id, "back") * m.frontScale.idle / m.backScale;
    assert.ok(Math.abs(side - (PLAYER_VIEW_SCALE[id].side ?? 1)) < 1e-9, `${id} side`);
    assert.ok(Math.abs(back - (PLAYER_VIEW_SCALE[id].back ?? 1)) < 1e-9, `${id} back`);
  }
});
