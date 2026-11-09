import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { shopDisplayTableView, renderShopDisplayTables } from "../src/ui/shop-display-tables.js";

function shop() { const state=M.freshState();state.shop.unlocked=true;state.shop.displays=[0,1,null,null];state.stock[0]=17;state.stock[1]=4;return state; }
const thumb = id => `<span class="thumb"><img alt="" src="pumpkin-${id}.png"></span>`;

test("display choices show existing stock and sale prices without changing the farm", () => {
  const state=shop(),before=JSON.stringify(state),view=shopDisplayTableView(state,0),html=renderShopDisplayTables(state,{thumb});
  assert.equal(view.count,2);assert.equal(view.tables[0].name,"Back left");assert.equal(view.tables[1].name,"Back right");
  assert.equal(view.table.product.name,M.VARIETIES[0].name);assert.equal(view.table.available,M.available(state,0));
  assert.equal(view.choices.find(c=>c.variety===0).selected,true);assert.equal(view.choices.find(c=>c.variety===1).disabled,true);assert.equal(view.choices.find(c=>c.variety===1).elsewhere,1);
  assert.match(html,/Free to change/);assert.match(html,/base price/);assert.match(html,/17 available/);assert.match(html,/On Table 2/);
  assert.equal((html.match(/data-display-table=/g)??[]).length,2);
  assert.equal((html.match(/data-display="/g)??[]).length,M.VARIETIES.length+1,"only the chosen table expands its stock choices");
  assert.ok(html.includes(`data-display="0:0" aria-pressed="true"`));assert.ok(html.includes('data-display="0:null"'));
  assert.equal(JSON.stringify(state),before,"presentation may not buy, move or grant stock");
});

test("every enabled choice agrees with the real assignment rule, including empty and sold out", () => {
  const state=shop();state.shop.displayLevel=1;state.shop.displays=[0,1,2,null];
  for(let table=0;table<M.displayCount(state.shop);table++)for(const choice of shopDisplayTableView(state,table).choices){
    const copy=structuredClone(state),coins=copy.coins,stock=[...copy.stock];
    assert.equal(M.assignDisplay(copy,table,choice.variety),!choice.disabled,`table${table} variety${choice.variety}`);
    assert.equal(copy.coins,coins,"selecting a display has no purchase cost");assert.deepEqual(copy.stock,stock,"displaying stock doesn't consume it");
  }
  const soldOut=shopDisplayTableView(state,3).choices.find(c=>c.variety===M.VARIETIES.length-1);
  assert.equal(soldOut.available,0);assert.equal(soldOut.disabled,false,"an empty stock variety can still be planned on a table");
  assert.match(renderShopDisplayTables(state,{selectedTable:3,thumb}),/Sold out/);
});

test("extra tables retain clear slot identity and unavailable duplicate assignments explain their location", () => {
  const state=shop();state.shop.displayLevel=1;state.shop.displays=[0,1,2,3];
  const view=shopDisplayTableView(state,3),html=renderShopDisplayTables(state,{selectedTable:3,thumb});
  assert.equal(view.table.name,"Front right");assert.equal(view.table.variety,3);assert.equal(view.selected,3);
  assert.match(html,/skyla-display-table-3" role="tab"[^>]*aria-selected="true"/);assert.match(html,/data-display="3:3" aria-pressed="true"/);
  assert.match(html,/data-display="3:null"/);assert.equal(shopDisplayTableView(state,99).selected,3);assert.equal(shopDisplayTableView(state,NaN).selected,0);
  // If an older/edited save retains an extra slot after restoring fewer tables,
  // match the real rule rather than offering a button that silently fails.
  state.shop.displayLevel=0;const hidden=shopDisplayTableView(state,0).choices.find(c=>c.variety===3);assert.equal(hidden.disabled,true);assert.equal(hidden.elsewhere,3);assert.match(renderShopDisplayTables(state,{thumb}),/On an extra table/);
});
