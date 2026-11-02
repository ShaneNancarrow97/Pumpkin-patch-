#!/usr/bin/env node
// Exercise the exact offline real-rule lab. No live game save or boot is used.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { buildPreview,sourceInputPath } from './build-preview.mjs';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(pack,'../../../..');
const htmlFile=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Receipt-Lab.html'),out=path.resolve(process.argv[3]??path.join(pack,'verification/browser'));
fs.mkdirSync(out,{recursive:true});
const bytes=fs.readFileSync(htmlFile),sha=b=>createHash('sha256').update(b).digest('hex');
const built=await buildPreview({out:path.join(out,'exact-rebuild.html')});
if(built.sha256!==sha(bytes))throw Error('HTML is stale; rebuild before browser verification');
fs.unlinkSync(path.join(out,'exact-rebuild.html'));
const sourceFiles=new Set(built.inputs.map(name=>path.resolve(sourceInputPath(name))));
for(const name of ['preview/index.html','preview/style.css','preview/ledger.css','preview/assets/OFL-Caveat.txt','preview/assets/SOURCES.json','tools/build-preview.mjs','tools/qa-preview.mjs'])sourceFiles.add(path.join(pack,name));
sourceFiles.add(path.join(repo,'voxel/package-lock.json'));
const sourceHashes=Object.fromEntries([...sourceFiles].sort().map(file=>[path.relative(repo,file).replaceAll(path.sep,'/'),sha(fs.readFileSync(file))]));
const meta={sha256:sha(bytes),sourceHashes,scope:'Private real-rule service lab, not installed gameplay, full-farm balance or physical Fold/PS5 verification.'};
const checks=[],errors=[],externalRequests=[],screenshots=[],layouts=[];let passed=false,browser,page;
const write=()=>fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({...meta,passed,checks,errors,externalRequests,screenshots,layouts},null,2)+'\n');
function check(ok,label,data){checks.push({ok:!!ok,label,...(data===undefined?{}:{data})});write();console.log((ok?'ok  ':'FAIL ')+label);if(!ok)throw Error(label+': '+JSON.stringify(data));}
const server=http.createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}response.setHeader('Content-Type','text/html');response.end(bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
async function frames(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function shot(name,options={}){await page.screenshot({path:path.join(out,name+'.png'),...options});screenshots.push(name+'.png');write();}
const view=()=>page.evaluate(()=>FestivalBridgeLab.view);
const goal=(v,suffix)=>v.festival.active.goals.find(g=>g.id.endsWith(suffix))?.value;
async function open(theme){await page.locator('#theme-choices [data-theme="'+theme+'"]').click();await page.locator('#prepare-night').click();await page.locator('#start-night').click();}
async function fresh(){await page.goto(base);await page.waitForFunction(()=>window.FestivalBridgeLab);await page.evaluate(()=>document.fonts.ready);await frames();}
async function setDetails(id,open=true){const d=page.locator('#'+id);if(await d.evaluate(e=>e.open)!==open)await d.locator(':scope>summary').click();}
const ensureOpen=id=>setDetails(id,true);
const inViewport=async selector=>page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});
async function objective(label,v){
 v??=await view();
 const expected=Math.min(3,v.festival.active?.completedGoals??0),actual=await page.locator('#objective-dial #goal-count').textContent();
 const numbers=actual.match(/\d+/g)?.map(Number);
 check(numbers?.length===2&&numbers[0]===expected&&numbers[1]===3,label+': objective dial follows actual completed goals',{expected,actual});
 const semantics=await page.locator('#objective-dial').evaluate(e=>({role:e.getAttribute('role'),label:e.getAttribute('aria-label')}));
 check(semantics.role==='img'&&semantics.label?.includes(String(expected))&&semantics.label?.includes('3'),label+': objective graphic exposes the actual goal count to assistive technology',semantics);
}
async function ledgerLayout(name){
 const result=await page.evaluate(()=>{
  const left=document.querySelector('.venue').getBoundingClientRect(),right=document.querySelector('.session-card').getBoundingClientRect(),mobile=innerWidth<=740;
  return {mobile,left:left.toJSON(),right:right.toJSON(),ordered:mobile?right.bottom<=left.top+1:left.right<=right.left+1&&Math.abs(left.top-right.top)<1,equalPages:mobile||Math.abs(left.width-right.width)<2};
 });
 check(result.ordered&&result.equalPages,name+': ledger pages read side by side on desktop and in one mobile flow',result);
}
async function functionalType(name){
 const result=await page.evaluate(()=>{
  const selectors=['.operation-copy strong','.offer-meta','.quote-price','#goal-summary','#next-step','#feedback','#latest-amount','#guest-sales','#receipt-amount','#goal-count','.session-actions button','#claim-reward','#choose-next'];
  const samples=selectors.flatMap(selector=>[...document.querySelectorAll(selector)]).filter(e=>e.checkVisibility?e.checkVisibility():!!e.getClientRects().length).map(e=>({text:e.textContent.trim().slice(0,40),font:getComputedStyle(e).fontFamily}));
  return {samples,handwritten:samples.filter(e=>/ledger hand|caveat|cursive/i.test(e.font)),unreviewed:samples.filter(e=>!/DM Sans|Fraunces/.test(e.font))};
 });
 check(result.samples.length>6&&!result.handwritten.length&&!result.unreviewed.length,name+': actions, prices and progress retain readable functional typography',result);
}
async function paperContrast(name){
 const result=await page.evaluate(()=>{
  const rgb=value=>{const n=value.match(/[\d.]+/g)?.map(Number);return n&&n.length>=3?[n[0],n[1],n[2],n[3]??1]:null;};
  const luminance=color=>color.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const samples=[];
  for(const e of document.querySelectorAll('#goal-summary,#next-step,#feedback,.offer-meta,.quote-price,#goal-count,#guest-sales,#receipt-amount')){
   if(!(e.checkVisibility?e.checkVisibility():!!e.getClientRects().length)||e.closest('button:disabled'))continue;
   const page=e.closest('.venue,.session-card'),ink=rgb(getComputedStyle(e).color),paper=page&&rgb(getComputedStyle(page).backgroundColor);
   if(!ink||!paper||ink[3]!==1||paper[3]!==1){samples.push({text:e.textContent.slice(0,40),ratio:null});continue;}
   const a=luminance(ink),b=luminance(paper);samples.push({text:e.textContent.slice(0,40),ink:ink.slice(0,3),declaredPaper:paper.slice(0,3),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
  }
  return {basis:'Computed solid paper base only; decorative gradients are not sampled per pixel.',samples,low:samples.filter(e=>e.ratio===null||e.ratio<4.5)};
 });
 check(result.samples.length>=4&&!result.low.length,name+': functional ink contrasts with the declared paper base at least4.5:1',result);
}
async function legibility(name){
 const result=await page.evaluate(()=>{
  const samples=[...document.querySelectorAll('.offer-meta,.quote-price')].filter(e=>e.checkVisibility?e.checkVisibility():!!e.getClientRects().length).map(e=>({text:e.textContent.trim().slice(0,45),font:parseFloat(getComputedStyle(e).fontSize)}));
  return {samples,small:samples.filter(e=>e.font<10)};
 });
 check(result.samples.length>=4&&!result.small.length,name+': price and stock metadata remain readable without tiny type',result);
}
async function embeddedArt(){
 return page.locator('.operation-buttons .service-art').evaluateAll(async elements=>{
  const result=[];
  for(const element of elements){
   const background=getComputedStyle(element).backgroundImage;
   if(!background.startsWith('url(')){result.push({atlas:element.dataset.atlas,decoded:false});continue;}
   const url=background.slice(4,-1).replace(/^["']|["']$/g,'');
   const image=new Image();image.src=url;
   try{await image.decode();result.push({atlas:element.dataset.atlas,decoded:image.naturalWidth>0&&image.naturalHeight>0,embedded:url.startsWith('data:')||url.startsWith('blob:'),width:image.naturalWidth,height:image.naturalHeight});}
   catch{result.push({atlas:element.dataset.atlas,decoded:false});}
  }
  return result;
 });
}
async function layout(name){
 const result=await page.evaluate(()=>{
  const visible=e=>e.checkVisibility?e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}):!!e.getClientRects().length;
  const controls=[...document.querySelectorAll('button,summary,.check-label')].filter(e=>visible(e)&&!e.closest('[hidden]')&&![...document.querySelectorAll('details:not([open])')].some(d=>d.contains(e)&&d.querySelector(':scope>summary')!==e));
  const rects=controls.map(e=>({label:e.getAttribute('aria-label')??e.textContent.trim().slice(0,50),inScroller:!!e.closest('.theme-choices,.table-scroll'),...e.getBoundingClientRect().toJSON()}));
  const small=rects.filter(r=>r.width<43.5||r.height<43.5),clipped=rects.filter(r=>!r.inScroller&&(r.left<-.5||r.right>innerWidth+.5)),overlaps=[];
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(a.inScroller||b.inScroller)continue;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([a.label,b.label]);}
  const selected=document.querySelector('#theme-choices [aria-pressed=true]'),list=document.querySelector('#theme-choices');const a=list.getBoundingClientRect(),b=selected.getBoundingClientRect();
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,small,clipped,overlaps,selectedVisible:b.left>=a.left-1&&b.right<=a.right+1};
 });layouts.push({name,...result});check(!result.overflow&&!result.small.length&&!result.clipped.length&&!result.overlaps.length&&result.selectedVisible,name+': controls stay distinct, readable and44px',{...result});
}

