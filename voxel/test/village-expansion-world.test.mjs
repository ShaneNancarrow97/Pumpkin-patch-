import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as M from '../src/model.js';
import {PLAN_SCALE as K,ARRIVAL,NODES} from '../src/content/village.js';
import {villageCellFree,villageWalkObstacles,villageHallFree,moveVillageHallWalker} from '../src/rules/village-navigation.js';
import {CAVE_IDS,CAVE_ENTRY,ACRE_PATHS,GRANNY_DOOR,CAVE_CAMERA_PRESET,caveCellFree,caveGroundAt,caveCeilingAt,constrainCaveCamera,acreCellFree,onAcreShortcut,stepExpansionWalker} from '../src/village-expansion-spatial.js';
import {createFollowCameraRig,followCameraPose} from '../src/follow-camera.js';
import {createVillageExpansionWorld,buildExpansionOre} from '../src/village-expansion-world.js';
import {EXPANSION_INSIDES,expansionHomeOpen} from '../src/village-expansion-interiors.js';
import {terrainHeight} from '../src/village-terrain.js';
import {Voxels} from '../src/voxels.js';

function openState(){
 const s=M.freshState();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;s.village.invited=true;
 s.village.quests.invitation={done:true};s.village.quests['two-doorbells']={done:true};
 s.village.expansion.effects=M.EXPANSION_CHAPTERS.flatMap(c=>[c.id,...c.reward?.effects??[]]);
 for(const who of ['elowen','rowan','mabel','tansy','opal','cinder','corvus','baron','granny'])s.village.friends[who]={met:true,xp:1080,chatIn:0,gifts:[],seen:[]};
 return s;
}
function surfaceFlood(s){
 const x0=-102,z0=-22,w=271,h=157,grid=new Uint8Array(w*h),boxes=villageWalkObstacles(s);
 for(let x=0;x<w;x++)for(let z=0;z<h;z++)grid[x+z*w]=villageCellFree(s,(x0+x)*K,(z0+z)*K,.32,boxes)?1:0;
 const start=Math.round(ARRIVAL.spawn[0]/K-x0)+Math.round(ARRIVAL.spawn[1]/K-z0)*w,queue=[start];grid[start]=2;
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%w,z=Math.floor(n/w);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,index=a+b*w;if(a>=0&&a<w&&b>=0&&b<h&&grid[index]===1){grid[index]=2;queue.push(index);}}}
 return p=>{const ix=Math.round(p.x/K-x0),iz=Math.round(p.z/K-z0);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(grid[ix+dx+(iz+dz)*w]===2&&Math.hypot((ix+dx+x0)*K-p.x,(iz+dz+z0)*K-p.z)<2.2)return true;return false;};
}
test('physical paths connect all six districts, current quest sites and cave mouth to the saved farm arrival',()=>{
 const s=openState(),reachable=surfaceFlood(s);
 for(const a of M.EXPANSION_AREAS.filter(a=>a.layer!=='cave'))assert.ok(reachable(a.spawn),a.id+' spawn');
 for(const a of M.EXPANSION_ACTIVITIES.filter(a=>!a.area.startsWith('cave')))assert.ok(reachable(a),a.id);
 assert.ok(reachable(CAVE_ENTRY),'the Copse cave mouth');assert.ok(reachable(GRANNY_DOOR),'Granny’s front door');
 for(const [a,b]of ACRE_PATHS)for(const p of[a,b])if(acreCellFree(p.x,p.z))assert.ok(reachable(p),'maze branch '+JSON.stringify(p));
 assert.deepEqual(M.EXPANSION_AREAS.find(a=>a.id==='cave-shallows').returnPoint,CAVE_ENTRY);
 const copse=M.EXPANSION_AREAS.find(a=>a.id==='copse');assert.ok(CAVE_ENTRY.x>=copse.bounds[0]&&CAVE_ENTRY.x<=copse.bounds[2]);
});
test('story and level gates cannot be bypassed through open scenery or the western approach',()=>{
 const s=M.freshState();s.village.invited=true;s.earned=1e9;
 for(const p of[{x:0,z:60*K},{x:58*K,z:66*K},{x:134*K,z:34*K},{x:58*K,z:112*K},CAVE_ENTRY,GRANNY_DOOR])assert.equal(villageCellFree(s,p.x,p.z),false,JSON.stringify(p));
 const open=openState();assert.equal(villageCellFree(open,CAVE_ENTRY.x,CAVE_ENTRY.z),true);
 const shortcutPoint=Array.from({length:31},(_,i)=>({x:(-59+i*.5)*K,z:82*K})).find(p=>onAcreShortcut(p.x,p.z)&&!acreCellFree(p.x,p.z,.32,false));
 assert.ok(shortcutPoint);assert.equal(acreCellFree(shortcutPoint.x,shortcutPoint.z,.32,true),true);
});
test('three enclosed cave layers have decreasing floors, reachable seams and swept stair movement',()=>{
 for(const id of CAVE_IDS){
  assert.ok(caveCellFree(0,0));assert.ok(caveCellFree(0,1.8*K));assert.ok(caveCellFree(10*K,-24*K));
  assert.ok(caveGroundAt(id,0,-12*K)<caveGroundAt(id,0,0));assert.equal(caveCellFree(0,-58*K),false);
  for(const a of[...M.EXPANSION_ACTIVITIES,...M.EXPANSION_VEINS].filter(a=>a.area===id))assert.ok(Array.from({length:32},(_,i)=>{const t=i*Math.PI/16;return caveCellFree(a.x+Math.cos(t)*1.7,a.z+Math.sin(t)*1.7);}).some(Boolean),a.id);
  const end=stepExpansionWalker({x:0,z:0},0,-500,caveCellFree);assert.ok(caveCellFree(end.x,end.z));assert.ok(end.z>-56*K);
  assert.equal(M.EXPANSION_VEINS.filter(v=>v.area===id).length,12);
 }
 assert.ok(caveGroundAt('cave-cathedral',0,0)<caveGroundAt('cave-workings',0,-12*K));
});
test('camera orbit remains inside rock and below the cave vault at seams and all walking angles',()=>{
 for(const area of CAVE_IDS)for(const place of[{x:0,z:0},{x:-16.5,z:-15},{x:9,z:-30},{x:0,z:-45}])for(let angle=0;angle<24;angle++){
  const rig=createFollowCameraRig({maxPitch:Math.PI*.49,maxDistance:20});
  const y=caveGroundAt(area,place.x,place.z);rig.reset({x:place.x,y,z:-place.z},{yaw:angle*Math.PI/12,pitch:angle%2?.9:.46,distance:13});
  const pose=followCameraPose(rig.state),p=constrainCaveCamera(area,pose.target,pose.position);
  assert.ok(caveCellFree(p.x,-p.z,.15),area+' wall');assert.ok(p.y<caveCeilingAt(area,p.x,-p.z)-.64,area+' roof');assert.ok(p.y>caveGroundAt(area,p.x,-p.z)+.34,area+' floor');
  assert.ok(Math.hypot(p.x-pose.target.x,p.y-pose.target.y,p.z-pose.target.z)>.2,'camera keeps a usable gap from the target');
 }
});
test('default cave framing looks into the descent and retains full owner framing at the reported shallow seam',()=>{
 const at={x:-14.4345,z:-14.1759},y=caveGroundAt('cave-shallows',at.x,at.z),rig=createFollowCameraRig(CAVE_CAMERA_PRESET);
 rig.reset({x:at.x,y,z:-at.z},CAVE_CAMERA_PRESET);const pose=followCameraPose(rig.state),p=constrainCaveCamera('cave-shallows',pose.target,pose.position);
 assert.ok(p.z<pose.target.z,'camera is on the entrance side, looking into the chamber');assert.ok(Math.hypot(p.x-pose.target.x,p.y-pose.target.y,p.z-pose.target.z)>=6.79,'spring arm cannot magnify Natalie into a full-screen sprite');
 assert.ok(p.y<caveCeilingAt('cave-shallows',p.x,-p.z)-.64);
});
test('real cave entrance geometry leaves the normal camera sightline open through the portal arch',()=>{
 const state=openState(),scene=new THREE.Scene(),pickMaterial=new THREE.MeshBasicMaterial(),world=createVillageExpansionWorld({scene,state,pickMaterial,groundAt:(x,z)=>terrainHeight(x/K,z/K)*K});
 world.enter('cave-shallows');const rig=createFollowCameraRig(CAVE_CAMERA_PRESET);rig.reset({x:0,y:0,z:0},CAVE_CAMERA_PRESET);
 const pose=followCameraPose(rig.state),p=constrainCaveCamera('cave-shallows',pose.target,pose.position),camera=new THREE.PerspectiveCamera(45,864/756,.2,900);
 camera.position.set(p.x,p.y,p.z);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 const target=new THREE.Vector3(pose.target.x,pose.target.y,pose.target.z),direction=target.clone().sub(camera.position),distance=direction.length();
 const ray=new THREE.Raycaster(camera.position,direction.normalize(),.05,distance-.15),cave=scene.getObjectByName('cave-shallows');
 assert.equal(ray.intersectObject(cave,true).length,0,'no opaque backing, wall or arch beam may mask the owner at entry');
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 assert.ok(frustum.containsPoint(new THREE.Vector3(0,-3,10)),'the actual entry camera includes the descending chamber floor');
 world.dispose();pickMaterial.dispose();
});
test('ore uses bounded faceted outcrops with depth-specific minerals instead of single stock cubes',()=>{
 const colours=[];for(const area of CAVE_IDS){const v=new Voxels();buildExpansionOre(v,area,27);assert.ok(v.solid.length>=20&&v.solid.length<=45,area);assert.ok(v.glow.length>=6&&v.glow.length<25,area);assert.ok(v.solid.every(b=>b[3]<.4&&b[4]<.4&&b[5]<.4),'individual stones remain finely stepped');assert.ok([...v.solid,...v.glow].every(b=>b.slice(0,6).every(Number.isFinite)&&b[3]>0&&b[4]>0&&b[5]>0));colours.push(v.glow[0][6]);}
 assert.equal(new Set(colours).size,3);
});
test('expansion rendering caches visited layers, filters future props, reopens seams and disposes private resources',()=>{
 const state=openState(),scene=new THREE.Scene(),pickMaterial=new THREE.MeshBasicMaterial(),world=createVillageExpansionWorld({scene,state,pickMaterial,groundAt:(x,z)=>terrainHeight(x/K,z/K)*K});
 world.sync();assert.equal(world.stats.addedLights,0);assert.equal(world.stats.cachedAreas,2);
 const activity=M.EXPANSION_CHAPTERS[0].activities;assert.ok(world.targets.some(t=>t.id===activity[0]));assert.ok(!world.targets.some(t=>t.id===activity[1]));
 const future=scene.getObjectByName('Mothlight activity landmarks').children.find(p=>p.userData.activity.id===activity[1]);assert.equal(future.visible,false);
 const sharedGeometry=scene.getObjectByName('The Crooked Acre').getObjectByProperty('isInstancedMesh',true).geometry;let sharedDisposed=0,pickDisposed=0;sharedGeometry.addEventListener('dispose',()=>sharedDisposed++);pickMaterial.addEventListener('dispose',()=>pickDisposed++);
 for(const id of CAVE_IDS){assert.ok(world.enter(id));assert.ok(scene.getObjectByName(id).userData.visualBudget.boxes>2000);assert.ok(world.targets.filter(t=>t.type==='expansion-activity').every(t=>t.area===id));}
 const lastCount=scene.children.length;world.enter('cave-shallows');assert.equal(scene.children.length,lastCount,'re-entry reuses cached cave geometry');
 const vein=M.EXPANSION_VEINS.find(v=>v.area==='cave-shallows');state.village.expansion.veins[vein.id]={remaining:1,cycle:1};world.sync();assert.ok(!world.targets.some(t=>t.id===vein.id));state.village.expansion.veins[vein.id].remaining=0;world.tick(1.1,new THREE.Vector3());assert.ok(world.targets.some(t=>t.id===vein.id));
 const returned=world.leave();assert.deepEqual(returned.spawn,CAVE_ENTRY);assert.equal(world.stats.restored.length,5);
 const count=scene.children.length;for(let i=0;i<30;i++)world.tick(1/60,new THREE.Vector3(),new THREE.Vector3(-90,4,-120));assert.equal(scene.children.length,count,'corn fade changes materials without allocation');
 world.dispose();assert.equal(scene.children.length,0);assert.equal(sharedDisposed,0);assert.equal(pickDisposed,0);pickMaterial.dispose();
});
test('seven decorated neighbour interiors preserve a clear spawn, host approach, exit and solid furniture',()=>{
 assert.equal(Object.keys(EXPANSION_INSIDES).length,7);
 for(const[id,plan]of Object.entries(EXPANSION_INSIDES)){
  assert.ok(villageHallFree(plan,...plan.hall.spawn),id);assert.ok(villageHallFree(plan,...plan.hall.host),id+' host');
  const exit=moveVillageHallWalker(plan,{x:plan.hall.spawn[0],z:plan.hall.spawn[1]},0,20);assert.ok(exit.z>0&&exit.z<=.6,id+' exit');
  for(const[x0,z0,x1,z1]of plan.hall.blocks)assert.equal(villageHallFree(plan,(x0+x1)/2,(z0+z1)/2),false,id+' furniture');
  const v=new Voxels();plan.build(v);assert.ok(v.solid.length>350,id+' authored furnishings');assert.ok(v.marks.lamp.length>=2&&v.marks.lamp.length<=8,id+' lamps fit the shared pool of eight');
 }
});
test('Granny’s level-eight welcome opens her actual home and all other homes require their saved restoration',()=>{
 const s=openState(),plan=EXPANSION_INSIDES['granny-cottage'];s.progression.claimed=[1,2,3,4,5,6,7,8];s.progression.homeLegacyThrough=8;s.earned=M.LEVELS[7].at;
 s.village.expansion.effects=['copse-restored'];assert.equal(expansionHomeOpen(s,plan),false);
 s.village.expansion.effects.push('granny-listens');assert.equal(expansionHomeOpen(s,plan),true);
 s.village.expansion.effects=s.village.expansion.effects.filter(id=>id!=='copse-restored');assert.equal(expansionHomeOpen(s,plan),false,'a home reward never bypasses the area gate');
 const all=openState();for(const p of Object.values(EXPANSION_INSIDES)){assert.equal(expansionHomeOpen(all,p),true);assert.equal(expansionHomeOpen(M.freshState(),p),false);}
});
