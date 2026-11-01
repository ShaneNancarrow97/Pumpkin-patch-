import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFestivalEngine } from '../src/engine.js';

const definitions = JSON.parse(readFileSync(new URL('../../late-game-support/data/festival-themes.json', import.meta.url), 'utf8'));
const CONTEXT = {
  level: 20, houseLevel: 3, kitchenPurchased: true,
  kitchenCapabilities: ['hob', 'pot', 'oven', 'tray', 'spice'],
  knownRecipes: [...new Set(definitions.themes.flatMap(theme => theme.recipeIds))],
  visitorEventIds: ['vip', 'rush'], cocoaTier: 3, gardenDecorIds: [],
  attractions: {
    'hollow-house': { ready: true, tier: 5, open: true },
    hayride: { ready: true, tier: 3, routeLevel: 2, open: true },
  },
  paused: false,
};
const COURT = 'midnight-court-banquet', MIST = 'lanterns-in-the-mist', WAGON = 'the-last-wagon';
const copy = value => JSON.parse(JSON.stringify(value));
const context = extra => ({ ...copy(CONTEXT), ...extra });

function fixture(theme = COURT, start = true) {
  const engine = createFestivalEngine(copy(definitions));
  let state = engine.createState({ namespace: 'adversarial' });
  state = apply(engine, state, { type: 'prepare', themeId: theme });
  if (start) state = apply(engine, state, { type: 'start' });
  return { engine, state };
}
function apply(engine, state, command, world = CONTEXT) {
  const result = engine.reduce(state, command, world);
  assert.equal(result.accepted, true, `${command.type}: ${result.reason}`);
  return result.state;
}
function outcome(engine, state, fields, stamp = engine.stamp(state, CONTEXT), world = CONTEXT) {
  return engine.reduce(state, { type: 'outcome', event: { ...stamp, ...fields } }, world);
}
function value(engine, state, goal) {
  return engine.view(state, CONTEXT).active.goals.find(item => item.id === goal).value;
}
function food(fields = {}) {
  return { kind: 'food-sale', source: 'food', id: 'food-receipt-0', guestId: 'visitor:0',
    recipeId: 'haunted-pie', quantity: 1, amount: 12, cohort: 'midnight-court', ...fields };
}
function completeCourt(engine, initial) {
  let state = initial;
  state = outcome(engine, state, food({ quantity: 12, amount: 144 })).state;
  for (let id = 1; id < 4; id++) state = outcome(engine, state, {
    kind: 'ticket-sale', source: 'hayride', id: 'court-ticket-' + id,
    guestId: 'visitor:' + id, amount: 12, cohort: 'midnight-court',
  }).state;
  for (let id = 0; id < 10; id++) state = outcome(engine, state, {
    kind: 'final-departure', source: 'farm-visit', id: 'court-exit-' + id,
    guestId: 'visitor:' + id, final: true, happiness: 90, outcome: 'normal',
  }).state;
  assert.equal(engine.view(state, CONTEXT).active.completedGoals, 3);
  state = apply(engine, state, { type: 'end' });
  return state;
}

test('one receipt can advance two goals, but a changed replay cannot add another guest or quantity', () => {
  const { engine, state } = fixture();
  const result = outcome(engine, state, food({ quantity: 3, amount: 36 }));
  assert.equal(result.accepted, true);
  assert.equal(value(engine, result.state, 'court-supper'), 3);
  assert.equal(value(engine, result.state, 'court-patrons'), 1);
  const replay = outcome(engine, result.state, food({ quantity: 500, guestId: 'visitor:99', amount: 6000 }));
  assert.deepEqual(replay.state, result.state);
  assert.deepEqual(replay.effects, []);
});

