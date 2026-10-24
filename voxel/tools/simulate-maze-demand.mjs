// Demand ceiling, not a progression playthrough: unlimited starting stock,
// explicit upgrades and no automatic production or level rewards.
import * as M from '../src/model.js';
const rows=[];
for(const scenario of ['early','middle','late','late-streak']){
 const s=M.freshState();s.stock=scenario==='early'?[100000,0,0,0]:scenario==='middle'?[100000,100000,100000,0]:[100000,100000,100000,100000];s.progression.claimed=M.LEVELS.map(l=>l.level);s.coins=100000;
 if(scenario!=='early'){
  s.earned=8500;Object.assign(s.upgrades,{sign:2,plots:2});Object.assign(s.visitorUpgrades,{party:1,lights:2,crowd:1});Object.assign(s.shop,{unlocked:true,capacityLevel:2,displayLevel:1,checkoutLevel:1,displays:[0,1,2,3]});s.customerCare.bags=1;
 }
 if(scenario.startsWith('late')){
  s.earned=110000;Object.assign(s.upgrades,{sign:5,plots:4,storage:6});Object.assign(s.visitorUpgrades,{party:3,lights:4,crowd:4,cocoa:3,loyalty:2});Object.assign(s.shop,{capacityLevel:3,checkoutLevel:2});s.customerCare.bags=3;s.customerCare.tipJar=3;
  Object.assign(s.hollowHouse,{purchased:true,status:'ready',tier:5,open:true});s.hollowHouse.haunts={owned:M.MAZE_PREFABS.map(p=>p.id),active:M.MAZE_PREFABS.map(p=>p.id)};
 }
 if(scenario==='late-streak'){s.streak.visitorBoost=1.5;s.streak.visitorBoostUntil=1e6;}
 const coins=s.coins,stock=M.stockCount(s);let peak=0;
 for(let i=0;i<18000;i++){s.time+=.1;M.updateHollowHouse(s,.1,[]);M.updateStall(s,.1,[]);M.updateShop(s,.1,[]);peak=Math.max(peak,M.visitorReservations(s));if(peak>M.visitorCapacity(s))throw Error('crowd exceeded');}
 rows.push({scenario,coinsPerMinute:+((s.coins-coins)/30).toFixed(1),pumpkinsPerMinute:+((stock-M.stockCount(s))/30).toFixed(1),vipProductPerMinute:+(s.bigSpender.spent/30).toFixed(1),tipsPerMinute:+(M.totalTips(s)/30).toFixed(1),tickets:s.hollowHouse.ticketsSold,ranHome:s.hollowHouse.runHome,returnVisits:s.hollowHouse.repeatVisits,peak,capacity:M.visitorCapacity(s)});
}
console.log(JSON.stringify({assumption:'30 active minutes, unlimited stock, no production, upgrades staged, no level rewards. Not an income forecast.',rows},null,2));
