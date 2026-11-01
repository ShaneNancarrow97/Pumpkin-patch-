import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFestivalEngine } from '../src/engine.js';

const definitions=JSON.parse(fs.readFileSync(new URL('../../late-game-support/data/festival-themes.json',import.meta.url)));
const engine=createFestivalEngine(definitions);
const context={level:18,houseLevel:3,kitchenPurchased:true,kitchenCapabilities:['hob','pot','oven','tray','spice'],knownRecipes:definitions.themes.flatMap(t=>t.recipeIds),visitorEventIds:['vip','rush'],cocoaTier:3,gardenDecorIds:[],attractions:{'hollow-house':{ready:true,tier:5,open:true},hayride:{ready:true,tier:3,routeLevel:2,open:true}}};
const step=(s,c,world=context)=>{const r=engine.reduce(s,c,world);assert.equal(r.accepted,true,r.reason);return r.state;};
function hosting(id){let s=engine.createState({namespace:'basic'});s=step(s,{type:'prepare',themeId:id});return step(s,{type:'start'});}
const emit=(s,e)=>step(s,{type:'outcome',event:{...engine.stamp(s),...e}});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

test('each evening has accessible preparation, clear current blockers and no mandatory garden',()=>{
 for(const theme of definitions.themes){
  assert.equal(engine.readiness(theme.id,context).ready,true);
  const locked=engine.readiness(theme.id,{...context,level:theme.level-1});
  assert.equal(locked.unlocked,false);assert.ok(locked.missing.some(r=>r.id==='level'));
 }
 const s=step(engine.createState(),{type:'prepare',themeId:'lanterns-in-the-mist'},{...context,kitchenPurchased:false});
 assert.equal(s.active.phase,'preparing');
 const blocked=engine.reduce(s,{type:'start'},{...context,kitchenPurchased:false});
 assert.equal(blocked.reason,'not-ready');assert.strictEqual(blocked.state,s);
 const closed=engine.readiness('the-last-wagon',{...context,attractions:{...context.attractions,hayride:{...context.attractions.hayride,open:false}}});
 assert.ok(closed.missing.some(r=>r.id==='open:hayride'));
});

test('transitions leave frozen state, commands, content and world context untouched',()=>{
 const original=freeze(engine.createState());const cmd=freeze({type:'prepare',themeId:'midnight-court-banquet'}),world=freeze(structuredClone(context));
 const next=engine.reduce(original,cmd,world);
 assert.notStrictEqual(next.state,original);assert.equal(original.active,null);assert.equal(next.state.active.id,'festival:1');
 assert.equal(next.state.nextSession,2);assert.equal(world.level,18);
});

test('one VIP food receipt contributes quantity and one patron, with no second wallet',()=>{
 let s=hosting('midnight-court-banquet');
 s=emit(s,{kind:'food-sale',source:'food',id:'food-1',guestId:'visitor:0',cohort:'midnight-court',recipeId:'haunted-pie',quantity:5,amount:110});
 const goals=engine.view(s).active.goals;
 assert.equal(goals.find(g=>g.id==='court-supper').value,5);assert.equal(goals.find(g=>g.id==='court-patrons').value,1);
 assert.equal(Object.hasOwn(s,'coins'),false);assert.equal(Object.hasOwn(s,'visitorBudget'),false);
});

test('cocoa excludes snacks and unrelated premium products from the selected drinks goal',()=>{
 let s=hosting('lanterns-in-the-mist');
 s=emit(s,{kind:'cocoa-sale',source:'cocoa',id:'order-4',guestId:'customer:0',amount:35,lines:[{productId:'cocoa',quantity:2},{productId:'deluxe',quantity:1},{productId:'smores',quantity:4},{productId:'flake',quantity:2}]});
 assert.equal(engine.view(s).active.goals.find(g=>g.id==='mist-warm-cups').value,3);
});

test('preparation harvests survive start without retroactively admitting service sales',()=>{
 let s=step(engine.createState(),{type:'prepare',themeId:'lanterns-in-the-mist'});
 const stamp=engine.stamp(s);
 s=emit(s,{kind:'garden-harvest',source:'garden',id:'bed-1-cycle-4',bedId:'vegetable-bed',quantity:8});
 assert.equal(engine.view(s).active.goals.find(g=>g.id==='mist-garden-basket').done,true);
 const rejected=engine.reduce(s,{type:'tick',seconds:30},context);
 assert.equal(rejected.accepted,false);assert.strictEqual(rejected.state,s);assert.equal(s.active.elapsedSeconds,0);
 s=step(s,{type:'start'});
 const oldSale={...stamp,id:'old-food',kind:'food-sale',source:'food',guestId:'visitor:1',recipeId:'harvest-broth',quantity:8,amount:80};
 assert.equal(engine.reduce(s,{type:'outcome',event:oldSale},context).reason,'outside-service');
 assert.equal(engine.view(s).active.goals.find(g=>g.id==='mist-garden-basket').value,8);
});

