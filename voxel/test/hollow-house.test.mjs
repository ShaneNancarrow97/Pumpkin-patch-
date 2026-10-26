import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { ROUTE_IN } from "../src/world.js";

function prepared() { const s=M.freshState();s.coins=100000;s.earned=200000;s.progression.claimed=Array.from({length:12},(_,i)=>i+1);s.festival.meadow=true;s.visitorTimer=s.shop.arrivalTimer=s.bigSpender.timer=1e6;return s; }
// Opening sends a small party for the maze (tested below); the other tests start without it.
function opened() { const s=prepared();assert.ok(M.buyHollowProperty(s));assert.ok(M.beginHollowRestoration(s));M.update(s,90);assert.ok(M.setHollowOpen(s,true));s.arriving=[];s.stock=[10000,10000,10000,10000];return s; }
// A guest bound for the maze (as the opening party is), up the west lane first.
function guest(s,id=0) { const v={id,kind:id%5,profile:0,age:0,budget:1000,originalBudget:1000,basketLimit:1,preferred:[0],basket:[],leaveAt:null,outcome:"shopping",spot:0,needs:M.freshGuestNeeds(id),hollowConsidered:true,forMaze:true};v.hollow=M.planHollowVisit(s,v);return v; }

test("the original farm property requires level and paid restoration before opening",()=>{
 const s=prepared();s.earned=25999;assert.equal(M.buyHollowProperty(s),false);s.earned=26000;s.festival.meadow=false;const cash=s.coins;assert.ok(M.buyHollowProperty(s));assert.equal(s.coins,cash-1750);assert.equal(M.setHollowOpen(s,true),false);assert.ok(M.beginHollowRestoration(s));s.paused=true;M.update(s,100);assert.equal(s.hollowHouse.restoreRemaining,90);s.paused=false;M.update(s,89);assert.equal(s.hollowHouse.status,"restoring");M.update(s,1);assert.ok(M.hollowReady(s));assert.equal(s.hollowHouse.open,false);assert.equal(M.beginHollowRestoration(s),false);
});
test("all five foyer tiers have level gates and paid capacity/space progression",()=>{
 const s=opened();for(let i=1;i<5;i++){const next=M.FOYER_TIERS[i],before=s.coins;s.earned=0;assert.equal(M.upgradeHollowFoyer(s),false);s.earned=200000;assert.ok(M.upgradeHollowFoyer(s));assert.equal(s.coins,before-next.cost);assert.equal(s.hollowHouse.tier,i+1);assert.equal(M.foyerLayout(s).capacity,next.capacity);}assert.equal(M.upgradeHollowFoyer(s),false);assert.equal(M.setHollowTicketPrice(s,25),false);assert.ok(M.setHollowTicketPrice(s,24));
});
test("a visit charges once from the same purse and completes while offscreen",()=>{
 const s=opened(),v=guest(s,0);assert.ok(v.hollow);s.visitors=[v];const coins=s.coins,earned=s.earned;for(let i=0;i<10000&&!v.hollow.done;i++)M.update(s,.1);assert.ok(v.hollow.done);assert.equal(s.hollowHouse.ticketsSold,1);assert.equal(s.hollowHouse.completed,1);assert.equal(s.hollowHouse.income,6);assert.equal(M.chargeHollowTicket(s,v),0);assert.equal(s.earned-earned,(s.coins-coins));assert.ok(v.budget<=994);assert.equal(s.hollowHouse.receipts[0].visitId,v.hollow.visitId);
});
test("bounded reception and maze continue draining under a crowd without return deadlock",()=>{
 const s=opened();for(let id=0;id<40;id++){const v=guest(s,id);if(v.hollow)s.visitors.push(v);}let peak=0;for(let i=0;i<18000;i++){M.update(s,.1);const o=M.hollowOccupancy(s);peak=Math.max(peak,o.foyer);assert.ok(o.foyer<=o.capacity);assert.ok(o.maze<=o.mazeCapacity);}assert.ok(peak>0);assert.ok(s.hollowHouse.completed>0);assert.equal(M.hollowOccupancy(s).total,0);assert.equal(s.hollowHouse.ticketsSold,s.hollowHouse.completed);
});
test("paid maze visits survive save/load without charging again or creating a second visitor",()=>{
 const s=opened(),v=guest(s,0);s.visitors=[v];for(let i=0;i<3000&&v.hollow.phase!=="maze";i++)M.update(s,.1);assert.equal(v.hollow.phase,"maze");const saved=M.saveData(s),income=s.hollowHouse.income;const loaded=M.restoreState(JSON.parse(JSON.stringify(saved)));assert.equal(loaded.visitors.length,1);loaded.visitorTimer=loaded.shop.arrivalTimer=1e6;assert.equal(loaded.visitors[0].hollow.charged,true);for(let i=0;i<1200;i++)M.update(loaded,.1);assert.equal(loaded.hollowHouse.income,income);assert.equal(loaded.hollowHouse.ticketsSold,1);assert.equal(loaded.hollowHouse.completed,1);
});
test("an approach reload keeps its original route and closing does not charge waiting guests",()=>{
 const s=opened(),v=guest(s,0);s.visitors=[v];M.update(s,2);const loaded=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.deepEqual(loaded.visitors[0].hollow.route,v.hollow.route);assert.ok(M.setHollowOpen(loaded,false));for(let i=0;i<1000;i++)M.update(loaded,.1);assert.equal(loaded.hollowHouse.ticketsSold,0);assert.equal(M.hollowOccupancy(loaded).total,0);
});
test("foyer stock, rotation, surfaces and wall decoration persist with collision-safe placement",()=>{
 const s=opened();assert.ok(M.buyFoyerDecor(s,"skull-plinth"));assert.equal(M.placeFoyerDecor(s,"skull-plinth",0,0),false);const p=M.placeFoyerDecor(s,"skull-plinth",-4,1.8,30);assert.ok(p);assert.equal(M.moveFoyerDecor(s,p.instance,0,0,30),false);assert.ok(M.moveFoyerDecor(s,p.instance,-4,1.8,75));assert.ok(M.buyFoyerFinish(s,"gothic-tiles"));assert.ok(M.equipFoyerFinish(s,"gothic-tiles"));assert.ok(M.buyFoyerDecor(s,"haunted-portrait"));const wall=M.placeFoyerDecor(s,"haunted-portrait",4.8,-2.8,0,{wall:"right",y:2});assert.ok(wall);assert.equal(wall.rotation,270);const r=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.deepEqual(r.hollowHouse.foyer,s.hollowHouse.foyer);assert.ok(M.storeFoyerDecor(r,p.instance));assert.equal(r.hollowHouse.foyer.ownedDecor[p.id],1);
});
test("restoring legacy saves adds a locked attraction and a free estate without changing core progress",()=>{
 const s=prepared();s.house.level=2;s.stock=[4,3,2,1];const old=M.saveData(s);delete old.estate;delete old.hollowHouse;delete old.hollowVisitors;old.version=7;const r=M.restoreState(old);assert.equal(r.version,M.STATE_VERSION);assert.equal(r.house.level,2);assert.deepEqual(r.stock,[...s.stock,...Array(Math.max(0,M.VARIETIES.length-s.stock.length)).fill(0)]);assert.equal(r.estate.placed.length,5);assert.equal(r.hollowHouse.purchased,false);assert.equal(r.hollowHouse.foyer.placed.length,3);
});

