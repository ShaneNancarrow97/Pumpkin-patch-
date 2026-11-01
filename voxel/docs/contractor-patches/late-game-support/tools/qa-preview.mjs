// Inspect the exact offline contractor preview. This never loads a player save.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(pack,'../../../..');
const htmlFile=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Late-Game-Workshop.html');
const out=path.resolve(process.argv[3]??path.join(pack,'verification/preview'));
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(htmlFile),expectedContent=JSON.parse(fs.readFileSync(path.join(pack,'data/festival-themes.json')));
const expectedAudit=JSON.parse(fs.readFileSync(path.join(pack,'findings/attraction-audit.json')));
const checks=[],errors=[],external=[],shots=[],modelViews=[],layouts=[];
let passed=false,browser,page;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceHashes={};
function hashTree(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name);if(item.isDirectory()){if(item.name!=='verification')hashTree(file);}else if(/\.(?:mjs|js|json|css|html|webp)$/.test(file)){sourceHashes[path.relative(repo,file).replaceAll(path.sep,'/')]=sha(fs.readFileSync(file));}}}
hashTree(pack);
for(const file of ['voxel/src/voxels.js','voxel/package-lock.json'])sourceHashes[file]=sha(fs.readFileSync(path.join(repo,file)));
const meta={html:path.basename(htmlFile),sha256:sha(html),started:new Date().toISOString(),sourceHashes,
 scope:'Actual standalone contractor workshop: three real voxel props, pointer/camera controls, context recovery, all proposed night briefs and all18 emitted capacity cases. Not a live-game playtest or device GPU benchmark.'};
function write(){fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({...meta,passed,checks,errors,externalRequests:external,screenshots:shots,modelViews,layouts},null,2)+'\n');}
function check(ok,label,data){checks.push({ok:!!ok,label,...(data===undefined?{}:{data})});write();console.log((ok?'ok  ':'FAIL ')+label);if(!ok)throw Error(label+': '+JSON.stringify(data));}
// Chromium emits ordinary non-interlaced8-bit RGB/RGBA screenshots. Decode only
// that trusted output so pixel checks need no image-processing dependency.
function readPNG(bytes){
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Screenshot is not PNG');
 let width,height,channels;const chunks=[];
 for(let at=8;at+12<=bytes.length;){const length=bytes.readUInt32BE(at),tag=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+length);if(tag==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);if(data[8]!==8||data[12]!==0)throw Error('Unsupported screenshot PNG');channels=data[9]===6?4:data[9]===2?3:0;if(!channels)throw Error('Unsupported PNG colour type');}if(tag==='IDAT')chunks.push(data);at+=length+12;}
 const packed=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(height*stride);
 const paeth=(a,b,c)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
 for(let y=0;y<height;y++){const filter=packed[y*(stride+1)],start=y*stride;for(let x=0;x<stride;x++){const raw=packed[y*(stride+1)+1+x],a=x>=channels?pixels[start+x-channels]:0,b=y?pixels[start+x-stride]:0,c=y&&x>=channels?pixels[start+x-stride-channels]:0;const offset=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;if(!Number.isFinite(offset))throw Error('Unknown PNG filter');pixels[start+x]=(raw+offset)&255;}}
 return{width,height,channels,pixels};
}
function visiblePixels(bytes){const p=readPNG(bytes),crop=[];let bright=0;const x0=Math.floor(p.width*.12),x1=Math.ceil(p.width*.88),y0=Math.floor(p.height*.14),y1=Math.ceil(p.height*.86);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const at=(y*p.width+x)*p.channels,r=p.pixels[at],g=p.pixels[at+1],b=p.pixels[at+2];crop.push(r,g,b);if(.2126*r+.7152*g+.0722*b>80)bright++;}return{width:p.width,height:p.height,bright,centreSHA256:sha(Buffer.from(crop))};}

