import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { farmPathEnd } from "../src/content/farm-layout.js";

function opened(tier=1) {
 const s=M.freshState();s.coins=100000;s.earned=200000;s.progression.claimed=Array.from({length:12},(_,i)=>i+1);s.progression.pending=[];s.visitorTimer=s.shop.arrivalTimer=1e6;s.hollowHouse.purchased=true;s.hollowHouse.status="ready";s.hollowHouse.open=true;s.hollowHouse.tier=tier;s.stock=[1000,1000,1000,1000];return s;
}
function guest(s,id=0) {
 const v={id,kind:id%10,age:0,budget:500,originalBudget:500,preferred:[0],basketLimit:1,basket:[],leaveAt:null,outcome:"shopping",needs:M.freshGuestNeeds(id),festival:{done:true},hollowConsidered:true};v.hollow=M.planHollowVisit(s,v);assert.ok(v.hollow);s.visitors.push(v);return v;
}
function tick(s,v,until=()=>v.hollow.done,limit=7000) {for(let n=0;n<limit&&!until();n++){s.time+=.1;M.tickHollowVisit(s,v,.1);}assert.ok(until(),"visit reaches the requested state");}
function allHaunts(s){for(const p of M.MAZE_PREFABS)assert.ok(M.buyMazePrefab(s,p.id));}

