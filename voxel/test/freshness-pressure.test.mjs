import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const prices=M.VARIETIES.map(v=>v.price);
const quiet=()=>{const s=M.freshState();s.visitorTimer=s.shop.arrivalTimer=s.bigSpender.timer=1e9;return s;};
const shopper=(quantity=1)=>({preferred:[0],budget:1000,basketLimit:quantity});

test("ordinary and fresh harvested stock both age, fade and disappear after fifteen active minutes",()=>{
  const s=quiet();M.addStock(s,0,3,true);M.addStock(s,1,2,false);
  assert.deepEqual(s.pumpkinAges[0],[[0,3]]);
  s.time=719;M.settleFresh(s);assert.equal(M.stockCondition(s).fading,0);
  s.time=720;assert.equal(M.stockCondition(s).fading,5);
  s.time=899.9;assert.equal(M.settlePumpkinStock(s),0);
  s.time=900;const events=[];assert.equal(M.settlePumpkinStock(s,events),5);
  assert.deepEqual(s.stock,[0,0,0,0,0]);assert.equal(M.totalDiscarded(s),5);
  assert.deepEqual(events,[{type:"stock-discarded",quantity:5,byVariety:[3,2,0,0,0]}]);
  assert.equal(M.settlePumpkinStock(s,events),0);assert.equal(events.length,1,"discard cannot pay or count twice");
});
test("older batches disappear separately without throwing away a new harvest",()=>{
  const s=quiet();M.addStock(s,0,3,true);s.time=600;M.addStock(s,0,4,true);
  s.time=900;assert.equal(M.settlePumpkinStock(s),3);assert.equal(s.stock[0],4);
  assert.deepEqual(s.pumpkinAges[0],[[600,4]]);assert.equal(M.stockCondition(s,0).nextDiscardIn,600);
  s.time=1500;assert.equal(M.settlePumpkinStock(s),4);assert.equal(M.totalDiscarded(s),7);
});
test("a customer holds exact pumpkin batches across expiry and pays only once",()=>{
  const s=quiet();M.addStock(s,0,3);s.time=899;
  assert.ok(M.chooseBasket(s,shopper(),[0],"guest",prices));
  s.time=901;assert.equal(M.settlePumpkinStock(s),2);assert.equal(s.stock[0],1);assert.equal(M.available(s,0),0);
  const coins=s.coins,receipt=M.commitHold(s,"guest");assert.equal(receipt.quantity,1);assert.equal(s.stock[0],0);
  assert.equal(M.commitHold(s,"guest"),null);assert.equal(M.totalDiscarded(s),2);assert.equal(s.coins,coins,"stock settlement never creates sales income");
});
test("releasing a basket lets its expired pumpkins be discarded without stealing young units",()=>{
  const s=quiet();M.addStock(s,0,2);s.time=899;M.chooseBasket(s,shopper(),[0],"guest",prices);
  M.addStock(s,0,3,true);s.time=902;assert.equal(M.settlePumpkinStock(s),1);M.releaseHold(s,"guest");
  assert.equal(M.settlePumpkinStock(s),1);assert.equal(s.stock[0],3);assert.deepEqual(s.pumpkinAges[0],[[899,3]]);
});
test("fresh shoppers reserve young stock and cannot accidentally shield an old surplus",()=>{
  const s=quiet();M.addStock(s,0,4);s.time=899;M.addStock(s,0,2,true);
  const lines=M.chooseBasket(s,shopper(),[0],"fresh-guest",prices);assert.equal(lines[0].fresh,true);
  s.time=901;assert.equal(M.settlePumpkinStock(s),4);assert.equal(s.stock[0],2);assert.equal(M.commitHold(s,"fresh-guest").quantity,1);
  assert.deepEqual(s.pumpkinAges[0],[[899,1]]);
});
test("a direct older-stock order preserves another customer's held batches",()=>{
  const s=quiet();M.addStock(s,0,2);s.time=100;M.chooseBasket(s,shopper(),[0],"guest",prices);
  s.time=600;M.addStock(s,0,3,true);s.stock[0]-=2;M.settlePumpkinStock(s);
  assert.deepEqual(s.pumpkinAges[0],[[0,1],[600,2]],"unreserved old stock then one young pumpkin supplied the order");
  s.time=901;assert.equal(M.settlePumpkinStock(s),0,"the only old unit belongs to the queued guest");
  assert.equal(M.commitHold(s,"guest").quantity,1);assert.deepEqual(s.pumpkinAges[0],[[600,2]]);
});
test("legacy holds without batch metadata are assigned safely before expiry",()=>{
  const s=quiet();M.addStock(s,0,3);s.holds.push({owner:"old-guest",lines:[{variety:0,quantity:1,price:12,fresh:false}]});
  s.time=901;assert.equal(M.settlePumpkinStock(s),2);assert.equal(s.stock[0],1);assert.equal(M.commitHold(s,"old-guest").amount,12);
});
test("ages and discarded totals survive a real save without rejuvenating pumpkins",()=>{
  const s=quiet();M.addStock(s,0,3,true);s.time=400;M.addStock(s,0,2);s.time=800;
  let back=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.deepEqual(back.pumpkinAges,s.pumpkinAges);back.time=900;assert.equal(M.settlePumpkinStock(back),3);
  back=M.restoreState(JSON.parse(JSON.stringify(M.saveData(back))));assert.equal(M.totalDiscarded(back),3);assert.deepEqual(back.pumpkinAges[0],[[400,2]]);
});
test("legacy unaged stock receives one migration grace period and malformed batches are bounded",()=>{
  const s=quiet();s.time=1000;s.stock[0]=7;
  const raw=M.saveData(s);delete raw.pumpkinAges;delete raw.stockWaste;
  const restored=M.restoreState(JSON.parse(JSON.stringify(raw)));assert.deepEqual(restored.pumpkinAges[0],[[1000,7]]);
  restored.time=1899;assert.equal(M.settlePumpkinStock(restored),0);restored.time=1900;assert.equal(M.settlePumpkinStock(restored),7);
  const odd=quiet();odd.time=100;odd.stock[0]=3;
  odd.pumpkinAges=M.restorePumpkinAges([[[NaN,5],[101,5],[-1,5],[1,99]],null],odd);assert.deepEqual(odd.pumpkinAges[0],[[1,3]]);
  odd.stockWaste=M.restoreStockWaste({discarded:[Infinity,-1,1.4,4],lastAt:Infinity,lastCount:-9},odd);assert.equal(M.totalDiscarded(odd),4);assert.equal(odd.stockWaste.lastCount,0);
});
test("spoilage frees real barn capacity and pause does not age inventory",()=>{
  const s=quiet();M.addStock(s,0,M.barnCapacity(s),true);assert.equal(M.barnSpace(s),0);
  s.paused=true;M.update(s,2000);assert.equal(s.time,0);assert.equal(M.totalDiscarded(s),0);
  s.paused=false;M.update(s,900);assert.equal(M.stockCount(s),0);assert.equal(M.barnSpace(s),M.barnCapacity(s));
});
test("farm arrivals are faster at base and new late tiers add meaningful group/capacity growth",()=>{
  const s=quiet();assert.equal(M.stallArrivalSeconds(s),15);assert.equal(M.shopArrivalSeconds(s),2.5);assert.equal(M.visitorCapacity(s),18);
  s.coins=1e8;s.earned=2e6;s.progression.claimed=M.LEVELS.map(l=>l.level);s.upgrades.sign=5;
  for(let i=0;i<6;i++){const before=M.stallArrivalSeconds(s);assert.ok(M.buyVisitorUpgrade(s,"lights"));assert.ok(M.stallArrivalSeconds(s)<before);}
  for(let i=0;i<7;i++)assert.ok(M.buyVisitorUpgrade(s,"party"));assert.equal(M.partyMax(s),12);
  for(let i=0;i<9;i++)assert.ok(M.buyVisitorUpgrade(s,"crowd"));assert.equal(M.visitorCapacity(s),64);
  const back=M.restoreState(M.saveData(s));assert.equal(back.visitorUpgrades.lights,6);assert.equal(back.visitorUpgrades.party,7);assert.equal(back.visitorUpgrades.crowd,9);
  s.streak.visitorBoost=1.5;s.streak.visitorBoostUntil=s.time+M.STREAK.fade;
  assert.ok(M.stallGapSeconds(s)>=2);assert.ok(M.stallGapSeconds(s)<5,"maxed farm remains bounded while busier");
});
test("new late visitor tiers honour level gates as well as their purchase prices",()=>{
  const s=quiet();s.coins=1e7;s.upgrades.sign=1;s.visitorUpgrades.lights=5;
  const reach=level=>{s.earned=M.LEVELS[level-1].at;s.progression.claimed=M.LEVELS.slice(0,level).map(l=>l.level);};
  reach(18);assert.equal(M.buyVisitorUpgrade(s,"lights"),false);
  reach(19);let cash=s.coins;assert.equal(M.buyVisitorUpgrade(s,"lights"),true);assert.equal(cash-s.coins,80000);
  s.visitorUpgrades.party=6;s.visitorUpgrades.crowd=8;
  assert.equal(M.buyVisitorUpgrade(s,"party"),false);assert.equal(M.buyVisitorUpgrade(s,"crowd"),false);
  reach(20);cash=s.coins;assert.equal(M.buyVisitorUpgrade(s,"party"),true);assert.equal(cash-s.coins,70000);
  cash=s.coins;assert.equal(M.buyVisitorUpgrade(s,"crowd"),true);assert.equal(cash-s.coins,120000);
});
