// Compare exact offline builds on one repeatable, normally rendered village walk.
// node tools/village-clarity-perf.mjs file.html --out /tmp/run.json [--fixture baseline.json]
// The native controller/collision tick is accelerated; software WebGL timings are relative evidence only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import * as M from '../src/model.js';
import {findResidentPath} from '../src/rules/village-resident-life.js';

const argv=process.argv.slice(2),option=(name,fallback)=>{const i=argv.indexOf(name);return i<0?fallback:argv[i+1];};
const file=path.resolve(argv[0]??'dist/pumpkin-patch-voxel.html'),out=path.resolve(option('--out','/tmp/village-clarity-qa/perf.json'));
const baseline=option('--fixture',null),inherited=baseline?JSON.parse(await fs.readFile(baseline,'utf8')):null;
const sha=data=>createHash('sha256').update(data).digest('hex');
const html=await fs.readFile(file),checkoutCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceCommit=option('--source-commit',checkoutCommit);
const contract=inherited?.contract??{
  viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,reducedMotion:'no-preference',
  preferences:{music:false,sound:false,voiceEnabled:false,renderQuality:'sharp',frameRate:'30',glow:true,shadows:true,voxelCharacters:false,mist:true,lakeLights:true,tvMode:false},
  simulation:{stepSeconds:.1,stepsPerDraw:18,sprint:true,dwellFrames:12,tolerance:.16,maxFrames:180},
  fixedWallClock:'2026-11-13T21:00:00.000Z',randomSeed:20261113,
};
// Build the fixture once, then pass its report to --fixture for every comparison.
let fixture=inherited?.fixture;
if(!fixture){
  const s=M.freshState();Object.assign(s,{introSeen:true,paused:false,coins:30000,earned:M.LEVELS[19].at,visitorTimer:1e9});s.shop.arrivalTimer=1e9;
  s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.pending=[];M.inviteToVillage(s);M.finishTour(s);
  s.village.quests.invitation={step:3,base:null,done:true};s.village.quests['two-doorbells']={step:3,base:null,done:true};s.village.expansion.effects.push('copse-restored');
  fixture=M.saveData(s);
}
const fixtureSha256=sha(JSON.stringify(fixture));
let route=inherited?.route;
if(!route){
  const legs=[{name:'Green',goals:[{x:87,z:12},{x:98,z:46}]},{name:'Moonclock Square',goals:[{x:87,z:60},{x:87,z:111}]},{name:'Quarry',goals:[{x:87,z:138},{x:87,z:156}]}];
  let from={x:87,z:-25.5};route=[];
  for(const leg of legs){const points=[];for(const goal of leg.goals){const part=findResidentPath(fixture,from,goal);if(!part.length)throw Error('No fixture route to '+JSON.stringify(goal));points.push(...part);from=goal;}route.push({name:leg.name,points});}
}
const report={schema:1,createdAt:new Date().toISOString(),file,htmlSha256:sha(html),htmlBytes:html.length,sourceCommit,checkoutCommit,harnessSha256:sha(await fs.readFile(new URL(import.meta.url))),contract,fixture,fixtureSha256,route,routeSha256:sha(JSON.stringify(route)),contractSha256:sha(JSON.stringify(contract)),
  method:'Exact HTML bytes served unchanged over loopback. Native requestAnimationFrame and real renderer/composer execute throughout. Native Gamepad API mock drives the actual owner/collision/camera route. Eighteen fixed 0.1s controller/view simulation steps per drawn frame accelerate the walk, identically in both builds; 12 stationary actual draws at each of three destinations provide 36 steady samples per traversal. This simulation workload is intentionally accelerated and is not normal gameplay CPU cost. Frame metrics only include RAF callbacks that drew the active village; no held draws, manual renders, readPixels, gl.finish or hardware FPS claim. Renderer.info aggregates every real render pass within each composer draw. First-use and warmed second traversal are separate; the second traversal restores the same saved fixture without clearing GPU resources. Wall clock and Math.random are fixed; animation follows the fixed simulation clock. CPU draw duration excludes asynchronous GPU completion; drawnFrameIntervalMs measures wall time between actual drawn RAF callbacks, including software GPU/browser scheduling. SwiftShader is a relative same-environment comparison, not phone or LG TV performance certification.',
  errors:[],consoleErrors:[],externalRequests:[],passes:[],screenshots:[]};
