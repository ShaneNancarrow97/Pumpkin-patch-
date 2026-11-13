import test from 'node:test';
import * as THREE from 'three';
import {buildFoodProp,disposeFoodProp} from '../src/food-props.js';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import {freshExpansionEconomy,restoreExpansionEconomy,processExpansionHerbs,startExpansionWax,treatExpansionStock,expansionCommissionInfo,fulfilExpansionCommission,buyExpansionEconomyUpgrade,updateExpansionEconomy,takeExpansionReservation} from '../src/rules/village-expansion-economy.js';
import {pumpkinStockLife} from '../src/rules/village-expansion-benefits.js';
const ready=()=>{const s=M.freshState();s.earned=M.LEVELS.at(-1).at;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;s.coins=100000;s.visitorTimer=1e6;s.shop.arrivalTimer=1e6;s.bigSpender.timer=1e6;s.village.expansion={...(s.village.expansion??{}),effects:['herb-beds','preservation-research','cold-store-blueprint','restaurant-commissions','corvus-scenery','baron-reservations','cinder-recipe','granny-recipe'],gems:{'ember-garnet':3},economy:freshExpansionEconomy()};M.buyFoodTruck(s);return s;};
test('clean-herb processing transfers exactly one inventory into the other, with pause/capacity guards',()=>{
 const s=ready();s.village.materials.herbs=4;const coins=s.coins;assert.ok(processExpansionHerbs(s,3).ok);assert.equal(s.village.materials.herbs,1);assert.equal(s.kitchen.pantry.herbs,3);assert.equal(s.coins,coins);assert.equal(processExpansionHerbs(s,3).ok,false);s.paused=true;assert.equal(processExpansionHerbs(s).ok,false);s.paused=false;s.kitchen.pantry.flour=M.pantryCapacity(s);assert.equal(processExpansionHerbs(s).ok,false);assert.equal(s.village.materials.herbs,1);
});
test('wax occupies a real supplied cooker, completes on farm time and never becomes guest food',()=>{
 const s=ready();s.kitchen.pantry.herbs=2;s.kitchen.pantry.butter=3;assert.ok(startExpansionWax(s).ok);assert.equal(startExpansionWax(s).ok,false);assert.equal(M.startCooking(s,'wedges','truck'),false);const food=M.foodCount(s);updateExpansionEconomy(s,29);assert.equal(s.village.expansion.economy.wax,0);s.paused=true;updateExpansionEconomy(s,90);assert.equal(s.village.expansion.economy.wax,0);s.paused=false;updateExpansionEconomy(s,1);assert.equal(s.village.expansion.economy.wax,1);assert.equal(M.foodCount(s),food);assert.equal(s.kitchen.pantry.herbs,1);assert.equal(s.kitchen.pantry.butter,2);
});
test('batch treatment adds10% once, cold storage adds20% and the total stays30%',()=>{
 const s=ready();s.village.expansion.economy.wax=3;M.addStock(s,0,20,true);const born=s.time,id=`0:${born}`;assert.ok(treatExpansionStock(s,id).ok);assert.equal(pumpkinStockLife(s,0,born),330);assert.equal(treatExpansionStock(s,id).ok,false);assert.equal(s.village.expansion.economy.wax,2);s.village.materials.iron=6;s.village.materials.clay=4;assert.ok(buyExpansionEconomyUpgrade(s,'cold-store').ok);assert.equal(pumpkinStockLife(s,0,born),390);assert.equal(buyExpansionEconomyUpgrade(s,'cold-store').ok,false);s.time=born+389;M.settlePumpkinStock(s);assert.equal(s.stock[0],20);s.time=born+390;M.settlePumpkinStock(s);assert.equal(s.stock[0],0);assert.equal(s.stockWaste.discarded[0],20);
});
test('neither wax nor buying cold storage can resurrect already-expired stock',()=>{
 const s=ready();s.village.expansion.economy.wax=1;M.addStock(s,0,4);s.time=301;assert.equal(treatExpansionStock(s,'0:0').ok,false);assert.equal(s.stock[0],0);assert.equal(s.village.expansion.economy.wax,1);M.addStock(s,1,3);s.time=602;s.village.materials.iron=6;s.village.materials.clay=4;assert.ok(buyExpansionEconomyUpgrade(s,'cold-store').ok);assert.equal(s.stock[1],0);
});
test('new recipes are village discoveries, then use actual equipment, pantry and batch output',()=>{
 const s=ready();s.village.expansion.effects=[];assert.equal(M.researchRecipe(s,'cinders-lantern-stew'),false);assert.equal(M.startCookingExperiment(s,'cinders-lantern-stew','truck'),false);s.village.expansion.effects.push('cinder-recipe');assert.ok(M.researchRecipe(s,'cinders-lantern-stew'));s.kitchen.pantry.vegetables=2;s.kitchen.pantry.stock=1;s.kitchen.pantry.herbs=1;M.addStock(s,0,1);assert.ok(M.startCooking(s,'cinders-lantern-stew'));M.updateKitchen(s,60);assert.equal(s.kitchen.food['cinders-lantern-stew'],3);assert.equal(s.kitchen.pantry.vegetables,0);assert.equal(s.stock[0],0);
});
test('commission consumes only unreserved food and pays trade once in a separate ledger',()=>{
 const s=ready();s.kitchen.recipes.push('cinders-lantern-stew');s.kitchen.food['cinders-lantern-stew']=5;s.kitchen.foodHolds.push({owner:'visitor-1',recipe:'cinders-lantern-stew',quantity:2,price:20});assert.equal(expansionCommissionInfo(s,'cinder-first-supper').canDeliver,false);s.kitchen.foodHolds=[];const coins=s.coins,earned=s.earned,foodIncome=s.kitchen.ledger.foodIncome;const result=fulfilExpansionCommission(s,'cinder-first-supper');assert.ok(result.ok);assert.equal(s.kitchen.food['cinders-lantern-stew'],1);assert.equal(s.coins-coins,96);assert.equal(s.earned-earned,96);assert.equal(s.kitchen.ledger.foodIncome,foodIncome);assert.equal(s.village.expansion.economy.income,96);assert.equal(fulfilExpansionCommission(s,'cinder-first-supper').ok,false);updateExpansionEconomy(s,120);assert.equal(fulfilExpansionCommission(s,'cinder-first-supper').ok,false,'new servings are still required');
});
test('one due reservation replaces the next normal party and respects rush deferral',()=>{
 const s=ready(),e=s.village.expansion.economy;updateExpansionEconomy(s,300);assert.ok(e.vipDue);s.visitorEvents.rush.pending={};assert.equal(takeExpansionReservation(s),false);assert.ok(e.vipDue);s.visitorEvents.rush.pending=null;s.visitorTimer=0;M.updateStall(s,.01,[]);const party=s.arriving.filter(a=>a.courtier);assert.ok(party.length<=2);assert.equal(e.vipGroups,1);assert.equal(e.vipDue,false);assert.equal(takeExpansionReservation(s),false);assert.ok(s.visitors.filter(v=>v.courtier).every(v=>v.originalBudget===v.budget&&v.budget<=240));
});
test('restoring economy preserves valid paid benefits, batches and cooldowns while bounding malformed data',()=>{
 const raw={...freshExpansionEconomy(),upgrades:['cold-store','fake','cold-store'],wax:1000,treated:{'0:1e-7':true,'0:1':true,'__proto__':true},waxJob:{station:'home',remaining:999},commissions:{'cinder-first-supper':{done:3,remaining:99}}};const r=restoreExpansionEconomy(raw);assert.deepEqual(r.upgrades,['cold-store']);assert.equal(r.wax,99);assert.equal(r.treated['0:1e-7'],true);assert.equal(r.waxJob.remaining,30);assert.equal(r.commissions['cinder-first-supper'].done,3);
});
test('restaurant orders share a resident cooldown and recipe discoveries cannot bypass it',()=>{
 const s=ready();s.kitchen.recipes.push('cinders-lantern-stew','pumpkin-pie');s.kitchen.food['cinders-lantern-stew']=4;s.kitchen.food['pumpkin-pie']=4;assert.ok(fulfilExpansionCommission(s,'cinder-first-supper').ok);assert.equal(fulfilExpansionCommission(s,'cinder-pastry-table').ok,false);updateExpansionEconomy(s,120);assert.ok(fulfilExpansionCommission(s,'cinder-pastry-table').ok);
});
test('the integrated update uses farm time for utility cooking while village time remains full',()=>{
 const s=ready();s.village.invited=true;s.kitchen.pantry.herbs=1;s.kitchen.pantry.butter=1;assert.ok(startExpansionWax(s).ok);const before=s.village.clock;M.update(s,100,{villageAway:true});assert.equal(s.village.expansion.economy.waxJob.remaining,27.5);assert.equal(s.village.clock-before,100);const e=restoreExpansionEconomy(JSON.parse(JSON.stringify(s.village.expansion.economy)));assert.equal(e.waxJob.remaining,27.5);assert.equal(e.waxCooked,0);
});

