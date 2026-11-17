import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HOME_FURNISHINGS } from "../src/content/home-furnishings.js";
import { HOME_FURNISHING_SIZES } from "../src/content/home-furnishing-sizes.js";
import { homeFurnishingProp, homeFurnishingStats } from "../src/home-furnishings.js";
import * as H from "../src/rules/house.js";

test("living-home furniture has true bounded 3D models with matching collision bodies",()=>{
  for(const item of HOME_FURNISHINGS){
    const a=homeFurnishingProp(item.id),b=homeFurnishingProp(item.id),stats=homeFurnishingStats(item.id);
    assert.notEqual(a,b,"room copies keep independent transforms");
    assert.equal(a.userData.native,true);assert.equal(a.userData.mount,item.wall?"wall":"floor");
    const am=[],bm=[];a.traverse(m=>{if(m.isMesh)am.push(m);});b.traverse(m=>{if(m.isMesh)bm.push(m);});
    assert.ok(am.length>=1&&am.length<=2,"only a solid batch and optional glow batch");
    assert.ok(stats.triangles>100&&stats.triangles<18000,item.id+" stays within the detailed furniture budget");
    am.forEach((mesh,i)=>{
      assert.equal(mesh.geometry,bm[i].geometry);assert.equal(mesh.geometry.userData.shared,true);
      assert.equal(mesh.material.map,null,"native furniture has no standee texture");
      assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
      assert.ok([...mesh.geometry.attributes.normal.array].every(Number.isFinite));
    });
    const box=new THREE.Box3().setFromObject(a),size=box.getSize(new THREE.Vector3());
    assert.ok(size.x>0&&size.y>0&&size.z>0);assert.ok(box.min.y>=0);
    [box.min.x,box.max.x,box.min.z,box.max.z,box.max.y].forEach((n,i)=>assert.ok(Math.abs(n-HOME_FURNISHING_SIZES[item.id].box[i])<.001,item.id+" uses its actual body"));
    assert.ok(size.x<=H.footprint(item.id).w+.001);
    if(item.wall)assert.ok(box.min.z>=0,"wall models never poke through their mounting wall");
    else assert.ok(size.z<=H.footprint(item.id).d+.001);
  }
});

test("wardrobe interaction lives on affordable real furniture and survives storage and save",()=>{
  for(const id of ["costume-rack","moon-dressing-mirror"]){
    const item=H.decorById[id],s={paused:false,coins:item.price,house:H.freshHouse()};
    assert.equal(item.interaction,"wardrobe");assert.ok(item.price<=240);
    assert.equal(H.buyDecor(s,id),true);assert.equal(s.coins,0);assert.equal(H.buyDecor(s,id),false);
    const instance=H.placeDecor(s,id,"parlour");assert.ok(instance,"a new cottage can hold the wardrobe furniture");
    const piece=s.house.placed.find(p=>p.instance===instance);
    assert.equal(H.rotateDecor(s,instance,45),true,"controls can use arbitrary rotation");
    const range=H.placementRange(s,piece);assert.equal(H.moveDecor(s,instance,range.x0,range.z0),true,"rotated furniture reaches its measured back corner");
    assert.equal(H.moveDecor(s,instance,-10,-10),false);
    assert.deepEqual(H.restoreHouse(JSON.parse(JSON.stringify(s.house))).placed.find(p=>p.instance===instance),piece);
    assert.equal(H.removeDecor(s,instance),true);assert.ok(s.house.owned.includes(id));assert.ok(H.placeDecor(s,id,"parlour"));
  }
});

test("plant shelf can mount on a free side wall and all furnishings remain in the normal catalogue",()=>{
  const s={paused:false,coins:10000,house:H.freshHouse()};s.house.level=3;
  for(const item of HOME_FURNISHINGS)assert.ok(H.decorCatalog.some(x=>x.id===item.id));
  assert.equal(H.buyDecor(s,"hanging-herb-shelf"),true);
  const instance=H.placeDecor(s,"hanging-herb-shelf","bedroom");assert.ok(instance);
  assert.equal(H.setDecorWall(s,instance,"left"),true);
  const piece=s.house.placed.find(p=>p.instance===instance);assert.equal(piece.wall,"left");
  assert.equal(H.fits(s,"bedroom",piece.id,piece.x,piece.z,instance),true);
});
