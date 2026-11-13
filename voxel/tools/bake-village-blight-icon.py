#!/usr/bin/env python3
"""Pack generated cursed-spores art; crop/resize only, no painted edits."""
from pathlib import Path
import hashlib
import json

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "village-blight"
source = OUT / "source.png"
image = Image.open(source).convert("RGBA")
bounds = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
if bounds is None:
    raise ValueError("The generated source has no visible pixels")
art = image.crop(bounds)
art.thumbnail((116, 116), Image.Resampling.LANCZOS)
tile = Image.new("RGBA", (128, 128))
tile.alpha_composite(art, ((128 - art.width) // 2, (128 - art.height) // 2))
target = OUT / "cursed-spores.webp"
tile.save(target, "WEBP", lossless=True, method=6, exact=True)
with Image.open(target) as packed:
    assert packed.size == (128, 128) and packed.mode == "RGBA"
    assert packed.getpixel((0, 0))[3] == 0

preview = Image.new("RGB", (576, 222), "#21182c")
draw = ImageDraw.Draw(preview)
draw.text((16, 14), "CURSED SPORES / native and menu sizes", fill="#f7e4c4")
for x, pixels in [(20, 128), (190, 64), (320, 32), (440, 24)]:
    view = tile.resize((pixels, pixels), Image.Resampling.LANCZOS)
    preview.paste(view, (x, 52 + (128 - pixels) // 2), view)
    draw.text((x, 194), f"{pixels}px", fill="#d4b894")
preview.save(OUT / "contact-preview.jpg", quality=92)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

manifest = {
    "id": "cursed-spores",
    "generator": "image_gen",
    "original": "/workspace/generated_images/exec-74056ab2-2300-45e2-9fa5-19d68163c560.png",
    "source": {"path": "source.png", "size": list(image.size), "sha256": digest(source)},
    "runtime": {"path": target.name, "size": [128, 128], "inset": 6,
                "bytes": target.stat().st_size, "sha256": digest(target)},
    "sourceCrop": list(bounds),
    "processing": "Alpha-bound crop, proportional Lanczos fit and transparent padding only.",
    "prompt": "PROMPT.md",
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"cursed-spores: 128px RGBA, {target.stat().st_size:,} bytes")
