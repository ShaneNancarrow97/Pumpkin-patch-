import test from "node:test";
import assert from "node:assert/strict";
import { freshCleanliness, restoreCleanliness, updateCleanliness, cleanLitter, cleanlinessStatus, cleanlinessFootfall, janitorCount, visitorGround, CLEANLINESS, JANITOR_REST } from "../src/rules/cleanliness.js";
import { freshState, saveData, restoreState } from "../src/model.js";
import { stallPace, shopPace, visitorCapacity, visitorUpgradeUnlocked, visitorUpgradeCost, buyVisitorUpgrade, VISITOR_UPGRADES } from "../src/rules/selling.js";
import { fieldDepth, inFarmPatch, COUNTER_FRONT } from "../src/content/farm-layout.js";
import { walkRoute, farmWalks } from "../src/content/farm-walks.js";
import { CHAT_SPOTS } from "../src/content/festival-meadow.js";

const state=()=>({coins:1000,sold:0,paused:false,time:0,visitors:[],upgrades:{plots:0},visitorUpgrades:{janitor:0},progression:{bonusEarned:0},cleanliness:freshCleanliness(),house:{level:0,placed:[],owned:[]}});
// A guest out on the farm at a place of our choosing: one stopped for a chat stands where their chat says.
const chatter=(id,x,z)=>({id,age:30,leaveAt:20,social:{x,z,phase:"chatting"}});
// The whole farm open: the meadow, the Hollow House, the hayride and the food truck.
const openFarm=()=>{const s=freshState();s.festival.meadow=true;s.hollowHouse.purchased=true;s.hayride.purchased=true;s.kitchen.purchased=true;return s;};
const stretches=route=>route.slice(1).map((p,i)=>[route[i],p]);
const crossesPatch=(route,from)=>stretches([[from.x,from.z],...route]).some(([a,b])=>{for(let k=0;k<=20;k++){const t=k/20;if(inFarmPatch(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0))return true;}return false;});

test("guests drop litter where they stand, anywhere on the farm, deterministically and bounded",()=>{
  const places=[[45,22],[51.5,14.5],[-10,25],[8,11]],make=()=>{const s=state();s.visitors=places.map(([x,z],i)=>chatter(i,x,z));s.sold=16;updateCleanliness(s,.01);return s;};
  const s=make(),t=make();
  assert.equal(s.cleanliness.litter.length,4);assert.deepEqual(s.cleanliness.litter,t.cleanliness.litter);
  for(const p of s.cleanliness.litter)assert.ok(places.some(([x,z])=>Math.hypot(p.x-x,p.z-z)<.3),`${p.id} at a guest's feet`);
  assert.ok(new Set(s.cleanliness.litter.map(p=>`${Math.round(p.x)},${Math.round(p.z)}`)).size>=3,"spread across the farm, not one spot");
  s.sold=100000;updateCleanliness(s,.01);assert.equal(s.cleanliness.litter.length,CLEANLINESS.maximum);
});
test("a guest on the lane drops it on the lane, and what they carry becomes the litter",()=>{
  const s=state();s.visitors=[{id:5,age:3.5,leaveAt:null,spot:0,cocoaSpend:3,cocoaKind:1}];const at=visitorGround(s,s.visitors[0]);
  s.sold=4;updateCleanliness(s,.01);const [p]=s.cleanliness.litter;
  assert.ok(Math.hypot(p.x-at.x,p.z-at.z)<.3&&p.x>29&&p.x<34,"on the lane, where they are");assert.equal(p.kind,0,"their cocoa cup");
});
test("without a guest outside, rubbish lands on the lane, never in the beds",()=>{const s=state();s.sold=16;updateCleanliness(s,.01);assert.equal(s.cleanliness.litter.length,4);assert.ok(s.cleanliness.litter.every(p=>p.x>28&&p.x<36&&p.z>10&&!inFarmPatch(p.x,p.z,0)));});
test("litter reduces arrivals and capacity gently, and cleaning fully removes its penalty",()=>{const s=state();s.sold=200;updateCleanliness(s,1);assert.equal(cleanlinessFootfall(s),.65);const ids=s.cleanliness.litter.map(p=>p.id);for(const id of ids)assert.equal(cleanLitter(s,id),true);assert.equal(cleanlinessFootfall(s),1);assert.equal(s.cleanliness.cleaned,24);assert.equal(cleanLitter(s,ids[0]),false);});

