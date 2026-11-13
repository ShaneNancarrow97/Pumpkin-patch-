import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../src/model.js';
import { Voxels } from '../src/voxels.js';
import { PLAN_SCALE as K } from '../src/content/village.js';
import { BARON_HALL, baronManor } from '../src/village-manor-interior.js';
import { GRANNY_HALL, grannyCottage } from '../src/village-granny-interior.js';
import * as Homes from '../src/village-home-interiors.js';
import { EXPANSION_INSIDES, expansionHomeOpen } from '../src/village-expansion-interiors.js';
import { villageHallFree, moveVillageHallWalker } from '../src/rules/village-navigation.js';
import { createHallLife, HALL_LIFE_KINDS } from '../src/village-hall-life.js';
import { resolveVillageResidentInteraction, resolveNearbyVillageResidentInteraction } from '../src/village-resident-interaction.js';
import { readSaveFile } from '../src/save-file.js';

const rooms = [
  { id: 'baron-manor', who: 'baron', build: baronManor, hall: BARON_HALL, exports: ['baronManor', 'BARON_HALL'] },
  { id: 'granny-cottage', who: 'granny', build: grannyCottage, hall: GRANNY_HALL, exports: ['grannyCottage', 'GRANNY_HALL'] },
];
const build = fn => { const v = new Voxels(); fn(v); return v; };
function progressed() {
  const s = M.freshState(); s.earned = M.LEVELS[19].at; s.progression.claimed = M.LEVELS.map(l => l.level);
  s.progression.homeLegacyThrough = 20; s.village.invited = true; s.village.toured = true;
  s.village.expansion.effects = ['copse-restored', 'restaurant-opening', 'home-baron', 'home-granny'];
  return s;
}

test('both existing home adapters use bespoke deterministic halls within the static and pooled life budgets', () => {
  for (const room of rooms) {
    assert.equal(Homes[room.exports[0]], room.build); assert.equal(Homes[room.exports[1]], room.hall);
    assert.equal(EXPANSION_INSIDES[room.id].hall, room.hall, 'the old home ID selects the authored descriptor');
    const v = build(room.build), repeated = build(EXPANSION_INSIDES[room.id].build), boxes = v.solid.length + v.glow.length;
    assert.deepEqual(repeated.solid, v.solid); assert.deepEqual(repeated.glow, v.glow); assert.deepEqual(repeated.marks, v.marks);
    assert.ok(boxes >= 700 && boxes <= 2600, `${room.id}: ${boxes} richly furnished but bounded boxes`);
    for (const b of [...v.solid, ...v.glow]) {
      assert.ok(b.slice(0, 6).every(Number.isFinite)); assert.ok(b.slice(3, 6).every(n => n > 0));
      assert.ok(Math.abs(b[0]) <= room.hall.w / 2 + .2 && b[2] >= -room.hall.d - .2 && b[2] <= .65, 'local hall coordinates fit the existing shell');
    }
    const group = v.build({ glow: 1.6 });
    assert.ok(group.children.length <= 2, 'solid and glow remain two static batches');
    assert.ok(group.children.every(mesh => mesh.isInstancedMesh));
    const marks = v.marks.lamp;
    assert.ok(marks.length >= 2 && marks.length <= 8);
    for (const rows of Object.values(v.marks)) for (const p of rows) assert.ok(p.every(Number.isFinite));
    assert.ok(HALL_LIFE_KINDS.reduce((n, kind) => n + (v.marks[kind]?.length ?? 0), 0) >= 3);
    const life = createHallLife(v.marks); let draws = 0, lights = 0;
    life.group.traverse(o => { if (o.isInstancedMesh && o.count) draws++; if (o.isLight) lights++; });
    assert.ok(draws <= 6); assert.equal(lights, 0, 'marked lamps borrow the view’s pool');
    for (const time of [0, .1, 2, 90]) {
      life.tick(time); life.tick(time, { still: true });
      life.group.traverse(o => { if (o.isInstancedMesh) assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite)); });
    }
    life.dispose(); for (const mesh of group.children) { mesh.dispose(); mesh.material.dispose(); }
  }
});