test('new village foods have distinct finite native props at the established held-food scale',()=>{
 const counts=[];for(const id of ['cinders-lantern-stew','grannys-bramble-pudding']){const p=buildFoodProp(id);const size=new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3());assert.ok([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0));assert.ok(size.x<.6&&size.y<.4&&size.z<.6);let boxes=0;p.traverse(o=>{if(o.isInstancedMesh)boxes+=o.count;});assert.ok(boxes>10&&boxes<150);counts.push(boxes);disposeFoodProp(p);}assert.notEqual(counts[0],counts[1]);
});
test('full current-version save round-trip retains paid cold storage, treated stock and a supplied wax job',()=>{
 const s=ready();s.village.materials.iron=6;s.village.materials.clay=4;assert.ok(buyExpansionEconomyUpgrade(s,'cold-store').ok);M.addStock(s,0,6);s.village.expansion.economy.wax=1;assert.ok(treatExpansionStock(s,'0:0').ok);s.kitchen.pantry.herbs=1;s.kitchen.pantry.butter=1;assert.ok(startExpansionWax(s).ok);updateExpansionEconomy(s,7);const r=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.equal(r.version,M.STATE_VERSION);assert.equal(pumpkinStockLife(r,0,0),390);assert.equal(r.village.expansion.economy.waxJob.remaining,23);assert.equal(r.kitchen.pantry.herbs,0);assert.equal(r.stock[0],6);assert.equal(r.village.expansion.economy.treatments,1);
});