const server=http.createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}response.setHeader('Content-Type','text/html');response.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const launchOptions={executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
const gpuInstrumentation=()=>{
 const counters={buffers:{created:0,deleted:0},textures:{created:0,deleted:0}};
 const sets={buffers:new Set(),textures:new Set()};
 for(const ctor of [window.WebGLRenderingContext,window.WebGL2RenderingContext].filter(Boolean)){
  for(const[kind,singular]of [['buffers','Buffer'],['textures','Texture']]){
   const proto=ctor.prototype,create=proto['create'+singular],remove=proto['delete'+singular];
   proto['create'+singular]=function(...args){const item=create.apply(this,args);if(item&&!sets[kind].has(item)){sets[kind].add(item);counters[kind].created++;}return item;};
   proto['delete'+singular]=function(item,...args){if(sets[kind].delete(item))counters[kind].deleted++;return remove.call(this,item,...args);};
  }
 }
 window.__workshopGPUCounters=()=>Object.fromEntries(Object.keys(counters).map(key=>[key,{...counters[key],live:sets[key].size}]));
};
async function attach(target){target.setDefaultTimeout(60000);target.on('pageerror',e=>errors.push(e.message));target.on('console',m=>{if(m.type()==='error')errors.push(m.text());});target.on('request',r=>{if(![base,'blob:','data:'].some(prefix=>r.url().startsWith(prefix)))external.push(r.url());});await target.route('**/*',route=>{const url=route.request().url();if(![base,'blob:','data:'].some(prefix=>url.startsWith(prefix)))return route.abort();return route.continue();});}
async function frames(count=2){const token=await page.evaluate(count=>{const token=(window.workshopQAFrame??0)+1;window.workshopQAFrame=token;let seen=0;const step=()=>{if(++seen>=count)window.workshopQAFrameDone=token;else requestAnimationFrame(step);};requestAnimationFrame(step);return token;},count);await page.waitForFunction(token=>window.workshopQAFrameDone>=token,token);}
const status=()=>page.evaluate(()=>LateGameWorkshop.state);
async function shot(name,locator=null){const file=path.join(out,name+'.png');const bytes=locator?await locator.screenshot({path:file}):await page.screenshot({path:file});shots.push(name+'.png');write();return bytes;}
async function chooseTab(name){await page.locator('#tab-'+name).click();check(await page.locator('#panel-'+name).isVisible(),name+' tab opens its own panel');check(await page.locator('[role=tabpanel]:visible').count()===1,'Only the selected workshop panel is visible');}
async function inspectLayout(label){
 const selection=await page.evaluate(()=>[...document.querySelectorAll('.choices')].filter(list=>list.clientWidth).every(list=>{const selected=list.querySelector('[aria-pressed=true]');if(!selected)return false;const a=list.getBoundingClientRect(),b=selected.getBoundingClientRect();return b.left>=a.left-1&&b.right<=a.right+1;}));
 check(selection,label+': the selected catalogue card stays visible after resizing');
 const result=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('button,select,summary')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]'));const rects=nodes.map(n=>({label:n.getAttribute('aria-label')??n.textContent.trim().slice(0,70),inScroller:!!n.closest('.choices,.table-scroll'),...n.getBoundingClientRect().toJSON()}));const small=rects.filter(r=>r.width<43.5||r.height<43.5);const clipped=rects.filter(r=>!r.inScroller&&(r.left<-.5||r.right>innerWidth+.5));const overlaps=[];for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(a.inScroller||b.inScroller)continue;const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(x>1&&y>1)overlaps.push([a.label,b.label]);}return{width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,small,clipped,overlaps};});
 layouts.push({label,...result});check(!result.overflow&&!result.small.length&&!result.clipped.length&&!result.overlaps.length,label+': responsive controls stay distinct and44px',{...result});
}

