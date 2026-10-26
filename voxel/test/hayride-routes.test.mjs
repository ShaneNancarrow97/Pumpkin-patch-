import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as H from "../src/rules/hayride.js";
import { HAYRIDE_ROUTE_LENGTH, HAYRIDE_SITE, hayrideRouteProfile, hayrideRouteSample, hayrideRouteLength, hayrideStops } from "../src/content/hayride-layout.js";
import { createHayrideWorld } from "../src/hayride-world.js";
import { createHayrideView } from "../src/hayride-view.js";

function prepared(){
  const s={hayride:H.freshHayride(),hollowHouse:{purchased:true,status:"ready"},coins:200000,earned:200000,progression:{bonusEarned:0},visitors:[],arriving:[],holds:[],time:0,paused:false};
  H.buyHayride(s);H.upgradeHayride(s);H.setHayrideOpen(s,true);s.arriving=[];return s;
}
function guest(s,id=0){
  const v={id,budget:100,originalBudget:100,basket:[],spot:0,needs:{happiness:70}};
  v.hayride=H.planHayrideVisit(s,v,"arrival",{force:true,approachSeconds:.1,returnSeconds:.1});s.visitors.push(v);return v;
}
function advance(s,t){s.time+=t;H.updateHayride(s,t);}

test("paid route upgrades add physical distance and scenes while retaining the original cast locations",()=>{
  const s=prepared(),base=hayrideRouteProfile(0),score=H.hayrideScareRating(s),cash=s.coins;
  s.earned=109999;assert.equal(H.buyHayrideRoute(s),false);assert.equal(s.coins,cash);s.earned=110000;
  assert.ok(H.buyHayrideRoute(s));assert.equal(s.coins,cash-8500);assert.equal(H.hayrideConfig(s).circuitSeconds,110);
  assert.equal(H.hayrideScareRating(s),score+8);assert.equal(hayrideStops(s).length,6);assert.ok(hayrideRouteLength(s)>base.length+60);
  assert.equal(H.buyHayrideRoute(s),false,"the deeper detour requires the third attraction tier");
  H.upgradeHayride(s);assert.ok(H.buyHayrideRoute(s));assert.equal(H.hayrideConfig(s).circuitSeconds,130);
  assert.equal(hayrideStops(s).length,7);assert.ok(hayrideRouteLength(s)>300);assert.equal(H.buyHayrideRoute(s),false);
  for(const profile of [hayrideRouteProfile(1),hayrideRouteProfile(2)]){
    for(const old of base.stops){
      const next=profile.stops.find(p=>p.id===old.id),a=hayrideRouteSample(old.at*base.length),b=hayrideRouteSample(next.at*profile.length,profile.level);
      assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-7,"the five established scenes retain their exact positions");
    }
    for(let d=0;d<profile.length;d+=.5){
      const p=hayrideRouteSample(d,profile.level);
      assert.ok([p.x,p.z,p.yaw,p.dx,p.dz].every(Number.isFinite));
      assert.ok(p.x>profile.bounds.x0+2&&p.x<profile.bounds.x1-2&&p.z>profile.bounds.z0+2&&p.z<profile.bounds.z1-2,"the full carriage lane remains supported");
    }
  }
});

test("purchasing a longer route never stretches or recharges a circuit already underway",()=>{
  const s=prepared();guest(s);advance(s,25);
  assert.equal(s.hayride.convoy.phase,"circuit");assert.equal(s.hayride.convoy.tripSeconds,90);const tickets=s.hayride.ticketsSold;
  H.buyHayrideRoute(s);assert.equal(H.hayrideConfig(s).circuitSeconds,110);assert.equal(s.hayride.convoy.tripSeconds,90);
  const raw=JSON.parse(JSON.stringify(s.hayride)),visits=H.saveHayrideVisitors(s),r=prepared();r.visitors=[];r.hayride=H.restoreHayride(raw);r.coins=s.coins;H.restoreHayrideVisitors(visits,r);
  assert.equal(r.hayride.convoy.tripSeconds,90);advance(r,100);
  assert.equal(r.hayride.completed,1);assert.equal(r.hayride.ticketsSold,tickets);
  assert.equal(r.visitors[0].budget,92);assert.equal(r.hayride.routeLevel,1);
});

test("two tractors use the new full circuit concurrently and remain paused together",()=>{
  const s=prepared();H.buyHayrideOperation(s,"fleet");H.buyHayrideRoute(s);for(let i=0;i<12;i++)guest(s,i);advance(s,20);
  assert.equal(H.hayrideConvoys(s).filter(c=>c.phase==="circuit"&&c.tripSeconds===110).length,2);
  assert.equal(s.hayride.completed,0);const before=JSON.stringify(s.hayride);s.paused=true;advance(s,200);assert.equal(JSON.stringify(s.hayride),before);s.paused=false;
  advance(s,120);assert.equal(s.hayride.completed,12);assert.equal(s.hayride.income,96);
});

test("owner POV follows each upgraded route duration and cues without changing the economy",()=>{
  for(const level of [1,2]){
    const s=prepared();s.hayride.routeLevel=level;const before=JSON.stringify(s),scene=new THREE.Scene(),cues=[];
    const canvas={clientWidth:874,clientHeight:787,addEventListener(){},removeEventListener(){}};
    const world={scene,setPreview(){},getPreviewFrame(){return{position:new THREE.Vector3(0,2,0),target:new THREE.Vector3(0,2,-8),yaw:0};}};
    const view=createHayrideView(canvas,s,{world,onCue:cue=>cues.push(cue)});
    assert.ok(view.enter({gentle:true}));assert.ok(view.status.rideDuration>150);
    assert.ok(Math.abs(view.status.rideDuration-150*hayrideRouteLength(s)/HAYRIDE_ROUTE_LENGTH)<1e-7);
    view.advanceForTest(1000);assert.equal(view.status.eventsFired.length,5+level);
    assert.ok(cues.some(c=>c.stop==="graveyard"));if(level===2)assert.ok(cues.some(c=>c.stop==="thicket"));
    view.leave();view.dispose();assert.equal(JSON.stringify(s),before);
  }
});

test("the second vehicle and purchased scenery render off-map with unchanged farm bounds",()=>{
  const s=prepared();H.buyHayrideOperation(s,"fleet");const farm=new THREE.Scene();
  const world=createHayrideWorld({scene:farm,state:s,world:new THREE.Group(),signBoard:()=>new THREE.Group()});
  try{
    assert.equal(world.status.vehicles.length,2);assert.ok(world.status.vehicles.every(v=>v.visible));
    assert.ok(Math.abs(world.status.vehicles[0].x-world.status.vehicles[1].x)>3.5);
    assert.equal(world.vehicle.seatAnchors.length,6);assert.equal(world.fleetVehicle.seatAnchors.length,6);
    const baseTrees=world.status.forest.trees;H.buyHayrideRoute(s);H.upgradeHayride(s);H.buyHayrideRoute(s);
    world.sync();assert.equal(world.status.forest.trees,baseTrees,"buying scenery does not rebuild hidden woodland on the farm");
    world.setPreview(0);assert.equal(world.status.scenes.length,7);assert.ok(world.status.forest.trees>baseTrees);
    assert.deepEqual(world.status.farmBounds,HAYRIDE_SITE.bounds);assert.ok(world.status.rideBounds.z1>70);
    const frame=world.getPreviewFrame(hayrideStops(s).find(p=>p.id==="thicket").at);assert.ok(frame.position.toArray().every(Number.isFinite));
  }finally{world.dispose();}
});
