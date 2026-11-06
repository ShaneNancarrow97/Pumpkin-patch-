// Kitchen tools set themselves down where a cook would want them: cookers
// against the back wall but never in the hearth, pans and racks hung at
// worktop height or above, never down at the skirting.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import * as E from "../src/rules/kitchen-equipment.js";

test("bought kitchen tools are placed tidily", () => {
  const s = M.freshState(); s.coins = 1e6; s.earned = M.LEVELS[12].at; s.house.level = 3; s.kitchen.purchased = true;
  const hearth = M.wallZones(s, "kitchen", "back").find((z) => z.kind === "hearth");
  for (const id of ["kitchen-hob", "kitchen-oven", "kitchen-pot-rail", "kitchen-pan-rail", "kitchen-baking-rack", "kitchen-spice-shelf"]) {
    const r = E.buyCookingEquipment(s, id), p = s.house.placed.find((q) => q.instance === r.instance);
    assert.ok(r.placed, id);
    if (M.footprint(id).layer === "wall") assert.ok(M.wallMountHeight(s, p) >= 1.1, `${id} hangs at worktop height or above`);
    else {
      assert.equal(p.z, 0, `${id} stands against the back wall`);
      if (hearth) assert.ok(p.x + M.footprint(id).w <= hearth.x + 1e-6 || p.x >= hearth.x + hearth.w - 1e-6, `${id} is clear of the hearth`);
    }
  }
  assert.deepEqual(E.kitchenEquipment(s).sort(), ["hob", "oven", "pan", "pot", "spice", "tray"]);
});
