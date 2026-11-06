import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildEstateHouse, disposeEstateObject } from "../src/house-estate-world.js";
import { createEntranceGlow } from "../src/entrance-glow.js";

test("all house tiers close mortar joints and roof gaps from exterior viewpoints", () => {
  for (let level = 0; level < 4; level++) {
    const house = buildEstateHouse(level), w = [6,8,9.5,11][level], d = [5,6,7,7.6][level], h = [3.8,6.4,7,7.8][level], rise = [2.5,2.8,3.1,3.4][level];
    house.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const [nx,nz,length] of [[0,1,w],[0,-1,w],[1,0,d],[-1,0,d]]) for (const u of [-length*.39,-.92,.92,length*.39]) {
      const x = nx ? nx*w/2 : u, z = nz ? nz*d/2 : u;
      // This height falls in a joint between the original brick courses.
      ray.set(new THREE.Vector3(x+nx*3,1.45,z+nz*3),new THREE.Vector3(-nx,0,-nz));
      const hit = ray.intersectObject(house,true)[0];
      assert.ok(hit && hit.distance < 3.3, `tier ${level}: sealed facade ${nx},${nz} at ${u}`);
    }
    for (const z of [-.78,-.42,.42,.78].map(k=>k*(d/2+.48))) for (const x of [-w*.33,.17,w*.31]) {
      ray.set(new THREE.Vector3(x,h+rise+4,z),new THREE.Vector3(0,-1,0));
      const hit = ray.intersectObject(house,true)[0], expected=h+rise*(1-Math.abs(z)/(d/2+.48));
      assert.ok(hit && hit.point.y > expected-.4,`tier ${level}: roof covered at ${x},${z}`);
    }
    disposeEstateObject(house);
  }
});
test("entrance outline respects occlusion, stays still with reduced motion and can hide while editing",()=>{
 const entrance=createEntranceGlow({reducedMotion:true});entrance.tick(0);const opacity=entrance.group.children[1].material.opacity;entrance.tick(20);
 assert.equal(entrance.group.children[1].material.opacity,opacity);
 for(const m of entrance.group.children){assert.equal(m.material.depthTest,true);assert.equal(m.material.depthWrite,false);assert.ok(m.geometry.attributes.position.count>0);}
 entrance.tick(21,false);assert.equal(entrance.group.visible,false);
});
