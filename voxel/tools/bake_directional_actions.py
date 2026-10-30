#!/usr/bin/env python3
"""Pack the reviewed whole-strip planting/watering art. No action is synthesised.

Only crop, alpha clean-up, aspect-preserving resizing and fixed-anchor packing
occur here. Each six-pose action uses one shared scale, measured against its
standing poses, so crouching is never stretched back into a standing person.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/plans/directional-cast/actions'
OUT = ROOT / 'assets/directional/actions'
OUT.mkdir(parents=True, exist_ok=True)
CELL = (256, 400)
ANCHOR = (128, 390)
CONFIG = {
    'shane': {
        'rows': 320,
        'feet': [389, 383, 382, 763, 762, 766, 1136, 1137, 1137, 1503, 1503, 1504],
        'hands': [(210, 1006), (581, 965), (901, 964), (278, 1334), (582, 1312), (827, 1370)],
    },
    'natalie': {
        'rows': 300,
        'feet': [409, 408, 406, 770, 772, 775, 1139, 1139, 1139, 1505, 1505, 1505],
        'hands': [(198, 1011), (590, 957), (909, 953), (280, 1336), (582, 1316), (800, 1363)],
    },
}


def figures(image):
    rgba = np.asarray(image)
    labels, _ = ndimage.label(rgba[:, :, 3] >= 96)
    sizes = np.bincount(labels.ravel())
    boxes = ndimage.find_objects(labels)
    found = []
    for component, area in enumerate(sizes[1:], 1):
        if area < 800:
            continue
        ys, xs = boxes[component - 1]
        found.append((component, (xs.start, ys.start, xs.stop, ys.stop)))
    if len(found) != 12:
        raise ValueError(f'Expected exactly twelve isolated character silhouettes, found {len(found)}')
    # All generated cells have almost the same foot baseline, even the crouch.
    # Bucket by the four observed foot bands; sort the three figures by x.
    rows = [[], [], [], []]
    for component, bounds in found:
        row = min(3, round((bounds[3] - 390) / 375))
        rows[row].append((component, bounds))
    if any(len(row) != 3 for row in rows):
        raise ValueError('Unexpected source layout: each row must contain three bodies')
    ordered = [item for row in rows for item in sorted(row, key=lambda item: item[1][0])]
    out = []
    for component, bounds in ordered:
        # Keep a two-pixel antialias fringe around the real character, removing
        # the faint alpha halo that imagegen put in otherwise empty space.
        mask = ndimage.binary_dilation(labels == component, iterations=2)
        clean = rgba.copy()
        clean[~mask, 3] = 0
        clean[clean[:, :, 3] < 24, 3] = 0
        x0, y0, x1, y1 = bounds
        bounds = (max(0, x0 - 2), max(0, y0 - 2), min(image.width, x1 + 2), min(image.height, y1 + 2))
        out.append((Image.fromarray(clean).crop(bounds), bounds))
    return out


for owner, config in CONFIG.items():
    source = Image.open(ART / f'{owner}-actions-source.png').convert('RGBA')
    bodies = figures(source)
    canvas = Image.new('RGBA', (CELL[0] * 3, CELL[1] * 4))
    annotations = Image.new('RGBA', canvas.size)
    draw = ImageDraw.Draw(annotations)
    frames, metrics = [], []
    scales = []
    for start in (0, 6):
        heights = [config['feet'][i] - bodies[i][1][1] for i in (start, start + 5)]
        scales.append(config['rows'] / float(np.mean(heights)))
    for index, (body, bounds) in enumerate(bodies):
        action = 'plant' if index < 6 else 'water'
        scale = scales[index // 6]
        width, height = round(body.width * scale), round(body.height * scale)
        if width > CELL[0] - 12 or height > CELL[1] - 12:
            raise ValueError(f'{owner}/{action}/{index}: sprite exceeds safe cell')
        body = body.resize((width, height), Image.Resampling.LANCZOS)
        x0, y0, _, _ = bounds
        # Anchor the feet, rather than the extended arms' bounding-box centre.
        original = np.asarray(source)
        foot_y = config['feet'][index]
        band = original[max(y0, foot_y - 13):foot_y + 1, bounds[0]:bounds[2], 3] >= 96
        xs = np.where(band)[1]
        foot_x = bounds[0] + (int(xs.min()) + int(xs.max())) / 2 if len(xs) else (bounds[0] + bounds[2]) / 2
        local_x = round(ANCHOR[0] - (foot_x - x0) * scale)
        local_y = round(ANCHOR[1] - (foot_y - y0) * scale)
        col, row = index % 3, index // 3
        if local_x < 4 or local_x + width > CELL[0] - 4 or local_y < 4 or local_y + height > CELL[1]:
            raise ValueError(f'{owner}/{action}/{index}: anchored art touches cell boundary')
        canvas.alpha_composite(body, (col * CELL[0] + local_x, row * CELL[1] + local_y))
        frame = {'x': col * CELL[0], 'y': row * CELL[1], 'w': CELL[0], 'h': CELL[1], 'ax': ANCHOR[0], 'ay': ANCHOR[1]}
        if action == 'water':
            hx, hy = config['hands'][index - 6]
            if source.getpixel((hx, hy))[3] < 96:
                raise ValueError(f'{owner}/water/{index - 6}: hand landmark is outside the body')
            hand = {'x': round(local_x + (hx - x0) * scale, 2), 'y': round(local_y + (hy - y0) * scale, 2)}
            frame['sockets'] = {'hand': hand}
            cx, cy = col * CELL[0] + hand['x'], row * CELL[1] + hand['y']
            draw.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), outline='#ff55cc', width=2)
        frames.append(frame)
        draw.line((col * CELL[0], row * CELL[1] + ANCHOR[1], (col + 1) * CELL[0], row * CELL[1] + ANCHOR[1]), fill='#85734a')
        draw.text((col * CELL[0] + 8, row * CELL[1] + 6), f'{action} {index % 6 + 1}', fill='#fff4db')
        alpha = np.asarray(body)[:, :, 3]
        ys, xs = np.where(alpha >= 96)
        metrics.append({'index': index, 'action': action, 'sourceBounds': list(bounds), 'sharedScale': scale, 'bodyHeight': int(ys.max() - ys.min() + 1), 'sourceFoot': {'x': foot_x, 'y': foot_y}, 'socket': frame.get('sockets'), 'rgbaSha256': hashlib.sha256(body.tobytes()).hexdigest()})
    name = f'{owner}-actions.webp'
    canvas.save(OUT / name, 'WEBP', quality=92, method=6, exact=True)
    page = {'file': name, 'width': canvas.width, 'height': canvas.height, 'bytes': (OUT / name).stat().st_size}
    meta = {'owner': owner, 'look': f'{owner}-base', 'rows': config['rows'], 'worldHeight': 2.3, 'pages': {f'{owner}-actions': page}, 'actions': {'plant': {'0': {'page': f'{owner}-actions', 'frames': frames[:6]}}, 'water': {'90': {'page': f'{owner}-actions', 'frames': frames[6:]}}}, 'coverage': 'Base costume only: front plant six poses and right-profile water six poses. Other angles/actions are not supplied.', 'scales': {'plant': scales[0], 'water': scales[1]}}
    (OUT / f'{owner}.json').write_text(json.dumps(meta, indent=2) + '\n')
    preview = Image.new('RGBA', canvas.size, '#28222e')
    preview.alpha_composite(canvas)
    preview.alpha_composite(annotations)
    preview.convert('RGB').save(ART / f'{owner}-actions-preview.jpg', quality=93)
    (ART / f'{owner}-measurements.json').write_text(json.dumps(metrics, indent=2) + '\n')
    gifs = []
    for start, action in [(0, 'plant'), (6, 'water')]:
        poses = []
        for frame in frames[start:start + 6]:
            crop = canvas.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
            bg = Image.new('RGBA', CELL, '#28222e')
            bg.alpha_composite(crop)
            poses.append(bg.convert('RGB'))
        poses[0].save(ART / f'{owner}-{action}.gif', save_all=True, append_images=poses[1:], duration=200, loop=0)
    print(json.dumps({'owner': owner, 'page': page, 'scales': scales, 'frames': len(frames)}))
