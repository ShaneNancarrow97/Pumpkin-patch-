import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFestivalBridge } from '../src/bridge.js';

const definitions=JSON.parse(fs.readFileSync(new URL('../../late-game-support/data/festival-themes.json',import.meta.url),'utf8'));
const COURT='midnight-court-banquet';
const context={level:18,houseLevel:3,kitchenPurchased:true,kitchenCapabilities:['hob','pot','oven','tray','spice'],knownRecipes:[...new Set(definitions.themes.flatMap(t=>t.recipeIds))],visitorEventIds:['vip','rush'],cocoaTier:3,gardenDecorIds:[],attractions:{'hollow-house':{ready:true,tier:5,open:true},hayride:{ready:true,tier:3,routeLevel:2,open:true}},paused:false};
const api=createFestivalBridge(definitions);
const apply=(a,s,c,ctx=context)=>{const result=a.dispatch(s,c,ctx);assert.equal(result.accepted,true,result.reason);return result.state;};
function running(a=api){let s=a.createState({namespace:'bridge-adversarial'});s=apply(a,s,{type:'prepare',themeId:COURT});return apply(a,s,{type:'start'});}
function bound(a,s){const result=a.bind(s,context);assert.equal(result.accepted,true,result.reason);assert.ok(result.binding);return result;}
const food=(binding,id='food:1',more={})=>({...binding,id,kind:'food-sale',source:'food',guestId:'visitor:0',recipeId:'haunted-pie',quantity:2,amount:44,...more});
const value=(a,s,id='court-supper')=>a.view(s,context).active.goals.find(g=>g.id===id).value;
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;};

test('bindings carry the originating session and allocate identities only in active unpaused windows',()=>{
 const fresh=api.createState({namespace:'binding'});
 const idle=api.bind(fresh,context);assert.equal(idle.accepted,false);assert.equal(idle.binding,null);assert.deepEqual(idle.state,fresh);
 let state=apply(api,fresh,{type:'prepare',themeId:COURT});
 const preparing=bound(api,state);assert.equal(preparing.binding.window,'preparation');state=preparing.state;
 state=apply(api,state,{type:'start'});const service=bound(api,state);
 assert.equal(service.binding.window,'service');assert.equal(service.binding.sessionId,state.festival.active.id);
 assert.notEqual(service.binding.id,preparing.binding.id);assert.equal(service.state.nextSerial,state.nextSerial+1);
 assert.equal(api.bind(service.state,{...context,paused:true}).accepted,false);
 state=apply(api,service.state,{type:'pause'});assert.equal(api.bind(state,context).accepted,false);
});

test('queue ingestion detaches facts and strips incidental world data',()=>{
 const {state,binding}=bound(api,running());
 const fact=food(binding,'food:detached',{irrelevantWorld:{coins:9999}});
 const queued=api.enqueue(freeze(state),fact);assert.equal(queued.accepted,true);
 fact.quantity=999;fact.irrelevantWorld.coins=0;
 assert.equal(queued.state.pending[0].quantity,2);assert.equal('irrelevantWorld' in queued.state.pending[0],false);
 assert.equal(state.pending.length,0);
 const saved=api.save(queued.state);saved.pending[0].quantity=99;
 assert.equal(queued.state.pending[0].quantity,2);
});

test('exact pending replay coalesces while a changed payload preserves the original fact',()=>{
 const {state,binding}=bound(api,running());const fact=food(binding);
 const first=api.enqueue(state,fact);assert.equal(first.accepted,true);
 const duplicate=api.enqueue(first.state,structuredClone(fact));
 assert.equal(duplicate.accepted,true);assert.equal(duplicate.changed,false);assert.equal(duplicate.reason,'already-queued');assert.equal(duplicate.state.pending.length,1);
 const conflict=api.enqueue(first.state,{...fact,quantity:12,cohort:'midnight-court'});
 assert.equal(conflict.accepted,false);assert.equal(conflict.reason,'conflicting-outcome');assert.equal(conflict.state.pending[0].quantity,2);
});

