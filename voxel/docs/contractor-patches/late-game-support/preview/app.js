import * as THREE from 'three';
import atlas from '../art/menu-icons.webp';
import content from '../data/festival-themes.json';
import audit from '../findings/attraction-audit.json';
import { REWARD_PROPS, buildRewardProp } from '../models/reward-props.js';

const $=id=>document.getElementById(id),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(value)||0);
const number=(value,places=0)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:places}).format(Number(value)||0);
const rewardMap=new Map(REWARD_PROPS.map(p=>[p.id,p])),themeMap=new Map(content.themes.map(p=>[p.id,p]));
const state={tab:'rewards',reward:REWARD_PROPS[0]?.id,theme:content.themes[0]?.id,fleet:1,ticket:12,route:0};
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let atlasURL=atlas;
try{const bytes=Uint8Array.from(atob(atlas.split(',')[1]),c=>c.charCodeAt(0));atlasURL=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));}catch{}
function icon(index,size=48){return `<span class="art" aria-hidden="true" style="width:${size}px;height:${size}px;background-image:url(${atlasURL});background-size:300% 200%;background-position:${index%3*50}% ${Math.floor(index/3)*100}%"></span>`;}
const rewardIcon=id=>3+REWARD_PROPS.findIndex(p=>p.id===id),themeIcon=id=>content.themes.findIndex(p=>p.id===id);

