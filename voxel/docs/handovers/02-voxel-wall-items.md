# Part 2 — native voxel wall collection

The six premium wall designs are now actual 3D voxel objects, built with the same modelling kit, palette treatment and greedy mesher as the existing voxel furniture. They are also available to buy and hang through the live **Home → Decorate** catalogue. The original root catalogue and 2D game are unchanged.

## Delivered items

| Item | Price | Wall hooks | Main details |
| --- | ---: | ---: | --- |
| Harvest copper pan rail | 4,500 | 3 | Four recessed copper pans, brass rail, hanging loops and wall brackets |
| Apothecary spice cabinet | 6,500 | 2 | Carved walnut carcass, open shelves and ten labelled spice jars |
| Midnight utensil rack | 3,500 | 2 | Ladle, slotted turner, hollow whisk and pan, suspended from brass hooks |
| Pumpkin tea & recipe shelf | 5,000 | 3 | A supported wooden shelf, upright gilt recipe books and a round copper pumpkin teapot |
| Crescent looking glass | 8,000 | 2 | Sculpted moon-shaped gilt surround, bevelled tinted glass and decorative points |
| The manor after midnight | 11,000 | 3 | A recessed moonlit manor scene, projecting frame and two candle sconces |

## Integration boundary

- `voxel/src/decor-models/premium-walls.js` defines the model recipes and dimensions. These use explicit colour palettes, real depth and hollow spaces, without sprite textures or flat standees.
- `voxel/src/premium-wall-props.js` turns the recipes into cached shared geometry. Each instance gets an independent group and placement metadata. The two possible meshes batch lit and glowing voxels. Current models remain below 35,000 triangles each.
- `voxel/src/content/premium-wall-catalog.js` supplies six voxel-only catalogue entries. `rules/house.js` combines them with a **copy** of the root catalogue and uses the existing buying, storing, ownership and restoration rules.
- Each item reserves its full two- or three-hook span. Wall decor does not occupy the kitchen floor beneath it. Existing saves remain valid, and new purchases and placements survive a save/restore round trip. There is no save schema change.
- `decor.js` resolves these ids through the native adapter. The original catalogue pieces keep their existing rendering path.
- `premium-wall-thumbs.js` and the Home menu use transparent renders of the actual voxel models, rather than the earlier painted sprites.

## Placement convention

The model origin is the **back-bottom-centre**: x is centred, y starts at zero, and z extends forward from the wall. The wall normal is +z. Runtime height is measured from occupied geometry so blank recipe-grid rows cannot lower a shelf on the wall. Native models bypass the character/sprite lean and stretch. Premium pieces hang with their centre at y = 3.65 to clear tall bookcases and stay below the cornice. Original pieces retain their existing heights. Their backs sit just in front of the wall; flipping mirrors x only.

The recipe/teapot books are a decorative part of that model. They do not expose player-fillable bookshelf sockets. The looking glass has a static stylised surface, without an expensive dynamic reflection. Candle flames are glowing geometry; this delivery does not add a new animation or lighting system.

## Rebuild and review

Run these in `voxel/`:

```sh
npm test
node tools/render-wall-thumbs.mjs
node tools/build-wall-showroom.mjs
```

Set `CHROMIUM_PATH` when Chromium is not at `/usr/bin/chromium`. The thumbnail tool runs a temporary localhost page and renders all six models under the room's moonlight and warm fill. It writes `assets/premium-wall-thumbs/*.png` plus its generated manifest. An optional `--sheet <path.png>` writes a labelled contact sheet. `--metadata-only` refreshes placement statistics after a metadata-only adjustment; use a full render whenever geometry or colours change.

The standalone showroom defaults to `/workspace/Pumpkin Patch - Voxel Wall Items.html`. It contains the renderer and models in one offline HTML file. It supports individual item selection, a complete wall view, front/left/right/back inspection, drag rotation and pinch/scroll/button zoom. It starts with the complete collection on a wide desktop and a single item on a phone. The model and camera remain clear of its compact controls.

## Validation

- Native model tests cover nonempty volume, varying depth, hollow space, deterministic colour and occupancy, forward wall bounds, centred width, cached geometry, absence of texture standees and a bounded triangle budget.
- House integration tests cover price limits, single ownership, purchase, wall mounting, full-width collision, floor separation, storing and save restoration. They also assert that the root catalogue still contains its original 50 items.
- Browser showroom checks passed at **1280 × 800**, **390 × 844**, and **844 × 390** with no page errors. Item selection, whole-wall mode, back view, drag and zoom were exercised. The dock remains within each viewport and there is no horizontal page overflow. Text is at least 12 px and controls are at least 44 px.
- Browser inspection used the identical self-contained HTML served locally because this managed browser blocks `file://` navigation. No external resource is required by the exported file.
- The final native thumbnail PNGs have transparent backgrounds and nonempty, unclipped silhouettes. The final occupied-height placement metadata was regenerated after the visual render; model geometry was unchanged by that adjustment.

Local review outputs: `/workspace/voxel-wall-qa/voxel-wall-collection.png`, the six individual angle screenshots, desktop/phone/landscape screenshots, and `checks.json`. The playable game build and its live-room smoke checks are handled alongside the character-costume integration; the separate showroom is an art review, not a second save file or economy.
