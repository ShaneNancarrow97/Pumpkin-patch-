import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFestivalBridge } from '../src/bridge.js';

const definitions=JSON.parse(fs.readFileSync(new URL('../../late-game-support/data/festival-themes.json',import.meta.url)));
const context={level:18,houseLevel:3,kitchenPurchased:true,kitchenCapabilities:['hob','pot','oven','tray','spice'],knownRecipes:definitions.themes.flatMap(t=>t.recipeIds),visitorEventIds:['vip','rush'],cocoaTier:3,gardenDecorIds:[],attractions:{'hollow-house':{ready:true,tier:5,open:true},hayride:{ready:true,tier:3,routeLevel:2,open:true}}};
function started(bridge){let s=bridge.createState({namespace:'bridge-test'});s=bridge.dispatch(s,{type:'prepare',themeId:'midnight-court-banquet'},context).state;return bridge.dispatch(s,{type:'start'},context).state;}
function food(s,id='paid-food-1'){return {id,sessionId:s.festival.active.id,window:'service',kind:'food-sale',source:'food',guestId:'visitor:0',cohort:'midnight-court',recipeId:'haunted-pie',quantity:3,amount:66};}
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};

test('queued real facts are separate from credited progress until explicit delivery',()=>{
 const b=createFestivalBridge(definitions);let s=started(b);
 const event=food(s),before=structuredClone(s);const queued=b.enqueue(s,event);s=queued.state;
 assert.equal(queued.accepted,true);assert.deepEqual(before.pending,[]);assert.equal(b.view(s).active.goals[0].value,0);
 event.quantity=100;assert.equal(s.pending[0].quantity,3);
 const delivered=b.flush(s,context);assert.equal(delivered.delivered.length,1);assert.equal(delivered.held,0);assert.deepEqual(delivered.rejected,[]);
 assert.equal(b.view(delivered.state).active.goals[0].value,3);assert.equal(b.view(delivered.state).active.goals[2].value,1);
 assert.equal(Object.hasOwn(delivered.state,'coins'),false);assert.equal(s.pending.length,1);
});
test('bindings retain origin while outcome IDs increase and all operations accept frozen state',()=>{
 const b=createFestivalBridge(definitions);const s=freeze(started(b));
 const one=b.bind(s,context),two=b.bind(one.state,context);
 assert.equal(one.binding.sessionId,s.festival.active.id);assert.equal(one.binding.window,'service');assert.notEqual(one.binding.id,two.binding.id);assert.equal(s.nextSerial,1);
 const e=freeze(food(s));const q=b.enqueue(s,e);assert.equal(q.accepted,true);assert.equal(b.flush(freeze(q.state),context).delivered.length,1);
});
test('full queues preserve the original fact for retry, never perform another transaction',()=>{
 const b=createFestivalBridge(definitions,{capacity:1});let s=started(b);
 s=b.enqueue(s,food(s)).state;const second=food(s,'paid-food-2');const r=b.enqueue(s,second);
 assert.equal(r.accepted,false);assert.equal(r.reason,'queue-full');assert.strictEqual(r.state,s);assert.deepEqual(r.retryOutcome,second);
 s=b.flush(s,context).state;s=b.enqueue(s,r.retryOutcome).state;s=b.flush(s,context).state;
 assert.equal(b.view(s).active.goals[0].value,6);assert.equal(b.view(s).active.goals[2].value,1);
});
test('end requires an explicit decision for confirmed outcomes still waiting in the outbox',()=>{
 const b=createFestivalBridge(definitions);let s=started(b);s=b.enqueue(s,food(s)).state;
 const guarded=b.dispatch(s,{type:'end'},context);assert.equal(guarded.reason,'pending-outcomes');assert.strictEqual(guarded.state,s);
 const abandoned=b.dispatch(s,{type:'end',discardPending:true},context);assert.equal(abandoned.accepted,true);assert.equal(abandoned.state.pending.length,0);assert.equal(abandoned.state.festival.active,null);
 assert.ok(abandoned.effects.some(e=>e.type==='festival-outcomes-discarded'&&e.count===1));assert.deepEqual(abandoned.state.festival.claimedRewards,[]);
});
test('unknown schemas and conflicting saved facts preserve the payload for explicit migration',()=>{
 const b=createFestivalBridge(definitions);let s=started(b);s=b.enqueue(s,food(s)).state;
 const snapshot=b.save(s),future={...snapshot,version:2};const copy=structuredClone(future);
 assert.equal(b.restore(future).compatible,false);assert.deepEqual(future,copy);
 const conflict=structuredClone(snapshot);conflict.pending.push({...conflict.pending[0],quantity:4});assert.equal(b.restore(conflict).compatible,false);
 const missing=structuredClone(snapshot);delete missing.festival;assert.equal(b.restore(missing).compatible,false);
 const duplicate=structuredClone(snapshot);duplicate.pending.push({...duplicate.pending[0]});const restored=b.restore(duplicate);assert.equal(restored.compatible,true);assert.equal(restored.state.pending.length,1);assert.ok(restored.warnings.length>0);
});
test('a smaller configured capacity never truncates confirmed facts while restoring',()=>{
 const b=createFestivalBridge(definitions);let s=started(b);s=b.enqueue(s,food(s)).state;s=b.enqueue(s,food(s,'second')).state;
 const snapshot=b.save(s),small=createFestivalBridge(definitions,{capacity:1});const r=small.restore(snapshot);
 assert.equal(r.compatible,false);assert.equal(r.state,null);assert.equal(snapshot.pending.length,2);
 for(const capacity of [0,1.5,4096,NaN])assert.throws(()=>createFestivalBridge(definitions,{capacity}),RangeError);
});
