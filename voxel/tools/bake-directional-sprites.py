#!/usr/bin/env python3
"""Measure and pack approved directional paintings; never manufacture poses.

Input: assets/directional-sprite-concepts/manifest.json. Each approved source
contains eight direction rows and eight successive walking phases per row.
Run from any directory; --root allows an isolated fixture or preview bake.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import tempfile

from PIL import Image, ImageDraw, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = ("front", "frontRight", "right", "backRight", "back", "backLeft", "left", "frontLeft")
PHASES = ("left-contact", "left-down", "right-passing", "right-up", "right-contact", "right-down", "left-passing", "left-up")
CELL = {"w": 128, "h": 176, "ax": 64, "ay": 164}
BODY_HEIGHT = 144
ALPHA_CUTOFF = 32
BODY_CUTOFF = 108
GUTTER = 3


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def alpha_bounds(image: Image.Image, cutoff: int = 1) -> tuple[int, int, int, int]:
    result = image.getchannel("A").point(lambda value: 255 if value >= cutoff else 0).getbbox()
    if result is None:
        raise ValueError("Empty authored frame")
    return result


def export_alpha(image: Image.Image) -> Image.Image:
    """Discard invisible export noise without cutting off detached art details."""
    result = image.copy()
    result.putalpha(result.getchannel("A").point(lambda value: 0 if value < ALPHA_CUTOFF else value))
    return result


def clean_source_alpha(image: Image.Image) -> tuple[Image.Image, list[dict]]:
    """Remove tiny detached edge flecks, retaining flames, fingers and props."""
    clean = export_alpha(image)
    alpha = clean.getchannel("A")
    pixels = alpha.load()
    # Generated antialias fringes can bridge an otherwise clear one-pixel
    # gutter. These values cannot pass the runtime's .42 alpha test. Strip
    # only such boundary pixels; never erase an opaque hat, boot or finger.
    boundary = []
    for y in range(clean.height):
        for x in range(clean.width):
            if (x < 2 or y < 2 or x >= clean.width - 2 or y >= clean.height - 2) and 0 < pixels[x, y] < BODY_CUTOFF:
                boundary.append((x, y)); pixels[x, y] = 0
    seen, parts = set(), []
    for y in range(clean.height):
        for x in range(clean.width):
            if not pixels[x, y] or (x, y) in seen:
                continue
            pending, points = [(x, y)], []
            seen.add((x, y))
            while pending:
                px, py = pending.pop()
                points.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < clean.width and 0 <= ny < clean.height and pixels[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        pending.append((nx, ny))
            box = [min(px for px, py in points), min(py for px, py in points), max(px for px, py in points) + 1, max(py for px, py in points) + 1]
            parts.append((points, box))
    if not parts:
        raise ValueError("Empty authored frame")
    main = max(parts, key=lambda part: len(part[0]))[1]
    removed = [{"reason": "alpha-test-invisible boundary fringe", "pixels": len(boundary), "bounds": [min(x for x, y in boundary), min(y for x, y in boundary), max(x for x, y in boundary) + 1, max(y for x, y in boundary) + 1]}] if boundary else []
    for points, box in parts:
        edge = box[0] < 3 or box[1] < 3 or box[2] > clean.width - 3 or box[3] > clean.height - 3
        gap = max(main[0] - box[2], box[0] - main[2], main[1] - box[3], box[1] - main[3])
        if edge and len(points) <= 32 and gap >= 8:
            for x, y in points:
                pixels[x, y] = 0
            removed.append({"pixels": len(points), "bounds": box})
    clean.putalpha(alpha)
    return clean, removed


def source_clips(image: Image.Image, original: Image.Image, box: list[int]) -> bool:
    """A one-pixel transparent gutter can belong to either neighbouring cell."""
    alpha = image.getchannel("A").load()
    outside = original.getchannel("A").load()
    x0, y0, x1, y1 = box
    for y in range(image.height):
        if alpha[0, y] and (x0 == 0 or outside[x0 - 1, y0 + y] >= ALPHA_CUTOFF):
            return True
        if alpha[image.width - 1, y] and (x1 == original.width or outside[x1, y0 + y] >= ALPHA_CUTOFF):
            return True
    for x in range(image.width):
        if alpha[x, 0] and (y0 == 0 or outside[x0 + x, y0 - 1] >= ALPHA_CUTOFF):
            return True
        if alpha[x, image.height - 1] and (y1 == original.height or outside[x0 + x, y1] >= ALPHA_CUTOFF):
            return True
    return False


def source_edges(item: dict, key: str, extent: int) -> list[int]:
    edges = item.get(key, [round(i * extent / 8) for i in range(9)])
    if not isinstance(edges, list) or len(edges) != 9 or any(not isinstance(v, int) or isinstance(v, bool) for v in edges) or edges[0] != 0 or edges[-1] != extent or any(a >= b for a, b in zip(edges, edges[1:])):
        raise ValueError(f"{item.get('id', 'source')}: {key} must contain nine increasing integer cuts from 0 to {extent}")
    return edges


def suggested_measurements(source: Path, locomotion: str = "walk") -> dict:
    """Suggest transparent cuts and torso roots for human review, never approve."""
    with Image.open(source) as raw:
        image = raw.convert("RGBA")
    alpha = image.getchannel("A")
    pixels = alpha.load()
    def cuts(axis: str) -> list[int]:
        extent, across = (image.height, image.width) if axis == "rows" else (image.width, image.height)
        values = []
        for p in range(extent):
            values.append(sum((pixels[q, p] if axis == "rows" else pixels[p, q]) >= ALPHA_CUTOFF for q in range(across)))
        result = [0]
        for i in range(1, 8):
            nominal = round(i * extent / 8)
            radius = max(2, round(extent / 8 * .46))
            options = range(max(result[-1] + 1, nominal - radius), min(extent, nominal + radius + 1))
            result.append(min(options, key=lambda p: (values[p], abs(p - nominal))))
        return result + [extent]
    rows, columns = cuts("rows"), cuts("columns")
    anchors, warnings = [], []
    for row in range(8):
        for col in range(8):
            box = [columns[col], rows[row], columns[col + 1], rows[row + 1]]
            cell, _ = clean_source_alpha(image.crop(box))
            bounds = alpha_bounds(cell, BODY_CUTOFF)
            left, top, right, bottom = bounds
            torso = []
            a = cell.getchannel("A").load()
            for y in range(round(top + (bottom - top) * .28), round(top + (bottom - top) * .58)):
                runs, start = [], None
                for x in range(cell.width + 1):
                    visible = x < cell.width and a[x, y] >= BODY_CUTOFF
                    if visible and start is None:
                        start = x
                    if not visible and start is not None:
                        runs.append((start, x)); start = None
                if runs:
                    run = max(runs, key=lambda pair: pair[1] - pair[0])
                    torso.append((run[0] + run[1]) / 2)
            anchor = round(statistics.median(torso), 2) if torso else (left + right) / 2
            anchors.append([anchor, bottom])
            if source_clips(cell, image, box):
                warnings.append(f"row {row}, phase {col}: visible art crosses a proposed cut or outer canvas edge")
    if locomotion == "float":
        for row in range(8):
            baseline = max(anchor[1] for anchor in anchors[row * 8:row * 8 + 8])
            for anchor in anchors[row * 8:row * 8 + 8]:
                anchor[1] = baseline
    return {"source": source.name, "grid": {"columns": 8, "rows": 8}, "locomotion": locomotion, "rowEdges": rows, "columnEdges": columns, "sourceAnchors": anchors, "measurementMethod": "median centre of the longest opaque torso run, 28–58% down the body; review manually", "warnings": warnings}


def relative(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def validate_config(config: dict) -> list[dict]:
    if config.get("version") != 1 or not isinstance(config.get("characters"), list) or not config["characters"]:
        raise ValueError("Expected version 1 and a non-empty characters list")
    seen = set()
    for item in config["characters"]:
        ident = item.get("id", "")
        if not re.fullmatch(r"[a-z][a-z0-9-]*", ident) or ident in seen:
            raise ValueError(f"Invalid or duplicate character id: {ident!r}")
        seen.add(ident)
        if item.get("approved") is not True:
            raise ValueError(f"{ident}: source is not visually approved")
        if item.get("grid") != {"columns": 8, "rows": 8}:
            raise ValueError(f"{ident}: expected eight direction rows by eight walking phases")
        if len(item.get("directions", [])) != 8 or set(item["directions"]) != set(DIRECTIONS):
            raise ValueError(f"{ident}: declare all eight unique authored directions")
        height = item.get("height", 2.3)
        if not isinstance(height, (int, float)) or not math.isfinite(height) or height <= 0:
            raise ValueError(f"{ident}: invalid world height")
        if item.get("locomotion", "walk") not in ("walk", "float"):
            raise ValueError(f"{ident}: locomotion must be walk or float")
        anchors = item.get("sourceAnchors")
        if anchors is not None and (not isinstance(anchors, list) or len(anchors) != 64 or any(not isinstance(a, list) or len(a) != 2 or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in a) for a in anchors)):
            raise ValueError(f"{ident}: sourceAnchors must contain 64 finite [x,y] pairs")
    return config["characters"]


def measure_character(item: dict, config_path: Path, root: Path) -> tuple[Image.Image, dict]:
    ident = item["id"]
    source = (config_path.parent / item["source"]).resolve()
    if not source.is_relative_to(config_path.parent.resolve()):
        raise ValueError(f"{ident}: source must stay inside the concepts directory")
    with Image.open(source) as original:
        if original.mode != "RGBA":
            raise ValueError(f"{ident}: source must have an explicit alpha channel")
        original = original.copy()
    if original.width < 64 or original.height < 64:
        raise ValueError(f"{ident}: source is too small for 64 frames")
    row_edges = source_edges(item, "rowEdges", original.height)
    column_edges = source_edges(item, "columnEdges", original.width)
    prepared, details = [], []
    floating = item.get("locomotion") == "float"
    phases = tuple(f"float-{i + 1}" for i in range(8)) if floating else PHASES
    for row, direction in enumerate(item["directions"]):
        for col, phase in enumerate(phases):
            index = row * 8 + col
            box = [column_edges[col], row_edges[row], column_edges[col + 1], row_edges[row + 1]]
            raw = original.crop(box)
            clean, removed = clean_source_alpha(raw)
            bounds = alpha_bounds(clean)
            body = alpha_bounds(clean, BODY_CUTOFF)
            # A painted neighbour crossing a cell boundary is not recoverable
            # by cropping: reject it instead of silently cutting off a limb.
            if source_clips(clean, original, box):
                raise ValueError(f"{ident} {direction}/{phase}: artwork crosses its source cell edge")
            anchor = item.get("sourceAnchors", [])[index] if item.get("sourceAnchors") is not None else [raw.width / 2, body[3]]
            if not (0 <= anchor[0] <= raw.width and 0 <= anchor[1] <= raw.height):
                raise ValueError(f"{ident} {direction}/{phase}: anchor is outside its source cell")
            prepared.append(clean)
            details.append({"direction": direction, "phase": phase, "contactLeg": None if floating else "left" if col == 0 else "right" if col == 4 else None, "sourceBox": box, "sourceAnchor": anchor, "sourceAlphaBounds": bounds, "sourceBodyBounds": body, "removedEdgeFragments": removed, "sourcePixelHash": sha256(clean.tobytes())})
    if len({entry["sourcePixelHash"] for entry in details}) != 64:
        raise ValueError(f"{ident}: duplicated authored frames; supply distinct directions and walking phases")
    body_height = max(d["sourceBodyBounds"][3] - d["sourceBodyBounds"][1] for d in details)
    scales = [BODY_HEIGHT / body_height]
    for d in details:
        left, top, right, bottom = d["sourceAlphaBounds"]
        ax, ay = d["sourceAnchor"]
        for available, extent in ((CELL["ax"] - GUTTER, ax - left), (CELL["w"] - CELL["ax"] - GUTTER, right - ax), (CELL["ay"] - GUTTER, ay - top), (CELL["h"] - CELL["ay"] - GUTTER, bottom - ay)):
            if extent > 0:
                scales.append(available / extent)
    scale = min(scales)
    atlas = Image.new("RGBA", (CELL["w"] * 8, CELL["h"] * 8))
    for index, (frame, detail) in enumerate(zip(prepared, details)):
        width, height = math.ceil(frame.width * scale), math.ceil(frame.height * scale)
        # A source box with fractional edges keeps exactly the same scale on
        # both axes, despite integer output dimensions and rounded source rows.
        padding = math.ceil(1 / scale) + 2
        padded = Image.new("RGBA", (frame.width + padding, frame.height + padding))
        padded.alpha_composite(frame)
        source_box = [0, 0, width / scale, height / scale]
        resized = padded.resize((width, height), Image.Resampling.LANCZOS, box=source_box)
        x = round(CELL["ax"] - detail["sourceAnchor"][0] * scale)
        y = round(CELL["ay"] - detail["sourceAnchor"][1] * scale)
        cell = Image.new("RGBA", (CELL["w"], CELL["h"]))
        cell.alpha_composite(resized, (x, y))
        cell = export_alpha(cell)
        bounds, body = alpha_bounds(cell), alpha_bounds(cell, BODY_CUTOFF)
        if bounds[0] <= 0 or bounds[1] <= 0 or bounds[2] >= CELL["w"] or bounds[3] >= CELL["h"]:
            raise ValueError(f"{ident} {detail['direction']}/{detail['phase']}: packed art clips its cell")
        detail.update({"resizeDimensions": [width, height], "resizeSourceBox": source_box, "outputOffset": [x, y], "outputAlphaBounds": bounds, "outputBodyBounds": body, "anchor": [CELL["ax"], CELL["ay"]]})
        atlas.alpha_composite(cell, (index % 8 * CELL["w"], index // 8 * CELL["h"]))
    rows = max(d["outputBodyBounds"][3] - d["outputBodyBounds"][1] for d in details)
    return atlas, {"source": {"file": relative(source, root), "sha256": sha256(source.read_bytes()), "width": original.width, "height": original.height, "rowEdges": row_edges, "columnEdges": column_edges}, "directions": item["directions"], "phases": list(phases), "locomotion": item.get("locomotion", "walk"), "approved": True, "height": item.get("height", 2.3), "rows": rows, "sharedScale": scale, "sourceBodyHeight": body_height, "anchorMethod": "explicit per-frame source roots" if item.get("sourceAnchors") else "fixed source-cell centre and measured opaque foot baseline", "frames": details}


def preview_html(characters: dict) -> str:
    data = [{"id": ident, "file": f"{ident}.webp", "directions": char["directions"], "locomotion": char["locomotion"]} for ident, char in characters.items()]
    return """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Directional character proof</title>
