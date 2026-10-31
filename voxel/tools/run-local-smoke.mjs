// Managed Chromium may block file://; serve the exact offline bytes locally.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.resolve(process.argv[2]??path.join(root,'dist/pumpkin-patch-voxel.html'));
const html=fs.readFileSync(file);
const server=http.createServer((request,response)=>{if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}response.setHeader('Content-Type','text/html');response.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const args=['smoke.mjs',...process.argv.slice(3)];
 const child=spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:'+server.address().port}});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve(code??1));});
 process.exitCode=code;
}finally{await new Promise(resolve=>server.close(resolve));}
