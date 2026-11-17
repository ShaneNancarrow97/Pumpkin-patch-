import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import {EXPANSION_LEVEL_GATES,EXPANSION_CHAPTERS} from '../src/content/village-expansion.js';
import {expansionLevelRequirement,EXPANSION_SEAL_FLAGS} from '../src/rules/village-expansion-access.js';
const flags=gate=>(Array.isArray(gate)?gate:[gate]).flatMap(id=>id==='four-seals'?EXPANSION_SEAL_FLAGS:[id]);
test('every level6–20 has an earlier reachable mainline requirement, never friendship mastery',()=>{
 for(let level=6;level<=20;level++){
  assert.ok(EXPANSION_LEVEL_GATES[level]);
  for(const id of flags(EXPANSION_LEVEL_GATES[level])){const c=EXPANSION_CHAPTERS.find(c=>c.id===id||c.reward?.effects?.includes(id));assert.ok(c,id);assert.ok(!c.optional,id);assert.ok(c.level<level,`${id} cannot require the level it gates`);}
 }
});
test('missing chapters block future levels, show real progress, and honoured levels remain earned',()=>{
 for(let level=6;level<=20;level++){
  const s=M.freshState(),needed=flags(EXPANSION_LEVEL_GATES[level]);s.progression.claimed=Array.from({length:level-1},(_,i)=>i+1);s.progression.homeLegacyThrough=1;s.earned=M.LEVELS[level-1].at;
  // Fulfil home criteria so a missing village milestone is the sole blocker.
  s.house.level=3;s.progression.homeActivities={visit:1,wardrobe:1,cook:10};s.village.quests.invitation={step:3,done:true};s.house.wallpapers.parlour='w01';s.kitchen.recipes=M.RECIPES.map(r=>r.id);
  s.house.placed=Array.from({length:12},(_,i)=>({id:i===0?'copper-range':i===1?'gothic-spice-cabinet':'d03',room:['kitchen','kitchen','parlour','bedroom','attic'][i%5],books:i===2?['b01','b02','b03','b04','b05','b06']:[]}));
  s.village.expansion.effects=needed.slice(0,-1);const income=M.levelEarnings(s),q=expansionLevelRequirement(s,level);assert.equal(q.met,false);assert.equal(q.current,needed.length-1);assert.ok(q.text&&!q.text.includes('undefined'));assert.equal(M.patchLevel(s).level,level-1);
  s.village.expansion.effects.push(needed.at(-1));assert.equal(expansionLevelRequirement(s,level).met,true);assert.equal(M.patchLevel(s).level,level);assert.equal(M.levelEarnings(s),income);
  s.progression.claimed.push(level);s.village.expansion.effects=[];assert.equal(expansionLevelRequirement(s,level).met,true);assert.equal(M.patchLevel(s).level,level);
  const restored=M.restoreState(M.saveData(s));assert.ok(restored.progression.claimed.includes(level));assert.equal(expansionLevelRequirement(restored,level).met,true);
 }
});
test('four-seal checklist names the remaining region instead of a silent gate',()=>{const s=M.freshState();s.village.expansion.effects=['copse-seal','quarry-seal','moor-seal'];const q=expansionLevelRequirement(s,15);assert.equal(q.current,3);assert.equal(q.target,4);assert.match(q.text,/Hollow Green/);});
