import test from "node:test";
import assert from "node:assert/strict";
import { createVillageHudRefresh } from "../src/ui/village-hud-refresh.js";

test("village HUD heartbeat is bounded at ten refreshes per second", () => {
  const hud = createVillageHudRefresh(); let draws = 0;
  for (let now = 0; now < 1000; now += 5) if (hud.due(now)) { hud.rendered(now); draws++; }
  assert.equal(draws, 10);
});

test("explicit updates restart the HUD heartbeat without delaying an action", () => {
  const hud = createVillageHudRefresh(); hud.rendered(0);
  assert.equal(hud.due(90), false);
  hud.rendered(90); // A quest completion has already updated the DOM.
  assert.equal(hud.due(100), false); assert.equal(hud.due(189), false); assert.equal(hud.due(190), true);
});

test("HUD heartbeat resumes once after a long pause or a replaced clock", () => {
  const hud = createVillageHudRefresh(); hud.rendered(1000);
  assert.equal(hud.due(90000), true); hud.rendered(90000); assert.equal(hud.due(90000), false);
  assert.equal(hud.due(0), true); hud.rendered(0); assert.equal(hud.due(99), false);
});
