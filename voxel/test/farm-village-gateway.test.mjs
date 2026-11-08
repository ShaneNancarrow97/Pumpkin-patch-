import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { villageGateway, atVillageGateway, villageRoadDistance, onVillageExitCorridor } from '../src/content/village-gateway.js';
import { buildVillageGateway } from '../src/farm-village-gate.js';
import { createPlayerControl, farmPlayerGeometry, playerPointFree, slidePlayer } from '../src/player-control.js';
import { inFarmPatch, ROUTE_OUT } from '../src/content/farm-layout.js';
import { MEADOW_EXIT } from '../src/content/festival-meadow.js';
import { TRUCK_EXIT_ROUTE } from '../src/content/cooking-visits.js';
import { COOKING_SITE } from '../src/content/cooking-layout.js';
import { freshState } from '../src/model.js';
import { COL } from '../src/world.js';
import { grounds, G as CELL } from '../src/ground.js';
const state=(plots=0,kitchen=false,meadow=false,cocoa=0)=>({upgrades:{plots},kitchen:{purchased:kitchen},festival:{meadow,cocoa:{level:cocoa}}});
function samples(points){const list=[];for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/.15);for(let j=0;j<=n;j++)list.push({x:ax+(bx-ax)*j/n,z:az+(bz-az)*j/n});}return list;}

test('village travel shares the existing guest exit before and after the service land opens',()=>{
 const base=villageGateway(state()),truck=villageGateway(state(0,true)),meadow=villageGateway(state(0,false,true));
 assert.deepEqual([base.x,base.z],ROUTE_OUT.at(-1));
 assert.deepEqual([truck.x,truck.z],MEADOW_EXIT.at(-1));assert.deepEqual([meadow.x,meadow.z],TRUCK_EXIT_ROUTE.at(-1));
 assert.deepEqual(base.lane,ROUTE_OUT);assert.deepEqual(truck.lane,MEADOW_EXIT);
 assert.ok(villageRoadDistance(base.approach.x,base.approach.z,base.lane)<1e-9);
 assert.equal(atVillageGateway({x:37.8,z:15.1},state()),false,'former side portal has no travel zone');
});

test('only the public exit corridor extends the farm across every expansion and service combination',()=>{
 for(const plots of [0,1,2,3,4])for(const kitchen of [false,true])for(const meadow of [false,true])for(const cocoa of [0,1,3,5]){
  const s=state(plots,kitchen,meadow,cocoa),g=villageGateway(s),geometry=farmPlayerGeometry(s),label=JSON.stringify({plots,kitchen,meadow,cocoa});
  for(const p of samples(g.corridor.points)){
   assert.equal(playerPointFree(p.x,p.z,geometry.bounds,geometry.obstacles),true,label+' road reachable');
   assert.equal(inFarmPatch(p.x,p.z,plots),false,label+' off pumpkins');
  }
  const walked=slidePlayer(g.approach,g.x-g.approach.x,g.z-g.approach.z,geometry.bounds,geometry.obstacles);
  assert.equal(atVillageGateway(walked,s),true,label+' actual eastward crossing');
  assert.equal(playerPointFree(g.x,10,geometry.bounds,geometry.obstacles),false,label+' not an unlocked meadow');
  assert.equal(atVillageGateway(g.approach,s),false,label+' approach is safely before travel');
  if(kitchen||meadow)for(const p of [{x:42.75,z:5.15},{x:42.75,z:6.6},{x:49,z:6.6}])assert.equal(atVillageGateway(p,s),false,label+' no travel while ordering/queuing');
 }
 assert.equal(onVillageExitCorridor(42.5,9,villageGateway(state()).corridor),false);
});

test('the small roadside marker and exact cobble continuation follow purchased land without a portal',()=>{
 const s=state(),signs=[],build=buildVillageGateway((title,sub,width)=>{const sign=new THREE.Group();sign.userData={title,sub,width};signs.push(sign);return sign;},s);
 assert.equal(signs.length,1);assert.equal(signs[0].userData.title,'Mothlight');assert.ok(signs[0].rotation.y<-.5,'lettering faces arriving travellers');
 let boxes=0,lights=0;build.root.traverse(o=>{if(o.isInstancedMesh)boxes+=o.count;if(o.isLight)lights++;});assert.ok(boxes<12);assert.equal(lights,0);assert.equal(build.hit.userData.type,'village');
 let previous=null;
 for(const [kitchen,meadow,start] of [[false,false,40],[true,false,53.7],[true,true,54]]){
  s.kitchen.purchased=kitchen;s.festival.meadow=meadow;build.sync();const g=villageGateway(s),road=build.root.getObjectByName('Existing public road continuation'),map=road.material.map.image;
  assert.equal(g.extension.x0,start);assert.equal(build.root.userData.gateway.x,g.x);assert.equal(signs.length,1,'reuse the same board texture');
  if(previous){assert.notEqual(road,previous);assert.equal(previous.parent,null);}previous=road;
  assert.ok(g.extension.z1-g.extension.z0<3.5,'only a roadside strip is added');
  for(const p of samples(g.lane).filter(p=>p.x>=start&&p.x<=g.x)){
   const i=Math.floor((p.x-g.extension.x0)/CELL),j=Math.floor((p.z-g.extension.z0)/CELL),x=g.extension.x0+(i+.5)*CELL,z=g.extension.z0+(j+.5)*CELL,k=(j*map.width+i)*4;
   const [,colour]=grounds.cobble(x,z,COL.stone,.42,1,0x2a2430);
   assert.deepEqual(Array.from(map.data.slice(k,k+4)),[(colour>>16)&255,(colour>>8)&255,colour&255,0],'same farm path palette/grout, no grass over road');
  }
 }
 assert.equal(villageGateway(state(0,true)).extension.x0,COOKING_SITE.pavingBounds.x1,'no overlap with the truck apron');
});

test('real controller teleports and clicked walks retain exit endpoints beyond the old yard bounds',async()=>{
 const previous=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try{
  for(const kitchen of [false,true])for(const meadow of [false,true]){
   const s=freshState();s.kitchen.purchased=kitchen;s.festival.meadow=meadow;
   const scene=new THREE.Scene(),actor=new THREE.Group();actor.add(new THREE.Group());actor.position.set(13.2,0,16.6);
   const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(20,25,40);camera.lookAt(20,0,16);camera.updateMatrixWorld();
   const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
   const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}}),g=villageGateway(s);
   player.setEnabled(true,'natalie');player.teleport(g.approach.x,g.approach.z);assert.ok(Math.hypot(player.state().position.x-g.approach.x,player.state().position.z-g.approach.z)<1e-9,'safeSpot does not clamp exit approach');
   player.teleport(13.2,16.6);let arrived=0,time=0;assert.equal(player.walkTo({...g.approach,near:.3,reach:.5,then:()=>arrived++}),true);
   for(let i=0;i<1400&&player.state().travelling;i++){player.update(.05,time+=.05);await Promise.resolve();}
   await Promise.resolve();assert.equal(arrived,1,`clicked walk arrives kitchen=${kitchen},meadow=${meadow}`);assert.ok(Math.hypot(player.state().position.x-g.approach.x,player.state().position.z-g.approach.z)<.55);
  }
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