test('the existing door and host route stays clear while actual low furniture blocks the walker', () => {
  for (const room of rooms) {
    const plan = { hall: room.hall }, v = build(room.build);
    assert.deepEqual(room.hall.spawn, [0, -1.4]); assert.deepEqual(room.hall.host, [0, -5.6]);
    let at = { x: room.hall.spawn[0], z: room.hall.spawn[1] };
    for (const [x, z] of [room.hall.host, [0, -7.7], room.hall.spawn, [0, .48]]) {
      at = moveVillageHallWalker(plan, at, x - at.x, z - at.z);
      assert.ok(Math.hypot(at.x - x, at.z - z) < 1e-7, room.id + ' walks through the central hall');
    }
    for (let x = -.75; x <= .75; x += .25) for (let z = -7.5; z <= -1; z += .25) assert.ok(villageHallFree(plan, x, z), room.id + ' keeps a broad central approach');
    for (const b of v.solid.filter(b => b[1] - b[4] / 2 < 1.2 && b[1] + b[4] / 2 > .2)) {
      const points = [[b[0], b[2]]];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) points.push([b[0] + sx * Math.max(0, b[3] / 2 - .01), b[2] + sz * Math.max(0, b[5] / 2 - .01)]);
      for (const [x, z] of points) assert.equal(villageHallFree(plan, x, z), false, room.id + ' blocks the visible body at ' + [x, z]);
    }
    for (const [x0, z0, x1, z1] of room.hall.blocks) assert.equal(villageHallFree(plan, (x0 + x1) / 2, (z0 + z1) / 2), false);
  }
});

test('bespoke hall host feet, People destination and inclusive Talk reach remain canonical', () => {
  const s = progressed();
  for (const room of rooms) {
    const plan = EXPANSION_INSIDES[room.id], view = { inside: room.id, activeExpansionArea: null, folk: {}, expansionTargets: [],
      hallPoint(x, z, y = 0) { return { x: 4000 + x * K, y: y * K, z: z * K }; } };
    const feet = view.hallPoint(...plan.hall.host), centre = { x: feet.x, z: -feet.z };
    for (const distance of [0, 3.3 - 1e-7, 3.3, 3.3 + 5e-7, 3.3 + 2e-6]) {
      const options = { id: room.who, state: s, view, position: { x: centre.x + distance, z: centre.z }, insides: EXPANSION_INSIDES, doorNormal: { east: [1, 0], south: [0, -1] } };
      const full = resolveVillageResidentInteraction(options), near = resolveNearbyVillageResidentInteraction(options);
      assert.deepEqual(full.point, centre); assert.equal(full.feet.x, feet.x); assert.equal(full.feet.z, -feet.z);
      assert.equal(full.realm, 'hall:' + room.id); assert.equal(full.location, plan.name);
      assert.equal(full.nearby, distance <= 3.3 + 1e-6); assert.deepEqual(near, full.nearby ? full : null);
    }
  }
});

test('existing version-20 saves keep home gates, owned rewards and story state through model construction', () => {
  assert.equal(M.STATE_VERSION, 20);
  const old = readSaveFile(fs.readFileSync(new URL('fixtures/save-file-v1-state20.json', import.meta.url), 'utf8'));
  assert.equal(old.ok, true);
  for (const s of [old.state, progressed()]) {
    const before = JSON.stringify(M.saveData(s)), decisions = rooms.map(room => expansionHomeOpen(s, EXPANSION_INSIDES[room.id]));
    for (const room of rooms) { room.build(new Voxels()); room.build(new Voxels()); }
    assert.equal(JSON.stringify(M.saveData(s)), before, 'constructing/revisiting a home never grants a chapter or reward');
    const restored = M.restoreState(M.saveData(s));
    assert.deepEqual(rooms.map(room => expansionHomeOpen(restored, EXPANSION_INSIDES[room.id])), decisions);
  }
  const s = progressed(), baron = EXPANSION_INSIDES['baron-manor'], granny = EXPANSION_INSIDES['granny-cottage'];
  assert.ok(expansionHomeOpen(s, baron)); assert.ok(expansionHomeOpen(s, granny));
  s.village.expansion.effects = ['copse-restored', 'restaurant-opening'];
  assert.equal(expansionHomeOpen(s, baron), false); assert.equal(expansionHomeOpen(s, granny), false);
  s.village.expansion.effects.push('granny-listens'); assert.equal(expansionHomeOpen(s, granny), true, 'Granny keeps her existing first-welcome exception');
  s.village.expansion.effects = ['home-baron', 'home-granny', 'granny-listens'];
  assert.equal(expansionHomeOpen(s, baron), false); assert.equal(expansionHomeOpen(s, granny), false, 'home effects never bypass the district gate');
});
