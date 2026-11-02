import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBridgeMatrix,bridgeImpact,physicalMetadata,renderBridgeDependencies,ROOT } from '../tools/review-impact.mjs';
import { validateMatrix } from '../../festival-session/tools/check-impact.mjs';
const p='voxel/docs/contractor-patches/festival-host-bridge/';
test('overlay is grounded in existing evidence and does not alter base domain definitions',()=>{
 const m=loadBridgeMatrix();assert.equal(m.domains.length,32);assert.equal(m.edges.length,108);assert.deepEqual(validateMatrix(m),{valid:true,errors:[],missingFiles:[]});
 const original=JSON.parse(fs.readFileSync(path.join(ROOT,'voxel/docs/contractor-patches/festival-session/data/dependency-matrix.json')));assert.deepEqual(m.domains.slice(0,original.domains.length),original.domains);
});
test('bridge effects remain isolated now while save/inventory/input adoption is explicit',()=>{
 const r=bridgeImpact([p+'src/bridge.js',p+'adapters/outcomes.js']);assert.deepEqual(r.unknownPaths,[]);assert.ok(r.requiredChecks.some(c=>c.id==='bridge-queue-tests'));
 assert.ok(r.integrationConditionalImpacts.some(d=>d.id==='save-lifecycle'));assert.equal(r.activeImpacts.some(d=>d.id==='retail-wallet'),false);assert.equal(r.activeImpacts.some(d=>d.id==='save-lifecycle'),false);
});
test('unknown paths still need review after adding the overlay',()=>{const r=bridgeImpact(['voxel/src/unreviewed-future-feature.js']);assert.equal(r.status,'unmapped-changes');assert.equal(r.requiresHumanReview,true);});
test('a stale base matrix cannot silently inherit an outdated overlay',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bridge-matrix-'));try{
  const base=path.join(dir,'voxel/docs/contractor-patches/festival-session/data'),overlay=path.join(dir,p,'data');fs.mkdirSync(base,{recursive:true});fs.mkdirSync(overlay,{recursive:true});
  fs.copyFileSync(path.join(ROOT,p,'data/dependency-overlay.json'),path.join(overlay,'dependency-overlay.json'));
  const m=JSON.parse(fs.readFileSync(path.join(ROOT,'voxel/docs/contractor-patches/festival-session/data/dependency-matrix.json')));m.revision='changed-after-review';fs.writeFileSync(path.join(base,'dependency-matrix.json'),JSON.stringify(m));assert.throws(()=>loadBridgeMatrix({root:dir}),/Base dependency matrix changed/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('parser attribute metadata maps to physical JSON inputs and import targets',()=>{
 const name='data/themes.json with { type: \'json\' }',m=physicalMetadata({inputs:{'a.js':{imports:[{path:name,kind:'import-statement'}]},[name]:{imports:[]}}});
 assert.deepEqual(Object.keys(m.inputs),['a.js','data/themes.json']);assert.equal(m.inputs['a.js'].imports[0].path,'data/themes.json');
});
test('human dependency notes stay in sync with the machine-readable overlay',()=>{assert.equal(fs.readFileSync(new URL('../docs/DEPENDENCIES.md',import.meta.url),'utf8'),renderBridgeDependencies(loadBridgeMatrix()));});
