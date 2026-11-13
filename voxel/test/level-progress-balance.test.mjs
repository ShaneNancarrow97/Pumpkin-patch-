import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { EXPANSION_CHAPTERS } from '../src/content/village-expansion.js';

// Complete requirements independently of money, so these tests isolate banking.
function ready(level = 5) {
  const s = M.freshState();
  s.progression.claimed = M.LEVELS.slice(0, level).map(l => l.level);
  s.earned = s.progression.levelCredit = s.progression.observedTrade = M.LEVELS[level - 1].at;
  s.house.level = 3; s.progression.homeActivities = { visit: 1, wardrobe: 1, cook: 10 };
  s.village.quests.invitation = { step: 3, done: true }; s.house.wallpapers.parlour = 'w01'; s.kitchen.recipes = M.RECIPES.map(r => r.id);
  s.house.placed = Array.from({ length: 12 }, (_, i) => ({ id: i === 0 ? 'copper-range' : i === 1 ? 'gothic-spice-cabinet' : 'd03', room: ['kitchen', 'kitchen', 'parlour', 'bedroom', 'attic'][i % 5], books: i === 2 ? ['b01', 'b02', 'b03', 'b04', 'b05', 'b06'] : [] }));
  finishStory(s); return s;
}
function finishStory(s) {
  for (const c of EXPANSION_CHAPTERS.filter(c => !c.optional)) { s.village.expansion.chapters[c.id] = true; s.village.expansion.effects.push(...(c.reward?.effects ?? [])); }
}
function trade(s, amount) { s.coins += amount; s.earned += amount; return M.awardLevels(s); }
const reload = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test('a long blocked farm grind keeps every coin but cannot buy several ranks later', () => {
  let s = ready(); s.village.expansion.chapters = {}; s.village.expansion.effects = [];
  const wallet = s.coins, income = M.levelEarnings(s), amount = 10000000;
  assert.deepEqual(trade(s, amount), []); assert.equal(M.patchLevel(s).level, 5);
  assert.equal(s.coins, wallet + amount); assert.equal(M.levelEarnings(s), income + amount);
  const bank = M.LEVELS[5].at + (M.LEVELS[6].at - M.LEVELS[5].at) * M.LEVEL_HEAD_START;
  assert.equal(M.patchLevel(s).xp, bank); assert.equal(M.patchLevel(s).bankFull, true);
  for (let i = 0; i < 5; i++) assert.deepEqual(M.awardLevels(s), []);
  finishStory(s); assert.deepEqual(M.awardLevels(s), [6]);
  assert.equal(M.patchLevel(s).progress, .25);
  for (let i = 0; i < 5; i++) { s = reload(s); assert.deepEqual(M.awardLevels(s), []); assert.equal(M.patchLevel(s).xp, bank); assert.equal(M.patchLevel(s).level, 6); }
  assert.equal(M.levelEarnings(s), income + amount);
});

test('each village-gated rank needs at least 75% fresh trade after a full head start', () => {
  for (let level = 5; level < 19; level++) {
    const s = ready(level);
    assert.deepEqual(trade(s, 100000000), [level + 1], `one promotion from level ${level}`);
    assert.equal(M.patchLevel(s).progress, .25);
    const remaining = M.LEVELS[level + 1].at - M.patchLevel(s).xp;
    assert.equal(remaining, (M.LEVELS[level + 1].at - M.LEVELS[level].at) * .75);
    assert.deepEqual(trade(s, remaining - 1), [], `old takings cannot fill level ${level + 2}`);
    assert.deepEqual(trade(s, 1), [level + 2]);
  }
});

test('one huge trade can complete the early ranks but cannot chain through the village ranks', () => {
  const s = ready(1);
  assert.deepEqual(trade(s, 10000000), [2, 3, 4, 5, 6]);
  assert.deepEqual(M.awardLevels(s), []); assert.equal(M.patchLevel(s).level, 6);
  assert.equal(s.progression.pending.length, 5);
});

