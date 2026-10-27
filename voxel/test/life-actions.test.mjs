import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, saveData, plant, harvest, barnCapacity } from '../src/model.js';
import { waterPlot } from '../src/rules/hands-on.js';
import { LIFE_ACTIONS, beginAction, tickAction, cancelAction, actionProgress, actionAvailable, selectNextPlot } from '../src/rules/life-actions.js';

test('tool progress has no farm effects before the caller commits one completion', () => {
  const s = freshState(), before = JSON.stringify(saveData(s)), job = beginAction(s, { type: 'plot', index: 0, distance: 1 }, 'hand');
  assert.equal(job.kind, 'plant'); assert.equal(tickAction(s, job, .4), null); assert.equal(actionProgress(job), .5);
  assert.equal(JSON.stringify(saveData(s)), before);
  const event = tickAction(s, job, .4); assert.deepEqual(event, { kind: 'plant', target: { type: 'plot', index: 0 } });
  assert.equal(tickAction(s, job, 10), null); assert.equal(JSON.stringify(saveData(s)), before);
  assert.equal(plant(s, event.target.index), true); assert.equal(s.plots[0].phase, 'growing');
});

test('early release cancels without planting, watering or selling anything', () => {
  const s = freshState(), before = JSON.stringify(saveData(s)), job = beginAction(s, { type: 'plot', index: 0 }, 'plant');
  tickAction(s, job, .79); assert.equal(cancelAction(job), true); assert.equal(cancelAction(job), false);
  assert.equal(tickAction(s, job, 100), null); assert.equal(actionProgress(job), 0); assert.equal(JSON.stringify(saveData(s)), before);
});

test('helper replacement and phase changes invalidate the original gesture', () => {
  const s = freshState(), job = beginAction(s, { type: 'plot', index: 0 }, 'plant');
  plant(s, 0); assert.equal(tickAction(s, job, 1), null); assert.equal(job.status, 'invalid');
  s.plots[1].phase = 'ready'; const pick = beginAction(s, { type: 'plot', index: 1 }, 'harvest');
  harvest(s, 1); plant(s, 1); assert.equal(tickAction(s, pick, 1), null); assert.equal(pick.status, 'invalid');
});

test('water gestures honour the live cooldown and cannot invent growth or coins', () => {
  const s = freshState(); plant(s, 0); const money = s.coins, job = beginAction(s, { type: 'plot', index: 0 }, 'water');
  assert.equal(tickAction(s, job, LIFE_ACTIONS.water.seconds).kind, 'water'); assert.equal(s.plots[0].progress, 0);
  assert.equal(waterPlot(s, 0), true); assert.equal(s.plots[0].progress, .12); assert.equal(beginAction(s, { type: 'plot', index: 0 }, 'water'), null);
  assert.equal(s.coins, money); s.time += 12; assert.ok(beginAction(s, { type: 'plot', index: 0 }, 'water'));
});

test('full storage, closed plots, remote targets and mismatched tools reject safely', () => {
  const s = freshState(); s.plots[0].phase = 'ready'; s.stock = [barnCapacity(s), 0, 0, 0, 0];
  assert.equal(beginAction(s, { type: 'plot', index: 0 }, 'harvest'), null);
  assert.equal(beginAction(s, { type: 'plot', index: 23 }, 'plant'), null);
  assert.equal(beginAction(s, { type: 'plot', index: 1, distance: 2 }, 'plant'), null);
  assert.equal(beginAction(s, { type: 'plot', index: 1 }, 'clean'), null);
  assert.equal(beginAction(s, { type: 'piece', instance: 'piece-0' }, 'hand'), null);
});

test('pause freezes progress, and disappeared litter cannot be cleaned twice', () => {
  const s = freshState(); s.cleanliness.litter.push({ id: 'litter-0', x: 31, z: 12, kind: 0 });
  const job = beginAction(s, { type: 'litter', id: 'litter-0' }, 'hand'); tickAction(s, job, .3); s.paused = true;
  assert.equal(tickAction(s, job, 9), null); assert.equal(job.elapsed, .3); s.paused = false; s.cleanliness.litter = [];
  assert.equal(tickAction(s, job, 1), null); assert.equal(job.status, 'invalid');
});

test('hold chaining stays local, chooses useful phases and skips watered crops', () => {
  const s = freshState(), positions = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }, { x: 8, z: 0 }, { x: 1, z: 1 }, { x: 0, z: 2 }];
  plant(s, 1); plant(s, 2); waterPlot(s, 1);
  assert.equal(selectNextPlot(s, 0, 'water', positions).index, 2);
  assert.equal(selectNextPlot(s, 0, 'plant', positions).index, 4);
  assert.equal(selectNextPlot(s, 0, 'harvest', positions), null);
  s.plots[3].phase = 'ready'; assert.equal(selectNextPlot(s, 0, 'harvest', positions), null);
  assert.equal(actionAvailable(s, { type: 'plot', index: 1 }, 'water'), false);
});

test('large and invalid frame times cannot duplicate completion or corrupt progress', () => {
  const s = freshState(), job = beginAction(s, { type: 'plot', index: 0 });
  for (const dt of [NaN, Infinity, -1, 0]) assert.equal(tickAction(s, job, dt), null);
  assert.equal(job.elapsed, 0); assert.ok(tickAction(s, job, 999)); assert.equal(actionProgress(job), 1);
  assert.equal(tickAction(s, job, 999), null); assert.equal(cancelAction(job), false);
});
