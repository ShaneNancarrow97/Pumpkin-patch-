import * as THREE from "three";
import { Voxels, seeded, vary, chunkedVoxels } from "./voxels.js";
import { lanternPost } from "./world.js";
import { buildHayrideVehicle } from "./hayride-vehicle.js";
import { createHayrideForest } from "./hayride-forest.js";
import { buildHayrideStation, buildRideHill, HAYRIDE_STATION_LAMP } from "./hayride-station.js";
import { createSpider, poseSpider, createBrood, mount, buildSpiderCave } from "./hayride-spiders.js";
import { createRideAtmosphere, puff } from "./hayride-atmosphere.js";
import { buildRoadsideSet } from "./hayride-sets.js";
import { createRiders } from "./hayride-riders.js";
import { createMoonShafts } from "./hayride-moonlight.js";
import { RUT_GAP, LIGHTS_OUT, rootJolt, hayrideRoots } from "./hayride-view.js";
import { STALL, stallAlong, stallLamps, hollowManPlace, createHollowMan, poseHollowMan } from "./hayride-stall.js";
import { HAYRIDE_PROPERTY, HAYRIDE_TIERS, HAYRIDE_SCARES } from "./content/hayride.js";
import { HAYRIDE_SITE as SITE, HAYRIDE_FLEET_BAY, HAYRIDE_RIDE_BOUNDS, HAYRIDE_STOPS, HAYRIDE_GATE_CLEAR, hayrideRouteSample, hayrideRouteDistance, hayrideRouteProfile, HAYRIDE_ROUTE_LENGTH, hayrideSpan, hayrideConvoyPose, hayrideFarmConvoyPose, hayrideGuestPose, HAYRIDE_RIDE_HILL, hayrideUnderHill, HAYRIDE_JUMP, hayrideJumpSpot } from "./content/hayride-layout.js";

