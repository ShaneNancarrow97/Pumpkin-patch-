"""Rebuild premium art delivery; no gameplay or catalogue mutation."""
from pathlib import Path
from PIL import Image
import json,base64
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/expansion/premium'
OUT=ROOT/'assets/premium'
OUT.mkdir(parents=True,exist_ok=True)
groups={
'furniture':['copper-range','preserves-dresser','copper-sink-island','moon-canopy-bed','moon-wardrobe','moon-vanity'],
'wall-decor':['copper-pan-rail','gothic-spice-cabinet','iron-utensil-rack','recipe-teapot-shelf','crescent-mirror','haunted-manor-painting']}
manifest=[]
for group,names in groups.items():
 im=Image.open(SRC/(group+'.png')).convert('RGBA')
 for i,name in enumerate(names):
  x,y=i%3,i//3
  tile=im.crop((x*512,y*512,(x+1)*512,(y+1)*512))
  a=tile.getchannel('A').point(lambda n:0 if n<9 else n)
  tile.putalpha(a)
  box=a.getbbox()
  assert box, name
  tile=tile.crop(box)
  tile.save(OUT/(name+'.webp'),lossless=True)
  manifest.append(dict(id=name,source=group,cell=i,size=list(tile.size),anchor=[round(tile.width/2),tile.height if group=='furniture' else round(tile.height/2)],mount='floor' if group=='furniture' else 'wall',suggestedPrice=[14000,10000,12000,22000,16000,18000][i] if group=='furniture' else [4500,6500,3500,5000,8000,11000][i],status='art-ready; catalogue registration pending'))
for name in ['natalie-freddy','shane-jason']:
 im=Image.open(SRC/(name+'.png')).convert('RGBA')
 # Preserve source layout; common source sheet dimensions are not divisible by 3.
 frames=[]
 for i in range(9):
  x,y=i%3,i//3
  tile=im.crop((round(x*im.width/3),round(y*im.height/3),round((x+1)*im.width/3),round((y+1)*im.height/3)))
  assert tile.getchannel('A').getbbox()
  tile.save(OUT/(name+f'-{i}.webp'),lossless=True)
  frames.append(name+f'-{i}.webp')
 manifest.append(dict(id=name,frames=frames,idle=[0,1,2],walk=[3,4,5,6,7,8],status='direct original-sprite edit; runtime anchor normalization pending'))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
html=['<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Premium art review</title><style>body{margin:0;background:#17121d;color:#f4e7d0;font:16px system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#292031;border-radius:16px;padding:16px}img{width:100%;height:260px;object-fit:contain}h1{font-size:24px}small{color:#c5b6ce}</style><h1>Premium house items & costume edits</h1><p>Art review only. Furniture is not registered in the shop yet. Costume rows: three idle frames, six walking frames.</p><main>']
for entry in manifest:
 name=entry['id'];path=OUT/(entry.get('frames',[name+'.webp'])[0])
 uri='data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
 html.append(f'<article><img id="{name}" src="{uri}"><h2>{name.replace("-"," ").title()}</h2><small>{entry["status"]}</small></article>')
html.append('</main><script>')
for e in manifest:
 if 'frames' in e:
  urls=['data:image/webp;base64,'+base64.b64encode((OUT/f).read_bytes()).decode() for f in e['frames']]
  html.append('{const frames='+json.dumps(urls)+';let i=0;setInterval(()=>{document.getElementById('+json.dumps(e['id'])+').src=frames[3+(i++%6)]},160);} ')
html.append('</script>')
Path('/workspace/Pumpkin Patch - Premium Art Review.html').write_text(''.join(html))
print('Baked',len(manifest),'entries; offline art review written')
