import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { pumpkinTemplate } from '../src/pumpkins.js';
import * as THREE from 'three';

test('Midnight Moon is a paid fifth seed tier per plot, never a global/free crop',()=>{
 const s=M.freshState(); s.coins=20000;
 assert.deepEqual(M.VARIETIES.slice(0,4).map(v=>v.price),[12,24,42,70]);
 assert.equal(M.choosePlotCrop(s,0,4),false);
 for(let i=0;i<4;i++)assert.equal(M.upgradePlot(s,0),true);
 assert.equal(s.coins,20000-180-900-3600-7800);
 assert.equal(s.plotLevels[0],4);assert.equal(s.plotLevels[1],0);
 assert.equal(M.upgradePlot(s,0),false);assert.equal(M.plant(s,0),true);
 assert.equal(M.growTime(s,0),48);M.updateFarm(s,48,[]);
 assert.equal(M.harvest(s,0),1);assert.equal(s.stock[4],1);
});
test('legacy four-bin stock/freshness survives and fifth crop, stock and demand round-trip',()=>{
 const s=M.freshState(); s.stock=[11,12,13,14]; s.fresh=[[[0,2]],[],[],[]];
 const legacy=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
 assert.deepEqual(legacy.stock,[11,12,13,14,0]);assert.deepEqual(legacy.fresh[0],[[0,2]]);
 legacy.plotLevels[0]=legacy.plotCrops[0]=4;legacy.plots[0]={phase:'growing',variety:4,progress:.5};
 M.addStock(legacy,4,7,true);legacy.wanted={variety:4,until:300,serial:3};
 const r=M.restoreState(JSON.parse(JSON.stringify(M.saveData(legacy))));
 assert.deepEqual(r.stock,[11,12,13,14,7]);assert.equal(r.plotLevels[0],4);assert.equal(r.plots[0].variety,4);assert.equal(r.plots[0].progress,.5);
 assert.equal(M.wantedVariety(r),4);assert.equal(M.freshCount(r,4),7);
});
test('fifth pumpkin supports display selection, held baskets and one-time checkout',()=>{
 const s=M.freshState();s.shop.unlocked=true;M.addStock(s,4,4,true);
 assert.equal(M.assignDisplay(s,0,4),true);
 const lines=M.chooseBasket(s,{budget:500,basketLimit:2,preferred:[4]},[4],'moon',M.VARIETIES.map(v=>v.price));
 assert.equal(lines.reduce((n,l)=>n+l.quantity,0),2);assert.equal(M.available(s,4),2);
 const receipt=M.commitHold(s,'moon');assert.ok(receipt.amount>=220);assert.equal(s.stock[4],2);assert.equal(M.commitHold(s,'moon'),null);
});
test('native navy crop has finite geometry and glowing gold rind markings',()=>{
 const p=pumpkinTemplate(4),box=new THREE.Box3().setFromObject(p);assert.ok(Number.isFinite(box.min.x)&&box.max.y>0);
 let lit=0,glowing=0;p.traverse(o=>{if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));}if(o.material.isMeshBasicMaterial)glowing+=o.count;else lit+=o.count;}});
 assert.ok(lit>500);assert.ok(glowing>=10,'moon and stars are unlit emissive voxels');
});
