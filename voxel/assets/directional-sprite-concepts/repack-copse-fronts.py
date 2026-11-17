#!/usr/bin/env python3
"""Pack the image-generated corrected front rows without drawing any new art."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent

for name in ("tansy", "opal"):
    original = ROOT / f"{name}-before-front-repair.png"
    repair = ROOT / f"{name}-front-repair.png"
    raw = Image.open(original).convert("RGBA")
    front = Image.open(repair).convert("RGBA")
    # Image-generation margins are uneven; cut only in a clear gutter so a
    # neighbouring glove never leaks into the next output frame.
    mask = front.getchannel("A").point(lambda value: 255 if value >= 108 else 0)
    column_mass = [sum(mask.crop((x, 0, x + 1, front.height)).get_flattened_data()) for x in range(front.width)]
    cuts = [0]
    for boundary in range(1, 8):
        expected = round(boundary * front.width / 8)
        lo, hi = max(cuts[-1] + 1, expected - 70), min(front.width - 1, expected + 70)
        lowest = min(column_mass[lo:hi])
        points = [x for x in range(lo, hi) if column_mass[x] == lowest]
        cuts.append(round((points[0] + points[-1]) / 2))
    cuts.append(front.width)
    frames = []
    for column in range(8):
        box = (cuts[column], 0, cuts[column + 1], front.height)
        frame = front.crop(box)
        alpha = frame.getchannel("A").point(lambda value: 0 if value < 32 else value)
        frame.putalpha(alpha)
        frames.append((frame, alpha.getbbox(), box))
    # One scalar for the entire corrected walk, matching the existing source's
    # stature. No independently stretching heads or limbs to fill a cell.
    target_height = 147
    scale = target_height / max(bounds[3] - bounds[1] for _, bounds, _ in frames)
    row_height = round(raw.height / 8)
    layer = Image.new("RGBA", (raw.width, row_height))
    notes = []
    for column, (frame, bounds, box) in enumerate(frames):
        cropped = frame.crop(bounds)
        resized = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)), Image.Resampling.LANCZOS)
        left = round(column * raw.width / 8)
        right = round((column + 1) * raw.width / 8)
        x = round((left + right - resized.width) / 2)
        y = 151 - resized.height
        layer.alpha_composite(resized, (x, y))
        notes.append({"column": column, "repairCrop": list(box), "alphaBounds": list(bounds), "sharedScale": scale, "paste": [x, y], "size": list(resized.size)})
    raw.paste(layer, (0, 0))
    raw.save(ROOT / f"{name}.png")
    report = {"source": repair.name, "preservedSource": original.name, "output": f"{name}.png", "targetHeight": target_height, "footLine": 151, "rowHeight": row_height, "alphaCutoff": 32, "sourceColumnCuts": cuts, "columnOrder": list(range(8)), "frames": notes}
    (ROOT / f"{name}-front-repair-pack.json").write_text(json.dumps(report, indent=2) + "\n")
