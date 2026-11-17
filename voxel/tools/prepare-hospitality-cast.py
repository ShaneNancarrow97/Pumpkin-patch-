"""Normalize generated whole sheets, keeping a shared scale per walk cycle."""
from PIL import Image
from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parents[1];art=root/'docs/plans/kitchen-workshop/art/visitors';art.mkdir(parents=True,exist_ok=True)
assets=root/'assets'
ids=['duke','countess','plague-noble','spectral-courtier'];old=['ghost','witch','vampire','skeleton','scarecrow','mummy','zombie','werewolf','dead-pirate','clown','baron']
meta={};n=256
for name,source,cols,rows in [('court','/workspace/generated_images/exec-83404846-473e-48ef-9339-acee1a570cec.png',7,4),('seated','/workspace/generated_images/exec-70bc7889-a478-4cdc-bbaa-138ec590b608.png',4,3)]:
 source=art/(name+'-source.png');im=Image.open(source).convert('RGBA');out=Image.new('RGBA',(cols*n,rows*n));data={'w':cols*n,'h':rows*n,'rows':230}
 for row in range(rows):
  crops=[]
  for col in range(cols):
   if name=='seated' and row*cols+col>=11:continue
   cell=im.crop((round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows)))
   bbox=cell.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox();crops.append((col,cell.crop(bbox)))
  scale=min(228/max(c.height for _,c in crops),240/max(c.width for _,c in crops)) if name=='court' else None
  for col,crop in crops:
   k=scale if scale else min(185/crop.height,232/crop.width);w,h=round(crop.width*k),round(crop.height*k);crop=crop.resize((w,h),Image.Resampling.LANCZOS);out.alpha_composite(crop,(col*n+(n-w)//2,row*n+248-h))
   f={'x':col*n,'y':row*n,'w':n,'h':n,'ax':128,'ay':248}
   if name=='court':data.setdefault(ids[row],[]).append(f)
   else:data[old[row*cols+col]]=[f]
 out.save(assets/('hospitality-'+name+'.webp'),quality=88,method=6);meta[name]=data
(root/'src/hospitality-cast-meta.js').write_text('export const HOSPITALITY_META = '+json.dumps(meta,separators=(',',':'))+';\n')
# One compact atlas for paid occasions and Sandy's deluxe products.
im=Image.open(art/'hospitality-icons-source.png').convert('RGBA');out=Image.new('RGBA',(768,576))
for i in range(12):
 x,y=i%4,i//4;c=im.crop((round(x*im.width/4),round(y*im.height/3),round((x+1)*im.width/4),round((y+1)*im.height/3)));bb=c.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox();c=c.crop(bb);c.thumbnail((160,160),Image.Resampling.LANCZOS);out.alpha_composite(c,(x*192+(192-c.width)//2,y*192+(192-c.height)//2))
out.save(assets/'hospitality-icons.webp',quality=88,method=6)
