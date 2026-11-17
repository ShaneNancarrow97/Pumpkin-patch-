// Exact offline game checks, with declared fixtures and held draws between photos.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import * as M from '../src/model.js';
import {ARRIVAL,FIXTURES,NODES,DISTRICTS} from '../src/content/village.js';
import {VILLAGE_GATEWAY} from '../src/content/village-gateway.js';
import {villageNodePosition} from '../src/content/village-node-sites.js';
import {findResidentPath} from '../src/rules/village-resident-life.js';
import {villageCellFree} from '../src/rules/village-navigation.js';

const preflight=process.env.QA_PREFLIGHT==='1', skipPhotos=process.env.QA_SKIP_PHOTOS==='1';
const filename=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Village-Play-Polish.html');
const out=path.resolve(process.argv[3]??'docs/contractor-patches/village-play-polish/verification/browser-qa');
await fs.mkdir(out,{recursive:true});const html=await fs.readFile(filename),sha=b=>createHash('sha256').update(b).digest('hex');
const report={mode:preflight?'preflight':'final',date:new Date().toISOString(),html:filename,sha256:sha(html),bytes:html.length,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:[],errors:[],externalRequests:[],screenshots:[],layouts:[],scope:'Exact standalone HTML bytes served unchanged over loopback, headless Chromium software WebGL. Explicit level20, finished-tour/gathering quest fixture; milestones were not earned in play. Initial village entry uses the public openVillage() diagnostic command after starting the declared playable owner; visible hotbar/physical entry is a separate check. Functional sections hold only renderer/composer draw calls while real controller/model/view ticks run in accelerated .05s steps. Draws are restored for normal-renderer photographs and shader checks. Standard Gamepad API input is mocked; viewports emulate phone/Fold/TV and do not certify physical Bluetooth, TV or device performance.'};
report.workingTree=execFileSync('git',['status','--short'],{encoding:'utf8'});
report.sourceHashes={};
for(const file of ['src/main.js','src/scene.js','src/player-control.js','src/village-game.js','src/village-view.js','src/village-world.js','src/village-grass.js','src/village-visibility.js','src/village-proximity.js','src/village-wanderers.js','src/sprite-rim.js','src/ui/village-controls.js','src/ui/village-controls.css','src/ui/village-map.js','src/ui/village-chapters.js','src/ui/village-conversation.js','src/ui/village-conversation.css','src/ui/pad-cursor.js','src/ui/home-sheets.js','assets/terrain/grass-tile.webp','assets/village-ui-icons/village-ui.webp']){
 try{const data=await fs.readFile(file);report.sourceHashes[file]={bytes:data.length,sha256:sha(data)};}catch{}
}
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,detail});console.log(`${pass?'PASS':'FAIL'} ${label}`);};
const fixture=M.freshState();Object.assign(fixture,{introSeen:true,paused:false,coins:30000,earned:M.LEVELS[19].at,visitorTimer:1e9});fixture.shop.arrivalTimer=1e9;fixture.progression.claimed=M.LEVELS.map(l=>l.level);fixture.progression.pending=[];M.inviteToVillage(fixture);M.finishTour(fixture);fixture.village.quests.invitation={step:3,base:null,done:true};fixture.village.unlocks.push('gathering');fixture.village.quests['rowan-1']={step:0,base:{logs:0},done:false};
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const click=sel=>page.locator(sel+':visible').first().click();
const raf=frames=>page.evaluate(n=>new Promise(resolve=>{const next=()=>--n<=0?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}),frames);
const holdDraw=()=>page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;window.__polishDraw??={renderer:d.renderer.render.bind(d.renderer),composer:d.composer.render.bind(d.composer)};d.renderer.render=()=>{};d.composer.render=()=>{};});
const restoreDraw=()=>page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;d.renderer.render=window.__polishDraw.renderer;d.composer.render=window.__polishDraw.composer;});
const shot=async(name)=>{if(skipPhotos&&!((process.env.QA_PRIMARY_PHOTO==='1'&&name==='01-closer-village')||(process.env.QA_BUILD_PHOTOS==='1'&&name.startsWith('04-build-')))){if(name==='01-closer-village'){await restoreDraw();await raf(2);await holdDraw();console.log('DRAW CHECK '+name);}return;}if(preflight&&name!=='01-closer-village')return;await restoreDraw();await raf(2);if(preflight){await holdDraw();console.log('DRAW CHECK '+name);return;}await page.screenshot({path:path.join(out,name+'.png'),timeout:120000});report.screenshots.push({file:name+'.png',preferences:'normal glow/shadows enabled for this shot unless identified in report'});await holdDraw();console.log('SHOT '+name);};
const section=async(name,fn)=>{try{await fn();}catch(e){report.errors.push({section:name,message:e.stack??String(e)});console.error('ERROR '+name+': '+e.message);}};
const closePanel=async()=>{if(await page.locator('#vg-panel').isVisible())await click('#vg-panel-close');};
async function installPad(){await page.evaluate(()=>{window.__polishPad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};window.__polishPads=[window.__polishPad];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__polishPads});window.__polishTick??=PumpkinVoxel.village.tick;PumpkinVoxel.village.tick=()=>window.__polishTick(0);window.__polishStep=dt=>{window.__polishTick(dt);if(PumpkinVoxel.village.active)PumpkinVoxel.scene.villageView.tick(dt);};window.__polishStep(.05);});}
async function press(id){return page.evaluate(id=>{const p=window.__polishPad;p.buttons[id]={pressed:true,value:1};window.__polishStep(.05);p.buttons[id]={pressed:false,value:0};window.__polishStep(.05);return PumpkinVoxel.village.status;},id);}
async function neutral(){await page.evaluate(()=>{__polishPad.axes.fill(0);__polishPad.buttons.forEach(b=>{b.pressed=false;b.value=0;});__polishStep(.05);});}
async function openVillage(){
 if(!await page.evaluate(()=>PumpkinVoxel.village.active)){
  await page.evaluate(()=>{if(!PumpkinVoxel.openVillage())throw Error('Declared fixture could not open village');});
  await installPad();
 }
 await page.waitForFunction(()=>PumpkinVoxel.village.active&&PumpkinVoxel.scene.villageView.play.following,null,{timeout:120000});await closePanel();await neutral();
}