test('event identity includes source while distinct VIP guests remain independently deduplicated', () => {
  const { engine, state } = fixture();
  let next = outcome(engine, state, food({ id: 'shared-receipt' })).state;
  next = outcome(engine, next, {
    kind: 'ticket-sale', source: 'hayride', id: 'shared-receipt',
    guestId: 'visitor:1', amount: 12, cohort: 'midnight-court',
  }).state;
  assert.equal(value(engine, next, 'court-patrons'), 2);
  next = outcome(engine, next, food({ id: 'another-sale', guestId: 'visitor:0' })).state;
  assert.equal(value(engine, next, 'court-patrons'), 2);
  assert.equal(value(engine, next, 'court-supper'), 2);
});

test('a contributed receipt cannot be replayed with a different cohort to open a previously ineligible goal', () => {
  const { engine, state } = fixture();
  const first = outcome(engine, state, food({ id: 'ordinary-customer', cohort: 'regular' })).state;
  assert.equal(value(engine, first, 'court-supper'), 1);
  assert.equal(value(engine, first, 'court-patrons'), 0);
  const retagged = outcome(engine, first, food({ id: 'ordinary-customer', cohort: 'midnight-court', guestId: 'visitor:9' }));
  assert.deepEqual(retagged.state, first);
  assert.equal(value(engine, retagged.state, 'court-patrons'), 0);
});

test('namespaced visitor zero is valid and separate from customer zero; bare numeric IDs are rejected', () => {
  const { engine, state } = fixture();
  let next = outcome(engine, state, food({ id: 'visitor-zero', guestId: 'visitor:0' })).state;
  next = outcome(engine, next, food({ id: 'customer-zero', guestId: 'customer:0' })).state;
  assert.equal(value(engine, next, 'court-patrons'), 2);
  const before = copy(next);
  const malformed = outcome(engine, next, food({ id: 'bare-zero', guestId: 0 }));
  assert.equal(malformed.accepted, false);
  assert.deepEqual(malformed.state, before);
});

test('the same person completing repeat or different paid attractions counts once for a guest goal', () => {
  const { engine, state } = fixture();
  let next = outcome(engine, state, {
    kind: 'attraction-completed', source: 'hayride', id: 'ride-one', guestId: 'visitor:0',
    paid: true, paidAmount: 12, queueSecondsAtBoarding: 15, routeLevelAtDeparture: 2,
  }).state;
  next = outcome(engine, next, {
    kind: 'attraction-completed', source: 'hollow-house', id: 'maze-two', guestId: 'visitor:0',
    paid: true, paidAmount: 12, queueSecondsAtBoarding: 0,
  }).state;
  assert.equal(value(engine, next, 'court-frights'), 1);
});

test('a new session cannot accept a delayed preparation outcome from the previous evening', () => {
  const { engine, state } = fixture(MIST, false);
  const previousStamp = engine.stamp(state, CONTEXT);
  let next = outcome(engine, state, { kind: 'garden-harvest', source: 'garden', id: 'harvest-one', bedId: 'vegetable-bed', quantity: 3 }).state;
  next = apply(engine, next, { type: 'end' });
  next = apply(engine, next, { type: 'prepare', themeId: MIST });
  const currentStamp = engine.stamp(next, CONTEXT);
  assert.notEqual(currentStamp.sessionId, previousStamp.sessionId);
  const late = outcome(engine, next, { kind: 'garden-harvest', source: 'garden', id: 'harvest-late', bedId: 'vegetable-bed', quantity: 8 }, previousStamp);
  assert.equal(late.accepted, false);
  assert.equal(value(engine, late.state, 'mist-garden-basket'), 0);
  assert.deepEqual(engine.view(late.state, CONTEXT).pendingRewards, []);
});

