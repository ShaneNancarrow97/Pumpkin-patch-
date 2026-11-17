# Part 3 — Four playable film-night costumes

The previous delivery contained review artwork but did not register it in the
playable wardrobe. This part makes all four costumes purchasable, wearable and
saved in the voxel game.

## Where to find them

Open **Wardrobe**, select Shane or Natalie, then **90s Halloween** (or
**Everything**). Buying a costume equips it immediately through the existing
wardrobe UI; an owned costume has a **Wear** button. The original outfits stay
available.

| Character | Costume | ID | Price |
| --- | --- | --- | ---: |
| Shane | Chucky costume | `shane-chucky` | £1,600 |
| Natalie | Tiffany costume | `natalie-tiffany` | £1,800 |
| Natalie | Freddy costume | `natalie-freddy` | £2,000 |
| Shane | Jason costume | `shane-jason` | £2,200 |

Freddy and Jason use the corrected direct edits of the existing character
animation sheets, preserving their recognisable faces. Shane's hockey mask is
raised, and he keeps his garden trowel. Natalie keeps her glasses, hair,
tattoos and pumpkin. Chucky and Tiffany use the earlier generated couple sheet.
Each costume has three idle frames and six walking frames. Their menu portraits
come from the same standing frames used in the world.

## Files and boundaries

- `src/costume-expansion.js` contains the four voxel-only catalogue entries.
- `src/rules/wardrobe.js` adapts the main wardrobe without changing or mutating
  the imported main-game catalogue. Original purchases, equipping and restore
  still delegate to the existing rules. Extra IDs follow the same money,
  ownership and pause checks.
- `src/sprite-actors.js` merges the expansion sheets into the existing loader.
- `art-source/expansion/premium/chucky-tiffany.png` preserves the original couple
  source. The corrected Freddy/Jason source PNGs were delivered in part 1.
- `tools/bake_costume_expansion.py` writes `assets/costume-expansion/`,
  `src/costume-sprite-expansion.js` and `src/costume-sprite-meta.js`. Those outputs
  are generated; edit the baker or the source art and regenerate them.
- `test/costume-expansion.test.mjs` verifies the catalogue boundary, purchase and
  equip rules, save round trips, malformed saves and atlas metadata.

There are no root-game edits, save-schema changes or gameplay/economy changes.
The new IDs fit the existing owned/equipped wardrobe fields. The optional
**Voxel characters** setting already voxelises loaded HD sheets dynamically,
so it uses the new costume sheets too; no original-outfit fallback is required
once sheets finish loading.

## Rebuild the artwork

From the repository root:

```sh
python3 voxel/tools/bake_costume_expansion.py
```

The Chucky/Tiffany source does not have evenly spaced rows or columns. The baker
records measured cuts in its source map and `provenance.json`; uniform 6×3 cuts
would crop some shoes and hands. Each actor uses one shared scale across all nine
frames, a torso centre for the horizontal anchor and a common floor at the feet.
The baker resizes premultiplied alpha, removes detached alpha specks, adds clear
padding and extends edge RGB into the transparent gutter to prevent dark seams.
It does not redraw costumes or stretch each walking frame to a fixed height.

## Validation

- `npm test` passes, including the costume rules and generated-frame contract.
- Standalone offline HTML builds successfully with all four sheets inlined.
- A second bake produces identical hashes for every generated atlas, metadata
  module and provenance file.
- A contact sheet was inspected for every idle/walking frame: complete hands,
  shoes and accessories, transparent backgrounds and consistent foot anchors.
- Final combined HTML browser checks passed for all four real purchase buttons,
  immediate equipment changes and nonempty portraits. Screenshots show both
  costume pairs in the overworld. After a real browser reload, all four purchases
  remain owned and Freddy/Jason remain equipped. No page errors were recorded.
  Software-rendered appearance checks used the existing bloom setting switched
  off; the delivered game retains its normal default setting.

For a browser check with the existing debug API, give the test state enough
coins, open the wardrobe and click the actual purchase buttons. For example:

```js
PumpkinVoxel.state().coins = 20000;
PumpkinVoxel.openSheet("wardrobe");
// Select Shane/Natalie and 90s Halloween in the menu, then buy and wear.
PumpkinVoxel.state().wardrobe.equipped;
```

Useful selectors are `[data-who="shane"]`, `[data-set="90s-horror"]`,
`[data-costume="shane-chucky"]` and `[data-wear="shane-chucky"]` (with each of the
other IDs substituted). Check `scene.portrait(id)` for a loaded portrait, close
the wardrobe to inspect the world, then reload and confirm ownership/equipment
survive. The parent handover supplies the final HTML and Git commit.
