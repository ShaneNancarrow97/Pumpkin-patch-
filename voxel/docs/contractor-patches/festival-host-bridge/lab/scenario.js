// A private developer fixture, not a second game/save or a demand/profit model.
// All service debits, stock changes, crop yields and ride clocks are real rules.
import definitions from '../../late-game-support/data/festival-themes.json' with { type: 'json' };
import { freshState, saveData, restoreState, STATE_VERSION } from '../../../../src/model.js';
import { LEVELS } from '../../../../src/rules/levels.js';
import { buyDecor, placeDecor } from '../../../../src/rules/house.js';
import { buyEstateDecor, placeEstateDecor } from '../../../../src/rules/house-estate.js';
import { quoteFoodForCustomer, commitFoodForCustomer } from '../../../../src/rules/cooking-sales.js';
import { quoteStandOrder, payStandOrder } from '../../../../src/rules/cocoa-menu.js';
import { buyMeadow, upgradeCocoa } from '../../../../src/rules/festival-meadow.js';
import { pickGardenBed, plantGardenBed, waterGardenBed, updateGardenCrops } from '../../../../src/rules/garden-crops.js';
import * as ride from '../../../../src/rules/hayride.js';
import { worldFestivalContext } from '../../festival-session/adapters/readiness.js';
import { createFestivalBridge } from '../src/bridge.js';
import { foodOutcome, cocoaOutcome, gardenOutcome, ticketOutcome, captureHayrideDeparture, hayrideCompletionOutcome, cleanOutcome } from '../adapters/outcomes.js';

const copy=value=>structuredClone(value), json=value=>JSON.parse(JSON.stringify(value));
const themes=new Map(definitions.themes.map(t=>[t.id,t]));
const finite=n=>Number.isFinite(n)&&n>=0&&n<=1e12;
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12;
const MAX_ROWS=64;
const DISCLOSURE='Private prepared venue: funded upgrades, learned recipes, finished food/cocoa supplies and one initially ripe bed are fixture inputs. Guests are nominated as Court visitors by default, and only the nominated rider’s willingness is forced. Later service payments, growing/harvesting and ride visits use actual rules. No player save, normal storage key, automatic guest demand, final-departure inference, whole-farm production or profit forecast is involved.';

function must(ok,message){if(!ok)throw new Error('Lab fixture: '+message);}
function preparedVenue(){
 const s=freshState();
 s.coins=1_000_000;s.earned=LEVELS.at(-1).at;s.progression.claimed=LEVELS.map(level=>level.level);
 s.house.level=3;s.kitchen.purchased=true;s.kitchen.upgrades.storage=3;
 s.kitchen.recipes=[...new Set(definitions.themes.flatMap(t=>t.recipeIds))];
 for(const id of ['copper-range','gothic-spice-cabinet']){
  must(buyDecor(s,id),'could not buy '+id);must(placeDecor(s,id,'kitchen'),'could not place '+id);
 }
 for(const id of s.kitchen.recipes)s.kitchen.food[id]=12;
 s.shop.unlocked=true;s.customerCare.bags=1;
 s.hollowHouse.purchased=true;s.hollowHouse.status='ready';s.hollowHouse.tier=3;s.hollowHouse.open=true;
 s.visitorEvents.vip.level=1;s.visitorEvents.rush.level=1;
 must(buyMeadow(s),'could not purchase the meadow');
 for(let i=0;i<3;i++)must(upgradeCocoa(s),'could not purchase cocoa tier '+(i+1));
 s.festival.cocoa.stock=40;s.festival.cocoa.extras.deluxe.stock=20;s.festival.cocoa.extras.smores.stock=20;
 must(buyEstateDecor(s,'vegetable-bed'),'could not buy a crop bed');
 const bed=placeEstateDecor(s,'vegetable-bed',-10.5,8.5);must(bed,'could not place crop bed');
 bed.crop={phase:'ready',remaining:0,watered:true};
 must(ride.buyHayride(s),'could not buy hayride');
 for(let i=0;i<2;i++)must(ride.upgradeHayride(s),'could not buy ride tier '+(i+2));
 for(let i=0;i<2;i++)must(ride.buyHayrideRoute(s),'could not buy route '+(i+1));
 must(ride.setHayrideOpen(s,true),'could not open ride');
 // The test nominates each guest. Its own invitation demand is out of scope.
 s.arriving=[];s.hayride.guestTimer=1e12;
 return {world:s,bedInstance:bed.instance};
}

