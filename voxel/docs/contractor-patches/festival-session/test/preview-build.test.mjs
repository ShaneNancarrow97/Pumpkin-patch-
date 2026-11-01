import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPreview, DEFAULT_PACK, validatePreviewInputs } from '../tools/build-preview.mjs';

test('the offline demo bundles the actual engine, content and art without live game code',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'festival-demo-'));
 try{
  const result=await buildPreview({out:path.join(dir,'festival.html')}),html=fs.readFileSync(result.out,'utf8');
  assert.ok(result.bytes<500*1024,'keep the DOM-only offline demo compact');
  assert.ok(html.includes('Contractor rule demo')&&html.includes('Not installed in the game'));
  assert.ok(html.includes('Synthetic receipts')&&html.includes('never a game save'));
  assert.equal(html.match(/<script>/g)?.length,1);assert.equal(html.match(/<\/script>/g)?.length,1);
  assert.equal(html.match(/<style>/g)?.length,1);assert.equal(html.match(/<\/style>/g)?.length,1);
  assert.ok(!html.includes('/* @festival:'));
  assert.ok(!/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html));
  assert.ok(result.inputs.some(name=>name.endsWith('src/engine.js')));
  assert.ok(result.inputs.some(name=>name.endsWith('data/festival-themes.json')));
  assert.ok(result.inputs.some(name=>name.endsWith('art/menu-icons.webp')));
  assert.ok(!result.inputs.some(name=>/voxel\/src\//.test(name)));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a live rule or unrelated source cannot silently enter this isolated review demo',()=>{
 const engine=path.join(DEFAULT_PACK,'src/engine.js'),game=path.resolve(DEFAULT_PACK,'../../../src/model.js');
 assert.doesNotThrow(()=>validatePreviewInputs([engine,path.join(DEFAULT_PACK,'preview/app.js')]));
 assert.throws(()=>validatePreviewInputs([engine,game]),/outside the isolated module/);
 assert.throws(()=>validatePreviewInputs([path.join(DEFAULT_PACK,'preview/app.js')]),/actual Festival Night engine/);
 assert.throws(()=>validatePreviewInputs([]),/no inspected source inputs/);
});
