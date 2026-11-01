import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('six distinct reference icons retain their reviewed file and mobile dimensions',()=>{
 const meta=JSON.parse(fs.readFileSync(new URL('../art/manifest.json',import.meta.url)));
 const bytes=fs.readFileSync(new URL('../art/menu-icons.webp',import.meta.url));
 assert.equal(meta.installedInGame,false);
 assert.equal(meta.icons.length,6);
 assert.equal(new Set(meta.icons.map(i=>i.id)).size,6);
 assert.equal(new Set(meta.icons.map(i=>i.rgbaSHA256)).size,6);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.encodedSHA256);
 assert.equal(bytes.length,meta.encodedBytes);
 assert.ok(bytes.length<220*1024);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
 let dims;
 for(let p=12;p+8<=bytes.length;){
  const tag=bytes.toString('ascii',p,p+4),length=bytes.readUInt32LE(p+4),start=p+8;
  assert.ok(start+length<=bytes.length);
  if(tag==='VP8X'){dims=[1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3)];break;}
  p+=8+length+length%2;
 }
 assert.deepEqual(dims,[meta.columns*meta.cell,meta.rows*meta.cell]);
 for(const cell of meta.icons){
  assert.ok(cell.column>=0&&cell.column<3&&cell.row>=0&&cell.row<2);
  const [x0,y0,x1,y1]=cell.packedBounds;
  assert.ok(x0>=6&&y0>=6&&x1<=186&&y1<=186,'clear gutter around '+cell.id);
 }
});
