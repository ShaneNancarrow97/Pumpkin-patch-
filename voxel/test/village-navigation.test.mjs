import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { ARRIVAL, GATES, NODES, FIXTURES, FORAGE_AREAS, DISTRICT_BY_ID, PLAN_SCALE as K } from "../src/content/village.js";
import { ELOWEN_HALL, ROWAN_HALL, VELVET_HALL, node } from "../src/village-models.js";
import { spreadStep, spreadWith, gather } from "../src/rules/village-spread.js";
import { villageCellFree, villageWalkObstacles, moveVillageWalker, villageHallFree, moveVillageHallWalker, villageDecorGroundClear, villageDecorWalkClear, VILLAGE_WALK_RADIUS } from "../src/rules/village-navigation.js";

// Probes are written on the design grid as drawn and asked where that spot now stands (the village is spread
// apart: village-spread.js). A spot on the Green goes with what it is beside: Elowen's door, Rowan's or the tree.
const world=([x,z])=>({x:x*K,z:z*K});
const state=()=>M.freshState(), at=(x,z)=>world(spreadStep(x,z));
const free=(s,x,z)=>{const p=at(x,z);return villageCellFree(s,p.x,p.z);};
const byElowen=(x,z)=>world(spreadWith(x,z,48,20)), byRowan=(x,z)=>world(spreadWith(x,z,66,20));
const halls=[ELOWEN_HALL,ROWAN_HALL,VELVET_HALL];

test("outdoor collisions use the models' rotated realm footprints, including their adjoining buildings",()=>{
  const s=state();
  for(const [x,z] of [[44,20],[44,27.5],[70,20],[69,14.7],[102,18],[93.6,22.2],[110.4,16.8]]) {
    assert.equal(free(s,x,z),false,`a solid building at ${x},${z}`);
  }
  for(const [x,z] of [[49,18.6],[64.6,20],[102,26],[102,28],[102,30]]) {
    assert.equal(free(s,x,z),true,`a doorway or the tavern's central terrace at ${x},${z}`);
  }
  for(const [x,z] of [[97.4,26.6],[106.6,28.4],[104.6,28.6],[97,29.6]]) {
    assert.equal(free(s,x,z),false,`terrace furniture or its railing at ${x},${z}`);
  }
  assert.equal(villageCellFree(s,FIXTURES.tree.x+2.8*K,FIXTURES.tree.z),false,"the tree's stone planter has a solid rim");
  assert.equal(villageCellFree(s,FIXTURES.pond.x,FIXTURES.pond.z),false,"the pond is water");
  assert.equal(villageCellFree(s,...ARRIVAL.spawn),true);
  assert.equal(villageCellFree(s,...ARRIVAL.back),true,"the carriage can be reached through the moth gate");
  assert.equal(free(s,20,-1),true,"the new arrival meadow extends south of the town wall");
  assert.equal(free(s,20,-23),false,"the new southern boundary remains closed away from the carriage");
});

test("all Green gathering spots, doors and first neighbours are reachable from the saved arrival",()=>{
  const s=state(),boxes=villageWalkObstacles(s),step=.75,start=ARRIVAL.spawn.map(x=>Math.round(x/step)),key=(x,z)=>`${x},${z}`;
  const queue=[start],seen=new Set([key(...start)]);
  for(let i=0;i<queue.length;i++) {
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx,nz=z+dz,k=key(nx,nz);
      if(seen.has(k)||!villageCellFree(s,nx*step,nz*step,VILLAGE_WALK_RADIUS,boxes))continue;
      seen.add(k);queue.push([nx,nz]);
    }
  }
  const targets=[...NODES.filter(n=>n.district==="green"),
    {id:"library door",...at(49,18.6)},{id:"workshop door",...at(64.6,20)},{id:"tavern door",...at(102,26)},
    {id:"Elowen",x:53.6*K,z:30.2*K-1.8},{id:"Rowan",...(p=>({x:p.x,z:p.z-1.8}))(world(spreadWith(53.8,20.6,...gather(FIXTURES.bench.x/K,FIXTURES.bench.z/K))))},
    {id:"Elowen after restoration",...at(50.8,21.6)},{id:"Rowan at his stall",...at(62.2,24.6)},
    {id:"Elowen page by the library",...at(49.5,25.4)},
    {id:"carriage",x:ARRIVAL.back[0],z:ARRIVAL.back[1]}];
  for(const p of targets)assert.ok(queue.some(([x,z])=>Math.hypot(x*step-p.x,z*step-p.z)<1.2),p.id);
});

