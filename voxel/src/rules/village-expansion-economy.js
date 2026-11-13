// Farm-side rewards use the existing wallets, pantry, food and stock ledgers.
import { EXPANSION_ECONOMY_UPGRADES, EXPANSION_COMMISSIONS } from '../content/village-expansion-economy.js';
import { expansionRewardOwned, expansionEconomy, stockBatchKey, pumpkinStockLife } from './village-expansion-benefits.js';
import { patchLevel } from './levels.js';
import { pantryCount, pantryCapacity } from './cooking.js';
import { equipmentRequirements, homeKitchenOpen } from './kitchen-equipment.js';
import { RECIPE_BY_ID } from '../content/cooking.js';
import { availableFood } from './cooking-sales.js';
import { settlePumpkinStock } from './stock.js';

const whole=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0?Math.min(max,n):0;
const own=(s,flag)=>expansionRewardOwned(s,flag);
const no=reason=>({ok:false,reason,events:[]});
const state=s=>expansionEconomy(s);
export function freshExpansionEconomy(){return{upgrades:[],invested:0,wax:0,waxJob:null,treated:{},commissions:{},income:0,portions:0,vipIn:300,vipDue:false,vipGroups:0,herbsProcessed:0,waxCooked:0,treatments:0,treatedPumpkins:0};}
export function restoreExpansionEconomy(raw){
 const e=freshExpansionEconomy();if(!raw||typeof raw!=='object')return e;
 e.upgrades=[...new Set((Array.isArray(raw.upgrades)?raw.upgrades:[]).filter(id=>EXPANSION_ECONOMY_UPGRADES.some(u=>u.id===id)))];
 for(const k of ['invested','wax','income','portions','vipGroups','herbsProcessed','waxCooked','treatments','treatedPumpkins'])e[k]=whole(raw[k],k==='wax'?99:1e9);
 e.vipIn=Number.isFinite(raw.vipIn)?Math.max(0,Math.min(300,raw.vipIn)):300;e.vipDue=raw.vipDue===true;
 for(const[key,on]of Object.entries(raw.treated??{}).slice(-2048)){const [v,at]=key.split(':').map(Number);if(on===true&&Number.isInteger(v)&&v>=0&&v<5&&Number.isFinite(at)&&at>=0&&key===stockBatchKey(v,at))e.treated[key]=true;}
 for(const q of EXPANSION_COMMISSIONS){const r=raw.commissions?.[q.id];if(r)e.commissions[q.id]={done:whole(r.done),remaining:Number.isFinite(r.remaining)?Math.max(0,Math.min(120,r.remaining)):0};}
 const j=raw.waxJob;if(j&&['truck','home'].includes(j.station)&&Number.isFinite(j.remaining))e.waxJob={station:j.station,remaining:Math.max(0,Math.min(30,j.remaining))};
 return e;
}
export function expansionEconomyUpgradeInfo(s,id){
 const u=EXPANSION_ECONOMY_UPGRADES.find(u=>u.id===id);if(!u)return null;
 const e=state(s),owned=!!e?.upgrades.includes(id),unlocked=own(s,u.reward)&&patchLevel(s).level>=u.level;
 const materials=Object.entries(u.materials).map(([id,n])=>({id,need:n,have:s.village?.materials?.[id]??0}));
 const gems=Object.entries(u.gems).map(([id,n])=>({id,need:n,have:s.village?.expansion?.gems?.[id]??0}));
 const affordable=s.coins>=u.coins&&[...materials,...gems].every(r=>r.have>=r.need);
 return{...u,owned,unlocked,materials,gems,affordable,canBuy:!!e&&!s.paused&&!owned&&unlocked&&affordable};
}
export function buyExpansionEconomyUpgrade(s,id){
 const q=expansionEconomyUpgradeInfo(s,id);if(!q?.canBuy)return no(q?.owned?'Already installed.':'Discover Opal’s blueprint and gather its supplies first.');
 // Expired pumpkins cannot be brought back by buying longer shelf life.
 settlePumpkinStock(s);s.coins-=q.coins;
 for(const r of q.materials)s.village.materials[r.id]-=r.need;
 for(const r of q.gems)s.village.expansion.gems[r.id]-=r.need;
 const e=state(s);e.upgrades.push(id);e.invested+=q.coins;
 return{ok:true,reason:'Cold store installed. Pumpkins last 20% longer.',events:[{type:'expansion-upgrade',upgrade:id}]};
}
export function processExpansionHerbs(s,quantity=1){
 const e=state(s);if(!e||s.paused||!s.kitchen?.purchased||!own(s,'herb-beds'))return no('Learn Tansy’s clean-herb preparation first.');
 if(!Number.isInteger(quantity)||quantity<1||quantity>20)return no('Choose one to twenty herb bundles.');
 if((s.village.materials.herbs??0)<quantity||pantryCount(s)+quantity>pantryCapacity(s))return no('Bring herb bundles and make room in the pantry.');
 s.village.materials.herbs-=quantity;s.kitchen.pantry.herbs+=quantity;e.herbsProcessed+=quantity;
 return{ok:true,reason:`Prepared ${quantity} clean garden herb${quantity===1?'':'s'}.`,events:[{type:'expansion-herbs-prepared',quantity}]};
}
export function expansionWaxInfo(s,station='truck'){
 const e=state(s),equipment=equipmentRequirements(s,{equipment:['hob','pot']},station);
 const reason=!own(s,'preservation-research')?'Discover Tansy’s preservation research.':!s.kitchen?.purchased?'Open Maisie’s kitchen first.':!['truck','home'].includes(station)?'Choose a cooker.':station==='home'&&!homeKitchenOpen(s)?'Upgrade the house to open its kitchen.':!equipment.ok?`Need ${equipment.names.join(' and ').toLowerCase()}.`:e?.waxJob||s.kitchen.jobs[station]?'This cooker is busy.':(s.kitchen.pantry.herbs??0)<1||(s.kitchen.pantry.butter??0)<1?'Need one clean herb and one butter.':(e?.wax??99)>=99?'Use some stored wax first.':'';
 return{unlocked:own(s,'preservation-research'),station,seconds:30,wax:e?.wax??0,job:e?.waxJob??null,canCook:!!e&&!s.paused&&!reason,reason};
}
export function startExpansionWax(s,station='truck'){
 const q=expansionWaxInfo(s,station);if(!q.canCook)return no(q.reason||'Resume the farm to cook.');
 s.kitchen.pantry.herbs--;s.kitchen.pantry.butter--;state(s).waxJob={station,remaining:30};
 return{ok:true,reason:'Preservation wax is warming. Check the cooker at the farm.',events:[{type:'expansion-wax-started',station}]};
}
export function expansionTreatableStock(s){
 const e=state(s);return(s.pumpkinAges??[]).flatMap((list,v)=>list.filter(([at,n])=>n>0&&!e?.treated[stockBatchKey(v,at)]&&s.time-at<pumpkinStockLife(s,v,at)).map(([born,quantity])=>({id:stockBatchKey(v,born),variety:v,born,quantity})));
}
export function treatExpansionStock(s,batchId){
 const e=state(s);if(!e||s.paused||!own(s,'preservation-research')||!e.wax)return no('Make a pot of preservation wax first.');
 settlePumpkinStock(s);const batch=expansionTreatableStock(s).find(b=>b.id===batchId);if(!batch)return no('That batch is already treated or no longer in stock.');
 e.wax--;e.treated[batch.id]=true;e.treatments++;e.treatedPumpkins+=batch.quantity;return{ok:true,reason:`Protected ${batch.quantity} pumpkins in this batch.`,events:[{type:'expansion-stock-treated',batch:batch.id,quantity:batch.quantity}]};
}
export function expansionCommissionInfo(s,id){
 const q=EXPANSION_COMMISSIONS.find(q=>q.id===id);if(!q)return null;
 const e=state(s),r=RECIPE_BY_ID[q.recipe],previous=e?.commissions[q.id],unlocked=own(s,'restaurant-commissions')&&!!s.kitchen?.purchased&&s.kitchen.recipes.includes(q.recipe)&&patchLevel(s).level>=r.level;
 const have=availableFood(s,q.recipe),amount=Math.floor(r.price*q.quantity*q.premium),remaining=Math.max(0,...EXPANSION_COMMISSIONS.filter(other=>other.who===q.who).map(other=>e?.commissions[other.id]?.remaining??0));
 return{...q,amount,have,remaining,done:previous?.done??0,unlocked,canDeliver:!!e&&!s.paused&&unlocked&&remaining<=0&&have>=q.quantity};
}
export function fulfilExpansionCommission(s,id){
 const q=expansionCommissionInfo(s,id);if(!q?.canDeliver)return no(q?.remaining>0?'The next table is not ready yet.':'Prepare the requested food and keep it unreserved.');
 const e=state(s);s.kitchen.food[q.recipe]-=q.quantity;s.coins+=q.amount;s.earned+=q.amount;e.income+=q.amount;e.portions+=q.quantity;e.commissions[id]={done:q.done+1,remaining:120};
 return{ok:true,reason:`Delivered ${q.quantity} portions · £${q.amount}.`,events:[{type:'expansion-commission',id,recipe:q.recipe,quantity:q.quantity,amount:q.amount}]};
}
export function expansionEconomyInfo(s){return{upgrades:EXPANSION_ECONOMY_UPGRADES.map(u=>expansionEconomyUpgradeInfo(s,u.id)),wax:expansionWaxInfo(s),batches:expansionTreatableStock(s),commissions:EXPANSION_COMMISSIONS.map(q=>expansionCommissionInfo(s,q.id)),herbs:s.village?.materials?.herbs??0,pantryHerbs:s.kitchen?.pantry?.herbs??0,canPrepareHerbs:own(s,'herb-beds'),income:state(s)?.income??0};}
// Farm dt preserves the existing 2.5–10% away-clock policy for cooking and trade.
export function updateExpansionEconomy(s,dt,events=[]){
 const e=state(s);if(!e||s.paused||!Number.isFinite(dt)||dt<=0)return;
 if(e.waxJob){e.waxJob.remaining=Math.max(0,e.waxJob.remaining-dt);if(e.waxJob.remaining===0){const station=e.waxJob.station;e.wax=Math.min(99,e.wax+1);e.waxCooked++;e.waxJob=null;events.push({type:'expansion-wax-complete',station});}}
 for(const q of Object.values(e.commissions))q.remaining=Math.max(0,q.remaining-dt);
 if(own(s,'baron-reservations')){e.vipIn=Math.max(0,e.vipIn-dt);if(e.vipIn===0)e.vipDue=true;}
 if(own(s,'corvus-scenery')&&s.hayride?.purchased&&!s.hayride.haunts.owned.includes('turning-scarecrows')){s.hayride.haunts.owned.push('turning-scarecrows');s.hayride.haunts.active.push('turning-scarecrows');events.push({type:'expansion-scenery-installed',id:'turning-scarecrows'});}
 if(own(s,'granny-invited')&&s.hayride?.purchased&&!s.hayride.haunts.owned.includes('grannys-last-light')){s.hayride.haunts.owned.push('grannys-last-light');s.hayride.haunts.active.push('grannys-last-light');events.push({type:'expansion-scenery-installed',id:'grannys-last-light'});}
 const alive=new Set((s.pumpkinAges??[]).flatMap((list,v)=>list.map(([at])=>stockBatchKey(v,at))));
 for(const id of Object.keys(e.treated))if(!alive.has(id))delete e.treated[id];
}
// One due reservation substitutes the next ordinary party; no extra rush queue.
export const expansionReservationReady = s => !!state(s)?.vipDue && own(s,'baron-reservations') && !s.visitorEvents?.rush?.pending && !s.visitorEvents?.vip?.pending;
export function takeExpansionReservation(s){
 const e=state(s);if(!expansionReservationReady(s))return false;
 e.vipDue=false;e.vipIn=300;e.vipGroups++;return true;
}
export function actExpansionEconomy(s,id,action={}){
 if(id==='cold-store')return buyExpansionEconomyUpgrade(s,id);
 if(id==='prepare-herbs')return processExpansionHerbs(s,action.quantity??1);
 if(id==='preservation-wax')return startExpansionWax(s,action.station??'truck');
 if(id==='protect-stock')return treatExpansionStock(s,action.batch??expansionTreatableStock(s)[0]?.id);
 if(EXPANSION_COMMISSIONS.some(q=>q.id===id))return fulfilExpansionCommission(s,id);
 return no('Choose an available workshop action.');
}
