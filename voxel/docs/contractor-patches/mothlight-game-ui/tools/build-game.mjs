#!/usr/bin/env node
// Compile the actual game, then add a CSS-only skin. Its runtime JS stays byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mothOrnament,botanicalOrnament} from '../assets/ornaments.mjs';
const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(pack,'../../../..');
const argv=process.argv.slice(2),idx=argv.indexOf('--out');
const out=path.resolve(idx>=0?argv[idx+1]:'Pumpkin-Patch-Mothlight-Full-Game.html');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mothlight-game-'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const base=path.join(temp,'game.html');
 const run=spawnSync(process.execPath,[path.join(root,'voxel/build.mjs'),'--out',base],{cwd:root,encoding:'utf8'});
 if(run.error||run.status!==0)throw Error(run.error?.message??run.stdout+'\n'+run.stderr);
 const original=fs.readFileSync(base,'utf8'),font=fs.readFileSync(path.join(pack,'assets/caveat-latin.woff2'));
 const svgData=svg=>'data:image/svg+xml,'+encodeURIComponent(svg.replaceAll('currentColor','#74506b'));
 let css=fs.readFileSync(path.join(pack,'theme.css'),'utf8')
  .replaceAll('mothlight:caveat','data:font/woff2;base64,'+font.toString('base64'))
  .replaceAll('mothlight:moth',svgData(mothOrnament()))
  .replaceAll('mothlight:botanical',svgData(botanicalOrnament()));
 if(css.includes('mothlight:'))throw Error('Unresolved theme asset');
 const license=fs.readFileSync(path.join(pack,'assets/OFL-Caveat.txt'),'utf8').replaceAll('--','—');
 const html=original.replace('</style>',()=>css+'\n</style>\n<!-- Mothlight embedded Caveat SIL font license\n'+license+'\n-->').replace('<body>','<body class="mothlight-game">');
 const script=source=>source.match(/<script>([\s\S]*)<\/script>/)?.[1];
 if(!script(original)||script(original)!==script(html))throw Error('Theme changed the actual game runtime');
 if(!html.includes('id="world"')||!html.includes('id="fullscreen"')||!html.includes('class="mothlight-game"'))throw Error('Actual game shell missing');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
 const source=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
 const proof={sourceCommit:source.status===0?source.stdout.trim():null,reviewedBase:'f2f96f8351dea4cf6072862b1e3e0b14d6a318dc',scope:'The actual complete offline game with an injected visual skin; runtime script is byte-identical to its standard build',bytes:Buffer.byteLength(html),sha256:sha(html),baseSHA256:sha(original),runtimeSHA256:sha(script(html)),runtimeByteIdentical:true,playerSaveKeyChanged:false};
 fs.writeFileSync(out+'.build.json',JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({out,...proof},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
