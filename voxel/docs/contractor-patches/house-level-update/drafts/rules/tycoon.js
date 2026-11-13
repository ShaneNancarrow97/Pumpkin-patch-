import { available } from "./stock.js";
import { LEVEL_THRESHOLDS,LEVEL_NAMES,LAND_PARCELS,INGREDIENTS,GARDEN_CROPS,RECIPES,RESEARCH,FESTIVAL_STANDS,recipeById,standById,standPoint,landWidth } from "../content/tycoon.js";
export { LAND_PARCELS,INGREDIENTS,GARDEN_CROPS,RECIPES,RESEARCH,FESTIVAL_STANDS,recipeById,standById,landWidth };
const cap=(n,max=1e9)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
const canSpend=(s,n)=>!s.paused&&Number.isFinite(s.coins)&&s.coins>=n;
export const freshTycoon=()=>({land:0,garden:Array.from({length:12},()=>({crop:"wheat",phase:"empty",progress:0})),stands:{cocoa:0,popcorn:0,toffee:0},standStock:{cocoa:0,popcorn:0,toffee:0},ingredients:Object.fromEntries(Object.keys(INGREDIENTS).map(id=>[id,0])),research:[],insightSpent:0,kitchen:false,products:Object.fromEntries(RECIPES.map(r=>[r.id,0])),shelves:[null,null,null],shelfLevel:0,job:null,chef:0,chefRecipe:"pumpkin-soup",autoSupply:false,metrics:{crafted:0,specialitySold:0,specialityIncome:0,standServed:0,standIncome:0,gardenHarvested:0,jobs:0,chefJobs:0,expenses:0},claimed:[]});
export function restoreTycoon(raw) {
  const t=freshTycoon();if(!raw||typeof raw!=="object"||Array.isArray(raw))return t;
  t.land=cap(raw.land,3);t.kitchen=raw.kitchen===true;t.chef=cap(raw.chef,3);t.autoSupply=raw.autoSupply===true;t.shelfLevel=cap(raw.shelfLevel,2);t.insightSpent=cap(raw.insightSpent);
  for(const field of ["ingredients","products","metrics","stands","standStock"])for(const id of Object.keys(t[field]))t[field][id]=cap(raw[field]?.[id],field==="stands"?3:field==="products"?200:field==="standStock"?150:1e9);
  t.research=[...new Set((Array.isArray(raw.research)?raw.research:[]).filter(id=>RESEARCH.some(r=>r.id===id)))];
  t.shelves=t.shelves.map((_,i)=>i<=t.shelfLevel&&recipeById[raw.shelves?.[i]]?raw.shelves[i]:null);
  if(recipeById[raw.chefRecipe])t.chefRecipe=raw.chefRecipe;
  t.garden=t.garden.map((p,i)=>{const a=raw.garden?.[i];return a&&GARDEN_CROPS.some(c=>c.id===a.crop)?{crop:a.crop,phase:["growing","ready"].includes(a.phase)?a.phase:"empty",progress:Math.min(1,Math.max(0,Number(a.progress)||0))}:p;});
  const job=raw.job;if(t.kitchen&&job&&recipeById[job.recipe]&&Number.isFinite(job.remaining)&&job.remaining>0)t.job={recipe:job.recipe,remaining:Math.min(recipeById[job.recipe].seconds,job.remaining),total:recipeById[job.recipe].seconds,automated:job.automated===true};
  t.claimed=[...new Set((Array.isArray(raw.claimed)?raw.claimed:[]).filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))];
  return t;
}
export function festivalLevel(s) {
  const t=s.tycoon??freshTycoon(),m=t.metrics;
  const xp=Math.floor(s.harvested*3+s.sold*5+m.crafted*5+m.standServed*3+m.specialitySold*5+m.gardenHarvested*3+t.land*40+t.research.length*20);
  let at=0;while(at<LEVEL_THRESHOLDS.length-1&&xp>=LEVEL_THRESHOLDS[at+1])at++;
  const next=LEVEL_THRESHOLDS[at+1]??null,base=LEVEL_THRESHOLDS[at];
  return {level:at+1,name:LEVEL_NAMES[at],xp,next,progress:next===null?1:(xp-base)/(next-base),tagline:next===null?"Keep your forever festival growing":`${xp} / ${next} XP · Harvest, cook and welcome visitors`};
}
export const insight=s=>Math.max(0,Math.floor(s.harvested/4)+s.tycoon.metrics.jobs*2+Math.floor(s.tycoon.metrics.specialitySold/3)-s.tycoon.insightSpent);
export function buyLand(s) {const t=s.tycoon,p=LAND_PARCELS[t.land];if(!p||festivalLevel(s).level<p.level||!canSpend(s,p.price))return false;s.coins-=p.price;t.metrics.expenses+=p.price;t.land++;return true;}
export function openKitchen(s) {if(s.tycoon.kitchen||s.house.level<2||festivalLevel(s).level<3||!canSpend(s,500))return false;s.coins-=500;s.tycoon.kitchen=true;s.tycoon.ingredients.wheat+=4;s.tycoon.ingredients.milk+=4;return true;}
export const researchReady=(s,r)=>s.tycoon.kitchen&&!s.tycoon.research.includes(r.id)&&festivalLevel(s).level>=r.level&&(!r.land||s.tycoon.land>=r.land)&&(!r.needs||s.tycoon.research.includes(r.needs));
export function research(s,id) {const r=RESEARCH.find(r=>r.id===id);if(!r||!researchReady(s,r)||insight(s)<r.insight||!canSpend(s,r.coins))return false;s.coins-=r.coins;s.tycoon.insightSpent+=r.insight;s.tycoon.research.push(id);s.tycoon.metrics.expenses+=r.coins;return true;}
export const ingredientKnown=(s,id)=>!!INGREDIENTS[id]&&(!INGREDIENTS[id].needs||s.tycoon.research.includes(INGREDIENTS[id].needs));
export function buyIngredient(s,id) {const a=INGREDIENTS[id];if(!a||!s.tycoon.kitchen||!ingredientKnown(s,id)||s.tycoon.ingredients[id]+a.pack>999||!canSpend(s,a.price))return false;s.coins-=a.price;s.tycoon.ingredients[id]+=a.pack;s.tycoon.metrics.expenses+=a.price;return true;}
export const recipeKnown=(s,r)=>!!r&&s.tycoon.kitchen&&festivalLevel(s).level>=r.level&&(!r.research||s.tycoon.research.includes(r.research));
export const inputCount=(s,id)=>id==="pumpkin"?available(s,0):s.tycoon.ingredients[id]??0;
export function startCook(s,id,automated=false) {
  const r=recipeById[id],t=s.tycoon;
  if(s.paused||!recipeKnown(s,r)||t.job||t.products[id]+r.yield>200||Object.entries(r.inputs).some(([a,n])=>inputCount(s,a)<n))return false;
  for(const[a,n]of Object.entries(r.inputs))if(a==="pumpkin")s.stock[0]-=n;else t.ingredients[a]-=n;
  const total=r.seconds/Math.pow(1.2,t.chef);t.job={recipe:id,remaining:total,total,automated};return true;
}
export function setShelf(s,slot,id) {const t=s.tycoon;if(s.paused||!s.shop.unlocked||!Number.isInteger(slot)||slot<0||slot>t.shelfLevel||slot>2||(id!==null&&(!recipeKnown(s,recipeById[id])||t.shelves.some((a,i)=>a===id&&i!==slot))))return false;t.shelves[slot]=id;return true;}
export function upgradeShelves(s) {const t=s.tycoon,cost=[900,2800][t.shelfLevel],level=[7,11][t.shelfLevel];if(cost===undefined||!s.shop.unlocked||festivalLevel(s).level<level||!canSpend(s,cost))return false;s.coins-=cost;t.shelfLevel++;return true;}
export function reserveSpeciality(s,customer,budget) {
  const t=s.tycoon,offered=t.shelves.slice(0,t.shelfLevel+1).filter(id=>id&&t.products[id]>0&&recipeById[id].price<=budget);
  if(!offered.length)return null;
  const id=offered[customer.id%offered.length];t.products[id]--;return {recipe:id,price:recipeById[id].price};
}
export function settleSpeciality(s,c) {const held=c.speciality;if(!held)return 0;const t=s.tycoon;t.metrics.specialitySold++;t.metrics.specialityIncome+=held.price;s.coins+=held.price;s.earned+=held.price;s.shop.income+=held.price;s.shop.itemsSold++;c.speciality=null;return held.price;}
export function releaseSpeciality(s,c) {if(c.speciality){s.tycoon.products[c.speciality.recipe]++;c.speciality=null;}}
export function saveTycoon(s) {const t={...s.tycoon,products:{...s.tycoon.products}};for(const c of s.shop.customers)if(c.speciality)t.products[c.speciality.recipe]++;return t;}
export const cropKnown=(s,c)=>!!c&&s.tycoon.land>=c.land&&(!c.needs||s.tycoon.research.includes(c.needs));
export function plantGarden(s,index,crop) {const t=s.tycoon,p=t.garden[index],c=GARDEN_CROPS.find(c=>c.id===crop);if(!Number.isInteger(index)||index<0||index>=t.land*4||!p||p.phase!=="empty"||!cropKnown(s,c)||!canSpend(s,c.seed))return false;s.coins-=c.seed;Object.assign(p,{crop,phase:"growing",progress:0});return true;}
export function harvestGarden(s,index) {const t=s.tycoon,p=t.garden[index],c=GARDEN_CROPS.find(c=>c.id===p?.crop);if(s.paused||!Number.isInteger(index)||index<0||index>=t.land*4||!c||p.phase!=="ready")return false;t.ingredients[c.id]+=c.yield;t.metrics.gardenHarvested+=c.yield;p.phase="empty";p.progress=0;return c.yield;}
export function upgradeStand(s,id) {const st=standById[id],t=s.tycoon,level=t.stands[id],cost=st?.prices[level];if(!st||cost===undefined||t.land<st.land||festivalLevel(s).level<st.level||!canSpend(s,cost))return false;s.coins-=cost;t.stands[id]++;if(!level)t.standStock[id]=5;t.metrics.expenses+=cost;return true;}
export function restockStand(s,id,fromKitchen=false) {const st=standById[id],t=s.tycoon;if(!st||s.paused||!t.stands[id])return false;const room=50*t.stands[id]-t.standStock[id];if(fromKitchen){const n=Math.min(10,room,t.products[st.product]);if(n<1)return false;t.products[st.product]-=n;t.standStock[id]+=n;return true;}if(room<10||!canSpend(s,st.wholesale))return false;s.coins-=st.wholesale;t.standStock[id]+=10;t.metrics.expenses+=st.wholesale;return true;}
export function hireChef(s) {const t=s.tycoon,cost=[6500,18000,48000][t.chef],level=[8,12,16][t.chef];if(cost===undefined||!t.kitchen||t.land<2||festivalLevel(s).level<level||!canSpend(s,cost))return false;s.coins-=cost;t.chef++;t.metrics.expenses+=cost;return true;}
export function chooseChefRecipe(s,id) {if(s.paused||!s.tycoon.chef||!recipeKnown(s,recipeById[id]))return false;s.tycoon.chefRecipe=id;return true;}
function chefStep(s) {
  const t=s.tycoon;if(!t.chef)return;
  for(const st of FESTIVAL_STANDS)if(t.stands[st.id]&&t.standStock[st.id]<8)restockStand(s,st.id,true);
  if(t.job||t.products[t.chefRecipe]>=24*t.chef)return;
  const r=recipeById[t.chefRecipe];if(!recipeKnown(s,r))return;
  if(t.autoSupply)for(const[id,n]of Object.entries(r.inputs))if(id!=="pumpkin"&&t.ingredients[id]<n&&s.coins-(INGREDIENTS[id]?.price??0)>=1000)buyIngredient(s,id);
  startCook(s,r.id,true);
}
export function updateTycoon(s,dt,events) {
  const t=s.tycoon;if(s.paused||!Number.isFinite(dt)||dt<=0)return;
  for(let i=0;i<t.land*4;i++) {
    const p=t.garden[i],c=GARDEN_CROPS.find(c=>c.id===p.crop);
    if(p.phase==="growing"){p.progress=Math.min(1,p.progress+dt/c.seconds);if(p.progress>=1)p.phase="ready";}
    if(t.research.includes("irrigation")){if(p.phase==="ready")harvestGarden(s,i);if(p.phase==="empty")plantGarden(s,i,p.crop);}
  }
  if(t.job){t.job.remaining=Math.max(0,t.job.remaining-dt);if(t.job.remaining===0){const r=recipeById[t.job.recipe];t.products[r.id]+=r.yield;t.metrics.crafted+=r.yield;t.metrics.jobs++;if(t.job.automated)t.metrics.chefJobs++;events.push({type:"crafted",recipe:r.id,quantity:r.yield});t.job=null;}}
  chefStep(s);
}

