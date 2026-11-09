// Exact-artifact integration QA. The lead must supply a reviewed HTML SHA.
// No build, network asset substitution, chapter-completion shortcut or teleport.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import * as M from '../src/model.js';
import {ARRIVAL, PLAN_SCALE as K} from '../src/content/village.js';
import {EXPANSION_ACTIVITY_BY_ID, EXPANSION_CHAPTER_BY_ID} from '../src/content/village-expansion.js';
import {villageCellFree, villageWalkObstacles} from '../src/rules/village-navigation.js';
import {CAVE_ENTRY, caveCellFree} from '../src/village-expansion-spatial.js';
import {expansionLightConnected} from '../src/rules/village-expansion.js';

const filename=path.resolve(process.argv[2]??''),out=path.resolve(process.argv[3]??'docs/contractor-patches/mothlight-full-expansion/verification/browser');
const expected=process.env.MOTHLIGHT_EXPECTED_SHA,diagnostic=process.env.MOTHLIGHT_QA_MODE==='cave-diagnostic';
if(!process.argv[2]||!expected)throw Error('Supply the final HTML path and MOTHLIGHT_EXPECTED_SHA before launching Chromium.');
const html=await fs.readFile(filename),sha=createHash('sha256').update(html).digest('hex');
if(sha!==expected)throw Error('HTML SHA differs from the lead-approved artifact. No browser was launched.');
await fs.mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),html:filename,sha256:sha,bytes:html.length,checks:[],errors:[],screenshots:[],externalRequests:[],fixtures:[],walks:[],observations:[],scope:'Exact unchanged offline HTML served from captured bytes on loopback. One software Chromium. A declared level6 farm with legacy Two Doorbells starts with a fresh expansion; its new Copse chapters use real gamepad walking, nearby world picks and live puzzle buttons. Later level changes and prerequisite branch fixtures are explicitly recorded. No new-chapter completion APIs or actor-position mutation. Only renderer/composer calls are held for deterministic logic bursts; normal photographs restore renderer, composer and real RAF village ticks. Mocked standard Gamepad API and viewport sizes do not certify physical PS5 Bluetooth, Fold or TV hardware, or device frame rate.'};
if(diagnostic)report.scope='Dedicated rendering investigation of the exact captured HTML. A declared level6 farm walks through the real cave entrance and parks beside a seam. This mode does not complete story chapters and is not acceptance evidence. Subsequent temporary renderer, fog, lighting or mesh toggles are diagnostics only. One software Chromium; no physical-device performance claim.';
let browser,page,server,origin,mainSnapshot,finishDiagnostic;
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,detail});console.log(`${pass?'PASS':'FAIL'} ${label}`);if(!pass&&detail)console.log(JSON.stringify(detail));};
const requireThat=(pass,label,detail)=>{check(pass,label,detail);if(!pass)throw Error(label);};
const section=async(name,fn)=>{console.log('SECTION '+name);try{await fn();}catch(e){report.errors.push({section:name,message:e.stack??String(e)});console.error('ERROR '+name+': '+e.message);}};
const durable=e=>JSON.stringify(Object.fromEntries(['effects','completed','chapters','puzzles','questItems','receipts','baselines','choices','outfits','companions'].map(k=>[k,e[k]])));
function fixtureLevel(s,level){s.earned=M.LEVELS[level-1].at+(s.progression.bonusEarned??0);Object.assign(s.progression,{claimed:Array.from({length:level},(_,i)=>i+1),pending:[],floorLevel:level,floorFrom:M.LEVELS[level-1].at,homeLegacyThrough:Math.min(level,12)});}
function preparedFarm(level=6){
 const s=M.freshState();Object.assign(s,{introSeen:true,paused:false,coins:30000,visitorTimer:1e9});s.shop.arrivalTimer=1e9;fixtureLevel(s,level);s.house.level=1;
 M.inviteToVillage(s);M.finishTour(s);s.village.quests.invitation={step:3,base:null,done:true};s.village.quests['two-doorbells']={step:3,base:null,done:true};s.village.unlocks.push('gathering','stall');
 s.village.built['elowen-conservatory']=true;s.village.built['rowan-workshop']=true;M.buyFoodTruck(s);s.kitchen.pantry.butter=4;
 return s;
}
const start=preparedFarm();
report.fixtures.push({kind:'initial',level:6,house:1,coins:start.coins,description:'Declared prepared farm: owned food truck, four butter, restored legacy homes and Two Doorbells/gathering/stall; all expansion chapters, effects, puzzles, gems and rewards remain fresh. Ordinary arrivals deferred for deterministic UI checks. This is a new expansion save, not a level1 campaign speedrun.'});
const visible=s=>page.locator(s+':visible').first();
const click=async s=>{await visible(s).click({timeout:15000});await neutral();};
const raf=n=>page.evaluate(n=>new Promise(resolve=>{const step=()=>--n<=0?resolve():requestAnimationFrame(step);requestAnimationFrame(step);}),n);
async function holdDraw(){await page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;window.__mothDraw??={renderer:d.renderer.render.bind(d.renderer),composer:d.composer.render.bind(d.composer)};d.renderer.render=()=>{};d.composer.render=()=>{};});}
async function installPad(){await page.evaluate(()=>{
 window.__mothPad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__mothPad]});
 window.__mothTick=PumpkinVoxel.village.tick;PumpkinVoxel.village.tick=()=>__mothTick(0);
 window.__mothStep=dt=>{const p=PumpkinVoxel;if(p.village.active){__mothTick(dt);if(p.village.active)p.scene.villageView.tick(dt);}else{const blocked=!!document.querySelector('#sheet:not([hidden]),#upgrade-menu:not([hidden]),#level-celebration:not([hidden]),.house-goal-modal:not([hidden])');p.playControls.tick(blocked);}};__mothStep(.05);
});}
const neutral=()=>page.evaluate(()=>{__mothPad.axes.fill(0);__mothPad.buttons.forEach(b=>{b.pressed=false;b.value=0;});__mothStep(.05);});
const press=i=>page.evaluate(i=>{__mothPad.buttons[i]={pressed:true,value:1};__mothStep(.05);__mothPad.buttons[i]={pressed:false,value:0};__mothStep(.05);},i);
const steps=seconds=>page.evaluate(n=>{for(let i=0;i<n;i++)__mothStep(.05);},Math.ceil(seconds/.05));
async function photo(name){
 await neutral();await page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;d.renderer.render=__mothDraw.renderer;d.composer.render=__mothDraw.composer;PumpkinVoxel.village.tick=__mothTick;});await page.evaluate(()=>document.fonts.ready);await raf(4);await page.waitForTimeout(450);
 const diagnostics=await page.evaluate(()=>{const p=PumpkinVoxel,v=p.scene.villageView,c=v.camera,status=p.village.status,groups={};for(const id of ['cave-shallows','cave-workings','cave-cathedral','The Crooked Acre']){const g=v.scene.getObjectByName(id);if(!g)continue;const rows=[];g.updateMatrixWorld(true);g.traverse(n=>{if(!n.isMesh)return;const parents=[];for(let q=n;q;q=q.parent)if(!q.visible)parents.push(q.name||q.type);n.computeBoundingBox?.();if(!n.geometry.boundingBox)n.geometry.computeBoundingBox?.();const box=(n.boundingBox??n.geometry.boundingBox)?.clone().applyMatrix4(n.matrixWorld);rows.push({name:n.name,type:n.type,visible:n.visible,hiddenParents:parents,instances:n.count,min:box?.min.toArray(),max:box?.max.toArray(),opacity:n.material?.opacity});});groups[id]={visible:g.visible,meshes:rows};}const lights=[];v.scene.traverse(n=>{if(n.isLight)lights.push({type:n.type,visible:n.visible,intensity:n.intensity,position:n.position.toArray()});});return{status,camera:{position:c.position.toArray(),direction:c.getWorldDirection(c.position.clone()).toArray(),near:c.near,far:c.far,play:v.play.state},actorGround:status.active?v.expansionGroundAt(status.position.x,status.position.z):null,activeArea:v.activeExpansionArea,groups,lights};});
 await page.screenshot({path:path.join(out,name+'.png'),timeout:90000});report.screenshots.push({file:name+'.png',render:'Normal renderer/composer and real RAF village tick, original glow/shadows. No draw-held photograph.',diagnostics});console.log('SHOT '+name);await fs.writeFile(path.join(out,'mothlight-expansion-progress.json'),JSON.stringify(report,null,2)+'\n');await holdDraw();await page.evaluate(()=>{PumpkinVoxel.village.tick=()=>__mothTick(0);});
}
async function steadyFrames(label){
 await neutral();await page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;d.renderer.render=__mothDraw.renderer;d.composer.render=__mothDraw.composer;PumpkinVoxel.village.tick=__mothTick;});
 const metrics=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now(),samples=[];let last=start;function frame(now){samples.push(now-last);last=now;if(samples.length<60&&now-start<20000){requestAnimationFrame(frame);return;}const sorted=[...samples].sort((a,b)=>a-b),d=PumpkinVoxel.scene.debug;resolve({frames:samples.length,milliseconds:now-start,meanFrameMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95FrameMs:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],renderCalls:d.renderer.info.render.calls,triangles:d.renderer.info.render.triangles,contextLost:d.renderer.getContext().isContextLost(),userAgent:navigator.userAgent,area:PumpkinVoxel.village.status.area,drawHeld:false});}requestAnimationFrame(frame);}));
 report.observations.push({kind:'software-normal-render-sample',label,...metrics,scope:'Up to60 consecutive normal RAF frames, bounded20sec. SwiftShader environment only; no physical-device FPS claim.'});check(metrics.frames>=3&&!metrics.contextLost,label+' normal renderer remains live without WebGL context loss',metrics);await holdDraw();await page.evaluate(()=>{PumpkinVoxel.village.tick=()=>__mothTick(0);});
}
async function viewport(width,height,tv=false){await page.setViewportSize({width,height});await page.evaluate(tv=>{document.body.classList.toggle('tv-mode',tv);document.documentElement.style.setProperty('--tv-zoom',tv?'1.537':'1');PumpkinVoxel.scene.setTvProfile(tv);PumpkinVoxel.scene.fitView();},tv);await raf(2);await neutral();}
async function layout(label,selector='#vg-heading button,.vg-heading button,.vg-dock button,#vg-panel-close,#vg-panel-back'){
 const d=await page.evaluate(selector=>{const shown=n=>n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';return{width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,targets:[...document.querySelectorAll(selector)].filter(shown).map(n=>{const r=n.getBoundingClientRect();return{id:n.id||n.dataset.vgxArea||n.className,text:n.textContent.trim().slice(0,35),x:r.x,y:r.y,w:r.width,h:r.height};})};},selector);
 check(d.scroll<=d.width+1,label+' has no horizontal document overflow',d);check(d.targets.every(b=>b.w>=43.5&&b.h>=43.5&&b.x>=-1&&b.y>=-1&&b.x+b.w<=d.width+1&&b.y+b.h<=d.height+1),label+' visible navigation targets fit with44px touch areas',d);return d;
}
async function dismiss(){for(let i=0;i<9;i++){const q=await page.evaluate(()=>({s:PumpkinVoxel.village.status,dialogue:!!document.querySelector('#village-dialogue:not([hidden])'),farm:PumpkinVoxel.playControls.menus.open}));if(!q.s.panel&&!q.s.returnPrompt&&!q.dialogue&&!q.farm)break;await press(1);}await neutral();await steps(.8);}
async function loadSave(saved,description){report.fixtures.push({kind:'branch-load',description,version:saved.version});await page.evaluate(saved=>localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(saved)),saved);await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});await holdDraw();await installPad();await dismiss();}
async function level(level,why){report.fixtures.push({kind:'level-change',level,description:why});await page.evaluate(level=>{const p=PumpkinVoxel,s=p.state();s.earned=p.rules.LEVELS[level-1].at+(s.progression.bonusEarned??0);Object.assign(s.progression,{claimed:Array.from({length:level},(_,i)=>i+1),pending:[],floorLevel:level,floorFrom:p.rules.LEVELS[level-1].at,homeLegacyThrough:Math.min(level,12)});p.save();p.scene.villageView.sync();p.village.render();},level);await neutral();}
async function openVillage(){await dismiss();if(!await page.evaluate(()=>PumpkinVoxel.village.active)){await click('#dock [data-tab="village"]');}await neutral();requireThat(await page.evaluate(()=>PumpkinVoxel.village.active),'Village opens from its real farm navigation shortcut');}

