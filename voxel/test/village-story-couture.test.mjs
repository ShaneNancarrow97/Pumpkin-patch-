import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { villageObjectives } from '../src/village-objectives.js';
import { renderVillageJournal } from '../src/ui/village-journal.js';

// Discovery is an existing tab command, never an implicit quest acceptance.
test('an untracked journal with only available stories offers discovery without starting one', () => {
  const state = M.freshState(); state.earned = M.LEVELS.at(-1).at; state.progression.claimed = M.LEVELS.map(row => row.level); M.inviteToVillage(state); state.village.toured = true;
  state.village.quests.invitation = { step: 3, done: true, base: null }; state.village.quests["two-doorbells"] = { step: 3, done: true, base: null };
  const records = villageObjectives(state).filter(record => record.status === 'available');
  assert.ok(records.length);
  const before = JSON.stringify(M.saveData(state));
  const html = renderVillageJournal({ state, records }).html;
  assert.match(html, /class="vc-journal-invitation"/);
  assert.match(html, /data-vg-journal-tab="discover">Discover stories/);
  assert.doesNotMatch(html, /data-quest-card=|data-pad-default/);
  assert.equal(JSON.stringify(M.saveData(state)), before);
});

test('the completed journal counts only genuine finished records and never creates a claim action', () => {
  const state = M.freshState(); M.inviteToVillage(state);
  state.village.quests.invitation = { step: 3, done: true, base: null };
  const records = villageObjectives(state), count = records.filter(record => record.status === 'done').length;
  const html = renderVillageJournal({ state, records, tab: 'completed' }).html;
  assert.ok(count > 0);
  assert.ok(html.includes(`${count} ${count === 1 ? 'chapter' : 'chapters'} completed · rewards received`));
  assert.equal((html.match(/class="vc-completed-seal"/g) ?? []).length, count);
  assert.doesNotMatch(html, /data-vg-claim/);
});
