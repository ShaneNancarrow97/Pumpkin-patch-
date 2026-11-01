import { createFestivalEngine } from '../src/engine.js';
import definitions from '../../late-game-support/data/festival-themes.json';
import atlas from '../../late-game-support/art/menu-icons.webp';

const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=value=>structuredClone(value);
const engine=createFestivalEngine(definitions);
const themes=new Map(definitions.themes.map(t=>[t.id,t]));
const rewards=new Map(definitions.rewards.map(r=>[r.id,r]));
let state=engine.createState({namespace:'contractor-demo'}),selectedTheme=definitions.themes[0].id;
let context=readyContext(),lastResult=null,lastFixtureEvent=null,lastSaved=null,fixtureSerial=1,fixtureGuest=1;
// Fresh fixture facts get a page-local namespace; replay reuses the exact fact.
// Loading a plain engine save into another page cannot collide with this page's
// synthetic receipts/guests. This never changes the module's persisted session ID.
const fixtureRun=globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,12)??String(performance.timeOrigin).replaceAll('.','');
document.documentElement.style.setProperty('--atlas',`url("${atlas}")`);

function readyContext(){return {level:18,houseLevel:3,kitchenPurchased:true,kitchenCapabilities:['hob','pot','oven','tray','spice'],knownRecipes:[...new Set(definitions.themes.flatMap(t=>t.recipeIds))],visitorEventIds:['vip','rush'],cocoaTier:3,gardenDecorIds:['vegetable-bed','herb-planter','berry-patch'],attractions:{'hollow-house':{ready:true,tier:5,open:true},hayride:{ready:true,tier:3,routeLevel:2,open:true}},paused:false};}
function art(index,size=54){return `<span class="art" style="width:${size}px;height:${size}px;background-position:${index%3*50}% ${Math.floor(index/3)*100}%" aria-hidden="true"></span>`;}
const themeIndex=id=>definitions.themes.findIndex(t=>t.id===id);
const rewardIndex=id=>3+definitions.rewards.findIndex(r=>r.id===id);
const clock=seconds=>{const n=Math.floor(seconds);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const friendly={
 'level-locked':'This evening opens at a later patch level.',
 'already-active':'End the current evening before preparing another.',
 'evening-active':'End the current evening before preparing another.',
 'not-ready':'A preparation is still missing. Check the venue list above.',
 'game-paused':'The whole simulation is paused. Unpause it before continuing service.',
 'already-counted':'That exact outcome is already recorded. Progress stays the same.',
 'already-claimed':'This keepsake is already in the demo cabinet. No second copy is granted.',
 'not-earned':'Complete any three goals and end the evening before claiming its keepsake.',
 'wrong-session':'That outcome belongs to a different evening. It cannot count here.',
 'session-mismatch':'That outcome belongs to a different evening. It cannot count here.',
 'old-session':'That outcome belongs to a different evening. It cannot count here.',
 'paused':'Service is paused. Time and outcomes stay still until you resume.',
 'evening-paused':'Service is paused. Time and outcomes stay still until you resume.',
 'not-running':'Service must be running for this action.',
 'no-active-session':'Prepare an evening first.',
 'no-active':'Prepare an evening first.',
 'no-evening':'Prepare an evening first.',
 'outside-service':'This service outcome did not happen during the open evening.',
 'invalid-outcome':'This test record is not a valid confirmed outcome. Current progress was kept.',
 'no-progress':'The outcome does not add to an unfinished goal for this evening.',
 'irrelevant':'The outcome does not add to an unfinished goal for this evening.',
};
function say(text){$('feedback').textContent=text;}
function dispatch(command){
 const result=engine.reduce(state,command,context);lastResult=result;
 if(result.state)state=result.state;
 if(state.active)selectedTheme=state.active.themeId;
 render();
 const effect=result.effects?.find(e=>['festival-completed','festival-ended','festival-reward'].includes(e.type));
 if(!result.accepted||!result.changed){say(friendly[result.reason]??`No progress change · ${String(result.reason??'unchanged').replaceAll('-',' ')}.`);}
 else if(effect?.type==='festival-reward')say('Kept forever in this demo cabinet. Its stable claim key prevents another copy.');
 else if(effect?.type==='festival-completed')say('A memorable evening. Its keepsake is ready to claim.');
 else if(effect?.type==='festival-ended')say('Evening ended without penalty. Prepare another whenever you like.');
 else if(command.type==='prepare')say('Preparation is untimed. Review the venue, then open when you are ready.');
 else if(command.type==='start')say('Service has begun. Open the contractor fixtures to try confirmed test outcomes.');
 else if(command.type==='pause')say('Service is paused. Hosting time and goal progress are held.');
 else if(command.type==='resume')say('Service resumed. No offline time has been added.');
 else if(command.type==='tick')say(`${command.seconds} simulation seconds added. Hosting time is not a deadline.`);
 else if(command.type==='outcome')say('Confirmed synthetic outcome recorded by the module. No live game transaction occurred.');
 return result;
}
function revealChoice(){
 const list=$('theme-choices'),button=list.querySelector('[aria-pressed=true]');
 if(!button||!list.clientWidth||list.scrollWidth<=list.clientWidth)return;
 const a=list.getBoundingClientRect(),b=button.getBoundingClientRect();
 if(b.left<a.left)list.scrollLeft+=b.left-a.left;else if(b.right>a.right)list.scrollLeft+=b.right-a.right;
}
addEventListener('resize',()=>requestAnimationFrame(revealChoice));
function selectTheme(id){
 if(!themes.has(id))return false;
 if(state.active&&state.active.themeId!==id){say('End the current evening before choosing another. Incomplete evenings end without penalty.');return false;}
 selectedTheme=id;render();return true;
}
function render(){
 const view=engine.view(state,context),active=view.active,theme=themes.get(selectedTheme),readiness=engine.readiness(theme.id,context),pending=view.pendingRewards.find(r=>r.themeId===theme.id),claimed=view.ownedRewards.some(r=>r.themeId===theme.id);
 if(!$('theme-choices').children.length){$('theme-choices').innerHTML=definitions.themes.map(t=>`<button class="theme-choice" data-theme="${escape(t.id)}">${art(themeIndex(t.id))}<span class="theme-choice-copy"><b>${escape(t.name)}</b><small>Level ${t.level} · <span data-choice-status="${escape(t.id)}">Draft evening</span></small></span></button>`).join('');for(const button of $('theme-choices').querySelectorAll('[data-theme]'))button.onclick=()=>selectTheme(button.dataset.theme);}
 for(const t of view.themes){const button=$('theme-choices').querySelector(`[data-theme="${t.id}"]`);button.setAttribute('aria-pressed',String(t.id===theme.id));button.disabled=!!active&&t.id!==active.themeId;button.querySelector('[data-choice-status]').textContent=t.claimed?'Keepsake claimed':t.completed?'Completed':t.readiness.unlocked?'Draft evening':'Locked';}
 requestAnimationFrame(revealChoice);
 $('theme-art').innerHTML=art(themeIndex(theme.id),104);$('theme-level').textContent=`Level ${theme.level} · Optional Festival Night`;$('theme-title').textContent=theme.name;$('theme-decision').textContent=theme.intendedDecision;$('theme-letter').textContent=theme.letter;
 $('reward-art').innerHTML=art(rewardIndex(theme.rewardId),75);$('reward-name').textContent=rewards.get(theme.rewardId).name;$('reward-status').textContent=claimed?'Already claimed in the demo cabinet.':pending?'Earned · Ready to claim.':'One permanent cosmetic per theme.';
 const goals=active?.goals??theme.goals.options.map(g=>({id:g.id,label:g.label,unit:g.unit,value:0,target:g.target,done:false}));
 $('goals').innerHTML=goals.map(g=>`<div class="goal${g.done?' done':''}" data-goal="${escape(g.id)}"><span class="goal-marker" aria-hidden="true"></span><p class="goal-label">${escape(g.label)}</p><span class="goal-value" data-value="${g.value}" data-target="${g.target}">${g.value} / ${g.target}</span><div class="goal-track" role="progressbar" aria-label="${escape(g.label)}" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${g.value}"><div class="goal-fill" style="width:${g.value/g.target*100}%"></div></div></div>`).join('');
 $('hosting-time').textContent=clock(active?.elapsedSeconds??0);$('goal-count').textContent=`${active?.completedGoals??0} / 3`;
 $('session-phase').textContent=context.paused&&active?'Simulation paused':active?.phase==='preparing'?'Untimed preparation':active?.phase==='running'?'Open for the evening':active?.phase==='paused'?'Service paused':pending?'Keepsake earned':claimed?'A night to remember':'Choose your evening';
 $('goal-summary').textContent=active?.canFinish?'Three goals complete. End whenever you are ready.':active?.phase==='preparing'?'Prepare freely. Garden harvests can count now.':'Three of four goals, in any order.';
 if(active?.phase==='running'||active?.phase==='paused')$('readiness').innerHTML=`<p class="ready-line"><span class="ready-dot" aria-hidden="true"></span>${active.phase==='paused'||context.paused?'Time and outcomes are paused.':'No deadline · Keep hosting as long as you like.'}</p>`;
 else if(pending)$('readiness').innerHTML='<p class="ready-line"><span class="ready-dot" aria-hidden="true"></span>Evening complete · Claim its cosmetic once.</p>';
 else if(readiness.ready)$('readiness').innerHTML='<p class="ready-line"><span class="ready-dot" aria-hidden="true"></span>Prepared fixture venue is ready to open.</p>';
 else $('readiness').innerHTML=`<strong>${readiness.unlocked?'Before opening':'Evening locked'}</strong><ul>${readiness.missing.map(m=>`<li>${escape(m.label)}</li>`).join('')}</ul>`;
 $('prepare-night').hidden=!!active||!!pending;$('prepare-night').disabled=!readiness.unlocked;
 $('start-night').hidden=active?.phase!=='preparing';$('start-night').disabled=!readiness.ready||context.paused;
 $('pause-night').hidden=active?.phase!=='running';$('pause-night').disabled=!!context.paused;
 $('resume-night').hidden=active?.phase!=='paused';$('resume-night').disabled=!!context.paused;
 $('end-night').hidden=!active;$('end-night').textContent=active?.canFinish?'Finish evening':active?.phase==='preparing'?'Cancel preparation':'End evening';
 if(active?.canFinish){$('end-night').className='primary';$('pause-night').className='quiet';}else{$('end-night').className='quiet';$('pause-night').className='';}
 $('claim-reward').hidden=!pending;
 const service=active?.phase==='running'&&!context.paused,harvest=!!engine.stamp(state,context);
 for(const id of ['food','cocoa','attraction','vip','goodbye','tick'])$('fixture-'+id).disabled=!service;
 $('fixture-harvest').disabled=!harvest;$('fixture-replay').disabled=!lastFixtureEvent;
 $('fixture-level').value=String(context.level);$('global-pause').checked=!!context.paused;
 $('owned-count').textContent=`${view.ownedRewards.length} / ${definitions.rewards.length}`;
 $('owned-rewards').innerHTML=definitions.themes.map(t=>{const owned=view.ownedRewards.some(r=>r.themeId===t.id),earned=view.pendingRewards.some(r=>r.themeId===t.id);return `<article class="owned-piece ${owned?'claimed':'locked'}" data-owned="${escape(t.rewardId)}" data-claimed="${owned}">${art(rewardIndex(t.rewardId),60)}<div><h3>${escape(rewards.get(t.rewardId).name)}</h3><p>${owned?'Claimed once · In the demo cabinet':earned?'Earned · Awaiting your claim':'Complete the evening to earn'}</p></div></article>`;}).join('');
 $('history').innerHTML=view.history.length?view.history.map(h=>`<div class="history-row"><span>${escape(themes.get(h.themeId)?.name??h.themeId)}</span><span>${escape(h.outcome)} · ${clock(h.elapsedSeconds)}</span></div>`).join(''):'<p>No evenings have ended yet.</p>';
}

function emitFixture(kind,options={}){
 const stamp=engine.stamp(state,context);
 if(!stamp){say(context.paused?'Unpause the simulation before sending fixture outcomes.':'Prepare, start or resume an evening before sending its outcomes.');return {state,accepted:false,changed:false,reason:'fixture-unavailable',effects:[]};}
 const theme=themes.get(state.active.themeId),count=options.count??1,results=[],events=[];
 if(!Number.isInteger(count)||count<1||count>100)throw new RangeError('Fixture count must be1–100');
 for(let i=0;i<count;i++){
  const serial=fixtureSerial++,id=options.id??`fixture-${fixtureRun}-${serial}`,guestId=options.guestId??`visitor:fixture-${fixtureRun}-${fixtureGuest++}`,base={...stamp,id};let event;
  switch(kind){
   case 'food':event={...base,kind:'food-sale',source:'food',guestId,recipeId:options.recipeId??theme.recipeIds[0],quantity:options.quantity??4,amount:options.amount??24,cohort:options.cohort??'regular'};break;
   case 'cocoa':event={...base,kind:'cocoa-sale',source:'cocoa',guestId,amount:options.amount??16,lines:options.lines??[{productId:'cocoa',quantity:options.quantity??4}]};break;
   case 'attraction':event={...base,kind:'attraction-completed',source:options.source??'hayride',guestId,paid:true,paidAmount:12,queueSecondsAtBoarding:options.queueSecondsAtBoarding??20,routeLevelAtDeparture:options.routeLevelAtDeparture??context.attractions.hayride.routeLevel};break;
   case 'vip':event={...base,kind:'food-sale',source:'food',guestId,recipeId:theme.recipeIds[0],quantity:1,amount:12,cohort:'midnight-court'};break;
   case 'goodbye':event={...base,kind:'final-departure',source:'farm-visit',guestId,final:true,happiness:options.happiness??90,outcome:options.outcome??'normal'};break;
   case 'harvest':event={...base,kind:'garden-harvest',source:'garden',bedId:options.bedId??'vegetable-bed',quantity:options.quantity??4};break;
   default:throw new RangeError('Unknown fixture kind: '+kind);
  }
  lastFixtureEvent=copy(event);events.push(copy(event));results.push(dispatch({type:'outcome',event}));
 }
 $('fixture-last').textContent=`Last synthetic outcome: ${events.at(-1).kind} · ${events.at(-1).id}. Replay keeps this exact ID and captured session.`;
 render();return {events,results,changed:results.some(r=>r.changed)};
}
function replayLast(){
 if(!lastFixtureEvent){say('Send a fixture outcome first.');return null;}
 return dispatch({type:'outcome',event:copy(lastFixtureEvent)});
}
function snapshot(){return engine.save(state);}
function saveSnapshot(){lastSaved=snapshot();$('snapshot-json').value=JSON.stringify(lastSaved,null,2);$('reload-session').disabled=false;say('Demo snapshot saved in this page. Reloading a running session returns it paused.');return copy(lastSaved);}
function loadSnapshot(raw){
 const restored=engine.restore(raw);
 if(!restored.compatible||!restored.state){say(restored.warnings?.[0]??'This snapshot is incompatible. Current demo progress was kept.');return restored;}
 state=restored.state;if(state.active)selectedTheme=state.active.themeId;
 render();say(restored.warnings?.length?restored.warnings.join(' '):'Demo progress restored. No offline time was added.');return restored;
}
function exportSnapshot(){
 const data=saveSnapshot(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pumpkin-patch-festival-demo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('prepare-night').onclick=()=>dispatch({type:'prepare',themeId:selectedTheme});$('start-night').onclick=()=>dispatch({type:'start'});$('pause-night').onclick=()=>dispatch({type:'pause'});$('resume-night').onclick=()=>dispatch({type:'resume'});$('end-night').onclick=()=>dispatch({type:'end'});$('claim-reward').onclick=()=>dispatch({type:'claim',themeId:selectedTheme});
for(const kind of ['food','cocoa','attraction','vip','goodbye','harvest'])$('fixture-'+kind).onclick=()=>emitFixture(kind,{count:['attraction','goodbye'].includes(kind)?4:1});
$('fixture-tick').onclick=()=>dispatch({type:'tick',seconds:30});$('fixture-replay').onclick=replayLast;
$('fixture-level').onchange=e=>{context={...context,level:Number(e.target.value)};render();say(`Prepared-world fixture level set to ${context.level}. This does not alter your game.`);};
$('global-pause').onchange=e=>{context={...context,paused:e.target.checked};render();say(context.paused?'Whole simulation paused. Service counters and time cannot advance.':'Whole simulation resumed. Manual service pause is kept.');};
$('open-fixtures').onclick=()=>{$('fixture-controls').open=true;$('fixture-controls').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});};
$('save-session').onclick=saveSnapshot;$('reload-session').onclick=()=>{if(lastSaved)loadSnapshot(copy(lastSaved));};$('export-session').onclick=exportSnapshot;$('load-json').onclick=()=>{try{loadSnapshot(JSON.parse($('snapshot-json').value));}catch{say('That text is not valid JSON. The current demo was kept.');}};

render();
window.FestivalSessionDemo={engine,definitions,dispatch,selectTheme,emitFixture,replayLast,saveSnapshot,loadSnapshot,snapshot,
 setContext(patch){context={...context,...copy(patch)};render();},
 get state(){return copy(state);},get view(){return engine.view(state,context);},get context(){return copy(context);},get selectedTheme(){return selectedTheme;},get lastResult(){return lastResult?copy(lastResult):null;},get lastFixtureEvent(){return copy(lastFixtureEvent);},get lastSaved(){return copy(lastSaved);}};
