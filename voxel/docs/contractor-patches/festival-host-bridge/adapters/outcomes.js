// Value-only adapters for confirmed rule results. They do not execute payments,
// infer final departures, inspect a live save, mutate guests, or grant rewards.
const text=(s,max=160)=>typeof s==='string'&&s.length>0&&s.length<=max&&s.trim()===s&&!/[\x00-\x1f\x7f]/.test(s);
const integer=(n,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
const finite=(n,lo=0,hi=Number.MAX_VALUE)=>Number.isFinite(n)&&n>=lo&&n<=hi;
const paid=n=>finite(n,Number.MIN_VALUE,1e9);
const quantity=n=>integer(n,1,1e6);
const guestKey=s=>typeof s==='string'&&/^(visitor|customer):[A-Za-z0-9_-]{1,80}$/.test(s);
const ridePhases=new Set(['departing','circuit','arriving','unloading']);
const attractionSources=new Set(['hollow-house','hayride']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const validVisit=(source,id)=>typeof id==='string'&&(source==='hayride'?/^hayride-\d+$/:/^hollow-\d+$/).test(id)&&integer(Number(id.slice(source==='hayride'?8:7)),0,1e12-1);
const validRun=id=>typeof id==='string'&&/^hayride-run-\d+$/.test(id)&&integer(Number(id.slice(12)),0,1e12-1);

function stamp(binding,service=true){
 if(!object(binding)||!text(binding.id)||!text(binding.sessionId,100)||!['preparation','service'].includes(binding.window)||service&&binding.window!=='service')return null;
 return {sessionId:binding.sessionId,window:binding.window};
}
function identityValue(identity){
 const guest=identity?.guest;
 if(!object(identity)||!['visitor','customer'].includes(identity.namespace)||!object(guest)||!integer(guest.id))return null;
 return {guestId:`${identity.namespace}:${guest.id}`,cohort:guest.courtier===true?'midnight-court':'regular'};
}

/** Whitelist the engine's bounded normalized grammar; never retain extra data. */
export function cleanOutcome(raw){
 if(!object(raw)||!text(raw.id)||!text(raw.sessionId,100)||!['preparation','service'].includes(raw.window))return null;
 const base={id:raw.id,sessionId:raw.sessionId,window:raw.window};
 if(raw.kind!=='garden-harvest'){
  if(raw.window!=='service'||!guestKey(raw.guestId))return null;
  base.guestId=raw.guestId;
  if(raw.cohort!==undefined){if(!['regular','midnight-court'].includes(raw.cohort))return null;base.cohort=raw.cohort;}
 }
 switch(raw.kind){
  case 'food-sale':
   if(raw.source!=='food'||!text(raw.recipeId,80)||!quantity(raw.quantity)||!paid(raw.amount))return null;
   return {...base,kind:raw.kind,source:'food',recipeId:raw.recipeId,quantity:raw.quantity,amount:raw.amount};
  case 'cocoa-sale':{
   if(raw.source!=='cocoa'||!paid(raw.amount)||!Array.isArray(raw.lines)||!raw.lines.length||raw.lines.length>32||!raw.lines.every(line=>object(line)&&text(line.productId,80)&&quantity(line.quantity)))return null;
   return {...base,kind:raw.kind,source:'cocoa',amount:raw.amount,lines:raw.lines.map(line=>({productId:line.productId,quantity:line.quantity}))};
  }
  case 'ticket-sale':
   if(!attractionSources.has(raw.source)||!paid(raw.amount))return null;
   return {...base,kind:raw.kind,source:raw.source,amount:raw.amount};
  case 'attraction-completed':
   if(!attractionSources.has(raw.source)||raw.paid!==true||!paid(raw.paidAmount)||!finite(raw.queueSecondsAtBoarding,0,1e12)||raw.source==='hayride'&&!integer(raw.routeLevelAtDeparture,0,2))return null;
   return {...base,kind:raw.kind,source:raw.source,paid:true,paidAmount:raw.paidAmount,queueSecondsAtBoarding:raw.queueSecondsAtBoarding,...(raw.source==='hayride'?{routeLevelAtDeparture:raw.routeLevelAtDeparture}:{})};
  case 'final-departure':
   if(raw.source!=='farm-visit'||raw.final!==true||!finite(raw.happiness,0,100)||!['normal','frightened'].includes(raw.outcome))return null;
   return {...base,kind:raw.kind,source:'farm-visit',final:true,happiness:raw.happiness,outcome:raw.outcome};
  case 'garden-harvest':
   if(raw.source!=='garden'||!text(raw.bedId,80)||!quantity(raw.quantity))return null;
   return {...base,kind:raw.kind,source:'garden',bedId:raw.bedId,quantity:raw.quantity};
  default:return null;
 }
}

/** Use the successful commitFoodForCustomer return, never a generic sale event. */
export function foodOutcome(binding,receipt,identity){
 const when=stamp(binding),who=identityValue(identity);
 if(!when||!who||!object(receipt)||!integer(receipt.id,1)||!text(receipt.recipe,80)||!integer(receipt.quantity,1,8)||!paid(receipt.amount)||!finite(receipt.at,0,1e12))return null;
 return cleanOutcome({...when,...who,kind:'food-sale',source:'food',id:`food:${receipt.id}`,recipeId:receipt.recipe,quantity:receipt.quantity,amount:receipt.amount});
}

/** amount is the positive payStandOrder return, items its committed order. */
export function cocoaOutcome(binding,input,identity){
 if(!object(input))return null;const {amount,items}=input;
 const when=stamp(binding),who=identityValue(identity);
 if(!when||!who||!paid(amount)||!Array.isArray(items)||!items.length||items.length>32||!items.every(line=>object(line)&&text(line.id,80)&&integer(line.price,1,1e9)))return null;
 if(new Set(items.map(line=>line.id)).size!==items.length||items.reduce((n,line)=>n+line.price,0)!==amount)return null;
 return cleanOutcome({...when,...who,kind:'cocoa-sale',source:'cocoa',id:binding.id,amount,lines:items.map(line=>({productId:line.id,quantity:1}))});
}

/** Includes genuine harvest overflow; pantry additions/deliveries are not picks. */
export function gardenOutcome(binding,input){
 if(!object(input))return null;const {bedId,result}=input;
 const when=stamp(binding,false);
 if(!when||!text(bedId,80)||!object(result)||!text(result.yields,80)||!quantity(result.amount)||!integer(result.pantry,0,1e6)||!integer(result.sold,0,1e6)||result.pantry+result.sold!==result.amount||!finite(result.coins,0,1e9)||result.sold===0&&result.coins!==0)return null;
 return cleanOutcome({...when,kind:'garden-harvest',source:'garden',id:binding.id,bedId,quantity:result.amount});
}

function paidTicket(source,receipt,visitorId){
 if(!attractionSources.has(source)||!object(receipt)||!validVisit(source,receipt.visitId)||receipt.visitor!==visitorId||!integer(visitorId)||!paid(receipt.amount)||!finite(receipt.at,0,1e12))return false;
 return source!=='hayride'||validRun(receipt.runId)&&integer(receipt.seat,0,7)&&integer(receipt.berth,0,1);
}

export function ticketOutcome(binding,input,identity){
 if(!object(input))return null;const {source,receipt}=input;
 const when=stamp(binding),who=identityValue(identity);
 if(!when||!who||!paidTicket(source,receipt,identity.guest.id)||identity.namespace!=='visitor')return null;
 return cleanOutcome({...when,...who,kind:'ticket-sale',source,id:receipt.visitId,amount:receipt.amount});
}

function cleanDeparture(raw){
 if(!object(raw)||raw.version!==1||!validRun(raw.runId)||!integer(raw.routeLevelAtDeparture,0,2)||!Array.isArray(raw.passengers)||!raw.passengers.length||raw.passengers.length>8)return null;
 const visits=new Set(),guests=new Set(),seats=new Set(),passengers=[];
 let berth=null;
 for(const p of raw.passengers){
  if(!object(p)||!validVisit('hayride',p.visitId)||!guestKey(p.guestId)||!p.guestId.startsWith('visitor:')||!paid(p.paidAmount)||!finite(p.queueSecondsAtBoarding,0,1e12)||!integer(p.seat,0,7)||!integer(p.berth,0,1)||visits.has(p.visitId)||guests.has(p.guestId)||seats.has(p.seat)||berth!==null&&berth!==p.berth)return null;
  visits.add(p.visitId);guests.add(p.guestId);seats.add(p.seat);berth=p.berth;
  passengers.push({visitId:p.visitId,guestId:p.guestId,paidAmount:p.paidAmount,queueSecondsAtBoarding:p.queueSecondsAtBoarding,seat:p.seat,berth:p.berth});
 }
 return {version:1,runId:raw.runId,routeLevelAtDeparture:raw.routeLevelAtDeparture,passengers};
}

/** Capture before the completed run is replaced. No global upgrade is read. */
export function captureHayrideDeparture(input){
 if(!object(input))return null;const {convoy,visitors}=input;
 if(!convoy||!ridePhases.has(convoy.phase)||!validRun(convoy.runId)||!integer(convoy.routeLevel,0,2)||!Array.isArray(convoy.manifest)||!convoy.manifest.length||convoy.manifest.length>8||!Array.isArray(visitors)||visitors.length>1024)return null;
 const passengers=[];
 for(const receipt of convoy.manifest){
  if(!paidTicket('hayride',receipt,receipt?.visitor)||receipt.runId!==convoy.runId)return null;
  const matches=visitors.filter(v=>v?.id===receipt.visitor);
  if(matches.length!==1)return null;
  const v=matches[0],m=v.hayride;
  if(!m||m.charged!==true||m.done===true||!['riding','unloading'].includes(m.phase)||m.visitId!==receipt.visitId||m.runId!==convoy.runId||m.ticket!==receipt.amount||m.seat!==receipt.seat||m.berth!==receipt.berth||!finite(m.waited,0,1e12))return null;
  passengers.push({visitId:receipt.visitId,guestId:`visitor:${v.id}`,paidAmount:receipt.amount,queueSecondsAtBoarding:m.waited,seat:receipt.seat,berth:receipt.berth});
 }
 const snapshot=cleanDeparture({version:1,runId:convoy.runId,routeLevelAtDeparture:convoy.routeLevel,passengers});
 if(!snapshot)return null;
 return Object.freeze({...snapshot,passengers:Object.freeze(snapshot.passengers.map(p=>Object.freeze(p)))});
}

export function hayrideCompletionOutcome(binding,departure,input,identity){
 if(!object(input))return null;const {visitId,completed}=input;
 const when=stamp(binding),who=identityValue(identity),snapshot=cleanDeparture(departure);
 if(!when||!who||!snapshot||completed!==true||identity.namespace!=='visitor'||!validVisit('hayride',visitId))return null;
 const passenger=snapshot.passengers.find(p=>p.visitId===visitId&&p.guestId===who.guestId);
 if(!passenger)return null;
 return cleanOutcome({...when,...who,kind:'attraction-completed',source:'hayride',id:visitId,paid:true,paidAmount:passenger.paidAmount,queueSecondsAtBoarding:passenger.queueSecondsAtBoarding,routeLevelAtDeparture:snapshot.routeLevelAtDeparture});
}

export function mazeCompletionOutcome(binding,input,identity){
 if(!object(input))return null;const {visitId,charged,amount,completed,queueSecondsAtBoarding}=input;
 const when=stamp(binding),who=identityValue(identity);
 if(!when||!who||identity.namespace!=='visitor'||!validVisit('hollow-house',visitId)||charged!==true||completed!==true||!paid(amount)||!finite(queueSecondsAtBoarding,0,1e12))return null;
 return cleanOutcome({...when,...who,kind:'attraction-completed',source:'hollow-house',id:visitId,paid:true,paidAmount:amount,queueSecondsAtBoarding});
}

/** The caller must establish finality at a real departure seam. */
export function departureOutcome(binding,input,identity){
 if(!object(input))return null;const {final,outcome,happiness}=input;
 const when=stamp(binding),who=identityValue(identity);
 if(!when||!who||final!==true||!['normal','frightened'].includes(outcome)||!finite(happiness,0,100))return null;
 return cleanOutcome({...when,...who,kind:'final-departure',source:'farm-visit',id:binding.id,final:true,outcome,happiness});
}
