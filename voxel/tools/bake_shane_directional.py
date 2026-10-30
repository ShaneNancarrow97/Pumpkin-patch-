#!/usr/bin/env python3
"""Pack reviewed authored Shane pages. Pillow only crops, scales and anchors art.

Static turnarounds may be scaled per view to the same standing silhouette height.
Every animation strip uses ONE scale; no per-phase stretch or invented images.
Only the explicit ACCEPTED table below can enter the runtime atlas.
"""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'docs/plans/directional-cast/shane'
OUT=ROOT/'assets/directional/shane';OUT.mkdir(parents=True,exist_ok=True)
SLOT=(256,400);FOOT=390;BODY=320
PHASES=['contact-left','down-left','passing-left','up-left','contact-right','down-right','passing-right','up-right']
REDUCED=[PHASES[i] for i in [0,2,4,6]]
# mode, source layout, source ordering. LEFT side's first authored pose is
# anatomically right-contact, so rotate the cycle by half, never mirror pixels.
ACCEPTED={
  0:('walk-000-source.png',4,2,list(range(8)),'full'),
 45:('walk-045-reduced-source.png',4,1,[0,1,2,3],'reduced'),
 90:('walk-090-source.png',4,2,list(range(8)),'full'),
180:('walk-180-source.png',4,2,list(range(8)),'full'),
270:('walk-270-reduced-source.png',4,1,[2,3,0,1],'reduced'),
315:('walk-315-reduced-source.png',4,1,[2,3,0,1],'reduced'),
}

def silhouette(f):
    a=np.array(f.getchannel('A'));mask=a>=96;ys,xs=np.where(mask)
    return int(ys.max()-ys.min()+1)

def figure(im,row,col,columns,rows):
    f=im.crop((round(col*im.width/columns),round(row*im.height/rows),round((col+1)*im.width/columns),round((row+1)*im.height/rows))).convert('RGBA')
    a=np.array(f.getchannel('A'));labels,_=ndimage.label(a>=96);area=np.bincount(labels.ravel());area[0]=0
    if not area[1:].size or area.max()<100:raise ValueError('No isolated character')
    main=labels==area.argmax();keep=ndimage.binary_dilation(main,iterations=1);a[~keep]=0;a[a<24]=0;f.putalpha(Image.fromarray(a));return f.crop(f.getbbox())

