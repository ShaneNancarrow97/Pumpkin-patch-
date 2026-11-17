# Halloween furnishing art for voxel conversion

Eighteen new visual designs in the existing painted Pumpkin Patch furnishing style. The three PNG sheets are the deliverable art. They are **references for Claude to model and register**, not furniture already available in the live game.

| Sheet | Top row, left to right | Bottom row, left to right |
| --- | --- | --- |
| `exterior-furnishings.png` | Crescent Twin Lantern; Raven Garden Gates; Gothic Window Planter | Pumpkin Rain Barrel; Crescent Porch Swing; Creeping Rose Trellis |
| `interior-decor.png` | Haunted Grandfather Clock; Moth Reading Lamp; Pumpkin Record Console | Raven Writing Desk; Potion Terrarium Sideboard; Bat-wing Chaise |
| `wallpapers.png` | Plum & Gold Moth Damask; Midnight Haunted Botanical; Dusty Burgundy Gothic Stripe | Dark Teal Raven Vines; Antique Cream Ghost Cameo; Charcoal & Silver Celestial |

All sheets are 1536×1024. Furnishings are RGBA with real transparent pixels; wallpapers are opaque RGB. The nominal layout is 3×2. **Use each `referenceRectPx` in `manifest.json` when extracting a reference**: tall clocks/ornaments do not stay inside a strict 512×512 UV grid. Complete objects are present, but these sheets have not been packaged as a runtime sprite atlas. Rectangles use `[left, top, right, bottom]` pixel edges, with right/bottom exclusive (Pillow crop convention), not x/y/width/height.

The existing moon wardrobe, copper pan rail and pumpkin ottoman guided the ink weight, carved walnut, aged brass/copper, plum/burgundy and amber glow. Furniture uses front-and-left three-quarter views. The wallpaper patterns are flat orthographic concepts; they have **not** been certified as seamlessly repeating tiles. Prepare wall-sized materials or validate tile seams before adding them as finishes.

`manifest.json` gives labels, individual rectangles, suggested footprint/height, mount/pivot, emission and collision guidance. World sizes are suggestions; do not infer gameplay scale from the relative sprite sizes.

When converting, batch native voxels, reuse the light pool, measure the completed models, preserve host-relative riders and side-wall placement, then provide native model thumbnails and catalogue entries. See [handover 31](../../docs/handovers/31-house-furnishing-art.md).
