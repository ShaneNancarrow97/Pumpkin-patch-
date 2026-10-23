import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { tree, fenceRun, lanternPost, gourd } from "./world.js";
import { buildHayrideVehicle } from "./hayride-vehicle.js";
import { HAYRIDE_TIERS, HAYRIDE_SCARES } from "./content/hayride.js";
import { HAYRIDE_SITE as SITE, HAYRIDE_STOPS, HAYRIDE_GATE_CLEAR, hayrideRouteSample, hayrideRouteDistance, HAYRIDE_ROUTE_LENGTH, hayrideConvoyPose, hayrideGuestPose } from "./content/hayride-layout.js";

const C={soil:0x34282a,wood:0x68432d,dark:0x30222b,brass:0xb78a52,amber:0xffbc69,purple:0x8f51bb,stone:0x645469};
// Each local set is built once, then placed beside the route's inner shoulder.
const block=(v,x,y,z,w,h,d,c,glow=false)=>v.block(x,y,z,w,h,d,c,glow);
function pumpkin(v,x,y,z,s=.55){gourd(v,x,y,z,s,0xc86a20);for(const dx of [-.15,.15])block(v,x+dx*s,y+s*.39,z+s*.53,s*.11,s*.1,.025,C.amber,true);block(v,x,y+s*.18,z+s*.53,s*.32,s*.06,.025,C.amber,true);}
function corpse(v,x,y,z,colour=0x63875d,robe=0x583c53){block(v,x,y+.8,z,.52,.64,.35,robe);block(v,x,y+1.44,z,.45,.44,.4,colour);for(const dx of [-.13,.13]){block(v,x+dx,y+.05,z,.18,.75,.2,C.dark);block(v,x+dx*1.45,y+1.58,z+.21,.055,.055,.02,0xdec876,true);}for(const dx of [-.4,.4])block(v,x+dx,y+1.05,z+.12,.22,.17,.55,robe);}
function manor(v){
  block(v,0,0,0,6.8,.25,3.6,C.stone);block(v,0,.25,-1.1,6,4.9,.35,0x4b3644);
  for(const x of [-2.65,2.65]){block(v,x,.3,-.2,.22,4.3,2.0,C.dark);block(v,x,4.4,-.2,.5,.18,2.3,C.brass);}
  block(v,0,.25,-.85,1.4,2.9,.2,0x15101e);for(const x of [-1.9,1.9])for(const y of [1.3,3.55]){block(v,x,y,-.85,.85,1.2,.12,0x261b35);block(v,x,y+.18,-.77,.06,.85,.06,0xb27143);block(v,x,y+.62,-.77,.7,.06,.06,0xb27143);}
  for(let k=0;k<11;k++)block(v,0,5.0+k*.14,-1.1,6.7-k*.46,.16,1.8,0x29202d);
  for(const x of [-2.8,2.8])block(v,x,.25,.9,.18,3.9,.18,C.dark);
  block(v,0,3.9,.45,6.5,.18,2.6,0x392530);for(let i=0;i<3;i++)block(v,0,i*.13,1.5-i*.3,2.6-i*.2,.14,.4,0x75616c);
}
function bus(v){
  const gold=0x9b732a;block(v,0,.55,0,7.4,.28,2.7,C.dark);block(v,0,.83,0,7.1,1.1,2.65,gold);
  for(const z of [-1.3,1.3]){block(v,0,1.95,z,7.1,1.0,.13,0x4d3c28);for(let i=0;i<7;i++){const x=-2.85+i*.9;block(v,x,2.03,z+(z>0?.08:-.08),.68,.75,.06,0x1b1922);for(const dx of [-.2,0,.2])block(v,x+dx,2.02,z+(z>0?.13:-.13),.045,.8,.045,0x51444b);}}
  block(v,0,2.97,0,7.3,.2,2.85,gold);for(const x of [-2.5,2.5])for(const z of [-1.2,1.2])block(v,x,.05,z,1.0,1.0,.35,C.dark);
  for(const x of [-2.8,0,2.8])corpse(v,x,.25,1.62,0x71816a,0x564c3b);
  for(const x of [-4.2,4.2])block(v,x,0,1.9,.14,2.4,.14,0x413943);for(let i=0;i<20;i++)block(v,-4.1+i*.43,.1,1.9,.045,2.1,.045,0x514953);
}
function makeScenicSet(stop){
  const r=seeded(1401+Math.floor(stop.at*100)),v=new Voxels(),group=new THREE.Group(),actors=[];
  if(stop.id==="scarecrows"){
    for(let i=0;i<14;i++){const x=(r()-.5)*6,z=(r()-.5)*2;v.block(x,0,z,.04,.6+r()*.6,.04,0x78603b);pumpkin(v,x,.03,z,.45+r()*.22);}
    for(const x of [-2,0,2]){block(v,x,0,-.3,.16,2.7,.16,C.wood);block(v,x,1.7,-.3,1.5,.12,.12,C.wood);block(v,x,1.15,-.3,.7,.75,.4,0x5a3146);const head=new Voxels();pumpkin(head,0,0,0,.7);block(head,0,.75,0,1.0,.12,.7,C.dark);const actor=head.build();actor.position.set(x,2.15,-.3);group.add(actor);actors.push({id:"turning-scarecrows",object:actor,base:actor.position.clone()});}
  }else if(stop.id==="spiders"){
    for(const x of [-2.6,2.6])for(let z=-2.5;z<2.5;z+=.5)for(let y=0;y<4.1;y+=.5)block(v,x,y,z,.7,.5,.5,vary(C.stone,.1,r));
    for(let x=-2.7;x<2.8;x+=.5)for(let z=-2.5;z<2.6;z+=.5)block(v,x,4.1,z,.5,.5,.5,vary(C.stone,.12,r));
    for(const side of [-1,1])for(let i=0;i<14;i++){block(v,side*(2.5-i*.035),2.9+i*.07,-2.5,.05,.06,.07,0xab9aad);block(v,side*(1.0+i*.11),4.0-i*.035,-2.5,.05,.06,.06,0xab9aad);}
    const a=new Voxels();block(a,0,0,0,.7,.3,.8,0x3a2049);for(const side of [-1,1])for(let i=0;i<4;i++){block(a,side*(.5+i*.08),-.1,-.35+i*.23,.7,.07,.07,0x60426f);block(a,side*.23,.12,.43,.075,.075,.025,0xd79eff,true);}const spider=a.build();spider.position.set(1.4,3.55,.2);group.add(spider);actors.push({id:"spider-drop",object:spider,base:spider.position.clone()});
  }else if(stop.id==="bride"){
    manor(v);const a=new Voxels();for(let i=0;i<6;i++)block(a,0,i*.22,0,1.12-i*.105,.23,.75-i*.06,0xc7c2d2);block(a,0,1.32,0,.5,.55,.4,0xe2d5d5);block(a,0,1.83,0,.52,.36,.44,0xb4aaa6);block(a,0,1.88,-.14,.65,.65,.1,0xc8c3d3);for(const x of [-.13,.13])block(a,x,1.95,.23,.07,.04,.02,0x453646);const bride=a.build();bride.position.set(0,.28,1.0);group.add(bride);actors.push({id:"bride-procession",object:bride,base:bride.position.clone()});
  }else if(stop.id==="pursuit"){
    const ghost=new Voxels();for(let i=0;i<6;i++)block(ghost,Math.sin(i)*.14,i*.35,0,1.7-i*.15,.4,1.3-i*.09,0x7950a1,i%2===0);for(const x of [-.25,.25])block(ghost,x,1.7,.65,.14,.18,.04,0xd4a9f1,true);block(ghost,0,1.25,.66,.25,.35,.04,0x29183a);const g=ghost.build();g.position.set(1.4,.15,0);group.add(g);actors.push({id:"spectral-burst",object:g,base:g.position.clone()});
    for(const x of [-2.4,-.9]){corpse(v,x,0,1.3,0xb9a183,0x31534d);block(v,x,1.1,1.0,.48,.6,.3,0x785b3e);for(let j=0;j<9;j++)block(v,x+j*.2,1.2+j*.03,1.55-j*.15,.11,.09,.09,0x7faac0,j%2===0);}
  }else {bus(v);const a=new Voxels();corpse(a,0,0,0,0x71816a,0x564c3b);const zombie=a.build();zombie.position.set(2.0,0,1.65);group.add(zombie);actors.push({id:"bus-breakout",object:zombie,base:zombie.position.clone()});}
  group.add(v.build());return{group,actors};
}
// Cut only this purchased entrance through old fence/trees, never the house.
function openWestGate(world){
  const matrix=new THREE.Matrix4(),colour=new THREE.Color(),r=HAYRIDE_GATE_CLEAR;let removed=0;
  world.traverse(m=>{if(!m.isInstancedMesh)return;let write=0;for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);const a=matrix.elements,x=a[12],z=a[14],w=Math.abs(a[0]),d=Math.abs(a[10]),top=a[13]+Math.abs(a[5])/2;
    if(top>.3&&x+w/2>r.x0&&x-w/2<r.x1&&z+d/2>r.z0&&z-d/2<r.z1){removed++;continue;}m.getColorAt(i,colour);m.setMatrixAt(write,matrix);m.setColorAt(write,colour);write++;}m.count=write;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();});return removed;
}
function dispose(group){group.traverse(m=>{if(m.isInstancedMesh)m.dispose();else m.geometry?.dispose();for(const material of Array.isArray(m.material)?m.material:m.material?[m.material]:[]){material.map?.dispose();material.dispose();}});}
function buildLand(signBoard){
  const v=new Voxels(),r=seeded(8813),b=SITE.bounds,root=new THREE.Group(),sets=[];
  // Cached half-unit forest floor: continuous tiles, no overlapping farm terrain.
  for(let x=b.x0;x<b.x1;x+=.5)for(let z=b.z0;z<b.z1;z+=.5){const lane=hayrideRouteDistance(x+.25,z+.25)<SITE.laneWidth/2,c=lane?[0x6a5140,0x705643,0x624b3d][Math.floor(r()*3)]:[0x303121,0x35311f,0x2d2b24][Math.floor(r()*3)];v.box(x,-.45,z,.5,.49,.5,c);if(!lane&&r()<.035)block(v,x+.25,.04,z+.25,.18,.07,.18,0x81374a);}
  // Warm timber boardwalk makes the deliberate transition across the farm seam.
  for(let x=-9.25;x<-2.8;x+=.35){v.box(x,.1,15.95,.33,.13,2.1,C.wood);for(const z of [16,18])block(v,x+.16,.05,z,.08,.08,.08,C.brass);}
  for(const z of [15.6,18.4]){block(v,-7.6,0,z,.22,2.7,.22,C.dark);block(v,-7.6,2.7,z,.42,.13,.42,C.brass);block(v,-7.6,2.15,z,.25,.32,.25,C.amber,true);}
  block(v,-7.6,2.85,17,.25,.18,3.2,C.wood);
  // Pedestrian paths remain to the east/south of the moving convoy.
  for(let z=17;z<38.5;z+=.5)v.box(-9.8,.045,z,1.5,.035,.5,0x746274);
  for(let x=-19.7;x<-9.0;x+=.5)v.box(x,.045,37.5,.5,.035,1.25,0x746274);
  for(let z=34.7;z<38.1;z+=.5)v.box(-19.7,.045,z,1.4,.035,.5,0x746274);
  // Passenger platform, queue and separate return apron.
  for(let x=-19.0;x<-13.7;x+=.3)v.box(x,.05,31.9,.28,.13,3.65,C.wood);
  for(let z=25;z<33.8;z+=.3)v.box(-13.7,.045,z,3.65,.07,.28,0x564333);
  fenceRun(v,r,-14,24.7,-9.9,24.7,(x)=>x>-11.9&&x<-10.4);
  fenceRun(v,r,-14,24.7,-14,33.8,(_,z)=>z>31.9);fenceRun(v,r,-9.9,24.7,-9.9,33.8,(_,z)=>z<26.5);fenceRun(v,r,-14,33.8,-9.9,33.8);
  for(const z of [27.5,29.5,31.5])fenceRun(v,r,-13.5,z,-10.5,z,(x)=>x<-12.6||x>-11.2);
  // A small admission booth beside the rear boarding steps.
  block(v,-20.5,.1,32,2.1,.18,2.0,C.wood);for(const x of [-21.35,-19.65])block(v,x,.25,31.3,.14,2.7,.14,C.dark);
  block(v,-20.5,.3,31.25,2.0,2.35,.16,C.wood);block(v,-20.5,.3,32.7,2.0,1.1,.17,C.wood);block(v,-20.5,1.4,32.7,2.2,.14,.55,C.brass);
  for(let z=30.9;z<33.1;z+=.3)block(v,-20.5,3.0+(.9-Math.abs(z-32))*.25,z,2.7,.15,.3,0x412839);
  for(const [x,z] of [[-22,32.3],[-13.5,34.2],[-10,24],[-10,18]])lanternPost(v,x,z,[],false);
  const routeTrees=[[-50,4],[-45,2],[-37,2],[-29,1.8],[-21,2],[-11,6],[-10,11],[-50,13],[-50,23],[-49,32],[-44,37],[-35,38],[-25,39],[-23,15],[-31,12],[-37,18],[-26,25],[-33,27],[-39,24]];
  for(const [x,z]of routeTrees)if(hayrideRouteDistance(x,z)>3.6)tree(v,r,x,z,.72+r()*.18,Math.floor(r()*3));
  for(const stop of HAYRIDE_STOPS){const frame=hayrideRouteSample(stop.at*HAYRIDE_ROUTE_LENGTH),set=makeScenicSet(stop),offset=stop.id==="spiders"?0:stop.id==="bride"?6.1:stop.id==="bus"?5.4:4.1;set.group.position.set(frame.x+frame.dz*offset,0,frame.z-frame.dx*offset);set.group.rotation.y=frame.yaw+(stop.id==="spiders"?0:Math.PI/2);root.add(set.group);sets.push({...stop,...set});}
  root.add(v.build());root.name="The Hollow Hayride woodland";
  const sign=signBoard("The Hollow Hayride","rear boarding · woodland scares",5.8);sign.position.set(-20.3,4.1,33);sign.userData={type:"hayride"};root.add(sign);
  const exit=signBoard("Farm →","unloading exit",2.8);exit.position.set(-12,1.8,37.2);root.add(exit);
  return{root,sets,sign};
}
// View-only controller: clocks, spending and dispatch are owned by the rules.
export function createHayrideWorld({scene,state,world,signBoard}){
  const root=new THREE.Group();scene.add(root);let built=false,land=null,vehicle=null,tier=0,preview=null,cleared=0;
  const reducedDefault=typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;let gentle=!!reducedDefault;
  const stationLamp=new THREE.PointLight(0xffbd77,0,11,1.6),convoyLamp=new THREE.PointLight(0xdfb4ff,0,9,1.6);stationLamp.position.set(-19.3,2.7,32.2);scene.add(stationLamp,convoyLamp);
  const marker=signBoard("The Hollow Hayride","woodland clearing · level 8",4.0);marker.position.set(SITE.marker.x,2.15,SITE.marker.z);marker.userData={type:"hayride"};root.add(marker);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(SITE.hit.w,SITE.hit.h,SITE.hit.d),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(SITE.hit.x,SITE.hit.y,SITE.hit.z);hit.userData={type:"hayride"};root.add(hit);hit.visible=false;
  function pose(){if(!vehicle)return;const p=hayrideConvoyPose(state,preview);vehicle.setPose(p);vehicle.setRollDistance(p.distance);vehicle.setSteering(p.tractor.yaw-p.wagon.yaw);const c=state.hayride?.convoy;vehicle.setBoarding(preview!==null?preview<=0||preview>=1:["loading","unloading"].includes(c?.phase));vehicle.group.updateMatrixWorld(true);}
  function sync(){
    const h=state.hayride;if(!h?.purchased){marker.visible=true;hit.visible=false;return;}
    marker.visible=false;hit.visible=true;
    if(!built){built=true;cleared=openWestGate(world.group??world);land=buildLand(signBoard);root.add(land.root);}
    if(tier!==h.tier){tier=h.tier;if(vehicle){root.remove(vehicle.group);vehicle.dispose();}vehicle=buildHayrideVehicle({capacity:HAYRIDE_TIERS[Math.max(0,tier-1)].seats});const driver=new Voxels();block(driver,0,1.43,-.3,.55,.56,.36,0x4a354b);block(driver,0,2.0,-.36,.43,.4,.38,0x929b70);block(driver,0,2.4,-.36,.7,.08,.58,C.dark);block(driver,0,2.48,-.36,.44,.18,.4,C.dark);for(const x of [-.2,.2])block(driver,x,1.6,-.62,.15,.14,.42,0x4a354b);vehicle.tractor.add(driver.build());root.add(vehicle.group);}
    pose();
  }
  function tick(time){sync();stationLamp.intensity=vehicle?4:0;if(!vehicle){convoyLamp.intensity=0;return;}pose();convoyLamp.position.set(vehicle.tractor.position.x,2.5,vehicle.tractor.position.z);convoyLamp.intensity=preview!==null||["departing","circuit","arriving"].includes(state.hayride?.convoy?.phase)?2.4:0;
    const h=state.hayride,owned=new Set(h.haunts?.owned??[]),active=new Set((h.haunts?.active??[]).filter(id=>owned.has(id)&&HAYRIDE_SCARES.some(p=>p.id===id&&p.tier<=h.tier)));
    for(const set of land.sets)for(const actor of set.actors){actor.object.position.copy(actor.base);actor.object.rotation.y=0;actor.object.scale.setScalar(1);if(gentle||!active.has(actor.id))continue;const near=Math.abs((preview??hayrideConvoyPose(state).progress)-set.at)<.055,wave=near?(Math.sin(time*2)+1)/2:0;
      if(actor.id==="turning-scarecrows")actor.object.rotation.y=wave*.55;else if(actor.id==="spider-drop")actor.object.position.y-=wave*1.2;else if(actor.id==="bride-procession")actor.object.position.z+=wave*1.1;else if(actor.id==="bus-breakout")actor.object.position.z+=wave*.8;else{actor.object.position.y+=Math.sin(time*1.5)*.16;actor.object.scale.setScalar(1+wave*.17);}}
  }
  sync();
  return{scene,root,sync,tick,focus:SITE.focus,setGentleMotion(value){gentle=value===null?!!reducedDefault:!!value;},get vehicle(){return vehicle;},setPreview(value){preview=value===null?null:Math.max(0,Math.min(1,value));pose();},getPreviewFrame(progress){preview=Math.max(0,Math.min(1,progress));pose();if(!vehicle)return null;const position=new THREE.Vector3(...vehicle.cameraAnchor).applyMatrix4(vehicle.wagon.matrixWorld),target=new THREE.Vector3(0,vehicle.cameraAnchor[1],-8).applyMatrix4(vehicle.wagon.matrixWorld);return{position,target,yaw:vehicle.wagon.rotation.y};},guestPose:v=>hayrideGuestPose(state,v),get pickables(){return state.hayride?.purchased?[hit,land?.sign].filter(Boolean):[marker];},get status(){return{purchased:!!state.hayride?.purchased,tier,phase:state.hayride?.convoy?.phase??"loading",queue:(state.visitors??[]).filter(v=>v.hayride&&!v.hayride.done&&v.hayride.phase==="queue").length,aboard:state.hayride?.convoy?.manifest?.length??0,bounds:SITE.bounds,cleared,preview};},dispose(){if(vehicle)vehicle.dispose();if(land)dispose(land.root);root.removeFromParent();stationLamp.removeFromParent();convoyLamp.removeFromParent();dispose(marker);hit.geometry.dispose();hit.material.dispose();}};
}
