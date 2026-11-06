import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const file=path.resolve(process.argv[2]||'/workspace/Pumpkin-Patch-Sharp-QA.html'),out=path.resolve(process.argv[3]||'/workspace/render-sharpness-qa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[];let page;
const check=(ok,label,data)=>{checks.push({ok,label,data});console.log((ok?'ok ':'FAIL ')+label);if(!ok)throw Error(label);};
try{
 page=await browser.newPage({viewport:{width:874,height:787},deviceScaleFactor:2,hasTouch:true});page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('pumpkin-patch-voxel-reference-v1-prefs'))localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({shadows:false,glow:false,music:false}));});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('body[data-ready]');
 const status=()=>page.evaluate(()=>PumpkinVoxel.scene.renderStatus);
 let s=await status();check(s.quality==='sharp'&&s.pixelRatio===2&&s.postprocessRatio===2&&s.bufferWidth===1748&&s.bufferHeight===1574&&s.postprocessWidth===1748&&s.postprocessHeight===1574,'Sharp keeps Fold full scene and composer at 1748 × 1574',s);
 await page.evaluate(()=>PumpkinVoxel.scene.setBloom(true));s=await status();check(s.antialias==='density'&&s.pixelRatio===s.postprocessRatio&&s.bufferWidth===s.postprocessWidth&&s.bufferHeight===s.postprocessHeight,'enabling glow preserves full scene resolution, and a 2x buffer skips FXAA so sprites stay crisp',s);
 check(Math.abs(s.antialiasResolution[0]-1/1748)<1e-12&&Math.abs(s.antialiasResolution[1]-1/1574)<1e-12,'FXAA (used below 1.75x) samples the physical render buffer rather than CSS pixels',s.antialiasResolution);
 await page.evaluate(()=>{PumpkinVoxel.scene.setBloom(false);PumpkinVoxel.openSheet('settings');});await page.locator('#render-quality').selectOption('balanced');s=await status();check(s.quality==='balanced'&&s.pixelRatio===1.5&&s.postprocessRatio===1.5,'Balanced is an explicit 1.5× scene choice',s);
 await page.locator('#render-quality').selectOption('performance');s=await status();check(s.quality==='performance'&&s.pixelRatio===1&&s.postprocessRatio===1,'Performance is an explicit 1× scene choice',s);
 await page.reload();await page.waitForSelector('body[data-ready]');s=await status();check(s.quality==='performance'&&s.pixelRatio===1,'render detail preference survives reload',s);
 await page.evaluate(()=>PumpkinVoxel.openSheet('settings'));await page.locator('#render-quality').selectOption('sharp');await page.evaluate(()=>PumpkinVoxel.closeSheet());
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>PumpkinVoxel.scene.renderStatus.bufferWidth===780);s=await status();check(s.pixelRatio===2&&s.postprocessWidth===780&&s.postprocessHeight===1688,'folding to a phone recalculates buffers without lowering chosen detail',s);
 await page.setViewportSize({width:874,height:787});await page.waitForFunction(()=>PumpkinVoxel.scene.renderStatus.bufferWidth===1748);
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.visitorTimer=s.shop.arrivalTimer=1e6;s.house.level=3;PumpkinVoxel.enterRoom('parlour');PumpkinVoxel.scene.setBloom(true);});
 await page.screenshot({path:path.join(out,'fold-sharp-room-bloom.png')});check(errors.length===0,'room renders with no browser exceptions',errors);
}catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'Chromium/SwiftShader, Fold DPR2; core configuration checks bloom toggled, final room bloom on. No hardware FPS claim.'},null,2));await browser.close();await new Promise(r=>server.close(r));}
