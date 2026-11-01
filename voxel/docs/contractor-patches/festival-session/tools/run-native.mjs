#!/usr/bin/env node
// Run each node:test file directly and preserve its assertion-level summary.
// Some execution hosts aggregate --test output by file; direct runs give an
// inspectable case count as well as a failing process status.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const pack=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(pack,'../../../..');
const args=process.argv.slice(2);let out=null,includeSupport=false;
for(let i=0;i<args.length;i++){
 if(args[i]==='--out'&&args[i+1])out=path.resolve(args[++i]);
 else if(args[i]==='--include-support')includeSupport=true;
 else throw new Error('Usage: node run-native.mjs [--include-support] [--out report.json]');
}
const folders=[path.join(pack,'test'),...(includeSupport?[path.resolve(pack,'../late-game-support/test')]:[])];
const files=folders.flatMap(folder=>fs.readdirSync(folder).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>path.join(folder,name)));
if(!files.length)throw Error('No contractor test files found');
const results=[];let passed=true;
for(const file of files){
 const label=path.relative(repo,file).replaceAll(path.sep,'/');
 const result=spawnSync(process.execPath,[file],{cwd:repo,encoding:'utf8',maxBuffer:8*1024*1024});
 const log=(result.stdout??'')+(result.stderr??'');
 process.stdout.write('\n'+label+'\n'+log);
 const counts={};
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){
  const matches=[...log.matchAll(new RegExp('(?:^|\\n)(?:ℹ|#)\\s+'+key+'\\s+(\\d+)','g'))];
  counts[key]=matches.length?Number(matches.at(-1)[1]):null;
 }
 const ok=!result.error&&result.status===0&&counts.tests>0&&counts.pass===counts.tests&&['fail','cancelled','skipped','todo'].every(key=>counts[key]===0);
 if(!ok)passed=false;
 results.push({file:label,passed:ok,status:result.status,error:result.error?.message??null,...counts,sourceSHA256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),logSHA256:createHash('sha256').update(log).digest('hex')});
}
const report={version:1,scope:'Individual assertion-level contractor tests, not live whole-game browser verification.',runnerSHA256:createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),passed,fileCount:results.length,tests:results.reduce((n,r)=>n+(r.tests??0),0),results};
if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
process.stdout.write(`\n${passed?'PASS':'FAIL'}: ${report.tests} cases across ${report.fileCount} files.\n`);
if(!passed)process.exitCode=1;
