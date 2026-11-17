import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { QUESTS } from "../src/content/village-quests.js";
import { villageObjectives, villageObjective, selectVillageObjective, residentObjectivePriority } from "../src/village-objectives.js";
function village(){const s=M.freshState();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(row=>row.level);M.inviteToVillage(s);return s;}
test("the journal catalogue preserves all thirteen quests and sixty-four chapters without changing a save",()=>{
  const s=village(),before=JSON.stringify(M.saveData(s)),chapters=M.expansionJournal(s),records=villageObjectives(s,chapters);
  assert.equal(records.length,77);assert.equal(new Set(records.map(row=>row.id)).size,77);
  assert.equal(records.filter(row=>row.source==="legacy").length,13);assert.equal(records.filter(row=>row.source==="expansion").length,64);
  assert.equal(JSON.stringify(M.saveData(s)),before);
});
test("every legacy step boundary is a read-only projection of its existing progress and baseline",()=>{
  const s=village();let count=0;
  for(const quest of QUESTS)for(let step=0;step<quest.steps.length;step++){
    s.village.quests[quest.id]={step,done:false,base:17};const before=structuredClone(s),record=villageObjective(s,quest.id,[]);
    assert.equal(record.completed,step);assert.equal(record.steps.filter(row=>row.current).length,1);assert.equal(record.steps[step].type,quest.steps[step].kind);
    assert.deepEqual(record.requirements,M.questRequirementRows(s,quest.id));assert.equal(record.task,M.questStepText(s,quest.id));assert.deepEqual(s,before);count++;
  }
  assert.equal(count,46);
});
test("an explicit legacy follow wins a saved chapter while stale completed IDs fall back safely",()=>{
  const s=village();s.village.quests['rowan-1']={step:0,done:false,base:null};const records=villageObjectives(s);
  assert.equal(selectVillageObjective(records,{preferredId:'rowan-1',savedExpansionId:'green-research'}).id,'rowan-1');
  assert.equal(selectVillageObjective(records,{preferredId:'missing',savedExpansionId:'green-research'}).id,'green-research');
  const done=records.map(row=>row.id==='rowan-1'?{...row,status:'done'}:row);
  assert.equal(selectVillageObjective(done,{preferredId:'rowan-1',fallbackLegacyId:'invitation'}).id,'invitation');
  assert.equal(selectVillageObjective(done,{preferredId:'rowan-1'}),null);
});
test("locked and unaccepted stories explain their state without inventing progress or accepting them",()=>{
  const s=village(),before=structuredClone(s),locked=villageObjective(s,'rowan-2',[]);
  assert.equal(locked.status,'locked');assert.match(locked.reason,/Loose Boards|Open for Business/);
  assert.equal(selectVillageObjective([locked],{preferredId:locked.id}),locked);assert.deepEqual(s,before);
  s.village.quests.invitation.done=true;const offered=villageObjective(s,'elowen-1',[]);
  assert.equal(offered.status,'available');assert.match(offered.task,/Talk to Elowen/);assert.equal(s.village.quests['elowen-1'],undefined);
});
test("resident priorities keep a ready handover before the followed story and preserve every secondary story",()=>{
  const records=[{id:'ready',giver:'elowen',status:'available'},{id:'active',giver:'elowen',status:'active'},{id:'followed',giver:'elowen',status:'available'},{id:'finished',giver:'elowen',status:'done'},{id:'other',giver:'rowan',status:'active'}],before=structuredClone(records);
  assert.deepEqual(residentObjectivePriority(records,'elowen',{preferredId:'followed',readyDeliveryId:'active'}).map(row=>row.id),['active','followed','ready']);assert.deepEqual(records,before);
});
test("the selected legacy HUD record does not inspect unrelated chapter descriptors",()=>{
  const s=village();s.village.quests['rowan-1']={step:0,done:false,base:null};
  const chapters=new Proxy([],{get(){throw Error('Unrelated journal catalogue inspected');}});
  assert.equal(villageObjective(s,'rowan-1',chapters).id,'rowan-1');
});
test("inherited object names and non-string preferences cannot become legacy quest IDs",()=>{
  const s=village(),before=structuredClone(s),records=villageObjectives(s);
  for(const id of ['__proto__','constructor','toString',null,{},[],42]){
    assert.equal(villageObjective(s,id,[]),null);
    assert.equal(selectVillageObjective(records,{preferredId:id,fallbackLegacyId:'invitation'}).id,'invitation');
  }
  assert.deepEqual(s,before);
});
