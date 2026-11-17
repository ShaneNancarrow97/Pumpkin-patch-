// Run the unmodified compatibility smoke when managed Chrome blocks file URLs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';

const filename=path.resolve(process.argv[2]??''),expected=process.env.MOTHLIGHT_EXPECTED_SHA;
if(!process.argv[2]||!expected)throw Error('Supply the reviewed HTML path and MOTHLIGHT_EXPECTED_SHA.');
const html=await fs.readFile(filename),sha=createHash('sha256').update(html).digest('hex');
if(sha!==expected)throw Error('HTML differs from the reviewed canonical artifact.');
console.log(JSON.stringify({scope:'Unmodified smoke.mjs, draw-held logic only. Managed Chrome blocks file URLs; unchanged captured bytes are served on loopback.',html:filename,sha256:sha,bytes:html.length}));
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
try{
 const child=spawn(process.execPath,['smoke.mjs'],{cwd:process.cwd(),env:{...process.env,GAME_URL:`http://127.0.0.1:${server.address().port}/game.html`,CHROMIUM_PATH:process.env.CHROMIUM_PATH??'/usr/bin/chromium',SMOKE_HOLD_DRAWS:'1'},stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve(signal?1:code??1));});
 process.exitCode=code;
}finally{await new Promise(resolve=>server.close(resolve));}
