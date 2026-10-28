import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { buildHollowExterior, hollowExteriorSpec } from "../src/hollow-exterior.js";

const states=[["derelict",1],["restoring",1],...Array.from({length:5},(_,i)=>["ready",i+1])];
function inspect(group) {
  let boxes=0,lights=0,batches=0;
  const m=new THREE.Matrix4(),colour=new THREE.Color(),hash=createHash("sha256");
  group.traverse(object=>{
    if(object.isLight)lights++;
    if(!object.isInstancedMesh)return;
    batches++;boxes+=object.count;
    for(let i=0;i<object.count;i++){
      object.getMatrixAt(i,m);object.getColorAt(i,colour);
      assert.ok(m.elements.every(Number.isFinite));assert.ok(m.determinant()>0);
      hash.update(JSON.stringify([m.elements,colour.toArray()]));
    }
  });
  group.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(group),epsilon=.00001;
  assert.ok(b.min.x>=-4-epsilon&&b.max.x<=4+epsilon);
  assert.ok(b.min.z>=-2.5-epsilon&&b.max.z<=2.5+epsilon);
  assert.ok(b.min.y>=-.041&&b.max.y<=8);
  assert.ok(boxes>1500&&boxes<10000);assert.equal(lights,0);assert.ok(batches<=2);
  assert.equal(boxes,group.userData.exteriorBudget.boxes);
  return{boxes,hash:hash.digest("hex"),height:b.max.y};
}

test("the abandoned house, worksite and five restored stages stay native, bounded and distinct",()=>{
  const signatures=[],counts=[];
  for(const [status,tier]of states){
    const first=inspect(buildHollowExterior(status,tier)),second=inspect(buildHollowExterior(status,tier));
    assert.equal(first.hash,second.hash,"the same save must produce the same model");
    signatures.push(first.hash);counts.push(first.boxes);
  }
  assert.equal(new Set(signatures).size,7,"every upgrade must change the actual model");
  for(let i=3;i<counts.length;i++)assert.ok(counts[i]>counts[i-1]);
});

test("all walls and roof stay closed behind the masonry, boards and worn slates",()=>{
  const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,-1,0),hit=(group,origin,direction,nearFace=6.3)=>{
    ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction));
    const intersections=ray.intersectObject(group,true);
    assert.ok(intersections.length&&intersections[0].distance<nearFace,`unsealed near exterior at ${origin}`);
  };
  for(const [status,tier]of states){
    const group=buildHollowExterior(status,tier);group.updateMatrixWorld(true);
    for(const y of[.5,1.8,3.6])for(const x of[-3.1,-1.4,0,1.4,3.1]){
      hit(group,[x,y,8],[0,0,-1]);hit(group,[x,y,-8],[0,0,1]);
    }
    for(const y of[.5,1.8,3.6])for(const z of[-1.5,0,1.5]){
      hit(group,[-8,y,z],[1,0,0],5);hit(group,[8,y,z],[-1,0,0],5);
    }
    for(const x of[-3.1,-1.4,0,1.4,3.1])for(const z of[-1.7,0,1.7])hit(group,[x,9,z],up.toArray(),5.6);
  }
});

test("state objects and legacy aliases keep the tier, doorway and front animation anchors",()=>{
  assert.deepEqual(hollowExteriorSpec({status:"ready",tier:5}),hollowExteriorSpec("ready",5));
  assert.equal(hollowExteriorSpec(null,Infinity).appearance,"derelict");
  assert.equal(hollowExteriorSpec("ready",NaN).tier,1);
  for(const alias of["ready","open","closed","restored"]){
    const group=buildHollowExterior({status:alias,tier:5}),data=group.userData;
    assert.equal(data.tier,5);assert.equal(data.appearance,"tier-5");
    assert.deepEqual(data.door,{x:0,y:1.3,z:2.4});assert.deepEqual(data.footprint,{w:8,d:5});
    assert.equal(data.exteriorSockets.windows.length,2);assert.equal(data.exteriorSockets.shutters.length,4);
    for(const w of data.exteriorSockets.windows){assert.equal(w.face,"front");assert.ok(w.z>2.13&&w.z<2.3);}
  }
});

test("high-tier dormer glass is visible in front of the slates",()=>{
  const ray=new THREE.Raycaster();
  for(const tier of[4,5]){
    const group=buildHollowExterior("ready",tier);group.updateMatrixWorld(true);
    const h=hollowExteriorSpec("ready",tier).wallHeight;
    for(const [x,z]of[[-1.52,1.03],[1.52,1.03],...(tier===5?[[0,.10]]:[])]){
      const eye=h+(2.32-z)*.67+.02+.55;
      ray.set(new THREE.Vector3(x+.13,eye,3),new THREE.Vector3(0,0,-1));
      const first=ray.intersectObject(group,true)[0];
      assert.ok(first?.object.material.isMeshBasicMaterial,`dormer glass buried at tier ${tier}, x ${x}`);
    }
  }
});