test('a quest completed before the next tick cannot recredit unobserved overflow', () => {
  const s = ready(); s.village.expansion.chapters = {}; s.village.expansion.effects = [];
  s.coins += 10000000; s.earned += 10000000;
  const before = JSON.stringify(s), bank = M.patchLevel(s).xp;
  assert.equal(M.patchLevel(s).level, 5); assert.equal(JSON.stringify(s), before, 'viewing progress is pure');
  finishStory(s); assert.equal(M.patchLevel(s).level, 6);
  assert.deepEqual(M.awardLevels(s), [6]); assert.equal(M.patchLevel(s).xp, bank);
  assert.deepEqual(M.awardLevels(s), []);
});

test('saving between a sale and settlement consumes overflow once on load', () => {
  let s = ready(); s.earned += 10000000; s.coins += 10000000;
  s = reload(s); const bank = M.patchLevel(s).xp;
  assert.equal(s.progression.observedTrade, M.levelEarnings(s));
  assert.deepEqual(M.awardLevels(s), [6]); s = reload(s);
  assert.equal(M.patchLevel(s).xp, bank); assert.deepEqual(M.awardLevels(s), []);
});

test('version19 banked millions migrate without losing coins, claimed levels or lifetime statistics', () => {
  const old = ready(10); old.version = 19; old.earned = 10000000; old.coins = 7500000;
  delete old.progression.levelCredit; delete old.progression.observedTrade;
  const s = reload(old), before = M.patchLevel(s);
  assert.equal(s.version, 20); assert.equal(s.coins, old.coins); assert.equal(s.earned, old.earned);
  assert.deepEqual(s.progression.claimed, old.progression.claimed);
  assert.equal(before.level, 11); assert.equal(before.xp, M.LEVELS[10].at + (M.LEVELS[11].at - M.LEVELS[10].at) * .25);
  assert.deepEqual(M.awardLevels(s), [11]); assert.deepEqual(M.awardLevels(reload(s)), []);
});

test('rewards and duplicate compensation never refill banked progress', () => {
  const s = ready(); s.wardrobe.owned.push('shane-skeleton');
  const needed = M.LEVELS[5].at - M.patchLevel(s).xp;
  assert.deepEqual(trade(s, needed), [6]); const xp = M.patchLevel(s).xp;
  assert.equal(s.progression.bonusEarned, 275); assert.equal(s.progression.receipts[6][1].duplicate, true);
  assert.equal(xp, M.LEVELS[5].at); assert.equal(M.levelEarnings(s), xp);
  assert.deepEqual(M.awardLevels(s), []); assert.equal(M.patchLevel(s).xp, xp);
});

test('paused trade is settled when play resumes and never grants while paused', () => {
  const s = ready(); s.paused = true; const before = s.progression.levelCredit;
  assert.deepEqual(trade(s, 10000000), []); assert.equal(s.progression.levelCredit, before);
  s.paused = false; assert.deepEqual(M.awardLevels(s), [6]); assert.deepEqual(M.awardLevels(s), []);
});

test('malformed credit is repaired within real takings and the current rank cap', () => {
  for (const pair of [[-1, 0], [Infinity, 0], [100000000, -1], ['bad', 0], [100000000, 0]]) {
    const s = ready(); s.earned = 10000000;
    [s.progression.levelCredit, s.progression.observedTrade] = pair;
    const r = reload(s);
    assert.ok(Number.isFinite(r.progression.levelCredit)); assert.ok(r.progression.levelCredit >= 0);
    assert.ok(r.progression.levelCredit <= M.patchLevel(r).bankLimit);
    assert.equal(r.progression.observedTrade, M.levelEarnings(r));
    assert.deepEqual(M.awardLevels(r), [6]); assert.deepEqual(M.awardLevels(reload(r)), []);
  }
});