test('a long evening has no deadline or auto-failure and ending early has no penalty',()=>{
 let s=hosting('the-last-wagon');
 for(let i=0;i<120;i++)s=step(s,{type:'tick',seconds:60});
 assert.equal(engine.view(s).active.elapsedSeconds,7200);assert.equal(engine.view(s).active.phase,'running');
 s=step(s,{type:'end'});assert.equal(s.active,null);assert.deepEqual(s.claimedRewards,[]);assert.deepEqual(s.completedThemes,[]);
 assert.equal(s.history[0].outcome,'ended');
 assert.equal(engine.reduce(s,{type:'claim',themeId:'the-last-wagon'}).reason,'not-earned');
});

test('three goals complete the evening; ownership is a permanent once-only entitlement',()=>{
 let s=hosting('midnight-court-banquet');
 for(let i=0;i<12;i++)s=emit(s,{kind:'food-sale',source:'food',id:'receipt-'+i,guestId:'visitor:'+i,cohort:i<4?'midnight-court':'regular',recipeId:'haunted-pie',quantity:1,amount:22});
 for(let i=0;i<12;i++)s=emit(s,{kind:'attraction-completed',source:'hollow-house',id:'hollow-'+i,guestId:'visitor:'+i,paid:true,paidAmount:6,queueSecondsAtBoarding:2});
 assert.equal(engine.view(s).active.completedGoals,3);assert.equal(engine.view(s).active.canFinish,true);
 assert.equal(engine.reduce(s,{type:'claim',themeId:'midnight-court-banquet'}).reason,'not-earned');
 s=step(s,{type:'end'});assert.equal(engine.view(s).pendingRewards.length,1);
 const claim=engine.reduce(s,{type:'claim',themeId:'midnight-court-banquet'});assert.equal(claim.effects.length,1);assert.equal(claim.effects[0].type,'festival-reward');
 s=claim.state;const restored=engine.restore(engine.save(s));assert.equal(restored.compatible,true);
 assert.equal(engine.entitlements(restored.state).length,1);assert.equal(engine.view(restored.state).pendingRewards.length,0);
 assert.equal(engine.reduce(restored.state,{type:'claim',themeId:'midnight-court-banquet'}).reason,'already-claimed');
});

test('history is bounded without losing ownership or reusing old session IDs',()=>{
 let s=engine.createState({namespace:'history'});
 for(let i=0;i<40;i++){s=step(s,{type:'prepare',themeId:'the-last-wagon'});s=step(s,{type:'end'});}
 assert.equal(s.history.length,12);assert.equal(s.nextSession,41);assert.equal(s.history[0].id,'history:40');
 const restored=engine.restore(engine.save(s));assert.equal(restored.compatible,true);
 s=step(restored.state,{type:'prepare',themeId:'the-last-wagon'});assert.equal(s.active.id,'history:41');
});

test('definition inputs are bound once; later editing a caller object cannot change goals',()=>{
 const input=structuredClone(definitions),bound=createFestivalEngine(input);input.themes[0].goals.options[0].target=1;
 let s=bound.reduce(bound.createState(),{type:'prepare',themeId:'midnight-court-banquet'},context).state;
 assert.equal(bound.view(s).active.goals[0].target,12);
 assert.throws(()=>createFestivalEngine({...definitions,themes:[]}),TypeError);
 const invalid=structuredClone(definitions);invalid.themes[0].goals.options[0].target=Infinity;
 assert.throws(()=>createFestivalEngine(invalid),TypeError);
});

test('wording and row order edits retain progress while semantic tuning is separately revision checked',()=>{
 let s=hosting('midnight-court-banquet');
 s=emit(s,{kind:'food-sale',source:'food',id:'kept-receipt',guestId:'visitor:3',recipeId:'haunted-pie',quantity:2,amount:44});
 const edited=structuredClone(definitions);
 edited.themes[0].goals.options.reverse();edited.themes[0].goals.options.find(g=>g.id==='court-supper').label='Enjoy two memorable dishes';
 const other=createFestivalEngine(edited),restored=other.restore(engine.save(s));
 assert.equal(restored.compatible,true);assert.equal(restored.warnings.length,0);
 assert.equal(other.view(restored.state).active.goals.find(g=>g.id==='court-supper').value,2);
});