try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});
 page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(![base,'data:','blob:'].some(prefix=>r.url().startsWith(prefix)))externalRequests.push(r.url());});
 await page.route('**/*',route=>[base,'data:','blob:'].some(prefix=>route.request().url().startsWith(prefix))?route.continue():route.abort());
 await fresh();
 check((await page.locator('.scope-badge').textContent()).includes('Not installed'),'Private scope remains visible');
 check(await page.evaluate(()=>typeof window.PumpkinVoxel==='undefined'&&localStorage.length===0),'The real game does not boot and no player storage is read or created');
 check(await page.evaluate(()=>document.fonts.check('14px "DM Sans"')&&document.fonts.check('28px Fraunces')),'Existing game fonts are embedded and loaded offline');
 check(await page.evaluate(()=>document.fonts.check('24px "Ledger Hand"')&&[...document.fonts].some(face=>face.family.replaceAll('"','')==='Ledger Hand'&&face.status==='loaded')),'Licensed handwritten margin font is embedded and loaded offline');
 check(bytes.includes('SIL OPEN FONT LICENSE Version 1.1')&&bytes.includes('The Caveat Project Authors'),'The standalone ledger retains its embedded font license and attribution');
 const ornaments=await page.locator('#book-ornaments svg').evaluateAll(elements=>elements.map(e=>({hidden:e.getAttribute('aria-hidden'),focusable:e.getAttribute('focusable'),pointerEvents:getComputedStyle(e).pointerEvents})));
 check(ornaments.length>=3&&ornaments.every(e=>e.hidden==='true'&&e.focusable==='false'&&e.pointerEvents==='none'),'Moth and botanical marginalia stay decorative and cannot intercept controls',ornaments);
 check(await page.locator('.book-note,.book-marginalia').evaluateAll(elements=>elements.length>=2&&elements.every(e=>getComputedStyle(e).fontFamily.includes('Ledger Hand')&&!!e.closest('[aria-hidden="true"]'))),'Handwritten flourishes are confined to hidden decorative margin notes');
 await ledgerLayout('Desktop initial');await functionalType('Desktop initial');await paperContrast('Desktop initial');
 check(bytes.length<2*1024*1024,'Illustrated service desk remains a compact offline HTML below2MiB');
 const decoded=await embeddedArt();
 check(decoded.length===4&&decoded.every(item=>item.decoded&&item.embedded)&&new Set(decoded.map(item=>item.atlas)).size===3,'All four service illustrations decode from three embedded reviewed atlases',decoded);
 check(!(await page.locator('#account-inspector').evaluate(e=>e.open))&&await page.locator('#guest-sales').isVisible(),'One primary takings figure is visible while account reconciliation stays collapsed');
 const beforeThemes=await page.evaluate(()=>JSON.stringify(FestivalBridgeLab.controller.snapshot())),identities=[];
 for(const theme of await page.evaluate(()=>FestivalBridgeLab.definitions.themes.map(({id,name})=>({id,name})))){
  await page.locator('#theme-choices [data-theme="'+theme.id+'"]').click();await frames();
  identities.push(await page.evaluate(theme=>({title:document.querySelector('#theme-title').textContent,expected:theme.name,selected:document.querySelector('#theme-choices [aria-pressed=true]')?.dataset.theme===theme.id,crop:getComputedStyle(document.querySelector('#theme-art .art')).backgroundPosition}),theme));
 }
 check(identities.every(item=>item.selected&&item.title===item.expected)&&new Set(identities.map(item=>item.crop)).size===3,'Each evening has its own selected illustrated identity without mixing titles',identities);
 check(await page.evaluate(before=>JSON.stringify(FestivalBridgeLab.controller.snapshot())===before,beforeThemes),'Browsing illustrated invitations does not spend stock, money or simulation time');
 await page.locator('#theme-choices [data-theme="midnight-court-banquet"]').click();await frames();
 check(!(await page.locator('#delivery-inspector').evaluate(e=>e.open)),'Delivery inspection stays collapsed on first load');
 await page.locator('#delivery-inspector').locator(':scope>summary').focus();await page.keyboard.press('Enter');
 check(await page.locator('#delivery-inspector').evaluate(e=>e.open),'Keyboard expands the delivery inspector');await setDetails('delivery-inspector',false);
 await page.evaluate(()=>scrollTo(0,0));await frames();await shot('desktop-initial');
 check(await inViewport('#page-title')&&await inViewport('#prepare-night'),'Desktop initial capture shows the wordmark and first action rather than a scrolled inspector');
 const pristine=await page.evaluate(()=>FestivalBridgeLab.controller.snapshot());
 await page.locator('#prepare-night').focus();await page.keyboard.press('Enter');check((await view()).festival.active.phase==='preparing','Keyboard activates the primary preparation action');
 await page.locator('#start-night').click();
 const quoteWorld=await page.evaluate(()=>JSON.stringify(FestivalBridgeLab.world));
 const quotedFood=await page.locator('#offer-food').textContent();
 await page.evaluate(()=>FestivalBridgeLab.selectTheme('midnight-court-banquet'));
 check(await page.evaluate(before=>JSON.stringify(FestivalBridgeLab.world)===before,quoteWorld),'Rendering current quotes does not reserve stock, allocate visitors, change money or advance the world');
 check(await page.locator('.operation-buttons').evaluate(e=>[...e.querySelectorAll('button')].every(b=>b.getAttribute('aria-label')===b.querySelector('strong').textContent&&document.getElementById(b.getAttribute('aria-describedby')))), 'Visible action labels match accessible names and include quote descriptions');
 check(quotedFood.includes('£78'),'Food action exposes the actual current private quote before payment',quotedFood);
 await ensureOpen('delivery-inspector');await page.locator('#defer-delivery').check();const before=await view();
 await page.locator('#serve-food').click();let v=await view();
 check(v.balances.coinIncrease-before.balances.coinIncrease===78&&v.guests[0].spent===78,'Real food payment reconciles guest debit and private income',v.balances);
 check((await page.evaluate(()=>FestivalBridgeLab.world.kitchen.food['haunted-pie']))===9,'Actual food stock loses exactly three servings');
 check(v.outbox.pending===1&&goal(v,'supper')===0,'Confirmed payment queues before Festival progress is delivered');
 check((await page.locator('#receipt-amount').textContent())==='£78'&&(await page.locator('#receipt-seal').textContent())==='Paid','Paper receipt displays the actual committed amount');
 check((await page.locator('#latest-amount').textContent())==='£78','Compact latest-operation strip displays the same actual committed payment as the paper receipt');
 check((await page.locator('#guest-sales').textContent())==='£78'&&!(await page.locator('#account-inspector').evaluate(e=>e.open)),'Primary takings update from the paid receipt without opening financial inspection');
 await objective('Deferred receipt',v);
 await page.locator('#pause-night').click();const balance=v.balances;await ensureOpen('delivery-inspector');await page.locator('#flush-outcomes').click();v=await view();
 check(v.outbox.pending===1&&goal(v,'supper')===0&&JSON.stringify(v.balances)===JSON.stringify(balance),'Manual pause retains confirmed facts and cannot create another payment');
 await objective('Paused delivery',v);
 await setDetails('delivery-inspector',false);await page.locator('#end-night').click();check((await view()).festival.active.phase==='paused'&&(await page.locator('#feedback').textContent()).includes('Deliver'),'Ending cannot silently discard queued paid evidence');
 check(await page.locator('#delivery-inspector').evaluate(e=>e.open),'A blocked ending opens the delivery inspector so its next step is available');
 await ensureOpen('save-tools');await page.locator('#save-snapshot').click();const saved=await page.evaluate(()=>FestivalBridgeLab.lastSaved);
 check(saved.bridge.pending.length===1&&saved.bridge.festival.active.phase==='paused','Private checkpoint includes the paid fact and a paused session');
 await page.locator('#resume-night').click();await setDetails('delivery-inspector',false);
 check(await page.locator('#deliver-now').isVisible(),'Pending facts expose a direct delivery action without opening technical tools');
 await page.locator('#deliver-now').click();v=await view();
 check(v.outbox.pending===0&&goal(v,'supper')===3&&goal(v,'patrons')===1,'One delivered receipt can advance serving and distinct Court goals');
 check(JSON.stringify(v.balances)===JSON.stringify(balance)&&!(await page.locator('#delivery-inspector').evaluate(e=>e.open)),'Direct delivery preserves money and leaves the inspection drawer collapsed');
 await ensureOpen('delivery-inspector');await page.locator('#replay-outcome').click();await ensureOpen('delivery-inspector');await page.locator('#flush-outcomes').click();v=await view();
 check(goal(v,'supper')===3&&v.ledger.length===1&&JSON.stringify(v.balances)===JSON.stringify(balance),'Replay does not re-charge, remove stock or duplicate progress');
 await objective('Replayed receipt',v);
 await page.locator('#reload-snapshot').click();v=await view();check(v.festival.active.phase==='paused'&&v.outbox.pending===1&&goal(v,'supper')===0,'Reload restores original deferred state rather than inferring delivery');
 await page.locator('#resume-night').click();await ensureOpen('delivery-inspector');await page.locator('#flush-outcomes').click();check(goal(await view(),'supper')===3,'Reloaded facts deliver once after explicit resume');
 await shot('desktop-deferred-recovery');
 const worldBefore=await page.evaluate(()=>JSON.stringify(FestivalBridgeLab.world));await page.locator('#pause-world').check();
 await page.evaluate(()=>FestivalBridgeLab.invoke('serveCocoa'));check(await page.evaluate(before=>{const w=FestivalBridgeLab.world;w.paused=false;return JSON.stringify(w)===before;},worldBefore),'Whole-world pause blocks real service stock and wallet mutation');
 await page.locator('#pause-world').uncheck();
 await fresh();
 for(const [theme,foodCount,rideCount]of [['midnight-court-banquet',4,12],['lanterns-in-the-mist',0,12],['the-last-wagon',2,16]]){
  await page.locator('#theme-choices [data-theme="'+theme+'"]').click();await page.locator('#prepare-night').click();
  if(theme==='lanterns-in-the-mist')for(let i=0;i<3;i++)await page.locator('#harvest-garden').click();
  await page.locator('#start-night').click();
  for(let i=0;i<foodCount;i++)await page.locator('#serve-food').click();
  if(theme==='midnight-court-banquet')await objective('Two completed food/Court objectives',await view());
  if(theme==='midnight-court-banquet')check(await page.locator('#serve-food').isDisabled()&&!(await page.locator('#offer-food').textContent()).includes('£78'),'Exhausted food stock changes the action card to an unavailable state instead of promising another sale');
  if(theme==='lanterns-in-the-mist'){
   const c=await page.evaluate(()=>({drink:FestivalBridgeLab.world.festival.cocoa.extras.deluxe.stock,snack:FestivalBridgeLab.world.festival.cocoa.extras.smores.stock}));
   await page.locator('#serve-cocoa').click();v=await view();check(goal(v,'warm-cups')===1&&v.ledger[0].quantity===2,'Cocoa order pays for drink and snack while only the allowed drink advances its goal');
   check(await page.evaluate(c=>FestivalBridgeLab.world.festival.cocoa.extras.deluxe.stock===c.drink-1&&FestivalBridgeLab.world.festival.cocoa.extras.smores.stock===c.snack-1,c),'Both paid cocoa order lines decrement actual stock');
   for(let i=1;i<16;i++)await page.locator('#serve-cocoa').click();
  }
  for(let i=0;i<rideCount;i++)await page.locator('#run-ride').click();
  v=await view();check(v.festival.active.canFinish&&v.festival.active.completedGoals>=3,theme+': real rules can complete three goals');
  await objective(theme+' ready to finish',v);
  check(v.festival.active.goals.find(g=>g.id.endsWith('goodbyes')).value===0,theme+': no fabricated final departure was counted');
  check(v.balances.ledgerBalanced&&v.guests.every(g=>g.spent===g.initialBudget-g.budget&&g.budget>=0),theme+': finite guest purses and committed revenue reconcile',v.balances);
  if(theme==='the-last-wagon'){check(v.ledger[0].routeLevelAtDeparture===2&&v.ledger[0].simulationSeconds>130,'Ride completion uses captured purchased route and actual simulation time');await shot('desktop-three-goals');}
  await page.locator('#end-night').click();
  if(theme==='midnight-court-banquet'){await page.evaluate(()=>scrollTo(0,0));await shot('desktop-keepsake-ready');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));check(await inViewport('#claim-reward'),'Phone: earned keepsake can be recorded in the first viewport');await shot('phone-keepsake-ready');await page.setViewportSize({width:1280,height:900});}
  check(await page.locator('#completion-card').isVisible()&&/3\s*\/\s*3/.test(await page.locator('#goal-count').textContent())&&await page.locator('#goals .goal-value:visible').count()===0,theme+': completed evening keeps 3/3 objectives and a keepsake card without fabricated individual goal values');
  if(theme==='midnight-court-banquet')check((await page.locator('#completion-card small').textContent()).includes('Physical furniture integration remains separate'),'Keepsake card explicitly distinguishes entitlement from physical furniture');
  await page.locator('#claim-reward').click();
  if(theme==='midnight-court-banquet'){await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await layout('phone keepsake');check(await inViewport('#choose-next'),'Phone: next-evening action is visible with the recorded keepsake');await shot('phone-keepsake-recorded');await page.setViewportSize({width:1280,height:900});}
  check((await view()).festival.ownedRewards.some(r=>r.themeId===theme),theme+': one module entitlement is recorded after completion');
  check(await page.locator('#completion-card').isVisible()&&/3\s*\/\s*3/.test(await page.locator('#goal-count').textContent()),theme+': claiming retains the completed evening presentation');
  if(theme==='midnight-court-banquet'){
   await page.locator('#choose-next').click();
   check(await page.evaluate(()=>FestivalBridgeLab.selectedTheme==='lanterns-in-the-mist'&&FestivalBridgeLab.view.festival.active===null),'Choose-next selects the next unclaimed evening without preparing or charging it');
  }
 }
 check((await page.locator('#choose-next').textContent()).includes('Browse'),'All recorded evenings offer an honest browse action');
 v=await view();check(v.festival.ownedRewards.length===3,'All three module entitlements remain unique');
 const complete=await page.evaluate(()=>FestivalBridgeLab.controller.snapshot());
 const repeated=await page.evaluate(()=>FestivalBridgeLab.invoke('claim','the-last-wagon'));check(repeated.reason==='already-claimed'&&(await view()).festival.ownedRewards.length===3,'A repeated claim cannot add another entitlement');
 const future=structuredClone(complete);future.bridge.version=99;
 check((await page.evaluate(value=>FestivalBridgeLab.loadSnapshot(value),future)).compatible===false,'Future bridge schemas are rejected without resetting the current lab');
 check(await page.evaluate(value=>JSON.stringify(FestivalBridgeLab.controller.snapshot())===JSON.stringify(value),complete),'Rejected imports preserve the existing private checkpoint');
 await ensureOpen('save-tools');await page.locator('#snapshot-json').fill('{');await page.locator('#load-json').click();check((await page.locator('#feedback').textContent()).includes('invalid'),'Invalid JSON is explained without a page error');
 const downloadEvent=page.waitForEvent('download');await page.locator('#export-snapshot').click();const download=await downloadEvent;await download.saveAs(path.join(out,'exported-lab.json'));
 check(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'exported-lab.json'))))===JSON.stringify(complete),'Exported JSON is exactly the detached private checkpoint');
 await page.locator('#prepare-night').click();
 check(/0\s*\/\s*3/.test(await page.locator('#goal-count').textContent())&&(await view()).festival.ownedRewards.length===3,'Host-again starts fresh actual goals while keeping all once-only ownership');
 check(await page.locator('#completion-card').isHidden(),'An active repeat does not show the old completed card');
 check((await page.evaluate(value=>FestivalBridgeLab.loadSnapshot(value),pristine)).accepted===true,'A genuine pristine checkpoint can be restored');
 check((await page.locator('#receipt-amount').textContent())==='—'&&(await page.locator('#receipt-seal').textContent())==='Ready','Restoring empty history clears the old paper receipt');
 await open('midnight-court-banquet');
 const changedShelf=await page.evaluate(()=>{const value=FestivalBridgeLab.controller.snapshot();value.game.kitchen.displays=['moonlight-tart',null];return value;});
 check((await page.evaluate(value=>FestivalBridgeLab.loadSnapshot(value),changedShelf)).accepted===true,'A valid private checkpoint can restore its actual selected food shelf');
 await page.locator('#resume-night').click();
 check((await page.locator('#offer-food').textContent()).includes('£81')&&(await page.locator('#serve-food strong').textContent()).toLowerCase().includes('moonlight'),'Restored shelf quotes and names the actual dish instead of a theme default');
 const restoredArt=await page.locator('#serve-food .service-art').evaluate(e=>({atlas:e.dataset.atlas,index:e.dataset.index,crop:getComputedStyle(e).backgroundPosition}));
 check(restoredArt.atlas==='kitchen-dishes'&&(restoredArt.index==='7'||/100%/.test(restoredArt.crop)),'Restored shelf also changes to the real Moonlight-tart illustration',restoredArt);
 await page.locator('#serve-food').click();v=await view();
 check(v.ledger[0].recipeId==='moonlight-tart'&&v.ledger[0].amount===81&&(await page.locator('#receipt-amount').textContent())==='£81','Actual restored-shelf receipt, quote and ledger recipe agree');

 await fresh();
 for(const [label,width,height]of [['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await frames();await layout(label+' idle');await legibility(label+' idle');await ledgerLayout(label+' idle');await functionalType(label+' idle');await paperContrast(label+' idle');
  check(await page.locator('#prepare-night').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),label+': primary preparation action is in the first viewport');await shot(label+'-idle');
  await page.locator('#prepare-night').click();await page.locator('#start-night').click();await ensureOpen('delivery-inspector');await page.locator('#defer-delivery').check();await setDetails('delivery-inspector',false);await page.locator('#serve-food').click();await page.evaluate(()=>scrollTo(0,0));await frames();await layout(label+' hosting');await legibility(label+' hosting');await ledgerLayout(label+' hosting');await functionalType(label+' hosting');await paperContrast(label+' hosting');await shot(label+'-hosting');
  check(await inViewport('#goal-count'),label+': objective count remains beside the first-viewport service controls');
  if(label==='phone'){
   check(await inViewport('#serve-food')&&await inViewport('#serve-cocoa')&&await inViewport('#harvest-garden')&&await inViewport('#run-ride'),'Phone: all service actions remain in the first hosting viewport');
   check(await inViewport('#latest-operation')&&await inViewport('#feedback'),'Phone: committed result and feedback remain within reach after serving');
   check(!(await page.locator('#delivery-inspector').evaluate(e=>e.open)),'Phone: serving does not expand inspection tools over the goals');
  }
  check(await page.locator('#pause-night').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),label+': service pause remains in the first viewport');
  await ensureOpen('delivery-inspector');await page.locator('#flush-outcomes').click();await page.locator('#end-night').click();
 }
 await page.setViewportSize({width:1280,height:900});await fresh();await open('midnight-court-banquet');await page.emulateMedia({reducedMotion:'no-preference'});await frames();
 let motion=await page.evaluate(()=>FestivalBridgeLab.motion),worldTime=await page.evaluate(()=>FestivalBridgeLab.world.time);await page.locator('#serve-food').click();
 check(await page.evaluate(before=>FestivalBridgeLab.motion.played>before&&FestivalBridgeLab.motion.activeOneShots>0,motion.played),'Normal motion gives actual payments a short receipt/stamp animation');
 check(await page.locator('#session-phase').evaluate(e=>getComputedStyle(e,'::before').animationName)==='lanternBreath','A single quiet service light is animated while running');
 await page.waitForTimeout(550);check(await page.evaluate(()=>FestivalBridgeLab.motion.activeOneShots===0),'One-shot animations release their active bookkeeping after finishing');
 check(await page.evaluate(time=>FestivalBridgeLab.world.time===time,worldTime),'UI motion never advances game time or generates an operation');
 await page.evaluate(()=>scrollTo(0,0));await frames();await shot('desktop-premium-receipt');await shot('desktop-premium-fullpage',{fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>FestivalBridgeLab.motion.reduced&&FestivalBridgeLab.motion.activeOneShots===0);motion=await page.evaluate(()=>FestivalBridgeLab.motion);await page.locator('#serve-cocoa').click();
 check(await page.evaluate(before=>FestivalBridgeLab.motion.played===before&&FestivalBridgeLab.motion.activeOneShots===0,motion.played),'Reduced motion suppresses one-shot animations while real payments still work');
 check(await page.locator('#session-phase').evaluate(e=>getComputedStyle(e,'::before').animationName)==='none','Reduced motion also stops the ambient service light');
 check(errors.length===0&&externalRequests.length===0,'Exact offline lab has no page errors or external requests',{errors,externalRequests});
 check(await page.evaluate(()=>localStorage.length===0),'No player storage was created by service, snapshots or animation');
 passed=true;
}catch(error){meta.failure=String(error);console.error(error.stack??error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{write();await browser?.close();await new Promise(resolve=>server.close(resolve));}
if(!passed)process.exitCode=1;
