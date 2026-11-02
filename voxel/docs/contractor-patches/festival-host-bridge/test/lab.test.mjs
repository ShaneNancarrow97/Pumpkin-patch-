import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab } from '../lab/scenario.js';
import { pantryCapacity } from '../../../../src/rules/cooking.js';

const COURT='midnight-court-banquet',MIST='lanterns-in-the-mist',WAGON='the-last-wagon';
const goal=(lab,id)=>lab.view().festival.active.goals.find(g=>g.id===id).value;
const ok=r=>{assert.equal(r.accepted,true,r.reason);return r;};
function open(theme=COURT,options){const lab=createLab(options);ok(lab.prepare(theme));ok(lab.start());return lab;}

test('real food payment debits finite purse and stock once; flush and replay cannot add cash',()=>{
 const lab=open(),before=lab.view().balances,stock=lab.world.kitchen.food['haunted-pie'];
 const paid=ok(lab.serveFood());
 assert.equal(paid.quantity,3);assert.equal(paid.amount,78);
 assert.equal(lab.world.kitchen.food['haunted-pie'],stock-paid.quantity);
 const guest=lab.view().guests[0];assert.equal(guest.id,'customer:0');assert.equal(guest.initialBudget-guest.budget,paid.amount);
 assert.equal(goal(lab,'court-supper'),3);assert.equal(goal(lab,'court-patrons'),1);
 const after=lab.view().balances;assert.equal(after.coins,before.coins+paid.amount);assert.equal(after.ledgerBalanced,true);
 ok(lab.flush());ok(lab.replayLast());assert.deepEqual(lab.view().balances,after);assert.equal(goal(lab,'court-supper'),3);
 assert.equal(lab.view().ledger.length,1);
});

test('the actual cocoa order includes its snack but only its allowed drink advances Mist',()=>{
 const lab=open(MIST),c=lab.world.festival.cocoa,drink=c.extras.deluxe.stock,snack=c.extras.smores.stock;
 const paid=ok(lab.serveCocoa());
 assert.deepEqual(paid.items.map(l=>l.id),['deluxe','smores']);assert.equal(paid.amount,12);
 assert.equal(c.extras.deluxe.stock,drink-1);assert.equal(c.extras.smores.stock,snack-1);
 assert.equal(goal(lab,'mist-warm-cups'),1);
 assert.equal(lab.view().guests[0].id,'visitor:0');assert.equal(lab.view().guests[0].spent,12);
 assert.equal(lab.view().balances.cocoaIncome,12);assert.equal(lab.view().balances.ledgerBalanced,true);
});

test('genuine garden picks and actual planted growth count during untimed preparation',()=>{
 const lab=createLab();ok(lab.prepare(MIST));
 const first=ok(lab.harvest());assert.equal(first.quantity,3);assert.equal(first.growthSeconds,0);
 const failed=lab.harvest();assert.equal(failed.accepted,false);assert.equal(failed.reason,'bed-not-ripe');
 assert.equal(goal(lab,'mist-garden-basket'),3);
 const second=ok(lab.harvest({grow:true})),third=ok(lab.harvest({grow:true}));
 assert.equal(second.growthSeconds,90);assert.equal(third.growthSeconds,90);
 assert.equal(lab.world.time,180);assert.equal(lab.world.kitchen.pantry.vegetables,9);
 assert.equal(goal(lab,'mist-garden-basket'),8,'goal caps without manufacturing another pick');
 assert.equal(lab.view().festival.active.elapsedSeconds,0);assert.equal(lab.view().festival.active.phase,'preparing');
 assert.equal(lab.view().ledger.length,3);assert.equal(lab.view().balances.ledgerBalanced,true);
});

