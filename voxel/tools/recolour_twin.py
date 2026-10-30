# Hettie's twin, Hattie (the second caretaker, rules/cleanliness.js): Hettie's
# sheet and icon with her plum suit and cap in slate blue and her red scarf in
# mustard; her face, boots, patches and pumpkin badge stay as they are.
# python3 tools/recolour_twin.py assets/hettie-janitor.webp assets/hattie-janitor.webp
# (and the same for hettie-janitor-icon.webp). Saved lossy, as Hettie's are.
import sys, colorsys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); px = im.load(); W, H = im.size
for y in range(H):
  for x in range(W):
    r, g, b, a = px[x, y]
    if a == 0: continue
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); deg = h * 360
    plum = (deg >= 330 or deg < 13) and s > .22
    if not plum: continue
    if (deg >= 350 or deg < 7) and s >= .58 and v >= .4: nh, ns, nv = 43 / 360, min(1, s * .95), min(1, v * 1.25)   # the scarf: mustard
    else: nh, ns, nv = 214 / 360, min(1, s * .95), min(1, v * 1.04)                      # the suit and cap: slate blue
    nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
    px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
im.save(out, "WEBP", quality=90, method=6)
