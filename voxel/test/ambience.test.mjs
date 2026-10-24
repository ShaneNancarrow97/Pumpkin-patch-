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

// The mist gives way over the pumpkins and round the buildings, from the layout's own numbers.
import { mistClearings, mistLeft, MIST_THIN } from "../src/content/ambience.js";
import { patchShape, PLOT_POSITIONS, PLOT_COUNTS } from "../src/content/farm-layout.js";
import { HOLLOW_PROPERTY } from "../src/content/hollow-house.js";
import { MEADOW } from "../src/content/festival-meadow.js";
import { SHOP, BIG_PUMPKIN } from "../src/world.js";

const LAYOUT = { shop: SHOP, bigPumpkin: BIG_PUMPKIN, hollow: HOLLOW_PROPERTY };

test("the mist thins over every plot as the field grows, and over the big pumpkin", () => {
  for (const [tier, plots] of [[0, 12], [3, 18], [4, 24]]) {
    const c = mistClearings({ ...LAYOUT, patch: patchShape(tier) });
    for (const p of PLOT_POSITIONS.slice(0, plots)) {
      const left = mistLeft(p.x, p.z, c);
      assert.ok(left <= MIST_THIN + 0.05 && left > 0.1, `plot at ${p.x}, ${p.z} (tier ${tier}): ${left.toFixed(2)}`);
    }
  }
  assert.ok(PLOT_COUNTS.includes(24));
  const c = mistClearings({ ...LAYOUT, patch: patchShape(0) });
  const big = mistLeft(BIG_PUMPKIN.x, BIG_PUMPKIN.z, c);
  assert.ok(big <= MIST_THIN + 0.01 && big > 0.1, "thin, not gone, over the jack-o'-lantern");
});

test("the mist fades out round the buildings but stays on the paths and open yard", () => {
  const c = mistClearings({ ...LAYOUT, patch: patchShape(0), meadow: MEADOW });
  assert.equal(mistLeft(HOLLOW_PROPERTY.x, HOLLOW_PROPERTY.z, c), 0, "none in the Hollow House");
  assert.ok(mistLeft(HOLLOW_PROPERTY.door[0], HOLLOW_PROPERTY.door[1], c) < 0.35, "little at its door");
  assert.equal(mistLeft(SHOP.x, SHOP.z, c), 0, "none in the shop");
  assert.equal(mistLeft(MEADOW.stand[0], MEADOW.stand[1], c), 0, "none at Sandy's booth");
  for (const [x, z] of [[33, 24], [-3, 22], [30, 15], [12, 24]]) assert.ok(mistLeft(x, z, c) > 0.95, `full on open ground at ${x}, ${z}`);
  // Edges are soft: no step anywhere along a line from a building out into the yard.
  let last = mistLeft(SHOP.x, SHOP.z, c);
  for (let z = SHOP.z + 0.1; z < SHOP.z + 10; z += 0.1) { const now = mistLeft(SHOP.x, z, c); assert.ok(Math.abs(now - last) < 0.05); last = now; }
  assert.equal(mistClearings({ ...LAYOUT, patch: patchShape(0) }).spots.length, 3, "no booth until the meadow is bought");
});
