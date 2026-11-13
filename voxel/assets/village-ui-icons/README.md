# Mothlight village UI art

Twelve generated painted voxel illustrations give the village a matching navigation bar, map landmarks and tool prompts. Walnut, muted plum, cream and brass follow the game's existing garden and furniture illustrations. These are decorative pictures beside real text labels, not replacements for accessible names.

Install once from a browser entry point:

```js
import { installVillageUIArt } from './ui/village-ui-icons.js';
installVillageUIArt();
```

Pure menu code can import without a DOM or image loader:

```js
import { villageUIIcon } from './ui/village-ui-icon-markup.js';
villageUIIcon('map', 28);
villageUIIcon('lock', 36);
```

IDs in reading order: `map`, `people`, `quests`, `satchel`, `workshop`, `build`, `farm`, `home`, `tree`, `lock`, `axe`, `pickaxe`. The helper returns empty markup for unknown/prototype IDs and clamps display size to 24–96px. Keep the parent navigation/button's text and minimum 44px target. The picture itself does not intercept input.

The browser helper installs one shared 512×384 transparent WebP atlas, 185,926 bytes, through a stylesheet. Live menu redraws contain small spans and do not repeat its embedded image. Existing furniture previews, transactions, save fields and models are unchanged.

`contact-preview.jpg` was inspected at 128px and at actual 44px/28px sizes on the game's plum background. Each 128px cell has at least 8 transparent pixels of padding. All 12 icons retain recognisable silhouettes. The tool heads, house, satchel, journal and padlock are distinct at compact sizes.

The original generated source, complete prompt and references are in `../village-ui-concepts/`. Reproduce the atlas from the repository root:

```sh
python3 voxel/tools/bake-village-ui-icons.py
```

Pillow only crops the equal 4×3 source grid, removes alpha below 24, preserves aspect ratio, normalises to 128px cells and makes proof sheets. It does not draw the icons. Source art is preserved. Tests cover known/unknown IDs, atlas slots, runtime budget and safe size handling.

`/workspace/Pumpkin-Patch-Village-UI-Icons.html` is a self-contained art reviewer with 12 transparent PNG download buttons, actual menu-size samples and no network calls. The contractor download includes the playable game separately. A matching ZIP pack includes this preview, source, runtime atlas, individual PNGs, metadata, helpers and baker.
