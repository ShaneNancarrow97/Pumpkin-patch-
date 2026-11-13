import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';

const puzzles=M.EXPANSION_ACTIVITIES.filter(a=>a.type==='puzzle');

// A supplied late-game farm with the legacy introduction complete; chapters still advance in story order.
function game(){
 const s=M.freshState();s.coins=1e6;M.addStock(s,0,12);s.kitchen.purchased=true;s.kitchen.food.wedges=4;
 s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;
 s.village.invited=true;s.village.toured=true;
 for(const id of ['invitation','two-doorbells','elowen-2','rowan-2'])s.village.quests[id]={done:true};
 for(const who of ['elowen','rowan','mabel','tansy','opal','cinder','corvus','baron','granny'])s.village.friends[who]={met:true,xp:1080,chatIn:0,gifts:[],seen:[]};
 for(const id in s.village.materials)s.village.materials[id]=40;
 for(const id in s.village.expansion.gems)s.village.expansion.gems[id]=10;
 return s;
}

// Compare the rendered choices, including multiplicity and their stable authored indices.
function assertOptions(s,a){
 const info=M.expansionActivityInfo(s,a.id),ids=info.options.map(o=>o.id);
 assert.equal(info.options.length,a.choices.length,`${a.id}: choice count`);
 assert.deepEqual([...ids].sort(),[...a.choices].sort(),`${a.id}: every authored choice must remain selectable`);
 for(const option of info.options){
  assert.equal(typeof option.id,'string',`${a.id}: no undefined token`);
  assert.equal(option.label,option.id,`${a.id}: the label keeps its token`);
  assert.ok(Number.isInteger(option.index)&&option.index>=0,`${a.id}: valid authored index`);
  assert.equal(a.choices[option.index],option.id,`${a.id}: index still selects the same token`);
 }
 return info.options;
}

test('every authored main and personal puzzle keeps its full choice multiset deterministically across saves',()=>{
 const s=game(),before=JSON.stringify(M.saveData(s)),other=game();other.village.expansion.seed=0xffffffff;
 const restored=M.restoreState(JSON.parse(before));
 assert.ok(puzzles.some(a=>a.chapter.startsWith('cast-')),'include the authored personal puzzles');
 assert.deepEqual([...new Set(puzzles.map(a=>a.puzzleKind))].sort(),['flavour-set','light-route','sequence','stage-slots']);
 for(const a of puzzles){
  const expected=assertOptions(s,a);
  assert.deepEqual(assertOptions(s,a),expected,`${a.id}: repeated reads`);
  assert.deepEqual(assertOptions(other,a),expected,`${a.id}: independent of the mining seed`);
  assert.deepEqual(assertOptions(restored,a),expected,`${a.id}: same options after reload`);
 }
 assert.equal(JSON.stringify(M.saveData(s)),before,'reading puzzle options must not change the save');
});

// Resume through the same saved tokens as a player who closes the game during a puzzle.
function reloadPuzzle(s,a){
 const expected=M.expansionActivityInfo(s,a.id),saved=JSON.parse(JSON.stringify(M.saveData(s)));
 const restored=M.restoreState(saved),actual=M.expansionActivityInfo(restored,a.id);
 for(const key of ['options','selected','rotations','assignments','hints','attempts'])assert.deepEqual(actual[key],expected[key],`${a.id}: saved ${key}`);
 return restored;
}

// Answers are entered only through choices actually offered by the activity, never the accessible solve action.
function solvePuzzle(s,a){
 let result;
 const act=action=>{const r=M.actVillageExpansion(s,a.id,{area:a.area,x:a.x,z:a.z,...action});assert.equal(r.ok,true,`${a.id}: ${r.reason}`);return r;};
 if(a.puzzleKind==='light-route'){
  for(const [id,turns]of [['near',1],['middle',3],['far',3]])for(let i=0;i<turns;i++){
   act({rotate:id});if(id==='near')s=reloadPuzzle(s,a);
  }
  result=act({submit:true});
 }else{
  for(const [i,token]of a.solution.entries()){
   const option=M.expansionActivityInfo(s,a.id).options.find(o=>o.id===token);
   assert.ok(option,`${a.id}: solution token ${token} must be selectable`);
   result=act({choice:option.id,...(a.puzzleKind==='stage-slots'?{slot:a.slots[i]}:{})});
   if(i===0)s=reloadPuzzle(s,a);
  }
  if(['stage-slots','flavour-set'].includes(a.puzzleKind))result=act({submit:true});
 }
 assert.equal(result.complete,true,`${a.id}: ordinary puzzle completion`);
 assert.equal(s.village.expansion.completed[a.id],true);
 return s;
}

test('every authored puzzle can complete through its offered tokens, including Moor, Marsh and Granny after reload',()=>{
 let s=game();const solved=[];
 for(const c of M.EXPANSION_CHAPTERS){
  for(const id of c.activities){
   const a=M.expansionActivityInfo(s,id);assert.equal(a.available,true,`${id}: ${a.reason}`);
   if(a.type==='puzzle'){assertOptions(s,a);s=solvePuzzle(s,a);solved.push(id);continue;}
   let result;
   if(a.type==='farm'){
    if(!a.started){result=M.actVillageExpansion(s,id,{area:a.area,x:a.x,z:a.z});assert.equal(result.ok,true,`${id}: ${result.reason}`);}
    if(a.metric==='cook')s.kitchen.ledger.batchesCooked+=a.amount;
    else if(a.metric==='harvest')s.harvested+=a.amount;
    else assert.fail(`${id}: unsupported farm metric ${a.metric}`);
    result=M.actVillageExpansion(s,id,{area:a.area,x:a.x,z:a.z});
   }else result=M.actVillageExpansion(s,id,{area:a.area,x:a.x,z:a.z});
   assert.equal(result.complete,true,`${id}: ${result.reason}`);
  }
  assert.equal(s.village.expansion.chapters[c.id],true,`${c.id}: chapter settled`);
 }
 assert.deepEqual(solved.sort(),puzzles.map(a=>a.id).sort(),'exercise every actual puzzle through its normal controls');
 assert.ok(M.hasExpansionReward(s,'lantern-night'));
 assert.ok(M.hasExpansionReward(s,'granny-invited'));
});
