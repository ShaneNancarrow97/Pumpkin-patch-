import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVillageProximity, proximityStrength, PROXIMITY_RING_LIMIT } from '../src/village-proximity.js';
import { addSpriteRim } from '../src/sprite-rim.js';

test('nearby glow fades smoothly and a fixed pool favours the nearest real targets', () => {
  assert.equal(proximityStrength(0),1);assert.equal(proximityStrength(7),0);assert.equal(proximityStrength(NaN),0);
  assert.ok(proximityStrength(3)>proximityStrength(6));
  const scene=new THREE.Scene(),fx=createVillageProximity(scene,()=>.2),targets=Array.from({length:40},(_,i)=>({id:'node-'+i,x:i*.12+.2,z:0}));
  fx.update({position:{x:0,z:0},targets,time:2});
  assert.equal(fx.status.rings.length,PROXIMITY_RING_LIMIT);assert.equal(fx.status.rings[0].id,'node-0');
  const group=scene.getObjectByName('Village nearby lights');assert.equal(group.children.length,PROXIMITY_RING_LIMIT+1);
  assert.equal(scene.children.filter(o=>o.isLight).length,0,'glow adds no light or shadow pass');
  fx.update({position:{x:80,z:80},targets});assert.equal(fx.status.rings.length,0);
  fx.update({position:{x:0,z:0},inside:true,targets});assert.equal(fx.status.rings.length,0,'indoor resources never bleed through a floor');
  fx.hide();assert.equal(fx.status.visible,false);fx.dispose();assert.equal(scene.children.length,0);
});

test('NPC rim preserves original alpha cutout and geometry without a second draw', () => {
  const material=new THREE.MeshStandardMaterial({alphaTest:.42});let previous=false;
  material.onBeforeCompile=()=>{previous=true;};addSpriteRim(material,1024,512);
  const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
  assert.equal(previous,true);assert.equal(material.alphaTest,.42);assert.equal(material.transparent,false);
  assert.equal(material.userData.villageRim.extraMeshes,0);assert.equal(material.userData.villageRim.extraLights,0);
  assert.ok(shader.fragmentShader.includes('#include <alphatest_fragment>'),'painted cutout remains authoritative');
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance += '));
  assert.deepEqual(shader.uniforms.villageRimTexel.value.toArray(),[1.35/1024,1.35/512]);
});
