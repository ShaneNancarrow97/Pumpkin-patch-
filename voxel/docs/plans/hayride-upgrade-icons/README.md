# Hollow Hayride upgrade art

Twelve new painted icons match the game's existing hospitality and Hollow House
menu art: antique brass, dark green tractors, plum cloth and amber lantern light.
The whole atlas was generated using those approved game sheets as references.
The source is `source.png`; only `assets/hayride-upgrade-icons.webp` is bundled.

| Row | Column1 | Column2 | Column3 | Column4 |
| --- | --- | --- | --- | --- |
| 1 | `tier1` · basic tractor | `tier2` · lantern convoy | `tier3` · midnight procession | `fleet` · second tractor |
| 2 | `dispatch` · station crew | `route1` · forgotten graveyard | `route2` · crooked thicket | `turning-scarecrows` |
| 3 | `spider-drop` | `bride-procession` | `spectral-burst` | `bus-breakout` |

Runtime layout is4×3 cells of192×192 (768×576 total), encoded216,628bytes and
decoded1,769,472RGBAbytes before mipmaps. Every icon has a clear transparent
gutter, no baked-in label or card background. The actual menu retains names,
prices, level gates and purchase/toggle controls as accessible text.

`src/content/hayride-icon-map.js` maps the real catalogue IDs to cells.
`src/ui/hayride-icons.js` reuses one embedded image URL across menu redraws.
Unknown future IDs return no decorative icon and retain their textual treatment.

Run `python3 voxel/tools/bake_hayride_icons.py` from the repository root to
reproduce the runtime atlas and review JPEG. Pillow, NumPy and SciPy are only
preparation dependencies. The script isolates the twelve existing alpha
silhouettes, keeps a small antialias fringe, crops, preserves aspect ratio and
packs. It does not repaint, recolour, synthesize or mirror art. Connected alpha
separation preserves wheels/lanterns where source bounding rectangles overlap.
`measurements.json` records bounds and source, runtime and per-cell hashes.

Native tests compare the mapping against every current tier, operation, route
and scare purchase, and validate actual WebP dimensions and mobile byte budgets.
The verification folder records browser menu checks and screenshots.
