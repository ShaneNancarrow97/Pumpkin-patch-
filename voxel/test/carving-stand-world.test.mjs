// The carving stand's models and its place on the farm: lanterns cut and lit
// by stage, a pavilion with a place per bench, and a site beside the Hollow
// House that keeps clear of the house, the guests' paths and the fences.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Voxels } from "../src/voxels.js";
import { addLantern, buildStandBody, benchPlaces, LANTERN_FACES, lanternHeight } from "../src/carving-stand-models.js";
import { STAND_SITE } from "../src/carving-stand-world.js";
import { buildHollowExterior } from "../src/hollow-house-world.js";
import { HOLLOW_PROPERTY, HOLLOW_LINK, HOLLOW_RETURN, HOLLOW_FRONT_APPROACH } from "../src/content/hollow-house.js";
import { CARVING_STAND } from "../src/rules/carving-stand.js";

test("every design has a face that cuts into the lantern, and only a lit lantern glows", () => {
  assert.deepEqual(Object.keys(LANTERN_FACES).sort(), CARVING_STAND.designs.map((d) => d.id).sort());
  for (const [id, rows] of Object.entries(LANTERN_FACES)) {
    assert.equal(rows.length, 9, id); assert.ok(rows.every((r) => r.length === 13), id);
    const count = (stage) => { const v = new Voxels(); addLantern(v, 0, 0, 0, { design: id, stage }); return { solid: v.solid.length, glow: v.glow.length, boxes: [...v.solid, ...v.glow] }; };
    const whole = count("whole"), carved = count("carved"), lit = count("lit");
    assert.equal(whole.glow, 0); assert.equal(carved.glow, 0); assert.ok(lit.glow > 20, `${id} lights up`);
    for (const { boxes } of [whole, carved, lit]) {
      assert.ok(boxes.every((b) => b.slice(0, 6).every(Number.isFinite) && b[3] > 0 && b[4] > 0 && b[5] > 0), `${id}: finite boxes`);
      assert.ok(boxes.length < 700, `${id}: ${boxes.length} boxes`);
      assert.ok(Math.min(...boxes.map((b) => b[1] - b[4] / 2)) >= -1e-9, `${id} stands on its base`);
    }
  }
  assert.ok(lanternHeight() > .4 && lanternHeight() < .6);
});

test("the pavilion has a place at the bench for every bench bought, inside its footprint", () => {
  for (const n of [1, 2, 3, 4, 6]) {
    const body = buildStandBody({ benches: n, designs: ["classic", "cat"], extras: ["candle", "hat", "paint", "stand"] });
    assert.equal(body.places.length, n); assert.deepEqual(body.places, benchPlaces(n));
    for (const p of body.places) assert.ok(Math.abs(p.x) < 3.1 && p.seat < p.table, `bench at ${p.x}`);
    const boxes = [...body.voxels.solid, ...body.voxels.glow];
    assert.ok(boxes.length < 5000, `${boxes.length} boxes`);
    // The gable's great lantern may lean half a unit over the back, still well inside the back fence.
    for (const b of boxes) assert.ok(Math.abs(b[0]) <= STAND_SITE.w / 2 + .1 && b[2] <= STAND_SITE.d / 2 + .15 && b[2] >= -STAND_SITE.d / 2 - .5 && b[1] - b[4] / 2 >= -1e-9, `box inside the site: ${b.slice(0, 3)}`);
  }
});

test("the stand stands beside the Hollow House, clear of it, its paths and the fences", () => {
  const x0 = STAND_SITE.x - STAND_SITE.w / 2, x1 = STAND_SITE.x + STAND_SITE.w / 2, z0 = STAND_SITE.z - STAND_SITE.d / 2, z1 = STAND_SITE.z + STAND_SITE.d / 2;
  const house = new THREE.Box3().setFromObject(buildHollowExterior("ready", 5)), houseX0 = house.min.x + HOLLOW_PROPERTY.x;
  assert.ok(x1 < houseX0 - 1, `a gap to the house: ${x1} vs ${houseX0}`);
  assert.ok(z0 - .5 > 2.9 + .3 && x0 > -7.6 + .3, "inside the back and west fences");
  // Every guest path keeps at least a metre from the stand.
  const gap = (p) => Math.hypot(Math.max(x0 - p[0], 0, p[0] - x1), Math.max(z0 - p[1], 0, p[1] - z1));
  for (const path of [HOLLOW_LINK, HOLLOW_RETURN, HOLLOW_FRONT_APPROACH]) for (let i = 1; i < path.length; i++) for (let t = 0; t <= 1; t += .05) {
    const p = [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
    assert.ok(gap(p) >= 1, `path at ${p.map((n) => n.toFixed(1))} is ${gap(p).toFixed(2)} from the stand`);
  }
});