/**
 * This controller deliberately owns a private mutable world. The bridge and
 * adapters remain pure, and no caller-provided/live game object is accepted.
 */
export function createLab({capacity=256}={}){
 const api=createFestivalBridge(definitions,{capacity});
 let fixture=preparedVenue(),world=fixture.world,bedInstance=fixture.bedInstance;
 let bridge=api.createState({namespace:'real-rule-lab'}),selectedTheme=definitions.themes[0].id,deferred=false;
 let ledger=[],guests=[],nextLedger=1,lastResult=null,lastOutcome=null,harvestIncome=0,guestSpend=0;
 let baseline={coins:world.coins,earned:world.earned,food:world.kitchen.ledger.foodIncome,cocoa:world.festival.cocoa.gross,ride:world.hayride.income};
 const context=()=>worldFestivalContext(world);
 const festival=()=>api.view(bridge,context());
 const result=(accepted,reason,fields={})=>(lastResult={accepted,reason,...fields});
 function command(command){const r=api.dispatch(bridge,command,context());bridge=r.state;return result(r.accepted,r.reason,{changed:r.changed,effects:copy(r.effects??[])});}
 function flush(){const r=api.flush(bridge,context());bridge=r.state;return result(true,r.held?'outcomes-held':'outcomes-flushed',{delivered:copy(r.delivered),rejected:copy(r.rejected),held:r.held});}
 function preflight(slots,preparation=false){
  const v=festival(),phase=v.active?.phase;
  if(world.paused)return result(false,'game-paused');
  if(!phase||phase==='paused'||!preparation&&phase!=='running')return result(false,'not-capturing');
  if(v.outbox.free<slots)return result(false,'queue-full',{requiredSlots:slots,free:v.outbox.free});
  return null;
 }
 function bindings(count){const values=[];for(let i=0;i<count;i++){const r=api.bind(bridge,context());must(r.accepted&&r.binding,'source could not bind an outcome');bridge=r.state;values.push(r.binding);}return values;}
 function queue(outcome){
  must(outcome,'confirmed rule result did not normalize');
  const r=api.enqueue(bridge,outcome);must(r.accepted,'preflighted confirmed outcome was rejected: '+r.reason);
  bridge=r.state;lastOutcome=copy(outcome);
  return r.changed;
 }
 function deliver(){return deferred?null:flush();}
 function newGuest(namespace,budget,options={}){
  const id=namespace==='customer'?world.shop.nextCustomer++:world.nextVisitor++;
  const guest={id,kind:0,spot:id%8,budget,basket:[],preferred:[0],age:0,courtier:options.courtier!==false,vip:options.courtier!==false,needs:{hunger:options.hunger??100,thirst:options.thirst??100,happiness:70,value:1.5}};
  return {guest,identity:{namespace,guest},guestId:`${namespace}:${id}`,initialBudget:budget};
 }
 function noteGuest(record,kind){
  const spent=record.initialBudget-record.guest.budget;must(finite(spent),'invalid purse change');guestSpend+=spent;
  guests.unshift({id:record.guestId,kind,budget:record.guest.budget,initialBudget:record.initialBudget,spent});guests.length=Math.min(MAX_ROWS,guests.length);
 }
 function row(data){ledger.unshift({serial:nextLedger++,at:world.time,...data});ledger.length=Math.min(MAX_ROWS,ledger.length);return ledger[0];}
 function serviceResult(data,outcomes,delivery){
  const r=result(true,'confirmed',{...data,outcomes:copy(outcomes),outcomesQueued:outcomes.length,delivery:delivery?copy(delivery):null,pending:bridge.pending.length});return r;
 }
 function advance(seconds,{garden=false}={}){
  let left=seconds;
  while(left>0){const dt=Math.min(60,left);world.time+=dt;if(garden)updateGardenCrops(world,dt);const r=api.dispatch(bridge,{type:'tick',seconds:dt},context());bridge=r.state;left-=dt;}
 }
 function prepare(themeId=selectedTheme){
  if(!themes.has(themeId))return result(false,'unknown-theme');
  const r=command({type:'prepare',themeId});
  if(r.accepted){selectedTheme=themeId;world.kitchen.displays=[themes.get(themeId).recipeIds[0],null];}
  return r;
 }
 function serveFood(options={}){
  const blocked=preflight(1);if(blocked)return blocked;
  const [binding]=bindings(1);
  const budget=options.budget??100;if(!finite(budget))return result(false,'invalid-budget');
  const record=newGuest('customer',budget,options),before=world.coins;
  const quote=quoteFoodForCustomer(world,record.guest);
  if(!quote)return result(false,'food-not-quoted');
  const receipt=commitFoodForCustomer(world,record.guest);
  if(!receipt)return result(false,'food-not-paid');
  const outcome=foodOutcome(binding,receipt,record.identity);queue(outcome);noteGuest(record,'food');
  must(world.coins-before===receipt.amount,'food receipt differs from real income');
  const entry=row({kind:'food',guestId:record.guestId,amount:receipt.amount,quantity:receipt.quantity,recipeId:receipt.recipe,receiptId:receipt.id});
  const delivered=deliver();return serviceResult({amount:receipt.amount,quantity:receipt.quantity,receipt:copy(receipt),entry:copy(entry)},[outcome],delivered);
 }
 function serveCocoa(options={}){
  const blocked=preflight(1);if(blocked)return blocked;
  const [binding]=bindings(1),budget=options.budget??60;if(!finite(budget))return result(false,'invalid-budget');
  const record=newGuest('visitor',budget,options),before=world.coins;
  // This guest has finished pumpkin shopping; do not reserve another basket.
  const items=quoteStandOrder(world,record.guest,false),amount=payStandOrder(world,record.guest,items);
  if(!amount)return result(false,'cocoa-not-paid');
  const outcome=cocoaOutcome(binding,{amount,items},record.identity);queue(outcome);noteGuest(record,'cocoa');
  must(world.coins-before===amount,'cocoa receipt differs from real income');
  const entry=row({kind:'cocoa',guestId:record.guestId,amount,quantity:items.length,productIds:items.map(l=>l.id),receiptId:binding.id});
  const delivered=deliver();return serviceResult({amount,quantity:items.length,items:copy(items),entry:copy(entry)},[outcome],delivered);
 }
 function harvest({grow=false}={}){
  const blocked=preflight(1,true);if(blocked)return blocked;
  const bed=world.estate.placed.find(p=>p.instance===bedInstance);if(!bed)return result(false,'missing-bed');
  const [binding]=bindings(1);let growthSeconds=0;
  if(grow&&bed.crop?.phase!=='ready'){
   if(!bed.crop||bed.crop.phase==='empty')plantGardenBed(world,bed.instance);
   waterGardenBed(world,bed.instance);
   if(bed.crop?.phase==='growing'){growthSeconds=bed.crop.remaining;advance(growthSeconds,{garden:true});}
  }
  const picked=pickGardenBed(world,bed.instance);if(!picked)return result(false,'bed-not-ripe');
  const outcome=gardenOutcome(binding,{bedId:bed.id,result:picked});queue(outcome);harvestIncome+=picked.coins;
  const entry=row({kind:'harvest',amount:picked.coins,quantity:picked.amount,pantry:picked.pantry,sold:picked.sold,bedId:bed.id,receiptId:binding.id,growthSeconds});
  const delivered=deliver();return serviceResult({amount:picked.coins,quantity:picked.amount,harvest:copy(picked),growthSeconds,entry:copy(entry)},[outcome],delivered);
 }
 function runRide(options={}){
  const blocked=preflight(2);if(blocked)return blocked;
  const [ticketBinding,completionBinding]=bindings(2),budget=options.budget??60;if(!finite(budget))return result(false,'invalid-budget');
  const record=newGuest('visitor',budget,options),guest=record.guest,before=world.coins,begin=world.time;
  // Only this nominated fixture guest's willingness is forced. Queue, price,
  // purse, boarding, convoy timing, scares, unloading and return are real rules.
  guest.hayride=ride.planHayrideVisit(world,guest,'arrival',{force:true,approachSeconds:.1,returnSeconds:.1});
  if(!guest.hayride)return result(false,'ride-not-admitted');
  world.visitors.push(guest);
  let departure=null,receipt=null,ticket=null,completion=null,ticketGoalValues=null,returned=false;
  for(let step=0;step<400&&!guest.hayride.done;step++){
   world.time+=1;const tick=api.dispatch(bridge,{type:'tick',seconds:1},context());bridge=tick.state;
   const events=[];ride.updateHayride(world,1,events);
   for(const event of events){
    if(event.type==='sale'&&event.route==='hayride-ticket'&&event.visitor===guest.id){
     receipt=copy(world.hayride.receipts.find(r=>r.visitId===guest.hayride.visitId));
     ticket=ticketOutcome(ticketBinding,{source:'hayride',receipt},record.identity);queue(ticket);deliver();
     ticketGoalValues=Object.fromEntries((festival().active?.goals??[]).map(g=>[g.id,g.value]));
    }
    if(event.type==='hayride-departed'){
     const convoy=ride.hayrideConvoys(world).find(c=>c.runId===event.runId&&c.manifest.some(r=>r.visitor===guest.id));
     if(convoy){departure=captureHayrideDeparture({convoy,visitors:world.visitors});must(departure,'real departure could not be captured');if(typeof options.onDeparture==='function')options.onDeparture({departure,world,guest});}
    }
    if(event.type==='hayride-returned'&&departure?.runId===event.runId){
     returned=true;completion=hayrideCompletionOutcome(completionBinding,departure,{visitId:guest.hayride.visitId,completed:true},record.identity);queue(completion);
    }
   }
  }
  must(ticket&&completion&&receipt&&returned&&guest.hayride.done,'real ride did not complete its paid trip');
  // The private actor's subsequent shopping is outside this lab. Retiring the
  // fixture actor emits no final-departure/happiness outcome.
  world.visitors=world.visitors.filter(v=>v!==guest);
  noteGuest(record,'hayride');must(world.coins-before===receipt.amount,'one trip did not reconcile to one ticket');
  const passenger=departure.passengers.find(p=>p.visitId===receipt.visitId);
  const entry=row({kind:'hayride',guestId:record.guestId,amount:receipt.amount,quantity:1,receiptId:receipt.visitId,routeLevelAtDeparture:departure.routeLevelAtDeparture,queueSecondsAtBoarding:passenger.queueSecondsAtBoarding,simulationSeconds:world.time-begin});
  const delivered=deliver();return serviceResult({amount:receipt.amount,quantity:1,receipt:copy(receipt),departure:copy(departure),ticketGoalValues,simulationSeconds:world.time-begin,entry:copy(entry)},[ticket,completion],delivered);
 }
 function replayLast(){
  if(!lastOutcome)return result(false,'no-confirmed-outcome');
  const r=api.enqueue(bridge,lastOutcome);bridge=r.state;
  const delivery=r.accepted&&!deferred?flush():null;
  return result(r.accepted,r.reason,{changed:r.changed,delivery:delivery?copy(delivery):null,pending:bridge.pending.length});
 }
 function balances(){
  const foodIncome=world.kitchen.ledger.foodIncome-baseline.food,cocoaIncome=world.festival.cocoa.gross-baseline.cocoa,rideIncome=world.hayride.income-baseline.ride;
  const totalRevenue=foodIncome+cocoaIncome+rideIncome+harvestIncome;
  return {coins:world.coins,earned:world.earned,foodIncome,cocoaIncome,rideIncome,harvestIncome,totalRevenue,guestSpend,initialCoins:baseline.coins,initialEarned:baseline.earned,coinIncrease:world.coins-baseline.coins,ledgerBalanced:Math.abs(world.coins-baseline.coins-totalRevenue)<1e-6&&Math.abs(world.earned-baseline.earned-totalRevenue)<1e-6&&Math.abs(guestSpend-foodIncome-cocoaIncome-rideIncome)<1e-6};
 }
 function view(){const v=festival();return {festival:v,outbox:copy(v.outbox),balances:balances(),ledger:copy(ledger),guests:copy(guests),lastResult:copy(lastResult),deferred,selectedTheme,disclosure:DISCLOSURE};}
 function snapshot(){return json({format:'festival-host-lab',version:1,game:saveData(world),bridge:api.save(bridge),lab:{selectedTheme,deferred,ledger,guests,nextLedger,baseline,harvestIncome,guestSpend,lastOutcome,bedInstance}});}
 function restore(raw){
  const reject=reason=>result(false,reason,{compatible:false,warnings:['Current private lab was preserved.']});
  if(!raw||typeof raw!=='object'||raw.format!=='festival-host-lab'||raw.version!==1)return reject('unsupported-lab-snapshot');
  if(!raw.game||raw.game.version!==STATE_VERSION||!Array.isArray(raw.game.plots)||raw.game.plots.length!==world.plots.length)return reject('invalid-game-snapshot');
  const restored=api.restore(raw.bridge);if(!restored.compatible||!restored.state)return reject('incompatible-bridge');
  const m=raw.lab;
  if(restored.state.festival.active&&restored.state.festival.active.themeId!==m?.selectedTheme)return reject('inconsistent-selected-evening');
  if(!m||!themes.has(m.selectedTheme)||typeof m.deferred!=='boolean'||!Array.isArray(m.ledger)||m.ledger.length>MAX_ROWS||!Array.isArray(m.guests)||m.guests.length>MAX_ROWS||!Number.isSafeInteger(m.nextLedger)||m.nextLedger<1||!m.baseline||!Object.values(m.baseline).every(money)||!money(m.harvestIncome)||!money(m.guestSpend)||typeof m.bedInstance!=='string')return reject('invalid-lab-metadata');
  if(m.ledger.some(r=>!r||!['food','cocoa','harvest','hayride'].includes(r.kind)||!money(r.amount)||!Number.isSafeInteger(r.quantity)||r.quantity<1||!Number.isSafeInteger(r.serial)||r.serial<1||!finite(r.at))||m.guests.some(g=>!g||typeof g.id!=='string'||!finite(g.budget)||!finite(g.initialBudget)||g.budget>g.initialBudget||g.spent!==g.initialBudget-g.budget))return reject('invalid-lab-ledger');
  const normalizedLast=m.lastOutcome===null?null:cleanOutcome(m.lastOutcome);if(m.lastOutcome!==null&&!normalizedLast)return reject('invalid-replay-evidence');
  const nextWorld=restoreState(raw.game),old={world,bridge,selectedTheme,deferred,ledger,guests,nextLedger,baseline,harvestIncome,guestSpend,lastOutcome,bedInstance};
  world=nextWorld;bridge=restored.state;selectedTheme=m.selectedTheme;deferred=m.deferred;ledger=copy(m.ledger);guests=copy(m.guests);nextLedger=m.nextLedger;baseline=copy(m.baseline);harvestIncome=m.harvestIncome;guestSpend=m.guestSpend;lastOutcome=normalizedLast;bedInstance=m.bedInstance;
  if(!balances().ledgerBalanced||!world.estate.placed.some(p=>p.instance===bedInstance&&p.id==='vegetable-bed')){
   ({world,bridge,selectedTheme,deferred,ledger,guests,nextLedger,baseline,harvestIncome,guestSpend,lastOutcome,bedInstance}=old);return reject('inconsistent-lab-snapshot');
  }
  // Reassert only the documented single-guest fixture policy after the real
  // restorer clamps invitation timers. No money, stock or paid visit is reset.
  world.arriving=[];world.hayride.guestTimer=1e12;
  return result(true,'lab-restored',{compatible:true,warnings:copy(restored.warnings)});
 }
 return {
  prepare,start:()=>command({type:'start'}),pause:()=>command({type:'pause'}),resume:()=>command({type:'resume'}),end:()=>command({type:'end'}),claim:themeId=>command({type:'claim',themeId:themeId??selectedTheme}),flush,
  serveFood,serveCocoa,harvest,runRide,replayLast,snapshot,restore,view,
  setDeferred(value){if(typeof value!=='boolean')return result(false,'invalid-deferred');deferred=value;return result(true,'delivery-mode-changed');},
  setWorldPaused(value){if(typeof value!=='boolean')return result(false,'invalid-pause');world.paused=value;return result(true,value?'game-paused':'game-resumed');},
  get world(){return world;},get bridge(){return bridge;},get bridgeAPI(){return api;}
 };
}
