import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshState } from '../../../../src/model.js';
import { LEVELS } from '../../../../src/rules/levels.js';
import { quoteFoodForCustomer, commitFoodForCustomer } from '../../../../src/rules/cooking-sales.js';
import { pickGardenBed } from '../../../../src/rules/garden-crops.js';
import { pantryCapacity } from '../../../../src/rules/cooking.js';
import * as ride from '../../../../src/rules/hayride.js';
import { createFestivalEngine } from '../src/engine.js';
import { worldFestivalContext } from '../adapters/readiness.js';

const definitions = JSON.parse(readFileSync(new URL('../../late-game-support/data/festival-themes.json', import.meta.url), 'utf8'));

// Private developer fixture: the home, recipes and maze are explicitly prepared
// rather than claimed as costs/timing for a real player. The hayride purchases
// still use the actual rules. No saved game or renderer is involved.
function venue() {
  const s = freshState();
  s.coins = 1_000_000;
  s.earned = LEVELS.at(-1).at;
  s.progression.claimed = LEVELS.map(level => level.level);
  s.house.level = 3;
  s.house.owned.push('copper-range', 'gothic-spice-cabinet');
  s.house.placed = ['copper-range', 'gothic-spice-cabinet'].map((id, index) => ({ instance: 'prepared-' + index, id, room: 'kitchen', x: index * 3 + 1, z: 1 }));
  s.kitchen.purchased = true;
  s.kitchen.recipes = [...new Set(definitions.themes.flatMap(theme => theme.recipeIds))];
  s.shop.unlocked = true;
  s.hollowHouse.purchased = true;
  s.hollowHouse.status = 'ready'; s.hollowHouse.tier = 3; s.hollowHouse.open = true;
  s.visitorEvents.vip.level = 1; s.visitorEvents.rush.level = 1;
  s.festival.cocoa.level = 3;
  assert.equal(ride.buyHayride(s), true);
  assert.equal(ride.upgradeHayride(s), true); assert.equal(ride.upgradeHayride(s), true);
  assert.equal(ride.buyHayrideRoute(s), true); assert.equal(ride.buyHayrideRoute(s), true);
  assert.equal(ride.setHayrideOpen(s, true), true);
  // Keep this fixture's one nominated guest isolated from automatic invitations.
  s.arriving = []; s.hayride.guestTimer = 1e12;
  return s;
}

function evening(engine, world, themeId, start = true) {
  const context = worldFestivalContext(world);
  let result = engine.reduce(engine.createState({ namespace: 'real-rule-check' }), { type: 'prepare', themeId }, context);
  assert.equal(result.accepted, true, result.reason);
  if (start) { result = engine.reduce(result.state, { type: 'start' }, context); assert.equal(result.accepted, true, result.reason); }
  return { session: result.state, context };
}
const value = (engine, session, goal) => engine.view(session).active.goals.find(item => item.id === goal).value;

test('a real paid kitchen receipt supplies true servings and one Court guest without a second stock or wallet debit', () => {
  const world = venue(), engine = createFestivalEngine(definitions);
  const { session, context } = evening(engine, world, 'midnight-court-banquet');
  const stamp = engine.stamp(session, context);
  const guest = { id: 7, vip: true, courtier: true, budget: 200, basket: [], needs: { hunger: 100, thirst: 20, happiness: 70, value: 1.5 } };
  world.kitchen.displays = ['haunted-pie', null]; world.kitchen.food['haunted-pie'] = 3;
  world.customerCare.bags = 1;
  const before = { coins: world.coins, earned: world.earned, purse: guest.budget };
  const held = quoteFoodForCustomer(world, guest);
  assert.equal(held.recipe, 'haunted-pie'); assert.equal(held.quantity, 3);
  const receipt = commitFoodForCustomer(world, guest);
  assert.ok(receipt && receipt.quantity === 3);
  assert.equal(guest.food.status, 'paid');
  assert.equal(guest.budget, before.purse - receipt.amount);
  assert.equal(world.kitchen.food['haunted-pie'], 0);
  assert.equal(world.coins, before.coins + receipt.amount);
  assert.equal(world.earned, before.earned + receipt.amount);
  assert.equal(commitFoodForCustomer(world, guest), null, 'the payment rule cannot sell the same paid serving twice');
  const afterPayment = structuredClone({ world, guest });
  const event = { ...stamp, kind: 'food-sale', source: 'food', id: 'kitchen:' + receipt.id, guestId: 'customer:' + guest.id, recipeId: receipt.recipe, quantity: receipt.quantity, amount: receipt.amount, cohort: 'midnight-court' };
  const counted = engine.reduce(session, { type: 'outcome', event }, context);
  assert.equal(counted.accepted, true);
  assert.equal(value(engine, counted.state, 'court-supper'), 3);
  assert.equal(value(engine, counted.state, 'court-patrons'), 1);
  assert.equal(value(engine, counted.state, 'court-frights'), 0, 'buying food is not completing an attraction');
  const replay = engine.reduce(counted.state, { type: 'outcome', event }, context);
  assert.equal(replay.changed, false);
  assert.equal(value(engine, replay.state, 'court-supper'), 3);
  assert.deepEqual({ world, guest }, afterPayment, 'counting/replaying the receipt does not touch real money, stock or the guest');
});

