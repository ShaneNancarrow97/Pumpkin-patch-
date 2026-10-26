import test from "node:test";
import assert from "node:assert/strict";
import * as H from "../src/rules/hayride.js";
import { HAYRIDE_SITE, hayrideFarmConvoyPose, hayrideGuestPose } from "../src/content/hayride-layout.js";

function prepared(fleet=false){
  const s={hayride:H.freshHayride(),hollowHouse:{purchased:true,status:"ready"},coins:100000,earned:200000,progression:{bonusEarned:0},visitors:[],arriving:[],holds:[],time:0,nextVisitor:0,nextParty:0,paused:false};
  assert.ok(H.buyHayride(s));assert.ok(H.upgradeHayride(s));
  if(fleet)assert.ok(H.buyHayrideOperation(s,"fleet"));
  assert.ok(H.setHayrideOpen(s,true));s.arriving=[];return s;
}
function guest(s,id=s.visitors.length){
  const v={id,kind:id%15,budget:100,originalBudget:100,basket:[],preferred:[0],basketLimit:1,spot:id%8,needs:{happiness:70},festival:{done:true}};
  v.hayride=H.planHayrideVisit(s,v,"arrival",{force:true,approachSeconds:.1,returnSeconds:.1});assert.ok(v.hayride);s.visitors.push(v);return v;
}
function advance(s,n){s.time+=n;const e=[];H.updateHayride(s,n,e);return e;}
function restored(s){
  const r=prepared(false);r.hayride=H.restoreHayride(JSON.parse(JSON.stringify(s.hayride)));r.visitors=[];r.coins=s.coins;r.earned=s.earned;r.time=s.time;
  H.restoreHayrideVisitors(JSON.parse(JSON.stringify(H.saveHayrideVisitors(s))),r);return r;
}
test("the second tractor is a paid late-game upgrade with no automatic legacy grant",()=>{
  const s=prepared();s.earned=109999;const cash=s.coins;assert.equal(H.buyHayrideOperation(s,"fleet"),false);assert.equal(s.coins,cash);
  s.earned=110000;s.paused=true;assert.equal(H.buyHayrideOperation(s,"fleet"),false);s.paused=false;
  assert.ok(H.buyHayrideOperation(s,"fleet"));assert.equal(s.coins,cash-12000);assert.equal(H.buyHayrideOperation(s,"fleet"),false);
  assert.equal(H.hayrideFleetSize(s),2);assert.notEqual(s.hayride.convoy.runId,s.hayride.secondConvoy.runId);
  const old=H.restoreHayride({...s.hayride,fleet:undefined,secondConvoy:undefined,dispatch:undefined});
  assert.equal(old.fleet,0);assert.equal(old.secondConvoy,null);assert.equal(old.dispatch,0);
});
test("two independent wagons board more waiting guests without creating money or skipping their rides",()=>{
  const one=prepared(),two=prepared(true);
  for(let i=0;i<12;i++){guest(one,i);guest(two,i);}
  const before=two.coins;advance(one,20);advance(two,20);
  assert.equal(one.hayride.ticketsSold,6);assert.equal(two.hayride.ticketsSold,12);
  assert.equal(two.coins-before,96);assert.equal(two.hayride.completed,0);
  assert.equal(H.hayrideConvoys(two).filter(c=>c.phase==="circuit").length,2);
  assert.equal(new Set(H.hayrideConvoys(two).flatMap(c=>c.manifest.map(r=>r.visitId))).size,12);
  assert.ok(two.visitors.every(v=>v.budget===92));
  advance(two,100);assert.equal(two.hayride.completed,12);assert.equal(two.hayride.ticketsSold,12);
});
test("a second convoy can leave while the first is partway through the woods",()=>{
  const s=prepared();for(let i=0;i<6;i++)guest(s,i);advance(s,15);assert.equal(s.hayride.convoy.phase,"circuit");
  H.buyHayrideOperation(s,"fleet");for(let i=6;i<12;i++)guest(s,i);advance(s,12);
  assert.equal(s.hayride.secondConvoy.phase,"circuit");
  assert.ok(s.hayride.convoy.elapsed>s.hayride.secondConvoy.elapsed+10);
  assert.notEqual(s.hayride.convoy.runId,s.hayride.secondConvoy.runId);
});
test("both paid manifests and boarding assignments survive reload without a second debit",()=>{
  for(const n of [.2,2,9,20,105]){
    const s=prepared(true);for(let i=0;i<12;i++)guest(s,i);advance(s,n);
    const r=restored(s);assert.equal(r.visitors.length,12);const before=r.coins,paid=r.hayride.ticketsSold;
    advance(r,350);assert.equal(r.hayride.completed,12);assert.equal(r.hayride.ticketsSold,12);
    assert.equal(r.coins-before,(12-paid)*8);assert.ok(r.visitors.every(v=>v.budget===92));
  }
});
test("large and small steps keep both convoy clocks, receipts and outcomes equal",()=>{
  const a=prepared(true),b=prepared(true);for(let i=0;i<12;i++){guest(a,i);guest(b,i);}
  advance(a,250);for(let i=0;i<2500;i++)advance(b,.1);
  for(const key of ["ticketsSold","income","completed","missed","departures"])assert.equal(a.hayride[key],b.hayride[key],key);
  a.visitors.forEach((v,i)=>assert.ok(Math.abs(v.hayride.terror-b.visitors[i].hayride.terror)<1e-6));
});
test("station crew improve real loading while paid circuit duration remains unchanged",()=>{
  const a=prepared(true),b=prepared(true);H.buyHayrideOperation(b,"dispatch");H.buyHayrideOperation(b,"dispatch");
  assert.ok(H.hayrideBoardingSeconds(b)<H.hayrideBoardingSeconds(a));assert.equal(H.hayrideLoadingWait(b),9);
  assert.equal(H.hayrideConfig(a).circuitSeconds,H.hayrideConfig(b).circuitSeconds);
  for(let i=0;i<12;i++){guest(a,i);guest(b,i);}advance(a,5);advance(b,5);
  assert.ok(b.hayride.ticketsSold>a.hayride.ticketsSold);assert.equal(b.hayride.completed,0);
  const before=structuredClone(b.hayride);b.paused=true;advance(b,100);assert.deepEqual(b.hayride,before);
});
test("two farm vehicle corridors have physical clearance and passengers remain on their own wagon",()=>{
  const s=prepared(true);for(let i=0;i<12;i++)guest(s,i);advance(s,9);
  s.hayride.convoy.phase=s.hayride.secondConvoy.phase="loading";s.hayride.convoy.elapsed=s.hayride.secondConvoy.elapsed=0;
  const a=hayrideFarmConvoyPose(s,0),b=hayrideFarmConvoyPose(s,1);
  assert.ok(Math.abs(a.wagon.x-b.wagon.x)>2*1.47+.8);
  for(const p of [a,b]){assert.ok(p.wagon.x-1.47>HAYRIDE_SITE.bounds.x0);assert.ok(p.wagon.x+1.47<HAYRIDE_SITE.bounds.x1);}
  for(const v of s.visitors){const p=hayrideGuestPose(s,v),centre=v.hayride.berth?b.wagon.x:a.wagon.x;assert.ok(Math.abs(p.x-centre)<1);}
});
test("closing completes both already-paid rides while actual world capacity blocks bonus arrivals",()=>{
  const s=prepared(true);for(let i=0;i<12;i++)guest(s,i);advance(s,9);H.setHayrideOpen(s,false);advance(s,200);
  assert.equal(s.hayride.completed,12);assert.equal(s.hayride.ticketsSold,12);
  const crowded=prepared(true);H.setHayrideOpen(crowded,false);crowded.time=200;crowded.visitors=Array.from({length:69},(_,id)=>({id,social:{phase:"chatting"}}));crowded.arriving=[];
  H.setHayrideOpen(crowded,true);assert.equal(crowded.arriving.length,0);
});
