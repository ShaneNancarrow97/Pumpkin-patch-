import test from 'node:test';
import assert from 'node:assert/strict';
import {NODES,FORAGE_AREAS,RESOURCE_AREAS,ARRIVAL,PLAN_SCALE as K} from '../src/content/village.js';
import {villageNodeCandidates,villageNodePosition} from '../src/content/village-node-sites.js';
import {villageCellFree,villageWalkObstacles,VILLAGE_WALK_RADIUS} from '../src/rules/village-navigation.js';
import {node} from '../src/village-models.js';
import {buildNodes} from '../src/village-world.js';

const green=NODES.filter(n=>n.district==='green');
test('each Green resource has distinct, bounded and navigation-clear respawn sites',()=>{
 const all=[];
 for(const n of green.filter(n=>n.kind!=='blight')){
  const choices=villageNodeCandidates(n);assert.ok(choices.length>=2,n.id);
  const area=RESOURCE_AREAS.find(a=>a.id===n.area)??FORAGE_AREAS.find(a=>n.x>=a.x0&&n.x<=a.x1&&n.z>=a.z0&&n.z<=a.z1);
  for(const p of choices){
   assert.ok(villageCellFree(null,p.x,p.z,.65),n.id+' site clear');
   if(area)assert.ok(p.x>=area.x0&&p.x<=area.x1&&p.z>=area.z0&&p.z<=area.z1,n.id+' named gathering area');
   else assert.ok(Math.abs(p.x-n.x)<=5&&Math.abs(p.z-n.z)<=5,n.id+' local patch');
   for(const q of all)if(q.id!==n.id)assert.ok(Math.hypot(q.x-p.x,q.z-p.z)>=1.64,'different nodes never stack across cycles');
   all.push({...p,id:n.id});
  }
 }
 for(const n of NODES.filter(n=>n.district!=='green'))assert.deepEqual(villageNodeCandidates(n),[{x:n.x,z:n.z}]);
});

test('cursed growth returns to its fixed, walkable socket rather than drifting into a path',()=>{
 for(const n of green.filter(n=>n.kind==='blight')){
  assert.deepEqual(villageNodeCandidates(n),[{x:n.x,z:n.z}]);
  for(const cycle of [0,1,9,999])assert.deepEqual(villageNodePosition({village:{gatherCycles:{[n.id]:cycle}}},n),{x:n.x,z:n.z});
  assert.ok(villageCellFree(null,n.x,n.z,.65),n.id+' clears the walker');
 }
});

test('visible resources remain stable through unrelated random rolls; only a harvested node advances',()=>{
 const s={village:{seed:123,gatherCycles:{}}},a=green[0],b=green[1],first=villageNodePosition(s,a),other=villageNodePosition(s,b);
 for(let i=0;i<20;i++){s.village.seed=Math.imul(s.village.seed,1664525)+1013904223;s.coins=i*100;assert.deepEqual(villageNodePosition(s,a),first);}
 s.village.gatherCycles[a.id]=1;assert.notDeepEqual(villageNodePosition(s,a),first);assert.deepEqual(villageNodePosition(s,b),other);
 const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(villageNodePosition(saved,a),villageNodePosition(s,a));
 for(const bad of [NaN,Infinity,-1,'3']){s.village.gatherCycles[a.id]=bad;assert.deepEqual(villageNodePosition(s,a),first);}
 for(const id of ['missing','__proto__','constructor',undefined]){assert.equal(villageNodePosition(s,id),null);assert.deepEqual(villageNodeCandidates(id),[]);}
 assert.deepEqual(villageNodePosition({}, {id:a.id,x:NaN,z:Infinity}),first,'callers cannot overwrite canonical site coordinates');
});

test('every respawn candidate remains reachable from the new arrival',()=>{
 const boxes=villageWalkObstacles(null),step=.75,start=ARRIVAL.spawn.map(v=>Math.round(v/step)),queue=[start],seen=new Set([start.join(',')]);
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[x+dx,z+dz],key=q.join(',');if(seen.has(key)||!villageCellFree(null,q[0]*step,q[1]*step,VILLAGE_WALK_RADIUS,boxes))continue;seen.add(key);queue.push(q);}}
 for(const n of green)for(const p of villageNodeCandidates(n))assert.ok(queue.some(([x,z])=>Math.hypot(x*step-p.x,z*step-p.z)<.85),n.id);
});

test('logs and boulders are readable loose pickups and disappear after gathering',()=>{
 for(const material of ['logs','stone']){
  const boxes=[];node({block:(...b)=>boxes.push(b)},material,true);
  const bounds=boxes.reduce((a,b)=>[Math.min(a[0],b[0]-b[3]/2),Math.max(a[1],b[0]+b[3]/2),Math.min(a[2],b[1]),Math.max(a[3],b[1]+b[4]),Math.min(a[4],b[2]-b[5]/2),Math.max(a[5],b[2]+b[5]/2)],[Infinity,-Infinity,Infinity,-Infinity,Infinity,-Infinity]);
  assert.ok((bounds[1]-bounds[0])*K<=.52);assert.ok((bounds[5]-bounds[4])*K<=.7);assert.ok((bounds[3]-bounds[2])*K<=.4);
  assert.ok(boxes.length>=10,'end grain or faceted mineral detail remains visible');
  const spent=[];node({block:(...b)=>spent.push(b)},material,false);assert.equal(spent.length,0);
 }
 const state={village:{gatherCycles:{[green[0].id]:1}}},built=buildNodes(()=>true,state);
 assert.deepEqual(built.userData.resourceSites.find(p=>p.id===green[0].id),{id:green[0].id,...villageNodePosition(state,green[0])});
});
