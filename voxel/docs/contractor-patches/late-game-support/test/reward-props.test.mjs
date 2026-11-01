import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { REWARD_PROPS, buildRewardProp } from '../models/reward-props.js';

const EPS=1e-6;
const box=group=>{group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(group);};
const meshes=group=>{const out=[];group.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const snapshot=group=>{group.updateMatrixWorld(true);const out=[];group.traverse(o=>out.push(...o.matrixWorld.elements));return out;};

test('reward candidates have unique isolated IDs, measured room-scale bodies and bounded draw counts',()=>{
  assert.equal(REWARD_PROPS.length,3);
  assert.equal(new Set(REWARD_PROPS.map(p=>p.id)).size,3);
  assert.ok(Object.isFrozen(REWARD_PROPS));
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  for(const meta of REWARD_PROPS){
    assert.ok(meta.id.startsWith('contract-trophy-'));
    assert.ok(Object.isFrozen(meta)&&Object.isFrozen(meta.footprint));
    const g=buildRewardProp(meta.id),b=box(g),drawn=meshes(g);let count=0;
    assert.equal(g.userData.status,'contractor-preview-not-registered');
    assert.equal(g.userData.front,'+Z');assert.equal(g.userData.up,'+Y');
    assert.ok(Math.abs(b.min.y)<EPS,meta.id+' sits on its floor anchor');
    assert.ok(b.min.x>=-meta.footprint.w/2-EPS&&b.max.x<=meta.footprint.w/2+EPS,meta.id+' width');
    assert.ok(b.min.z>=-meta.footprint.d/2-EPS&&b.max.z<=meta.footprint.d/2+EPS,meta.id+' depth');
    assert.ok(b.max.y<=meta.height+EPS&&b.max.y>1.3,meta.id+' height');
    assert.ok(meta.height<=2.1&&meta.footprint.w<=1.6&&meta.footprint.d<=1.2);
    assert.ok(drawn.length<=20&&drawn.length===g.userData.stats.meshCount);
    g.traverse(o=>assert.ok(!o.isLight,'models use emissive surfaces, not new scene lights'));
    for(const mesh of drawn){
      assert.ok(mesh.geometry.attributes.position.count>0);
      if(mesh.isInstancedMesh){
        count+=mesh.count;
        for(let i=0;i<mesh.count;i++){
          mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));
          matrix.decompose(position,rotation,scale);
          assert.ok(Math.min(scale.x,scale.y,scale.z)>0,meta.id+' has no flat/inverted box');
        }
      }else{count++;assert.equal(mesh.geometry.type,'BoxGeometry');}
    }
    assert.equal(count,g.userData.stats.boxCount);
    assert.ok(count<2500&&count>300,meta.id+' uses bounded detailed geometry');
    g.userData.dispose();
  }
  assert.throws(()=>buildRewardProp('unregistered-furniture'),RangeError);
});

test('all animation phases stay inside the blueprint at every15-degree rotation',()=>{
  for(const meta of REWARD_PROPS){
    const g=buildRewardProp(meta.id),initialMeshes=meshes(g).length;
    for(let phase=0;phase<32;phase++){
      g.userData.tick(phase*.213);
      for(let degree=0;degree<360;degree+=15){
        const a=degree*Math.PI/180;g.rotation.y=a;const b=box(g);
        const halfX=(Math.abs(Math.cos(a))*meta.footprint.w+Math.abs(Math.sin(a))*meta.footprint.d)/2;
        const halfZ=(Math.abs(Math.sin(a))*meta.footprint.w+Math.abs(Math.cos(a))*meta.footprint.d)/2;
        assert.ok(b.min.x>=-halfX-EPS&&b.max.x<=halfX+EPS,meta.id+' rotated width');
        assert.ok(b.min.z>=-halfZ-EPS&&b.max.z<=halfZ+EPS,meta.id+' rotated depth');
        assert.ok(b.min.y>=-EPS&&b.max.y<=meta.height+EPS,meta.id+' animated height');
        assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));
      }
    }
    assert.equal(meshes(g).length,initialMeshes,'animation never creates another mesh');
    g.userData.dispose();
  }
});

test('animation is deterministic, can be stopped, and rejects invalid clocks without NaN transforms',()=>{
  for(const meta of REWARD_PROPS){
    const g=buildRewardProp(meta.id),other=buildRewardProp(meta.id);
    g.userData.tick(.1);const a=snapshot(g);g.userData.tick(1.7);const b=snapshot(g);
    assert.notDeepEqual(a,b,meta.id+' has a visible animated transform');
    other.userData.tick(1.7);assert.deepEqual(snapshot(other),b,'same absolute time gives the same pose');
    g.userData.tick(NaN);assert.ok(snapshot(g).every(Number.isFinite));
    g.userData.tick(Infinity);assert.ok(snapshot(g).every(Number.isFinite));
    const still=buildRewardProp(meta.id,{animate:false}),s=snapshot(still);
    still.userData.tick(14);assert.deepEqual(snapshot(still),s);
    g.userData.dispose();other.userData.dispose();still.userData.dispose();
  }
});

test('disposing one model releases each owned material/glass geometry once and preserves shared voxel geometry',()=>{
  for(const meta of REWARD_PROPS){
    const g=buildRewardProp(meta.id),other=buildRewardProp(meta.id),materials=new Set(),glass=new Set(),shared=new Set();
    for(const m of meshes(g)){materials.add(m.material);(m.isInstancedMesh?shared:glass).add(m.geometry);}
    const materialCalls=new Map(),glassCalls=new Map(),instanceCalls=new Map();let sharedDisposals=0,otherDisposals=0;
    for(const m of materials){materialCalls.set(m,0);m.addEventListener('dispose',()=>materialCalls.set(m,materialCalls.get(m)+1));}
    for(const geo of glass){glassCalls.set(geo,0);geo.addEventListener('dispose',()=>glassCalls.set(geo,glassCalls.get(geo)+1));}
    for(const mesh of meshes(g).filter(m=>m.isInstancedMesh)){instanceCalls.set(mesh,0);mesh.addEventListener('dispose',()=>instanceCalls.set(mesh,instanceCalls.get(mesh)+1));}
    const sharedListener=()=>sharedDisposals++;
    for(const geo of shared)geo.addEventListener('dispose',sharedListener);
    for(const m of new Set(meshes(other).map(m=>m.material)))m.addEventListener('dispose',()=>otherDisposals++);
    const before=snapshot(g);g.userData.dispose();g.userData.dispose();g.userData.tick(100);
    assert.deepEqual(snapshot(g),before,'disposed animation is inert');
    assert.ok([...materialCalls.values()].every(n=>n===1));
    assert.ok([...glassCalls.values()].every(n=>n===1));
    assert.ok([...instanceCalls.values()].every(n=>n===1),'instance attribute buffers are released once too');
    assert.equal(materials.size,g.userData.stats.materialCount);
    assert.equal(sharedDisposals,0,'the core kit owns the shared cube geometry');
    assert.equal(otherDisposals,0,'separate built instances own separate materials');
    for(const geo of shared)geo.removeEventListener('dispose',sharedListener);
    other.userData.dispose();
  }
});
