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

test('watering presents an illustrated can and its live nozzle on the captured target',async()=>{
 const THREE=await import('three'),{createPlayerControl}=await import('../src/player-control.js'),{freshState}=await import('../src/model.js');
 const original=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try {
  const s=freshState(),scene=new THREE.Scene(),actor=new THREE.Group(),lean=new THREE.Group();actor.add(lean);actor.position.set(15,0,16);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(15,25,40);camera.lookAt(15,0,16);camera.updateMatrixWorld();
  const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
  const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}});
  player.setEnabled(true,'natalie');const target={type:'plot',index:1,x:16.2,z:16.3};
  assert.equal(player.act('water',1.1,target),true);player.update(.2,.2);
  const p=player.state();assert.equal(p.canVisible,true);assert.equal(p.dropsVisible,true);assert.equal(p.canScale,1);assert.equal(p.waterCanStyle,"sprite");assert.ok(p.waterCanWidth<.9);assert.deepEqual(p.actionTarget,target);assert.ok(Number.isFinite(p.waterNozzle.x)&&p.waterNozzle.y>.5);assert.ok(Math.hypot(p.waterNozzle.x-p.position.x,p.waterNozzle.z-p.position.z)>.7);
  player.cancelAction();assert.equal(player.state().canVisible,false);assert.equal(player.state().dropsVisible,false);
 } finally {if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test("seating and pet prompts honour their shorter local interaction sockets",()=>{const target={type:"pet",id:"skyla",x:0,z:1.6,range:1.35};assert.equal(choosePlayerTarget([target],{x:0,z:0},{x:0,z:1},null),null);assert.equal(choosePlayerTarget([target],{x:0,z:.4},{x:0,z:1},null).id,"skyla");});

test("a turned owner settles back to the front sprite after standing still, but not while paused", async () => {
 const THREE=await import('three'),{createPlayerControl}=await import('../src/player-control.js'),{freshState}=await import('../src/model.js');
 const original=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try {
  const s=freshState(),scene=new THREE.Scene(),actor=new THREE.Group(),lean=new THREE.Group(),shown=[];actor.add(lean);actor.position.set(15,0,16);
  actor.userData.playerAnimate=o=>shown.push(o.facing);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(15,25,40);camera.lookAt(15,0,16);camera.updateMatrixWorld();
  const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
  const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}});
  player.setEnabled(true,'natalie');let t=0;const run=(x,n)=>{for(let i=0;i<n;i++){player.input(x,0);player.update(.05,t+=.05);}};
  run(1,8);assert.equal(shown.at(-1),'side','walking across the screen shows the side turnaround');
  run(0,6);assert.equal(shown.at(-1),'side','a short stop keeps the side');assert.equal(player.state().facing,'side');
  run(0,20);assert.equal(shown.at(-1),'front','standing still settles to the front idle');assert.equal(player.state().facing,'side','the aim keeps its heading');
  run(1,8);s.paused=true;run(0,30);assert.equal(shown.at(-1),'side','a paused owner does not turn');
  s.paused=false;run(0,20);assert.equal(shown.at(-1),'front');
  player.teleport(38,16);run(1,40);assert.equal(shown.at(-1),'side','pushing against the fence keeps facing it');assert.ok(player.state().position.x<=38.75+1e-9,'and stops at it');
 } finally {if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test("walking into the hedge arch goes through once; arriving in a doorway's strip, the owner must step out before it opens", async () => {
 const THREE=await import('three'),{createPlayerControl}=await import('../src/player-control.js'),{freshState}=await import('../src/model.js');
 const original=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try {
  const s=freshState(),scene=new THREE.Scene(),actor=new THREE.Group();actor.add(new THREE.Group());actor.position.set(20,0,6);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(20,25,30);camera.lookAt(20,0,6);camera.updateMatrixWorld();
  const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}},seen=[];
  let accept=false;
  const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){},onWay:(w)=>{seen.push(w.id);return accept;}});
  player.setEnabled(true,'natalie');let t=0;const run=(y,n)=>{for(let i=0;i<n;i++){player.input(0,y);player.update(.05,t+=.05);}return player.state();};
  let st=run(-1,60);assert.ok(seen.length>0&&seen.every((id)=>id==='arch'),'the arch is offered');assert.equal(st.passing,null,'refused, so no passing');
  accept=true;seen.length=0;st=run(-1,10);assert.deepEqual(seen,['arch'],'taken once');assert.equal(st.passing,'arch');
  const held=st.position;st=run(-1,20);assert.deepEqual(st.position,held,'holds still while passing');assert.deepEqual(seen,['arch']);
  player.arrive({place:'farm',x:20,z:4.3,face:{x:0,z:-1}});assert.equal(player.state().passing,null);
  run(-1,20);assert.deepEqual(seen,['arch'],'arrived in the strip, so it stays shut');
  run(1,12);run(-1,40);assert.deepEqual(seen,['arch','arch'],'stepping out opens it again');
 } finally {if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test("a walk to something solid ends beside it and does what it was for", async () => {
 const THREE=await import('three'),{createPlayerControl}=await import('../src/player-control.js'),{freshState}=await import('../src/model.js');
 const original=globalThis.document;globalThis.document={body:{classList:{contains:()=>false}}};
 try {
  const s=freshState(),scene=new THREE.Scene(),actor=new THREE.Group();actor.add(new THREE.Group());actor.position.set(12,0,23);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,100);camera.position.set(10,25,40);camera.lookAt(10,0,18);camera.updateMatrixWorld();
  const places={setControlled(){},playerActor(){return null;},clearPlayerRest(){}};
  const player=createPlayerControl({scene,state:s,actors:()=>({natalie:{model:actor}}),places,getPlace:()=>null,getCamera:()=>camera,animate(){}});
  player.setEnabled(true,'natalie');let t=0,done=0;
  // The big pumpkin is solid: the owner stops against it, then the walk's job runs.
  const {BIG_PUMPKIN}=await import('../src/world.js');
  assert.ok(player.walkTo({x:BIG_PUMPKIN.x,z:BIG_PUMPKIN.z,reach:Math.hypot(3.4,3.2)/2+.7,then:()=>{done++;}}));
  for(let i=0;i<200&&player.state().travelling;i++){player.update(.05,t+=.05);await Promise.resolve();}
  await Promise.resolve();
  assert.equal(player.state().travelling,false);assert.equal(done,1,'arrived and acted once');
  assert.ok(Math.hypot(player.state().position.x-BIG_PUMPKIN.x,player.state().position.z-BIG_PUMPKIN.z)<=Math.hypot(3.4,3.2)/2+.7,'beside it');
 } finally {if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
