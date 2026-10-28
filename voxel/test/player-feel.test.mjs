import test from 'node:test';
import assert from 'node:assert/strict';
import { playerVelocityStep, choosePlayerTarget, playerOrbitStep } from '../src/player-control.js';
const integrate=(hz)=>{let v={x:0,z:0},x=0,z=0;for(let n=0;n<hz;n++){const s=playerVelocityStep(v,{x:3.3,z:0},1/hz);v=s;x+=s.dx;z+=s.dz;}return{x,z,v};};
test('smooth acceleration has the same travelled distance at30,60and120Hz',()=>{const a=integrate(30),b=integrate(60),c=integrate(120);assert.ok(Math.abs(a.x-b.x)<1e-9);assert.ok(Math.abs(c.x-b.x)<1e-9);assert.ok(a.x>3&&a.x<3.3);});
test('release eases to rest without crossing or reversing the desired direction',()=>{let v={x:3.3,z:0},distance=0;for(let i=0;i<120;i++){const step=playerVelocityStep(v,{x:0,z:0},1/60);assert.ok(step.x>=0);distance+=step.dx;v=step;}assert.ok(distance>.1&&distance<.2);assert.ok(v.x<1e-12);});
test('facing and small hysteresis keep one nearby target stable',()=>{const a={type:'plot',index:0,x:0,z:1},b={type:'plot',index:1,x:0,z:-1};assert.equal(choosePlayerTarget([a,b],{x:0,z:0},{x:0,z:1},null).index,0);assert.equal(choosePlayerTarget([a,b],{x:0,z:0},{x:0,z:-1},null).index,1);const next=choosePlayerTarget([{...a,z:1.12},b],{x:0,z:0},{x:1,z:0},a);assert.equal(next.index,0);});
test('targeting refuses distant items rather than selecting through the world',()=>{assert.equal(choosePlayerTarget([{type:'plot',index:0,x:8,z:8}],{x:0,z:0},{x:1,z:0},null),null);});
test('farm camera wraps a genuine full yaw and bounds its usable pitch',()=>{let p={yaw:0,pitch:.6};for(let i=0;i<300;i++)p=playerOrbitStep(p,1,1,.1);assert.ok(p.yaw>=-Math.PI&&p.yaw<=Math.PI);assert.ok(Math.abs(p.yaw)>.1);assert.equal(p.pitch,Math.PI*66/180);for(let i=0;i<50;i++)p=playerOrbitStep(p,0,-1,.1);assert.equal(p.pitch,Math.PI*22/180);});
test('room orbit remains inside the cutaway viewing angles',()=>{let p={yaw:0,pitch:.6};for(let i=0;i<30;i++)p=playerOrbitStep(p,1,0,.1,true);assert.equal(p.yaw,.9);for(let i=0;i<60;i++)p=playerOrbitStep(p,-1,0,.1,true);assert.equal(p.yaw,-.9);});

test('watering presents a real enlarged can and its live nozzle on the captured target',async()=>{
 const THREE=await import('three'),{createPlayerControl}=await import('../src/player-control.js'),{freshState}=await import('../src/model.js');
 const original=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try {
  const s=freshState(),scene=new THREE.Scene(),actor=new THREE.Group(),lean=new THREE.Group();actor.add(lean);actor.position.set(15,0,16);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(15,25,40);camera.lookAt(15,0,16);camera.updateMatrixWorld();
  const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
  const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}});
  player.setEnabled(true,'natalie');const target={type:'plot',index:1,x:16.2,z:16.3};
  assert.equal(player.act('water',1.1,target),true);player.update(.2,.2);
  const p=player.state();assert.equal(p.canVisible,true);assert.equal(p.dropsVisible,true);assert.equal(p.canScale,1.65);assert.deepEqual(p.actionTarget,target);assert.ok(Number.isFinite(p.waterNozzle.x)&&p.waterNozzle.y>.5);assert.ok(Math.hypot(p.waterNozzle.x-p.position.x,p.waterNozzle.z-p.position.z)>.7);
  player.cancelAction();assert.equal(player.state().canVisible,false);assert.equal(player.state().dropsVisible,false);
 } finally {if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
