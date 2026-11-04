import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import * as M from '../src/model.js';

let compiled;
async function harness(){
 compiled??=build({entryPoints:[new URL('../src/ui/cooking-sheet.js',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'art-doubles',setup(b){
  b.onLoad({filter:/\/maisie\.js$/},()=>({contents:'export const maisieIcon=()=>\'<span class="maisie-art"></span>\';',loader:'js'}));
  b.onLoad({filter:/\/ui\/cooking-icons\.js$/},()=>({contents:'export const cookingIcon=id=>\'<span class="dish-art" data-icon="\'+id+\'"></span>\';',loader:'js'}));
  b.onLoad({filter:/\/ui\/kitchen-food-art\.js$/},()=>({contents:'export const ingredientIcon=(id,size)=>\'<span data-ingredient="\'+id+\'"></span>\'; export const dishIcon=(id,size)=>\'<span class="dish-art" data-dish="\'+id+\'" style="width:\'+size+\'px"></span>\';',loader:'js'}));
  b.onLoad({filter:/\/ui\/kit\.js$/},()=>({contents:'export const money=n=>"£"+Math.floor(n);export const segmented=()=>"";',loader:'js'}));
 }}]});
 const bundle=await compiled, sandbox={module:{exports:{}}};vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
 const s=M.freshState();s.coins=100000;s.earned=2000000;s.progression.claimed=M.LEVELS.map(l=>l.level);s.progression.homeLegacyThrough=20;s.house.level=3;M.buyFoodTruck(s);
 let saves=0,draws=0,animations=0;
 const ui={state:s,scene:{place:{kind:'room',id:'kitchen'},refreshCooking(){},refreshRoom(){}},save(){saves++;},draw(){draws++;},tone(){},notice(){},closeSheet(){},enterKitchen(){return true;},showCookingAnimation(){animations++;}};
 const sheet=sandbox.module.exports.cookingSheets(ui).cooking;
 function button(selector,dataset){
  const b={dataset,onclick:null,addEventListener(kind,handler){if(kind==='click')this.onclick=handler;}};
  const host={querySelectorAll:q=>q===selector?[b]:[],querySelector:q=>q===selector?b:null};sheet.bind(host);assert.equal(typeof b.onclick,'function',selector+' is a live action');return b;
 }
 return {s,sheet,button,get saves(){return saves;},get draws(){return draws;},get animations(){return animations;}};
}

test('the main cooking page presents one chosen dish and four clear destinations without a form',async()=>{
 const h=await harness(),before=JSON.stringify(h.s),html=h.sheet.body();
 assert.match(html,/cooking-chosen-dish/);assert.match(html,/width:128px/);
 assert.equal((html.match(/data-cooking-start=/g)||[]).length,1);
 for(const name of ['Cook','Pantry','Sell','Progress'])assert.match(html,new RegExp('>'+name+'<'));
 assert.doesNotMatch(html,/<input|<select/);assert.equal(JSON.stringify(h.s),before,'browsing cannot spend or consume');
});

test('pantry quick-add clamps the whole cart and one explicit order pays once',async()=>{
 const h=await harness();h.sheet.setTab('pantry');const before=h.s.coins;
 const add=h.button('[data-cooking-quantity-step]',{cookingQuantityStep:'butter',step:'5'});for(let i=0;i<9;i++)add.onclick();
 assert.match(h.sheet.body(),/40 \/ 40 in cart/);assert.equal(h.s.coins,before);
 assert.doesNotMatch(h.sheet.body(),/<input|<select/);
 const order=h.button('[data-cooking-action]',{cookingAction:'order'});order.onclick();
 assert.equal(h.s.kitchen.orders.length,1);assert.equal(h.s.kitchen.orders[0].items.butter,40);assert.equal(h.s.coins,before-126);
 order.onclick();assert.equal(h.s.kitchen.orders.length,1,'cleared cart prevents a second accidental charge');assert.equal(h.s.coins,before-126);
});

test('missing-supplies action quotes the selected batch and subtracts deliveries already paid for',async()=>{
 const h=await harness();h.s.kitchen.orders=[{id:1,phase:'travelling',remaining:30,items:{butter:2}}];
 h.button('[data-cooking-batch]',{cookingBatch:'5'}).onclick();
 const coins=h.s.coins;h.button('[data-recipe-order]',{recipeOrder:'wedges'}).onclick();
 assert.match(h.sheet.body(),/3 \/ 40 in cart/);assert.equal(h.s.coins,coins);
 h.button('[data-cooking-action]',{cookingAction:'order'}).onclick();
 assert.equal(h.s.kitchen.orders[1].items.butter,3);assert.equal(h.s.coins,coins-15);
});

test('Max cooking respects both stations reserved output and consumes only the legal batch',async()=>{
 const h=await harness();h.s.kitchen.pantry.butter=10;h.s.stock[0]=10;h.s.kitchen.food.wedges=20;
 h.s.kitchen.jobs.home={recipe:'wedges',batches:2,completed:0,remaining:20,duration:30};
 h.button('[data-cooking-batch]',{cookingBatch:'max'}).onclick();const coins=h.s.coins;
 assert.match(h.sheet.body(),/Cook 6 portions/);
 h.button('[data-cooking-start]',{cookingStart:'wedges',cookingAt:'truck'}).onclick();
 assert.equal(h.s.kitchen.jobs.truck.batches,3);assert.equal(h.s.kitchen.pantry.butter,7);assert.equal(h.s.stock[0],7);assert.equal(h.s.coins,coins);assert.equal(h.animations,1);
});

test('visual mixing controls discover a real recipe while invalid mixes use nothing',async()=>{
 const h=await harness();h.sheet.setTab('mix');h.s.kitchen.pantry.butter=2;h.s.stock[0]=2;
 assert.doesNotMatch(h.sheet.body(),/<input|<select/);
 h.button('[data-mix-ingredient-pick]',{mixIngredientPick:'butter'}).onclick();
 const before=JSON.stringify(h.s);h.button('[data-cooking-mix-start]',{}).onclick();assert.equal(JSON.stringify(h.s),before);
 h.button('[data-mix-ingredient-pick]',{mixIngredientPick:'pumpkin:0'}).onclick();
 h.button('[data-mix-method-pick]',{mixMethodPick:'pan'}).onclick();
 h.button('[data-cooking-mix-start]',{}).onclick();assert.equal(h.s.kitchen.jobs.truck.recipe,'wedges');assert.equal(h.s.kitchen.pantry.butter,1);assert.equal(h.s.stock[0],1);
});

test('Progress exposes a tappable chef menu and keeps home-equipment management reachable',async()=>{
 const h=await harness();h.s.kitchen.upgrades.chef=1;h.sheet.setTab('equipment');
 const html=h.sheet.body();assert.match(html,/Home kitchen cookware/);assert.match(html,/data-cooking-equipment=/);assert.match(html,/data-chef-recipe-pick=/);assert.doesNotMatch(html,/<select/);
 const coins=h.s.coins;h.button('[data-chef-recipe-pick]',{chefRecipePick:'wedges'}).onclick();assert.equal(h.s.kitchen.chefRecipe,'wedges');assert.equal(h.s.coins,coins);
 h.button('[data-chef-recipe-pick]',{chefRecipePick:''}).onclick();assert.equal(h.s.kitchen.chefRecipe,null);
});
