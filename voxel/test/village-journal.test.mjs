import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { villageObjectives } from "../src/village-objectives.js";
import { renderVillageJournal, JOURNAL_TABS, nextJournalTab } from "../src/ui/village-journal.js";
function setup(){const s=M.freshState();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(row=>row.level);M.inviteToVillage(s);s.village.toured=true;s.village.quests.invitation={step:3,done:true,base:null};s.village.quests['two-doorbells']={step:3,done:true,base:null};s.village.quests['rowan-1']={step:0,done:false,base:null};return s;}
test("one followed story leads a single journal and other stories start folded",()=>{
  const state=setup(),records=villageObjectives(state),followed=records.find(row=>row.id==='rowan-1'),before=structuredClone(state),view=renderVillageJournal({state,records,followed});
  assert.equal((view.html.match(/aria-label="Following"/g)??[]).length,1);assert.match(view.html,/data-quest-card="rowan-1"/);
  assert.match(view.html,/<details class="vf-story-row" data-vg-details-key="objective:green-research">/);
  assert.match(view.html,/data-vg-details-key="objectives:later"/);assert.match(view.html,/data-vg-details-key="objectives:finished"/);
  assert.doesNotMatch(view.html,/Around the Green|The village that forgot to knock/);assert.deepEqual(state,before);
  assert.match(view.html,/^<section class="vg-journal vf-journal"/);
  assert.doesNotMatch(view.html,/One story to follow|class="vg-journal-head"/);
  assert.ok(view.html.indexOf('Gather 4 logs')<view.html.indexOf('Journal notes &amp; village tour'),'the current task precedes collapsed help');
});
test("a followed chapter puts its next action above its folded story, steps and rewards",()=>{
  const state=setup(),records=villageObjectives(state),followed=records.find(row=>row.id==='green-research'),html=renderVillageJournal({state,records,followed}).html;
  const fold=html.indexOf('data-vg-details-key="objective-story:green-research"');
  assert.ok(html.indexOf('data-vgx-guide="green-research"')<fold);assert.ok(html.indexOf('class="vf-next-objective"')<fold);
  assert.ok(html.indexOf('class="vf-story-steps"')>fold);assert.doesNotMatch(html,/data-vgx-track="green-research"/);
  assert.equal((html.match(/class="vf-show-way"/g)??[]).length,1);assert.match(html,/<meter[^>]*max="3" value="0"/);
});
test("the neighbour journal keeps all open secondary stories accessible with their real actions",()=>{
  const state=setup(),records=villageObjectives(state),html=renderVillageJournal({state,records,who:'elowen'}).html;
  for(const id of ['elowen-1','lantern-keepers','blight-first-signs','green-research'])assert.ok(html.includes(`objective:${id}`),id);
  assert.match(html,/data-vg-page="journal">All stories/);assert.doesNotMatch(html,/data-quest-card="rowan-1"/);
  assert.match(html,/data-vg-meet="elowen"/);assert.match(html,/data-vgx-guide="green-research"/);assert.doesNotMatch(html,/data-vg-claim/);
});
test("completed stories retain their named rewards and world changes inside the archive",()=>{
  const state=setup();state.village.expansion.chapters['green-research']=true;const records=villageObjectives(state),before=JSON.stringify(M.saveData(state)),html=renderVillageJournal({state,records}).html;
  assert.match(html,/data-vg-finished-story="invitation"/);assert.match(html,/data-vg-finished-story="green-research"/);assert.match(html,/The first ward lantern burns/);assert.match(html,/Rewards received/);assert.equal(JSON.stringify(M.saveData(state)),before);
});
test("a neighbour's secondary handovers remain visible when another resident gave the story",()=>{
  const state=setup();state.village.quests['lantern-keepers']={step:0,done:false,base:null};state.village.quests['rowan-stall']={step:2,done:false,base:null};state.coins=500;Object.assign(state.village.materials,{logs:12,stone:8,fibre:6,herbs:4});
  const before=JSON.stringify(M.saveData(state)),html=renderVillageJournal({state,records:villageObjectives(state),who:'rowan'}).html;
  assert.match(html,/data-vg-details-key="objective:lantern-keepers"/);assert.match(html,/data-vg-handover="rowan" data-quest="lantern-keepers"/);assert.match(html,/data-vg-handover="rowan" data-quest="rowan-stall"/);assert.equal(JSON.stringify(M.saveData(state)),before);
});


