import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Voxels } from '../src/voxels.js';
import { COOKING_SITE as SITE,COOKING_SERVICE_ROUTE as ROUTE,cookingDeliveryPose } from '../src/content/cooking-layout.js';
import { createCookingWorld } from '../src/cooking-world.js';
import { buildFoodProp,buildFoodWallDisplay,disposeFoodProp } from '../src/food-props.js';
const almost=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
function boxes(root){root.updateMatrixWorld(true);const result=[],instance=new THREE.Matrix4(),combined=new THREE.Matrix4();root.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++){m.getMatrixAt(i,instance);combined.multiplyMatrices(m.matrixWorld,instance);assert.ok(combined.elements.every(Number.isFinite));assert.ok(Math.abs(combined.determinant())>0);result.push(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(combined));}});return result;}
const state=()=>({time:0,kitchen:{purchased:false,orders:[],upgrades:{chef:0},jobs:{truck:null}}});
const signBoard=()=>new THREE.Group();

test('delivery poses follow saved phase; waits and queued orders do not invent travel',()=>{
  const s=state();s.kitchen.orders=[{id:1,phase:'ordered',remaining:3}];assert.equal(cookingDeliveryPose(s).visible,false);
  s.kitchen.orders=[{id:1,phase:'travelling',remaining:12}];let p=cookingDeliveryPose(s);almost(p.z,-6);assert.equal(p.visible,true);
  s.kitchen.orders[0].remaining=6;p=cookingDeliveryPose(s);almost(p.z,-.9);
  s.kitchen.orders[0]={id:1,phase:'unloading',remaining:6};p=cookingDeliveryPose(s);almost(p.z,4.2);almost(p.unloadProgress,0);
  s.kitchen.orders[0].remaining=0;p=cookingDeliveryPose(s);assert.equal(p.visible,true);almost(p.unloadProgress,1);
  assert.equal(cookingDeliveryPose({phase:'travelling',remaining:Infinity}).progress,1);
  for(const phase of ['travelling','unloading'])for(const n of [-100,0,2,6,12,100])for(const x of Object.values(cookingDeliveryPose({phase,remaining:n})))if(typeof x==='number')assert.ok(Number.isFinite(x));
});

test('purchased world is native, read-only, bounded, and leaves pedestrian exit clear',()=>{
  const scene=new THREE.Scene(),s=state(),lamps=[];
  const c=createCookingWorld({scene,state:s,signBoard,lamps});assert.equal(c.status.built,false);assert.equal(c.pickables.length,1);assert.equal(lamps[0].active,false);
  s.kitchen.purchased=true;s.kitchen.orders=[{id:3,phase:'unloading',remaining:0}];const before=JSON.stringify(s);c.sync();c.tick(60);assert.equal(JSON.stringify(s),before);assert.equal(c.status.built,true);assert.equal(c.status.cart.visible,true);assert.equal(c.status.lights,0);assert.equal(lamps.length,1);assert.equal(lamps[0].active,true);
  const all=boxes(c.root);assert.ok(all.length>500&&all.length<8000,`bounded native budget ${all.length}`);
  assert.ok(all.every(b=>b.max.z<5.5),'all construction stays north of public visitor exit z6.6');
  // Every protrusion of the visible cart, including tiller and wheel hubs,
  // stays within the declared swept route. Static truck never intersects it.
  const cart=c.root.getObjectByName('Timed ingredient delivery cart');assert.ok(cart);
  for(const remaining of [12,10,6,2,0]){s.kitchen.orders=[{id:3,phase:'travelling',remaining}];c.sync();for(const b of boxes(cart)){assert.ok(b.min.x>=ROUTE.bounds.x0&&b.max.x<=ROUTE.bounds.x1);assert.ok(b.min.z>=ROUTE.bounds.z0&&b.max.z<=ROUTE.bounds.z1);}}
  const truck=c.root.getObjectByName('The Midnight Kitchen · food truck');assert.ok(boxes(truck).every(b=>b.min.x>ROUTE.bounds.x1));
  s.kitchen.upgrades.chef=1;c.sync();assert.equal(c.status.chefVisible,true);for(let i=0;i<10;i++)c.tick(i);assert.equal(lamps.length,1);
  assert.equal(scene.children.filter(x=>x.isPointLight).length,0);c.dispose();assert.equal(lamps.length,0);assert.equal(scene.children.length,0);
});

