// Standalone Canvas2D art review: exact pixels and layout, no WebGL gameplay claims.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const voxel=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=path.resolve(arg('--html','/workspace/Pumpkin-Patch-Directional-Art-Review.html'));
const out=path.resolve(arg('--shots',path.join(voxel,'docs/plans/directional-cast/verification/art-bench')));
if(!fs.existsSync(html))throw Error('Build the actual reviewed manifest HTML first: '+html);
fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],external=[],screenshots=[],records=[];
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}if(req.url!=='/'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(html));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const check=(ok,label,details)=>{checks.push({ok:!!ok,label,...(details===undefined?{}:{details})});console.log((ok?'ok ':'FAIL ')+label);if(!ok)throw Error(label);};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--disable-gpu','--no-sandbox']});
let page,passed=false;
try{
 page=await browser.newPage({viewport:{width:1280,height:920},hasTouch:true});
 page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith(base)&&!/^(data|blob):/.test(r.url()))external.push(r.url());});
 await page.route(/^https?:/,route=>route.request().url().startsWith(base)?route.continue():route.abort());
 await page.goto(base);
 await page.waitForFunction(()=>window.DirectionalArtReview&&[...document.images].every(i=>i.complete));
 const summary=await page.evaluate(()=>({looks:Object.keys(DirectionalArtReview.data.looks),owners:Object.values(DirectionalArtReview.data.looks).map(m=>m.owner),pageCount:Object.values(DirectionalArtReview.data.looks).reduce((n,m)=>n+m.pages.length,0)}));
 check(summary.owners.includes('shane')&&summary.owners.includes('natalie'),'both owner looks are present in the actual offline bench',summary);
 await page.locator('#baseline').uncheck();
 await page.locator('#onion').uncheck();
 const set=async(look,action,degree,index=0)=>{
  await page.selectOption('#look',look);await page.selectOption('#action',action);
  await page.locator('#degree').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input'));},degree);
  await page.locator('#scrub').evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input'));},index);
  await page.waitForFunction(()=>{const s=DirectionalArtReview.select();if(!s.frame)return true;const p=document.querySelector('#preview').getContext('2d').getImageData(256,100,768,790).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>24)n++;return n>5000;});
  return page.evaluate(()=>{const s=DirectionalArtReview.select(),c=document.querySelector('#preview'),x=c.getContext('2d'),pixels=x.getImageData(256,100,768,790).data;let alpha=0,hash=2166136261;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>24)alpha++;for(let j=0;j<4;j++)hash=Math.imul(hash^pixels[i+j],16777619);}return{action:s.action,direction:s.direction,requested:s.requestedDegree,index:s.index,mode:s.mode,count:s.frameCount,coverage:s.coverage,phase:s.frame?.phase??null,alpha,hash:hash>>>0,scrubMax:+document.querySelector('#scrub').max,hand:s.frame?.sockets?.hand??null};});
 };
 const capture=async name=>{const file=path.join(out,name);await page.screenshot({path:file,fullPage:true});screenshots.push(name);};
 for(const look of summary.looks){
  const m=await page.evaluate(id=>DirectionalArtReview.data.looks[id],look);
  const idles=m.clips.filter(c=>c.action==='idle');
  check(idles.length===24,look+': all24 neutral bearings have authored clips',{count:idles.length});
  const images=[];
  for(let degree=0;degree<360;degree+=15){
   const r=await set(look,'idle',degree);records.push({look,...r});
   check(r.direction===degree&&r.requested===degree&&r.coverage==='authored',look+': exact nominal idle '+degree+'°');
   check(r.alpha>5000&&r.count>=1&&r.scrubMax===r.count-1,look+': visible decoded idle pixels '+degree+'°',{alpha:r.alpha,count:r.count});
   images.push({degree,src:await page.locator('#preview').evaluate(c=>c.toDataURL('image/png'))});
  }
  const contact=await page.evaluate(async({images,look})=>{const c=document.createElement('canvas');c.width=1536;c.height=1640;const x=c.getContext('2d');x.fillStyle='#1c1725';x.fillRect(0,0,c.width,c.height);for(let i=0;i<images.length;i++){const img=new Image();img.src=images[i].src;await img.decode();const col=i%6,row=Math.floor(i/6);x.drawImage(img,360,120,560,800,col*256,row*400+4,256,366);x.fillStyle='#efcc91';x.font='17px system-ui';x.fillText(look+' · '+images[i].degree+'°',col*256+12,row*400+390);}x.fillStyle='#d4c5d8';x.font='15px system-ui';x.fillText('Actual bench crops. Nominal painted directions; no measured 3D camera claim.',16,1625);return c.toDataURL('image/png');},{images,look});
  fs.writeFileSync(path.join(out,look+'-24-bearings.png'),Buffer.from(contact.split(',')[1],'base64'));screenshots.push(look+'-24-bearings.png');
  const walks=m.clips.filter(c=>c.action==='walk'),cycles=[];
  check(walks.length>0,look+': at least one authored walking bearing exists');
  for(const clip of walks){
   const hashes=new Set(),phases=[];
   for(let i=0;i<clip.frames.length;i++){const r=await set(look,'walk',clip.degree,i);records.push({look,...r});hashes.add(r.hash);phases.push(r.phase);check(r.index===i&&r.count===clip.frames.length&&r.alpha>5000,look+': walk '+clip.degree+'° phase '+i+' draws authored pixels');}
   check(hashes.size===clip.frames.length,look+': walk '+clip.degree+'° has distinct rendered frames',{distinct:hashes.size,frames:clip.frames.length,phases});
   const reduced=clip.mode==='reduced';check(reduced?clip.frames.length===4:clip.frames.length===8,look+': declared walking phase count is honest',{mode:clip.mode??'animation',frames:clip.frames.length});
   cycles.push({degree:clip.degree,mode:clip.mode??'animation',frames:clip.frames.length,phases});
  }
  await set(look,'walk',walks.find(c=>[90,270].includes(c.degree))?.degree??walks[0].degree,1);await page.locator('#onion').check();await capture(look+'-side-walk-onion.png');await page.locator('#onion').uncheck();
  const gestures=m.clips.filter(c=>!['idle','walk','jog'].includes(c.action));
  for(const clip of gestures){
   const hashes=new Set();for(let i=0;i<clip.frames.length;i++){const frame=await set(look,clip.action,clip.degree,i);records.push({look,...frame});hashes.add(frame.hash);check(frame.direction===clip.degree&&frame.index===i&&frame.count===clip.frames.length&&frame.coverage==='authored'&&frame.alpha>5000,look+': '+clip.action+' gesture frame '+i+' renders at its authored bearing');}check(hashes.size===clip.frames.length,look+': '+clip.action+' gesture frames have distinct rendered pixels',{distinct:hashes.size,frames:clip.frames.length});
   const middle=Math.floor(clip.frames.length/2),r=await set(look,clip.action,clip.degree,middle);
   if(clip.action==='water')check(clip.frames.every(f=>f.sockets?.hand&&Number.isFinite(f.sockets.hand.x)&&Number.isFinite(f.sockets.hand.y)),look+': watering frames record finite hand sockets');
   await capture(look+'-'+clip.action+'-gesture.png');
   if(r.hand){await page.evaluate(()=>{const s=DirectionalArtReview.select(),f=s.frame,h=f.sockets.hand,c=document.querySelector('#preview').getContext('2d'),scale=130/f.pixelsPerUnit,x=320+(h.x-f.anchor.x)*scale,y=445+(h.y-f.anchor.y)*scale;c.save();c.setTransform(2,0,0,2,0,0);c.strokeStyle='#ffd18b';c.fillStyle='#ffd18b';c.lineWidth=2;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.moveTo(x-12,y);c.lineTo(x+12,y);c.moveTo(x,y-12);c.lineTo(x,y+12);c.stroke();c.font='13px system-ui';c.fillText('Recorded hand socket',x+14,y-8);c.restore();});await capture(look+'-'+clip.action+'-hand-socket.png');}

  }
  const gap=await page.evaluate(()=>{const m=DirectionalArtReview.data.looks[document.querySelector('#look').value],actions=[...new Set(m.clips.map(c=>c.action))];for(const action of actions)for(let degree=0;degree<360;degree+=15)if(!m.clips.some(c=>c.action===action&&c.degree===degree))return{action,degree};return null;});
  if(gap){
   const missing=await set(look,gap.action,gap.degree);check(missing.coverage==='missing'&&missing.direction===null&&missing.count===0,look+': strict missing bearing stays a production gap',gap);
   await page.locator('#nearest').check();const fallback=await page.evaluate(()=>{const s=DirectionalArtReview.select();return{coverage:s.coverage,requested:s.requestedDegree,actual:s.direction};});check(fallback.coverage==='fallback'&&fallback.requested===gap.degree&&fallback.actual!==gap.degree,look+': explicit nearest checkbox labels fallback',fallback);await page.locator('#nearest').uncheck();
  }
  check(!(await page.evaluate(()=>DirectionalArtReview.coverage().complete)),look+': incomplete full production matrix is never labelled complete');
  await set(look,'idle',0);await page.locator('#baseline').check();await capture(look+'-desktop-art-bench.png');await page.locator('#baseline').uncheck();
  fs.writeFileSync(path.join(out,look+'-coverage.json'),JSON.stringify({look,cycles,gestureClips:gestures.map(c=>({action:c.action,degree:c.degree,frames:c.frames.length})),coverage:await page.evaluate(()=>DirectionalArtReview.coverage())},null,2));
 }
 for(const[name,width,height]of[['phone',390,844],['fold',874,787],['landscape',844,390]]){
  await page.setViewportSize({width,height});const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,small:[...document.querySelectorAll('button,select,label')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,id:e.id,...(({width,height})=>({width,height}))(e.getBoundingClientRect())})).filter(r=>r.width<43.9||r.height<43.9)}));
  check(layout.scroll<=width&&layout.small.length===0,name+': no page overflow and all controls retain44px hit areas',layout);await capture(name+'-art-bench.png');
 }
 await page.evaluate(()=>DirectionalArtReview.draw());await page.waitForTimeout(100);
 check((await page.locator('#load-error').textContent())==='','all embedded atlas pages decode without errors');
 check(external.length===0,'standalone file makes no external network requests',external);
 check(errors.length===0,'no page or console errors',errors);
 passed=true;
}finally{
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({html:path.basename(html),sha256:createHash('sha256').update(fs.readFileSync(html)).digest('hex'),passed,checks,errors,external,screenshots,records,transport:'Exact standalone HTML bytes on localhost; managed Chromium blocks file URLs. All external network requests aborted.',scope:'Canvas2D bench only. Distinct pixel hashes do not prove correct anatomy or exact geometric15degree bearings.'},null,2));
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
