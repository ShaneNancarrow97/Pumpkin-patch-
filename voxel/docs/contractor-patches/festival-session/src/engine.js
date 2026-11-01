// Pure contractor module. No live state, renderer, timers, storage or money.
const SCHEMA = 1, MAX_TARGET = 1000, MAX_HISTORY = 12, MAX_ELAPSED = 1e12;
const clone = value => structuredClone(value);
const integer = (n, low = 0, high = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= low && n <= high;
const finite = (n, low = 0, high = Number.MAX_VALUE) => Number.isFinite(n) && n >= low && n <= high;
const text = (s, max = 160) => typeof s === 'string' && s.length > 0 && s.length <= max && s.trim() === s && !/[\x00-\x1f]/.test(s);
const namespaceOK = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(s);
const guestOK = s => typeof s === 'string' && /^(visitor|customer):[A-Za-z0-9_-]{1,80}$/.test(s);
const distinctMetrics = new Set(['completed-attraction-guests','vip-served-guests','happy-departures','extended-hayride-guests','short-queue-completions']);
const metrics = new Set([...distinctMetrics,'food-servings','cocoa-servings','garden-harvest-quantity']);
const sources = new Set(['hollow-house','hayride']);
const quantityOK = n => integer(n, 1, 1e6);
const eventKey = e => JSON.stringify([e.kind,e.source,e.id]);
// A configuration revision marker, not an authenticity/security signature.
function signature(value){
 const ordered=x=>Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;
 const string=JSON.stringify(ordered(value));let n=2166136261;
 for(let i=0;i<string.length;i++){n^=string.charCodeAt(i);n=Math.imul(n,16777619);}
 return 'goals-v1-'+(n>>>0).toString(16);
}

/** Bind immutable content; the engine itself has no dependency on game modules. */
export function createFestivalEngine(definitions) {
 const data = clone(definitions);
 if(!data || !Array.isArray(data.themes) || !data.themes.length || data.themes.length > 16 || !Array.isArray(data.rewards))throw new TypeError('Invalid festival definitions');
 const themes = new Map(), rewardIds = new Set(data.rewards.map(r=>r.id)), assignedRewards=new Set();
 for(const theme of data.themes){
  if(!text(theme.id,80)||themes.has(theme.id)||!text(theme.name)||!integer(theme.level,1,100)||!rewardIds.has(theme.rewardId)||assignedRewards.has(theme.rewardId)||theme.goals?.choose!==3||theme.goals.options?.length!==4||!theme.prerequisites||!Array.isArray(theme.recipeIds))throw new TypeError('Invalid or duplicate festival theme');
  assignedRewards.add(theme.rewardId);
  const ids=new Set();
  for(const goal of theme.goals.options){
   if(!text(goal.id,80)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(goal.id)||ids.has(goal.id)||!text(goal.label,300)||!integer(goal.target,1,MAX_TARGET)||!metrics.has(goal.metricId)||!['session','preparation-or-session'].includes(goal.window)||!goal.conditions)throw new TypeError('Invalid festival goal');
   if(goal.window==='preparation-or-session'&&goal.metricId!=='garden-harvest-quantity')throw new TypeError('Only garden harvest goals count during preparation');
   ids.add(goal.id);
  }
  themes.set(theme.id,theme);
 }
 const rewardKey = theme => `festival:${theme.id}:${theme.rewardId}`;
 const themeSignature = theme => signature({choose:theme.goals.choose,goals:theme.goals.options.map(g=>({id:g.id,metricId:g.metricId,target:g.target,window:g.window,conditions:g.conditions})).sort((a,b)=>a.id.localeCompare(b.id))});
 const entitlement = theme => ({themeId:theme.id,rewardId:theme.rewardId,grantKey:rewardKey(theme)});
 const goalValue = (active, goal) => Math.min(goal.target,(active.progress[goal.id]??[]).reduce((n,r)=>n+r.units,0));
 const goalsView = active => themes.get(active.themeId).goals.options.map(g=>({id:g.id,label:g.label,unit:g.unit,value:goalValue(active,g),target:g.target,done:goalValue(active,g)>=g.target}));

 function createState({namespace='festival'}={}){
  if(!namespaceOK(namespace))throw new TypeError('Use a stable alphanumeric festival namespace');
  return {version:SCHEMA,namespace,nextSession:1,active:null,completedThemes:[],claimedRewards:[],history:[]};
 }
 function readiness(themeId, context={}){
  const theme=themes.get(themeId),missing=[];
  const need=(ok,id,label)=>{if(!ok)missing.push({id,label});};
  if(!theme)return {unlocked:false,ready:false,missing:[{id:'theme',label:'Choose a known evening'}]};
  const p=theme.prerequisites, unlocked=integer(context.level,theme.level,100);
  need(unlocked,'level',`Reach patch level ${theme.level}`);
  need(integer(context.houseLevel,p.houseLevel,100),'house',`Upgrade the home to level ${p.houseLevel}`);
  if(p.kitchenPurchased)need(context.kitchenPurchased===true,'kitchen','Purchase the kitchen');
  for(const recipe of theme.recipeIds)need(Array.isArray(context.knownRecipes)&&context.knownRecipes.includes(recipe),'recipe:'+recipe,'Learn '+recipe.replaceAll('-',' '));
  for(const cap of p.kitchenCapabilities??[])need(Array.isArray(context.kitchenCapabilities)&&context.kitchenCapabilities.includes(cap),'equipment:'+cap,'Place kitchen equipment for '+cap);
  for(const id of p.visitorEventIds??[])need(Array.isArray(context.visitorEventIds)&&context.visitorEventIds.includes(id),'visitors:'+id,'Unlock '+id+' visitors');
  if(p.cocoaTier>0)need(integer(context.cocoaTier,p.cocoaTier,100),'cocoa',`Upgrade Sandy’s stand to tier ${p.cocoaTier}`);
  for(const id of p.gardenDecorIds??[])need(Array.isArray(context.gardenDecorIds)&&context.gardenDecorIds.includes(id),'garden:'+id,'Place '+id.replaceAll('-',' '));
  for(const requirement of p.attractions??[]){
   const a=context.attractions?.[requirement.id], name=requirement.id==='hayride'?'Hollow Hayride':'Hollow House';
   need(a?.ready===true,'prepared:'+requirement.id,'Prepare '+name+' for opening');
   need(integer(a?.tier,requirement.minTier,100),'tier:'+requirement.id,`Upgrade ${name} to tier ${requirement.minTier}`);
   if(requirement.routeLevel>0)need(integer(a?.routeLevel,requirement.routeLevel,100),'route:'+requirement.id,`Purchase route extension ${requirement.routeLevel}`);
   need(a?.open===true,'open:'+requirement.id,'Open '+name+' for guests');
  }
  return {unlocked,ready:!missing.length,missing};
 }
 function stamp(state,context={}){
  if(context.paused||!state.active||!['preparing','running'].includes(state.active.phase))return null;
  return {sessionId:state.active.id,window:state.active.phase==='preparing'?'preparation':'service'};
 }
 function validateEvent(e){
  if(!e||typeof e!=='object'||!text(e.id)||!text(e.sessionId,100)||!['preparation','service'].includes(e.window))return false;
  if(e.kind!=='garden-harvest'&&!guestOK(e.guestId))return false;
  if(e.cohort!==undefined&&!['regular','midnight-court'].includes(e.cohort))return false;
  const paid=n=>finite(n,Number.MIN_VALUE,1e9);
  switch(e.kind){
   case 'food-sale':return e.source==='food'&&text(e.recipeId,80)&&quantityOK(e.quantity)&&paid(e.amount);
   case 'cocoa-sale':return e.source==='cocoa'&&paid(e.amount)&&Array.isArray(e.lines)&&e.lines.length>0&&e.lines.length<=32&&e.lines.every(l=>l&&text(l.productId,80)&&quantityOK(l.quantity));
   case 'ticket-sale':return sources.has(e.source)&&paid(e.amount);
   case 'attraction-completed':return sources.has(e.source)&&e.paid===true&&paid(e.paidAmount)&&finite(e.queueSecondsAtBoarding,0,MAX_ELAPSED)&&(e.source!=='hayride'||integer(e.routeLevelAtDeparture,0,2));
   case 'final-departure':return e.source==='farm-visit'&&e.final===true&&finite(e.happiness,0,100)&&['normal','frightened'].includes(e.outcome);
   case 'garden-harvest':return e.source==='garden'&&text(e.bedId,80)&&quantityOK(e.quantity);
   default:return false;
  }
 }
 function contribution(goal,e){
  const c=goal.conditions;
  switch(goal.metricId){
   case 'food-servings':return e.kind==='food-sale'&&c.recipeIds?.includes(e.recipeId)?e.quantity:0;
   case 'cocoa-servings':return e.kind==='cocoa-sale'?e.lines.reduce((n,l)=>n+(c.cocoaProductIds?.includes(l.productId)?l.quantity:0),0):0;
   case 'garden-harvest-quantity':return e.kind==='garden-harvest'&&c.gardenDecorIds?.includes(e.bedId)?e.quantity:0;
   case 'completed-attraction-guests':return e.kind==='attraction-completed'&&c.attractionIds?.includes(e.source)?1:0;
   case 'extended-hayride-guests':return e.kind==='attraction-completed'&&e.source==='hayride'&&c.attractionIds?.includes(e.source)&&e.routeLevelAtDeparture>=c.minimumRouteLevel?1:0;
   case 'short-queue-completions':return e.kind==='attraction-completed'&&c.attractionIds?.includes(e.source)&&e.queueSecondsAtBoarding<=c.maximumQueueSeconds?1:0;
   case 'vip-served-guests':return ['food-sale','cocoa-sale','ticket-sale'].includes(e.kind)&&e.cohort==='midnight-court'&&c.visitorEventId==='vip'&&c.paidSources?.includes(e.source)?1:0;
   case 'happy-departures':return e.kind==='final-departure'&&e.outcome==='normal'&&e.happiness>=c.minimumHappiness?1:0;
   default:return 0;
  }
 }
 function view(state,context={}){
  const active=state.active, goals=active?goalsView(active):[], complete=goals.filter(g=>g.done).length;
  return {
   active:active?{id:active.id,themeId:active.themeId,phase:active.phase,elapsedSeconds:active.elapsedSeconds,goals,completedGoals:complete,requiredGoals:3,canFinish:complete>=3}:null,
   themes:[...themes.values()].map(t=>({id:t.id,name:t.name,level:t.level,rewardId:t.rewardId,completed:state.completedThemes.includes(t.id),claimed:state.claimedRewards.some(r=>r.themeId===t.id),readiness:readiness(t.id,context)})),
   pendingRewards:state.completedThemes.filter(id=>!state.claimedRewards.some(r=>r.themeId===id)).map(id=>entitlement(themes.get(id))),
   ownedRewards:clone(state.claimedRewards),history:clone(state.history)
  };
 }
 function reduce(state,command,context={}){
  const reject=reason=>({state,accepted:false,changed:false,reason,effects:[]});
  if(!state||state.version!==SCHEMA)return reject('unsupported-state');
  if(!command||typeof command!=='object')return reject('invalid-command');
  const active=state.active, theme=active?themes.get(active.themeId):null;
  let next=null, effects=[], reason='ok';
  const edit=()=>next??=clone(state);
  switch(command.type){
   case 'prepare':{
    const selected=themes.get(command.themeId);
    if(!selected)return reject('unknown-theme');
    if(active)return reject('evening-active');
    if(!readiness(selected.id,context).unlocked)return reject('level-locked');
    if(!integer(state.nextSession,1,Number.MAX_SAFE_INTEGER-1))return reject('session-limit');
    const s=edit();s.active={id:`${s.namespace}:${s.nextSession++}`,themeId:selected.id,themeSignature:themeSignature(selected),phase:'preparing',elapsedSeconds:0,progress:Object.fromEntries(selected.goals.options.map(g=>[g.id,[]]))};
    break;
   }
   case 'start':
    if(!active||active.phase!=='preparing')return reject('not-preparing');
    if(context.paused)return reject('game-paused');
    if(!readiness(theme.id,context).ready)return reject('not-ready');
    edit().active.phase='running';break;
   case 'pause':
    if(!active||active.phase!=='running')return reject('not-running');
    edit().active.phase='paused';break;
   case 'resume':
    if(!active||active.phase!=='paused')return reject('not-paused');
    if(context.paused)return reject('game-paused');
    edit().active.phase='running';break;
   case 'tick':
    if(context.paused)return reject('game-paused');
    if(!active||active.phase!=='running')return reject('not-running');
    if(!finite(command.seconds,0,60)||active.elapsedSeconds+command.seconds>MAX_ELAPSED)return reject('invalid-step');
    if(command.seconds)edit().active.elapsedSeconds+=command.seconds;
    break;
   case 'outcome':{
    if(context.paused)return reject('game-paused');
    if(!active)return reject('no-evening');
    if(active.phase==='paused')return reject('evening-paused');
    const e=command.event;
    if(!validateEvent(e))return reject('invalid-outcome');
    if(e.sessionId!==active.id)return reject('old-session');
    if(e.kind!=='garden-harvest'&&(e.window!=='service'||active.phase!=='running'))return reject('outside-service');
    if(e.window==='service'&&active.phase!=='running')return reject('outside-service');
    const key=eventKey(e);let repeated=false;
    // One confirmed fact is considered for every goal on its first delivery.
    // Replaying it cannot retag the same receipt into a different goal.
    if(Object.values(active.progress).some(records=>records.some(r=>r.key===key)))return {state,accepted:true,changed:false,reason:'already-counted',effects:[]};
    for(const goal of theme.goals.options){
     const records=active.progress[goal.id], value=goalValue(active,goal);
     if(value>=goal.target)continue;
     if(goal.window==='session'&&e.window!=='service')continue;
     const amount=contribution(goal,e);if(!amount)continue;
     const distinct=distinctMetrics.has(goal.metricId);
     if(records.some(r=>r.key===key||distinct&&r.guestId===e.guestId)){repeated=true;continue;}
     const record={key,units:Math.min(goal.target-value,amount),...(distinct?{guestId:e.guestId}:{})};
     edit().active.progress[goal.id].push(record);
     if(value+record.units>=goal.target)effects.push({type:'festival-goal',goalId:goal.id,themeId:theme.id});
    }
    if(!next)reason=repeated?'already-counted':'no-progress';
    break;
   }
   case 'end':{
    if(!active)return reject('no-evening');
    const goals=goalsView(active),success=active.phase!=='preparing'&&goals.filter(g=>g.done).length>=theme.goals.choose;
    const s=edit();
    if(success&&!s.completedThemes.includes(theme.id))s.completedThemes.push(theme.id);
    s.history.unshift({id:active.id,themeId:theme.id,outcome:success?'completed':active.phase==='preparing'?'cancelled':'ended',elapsedSeconds:active.elapsedSeconds,goals:goals.map(g=>({id:g.id,value:g.value,target:g.target}))});
    s.history.length=Math.min(MAX_HISTORY,s.history.length);s.active=null;
    effects.push({type:success?'festival-completed':'festival-ended',themeId:theme.id});break;
   }
   case 'claim':{
    const selected=themes.get(command.themeId);
    if(!selected)return reject('unknown-theme');
    if(!state.completedThemes.includes(selected.id))return reject('not-earned');
    if(state.claimedRewards.some(r=>r.themeId===selected.id))return reject('already-claimed');
    const grant=entitlement(selected);edit().claimedRewards.push(grant);effects.push({type:'festival-reward',...grant});break;
   }
   default:return reject('unknown-command');
  }
  return {state:next??state,accepted:true,changed:!!next,reason,effects};
 }
 function save(state){
  const result=clone(state);
  if(result.active?.phase==='running')result.active.phase='paused';
  return result;
 }
 function restore(raw){
  const bad=message=>({state:null,compatible:false,warnings:[message]});
  if(raw===undefined||raw===null)return {state:createState(),compatible:true,warnings:[]};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==SCHEMA)return bad('Unsupported festival save; preserve the original field.');
  if(!namespaceOK(raw.namespace)||!integer(raw.nextSession,1,Number.MAX_SAFE_INTEGER-1))return bad('Invalid festival identity; preserve the original field.');
  if(!Array.isArray(raw.completedThemes)||raw.completedThemes.length>themes.size||raw.completedThemes.some(id=>!themes.has(id))||new Set(raw.completedThemes).size!==raw.completedThemes.length)return bad('Unknown or unsafe permanent festival progress; preserve the original field.');
  if(!Array.isArray(raw.claimedRewards)||raw.claimedRewards.length>themes.size)return bad('Unsafe reward ownership; preserve the original field.');
  const claims=[],claimedIds=new Set();
  for(const record of raw.claimedRewards){
   const t=themes.get(record?.themeId);
   if(!t||!raw.completedThemes.includes(t.id)||record.rewardId!==t.rewardId||record.grantKey!==rewardKey(t)||claimedIds.has(t.id))return bad('Unknown or unsafe reward ownership; preserve the original field.');
   claimedIds.add(t.id);claims.push(entitlement(t));
  }
  const s=createState({namespace:raw.namespace}),warnings=[];
  s.nextSession=raw.nextSession;s.completedThemes=[...raw.completedThemes];s.claimedRewards=claims;
  const sessionNumber=id=>{
   if(typeof id!=='string'||!id.startsWith(s.namespace+':'))return null;
   const tail=id.slice(s.namespace.length+1);if(!/^[1-9]\d*$/.test(tail))return null;
   const n=Number(tail);return integer(n,1,Number.MAX_SAFE_INTEGER-2)?n:null;
  };
  if(Array.isArray(raw.history))for(const h of raw.history.slice(0,MAX_HISTORY)){
   const t=themes.get(h?.themeId),n=sessionNumber(h?.id);
   if(!t||n===null||!['completed','ended','cancelled'].includes(h.outcome)||!finite(h.elapsedSeconds,0,MAX_ELAPSED)||!Array.isArray(h.goals)||h.goals.length!==4)continue;
   const goals=t.goals.options.map(g=>{const row=h.goals.find(r=>r?.id===g.id);return row&&integer(row.value,0,g.target)&&row.target===g.target?{id:g.id,value:row.value,target:g.target}:null;});
   if(goals.some(g=>!g))continue;
   if(s.history.some(r=>r.id===h.id))continue;
   s.nextSession=Math.max(s.nextSession,n+1);s.history.push({id:h.id,themeId:t.id,outcome:h.outcome,elapsedSeconds:h.elapsedSeconds,goals});
  }
  if(raw.active!==null&&raw.active!==undefined){
   const a=raw.active,t=themes.get(a?.themeId),n=sessionNumber(a?.id);
   if(n!==null)s.nextSession=Math.max(s.nextSession,n+1);
   let valid=!!t&&n!==null&&a.themeSignature===themeSignature(t)&&!s.history.some(h=>h.id===a.id)&&['preparing','running','paused'].includes(a.phase)&&finite(a.elapsedSeconds,0,MAX_ELAPSED)&&(a.phase!=='preparing'||a.elapsedSeconds===0)&&a.progress&&typeof a.progress==='object'&&!Array.isArray(a.progress)&&Object.keys(a.progress).length===4;
   const progress={};
   if(valid)for(const goal of t.goals.options){
    const records=a.progress[goal.id],keys=new Set(),guests=new Set(),clean=[];let total=0;
    if(!Array.isArray(records)||records.length>goal.target||a.phase==='preparing'&&goal.window!=='preparation-or-session'&&records.length){valid=false;break;}
    for(const r of records){
     const distinct=distinctMetrics.has(goal.metricId);
     if(!r||!text(r.key,384)||keys.has(r.key)||!integer(r.units,1,goal.target)||distinct&&(!guestOK(r.guestId)||guests.has(r.guestId)||r.units!==1)){valid=false;break;}
     let key;try{key=JSON.parse(r.key);}catch{valid=false;break;}
     const allowedKinds={
      'food-servings':['food-sale'],'cocoa-servings':['cocoa-sale'],'garden-harvest-quantity':['garden-harvest'],
      'completed-attraction-guests':['attraction-completed'],'extended-hayride-guests':['attraction-completed'],
      'short-queue-completions':['attraction-completed'],'vip-served-guests':['food-sale','cocoa-sale','ticket-sale'],
      'happy-departures':['final-departure']
     };
     const allowedSource={ 'food-sale':['food'],'cocoa-sale':['cocoa'],'garden-harvest':['garden'],'attraction-completed':['hollow-house','hayride'],'ticket-sale':['hollow-house','hayride'],'final-departure':['farm-visit'] };
     if(!Array.isArray(key)||key.length!==3||!allowedKinds[goal.metricId].includes(key[0])||!allowedSource[key[0]]?.includes(key[1])||!text(key[2])||JSON.stringify(key)!==r.key){valid=false;break;}
     if(goal.conditions.attractionIds&&!goal.conditions.attractionIds.includes(key[1])||goal.metricId==='extended-hayride-guests'&&key[1]!=='hayride'||goal.metricId==='vip-served-guests'&&!goal.conditions.paidSources?.includes(key[1])){valid=false;break;}
     keys.add(r.key);if(distinct)guests.add(r.guestId);total+=r.units;
     clean.push({key:r.key,units:r.units,...(distinct?{guestId:r.guestId}:{})});
    }
    if(total>goal.target){valid=false;break;}
    progress[goal.id]=clean;
   }
   if(valid)s.active={id:a.id,themeId:t.id,themeSignature:a.themeSignature,phase:a.phase==='running'?'paused':a.phase,elapsedSeconds:a.elapsedSeconds,progress};
   else warnings.push('Dropped corrupt active evening; permanent progress and ownership were preserved.');
  }
  return {state:s,compatible:true,warnings};
 }
 return Object.freeze({createState,readiness,reduce,stamp,view,save,restore,entitlements:state=>clone(state.claimedRewards)});
}
