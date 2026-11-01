#!/usr/bin/env node
// Curated semantic impact planning. Commands are printed, never executed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DEFAULT_ROOT=path.resolve(PACK,'../../../..');
export const DEFAULT_MATRIX=path.join(PACK,'data/dependency-matrix.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const loadMatrix=(file=DEFAULT_MATRIX)=>JSON.parse(fs.readFileSync(file,'utf8'));
function normalized(name){
 if(typeof name!=='string'||!name.trim()||name.includes('\0'))throw new TypeError('A changed path must be repository-relative');
 const value=name.replaceAll('\\','/').replace(/^\.\//,'');
 if(value.startsWith('/')||/^[A-Za-z]:/.test(value)||value.split('/').includes('..'))throw new RangeError('Path escapes repository: '+name);
 return value;
}
function matches(file,pattern){
 const escaped=pattern.split('**').map(part=>part.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[^/]*')).join('.*');
 return new RegExp('^'+escaped+'$').test(file);
}

export function validateMatrix(matrix,{root=DEFAULT_ROOT}={}){
 const errors=[],missingFiles=[];
 if(matrix?.schemaVersion!==1||!Array.isArray(matrix?.domains)||!Array.isArray(matrix?.edges)||!Array.isArray(matrix?.checks))return {valid:false,errors:['Unsupported or malformed matrix'],missingFiles:[]};
 const ids=new Set(),checkIds=new Set();
 for(const check of matrix.checks){
  if(!check?.id||checkIds.has(check.id)||typeof check.command!=='string'||!Array.isArray(check.files))errors.push('Invalid or duplicate check: '+check?.id);
  checkIds.add(check?.id);
  for(const file of check.files??[]){try{if(!fs.existsSync(path.join(root,normalized(file))))missingFiles.push(file);}catch{errors.push('Unsafe check evidence: '+file);}}
  try{const cwd=check.cwd==='.'||check.cwd===undefined?'.':normalized(check.cwd);if(!fs.statSync(path.join(root,cwd)).isDirectory())errors.push('Missing check working directory: '+check.id);}catch{errors.push('Missing or unsafe check working directory: '+check.id);}
 }
 for(const domain of matrix.domains){
  if(!domain?.id||ids.has(domain.id)||!Array.isArray(domain.paths)||!domain.paths.length||!Array.isArray(domain.evidence)||!Array.isArray(domain.checkIds)||!Array.isArray(domain.invariants))errors.push('Invalid or duplicate domain: '+domain?.id);
  ids.add(domain?.id);
  for(const id of domain.checkIds??[])if(!checkIds.has(id))errors.push('Unknown check '+id+' on '+domain.id);
  for(const file of domain.evidence??[]){try{if(!fs.existsSync(path.join(root,normalized(file))))missingFiles.push(file);}catch{errors.push('Unsafe domain evidence: '+file);}}
  for(const pattern of domain.paths??[]){try{normalized(pattern);}catch{errors.push('Unsafe domain path pattern: '+pattern);}}
 }
 for(const edge of matrix.edges)if(!ids.has(edge?.from)||!ids.has(edge?.to)||!['active','integration-conditional'].includes(edge?.activation)||typeof edge.consequence!=='string')errors.push('Invalid dependency edge: '+JSON.stringify(edge));
 const absent=[...new Set(missingFiles)].sort();
 return {valid:!errors.length&&!absent.length,errors,missingFiles:absent};
}

export function buildImpactPlan(changedPaths,{matrix=loadMatrix(),root=DEFAULT_ROOT}={}){
 const changed=[...new Set(changedPaths.map(normalized))].sort(),validation=validateMatrix(matrix,{root});
 if(!validation.valid)return {version:1,status:'matrix-invalid',requiresHumanReview:true,changedPaths:changed,validation,unknownPaths:changed,requiredChecks:[],integrationChecks:[]};
 const domains=new Map(matrix.domains.map(d=>[d.id,d]));
 const direct=matrix.domains.filter(d=>changed.some(file=>d.paths.some(pattern=>matches(file,pattern)))).map(d=>d.id);
 const walk=conditional=>{
  const seen=new Set(),queue=[...direct];
  for(let i=0;i<queue.length;i++){const current=queue[i];if(seen.has(current))continue;seen.add(current);for(const edge of matrix.edges)if(edge.from===current&&(conditional||edge.activation==='active')&&!seen.has(edge.to))queue.push(edge.to);}
  return seen;
 };
 const active=walk(false),all=walk(true),future=new Set([...all].filter(id=>!active.has(id)));
 const rows=ids=>[...ids].sort().map(id=>{const d=domains.get(id);return {id,label:d.label,scope:d.scope,direct:direct.includes(id),invariants:[...d.invariants]};});
 const idsFor=domainIds=>new Set([...domainIds].flatMap(id=>domains.get(id).checkIds));
 const required=idsFor(active),conditional=idsFor(future);
 const unknown=changed.filter(file=>!matrix.domains.some(d=>d.paths.some(pattern=>matches(file,pattern))));
 const evidence=[...new Set(matrix.domains.flatMap(d=>d.evidence))].sort();
 return {
  version:1,status:unknown.length?'unmapped-changes':changed.length?'review-required':'no-changes-declared',requiresHumanReview:true,
  matrixRevision:matrix.revision,reviewedBase:matrix.reviewedBase,matrixContentSHA256:sha(JSON.stringify(matrix)),
  changedPaths:changed,directDomains:rows(direct),activeImpacts:rows(active),integrationConditionalImpacts:rows(future),
  requiredChecks:matrix.checks.filter(c=>required.has(c.id)).map(c=>({...c,selection:'current-scope'})),
  integrationChecks:matrix.checks.filter(c=>conditional.has(c.id)&&!required.has(c.id)).map(c=>({...c,selection:'when-integrated'})),
  relevantEdges:matrix.edges.filter(e=>all.has(e.from)&&all.has(e.to)),
  unknownPaths:unknown,validation,
  evidenceHashes:Object.fromEntries(evidence.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))])),
  limitations:[...matrix.knownLimitations,'Suggested commands are never executed by this tool. The report does not approve a change or replace review.']
 };
}

