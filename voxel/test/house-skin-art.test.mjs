import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildEstateHouse, disposeEstateObject } from "../src/house-estate-world.js";
import { ESTATE_HOUSE_SKINS, ESTATE_DEFAULT_FINISHES } from "../src/content/house-estate.js";

function inspect(group) {
  let batches=0, boxes=0; const matrix=new THREE.Matrix4(), bounds=new THREE.Box3();
  group.traverse(mesh=>{
    if(!mesh.isInstancedMesh)return;
    batches++;boxes+=mesh.count;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);const e=matrix.elements;
      assert.ok(e.every(Number.isFinite));assert.ok(matrix.determinant()>0,"skin boxes have finite positive volume");
      bounds.expandByPoint(new THREE.Vector3(e[12]-e[0]/2,e[13]-e[5]/2,e[14]-e[10]/2));
      bounds.expandByPoint(new THREE.Vector3(e[12]+e[0]/2,e[13]+e[5]/2,e[14]+e[10]/2));
    }
  });return{batches,boxes,bounds};
}

test("each spooky skin adds native reliefs while retaining the closed house reserve",()=>{
 for(const skin of ESTATE_HOUSE_SKINS){
  for(const level of new Set([skin.houseLevel,3])){
   const base=buildEstateHouse(level),house=buildEstateHouse(level,{...ESTATE_DEFAULT_FINISHES,...skin.finishes}),a=inspect(base),b=inspect(house);
   assert.equal(house.userData.skin,skin.id);assert.equal(house.userData.windowGlow,skin.windowGlow);
   assert.ok(house.userData.skinDetailCount>=60,skin.id+" has real ornaments");
   assert.ok(b.boxes>a.boxes);assert.equal(b.batches,2,"skins remain in two instanced batches");
   assert.ok(b.bounds.min.x>=-8&&b.bounds.max.x<=8);assert.ok(b.bounds.min.z>=-6&&b.bounds.max.z<=6);
   assert.ok(b.bounds.max.y<=house.userData.bounds.height+.01);
   // Emissive instance colour includes the selected skin's window colour.
   const target=new THREE.Color(skin.windowGlow),mesh=house.children.find(m=>m.material.isMeshBasicMaterial),c=new THREE.Color();let found=false;
   for(let i=0;i<mesh.count&&!found;i++){mesh.getColorAt(i,c);found=Math.abs(c.r-target.r)<1e-6&&Math.abs(c.g-target.g)<1e-6&&Math.abs(c.b-target.b)<1e-6;}
   assert.ok(found,skin.id+" has its own glowing windows");
   disposeEstateObject(base);disposeEstateObject(house);
  }
 }
});

test("ordinary exterior finishes keep the original house without skin reliefs",()=>{
 const house=buildEstateHouse(0,ESTATE_DEFAULT_FINISHES);
 assert.equal(house.userData.skin,null);assert.equal(house.userData.skinDetailCount,0);assert.equal(house.userData.windowGlow,0xffbb69);disposeEstateObject(house);
});
