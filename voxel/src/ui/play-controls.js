// Play mode, laid out like a controller: the move stick on the left, the look
// stick low in the middle, and the face buttons on the right, with the
// context action biggest. Holding Tools opens a wheel you aim with your thumb
// or a stick and release to choose. Each button shows the glyph of whatever
// you're playing with: a keycap, DualSense shapes or Xbox letters.
import { glyphHTML, padFamily } from './glyphs.js';
import { createPadMenu } from './pad-menu.js';
const toolNames={hand:'Interact',plant:'Plant',water:'Water',harvest:'Pick',clean:'Clean'};
const inputField=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
const dead=v=>Math.abs(v)>.18?v:0;
const HOLD_MS=200,AIM=22;
const actionPaths={
 hand:'M8 12V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v5c0 5-3 7-6 7h-2c-2 0-3-1-4-3l-3-5a1.5 1.5 0 0 1 2-2l1 1Z',
 water:'M12 3c-2 4-7 7-7 12a7 7 0 0 0 14 0c0-5-5-8-7-12ZM9 16c0 2 1 3 3 3',
 plant:'M5 4c9-1 15 3 14 10-8 3-14-1-14-10ZM7 7l10 12M12 13v8',
 harvest:'M9 7c-6-2-8 3-7 7s4 6 10 6 9-2 10-6-1-9-7-7M12 6c-4 2-4 12 0 14 4-2 4-12 0-14ZM12 7V3l3-1',
 clean:'m5 20 6-6m-4-4 7 7 6-8-5-5-8 6ZM18 2v3m3 1h-3M5 6v4M3 8h4',
 sit:'M6 3v10h12v-5a3 3 0 0 0-3-3H9M6 13v8m12-8v8M4 13h16',
 read:'M12 5C8 2 4 3 2 4v15c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Zm0 0v15',
 pet:'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 11 8 15 5-4 13-10 8-15Z',
 home:'m3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7',
 wardrobe:'M10 5a2 2 0 1 1 3 2l-1 1v2L2 16v3h20v-3l-10-6',
 go:'M4 12h16m-6-6 6 6-6 6',
 stand:'M12 3v14m-5-9 5-5 5 5M4 21h16',
 manage:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
 move:'M12 2v20M2 12h20M12 2 9 5m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3',
 rotate:'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
 store:'M3 7h18v13H3zM3 7l2-4h14l2 4M9 12l3 3 3-3M12 9v6',
 undo:'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
 done:'m5 12 5 5 9-10',
 details:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
 exit:'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
 switch:'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
 tools:'M14.5 4.5a4 4 0 0 0-5 5L3 16l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5Z',
 walk:'M13 4a1.6 1.6 0 1 0 0-.1M10 21l2-6 3 3v3M8 12l2-4 4 1 2 4M12 15l-1-4',
 jog:'M15 4a1.6 1.6 0 1 0 0-.1M6 20l4-5 3 2 1 4M5 11l4-3 5 1 2 4 3 1M13 17l-2-6',
 recenter:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
 play:'M7 9h3M8.5 7.5v3M15 8.5h.01M17 10.5h.01M6 5h12a4 4 0 0 1 4 4v3.5a3.5 3.5 0 0 1-6.3 2.1L15 14H9l-.7.6A3.5 3.5 0 0 1 2 12.5V9a4 4 0 0 1 4-4Z',
};
const svg=(kind,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${actionPaths[kind]??actionPaths.hand}"/></svg>`;
const actionIcon=kind=>svg(kind);
const shortAction=(label,p,job,tool)=>{
 if(job.travelling)return 'Next crop';if(job.active)return label;
 if(p.pose)return 'Stand up';if(p.available===false)return label;
 const type=p.target?.type;
 if(tool!=='hand'||type==='plot')return /water/i.test(label)?'Water':/pick/i.test(label)?'Pick':/plant/i.test(label)?'Plant':/clean/i.test(label)?'Clean':label;
 return ({pumpkin:'Tap pumpkin',shop:'Shop',home:'Go home',cooking:'Cook',wardrobe:'Dress up',sit:'Sit',read:'Read',exit:'Leave',piece:'Arrange',go:'Go through',carve:'Carve',bed:({plant:'Plant',water:'Water',harvest:'Pick',wait:'Growing'})[p.target?.kind]})[type]??label;
};
// One wedge of the wheel, as an SVG path between two radii.
function wedge(i,n,inner=86,outer=166,gap=2.2){
  const span=360/n,a0=(i*span-span/2+gap/2-90)*Math.PI/180,a1=(i*span+span/2-gap/2-90)*Math.PI/180,large=span-gap>180?1:0;
  const p=(r,a)=>`${(180+r*Math.cos(a)).toFixed(2)} ${(180+r*Math.sin(a)).toFixed(2)}`;
  return`M${p(outer,a0)}A${outer} ${outer} 0 ${large} 1 ${p(outer,a1)}L${p(inner,a1)}A${inner} ${inner} 0 ${large} 0 ${p(inner,a0)}Z`;
}

export function createPlayControls({scene,state,tools,action,getActivity=()=>({}),openHome,openManage,openWardrobe,decorate,portrait,notice,back,editNearby,contextAction,feel=()=>{},holdToBuy=null,hubAllowed=()=>true}) {
  let padName='',details=false,previousPiece=null,previousFocus=null,radial=false,tool='hand',keys=new Set(),cameraKeys=new Set(),move={x:0,y:0},look={x:0,y:0},padPrevious=[],selectedIndex=0,repeatAt=0,held=null,suppressClickUntil=0;
  let inputMode=matchMedia?.('(pointer: coarse)').matches?'touch':'keyboard',shownMode='',hold=null,wheelItems=[],shownTool='',shownGait='',shownWho='',chain=0,retryFace=0;
  // A prompt over whatever the action button would act on, so the world says what is in reach.
  const prompt=document.createElement('div');prompt.className='play-prompt';prompt.setAttribute('aria-hidden','true');prompt.innerHTML='<span><kbd data-prompt-key>E</kbd><b data-prompt-label></b></span>';document.body.append(prompt);
  const root=document.createElement('div');root.id='play-controls';
  root.innerHTML=`<button id="play-toggle" class="play-chip" aria-label="Choose a character to play">${svg('play','play-chip-icon')}<span>Play</span></button>
    <div id="play-live" hidden>
      <div class="play-owner"><img data-owner-portrait alt=""><span data-owner></span><button data-play="switch" aria-label="Switch character">${svg('switch')}</button><button data-play="exit" aria-label="Exit control mode">${svg('exit')}<span data-glyph="back"></span></button><span class="play-menu-hint" aria-hidden="true"><span data-glyph="start"></span>Menu</span></div>
      <div id="play-stick" class="play-thumbstick" role="group" aria-label="Movement thumbstick"><b class="stick-ring"></b><b class="stick-arc"></b><i></i><span>MOVE</span></div>
      <div id="play-look" class="play-thumbstick play-look" role="group" aria-label="Camera thumbstick"><b class="stick-ring"></b><b class="stick-arc"></b><i></i><span>LOOK</span></div>
      <div class="play-actions play-face">
        <button id="play-interact" class="play-interact face-button"><span id="play-activity-progress" role="progressbar" aria-label="Action progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden></span><span class="play-action-key"><span data-action-icon aria-hidden="true"></span><kbd data-action-key>E</kbd></span><span class="play-action-copy"><span data-action-label>Explore</span><small data-action-hint>Tap</small></span><b class="play-chain" hidden></b><span data-glyph="action"></span><small id="play-focus-label"></small></button>
        <button id="play-wheel" class="play-wheel face-button" aria-label="Open radial tools"><span id="play-active-tool"><b data-tool-icon></b><small data-tool-name>Tools</small></span><span data-glyph="tools"></span></button>
        <button id="play-gait" class="play-gait face-button" aria-label="Switch between walking and jogging" title="Walk / jog · Shift / L3"><b data-gait-icon></b><small data-gait-label>Walk</small><span data-glyph="gait"></span></button>
        <button id="play-recenter" class="play-recenter face-button" aria-label="Centre the camera on your character" title="Centre camera · C / R3">${svg('recenter')}<span data-glyph="recenter"></span></button>
      </div>
    </div>
    <button id="play-arrange" class="play-arrange" aria-label="Arrange the nearby furniture" hidden>${svg('move')}<span>Arrange</span></button>
    <div id="furniture-pad" hidden><div class="play-piece-label"></div><div class="play-dpad" role="group" aria-label="Move selected furniture"><button data-nudge="0,-1" aria-label="Move back">${svg('go','up')}</button><button data-nudge="-1,0" aria-label="Move left">${svg('go','left')}</button><button data-nudge="1,0" aria-label="Move right">${svg('go')}</button><button data-nudge="0,1" aria-label="Move forward">${svg('go','down')}</button></div><div class="play-furniture-actions"><button data-turn="-15" aria-label="Rotate left 15 degrees">${svg('rotate','flip')}</button><button id="furniture-wheel" aria-label="Furniture radial menu">${svg('tools')}</button><button data-turn="15" aria-label="Rotate right 15 degrees">${svg('rotate')}</button><button data-finish>${svg('done')}<span>Done</span></button></div></div>
    <div id="play-radial" hidden role="dialog" aria-modal="true" aria-label="Choose an action"><button class="radial-dismiss" aria-label="Close action wheel"></button><div class="radial-disc"><svg class="radial-ring" viewBox="0 0 360 360" aria-hidden="true"><defs><linearGradient id="play-wedge-on" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd593"/><stop offset=".55" stop-color="#d4924b"/><stop offset="1" stop-color="#94562a"/></linearGradient></defs><circle class="radial-rim" cx="180" cy="180" r="174"/><g class="radial-wedges"></g></svg><div class="radial-options"></div><div class="radial-centre"><b class="radial-centre-icon"></b><p class="eyebrow">Your tools</p><h2>Interact</h2><p class="radial-hint"></p></div><button class="radial-close" aria-label="Close action wheel">${svg('exit')}</button></div></div>`;
  document.body.append(root);
  // Every menu on a pad (ui/pad-menu.js); Options brings the ring to the dock, the hub.
  const menus=createPadMenu({feel,back:()=>back?.(),hold:holdToBuy,hubAllowed});
  const dockGlyph=document.createElement('span');dockGlyph.className='dock-glyph';dockGlyph.dataset.glyph='start';document.getElementById('dock')?.append(dockGlyph);
  // Holding a game button is an input gesture, never Android text selection.
  root.oncontextmenu=e=>e.preventDefault();root.onselectstart=e=>e.preventDefault();root.ondragstart=e=>e.preventDefault();
  const $=s=>root.querySelector(s),wheel=$('#play-radial'),opts=$('.radial-options'),wedges=$('.radial-wedges'),disc=$('.radial-disc'),stickEl=$('#play-stick'),lookEl=$('#play-look'),interact=$('#play-interact');
  const setText=(el,text)=>{if(el&&el.textContent!==String(text))el.textContent=text;};
  const activity=()=>getActivity()??{};
  let releaseMove=()=>{},releaseLook=()=>{},shownActionIcon='',shownCompletion=null,completeTimer;

  // The glyphs follow the last thing used: touch, keys or a controller.
  function useInput(mode){if(mode!==inputMode){inputMode=mode;}}
  addEventListener('keydown',()=>useInput('keyboard'),{capture:true});
  addEventListener('pointerdown',e=>useInput(e.pointerType==='touch'||e.pointerType==='pen'?'touch':'keyboard'),{capture:true});
  function showGlyphs(){
    const mode=padName?(padName==='DualSense'?'dualsense':'xbox'):inputMode;if(mode===shownMode)return;shownMode=mode;
    root.dataset.input=mode;root.querySelectorAll('[data-glyph]').forEach(el=>{el.innerHTML=mode==='touch'?'':glyphHTML(el.dataset.glyph,mode);});
    dockGlyph.innerHTML=padName?glyphHTML('start',mode):'';
    if(radial)hintWheel();
  }

  // A pointer capture may outlive a sheet opening; end it explicitly on every boundary.
  function cancelInteraction(reason='cancel') {
    if(held||activity().active)action(tool,{phase:'cancel',source:held?.source??'controls',reason});
    held=null;interact.dataset.pressed='false';
  }
  function beginInteraction(source,id=null) {
    if(held)return;
    held={source,id,at:performance.now()};interact.dataset.pressed='true';chain=0;
    action(tool,{phase:'start',source,chain:true});
  }
  function endInteraction(source,id=null) {
    if(!held||held.source!==source||(id!==null&&held.id!==id))return;
    const durationMs=Math.max(0,performance.now()-held.at);held=null;interact.dataset.pressed='false';
    action(tool,{phase:'release',source,durationMs,assist:durationMs<220});
  }
  function close() {
    radial=false;hold=null;wheel.hidden=true;wheel.dataset.hold='false';keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function start(who) {
    cancelInteraction('character');scene.player?.setEnabled(true,who);tool='hand';close();
    notice(`Playing as ${who==='shane'?'Shane':'Natalie'}. Walk up to a crop, then tap or hold the action button.`);
  }
  function choose(id) {
    if(id==='shane'||id==='natalie'){start(id);return;}
    if(['hand','plant','water','harvest','clean'].includes(id)){cancelInteraction('tool');tool=id;close();feel('select');return;}
    close();
    if(id==='details'){details=true;return;}
    if(id==='switch')return openWheel('characters');
    if(id==='home')return openHome();if(id==='manage')return openManage();if(id==='wardrobe')return openWardrobe();if(id==='decorate')return decorate();
    if(id==='exit'){cancelInteraction('exit');scene.player?.setEnabled(false);return;}
    if(id==='rotate'){tools.rotate(15);return;}if(id==='move'){if(!tools.moving)tools.act('move');return;}
    tools.act(id==='done'?'done':id);
  }

  // The wheel: one wedge per choice; the highlighted wedge fills with amber,
  // and the centre names it. Aim with a thumb, a stick, the mouse or arrows.
  function hintWheel(){
    const mode=shownMode||inputMode;
    $('.radial-hint').innerHTML=hold?`Release to choose`:mode==='touch'?'Tap a tool, or hold and slide':`${glyphHTML('confirm',mode)} Choose ${glyphHTML('back',mode)} Close`;
  }
  function focusChoice(index,focus=true) {
    const buttons=[...opts.querySelectorAll('button')];if(!buttons.length)return;
    selectedIndex=(index+buttons.length)%buttons.length;
    wedges.querySelectorAll('path').forEach((p,i)=>p.classList.toggle('on',i===selectedIndex));
    buttons.forEach((b,i)=>b.classList.toggle('on',i===selectedIndex));
    const [id,label]=wheelItems[selectedIndex]??[];
    setText($('.radial-disc h2'),label??'');
    $('.radial-centre-icon').innerHTML=['shane','natalie'].includes(id)?`<img src="${portrait(id)}" alt="">`:svg(id==='hand'?'hand':id);
    if(focus)buttons[selectedIndex].focus({preventScroll:true});
  }
  // A direction picks the wedge under it; the first wedge is at the top.
  function aimAt(dx,dy){
    if(Math.hypot(dx,dy)<AIM)return false;
    const n=wheelItems.length,angle=(Math.atan2(dx,-dy)*180/Math.PI+360)%360,index=Math.round(angle/(360/n))%n;
    if(index!==selectedIndex){focusChoice(index,false);feel('tick');}
    if(hold)hold.aimed=true;return true;
  }
  function openWheel(kind,holding=null) {
    cancelInteraction('wheel');previousFocus=document.activeElement;keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);radial=true;wheel.hidden=false;
    hold=holding?{...holding,aimed:false}:null;wheel.dataset.hold=String(!!hold);
    wheelItems=kind==='characters'?[['natalie','Natalie'],['shane','Shane']]:tools.selected?[['move','Move'],['rotate','Turn 15°'],['undo','Undo'],['store','Store'],['details','More controls'],['done','Done']]:[['hand','Interact'],['plant','Plant'],['water','Water'],['harvest','Pick'],['clean','Clean'],['home','Home'],['wardrobe','Wardrobe'],['manage','Manage']];
    setText($('.radial-disc .eyebrow'),kind==='characters'?'Choose your story':tools.selected?'Make it yours':'Your tools');
    const n=wheelItems.length;opts.dataset.count=n;
    wedges.innerHTML=wheelItems.map((_,i)=>`<path d="${wedge(i,n)}"/>`).join('');
    opts.innerHTML=wheelItems.map(([id,label],i)=>`<button data-choice="${id}" style="--angle:${i*360/n}deg" aria-label="${label}" aria-pressed="${id===tool}">${['shane','natalie'].includes(id)?`<img src="${portrait(id)}" alt="">`:svg(id)}<span>${label}</span></button>`).join('');
    opts.querySelectorAll('button').forEach((b,i)=>{b.onclick=()=>choose(b.dataset.choice);b.onpointerenter=e=>{if(e.pointerType==='mouse')focusChoice(i,false);};});
    focusChoice(Math.max(0,wheelItems.findIndex(([id])=>id===(kind==='characters'?scene.player?.state().who:tool))),!hold);hintWheel();feel('open');
  }
  // Release after aiming picks the wedge; a release without aiming leaves the
  // wheel open to tap, like a quick press.
  function releaseWheel(){
    if(!hold)return;const aimed=hold.aimed;hold=null;wheel.dataset.hold='false';hintWheel();
    if(aimed)opts.querySelectorAll('button')[selectedIndex]?.click();
  }
  // Dragging over the open wheel aims it too.
  disc.addEventListener('pointermove',e=>{if(!radial||hold||e.pointerType==='mouse')return;const r=disc.getBoundingClientRect();aimAt(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);});

  const toggleGait=()=>{const gait=scene.player?.state().gait==='jog'?'walk':'jog';scene.player?.setGait?.(gait);feel('select');};
  // Tools: a quick press opens the wheel to tap; holding opens it to aim.
  function bindHoldOpen(button,kind=undefined){
    let press=null;
    button.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);press={id:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{if(press&&!radial)openWheel(kind,{source:'pointer',id:press.id});},HOLD_MS)};};
    button.onpointermove=e=>{if(!press||e.pointerId!==press.id)return;if(radial&&hold)aimAt(e.clientX-press.x,e.clientY-press.y);};
    // Released before the hold opened the wheel: a quick press, so open it to tap.
    button.onpointerup=e=>{if(!press||e.pointerId!==press.id)return;clearTimeout(press.timer);press=null;suppressClickUntil=performance.now()+400;if(radial&&hold)releaseWheel();else if(!radial)openWheel(kind);};
    button.onpointercancel=()=>{if(press){clearTimeout(press.timer);press=null;}if(hold)releaseWheel();};
    button.onclick=e=>{if(e.detail===0&&performance.now()>suppressClickUntil)openWheel(kind);};
  }
  bindHoldOpen($('#play-wheel'));bindHoldOpen($('#furniture-wheel'));
  $('#play-toggle').onclick=()=>openWheel('characters');$('.radial-close').onclick=close;$('.radial-dismiss').onclick=close;
  $('#play-gait').onclick=toggleGait;$('#play-recenter').onclick=()=>{scene.player?.recenter?.();feel('select');};
  $('#play-arrange').onclick=()=>{cancelInteraction('arrange');if(editNearby)editNearby();else if(contextAction)contextAction('edit',scene.player?.state().target);else decorate();};
  root.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>choose(b.dataset.play));

  // Short taps finish one assisted use; a deliberate hold can continue the same tool.
  interact.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();interact.setPointerCapture(e.pointerId);beginInteraction('pointer',e.pointerId);};
  interact.onpointerup=e=>{endInteraction('pointer',e.pointerId);suppressClickUntil=performance.now()+500;};
  interact.onpointercancel=()=>cancelInteraction('pointer-cancel');
  interact.onlostpointercapture=()=>{if(held?.source==='pointer')cancelInteraction('capture-lost');};
  interact.onclick=e=>{if(e.detail===0||performance.now()>suppressClickUntil)action(tool,{phase:'tap',source:'click'});};
  root.querySelectorAll('[data-nudge]').forEach(b=>{let timer;const stop=()=>clearInterval(timer);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);tools.nudge(...b.dataset.nudge.split(',').map(Number));timer=setInterval(()=>tools.nudge(...b.dataset.nudge.split(',').map(Number)),140);};b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;b.onclick=e=>{if(e.detail===0)tools.nudge(...b.dataset.nudge.split(',').map(Number));};});
  root.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>tools.rotate(+b.dataset.turn));$('[data-finish]').onclick=()=>tools.act('done');

  // Each thumb owns its own capture, so moving and looking work together on
  // touch. The cap follows the thumb, and an arc on the ring shows the push.
  function bindStick(element,set) {
    let pointer=null;
    let shown='';
    const show=(value,r)=>{const key=value.x.toFixed(2)+','+value.y.toFixed(2)+','+Math.round(r);if(key===shown)return;shown=key;const push=Math.min(1,Math.hypot(value.x,value.y));element.style.setProperty('--x',value.x*r*.27+'px');element.style.setProperty('--y',value.y*r*.27+'px');element.style.setProperty('--push',push.toFixed(3));element.style.setProperty('--aim',(Math.atan2(value.x,-value.y)*180/Math.PI).toFixed(1)+'deg');element.dataset.active=String(push>.05);};
    const lift=()=>{pointer=null;set({x:0,y:0});show({x:0,y:0},0);};
    const drag=e=>{const r=element.getBoundingClientRect(),reach=r.width*.35,dx=(e.clientX-r.left-r.width/2)/reach,dy=(e.clientY-r.top-r.height/2)/reach,length=Math.max(1,Math.hypot(dx,dy)),value={x:dx/length,y:dy/length};set(value);show(value,r.width);};
    element.onpointerdown=e=>{e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);drag(e);};element.onpointermove=e=>{if(e.pointerId===pointer)drag(e);};element.onpointerup=lift;element.onpointercancel=lift;element.onlostpointercapture=lift;
    return Object.assign(lift,{show:value=>show(value,element.getBoundingClientRect().width||90),get engaged(){return pointer!==null;}});
  }
  releaseMove=bindStick(stickEl,value=>{move=value;if(Math.hypot(value.x,value.y)>.12&&(held||activity().active))cancelInteraction('movement');});releaseLook=bindStick(lookEl,value=>look=value);
  addEventListener('blur',()=>{cancelInteraction('blur');keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);});
  addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);cameraKeys.delete(key);if(held?.source==='keyboard'&&held.id===key)endInteraction('keyboard',key);if(hold?.source==='keyboard'&&hold.id===key)releaseWheel();});
  // While a key holds the wheel open, the mouse aims it from the screen's centre.
  addEventListener('mousemove',e=>{if(radial&&hold?.source==='keyboard'){const r=disc.getBoundingClientRect();aimAt(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);}});
  function handleKey(e) {
    if(inputField())return false;
    const key=e.key.toLowerCase();
    if(radial){
      if(key==='escape'||key==='b'){e.preventDefault();close();return true;}
      const step=['arrowleft','arrowup'].includes(key)||key==='tab'&&e.shiftKey?-1:['arrowright','arrowdown','tab'].includes(key)?1:0;
      if(step&&!(e.repeat&&key==='tab')&&!(hold?.id===key)){e.preventDefault();focusChoice(selectedIndex+step,!hold);if(hold)hold.aimed=true;feel('tick');return true;}
      if(['enter',' ','x','e'].includes(key)){e.preventDefault();opts.querySelectorAll('button')[selectedIndex]?.click();return true;}return true;
    }
    if(menus.handleKey(e))return true;
    if(!scene.player?.state().enabled)return false;
    if(document.body.classList.contains('menu-open'))return false;
    if(tools.selected){if(key==='q'||key==='tab'){e.preventDefault();if(!e.repeat)openWheel(undefined,{source:'keyboard',id:key});return true;}return false;}
    if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();if(held||activity().active)cancelInteraction('movement');keys.add(key);return true;}
    if(['i','j','k','l'].includes(key)){e.preventDefault();cameraKeys.add(key);return true;}
    if(['x','e',' '].includes(key)){e.preventDefault();if(!e.repeat)beginInteraction('keyboard',key);return true;}
    if(key==='shift'){e.preventDefault();if(!e.repeat)toggleGait();return true;}
    if(key==='c'){e.preventDefault();if(!e.repeat){scene.player?.recenter?.();feel('select');}return true;}
    if(key==='['||key===']'){e.preventDefault();if(!e.repeat)scene.player?.zoom?.(key===']'?1:-1);return true;}
    if(key==='q'||key==='tab'){e.preventDefault();if(!e.repeat)openWheel(undefined,{source:'keyboard',id:key});return true;}
    if(key==='escape'){e.preventDefault();if(activity().active||held)cancelInteraction('back');else back?.();return true;}return false;
  }

  return {handleKey,open:()=>openWheel('characters'),close,start,cancel:cancelInteraction,menus,get active(){return scene.player?.state().enabled;},get radial(){return radial;},get tool(){return tool;},get chain(){return chain;},get hub(){return menus.hubOn;},tick(blocked=false){
    // The hub (the ring on the dock) holds play still, like any menu.
    blocked=blocked||menus.hubOn;
    const p=scene.player?.state()??{},selected=tools.selected,piece=state().house.placed.find(x=>x.instance===selected),job=activity();
    const pad=Array.from(navigator.getGamepads?.()??[]).find(g=>g?.connected),down=pad?.buttons.map(b=>b.pressed)??[],pressed=i=>down[i]&&!padPrevious[i];
    padName=padFamily(pad);
    showGlyphs();
    if(selected!==previousPiece){details=false;previousPiece=selected;}
    document.body.classList.toggle('control-mode',!!p.enabled);document.body.classList.toggle('furniture-radial',!!piece&&!blocked&&!details);
    $('#play-toggle').hidden=!!p.enabled||blocked||!!piece;$('#play-live').hidden=!p.enabled||blocked||radial||!!piece;
    stickEl.hidden=lookEl.hidden=$('#play-gait').hidden=$('#play-recenter').hidden=p.available===false;
    $('#furniture-pad').hidden=!piece||blocked||radial||details;
    $('#play-arrange').hidden=!p.enabled||blocked||radial||!!piece||!p.target?.instance||p.place==='estate'||p.available===false||!!p.pose;
    if(piece)setText($('.play-piece-label'),(piece.id??'Furniture').replaceAll('-',' ')+' · '+Math.round(piece.rotation??0)+'°');
    // The portrait can be blank until the sprites load, so keep asking until it is real.
    const face=$('[data-owner-portrait]');if(p.who&&(p.who!==shownWho||!face.naturalWidth&&performance.now()>retryFace)){const url=portrait(p.who);if(url){shownWho=p.who;face.src=url;}retryFace=performance.now()+1500;}
    setText($('[data-owner]'),p.who==='shane'?'Shane':'Natalie');setText($('#play-toggle span'),padName?'Play · '+padName:'Play');
    const gait=p.gait==='jog'?'jog':'walk';if(gait!==shownGait){shownGait=gait;$('[data-gait-icon]').innerHTML=svg(gait);setText($('[data-gait-label]'),gait==='jog'?'Jog':'Walk');$('#play-gait').setAttribute('aria-pressed',String(gait==='jog'));}
    if(tool!==shownTool){shownTool=tool;$('[data-tool-icon]').innerHTML=svg(tool==='hand'?'tools':tool);setText($('[data-tool-name]'),tool==='hand'?'Tools':toolNames[tool]);$('#play-wheel').setAttribute('aria-label',`${toolNames[tool]} selected. Open radial tools; hold to aim`);$('#play-wheel').dataset.tool=tool;}
    const pose=p.pose&&(typeof p.pose==='string'?p.pose:p.pose.kind),holdable=['plot','litter'].includes(p.target?.type);
    const label=p.available===false?(p.place==='estate'?'Enter home':'Back to farm'):job.active?job.label:pose?'Stand up':tool==='hand'?p.target?.label:({plant:'Plant seed',water:'Water crop',harvest:'Pick pumpkin',clean:'Clean litter'})[tool];
    const object=p.target?.objectLabel??p.target?.name??p.target?.item?.replaceAll('-',' ')??'';
    setText($('[data-action-key]'),padName==='DualSense'?'□':padName?'A':'E');setText($('[data-action-hint]'),job.travelling?'walking on':job.active?(job.holding?'holding':'finishing'):holdable?'tap · hold':'tap');setText($('[data-action-label]'),shortAction(label||'Explore',p,job,tool));setText($('#play-focus-label'),'');
    const reach=p.enabled&&!blocked&&!job.active&&!pose&&!p.passing&&tool==='hand'&&p.target?scene.player?.targetAt?.():null,spot=reach&&scene.project(reach.x,reach.y,reach.z);
    prompt.classList.toggle('show',!!spot);
    if(spot){prompt.style.transform=`translate(${Math.round(spot.x)}px,${Math.round(spot.y)}px)`;setText(prompt.querySelector('[data-prompt-label]'),p.target.label);setText(prompt.querySelector('[data-prompt-key]'),padName==='DualSense'?'□':padName?'A':inputMode==='touch'?'Tap':'E');}
    const icon=pose?'stand':job.kind??(tool==='hand'?({plot:/water/i.test(label)?'water':/pick/i.test(label)?'harvest':'plant',litter:'clean',pumpkin:'harvest',shop:'home',home:'home',cooking:'hand',wardrobe:'wardrobe',sit:'sit',read:'read',pet:'pet',exit:'go',go:'go',piece:'hand',carve:'hand',bed:({plant:'plant',water:'water',harvest:'harvest'})[p.target?.kind]??'hand'})[p.target?.type]??'hand':tool);
    if(shownActionIcon!==icon){$('[data-action-icon]').innerHTML=actionIcon(icon);shownActionIcon=icon;interact.dataset.kind=icon;}interact.dataset.input=padName?'gamepad':'touch';
    // Each finished use: a pulse, a buzz and, while holding, a streak count.
    if(job.last&&job.last!==shownCompletion){shownCompletion=job.last;if(job.last.success){clearTimeout(completeTimer);interact.classList.remove('play-complete');void interact.offsetWidth;interact.classList.add('play-complete');completeTimer=setTimeout(()=>interact.classList.remove('play-complete'),420);
      chain=held||job.holding||job.travelling?chain+1:1;feel('done',{kind:job.last.kind,pad});}}
    if(!held&&!job.active&&!job.travelling)chain=0;
    const streak=$('.play-chain');streak.hidden=chain<2;if(chain>=2)setText(streak,'×'+chain);
    const progress=Math.max(0,Math.min(1,Number(job.progress)||0));interact.style.setProperty('--action-progress',progress);$('#play-activity-progress').hidden=!job.active;$('#play-activity-progress').style.setProperty('--activity',progress*360+'deg');$('#play-activity-progress').setAttribute('aria-valuenow',String(Math.round(progress*100)));interact.setAttribute('aria-busy',String(!!job.active));interact.setAttribute('aria-label',`${label||'Explore'}${object?' · '+object:''}${holdable?' · tap once or hold to keep going':''}`);interact.disabled=!job.active&&!p.target&&!pose&&p.available!==false;
    scene.player?.setBlocked(blocked||radial||!!piece);
    if(blocked){cancelInteraction('menu');keys.clear();cameraKeys.clear();releaseMove();releaseLook();if(radial&&!piece)close();}
    // Menus take the pad first: a menu or the hub keeps its presses from play.
    const menuOwns=pad&&!radial&&!piece?menus.tick({pad,down,pressed,mode:padName==='DualSense'?'dualsense':'xbox',blocked}):false;
    if(!pad&&menus.hubOn)menus.leaveHub();
    if(pad&&!blocked&&!menuOwns){
      if(radial){
        // Either stick aims the wheel; letting go of Y/△ after aiming chooses.
        const left=[pad.axes[0]??0,pad.axes[1]??0],right=[pad.axes[2]??0,pad.axes[3]??0],[ax,ay]=Math.hypot(...right)>Math.hypot(...left)?right:left;
        if(Math.hypot(ax,ay)>.55)aimAt(ax*100,ay*100);
        if(hold?.source==='gamepad'&&!down[3])releaseWheel();
        else if(pressed(1))close();else if(pressed(0)||pressed(2))opts.querySelectorAll('button')[selectedIndex]?.click();else if(pressed(12)||pressed(13)||pressed(14)||pressed(15)){focusChoice(selectedIndex+(pressed(12)||pressed(14)?-1:1));feel('tick');}
      }else if(piece){
        if(pressed(4))tools.rotate(-15);if(pressed(5))tools.rotate(15);if(pressed(1))tools.act('done');if(pressed(3))openWheel(undefined,{source:'gamepad',id:3});
        if(performance.now()>repeatAt){const dx=(down[15]?1:0)-(down[14]?1:0),dz=(down[13]?1:0)-(down[12]?1:0);if(dx||dz){tools.nudge(dx,dz);repeatAt=performance.now()+140;}}
      }else if(p.enabled){
        if(pressed(0)||pressed(2))beginInteraction('gamepad',pressed(2)?2:0);
        if(held?.source==='gamepad'&&!down[held.id])endInteraction('gamepad',held.id);
        if(pressed(3))openWheel(undefined,{source:'gamepad',id:3});if(pressed(1)){if(job.active||held)cancelInteraction('back');else back?.();}
        if(pressed(10))toggleGait();if(pressed(11)){scene.player?.recenter?.();feel('select');}if(pressed(6))scene.player?.zoom?.(-1);if(pressed(7))scene.player?.zoom?.(1);
      }else if(pressed(0))openWheel('characters');
    }
    if(!pad&&held?.source==='gamepad')cancelInteraction('disconnect');padPrevious=down;
    let x=move.x,y=move.y,cx=look.x,cy=look.y;
    if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
    if(cameraKeys.has('j'))cx--;if(cameraKeys.has('l'))cx++;if(cameraKeys.has('i'))cy--;if(cameraKeys.has('k'))cy++;
    if(pad&&!radial&&!piece&&p.enabled){x+=dead(pad.axes[0]??0)+(down[15]?1:0)-(down[14]?1:0);y+=dead(pad.axes[1]??0)+(down[13]?1:0)-(down[12]?1:0);cx+=dead(pad.axes[2]??0);cy+=dead(pad.axes[3]??0);}
    // Keys and pads move the on-screen sticks too, so the screen shows the push.
    if(!releaseMove.engaged)releaseMove.show({x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))});
    if(!releaseLook.engaged)releaseLook.show({x:Math.max(-1,Math.min(1,cx)),y:Math.max(-1,Math.min(1,cy))});
    if(Math.hypot(x,y)>.12&&(job.active||held))cancelInteraction('movement');
    const stop=blocked||radial||!!piece||!p.enabled;scene.player?.input(stop?0:x,stop?0:y);scene.player?.cameraInput?.(stop?0:cx,stop?0:cy);
  }};
}
