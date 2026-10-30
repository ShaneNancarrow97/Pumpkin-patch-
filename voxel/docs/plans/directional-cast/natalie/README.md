# Natalie: reviewed base-look directional batch

This batch preserves Natalie’s curvy silhouette, olive jumper, black jeans and
boots, long dark hair with blunt fringe, cat-eye glasses and tattoos. The approved
in-game front seed and the supplied photographs guided the character. No new
costume is claimed by these pages.

## Accepted runtime coverage

| Action | Nominal bearing | Authored frames |
| --- | --- | --- |
| Neutral pose | Every 15° from 0° through 345° | One pose per bearing; **not** a breathing cycle |
| Walk | 0°, 180° | Eight frames per bearing |
| Walk | 45°, 90°, 270°, 315° | Four-frame reduced cycles per bearing |

0° faces the camera, 90° faces screen-right, 180° is the back, and 270° faces
screen-left. These are painted, manually assigned directions. They are not a
geometrically measured 3D camera turntable.

The two rear-diagonal walking cycles (135° and 225°) remain **unapproved**.
Several full-strip attempts kept the same nearer leg/arm leading through both
halves, so their candidates are retained here for inspection and excluded from
`reviewed-walks.json`. Do not turn those candidates into runtime coverage merely
because their cells differ in pixel values. Runtime can explicitly use a nearby
reviewed bearing or the legacy bank, but that is fallback coverage.

All other actions and all non-base costumes remain in the production backlog.
The four-frame cycles are recorded as `mode: "reduced"` and are not counted as
completed eight-phase gait cycles. Opposite contact poses visibly change the
foremost arm and anatomical leg overlap; GIFs and `contacts-review.jpg` support
manual review. They remain stylised painted motion, not motion-capture data.

## Scale and normalization

- Each cell is 256 × 400, with a shared foot anchor at (128, 390).
- Neutral views have a 300px standing silhouette and 2.3-world-unit stature.
- Each walk strip uses **one shared aspect-preserving scale**, chosen from the
  median silhouette height. No individual walking frame is vertically stretched.
- Alpha silhouette heights: idle 300–300; walk 0° 295–301, 45° 299–302,
  90° 295–302, 180° 295–302, 270° 295–306, 315° 298–300. The small variation
  retains the painted stride bob and boot positions.
- `body-scale-review.jpg` compares front/profile neutral and walking figures at
  the common physical height. `metrics.json` records each frame’s scale,
  silhouette height and hash. The top-20%-band width is a **hair/silhouette audit**,
  not a head-height measurement: hair and perspective naturally change it.

Seven WebP runtime pages total 763,990 bytes, excluding metadata. The largest
decoded page is the 1536 × 1600 neutral atlas (9,830,400 RGBA bytes). Walk pages
are 1024 × 400 or 1024 × 800. Original PNG sources stay in documentation and are
not imported into the playable game.

## Rebuild and review

From the repository root:

```sh
python3 voxel/tools/bake_natalie_directional.py
```

The baker requires Pillow, NumPy and SciPy. It reads only the explicit accepted
source list in `reviewed-walks.json`; it never discovers candidates by glob. It
removes generated low-alpha backdrop, crops each isolated figure, normalizes and
packs it, writes per-bearing GIFs and `assets/directional/natalie/base.json`.

`approved-front-seed.png` is the shipped art reference. `idle-source-cells.json`
records the extracted neutral source bounds. Files ending in `*-four-source`,
`*-strip-source`, `*-rear-strip-source` and `*-contact-strip-source` include
multiple experiments; only the explicit accepted list is suitable for indexing.
The older `walk-back-rejected.png` also remains rejected.

The root contractor handles native manifest validation, the standalone art bench,
in-engine checks, save compatibility and the Claude handover before release.
