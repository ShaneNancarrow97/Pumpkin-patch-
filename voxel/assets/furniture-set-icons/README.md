# Village furniture menu artwork

Eight painted voxel illustrations for the Moonlit reading set and Rattlewood hallway set, including all six of the actual farmhouse pieces in those bundles. Warm walnut, plum upholstery, aged brass and amber lantern light follow the existing garden illustration sheet.

## Integration

Install the shared sheet once in the browser:

```js
import { installFurnitureSetArt } from "./ui/furniture-set-icons.js";
installFurnitureSetArt();
```

Pure chapter/menu code can import without image or DOM dependencies:

```js
import { furnitureSetIcon } from "./furniture-set-icon-markup.js";
furnitureSetIcon("moonlit-reading-set", 64);
furnitureSetIcon("household-plum-mug", 32);
```

The helper returns empty markup for unknown IDs. Existing text labels remain the accessible name; illustrations are decorative. It clamps supported display sizes to 24–160px.

| Row | Column | Item ID | Actual pictured contents |
| --- | --- | --- | --- |
| 1 | 1 | `moonlit-reading-set` | Reading bench, short floating shelf, plum mug |
| 1 | 2 | `rattlewood-workshop-set` | Lantern console, three coat hooks, long bracket shelf |
| 1 | 3 | `midnight-reading-bench` | Two-seat plum bench, carved bat and brass crescent |
| 1 | 4 | `shelf-floating` | Empty short walnut plank, hidden fixing |
| 2 | 1 | `household-plum-mug` | Plum cup, cream rim/crescent, brass base, cocoa |
| 2 | 2 | `lantern-entry-console` | Two-drawer walnut console, lantern, little book, key dish |
| 2 | 3 | `household-coat-hooks` | Walnut backplate with three brass hooks and crescent |
| 2 | 4 | `shelf-bracket` | Empty long walnut plank with three scrolled brass brackets |

The existing farmhouse catalogue already has accurate model-rendered thumbnails. Those remain intact, particularly the finish-aware shelf previews. This new art serves bundle cards and their included-piece previews; it does not alter furniture models, selected finishes, item IDs, transactions, save data or placement.

## Rebuild and review

From the repository root:

```sh
python voxel/tools/bake-furniture-set-icons.py
```

The generated source and full prompt/provenance live in `../furniture-set-concepts/`. The baker only crops the 4×2 source grid, removes near-transparent generation speckle (<24 alpha), preserves aspect ratio, and packs 128px cells with a 10px inset. It does not draw artwork. Outputs are a lossless shared WebP atlas, individual transparent PNGs, coordinates, source checksum, and `contact-preview.jpg` showing every icon at 128px and at its actual 52px menu size.

The small previews were visually inspected on a muted purple background: both bundles retain identifiable silhouettes; shelves stay empty and the long shelf shows three brackets. The menu source imports the atlas once through a shared stylesheet, so repeatedly opening a menu does not duplicate embedded image strings.
