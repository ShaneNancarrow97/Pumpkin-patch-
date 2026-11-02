import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceState } from '../preview/service-state.js';

const ID = 'midnight-court-banquet';
function view({ phase = null, completed = 0, pending = 0, finished = false, claimed = false, ready = true, unlocked = true } = {}) {
 return {
  outbox: { pending, capacity: 256, free: 256 - pending },
  festival: {
   active: phase ? { themeId: ID, phase, completedGoals: completed, requiredGoals: 3, canFinish: completed >= 3, goals: [] } : null,
   themes: [{ id: ID, name: 'Midnight Court Banquet', completed: finished, claimed, readiness: { unlocked, ready, missing: ready ? [] : [{ label: 'Place an oven' }] } }],
   pendingRewards: finished && !claimed ? [{ themeId: ID, rewardId: 'keepsake' }] : [],
   ownedRewards: claimed ? [{ themeId: ID, rewardId: 'keepsake' }] : []
  }
 };
}

test('idle and preparation expose one honest next step and the real readiness gate', () => {
 const initial = serviceState(view(), ID);
 assert.equal(initial.stage, 'idle'); assert.equal(initial.objectives.display, '0 / 3');
 assert.deepEqual(initial.primaryAction, { id: 'prepare', label: 'Prepare evening', disabled: false });
 const prepared = serviceState(view({ phase: 'preparing', ready: false }), ID);
 assert.equal(prepared.stage, 'preparing'); assert.equal(prepared.nextStep, 'Place an oven'); assert.equal(prepared.primaryAction.disabled, true);
 assert.equal(serviceState(view({ phase: 'preparing' }), ID).primaryAction.disabled, false);
 assert.equal(serviceState(view({ unlocked: false, ready: false }), ID).primaryAction.disabled, true);
});

test('running progress shows remaining actual goals, caps the summary, and offers finishing only after the target', () => {
 const running = serviceState(view({ phase: 'running', completed: 1 }), ID);
 assert.equal(running.stage, 'hosting'); assert.equal(running.objectives.display, '1 / 3');
 assert.match(running.nextStep, /2 more goals/); assert.equal(running.primaryAction, null);
 const ready = serviceState(view({ phase: 'running', completed: 3 }), ID);
 assert.equal(ready.stage, 'ready-to-finish'); assert.equal(ready.primaryAction.id, 'end');
 assert.equal(ready.complete, false, 'ready to finish is not a recorded completion');
 assert.equal(serviceState(view({ phase: 'running', completed: 4 }), ID).objectives.display, '3 / 3');
});

test('pending outcomes take priority over finishing, while pause requires resuming before delivery', () => {
 const pending = serviceState(view({ phase: 'running', completed: 3, pending: 2 }), ID);
 assert.equal(pending.stage, 'awaiting-delivery'); assert.equal(pending.primaryAction.id, 'flush');
 assert.equal(pending.objectives.display, '3 / 3'); assert.match(pending.nextStep, /2 confirmed outcomes/);
 const paused = serviceState(view({ phase: 'paused', completed: 2, pending: 1 }), ID);
 assert.equal(paused.stage, 'paused'); assert.equal(paused.primaryAction.id, 'resume'); assert.match(paused.nextStep, /1 confirmed outcome remains/);
 assert.equal(paused.objectives.display, '2 / 3');
 const global = serviceState(view({ phase: 'running', pending: 2 }), ID, { worldPaused: true });
 assert.equal(global.stage, 'world-paused'); assert.equal(global.primaryAction, null); assert.equal(global.pending, 2);
});

test('earned and claimed evenings retain the recorded 3/3 summary without fabricating per-goal progress', () => {
 const earned = serviceState(view({ finished: true }), ID);
 assert.equal(earned.stage, 'reward-ready'); assert.equal(earned.objectives.display, '3 / 3');
 assert.equal(earned.objectives.retained, true); assert.equal(earned.primaryAction.id, 'claim');
 assert.equal(earned.completion.tone, 'earned');
 const claimed = serviceState(view({ finished: true, claimed: true }), ID);
 assert.equal(claimed.stage, 'claimed'); assert.equal(claimed.primaryAction.id, 'prepare');
 assert.equal(claimed.objectives.display, '3 / 3'); assert.equal(claimed.claimed, true);
 assert.equal(claimed.completion.tone, 'recorded'); assert.equal('goals' in claimed, false);
});

test('active repeat attempts retain permanent ownership but use only their new actual objective count', () => {
 const repeated = serviceState(view({ phase: 'running', completed: 1, finished: true, claimed: true }), ID);
 assert.equal(repeated.stage, 'hosting'); assert.equal(repeated.objectives.display, '1 / 3');
 assert.equal(repeated.objectives.retained, false); assert.equal(repeated.completion, null);
 assert.equal(repeated.complete, true); assert.equal(repeated.claimed, true); assert.equal(repeated.primaryAction, null);
});

test('unknown themes and another active evening cannot suggest an invalid prepare or claim action', () => {
 const unknown = serviceState(view({ finished: true }), 'missing-theme');
 assert.equal(unknown.stage, 'unknown'); assert.equal(unknown.themeId, null); assert.equal(unknown.primaryAction, null); assert.equal(unknown.complete, false);
 const other = view({ phase: 'running' }); other.festival.active.themeId = 'other-evening';
 assert.equal(serviceState(other, ID).stage, 'another-evening'); assert.equal(serviceState(other, ID).primaryAction, null);
 assert.equal(serviceState(null, ID).stage, 'unknown');
});

test('presentation is detached and never mutates or exposes input state', () => {
 const input = view({ phase: 'running', completed: 1, pending: 1 }), original = structuredClone(input);
 const result = serviceState(input, ID); result.objectives.completed = 99; result.primaryAction.label = 'changed';
 assert.deepEqual(input, original);
 assert.deepEqual(serviceState(input, ID), serviceState(input, ID));
});
