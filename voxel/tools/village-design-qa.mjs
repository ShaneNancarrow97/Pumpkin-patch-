// Visual review of the shipped village explorer, using one software renderer.
//   node tools/village-design-qa.mjs [file.html] [output-dir] [--final]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { chromium } from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const filename=path.resolve(process.argv[2]??path.join(root,"dist/mothlight-village.html"));
const final=process.argv.includes("--final"), phase=final?"final":"baseline";
const output=path.resolve(process.argv[3]??path.join(root,"docs/contractor-patches/village-design-and-cast/verification",phase));
await fs.mkdir(output,{recursive:true});
const html=await fs.readFile(filename), report={phase,html:path.basename(filename),date:new Date().toISOString(),bytes:html.length,sha256:createHash("sha256").update(html).digest("hex"),scope:"Actual explorer in Chromium/SwiftShader. Viewport emulation is not physical Fold or controller certification.",checks:[],metrics:[],screenshots:[],errors:[],externalRequests:[]};
const check=(pass,label,detail)=>{report.checks.push({pass:!!pass,label,...(detail===undefined?{}:{detail})});console.log(`${pass?"PASS":"FAIL"} ${label}`);};
const server=createServer((req,res)=>{if(req.url==="/favicon.ico"){res.statusCode=204;res.end();return;}res.setHeader("Content-Type","text/html");res.end(html);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser,page;
const settle=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const screenshot=async name=>{const file=`${phase}-${name}.png`;await page.screenshot({path:path.join(output,file),timeout:180000});report.screenshots.push(file);console.log(`SHOT ${file}`);};
async function uiMetrics(name){
 const metrics=await page.evaluate(()=>{
  const shown=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.visibility!=="hidden"&&s.display!=="none";};
  const buttons=[...document.querySelectorAll("button")].filter(shown).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {id:el.id,label:(el.getAttribute("aria-label")??el.textContent).trim().slice(0,65),width:+r.width.toFixed(1),height:+r.height.toFixed(1),font:parseFloat(s.fontSize)};});
  const fixed=[...document.querySelectorAll("body>header,body>nav,#fps,.hint,#card,#title")].filter(shown).filter(el=>+getComputedStyle(el).opacity>.01).map(el=>{const r=el.getBoundingClientRect();return {id:el.id||el.tagName.toLowerCase(),area:Math.min(innerWidth,r.width)*Math.min(innerHeight,r.height),x:r.x,y:r.y,w:r.width,h:r.height};});
  return {viewport:[innerWidth,innerHeight],rootOverflow:document.documentElement.scrollWidth>innerWidth+1,buttons,smallTargets:buttons.filter(b=>b.width<43.5||b.height<43.5),smallFonts:buttons.filter(b=>b.font<12),fixed,approxOverlayRatio:fixed.reduce((n,x)=>n+x.area,0)/(innerWidth*innerHeight)};
 });
 report.metrics.push({name,...metrics});
 check(!metrics.rootOverflow,`${name}: page has no horizontal overflow`);
 if(final){check(!metrics.smallTargets.length,`${name}: visible controls meet44px touch targets`,metrics.smallTargets);check(!metrics.smallFonts.length,`${name}: control text stays at least12px`,metrics.smallFonts);}
 return metrics;
}
const place=async(name)=>{
 const button=page.locator(`[data-place="${name}"]`);
 if(await button.count()){await button.evaluate(button=>button.click());await settle();return;}
 await page.evaluate(id=>{
  const e=window.explorer,v=e.view;
  if(v.inside)v.goOutside();
  const shots={green:null,tree:[[58,7.5,9],[58,4.2,24.6]],bat:[[100,16,46],[102,5,21]],valley:[[64,150,-66],[64,0,64]],moor:[[118,24,18],[144,4,52]]};
  const shot=shots[id];if(!shot)v.cameraActions.reset();else v.cameraActions.place(shot[0].map(x=>x*1.5),shot[1].map(x=>x*1.5));
 },name);await settle();
};
const hall=async(id)=>{
 await page.evaluate(id=>{const v=explorer.view;v.goInside(id);const at=v.hallPoint(0,8.6,9.6),look=v.hallPoint(0,-6.4,1.4);v.cameraActions.place([at.x,at.y,-at.z],[look.x,look.y,-look.z]);},id);await settle();
 check(await page.evaluate(id=>explorer.view.inside===id,id),`interior ${id} opens`);
 if(final){const name={"velvet-bat":"The Velvet Bat","elowen-library":"Elowen's library","rowan-workshop":"Rowan's workshop"}[id];check((await page.locator("#village-location").textContent())===name,`interior ${id} has its own location label`);}
};
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
 page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,reducedMotion:"reduce"});page.setDefaultTimeout(45000);
 page.on("pageerror",error=>report.errors.push(error.message));page.on("console",message=>{if(message.type()==="error")report.errors.push(message.text());});
 page.on("request",request=>{const u=request.url();if(!u.startsWith(origin)&&!u.startsWith("data:")&&!u.startsWith("blob:"))report.externalRequests.push(u);});
 await page.goto(origin+"/village.html",{waitUntil:"domcontentloaded",timeout:180000});
 await page.waitForFunction(()=>!!window.explorer?.view?.active&&document.body.classList.contains("ready"));
 await page.evaluate(()=>document.fonts.ready);await settle();
 check(true,"village explorer boots with a live view");
 if(final){
  await page.locator("#village-map-toggle").click();
  check(await page.locator("#village-map").isVisible(),"Map opens as an intentional drawer");
  await uiMetrics("desktop-map");await screenshot("desktop-map");
  await page.locator('[data-place="tree"]').click();
  check(await page.locator("#village-map").isHidden(),"choosing a map place closes the drawer");
  await page.locator("#village-neighbours-toggle").click();
  check(await page.locator('[data-village-meet="elowen"]').count()===1,"Elowen is reachable from Neighbours");
  await page.locator('[data-village-meet="elowen"]').click();
  check(await page.locator("#village-dialogue").isVisible(),"meeting Elowen opens a compact conversation");
  await uiMetrics("desktop-conversation");await screenshot("desktop-conversation");
  for(let i=0;i<8;i++){
   if(await page.locator(".village-reply").first().isVisible().catch(()=>false))break;
   if(!await page.locator("[data-village-dialogue-next]").isVisible().catch(()=>false))break;
   if((await page.locator("[data-village-dialogue-next]").textContent())==="Done")break;
   await page.locator("[data-village-dialogue-next]").click();
  }
  if(await page.locator(".village-reply").first().isVisible().catch(()=>false)){
   check(await page.locator(".village-reply").count()===3,"conversation presents three clear tone choices");
   await page.locator(".village-reply").first().click();
   check(await page.locator("[data-village-dialogue-next]").isVisible(),"one answer advances to the neighbour's reply");
  }
  await page.locator("[data-village-dialogue-close]").click();
  check(await page.locator("#village-dialogue").isHidden(),"conversation closes without a permanent speech panel");
  await page.locator("#village-more-toggle").click();
  const preview=page.locator("details.village-preview-options");if(!await preview.evaluate(el=>el.open))await preview.locator("summary").click();
  await page.locator("#everyone").click();await page.locator("#village-more-toggle").click();
  await page.evaluate(()=>explorer.view.spritesReady);
  const cast=await page.evaluate(()=>explorer.view.folk.diagnostics());
  check(cast.length===9&&cast.every(p=>p.style==="sprite"&&p.ready),"all eight neighbours and Vesper use the shipped painted sprites",cast);
  check(cast.every(p=>Math.abs(p.height-2.3)<.001),"the cast shares one2.3-unit scale");
  const gait=await page.evaluate(()=>{
   const v=explorer.view,people=[...v.folk.people.values()];
   return people.map(p=>{
    const previous=p.walking;p.walking=true;
    const frames=new Set(),legs=new Set();
    for(let n=0;n<12;n++){v.folk.animate(p,.1,n*.13,v.camera);frames.add(p.root.userData.frame);if(p.root.userData.leadingLeg)legs.add(p.root.userData.leadingLeg);}
    p.walking=previous;return {id:p.id,frames:[...frames],legs:[...legs]};
   });
  });
  check(gait.every(p=>p.frames.length>=2&&p.legs.length>=2),"each painted walk alternates authored leg frames",gait);
  const artwork=await page.evaluate(()=>{
   const overlay=document.createElement("section");overlay.id="qa-cast-review";overlay.style.cssText="position:fixed;inset:0;z-index:99999;padding:18px 36px;background:#1b1423;color:#f5ead8;font:14px system-ui;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:10px";
   const result=[];
   for(const p of explorer.view.folk.people.values()){
    const data=p.root.userData.data;if(!data)continue;const m=data.meta,walk=m.actions.walk,chosen=[m.actions.idle[0],walk[0],walk[Math.floor(walk.length/2)]],row=document.createElement("article");row.style.cssText="border:1px solid #56415b;border-radius:12px;text-align:center;overflow:hidden;background:#261c30";
    const title=document.createElement("div");title.textContent=p.id+" · idle / left step / right step";title.style.cssText="padding:5px;color:#e3bc83";row.append(title);const pixels=[],anchors=[];
    for(const index of chosen){
     const f=m.frames[index],canvas=document.createElement("canvas");canvas.width=100;canvas.height=160;canvas.style.cssText="position:static;display:inline-block;width:100px;height:160px";const c=canvas.getContext("2d"),scale=130/m.rows;
     c.strokeStyle="#8b704e";c.beginPath();c.moveTo(0,145.5);c.lineTo(100,145.5);c.stroke();
     c.imageSmoothingEnabled=false;c.drawImage(data.sheet.image,f.x,f.y,f.w,f.h,50-f.ax*scale,145-f.ay*scale,f.w*scale,f.h*scale);row.append(canvas);pixels.push(c.getImageData(0,0,100,160).data);
     const geometry=data.frames[index];geometry.computeBoundingBox();const box=geometry.boundingBox,unit=(m.height??2.3)/m.rows;
     anchors.push({frame:index,x:box.min.x+f.ax*unit,y:box.max.y-f.ay*unit,unit});
    }
    let different=0;for(let i=0;i<pixels[1].length;i+=4)if(Math.abs(pixels[1][i]-pixels[2][i])+Math.abs(pixels[1][i+1]-pixels[2][i+1])+Math.abs(pixels[1][i+2]-pixels[2][i+2])+Math.abs(pixels[1][i+3]-pixels[2][i+3])>40)different++;
    result.push({id:p.id,walkPixelDifference:different,anchors});overlay.append(row);
   }
   document.body.append(overlay);return result;
  });
  check(artwork.length===9&&artwork.every(p=>p.walkPixelDifference>40),"all nine shipped sheets contain visibly distinct left and right steps",artwork);
  check(artwork.every(p=>p.anchors.every(a=>Math.abs(a.x)<.001&&Math.abs(a.y)<.001)),"runtime idle and walking meshes share the same foot anchor");
  await screenshot("cast-nine-authored-gaits");await page.locator("#qa-cast-review").evaluate(el=>el.remove());
  await page.evaluate(()=>explorer.view.setCastStyle("voxel"));
  check(await page.evaluate(()=>explorer.view.folk.diagnostics().every(p=>p.style==="voxel")),"existing voxel cast remains available as a fallback");
  await page.evaluate(()=>explorer.view.setCastStyle("sprite"));await settle();
 }
 await place("green");await uiMetrics("desktop");await screenshot("desktop-green");
 await place("tree");await screenshot("desktop-moth-tree");
 await place("bat");await screenshot("desktop-velvet-bat");
 if(final){
  await page.locator("#village-more-toggle").click();
  const preview=page.locator("details.village-preview-options");if(!await preview.evaluate(el=>el.open))await preview.locator("summary").click();
  await page.locator("#restored").click();await page.locator("#village-more-toggle").click();
  await page.evaluate(()=>explorer.view.cameraActions.place([78,15,36].map(x=>x*1.5),[66.6,3.2,20].map(x=>x*1.5)));await settle();await screenshot("restored-rowan-window-detail");
  await page.evaluate(()=>explorer.view.cameraActions.place([12,14,75].map(x=>x*1.5),[-6,3.2,62].map(x=>x*1.5)));await settle();await screenshot("copse-cottage-window-detail");
 }
 for(const id of ["velvet-bat","elowen-library","rowan-workshop"]){await hall(id);await screenshot(`inside-${id}`);}
 await place("green");
 if(final)check((await page.locator("#village-location").textContent())==="Hollow Green","leaving a hall restores its outdoor location label");
 const walk=page.locator("#walk");await walk.waitFor({state:"attached"});
 await page.waitForFunction(()=>!document.getElementById("walk").disabled);
 // A DOM click answers the same handler even when the revised shell groups
 // exploratory tools behind More; view snapshots are not an input-certification claim.
 await walk.evaluate(button=>button.click());await settle();
 check(await page.evaluate(()=>document.body.classList.contains("walking")),"Walk places an owner at true village scale");
 await screenshot("desktop-walking");
 await walk.evaluate(button=>button.click());await settle();
 for(const [name,width,height] of [["phone",390,844],["landscape",844,390],["fold",900,840]]){
  await page.setViewportSize({width,height});await place("green");await uiMetrics(name);await screenshot(`${name}-green`);
  if(final){
   await page.locator("#village-map-toggle").click();await uiMetrics(`${name}-map`);await screenshot(`${name}-map`);
   await page.locator("#village-map-toggle").click();
   await page.locator("#village-neighbours-toggle").click();await page.locator('[data-village-meet="elowen"]').click();
   await uiMetrics(`${name}-conversation`);await screenshot(`${name}-conversation`);await page.locator("[data-village-dialogue-close]").click();
  }
 }
 check(!report.externalRequests.length,"offline village makes no external font or asset requests",report.externalRequests);
 check(!report.errors.length,"village views and interiors have no page or console errors",report.errors);
}catch(error){report.errors.push(error.stack??String(error));console.error(error);if(page)await screenshot("failure").catch(()=>{});}
finally{
 if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 report.passed=!report.errors.length&&report.checks.length>0&&report.checks.every(x=>x.pass);
 await fs.writeFile(path.join(output,"village-design-report.json"),JSON.stringify(report,null,2)+"\n");
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors.length,screenshots:report.screenshots.length,sha256:report.sha256}));
if(!report.passed)process.exitCode=1;
