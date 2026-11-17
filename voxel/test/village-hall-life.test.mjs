import test from 'node:test';
import assert from 'node:assert/strict';
import { Voxels } from '../src/voxels.js';
import { createHallLife, HALL_LIFE_KINDS } from '../src/village-hall-life.js';
import { EXPANSION_INSIDES } from '../src/village-expansion-interiors.js';
import { velvetBatHall, elowenLibrary, rowanWorkshop } from '../src/village-models.js';
import { HALL_VIEW } from '../src/village-camera.js';

test('every authored hall has something moving in it, drawn without a light or a draw per mark', () => {
  const halls = { 'velvet-bat': velvetBatHall, 'elowen-library': elowenLibrary, 'rowan-workshop': rowanWorkshop, 'mabel-cottage': EXPANSION_INSIDES['mabel-cottage'].build, 'tansy-cottage': EXPANSION_INSIDES['tansy-cottage'].build, 'opal-studio': EXPANSION_INSIDES['opal-studio'].build, 'cinder-restaurant': EXPANSION_INSIDES['cinder-restaurant'].build };
  for (const [id, build] of Object.entries(halls)) {
    const v = new Voxels(); build(v);
    const moving = HALL_LIFE_KINDS.reduce((n, kind) => n + (v.marks[kind]?.length ?? 0), 0);
    assert.ok(moving >= 3, `${id} has at least three moving details (${moving})`);
    const life = createHallLife(v.marks);
    let lights = 0, draws = 0; life.group.traverse(o => { if (o.isLight) lights++; if (o.isInstancedMesh && o.count) draws++; });
    assert.equal(lights, 0, id + ' adds no lights');
    assert.ok(draws <= 6, `${id} draws its moving details in at most six instanced draws (${draws})`);
    life.tick(1.5); life.tick(3, { still: true }); life.dispose();
  }
});

test('flames, steam and motes stay beside their marks as time passes', () => {
  const life = createHallLife({ fire: [[1, .5, -2]], candle: [[0, 1, 0]], steam: [[2, 1, -3]], motes: [[0, 2, -4]], sparkle: [[3, 2, -5]], pendulum: [[-2, 3, -1]] });
  assert.deepEqual(life.counts, { fire: 1, candle: 1, steam: 1, motes: 1, sparkle: 1, pendulum: 1 });
  for (const t of [0, .4, 7.3, 120]) {
    life.tick(t);
    life.group.traverse(o => {
      if (!o.isInstancedMesh) return;
      for (let i = 0; i < o.count; i++) { const m = o.instanceMatrix.array, x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14]; assert.ok([x, y, z].every(Number.isFinite)); assert.ok(Math.abs(x) < 6 && y > -1 && y < 5 && z > -8 && z < 2, `instance ${i} strayed to ${x},${y},${z}`); }
    });
  }
});

test('the hall camera stands low enough to show the back wall', () => {
  assert.ok(HALL_VIEW.pitch < 30 * Math.PI / 180 && HALL_VIEW.pitch >= HALL_VIEW.minPitch);
  assert.ok(HALL_VIEW.lift > 0);
});