test('a successful real garden harvest counts during untimed preparation, including genuine overflow sold at market', () => {
  const world = venue(), engine = createFestivalEngine(definitions);
  const { session, context } = evening(engine, world, 'lanterns-in-the-mist', false);
  // One private fixture bed is already ripe. The pantry is full, so the actual
  // harvest rule sells its crop; the goal is harvest quantity, not food provenance.
  world.estate.placed = [{ instance: 'ripe-private-bed', id: 'vegetable-bed', x: -9, z: -5, rotation: 0, crop: { phase: 'ready', remaining: 0, watered: true } }];
  world.kitchen.pantry.vegetables = pantryCapacity(world);
  const bed = world.estate.placed[0], bedId = bed.id, stamp = engine.stamp(session, context), coins = world.coins;
  const harvest = pickGardenBed(world, bed.instance);
  assert.ok(harvest && harvest.amount > 0);
  assert.equal(harvest.pantry, 0); assert.equal(harvest.sold, harvest.amount);
  assert.equal(world.coins, coins + harvest.coins);
  assert.equal(bed.crop.phase, 'empty');
  assert.equal(pickGardenBed(world, bed.instance), false, 'an empty bed does not manufacture a second harvest');
  const afterHarvest = structuredClone(world);
  const event = { ...stamp, kind: 'garden-harvest', source: 'garden', id: 'harvest:confirmed-1', bedId, quantity: harvest.amount };
  const counted = engine.reduce(session, { type: 'outcome', event }, context);
  assert.equal(counted.accepted, true);
  assert.equal(counted.state.active.phase, 'preparing');
  assert.equal(counted.state.active.elapsedSeconds, 0);
  assert.equal(value(engine, counted.state, 'mist-garden-basket'), harvest.amount);
  assert.equal(value(engine, counted.state, 'mist-warm-cups'), 0);
  assert.equal(engine.reduce(counted.state, { type: 'outcome', event }, context).changed, false);
  assert.deepEqual(world, afterHarvest, 'the module does not sell or deposit the real crop a second time');
});

test('a real paid hayride counts only after unloading, using its departure manifest, route and queue snapshot', () => {
  const world = venue(), engine = createFestivalEngine(definitions);
  const { session: originalSession, context } = evening(engine, world, 'the-last-wagon');
  const stamp = engine.stamp(originalSession, context);
  const guest = { id: 5, budget: 60, basket: [], preferred: [0], needs: { hunger: 50, thirst: 50, happiness: 70, value: 1 } };
  // Force only this private guest's willingness, preserving the real queue,
  // budget, ticket, convoy and completion rules. This is not a demand forecast.
  guest.hayride = ride.planHayrideVisit(world, guest, 'arrival', { force: true, approachSeconds: .1, returnSeconds: .1 });
  assert.ok(guest.hayride);
  world.visitors.push(guest);
  const before = { coins: world.coins, earned: world.earned, purse: guest.budget };
  let session = originalSession, departure, payment, returned;
  for (let step = 0; step < 300 && !returned; step++) {
    world.time += 1;
    const events = []; ride.updateHayride(world, 1, events);
    for (const fact of events) {
      if (fact.type === 'sale' && fact.route === 'hayride-ticket') {
        payment = fact;
        const ticket = { ...stamp, id: guest.hayride.visitId, kind: 'ticket-sale', source: 'hayride', guestId: 'visitor:' + guest.id, amount: fact.amount };
        const afterTicket = structuredClone(world);
        const observed = engine.reduce(session, { type: 'outcome', event: ticket }, context);
        assert.equal(observed.accepted, true, observed.reason);
        session = observed.state;
        assert.equal(value(engine, session, 'wagon-full-trail'), 0);
        assert.equal(value(engine, session, 'wagon-smooth-boarding'), 0);
        assert.deepEqual(world, afterTicket, 'ticket observation adds no second income');
      }
      if (fact.type === 'hayride-departed') {
        const convoy = ride.hayrideConvoys(world).find(run => run.runId === fact.runId);
        assert.ok(convoy && convoy.manifest.length === 1);
        departure = { routeLevel: convoy.routeLevel, queueSeconds: guest.hayride.waited, receipt: structuredClone(convoy.manifest[0]) };
      }
      if (fact.type === 'hayride-returned') returned = fact;
    }
  }
  assert.ok(payment && departure && returned, 'the real rule reaches boarding, departure and unloading');
  assert.equal(returned.runId, departure.receipt.runId);
  assert.equal(world.hayride.completed, 1);
  assert.equal(guest.hayride.charged, true);
  assert.equal(departure.routeLevel, 2);
  assert.ok(departure.queueSeconds <= 45);
  assert.equal(world.coins, before.coins + payment.amount);
  assert.equal(world.earned, before.earned + payment.amount);
  assert.equal(guest.budget, before.purse - payment.amount);
  const afterTrip = structuredClone(world);
  const event = { ...stamp, id: departure.receipt.visitId, kind: 'attraction-completed', source: 'hayride', guestId: 'visitor:' + departure.receipt.visitor, paid: true, paidAmount: departure.receipt.amount, routeLevelAtDeparture: departure.routeLevel, queueSecondsAtBoarding: departure.queueSeconds };
  const counted = engine.reduce(session, { type: 'outcome', event }, context);
  assert.equal(counted.accepted, true);
  assert.equal(value(engine, counted.state, 'wagon-full-trail'), 1);
  assert.equal(value(engine, counted.state, 'wagon-smooth-boarding'), 1);
  assert.equal(value(engine, counted.state, 'wagon-fond-goodbyes'), 0, 'unloading is not a happy final departure');
  assert.equal(engine.reduce(counted.state, { type: 'outcome', event }, context).changed, false);
  assert.deepEqual(world, afterTrip, 'completion counting does not charge or reward the guest again');
});
