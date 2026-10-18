"""Bakes the main game's sprites for the voxel build.

    python3 voxel/tools/bake_sprites.py     (run from the repository root)

Writes two sets:
- voxel/assets/sprites.png and voxel/src/sprite-meta.js: Shane, Natalie and
  Skyla small (120 rows), which the voxel build turns into voxels, one per pixel.
- voxel/assets/hd-*.webp and voxel/src/sprite-meta-hd.js: Shane, Natalie, Skyla
  and the five visitors at full size, drawn as flat sprites in the voxel world.
"""
import json
import re
import subprocess
import numpy as np
from PIL import Image

HOUSE = "assets/house/"
ROWS = 120          # voxel rows from heel to top of head for Shane and Natalie
SKYLA_ROWS = 54

# Frame rectangles from src/content/animation-meta.mjs (idle) and
# character-walk-meta.mjs (walk: 3 x 2 grid of 320 x 352, feet at 160, 344).
IDLE = {
    "natalie": [[167, 10, 330, 711], [669, 10, 333, 711], [1182, 9, 334, 712], [1693, 10, 331, 711]],
    "shane": [[27, 11, 421, 850], [440, 11, 451, 850], [883, 11, 451, 850], [1326, 8, 422, 853]],
}
WALK = [[(i % 3) * 320, (i // 3) * 352, 320, 352] for i in range(6)]


def bbox_height(img):
    box = img.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
    return box[3] - box[1], box


frames, voxel_meta, x = [], {}, 0


def add(who, kind, img, scale, anchor):
    global x
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.resize((w, h), Image.LANCZOS)
    frames.append((small, x))
    voxel_meta.setdefault(who, {}).setdefault(kind, []).append(
        {"x": x, "y": 0, "w": w, "h": h, "ax": round(anchor[0] * scale, 2), "ay": round(anchor[1] * scale, 2)})
    x += w + 2


for who in ("natalie", "shane"):
    sheet = Image.open(HOUSE + who + "-idle.webp").convert("RGBA")
    for (rx, ry, rw, rh) in IDLE[who]:
        img = sheet.crop((rx, ry, rx + rw, ry + rh))
        hgt, box = bbox_height(img)
        add(who, "idle", img, ROWS / hgt, (rw / 2, box[3]))
    walk = Image.open(HOUSE + who + "-base-walk.webp").convert("RGBA")
    first = walk.crop(tuple(WALK[0][:2] + [WALK[0][0] + 320, WALK[0][1] + 352]))
    scale = ROWS / bbox_height(first)[0]
    for (rx, ry, rw, rh) in WALK:
        add(who, "walk", walk.crop((rx, ry, rx + rw, ry + rh)), scale, (160, 344))

sky = Image.open(HOUSE + "skyla-idle.webp").convert("RGBA").crop((14, 4, 534, 695))
hgt, box = bbox_height(sky)
add("skyla", "idle", sky, SKYLA_ROWS / hgt, (281.5 - 14, box[3]))

atlas = Image.new("RGBA", (x, max(f.height for f, _ in frames)), (0, 0, 0, 0))
for img, fx in frames:
    atlas.paste(img, (fx, 0))
# Voxels are either there or not, so make edges hard and store a 256-colour palette.
alpha = atlas.getchannel("A").point(lambda a: 255 if a > 128 else 0)
hard = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
hard.paste(atlas.convert("RGB"), (0, 0), alpha)
hard.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save("voxel/assets/sprites.png", optimize=True)
print("atlas", atlas.size)


# Full-size sprites. Sizes follow the original game, which draws Shane and
# Natalie 160px tall and visitors 110px (the ghost 82px); here everything is
# twice that, so a person is 320 rows. Skyla is drawn larger than on the
# original map (0.45 of a person, not 0.27) so she reads on the counter.
HD_ROWS = 320
HD_SKYLA_ROWS = 144
COSTUME_ROWS = 256  # costumes are smaller files; drawn at the same height in the world
PAD = 4             # transparent margin round each frame, filled by bleed()


def game_meta(path, name):
    text = open(path).read()
    return json.loads(re.search(r"var " + name + r" = (\{.*?\});", text, re.S).group(1))


def bleed(img, passes=PAD + 2):
    """Gives transparent pixels the colour of their opaque neighbours, so texture
    filtering at a sprite's edge blends into its own colours instead of black."""
    a = np.asarray(img, dtype=np.float32)
    rgb, alpha = a[..., :3].copy(), a[..., 3]
    known = alpha > 0
    for _ in range(passes):
        acc, count = np.zeros_like(rgb), np.zeros(alpha.shape, np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            k = np.roll(known, (dy, dx), (0, 1))
            acc += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]
            count += k
        fill = ~known & (count > 0)
        rgb[fill] = acc[fill] / count[fill][:, None]
        known = known | fill
    return Image.fromarray(np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8), "RGBA")


def drop_strays(img):
    """Clears small pieces touching the left or right edge: the original frame
    rectangles overlap, so they catch the tip of the next frame's trowel or hat."""
    a = np.asarray(img).copy()
    solid = a[..., 3] > 8
    h, w = solid.shape
    label = np.zeros((h, w), np.int32)
    pieces = []
    for sy, sx in zip(*np.nonzero(solid)):
        if label[sy, sx]:
            continue
        n = len(pieces) + 1
        label[sy, sx], stack, area, edge = n, [(sy, sx)], 0, False
        while stack:
            y, x = stack.pop()
            area += 1
            edge = edge or x == 0 or x == w - 1
            for ny in (y - 1, y, y + 1):
                for nx in (x - 1, x, x + 1):
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = n
                        stack.append((ny, nx))
        pieces.append((area, edge))
    biggest = max(area for area, _ in pieces)
    for n, (area, edge) in enumerate(pieces, 1):
        if edge and area < biggest * 0.15:
            a[label == n, 3] = 0
    return Image.fromarray(a, "RGBA")


def hd_frame(sheet, rect, scale, anchor):
    """Crops a frame, scales it (premultiplied, so edges don't darken), trims it
    to its pixels plus a margin, and returns it with its foot anchor."""
    x, y, w, h = rect
    img = sheet.crop((x, y, x + w, y + h)).convert("RGBa")
    img = drop_strays(img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS).convert("RGBA"))
    left, top, right, bottom = img.getchannel("A").getbbox()
    img = img.crop((left - PAD, top - PAD, right + PAD, bottom + PAD))
    return bleed(img), (round(anchor[0] * scale - left + PAD, 2), round(anchor[1] * scale - top + PAD, 2))


def hd_sheet(name, groups, rows=HD_ROWS):
    """Packs frames into rows up to 2048 wide and writes voxel/assets/hd-<name>.webp."""
    x = y = row = width = 0
    placed, meta = [], {}
    for key, frames in groups:
        for img, (ax, ay) in frames:
            if x and x + img.width > 2048:
                x, y, row = 0, y + row, 0
            placed.append((img, x, y))
            meta.setdefault(key, []).append({"x": x, "y": y, "w": img.width, "h": img.height, "ax": ax, "ay": ay})
            x += img.width
            row, width = max(row, img.height), max(width, x)
    sheet = Image.new("RGBA", (width, y + row), (0, 0, 0, 0))
    for img, fx, fy in placed:
        sheet.paste(img, (fx, fy))
    sheet.save("voxel/assets/hd-" + name + ".webp", quality=88 if rows == HD_ROWS else 82, method=6, exact=True)
    print("hd", name, sheet.size)
    return {"w": sheet.width, "h": sheet.height, "rows": rows, **meta}


idle_meta = game_meta("src/content/animation-meta.mjs", "idleArtMeta")
visitor_meta = game_meta("src/content/animation-meta.mjs", "visitorArtMeta")
walk_meta = game_meta("src/content/character-walk-meta.mjs", "characterWalkMeta")
skyla_meta = game_meta("src/content/skyla-meta.mjs", "skylaArt")

hd = {}
for who in ("natalie", "shane"):
    idle, walk = idle_meta[who], walk_meta[who + "-base"]
    sheet = Image.open(HOUSE + who + "-idle.webp").convert("RGBA")
    scale = HD_ROWS / idle["height"]
    idle_frames = [hd_frame(sheet, r, scale, (r[2] / 2, r[3])) for r in idle["rects"]]
    sheet = Image.open(walk["path"]).convert("RGBA")
    scale = HD_ROWS / walk["referenceHeight"]
    walk_frames = [hd_frame(sheet, r, scale, walk["anchor"]) for r in walk["rects"]]
    hd[who] = hd_sheet(who, [("idle", idle_frames), ("walk", walk_frames)])

sheet = Image.open(skyla_meta["path"]).convert("RGBA")
ax, ay = skyla_meta["anchor"]
scale = HD_SKYLA_ROWS / ay
hd["skyla"] = hd_sheet("skyla", [("idle", [hd_frame(sheet, r, scale, (ax - (r[0] - i * skyla_meta["cellWidth"]), ay - r[1])) for i, r in enumerate(skyla_meta["rects"])])])

groups = []
for kind, meta in visitor_meta.items():
    sheet = Image.open(HOUSE + "visitor-" + kind + ".webp").convert("RGBA")
    scale = HD_ROWS * (82 if kind == "ghost" else 110) / 160 / meta["height"]
    groups.append((kind, [hd_frame(sheet, r, scale, (r[2] / 2, r[3])) for r in meta["rects"]]))
hd["visitors"] = hd_sheet("visitors", groups)

# Costumes: the main game's own sheets. The original six have four idle frames on
# a shared costume sheet; the 90s horror collection has its own three-frame idle.
costume_art = game_meta("src/content/animation-meta.mjs", "costumeArtMeta")
costume_idle = game_meta("src/content/character-walk-meta.mjs", "characterIdleMeta")
COSTUMES = [cid for cid in walk_meta if not cid.endswith("-base")]


def costume_frames(cid, rows):
    if cid in costume_idle:
        m = costume_idle[cid]
        sheet, scale = Image.open(m["path"]).convert("RGBA"), rows / m["referenceHeight"]
        idle = [(sheet, r, scale, m["anchor"]) for r in m["rects"]]
    else:
        m = costume_art[cid]
        sheet, scale = Image.open(HOUSE + cid.split("-")[0] + "-costumes.webp").convert("RGBA"), rows / m["height"]
        idle = [(sheet, r, scale, (r[2] / 2, r[3])) for r in m["rects"]]
    w = walk_meta[cid]
    wsheet, wscale = Image.open(w["path"]).convert("RGBA"), rows / w["referenceHeight"]
    return idle, [(wsheet, r, wscale, w["anchor"]) for r in w["rects"]]


for cid in COSTUMES:
    idle, walk = costume_frames(cid, COSTUME_ROWS)
    hd[cid] = hd_sheet(cid, [("idle", [hd_frame(*f) for f in idle]), ("walk", [hd_frame(*f) for f in walk])], COSTUME_ROWS)

with open("voxel/src/sprite-meta-hd.js", "w") as f:
    f.write("// Generated by voxel/tools/bake_sprites.py from the main game's sprites. Do not edit.\n")
    f.write("export const HD_ROWS = " + str(HD_ROWS) + ";\n")
    f.write("export const SHEETS = " + json.dumps(hd) + ";\n")


def small_frame(sheet, rect, scale, anchor):
    """A frame for voxelising: scaled, trimmed, hard edged."""
    x, y, w, h = rect
    img = sheet.crop((x, y, x + w, y + h)).convert("RGBa").resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS).convert("RGBA")
    img = drop_strays(img)
    left, top, right, bottom = img.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
    return img.crop((left, top, right, bottom)), (round(anchor[0] * scale - left, 2), round(anchor[1] * scale - top, 2))


