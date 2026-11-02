import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanOutcome,foodOutcome,cocoaOutcome,gardenOutcome,ticketOutcome,captureHayrideDeparture,hayrideCompletionOutcome,mazeCompletionOutcome,departureOutcome} from '../adapters/outcomes.js';

const binding=(id='bound-1',sessionId='host:1',window='service')=>({id,sessionId,window});
const identity=(id=0,namespace='visitor',extras={})=>({namespace,guest:{id,...extras}});
const foodReceipt=()=>({id:3,recipe:'haunted-pie',quantity:3,amount:66,at:12});
function departed(){
 const receipt={visitId:'hayride-0',runId:'hayride-run-0',visitor:0,seat:0,berth:0,amount:12,at:9};
 const visitor={id:0,hayride:{visitId:receipt.visitId,runId:receipt.runId,charged:true,ticket:12,seat:0,berth:0,phase:'riding',waited:44.5,done:false}};
 return {convoy:{runId:receipt.runId,routeLevel:1,phase:'departing',manifest:[receipt]},visitors:[visitor]};
}

test('actual food quantities use original stable receipt identity across retries and bindings',()=>{
 const receipt=foodReceipt(),who=identity(0,'customer',{courtier:true});
 const first=foodOutcome(binding(),receipt,who),retry=foodOutcome(binding('new-binding'),receipt,who);
 assert.equal(first.id,'food:3');assert.equal(first.quantity,3);assert.equal(first.guestId,'customer:0');assert.equal(first.cohort,'midnight-court');
 assert.deepEqual(first,retry);assert.equal(first.sessionId,'host:1');
 receipt.quantity=8;who.guest.courtier=false;assert.equal(first.quantity,3);assert.equal(first.cohort,'midnight-court');
 const newer=foodOutcome(binding('fresh','host:2'),foodReceipt(),identity());assert.equal(newer.id,first.id);assert.equal(newer.sessionId,'host:2');
});

test('failed commits, generic quantity-zero sale notifications and malformed food receipts do not count',()=>{
 assert.equal(foodOutcome(binding(),null,identity()),null);
 for(const change of [{quantity:0},{quantity:9},{quantity:NaN},{amount:0},{amount:Infinity},{id:-1},{at:undefined},{recipe:''}])assert.equal(foodOutcome(binding(),{...foodReceipt(),...change},identity()),null);
 assert.equal(foodOutcome(binding('pre','host:1','preparation'),foodReceipt(),identity()),null);
 assert.equal(foodOutcome(binding(),foodReceipt(),identity(-1)),null);
});

test('guest number spaces remain distinct and the ordinary rich guest is not a Court patron',()=>{
 const a=foodOutcome(binding(),foodReceipt(),identity(0,'visitor',{vip:true,kind:999}));
 const b=foodOutcome(binding(),foodReceipt(),identity(0,'customer',{courtier:true}));
 assert.equal(a.guestId,'visitor:0');assert.equal(a.cohort,'regular');assert.equal(b.guestId,'customer:0');assert.equal(b.cohort,'midnight-court');
 assert.equal(foodOutcome(binding(),foodReceipt(),identity(0,'unknown')),null);
});

test('paid cocoa preserves separate drink/snack identities and reconciles the actual order sum',()=>{
 const items=[{id:'deluxe',price:7},{id:'smores',price:5}];
 const fact=cocoaOutcome(binding(),{amount:12,items},identity());
 assert.deepEqual(fact.lines,[{productId:'deluxe',quantity:1},{productId:'smores',quantity:1}]);assert.equal(fact.amount,12);assert.equal(fact.id,'bound-1');
 items[0].id='cocoa';assert.equal(fact.lines[0].productId,'deluxe');
 assert.equal(cocoaOutcome(binding(),{amount:0,items},identity()),null);
 assert.equal(cocoaOutcome(binding(),{amount:11,items},identity()),null);
 assert.equal(cocoaOutcome(binding(),{amount:14,items:[{id:'deluxe',price:7},{id:'deluxe',price:7}]},identity()),null);
 assert.equal(cocoaOutcome(binding(),{amount:7,items:['deluxe']},identity()),null);
});

