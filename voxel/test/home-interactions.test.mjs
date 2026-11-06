import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/model.js';
import {homePieceTargets,petInteractionTargets} from '../src/rules/home-interactions.js';

test('furniture interactions expose a real seat, a stocked book and wardrobe without changing the room',()=>{
 const s=freshState();s.house.placed.push({id:'costume-rack',instance:'rack',room:'parlour',x:0,z:0,rotation:0,books:[]});const before=JSON.stringify(s),targets=homePieceTargets(s,'parlour');
 assert.equal(targets.find(t=>t.instance==='piece-0').type,'sit');
 const reading=targets.find(t=>t.instance==='piece-1');assert.equal(reading.type,'read');assert.equal(reading.book,'b01');
 assert.equal(targets.find(t=>t.instance==='rack').type,'wardrobe');assert.equal(JSON.stringify(s),before);
});
test('seat approach and pose turn with the physical chair rather than following the screen',()=>{
 const s=freshState();s.house.placed=[{id:'f01',instance:'chair',room:'parlour',x:2,z:2,rotation:0,books:[]}];
 const front=homePieceTargets(s,'parlour')[0];assert.ok(front.z>front.pose.z);assert.equal(front.x,front.pose.x);
 s.house.placed[0].rotation=90;const turned=homePieceTargets(s,'parlour')[0];assert.ok(turned.x>turned.pose.x);assert.ok(Math.abs(turned.z-turned.pose.z)<.00001);assert.equal(turned.pose.rotation,90);
});
test('an empty shelf is arranged normally and its first real book enables reading',()=>{
 const s=freshState();s.house.placed=s.house.placed.filter(p=>p.id==='f11');s.house.placed[0].books=[];
 assert.equal(homePieceTargets(s,'parlour')[0].type,'piece');s.house.placed[0].books=['b02'];assert.equal(homePieceTargets(s,'parlour')[0].book,'b02');assert.deepEqual(homePieceTargets(s,'bedroom'),[]);
});
test('pet prompts follow valid companion positions and do not invent arbitrary visitor pets',()=>{
 const status=[{who:'skyla',position:{x:1,z:2}},{who:'sandy',position:{x:3,z:4}},{who:'maisie',position:{x:5,z:6}},{who:'ghost',position:{x:0,z:0}},{who:'skyla',position:{x:NaN,z:2}}];const before=JSON.stringify(status);const targets=petInteractionTargets(status);
 assert.equal(targets.length,3);assert.deepEqual(targets.map(t=>t.pet),['skyla','sandy','maisie']);assert.deepEqual(targets[1],{type:'pet',id:'sandy',pet:'sandy',name:'Sandy',objectLabel:'Sandy',label:'Pet Sandy',x:3,z:4,range:1.35,priority:.2});assert.equal(JSON.stringify(status),before);
});