test('counter persistence and session allocation survive reload without reusing earlier tokens', () => {
  const { engine, state } = fixture(MIST, false);
  const firstStamp = engine.stamp(state, CONTEXT);
  let next = outcome(engine, state, { kind: 'garden-harvest', source: 'garden', id: 'harvest-zero', bedId: 'herb-planter', quantity: 2 }).state;
  const restored = engine.restore(engine.save(next));
  assert.equal(restored.compatible, true);
  assert.equal(value(engine, restored.state, 'mist-garden-basket'), 2);
  const replay = outcome(engine, restored.state, { kind: 'garden-harvest', source: 'garden', id: 'harvest-zero', bedId: 'herb-planter', quantity: 2 }, firstStamp);
  assert.equal(value(engine, replay.state, 'mist-garden-basket'), 2);
  next = apply(engine, replay.state, { type: 'end' });
  next = apply(engine, next, { type: 'prepare', themeId: MIST });
  assert.notEqual(engine.stamp(next, CONTEXT).sessionId, firstStamp.sessionId);
});

test('manual and world pause reject outcomes and clocks without consuming a valid queued receipt', () => {
  const { engine, state } = fixture();
  const stamped = { ...engine.stamp(state, CONTEXT), ...food({ id: 'queued-before-pause' }) };
  const paused = apply(engine, state, { type: 'pause' });
  assert.equal(engine.stamp(paused, CONTEXT), null);
  for (const [current, world] of [[paused, CONTEXT], [state, context({ paused: true })]]) {
    const frozen = engine.reduce(current, { type: 'outcome', event: stamped }, world);
    const tick = engine.reduce(current, { type: 'tick', seconds: 60 }, world);
    assert.equal(frozen.accepted, false);
    assert.equal(tick.accepted, false);
    assert.deepEqual(frozen.state, current);
    assert.deepEqual(tick.state, current);
    assert.equal(engine.stamp(current, world), null);
  }
  const resumed = apply(engine, paused, { type: 'resume' });
  const retry = engine.reduce(resumed, { type: 'outcome', event: stamped }, CONTEXT);
  assert.equal(retry.accepted, true);
  assert.equal(value(engine, retry.state, 'court-supper'), 1);
});

test('a running save restores paused and cannot count or advance until explicitly resumed', () => {
  const { engine, state } = fixture();
  const timed = apply(engine, state, { type: 'tick', seconds: 30 });
  const snapshot = engine.save(timed), restored = engine.restore(snapshot);
  assert.equal(restored.compatible, true);
  assert.equal(engine.view(restored.state, CONTEXT).active.phase, 'paused');
  assert.equal(engine.view(restored.state, CONTEXT).active.elapsedSeconds, 30);
  assert.equal(engine.stamp(restored.state, CONTEXT), null);
  const badResume = engine.reduce(restored.state, { type: 'resume' }, context({ paused: true }));
  assert.equal(badResume.accepted, false);
  const resumed = apply(engine, restored.state, { type: 'resume' });
  assert.equal(engine.view(resumed, CONTEXT).active.elapsedSeconds, 30);
});

test('route and queue eligibility use the immutable departure/boarding values carried by each outcome', () => {
  const { engine, state } = fixture(WAGON);
  const oldRoute = outcome(engine, state, {
    kind: 'attraction-completed', source: 'hayride', id: 'before-extension', guestId: 'visitor:0',
    paid: true, paidAmount: 12, queueSecondsAtBoarding: 46, routeLevelAtDeparture: 0,
  }).state;
  assert.equal(value(engine, oldRoute, 'wagon-full-trail'), 0);
  assert.equal(value(engine, oldRoute, 'wagon-smooth-boarding'), 0);
  const worldAfterClosingRoute = context({ attractions: { ...CONTEXT.attractions, hayride: { ...CONTEXT.attractions.hayride, routeLevel: 0, open: false } } });
  const completed = outcome(engine, oldRoute, {
    kind: 'attraction-completed', source: 'hayride', id: 'departed-on-full-route', guestId: 'visitor:1',
    paid: true, paidAmount: 12, queueSecondsAtBoarding: 45, routeLevelAtDeparture: 2,
  }, engine.stamp(oldRoute, CONTEXT), worldAfterClosingRoute).state;
  assert.equal(value(engine, completed, 'wagon-full-trail'), 1);
  assert.equal(value(engine, completed, 'wagon-smooth-boarding'), 1);
});

