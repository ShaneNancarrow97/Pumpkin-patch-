import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {SHEETS} from '../src/sprite-meta-hd.js';
import {OWNER_EMPTY_IDLE_META} from '../src/content/owner-empty-idle-meta.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const records=JSON.parse(fs.readFileSync(path.join(root,'assets/owner-idle-concepts/manifest.json'),'utf8')).characters;
for(const who of ['shane','natalie']){
 assert.deepEqual(OWNER_EMPTY_IDLE_META[who].walk,SHEETS[who].walk,'Original walking UV rectangles stay intact');
 assert.equal(OWNER_EMPTY_IDLE_META[who].rows,SHEETS[who].rows,'World scale uses the original measured stature');
}
const check=String.raw`
from PIL import Image
import json,sys,hashlib
cfg=json.load(open(sys.argv[1]))
for row in cfg['records']:
 who=row['id'];original=Image.open(row['original']).convert('RGBA');updated=Image.open(row['output']).convert('RGBA');old=cfg['old'][who];new=cfg['new'][who]
 assert updated.size==(new['w'],new['h'])
 assert hashlib.sha256(open(row['output'],'rb').read()).hexdigest()==row['outputSha256']
 for f in old['walk']:
  box=(f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])
  assert original.crop(box).tobytes()==updated.crop(box).tobytes(),who+' walking pixels changed'
 f=old['idle'][0];image=original.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));bounds=image.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox();oldFoot=bounds[3]-f['ay']
 first=None
 for f in new['idle']:
  image=updated.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));bounds=image.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox()
  assert bounds and abs(bounds[3]-bounds[1]-row['packedBodyPixels'])<=1
  assert abs((bounds[3]-f['ay'])-oldFoot)<=1,who+' foot anchor changed'
  assert bounds[0]>0 and bounds[1]>=0 and bounds[2]<f['w'] and bounds[3]<f['h'],who+' standing art clipped'
  if first is None:first=image.tobytes()
  else:assert first==image.tobytes(),who+' static pose differs between existing idle slots'
print('Owner idle assets preserve walk pixels, physical stature, feet and static-pose coverage')
`;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'owner-idle-'));
try {
 const config=path.join(scratch,'config.json');fs.writeFileSync(config,JSON.stringify({records,old:{shane:SHEETS.shane,natalie:SHEETS.natalie},new:OWNER_EMPTY_IDLE_META}));
 const output=execFileSync('python3',['-c',check,config],{cwd:root,encoding:'utf8',timeout:30000});
 assert.match(output,/preserve walk pixels/);
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
