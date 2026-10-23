# 31 — House exterior, interior and wallpaper art

For Claude. This is an **art-only contractor part**, alongside the first-person maze work in handover 29. The user asked for more house furnishing sprites in the existing painted style, ready for native voxel conversion. No runtime, catalogue, balance, save or root 2D files change for this part.

## Delivered files

Directory: `voxel/assets/house-concepts-2026-10/`.

| File | Designs |
| --- | --- |
| `exterior-furnishings.png` | Crescent Twin Lantern; Raven Garden Gates; Gothic Window Planter; Pumpkin Rain Barrel; Crescent Porch Swing; Creeping Rose Trellis |
| `interior-decor.png` | Haunted Grandfather Clock; Moth Reading Lamp; Pumpkin Record Console; Raven Writing Desk; Potion Terrarium Sideboard; Bat-wing Chaise |
| `wallpapers.png` | Plum & Gold Moth Damask; Midnight Haunted Botanical; Dusty Burgundy Gothic Stripe; Dark Teal Raven Vines; Antique Cream Ghost Cameo; Charcoal & Silver Celestial |
| `manifest.json` | Sheet hashes/formats, labels/order, per-object reference rectangles, proposed footprint/height, mounts/pivots, emission and collision guidance |
| `README.md` | Quick visual lookup and ingestion caveats |

Each sheet is 1536×1024, arranged nominally 3 columns × 2 rows. Read row-major. Object sheets have genuine RGBA transparency; wallpaper swatches are opaque RGB. There are 12 furnishing designs and 6 wallpaper designs.

The original generated sheets remain outside the repository in `generated_images`; only selected final art is shipped. The manifest preserves their source filenames and hashes for traceability.

## Art direction and validation

References inspected: `voxel/assets/premium/moon-wardrobe.webp`, `voxel/assets/premium/copper-pan-rail.webp` and `assets/house/item-f04.webp`. The new designs keep their fine dark ink outlines, carved walnut, worn brass/copper, plum/burgundy upholstery, autumn foliage and warm amber candlelight. The furnishings use front-and-left three-quarter views with upright verticals; wallpapers are flat material swatches.

All 18 designs were visually inspected. Pillow was used read-only to verify sheet dimensions, formats, transparency, non-empty reference bounds and checksums; image generation made the artwork and the layout edit. The transparent sheets have alpha 0..254, including fully transparent pixels.

**These are modelling references, not a certified runtime atlas.** Image generation did not obey a perfectly uniform cell margin: the grandfather clock and some ornaments cross nominal row boundaries. The manifest therefore supplies explicit `referenceRectPx` rectangles that retain the full objects. Do not slice all furnishing cells mechanically at 512px boundaries or claim uniform UV-ready frames. The rectangles are for viewing/extracting modelling references; any later menu sprite packaging should normalise anchors and inspect the result.

Wallpaper motifs are finished artwork concepts, **not verified seamless textures**. Prepare matching wall-sized panels or a tested repeat tile, retain room lighting, and inspect joins on back and side walls. Do not stretch one whole six swatch sheet across a room.

## Suggested native implementation

1. Build native voxel models from the selected references using the established common room scale. Keep new model ids separate from existing catalogue and `shelf-` ids. Suggested sizes in the manifest are starting points, not balance decisions.
2. Use bottom-centre floor pivots; the planter uses a back-centre wall mount. Supply correct side-wall orientation and proper sealed backs/undersides for orbiting the garden and viewing from multiple room angles.
3. Batch boxes/materials, keep foliage/ornament detail from increasing collision size unnecessarily, and use the existing point-light pool. Only lantern glass, candle flames and a few potion/mushroom highlights should emit; do not glow the entire wooden model or allocate one light per decoration.
4. Re-run `node voxel/tools/measure-decor.mjs` after native models exist. Preserve Claude’s measured-body collision, `placementRange`, rider frames and selected-piece camera. The writing desk may become a host only after measuring a genuinely clear tabletop; the terrarium cabinet top is already occupied.
5. Put exterior gates/arches in appropriate homestead slots without changing visible farm visitor paths. The rain barrel is decorative; the record console does not add music tracks; the swing does not imply seated-character animation until implemented and tested.
6. Register catalogue entries, unlocks/costs, thumbnails and finishes only when the native models/materials are complete. Save migration is needed only if their eventual data shape requires it. Test purchase, placement, free drag, full rotation, side-wall mounting, store/Undo and reload on desktop/phone/Fold.

Optional subtle native animations: pendulum movement inside the clock; a tiny lamp-glass shimmer; record rotation; a low-amplitude swing within a reserved envelope; small terrarium motes. Use gentle/reduced-motion settings, and add no strobe.

## Scope

The PNGs are ready for visual review and voxel modelling. The 12 native models,6 selectable room finishes, live catalogue entries and their economy/unlock tuning are intentionally left for Claude. This art pack is not silently inserted as flat furniture into the 3D game.
