// Runs the unchanged standard smoke against one immutable offline HTML over
// loopback, for managed browsers that disallow file:// navigation.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const file=path.resolve(process.argv[2]||'dist/pumpkin-patch-voxel.html'),html=fs.readFileSync(file);
const server=http.createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const child=spawn(process.execPath,['smoke.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,GAME_URL:`http://127.0.0.1:${server.address().port}`,SMOKE_LITE:'1'}});
 process.exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve(code??1));});
}finally{await new Promise(resolve=>server.close(resolve));}
