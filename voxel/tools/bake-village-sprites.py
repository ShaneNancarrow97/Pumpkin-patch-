#!/usr/bin/env python3
"""Pack the image-generated Mothlight cast without redrawing their painted art.

Run from any directory. Pillow is the only dependency. The checked-in source
PNGs make a normal bake reproducible; --import-generated copies the original
session outputs into the concept directory before baking.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, __version__ as PILLOW_VERSION


ROOT = Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / "assets/village-cast-concepts"
RUNTIME = ROOT / "assets/village"
META = ROOT / "src/content/village-sprite-meta.js"
CELL = (256, 320)
ANCHOR = (128, 300)
BODY_HEIGHT = 256
ALPHA_CUTOFF = 32
BODY_CUTOFF = 108  # Matches the actor's .42 alpha test after integer rounding.
POSES = ("idle", "left-contact", "left-pass", "right-contact", "right-pass", "wave")
SOURCES = {
    "green": ("green-raw.png", "exec-5d2ff10b-31d0-4dd5-8d62-628420521ad8.png"),
    "copse": ("copse-raw.png", "exec-4dafbc14-c256-47ff-ac7f-195e055158c3.png"),
    "night": ("night-raw.png", "village-night-raw.png"),
    "approved-cast": ("approved-cast.png", "exec-e195d883-c557-480c-8beb-dec25c39a00e.png"),
}
# The horizontal anchors follow each pose's drawn body axis, rather than the
# changing width of a raised hand or cloak. All coordinates are source pixels.
CAST = (
    ("elowen", "green", 0, [172, 465, 759, 1054, 1351, 1636]),
    ("rowan", "green", 1, [166, 459, 753, 1047, 1342, 1633]),
    ("vesper", "green", 2, [166, 460, 754, 1050, 1345, 1640]),
    ("mabel", "copse", 0, [174, 467, 761, 1057, 1352, 1644]),
    ("tansy", "copse", 1, [169, 460, 754, 1047, 1341, 1635]),
    ("opal", "copse", 2, [171, 465, 759, 1056, 1348, 1641]),
    ("cinder", "night", 0, [179, 470, 761, 1050, 1344, 1642]),
    ("corvus", "night", 1, [173, 463, 756, 1051, 1341, 1637]),
    ("baron", "night", 2, [166, 457, 751, 1047, 1338, 1631]),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def bounds(image: Image.Image, cutoff: int = 1) -> list[int]:
    box = image.getchannel("A").point(lambda value: 255 if value >= cutoff else 0).getbbox()
    if box is None:
        raise ValueError("An authored frame has no visible pixels")
    return list(box)


def clean_export_alpha(frame: Image.Image) -> tuple[Image.Image, list[dict]]:
    """Drop near-invisible export noise and tiny fragments on a cell's edge.

    A small isolated steam curl, candle flame or finger is retained. Only a
    component under 64 pixels, touching the bottom four rows and separated
    vertically from the main figure by at least eight pixels, is a row leak.
    """
    frame = frame.copy()
    alpha = frame.getchannel("A").point(lambda value: 0 if value < ALPHA_CUTOFF else value)
    pixels = alpha.load()
    visited = set()
    components = []
    for y in range(frame.height):
        for x in range(frame.width):
            if not pixels[x, y] or (x, y) in visited:
                continue
            pending, points = [(x, y)], []
            visited.add((x, y))
            while pending:
                px, py = pending.pop()
                points.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < frame.width and 0 <= ny < frame.height and (nx, ny) not in visited and pixels[nx, ny]:
                        visited.add((nx, ny))
                        pending.append((nx, ny))
            box = [min(px for px, py in points), min(py for px, py in points), max(px for px, py in points) + 1, max(py for px, py in points) + 1]
            components.append((points, box))
    main = max(components, key=lambda component: len(component[0]))[1]
    removed = []
    for points, box in components:
        if len(points) < 64 and box[3] >= frame.height - 4 and box[1] >= main[3] + 8:
            for x, y in points:
                pixels[x, y] = 0
            removed.append({"pixels": len(points), "bounds": box})
    frame.putalpha(alpha)
    return frame, removed


def prepare_sources(source_dir: Path | None) -> dict:
    CONCEPTS.mkdir(parents=True, exist_ok=True)
    sources = {}
    for key, (name, generated) in SOURCES.items():
        target = CONCEPTS / name
        if source_dir is not None:
            shutil.copyfile(source_dir / generated, target)
        if not target.is_file():
            raise FileNotFoundError(f"Missing {target}; import the original sources with --import-generated")
        with Image.open(target) as image:
            sources[key] = {"file": relative(target), "generatedFile": generated, "sha256": sha256(target), "width": image.width, "height": image.height, "mode": image.mode}
    return sources


def bake(source_dir: Path | None) -> None:
    sources = prepare_sources(source_dir)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "generator": "OpenAI image generation; original paintings supplied as style references",
        "baker": {"file": relative(Path(__file__)), "pillowVersion": PILLOW_VERSION, "alphaCutoff": ALPHA_CUTOFF, "bodyAlphaCutoff": BODY_CUTOFF, "resize": "Lanczos; one common scalar per character", "webp": {"quality": 90, "method": 6, "exact": True}},
        "cell": {"width": CELL[0], "height": CELL[1], "anchor": list(ANCHOR), "targetVisibleHeight": BODY_HEIGHT},
        "sources": sources,
        "characters": {},
    }
    preview = Image.new("RGB", (CELL[0] * 6, CELL[1] * len(CAST) + 34), "#30233f")
    labels = ImageDraw.Draw(preview)
    for col, pose in enumerate(POSES):
        labels.text((col * CELL[0] + 12, 10), pose, fill="#ebd6a5")
    metadata = []
    for index, (character, source, row, axes) in enumerate(CAST):
        with Image.open(ROOT / sources[source]["file"]) as original:
            original = original.convert("RGBA")
            prepared, details = [], []
            for col, pose in enumerate(POSES):
                grid = [round(col * original.width / 6), round(row * original.height / 3), round((col + 1) * original.width / 6), round((row + 1) * original.height / 3)]
                crop = grid.copy()
                # Vesper's hair extends three pixels over the generator's row
                # boundary. The previous figure ends more than ten pixels above.
                if character == "vesper":
                    crop[1] -= 7
                raw = original.crop(crop)
                clean, removed = clean_export_alpha(raw)
                visible = bounds(clean)
                prepared.append(clean)
                details.append({"pose": pose, "sourceGridBox": grid, "sourceCropBox": crop, "sourceAlphaBounds": bounds(raw, ALPHA_CUTOFF), "sourceCleanAlphaBounds": visible, "sourceBodyBounds": bounds(clean, BODY_CUTOFF), "sourceAnchor": [axes[col] - crop[0], visible[3]], "removedEdgeFragments": removed, "contactSide": "left" if col == 1 else "right" if col == 3 else None})
            max_height = max(frame["sourceCleanAlphaBounds"][3] - frame["sourceCleanAlphaBounds"][1] for frame in details)
            scale = BODY_HEIGHT / max_height
            atlas = Image.new("RGBA", (CELL[0] * 6, CELL[1]))
            for col, (frame, detail) in enumerate(zip(prepared, details)):
                # Work from one shared scalar; never stretch a
                # head or resize individual poses to fill their own bounds.
                size = (round(frame.width * scale), round(frame.height * scale))
                padded = Image.new("RGBA", (frame.width + 2, frame.height + 2))
                padded.alpha_composite(frame)
                source_box = (0, 0, size[0] / scale, size[1] / scale)
                resized = padded.resize(size, Image.Resampling.LANCZOS, box=source_box)
                x = round(ANCHOR[0] - detail["sourceAnchor"][0] * scale)
                y = round(ANCHOR[1] - detail["sourceAnchor"][1] * scale)
                cell = Image.new("RGBA", CELL)
                cell.alpha_composite(resized, (x, y))
                output_bounds = bounds(cell)
                body_bounds = bounds(cell, BODY_CUTOFF)
                if output_bounds[0] <= 0 or output_bounds[1] <= 0 or output_bounds[2] >= CELL[0] or output_bounds[3] >= CELL[1]:
                    raise ValueError(f"{character} {POSES[col]} reaches a packed cell edge")
                detail.update({"resizeDimensions": list(resized.size), "resizeSourceBox": list(source_box), "outputOffset": [x, y], "outputAlphaBounds": output_bounds, "outputBodyBounds": body_bounds, "contactFoot": [ANCHOR[0], ANCHOR[1]], "anchor": list(ANCHOR)})
                atlas.alpha_composite(cell, (col * CELL[0], 0))
                preview.paste(cell, (col * CELL[0], index * CELL[1] + 34), cell)
            output = RUNTIME / f"{character}.webp"
            atlas.save(output, "WEBP", quality=90, method=6, exact=True)
            # Alpha is losslessly stored by WebP, so these bounds also describe
            # the actual texture used by the browser.
            with Image.open(output) as encoded:
                for col, detail in enumerate(details):
                    decoded = encoded.crop((col * CELL[0], 0, (col + 1) * CELL[0], CELL[1]))
                    assert bounds(decoded) == detail["outputAlphaBounds"]
            rows = max(frame["outputBodyBounds"][3] - frame["outputBodyBounds"][1] for frame in details)
            manifest["characters"][character] = {"source": source, "sourceRow": row, "sharedScale": scale, "sourceVisibleHeight": max_height, "rows": rows, "height": 2.3, "runtime": {"file": relative(output), "sha256": sha256(output), "width": atlas.width, "height": atlas.height, "bytes": output.stat().st_size}, "frames": details}
            metadata.append((character, rows))
            labels.text((10, index * CELL[1] + 39), character, fill="#ebd6a5")
            print(f"{character:8} {output.stat().st_size:7,d} bytes, scale {scale:.6f}, body {rows}px")
    (RUNTIME / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    preview.save(CONCEPTS / "cast-contact-sheet.jpg", quality=93, subsampling=0)
    lines = ["// Generated by tools/bake-village-sprites.py; measure and pack the source art there."]
    lines += [f'import {character} from "../../assets/village/{character}.webp";' for character, rows in metadata]
    lines += ["", "const frames = Array.from({ length: 6 }, (_, i) => ({ x: i * 256, y: 0, w: 256, h: 320, ax: 128, ay: 300 }));", 'const actions = { idle: [0], walk: [1, 2, 3, 4], wave: [5], talk: [0] };', "export const VILLAGE_SPRITES = Object.freeze({"]
    lines += [f"  {character}: {{ url: {character}, w: 1536, h: 320, rows: {rows}, frames, actions, height: 2.3 }}," for character, rows in metadata]
    lines += ["});", ""]
    META.write_text("\n".join(lines))
    print(f"Runtime total: {sum(item['runtime']['bytes'] for item in manifest['characters'].values()):,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--import-generated", type=Path, metavar="DIR", help="copy the original generated PNGs from this directory first")
    bake(parser.parse_args().import_generated)
