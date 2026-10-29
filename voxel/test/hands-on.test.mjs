import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

// Helping hands step back while the player steers Shane or Natalie.
test("helping hands rest while the player is in control", () => {
  const s = M.freshState();
  s.upgrades.auto = 1;
  s.plots[0] = { phase: "ready", progress: 1, variety: 0 }; s.plots[0].ripe = -100;
  s.handsOn = true;
  M.update(s, 3);
  assert.equal(s.plots[0].phase, "ready");
  s.handsOn = false;
  M.update(s, 3);
  assert.notEqual(s.plots[0].phase, "ready");
});

test("the in-control flag is never saved", () => {
  const s = M.freshState(); s.handsOn = true;
  assert.equal(JSON.parse(JSON.stringify(M.saveData(s))).handsOn, undefined);
  assert.equal(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).handsOn, false);
});
