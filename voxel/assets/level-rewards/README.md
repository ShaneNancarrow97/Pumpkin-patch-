# Level medallions and reward icons

Twelve original image-generated painted icons match the existing plum, brass and amber village artwork. Six rank frames have deliberately quiet centres; level numbers are ordinary DOM text, preserving sharpness, accessibility and localisation at every size. Six reward symbols distinguish coins, upgrades, decor, costumes, recipes and places.

The runtime is one lossless `level-rewards.webp` atlas, four columns by three rows, with 128px cells and transparent gutters. Full PNG source, prompt/provenance, individual technical crops and contact proof are retained. None of those PNG sources are imported by the game.

Rebuild from any directory:

    python3 voxel/tools/bake-level-reward-icons.py

Pillow only crops, removes negligible transparent speckle, normalises and packs the generated source. It does not paint the sprite artwork. The script validates that each intended number anchor sits on an opaque, quiet part of its frame. The contact proof overlays sample numerals for review only; runtime art remains number-free.

`ui/level-reward-icon-markup.js` provides pure `levelRewardIcon(id,size)`, `levelRankIcon(level)` and `levelBadgeMarkup(level,size)`. `ui/level-reward-icons.js` installs the shared atlas once with `installLevelRewardArt()`.

Rank ranges: 1–3 seed, 4–7 lantern, 8–11 moon, 12–15 moth, 16–19 manor, 20 eclipse. Category IDs: `coins`, `upgrade`, `decor`, `costume`, `recipe`, `area`.