<style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#211a2d;color:#f4e5c8;font:16px system-ui}h1{font-size:24px}button,select,input{font:inherit;min-height:44px}button,select{background:#463250;color:inherit;border:1px solid #927257;border-radius:10px;padding:8px}header{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:24px}article{padding:14px;border:1px solid #6c526a;border-radius:14px;text-align:center}canvas{display:block;margin:auto;width:128px;height:176px;background:linear-gradient(transparent 163px,#bd9260 164px,transparent 165px)}small{display:block;margin-top:8px;color:#d0b9d9}a{color:#f3bd70}</style>
<h1>Directional character proof</h1><p>One scale per character. Amber line marks the shared floor. Check both feet, hands, silhouette and true facing at every step.</p><header><label>Direction <select id="direction"></select></label><button id="play">Pause</button><label>Step <input id="step" type="range" min="0" max="7" value="0"></label><label>Speed <select id="speed"><option value="4">4 fps</option><option value="8" selected>8 fps</option><option value="12">12 fps</option></select></label><output id="phase"></output></header><main class="cards" id="cards"></main>
<script>const cast=__CAST__,dirs=__DIRS__,phases=__PHASES__;const select=document.getElementById('direction'),step=document.getElementById('step'),play=document.getElementById('play');dirs.forEach((d,i)=>select.add(new Option(d,i)));let running=true,age=0,last=0;const views=cast.map(c=>{const card=document.createElement('article'),heading=document.createElement('h2'),canvas=document.createElement('canvas'),note=document.createElement('small'),link=document.createElement('a');heading.textContent=c.id;canvas.width=128;canvas.height=176;note.textContent='8 directions · 8 '+(c.locomotion==='float'?'floating':'walking')+' phases';link.href=c.id+'-contact.jpg';link.textContent='View all 64 frames';card.append(heading,canvas,note,link);document.getElementById('cards').append(card);const image=new Image();image.src=c.file;return {...c,image,ctx:canvas.getContext('2d')};});play.onclick=()=>{running=!running;play.textContent=running?'Pause':'Play'};step.oninput=()=>{running=false;play.textContent='Play';age=+step.value};function draw(now){if(last&&running)age+=(now-last)/1000*+document.getElementById('speed').value;last=now;const col=Math.floor(age)%8;step.value=col;document.getElementById('phase').textContent=phases[col];views.forEach(v=>{v.ctx.clearRect(0,0,128,176);if(v.image.complete&&v.image.naturalWidth){const row=v.directions.indexOf(dirs[+select.value]);v.ctx.drawImage(v.image,col*128,row*176,128,176,0,0,128,176)}});requestAnimationFrame(draw)}requestAnimationFrame(draw);</script></html>""".replace("__CAST__", json.dumps(data)).replace("__DIRS__", json.dumps(DIRECTIONS)).replace("__PHASES__", json.dumps(PHASES))


def bake(root: Path, config_path: Path, progress=None) -> dict:
    config = json.loads(config_path.read_text())
    items = validate_config(config)
    # Validate every source first. A rejected later sheet cannot overwrite an
    # earlier accepted runtime sheet and leave a half-written release.
    measured = []
    for item in items:
        measured.append((item["id"], *measure_character(item, config_path, root)))
        if progress:
            progress(f"Measured {item['id']}: all 64 source frames retained")
    manifest = {"version": 1, "cell": CELL, "targetBodyHeight": BODY_HEIGHT, "baker": {"file": "tools/bake-directional-sprites.py", "sha256": sha256(Path(__file__).read_bytes()), "pillowVersion": PILLOW_VERSION, "alphaCutoff": ALPHA_CUTOFF, "bodyAlphaCutoff": BODY_CUTOFF, "resize": "Lanczos, one common scalar per character", "webp": {"quality": 92, "method": 6, "exact": True}}, "coverage": {"directionCount": 8, "angleStepDegrees": 45, "walkPhases": 8, "idleAuthored": False, "actionsAuthored": False, "mirroredDirections": False, "visualApprovalRequired": True}, "characters": {}}
    assets = root / "assets/directional"
    meta = root / "src/content/directional-sprite-meta.js"
    with tempfile.TemporaryDirectory(prefix="directional-bake-") as temporary:
        stage = Path(temporary)
        for ident, atlas, record in measured:
            output = stage / f"{ident}.webp"
            atlas.save(output, "WEBP", quality=92, method=6, exact=True)
            if progress:
                progress(f"Packed {ident}: {output.stat().st_size:,} bytes")
            with Image.open(output) as decoded:
                for index, frame in enumerate(record["frames"]):
                    x, y = index % 8 * CELL["w"], index // 8 * CELL["h"]
                    cell = decoded.crop((x, y, x + CELL["w"], y + CELL["h"]))
                    if list(alpha_bounds(cell)) != list(frame["outputAlphaBounds"]):
                        raise ValueError(f"{ident}: WebP changed frame alpha bounds")
            record["runtime"] = {"file": f"assets/directional/{ident}.webp", "sha256": sha256(output.read_bytes()), "width": atlas.width, "height": atlas.height, "bytes": output.stat().st_size, "rgbaBytes": atlas.width * atlas.height * 4}
            manifest["characters"][ident] = record
            contact = Image.new("RGB", (atlas.width + 130, atlas.height + 30), "#30233f")
            contact.paste(atlas, (130, 30), atlas)
            labels = ImageDraw.Draw(contact)
            for col, phase in enumerate(record["phases"]):
                labels.text((134 + col * CELL["w"], 8), phase, fill="#eed4a0")
            for row, direction in enumerate(record["directions"]):
                labels.text((8, 38 + row * CELL["h"]), direction, fill="#eed4a0")
            contact.save(stage / f"{ident}-contact.jpg", quality=93, subsampling=0)
        (stage / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (stage / "preview.html").write_text(preview_html(manifest["characters"]))
        lines = ["// Generated by tools/bake-directional-sprites.py from approved paintings."]
        for index, (ident, _, _) in enumerate(measured):
            lines.append(f'import sheet{index} from "../../assets/directional/{ident}.webp";')
        lines += ["", "const cell = Object.freeze(" + json.dumps(CELL, separators=(",", ":")) + ");", "const frames = Array.from({ length: 64 }, (_, i) => ({ x: i % 8 * cell.w, y: Math.floor(i / 8) * cell.h, ...cell }));", "const walk = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, phase) => row * 8 + phase));", "export const DIRECTIONAL_SPRITES = Object.freeze({"]
        for index, (ident, atlas, record) in enumerate(measured):
            lines.append(f'  {json.dumps(ident)}: {{ url: sheet{index}, w: {atlas.width}, h: {atlas.height}, cell, rows: {record["rows"]}, height: {record["height"]}, locomotion: {json.dumps(record["locomotion"])}, frames, directions: {json.dumps(record["directions"])}, walk }},')
        lines += ["});", ""]
        assets.mkdir(parents=True, exist_ok=True)
        meta.parent.mkdir(parents=True, exist_ok=True)
        for file in stage.iterdir():
            (assets / file.name).write_bytes(file.read_bytes())
        meta.write_text("\n".join(lines))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--measure", type=Path, help="Print suggested source cuts/torso roots for review without writing any files")
    parser.add_argument("--float", action="store_true", help="When measuring a floating actor, retain a shared baseline per direction")
    options = parser.parse_args()
    if options.measure:
        print(json.dumps(suggested_measurements(options.measure.resolve(), "float" if options.float else "walk"), indent=2))
        return
    root = options.root.resolve()
    config = options.config.resolve() if options.config else root / "assets/directional-sprite-concepts/manifest.json"
    try:
        manifest = bake(root, config, lambda message: print(message, flush=True))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, f"Directional bake rejected: {error}\n")
    for ident, record in manifest["characters"].items():
        print(f"{ident}: 8 directions × 8 walk phases, body {record['rows']}px, {record['runtime']['bytes']:,} bytes; scale {record['sharedScale']:.6f}")


if __name__ == "__main__":
    main()
