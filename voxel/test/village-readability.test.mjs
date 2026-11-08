import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { buildGreen, tickVillageVisibility, resetVillageVisibility } from '../src/village-world.js';
import { createGrass } from '../src/village-grass.js';
import { villageTreeVisibility, villageGrassVisibility, VILLAGE_GRASS_FADE } from '../src/village-visibility.js';
import { FIXTURES, PLAN_SCALE as K } from '../src/content/village.js';
import { villageCellFree } from '../src/rules/village-navigation.js';
import { node } from '../src/village-models.js';

test('nearby and intervening tree crowns clear the owner without hiding a distant landmark',()=>{
 const tree={x:0,y:0,z:0};
 assert.equal(villageTreeVisibility({x:8,y:0,z:0},{x:22,y:8,z:0},tree),0);
 assert.equal(villageTreeVisibility({x:30,y:0,z:0},{x:44,y:8,z:0},tree),1);
 assert.ok(villageTreeVisibility({x:14,y:0,z:0},{x:27,y:8,z:0},tree)>0);
 assert.ok(villageTreeVisibility({x:14,y:0,z:0},{x:27,y:8,z:0},tree)<1);
 assert.equal(villageTreeVisibility({x:-20,y:0,z:0},{x:20,y:15,z:0},tree),0,'crown crosses the camera-owner sightline');
 assert.equal(villageTreeVisibility(null,{x:0,y:6,z:0},tree),1,'tour keeps the landmark visible');
});

test('upper tree dissolve owns its materials, restores them and keeps the planted collision rim',()=>{
 const green=buildGreen(),upper=green.getObjectByName('moth-tree-upper'),ordinary=[];
 green.traverse(o=>{if(o.isMesh&&!upper.children.includes(o))ordinary.push({o,material:o.material,opacity:o.material.opacity});});
 const before=green.userData.visualBudget.boxes;
 const player=new Vector3(FIXTURES.tree.x+8,0,-FIXTURES.tree.z),camera={position:new Vector3(FIXTURES.tree.x+16,8,-FIXTURES.tree.z)};
 for(let i=0;i<10;i++)tickVillageVisibility(green,player,camera,.1);
 assert.equal(upper.visible,false);assert.equal(green.userData.treeVisibility.target,0);
 assert.ok(upper.children.every(o=>o.material.alphaHash&&!o.castShadow));
 for(const entry of ordinary){assert.equal(entry.o.material,entry.material);assert.equal(entry.material.opacity,entry.opacity);}
 assert.equal(villageCellFree(null,FIXTURES.tree.x+2.8*K,FIXTURES.tree.z),false,'hidden crown never removes planter collision');
 resetVillageVisibility(green);assert.equal(upper.visible,true);assert.ok(upper.children.every(o=>o.material.opacity===1));
 assert.equal(green.userData.visualBudget.boxes,before,'no per-frame geometry allocation');
});

test('grass dissolves around the owner and camera by shared world-unit uniforms',()=>{
 const p={x:4,z:8},cam={x:30,z:30};
 assert.equal(villageGrassVisibility(p,p,cam),0);
 assert.equal(villageGrassVisibility({x:6,z:8},p,cam)>.1,true);
 assert.equal(villageGrassVisibility({x:10,z:8},p,cam),1);
 assert.equal(villageGrassVisibility(cam,p,cam),0);
 const grass=createGrass({x0:0,z0:0,x1:2,z1:2,density:.1,grow:()=>({h:.3,colours:[0x5c7d48],flowers:true}),height:()=>0});
 const meshes=grass.group.children,mat=meshes[0].material,matrices=meshes.map(m=>Array.from(m.instanceMatrix.array));
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\nvec4 diffuseColor = vec4( diffuse, opacity );'};
 mat.onBeforeCompile(shader);assert.equal(mat.alphaHash,true);assert.equal(mat.transparent,false);
 assert.match(shader.vertexShader,/modelMatrix \* root/);assert.match(shader.vertexShader,/transformed.y \*= mix/);
 assert.match(shader.fragmentShader,/opacity \* vGrassVisibility/);
 grass.tick(20,{position:new Vector3(3,6,-4)},new Vector3(1,0,-2));
 assert.deepEqual(shader.uniforms.uGrassPlayer.value.toArray(),[1,-2]);
 assert.deepEqual(shader.uniforms.uGrassCamera.value.toArray(),[3,-4]);
 assert.deepEqual(grass.group.userData.proximityFade,{...VILLAGE_GRASS_FADE,mode:'gpu-alpha-hash',worldUnits:true});
 assert.deepEqual(meshes.map(m=>Array.from(m.instanceMatrix.array)),matrices,'no blade matrices rewritten');
});

test('the opened plaza keeps both sides of the tree and the relocated stalls reachable',()=>{
 assert.ok(FIXTURES.stall.z>FIXTURES.tree.z+3*K);
 assert.ok(FIXTURES.well.z<FIXTURES.tree.z-6*K);
 for(const [x,z] of [[53.2,24.6],[62.2,24.6],[64.2,24.6],[51.4,27.8],[58,19],[58,30],[63,32.4]])
  assert.equal(villageCellFree(null,x*K,z*K),true,`open plaza at ${x},${z}`);
});

test('resource forms have finite raised bark, mineral seams and distinct leafy herb sprigs',()=>{
 for(const material of ['logs','stone','herbs']){
  const boxes=[];node({block:(...b)=>boxes.push(b)},material,true);
  assert.ok(boxes.length>=12);assert.ok(new Set(boxes.map(b=>b[6])).size>=5);
  for(const b of boxes){assert.ok(b.slice(0,7).every(Number.isFinite));assert.ok(b.slice(3,6).every(n=>n>0));}
  const gone=[];node({block:(...b)=>gone.push(b)},material,false);assert.equal(gone.length,0);
 }
});
