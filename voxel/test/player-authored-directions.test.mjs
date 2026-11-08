import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Exercise the real texture/geometry adapter with a tiny declared atlas. Art
// validation lives in the baker tests; this checks switching and lazy loading.
const root=fileURLToPath(new URL('../',import.meta.url));
const result=await build({
  stdin:{contents:'export * from "./src/player-sprite-directions.js";',resolveDir:root},
  bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',
  plugins:[{name:'declared-test-art',setup(b){
    b.onResolve({filter:/directional-sprite-meta\.js$/},()=>({path:'directional-meta',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`
      const directions=['front','frontRight','right','backRight','back','backLeft','left','frontLeft'];
      const frames=Array.from({length:64},(_,i)=>({x:i%8*128,y:Math.floor(i/8)*176,w:128,h:176,ax:64,ay:168}));
      const base={w:1024,h:1408,cell:{w:128,h:176,ax:64,ay:168},rows:144,height:2.3,frames,directions,walk:directions.map((_,row)=>Array.from({length:8},(_,i)=>row*8+i))};
      export const DIRECTIONAL_SPRITES={'shane-base':{...base,url:'test:shane-base'},'natalie-base':{...base,url:'test:natalie-base'}};
    `,loader:'js'}));
    b.onLoad({filter:/\.(webp|png)$/},args=>({contents:`export default ${JSON.stringify('test:'+args.path.split('/').pop())}`,loader:'js'}));
  }}],
});
const temp=mkdtempSync(join(tmpdir(),'owner-direction-test-')),bundle=join(temp,'adapter.mjs');
writeFileSync(bundle,result.outputFiles[0].text);
const canvases=[];
globalThis.document={createElement:()=>{
 const canvas={width:0,height:0},ctx={drawImage(){},getImageData(){const data=new Uint8ClampedArray(canvas.width*canvas.height*4);data.set([20,16,12,255],(34*canvas.width+64)*4);return{data};},putImageData(pixels){canvas.written=pixels;}};
 canvas.getContext=()=>ctx;canvases.push(canvas);return canvas;
}};
let api;try{api=await import(pathToFileURL(bundle).href);}finally{rmSync(temp,{recursive:true,force:true});}
const created=[],fail=new Set();
globalThis.Image=class {width=1024;height=1408;set src(value){this._src=value;created.push(value);queueMicrotask(()=>fail.has(value)?this.onerror?.():this.onload?.());}get src(){return this._src;}};
await api.loadPlayerDirections();

function actor(){
  const original={label:'original texture'},idle=[{id:'idle0'},{id:'idle1'}],walk=Array.from({length:6},(_,i)=>({id:'walk'+i}));
  const group={children:[{children:Array.from({length:3},()=>({isMesh:true,material:{map:original,emissiveMap:original},customDepthMaterial:{map:original}}))}],scale:{set(x,y,z){Object.assign(this,{x,y,z});}},userData:{idle,walk,show(f){this.geometry=f;}}};
  return {group,original};
}

test('only a supported moving look requests a sheet, once, and preserves phase through turns',async()=>{
  const {group,original}=actor();
  api.applyPlayerDirection(group,{who:'shane',angle:0,walking:false});
  assert.equal(created.includes('test:shane-base'),false);
  api.applyPlayerDirection(group,{who:'shane',outfit:'shane-jason',angle:0,walking:true});
  assert.equal(created.includes('test:shane-base'),false,'a costume never borrows everyday clothes');
  api.applyPlayerDirection(group,{who:'shane',angle:0,phase:.25,walking:true});
  await api.loadAuthoredPlayerDirection('shane-base');
  api.applyPlayerDirection(group,{who:'shane',angle:0,phase:.25,walking:true});
  const frontGeometry=group.userData.geometry;
  assert.equal(frontGeometry.userData.shared,true,'room teardown must not dispose a shared owner atlas plane');
  assert.equal(group.userData.playerDirection,'front');
  assert.equal(group.userData.playerDirectionFrame,2);
  assert.equal(group.userData.playerAuthoredDirection,true);
  api.applyPlayerDirection(group,{who:'shane',angle:Math.PI/2,phase:.25,walking:true});
  assert.equal(group.userData.playerDirection,'right');
  assert.equal(group.userData.playerDirectionFrame,2,'turning retains the same planted leg');
  assert.notEqual(group.userData.geometry,frontGeometry);
  api.applyPlayerDirection(group,{who:'shane',angle:-Math.PI/2,phase:.75,walking:true});
  assert.equal(group.userData.playerDirection,'left');
  assert.equal(group.userData.playerDirectionFrame,6);
  assert.ok(group.scale.x>0,'authored left view is not reflected');
  assert.equal(created.filter(id=>id==='test:shane-base').length,1);
  for(const mesh of group.children[0].children){assert.notEqual(mesh.material.map,original);assert.equal(mesh.customDepthMaterial.map,mesh.material.map);}
});

