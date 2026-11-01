#!/usr/bin/env node
// Parse actual JS/asset imports through the existing esbuild parser. No game
// module is executed, no artifact is written unless --out is explicitly given.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';

const PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DEFAULT_ROOT=path.resolve(PACK,'../../../..');
export const CONTRACTOR_PREFIXES=['voxel/docs/contractor-patches/late-game-support/','voxel/docs/contractor-patches/festival-session/'];
const slash=s=>s.replaceAll(path.sep,'/');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function normalizeChangedPath(name){
 if(typeof name!=='string'||!name.trim()||name.includes('\0'))throw new TypeError('Changed paths must be nonempty repository-relative paths');
 const result=name.replaceAll('\\','/').replace(/^\.\//,'');
 if(result.startsWith('/')||/^[A-Za-z]:/.test(result)||result.split('/').includes('..'))throw new RangeError('A changed path escapes the repository: '+name);
 return result;
}

/** Pure graph analysis, also used with small metadata fixtures in native tests. */
export function summarizeGraph(metafile,changedPaths,{root=DEFAULT_ROOT,liveEntries=['voxel/src/main.js'],allowedPrefixes=CONTRACTOR_PREFIXES}={}){
 root=path.resolve(root);
 const canonical=name=>{
  const absolute=path.resolve(root,name);
  if(absolute.startsWith(root+path.sep))return slash(path.relative(root,absolute));
  const marker=slash(absolute).lastIndexOf('/node_modules/');
  return marker<0?'external:'+slash(absolute):'package:'+slash(absolute).slice(marker+14);
 };
 const names=new Map(Object.keys(metafile.inputs??{}).map(name=>[name,canonical(name)]));
 const forward=new Map(),reverse=new Map(),edges=[];
 for(const [raw,id]of names){
  forward.set(id,forward.get(id)??new Set());
  for(const imported of metafile.inputs[raw].imports??[]){
   if(imported.external)continue;
   const destination=names.get(imported.path)??canonical(imported.path);
   forward.get(id).add(destination);
   if(!reverse.has(destination))reverse.set(destination,new Set());reverse.get(destination).add(id);
   edges.push({from:id,to:destination,kind:imported.kind??'import-statement'});
  }
 }
 const walk=(starts,graph)=>{const seen=new Set(),queue=[...starts];for(let at=0;at<queue.length;at++){const value=queue[at];if(seen.has(value))continue;seen.add(value);for(const next of graph.get(value)??[])if(!seen.has(next))queue.push(next);}return seen;};
 const changed=[...new Set(changedPaths.map(normalizeChangedPath))].sort();
 const represented=new Set(names.values()),live=walk(liveEntries.map(normalizeChangedPath),forward);
 const affected=walk(changed,reverse);for(const name of changed)affected.delete(name);
 const importedByLive=changed.filter(name=>live.has(name));
 const outsideContractorScope=changed.filter(name=>!allowedPrefixes.some(prefix=>name.startsWith(prefix)));
 return {
  version:1,
  scope:'Parsed import dependencies; semantic gameplay and build/template links require the companion matrix.',
  changedPaths:changed,
  moduleCount:represented.size,
  edges:edges.sort((a,b)=>(a.from+'\0'+a.to).localeCompare(b.from+'\0'+b.to)),
  directConsumers:Object.fromEntries(changed.map(name=>[name,[...(reverse.get(name)??[])].sort()])),
  transitiveConsumers:[...affected].sort(),
  unrepresentedPaths:changed.filter(name=>!represented.has(name)),
  unrepresentedPathsNeedReview:changed.some(name=>!represented.has(name)),
  semanticReviewRequired:true,
  manualReviewRequired:true,
  contractorBoundary:{passed:changed.length>0&&!outsideContractorScope.length&&!importedByLive.length,outsideContractorScope,importedByLive},
  limitations:[
   'The esbuild parser supplies literal import/re-export and asset edges. This is not a whole-game semantic dependency proof.',
   'Runtime-computed names, templates/styles assembled by build scripts, physical placement, wallets, IDs, save migrations and timing contracts need the reviewed matrix.',
   'An unrepresented path is not classified as safe. Review it through the semantic matrix or manually.',
   'The contractor boundary covers declared changed paths and parsed live imports. It does not prove arbitrary dynamic integration is absent.'
  ]
 };
}

export async function scanDependencies({root=DEFAULT_ROOT,changedPaths=[]}={}){
 root=path.resolve(root);
 const entries=['voxel/src/main.js','voxel/docs/contractor-patches/late-game-support/preview/app.js','voxel/docs/contractor-patches/festival-session/preview/app.js','voxel/docs/contractor-patches/festival-session/adapters/readiness.js'].filter(name=>fs.existsSync(path.join(root,name)));
 if(!entries.includes('voxel/src/main.js'))throw Error('The live game entry is missing; dependency scope cannot be checked.');
 const result=await esbuild.build({absWorkingDir:root,entryPoints:entries,bundle:true,format:'iife',outdir:'__dependency_review_only__',write:false,metafile:true,target:['es2020'],loader:{'.png':'dataurl','.webp':'dataurl','.mp3':'dataurl','.mid':'binary'},logLevel:'silent'});
 const report=summarizeGraph(result.metafile,changedPaths,{root});
 report.entries=entries;
 report.sourceHashes=Object.fromEntries(Object.keys(result.metafile.inputs).map(name=>path.resolve(root,name)).filter(name=>name.startsWith(root+path.sep)).sort().map(name=>[slash(path.relative(root,name)),sha(fs.readFileSync(name))]));
 report.warnings=result.warnings.map(w=>w.text);
 report.scannerSHA256=sha(fs.readFileSync(fileURLToPath(import.meta.url)));
 const lock=path.join(root,'voxel/package-lock.json');
 if(fs.existsSync(lock))report.lockfileSHA256=sha(fs.readFileSync(lock));
 return report;
}

export function changedSince(base,root=DEFAULT_ROOT){
 if(typeof base!=='string'||!/^[a-f0-9]{7,40}$/.test(base))throw new TypeError('--base requires a pinned commit SHA');
 return execFileSync('git',['diff','--name-only','--no-renames',base,'HEAD','--'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),changed=[];let base=null,out=null,strict=false;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--changed'){if(!args[i+1])throw Error('Missing --changed path');changed.push(args[++i]);}
  else if(args[i]==='--base'){if(!args[i+1])throw Error('Missing --base SHA');base=args[++i];}
  else if(args[i]==='--out'){if(!args[i+1])throw Error('Missing --out path');out=args[++i];}
  else if(args[i]==='--contractor-only')strict=true;
  else if(args[i]==='--help'){console.log('node dependency-scan.mjs --changed repo/path [--changed another/path] [--base pinnedSHA] [--contractor-only] [--out report.json]\nRead-only parsed import graph. Review unrepresented paths with the semantic matrix.');process.exit(0);}
  else throw Error('Unknown option: '+args[i]);
 }
 if(base)changed.push(...changedSince(base));
 if(!changed.length)throw Error('Supply changed paths or a pinned --base commit. Empty changes cannot prove safety.');
 const report=await scanDependencies({changedPaths:changed}),encoded=JSON.stringify(report,null,2)+'\n';
 if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,encoded);console.log(`Reviewed ${report.changedPaths.length} changed paths across ${report.moduleCount} parsed modules. Boundary ${report.contractorBoundary.passed?'passes':'needs review'}; ${report.unrepresentedPaths.length} paths are absent from this graph. Semantic matrix review is still required. Wrote ${out}`);}
 else process.stdout.write(encoded);
 if(strict&&!report.contractorBoundary.passed)process.exitCode=2;
}
