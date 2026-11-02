#!/usr/bin/env node
// Extend the reviewed semantic map without changing the previously delivered
// pack. Imports are parsed, never executed; checks are suggested, never run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';
import { buildImpactPlan,validateMatrix } from '../../festival-session/tools/check-impact.mjs';
import { summarizeGraph,normalizeChangedPath } from '../../festival-session/tools/dependency-scan.mjs';
import { sourceInputPath } from './build-preview.mjs';

const PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const ROOT=path.resolve(PACK,'../../../..');
export const PREFIX='voxel/docs/contractor-patches/festival-host-bridge/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function loadBridgeMatrix({root=ROOT}={}){
 const baseFile=path.join(root,'voxel/docs/contractor-patches/festival-session/data/dependency-matrix.json');
 const overlayFile=path.join(root,PREFIX,'data/dependency-overlay.json');
 const bytes=fs.readFileSync(baseFile),base=JSON.parse(bytes),overlay=JSON.parse(fs.readFileSync(overlayFile));
 if(overlay.schemaVersion!==1||base.revision!==overlay.baseMatrixRevision||sha(bytes)!==overlay.baseFileSHA256)throw Error('Base dependency matrix changed; review and refresh the bridge overlay before planning.');
 return {...base,revision:overlay.revision,status:'reviewed-base-plus-bridge-overlay',scope:base.scope+' '+overlay.scope,checks:[...base.checks,...overlay.checks],domains:[...base.domains,...overlay.domains],edges:[...base.edges,...overlay.edges],coverageRoots:[...base.coverageRoots,PREFIX.slice(0,-1)]};
}
export function bridgeImpact(changedPaths,{root=ROOT}={}){return buildImpactPlan(changedPaths,{matrix:loadBridgeMatrix({root}),root});}

// esbuild annotates JSON input keys with import-attribute metadata. Convert
// those keys back to their physical path before graph analysis or hashing.
export function physicalMetadata(meta){
 const inputs={};
 for(const [name,record]of Object.entries(meta.inputs)){
  const id=sourceInputPath(name),imports=(record.imports??[]).map(item=>({...item,path:sourceInputPath(item.path)}));
  if(inputs[id])inputs[id].imports.push(...imports);
  else inputs[id]={...record,imports};
 }
 return {...meta,inputs};
}
export async function reviewImports(changedPaths,{root=ROOT}={}){
 root=path.resolve(root);
 const entries=['voxel/src/main.js',PREFIX+'preview/app.js'];
 const result=await esbuild.build({absWorkingDir:root,entryPoints:entries,bundle:true,format:'iife',outdir:'__bridge_dependency_review_only__',write:false,metafile:true,target:['es2020'],loader:{'.png':'dataurl','.webp':'dataurl','.mp3':'dataurl','.mid':'binary','.woff':'dataurl','.woff2':'dataurl'},logLevel:'silent'});
 const meta=physicalMetadata(result.metafile),report=summarizeGraph(meta,changedPaths,{root,allowedPrefixes:[PREFIX]});
 report.entries=entries;report.sourceHashes=Object.fromEntries(Object.keys(meta.inputs).map(name=>path.resolve(root,name)).filter(file=>file.startsWith(root+path.sep)).sort().map(file=>[path.relative(root,file).replaceAll(path.sep,'/'),sha(fs.readFileSync(file))]));
 report.scannerSHA256=sha(fs.readFileSync(fileURLToPath(import.meta.url)));report.lockfileSHA256=sha(fs.readFileSync(path.join(root,'voxel/package-lock.json')));report.warnings=result.warnings.map(w=>w.text);
 return report;
}
export function renderBridgeDependencies(matrix){
 const own=matrix.domains.filter(d=>d.id.startsWith('bridge-'));
 const lines=['# Bridge dependencies and impact review','',`Reviewed overlay **${matrix.revision}**; ${matrix.domains.length} domains and ${matrix.edges.length} semantic links after extending the prior matrix.`,'',
 'The original matrix is pinned by revision and SHA-256. A changed base fails validation until the overlay is reviewed. No previous contractor or live game file is overwritten.','',
 '| Changed bridge domain | Active consumers | Conditional live consumers | Required check groups |','| --- | --- | --- | --- |'];
 for(const d of own){const links=activation=>matrix.edges.filter(e=>e.from===d.id&&e.activation===activation).map(e=>'`'+e.to+'`').join(', ')||'—';lines.push(`| ${d.label} | ${links('active')} | ${links('integration-conditional')} | ${d.checkIds.map(id=>'`'+id+'`').join(', ')} |`);}
 lines.push('','## Review commands','','```sh',`node ${PREFIX}tools/review-impact.mjs --changed ${PREFIX}src/bridge.js --changed ${PREFIX}adapters/outcomes.js --strict --out /tmp/bridge-impact.json`,'```','',
 'Repeat `--changed` for other files. With `--out`, the read-only reviewer writes semantic and parsed-import reports in that explicit directory. It does not run suggested commands or execute the parsed game. Unknown paths, stale matrix evidence and a live-import/scope leak fail strict review.','',
 'The parsed graph includes the real game entry and the private lab. Physical JSON paths are normalized from esbuild import-attribute metadata. The lab imports real rule/model modules but cannot boot main, scene or storage; its standalone build checks that separate boundary.','',
 'Unrepresented template/style/tool/document paths still need semantic review. Literal import tracing cannot discover every computed asset, save field, money allocation, queue/route timing or source-side callback. A green scope boundary is not a general safety approval.','',
 '## Consequences to check','');
 for(const e of matrix.edges.filter(e=>e.from.startsWith('bridge-')||e.to==='bridge-evidence'))lines.push(`- **${e.from} → ${e.to}** (${e.activation}): ${e.consequence}`);
 lines.push('','The current change assessment and test decisions are recorded in `verification/`. See the prior [full matrix](../../festival-session/docs/DEPENDENCY-MATRIX.md) for the reviewed base and [integration notes](INTEGRATION-NOTES.md) before wiring live hooks.','');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),changed=[];let out=null,strict=false;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--changed'&&args[i+1])changed.push(normalizeChangedPath(args[++i]));
  else if(args[i]==='--out'&&args[i+1])out=path.resolve(args[++i]);
  else if(args[i]==='--strict')strict=true;
  else throw Error('Usage: review-impact.mjs --changed repo/path [--changed another] [--strict] [--out semantic-report.json]');
 }
 const semantic=bridgeImpact(changed),imports=await reviewImports(changed);
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(semantic,null,2)+'\n');fs.writeFileSync(path.join(path.dirname(out),'import-impact.json'),JSON.stringify(imports,null,2)+'\n');console.log(`Reviewed ${changed.length} paths: ${semantic.directDomains?.length??0} direct domains, ${semantic.requiredChecks?.length??0} current check groups, ${imports.moduleCount} parsed modules. Unmapped: ${semantic.unknownPaths.length}. Scope: ${imports.contractorBoundary.passed?'passes':'requires review'}.`);}
 else process.stdout.write(JSON.stringify({semantic,imports},null,2)+'\n');
 if(strict&&(!semantic.validation.valid||semantic.unknownPaths.length||!changed.length||!imports.contractorBoundary.passed))process.exitCode=2;
}
