from PIL import Image
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
data={}
for key,cols,rows,cell,pad,quality in [('ingredients',6,3,64,8,90),('dishes',4,4,256,20,92)]:
 im=Image.open(r/f'docs/plans/kitchen-workshop/art/food/{key}-source.png').convert('RGBA')
 out=Image.new('RGBA',(cols*cell,rows*cell)); boxes=[]
 for i in range(cols*rows):
  x=i%cols;y=i//cols
  c=im.crop((x*im.width//cols,y*im.height//rows,(x+1)*im.width//cols,(y+1)*im.height//rows))
  b=c.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
  if not b:raise ValueError((key,i))
  c=c.crop(b);c.thumbnail((cell-pad*2,cell-pad*2),Image.Resampling.NEAREST if key=='ingredients' else Image.Resampling.LANCZOS)
  px=x*cell+(cell-c.width)//2;py=y*cell+(cell-c.height)//2
  out.alpha_composite(c,(px,py));boxes.append([px,py,c.width,c.height])
 out.save(r/f'assets/kitchen-{key}.webp',quality=quality,method=6)
 data[key]={'cols':cols,'rows':rows,'cell':cell,'gutter':pad,'content':boxes,'bytes':(r/f'assets/kitchen-{key}.webp').stat().st_size}
(r/'docs/plans/kitchen-workshop/art/food/metadata.json').write_text(json.dumps(data,indent=2)+'\n')
print({k:v['bytes'] for k,v in data.items()})