test('garden overflow is real market income, separated from guest spending',()=>{
 const lab=createLab();ok(lab.prepare(MIST));lab.world.kitchen.pantry.vegetables=pantryCapacity(lab.world);
 const before=lab.world.coins,picked=ok(lab.harvest());
 assert.equal(picked.harvest.pantry,0);assert.equal(picked.harvest.sold,3);assert.ok(picked.amount>0);
 assert.equal(lab.world.coins,before+picked.amount);assert.equal(lab.view().balances.harvestIncome,picked.amount);
 assert.equal(lab.view().balances.guestSpend,0);assert.equal(lab.view().balances.ledgerBalanced,true);
});

test('paid deferred outcomes survive real game serialization, pause and retry without another purchase',()=>{
 const lab=open();ok(lab.setDeferred(true));const paid=ok(lab.serveFood());
 assert.equal(lab.view().outbox.pending,1);assert.equal(goal(lab,'court-supper'),0);
 const before=lab.view().balances,saved=lab.snapshot();assert.equal(saved.bridge.festival.active.phase,'paused');
 ok(lab.pause());assert.equal(ok(lab.flush()).held,1);
 ok(lab.restore(saved));assert.equal(lab.view().festival.active.phase,'paused');assert.equal(lab.view().outbox.pending,1);
 assert.deepEqual(lab.view().balances,before);ok(lab.resume());
 const delivery=ok(lab.flush());assert.equal(delivery.delivered.length,1);assert.equal(lab.view().outbox.pending,0);
 assert.equal(goal(lab,'court-supper'),paid.quantity);assert.deepEqual(lab.view().balances,before);
 ok(lab.replayLast());ok(lab.flush());assert.equal(goal(lab,'court-supper'),paid.quantity);assert.deepEqual(lab.view().balances,before);
});

test('one real paid hayride produces a ticket first, completion later and no invented final departure',()=>{
 const lab=open(WAGON),before=lab.view().balances,paid=ok(lab.runRide());
 assert.equal(paid.amount,8);assert.equal(paid.receipt.amount,8);assert.equal(paid.departure.routeLevelAtDeparture,2);
 assert.equal(paid.ticketGoalValues['wagon-full-trail'],0);assert.equal(paid.ticketGoalValues['wagon-smooth-boarding'],0);
 assert.equal(goal(lab,'wagon-full-trail'),1);assert.equal(goal(lab,'wagon-smooth-boarding'),1);assert.equal(goal(lab,'wagon-fond-goodbyes'),0);
 assert.ok(paid.simulationSeconds>130);assert.equal(lab.view().balances.coins,before.coins+8);
 assert.equal(lab.view().guests[0].spent,8);assert.equal(lab.world.hayride.completed,1);assert.equal(lab.world.hayride.ticketsSold,1);
 assert.equal(lab.view().balances.ledgerBalanced,true);assert.equal(lab.world.visitors.length,0,'private actor retires after physical return, without a final-departure fact');
 const after=lab.view().balances;ok(lab.replayLast());assert.deepEqual(lab.view().balances,after);assert.equal(goal(lab,'wagon-full-trail'),1);
});

test('ride credit uses captured route rather than a subsequently changed private configuration',()=>{
 const lab=open(WAGON);lab.world.hayride.routeLevel=0;
 const result=ok(lab.runRide({onDeparture({world,departure}){assert.equal(departure.routeLevelAtDeparture,0);world.hayride.routeLevel=2;}}));
 assert.equal(result.departure.routeLevelAtDeparture,0);assert.equal(lab.world.hayride.routeLevel,2);
 assert.equal(goal(lab,'wagon-full-trail'),0);assert.equal(goal(lab,'wagon-smooth-boarding'),1);
 assert.equal(lab.view().balances.ledgerBalanced,true);
});

test('a trip bound before manual pause can finish while its confirmed outcomes remain held',()=>{
 const lab=open(WAGON),paid=ok(lab.runRide({onDeparture(){ok(lab.pause());}}));
 assert.ok(paid.simulationSeconds>130);assert.equal(lab.view().festival.active.phase,'paused');
 assert.equal(lab.view().outbox.pending,1,'ticket delivered before pause; completion queued after it');
 assert.equal(goal(lab,'wagon-full-trail'),0);const before=lab.view().balances;
 ok(lab.resume());ok(lab.flush());assert.equal(goal(lab,'wagon-full-trail'),1);assert.deepEqual(lab.view().balances,before);
});

