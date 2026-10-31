#!/usr/bin/env python3
"""Normalize/pack the twelve authored icons; never paint or synthesize art."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/plans/hayride-upgrade-icons'
SOURCE = DOC / 'source.png'
IDS = ['tier1', 'tier2', 'tier3', 'fleet', 'dispatch', 'route1', 'route2',
       'turning-scarecrows', 'spider-drop', 'bride-procession', 'spectral-burst', 'bus-breakout']
source = Image.open(SOURCE).convert('RGBA')
rgba = np.asarray(source)
labels, _ = ndimage.label(rgba[:, :, 3] > 64)
objects = ndimage.find_objects(labels)
components = []
for label, box in enumerate(objects, 1):
    area = int((labels[box] == label).sum())
    if area > 5000:
        y, x = box
        column = min(3, int((x.start + x.stop) / 2 / source.width * 4))
        row = min(2, int((y.start + y.stop) / 2 / source.height * 3))
        components.append((row * 4 + column, label, box))
if len(components) != 12 or sorted(i for i, _, _ in components) != list(range(12)):
    raise ValueError('Source no longer contains exactly one main icon per atlas cell; review before repacking')

# The source silhouettes slightly overlap in their rectangular bounding boxes.
# Separate by actual connected alpha, not by slicing through the tractor wheels.
_, nearest = ndimage.distance_transform_edt(labels == 0, return_indices=True)
nearest_label = labels[tuple(nearest)]
atlas = Image.new('RGBA', (768, 576))
measurements = []
for index, label, _ in sorted(components):
    core = labels == label
    fringe = ndimage.binary_dilation(core, iterations=2) & (nearest_label == label)
    pixels = rgba.copy()
    pixels[:, :, 3] = np.where(fringe, pixels[:, :, 3], 0)
    icon = Image.fromarray(pixels)
    bounds = icon.getbbox()
    icon = icon.crop(bounds)
    scale = min(176 / icon.width, 176 / icon.height)
    icon = icon.resize((round(icon.width * scale), round(icon.height * scale)), Image.Resampling.LANCZOS)
    cell = Image.new('RGBA', (192, 192))
    cell.alpha_composite(icon, ((192 - icon.width) // 2, (192 - icon.height) // 2))
    atlas.alpha_composite(cell, (index % 4 * 192, index // 4 * 192))
    measurements.append({'id': IDS[index], 'index': index, 'sourceBounds': bounds,
                         'packedBounds': cell.getbbox(), 'scale': scale,
                         'rgbaSHA256': hashlib.sha256(cell.tobytes()).hexdigest()})
if len({m['rgbaSHA256'] for m in measurements}) != 12:
    raise ValueError('An icon was duplicated')
target = ROOT / 'assets/hayride-upgrade-icons.webp'
atlas.save(target, 'WEBP', quality=88, method=6, exact=True)
preview = Image.new('RGB', atlas.size, '#211a29')
preview.paste(atlas, mask=atlas.getchannel('A'))
preview.save(DOC / 'review.jpg', quality=94)
(DOC / 'measurements.json').write_text(json.dumps({
    'sourceSHA256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'encodedSHA256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'encodedBytes': target.stat().st_size, 'width': 768, 'height': 576,
    'decodedRGBABytes': 768 * 576 * 4, 'icons': measurements,
}, indent=2) + '\n')
print(f'Packed12 distinct authored icons: {target.stat().st_size:,} bytes,768×576RGBA')
