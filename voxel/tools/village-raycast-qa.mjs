// Focused integration follow-up: true screen-ray selection plus visual checks
// of the new Moth Tree and reading nook, using the saved restoration checkpoint.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import * as M from '../src/model.js';

const filename=path.resolve(process.argv[2]??'dist/pumpkin-patch-voxel.html'),out=path.resolve(process.argv[3]??'docs/contractor-patches/mothlight-living-village/verification/game');
const html=await fs.readFile(filename),checkpoint=JSON.parse(await fs.readFile(path.join(out,'checkpoint-restorations.json'),'utf8')),fixture=M.restoreState(checkpoint);
if(!M.buyFromStall(fixture,'village:stool'))throw new Error('Checkpoint stool purchase unavailable');
for(const [id,x,z]of [['stool',80.1,37.2],['moth-lamp',74.4,36.9],['reading-stand',74.1,33.9]])if(!M.placeVillageDecor(fixture,id,x,z))throw new Error(`Checkpoint placement rejected: ${id}`);
const report={date:new Date().toISOString(),sha256:createHash('sha256').update(html).digest('hex'),scope:'The prior real-UI restoration checkpoint, with one stool bought and three legal placements prepared through model rules. This focused run selects the placed stool using the actual screen raycaster; no picker callback shortcut is used for that check.',checks:[],screenshots:[],errors:[],externalRequests:[]};
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,detail});console.log(`${pass?'PASS':'FAIL'} ${label}`);};
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.statusCode=204;res.end();return;}res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const click=selector=>page.locator(selector+':visible').first().evaluate(el=>{if(el.disabled)throw new Error('Disabled '+el.textContent);el.click();});
const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:60000});report.screenshots.push(name+'.png');console.log('SHOT '+name+'.png');};
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{const u=r.url();if(!u.startsWith(origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'))report.externalRequests.push(u);});
 await page.addInitScript(data=>{localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(data));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({music:false,sound:false,voiceEnabled:false,mist:false,lakeLights:false}));},M.saveData(fixture));
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForSelector('body[data-ready]',{timeout:180000});await click('[data-tab="more"]');await click('[data-more="village"]');await page.evaluate(()=>PumpkinVoxel.scene.villageView.spritesReady);
 const farmBefore=await page.evaluate(()=>{const s=PumpkinVoxel.state();return{estate:s.estate,stock:s.stock,farmWork:s.farmWork,equipped:s.wardrobe.equipped,owned:[...s.wardrobe.owned]};});
 check(farmBefore.owned.includes('shane-scarecrow'),'Real-UI restoration checkpoint contains Rowan’s authored friendship costume');
 await click('[data-vg-page="people"]');await click('[data-vg-meet="elowen"]');await page.evaluate(()=>{for(let n=0;n<30;n++){const panel=document.getElementById('village-dialogue');if(panel.hidden)break;(panel.querySelector('.village-dialogue-replies:not([hidden]) .village-reply')??panel.querySelector('[data-village-dialogue-next]'))?.click();}});
 const farmAfter=await page.evaluate(()=>{const s=PumpkinVoxel.state();return{estate:s.estate,stock:s.stock,farmWork:s.farmWork,equipped:s.wardrobe.equipped,owned:[...s.wardrobe.owned]};});
 const stable=v=>JSON.stringify({estate:v.estate,stock:v.stock,farmWork:v.farmWork,equipped:v.equipped});
 check(stable(farmBefore)===stable(farmAfter)&&farmBefore.owned.every(id=>farmAfter.owned.includes(id)),'Friendship completion preserves farm stock, garden, equipped outfits and helping hands while retaining owned costumes',{before:farmBefore.owned,after:farmAfter.owned});
 check(farmAfter.owned.includes('natalie-batqueen'),'Elowen’s completed chapter grants her authored rank-five costume');
 await click('#vg-decorate');await page.evaluate(()=>{const v=PumpkinVoxel.scene.villageView;v.cameraActions.place([88,12,23],[80,1,37]);});await settle();
 const picked=await page.evaluate(()=>{const p=PumpkinVoxel,v=p.scene.villageView,piece=p.state().village.decor.placed.find(x=>x.id==='stool'),canvas=document.querySelector('canvas'),rect=canvas.getBoundingClientRect();v.scene.updateMatrixWorld(true);v.camera.updateMatrixWorld(true);const point=v.camera.position.clone().set(piece.x,.3,-piece.z).project(v.camera),screen={x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};v.tapAt(screen.x,screen.y);return{expected:piece.instance,selection:p.village.decorate.status.selection,screen,insideScreen:screen.x>=rect.left&&screen.x<=rect.right&&screen.y>=rect.top&&screen.y<=rect.bottom};});
 check(picked.insideScreen&&picked.selection?.instance===picked.expected,'Projected screen tap selects the actual placed stool through view.tapAt',picked);
 if(picked.selection)await click('.vd-placement [data-vd-action="cancel"]');check(await page.evaluate(()=>PumpkinVoxel.village.decorate.status.selection===null),'Cancel releases the ray-picked stool without moving it');
 await click('.vd-catalogue [data-vd-action="done"]');await click('[data-vg-page="map"]');await click('[data-vg-focus="tree"]');await settle();await shot('desktop-moth-tree-plaza');
 await click('[data-vg-page="map"]');await click('[data-vg-focus="elowen-library"]');await page.evaluate(()=>PumpkinVoxel.scene.villageView.cameraActions.place([86,10,28],[75.5,1.2,35.2]));await settle();await shot('desktop-reading-nook-detail');
 await page.setViewportSize({width:844,height:390});await click('#vg-decorate');
 await page.evaluate(()=>PumpkinVoxel.scene.villageView.cameraActions.place([87,11,-12],[87,5,.9]));await settle();await shot('landscape-connected-gate');
 check(await page.evaluate(()=>PumpkinVoxel.village.decorating), 'Connected gate is reviewed from the landscape decorating camera');
 report.residents=await page.evaluate(()=>PumpkinVoxel.scene.villageView.folk.diagnostics());check(!report.errors.length,'Focused screen-picking flow has no page errors',report.errors);check(!report.externalRequests.length,'Focused full-game view needs no external assets',report.externalRequests);
}catch(e){report.errors.push(e.stack??String(e));console.error(e);if(page)await shot('raycast-failure').catch(()=>{});}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(out,'village-raycast-report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,sha256:report.sha256}));if(!report.passed)process.exitCode=1;
