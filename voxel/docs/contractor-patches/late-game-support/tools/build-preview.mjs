#!/usr/bin/env node
// One offline review file, with only the isolated preview and existing voxel kit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';

export const DEFAULT_PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validatePreviewData(audit,content){
 if(audit.version!==1||audit.scenarios?.length!==18||!audit.assumptions?.length||audit.options?.acceptance!=='capacity')throw Error('The preview requires the emitted eighteen-case capacity audit with assumptions.');
 const keys=new Set();
 for(const s of audit.scenarios){
  const c=s.config,m=s.metrics,key=[c?.routeLevel,c?.fleet,c?.ticketPrice].join(':');
  if(![0,1,2].includes(c?.routeLevel)||![1,2].includes(c?.fleet)||![8,12,20].includes(c?.ticketPrice)||keys.has(key))throw Error('Audit scenario matrix is incomplete or duplicated.');
  keys.add(key);
  for(const [name,value]of Object.entries({circuitSeconds:c.circuitSeconds,scareRating:c.scareRating,capitalInvested:c.capitalInvested,completed:m?.completed,ticketsSold:m?.ticketsSold,ticketRevenue:m?.ticketRevenue,meanBoardingQueueSeconds:m?.meanBoardingQueueSeconds}))if(!Number.isFinite(value)||value<0)throw Error('Missing/invalid audit value: '+s.id+'/'+name);
 }
 if(content.integrationStatus!=='not-installed'||content.themes?.length!==3||content.status!=='proposal')throw Error('Content must remain clearly labelled as an uninstalled three-theme proposal.');
 for(const theme of content.themes)if(theme.goals?.choose!==3||theme.goals?.options?.length!==4)throw Error('Each proposed night must keep its choice of three out of four goals.');
}
export function validateSourceSnapshot(audit,pack=DEFAULT_PACK){
 const repo=path.resolve(pack,'../../../..'),hashes=audit.sourceHashes;
 if(!hashes||!Object.keys(hashes).length||typeof audit.auditorSHA256!=='string')throw Error('Audit is missing its source snapshot. Regenerate the attraction audit first.');
 for(const [name,expected]of Object.entries(hashes)){
  const file=path.resolve(repo,name);
  if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)||digest(fs.readFileSync(file))!==expected)throw Error('Audit source snapshot is stale at '+name+'. Rerun tools/audit-attractions.mjs before rebuilding the preview.');
 }
 if(digest(fs.readFileSync(path.join(pack,'tools/audit-attractions.mjs')))!==audit.auditorSHA256)throw Error('Auditor changed after its report. Rerun tools/audit-attractions.mjs before rebuilding the preview.');
}
export async function buildPreview({pack=DEFAULT_PACK,out='Pumpkin-Patch-Late-Game-Workshop.html'}={}){
 pack=path.resolve(pack);out=path.resolve(out);
 const required=['preview/index.html','preview/app.js','preview/style.css','models/reward-props.js','data/festival-themes.json','findings/attraction-audit.json','art/menu-icons.webp'];
 for(const name of required)if(!fs.existsSync(path.join(pack,name)))throw Error('Missing reviewed input: '+name);
 const audit=JSON.parse(fs.readFileSync(path.join(pack,'findings/attraction-audit.json'),'utf8')),content=JSON.parse(fs.readFileSync(path.join(pack,'data/festival-themes.json'),'utf8'));
 validatePreviewData(audit,content);validateSourceSnapshot(audit,pack);
 const result=await esbuild.build({entryPoints:[path.join(pack,'preview/app.js')],bundle:true,format:'iife',minify:true,target:['es2020'],write:false,metafile:true,loader:{'.webp':'dataurl'},logLevel:'warning'});
 const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'),css=fs.readFileSync(path.join(pack,'preview/style.css'),'utf8');
 const html=fs.readFileSync(path.join(pack,'preview/index.html'),'utf8').replace('/* @workshop:style */',()=>css).replace('/* @workshop:script */',()=>script);
 if(/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html))throw Error('Preview unexpectedly references a remote asset.');
 const inputs=Object.keys(result.metafile.inputs);
 if(inputs.some(name=>/voxel\/src\/(?:main|model|scene)\.js$|voxel\/src\/rules\//.test(name.replaceAll('\\','/'))))throw Error('Preview unexpectedly bundles a live game or rule module.');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
 return {out,bytes:Buffer.byteLength(html),sha256:digest(html),inputs};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),at=args.indexOf('--out'),result=await buildPreview({out:at<0?undefined:args[at+1]});
 console.log(`Built ${result.out} (${Math.round(result.bytes/1024)} KiB). Review preview only; no game hooks or saves.`);
}