test('free rides, unconfirmed departures and malformed paid outcomes never advance a goal', () => {
  const { engine, state } = fixture();
  const invalid = [
    food({ quantity: 0 }), food({ quantity: -1 }), food({ quantity: 1.5 }),
    food({ quantity: 1_000_001 }), food({ amount: 0 }), food({ amount: NaN }),
    food({ amount: Infinity }), food({ id: '' }), food({ id: 'x'.repeat(10000) }),
    { kind: 'attraction-completed', source: 'hayride', id: 'owner', guestId: 'visitor:0', paid: false, paidAmount: 12, queueSecondsAtBoarding: 0, routeLevelAtDeparture: 2 },
    { kind: 'attraction-completed', source: 'hayride', id: 'no-ticket', guestId: 'visitor:0', paid: true, paidAmount: 0, queueSecondsAtBoarding: 0, routeLevelAtDeparture: 2 },
    { kind: 'final-departure', source: 'farm-visit', id: 'ride-return', guestId: 'visitor:0', final: false, happiness: 100, outcome: 'normal' },
  ];
  for (const event of invalid) {
    const result = outcome(engine, state, event);
    assert.equal(result.accepted, false, event.kind + '/' + event.id);
    assert.deepEqual(result.state, state);
    assert.deepEqual(result.effects, []);
  }
});

test('ending early cannot claim a cosmetic; a successful end and replayed claims grant it once', () => {
  const { engine, state } = fixture();
  const endedEarly = apply(engine, state, { type: 'end' });
  const unearned = engine.reduce(endedEarly, { type: 'claim', themeId: COURT }, CONTEXT);
  assert.equal(unearned.accepted, false);
  assert.deepEqual(engine.entitlements(unearned.state), []);
  let next = apply(engine, endedEarly, { type: 'prepare', themeId: COURT });
  next = apply(engine, next, { type: 'start' });
  next = completeCourt(engine, next);
  const claimed = engine.reduce(next, { type: 'claim', themeId: COURT }, CONTEXT);
  assert.equal(claimed.accepted, true);
  assert.equal(claimed.effects.filter(item => item.type === 'festival-reward').length, 1);
  assert.equal(engine.entitlements(claimed.state).length, 1);
  const restored = engine.restore(engine.save(claimed.state));
  assert.equal(restored.compatible, true);
  const duplicate = engine.reduce(restored.state, { type: 'claim', themeId: COURT }, CONTEXT);
  assert.equal(engine.entitlements(duplicate.state).length, 1);
  assert.equal(duplicate.effects.filter(item => item.type === 'festival-reward').length, 0);
});

test('world pause still permits finishing an earned evening and recording its cosmetic entitlement', () => {
  const { engine, state } = fixture();
  const finished = completeCourt(engine, state);
  const claimed = engine.reduce(finished, { type: 'claim', themeId: COURT }, context({ paused: true }));
  assert.equal(claimed.accepted, true);
  assert.equal(engine.entitlements(claimed.state).length, 1);
  let preparing = apply(engine, claimed.state, { type: 'prepare', themeId: MIST });
  const ended = engine.reduce(preparing, { type: 'end' }, context({ paused: true }));
  assert.equal(ended.accepted, true);
  assert.equal(engine.view(ended.state, CONTEXT).active, null);
  assert.equal(engine.entitlements(ended.state).length, 1);
});

