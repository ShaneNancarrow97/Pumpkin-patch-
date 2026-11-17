#!/usr/bin/env python3
"""Pack generated expansion paintings with one body scale, never synthesize poses."""
from pathlib import Path
import hashlib,json,statistics,importlib.util
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/mothlight-expansion-source'
OUT=ROOT/'assets/mothlight-expansion'
DIRECTIONS=['front','frontRight','right','backRight','back','backLeft','left','frontLeft']
POSES=['idle','left-contact','left-pass','right-contact','right-pass','gesture']
ICONS=['cave','lantern-amethyst','ember-garnet','hollow-opal','scarecrow-maze','granny-house','gemcraft','ward','commission','festival','companion','restoration']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def clean(image,cutoff=32):
    result=image.convert('RGBA');result.putalpha(result.getchannel('A').point(lambda a:0 if a<cutoff else a));return result

def trim_neighbour_fragments(image):
    # Two generated gestures cross a source cell edge. Remove only detached
    # edge fragments well away from the body, never an attached hand or boot.
    alpha=image.getchannel('A');pixels=alpha.load();seen=set();parts=[]
    for y in range(image.height):
        for x in range(image.width):
            if not pixels[x,y] or (x,y) in seen:continue
            pending=[(x,y)];seen.add((x,y));points=[]
            while pending:
                px,py=pending.pop();points.append((px,py))
                for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                    if 0<=nx<image.width and 0<=ny<image.height and (nx,ny) not in seen and pixels[nx,ny]:seen.add((nx,ny));pending.append((nx,ny))
            box=[min(x for x,y in points),min(y for x,y in points),max(x for x,y in points)+1,max(y for x,y in points)+1];parts.append((points,box))
    main=max(parts,key=lambda p:len(p[0]))[1];removed=[]
    for points,b in parts:
        edge=b[0]<3 or b[1]<3 or b[2]>image.width-3 or b[3]>image.height-3
        gap=max(main[0]-b[2],b[0]-main[2],main[1]-b[3],b[1]-main[3])
        if edge and len(points)<=256 and gap>=12:
            for x,y in points:pixels[x,y]=0
            removed.append({'pixels':len(points),'bounds':b})
    image.putalpha(alpha);return image,removed

