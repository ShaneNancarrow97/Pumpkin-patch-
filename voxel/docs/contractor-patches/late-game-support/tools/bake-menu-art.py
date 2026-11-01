#!/usr/bin/env python3
"""Crop/normalize six generated illustrations, with no new painted pixels."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image
from scipy import ndimage

PACK = Path(__file__).resolve().parents[1]
SOURCE = PACK / 'art/source.png'
IDS = ['midnight-court-banquet', 'lanterns-in-the-mist', 'the-last-wagon',
       'contract-trophy-banquet-candelabrum', 'contract-trophy-moonlit-conservatory',
       'contract-trophy-clockwork-hayride-theatre']
rgba = np.array(Image.open(SOURCE).convert('RGBA'))
height, width = rgba.shape[:2]
labels, _ = ndimage.label(rgba[:, :, 3] > 64)
parts = []
for label, box in enumerate(ndimage.find_objects(labels), 1):
    area = int((labels[box] == label).sum())
    if area < 5000:
        continue
    y, x = box
    column = min(2, int((x.start + x.stop) / 2 / width * 3))
    row = min(1, int((y.start + y.stop) / 2 / height * 2))
    parts.append((row * 3 + column, label))
if len(parts) != 6 or sorted(i for i, _ in parts) != list(range(6)):
    raise ValueError('Review source alpha: expected one main illustration in each3×2cell')
_, nearest = ndimage.distance_transform_edt(labels == 0, return_indices=True)
nearest_label = labels[tuple(nearest)]
atlas = Image.new('RGBA', (576, 384))
cells = []
for index, label in sorted(parts):
    mask = ndimage.binary_dilation(labels == label, iterations=2) & (nearest_label == label)
    isolated = rgba.copy()
    isolated[:, :, 3] = np.where(mask, rgba[:, :, 3], 0)
    icon = Image.fromarray(isolated)
    source_bounds = icon.getbbox()
    icon = icon.crop(source_bounds)
    scale = min(176 / icon.width, 176 / icon.height)
    icon = icon.resize((round(icon.width * scale), round(icon.height * scale)), Image.Resampling.LANCZOS)
    cell = Image.new('RGBA', (192, 192))
    cell.alpha_composite(icon, ((192 - icon.width) // 2, (192 - icon.height) // 2))
    atlas.alpha_composite(cell, ((index % 3) * 192, (index // 3) * 192))
    cells.append({'id': IDS[index], 'index': index, 'column': index % 3, 'row': index // 3,
                  'sourceBounds': source_bounds, 'packedBounds': cell.getbbox(),
                  'rgbaSHA256': hashlib.sha256(cell.tobytes()).hexdigest()})
target = PACK / 'art/menu-icons.webp'
atlas.save(target, 'WEBP', quality=90, method=6, exact=True)
preview = Image.new('RGB', atlas.size, '#211a29')
preview.paste(atlas, mask=atlas.getchannel('A'))
preview.save(PACK / 'art/review.jpg', quality=95)
manifest = {'version': 1, 'status': 'contractor-reference-art', 'installedInGame': False,
            'columns': 3, 'rows': 2, 'cell': 192, 'width': 576, 'height': 384,
            'encodedBytes': target.stat().st_size,
            'encodedSHA256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'sourceSHA256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'icons': cells}
(PACK / 'art/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Packed6 authored illustrations: {target.stat().st_size:,}bytes,576×384')