test('pruning a long history never revokes permanent completion or permits duplicate cosmetics', () => {
  const { engine, state } = fixture();
  let next = completeCourt(engine, state);
  next = apply(engine, next, { type: 'claim', themeId: COURT });
  const original = engine.entitlements(next);
  for (let n = 0; n < 20; n++) {
    next = apply(engine, next, { type: 'prepare', themeId: COURT });
    next = apply(engine, next, { type: 'end' });
  }
  const restored = engine.restore(engine.save(next));
  assert.equal(restored.compatible, true);
  const view = engine.view(restored.state, CONTEXT);
  assert.equal(view.history.length, 12);
  assert.equal(view.themes.find(theme => theme.id === COURT).completed, true);
  assert.deepEqual(engine.entitlements(restored.state), original);
  const retry = engine.reduce(restored.state, { type: 'claim', themeId: COURT }, CONTEXT);
  assert.equal(retry.effects.filter(effect => effect.type === 'festival-reward').length, 0);
});

test('corrupt active progress is discarded without losing a genuinely claimed cosmetic', () => {
  const { engine, state } = fixture();
  let next = completeCourt(engine, state);
  next = apply(engine, next, { type: 'claim', themeId: COURT });
  next = apply(engine, next, { type: 'prepare', themeId: MIST });
  const owned = engine.entitlements(next), saved = engine.save(next);
  saved.active.progress['mist-garden-basket'] = [{ key: 'bad', units: -1 }];
  const restored = engine.restore(saved);
  assert.equal(restored.compatible, true);
  assert.ok(restored.warnings.length > 0);
  assert.equal(engine.view(restored.state, CONTEXT).active, null);
  assert.deepEqual(engine.entitlements(restored.state), owned);
});

test('missing or false definition revisions drop active progress while retaining permanent ownership', () => {
  const { engine, state } = fixture();
  let next = completeCourt(engine, state);
  next = apply(engine, next, { type: 'claim', themeId: COURT });
  next = apply(engine, next, { type: 'prepare', themeId: MIST });
  const valid = engine.save(next), owned = engine.entitlements(next);
  for (const marker of [undefined, false, '', 'goals-v1-unrecognized']) {
    const raw = copy(valid);
    if (marker === undefined) delete raw.active.themeSignature;
    else raw.active.themeSignature = marker;
    const before = copy(raw), restored = engine.restore(raw);
    assert.equal(restored.compatible, true);
    assert.equal(engine.view(restored.state, CONTEXT).active, null);
    assert.ok(restored.warnings.length > 0);
    assert.deepEqual(engine.entitlements(restored.state), owned);
    assert.deepEqual(raw, before);
  }
});

test('tuning goal definitions invalidates only the active evening, without revoking an earned cosmetic', () => {
  const { engine, state } = fixture();
  let next = completeCourt(engine, state);
  next = apply(engine, next, { type: 'claim', themeId: COURT });
  next = apply(engine, next, { type: 'prepare', themeId: MIST });
  next = outcome(engine, next, { kind: 'garden-harvest', source: 'garden', id: 'garden-before-tuning', bedId: 'herb-planter', quantity: 3 }).state;
  const tuned = copy(definitions);
  tuned.themes.find(theme => theme.id === MIST).goals.options.find(goal => goal.id === 'mist-garden-basket').target = 10;
  const updatedEngine = createFestivalEngine(tuned), restored = updatedEngine.restore(engine.save(next));
  assert.equal(restored.compatible, true);
  assert.equal(updatedEngine.view(restored.state, CONTEXT).active, null);
  assert.ok(restored.warnings.length > 0);
  assert.deepEqual(updatedEngine.entitlements(restored.state), engine.entitlements(next));
  assert.equal(updatedEngine.view(restored.state, CONTEXT).themes.find(theme => theme.id === COURT).completed, true);
});

test('untimed preparation cannot restore service-only progress or an operational clock', () => {
  const { engine, state } = fixture();
  const served = outcome(engine, state, food()).state;
  const withServiceProgress = engine.save(served);
  withServiceProgress.active.phase = 'preparing';
  withServiceProgress.active.elapsedSeconds = 0;
  const preparing = fixture(COURT, false);
  const withPreparationClock = preparing.engine.save(preparing.state);
  withPreparationClock.active.elapsedSeconds = 30;
  for (const raw of [withServiceProgress, withPreparationClock]) {
    const restored = engine.restore(raw);
    assert.equal(restored.compatible, true);
    assert.equal(engine.view(restored.state, CONTEXT).active, null);
    assert.ok(restored.warnings.length > 0);
    assert.deepEqual(engine.view(restored.state, CONTEXT).pendingRewards, []);
  }
});

