// Small genuine WebGPU presentation test: the production mirror, post and
// overlay with real frames, without the full game's expensive world build.
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright";

const out = path.resolve(process.argv[2] ?? "/tmp/village-presentation-qa"), fullCss = process.argv[3];
await fs.mkdir(out, { recursive: true });
const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
import * as THREE from 'three';
import { createVillageRenderer } from './src/rendering/village-renderer.js';
const canvas=document.querySelector('#world'), legacy=new THREE.WebGLRenderer({canvas,antialias:true});
legacy.setSize(640,400,false);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1.6,.1,100);
scene.background=new THREE.Color(0x101025);scene.add(new THREE.HemisphereLight(0xeeddee,0x201020,2));
const sun=new THREE.DirectionalLight(0xffddaa,2);sun.position.set(3,7,4);scene.add(sun);
const floor=new THREE.Mesh(new THREE.BoxGeometry(15,.2,15),new THREE.MeshStandardMaterial({color:0x352345}));floor.position.y=-1;scene.add(floor);
const box=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color:0xdd853c,roughness:.45}));scene.add(box);
const second=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),new THREE.MeshBasicMaterial({color:0xaaccff}));second.position.set(-2,0,-1);scene.add(second);
camera.position.set(5,3,8);camera.lookAt(0,0,0);
scene.userData.grade={saturation:1.08,contrast:1.02};scene.userData.bloom={strength:.3,radius:.5,threshold:.9};scene.userData.exposure=1.05;
const presentation=createVillageRenderer({canvas});presentation.resize(640,400,1);
let running=true;
function frame(){if(!running)return;if(!presentation.draw(scene,camera,{bloom:true,shadows:false,antialias:true}))legacy.render(scene,camera);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
window.fixture={status:()=>presentation.status,move(){box.position.x=2;box.rotation.y=.7;camera.position.x=-4;camera.lookAt(0,0,0);},stop(){running=false;presentation.dispose();legacy.dispose();}};
` }, bundle: true, format: "iife", write: false, logLevel: "silent" });
let css = "html,body{margin:0;background:#080610}#world{position:fixed;inset:0;width:100%;height:100%;transition:filter .32s ease-out}[hidden]{display:none!important}";
if(process.env.PRESENT_LAYOUT_VISIBLE)css+=`.village-webgpu-canvas[hidden]{display:block!important;opacity:${process.env.PRESENT_LAYOUT_VISIBLE==='always'?1:0}}`;
if (fullCss) { const html = await fs.readFile(fullCss, "utf8"); css += [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n"); }
const html = `<!doctype html><style>${css}</style><canvas id="world"></canvas><script>${result.outputFiles[0].text}</script>`;
const server = createServer((req, res) => { if(req.url==="/favicon.ico")return res.writeHead(204).end();res.writeHead(200,{"Content-Type":"text/html"});res.end(html); });
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const report={scope:"Small genuine WebGPU fixture with production mirror/post/overlay",fullCss:fullCss??null,errors:[],checks:[]};let browser;
const hash=buffer=>createHash("sha256").update(buffer).digest("hex");
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-webgpu","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist",...(process.env.PRESENT_BROWSER_SIMPLE?[]:["--enable-features=Vulkan","--use-vulkan=swiftshader","--disable-vulkan-surface"])]});
  const page=await browser.newPage({viewport:{width:640,height:400},deviceScaleFactor:1});
  page.on("pageerror",e=>report.errors.push(e.message));page.on("console",m=>{if(m.type()==="error")report.errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.fixture&&(fixture.status().stage==='fallback'||fixture.status().backend==="webgpu"&&fixture.status().completedFrames>=4),null,{timeout:120000});
  report.ready=await page.evaluate(()=>fixture.status());if(report.ready.stage==='fallback')throw new Error(report.ready.reason);
  report.before=await page.evaluate(()=>({status:fixture.status(),canvases:[...document.querySelectorAll("canvas")].map(c=>({class:c.className,hidden:c.hidden,rect:c.getBoundingClientRect().toJSON(),filter:getComputedStyle(c).filter,zIndex:getComputedStyle(c).zIndex,display:getComputedStyle(c).display}))}));
  const before=await page.screenshot({path:path.join(out,"before.png")});
  const rawBefore=await page.evaluate(()=>document.querySelector('.village-webgpu-canvas').toDataURL());
  await fs.writeFile(path.join(out,'gpu-before-raw.png'),Buffer.from(rawBefore.split(',')[1],'base64'));
  const start=await page.evaluate(()=>{const n=fixture.status().completedFrames;fixture.move();return n;});
  await page.waitForFunction(n=>fixture.status().completedFrames>=n+4,start,{timeout:120000});
  const after=await page.screenshot({path:path.join(out,"after.png")});report.after=await page.evaluate(()=>fixture.status());
  report.checks.push({label:"Visible world pixels change after real camera and actor motion",pass:hash(before)!==hash(after),before:hash(before),after:hash(after)});
  report.checks.push({label:"Post and FXAA are genuinely active",pass:report.after.post.hdr&&report.after.post.fxaa});
  report.raw=await page.evaluate(()=>[...document.querySelectorAll("canvas")].map(c=>({class:c.className,url:c.toDataURL()})));
  report.checks.push({label:'Actual GPU colour-buffer pixels change after camera and actor motion',pass:hash(rawBefore)!==hash(report.raw.find(c=>c.class).url),before:hash(rawBefore),after:hash(report.raw.find(c=>c.class).url)});
  await page.evaluate(()=>{document.querySelector('#world').style.visibility='hidden';});
  await page.screenshot({path:path.join(out,"gpu-only.png")});
  await page.evaluate(()=>{document.querySelector('.village-webgpu-canvas').style.zIndex='10';});
  await page.screenshot({path:path.join(out,"gpu-raised.png")});
  for(const c of report.raw){await fs.writeFile(path.join(out,c.class?"gpu-raw.png":"gl-raw.png"),Buffer.from(c.url.split(',')[1],"base64"));c.hash=hash(c.url);delete c.url;}
  await page.evaluate(()=>fixture.stop());
  // Independent control: no Three, mirror, post, overlay or hidden canvas.
  await page.evaluate(async()=>{document.querySelectorAll('canvas').forEach(c=>c.remove());const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;canvas.style.cssText='position:fixed;inset:0;width:640px;height:400px';document.body.append(canvas);const adapter=await navigator.gpu.requestAdapter(),device=await adapter.requestDevice(),context=canvas.getContext('webgpu');context.configure({device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'opaque'});window.nativeClear=colour=>new Promise(resolve=>{let frames=0;function draw(){const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:colour,loadOp:'clear',storeOp:'store'}]});pass.end();device.queue.submit([encoder.finish()]);if(++frames<4)requestAnimationFrame(draw);else device.queue.onSubmittedWorkDone().then(resolve);}requestAnimationFrame(draw);});});
  await page.evaluate(()=>nativeClear({r:.8,g:.1,b:.1,a:1}));const red=await page.screenshot({path:path.join(out,'native-red.png')});
  await page.evaluate(()=>nativeClear({r:.1,g:.2,b:.8,a:1}));const blue=await page.screenshot({path:path.join(out,'native-blue.png')});
  report.nativeControl={visiblePixelsChanged:hash(red)!==hash(blue),red:hash(red),blue:hash(blue)};
}catch(error){report.error=error.stack;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(out,"browser.json"),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
if(report.error||report.errors.length||report.checks.some(c=>!c.pass))process.exitCode=1;
