import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { NODES, NODE_BY_ID, BLIGHT_NODES, RESOURCE_AREAS, PLAN_SCALE as K } from '../src/content/village.js';
import { villageNodeCandidates, villageNodePosition } from '../src/content/village-node-sites.js';

const green=BLIGHT_NODES.filter(n=>n.district==='green'),blight=green[0];
function ready(){const s=M.freshState();s.village.invited=true;s.village.unlocks.push('gathering');return s;}
const reload=s=>M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test('resources reach both residential gardens and the northern lawns while legacy first sites remain in place',()=>{
  const ordinary=NODES.filter(n=>n.district==='green'&&n.kind!=='blight');
  assert.equal(ordinary.length,56);assert.equal(green.length,32);
  const original={"logs-01":[9,-6],"stone-01":[91,-8],"fibre-01":[39,-15],"herbs-01":[72,-7]};
  for(const [id,[x,z]]of Object.entries(original))assert.deepEqual(villageNodePosition(ready(),id),{x:x*K,z:z*K},id+' retains its old visible first site');
  for(const area of RESOURCE_AREAS){
    const nodes=ordinary.filter(n=>n.area===area.id);
    assert.ok(nodes.length>=2,area.name+' has loose pickups');
    assert.ok(new Set(nodes.map(n=>n.material)).size>=2,area.name+' offers mixed materials');
    for(const n of nodes)assert.ok(villageNodeCandidates(n).length>=2,n.id+' has a real regrowth choice');
  }
  const northern=ordinary.filter(n=>n.z>36*K);assert.ok(northern.length>=12);
  assert.deepEqual(new Set(northern.map(n=>n.material)),new Set(['logs','stone','fibre','herbs']));
  assert.ok(new Set(green.map(n=>n.scale)).size>=8,'fungus clumps have deterministic varied sizes');
  assert.ok(green.every(n=>n.scale>=.65&&n.scale<=1.05));
});

test('Blackroot passes through distinct timed growth stages and only mature patches can be rooted out',()=>{
  const s=ready(),total=M.villageGatheringWait(s,blight.material),before=JSON.stringify(s);
  assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'mature');assert.equal(JSON.stringify(s),before,'growth queries never mutate state');
  for(const [ratio,stage]of [[0,'bare'],[.1,'spores'],[.35,'shoots'],[.65,'young'],[.99,'young'],[1,'mature']]){
    s.village.nodes[blight.id]=total*(1-ratio);const info=M.nodeGrowthInfo(s,blight.id);
    assert.equal(info.stage,stage);assert.ok(Math.abs(info.ratio-ratio)<1e-9);assert.equal(info.visible,true);
    assert.equal(info.available,ratio===1);assert.equal(M.nodeReady(s,blight.id),ratio===1);
    if(ratio<1){const saved=JSON.stringify(s);assert.equal(M.gatherNode(s,blight.id),null);assert.equal(JSON.stringify(s),saved,'an immature click changes no cycles, samples or quests');}
  }
  const result=M.gatherNode(s,blight.id);assert.equal(result.cleared,true);assert.equal(result.amount,1);
  assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'bare');assert.equal(M.blightClearCount(s,'green'),1);
  for(const id of ['missing','__proto__','constructor',undefined])assert.equal(M.nodeGrowthInfo(s,id),null);
});

test('growth uses the saved cooldown clock, survives reload and pauses without changing quest progress',()=>{
  let s=ready();M.gatherNode(s,blight.id);const total=s.village.nodes[blight.id];
  M.updateVillage(s,total*.2);assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'spores');
  const info=M.nodeGrowthInfo(s,blight.id),clears=M.blightClearCount(s,'green');s=reload(s);
  assert.equal(s.version,M.STATE_VERSION);assert.deepEqual(M.nodeGrowthInfo(s,blight.id),info);
  s.paused=true;M.updateVillage(s,total);assert.deepEqual(M.nodeGrowthInfo(s,blight.id),info);
  s.paused=false;M.updateVillage(s,total*.3);assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'shoots');
  M.updateVillage(s,total*.25);assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'young');
  M.updateVillage(s,total);assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'mature');
  assert.equal(M.blightClearCount(s,'green'),clears,'regrowth is never credited as a fresh clear');
});

test('mature full-satchel clearing and ordinary resource timers preserve their separate behaviour',()=>{
  const s=ready();s.village.materials['cursed-spores']=M.villageMaterialCapacity(s);
  const clear=M.gatherNode(s,blight.id);assert.equal(clear.cleared,true);assert.equal(clear.amount,0);assert.equal(clear.overflow,true);
  assert.equal(M.nodeGrowthInfo(s,blight.id).stage,'bare');assert.equal(M.blightClearCount(s,'green'),1);
  const log=NODE_BY_ID['logs-11'];s.village.materials.logs=M.villageMaterialCapacity(s);
  const before=JSON.stringify(s);assert.equal(M.gatherNode(s,log.id).full,true);assert.equal(JSON.stringify(s),before);
  s.village.materials.logs=0;M.gatherNode(s,log.id);assert.equal(M.nodeGrowthInfo(s,log.id).stage,'bare');
  M.updateVillage(s,s.village.nodes[log.id]/2);assert.equal(M.nodeGrowthInfo(s,log.id).stage,'bare','ordinary gathered piles leave no intermediate debris');
});

test('expanded resource sockets preserve old furniture poses and suppress every covered growth stage',()=>{
  const node=NODE_BY_ID['logs-16'],raw=M.saveData(ready());
  raw.village.decor.placed=[{id:'stool',instance:'legacy-lawn',x:node.x,z:node.z,rotation:30}];
  const pose=structuredClone(raw.village.decor.placed),s=M.restoreState(raw);
  assert.deepEqual(s.village.decor.placed,pose);assert.equal(M.nodeReady(s,node.id),false);assert.equal(M.nodeGrowthInfo(s,node.id).visible,false);
  assert.equal(M.gatherNode(s,node.id),null);assert.equal(s.village.gatherCycles[node.id],undefined);
  s.village.decor.placed=[];assert.equal(M.nodeReady(s,node.id),true);
  const fungus=green[1];s.village.decor.placed=[{id:'stool',instance:'old-fungus',x:fungus.x,z:fungus.z,rotation:0}];
  for(const fraction of [.1,.5,.9,1]){s.village.nodes[fungus.id]=600*(1-fraction);const info=M.nodeGrowthInfo(s,fungus.id);assert.equal(info.suppressed,true);assert.equal(info.visible,false);assert.equal(info.available,false);}
});
