import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HOUSEHOLD_CATALOG, HOUSEHOLD_BY_ID } from "../src/content/household-catalog.js";
import { HOUSEHOLD_SIZES } from "../src/content/household-sizes.js";
import { measuredSurfaces, SMALL_PIECES } from "../src/content/placement.js";
import { householdProp, householdPropStats } from "../src/household-props.js";
import { riderSize, standsOn, ridersClash } from "../src/rules/surfaces.js";

test("every household catalogue item is a bounded native solid with matching placement metadata",()=>{
  assert.equal(HOUSEHOLD_CATALOG.length,36);
  assert.equal(new Set(HOUSEHOLD_CATALOG.map(item=>item.id)).size,36);
  for(const item of HOUSEHOLD_CATALOG){
    const prop=householdProp(item.id),stats=householdPropStats(item.id);
    assert.equal(stats.native,true,item.id);assert.ok(stats.voxels>100,item.id);
    assert.ok(stats.triangles>0&&stats.triangles<25000,item.id);
    assert.equal(stats.width,item.width);assert.equal(stats.height,item.height);assert.equal(stats.depth,item.depth);
    assert.equal(prop.userData.anchor,item.wall?"wall-bottom-centre":"floor-centre");
    assert.equal(item.small,SMALL_PIECES.includes(item.id));
    const box=HOUSEHOLD_SIZES[item.id].box;
    assert.deepEqual(box,[-item.width/2,item.width/2,item.wall?0:-item.depth/2,item.wall?item.depth:item.depth/2,item.height]);
    let meshes=0;
    prop.traverse(mesh=>{
      if(!mesh.isMesh)return;meshes++;
      for(const name of ["position","normal"]){
        const attribute=mesh.geometry.getAttribute(name);
        assert.ok(attribute,item.id+" "+name);
        assert.ok(attribute.array.every(Number.isFinite),item.id+" finite "+name);
      }
      assert.ok(mesh.geometry.userData.shared,item.id+" geometry is cached");
    });
    assert.ok(meshes<=3,item.id+" does not create one mesh per voxel");
    prop.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(prop),epsilon=.03;
    assert.ok(bounds.min.y>=-epsilon,item.id+" rests on its base");
    assert.ok(bounds.max.y<=item.height+epsilon,item.id+" fits vertical collision envelope");
    assert.ok(bounds.min.x>=-item.width/2-epsilon&&bounds.max.x<=item.width/2+epsilon,item.id+" fits width");
    assert.ok(bounds.min.z>=box[2]-epsilon&&bounds.max.z<=box[3]+epsilon,item.id+" fits depth");
  }
});

test("all declared host tops stay inside their model and remain available to tiny objects",()=>{
  const hosts=["household-floating-shelf","household-washing-machine","household-dryer","household-piano"];
  for(const id of hosts){
    const item=HOUSEHOLD_BY_ID[id],surfaces=measuredSurfaces(id,item.width,item.depth,item.wall);
    assert.equal(surfaces.length,HOUSEHOLD_SIZES[id].tops.length,id);
    for(const top of surfaces){
      assert.ok(top.x>=0&&top.x+top.w<=item.width+.001,id+" across host");
      assert.ok(top.z>=0&&top.z+top.d<=item.depth+.001,id+" depth on host");
      assert.ok(top.y>0&&top.y<=item.height,id+" not above model");
      assert.ok(top.w>=.3&&top.d>=.275,id+" takes at least a mug or figure");
    }
  }
  assert.ok(SMALL_PIECES.includes("household-laptop"));
  assert.ok(SMALL_PIECES.includes("household-cream-mug"));
  assert.ok(!SMALL_PIECES.includes("household-toilet"));
  assert.deepEqual(riderSize("household-cream-mug"),{w:.325,d:.3,h:.35});
  const shelf=measuredSurfaces("household-floating-shelf",1.4,.4,true)[0];
  assert.ok(standsOn(shelf,"household-cream-mug",.4,.2,0));
  assert.ok(standsOn(shelf,"household-cat-figure",.8,.2,15));
  assert.equal(ridersClash({id:"household-cream-mug",x:.4,z:.2,rotation:0},{id:"household-cat-figure",x:.8,z:.2,rotation:15}),false,"tiny props use their real size, not the old fallback envelope");
});

test("television channels animate independently and respect saved on/off state",()=>{
  const piece={media:{on:false,channel:0}},tv=householdProp("household-television",{piece});
  const screen=tv.getObjectByName("household-animated-screen");
  tv.userData.tick(0);const off=screen.instanceColor.array.slice();
  tv.userData.tick(2);assert.deepEqual(screen.instanceColor.array,off);
  piece.media.on=true;tv.userData.tick(2);const ghost=screen.instanceColor.array.slice();
  assert.notDeepEqual(ghost,off);
  tv.userData.tick(3);assert.notDeepEqual(screen.instanceColor.array,ghost);
  piece.media.channel=1;tv.userData.tick(3);const pumpkin=screen.instanceColor.array.slice();
  assert.equal(screen.userData.channel,1);assert.notDeepEqual(pumpkin,ghost);
  piece.media.channel=2;tv.userData.tick(3);assert.notDeepEqual(screen.instanceColor.array,pumpkin);
  const other=householdProp("household-television",{piece:{media:{on:false,channel:0}}});
  assert.deepEqual(other.getObjectByName("household-animated-screen").instanceColor.array,off);
  assert.equal(tv.children[0].geometry,other.children[0].geometry,"cabinet geometry is shared");
});

test("laptop and laundry animations follow the actual placed piece",()=>{
  const piece={media:{on:false,channel:0}},laptop=householdProp("household-laptop",{piece});
  const screen=laptop.getObjectByName("household-animated-screen");
  const off=screen.instanceColor.array.slice();piece.media.on=true;laptop.userData.tick(1);
  assert.notDeepEqual(screen.instanceColor.array,off);
  const washing=householdProp("household-washing-machine",{piece}),drum=washing.getObjectByName("household-laundry-drum");
  washing.userData.tick(1);const angle=drum.rotation.z;
  washing.userData.tick(2);assert.notEqual(drum.rotation.z,angle);
  piece.media.on=false;washing.userData.tick(3);assert.equal(drum.rotation.z,0);
});