// Each set's own light: the scarecrows' bonfire orange, the spiders' sickly
// green, the bride's cold moon, the spectre's violet and the bus's red alarm.
const SET_LIGHT={scarecrows:0xff8a3a,spiders:0x9dff70,bride:0xa9bcff,pursuit:0xc07cff,bus:0xff4a3a,graveyard:0xa3c5bf,thicket:0x9b85bb};
const C={dark:0x30222b};
const block=(v,x,y,z,w,h,d,c,glow=false)=>v.block(x,y,z,w,h,d,c,glow);
// Each set is built once in its own frame (hayride-sets.js), then placed beside
// the route's inner shoulder. The spider cave follows the lane, so buildRideLand
// builds that one; its set here is empty.
function makeScenicSet(stop){
  const r=seeded(1401+Math.floor(stop.at*100)),v=new Voxels(),group=new THREE.Group(),set=buildRoadsideSet(stop.id,v,group,r);
  group.add(v.build());return{group,actors:set?.actors??[],brood:set?.brood??null};   // the brood is drawn in world space, so buildRideLand adds it to the root
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
// Soft halos round lamps that light nothing themselves, guttering a little:
// one additive draw for them all. The tunnel is lit by the wagon's own lamps.
function lampHalos(glows){
  const position=new Float32Array(glows.length*3),colour=new Float32Array(glows.length*3),base=glows.map(g=>new THREE.Color(g.colour)),geometry=new THREE.BufferGeometry();
  glows.forEach((g,i)=>position.set([g.x,g.y,g.z],i*3));geometry.setAttribute("position",new THREE.BufferAttribute(position,3));geometry.setAttribute("color",new THREE.BufferAttribute(colour,3));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({map:puff(),size:1.6,sizeAttenuation:true,transparent:true,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:true}));points.frustumCulled=false;points.name="Hollow Hayride lamp halos";
  const tick=time=>{base.forEach((c,i)=>{const f=.55+.12*Math.sin(time*7.3+i*2.1)*Math.sin(time*2.9+i);colour.set([c.r*f,c.g*f,c.b*f],i*3);});geometry.attributes.color.needsUpdate=true;};tick(0);
  return{points,tick};
}
function buildRideLand(state){
  const profile=hayrideRouteProfile(state),routeLength=profile.length,routeSample=d=>hayrideRouteSample(d,profile.level);
  const land=chunkedVoxels(),r=seeded(8813),b=profile.bounds,root=new THREE.Group(),sets=[],lanterns=[];
  // The hill the ride starts through (buildRideHill): the lane's centre and
  // distance along it by z, and the ground it covers, which is not drawn.
  const hill=HAYRIDE_RIDE_HILL,underHill=(x,z,m=0)=>x>hill.x0-m&&x<hill.x1+m&&z>hill.z0-m&&z<hill.z1+m,start=Array.from({length:141},(_,i)=>({...routeSample(i*.1),along:i*.1}));
  const nearestStart=z=>start.reduce((best,p)=>Math.abs(p.z-z)<Math.abs(best.z-z)?p:best,start[0]);
  // The lane: two wheel ruts with a grassy crown, puddles and fallen leaves in
  // quarter tiles; the wood floor beside it in half tiles.
  for(let x=b.x0;x<b.x1;x+=.5)for(let z=b.z0;z<b.z1;z+=.5){const away=hayrideRouteDistance(x+.25,z+.25,profile.level);
    if(away>=SITE.laneWidth/2+.25){if(underHill(x,z)&&underHill(x+.5,z+.5))continue;land.at(x,z).box(x,-.45,z,.5,.49,.5,[0x24291e,0x292b1d,0x22251d][Math.floor(r()*3)]);if(r()<.08)land.at(x,z).box(x+.1+r()*.2,.04,z+.1+r()*.2,.12,.03,.18,[0x6a2a3a,0x8a2f1e,0x5a3a24][Math.floor(r()*3)]);continue;}
    land.at(x,z).box(x,-.45,z,.5,.44,.5,0x3a2e24);
    for(const[ox,oz]of[[0,0],[.25,0],[0,.25],[.25,.25]]){const d=hayrideRouteDistance(x+ox+.125,z+oz+.125,profile.level),rut=Math.abs(d-.95)<.32,crown=d<.45,puddle=rut&&Math.sin((x+ox)*1.7+(z+oz)*1.3)>.88;
      const h=rut?.0+r()*.01:crown?.05+r()*.02:.025+r()*.02,c=puddle?[0x232a38,0x2a3242][Math.floor(r()*2)]:rut?[0x3b2b20,0x433024,0x34261c][Math.floor(r()*3)]:crown?[0x3d4a2b,0x46552f,0x36432a][Math.floor(r()*3)]:d>1.9?[0x3b3a26,0x423f2a][Math.floor(r()*2)]:[0x514331,0x574734,0x4b3c2e][Math.floor(r()*3)];
      land.at(x+ox,z+oz).box(x+ox,-.01,z+oz,.25,.05+h,.25,vary(c,.08,r));
      if(!rut&&r()<.14)land.at(x+ox,z+oz).box(x+ox+.05,.04+h,z+oz+.06,.12,.02,.09,[0x8a2f1e,0xc2552a,0xe08a2e,0x6a2a3a][Math.floor(r()*4)]);}}
  // Roots across the lane where the camera jolts (RUT_GAP apart).
  for(let k=1,along=RUT_GAP;k<=hayrideRoots(routeLength);k++,along+=RUT_GAP){const f=routeSample(along);for(let s=-2.6;s<=2.6;s+=.16){const x=f.x+f.dz*s+f.dx*Math.sin(s*1.3)*.25,z=f.z-f.dx*s+f.dz*Math.sin(s*1.3)*.25,y=.03+Math.max(0,Math.sin((s+2.6)/5.2*Math.PI))*.07;land.at(x,z).block(x,y-.03,z,.2,.11,.2,vary(0x3a2a22,.1,r));}}
  const writer={box:(x,y,z,w,h,d,c,g)=>land.at(x+w/2,z+d/2).box(x,y,z,w,h,d,c,g),block:(x,y,z,w,h,d,c,g)=>land.at(x,z).block(x,y,z,w,h,d,c,g)};
  const tunnel=buildRideHill(writer,seeded(5521),z=>nearestStart(z).x),halos=lampHalos(tunnel.glows);root.add(halos.points);
  const rigs=[];
  for(const stop of profile.stops){const frame=routeSample(stop.at*routeLength),set=makeScenicSet(stop),offset=stop.offset??(stop.id==="spiders"?0:stop.id==="bride"?6.1:stop.id==="bus"?5.4:4.1);set.group.position.set(frame.x+frame.dz*offset,0,frame.z-frame.dx*offset);set.group.rotation.y=frame.yaw+(stop.id==="spiders"?0:Math.PI/2);root.add(set.group);if(set.brood)root.add(set.brood.group);sets.push({...stop,...set});
    if(stop.id==="spiders"){const cave=buildSpiderCave(land,routeSample,stop.at*routeLength);root.add(cave.silk);rigs.push(...broodFor(cave,root,stop));}
    for(const actor of set.actors)if(actor.web){const m=new THREE.Object3D();actor.web.add(m);const sp=createSpider(.62,{body:0x2a2030,band:0x6a3d58,mark:0xc0392b});sp.root.rotation.x=Math.PI/2;m.add(sp.root);rigs.push({sp,kind:"web",at:stop.at,id:"route-thicket"});}}
  const darkStretch=stallAlong(profile.stops,routeLength),jumps=profile.stops.filter(stop=>HAYRIDE_JUMP.stops.includes(stop.id)).map(stop=>hayrideJumpSpot(stop,profile.level));   // the breakdown's stretch stays unlit (hayride-stall.js)
  for(let along=10,side=1;along<routeLength-8;along+=HAYRIDE_LANTERN_GAP,side=-side){
    if(Math.abs(along-darkStretch)<6.3)continue;
    // A lantern where a sprite jump scare waits steps on past it.
    const blocked=(x,z)=>jumps.some(j=>Math.hypot(j.x-x,j.z-z)<HAYRIDE_JUMP.clear+.6),place=a=>{const p=routeSample(a);return{a,p,x:p.x+p.dz*3.05*side,z:p.z-p.dx*3.05*side};};
    let spot=place(along);if(blocked(spot.x,spot.z))spot=place(along+4.5);const{x,z,p}=spot;
    if(sets.some(set=>Math.hypot(set.group.position.x-x,set.group.position.z-z)<7)||blocked(x,z)||(x>-23.5&&x<-8.5&&z>23&&z<39.5)||underHill(x,z,1.5))continue;
    lanternPost(land.at(x,z),x,z,[],false);lanterns.push({x,y:2.2,z,along:spot.a});
    // Every third lantern has a spider working up and down its post.
    if(lanterns.length%3===1){const toLane=new THREE.Vector3(p.x-x,0,p.z-z).normalize(),m=mount(new THREE.Vector3(x+toLane.x*.09,1.1,z+toLane.z*.09),toLane,new THREE.Vector3(0,1,0));root.add(m);const sp=createSpider(.26,{eye:0xff5a3a});m.add(sp.root);rigs.push({sp,kind:"post",at:along/routeLength,offset:along});}
  }
  const brood=createBrood(rigs.map(g=>g.sp));root.add(brood.group);
  // Moonlight through the canopy, clear of the scenes, the depot and the hill.
  const moon=createMoonShafts({sample:routeSample,length:routeLength,r:seeded(7213),lane:(x,z)=>hayrideRouteDistance(x,z,profile.level),clear:(x,z)=>!underHill(x,z,2)&&!(x>-23.5&&x<-8.5&&z>23&&z<39.5)&&sets.every(set=>Math.hypot(set.group.position.x-x,set.group.position.z-z)>8)});root.add(moon.group);
  land.build(root);root.name="The Hollow Hayride off-map woodland";
  // Blocks that light themselves (the lanterns' glass, the sets' glows), dimmed in the breakdown's dark.
  const glows=[];root.traverse(m=>{if(m.isInstancedMesh&&m.material?.isMeshBasicMaterial)glows.push(m.material);});
  return{root,sets,lanterns,rigs,brood,halos,moon,glows,glowLevel:1,sign:tunnel.sign};
}
function makeVehicle(capacity){
  const vehicle=buildHayrideVehicle({capacity}),driver=new Voxels();block(driver,0,1.43,-.3,.55,.56,.36,0x4a354b);block(driver,0,2.0,-.36,.43,.4,.38,0x929b70);block(driver,0,2.4,-.36,.7,.08,.58,C.dark);block(driver,0,2.48,-.36,.44,.18,.4,C.dark);for(const x of [-.2,.2])block(driver,x,1.6,-.62,.15,.14,.42,0x4a354b);vehicle.tractor.add(driver.build());return vehicle;
}
// View-only controller: clocks, spending and dispatch are owned by the rules.
export function createHayrideWorld({scene: farmScene,state,world,signBoard,createScares}){
  const root=new THREE.Group();farmScene.add(root);const rideScene=new THREE.Scene();rideScene.name="The Hollow Hayride owner scene";rideScene.background=new THREE.Color(0x0b0f19);rideScene.fog=new THREE.FogExp2(0x121828,.052);
  let built=false,station=null,land=null,forest=null,scares=null,vehicle=null,fleetVehicle=null,rideVehicle=null,tier=0,fleet=-1,preview=null,cleared=0,previewCamera=null,previewTime=0;
  let riders=null,riderPreview=null;const riderLook=new THREE.Vector3();
  // The breakdown (hayride-stall.js): the view sets its clock, stall seconds since the tractor stopped.
  let hollow=null,hollowPlace=null,stallT=null,stallAt=0,hollowAlong=null,lastStallT=null,lastJump=0,fogRef=null,fogBase=null,backBase=null,rideGlows=[];const hollowHead=new THREE.Vector3();
  let routeProfile=hayrideRouteProfile(state),builtRoute=-1;
  const atmosphere=createRideAtmosphere(rideScene);let airTime=null;const airForward=new THREE.Vector3();
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
  // As the wagon nears the pursuit and the bus the lamps fail: the headlamp
  // and the wagon's lantern sputter, die for a moment while the scene's own
  // glow carries on, then flare back. Gentle mode keeps them steady. The
  // flicker stays below three flashes a second.
  function lampFailure(time,along){
    if(gentle)return 1;
    for(const id of LIGHTS_OUT.stops){const stop=routeProfile.stops.find(s=>s.id===id);if(!stop)continue;
      const d=wrap(along-stop.at*routeProfile.length);if(d<-LIGHTS_OUT.before||d>LIGHTS_OUT.after+2.5)continue;
      const u=(d+LIGHTS_OUT.before)/(LIGHTS_OUT.before+LIGHTS_OUT.after),wobble=.5+.5*Math.sin(time*9.1)*Math.sin(time*3.7+1);
      if(u<.55)return 1-.75*Math.min(1,u/.55)*(1-wobble);
      if(u<.9)return .05+.05*wobble;
      return 1+.45*Math.max(0,1-(u-.9)/.5);}
    return 1;
  }
  function lightRide(time){
    if(!land)return;
    const along=(preview??0)*routeProfile.length,stalled=gentle?null:stallLamps(stallT),failing=stalled?stalled.head:lampFailure(time,along),carried=stalled?stalled.wagon:failing;
    headlamp.intensity=60*failing;sky.intensity=1*(stalled?stalled.sky:1);moon.intensity=1.25*(stalled?stalled.sky:1);
    // In the breakdown the fog and the sky behind it go near black too (the view sets them on entering).
    if(rideScene.fog!==fogRef){fogRef=rideScene.fog;fogBase=fogRef?.color?.clone()??null;backBase=rideScene.background?.isColor?rideScene.background.clone():null;}
    const night=1-.82*(stalled?stalled.dark:0);if(fogBase)fogRef.color.copy(fogBase).multiplyScalar(night);if(backBase&&rideScene.background?.isColor)rideScene.background.copy(backBase).multiplyScalar(night);
    // Glass that lights itself goes dark with its lamps: the lane's with the dark, the tractor's and the wagon's with their own.
    const glass=1-.92*(stalled?stalled.dark:0);if(land.glowLevel!==glass){land.glowLevel=glass;for(const m of land.glows)m.color.setScalar(glass);}
    const own=Math.min(1,.12+Math.max(failing,carried));for(const m of rideGlows)m.color.setScalar(own);
    if(rideVehicle){lamp.set(rideVehicle.cameraAnchor[0],rideVehicle.cameraAnchor[1]+1.05,rideVehicle.cameraAnchor[2]+.5).applyMatrix4(rideVehicle.wagon.matrixWorld);wagonLamp.position.copy(lamp);wagonLamp.intensity=5*(.93+.07*Math.sin(time*9.3)*Math.sin(time*3.1))*carried;}
    // Lanterns from 10 units behind to 36 ahead: at most four at a time, each
    // fading in from the far edge, a few of them guttering.
    const near=land.lanterns.map((l,i)=>({l,i,d:wrap(l.along-along)})).filter(n=>n.d>-10&&n.d<36);
    lanternPool.forEach((light,k)=>{const n=near[k];if(!n){light.intensity=0;return;}light.position.set(n.l.x,n.l.y,n.l.z);
      const gutter=n.i%5===2?Math.max(.15,Math.sin(time*2.3+n.i)*Math.sin(time*7.7)*1.4):1;light.intensity=15*fade(n.d,-10,-4,24,36)*(.88+.12*Math.sin(time*11+n.i*7))*Math.min(1,gutter)*(stalled?stalled.lanterns:.25+.75*Math.min(1,failing));});
    // The set ahead glows in its own colour from 18 units out until just past it.
    const set=land.sets.reduce((best,s)=>Math.abs(wrap(s.at*routeProfile.length-along))<Math.abs(wrap(best.at*routeProfile.length-along))?s:best,land.sets[0]);
    if(set){const d=wrap(set.at*routeProfile.length-along),frame=hayrideRouteSample(set.at*routeProfile.length,routeProfile.level);setLamp.color.setHex(SET_LIGHT[set.id]??0xffffff);
      setLamp.position.set(frame.x+frame.dz*1.8,3.4,frame.z-frame.dx*1.8);setLamp.intensity=(gentle?5:7)*fade(-d,-18,-8,3,9)*(.9+.1*Math.sin(time*5+set.at*40))*(stalled?stalled.glow:1);}
  }
  function poseFarm(){
    [vehicle,fleetVehicle].forEach((v,berth)=>{if(!v)return;const p=hayrideFarmConvoyPose(state,berth),c=berth?state.hayride.secondConvoy:state.hayride.convoy;v.group.visible=p.visible;v.setPose(p);v.setRollDistance(p.distance);v.setSteering(0);v.setBoarding(["loading","unloading"].includes(c?.phase));});
  }
  function poseRide(){if(!rideVehicle)return;const p=hayrideConvoyPose(state,preview??0);rideVehicle.setPose(p);rideVehicle.setRollDistance(p.distance);rideVehicle.setSteering(p.tractor.yaw-p.wagon.yaw);rideVehicle.setBoarding(preview===0||preview===1);headlamp.position.set(p.tractor.x+p.tractor.dx*1.3,1.7,p.tractor.z+p.tractor.dz*1.3);headlamp.target.position.set(p.tractor.x+p.tractor.dx*12,0,p.tractor.z+p.tractor.dz*12);}
  function rebuildRide(){
    if(land){land.root.removeFromParent();land.moon.dispose();dispose(land.root);}forest?.dispose();scares?.dispose();
    routeProfile=hayrideRouteProfile(state);builtRoute=routeProfile.level;land=buildRideLand(state);rideScene.add(land.root);
    const into=signBoard("Into the Hollow","",2.1);into.position.set(land.sign.x,land.sign.y,land.sign.z);land.root.add(into);
    forest=createHayrideForest({routeLevel:routeProfile.level});rideScene.add(forest.group);
    hollow?.group.removeFromParent();hollow?.dispose();hollow=createHollowMan();rideScene.add(hollow.group);stallAt=stallAlong(routeProfile.stops,routeProfile.length);hollowAlong=null;scares=createScares?.({state})??null;if(scares)rideScene.add(scares.group);
  }
  function sync(){
    const h=state.hayride;if(!h?.purchased){marker.visible=true;hit.visible=false;return;}
    marker.visible=false;hit.visible=true;
    if(!built){built=true;cleared=openWestGate(world.group??world);station=buildHayrideStation(signBoard,h.fleet===1);fleet=h.fleet??0;root.add(station.root);rebuildRide();}
    if(fleet!==(h.fleet??0)){fleet=h.fleet??0;station.root.removeFromParent();dispose(station.root);station=buildHayrideStation(signBoard,fleet===1);root.add(station.root);}
    fleetHit.visible=fleet===1;
    if(tier!==h.tier){tier=h.tier;vehicle?.dispose();fleetVehicle?.dispose();fleetVehicle=null;rideVehicle?.dispose();const capacity=HAYRIDE_TIERS[Math.max(0,tier-1)].seats;vehicle=makeVehicle(capacity);rideVehicle=makeVehicle(capacity);rideGlows=[];rideVehicle.group.traverse(m=>{if(m.isInstancedMesh&&m.material?.isMeshBasicMaterial)rideGlows.push(m.material);});root.add(vehicle.group);rideScene.add(rideVehicle.group);riders?.dispose();riders=createRiders({wagon:rideVehicle.wagon,seats:rideVehicle.seatAnchors,eye:rideVehicle.cameraAnchor,scene:rideScene});}
    if(fleet===1&&!fleetVehicle){fleetVehicle=makeVehicle(HAYRIDE_TIERS[Math.max(0,tier-1)].seats);fleetVehicle.group.userData.berth=1;root.add(fleetVehicle.group);}
    if(preview!==null&&builtRoute!==(h.routeLevel??0))rebuildRide();
    poseFarm();poseRide();
  }
  function tick(time){previewTime=time;sync();stationLamp.intensity=vehicle?4:0;if(!vehicle){convoyLamp.intensity=0;return;}const moving=vehicle.group.visible&&["departing","arriving"].includes(state.hayride?.convoy?.phase)?vehicle:fleetVehicle?.group.visible&&["departing","arriving"].includes(state.hayride?.secondConvoy?.phase)?fleetVehicle:null;convoyLamp.position.set((moving??vehicle).tractor.position.x,2.5,(moving??vehicle).tractor.position.z);convoyLamp.intensity=moving?2.4:0;
    if(preview===null){riderPreview=null;if(airTime!==null){atmosphere.tick(time,0,null);airTime=null;}return;}forest?.tick(time,{gentle});lightRide(time);land.halos.tick(time);const dark=gentle?0:stallLamps(stallT)?.dark??0;land.moon.tick(time,1-.95*dark);
    {const f=hayrideRouteSample(preview*routeProfile.length,routeProfile.level);airForward.set(f.dx,0,f.dz);atmosphere.tick(time,airTime===null?0:time-airTime,previewCamera,airForward,{gentle,dim:1-.9*dark,clear:(x,z)=>hayrideRouteDistance(x,z,routeProfile.level)>3.4,covered:(x,z)=>hayrideUnderHill(x,z)>=1});airTime=time;}scares?.tick({progress:preview,time,gentle,camera:previewCamera});
    const h=state.hayride,owned=new Set(h.haunts?.owned??[]),active=new Set((h.haunts?.active??[]).filter(id=>owned.has(id)&&HAYRIDE_SCARES.some(p=>p.id===id&&p.tier<=h.tier)));
    if((h.routeLevel??0)>0)active.add("route-graveyard");if((h.routeLevel??0)>1)active.add("route-thicket");
    for(const set of land.sets)for(const actor of set.actors){if(!actor.animate)continue;const gap=Math.abs(preview-set.at)/hayrideSpan(7,routeProfile.level),near=gap<1,ramp=Math.max(0,1-gap)**.7;actor.animate({time,near,ramp,wave:near?(Math.sin(time*2)+1)/2:0,on:!gentle&&active.has(actor.id),camera:previewCamera,forward:airForward,set});}
    for(const set of land.sets)set.brood?.sync();
    animateSpiders(time,active);
    // The other passengers jog over the same roots as the rider, turn to each
    // scene as it comes level and jump when it springs.
    const hollowShown=poseHollow(time);
    if(riders){const d=preview*routeProfile.length,jolt=gentle?0:rootJolt(d,routeProfile.length);
      const set=land.sets.reduce((best,s)=>Math.abs(preview-s.at)<Math.abs(preview-best.at)?s:best,land.sets[0]),delta=set?Math.abs(preview-set.at)*routeProfile.length:Infinity,weight=(delta<10?Math.max(0,1-(Math.max(0,delta-2)/8)**2):0)*(previewCamera?1-hayrideUnderHill(previewCamera.x,previewCamera.z):1);
      if(set){set.group.updateWorldMatrix(true,false);riderLook.set(0,1.4,0).applyMatrix4(set.group.matrixWorld);}
      if(!gentle&&riderPreview!==null)for(const s of land.sets)if(riderPreview<s.at&&preview>=s.at)riders.fright(time);
      const jump=scares?.lunge?.()??null,springing=jump?.weight??0;if(!gentle&&lastJump<.5&&springing>=.5)riders.fright(time);lastJump=springing;
      // In the breakdown they turn to him in the dark, and jump as the headlamp catches him.
      if(!gentle&&lastStallT!==null&&stallT!==null&&lastStallT<STALL.reveal&&stallT>=STALL.reveal)riders.fright(time);
      riderPreview=preview;riders.tick({time,d,jolt,look:hollowShown?hollowHead:springing>.3?jump.point:set?riderLook:null,weight:hollowShown?(stallT<STALL.reveal?.55:1):springing>.3?springing:weight,gentle});}
    lastStallT=stallT;
  }
  // The Hollow Man, where the breakdown's clock puts him (hayride-stall.js),
  // facing the rider or the way he runs. Returns whether he's out.
  function poseHollow(time){
    if(!hollow)return false;
    const place=hollowPlace=!gentle&&stallT!==null?hollowManPlace(stallT,stallAt,(preview??0)*routeProfile.length-STALL.bench):null;
    hollow.group.visible=!!place;if(!place){hollowAlong=null;return false;}
    const along=place.along??hollowAlong??stallAt;hollowAlong=along;
    const f=hayrideRouteSample(along,routeProfile.level),x=f.x+f.dz*place.side,z=f.z-f.dx*place.side,root=hollow.rig.root;
    root.position.set(x,(place.y??0)+.02,z);
    root.rotation.y=place.face==="forward"?Math.atan2(f.dx,f.dz):previewCamera?Math.atan2(previewCamera.x-x,previewCamera.z-z):Math.atan2(-f.dx,-f.dz);
    // On the tractor's roof his hands grip its edges, then slide down the wagon's sides as he stretches to the
    // rider; his left hand on the side to his left as he faces you. His face goes from above the roof to yours.
    let aim={lunge:place.lunge??0,open:place.open??0};
    if(place.perch&&previewCamera){
      const r=place.reach??0,a=hayrideRouteSample(stallAt+STALL.perch-(STALL.bench-1)*r,routeProfile.level),hand=s=>{const side=s*(.95+.35*r);return new THREE.Vector3(a.x+a.dz*side,STALL.roof-.05-(STALL.roof-1.25)*r,a.z-a.dx*side);};
      aim.hands=[hand(1),hand(-1)];
      if(place.mode==="stretch"||place.mode==="face"){const toward=new THREE.Vector3(x-previewCamera.x,0,z-previewCamera.z).normalize(),face=previewCamera.clone().addScaledVector(toward,.62);face.y=previewCamera.y+.05;aim.head=new THREE.Vector3(x,STALL.roof+2.3,z).lerp(face,r);}
    }
    // Close to the rider his face dims, so the carving burns out of a dark pumpkin rather than glaring.
    poseHollowMan(hollow.rig,time,place.mode,place.k,aim);hollow.rig.head.getWorldPosition(hollowHead);hollowHead.y+=.3;
    const near=previewCamera?hollowHead.distanceTo(previewCamera):9;
    hollow.sync(place.glow*Math.min(1,.4+near/5)*(place.light>0?.88+.12*Math.sin(time*17)*Math.sin(time*6.1):1));
    // An ember-red light just in front of his face, toward the rider, so he looms out of the dark lit by his
    // own face: the scenes' own lamp, free here, as no scene is near the breakdown (the ride keeps its fixed pool of lights).
    if(place.light>0){const to=previewCamera?previewCamera.clone().sub(hollowHead):new THREE.Vector3(0,0,1),n=to.length()||1;
      encounterLamp.color.setHex(0xff7a34);encounterLamp.position.copy(hollowHead).addScaledVector(to,Math.min(.9,n*.4)/n);encounterLamp.intensity=9*place.light*Math.min(1,(near/3.2)**2)*(.85+.15*Math.sin(time*13)*Math.sin(time*5.3));}
    return true;
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
  return{scene:rideScene,rideScene,root,sync,tick,focus:SITE.focus,setLightning(value){lightning.intensity=Math.max(0,Math.min(1,Number.isFinite(value)?value:0))*5;},setGentleMotion(value){gentle=value===null?!!reducedDefault:!!value;},get vehicle(){return vehicle;},get rideVehicle(){return rideVehicle;},get fleetVehicle(){return fleetVehicle;},setPreview(value){preview=value===null?null:Math.max(0,Math.min(1,value));if(preview!==null&&builtRoute!==(state.hayride?.routeLevel??0))rebuildRide();if(preview===null){previewCamera=null;lightning.intensity=0;encounterLamp.intensity=0;wagonLamp.intensity=setLamp.intensity=0;for(const light of lanternPool)light.intensity=0;}poseRide();},getPreviewFrame(progress){preview=Math.max(0,Math.min(1,progress));poseRide();if(!rideVehicle)return null;const position=new THREE.Vector3(...rideVehicle.cameraAnchor).applyMatrix4(rideVehicle.wagon.matrixWorld),target=new THREE.Vector3(0,rideVehicle.cameraAnchor[1]-.6,-9).applyMatrix4(rideVehicle.wagon.matrixWorld);previewCamera=position.clone();const nearest=land.sets.reduce((best,set)=>Math.abs(progress-set.at)<Math.abs(progress-best.at)?set:best,land.sets[0]),delta=Math.abs(progress-nearest.at)*routeProfile.length,focusWeight=(delta<7.8?Math.max(0,1-(Math.max(0,delta-2.1)/5.7)**2):0)*(1-hayrideUnderHill(position.x,position.z));nearest.group.updateWorldMatrix(true,false);scares?.tick({progress:preview,time:previewTime,gentle,camera:previewCamera});const focusTarget=new THREE.Vector3(0,nearest.id==="scarecrows"?2.3:nearest.id==="spiders"?3.1:1.6,nearest.id==="spiders"?0:1).applyMatrix4(nearest.group.matrixWorld);
    // The set plays first; then, as a sprite springs from across the lane (hayride-scares.js), the camera and its light turn to it.
    const jump=scares?.lunge?.()??null,weight=Math.max(focusWeight,jump?.weight??0);if(jump)focusTarget.lerp(jump.point,jump.weight);
    encounterLamp.position.copy(focusTarget).add(new THREE.Vector3(0,2,1));encounterLamp.color.setHex(SET_LIGHT[nearest.id]??0xbba4ee);encounterLamp.intensity=weight*(gentle?4:7)*(gentle?1:stallLamps(stallT)?.glow??1);const shown=poseHollow(previewTime);return{position,target,yaw:rideVehicle.wagon.rotation.y,focusTarget,focusWeight:weight,hollow:shown?{position:hollowHead.clone(),weight:hollowPlace.gaze,frantic:!!hollowPlace.frantic,lunge:hollowPlace.lunge??0}:null};},
    // The breakdown's clock (hayride-view.js): seconds since the tractor stopped, or null.
    setStall(value){stallT=Number.isFinite(value)?value:null;},guestPose:v=>hayrideGuestPose(state,v),get pickables(){return state.hayride?.purchased?[hit,...(fleet===1?[fleetHit]:[]),station?.sign].filter(Boolean):[marker];},get status(){return{purchased:!!state.hayride?.purchased,tier,phase:state.hayride?.convoy?.phase??"loading",queue:(state.visitors??[]).filter(v=>v.hayride&&!v.hayride.done&&v.hayride.phase==="queue").length,aboard:(state.hayride?.convoy?.manifest?.length??0)+(state.hayride?.secondConvoy?.manifest?.length??0),fleet:state.hayride?.fleet===1?2:1,vehicles:[vehicle,fleetVehicle].filter(Boolean).map((v,berth)=>({berth,visible:v.group.visible,x:v.tractor.position.x,z:v.tractor.position.z,phase:(berth?state.hayride.secondConvoy:state.hayride.convoy)?.phase})),bounds:SITE.bounds,farmBounds:SITE.bounds,rideBounds:hayrideRouteProfile(state).bounds,routeLevel:state.hayride?.routeLevel??0,routeLength:hayrideRouteProfile(state).length,scenes:hayrideRouteProfile(state).stops.map(p=>p.id),farmVisible:vehicle?.group.visible??false,rideScene:true,forest:forest?.diagnostics??null,lanterns:land?.lanterns.length??0,cleared,preview};},dispose(){vehicle?.dispose();fleetVehicle?.dispose();rideVehicle?.dispose();riders?.dispose();if(station)dispose(station.root);if(land){land.moon.dispose();dispose(land.root);}forest?.dispose();scares?.dispose();atmosphere.dispose();root.removeFromParent();stationLamp.removeFromParent();convoyLamp.removeFromParent();dispose(marker);hit.geometry.dispose();hit.material.dispose();fleetHit.geometry.dispose();fleetHit.material.dispose();rideScene.clear();}};
}
