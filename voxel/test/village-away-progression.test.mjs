import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';

const done = (s, id) => { s.village.quests[id] = { done: true, step: 99, base: null }; };
function workshop() {
  const s = M.freshState(); s.village.invited = true; s.village.unlocks.push('stall');
  s.coins = 10000; Object.assign(s.village.materials, { logs: 40, stone: 40, fibre: 40, herbs: 40 });
  return s;
}
const reload = s => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test('village exploration scales every farm clock without slowing gathering or conversations', () => {
  const away = workshop(), farm = workshop();
  for (const s of [away, farm]) {
    s.plots[0] = { phase: 'growing', variety: 0, progress: 0 };
    s.visitorTimer = 10000; s.village.friends.elowen.chatIn = 100;
    const node = Object.keys(s.village.nodes)[0]; s.village.nodes[node] = 120;
    s.kitchen.purchased = true; s.kitchen.orders.push({ id: 1, phase: 'ordered', remaining: 42, items: { apples: 1 } });
  }
  M.update(away, 100, { villageAway: true }); M.update(farm, 2.5);
  assert.equal(away.time, 2.5); assert.equal(farm.time, 2.5);
  assert.equal(away.plots[0].progress, farm.plots[0].progress);
  assert.equal(away.visitorTimer, farm.visitorTimer);
  assert.equal(away.kitchen.orders[0].remaining, 39.5);
  assert.equal(away.village.clock, 100); assert.equal(farm.village.clock, 2.5);
  assert.equal(away.village.friends.elowen.chatIn, 0);
  assert.equal(away.village.nodes[Object.keys(away.village.nodes)[0]], 20);
  assert.equal(away.coins, 10000, 'no arbitrary deduction from the existing purse');
  assert.equal(M.villageFarmRate(away), .025);
  const saved = M.saveData(away); assert.equal(Object.hasOwn(saved, 'villageAway'), false);
});

test('returning to the farm resumes normal time; pause and invalid deltas stop both clocks', () => {
  const s = workshop(); M.update(s, 10, { villageAway: true }); M.update(s, 10);
  assert.equal(s.time, 10.25); assert.equal(s.village.clock, 20);
  s.paused = true; M.update(s, 10, { villageAway: true });
  assert.equal(s.time, 10.25); assert.equal(s.village.clock, 20);
  s.paused = false; for (const dt of [NaN, Infinity, 0, -1]) M.update(s, dt, { villageAway: true });
  assert.equal(s.time, 10.25); assert.equal(s.village.clock, 20);
});

test('managed farm tiers are quest-gated, charge once and restore without a new saved field', () => {
  const s = workshop(); assert.equal(M.buyVillageUpgrade(s, 'away-ledger'), false);
  done(s, 'rowan-stall'); assert.equal(M.buyVillageUpgrade(s, 'away-ledger'), true); assert.equal(M.villageFarmRate(s), .05);
  const first = { coins: s.coins, logs: s.village.materials.logs };
  assert.equal(M.buyVillageUpgrade(s, 'away-ledger'), false); assert.deepEqual({ coins: s.coins, logs: s.village.materials.logs }, first);
  assert.equal(M.buyVillageUpgrade(s, 'away-steward'), false); done(s, 'rowan-2');
  assert.equal(M.buyVillageUpgrade(s, 'away-steward'), true); assert.equal(M.villageFarmRate(s), .075);
  assert.equal(M.buyVillageUpgrade(s, 'away-network'), false); done(s, 'two-doorbells');
  assert.equal(M.buyVillageUpgrade(s, 'away-network'), true); assert.equal(M.villageFarmRate(s), .1);
  const restored = reload(s); assert.equal(M.villageFarmRate(restored), .1);
  M.update(restored, 20, { villageAway: true }); assert.equal(restored.time, 2);
  const old = M.saveData(workshop()); delete old.village.effects; assert.equal(M.villageFarmRate(M.restoreState(old)), .025);
});

test('Rowan home sets grant usable inventory copies and never grant twice', () => {
  const s = workshop(); assert.equal(M.buyVillageUpgrade(s, 'moonlit-reading-set'), false);
  done(s, 'elowen-2'); const ids = M.VILLAGE_UPGRADES.find(x => x.id === 'moonlit-reading-set').homeItems;
  const counts = ids.map(id => M.ownedCopies(s, id)); assert.equal(M.buyVillageUpgrade(s, 'moonlit-reading-set'), true);
  ids.forEach((id, i) => assert.equal(M.ownedCopies(s, id), counts[i] + 1));
  const before = M.saveData(s); assert.equal(M.buyVillageUpgrade(s, 'moonlit-reading-set'), false); assert.deepEqual(M.saveData(s), before);
  const back = reload(s); ids.forEach((id, i) => assert.equal(M.ownedCopies(back, id), counts[i] + 1));
});

