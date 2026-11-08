from pathlib import Path
import json,statistics,hashlib,base64
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parent
spec=json.loads((P/'crops.json').read_text());directions=['front','frontRight','right','backRight','back','backLeft','left','frontLeft']
# Technical root measurement and uniform resampling only; no body part is drawn or posed here.
def root_x(tile,b):
 a=tile.getchannel('A');values=[]
 for y in range(round(b[1]+(b[3]-b[1])*.36),round(b[1]+(b[3]-b[1])*.52)):
  run=[];start=None
  row=a.crop((0,y,a.width,y+1)).tobytes()
  for x,v in enumerate(row):
   if v>=64 and start is None:start=x
   elif v<64 and start is not None:run.append((x-start,(x+start)/2));start=None
  if start is not None:run.append((len(row)-start,(len(row)+start)/2))
  if run:values.append(max(run)[1])
 return statistics.median(values)
height=max(f['bodyHeight'] for s in spec.values() for f in s['crops']);scale=220/height;canvas=Image.new('RGBA',(2048,2048));placements=[]
preview=Image.new('RGBA',(1024,1408));frames={}
for row,d in enumerate(directions):
 im=Image.open(P/spec[d]['file']).convert('RGBA');frames[d]=[]
 for col,f in enumerate(spec[d]['crops']):
  tile=im.crop(f['box']);b=f['alphaBounds'];ax=root_x(tile,b);ay=b[3];size=(round(tile.width*scale),round(tile.height*scale));small=tile.resize(size,Image.Resampling.LANCZOS);x=round(128-ax*scale);y=round(246-ay*scale);out=Image.new('RGBA',(256,256));out.alpha_composite(small,(x,y));bb=out.getchannel('A').point(lambda n:255 if n>=32 else 0).getbbox();assert bb and min(bb[:2])>1 and max(bb[2:])<255,(d,col,bb)
  canvas.alpha_composite(out,(col*256,row*256));placements.append({'direction':d,'phase':col,'source':spec[d]['file'],'sourceCell':f['box'],'sourceRoot':[ax,ay],'scale':scale,'offset':[x,y]})
  frame=Image.new('RGBA',(128,176));rs=144/220;thumb=out.resize((round(256*rs),round(256*rs)),Image.Resampling.LANCZOS);frame.alpha_composite(thumb,(round(64-128*rs),round(164-246*rs)));preview.alpha_composite(frame,(col*128,row*176));frames[d].append(frame)
canvas.save(P/'natalie-base-gait-source.png');preview.save(P/'preview-atlas.webp','WEBP',lossless=True,method=6)
for d in ['front','right','back','left']:
 gif=[]
 for frame in frames[d]:
  bg=Image.new('RGB',(256,352),'#281e34');bg.paste(frame.resize((256,352),Image.Resampling.NEAREST),(0,0),frame.resize((256,352),Image.Resampling.NEAREST));gif.append(bg)
 gif[0].save(P/f'{d}-review.gif',save_all=True,append_images=gif[1:],duration=100,loop=0)
contact=Image.new('RGB',(8*154,8*200),'#281e34');draw=ImageDraw.Draw(contact)
for row,d in enumerate(directions):
 for col,frame in enumerate(frames[d]):
  contact.paste(frame,(col*154+13,row*200+14),frame);draw.text((col*154+8,row*200),d+' '+str(col),fill='#efd8ba')
contact.save(P/'all-directions-review.jpg',quality=93)
leg=Image.new('RGB',(4*230,370),'#281e34');draw=ImageDraw.Draw(leg)
landmarks={0:{'contactHeel':[294,421],'trailingToe':[134,421],'leading':'far anatomical left','nearArm':'forward'},2:{'raisedBootToe':[260,367],'supportBootToe':[253,417],'swingKnee':[290,265],'swing':'near anatomical right'},4:{'contactHeel':[288,419],'trailingToe':[122,420],'leading':'near anatomical right','nearArm':'back'},6:{'raisedBootToe':[136,340],'supportBootToe':[278,419],'swing':'far anatomical left'}}
im=Image.open(P/'right-repair.png').convert('RGBA')
for i,phase in enumerate([0,2,4,6]):
 f=spec['right']['crops'][phase];tile=im.crop(f['box']);tile=tile.crop((0,220,tile.width,tile.height));tile.thumbnail((220,275));leg.paste(tile,(i*230+5,45),tile);draw.text((i*230+8,8),f'Phase {phase}',fill='#efd8ba');note=landmarks[phase];draw.text((i*230+8,280),'LEFT leads' if phase==0 else 'RIGHT leads' if phase==4 else 'Near knee swings' if phase==2 else 'Far knee swings',fill='#efd8ba')
leg.save(P/'right-leg-ownership-proof.jpg',quality=94)
(P/'packing.json').write_text(json.dumps({'technicalOnly':True,'uniformCharacterScale':scale,'sourceBodyMax':height,'outputCell':[256,256],'root':[128,246],'directionOrder':directions,'placements':placements},indent=2)+'\n')
measure={'method':'Manual visual estimates in per-cell source pixels, uncertainty approximately8px; annotated anatomical identities are visual judgments, not automated rig labels.','right':landmarks,'bodyHeightPhase0':spec['right']['crops'][0]['bodyHeight'],'bodyHeightPhase4':spec['right']['crops'][4]['bodyHeight'],'fullStrideEstimateWorld':round(((160*2*2.3/spec['right']['crops'][0]['bodyHeight'])+(166*2*2.3/spec['right']['crops'][4]['bodyHeight']))/2,3),'supportingWorldBodyHeight':2.3,'supportsExistingCycle':1.8}
(P/'foot-landmarks.json').write_text(json.dumps(measure,indent=2)+'\n')
data=base64.b64encode((P/'preview-atlas.webp').read_bytes()).decode();page='''<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#281e34;color:#efd8ba;font:16px system-ui;padding:20px}canvas{display:block;background:#281e34;width:256px;height:352px;image-rendering:pixelated}button,select,input{font:inherit;min-height:44px;margin:8px}</style><h1>Natalie gait review</h1><p>Artwork review at one uniform character scale. Phase0 left contact,4 right contact. Runtime ground-travel calibration remains separate.</p><select id="dir"></select><button id="play">Pause</button><input id="frame" type="range" min="0" max="7" value="0"><output id="label"></output><canvas width="128" height="176"></canvas><script>const dirs='''+json.dumps(directions)+''',image=new Image(),ctx=document.querySelector('canvas').getContext('2d'),select=document.getElementById('dir'),slider=document.getElementById('frame');image.src='data:image/webp;base64,'''+data+''';dirs.forEach((d,i)=>select.add(new Option(d,i)));let running=true,phase=0,last=0;document.getElementById('play').onclick=()=>{running=!running;document.getElementById('play').textContent=running?'Pause':'Play'};slider.oninput=()=>{running=false;phase=+slider.value;document.getElementById('play').textContent='Play'};function tick(now){if(last&&running)phase+=(now-last)/1000*10;last=now;const i=Math.floor(phase)%8;slider.value=i;document.getElementById('label').textContent='Phase '+i;ctx.clearRect(0,0,128,176);if(image.complete)ctx.drawImage(image,i*128,+select.value*176,128,176,0,0,128,176);requestAnimationFrame(tick)}requestAnimationFrame(tick)</script></html>''';(P/'preview.html').write_text(page)
print(json.dumps({'views':len(spec),'frames':len(placements),'uniformScale':scale,'fullStrideEstimateWorld':measure['fullStrideEstimateWorld']}))
