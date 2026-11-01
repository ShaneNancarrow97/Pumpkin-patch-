import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../../../../src/model.js';
import { LEVELS, patchLevel } from '../../../../src/rules/levels.js';
import { kitchenEquipment } from '../../../../src/rules/kitchen-equipment.js';
import { hollowReady } from '../../../../src/rules/hollow-house.js';
import { hayrideReady } from '../../../../src/rules/hayride.js';
import { worldFestivalContext } from '../adapters/readiness.js';

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

test('a new world supplies facts without granting a kitchen, event or attraction', () => {
  const s = freshState(), c = worldFestivalContext(s);
  assert.deepEqual(Object.keys(c).sort(), ['attractions', 'cocoaTier', 'gardenDecorIds', 'houseLevel', 'kitchenCapabilities', 'kitchenPurchased', 'knownRecipes', 'level', 'paused', 'visitorEventIds'].sort());
  assert.equal(c.level, patchLevel(s).level);
  assert.equal(c.level, 1);
  assert.equal(c.kitchenPurchased, false);
  assert.deepEqual(c.kitchenCapabilities, []);
  assert.deepEqual(c.knownRecipes, []);
  assert.deepEqual(c.visitorEventIds, []);
  assert.equal(c.cocoaTier, 0);
  assert.equal(c.attractions['hollow-house'].ready, false);
  assert.equal(c.attractions.hayride.ready, false);
  assert.equal(c.paused, false);
});

test('readiness follows claimed levels and home gates, never raw earnings alone', () => {
  const s = freshState();
  s.earned = LEVELS.at(-1).at;
  const gated = worldFestivalContext(s).level;
  assert.equal(gated, patchLevel(s).level);
  assert.ok(gated < LEVELS.at(-1).level, 'an empty home cannot claim every late level from earnings');
  s.progression.claimed = LEVELS.slice(0, 15).map(item => item.level);
  assert.equal(worldFestivalContext(s).level, 15, 'the same kept level returned by the actual rule');
  s.earned = 0;
  assert.equal(worldFestivalContext(s).level, patchLevel(s).level);
  assert.equal(worldFestivalContext(s).level, 15, 'the adapter does not undo the rule’s kept-level policy');
});

test('owned equipment in storage and equipment placed in the wrong room grant no capability', () => {
  const s = freshState();
  s.kitchen.purchased = true;
  s.house.level = 3;
  s.house.owned.push('copper-range', 'gothic-spice-cabinet', 'kitchen-hob');
  assert.deepEqual(worldFestivalContext(s).kitchenCapabilities, []);
  const range = { instance: 'contract-range', id: 'copper-range', room: 'parlour', x: 2, z: 2 };
  s.house.placed.push(range);
  assert.deepEqual(worldFestivalContext(s).kitchenCapabilities, []);
  range.room = 'kitchen';
  assert.deepEqual(new Set(worldFestivalContext(s).kitchenCapabilities), new Set(['hob', 'oven', 'tray', 'pot', 'pan']));
  assert.deepEqual(worldFestivalContext(s).kitchenCapabilities, kitchenEquipment(s, 'home'));
  s.house.placed.push({ instance: 'contract-spices', id: 'gothic-spice-cabinet', room: 'kitchen', x: 4, z: 1 });
  assert.ok(worldFestivalContext(s).kitchenCapabilities.includes('spice'));
  s.house.level = 1;
  assert.deepEqual(worldFestivalContext(s).kitchenCapabilities, [], 'a locked kitchen is not useful merely because an invalid placed record names it');
});

