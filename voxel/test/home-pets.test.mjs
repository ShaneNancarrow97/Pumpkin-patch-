import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { homePetRooms, petCellFree, petRoute } from "../src/rules/home-pets.js";
import { PET_FURNISHINGS, PET_FURNISHING_SIZES } from "../src/content/pet-furnishings.js";
import { buildPetFurnishing, petFurnishingStats } from "../src/pet-furnishings.js";

test("pets move to bedroom and kitchen as they open, or follow their own placed bed",()=>{
  const s={house:{level:0,placed:[]}};
  assert.deepEqual(homePetRooms(s),{skyla:"parlour",sandy:"parlour",maisie:"parlour"});
  s.house.level=2;
  assert.deepEqual(homePetRooms(s),{skyla:"parlour",sandy:"bedroom",maisie:"kitchen"});
  s.house.placed=[{id:"moon-cat-bed",room:"bedroom"},{id:"harvest-dog-bed",room:"parlour"},{id:"harvest-dog-bed",room:"bedroom"}];
  assert.deepEqual(homePetRooms(s),{skyla:"bedroom",sandy:"parlour",maisie:"bedroom"});
  s.house.level=0;
  assert.deepEqual(homePetRooms(s),{skyla:"parlour",sandy:"parlour",maisie:"parlour"});
});
test("a route goes round a chair and stays inside room walls",()=>{
  const layout={w:8,d:6},obstacles=[{x0:3,z0:0,x1:5,z1:4}],start={x:1,z:1},end={x:7,z:1};
  const path=petRoute(start,end,layout,obstacles);
  assert.ok(path.length>12);
  for(let i=0;i<path.length;i++){
    assert.ok(petCellFree(path[i],layout,obstacles));
    if(i)assert.ok(Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z)<=.501);
  }
  assert.ok(Math.hypot(path.at(-1).x-end.x,path.at(-1).z-end.z)<.5);
});
test("blocked destinations use reachable cells and impossible rooms return no route",()=>{
  const layout={w:4,d:4},wall=[{x0:1.6,z0:0,x1:2.4,z1:4}];
  const path=petRoute({x:.5,z:1},{x:3.5,z:1},layout,wall);
  assert.ok(path.length);assert.ok(path.every(p=>p.x<1.6));
  assert.deepEqual(petRoute({x:0,z:0},{x:1,z:1},layout,[{x0:0,z0:0,x1:4,z1:4}]),[]);
  assert.deepEqual(petRoute({x:NaN,z:0},{x:1,z:1},layout),[]);
});
test("all companion furnishings are finite native voxel models matching measured placement bounds",()=>{
  for(const item of PET_FURNISHINGS){
    const m=buildPetFurnishing(item.id),stats=petFurnishingStats(item.id),box=new THREE.Box3().setFromObject(m),[x0,x1,z0,z1,h]=PET_FURNISHING_SIZES[item.id].box;
    assert.equal(m.userData.native,true);assert.ok(stats.triangles>0&&stats.triangles<9000);
    for(const [actual,expected] of [[box.min.x,x0],[box.max.x,x1],[box.min.z,z0],[box.max.z,z1],[box.max.y,h]])assert.ok(Math.abs(actual-expected)<.001,item.id);
    m.traverse(n=>{if(n.isMesh)for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});
  }
  assert.equal(buildPetFurnishing("absent"),null);
});
