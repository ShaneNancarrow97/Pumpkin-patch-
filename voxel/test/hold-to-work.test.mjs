// Holding the action in play mode (handover 67): it walks to the nearest plot
// that needs the job, across the whole patch, and with bare hands moves on to
// whatever comes next (pick, then water, then plant).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, openPlots } from '../src/model.js';
import { selectNearestPlot, HOLD_ORDER } from '../src/rules/life-actions.js';
import { PLOTS } from '../src/world.js';

test('the nearest plot needing a job, in the order given', () => {
  const s = freshState(), n = openPlots(s), far = n - 1;
  for (let i = 0; i < n; i++) s.plots[i] = { phase: 'growing', progress: .2, variety: 0, wateredAt: s.time };
  s.plots[far] = { phase: 'ready', progress: 1, variety: 0, ripe: s.time };
  s.plots[0] = { phase: 'empty', progress: 0, variety: 0 };
  const from = { x: PLOTS[0].x, z: PLOTS[0].z };
  // Picking comes first, however far away.
  assert.equal(selectNearestPlot(s, from, HOLD_ORDER, PLOTS).index, far);
  assert.equal(selectNearestPlot(s, from, HOLD_ORDER, PLOTS).kind, 'harvest');
  // Planting only: the empty plot.
  assert.equal(selectNearestPlot(s, from, ['plant'], PLOTS).index, 0);
  // Skipping the plot just done, and nothing at all when nothing needs doing.
  assert.equal(selectNearestPlot(s, { ...from, skip: 0 }, ['plant'], PLOTS), null);
  assert.equal(selectNearestPlot(s, from, ['plant'], PLOTS, .01)?.index ?? null, 0, 'standing on it');
  assert.equal(selectNearestPlot(s, null, HOLD_ORDER, PLOTS), null);
});

test('a paused farm offers no work', () => {
  const s = freshState(); s.paused = true;
  assert.equal(selectNearestPlot(s, { x: PLOTS[0].x, z: PLOTS[0].z }, HOLD_ORDER, PLOTS), null);
});