test('actual starter equipment and premium gear provide equivalent required kitchen capabilities', () => {
  const starter = freshState(), premium = freshState();
  for (const s of [starter, premium]) { s.house.level = 3; s.kitchen.purchased = true; }
  starter.house.placed = ['kitchen-hob', 'kitchen-oven', 'kitchen-pot-rail', 'kitchen-pan-rail', 'kitchen-baking-rack', 'kitchen-spice-shelf'].map((id, i) => ({ instance: 'starter-' + i, id, room: 'kitchen', x: i, z: 1 }));
  premium.house.placed = ['copper-range', 'gothic-spice-cabinet'].map((id, i) => ({ instance: 'premium-' + i, id, room: 'kitchen', x: i, z: 1 }));
  assert.deepEqual(new Set(worldFestivalContext(starter).kitchenCapabilities), new Set(worldFestivalContext(premium).kitchenCapabilities));
  assert.deepEqual(new Set(worldFestivalContext(premium).kitchenCapabilities), new Set(['hob', 'oven', 'tray', 'pot', 'pan', 'spice']));
  assert.deepEqual(premium.kitchen.pantry, freshState().kitchen.pantry, 'readiness snapshots do not require adding ingredients or change inventory');
});

test('attraction purchase, restoration, tiers, routes and open flags stay separate facts', () => {
  const s = freshState();
  s.hollowHouse.open = true; s.hollowHouse.tier = 4;
  assert.equal(worldFestivalContext(s).attractions['hollow-house'].ready, false);
  s.hollowHouse.purchased = true; s.hollowHouse.status = 'restoring';
  assert.equal(worldFestivalContext(s).attractions['hollow-house'].ready, hollowReady(s));
  assert.equal(hollowReady(s), false);
  s.hollowHouse.status = 'ready'; s.hollowHouse.open = false;
  assert.deepEqual(worldFestivalContext(s).attractions['hollow-house'], { ready: true, tier: 4, open: false });
  s.hayride.purchased = true; s.hayride.tier = 3; s.hayride.routeLevel = 2; s.hayride.open = false;
  assert.equal(worldFestivalContext(s).attractions.hayride.ready, hayrideReady(s));
  assert.deepEqual(worldFestivalContext(s).attractions.hayride, { ready: true, tier: 3, routeLevel: 2, open: false });
  s.hayride.open = true;
  assert.equal(worldFestivalContext(s).attractions.hayride.open, true);
});

test('only learned recipes, real purchased visitor upgrades and placed garden decor enter the snapshot', () => {
  const s = freshState();
  s.kitchen.recipes = ['haunted-pie', 'haunted-pie', 'unknown-recipe'];
  s.visitorEvents.vip.level = 1; s.visitorEvents.vip.enabled = false;
  s.visitorEvents.rush.level = 1;
  s.visitorEvents.invented = { level: 99 };
  s.festival.cocoa.level = 3;
  s.estate.ownedDecor['vegetable-bed'] = 1;
  s.estate.ownedDecor['herb-planter'] = 1;
  s.estate.placed = [];
  assert.deepEqual(worldFestivalContext(s).gardenDecorIds, []);
  s.estate.placed = [{ instance: 'bed-1', id: 'vegetable-bed' }, { instance: 'bed-2', id: 'vegetable-bed' }, { instance: 'invalid-bed', id: 'unknown-garden-object' }];
  const c = worldFestivalContext(s);
  assert.deepEqual(c.knownRecipes, ['haunted-pie']);
  assert.deepEqual(new Set(c.visitorEventIds), new Set(['vip', 'rush']));
  assert.equal(c.cocoaTier, 3);
  assert.deepEqual(c.gardenDecorIds, ['vegetable-bed']);
});

test('context construction is read-only and detached from the host world', () => {
  const s = freshState();
  s.house.level = 3; s.kitchen.purchased = true; s.kitchen.recipes = ['haunted-pie'];
  s.house.placed = [{ instance: 'range', id: 'copper-range', room: 'kitchen' }];
  s.paused = true;
  const before = structuredClone(s);
  freezeDeep(s);
  const c = worldFestivalContext(s);
  assert.deepEqual(s, before);
  assert.equal(c.paused, true);
  c.knownRecipes.push('bramble-crumble');
  c.kitchenCapabilities.length = 0;
  c.attractions.hayride.open = true;
  assert.deepEqual(s, before);
});

test('raw non-object input is rejected instead of treated as a ready world', () => {
  for (const input of [null, undefined, [], 1, 'world']) assert.throws(() => worldFestivalContext(input), TypeError);
});
