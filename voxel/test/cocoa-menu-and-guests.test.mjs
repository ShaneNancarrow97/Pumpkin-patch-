import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { MEADOW_EXIT, pathDistance } from '../src/content/festival-meadow.js';
const setup=()=>{const s=M.freshState();s.festival.meadow=true;s.festival.cocoa.level=3;s.festival.cocoa.stock=10;s.coins=1000;for(const p of M.COCOA_SPECIALS)s.festival.cocoa.extras[p.id].stock=10;return s;};
const guest=(id=0)=>({id,budget:100,basketLimit:1,preferred:[0],needs:{thirst:90,hunger:90,happiness:60,value:1},originalBudget:100});
test('premium menu is tier-gated, stock costs money, and each price can be set within bounds',()=>{
 const s=M.freshState();s.coins=1000;assert.equal(M.restockCocoaSpecial(s,'flake'),0);assert.equal(M.setCocoaSpecialPrice(s,'flake',7),false);s.festival.meadow=true;s.festival.cocoa.level=2;
 assert.equal(M.restockCocoaSpecial(s,'flake'),10);assert.equal(s.coins,970);assert.equal(s.festival.cocoa.supplies,30);assert.equal(s.festival.cocoa.extras.flake.supplies,30);
 assert.equal(M.restockCocoaSpecial(s,'midnight'),0);assert.equal(M.setCocoaSpecialPrice(s,'flake',9),true);assert.equal(M.setCocoaSpecialPrice(s,'flake',11),false);assert.equal(M.setCocoaSpecialPrice(s,'flake',5.5),false);
 s.paused=true;assert.equal(M.restockCocoaSpecial(s,'deluxe'),0);assert.equal(M.setCocoaSpecialPrice(s,'flake',5),false);
});
test('price changes demand; thirst and hunger affect what guests choose',()=>{
 const cheap=setup(),expensive=setup();for(const s of[cheap,expensive]){s.festival.cocoa.stock=0;for(const p of M.COCOA_SPECIALS)s.festival.cocoa.extras[p.id].stock=p.id==='midnight'?10:0;}
 M.setCocoaSpecialPrice(cheap,'midnight',6);M.setCocoaSpecialPrice(expensive,'midnight',14);let low=0,high=0;
 for(let id=0;id<100;id++){const v=guest(id);v.needs=M.freshGuestNeeds(id);low+=M.quoteStandOrder(cheap,v).length;high+=M.quoteStandOrder(expensive,v).length;}assert.ok(low>high&&low>0);
 const s=setup(),v=guest();v.needs.thirst=5;let order=M.quoteStandOrder(s,v);assert.ok(order.length&&order.every(p=>p.id==='smores'));v.needs.hunger=5;assert.equal(M.quoteStandOrder(s,v).length,0);
});
test('drinks and snacks pay once, satisfy needs, preserve pumpkin money and reconcile goods income',()=>{
 const s=setup(),v=guest();s.stock[0]=10;const order=M.quoteStandOrder(s,v);assert.ok(order.some(l=>l.id==='smores'));assert.ok(order.some(l=>l.id!=='smores'));const before=s.coins,budget=v.budget,total=order.reduce((n,l)=>n+l.price,0);
 assert.equal(M.payStandOrder(s,v,order),total);assert.equal(s.coins,before+total);assert.equal(v.budget,budget-total);assert.ok(v.budget>=12);assert.ok(v.needs.thirst<90&&v.needs.hunger<90&&v.needs.happiness>60);assert.equal(s.festival.cocoa.gross,total);assert.equal(s.stall.cocoa,total);assert.equal(s.shop.income,0);assert.equal(M.totalTips(s),0);assert.equal(M.payStandOrder(s,v,order),0);assert.equal(s.coins,before+total);
});
test('stale prices or empty stock cannot be charged, and special stock/prices survive migration',()=>{
 const s=setup(),v=guest(),order=M.quoteStandOrder(s,v);const chosen=order[0];s.festival.cocoa.prices[chosen.id]++;assert.equal(M.payStandOrder(s,v,order),0);assert.equal(v.budget,100);
 M.setCocoaSpecialPrice(s,'deluxe',11);M.restockCocoaSpecial(s,'deluxe');const raw=M.saveData(s),loaded=M.restoreState(raw);assert.deepEqual(loaded.festival.cocoa.extras,s.festival.cocoa.extras);assert.deepEqual(loaded.festival.cocoa.prices,s.festival.cocoa.prices);
 raw.festival.cocoa.prices={deluxe:Infinity,smores:-8,flake:99};raw.festival.cocoa.extras.deluxe.stock=999;const c=M.restoreState(raw).festival.cocoa;assert.equal(c.prices.deluxe,7);assert.equal(c.prices.smores,3);assert.equal(c.prices.flake,10);assert.equal(c.extras.deluxe.stock,30);
});
test('visitors keep real cash after pumpkin purchases and leave beyond the village gate',()=>{
 const s=M.freshState();s.stock[0]=10;s.visitorTimer=.1;M.update(s,.1);s.visitorTimer=1e6;const v=s.visitors[0];for(let n=0;n<90;n++)M.update(s,.1);assert.equal(v.budget,v.originalBudget-v.amount-v.tip);assert.ok(v.needs);assert.match(M.guestHeading(v),/village/);
 s.festival.meadow=true;assert.equal(M.visitorLeaveSeconds(s),9);assert.ok(MEADOW_EXIT.some(p=>p[0]===53.6&&p[1]===6.6));assert.ok(MEADOW_EXIT.at(-1)[0]>M.fieldWidth(s));for(const[x,z]of MEADOW_EXIT)assert.ok(pathDistance(x,z)<.001);
});
