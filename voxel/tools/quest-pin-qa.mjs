// Reproduce the old completed save+preference pin in Rowan's actual interior.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import * as M from '../src/model.js';
const file=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);await fs.mkdir(out,{recursive:true});const html=await fs.readFile(file);
const s=M.freshState();Object.assign(s,{introSeen:true,earned:M.LEVELS[5].at});s.progression.claimed=[1,2,3,4,5,6];s.village.invited=s.village.toured=true;s.village.quests.invitation={done:true,step:3};s.village.quests['two-doorbells']={done:true,step:3};s.village.built['rowan-workshop']=true;
Object.assign(s.village.expansion,{tracked:'green-research',chapters:{'green-research':true},receipts:{'green-research':{claimed:true}}});
const report={html:file,sha256:createHash('sha256').update(html).digest('hex'),checks:[],errors:[],scope:'Same exact HTML; declared old completed chapter pin in both save and preferences, completed invitation/Two Doorbells and restored Rowan home. Normal SwiftShader at unfolded Fold size. Focused correction of the previous QA hall ID, not a new gameplay change.'};
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1000,height:900}});page.setDefaultTimeout(120000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('pumpkin-patch-voxel-reference-v1',JSON.stringify(save));localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({music:false,voiceEnabled:false,villageTrackedQuest:'green-research'}));},M.saveData(s));
 await page.goto(`http://127.0.0.1:${server.address().port}/game.html`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('body[data-ready]');
 await page.evaluate(()=>{PumpkinVoxel.openVillage();PumpkinVoxel.village.enterHall('rowan-workshop');});await page.waitForTimeout(700);
 const actual=await page.evaluate(()=>{const p=PumpkinVoxel;return{inside:p.village.status.inside,tracked:p.village.status.trackedQuest,saved:p.state().village.expansion.tracked,title:document.querySelector('#vg-quest-title').textContent,hidden:document.querySelector('#vg-objective').hidden,complete:p.state().village.expansion.chapters['green-research'],receipt:p.state().village.expansion.receipts['green-research']};});report.actual=actual;
 for(const [label,pass]of [['Actual Rowan workshop',actual.inside==='rowan-workshop'],['Both old pins no longer appear',actual.tracked!=='green-research'&&actual.saved===null&&actual.title!=='The Ink Beneath the Roots'],['Empty tracker hides',actual.hidden],['Completion and reward receipt remain',actual.complete&&actual.receipt?.claimed]]){report.checks.push({label,pass:!!pass});if(!pass)throw Error(label);}
 await page.screenshot({path:path.join(out,'completed-pin-cleared-rowan.png'),timeout:90000});report.screenshot='completed-pin-cleared-rowan.png';
}catch(e){report.errors.push(e.stack??String(e));}finally{await browser?.close();await new Promise(r=>server.close(r));}
report.passed=!report.errors.length&&report.checks.every(c=>c.pass);await fs.writeFile(path.join(out,'quest-pin-rowan-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