export function renderMatrixMarkdown(matrix){
 const lines=[
  '# Dependency matrix and change review', '',
  `Revision: **${matrix.revision}**. Reviewed live base: \`${matrix.reviewedBase}\`.`, '',
  matrix.scope, '',
  '**Two complementary views:** this matrix records reviewed gameplay contracts; `dependency-scan.mjs` uses esbuild to trace actual imports. Neither alone is a safety proof. Use both before changing a feature.', '',
  '## Change review workflow', '',
  '1. List changed paths. Run the semantic planner and, for source/asset changes, the import scanner.',
  '2. Review directly matched domains, active downstream consumers, invariants and unknown paths.',
  '3. Run checks for the actual scope. Keep future-integration checks separate when a contractor module is still uninstalled.',
  '4. Record outcomes, remaining risks and patch boundaries in the handover. Refresh this map when adding systems, IDs, build paths or semantic contracts.', '',
  '```sh',
  'node voxel/docs/contractor-patches/festival-session/tools/check-impact.mjs --changed voxel/src/content/hayride.js --strict --out /tmp/hayride-impact.json',
  'node voxel/docs/contractor-patches/festival-session/tools/check-impact.mjs --changed voxel/docs/contractor-patches/festival-session/src/engine.js --strict --out /tmp/festival-impact.json',
  'node voxel/docs/contractor-patches/festival-session/tools/dependency-scan.mjs --base 855f29cc7969883268c6313b13eee06e4339a6f8 --contractor-only --out /tmp/import-impact.json',
  '```', '',
  '`--changed` can be repeated. `--base` accepts a pinned commit SHA. `--strict` returns a nonzero status for unmapped paths, invalid evidence or an empty change list. The planner only prints commands; it never runs tests, alters the world or writes without an explicit `--out` path.', '',
  '## Domain matrix', '',
  'Arrows go from a changed producer/contract to a consumer that may need review. Active links apply now. Dashed/conditional links describe adoption work; they do not mean the uninstalled festival module affects current gameplay.', '',
  '| Changed domain | Scope | Active direct consumers | Conditional consumers | Check groups |',
  '| --- | --- | --- | --- | --- |'
 ];
 for(const d of matrix.domains){
  const consumers=activation=>matrix.edges.filter(e=>e.from===d.id&&e.activation===activation).map(e=>'`'+e.to+'`').join(', ')||'—';
  lines.push(`| **${d.label}** (\`${d.id}\`) | ${d.scope} | ${consumers('active')} | ${consumers('integration-conditional')} | ${d.checkIds.map(id=>'`'+id+'`').join(', ')} |`);
 }
 lines.push('', 'The JSON retains path patterns, real evidence files, every link’s consequence, invariants and concrete commands. The planner follows transitive consumers through cycles and deduplicates check groups.', '', '## Important consequences', '');
 for(const e of matrix.edges.filter(e=>['hayride-service','kitchen','festival-state','festival-claims','house-placement'].includes(e.from)))lines.push(`- **${e.from} → ${e.to}** (${e.activation}): ${e.consequence}`);
 lines.push('', '## Limits and maintenance', '');
 for(const text of matrix.knownLimitations)lines.push('- '+text);
 lines.push('- Validation checks referenced files and commands’ working directories, not the correctness of every command. Changes in function semantics can invalidate an edge even while its filename still exists.',
 '- Reports fingerprint the reviewed evidence. Compare source changes and refresh the matrix; a reviewed-base label is not automatic approval of newer code.',
 '- The import scanner covers literal modules/assets, not computed loading, generated CSS/templates, save data, purse allocation, physical geometry or gameplay timing.',
 '- Keep current test evidence separate from future integration requirements. Physical Fold/PS5/performance checks cannot be replaced by path matching.',
 '- This file is generated from `data/dependency-matrix.json` by `renderMatrixMarkdown`. The native integrity test detects a stale rendered table. Update the JSON revision and regenerate this document together.', '');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),changed=[];let out=null,strict=false,base=null;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--changed'&&args[i+1])changed.push(args[++i]);
  else if(args[i]==='--out'&&args[i+1])out=path.resolve(args[++i]);
  else if(args[i]==='--base'&&args[i+1])base=args[++i];
  else if(args[i]==='--strict')strict=true;
  else if(args[i]==='--help'){console.log('node check-impact.mjs --changed repo/path [--changed other/path] [--base pinnedSHA] [--strict] [--out report.json]\nPlans semantic impact/checks only. Unknown paths always need review. No tests are executed.');process.exit(0);}
  else throw Error('Unknown option or missing value: '+args[i]);
 }
 if(base){if(!/^[0-9a-f]{7,40}$/.test(base))throw Error('--base requires a pinned commit SHA');changed.push(...execFileSync('git',['diff','--name-only','--no-renames',base,'HEAD','--'],{cwd:DEFAULT_ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean));}
 const report=buildImpactPlan(changed),encoded=JSON.stringify(report,null,2)+'\n';
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,encoded);console.log(`Impact review: ${report.status}; ${report.directDomains?.length??0} direct domains, ${report.activeImpacts?.length??0} active/potential domains, ${report.integrationConditionalImpacts?.length??0} integration-conditional domains. Wrote ${out}`);}
 else process.stdout.write(encoded);
 if(!report.validation.valid||strict&&(report.unknownPaths.length||!changed.length))process.exitCode=2;
}
