// Review the exact offline build. Test setup lives only in browser storage.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import * as M from '../src/model.js';

const file=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Directional-Cast.html');
const out=path.resolve(process.argv[3]??'/tmp/directional-qa');
const sandyOnly=process.argv.includes('--sandy-only');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(file),checks=[],errors=[],requests=[],shots=[];
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/directional/manifest.json',import.meta.url),'utf8'));
const report={file,sha256:createHash('sha256').update(html).digest('hex'),started:new Date().toISOString(),passed:false,
 scope:'Exact offline game: smaller Sandy, real direct-play bearings, lazy page residency, all legacy costumes, home/action fallback and responsive layouts. Software WebGL is content QA, not a mobile GPU benchmark. Angle and phase anatomy also require the separate visual review bench.'};
const write=()=>fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({...report,checks,errors,requests,shots},null,2));
const check=(ok,label,data)=>{checks.push({ok:!!ok,label,...(data===undefined?{}:{data})});write();console.log((ok?'ok ':'FAIL ')+label);if(!ok)throw Error(label+': '+JSON.stringify(data));};
const seed=M.freshState();seed.introSeen=true;seed.coins=25000;seed.earned=0;
seed.visitorTimer=seed.shop.arrivalTimer=seed.bigSpender.timer=seed.orders.next=1e6;
seed.festival.meadow=true;seed.festival.cocoa.level=3;seed.festival.cocoa.stock=20;
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:874,height:787},hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(120000);
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(![base,'data:','blob:'].some(p=>r.url().startsWith(p)))requests.push(r.url());});
await page.addInitScript(s=>{const key='pumpkin-patch-voxel-reference-v1';localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(key+'-prefs',JSON.stringify({renderQuality:'performance',shadows:false,glow:false,mist:false,lakeLights:false,music:false,sound:false}));},M.saveData(seed));
const frames=async(n=2)=>{const token=await page.evaluate(n=>{const token=(window.castFrame??0)+1;window.castFrame=token;let i=0;const next=()=>{if(++i>=n)window.castFrameDone=token;else requestAnimationFrame(next);};requestAnimationFrame(next);return token;},n);await page.waitForFunction(t=>window.castFrameDone>=t,token);};
const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});shots.push(name);write();};
const dismiss=async()=>{await page.locator('.house-goal-modal [data-later],.level-continue').evaluateAll(ns=>ns.forEach(n=>n.click()));await page.evaluate(()=>{PumpkinVoxel.state().progression.pending=[];PumpkinVoxel.closeSheet();});};
const actorState=()=>page.evaluate(()=>PumpkinVoxel.scene.player.state());
try{
 await page.goto(base);await page.waitForSelector('body[data-ready]');await page.waitForFunction(()=>PumpkinVoxel.scene.characterStyle==='sprites');
 await page.evaluate(()=>PumpkinVoxel.intro?.skip());await dismiss();
 await page.waitForFunction(()=>PumpkinVoxel.scene.festivalStatus.ready);
 await page.evaluate(()=>PumpkinVoxel.scene.focus(48.1,18.9,3.1));await frames();await shot('sandy-cocoa-idle');
 const cashier=await page.evaluate(()=>{let dog;PumpkinVoxel.scene.debug.scene.traverse(o=>{if(o.userData.sandy)dog=o;});return {status:PumpkinVoxel.scene.festivalStatus,width:dog?.children[0]?.children.find(o=>o.customDepthMaterial)?.geometry.parameters.width};});
 check(cashier.status.ready&&cashier.width===1.8,'Sandy has the smaller dedicated cocoa body',cashier);
 await page.evaluate(()=>PumpkinVoxel.state().festival.cocoa.lastSaleAt=PumpkinVoxel.state().time+100);await page.waitForFunction(()=>PumpkinVoxel.scene.festivalStatus.frame===2);await shot('sandy-cocoa-serving');
 await page.evaluate(()=>{PumpkinVoxel.enterRoom('parlour');PumpkinVoxel.closeSheet();});await frames(3);
 const pets=await page.evaluate(()=>{const all=[];PumpkinVoxel.scene.debug.scene.traverse(o=>{if(['sandy at home','skyla at home','maisie at home'].includes(o.name)){const g=o.children[0].children[0].geometry;all.push({name:o.name,width:g.parameters.width,height:g.parameters.height});}});return {status:PumpkinVoxel.scene.petsStatus,all};});
 check(pets.status.length===3&&pets.all.find(p=>p.name==='sandy at home')?.width===1.45,'All three home companions retain their states; Sandy is29% smaller',pets);
 await shot('home-pet-comparison');
 if(!sandyOnly){
  await page.evaluate(()=>{PumpkinVoxel.playControls.start('shane');const p=PumpkinVoxel.scene.player;p.teleport(5,3.8);p.recenter();});await frames();
  const bank=await page.evaluate(()=>PumpkinVoxel.scene.directionalArtStatus);check(bank.looks.includes('shane-base')&&bank.looks.includes('natalie-base'),'Both reviewed base banks are included',bank.looks);
  for(const who of ['shane','natalie']){
   await page.evaluate(who=>{const p=PumpkinVoxel.scene.player;p.select(who);p.teleport(5,3.8);p.recenter();},who);await frames();
   for(const degree of [0,45,90,135,180,225,270,315]){
    await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.input(0,0);p.teleport(5,3.8);});
    const keys={0:['s'],45:['s','d'],90:['d'],135:['w','d'],180:['w'],225:['w','a'],270:['a'],315:['s','a']}[degree];
    for(const key of keys)await page.keyboard.down(key);
    await page.waitForFunction(degree=>{const p=PumpkinVoxel.scene.player.state(),a=p.atlas;return p.viewAngle===degree&&a?.action==='walk'&&['authored','fallback'].includes(a.coverage);},degree);
    const authored=manifest.looks[who+'-base'].clips.some(c=>c.action==='walk'&&c.degree===degree);
    const walked=await actorState(),gap=Math.abs(((walked.atlas?.direction-degree+540)%360)-180);
    check(walked.moving&&walked.atlas?.action==='walk'&&(authored?walked.atlas.direction===degree:gap<=45&&walked.atlas.coverage==='fallback'),`${who}: ${degree}° movement selects ${authored?'its authored gait':'an explicit nearest-bearing fallback'}`,walked.atlas);
    if([0,90,180].includes(degree))await shot(who+'-walking-'+degree);
    for(const key of keys)await page.keyboard.up(key);
    await page.evaluate(()=>{const p=PumpkinVoxel.scene.player;p.input(0,0);p.update(.2,102);p.update(.2,102.2);});
    // Frame diagnostics exercise every real phase, not generated copies.
    const phase=await page.evaluate(({who,degree})=>{const a=PumpkinVoxel.scene.player.figure(),d=a.userData,seen=[];for(let i=0;i<8;i++){d.playerAnimate({who,outfit:who+'-base',viewAngle:degree,walking:true,age:(i+.1)/8});seen.push(d.playerDirectionFrame);}return {seen:[...new Set(seen)],count:d.playerSideFrameCount,scale:a.scale.toArray()};},{who,degree});
    check(phase.seen.length===phase.count&&phase.scale.every(x=>x===1),`${who}: ${degree}° uses all real phases at one unmirrored scale`,phase);
   }
   await page.evaluate(()=>{const p=PumpkinVoxel.scene.player,at=p.state().position;p.input(0,0);p.faceTarget({x:at.x-1,z:at.z});for(let i=0;i<24;i++)p.update(.05,200+i*.05);});await frames(2);
   await page.waitForFunction(()=>PumpkinVoxel.scene.player.state().atlas?.coverage==='authored');
   const still=await actorState();check(still.atlas?.action==='idle'&&still.atlas.direction===still.viewAngle,'Neutral turn stays facing its real bearing after settling',{who,still});
  }
  const legacy=await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state(),results=[];for(const c of a.rules.costumeCatalog){s.wardrobe.equipped[c.character]=c.id;a.scene.refreshLooks();p.select(c.character);const f=p.figure();if(!f){results.push({id:c.id,ok:false});continue;}const calls=[{facing:'front',viewAngle:0},{facing:'side',viewAngle:90},{facing:'back',viewAngle:180}];for(const call of calls){f.userData.playerAnimate({...call,who:c.character,outfit:c.id,walking:true,age:.25,dx:1});const m=f.children[0].children.find(m=>m.isMesh);results.push({id:c.id,ok:!!m.material.map?.image&&!!m.geometry.attributes.position,scale:f.scale.toArray(),atlas:f.userData.playerAtlas?.coverage??null});}}s.wardrobe.equipped={shane:'shane-base',natalie:'natalie-base'};a.scene.refreshLooks();p.select('natalie');return results;});
  check(legacy.length===60&&legacy.every(r=>r.ok&&r.scale.every(Number.isFinite)),'All20 equipped looks retain their own front, side and back rendering',legacy);
  await page.evaluate(()=>{const a=PumpkinVoxel,p=a.scene.player,s=a.state();a.leavePlace();p.teleport(20,15);p.recenter();s.plots[0]={phase:'growing',progress:.1,variety:0};const t=p.targets().find(t=>t.type==='plot'&&t.index===0);p.teleport(t.x-1,t.z);p.act('water',30,t);});await frames(2);
  const water=await actorState();check(water.waterCanVisible&&water.waterCanStyle==='sprite','The illustrated watering can and existing action path remain available',water.atlas);await shot('watering-can');await page.evaluate(()=>PumpkinVoxel.scene.player.cancelAction());
  // Page cache is bounded after repeatedly requesting both owners and directions.
  const residency=await page.evaluate(()=>PumpkinVoxel.scene.directionalArtStatus);check(residency.residentPages<=residency.pageLimit&&residency.pageLimit===4&&!residency.errors.length,'Reviewed pages remain within the four-page cache',residency);
  for(const [label,width,height]of [['phone',390,844],['fold',874,787],['landscape',844,390]]){
   await page.setViewportSize({width,height});await frames(2);const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:[...document.querySelectorAll('#play-controls button')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]')).map(n=>n.getBoundingClientRect()).filter(r=>r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5).length}));check(!layout.overflow&&!layout.clipped,label+': control layout stays within the playfield',layout);await shot(label+'-controls');
  }
 }
 check(errors.length===0&&requests.length===0,'Offline game reports no page errors or external runtime requests',{errors,requests});report.passed=true;
}catch(e){report.failure=String(e);console.error(e.stack??e);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{write();await browser.close();await new Promise(r=>server.close(r));}
if(!report.passed)process.exitCode=1;