test("later district gates and their scenery remain closed even for a rich, far-progressed save",()=>{
  const s=state();M.inviteToVillage(s);s.earned=1e9;s.village.story=["two-doorbells","footbridge","restaurant-opening","four-stories"];
  for(const gate of GATES) {
    assert.equal(villageCellFree(s,gate.x,gate.z),false,gate.id);
    const moved=moveVillageWalker(s,at(58,34),gate.x-58*K,gate.z-34*K);
    assert.equal(villageCellFree(s,moved.x,moved.z),true,`${gate.id}: motion ends on playable ground`);
    assert.ok(moved.z<=at(58,50).z-VILLAGE_WALK_RADIUS,"the northern lawns still stop before the first locked gate");
  }
  assert.equal(free(s,-10,62),false,"the Copse");assert.equal(free(s,60,74),false,"the Quarry");assert.equal(free(s,152,46),false,"the Moor");assert.equal(free(s,100,120),false,"the Marsh");
});

test("movement substeps stop fast walks at thin fences and slide along solid walls",()=>{
  const s=state(),from=at(14,7),cross=moveVillageWalker(s,from,0,15*K);
  assert.ok(cross.z<8*K,"a long frame cannot jump into the fenced plot");
  const fromWall=at(49,20),slide=moveVillageWalker(s,fromWall,-5*K,3*K);
  assert.ok(slide.x>at(47.81,20).x,"the library's outer footing blocks westward movement");
  assert.ok(slide.z>fromWall.z,"the free northward component slides along the wall");
  const exit=moveVillageWalker(s,at(58,4),0,-20*K);
  assert.ok(exit.z>=ARRIVAL.back[1]-VILLAGE_WALK_RADIUS,"a long walk cannot go past the carriage stop");
  assert.equal(moveVillageWalker(s,from,NaN,0),from);
});

test("placed furniture collision follows its saved rotation without mutating the save",()=>{
  const s=state();s.village.decor.placed=[{id:"market-crates",instance:"test",x:15*K,z:18*K,rotation:0}];
  assert.equal(villageCellFree(s,15*K+.7,18*K,0),false);
  s.village.decor.placed[0].rotation=90;
  assert.equal(villageCellFree(s,15*K+.7,18*K,0),true);
  assert.equal(villageCellFree(s,15*K,18*K+.7,0),false);
  const saved=JSON.stringify(s);moveVillageWalker(s,at(14,18),3,2);assert.equal(JSON.stringify(s),saved);
});

test("turned furniture blocks its body while leaving the enclosing box's empty corners walkable",()=>{
  const s=state(),p={id:"market-crates",instance:"turned",x:15*K,z:18*K,rotation:45};s.village.decor.placed=[p];
  assert.equal(villageCellFree(s,p.x,p.z,0),false);
  assert.equal(villageCellFree(s,p.x+.9,p.z+.9,0),true,"the empty corner of a rotated footprint stays clear");
  assert.equal(villageCellFree(s,p.x+.5,p.z-.5,.1),false,"the long turned body blocks the walker");
  assert.equal(villageDecorWalkClear(s,p,{x:p.x,z:p.z}),false,"a preview cannot be confirmed over the owner");
  assert.equal(villageDecorWalkClear(s,p,{x:p.x+3,z:p.z}),true);
});

test("placement and walking share the solid fences, buildings and water",()=>{
  for(const [id,{x,z},rotation] of [["stool",at(14,8),0],["market-crates",at(44,20),45],["stool",FIXTURES.pond,0]])assert.equal(villageDecorGroundClear(id,x,z,rotation),false,`${id} cannot overlap fixed scenery`);
  assert.equal(villageDecorGroundClear("stool",at(14,7).x,at(14,7).z),true,"clear ground remains available");
  assert.equal(villageDecorGroundClear("stool",NaN,7*K),false);
});

