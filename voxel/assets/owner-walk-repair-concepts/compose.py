"""Register complete generated gait strips; do not draw or fabricate any limb pose."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,statistics
ROOT=Path(__file__).resolve().parent
DIRS=['front','frontRight','right','backRight','back','backLeft','left','frontLeft']
CELL=(320,360);ANCHOR=(160,340);HEIGHT=320

def gutters(alpha,count,axis,region=None):
 w,h=alpha.size;length=w if axis==0 else h;result=[0]
 for i in range(1,count):
  mid=length*i/count;r=length/count*.16
  def score(n):
   crop=alpha.crop((n,0,n+1,h) if axis==0 else (0,n,w,n+1));return sum(x>=48 for x in crop.tobytes())
  choices=range(max(1,int(mid-r)),min(length,int(mid+r)+1));at=min(choices,key=lambda n:(score(n),abs(n-mid)))
  if score(at)>3:raise ValueError(f'No clean gutter near {axis}:{i}; {score(at)} pixels')
  result.append(at)
 return result+[length]

def read_strip(path,crops=None):
 im=Image.open(path).convert('RGBA')
 if crops:return [im.crop(c['box']) for c in crops]
 alpha=im.getchannel('A');ys=gutters(alpha,2,1);frames=[]
 for row in range(2):
  band=im.crop((0,ys[row],im.width,ys[row+1]));xs=gutters(band.getchannel('A'),4,0)
  for col in range(4):frames.append(band.crop((xs[col],0,xs[col+1],band.height)))
 return frames

def bounds(frame):return frame.getchannel('A').point(lambda x:255 if x>=32 else 0).getbbox()
def torso_x(frame):
 b=bounds(frame);alpha=frame.getchannel('A');centres=[]
 for y in range(round(b[1]+(b[3]-b[1])*.30),round(b[1]+(b[3]-b[1])*.55)):
  pixels=alpha.crop((0,y,frame.width,y+1)).tobytes();runs=[];start=None
  for x,v in enumerate(pixels+b'\0'):
   if v>=64 and start is None:start=x
   elif v<64 and start is not None:runs.append((x-start,(start+x)/2));start=None
  if runs:centres.append(max(runs)[1])
 return statistics.median(centres)

def assemble(who,spec):
 canvas=Image.new('RGBA',(CELL[0]*8,CELL[1]*8));records=[]
 for row,direction in enumerate(DIRS):
  entry=spec[direction];path=ROOT/who/entry['file'];frames=read_strip(path,entry.get('crops'))
  if entry.get('override0'):
   replacement=Image.open(ROOT/entry['override0']).convert('RGBA');old=bounds(frames[0]);new=bounds(replacement);ratio=(old[3]-old[1])/(new[3]-new[1]);replacement=replacement.crop(new).resize((round((new[2]-new[0])*ratio),round((new[3]-new[1])*ratio)),Image.Resampling.LANCZOS);frames[0]=replacement
  order=entry.get('order',list(range(8)));frames=[frames[i] for i in order]
  nominal=statistics.mean(bounds(frames[i])[3]-bounds(frames[i])[1] for i in [0,4]);scale=HEIGHT/nominal
  for col,frame in enumerate(frames):
   b=bounds(frame);cx=torso_x(frame);crop=frame.crop(b);size=(round(crop.width*scale),round(crop.height*scale));crop=crop.resize(size,Image.Resampling.LANCZOS);offset=(round(ANCHOR[0]-(cx-b[0])*scale),ANCHOR[1]-size[1])
   if offset[0]<2 or offset[0]+size[0]>CELL[0]-2 or offset[1]<2:raise ValueError((who,direction,col,'clipped',offset,size))
   canvas.alpha_composite(crop,(col*CELL[0]+offset[0],row*CELL[1]+offset[1]));records.append({'direction':direction,'phase':col,'file':str(path.relative_to(ROOT)),'sourcePhase':order[col],'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceBounds':b,'torsoX':cx,'scale':scale,'offset':offset,'size':size})
   if entry.get('override0') and order[col]==0:records[-1].update({'replacementPainting':entry['override0'],'replacementSha256':hashlib.sha256((ROOT/entry['override0']).read_bytes()).hexdigest(),'replacementRegistration':'Replacement is first normalised to the original strip contact height, then uses the strip-wide scalar.'})
 output=ROOT/f'staged-{who}-base.png';canvas.save(output)
 (ROOT/f'{who}-registration.json').write_text(json.dumps({'cell':CELL,'anchor':ANCHOR,'height':HEIGHT,'frames':records},indent=2)+'\n')
 return output

if __name__=='__main__':
 import sys
 who=sys.argv[1];spec=json.loads((ROOT/who/'selection.json').read_text())
 if 'rows' in spec:spec={r['direction']:{'file':r['file'],'order':r['phaseOrder'],'crops':r['crops']} for r in spec['rows']}
 path=assemble(who,spec);print(path)
