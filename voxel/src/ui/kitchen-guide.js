// Read-only guidance. Quotes never buy supplies or consume ingredients.
import { RECIPES, COOKING } from '../content/cooking.js';
import { available } from '../rules/stock.js';
import { kitchenEquipment } from '../rules/kitchen-equipment.js';
import { patchLevel } from '../rules/levels.js';
export function recipeShoppingList(s,recipe,batches=1){
 const incoming={};for(const o of s.kitchen.orders)for(const [id,n] of Object.entries(o.items))incoming[id]=(incoming[id]??0)+n;
 const items={};let remaining=COOKING.orderLimit, missing=0;
 for(const [id,n] of Object.entries(recipe.ingredients)){const need=Math.max(0,n*batches-(s.kitchen.pantry[id]??0)-(incoming[id]??0));missing+=need;const take=Math.min(need,remaining);if(take)items[id]=take;remaining-=take;}
 return {items,quantity:Object.values(items).reduce((a,b)=>a+b,0),partial:missing>COOKING.orderLimit};
}
export function kitchenNextStep(s,station='truck',preferred=null){
 const k=s.kitchen;if(!k?.purchased)return {kind:'purchase'};
 const job=k.jobs[station];if(job)return {kind:'cooking',recipe:job.recipe};
 if(Object.values(k.food).some(n=>n>0)&&!k.displays.some(id=>id&&(k.food[id]??0)>0))return {kind:s.shop.unlocked?'sell':'shop'};
 const equipment=kitchenEquipment(s,station),candidates=RECIPES.filter(r=>k.recipes.includes(r.id)&&r.level<=patchLevel(s).level&&(!r.homeOnly||station==='home')&&(r.equipment??[]).every(id=>equipment.includes(id)));
 const r=candidates.find(r=>r.id===preferred)??candidates[0];
 if(!r)return {kind:'equipment'};
 const list=recipeShoppingList(s,r);if(list.quantity)return {kind:'supplies',recipe:r.id,items:list.items};
 if(Object.entries(r.ingredients).some(([id,n])=>(k.pantry[id]??0)<n))return {kind:'delivery',recipe:r.id};
 const pumpkin=Object.entries(r.pumpkins).find(([v,n])=>available(s,+v)<n);if(pumpkin)return {kind:'harvest',variety:+pumpkin[0],quantity:pumpkin[1]};
 return {kind:'ready',recipe:r.id};
}
