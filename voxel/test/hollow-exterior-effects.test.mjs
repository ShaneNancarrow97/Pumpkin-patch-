import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { freshState, saveData } from '../src/model.js';
import { createHollowFarm } from '../src/hollow-house-farm.js';

const signBoard=()=>new THREE.Mesh(new THREE.PlaneGeometry(6.2,1.2),[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()]);
const transforms=root=>{root.updateMatrixWorld(true);const result=[];root.traverse(o=>result.push([o.visible,...o.matrixWorld.elements]));return result;};

test('exterior refreshes are cached, use two pooled lamp positions, and never mutate save or add lights',()=>{
 const scene=new THREE.Scene(),s=freshState(),lamps=[],farm=createHollowFarm(scene,s,signBoard,lamps);
 farm.sync();assert.equal(farm.status.rebuilds,1);assert.equal(lamps.length,2);assert.ok(lamps.every(p=>!p.active));
 assert.ok(!farm.pickables.some(p=>p.userData.type==='hollow-door'));
 const before=JSON.stringify(saveData(s));for(let i=0;i<100;i++){farm.sync();farm.tick(i);}
 assert.equal(farm.status.rebuilds,1);assert.equal(JSON.stringify(saveData(s)),before);
 Object.assign(s.hollowHouse,{purchased:true,status:'ready',tier:3});farm.sync();
 assert.equal(farm.status.rebuilds,2);assert.ok(lamps.every(p=>p.active));assert.ok(farm.pickables.some(p=>p.userData.type==='hollow-door'));
 const after=JSON.stringify(saveData(s));farm.tick(34);assert.equal(JSON.stringify(saveData(s)),after);
 let lights=0;scene.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);
 s.hollowHouse.open=true;farm.sync();assert.equal(farm.status.rebuilds,2,'opening does not rebuild the house or its sign');
 for(let tier=1;tier<=5;tier++){s.hollowHouse.tier=tier;farm.sync();assert.equal(lamps.length,2);}
 farm.dispose();farm.dispose();assert.equal(lamps.length,0);assert.equal(scene.children.length,0);assert.deepEqual(farm.pickables,[]);
});

test('live reduced motion keeps the exterior details stationary and releases its listener',()=>{
 const previous=globalThis.matchMedia,listeners=new Map();globalThis.matchMedia=()=>({matches:false,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)});
 try{
  const s=freshState();Object.assign(s.hollowHouse,{purchased:true,status:'ready',tier:5});
  const farm=createHollowFarm(new THREE.Scene(),s,signBoard);farm.sync();farm.tick(16);
  const moving=transforms(farm.root);farm.tick(18);assert.notDeepEqual(transforms(farm.root),moving);
  listeners.get('change')({matches:true});farm.tick(16);const still=transforms(farm.root);farm.tick(34);assert.deepEqual(transforms(farm.root),still);
  assert.equal(farm.status.reducedMotion,true);assert.equal(farm.status.effects.ghost,false);
  farm.dispose();assert.equal(listeners.size,0);
 }finally{if(previous===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=previous;}
});