// Visitors make real, budget-limited stops before walking to Skyla's counter.
const distance=route=>route.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);
export function marketRoute(s,m) {
  const previous=m.index?standPoint(m.stops[m.index-1]):null,target=m.index<m.stops.length?standPoint(m.stops[m.index]):null;
  if(!previous)return [[33,28.5],[33,24],[target.x,24],[target.x,target.z]];
  if(target)return [[previous.x,previous.z],[previous.x,24],[target.x,24],[target.x,target.z]];
  return [[previous.x,previous.z],[previous.x,24],[35,24],[32.4,21.6],[30.4,18.6],[30.2,15.6],[31.6,12.6],[31.8,10.2]];
}
export function planMarketVisit(s,id) {const active=FESTIVAL_STANDS.filter(st=>s.tycoon.stands[st.id]>0);if(!active.length)return null;const stops=active.filter((st,i)=>i===0||(id+i)%2===0).map(st=>st.id);return {stops,index:0,phase:"walk",elapsed:0,done:false};}
export function updateMarketVisit(s,v,dt,events) {
  const m=v.market;if(!m||m.done)return false;
  m.elapsed+=dt;
  for(let safety=0;safety<8;safety++){
    const route=marketRoute(s,m),duration=m.phase==="walk"?distance(route)/2.8:2.5/(s.tycoon.stands[m.stops[m.index]]||1);
    if(m.elapsed<duration)break;m.elapsed-=duration;
    if(m.phase==="walk") {if(m.index>=m.stops.length){m.done=true;v.age=7;return false;}m.phase="counter";}
    else {
      const id=m.stops[m.index],st=standById[id],price=st.retail[s.tycoon.stands[id]-1];
      if(s.tycoon.standStock[id]>0&&v.budget>=price){s.tycoon.standStock[id]--;v.budget-=price;s.coins+=price;s.earned+=price;s.tycoon.metrics.standIncome+=price;s.tycoon.metrics.standServed++;v.marketPurchases=(v.marketPurchases||0)+1;events.push({type:"sale",route:"festival",stand:id,amount:price,quantity:1,visitor:v.id});}
      m.index++;m.phase="walk";
    }
  }
  return !m.done;
}
export const festivalOutRoute=s=>[[31.8,10.2],[31.6,12.6],[35,10.6],[38,8.6],[42.5,6.6],...(s.tycoon.land?[[landWidth(s.tycoon.land)+2.5,6.6]]:[])];
export const festivalLeaveSeconds=s=>s.tycoon.land?distance(festivalOutRoute(s))/3:4;

