import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildImpactPlan,loadMatrix,validateMatrix,renderMatrixMarkdown } from '../tools/check-impact.mjs';
const matrix=loadMatrix();

test('every semantic link, check and evidence file is grounded in the current repository',()=>{
 const result=validateMatrix(matrix);assert.deepEqual(result,{valid:true,errors:[],missingFiles:[]});
 assert.equal(matrix.domains.length,27);assert.ok(matrix.edges.length>=80);
});
test('the readable matrix is generated from the same versioned source as the planner',()=>{
 assert.equal(fs.readFileSync(new URL('../docs/DEPENDENCY-MATRIX.md',import.meta.url),'utf8'),renderMatrixMarkdown(matrix));
});
test('hayride content impact reaches service, queues and relevant checks',()=>{
 const plan=buildImpactPlan(['voxel/src/content/hayride.js']);
 assert.equal(plan.validation.valid,true);assert.ok(plan.directDomains.some(d=>d.id==='hayride-service'));
 assert.ok(plan.requiredChecks.some(c=>c.files.some(f=>f.includes('hayride.test.mjs'))));
 assert.equal(plan.requiresHumanReview,true);assert.deepEqual(plan.unknownPaths,[]);
});
test('uninstalled session rules distinguish current consumers from live integration work',()=>{
 const plan=buildImpactPlan(['voxel/docs/contractor-patches/festival-session/src/engine.js']);
 assert.ok(plan.directDomains.some(d=>d.id==='festival-state'));
 assert.ok(plan.requiredChecks.some(c=>c.id==='festival-engine'));
 assert.ok(plan.integrationConditionalImpacts.length>0);
 assert.ok(plan.integrationChecks.length>0);
 assert.equal(plan.activeImpacts.some(d=>d.id==='save-lifecycle'),false);
});
test('unknown paths and empty input do not imply safety',()=>{
 const r=buildImpactPlan(['voxel/src/unmapped-new-feature.js']);assert.equal(r.status,'unmapped-changes');assert.equal(r.unknownPaths.length,1);assert.equal(r.requiresHumanReview,true);
 assert.equal(buildImpactPlan([]).status,'no-changes-declared');
 for(const p of ['/etc/passwd','../secret','C:\\escape'])assert.throws(()=>buildImpactPlan([p]));
});
test('transitive planning terminates through cycles and remains deterministic',()=>{
 const cyclic=structuredClone(matrix);cyclic.edges.push({from:'festival-preview',to:'festival-state',activation:'active',consequence:'Intentional test cycle'});
 const first=buildImpactPlan(['voxel/docs/contractor-patches/festival-session/src/engine.js'],{matrix:cyclic});
 assert.deepEqual(first,buildImpactPlan(['voxel/docs/contractor-patches/festival-session/src/engine.js'],{matrix:cyclic}));
 assert.equal(new Set(first.activeImpacts.map(d=>d.id)).size,first.activeImpacts.length);
 assert.equal(new Set(first.requiredChecks.map(c=>c.id)).size,first.requiredChecks.length);
});
test('missing evidence or dangling domains cannot produce a valid impact plan',()=>{
 const bad=structuredClone(matrix);bad.domains[0].evidence.push('voxel/src/missing-contract-evidence.js');
 assert.equal(validateMatrix(bad).valid,false);assert.equal(buildImpactPlan(['voxel/src/model.js'],{matrix:bad}).status,'matrix-invalid');
 const dangling=structuredClone(matrix);dangling.edges[0].to='nonexistent-domain';assert.equal(validateMatrix(dangling).valid,false);
 const unsafe=structuredClone(matrix);unsafe.checks[0].cwd='../outside';assert.equal(validateMatrix(unsafe).valid,false);
});
