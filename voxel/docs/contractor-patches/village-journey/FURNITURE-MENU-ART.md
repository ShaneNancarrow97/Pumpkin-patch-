# Furniture menu art — contractor handover

Eight new generated, painted-style voxel illustrations replace the generic symbols on the two farmhouse furniture bundles in **Village → Workshop**. The Moonlit reading set and Rattlewood hallway set each have a dedicated 60px bundle illustration; their six included-piece labels now show the corresponding 24px pictures. Text, lock reasons, prices, purchase selectors and owned states remain unchanged.

## Integration and dependencies

- `src/ui/village-chapters.js` uses the pure `furnitureSetIcon(id, size)` helper from `ui/furniture-set-icon-markup.js` before its existing icon fallback. Both bundle cards and every `homeItems` chip are wired.
- `src/village-game.js` calls `installFurnitureSetArt()` from `ui/furniture-set-icons.js` once during view creation. This installs one shared atlas stylesheet; menu redraws contain small spans rather than repeated embedded image strings.
- `assets/furniture-set-icons/furniture-sets.webp` is the lossless **512×256** atlas (**89,096 bytes**). `src/content/furniture-set-icon-meta.js` supplies its coordinates. Import the browser installer only in browser entry points; pure rendering and model tests do not import image files or require the DOM.
- Item IDs are `moonlit-reading-set`, `rattlewood-workshop-set`, `midnight-reading-bench`, `shelf-floating`, `household-plum-mug`, `lantern-entry-console`, `household-coat-hooks`, and `shelf-bracket`. Unknown IDs return empty markup, preserving the caller’s fallback.
- Existing farmhouse catalogue thumbnails stay as model renders, including finish-aware shelf previews. This art changes no furniture geometry, economy, transactions, save fields, progression or controls.

## Art source and reproduction

The generated source, complete prompt and provenance are retained in `assets/furniture-set-concepts/`. Generation used the viewed existing `assets/home/garden-icons.webp` for the premium painted voxel style, and `assets/home-furnishings/furnishings.webp` plus actual model definitions in `home-furnishings.js`, `household-props.js`, and `decor-models/shelving.js` for shapes, proportions and colours. The two bundle images depict their actual three pieces; shelves are empty and the long shelf has three brass brackets.

Rebuild from the repository root with:

```sh
python voxel/tools/bake-furniture-set-icons.py
```

Pillow is used only for technical cropping, near-transparent speckle cleanup, aspect-preserving normalisation, packing and contact previews. It does not draw furniture. The baker records the original source checksum, writes eight individual transparent PNGs, and generates the coordinate metadata. Source SHA-256: `59972cd98d5a693f6cc4c28e7d64db5552584bb5d90858a28ee0edde38fd954d`.

## Verification and portable review

All eight icons were inspected at 128px and 52px on a purple background. Automated checks confirm a 512×256 alpha atlas, clean 128px cell gutters, valid known IDs, safe unknown-ID fallbacks and bounded dimensions. An integrated pure-render check confirms the actual Workshop markup contains both bundle icons and all six piece icons at 60px/24px without mutating the save. The existing `village-chapters.test.mjs` passes. This asset review does not claim a separate physical-device test.

Portable outputs in `/workspace/`:

- `Pumpkin-Patch-Furniture-Menu-Icons.html` — self-contained, offline icon preview with PNG download links and actual menu-size samples.
- `Pumpkin-Patch-Furniture-Menu-Icons.jpg` — contact sheet.
- `Pumpkin-Patch-Furniture-Menu-Icons.zip` — preview, atlas, eight PNGs, source/provenance, baker, helpers, metadata and this integration note with repository-relative paths.

The portable preview is an art review page. The parent contractor delivery supplies the complete playable game HTML separately.
