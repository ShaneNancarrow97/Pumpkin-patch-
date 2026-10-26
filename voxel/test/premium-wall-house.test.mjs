import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { decorCatalog as original } from "../../src/content/catalog.mjs";
import { PREMIUM_WALL_CATALOG } from "../src/content/premium-wall-catalog.js";
import { premiumWallStats } from "../src/premium-wall-props.js";

test("premium voxel pieces can be bought, hung, stored and restored without changing the root catalogue",()=>{
  assert.equal(original.length,50);
  assert.equal(M.decorCatalog.length,73);                         // 50 + 6 premium wall + 6 premium floor + 5 blank shelves
  for(const item of PREMIUM_WALL_CATALOG) {
    const s=M.freshState();s.coins=item.price-1;
    assert.equal(M.buyDecor(s,item.id),false);
    s.coins=item.price;assert.equal(M.buyDecor(s,item.id),true);assert.equal(s.coins,0);
    assert.equal(M.buyDecor(s,item.id),false);
    const instance=M.placeDecor(s,item.id);
    assert.ok(instance,item.id+" can be hung on cottage hooks");
    const piece=s.house.placed.find(p=>p.instance===instance);
    assert.equal(piece.z,0);assert.equal(M.footprint(item.id).layer,"wall");
    assert.ok(M.footprint(item.id).w>=({"copper-pan-rail":2.25,"recipe-teapot-shelf":2.05,"haunted-manor-painting":2.3}[item.id]??1.6));
    assert.equal(M.moveDecor(s,instance,piece.x,1),false,"wall pieces stay off the floor");
    const restored=M.restoreState(M.saveData(s));
    assert.ok(restored.house.owned.includes(item.id));
    assert.deepEqual(restored.house.placed.find(p=>p.instance===instance),piece);
    M.removeDecor(restored,instance);
    assert.ok(restored.house.owned.includes(item.id),"storing retains ownership");
    assert.ok(!restored.house.placed.some(p=>p.instance===instance));
  }
});

test("wide wall items reserve their full hook span and keep the kitchen floor free",()=>{
  const s=M.freshState();s.house.level=3;s.coins=1e6;
  for(const item of PREMIUM_WALL_CATALOG) M.buyDecor(s,item.id);
  const a=M.placeDecor(s,"copper-pan-rail","kitchen");
  const p=s.house.placed.find(q=>q.instance===a);
  assert.ok(a);assert.equal(M.fits(s,"kitchen","iron-utensil-rack",p.x+2,0),false);
  assert.equal(M.fits(s,"kitchen","f04",p.x,0),true,"a wall rail does not block a floor cell");
  const b=M.placeDecor(s,"iron-utensil-rack","kitchen");
  assert.ok(b);assert.equal(s.house.placed.find(q=>q.instance===b).x,p.x+3);
});

test("premium wall mounts clear bookcases and stay below the ceiling trim",()=>{
  for(const item of PREMIUM_WALL_CATALOG) {
    const {height}=premiumWallStats(item.id);
    assert.ok(item.hangHeight-height/2>=2.65,item.id+" clears tall floor furniture");
    assert.ok(item.hangHeight+height/2<5.2,item.id+" fits below the room cornice");
  }
});
