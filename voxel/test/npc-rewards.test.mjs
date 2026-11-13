import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';
import { createNpcRewards } from '../src/ui/npc-rewards.js';
// Verify the real UI controller against its small DOM surface, without WebGL.
function fixture() {
 let at=0,saves=0;const buttons=new Map(),classes=new Set();
 const host={hidden:true,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,v)=>v?classes.add(c):classes.delete(c)},setAttribute(){},contains:()=>false,matches:()=>false,style:{setProperty(){}},querySelector(key){if(!buttons.has(key))buttons.set(key,{});return buttons.get(key);}};
 const old=globalThis.document;globalThis.document={createElement:()=>host,body:{append(){}},getElementById:()=>({focus(){}})};
 const s=M.freshState();s.harvested=6;
 const view=createNpcRewards({state:()=>s,portrait:()=>null,save:()=>saves++,tone(){},notice(){},now:()=>at});
 return{s,host,classes,buttons,view,get saves(){return saves;},step(ms,blocked=false){at+=ms;view.tick(blocked);},cleanup(){globalThis.document=old;}};
}
test('collection pays a favour once, including repeated button clicks',()=>{
 const f=fixture();try{f.step(0);assert.equal(f.host.hidden,false);assert.match(f.host.innerHTML,/Collect £25/);f.buttons.get('[data-collect-favour]').onclick();assert.equal(f.s.coins,65);assert.equal(f.saves,1);f.buttons.get('[data-collect-favour]').onclick();assert.equal(f.s.coins,65);assert.equal(f.saves,1);f.step(1);assert.equal(f.host.hidden,true);}finally{f.cleanup();}
});
test('uncollected cards fade after twelve visible seconds, keeping the Journal reward',()=>{
 const f=fixture();try{f.step(0);for(let n=0;n<11;n++)f.step(1000);assert.equal(f.classes.has('fading'),false);f.step(1000);assert.equal(f.classes.has('fading'),true);f.step(400);assert.equal(f.host.hidden,true);assert.equal(M.claimable(f.s)[0].id,'basket');assert.equal(f.s.coins,40);f.step(1000);assert.equal(f.host.hidden,true);assert.equal(M.claimFavour(f.s,'basket'),25);}finally{f.cleanup();}
});
test('menus suspend countdown; collecting from Journal dismisses the card',()=>{
 const f=fixture();try{f.step(0);for(let n=0;n<30;n++)f.step(1000,true);assert.equal(f.classes.has('suspended'),true);f.step(1);assert.equal(f.classes.has('fading'),false);M.claimFavour(f.s,'basket');f.step(1);assert.equal(f.host.hidden,true);}finally{f.cleanup();}
});
