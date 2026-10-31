"""Normalise the generated cooking artwork into twelve equal UI cells.

The source remains intact under docs/plans/cooking/art. Pillow only crops and
resizes the generated artwork; it does not draw replacement illustrations.
"""
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/plans/cooking/art/cooking-menu-source.png"
OUTPUT = ROOT / "assets/cooking-menu-icons.webp"
META = ROOT / "docs/plans/cooking/art/icons.json"
IDS = ["truck", "cart", "pantry", "ghost-chef", "wedges", "soup",
       "toffee-apples", "pumpkin-jam", "ghost-cookies", "pumpkin-pie",
       "cocoa-brownies", "moonlight-tart"]
image = Image.open(SOURCE).convert("RGBA")
assert image.size == (1448, 1086), "Review crop guides for a new source image"
# The generator's equal-looking rows have unequal transparent gutters. These
# approved guides protect the first-row truck wheels and chef's lower tail.
xs, ys = [0, 389, 752, 1093, 1448], [0, 389, 718, 1086]
cell, content = 192, 160
packed = Image.new("RGBA", (cell * 4, cell * 3))
cells = []
for index, name in enumerate(IDS):
    col, row = index % 4, index // 4
    crop = (xs[col], ys[row], xs[col + 1], ys[row + 1])
    tile = image.crop(crop)
    bounds = tile.getchannel("A").point(lambda value: 255 if value > 32 else 0).getbbox()
    assert bounds, name
    tile = tile.crop(bounds)
    tile.thumbnail((content, content), Image.Resampling.LANCZOS)
    x = col * cell + (cell - tile.width) // 2
    y = row * cell + (cell - tile.height) // 2
    packed.alpha_composite(tile, (x, y))
    cells.append({"index": index, "id": name, "sourceCrop": crop,
                  "alphaBounds": bounds, "packedSize": list(tile.size)})
packed.save(OUTPUT, "WEBP", quality=88, method=6, exact=True, alpha_quality=100)
assert OUTPUT.stat().st_size < 250_000, "Atlas exceeded its shipping budget"
META.write_text(json.dumps({
    "source": SOURCE.name, "sourceSha256": sha256(SOURCE.read_bytes()).hexdigest(),
    "runtime": str(OUTPUT.relative_to(ROOT)),
    "runtimeSha256": sha256(OUTPUT.read_bytes()).hexdigest(),
    "width": packed.width, "height": packed.height,
    "bytes": OUTPUT.stat().st_size, "columns": 4, "rows": 3,
    "cellSize": cell, "minimumTransparentGutter": (cell - content) // 2,
    "cssDisplaySize": 52, "cells": cells,
}, indent=2) + "\n")
print(f"{OUTPUT.relative_to(ROOT)}: {packed.width}×{packed.height}, {OUTPUT.stat().st_size:,} bytes")