await fs.mkdir(path.dirname(out),{recursive:true});
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const quantiles=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b),q=p=>a.length?+a[Math.min(a.length-1,Math.ceil(a.length*p)-1)].toFixed(3):null;return{n:a.length,p50:q(.5),p95:q(.95),max:q(1)};};
function summary(rows){return{frames:rows.length,drawnFrameIntervalMs:quantiles(rows.map(r=>r.intervalMs)),rafCallbackCpuMs:quantiles(rows.map(r=>r.callbackMs)),drawCpuMs:quantiles(rows.map(r=>r.drawMs)),drawCalls:quantiles(rows.map(r=>r.calls)),triangles:quantiles(rows.map(r=>r.triangles)),newPrograms:rows.reduce((n,r)=>n+r.newPrograms,0),largeTextureUploads:rows.reduce((n,r)=>n+r.uploads,0)};}
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  report.browserVersion=browser.version();
  const context=await browser.newContext({viewport:contract.viewport,deviceScaleFactor:contract.deviceScaleFactor,hasTouch:contract.hasTouch,reducedMotion:contract.reducedMotion});
  const page=await context.newPage();page.setDefaultTimeout(600000);
  page.on('pageerror',e=>report.errors.push(e.stack??String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  page.on('request',r=>{if(![origin,'data:','blob:'].some(s=>r.url().startsWith(s)))report.externalRequests.push(r.url());});
  await page.addInitScript(({fixture,contract})=>{
    localStorage.clear();localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(fixture));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify(contract.preferences));
    const NativeDate=Date,wall=new NativeDate(contract.fixedWallClock).getTime();class FixedDate extends NativeDate{constructor(...a){super(...(a.length?a:[wall]));}static now(){return wall;}}window.Date=FixedDate;
    let seed=contract.randomSeed>>>0;Math.random=()=>{seed=Math.imul(seed,1664525)+1013904223>>>0;return seed/4294967296;};
    window.__vperf={active:false,rows:[],drawSerial:0,previousStart:null,largeUploads:0};
    for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype])for(const name of ['texImage2D','texSubImage2D']){const original=proto[name];proto[name]=function(...a){const src=a.find(x=>x instanceof HTMLImageElement||x instanceof HTMLCanvasElement||x instanceof ImageBitmap);if(__vperf.active&&src&&src.width*src.height>=256*256)__vperf.largeUploads++;return original.apply(this,a);};}
    const nativeRaf=requestAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>nativeRaf(timestamp=>{
      const q=__vperf,start=performance.now(),serial=q.drawSerial,beforePrograms=window.PumpkinVoxel?.scene.debug.renderer.info.programs?.length??0,uploads=q.largeUploads;
      cb(timestamp);
      if(q.active&&q.drawSerial>serial){const previous=q.previousStart;q.previousStart=start;q.rows.push({...q.lastDraw,intervalMs:previous===null?null:start-previous,callbackMs:performance.now()-start,newPrograms:(PumpkinVoxel.scene.debug.renderer.info.programs?.length??0)-beforePrograms,uploads:q.largeUploads-uploads,phase:q.phase,leg:q.leg,stage:q.stage,position:{...PumpkinVoxel.village.status.position}});if(q.done)q.active=false;}
    });
  },{fixture,contract});
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:600000});await page.waitForSelector('body[data-ready]',{timeout:600000});
  await page.evaluate(({route,contract})=>{
    const p=PumpkinVoxel,d=p.scene.debug,q=__vperf,renderer=d.renderer,gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    q.context={vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),unmaskedVendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION),shadingLanguage:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),timerQueryAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),dpr:devicePixelRatio,drawingBuffer:{width:gl.drawingBufferWidth,height:gl.drawingBufferHeight},pixelRatio:renderer.getPixelRatio()};
    const originalComposer=d.composer.render.bind(d.composer),originalRender=renderer.render.bind(renderer);let inComposer=false;
    const capture=fn=>{const auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();const start=performance.now();try{return fn();}finally{const stats=renderer.info.render;q.lastDraw={drawMs:performance.now()-start,calls:stats.calls,triangles:stats.triangles};q.drawSerial++;renderer.info.autoReset=auto;}};
    d.composer.render=(...a)=>{if(!q.active||!p.village.active)return originalComposer(...a);return capture(()=>{inComposer=true;try{return originalComposer(...a);}finally{inComposer=false;}});};
    renderer.render=(...a)=>q.active&&p.village.active&&!inComposer?capture(()=>originalRender(...a)):originalRender(...a);
    const pad={id:'Village clarity deterministic controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    q.pad=pad;q.nativeGameTick=p.village.tick;q.nativeViewTick=p.scene.villageView.tick;
    q.advance=()=>{
      if(!q.walk||q.done){pad.axes.fill(0);return;}
      const leg=route[q.legIndex],goal=leg.points[q.pointIndex],pos=p.village.status.position;
      q.leg=leg.name;q.stage=q.dwell>0?'dwell':'walk';
      if(q.dwell>0){pad.axes.fill(0);return;}
      const dx=goal.x-pos.x,dz=-(goal.z-pos.z),distance=Math.hypot(dx,dz);
      if(distance<contract.simulation.tolerance){q.pointIndex++;if(q.pointIndex>=leg.points.length){q.dwell=contract.simulation.dwellFrames;q.pointIndex=0;}return q.advance();}
      const camera=p.scene.villageView.camera,right=camera.position.clone().set(1,0,0).applyQuaternion(camera.quaternion),forward=camera.getWorldDirection(camera.position.clone());right.y=forward.y=0;right.normalize();forward.normalize();
      const force=Math.min(.9,distance/(3.3*1.6*contract.simulation.stepSeconds));pad.axes[0]=(dx*right.x+dz*right.z)/distance*force;pad.axes[1]=-(dx*forward.x+dz*forward.z)/distance*force;
    };
    p.village.tick=dt=>{
      if(!q.walk)return q.nativeGameTick(dt);
      for(let i=0;i<contract.simulation.stepsPerDraw;i++){q.advance();q.nativeGameTick(contract.simulation.stepSeconds);if(i+1<contract.simulation.stepsPerDraw)q.nativeViewTick(contract.simulation.stepSeconds);}
      if(q.dwell>0&&--q.dwell===0){q.legIndex++;if(q.legIndex>=route.length){q.done=true;q.walk=false;pad.axes.fill(0);}}
      if(++q.drawTicks>contract.simulation.maxFrames){q.failure='Route exceeded fixed frame budget at '+JSON.stringify(p.village.status);q.done=true;q.walk=false;}
    };
    p.scene.villageView.tick=dt=>q.nativeViewTick(q.walk?contract.simulation.stepSeconds:dt);
    q.begin=phase=>{q.phase=phase;q.rows=[];q.previousStart=null;q.legIndex=0;q.pointIndex=0;q.dwell=0;q.done=false;q.failure=null;q.drawTicks=0;q.leg=route[0].name;q.stage='walk';q.active=true;q.walk=true;pad.axes.fill(0);pad.buttons[7]={pressed:contract.simulation.sprint,value:contract.simulation.sprint?1:0};};
  },{route,contract});
  report.context=await page.evaluate(()=>__vperf.context);
  for(const phase of ['first-use','warmed']){
    console.log('START '+phase+' '+file);
    await page.evaluate(({phase,fixture})=>{const p=PumpkinVoxel,q=__vperf;q.active=false;q.walk=false;q.pad.axes.fill(0);q.pad.buttons.forEach(b=>{b.pressed=false;b.value=0;});if(p.village.active)p.village.close();Object.assign(p.state(),p.rules.restoreState(fixture));p.intro.skip();p.scene.player.setEnabled(true,'shane');if(!p.openVillage())throw Error('Declared fixture could not open village');q.nativeGameTick(0);q.begin(phase);}, {phase,fixture});
    for(let attempt=0;attempt<60;attempt++){
      await page.waitForTimeout(10000);const progress=await page.evaluate(()=>({done:__vperf.done,frames:__vperf.rows.length,leg:__vperf.leg,stage:__vperf.stage,position:PumpkinVoxel.village.status.position}));
      console.log('PROGRESS '+phase+' '+JSON.stringify(progress));if(progress.done)break;if(attempt===59)throw Error('Route timed out');
    }
    const pass=await page.evaluate(()=>({phase:__vperf.phase,rows:__vperf.rows,drawTicks:__vperf.drawTicks,failure:__vperf.failure,finalStatus:PumpkinVoxel.village.status}));
    await page.evaluate(()=>{__vperf.active=false;__vperf.walk=false;__vperf.pad.axes.fill(0);});
    pass.summary=summary(pass.rows);pass.legs=Object.fromEntries(route.map(l=>[l.name,summary(pass.rows.filter(r=>r.leg===l.name))]));
    pass.steady=summary(pass.rows.filter(r=>r.stage==='dwell'));report.passes.push(pass);
    console.log(JSON.stringify({phase,...pass.summary,steady:pass.steady,failure:pass.failure}));
    if(pass.failure)throw Error(pass.failure);
    if(option('--shots','yes')!=='no'){const shot=path.join(path.dirname(out),phase+'-quarry.png');await page.screenshot({path:shot,timeout:120000});report.screenshots.push(shot);}
  }
  await context.close();
}catch(e){report.errors.push(e.stack??String(e));process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));report.ok=!report.errors.length&&!report.consoleErrors.length&&!report.externalRequests.length&&report.passes.length===2;await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log('REPORT '+out);if(!report.ok)process.exitCode=1;}
