import test from 'node:test';
import assert from 'node:assert/strict';
import { villageMenuActionCopy } from '../src/ui/village-controls.js';

test('focused transactions prefer their explicit controller name over repeated catalogue copy', () => {
  const copy = villageMenuActionCopy({ label: 'Buy lantern · £120', accessible: 'Buy a brass lantern for £120', heading: 'Brass lantern', text: 'Brass lantern 3 stored A warm little welcome for the garden £120 Buy' });
  assert.deepEqual(copy, { label: 'Buy lantern · £120', accessible: 'Buy lantern · £120' });
  assert.equal(villageMenuActionCopy({ accessible: 'Find Rowan', heading: 'Rowan Rattlewood', text: 'Rowan Rattlewood Scarecrow carpenter Find' }).label, 'Find Rowan');
});

test('unlabelled cards use their short heading while plain controls keep their own text', () => {
  assert.equal(villageMenuActionCopy({ heading: 'Satchel', text: 'Satchel Materials and supplies' }).label, 'Satchel');
  assert.equal(villageMenuActionCopy({ text: '  Show   the walking route  ' }).label, 'Show the walking route');
  assert.equal(villageMenuActionCopy({ label: ' ', accessible: '\n', heading: '', text: '' }).label, 'Select');
});

test('disclosure action changes from Expand to Collapse with the actual open state', () => {
  assert.equal(villageMenuActionCopy({ tag: 'SUMMARY', text: 'Story & rewards', expanded: false }).label, 'Expand Story & rewards');
  assert.equal(villageMenuActionCopy({ tag: 'SUMMARY', text: 'Story & rewards', expanded: true }).label, 'Collapse Story & rewards');
});

test('long action names stay bounded visually and retain their complete accessible text', () => {
  const name = 'Show walking route to Granny Brambletooth’s enchanted pumpkin garden';
  const copy = villageMenuActionCopy({ accessible: name });
  assert.ok(copy.label.length <= 42);
  assert.ok(copy.label.endsWith('…'));
  assert.equal(copy.accessible, name);
  assert.equal(villageMenuActionCopy({ text: 'A'.repeat(100) }).label.length, 42);
});
