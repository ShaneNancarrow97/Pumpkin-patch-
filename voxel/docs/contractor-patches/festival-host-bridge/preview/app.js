import { createLab } from '../lab/scenario.js';
import { serviceOffers } from '../lab/offers.js';
import { serviceState } from './service-state.js';
import { serviceArt } from './service-art.js';
import { mothOrnament,botanicalOrnament } from './ledger-ornaments.js';
import handwriting from './assets/caveat-latin.woff2';
import dishAtlas from '../../../../assets/kitchen-dishes.webp';
import hospitalityAtlas from '../../../../assets/hospitality-icons.webp';
import ingredientAtlas from '../../../../assets/kitchen-ingredients.webp';
import definitions from '../../late-game-support/data/festival-themes.json' with { type: 'json' };
import atlas from '../../late-game-support/art/menu-icons.webp';
import serifFont from '../../../../assets/fraunces-400.woff2';
import sansFont from '../../../../assets/dm-sans.woff';

const $=id=>document.getElementById(id),copy=value=>structuredClone(value);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
const number=value=>new Intl.NumberFormat('en-GB').format(Number.isFinite(value)?value:0);
const clock=value=>{const seconds=Math.floor(Number.isFinite(value)?value:0);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
const lab=createLab(),themes=new Map(definitions.themes.map(t=>[t.id,t])),rewards=new Map(definitions.rewards.map(r=>[r.id,r]));
let selectedTheme=definitions.themes[0].id,lastSaved=null,lastAction=null;
const fonts=document.createElement('style');fonts.textContent=`@font-face{font-family:"Ledger Hand";src:url("${handwriting}") format("woff2");font-weight:400;font-display:swap}@font-face{font-family:Fraunces;src:url("${serifFont}") format("woff2");font-weight:400;font-display:swap}@font-face{font-family:"DM Sans";src:url("${sansFont}") format("woff");font-weight:400 700;font-display:swap}`;document.head.append(fonts);
$('book-ornaments').innerHTML=`<span class="book-moth">${mothOrnament()}</span><span class="book-botanical left">${botanicalOrnament()}</span><span class="book-botanical right">${botanicalOrnament()}</span><span class="book-marginalia">moonlight, moths<br>&amp; little things</span>`;
const motion=matchMedia('(prefers-reduced-motion: reduce)'),oneShots=new Set(),byElement=new WeakMap();let playedAnimations=0;
function animate(element,frames,duration=320){
 if(!element||motion.matches||document.hidden||typeof element.animate!=='function')return;
 const prior=byElement.get(element);if(prior){prior.cancel();oneShots.delete(prior);}
 const animation=element.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.2,1)'});
 oneShots.add(animation);byElement.set(element,animation);playedAnimations++;
 const complete=()=>oneShots.delete(animation);animation.onfinish=complete;animation.oncancel=complete;
}
function settleMotion(){document.body.dataset.pageHidden=String(document.hidden);if(motion.matches||document.hidden)for(const animation of oneShots)animation.cancel();}
document.addEventListener('visibilitychange',settleMotion);motion.addEventListener('change',settleMotion);settleMotion();
document.documentElement.style.setProperty('--atlas',`url("${atlas}")`);
for(const [id,url]of Object.entries({'kitchen-dishes':dishAtlas,'hospitality-icons':hospitalityAtlas,'kitchen-ingredients':ingredientAtlas}))document.documentElement.style.setProperty('--art-'+id,`url("${url}")`);
const themeIndex=id=>definitions.themes.findIndex(t=>t.id===id),rewardIndex=id=>3+definitions.rewards.findIndex(r=>r.id===id);
const art=(index,size=50)=>`<span class="art" style="width:${size}px;height:${size}px;background-position:${index%3*50}% ${Math.floor(index/3)*100}%" aria-hidden="true"></span>`;
const friendly={
 'level-locked':'This evening needs a later patch level.',
 'not-ready':'The current venue does not meet every preparation requirement.',
 'evening-active':'End this evening before choosing another.',
 'pending-outcomes':'Deliver the confirmed outcomes before ending. Resume service first if it is paused.',
 'game-paused':'The private world is paused. Its money, stock and outcomes stay still.',
 'evening-paused':'Service is paused. Confirmed outcomes stay queued until you resume and deliver them.',
 'not-running':'Open or resume the evening before serving this operation.',
 'not-preparing':'Prepare an evening first.',
 'not-paused':'This evening is not paused.',
 'no-evening':'Prepare an evening first.',
 'no-active-session':'Prepare an evening first.',
 'no-session':'Prepare an evening first.',
 'no-binding':'This interaction did not begin in an active, unpaused evening.',
 'inactive-session':'Prepare or resume an evening first.',
 'already-counted':'That outcome was already delivered. No new progress or payment was created.',
 'duplicate':'That same outcome is already queued. No new payment was created.',
 'duplicate-outcome':'That same outcome is already queued. No new payment was created.',
 'queue-full':'The outcome queue is full. Deliver it before another operation; no new payment should be repeated.',
 'not-earned':'Finish three goals and end the evening before claiming a keepsake.',
 'already-claimed':'This keepsake entitlement is already recorded. No second copy was created.',
 'old-session':'This outcome belongs to an earlier evening and cannot be retagged into this one.',
 'no-last-outcome':'Complete a real rule operation before replaying its outcome.',
 'invalid-outcome':'The record was not a valid confirmed outcome. Current progress was kept.',
 'outside-service':'The outcome did not originate during this service window.',
 'no-progress':'The outcome did not add to an unfinished goal. Its payment was not repeated.',
 'unavailable':'This operation is not available in the current private fixture.'
};
const say=(text,error=false)=>{$('feedback').textContent=text;$('feedback').dataset.state=error?'error':'normal';};

