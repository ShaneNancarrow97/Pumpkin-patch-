#!/usr/bin/env python3
"""Extract reviewed, genuinely drawn Natalie frames; never synthesize a bearing.

Runtime pages use a common foot anchor and standing-body density. Idle sources
are neutral turntable poses, so those are normalized to 300px each. Each entire
walking strip uses ONE scale, retaining its natural silhouette and foot bob.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/plans/directional-cast/natalie'
OUT = ROOT / 'assets/directional/natalie'
OUT.mkdir(parents=True, exist_ok=True)
SLOT = (256, 400)
FOOT = 390
BODY = 300
FULL_PHASES = ['contact-left', 'down-left', 'passing-left', 'up-left',
               'contact-right', 'down-right', 'passing-right', 'up-right']
REDUCED_PHASES = ['contact-left', 'passing-left', 'contact-right', 'passing-right']


def isolated(im):
    """Discard generated low-alpha backdrop, not any painted body details."""
    f = im.convert('RGBA')
    alpha = np.array(f.getchannel('A'))
    labels, _ = ndimage.label(alpha >= 96)
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    if not len(areas[1:]) or areas.max() < 100:
        raise ValueError('No isolated figure in source cell')
    keep = ndimage.binary_dilation(labels == areas.argmax(), iterations=1)
    alpha[~keep] = 0
    alpha[alpha < 24] = 0
    f.putalpha(Image.fromarray(alpha))
    return f.crop(f.getbbox())


def source_cells(path, cols, rows):
    im = Image.open(path)
    return [isolated(im.crop((round(i % cols * im.width / cols),
                              round(i // cols * im.height / rows),
                              round((i % cols + 1) * im.width / cols),
                              round((i // cols + 1) * im.height / rows))))
            for i in range(cols * rows)]


def pack(name, frames, cols, scales):
    atlas = Image.new('RGBA', (cols * SLOT[0],
                             ((len(frames) + cols - 1) // cols) * SLOT[1]))
    rects, metrics, normalized = [], [], []
    for i, (frame, scale) in enumerate(zip(frames, scales)):
        width, height = round(frame.width * scale), round(frame.height * scale)
        if width > SLOT[0] - 8 or height > FOOT - 8:
            raise ValueError(f'Clipped source {name}:{i}: {width}x{height}')
        frame = frame.resize((width, height), Image.Resampling.LANCZOS)
        x, y = i % cols * SLOT[0], i // cols * SLOT[1]
        atlas.alpha_composite(frame, (x + (SLOT[0] - width) // 2,
                                      y + FOOT - height))
        rects.append({'x': x, 'y': y, 'w': SLOT[0], 'h': SLOT[1],
                      'ax': 128, 'ay': FOOT})
        mask = np.array(frame.getchannel('A')) >= 96
        ys, xs = np.where(mask)
        head = np.where(mask[:max(1, round(height * .2))])[1]
        metrics.append({'frame': i, 'height': int(ys.max() - ys.min() + 1),
                        'width': int(xs.max() - xs.min() + 1),
                        'headBandWidth': int(head.max() - head.min() + 1),
                        'headBandWidthRatio': round((head.max() - head.min() + 1) / height, 4),
                        'scale': round(scale, 6),
                        'sha256': hashlib.sha256(frame.tobytes()).hexdigest()})
        normalized.append(atlas.crop((x, y, x + SLOT[0], y + SLOT[1])))
    path = OUT / f'{name}.webp'
    atlas.save(path, 'WEBP', quality=91, method=6, exact=True)
    return {'file': path.name, 'width': atlas.width, 'height': atlas.height,
            'bytes': path.stat().st_size}, rects, metrics, normalized


meta = {'owner': 'natalie', 'look': 'natalie-base', 'rows': BODY,
        'worldHeight': 2.3,
        'angleConvention': '0 front;90 screen-right;180 back;270 screen-left; nominal painted views',
        'pages': {}, 'actions': {},
        'coverage': {'costume': 'base only', 'idle': [], 'walk': [], 'reducedWalk': []},
        'metrics': {}}

source = Image.open(ART / 'idle-24-source.png')
bounds = json.loads((ART / 'idle-source-cells.json').read_text())
frames = [isolated(source.crop((b['x0'], b['y0'], b['x1'], b['y1'])))
          for b in bounds]
page, rects, metrics, cells = pack('base-idle', frames, 6,
                                  [BODY / f.height for f in frames])
meta['pages']['idle'] = page
meta['actions']['idle'] = {str(i * 15): {'page': 'idle', 'frames': [r]}
                            for i, r in enumerate(rects)}
meta['coverage']['idle'] = list(range(0, 360, 15))
meta['metrics']['idle'] = metrics

# Only explicitly reviewed sources enter the game. Candidates are retained as
# documents, rather than discovered by a glob and accidentally shipped.
reviewed = json.loads((ART / 'reviewed-walks.json').read_text())
walk_gifs = []
for item in reviewed:
    angle, file = item['angle'], item['file']
    frames = source_cells(ART / file, item['columns'], item['rows'])
    indices = item.get('indices', list(range(len(frames))))
    frames = [frames[i] for i in indices]
    count = len(frames)
    if count not in (4, 8):
        raise ValueError(f'Invalid reviewed stride count {angle}: {count}')
    scale = BODY / float(np.median([f.height for f in frames]))
    key = f'walk-{angle:03d}'
    page, rects, metrics, cells = pack(key, frames, 4, [scale] * count)
    meta['pages'][key] = page
    clip = {'page': key, 'frames': rects, 'fps': 8 if count == 8 else 4,
            'phases': FULL_PHASES if count == 8 else REDUCED_PHASES}
    if count == 4:
        clip['mode'] = 'reduced'
        meta['coverage']['reducedWalk'].append(angle)
    meta['actions'].setdefault('walk', {})[str(angle)] = clip
    meta['coverage']['walk'].append(angle)
    meta['metrics'][key] = metrics
    previews = []
    for c in cells:
        background = Image.new('RGBA', SLOT, '#28232e')
        background.alpha_composite(c)
        previews.append(background.convert('RGB'))
    previews[0].save(ART / f'{key}.gif', save_all=True,
                     append_images=previews[1:], duration=125 if count == 8 else 200,
                     loop=0, disposal=2)

(OUT / 'base.json').write_text(json.dumps(meta, indent=2) + '\n')
(ART / 'metrics.json').write_text(json.dumps(meta['metrics'], indent=2) + '\n')
print(json.dumps({'coverage': meta['coverage'], 'pages': len(meta['pages']),
                  'bytes': sum(p['bytes'] for p in meta['pages'].values()),
                  'idleHeights': [m['height'] for m in meta['metrics']['idle']]}))
