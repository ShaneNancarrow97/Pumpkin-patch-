// Make the baked animation proof portable, including its full contact sheets.
// The game's own renderer and assets are unchanged by this review-only export.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const assets=path.join(root,'assets/directional');
const manifest=JSON.parse(await fs.readFile(path.join(assets,'manifest.json'),'utf8'));
const output=path.resolve(process.argv[2]??path.join(root,'dist/directional-character-preview.html'));
let html=await fs.readFile(path.join(assets,'preview.html'),'utf8');
const contacts={};
for(const id of Object.keys(manifest.characters)){
  const webp=await fs.readFile(path.join(assets,id+'.webp'));
  const contact=await fs.readFile(path.join(assets,id+'-contact.jpg'));
  const file=JSON.stringify(id+'.webp');
  if(!html.includes(file))throw new Error('Preview is missing '+id);
  html=html.replace(file,JSON.stringify('data:image/webp;base64,'+webp.toString('base64')));
  contacts[id]='data:image/jpeg;base64,'+contact.toString('base64');
}
if(!html.includes("link.href=c.id+'-contact.jpg'"))throw new Error('Contact link template changed');
html=html.replace('const cast=','const contactSheets='+JSON.stringify(contacts)+';const cast=');
html=html.replace("link.href=c.id+'-contact.jpg'","link.href=contactSheets[c.id];link.download=c.id+'-contact.jpg'");
html=html.replace('View all 64 frames','Download 64-frame sheet');
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,html);
console.log(JSON.stringify({file:output,characters:Object.keys(manifest.characters).length,bytes:Buffer.byteLength(html)}));