test("all hall spawns, doorway thresholds and furniture use local design coordinates",()=>{
  for(const hall of halls) {
    const plan={hall};assert.equal(villageHallFree(plan,...hall.spawn),true);
    assert.equal(villageHallFree(plan,0,.2),true,"the centre doorway leads out");
    assert.equal(villageHallFree(plan,2,.2),false,"the cut-away front is still a wall");
    assert.equal(villageHallFree(plan,0,100),false,"the doorway has a finite threshold");
    assert.equal(villageHallFree(plan,hall.w/2,-1),false,"side wall");
    assert.equal(villageHallFree(plan,0,-hall.d-1),false,"back wall");
    for(const [x0,z0,x1,z1] of hall.blocks)assert.equal(villageHallFree(plan,(x0+x1)/2,(z0+z1)/2),false,"solid furniture");
    const exit=moveVillageHallWalker(plan,{x:hall.spawn[0],z:hall.spawn[1]},0,20);
    assert.ok(exit.z>0&&exit.z<=.6,"walking down the aisle crosses only the exit");
  }
  assert.equal(villageHallFree(null,0,0),false);assert.equal(villageHallFree({hall:ELOWEN_HALL},NaN,0),false);
});

test("fast interior movement stops at desks, bars and chairs instead of tunnelling",()=>{
  for(const hall of halls) {
    const plan={hall},from={x:hall.spawn[0],z:hall.spawn[1]},end=moveVillageHallWalker(plan,from,0,-30);
    assert.equal(villageHallFree(plan,end.x,end.z),true);
    assert.ok(end.z>-hall.d,"remains in front of a solid back wall");
  }
  const hall={w:10,d:10,spawn:[0,-1],blocks:[[-4,-5,4,-4.9]]},end=moveVillageHallWalker({hall},{x:0,z:-1},0,-8);
  assert.ok(end.z>-4.9,"a thin workbench is not skipped by a slow frame");
});


test("the arrival meadow expands the Green with four connected forage areas",()=>{
  const p=DISTRICT_BY_ID.green.polygon;
  const area=(Math.max(...p.map(q=>q[0]))-Math.min(...p.map(q=>q[0])))*(Math.max(...p.map(q=>q[1]))-Math.min(...p.map(q=>q[1])));
  assert.ok(area>120*36*K*K*1.6);
  assert.equal(FORAGE_AREAS.length,4);
  assert.equal(NODES.filter(n=>n.district==="green"&&n.kind!=="blight").length,56);
  assert.equal(NODES.filter(n=>n.district==="green"&&n.kind==="blight").length,32);
  assert.ok(ARRIVAL.spawn[1]<0,"a broad forecourt precedes the old village gate");
  for(const a of FORAGE_AREAS)assert.equal(villageCellFree(state(),a.x,a.z),true,a.id);
});

test("walkable grass continues past both neighbours into the north lawns without crossing buildings or fences",()=>{
  // Each walk is drawn round its own neighbour's house, which now stands back from the tree.
  const s=state(),routes=[
    [byElowen,[[49,18.6],[49,27],[48,27],[48,32],[40,32],[40,44]]],
    [byRowan,[[64.6,20],[62.4,20],[62.4,32],[70,32],[70,44]]],
  ];
  for(const [here,route] of routes){
    let p=here(...route[0]);
    for(const [x,z]of route.slice(1)){const to=here(x,z);p=moveVillageWalker(s,p,to.x-p.x,to.z-p.z);assert.ok(Math.hypot(p.x-to.x,p.z-to.z)<.01,`grass route reaches ${x},${z}`);}
    assert.ok(p.z>36*K,"the former invisible northern limit is gone");
  }
  for(const [x,z]of [[34,22],[38,14],[75,23],[79.5,12]])assert.ok(free(s,x,z),`a residential garden lawn at ${x},${z} is walkable`);
  for(const [x,z]of [[28.5,18],[81.5,20],[66.6,20],[47.4,20]])assert.equal(free(s,x,z),false,"real fences and house walls stay solid");
});


test("gathered resource paintings leave no permanent stump or debris geometry",()=>{
  for(const material of ["logs","stone","fibre","herbs"]){
    const boxes=[];node({block:(...args)=>boxes.push(args)},material,false);
    assert.equal(boxes.length,0,material);
    node({block:(...args)=>boxes.push(args)},material,true);
    assert.ok(boxes.length>0,material+" returns when ready");
  }
});