test("journal tabs expose one selected panel and group all canonical stories without changing the save",()=>{
  const state=setup(),records=villageObjectives(state),before=JSON.stringify(M.saveData(state)),followed=records.find(row=>row.id==='rowan-1');
  assert.equal(records.length,77);
  for(const selected of JOURNAL_TABS){
    const html=renderVillageJournal({state,records,followed,tab:selected}).html;
    assert.equal((html.match(/role="tab"/g)??[]).length,3);assert.equal((html.match(/role="tabpanel"/g)??[]).length,3);
    assert.equal((html.match(/aria-selected="true"/g)??[]).length,1);
    assert.equal((html.match(/data-pad-skip/g)??[]).length,3,'panels stay keyboard focusable without becoming controller actions');
    for(const id of JOURNAL_TABS){
      assert.ok(html.includes(`id="vf-tab-${id}" role="tab" aria-selected="${id===selected}" aria-controls="vf-page-${id}" tabindex="${id===selected?0:-1}"`));
      assert.ok(html.includes(`id="vf-page-${id}" class="vf-journal-page" role="tabpanel" aria-labelledby="vf-tab-${id}" tabindex="0"${id===selected?'':' hidden'}`));
    }
    for(const record of records){
      const key=record.status==='locked'?`data-vg-locked-story="${record.id}"`:record.status==='done'?`data-vg-finished-story="${record.id}"`:record.id===followed.id?`data-quest-card="${record.id}"`:`data-vg-details-key="objective:${record.id}"`;
      assert.ok(html.includes(key),`${selected}: ${record.id} stays accessible in its canonical status`);
    }
  }
  assert.equal(JSON.stringify(M.saveData(state)),before);
});

test("a tracked hero shows its own portrait and real chapter progress before the story fold",()=>{
  const state=setup();state.village.quests['rowan-1'].step=1;
  const records=villageObjectives(state),followed=records.find(row=>row.id==='rowan-1'),html=renderVillageJournal({state,records,followed,portrait:id=>`portrait:${id}`}).html;
  assert.match(html,/class="vf-story-portrait"[^>]*><img src="portrait:rowan"/);
  assert.ok(html.includes(`max="${followed.need}" value="${followed.completed}"`));
  assert.ok(html.indexOf('Next objective')<html.indexOf('objective-story:rowan-1'));
  assert.match(html,/class="vf-show-way" data-vg-objective-guide="rowan-1"/);
  assert.doesNotMatch(html,/data-vg-claim/);
  assert.match(html,/Step 2 of 3/);assert.equal((html.match(/class="is-done"><\/i>/g)??[]).length,1);assert.equal((html.match(/class="is-current"><\/i>/g)??[]).length,1);
  assert.match(html,/<svg class="vf-route-arrow"[^>]*aria-hidden="true"/);assert.doesNotMatch(html,/↗/);
});

test("journal keyboard tabs wrap and support Home and End without treating movement keys as tab commands",()=>{
  assert.equal(nextJournalTab('active','ArrowLeft'),'completed');assert.equal(nextJournalTab('completed','ArrowRight'),'active');
  assert.equal(nextJournalTab('discover','Home'),'active');assert.equal(nextJournalTab('active','End'),'completed');
  assert.equal(nextJournalTab('active','w'),null);assert.equal(nextJournalTab('active','ArrowDown'),null);
});
