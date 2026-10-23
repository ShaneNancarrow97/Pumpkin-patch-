import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { createFoyerControls } from "../src/ui/foyer-controls.js";
function fixture() {
 const old=globalThis.document,listeners={},previews=[],host={setAttribute(){},addEventListener(n,f){listeners[n]=f;}};
 globalThis.document={createElement:()=>host,body:{append(){}}};const state=M.freshState();state.coins=100000;state.hollowHouse.purchased=true;state.hollowHouse.status="ready";
 const tools=createFoyerControls({state,scene:{place:{kind:"foyer"},previewFoyerDecor:p=>previews.push(p),refreshFoyer(){}},save(){},notice(){}});
 return {state,tools,previews,click:a=>listeners.click({target:{closest:()=>({dataset:{foyerControl:a}})}}),cleanup(){globalThis.document=old;}};
}
test("foyer rotation and colour can each be undone, then Done clears the preview",()=>{const f=fixture();try{assert.ok(M.buyFoyerDecor(f.state,"skull-plinth"));f.tools.selectForPlacement("skull-plinth");assert.ok(f.tools.placeAt(-4,1.75));const p=f.state.hollowHouse.foyer.placed.find(p=>p.id==="skull-plinth");assert.ok(f.tools.rotate(15));assert.equal(p.rotation,15);f.tools.undo();assert.equal(p.rotation,0);f.click("colour");assert.equal(p.tint,"amber");f.tools.undo();assert.ok(!p.tint||p.tint==="original");f.tools.done();assert.equal(f.tools.active,false);assert.equal(f.previews.at(-1),null);}finally{f.cleanup();}});
test("an invalid rotation keeps the last valid pose; Cancel returns a newly placed owned item",()=>{const f=fixture();try{M.buyFoyerDecor(f.state,"skull-plinth");f.tools.selectForPlacement("skull-plinth");assert.ok(f.tools.placeAt(2.25,1.5));const before={...f.tools.placement};assert.equal(f.tools.rotate(15),false);assert.deepEqual(f.tools.placement,before);f.tools.cancel();assert.equal(f.state.hollowHouse.foyer.ownedDecor["skull-plinth"],1);assert.equal(f.tools.active,false);}finally{f.cleanup();}});
test("dragging and two-finger turning move the foyer piece live, keep the last spot that fits, and save on release",()=>{const f=fixture();try{
 assert.ok(M.buyFoyerDecor(f.state,"skull-plinth"));f.tools.selectForPlacement("skull-plinth");assert.ok(f.tools.placeAt(-1.5,2.5));const p=f.state.hollowHouse.foyer.placed.find(q=>q.id==="skull-plinth");
 assert.ok(f.tools.beginGesture());assert.ok(f.tools.dragTo(-1.47,2.96));assert.deepEqual([p.x,p.z],[-1.5,2.5],"nothing is saved mid-drag");assert.deepEqual([f.tools.placement.x,f.tools.placement.z],[-1.5,3],"the live pose snaps to 0.1");
 assert.equal(f.tools.dragTo(0,0),false,"the ticket lane is refused");assert.deepEqual([f.tools.placement.x,f.tools.placement.z],[-1.5,3],"the last spot that fits is kept");
 assert.ok(f.tools.turn(7.5));assert.equal(f.tools.placement.rotation,7.5,"turning is free, not 15-degree steps");
 assert.ok(f.tools.endGesture());assert.deepEqual([p.x,p.z,p.rotation],[-1.5,3,7.5]);f.tools.undo();assert.deepEqual([p.x,p.z,p.rotation],[-1.5,2.5,0]);
 assert.ok(f.tools.beginGesture());assert.ok(f.tools.dragTo(-1.5,2));f.tools.endGesture(true);assert.deepEqual([p.x,p.z],[-1.5,2.5],"a cancelled gesture saves nothing");
 assert.ok(f.tools.nudge(0,.1));assert.equal(p.z,2.6);assert.ok(f.tools.select(p.instance));assert.equal(p.z,2.6,"tapping the selected piece keeps its moves");
}finally{f.cleanup();}});