test('garden facts count confirmed harvested quantity including genuine full-pantry overflow',()=>{
 const b=binding('pick-1','host:1','preparation');
 const result={yields:'vegetables',amount:4,pantry:0,sold:4,coins:12};
 const fact=gardenOutcome(b,{bedId:'vegetable-bed',result});
 assert.equal(fact.quantity,4);assert.equal(fact.id,'pick-1');assert.equal(fact.window,'preparation');
 assert.equal(gardenOutcome(b,{bedId:'vegetable-bed',result:false}),null);
 assert.equal(gardenOutcome(b,{bedId:'vegetable-bed',result:{...result,pantry:1}}),null);
 assert.equal(gardenOutcome(b,{bedId:'vegetable-bed',result:{...result,amount:0,sold:0,coins:0}}),null);
 assert.equal(gardenOutcome(b,{bedId:'vegetable-bed',result:{amount:4}}),null);
});

test('confirmed ticket IDs are stable and joined to the correct charged guest',()=>{
 const {convoy}=departed(),receipt=convoy.manifest[0];
 const fact=ticketOutcome(binding(),{source:'hayride',receipt},identity());
 assert.equal(fact.id,'hayride-0');assert.equal(fact.kind,'ticket-sale');assert.equal(fact.amount,12);
 assert.deepEqual(ticketOutcome(binding('again'),{source:'hayride',receipt},identity()),fact);
 assert.equal(ticketOutcome(binding(),{source:'hayride',receipt},identity(1)),null);
 assert.equal(ticketOutcome(binding(),{source:'hayride',receipt:{...receipt,amount:0}},identity()),null);
 assert.equal(ticketOutcome(binding(),{source:'hayride',receipt:{visitId:'hayride-0',visitor:0,amount:12}},identity()),null);
 const maze=ticketOutcome(binding(),{source:'hollow-house',receipt:{visitId:'hollow-0',visitor:0,amount:6,at:9}},identity());
 assert.equal(maze.id,'hollow-0');assert.equal(maze.source,'hollow-house');
});

test('departure snapshot freezes paid manifest, original route and preboarding wait without live references',()=>{
 const source=departed(),snapshot=captureHayrideDeparture(source);
 assert.equal(snapshot.routeLevelAtDeparture,1);assert.equal(snapshot.passengers[0].queueSecondsAtBoarding,44.5);assert.equal(snapshot.passengers[0].guestId,'visitor:0');
 assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot.passengers[0]),true);
 source.convoy.routeLevel=2;source.convoy.manifest[0].amount=20;source.visitors[0].hayride.waited=0;
 assert.equal(snapshot.routeLevelAtDeparture,1);assert.equal(snapshot.passengers[0].paidAmount,12);assert.equal(snapshot.passengers[0].queueSecondsAtBoarding,44.5);
});

test('inconsistent or unpaid departure evidence cannot produce a snapshot',()=>{
 for(const edit of [
  x=>{x.convoy.phase='loading';},x=>{x.convoy.routeLevel=3;},x=>{x.convoy.manifest[0].runId='hayride-run-1';},
  x=>{x.visitors[0].hayride.charged=false;},x=>{x.visitors[0].hayride.ticket=9;},x=>{x.visitors[0].hayride.seat=1;},
  x=>{x.visitors[0].hayride.done=true;},x=>{x.visitors[0].hayride.waited=NaN;},
  x=>{x.convoy.manifest.push({...x.convoy.manifest[0]});},x=>{x.visitors.push({...x.visitors[0]});}
 ]){const source=departed();edit(source);assert.equal(captureHayrideDeparture(source),null);}
 assert.equal(captureHayrideDeparture({convoy:{phase:'departing'},visitors:[]}),null);
});

test('completion requires completed unloading, original paid passenger and captured route evidence',()=>{
 const snapshot=captureHayrideDeparture(departed()),b=binding('completion','old-session:1');
 assert.equal(hayrideCompletionOutcome(b,snapshot,{visitId:'hayride-0',completed:false},identity()),null);
 const fact=hayrideCompletionOutcome(b,snapshot,{visitId:'hayride-0',completed:true},identity());
 assert.equal(fact.kind,'attraction-completed');assert.equal(fact.id,'hayride-0');assert.equal(fact.routeLevelAtDeparture,1);assert.equal(fact.queueSecondsAtBoarding,44.5);assert.equal(fact.sessionId,'old-session:1');
 assert.equal(hayrideCompletionOutcome(b,snapshot,{visitId:'hayride-1',completed:true},identity()),null);
 assert.equal(hayrideCompletionOutcome(b,snapshot,{visitId:'hayride-0',completed:true},identity(1)),null);
 assert.equal(hayrideCompletionOutcome(b,{...snapshot,version:2},{visitId:'hayride-0',completed:true},identity()),null);
 assert.deepEqual(hayrideCompletionOutcome(binding('other',b.sessionId),JSON.parse(JSON.stringify(snapshot)),{visitId:'hayride-0',completed:true},identity()),fact);
});

