import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { decorCatalog as originals } from "../../src/content/catalog.mjs";
import { PREMIUM_FURNITURE_CATALOG } from "../src/content/premium-furniture-catalog.js";
import { PREMIUM_WALL_CATALOG } from "../src/content/premium-wall-catalog.js";
import { PREMIUM_FURNITURE_ITEMS,premiumFurnitureStats } from "../src/premium-furniture-props.js";
import { premiumWallStats } from "../src/premium-wall-props.js";

test("the six premium floor pieces use existing buying, moving and restoration",()=>{
  assert.equal(originals.length,50);
  assert.equal(M.decorCatalog.length,73);                         // 50 + 6 premium wall + 6 premium floor + 5 blank shelves
  for(const item of PREMIUM_FURNITURE_CATALOG) {
    const s=M.freshState();s.house.level=3;s.coins=item.price-1;
    const model=PREMIUM_FURNITURE_ITEMS.find(p=>p.id===item.id),room=model.room;
    assert.ok(model);assert.deepEqual(item.footprint,model.footprint);
    assert.equal(item.name,model.name,"the catalogue and preview share a name");
    assert.equal(M.buyDecor(s,item.id),false);
    s.coins=item.price;assert.equal(M.buyDecor(s,item.id),true);assert.equal(s.coins,0);
    assert.equal(M.buyDecor(s,item.id),false);
    const instance=M.placeDecor(s,item.id,room);
    assert.ok(instance,item.id+" finds space in its room");
    assert.deepEqual(M.footprint(item.id),{w:item.footprint[0],d:item.footprint[1],layer:"floor"});
    const piece=s.house.placed.find(p=>p.instance===instance),before={...piece};
    assert.equal(M.fits(s,room,"f04",piece.x,piece.z),false,"other floor pieces cannot clip through it");
    assert.equal(M.moveDecor(s,instance,M.roomLayout(s,room).w-1,0),false,"its whole footprint must fit");
    assert.deepEqual(piece,before,"a rejected move does not drift the piece");
    assert.ok(M.moveDecor(s,instance,4,3),"can be moved to a clear grid position");
    const restored=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
    assert.deepEqual(restored.house.placed.find(p=>p.instance===instance),piece);
    assert.ok(restored.house.owned.includes(item.id));
    M.removeDecor(restored,instance);
    assert.ok(restored.house.owned.includes(item.id),"stored pieces stay owned");
    assert.ok(M.placeDecor(restored,item.id,room),"can be placed again from storage");
  }
});

test("premium floor and wall geometry share a clear vertical space",()=>{
  const ceiling=5.2,maxHeight=Math.max(...PREMIUM_FURNITURE_ITEMS.map(item=>premiumFurnitureStats(item.id).height));
  assert.ok(maxHeight<=3.01,"furniture has a consistent room scale");
  for(const item of PREMIUM_WALL_CATALOG) {
    const {height}=premiumWallStats(item.id);
    assert.ok(item.hangHeight-height/2>maxHeight+.01,item.id+" clears the new canopy and wardrobe");
    assert.ok(item.hangHeight+height/2<ceiling,item.id+" stays under the cornice");
  }
});
