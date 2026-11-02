import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SERVICE_ATLASES,DISH_ART_IDS,DISH_ART_INDEX,SERVICE_CATEGORY_ART,serviceArt} from '../preview/service-art.js';

test('reviewed food cell order matches the existing game metadata without importing live UI',()=>{
 const source=fs.readFileSync(new URL('../../../../src/ui/kitchen-food-art.js',import.meta.url),'utf8');
 const match=source.match(/export const DISH_ART_IDS=(\[[^;]+\]);/);
 assert.ok(match,'Existing dish metadata must remain reviewable');
 assert.deepEqual(DISH_ART_IDS,JSON.parse(match[1]));
 assert.deepEqual(Object.keys(DISH_ART_INDEX),DISH_ART_IDS);
 for(const [index,id]of DISH_ART_IDS.entries())assert.equal(serviceArt('food',{recipeId:id}).index,index);
});

test('atlas definitions, ID maps and category maps are frozen at every shared level',()=>{
 for(const value of [SERVICE_ATLASES,DISH_ART_IDS,DISH_ART_INDEX,SERVICE_CATEGORY_ART,...Object.values(SERVICE_ATLASES),...Object.values(SERVICE_CATEGORY_ART)])assert.equal(Object.isFrozen(value),true);
 assert.throws(()=>{DISH_ART_IDS.push('invented');},TypeError);
 assert.throws(()=>{SERVICE_CATEGORY_ART.cocoa.index=100;},TypeError);
});

test('every reviewed food and category cell is within its atlas dimensions',()=>{
 for(const descriptor of [...DISH_ART_IDS.map(recipeId=>serviceArt('food',{recipeId})),...['food','cocoa','garden','ride','unknown'].map(kind=>serviceArt(kind))]){
  assert.ok(Number.isInteger(descriptor.index)&&descriptor.index>=0);
  assert.ok(Number.isInteger(descriptor.columns)&&descriptor.columns>0);
  assert.ok(Number.isInteger(descriptor.rows)&&descriptor.rows>0);
  assert.ok(descriptor.index<descriptor.columns*descriptor.rows);
  assert.deepEqual({columns:descriptor.columns,rows:descriptor.rows},SERVICE_ATLASES[descriptor.atlas]);
 }
});

test('all six theme recipes use exact food art or the honest place-setting fallback',()=>{
 const definitions=JSON.parse(fs.readFileSync(new URL('../../late-game-support/data/festival-themes.json',import.meta.url),'utf8'));
 const expected=new Map([['haunted-pie',12],['moonlight-tart',7],['harvest-broth',9],['pumpkin-spice-biscuits',13]]);
 const recipes=definitions.themes.flatMap(theme=>theme.recipeIds);
 assert.equal(recipes.length,6);
 for(const recipeId of recipes){
  const descriptor=serviceArt('food',{recipeId});
  if(expected.has(recipeId)){assert.equal(descriptor.atlas,'kitchen-dishes');assert.equal(descriptor.index,expected.get(recipeId));assert.equal(descriptor.illustrative,false);}
  else {assert.ok(['seed-brittle','bramble-crumble'].includes(recipeId));assert.deepEqual(descriptor,{atlas:'hospitality-icons',index:2,columns:4,rows:3,illustrative:true});}
 }
});

test('unknown, missing and prototype-like recipe IDs never pretend to be a literal dish',()=>{
 for(const recipeId of ['unknown','seed-brittle','bramble-crumble','__proto__','constructor','',null,12])assert.deepEqual(serviceArt('food',{recipeId}),{atlas:'hospitality-icons',index:2,columns:4,rows:3,illustrative:true});
 assert.equal(serviceArt('food').illustrative,true);
 assert.equal(serviceArt('__proto__',null).index,2);
});

test('cocoa, garden and ride are category illustrations rather than literal paid contents',()=>{
 assert.deepEqual(serviceArt('cocoa',{items:[{id:'smores'}]}),{atlas:'hospitality-icons',index:6,columns:4,rows:3,illustrative:true});
 assert.deepEqual(serviceArt('garden'),{atlas:'kitchen-ingredients',index:7,columns:6,rows:3,illustrative:true});
 assert.deepEqual(serviceArt('ride'),{atlas:'hospitality-icons',index:3,columns:4,rows:3,illustrative:true});
});

test('returned descriptors are detached and the caller offer is never mutated',()=>{
 const offer=Object.freeze({recipeId:'haunted-pie',amount:78,quantity:3});
 const first=serviceArt('food',offer),second=serviceArt('food',offer);
 assert.notEqual(first,second);assert.deepEqual(first,second);
 first.index=0;
 assert.equal(second.index,12);assert.equal(serviceArt('food',offer).index,12);
 assert.deepEqual(offer,{recipeId:'haunted-pie',amount:78,quantity:3});
 const fallback=serviceArt('unknown');fallback.columns=100;
 assert.equal(serviceArt('unknown').columns,4);
});
