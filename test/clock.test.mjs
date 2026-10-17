import test from "node:test";
import assert from "node:assert/strict";
import { SimulationClock } from "../src/core/clock.js";

test("the clock runs fixed steps and caps catch-up per frame", () => {
  const clock = new SimulationClock(0.1, 8);
  let steps = 0;
  assert.equal(clock.advance(0.35, () => steps++), 3);
  assert.equal(clock.advance(5, () => steps++), 8, "a long frame cannot run away");
  assert.equal(steps, 11);
  assert.equal(clock.advance(-1, () => steps++), 0);
  assert.equal(clock.advance(NaN, () => steps++), 0);
  assert.throws(() => new SimulationClock(0));
});