def small_atlas(path, groups, width=2048):
    """Packs (key, kind, frames) into rows; a 256-colour PNG with hard alpha. Returns meta."""
    x = y = row = 0
    placed, meta = [], {}
    for key, kind, frames in groups:
        for img, (ax, ay) in frames:
            if x and x + img.width > width:
                x, y, row = 0, y + row + 2, 0
            placed.append((img, x, y))
            entry = {"x": x, "y": y, "w": img.width, "h": img.height, "ax": ax, "ay": ay}
            if kind:
                meta.setdefault(key, {}).setdefault(kind, []).append(entry)
            else:
                meta[key] = entry
            x += img.width + 2
            row = max(row, img.height)
    atlas = Image.new("RGBA", (width, y + row), (0, 0, 0, 0))
    for img, fx, fy in placed:
        atlas.paste(img, (fx, fy))
    alpha = atlas.getchannel("A").point(lambda a: 255 if a > 128 else 0)
    hard = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
    hard.paste(atlas.convert("RGB"), (0, 0), alpha)
    hard.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)
    print(path, atlas.size)
    return meta


# Costumes for the voxel characters (120 rows, like Shane and Natalie's originals).
groups = []
for cid in COSTUMES:
    idle, walk = costume_frames(cid, ROWS)
    groups += [(cid, "idle", [small_frame(*f) for f in idle]), (cid, "walk", [small_frame(*f) for f in walk])]
