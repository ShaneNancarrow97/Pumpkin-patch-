import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { PLAN_SCALE as K, ROADS } from "../src/content/village.js";
import { TOWN, TOWN_GATE_PIERS, TOWN_LAMPS, inTownPlaza, townSquareObstacles } from "../src/content/village-town-square.js";
import { TOWN_SQUARE, isGap } from "../src/rules/village-spread.js";
import { villageCellFree, moveVillageWalker, villageCameraBlockers } from "../src/rules/village-navigation.js";
import { grassAt } from "../src/village-world.js";

// The builder paints the plaza's setts on a canvas; Node has none, so a stand-in that takes every call.
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const { buildTownSquare } = await import("../src/village-town-square.js");
const state = () => { const s = M.freshState(); s.village.invited = true; return s; };
const world = (x, z) => ({ x: x * K, z: z * K });

test("the square stands in the ground the spread opened, centred on the Quarry road", () => {
  const quarry = ROADS.find((r) => r.id === "quarry");
  assert.ok(quarry.points.some(([x]) => Math.abs(x / K - TOWN.cx) < .01), "the Quarry road runs through its middle");
  for (const [x, z] of [[TOWN.cx - TOWN.r, TOWN.cz], [TOWN.cx + TOWN.r, TOWN.cz], [TOWN.cx, TOWN.cz - TOWN.r], [TOWN.cx, TOWN.cz + TOWN.r]]) {
    assert.ok(z >= TOWN_SQUARE.z0 && z <= TOWN_SQUARE.z1, "inside the band"); assert.equal(isGap(x, z), true, `${x},${z} is new ground`);
  }
  const g = TOWN.gate, road = 3;
  assert.ok(g.open / 2 > road, "the gate's arch is wider than the road it spans");
  assert.ok(g.z - g.d / 2 > TOWN.cz + TOWN.r, "and stands just beyond the plaza");
});

test("nothing in the square stands in anything else", () => {
  const things = [
    { id: "fountain", ...TOWN.fountain, r: TOWN.fountain.r + .3 }, { id: "bandstand", ...TOWN.bandstand, r: TOWN.bandstand.r + .4 },
    ...TOWN.stalls.map((s, i) => ({ id: "stall " + i, x: s.x, z: s.z, r: 1.9 })), ...TOWN.benches.map((b, i) => ({ id: "bench " + i, x: b.x, z: b.z, r: 1.15 })),
    ...TOWN.planters.map((p, i) => ({ id: "planter " + i, x: p.x, z: p.z, r: 1.3 })), ...TOWN.lamps.map((l, i) => ({ id: "lamp " + i, x: l.x, z: l.z, r: .35 })),
  ];
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
    const a = things[i], b = things[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.r + b.r - .05, `${a.id} and ${b.id} overlap`);
  }
  for (const l of TOWN.lamps) assert.ok(Math.abs(l.x - TOWN.cx) > 3.3 || Math.abs(l.z - TOWN.cz) < TOWN.r - 3, "no lamp on the road's way in or out");
});

test("the road walks from the Green through the square and under the Moonclock to the Quarry side", () => {
  const s = state();
  // Up the road, round the fountain's east side (between it and the bandstand), and on through the arch.
  let p = world(TOWN.cx + 2.5, 36);
  for (const [x, z] of [[TOWN.cx + 2.5, 50], [TOWN.cx + 6, 54], [TOWN.cx + 6, 62], [TOWN.cx + 2.5, 66], [TOWN.cx, 72], [TOWN.cx, 82]]) {
    const to = world(x, z); p = moveVillageWalker(s, p, to.x - p.x, to.z - p.z);
    assert.ok(Math.hypot(p.x - to.x, p.z - to.z) < .05, `reaches ${x},${z}`);
  }
  assert.equal(villageCellFree(s, ...Object.values(world(TOWN.cx, TOWN.gate.z))), true, "under the arch");
  for (const pier of TOWN_GATE_PIERS) assert.equal(villageCellFree(s, ...Object.values(world((pier.x0 + pier.x1) / 2, TOWN.gate.z))), false, "the piers are solid");
  assert.equal(villageCellFree(s, ...Object.values(world(TOWN.cx, TOWN.cz))), false, "the fountain is in the way");
  assert.equal(villageCellFree(s, ...Object.values(world(TOWN.bandstand.x, TOWN.bandstand.z))), false, "so is the bandstand");
  for (const st of TOWN.stalls) assert.equal(villageCellFree(s, ...Object.values(world(st.x, st.z))), false, "and the stalls");
  assert.equal(villageCellFree(s, ...Object.values(world(TOWN.cx + 7, TOWN.cz - 6))), true, "the plaza round them is open");
  assert.ok(townSquareObstacles().length >= 12);
  const blockers = villageCameraBlockers();
  assert.ok(TOWN_GATE_PIERS.every((p) => blockers.some((b) => Math.abs(b.x0 - p.x0 * K) < 1e-9 && Math.abs(b.z1 - p.z1 * K) < 1e-9)), "the camera stops at the piers");
});

test("grass grows round the square but not on its setts", () => {
  assert.equal(grassAt(TOWN.cx + 7, TOWN.cz + 6), null); assert.equal(grassAt(TOWN.cx, TOWN.gate.z), null);
  assert.ok(grassAt(TOWN.cx - TOWN.r - 3, TOWN.cz), "lawn beyond the plaza");
  assert.equal(inTownPlaza(TOWN.cx + TOWN.r - .5, TOWN.cz), true);
});

test("the square is built in bounded batches, adds no lights and its clock keeps the time", () => {
  const group = buildTownSquare();
  let boxes = 0, meshes = 0, lights = 0;
  group.traverse((o) => { if (o.isInstancedMesh) boxes += o.count; if (o.isMesh) meshes++; if (o.isLight) lights++; });
  assert.ok(boxes <= 9000, `${boxes} boxes`); assert.ok(meshes <= 32, `${meshes} meshes`); assert.equal(lights, 0);
  assert.equal(group.userData.spread, "native", "drawn where it stands, never moved again");
  const hands = []; group.traverse((o) => { if (o.userData?.kind) hands.push(o); });
  assert.equal(hands.length, 4, "an hour and a minute hand on each face");
  group.userData.tick(new Date(2026, 9, 31, 3, 0, 0));
  const south = (kind) => hands.find((h) => h.userData.face === 1 && h.userData.kind === kind);
  assert.ok(Math.abs(south("h").rotation.z + Math.PI / 2) < 1e-9, "three o'clock: the hour hand points east");
  assert.ok(Math.abs(south("m").rotation.z) < 1e-9, "on the hour: the minute hand points up");
  group.userData.tick(new Date(2026, 9, 31, 9, 30, 0));
  assert.ok(Math.abs(south("m").rotation.z + Math.PI) < 1e-9, "half past: the minute hand points down");
  assert.ok(TOWN_LAMPS.length >= 14, "the square's lamps light it");
});
