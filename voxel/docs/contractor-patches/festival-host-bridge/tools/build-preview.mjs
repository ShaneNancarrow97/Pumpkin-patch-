#!/usr/bin/env node
// Offline receipt lab: real pure rules, isolated bridge and review UI only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';

export const DEFAULT_PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// esbuild distinguishes JSON import-attribute variants in metafile keys. The
// suffix is parser metadata, not part of the on-disk path.
export const sourceInputPath=name=>name.replace(/ with \{ type: ['"]json['"] \}$/,'');
export function validatePreviewInputs(inputs,pack=DEFAULT_PACK){
 pack=path.resolve(pack);const repo=path.resolve(pack,'../../../..'),voxel=path.join(repo,'voxel/src'),shared=path.join(repo,'src');
 const allowedFiles=new Set([
  path.resolve(pack,'../festival-session/src/engine.js'),path.resolve(pack,'../festival-session/adapters/readiness.js'),
  path.resolve(pack,'../late-game-support/data/festival-themes.json'),path.resolve(pack,'../late-game-support/art/menu-icons.webp'),
  path.join(voxel,'model.js'),path.join(voxel,'costume-expansion.js'),path.join(shared,'core/costume-model.mjs'),
  path.join(repo,'voxel/assets/fraunces-400.woff2'),path.join(repo,'voxel/assets/dm-sans.woff')
 ]);
 if(!Array.isArray(inputs)||!inputs.length)throw Error('Receipt lab contains no inspected source inputs.');
 const resolved=inputs.map(name=>path.resolve(sourceInputPath(name)));
 for(const file of resolved){
  if(file===path.join(voxel,'main.js')||file===path.join(voxel,'scene.js')||file.startsWith(path.join(voxel,'ui')+path.sep)||/[/\\](?:storage|local-storage|save-storage)\.[mc]?js$/.test(file))throw Error('Receipt lab unexpectedly imports live boot, scene, UI or storage: '+file);
  const allowed=file.startsWith(pack+path.sep)||allowedFiles.has(file)||file.startsWith(path.join(voxel,'rules')+path.sep)||file.startsWith(path.join(voxel,'content')+path.sep)||file.startsWith(path.join(shared,'content')+path.sep);
  if(!allowed)throw Error('Receipt lab imports an unreviewed source outside the rule boundary: '+file);
 }
 for(const name of ['src/bridge.js','lab/scenario.js','adapters/outcomes.js'])if(!resolved.includes(path.join(pack,name)))throw Error('Receipt lab is missing its actual '+name);
 for(const name of ['model.js','rules/cooking-sales.js','rules/cocoa-menu.js','rules/garden-crops.js','rules/hayride.js'])if(!resolved.includes(path.join(voxel,name)))throw Error('Receipt lab does not exercise actual game rules: '+name);
}
export async function buildPreview({pack=DEFAULT_PACK,out='Pumpkin-Patch-Receipt-Lab.html'}={}){
 pack=path.resolve(pack);out=path.resolve(out);
 for(const name of ['preview/index.html','preview/app.js','preview/style.css','src/bridge.js','adapters/outcomes.js','lab/scenario.js'])if(!fs.existsSync(path.join(pack,name)))throw Error('Missing receipt lab input: '+name);
 const result=await esbuild.build({entryPoints:[path.join(pack,'preview/app.js')],bundle:true,format:'iife',minify:true,target:['es2020'],write:false,metafile:true,loader:{'.webp':'dataurl','.woff':'dataurl','.woff2':'dataurl'},logLevel:'warning'});
 const inputs=Object.keys(result.metafile.inputs);validatePreviewInputs(inputs,pack);
 const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'),css=fs.readFileSync(path.join(pack,'preview/style.css'),'utf8');
 const html=fs.readFileSync(path.join(pack,'preview/index.html'),'utf8').replace('/* @bridge:style */',()=>css).replace('/* @bridge:script */',()=>script);
 if(/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html))throw Error('Receipt lab unexpectedly references a remote asset.');
 if(html.includes('/* @bridge:'))throw Error('Receipt lab build placeholders remain.');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
 return {out,bytes:Buffer.byteLength(html),sha256:sha(html),inputs};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),at=args.indexOf('--out'),result=await buildPreview({out:at<0?undefined:args[at+1]});
 console.log(`Built ${result.out} (${Math.round(result.bytes/1024)} KiB). Real pure rules in a private contractor lab; no player save or game boot.`);
}