test('bounded backpressure returns the original paid fact for retry without losing queued facts',()=>{
 const small=createFestivalBridge(definitions,{capacity:2});let {state,binding}=bound(small,running(small));
 state=small.enqueue(state,food(binding,'food:1')).state;state=small.enqueue(state,food(binding,'food:2')).state;
 const third=food(binding,'food:3');const full=small.enqueue(state,third);
 assert.equal(full.accepted,false);assert.equal(full.reason,'queue-full');assert.deepEqual(full.retryOutcome,third);assert.notStrictEqual(full.retryOutcome,third);
 assert.deepEqual(full.state,state);assert.equal(small.view(state).outbox.free,0);
 const flushed=small.flush(state,context);assert.equal(flushed.delivered.length,2);assert.equal(flushed.held,0);assert.equal(value(small,flushed.state),4);
 const retried=small.enqueue(flushed.state,full.retryOutcome);assert.equal(retried.accepted,true);
 const final=small.flush(retried.state,context);assert.equal(value(small,final.state),6);assert.equal(final.state.pending.length,0);
});

test('manual and whole-world pause preserve queued confirmation facts and elapsed time',()=>{
 let {state,binding}=bound(api,running());state=api.enqueue(state,food(binding)).state;
 const global=api.flush(freeze(state),{...context,paused:true});assert.equal(global.held,1);assert.deepEqual(global.state,state);assert.deepEqual(global.delivered,[]);
 state=apply(api,state,{type:'pause'});const manual=api.flush(state,context);
 assert.equal(manual.held,1);assert.equal(value(api,manual.state),0);assert.equal(manual.state.festival.active.elapsedSeconds,0);
 state=apply(api,manual.state,{type:'resume'});const final=api.flush(state,context);assert.equal(value(api,final.state),2);assert.equal(final.delivered.length,1);
});

test('a saved pending queue reloads paused, drains once, and survives exact fact replay',()=>{
 let {state,binding}=bound(api,running());const fact=food(binding);
 state=api.enqueue(state,fact).state;
 const raw=api.save(state);assert.equal(raw.festival.active.phase,'paused');assert.equal(state.festival.active.phase,'running');
 const parsed=api.restore(JSON.parse(JSON.stringify(raw)));assert.equal(parsed.compatible,true);assert.equal(parsed.state.pending.length,1);
 assert.equal(api.flush(parsed.state,context).held,1);
 state=apply(api,parsed.state,{type:'resume'});state=api.flush(state,context).state;assert.equal(value(api,state),2);
 state=api.enqueue(state,fact).state;const replayed=api.flush(state,context);
 assert.equal(replayed.rejected.length,0);assert.equal(value(api,replayed.state),2);assert.equal(replayed.state.pending.length,0);
});

test('ending with pending outcomes requires an explicit drain or explicit discard',()=>{
 let {state,binding}=bound(api,running());state=api.enqueue(state,food(binding)).state;
 const blocked=api.dispatch(state,{type:'end'},context);assert.equal(blocked.accepted,false);assert.equal(blocked.reason,'pending-outcomes');assert.deepEqual(blocked.state,state);
 const ended=api.dispatch(state,{type:'end',discardPending:true},context);assert.equal(ended.accepted,true);assert.equal(ended.state.pending.length,0);assert.equal(ended.state.festival.active,null);
 assert.deepEqual(ended.state.festival.completedThemes,[]);assert.deepEqual(ended.state.festival.claimedRewards,[]);
});

test('only literal discardPending true authorizes abandoning confirmed queued facts',()=>{
 let {state,binding}=bound(api,running());state=api.enqueue(state,food(binding)).state;
 for(const discardPending of ['false','true',1,[],{}]){
  const result=api.dispatch(state,{type:'end',discardPending},context);
  assert.equal(result.accepted,false);assert.equal(result.reason,'pending-outcomes');assert.deepEqual(result.state,state);
 }
});

