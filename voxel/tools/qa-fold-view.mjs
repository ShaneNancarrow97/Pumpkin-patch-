// Fold framing and shuffle QA against the exact self-contained output.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]};
const file=path.resolve(arg('--html','dist/pumpkin-patch-voxel.html')),out=path.resolve(arg('--shots','qa-fold-view'));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[],check=(ok,label,data)=>{checks.push({ok,label,data});console.log(`${ok?'ok':'FAIL'} ${label}`);if(!ok)throw Error(label)};
try{
 const page=await browser.newPage({viewport:{width:412,height:915},hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({glow:false,shadows:false,music:true,musicShuffle:true,musicTrack:'parade'}))});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('body[data-ready]');
 await page.locator('#open-settings').click();check(await page.locator('#music-track option').count()===9,'nine tracks, including Living Dead Girl');await page.locator('#sheet-close').click();
 await page.evaluate(()=>PumpkinVoxel.scene.focus(15.5,13.5,2));await page.setViewportSize({width:874,height:787});
 await page.waitForFunction(()=>PumpkinVoxel.scene.cameraFraming.width===786&&PumpkinVoxel.scene.cameraFraming.span===46&&PumpkinVoxel.scene.cameraFraming.zoom===1);
 const frame=await page.evaluate(()=>PumpkinVoxel.scene.cameraFraming);check(frame.span===46&&frame.zoom===1,'unfolding resets close zoom and shows the whole farm',frame);
 await page.screenshot({path:path.join(out,'fold-near-square-farm.png')});
 const points=await page.evaluate(()=>[[1,0,3],[39,0,3],[20,0,26],[7,12.7,4]].map(p=>PumpkinVoxel.scene.screenPoint(...p)));
 check(points.every(p=>p.x>=0&&p.x<=frame.width&&p.y>=0&&p.y<=frame.height),'farm, fence and house roof fit inside unfolded canvas',points);
 await page.evaluate(()=>{PumpkinVoxel.state().house.level=3;PumpkinVoxel.enterRoom('parlour')});await page.screenshot({path:path.join(out,'fold-near-square-house.png')});
 const bounds=await page.evaluate(()=>[[200,5.4,0],[214,5.4,0],[200,0,7],[214,0,7]].map(p=>PumpkinVoxel.scene.screenPoint(...p)));
 const size=await page.evaluate(()=>PumpkinVoxel.scene.cameraFraming);check(bounds.every(p=>p.x>=size.width*.03&&p.x<=size.width*.97&&p.y>=size.height*.08&&p.y<=size.height*.92),'the expanded room has comfortable margins',bounds);
 for(const[label,width,height]of[['unfolded-portrait',853,690],['unfolded-rotated',690,853],['desktop',1280,800],['phone',390,844],['phone-landscape',844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>PumpkinVoxel.scene.fitView());
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: no layout overflow`);await page.screenshot({path:path.join(out,`${label}-house.png`)});
 }
 await page.setViewportSize({width:874,height:787});await page.evaluate(()=>{PumpkinVoxel.scene.focus(0,0,1.8)});await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement&&PumpkinVoxel.scene.cameraFraming.zoom===1);check(true,'fullscreen restores a comfortable fitted view');await page.evaluate(()=>document.exitFullscreen());
 await page.locator('#open-settings').click();await page.locator('#music-track').selectOption('living-dead-girl');check(await page.evaluate(()=>PumpkinVoxel.audio.status.track==='living-dead-girl'&&PumpkinVoxel.audio.status.playing),'Living Dead Girl plays through the MIDI synth');
 const chosen=[];for(let i=0;i<10;i++){await page.locator('#next-song').click();chosen.push(await page.evaluate(()=>PumpkinVoxel.audio.status.track))}
 check(chosen.every((id,i)=>!i||id!==chosen[i-1])&&new Set(chosen.slice(0,9)).size===9,'shuffle cycles through all nine tracks without consecutive repeats',chosen);
 await page.locator('#toggle-shuffle').click();check(await page.evaluate(()=>!PumpkinVoxel.audio.status.shuffle),'shuffle can be switched off');await page.locator('#toggle-shuffle').click();await page.locator('#toggle-music').click();await page.locator('#fit-view').click();check(!await page.locator('#sheet').isVisible()&&await page.evaluate(()=>PumpkinVoxel.scene.cameraFraming.zoom===1),'Fit view resets camera and returns to the game');
 check(errors.length===0,'no page or console errors');
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'Software WebGL; bloom and shadows disabled for content screenshots'},null,2));await browser.close();await new Promise(r=>server.close(r))}
