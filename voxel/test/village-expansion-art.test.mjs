import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {validVillageSprite,villageDirectionalPose,villagePortraitCrop} from '../src/village-sprite-math.js';
import {validDirectionalSprite,DIRECTION_NAMES} from '../src/directional-sprite-math.js';
import {expansionIcon,EXPANSION_ICON_IDS} from '../src/ui/village-expansion-icon-markup.js';

const root=new URL('../',import.meta.url);
async function moduleAt(path){const bundled=await build({entryPoints:[new URL(path,root).pathname],bundle:true,format:'esm',platform:'node',write:false,loader:{'.webp':'dataurl'},logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));}
const {GRANNY_SPRITE:legacy,GRANNY_DIRECTIONAL_SPRITE:meta}=await moduleAt('src/content/granny-sprite-meta.js');

test('Granny has honest eight-view idle, four-phase walking and front gesture coverage',()=>{
  assert.equal(validVillageSprite(legacy),true);assert.equal(validDirectionalSprite(meta),true);
  assert.equal(meta.frames.length,48);assert.equal(meta.height,1.95);assert.deepEqual(meta.directions,DIRECTION_NAMES);
  for(let row=0;row<8;row++){
    const angle=row*Math.PI/4;
    const idle=villageDirectionalPose(legacy,meta,{angle});assert.equal(idle.authored,true);assert.equal(idle.frame,row*6);assert.equal(idle.action,'idle');
    const left=villageDirectionalPose(legacy,meta,{angle,walking:true,phase:.05}),right=villageDirectionalPose(legacy,meta,{angle,walking:true,phase:.55});
    assert.equal(left.frame,row*6+1);assert.equal(right.frame,row*6+3);assert.equal(left.leadingLeg,'left');assert.equal(right.leadingLeg,'right');
  }
  assert.equal(villageDirectionalPose(legacy,meta,{mood:'wave'}).frame,5);
  const crop=villagePortraitCrop(legacy);assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=legacy.w&&crop.y+crop.height<=legacy.h);
  assert.equal(validDirectionalSprite({...meta,phases:['left-contact','left-pass']}),false);
  assert.equal(validDirectionalSprite({...meta,phases:['left-contact','left-pass','right-contact','fake']}),false);
});

test('normalised painted poses are unclipped, share a floor and visibly alternate their boots',async()=>{
  const result=JSON.parse(execFileSync('python3',['-c',`from PIL import Image,ImageChops
import json,sys
from pathlib import Path
r=Path(sys.argv[1]);m=json.loads((r/'assets/mothlight-expansion/manifest.json').read_text());im=Image.open(r/'assets/mothlight-expansion/granny-directions.webp').convert('RGBA');out=[]
for row in range(8):
 frames=[im.crop((c*192,row*176,(c+1)*192,(row+1)*176)) for c in range(6)];bounds=[f.getchannel('A').point(lambda x:255 if x>=108 else 0).getbbox() for f in frames]
 left=frames[1].crop((0,135,192,176));right=frames[3].crop((0,135,192,176));diff=ImageChops.difference(left,right);out.append({'bounds':bounds,'bootDifference':sum(diff.convert('RGB').convert('L').getdata())})
print(json.dumps({'rows':out,'scale':m['granny']['sharedScale'],'bytes':m['granny']['runtimeBytes'],'mirrored':m['granny']['mirrored']}))`,root.pathname],{encoding:'utf8'}));
  assert.ok(result.scale>0);assert.equal(result.mirrored,false);assert.ok(result.bytes<750000);
  for(const row of result.rows){assert.ok(row.bootDifference>1000,'contact poses have actual different painted boot pixels');for(const b of row.bounds){assert.ok(b&&b[0]>0&&b[1]>0&&b[2]<192&&b[3]<=164,'body fits its fixed cell');assert.ok(b[3]>=160,'shared grounded baseline');}}
});

test('premium menu icons are a bounded twelve-slot pure atlas presenter',()=>{
  assert.equal(EXPANSION_ICON_IDS.length,12);assert.equal(new Set(EXPANSION_ICON_IDS).size,12);
  assert.equal(expansionIcon('__proto__'),'');assert.equal(expansionIcon('<script>'),'');
  assert.match(expansionIcon('cave',2),/width:24px/);assert.match(expansionIcon('festival',999),/width:128px/);
  const slots=EXPANSION_ICON_IDS.map(id=>expansionIcon(id).match(/background-position:([^;]+)/)[1]);assert.equal(new Set(slots).size,12);
  assert.ok(EXPANSION_ICON_IDS.every(id=>expansionIcon(id).includes(`data-expansion-icon="${id}"`)));
});

test('both new dishes show unique paintings while legacy dishes and unknown IDs retain their behaviour',async()=>{
  const {dishIcon}=await moduleAt('src/ui/kitchen-food-art.js');
  assert.match(dishIcon('cinders-lantern-stew'),/data-expansion-dish="cinders-lantern-stew"/);
  assert.match(dishIcon('grannys-bramble-pudding'),/background-position:100% 50%/);
  assert.match(dishIcon('soup'),/background-size:400% 400%/);assert.equal(dishIcon('not-a-dish'),'');
});

test('manifest retains generated sources and compresses the shipped atlas within the mobile art budget',async()=>{
  const m=JSON.parse(await fs.readFile(new URL('assets/mothlight-expansion/manifest.json',root),'utf8'));
  assert.equal(m.granny.authoredPoses,48);assert.equal(m.granny.interpolated,false);assert.equal(m.icons.items.length,12);assert.equal(m.dishes.items.length,2);
  assert.ok(m.icons.bytes<300000);assert.ok(m.dishes.bytes<150000);assert.ok(m.sources['granny-before-direction-repair.png']);
  assert.ok(Object.values(m.sources).every(s=>s.sha256.length===64&&s.bytes>0));
});
