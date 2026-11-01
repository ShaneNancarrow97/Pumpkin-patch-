#!/usr/bin/env node
// Tests the exact offline rule demo. Fixture outcomes are synthetic; this is not
// a live-farm economy, save-migration, controller or physical-device playtest.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(pack,'../../../..');
const htmlFile=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Festival-Nights.html');
const out=path.resolve(process.argv[3]??path.join(pack,'verification/preview'));
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(htmlFile),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const definitions=JSON.parse(fs.readFileSync(path.join(pack,'../late-game-support/data/festival-themes.json')));
const checks=[],errors=[],external=[],shots=[],layouts=[];let browser,page,passed=false;
const sourceHashes={};
// Fingerprint the inputs actually exercised by this offline browser and its
// builder/harness. Readiness adapters, native tests and the separate impact
// matrix are not bundled here and have their own verification records.
for(const name of ['src/engine.js','preview/app.js','preview/index.html','preview/style.css','tools/build-preview.mjs','tools/qa-preview.mjs']){
 const file=path.join(pack,name);sourceHashes[path.relative(repo,file).replaceAll(path.sep,'/')]=sha(fs.readFileSync(file));
}
for(const name of ['voxel/docs/contractor-patches/late-game-support/data/festival-themes.json','voxel/docs/contractor-patches/late-game-support/art/menu-icons.webp','voxel/package-lock.json'])sourceHashes[name]=sha(fs.readFileSync(path.join(repo,name)));
const meta={html:path.basename(htmlFile),sha256:sha(html),started:new Date().toISOString(),sourceHashes,
 scope:'Offline Festival Night contractor rule demo: real reducer, readiness display and save parser, driven by explicitly synthetic outcome fixtures. No live purchases, guest flow, rewards or game saves are installed or tested.'};
function write(){fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({...meta,passed,checks,errors,externalRequests:external,screenshots:shots,layouts},null,2)+'\n');}
function check(ok,label,data){checks.push({ok:!!ok,label,...(data===undefined?{}:{data})});write();console.log((ok?'ok  ':'FAIL ')+label);if(!ok)throw Error(label+': '+JSON.stringify(data));}
const server=http.createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
async function frames(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function snapshot(){return page.evaluate(()=>({state:FestivalSessionDemo.state,view:FestivalSessionDemo.view,context:FestivalSessionDemo.context,selected:FestivalSessionDemo.selectedTheme,last:FestivalSessionDemo.lastResult}));}
async function send(command){return page.evaluate(c=>{const r=FestivalSessionDemo.dispatch(c);return {accepted:r.accepted,changed:r.changed,reason:r.reason,effects:r.effects};},command);}
async function stamp(){return page.evaluate(()=>FestivalSessionDemo.engine.stamp(FestivalSessionDemo.state,FestivalSessionDemo.context));}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});shots.push(name+'.png');write();}
async function top(){await page.evaluate(()=>scrollTo(0,0));await frames();}
async function openDetails(id){await page.locator('#'+id).evaluate(el=>{el.open=true;});await frames();}
async function click(id){await page.locator('#'+id).click();await frames();}
async function choose(id){await page.locator('#theme-choices [data-theme="'+id+'"]').click();await frames();check((await snapshot()).selected===id,'Theme choice selects '+id);}
const valueOf=(s,id)=>s.view.active?.goals.find(g=>g.id===id)?.value??0;
async function fillGoal(goalId,control){
 let s=await snapshot(),goal=s.view.active?.goals.find(g=>g.id===goalId);if(!goal)throw Error('Missing active goal '+goalId);
 let attempts=0;
 while(goal.value<goal.target){const before=goal.value;await click(control);s=await snapshot();goal=s.view.active.goals.find(g=>g.id===goalId);if(goal.value<=before)throw Error(control+' did not advance '+goalId);if(++attempts>goal.target+2)throw Error('Fixture loop exceeded goal bound');}
 check(goal.value===goal.target,'Actual fixture control reaches capped goal '+goalId,{attempts,value:goal.value,target:goal.target});
}
async function inspectLayout(label){
 const result=await page.evaluate(()=>{
  const visible=n=>{
   if(!n.getClientRects().length||n.closest('[hidden]'))return false;
   if(typeof n.checkVisibility==='function'&&!n.checkVisibility({checkVisibilityCSS:true}))return false;
   for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope > summary')?.contains(n))return false;
   return true;
  };
  const nodes=[...document.querySelectorAll('button,select,summary,textarea,input[type=checkbox]')].filter(visible);
  const targets=[...new Set(nodes.map(n=>n.matches('input[type=checkbox]')?n.closest('label')??n:n))];
  const rects=targets.map(n=>({label:n.getAttribute('aria-label')??n.textContent.trim().slice(0,65),scroller:!!n.closest('.theme-choices'),...n.getBoundingClientRect().toJSON()}));
  const small=rects.filter(r=>r.width<43.5||r.height<43.5),clipped=rects.filter(r=>!r.scroller&&(r.left<-.5||r.right>innerWidth+.5)),overlaps=[];
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(a.scroller||b.scroller)continue;const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(x>1&&y>1)overlaps.push([a.label,b.label]);}
  const list=document.getElementById('theme-choices'),selected=list.querySelector('[aria-pressed=true]'),a=list.getBoundingClientRect(),b=selected.getBoundingClientRect();
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,small,clipped,overlaps,selectionVisible:b.left>=a.left-1&&b.right<=a.right+1};
 });
 layouts.push({label,...result});check(!result.overflow&&!result.small.length&&!result.clipped.length&&!result.overlaps.length&&result.selectionVisible,label+': no overlap/overflow,44px targets and visible selected card',result);
}
async function firstActionVisible(label,id){
 const rect=await page.locator('#'+id).boundingBox(),viewport=page.viewportSize();
 check(rect&&rect.x>=-.5&&rect.y>=-.5&&rect.x+rect.width<=viewport.width+.5&&rect.y+rect.height<=viewport.height+.5,label+': the first session action is fully visible without scrolling',{control:id,rect,viewport});
}

