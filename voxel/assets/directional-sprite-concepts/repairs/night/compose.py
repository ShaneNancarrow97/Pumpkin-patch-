#!/usr/bin/env python3
"""Pack approved whole generated frames; never redraw, mirror or warp a limb.

Front corrections have one scalar per source image. Other directions retain
their source paintings. SciPy identifies the isolated figures in repair strips.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects

HERE = Path(__file__).resolve().parent
DEST = HERE.parent.parent
CELL = (160, 192)
ANCHOR = (80, 180)
BODY = 144

def clean(image):
    image = image.convert('RGBA').copy()
    image.putalpha(image.getchannel('A').point(lambda a: 0 if a < 32 else a))
    return image

def body_box(image):
    return image.getchannel('A').point(lambda a: 255 if a >= 108 else 0).getbbox()

def root(image):
    x0, y0, x1, y1 = body_box(image)
    data = np.asarray(image.getchannel('A'))
    top, bottom = y0 + round((y1-y0)*.36), y0 + round((y1-y0)*.62)
    ys, xs = np.where(data[top:bottom] >= 108)
    return float(np.median(xs)), y1

def strip(name, count):
    image = clean(Image.open(HERE/name))
    labels, total = label(np.asarray(image.getchannel('A')) >= 108)
    sizes = np.bincount(labels.ravel())
    boxes = []
    for index, sl in enumerate(find_objects(labels), 1):
        if sizes[index] > 1500:
            boxes.append((int(sizes[index]), (sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)))
    boxes = sorted(sorted(boxes, reverse=True)[:count], key=lambda entry: entry[1][0])
    if len(boxes) != count:
        raise ValueError(f'{name}: expected {count} figures, found {len(boxes)}')
    cuts = [0] + [(boxes[i-1][1][2]+boxes[i][1][0])//2 for i in range(1,count)] + [image.width]
    frames = [image.crop((cuts[i],0,cuts[i+1],image.height)) for i in range(count)]
    height = max(body_box(frame)[3]-body_box(frame)[1] for frame in frames)
    return frames, BODY / height

def put(atlas, frame, scale, col, row):
    rx, ry = root(frame)
    sized = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.LANCZOS)
    x = col*CELL[0] + round(ANCHOR[0]-rx*scale)
    y = row*CELL[1] + round(ANCHOR[1]-ry*scale)
    atlas.alpha_composite(sized, (x,y))

CONFIG = {
    'baron': {'columns':[70,230,382,528,676,826,970,1117,1254], 'rows':[0,174,328,484,638,793,947,1100,1254]},
    'corvus': {'columns':[0,184,334,484,634,784,934,1084,1254], 'rows':[0,180,330,474,622,777,925,1073,1254]},
}
receipt = {'operation':'whole-frame crop, shared source scalar, root alignment; no redrawing/mirroring', 'cell':CELL, 'anchor':ANCHOR, 'characters':{}}
for name, config in CONFIG.items():
    original = clean(Image.open(HERE/(name+'-original.png')))
    columns, rows = config['columns'], config['rows']
    base = [[original.crop((columns[c],rows[r],columns[c+1],rows[r+1])) for c in range(8)] for r in range(8)]
    scale = BODY/max(body_box(f)[3]-body_box(f)[1] for row in base for f in row)
    atlas = Image.new('RGBA',(CELL[0]*8,CELL[1]*8))
    for r in range(1,8):
        for c in range(8):
            put(atlas,base[r][c],scale,c,r)
    front, front_scale = strip(name+'-front.png',8)
    if name == 'baron':
        pair, pair_scale = strip('baron-left-pass-swing.png',2)
        selection = [(front[i],front_scale) for i in range(6)] + [(pair[i],pair_scale) for i in range(2)]
        order = ['front:0','front:1','front:2','front:3','front:4','front:5','left-pass-swing:0','left-pass-swing:1']
    else:
        pair, pair_scale = strip('corvus-right-contact.png',2)
        # The detailed front strip was taller than the existing profile art.
        # Match the measured 134px mean stature without changing the foot root.
        front_scale *= 134 / BODY
        pair_scale *= 134 / BODY
        # The artist's strip crossed two passing poses and repeated its lead.
        # Reorder the actual painted poses, inserting the corrected contact.
        selection = [(front[i],front_scale) for i in [0,1,6,5]] + [(pair[0],pair_scale)] + [(front[i],front_scale) for i in [7,2,3]]
        order = ['front:0','front:1','front:6','front:5','right-contact:0','front:7','front:2','front:3']
    for c,(frame,scalar) in enumerate(selection):
        put(atlas,frame,scalar,c,0)
    target=DEST/(name+'.png')
    atlas.save(target)
    receipt['characters'][name]={'frontFrameOrder':order,'baseScale':scale,'frontStripScale':front_scale,'pairScale':pair_scale,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    proof=Image.new('RGB',(160*8,192),'#30233f')
    proof.paste(atlas.crop((0,0,1280,192)),(0,0),atlas.crop((0,0,1280,192)))
    proof.save(HERE/(name+'-front-proof.png'))
(HERE/'composition.json').write_text(json.dumps(receipt,indent=2)+'\n')
