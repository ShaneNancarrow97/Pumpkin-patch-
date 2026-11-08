// Full offline game, one Chromium: owner controls, authored rows, home scale,
// legacy costumes/tools and the village neighbours' actual route simulation.
// node tools/directional-game-qa.mjs [game.html] [output-dir]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
import { findResidentPath } from '../src/rules/village-resident-life.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const filename=path.resolve(process.argv[2]??path.join(root,'dist/pumpkin-patch-voxel.html'));
const output=path.resolve(process.argv[3]??path.join(root,'docs/contractor-patches/directional-character-sheets/verification/game'));
await fs.mkdir(output,{recursive:true});
const html=await fs.readFile(filename),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixture=M.freshState();fixture.introSeen=true;fixture.paused=false;fixture.coins=50000;fixture.earned=M.LEVELS.at(-1).at;
fixture.progression.claimed=M.LEVELS.map((_,i)=>i+1);fixture.progression.pending=[];fixture.house.level=3;fixture.visitorTimer=fixture.shop.arrivalTimer=1e6;
M.recordHomeActivity(fixture,'visit');M.inviteToVillage(fixture);M.finishTour(fixture);M.finishTalk(fixture,'invitation','rowan');M.finishTalk(fixture,'invitation','elowen');
M.buyCostume(fixture,'shane-jason');
const report={date:new Date().toISOString(),html:path.basename(filename),sha256:sha(html),bytes:html.length,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:{},
 scope:'Identical standalone HTML bytes served on loopback. Declared high-level fixture opens rooms/village and owns Jason. Keyboard tests use actual browser key events. Eight-way sweep uses the real controller movement adapter with deterministic time steps. Pose captures call the actual in-world sprite adapter; they are labelled separately. Resident route checks accelerate the real presentation simulation. No physical Fold or Bluetooth hardware is claimed.',checks:[],screenshots:[],errors:[],externalRequests:[],owners:{},residents:[]};
for(const name of ['src/player-sprite-directions.js','src/player-control.js','src/village-game.js','src/directional-sprite-math.js','src/village-sprite-actors.js','src/village-folk.js','src/content/directional-sprite-meta.js'])report.sourceHashes[name]=sha(await fs.readFile(path.join(root,name)));
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,detail});console.log(`${pass?'PASS':'FAIL'} ${label}`);};
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const shot=async(name,kind='world')=>{await settle();await page.screenshot({path:path.join(output,name+'.png'),timeout:90000});report.screenshots.push({file:name+'.png',kind});console.log('SHOT '+name);};
const sample=()=>page.evaluate(()=>window.__directionQA.sample());
const begin=async who=>{
 await page.evaluate(who=>{const p=PumpkinVoxel;p.closeSheet();p.state().paused=false;p.playControls.start(who);p.scene.player.cancelAction();p.scene.player.cancelWalk();p.scene.player.teleport(20,18);p.scene.player.recenter();document.activeElement?.blur();},who);
 await settle();
};
async function keys(keys,frames=8){
 for(const key of keys)await page.keyboard.down(key);
 const samples=await page.evaluate(async frames=>{const out=[];for(let i=0;i<frames;i++){await new Promise(resolve=>requestAnimationFrame(resolve));out.push(window.__directionQA.sample());}return out;},frames);
 for(const key of keys)await page.keyboard.up(key);return samples;
}
async function poseShot(who,angle,name){
 await page.evaluate(()=>{const p=PumpkinVoxel;if(!p.scene.place){p.scene.player.teleport(20,9);p.scene.player.recenter();}});
 await page.evaluate(({who,angle})=>{const a=PumpkinVoxel.scene.player.figure();window.__directionQA.poseOriginal=a.userData.playerAnimate;window.__directionQA.poseActor=a;a.userData.playerAnimate=options=>window.__directionQA.poseOriginal({...options,who,outfit:who+'-base',angle,phase:.25,walking:true,moving:true,action:null,release:false});}, {who,angle});
 await shot(name,'scripted in-world pose, normal camera and rendering');
 await page.evaluate(()=>{const q=window.__directionQA;q.poseActor.userData.playerAnimate=q.poseOriginal;q.poseActor.userData.playerAnimate({walking:false,release:true});delete q.poseActor;delete q.poseOriginal;});
}

