import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HOME_PETS_META} from '../src/home-pets-meta.js';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
function dimensions(data){
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 for(let p=12;p+8<data.length;){const id=data.toString('ascii',p,p+4),n=data.readUInt32LE(p+4);
  if(id==='VP8X')return{w:1+data.readUIntLE(p+12,3),h:1+data.readUIntLE(p+15,3)};
  if(id==='VP8L'){assert.equal(data[p+8],0x2f);const bits=data.readUInt32LE(p+9);return{w:1+(bits&0x3fff),h:1+((bits>>>14)&0x3fff)};}
  p+=8+n+(n%2);
 }throw Error('No supported WebP header');
}
test('Sandy keeps the pet state contract, smaller body width and approved cat/terrier metadata',()=>{
 const before=JSON.parse(read('docs/plans/directional-cast/sandy/home-pets-approved-meta.json'));
 assert.deepEqual(HOME_PETS_META.states,before.states);
 for(const pet of ['skyla','maisie'])assert.deepEqual(HOME_PETS_META.pets[pet],before.pets[pet]);
 const sandy=HOME_PETS_META.pets.sandy;assert.equal(sandy.frames.length,8);assert.ok(sandy.width<=1.5&&sandy.width/before.pets.sandy.width<.72);
 for(const f of sandy.frames){assert.equal(f.ay,184);assert.ok(f.x>=0&&f.x+f.w<=HOME_PETS_META.w&&f.y+f.h<=HOME_PETS_META.h);}
 assert.deepEqual(dimensions(read('assets/home-pets.webp')),{w:HOME_PETS_META.w,h:HOME_PETS_META.h});
});
test('the reviewed lean art ships within mobile budgets and retains distinct contact/pass images',()=>{
 const audit=JSON.parse(read('docs/plans/directional-cast/sandy/measurements.json'));
 assert.equal(audit.frames.length,8);assert.notEqual(audit.frames[1].hash,audit.frames[2].hash);
 for(const f of audit.frames)assert.ok(f.bounds[3]<=184&&f.bounds[0]>=0&&f.bounds[2]<=256);
 let bytes=0;
 for(const[name,hash]of Object.entries(audit.runtimeHashes)){
  const path=name==='home-pets.webp'?'assets/'+name:'assets/sandy/'+name,data=read(path);bytes+=data.length;
  assert.equal(createHash('sha256').update(data).digest('hex'),hash,name+' differs from reviewed image');
  assert.ok(data.length<1100000,name+' mobile budget');
 }
 assert.ok(bytes<1200000);
 for(const name of ['idle','blink','serve'])assert.deepEqual(dimensions(read('assets/sandy/lean-'+name+'.webp')),{w:512,h:320});
 assert.deepEqual(dimensions(read('assets/sandy/service-bell.webp')),{w:190,h:133});
});
