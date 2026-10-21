import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const state = (level = 0) => { const s = M.freshState(); s.house.level = level; s.coins = 100000; return s; };

test("eight complete skins unlock in pairs across all existing house levels", () => {
  assert.equal(M.ESTATE_HOUSE_SKINS.length, 8);
  assert.deepEqual([0,1,2,3].map(level => M.ESTATE_HOUSE_SKINS.filter(skin => skin.houseLevel === level).length), [2,2,2,2]);
  const ids = new Set();
  for (const skin of M.ESTATE_HOUSE_SKINS) {
    assert.equal(Object.keys(skin.finishes).length, 4);
    for (const [part,id] of Object.entries(skin.finishes)) {
      assert.ok(!ids.has(id)); ids.add(id);
      const finish = M.ESTATE_FINISH_BY_ID[id];
      assert.equal(finish.category, part); assert.equal(finish.skinId, skin.id); assert.equal(finish.skinOnly, true);
    }
    if (skin.houseLevel) {
      const locked = state(skin.houseLevel - 1), before = structuredClone(locked.estate);
      assert.equal(M.buyEstateSkin(locked,skin.id), false); assert.equal(locked.coins,100000); assert.deepEqual(locked.estate,before);
    }
    const s = state(skin.houseLevel), oldFinishes = {...s.estate.finishes};
    assert.ok(M.buyEstateSkin(s,skin.id)); assert.equal(s.coins,100000-skin.cost); assert.equal(s.estate.invested,skin.cost);
    assert.deepEqual(s.estate.finishes,oldFinishes,"purchase stays separate from equip"); assert.ok(M.ownsEstateSkin(s,skin.id));
    assert.equal(M.buyEstateSkin(s,skin.id),false); assert.equal(s.coins,100000-skin.cost);
    assert.ok(M.equipEstateSkin(s,skin.id)); assert.equal(M.activeEstateSkin(s)?.id,skin.id);
    for (const [part,id] of Object.entries(skin.finishes)) assert.equal(s.estate.finishes[part],id);
    assert.equal(s.estate.finishes.fence,oldFinishes.fence,"a house skin preserves garden fencing");
  }
});

test("failed skin purchases leave money, inventory and existing finishes untouched",()=>{
 const skin=M.ESTATE_HOUSE_SKINS[0];
 for(const setup of [s=>s.coins=skin.cost-1,s=>s.paused=true]){
  const s=state(3);setup(s);const before={coins:s.coins,estate:structuredClone(s.estate)};
  assert.equal(M.buyEstateSkin(s,skin.id),false);assert.equal(s.coins,before.coins);assert.deepEqual(s.estate,before.estate);
 }
 const s=state(3);for(const id of ["missing","__proto__","constructor",null,{},0]){
  assert.equal(M.buyEstateSkin(s,id),false);assert.equal(M.equipEstateSkin(s,id),false);assert.equal(M.ownsEstateSkin(s,id),false);
 }
 for(const id of Object.values(skin.finishes)) assert.equal(M.buyEstateFinish(s,id),false,"bundle parts cannot be purchased separately for free");
 assert.equal(s.coins,100000);assert.equal(M.activeEstateSkin(s),null);
});

test("owned skins survive upgrades, mixing finishes and a complete save round trip",()=>{
 const s=state(),first=M.ESTATE_HOUSE_SKINS[0],premium=M.ESTATE_SKIN_BY_ID["midnight-crypt"];
 assert.equal(M.equipEstateSkin(s,first.id),false);assert.ok(M.buyEstateFinish(s,"moon-stone"));assert.ok(M.equipEstateFinish(s,"moon-stone"));
 assert.ok(M.buyEstateSkin(s,first.id));assert.ok(M.equipEstateSkin(s,first.id));const paid=s.coins;
 s.house.level=3;assert.ok(M.equipEstateSkin(s,first.id));assert.equal(s.coins,paid,"early collection can be reused on a larger house for free");
 assert.ok(M.equipEstateFinish(s,"moon-stone"));assert.equal(M.activeEstateSkin(s),null);assert.ok(M.ownsEstateSkin(s,first.id));
 assert.ok(M.buyEstateSkin(s,premium.id));assert.ok(M.equipEstateSkin(s,premium.id));
 const cash=s.coins;s.paused=true;assert.equal(M.equipEstateSkin(s,first.id),false);assert.equal(s.coins,cash);assert.equal(M.activeEstateSkin(s)?.id,premium.id);s.paused=false;
 const restored=M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
 assert.equal(restored.house.level,3);assert.deepEqual(restored.estate,s.estate);assert.equal(M.activeEstateSkin(restored)?.id,premium.id);assert.ok(M.ownsEstateSkin(restored,first.id));
 assert.ok(M.equipEstateSkin(restored,first.id));assert.equal(restored.coins,cash);assert.ok(restored.estate.ownedFinishes.includes("moon-stone"));
});

test("older save data acquires no paid skins and retains its existing exterior",()=>{
 const s=state(2);M.buyEstateFinish(s,"moon-stone");M.equipEstateFinish(s,"moon-stone");
 const old=M.saveData(s),restored=M.restoreState(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(restored.estate,s.estate);assert.equal(M.activeEstateSkin(restored),null);
 assert.ok(M.ESTATE_HOUSE_SKINS.every(skin=>!M.ownsEstateSkin(restored,skin.id)));
});