async function walkTo(point,label='destination'){
 const from=await page.evaluate(()=>PumpkinVoxel.village.status.position),state=await page.evaluate(()=>PumpkinVoxel.state());
 const candidates=[point,...Array.from({length:8},(_,i)=>({x:point.x+Math.cos(i*Math.PI/4)*1.4,z:point.z+Math.sin(i*Math.PI/4)*1.4}))];
 let route=[];for(const to of candidates){if(!villageCellFree(state,to.x,to.z))continue;route=findResidentPath(state,from,to);if(route.length)break;}
 if(!route.length){const hub={x:ARRIVAL.spawn[0],z:ARRIVAL.spawn[1]},first=findResidentPath(state,from,hub);if(first.length)for(const to of candidates){const last=findResidentPath(state,hub,to);if(last.length){route=[...first,...last];break;}}}
 if(!route.length)throw Error('No clear route to '+label);
 const result=await page.evaluate(route=>{const g=PumpkinVoxel.village,v=PumpkinVoxel.scene.villageView,p=window.__polishPad;p.axes.fill(0);window.__polishStep(.05);let count=0;for(const goal of route){let reached=false;for(let i=0;i<5000;i++){if(!g.active)return{left:true,count,position:g.status.position};const at=g.status.position,dx=goal.x-at.x,dz=-(goal.z-at.z),distance=Math.hypot(dx,dz);if(distance<.12){reached=true;break;}const right=v.camera.position.clone().set(1,0,0).applyQuaternion(v.camera.quaternion);right.y=0;right.normalize();const forward=v.camera.getWorldDirection(v.camera.position.clone());forward.y=0;forward.normalize();const force=Math.min(.9,distance/.3);p.axes[0]=(dx*right.x+dz*right.z)/distance*force;p.axes[1]=-(dx*forward.x+dz*forward.z)/distance*force;window.__polishStep(.05);count++;}if(!reached)throw Error('Controller approach blocked '+JSON.stringify({goal,at:g.status.position}));}p.axes.fill(0);window.__polishStep(.05);return{left:false,count,position:g.status.position};},route);
 report.checks.push({pass:true,label:'Real controller route reaches '+label,detail:{route,result,method:'Native Gamepad API mock, real collision/owner/view .05s steps'}});return result;
}
async function setTouch(){await page.evaluate(()=>{__polishPads=[];window.dispatchEvent(new Event('gamepaddisconnected'));document.getElementById('village-game').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:999,clientX:4,clientY:4}));__polishStep(.05);});}
async function setPad(){await page.evaluate(()=>{__polishPads=[__polishPad];__polishStep(.05);__polishPad.axes[2]=.3;__polishStep(.05);__polishPad.axes[2]=0;__polishStep(.05);});}
function overlap(a,b){return a&&b&&Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+.5&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+.5;}
async function layout(name,width,height,pad=false,tv=false){
 await page.setViewportSize({width,height});await closePanel();
 await page.evaluate(({tv})=>{document.body.classList.toggle('tv-mode',tv);document.documentElement.style.setProperty('--tv-zoom',tv?'1.537':'1');}, {tv});
 pad?await setPad():await setTouch();await raf(2);
 const data=await page.evaluate(()=>{const rect=el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return{x:r.x,y:r.y,w:r.width,h:r.height,visible:!!el.getClientRects().length&&c.display!=='none'&&c.visibility!=='hidden'};},all=[...document.querySelectorAll('#village-game button')].filter(e=>!e.closest('[hidden]')).map(e=>({id:e.id||e.dataset.vgPage||e.textContent.trim(),font:parseFloat(getComputedStyle(e).fontSize),...rect(e)})).filter(e=>e.visible);return{innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,input:PumpkinVoxel.village.status.input,buttons:all,rects:{dock:rect(document.querySelector('.vg-dock')),legend:rect(document.querySelector('.vg-pad-legend')),objective:rect(document.querySelector('#vg-objective')),rate:rect(document.querySelector('#vg-farm-rate'))},nav:[...document.querySelectorAll('.vg-dock button')].map(e=>({id:e.dataset.vgPage||e.id,...rect(e)}))};});
 report.layouts.push({name,pad,tv,...data});const targets=data.buttons;check(data.scrollWidth<=width&&targets.every(b=>b.x>=-.6&&b.y>=-.6&&b.x+b.w<=width+.6&&b.y+b.h<=height+.6&&b.w>=43.5&&b.h>=43.5),name+': visible controls fit and retain44px targets',data);
 check(data.nav.length===6&&data.nav.every(b=>b.visible&&b.w>=43.5&&b.h>=43.5),name+': all six custom-icon navigation buttons stay available',data.nav);
 if(pad)check(!overlap(data.rects.dock,data.rects.legend),name+': controller legend and navigation do not overlap',data.rects);
 await click('.vg-dock [data-vg-page="map"]');const panel=await page.locator('#vg-panel').boundingBox();check(panel&&panel.x>=-.6&&panel.y>=-.6&&panel.x+panel.width<=width+.6&&panel.y+panel.height<=height+.6,name+': map panel fits its viewport',panel);await closePanel();
}

