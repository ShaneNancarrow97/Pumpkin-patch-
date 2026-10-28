// Open the shipped bytes directly from disk, in fresh storage and normal settings.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { freshState } from '../src/model.js';

const file=path.resolve(process.argv[2]??'/workspace/Pumpkin-Patch-Life-Play.html');
const out=path.resolve(process.argv[3]??'/tmp/life-play-offline');fs.mkdirSync(out,{recursive:true});
const result={sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),scope:'Fresh file:// launch in Chromium with default settings; no QA save or preferences. Browser emulation only.',passed:false,checks:[],errors:[],requests:[]};
const check=(ok,label,data)=>{result.checks.push({ok:!!ok,label,data});console.log(ok?'ok':'FAIL',label);if(!ok)throw Error(label);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:874,height:787},hasTouch:true});page.setDefaultTimeout(120000);
page.on('pageerror',e=>result.errors.push(e.message));
page.on('request',r=>{if(!/^(file:|data:|blob:)/.test(r.url()))result.requests.push(r.url());});
try{
 await page.goto(pathToFileURL(file).href);await page.waitForSelector('body[data-ready]');
 await page.waitForFunction(()=>window.PumpkinVoxel?.scene.characterStyle==='sprites');
 const start=await page.evaluate(()=>{const s=PumpkinVoxel.state();return {coins:s.coins,stock:s.stock,level:s.house.level};});
 check(start.coins===freshState().coins&&start.level===freshState().house.level,'The offline file starts with normal money and house progression',start);
 await page.evaluate(()=>PumpkinVoxel.intro?.skip());
 await page.locator('#play-toggle').click();await page.locator('[data-choice="natalie"]').click();
 check(await page.evaluate(()=>PumpkinVoxel.scene.player.state().enabled),'Direct play opens from the offline file');
 await page.screenshot({path:path.join(out,'fresh-offline-fold.png')});
 check(!result.errors.length&&!result.requests.length,'The offline launch has no browser errors or network asset requests',{errors:result.errors,requests:result.requests});
 result.passed=true;
}catch(e){result.failure=String(e);console.error(e.stack??e);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(result,null,2)+'\n');await browser.close();}
