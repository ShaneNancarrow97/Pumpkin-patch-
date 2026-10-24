import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Voxels } from "../src/voxels.js";
import { HAYRIDE_SITE, HAYRIDE_RIDE_BOUNDS, HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH, hayrideRouteSample, hayrideRouteDistance, hayrideConvoyPose, hayrideQueueSlot, hayrideApproach, hayrideReturn, hayrideJourneyTiming, hayrideGuestPose, hayrideAlong } from "../src/content/hayride-layout.js";
import { inFarmPatch, counterPlace } from "../src/content/farm-layout.js";
import { createHayrideWorld } from "../src/hayride-world.js";
import { freshHayride } from "../src/rules/hayride.js";
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test("hayride route is a finite closed arc with consistent distance and all five ordered sets",()=>{
  assert.equal(HAYRIDE_STOPS.length,5);assert.ok(HAYRIDE_ROUTE_LENGTH>170&&HAYRIDE_ROUTE_LENGTH<210);
  const p=hayrideRouteSample(0),q=hayrideRouteSample(HAYRIDE_ROUTE_LENGTH);close(p.x,q.x);close(p.z,q.z);close(p.x,HAYRIDE_SITE.station.x);close(p.z,HAYRIDE_SITE.station.z);close(p.yaw,0);
  for(let i=0;i<1000;i++) {const a=hayrideRouteSample(HAYRIDE_ROUTE_LENGTH*i/1000);for(const n of Object.values(a))assert.ok(Number.isFinite(n));close(Math.hypot(a.dx,a.dz),1);assert.ok(a.x>HAYRIDE_RIDE_BOUNDS.x0+2&&a.x<HAYRIDE_RIDE_BOUNDS.x1-4);assert.ok(a.z>HAYRIDE_RIDE_BOUNDS.z0+2&&a.z<HAYRIDE_RIDE_BOUNDS.z1-3);}
  assert.deepEqual(HAYRIDE_STOPS.map(s=>s.id),["scarecrows","spiders","bride","pursuit","bus"]);
  for(let i=1;i<HAYRIDE_STOPS.length;i++)assert.ok(HAYRIDE_STOPS[i].at>HAYRIDE_STOPS[i-1].at);
});

test("coupled poses remain joined and continuous through departure, circuit and arrival",()=>{
  const s={hayride:{convoy:{phase:"loading",elapsed:0,progress:0}}};
  for(let i=0;i<=100;i++){const p=hayrideConvoyPose(s,i/100),a=p.tractor,b=p.wagon;close(a.x+Math.sin(a.yaw)*.88,b.x-Math.sin(b.yaw)*2.92);close(a.z+Math.cos(a.yaw)*.88,b.z-Math.cos(b.yaw)*2.92);}
  s.hayride.convoy={phase:"departing",elapsed:3};const a=hayrideConvoyPose(s);s.hayride.convoy={phase:"circuit",progress:0};const b=hayrideConvoyPose(s);close(a.tractor.x,b.tractor.x);close(a.tractor.z,b.tractor.z);
  s.hayride.convoy={phase:"circuit",progress:1};const c=hayrideConvoyPose(s);s.hayride.convoy={phase:"arriving",elapsed:0};const d=hayrideConvoyPose(s);close(c.tractor.x,d.tractor.x);close(c.tractor.z,d.tractor.z);
});

test("queue and pedestrian routes stay outside the pumpkin patch and respect each till place",()=>{
  const slots=Array.from({length:16},(_,i)=>hayrideQueueSlot(i));assert.equal(new Set(slots.map(p=>`${p.x}:${p.z}`)).size,16);
  for(const p of slots)assert.ok(hayrideRouteDistance(p.x,p.z)>3);
  for(let spot=0;spot<7;spot++){const place=counterPlace(spot),inbound=hayrideApproach(place),outbound=hayrideReturn(place);assert.deepEqual(inbound[0],place);assert.deepEqual(outbound.at(-1),place);for(const route of [inbound,outbound])for(let i=0;i<=150;i++){const p=hayrideAlong(route,i/150);assert.equal(inFarmPatch(p.x,p.z,4),false);}}
  assert.ok(hayrideJourneyTiming({spot:0},"arrival").approachSeconds>10);assert.ok(hayrideJourneyTiming({spot:0},"after").approachSeconds>hayrideJourneyTiming({spot:0},"arrival").approachSeconds);
});

