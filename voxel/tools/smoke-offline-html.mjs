// Run the existing full smoke on a standalone file via localhost, preserving its defaults.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1]},root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.resolve(arg('--html',path.join(root,'dist/pumpkin-patch-voxel.html'))),shots=path.resolve(arg('--shots','qa-smoke'));
fs.mkdirSync(shots,{recursive:true});const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return}res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const child=spawn(process.execPath,['smoke.mjs','--shots',shots],{cwd:root,env:{...process.env,GAME_URL:`http://127.0.0.1:${server.address().port}`},stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});await new Promise(r=>server.close(r));process.exitCode=code??1;
