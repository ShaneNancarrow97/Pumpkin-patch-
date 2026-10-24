import test from "node:test";
import assert from "node:assert/strict";
import { HAYRIDE_LIGHTNING_TIMES, hayrideLightning } from "../src/content/hayride-weather.js";

test("lightning is widely spaced, fades once, and is suppressed by gentle/pause/off", () => {
  assert.equal(HAYRIDE_LIGHTNING_TIMES.length, 3);
  for (let i = 1; i < HAYRIDE_LIGHTNING_TIMES.length; i++) assert.ok(HAYRIDE_LIGHTNING_TIMES[i] - HAYRIDE_LIGHTNING_TIMES[i - 1] > 20);
  for (const at of HAYRIDE_LIGHTNING_TIMES) {
    assert.equal(hayrideLightning(at - .01), 0);
    assert.equal(hayrideLightning(at), 1);
    assert.ok(hayrideLightning(at + .15) > hayrideLightning(at + .3));
    assert.equal(hayrideLightning(at + .73), 0);
    for (const options of [{ gentle: true }, { lightning: false }, { paused: true }]) assert.equal(hayrideLightning(at, options), 0);
  }
  for (const n of [NaN, Infinity, -100]) assert.equal(hayrideLightning(n), 0);
});