report.mode='gateway-visual';report.scope='One normal-renderer farm gateway photograph from exact unchanged final HTML. Declared quiet level20 finished-tour fixture, empty visitors/arriving, paused simulation, management camera focused near authored gateway. No runtime edits, no CSS injection.';
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:false});page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push({section:'page',message:e.stack??e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({section:'console',message:m.text()});});page.on('request',r=>{if(![origin,'data:','blob:'].some(s=>r.url().startsWith(s)))report.externalRequests.push(r.url());});
 await page.addInitScript(save=>{localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(save));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false,frameRate:'30',glow:true,shadows:true}));},M.saveData(fixture));
 await page.goto(origin+'/game.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});await holdDraw();await page.evaluate(gate=>{const p=PumpkinVoxel,s=p.state();s.paused=true;s.visitors=[];s.arriving=[];s.holds=[];s.shop.customers=[];p.scene.player.setEnabled(false);p.scene.focus(gate.x,gate.z,2);},VILLAGE_GATEWAY);await shot('05-farm-village-gateway');report.gateway=VILLAGE_GATEWAY;check(report.errors.length===0,'Normal gateway frame has no browser or shader errors',report.errors);check(report.externalRequests.length===0,'Exact standalone gateway view uses no external assets',report.externalRequests);
} catch(e){report.errors.push({section:'setup',message:e.stack??String(e)});console.error(e.stack??e);}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));report.passed=report.errors.length===0&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(out,'village-play-polish-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,out}));process.exitCode=report.passed?0:1;