test('outbox preflight prevents a synchronous private purchase that cannot retain its outcome',()=>{
 const lab=open(COURT,{capacity:1});ok(lab.setDeferred(true));ok(lab.serveFood());
 const before=structuredClone(lab.world),balances=lab.view().balances;
 assert.equal(lab.serveCocoa().reason,'queue-full');assert.equal(lab.runRide().reason,'queue-full');
 assert.deepEqual(lab.world,before);assert.deepEqual(lab.view().balances,balances);
 assert.equal(lab.end().reason,'pending-outcomes');ok(lab.flush());ok(lab.end());
});

test('failed payments and global pause never produce normalized receipts or income',()=>{
 const lab=open(),before=lab.view().balances;
 assert.equal(lab.serveFood({budget:0}).accepted,false);assert.equal(lab.serveCocoa({budget:0}).accepted,false);assert.equal(lab.runRide({budget:0}).accepted,false);
 assert.deepEqual(lab.view().balances,before);assert.equal(lab.view().ledger.length,0);assert.equal(lab.view().outbox.pending,0);
 ok(lab.setWorldPaused(true));const snapshot=structuredClone(lab.world);
 assert.equal(lab.serveFood().reason,'game-paused');assert.equal(lab.harvest({grow:true}).reason,'game-paused');
 assert.deepEqual(lab.world,snapshot);ok(lab.setWorldPaused(false));assert.equal(lab.view().balances.ledgerBalanced,true);
});

test('saved checkpoints are detached, and incompatible/corrupt imports preserve the current lab',()=>{
 const lab=open();ok(lab.serveFood());const saved=lab.snapshot(),unchanged=structuredClone(saved);
 lab.world.kitchen.food['haunted-pie']=0;lab.world.coins+=999;
 assert.deepEqual(saved,unchanged,'saveData references must not leak into the envelope');
 ok(lab.restore(saved));assert.equal(lab.view().balances.ledgerBalanced,true);
 const baseline=lab.snapshot(),future=structuredClone(baseline);future.bridge.version=99;
 assert.equal(lab.restore(future).compatible,false);assert.deepEqual(lab.snapshot(),baseline);
 const bad=structuredClone(baseline);bad.lab.guestSpend+=1;
 assert.equal(lab.restore(bad).accepted,false);assert.deepEqual(lab.snapshot(),baseline);
 const mismatched=structuredClone(baseline);mismatched.lab.selectedTheme=MIST;
 assert.equal(lab.restore(mismatched).reason,'inconsistent-selected-evening');assert.deepEqual(lab.snapshot(),baseline);
});

test('all three themes can finish from actual service/harvest/ride outcomes without fabricated departures',()=>{
 for(const theme of [COURT,MIST,WAGON]){
  const lab=createLab();ok(lab.prepare(theme));
  if(theme===MIST)for(let i=0;i<3;i++)ok(lab.harvest({grow:true}));
  ok(lab.start());
  if(theme===MIST)for(let i=0;i<16;i++)ok(lab.serveCocoa());
  else for(let i=0;i<(theme===COURT?4:2);i++)ok(lab.serveFood());
  for(let i=0;i<(theme===WAGON?16:12);i++)ok(lab.runRide());
  const v=lab.view().festival;assert.equal(v.active.canFinish,true,theme);
  assert.equal(v.active.goals.find(g=>g.id.endsWith('goodbyes')).value,0);
  assert.equal(lab.view().balances.ledgerBalanced,true);
  ok(lab.end());const before=lab.view().balances;ok(lab.claim(theme));
  assert.deepEqual(lab.view().balances,before);assert.equal(lab.view().festival.ownedRewards.length,1);
  assert.equal(lab.claim(theme).reason,'already-claimed');assert.equal(lab.world.house.owned.some(id=>id.startsWith('contract-trophy-')),false);
 }
});
