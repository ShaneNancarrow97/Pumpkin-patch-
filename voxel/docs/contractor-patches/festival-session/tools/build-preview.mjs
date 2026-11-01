#!/usr/bin/env node
// Only the isolated Festival Night engine, fixture UI and existing reference art.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';

export const DEFAULT_PACK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validatePreviewInputs(inputs,pack=DEFAULT_PACK){
 pack=path.resolve(pack);
 const shared=path.resolve(pack,'../late-game-support'),permitted=new Set([path.join(shared,'data/festival-themes.json'),path.join(shared,'art/menu-icons.webp')]);
 if(!Array.isArray(inputs)||!inputs.length)throw Error('Preview contains no inspected source inputs.');
 for(const name of inputs){const file=path.resolve(name);if(!file.startsWith(pack+path.sep)&&!permitted.has(file))throw Error('Preview unexpectedly imports outside the isolated module: '+name);}
 if(!inputs.some(name=>path.resolve(name)===path.join(pack,'src/engine.js')))throw Error('Preview does not contain the actual Festival Night engine.');
}
export async function buildPreview({pack=DEFAULT_PACK,out='Pumpkin-Patch-Festival-Nights.html'}={}){
 pack=path.resolve(pack);out=path.resolve(out);
 for(const name of ['preview/index.html','preview/app.js','preview/style.css','src/engine.js'])if(!fs.existsSync(path.join(pack,name)))throw Error('Missing contractor preview input: '+name);
 const result=await esbuild.build({entryPoints:[path.join(pack,'preview/app.js')],bundle:true,format:'iife',minify:true,target:['es2020'],write:false,metafile:true,loader:{'.webp':'dataurl'},logLevel:'warning'});
 const inputs=Object.keys(result.metafile.inputs);validatePreviewInputs(inputs,pack);
 const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'),css=fs.readFileSync(path.join(pack,'preview/style.css'),'utf8');
 const html=fs.readFileSync(path.join(pack,'preview/index.html'),'utf8').replace('/* @festival:style */',()=>css).replace('/* @festival:script */',()=>script);
 if(/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html))throw Error('Preview unexpectedly references a remote asset.');
 if(html.includes('/* @festival:'))throw Error('A preview build placeholder was not replaced.');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
 return {out,bytes:Buffer.byteLength(html),sha256:sha(html),inputs};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),at=args.indexOf('--out'),result=await buildPreview({out:at<0?undefined:args[at+1]});
 console.log(`Built ${result.out} (${Math.round(result.bytes/1024)} KiB). Contractor module demo; no live game state or saves.`);
}
