import test from 'node:test';
import assert from 'node:assert/strict';
import { specialSpriteMetadata } from '../src/special-sprite-meta.js';

function atlas(){const w=80,h=48,pixels=new Uint8ClampedArray(w*h*4);for(let row=0;row<2;row++)for(let col=0;col<4;col++)for(let y=3;y<20-col;y++)for(let x=5;x<15;x++)pixels[((row*24+y)*w+col*20+x)*4+3]=255;return{w,h,pixels};}
test('whole-strip frames keep one body scale per character and feet at the world origin',()=>{
 const {w,h,pixels}=atlas(),m=specialSpriteMetadata(w,h,pixels);
 assert.equal(m.rows.axel.frames.length,4);assert.equal(m.rows.baron.frames.length,4);
 for(const row of Object.values(m.rows)){for(const f of row.frames){assert.equal(f.unit,row.unit);assert.equal(f.ay,f.bounds.bottom+1);assert.equal(f.ax,10);assert.ok(Number.isFinite(f.unit)&&f.unit>0);}assert.equal((row.frames[0].bounds.bottom-row.frames[0].bounds.top+1)*row.unit,row.height);}
 assert.ok(m.rows.baron.unit>m.rows.axel.unit);
});
test('an incomplete generated strip is rejected before it can become a missing walk frame',()=>{
 const {w,h,pixels}=atlas();for(let y=24;y<48;y++)for(let x=60;x<80;x++)pixels[(y*w+x)*4+3]=0;
 assert.throws(()=>specialSpriteMetadata(w,h,pixels),/Missing baron animation frame 4/);
 assert.throws(()=>specialSpriteMetadata(0,h,pixels),/Invalid/);
});