// Deterministic bounded A*: it only proposes collision-checked waypoints. The
// actual controller, speed, collider and following camera execute every step.
function walkingRoute(s,from,goal,cave=false){
 const boxes=cave?null:villageWalkObstacles(s),free=p=>cave?caveCellFree(p.x,p.z,.36):villageCellFree(s,p.x,p.z,.36,boxes);
 const segment=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.22);for(let i=0;i<=n;i++)if(!free({x:a.x+(b.x-a.x)*i/(n||1),z:a.z+(b.z-a.z)*i/(n||1)}))return false;return true;};
 const candidates=[goal,...[.7,1.4,2.1,2.65].flatMap(r=>Array.from({length:16},(_,i)=>({x:goal.x+Math.cos(i*Math.PI/8)*r,z:goal.z+Math.sin(i*Math.PI/8)*r})))].filter(free);
 if(!free(from)||!candidates.length)return[];const nearest=p=>Math.min(...candidates.map(q=>Math.hypot(q.x-p.x,q.z-p.z))),step=.8,key=(x,z)=>x+','+z,heap=[],best=new Map();
 const push=n=>{heap.push(n);for(let i=heap.length-1;i;){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];heap[p]=n;i=p;}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;for(let i=0;;){let j=i*2+1;if(j>=heap.length)break;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[i].f<=heap[j].f)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return first;};
 push({...from,ix:0,iz:0,g:0,f:nearest(from),previous:null});best.set('0,0',0);
 for(let count=0;heap.length&&count<100000;count++){
  const n=pop();if(n.g>best.get(key(n.ix,n.iz)))continue;
  const finish=candidates.find(p=>Math.hypot(p.x-n.x,p.z-n.z)<1.9&&segment(n,p));
  if(finish){const route=[finish];for(let p=n;p.previous;p=p.previous)route.unshift({x:p.x,z:p.z});const smooth=[];let at=from;for(let i=0;i<route.length;){let j=route.length-1;while(j>i&&!segment(at,route[j]))j--;smooth.push(route[j]);at=route[j];i=j+1;}return smooth;}
  for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ix=n.ix+dx,iz=n.iz+dz,p={x:from.x+ix*step,z:from.z+iz*step},g=n.g+Math.hypot(dx,dz)*step,k=key(ix,iz);if(g>700||g>=(best.get(k)??Infinity)||!segment(n,p))continue;best.set(k,g);push({...p,ix,iz,g,f:g+nearest(p),previous:n});}
 }
 return[];
}
async function walkTo(point,label){
 await dismiss();const status=await page.evaluate(()=>PumpkinVoxel.village.status),s=await page.evaluate(()=>PumpkinVoxel.state()),route=walkingRoute(s,status.position,point,status.area.startsWith('cave-'));
 if(!route.length)throw Error('No collision-clear route to '+label+' from '+JSON.stringify(status.position));
 const result=await page.evaluate(route=>{const p=__mothPad,g=PumpkinVoxel.village,v=PumpkinVoxel.scene.villageView;let count=0;p.axes.fill(0);__mothStep(.05);for(const goal of route){let reached=false,last=g.status.position,stuck=0;for(let i=0;i<14000;i++){const at=g.status.position,dx=goal.x-at.x,dz=-(goal.z-at.z),d=Math.hypot(dx,dz);if(d<.14){reached=true;break;}if(g.status.returnPrompt)throw Error('Farm gate interrupted route');const r=v.camera.position.clone().set(1,0,0).applyQuaternion(v.camera.quaternion),f=v.camera.getWorldDirection(v.camera.position.clone());r.y=f.y=0;r.normalize();f.normalize();const force=Math.min(.9,d/.25);p.axes[0]=(dx*r.x+dz*r.z)/d*force;p.axes[1]=-(dx*f.x+dz*f.z)/d*force;__mothStep(.05);count++;const now=g.status.position;stuck=Math.hypot(now.x-last.x,now.z-last.z)<.0001?stuck+1:0;last=now;if(stuck>60)throw Error('Actual controller blocked '+JSON.stringify({goal,at:now,status:g.status}));}if(!reached)throw Error('Timed out walking to '+JSON.stringify(goal));}p.axes.fill(0);__mothStep(.05);return{steps:count,position:g.status.position,area:g.status.area};},route);
 report.walks.push({label,from:status.position,goal:point,route,...result});console.log('WALK '+label+' '+result.steps+' ticks');return result;
}
async function pickActivity(id){const a=EXPANSION_ACTIVITY_BY_ID[id];if(!a)throw Error('Unknown activity '+id);await walkTo(a,a.name);await page.evaluate(id=>PumpkinVoxel.village.pick({type:'expansion-activity',id}),id);await neutral();}
async function done(id){return page.evaluate(id=>!!PumpkinVoxel.state().village.expansion.completed[id],id);}
async function finishActivity(id,{shot=null}={}){
 const a=EXPANSION_ACTIVITY_BY_ID[id];await pickActivity(id);
 if(['vein','story-vein'].includes(a.type)){requireThat(await page.evaluate(()=>!!PumpkinVoxel.village.status.gathering),'Mining begins through the timed in-world tool action');await steps(1.3);}
 else if(a.type==='puzzle'){
  requireThat(await page.evaluate(()=>PumpkinVoxel.village.status.panel==='expansion'),'Nearby puzzle opens its live expansion panel',{id});if(shot)await photo(shot);
  if(a.puzzleKind==='light-route'){
   const values=[0,1,2,3],parts=a.components;let solution;
   for(const x of values)for(const y of values)for(const z of values){const rotations=Object.fromEntries(parts.map((c,i)=>[c.id,[x,y,z][i]]));if(!solution&&expansionLightConnected(a,{rotations}))solution=rotations;}
   if(!solution)throw Error('No connected conduit solution');
   for(const c of parts){const now=await page.evaluate(({id,key})=>PumpkinVoxel.rules.expansionActivityInfo(PumpkinVoxel.state(),id).rotations[key],{id,key:c.id});for(let i=0;i<(solution[c.id]-now+4)%4;i++)await click(`[data-vgx-rotate="${c.id}"]`);}await click(`[data-vgx-submit="${id}"]`);
  }else if(a.puzzleKind==='flavour-set'){for(const choice of [...a.solution].reverse())await click(`[data-vgx-choice="${choice}"]`);await click(`[data-vgx-submit="${id}"]`);}
  else if(a.puzzleKind==='stage-slots'){for(let i=0;i<a.slots.length;i++){await click(`[data-vgx-slot="${a.slots[i]}"]`);await click(`[data-vgx-choice="${a.solution[i]}"]`);}await click(`[data-vgx-submit="${id}"]`);}
  else for(const choice of a.solution)await click(`[data-vgx-choice="${choice}"]`);
 }else await click(`[data-vgx-act="${id}"]`);
 requireThat(await done(id),'World/UI settles '+id,{kind:a.type,puzzle:a.puzzleKind});await dismiss();
}
async function portal(id){const target=await page.evaluate(id=>PumpkinVoxel.scene.villageView.expansionTargets.find(t=>t.type==='expansion-portal'&&(t.id===id||t.targetArea===id)),id);if(!target)throw Error('No visible portal '+id);await walkTo(target,'stairs to '+id);await page.evaluate(target=>PumpkinVoxel.village.pick(target),target);await neutral();}
async function chapter(id,{shots={}}={}){const c=EXPANSION_CHAPTER_BY_ID[id];for(const aid of c.activities)await finishActivity(aid,{shot:shots[aid]});requireThat(await page.evaluate(id=>!!PumpkinVoxel.state().village.expansion.chapters[id],id),'Chapter awarded '+id);}

