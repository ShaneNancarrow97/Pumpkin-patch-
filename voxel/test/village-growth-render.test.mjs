import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cursedFungusGrowth } from '../src/village-blight.js';
import { createVillageResourceLayer, RESOURCE_DETAIL_LIMIT } from '../src/village-resource-layer.js';
import { villageNodeHitBox } from '../src/village-node-hit.js';
import { NODES, PLAN_SCALE } from '../src/content/village.js';
import { villageNodePosition } from '../src/content/village-node-sites.js';
import { terrainHeight } from '../src/village-terrain.js';

const stages=['bare','spores','shoots','young','mature'];
const shape=(stage,detailed=true)=>{const boxes=[];cursedFungusGrowth({block:(...b)=>boxes.push(b)},stage,()=>.5,detailed);return boxes;};
const camera=new THREE.Vector3(0,3,2);
function fixture(count=1){
 const nodes=Array.from({length:count},(_,i)=>({id:'fungus-'+i,kind:'blight',material:'cursed-spores',x:i%8*3,z:Math.floor(i/8)*3,scale:.72+(i%4)*.1}));
 const info=new Map(nodes.map(n=>[n.id,{stage:'mature',visible:true,available:true,cycle:0,scale:n.scale}]));
 const layer=createVillageResourceLayer({nodes,positionOf:n=>n,growthOf:id=>info.get(id),scale:1.5});layer.sync();layer.tick(0,camera);
 return{layer,nodes,info};
}
function finite(layer){const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();for(const mesh of layer.group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));m.decompose(p,q,s);assert.ok(s.x>0&&s.y>0&&s.z>0);}}

test('Blackroot grows through distinct roots, spores, shoots, young caps and full domes',()=>{
 const counts=[],heights=[];
 for(const stage of stages){const boxes=shape(stage);counts.push(boxes.length);heights.push(Math.max(0,...boxes.map(b=>b[1]+b[4])));for(const b of boxes){assert.ok(b.slice(0,7).every(Number.isFinite));assert.ok(b[3]>0&&b[4]>0&&b[5]>0);}}
 assert.equal(counts[0],0);assert.equal(new Set(counts).size,5);assert.ok(counts.every((n,i)=>i===0||n>counts[i-1]));assert.equal(counts.at(-1),727,'the premium adult prototype is preserved');assert.ok(heights.every((h,i)=>i===0||h>heights[i-1]),'real stage silhouettes gain height');
 assert.ok(shape('spores').every(b=>b[1]+b[4]<.08),'no adult stalks in the spore stage');
 assert.ok(shape('young').some(b=>b[4]>.03),'young caps have actual domes');
 assert.ok(shape('mature',false).length<=110,'distant mature shape remains a rounded low-detail model');
});

test('growth thresholds update persistent instance buffers without rebuilding geometry',()=>{
 const{layer,info}=fixture(),meshes=layer.group.children.slice(),geometry=meshes[0].geometry,materials=meshes.map(m=>m.material);
 for(const stage of stages){info.get('fungus-0').stage=stage;info.get('fungus-0').available=stage==='mature';layer.tick(.26,camera);finite(layer);assert.equal(layer.group.children[0].geometry,geometry);assert.deepEqual(layer.group.children,meshes);assert.deepEqual(meshes.map(m=>m.material),materials);assert.equal(layer.stats.meshCount,2);if(stage==='bare')assert.equal(layer.stats.solidBoxes,0);else assert.ok(layer.stats.solidBoxes>0);}
 layer.dispose();
});

test('a crowded outbreak caps detailed mature models and keeps every rendered matrix finite',()=>{
 const{layer}=fixture(32);assert.ok(layer.stats.detailed<=RESOURCE_DETAIL_LIMIT);assert.ok(layer.stats.solidBoxes<11000,'distant rounded LOD avoids 32 detailed clusters');assert.equal(layer.group.children.length,2);finite(layer);
 let lights=0;layer.group.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);assert.equal(layer.stats.addedLights,0);layer.dispose();
});

test('steady frames reuse templates and buffers; far patches use LOD and return at full detail',()=>{
 const{layer}=fixture(),mesh=layer.group.children[0],initial=layer.stats;
 for(let i=0;i<100;i++){layer.sync();layer.tick(.016,camera);}
 assert.equal(layer.stats.uploads,initial.uploads);assert.equal(layer.stats.prototypeCount,initial.prototypeCount);
 const nearBoxes=layer.stats.solidBoxes;layer.tick(.3,new THREE.Vector3(50,3,0));assert.ok(layer.stats.solidBoxes<nearBoxes);assert.equal(layer.group.children[0],mesh);
 layer.tick(.3,new THREE.Vector3(200,3,0));assert.equal(layer.stats.solidBoxes,0);layer.tick(.3,camera);assert.equal(layer.stats.solidBoxes,nearBoxes);layer.dispose();
});

test('immature patches remain visible, while covered or closed patches hide completely',()=>{
 const{layer,info}=fixture(),g=info.get('fungus-0');g.stage='young';g.available=false;layer.sync();layer.tick(0,camera);assert.ok(layer.stats.solidBoxes>0);
 g.visible=false;layer.sync();layer.tick(0,camera);assert.equal(layer.stats.solidBoxes,0);assert.deepEqual(layer.group.userData.blightSites,[]);
 g.visible=true;g.stage='mature';layer.sync();layer.tick(0,camera);assert.ok(layer.stats.solidBoxes>0);layer.tick(.1,camera,false);assert.equal(layer.group.visible,false);layer.dispose();
});

test('two shared resource batches dispose instance buffers, geometry and materials once',()=>{
 const{layer}=fixture(),meshes=layer.group.children.slice();let instances=0,geometries=0,materials=0;
 for(const m of meshes){m.addEventListener('dispose',()=>instances++);m.material.addEventListener('dispose',()=>materials++);}meshes[0].geometry.addEventListener('dispose',()=>geometries++);
 layer.dispose();layer.dispose();layer.sync();layer.tick(.2,camera);assert.equal(instances,2);assert.equal(geometries,1);assert.equal(materials,2);assert.equal(layer.group.children.length,0);assert.equal(layer.stats.disposed,true);
});

test('a northern ordinary respawn hit box starts on the same raised floor as its actual rendered rock',()=>{
 const node=NODES.find(n=>n.id==='stone-13');assert.ok(node);
 const state={village:{gatherCycles:{[node.id]:6}}},point=villageNodePosition(state,node),groundAt=(x,z)=>terrainHeight(x/PLAN_SCALE,z/PLAN_SCALE)*PLAN_SCALE,floor=groundAt(point.x,point.z);assert.ok(floor>.65,'fixture is genuinely above the old fixed pick height');
 const layer=createVillageResourceLayer({nodes:[node],positionOf:()=>point,growthOf:()=>({stage:'mature',visible:true,cycle:6,scale:1}),groundAt,scale:PLAN_SCALE});layer.sync();layer.tick(0,new THREE.Vector3(point.x,floor+2,-point.z+3));layer.group.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(layer.group),hit=villageNodeHitBox(node,point,groundAt);
 assert.ok(Math.abs(bounds.min.y-floor)<1e-6,'rendered rock sits on the northern terrace');
 assert.ok(Math.abs(hit.y-hit.h/2-bounds.min.y)<1e-6,'hit volume and rendered floor agree after a saved relocation');assert.equal(hit.x,point.x);assert.equal(hit.z,-point.z);assert.ok(hit.y>floor);layer.dispose();
});
