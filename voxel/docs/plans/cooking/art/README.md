# Cooking menu artwork

Twelve new generated illustrations follow the warm amber, copper and purple
gothic style of the existing Hollow House menu art. These are menu thumbnails;
the world uses native voxel food, cart and truck models separately.

The atlas reads left to right, top to bottom:

1. Food truck
2. Ingredient delivery cart
3. Shared pantry
4. Ghost chef
5. Roast pumpkin wedges
6. Pumpkin soup
7. Toffee apples
8. Pumpkin jam
9. Ghost cookies
10. Pumpkin pie
11. Cocoa brownies
12. Moonlight tart

`cooking-menu-source.png` is the untouched generated RGBA source. Run
`python voxel/tools/prepare-cooking-icons.py` from the repository root to crop
the approved source guides and rebuild `voxel/assets/cooking-menu-icons.webp`.
The script writes `icons.json` with source/runtime hashes, crop guides and cell
metadata. It requires Pillow and does not redraw any illustration.

The runtime atlas is 768 × 576 pixels, with twelve 192-pixel square cells and
at least 16 pixels of transparent padding inside every edge. It is imported
only by `src/ui/cooking-icons.js`, which uses one reusable embedded-image URL.
`cookingIcon(id)` returns an accessible decorative span; the adjacent visible
label supplies the action or recipe name.

The artwork was checked on a muted purple panel as well as for alpha bounds.
All twelve cells fit their gutters without clipping adjacent icons. The
runtime file is below the 250 KB budget; its exact size is in `icons.json`.
