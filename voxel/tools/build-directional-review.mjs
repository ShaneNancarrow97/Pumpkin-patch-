#!/usr/bin/env node
// A standalone canvas bench: only authored pixels are cropped, never spun or mirrored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDirectionalManifest } from '../src/content/directional-atlas.js';

const voxel=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const manifestFile=path.resolve(value('--manifest',path.join(voxel,'assets/directional/manifest.json')));
const out=path.resolve(value('--out','/workspace/Pumpkin-Patch-Directional-Art-Review.html'));
if(!fs.existsSync(manifestFile))throw Error('No manifest at '+manifestFile+'. Supply --manifest with a {looks:{id:manifest}} JSON file.');
const data=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
if(!data.looks||!Object.keys(data.looks).length)throw Error('The review needs at least one look in manifest.looks.');
const mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const warnings={};
for(const[id,m]of Object.entries(data.looks)){
 const report=validateDirectionalManifest(m);if(!report.ok)throw Error(id+': '+report.errors.join('; '));warnings[id]=report.warnings;
 for(const p of m.pages){
  if(p.url.startsWith('data:'))continue;
  if(/^[a-z]+:/i.test(p.url))throw Error('Review atlas must be local: '+p.url);
  const file=path.resolve(voxel,p.url);if(!file.startsWith(voxel+path.sep))throw Error('Atlas is outside voxel/: '+p.url);
  p.url='data:'+(mime[path.extname(file).toLowerCase()]??'application/octet-stream')+';base64,'+fs.readFileSync(file).toString('base64');
 }
}
const safe=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const contract=fs.readFileSync(path.join(voxel,'src/content/directional-atlas.js'),'utf8').replace(/^export /gm,'');
const html=String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Pumpkin Patch · Directional art review</title><style>
:root{color-scheme:dark;font:15px/1.45 system-ui,sans-serif;background:#15111d;color:#f0e8d8;--muted:#b9acbc;--edge:#54414e;--amber:#edbd78}*{box-sizing:border-box}body{margin:0;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}main{max-width:1180px;margin:auto}header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}h1{font:500 25px Georgia,serif;margin:0 0 6px}p{margin:6px 0 15px;color:var(--muted)}.tag{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--amber)}button,select,input{font:inherit;color:inherit}button,select{min-height:44px;border:1px solid var(--edge);border-radius:13px;background:#2b2232;padding:8px 12px}button{cursor:pointer}button:hover,button:focus-visible{border-color:var(--amber)}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--amber);outline-offset:3px}label{display:flex;align-items:center;gap:9px;min-height:44px}.controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:14px 0}.field{display:grid;gap:4px;flex:1;min-width:160px}.field>span{font-size:12px;color:var(--muted)}.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px}.panel{background:#211a29;border:1px solid #453544;border-radius:20px;padding:15px;min-width:0}.stage{padding:0;overflow:hidden;background-color:#201c28;background-image:linear-gradient(45deg,#302936 25%,transparent 25%),linear-gradient(-45deg,#302936 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#302936 75%),linear-gradient(-45deg,transparent 75%,#302936 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}canvas{display:block;width:100%;height:auto;aspect-ratio:640/520}h2{font:500 19px Georgia,serif;margin:0 0 12px}.readout{display:grid;grid-template-columns:1fr auto;gap:7px;font-variant-numeric:tabular-nums;margin:12px 0}.readout dt{color:var(--muted)}.readout dd{margin:0;text-align:right}.status{display:inline-flex;align-items:center;border-radius:20px;padding:5px 11px;font-size:13px;border:1px solid #55765b;background:#27372c;color:#d6edca}.status[data-state=fallback]{background:#513b21;border-color:#9b743b;color:#ffdda4}.status[data-state=missing]{background:#3e2634;border-color:#815365;color:#efbdd2}.slider{display:grid;gap:3px;margin:15px 0}input[type=range]{min-height:44px;width:100%;accent-color:var(--amber);cursor:pointer}input[type=checkbox]{width:19px;height:19px;accent-color:var(--amber)}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.row button{flex:1}.hint{font-size:12px;color:var(--muted);margin:10px 0 0}.coverage{margin-top:16px}.coverage-wrap{overflow:auto;max-height:360px}.coverage table{border-collapse:separate;border-spacing:4px;min-width:100%;font-size:12px}.coverage th{font-weight:500;color:var(--muted);white-space:nowrap;text-align:left}.coverage th:first-child{position:sticky;left:0;background:#211a29;z-index:1;padding:0 7px 0 0}.coverage td{padding:0}.coverage button{min-height:44px;min-width:44px;padding:4px;border-radius:9px;font-size:12px}.coverage button[data-kind=animation]{background:#273c2c;border-color:#55765b;color:#cbe5be}.coverage button[data-kind=pose]{background:#2a3545;border-color:#566b86;color:#c2d8fa}.coverage button[data-kind=missing]{background:#302331;border-color:#503949;color:#9c7d91}.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--muted)}details{margin-top:14px}summary{cursor:pointer;min-height:44px;display:flex;align-items:center}#issues{font:12px/1.5 ui-monospace,monospace;max-height:220px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}#load-error{color:#ffb9cc}footer{color:var(--muted);font-size:12px;margin:16px 0}.coverage-note{padding:8px 0;color:var(--muted);font-size:13px}@media(max-width:820px){.layout{grid-template-columns:1fr}.panel.controls-panel{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.controls-panel h2,.controls-panel>.status,.controls-panel>.hint,.controls-panel>details{grid-column:1/-1}.controls-panel .readout{grid-row:2/5;grid-column:2}.stage canvas{max-height:62vh;object-fit:contain}}@media(max-width:480px){body{padding-left:10px;padding-right:10px}.panel.controls-panel{display:block}.field{min-width:140px}h1{font-size:22px}.stage canvas{max-height:56vh}}
</style><main><header><div><span class="tag">Contractor art bench</span><h1>Shane & Natalie · Directional review</h1></div><span class="tag">Authored pixels · shared world scale</span></header><p>Review likeness, alternating strides and anchors. Missing states stay visible as gaps; nearest-view fallback never counts as new art.</p><div class="controls"><label class="field"><span>Character / costume</span><select id="look"></select></label><label class="field"><span>Action</span><select id="action"></select></label></div><div class="layout"><section class="panel stage"><canvas id="preview" width="1280" height="1040" aria-label="Sprite preview with a shared ground anchor and 2.3 world unit ruler"></canvas></section><section class="panel controls-panel"><h2>Animation controls</h2><span id="status" class="status" data-state="missing">Loading</span><dl class="readout"><dt>Requested angle</dt><dd id="requested">—</dd><dt>Drawn angle</dt><dd id="actual">—</dd><dt>Frame / phase</dt><dd id="frame-label">—</dd><dt>Mode</dt><dd id="mode">—</dd><dt>Pixels per unit</dt><dd id="ppu">—</dd></dl><label class="slider"><span>Direction · <output id="degree-label">0°</output></span><input id="degree" type="range" min="0" max="345" step="15" value="0" aria-label="Requested direction"></label><label class="slider"><span>Frame · <output id="scrub-label">1</output></span><input id="scrub" type="range" min="0" max="7" step="1" value="0" aria-label="Animation frame"></label><div class="row"><button id="play" aria-pressed="false">Play</button><button id="prev" aria-label="Previous frame">← Frame</button><button id="next" aria-label="Next frame">Frame →</button></div><label class="slider"><span>Playback speed · <output id="speed-label">1×</output></span><input id="speed" type="range" min="0.25" max="2" step="0.25" value="1" aria-label="Playback speed"></label><label><input id="nearest" type="checkbox">Allow nearest authored view</label><label><input id="onion" type="checkbox">Previous-frame onion skin</label><label><input id="baseline" type="checkbox" checked>Ground anchor and ruler</label><p id="load-error" role="alert"></p><p class="hint">0° faces the camera; 90° faces screen-right; 180° faces away; 270° faces screen-left. The preview never rotates or mirrors a flat frame.</p></section></div><section class="panel coverage"><h2>Authored coverage</h2><div class="legend"><span>Green: complete drawn animation</span><span>Blue: single neutral idle pose</span><span>Muted: missing or rejected clip</span></div><div id="coverage-note" class="coverage-note"></div><div id="coverage" class="coverage-wrap"></div><details><summary>Validation and provenance notes</summary><pre id="issues"></pre></details></section><footer>Each frame is drawn at one shared world scale using its recorded foot anchor. A unique file or a declared phase is not proof of a correct gait: inspect left/right leg and arm motion in this bench and in the game.</footer></main><script>
`+contract+'\nconst manifestData='+safe(data)+';\nconst buildWarnings='+safe(warnings)+';\n'+String.raw`
const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d');
const looks=Object.keys(manifestData.looks),actions=Object.keys(DIRECTIONAL_ACTIONS),images=new Map();
let playing=false,progress=0,lastTime=0,lastSelection=null,selectedCount=1;
for(const id of looks){const option=document.createElement('option');option.value=id;option.textContent=id.replaceAll('-',' ');$('look').append(option);}
for(const id of actions){const option=document.createElement('option');option.value=id;option.textContent=id[0].toUpperCase()+id.slice(1);$('action').append(option);}
const current=()=>manifestData.looks[$('look').value];
const clipCount=selection=>selection.frame?(current().clips.find(c=>c.action===selection.action&&c.degree===selection.direction)?.frames.length??1):DIRECTIONAL_ACTIONS[$('action').value].frames;
function loadPages(){
 for(const m of Object.values(manifestData.looks))for(const p of m.pages){if(images.has(p.url))continue;const img=new Image();images.set(p.url,img);img.onload=()=>draw();img.onerror=()=>{$('load-error').textContent='Could not decode atlas '+p.id;};img.src=p.url;}
}
function selected(at=progress){return selectDirectionalFrame(current(),{action:$('action').value,yaw:+$('degree').value,progress:at,allowNearest:$('nearest').checked});}
function setPlaying(value){playing=value;$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));lastTime=0;}
function drawFrame(selection,opacity=1){
 if(!selection.frame)return;const f=selection.frame,p=current().pages.find(p=>p.id===f.page),img=images.get(p?.url);if(!img?.complete||!img.naturalWidth)return;
 const units=130,scale=units/f.pixelsPerUnit,r=f.rect;
 ctx.save();ctx.globalAlpha=opacity;ctx.imageSmoothingEnabled=true;ctx.drawImage(img,r.x,r.y,r.w,r.h,320-f.anchor.x*scale,445-f.anchor.y*scale,r.w*scale,r.h*scale);ctx.restore();
}
function draw(){
 ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,640,520);
 const s=selected(),count=clipCount(s);selectedCount=count;lastSelection=s;
 $('status').dataset.state=s.coverage;$('status').textContent=s.coverage==='authored'?(s.mode==='pose'?'Authored neutral pose':'Authored animation'):s.coverage==='fallback'?'Nearest view fallback':'Missing authored art';
 $('requested').textContent=s.requestedDegree+'°';$('actual').textContent=s.direction===null?'—':s.direction+'°';$('mode').textContent=s.frame?(s.mode==='pose'?'Single pose':'Animation'):'—';
 $('degree-label').textContent=$('degree').value+'°';$('ppu').textContent=s.frame?Number(s.frame.pixelsPerUnit).toFixed(2):'—';
 $('frame-label').textContent=s.frame?(s.index+1)+' / '+count+(s.frame.phase?' · '+s.frame.phase:''):'—';
 $('scrub').max=Math.max(0,count-1);$('scrub').value=s.frame?s.index:0;$('scrub-label').textContent=s.frame?String(s.index+1):'—';
 if($('baseline').checked){
  ctx.strokeStyle='#d6bb8870';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(35,445);ctx.lineTo(605,445);ctx.moveTo(320,68);ctx.lineTo(320,465);ctx.stroke();
  ctx.strokeStyle='#eac58f';ctx.beginPath();ctx.moveTo(65,445);ctx.lineTo(65,146);ctx.moveTo(57,445);ctx.lineTo(73,445);ctx.moveTo(57,146);ctx.lineTo(73,146);ctx.stroke();ctx.fillStyle='#e6cdab';ctx.font='13px system-ui';ctx.fillText('2.3 units',78,155);
  ctx.strokeStyle='#f1ca8c';ctx.beginPath();ctx.arc(320,445,6,0,Math.PI*2);ctx.stroke();
 }
 if($('onion').checked&&s.frame&&count>1){const previous=DIRECTIONAL_ACTIONS[s.action].loop?(s.index-1+count)%count:Math.max(0,s.index-1);drawFrame(selected((previous+.1)/count),.22);}
 drawFrame(s);
 if(!s.frame){ctx.textAlign='center';ctx.fillStyle='#c3afc7';ctx.font='18px system-ui';ctx.fillText('No reviewed '+$('action').value+' clip at '+$('degree').value+'°',320,245);ctx.font='13px system-ui';ctx.fillText('Choose an authored cell below or enable explicit nearest-view fallback.',320,275);ctx.textAlign='left';}
 ctx.fillStyle='#b5a4b9';ctx.font='12px system-ui';ctx.fillText('Common foot anchor · no per-frame fit or stretch',168,490);
}
function coverage(){
 const m=current(),coverage=directionalCoverage(m),table=document.createElement('table'),head=document.createElement('tr');
 head.append(document.createElement('th'));for(const degree of DIRECTION_DEGREES){const th=document.createElement('th');th.textContent=degree+'°';head.append(th);}const thead=document.createElement('thead');thead.append(head);table.append(thead);
 const body=document.createElement('tbody');for(const action of actions){const tr=document.createElement('tr'),th=document.createElement('th');th.textContent=action;tr.append(th);
  for(const degree of DIRECTION_DEGREES){const s=selectDirectionalFrame(m,{action,yaw:degree,allowNearest:false}),button=document.createElement('button'),td=document.createElement('td');const kind=s.frame?(s.mode==='pose'?'pose':'animation'):'missing';button.dataset.kind=kind;button.textContent=kind==='animation'?'●':kind==='pose'?'◐':'—';button.title=action+' '+degree+'° · '+kind;button.setAttribute('aria-label',button.title);button.onclick=()=>{$('action').value=action;$('degree').value=degree;progress=0;draw();};td.append(button);tr.append(td);}body.append(tr);
 }table.append(body);$('coverage').replaceChildren(table);
 $('coverage-note').textContent=coverage.authoredClips+' / '+coverage.expectedClips+' complete animation clips · '+coverage.authoredPoses+' neutral poses · '+coverage.authoredFrames+' authored frames. '+(coverage.complete?'All required animation directions covered.':'The remaining cells are production gaps.');
 const validation=validateDirectionalManifest(m);$('issues').textContent='Source seed: '+m.sourceSeed+'\nMobility: '+m.mobility+'\n'+(validation.errors.length?validation.errors.join('\n')+'\n':'')+((buildWarnings[$('look').value]??[]).join('\n')||'No structural validation warnings. Visual review is still required.');
}
function reset(){progress=0;lastTime=0;coverage();draw();}
$('look').onchange=reset;$('action').onchange=()=>{progress=0;draw();};$('degree').oninput=()=>draw();$('nearest').onchange=()=>draw();$('onion').onchange=()=>draw();$('baseline').onchange=()=>draw();
$('play').onclick=()=>setPlaying(!playing);$('speed').oninput=()=>{$('speed-label').textContent=$('speed').value+'×';};
function scrubTo(index){setPlaying(false);const count=Math.max(1,selectedCount);progress=(index%count+count)%count/count+.00001;draw();}
$('scrub').oninput=()=>scrubTo(+$('scrub').value);$('prev').onclick=()=>scrubTo((lastSelection?.index??0)-1);$('next').onclick=()=>scrubTo((lastSelection?.index??0)+1);
function tick(now){if(playing){if(lastTime){const elapsed=Math.min(.1,(now-lastTime)/1000),spec=DIRECTIONAL_ACTIONS[$('action').value];progress+=elapsed*(8/Math.max(1,selectedCount))*+$('speed').value;if(!spec.loop&&progress>=1){progress=1;setPlaying(false);}}draw();}lastTime=now;requestAnimationFrame(tick);}
window.DirectionalArtReview={data:manifestData,select:()=>selected(),coverage:()=>directionalCoverage(current()),draw};reset();loadPages();requestAnimationFrame(tick);
`+'\n</script></html>';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
console.log('Built '+out+' ('+Math.round(Buffer.byteLength(html)/1024)+' KiB), '+Object.keys(data.looks).length+' looks; all atlas images embedded.');