try{
 browser=await chromium.launch(launchOptions);page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true,reducedMotion:'reduce'});await attach(page);await page.addInitScript(gpuInstrumentation);await page.goto(base);await page.waitForFunction(()=>window.LateGameWorkshop?.state.viewer.ready&&LateGameWorkshop.state.viewer.drawCount>0);await frames();
 check((await page.locator('.scope-badge').textContent()).includes('Not installed in the game'),'Scope badge makes the separate contractor status clear');
 const initial=await status();check(initial.tab==='rewards'&&initial.viewer.ready&&initial.viewer.activeModels===1,'The first view contains one real3D reward model',initial.viewer);
 check(initial.viewer.reducedMotion&&!initial.viewer.spin&&!initial.viewer.rafActive,'Reduced-motion default does not start automatic movement',initial.viewer);
 check(await page.evaluate(expected=>JSON.stringify(LateGameWorkshop.content)===JSON.stringify(expected),expectedContent),'Browser briefs match the checked-in proposal data');
 check(await page.evaluate(expected=>JSON.stringify(LateGameWorkshop.audit)===JSON.stringify(expected),expectedAudit),'Browser audit matches the emitted current-rule evidence');
 const models=await page.evaluate(()=>LateGameWorkshop.rewardMetadata.map(p=>({id:p.id,name:p.name})));
 check(models.length===3&&await page.locator('#reward-choices [data-reward]').count()===3,'All three reward candidates are selectable');
 for(const [index,model]of models.entries()){
  await page.locator('#reward-choices [data-reward="'+model.id+'"]').click();await frames();
  const selected=await status();check(selected.reward===model.id&&selected.viewer.model===model.id&&selected.viewer.activeModels===1,model.name+': selection replaces the previous model',selected.viewer);
  check(selected.viewer.modelStats.boxCount>0&&selected.viewer.drawCalls>0&&selected.viewer.drawCalls<=32,model.name+': actual geometry renders within the preview draw budget',selected.viewer);
  const hashes=[];
  for(const view of ['front','side','back']){
   await page.selectOption('#view-preset',view);await frames();const d=(await status()).viewer;const expectedYaw={front:0,side:Math.PI/2,back:Math.PI}[view];check(Math.abs(d.yaw-expectedYaw)<.001,model.name+': '+view+' preset uses the actual camera');
   const bytes=await shot('model-'+(index+1)+'-'+view,page.locator('#model-stage'));const pixels=visiblePixels(bytes);hashes.push(pixels.centreSHA256);modelViews.push({id:model.id,view,...pixels,viewer:d});check(pixels.bright>250,model.name+': '+view+' has readable rendered pixels',pixels);
  }
  check(new Set(hashes).size===3,model.name+': front, side and back are distinct renders');
 }
 await page.locator('#reset-view').click();await frames();let before=await status();const stage=await page.locator('#model-canvas').boundingBox();await page.mouse.move(stage.x+stage.width*.45,stage.y+stage.height*.45);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.70,stage.y+stage.height*.50,{steps:7});await page.mouse.up();await frames();let after=await status();check(Math.abs(after.viewer.yaw-before.viewer.yaw)>.15,'Dragging the actual canvas rotates the camera',{before:before.viewer.yaw,after:after.viewer.yaw});
 before=after;await page.locator('#zoom-in').click();after=await status();check(after.viewer.radius<before.viewer.radius,'Zoom in moves the real camera closer',{before:before.viewer.radius,after:after.viewer.radius});before=after;await page.locator('#zoom-out').click();after=await status();check(after.viewer.radius>before.viewer.radius,'Zoom out increases the real camera radius');await page.locator('#reset-view').click();after=await status();check(Math.abs(after.viewer.yaw-.65)<.001&&Math.abs(after.viewer.zoom-1)<.001,'Reset returns to the common model framing');
 // A genuine two-pointer pinch, keeping both thumbs in every CDP packet.
 const cdp=await page.context().newCDPSession(page),box=await page.locator('#model-canvas').boundingBox(),cy=box.y+box.height*.53,cx=box.x+box.width*.5;const touch=(id,x)=>({id,x,y:cy,radiusX:5,radiusY:5,force:1});before=await status();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,cx-35),touch(2,cx+35)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,cx-42),touch(2,cx+42)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,cx-65),touch(2,cx+65)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames();after=await status();check(after.viewer.radius<before.viewer.radius,'Two captured touch pointers pinch the real view closer',{before:before.viewer.radius,after:after.viewer.radius});await page.locator('#reset-view').click();
 before=await status();await page.locator('#spin-model').click();await page.waitForFunction(yaw=>Math.abs(LateGameWorkshop.state.viewer.yaw-yaw)>.02,before.viewer.yaw);after=await status();check(after.viewer.spin&&after.viewer.rafActive,'Explicit Auto-turn starts visible camera motion');await page.locator('#spin-model').click();await frames(3);before=await status();await page.waitForTimeout(400);after=await status();check(!after.viewer.spin&&!after.viewer.rafActive&&after.viewer.drawCount===before.viewer.drawCount,'Stopping Auto-turn returns the reduced-motion preview to rest');
 // Each model has different buffers. Warm all three, then verify actual GL
 // buffer ownership plateaus over repeated swaps instead of trusting only
 // renderer.info.geometries (which hides per-instance matrix buffers).
 const resources=[];for(let cycle=0;cycle<4;cycle++)for(const model of models){await page.locator('#reward-choices [data-reward="'+model.id+'"]').click();await frames();resources.push(await page.evaluate(()=>({viewer:LateGameWorkshop.state.viewer,gpu:__workshopGPUCounters()})));}
 const warm=resources.slice(0,3),later=resources.slice(3),maxWarm=Math.max(...warm.map(r=>r.gpu.buffers.live)),geometryWarm=Math.max(...warm.map(r=>r.viewer.geometries));check(later.every(r=>r.viewer.activeModels===1&&r.gpu.buffers.live<=maxWarm+2&&r.viewer.geometries<=geometryWarm+1),'Repeated model swaps release owned GPU buffers and geometry',{warm,tail:resources.slice(-3)});
 await chooseTab('nights');const nightState=await status();check(!nightState.viewer.rafActive,'The hidden model viewer stops its frame loop');
 for(const theme of expectedContent.themes){await page.locator('#night-choices [data-night="'+theme.id+'"]').click();const copy=await page.locator('#night-content').textContent();check(copy.includes(theme.name)&&copy.includes(theme.letter)&&copy.includes('Choose any '+theme.goals.choose+' of '+theme.goals.options.length),theme.name+': letter and flexible proposal goals are rendered');for(const goal of theme.goals.options)check(copy.includes(goal.label),theme.name+': '+goal.id+' appears with its actual target');check(copy.includes('not running in the game')&&copy.includes('not a hard deadline'),theme.name+': implementation and timing limits remain visible');await page.locator('#night-content [data-inspect-reward]').click();await frames();const target=await status();check(target.tab==='rewards'&&target.reward===theme.rewardId,'The night reward link opens its matching actual model');check(await page.locator('#model-stage').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}),'Inspect reward brings its model into view');await page.locator('#see-night').click();check((await status()).theme===theme.id,'The reward links back to the corresponding evening brief');}
 await chooseTab('balance');check((await page.locator('.study-label').textContent()).includes('Not a profit or player-time forecast'),'Capacity evidence is labelled separately from a profit forecast');check(expectedAudit.scenarios.length===18,'The source audit supplies all18 matched cases');
 for(const item of expectedAudit.scenarios){await page.selectOption('#audit-fleet',String(item.config.fleet));await page.selectOption('#audit-ticket',String(item.config.ticketPrice));await page.selectOption('#audit-route',String(item.config.routeLevel));const s=await status(),row=await page.locator('#audit-table tr[aria-current="true"]').locator('th,td').allTextContents();const money=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(item.metrics.ticketRevenue);check(s.fleet===item.config.fleet&&s.ticket===item.config.ticketPrice&&s.route===item.config.routeLevel&&row[1]===item.config.circuitSeconds+'s'&&row[2]===item.config.scareRating+'/100'&&row[3]===new Intl.NumberFormat('en-GB').format(item.metrics.completed)&&row[4]===money,item.label+': displayed evidence matches the emitted scenario',{row});}
 check(await page.locator('#audit-table tr').count()===3,'Each comparison retains all three route lengths');const downloadEvent=page.waitForEvent('download');await page.locator('#download-audit').click();const download=await downloadEvent;await download.saveAs(path.join(out,'downloaded-audit.json'));check(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'downloaded-audit.json'))))===JSON.stringify(expectedAudit),'Saved audit JSON preserves the exact emitted evidence');
 for(const[label,width,height]of [['phone',390,844],['fold',874,787],['landscape',844,390]]){await page.setViewportSize({width,height});for(const tab of ['rewards','nights','balance']){await chooseTab(tab);await page.evaluate(()=>scrollTo(0,0));await frames();await inspectLayout(label+' '+tab);await shot(label+'-'+tab);}}
 await page.setViewportSize({width:874,height:787});await chooseTab('rewards');await page.locator('#model-stage').scrollIntoViewIfNeeded();const capability=(await status()).viewer.contextControlAvailable;meta.contextLossControlAvailable=capability;
 if(capability){await page.evaluate(()=>LateGameWorkshop.viewer.loseContext());await page.waitForFunction(()=>!LateGameWorkshop.state.viewer.ready);check(await page.locator('#model-fallback').isVisible(),'Context loss shows an explicit painted-reference fallback');await shot('context-lost');await page.evaluate(()=>LateGameWorkshop.viewer.restoreContext());await page.waitForFunction(()=>LateGameWorkshop.state.viewer.ready&&LateGameWorkshop.state.viewer.drawCalls>0);await frames();check(!(await page.locator('#model-fallback').isVisible())&&(await status()).viewer.activeModels===1,'Context restoration rebuilds one usable model');await shot('context-restored');}else{meta.contextRecovery='Not tested: WEBGL_lose_context unavailable';}
 check(await page.evaluate(()=>localStorage.getItem('pumpkin-patch-voxel-reference-v1')===null),'The workshop never creates a player save');
 const fallback=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});await attach(fallback);await fallback.goto(base+'/?no3d');await fallback.waitForFunction(()=>window.LateGameWorkshop);check(await fallback.locator('#model-fallback').isVisible()&&!await fallback.evaluate(()=>LateGameWorkshop.state.viewer.ready),'Unavailable WebGL retains the painted reference and contractor controls');await fallback.locator('#tab-balance').click();check(await fallback.locator('#audit-table tr').count()===3,'The evidence remains usable without WebGL');await fallback.screenshot({path:path.join(out,'phone-no3d-fallback.png')});shots.push('phone-no3d-fallback.png');await fallback.close();
 check(errors.length===0&&external.length===0,'The exact offline preview has no page errors or external requests',{errors,external});passed=true;
}catch(error){meta.failure=String(error);console.error(error.stack??error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{write();await browser?.close();await new Promise(resolve=>server.close(resolve));}
if(!passed)process.exitCode=1;
