import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChangedPath,summarizeGraph } from '../tools/dependency-scan.mjs';

const root='/tmp/dependency-fixture';
const meta={inputs:{
 'voxel/src/main.js':{imports:[{path:'voxel/src/scene.js',kind:'import-statement'},{path:'voxel/src/model.js',kind:'import-statement'}]},
 'voxel/src/scene.js':{imports:[{path:'voxel/src/model.js',kind:'import-statement'},{path:'three',external:true,kind:'import-statement'}]},
 'voxel/src/model.js':{imports:[{path:'voxel/src/rules/selling.js',kind:'import-statement'}]},
 'voxel/src/rules/selling.js':{imports:[{path:'voxel/src/model.js',kind:'import-statement'}]},
 'voxel/docs/contractor-patches/festival-session/preview/app.js':{imports:[{path:'voxel/docs/contractor-patches/festival-session/src/engine.js',kind:'import-statement'}]},
 'voxel/docs/contractor-patches/festival-session/src/engine.js':{imports:[]}
}};

test('reverse import traversal follows real consumer direction and terminates through cycles',()=>{
 const r=summarizeGraph(meta,['voxel/src/rules/selling.js'],{root});
 assert.deepEqual(r.directConsumers['voxel/src/rules/selling.js'],['voxel/src/model.js']);
 assert.deepEqual(r.transitiveConsumers,['voxel/src/main.js','voxel/src/model.js','voxel/src/scene.js']);
 assert.deepEqual(r.contractorBoundary.importedByLive,['voxel/src/rules/selling.js']);
 assert.equal(r.contractorBoundary.passed,false);assert.equal(r.edges.some(e=>e.to==='three'),false);
});

test('an isolated review module stays outside the live import closure',()=>{
 const path='voxel/docs/contractor-patches/festival-session/src/engine.js',r=summarizeGraph(meta,[path,path],{root});
 assert.equal(r.changedPaths.length,1);assert.equal(r.contractorBoundary.passed,true);
 assert.deepEqual(r.transitiveConsumers,['voxel/docs/contractor-patches/festival-session/preview/app.js']);
 assert.deepEqual(r.unrepresentedPaths,[]);
});

test('a live import of the same contractor module fails its isolation boundary',()=>{
 const m=structuredClone(meta),path='voxel/docs/contractor-patches/festival-session/src/engine.js';
 m.inputs['voxel/src/main.js'].imports.push({path,kind:'dynamic-import'});
 const r=summarizeGraph(m,[path],{root});assert.equal(r.contractorBoundary.passed,false);
 assert.deepEqual(r.contractorBoundary.importedByLive,[path]);
});

test('unknown paths, styles and empty inputs are never represented as a safety proof',()=>{
 const r=summarizeGraph(meta,['voxel/src/unknown.css'],{root});
 assert.equal(r.manualReviewRequired,true);assert.deepEqual(r.unrepresentedPaths,['voxel/src/unknown.css']);
 assert.equal(r.contractorBoundary.passed,false);
 assert.equal(summarizeGraph(meta,[],{root}).contractorBoundary.passed,false);
});

test('changed paths are normalized without permitting repository escapes',()=>{
 assert.equal(normalizeChangedPath('.\\voxel\\src\\model.js'),'voxel/src/model.js');
 for(const path of ['../secret','/tmp/secret','C:\\secret','',null,'voxel/../../secret'])assert.throws(()=>normalizeChangedPath(path));
});