test('maze facts require explicit paid completion and do not re-read a repeated visit ID',()=>{
 const guest=identity(0,'visitor');guest.guest.hollow={visitId:'hollow-1'};
 const completed={visitId:'hollow-0',charged:true,amount:6,completed:true,queueSecondsAtBoarding:12};
 const fact=mazeCompletionOutcome(binding(),completed,guest);assert.equal(fact.id,'hollow-0');assert.equal(fact.paid,true);
 assert.equal(mazeCompletionOutcome(binding(),{...completed,charged:false},guest),null);
 assert.equal(mazeCompletionOutcome(binding(),{...completed,completed:false},guest),null);
 assert.equal(mazeCompletionOutcome(binding(),{...completed,amount:0},guest),null);
});

test('final departure is explicit and never inferred from frightened flags or disappearance',()=>{
 const who=identity(0,'visitor',{hayride:{done:true,fleeing:true}});
 assert.equal(departureOutcome(binding(),{happiness:95},who),null);
 assert.equal(departureOutcome(binding(),{final:false,outcome:'normal',happiness:95},who),null);
 const frightened=departureOutcome(binding(),{final:true,outcome:'frightened',happiness:90},who);
 assert.equal(frightened.outcome,'frightened');assert.equal(frightened.id,'bound-1');
 assert.equal(departureOutcome(binding(),{final:true,outcome:'normal',happiness:0},who).happiness,0);
 assert.equal(departureOutcome(binding(),{final:true,outcome:'normal',happiness:101},who),null);
});

test('queue cleaner only retains bounded official data and rejects malformed/future kinds',()=>{
 const original={...foodOutcome(binding(),foodReceipt(),identity()),privateToken:'must not copy',guest:{id:99}};
 const fact=cleanOutcome(original);assert.equal(Object.hasOwn(fact,'privateToken'),false);assert.equal(Object.hasOwn(fact,'guest'),false);
 const cocoa={...cocoaOutcome(binding(),{amount:4,items:[{id:'cocoa',price:4}]},identity()),lines:[{productId:'cocoa',quantity:1,extra:'discard'}]};
 const cleaned=cleanOutcome(cocoa);assert.deepEqual(cleaned.lines,[{productId:'cocoa',quantity:1}]);cocoa.lines[0].quantity=4;assert.equal(cleaned.lines[0].quantity,1);
 for(const change of [{kind:'future-kind'},{id:''},{id:'x'.repeat(161)},{sessionId:'x'.repeat(101)},{guestId:'0'},{source:'other'},{quantity:Infinity},{quantity:1e6+1},{amount:NaN},{window:'preparation'},{cohort:'rich'}])assert.equal(cleanOutcome({...original,...change}),null);
 assert.equal(cleanOutcome({...cocoa,lines:Array.from({length:33},()=>({productId:'cocoa',quantity:1}))}),null);
});

test('missing or non-record adapter inputs return null instead of throwing',()=>{
 for(const input of [undefined,null,[],false,'receipt',3]){
  assert.equal(cleanOutcome(input),null);
  assert.equal(foodOutcome(binding(),input,identity()),null);
  assert.equal(cocoaOutcome(binding(),input,identity()),null);
  assert.equal(gardenOutcome(binding(),input),null);
  assert.equal(ticketOutcome(binding(),input,identity()),null);
  assert.equal(captureHayrideDeparture(input),null);
  assert.equal(hayrideCompletionOutcome(binding(),captureHayrideDeparture(departed()),input,identity()),null);
  assert.equal(mazeCompletionOutcome(binding(),input,identity()),null);
  assert.equal(departureOutcome(binding(),input,identity()),null);
 }
});
