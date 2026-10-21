import test from "node:test";
import assert from "node:assert/strict";
import { MIST, mistBank, mistCover } from "../src/content/ambience.js";

// The farm runs from the Hollow House's west edge to the festival meadow's far side.
const FARM = { x0: -8, x1: 54 };

test("the mist rolls across the farm, clears for a while and comes back", () => {
  let misty = 0, clear = 0, spells = 0, wasClear = true;
  for (let t = 0; t < MIST.cycle * 3; t += 1) {
    const over = Math.max(...[FARM.x0, 0, 20, 40, FARM.x1].map((x) => mistCover(x, t)));
    if (over > 0.05) { misty++; if (wasClear) spells++; wasClear = false; } else { clear++; wasClear = true; }
  }
  assert.equal(spells, 3, "once each time round");
  assert.ok(misty > clear * 0.6 && clear > misty * 0.4, `it lingers and it clears (${misty}s misty, ${clear}s clear)`);
});

test("the bank drifts west to east, soft at the edges, never thicker than its peak", () => {
  const a = mistBank(10), b = mistBank(60);
  assert.ok(b.centre > a.centre, "eastwards");
  for (let t = 0; t < 600; t += 7) {
    const bank = mistBank(t);
    assert.ok(bank.strength >= 0.6 && bank.strength <= 1);
    assert.equal(mistCover(bank.centre + bank.halfWidth, t), 0);
    assert.ok(mistCover(bank.centre, t) <= 1 && mistCover(bank.centre, t) > mistCover(bank.centre + bank.halfWidth * 0.7, t));
  }
  assert.ok(MIST.peak <= 0.2, "only ever the slightest mist");
});