try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(![base,'data:','blob:'].some(prefix=>r.url().startsWith(prefix)))external.push(r.url());});
 await page.route('**/*',route=>[base,'data:','blob:'].some(prefix=>route.request().url().startsWith(prefix))?route.continue():route.abort());
 await page.goto(base);await page.waitForFunction(()=>window.FestivalSessionDemo);await frames();
 check(await page.locator('.scope-badge').textContent().then(t=>t.includes('Contractor rule demo')&&t.includes('Not installed in the game')),'First view clearly labels the uninstalled contractor demo');
 check(await page.locator('#fixture-controls').textContent().then(t=>t.includes('Synthetic receipts')&&t.includes('no live purchases')),'Fixture controls explicitly disclose synthetic transactions');
 check(await page.locator('#theme-choices [data-theme]').count()===3,'All three evening choices are present');
 check(await page.evaluate(expected=>JSON.stringify(FestivalSessionDemo.definitions)===JSON.stringify(expected),definitions),'The UI uses the actual previous-pack theme definitions');
 check(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&document.getAnimations().filter(a=>a.playState==='running').length===0),'Reduced-motion view starts without automatic movement');
 check(!await page.locator('#fixture-controls').evaluate(n=>n.open)&&!await page.locator('#save-tools').evaluate(n=>n.open),'Diagnostic drawers start collapsed');
 check(await page.locator('#feedback[role=status][aria-live=polite]').count()===1,'Feedback has a polite screen-reader status surface');
 await top();await shot('desktop-initial');await inspectLayout('desktop initial');

 // Native keyboard activation of real choice/action buttons.
 await page.locator('[data-theme="lanterns-in-the-mist"]').focus();await page.keyboard.press('Enter');
 check((await snapshot()).selected==='lanterns-in-the-mist','Keyboard Enter selects the focused evening');
 const focus=await page.locator('[data-theme="lanterns-in-the-mist"]').evaluate(n=>({active:document.activeElement===n,outline:getComputedStyle(n).outlineStyle}));
 check(focus.active&&focus.outline!=='none','Keyboard focus remains visible on the selected theme',focus);
 await choose('midnight-court-banquet');await openDetails('fixture-controls');
 await page.selectOption('#fixture-level','12');
 check(await page.locator('#prepare-night').isDisabled()&&(await page.locator('#readiness').textContent()).includes('13'),'Level12 visibly blocks the level13 evening');
 const locked=await send({type:'prepare',themeId:'midnight-court-banquet'});check(!locked.accepted&&!(await snapshot()).view.active,'A diagnostic command cannot bypass the visible level gate',locked);
 await page.selectOption('#fixture-level','18');
 await page.evaluate(()=>FestivalSessionDemo.setContext({kitchenCapabilities:[]}));
 await page.locator('#prepare-night').focus();await page.keyboard.press('Space');await frames();
 check((await snapshot()).view.active?.phase==='preparing','Keyboard Space prepares the actual session');
 check(await page.locator('#start-night').isDisabled()&&(await page.locator('#readiness').textContent()).includes('equipment'),'Missing kitchen capabilities appear in readiness and prevent opening');
 await top();await shot('desktop-kitchen-readiness');
 await page.evaluate(()=>FestivalSessionDemo.setContext({kitchenCapabilities:['hob','pot','oven','tray','spice']}));
 await click('start-night');check((await snapshot()).view.active.phase==='running','The actual start button opens a fully prepared evening');
 check(await page.locator('#goals [data-goal]').count()===4,'A running evening displays all four alternative goals');

 await click('fixture-food');let before=await snapshot();check(valueOf(before,'court-supper')===4,'One clearly labelled food fixture advances four paid menu servings');
 await click('fixture-tick');check((await snapshot()).view.active.elapsedSeconds===30,'Hosting time advances only on the explicit simulation tick');
 await click('pause-night');before=await snapshot();
 check(await page.locator('#fixture-food').isDisabled()&&await page.locator('#fixture-tick').isDisabled(),'Manual pause disables service fixture controls');
 let result=await send({type:'tick',seconds:30});check(!result.accepted&&JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'Manual pause freezes reducer time even through the diagnostic dispatch');
 const held={...(await page.evaluate(()=>({sessionId:FestivalSessionDemo.state.active.id,window:'service'}))),kind:'food-sale',source:'food',id:'qa-held-food',guestId:'visitor:0',recipeId:'haunted-pie',quantity:1,amount:12};
 result=await send({type:'outcome',event:held});check(!result.accepted&&JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'Manual pause freezes confirmed-outcome progress');
 await click('resume-night');await page.locator('#global-pause').check();before=await snapshot();
 check(await stamp()===null,'Global pause prevents producing a new session stamp');
 result=await send({type:'tick',seconds:30});check(!result.accepted&&JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'Global pause freezes hosting time');
 result=await send({type:'outcome',event:held});check(!result.accepted&&JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'Global pause freezes a captured service outcome');
 await page.locator('#global-pause').uncheck();result=await send({type:'outcome',event:held});
 check(result.changed&&valueOf(await snapshot(),'court-supper')===5,'The same valid queued fact can be retried after resuming');

 await openDetails('save-tools');before=await snapshot();await click('save-session');
 const saved=JSON.parse(await page.locator('#snapshot-json').inputValue());
 check(saved.active.phase==='paused'&&before.view.active.phase==='running','Saving records paused service without pausing the running in-memory demo');
 await click('reload-session');let current=await snapshot();
 check(current.view.active.phase==='paused'&&current.view.active.elapsedSeconds===before.view.active.elapsedSeconds&&valueOf(current,'court-supper')===5,'Reload retains progress/time and resumes in a paused state');
 await click('resume-night');before=await snapshot();await click('fixture-replay');current=await snapshot();
 check(JSON.stringify(current.state)===JSON.stringify(before.state),'Replaying an already counted fixture after reload adds no progress');
 const oldId=current.view.active.id;await click('end-night');current=await snapshot();
 check(!current.view.active&&!current.state.completedThemes.length&&!current.view.ownedRewards.length&&current.view.history[0].outcome==='ended','Ending an incomplete evening has no cosmetic or farm-reset penalty');
 await click('prepare-night');await click('start-night');current=await snapshot();
 check(current.view.active.id!==oldId,'A replacement evening has a new persisted session token');before=current;await click('fixture-replay');
 check(JSON.stringify((await snapshot()).state)===JSON.stringify(before.state)&&(await snapshot()).last?.reason==='old-session','An old outcome is not retagged into the replacement evening');

 await fillGoal('court-supper','fixture-food');await fillGoal('court-patrons','fixture-vip');await fillGoal('court-frights','fixture-attraction');current=await snapshot();
 check(current.view.active.completedGoals===3&&valueOf(current,'court-goodbyes')===0&&current.view.active.canFinish,'Any three complete goals suffice; the fourth can remain untouched');
 await top();await shot('desktop-three-goals-ready');await click('end-night');current=await snapshot();
 check(current.view.pendingRewards.length===1&&current.view.ownedRewards.length===0,'A completed ended evening earns one pending cosmetic entitlement');
 await click('claim-reward');current=await snapshot();check(current.view.ownedRewards.length===1&&current.view.pendingRewards.length===0,'The claim button records the earned keepsake once');
 before=current;result=await send({type:'claim',themeId:'midnight-court-banquet'});
 check(!result.accepted&&result.reason==='already-claimed'&&JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'A repeated claim cannot produce another entitlement');
 await click('save-session');await click('reload-session');check((await snapshot()).view.ownedRewards.length===1,'Permanent cosmetic ownership survives save/reload');

 await choose('lanterns-in-the-mist');await click('prepare-night');
 await fillGoal('mist-garden-basket','fixture-harvest');current=await snapshot();
 check(current.view.active.phase==='preparing'&&current.view.active.elapsedSeconds===0,'Successful garden fixture harvests count during untimed preparation');
 await click('start-night');await click('fixture-cocoa');before=await snapshot();
 const cocoa={...(await stamp()),kind:'cocoa-sale',source:'cocoa',id:'qa-cocoa-with-snack',guestId:'customer:0',amount:30,lines:[{productId:'cocoa',quantity:2},{productId:'smores',quantity:9}]};
 await send({type:'outcome',event:cocoa});current=await snapshot();
 check(valueOf(current,'mist-warm-cups')===valueOf(before,'mist-warm-cups')+2,'A paid cocoa receipt counts drink lines and excludes snack quantities');
 await fillGoal('mist-warm-cups','fixture-cocoa');await fillGoal('mist-lantern-walk','fixture-attraction');
 check((await snapshot()).view.active.completedGoals===3,'Lanterns can complete through garden, cocoa and attraction alternatives');
 await click('end-night');await click('claim-reward');check((await snapshot()).view.ownedRewards.length===2,'Lanterns grants its own unique cosmetic');

 await choose('the-last-wagon');await click('prepare-night');await click('start-night');
 const firstRoute={...(await stamp()),kind:'attraction-completed',source:'hayride',id:'qa-original-circuit',guestId:'visitor:queue-zero',paid:true,paidAmount:12,queueSecondsAtBoarding:20,routeLevelAtDeparture:0};
 await send({type:'outcome',event:firstRoute});current=await snapshot();
 check(valueOf(current,'wagon-full-trail')===0&&valueOf(current,'wagon-smooth-boarding')===1,'An original-route paid completion counts its short queue but not the extended route');
 before=current;await send({type:'outcome',event:{...firstRoute,routeLevelAtDeparture:2}});
 check(JSON.stringify((await snapshot()).state)===JSON.stringify(before.state),'A previously counted completion cannot be reinterpreted after a route upgrade');
 const longWait={...firstRoute,id:'qa-long-queue',guestId:'visitor:long-wait',routeLevelAtDeparture:2,queueSecondsAtBoarding:46};
 await send({type:'outcome',event:longWait});current=await snapshot();
 check(valueOf(current,'wagon-full-trail')===1&&valueOf(current,'wagon-smooth-boarding')===1,'Captured46-second queue time does not pass the45-second goal');
 await fillGoal('wagon-full-trail','fixture-attraction');await fillGoal('wagon-sweet-return','fixture-food');current=await snapshot();
 check(current.view.active.completedGoals===3&&valueOf(current,'wagon-fond-goodbyes')===0,'Last Wagon can finish through route, boarding and takeaway service');
 await click('end-night');await click('claim-reward');current=await snapshot();
 check(current.view.ownedRewards.length===3&&new Set(current.view.ownedRewards.map(r=>r.grantKey)).size===3,'All three cosmetics have distinct stable once-only claim keys');
 await top();await shot('desktop-all-keepsakes');

 // Real textarea import paths must keep current progress on unsupported/bad JSON.
 await openDetails('save-tools');before=await snapshot();const unsafe=await page.evaluate(()=>({...FestivalSessionDemo.snapshot(),version:999}));
 await page.locator('#snapshot-json').fill(JSON.stringify(unsafe));await click('load-json');
 check(JSON.stringify((await snapshot()).state)===JSON.stringify(before.state)&&(await page.locator('#feedback').textContent()).includes('Unsupported'),'Unsupported future JSON is rejected without overwriting current entitlements');
 await page.locator('#snapshot-json').fill('{broken-json');await click('load-json');
 check(JSON.stringify((await snapshot()).state)===JSON.stringify(before.state)&&(await page.locator('#feedback').textContent()).includes('not valid JSON'),'Malformed JSON leaves current demo progress intact');
 const downloadEvent=page.waitForEvent('download');await click('export-session');const download=await downloadEvent;await download.saveAs(path.join(out,'exported-demo.json'));
 check(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'exported-demo.json'))))===JSON.stringify(await page.evaluate(()=>FestivalSessionDemo.snapshot())),'Exported JSON equals the actual serialized module state');

 // Corrupt only active progress: valid permanent ownership must remain.
 await choose('midnight-court-banquet');await click('prepare-night');await click('start-night');await click('fixture-food');
 const corrupt=await page.evaluate(()=>{const raw=FestivalSessionDemo.snapshot(),records=raw.active.progress['court-supper'];records.push(structuredClone(records[0]));return raw;});
 await page.locator('#snapshot-json').fill(JSON.stringify(corrupt));await click('load-json');current=await snapshot();
 check(!current.view.active&&current.view.ownedRewards.length===3&&(await page.locator('#feedback').textContent()).includes('corrupt active'),'Corrupt active records are dropped with a warning while valid ownership survives');

 for(const[label,width,height]of [['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});await page.locator('#fixture-controls').evaluate(n=>n.open=false);await page.locator('#save-tools').evaluate(n=>n.open=false);await top();
  await choose('the-last-wagon');await top();await inspectLayout(label+' idle');if(height>=700)await firstActionVisible(label+' idle','prepare-night');await shot(label+'-idle');
  await click('prepare-night');await click('start-night');await top();await inspectLayout(label+' hosting');if(height>=700)await firstActionVisible(label+' hosting','pause-night');await shot(label+'-hosting');
  await click('open-fixtures');await inspectLayout(label+' fixture drawer');await shot(label+'-fixtures');
  await click('end-night');
 }
 check((await snapshot()).view.ownedRewards.length===3,'Repeated/incomplete layout sessions never duplicate permanent rewards');
 check(await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0),'The demo never creates a browser game save or storage record');
 check(errors.length===0&&external.length===0,'The exact standalone demo has no page errors or external requests',{errors,external});
 passed=true;meta.finished=new Date().toISOString();fs.rmSync(path.join(out,'failure.png'),{force:true});
}catch(error){meta.failure=String(error);console.error(error.stack??error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{write();await browser?.close();await new Promise(resolve=>server.close(resolve));}
if(!passed)process.exitCode=1;
