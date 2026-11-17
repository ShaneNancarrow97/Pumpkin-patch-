import {pathToFileURL} from "node:url";
import path from "node:path";
const M=await import(pathToFileURL(path.resolve(process.argv[2]??"/tmp/loop-review-base","voxel/src/model.js")));
import fs from 'node:fs';
function stage(kind='base') {
 const s=M.freshState();s.coins=1e7;s.progression.claimed=Array.from({length:12},(_,i)=>i+1);
 if(kind!=='base') {
  Object.assign(s.upgrades,kind==='mid'?{tools:3,yield:2,auto:1,plots:1,sign:2}:{tools:6,yield:5,auto:1,plots:2,sign:4});
  Object.assign(s.visitorUpgrades,kind==='mid'?{party:1,lights:1,cocoa:0,loyalty:0}:{party:3,lights:4,cocoa:3,loyalty:2});
  Object.assign(s.shop,{unlocked:true,capacityLevel:kind==='mid'?1:3,displayLevel:1,checkoutLevel:kind==='mid'?1:2,displays:[0,1,2,3]});
  s.plotLevels.fill(3);s.plotCrops=s.plotCrops.map((_,i)=>i%4);
 }
 return s;
}
function run(label,s,{manual=false,seconds=3600,stocked=false,restock=false}={}) {
 if(stocked)s.stock=[100000,100000,100000,100000];
 const starting=s.stock.reduce((a,b)=>a+b,0), startCoins=s.coins;
 for(let i=0;i<36000;i++) {
  M.update(s,.1);
  if(manual&&i%30===0)for(let p=0;p<M.openPlots(s);p++){const n=M.harvest(s,p);if(n)M.rewardHarvestStreak(s);M.plant(s,p)}
  if(restock&&i%30===0)M.restockCocoa(s);
 }
 const r={label,gameSeconds:s.time,harvested:s.harvested,sold:s.stall.itemsSold+s.shop.itemsSold,served:s.sold,missedBudget:s.stall.missedBudget,missedStock:s.stall.missedStock,stockDelta:s.stock.reduce((a,b)=>a+b,0)-starting,coinsDelta:s.coins-startCoins,products:s.stall.income+s.shop.income,legacyAndStandCocoa:s.stall.cocoa,standGross:s.festival.cocoa.gross,standSupplies:s.festival.cocoa.supplies,visitorsPerMinute:M.visitorsPerMinute(s),baseInterval:M.stallArrivalSeconds(s)};
 return r;
}
const results=[];
results.push(run('fresh farm: manual tending every 3 seconds',stage(),{manual:true}));
const t=stage();t.upgrades.tools=1;results.push(run('fresh farm + one watering-can tier',t,{manual:true}));
const sign=stage();sign.upgrades.sign=1;results.push(run('fresh farm + one sign tier',sign,{manual:true}));
results.push(run('midgame mixed crops, helper only',stage('mid')));
results.push(run('maximum mixed crops, helper only',stage('max')));
const star=stage('max');star.plotCrops.fill(3);results.push(run('maximum Starlight-only crops, helper only',star));
const care=stage('max');care.customerCare.bags=3;care.customerCare.tipJar=3;results.push(run('maximum mixed crops + maximum bags/tips',care));
const legacy=stage('max');legacy.upgrades.auto=0;legacy.festival.meadow=true;results.push(run('abundant stock; legacy cocoa tier3',legacy,{stocked:true}));
const physical=stage('max');physical.upgrades.auto=0;physical.festival.meadow=true;physical.festival.cocoa.level=1;physical.festival.cocoa.stock=30;physical.festival.cocoa.price=4;results.push(run('abundant stock; physical cocoa tier1, regular paid restock',physical,{stocked:true,restock:true}));
fs.writeFileSync(path.resolve(process.argv[3]??'gameplay-baseline.json'),JSON.stringify({baseline:'ede512b',step:.1,seconds:3600,assumptions:'Staged upgrades; no buying, no favours, level awards marked claimed to isolate economic rules. Manual tending calls the same streak reward as the UI. Helper scenarios have no manual clicks. Legacy/physical comparison starts with ample equal four-variety stock.',results},null,2));
console.log(JSON.stringify(results,null,2));
