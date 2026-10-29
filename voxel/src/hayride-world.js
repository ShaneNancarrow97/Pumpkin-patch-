import * as THREE from "three";
import { Voxels, seeded, vary, chunkedVoxels } from "./voxels.js";
import { lanternPost, gourd } from "./world.js";
import { buildHayrideVehicle } from "./hayride-vehicle.js";
import { createHayrideForest } from "./hayride-forest.js";
import { buildHayrideStation, HAYRIDE_STATION_LAMP } from "./hayride-station.js";
import { createSpider, poseSpider, createBrood, mount, buildSpiderCave } from "./hayride-spiders.js";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS, HAYRIDE_SCARES } from "./content/hayride.js";
import { HAYRIDE_SITE as SITE, HAYRIDE_FLEET_BAY, HAYRIDE_RIDE_BOUNDS, HAYRIDE_STOPS, HAYRIDE_GATE_CLEAR, hayrideRouteSample, hayrideRouteDistance, hayrideRouteProfile, HAYRIDE_ROUTE_LENGTH, hayrideSpan, hayrideConvoyPose, hayrideFarmConvoyPose, hayrideGuestPose } from "./content/hayride-layout.js";

// Each set's own light: the scarecrows' bonfire orange, the spiders' sickly
// green, the bride's cold moon, the spectre's violet and the bus's red alarm.
const SET_LIGHT={scarecrows:0xff8a3a,spiders:0x9dff70,bride:0xa9bcff,pursuit:0xc07cff,bus:0xff4a3a,graveyard:0xa3c5bf,thicket:0x9b85bb};
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
    // The cave follows the lane, so buildRideLand builds it (hayride-spiders.js).
  }else if(stop.id==="bride"){
    manor(v);const a=new Voxels();for(let i=0;i<6;i++)block(a,0,i*.22,0,1.12-i*.105,.23,.75-i*.06,0xc7c2d2);block(a,0,1.32,0,.5,.55,.4,0xe2d5d5);block(a,0,1.83,0,.52,.36,.44,0xb4aaa6);block(a,0,1.88,-.14,.65,.65,.1,0xc8c3d3);for(const x of [-.13,.13])block(a,x,1.95,.23,.07,.04,.02,0x453646);const bride=a.build();bride.position.set(0,.28,1.0);group.add(bride);actors.push({id:"bride-procession",object:bride,base:bride.position.clone()});
  }else if(stop.id==="pursuit"){
    const ghost=new Voxels();for(let i=0;i<6;i++)block(ghost,Math.sin(i)*.14,i*.35,0,1.7-i*.15,.4,1.3-i*.09,0x7950a1,i%2===0);for(const x of [-.25,.25])block(ghost,x,1.7,.65,.14,.18,.04,0xd4a9f1,true);block(ghost,0,1.25,.66,.25,.35,.04,0x29183a);const g=ghost.build();g.position.set(1.4,.15,0);group.add(g);actors.push({id:"spectral-burst",object:g,base:g.position.clone()});
    for(const x of [-2.4,-.9]){corpse(v,x,0,1.3,0xb9a183,0x31534d);block(v,x,1.1,1.0,.48,.6,.3,0x785b3e);for(let j=0;j<9;j++)block(v,x+j*.2,1.2+j*.03,1.55-j*.15,.11,.09,.09,0x7faac0,j%2===0);}
  }else if(stop.id==="graveyard"){
    for(let i=0;i<9;i++){const x=-3+(i%3)*2.0,z=-1.3+Math.floor(i/3)*1.4,h=.85+(i%3)*.26;block(v,x,.03,z,1.0,.14,.58,0x514b51);block(v,x,.17,z,.66,h,.22,0x777079);block(v,x,.17+h,z,.52,.16,.22,0x777079);block(v,x,.48,z+.13,.055,.37,.025,0x4a414c);block(v,x,.7,z+.13,.3,.055,.025,0x4a414c);for(let j=0;j<3;j++)block(v,x-.2+j*.18,.22,z+.17,.1,.08,.06,0x42584a);}
    for(const x of [-3.9,3.9]){block(v,x,0,2.3,.28,2.4,.28,C.stone);block(v,x,2.4,2.3,.42,.2,.42,0x777079);}for(let i=0;i<18;i++)block(v,-3.7+i*.43,.15,2.3,.055,1.2+(i%2)*.2,.06,0x34313c);
    const a=new Voxels();for(let i=0;i<5;i++)block(a,Math.sin(i)*.12,i*.26,0,.85-i*.1,.28,.5,0x8d9b93);block(a,0,1.26,0,.4,.38,.36,0xa5b7ab);for(const x of [-.1,.1])block(a,x,1.48,.19,.04,.05,.025,0xb9daca,true);const shade=a.build();shade.position.set(0,.2,.4);group.add(shade);actors.push({id:"route-graveyard",object:shade,base:shade.position.clone()});
  }else if(stop.id==="thicket"){
    for(const x of [-3.2,3.2]){for(let i=0;i<16;i++)block(v,x+Math.sin(i*.3)*.25,i*.4,-.5,.55-i*.017,.43,.5-i*.014,0x352e35);for(let i=0;i<9;i++)block(v,x+(x<0?1:-1)*i*.28,4.7+i*.13,-.5,.35,.25,.3,0x51414a);}
    for(let i=0;i<18;i++){block(v,-2.7+i*.31,4.7+Math.sin(i*.35)*.55,-.3,.07,.06,.06,0xa79dab);block(v,-2.2+i*.2,3.8+i*.07,-.3,.065,.06,.06,0x8c8392);}
    for(const x of [-2,0,2]){pumpkin(v,x,.05,1,.45);block(v,x,0,-.1,.13,2.3,.13,C.wood);block(v,x,1.55,-.1,1.4,.13,.13,C.wood);block(v,x,1.0,-.1,.65,.7,.36,0x4c354b);pumpkin(v,x,1.78,-.1,.65);}
    const web=new THREE.Object3D();web.position.set(.7,4.25,-.22);group.add(web);actors.push({id:"route-thicket",web});
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
// Lanterns on posts every 12.5 units of lane, on alternate sides, clear of the
// sets and the station. The four nearest ahead light their stretch (createHayrideWorld).
export const HAYRIDE_LANTERN_GAP=12.5;
// The spider cave's brood: a giant on the vault over the lane, a dropper on a
// thread, and smaller ones crawling the walls and floor among the cocoons.
function broodFor(anchors,root,stop){
  const rigs=[],place=(a,sp)=>{const m=mount(a.position,a.normal,a.forward);root.add(m);m.add(sp.root);return m;};
  const giant=createSpider(1.25,{body:0x1d161f,leg:0x2a1f29,band:0x4d2f3e,mark:0xb8322a,eye:0xff3a2a});place(anchors.ceiling[0],giant);rigs.push({sp:giant,kind:"giant",at:stop.at});
  anchors.walls.forEach((a,i)=>{const sp=createSpider(.42+(i%2)*.1,{eye:i%2?0xb6ff6a:0xff4a3a});place(a,sp);rigs.push({sp,kind:"crawl",at:stop.at,radius:.5+i*.1,speed:.5+i*.12,offset:i*1.7});});
  anchors.floor.forEach((a,i)=>{const sp=createSpider(.5,{body:0x2b2026,band:0x6b4a3a});place(a,sp);rigs.push({sp,kind:"crawl",at:stop.at,radius:.7,speed:.35+i*.1,offset:i*2.3});});
  // The dropper hangs head down from a silk line it pays out as the wagon nears.
  const d=anchors.drop,hang=mount(d.position.clone().setY(d.top),new THREE.Vector3(0,-1,0),new THREE.Vector3(1,0,0));root.add(hang);
  const sp=createSpider(.55,{body:0x30202c,band:0x8a3a5a,mark:0xd04a3a,eye:0xb6ff6a});sp.root.rotation.x=-Math.PI/2;const body=new THREE.Object3D();hang.add(body);body.add(sp.root);
  const line={root:new THREE.Object3D(),shapes:[]};hang.add(line.root);const thread=new THREE.Object3D();thread.scale.set(.025,1,.025);line.root.add(thread);line.shapes.push({o:thread,colour:0xd8d2e0});
  rigs.push({sp,kind:"drop",at:stop.at,id:"spider-drop",body,thread,top:d.top});rigs.push({sp:line,kind:"line"});
  return rigs;
}
function buildRideLand(state){
  const profile=hayrideRouteProfile(state),routeLength=profile.length,routeSample=d=>hayrideRouteSample(d,profile.level);
  const land=chunkedVoxels(),r=seeded(8813),b=profile.bounds,root=new THREE.Group(),sets=[],lanterns=[];
  for(let x=b.x0;x<b.x1;x+=.5)for(let z=b.z0;z<b.z1;z+=.5){const lane=hayrideRouteDistance(x+.25,z+.25,profile.level)<SITE.laneWidth/2,c=lane?[0x514331,0x574734,0x4b3c2e][Math.floor(r()*3)]:[0x24291e,0x292b1d,0x22251d][Math.floor(r()*3)];land.at(x,z).box(x,-.45,z,.5,.49,.5,c);}
  const rigs=[];
  for(const stop of profile.stops){const frame=routeSample(stop.at*routeLength),set=makeScenicSet(stop),offset=stop.offset??(stop.id==="spiders"?0:stop.id==="bride"?6.1:stop.id==="bus"?5.4:4.1);set.group.position.set(frame.x+frame.dz*offset,0,frame.z-frame.dx*offset);set.group.rotation.y=frame.yaw+(stop.id==="spiders"?0:Math.PI/2);root.add(set.group);sets.push({...stop,...set});
    if(stop.id==="spiders"){const cave=buildSpiderCave(land,routeSample,stop.at*routeLength);root.add(cave.silk);rigs.push(...broodFor(cave,root,stop));}
    for(const actor of set.actors)if(actor.web){const m=new THREE.Object3D();actor.web.add(m);const sp=createSpider(.62,{body:0x2a2030,band:0x6a3d58,mark:0xc0392b});sp.root.rotation.x=Math.PI/2;m.add(sp.root);rigs.push({sp,kind:"web",at:stop.at,id:"route-thicket"});}}
  for(let along=10,side=1;along<routeLength-8;along+=HAYRIDE_LANTERN_GAP,side=-side){
    const p=routeSample(along),x=p.x+p.dz*3.05*side,z=p.z-p.dx*3.05*side;
    if(sets.some(set=>Math.hypot(set.group.position.x-x,set.group.position.z-z)<7)||(x>-23.5&&x<-8.5&&z>23&&z<39.5))continue;
    lanternPost(land.at(x,z),x,z,[],false);lanterns.push({x,y:2.2,z,along});
    // Every third lantern has a spider working up and down its post.
    if(lanterns.length%3===1){const toLane=new THREE.Vector3(p.x-x,0,p.z-z).normalize(),m=mount(new THREE.Vector3(x+toLane.x*.09,1.1,z+toLane.z*.09),toLane,new THREE.Vector3(0,1,0));root.add(m);const sp=createSpider(.26,{eye:0xff5a3a});m.add(sp.root);rigs.push({sp,kind:"post",at:along/routeLength,offset:along});}
  }
  const brood=createBrood(rigs.map(g=>g.sp));root.add(brood.group);
  land.build(root);root.name="The Hollow Hayride off-map woodland";return{root,sets,lanterns,rigs,brood};
}
function makeVehicle(capacity){
  const vehicle=buildHayrideVehicle({capacity}),driver=new Voxels();block(driver,0,1.43,-.3,.55,.56,.36,0x4a354b);block(driver,0,2.0,-.36,.43,.4,.38,0x929b70);block(driver,0,2.4,-.36,.7,.08,.58,C.dark);block(driver,0,2.48,-.36,.44,.18,.4,C.dark);for(const x of [-.2,.2])block(driver,x,1.6,-.62,.15,.14,.42,0x4a354b);vehicle.tractor.add(driver.build());return vehicle;
}
// View-only controller: clocks, spending and dispatch are owned by the rules.
export function createHayrideWorld({scene: farmScene,state,world,signBoard,createScares}){
  const root=new THREE.Group();farmScene.add(root);const rideScene=new THREE.Scene();rideScene.name="The Hollow Hayride owner scene";rideScene.background=new THREE.Color(0x0b0f19);rideScene.fog=new THREE.FogExp2(0x121828,.052);
  let built=false,station=null,land=null,forest=null,scares=null,vehicle=null,fleetVehicle=null,rideVehicle=null,tier=0,fleet=-1,preview=null,cleared=0,previewCamera=null,previewTime=0;
  let routeProfile=hayrideRouteProfile(state),builtRoute=-1;
  const reducedDefault=typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;let gentle=!!reducedDefault;
  const stationLamp=new THREE.PointLight(0xffbd77,0,11,1.6),convoyLamp=new THREE.PointLight(0xdfb4ff,0,9,1.6);stationLamp.position.set(HAYRIDE_STATION_LAMP.x,HAYRIDE_STATION_LAMP.y,HAYRIDE_STATION_LAMP.z);farmScene.add(stationLamp,convoyLamp);
  // Moonlight through thin fog, so the trees read as shapes; the tractor's lamps
  // light the lane ahead; a lantern hangs over the wagon; the lane's lanterns
  // light their stretch; and each set has its own coloured light as you near it.
  const sky=new THREE.HemisphereLight(0x9eaadc,0x2a241c,1.0),moon=new THREE.DirectionalLight(0xb3c1ee,1.25),lightning=new THREE.DirectionalLight(0xe4e9ff,0);
  moon.position.set(-60,40,-14);lightning.position.set(-15,30,-20);rideScene.add(sky,moon,lightning);
  const headlamp=new THREE.SpotLight(0xffd29a,60,34,Math.PI/3.6,.45,1.2),encounterLamp=new THREE.PointLight(0xbba4ee,0,13,1.6);rideScene.add(headlamp,headlamp.target,encounterLamp);
  const wagonLamp=new THREE.PointLight(0xffb15c,0,8,1.5),setLamp=new THREE.PointLight(0xffffff,0,15,1.4),lanternPool=Array.from({length:4},()=>new THREE.PointLight(0xffa04a,0,12,1.4));rideScene.add(wagonLamp,setLamp,...lanternPool);
  const marker=signBoard("The Hollow Hayride",`woodland clearing · level ${HAYRIDE_PROPERTY.level}`,4.0);marker.position.set(SITE.marker.x,2.15,SITE.marker.z);marker.userData={type:"hayride"};root.add(marker);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(SITE.hit.w,SITE.hit.h,SITE.hit.d),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(SITE.hit.x,SITE.hit.y,SITE.hit.z);hit.userData={type:"hayride"};root.add(hit);hit.visible=false;
  const fleetHit=new THREE.Mesh(new THREE.BoxGeometry(3.5,3,9),new THREE.MeshBasicMaterial({visible:false}));fleetHit.position.set(HAYRIDE_FLEET_BAY.station.x,1.5,30);fleetHit.userData={type:"hayride"};fleetHit.visible=false;root.add(fleetHit);
  // The ride's moving lights, each frame of the preview (see the comment above).
  const wrap=d=>((d+routeProfile.length/2)%routeProfile.length+routeProfile.length)%routeProfile.length-routeProfile.length/2,lamp=new THREE.Vector3();
  const fade=(d,a,b,c,e)=>d<=a||d>=e?0:d<b?(d-a)/(b-a):d<=c?1:(e-d)/(e-c);
  function lightRide(time){
    if(!land)return;
    const along=(preview??0)*routeProfile.length;
    if(rideVehicle){lamp.set(rideVehicle.cameraAnchor[0],rideVehicle.cameraAnchor[1]+1.05,rideVehicle.cameraAnchor[2]+.5).applyMatrix4(rideVehicle.wagon.matrixWorld);wagonLamp.position.copy(lamp);wagonLamp.intensity=5*(.93+.07*Math.sin(time*9.3)*Math.sin(time*3.1));}
    // Lanterns from 10 units behind to 36 ahead: at most four at a time, each
    // fading in from the far edge, a few of them guttering.
    const near=land.lanterns.map((l,i)=>({l,i,d:wrap(l.along-along)})).filter(n=>n.d>-10&&n.d<36);
    lanternPool.forEach((light,k)=>{const n=near[k];if(!n){light.intensity=0;return;}light.position.set(n.l.x,n.l.y,n.l.z);
      const gutter=n.i%5===2?Math.max(.15,Math.sin(time*2.3+n.i)*Math.sin(time*7.7)*1.4):1;light.intensity=15*fade(n.d,-10,-4,24,36)*(.88+.12*Math.sin(time*11+n.i*7))*Math.min(1,gutter);});
    // The set ahead glows in its own colour from 18 units out until just past it.
    const set=land.sets.reduce((best,s)=>Math.abs(wrap(s.at*routeProfile.length-along))<Math.abs(wrap(best.at*routeProfile.length-along))?s:best,land.sets[0]);
    if(set){const d=wrap(set.at*routeProfile.length-along),frame=hayrideRouteSample(set.at*routeProfile.length,routeProfile.level);setLamp.color.setHex(SET_LIGHT[set.id]??0xffffff);
      setLamp.position.set(frame.x+frame.dz*1.8,3.4,frame.z-frame.dx*1.8);setLamp.intensity=(gentle?5:7)*fade(-d,-18,-8,3,9)*(.9+.1*Math.sin(time*5+set.at*40));}
  }
  function poseFarm(){
    [vehicle,fleetVehicle].forEach((v,berth)=>{if(!v)return;const p=hayrideFarmConvoyPose(state,berth),c=berth?state.hayride.secondConvoy:state.hayride.convoy;v.group.visible=p.visible;v.setPose(p);v.setRollDistance(p.distance);v.setSteering(0);v.setBoarding(["loading","unloading"].includes(c?.phase));});
  }
  function poseRide(){if(!rideVehicle)return;const p=hayrideConvoyPose(state,preview??0);rideVehicle.setPose(p);rideVehicle.setRollDistance(p.distance);rideVehicle.setSteering(p.tractor.yaw-p.wagon.yaw);rideVehicle.setBoarding(preview===0||preview===1);headlamp.position.set(p.tractor.x+p.tractor.dx*1.3,1.7,p.tractor.z+p.tractor.dz*1.3);headlamp.target.position.set(p.tractor.x+p.tractor.dx*12,0,p.tractor.z+p.tractor.dz*12);}
  function rebuildRide(){
    if(land){land.root.removeFromParent();dispose(land.root);}forest?.dispose();scares?.dispose();
    routeProfile=hayrideRouteProfile(state);builtRoute=routeProfile.level;land=buildRideLand(state);rideScene.add(land.root);
    forest=createHayrideForest({routeLevel:routeProfile.level});rideScene.add(forest.group);scares=createScares?.({state})??null;if(scares)rideScene.add(scares.group);
  }
  function sync(){
    const h=state.hayride;if(!h?.purchased){marker.visible=true;hit.visible=false;return;}
    marker.visible=false;hit.visible=true;
    if(!built){built=true;cleared=openWestGate(world.group??world);station=buildHayrideStation(signBoard,h.fleet===1);fleet=h.fleet??0;root.add(station.root);rebuildRide();}
    if(fleet!==(h.fleet??0)){fleet=h.fleet??0;station.root.removeFromParent();dispose(station.root);station=buildHayrideStation(signBoard,fleet===1);root.add(station.root);}
    fleetHit.visible=fleet===1;
    if(tier!==h.tier){tier=h.tier;vehicle?.dispose();fleetVehicle?.dispose();fleetVehicle=null;rideVehicle?.dispose();const capacity=HAYRIDE_TIERS[Math.max(0,tier-1)].seats;vehicle=makeVehicle(capacity);rideVehicle=makeVehicle(capacity);root.add(vehicle.group);rideScene.add(rideVehicle.group);}
    if(fleet===1&&!fleetVehicle){fleetVehicle=makeVehicle(HAYRIDE_TIERS[Math.max(0,tier-1)].seats);fleetVehicle.group.userData.berth=1;root.add(fleetVehicle.group);}
    if(preview!==null&&builtRoute!==(h.routeLevel??0))rebuildRide();
    poseFarm();poseRide();
  }
  function tick(time){previewTime=time;sync();stationLamp.intensity=vehicle?4:0;if(!vehicle){convoyLamp.intensity=0;return;}const moving=vehicle.group.visible&&["departing","arriving"].includes(state.hayride?.convoy?.phase)?vehicle:fleetVehicle?.group.visible&&["departing","arriving"].includes(state.hayride?.secondConvoy?.phase)?fleetVehicle:null;convoyLamp.position.set((moving??vehicle).tractor.position.x,2.5,(moving??vehicle).tractor.position.z);convoyLamp.intensity=moving?2.4:0;
    if(preview===null)return;forest?.tick(time,{gentle});lightRide(time);scares?.tick({progress:preview,time,gentle,camera:previewCamera});
    const h=state.hayride,owned=new Set(h.haunts?.owned??[]),active=new Set((h.haunts?.active??[]).filter(id=>owned.has(id)&&HAYRIDE_SCARES.some(p=>p.id===id&&p.tier<=h.tier)));
    if((h.routeLevel??0)>0)active.add("route-graveyard");if((h.routeLevel??0)>1)active.add("route-thicket");
    for(const set of land.sets)for(const actor of set.actors){if(!actor.object)continue;actor.object.position.copy(actor.base);actor.object.rotation.y=0;actor.object.scale.setScalar(1);if(gentle||!active.has(actor.id))continue;const near=Math.abs(preview-set.at)<hayrideSpan(5.7,routeProfile.level),wave=near?(Math.sin(time*2)+1)/2:0;
      if(actor.id==="turning-scarecrows")actor.object.rotation.y=wave*.55;else if(actor.id==="bride-procession")actor.object.position.z+=wave*1.1;else if(actor.id==="bus-breakout")actor.object.position.z+=wave*.8;else{actor.object.position.y+=Math.sin(time*1.5)*.16;actor.object.scale.setScalar(1+wave*.17);}}
    animateSpiders(time,active);
  }
  // The spiders crawl all the time; near the wagon the giant rears with its fangs
  // open and the dropper falls on its line, legs thrashing. Gentle mode stills them.
  function animateSpiders(time,active){
    if(!land?.rigs?.length)return;
    for(const g of land.rigs){
      if(g.kind==="line")continue;
      const near=Math.abs(preview-g.at)<hayrideSpan(6.5,routeProfile.level),wave=near&&!gentle?(Math.sin(time*2.2)+1)/2:0,sp=g.sp;
      if(g.kind==="post"){const k=gentle?0:Math.sin(time*.45+g.offset),dir=Math.cos(time*.45+g.offset);sp.root.position.set(0,0,k*.7);sp.root.rotation.y=dir<0?Math.PI:0;poseSpider(sp,time,{gait:gentle?0:.8});continue;}
      if(g.kind==="crawl"){const a=gentle?g.offset:time*g.speed+g.offset;sp.root.position.set(Math.cos(a)*g.radius,0,Math.sin(a)*g.radius);sp.root.rotation.y=-a;poseSpider(sp,time,{gait:gentle?0:1});}
      else if(g.kind==="giant")poseSpider(sp,time,{gait:0,rear:near&&!gentle?.35+wave*.55:0,fangs:near?.4+wave*.6:.15});
      else if(g.kind==="web"){const on=active.has(g.id)&&near&&!gentle;poseSpider(sp,time,{gait:on?.6:0,rear:on?wave*.5:0,fangs:on?.3+wave*.6:.1});}
      else if(g.kind==="drop"){const on=active.has(g.id)&&!gentle,fall=on&&near?Math.min(1,wave*1.4):0,len=.25+fall*1.35;g.body.position.y=len;g.thread.position.y=len/2;g.thread.scale.y=len;poseSpider(sp,time,{flail:on&&near?.5+wave*.5:0,fangs:fall});}
    }
    land.brood.sync();
  }
  sync();
  return{scene:rideScene,rideScene,root,sync,tick,focus:SITE.focus,setLightning(value){lightning.intensity=Math.max(0,Math.min(1,Number.isFinite(value)?value:0))*5;},setGentleMotion(value){gentle=value===null?!!reducedDefault:!!value;},get vehicle(){return vehicle;},get rideVehicle(){return rideVehicle;},get fleetVehicle(){return fleetVehicle;},setPreview(value){preview=value===null?null:Math.max(0,Math.min(1,value));if(preview!==null&&builtRoute!==(state.hayride?.routeLevel??0))rebuildRide();if(preview===null){previewCamera=null;lightning.intensity=0;encounterLamp.intensity=0;wagonLamp.intensity=setLamp.intensity=0;for(const light of lanternPool)light.intensity=0;}poseRide();},getPreviewFrame(progress){preview=Math.max(0,Math.min(1,progress));poseRide();if(!rideVehicle)return null;const position=new THREE.Vector3(...rideVehicle.cameraAnchor).applyMatrix4(rideVehicle.wagon.matrixWorld),target=new THREE.Vector3(0,rideVehicle.cameraAnchor[1],-8).applyMatrix4(rideVehicle.wagon.matrixWorld);previewCamera=position.clone();const nearest=land.sets.reduce((best,set)=>Math.abs(progress-set.at)<Math.abs(progress-best.at)?set:best,land.sets[0]),delta=Math.abs(progress-nearest.at)*routeProfile.length,focusWeight=delta<7.8?Math.max(0,1-(Math.max(0,delta-2.1)/5.7)**2):0;nearest.group.updateWorldMatrix(true,false);scares?.tick({progress:preview,time:previewTime,gentle,camera:previewCamera});const focusTarget=scares?.focusTarget?.(progress)??new THREE.Vector3(0,nearest.id==="scarecrows"?2.3:nearest.id==="spiders"?3.1:1.6,nearest.id==="spiders"?0:1).applyMatrix4(nearest.group.matrixWorld);encounterLamp.position.copy(focusTarget).add(new THREE.Vector3(0,2,1));encounterLamp.color.setHex(SET_LIGHT[nearest.id]??0xbba4ee);encounterLamp.intensity=focusWeight*(gentle?4:7);return{position,target,yaw:rideVehicle.wagon.rotation.y,focusTarget,focusWeight};},guestPose:v=>hayrideGuestPose(state,v),get pickables(){return state.hayride?.purchased?[hit,...(fleet===1?[fleetHit]:[]),station?.sign].filter(Boolean):[marker];},get status(){return{purchased:!!state.hayride?.purchased,tier,phase:state.hayride?.convoy?.phase??"loading",queue:(state.visitors??[]).filter(v=>v.hayride&&!v.hayride.done&&v.hayride.phase==="queue").length,aboard:(state.hayride?.convoy?.manifest?.length??0)+(state.hayride?.secondConvoy?.manifest?.length??0),fleet:state.hayride?.fleet===1?2:1,vehicles:[vehicle,fleetVehicle].filter(Boolean).map((v,berth)=>({berth,visible:v.group.visible,x:v.tractor.position.x,z:v.tractor.position.z,phase:(berth?state.hayride.secondConvoy:state.hayride.convoy)?.phase})),bounds:SITE.bounds,farmBounds:SITE.bounds,rideBounds:hayrideRouteProfile(state).bounds,routeLevel:state.hayride?.routeLevel??0,routeLength:hayrideRouteProfile(state).length,scenes:hayrideRouteProfile(state).stops.map(p=>p.id),farmVisible:vehicle?.group.visible??false,rideScene:true,forest:forest?.diagnostics??null,lanterns:land?.lanterns.length??0,cleared,preview};},dispose(){vehicle?.dispose();fleetVehicle?.dispose();rideVehicle?.dispose();if(station)dispose(station.root);if(land)dispose(land.root);forest?.dispose();scares?.dispose();root.removeFromParent();stationLamp.removeFromParent();convoyLamp.removeFromParent();dispose(marker);hit.geometry.dispose();hit.material.dispose();fleetHit.geometry.dispose();fleetHit.material.dispose();rideScene.clear();}};
}