test('receiving entrance clears only bounded obstacles and preserves ground and distant props',()=>{
  const scene=new THREE.Scene(),legacy=new THREE.Group(),v=new Voxels();v.block(38.8,0,0,.2,1,.2,0xffffff);v.block(38.8,-.1,0,.5,.15,.5,0xffffff);v.block(36,0,0,.2,1,.2,0xffffff);legacy.add(v.build());scene.add(legacy);
  const s=state();s.kitchen.purchased=true;const c=createCookingWorld({scene,state:s,signBoard,world:{group:legacy}});assert.equal(c.status.cleared,1);let left=0;legacy.traverse(m=>{if(m.isInstancedMesh)left+=m.count;});assert.equal(left,2);c.dispose();
});

test('eight native foods and both shop cabinets have finite positive geometry and wall mounting depth',()=>{
  for(const id of ['wedges','soup','toffee-apples','pumpkin-jam','ghost-cookies','pumpkin-pie','cocoa-brownies','moonlight-tart']){
    const prop=buildFoodProp(id);assert.ok(boxes(prop).length>=5);disposeFoodProp(prop);
    for(const turn of [0,Math.PI/2,-Math.PI/2]){
      const cabinet=buildFoodWallDisplay({recipeId:id,count:100,slot:1});assert.equal(cabinet.children.filter(g=>g.userData.foodRecipe).length,3);assert.deepEqual(cabinet.userData.dimensions,{w:1.5,h:1.3,d:.36});const local=boxes(cabinet);assert.ok(local.every(b=>b.min.z>=-.06&&b.max.z<=.36),`${id} does not clip behind wall or protrude too far`);cabinet.rotation.y=turn;boxes(cabinet);disposeFoodProp(cabinet);
    }
  }
});

test('service plot replaces only tagged tree instances even after a previous mesh compaction',()=>{
  const scene=new THREE.Scene(),v=new Voxels();
  v.block(-7.8,0,16.9,.2,1.1,.2,0x113311); // prior hayride gate removal
  v.block(42,0,8,.3,3,.3,0x334422); // deliberately beyond receiving gate
  v.block(41.8,2.2,8,.9,.7,.8,0x994422);
  v.block(44,0,9,.2,3,.2,0x669911); // other untagged tree, must stay
  v.block(40,0,1.6,.3,2.8,.3,0x443322);
  v.block(40,2.3,1.6,1.2,.8,1.1,0x993322);
  v.block(38.8,0,0,.2,1,.2,0x775544); // receiving gate itself
  v.block(38.8,-.1,0,.5,.15,.5,0x777766); // ground, must stay
  const records=[{from:1,to:3,boxes:v.solid.slice(1,3)},{from:4,to:6,boxes:v.solid.slice(4,6)}];
  const legacy=v.build(),mesh=legacy.children.find(m=>m.isInstancedMesh),m=new THREE.Matrix4(),color=new THREE.Color();scene.add(legacy);
  // Simulate the existing west-gate clear before the kitchen is purchased.
  for(let i=1;i<mesh.count;i++){mesh.getMatrixAt(i,m);mesh.setMatrixAt(i-1,m);mesh.getColorAt(i,color);mesh.setColorAt(i-1,color);}mesh.count--;
  const s=state();s.kitchen.purchased=true;const c=createCookingWorld({scene,state:s,signBoard,world:{group:legacy,serviceTrees:records,serviceTreeMesh:mesh}});
  assert.equal(c.status.cleared,5);assert.equal(mesh.count,2);
  const surviving=boxes(legacy);assert.ok(surviving.some(b=>b.min.x>43),'unrelated tree remains');assert.ok(surviving.some(b=>b.max.y<.3),'ground remains');
  c.dispose();
});
