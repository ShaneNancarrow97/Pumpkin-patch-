import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { CAST_CHAPTERS } from '../src/content/village-expansion-cast.js';

// Declared late-game save isolates personal stories; main campaign gates remain
// exercised by the separate progression suite, rather than silently bypassed.
function fixture(who){
 const s=M.freshState();s.paused=false;s.coins=100000;s.earned=M.LEVELS[19].at;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;s.progression.pending=[];
 s.village.invited=true;s.village.toured=true;
 for(const id of ['invitation','two-doorbells','elowen-2','rowan-2'])s.village.quests[id]={done:true,step:99,base:null};
 s.village.expansion.effects.push('copse-threads','copse-restored','quarry-bell','restaurant-opening','four-seals','moor-stage','marsh-restored','granny-listens');
 for(const id of Object.keys(s.village.materials))s.village.materials[id]=30;
 s.village.friends[who]={...s.village.friends[who],met:true,xp:['elowen','rowan'].includes(who)?280:0};return s;
}
function complete(s,id){
 let a=M.expansionActivityInfo(s,id);assert.equal(a.available,true,`${id} is the next available step`);
 const context={area:a.area,x:a.x,z:a.z},act=action=>M.actVillageExpansion(s,id,{...action,context});let result;
 if(a.type==='puzzle'){
  if(a.puzzleKind==='sequence')for(const choice of a.solution)result=act({choice});
  else if(a.puzzleKind==='flavour-set'){for(const choice of [...a.solution].reverse())act({choice});result=act({submit:true});}
  else if(a.puzzleKind==='stage-slots'){for(const [i,slot]of a.slots.entries())act({slot,choice:a.solution[i]});result=act({submit:true});}
  else if(a.puzzleKind==='light-route'){
   const coins=s.coins;assert.equal(act({submit:true}).complete,undefined,'unconnected light cannot finish');assert.equal(s.coins,coins);
   act({rotate:'near'});for(const mirror of ['middle','far'])for(let turn=0;turn<3;turn++)act({rotate:mirror});result=act({submit:true});
  }
 }else if(a.type==='farm'){
  if(!a.started)act({});a=M.expansionActivityInfo(s,id);const amount=a.need-a.have;
  if(a.metric==='cook')s.kitchen.ledger.batchesCooked+=amount;else if(a.metric==='harvest')s.harvested+=amount;
  result=act({});
 }else result=act({});
 assert.equal(result.ok,true,`${id}: ${result.reason}`);assert.equal(result.complete,true,`${id} commits once`);return result;
}
for(const who of ['mabel','tansy','opal','cinder','corvus','baron','granny','elowen','rowan'])test(`${who}'s actual personal chapters advance, award once and survive a save`,()=>{
 let s=fixture(who);const chapters=CAST_CHAPTERS.filter(c=>c.who===who);
 for(const c of chapters){
  const record=M.expansionJournal(s).find(q=>q.id===c.id);assert.equal(record.status,'available',`${c.title} is not blocked by extra gifts`);
  let events=[];for(const id of c.activities.map(a=>a.id))events.push(...complete(s,id).events);
  assert.equal(events.filter(e=>e.type==='expansion-chapter-complete'&&e.chapter===c.id).length,1);
  for(const id of c.reward.decor??[])assert.ok(s.house.owned.includes(id),`${c.id} awards its actual furnishing ${id}`);
  for(const id of Object.keys(c.reward.villageDecor??{}))assert.ok(s.village.decor.owned[id]>=1,`${c.id} awards its actual garden item ${id}`);
  const coins=s.coins,owned=[...s.wardrobe.owned],before=JSON.stringify(s.village.expansion.receipts[c.id]);
  assert.equal(M.actVillageExpansion(s,c.activities.at(-1).id).ok,false);assert.equal(s.coins,coins);assert.deepEqual(s.wardrobe.owned,owned);assert.equal(JSON.stringify(s.village.expansion.receipts[c.id]),before);
  s=M.restoreState(M.saveData(s));assert.equal(M.expansionJournal(s).find(q=>q.id===c.id).status,'done');
 }
 const finale=chapters.at(-1);for(const id of finale.reward.costumes??[])assert.ok(s.wardrobe.owned.includes(id));
 assert.equal(s.village.friends[who].xp,1080);assert.ok(s.progression.bonusEarned>0);assert.equal(M.levelEarnings(s),M.LEVELS[19].at,'personal story bonuses do not become farm trading XP');
});