def bake():
    OUT.mkdir(parents=True,exist_ok=True)
    spec=importlib.util.spec_from_file_location('directional_cleaner',ROOT/'tools/bake-directional-sprites.py');cleaner=importlib.util.module_from_spec(spec);spec.loader.exec_module(cleaner)
    source=Image.open(SOURCE/'granny-48.png').convert('RGBA');cells=[];removed_fragments=[]
    for row in range(8):
        for col in range(6):
            bounds=(round(col*source.width/6),round(row*source.height/8),round((col+1)*source.width/6),round((row+1)*source.height/8))
            tile,_=cleaner.clean_source_alpha(source.crop(bounds));tile,removed=trim_neighbour_fragments(tile);removed_fragments.append(removed);box=tile.getbbox()
            if not box:raise ValueError('An authored Granny pose is empty')
            # A median torso axis avoids centring a pose on her extended hand.
            alpha=tile.getchannel('A');axes=[]
            for y in range(round(box[1]+(box[3]-box[1])*.48),round(box[1]+(box[3]-box[1])*.76)):
                line=alpha.crop((0,y,tile.width,y+1)).getbbox()
                if line:axes.append((line[0]+line[2])/2)
            cells.append((tile,box,statistics.median(axes),list(bounds)))
    scale=min(144/max(b[3]-b[1] for _,b,_,_ in cells),92/max(max(axis-b[0],b[2]-axis) for _,b,axis,_ in cells))
    atlas=Image.new('RGBA',(1152,1408));records=[]
    for i,(tile,box,axis,bounds) in enumerate(cells):
        crop=tile.crop(box);size=(round(crop.width*scale),round(crop.height*scale));crop=crop.resize(size,Image.Resampling.LANCZOS)
        x=round(96-(axis-box[0])*scale);y=164-crop.height
        if x<2 or x+crop.width>190 or y<2:raise ValueError(f'Clipped pose {i}: {x},{y},{size}')
        frame=Image.new('RGBA',(192,176));frame.alpha_composite(crop,(x,y));atlas.alpha_composite(frame,((i%6)*192,(i//6)*176))
        records.append({'direction':DIRECTIONS[i//6],'pose':POSES[i%6],'sourceBox':bounds,'sourceAlphaBounds':list(box),'sourceTorsoAxis':axis,'targetAlphaBounds':list(frame.getbbox()),'anchor':[96,164],'removedNeighbourFragments':removed_fragments[i]})
    atlas.save(OUT/'granny-directions.webp',quality=92,method=6,exact=True)
    legacy=atlas.crop((0,0,1152,176));legacy.save(OUT/'granny.webp',quality=92,method=6,exact=True)
    preview=Image.new('RGB',atlas.size,'#30243b');preview.paste(atlas,(0,0),atlas);preview.save(OUT/'granny-preview.jpg',quality=93)
    body_rows=round(max(b[3]-b[1] for _,b,_,_ in cells)*scale)
    icon_source=Image.open(SOURCE/'icons-12.png').convert('RGBA');icons=Image.new('RGBA',(512,384));items=[]
    for i,ident in enumerate(ICONS):
        col,row=i%4,i//4;bounds=(round(col*icon_source.width/4),round(row*icon_source.height/3),round((col+1)*icon_source.width/4),round((row+1)*icon_source.height/3))
        tile=clean(icon_source.crop(bounds),24);box=tile.getbbox()
        if not box:raise ValueError('Empty icon '+ident)
        tile=tile.crop(box);tile.thumbnail((112,112),Image.Resampling.LANCZOS);cell=Image.new('RGBA',(128,128));cell.alpha_composite(tile,((128-tile.width)//2,(128-tile.height)//2));icons.alpha_composite(cell,(col*128,row*128));items.append({'id':ident,'column':col,'row':row,'sourceBox':list(bounds),'sourceAlphaBounds':list(box)})
    icons.save(OUT/'icons.webp',lossless=True,method=6)
    dishes_source=Image.open(SOURCE/'dishes-2.png').convert('RGBA');dishes=Image.new('RGBA',(512,256));dish_records=[]
    for i,ident in enumerate(['cinders-lantern-stew','grannys-bramble-pudding']):
        bounds=(round(i*dishes_source.width/2),0,round((i+1)*dishes_source.width/2),dishes_source.height)
        tile=clean(dishes_source.crop(bounds),24);box=tile.getbbox()
        if not box:raise ValueError('Empty dish '+ident)
        tile=tile.crop(box);tile.thumbnail((232,232),Image.Resampling.LANCZOS);dishes.alpha_composite(tile,(i*256+(256-tile.width)//2,(256-tile.height)//2));dish_records.append({'id':ident,'sourceBox':list(bounds),'sourceAlphaBounds':list(box)})
    dishes.save(OUT/'dishes.webp',quality=94,method=6,exact=True)
    ip=Image.new('RGB',(512,384),'#30243b');ip.paste(icons,(0,0),icons);ip.save(OUT/'icons-preview.jpg',quality=93)
    manifest={'generator':'OpenAI image generation; source paintings retained unchanged','baker':'tools/bake-mothlight-expansion-art.py','sources':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in SOURCE.glob('*.png')},'granny':{'authoredPoses':48,'directions':DIRECTIONS,'poses':POSES,'cell':{'w':192,'h':176,'ax':96,'ay':164},'rows':body_rows,'height':1.95,'sharedScale':scale,'mirrored':False,'interpolated':False,'frames':records,'runtimeBytes':(OUT/'granny.webp').stat().st_size+(OUT/'granny-directions.webp').stat().st_size},'icons':{'grid':[4,3],'cell':128,'items':items,'bytes':(OUT/'icons.webp').stat().st_size}}
    manifest['dishes']={'grid':[2,1],'cell':256,'items':dish_records,'bytes':(OUT/'dishes.webp').stat().st_size}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    meta='// Generated by tools/bake-mothlight-expansion-art.py. 48 authored poses; no mirrored frames.\nimport legacy from "../../assets/mothlight-expansion/granny.webp";\nimport directions from "../../assets/mothlight-expansion/granny-directions.webp";\n'
    meta+='const cell=Object.freeze({w:192,h:176,ax:96,ay:164});\nconst frames=Array.from({length:48},(_,i)=>({...cell,x:i%6*192,y:Math.floor(i/6)*176}));\n'
    meta+=f'export const GRANNY_SPRITE=Object.freeze({{url:legacy,w:1152,h:176,rows:{body_rows},height:1.95,frames:frames.slice(0,6),actions:{{idle:[0],walk:[1,2,3,4],wave:[5],talk:[0]}}}});\n'
    meta+=f'export const GRANNY_DIRECTIONAL_SPRITE=Object.freeze({{url:directions,w:1152,h:1408,rows:{body_rows},height:1.95,cell,frames,directions:{json.dumps(DIRECTIONS)},phases:["left-contact","left-pass","right-contact","right-pass"],locomotion:"walk",walk:Array.from({{length:8}},(_,r)=>[1,2,3,4].map(c=>r*6+c)),idle:Array.from({{length:8}},(_,r)=>[r*6])}});\n'
    (ROOT/'src/content/granny-sprite-meta.js').write_text(meta)
    (ROOT/'src/content/village-expansion-icon-meta.js').write_text('// Generated by tools/bake-mothlight-expansion-art.py.\nexport const EXPANSION_ICON_IDS=Object.freeze('+json.dumps(ICONS)+');\n')
    print(json.dumps({'grannyRuntimeBytes':manifest['granny']['runtimeBytes'],'iconBytes':manifest['icons']['bytes'],'sharedScale':scale}))

if __name__=='__main__':bake()
