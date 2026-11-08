import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../src/model.js';

const fresh = () => { const s=M.freshState();s.coins=20000;s.visitorTimer=s.shop.arrivalTimer=1e9;return s; };
const ripe = (s,i=0,variety=0) => {s.plots[i]={phase:'ready',progress:1,variety,ripe:s.time-M.HELPER_WAIT,fountain:true};};

test('fountain seeds cost slightly more than first piñata seeds and buy once at level5',()=>{
  const s=fresh(),initial=s.coins;
  assert.equal(M.FOUNTAIN.chance,.025);assert.ok(M.FOUNTAIN.cost>M.PINATA.costs[0]);assert.ok(M.FOUNTAIN.cost<=M.PINATA.costs[0]*1.3);
  assert.equal(M.buyFountainSeeds(s,4),false);s.paused=true;assert.equal(M.buyFountainSeeds(s,5),false);s.paused=false;
  s.coins=M.FOUNTAIN.cost-1;assert.equal(M.buyFountainSeeds(s,5),false);s.coins=initial;
  assert.equal(M.buyFountainSeeds(s,5),true);assert.equal(s.coins,initial-M.FOUNTAIN.cost);assert.equal(M.fountainChance(s),.025);
  assert.equal(M.buyFountainSeeds(s,20),false);assert.equal(s.coins,initial-M.FOUNTAIN.cost);
});

test('saved planting serial gives a uniform2.5% chance without rerolling on failed plants',()=>{
  const s=fresh();assert.equal(M.fountainChance(s),0);assert.equal(M.plant(s,0),true);assert.equal(s.plots[0].fountain,undefined);assert.equal(s.fountain.planted,0);
  s.plots[0].phase='empty';M.buyFountainSeeds(s,5);s.pinata.level=3;
  let count=0;const trials=40000;
  for(let serial=0;serial<trials;serial++){
    s.plots[0]={phase:'empty',progress:0,variety:0};
    const expected=M.fountainRoll(serial,0)<.025;assert.equal(M.plant(s,0),true);assert.equal(!!s.plots[0].fountain,expected);
    if(expected){count++;assert.equal(s.plots[0].pinata,undefined,'one special variant per crop');}
    assert.equal(s.fountain.planted,serial+1);assert.equal(M.plant(s,0),false);assert.equal(s.fountain.planted,serial+1);
  }
  assert.ok(count/trials>.022&&count/trials<.028,`${count}/${trials}`);
  s.plots[0].phase='empty';s.paused=true;const serial=s.fountain.planted;assert.equal(M.plant(s,0),false);assert.equal(s.fountain.planted,serial);
});

test('one star stores ten total pumpkins of its variety and pays exactly£100 once',()=>{
  const s=fresh();s.upgrades.yield=7;ripe(s,0,2);const coins=s.coins,earned=s.earned,stock=M.stockCount(s),harvested=s.harvested,stall=s.stall.income;
  assert.equal(M.harvest(s,0),10);assert.equal(M.stockCount(s),stock+10);assert.equal(s.stock[2],10);assert.equal(s.harvested,harvested+10);
  assert.equal(s.coins,coins+100);assert.equal(s.earned,earned+100);assert.equal(s.stall.income,stall);
  assert.equal(s.fountain.popped,1);assert.equal(s.fountain.pumpkins,10);assert.equal(s.fountain.coins,100);
  assert.equal(M.harvest(s,0),0);assert.equal(s.coins,coins+100);
  const events=M.drainFountainBursts(s);assert.equal(events.length,1);assert.deepEqual(events[0],{type:'fountain-burst',index:0,variety:2,amount:10,coins:100,serial:1});
  assert.deepEqual(M.drainFountainBursts(s),[]);
});

