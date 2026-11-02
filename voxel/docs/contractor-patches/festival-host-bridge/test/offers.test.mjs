import test from 'node:test';
import assert from 'node:assert/strict';
import definitions from '../../late-game-support/data/festival-themes.json' with {type:'json'};
import { createLab } from '../lab/scenario.js';
import { serviceOffers } from '../lab/offers.js';

const theme=definitions.themes[0];
function open(t=theme){const lab=createLab();assert.equal(lab.prepare(t.id).accepted,true);assert.equal(lab.start().accepted,true);return lab;}

test('offer inspection cannot reserve real stock, allocate IDs, create receipts or advance time',()=>{
 const lab=open(),before=structuredClone(lab.world),bridge=structuredClone(lab.bridge);
 const one=serviceOffers(lab.world,theme),two=serviceOffers(lab.world,theme);
 assert.deepEqual(one,two);assert.deepEqual(lab.world,before);assert.deepEqual(lab.bridge,bridge);
 assert.equal(one.food.available,true);assert.equal(one.food.stock,12);assert.equal(one.food.quantity,3);assert.equal(one.food.amount,78);
 assert.equal(one.cocoa.amount,12);assert.deepEqual(one.cocoa.items.map(p=>p.id),['deluxe','smores']);
 assert.equal(one.garden.phase,'ready');assert.equal(one.ride.routeLevel,2);assert.equal(one.ride.amount,8);
});

test('quotes match the subsequent actual default payment across every theme',()=>{
 for(const t of definitions.themes){
  const lab=open(t),offer=serviceOffers(lab.world,t),food=lab.serveFood();
  assert.equal(food.accepted,true);assert.equal(food.amount,offer.food.amount);assert.equal(food.quantity,offer.food.quantity);assert.equal(food.receipt.recipe,offer.food.recipeId);
  const cocoaQuote=serviceOffers(lab.world,t).cocoa,cocoa=lab.serveCocoa();
  assert.equal(cocoa.accepted,true);assert.equal(cocoa.amount,cocoaQuote.amount);assert.equal(cocoa.quantity,cocoaQuote.quantity);assert.deepEqual(cocoa.items,cocoaQuote.items.map(({id,price})=>({id,price})));
  const rideQuote=serviceOffers(lab.world,t).ride,ride=lab.runRide();
  assert.equal(ride.accepted,true);assert.equal(ride.amount,rideQuote.amount);assert.equal(ride.departure.routeLevelAtDeparture,rideQuote.routeLevel);
 }
});

test('partial food stock changes the quote quantity and a sold-out dish is unavailable',()=>{
 const lab=open();lab.world.kitchen.food[theme.recipeIds[0]]=2;
 let offers=serviceOffers(lab.world,theme);assert.equal(offers.food.stock,2);assert.equal(offers.food.quantity,2);assert.equal(offers.food.amount,52);
 const paid=lab.serveFood();assert.equal(paid.amount,52);assert.equal(paid.quantity,2);
 offers=serviceOffers(lab.world,theme);assert.equal(offers.food.stock,0);assert.equal(offers.food.available,false);assert.equal(offers.food.amount,null);assert.equal(offers.food.quantity,0);
});

test('sold-out cocoa does not invent an order or leave mutable stock references',()=>{
 const lab=open(),c=lab.world.festival.cocoa;
 c.stock=0;for(const extra of Object.values(c.extras))extra.stock=0;
 const offers=serviceOffers(lab.world,theme);assert.equal(offers.cocoa.available,false);assert.equal(offers.cocoa.amount,null);assert.deepEqual(offers.cocoa.items,[]);
 c.stock=2;const ready=serviceOffers(lab.world,theme);assert.equal(ready.cocoa.available,true);assert.equal(ready.cocoa.items[0].id,'cocoa');
 ready.cocoa.items[0].stock=999;ready.cocoa.items[0].price=999;
 assert.equal(c.stock,2);assert.notEqual(c.price,999);
});

test('paused worlds cannot advertise an available operation and inspection remains detached',()=>{
 const lab=open();lab.world.paused=true;const before=structuredClone(lab.world),offers=serviceOffers(lab.world,theme);
 for(const offer of Object.values(offers)){assert.equal(offer.available,false);assert.equal(offer.reason,'world-paused');}
 assert.deepEqual(lab.world,before);
});

test('idle theme selection quotes that recipe without changing the private shelf',()=>{
 const lab=createLab();lab.world.kitchen.displays=['moonlight-tart',null];
 const before=structuredClone(lab.world);
 for(const t of definitions.themes){const offers=serviceOffers(lab.world,t,{previewSelection:true});assert.equal(offers.food.recipeId,t.recipeIds[0]);assert.equal(offers.food.available,true);}
 assert.equal(serviceOffers(lab.world,theme).food.recipeId,'moonlight-tart','default inspection preserves the actual current shelf');
 assert.deepEqual(lab.world,before);
});

test('an accepted restored alternate display quotes the actual dish, stock and subsequent payment',()=>{
 const lab=open(),snapshot=lab.snapshot();snapshot.game.kitchen.displays=['moonlight-tart',null];
 assert.equal(lab.restore(snapshot).accepted,true);assert.equal(lab.resume().accepted,true);
 const before=structuredClone(lab.world),offer=serviceOffers(lab.world,theme).food;
 assert.equal(offer.recipeId,'moonlight-tart');assert.equal(offer.label,'Moonlight tart');
 assert.equal(offer.stock,12,'the copied quote must not subtract its own new hold');
 assert.equal(offer.amount,81);assert.equal(offer.quantity,3);assert.deepEqual(lab.world,before);
 const payment=lab.serveFood();assert.equal(payment.accepted,true);
 assert.equal(payment.amount,offer.amount);assert.equal(payment.receipt.recipe,offer.recipeId);
 assert.equal(payment.entry.recipeId,offer.recipeId);assert.equal(payment.quantity,offer.quantity);
});

test('missing beds and unavailable rides are honest while invalid venue inputs are finite',()=>{
 const lab=open();lab.world.estate.placed=[];lab.world.hayride.open=false;
 const offers=serviceOffers(lab.world,theme);assert.equal(offers.garden.available,false);assert.equal(offers.garden.reason,'missing-bed');assert.equal(offers.ride.available,false);assert.equal(offers.ride.amount,null);
 for(const input of [[null,theme],[lab.world,null],[lab.world,{recipeIds:[]}]] )for(const offer of Object.values(serviceOffers(...input))){assert.equal(offer.available,false);assert.equal(offer.reason,'invalid-venue');}
});