test('Lantern Keepers requires a farm harvest and gives two equip-able quest outfits only once', () => {
  const s = workshop(); s.earned = M.LEVELS[4].at; s.progression.claimed = [1, 2, 3, 4, 5];
  assert.equal(M.questStatus(s, 'lantern-keepers'), 'locked');
  assert.equal(M.buyCostume(s, 'natalie-mummy'), false); assert.equal(M.buyCostume(s, 'shane-mummy'), false);
  done(s, 'two-doorbells'); assert.equal(M.questStatus(s, 'lantern-keepers'), 'offered'); M.startQuest(s, 'lantern-keepers');
  assert.ok(M.doHandOver(s, 'rowan', 'lantern-keepers')); assert.equal(M.questStep(s, 'lantern-keepers').kind, 'harvest');
  for (let i = 0; i < 24; i++) { s.plots[0] = { phase: 'ready', variety: 0, progress: 1, ripe: s.time }; assert.ok(M.harvest(s, 0)); }
  M.advanceQuests(s); assert.equal(M.questStep(s, 'lantern-keepers').kind, 'talk');
  const events = M.finishTalk(s, 'lantern-keepers', 'elowen'); assert.ok(events.some(e => e.type === 'quest-done' && e.quest === 'lantern-keepers'));
  for (const id of ['natalie-mummy', 'shane-mummy']) { assert.ok(s.wardrobe.owned.includes(id)); assert.equal(M.costumeVillageGate(s, id), null); assert.equal(M.wearCostume(s, id), true); }
  const coins = s.coins; assert.deepEqual(M.finishTalk(s, 'lantern-keepers', 'elowen'), []); assert.equal(s.coins, coins);
  const back = reload(s); assert.equal(back.wardrobe.equipped.natalie, 'natalie-mummy'); assert.equal(back.wardrobe.equipped.shane, 'shane-mummy');
});

test('earlier saves keep their already purchased village-gated costumes', () => {
  const s = workshop(); s.wardrobe.owned.push('natalie-mummy'); s.wardrobe.equipped.natalie = 'natalie-mummy';
  const back = reload(s); assert.equal(M.costumeVillageGate(back, 'natalie-mummy'), null); assert.equal(back.wardrobe.equipped.natalie, 'natalie-mummy');
  assert.ok(M.wearCostume(back, 'natalie-base')); assert.ok(M.wearCostume(back, 'natalie-mummy'));
});

test('unknown and inherited workshop or costume IDs cannot bypass the village gates', () => {
  const s = workshop(), before = JSON.stringify(M.saveData(s));
  for (const id of ['__proto__', 'constructor', 'unknown', null]) {
    assert.equal(M.villageUpgradeInfo(s, id), null);
    assert.equal(M.buyVillageUpgrade(s, id), false);
    assert.equal(M.costumeVillageGate(s, id), null);
    assert.equal(M.buyCostume(s, id), false);
  }
  assert.equal(JSON.stringify(M.saveData(s)), before);
});

test('last land and seed purchases require village chapters without revoking earlier ownership', () => {
  const s = workshop(); s.coins = 100000; s.earned = M.LEVELS.at(-1).at; s.progression.claimed = M.LEVELS.map(l => l.level);
  s.upgrades.plots = 3;
  const before = { coins: s.coins, earned: s.earned, level: M.patchLevel(s).level };
  assert.equal(M.villageFarmGate(s, 'plots').quest, 'rowan-2');
  assert.equal(M.buyUpgrade(s, 'plots'), false); assert.equal(s.coins, before.coins);
  done(s, 'rowan-2'); assert.equal(M.villageFarmGate(s, 'plots'), null); assert.ok(M.buyUpgrade(s, 'plots')); assert.equal(M.openPlots(s), 24);
  for (let i = 0; i < 3; i++) assert.ok(M.upgradePlot(s, 0));
  const seedCash = s.coins; assert.equal(M.villageFarmGate(s, 'variety', 0).quest, 'lantern-keepers');
  assert.equal(M.upgradePlot(s, 0), false); assert.equal(s.coins, seedCash);
  done(s, 'lantern-keepers'); assert.ok(M.upgradePlot(s, 0)); assert.equal(s.plotLevels[0], 4);
  assert.equal(s.earned, before.earned); assert.equal(M.patchLevel(s).level, before.level);
  s.village.quests = {}; const old = reload(s);
  assert.equal(M.openPlots(old), 24); assert.equal(old.plotLevels[0], 4); assert.equal(M.villageFarmGate(old, 'plots'), null); assert.equal(M.villageFarmGate(old, 'variety', 0), null);
  assert.ok(M.choosePlotCrop(old, 0, 4)); assert.ok(M.plant(old, 0)); assert.equal(old.plots[0].variety, 4); assert.equal(M.patchLevel(old).level, before.level);
});