function invoke(action,...args){
 if(typeof lab[action]!=='function'){say('This integration action is not provided by the private lab.');return null;}
 const before=lab.view();let result;
 try{result=lab[action](...args);}catch(error){say('The private operation could not complete. Inspect the contractor diagnostics before retrying.');throw error;}
 lastAction={action,result:copy(result)};render();
 if(result?.accepted===false||result?.compatible===false){if(result.reason==='pending-outcomes')$('delivery-inspector').open=true;say(friendly[result.reason]??result.warnings?.[0]??`Operation not applied · ${String(result.reason??'not accepted').replaceAll('-',' ')}.`,true);return result;}
 const after=lab.view(),receipt=after.ledger?.[0];
 if(receipt&&receipt.serial!==before.ledger?.[0]?.serial){
  animate($('recent-receipt'),[{opacity:.4,transform:'translateY(8px) rotate(-.6deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],360);
  animate($('receipt-seal'),[{opacity:0,transform:'rotate(-8deg) scale(1.18)'},{opacity:1,transform:'rotate(-8deg) scale(1)'}],400);
  animate($('guest-sales'),[{color:'#8f663b'},{color:'#4b3449'}]);
  animate($('latest-operation'),[{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],280);
 }
 if(after.outbox.pending!==before.outbox.pending)animate($('queue-count'),[{transform:'scale(1.12)',opacity:.5},{transform:'scale(1)',opacity:1}],220);
 if(after.outbox.pending<before.outbox.pending)animate(document.querySelector('.outbox'),[{borderColor:'#9e784b',backgroundColor:'#d9c398'},{borderColor:'#93725235',backgroundColor:'transparent'}],380);
 for(const goal of after.festival.active?.goals??[]){const previous=before.festival.active?.goals.find(g=>g.id===goal.id);if(goal.done&&!previous?.done)animate(document.querySelector(`[data-goal="${goal.id}"] .goal-marker`),[{transform:'scale(.75)',boxShadow:'0 0 0 6px #b6caa044'},{transform:'scale(1)',boxShadow:'0 0 0 0 #b6caa000'}],360);}
 if(action==='end'&&!after.festival.active&&after.festival.pendingRewards.some(r=>r.themeId===selectedTheme))animate($('completion-card'),[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],420);
 if(action==='prepare')say('Preparation is untimed. Garden harvests can count after this selection.');
 else if(action==='start')say('The evening is open. Each service operation runs the actual private-world rules.');
 else if(action==='pause')say('Festival service is paused. Queued confirmed outcomes are retained.');
 else if(action==='resume')say('Festival service resumed. No offline time has been added.');
 else if(action==='flush'){
  const held=Array.isArray(result?.held)?result.held.length:result?.held??0,rejected=Array.isArray(result?.rejected)?result.rejected.length:result?.rejected??0,delivered=Array.isArray(result?.delivered)?result.delivered.length:result?.delivered??0;
  say(held?`${number(held)} confirmed outcomes remain held while service is paused.`:rejected?`Delivery finished. ${number(rejected)} stale or invalid outcomes were explicitly rejected.`:`Confirmed outcomes delivered${delivered?' · '+number(delivered)+' processed':''}. Guest spending and stock did not change.`);
 }
 else if(action==='replayLast')say('The exact previous outcome was replayed. Guest wallets, venue takings and stock were not charged again.');
 else if(action==='end')say(after.festival.pendingRewards.some(r=>r.themeId===selectedTheme)?'Three goals complete. Your keepsake is ready to record.':'The evening ended without a penalty. Confirmed spending stays in the private ledger.');
 else if(action==='claim')say('The once-only entitlement was recorded. Live furniture registration remains separate.');
 else if(['serveFood','serveCocoa','harvest','runRide'].includes(action)){
  const v=lab.view(),pending=v.outbox?.pending??v.festival?.outbox?.pending??0;
  say(pending?'Receipt recorded. Deliver it when you are ready.':'Receipt recorded. Your evening’s goals are up to date.');
 }
 return result;
}

function revealChoice(){
 const list=$('theme-choices'),button=list.querySelector('[aria-pressed=true]');if(!button||!list.clientWidth||list.scrollWidth<=list.clientWidth)return;
 const a=list.getBoundingClientRect(),b=button.getBoundingClientRect();if(b.left<a.left)list.scrollLeft+=b.left-a.left;else if(b.right>a.right)list.scrollLeft+=b.right-a.right;
}
addEventListener('resize',()=>requestAnimationFrame(revealChoice));
function selectTheme(id){
 if(!themes.has(id))return false;
 const active=lab.view().festival?.active;if(active&&active.themeId!==id){say('End the current evening before choosing another. Incomplete evenings end without penalty.');return false;}
 selectedTheme=id;render();return true;
}

function render(){
 const v=lab.view(),festival=v.festival,active=festival.active;
 if(active)selectedTheme=active.themeId;
 const theme=themes.get(selectedTheme),themeView=festival.themes.find(t=>t.id===theme.id),readiness=themeView?.readiness??{ready:false,missing:[]};
 const pendingRewards=festival.pendingRewards??[],pendingReward=pendingRewards.find(r=>r.themeId===theme.id),claimed=(festival.ownedRewards??[]).some(r=>r.themeId===theme.id);
 const outbox=v.outbox??festival.outbox??{pending:0,capacity:256,free:256};
 const world=lab.world,worldPaused=world.paused===true,service=active?.phase==='running'&&!worldPaused;
 const presentation=serviceState(v,theme.id,{worldPaused}),finished=!!presentation.completion&&!active;
 document.body.dataset.theme=String(themeIndex(theme.id));document.body.dataset.phase=active?.phase??'idle';document.body.dataset.stage=presentation.stage;document.body.dataset.worldPaused=String(worldPaused);
 if(!$('theme-choices').children.length){$('theme-choices').innerHTML=definitions.themes.map(t=>`<button class="theme-choice" data-number="${themeIndex(t.id)+1}" data-theme="${escape(t.id)}">${art(themeIndex(t.id))}<span class="choice-copy"><b>${escape(t.name)}</b><small>Level ${t.level} · <span data-choice-status="${escape(t.id)}">Private prepared venue</span></small></span></button>`).join('');for(const button of $('theme-choices').querySelectorAll('[data-theme]'))button.onclick=()=>selectTheme(button.dataset.theme);}
 for(const t of festival.themes){const b=$('theme-choices').querySelector(`[data-theme="${t.id}"]`);b.setAttribute('aria-pressed',String(t.id===theme.id));b.disabled=!!active&&active.themeId!==t.id;b.querySelector('[data-choice-status]').textContent=t.claimed?'Entitlement recorded':t.completed?'Completed':'Private prepared venue';}
 requestAnimationFrame(revealChoice);
 $('theme-level').textContent=`Level ${theme.level} · Optional evening`;$('theme-title').textContent=theme.name;$('theme-art').innerHTML=art(themeIndex(theme.id),72);$('theme-letter').textContent=theme.letter;$('theme-decision').textContent=theme.intendedDecision;
 $('reward-art').innerHTML=art(rewardIndex(theme.rewardId),66);$('reward-name').textContent=rewards.get(theme.rewardId).name;
 $('reward-status').textContent=claimed?'Entitlement recorded once. Live physical ownership is separate.':pendingReward?'Evening complete · entitlement earned. Live furniture registration is separate.':'One entitlement per theme. Live furniture registration remains separate.';
 $('hosting-time').textContent=clock(active?.elapsedSeconds??0);
 $('session-phase').textContent=presentation.status;
 $('session-heading').textContent=finished?'Your keepsake':active?'Tonight’s service':'Your evening awaits';
 $('next-step').textContent=presentation.nextStep;
 $('prepare-night').hidden=!!active||!!pendingReward;$('prepare-night').disabled=themeView?.readiness?.unlocked===false;
 $('prepare-night').className=finished?'quiet':'primary';$('prepare-night').innerHTML=finished?'Host this evening again':'Prepare evening <span aria-hidden="true">→</span>';
 $('start-night').hidden=active?.phase!=='preparing';$('start-night').disabled=!readiness.ready||worldPaused;
 $('pause-night').textContent=outbox.pending?'Pause':'Pause service';$('pause-night').hidden=active?.phase!=='running';$('pause-night').disabled=worldPaused;
 $('resume-night').hidden=active?.phase!=='paused';$('resume-night').disabled=worldPaused;
 $('end-night').hidden=!active;$('end-night').textContent=active?.canFinish?'Finish evening':active?.phase==='preparing'?'Cancel preparation':'End evening';
 $('end-night').className=active?.canFinish&&!outbox.pending?'primary':'quiet';
 $('deliver-now').hidden=!service||!outbox.pending;
 $('claim-reward').hidden=!pendingReward||typeof lab.claim!=='function';
 $('completion-card').hidden=!finished;
 $('completion-card').dataset.tone=presentation.completion?.tone??'';
 $('completion-title').textContent=rewards.get(theme.rewardId).name;
 $('completion-caption').textContent=claimed?'Keepsake recorded':'Three goals achieved';
 $('completion-body').textContent=presentation.completion?.body??'';
 $('completion-keepsake').textContent=claimed?'Kept for future evenings':'Made memorable by you';
 $('completion-art').innerHTML=art(rewardIndex(theme.rewardId),100);
 $('choose-next').hidden=!finished||!claimed;
 $('choose-next').innerHTML=(festival.themes.some(t=>!t.claimed&&t.id!==selectedTheme)?'Choose another evening':'Browse evenings')+' <span aria-hidden="true">→</span>';
 document.querySelector('.hosting-clock').hidden=finished;
 const home=finished?$('completion-card'):document.querySelector('.session-actions');if($('prepare-night').parentElement!==home)home.append($('prepare-night'));document.querySelector('.session-actions').hidden=finished;
 $('service-operations').hidden=finished;$('goals').hidden=finished;$('readiness').hidden=finished||!!active&&active.phase!=='preparing'&&!worldPaused;
 if(active?.phase==='running'||active?.phase==='paused'){$('readiness').textContent=worldPaused?'The private world is paused. Real rule operations cannot spend or produce.':active.phase==='paused'?'Festival progress is paused. Confirmed outcomes stay queued.':'No deadline · Real operations use their actual rule prices and stock.';$('readiness').className='readiness ready';}
 else if(readiness.ready){$('readiness').textContent='The prepared developer venue is ready. No player progression has been granted.';$('readiness').className='readiness ready';}
 else{$('readiness').innerHTML=`<strong>Before opening</strong><ul>${(readiness.missing??[]).map(m=>`<li>${escape(m.label)}</li>`).join('')}</ul>`;$('readiness').className='readiness';}
 renderOffers(v,theme,world,active);
 $('flush-outcomes').disabled=!outbox.pending;$('flush-outcomes').className=outbox.pending?'small-primary':'quiet';
 $('queue-count').textContent=number(outbox.pending);$('queue-status').textContent=outbox.pending?`${number(outbox.pending)} awaiting delivery · ${number(outbox.free)} free slots`:'Nothing awaiting delivery';
 $('delivery-inspector').dataset.pending=String(outbox.pending>0);$('defer-delivery').checked=!!v.deferred;$('replay-outcome').disabled=!(v.ledger?.length);
 const goals=active?.goals??theme.goals.options.map(g=>({id:g.id,label:g.label,value:0,target:g.target,done:false}));
 $('goal-summary').textContent=finished?'Three goals achieved':active?.canFinish?'Three goals complete':'Complete any three of four goals.';$('goal-count').textContent=presentation.objectives.display;
 $('objective-overview').dataset.complete=String(presentation.objectives.completed>=presentation.objectives.required);
 $('objective-dial').style.setProperty('--goal-turn',Math.min(1,presentation.objectives.completed/presentation.objectives.required)*360+'deg');
 $('objective-dial').setAttribute('aria-label',`${presentation.objectives.completed} of ${presentation.objectives.required} evening goals complete`);
 const signature=goals.map(g=>g.id).join('|');
 if($('goals').dataset.signature!==signature){$('goals').dataset.signature=signature;$('goals').innerHTML=goals.map(g=>`<div class="goal" data-goal="${escape(g.id)}"><span class="goal-marker" aria-hidden="true"></span><p class="goal-label"></p><span class="goal-value"></span><div class="goal-track" role="progressbar" aria-valuemin="0"><div class="goal-fill"></div></div></div>`).join('');}
 for(const goal of goals){const row=$('goals').querySelector(`[data-goal="${goal.id}"]`),value=row.querySelector('.goal-value'),track=row.querySelector('.goal-track');row.classList.toggle('done',goal.done);row.querySelector('.goal-label').textContent=goal.label;value.textContent=`${number(goal.value)} / ${number(goal.target)}`;value.dataset.value=goal.value;value.dataset.target=goal.target;track.setAttribute('aria-label',goal.label);track.setAttribute('aria-valuemax',goal.target);track.setAttribute('aria-valuenow',goal.value);row.querySelector('.goal-fill').style.width=goal.value/goal.target*100+'%';}
 renderAccounts(v,theme,world);
 $('world-pause-control').hidden=typeof lab.setWorldPaused!=='function';$('pause-world').checked=worldPaused;
 $('scope-disclosure').textContent=typeof v.disclosure==='string'?v.disclosure:'Prepared developer state isolates receipt handling. It is not a player progression, profit or timing forecast.';
}

function renderOffers(v,theme,world,active){
 const offers=serviceOffers(world,theme,{previewSelection:!active}),free=v.outbox.free,phase=active?.phase;
 for(const [kind,id,slots]of [['food','serve-food',1],['cocoa','serve-cocoa',1],['garden','harvest-garden',1],['ride','run-ride',2]]){
  const offer=offers[kind],button=$(id),canCapture=!!active&&phase!=='paused'&&(kind==='garden'||phase==='running')&&!world.paused;
  button.disabled=!canCapture||!offer.available||free<slots;
  const quote=$('offer-'+kind),emblem=serviceArt(kind,offer),visual=button.querySelector('.service-art');
  visual.dataset.atlas=emblem.atlas;visual.dataset.index=String(emblem.index);visual.style.backgroundSize=`${emblem.columns*100}% ${emblem.rows*100}%`;visual.style.backgroundPosition=`${emblem.index%emblem.columns*100/(emblem.columns-1)}% ${Math.floor(emblem.index/emblem.columns)*100/(emblem.rows-1)}%`;
  visual.dataset.illustrative=String(emblem.illustrative);
  let note,price=null;
  if(world.paused)note='Private world paused';
  else if(!offer.available)note=kind==='food'&&!offer.stock?'Sold out · Try cocoa or a ride':'Unavailable in this venue';
  else if(free<slots)note='Deliver queued outcomes first';
  else if(kind==='food'){price=offer.amount;note=`${number(offer.quantity)} portions · ${number(offer.stock)} in stock`;}
  else if(kind==='cocoa'){price=offer.amount;note=`${number(offer.quantity)} items in this order`;}
  else if(kind==='garden')note=offer.phase==='ready'?'Ripe now · Pick ingredients':'Grow & pick · Simulated time';
  else{price=offer.amount;note=`Route upgrade ${number(offer.routeLevel)}`;}
  quote.innerHTML=(price!==null?`<span class="quote-price">${escape(money(price))}<em>quote</em></span>`:'')+`<span class="offer-meta">${escape(note)}</span>`;
  button.querySelector('strong').textContent=kind==='food'?offer.label:kind==='cocoa'?'Cocoa & treats':kind==='garden'?'Kitchen garden':'A ride into the Hollow';
  button.setAttribute('aria-label',button.querySelector('strong').textContent);
  button.title=kind==='cocoa'?offer.items.map(item=>item.name).join(' + '):offer.label;
 }
}

function renderAccounts(v,theme,world){
 const b=v.balances??{},guestSales=(b.foodIncome??0)+(b.cocoaIncome??0)+(b.rideIncome??0),guestSpend=b.guestSpend??0;
 $('guest-spend').textContent=money(guestSpend);$('guest-sales').textContent=money(guestSales);$('harvest-income').textContent=money(b.harvestIncome??0);$('venue-cash').textContent=money(b.coins??world.coins);
 const balanced=Math.abs(guestSpend-guestSales)<.000001;
 $('conservation-status').textContent=balanced?(guestSpend?'Guest wallet debits match committed sales.':'No paid operations yet.'):'Inspect the ledger: guest debits and sales differ.';$('conservation-status').className='conservation'+(balanced?'':' mismatch');
 const kitchen=world.kitchen??{},cocoa=world.festival?.cocoa??{},recipe=theme.recipeIds[0],pantry=Object.values(kitchen.pantry??{}).reduce((n,value)=>n+(Number.isFinite(value)?value:0),0);
 $('stock-counts').innerHTML=[[recipe.replaceAll('-',' '),kitchen.food?.[recipe]??0],['Basic cocoa',cocoa.stock??0],['Ghost cocoa',cocoa.extras?.deluxe?.stock??0],["S’mores",cocoa.extras?.smores?.stock??0],['Pantry ingredient units',pantry]].map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${number(value)}</dd></div>`).join('');
 const guests=v.guests??[];$('guest-count').textContent=`${number(guests.length)} guests`;
 $('guest-wallets').innerHTML=guests.length?guests.slice(0,8).map(g=>`<div class="guest-wallet"><span>${escape(g.kind??'guest')} · ${escape(g.id)}</span><strong>${money(g.initialBudget)} → ${money(g.budget)}</strong></div>`).join(''):'<p class="operation-note">A finite-wallet private guest is created by each service test.</p>';
 const ledger=v.ledger??[];$('ledger-count').textContent=ledger.length?`${number(ledger.length)} committed operations`:'No committed operations yet';
 const recent=ledger[0];
 $('latest-operation').hidden=!recent;
 if(recent){const harvested=recent.kind==='harvest';$('latest-kind').textContent=harvested?'Harvest confirmed':'Payment confirmed';$('latest-detail').textContent=`${number(recent.quantity)} ${harvested?'ingredients picked':recent.kind==='hayride'?'paid ride completed':recent.kind==='cocoa'?'cocoa & treat items':'portions served'} · ${v.outbox.pending?'Delivery held':'Tracking up to date'}`;$('latest-amount').textContent=money(recent.amount);}
 if(recent){const harvested=recent.kind==='harvest';$('recent-receipt').dataset.committed='true';$('receipt-seal').textContent=harvested?'Picked':'Paid';$('receipt-heading').textContent={food:'A warm supper',cocoa:'A little cup of comfort',hayride:'A trip into the Hollow',harvest:'From the kitchen garden'}[recent.kind]??'Confirmed operation';$('receipt-description').textContent=`${number(recent.quantity)} ${harvested?'ingredients harvested':recent.kind==='hayride'?'paid visitor':recent.kind==='cocoa'?'items in the committed order':'portions served'}`;$('receipt-amount-label').textContent=harvested?'Market overflow income':'Guest paid';$('receipt-amount').textContent=money(recent.amount);$('receipt-reference').textContent=`No. ${String(recent.serial).padStart(4,'0')} · ${harvested?'Grown here':'Payment confirmed'}`;}
 else{$('recent-receipt').dataset.committed='false';$('receipt-seal').textContent='Ready';$('receipt-heading').textContent='Your first receipt';$('receipt-description').textContent='A real service operation will leave its mark here.';$('receipt-amount-label').textContent='Committed amount';$('receipt-amount').textContent='—';$('receipt-reference').textContent='No transaction has been made.';}
 const labels={food:'Menu dish','food-sale':'Menu dish',cocoa:'Cocoa order','cocoa-sale':'Cocoa order',harvest:'Garden harvest','garden-harvest':'Garden harvest',ride:'Paid hayride',hayride:'Paid hayride','hayride-completion':'Paid hayride'};
 $('receipt-rows').innerHTML=ledger.length?ledger.slice(0,40).map(row=>{
  const detail=row.recipeId??(row.productIds??[]).join(', '),evidence=[row.receiptId!==undefined?'Receipt '+row.receiptId:'',Number.isFinite(row.routeLevelAtDeparture)?'Route '+row.routeLevelAtDeparture:'',Number.isFinite(row.queueSecondsAtBoarding)?row.queueSecondsAtBoarding.toFixed(1)+'s queue':''].filter(Boolean).join(' · ');
  return `<tr><th scope="row">${escape(labels[row.kind]??String(row.kind??'operation').replaceAll('-',' '))}${detail?`<small>${escape(detail)}</small>`:''}</th><td>${escape(row.guestId??'—')}</td><td>${Number.isFinite(row.quantity)?number(row.quantity):'—'}</td><td>${money(row.amount)}</td><td>${escape(evidence||'Confirmed rule result')}</td></tr>`;
 }).join(''):'<tr><td colspan="5">No operation has committed yet. Choose a service action above.</td></tr>';
}

function saveSnapshot(){lastSaved=copy(lab.snapshot());$('snapshot-json').value=JSON.stringify(lastSaved,null,2);$('reload-snapshot').disabled=false;say('Private lab snapshot saved in this page. Running service reloads paused, with confirmed outcomes retained.');return copy(lastSaved);}
function loadSnapshot(raw){const result=lab.restore(copy(raw));lastAction={action:'restore',result:copy(result)};if(result?.accepted!==false&&result?.compatible!==false){const restoredTheme=lab.view().festival.active?.themeId??lab.view().selectedTheme;if(themes.has(restoredTheme))selectedTheme=restoredTheme;}render();if(result?.accepted===false||result?.compatible===false)say(result.warnings?.[0]??'That snapshot is incompatible. The current private lab was kept.');else say(result.warnings?.length?result.warnings.join(' '):'Private venue and bridge restored. Resume before delivering queued outcomes. No offline time passed.');return result;}
function exportSnapshot(){const value=saveSnapshot(),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pumpkin-patch-private-receipt-lab.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const actions={
 prepare:()=>invoke('prepare',selectedTheme),start:()=>invoke('start'),pause:()=>invoke('pause'),resume:()=>invoke('resume'),flush:()=>invoke('flush'),end:()=>invoke('end'),claim:()=>invoke('claim',selectedTheme),
 serveFood:()=>invoke('serveFood'),serveCocoa:()=>invoke('serveCocoa'),harvest:()=>invoke('harvest',{grow:true}),runRide:()=>invoke('runRide'),replayLast:()=>invoke('replayLast'),saveSnapshot,loadSnapshot,exportSnapshot
};
for(const [id,action]of [['prepare-night','prepare'],['start-night','start'],['pause-night','pause'],['resume-night','resume'],['flush-outcomes','flush'],['deliver-now','flush'],['end-night','end'],['claim-reward','claim'],['serve-food','serveFood'],['serve-cocoa','serveCocoa'],['harvest-garden','harvest'],['run-ride','runRide'],['replay-outcome','replayLast'],['save-snapshot','saveSnapshot'],['export-snapshot','exportSnapshot']])$(id).onclick=actions[action];
$('choose-next').onclick=()=>{const next=lab.view().festival.themes.find(t=>!t.claimed&&t.id!==selectedTheme);if(next)selectTheme(next.id);const button=$('theme-choices').querySelector('[aria-pressed=true]');button?.focus();button?.scrollIntoView({block:'nearest',inline:'nearest',behavior:motion.matches?'instant':'smooth'});};
$('reload-snapshot').onclick=()=>{if(lastSaved)loadSnapshot(lastSaved);};
$('load-json').onclick=()=>{try{if($('snapshot-json').value.length>2*1024*1024)throw Error('Too large');loadSnapshot(JSON.parse($('snapshot-json').value));}catch{say('That text is invalid or too large for this private lab. Current progress was kept.');}};
$('defer-delivery').onchange=e=>{lab.setDeferred(e.target.checked);render();say(e.target.checked?'Delivery is held for inspection. Real payments still commit once; their outcomes wait in the outbox.':'Automatic outcome delivery is enabled for subsequent operations. Existing queued facts can be delivered explicitly.');};
$('pause-world').onchange=e=>{if(typeof lab.setWorldPaused==='function'){lab.setWorldPaused(e.target.checked);render();say(e.target.checked?'The whole private world is paused. No new stock or money transaction can occur.':'The private world resumed. A separate manual Festival pause is retained.');}};

for(const [id,kind]of [['serve-food','food'],['serve-cocoa','cocoa'],['harvest-garden','garden'],['run-ride','ride']]){
 const button=$(id),label=button.textContent;button.setAttribute('aria-label',label);button.setAttribute('aria-describedby','offer-'+kind);
 button.innerHTML=`<span class="service-art" aria-hidden="true"></span><span class="operation-copy"><strong>${escape(label)}</strong><small id="offer-${kind}"></small></span>`;
}

render();
window.FestivalBridgeLab={controller:lab,definitions,actions,invoke,selectTheme,saveSnapshot,loadSnapshot,
 get motion(){return {reduced:motion.matches,activeOneShots:oneShots.size,played:playedAnimations};},
 get state(){return copy(lab.bridge);},get view(){return copy(lab.view());},get world(){return copy(lab.world);},get selectedTheme(){return selectedTheme;},get lastAction(){return copy(lastAction);},get lastSaved(){return copy(lastSaved);}};
