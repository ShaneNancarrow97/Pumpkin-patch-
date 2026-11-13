import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import * as M from "../src/model.js";
import { ARRIVAL, NODES, ROADS, PLAN_SCALE as K } from "../src/content/village.js";
import { villageNodeCandidates } from "../src/content/village-node-sites.js";
import { moveVillageWalker } from "../src/rules/village-navigation.js";
import { C, canopyTree } from "../src/village-models.js";
import { seeded } from "../src/voxels.js";
import { groundHeight } from "../src/village-terrain.js";
import { buildGreen } from "../src/village-world.js";
import { villageEntrance, villageForecourt, entranceAutumnTree, VILLAGE_ENTRANCE_BUDGET, VILLAGE_ENTRANCE_PLANTING, VILLAGE_FORECOURT_BUDGET, VILLAGE_FORECOURT_AREAS } from "../src/village-entrance-dressing.js";

function record(draw) {
  const boxes = [];
  draw({ block(...b) { boxes.push(b); } });
  return boxes;
}
const entrance = () => record(villageEntrance);
const overlaps = (b, x0, z0, x1, z1) => b[0] + b[3] / 2 > x0 && b[0] - b[3] / 2 < x1 && b[2] + b[5] / 2 > z0 && b[2] - b[5] / 2 < z1;

test("the dressed native gate has finite bounded geometry and leaves the full arrival lane open", () => {
  const boxes = entrance();
  assert.deepEqual(boxes, entrance());
  assert.equal(boxes.length, 1356);
  assert.ok(boxes.length <= VILLAGE_ENTRANCE_BUDGET.boxes);
  assert.equal(VILLAGE_ENTRANCE_BUDGET.lights, 0);
  assert.equal(VILLAGE_ENTRANCE_BUDGET.textureBytes, 0);
  const cartoucheBody = boxes.find(b => b[0] === 58 && Math.abs(b[3] - .1 * .43) < 1e-9 && Math.abs(b[4] - .57 * .43) < 1e-9);
  assert.ok(cartoucheBody[2] < .21, "the cartouche's raised body faces the arriving owner, in front of its wings");
  for (const b of boxes) {
    assert.ok(b.slice(0, 7).every(Number.isFinite));
    assert.ok(b.slice(3, 6).every(v => v > 0));
    assert.ok(b[1] >= 0 && b[1] + b[4] < 6);
    if (b[7]) assert.ok(b[3] * b[4] * b[5] < .025, "only the old lantern's small panes emit");
    if (b[1] < 2.3 / K && b[1] + b[4] > .1) {
      assert.equal(overlaps(b, 55, -15, 61, 8), false, "visible art leaves the full six-unit arrival road clear");
      const inPier = [54, 62].some(x => b[0] - b[3] / 2 >= x - .7 - 1e-9 && b[0] + b[3] / 2 <= x + .7 + 1e-9 && b[2] - b[5] / 2 >= -.1 - 1e-9 && b[2] + b[5] / 2 <= 1.3 + 1e-9);
      const inPlanting = [...VILLAGE_ENTRANCE_PLANTING, ...VILLAGE_FORECOURT_AREAS].some(a => b[0] - b[3] / 2 >= a.x0 && b[0] + b[3] / 2 <= a.x1 && b[2] - b[5] / 2 >= a.z0 && b[2] + b[5] / 2 <= a.z1);
      assert.ok(inPier || inPlanting, "low details stay in the old piers or soft underplanting");
    }
  }
  for (const n of NODES) for (const p of villageNodeCandidates(n)) for (const b of boxes) {
    const dx = Math.max(0, Math.abs(p.x / K - b[0]) - b[3] / 2), dz = Math.max(0, Math.abs(p.z / K - b[2]) - b[5] / 2);
    assert.ok(Math.hypot(dx, dz) * K > .65, n.id + " keeps every saved-cycle approach clear");
  }
});