test('old session facts remain old after ending and preparing the same evening again',()=>{
 let {state,binding}=bound(api,running());const old=food(binding);
 state=apply(api,state,{type:'end'});state=apply(api,state,{type:'prepare',themeId:COURT});state=apply(api,state,{type:'start'});
 assert.notEqual(state.festival.active.id,old.sessionId);
 const queued=api.enqueue(state,old);assert.equal(queued.accepted,true);
 const flushed=api.flush(queued.state,context);assert.equal(flushed.rejected.length,1);assert.equal(flushed.rejected[0].reason,'old-session');assert.equal(value(api,flushed.state),0);
});

test('binding serials do not restart after save or after replacement evenings',()=>{
 let {state,binding:first}=bound(api,running());
 const restored=api.restore(api.save(state));assert.equal(restored.compatible,true);state=restored.state;
 state=apply(api,state,{type:'resume'});let result=bound(api,state);state=result.state;assert.notEqual(result.binding.id,first.id);
 state=apply(api,state,{type:'end'});state=apply(api,state,{type:'prepare',themeId:COURT});state=apply(api,state,{type:'start'});
 result=bound(api,state);assert.notEqual(result.binding.id,first.id);assert.ok(result.state.nextSerial>state.nextSerial);
});

test('outcomes cannot bypass the durable queue through lifecycle dispatch',()=>{
 const {state,binding}=bound(api,running());const result=api.dispatch(state,{type:'outcome',event:food(binding)},context);
 assert.equal(result.accepted,false);assert.equal(result.reason,'use-enqueue');assert.equal(value(api,result.state),0);
});

test('unknown bridge or inner-engine schema is incompatible rather than silently reset',()=>{
 const state=running();
 for(const target of ['bridge','engine']){
  const raw=api.save(state);if(target==='bridge')raw.version=2;else raw.festival.version=2;
  const before=structuredClone(raw),result=api.restore(raw);
  assert.equal(result.compatible,false);assert.equal(result.state,null);assert.ok(result.warnings.length);assert.deepEqual(raw,before);
 }
});

test('a present bridge document missing its inner festival state cannot silently create a replacement',()=>{
 for(const festival of [undefined,null]){
  const raw=api.save(running());if(festival===undefined)delete raw.festival;else raw.festival=festival;
  const result=api.restore(raw);assert.equal(result.compatible,false);assert.equal(result.state,null);assert.ok(result.warnings.length);
 }
});

test('malformed or oversized saved pending data is not turned into credited progress',()=>{
 const {state,binding}=bound(api,running());const valid=api.enqueue(state,food(binding)).state;
 for(const pending of [null,[{kind:'unknown'}],[{...food(binding),quantity:NaN}],[{...food(binding),amount:0}]]){
  const raw=api.save(valid);raw.pending=pending;const result=api.restore(raw);
  assert.equal(result.compatible,false);assert.equal(result.state,null);
 }
 const small=createFestivalBridge(definitions,{capacity:1});const raw=api.save(api.enqueue(valid,food(binding,'food:2')).state);
 const lowered=small.restore(raw);assert.equal(lowered.compatible,false);assert.equal(lowered.state,null);
});

test('saved exact duplicates may coalesce but conflicting duplicates are not silently replaced',()=>{
 const {state,binding}=bound(api,running());const valid=api.enqueue(state,food(binding)).state;
 const exact=api.save(valid);exact.pending.push(structuredClone(exact.pending[0]));const restored=api.restore(exact);
 assert.equal(restored.compatible,true);assert.equal(restored.state.pending.length,1);assert.ok(restored.warnings.length);
 const changed=api.save(valid);changed.pending.push({...changed.pending[0],quantity:12});const conflict=api.restore(changed);
 assert.equal(conflict.compatible,false);assert.equal(conflict.state,null);
});

