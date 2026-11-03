// Builds a self-contained concept page; never reads or writes a game save.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(here,name),'utf8');
const catalogue=JSON.parse(read('catalogue.json')).achievements;
if(catalogue.length!==64||new Set(catalogue.map(x=>x.id)).size!==64||catalogue.reduce((n,x)=>n+x.points,0)!==1000)throw new Error('Expected64unique achievements/1,000points.');
const background=fs.readFileSync(path.join(here,'background-reference.png')).toString('base64');
const template=read('prototype-template.html');
if(!template.includes('const CATALOGUE = /* @catalogue */ [];')||!template.includes('__FARM_BACKGROUND__'))throw new Error('Template placeholders missing.');
const html=template.replace('const CATALOGUE = /* @catalogue */ [];','const CATALOGUE = '+JSON.stringify(catalogue).replace(/<\//g,'<\\/')+';').replace('__FARM_BACKGROUND__','data:image/png;base64,'+background);
fs.writeFileSync(path.join(here,'preview.html'),html);
console.log('Built preview.html:64achievement UI concept; no gameplay integration.');
