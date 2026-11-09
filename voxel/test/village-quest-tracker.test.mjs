import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { trackerPortraitMarkup, trackerDetailsMarkup } from '../src/ui/village-quest-tracker.js';

test('the pinned checklist reads real new-clearing progress without changing the quest', () => {
  const s = M.freshState(); M.recordHomeActivity(s, "visit"); s.earned = M.LEVELS[2].at;
  M.inviteToVillage(s); M.finishTour(s);
  s.village.quests.invitation = {step:3,base:null,done:true}; s.village.unlocks.push('gathering');
  M.startQuest(s,'blight-first-signs'); M.gatherNode(s,'blight-green-01');
  const rows = M.questRequirementRows(s,'blight-first-signs'), before = structuredClone(s);
  const html = trackerDetailsMarkup(rows,'Root out the whole knot.');
  assert.match(html,/data-quest-requirement="blight:green"/);
  assert.match(html,/1 \/ 3/); assert.match(html,/Still needed/);
  assert.match(html,/id="vg-quest-journal"/); assert.deepEqual(s,before);
});

test('tracker portraits have a safe fallback and checklist text stays literal', () => {
  assert.match(trackerPortraitMarkup({giver:'rowan'},'data:image/png;base64,AAAA'),/<img /);
  assert.doesNotMatch(trackerPortraitMarkup({},'javascript:alert(1)'),/<img /);
  const html = trackerDetailsMarkup([{key:'logs',label:'Logs <script>',have:4,need:4,complete:true}],'<b>Keep exploring</b>');
  assert.match(html,/is-ready/); assert.match(html,/4 \/ 4/); assert.match(html,/Logs &lt;script&gt;/);
  assert.doesNotMatch(html,/<script>|<b>Keep exploring/);
});
