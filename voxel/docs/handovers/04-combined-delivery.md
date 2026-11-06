# Combined playable delivery

Branch: **art/character-costume-expansion**. Based on voxel-reference `5285305`.

## Complete parts

- `8ba52aa`: premium painted sources and direct original-character Freddy/Jason edits. Art preparation only at this point.
- `922c4b5`: six native voxel wall models, actual Home → Decorate integration, generated model thumbnails, showroom and wall/save tests. See [part 2](02-voxel-wall-items.md).
- `a426f44`: Chucky, Tiffany, Freddy and Jason registered in the playable wardrobe, with idle/walk atlases and saved equipment. See [part 3](03-costume-runtime.md).
- `c802ff1`: live wall catalogue browser verification recorded.

Pull the complete branch to include the source-art prerequisite and both runtime parts. Root 2D game files are unchanged. No save schema was changed; the existing voxel save fields retain the additional item/outfit ids. New art uses existing coins, purchase flows and room hooks.

## Build

From the repository root after fetching/merging the art branch:

```sh
cd voxel
npm ci
npm test
node build.mjs --out dist/pumpkin-patch-updated.html
node tools/build-wall-showroom.mjs --out dist/wall-items.html
```

The exported game contains the assets in one HTML. The second file is an optional rotatable art viewer, without a game save or purchases. The delivered copies are `/workspace/Pumpkin Patch Voxel - Wall & Costume Update.html` and `/workspace/Pumpkin Patch - Voxel Wall Items.html`.

## Where the content is

- **Home → Decorate**: six new premium wall items. Existing 50 items remain, so collection counts now read 56. Buying places an item if the active room has enough free hooks; otherwise it stays owned in storage. Pieces reserve their full width and use native geometry. Premium mounting height clears bookcases.
- **Wardrobe → Shane/Natalie → 90s Halloween**: Shane's Chucky (£1,600) and Jason (£2,200); Natalie's Tiffany (£1,800) and Freddy (£2,000). They also appear under Everything. Buying equips immediately; previously purchased outfits offer Wear.

Freddy/Jason replace the rejected identity-drifting drafts. They use direct edits of the original in-game nine-pose grids. The base originals remain available. The earlier painted furniture sources are still art sources; this delivery specifically implements the six wall pieces in voxels.

## Evidence

- All five test files pass, including original model/house rules and new wardrobe/mesh/house integration checks.
- All four costume purchase buttons, equipping, nonempty portraits and real browser reload retention passed. Both pairs were captured in the overworld, with no page errors.
- Live wall purchases and placement passed at desktop 1280×800, phone 390×844 and landscape 844×390, with no page errors, overflow or external asset requests. Final mounting-height clearance has an explicit geometry-bound test.
- The native model showroom passed selection, drag, zoom and responsive checks at those three sizes.
- Source bake determinism and complete/unclipped costume frames were checked. Model thumbnails are rendered from the native geometry.
- The final full smoke run passed on desktop and phone with no console/resource or page errors: planting, boosting, harvesting, menus, character-style switches, house purchases/placement/flipping, shop customers, returning to the patch and costume purchases. The initial localhost run caught an implicit missing favicon; the exported file now embeds its tab icon as well. The successful run is recorded in `/workspace/voxel-game-qa/final-smoke.log`.

Local evidence is in `/workspace/voxel-game-qa/`, `/workspace/voxel-wall-qa/` and `/workspace/voxel-costume-qa/`. Browser checks served the identical exported file over localhost because the managed browser blocks file URLs. Costume appearance checks disabled bloom through the existing setting to keep software rendering manageable; the exported game keeps its normal defaults.

## Remaining scope

The mirror is stylised static glass; shelf recipe books are decorative and do not add fillable book slots. The six floor furniture sprites from part 1 are not yet native models. Additional visitors and other requested outfit families remain separate work. Blocked image-generation designs are recorded in part 1; no absent assets are claimed as delivered.
