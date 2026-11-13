import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { villageObjectives } from "../src/village-objectives.js";
import { renderVillageJournal } from "../src/ui/village-journal.js";
function setup(){const s=M.freshState();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(row=>row.level);M.inviteToVillage(s);s.village.toured=true;s.village.quests.invitation={step:3,done:true,base:null};s.village.quests['two-doorbells']={step:3,done:true,base:null};s.village.quests['rowan-1']={step:0,done:false,base:null};return s;}
test("one followed story leads a single journal and other stories start folded",()=>{
  const state=setup(),records=villageObjectives(state),followed=records.find(row=>row.id==='rowan-1'),before=structuredClone(state),view=renderVillageJournal({state,records,followed});
  assert.equal((view.html.match(/aria-label="Following"/g)??[]).length,1);assert.match(view.html,/data-quest-card="rowan-1"/);
  assert.match(view.html,/<details class="vg-ch-story-fold" data-vg-details-key="objective:green-research">/);
  assert.match(view.html,/data-vg-details-key="objectives:later"/);assert.match(view.html,/data-vg-details-key="objectives:finished"/);
  assert.doesNotMatch(view.html,/Around the Green|The village that forgot to knock/);assert.deepEqual(state,before);
});
test("a followed chapter puts its next action above its folded story, steps and rewards",()=>{
  const state=setup(),records=villageObjectives(state),followed=records.find(row=>row.id==='green-research'),html=renderVillageJournal({state,records,followed}).html;
  const fold=html.indexOf('data-vg-details-key="objective-story:green-research"');
  assert.ok(html.indexOf('data-vgx-guide="green-research"')<fold);assert.ok(html.indexOf('class="vgx-next"')<fold);
  assert.ok(html.indexOf('class="vgx-steps"')>fold);assert.match(html,/data-vgx-track="green-research" aria-pressed="true"/);
});
test("the neighbour journal keeps all open secondary stories accessible with their real actions",()=>{
  const state=setup(),records=villageObjectives(state),html=renderVillageJournal({state,records,who:'elowen'}).html;
  for(const id of ['elowen-1','lantern-keepers','blight-first-signs','green-research'])assert.ok(html.includes(`objective:${id}`),id);
  assert.match(html,/data-vg-page="journal">All stories/);assert.doesNotMatch(html,/data-quest-card="rowan-1"/);
  assert.match(html,/data-vg-meet="elowen"/);assert.match(html,/data-vgx-guide="green-research"/);assert.doesNotMatch(html,/data-vg-claim/);
});
test("completed stories retain their named rewards and world changes inside the archive",()=>{
  const state=setup();state.village.expansion.chapters['green-research']=true;const records=villageObjectives(state),before=JSON.stringify(M.saveData(state)),html=renderVillageJournal({state,records}).html;
  assert.match(html,/data-vg-finished-story="invitation"/);assert.match(html,/data-vg-finished-story="green-research"/);assert.match(html,/The first ward lantern burns/);assert.match(html,/rewards received/);assert.equal(JSON.stringify(M.saveData(state)),before);
});
