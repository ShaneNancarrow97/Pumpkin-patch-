import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { beginAction } from '../src/rules/life-actions.js';
import { waterPlot, wateringStatus, WATER } from '../src/rules/hands-on.js';

function trained(owner = 'natalie') {
  const s = M.freshState(); s.coins = 100000; s.progression.claimed = M.LEVELS.map(l => l.level);
  M.buyHelperUpgrade(s, owner, 'hire');
  return s;
}
const ripen = s => { for (const p of s.plots.slice(0, M.openPlots(s))) Object.assign(p, { phase: 'ready', progress: 1, ripe: 0 }); };

test('a planting press changes exactly one open bed and pause prevents a press', () => {
  const s=M.freshState(); assert.equal(M.plantNext(s),0); assert.equal(s.plots.filter(p=>p.phase==='growing').length,1);
  assert.equal(M.plantNext(s),1); s.paused=true; assert.equal(M.plantNext(s),-1);
  assert.equal(s.plots.filter(p=>p.phase==='growing').length,2);
});

test('manual picking follows each owner’s1→2→3capacity and does not multiply yield', () => {
  const s=trained(); s.upgrades.yield=1; ripen(s);
  assert.equal(M.pickBatch(s,'natalie').length,1); assert.equal(M.stockCount(s),2);
  assert.ok(M.buyHelperUpgrade(s,'natalie','capacity'));
  assert.equal(M.pickBatch(s,'natalie').length,2); assert.equal(M.stockCount(s),6);
  assert.ok(M.buyHelperUpgrade(s,'natalie','capacity')); ripen(s);
  assert.equal(M.pickBatch(s,'natalie').length,3); assert.equal(M.stockCount(s),12);
  assert.equal(M.pickBatch(s,'shane').length,1); assert.equal(M.stockCount(s),14);
});

test('a capacity batch respects partial barn space and rejects duplicate or closed targets', () => {
  const s=trained(); M.buyHelperUpgrade(s,'natalie','capacity'); M.buyHelperUpgrade(s,'natalie','capacity'); ripen(s);
  s.stock[0]=M.barnCapacity(s)-1;
  const rows=M.pickBatch(s,'natalie',[0,0,23,-1,1]);
  assert.deepEqual(rows,[{plot:0,count:1}]); assert.equal(s.plots[1].phase,'ready'); assert.equal(M.stockCount(s),M.barnCapacity(s));
  s.paused=true; assert.deepEqual(M.pickBatch(s,'natalie'),[]);
});

test('controlled planting and watering use only the chosen owner’s training', () => {
  const s=trained('shane'); M.buyHelperUpgrade(s,'shane','plant'); M.buyHelperUpgrade(s,'shane','water');
  assert.equal(beginAction(s,{type:'plot',index:0},'plant','shane').duration,.8*.8);
  assert.equal(beginAction(s,{type:'plot',index:0},'plant','natalie').duration,.8);
  M.plant(s,0);
  assert.equal(beginAction(s,{type:'plot',index:0},'water','shane').duration,1.1*.8);
});

test('water cooldown and fresh ripe grace survive saves without free repeated growth', () => {
  const s=M.freshState(); s.time=20; M.plant(s,0); assert.ok(waterPlot(s,0));
  s.plots[1]={phase:'ready',progress:1,variety:0,ripe:19};
  const restored=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(restored.version,15); assert.equal(restored.plots[0].progress,WATER.progress);
  assert.equal(wateringStatus(restored,0).seconds,12); assert.equal(waterPlot(restored,0),false);
  assert.equal(restored.plots[1].ripe,19);
  restored.time+=12; assert.ok(waterPlot(restored,0));
});

test('invalid frame intervals do not damage the clock or trigger work', () => {
  const s=trained(), before=JSON.stringify(M.saveData(s));
  for(const dt of [NaN,Infinity,-1,0]) assert.deepEqual(M.update(s,dt),[]);
  assert.equal(JSON.stringify(M.saveData(s)),before);
});
