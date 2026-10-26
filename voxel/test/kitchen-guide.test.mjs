import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../src/model.js';import {recipeShoppingList,kitchenNextStep} from '../src/ui/kitchen-guide.js';
const setup=()=>{const s=M.freshState();s.earned=110000;s.coins=50000;M.buyFoodTruck(s);return s;};
test('shopping list subtracts both pantry and already-paid deliveries without spending',()=>{
 const s=setup();s.kitchen.pantry.butter=1;s.kitchen.orders=[{items:{butter:2},remaining:60,phase:'ordered'}];
 const before=JSON.stringify(s),list=recipeShoppingList(s,M.RECIPE_BY_ID.wedges,5);assert.deepEqual(list.items,{butter:2});assert.equal(list.quantity,2);assert.equal(JSON.stringify(s),before);
});
test('a large recipe order is capped and explicitly marked partial',()=>{
 const s=setup(),list=recipeShoppingList(s,M.RECIPE_BY_ID['haunted-pie'],10);assert.equal(list.quantity,40);assert.ok(list.partial);assert.ok(Object.values(list.items).every(n=>n>0));
});
test('first dish guidance moves through supplies, delivery, harvest and ready',()=>{
 const s=setup();assert.equal(kitchenNextStep(s).kind,'supplies');s.kitchen.orders=[{items:{butter:1}}];assert.equal(kitchenNextStep(s).kind,'delivery');s.kitchen.orders=[];s.kitchen.pantry.butter=1;assert.equal(kitchenNextStep(s).kind,'harvest');s.stock[0]=1;assert.equal(kitchenNextStep(s).kind,'ready');
});
test('finished food points to opening the shop then stocking shelves, never charges',()=>{
 const s=setup();s.kitchen.food.wedges=2;assert.equal(kitchenNextStep(s).kind,'shop');s.shop.unlocked=true;assert.equal(kitchenNextStep(s).kind,'sell');s.kitchen.displays[0]='wedges';assert.equal(kitchenNextStep(s).kind,'supplies');assert.equal(s.coins,49100);
});
test('a paid job takes priority over guidance and empty home kitchen points to equipment',()=>{
 const s=setup();s.kitchen.jobs.truck={recipe:'wedges'};assert.equal(kitchenNextStep(s).kind,'cooking');assert.equal(kitchenNextStep(s,'home').kind,'equipment');
});
