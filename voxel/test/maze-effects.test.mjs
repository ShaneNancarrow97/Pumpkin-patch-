import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildMazePrefab, animateMazePrefab } from "../src/maze-effects.js";
import { disposeHollowObject } from "../src/hollow-house-world.js";

const IDS=["cobweb-canopy","whispering-portraits","spectral-parade","thunder-chamber","phantom-finale"];
const layout=tier=>({w:10+tier-1,d:tier>2?8+tier-2:8,mazeDoor:{x:(10+tier-1)/2-2}});

test("every maze prefab stays above circulation lanes in finite native batches",()=>{
 for(const tier of [1,3,5])for(const id of IDS){
  const L=layout(tier),object=buildMazePrefab(id,L);object.updateMatrixWorld(true);
  assert.equal(object.userData.knownPrefab,true);assert.equal(object.userData.prefabId,id);
  let boxes=0,batches=0;const instance=new THREE.Matrix4(),global=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
  object.traverse(m=>{if(!m.isInstancedMesh)return;batches++;boxes+=m.count;for(let i=0;i<m.count;i++){m.getMatrixAt(i,instance);global.multiplyMatrices(m.matrixWorld,instance);assert.ok(global.elements.every(Number.isFinite));assert.ok(global.determinant()>0);global.decompose(position,q,scale);assert.ok(position.y-scale.y/2>2.4,`${id}: prefab must not obstruct guests`);assert.ok(Math.abs(position.x)<L.w/2+.05,`${id}: inside side walls`);assert.ok(position.z>-L.d/2-.05,`${id}: in front of the back wall`);assert.ok(position.y+scale.y/2<4.85,`${id}: below tier-one ceiling`);}});
  assert.ok(boxes>20&&boxes<500);assert.ok(batches>=1&&batches<=8);
  animateMazePrefab(object,12);object.updateMatrixWorld(true);assert.ok(object.children.every(p=>p.position.toArray().every(Number.isFinite)));
  disposeHollowObject(object);
 }
});
test("prefab animations are gentle transforms and reduced motion stays fixed",()=>{
 for(const id of IDS){const object=buildMazePrefab(id,layout(5)),piece=object.userData.movers[0];assert.ok(piece);
  animateMazePrefab(object,2,true);const still={position:piece.object.position.toArray(),rotation:piece.object.rotation.toArray(),scale:piece.object.scale.toArray()};
  animateMazePrefab(object,20,true);assert.deepEqual(piece.object.position.toArray(),still.position);assert.deepEqual(piece.object.rotation.toArray(),still.rotation);assert.deepEqual(piece.object.scale.toArray(),still.scale);
  animateMazePrefab(object,10,false);assert.ok(piece.object.position.toArray().some((n,i)=>n!==still.position[i])||piece.object.rotation.toArray().some((n,i)=>n!==still.rotation[i])||piece.object.scale.toArray().some((n,i)=>n!==still.scale[i]));
  disposeHollowObject(object);
 }
});
test("disposing a prefab never destroys the globally shared cube",()=>{
 const a=buildMazePrefab(IDS[0],layout(1)),b=buildMazePrefab(IDS[1],layout(1));let shared,disposed=0;a.traverse(m=>{if(m.isInstancedMesh&&!shared)shared=m.geometry;});shared.addEventListener("dispose",()=>disposed++);disposeHollowObject(a);assert.equal(disposed,0);assert.ok(b.children.length>0);disposeHollowObject(b);assert.equal(disposed,0);
});
