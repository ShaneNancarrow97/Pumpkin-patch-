#!/usr/bin/env python3
"""Technically resize/encode the generated fine grass tile; no painting."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'assets/terrain-concepts/v2/grass-source.png'
out = ROOT / 'assets/terrain/grass-tile.webp'
texture = Image.open(source).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
texture.save(out, quality=94, method=6)
tile = Image.open(out).convert('RGB')
proof = Image.new('RGB', (1024, 1024))
for x in (0, 512):
    for y in (0, 512):
        proof.paste(tile, (x, y))
proof.save(ROOT / 'assets/terrain-concepts/v2/grass-repeat-proof.jpg', quality=94, subsampling=0)
print(f'Encoded fine grass tile: {out.stat().st_size:,} bytes')
