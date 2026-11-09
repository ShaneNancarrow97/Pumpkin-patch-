import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import * as M from '../src/model.js';
import {HOME_FURNISHINGS} from '../src/content/home-furnishings.js';
import {homeFurnishingProp} from '../src/home-furnishings.js';
import {homePieceTargets} from '../src/rules/home-interactions.js';
import {canRide,riderSize,surfacesOf,standsOn} from '../src/rules/surfaces.js';
import {saveOutfitPreset,wearOutfitPreset} from '../src/rules/village-outfit-presets.js';
const newItems=HOME_FURNISHINGS.filter(i=>i.id.startsWith('mothlight-'));
test('village keepsakes have actual bounded voxel bodies and meaningful purchase gates',()=>{
 const s=M.freshState();s.coins=10000;assert.equal(newItems.length,6);
 for(const i of newItems){const prop=homeFurnishingProp(i.id),box=new THREE.Box3().setFromObject(prop),size=box.getSize(new THREE.Vector3());assert.ok(Number.isFinite(size.x)&&size.x>0&&size.y>0);assert.ok(size.x<=M.footprint(i.id).w+.001);const before=s.coins;assert.equal(M.buyDecor(s,i.id),false);assert.equal(s.coins,before);s.village.expansion.effects.push(i.unlockEffect);assert.equal(M.buyDecor(s,i.id),true);assert.equal(s.coins,before-i.price);assert.ok(M.availableCopies(s,i.id)>0);}
 const saved=M.restoreState(M.saveData(s));for(const i of newItems)assert.ok(saved.house.owned.includes(i.id));
});
test('Granny’s rocker is a real seated interaction and Mabel’s table opens the wardrobe',()=>{
 const s=M.freshState();s.house.placed=[{id:'mothlight-granny-rocker',instance:'rocker',room:'parlour',x:1,z:1,rotation:15},{id:'mothlight-pattern-table',instance:'patterns',room:'parlour',x:5,z:2,rotation:0}];
 const targets=homePieceTargets(s,'parlour');assert.equal(targets.find(t=>t.instance==='rocker').type,'sit');assert.equal(targets.find(t=>t.instance==='patterns').type,'wardrobe');
});
test('Mabel saves and restores both owned looks atomically, including Natalie’s wheelchair',()=>{
 const s=M.freshState();assert.equal(saveOutfitPreset(s,0),false);s.village.expansion.effects.push('tailoring');M.wearCostume(s,'natalie-wheelchair');assert.equal(saveOutfitPreset(s,0),true);
 M.wearCostume(s,'natalie-base');assert.equal(wearOutfitPreset(s,0),true);assert.equal(s.wardrobe.equipped.natalie,'natalie-wheelchair');const next=M.restoreState(M.saveData(s));assert.deepEqual(next.village.expansion.outfits,s.village.expansion.outfits);
 s.village.expansion.outfits[1]={shane:'shane-jason',natalie:'natalie-freddy'};const before={...s.wardrobe.equipped};assert.equal(wearOutfitPreset(s,1),false);assert.deepEqual(s.wardrobe.equipped,before);s.paused=true;assert.equal(saveOutfitPreset(s,2),false);
});
test('new village level requirements honour old claims and retain blocked earned income',()=>{
 const s=M.freshState();s.progression.claimed=[1,2,3,4,5,6,7,8];s.progression.homeLegacyThrough=8;s.earned=M.LEVELS[8].at;
 assert.equal(M.patchLevel(s).level,8);assert.equal(M.patchLevel(s).blocked,true);const earnings=M.levelEarnings(s);s.village.expansion.effects.push('copse-restored');assert.equal(M.patchLevel(s).level,9);assert.equal(M.levelEarnings(s),earnings);s.progression.claimed.push(9);s.village.expansion.effects=[];assert.equal(M.patchLevel(s).level,9);
});

test('Granny’s authored hayride scene remains story-locked and claims only once',()=>{
 const s=M.freshState();s.hayride.purchased=true;s.hayride.tier=1;const coins=s.coins;assert.equal(M.buyHayrideScare(s,'grannys-last-light'),false);s.village.expansion.effects.push('granny-invited');assert.equal(M.buyHayrideScare(s,'grannys-last-light'),true);assert.equal(s.coins,coins);assert.equal(M.buyHayrideScare(s,'grannys-last-light'),false);assert.ok(s.hayride.haunts.active.includes('grannys-last-light'));
});

test('Cinder’s little serving board can stand on a real table using its measured body',()=>{
 const id='mothlight-cinder-serving-board';assert.equal(canRide(id),true);assert.ok(riderSize(id).h<.3);const top=surfacesOf('f07',2,2,false).find(t=>standsOn(t,id,t.x+t.w/2,t.z+t.d/2,0));assert.ok(top);
});