test("guest poses cover walking, queued, boarded and returning guests without mutating state",()=>{
  const s={hayride:{...freshHayride(),purchased:true},upgrades:{plots:4},visitors:[]},v={id:1,spot:3,hayride:{phase:"approach",fromStall:true,elapsed:5,approachSeconds:30,returnSeconds:30,order:0,seat:0}};s.visitors=[v];const before=JSON.stringify(s);
  assert.ok(hayrideGuestPose(s,v).walking);assert.equal(JSON.stringify(s),before);
  for(const phase of ["queue","boarding","riding","unloading","return"]){v.hayride.phase=phase;const p=hayrideGuestPose(s,v);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));if(phase==="riding")assert.equal(p.seated,true);}
  v.hayride.done=true;assert.equal(hayrideGuestPose(s,v),null);
});

test("native site retains the legacy ground, allocates a fixed light pool and previews without spending",()=>{
  const scene=new THREE.Scene(),legacy=new THREE.Group(),v=new Voxels();v.box(-7.8,0,16.9,.2,1.1,.2,0x444444);v.box(-8,0,16,.5,.04,.5,0x444444);v.box(6,0,6,.5,2,.5,0x444444);legacy.add(v.build());scene.add(legacy);
  const state={hayride:{...freshHayride(),purchased:true},visitors:[],upgrades:{plots:0},coins:1234};
  const signBoard=()=>new THREE.Group(),controller=createHayrideWorld({scene,state,world:{group:legacy},signBoard});
  assert.equal(controller.status.cleared,1);let remaining=0;legacy.traverse(m=>{if(m.isInstancedMesh)remaining+=m.count;});assert.equal(remaining,2);
  // The rendered rails must not clip any waiting position or its centre exit.
  controller.root.updateMatrixWorld(true);
  const obstacles=[],instance=new THREE.Matrix4(),combined=new THREE.Matrix4();
  controller.root.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++){m.getMatrixAt(i,instance);combined.multiplyMatrices(m.matrixWorld,instance);const box=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(combined);if(box.max.y>.3&&box.min.y<1.7&&box.max.x>-13.5&&box.min.x<-10.5&&box.max.z>25&&box.min.z<33)obstacles.push(box);}});
  const clearAt=(x,z)=>assert.equal(obstacles.some(box=>box.max.x>x-.2&&box.min.x<x+.2&&box.max.z>z-.2&&box.min.z<z+.2),false,`Queue blocked at ${x},${z}`);
  for(let i=0;i<16;i++){const p=hayrideQueueSlot(i);clearAt(p.x,p.z);}
  for(let z=25.2;z<32.7;z+=.25)clearAt(-12,z);
  const countLights=()=>scene.children.filter(x=>x.isPointLight).length;assert.equal(countLights(),2);state.hayride.tier=2;controller.sync();assert.equal(countLights(),2);
  // The ride is lit by a fixed set of lights: the wagon's lantern, the set ahead,
  // the focus light and four that follow the lane's lanterns.
  const rideLights=()=>controller.scene.children.filter(x=>x.isPointLight);assert.equal(rideLights().length,7);
  assert.ok(controller.status.lanterns>=10);controller.setPreview(.3);controller.getPreviewFrame(.3);controller.tick(5);
  assert.ok(rideLights().filter(l=>l.intensity>0).length>=3,"the wagon lantern and the nearest lane lanterns are lit");
  for(const l of rideLights())if(l.intensity>0)assert.ok(hayrideRouteDistance(l.position.x,l.position.z)<5,"every lit light stands by the lane");
  controller.setPreview(null);assert.equal(rideLights().filter(l=>l.intensity>0).length,0);assert.equal(rideLights().length,7);
  const before=JSON.stringify(state);controller.setPreview(.54);const frame=controller.getPreviewFrame(.54);assert.ok(frame.position.toArray().every(Number.isFinite));controller.tick(12);controller.setPreview(null);assert.equal(JSON.stringify(state),before);
  let boxes=0;const matrix=new THREE.Matrix4();controller.root.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(Math.abs(matrix.determinant())>0);}boxes+=m.count;});assert.ok(boxes<35000,`too many boxes: ${boxes}`);controller.dispose();
});
