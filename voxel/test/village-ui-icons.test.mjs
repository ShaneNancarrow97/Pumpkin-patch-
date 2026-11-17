import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { villageUIIcon } from '../src/ui/village-ui-icon-markup.js';
import { VILLAGE_UI_GRID, VILLAGE_UI_ICONS } from '../src/content/village-ui-icon-meta.js';

test('village menu atlas has twelve distinct known slots and bounded runtime size',()=>{
  assert.deepEqual(Object.keys(VILLAGE_UI_ICONS), ['map','people','quests','satchel','workshop','build','farm','home','tree','lock','axe','pickaxe']);
  assert.equal(VILLAGE_UI_GRID.columns,4); assert.equal(VILLAGE_UI_GRID.rows,3); assert.equal(VILLAGE_UI_GRID.cell,128);
  const seen=new Set();
  for(const [id,slot] of Object.entries(VILLAGE_UI_ICONS)){
    assert.ok(slot.column>=0&&slot.column<4&&slot.row>=0&&slot.row<3);
    seen.add(slot.column+','+slot.row);
    const html=villageUIIcon(id,28);assert.ok(html.includes(`data-village-ui-icon="${id}"`));assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('--vg-ui-size:28px'));
  }
  assert.equal(seen.size,12);
  assert.ok(fs.statSync(new URL('../assets/village-ui-icons/village-ui.webp',import.meta.url)).size<200000);
});

test('village icon markup safely rejects unknown IDs and clamps callers to legible sizes',()=>{
  for(const id of ['unknown','__proto__','constructor','<img src=x>',undefined])assert.equal(villageUIIcon(id),'');
  assert.ok(villageUIIcon('map',-3).includes('--vg-ui-size:24px'));
  assert.ok(villageUIIcon('map',Infinity).includes('--vg-ui-size:96px'));
  assert.ok(villageUIIcon('map','oops').includes('--vg-ui-size:28px'));
  assert.ok(villageUIIcon('pickaxe').includes('--vg-ui-x:100%;--vg-ui-y:100%'));
});