// All choices remain DOM controls; the renderer only displays the selected prop.
function choices(){
 if(!$('reward-choices').children.length){$('reward-choices').innerHTML=REWARD_PROPS.map(p=>`<button class="choice" data-reward="${escape(p.id)}" aria-pressed="${p.id===state.reward}">${icon(rewardIcon(p.id))}<span class="choice-copy"><span class="choice-name">${escape(p.name)}</span><small>360° voxel model</small></span></button>`).join('');$('reward-choices').querySelectorAll('[data-reward]').forEach(b=>b.onclick=()=>selectReward(b.dataset.reward));}
 if(!$('night-choices').children.length){$('night-choices').innerHTML=content.themes.map(p=>`<button class="choice" data-night="${escape(p.id)}" aria-pressed="${p.id===state.theme}">${icon(themeIcon(p.id))}<span class="choice-copy"><span class="choice-name">${escape(p.name)}</span><small>Level ${p.level} brief · Proposal</small></span></button>`).join('');$('night-choices').querySelectorAll('[data-night]').forEach(b=>b.onclick=()=>selectNight(b.dataset.night));}
 $('reward-choices').querySelectorAll('[data-reward]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reward===state.reward)));
 $('night-choices').querySelectorAll('[data-night]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.night===state.theme)));
}
function tab(next,focus=false,reveal=false){
 if(!['rewards','nights','balance'].includes(next))return;
 state.tab=next;
 for(const id of ['rewards','nights','balance']){const active=id===next,b=$('tab-'+id);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('panel-'+id).hidden=!active;}
 if(focus)$('tab-'+next).focus();
 if(next==='rewards'){viewer?.resize();viewer?.resume();}else viewer?.pause();
 if(reveal)requestAnimationFrame(()=>{$('panel-'+next).scrollIntoView({block:'start',behavior:motion.matches?'auto':'smooth'});});
}
for(const button of document.querySelectorAll('[data-tab]')){
 button.onclick=()=>tab(button.dataset.tab);
 button.onkeydown=e=>{const ids=['rewards','nights','balance'],i=ids.indexOf(state.tab);let next;if(e.key==='ArrowRight')next=ids[(i+1)%3];if(e.key==='ArrowLeft')next=ids[(i+2)%3];if(e.key==='Home')next=ids[0];if(e.key==='End')next=ids[2];if(next){e.preventDefault();tab(next,true);}};
}
function selectReward(id){
 const p=rewardMap.get(id);if(!p)return false;state.reward=id;
 const brief=content.rewards.find(r=>r.id===id),dimensions=p.footprint;
 $('reward-title').textContent=p.name;$('reward-description').textContent=p.description;$('reward-flavour').textContent=brief?.flavour??'';
 $('reward-measurements').innerHTML=`<div><dt>Footprint</dt><dd>${number(dimensions.w,2)} × ${number(dimensions.d,2)}</dd></div><div><dt>Height</dt><dd>${number(p.height,2)}</dd></div><div><dt>Grid plan</dt><dd>${p.gridFootprint.w} × ${p.gridFootprint.d}</dd></div>`;
 $('see-night').onclick=()=>{const theme=content.themes.find(t=>t.rewardId===id);if(theme)selectNight(theme.id);tab('nights',false,true);};
 choices();viewer?.select(id);renderModelNotes();return true;
}
function renderModelNotes(){
 const p=rewardMap.get(state.reward),stats=viewer?.status().modelStats;
 $('model-notes').innerHTML=`<p>Dimensions use the game’s world units. Y is up; the front faces +Z. The model stands on the floor with a centred origin.</p><p>Finished front, sides and back. Displayed with the existing game’s Three.js and voxel kit. The prop is not registered in the live furniture catalogue.</p>${stats?`<p>${number(stats.boxCount)} voxel boxes · ${number(stats.meshCount)} model meshes · ${number(stats.materialCount)} model materials.</p>`:''}<p>Selected model: <code>${escape(p.id)}</code></p>`;
}
function selectNight(id){
 const p=themeMap.get(id);if(!p)return false;state.theme=id;const reward=rewardMap.get(p.rewardId);
 $('night-content').innerHTML=`<header class="night-head"><div><p class="night-level">Level ${p.level} · Optional evening proposal</p><h3>${escape(p.name)}</h3></div>${icon(themeIcon(id),88)}</header><blockquote class="night-letter">${escape(p.letter)}</blockquote><div class="night-columns"><section><h4>Prepare at your own pace</h4><ol class="preparations">${p.preparation.map(text=>`<li>${escape(text)}</li>`).join('')}</ol></section><section><h4>Choose any ${p.goals.choose} of ${p.goals.options.length} goals</h4><ul class="goal-list">${p.goals.options.map((goal,i)=>`<li><b aria-hidden="true">${String(i+1).padStart(2,'0')}</b><span>${escape(goal.label)}</span></li>`).join('')}</ul><p class="suggested">Suggested targets for review. These counters are not running in the game.</p></section></div><p class="night-decision">${escape(p.intendedDecision)}</p><div class="night-reward">${icon(rewardIcon(p.rewardId),86)}<div><p class="eyebrow">Proposed permanent cosmetic</p><h4>${escape(reward.name)}</h4><p>One unlock per theme. No automatic stat bonus.</p></div><button data-inspect-reward="${escape(p.rewardId)}">Inspect reward <span aria-hidden="true">↗</span></button></div><details class="notes"><summary>Preparation &amp; integration requirements</summary><div><ul><li>Requires house level ${p.prerequisites.houseLevel}, the purchased kitchen and the listed prepared attractions.</li><li>Kitchen capabilities: ${escape((p.prerequisites.kitchenCapabilities??[]).join(', ')||'see the content brief')}.</li><li>${escape(content.policy.preparation)} preparation. The evening is player-ended; the suggested ${p.operation.suggestedMinutes} minutes is not a hard deadline.</li><li>${escape(content.policy.offline)}</li><li>${escape(content.policy.counting)}</li></ul></div></details>`;
 $('night-content').querySelector('[data-inspect-reward]').onclick=e=>{selectReward(e.currentTarget.dataset.inspectReward);tab('rewards',false,true);};choices();return true;
}

// The browser reads the generated audit; it never imports or runs game rules.
const scenario=()=>audit.scenarios.find(s=>s.config.fleet===state.fleet&&s.config.ticketPrice===state.ticket&&s.config.routeLevel===state.route);
function renderAudit(){
 const current=scenario();if(!current)throw Error('No emitted scenario matches the selected setup');
 const m=current.metrics;
 $('audit-scope').textContent=audit.scope;
 const finding=audit.findings.find(f=>f.id==='route-payoff-at-scare-cap')??audit.findings[0];
 $('audit-finding').innerHTML=`<b>${escape(finding.title)}</b>${escape(finding.text)}`;
 $('audit-metrics').innerHTML=`<dl><dt>Completed riders</dt><dd>${number(m.completed)}</dd><small>${number(m.ticketsSold)} tickets sold</small></dl><dl><dt>Ticket receipts</dt><dd>${money(m.ticketRevenue)}</dd><small>Income, not net profit</small></dl><dl><dt>Mean boarding queue</dt><dd>${number(m.meanBoardingQueueSeconds,1)}s</dd><small>Among guests who boarded</small></dl>`;
 const rows=audit.scenarios.filter(s=>s.config.fleet===state.fleet&&s.config.ticketPrice===state.ticket).sort((a,b)=>a.config.routeLevel-b.config.routeLevel);
 const names=['Original circuit','Graveyard extension','Complete woodland route'];
 $('audit-table').innerHTML=rows.map(s=>`<tr class="${s.config.routeLevel===state.route?'is-selected':''}" ${s.config.routeLevel===state.route?'aria-current="true"':''}><th scope="row">${names[s.config.routeLevel]}</th><td>${number(s.config.circuitSeconds)}s</td><td>${number(s.config.scareRating)}/100</td><td>${number(s.metrics.completed)}</td><td>${money(s.metrics.ticketRevenue)}</td><td>${number(s.metrics.meanBoardingQueueSeconds,1)}s</td></tr>`).join('');
 $('study-duration').textContent=number(audit.options.durationSeconds/60,1)+' simulated minutes per case';
 $('audit-warnings').innerHTML=current.warnings.map(w=>`<p><strong>${escape(w.title)}.</strong> ${escape(w.text)}</p>`).join('');
 $('audit-assumptions').innerHTML=`<ul>${audit.assumptions.map(a=>`<li>${escape(a)}</li>`).join('')}</ul>`;
 $('audit-more').innerHTML=audit.findings.filter(f=>f!==finding).map(f=>`<p><strong>${escape(f.title)}.</strong> ${escape(f.text)}</p>`).join('')+`<p>${number(audit.scenarios.length)} paired scenarios. ${number(Object.keys(audit.sourceHashes).length)} rule/content files are fingerprinted in the saved report.</p><p>Rules fingerprint: <code>${escape(audit.rulesFingerprint)}</code></p><p>Capital owned by this setup: ${money(current.config.capitalInvested)}. The fixture reports it separately from ticket receipts.</p>`;
}
for(const [id,key]of [['audit-fleet','fleet'],['audit-ticket','ticket'],['audit-route','route']])$(id).onchange=e=>{state[key]=Number(e.target.value);renderAudit();};
$('download-audit').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(audit,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pumpkin-patch-attraction-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

function createViewer(){
 const canvas=$('model-canvas'),stage=$('model-stage');
 let renderer=null,model=null,destroyed=false,contextHealthy=false,raf=0,lastDraw=0,spin=false,modelId=null,contextControl=null,drawCount=0;
 let yaw=.65,pitch=.58,zoom=1,baseDistance=5,target=new THREE.Vector3(0,1,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.01,100),clockOrigin=performance.now();
 const hemi=new THREE.HemisphereLight(0xdcc7ef,0x201526,2.1);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffdbb0,3.4);key.position.set(-3,5,4);scene.add(key);
 const fill=new THREE.DirectionalLight(0xb6a0ee,1.1);fill.position.set(4,2,-3);scene.add(fill);
 const baseGeometry=new THREE.CircleGeometry(1,64),baseMaterial=new THREE.MeshStandardMaterial({color:0x291f31,roughness:1,metalness:0});
 const base=new THREE.Mesh(baseGeometry,baseMaterial);base.rotation.x=-Math.PI/2;base.position.y=-.013;scene.add(base);
 const grid=new THREE.GridHelper(4,16,0x69516d,0x3b2e46);grid.position.y=-.008;grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);
 const pointers=new Map();let pinchDistance=0;
 function fallback(text){
  contextHealthy=false;pause();canvas.style.opacity='0';$('model-fallback').innerHTML=icon(rewardIcon(state.reward),180)+`<p>${escape(text)}</p>`;$('model-fallback').hidden=false;$('model-status').textContent='Painted reference · 3D preview unavailable';
 }
 function cameraPose(){camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*baseDistance*zoom,target.y+Math.sin(pitch)*baseDistance*zoom,target.z+Math.cos(yaw)*Math.cos(pitch)*baseDistance*zoom);camera.lookAt(target);camera.updateMatrixWorld();const degrees=((Math.round(yaw*180/Math.PI)%360)+360)%360;$('angle-readout').textContent=degrees+'° view';}
 function draw(){if(!renderer||!contextHealthy||destroyed)return;cameraPose();renderer.render(scene,camera);drawCount++;}
 function resize(){if(!renderer||destroyed)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();draw();}
 function fit(){
  if(!model)return;const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());target.copy(bounds.getCenter(new THREE.Vector3()));target.y=Math.max(.15,target.y);
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),horizontal=Math.max(size.x,size.z)*1.2/(2*tan*Math.max(.4,camera.aspect)),vertical=size.y*1.2/(2*tan);baseDistance=Math.max(horizontal,vertical,2.8);
  base.scale.setScalar(Math.max(size.x,size.z)*.78);grid.scale.setScalar(Math.max(1,Math.max(size.x,size.z)/2));
 }
 function frame(now){raf=0;if(destroyed||!contextHealthy||state.tab!=='rewards'||document.hidden)return;if(now-lastDraw>=1000/30){const dt=Math.min(.1,(now-lastDraw)/1000);lastDraw=now;if(spin)yaw+=dt*.22;if(!motion.matches)model?.userData.tick?.((now-clockOrigin)/1000);draw();}if(!motion.matches||spin)raf=requestAnimationFrame(frame);}
 function resume(){if(destroyed||!contextHealthy||state.tab!=='rewards'||document.hidden||raf)return;lastDraw=performance.now();draw();if(!motion.matches||spin)raf=requestAnimationFrame(frame);}
 function pause(){if(raf)cancelAnimationFrame(raf);raf=0;}
 function select(id){
  const p=rewardMap.get(id);if(!p)return;
  modelId=id;if(model){scene.remove(model);model.userData.dispose?.();model=null;}
  try{model=buildRewardProp(id,{animate:!motion.matches});scene.add(model);model.userData.tick?.(0);fit();zoom=1;yaw=.65;pitch=.58;$('view-preset').value='quarter';if(renderer&&contextHealthy){$('model-fallback').hidden=true;canvas.style.opacity='1';$('model-status').textContent='Drag to turn · Pinch to zoom';draw();resume();}else fallback('The 3D view could not start on this device. The painted reference remains available.');}catch(error){fallback('This model could not be displayed. Its source and blueprint remain in the contractor pack.');console.error(error);}
  renderModelNotes();
 }
 function reset(){yaw=.65;pitch=.58;zoom=1;$('view-preset').value='quarter';draw();}
 function adjustZoom(factor){zoom=THREE.MathUtils.clamp(zoom*factor,.6,2.2);draw();}
 const observer=new ResizeObserver(resize);observer.observe(stage);
 canvas.addEventListener('pointerdown',e=>{if(!contextHealthy)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);pinchDistance=0;});
 canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old||!contextHealthy)return;const next={x:e.clientX,y:e.clientY};pointers.set(e.pointerId,next);if(pointers.size===1){yaw-=(next.x-old.x)*.008;pitch=THREE.MathUtils.clamp(pitch+(next.y-old.y)*.005,.12,1.3);$('view-preset').value='quarter';}else{const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>1&&distance>1)zoom=THREE.MathUtils.clamp(zoom*pinchDistance/distance,.6,2.2);pinchDistance=distance;}draw();});
 const end=e=>{pointers.delete(e.pointerId);pinchDistance=0;};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();adjustZoom(Math.exp(THREE.MathUtils.clamp(e.deltaY,-150,150)*.002));},{passive:false});
 canvas.addEventListener('keydown',e=>{let handled=true;if(e.key==='ArrowLeft')yaw-=.13;else if(e.key==='ArrowRight')yaw+=.13;else if(e.key==='ArrowUp')pitch=Math.min(1.3,pitch+.08);else if(e.key==='ArrowDown')pitch=Math.max(.12,pitch-.08);else if(['+','='].includes(e.key))adjustZoom(.9);else if(e.key==='-')adjustZoom(1.1);else if(e.key==='Home')reset();else handled=false;if(handled){e.preventDefault();draw();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pointers.clear();pinchDistance=0;fallback('The 3D context paused. The painted reference is shown while the browser recovers.');});
 // Three.js restores its renderer in a listener on this same event. Rebuild
 // after those listeners have run, rather than drawing into half-restored state.
 canvas.addEventListener('webglcontextrestored',()=>queueMicrotask(()=>{if(destroyed)return;contextHealthy=true;select(modelId??state.reward);resize();resume();}));
 $('zoom-in').onclick=()=>adjustZoom(.86);$('zoom-out').onclick=()=>adjustZoom(1.16);$('reset-view').onclick=reset;
 $('view-preset').onchange=e=>{yaw={quarter:.65,front:0,side:Math.PI/2,back:Math.PI}[e.target.value]??.65;pitch=.58;draw();};
 $('spin-model').onclick=()=>{spin=!spin;$('spin-model').setAttribute('aria-pressed',String(spin));resume();};
 const visibility=()=>document.hidden?pause():resume();document.addEventListener('visibilitychange',visibility);addEventListener('pagehide',pause);addEventListener('pageshow',resume);
 motion.addEventListener('change',()=>{spin=false;$('spin-model').setAttribute('aria-pressed','false');pause();model?.userData.tick?.(0);draw();resume();});
 try{if(new URLSearchParams(location.search).has('no3d'))throw Error('Painted reference requested');renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;contextControl=renderer.getContext().getExtension('WEBGL_lose_context');contextHealthy=true;}catch{fallback('The 3D view could not start on this device. The painted reference remains available.');}
 function dispose(){if(destroyed)return;destroyed=true;contextHealthy=false;pause();observer.disconnect();model?.removeFromParent();model?.userData.dispose?.();model=null;baseGeometry.dispose();baseMaterial.dispose();grid.geometry.dispose();grid.material.dispose();renderer?.dispose();document.removeEventListener('visibilitychange',visibility);}
 return {select,resize,resume,pause,reset,dispose,setOrbit(next){if(Number.isFinite(next.yaw))yaw=next.yaw;if(Number.isFinite(next.pitch))pitch=THREE.MathUtils.clamp(next.pitch,.12,1.3);if(Number.isFinite(next.zoom))zoom=THREE.MathUtils.clamp(next.zoom,.6,2.2);draw();},status(){let actualMeshes=0;model?.traverse(o=>{if(o.isMesh)actualMeshes++;});return {ready:contextHealthy,destroyed,model:modelId,modelStats:model?.userData.stats??null,modelBounds:model?.userData.bounds??null,activeModels:model?.parent===scene?1:0,actualModelMeshes:actualMeshes,yaw,pitch,zoom,radius:baseDistance*zoom,cameraPosition:camera.position.toArray(),spin,reducedMotion:motion.matches,rafActive:!!raf,drawCount,drawCalls:renderer?.info.render.calls??0,rendererFrame:renderer?.info.render.frame??0,geometries:renderer?.info.memory.geometries??0,textures:renderer?.info.memory.textures??0,dpr:renderer?.getPixelRatio()??null,contextControlAvailable:!!contextControl};},loseContext(){contextControl?.loseContext();},restoreContext(){contextControl?.restoreContext();},render:draw};
}

let viewer=null;
choices();selectNight(state.theme);renderAudit();selectReward(state.reward);viewer=createViewer();viewer.select(state.reward);viewer.resize();viewer.resume();
window.LateGameWorkshop={content,audit,rewardMetadata:REWARD_PROPS,selectTab:tab,selectReward,selectNight,setAudit({fleet,ticket,route}){for(const[key,value]of Object.entries({fleet,ticket,route})){if(Number.isFinite(value)){state[key]=value;$('audit-'+key).value=String(value);}}renderAudit();},viewer,get state(){return {...state,viewer:viewer.status()};}};