test("low forecourt islands leave every road and both forage cross-paths uncovered", () => {
  const boxes = record(villageForecourt);
  assert.deepEqual(boxes, record(villageForecourt));
  assert.equal(boxes.length, 640);
  assert.ok(boxes.length <= VILLAGE_FORECOURT_BUDGET.boxes);
  assert.equal(VILLAGE_FORECOURT_BUDGET.lights, 0);
  for (const b of boxes) {
    assert.ok(b[1] + b[4] < VILLAGE_FORECOURT_BUDGET.maxHeight, "short groundcover keeps the approach and camera open");
    assert.ok(Math.max(b[3], b[5]) <= .3, "fine leaf, flower and pebble details cannot become broad lawn-covering tiles");
    assert.ok(!b[7], "the forecourt adds no emissive surfaces or new lamp candidates");
    for (const road of ROADS) for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1].map(v => v / K), [bx, bz] = road.points[i].map(v => v / K), half = road.width / K / 2;
      assert.equal(overlaps(b, Math.min(ax, bx) - half, Math.min(az, bz) - half, Math.max(ax, bx) + half, Math.max(az, bz) + half), false, road.id + " retains all of its visible paving");
    }
  }
});

test("autumn colour preserves every original maple box, wood colour and random draw", () => {
  for (const [x, z] of [[52.2, 4], [63.8, 4]]) {
    const oldRandom = seeded(101), newRandom = seeded(101);
    const old = record(f => canopyTree(f, x, z, 1.25, oldRandom, C.crimson, { cell: .3 }));
    const next = record(f => entranceAutumnTree(f, x, z, 1.25, newRandom));
    assert.deepEqual(next.map(b => b.slice(0, 6)), old.map(b => b.slice(0, 6)));
    assert.equal(newRandom(), oldRandom(), "later village scenery receives exactly the same random state");
    assert.deepEqual(next.slice(0, 9).map(b => b.slice(0, 7)), old.slice(0, 9).map(b => b.slice(0, 7)), "trunk, roots and branches retain their colour and clearance");
    assert.ok(next.filter((b, i) => b[6] !== old[i][6]).length > 400, "the existing crowns gain a full autumn palette");
  }
});

test("the actual Green contains the entrance once and leaves all other geometry and colours unchanged", () => {
  const green = buildGreen(), outside = [], actual = new Map();
  let boxes = 0, meshes = 0, lights = 0;
  green.traverse(m => {
    if (m.isMesh) meshes++;
    if (m.isLight) lights++;
    if (!m.isInstancedMesh) return;
    for (let i = 0; i < m.count; i++) {
      boxes++;
      const a = Array.from(m.instanceMatrix.array.slice(i * 16, i * 16 + 16)), c = Array.from(m.instanceColor.array.slice(i * 3, i * 3 + 3));
      const key = JSON.stringify([a[0], a[5], a[10], a[12], a[13], -a[14], ...c]);
      actual.set(key, (actual.get(key) ?? 0) + 1);
      if (!(a[12] >= 48 && a[12] <= 68 && -a[14] >= -15 && -a[14] <= 8)) outside.push([...a, ...c]);
    }
  });
  assert.equal(green.userData.spread, "native");
  assert.equal(boxes, 40089); assert.equal(meshes, 39); assert.equal(lights, 0);
  assert.equal(green.userData.visualBudget.boxes, boxes);
  // Baseline recorded before dressing on bebcb19. The narrow entrance/crown
  // exclusion now also spans its forecourt; it contained no earlier Green boxes.
  outside.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.equal(outside.length, 36655);
  assert.equal(createHash("sha256").update(JSON.stringify(outside)).digest("hex"), "5d04f61ec0afc79e80d3d91fcf635586c7c074beeb3df3035eabf90ca0bd232f");
  for (const b of entrance()) {
    const c = new THREE.Color(b[6]);
    const key = JSON.stringify([b[3], b[4], b[5], b[0], b[1] + groundHeight(b[0], b[2]) + b[4] / 2, b[2], c.r, c.g, c.b].map(Math.fround));
    assert.ok(actual.get(key) > 0, "an authored box lands on the native ground with no second spread or scale");
    actual.set(key, actual.get(key) - 1);
  }
});

test("the fresh arrival and carriage return remain walkable without changing the save", () => {
  const s = M.freshState(), saved = JSON.stringify(M.saveData(s));
  const route = [ARRIVAL.back, ARRIVAL.spawn, [87, -16.5], [87, 0], [87, 1.8], [87, 6], [87, 18], [87, 30]];
  let p = { x: route[0][0], z: route[0][1] };
  for (const [x, z] of [...route.slice(1), ...route.slice(0, -1).reverse()]) {
    p = moveVillageWalker(s, p, x - p.x, z - p.z);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 1e-7, `arrival and return reach ${x},${z}`);
  }
  assert.equal(JSON.stringify(M.saveData(s)), saved);
});
