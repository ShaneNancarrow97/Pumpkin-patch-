import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const file=path.resolve(process.argv[2]||'/workspace/Pumpkin-Patch-Input-QA.html'),out=path.resolve(process.argv[3]||'/workspace/farm-input-qa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const checks=[],errors=[];let page;
const check=(ok,label,data)=>{checks.push({ok,label,data});console.log((ok?'ok ':'FAIL ')+label);if(!ok)throw Error(label);};
try{
 page=await browser.newPage({viewport:{width:1000,height:800},hasTouch:true});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('pumpkin-patch-voxel-reference-v1-prefs',JSON.stringify({renderQuality:'performance',shadows:false,glow:false,music:false})));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('body[data-ready]');
 await page.evaluate(()=>{const s=PumpkinVoxel.state();s.visitorTimer=s.shop.arrivalTimer=1e6;});
 const point=()=>page.evaluate(()=>PumpkinVoxel.scene.screenPoint(7,1.8,15.5));
 const taps=()=>page.evaluate(()=>PumpkinVoxel.state().taps);
 const before=await taps(),p=await point();
 for(const button of ['right','middle'])await page.mouse.click(p.x,p.y,{button});
 check(await taps()===before,'right and middle pumpkin clicks perform no farm actions');
 await page.mouse.click(p.x,p.y);check(await taps()===before+1&&await page.evaluate(()=>PumpkinVoxel.scene.lastPick?.type==='pumpkin'),'left pumpkin click still boosts');
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.evaluate(()=>document.getElementById('world').dispatchEvent(new Event('contextmenu',{cancelable:true})));await page.mouse.up();
 check(await taps()===before+1,'context-menu interruption cancels a pending tap');
 await page.mouse.down();await page.evaluate(()=>document.getElementById('world').dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:1,pointerType:'mouse'})));await page.mouse.up();
 check(await taps()===before+1,'lost capture does not turn its later release into a tap');
 await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();check(await taps()===before+1,'window interruption clears a pending gesture');
 // CDP generates real browser pointer captures with two equal initial positions.
 const cdp=await page.context().newCDPSession(page);await page.evaluate(()=>{window.inputStarts=[];document.getElementById('world').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')window.inputStarts.push({id:e.pointerId,x:e.clientX,y:e.clientY});});});
 const a={id:0,x:500,y:450},b={id:1,x:500,y:450};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[a,b]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[a,{...b,x:501}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const finite=await page.evaluate(()=>{const p=PumpkinVoxel.scene.screenPoint(7,1.8,15.5);return{x:p.x,y:p.y,starts:window.inputStarts,finite:Number.isFinite(p.x)&&Number.isFinite(p.y)};});
 check(finite.finite&&finite.starts.length===2&&finite.starts[0].x===finite.starts[1].x,'coincident two-touch pinch leaves the camera finite',finite);
 await page.evaluate(()=>PumpkinVoxel.scene.fitView());const q=await point();await page.mouse.move(q.x,q.y);await page.mouse.down();await page.evaluate(()=>document.getElementById('world').dispatchEvent(new PointerEvent('pointerup',{pointerId:9999,pointerType:'touch',button:0})));await page.mouse.up();check(await taps()===before+2,'an untracked release does not cancel the real active pointer');await page.waitForFunction(()=>PumpkinVoxel.state().time-PumpkinVoxel.state().lastTap>=.14);await page.mouse.click(q.x,q.y);check(await taps()===before+3,'normal tapping works after interrupted and coincident gestures');
 check(!errors.length,'no browser runtime errors',errors);
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({file,checks,errors,rendering:'Chromium SwiftShader; performance profile, bloom/shadows off; actual mouse buttons and CDP touch input'},null,2));await browser.close();await new Promise(r=>server.close(r));}