costume_voxels = small_atlas("voxel/assets/costumes.png", groups)
for frames in costume_voxels.values():
    for kind in frames.values():
        for f in kind:
            f["atlas"] = "costumes"

# Decor: every piece of the catalogue, its longest side 64 pixels, for voxel
# props and pixel-art thumbnails; and the ten book spines, 40 pixels tall.
DECOR_PX = 64
groups = []
ids = ["f%02d" % i for i in range(1, 17)] + ["d%02d" % i for i in range(1, 17)] + ["b%02d" % i for i in range(1, 11)]
for item in ids:
    img = Image.open(HOUSE + "item-" + item + ".webp").convert("RGBA")
    box = img.getchannel("A").getbbox()
    scale = DECOR_PX / max(box[2] - box[0], box[3] - box[1])
    groups.append((item, None, [small_frame(img, (box[0], box[1], box[2] - box[0], box[3] - box[1]), scale, ((box[2] - box[0]) / 2, box[3] - box[1]))]))
spines = game_meta("src/content/book-spine-meta.mjs", "bookSpineAtlas")
sheet = Image.open(spines["path"]).convert("RGBA")
for i, r in enumerate(spines["rects"]):
    groups.append(("spine-b%02d" % (i + 1), None, [small_frame(sheet, r, 40 / r[3], (r[2] / 2, r[3]))]))
