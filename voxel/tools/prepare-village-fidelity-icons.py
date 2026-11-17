#!/usr/bin/env python3
"""Pack generated original illustrations into consistent runtime cells.

Isolate connected props from neighbouring fragments, crop transparent margins,
and resize with aspect preserved. The source painting stays unchanged in the
concepts folder; rerun after regenerating it.
"""
from pathlib import Path
import argparse, hashlib, json
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/village-fidelity-concepts/icons-source.png'
# Generator spacing is measured rather than assumed to be an exact square grid.
CELLS = {
    'journal': (0, 0, 415, 386), 'moth': (415, 0, 838, 386), 'map': (838, 0, 1280, 386),
    'people': (0, 386, 420, 793), 'satchel': (420, 386, 838, 793), 'workshop': (838, 386, 1280, 793),
    'build': (0, 793, 449, 1280), 'lantern': (449, 793, 850, 1280), 'leaf': (850, 793, 1280, 1280),
}

def isolate(tile):
    """Drop disconnected fragments from neighbouring cells, not painted detail."""
    width, height = tile.size
    alpha = tile.getchannel('A')
    pixels = alpha.tobytes(); seen = bytearray(width * height); largest = []
    for start, value in enumerate(pixels):
        if value < 24 or seen[start]: continue
        seen[start] = 1; queue = [start]; cursor = 0
        while cursor < len(queue):
            at = queue[cursor]; cursor += 1
            x, y = at % width, at // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if not (0 <= nx < width and 0 <= ny < height): continue
                nxt = ny * width + nx
                if not seen[nxt] and pixels[nxt] >= 24:
                    seen[nxt] = 1; queue.append(nxt)
        if len(queue) > len(largest): largest = queue
    mask = bytearray(width * height)
    for at in largest: mask[at] = 255
    # Keep the original anti-aliased painted edge, with no new opaque pixels.
    connected = Image.frombytes('L', tile.size, bytes(mask)).filter(ImageFilter.MaxFilter(5))
    tile.putalpha(ImageChops.multiply(alpha, connected))
    return tile

def prepare(source=SOURCE, cells=CELLS, columns=3, filename='icons.webp'):
    original = Image.open(source).convert('RGBA')
    assert original.width == original.height
    atlas = Image.new('RGBA', (columns * 256, columns * 256))
    records = []
    for index, (name, rect) in enumerate(cells.items()):
        box = tuple(round(v * original.width / 1280) for v in rect)
        tile = isolate(original.crop(box))
        # Ignore near-transparent generation dust when measuring the prop.
        bounds = tile.getchannel('A').point(lambda a: 255 if a >= 48 else 0).getbbox()
        assert bounds, name
        tile = tile.crop(bounds)
        tile.thumbnail((222, 222), Image.Resampling.LANCZOS)
        x, y = index % columns * 256, index // columns * 256
        atlas.alpha_composite(tile, (x + (256 - tile.width) // 2, y + (256 - tile.height) // 2))
        records.append({'id': name, 'source_rect': box, 'cell': [x, y, 256, 256], 'painted_size': list(tile.size)})
    target = ROOT / 'assets/village-fidelity' / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(target, 'WEBP', quality=90, method=6, exact=True)
    meta = {'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'runtime_sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'size': list(atlas.size), 'bytes': target.stat().st_size, 'processing': 'Connected-illustration isolation, transparent-margin crop, aspect-preserving Lanczos resize and atlas packing; no repainting.', 'icons': records}
    (target.parent / (target.stem + '-receipt.json')).write_text(json.dumps(meta, indent=2) + '\n')
    print(json.dumps({'runtime': str(target), 'bytes': meta['bytes'], 'icons': len(records)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--source', type=Path, default=SOURCE)
    prepare(parser.parse_args().source)
    dialogue = ROOT / 'assets/village-fidelity-concepts/dialogue-source.png'
    if dialogue.exists():
        cells = {'chat': (0, 0, 640, 640), 'compass': (640, 0, 1280, 640), 'bond': (0, 640, 640, 1280), 'back': (640, 640, 1280, 1280)}
        prepare(dialogue, cells, columns=2, filename='dialogue.webp')
