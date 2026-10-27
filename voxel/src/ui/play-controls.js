// A light controller layer: one stick, one context action, tools on demand.
const glyph={hand:'✋',plant:'🌱',water:'💧',harvest:'✂',clean:'✦',home:'⌂',wardrobe:'♧',decorate:'✥',manage:'☷',switch:'⇄',exit:'↩',move:'✥',rotate:'↻',store:'↓',undo:'↶',done:'✓'};
export function createPlayControls({scene,state,tools,action,openHome,openManage,openWardrobe,decorate,portrait,notice,back}) {
  let padName='',menuRepeat=0,details=false,previousPiece=null,previousFocus=null,radial=false,tool='hand',keys=new Set(),stick={x:0,y:0},padPrevious=[],last='',selectedIndex=0,repeatAt=0;
  const root=document.createElement('div');root.id='play-controls';root.innerHTML=`<button id="play-toggle" class="play-chip" aria-label="Choose a character to play">◈ <span>Play</span></button><div id="play-live" hidden><div class="play-owner"><span data-owner></span><button data-play="switch" aria-label="Switch character">⇄</button><button data-play="exit" aria-label="Exit control mode">×</button></div><div id="play-stick" role="group" aria-label="Movement thumbstick"><i></i><span>MOVE</span></div><div class="play-actions"><button id="play-interact" class="play-interact"><kbd>X</kbd><span>Explore</span></button><button id="play-wheel" class="play-wheel" aria-label="Open radial tools">✥<small>Tools</small></button></div></div><div id="furniture-pad" hidden><div class="play-piece-label"></div><div class="play-dpad" role="group" aria-label="Move selected furniture"><button data-nudge="0,-1" aria-label="Move back">↑</button><button data-nudge="-1,0" aria-label="Move left">←</button><button data-nudge="1,0" aria-label="Move right">→</button><button data-nudge="0,1" aria-label="Move forward">↓</button></div><div class="play-furniture-actions"><button data-turn="-15" aria-label="Rotate left 15 degrees">↶</button><button id="furniture-wheel" aria-label="Furniture radial menu">✥</button><button data-turn="15" aria-label="Rotate right 15 degrees">↷</button><button data-finish>✓ Done</button></div></div><div id="play-radial" hidden role="dialog" aria-modal="true" aria-label="Choose an action"><button class="radial-dismiss" aria-label="Close action wheel"></button><div class="radial-disc"><p class="eyebrow">Make yourself at home</p><h2>Choose your tools</h2><div class="radial-options"></div><button class="radial-close" aria-label="Close action wheel">×</button></div></div>`;document.body.append(root);
  const $=s=>root.querySelector(s),wheel=$('#play-radial'),opts=$('.radial-options');
  function close(){radial=false;wheel.hidden=true;keys.clear();stick={x:0,y:0};stickEl.style.setProperty('--x','0px');stickEl.style.setProperty('--y','0px');scene.player?.input(0,0);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  function start(who){scene.player?.setEnabled(true,who);tool='hand';close();notice(`Playing as ${who==='shane'?'Shane':'Natalie'}. Move close and press X to interact.`);}
  function choose(id){
    if(id==='shane'||id==='natalie'){start(id);return;}
    if(['hand','plant','water','harvest','clean'].includes(id)){tool=id;close();return;}
    close();
    if(id==='details'){details=true;return;}
    if(id==='switch')return openWheel('characters');
    if(id==='home')return openHome();if(id==='manage')return openManage();if(id==='wardrobe')return openWardrobe();if(id==='decorate')return decorate();
    if(id==='exit'){scene.player?.setEnabled(false);return;}
    if(id==='rotate'){tools.rotate(15);return;}if(id==='move'){if(!tools.moving)tools.act('move');return;}
    tools.act(id==='done'?'done':id);
  }
  function openWheel(kind){
    previousFocus=document.activeElement;keys.clear();stick={x:0,y:0};scene.player?.input(0,0);radial=true;selectedIndex=0;wheel.hidden=false;
    let items=kind==='characters'?[['natalie','Natalie'],['shane','Shane']]:tools.selected?[['move','Move'],['rotate','Turn 15°'],['undo','Undo'],['store','Store'],['details','More controls'],['done','Done']]:[['hand','Interact'],['plant','Plant'],['water','Water'],['harvest','Pick'],['clean','Clean'],['home','Home'],['wardrobe','Wardrobe'],['manage','Manage']];
    $('.radial-disc h2').textContent=kind==='characters'?'Who will you play?':tools.selected?'Make it yours':'A little hands-on magic';
    opts.dataset.count=items.length;opts.innerHTML=items.map(([id,label],i)=>`<button data-choice="${id}" style="--angle:${i*360/items.length}deg" aria-label="${label}">${['shane','natalie'].includes(id)?`<img src="${portrait(id)}" alt="">`:`<b aria-hidden="true">${glyph[id]??'✦'}</b>`}<span>${label}</span></button>`).join('');
    opts.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.choice));opts.querySelector('button')?.focus({preventScroll:true});
  }
  $('#play-toggle').onclick=()=>openWheel('characters');$('#play-wheel').onclick=()=>openWheel();$('#furniture-wheel').onclick=()=>openWheel();$('.radial-close').onclick=close;$('.radial-dismiss').onclick=close;
  root.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>choose(b.dataset.play));
  $('#play-interact').onclick=()=>action(tool);
  root.querySelectorAll('[data-nudge]').forEach(b=>{let timer;const stop=()=>{clearInterval(timer);};b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);tools.nudge(...b.dataset.nudge.split(',').map(Number));timer=setInterval(()=>tools.nudge(...b.dataset.nudge.split(',').map(Number)),140);};b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;b.onclick=e=>{if(e.detail===0)tools.nudge(...b.dataset.nudge.split(',').map(Number));};});
  root.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>tools.rotate(+b.dataset.turn));$('[data-finish]').onclick=()=>tools.act('done');
  const stickEl=$('#play-stick');let pointer=null;
  const drag=e=>{const r=stickEl.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/40,dy=(e.clientY-r.top-r.height/2)/40,len=Math.max(1,Math.hypot(dx,dy));stick={x:dx/len,y:dy/len};stickEl.style.setProperty('--x',stick.x*29+'px');stickEl.style.setProperty('--y',stick.y*29+'px');};
  const lift=()=>{pointer=null;stick={x:0,y:0};stickEl.style.setProperty('--x','0px');stickEl.style.setProperty('--y','0px');};
  stickEl.onpointerdown=e=>{e.preventDefault();pointer=e.pointerId;stickEl.setPointerCapture(pointer);drag(e);};stickEl.onpointermove=e=>{if(e.pointerId===pointer)drag(e);};stickEl.onpointerup=lift;stickEl.onpointercancel=lift;stickEl.onlostpointercapture=lift;
  addEventListener('blur',()=>{keys.clear();lift();scene.player?.input(0,0);});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  function handleKey(e){
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return false;
    if(radial){if(e.key==='Escape'||e.key.toLowerCase()==='b'){e.preventDefault();close();return true;}const buttons=[...opts.querySelectorAll('button')];if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Tab'].includes(e.key)){e.preventDefault();selectedIndex=(selectedIndex+(['ArrowLeft','ArrowUp'].includes(e.key)||e.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[selectedIndex]?.focus();return true;}if(['Enter',' ','x'].includes(e.key.toLowerCase())){e.preventDefault();buttons[selectedIndex]?.click();return true;}return true;}
    if(!scene.player?.state().enabled)return false;
    if(document.body.classList.contains('menu-open')||tools.selected)return false;
    const key=e.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);return true;}
    if(['x','e',' '].includes(key)){e.preventDefault();if(!e.repeat)action(tool);return true;}
    if(key==='q'||key==='tab'){e.preventDefault();openWheel();return true;}
    if(key==='escape'){e.preventDefault();choose('exit');return true;}return false;
  }
  return {handleKey,open:()=>openWheel('characters'),close,start,get active(){return scene.player?.state().enabled;},get radial(){return radial;},tick(blocked=false){
    const p=scene.player?.state()??{},selected=tools.selected,piece=state().house.placed.find(x=>x.instance===selected);if(selected!==previousPiece){details=false;previousPiece=selected;}document.body.classList.toggle('control-mode',!!p.enabled);document.body.classList.toggle('furniture-radial',!!piece&&!blocked&&!details);
    $('#play-toggle').hidden=!!p.enabled||blocked||!!piece;$('#play-live').hidden=!p.enabled||blocked||radial||!!piece;stickEl.hidden=p.available===false;$('#furniture-pad').hidden=!piece||blocked||radial||details;
    if(piece){$('.play-piece-label').textContent=(state().house.placed.find(x=>x.instance===selected)?.id??'Furniture').replaceAll('-',' ')+' · '+Math.round(piece.rotation??0)+'°';}
    const status=p.available===false?(p.place==='estate'?'Enter home':'Back to farm'):tool==='hand'?p.target?.label:({plant:'Plant seed',water:'Water crop',harvest:'Pick pumpkin',clean:'Clean litter'})[tool];const html=`<kbd>${padName==='DualSense'?'□':padName?'A':'X'}</kbd><span>${p.action?'Working…':status||'Explore'}</span>`;if(last!==html){$('#play-interact').innerHTML=html;last=html;}$('#play-interact').disabled=!!p.action||(!p.target&&p.available!==false);
    $('[data-owner]').textContent=p.who==='shane'?'Shane':'Natalie';scene.player?.setBlocked(blocked||radial||!!piece);
    const pad=Array.from(navigator.getGamepads?.()??[]).find(g=>g?.connected),down=pad?.buttons.map(b=>b.pressed)??[];padName=pad?(/dualsense|wireless controller|054c|playstation|ps5/i.test(pad.id)?'DualSense':'Controller'):'';$('#play-toggle span').textContent=padName?'Play · '+padName:'Play';$('#play-wheel').innerHTML=padName==='DualSense'?'△<small>Tools</small>':'✥<small>Tools</small>';
    const pressed=i=>down[i]&&!padPrevious[i];
    if(pad&&blocked){
      const menu=document.querySelector('.house-goal-modal:not([hidden]),#level-celebration:not([hidden]),#sheet:not([hidden]),#upgrade-menu:not([hidden]),#intro:not([hidden])');
      if(pressed(1))back?.();
      if(menu){const buttons=[...menu.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));let at=buttons.indexOf(document.activeElement);const focused=buttons[at];
        if((down[12]||down[13])&&performance.now()>menuRepeat){at=(at+(down[12]?-1:1)+buttons.length)%buttons.length;buttons[at]?.focus({preventScroll:true});buttons[at]?.scrollIntoView({block:'nearest'});menuRepeat=performance.now()+220;}
        if((pressed(14)||pressed(15))&&focused){const dir=pressed(15)?1:-1;if(focused.tagName==='SELECT'){let next=focused.selectedIndex;do{next+=dir;}while(focused.options[next]?.disabled);if(focused.options[next]){focused.selectedIndex=next;focused.dispatchEvent(new Event('change',{bubbles:true}));}}else if(focused.matches('input[type=range],input[type=number]')){dir>0?focused.stepUp():focused.stepDown();focused.dispatchEvent(new Event('input',{bubbles:true}));focused.dispatchEvent(new Event('change',{bubbles:true}));}}
        if(pressed(0)||pressed(2)){if(focused?.tagName==='SELECT')notice('Use the d-pad left / right to choose.');else focused?.click();}
      }
    }
    if(pad&&!blocked){if(pressed(9)&&p.enabled&&!radial&&!piece)openManage();if(radial){const ax=pad.axes[0]??0,ay=pad.axes[1]??0;if(Math.hypot(ax,ay)>.65){const buttons=[...opts.querySelectorAll('button')],angle=(Math.atan2(ax,-ay)*180/Math.PI+360-(buttons.length===2?90:0)+360)%360;selectedIndex=Math.round(angle/360*buttons.length)%buttons.length;buttons[selectedIndex]?.focus({preventScroll:true});}if(pressed(1))close();if(pressed(0)||pressed(2))opts.querySelectorAll('button')[selectedIndex]?.click();if(pressed(12)||pressed(13)||pressed(14)||pressed(15)){const buttons=[...opts.querySelectorAll('button')];selectedIndex=(selectedIndex+(pressed(12)||pressed(14)?-1:1)+buttons.length)%buttons.length;buttons[selectedIndex]?.focus();}}else if(piece){if(pressed(4))tools.rotate(-15);if(pressed(5))tools.rotate(15);if(pressed(1))tools.act('done');if(pressed(3))openWheel();if(performance.now()>repeatAt){const dx=(down[15]?1:0)-(down[14]?1:0),dz=(down[13]?1:0)-(down[12]?1:0);if(dx||dz){tools.nudge(dx,dz);repeatAt=performance.now()+140;}}}else if(p.enabled){if(pressed(0)||pressed(2))action(tool);if(pressed(3))openWheel();if(pressed(1))back?.();}else if(pressed(9)||pressed(0))openWheel('characters');}
    padPrevious=down;
    let x=stick.x,y=stick.y;if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))y--;if(keys.has('s')||keys.has('arrowdown'))y++;
    if(pad&&!radial&&!piece&&p.enabled){const dead=v=>Math.abs(v)>.18?v:0;x+=dead(pad.axes[0]??0)+(down[15]?1:0)-(down[14]?1:0);y+=dead(pad.axes[1]??0)+(down[13]?1:0)-(down[12]?1:0);}
    if(blocked){keys.clear();lift();}scene.player?.input(blocked||radial||piece?0:x,blocked||radial||piece?0:y);
  }};
}
