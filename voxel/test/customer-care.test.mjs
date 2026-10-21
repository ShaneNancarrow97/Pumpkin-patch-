import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
const ready=()=>{const s=M.freshState();s.shop.unlocked=true;s.visitorTimer=s.shop.arrivalTimer=1e6;s.stock=[100,0,0,0];return s;};
const run=(s,seconds)=>{const events=[];for(let n=0;n<seconds*10;n++)events.push(...M.update(s,.1));return events;};
const receipt=()=>({amount:42,quantity:1,lines:[{variety:2,quantity:1,price:42}]});
test('care upgrades are gated, spend once per tier, respect pause and maximum',()=>{
 const s=M.freshState();s.coins=20000;assert.equal(M.buyCareUpgrade(s,'bags'),false);s.shop.unlocked=true;s.paused=true;assert.equal(M.buyCareUpgrade(s,'bags'),false);s.paused=false;
 for(const u of M.CARE_UPGRADES)for(const price of u.costs){const before=s.coins;assert.ok(M.buyCareUpgrade(s,u.id));assert.equal(s.coins,before-price);}
 assert.equal(M.buyCareUpgrade(s,'bags'),false);assert.equal(M.buyCareUpgrade(s,'missing'),false);assert.equal(s.customerCare.invested,8080);
});
test('bags increase actual capacity, keep budgets finite and never oversell',()=>{
 const a=ready(),b=ready();b.customerCare.bags=3;
 for(const s of[a,b]){s.shop.unlocked=false;s.nextVisitor=4;s.visitorTimer=.1;M.update(s,.1);s.visitorTimer=1e6;}
 const va=a.visitors[0],vb=b.visitors[0];assert.equal(vb.budget,va.budget);run(a,10);run(b,10);assert.equal(va.quantity,3);assert.equal(vb.quantity,4);assert.equal(vb.amount,48);assert.ok(vb.amount<=vb.originalBudget);assert.equal(b.stock[0],96);
 const c=ready();c.customerCare.bags=3;c.shop.arrivalTimer=.1;c.shop.capacityLevel=3;c.stock[0]=2;run(c,100);assert.ok(c.stock[0]>=0);assert.equal(c.shop.itemsSold,2);assert.equal(c.shop.income,24);
});
test('quality varies by sale, remains stable before payment and respects rarity minima',()=>{
 const s=ready(),v={id:4,budget:500},r=receipt();const q=M.quoteCustomerCare(s,r,v,'stall',0);assert.deepEqual(M.quoteCustomerCare(s,r,v,'stall',0),q);assert.equal(s.customerCare.serial,0);const grades=new Set();
 for(let i=0;i<100;i++){const result=M.settleCustomerCare(s,receipt(),{id:i,budget:500},'stall',0);assert.ok(result.quality>=2&&result.quality<=5);grades.add(result.quality);}assert.ok(grades.size>=3);assert.equal(s.customerCare.graded,100);
 const star={amount:70,quantity:1,lines:[{variety:3,quantity:1,price:70}]};assert.ok(M.quoteCustomerCare(s,star,v,'shop',0).quality>=3);
});
test('faster service improves tips, without exceeding spare cash or rerolling quality',()=>{
 const s=ready();s.customerCare.tipJar=3;let fast=0,slow=0;
 for(let i=0;i<1000;i++){s.customerCare.serial=i;const f=M.quoteCustomerCare(s,receipt(),{id:i,budget:100},'shop',2),l=M.quoteCustomerCare(s,receipt(),{id:i,budget:100},'shop',30);assert.equal(f.quality,l.quality);assert.ok(f.tip>=l.tip);fast+=f.tip;slow+=l.tip;assert.ok(f.tip<=25);assert.ok(M.quoteCustomerCare(s,receipt(),{id:i,budget:43},'shop',2).tip<=1);assert.equal(M.quoteCustomerCare(s,receipt(),{id:i,budget:42},'shop',2).tip,0);}assert.ok(fast>slow&&fast>0);
});
test('tips have a separate once-only ledger, independent of all goods takings',()=>{
 const s=ready();s.customerCare.tipJar=3;let total=0;
 for(let i=0;i<200;i++){const r=receipt(),v={id:i,budget:100},route=i%2?'shop':'stall',before=s.coins,result=M.settleCustomerCare(s,r,v,route,0);total+=result.tip;assert.equal(s.coins,before+result.tip);assert.strictEqual(M.settleCustomerCare(s,r,v,route,0),result);assert.equal(s.coins,before+result.tip);}
 assert.ok(total>0);assert.equal(M.totalTips(s),total);assert.equal(s.earned,total);assert.equal(s.stall.income,0);assert.equal(s.shop.income,0);assert.equal(s.stall.cocoa,0);assert.equal(s.customerCare.receipts.length,12);
});
test('real sales reconcile tips exactly, never on basket holds, and survive saves',()=>{
 const s=ready();s.customerCare.tipJar=3;s.customerCare.bags=1;s.shop.arrivalTimer=.1;s.visitorTimer=.1;s.shop.capacityLevel=3;s.stock=[1000,100,100,100];const before=s.coins,events=run(s,1200),tips=events.filter(e=>e.type==='sale').reduce((n,e)=>n+(e.tip??0),0);assert.ok(tips>0);assert.equal(M.totalTips(s),tips);assert.equal(s.coins-before,s.stall.income+s.shop.income+s.stall.cocoa+tips+s.progression.bonusEarned);assert.equal(s.customerCare.serial,s.stall.served+s.shop.served);assert.deepEqual(M.restoreState(JSON.parse(JSON.stringify(M.saveData(s)))).customerCare,s.customerCare);
 const old=M.saveData(s);old.version=6;delete old.customerCare;assert.deepEqual(M.restoreState(old).customerCare,M.freshCustomerCare());
});
test('malformed saves are bounded and favour collection is single-payment',()=>{
 const s=M.freshState();s.customerCare={bags:99,tipJar:-2,qualityTotal:Infinity,graded:2,serial:NaN,tips:{stall:-5,shop:Infinity},receipts:[null,{route:'bad'}]};const c=M.restoreState(s).customerCare;assert.equal(c.bags,3);assert.equal(c.tipJar,0);assert.equal(c.qualityTotal,0);assert.equal(c.serial,0);assert.deepEqual(c.tips,{stall:0,shop:0});assert.deepEqual(c.receipts,[]);
 const a=M.freshState();a.harvested=6;assert.equal(M.claimFavour(a,'basket'),25);assert.equal(M.claimFavour(a,'basket'),0);assert.equal(M.claimFavour(M.restoreState(M.saveData(a)),'basket'),0);
});
