# Cursed spores icon

`villageItemIcon('cursed-spores')` now returns a decorative span with the same
`.village-item-icon` class that village menus, quest trackers and gather prompts
already size. Text labels and counts remain with each caller. The helper stays
pure and Node-safe; it imports no image, DOM implementation or browser module.

Install the additional image once during browser initialisation:

```js
import { installVillageBlightArt } from './ui/village-blight-art.js';
installVillageBlightArt();
```

Call this beside `installVillageItemArt()`. The installer is idempotent and its
specific `.village-item-icon.village-blight-icon` rule overrides the old atlas
regardless of installation order. It changes no general item sizing or menu
styles. The existing shared item art installer still provides the base icon
layout. No per-frame processing, canvas decoding or network service is used.

The new image is actual generated painted art: blood-red caps, luminous purple
gills, violet ooze and a corked spore vial, with warm amber edges to match the
existing inventory. `assets/village-blight/` retains the generated PNG, exact
prompt, manifest, compressed runtime WebP and small-size visual proof.

Dependency matrix:

| Change | Impact | Validation |
| --- | --- | --- |
| Exact `cursed-spores` item hook | Blight material/quest art now visible | Pure Node markup check |
| New WebP/installer | One 128px icon added to the browser build | RGBA, clear corners, dimensions and hash |
| Existing item atlas | No metadata or atlas edits | Existing item/alias output checks |
| Story, quests, saves, economy | No changes | Owned by the main blight implementation |

Reproduce the packed art with `python tools/bake-village-blight-icon.py` from
`voxel/`. No sprite or general menu files are replaced. Assemble and browser
check the quest marker, requirement lists and gathering prompt after wiring
the installer; this art-only task does not run the game build or browser.

Parent integration: `installVillageItemArt()` now calls `installVillageBlightArt()` automatically. No extra main.js hook is required; the standalone installer remains available for other hosts.
