import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPreview,DEFAULT_PACK,validatePreviewInputs,sourceInputPath } from '../tools/build-preview.mjs';

test('the offline service desk contains actual private rule operations without live game boot',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'receipt-lab-build-'));
 try{
  const result=await buildPreview({out:path.join(dir,'receipt-lab.html')}),html=fs.readFileSync(result.out,'utf8');
  assert.ok(result.bytes<2*1024*1024,'keep the DOM/pure-rule contractor lab below2MiB');
  assert.ok(html.includes('Private rule lab')&&html.includes('Not installed in the game'));
  assert.ok(html.includes('Actual game rules')&&html.includes('never your game save'));
  assert.equal(html.match(/<script>/g)?.length,1);assert.equal(html.match(/<\/script>/g)?.length,1);
  assert.equal(html.match(/<style>/g)?.length,1);assert.equal(html.match(/<\/style>/g)?.length,1);
  assert.ok(!html.includes('/* @bridge:'));
  assert.ok(!/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html));
  for(const name of ['src/bridge.js','lab/scenario.js','adapters/outcomes.js','rules/cooking-sales.js','rules/cocoa-menu.js','rules/garden-crops.js','rules/hayride.js'])assert.ok(result.inputs.some(p=>p.replaceAll('\\','/').endsWith(name)),name);
  assert.ok(!result.inputs.some(p=>/voxel\/src\/(?:main|scene)\.js$|voxel\/src\/ui\//.test(p.replaceAll('\\','/'))));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('live boot, renderer/UI/storage and unreviewed helpers fail the import boundary',()=>{
 const repo=path.resolve(DEFAULT_PACK,'../../../..'),local=path.join(DEFAULT_PACK,'preview/app.js');
 for(const name of ['voxel/src/main.js','voxel/src/scene.js','voxel/src/ui/kit.js','voxel/src/storage.js','src/core/model.mjs'])assert.throws(()=>validatePreviewInputs([local,path.join(repo,name)]),/live boot|unreviewed source/);
 assert.throws(()=>validatePreviewInputs([]),/no inspected source/);
 assert.throws(()=>validatePreviewInputs([local]),/missing its actual/);
});

test('JSON import attributes are parser metadata without relaxing live source restrictions',()=>{
 assert.equal(sourceInputPath("data/themes.json with { type: 'json' }"),'data/themes.json');
 const unknown='data/themes.json with { mode: "unreviewed" }';assert.equal(sourceInputPath(unknown),unknown);
 const repo=path.resolve(DEFAULT_PACK,'../../../..');
 assert.throws(()=>validatePreviewInputs([path.join(repo,'voxel/src/main.js')+" with { type: 'json' }"]),/live boot/);
});