test('stopping, tool gestures and releasing restore matching original geometry and all maps',()=>{
  const {group,original}=actor();
  const draw=options=>api.applyPlayerDirection(group,{who:'shane',angle:Math.PI/2,phase:.4,walking:true,...options});
  draw({});
  draw({walking:false,facing:'side'});
  assert.equal(group.userData.playerDirection,'front');
  assert.equal(group.userData.playerAuthoredDirection,false);
  assert.ok(group.userData.idle.includes(group.userData.geometry));
  draw({walking:false,facing:'side'});
  assert.equal(group.userData.playerDirection,'front','no one-frame jump back to a legacy side walk at rest');
  draw({});
  draw({walking:false,action:'water',dx:1,actionProgress:.4});
  assert.equal(group.userData.playerDirection,'water');
  assert.equal(group.userData.playerAuthoredDirection,false,'the can still uses its authored empty-hand pose');
  draw({release:true,walking:false,action:null});
  assert.equal(group.userData.playerStature,null);
  for(const mesh of group.children[0].children){assert.equal(mesh.material.map,original);assert.equal(mesh.material.emissiveMap,original);assert.equal(mesh.customDepthMaterial.map,original);}
});

test('default and empty looks share the atlas without reading pixels; custom beanies recolour once',async()=>{
 await api.loadAuthoredPlayerDirection('shane-base');
 const {group}=actor(),draw=look=>api.applyPlayerDirection(group,{who:'shane',walking:true,angle:0,phase:.25,look});
 draw(undefined);const shared=group.children[0].children[0].material.map,before=canvases.length;
 for(const look of [{},{beanie:0x1a1210},{sweater:0x123456}]){draw(look);assert.equal(group.children[0].children[0].material.map,shared);}
 assert.equal(canvases.length,before,'the larger atlas is never copied for a no-op look');
 const natalie=actor().group;
 api.applyPlayerDirection(natalie,{who:'natalie',facing:'back',walking:true});
 const natalieShared=natalie.children[0].children[0].material.map;
 for(const look of [{},{sweater:0x604625},{beanie:0x123456}]){api.applyPlayerDirection(natalie,{who:'natalie',facing:'back',walking:true,look});assert.equal(natalie.children[0].children[0].material.map,natalieShared);}
 assert.equal(canvases.length,before,'Natalie’s original olive look is also a no-op');
 draw({beanie:0xc8641e});const custom=group.children[0].children[0].material.map;
 assert.notEqual(custom,shared);assert.equal(canvases.length,before+1);
 const painted=custom.image.written.data,index=(34*custom.image.width+64)*4;
 assert.notDeepEqual([...painted.slice(index,index+3)],[20,16,12],'the actual colour function modifies the beanie pixel');
 draw({beanie:0xc8641e});assert.equal(group.children[0].children[0].material.map,custom);assert.equal(canvases.length,before+1,'the custom recolour is cached');
 draw({beanie:0x1a1210});assert.equal(group.children[0].children[0].material.map,shared);
});

