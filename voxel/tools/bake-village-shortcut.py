#!/usr/bin/env python3
"""Pack the generated Mothlight settlement icon; no sprite artwork is drawn."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/village-shortcut'
SOURCE = OUTPUT / 'source.png'

def main():
    source = Image.open(SOURCE).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: 0 if a < 24 else a))
    bounds = source.getbbox()
    if not bounds:
        raise ValueError('Generated village art is empty')
    icon = source.crop(bounds)
    icon.thumbnail((116, 116), Image.Resampling.LANCZOS)
    packed = Image.new('RGBA', (128, 128))
    packed.alpha_composite(icon, ((128-icon.width)//2, (128-icon.height)//2))
    packed.save(OUTPUT / 'village.webp', lossless=True, method=6)
    preview = Image.new('RGB', (420, 190), '#271e31')
    draw = ImageDraw.Draw(preview)
    preview.paste(packed, (16, 16), packed)
    for size, x in [(64, 180), (44, 280), (28, 358)]:
        tile = packed.resize((size,size), Image.Resampling.LANCZOS)
        preview.paste(tile, (x, 54), tile)
        draw.text((x, 132), str(size)+'px', fill='#f1dfc6')
    draw.text((21, 160), 'Mothlight Village', fill='#f1dfc6')
    preview.save(OUTPUT / 'contact-preview.jpg', quality=94, subsampling=0)
    manifest = {'generatedBy':'tools/bake-village-shortcut.py', 'source':'assets/village-shortcut/source.png',
                'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'sourceSize':list(source.size),
                'alphaBounds':list(bounds), 'runtimeSize':[128,128], 'artRenderSize':list(icon.size),
                'runtimeBytes':(OUTPUT/'village.webp').stat().st_size,
                'runtimeSha256':hashlib.sha256((OUTPUT/'village.webp').read_bytes()).hexdigest()}
    (OUTPUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Packed village shortcut:',manifest['runtimeBytes'],'bytes')

if __name__ == '__main__':
    main()
