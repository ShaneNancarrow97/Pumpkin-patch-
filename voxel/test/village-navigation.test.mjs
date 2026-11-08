import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { ARRIVAL, GATES, NODES, FIXTURES, PLAN_SCALE as K } from "../src/content/village.js";
import { ELOWEN_HALL, ROWAN_HALL, VELVET_HALL } from "../src/village-models.js";
import { villageCellFree, villageWalkObstacles, moveVillageWalker, villageHallFree, moveVillageHallWalker, VILLAGE_WALK_RADIUS } from "../src/rules/village-navigation.js";

const state=()=>M.freshState(), at=(x,z)=>({x:x*K,z:z*K});
const free=(s,x,z)=>villageCellFree(s,x*K,z*K);
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
  assert.equal(free(s,20,-1),false,"the southern wall has no other exit");
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
    {id:"Elowen",x:53.6*K,z:30.2*K-1.8},{id:"Rowan",x:53.8*K,z:20.6*K-1.8},
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
    assert.ok(moved.z<=36*K-VILLAGE_WALK_RADIUS,"cannot cross the Green's northern boundary");
  }
  assert.equal(free(s,-10,62),false,"the Copse");assert.equal(free(s,60,74),false,"the Quarry");assert.equal(free(s,152,46),false,"the Moor");assert.equal(free(s,100,120),false,"the Marsh");
});

test("movement substeps stop fast walks at thin fences and slide along solid walls",()=>{
  const s=state(),from=at(14,7),cross=moveVillageWalker(s,from,0,15*K);
  assert.ok(cross.z<8*K,"a long frame cannot jump into the fenced plot");
  const fromWall=at(49,20),slide=moveVillageWalker(s,fromWall,-5*K,3*K);
  assert.ok(slide.x>47.81*K,"the library's outer footing blocks westward movement");
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
