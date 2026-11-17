import test from 'node:test';
import assert from 'node:assert/strict';
import { createVillagePanelTrail, villagePanelSection } from '../src/ui/village-panel-trail.js';

test('returning from a linked map restores the journal view without sharing mutable state', () => {
  const trail = createVillagePanelTrail();
  trail.open('journal');
  const view = { scroll: 320, folds: [['quest:rowan-2', true]], focus: { data: [['vgPage', 'map']] } };
  trail.open('map', undefined, { view });
  view.folds[0][1] = false;
  trail.open('map', 'copse', { view: { scroll: 140 } });
  assert.equal(trail.depth, 3);
  assert.deepEqual(trail.back(), { kind: 'map', id: undefined });
  assert.equal(trail.view().scroll, 140);
  assert.deepEqual(trail.back(), { kind: 'journal', id: undefined });
  assert.equal(trail.view().scroll, 320);
  assert.equal(trail.view().folds[0][1], true);
  const restored = trail.view(); restored.scroll = 0;
  assert.equal(trail.view().scroll, 320);
});

test('district switching replaces one detail page and dock navigation starts a fresh route', () => {
  const trail = createVillagePanelTrail(); trail.open('map'); trail.open('map', 'copse');
  trail.open('map', 'quarry', { replace: true });
  assert.equal(trail.depth, 2); assert.equal(trail.parent.id, undefined);
  trail.open('materials', undefined, { root: true, view: { scroll: 50 } });
  assert.equal(trail.depth, 1); assert.equal(trail.back(), null);
  trail.open('materials'); assert.equal(trail.depth, 1, 'selecting the same page cannot duplicate history');
});

test('closing remembers a view for the visit, while leaving clears it', () => {
  const trail = createVillagePanelTrail(); trail.open('people'); trail.remember({ scroll: 120 }); trail.dismiss();
  assert.equal(trail.depth, 0); trail.open('people'); assert.equal(trail.view().scroll, 120);
  trail.reset(); trail.open('people'); assert.equal(trail.view(), null);
  assert.equal(villagePanelSection('resident'), 'people');
  assert.equal(villagePanelSection('almanac'), 'journal');
});
