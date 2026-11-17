#!/usr/bin/env python3
"""Crop/anchor whole-sheet walk edits; never synthesise limb motion in code."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,re
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/plans/life-play/walk-art';W,H,BASE=448,400,390
IDS={'base':['shane-base','natalie-base'],'shane-a':['shane-vampire','shane-skeleton','shane-scarecrow','shane-frankenstein'],'shane-b':['shane-mummy','shane-slasher','shane-chucky','shane-jason'],'natalie-a':['natalie-witch','natalie-ghostbride','natalie-batqueen','natalie-vampire','natalie-frankenstein'],'natalie-b':['natalie-mummy','natalie-slasher','natalie-tiffany','natalie-freddy'],'wheelchair':['natalie-wheelchair']}
# Hats extend above a consistent body; a seated wheelchair is correctly shorter.
HEIGHT={'shane-base':330,'shane-vampire':330,'shane-skeleton':330,'shane-scarecrow':345,'shane-jason':330,'natalie-witch':372,'natalie-batqueen':350,'natalie-freddy':340,'natalie-ghostbride':330,'natalie-wheelchair':270}
def module(name,constant):
 text=(ROOT/'src'/name).read_text();return json.loads(re.search(r'export const '+constant+r'\s*=\s*({.*?});',text,re.S).group(1))
old=module('player-direction-meta.js','PLAYER_DIRECTION_META');front={**module('sprite-meta-hd.js','SHEETS'),**module('costume-sprite-meta.js','COSTUME_SHEETS'),**module('natalie-wheelchair-meta.js','WHEELCHAIR_META')}
def boundary(alpha, expected, span):
 # Generated sheets are not geometrically even. Follow the alpha valley rather
 # than slicing a shoe, hair or raised hand at an arithmetic cell boundary.
 lo=max(1,round(expected-span*.23));hi=min(alpha.shape[0]-1,round(expected+span*.23))
 band=alpha[lo:hi].astype(float)/255
 cost=band**2*1000+(np.arange(lo,hi)[:,None]-expected)**2*.0001
 h,w=cost.shape;previous=cost[:,0].copy();trail=np.empty((w,h),dtype=np.int8)
 for x in range(1,w):
  routes=[]
  for step in [-2,-1,0,1,2]:
   shifted=np.full(h,np.inf)
   if step<0:shifted[:step]=previous[-step:]+abs(step)*.3
   elif step>0:shifted[step:]=previous[:-step]+step*.3
   else:shifted=previous.copy()
   routes.append(shifted)
  routes=np.array(routes);best=np.argmin(routes,axis=0)
  trail[x]=best-2;previous=cost[:,x]+np.min(routes,axis=0)
 path=np.empty(w,dtype=int);y=int(np.argmin(previous))
 for x in range(w-1,-1,-1):
  path[x]=lo+y
  if x:y-=int(trail[x,y])
 return path

def grid(im, rows, cols=4):
 rgba=np.array(im.convert('RGBA'));alpha=rgba[:,:,3];height,width=alpha.shape
 vertical=[np.full(height,0),*[boundary(alpha.T,width*c/cols,width/cols) for c in range(1,cols)],np.full(height,width)]
 cells={};xx=np.arange(width)[None,:];yy=np.arange(height)[:,None]
 for col in range(cols):
  column=(xx>=vertical[col][:,None])&(xx<vertical[col+1][:,None]);masked=np.where(column,alpha,0)
  x0=max(0,int(vertical[col].min()));x1=min(width,int(vertical[col+1].max()))
  horizontal=[np.full(x1-x0,0),*[boundary(masked[:,x0:x1],height*r/rows,height/rows) for r in range(1,rows)],np.full(x1-x0,height)]
  for row in range(rows):
   region=column[:,x0:x1]&(yy>=horizontal[row][None,:])&(yy<horizontal[row+1][None,:]);part=rgba[:,x0:x1].copy();part[:,:,3]=np.where(region,part[:,:,3],0);cells[row,col]=Image.fromarray(part)
 return cells

def isolate(frame):
 frame=frame.convert('RGBA');a=np.array(frame.getchannel('A'));lab,n=ndimage.label(a>=96);areas=np.bincount(lab.ravel());areas[0]=0;main=lab==areas.argmax();ys,xs=np.where(main)
 near=np.zeros_like(main);near[max(0,ys.min()-3):ys.max()+4,max(0,xs.min()-3):xs.max()+4]=True
 for c in range(1,n+1):
  if areas[c]>8 and np.any((lab==c)&near):main|=lab==c
 frame.putalpha(Image.fromarray(np.where(main,255,0).astype('uint8')));box=frame.getbbox();frame=frame.crop(box)
 a=np.array(frame.getchannel('A'));ys,xs=np.where(a[:max(5,round(frame.height*.18))]>0);anchor=float(np.median(xs)) if len(xs) else frame.width/2
 return frame,anchor
meta={};metrics={};previews={}
for name,ids in IDS.items():
 im=Image.open(ART/(name+'.png'));cells=grid(im,len(ids));sheet=Image.new('RGBA',(W*4,H*len(ids)))
 for row,id in enumerate(ids):
  cuts=[isolate(cells[row,c]) for c in range(4)];target=HEIGHT.get(id,320);scale=target/max(f.height for f,_ in cuts)
  # Never shrink a cape or wide stride; cells are wide enough for the whole silhouette.
  assert max(f.width*scale for f,_ in cuts)<W-10,(id,'walk too wide')
  rects=[];baked=[];heights=[]
  for c,(f,anchor) in enumerate(cuts):
   f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS);x=round(W/2-anchor*scale);y=BASE-f.height
   assert x>=0 and x+f.width<=W,(id,'head anchor exceeds cell')
   sheet.alpha_composite(f,(c*W+x,row*H+y));baked.append(sheet.crop((c*W,row*H,(c+1)*W,(row+1)*H)));heights.append(f.height)
   rects.append({'x':c*W,'y':row*H,'w':W,'h':H,'ax':W/2,'ay':BASE})
  meta[id]={'sheet':name,'w':sheet.width,'h':sheet.height,'rows':320,'targetHeight':target,'bodyHeight':270 if id.endswith('wheelchair') else 320,'side':rects,'phase':['contact','pass','opposite-contact','heel-lift']}
  mask=[np.array(f.getchannel('A'))[BASE-145:BASE]>128 for f in baked]
  changes=[float(np.logical_xor(mask[i],mask[(i+1)%4]).sum()/max(1,np.logical_or(mask[i],mask[(i+1)%4]).sum())) for i in range(4)]
  metrics[id]={'heightRange':[min(heights),max(heights)],'targetHeight':target,'legChange':changes,'frameHashCount':len(set(f.tobytes() for f in baked))}
  assert min(changes)>(.08 if id.endswith('wheelchair') else .12),(id,'insufficient leg/wheel motion',changes)
  assert len(set(f.tobytes() for f in baked))==4,(id,'duplicate frame')
  previews[id]=baked
 sheet.save(ROOT/'assets'/('player-walk-'+name+'.webp'),'WEBP',quality=88,method=6,exact=True)
# The one real voxel can replaces all baked-can artwork in the originals.
im=Image.open(ART/'water-empty.png');cells=grid(im,1,2);sheet=Image.new('RGBA',(W*2,H));water={}
for col,who in enumerate(['shane','natalie']):
 f,anchor=isolate(cells[0,col]);scale=HEIGHT.get(who+'-base',320)/f.height;f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS);x=round(W/2-anchor*scale);sheet.alpha_composite(f,(col*W+x,BASE-f.height));water[who+'-base']={'x':col*W,'y':0,'w':W,'h':H,'ax':W/2,'ay':BASE}
sheet.save(ROOT/'assets/player-water-empty.webp','WEBP',quality=90,method=6,exact=True)
# Record actual alpha stature of the old front/back strips for view changes.
for id,m in meta.items():
 fm=front.get(id if id not in ['shane-base','natalie-base'] else id.split('-')[0]);fname='natalie-wheelchair.webp' if id=='natalie-wheelchair' else ('costume-expansion/'+id+'.webp') if id in ['shane-chucky','natalie-tiffany','natalie-freddy','shane-jason'] else 'hd-'+(id.split('-')[0] if id.endswith('-base') else id)+'.webp'
 image=Image.open(ROOT/'assets'/fname);sizes={}
 for phase in ['idle','walk']:
  hs=[]
  for f in fm.get(phase,[]):
   a=image.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getchannel('A');box=a.point(lambda a:255 if a>=128 else 0).getbbox();hs.append((box[3]-box[1])*(f.get('unit',2.3/fm['rows'])))
  sizes[phase]=float(np.median(hs))
 m['frontScale']={k:round((m['targetHeight']*2.3/320)/v,6) for k,v in sizes.items()}
 om=old[id];image=Image.open(ROOT/'assets'/('player-directions-'+om['sheet']+'.webp'));hs=[]
 for f in om['back']:
  a=image.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getchannel('A');box=a.point(lambda a:255 if a>=128 else 0).getbbox();hs.append(box[3]-box[1])
 m['backScale']=round(m['targetHeight']/float(np.median(hs)),6)
metrics['budgetBytes']=sum((ROOT/'assets'/('player-walk-'+name+'.webp')).stat().st_size for name in IDS)+(ROOT/'assets/player-water-empty.webp').stat().st_size
(ROOT/'src/player-side-walk-meta.js').write_text('// Generated by tools/bake_player_side_walk.py.\nexport const PLAYER_SIDE_WALK_META = '+json.dumps(meta,separators=(',',':'))+';\nexport const PLAYER_EMPTY_WATER_META = '+json.dumps(water,separators=(',',':'))+';\n')
(ART/'walk-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
# Four animation contacts simultaneously show every outfit for an art review.
frames=[]
for c in range(4):
 canvas=Image.new('RGB',(5*224,4*218),(28,23,36));draw=ImageDraw.Draw(canvas)
 for i,(id,row) in enumerate(previews.items()):
  small=row[c].resize((224,200),Image.Resampling.LANCZOS);canvas.paste(small,((i%5)*224,(i//5)*218),small);draw.text(((i%5)*224+5,(i//5)*218+201),id,fill=(239,215,176))
 frames.append(canvas)
frames[0].save(ART/'all-looks-walk.gif',save_all=True,append_images=frames[1:],duration=150,loop=0,optimize=False)
preview=Image.new('RGB',(W*4,5*H),(28,23,36))
for r,id in enumerate(['shane-base','natalie-base','shane-skeleton','natalie-freddy','natalie-wheelchair']):
 for c,f in enumerate(previews[id]):preview.paste(f,(c*W,r*H),f)
preview.save(ART/'walk-contact-preview.jpg',quality=90)
print('Baked',len(meta),'looks;',metrics['budgetBytes'],'bytes; minimum motion',min(min(v['legChange']) for v in metrics.values() if isinstance(v,dict)))
