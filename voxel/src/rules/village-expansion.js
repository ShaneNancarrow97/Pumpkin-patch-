// Pure, saved activities. The view supplies nearby intent; rewards settle here once.
import {EXPANSION_AREAS,EXPANSION_AREA_BY_ID,EXPANSION_ACTIVITIES,EXPANSION_CHAPTERS,EXPANSION_CHAPTER_BY_ID,EXPANSION_ACTIVITY_BY_ID,EXPANSION_VEINS,EXPANSION_VEIN_BY_ID,EXPANSION_GEMS,EXPANSION_LEVEL_GATES,normaliseExpansionActivity} from '../content/village-expansion.js';
import {freshOutfitPresets,restoreOutfitPresets} from './village-outfit-presets.js';
import {patchLevel} from './levels.js';
import {hasExpansionReward,requirementMet,expansionLevelRequirement,expansionAreaInfo,EXPANSION_SEAL_FLAGS} from './village-expansion-access.js';
export {hasExpansionReward,expansionLevelRequirement,expansionAreaInfo} from './village-expansion-access.js';
import {grantVillage,addFriendship,takeVillageItem} from './village.js';
import {available as stockAvailable,settlePumpkinStock} from './stock.js';
import {availableFood} from './cooking-sales.js';
import {RECIPE_BY_ID} from '../content/cooking.js';
import {VILLAGE_DECOR_BY_ID} from '../content/village-decor.js';
import {MATERIAL_BY_ID} from '../content/village.js';
import {villageMaterialCapacity} from './village-upgrades.js';
import {freshExpansionEconomy,restoreExpansionEconomy,actExpansionEconomy} from './village-expansion-economy.js';
import {freshExpansionCompanions,restoreExpansionCompanions,recordCompanionGather} from './village-expansion-companions.js';
export {EXPANSION_AREAS,EXPANSION_ACTIVITIES,EXPANSION_CHAPTERS,EXPANSION_VEINS,EXPANSION_GEMS};
const finite=n=>typeof n==='number'&&Number.isFinite(n),whole=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0?Math.min(max,n):0;
const no=reason=>({ok:false,reason,events:[]});
const baseState=s=>s?.village?.expansion;
const state=s=>baseState(s)??freshVillageExpansion();
const ensure=s=>s.village.expansion??=freshVillageExpansion();
const CHAPTERS=()=>EXPANSION_CHAPTERS,ACTIVITIES=()=>EXPANSION_ACTIVITIES;
const chapterBy=id=>CHAPTERS().find(c=>c.id===id),activityBy=id=>ACTIVITIES().find(a=>a.id===id);
export function freshVillageExpansion(){return{revision:1,area:'green',effects:[],completed:{},chapters:{},puzzles:{},gems:Object.fromEntries(EXPANSION_GEMS.map(g=>[g.id,0])),veins:{},pity:Object.fromEntries(EXPANSION_AREAS.filter(a=>a.layer==='cave').map(a=>[a.id,0])),questItems:{},receipts:{},baselines:{},choices:{},tracked:null,seed:20261109,gemIncome:0,outfits:freshOutfitPresets(),economy:freshExpansionEconomy(),companions:freshExpansionCompanions()};}
export function restoreVillageExpansion(raw){
 const e=freshVillageExpansion();if(!raw||typeof raw!=='object')return e;
 if(EXPANSION_AREA_BY_ID[raw.area])e.area=raw.area;
 const effects=new Set(CHAPTERS().flatMap(c=>[c.id,...(c.reward?.effects??[])]));
 e.effects=[...new Set((Array.isArray(raw.effects)?raw.effects:[]).filter(f=>effects.has(f)))];
 for(const a of ACTIVITIES()){
  if(raw.completed?.[a.id]===true)e.completed[a.id]=true;
  if(finite(raw.baselines?.[a.id]))e.baselines[a.id]=Math.max(0,raw.baselines[a.id]);
  const p=raw.puzzles?.[a.id];if(!p||a.type!=='puzzle')continue;
  const choices=a.choices??[],selected=Array.isArray(p.selected)?p.selected.filter(v=>choices.includes(v)).slice(0,8):[];
  const rotations=Object.fromEntries((a.components??[]).map(c=>[c.id,whole(p.rotations?.[c.id],3)]));
  const assignments=Object.fromEntries((a.slots??[]).filter(k=>choices.includes(p.assignments?.[k])).map(k=>[k,p.assignments[k]]));
  e.puzzles[a.id]={selected,rotations,assignments,hints:whole(p.hints,3),attempts:whole(p.attempts,1e6)};
 }
 for(const c of CHAPTERS()){
  if(raw.chapters?.[c.id]===true)e.chapters[c.id]=true;
  if(raw.receipts?.[c.id])e.receipts[c.id]={claimed:true};
  if(typeof raw.choices?.[c.id]==='string')e.choices[c.id]=raw.choices[c.id].slice(0,60);
 }
 for(const g of EXPANSION_GEMS)e.gems[g.id]=whole(raw.gems?.[g.id],999);
 for(const a of EXPANSION_AREAS.filter(a=>a.layer==='cave'))e.pity[a.id]=whole(raw.pity?.[a.id],9);
 for(const v of EXPANSION_VEINS){const r=raw.veins?.[v.id];if(r)e.veins[v.id]={remaining:finite(r.remaining)?Math.max(0,Math.min(480,r.remaining)):0,cycle:whole(r.cycle)};}
 for(const a of ACTIVITIES().filter(a=>a.questGem))if(raw.questItems?.[a.id])e.questItems[a.id]=a.gem;
 synchroniseSeals(e);
 e.seed=Number.isSafeInteger(raw.seed)?raw.seed>>>0:e.seed;e.gemIncome=whole(raw.gemIncome);
 e.tracked=chapterBy(raw.tracked)&&!e.chapters[raw.tracked]&&!e.receipts[raw.tracked]?raw.tracked:null;e.outfits=restoreOutfitPresets(raw.outfits);e.economy=restoreExpansionEconomy(raw.economy);e.companions=restoreExpansionCompanions(raw.companions);
 return e;
}
export function enterVillageExpansionArea(s,id){
 const a=expansionAreaInfo(s,id);if(!a?.open||s.paused)return no(a?.reason??'Unknown village area.');const e=ensure(s);e.area=id;
 return{ok:true,reason:a.name,spawn:{...a.spawn},events:[{type:'expansion-area-enter',area:id}]};
}
function chapterStatus(s,c){
 const e=state(s);if(e.chapters[c.id])return'done';
 if(!expansionAreaInfo(s,c.area)?.open||patchLevel(s).level<c.level||!requirementMet(s,c.needs))return'locked';
 if(c.rank){const xp=s.village?.friends?.[c.who]?.xp??0,threshold=[0,0,40,100,180,280,400,540,700,880,1080][c.rank]??0;if(xp<threshold)return'locked';}
 return c.activities.some(id=>e.completed[id])?'active':'available';
}
const currentId=(s,c)=>c.activities.find(id=>!state(s).completed[id])??null;
const metric=(s,id)=>id==='cook'?(s.kitchen?.ledger?.batchesCooked??0):id==='harvest'?(s.harvested??0):id==='home-cook'?(s.progression?.homeActivities?.cook??0):id==='sell'?(s.sold??0):0;
function freshPuzzle(a){return{selected:[],rotations:Object.fromEntries((a.components??[]).map(c=>[c.id,1])),assignments:{},hints:0,attempts:0};}
export function expansionActivityInfo(s,id){
 const e=state(s),vein=EXPANSION_VEIN_BY_ID[id];
 if(vein){const a=expansionAreaInfo(s,vein.area),remaining=e.veins[id]?.remaining??0;return{...vein,available:!!a?.open,visible:!!a?.open,open:!!a?.open,canAct:!!a?.open&&!s.paused&&remaining<=0,done:false,complete:false,remaining,progress:1-remaining/480,description:'Strike the stone with your pick. Rare minerals occasionally catch the lantern light.',reason:!a?.open?a?.reason:remaining>0?`This seam returns in ${Math.ceil(remaining)}s.`:'Mine this seam.',options:[]};}
 const a=activityBy(id);if(!a)return null;const c=chapterBy(a.chapter),status=chapterStatus(s,c),done=!!e.completed[id],available=status!=='locked'&&status!=='done'&&currentId(s,c)===id,p=e.puzzles[id]??freshPuzzle(a);
 const costRows=[...(a.cost?.pumpkins?[{id:'pumpkins',need:a.cost.pumpkins,have:stockAvailable(s)}]:[]),...(a.cost?.food?[{id:'cooked-portions',need:a.cost.food,have:foodPortions(s)}]:[]),...(a.cost?.coins?[{id:'coins',need:a.cost.coins,have:s.coins}]:[]),...Object.entries(a.cost?.materials??{}).map(([id,need])=>({id,need,have:s.village.materials[id]??0})),...Object.entries(a.cost?.gems??{}).map(([id,need])=>({id,need,have:e.gems[id]??0}))],affordable=costRows.every(r=>r.have>=r.need);
 const baseline=e.baselines[id],have=a.type==='farm'?Math.max(0,metric(s,a.metric)-(baseline??metric(s,a.metric))):0;
 let reason=done?'Already completed.':available&&!affordable?'Bring '+costRows.filter(r=>r.have<r.need).map(r=>`${r.need} ${r.id.replaceAll('-',' ')} (${r.have} held)`).join(' · '):!available?status==='locked'?'Follow the earlier chapter or farm level first.':'Finish the current chapter step first.':a.type==='farm'&&have<(a.amount??1)?`Head home: ${a.name} (${Math.min(have,a.amount)}/${a.amount}).`:'Ready';
 return{...a,giver:a.who,available,visible:!!expansionAreaInfo(s,a.area)?.open&&(available||done&&['restore','reveal'].includes(a.type)),costRows,affordable,canAct:available&&!s.paused&&affordable&&(a.type!=='farm'||baseline===undefined||have>=a.amount),done,complete:done,reason,description:a.text??a.name,progress:done?1:a.type==='farm'?Math.min(1,have/(a.amount??1)):p.selected.length/Math.max(1,a.solution?.length??1),have,need:a.amount??1,started:baseline!==undefined,options:(a.choices??[]).map((choice,i)=>({id:choice,label:choice,index:i})),selected:[...p.selected],rotations:{...p.rotations},assignments:{...p.assignments},hints:p.hints,attempts:p.attempts};
}
function rewardRows(r={}){
 const rows=[];if(r.coins)rows.push({kind:'coins',amount:r.coins,label:`£${r.coins} bonus coins`});
 for(const id of r.decor??[])rows.push({kind:'decor',id,label:id.replaceAll('-',' ')});
 for(const id of r.costumes??[])rows.push({kind:'costume',id,label:id.replaceAll('-',' ')});
 for(const id of r.recipes??[])rows.push({kind:'recipe',id,label:id.replaceAll('-',' ')+' recipe'});
 for(const[id,amount]of Object.entries(r.villageDecor??{}))rows.push({kind:'village-decor',id,amount,label:`${amount} ${id.replaceAll('-',' ')}`});
 for(const[id,amount]of Object.entries(r.estateDecor??{}))rows.push({kind:'estate-decor',id,amount,label:`${amount} ${id.replaceAll('-',' ')}`});
 for(const id of r.effects??[])rows.push({kind:'capability',id,label:id.replaceAll('-',' ')});
 return rows;
}
export function expansionJournal(s){return CHAPTERS().map(c=>{const status=chapterStatus(s,c),next=currentId(s,c),done=c.activities.filter(id=>state(s).completed[id]).length;return{...c,giver:c.who,status,description:c.blurb??`${c.title} · ${EXPANSION_AREA_BY_ID[c.area]?.name}`,next:next?expansionActivityInfo(s,next):null,rewards:rewardRows(c.reward),progress:done/c.activities.length,completed:done,need:c.activities.length,reason:status==='locked'?expansionAreaInfo(s,c.area)?.reason??'Meet this neighbour and finish earlier chapters.':null};});}
export function villageExpansionStatus(s){return{area:state(s).area,areas:EXPANSION_AREAS.map(a=>expansionAreaInfo(s,a.id)),chapters:expansionJournal(s),effects:[...state(s).effects],gems:EXPANSION_GEMS.map(g=>({...g,amount:state(s).gems[g.id]??0})),tracked:state(s).tracked};}
export const expansionStatus=villageExpansionStatus;
function near(a,action){const p=action.position??action.context??action;return p.area!==undefined&&p.area!==a.area?false:![p.x,p.z].every(finite)||Math.hypot(a.x-p.x,a.z-p.z)<=5;}
function nextRandom(seed,id,cycle){let n=(seed^cycle*2654435761)>>>0;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return(n>>>0)/4294967296;}
function mine(s,v){
 const e=ensure(s),slot=e.veins[v.id]??{remaining:0,cycle:0};if(slot.remaining>0)return no('That seam needs time to return.');
 const material=v.depth===1?'stone':v.depth===2?'iron':'moonstone',qty=v.depth===1?2:1,capacity=villageMaterialCapacity(s);
 const rare=(e.pity[v.area]??0)>=9||nextRandom(e.seed,v.id,slot.cycle)<.1;
 if((s.village.materials[material]??0)+qty>capacity)return no(`Make room for ${MATERIAL_BY_ID[material]?.name??material} in your satchel.`);
 if(rare&&(e.gems[v.gem]??0)>=999)return no('Make room for this rare gem before mining.');
 s.village.materials[material]=(s.village.materials[material]??0)+qty;e.veins[v.id]={remaining:480,cycle:Math.min(1e9,slot.cycle+1)};e.pity[v.area]=rare?0:(e.pity[v.area]??0)+1;
 const rewards=[{kind:'material',id:material,amount:qty}];if(rare){e.gems[v.gem]=(e.gems[v.gem]??0)+1;rewards.push({kind:'gem',id:v.gem,amount:1});}
 const companionBonus=recordCompanionGather(s,{job:`cave:${v.id}:${slot.cycle}`,material,quantity:qty,capacity:villageMaterialCapacity(s)});if(companionBonus)rewards[0].amount+=companionBonus;
 s.village.stats.gathered+=qty+companionBonus;
 return{ok:true,reason:rare?`A rare ${EXPANSION_GEMS.find(g=>g.id===v.gem)?.name} catches the light!`:`Collected ${qty} ${material}.`,rewards,events:[{type:'expansion-mined',node:v.id,area:v.area,material,quantity:qty+companionBonus,companionBonus,gem:rare?v.gem:null,rewards}]};
}
// Light travels through rotated ports; this checks connectivity, not a memorised button order.
export function expansionLightConnected(a,p){
 const dirs=['N','E','S','W'],vectors={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]},cells=new Map((a.components??[]).map(c=>[`${c.x},${c.y}`,c]));
 let x=a.source?.x??0,y=a.source?.y??0,heading=a.source?.direction??'E';const visited=new Set();
 for(let guard=0;guard<20;guard++){
  const[dx,dy]=vectors[heading];x+=dx;y+=dy;if(x===a.exit.x&&y===a.exit.y)return true;
  const c=cells.get(`${x},${y}`);if(!c)return false;const key=`${c.id}:${heading}`;if(visited.has(key))return false;visited.add(key);
  const r=p.rotations[c.id]??1,ports=(c.shape==='straight'?['W','E']:c.id==='far'?['N','E']:['W','S']).map(d=>dirs[(dirs.indexOf(d)+r)%4]),incoming=dirs[(dirs.indexOf(heading)+2)%4];
  if(!ports.includes(incoming))return false;heading=ports.find(d=>d!==incoming);
 }
 return false;
}
function puzzleAction(s,a,action){
 const e=ensure(s),p=e.puzzles[a.id]??=freshPuzzle(a),kind=a.puzzleKind??'sequence';
 if(action.hint){p.hints=Math.min(3,p.hints+1);return{ok:true,reason:a.hint??'Look closely at the marks nearby.',events:[{type:'expansion-hint',activity:a.id,hint:p.hints}]};}
 if(action.reset){e.puzzles[a.id]={...freshPuzzle(a),hints:p.hints,attempts:p.attempts};return{ok:true,reason:'The puzzle is ready to try again.',events:[]};}
 if(action.solve)return{solved:true};
 const choice=Number.isInteger(action.choice)?a.choices?.[action.choice]:action.choice;
 if(kind==='light-route'){
  if(action.rotate!==undefined){const id=typeof action.rotate==='number'?a.components?.[action.rotate]?.id:action.rotate;if(!a.components?.some(c=>c.id===id))return no('Choose a mirror to turn.');p.rotations[id]=((p.rotations[id]??1)+1)%4;}
  if(!action.submit&&!action.check)return{ok:true,reason:'The mirror turns. Follow the beam to the star.',events:[{type:'expansion-puzzle-choice',activity:a.id}]};
  if(expansionLightConnected(a,p))return{solved:true};
 }else if(kind==='flavour-set'){
  if(choice!==undefined){if(!a.choices?.includes(choice))return no('Choose one of the ingredients shown.');const i=p.selected.indexOf(choice);i>=0?p.selected.splice(i,1):p.selected.push(choice);}
  if(!action.submit)return{ok:true,reason:'Compare these flavours with the clues.',events:[{type:'expansion-puzzle-choice',activity:a.id}]};
  if(p.selected.length===a.solution.length&&new Set(p.selected).size===a.solution.length&&a.solution.every(v=>p.selected.includes(v)))return{solved:true};
 }else if(kind==='stage-slots'){
  if(action.slot!==undefined){if(!a.slots.includes(action.slot)||!a.choices.includes(choice))return no('Choose a cue for a real stage position.');p.assignments[action.slot]=choice;}
  if(!action.submit)return{ok:true,reason:'The cue is placed. You can change it freely.',events:[{type:'expansion-puzzle-choice',activity:a.id}]};
  if(a.slots.every((slot,i)=>p.assignments[slot]===(Array.isArray(a.solution)?a.solution[i]:a.solution[slot]))&&new Set(Object.values(p.assignments)).size===a.slots.length)return{solved:true};
 }else{
  if(!a.choices?.includes(choice))return no('Choose one of the marks shown.');p.selected.push(choice);
  if(p.selected.length<a.solution.length)return{ok:true,reason:'The next mark waits.',events:[{type:'expansion-puzzle-choice',activity:a.id}]};
  if(p.selected.length===a.solution.length&&p.selected.every((v,i)=>v===a.solution[i]))return{solved:true};p.selected=[];
 }
 p.attempts++;return{ok:true,reason:'Not quite. Nothing is lost; inspect the clues or ask for a hint.',events:[{type:'expansion-puzzle-retry',activity:a.id}]};
}
function foodPortions(s){return Object.keys(s.kitchen?.food??{}).filter(id=>RECIPE_BY_ID[id]).reduce((n,id)=>n+availableFood(s,id),0);}
function payCost(s,cost){
 if(!cost)return true;const e=state(s);
 if(stockAvailable(s)<(cost.pumpkins??0)||foodPortions(s)<(cost.food??0)||s.coins<(cost.coins??0)||Object.entries(cost.materials??{}).some(([id,n])=>(s.village.materials[id]??0)<n)||Object.entries(cost.gems??{}).some(([id,n])=>(e.gems[id]??0)<n))return false;
 if(cost.pumpkins)takeVillageItem(s,'pumpkin:any',cost.pumpkins);
 let foodLeft=cost.food??0;for(const id of Object.keys(s.kitchen?.food??{}).filter(id=>RECIPE_BY_ID[id]).sort((a,b)=>(RECIPE_BY_ID[a].price??0)-(RECIPE_BY_ID[b].price??0)||a.localeCompare(b))){const quantity=Math.min(foodLeft,availableFood(s,id));if(quantity)takeVillageItem(s,`food:${id}`,quantity);foodLeft-=quantity;if(!foodLeft)break;}
 if(cost.pumpkins)settlePumpkinStock(s);
 s.coins-=cost.coins??0;for(const[id,n]of Object.entries(cost.materials??{}))s.village.materials[id]-=n;for(const[id,n]of Object.entries(cost.gems??{}))e.gems[id]-=n;return true;
}
function synchroniseSeals(e){const complete=EXPANSION_SEAL_FLAGS.every(flag=>e.effects.includes(flag));e.effects=e.effects.filter(flag=>flag!=='four-seals');if(complete)e.effects.push('four-seals');}
function settleChapter(s,c){
 const e=ensure(s);if(e.chapters[c.id]||e.receipts[c.id]){e.chapters[c.id]=true;if(e.tracked===c.id)e.tracked=null;return[];}
 if(!c.activities.every(id=>e.completed[id]))return[];
 e.chapters[c.id]=true;e.receipts[c.id]={claimed:true};if(e.tracked===c.id)e.tracked=null;const r=c.reward??{},rows=[];
 rows.push(...grantVillage(s,[...(r.coins?[{kind:'coins',amount:r.coins}]:[]),...(r.decor??[]).map(id=>({kind:VILLAGE_DECOR_BY_ID[id]?'village-decor':'decor',id})),...Object.entries(r.villageDecor??{}).map(([id,amount])=>({kind:'village-decor',id,amount})),...(r.costumes??[]).map(id=>({kind:'costume',id})),...(r.recipes??[]).map(id=>({kind:'recipe',id}))]));
 for(const[id,n]of Object.entries(r.materials??{})){const take=Math.min(n,Math.max(0,villageMaterialCapacity(s)-(s.village.materials[id]??0)));if(take){s.village.materials[id]=(s.village.materials[id]??0)+take;rows.push({kind:'material',id,amount:take});}}
 for(const[id,n]of Object.entries(r.estateDecor??{})){s.estate.ownedDecor??={};s.estate.ownedDecor[id]=(s.estate.ownedDecor[id]??0)+n;rows.push({kind:'estate-decor',id,amount:n});}
 for(const flag of [c.id,...(r.effects??[])])if(!e.effects.includes(flag))e.effects.push(flag);
 synchroniseSeals(e);
 const events=[{type:'expansion-chapter-complete',chapter:c.id,title:c.title,who:c.who,rewards:rows,effects:r.effects??[]}];
 for(const[who,xp]of Object.entries(r.friendship??{[c.who]:c.who==='vesper'?0:100}))if(xp)events.push(...addFriendship(s,who,xp));
 return events;
}
function startFarmBaselines(s){const e=ensure(s);for(const c of CHAPTERS())if(['available','active'].includes(chapterStatus(s,c))){const a=activityBy(currentId(s,c));if(a?.type==='farm'&&e.baselines[a.id]===undefined)e.baselines[a.id]=metric(s,a.metric);}}
export function actVillageExpansion(s,id,action={}){
 if(!s?.village?.invited||s.paused)return no('Resume your farm and follow the village invitation first.');
 if(typeof id==='string'&&id.startsWith('economy:'))return actExpansionEconomy(s,id.slice(8),action);
 if(id==='track'){const c=chapterBy(action.chapter);if(!c)return no('Choose a known chapter.');if(state(s).chapters[c.id]||state(s).receipts[c.id])return no('That chapter is complete. Choose your next story.');ensure(s).tracked=c.id;return{ok:true,reason:`Following ${c.title}`,events:[]};}
 const definition=activityBy(id);if(definition?.cost?.pumpkins)settlePumpkinStock(s);
 const info=expansionActivityInfo(s,id);if(!info)return no('That activity is not part of Mothlight.');
 if(!info.available||info.done||!near(info,action))return no(info.reason==='Ready'?'Walk closer to this activity.':info.reason);
 if(info.type==='vein')return mine(s,info);
 if(!info.canAct)return no(info.reason);
 const e=ensure(s),a=activityBy(id),c=chapterBy(a.chapter);
 if(a.type==='farm'&&e.baselines[id]===undefined){e.baselines[id]=metric(s,a.metric);return{ok:true,reason:`Head home to prepare: ${a.name}.`,events:[{type:'expansion-farm-task-start',activity:id}]};}
 if(a.type==='puzzle'){const result=puzzleAction(s,a,action);if(!result.solved)return result;}
 if(!payCost(s,a.cost))return no('Bring the materials and coins shown before restoring this.');
 e.completed[id]=true;if(a.questGem)e.questItems[id]=a.gem;
 if(typeof action.styleChoice==='string')e.choices[c.id]=action.styleChoice.slice(0,60);
 const events=[{type:'expansion-activity',activity:id,chapter:c.id,kind:a.type},...settleChapter(s,c)];startFarmBaselines(s);
 return{ok:true,complete:true,reason:a.type==='reveal'?(a.text??`${c.title} completed.`):a.questGem?'The story crystal is safe in your quest collection.':`${a.name} · complete`,events};
}
export function updateVillageExpansion(s,dt,events=[]){
 if(!baseState(s)||s.paused||!finite(dt)||dt<=0)return events;const e=state(s);
 for(const[id,r]of Object.entries(e.veins))if(r.remaining>0){r.remaining=Math.max(0,r.remaining-dt);if(!r.remaining)events.push({type:'village-resource-ready',node:id});}
 startFarmBaselines(s);return events;
}
export function sellExpansionGem(s,id,quantity=1){
 const gem=EXPANSION_GEMS.find(g=>g.id===id),e=state(s);if(!gem||s.paused||!s.village?.unlocks?.includes('stall')||!Number.isInteger(quantity)||quantity<1||quantity>999||(e.gems[id]??0)<quantity)return no('Reopen Rowan’s stall and choose unreserved gems you own.');
 const amount=gem.price*quantity;e.gems[id]-=quantity;s.coins+=amount;s.earned+=amount;e.gemIncome+=amount;return{ok:true,amount,reason:`Sold ${quantity} ${gem.name} for £${amount}.`,events:[{type:'expansion-gem-sale',gem:id,quantity,amount}]};
}
