# Owner side-walk art audit

The six PNG sheets are whole-sheet edits of the established character turnarounds. They retain each costume's own silhouette; the originals retain Shane's beanie/jacket and Natalie's glasses, hair and olive knit. `water-empty.png` is the empty-handed waist-height gesture used with the single physical voxel watering can.

Run from the repository root:

```sh
python3 voxel/tools/bake_player_side_walk.py
```

The baking tool needs Pillow, NumPy and SciPy. No new runtime dependency is required. It exports six alpha WebP walk atlases, one water atlas and `src/player-side-walk-meta.js`. Runtime images add about 1.64 MB before HTML encoding. The PNGs and GIF are review sources and are not bundled in the game.

The generated source grids are uneven. The baker follows low-alpha row and column valleys, including a curved seam where neighbouring poses touch, before isolating each figure. Arithmetic cell slicing previously cut some shoes, hands and hair. The preserved PNGs are unmodified; there is no code-generated limb animation.

Coverage is all 20 selectable looks, four phases each. The upright cycle shows contact, knee passage, the next contact and rear heel lift; the wheelchair uses changing hand/push positions and wheel spokes rather than walking legs. Idle side view uses grounded contact 0. `walk-contact-preview.jpg` shows five representative rows and all four phases. `all-looks-walk.gif` presents every look in motion. `walk-metrics.json` records actual baked alpha height, lower-silhouette change and unique frame counts. All rows stay within 3% of their target height; hats extend above the common body, and the wheelchair remains seated and shorter.

The adapter measures the pre-existing front/back alpha and applies corresponding scale adjustments during direct control. Releasing control restores the original texture and unit scale. The gameplay controller supplies distance-driven animation age so analogue creeping does not run a full-speed shuffle. Side and water base recolours and old back/action recolours retain their local row coordinates.

This is painted four-frame animation, not a rig or a full directional tool animation set. Front/back walks reuse the existing art, and non-base costumes use the physical can with their existing pose rather than dedicated new water illustrations. The four-frame contacts have small painted differences and should not be mistaken for a physically exact eight-frame gait. Inspect the GIF and the final in-game screenshots when changing animation speed or character stature.
