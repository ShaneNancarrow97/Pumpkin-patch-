import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { KITCHEN_EQUIPMENT, KITCHEN_CAPABILITIES } from "../src/content/kitchen-equipment.js";
import { KITCHEN_EQUIPMENT_SIZES } from "../src/content/kitchen-equipment-sizes.js";
import { kitchenProp, kitchenPropStats } from "../src/kitchen-props.js";
import * as H from "../src/rules/house.js";

test("six useful kitchen models are native, fully dimensional and cached safely", () => {
  assert.equal(new Set(KITCHEN_EQUIPMENT.map(i => i.id)).size, 6);
  for (const item of KITCHEN_EQUIPMENT) {
    const first=kitchenProp(item.id),second=kitchenProp(item.id),stats=kitchenPropStats(item.id);
    assert.notEqual(first,second,"each placed piece has independent transforms");
    assert.equal(first.userData.native,true);
    assert.equal(first.userData.mount,item.wall?"wall":"floor");
    assert.ok(stats.voxels>1000 && stats.triangles>1000 && stats.triangles<15000,item.id+" keeps a bounded detailed mesh");
    const a=[],b=[];first.traverse(m=>{if(m.isMesh)a.push(m);});second.traverse(m=>{if(m.isMesh)b.push(m);});
    assert.ok(a.length>=1 && a.length<=2,"solid and glow are batched");
    a.forEach((mesh,i)=>{
      assert.equal(mesh.geometry,b[i].geometry,"repeated room visits share cached geometry");
      assert.equal(mesh.geometry.userData.shared,true,"clearing a room cannot dispose another instance's geometry");
      assert.equal(mesh.material.map,null,"the tool is a voxel object, not a sprite standee");
      for(const n of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(n));
      mesh.geometry.computeBoundingBox();
      assert.ok(mesh.geometry.boundingBox.min.y>=0);
      if(item.wall)assert.ok(mesh.geometry.boundingBox.min.z>=0,"wall models sit entirely in front of their mounting plane");
    });
    const box=new THREE.Box3().setFromObject(first),stored=KITCHEN_EQUIPMENT_SIZES[item.id].box;
    [box.min.x,box.max.x,box.min.z,box.max.z,box.max.y].forEach((n,i)=>assert.ok(Math.abs(n-stored[i])<.001,"placement uses actual measured model bounds"));
    assert.ok(box.max.x-box.min.x<=H.footprint(item.id).w+.001);
    if(!item.wall)assert.ok(box.max.z-box.min.z<=H.footprint(item.id).d+.001);
    assert.ok(box.max.y<=1.7,"starter equipment fits the cast's working height");
    assert.ok(KITCHEN_CAPABILITIES[item.id].length>0);
  }
});

test("new kitchen equipment uses the normal house storage, rotation and side-wall placement", () => {
  for(const item of KITCHEN_EQUIPMENT){
    const s={coins:item.price-1,paused:false,house:H.freshHouse()};s.house.level=2;
    assert.equal(H.buyDecor(s,item.id),false,"an unaffordable tool grants no ownership");
    s.coins=item.price;assert.equal(H.buyDecor(s,item.id),true);assert.equal(s.coins,0);
    assert.equal(H.buyDecor(s,item.id),false,"purchasing twice cannot debit twice");
    const instance=H.placeDecor(s,item.id,"kitchen");assert.ok(instance,item.id+" fits an empty kitchen");
    const p=s.house.placed.find(p=>p.instance===instance);
    if(item.wall){
      assert.equal(H.setDecorWall(s,instance,"left"),false,"the kitchen's fixed jar shelves keep their reserved side-wall space");
      assert.equal(H.fits(s,"kitchen",item.id,p.x,p.z,instance),true);
      assert.equal(H.sendToRoom(s,instance,"bedroom"),true);
      assert.equal(H.setDecorWall(s,instance,"left"),true,"a free side wall uses the same ordinary hanging controls");
      assert.equal(p.wall,"left");
    }else{
      assert.equal(H.moveDecor(s,instance,3,3),true);
      assert.equal(H.rotateDecor(s,instance,45),true);
      assert.equal(H.fits(s,"kitchen",item.id,p.x,p.z,instance),true);
      const range=H.placementRange(s,p);
      assert.ok(H.moveDecor(s,instance,range.x0,range.z0),"a rotated tool reaches the measured back corner");
      assert.equal(H.moveDecor(s,instance,-10,-10),false,"placement still rejects leaving the room");
    }
    const saved=H.restoreHouse(JSON.parse(JSON.stringify(s.house)));
    assert.deepEqual(saved.placed.find(p=>p.instance===instance),p,"native equipment survives a normal house restore");
    assert.equal(H.removeDecor(s,instance),true);assert.ok(s.house.owned.includes(item.id));
    assert.ok(H.placeDecor(s,item.id,"kitchen"),"storing does not consume the purchase");
  }
});

test("a complete affordable kitchen can be furnished without crossing the doorway",()=>{
  const s={coins:10000,paused:false,house:H.freshHouse()};s.house.level=2;
  for(const item of KITCHEN_EQUIPMENT){assert.ok(H.buyDecor(s,item.id));assert.ok(H.placeDecor(s,item.id,"kitchen"),item.id);}
  const pieces=H.roomPieces(s,"kitchen");assert.equal(pieces.length,6);
  for(const p of pieces)assert.ok(H.fits(s,"kitchen",p.id,p.x,p.z,p.instance));
  assert.deepEqual(KITCHEN_CAPABILITIES["copper-range"],["hob","oven","tray","pot","pan"],"existing detailed range keeps its visible built-in cookware");
  assert.deepEqual(KITCHEN_CAPABILITIES["gothic-spice-cabinet"],["spice"]);
});
