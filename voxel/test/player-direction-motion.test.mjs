import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerControl } from '../src/player-control.js';
import { freshState } from '../src/model.js';
import { directionFromAngle, gaitPhase } from '../src/directional-sprite-math.js';

function setup(){
 const state=freshState(),scene=new THREE.Scene(),actor=new THREE.Group(),shown=[];
 actor.add(new THREE.Group());actor.position.set(15,0,16);actor.userData.playerAnimate=options=>shown.push(options);
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(15,25,40);camera.lookAt(15,0,16);camera.updateMatrixWorld();
 const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
 const player=createPlayerControl({scene,state,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}});
 player.setEnabled(true,'natalie');
 return {state,actor,camera,player,shown};
}

test('directional footfalls follow actual distance and stop at a fence',()=>{
 const previous=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try{
  const {player,shown}=setup();let distance=0,time=0,before=player.state().position;
  for(let i=0;i<20;i++){
   player.input(.4,.4);player.update(.05,time+=.05);const after=player.state().position;
   distance+=Math.hypot(after.x-before.x,after.z-before.z);before=after;
   assert.ok(Math.abs(shown.at(-1).phase-gaitPhase(distance,1.8))<1e-9);
  }
  assert.equal(directionFromAngle(shown.at(-1).angle),'frontRight');
  player.teleport(38.7,16);player.input(1,0);
  for(let i=0;i<25;i++)player.update(.05,time+=.05);
  const phase=shown.at(-1).phase;
  assert.equal(shown.at(-1).walking,false,'the feet do not skate while pushing into the fence');
  for(let i=0;i<10;i++)player.update(.05,time+=.05);
  assert.ok(Math.abs(shown.at(-1).phase-phase)<1e-8,'only subpixel velocity settling remains');
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('turning the camera changes the authored view without restarting the foot cycle',()=>{
 const previous=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try{
  const {player,camera,shown}=setup();player.input(1,0);
  for(let i=0;i<8;i++)player.update(.05,i*.05);
  assert.equal(directionFromAngle(shown.at(-1).angle),'right');
  const phase=shown.at(-1).phase;
  camera.position.set(15,25,-8);camera.lookAt(15,0,16);camera.updateMatrixWorld();
  player.input(0,0);player.update(0,.4);
  assert.equal(directionFromAngle(shown.at(-1).angle),'left');
  assert.equal(shown.at(-1).phase,phase);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