test("prefab purchases are tier-gated once-only transactions and toggles never charge again",()=>{
 const s=opened(),cash=s.coins;assert.equal(M.mazeScareRating(s),0);assert.equal(M.mazeFootfallBonus(s),0);
 assert.equal(M.buyMazePrefab(s,"whispering-portraits"),false);assert.equal(s.coins,cash);
 assert.ok(M.buyMazePrefab(s,"cobweb-canopy"));assert.equal(s.coins,cash-180);assert.deepEqual(s.hollowHouse.haunts,{owned:["cobweb-canopy"],active:["cobweb-canopy"]});
 assert.equal(M.buyMazePrefab(s,"cobweb-canopy"),false);assert.ok(M.setMazePrefabActive(s,"cobweb-canopy",false));assert.equal(M.mazeScareRating(s),0);assert.ok(M.setMazePrefabActive(s,"cobweb-canopy",true));assert.equal(s.coins,cash-180);
 s.paused=true;assert.equal(M.setMazePrefabActive(s,"cobweb-canopy",false),false);assert.equal(M.buyMazePrefab(s,"cobweb-canopy"),false);
});
test("scare raises bounded footfall only while open and restored",()=>{
 const s=opened(5);allHaunts(s);assert.equal(M.mazeScareRating(s),100);assert.equal(M.mazeFootfallBonus(s),.5);
 s.hollowHouse.haunts.active.push("cobweb-canopy","nonsense");assert.equal(M.mazeScareRating(s),100);
 M.setHollowOpen(s,false);assert.equal(M.mazeFootfallBonus(s),0);assert.equal(M.mazeScareRating(s),100);s.hollowHouse.status="derelict";assert.equal(M.mazeScareRating(s),0);
});
test("an overwhelmed guest pays for one run then runs to the physical west exit",()=>{
 const s=opened(5);allHaunts(s);const v=guest(s,0),money=s.coins;tick(s,v);
 assert.equal(v.hollow.fledHome,true);assert.equal(v.hollow.phase,"done");assert.ok(v.hollow.terror>60&&v.hollow.terror<=100);assert.equal(v.budget,494);
 assert.equal(s.hollowHouse.ticketsSold,1);assert.equal(s.hollowHouse.runHome,1);assert.equal(s.coins-money,6);assert.equal(s.hollowHouse.completed,1);
 assert.equal(v.hollow.x,-3);assert.ok(v.hollow.z>=30);assert.equal(M.chargeHollowTicket(s,v),0);
});
test("a brave repeat guest queues once more and pays exactly once per unique run",()=>{
 const s=opened(5);allHaunts(s);const v=guest(s,26),money=s.coins;tick(s,v);
 assert.equal(v.hollow.fleeing,false);assert.equal(v.hollow.repeats,1);assert.equal(v.hollow.runs,2);assert.equal(s.hollowHouse.repeatVisits,1);
 assert.equal(s.hollowHouse.ticketsSold,2);assert.equal(s.hollowHouse.income,12);assert.equal(s.coins-money,12);assert.equal(v.budget,488);assert.equal(s.hollowHouse.completed,2);
 assert.equal(new Set(s.hollowHouse.receipts.map(r=>r.visitId)).size,2);for(let i=0;i<10;i++)assert.equal(M.chargeHollowTicket(s,v),0);
});
test("requeue and haunts survive save/load with the same purse and no duplicate charge",()=>{
 const s=opened(5);allHaunts(s);const v=guest(s,26);tick(s,v,()=>v.hollow.phase==="requeue");assert.equal(v.budget,494);const saved=M.saveData(s),r=M.restoreState(JSON.parse(JSON.stringify(saved))),g=r.visitors.find(g=>g.id===26);
 assert.ok(g);assert.equal(g.hollow.phase,"requeue");assert.equal(g.hollow.charged,false);assert.equal(r.hollowHouse.ticketsSold,1);assert.deepEqual(r.hollowHouse.haunts,s.hollowHouse.haunts);tick(r,g);
 assert.equal(r.hollowHouse.ticketsSold,2);assert.equal(r.hollowHouse.repeatVisits,1);assert.equal(g.budget,488);assert.equal(r.hollowHouse.income,12);
});
test("terror and ticket progress pause and full active queues keep draining",()=>{
 const s=opened(5);allHaunts(s);const first=guest(s,26);tick(s,first,()=>first.hollow.phase==="maze");s.paused=true;const before=JSON.stringify(first.hollow);M.tickHollowVisit(s,first,100);assert.equal(JSON.stringify(first.hollow),before);s.paused=false;
 for(let id=0;id<60;id++){if(id===26)continue;const p={id,budget:500,preferred:[0],basketLimit:1,festival:{done:true},needs:M.freshGuestNeeds(id)};p.hollow=M.planHollowVisit(s,p);if(p.hollow)s.visitors.push(p);}
 for(let n=0;n<16000&&M.hollowOccupancy(s).total;n++){s.time+=.1;for(const v of s.visitors)M.tickHollowVisit(s,v,.1);const o=M.hollowOccupancy(s);assert.ok(o.foyer<=o.capacity&&o.maze<=o.mazeCapacity);}
 assert.equal(M.hollowOccupancy(s).total,0);assert.equal(s.hollowHouse.ticketsSold,s.hollowHouse.completed);assert.ok(s.hollowHouse.runHome>0);
});
test("old and malformed haunt saves retain decorations and sanitize ownership and fear",()=>{
 const s=opened(5),h=M.restoreHollowHouse({...s.hollowHouse,haunts:{owned:["cobweb-canopy","bad","cobweb-canopy"],active:["phantom-finale","cobweb-canopy","bad"]},runHome:-4,repeatVisits:NaN});
 assert.deepEqual(h.haunts,{owned:["cobweb-canopy"],active:["cobweb-canopy"]});assert.equal(h.runHome,0);assert.equal(h.repeatVisits,0);assert.deepEqual(h.foyer,s.hollowHouse.foyer);
 const old={...s.hollowHouse};delete old.haunts;delete old.runHome;delete old.repeatVisits;const r=M.restoreHollowHouse(old);assert.deepEqual(r.haunts,{owned:[],active:[]});assert.equal(r.runHome,0);assert.equal(r.foyer.placed.length,3);
});
test("purchased land moves both maze gates and restores old visits to the current exit",()=>{
 for(const tier of [3,4]){
  const s=opened(5);s.upgrades.plots=tier;allHaunts(s);const v=guest(s,0);
  assert.equal(v.hollow.route.at(-1)[1],farmPathEnd(s));tick(s,v);assert.equal(v.hollow.z,farmPathEnd(s));
  const old=opened(5),waiter=guest(old,26);waiter.hollow.phase="transfer-out";waiter.hollow.route=M.HOLLOW_RETURN.map(p=>[...p]);waiter.hollow.segment=3;waiter.hollow.x=-3;waiter.hollow.z=30;
  const raw=M.saveHollowVisitors(old),r=opened(5);r.upgrades.plots=tier;M.restoreHollowVisitors(raw,r);
  const restored=r.visitors[0];assert.equal(restored.hollow.z,farmPathEnd(r));assert.equal(restored.hollow.route.at(-1)[1],farmPathEnd(r));
  const twice=opened(5);twice.upgrades.plots=tier;M.restoreHollowVisitors(M.saveHollowVisitors(r),twice);assert.equal(twice.visitors[0].hollow.z,farmPathEnd(r));
 }
});
test("an unfinished VIP visit preserves the original purse and larger basket through restore",()=>{
 const s=opened(),v=guest(s,26);v.kind=10;v.vip=true;v.basketLimit=20;tick(s,v,()=>v.hollow.phase==="maze");
 const restored=opened();restored.hollowHouse=M.restoreHollowHouse(s.hollowHouse);M.restoreHollowVisitors(M.saveHollowVisitors(s),restored);const g=restored.visitors[0];
 assert.equal(g.id,v.id);assert.equal(g.vip,true);assert.equal(g.kind,10);assert.equal(g.basketLimit,20);assert.equal(g.budget,494);assert.equal(g.hollow.charged,true);tick(restored,g);assert.equal(g.budget,494);assert.equal(restored.hollowHouse.ticketsSold,1);
});