decor = small_atlas("voxel/assets/decor.png", groups, 1024)
# Bookshelves keep the main game's book sockets, moved into the small art's pixels.
shelves = json.loads(subprocess.run(["node", "-e", 'import("./src/content/shelf-layouts.mjs").then((m) => console.log(JSON.stringify(m.shelfLayouts)))'], capture_output=True, text=True, check=True).stdout)
for item, layout in shelves.items():
    img = Image.open(HOUSE + "item-" + item + ".webp")
    box, f = img.getchannel("A").getbbox(), decor[item]
    bw, bh = box[2] - box[0], box[3] - box[1]
    scale = DECOR_PX / max(bw, bh)
    left, top = bw / 2 * scale - f["ax"], bh * scale - f["ay"]
    f["sockets"] = [{"row": k["row"], "x": round((k["x"] * img.width - box[0]) * scale - left, 2), "y": round((k["y"] * img.height - box[1]) * scale - top, 2),
                     "w": round(k["width"] * img.width * scale, 2), "h": round(k["height"] * img.height * scale, 2)} for k in layout["sockets"]]
with open("voxel/src/decor-meta.js", "w") as f:
    f.write("// Generated by voxel/tools/bake_sprites.py from the main game's decor art. Do not edit.\n")
    f.write("export const DECOR_ART = " + json.dumps(decor) + ";\n")