test('an unavailable optional sheet keeps the legacy costume functional without repeated load attempts',async()=>{
  fail.add('test:natalie-base');
  const {group}=actor();
  await api.loadAuthoredPlayerDirection('natalie-base');
  for(let i=0;i<3;i++)api.applyPlayerDirection(group,{who:'natalie',angle:Math.PI,facing:'back',phase:.5,walking:true});
  assert.equal(group.userData.playerDirection,'back');
  assert.equal(group.userData.playerAuthoredDirection,false);
  assert.equal(created.filter(id=>id==='test:natalie-base').length,1);
  assert.equal(await api.loadAuthoredPlayerDirection('missing-costume'),null);
});

test('village idle can keep both base owners facing away without marching in place',async()=>{
  // A fresh adapter keeps this success path separate from the failed-image
  // fixture above. The image/source frames are otherwise the same declarations.
  fail.delete('test:natalie-base');
  const idleAPI=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n//village-contact-idle-fixture').toString('base64'));
  await idleAPI.loadPlayerDirections();
  for(const who of ['shane','natalie']){
    await idleAPI.loadAuthoredPlayerDirection(who+'-base');const {group,original}=actor();
    const draw=options=>idleAPI.applyPlayerDirection(group,{who,angle:Math.PI,walking:false,keepFacingOnIdle:true,...options});
    draw({phase:.125,age:1,time:1});const geometry=group.userData.geometry,scale=group.scale.x;
    assert.equal(group.userData.playerDirection,'back');assert.equal(group.userData.playerDirectionFrame,0);
    assert.equal(group.userData.playerAuthoredIdle,true);assert.equal(group.userData.playerGaitPhase,null);assert.equal(group.userData.playerLeadingLeg,null);
    for(const time of [2,3,10,100]){draw({phase:.75,age:time,time});assert.equal(group.userData.geometry,geometry,'time and gait cannot animate contact idle');assert.equal(group.scale.x,scale);}
    draw({angle:Math.PI/2,time:101});assert.equal(group.userData.playerDirection,'right');assert.equal(group.userData.playerDirectionFrame,0);assert.ok(group.scale.x>0);
    draw({angle:-Math.PI/2,time:102});assert.equal(group.userData.playerDirection,'left');assert.equal(group.userData.playerDirectionFrame,0);assert.ok(group.scale.x>0,'idle left view is not mirrored');
    draw({angle:0,time:103});assert.equal(group.userData.playerAuthoredIdle,false);assert.equal(group.userData.playerDirection,'front');
    for(const mesh of group.children[0].children)assert.equal(mesh.material.map,original,'front keeps the approved original idle portrait');
    draw({walking:true,phase:.75});assert.equal(group.userData.playerAuthoredIdle,false);assert.equal(group.userData.playerDirectionFrame,6,'moving resumes the distance-driven gait');
    draw({release:true});assert.equal(group.userData.playerAuthoredIdle,false);assert.equal(group.userData.playerStature,null);
  }
});

test('village idle is opt-in and never paints a costume in everyday clothes',async()=>{
  const {group,original}=actor();await api.loadAuthoredPlayerDirection('shane-base');
  api.applyPlayerDirection(group,{who:'shane',angle:Math.PI,walking:true,phase:.5});
  api.applyPlayerDirection(group,{who:'shane',angle:Math.PI,walking:false,facing:'back'});
  assert.equal(group.userData.playerDirection,'front','farm/house default stopping remains unchanged');assert.equal(group.userData.playerAuthoredIdle,false);
  api.applyPlayerDirection(group,{who:'shane',outfit:'shane-jason',angle:Math.PI,walking:false,facing:'back',keepFacingOnIdle:true});
  assert.equal(group.userData.playerAuthoredDirection,false,'costume cannot use the base eight-view contact pose');assert.equal(group.userData.playerAuthoredIdle,false);
  assert.notEqual(group.children[0].children[0].material.map,original,'the actual costume back sheet remains available');
});