test('ten barn spaces are required even with a market cart; failed or paused pick gives nothing',()=>{
  const s=fresh();s.upgrades.cart=3;ripe(s);s.stock[0]=M.barnCapacity(s)-9;const cash=s.coins;
  assert.equal(M.canHarvestPlot(s,0),false);assert.equal(M.harvest(s,0),0);assert.equal(s.plots[0].fountain,true);assert.equal(s.coins,cash);assert.equal(s.fountain.popped,0);assert.equal(s.cartLoad,undefined);
  s.stock[0]--;assert.equal(M.canHarvestPlot(s,0),true);s.paused=true;assert.equal(M.harvest(s,0),0);assert.equal(s.coins,cash);
  s.paused=false;assert.equal(M.harvest(s,0),10);assert.equal(M.stockCount(s),M.barnCapacity(s));assert.equal(s.coins,cash+100);
});

test('button batches and autonomous helpers share star payouts and skip blocked stars',()=>{
  const batch=fresh();ripe(batch);assert.deepEqual(M.pickBatch(batch,'natalie',[0]),[{plot:0,count:10}]);assert.equal(batch.fountain.popped,1);
  const helper=fresh();helper.farmWork.helpers.shane.hired=true;ripe(helper);helper.plots[1]={phase:'ready',progress:1,variety:0,ripe:-100};helper.stock[0]=M.barnCapacity(helper)-9;
  const events=[];M.updateHelpers(helper,10,events);assert.equal(helper.plots[0].fountain,true);assert.equal(helper.plots[1].phase,'empty','normal crop remains eligible');assert.equal(helper.fountain.popped,0);
  helper.stock[0]-=2;const next=M.update(helper,10);assert.equal(helper.plots[0].phase,'empty');assert.equal(helper.fountain.popped,1);assert.equal(next.filter(e=>e.type==='fountain-burst').length,1);
  assert.equal(M.update(helper,.1).filter(e=>e.type==='fountain-burst').length,0);
});

test('a helper basket skips a second star that no longer fits and still picks a normal crop',()=>{
  const s=fresh();s.farmWork.helpers.shane.hired=true;s.farmWork.helpers.shane.capacity=1;
  ripe(s,0);ripe(s,1);s.plots[2]={phase:'ready',progress:1,variety:0,ripe:-100};
  s.stock[0]=M.barnCapacity(s)-11;
  const events=[];M.updateHelpers(s,10,events);
  assert.deepEqual(events.filter(e=>e.type==='harvest').map(e=>e.plot),[0,2]);
  assert.equal(s.plots[1].fountain,true);assert.equal(s.fountain.popped,1);assert.equal(M.barnSpace(s),0);
});

test('version18 retains growing stars, paid seed ownership and serials without replaying bursts',()=>{
  const s=fresh();M.buyFountainSeeds(s,5);s.fountain.planted=178;s.plots[2]={phase:'growing',progress:.4,variety:1,fountain:true};ripe(s,0,3);M.harvest(s,0);
  const raw=JSON.parse(JSON.stringify(M.saveData(s))),back=M.restoreState(raw);
  assert.equal(back.version,18);assert.equal(back.fountain.owned,true);assert.equal(back.fountain.planted,178);assert.equal(back.fountain.popped,1);assert.equal(back.fountain.coins,100);assert.equal(back.plots[2].fountain,true);assert.equal(back.plots[2].variety,1);assert.equal(back.fountain.last,null);assert.deepEqual(M.drainFountainBursts(back),[]);
  const legacy=JSON.parse(fs.readFileSync(new URL('fixtures/save-file-v1-state17.json',import.meta.url),'utf8')).state;
  const old=M.restoreState(legacy);assert.equal(old.version,18);assert.deepEqual(old.fountain,M.freshFountain());assert.equal(old.coins,legacy.coins);assert.equal(old.earned,legacy.earned);
  const junk=M.restoreState({...raw,fountain:{owned:'yes',planted:Infinity,popped:-1,coins:'100'},plots:raw.plots.map((p,i)=>i===2?{...p,pinata:true}:p)});
  assert.equal(junk.fountain.owned,false);assert.equal(junk.fountain.planted,0);assert.equal(junk.fountain.popped,0);assert.equal(junk.fountain.coins,0);assert.equal(junk.plots[2].pinata,undefined);
});
