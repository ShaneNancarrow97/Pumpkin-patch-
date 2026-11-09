# Granny, village shortcuts and finished dishes

## Result

Granny Brambletooth now has a painted sprite matching the established Mothlight villagers: moss-green complexion, hunched shape, crooked nose, silver hair bun, patched plum shawl and apron pockets. The actor loader registers her own art as `granny`; her portrait comes from the same measured front pose. Existing generated cast registries and their bakers remain unchanged.

One new shared atlas supplies twelve premium menu paintings, installed once through `installVillageExpansionArt()`. `expansionIcon(id,size)` is a pure presenter in `ui/village-expansion-icon-markup.js`, re-exported by the installer; unknown IDs produce no markup and sizes stay24–128 px. Runtime village pages consume the atlas. Finished dishes map the real recipe IDs `cinders-lantern-stew` and `grannys-bramble-pudding` through the existing `dishIcon()` interface.

## Coverage and integration

- 48 authored Granny frames: eight directions × idle/four alternating walk phases/gesture. The runtime uses eight-view idle and walking; talk/greeting retains the front performance.
- One shared body scale and grounded anchor; height1.95 world units versus2.3 for normal neighbours. No mirrored art, mesh deformation or invented leg animation.
- `validDirectionalSprite()` accepts explicit four- or eight-phase lists. Existing manifests still default to their original eight phases; invalid or duplicate phase names remain rejected.
- `readyVillageSprites()` includes Granny, and the existing shared texture/frame/material lifetime stays intact. No texture is freed when an individual actor leaves.
- Icon IDs: cave, lantern-amethyst, ember-garnet, hollow-opal, scarecrow-maze, granny-house, gemcraft, ward, commission, festival, companion, restoration.
- Two new dish paintings are kept separate from the established sixteen-dish atlas. Existing IDs and unknown-ID behavior remain unchanged.

## Dependency matrix

| Consumer | Keep together |
| --- | --- |
| Granny world/resident | FOLK id `granny`, generated metadata, loader merge and world spot; world/cast agents own those latter registrations. |
| Directional actor | Explicit four-phase metadata and validation support; never label these 48 poses as 64or mirror missing views. |
| Village pages | Pure icon presenter for tests, atlas installer once in the village constructor for actual CSS pictures. |
| Kitchen UI | Real recipe IDs and `dishIcon()` mapping; ingredients keep their existing smaller art. |
| Future rebakes | Retained PNG sources, baker and manifest; old village/directional bakers cannot erase the separately merged Granny entry. |

## Checks

The actual asset tests inspect decoded runtime bounds/boot differences, direction selection, phase validation, portrait crop, atlas slots, unknown IDs, dish mappings and byte budgets. Run:

```sh
node --test --test-isolation=none test/village-expansion-art.test.mjs test/directional-sprite-math.test.mjs test/village-sprite-assets.test.mjs test/village-directional-runtime.test.mjs
```

Use the managed additional-network execution profile if sandbox child-process reporting returns EPERM for the decoded Pillow check; no network is used by these tests. The first default-profile run reported that sandbox error even though Python produced its image measurements; the corrected profile runs the actual named checks.

All **16 named checks pass**, including the real actor loader with Granny’s explicit four-phase lazy atlas and front greeting material. Normal generated-source and normalized-preview images were inspected. Root owns in-game browser screenshots and final artifact verification; no hardware claim is made here. `assets/mothlight-expansion-source/ART-PROVENANCE.md` records references, generator outputs, the direction repair and honest runtime coverage.
