import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cursedFungus, createCursedSporeField, BLIGHT_PARTICLE_LIMIT, BLIGHT_MODEL_BOX_LIMIT } from '../src/village-blight.js';
import { node } from '../src/village-models.js';
import { buildNodes } from '../src/village-world.js';
import { NODES, PLAN_SCALE } from '../src/content/village.js';

const rows=()=>Array.from({length:5},(_,i)=>({id:'fungus-'+i,x:i*2,z:2,ready:true,cycle:0}));
const focus=new THREE.Vector3(0,1,-2);
function finiteInstances(field){
 const mesh=field.group.children[0],matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),scale=new THREE.Vector3(),quat=new THREE.Quaternion();
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));matrix.decompose(pos,quat,scale);assert.ok(scale.x>0&&scale.y>0&&scale.z>0);}
}

test('Blackroot has finite detailed roots, domed caps, gills and restrained red-purple glow within its pick volume',()=>{
 const boxes=[];cursedFungus({block:(...box)=>boxes.push(box)},()=>.5);
 assert.ok(boxes.length>=500&&boxes.length<=BLIGHT_MODEL_BOX_LIMIT,'the refined cluster keeps its explicit static budget');
 let top=0,x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
 for(const [x,y,z,w,h,d,c]of boxes){assert.ok([x,y,z,w,h,d,c].every(Number.isFinite));assert.ok(w>0&&h>0&&d>0);top=Math.max(top,y+h);x0=Math.min(x0,x-w/2);x1=Math.max(x1,x+w/2);z0=Math.min(z0,z-d/2);z1=Math.max(z1,z+d/2);}
 assert.ok((x1-x0)*PLAN_SCALE<=1.35&&(z1-z0)*PLAN_SCALE<=1.35&&top*PLAN_SCALE<=1.08,'model remains inside the real node hit box');
 const glowing=boxes.filter(b=>b[7]);assert.ok(glowing.length>0&&glowing.length<12,'only small live-rot flecks glow');
 const spent=[];node({block:(...b)=>spent.push(b)},'cursed-spores',false);assert.equal(spent.length,0,'no permanent stump');
});

test('four circular caps have curved crown profiles and varied diameters above thin winding ground roots',()=>{
 const boxes=[];cursedFungus({block:(...box)=>boxes.push(box)},()=>.5);
 // Cap columns are square, begin above the roots and have a solid dome depth.
 const caps=new Map();
 for(const b of boxes)if(b[1]>=.16&&Math.abs(b[3]-b[5])<1e-8&&b[4]>=.0165){if(!caps.has(b[1]))caps.set(b[1],[]);caps.get(b[1]).push(b);}
 assert.equal(caps.size,4);const diameters=[];
 for(const columns of caps.values()){
  assert.ok(columns.length>=40,'fine circular silhouette');
  const peak=columns.reduce((a,b)=>a[4]>b[4]?a:b),radius=Math.max(...columns.map(b=>Math.abs(b[0]-peak[0])));
  const inner=columns.filter(b=>Math.hypot(b[0]-peak[0],b[2]-peak[2])<radius*.3),outer=columns.filter(b=>Math.hypot(b[0]-peak[0],b[2]-peak[2])>radius*.82);
  const mean=list=>list.reduce((n,b)=>n+b[4],0)/list.length;
  assert.ok(mean(inner)>mean(outer)+.03,'rounded crown falls towards its rim');
  assert.ok(new Set(columns.map(b=>b[4].toFixed(3))).size>=7,'many dome heights replace flat slabs');
  assert.ok(columns.every(b=>!(Math.abs(b[0]-peak[0])>radius*.75&&Math.abs(b[2]-peak[2])>radius*.75)),'the square corners are absent');
  diameters.push(radius*2);
 }
 assert.ok(Math.max(...diameters)/Math.min(...diameters)>2.1,'cap sizes are clearly different');
 const roots=boxes.filter(b=>[0x33202f,0x573047].includes(b[6]));assert.ok(roots.length>=120);
 assert.ok(roots.every(b=>b[1]+b[4]<.03&&b[4]*PLAN_SCALE<.025&&Math.min(b[3],b[5])*PLAN_SCALE<.075),'ground-hugging strands stay thin');
 assert.ok(roots.some(b=>Math.min(b[3],b[5])*PLAN_SCALE<.025),'tapered fine tips');
 const span=Math.max(...roots.map(b=>b[0]+b[3]/2))-Math.min(...roots.map(b=>b[0]-b[3]/2));assert.ok(span*PLAN_SCALE>.9,'roots spread around the patch');
 assert.equal(boxes.filter(b=>b[1]<.04&&b[3]>.3&&b[5]>.3).length,0,'no square base tile');
});

