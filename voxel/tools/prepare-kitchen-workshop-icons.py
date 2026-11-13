"""Pack generated kitchen artwork into twelve equal UI cells.

Pillow only extracts, crops and resizes the approved generated illustrations.
The source is kept intact. Connected alpha components separate overlapping
bounding rectangles (the tray's mitt and spice shelf) without cutting art.
Tool dependencies: Pillow, numpy and scipy; no runtime dependencies are added.
"""
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import find_objects, label

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/plans/kitchen-workshop/art/kitchen-workshop-source.png"
OUTPUT = ROOT / "assets/kitchen-workshop-icons.webp"
META = ROOT / "docs/plans/kitchen-workshop/art/icons.json"
IDS = [
    "hob", "oven", "pot", "pan", "tray", "spice",
    "garden-skillet", "harvest-broth", "spiced-roast",
    "moonfire-chicken", "haunted-pie", "pumpkin-spice-biscuits",
]

image = Image.open(SOURCE).convert("RGBA")
assert image.size == (1448, 1086), "Review alpha extraction for a new source"
rgba = np.asarray(image)
labels, _ = label(rgba[:, :, 3] > 4)
counts = np.bincount(labels.ravel())
slices = find_objects(labels)
components = {}
for component in np.argsort(counts[1:])[-12:] + 1:
    ys, xs = slices[component - 1]
    col = min(3, int(((xs.start + xs.stop) / 2) / (image.width / 4)))
    row = min(2, int(((ys.start + ys.stop) / 2) / (image.height / 3)))
    index = row * 4 + col
    assert index not in components, "Illustrations crossed the approved grid"
    components[index] = (int(component), (xs.start, ys.start, xs.stop, ys.stop))
assert sorted(components) == list(range(12)), "Expected twelve large illustrations"

cell, content = 192, 160
packed = Image.new("RGBA", (cell * 4, cell * 3))
cells = []
for index, name in enumerate(IDS):
    component, alpha_bounds = components[index]
    # Include nearby soft antialiasing around this component, while excluding
    # its neighbour. A faint alpha bridge in the generator must not join icons.
    mask = Image.fromarray(np.where(labels == component, 255, 0).astype(np.uint8))
    mask = mask.filter(ImageFilter.MaxFilter(7))
    tile = image.copy()
    tile.putalpha(Image.fromarray(np.minimum(np.asarray(mask), rgba[:, :, 3])))
    crop = tile.getbbox()
    assert crop, name
    tile = tile.crop(crop)
    tile.thumbnail((content, content), Image.Resampling.LANCZOS)
    col, row = index % 4, index // 4
    x = col * cell + (cell - tile.width) // 2
    y = row * cell + (cell - tile.height) // 2
    packed.alpha_composite(tile, (x, y))
    cells.append({
        "index": index, "id": name, "sourceComponent": component,
        "sourceAlphaBounds": list(alpha_bounds), "sourceCrop": list(crop),
        "packedSize": list(tile.size),
    })

packed.save(OUTPUT, "WEBP", quality=88, method=6, exact=True, alpha_quality=100)
assert OUTPUT.stat().st_size < 250_000, "Atlas exceeded its shipping budget"
META.write_text(json.dumps({
    "source": SOURCE.name, "sourceSha256": sha256(SOURCE.read_bytes()).hexdigest(),
    "runtime": str(OUTPUT.relative_to(ROOT)),
    "runtimeSha256": sha256(OUTPUT.read_bytes()).hexdigest(),
    "width": packed.width, "height": packed.height, "bytes": OUTPUT.stat().st_size,
    "columns": 4, "rows": 3, "cellSize": cell,
    "minimumTransparentGutter": (cell - content) // 2,
    "cssDisplaySize": 52, "cells": cells,
}, indent=2) + "\n")
print(f"{OUTPUT.relative_to(ROOT)}: {packed.width}×{packed.height}, {OUTPUT.stat().st_size:,} bytes")
