// Two thumbsticks, one contextual action, and a wheel that stays out of the world.
const glyph={hand:'✋',plant:'🌱',water:'💧',harvest:'✂',clean:'✦',home:'⌂',wardrobe:'♧',decorate:'✥',manage:'☷',switch:'⇄',exit:'↩',move:'✥',rotate:'↻',store:'↓',undo:'↶',done:'✓'};
const toolNames={hand:'Interact',plant:'Plant',water:'Water',harvest:'Pick',clean:'Clean'};
const inputField=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
const dead=v=>Math.abs(v)>.18?v:0;

export function createPlayControls({scene,state,tools,action,getActivity=()=>({}),openHome,openManage,openWardrobe,decorate,portrait,notice,back,editNearby,contextAction}) {
  let padName='',menuRepeat=0,details=false,previousPiece=null,previousFocus=null,radial=false,tool='hand',keys=new Set(),cameraKeys=new Set(),move={x:0,y:0},look={x:0,y:0},padPrevious=[],selectedIndex=0,repeatAt=0,held=null,suppressClickUntil=0;
  const root=document.createElement('div');root.id='play-controls';
  root.innerHTML=`<button id="play-toggle" class="play-chip" aria-label="Choose a character to play">◈ <span>Play</span></button>
    <div id="play-live" hidden>
      <div class="play-owner"><span data-owner></span><button data-play="switch" aria-label="Switch character">⇄</button><button data-play="exit" aria-label="Exit control mode">×</button></div>
      <div id="play-stick" class="play-thumbstick" role="group" aria-label="Movement thumbstick"><i></i><span>MOVE</span></div>
      <button id="play-gait" class="play-gait" aria-label="Switch between walking and jogging" title="Walk / jog · Shift / L3">Walk</button>
      <div id="play-look" class="play-thumbstick" role="group" aria-label="Camera thumbstick"><i></i><span>LOOK</span></div>
      <button id="play-recenter" class="play-recenter" aria-label="Centre the camera on your character" title="Centre camera · C / R3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/></svg></button>
      <div class="play-actions">
        <button id="play-interact" class="play-interact"><span class="play-action-key"><span id="play-activity-progress" role="progressbar" aria-label="Action progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden></span><kbd data-action-key>X</kbd><small data-action-hint>Tap</small></span><span data-action-label>Explore</span><small id="play-focus-label"></small></button>
        <button id="play-wheel" class="play-wheel" aria-label="Open radial tools"><span id="play-active-tool"><b data-tool-icon>✥</b><small data-tool-name>Tools</small></span><i aria-hidden="true">· · ·</i></button>
        <button id="play-arrange" class="play-arrange" aria-label="Arrange the nearby furniture" hidden>Arrange</button>
      </div>
    </div>
    <div id="furniture-pad" hidden><div class="play-piece-label"></div><div class="play-dpad" role="group" aria-label="Move selected furniture"><button data-nudge="0,-1" aria-label="Move back">↑</button><button data-nudge="-1,0" aria-label="Move left">←</button><button data-nudge="1,0" aria-label="Move right">→</button><button data-nudge="0,1" aria-label="Move forward">↓</button></div><div class="play-furniture-actions"><button data-turn="-15" aria-label="Rotate left 15 degrees">↶</button><button id="furniture-wheel" aria-label="Furniture radial menu">✥</button><button data-turn="15" aria-label="Rotate right 15 degrees">↷</button><button data-finish>✓ Done</button></div></div>
    <div id="play-radial" hidden role="dialog" aria-modal="true" aria-label="Choose an action"><button class="radial-dismiss" aria-label="Close action wheel"></button><div class="radial-disc"><p class="eyebrow">Your tools</p><h2>Interact</h2><div class="radial-options"></div><button class="radial-close" aria-label="Close action wheel">×</button></div></div>`;
  document.body.append(root);
  const $=s=>root.querySelector(s),wheel=$('#play-radial'),opts=$('.radial-options'),stickEl=$('#play-stick'),lookEl=$('#play-look'),interact=$('#play-interact');
  const setText=(el,text)=>{if(el.textContent!==String(text))el.textContent=text;};
  const activity=()=>getActivity()??{};
  // Arrange is contextual, outside the transformed action cluster.
  root.append($('#play-arrange'));
  let releaseMove=()=>{},releaseLook=()=>{};

  // A pointer capture may outlive a sheet opening; end it explicitly on every boundary.
  function cancelInteraction(reason='cancel') {
    if(held||activity().active)action(tool,{phase:'cancel',source:held?.source??'controls',reason});
    held=null;
  }
  function beginInteraction(source,id=null) {
    if(held)return;
    held={source,id,at:performance.now()};
    action(tool,{phase:'start',source,chain:true});
  }
  function endInteraction(source,id=null) {
    if(!held||held.source!==source||(id!==null&&held.id!==id))return;
    const durationMs=Math.max(0,performance.now()-held.at);held=null;
    action(tool,{phase:'release',source,durationMs,assist:durationMs<220});
  }
  function close() {
    radial=false;wheel.hidden=true;keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function start(who) {
    cancelInteraction('character');scene.player?.setEnabled(true,who);tool='hand';close();
    notice(`Playing as ${who==='shane'?'Shane':'Natalie'}. Move close, then tap or hold to interact.`);
  }
  function choose(id) {
    if(id==='shane'||id==='natalie'){start(id);return;}
    if(['hand','plant','water','harvest','clean'].includes(id)){cancelInteraction('tool');tool=id;close();return;}
    close();
    if(id==='details'){details=true;return;}
    if(id==='switch')return openWheel('characters');
    if(id==='home')return openHome();if(id==='manage')return openManage();if(id==='wardrobe')return openWardrobe();if(id==='decorate')return decorate();
    if(id==='exit'){cancelInteraction('exit');scene.player?.setEnabled(false);return;}
    if(id==='rotate'){tools.rotate(15);return;}if(id==='move'){if(!tools.moving)tools.act('move');return;}
    tools.act(id==='done'?'done':id);
  }
  function focusChoice(index) {
    const buttons=[...opts.querySelectorAll('button')];if(!buttons.length)return;
    selectedIndex=(index+buttons.length)%buttons.length;buttons[selectedIndex].focus({preventScroll:true});
  }
  function openWheel(kind) {
    cancelInteraction('wheel');previousFocus=document.activeElement;keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);radial=true;wheel.hidden=false;
    const items=kind==='characters'?[['natalie','Natalie'],['shane','Shane']]:tools.selected?[['move','Move'],['rotate','Turn 15°'],['undo','Undo'],['store','Store'],['details','More controls'],['done','Done']]:[['hand','Interact'],['plant','Plant'],['water','Water'],['harvest','Pick'],['clean','Clean'],['home','Home'],['wardrobe','Wardrobe'],['manage','Manage']];
    setText($('.radial-disc .eyebrow'),kind==='characters'?'Choose your story':tools.selected?'Make it yours':'Your tools');
    setText($('.radial-disc h2'),kind==='characters'?'Play as…':tools.selected?'Arrange':toolNames[tool]);
    opts.dataset.count=items.length;opts.innerHTML=items.map(([id,label],i)=>`<button data-choice="${id}" style="--angle:${i*360/items.length}deg" aria-label="${label}" aria-pressed="${id===tool}">${['shane','natalie'].includes(id)?`<img src="${portrait(id)}" alt="">`:`<b aria-hidden="true">${glyph[id]??'✦'}</b>`}<span>${label}</span></button>`).join('');
    opts.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.choice));
    selectedIndex=Math.max(0,items.findIndex(([id])=>id===(kind==='characters'?scene.player?.state().who:tool)));focusChoice(selectedIndex);
  }
  const toggleGait=()=>{const gait=scene.player?.state().gait==='jog'?'walk':'jog';scene.player?.setGait?.(gait);};
  $('#play-toggle').onclick=()=>openWheel('characters');$('#play-wheel').onclick=()=>openWheel();$('#furniture-wheel').onclick=()=>openWheel();$('.radial-close').onclick=close;$('.radial-dismiss').onclick=close;
  $('#play-gait').onclick=toggleGait;$('#play-recenter').onclick=()=>scene.player?.recenter?.();
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

  // Each thumb owns its own capture, so moving and looking work together on touch.
  function bindStick(element,set) {
    let pointer=null;
    const lift=()=>{pointer=null;set({x:0,y:0});element.style.setProperty('--x','0px');element.style.setProperty('--y','0px');};
    const drag=e=>{const r=element.getBoundingClientRect(),reach=r.width*.35,dx=(e.clientX-r.left-r.width/2)/reach,dy=(e.clientY-r.top-r.height/2)/reach,length=Math.max(1,Math.hypot(dx,dy)),value={x:dx/length,y:dy/length};set(value);element.style.setProperty('--x',value.x*r.width*.26+'px');element.style.setProperty('--y',value.y*r.width*.26+'px');};
    element.onpointerdown=e=>{e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);drag(e);};element.onpointermove=e=>{if(e.pointerId===pointer)drag(e);};element.onpointerup=lift;element.onpointercancel=lift;element.onlostpointercapture=lift;return lift;
  }
  releaseMove=bindStick(stickEl,value=>{move=value;if(Math.hypot(value.x,value.y)>.12&&(held||activity().active))cancelInteraction('movement');});releaseLook=bindStick(lookEl,value=>look=value);
  addEventListener('blur',()=>{cancelInteraction('blur');keys.clear();cameraKeys.clear();releaseMove();releaseLook();scene.player?.input(0,0);scene.player?.cameraInput?.(0,0);});
  addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);cameraKeys.delete(key);if(held?.source==='keyboard'&&held.id===key)endInteraction('keyboard',key);});
  function handleKey(e) {
    if(inputField())return false;
    const key=e.key.toLowerCase();
    if(radial){if(key==='escape'||key==='b'){e.preventDefault();close();return true;}const buttons=[...opts.querySelectorAll('button')];if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Tab'].includes(e.key)){e.preventDefault();focusChoice(selectedIndex+(['ArrowLeft','ArrowUp'].includes(e.key)||e.shiftKey?-1:1));return true;}if(['enter',' ','x','e'].includes(key)){e.preventDefault();buttons[selectedIndex]?.click();return true;}return true;}
    if(!scene.player?.state().enabled)return false;
    if(document.body.classList.contains('menu-open'))return false;
    if(tools.selected){if(key==='q'||key==='tab'){e.preventDefault();openWheel();return true;}return false;}
    if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();if(held||activity().active)cancelInteraction('movement');keys.add(key);return true;}
    if(['i','j','k','l'].includes(key)){e.preventDefault();cameraKeys.add(key);return true;}
    if(['x','e',' '].includes(key)){e.preventDefault();if(!e.repeat)beginInteraction('keyboard',key);return true;}
    if(key==='shift'){e.preventDefault();if(!e.repeat)toggleGait();return true;}
    if(key==='c'){e.preventDefault();if(!e.repeat)scene.player?.recenter?.();return true;}
    if(key==='['||key===']'){e.preventDefault();if(!e.repeat)scene.player?.zoom?.(key===']'?1:-1);return true;}
    if(key==='q'||key==='tab'){e.preventDefault();openWheel();return true;}
    if(key==='escape'){e.preventDefault();if(activity().active||held)cancelInteraction('back');else back?.();return true;}return false;
  }

  // Controller menu focus uses the same native controls as touch and keyboard.
  function menuInput(down,pressed) {
    const menu=document.querySelector('.house-goal-modal:not([hidden]),#level-celebration:not([hidden]),#sheet:not([hidden]),#upgrade-menu:not([hidden]),#intro:not([hidden])');
    if(pressed(1)){back?.();return;}if(!menu)return;
    const buttons=[...menu.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));let at=buttons.indexOf(document.activeElement);const focused=buttons[at];
    if((down[12]||down[13])&&performance.now()>menuRepeat&&buttons.length){at=(at+(down[12]?-1:1)+buttons.length)%buttons.length;buttons[at].focus({preventScroll:true});buttons[at].scrollIntoView({block:'nearest'});menuRepeat=performance.now()+220;}
    if((pressed(14)||pressed(15))&&focused){const dir=pressed(15)?1:-1;if(focused.tagName==='SELECT'){let next=focused.selectedIndex;do{next+=dir;}while(focused.options[next]?.disabled);if(focused.options[next]){focused.selectedIndex=next;focused.dispatchEvent(new Event('change',{bubbles:true}));}}else if(focused.matches('input[type=range],input[type=number]')){try{dir>0?focused.stepUp():focused.stepDown();focused.dispatchEvent(new Event('input',{bubbles:true}));focused.dispatchEvent(new Event('change',{bubbles:true}));}catch{}}}
    if(pressed(0)||pressed(2)){if(focused?.tagName==='SELECT')notice('Use the d-pad left / right to choose.');else focused?.click();}
  }
  return {handleKey,open:()=>openWheel('characters'),close,start,cancel:cancelInteraction,get active(){return scene.player?.state().enabled;},get radial(){return radial;},get tool(){return tool;},tick(blocked=false){
    const p=scene.player?.state()??{},selected=tools.selected,piece=state().house.placed.find(x=>x.instance===selected),job=activity();
    const pad=Array.from(navigator.getGamepads?.()??[]).find(g=>g?.connected),down=pad?.buttons.map(b=>b.pressed)??[],pressed=i=>down[i]&&!padPrevious[i];
    padName=pad?(/dualsense|wireless controller|054c|playstation|ps5/i.test(pad.id)?'DualSense':'Controller'):'';
    if(selected!==previousPiece){details=false;previousPiece=selected;}
    document.body.classList.toggle('control-mode',!!p.enabled);document.body.classList.toggle('furniture-radial',!!piece&&!blocked&&!details);
    $('#play-toggle').hidden=!!p.enabled||blocked||!!piece;$('#play-live').hidden=!p.enabled||blocked||radial||!!piece;
    stickEl.hidden=lookEl.hidden=$('#play-gait').hidden=$('#play-recenter').hidden=p.available===false;
    $('#furniture-pad').hidden=!piece||blocked||radial||details;
    $('#play-arrange').hidden=!p.target?.instance||p.available===false||!!p.pose;
    if(piece)setText($('.play-piece-label'),(piece.id??'Furniture').replaceAll('-',' ')+' · '+Math.round(piece.rotation??0)+'°');
    setText($('[data-owner]'),p.who==='shane'?'Shane':'Natalie');setText($('#play-toggle span'),padName?'Play · '+padName:'Play');
    setText($('#play-gait'),p.gait==='jog'?'Jog':'Walk');$('#play-gait').setAttribute('aria-pressed',String(p.gait==='jog'));
    setText($('[data-tool-icon]'),tool==='hand'?(padName==='DualSense'?'△':'✥'):glyph[tool]);setText($('[data-tool-name]'),tool==='hand'?'Tools':toolNames[tool]);$('#play-wheel').setAttribute('aria-label',`${toolNames[tool]} selected. Open radial tools`);
    const pose=p.pose&&(typeof p.pose==='string'?p.pose:p.pose.kind),holdable=['plot','litter'].includes(p.target?.type);
    const label=p.available===false?(p.place==='estate'?'Enter home':'Back to farm'):job.active?job.label:pose?'Stand up':tool==='hand'?p.target?.label:({plant:'Plant seed',water:'Water crop',harvest:'Pick pumpkin',clean:'Clean litter'})[tool];
    const object=p.target?.objectLabel??p.target?.name??p.target?.item?.replaceAll('-',' ')??'';
    setText($('[data-action-key]'),padName==='DualSense'?'□':padName?'A':'X');setText($('[data-action-hint]'),job.travelling?'Go to':job.active?(job.holding?'Hold':'Using'):holdable?'Tap / hold':'Tap');setText($('[data-action-label]'),label||'Explore');setText($('#play-focus-label'),object===label?'':object);
    const progress=Math.max(0,Math.min(1,Number(job.progress)||0));$('#play-activity-progress').hidden=!job.active;$('#play-activity-progress').style.setProperty('--activity',progress*360+'deg');$('#play-activity-progress').setAttribute('aria-valuenow',String(Math.round(progress*100)));interact.setAttribute('aria-busy',String(!!job.active));interact.setAttribute('aria-label',`${label||'Explore'}${object?' · '+object:''}${holdable?' · tap once or hold to keep using':''}`);interact.disabled=!job.active&&!p.target&&!pose&&p.available!==false;
    scene.player?.setBlocked(blocked||radial||!!piece);
    if(blocked){cancelInteraction('menu');keys.clear();cameraKeys.clear();releaseMove();releaseLook();}
    if(pad&&blocked)menuInput(down,pressed);
    if(pad&&!blocked){
      if(pressed(9)&&p.enabled&&!radial&&!piece){cancelInteraction('menu');openManage();}
      if(radial){
        const ax=pad.axes[0]??0,ay=pad.axes[1]??0;if(Math.hypot(ax,ay)>.65){const buttons=opts.querySelectorAll('button'),angle=(Math.atan2(ax,-ay)*180/Math.PI+360-(buttons.length===2?90:0)+360)%360;focusChoice(Math.round(angle/360*buttons.length));}
        if(pressed(1))close();else if(pressed(0)||pressed(2))opts.querySelectorAll('button')[selectedIndex]?.click();else if(pressed(12)||pressed(13)||pressed(14)||pressed(15))focusChoice(selectedIndex+(pressed(12)||pressed(14)?-1:1));
      }else if(piece){
        if(pressed(4))tools.rotate(-15);if(pressed(5))tools.rotate(15);if(pressed(1))tools.act('done');if(pressed(3))openWheel();
        if(performance.now()>repeatAt){const dx=(down[15]?1:0)-(down[14]?1:0),dz=(down[13]?1:0)-(down[12]?1:0);if(dx||dz){tools.nudge(dx,dz);repeatAt=performance.now()+140;}}
      }else if(p.enabled){
        if(pressed(0)||pressed(2))beginInteraction('gamepad',pressed(2)?2:0);
        if(held?.source==='gamepad'&&!down[held.id])endInteraction('gamepad',held.id);
        if(pressed(3))openWheel();if(pressed(1)){if(job.active||held)cancelInteraction('back');else back?.();}
        if(pressed(10))toggleGait();if(pressed(11))scene.player?.recenter?.();if(pressed(6))scene.player?.zoom?.(-1);if(pressed(7))scene.player?.zoom?.(1);
      }else if(pressed(9)||pressed(0))openWheel('characters');
    }
    if(!pad&&held?.source==='gamepad')cancelInteraction('disconnect');padPrevious=down;
    let x=move.x,y=move.y,cx=look.x,cy=look.y;
    if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
    if(cameraKeys.has('j'))cx--;if(cameraKeys.has('l'))cx++;if(cameraKeys.has('i'))cy--;if(cameraKeys.has('k'))cy++;
    if(pad&&!radial&&!piece&&p.enabled){x+=dead(pad.axes[0]??0)+(down[15]?1:0)-(down[14]?1:0);y+=dead(pad.axes[1]??0)+(down[13]?1:0)-(down[12]?1:0);cx+=dead(pad.axes[2]??0);cy+=dead(pad.axes[3]??0);}
    if(Math.hypot(x,y)>.12&&(job.active||held))cancelInteraction('movement');
    const stop=blocked||radial||!!piece||!p.enabled;scene.player?.input(stop?0:x,stop?0:y);scene.player?.cameraInput?.(stop?0:cx,stop?0:cy);
  }};
}
