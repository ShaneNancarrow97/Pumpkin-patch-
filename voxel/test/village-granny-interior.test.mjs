import test from 'node:test';
import assert from 'node:assert/strict';
import { Voxels } from '../src/voxels.js';
import { GRANNY_HALL, grannyCottage } from '../src/village-granny-interior.js';
import { createHallLife } from '../src/village-hall-life.js';
import { villageHallFree, moveVillageHallWalker } from '../src/rules/village-navigation.js';

const plan = { hall: GRANNY_HALL }, build = () => { const v = new Voxels(); grannyCottage(v); return v; };

test('Granny’s authored cottage is deterministic, finite and bounded to two static batches without lights', () => {
  const v = build(), again = build(), boxes = v.solid.length + v.glow.length;
  assert.ok(boxes >= 700 && boxes <= 2600, `${boxes} boxes furnish the cottage within its static budget`);
  assert.deepEqual(v.solid, again.solid); assert.deepEqual(v.glow, again.glow); assert.deepEqual(v.marks, again.marks);
  assert.equal(Object.isFrozen(GRANNY_HALL), true); assert.ok(GRANNY_HALL.blocks.every(Object.isFrozen));
  for (const b of [...v.solid, ...v.glow]) { assert.ok(b.every(Number.isFinite)); assert.ok(b.slice(3, 6).every(n => n > 0)); }
  const group = v.build(); let meshes = 0, lights = 0;
  group.traverse(o => { if (o.isInstancedMesh) meshes++; if (o.isLight) lights++; });
  assert.equal(meshes, 2); assert.equal(lights, 0);
  for (const mesh of group.children) { mesh.dispose(); mesh.material.dispose(); }
});

test('the cottage keeps its original spawn, host and exit clear while substantial visible furniture is solid', () => {
  assert.equal(GRANNY_HALL.w, 12); assert.equal(GRANNY_HALL.d, 10);
  assert.deepEqual(GRANNY_HALL.spawn, [0, -1.4]); assert.deepEqual(GRANNY_HALL.host, [0, -5.6]);
  let from = { x: GRANNY_HALL.spawn[0], z: GRANNY_HALL.spawn[1] };
  for (const [x, z] of [[0, -5.6], [-2.35, -7], [0, -5.6], [2.55, -6.8], [2.4, -5.6], [3.5, -4.75], [0, -3], [-3, -2.1], [0, -1.4], [0, .6]]) {
    assert.ok(villageHallFree(plan, x, z), `clear approach ${x},${z}`);
    const end = moveVillageHallWalker(plan, from, x - from.x, z - from.z);
    assert.ok(Math.hypot(end.x - x, end.z - z) < 1e-7, `the real walker reaches ${x},${z}`); from = end;
  }
  for (const [x0, z0, x1, z1] of GRANNY_HALL.blocks) assert.equal(villageHallFree(plan, (x0 + x1) / 2, (z0 + z1) / 2), false);
  // Inspect actual low model bodies, not just the declared rectangles. Low
  // rugs and wall-only trims are excluded; tables, seats, cabinets and beds
  // must have no visible overhang that can be walked through.
  const bodies = build().solid.filter(([x, y, z, w, h, d]) => y - h / 2 >= .13 && y - h / 2 <= 1.2 && y + h / 2 > .4 && w >= .2 && d >= .2 && Math.abs(x) < 5.5 && z < -1 && z > -9.7);
  assert.ok(bodies.length > 70, 'the checks cover substantial furniture throughout the room');
  for (const [x, , z, w, , d] of bodies) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = x + sx * (w / 2 - .015), pz = z + sz * (d / 2 - .015);
    assert.equal(villageHallFree(plan, px, pz), false, `visible furniture at ${px},${pz} has collision`);
  }
});

test('hearth, candles, kettle steam and motes use the existing bounded hall-life batches and lamp pool', () => {
  const v = build(), marks = v.marks;
  assert.equal(marks.lamp.length, 4); assert.equal(marks.fire.length, 2); assert.equal(marks.steam.length, 2);
  assert.ok(marks.candle.length >= 4); assert.equal(marks.motes.length, 2);
  for (const list of Object.values(marks)) for (const p of list) assert.ok(p.every(Number.isFinite));
  const life = createHallLife(marks); let meshes = 0, lights = 0;
  life.group.traverse(o => { if (o.isInstancedMesh && o.count) meshes++; if (o.isLight) lights++; });
  assert.equal(meshes, 5); assert.equal(lights, 0);
  for (const t of [0, .5, 8, 120]) {
    life.tick(t); life.tick(t, { still: true });
    life.group.traverse(o => { if (o.isInstancedMesh) assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite)); });
  }
  life.dispose();
});