def pack(name,items,columns,scale):
    rows=(len(items)+columns-1)//columns;canvas=Image.new('RGBA',(SLOT[0]*columns,SLOT[1]*rows));rects=[];metrics=[]
    for index,(angle,f) in enumerate(items):
        s=scale[index] if isinstance(scale,list) else scale
        w,h=round(f.width*s),round(f.height*s)
        if w>SLOT[0]-8 or h>FOOT-8:raise ValueError(f'Oversize silhouette {name}:{angle} {w}x{h}')
        f=f.resize((w,h),Image.Resampling.LANCZOS);x=(index%columns)*SLOT[0]+(SLOT[0]-w)//2;y=(index//columns)*SLOT[1]+FOOT-h;canvas.alpha_composite(f,(x,y))
        rects.append({'x':index%columns*SLOT[0],'y':index//columns*SLOT[1],'w':SLOT[0],'h':SLOT[1],'ax':128,'ay':FOOT})
        a=np.array(f.getchannel('A'));mask=a>=96;ys,xs=np.where(mask);height=int(ys.max()-ys.min()+1);top=mask[ys.min():ys.min()+round(height*.2)];hx=np.where(top)[1]
        metrics.append({'angle':angle,'height':height,'upperSilhouetteWidth':int(hx.max()-hx.min()+1) if len(hx) else 0,'upperWidthToHeight':round((hx.max()-hx.min()+1)/height,4) if len(hx) else 0,'scale':round(s,6),'sha256':hashlib.sha256(f.tobytes()).hexdigest()})
    path=OUT/(name+'.webp');canvas.save(path,'WEBP',quality=91,method=6,exact=True)
    return {'file':path.name,'width':canvas.width,'height':canvas.height,'bytes':path.stat().st_size},rects,metrics

meta={'owner':'shane','look':'shane-base','rows':BODY,'worldHeight':2.3,'angleConvention':'0 front;90 screen-right;180 back;270 screen-left; nominal painted views, not measured rig camera angles','pages':{},'actions':{},'coverage':{'costume':'base only','idle':[],'walk':[],'fullWalk':[],'reducedWalk':[],'missingWalk':[135,225]},'metrics':{}}
items=[]
for q in range(4):
    im=Image.open(ART/f'idle-quarter-{q}-source.png')
    for slot in range(6):items.append((q*90+slot*15,figure(im,slot//3,slot%3,3,2)))
scales=[BODY/silhouette(f) for _,f in items]
page,rects,metrics=pack('base-idle',items,6,scales)
meta['pages']['idle']=page;meta['actions']['idle']={str(angle):{'page':'idle','frames':[frame]} for (angle,_),frame in zip(items,rects)};meta['metrics']['idle']=metrics;meta['coverage']['idle']=[a for a,_ in items]
for angle,(source,cols,rows,order,mode) in ACCEPTED.items():
    im=Image.open(ART/source);frames=[(angle,figure(im,k//cols,k%cols,cols,rows)) for k in order]
    shared=BODY/float(np.median([silhouette(f) for _,f in frames]));key=f'walk-{angle:03d}'
    page,rects,metrics=pack(key,frames,4,shared);meta['pages'][key]=page
    clip={'page':key,'frames':rects,'fps':8 if mode=='full' else 4,'phases':PHASES if mode=='full' else REDUCED}
    if mode=='reduced':clip['mode']='reduced'
    meta['actions'].setdefault('walk',{})[str(angle)]=clip;meta['metrics'][key]=metrics;meta['coverage']['walk'].append(angle);meta['coverage']['reducedWalk' if mode=='reduced' else 'fullWalk'].append(angle)
(OUT/'base.json').write_text(json.dumps(meta,indent=2)+'\n');(ART/'metrics.json').write_text(json.dumps(meta['metrics'],indent=2)+'\n')
# Labelled sequential review is intentionally different from old quarter contact sheet.
idle=Image.open(OUT/'base-idle.webp').convert('RGBA');preview=Image.new('RGB',(6*192,4*324),(28,23,34));draw=ImageDraw.Draw(preview)
for n,angle in enumerate(meta['coverage']['idle']):
    f=idle.crop((n%6*256,n//6*400,n%6*256+256,n//6*400+400)).resize((192,300),Image.Resampling.LANCZOS);preview.paste(f,(n%6*192,n//6*324+24),f);draw.text((n%6*192+8,n//6*324+7),f'{angle} degrees',fill=(248,219,164))
preview.save(ART/'idle-sequential-review.jpg',quality=94)
for angle,clip in meta['actions']['walk'].items():
    page=Image.open(OUT/meta['pages'][clip['page']]['file']).convert('RGBA');frames=[]
    for rect in clip['frames']:
        f=page.crop((rect['x'],rect['y'],rect['x']+rect['w'],rect['y']+rect['h']));bg=Image.new('RGB',SLOT,(31,26,38));bg.paste(f,(0,0),f);frames.append(bg)
    frames[0].save(ART/f'walk-{angle.zfill(3)}-review.gif',save_all=True,append_images=frames[1:],duration=125 if len(frames)==8 else 250,loop=0)
walking=Image.new('RGB',(2048,len(meta['actions']['walk'])*424),(28,23,34));wd=ImageDraw.Draw(walking)
for row,(angle,clip) in enumerate(meta['actions']['walk'].items()):
    page=Image.open(OUT/meta['pages'][clip['page']]['file']).convert('RGBA');wd.text((8,row*424+8),f'{angle} degrees : {clip.get("mode","full 8")}',fill=(248,219,164))
    for index,rect in enumerate(clip['frames']):
        f=page.crop((rect['x'],rect['y'],rect['x']+rect['w'],rect['y']+rect['h']));walking.paste(f,(index*256,row*424+24),f)
walking.save(ART/'walking-review.jpg',quality=94)
print(json.dumps({'coverage':meta['coverage'],'pages':len(meta['pages']),'bytes':sum(p['bytes'] for p in meta['pages'].values()),'idleHeightRange':[min(m['height'] for m in meta['metrics']['idle']),max(m['height'] for m in meta['metrics']['idle'])]}))