test("foyer expansion keeps portraits on their walls and preserves the exact saved arrangement",()=>{const s=opened();M.buyFoyerDecor(s,"haunted-portrait");const p=M.placeFoyerDecor(s,"haunted-portrait",4.87,-2.75,0,{wall:"right",y:2});assert.ok(p);for(let i=0;i<4;i++){assert.ok(M.upgradeHollowFoyer(s));assert.equal(p.x,M.foyerLayout(s).x1-.13);const r=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));assert.deepEqual(r.hollowHouse.foyer,s.hollowHouse.foyer);for(const q of s.hollowHouse.foyer.placed)assert.ok(M.foyerFits(s,q.id,q.x,q.z,q.rotation,q.instance,q));}});
test("a larger admission lane returns obstructed decor to owned storage without losing the purchase",()=>{const s=opened();M.buyFoyerDecor(s,"skull-plinth");const p=M.placeFoyerDecor(s,"skull-plinth",4.25,.9);assert.ok(p);const invested=s.hollowHouse.invested;assert.ok(M.upgradeHollowFoyer(s));assert.equal(s.hollowHouse.foyer.placed.some(q=>q.instance===p.instance),false);assert.equal(s.hollowHouse.foyer.ownedDecor[p.id],1);assert.equal(s.hollowHouse.lastEvent.stored,1);assert.ok(s.hollowHouse.invested>invested);});
// Every step of a maze guest's walk is on the farm: no leg leaves the map or jumps.
const onFarm=(m)=>m.x>=-3.01&&m.x<=32&&m.z>=9.4&&m.z<=M.GATE_Z+.01;
test("a maze-first guest comes up the west lane, then walks the lantern walk to the stall and buys a pumpkin",()=>{
 const s=opened(),v=guest(s,0);s.visitors=[v];assert.deepEqual(v.hollow.route[0],[-3,M.GATE_Z]);assert.equal(v.hollow.fromFront,true);
 let last=[v.hollow.x,v.hollow.z],sawWalk=false;
 for(let i=0;i<4000&&!(v.hollow.done&&v.bought!==null);i++){M.update(s,.1);const m=v.hollow;if(!m.done&&["approach","to-shop"].includes(m.phase)){assert.ok(onFarm(m),`${m.phase} at ${m.x},${m.z}`);assert.ok(Math.hypot(m.x-last[0],m.z-last[1])<.5,"no jumps");if(m.phase==="to-shop"&&Math.abs(m.z-11.1)<.2&&m.x>12&&m.x<28)sawWalk=true;}last=[m.x,m.z];}
 assert.ok(sawWalk,"crossed above the patch on the lantern walk");assert.equal(v.hollow.done,true);assert.equal(s.hollowHouse.ticketsSold,1);assert.notEqual(v.bought,null,"bought a pumpkin at the stall after the maze");
});
test("a shopper buys a pumpkin, walks over to the maze and goes home down the west lane",()=>{
 const s=opened();s.visitorTimer=0.1;let shopper=null;
 for(let i=0;i<20000&&!shopper;i++){M.update(s,.1);shopper=s.visitors.find(v=>v.hollow?.fromStall&&v.bought!==null);}
 assert.ok(shopper,"someone walked over after shopping");assert.deepEqual(shopper.hollow.route[0],M.counterPlace(shopper.spot));assert.deepEqual(shopper.hollow.route.at(-1),M.HOLLOW_PROPERTY.door);
 const id=shopper.id;let wentHome=false;
 for(let i=0;i<6000;i++){M.update(s,.1);const v=s.visitors.find(q=>q.id===id);if(!v){wentHome=true;break;}if(v.hollow.phase==="to-border")assert.ok(Math.abs(v.hollow.x+3)<.01||Math.abs(v.hollow.z-10.5)<.01||v.hollow.x>=-3&&v.hollow.x<=6.5,"down the west lane");}
 assert.ok(wentHome,"left the farm after the maze");assert.ok(s.hollowHouse.ticketsSold>=1);
});
test("opening the maze sends a little party straight up the west lane for it",()=>{
 const s=prepared();assert.ok(M.buyHollowProperty(s));assert.ok(M.beginHollowRestoration(s));M.update(s,90);s.stock=[10000,10000,10000,10000];
 assert.ok(M.setHollowOpen(s,true));assert.equal(s.arriving.filter(a=>a.forMaze).length,M.OPENING_PARTY);
 M.update(s,3);const party=s.visitors.filter(v=>v.forMaze);assert.equal(party.length,M.OPENING_PARTY);for(const v of party)assert.equal(v.hollow?.fromFront,true);
 assert.ok(M.setHollowOpen(s,true));assert.equal(s.arriving.filter(a=>a.forMaze).length,0,"only when it opens, not again while open");
});
test("switching the maze off and on again cannot conjure extra guests",()=>{
 const s=prepared();assert.ok(M.buyHollowProperty(s));assert.ok(M.beginHollowRestoration(s));M.update(s,90);s.visitorTimer=1e6;
 for(let i=0;i<30;i++){M.setHollowOpen(s,true);M.setHollowOpen(s,false);}
 assert.equal(s.arriving.filter(a=>a.forMaze).length,0,"closing turns the party back");
 M.setHollowOpen(s,true);assert.equal(s.arriving.filter(a=>a.forMaze).length,0,"no second party within the gap");
 assert.ok(s.visitors.length+s.arriving.length<=M.visitorCapacity(s));
});
test("an old save caught mid-transfer restores onto the new walks",()=>{
 const s=opened(),v=guest(s,0);s.visitors=[v];for(let i=0;i<3000&&v.hollow.phase!=="maze";i++)M.update(s,.1);
 const raw=JSON.parse(JSON.stringify(M.saveData(s))),m=raw.hollowVisitors[0].hollow;
 for(const [old,phase,at] of [["transfer-in","approach",[-3,M.GATE_Z]],["transfer-out","to-shop",null]]){
  Object.assign(m,{phase:old,charged:old==="transfer-out",x:-3,z:30});if(old==="transfer-in")m.charged=false;
  const r=M.restoreState(raw),h=r.visitors[0].hollow;assert.equal(h.phase,phase);if(at)assert.deepEqual([h.x,h.z],at);else assert.ok(h.x>30,"arriving at the stall");
  r.visitorTimer=r.shop.arrivalTimer=1e6;for(let i=0;i<4000&&!h.done;i++)M.update(r,.1);assert.ok(r.visitors.some(q=>q.id===v.id)||h.done);
 }
});

 test("closing the maze lets unpaid reception guests finish exiting",()=>{
 const s=opened(),v=guest(s,0);s.visitors=[v];v.hollow.phase="queue";v.hollow.elapsed=0;
 const cash=v.budget;M.setHollowOpen(s,false);
 for(let i=0;i<1200&&!v.hollow.done;i++) M.tickHollowVisit(s,v,.1);
 assert.equal(v.hollow.done,true);assert.equal(v.budget,cash);assert.equal(s.hollowHouse.ticketsSold,0);
 });