try{
 server=createServer(async(req,res)=>{
  if(diagnostic&&req.url==='/qa/evaluate'&&req.method==='POST'){try{let body='';for await(const chunk of req)body+=chunk;const{expression}=JSON.parse(body);if(typeof expression!=='string'||body.length>64000)throw Error('Bounded diagnostic expression required');const result=await page.evaluate(expression);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,result}));}catch(e){res.statusCode=500;res.end(JSON.stringify({ok:false,error:e.message}));}return;}
  if(diagnostic&&req.url==='/qa/finish'){finishDiagnostic?.();res.end('Closing diagnostic browser.');return;}
  if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;if(diagnostic)console.log('QA CONTROL '+origin);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});page=await browser.newPage({viewport:{width:864,height:756},hasTouch:true});page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push({section:'page',message:e.stack??e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({section:'console',message:m.text()});});page.on('request',r=>{if(![origin,'data:','blob:'].some(p=>r.url().startsWith(p)))report.externalRequests.push(r.url());});
 await page.addInitScript(saved=>{if(!localStorage.getItem('pumpkin-patch-voxel-reference-v1'))localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(saved));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false,frameRate:'30',glow:true,shadows:true}));},M.saveData(start));
 await page.goto(origin+'/game.html',{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});await holdDraw();await installPad();await dismiss();
 if(diagnostic){
  await openVillage();await walkTo(CAVE_ENTRY,'diagnostic cave entrance');await portal('cave-shallows');const seam=await page.evaluate(()=>PumpkinVoxel.scene.villageView.expansionTargets.find(t=>t.id==='mine:cave-shallows:1'));await walkTo(seam,'diagnostic seam camera pose');await photo('diagnostic-cave-normal');
  await page.evaluate(()=>{const d=PumpkinVoxel.scene.debug;d.renderer.render=__mothDraw.renderer;d.composer.render=__mothDraw.composer;PumpkinVoxel.village.tick=__mothTick;window.__qa={pad:__mothPad,step:__mothStep,draw:__mothDraw};});console.log('QA PARKED IN CAVE; diagnostic endpoint accepts bounded local expressions.');await new Promise(resolve=>{finishDiagnostic=resolve;});
 }else{
 await section('fresh expansion, gates and nearby-only interactions',async()=>{
  await openVillage();const before=await page.evaluate(()=>({position:PumpkinVoxel.village.status.position,coins:PumpkinVoxel.state().coins,expansion:JSON.stringify(PumpkinVoxel.state().village.expansion)}));
  await page.evaluate(()=>PumpkinVoxel.village.pick({type:'expansion-activity',id:'copse-threads:1'}));await neutral();const far=await page.evaluate(()=>({position:PumpkinVoxel.village.status.position,panel:PumpkinVoxel.village.status.panel,done:!!PumpkinVoxel.state().village.expansion.completed['copse-threads:1']}));
  check(!far.done&&!far.panel&&Math.hypot(far.position.x-before.position.x,far.position.z-before.position.z)<.001,'Distant activity guides without remote completion or teleport',far);
  const followed=await page.evaluate(()=>({saved:PumpkinVoxel.state().village.expansion.tracked,shown:document.querySelector('#vg-quest-title').textContent}));check(followed.saved==='copse-threads'&&followed.shown==='A Stitch in the Dark','Guiding an expansion step follows its real chapter title rather than the legacy quest',followed);
  await page.evaluate(()=>PumpkinVoxel.village.pick({type:'village-door',id:'granny-cottage'}));await neutral();check(!await page.evaluate(()=>PumpkinVoxel.village.status.inside),'Granny’s locked house cannot be entered remotely');
  await press(2);await click('[data-vgx-area="quarry"]');check(await visible('#vg-panel-body').innerText().then(t=>/level 9|Level 9/.test(t)),'Locked Quarry map states farm level criteria');const pos=await page.evaluate(()=>PumpkinVoxel.village.status.position);await click('[data-vgx-area="acre"]');check(await visible('#vg-panel-body').innerText().then(t=>/level 8|Level 8/.test(t)),'Locked Acre map states farm level criteria');check(JSON.stringify(pos)===JSON.stringify(await page.evaluate(()=>PumpkinVoxel.village.status.position)),'Reading locked area cards never teleports the owner');await dismiss();
  await walkTo({x:0,z:74},'the open Copse approach');await press(11);await photo('01-fold-copse-entrance');
 });
 await section('actual level6 Copse clues, sequence and guaranteed story crystal',async()=>{
  await chapter('copse-threads',{shots:{'copse-threads:3':'02-fold-sequence-puzzle'}});
  const completeTracker=await page.evaluate(()=>({title:document.querySelector('#vg-quest-title').textContent,task:document.querySelector('#vg-task').textContent,counts:document.querySelector('#vg-quest-counts').textContent}));check(completeTracker.title==='A Stitch in the Dark'&&/complete/i.test(completeTracker.task+' '+completeTracker.counts),'Completed followed chapter remains visible with a clear completion state',completeTracker);
  const fashions=await page.evaluate(()=>{const s=PumpkinVoxel.state();return{level:PumpkinVoxel.rules.patchLevel(s).level,effect:s.village.expansion.effects.includes('tailoring'),costumes:['shane-scarecrow','natalie-mummy'].every(id=>s.wardrobe.owned.includes(id))};});check(fashions.level===6&&fashions.effect&&fashions.costumes,'Actual level6 Mabel chapter unlocks saved looks and both costume rewards',fashions);
  await walkTo(CAVE_ENTRY,'the cave’s visible surface entrance');await portal('cave-shallows');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='cave-shallows'),'Near entrance descends into the shallow cave');await chapter('copse-lantern');
  const crystal=await page.evaluate(()=>{const e=PumpkinVoxel.state().village.expansion;return{quest:e.questItems['copse-lantern:2'],tradeable:e.gems['lantern-amethyst'],done:e.chapters['copse-lantern']};});check(crystal.done&&crystal.quest==='lantern-amethyst'&&crystal.tradeable===0,'Guaranteed story crystal remains in quest collection, separate from sellable inventory',crystal);
  const seam=await page.evaluate(()=>PumpkinVoxel.scene.villageView.expansionTargets.find(t=>t.id==='mine:cave-shallows:1'));await walkTo(seam,'a repeatable shallow mineral seam');
  const stone=await page.evaluate(()=>PumpkinVoxel.state().village.materials.stone);await page.evaluate(seam=>PumpkinVoxel.village.pick(seam),seam);await steps(1.3);const mine=await page.evaluate(()=>({stone:PumpkinVoxel.state().village.materials.stone,slot:PumpkinVoxel.state().village.expansion.veins['mine:cave-shallows:1']}));check(mine.stone===stone+2&&mine.slot.cycle===1&&mine.slot.remaining>475,'Actual timed pickaxe mines two stones and starts one saved cooldown',mine);
  await page.evaluate(seam=>PumpkinVoxel.village.pick(seam),seam);await steps(1.3);check(await page.evaluate(stone=>PumpkinVoxel.state().village.materials.stone===stone,mine.stone),'Repeated seam input during cooldown cannot duplicate stone or gems');await photo('03-fold-shallow-cave');await steadyFrames('Shallow cave');
  await portal('cave-workings');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='cave-shallows'),'Level6 cannot descend to locked level9 workings');await portal('cave-exit');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='copse'),'Actual cave stairs return to the same surface approach');
 });
 await section('level7 Copse restoration, once-only reward and save19 reload',async()=>{
  await level(7,'First two Copse chapters were played at level6. Farm level7 is now explicitly prepared to inspect the final Copse chapter; its new activities/rewards remain uncompleted.');
  const before=await page.evaluate(()=>{const s=PumpkinVoxel.state();return{coins:s.coins,xp:PumpkinVoxel.rules.levelEarnings(s)};});await chapter('copse-restored');
  const after=await page.evaluate(()=>{const s=PumpkinVoxel.state();return{coins:s.coins,xp:PumpkinVoxel.rules.levelEarnings(s),herbBeds:s.estate.ownedDecor['herb-planter'],patterns:s.house.owned.includes('mothlight-pattern-table'),effects:s.village.expansion.effects};});check(after.coins-before.coins===180&&after.xp===before.xp&&after.herbBeds===2&&after.patterns,'Copse restores useful planters/table and £180 bonus without level XP',after);
  await page.evaluate(()=>PumpkinVoxel.village.pick({type:'expansion-activity',id:'copse-restored:3'}));await neutral();if(await page.locator('[data-vgx-act="copse-restored:3"]:visible').count())await click('[data-vgx-act="copse-restored:3"]');await dismiss();
  check(await page.evaluate(coins=>PumpkinVoxel.state().coins===coins,after.coins),'Repeated completed reveal cannot award a second chapter payment');await press(11);await photo('04-fold-restored-copse');await steadyFrames('Restored Copse');
  mainSnapshot=await page.evaluate(()=>{PumpkinVoxel.save();return PumpkinVoxel.rules.saveData(PumpkinVoxel.state());});const expansion=durable(mainSnapshot.village.expansion);check(mainSnapshot.version===19,'Full game writes save version19');await loadSave(mainSnapshot,'Reload the exact full-game save after the earned Copse restoration; no expansion state is injected.');
  const loaded=await page.evaluate(()=>PumpkinVoxel.rules.saveData(PumpkinVoxel.state()));check(durable(loaded.village.expansion)===expansion,'Save19 reload preserves completed chapters, puzzle choices, quest crystal, receipts and rewards');check(loaded.village.expansion.veins['mine:cave-shallows:1']?.cycle===1&&loaded.village.expansion.veins['mine:cave-shallows:1'].remaining<=mainSnapshot.village.expansion.veins['mine:cave-shallows:1'].remaining,'Save19 mining cooldown resumes without resetting its earned cycle');mainSnapshot=loaded;
 });
 await section('farm: wear/save reward costumes, place keepsake and grow real herbs',async()=>{
  requireThat(mainSnapshot?.village.expansion.chapters['copse-restored'],'Farm reward use requires the actually earned main-story snapshot');
  await page.evaluate(()=>PumpkinVoxel.openSheet('wardrobe'));await click('details.service-disclosure summary');await click('[data-save-look-pair="0"]');await click('[data-wear="natalie-mummy"]');await click('[data-wear-look-pair="0"]');
  check(await page.evaluate(()=>{const s=PumpkinVoxel.state();return s.village.expansion.outfits[0]?.natalie==='natalie-base'&&s.wardrobe.equipped.natalie==='natalie-base';}),'Mabel’s saved pair restores both actual outfits through wardrobe controls');await dismiss();
  await page.evaluate(()=>{PumpkinVoxel.enterRoom('parlour');document.querySelector('#place-decorate').click();});await visible('#decor-search').fill('pattern');await click('[data-place="mothlight-pattern-table"]');await dismiss();
  check(await page.evaluate(()=>PumpkinVoxel.state().house.placed.some(p=>p.id==='mothlight-pattern-table')),'Earned pattern table places as a real home furnishing');await photo('05-fold-earned-home-keepsake');
  await page.evaluate(()=>{PumpkinVoxel.leavePlace();PumpkinVoxel.enterEstate();PumpkinVoxel.openEstateSheet('garden');});await click('[data-estate-place="herb-planter"]');await press(0);if(await page.evaluate(()=>PumpkinVoxel.estateTools.active)&&await page.locator('[data-estate-control="done"]:visible').count())await click('[data-estate-control="done"]');await press(1);
  const herb=await page.evaluate(()=>PumpkinVoxel.state().estate.placed.find(p=>p.id==='herb-planter'));requireThat(!!herb,'Free Tansy reward places through actual garden controls');
  await page.evaluate(instance=>{PumpkinVoxel.tendGardenBed(instance);PumpkinVoxel.tendGardenBed(instance);PumpkinVoxel.advance(49);PumpkinVoxel.tendGardenBed(instance);},herb.instance);
  check(await page.evaluate(()=>{const s=PumpkinVoxel.state();return s.kitchen.pantry.herbs===3&&s.estate.ownedDecor['herb-planter']===1&&s.estate.placed.find(p=>p.id==='herb-planter').crop.phase==='empty';}),'One earned planter grows, waters and picks three real pantry herbs without buying a duplicate');await photo('06-fold-earned-herb-planter');
  await page.evaluate(()=>{PumpkinVoxel.leavePlace();PumpkinVoxel.openCookingSheet('recipes','truck');});await click('[data-cooking-disclosure="village-preservation"] summary');
  const before=await page.evaluate(()=>({...PumpkinVoxel.state().kitchen.pantry}));await click('[data-expansion-economy="preservation-wax"]');check(await page.evaluate(()=>PumpkinVoxel.state().village.expansion.economy.waxJob?.station==='truck'),'Preservation recipe starts on an actual farm cooker');await page.evaluate(()=>PumpkinVoxel.advance(31));
  check(await page.evaluate(before=>{const s=PumpkinVoxel.state();return s.village.expansion.economy.wax===1&&s.kitchen.pantry.herbs===before.herbs-1&&s.kitchen.pantry.butter===before.butter-1;},before),'Utility batch consumes one grown herb and one butter exactly once');await dismiss();
 });
 await section('level8 Crooked Acre walking, new Granny sprite and real interior',async()=>{
  await level(8,'Prepared level8 for a branch sample; Copse restoration is the actual earned save, Granny chapters remain fresh.');await page.evaluate(()=>{while(PumpkinVoxel.scene.place)PumpkinVoxel.leavePlace();});await openVillage();
  await chapter('granny-listens');await walkTo({x:-68*K,z:79.3*K},'Granny’s cottage door through the authored maize paths');await press(11);await photo('07-fold-crooked-acre');
  await page.evaluate(()=>PumpkinVoxel.village.pick({type:'village-door',id:'granny-cottage'}));await neutral();requireThat(await page.evaluate(()=>PumpkinVoxel.village.status.inside==='granny-cottage'),'Only the nearby unlocked Granny door opens the genuine cottage interior');await photo('08-fold-granny-cottage');await press(1);await neutral();check(!await page.evaluate(()=>PumpkinVoxel.village.status.inside),'Circle returns cleanly from Granny’s cottage to the field');
 });
 await section('level9 quarry connected-light board and workings stairs',async()=>{
  await level(9,'Prepared level9 for actual Quarry chapter and second cave floor. Copse story remains earned; Quarry steps start fresh.');await chapter('quarry-bell',{shots:{'quarry-bell:2':'09-fold-light-route-puzzle'}});
  await walkTo(CAVE_ENTRY,'the cave entrance from Opal’s quarry');await portal('cave-shallows');await portal('cave-workings');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='cave-workings'),'Actual stairs unlock the workings after level9 and the Quarry bell');await photo('10-fold-cave-workings');await portal('cave-exit');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='cave-shallows'),'Second-floor exit returns to the shallow floor rather than the surface');await portal('cave-exit');
 });
 await section('Cinder flavour puzzle, Corvus stage board and premium menu images',async()=>{
  await level(10,'Prepared level10 to inspect Cinder’s actual first inspect and unordered-flavour puzzle; no restaurant-completion reward is injected.');await finishActivity('quarry-supper:1');await finishActivity('quarry-supper:2',{shot:'11-fold-flavour-set-puzzle'});
  const sample=await page.evaluate(()=>PumpkinVoxel.rules.saveData(PumpkinVoxel.state()));sample.village.expansion.effects.push('restaurant-opening');fixtureLevel(sample,12);await loadSave(sample,'Declared isolated Corvus branch prerequisite: level12 and restaurant-opening effect, solely to sample the real stage-slots widget. This does not count as an earned restaurant campaign.');await openVillage();await finishActivity('moor-stage:1');await finishActivity('moor-stage:2',{shot:'12-fold-stage-slots-puzzle'});
  await viewport(1920,1080,true);await page.evaluate(()=>{PumpkinVoxel.village.pick({type:'village-folk',id:'corvus'});});await neutral();await photo('13-tv-corvus-dialogue-world');await dismiss();await layout('TV village');await photo('14-tv-carnival-world');await viewport(864,756,false);
 });
 await section('deep cave gates and endgame Lantern Night, explicit prepared branch',async()=>{
  const saved=mainSnapshot??M.saveData(preparedFarm(7));fixtureLevel(saved,20);saved.village.expansion.effects=[...new Set([...saved.village.expansion.effects,'quarry-bell','green-seal','copse-seal','quarry-seal','moor-seal','marsh-restored','festival-prepare'])];M.addStock(saved,0,12,true);saved.kitchen.food.wedges=4;
  await loadSave(saved,'Declared endgame branch: level20, Quarry bell, all four actual district seal flags, Marsh/festival-prepare prerequisites, twelve unreserved pumpkins and four cooked wedges. Festival supply delivery, final Lantern Night activities and deep cave exploration remain fresh and use real UI/walking.');await openVillage();await walkTo(CAVE_ENTRY,'the deep-cave route entrance');await portal('cave-shallows');await portal('cave-workings');await portal('cave-cathedral');check(await page.evaluate(()=>PumpkinVoxel.village.status.area==='cave-cathedral'),'The level15+ four-seal route reaches the Cathedral through both preceding cave floors');await photo('15-fold-root-cathedral');await portal('cave-exit');await portal('cave-exit');await portal('cave-exit');
  await finishActivity('festival-arrange:1');const supper=await page.evaluate(()=>({pumpkins:PumpkinVoxel.rules.stockCount(PumpkinVoxel.state()),food:PumpkinVoxel.state().kitchen.food.wedges}));await finishActivity('festival-arrange:2');const supplied=await page.evaluate(()=>({pumpkins:PumpkinVoxel.rules.stockCount(PumpkinVoxel.state()),food:PumpkinVoxel.state().kitchen.food.wedges}));check(supper.pumpkins-supplied.pumpkins===12&&supper.food-supplied.food===4,'The festival supper consumes exactly twelve real pumpkins and four cooked portions',supplied);await finishActivity('festival-arrange:3');
  await chapter('lantern-night');check(await page.evaluate(()=>PumpkinVoxel.state().village.expansion.effects.includes('lantern-night')),'Final Lantern Night closes through its puzzle, cinematic reveal and restoration');await press(11);await photo('16-fold-lantern-night');
  await viewport(390,844,false);await layout('Phone village');await photo('17-phone-village-world');await viewport(864,756,false);
 });
 await section('fresh controls after menus and guarded return to the farm',async()=>{
  await dismiss();await press(9);await press(0);check(await page.evaluate(()=>PumpkinVoxel.village.status.panel==='map'),'Options then fresh Cross opens the actual village map');await dismiss();
  const move=await page.evaluate(()=>{const g=PumpkinVoxel.village,before=g.status.position;__mothPad.axes[0]=.65;__mothStep(.2);const after=g.status.position;__mothPad.axes.fill(0);__mothStep(.05);return{before,after};});check(Math.hypot(move.after.x-move.before.x,move.after.z-move.before.z)>.1,'Closing a menu releases fresh stick movement immediately',move);
  await walkTo({x:ARRIVAL.back[0],z:ARRIVAL.back[1]+1.7},'the visible farm-return route');await page.evaluate(()=>{__mothPad.buttons[0]={pressed:true,value:1};for(let i=0;i<7;i++)__mothStep(.05);});
  check(await page.evaluate(()=>PumpkinVoxel.village.active&&PumpkinVoxel.village.status.returnPrompt),'Held opener cannot double-confirm Return to farm');await neutral();await photo('18-fold-return-to-farm');await press(1);check(await page.evaluate(()=>PumpkinVoxel.village.active&&!PumpkinVoxel.village.status.returnPrompt),'Circle cancels farm return');await press(0);await press(0);await raf(3);check(!await page.evaluate(()=>PumpkinVoxel.village.active),'Fresh Cross returns to the farm without freezing or automatic re-entry');
 });
 await section('actual discovery recipe research, cookware, food output and painted dish menus',async()=>{
  report.fixtures.push({kind:'dish-art-and-cooking',description:'Declared Cinder/Granny discovery effects and exact raw recipe ingredients for a focused cooking/UI sample. Both recipes are learned by live Research buttons; baking kit is bought by its existing upgrade button, and each paid batch runs through its actual cooker before food storage is checked. This is not recorded as an earned restaurant/Granny campaign.'});
  await dismiss();if(await page.evaluate(()=>PumpkinVoxel.village.active)){await page.evaluate(()=>PumpkinVoxel.village.requestReturn('menu'));await press(0);}
  await page.evaluate(()=>{const p=PumpkinVoxel,s=p.state();for(const id of ['cinder-recipe','granny-recipe'])if(!s.village.expansion.effects.includes(id))s.village.expansion.effects.push(id);Object.assign(s.kitchen.pantry,{vegetables:2,stock:1,herbs:1,butter:1,berries:2,flour:1,sugar:1});p.rules.addStock(s,0,1,true);p.openCookingSheet('upgrades','truck');});
  await click('[data-cooking-upgrade="truck-oven"]');check(await page.evaluate(()=>PumpkinVoxel.state().kitchen.upgrades['truck-oven']===1),'Existing live truck upgrade buys actual oven and tray capability');
  for(const[id,seconds,shot,tv]of [['cinders-lantern-stew',61,'19-fold-cinder-dish',false],['grannys-bramble-pudding',56,'20-tv-granny-dish',true]]){
   await page.evaluate(()=>PumpkinVoxel.openCookingSheet('recipes','truck'));await click('[data-recipe-filter="new"]');await click(`[data-recipe-select="${id}"]`);await click(`[data-cooking-research="${id}"]`);
   check(await page.evaluate(id=>PumpkinVoxel.state().kitchen.recipes.includes(id),id),'Live discovery research learns '+id);
   const art=await page.evaluate(id=>{const node=document.querySelector('#cooking-chosen-dish [data-expansion-dish="'+id+'"]');return{present:!!node,background:node?getComputedStyle(node).backgroundImage.slice(0,50):null,width:node?.getBoundingClientRect().width};},id);check(art.present&&art.width===128&&art.background?.startsWith('url('),'Menu uses the actual128px premium painting for '+id,art);
   if(tv)await viewport(1920,1080,true);await photo(shot);await click(`[data-cooking-start="${id}"]`);if(await page.locator('#cooking-reveal:visible button').count())await click('#cooking-reveal button');await page.evaluate(seconds=>PumpkinVoxel.advance(seconds),seconds);
   check(await page.evaluate(id=>PumpkinVoxel.state().kitchen.food[id]===3,id),'Actual cooker delivers three sellable portions of '+id);if(tv)await viewport(864,756,false);
  }
  await dismiss();
 });
 check(report.externalRequests.length===0,'Exact standalone HTML makes no external asset requests',report.externalRequests);check(report.errors.length===0,'Integrated runtime has no page/shader/runner errors',report.errors);
 }
}catch(e){report.errors.push({section:'runner',message:e.stack??String(e)});console.error(e.stack??e);}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));report.passed=report.errors.length===0&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(out,'mothlight-expansion-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,sha256:sha}));if(!report.passed)process.exitCode=1;