test("caretakers are a visitor upgrade that opens with the first litter, up to two",()=>{
  const s=freshState();s.coins=10000;
  assert.ok(VISITOR_UPGRADES.some(u=>u.id==="janitor"&&u.costs.length===2));
  assert.equal(visitorUpgradeUnlocked(s,"janitor"),false);assert.equal(buyVisitorUpgrade(s,"janitor"),false,"not before any litter");
  s.sold=4;updateCleanliness(s,.01);assert.equal(s.cleanliness.litter.length,1);
  assert.equal(visitorUpgradeUnlocked(s,"janitor"),true,"the first litter opens it");
  const first=visitorUpgradeCost(s,"janitor");assert.equal(buyVisitorUpgrade(s,"janitor"),true);assert.equal(s.coins,10000-first);assert.equal(janitorCount(s),1);
  updateCleanliness(s,.01);assert.equal(s.cleanliness.janitors.length,1,"Hettie arrives");
  assert.equal(buyVisitorUpgrade(s,"janitor"),true);assert.equal(janitorCount(s),2);updateCleanliness(s,.01);assert.equal(s.cleanliness.janitors.length,2,"and her twin");
  assert.equal(buyVisitorUpgrade(s,"janitor"),false,"no more than two");
  // Once bought, it stays open, even on a farm that has somehow never seen litter.
  const t=freshState();t.visitorUpgrades.janitor=1;assert.equal(visitorUpgradeUnlocked(t,"janitor"),true);
});
test("caretakers walk the guests' paths to litter anywhere, never across the patch, and share it",()=>{
  const s=openFarm();s.visitorUpgrades.janitor=2;
  const spots=[[30.5,19],[CHAT_SPOTS[0].x,CHAT_SPOTS[0].z],[-11,25.2],[8.6,11],[49,6.6],[-19,36]];
  s.cleanliness.litter=spots.map(([x,z],i)=>({id:"litter-"+i,x,z,kind:i%3}));s.cleanliness.nextId=spots.length;
  const seen=[[],[]],events=[];
  for(let i=0;i<4000&&s.cleanliness.litter.length;i++){updateCleanliness(s,.1,events);s.cleanliness.janitors.forEach((j,k)=>seen[k].push([j.x,j.z]));}
  assert.equal(s.cleanliness.litter.length,0,"every piece swept");assert.equal(s.cleanliness.cleaned,spots.length);
  assert.ok(seen.flat().every(([x,z])=>!inFarmPatch(x,z,0)),"never in the pumpkin patch");
  const by=new Set(events.filter(e=>e.type==="litter-cleaned").map(e=>e.by));assert.deepEqual([...by].sort(),[0,1],"both caretakers sweep");
  // With nothing left, each goes back to wait by the lane's top.
  for(let i=0;i<600;i++)updateCleanliness(s,.1);
  s.cleanliness.janitors.forEach((j,k)=>assert.ok(Math.hypot(j.x-JANITOR_REST[k].x,j.z-JANITOR_REST[k].z)<.05));
});
test("a long simulation step still walks to and sweeps each piece",()=>{
  const s=openFarm();s.visitorUpgrades.janitor=1;s.cleanliness.litter=[{id:"litter-0",x:-11,z:25.2,kind:0},{id:"litter-1",x:45,z:22,kind:1}];s.cleanliness.nextId=2;
  const events=[];updateCleanliness(s,60,events);updateCleanliness(s,60,events);
  assert.equal(s.cleanliness.litter.length,0);assert.equal(events.length,2);
});
test("the way between two places keeps to the walks: from the counter to the hayride's queue and the meadow's far bench",()=>{
  const s=openFarm(),from={x:COUNTER_FRONT[0],z:COUNTER_FRONT[1]};
  for(const to of [{x:-11,z:25.2},{x:CHAT_SPOTS[0].x,z:CHAT_SPOTS[0].z},{x:-19,z:36}]){
    const route=walkRoute(s,from,to);
    assert.deepEqual(route.at(-1),[to.x,to.z]);assert.equal(crossesPatch(route,from),false,`no short cut through the patch to ${to.x},${to.z}`);
  }
  assert.ok(farmWalks(s).length>farmWalks(freshState()).length,"the attractions' paths join the walks once they open");
});
test("paused game cannot clean or advance",()=>{const s=state();s.visitorUpgrades.janitor=1;s.sold=4;updateCleanliness(s,.01);s.paused=true;const c=JSON.stringify(s.cleanliness);assert.equal(cleanLitter(s,s.cleanliness.litter[0].id),false);updateCleanliness(s,60);assert.equal(JSON.stringify(s.cleanliness),c);});
test("old saves start clean and never receive historic rubbish; corrupt litter is discarded; a hired Hettie carries over",()=>{
  const s=state();s.sold=400;s.cleanliness=restoreCleanliness(null,s);updateCleanliness(s,1);assert.equal(s.cleanliness.litter.length,0);
  const restored=restoreCleanliness({janitor:true,nextId:-1,litter:[{id:"litter-99",x:32,z:16,kind:2},{id:"litter-99",x:32,z:16},{id:"bad",x:32,z:16},{id:"litter-4",x:Infinity,z:2},{id:"litter-5",x:900,z:2}],janitorPosition:{x:31,z:14},sweep:.4},s);
  assert.equal(restored.litter.length,1);assert.equal(restored.nextId,100);
  assert.equal(s.visitorUpgrades.janitor,1,"the old hire is the first caretaker");assert.equal(restored.janitors.length,1);assert.deepEqual([restored.janitors[0].x,restored.janitors[0].z,restored.janitors[0].sweep],[31,14,.4]);
  assert.equal(cleanlinessStatus({...s,cleanliness:restored}).penalty,0);
});
test("the actual arrival pace and outdoor limit carry the reversible penalty",()=>{const s=freshState(),stall=stallPace(s),shop=shopPace(s),capacity=visitorCapacity(s);s.sold=200;updateCleanliness(s,1);assert.equal(stallPace(s),stall*.65);assert.equal(shopPace(s),shop*.65);assert.equal(visitorCapacity(s),Math.floor(capacity*.65));for(const p of [...s.cleanliness.litter])cleanLitter(s,p.id);assert.equal(stallPace(s),stall);assert.equal(visitorCapacity(s),capacity);});
test("a save round trip keeps both caretakers, where they are, the litter and the cleaned count",()=>{
  const s=openFarm();s.visitorUpgrades.janitor=2;s.visitors=[chatter(1,45,22),chatter(2,-10,25)];s.sold=12;updateCleanliness(s,.5);s.cleanliness.cleaned=9;
  const restored=restoreState(saveData(s));
  assert.deepEqual(restored.cleanliness.litter,s.cleanliness.litter);assert.equal(restored.visitorUpgrades.janitor,2);assert.equal(restored.cleanliness.cleaned,9);
  assert.deepEqual(restored.cleanliness.janitors.map(j=>[j.x,j.z]),s.cleanliness.janitors.map(j=>[j.x,j.z]));
});
test("litter on the lane beyond the current field comes back up; litter elsewhere stays where it was dropped",()=>{
  const s=freshState(),raw={litter:[{id:"litter-7",x:35,z:31.8,kind:1},{id:"litter-8",x:-10,z:25,kind:0}],janitors:[{x:35,z:31.8,sweep:0}]};s.visitorUpgrades.janitor=1;
  const c=restoreCleanliness(raw,s);assert.deepEqual([c.litter[0].x,c.litter[0].z],[33,fieldDepth(s)-1.2]);assert.deepEqual([c.litter[1].x,c.litter[1].z],[-10,25]);assert.deepEqual([c.janitors[0].x,c.janitors[0].z],[33,fieldDepth(s)-1.2]);
  s.upgrades.plots=4;const large=restoreCleanliness(raw,s);assert.equal(large.litter[0].z,31.8);assert.equal(large.janitors[0].z,31.8);
});