// Walks to and from Skyla's counter start and end at the guest's own place there,
// where the scene draws them standing (the end of the path in, fanned out by
// counterSide and COUNTER_GAP), never at its middle.
const near=(m,p)=>Math.hypot(m.x-p[0],m.z-p[1])<1e-9;
// A shopper who has bought at the stall and is still standing at their place.
function shopper(s,spot){const v=guest(s,100+spot);Object.assign(v,{hollow:null,spot,age:M.VISIT.arrive+.5,bought:0,quantity:1,outcome:"bought",leaveAt:M.VISIT.arrive+1});return v;}
test("each guest at the counter has their own place, where the scene draws them",()=>{
 assert.deepEqual(ROUTE_IN.at(-1),M.COUNTER_FRONT);
 const xs=Array.from({length:M.COUNTER_SPOTS},(_,i)=>M.counterPlace(i)[0]).sort((a,b)=>a-b);
 for(let i=1;i<xs.length;i++)assert.ok(Math.abs(xs[i]-xs[i-1]-M.COUNTER_GAP)<1e-9,"a place apart");
 assert.deepEqual(M.counterPlace(0),M.COUNTER_FRONT);assert.deepEqual(M.counterPlace("junk"),M.COUNTER_FRONT);
});
test("a shopper sets off for the maze from their own place at the counter, then along the walk",()=>{
 for(let spot=0;spot<M.COUNTER_SPOTS;spot++){
  const s=opened(),v=shopper(s,spot),place=M.counterPlace(spot);s.visitors=[v];
  for(let i=0;i<50&&!v.hollow;i++){M.update(s,.1);assert.ok(v.hollow||v.age<v.leaveAt,"never a step down the way home first");}
  const m=v.hollow,r=m.route;assert.equal(m.routeVersion,4);assert.deepEqual(r[0],place);assert.ok(near(m,place),`spot ${spot} sets off from where they stand`);
  assert.deepEqual(r[1],[place[0],11.1],"a step straight back from the counter");
  for(let i=2;i<r.length;i++)assert.ok(r[i][0]<=r[i-1][0],"then west along the walk, never back across the counter");
  assert.deepEqual(r.at(-1),M.HOLLOW_PROPERTY.door);
  let last=place;for(let i=0;i<400&&m.phase==="approach";i++){M.update(s,.1);assert.ok(Math.hypot(m.x-last[0],m.z-last[1])<.5,"no jumps");last=[m.x,m.z];}
  assert.notEqual(m.phase,"approach","reached the door");
 }
});
test("a maze-first guest walks the lantern walk back to their own place at the counter",()=>{
 for(const spot of [0,5,6]){
  const s=opened(),v=guest(s,spot);v.spot=spot;s.visitors=[v];let last=null;
  for(let i=0;i<4000&&!v.hollow.done;i++){M.update(s,.1);const m=v.hollow;if(m.phase==="to-shop"||m.done&&last){if(last)assert.ok(Math.hypot(m.x-last[0],m.z-last[1])<.5,"no jumps");last=[m.x,m.z];}}
  const place=M.counterPlace(spot),r=v.hollow.route;assert.ok(v.hollow.done);assert.ok(near(v.hollow,place),`spot ${spot} ends at their place`);
  assert.deepEqual(r[0],M.HOLLOW_PROPERTY.door);assert.deepEqual(r.at(-2),[place[0],11.1],"up to the counter from the walk, not across it");
 }
});
test("walks from the counter survive a reload, and version 3 saves carry on from its middle",()=>{
 const s=opened(),v=shopper(s,5);s.visitors=[v];for(let i=0;i<50&&!v.hollow;i++)M.update(s,.1);M.update(s,2);
 const raw=JSON.parse(JSON.stringify(M.saveData(s))),calm=r=>{r.visitorTimer=r.shop.arrivalTimer=r.bigSpender.timer=1e6;return r;};
 const r=M.restoreState(raw).visitors[0].hollow;assert.deepEqual(r.route,v.hollow.route);assert.equal(r.segment,v.hollow.segment);assert.ok(near(r,[v.hollow.x,v.hollow.z]));assert.equal(r.routeVersion,4);
 const m=raw.hollowVisitors[0].hollow;
 for(const [phase,route,segment,end] of [["approach",M.HOLLOW_LINK,2,M.HOLLOW_PROPERTY.door],["to-shop",M.HOLLOW_LINK_BACK,4,M.COUNTER_FRONT]]){
  Object.assign(m,{routeVersion:3,phase,fromStall:phase==="approach",route,segment,x:25,z:11.1});
  const old=calm(M.restoreState(raw)),h=old.visitors[0].hollow;assert.deepEqual(h.route,route);assert.equal(h.segment,segment);assert.deepEqual([h.x,h.z],[25,11.1]);assert.equal(h.routeVersion,3);
  let last=[25,11.1];for(let i=0;i<200&&h.phase===phase;i++){M.update(old,.1);if(h.phase===phase||h.done)assert.ok(Math.hypot(h.x-last[0],h.z-last[1])<.5,"no jumps");last=[h.x,h.z];}
  assert.ok(near(h,end),`${phase} carries on to the end of its old walk`);
 }
 // An older walk starts afresh once, then keeps its place on later reloads.
 Object.assign(m,{routeVersion:undefined,phase:"approach",fromStall:true,route:M.HOLLOW_LINK,segment:3,x:15,z:11});
 const fresh=calm(M.restoreState(raw));assert.ok(near(fresh.visitors[0].hollow,M.counterPlace(5)));assert.equal(fresh.visitors[0].hollow.routeVersion,4);
 M.update(fresh,1);const moved=fresh.visitors[0].hollow,again=M.restoreState(JSON.parse(JSON.stringify(M.saveData(fresh)))).visitors[0].hollow;assert.ok(near(again,[moved.x,moved.z]));
});