// Walk the owner over real collision-aware paths for the close-up. The mocked
// pad supplies normal analogue axes; only simulation time is accelerated.
async function residentShot(id,name){
 const start=await page.evaluate(id=>({owner:PumpkinVoxel.village.status.position,resident:PumpkinVoxel.scene.villageView.folk.diagnostics().find(p=>p.id===id)}),id);
 const candidates=[[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dz])=>({x:start.resident.x+dx,z:start.resident.z+dz}));
 const routes=candidates.map(to=>findResidentPath(fixture,start.owner,to)).filter(route=>route.length);
 if(!routes.length)throw new Error('No clear owner approach to '+id);
 const route=routes.sort((a,b)=>a.length-b.length)[0];
 const walked=await page.evaluate(route=>{
  const game=PumpkinVoxel.village,v=PumpkinVoxel.scene.villageView,pad={id:'QA standard gamepad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  const previous=Object.getOwnPropertyDescriptor(navigator,'getGamepads');Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
  let steps=0,stuck=0,last=game.status.position;
  try{for(const goal of route){for(let i=0;i<1600;i++){
   const p=game.status.position,dx=goal.x-p.x,dz=-(goal.z-p.z),distance=Math.hypot(dx,dz);if(distance<.2)break;
   const right=v.camera.position.clone().set(1,0,0).applyQuaternion(v.camera.quaternion);right.y=0;right.normalize();const forward=v.camera.getWorldDirection(v.camera.position.clone());forward.y=0;forward.normalize();
   const strength=Math.min(.8,distance/.3);pad.axes[0]=(dx*right.x+dz*right.z)/distance*strength;pad.axes[1]=-(dx*forward.x+dz*forward.z)/distance*strength;
   game.tick(.05);steps++;const now=game.status.position;stuck=Math.hypot(now.x-last.x,now.z-last.z)<.001?stuck+1:0;last=now;if(stuck>35)throw new Error('Owner approach blocked at '+JSON.stringify(now));
  }}pad.axes[0]=pad.axes[1]=0;game.tick(.05);return{steps,position:game.status.position};}
  finally{if(previous)Object.defineProperty(navigator,'getGamepads',previous);else delete navigator.getGamepads;}
 },route);
 report.checks.push({pass:true,label:id+': owner reaches a nearby clear spot through the village controller',detail:{source:'Mock standard pad with accelerated .05s steps, using the real collision/controller path',route,...walked}});
 await page.evaluate(()=>PumpkinVoxel.village.showPanel('map'));
 await page.locator('[data-vg-focus="tree"]:visible').evaluate(el=>el.click());
 const framed=await page.evaluate(id=>{
  const p=PumpkinVoxel,v=p.scene.villageView,resident=v.folk.people.get(id),owner=v.scene.children.find(o=>o.userData.playerAnimate),centre={x:(owner.position.x+resident.root.position.x)/2,y:Math.max(owner.position.y,resident.root.position.y),z:-(owner.position.z+resident.root.position.z)/2};
  // cameraActions takes realm coordinates (positive south-to-north z).
  v.cameraActions.place([centre.x+6,centre.y+7,centre.z-11],[centre.x,centre.y+1,centre.z]);
  for(let i=0;i<1000;i++){v.folk.tick(.1,1000+i*.1,v.camera,{paused:false,reducedMotion:false});if(resident.walking&&resident.root.userData.atlas==='directional')break;}
  v.camera.updateMatrixWorld(true);const project=o=>{const point=o.position.clone();point.y+=1.1;point.project(v.camera);return{x:point.x,y:point.y};};
  return{surveying:p.village.status.surveying,owner:project(owner),resident:project(resident.root),direction:resident.root.userData.direction,walking:resident.walking};
 },id);
 check(framed.surveying&&[framed.owner,framed.resident].every(p=>Math.abs(p.x)<.9&&Math.abs(p.y)<.9),id+': actual owner and resident fit the surveyed camera',framed);
 await shot(name,'actual resident route, owner approached with mocked controller, surveyed camera');
}
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('request',r=>{const u=r.url();if(!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'))report.externalRequests.push(u);});
 await page.addInitScript(data=>{const key='pumpkin-patch-voxel-reference-v1';localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key+'-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false,mist:false,lakeLights:false,frameRate:'30'}));},M.saveData(fixture));
 console.log('BOOT '+report.sha256);await page.goto(origin+'/game.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});
 await page.evaluate(()=>{
  window.__directionQA={sample(){const p=PumpkinVoxel,v=p.village?.status,a=v?.active?p.scene.villageView.scene.children.find(o=>o.userData.playerAnimate):p.scene.player.figure(),d=a?.userData,s=v?.active?{who:v.who,position:v.position,moving:!!d?.playerAuthoredDirection,place:'village'}:p.scene.player.state(),mesh=a?.children[0]?.children.find(m=>m.isMesh);return{who:s.who,position:s.position,moving:s.moving,place:s.place,direction:d?.playerDirection,frame:d?.playerDirectionFrame,authored:!!d?.playerAuthoredDirection,phase:d?.playerGaitPhase,leadingLeg:d?.playerLeadingLeg,stature:d?.playerStature,scale:a?.scale.toArray(),sharedGeometry:mesh?.geometry.userData.shared,mapSize:mesh?.material.map?.image?[mesh.material.map.image.width,mesh.material.map.image.height]:null,can:s.waterCanVisible,stream:s.streamVisible};},
   frameRecord(actor){const d=actor.userData,mesh=actor.children[0]?.children.find(m=>m.isMesh),g=mesh?.geometry;if(!g)return null;const uv=g.attributes.uv,image=mesh.material.map.image,us=[],vs=[];for(let i=0;i<uv.count;i++){us.push(uv.getX(i));vs.push(uv.getY(i));}const x=Math.min(...us)*image.width,y=(1-Math.max(...vs))*image.height,w=(Math.max(...us)-Math.min(...us))*image.width,h=(Math.max(...vs)-Math.min(...vs))*image.height;g.computeBoundingBox();const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w));canvas.height=Math.max(1,Math.round(h));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height,bottom=0;for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++)if(pixels[(py*canvas.width+px)*4+3]>=108){top=Math.min(top,py);bottom=Math.max(bottom,py+1);}return{direction:d.playerDirection,frame:d.playerDirectionFrame,phase:d.playerGaitPhase,leadingLeg:d.playerLeadingLeg,authored:!!d.playerAuthoredDirection,stature:d.playerStature,scale:actor.scale.toArray(),geometry:g.uuid,shared:g.userData.shared,uv:[x,y,w,h].map(n=>Math.round(n*100)/100),visibleBodyHeight:(bottom-top)/canvas.height*(g.boundingBox.max.y-g.boundingBox.min.y)*actor.scale.y};}
  };
 });
 for(const who of ['shane','natalie']){
  console.log('OWNER '+who);await begin(who);
  let motion=await keys(['d'],10);
  await page.waitForFunction(()=>!!PumpkinVoxel.scene.player.figure()?.userData.playerDirectionTexture,{timeout:90000});
  motion=motion.concat(await keys(['s'],10));
  report.owners[who]={keyboard:motion};
  check(motion.some(x=>x.moving)&&new Set(motion.map(x=>x.position.x.toFixed(3)+','+x.position.z.toFixed(3))).size>2,who+': actual keyboard input moves the character');
  check(motion.some(x=>x.authored),who+': actual keyboard walking uses the new authored sheet');
  const sweep=await page.evaluate(who=>{
   const p=PumpkinVoxel,player=p.scene.player,rows=[],names=['front','frontRight','right','backRight','back','backLeft','left','frontLeft'];
   for(let row=0;row<8;row++){
    player.setBlocked(true);player.setBlocked(false);player.teleport(20,18);const angle=row*Math.PI/4;player.input(Math.sin(angle),Math.cos(angle));
    const frames=[];for(let i=0;i<16;i++){player.update(.05,100+row+i*.05);frames.push(window.__directionQA.sample());}rows.push({expected:names[row],frames});
   }
   player.input(0,0);return rows;
  },who);
  report.owners[who].controllerSweep=sweep;
  for(const row of sweep){check(row.frames.some(x=>x.authored&&x.direction===row.expected),who+': controller movement faces '+row.expected);check(new Set(row.frames.filter(x=>x.authored).map(x=>x.frame)).size>=4,who+': '+row.expected+' advances foot phases');}
  const poses=await page.evaluate(who=>{
   const a=PumpkinVoxel.scene.player.figure(),out=[];
   for(let row=0;row<8;row++)for(let phase=0;phase<8;phase++){a.userData.playerAnimate({who,outfit:who+'-base',walking:true,angle:row*Math.PI/4,phase:phase/8,time:0});out.push(window.__directionQA.frameRecord(a));}
   a.userData.playerAnimate({who,walking:false,release:true});return out;
  },who);
  report.owners[who].scriptedPoses=poses;
  check(poses.length===64&&poses.every(x=>x.authored)&&new Set(poses.map(x=>x.geometry)).size===64,who+': in-world adapter reaches all 64 authored frame geometries');
  check(poses.every(x=>x.shared&&x.scale[0]>0&&Number.isFinite(x.visibleBodyHeight)),who+': no mirroring, invalid scale or disposable shared geometry');
  const heights=poses.map(x=>x.visibleBodyHeight);check(Math.max(...heights)/Math.min(...heights)<1.16,who+': measured alpha body height stays consistent across all views',{min:Math.min(...heights),max:Math.max(...heights)});
  await begin(who);await poseShot(who,Math.PI/2,`desktop-${who}-profile`);await poseShot(who,Math.PI,`desktop-${who}-back`);
 }
 const orbit=await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.setBlocked(true);p.setBlocked(false);p.teleport(20,18);p.input(0,0);p.walkTo({x:25,z:18,near:.01});for(let i=0;i<10;i++)p.update(.05,200+i*.05);const before=window.__directionQA.sample();for(let i=0;i<12;i++)p.lookBy(1,0);p.update(.01,201);p.update(.01,201.01);const after=window.__directionQA.sample();p.cancelWalk();return{before,after};});
 report.orbit=orbit;const orbitTravel=Math.hypot(orbit.after.position.x-orbit.before.position.x,orbit.after.position.z-orbit.before.position.z),expectedPhase=((orbit.before.phase??0)+orbitTravel/1.8)%1;check(orbit.before.direction!==orbit.after.direction&&Math.abs(expectedPhase-(orbit.after.phase??0))<1e-8,'Camera orbit changes the row while retaining distance-correct gait phase',orbit);
 const wall=await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.recenter();p.setBlocked(true);p.setBlocked(false);p.teleport(38.7,16);p.input(1,0);for(let i=0;i<60;i++)p.update(.05,210+i*.05);const before=window.__directionQA.sample();for(let i=0;i<10;i++)p.update(.05,213+i*.05);p.input(0,0);return{before,after:window.__directionQA.sample()};});
 check(!wall.after.moving&&!wall.after.authored&&Math.hypot(wall.before.position.x-wall.after.position.x,wall.before.position.z-wall.after.position.z)<.001,'Fence collision stops locomotion and returns genuine idle artwork',wall);
 await begin('natalie');
 const water=await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.teleport(20,18);p.input(0,0);p.setBlocked(true);p.setBlocked(false);p.act('water',8,{type:'plot',index:0,x:21,z:18.4});p.update(.1,220);return window.__directionQA.sample();});
 check(water.can&&water.stream&&water.direction==='water'&&!water.authored,'Watering restores the action body and visible sprite watering can',water);await shot('desktop-natalie-watering');await page.evaluate(()=>PumpkinVoxel.scene.player.cancelAction());
 await page.evaluate(()=>{const p=PumpkinVoxel;p.rules.wearCostume(p.state(),'shane-jason');p.scene.refreshLooks();p.playControls.start('shane');p.scene.player.teleport(20,18);});await settle();
 const costume=await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.input(1,0);for(let i=0;i<8;i++)p.update(.05,230+i*.05);p.input(0,0);return{...window.__directionQA.sample(),equipped:PumpkinVoxel.state().wardrobe.equipped.shane};});
 check(costume.equipped==='shane-jason'&&!costume.authored&&costume.direction==='side','Unexpanded Jason costume keeps its own legacy walking sheet',costume);await shot('desktop-legacy-jason');
 await page.evaluate(()=>{const p=PumpkinVoxel;p.rules.wearCostume(p.state(),'shane-base');p.scene.refreshLooks();p.scene.player.setEnabled(false);p.enterRoom('parlour');});await settle();
 report.house=[];
 for(const who of ['shane','natalie']){
  await page.evaluate(who=>{const p=PumpkinVoxel;p.playControls.start(who);p.scene.player.teleport(who==='shane'?4.4:6.8,4.3);p.scene.player.recenter();},who);await settle();
  const record=await page.evaluate(who=>{const a=PumpkinVoxel.scene.player.figure();a.userData.playerAnimate({who,walking:false,release:true});const idle=window.__directionQA.frameRecord(a);a.userData.playerAnimate({who,angle:Math.PI/4,phase:.25,walking:true});const walk=window.__directionQA.frameRecord(a);return{who,idle,walk};},who);report.house.push(record);
  check(record.walk.authored&&Math.abs(record.walk.visibleBodyHeight-record.idle.visibleBodyHeight)/record.idle.visibleBodyHeight<.16,who+': house walk matches original idle stature',record);
 }
 await page.setViewportSize({width:864,height:768});await poseShot('natalie',Math.PI/4,'fold-house-natalie-walking');
 const people=await page.evaluate(()=>{const out=[];PumpkinVoxel.scene.debug.activeScene().traverse(o=>{if(o.userData.playerAnimate&&o.position.x>=200&&o.position.x<=220)out.push({x:o.position.x,z:o.position.z,scale:o.scale.toArray()});});return out;});check(people.length===2,'The house retains both owner figures',people);
 await page.evaluate(()=>{const p=PumpkinVoxel;p.scene.player.setEnabled(false);p.leavePlace();p.openVillage();});await page.evaluate(()=>PumpkinVoxel.scene.villageView.spritesReady);await settle();
 await page.evaluate(async()=>{const v=PumpkinVoxel.scene.villageView;await Promise.all([...v.folk.people.values()].map(p=>p.root.userData.directionalReady));});
 const villageKeys=await keys(['d'],8);report.villageKeyboard=villageKeys;check(villageKeys.some(x=>x.authored)&&new Set(villageKeys.map(x=>x.position.x.toFixed(3)+','+x.position.z.toFixed(3))).size>1,'Actual keyboard input moves an authored owner in the village after room exits',villageKeys);
 const routes=await page.evaluate(()=>{const v=PumpkinVoxel.scene.villageView,out={elowen:[],rowan:[]};for(let i=0;i<1800;i++){v.folk.tick(.1,300+i*.1,v.camera,{paused:false,reducedMotion:false});if(i%2===0)for(const p of v.folk.diagnostics())if(out[p.id]&&p.walking)out[p.id].push(p);}return out;});report.residents=routes;
 for(const id of ['elowen','rowan']){const moving=routes[id].filter(p=>p.atlas==='directional');check(moving.length>0&&new Set(moving.map(p=>p.frame)).size>=8,id+': real autonomous route simulation uses alternating authored phases');check(new Set(moving.map(p=>p.direction)).size>=2,id+': turning along the route selects multiple painted body directions',[...new Set(moving.map(p=>p.direction))]);}
 await residentShot('elowen','fold-elowen-walking-with-natalie');
 await page.setViewportSize({width:1280,height:800});await residentShot('rowan','desktop-rowan-walking-with-natalie');
 check(!report.errors.length,'Full-game directional checks produce no page errors',report.errors);check(!report.externalRequests.length,'Standalone game requests no external assets',report.externalRequests);
}catch(error){report.errors.push(error.stack??String(error));console.error(error);if(page)await shot('directional-failure').catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(output,'directional-game-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,sha256:report.sha256}));if(!report.passed)process.exitCode=1;