with open("voxel/src/sprite-meta.js", "w") as f:
    f.write("// Generated by voxel/tools/bake_sprites.py from the main game's sprites. Do not edit.\n")
    f.write("export const SPRITES = " + json.dumps({**voxel_meta, **costume_voxels}) + ";\n")

# The main game's interface icons as little voxel tiles: shrunk to a 30-pixel
# grid with hard edges and few colours, then extruded three steps down and to
# the right in darker shades, with a light top-left bevel and a dark outline.
ICON_ORDER = ["patch", "home", "outfits", "upgrades", "journal", "coins", "stock", "visitors", "tools", "yield", "auto", "plots",
              "sign", "seeds", "shop", "moonlight", "boost", "music", "settings", "talk", "fullscreen", "help", "plant", "harvest"]
CELL, GRID_PX, DEPTH = 36, 30, 3


def voxel_icon(path):
    img = Image.open(path).convert("RGBA")
    img = img.crop(img.getchannel("A").getbbox())
    k = GRID_PX / max(img.size)
    small = img.convert("RGBa").resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS).convert("RGBA")
    a = np.asarray(small).copy()
    solid = a[..., 3] > 110
    rgb = Image.fromarray(a[..., :3]).quantize(colors=24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a[..., :3] = np.asarray(rgb)
    a[..., 3] = np.where(solid, 255, 0)
    h, w = solid.shape
    tile = np.zeros((CELL, CELL, 4), np.uint8)
    ox, oy = (CELL - DEPTH - w) // 2, (CELL - DEPTH - h) // 2
    # The extrusion: deepest step first, each a little lighter.
    for step in range(DEPTH, 0, -1):
        shade = 0.32 + 0.1 * (DEPTH - step)
        for y, x in zip(*np.nonzero(solid)):
            tile[oy + y + step, ox + x + step] = [*(a[y, x, :3] * shade).astype(np.uint8), 255]
    # The face, bevelled: lighter where open to the top or left, darker to the bottom or right.
    for y, x in zip(*np.nonzero(solid)):
        c = a[y, x, :3].astype(np.float32)
        if y == 0 or not solid[y - 1, x] or x == 0 or not solid[y, x - 1]:
            c = c + (255 - c) * 0.28
        elif y == h - 1 or not solid[y + 1, x] or x == w - 1 or not solid[y, x + 1]:
            c = c * 0.82
        tile[oy + y, ox + x] = [*c.clip(0, 255).astype(np.uint8), 255]
    # A one-pixel dark outline round the whole block, so it reads on any panel.
    filled = tile[..., 3] > 0
    ring = np.zeros_like(filled)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        ring |= np.roll(filled, (dy, dx), (0, 1))
    ring &= ~filled
    tile[ring] = [22, 14, 26, 255]
    return Image.fromarray(tile, "RGBA")


icons = Image.new("RGBA", (CELL * len(ICON_ORDER), CELL), (0, 0, 0, 0))
for i, name in enumerate(ICON_ORDER):
    icons.paste(voxel_icon("assets/ui/" + name + ".webp"), (i * CELL, 0))
icons.save("voxel/assets/icons.png", optimize=True)
with open("voxel/src/icons.css", "w") as f:
    f.write("/* Generated by voxel/tools/bake_sprites.py: the main game's icons as voxel tiles. Do not edit. */\n")
    f.write(".ico { --s: 36px; display: inline-block; flex-shrink: 0; width: var(--s); height: var(--s); background: url('assets/icons.png') no-repeat; "
            "background-size: calc(var(--s) * %d) var(--s); background-position: calc(var(--i) * var(--s) * -1) 0; image-rendering: pixelated; }\n" % len(ICON_ORDER))
    f.write("\n".join(".i-%s { --i: %d; }" % (name, i) for i, name in enumerate(ICON_ORDER)) + "\n")
print("icons", icons.size)