test('the native node build includes and removes the same canonical cursed sockets',()=>{
 const ids=new Set(NODES.filter(n=>n.kind==='blight'&&n.district==='green').map(n=>n.id));assert.equal(ids.size,8);
 const live=buildNodes(id=>ids.has(id),{village:{gatherCycles:{}}});
 assert.deepEqual(new Set(live.userData.blightSites.map(p=>p.id)),ids);
 assert.ok(live.children.length<=2,'fungus uses the existing solid/glow batches');
 let lights=0;live.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);
 const cleared=buildNodes(()=>false,{village:{gatherCycles:{}}});assert.equal(cleared.children.length,0);assert.deepEqual(cleared.userData.blightSites,[]);
 for(const g of [live,cleared])g.traverse(o=>{if(o.isInstancedMesh){o.dispose();o.material.dispose();}});
});

test('nearby ambient spores and simultaneous clearing puffs share one strict 24-instance pool',()=>{
 const field=createCursedSporeField({groundAt:()=>.2}),data=rows();field.sync(data);field.tick(.05,focus);
 assert.equal(field.stats.ambient,12);assert.ok(field.stats.live<=BLIGHT_PARTICLE_LIMIT);finiteInstances(field);
 for(let i=0;i<3;i++){data[i].ready=false;data[i].cycle++;field.sync(data);field.tick(.02,focus);assert.ok(field.stats.live<=24);finiteInstances(field);}
 assert.equal(field.stats.puffsCreated,3);assert.ok(field.stats.puff<=12);assert.equal(field.group.children.length,1);assert.equal(field.stats.addedLights,0);field.dispose();
});

test('only a real saved clear cycle emits a puff; repeated redraws and gate changes do not',()=>{
 const field=createCursedSporeField(),data=rows();field.sync(data);
 data[0].ready=false;field.sync(data);assert.equal(field.stats.puffsCreated,0);
 data[0].ready=true;field.sync(data);data[0].ready=false;data[0].cycle++;field.sync(data);field.sync(data);assert.equal(field.stats.puffsCreated,1);
 for(let i=0;i<7;i++)field.tick(.15,focus);assert.equal(field.stats.puff,0,'burst expires rather than leaving litter');field.dispose();
});

test('rooting draws spores towards the hand, pauses safely, and hides animation for reduced motion or interiors',()=>{
 const field=createCursedSporeField(),data=rows();field.sync(data);field.rooting(0,2,.4,1.2,-2,.5);field.tick(.05,focus);
 assert.equal(field.stats.rooting,true);finiteInstances(field);
 const before=field.group.children[0].instanceMatrix.array.slice();field.tick(1,focus,true,false,true);assert.deepEqual(field.group.children[0].instanceMatrix.array,before,'paused frames preserve the pose');
 field.tick(.05,focus,true,true);assert.equal(field.stats.live,0);assert.equal(field.group.visible,false);
 field.tick(.05,focus,false);assert.equal(field.stats.live,0);field.hide();assert.equal(field.stats.rooting,false);field.dispose();
});

test('repeated synchronisation reuses one mesh and disposal releases each owned GPU resource once',()=>{
 const field=createCursedSporeField(),mesh=field.group.children[0],data=rows();let geometries=0,materials=0,instances=0;
 mesh.addEventListener('dispose',()=>instances++);
 mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);
 for(let i=0;i<50;i++){field.sync(data);field.tick(.016,focus);assert.equal(field.group.children[0],mesh);}
 field.dispose();field.dispose();field.sync(data);field.tick(.1,focus);
 assert.equal(instances,1);assert.equal(geometries,1);assert.equal(materials,1);assert.equal(field.stats.live,0);assert.equal(field.stats.disposed,true);assert.equal(field.group.children.length,0);
});
