import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { PLAYER_DIRECTION_META } from '../src/player-direction-meta.js';
import { costumeCatalog } from '../src/rules/wardrobe.js';

test('every selectable owner look has its own side and back walk frames',()=>{
  assert.equal(Object.keys(PLAYER_DIRECTION_META).length,costumeCatalog.length);
  for(const costume of costumeCatalog){
    const meta=PLAYER_DIRECTION_META[costume.id];
    assert.ok(meta,costume.id+' must not silently borrow a base outfit');
    for(const direction of ['side','back']){
      assert.ok(meta[direction]?.length>=2,costume.id+' '+direction);
      assert.equal(new Set(meta[direction].map(f=>`${f.x},${f.y}`)).size,meta[direction].length);
      for(const f of meta[direction]){
        assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=meta.w&&f.y+f.h<=meta.h);
        assert.equal(f.ay,330);assert.equal(f.ax,140);
      }
    }
  }
});

test('both originals have dedicated planting, watering and picking poses',()=>{
  for(const who of ['shane','natalie']){
    const meta=PLAYER_DIRECTION_META[who+'-base'];
    assert.equal(meta.side.length,4);assert.equal(meta.back.length,4);
    for(const action of ['plant','water','harvest'])assert.equal(meta[action].length,1);
  }
  assert.ok(PLAYER_DIRECTION_META['natalie-wheelchair']);
});

test('all runtime direction sheets remain within a small mobile art budget',()=>{
  const sheets=new Set(Object.values(PLAYER_DIRECTION_META).map(m=>m.sheet));let total=0;
  for(const sheet of sheets)total+=statSync(new URL('../assets/player-directions-'+sheet+'.webp',import.meta.url)).size;
  assert.ok(total<2*1024*1024,'turnaround art exceeds2MiB');
  for(const meta of Object.values(PLAYER_DIRECTION_META))assert.ok(meta.w<=2048&&meta.h<=2048);
});
