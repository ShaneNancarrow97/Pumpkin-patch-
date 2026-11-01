import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPreview, DEFAULT_PACK, validatePreviewData, validateSourceSnapshot } from '../tools/build-preview.mjs';

const audit=()=>JSON.parse(fs.readFileSync(path.join(DEFAULT_PACK,'findings/attraction-audit.json'),'utf8'));
const content=()=>JSON.parse(fs.readFileSync(path.join(DEFAULT_PACK,'data/festival-themes.json'),'utf8'));

test('the offline reviewer embeds real assets without importing the running game',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'late-game-preview-'));
 try{
  const out=path.join(folder,'workshop.html'),result=await buildPreview({out}),html=fs.readFileSync(out,'utf8');
  assert.ok(result.bytes<3*1024*1024,'keep the standalone review below3MiB');
  assert.ok(html.includes('Contractor preview')&&html.includes('Not installed in the game'));
  assert.equal(html.match(/<script>/g)?.length,1);assert.equal(html.match(/<\/script>/g)?.length,1);
  assert.ok(!html.includes('/* @workshop:script */')&&!html.includes('/* @workshop:style */'));
  assert.ok(!/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html));
  assert.ok(result.inputs.some(name=>name.endsWith('models/reward-props.js')));
  assert.ok(result.inputs.some(name=>name.endsWith('art/menu-icons.webp')));
  assert.ok(!result.inputs.some(name=>/voxel\/src\/(?:main|model|scene)\.js$|voxel\/src\/rules\//.test(name)));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('missing metrics and duplicate scenarios cannot silently appear as zeroes',()=>{
 const missing=audit();delete missing.scenarios[0].metrics.completed;
 assert.throws(()=>validatePreviewData(missing,content()),/Missing\/invalid audit value/);
 const duplicate=audit();duplicate.scenarios[1]=structuredClone(duplicate.scenarios[0]);
 assert.throws(()=>validatePreviewData(duplicate,content()),/matrix is incomplete or duplicated/);
 const misleading=audit();misleading.options.acceptance='walk-in';
 assert.throws(()=>validatePreviewData(misleading,content()),/capacity audit/);
});

test('a stale report must be regenerated before it can be published as current',()=>{
 const stale=audit(),file=Object.keys(stale.sourceHashes)[0];stale.sourceHashes[file]='0'.repeat(64);
 assert.throws(()=>validateSourceSnapshot(stale),/source snapshot is stale/);
 const tool=audit();tool.auditorSHA256='0'.repeat(64);
 assert.throws(()=>validateSourceSnapshot(tool),/Auditor changed/);
 const unsafe=audit();unsafe.sourceHashes={'../../outside-the-repository':'0'.repeat(64)};
 assert.throws(()=>validateSourceSnapshot(unsafe),/source snapshot is stale/);
});
