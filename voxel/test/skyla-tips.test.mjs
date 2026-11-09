import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';

const basket=()=>({amount:42,quantity:1,lines:[{variety:2,quantity:1,price:42}]});
function ready(){const s=M.freshState();s.shop.unlocked=true;s.visitorTimer=s.shop.arrivalTimer=1e6;return s;}

test('the original three tip tiers retain their exact prices and deterministic payouts',()=>{
  const s=ready(),jar=M.CARE_UPGRADES.find(u=>u.id==='tipJar');
  assert.deepEqual(jar.costs.slice(0,3),[250,1000,3800]);
  // Recorded from the original implementation before extending its tiers.
  const expected=[[0,0],[280,94],[639,131],[1106,175]];
  for(let tier=0;tier<=3;tier++){
    s.customerCare.tipJar=tier;let fast=0,slow=0;
    for(let i=0;i<1000;i++){s.customerCare.serial=i;fast+=M.quoteCustomerCare(s,basket(),{id:i,budget:100},'shop',2).tip;slow+=M.quoteCustomerCare(s,basket(),{id:i,budget:100},'shop',30).tip;}
    assert.deepEqual([fast,slow],expected[tier],'tier '+tier+' remains unchanged');
  }
});

test('the two additional upgrades spend once, stop at five and round-trip through the current save format',()=>{
  let s=ready();s.coins=50000;s.customerCare.tipJar=3;
  assert.equal(M.careUpgradeCost(s,'tipJar'),9500);
  s.paused=true;assert.equal(M.buyCareUpgrade(s,'tipJar'),false);s.paused=false;
  s.shop.unlocked=false;assert.equal(M.buyCareUpgrade(s,'tipJar'),false);s.shop.unlocked=true;
  s.coins=9499;assert.equal(M.buyCareUpgrade(s,'tipJar'),false);s.coins=50000;
  const before=s.coins;assert.equal(M.buyCareUpgrade(s,'tipJar'),true);assert.equal(s.customerCare.tipJar,4);assert.equal(s.coins,before-9500);
  s=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.equal(s.version,M.STATE_VERSION);assert.equal(s.customerCare.tipJar,4);
  assert.equal(M.careUpgradeCost(s,'tipJar'),22000);assert.equal(M.buyCareUpgrade(s,'tipJar'),true);assert.equal(s.customerCare.tipJar,5);
  const saved=JSON.stringify(s);assert.equal(M.buyCareUpgrade(s,'tipJar'),false);assert.equal(M.careUpgradeCost(s,'tipJar'),undefined);assert.equal(JSON.stringify(s),saved);
  assert.equal(s.customerCare.invested,31500);assert.equal(s.coins,before-31500);
  const raw=M.saveData(s);raw.customerCare.tipJar=99;assert.equal(M.restoreState(raw).customerCare.tipJar,5);assert.ok(M.STATE_VERSION>=19);
});

test('new tiers improve real tips without rerolling quality or exceeding the remaining wallet',()=>{
  const s=ready(),totals=[];
  for(let tier=3;tier<=5;tier++){
    s.customerCare.tipJar=tier;let fast=0,slow=0;
    for(let i=0;i<1200;i++){
      s.customerCare.serial=i;const visitor={id:i,budget:100},quick=M.quoteCustomerCare(s,basket(),visitor,'shop',2),waiting=M.quoteCustomerCare(s,basket(),visitor,'shop',30);
      assert.equal(quick.quality,waiting.quality);assert.ok(quick.tip>=waiting.tip);assert.ok(quick.tip<=25);
      assert.equal(M.quoteCustomerCare(s,basket(),{id:i,budget:42},'shop',2).tip,0);
      assert.ok(M.quoteCustomerCare(s,basket(),{id:i,budget:43},'shop',2).tip<=1);
      const rare=M.quoteCustomerCare(s,{amount:500,quantity:5,lines:[{variety:4,quantity:5,price:100}]},{id:i,budget:2000},'stall',0);
      assert.ok(rare.tip<=25,'large premium baskets keep the existing tip cap');assert.ok(rare.quality>=4);
      fast+=quick.tip;slow+=waiting.tip;
    }
    totals.push({fast,slow});
  }
  assert.ok(totals[1].fast>totals[0].fast);assert.ok(totals[2].fast>totals[1].fast);
  assert.ok(totals.every(t=>t.fast>t.slow));
});

test('the menu example uses the real conditional offer and describes quality and service rather than guaranteed income',()=>{
  const s=ready(),before=JSON.stringify(s);
  assert.deepEqual(M.tipJarOffer(3,{amount:100,quality:4}),{chance:.445,amount:9,quickSeconds:8});
  assert.deepEqual(M.tipJarOffer(4,{amount:100,quality:4}),{chance:.534,amount:11,quickSeconds:8});
  assert.equal(M.tipJarOffer(5,{amount:100,quality:4}).amount,14);
  assert.equal(M.tipJarOffer(4,{amount:100,quality:5}).chance,.6);
  assert.equal(M.tipJarOffer(5,{amount:100,quality:5}).chance,.68);
  assert.equal(M.tipJarOffer(5,{amount:100,quality:4,route:'stall'}).quickSeconds,4);
  const quick=M.tipJarOffer(5,{amount:100,quality:4}),slow=M.tipJarOffer(5,{amount:100,quality:4,serviceSeconds:30}),rustic=M.tipJarOffer(5,{amount:100,quality:1});
  assert.ok(quick.chance>slow.chance&&quick.amount>slow.amount);assert.ok(quick.chance>rustic.chance&&quick.amount>rustic.amount);
  assert.equal(M.tipJarOffer(5,{amount:1000,spare:1}).amount,1);assert.equal(M.tipJarOffer(5,{amount:1000,spare:0}).amount,0);
  assert.equal(JSON.stringify(s),before,'reading upgrade benefits cannot award, spend or reroll anything');
});

test('top-tier real sales keep tips separate, pay once and preserve their ledger after saving',()=>{
  const s=ready();s.customerCare.tipJar=5;s.customerCare.bags=3;s.shop.capacityLevel=3;s.shop.arrivalTimer=.1;s.visitorTimer=.1;s.stock=[1000,1000,1000,1000,1000];
  const before=s.coins,events=[];for(let i=0;i<3000;i++)events.push(...M.update(s,.1));
  const tips=events.filter(e=>e.type==='sale').reduce((n,e)=>n+(e.tip??0),0);
  assert.ok(tips>0);assert.equal(M.totalTips(s),tips);
  assert.equal(s.coins-before,s.stall.income+s.shop.income+s.stall.cocoa+tips+s.progression.bonusEarned);
  assert.equal(s.customerCare.serial,s.stall.served+s.shop.served);
  const receipt=basket(),visitor={id:999,budget:100};M.settleCustomerCare(s,receipt,visitor,'shop',0);
  const coins=s.coins,total=M.totalTips(s),serial=s.customerCare.serial;
  M.settleCustomerCare(s,receipt,visitor,'shop',0);assert.equal(s.coins,coins);assert.equal(M.totalTips(s),total);assert.equal(s.customerCare.serial,serial);
  assert.deepEqual(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).customerCare,s.customerCare);
});
