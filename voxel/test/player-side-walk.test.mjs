import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { PLAYER_SIDE_WALK_META, PLAYER_EMPTY_WATER_META } from '../src/player-side-walk-meta.js';
import { costumeCatalog } from '../src/rules/wardrobe.js';

// VP8X dimensions let CI validate the shipped image, not just the metadata.
function imageSize(name){
 const data=readFileSync(new URL('../assets/'+name+'.webp',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 for(let p=12;p+8<data.length;){const size=data.readUInt32LE(p+4);if(data.toString('ascii',p,p+4)==='VP8X')return{w:1+data.readUIntLE(p+12,3),h:1+data.readUIntLE(p+15,3)};p+=8+size+(size%2);}
 throw Error(name+' requires an alpha VP8X header');
}

test('all twenty selectable owner looks ship four separate anchored side phases',()=>{
 assert.deepEqual(Object.keys(PLAYER_SIDE_WALK_META).sort(),costumeCatalog.map(c=>c.id).sort());
 const sizes=new Map();
 for(const [id,m] of Object.entries(PLAYER_SIDE_WALK_META)){
  if(!sizes.has(m.sheet))sizes.set(m.sheet,imageSize('player-walk-'+m.sheet));
  assert.deepEqual(sizes.get(m.sheet),{w:m.w,h:m.h},id+' actual atlas dimensions');
  assert.equal(m.side.length,4,id);assert.equal(new Set(m.side.map(f=>f.x+','+f.y)).size,4);
  for(const f of m.side){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=m.w&&f.y+f.h<=m.h);assert.equal(f.ay,390);assert.equal(f.ax,224);}
  for(const scale of [...Object.values(m.frontScale),m.backScale])assert.ok(Number.isFinite(scale)&&scale>.75&&scale<1.3,id+' invalid turn scale');
 }
});

test('baked alpha audit rejects duplicated legs, large stature jumps and oversized mobile art',()=>{
 const metrics=JSON.parse(readFileSync(new URL('../docs/plans/life-play/walk-art/walk-metrics.json',import.meta.url),'utf8'));
 for(const [id,m] of Object.entries(PLAYER_SIDE_WALK_META)){
  const audit=metrics[id];assert.equal(audit.frameHashCount,4,id+' duplicate painted phase');
  assert.ok(audit.heightRange[0]>=m.targetHeight*.97,id+' stature changes more than3%');assert.equal(audit.heightRange[1],m.targetHeight);
  assert.ok(audit.legChange.every(n=>n>(id.endsWith('wheelchair')?.08:.12)),id+' lower silhouette does not move');
 }
 let bytes=statSync(new URL('../assets/player-water-empty.webp',import.meta.url)).size;
 for(const sheet of new Set(Object.values(PLAYER_SIDE_WALK_META).map(m=>m.sheet)))bytes+=statSync(new URL('../assets/player-walk-'+sheet+'.webp',import.meta.url)).size;
 assert.equal(bytes,metrics.budgetBytes);assert.ok(bytes<2*1024*1024);
 assert.deepEqual(imageSize('player-water-empty'),{w:896,h:400});
 assert.deepEqual(Object.keys(PLAYER_EMPTY_WATER_META).sort(),['natalie-base','shane-base']);
});