export const ACHIEVEMENTS=[
  {id:"first-harvest",name:"A little orange ambition",text:"Harvest 10 pumpkins",target:10,reward:30,metric:s=>s.harvested},
  {id:"crowd",name:"Word around the village",text:"Serve 50 visitors",target:50,reward:120,metric:s=>s.sold},
  {id:"meadow",name:"Beyond the gate",text:"Buy the east meadow",target:1,reward:75,metric:s=>s.tycoon.land},
  {id:"first-cup",name:"Something wickedly warm",text:"Sell 10 stand treats",target:10,reward:80,metric:s=>s.tycoon.metrics.standServed},
  {id:"garden",name:"Kitchen garden",text:"Harvest 50 ingredients",target:50,reward:150,metric:s=>s.tycoon.metrics.gardenHarvested},
  {id:"first-batch",name:"Made with a little magic",text:"Cook your first batch",target:1,reward:60,metric:s=>s.tycoon.metrics.jobs},
  {id:"cook",name:"Cauldron confidence",text:"Cook 100 portions",target:100,reward:250,metric:s=>s.tycoon.metrics.crafted},
  {id:"shelves",name:"Skyla's secret menu",text:"Sell 25 kitchen products in the shop",target:25,reward:250,metric:s=>s.tycoon.metrics.specialitySold},
  {id:"research",name:"A recipe worth haunting",text:"Complete five research projects",target:5,reward:350,metric:s=>s.tycoon.research.length},
  {id:"three-lands",name:"Room for a little empire",text:"Own all three expansions",target:3,reward:600,metric:s=>s.tycoon.land},
  {id:"chef",name:"You rang, chef?",text:"Hire the spooky chef",target:1,reward:300,metric:s=>s.tycoon.chef},
  {id:"automated",name:"The kitchen never sleeps",text:"Have the chef cook 100 batches",target:100,reward:700,metric:s=>s.tycoon.metrics.chefJobs},
  {id:"festival",name:"Spooktacular",text:"Reach festival level 15",target:15,reward:1000,metric:s=>festivalLevel(s).level},
  {id:"forever",name:"Our forever festival",text:"Reach festival level 20",target:20,reward:2000,metric:s=>festivalLevel(s).level},
];
export function claimAchievement(s,id) {const a=ACHIEVEMENTS.find(a=>a.id===id);if(s.paused||!a||s.tycoon.claimed.includes(id)||a.metric(s)<a.target)return false;s.tycoon.claimed.push(id);s.coins+=a.reward;s.earned+=a.reward;return true;}