test('unsupported versions and unsafe permanent ownership fail closed without mutating the host snapshot', () => {
  const { engine, state } = fixture();
  let next = completeCourt(engine, state);
  next = apply(engine, next, { type: 'claim', themeId: COURT });
  const valid = engine.save(next);
  const cases = [
    { ...copy(valid), version: 999 },
    { ...copy(valid), claimedRewards: [{ themeId: COURT, rewardId: 'unrecognized-reward', grantKey: 'forged' }] },
    { ...copy(valid), completedThemes: 'not-an-array' },
  ];
  for (const raw of cases) {
    const before = copy(raw), result = engine.restore(raw);
    assert.equal(result.compatible, false);
    assert.equal(result.state, null);
    assert.ok(result.warnings.length > 0);
    assert.deepEqual(raw, before, 'retain the original field for the host to preserve or recover');
  }
});

test('restoring duplicate contributing records cannot manufacture progress or an earned reward', () => {
  const { engine, state } = fixture();
  const next = outcome(engine, state, food()).state;
  const saved = engine.save(next), record = saved.active.progress['court-supper'][0];
  saved.active.progress['court-supper'] = Array.from({ length: 12 }, () => copy(record));
  const restored = engine.restore(saved);
  assert.equal(restored.compatible, true);
  assert.ok(restored.warnings.length > 0);
  assert.equal(engine.view(restored.state, CONTEXT).active, null);
  assert.deepEqual(engine.entitlements(restored.state), []);
  assert.deepEqual(engine.view(restored.state, CONTEXT).pendingRewards, []);
});

test('a long stream of irrelevant and over-target receipts leaves bounded session storage', () => {
  const { engine, state } = fixture();
  let next = state;
  for (let n = 0; n < 600; n++) next = outcome(engine, next, food({ id: 'unlisted-' + n, recipeId: 'not-on-the-menu', cohort: undefined })).state;
  assert.equal(value(engine, next, 'court-supper'), 0);
  const before = JSON.stringify(engine.save(next)).length;
  for (let n = 0; n < 600; n++) next = outcome(engine, next, food({ id: 'paid-' + n, guestId: 'visitor:' + n })).state;
  assert.equal(value(engine, next, 'court-supper'), 12);
  assert.equal(value(engine, next, 'court-patrons'), 4);
  const saved = engine.save(next);
  assert.ok(JSON.stringify(saved).length < before + 10000, 'retain only contributing bounded records');
  for (const goal of definitions.themes[0].goals.options) assert.ok(saved.active.progress[goal.id].length <= goal.target);
});

test('reserved content keys are either rejected or survive save restoration as own progress fields', () => {
  const altered = copy(definitions);
  altered.themes[0].goals.options[0].id = '__proto__';
  let engine;
  try { engine = createFestivalEngine(altered); }
  catch (error) { assert.ok(error instanceof TypeError, 'reject unsafe definitions explicitly'); return; }
  let state = engine.createState({ namespace: 'reserved-key' });
  state = apply(engine, state, { type: 'prepare', themeId: COURT });
  state = apply(engine, state, { type: 'start' });
  state = outcome(engine, state, food({ quantity: 2, amount: 24 })).state;
  const restored = engine.restore(engine.save(state));
  assert.equal(restored.compatible, true);
  assert.equal(Object.hasOwn(restored.state.active.progress, '__proto__'), true);
  const second = engine.restore(engine.save(restored.state));
  assert.equal(second.compatible, true);
  assert.equal(second.state.active.progress.__proto__[0].units, 2);
});