test('a corrupt serial cannot reuse an outstanding cocoa fact identity',()=>{
 let {state,binding}=bound(api,running());
 state=api.enqueue(state,{...binding,kind:'cocoa-sale',source:'cocoa',guestId:'visitor:0',lines:[{productId:'cocoa',quantity:1}],amount:4}).state;
 const raw=api.save(state);raw.nextSerial=1;const restored=api.restore(raw);
 if(!restored.compatible){assert.equal(restored.state,null);return;}
 state=apply(api,restored.state,{type:'resume'});const next=bound(api,state);
 assert.notEqual(next.binding.id,binding.id);assert.ok(next.state.nextSerial>raw.nextSerial);
});

test('bad normalized inputs never modify a valid existing queue',()=>{
 const {state,binding}=bound(api,running());const queued=api.enqueue(state,food(binding)).state;
 for(const invalid of [null,{},food(binding,'food:bad',{quantity:-1}),food(binding,'food:bad',{guestId:0}),food(binding,'food:bad',{source:'unknown'}),food(binding,'food:bad',{amount:Infinity})]){
  const result=api.enqueue(freeze(queued),invalid);assert.equal(result.accepted,false);assert.deepEqual(result.state,queued);
 }
});

test('corrupt active progress cannot retag preserved pending facts into its replacement evening',()=>{
 let state=running();
 // Earn a genuine Court entitlement through public queue/lifecycle commands.
 for(let i=0;i<4;i++){
  const binding=bound(api,state);state=binding.state;
  state=api.enqueue(state,food(binding.binding,'food:court-'+i,{guestId:'visitor:'+i,cohort:'midnight-court',quantity:3,amount:66})).state;
 }
 for(let i=0;i<12;i++){
  const binding=bound(api,state);state=binding.state;
  state=api.enqueue(state,{...binding.binding,id:'hollow-'+i,kind:'attraction-completed',source:'hollow-house',guestId:'visitor:'+i,paid:true,paidAmount:6,queueSecondsAtBoarding:1}).state;
 }
 state=api.flush(state,context).state;state=apply(api,state,{type:'end'});state=apply(api,state,{type:'claim',themeId:COURT});
 state=apply(api,state,{type:'prepare',themeId:'lanterns-in-the-mist'});state=apply(api,state,{type:'start'});
 const origin=bound(api,state);state=origin.state;
 state=api.enqueue(state,food(origin.binding,'food:later',{recipeId:'harvest-broth'})).state;
 const raw=api.save(state);raw.festival.active.themeSignature='broken-config';
 const restored=api.restore(raw);assert.equal(restored.compatible,true);assert.ok(restored.warnings.length);
 assert.equal(restored.state.festival.active,null);assert.equal(restored.state.pending.length,1);assert.equal(restored.state.festival.claimedRewards.length,1);
 state=apply(api,restored.state,{type:'prepare',themeId:'lanterns-in-the-mist'});state=apply(api,state,{type:'start'});
 const delivered=api.flush(state,context);assert.equal(delivered.rejected.length,1);assert.equal(delivered.rejected[0].reason,'old-session');
 assert.equal(delivered.state.festival.claimedRewards.length,1);assert.ok(api.view(delivered.state,context).active.goals.every(g=>g.value===0));
});

test('identity exhaustion and unsafe capacity are explicit failures, never serial wraparound',()=>{
 for(const capacity of [0,-1,2049,Infinity,NaN,1.2])assert.throws(()=>createFestivalBridge(definitions,{capacity}),RangeError);
 const state=running();state.nextSerial=Number.MAX_SAFE_INTEGER-1;
 const result=api.bind(state,context);assert.equal(result.accepted,false);assert.equal(result.reason,'serial-limit');assert.equal(result.binding,null);assert.deepEqual(result.state,state);
});
