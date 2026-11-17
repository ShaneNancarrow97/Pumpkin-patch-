"""Normalise the four voxel-only costumes. Run from any working directory.

Only packing, alpha cleanup and anchor/scale normalisation happen here. The
source images keep the approved artwork. A character gets one shared scale
across all nine frames; walking never stretches a frame to the idle height.
"""
from pathlib import Path
import json
import statistics
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/expansion/premium"
OUT = ROOT / "assets/costume-expansion"
OUT.mkdir(parents=True, exist_ok=True)
ROWS, PAD = 320, 4
SOURCES = {
    # The couple sheet's row gaps differ; uniform thirds would cut off shoes.
    "shane-chucky": ("chucky-tiffany.png", [0, 280, 520, 768], [[0, 357], [356, 683], [682, 1024]]),
    "natalie-tiffany": ("chucky-tiffany.png", [768, 1048, 1288, 1536], [[0, 365], [362, 686], [684, 1024]]),
    "natalie-freddy": ("natalie-freddy.png", [0, 357, 713, 1070], [[0, 490], [490, 980], [980, 1470]]),
    "shane-jason": ("shane-jason.png", [0, 357, 713, 1070], [[0, 490], [490, 980], [980, 1470]]),
}


def clean(tile):
    """Discard almost transparent source noise without changing the drawing."""
    rgba = np.array(tile)
    rgba[rgba[:, :, 3] < 12, 3] = 0
    # Source alpha can contain detached single-pixel specks in the empty gaps.
    occupied, seen = rgba[:, :, 3] > 0, np.zeros(rgba.shape[:2], dtype=bool)
    for y, x in zip(*np.nonzero(occupied)):
        if seen[y, x]: continue
        stack, component = [(y, x)], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop(); component.append((cy, cx))
            for ny, nx in [(cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)]:
                if 0 <= ny < occupied.shape[0] and 0 <= nx < occupied.shape[1] and occupied[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        if len(component) < 20:
            for cy, cx in component: rgba[cy, cx, 3] = 0
    return Image.fromarray(rgba, "RGBA")


def torso_anchor(tile, box):
    """Find the centre of the torso, unaffected by a reaching hand or foot."""
    a = np.array(tile.getchannel("A"))
    top, bottom = box[1], box[3]
    centres = []
    for y in range(round(top + (bottom-top) * .28), round(top + (bottom-top) * .57)):
        xs = np.where(a[y] > 128)[0]
        if len(xs): centres.append(float(np.median(xs)))
    return statistics.median(centres)


def bleed(tile):
    """Extend edge RGB into clear pixels to keep bilinear edges free of black."""
    rgba = np.array(tile)
    rgb = rgba[:, :, :3].astype(np.float32)
    known = rgba[:, :, 3] > 0
    for _ in range(PAD):
        total, count = np.zeros_like(rgb), np.zeros_like(known, dtype=np.float32)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            mask = np.roll(known, (dy, dx), (0, 1))
            shifted = np.roll(rgb, (dy, dx), (0, 1))
            if dy < 0: mask[-1] = False
            if dy > 0: mask[0] = False
            if dx < 0: mask[:, -1] = False
            if dx > 0: mask[:, 0] = False
            total += shifted * mask[:, :, None]
            count += mask
        fill = ~known & (count > 0)
        rgb[fill] = total[fill] / count[fill, None]
        known |= fill
    rgba[:, :, :3] = rgb.clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def bake(name, filename, column_cuts, row_bounds):
    source = Image.open(SOURCE / filename).convert("RGBA")
    tiles, boxes = [], []
    for i in range(9):
        x, y = i % 3, i // 3
        tile = clean(source.crop((column_cuts[x], row_bounds[y][0], column_cuts[x+1], row_bounds[y][1])))
        box = tile.getchannel("A").getbbox()
        assert box and box[2]-box[0] > 30 and box[3]-box[1] > 100, (name, i, "blank frame")
        solid_box = tile.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
        assert solid_box[0] > 0 and solid_box[1] > 0 and solid_box[2] < tile.width and solid_box[3] < tile.height, (name, i, "clipped source frame")
        tiles.append(tile); boxes.append(box)
    scale = ROWS / statistics.median([b[3]-b[1] for b in boxes[:3]])
    frames, images = [], []
    for i, (tile, box) in enumerate(zip(tiles, boxes)):
        anchor = torso_anchor(tile, box)
        # Premultiplied resize preserves semi-transparent outlines.
        tile = tile.convert("RGBa").resize((round(tile.width*scale), round(tile.height*scale)), Image.Resampling.LANCZOS).convert("RGBA")
        tile = clean(tile)
        b = tile.getchannel("A").getbbox()
        tile = tile.crop((b[0]-PAD, b[1]-PAD, b[2]+PAD, b[3]+PAD))
        frames.append({"w": tile.width, "h": tile.height, "ax": round(anchor*scale-b[0]+PAD, 2), "ay": tile.height-PAD})
        images.append(bleed(tile))
    width, height = sum(im.width for im in images), max(im.height for im in images)
    atlas = Image.new("RGBA", (width, height)); x = 0
    for f, im in zip(frames, images):
        f["x"], f["y"] = x, 0
        atlas.paste(im, (x, 0)); x += im.width
    atlas.save(OUT / f"{name}.webp", lossless=True, method=6, exact=True)
    return {"w": width, "h": height, "rows": ROWS, "idle": frames[:3], "walk": frames[3:]}, {"source": filename, "sourceColumnCuts": column_cuts, "sourceRowBounds": row_bounds, "scale": round(scale, 8), "frameCount": 9, "idleFrames": 3, "walkFrames": 6}


metadata, provenance = {}, {}
for name, args in SOURCES.items():
    metadata[name], provenance[name] = bake(name, *args)
imports = "\n".join(f'import costume{i} from "../assets/costume-expansion/{name}.webp";' for i, name in enumerate(SOURCES))
urls = ", ".join(f'"{name}": costume{i}' for i, name in enumerate(SOURCES))
(ROOT / "src/costume-sprite-expansion.js").write_text('// Generated by voxel/tools/bake_costume_expansion.py. Do not edit.\n'+imports+'\nexport const COSTUME_URLS = {'+urls+'};\n')
(ROOT / "src/costume-sprite-meta.js").write_text('// Generated by voxel/tools/bake_costume_expansion.py. Do not edit.\nexport const COSTUME_SHEETS = '+json.dumps(metadata, separators=(",", ":"))+';\n')
(OUT / "provenance.json").write_text(json.dumps(provenance, indent=2)+'\n')
print("Baked four costumes, each with 3 idle and 6 walking frames.")
